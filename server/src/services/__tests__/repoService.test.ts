#!/usr/bin/env npx tsx
/**
 * Unit tests for services/repoService.js (OMD-1026)
 *
 * Dual-repo git operations layer. Wraps child_process.execSync for every
 * git command. Tests must stub execSync directly via reassignment since
 * child_process is already loaded.
 *
 * Coverage:
 *   - REPO_PATHS / getRepoPath (valid + unknown throws)
 *   - getCurrentBranch, isClean, getStatusLines
 *   - getAheadBehind (success + error fallback 0/0)
 *   - getLastCommit (success pipe-split + error fallback nulls)
 *   - getSnapshot (full aggregation)
 *   - fetchOrigin (with/without branch)
 *   - branchExistsLocal / branchExistsRemote (true on success, false on throw)
 *   - createBranch: clean-tree path, stash path, error rollback (still pops stash)
 *   - checkoutBranch: local path, remote fallback path
 *   - commitAll: clean no-op, dirty path with quote escaping
 *   - pushBranch: explicit + auto-detect
 *   - mergeToMain: happy path full sequence, dirty throws, FF_FAILED sets
 *     error.code and error.branch and checks out back
 *   - saveSnapshot: INSERT with JSON changed_files and is_clean 1/0
 *   - getLatestSnapshot: row found + null when empty
 *   - recordEvent: full params + default actor/null metadata
 *   - createArtifact: returns insertId
 *
 * Run: npx tsx server/src/services/__tests__/repoService.test.ts
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

// ── execSync stub via direct reassignment ────────────────────────────────
// child_process is already loaded by the time SUT requires it, so we can't
// use require.cache. Patch execSync directly on the real module.

const realCp = require('child_process');
const origExecSync = realCp.execSync;

type ExecCall = { cmd: string; cwd: string; opts: any };
const execLog: ExecCall[] = [];

// Route: match by RegExp on cmd, return string or throw Error
type Route = { match: RegExp; out?: string; throws?: Error };
let routes: Route[] = [];

const execSyncStub = (cmd: string, opts: any = {}) => {
  execLog.push({ cmd, cwd: opts.cwd, opts });
  for (const r of routes) {
    if (r.match.test(cmd)) {
      if (r.throws) throw r.throws;
      return r.out ?? '';
    }
  }
  // Default: return empty string (many git commands produce empty output)
  return '';
};

realCp.execSync = execSyncStub;

function resetState() {
  execLog.length = 0;
  routes = [];
}

const {
  REPO_PATHS,
  getRepoPath,
  getCurrentBranch,
  isClean,
  getStatusLines,
  getAheadBehind,
  getLastCommit,
  getSnapshot,
  fetchOrigin,
  branchExistsLocal,
  branchExistsRemote,
  createBranch,
  checkoutBranch,
  commitAll,
  pushBranch,
  mergeToMain,
  saveSnapshot,
  getLatestSnapshot,
  recordEvent,
  createArtifact,
} = require('../repoService');

async function main() {
try {

// ============================================================================
// REPO_PATHS / getRepoPath
// ============================================================================
console.log('\n── REPO_PATHS / getRepoPath ──────────────────────────────');

assertEq(REPO_PATHS.omai, '/var/www/omai', 'omai path');
assertEq(REPO_PATHS.orthodoxmetrics, '/var/www/orthodoxmetrics/prod', 'orthodoxmetrics path');

assertEq(getRepoPath('omai'), '/var/www/omai', 'getRepoPath omai');
assertEq(getRepoPath('orthodoxmetrics'), '/var/www/orthodoxmetrics/prod', 'getRepoPath orthodoxmetrics');

{
  let caught: Error | null = null;
  try { getRepoPath('bogus'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'unknown repo throws');
  assert(caught !== null && caught.message.includes('bogus'), 'error mentions target');
}

// ============================================================================
// getCurrentBranch
// ============================================================================
console.log('\n── getCurrentBranch ──────────────────────────────────────');

resetState();
routes = [{ match: /rev-parse --abbrev-ref HEAD/, out: '  main\n' }];
{
  assertEq(getCurrentBranch('omai'), 'main', 'trimmed branch name');
  assertEq(execLog[0].cwd, '/var/www/omai', 'cwd set');
}

// ============================================================================
// isClean
// ============================================================================
console.log('\n── isClean ───────────────────────────────────────────────');

resetState();
routes = [{ match: /git status --porcelain/, out: '' }];
assertEq(isClean('omai'), true, 'empty status → clean');

resetState();
routes = [{ match: /git status --porcelain/, out: ' M file.js' }];
assertEq(isClean('omai'), false, 'non-empty → dirty');

// ============================================================================
// getStatusLines
// ============================================================================
console.log('\n── getStatusLines ────────────────────────────────────────');

resetState();
routes = [{ match: /git status --porcelain/, out: '' }];
assertEq(getStatusLines('omai'), [], 'empty → []');

resetState();
routes = [{ match: /git status --porcelain/, out: 'MM file1.js\n?? file2.ts' }];
{
  const lines = getStatusLines('omai');
  assertEq(lines.length, 2, '2 lines');
  assertEq(lines[0], 'MM file1.js', 'first line');
}

// ============================================================================
// getAheadBehind
// ============================================================================
console.log('\n── getAheadBehind ────────────────────────────────────────');

resetState();
routes = [{ match: /rev-list --left-right --count/, out: '3\t2' }];
{
  const r = getAheadBehind('omai');
  assertEq(r.ahead, 3, 'ahead 3');
  assertEq(r.behind, 2, 'behind 2');
}

resetState();
routes = [{ match: /rev-list --left-right --count/, throws: new Error('no upstream') }];
{
  const r = getAheadBehind('omai');
  assertEq(r.ahead, 0, 'error → 0 ahead');
  assertEq(r.behind, 0, 'error → 0 behind');
}

// ============================================================================
// getLastCommit
// ============================================================================
console.log('\n── getLastCommit ─────────────────────────────────────────');

resetState();
routes = [{ match: /git log -1/, out: 'abc123|Initial commit|2026-04-11T12:00:00Z' }];
{
  const r = getLastCommit('omai');
  assertEq(r.sha, 'abc123', 'sha');
  assertEq(r.message, 'Initial commit', 'message');
  assertEq(r.date, '2026-04-11T12:00:00Z', 'date');
}

resetState();
routes = [{ match: /git log -1/, throws: new Error('no commits') }];
{
  const r = getLastCommit('omai');
  assertEq(r.sha, null, 'error → null sha');
  assertEq(r.message, null, 'error → null message');
  assertEq(r.date, null, 'error → null date');
}

// ============================================================================
// getSnapshot
// ============================================================================
console.log('\n── getSnapshot ───────────────────────────────────────────');

resetState();
routes = [
  { match: /rev-parse --abbrev-ref HEAD/, out: 'feature/x' },
  { match: /git status --porcelain/, out: 'M  a.js\nA  b.ts' },
  { match: /rev-list --left-right --count/, out: '1\t0' },
  { match: /git log -1/, out: 'sha1|msg|2026-04-11T00:00:00Z' },
];
{
  const snap = getSnapshot('omai');
  assertEq(snap.repo_target, 'omai', 'repo_target');
  assertEq(snap.current_branch, 'feature/x', 'branch');
  assertEq(snap.is_clean, false, 'not clean');
  assertEq(snap.uncommitted_count, 2, 'count 2');
  assertEq(snap.ahead, 1, 'ahead');
  assertEq(snap.behind, 0, 'behind');
  assertEq(snap.last_commit_sha, 'sha1', 'sha');
  assertEq(snap.changed_files.length, 2, 'changed_files');
  assertEq(snap.changed_files[0].status, 'M', 'file[0] status');
  assertEq(snap.changed_files[0].file, 'a.js', 'file[0] name');
  assert(typeof snap.snapshot_at === 'string', 'snapshot_at is string');
}

// ============================================================================
// fetchOrigin
// ============================================================================
console.log('\n── fetchOrigin ───────────────────────────────────────────');

resetState();
routes = [{ match: /git fetch origin main/, out: '' }];
{
  fetchOrigin('omai', 'main');
  assert(execLog.some(e => /git fetch origin main/.test(e.cmd)), 'fetches specific branch');
}

resetState();
routes = [{ match: /git fetch origin$/, out: '' }];
{
  fetchOrigin('omai');
  assert(execLog.some(e => /git fetch origin$/.test(e.cmd)), 'fetches all');
}

// ============================================================================
// branchExistsLocal / branchExistsRemote
// ============================================================================
console.log('\n── branchExists ──────────────────────────────────────────');

resetState();
routes = [{ match: /rev-parse --verify feature\/foo/, out: 'abc' }];
assertEq(branchExistsLocal('omai', 'feature/foo'), true, 'local exists');

resetState();
routes = [{ match: /rev-parse --verify/, throws: new Error('not a rev') }];
assertEq(branchExistsLocal('omai', 'nope'), false, 'local missing');

resetState();
routes = [{ match: /rev-parse --verify origin\/feature\/foo/, out: 'def' }];
assertEq(branchExistsRemote('omai', 'feature/foo'), true, 'remote exists');

resetState();
routes = [{ match: /rev-parse --verify/, throws: new Error('not a rev') }];
assertEq(branchExistsRemote('omai', 'nope'), false, 'remote missing');

// ============================================================================
// createBranch — clean tree path
// ============================================================================
console.log('\n── createBranch: clean tree ──────────────────────────────');

resetState();
routes = [
  { match: /git fetch origin main/, out: '' },
  { match: /git status --porcelain/, out: '' },  // clean
  { match: /git checkout -b feature\/new/, out: '' },
  { match: /git push -u origin feature\/new/, out: '' },
];
{
  const r = createBranch('omai', 'feature/new');
  assertEq(r.branchName, 'feature/new', 'branchName');
  assertEq(r.stashed, false, 'not stashed');

  assert(execLog.some(e => /git fetch origin main/.test(e.cmd)), 'fetched main');
  assert(execLog.some(e => /git status --porcelain/.test(e.cmd)), 'checked status');
  assert(execLog.some(e => /git checkout -b feature\/new origin\/main/.test(e.cmd)), 'checked out from origin/main');
  assert(execLog.some(e => /git push -u origin feature\/new/.test(e.cmd)), 'pushed with tracking');
  assert(!execLog.some(e => /stash/.test(e.cmd)), 'no stash');
}

// ============================================================================
// createBranch — stash path
// ============================================================================
console.log('\n── createBranch: stash path ──────────────────────────────');

resetState();
routes = [
  { match: /git fetch origin main/, out: '' },
  { match: /git status --porcelain/, out: ' M pending.js' },  // dirty
  { match: /git stash push/, out: 'saved' },
  { match: /git checkout -b feature\/new/, out: '' },
  { match: /git push -u origin/, out: '' },
  { match: /git stash pop/, out: '' },
];
{
  const r = createBranch('omai', 'feature/new');
  assertEq(r.stashed, true, 'stashed flag');
  assert(execLog.some(e => /git stash push/.test(e.cmd)), 'stashed');
  assert(execLog.some(e => /git stash pop/.test(e.cmd)), 'popped');
}

// createBranch error rollback — push fails, stash pop still happens
resetState();
routes = [
  { match: /git fetch origin main/, out: '' },
  { match: /git status --porcelain/, out: ' M pending.js' },
  { match: /git stash push/, out: '' },
  { match: /git checkout -b/, out: '' },
  { match: /git push -u origin/, throws: new Error('push failed') },
  { match: /git stash pop/, out: '' },
];
{
  let caught: Error | null = null;
  try { createBranch('omai', 'feature/err'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'push failure throws');
  // Verify stash pop was still called in the error branch
  assert(execLog.some(e => /git stash pop/.test(e.cmd)), 'stash popped on error');
}

// ============================================================================
// checkoutBranch
// ============================================================================
console.log('\n── checkoutBranch ────────────────────────────────────────');

// Local path
resetState();
routes = [
  { match: /rev-parse --verify feature\/local/, out: 'abc' },  // exists locally
  { match: /git checkout feature\/local/, out: '' },
];
{
  const r = checkoutBranch('omai', 'feature/local');
  assertEq(r, 'checked_out_local', 'local path');
}

// Remote fallback
resetState();
routes = [
  { match: /rev-parse --verify feature\/remote/, throws: new Error('no rev') },
  { match: /git fetch origin$/, out: '' },
  { match: /git checkout -b feature\/remote origin\/feature\/remote/, out: '' },
];
{
  const r = checkoutBranch('omai', 'feature/remote');
  assertEq(r, 'checked_out_remote', 'remote fallback');
}

// ============================================================================
// commitAll
// ============================================================================
console.log('\n── commitAll ─────────────────────────────────────────────');

// Clean → no-op
resetState();
routes = [
  { match: /git add -A/, out: '' },
  { match: /git status --porcelain/, out: '' },
];
{
  const r = commitAll('omai', 'test msg');
  assertEq(r.committed, false, 'not committed');
  assert(r.message.includes('Nothing to commit'), 'nothing-to-commit message');
  assert(!execLog.some(e => /git commit/.test(e.cmd)), 'no commit call');
}

// Dirty + quote escaping
resetState();
routes = [
  { match: /git add -A/, out: '' },
  { match: /git status --porcelain/, out: ' M file.js' },
  { match: /git commit -m/, out: '' },
  { match: /git log -1/, out: 'sha9|committed|2026-04-11T00:00:00Z' },
];
{
  const r = commitAll('omai', 'Fix "quotes" in path');
  assertEq(r.committed, true, 'committed');
  assertEq(r.sha, 'sha9', 'sha');
  const commitCall = execLog.find(e => /git commit -m/.test(e.cmd));
  assert(commitCall !== undefined, 'commit called');
  assert(commitCall!.cmd.includes('\\"quotes\\"'), 'quotes escaped');
}

// ============================================================================
// pushBranch
// ============================================================================
console.log('\n── pushBranch ────────────────────────────────────────────');

// Explicit branch
resetState();
routes = [{ match: /git push origin feature\/x/, out: '' }];
{
  const r = pushBranch('omai', 'feature/x');
  assertEq(r.pushed, true, 'pushed');
  assertEq(r.branch, 'feature/x', 'branch returned');
}

// Auto-detect
resetState();
routes = [
  { match: /rev-parse --abbrev-ref HEAD/, out: 'current-branch' },
  { match: /git push origin current-branch/, out: '' },
];
{
  const r = pushBranch('omai');
  assertEq(r.branch, 'current-branch', 'auto-detected');
}

// ============================================================================
// mergeToMain
// ============================================================================
console.log('\n── mergeToMain ───────────────────────────────────────────');

// Dirty → throw
resetState();
routes = [
  { match: /git status --porcelain/, out: ' M dirty.js' },
];
{
  let caught: Error | null = null;
  try { mergeToMain('omai', 'feature/x'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'dirty throws');
  assert(caught !== null && caught.message.includes('dirty'), 'error mentions dirty');
}

// Happy path — full sequence
resetState();
routes = [
  { match: /git status --porcelain/, out: '' },  // clean
  { match: /git push origin feature\/x$/, out: '' },
  { match: /git checkout main/, out: '' },
  { match: /git pull origin main/, out: '' },
  { match: /git merge --ff-only feature\/x/, out: '' },
  { match: /git rev-parse HEAD/, out: 'merged-sha' },
  { match: /git push origin main/, out: '' },
  { match: /git branch -d feature\/x/, out: '' },
  { match: /git push origin --delete feature\/x/, out: '' },
];
{
  const r = mergeToMain('omai', 'feature/x');
  assertEq(r.merged, true, 'merged');
  assertEq(r.branch, 'feature/x', 'branch');
  assertEq(r.merged_to, 'main', 'merged_to main');
  assertEq(r.merge_type, 'fast-forward', 'ff type');
  assertEq(r.commit, 'merged-sha', 'sha');
  assertEq(r.branch_deleted, true, 'branch_deleted');

  // Verify sequence includes all key calls
  assert(execLog.some(e => /git checkout main/.test(e.cmd)), 'checked out main');
  assert(execLog.some(e => /git merge --ff-only feature\/x/.test(e.cmd)), 'merged ff');
  assert(execLog.some(e => /git push origin main/.test(e.cmd)), 'pushed main');
  assert(execLog.some(e => /git branch -d/.test(e.cmd)), 'deleted local branch');
  assert(execLog.some(e => /git push origin --delete/.test(e.cmd)), 'deleted remote branch');
}

// FF_FAILED → error code and branch
resetState();
routes = [
  { match: /git status --porcelain/, out: '' },
  { match: /git push origin feature\/y$/, out: '' },
  { match: /git checkout main/, out: '' },
  { match: /git pull origin main/, out: '' },
  { match: /git merge --ff-only/, throws: new Error('not possible') },
  { match: /git checkout feature\/y/, out: '' },  // rollback
];
{
  let caught: any = null;
  try { mergeToMain('omai', 'feature/y'); } catch (e) { caught = e; }
  assert(caught !== null, 'ff failure throws');
  assertEq(caught.code, 'FF_FAILED', 'code = FF_FAILED');
  assertEq(caught.branch, 'feature/y', 'branch set on error');
  // Checked out back to branch
  assert(execLog.some(e => /git checkout feature\/y/.test(e.cmd)), 'checked out back');
}

// ============================================================================
// saveSnapshot
// ============================================================================
console.log('\n── saveSnapshot ──────────────────────────────────────────');

{
  const dbCalls: { sql: string; params: any[] }[] = [];
  const fakePool = {
    query: async (sql: string, params: any[] = []) => {
      dbCalls.push({ sql, params });
      return [{ affectedRows: 1 }];
    },
  };

  resetState();
  routes = [
    { match: /rev-parse --abbrev-ref HEAD/, out: 'main' },
    { match: /git status --porcelain/, out: '' },
    { match: /rev-list --left-right --count/, out: '0\t0' },
    { match: /git log -1/, out: 'sha1|msg|date1' },
  ];
  {
    const snap = await saveSnapshot(fakePool, 'omai');
    assertEq(dbCalls.length, 1, '1 INSERT');
    assert(/INSERT INTO repo_snapshots/i.test(dbCalls[0].sql), 'correct table');
    assertEq(dbCalls[0].params[0], 'omai', 'repo_target');
    assertEq(dbCalls[0].params[1], 'main', 'branch');
    assertEq(dbCalls[0].params[2], 1, 'is_clean = 1');
    assertEq(dbCalls[0].params[9], '[]', 'changed_files JSON');
    assertEq(snap.repo_target, 'omai', 'returned snap');
  }

  // is_clean = 0 when dirty
  dbCalls.length = 0;
  resetState();
  routes = [
    { match: /rev-parse --abbrev-ref HEAD/, out: 'main' },
    { match: /git status --porcelain/, out: 'M  file.js' },
    { match: /rev-list --left-right --count/, out: '0\t0' },
    { match: /git log -1/, out: 'sha1|msg|date1' },
  ];
  {
    await saveSnapshot(fakePool, 'omai');
    assertEq(dbCalls[0].params[2], 0, 'dirty → is_clean 0');
    const changed = JSON.parse(dbCalls[0].params[9]);
    assertEq(changed.length, 1, '1 changed file');
  }
}

// ============================================================================
// getLatestSnapshot
// ============================================================================
console.log('\n── getLatestSnapshot ─────────────────────────────────────');

{
  const fakePool1 = {
    query: async () => [[{ id: 1, repo_target: 'omai' }]],
  };
  const r = await getLatestSnapshot(fakePool1, 'omai');
  assert(r !== null, 'row found');
  assertEq(r.id, 1, 'row id');
}

{
  const fakePool2 = {
    query: async () => [[]],
  };
  const r = await getLatestSnapshot(fakePool2, 'omai');
  assertEq(r, null, 'empty → null');
}

// ============================================================================
// recordEvent
// ============================================================================
console.log('\n── recordEvent ───────────────────────────────────────────');

{
  const dbCalls: { sql: string; params: any[] }[] = [];
  const fakePool = {
    query: async (sql: string, params: any[]) => {
      dbCalls.push({ sql, params });
      return [{ affectedRows: 1 }];
    },
  };

  // Full params
  await recordEvent(fakePool, 42, 'started', {
    from_status: 'backlog',
    to_status: 'in_progress',
    actor: 'claude',
    message: 'started work',
    metadata: { foo: 'bar' },
  });
  assertEq(dbCalls[0].params, [
    42, 'started', 'backlog', 'in_progress', 'claude', 'started work', '{"foo":"bar"}',
  ], 'full params');

  // Defaults
  dbCalls.length = 0;
  await recordEvent(fakePool, 43, 'noted');
  assertEq(dbCalls[0].params, [
    43, 'noted', null, null, 'system', null, null,
  ], 'default system actor, null metadata');
}

// ============================================================================
// createArtifact
// ============================================================================
console.log('\n── createArtifact ────────────────────────────────────────');

{
  const fakePool = {
    query: async () => [{ insertId: 777 }],
  };
  const id = await createArtifact(fakePool, 42, 'diff', 'My diff', { lines: 5 }, 'claude');
  assertEq(id, 777, 'returns insertId');
}

{
  // Default createdBy
  const dbCalls: { sql: string; params: any[] }[] = [];
  const fakePool = {
    query: async (sql: string, params: any[]) => {
      dbCalls.push({ sql, params });
      return [{ insertId: 100 }];
    },
  };
  await createArtifact(fakePool, 1, 'log', 'T', {});
  assertEq(dbCalls[0].params[4], 'system', 'default createdBy=system');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

} finally {
  realCp.execSync = origExecSync;
}

if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { realCp.execSync = origExecSync; console.error('Unhandled:', e); process.exit(1); });
