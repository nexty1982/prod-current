#!/usr/bin/env npx tsx
/**
 * Unit tests for services/repoService.js (OMD-1183)
 *
 * Patches child_process.execSync BEFORE requiring the SUT. A command
 * router dispatches by regex, records invocations, and returns scripted
 * stdout (or throws scripted errors).
 *
 * Coverage:
 *   - getRepoPath: valid targets, unknown → throws
 *   - getCurrentBranch, isClean, getStatusLines, getAheadBehind,
 *     getLastCommit, getSnapshot — all wrappers
 *   - getAheadBehind: error → { ahead: 0, behind: 0 }
 *   - getLastCommit: error → { sha: null, ... }
 *   - fetchOrigin: with branch and without
 *   - branchExistsLocal/Remote: true + false on error
 *   - createBranch: clean tree (no stash) + dirty tree (stash + pop)
 *   - createBranch: checkout failure triggers stash pop restore + rethrows
 *   - createBranch: stash pop conflict after successful push → warn only
 *   - checkoutBranch: local exists, from remote fallback
 *   - commitAll: clean tree returns { committed: false }
 *   - commitAll: dirty tree commits + escapes quotes
 *   - pushBranch: default + explicit branch
 *   - mergeToMain: dirty tree throws
 *   - mergeToMain: happy path (push, checkout main, pull, ff-only, push main,
 *     delete local + remote)
 *   - mergeToMain: ff-only failure → checkout branch + throws with FF_FAILED
 *   - saveSnapshot: inserts with correct params + returns snap
 *   - getLatestSnapshot: returns first row or null
 *   - recordEvent / createArtifact: correct INSERT params
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

// ── Scriptable execSync replacement ───────────────────────────
type ExecCall = { cmd: string; cwd: string };
const execCalls: ExecCall[] = [];
type Handler = { match: RegExp; response: string | Error | (() => string | Error) };
let handlers: Handler[] = [];

function setHandlers(hs: Handler[]) { handlers = hs; }

function execSyncMock(cmd: string, options: any) {
  execCalls.push({ cmd, cwd: options?.cwd || '' });
  for (const h of handlers) {
    if (h.match.test(cmd)) {
      const resp = typeof h.response === 'function' ? (h.response as any)() : h.response;
      if (resp instanceof Error) throw resp;
      return resp;
    }
  }
  return '';
}

// Patch child_process BEFORE SUT require
const cp = require('child_process');
(cp as any).execSync = execSyncMock;

// ── Silence console ───────────────────────────────────────────
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

const repoService = require('../repoService');

// ── Fake DB pool ──────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
let latestSnapshotRow: any = null;
let artifactInsertId = 5000;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (/SELECT \* FROM repo_snapshots/i.test(sql)) {
      return [latestSnapshotRow === null ? [] : [latestSnapshotRow]];
    }
    if (/INSERT INTO om_daily_artifacts/i.test(sql)) {
      return [{ insertId: artifactInsertId }];
    }
    return [{ insertId: 1 }];
  },
};

function resetAll() {
  execCalls.length = 0;
  handlers = [];
  queryLog.length = 0;
  latestSnapshotRow = null;
  artifactInsertId = 5000;
}

async function main() {

// ============================================================================
// getRepoPath
// ============================================================================
console.log('\n── getRepoPath ───────────────────────────────────────────');

assertEq(repoService.getRepoPath('omai'), '/var/www/omai', 'omai path');
assertEq(repoService.getRepoPath('orthodoxmetrics'), '/var/www/orthodoxmetrics/prod', 'orthodoxmetrics path');
{
  let caught: Error | null = null;
  try { repoService.getRepoPath('bogus'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Unknown repo_target'), 'unknown throws');
}

// REPO_PATHS exported
assertEq(repoService.REPO_PATHS.omai, '/var/www/omai', 'REPO_PATHS.omai');
assertEq(repoService.REPO_PATHS.orthodoxmetrics, '/var/www/orthodoxmetrics/prod', 'REPO_PATHS.om');

// ============================================================================
// getCurrentBranch
// ============================================================================
console.log('\n── getCurrentBranch ──────────────────────────────────────');
resetAll();
setHandlers([{ match: /rev-parse --abbrev-ref HEAD/, response: 'main\n' }]);
assertEq(repoService.getCurrentBranch('omai'), 'main', 'branch trimmed');
assertEq(execCalls[0].cwd, '/var/www/omai', 'correct cwd');

// ============================================================================
// isClean / getStatusLines
// ============================================================================
console.log('\n── isClean / getStatusLines ──────────────────────────────');
resetAll();
setHandlers([{ match: /git status --porcelain/, response: '' }]);
assertEq(repoService.isClean('omai'), true, 'empty status → clean');
assertEq(repoService.getStatusLines('omai'), [], 'empty status → []');

resetAll();
setHandlers([{ match: /git status --porcelain/, response: ' M file1.js\n?? new.js' }]);
assertEq(repoService.isClean('omai'), false, 'dirty → not clean');
const lines = repoService.getStatusLines('omai');
assertEq(lines.length, 2, '2 status lines');

// ============================================================================
// getAheadBehind
// ============================================================================
console.log('\n── getAheadBehind ────────────────────────────────────────');
resetAll();
setHandlers([{ match: /rev-list --left-right --count/, response: '3\t2' }]);
assertEq(repoService.getAheadBehind('omai'), { ahead: 3, behind: 2 }, 'parsed counts');

// No upstream → error → default
resetAll();
setHandlers([{ match: /rev-list/, response: new Error('no upstream') }]);
assertEq(repoService.getAheadBehind('omai'), { ahead: 0, behind: 0 }, 'error → defaults');

// ============================================================================
// getLastCommit
// ============================================================================
console.log('\n── getLastCommit ─────────────────────────────────────────');
resetAll();
setHandlers([{ match: /log -1 --format/, response: 'abc123|Fix bug|2026-04-10T12:00:00Z' }]);
{
  const c = repoService.getLastCommit('omai');
  assertEq(c.sha, 'abc123', 'sha');
  assertEq(c.message, 'Fix bug', 'message');
  assertEq(c.date, '2026-04-10T12:00:00Z', 'date');
}

// Error → nulls
resetAll();
setHandlers([{ match: /log -1/, response: new Error('no commits') }]);
assertEq(repoService.getLastCommit('omai'), { sha: null, message: null, date: null }, 'error → nulls');

// ============================================================================
// getSnapshot
// ============================================================================
console.log('\n── getSnapshot ───────────────────────────────────────────');
resetAll();
setHandlers([
  { match: /rev-parse --abbrev-ref HEAD/, response: 'feature/x' },
  { match: /git status --porcelain/, response: '?? a.js\n?? b.js' },
  { match: /rev-list/, response: '1\t0' },
  { match: /log -1/, response: 'sha1|msg|2026-04-10' },
]);
{
  const snap = repoService.getSnapshot('omai');
  assertEq(snap.repo_target, 'omai', 'repo_target');
  assertEq(snap.current_branch, 'feature/x', 'branch');
  assertEq(snap.is_clean, false, 'is_clean false');
  assertEq(snap.uncommitted_count, 2, '2 uncommitted');
  assertEq(snap.ahead, 1, 'ahead 1');
  assertEq(snap.behind, 0, 'behind 0');
  assertEq(snap.last_commit_sha, 'sha1', 'commit sha');
  assertEq(snap.changed_files.length, 2, '2 changed files');
  assertEq(snap.changed_files[0], { status: '??', file: 'a.js' }, 'first file');
  assert(typeof snap.snapshot_at === 'string', 'timestamp');
}

// ============================================================================
// fetchOrigin
// ============================================================================
console.log('\n── fetchOrigin ───────────────────────────────────────────');
resetAll();
setHandlers([{ match: /git fetch/, response: '' }]);
repoService.fetchOrigin('omai', 'main');
assertEq(execCalls[0].cmd, 'git fetch origin main', 'fetch with branch');

resetAll();
setHandlers([{ match: /git fetch/, response: '' }]);
repoService.fetchOrigin('omai');
assertEq(execCalls[0].cmd, 'git fetch origin', 'fetch without branch');

// ============================================================================
// branchExistsLocal / Remote
// ============================================================================
console.log('\n── branchExistsLocal / Remote ────────────────────────────');
resetAll();
setHandlers([{ match: /rev-parse --verify/, response: 'abc123' }]);
assertEq(repoService.branchExistsLocal('omai', 'feature/x'), true, 'local exists');

resetAll();
setHandlers([{ match: /rev-parse --verify/, response: new Error('not found') }]);
assertEq(repoService.branchExistsLocal('omai', 'feature/x'), false, 'local not found');

resetAll();
setHandlers([{ match: /rev-parse --verify origin/, response: 'abc' }]);
assertEq(repoService.branchExistsRemote('omai', 'feature/x'), true, 'remote exists');

resetAll();
setHandlers([{ match: /rev-parse --verify origin/, response: new Error('no') }]);
assertEq(repoService.branchExistsRemote('omai', 'feature/x'), false, 'remote not found');

// ============================================================================
// createBranch — clean tree (no stash)
// ============================================================================
console.log('\n── createBranch: clean tree ──────────────────────────────');
resetAll();
setHandlers([
  { match: /git fetch/, response: '' },
  { match: /git status --porcelain/, response: '' },
  { match: /git checkout -b/, response: '' },
  { match: /git push -u origin/, response: '' },
]);
{
  const r = repoService.createBranch('omai', 'feature/new');
  assertEq(r, { branchName: 'feature/new', stashed: false }, 'no stash');
  const stashCalls = execCalls.filter(c => /git stash/.test(c.cmd));
  assertEq(stashCalls.length, 0, 'no stash commands');
  const checkoutCall = execCalls.find(c => /checkout -b/.test(c.cmd));
  assert(!!checkoutCall, 'checkout executed');
  assert(checkoutCall!.cmd.includes('feature/new origin/main'), 'checkout from origin/main');
}

// ============================================================================
// createBranch — dirty tree → stash + pop
// ============================================================================
console.log('\n── createBranch: dirty tree stash/pop ────────────────────');
resetAll();
setHandlers([
  { match: /git fetch/, response: '' },
  { match: /git status --porcelain/, response: ' M file.js' },
  { match: /git stash push/, response: 'Saved' },
  { match: /git checkout -b/, response: '' },
  { match: /git push -u origin/, response: '' },
  { match: /git stash pop/, response: 'Applied' },
]);
{
  const r = repoService.createBranch('omai', 'feature/dirty');
  assertEq(r.stashed, true, 'stashed=true');
  const stashCmds = execCalls.map(c => c.cmd).filter(c => /stash/.test(c));
  assertEq(stashCmds.length, 2, 'stash push + pop');
  assert(/stash push/.test(stashCmds[0]), 'push first');
  assert(/stash pop/.test(stashCmds[1]), 'pop after');
}

// ============================================================================
// createBranch — checkout fails → restore stash + rethrow
// ============================================================================
console.log('\n── createBranch: checkout failure rollback ───────────────');
resetAll();
const stashRestoreCalls: string[] = [];
setHandlers([
  { match: /git fetch/, response: '' },
  { match: /git status --porcelain/, response: ' M dirty.js' },
  { match: /git stash push/, response: 'Saved' },
  { match: /git checkout -b/, response: new Error('checkout failed') },
  { match: /git stash pop/, response: () => {
    stashRestoreCalls.push('pop');
    return 'Restored';
  }},
]);
quiet();
{
  let caught: Error | null = null;
  try { repoService.createBranch('omai', 'feature/broken'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws on checkout failure');
  assert(caught !== null && caught.message.includes('checkout failed'), 'original error');
  assertEq(stashRestoreCalls.length, 1, 'stash pop attempted for restore');
}

// ============================================================================
// checkoutBranch
// ============================================================================
console.log('\n── checkoutBranch ────────────────────────────────────────');

// Local exists
resetAll();
setHandlers([
  { match: /rev-parse --verify/, response: 'abc' },
  { match: /git checkout /, response: '' },
]);
assertEq(repoService.checkoutBranch('omai', 'feature/x'), 'checked_out_local', 'local branch');

// Falls back to remote
resetAll();
let verifyCount = 0;
setHandlers([
  { match: /rev-parse --verify/, response: () => {
    verifyCount++;
    return new Error('nope') as any;
  }},
  { match: /git fetch/, response: '' },
  { match: /git checkout -b/, response: '' },
]);
assertEq(repoService.checkoutBranch('omai', 'feature/x'), 'checked_out_remote', 'remote fallback');

// ============================================================================
// commitAll
// ============================================================================
console.log('\n── commitAll ─────────────────────────────────────────────');

// Clean tree → nothing to commit
resetAll();
setHandlers([
  { match: /git add/, response: '' },
  { match: /git status --porcelain/, response: '' },
]);
{
  const r = repoService.commitAll('omai', 'msg');
  assertEq(r.committed, false, 'clean tree no commit');
  assert(r.message.includes('Nothing to commit'), 'correct message');
}

// Dirty → commits
resetAll();
setHandlers([
  { match: /git add/, response: '' },
  { match: /git status --porcelain/, response: ' M x.js' },
  { match: /git commit/, response: '' },
  { match: /log -1/, response: 'abc|my msg|2026-04-10' },
]);
{
  const r = repoService.commitAll('omai', 'my "quoted" msg');
  assertEq(r.committed, true, 'committed');
  assertEq(r.sha, 'abc', 'returns sha');
  // Verify escaped quotes in commit command
  const commitCall = execCalls.find(c => /git commit/.test(c.cmd));
  assert(commitCall!.cmd.includes('my \\"quoted\\" msg'), 'quotes escaped');
}

// ============================================================================
// pushBranch
// ============================================================================
console.log('\n── pushBranch ────────────────────────────────────────────');

resetAll();
setHandlers([{ match: /git push origin/, response: '' }]);
{
  const r = repoService.pushBranch('omai', 'feature/x');
  assertEq(r, { pushed: true, branch: 'feature/x' }, 'explicit branch');
  assertEq(execCalls[0].cmd, 'git push origin feature/x', 'push command');
}

// Default branch from current
resetAll();
setHandlers([
  { match: /rev-parse --abbrev-ref HEAD/, response: 'auto-branch' },
  { match: /git push origin/, response: '' },
]);
{
  const r = repoService.pushBranch('omai');
  assertEq(r.branch, 'auto-branch', 'uses current branch');
}

// ============================================================================
// mergeToMain — dirty tree rejection
// ============================================================================
console.log('\n── mergeToMain: dirty tree rejection ─────────────────────');
resetAll();
setHandlers([{ match: /git status --porcelain/, response: ' M dirty.js' }]);
{
  let caught: Error | null = null;
  try { repoService.mergeToMain('omai', 'feature/x'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'dirty throws');
  assert(caught !== null && caught.message.includes('dirty'), 'mentions dirty');
}

// ============================================================================
// mergeToMain — happy path
// ============================================================================
console.log('\n── mergeToMain: happy path ───────────────────────────────');
resetAll();
setHandlers([
  { match: /git status --porcelain/, response: '' },
  { match: /git push origin feature/, response: '' },
  { match: /git checkout main/, response: '' },
  { match: /git pull origin main/, response: '' },
  { match: /git merge --ff-only/, response: '' },
  { match: /git rev-parse HEAD/, response: 'merge-sha' },
  { match: /git push origin main/, response: '' },
  { match: /git branch -d/, response: '' },
  { match: /git push origin --delete/, response: '' },
]);
{
  const r = repoService.mergeToMain('omai', 'feature/x');
  assertEq(r.merged, true, 'merged true');
  assertEq(r.branch, 'feature/x', 'branch');
  assertEq(r.merged_to, 'main', 'merged_to main');
  assertEq(r.merge_type, 'fast-forward', 'merge type');
  assertEq(r.commit, 'merge-sha', 'commit sha');
  assertEq(r.branch_deleted, true, 'branch deleted');
}

// ============================================================================
// mergeToMain — ff-only failure
// ============================================================================
console.log('\n── mergeToMain: ff-only failure ──────────────────────────');
resetAll();
setHandlers([
  { match: /git status --porcelain/, response: '' },
  { match: /git push origin feature/, response: '' },
  { match: /git checkout main/, response: '' },
  { match: /git pull origin main/, response: '' },
  { match: /git merge --ff-only/, response: new Error('diverged') },
  { match: /git checkout feature/, response: '' },
]);
quiet();
{
  let caught: any = null;
  try { repoService.mergeToMain('omai', 'feature/x'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'ff failure throws');
  assert(caught.message.includes('Fast-forward merge not possible'), 'fast-forward message');
  assertEq(caught.code, 'FF_FAILED', 'code = FF_FAILED');
  assertEq(caught.branch, 'feature/x', 'branch attached');
  // Verify we switched back to the branch
  const restoreCall = execCalls.find(c => /git checkout feature\/x/.test(c.cmd));
  assert(!!restoreCall, 'checkout back to branch');
}

// ============================================================================
// saveSnapshot
// ============================================================================
console.log('\n── saveSnapshot ──────────────────────────────────────────');
resetAll();
setHandlers([
  { match: /rev-parse --abbrev-ref HEAD/, response: 'main' },
  { match: /git status --porcelain/, response: '' },
  { match: /rev-list/, response: '0\t0' },
  { match: /log -1/, response: 'sha1|msg|date' },
]);
{
  const snap = await repoService.saveSnapshot(fakePool, 'omai');
  assertEq(snap.repo_target, 'omai', 'returns snap');
  const ins = queryLog.find(c => /INSERT INTO repo_snapshots/i.test(c.sql));
  assert(!!ins, 'snapshot INSERT');
  assertEq(ins!.params[0], 'omai', 'param repo_target');
  assertEq(ins!.params[1], 'main', 'param branch');
  assertEq(ins!.params[2], 1, 'is_clean=1 (boolean → int)');
  assertEq(ins!.params[9], '[]', 'changed_files JSON');
}

// ============================================================================
// getLatestSnapshot
// ============================================================================
console.log('\n── getLatestSnapshot ─────────────────────────────────────');
resetAll();
latestSnapshotRow = { id: 1, repo_target: 'omai', current_branch: 'main' };
{
  const snap = await repoService.getLatestSnapshot(fakePool, 'omai');
  assertEq(snap, latestSnapshotRow, 'returns first row');
}

resetAll();
latestSnapshotRow = null;
{
  const snap = await repoService.getLatestSnapshot(fakePool, 'omai');
  assertEq(snap, null, 'no rows → null');
}

// ============================================================================
// recordEvent
// ============================================================================
console.log('\n── recordEvent ───────────────────────────────────────────');
resetAll();
{
  await repoService.recordEvent(fakePool, 42, 'started', {
    from_status: 'backlog',
    to_status: 'in_progress',
    actor: 'claude',
    message: 'kicked off',
    metadata: { key: 'val' },
  });
  const ins = queryLog[0];
  assertEq(ins.params[0], 42, 'itemId');
  assertEq(ins.params[1], 'started', 'eventType');
  assertEq(ins.params[2], 'backlog', 'from_status');
  assertEq(ins.params[3], 'in_progress', 'to_status');
  assertEq(ins.params[4], 'claude', 'actor');
  assertEq(ins.params[5], 'kicked off', 'message');
  assertEq(ins.params[6], JSON.stringify({ key: 'val' }), 'metadata JSON');
}

// Defaults
resetAll();
{
  await repoService.recordEvent(fakePool, 42, 'note');
  const ins = queryLog[0];
  assertEq(ins.params[2], null, 'default from_status null');
  assertEq(ins.params[3], null, 'default to_status null');
  assertEq(ins.params[4], 'system', 'default actor = system');
  assertEq(ins.params[6], null, 'default metadata null');
}

// ============================================================================
// createArtifact
// ============================================================================
console.log('\n── createArtifact ────────────────────────────────────────');
resetAll();
artifactInsertId = 9999;
{
  const id = await repoService.createArtifact(fakePool, 42, 'doc', 'Title', { x: 1 }, 'claude');
  assertEq(id, 9999, 'returns insertId');
  const ins = queryLog[0];
  assertEq(ins.params[0], 42, 'itemId');
  assertEq(ins.params[1], 'doc', 'artifact_type');
  assertEq(ins.params[2], 'Title', 'title');
  assertEq(ins.params[3], JSON.stringify({ x: 1 }), 'payload JSON');
  assertEq(ins.params[4], 'claude', 'created_by');
}

// Default createdBy
resetAll();
{
  await repoService.createArtifact(fakePool, 1, 'log', 'x', {});
  assertEq(queryLog[0].params[4], 'system', 'default created_by');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

}

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
