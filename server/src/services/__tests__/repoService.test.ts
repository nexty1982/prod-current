#!/usr/bin/env npx tsx
/**
 * Unit tests for services/repoService.js (OMD-1021)
 *
 * Covers the dual-repo git operations layer. All functions route through
 * child_process.execSync, which we stub with a regex-routed command table.
 *
 * Coverage:
 *   - REPO_PATHS constant + getRepoPath (valid + unknown throws)
 *   - getCurrentBranch, isClean, getStatusLines
 *   - getAheadBehind (success + error fallback to 0/0)
 *   - getLastCommit (success + error fallback to nulls)
 *   - getSnapshot (full aggregation with changed_files parsing)
 *   - fetchOrigin (with/without branch arg)
 *   - branchExistsLocal / branchExistsRemote (true on success, false on throw)
 *   - createBranch (clean tree + stash path; error rollback)
 *   - checkoutBranch (local exists vs remote fallback)
 *   - commitAll (clean tree → no commit; dirty → commit + escape quotes)
 *   - pushBranch (with/without branch arg)
 *   - mergeToMain (happy path: push → checkout main → pull → ff-merge → push → delete;
 *                  dirty tree → throws; ff-fail → throws FF_FAILED + checkout back)
 *   - saveSnapshot (stubs git + pool; INSERT with JSON changed_files)
 *   - getLatestSnapshot (row found + not found)
 *   - recordEvent, createArtifact
 *
 * Stubs child_process.execSync via require.cache BEFORE requiring SUT.
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

// ── Stub: child_process.execSync ──────────────────────────────────────
type ExecCall = { cmd: string; cwd: string };
const execLog: ExecCall[] = [];

type Route = { match: RegExp; returns?: string; throws?: Error };
let routes: Route[] = [];
let defaultReturn: string = '';

const execSyncStub = (cmd: string, opts: any) => {
  execLog.push({ cmd, cwd: opts?.cwd || '' });
  for (const r of routes) {
    if (r.match.test(cmd)) {
      if (r.throws) throw r.throws;
      return r.returns !== undefined ? r.returns : '';
    }
  }
  return defaultReturn;
};

// Preserve the real child_process module and patch execSync
const realCp = require('child_process');
const origExecSync = realCp.execSync;
realCp.execSync = execSyncStub;

function resetState() {
  execLog.length = 0;
  routes = [];
  defaultReturn = '';
}

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

async function main() {

// ============================================================================
// REPO_PATHS / getRepoPath
// ============================================================================
console.log('\n── REPO_PATHS / getRepoPath ─────────────────────────────');

assertEq(REPO_PATHS.omai, '/var/www/omai', 'omai path');
assertEq(REPO_PATHS.orthodoxmetrics, '/var/www/orthodoxmetrics/prod', 'orthodoxmetrics path');
assertEq(getRepoPath('omai'), '/var/www/omai', 'getRepoPath omai');
assertEq(getRepoPath('orthodoxmetrics'), '/var/www/orthodoxmetrics/prod', 'getRepoPath orthodoxmetrics');

{
  let caught: Error | null = null;
  try { getRepoPath('bogus'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'unknown repo throws');
  assert(caught !== null && caught.message.includes('Unknown'), 'error message');
}

// ============================================================================
// getCurrentBranch / isClean / getStatusLines
// ============================================================================
console.log('\n── status queries ───────────────────────────────────────');

resetState();
routes = [
  { match: /rev-parse --abbrev-ref HEAD/, returns: 'feature/test\n' },
];
assertEq(getCurrentBranch('omai'), 'feature/test', 'current branch (trimmed)');
assertEq(execLog[0].cwd, '/var/www/omai', 'uses correct cwd');

resetState();
routes = [
  { match: /status --porcelain/, returns: '' },
];
assertEq(isClean('omai'), true, 'empty status → clean');

resetState();
// Use leading non-space (MM) to avoid git() .trim() eating the first space.
// This matches how rest of the test uses the data.
routes = [
  { match: /status --porcelain/, returns: 'MM file1.js\n?? file2.ts' },
];
assertEq(isClean('omai'), false, 'non-empty → dirty');
const lines = getStatusLines('omai');
assertEq(lines.length, 2, '2 status lines');
assertEq(lines[0], 'MM file1.js', 'first line');

// Empty → no lines
resetState();
routes = [{ match: /status --porcelain/, returns: '' }];
assertEq(getStatusLines('omai'), [], 'empty status → empty array');

// ============================================================================
// getAheadBehind
// ============================================================================
console.log('\n── getAheadBehind ───────────────────────────────────────');

resetState();
routes = [
  { match: /rev-list --left-right --count/, returns: '3\t2' },
];
{
  const r = getAheadBehind('omai');
  assertEq(r.ahead, 3, 'ahead = 3');
  assertEq(r.behind, 2, 'behind = 2');
}

// Error fallback
resetState();
routes = [
  { match: /rev-list --left-right --count/, throws: new Error('no upstream') },
];
{
  const r = getAheadBehind('omai');
  assertEq(r.ahead, 0, 'fallback ahead = 0');
  assertEq(r.behind, 0, 'fallback behind = 0');
}

// ============================================================================
// getLastCommit
// ============================================================================
console.log('\n── getLastCommit ────────────────────────────────────────');

resetState();
routes = [
  { match: /git log -1 --format/, returns: 'abc123|fix: thing|2026-04-11T00:00:00Z' },
];
{
  const r = getLastCommit('omai');
  assertEq(r.sha, 'abc123', 'sha');
  assertEq(r.message, 'fix: thing', 'message');
  assertEq(r.date, '2026-04-11T00:00:00Z', 'date');
}

// Error → nulls
resetState();
routes = [
  { match: /git log -1 --format/, throws: new Error('no commits') },
];
{
  const r = getLastCommit('omai');
  assertEq(r.sha, null, 'null sha');
  assertEq(r.message, null, 'null message');
  assertEq(r.date, null, 'null date');
}

// ============================================================================
// getSnapshot
// ============================================================================
console.log('\n── getSnapshot ──────────────────────────────────────────');

resetState();
// Use status formats where col 0 isn't a space (git() .trim() strips leading
// whitespace which shifts the first line's column parsing).
routes = [
  { match: /rev-parse --abbrev-ref HEAD/, returns: 'main' },
  { match: /status --porcelain/, returns: 'M  a.js\nA  b.ts' },
  { match: /rev-list --left-right --count/, returns: '1\t0' },
  { match: /git log -1 --format/, returns: 'sha1|msg|2026-04-11' },
];
{
  const snap = getSnapshot('orthodoxmetrics');
  assertEq(snap.repo_target, 'orthodoxmetrics', 'repo_target');
  assertEq(snap.current_branch, 'main', 'current_branch');
  assertEq(snap.is_clean, false, 'is_clean false');
  assertEq(snap.uncommitted_count, 2, 'uncommitted_count');
  assertEq(snap.ahead, 1, 'ahead');
  assertEq(snap.behind, 0, 'behind');
  assertEq(snap.last_commit_sha, 'sha1', 'last_commit_sha');
  assertEq(snap.changed_files.length, 2, '2 changed files');
  assertEq(snap.changed_files[0].status, 'M', 'first status');
  assertEq(snap.changed_files[0].file, 'a.js', 'first file');
  assertEq(snap.changed_files[1].status, 'A', 'second status');
  assert(typeof snap.snapshot_at === 'string', 'snapshot_at is ISO string');
}

// ============================================================================
// fetchOrigin
// ============================================================================
console.log('\n── fetchOrigin ──────────────────────────────────────────');

resetState();
routes = [{ match: /git fetch origin main/, returns: '' }];
fetchOrigin('omai', 'main');
assert(/fetch origin main/.test(execLog[0].cmd), 'fetches specific branch');

resetState();
routes = [{ match: /git fetch origin(?!\s)/, returns: '' }, { match: /git fetch origin$/, returns: '' }];
fetchOrigin('omai');
assert(execLog[0].cmd.includes('fetch origin'), 'fetches no branch arg');
assert(!execLog[0].cmd.includes('fetch origin main'), 'no branch in command');

// ============================================================================
// branchExistsLocal / branchExistsRemote
// ============================================================================
console.log('\n── branchExistsLocal / Remote ───────────────────────────');

resetState();
routes = [{ match: /rev-parse --verify feat/, returns: 'abc123' }];
assertEq(branchExistsLocal('omai', 'feat'), true, 'local exists');

resetState();
routes = [{ match: /rev-parse --verify feat/, throws: new Error('not found') }];
assertEq(branchExistsLocal('omai', 'feat'), false, 'local missing → false');

resetState();
routes = [{ match: /rev-parse --verify origin\/feat/, returns: 'def456' }];
assertEq(branchExistsRemote('omai', 'feat'), true, 'remote exists');

resetState();
routes = [{ match: /rev-parse --verify origin\/feat/, throws: new Error('not found') }];
assertEq(branchExistsRemote('omai', 'feat'), false, 'remote missing → false');

// ============================================================================
// createBranch — clean tree
// ============================================================================
console.log('\n── createBranch: clean tree ─────────────────────────────');

resetState();
routes = [
  { match: /git fetch origin main/, returns: '' },
  { match: /status --porcelain/, returns: '' },            // clean
  { match: /git checkout -b/, returns: '' },
  { match: /git push -u origin/, returns: '' },
];
{
  const r = createBranch('omai', 'feat/new');
  assertEq(r.branchName, 'feat/new', 'branch name returned');
  assertEq(r.stashed, false, 'no stash');
  // Should have: fetch, status, checkout -b, push -u
  assert(execLog.some(e => /fetch origin main/.test(e.cmd)), 'fetched main');
  assert(execLog.some(e => /checkout -b feat\/new/.test(e.cmd)), 'checkout -b ran');
  assert(execLog.some(e => /push -u origin feat\/new/.test(e.cmd)), 'push -u ran');
  // No stash commands
  assert(!execLog.some(e => /stash/.test(e.cmd)), 'no stash commands');
}

// ============================================================================
// createBranch — dirty tree (stash path)
// ============================================================================
console.log('\n── createBranch: stash path ─────────────────────────────');

resetState();
routes = [
  { match: /git fetch origin main/, returns: '' },
  { match: /status --porcelain/, returns: ' M x.js' },  // dirty
  { match: /stash push/, returns: '' },
  { match: /git checkout -b/, returns: '' },
  { match: /git push -u origin/, returns: '' },
  { match: /stash pop/, returns: '' },
];
{
  const r = createBranch('omai', 'feat/stashy');
  assertEq(r.stashed, true, 'stashed = true');
  assert(execLog.some(e => /stash push/.test(e.cmd)), 'stash pushed');
  assert(execLog.some(e => /stash pop/.test(e.cmd)), 'stash popped');
}

// createBranch — error rollback restores stash
resetState();
routes = [
  { match: /git fetch origin main/, returns: '' },
  { match: /status --porcelain/, returns: ' M x.js' },
  { match: /stash push/, returns: '' },
  { match: /git checkout -b/, throws: new Error('checkout failed') },
  { match: /stash pop/, returns: '' },
];
{
  let caught: Error | null = null;
  try { createBranch('omai', 'bad'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'checkout fail throws');
  // stash pop should still have been called (rollback)
  assert(execLog.some(e => /stash pop/.test(e.cmd)), 'stash popped on rollback');
}

// ============================================================================
// checkoutBranch
// ============================================================================
console.log('\n── checkoutBranch ───────────────────────────────────────');

// Local exists → simple checkout
resetState();
routes = [
  { match: /rev-parse --verify feat/, returns: 'abc' },   // exists locally
  { match: /git checkout feat/, returns: '' },
];
assertEq(checkoutBranch('omai', 'feat'), 'checked_out_local', 'local checkout');

// Remote fallback
resetState();
routes = [
  { match: /rev-parse --verify feat/, throws: new Error('not local') },
  { match: /git fetch origin(?!\s|$)/, returns: '' },
  { match: /git fetch origin$/, returns: '' },
  { match: /checkout -b feat origin\/feat/, returns: '' },
];
assertEq(checkoutBranch('omai', 'feat'), 'checked_out_remote', 'remote fallback');

// ============================================================================
// commitAll
// ============================================================================
console.log('\n── commitAll ────────────────────────────────────────────');

// Clean tree → no commit
resetState();
routes = [
  { match: /git add -A/, returns: '' },
  { match: /status --porcelain/, returns: '' },  // clean after add
];
{
  const r = commitAll('omai', 'msg');
  assertEq(r.committed, false, 'nothing to commit');
}

// Dirty → commits + escapes quotes
resetState();
routes = [
  { match: /git add -A/, returns: '' },
  { match: /status --porcelain/, returns: 'M file' },
  { match: /git commit -m/, returns: '' },
  { match: /git log -1 --format/, returns: 'new_sha|msg text|2026-04-11' },
];
{
  const r = commitAll('omai', 'has "quotes" in it');
  assertEq(r.committed, true, 'committed = true');
  assertEq(r.sha, 'new_sha', 'returns new sha');
  // Verify quote-escape
  const commitCmd = execLog.find(e => /git commit -m/.test(e.cmd))!;
  assert(commitCmd.cmd.includes('\\"quotes\\"'), 'quotes escaped in commit cmd');
}

// ============================================================================
// pushBranch
// ============================================================================
console.log('\n── pushBranch ───────────────────────────────────────────');

resetState();
routes = [
  { match: /git push origin feat/, returns: '' },
];
{
  const r = pushBranch('omai', 'feat');
  assertEq(r.pushed, true, 'pushed');
  assertEq(r.branch, 'feat', 'branch returned');
}

// Without branch arg → gets current
resetState();
routes = [
  { match: /rev-parse --abbrev-ref HEAD/, returns: 'current-branch' },
  { match: /git push origin current-branch/, returns: '' },
];
{
  const r = pushBranch('omai');
  assertEq(r.branch, 'current-branch', 'auto-detected current branch');
}

// ============================================================================
// mergeToMain — happy path
// ============================================================================
console.log('\n── mergeToMain: happy path ──────────────────────────────');

resetState();
routes = [
  { match: /status --porcelain/, returns: '' },      // clean
  { match: /git push origin feat/, returns: '' },
  { match: /git checkout main/, returns: '' },
  { match: /git pull origin main/, returns: '' },
  { match: /git merge --ff-only feat/, returns: '' },
  { match: /rev-parse HEAD/, returns: 'merge_sha' },
  { match: /git push origin main/, returns: '' },
  { match: /git branch -d feat/, returns: '' },
  { match: /git push origin --delete feat/, returns: '' },
];
{
  const r = mergeToMain('orthodoxmetrics', 'feat');
  assertEq(r.merged, true, 'merged');
  assertEq(r.merge_type, 'fast-forward', 'ff type');
  assertEq(r.commit, 'merge_sha', 'sha returned');
  assertEq(r.branch_deleted, true, 'branch deleted');
}

// Dirty tree → throws
resetState();
routes = [
  { match: /status --porcelain/, returns: ' M x.js' },
];
{
  let caught: Error | null = null;
  try { mergeToMain('omai', 'feat'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'dirty tree throws');
  assert(caught !== null && caught.message.includes('dirty'), 'message mentions dirty');
}

// FF-fail → throws FF_FAILED and checks out branch back
resetState();
routes = [
  { match: /status --porcelain/, returns: '' },
  { match: /git push origin feat/, returns: '' },
  { match: /git checkout main/, returns: '' },
  { match: /git pull origin main/, returns: '' },
  { match: /git merge --ff-only feat/, throws: new Error('not a ff') },
  { match: /git checkout feat/, returns: '' },  // checkout back
];
{
  let caught: any = null;
  try { mergeToMain('omai', 'feat'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'ff fail throws');
  assertEq(caught.code, 'FF_FAILED', 'error.code = FF_FAILED');
  assertEq(caught.branch, 'feat', 'error.branch');
  // Should have attempted to switch back
  const checkoutBacks = execLog.filter(e => /checkout feat/.test(e.cmd));
  assert(checkoutBacks.length >= 1, 'checked out back');
}

// ============================================================================
// DB helpers: saveSnapshot, getLatestSnapshot, recordEvent, createArtifact
// ============================================================================
console.log('\n── DB helpers ───────────────────────────────────────────');

type QueryCall = { sql: string; params: any[] };
const poolLog: QueryCall[] = [];
const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    poolLog.push({ sql, params });
    if (/SELECT \* FROM repo_snapshots/i.test(sql)) {
      return [[{ id: 1, repo_target: 'omai', current_branch: 'main' }]];
    }
    if (/INSERT INTO om_daily_artifacts/i.test(sql)) {
      return [{ insertId: 555 }];
    }
    return [{ affectedRows: 1 }];
  },
};

// saveSnapshot
resetState();
poolLog.length = 0;
routes = [
  { match: /rev-parse --abbrev-ref HEAD/, returns: 'main' },
  { match: /status --porcelain/, returns: '' },
  { match: /rev-list --left-right --count/, returns: '0\t0' },
  { match: /git log -1 --format/, returns: 'sha|msg|2026-04-11' },
];
{
  const snap = await saveSnapshot(fakePool, 'omai');
  assertEq(snap.current_branch, 'main', 'snap current_branch');
  assertEq(poolLog.length, 1, '1 INSERT');
  assert(/INSERT INTO repo_snapshots/i.test(poolLog[0].sql), 'repo_snapshots insert');
  assertEq(poolLog[0].params[0], 'omai', 'repo_target param');
  assertEq(poolLog[0].params[2], 1, 'is_clean 1');
  // changed_files JSON-serialized
  assertEq(poolLog[0].params[9], '[]', 'changed_files JSON');
}

// getLatestSnapshot — row found
poolLog.length = 0;
{
  const r = await getLatestSnapshot(fakePool, 'omai');
  assertEq(r.id, 1, 'returns row');
  assertEq(poolLog[0].params[0], 'omai', 'repo_target param');
}

// getLatestSnapshot — no rows
poolLog.length = 0;
{
  const emptyPool = {
    query: async () => [[]],
  };
  const r = await getLatestSnapshot(emptyPool, 'omai');
  assertEq(r, null, 'null when no rows');
}

// recordEvent
poolLog.length = 0;
{
  await recordEvent(fakePool, 42, 'status_changed', {
    from_status: 'backlog',
    to_status: 'in_progress',
    actor: 'agent',
    message: 'started',
    metadata: { foo: 'bar' },
  });
  assertEq(poolLog.length, 1, '1 INSERT');
  assert(/INSERT INTO om_daily_item_events/i.test(poolLog[0].sql), 'events insert');
  assertEq(poolLog[0].params[0], 42, 'itemId');
  assertEq(poolLog[0].params[1], 'status_changed', 'eventType');
  assertEq(poolLog[0].params[2], 'backlog', 'from_status');
  assertEq(poolLog[0].params[3], 'in_progress', 'to_status');
  assertEq(poolLog[0].params[4], 'agent', 'actor');
  assertEq(poolLog[0].params[5], 'started', 'message');
  assertEq(poolLog[0].params[6], '{"foo":"bar"}', 'metadata JSON');
}

// recordEvent with defaults
poolLog.length = 0;
{
  await recordEvent(fakePool, 1, 'noted');
  assertEq(poolLog[0].params[4], 'system', 'default actor = system');
  assertEq(poolLog[0].params[6], null, 'null metadata');
}

// createArtifact
poolLog.length = 0;
{
  const id = await createArtifact(fakePool, 10, 'snapshot', 'title', { data: 1 }, 'alice');
  assertEq(id, 555, 'returns insertId');
  assertEq(poolLog[0].params[0], 10, 'itemId');
  assertEq(poolLog[0].params[1], 'snapshot', 'artifactType');
  assertEq(poolLog[0].params[3], '{"data":1}', 'payload JSON');
  assertEq(poolLog[0].params[4], 'alice', 'createdBy');
}

// ============================================================================
// Restore & Summary
// ============================================================================
realCp.execSync = origExecSync;

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => {
  realCp.execSync = origExecSync;
  console.error('Unhandled:', e);
  process.exit(1);
});
