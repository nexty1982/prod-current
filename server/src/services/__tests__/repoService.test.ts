#!/usr/bin/env npx tsx
/**
 * Unit tests for services/repoService.js (OMD-1233)
 *
 * Dual-repo git operations layer. Wraps child_process.execSync for git
 * commands and a DB pool for snapshot/event/artifact persistence.
 *
 * Strategy: stub child_process via require.cache with a fake execSync
 * that records calls and returns scriptable responses keyed by SQL regex.
 * Stub pool with a capture array.
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

// ── Fake execSync ───────────────────────────────────────────────
type ExecCall = { cmd: string; cwd: string; timeout: number };
const execLog: ExecCall[] = [];

// Scriptable: array of { match: RegExp, respond: (cmd) => string | Error }
let responders: Array<{ match: RegExp; respond: (cmd: string) => string | Error }> = [];
let defaultResponse: string = '';

function fakeExecSync(cmd: string, opts: any = {}): string {
  execLog.push({ cmd, cwd: opts.cwd, timeout: opts.timeout });
  for (const r of responders) {
    if (r.match.test(cmd)) {
      const out = r.respond(cmd);
      if (out instanceof Error) throw out;
      return out;
    }
  }
  return defaultResponse;
}

const cpStub = { execSync: fakeExecSync };
const cpPath = require.resolve('child_process');
require.cache[cpPath] = {
  id: cpPath,
  filename: cpPath,
  loaded: true,
  exports: cpStub,
} as any;

function resetState() {
  execLog.length = 0;
  responders = [];
  defaultResponse = '';
}

// Silence noisy logs
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function loud() {
  console.log = origLog;
  console.warn = origWarn;
  console.error = origError;
}

// Fake pool
type PoolCall = { sql: string; params: any[] };
const poolLog: PoolCall[] = [];
let poolInsertId = 100;
let poolSelectRows: any[] = [];
const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    poolLog.push({ sql, params });
    if (/^\s*INSERT/i.test(sql)) {
      return [{ insertId: poolInsertId++ }];
    }
    if (/^\s*SELECT/i.test(sql)) {
      return [poolSelectRows];
    }
    return [{}];
  },
};

function resetPool() {
  poolLog.length = 0;
  poolInsertId = 100;
  poolSelectRows = [];
}

const repoService = require('../repoService');

async function main() {

// ============================================================================
// REPO_PATHS / getRepoPath
// ============================================================================
console.log('\n── getRepoPath ───────────────────────────────────────────');

assertEq(repoService.REPO_PATHS.omai, '/var/www/omai', 'REPO_PATHS.omai');
assertEq(
  repoService.REPO_PATHS.orthodoxmetrics,
  '/var/www/orthodoxmetrics/prod',
  'REPO_PATHS.orthodoxmetrics'
);
assertEq(repoService.getRepoPath('omai'), '/var/www/omai', 'getRepoPath omai');
assertEq(
  repoService.getRepoPath('orthodoxmetrics'),
  '/var/www/orthodoxmetrics/prod',
  'getRepoPath orthodoxmetrics'
);

{
  let caught: Error | null = null;
  try { repoService.getRepoPath('bogus'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'unknown repo target throws');
  assert(caught !== null && /Unknown repo_target/.test(caught.message), 'error message');
}

// ============================================================================
// getCurrentBranch
// ============================================================================
console.log('\n── getCurrentBranch ──────────────────────────────────────');

resetState();
responders = [{ match: /rev-parse --abbrev-ref HEAD/, respond: () => 'feature/foo\n' }];
{
  const b = repoService.getCurrentBranch('omai');
  assertEq(b, 'feature/foo', 'trimmed branch name');
  assertEq(execLog[0].cwd, '/var/www/omai', 'cwd is omai path');
  assert(/git rev-parse --abbrev-ref HEAD/.test(execLog[0].cmd), 'correct git cmd');
}

// ============================================================================
// isClean / getStatusLines
// ============================================================================
console.log('\n── isClean / getStatusLines ──────────────────────────────');

resetState();
responders = [{ match: /status --porcelain/, respond: () => '' }];
assertEq(repoService.isClean('omai'), true, 'empty status → clean');

resetState();
responders = [{ match: /status --porcelain/, respond: () => ' M server/foo.js\n?? new.js' }];
assertEq(repoService.isClean('omai'), false, 'non-empty status → dirty');

resetState();
responders = [{ match: /status --porcelain/, respond: () => '' }];
assertEq(repoService.getStatusLines('omai'), [], 'empty status → []');

resetState();
// Note: git() wrapper trims output, so leading whitespace is stripped.
// Use status codes that don't start with a space.
responders = [{ match: /status --porcelain/, respond: () => 'M  a.js\n?? b.js\nA  c.js' }];
{
  const lines = repoService.getStatusLines('omai');
  assertEq(lines.length, 3, '3 status lines');
  assertEq(lines[0], 'M  a.js', 'first line');
  assertEq(lines[2], 'A  c.js', 'third line');
}

// ============================================================================
// getAheadBehind
// ============================================================================
console.log('\n── getAheadBehind ────────────────────────────────────────');

resetState();
responders = [{ match: /rev-list --left-right --count/, respond: () => '3\t5\n' }];
assertEq(repoService.getAheadBehind('omai'), { ahead: 3, behind: 5 }, 'ahead 3 behind 5');

resetState();
responders = [{ match: /rev-list/, respond: () => '0\t0' }];
assertEq(repoService.getAheadBehind('omai'), { ahead: 0, behind: 0 }, 'both zero');

// Error path → defaults
resetState();
responders = [{ match: /rev-list/, respond: () => new Error('no upstream') }];
quiet();
assertEq(repoService.getAheadBehind('omai'), { ahead: 0, behind: 0 }, 'error → {0,0}');
loud();

// ============================================================================
// getLastCommit
// ============================================================================
console.log('\n── getLastCommit ─────────────────────────────────────────');

resetState();
responders = [{
  match: /log -1 --format/,
  respond: () => 'abc123|Initial commit|2026-04-11T12:00:00Z',
}];
{
  const c = repoService.getLastCommit('omai');
  assertEq(c.sha, 'abc123', 'sha');
  assertEq(c.message, 'Initial commit', 'message');
  assertEq(c.date, '2026-04-11T12:00:00Z', 'date');
}

// Error path → nulls
resetState();
responders = [{ match: /log -1/, respond: () => new Error('no commits') }];
quiet();
{
  const c = repoService.getLastCommit('omai');
  assertEq(c, { sha: null, message: null, date: null }, 'error → null fields');
}
loud();

// ============================================================================
// getSnapshot
// ============================================================================
console.log('\n── getSnapshot ───────────────────────────────────────────');

resetState();
responders = [
  { match: /rev-parse --abbrev-ref HEAD/, respond: () => 'main' },
  { match: /status --porcelain/, respond: () => 'M  a.js\n?? b.js' },
  { match: /rev-list/, respond: () => '2\t1' },
  { match: /log -1/, respond: () => 'sha1|msg|2026-04-11T00:00:00Z' },
];
{
  const snap = repoService.getSnapshot('orthodoxmetrics');
  assertEq(snap.repo_target, 'orthodoxmetrics', 'repo_target');
  assertEq(snap.current_branch, 'main', 'branch');
  assertEq(snap.is_clean, false, 'not clean');
  assertEq(snap.uncommitted_count, 2, '2 uncommitted');
  assertEq(snap.ahead, 2, 'ahead');
  assertEq(snap.behind, 1, 'behind');
  assertEq(snap.last_commit_sha, 'sha1', 'sha');
  assertEq(snap.last_commit_message, 'msg', 'msg');
  assertEq(snap.changed_files.length, 2, '2 changed');
  assertEq(snap.changed_files[0], { status: 'M', file: 'a.js' }, 'first changed');
  assertEq(snap.changed_files[1], { status: '??', file: 'b.js' }, 'second changed');
  assert(typeof snap.snapshot_at === 'string', 'snapshot_at set');
}

// Clean snapshot
resetState();
responders = [
  { match: /rev-parse --abbrev-ref HEAD/, respond: () => 'main' },
  { match: /status --porcelain/, respond: () => '' },
  { match: /rev-list/, respond: () => '0\t0' },
  { match: /log -1/, respond: () => 'abc|hello|2026-04-11' },
];
{
  const snap = repoService.getSnapshot('omai');
  assertEq(snap.is_clean, true, 'clean');
  assertEq(snap.uncommitted_count, 0, '0 uncommitted');
  assertEq(snap.changed_files, [], 'no changes');
}

// ============================================================================
// fetchOrigin
// ============================================================================
console.log('\n── fetchOrigin ───────────────────────────────────────────');

resetState();
repoService.fetchOrigin('omai');
assert(/git fetch origin\b/.test(execLog[0].cmd), 'fetch origin no branch');
assertEq(execLog[0].timeout, 30000, 'FETCH_TIMEOUT 30s');

resetState();
repoService.fetchOrigin('omai', 'main');
assert(/git fetch origin main/.test(execLog[0].cmd), 'fetch origin main');

// ============================================================================
// branchExistsLocal / branchExistsRemote
// ============================================================================
console.log('\n── branchExists ──────────────────────────────────────────');

resetState();
responders = [{ match: /rev-parse --verify feature\/x$/, respond: () => 'sha1' }];
quiet();
assertEq(repoService.branchExistsLocal('omai', 'feature/x'), true, 'local exists');
loud();

resetState();
responders = [{
  match: /rev-parse --verify/,
  respond: () => new Error('not found'),
}];
quiet();
assertEq(repoService.branchExistsLocal('omai', 'feature/x'), false, 'local missing');
loud();

resetState();
responders = [{ match: /rev-parse --verify origin\/feature\/y/, respond: () => 'sha2' }];
quiet();
assertEq(repoService.branchExistsRemote('omai', 'feature/y'), true, 'remote exists');
loud();

resetState();
responders = [{ match: /rev-parse --verify/, respond: () => new Error('missing') }];
quiet();
assertEq(repoService.branchExistsRemote('omai', 'feature/y'), false, 'remote missing');
loud();

// ============================================================================
// createBranch — clean tree
// ============================================================================
console.log('\n── createBranch: clean tree ──────────────────────────────');

resetState();
responders = [{ match: /status --porcelain/, respond: () => '' }];
{
  const r = repoService.createBranch('omai', 'chore/x');
  assertEq(r.branchName, 'chore/x', 'branch name returned');
  assertEq(r.stashed, false, 'did not stash');
  // Expected calls: fetch, status, checkout, push
  assert(/git fetch origin main/.test(execLog[0].cmd), '1. fetch');
  assert(/status --porcelain/.test(execLog[1].cmd), '2. status');
  assert(/git checkout -b chore\/x origin\/main/.test(execLog[2].cmd), '3. checkout -b');
  assert(/git push -u origin chore\/x/.test(execLog[3].cmd), '4. push -u');
  assertEq(execLog[3].timeout, 30000, 'push uses FETCH_TIMEOUT');
}

// createBranch — dirty tree → stash/pop
resetState();
responders = [{ match: /status --porcelain/, respond: () => ' M a.js' }];
{
  const r = repoService.createBranch('omai', 'chore/y');
  assertEq(r.stashed, true, 'did stash');
  const cmds = execLog.map(e => e.cmd);
  assert(cmds.some(c => /git stash push.*auto-stash/.test(c)), 'stash push called');
  assert(cmds.some(c => /git checkout -b chore\/y origin\/main/.test(c)), 'checkout -b');
  assert(cmds.some(c => /git push -u origin chore\/y/.test(c)), 'push -u');
  assert(cmds.some(c => /git stash pop/.test(c)), 'stash pop called');
}

// createBranch — dirty tree, checkout fails → stash popped, error rethrown
resetState();
responders = [
  { match: /status --porcelain/, respond: () => ' M a.js' },
  { match: /checkout -b/, respond: () => new Error('checkout failed') },
];
quiet();
{
  let caught: Error | null = null;
  try { repoService.createBranch('omai', 'chore/z'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'error rethrown');
  assert(caught !== null && /checkout failed/.test(caught.message), 'error propagated');
  const cmds = execLog.map(e => e.cmd);
  assert(cmds.some(c => /git stash pop/.test(c)), 'stash popped on failure');
}

// ============================================================================
// checkoutBranch
// ============================================================================
console.log('\n── checkoutBranch ────────────────────────────────────────');

// Local exists
resetState();
responders = [
  { match: /rev-parse --verify existing$/, respond: () => 'sha' },
  { match: /checkout existing/, respond: () => '' },
];
quiet();
{
  const r = repoService.checkoutBranch('omai', 'existing');
  loud();
  assertEq(r, 'checked_out_local', 'local result');
  const cmds = execLog.map(e => e.cmd);
  assert(cmds.some(c => /git checkout existing/.test(c)), 'checkout cmd');
}

// Local missing → remote path
resetState();
responders = [
  { match: /rev-parse --verify newbranch$/, respond: () => new Error('missing') },
];
quiet();
{
  const r = repoService.checkoutBranch('omai', 'newbranch');
  loud();
  assertEq(r, 'checked_out_remote', 'remote result');
  const cmds = execLog.map(e => e.cmd);
  assert(cmds.some(c => /git fetch origin\b/.test(c)), 'fetch called');
  assert(cmds.some(c => /git checkout -b newbranch origin\/newbranch/.test(c)), 'checkout from remote');
}

// ============================================================================
// commitAll
// ============================================================================
console.log('\n── commitAll ─────────────────────────────────────────────');

// Nothing to commit
resetState();
responders = [{ match: /status --porcelain/, respond: () => '' }];
{
  const r = repoService.commitAll('omai', 'empty');
  assertEq(r.committed, false, 'nothing to commit');
  assert(/Nothing to commit/.test(r.message), 'message');
}

// Commits successfully
resetState();
let statusCallNum = 0;
responders = [
  {
    match: /status --porcelain/,
    respond: () => {
      statusCallNum++;
      // First call from isClean() → dirty (has changes)
      return statusCallNum === 1 ? ' M a.js' : '';
    },
  },
  { match: /log -1/, respond: () => 'deadbeef|feat: thing|2026-04-11T00:00:00Z' },
];
{
  const r = repoService.commitAll('omai', 'feat: add thing');
  assertEq(r.committed, true, 'committed');
  assertEq(r.sha, 'deadbeef', 'sha');
  assertEq(r.message, 'feat: thing', 'message from log');
  const cmds = execLog.map(e => e.cmd);
  assert(cmds.some(c => /git add -A/.test(c)), 'add -A called');
  assert(cmds.some(c => /git commit -m "feat: add thing"/.test(c)), 'commit with message');
}

// Message with double-quotes escaped
resetState();
statusCallNum = 0;
responders = [
  {
    match: /status --porcelain/,
    respond: () => (++statusCallNum === 1 ? ' M a.js' : ''),
  },
  { match: /log -1/, respond: () => 'sha|m|d' },
];
{
  repoService.commitAll('omai', 'fix "bug"');
  const commitCmd = execLog.find(e => /git commit/.test(e.cmd))!.cmd;
  assert(commitCmd.includes('\\"bug\\"'), 'double-quotes escaped');
}

// ============================================================================
// pushBranch
// ============================================================================
console.log('\n── pushBranch ────────────────────────────────────────────');

// Explicit branch
resetState();
{
  const r = repoService.pushBranch('omai', 'my-branch');
  assertEq(r, { pushed: true, branch: 'my-branch' }, 'result');
  assert(/git push origin my-branch/.test(execLog[0].cmd), 'push cmd');
  assertEq(execLog[0].timeout, 30000, 'FETCH_TIMEOUT');
}

// Default → current branch
resetState();
responders = [{ match: /rev-parse --abbrev-ref HEAD/, respond: () => 'current' }];
{
  const r = repoService.pushBranch('omai');
  assertEq(r.branch, 'current', 'uses current branch');
  const cmds = execLog.map(e => e.cmd);
  assert(cmds.some(c => /git push origin current/.test(c)), 'push current');
}

// ============================================================================
// mergeToMain
// ============================================================================
console.log('\n── mergeToMain ───────────────────────────────────────────');

// Happy path
resetState();
let statusCall = 0;
responders = [
  { match: /status --porcelain/, respond: () => '' },
  { match: /rev-parse HEAD$/, respond: () => 'mergedsha' },
];
{
  const r = repoService.mergeToMain('omai', 'feature/done');
  assertEq(r.merged, true, 'merged');
  assertEq(r.branch, 'feature/done', 'branch');
  assertEq(r.merged_to, 'main', 'target');
  assertEq(r.merge_type, 'fast-forward', 'type');
  assertEq(r.commit, 'mergedsha', 'commit sha');
  assertEq(r.branch_deleted, true, 'branch deleted');
  const cmds = execLog.map(e => e.cmd);
  assert(cmds.some(c => /git push origin feature\/done/.test(c)), 'push branch first');
  assert(cmds.some(c => /git checkout main/.test(c)), 'checkout main');
  assert(cmds.some(c => /git pull origin main/.test(c)), 'pull main');
  assert(cmds.some(c => /git merge --ff-only feature\/done/.test(c)), 'ff-only merge');
  assert(cmds.some(c => /git push origin main/.test(c)), 'push main');
  assert(cmds.some(c => /git branch -d feature\/done/.test(c)), 'delete local branch');
  assert(cmds.some(c => /git push origin --delete feature\/done/.test(c)), 'delete remote branch');
}

// Dirty tree throws
resetState();
responders = [{ match: /status --porcelain/, respond: () => ' M a.js' }];
{
  let caught: Error | null = null;
  try { repoService.mergeToMain('omai', 'f/x'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'dirty tree throws');
  assert(caught !== null && /dirty/.test(caught.message), 'error mentions dirty');
}

// FF merge fails → FF_FAILED error, restores branch
resetState();
responders = [
  { match: /status --porcelain/, respond: () => '' },
  { match: /merge --ff-only/, respond: () => new Error('not ff') },
];
quiet();
{
  let caught: any = null;
  try { repoService.mergeToMain('omai', 'f/diverged'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'FF failure throws');
  assertEq(caught.code, 'FF_FAILED', 'error code FF_FAILED');
  assertEq(caught.branch, 'f/diverged', 'branch preserved on error');
  const cmds = execLog.map(e => e.cmd);
  assert(cmds.some(c => /git checkout f\/diverged/.test(c)), 'checkout back to branch');
}

// Branch delete failures are swallowed
resetState();
responders = [
  { match: /status --porcelain/, respond: () => '' },
  { match: /rev-parse HEAD$/, respond: () => 'sha' },
  { match: /branch -d/, respond: () => new Error('already gone') },
  { match: /push origin --delete/, respond: () => new Error('already gone') },
];
quiet();
{
  const r = repoService.mergeToMain('omai', 'f/ok');
  loud();
  assertEq(r.merged, true, 'merges despite delete failures');
  assertEq(r.branch_deleted, true, 'branch_deleted flag always true');
}

// ============================================================================
// saveSnapshot
// ============================================================================
console.log('\n── saveSnapshot ──────────────────────────────────────────');

resetState();
resetPool();
responders = [
  { match: /rev-parse --abbrev-ref HEAD/, respond: () => 'main' },
  { match: /status --porcelain/, respond: () => 'M  x.js' },
  { match: /rev-list/, respond: () => '1\t0' },
  { match: /log -1/, respond: () => 'sha|msg|2026-04-11' },
];
{
  const snap = await repoService.saveSnapshot(fakePool, 'omai');
  assertEq(snap.repo_target, 'omai', 'returned snapshot');
  assertEq(poolLog.length, 1, '1 query');
  assert(/INSERT INTO repo_snapshots/.test(poolLog[0].sql), 'INSERT repo_snapshots');
  // Params order: repo_target, current_branch, is_clean (1/0), uncommitted_count, ahead, behind, sha, msg, date, json
  const p = poolLog[0].params;
  assertEq(p[0], 'omai', 'p[0] repo_target');
  assertEq(p[1], 'main', 'p[1] branch');
  assertEq(p[2], 0, 'p[2] is_clean 0 (dirty)');
  assertEq(p[3], 1, 'p[3] uncommitted_count');
  assertEq(p[4], 1, 'p[4] ahead');
  assertEq(p[5], 0, 'p[5] behind');
  assertEq(p[6], 'sha', 'p[6] sha');
  assertEq(p[7], 'msg', 'p[7] message');
  assertEq(p[8], '2026-04-11', 'p[8] date');
  // p[9] is JSON string of changed_files
  const changed = JSON.parse(p[9]);
  assertEq(changed.length, 1, 'p[9] 1 changed file');
  assertEq(changed[0].file, 'x.js', 'p[9] file');
}

// Clean snapshot → is_clean = 1
resetState();
resetPool();
responders = [
  { match: /rev-parse --abbrev-ref HEAD/, respond: () => 'main' },
  { match: /status --porcelain/, respond: () => '' },
  { match: /rev-list/, respond: () => '0\t0' },
  { match: /log -1/, respond: () => 'sha|msg|d' },
];
{
  await repoService.saveSnapshot(fakePool, 'omai');
  assertEq(poolLog[0].params[2], 1, 'is_clean 1 (clean)');
}

// ============================================================================
// getLatestSnapshot
// ============================================================================
console.log('\n── getLatestSnapshot ─────────────────────────────────────');

resetPool();
poolSelectRows = [{ id: 5, repo_target: 'omai', current_branch: 'main' }];
{
  const r = await repoService.getLatestSnapshot(fakePool, 'omai');
  assertEq(r.id, 5, 'returns first row');
  assertEq(poolLog[0].params[0], 'omai', 'repo_target param');
  assert(/ORDER BY snapshot_at DESC/.test(poolLog[0].sql), 'orders by timestamp');
  assert(/LIMIT 1/.test(poolLog[0].sql), 'limit 1');
}

// Empty result → null
resetPool();
poolSelectRows = [];
{
  const r = await repoService.getLatestSnapshot(fakePool, 'omai');
  assertEq(r, null, 'empty → null');
}

// ============================================================================
// recordEvent
// ============================================================================
console.log('\n── recordEvent ───────────────────────────────────────────');

resetPool();
await repoService.recordEvent(fakePool, 42, 'started', {
  from_status: 'backlog',
  to_status: 'in_progress',
  actor: 'claude',
  message: 'starting work',
  metadata: { foo: 'bar' },
});
{
  assert(/INSERT INTO om_daily_item_events/.test(poolLog[0].sql), 'events INSERT');
  const p = poolLog[0].params;
  assertEq(p[0], 42, 'item_id');
  assertEq(p[1], 'started', 'event_type');
  assertEq(p[2], 'backlog', 'from_status');
  assertEq(p[3], 'in_progress', 'to_status');
  assertEq(p[4], 'claude', 'actor');
  assertEq(p[5], 'starting work', 'message');
  assertEq(p[6], JSON.stringify({ foo: 'bar' }), 'metadata JSON');
}

// Defaults when fields omitted
resetPool();
await repoService.recordEvent(fakePool, 99, 'note');
{
  const p = poolLog[0].params;
  assertEq(p[2], null, 'from_status null');
  assertEq(p[3], null, 'to_status null');
  assertEq(p[4], 'system', 'actor default system');
  assertEq(p[5], null, 'message null');
  assertEq(p[6], null, 'metadata null when absent');
}

// ============================================================================
// createArtifact
// ============================================================================
console.log('\n── createArtifact ────────────────────────────────────────');

resetPool();
poolInsertId = 777;
{
  const id = await repoService.createArtifact(
    fakePool,
    42,
    'diff',
    'my diff',
    { hunks: 3 },
    'claude'
  );
  assertEq(id, 777, 'returns insertId');
  assert(/INSERT INTO om_daily_artifacts/.test(poolLog[0].sql), 'artifacts INSERT');
  const p = poolLog[0].params;
  assertEq(p[0], 42, 'item_id');
  assertEq(p[1], 'diff', 'artifact_type');
  assertEq(p[2], 'my diff', 'title');
  assertEq(p[3], JSON.stringify({ hunks: 3 }), 'payload JSON');
  assertEq(p[4], 'claude', 'created_by');
}

// Default created_by
resetPool();
{
  await repoService.createArtifact(fakePool, 1, 'log', 'x', {});
  assertEq(poolLog[0].params[4], 'system', 'created_by default system');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
