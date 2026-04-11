#!/usr/bin/env npx tsx
/**
 * Unit tests for services/repoService.js (OMD-1056)
 *
 * Dual-repo git operations layer. Only external dep is child_process.execSync.
 * We stub child_process via require.cache BEFORE requiring the SUT and route
 * each command through a match table that returns scripted output or throws.
 *
 * Coverage:
 *   - getRepoPath         known targets / unknown throws
 *   - getCurrentBranch    returns trimmed output
 *   - isClean             empty porcelain → true; non-empty → false
 *   - getStatusLines      empty → []; multi-line split
 *   - getAheadBehind      parses "<ahead>\t<behind>"; error → {0,0}
 *   - getLastCommit       parses "sha|msg|date"; error → {null,null,null}
 *   - getSnapshot         composes branch/status/ahead-behind/last-commit
 *   - fetchOrigin         with branch / without branch
 *   - branchExistsLocal   true on success, false on throw
 *   - branchExistsRemote  true on success, false on throw
 *   - createBranch        fetch + stash (when dirty) + checkout -b + push -u + pop
 *   - checkoutBranch      local path / remote fallback path
 *   - commitAll           clean tree skip / dirty → commit path
 *   - pushBranch          explicit branch / derived from HEAD
 *   - mergeToMain         dirty-tree throw / FF success / FF_FAILED on merge throw
 *   - saveSnapshot        INSERT with snapshot columns
 *   - getLatestSnapshot   SELECT + returns row[0] or null
 *   - recordEvent         INSERT into om_daily_item_events
 *   - createArtifact      INSERT into om_daily_artifacts, returns insertId
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

// ── child_process stub ──────────────────────────────────────────────
type CmdCall = { cmd: string; cwd: string; timeout: number };
const cmdLog: CmdCall[] = [];

type CmdRoute = {
  match: RegExp;
  respond?: (cmd: string) => string;
  output?: string;
  throws?: Error | (() => Error);
};

let routes: CmdRoute[] = [];

function setRoutes(rs: CmdRoute[]) { routes = rs; }
function resetCmd() { cmdLog.length = 0; routes = []; }

const fakeExecSync = (cmd: string, opts: any = {}) => {
  cmdLog.push({ cmd, cwd: opts.cwd, timeout: opts.timeout });
  for (const r of routes) {
    if (r.match.test(cmd)) {
      if (r.throws) {
        const err = typeof r.throws === 'function' ? r.throws() : r.throws;
        throw err;
      }
      if (r.respond) return r.respond(cmd);
      return r.output ?? '';
    }
  }
  // Default: empty string (no match)
  return '';
};

const cpPath = require.resolve('child_process');
const realCp = require('child_process');
require.cache[cpPath] = {
  id: cpPath,
  filename: cpPath,
  loaded: true,
  exports: { ...realCp, execSync: fakeExecSync },
} as any;

const repoService = require('../repoService');
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
} = repoService;

// Silence noisy warnings
const origWarn = console.warn;
function quietWarn() { console.warn = () => {}; }
function loudWarn() { console.warn = origWarn; }

// ── Fake pool for DB tests ──────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
let nextSelectRows: any[] = [];
let nextInsertId = 999;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (/^\s*SELECT/i.test(sql)) {
      return [nextSelectRows];
    }
    if (/^\s*INSERT/i.test(sql)) {
      return [{ insertId: nextInsertId, affectedRows: 1 }];
    }
    return [[]];
  },
};

function resetDb() {
  queryLog.length = 0;
  nextSelectRows = [];
  nextInsertId = 999;
}

async function main() {

// ============================================================================
// getRepoPath / REPO_PATHS
// ============================================================================
console.log('\n── getRepoPath ───────────────────────────────────────────');

assertEq(REPO_PATHS.omai, '/var/www/omai', 'omai path');
assertEq(REPO_PATHS.orthodoxmetrics, '/var/www/orthodoxmetrics/prod', 'orthodoxmetrics path');
assertEq(getRepoPath('omai'), '/var/www/omai', 'getRepoPath(omai)');
assertEq(getRepoPath('orthodoxmetrics'), '/var/www/orthodoxmetrics/prod', 'getRepoPath(orthodoxmetrics)');

{
  let caught: Error | null = null;
  try { getRepoPath('bogus'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'unknown repo_target throws');
  assert(caught !== null && caught.message.includes('Unknown repo_target'), 'error mentions Unknown repo_target');
  assert(caught !== null && caught.message.includes('bogus'), 'error includes bad value');
}

// ============================================================================
// getCurrentBranch
// ============================================================================
console.log('\n── getCurrentBranch ──────────────────────────────────────');

resetCmd();
setRoutes([{ match: /rev-parse --abbrev-ref HEAD/, output: 'main\n' }]);
assertEq(getCurrentBranch('omai'), 'main', 'returns trimmed branch name');
assertEq(cmdLog[0].cwd, '/var/www/omai', 'cwd = omai path');
assertEq(cmdLog[0].cmd, 'git rev-parse --abbrev-ref HEAD', 'correct git cmd');
assertEq(cmdLog[0].timeout, 10000, 'default timeout 10s');

resetCmd();
setRoutes([{ match: /rev-parse --abbrev-ref HEAD/, output: 'feature/omd-1056/x\n' }]);
assertEq(getCurrentBranch('orthodoxmetrics'), 'feature/omd-1056/x', 'feature branch');
assertEq(cmdLog[0].cwd, '/var/www/orthodoxmetrics/prod', 'cwd = orthodoxmetrics path');

// ============================================================================
// isClean / getStatusLines
// ============================================================================
console.log('\n── isClean / getStatusLines ──────────────────────────────');

resetCmd();
setRoutes([{ match: /status --porcelain/, output: '' }]);
assertEq(isClean('omai'), true, 'empty porcelain → clean');

resetCmd();
setRoutes([{ match: /status --porcelain/, output: 'M  file.js\n?? new.ts' }]);
assertEq(isClean('omai'), false, 'non-empty → dirty');

resetCmd();
setRoutes([{ match: /status --porcelain/, output: '' }]);
assertEq(getStatusLines('omai'), [], 'empty → empty array');

resetCmd();
setRoutes([{ match: /status --porcelain/, output: 'M  file.js\n?? new.ts' }]);
assertEq(getStatusLines('omai'), ['M  file.js', '?? new.ts'], 'splits by newline');

// ============================================================================
// getAheadBehind
// ============================================================================
console.log('\n── getAheadBehind ────────────────────────────────────────');

resetCmd();
setRoutes([{ match: /rev-list --left-right --count/, output: '3\t5' }]);
assertEq(getAheadBehind('omai'), { ahead: 3, behind: 5 }, 'parses ahead/behind');

resetCmd();
setRoutes([{ match: /rev-list/, output: '0\t0' }]);
assertEq(getAheadBehind('omai'), { ahead: 0, behind: 0 }, 'zero zero');

resetCmd();
setRoutes([{ match: /rev-list/, throws: new Error('no upstream') }]);
assertEq(getAheadBehind('omai'), { ahead: 0, behind: 0 }, 'error → {0,0}');

resetCmd();
// Non-numeric fallback
setRoutes([{ match: /rev-list/, output: 'NaN\tNaN' }]);
assertEq(getAheadBehind('omai'), { ahead: 0, behind: 0 }, 'NaN coerced to 0');

// ============================================================================
// getLastCommit
// ============================================================================
console.log('\n── getLastCommit ─────────────────────────────────────────');

resetCmd();
setRoutes([{ match: /log -1/, output: 'abc123|fix: bug|2026-04-10T12:00:00Z' }]);
{
  const c = getLastCommit('omai');
  assertEq(c.sha, 'abc123', 'sha parsed');
  assertEq(c.message, 'fix: bug', 'message parsed');
  assertEq(c.date, '2026-04-10T12:00:00Z', 'date parsed');
}

resetCmd();
setRoutes([{ match: /log -1/, throws: new Error('no commits') }]);
{
  const c = getLastCommit('omai');
  assertEq(c.sha, null, 'error → sha null');
  assertEq(c.message, null, 'error → message null');
  assertEq(c.date, null, 'error → date null');
}

// ============================================================================
// getSnapshot
// ============================================================================
console.log('\n── getSnapshot ───────────────────────────────────────────');

resetCmd();
setRoutes([
  { match: /rev-parse --abbrev-ref HEAD/, output: 'main' },
  { match: /status --porcelain/, output: 'M  a.js\n?? b.ts' },
  { match: /rev-list/, output: '2\t1' },
  { match: /log -1/, output: 'deadbeef|initial|2026-04-01T00:00:00Z' },
]);
{
  const snap = getSnapshot('orthodoxmetrics');
  assertEq(snap.repo_target, 'orthodoxmetrics', 'repo_target');
  assertEq(snap.current_branch, 'main', 'current_branch');
  assertEq(snap.is_clean, false, 'is_clean false (2 lines)');
  assertEq(snap.uncommitted_count, 2, 'uncommitted_count');
  assertEq(snap.ahead, 2, 'ahead');
  assertEq(snap.behind, 1, 'behind');
  assertEq(snap.last_commit_sha, 'deadbeef', 'last_commit_sha');
  assertEq(snap.last_commit_message, 'initial', 'last_commit_message');
  assertEq(snap.last_commit_at, '2026-04-01T00:00:00Z', 'last_commit_at');
  assertEq(snap.changed_files.length, 2, '2 changed files');
  assertEq(snap.changed_files[0], { status: 'M', file: 'a.js' }, 'first file parsed');
  assertEq(snap.changed_files[1], { status: '??', file: 'b.ts' }, 'second file parsed');
  assert(typeof snap.snapshot_at === 'string', 'snapshot_at ISO string');
}

// Clean snapshot
resetCmd();
setRoutes([
  { match: /rev-parse --abbrev-ref HEAD/, output: 'main' },
  { match: /status --porcelain/, output: '' },
  { match: /rev-list/, output: '0\t0' },
  { match: /log -1/, output: 'sha|msg|2026-04-10T00:00:00Z' },
]);
{
  const snap = getSnapshot('omai');
  assertEq(snap.is_clean, true, 'clean snapshot: is_clean true');
  assertEq(snap.uncommitted_count, 0, 'clean: 0 uncommitted');
  assertEq(snap.changed_files, [], 'clean: empty changed_files');
}

// ============================================================================
// fetchOrigin
// ============================================================================
console.log('\n── fetchOrigin ───────────────────────────────────────────');

resetCmd();
setRoutes([{ match: /fetch origin/, output: '' }]);
fetchOrigin('omai', 'main');
assertEq(cmdLog[0].cmd, 'git fetch origin main', 'fetch with branch');
assertEq(cmdLog[0].timeout, 30000, 'fetch uses 30s timeout');

resetCmd();
setRoutes([{ match: /fetch origin/, output: '' }]);
fetchOrigin('omai');
assertEq(cmdLog[0].cmd, 'git fetch origin', 'fetch without branch');
assertEq(cmdLog[0].timeout, 30000, 'fetch no-branch uses 30s');

// ============================================================================
// branchExistsLocal / branchExistsRemote
// ============================================================================
console.log('\n── branchExists* ─────────────────────────────────────────');

resetCmd();
setRoutes([{ match: /rev-parse --verify feature\/x/, output: 'sha' }]);
assertEq(branchExistsLocal('omai', 'feature/x'), true, 'local exists');

resetCmd();
setRoutes([{ match: /rev-parse/, throws: new Error('unknown') }]);
assertEq(branchExistsLocal('omai', 'nope'), false, 'local missing → false');

resetCmd();
setRoutes([{ match: /rev-parse --verify origin\/feature\/x/, output: 'sha' }]);
assertEq(branchExistsRemote('omai', 'feature/x'), true, 'remote exists');
assert(/origin\/feature\/x/.test(cmdLog[0].cmd), 'uses origin/ prefix');

resetCmd();
setRoutes([{ match: /rev-parse/, throws: new Error('unknown') }]);
assertEq(branchExistsRemote('omai', 'nope'), false, 'remote missing → false');

// ============================================================================
// createBranch — clean tree (no stash)
// ============================================================================
console.log('\n── createBranch ──────────────────────────────────────────');

resetCmd();
setRoutes([
  { match: /fetch origin main/, output: '' },
  { match: /status --porcelain/, output: '' },  // clean
  { match: /checkout -b/, output: '' },
  { match: /push -u origin/, output: '' },
]);
{
  const r = createBranch('omai', 'feature/new');
  assertEq(r.branchName, 'feature/new', 'returned branchName');
  assertEq(r.stashed, false, 'not stashed (clean tree)');
  // Expected sequence: fetch, status, checkout -b, push -u
  assertEq(cmdLog.length, 4, 'clean: 4 commands');
  assert(/fetch origin main/.test(cmdLog[0].cmd), '1: fetch main');
  assert(/status --porcelain/.test(cmdLog[1].cmd), '2: status');
  assert(/checkout -b feature\/new origin\/main/.test(cmdLog[2].cmd), '3: checkout -b from origin/main');
  assert(/push -u origin feature\/new/.test(cmdLog[3].cmd), '4: push -u');
  assertEq(cmdLog[3].timeout, 30000, 'push uses 30s');
}

// createBranch — dirty tree (stash + pop)
resetCmd();
setRoutes([
  { match: /fetch origin main/, output: '' },
  { match: /status --porcelain/, output: ' M foo' },  // dirty
  { match: /stash push/, output: '' },
  { match: /checkout -b/, output: '' },
  { match: /push -u origin/, output: '' },
  { match: /stash pop/, output: '' },
]);
{
  const r = createBranch('omai', 'feature/dirty');
  assertEq(r.stashed, true, 'stashed=true');
  assertEq(cmdLog.length, 6, 'dirty: 6 commands');
  assert(/stash push -m/.test(cmdLog[2].cmd), '3: stash push');
  assert(/checkout -b feature\/dirty origin\/main/.test(cmdLog[3].cmd), '4: checkout -b');
  assert(/push -u origin feature\/dirty/.test(cmdLog[4].cmd), '5: push -u');
  assert(/stash pop/.test(cmdLog[5].cmd), '6: stash pop');
}

// createBranch — checkout fails after stash → restore stash, rethrow
resetCmd();
setRoutes([
  { match: /fetch origin main/, output: '' },
  { match: /status --porcelain/, output: ' M foo' },
  { match: /stash push/, output: '' },
  { match: /checkout -b/, throws: new Error('checkout failed') },
  { match: /stash pop/, output: '' },
]);
{
  let caught: Error | null = null;
  try { createBranch('omai', 'feature/fail'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'checkout fail rethrows');
  assert(caught !== null && caught.message.includes('checkout failed'), 'error message preserved');
  // Verify stash pop attempted after failure
  assert(cmdLog.some(c => /stash pop/.test(c.cmd)), 'stash pop attempted on failure path');
}

// createBranch — stash pop conflicts on new branch → warn, continue
resetCmd();
quietWarn();
setRoutes([
  { match: /fetch origin main/, output: '' },
  { match: /status --porcelain/, output: ' M foo' },
  { match: /stash push/, output: '' },
  { match: /checkout -b/, output: '' },
  { match: /push -u origin/, output: '' },
  { match: /stash pop/, throws: new Error('conflict') },
]);
{
  const r = createBranch('omai', 'feature/conflict');
  loudWarn();
  assertEq(r.stashed, true, 'still reports stashed=true');
  assertEq(r.branchName, 'feature/conflict', 'returns branchName even on stash conflict');
}

// ============================================================================
// checkoutBranch
// ============================================================================
console.log('\n── checkoutBranch ────────────────────────────────────────');

// Local path
resetCmd();
setRoutes([
  { match: /rev-parse --verify feature\/x/, output: 'sha' },   // exists local
  { match: /checkout feature\/x/, output: '' },
]);
assertEq(checkoutBranch('omai', 'feature/x'), 'checked_out_local', 'local path');
assertEq(cmdLog.length, 2, '2 commands for local path');
assert(/git checkout feature\/x/.test(cmdLog[1].cmd), 'plain checkout');

// Remote fallback path
resetCmd();
setRoutes([
  { match: /rev-parse --verify feature\/remote/, throws: new Error('not local') },
  { match: /fetch origin/, output: '' },
  { match: /checkout -b feature\/remote origin\/feature\/remote/, output: '' },
]);
assertEq(checkoutBranch('omai', 'feature/remote'), 'checked_out_remote', 'remote fallback');
assert(cmdLog.some(c => /git fetch origin$/.test(c.cmd) || /git fetch origin[^/]/.test(c.cmd)), 'fetch fired');
assert(cmdLog.some(c => /checkout -b feature\/remote origin\/feature\/remote/.test(c.cmd)), 'checkout -b from origin');

// ============================================================================
// commitAll
// ============================================================================
console.log('\n── commitAll ─────────────────────────────────────────────');

// Clean tree → skip
resetCmd();
setRoutes([
  { match: /add -A/, output: '' },
  { match: /status --porcelain/, output: '' },  // clean after add
]);
{
  const r = commitAll('omai', 'test msg');
  assertEq(r.committed, false, 'clean → not committed');
  assert(r.message.includes('Nothing to commit'), 'skip message');
}

// Dirty → commit
resetCmd();
setRoutes([
  { match: /add -A/, output: '' },
  { match: /status --porcelain/, output: ' M file' },  // dirty
  { match: /commit -m/, output: '' },
  { match: /log -1/, output: 'abc|test msg|2026-04-10T00:00:00Z' },
]);
{
  const r = commitAll('omai', 'test msg');
  assertEq(r.committed, true, 'dirty → committed');
  assertEq(r.sha, 'abc', 'sha from last commit');
  assertEq(r.message, 'test msg', 'message from last commit');
  // Verify quotes in message are escaped
  assert(cmdLog.some(c => /commit -m "test msg"/.test(c.cmd)), 'commit with quoted message');
}

// Message with embedded double quote is escaped
resetCmd();
setRoutes([
  { match: /add -A/, output: '' },
  { match: /status --porcelain/, output: ' M file' },
  { match: /commit -m/, output: '' },
  { match: /log -1/, output: 'abc|msg|2026-04-10T00:00:00Z' },
]);
commitAll('omai', 'hello "world"');
{
  const commitCmd = cmdLog.find(c => /commit -m/.test(c.cmd))!;
  assert(commitCmd.cmd.includes('hello \\"world\\"'), 'embedded quotes escaped');
}

// ============================================================================
// pushBranch
// ============================================================================
console.log('\n── pushBranch ────────────────────────────────────────────');

resetCmd();
setRoutes([{ match: /push origin feature\/x/, output: '' }]);
{
  const r = pushBranch('omai', 'feature/x');
  assertEq(r.pushed, true, 'pushed=true');
  assertEq(r.branch, 'feature/x', 'returned branch');
  assertEq(cmdLog[0].timeout, 30000, 'push uses 30s');
}

// Derives from HEAD when branch not given
resetCmd();
setRoutes([
  { match: /rev-parse --abbrev-ref HEAD/, output: 'current-branch' },
  { match: /push origin current-branch/, output: '' },
]);
{
  const r = pushBranch('omai');
  assertEq(r.branch, 'current-branch', 'derived from HEAD');
  assert(cmdLog.some(c => /push origin current-branch/.test(c.cmd)), 'correct push cmd');
}

// ============================================================================
// mergeToMain — dirty tree throws
// ============================================================================
console.log('\n── mergeToMain ───────────────────────────────────────────');

resetCmd();
setRoutes([{ match: /status --porcelain/, output: ' M dirty' }]);
{
  let caught: Error | null = null;
  try { mergeToMain('omai', 'feature/x'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'dirty tree throws');
  assert(caught !== null && caught.message.includes('dirty'), 'error mentions dirty');
}

// Happy path — FF succeeds
resetCmd();
setRoutes([
  { match: /status --porcelain/, output: '' },                         // clean
  { match: /push origin feature\/x/, output: '' },                      // push branch
  { match: /checkout main/, output: '' },                               // switch
  { match: /pull origin main/, output: '' },                            // pull
  { match: /merge --ff-only/, output: '' },                             // ff merge
  { match: /rev-parse HEAD/, output: 'mergedsha' },                     // merged sha
  { match: /push origin main/, output: '' },                            // push main
  { match: /branch -d feature\/x/, output: '' },                        // delete local
  { match: /push origin --delete feature\/x/, output: '' },             // delete remote
]);
{
  const r = mergeToMain('omai', 'feature/x');
  assertEq(r.merged, true, 'merged=true');
  assertEq(r.branch, 'feature/x', 'branch');
  assertEq(r.merged_to, 'main', 'merged_to=main');
  assertEq(r.merge_type, 'fast-forward', 'FF merge');
  assertEq(r.commit, 'mergedsha', 'merge commit sha');
  assertEq(r.branch_deleted, true, 'branch_deleted=true');
}

// FF_FAILED path
resetCmd();
setRoutes([
  { match: /status --porcelain/, output: '' },
  { match: /push origin feature\/x/, output: '' },
  { match: /checkout main/, output: '' },
  { match: /pull origin main/, output: '' },
  { match: /merge --ff-only/, throws: new Error('non-ff') },
  { match: /checkout feature\/x/, output: '' },  // recovery switch back
]);
{
  let caught: any = null;
  try { mergeToMain('omai', 'feature/x'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'FF failure throws');
  assertEq(caught?.code, 'FF_FAILED', 'error code FF_FAILED');
  assertEq(caught?.branch, 'feature/x', 'error branch');
  assert(caught?.message.includes('Fast-forward merge not possible'), 'error message');
  // Verify recovery: checkout branch after failure
  assert(cmdLog.some(c => /checkout feature\/x/.test(c.cmd)), 'checkout back to branch on FF failure');
}

// Branch delete failures are swallowed
resetCmd();
setRoutes([
  { match: /status --porcelain/, output: '' },
  { match: /push origin feature\/gone/, output: '' },
  { match: /checkout main/, output: '' },
  { match: /pull origin main/, output: '' },
  { match: /merge --ff-only/, output: '' },
  { match: /rev-parse HEAD/, output: 'sha2' },
  { match: /push origin main/, output: '' },
  { match: /branch -d feature\/gone/, throws: new Error('already gone') },
  { match: /push origin --delete feature\/gone/, throws: new Error('already gone remote') },
]);
{
  const r = mergeToMain('omai', 'feature/gone');
  assertEq(r.merged, true, 'merge still reported successful');
  assertEq(r.branch_deleted, true, 'branch_deleted flag still true (best-effort)');
}

// ============================================================================
// saveSnapshot
// ============================================================================
console.log('\n── saveSnapshot ──────────────────────────────────────────');

resetCmd();
resetDb();
setRoutes([
  { match: /rev-parse --abbrev-ref HEAD/, output: 'main' },
  { match: /status --porcelain/, output: '' },
  { match: /rev-list/, output: '0\t0' },
  { match: /log -1/, output: 'sha|m|2026-04-10T00:00:00Z' },
]);
{
  const snap = await saveSnapshot(fakePool, 'omai');
  assertEq(snap.repo_target, 'omai', 'snapshot returned');
  assertEq(queryLog.length, 1, '1 INSERT');
  assert(/INSERT INTO repo_snapshots/.test(queryLog[0].sql), 'inserts into repo_snapshots');
  assertEq(queryLog[0].params[0], 'omai', 'param 0: repo_target');
  assertEq(queryLog[0].params[1], 'main', 'param 1: current_branch');
  assertEq(queryLog[0].params[2], 1, 'param 2: is_clean=1');
  assertEq(queryLog[0].params[3], 0, 'param 3: uncommitted_count=0');
  assertEq(queryLog[0].params[4], 0, 'param 4: ahead');
  assertEq(queryLog[0].params[5], 0, 'param 5: behind');
  assertEq(queryLog[0].params[6], 'sha', 'param 6: last_commit_sha');
  assertEq(queryLog[0].params[7], 'm', 'param 7: last_commit_message');
  assertEq(queryLog[0].params[8], '2026-04-10T00:00:00Z', 'param 8: last_commit_at');
  assertEq(queryLog[0].params[9], '[]', 'param 9: changed_files JSON');
}

// Dirty snapshot → is_clean=0
resetCmd();
resetDb();
setRoutes([
  { match: /rev-parse --abbrev-ref HEAD/, output: 'main' },
  { match: /status --porcelain/, output: 'M  a.js' },
  { match: /rev-list/, output: '1\t2' },
  { match: /log -1/, output: 'sha|m|2026-04-10T00:00:00Z' },
]);
{
  await saveSnapshot(fakePool, 'omai');
  assertEq(queryLog[0].params[2], 0, 'dirty → is_clean=0');
  assertEq(queryLog[0].params[3], 1, 'uncommitted_count=1');
  assertEq(queryLog[0].params[4], 1, 'ahead=1');
  assertEq(queryLog[0].params[5], 2, 'behind=2');
  assert(/"file":"a.js"/.test(queryLog[0].params[9]), 'changed_files serialized');
}

// ============================================================================
// getLatestSnapshot
// ============================================================================
console.log('\n── getLatestSnapshot ─────────────────────────────────────');

resetDb();
nextSelectRows = [{ id: 1, repo_target: 'omai', current_branch: 'main' }];
{
  const row = await getLatestSnapshot(fakePool, 'omai');
  assertEq(row.id, 1, 'returns first row');
  assertEq(queryLog[0].params[0], 'omai', 'param is repo_target');
  assert(/SELECT \* FROM repo_snapshots/.test(queryLog[0].sql), 'SELECT from repo_snapshots');
  assert(/ORDER BY snapshot_at DESC LIMIT 1/.test(queryLog[0].sql), 'ORDER BY + LIMIT 1');
}

resetDb();
nextSelectRows = [];
{
  const row = await getLatestSnapshot(fakePool, 'omai');
  assertEq(row, null, 'no rows → null');
}

// ============================================================================
// recordEvent
// ============================================================================
console.log('\n── recordEvent ───────────────────────────────────────────');

resetDb();
await recordEvent(fakePool, 42, 'started', {
  from_status: 'backlog',
  to_status: 'in_progress',
  actor: 'claude_cli',
  message: 'start',
  metadata: { foo: 'bar' },
});
{
  assertEq(queryLog.length, 1, '1 INSERT');
  assert(/INSERT INTO om_daily_item_events/.test(queryLog[0].sql), 'inserts event');
  assertEq(queryLog[0].params[0], 42, 'item_id');
  assertEq(queryLog[0].params[1], 'started', 'event_type');
  assertEq(queryLog[0].params[2], 'backlog', 'from_status');
  assertEq(queryLog[0].params[3], 'in_progress', 'to_status');
  assertEq(queryLog[0].params[4], 'claude_cli', 'actor');
  assertEq(queryLog[0].params[5], 'start', 'message');
  assertEq(queryLog[0].params[6], '{"foo":"bar"}', 'metadata JSON');
}

// Defaults when data not provided
resetDb();
await recordEvent(fakePool, 7, 'noop');
{
  assertEq(queryLog[0].params[0], 7, 'item_id');
  assertEq(queryLog[0].params[1], 'noop', 'event_type');
  assertEq(queryLog[0].params[2], null, 'from_status default null');
  assertEq(queryLog[0].params[3], null, 'to_status default null');
  assertEq(queryLog[0].params[4], 'system', 'actor default system');
  assertEq(queryLog[0].params[5], null, 'message default null');
  assertEq(queryLog[0].params[6], null, 'metadata default null');
}

// ============================================================================
// createArtifact
// ============================================================================
console.log('\n── createArtifact ────────────────────────────────────────');

resetDb();
nextInsertId = 555;
{
  const id = await createArtifact(
    fakePool,
    99,
    'snapshot',
    'Before work',
    { some: 'data' },
    'claude_cli'
  );
  assertEq(id, 555, 'returns insertId');
  assertEq(queryLog.length, 1, '1 INSERT');
  assert(/INSERT INTO om_daily_artifacts/.test(queryLog[0].sql), 'inserts artifact');
  assertEq(queryLog[0].params[0], 99, 'item_id');
  assertEq(queryLog[0].params[1], 'snapshot', 'artifact_type');
  assertEq(queryLog[0].params[2], 'Before work', 'title');
  assertEq(queryLog[0].params[3], '{"some":"data"}', 'payload JSON');
  assertEq(queryLog[0].params[4], 'claude_cli', 'created_by');
}

// Default created_by
resetDb();
nextInsertId = 777;
{
  const id = await createArtifact(fakePool, 1, 'snapshot', 't', {});
  assertEq(id, 777, 'insertId');
  assertEq(queryLog[0].params[4], 'system', 'created_by default system');
  assertEq(queryLog[0].params[3], '{}', 'empty payload serialized');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { loudWarn(); console.error('Unhandled:', e); process.exit(1); });
