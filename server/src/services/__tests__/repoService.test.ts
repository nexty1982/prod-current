#!/usr/bin/env npx tsx
/**
 * Unit tests for services/repoService.js (OMD-1161)
 *
 * Git operations layer using execSync. Stubs child_process.execSync
 * with a command-pattern dispatcher that records invocations and
 * returns scripted stdout or throws scripted errors.
 *
 * Coverage:
 *   - getRepoPath: valid targets + unknown throws
 *   - git helper: invokes execSync with cwd/timeout/trim
 *   - getCurrentBranch, isClean, getStatusLines
 *   - getAheadBehind: parses, returns zeros on error
 *   - getLastCommit: parses pipe-delimited, returns nulls on error
 *   - getSnapshot: composes all values into single object
 *   - fetchOrigin: with and without branch
 *   - branchExistsLocal / branchExistsRemote: true + catch → false
 *   - createBranch: stash flow, push, pop
 *   - checkoutBranch: local vs remote paths
 *   - commitAll: clean → nothing, dirty → commit + sha
 *   - pushBranch: explicit + current branch
 *   - mergeToMain: dirty throws, ff-only success, ff failure restores branch
 *   - saveSnapshot / getLatestSnapshot: uses pool.query
 *   - recordEvent / createArtifact: parameter marshaling
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

// ── Stub child_process ───────────────────────────────────────────────
type ExecCall = { cmd: string; cwd: string; timeout: number };
const execCalls: ExecCall[] = [];

// Scriptable: cmdPattern (regex or string) → response (string or throw)
type Response = string | { throws: true; message?: string };
let responses: Array<{ match: RegExp; response: Response }> = [];

function resetResponses() {
  execCalls.length = 0;
  responses = [];
}

function on(pattern: RegExp | string, response: Response) {
  const match = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  responses.push({ match, response });
}

const realChildProcess = require('child_process');
const fakeChildProcess = {
  ...realChildProcess,
  execSync: (cmd: string, opts: any = {}) => {
    execCalls.push({ cmd, cwd: opts.cwd, timeout: opts.timeout });
    // First-match-wins over responses
    for (const { match, response } of responses) {
      if (match.test(cmd)) {
        if (typeof response === 'string') {
          return response;
        }
        throw new Error((response as any).message || 'exec failed');
      }
    }
    // Default: empty string (success, no output)
    return '';
  },
};

// Stub via require.cache
const cpPath = require.resolve('child_process');
require.cache[cpPath] = {
  id: cpPath,
  filename: cpPath,
  loaded: true,
  exports: fakeChildProcess,
} as any;

// ── SUT ──────────────────────────────────────────────────────────────
const repoService = require('../repoService');

// Silence console.warn/error for expected warnings
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.warn = () => {}; console.error = () => {}; }
function loud() { console.warn = origWarn; console.error = origError; }

// ── Fake pool ────────────────────────────────────────────────────────
type PoolCall = { sql: string; params: any[] };
const poolCalls: PoolCall[] = [];
let poolResponse: any[] = [];
let poolInsertId = 42;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    poolCalls.push({ sql, params });
    if (/^SELECT/i.test(sql)) {
      return [poolResponse];
    }
    return [{ insertId: poolInsertId, affectedRows: 1 }];
  },
};

function resetPool() {
  poolCalls.length = 0;
  poolResponse = [];
}

async function main() {

// ============================================================================
// getRepoPath
// ============================================================================
console.log('\n── getRepoPath ──────────────────────────────────────────');

assertEq(repoService.getRepoPath('omai'), '/var/www/omai', 'omai path');
assertEq(repoService.getRepoPath('orthodoxmetrics'), '/var/www/orthodoxmetrics/prod', 'om path');
{
  let caught: Error | null = null;
  try { repoService.getRepoPath('invalid'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /Unknown repo_target/.test(caught!.message), 'unknown throws');
}

// ============================================================================
// getCurrentBranch / isClean / getStatusLines
// ============================================================================
console.log('\n── getCurrentBranch / isClean / getStatusLines ─────────');

resetResponses();
on(/git rev-parse --abbrev-ref HEAD/, 'main\n');
assertEq(repoService.getCurrentBranch('omai'), 'main', 'current branch trimmed');
assertEq(execCalls[0].cwd, '/var/www/omai', 'cwd set to omai path');
assertEq(execCalls[0].cmd, 'git rev-parse --abbrev-ref HEAD', 'command issued');

resetResponses();
on(/git status --porcelain/, '');
assertEq(repoService.isClean('omai'), true, 'empty porcelain → clean');

resetResponses();
on(/git status --porcelain/, '?? file.txt\n');
assertEq(repoService.isClean('omai'), false, 'non-empty porcelain → dirty');
assertEq(repoService.getStatusLines('omai').length, 1, '1 status line');

resetResponses();
on(/git status --porcelain/, '?? a.txt\nMM b.txt');
assertEq(repoService.getStatusLines('omai'), ['?? a.txt', 'MM b.txt'], 'multi-line status');

// ============================================================================
// getAheadBehind
// ============================================================================
console.log('\n── getAheadBehind ───────────────────────────────────────');

resetResponses();
on(/git rev-list --left-right --count/, '2\t5\n');
assertEq(repoService.getAheadBehind('omai'), { ahead: 2, behind: 5 }, 'parse ahead/behind');

resetResponses();
on(/git rev-list/, { throws: true });
assertEq(repoService.getAheadBehind('omai'), { ahead: 0, behind: 0 }, 'error → zeros');

// ============================================================================
// getLastCommit
// ============================================================================
console.log('\n── getLastCommit ────────────────────────────────────────');

resetResponses();
on(/git log -1 --format/, 'abc123|fix bug|2026-04-10T10:00:00Z\n');
{
  const c = repoService.getLastCommit('omai');
  assertEq(c.sha, 'abc123', 'sha parsed');
  assertEq(c.message, 'fix bug', 'message parsed');
  assertEq(c.date, '2026-04-10T10:00:00Z', 'date parsed');
}

resetResponses();
on(/git log -1/, { throws: true });
{
  const c = repoService.getLastCommit('omai');
  assertEq(c, { sha: null, message: null, date: null }, 'error → nulls');
}

// ============================================================================
// getSnapshot
// ============================================================================
console.log('\n── getSnapshot ──────────────────────────────────────────');

resetResponses();
on(/git rev-parse --abbrev-ref HEAD/, 'main');
on(/git status --porcelain/, 'MM a.txt');
on(/git rev-list/, '0\t0');
on(/git log -1/, 'sha1|msg|2026-04-10T10:00:00Z');
{
  const snap = repoService.getSnapshot('omai');
  assertEq(snap.repo_target, 'omai', 'repo_target');
  assertEq(snap.current_branch, 'main', 'branch');
  assertEq(snap.is_clean, false, 'is_clean false');
  assertEq(snap.uncommitted_count, 1, 'count 1');
  assertEq(snap.ahead, 0, 'ahead 0');
  assertEq(snap.behind, 0, 'behind 0');
  assertEq(snap.last_commit_sha, 'sha1', 'last_commit_sha');
  assertEq(snap.last_commit_message, 'msg', 'last_commit_message');
  assertEq(snap.changed_files.length, 1, '1 changed file');
  assertEq(snap.changed_files[0].status, 'MM', 'status code');
  assertEq(snap.changed_files[0].file, 'a.txt', 'file name');
  assert(typeof snap.snapshot_at === 'string', 'snapshot_at ISO');
}

// ============================================================================
// fetchOrigin
// ============================================================================
console.log('\n── fetchOrigin ──────────────────────────────────────────');

resetResponses();
on(/git fetch origin main/, '');
repoService.fetchOrigin('omai', 'main');
assert(execCalls.some(c => /git fetch origin main/.test(c.cmd)), 'fetch with branch');
assertEq(execCalls[0].timeout, 30000, 'uses FETCH_TIMEOUT');

resetResponses();
on(/git fetch origin/, '');
repoService.fetchOrigin('omai');
assert(execCalls.some(c => /git fetch origin$/.test(c.cmd) || c.cmd === 'git fetch origin'), 'fetch without branch');

// ============================================================================
// branchExistsLocal / Remote
// ============================================================================
console.log('\n── branchExists ─────────────────────────────────────────');

resetResponses();
on(/git rev-parse --verify/, 'abc123');
assertEq(repoService.branchExistsLocal('omai', 'feature/x'), true, 'local exists');

resetResponses();
on(/git rev-parse --verify/, { throws: true });
assertEq(repoService.branchExistsLocal('omai', 'missing'), false, 'local missing');

resetResponses();
on(/git rev-parse --verify origin\//, 'abc123');
assertEq(repoService.branchExistsRemote('omai', 'feature/x'), true, 'remote exists');

resetResponses();
on(/git rev-parse --verify origin\//, { throws: true });
assertEq(repoService.branchExistsRemote('omai', 'missing'), false, 'remote missing');

// ============================================================================
// createBranch
// ============================================================================
console.log('\n── createBranch ─────────────────────────────────────────');

// No dirty tree
resetResponses();
on(/git fetch origin main/, '');
on(/git status --porcelain/, '');
on(/git checkout -b/, '');
on(/git push -u origin/, '');
{
  const result = repoService.createBranch('omai', 'feature/test');
  assertEq(result.branchName, 'feature/test', 'branchName returned');
  assertEq(result.stashed, false, 'no stash when clean');
  assert(execCalls.some(c => /git checkout -b feature\/test origin\/main/.test(c.cmd)), 'checkout -b');
  assert(execCalls.some(c => /git push -u origin feature\/test/.test(c.cmd)), 'push -u');
}

// With dirty tree → stash flow
resetResponses();
on(/git fetch origin main/, '');
on(/git status --porcelain/, ' M a.txt');
on(/git stash push/, 'saved');
on(/git checkout -b/, '');
on(/git push -u origin/, '');
on(/git stash pop/, 'popped');
quiet();
{
  const result = repoService.createBranch('omai', 'feature/dirty');
  loud();
  assertEq(result.stashed, true, 'stashed');
  assert(execCalls.some(c => /git stash push/.test(c.cmd)), 'stash push called');
  assert(execCalls.some(c => /git stash pop/.test(c.cmd)), 'stash pop called');
}

// ============================================================================
// checkoutBranch
// ============================================================================
console.log('\n── checkoutBranch ───────────────────────────────────────');

// Local exists → checkout
resetResponses();
on(/git rev-parse --verify/, 'abc');
on(/git checkout/, '');
{
  const result = repoService.checkoutBranch('omai', 'feature/x');
  assertEq(result, 'checked_out_local', 'local path');
}

// Local missing → fetch + checkout from remote
resetResponses();
let verifyCallCount = 0;
on(/git rev-parse --verify/, { throws: true });
on(/git fetch origin/, '');
on(/git checkout -b/, '');
{
  const result = repoService.checkoutBranch('omai', 'feature/remote');
  assertEq(result, 'checked_out_remote', 'remote path');
  assert(execCalls.some(c => /git fetch origin/.test(c.cmd)), 'fetch called');
  assert(execCalls.some(c => /git checkout -b feature\/remote origin\/feature\/remote/.test(c.cmd)), 'checkout -b from remote');
}

// ============================================================================
// commitAll
// ============================================================================
console.log('\n── commitAll ────────────────────────────────────────────');

// Clean tree → no commit
resetResponses();
on(/git add -A/, '');
on(/git status --porcelain/, '');
{
  const r = repoService.commitAll('omai', 'test');
  assertEq(r.committed, false, 'clean → not committed');
  assert(/Nothing to commit/.test(r.message), 'correct message');
}

// Dirty tree → commit
resetResponses();
on(/git add -A/, '');
on(/git status --porcelain/, ' M a.txt');
on(/git commit -m/, '');
on(/git log -1/, 'sha42|test commit|2026-04-10T10:00:00Z');
{
  const r = repoService.commitAll('omai', 'test commit');
  assertEq(r.committed, true, 'committed');
  assertEq(r.sha, 'sha42', 'sha returned');
}

// Message with quotes — should be escaped
resetResponses();
on(/git add -A/, '');
on(/git status --porcelain/, ' M a.txt');
on(/git commit -m/, '');
on(/git log -1/, 'sha|msg|d');
{
  repoService.commitAll('omai', 'has "quotes"');
  const commitCall = execCalls.find(c => /git commit/.test(c.cmd))!;
  assert(/\\"quotes\\"/.test(commitCall.cmd), 'quotes escaped');
}

// ============================================================================
// pushBranch
// ============================================================================
console.log('\n── pushBranch ───────────────────────────────────────────');

resetResponses();
on(/git push origin/, '');
{
  const r = repoService.pushBranch('omai', 'feature/x');
  assertEq(r.pushed, true, 'pushed');
  assertEq(r.branch, 'feature/x', 'branch returned');
  assert(execCalls.some(c => /git push origin feature\/x/.test(c.cmd)), 'push with explicit branch');
}

// Without branch — uses current
resetResponses();
on(/git rev-parse --abbrev-ref HEAD/, 'feature/current');
on(/git push origin/, '');
{
  const r = repoService.pushBranch('omai');
  assertEq(r.branch, 'feature/current', 'uses current branch');
}

// ============================================================================
// mergeToMain
// ============================================================================
console.log('\n── mergeToMain ──────────────────────────────────────────');

// Dirty tree → throws
resetResponses();
on(/git status --porcelain/, ' M a.txt');
{
  let caught: Error | null = null;
  try { repoService.mergeToMain('omai', 'feature/x'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /dirty/i.test(caught!.message), 'dirty throws');
}

// Happy path (ff success)
resetResponses();
on(/git status --porcelain/, '');
on(/git push origin feature\/x/, '');
on(/git checkout main/, '');
on(/git pull origin main/, '');
on(/git merge --ff-only/, '');
on(/git rev-parse HEAD/, 'mergedsha');
on(/git push origin main/, '');
on(/git branch -d/, '');
on(/git push origin --delete/, '');
{
  const r = repoService.mergeToMain('omai', 'feature/x');
  assertEq(r.merged, true, 'merged');
  assertEq(r.branch, 'feature/x', 'branch');
  assertEq(r.commit, 'mergedsha', 'commit sha');
  assertEq(r.branch_deleted, true, 'branch deleted');
}

// FF failure
resetResponses();
on(/git status --porcelain/, '');
on(/git push origin feature\/x/, '');
on(/git checkout main/, '');
on(/git pull origin main/, '');
on(/git merge --ff-only/, { throws: true });
on(/git checkout feature/, '');
{
  let caught: any = null;
  try { repoService.mergeToMain('omai', 'feature/x'); }
  catch (e) { caught = e; }
  assert(caught !== null && /Fast-forward/i.test(caught.message), 'ff failure throws');
  assertEq(caught.code, 'FF_FAILED', 'code FF_FAILED');
  assertEq(caught.branch, 'feature/x', 'branch preserved on error');
}

// ============================================================================
// saveSnapshot / getLatestSnapshot
// ============================================================================
console.log('\n── snapshot persistence ──────────────────────────────────');

resetResponses();
resetPool();
on(/git rev-parse --abbrev-ref HEAD/, 'main');
on(/git status --porcelain/, '');
on(/git rev-list/, '0\t0');
on(/git log -1/, 'sha|m|d');
{
  const snap = await repoService.saveSnapshot(fakePool, 'omai');
  assertEq(snap.repo_target, 'omai', 'returns snapshot');
  assertEq(poolCalls.length, 1, 'one INSERT');
  assert(/INSERT INTO repo_snapshots/.test(poolCalls[0].sql), 'insert sql');
  assertEq(poolCalls[0].params[0], 'omai', 'repo_target param');
  assertEq(poolCalls[0].params[2], 1, 'is_clean=1');
}

resetPool();
poolResponse = [{ id: 5, repo_target: 'omai', current_branch: 'main' }];
{
  const r = await repoService.getLatestSnapshot(fakePool, 'omai');
  assertEq(r.id, 5, 'returns latest');
  assert(/ORDER BY snapshot_at DESC LIMIT 1/.test(poolCalls[0].sql), 'ordered');
}

resetPool();
poolResponse = [];
{
  const r = await repoService.getLatestSnapshot(fakePool, 'omai');
  assertEq(r, null, 'null when empty');
}

// ============================================================================
// recordEvent
// ============================================================================
console.log('\n── recordEvent ──────────────────────────────────────────');

resetPool();
await repoService.recordEvent(fakePool, 42, 'start', {
  from_status: 'backlog', to_status: 'in_progress',
  actor: 'alice', message: 'Starting', metadata: { x: 1 },
});
{
  assert(/INSERT INTO om_daily_item_events/.test(poolCalls[0].sql), 'events insert');
  assertEq(poolCalls[0].params[0], 42, 'itemId');
  assertEq(poolCalls[0].params[1], 'start', 'eventType');
  assertEq(poolCalls[0].params[2], 'backlog', 'from_status');
  assertEq(poolCalls[0].params[3], 'in_progress', 'to_status');
  assertEq(poolCalls[0].params[4], 'alice', 'actor');
  assertEq(poolCalls[0].params[5], 'Starting', 'message');
  assertEq(poolCalls[0].params[6], JSON.stringify({ x: 1 }), 'metadata serialized');
}

// Defaults
resetPool();
await repoService.recordEvent(fakePool, 1, 'foo');
{
  assertEq(poolCalls[0].params[2], null, 'from_status default null');
  assertEq(poolCalls[0].params[4], 'system', 'actor default system');
  assertEq(poolCalls[0].params[6], null, 'metadata default null');
}

// ============================================================================
// createArtifact
// ============================================================================
console.log('\n── createArtifact ───────────────────────────────────────');

resetPool();
poolInsertId = 99;
{
  const id = await repoService.createArtifact(fakePool, 42, 'log', 'Test', { data: true }, 'bob');
  assertEq(id, 99, 'returns insertId');
  assertEq(poolCalls[0].params[0], 42, 'itemId');
  assertEq(poolCalls[0].params[1], 'log', 'type');
  assertEq(poolCalls[0].params[2], 'Test', 'title');
  assertEq(poolCalls[0].params[3], JSON.stringify({ data: true }), 'payload serialized');
  assertEq(poolCalls[0].params[4], 'bob', 'createdBy');
}

// Default createdBy
resetPool();
await repoService.createArtifact(fakePool, 1, 't', 'x', {});
assertEq(poolCalls[0].params[4], 'system', 'default createdBy');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  process.exit(1);
});
