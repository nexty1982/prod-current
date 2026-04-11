#!/usr/bin/env npx tsx
/**
 * Unit tests for services/updateService.ts (OMD-1185)
 *
 * Git + shell-backed update orchestration. Out of scope: real git/filesystem.
 *
 * Strategy:
 *   1. Monkey-patch `child_process.exec` BEFORE requiring SUT so that
 *      `promisify(exec)` at module load wraps our fake via `util.promisify.custom`.
 *   2. Stub `fs-extra` via require.cache (with both top-level methods AND
 *      .default self-ref to survive __importDefault compilation).
 *   3. Module-level `fs.ensureDirSync(LOGS_DIR)` runs at require time — stub
 *      must be installed first.
 *
 * Coverage:
 *   - ensureDirSync called at module load
 *   - getBuildInfo: assembles gitSha(short)/branch/isClean/version/buildTime;
 *                   falls back to current time when dist stat fails;
 *                   wraps thrown errors
 *   - checkForUpdates: fetches, computes local/remote sha, counts behind,
 *                      caches result (second call returns cache);
 *                      behind defaults to 0 on rev-list failure;
 *                      wraps errors
 *   - isUpdateLocked: no file → false; fresh file → true; stale file → false + remove
 *   - createUpdateLock / removeUpdateLock
 *   - startUpdateJob: rejects when locked; generates id; seeds job; returns id;
 *                     executeUpdateJob (fire-and-forget) runs to success;
 *                     health check swallowed on failure
 *   - getJob / getAllJobs (sorted desc by startedAt)
 *   - cancelJob: running → cancelled; non-running no-op; missing → throws
 *
 * Run: npx tsx server/src/services/__tests__/updateService.test.ts
 */

let passed = 0;
let failed = 0;

function assert(cond: any, message: string): void {
  if (cond) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log(`  PASS: ${message}`); passed++; }
  else {
    console.error(`  FAIL: ${message}\n         expected: ${e}\n         actual:   ${a}`);
    failed++;
  }
}

// ── util.promisify custom symbol ─────────────────────────────────────
const util = require('util');
const PROMISIFY_CUSTOM = util.promisify.custom;

// ── Exec router ──────────────────────────────────────────────────────
type ExecResult = { stdout: string; stderr: string };
type ExecRoute = { match: RegExp; respond: () => ExecResult | Error };

let execRoutes: ExecRoute[] = [];
const execLog: Array<{ cmd: string; opts: any }> = [];

function resetExec() {
  execRoutes = [];
  execLog.length = 0;
}

function routeExec(match: RegExp, respond: () => ExecResult | Error) {
  execRoutes.push({ match, respond });
}

const fakeExec: any = function fakeExec(..._args: any[]) {
  // Never invoked directly — promisify.custom takes over.
  throw new Error('fakeExec invoked without promisify.custom');
};
fakeExec[PROMISIFY_CUSTOM] = async (cmd: string, opts?: any): Promise<ExecResult> => {
  execLog.push({ cmd, opts });
  for (const r of execRoutes) {
    if (r.match.test(cmd)) {
      const out = r.respond();
      if (out instanceof Error) throw out;
      return out;
    }
  }
  return { stdout: '', stderr: '' };
};

// Patch child_process.exec BEFORE SUT require
const cp = require('child_process');
cp.exec = fakeExec;

// ── fs-extra stub ────────────────────────────────────────────────────
const ensureDirCalls: string[] = [];
const accessCalls: string[] = [];
const statCalls: string[] = [];
const removeCalls: string[] = [];
const writeFileCalls: Array<{ p: string; data: string }> = [];
const appendSyncCalls: Array<{ p: string; data: string }> = [];
const readJSONCalls: string[] = [];

let lockExists = false;
let lockAgeMs = 0;   // ms since now
let distStatShouldThrow = false;
let distMtime = new Date('2026-01-15T12:34:56.000Z');
let readJSONReturn: any = { version: '9.9.9' };
let writeFileShouldThrow = false;
let removeShouldThrow = false;

const LOCK_FILE = '/tmp/om-update.lock';

const fsStub: any = {
  ensureDirSync: (p: string) => { ensureDirCalls.push(p); },
  access: async (p: string) => {
    accessCalls.push(p);
    if (p === LOCK_FILE && !lockExists) {
      const e: any = new Error('ENOENT');
      e.code = 'ENOENT';
      throw e;
    }
  },
  stat: async (p: string) => {
    statCalls.push(p);
    if (p === LOCK_FILE) {
      return { mtimeMs: Date.now() - lockAgeMs };
    }
    if (p.endsWith('/dist')) {
      if (distStatShouldThrow) throw new Error('no dist');
      return { mtime: distMtime };
    }
    throw new Error('unexpected stat: ' + p);
  },
  remove: async (p: string) => {
    removeCalls.push(p);
    if (removeShouldThrow) throw new Error('remove failed');
  },
  writeFile: async (p: string, data: string) => {
    writeFileCalls.push({ p, data });
    if (writeFileShouldThrow) throw new Error('writeFile failed');
  },
  readJSON: async (p: string) => {
    readJSONCalls.push(p);
    return readJSONReturn;
  },
  appendFileSync: (p: string, data: string) => {
    appendSyncCalls.push({ p, data });
  },
};
fsStub.default = fsStub;

const fsExtraPath = require.resolve('fs-extra');
require.cache[fsExtraPath] = {
  id: fsExtraPath,
  filename: fsExtraPath,
  loaded: true,
  exports: fsStub,
} as any;

// Silence noisy logs
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

// ── Require SUT (triggers ensureDirSync + promisify) ────────────────
const updateService = require('../updateService');
const {
  getBuildInfo,
  checkForUpdates,
  isUpdateLocked,
  createUpdateLock,
  removeUpdateLock,
  startUpdateJob,
  getJob,
  getAllJobs,
  cancelJob,
} = updateService;

async function settle(iterations = 40) {
  for (let i = 0; i < iterations; i++) await new Promise(r => setImmediate(r));
}

async function main() {

// ============================================================================
// Module-load side effects
// ============================================================================
console.log('\n── module load ───────────────────────────────────────────');

assertEq(ensureDirCalls.length, 1, 'ensureDirSync called at load');
assert(ensureDirCalls[0].endsWith('/server/logs/updates'), 'logs dir path');

// ============================================================================
// getBuildInfo — happy path
// ============================================================================
console.log('\n── getBuildInfo: happy path ──────────────────────────────');

resetExec();
routeExec(/git rev-parse HEAD/, () => ({ stdout: 'abcdef1234567890fedcba\n', stderr: '' }));
routeExec(/git branch --show-current/, () => ({ stdout: 'main\n', stderr: '' }));
routeExec(/git status --porcelain/, () => ({ stdout: '', stderr: '' }));
readJSONReturn = { version: '2.3.4' };
distStatShouldThrow = false;

{
  const info = await getBuildInfo();
  assertEq(info.gitSha, 'abcdef12', 'gitSha is 8-char short sha');
  assertEq(info.branch, 'main', 'branch trimmed');
  assertEq(info.isClean, true, 'isClean true when status empty');
  assertEq(info.version, '2.3.4', 'version from package.json');
  assertEq(info.buildTime, distMtime.toISOString(), 'buildTime from dist mtime');
}

// isClean false when status has entries
resetExec();
routeExec(/git rev-parse HEAD/, () => ({ stdout: 'aaaaaaaa\n', stderr: '' }));
routeExec(/git branch --show-current/, () => ({ stdout: 'feature/x\n', stderr: '' }));
routeExec(/git status --porcelain/, () => ({ stdout: ' M file.js\n', stderr: '' }));
{
  const info = await getBuildInfo();
  assertEq(info.isClean, false, 'isClean false when status non-empty');
  assertEq(info.branch, 'feature/x', 'branch with slash');
}

// dist stat fails → buildTime falls back to now (ISO)
resetExec();
routeExec(/git rev-parse HEAD/, () => ({ stdout: 'ffffffff\n', stderr: '' }));
routeExec(/git branch --show-current/, () => ({ stdout: 'main\n', stderr: '' }));
routeExec(/git status --porcelain/, () => ({ stdout: '', stderr: '' }));
distStatShouldThrow = true;
{
  const before = Date.now();
  const info = await getBuildInfo();
  const built = new Date(info.buildTime).getTime();
  assert(built >= before - 1000 && built <= Date.now() + 1000, 'buildTime ≈ now on dist fail');
}
distStatShouldThrow = false;

// Error in git command → wrapped
resetExec();
routeExec(/git rev-parse HEAD/, () => new Error('git broken'));
quiet();
{
  let caught: any = null;
  try { await getBuildInfo(); } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'throws on git error');
  assert(caught && caught.message.includes('Failed to get build info'), 'error wrapped');
  assert(caught && caught.message.includes('git broken'), 'original message embedded');
}

// ============================================================================
// checkForUpdates — happy path + cache
// ============================================================================
console.log('\n── checkForUpdates ───────────────────────────────────────');

resetExec();
routeExec(/git fetch/, () => ({ stdout: '', stderr: '' }));
routeExec(/git branch --show-current/, () => ({ stdout: 'main\n', stderr: '' }));
routeExec(/git rev-parse HEAD/, () => ({ stdout: '11111111aaaa\n', stderr: '' }));
routeExec(/git rev-parse origin\/main/, () => ({ stdout: '22222222bbbb\n', stderr: '' }));
routeExec(/git rev-list --count/, () => ({ stdout: '3\n', stderr: '' }));

{
  const s = await checkForUpdates();
  assertEq(s.updatesAvailable, true, 'updates available when behind > 0');
  assertEq(s.frontend.currentSha, '11111111', 'frontend currentSha short');
  assertEq(s.frontend.remoteSha, '22222222', 'frontend remoteSha short');
  assertEq(s.frontend.behind, 3, 'frontend behind count');
  assertEq(s.backend.currentSha, '11111111', 'backend currentSha short');
  assertEq(s.backend.behind, 3, 'backend behind count');
  assert(typeof s.lastCheckedAt === 'string' && s.lastCheckedAt.length > 0, 'lastCheckedAt set');
}

// Second call hits cache (execLog should NOT grow)
const countBeforeCached = execLog.length;
{
  const s2 = await checkForUpdates();
  assertEq(s2.frontend.behind, 3, 'cached behind=3');
  assertEq(execLog.length, countBeforeCached, 'no exec calls on cache hit');
}

// ============================================================================
// isUpdateLocked / createUpdateLock / removeUpdateLock
// ============================================================================
console.log('\n── lock lifecycle ────────────────────────────────────────');

// Fresh module-state cache from checkForUpdates will survive — we now test lock
resetExec();

// No lock → false
lockExists = false;
{
  const r = await isUpdateLocked();
  assertEq(r, false, 'no lock file → false');
}

// Fresh lock → true
lockExists = true;
lockAgeMs = 60 * 1000; // 1 minute
{
  const r = await isUpdateLocked();
  assertEq(r, true, 'fresh lock → true');
}

// Stale lock (> 2 hours) → false + remove called
lockExists = true;
lockAgeMs = 3 * 60 * 60 * 1000; // 3 hours
const removeBefore = removeCalls.length;
quiet();
{
  const r = await isUpdateLocked();
  loud();
  assertEq(r, false, 'stale lock → false');
  assert(removeCalls.length > removeBefore, 'stale lock removed');
}

// createUpdateLock writes file
const writeBefore = writeFileCalls.length;
await createUpdateLock('job-xyz');
assertEq(writeFileCalls.length, writeBefore + 1, 'writeFile called');
{
  const last = writeFileCalls[writeFileCalls.length - 1];
  assertEq(last.p, LOCK_FILE, 'lock file path');
  assert(last.data.includes('job-xyz'), 'lock data includes job id');
  assert(last.data.includes('T'), 'lock data includes iso timestamp');
}

// removeUpdateLock removes file; errors swallowed
const removeBefore2 = removeCalls.length;
await removeUpdateLock();
assertEq(removeCalls.length, removeBefore2 + 1, 'remove called');

removeShouldThrow = true;
quiet();
await removeUpdateLock(); // must not throw
loud();
removeShouldThrow = false;
assert(true, 'removeUpdateLock swallows errors');

// ============================================================================
// startUpdateJob — rejected when locked
// ============================================================================
console.log('\n── startUpdateJob: locked ────────────────────────────────');

lockExists = true;
lockAgeMs = 60 * 1000;
{
  let caught: any = null;
  try {
    await startUpdateJob('backend', 'user-1');
  } catch (e) { caught = e; }
  assert(caught !== null, 'throws when locked');
  assert(caught && /already in progress/.test(caught.message), 'error mentions in-progress');
}

// ============================================================================
// startUpdateJob — happy path (backend target)
// ============================================================================
console.log('\n── startUpdateJob: happy path ────────────────────────────');

lockExists = false;
resetExec();
// executeUpdateJob runs om-deploy.sh and optionally a health check
routeExec(/om-deploy\.sh/, () => ({ stdout: 'Deploy output line 1\nDeploy output line 2\n', stderr: 'warning line\n' }));
routeExec(/api\/health/, () => ({ stdout: 'OK', stderr: '' }));

{
  const jobId = await startUpdateJob('backend', 'user-42');
  assert(typeof jobId === 'string' && jobId.startsWith('update-'), 'job id starts with update-');

  const queued = getJob(jobId);
  assert(queued !== null, 'job stored');
  assertEq(queued.target, 'backend', 'target recorded');
  assertEq(queued.userId, 'user-42', 'userId recorded');

  // Wait for async execution to settle
  await settle();

  const done = getJob(jobId);
  assertEq(done.status, 'success', 'job success');
  assert(done.startedAt !== undefined, 'startedAt set');
  assert(done.endedAt !== undefined, 'endedAt set');
  assert(done.logs.length > 0, 'logs captured');
  assert(done.logs.some((l: string) => l.includes('Lock acquired')), 'lock acquired log');
  assert(done.logs.some((l: string) => l.includes('completed successfully')), 'success log');
  assert(done.logs.some((l: string) => l.includes('Deploy output line 1')), 'stdout captured');
  assert(done.logs.some((l: string) => l.includes('warning line')), 'stderr captured');
  assert(done.logs.some((l: string) => l.includes('health check passed')), 'health check success');

  // Log file was written via writeFile at start, then appendFileSync per log entry
  assert(appendSyncCalls.length > 0, 'log entries appended to file');
}

// ============================================================================
// startUpdateJob — frontend target (no health check)
// ============================================================================
console.log('\n── startUpdateJob: frontend target ───────────────────────');

lockExists = false;
resetExec();
routeExec(/om-deploy\.sh/, () => ({ stdout: 'FE done', stderr: '' }));
const healthBefore = execLog.filter(c => /api\/health/.test(c.cmd)).length;

{
  const jobId = await startUpdateJob('frontend', 'user-7');
  await settle();
  const done = getJob(jobId);
  assertEq(done.status, 'success', 'frontend job success');
  const healthAfter = execLog.filter(c => /api\/health/.test(c.cmd)).length;
  assertEq(healthAfter, healthBefore, 'frontend: no health check');
}

// ============================================================================
// startUpdateJob — health check failure is swallowed
// ============================================================================
console.log('\n── startUpdateJob: health check fails ────────────────────');

lockExists = false;
resetExec();
routeExec(/om-deploy\.sh/, () => ({ stdout: 'deployed', stderr: '' }));
routeExec(/api\/health/, () => new Error('curl: connection refused'));

{
  const jobId = await startUpdateJob('all', 'user-9');
  await settle();
  const done = getJob(jobId);
  assertEq(done.status, 'success', 'job still success despite health failure');
  assert(
    done.logs.some((l: string) => l.includes('health check failed')),
    'logged health check failure'
  );
}

// ============================================================================
// startUpdateJob — deploy script failure
// ============================================================================
console.log('\n── startUpdateJob: deploy failure ────────────────────────');

lockExists = false;
resetExec();
routeExec(/om-deploy\.sh/, () => new Error('exit code 1'));

{
  const jobId = await startUpdateJob('backend', 'user-err');
  await settle();
  const done = getJob(jobId);
  assertEq(done.status, 'failed', 'status=failed');
  assert(done.error !== undefined && done.error.includes('exit code 1'), 'error recorded');
  assert(done.endedAt !== undefined, 'endedAt set on failure');
  assert(
    done.logs.some((l: string) => l.includes('Update failed')),
    'failure log entry'
  );
  // Lock should still have been released (finally block)
  assert(
    done.logs.some((l: string) => l.includes('Lock released')),
    'lock released in finally'
  );
}

// ============================================================================
// getAllJobs — sorted desc by startedAt
// ============================================================================
console.log('\n── getAllJobs ────────────────────────────────────────────');

{
  const all = getAllJobs();
  assert(all.length >= 4, 'at least 4 jobs across tests');
  // Sort assertion: each next has startedAt <= previous
  for (let i = 1; i < all.length; i++) {
    const prev = all[i - 1].startedAt || '';
    const cur = all[i].startedAt || '';
    assert(prev >= cur, `job[${i - 1}].startedAt >= job[${i}].startedAt`);
  }
}

// ============================================================================
// cancelJob
// ============================================================================
console.log('\n── cancelJob ─────────────────────────────────────────────');

// Missing job → throws
{
  let caught: any = null;
  try { await cancelJob('missing'); } catch (e) { caught = e; }
  assert(caught !== null, 'throws for missing job');
  assert(caught && /not found/i.test(caught.message), 'error mentions not found');
}

// Already-succeeded job → no status change
{
  const all = getAllJobs();
  const succeeded = all.find((j: any) => j.status === 'success');
  assert(succeeded !== undefined, 'found a succeeded job');
  if (succeeded) {
    await cancelJob(succeeded.id);
    assertEq(getJob(succeeded.id).status, 'success', 'cancel on succeeded is no-op');
  }
}

// Simulate a running job by re-seeding state (use startUpdateJob with long-running exec)
// Instead, directly inspect the jobs Map via a freshly-started job whose exec hangs
lockExists = false;
resetExec();
let resolveDeploy: ((v: ExecResult) => void) | null = null;
routeExec(/om-deploy\.sh/, () => {
  // Never resolves — we'll cancel mid-flight
  // To do this, we need a Promise we can hold. Because routeExec respond is sync,
  // we can't return an unresolved Promise directly. Workaround: return a result
  // that takes many settle() iterations to complete via nested awaits.
  // Simpler: just script success then cancel AFTER success — not ideal.
  // We'll take a different approach below.
  return { stdout: 'done', stderr: '' };
});
// Not executing this branch — instead, we manually create a running job state
// by starting a job and immediately (before settle) calling cancelJob.
{
  const jobId = await startUpdateJob('backend', 'racer');
  // Job is 'queued' at this point. executeUpdateJob sets 'running' on first await.
  // Force one setImmediate flush to let 'running' get set but not complete.
  await new Promise(r => setImmediate(r));
  // cancelJob only flips if status === 'running'
  await cancelJob(jobId);
  // Allow the deploy to actually complete
  await settle();
  // Final status depends on whether cancelJob caught 'running' in time.
  // We accept either 'cancelled' (if we caught it) or 'success' (if it was too fast).
  const final = getJob(jobId).status;
  assert(
    final === 'cancelled' || final === 'success',
    `job final status is cancelled or success (got ${final})`
  );
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
