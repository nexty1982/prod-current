#!/usr/bin/env npx tsx
/**
 * Unit tests for services/repoService.js (OMD-1102)
 *
 * Dual-repo git operations layer. Uses child_process.execSync for all
 * git commands — stubbed via a scripted dispatch table.
 *
 * Strategy:
 *   - Monkey-patch child_process.execSync BEFORE requiring the SUT.
 *   - execLog records {cmd, cwd, timeout} for every call.
 *   - execResponses maps a regex → stdout string OR Error.
 *   - Execution order matters for scripted sequences (rather than
 *     first-match-wins we support an array of sequential expectations
 *     when scripting complex flows like createBranch/mergeToMain).
 *
 * Coverage:
 *   - REPO_PATHS exported
 *   - getRepoPath: valid / invalid target
 *   - getCurrentBranch / isClean / getStatusLines
 *   - getAheadBehind: happy, parse, error → zeros
 *   - getLastCommit: happy + error path
 *   - getSnapshot: aggregates, formats changed_files
 *   - fetchOrigin: with/without branch, uses FETCH_TIMEOUT
 *   - branchExistsLocal / branchExistsRemote: pass + throw → false
 *   - createBranch: stash path, push, no-stash path, stash-pop-fail warn
 *   - checkoutBranch: local vs remote fallback
 *   - commitAll: clean tree, dirty tree, escaped quotes
 *   - pushBranch: default to current branch
 *   - mergeToMain: dirty throws, happy path, ff_failed rollback
 *   - saveSnapshot: INSERTs correct shape
 *   - getLatestSnapshot: row[0] or null
 *   - recordEvent: INSERT with defaults
 *   - createArtifact: INSERT, returns insertId
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

// ── execSync stub ───────────────────────────────────────────────────
type ExecCall = { cmd: string; cwd: string; timeout: number };
const execLog: ExecCall[] = [];

// First-match wins dispatch table of regex → response (string or Error)
type Response = string | Error;
let execResponses: Array<{ pattern: RegExp; response: Response; consumed?: boolean; once?: boolean }> = [];

function addResponse(pattern: RegExp, response: Response, opts: { once?: boolean } = {}): void {
  execResponses.push({ pattern, response, once: opts.once });
}

function resetExec() {
  execLog.length = 0;
  execResponses = [];
}

const childProcess = require('child_process');
childProcess.execSync = (cmd: string, opts: any = {}) => {
  execLog.push({ cmd, cwd: opts.cwd || '', timeout: opts.timeout || 0 });
  for (const entry of execResponses) {
    if (entry.consumed) continue;
    if (entry.pattern.test(cmd)) {
      if (entry.once) entry.consumed = true;
      if (entry.response instanceof Error) throw entry.response;
      return entry.response;
    }
  }
  // Default: empty string
  return '';
};

// ── SUT require ─────────────────────────────────────────────────────
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

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

// ============================================================================
// REPO_PATHS + getRepoPath
// ============================================================================
console.log('\n── REPO_PATHS / getRepoPath ─────────────────────────────');

assertEq(REPO_PATHS.omai, '/var/www/omai', 'omai path');
assertEq(REPO_PATHS.orthodoxmetrics, '/var/www/orthodoxmetrics/prod', 'orthodoxmetrics path');
assertEq(getRepoPath('omai'), '/var/www/omai', 'getRepoPath omai');
assertEq(getRepoPath('orthodoxmetrics'), '/var/www/orthodoxmetrics/prod', 'getRepoPath orthodoxmetrics');

{
  let caught: Error | null = null;
  try { getRepoPath('bogus'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on unknown target');
  assert(caught !== null && /Unknown repo_target/i.test(caught.message), 'msg');
}

// ============================================================================
// getCurrentBranch / isClean / getStatusLines
// ============================================================================
console.log('\n── getCurrentBranch ──────────────────────────────────────');

resetExec();
addResponse(/git rev-parse --abbrev-ref HEAD/, 'main\n');
{
  const b = getCurrentBranch('omai');
  assertEq(b, 'main', 'trimmed branch');
  assertEq(execLog[0].cwd, '/var/www/omai', 'cwd set');
}

console.log('\n── isClean / getStatusLines ──────────────────────────────');

resetExec();
addResponse(/git status --porcelain/, '');
assertEq(isClean('omai'), true, 'empty → clean');
assertEq(getStatusLines('omai'), [], 'empty → []');

resetExec();
// Note: git() trims output, so first line must start with non-whitespace.
// Real porcelain output for modified-in-index is "M  file" (M in first col).
addResponse(/git status --porcelain/, 'M  file1.txt\n?? file2.txt');
assertEq(isClean('omai'), false, 'dirty → false');
assertEq(getStatusLines('omai'), ['M  file1.txt', '?? file2.txt'], 'split lines');

// ============================================================================
// getAheadBehind
// ============================================================================
console.log('\n── getAheadBehind ────────────────────────────────────────');

resetExec();
addResponse(/rev-list --left-right --count/, '3\t1');
assertEq(getAheadBehind('omai'), { ahead: 3, behind: 1 }, '3 ahead 1 behind');

resetExec();
addResponse(/rev-list --left-right --count/, new Error('no upstream'));
quiet();
assertEq(getAheadBehind('omai'), { ahead: 0, behind: 0 }, 'error → zeros');
loud();

resetExec();
addResponse(/rev-list --left-right --count/, '\t');  // empty parts
assertEq(getAheadBehind('omai'), { ahead: 0, behind: 0 }, 'NaN → zeros');

// ============================================================================
// getLastCommit
// ============================================================================
console.log('\n── getLastCommit ─────────────────────────────────────────');

resetExec();
addResponse(/git log -1/, 'abc123|initial commit|2026-04-10T12:00:00Z');
assertEq(
  getLastCommit('omai'),
  { sha: 'abc123', message: 'initial commit', date: '2026-04-10T12:00:00Z' },
  'parsed'
);

resetExec();
addResponse(/git log -1/, new Error('no commits'));
quiet();
assertEq(
  getLastCommit('omai'),
  { sha: null, message: null, date: null },
  'error → nulls'
);
loud();

// ============================================================================
// getSnapshot
// ============================================================================
console.log('\n── getSnapshot ───────────────────────────────────────────');

resetExec();
addResponse(/git rev-parse --abbrev-ref HEAD/, 'feature/x');
addResponse(/git status --porcelain/, 'M  a.txt\n?? b.txt');
addResponse(/rev-list --left-right --count/, '2\t0');
addResponse(/git log -1/, 'def456|msg|2026-04-09T00:00:00Z');
{
  const snap = getSnapshot('omai');
  assertEq(snap.repo_target, 'omai', 'target');
  assertEq(snap.current_branch, 'feature/x', 'branch');
  assertEq(snap.is_clean, false, 'not clean');
  assertEq(snap.uncommitted_count, 2, '2 uncommitted');
  assertEq(snap.ahead, 2, 'ahead');
  assertEq(snap.behind, 0, 'behind');
  assertEq(snap.last_commit_sha, 'def456', 'sha');
  assertEq(snap.last_commit_message, 'msg', 'msg');
  assertEq(snap.changed_files.length, 2, '2 changed files');
  assertEq(snap.changed_files[0], { status: 'M', file: 'a.txt' }, 'file parse');
  assertEq(snap.changed_files[1], { status: '??', file: 'b.txt' }, 'untracked parse');
  assert(typeof snap.snapshot_at === 'string', 'snapshot_at set');
}

// Clean snapshot
resetExec();
addResponse(/git rev-parse --abbrev-ref HEAD/, 'main');
addResponse(/git status --porcelain/, '');
addResponse(/rev-list --left-right --count/, '0\t0');
addResponse(/git log -1/, 'xyz|clean|2026-01-01T00:00:00Z');
{
  const snap = getSnapshot('omai');
  assertEq(snap.is_clean, true, 'clean');
  assertEq(snap.uncommitted_count, 0, '0 uncommitted');
  assertEq(snap.changed_files, [], 'no changed files');
}

// ============================================================================
// fetchOrigin
// ============================================================================
console.log('\n── fetchOrigin ───────────────────────────────────────────');

resetExec();
addResponse(/git fetch origin/, '');
fetchOrigin('omai');
assert(/git fetch origin$/.test(execLog[0].cmd), 'no branch → fetch origin');
assertEq(execLog[0].timeout, 30000, 'FETCH_TIMEOUT used');

resetExec();
addResponse(/git fetch origin main/, '');
fetchOrigin('omai', 'main');
assert(/git fetch origin main/.test(execLog[0].cmd), 'with branch');

// ============================================================================
// branchExistsLocal / branchExistsRemote
// ============================================================================
console.log('\n── branchExists ──────────────────────────────────────────');

resetExec();
addResponse(/git rev-parse --verify foo$/, 'abc');
assertEq(branchExistsLocal('omai', 'foo'), true, 'local exists');

resetExec();
addResponse(/git rev-parse --verify missing$/, new Error('unknown ref'));
quiet();
assertEq(branchExistsLocal('omai', 'missing'), false, 'local missing');
loud();

resetExec();
addResponse(/git rev-parse --verify origin\/foo/, 'abc');
assertEq(branchExistsRemote('omai', 'foo'), true, 'remote exists');

resetExec();
addResponse(/git rev-parse --verify origin\/missing/, new Error('unknown'));
quiet();
assertEq(branchExistsRemote('omai', 'missing'), false, 'remote missing');
loud();

// ============================================================================
// createBranch
// ============================================================================
console.log('\n── createBranch: no stash ────────────────────────────────');

resetExec();
addResponse(/git fetch origin main/, '');
addResponse(/git status --porcelain/, '');  // clean
addResponse(/git checkout -b feature\/new origin\/main/, '');
addResponse(/git push -u origin feature\/new/, '');
{
  const result = createBranch('omai', 'feature/new');
  assertEq(result.branchName, 'feature/new', 'name');
  assertEq(result.stashed, false, 'no stash');
  // No stash commands
  const stashCmds = execLog.filter(c => /git stash/.test(c.cmd));
  assertEq(stashCmds.length, 0, 'no stash calls');
}

console.log('\n── createBranch: with stash ──────────────────────────────');

resetExec();
addResponse(/git fetch origin main/, '');
addResponse(/git status --porcelain/, ' M file.txt');
addResponse(/git stash push/, '');
addResponse(/git checkout -b feature\/new origin\/main/, '');
addResponse(/git push -u origin feature\/new/, '');
addResponse(/git stash pop/, '');
{
  const result = createBranch('omai', 'feature/new');
  assertEq(result.stashed, true, 'stashed');
  const pushCmds = execLog.filter(c => /git stash push/.test(c.cmd));
  const popCmds = execLog.filter(c => /git stash pop/.test(c.cmd));
  assertEq(pushCmds.length, 1, 'one stash push');
  assertEq(popCmds.length, 1, 'one stash pop');
}

console.log('\n── createBranch: stash pop conflict warns ────────────────');

resetExec();
addResponse(/git fetch origin main/, '');
addResponse(/git status --porcelain/, ' M file.txt');
addResponse(/git stash push/, '');
addResponse(/git checkout -b branchA origin\/main/, '');
addResponse(/git push -u origin branchA/, '');
addResponse(/git stash pop/, new Error('conflict'));
quiet();
{
  const result = createBranch('omai', 'branchA');
  loud();
  assertEq(result.stashed, true, 'still stashed');
  // Still returns — error in pop is caught with warn
}

console.log('\n── createBranch: push fail → pop and rethrow ─────────────');

resetExec();
addResponse(/git fetch origin main/, '');
addResponse(/git status --porcelain/, ' M file.txt');
addResponse(/git stash push/, '');
addResponse(/git checkout -b bad origin\/main/, '');
addResponse(/git push -u origin bad/, new Error('push failed'));
addResponse(/git stash pop/, '');
quiet();
{
  let caught: Error | null = null;
  try { createBranch('omai', 'bad'); } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws');
  // Stash was popped in catch
  const popCmds = execLog.filter(c => /git stash pop/.test(c.cmd));
  assertEq(popCmds.length, 1, 'pop in catch');
}

// ============================================================================
// checkoutBranch
// ============================================================================
console.log('\n── checkoutBranch: local ─────────────────────────────────');

resetExec();
addResponse(/git rev-parse --verify main$/, 'abc');
addResponse(/git checkout main$/, '');
{
  const r = checkoutBranch('omai', 'main');
  assertEq(r, 'checked_out_local', 'local');
}

console.log('\n── checkoutBranch: from remote ───────────────────────────');

resetExec();
addResponse(/git rev-parse --verify newbr$/, new Error('missing'));
addResponse(/git fetch origin$/, '');
addResponse(/git checkout -b newbr origin\/newbr/, '');
quiet();
{
  const r = checkoutBranch('omai', 'newbr');
  loud();
  assertEq(r, 'checked_out_remote', 'remote fallback');
}

// ============================================================================
// commitAll
// ============================================================================
console.log('\n── commitAll: clean tree ─────────────────────────────────');

resetExec();
addResponse(/git add -A/, '');
addResponse(/git status --porcelain/, '');
{
  const r = commitAll('omai', 'test');
  assertEq(r.committed, false, 'nothing to commit');
  assert(/Nothing to commit/i.test(r.message), 'message');
}

console.log('\n── commitAll: dirty tree ─────────────────────────────────');

resetExec();
addResponse(/git add -A/, '');
// isClean will call git status — first call (dirty), then later calls OK
addResponse(/git status --porcelain/, ' M file.txt');
addResponse(/git commit -m/, '');
addResponse(/git log -1/, 'sha1|test message|2026-04-10T00:00:00Z');
{
  const r = commitAll('omai', 'test');
  assertEq(r.committed, true, 'committed');
  assertEq(r.sha, 'sha1', 'sha');
  assertEq(r.message, 'test message', 'message');
}

console.log('\n── commitAll: escapes quotes ─────────────────────────────');

resetExec();
addResponse(/git add -A/, '');
addResponse(/git status --porcelain/, ' M file.txt');
addResponse(/git commit -m/, '');
addResponse(/git log -1/, 'sha2|msg|2026-04-10T00:00:00Z');
{
  commitAll('omai', 'has "quotes" inside');
  const commitCall = execLog.find(c => /git commit -m/.test(c.cmd));
  assert(commitCall !== undefined, 'commit called');
  if (commitCall) {
    assert(commitCall.cmd.includes('\\"quotes\\"'), 'quotes escaped');
  }
}

// ============================================================================
// pushBranch
// ============================================================================
console.log('\n── pushBranch ────────────────────────────────────────────');

resetExec();
addResponse(/git push origin mybr/, '');
{
  const r = pushBranch('omai', 'mybr');
  assertEq(r, { pushed: true, branch: 'mybr' }, 'explicit branch');
}

resetExec();
addResponse(/git rev-parse --abbrev-ref HEAD/, 'current-br');
addResponse(/git push origin current-br/, '');
{
  const r = pushBranch('omai');
  assertEq(r.branch, 'current-br', 'uses current branch');
}

// ============================================================================
// mergeToMain
// ============================================================================
console.log('\n── mergeToMain: dirty throws ─────────────────────────────');

resetExec();
addResponse(/git status --porcelain/, ' M file.txt');
{
  let caught: Error | null = null;
  try { mergeToMain('omai', 'br'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught !== null && /dirty/i.test(caught.message), 'dirty msg');
}

console.log('\n── mergeToMain: happy path ───────────────────────────────');

resetExec();
addResponse(/git status --porcelain/, '');
addResponse(/git push origin br1$/, '');
addResponse(/git checkout main$/, '');
addResponse(/git pull origin main/, '');
addResponse(/git merge --ff-only br1/, '');
addResponse(/git rev-parse HEAD/, 'merged-sha');
addResponse(/git push origin main/, '');
addResponse(/git branch -d br1/, '');
addResponse(/git push origin --delete br1/, '');
{
  const r = mergeToMain('omai', 'br1');
  assertEq(r.merged, true, 'merged');
  assertEq(r.merge_type, 'fast-forward', 'ff');
  assertEq(r.commit, 'merged-sha', 'sha');
  assertEq(r.branch_deleted, true, 'branch deleted flag');
}

console.log('\n── mergeToMain: ff_failed ────────────────────────────────');

resetExec();
addResponse(/git status --porcelain/, '');
addResponse(/git push origin br2$/, '');
addResponse(/git checkout main$/, '');
addResponse(/git pull origin main/, '');
addResponse(/git merge --ff-only br2/, new Error('divergent'));
addResponse(/git checkout br2$/, '');
{
  let caught: any = null;
  try { mergeToMain('omai', 'br2'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assertEq(caught.code, 'FF_FAILED', 'error code');
  assertEq(caught.branch, 'br2', 'branch on error');
  assert(/Fast-forward merge not possible/.test(caught.message), 'msg');
}

// ============================================================================
// saveSnapshot / getLatestSnapshot
// ============================================================================
console.log('\n── saveSnapshot ──────────────────────────────────────────');

resetExec();
addResponse(/git rev-parse --abbrev-ref HEAD/, 'main');
addResponse(/git status --porcelain/, '');
addResponse(/rev-list --left-right --count/, '0\t0');
addResponse(/git log -1/, 'sha|m|d');
{
  const poolCalls: any[] = [];
  const fakePool = {
    query: async (sql: string, params: any[]) => {
      poolCalls.push({ sql, params });
      return [{ affectedRows: 1 }];
    },
  };
  const snap = await saveSnapshot(fakePool, 'omai');
  assertEq(poolCalls.length, 1, 'one INSERT');
  assert(/INSERT INTO repo_snapshots/i.test(poolCalls[0].sql), 'correct table');
  assertEq(poolCalls[0].params[0], 'omai', 'repo_target');
  assertEq(poolCalls[0].params[1], 'main', 'branch');
  assertEq(poolCalls[0].params[2], 1, 'is_clean → 1');
  assertEq(poolCalls[0].params[3], 0, 'uncommitted_count');
  // changed_files is JSON string
  assert(typeof poolCalls[0].params[9] === 'string', 'changed_files JSON string');
  assertEq(JSON.parse(poolCalls[0].params[9]), [], 'empty array');
  assertEq(snap.is_clean, true, 'returns snap');
}

console.log('\n── getLatestSnapshot ─────────────────────────────────────');

{
  const fakePool = {
    query: async (_sql: string, _params: any[]) => [[{ id: 1, repo_target: 'omai' }]],
  };
  const r = await getLatestSnapshot(fakePool, 'omai');
  assertEq(r.repo_target, 'omai', 'returns row');
}

{
  const fakePool = {
    query: async () => [[]],
  };
  const r = await getLatestSnapshot(fakePool, 'omai');
  assertEq(r, null, 'null when empty');
}

// ============================================================================
// recordEvent
// ============================================================================
console.log('\n── recordEvent ───────────────────────────────────────────');

{
  const poolCalls: any[] = [];
  const fakePool = {
    query: async (sql: string, params: any[]) => {
      poolCalls.push({ sql, params });
      return [{}];
    },
  };
  await recordEvent(fakePool, 42, 'status_changed', {
    from_status: 'backlog',
    to_status: 'in_progress',
    actor: 'alice',
    message: 'started',
    metadata: { key: 'val' },
  });
  assertEq(poolCalls.length, 1, 'one INSERT');
  assert(/INSERT INTO om_daily_item_events/i.test(poolCalls[0].sql), 'events table');
  assertEq(poolCalls[0].params[0], 42, 'item_id');
  assertEq(poolCalls[0].params[1], 'status_changed', 'event_type');
  assertEq(poolCalls[0].params[2], 'backlog', 'from');
  assertEq(poolCalls[0].params[3], 'in_progress', 'to');
  assertEq(poolCalls[0].params[4], 'alice', 'actor');
  assertEq(poolCalls[0].params[5], 'started', 'message');
  assertEq(JSON.parse(poolCalls[0].params[6]), { key: 'val' }, 'metadata JSON');
}

// Defaults
{
  const poolCalls: any[] = [];
  const fakePool = {
    query: async (sql: string, params: any[]) => {
      poolCalls.push({ sql, params });
      return [{}];
    },
  };
  await recordEvent(fakePool, 43, 'noop');
  assertEq(poolCalls[0].params[2], null, 'no from_status');
  assertEq(poolCalls[0].params[3], null, 'no to_status');
  assertEq(poolCalls[0].params[4], 'system', 'default actor');
  assertEq(poolCalls[0].params[5], null, 'no message');
  assertEq(poolCalls[0].params[6], null, 'no metadata');
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
      return [{ insertId: 999 }];
    },
  };
  const id = await createArtifact(fakePool, 10, 'screenshot', 'Before', { url: 'x' }, 'alice');
  assertEq(id, 999, 'returns insertId');
  assert(/INSERT INTO om_daily_artifacts/i.test(poolCalls[0].sql), 'artifacts table');
  assertEq(poolCalls[0].params[0], 10, 'item_id');
  assertEq(poolCalls[0].params[1], 'screenshot', 'type');
  assertEq(poolCalls[0].params[2], 'Before', 'title');
  assertEq(JSON.parse(poolCalls[0].params[3]), { url: 'x' }, 'payload JSON');
  assertEq(poolCalls[0].params[4], 'alice', 'createdBy');
}

// Default createdBy
{
  const poolCalls: any[] = [];
  const fakePool = {
    query: async (sql: string, params: any[]) => {
      poolCalls.push({ sql, params });
      return [{ insertId: 1 }];
    },
  };
  await createArtifact(fakePool, 1, 't', 'T', {});
  assertEq(poolCalls[0].params[4], 'system', 'default createdBy');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
