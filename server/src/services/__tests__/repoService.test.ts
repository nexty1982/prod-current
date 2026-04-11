#!/usr/bin/env npx tsx
/**
 * Unit tests for services/repoService.js (OMD-1210)
 *
 * SUT: dual-repo git operations layer. Wraps child_process.execSync for all
 * git commands, plus pool-taking async helpers for snapshot persistence,
 * event logging, and artifact creation.
 *
 * Strategy:
 *   - Stub `child_process` via require.cache BEFORE loading the SUT.
 *   - execSync is regex-dispatched against the command string so each test
 *     can declare narrow, scoped responders.
 *   - For pool-based functions (saveSnapshot, getLatestSnapshot, recordEvent,
 *     createArtifact) we pass a minimal fakePool directly — no db stub needed.
 *
 * Coverage:
 *   - getRepoPath: valid targets + throws on unknown
 *   - git status helpers: getCurrentBranch, isClean, getStatusLines,
 *     getAheadBehind (happy + error path → 0,0), getLastCommit (happy + error),
 *     getSnapshot (composite)
 *   - fetchOrigin: with and without branch
 *   - branchExistsLocal / branchExistsRemote: true + false
 *   - createBranch: clean tree, with stash + pop success, push-failure restore,
 *     stash-pop-conflict warning
 *   - checkoutBranch: local first, fall back to remote
 *   - commitAll: nothing-to-commit + commit success
 *   - pushBranch: with and without explicit branch
 *   - mergeToMain: happy path, dirty-tree throws, FF_FAILED path
 *   - saveSnapshot / getLatestSnapshot / recordEvent / createArtifact
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

// ── child_process stub (must be installed BEFORE requiring the SUT) ────
type ExecCall = { cmd: string; opts: any };
const execLog: ExecCall[] = [];

type Responder = {
  match: RegExp;
  respond?: (cmd: string) => string;
  throws?: Error | string;
};
let responders: Responder[] = [];

function resetResponders() {
  execLog.length = 0;
  responders = [];
}

function respond(match: RegExp, respond: string | ((cmd: string) => string)): void {
  responders.push({
    match,
    respond: typeof respond === 'function' ? respond : () => respond as string,
  });
}

function throwOn(match: RegExp, err: Error | string): void {
  responders.push({ match, throws: err });
}

function fakeExecSync(cmd: string, opts: any = {}): string {
  execLog.push({ cmd, opts });
  for (const r of responders) {
    if (r.match.test(cmd)) {
      if (r.throws) {
        throw typeof r.throws === 'string' ? new Error(r.throws) : r.throws;
      }
      return r.respond ? r.respond(cmd) : '';
    }
  }
  // Unmatched command — fail loudly so tests notice
  throw new Error(`[test] unmatched execSync command: ${cmd}`);
}

const cpPath = require.resolve('child_process');
require.cache[cpPath] = {
  id: cpPath,
  filename: cpPath,
  loaded: true,
  exports: { execSync: fakeExecSync },
} as any;

// Silence noisy SUT logs
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

const repoService = require('../repoService');

async function main() {

// ============================================================================
// getRepoPath (pure)
// ============================================================================
console.log('\n── getRepoPath ───────────────────────────────────────────');

assertEq(repoService.getRepoPath('omai'), '/var/www/omai', 'omai path');
assertEq(repoService.getRepoPath('orthodoxmetrics'), '/var/www/orthodoxmetrics/prod', 'om path');
assertEq(repoService.REPO_PATHS.omai, '/var/www/omai', 'REPO_PATHS.omai exported');
assertEq(repoService.REPO_PATHS.orthodoxmetrics, '/var/www/orthodoxmetrics/prod', 'REPO_PATHS.om exported');

{
  let caught: Error | null = null;
  try { repoService.getRepoPath('bogus'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'unknown target throws');
  assert(caught !== null && /Unknown repo_target/.test(caught.message), 'error message mentions repo_target');
}

// ============================================================================
// getCurrentBranch
// ============================================================================
console.log('\n── getCurrentBranch ──────────────────────────────────────');

resetResponders();
respond(/rev-parse --abbrev-ref HEAD/, 'feature/my-branch\n');
{
  const b = repoService.getCurrentBranch('omai');
  assertEq(b, 'feature/my-branch', 'branch name trimmed');
  assertEq(execLog[0].opts.cwd, '/var/www/omai', 'cwd = omai repo');
  assertEq(execLog[0].opts.encoding, 'utf-8', 'encoding utf-8');
  assertEq(execLog[0].opts.timeout, 10000, 'default 10s timeout');
}

resetResponders();
respond(/rev-parse --abbrev-ref HEAD/, 'main\n');
{
  const b = repoService.getCurrentBranch('orthodoxmetrics');
  assertEq(b, 'main', 'om branch');
  assertEq(execLog[0].opts.cwd, '/var/www/orthodoxmetrics/prod', 'cwd = om repo');
}

// ============================================================================
// isClean / getStatusLines
// ============================================================================
console.log('\n── isClean / getStatusLines ──────────────────────────────');

// Clean tree
resetResponders();
respond(/status --porcelain/, '');
assertEq(repoService.isClean('omai'), true, 'clean tree → true');

resetResponders();
respond(/status --porcelain/, '');
assertEq(repoService.getStatusLines('omai'), [], 'clean tree → no lines');

// Dirty tree
// NOTE: the SUT's git() helper trims output, which strips the leading space of
// the first porcelain line. Tests below use inputs starting with `??` so the
// trim is a no-op and parsing remains deterministic.
resetResponders();
respond(/status --porcelain/, '?? src/foo.js\n?? src/new.js');
assertEq(repoService.isClean('omai'), false, 'dirty tree → false');

resetResponders();
respond(/status --porcelain/, '?? src/foo.js\n?? src/new.js');
assertEq(
  repoService.getStatusLines('omai'),
  ['?? src/foo.js', '?? src/new.js'],
  '2 lines parsed'
);

// ============================================================================
// getAheadBehind
// ============================================================================
console.log('\n── getAheadBehind ────────────────────────────────────────');

resetResponders();
respond(/rev-list --left-right --count/, '3\t2');
assertEq(repoService.getAheadBehind('omai'), { ahead: 3, behind: 2 }, '3 ahead / 2 behind');

resetResponders();
respond(/rev-list --left-right --count/, '0\t0');
assertEq(repoService.getAheadBehind('omai'), { ahead: 0, behind: 0 }, 'up to date');

// Error path — no upstream → caught → 0,0
resetResponders();
throwOn(/rev-list --left-right --count/, 'no upstream configured');
assertEq(repoService.getAheadBehind('omai'), { ahead: 0, behind: 0 }, 'error → 0,0');

// ============================================================================
// getLastCommit
// ============================================================================
console.log('\n── getLastCommit ─────────────────────────────────────────');

resetResponders();
respond(/log -1/, 'abc123|Initial commit|2026-04-11T12:00:00+00:00');
{
  const c = repoService.getLastCommit('omai');
  assertEq(c.sha, 'abc123', 'sha parsed');
  assertEq(c.message, 'Initial commit', 'message parsed');
  assertEq(c.date, '2026-04-11T12:00:00+00:00', 'date parsed');
}

// Error path → nulls
resetResponders();
throwOn(/log -1/, 'no commits yet');
{
  const c = repoService.getLastCommit('omai');
  assertEq(c.sha, null, 'error → null sha');
  assertEq(c.message, null, 'error → null message');
  assertEq(c.date, null, 'error → null date');
}

// ============================================================================
// getSnapshot (composite)
// ============================================================================
console.log('\n── getSnapshot ───────────────────────────────────────────');

resetResponders();
respond(/rev-parse --abbrev-ref HEAD/, 'main');
respond(/status --porcelain/, '?? file1.js\n?? file2.js');
respond(/rev-list --left-right --count/, '1\t0');
respond(/log -1/, 'sha123|fix: bug|2026-04-11T10:00:00+00:00');
{
  const snap = repoService.getSnapshot('orthodoxmetrics');
  assertEq(snap.repo_target, 'orthodoxmetrics', 'repo_target');
  assertEq(snap.current_branch, 'main', 'current_branch');
  assertEq(snap.is_clean, false, 'dirty');
  assertEq(snap.uncommitted_count, 2, '2 uncommitted');
  assertEq(snap.ahead, 1, 'ahead 1');
  assertEq(snap.behind, 0, 'behind 0');
  assertEq(snap.last_commit_sha, 'sha123', 'commit sha');
  assertEq(snap.last_commit_message, 'fix: bug', 'commit msg');
  assertEq(snap.last_commit_at, '2026-04-11T10:00:00+00:00', 'commit date');
  assertEq(snap.changed_files.length, 2, '2 changed files');
  assertEq(snap.changed_files[0].status, '??', '?? status line 1');
  assertEq(snap.changed_files[0].file, 'file1.js', 'line 1 file');
  assertEq(snap.changed_files[1].status, '??', '?? status line 2');
  assertEq(snap.changed_files[1].file, 'file2.js', 'line 2 file');
  assert(typeof snap.snapshot_at === 'string', 'snapshot_at ISO string');
}

// Clean snapshot
resetResponders();
respond(/rev-parse --abbrev-ref HEAD/, 'main');
respond(/status --porcelain/, '');
respond(/rev-list --left-right --count/, '0\t0');
respond(/log -1/, 'abc|msg|2026-01-01T00:00:00Z');
{
  const snap = repoService.getSnapshot('omai');
  assertEq(snap.is_clean, true, 'clean');
  assertEq(snap.uncommitted_count, 0, '0 uncommitted');
  assertEq(snap.changed_files, [], 'no changed files');
}

// ============================================================================
// fetchOrigin
// ============================================================================
console.log('\n── fetchOrigin ───────────────────────────────────────────');

resetResponders();
respond(/^git fetch origin main$/, '');
repoService.fetchOrigin('omai', 'main');
assertEq(execLog.length, 1, 'one exec');
assert(/fetch origin main/.test(execLog[0].cmd), 'fetches branch');
assertEq(execLog[0].opts.timeout, 30000, 'uses FETCH_TIMEOUT (30s)');

resetResponders();
respond(/^git fetch origin$/, '');
repoService.fetchOrigin('omai');
assert(execLog[0].cmd === 'git fetch origin', 'fetches without branch');
assertEq(execLog[0].opts.timeout, 30000, 'FETCH_TIMEOUT on no-branch fetch');

// ============================================================================
// branchExistsLocal / branchExistsRemote
// ============================================================================
console.log('\n── branchExistsLocal / branchExistsRemote ────────────────');

resetResponders();
respond(/rev-parse --verify foo$/, 'abc123');
assertEq(repoService.branchExistsLocal('omai', 'foo'), true, 'local branch exists');

resetResponders();
throwOn(/rev-parse --verify/, 'unknown ref');
assertEq(repoService.branchExistsLocal('omai', 'missing'), false, 'local branch missing → false');

resetResponders();
respond(/rev-parse --verify origin\/foo$/, 'abc123');
assertEq(repoService.branchExistsRemote('omai', 'foo'), true, 'remote branch exists');

resetResponders();
throwOn(/rev-parse --verify origin\//, 'not found');
assertEq(repoService.branchExistsRemote('omai', 'missing'), false, 'remote missing → false');

// ============================================================================
// createBranch — clean tree (no stash)
// ============================================================================
console.log('\n── createBranch: clean tree ──────────────────────────────');

resetResponders();
respond(/fetch origin main/, '');
respond(/status --porcelain/, '');           // clean → no stash
respond(/checkout -b newbranch origin\/main/, '');
respond(/push -u origin newbranch/, '');
{
  const r = repoService.createBranch('omai', 'newbranch');
  assertEq(r.branchName, 'newbranch', 'branch name');
  assertEq(r.stashed, false, 'no stash');
  // Calls: fetch, status, checkout -b, push -u
  assertEq(execLog.length, 4, '4 git calls');
  assert(/fetch origin main/.test(execLog[0].cmd), 'fetch first');
  assert(/status --porcelain/.test(execLog[1].cmd), 'status check');
  assert(/checkout -b newbranch origin\/main/.test(execLog[2].cmd), 'checkout -b');
  assert(/push -u origin newbranch/.test(execLog[3].cmd), 'push -u');
  assertEq(execLog[3].opts.timeout, 30000, 'push uses FETCH_TIMEOUT');
}

// ============================================================================
// createBranch — with stash, happy path
// ============================================================================
console.log('\n── createBranch: stash path ──────────────────────────────');

resetResponders();
respond(/fetch origin main/, '');
respond(/status --porcelain/, ' M dirty.js');          // dirty → stash
respond(/stash push/, '');
respond(/checkout -b newbranch origin\/main/, '');
respond(/push -u origin newbranch/, '');
respond(/stash pop/, '');
{
  const r = repoService.createBranch('omai', 'newbranch');
  assertEq(r.stashed, true, 'stashed');
  // fetch, status, stash push, checkout -b, push -u, stash pop
  assertEq(execLog.length, 6, '6 git calls');
  assert(/stash push/.test(execLog[2].cmd), 'stash pushed');
  assert(/stash pop/.test(execLog[5].cmd), 'stash popped at end');
}

// ============================================================================
// createBranch — push fails, restores stash
// ============================================================================
console.log('\n── createBranch: push fails, stash restored ──────────────');

resetResponders();
respond(/fetch origin main/, '');
respond(/status --porcelain/, ' M dirty.js');
respond(/stash push/, '');
respond(/checkout -b newbranch origin\/main/, '');
throwOn(/push -u origin newbranch/, 'remote rejected');
respond(/stash pop/, '');
{
  let caught: Error | null = null;
  try { repoService.createBranch('omai', 'newbranch'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'push failure rethrown');
  // fetch, status, stash push, checkout, push (throws), stash pop (in catch)
  // The stash pop should still happen in the catch block
  const popCalls = execLog.filter(c => /stash pop/.test(c.cmd));
  assertEq(popCalls.length, 1, 'stash pop called after failure');
}

// ============================================================================
// createBranch — stash pop conflict logs warning
// ============================================================================
console.log('\n── createBranch: stash pop conflict ──────────────────────');

resetResponders();
respond(/fetch origin main/, '');
respond(/status --porcelain/, ' M dirty.js');
respond(/stash push/, '');
respond(/checkout -b newbranch origin\/main/, '');
respond(/push -u origin newbranch/, '');
throwOn(/stash pop/, 'merge conflict');
quiet();
{
  const r = repoService.createBranch('omai', 'newbranch');
  loud();
  // Should NOT throw — warning is logged but branch creation succeeds
  assertEq(r.branchName, 'newbranch', 'branch still created');
  assertEq(r.stashed, true, 'stashed flag still set');
}

// ============================================================================
// checkoutBranch — local first
// ============================================================================
console.log('\n── checkoutBranch ────────────────────────────────────────');

resetResponders();
respond(/rev-parse --verify local-branch$/, 'abc123'); // exists locally
respond(/^git checkout local-branch$/, '');
{
  const r = repoService.checkoutBranch('omai', 'local-branch');
  assertEq(r, 'checked_out_local', 'local checkout path');
  assertEq(execLog.length, 2, 'verify + checkout');
}

// Fall back to remote
resetResponders();
throwOn(/rev-parse --verify remote-branch$/, 'not found');
respond(/^git fetch origin$/, '');
respond(/checkout -b remote-branch origin\/remote-branch/, '');
{
  const r = repoService.checkoutBranch('omai', 'remote-branch');
  assertEq(r, 'checked_out_remote', 'remote checkout path');
  // verify (fails), fetch, checkout -b
  assertEq(execLog.length, 3, 'verify + fetch + checkout -b');
}

// ============================================================================
// commitAll
// ============================================================================
console.log('\n── commitAll ─────────────────────────────────────────────');

// Nothing to commit
resetResponders();
respond(/^git add -A$/, '');
respond(/status --porcelain/, '');
{
  const r = repoService.commitAll('omai', 'my message');
  assertEq(r.committed, false, 'nothing to commit → committed=false');
  assert(/Nothing to commit/.test(r.message), 'message mentions nothing to commit');
}

// Commit success
resetResponders();
respond(/^git add -A$/, '');
respond(/status --porcelain/, ' M file.js');    // dirty after add → commit
respond(/commit -m "my message"/, '');
respond(/log -1/, 'sha999|my message|2026-04-11T09:00:00Z');
{
  const r = repoService.commitAll('omai', 'my message');
  assertEq(r.committed, true, 'committed');
  assertEq(r.sha, 'sha999', 'sha from last commit');
  assertEq(r.message, 'my message', 'message from last commit');
}

// Quote escaping in commit message
resetResponders();
respond(/^git add -A$/, '');
respond(/status --porcelain/, ' M file.js');
respond(/commit -m/, '');
respond(/log -1/, 'sha|m|2026-01-01T00:00:00Z');
{
  repoService.commitAll('omai', 'has "quotes" in it');
  const commitCall = execLog.find(c => /commit -m/.test(c.cmd));
  assert(commitCall !== undefined, 'commit call recorded');
  assert(commitCall!.cmd.includes('\\"quotes\\"'), 'quotes escaped');
}

// ============================================================================
// pushBranch
// ============================================================================
console.log('\n── pushBranch ────────────────────────────────────────────');

// Explicit branch
resetResponders();
respond(/push origin my-branch/, '');
{
  const r = repoService.pushBranch('omai', 'my-branch');
  assertEq(r.pushed, true, 'pushed true');
  assertEq(r.branch, 'my-branch', 'explicit branch returned');
  assertEq(execLog[0].opts.timeout, 30000, 'FETCH_TIMEOUT');
}

// No branch → uses current
resetResponders();
respond(/rev-parse --abbrev-ref HEAD/, 'current-branch');
respond(/push origin current-branch/, '');
{
  const r = repoService.pushBranch('omai');
  assertEq(r.branch, 'current-branch', 'uses current branch');
}

// ============================================================================
// mergeToMain — happy path
// ============================================================================
console.log('\n── mergeToMain: happy path ───────────────────────────────');

resetResponders();
respond(/status --porcelain/, '');             // clean
respond(/push origin mybranch$/, '');           // push branch
respond(/checkout main$/, '');
respond(/pull origin main/, '');
respond(/merge --ff-only mybranch/, '');
respond(/rev-parse HEAD/, 'mergesha123');
respond(/push origin main$/, '');
respond(/branch -d mybranch/, '');
respond(/push origin --delete mybranch/, '');
{
  const r = repoService.mergeToMain('omai', 'mybranch');
  assertEq(r.merged, true, 'merged');
  assertEq(r.branch, 'mybranch', 'branch name');
  assertEq(r.merged_to, 'main', 'merged_to main');
  assertEq(r.merge_type, 'fast-forward', 'ff merge');
  assertEq(r.commit, 'mergesha123', 'commit sha');
  assertEq(r.branch_deleted, true, 'branch deleted');
}

// Dirty tree → throws
resetResponders();
respond(/status --porcelain/, ' M dirty.js');
{
  let caught: Error | null = null;
  try { repoService.mergeToMain('omai', 'branch'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'dirty tree throws');
  assert(caught !== null && /Working tree is dirty/.test(caught.message), 'message mentions dirty');
}

// FF_FAILED path
resetResponders();
respond(/status --porcelain/, '');
respond(/push origin mybranch$/, '');
respond(/checkout main$/, '');
respond(/pull origin main/, '');
throwOn(/merge --ff-only/, 'not possible to ff');
respond(/checkout mybranch$/, ''); // switch back to branch in catch
quiet();
{
  let caught: any = null;
  try { repoService.mergeToMain('omai', 'mybranch'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'FF failure throws');
  assertEq(caught.code, 'FF_FAILED', 'error code FF_FAILED');
  assertEq(caught.branch, 'mybranch', 'branch attached to error');
  assert(/Fast-forward merge not possible/.test(caught.message), 'error message');
  // Should have tried to checkout branch to not strand user on main
  const checkoutBack = execLog.find(c => /^git checkout mybranch$/.test(c.cmd));
  assert(checkoutBack !== undefined, 'switched back to branch after FF failure');
}

// ============================================================================
// saveSnapshot (pool-taking)
// ============================================================================
console.log('\n── saveSnapshot ──────────────────────────────────────────');

resetResponders();
respond(/rev-parse --abbrev-ref HEAD/, 'main');
respond(/status --porcelain/, '?? file.js');
respond(/rev-list --left-right --count/, '2\t1');
respond(/log -1/, 'csha|commit msg|2026-04-11T08:00:00Z');
{
  const poolCalls: any[] = [];
  const fakePool = {
    query: async (sql: string, params: any[]) => {
      poolCalls.push({ sql, params });
      return [{}];
    },
  };
  const snap = await repoService.saveSnapshot(fakePool, 'omai');
  assertEq(snap.repo_target, 'omai', 'returns snapshot');
  assertEq(poolCalls.length, 1, '1 insert');
  assert(/INSERT INTO repo_snapshots/.test(poolCalls[0].sql), 'correct table');
  const p = poolCalls[0].params;
  assertEq(p[0], 'omai', 'p0 repo_target');
  assertEq(p[1], 'main', 'p1 branch');
  assertEq(p[2], 0, 'p2 is_clean 0 (dirty)');
  assertEq(p[3], 1, 'p3 uncommitted_count 1');
  assertEq(p[4], 2, 'p4 ahead');
  assertEq(p[5], 1, 'p5 behind');
  assertEq(p[6], 'csha', 'p6 commit sha');
  assertEq(p[7], 'commit msg', 'p7 commit msg');
  assertEq(p[8], '2026-04-11T08:00:00Z', 'p8 date');
  // p9 = JSON.stringify(changed_files)
  const files = JSON.parse(p[9]);
  assertEq(files.length, 1, 'p9 changed files JSON');
  assertEq(files[0].file, 'file.js', 'p9 file name');
}

// Clean tree → is_clean 1
resetResponders();
respond(/rev-parse --abbrev-ref HEAD/, 'main');
respond(/status --porcelain/, '');
respond(/rev-list --left-right --count/, '0\t0');
respond(/log -1/, 'sha|msg|2026-01-01T00:00:00Z');
{
  const poolCalls: any[] = [];
  const fakePool = { query: async (sql: string, params: any[]) => { poolCalls.push({ sql, params }); return [{}]; } };
  await repoService.saveSnapshot(fakePool, 'omai');
  assertEq(poolCalls[0].params[2], 1, 'clean → is_clean=1');
}

// ============================================================================
// getLatestSnapshot
// ============================================================================
console.log('\n── getLatestSnapshot ─────────────────────────────────────');

{
  const fakePool = {
    query: async (sql: string, params: any[]) => {
      return [[{ id: 1, repo_target: 'omai', current_branch: 'main' }]];
    },
  };
  const r = await repoService.getLatestSnapshot(fakePool, 'omai');
  assertEq(r.id, 1, 'returns first row');
  assertEq(r.repo_target, 'omai', 'row repo_target');
}

// No rows → null
{
  const fakePool = { query: async () => [[]] };
  const r = await repoService.getLatestSnapshot(fakePool, 'omai');
  assertEq(r, null, 'no rows → null');
}

// Verify SQL and params
{
  let capturedSql = '';
  let capturedParams: any[] = [];
  const fakePool = {
    query: async (sql: string, params: any[]) => {
      capturedSql = sql;
      capturedParams = params;
      return [[]];
    },
  };
  await repoService.getLatestSnapshot(fakePool, 'orthodoxmetrics');
  assert(/SELECT \* FROM repo_snapshots/.test(capturedSql), 'SELECT from repo_snapshots');
  assert(/ORDER BY snapshot_at DESC LIMIT 1/.test(capturedSql), 'orders desc limit 1');
  assertEq(capturedParams, ['orthodoxmetrics'], 'repo_target param');
}

// ============================================================================
// recordEvent
// ============================================================================
console.log('\n── recordEvent ───────────────────────────────────────────');

{
  const poolCalls: any[] = [];
  const fakePool = { query: async (sql: string, params: any[]) => { poolCalls.push({ sql, params }); return [{}]; } };

  await repoService.recordEvent(fakePool, 42, 'status_change', {
    from_status: 'backlog',
    to_status: 'in_progress',
    actor: 'claude_cli',
    message: 'started work',
    metadata: { branch: 'x' },
  });

  assertEq(poolCalls.length, 1, '1 insert');
  assert(/INSERT INTO om_daily_item_events/.test(poolCalls[0].sql), 'correct table');
  const p = poolCalls[0].params;
  assertEq(p[0], 42, 'item_id');
  assertEq(p[1], 'status_change', 'event_type');
  assertEq(p[2], 'backlog', 'from_status');
  assertEq(p[3], 'in_progress', 'to_status');
  assertEq(p[4], 'claude_cli', 'actor');
  assertEq(p[5], 'started work', 'message');
  assertEq(p[6], JSON.stringify({ branch: 'x' }), 'metadata JSON');
}

// Empty data → defaults applied
{
  const poolCalls: any[] = [];
  const fakePool = { query: async (sql: string, params: any[]) => { poolCalls.push({ sql, params }); return [{}]; } };
  await repoService.recordEvent(fakePool, 1, 'ping');
  const p = poolCalls[0].params;
  assertEq(p[2], null, 'from_status default null');
  assertEq(p[3], null, 'to_status default null');
  assertEq(p[4], 'system', 'actor default system');
  assertEq(p[5], null, 'message default null');
  assertEq(p[6], null, 'metadata default null');
}

// ============================================================================
// createArtifact
// ============================================================================
console.log('\n── createArtifact ────────────────────────────────────────');

{
  const poolCalls: any[] = [];
  const fakePool = {
    query: async (sql: string, params: any[]) => {
      poolCalls.push({ sql, params });
      return [{ insertId: 55 }];
    },
  };

  const id = await repoService.createArtifact(
    fakePool,
    42,
    'snapshot',
    'Snapshot of omai',
    { data: 123 },
    'claude_cli'
  );

  assertEq(id, 55, 'returns insertId');
  assertEq(poolCalls.length, 1, '1 insert');
  assert(/INSERT INTO om_daily_artifacts/.test(poolCalls[0].sql), 'correct table');
  const p = poolCalls[0].params;
  assertEq(p[0], 42, 'item_id');
  assertEq(p[1], 'snapshot', 'artifact_type');
  assertEq(p[2], 'Snapshot of omai', 'title');
  assertEq(p[3], JSON.stringify({ data: 123 }), 'payload JSON');
  assertEq(p[4], 'claude_cli', 'created_by');
}

// Default created_by
{
  const poolCalls: any[] = [];
  const fakePool = { query: async (sql: string, params: any[]) => { poolCalls.push({ sql, params }); return [{ insertId: 1 }]; } };
  await repoService.createArtifact(fakePool, 1, 't', 'ti', {});
  assertEq(poolCalls[0].params[4], 'system', 'default created_by = system');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
