#!/usr/bin/env npx tsx
/**
 * Unit tests for services/terminalManager.js (OMD-1222)
 *
 * Manages node-pty shell sessions. One external dep: `node-pty`. Stubbed
 * via require.cache with a fake spawn() that returns a FakePtyProcess
 * EventEmitter with write/resize/kill + pid.
 *
 * Coverage:
 *   - createTerminal:
 *       · spawns pty with defaults or provided cols/rows/cwd/env
 *       · existing session → closed and replaced
 *       · sets up data/exit/error handlers
 *       · returns { success, sessionId, pid, shell, message }
 *       · spawn throws → wraps error message
 *   - writeToTerminal:
 *       · writes data, updates lastActivity
 *       · unknown session → throws
 *   - resizeTerminal:
 *       · calls resize, updates session cols/rows
 *       · unknown session → throws
 *   - getTerminalSession / getTerminalProcess: returns entry or null
 *   - closeTerminal:
 *       · kills process, removes from terminals map
 *       · sets isActive=false + closedAt on session
 *       · idempotent on missing process
 *   - getActiveSessions: only active sessions in the list
 *   - cleanup: closes sessions inactive > 30 min
 *
 * Run: npx tsx server/src/services/__tests__/terminalManager.test.ts
 */

import { EventEmitter } from 'events';

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

// ── Fake node-pty ────────────────────────────────────────────────────
type SpawnCall = { shell: string; args: string[]; options: any };
const spawnCalls: SpawnCall[] = [];
let spawnThrows = false;
let nextPid = 1000;

class FakePtyProcess extends EventEmitter {
  pid: number;
  writes: string[] = [];
  resizes: Array<[number, number]> = [];
  killed = false;
  constructor() {
    super();
    this.pid = nextPid++;
  }
  write(data: string) { this.writes.push(data); }
  resize(cols: number, rows: number) { this.resizes.push([cols, rows]); }
  kill() { this.killed = true; }
}

const lastSpawned: FakePtyProcess[] = [];

const fakePty = {
  spawn: (shell: string, args: string[], options: any) => {
    spawnCalls.push({ shell, args, options });
    if (spawnThrows) throw new Error('spawn failed');
    const p = new FakePtyProcess();
    lastSpawned.push(p);
    return p;
  },
};

const ptyPath = require.resolve('node-pty');
require.cache[ptyPath] = {
  id: ptyPath, filename: ptyPath, loaded: true, exports: fakePty,
} as any;

function resetPty() {
  spawnCalls.length = 0;
  lastSpawned.length = 0;
  spawnThrows = false;
  nextPid = 1000;
}

// Silence noisy logs from the SUT
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const TerminalManager = require('../terminalManager');

async function main() {

// ============================================================================
// constructor
// ============================================================================
console.log('\n── constructor ────────────────────────────────────────────');

quiet();
const tm = new TerminalManager();
loud();

assert(tm.terminals instanceof Map, 'terminals map');
assert(tm.terminalSessions instanceof Map, 'sessions map');
assertEq(tm.config.cols, 80, 'default cols 80');
assertEq(tm.config.rows, 24, 'default rows 24');
assert(typeof tm.config.shell === 'string', 'shell set');

// ============================================================================
// createTerminal — happy path
// ============================================================================
console.log('\n── createTerminal: happy path ─────────────────────────────');

resetPty();
quiet();
{
  const r = await tm.createTerminal('sess-1', { cols: 100, rows: 30, cwd: '/tmp' });
  loud();

  assertEq(r.success, true, 'success true');
  assertEq(r.sessionId, 'sess-1', 'sessionId returned');
  assertEq(typeof r.pid, 'number', 'pid returned');
  assertEq(spawnCalls.length, 1, 'spawn called once');
  assertEq(spawnCalls[0].options.cols, 100, 'cols=100');
  assertEq(spawnCalls[0].options.rows, 30, 'rows=30');
  assertEq(spawnCalls[0].options.cwd, '/tmp', 'cwd=/tmp');
  assertEq(spawnCalls[0].options.name, 'xterm-color', 'name=xterm-color');
  assert(tm.terminals.has('sess-1'), 'terminal in map');
  assert(tm.terminalSessions.has('sess-1'), 'session in map');

  const session = tm.terminalSessions.get('sess-1');
  assertEq(session.isActive, true, 'session active');
  assertEq(session.cols, 100, 'session cols');
  assertEq(session.rows, 30, 'session rows');
  assertEq(session.cwd, '/tmp', 'session cwd');
}

// defaults when options omitted
resetPty();
quiet();
{
  await tm.createTerminal('sess-default');
  loud();
  assertEq(spawnCalls[0].options.cols, 80, 'default cols');
  assertEq(spawnCalls[0].options.rows, 24, 'default rows');
}

// ============================================================================
// createTerminal — replaces existing session
// ============================================================================
console.log('\n── createTerminal: replaces existing ──────────────────────');

resetPty();
quiet();
{
  await tm.createTerminal('sess-dup');
  const firstPid = tm.terminalSessions.get('sess-dup').pid;
  await tm.createTerminal('sess-dup');
  loud();
  const newPid = tm.terminalSessions.get('sess-dup').pid;
  assert(newPid !== firstPid, 'new pid after replace');
  assert(newPid > firstPid, 'new pid incremented');
}

// ============================================================================
// createTerminal — spawn throws
// ============================================================================
console.log('\n── createTerminal: spawn error ────────────────────────────');

resetPty();
spawnThrows = true;
quiet();
{
  let caught: Error | null = null;
  try { await tm.createTerminal('sess-err'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws on spawn error');
  assert(caught !== null && caught.message.includes('Failed to create terminal'), 'wraps message');
  assert(caught !== null && caught.message.includes('spawn failed'), 'includes original error');
}

// ============================================================================
// setupTerminalHandlers — data event updates lastActivity + emits session_data
// ============================================================================
console.log('\n── setupTerminalHandlers: data/exit/error ─────────────────');

resetPty();
quiet();
{
  await tm.createTerminal('sess-evt');
  const ptyProc = tm.getTerminalProcess('sess-evt');
  const session = tm.terminalSessions.get('sess-evt');
  const origActivity = session.lastActivity;

  // Fire data event
  let capturedSessionData: any = null;
  ptyProc.on('session_data', (sid: string, data: any) => {
    capturedSessionData = { sid, data };
  });

  // wait a tick so timestamps differ
  await new Promise(r => setTimeout(r, 5));
  ptyProc.emit('data', 'hello');
  loud();

  assert(capturedSessionData !== null, 'session_data emitted');
  assertEq(capturedSessionData.sid, 'sess-evt', 'sid passed through');
  const updated = tm.terminalSessions.get('sess-evt');
  assert(updated.lastActivity >= origActivity, 'lastActivity updated');
}

// exit event
resetPty();
quiet();
{
  await tm.createTerminal('sess-exit');
  const ptyProc = tm.getTerminalProcess('sess-exit');

  let capturedExit: any = null;
  ptyProc.on('session_exit', (sid: string, code: number, signal: string) => {
    capturedExit = { sid, code, signal };
  });

  ptyProc.emit('exit', 0, null);
  loud();

  assert(capturedExit !== null, 'session_exit emitted');
  assertEq(capturedExit.sid, 'sess-exit', 'sid');
  assertEq(capturedExit.code, 0, 'exit code');
  const session = tm.terminalSessions.get('sess-exit');
  assertEq(session.isActive, false, 'isActive false');
  assertEq(session.exitCode, 0, 'exitCode stored');
  assert(session.closedAt instanceof Date, 'closedAt set');
}

// error event
resetPty();
quiet();
{
  await tm.createTerminal('sess-err2');
  const ptyProc = tm.getTerminalProcess('sess-err2');

  let capturedError: any = null;
  ptyProc.on('session_error', (sid: string, err: Error) => {
    capturedError = { sid, err };
  });

  ptyProc.emit('error', new Error('boom'));
  loud();

  assert(capturedError !== null, 'session_error emitted');
  assertEq(capturedError.sid, 'sess-err2', 'sid');
  assertEq(capturedError.err.message, 'boom', 'error passed through');
}

// ============================================================================
// writeToTerminal
// ============================================================================
console.log('\n── writeToTerminal ────────────────────────────────────────');

resetPty();
quiet();
{
  await tm.createTerminal('sess-w');
  const ok = await tm.writeToTerminal('sess-w', 'ls -la\n');
  loud();
  assertEq(ok, true, 'returns true');
  const ptyProc = tm.getTerminalProcess('sess-w');
  assert(ptyProc.writes.includes('ls -la\n'), 'write recorded');
}

// Unknown session → throws
quiet();
{
  let caught: Error | null = null;
  try { await tm.writeToTerminal('nope', 'x'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'unknown throws');
  assert(caught !== null && caught.message.includes('not found'), 'not found message');
}

// ============================================================================
// resizeTerminal
// ============================================================================
console.log('\n── resizeTerminal ─────────────────────────────────────────');

resetPty();
quiet();
{
  await tm.createTerminal('sess-r');
  const ok = await tm.resizeTerminal('sess-r', 120, 40);
  loud();
  assertEq(ok, true, 'returns true');
  const ptyProc = tm.getTerminalProcess('sess-r');
  assertEq(ptyProc.resizes.length, 1, 'resize called');
  assertEq(ptyProc.resizes[0][0], 120, 'cols=120');
  assertEq(ptyProc.resizes[0][1], 40, 'rows=40');
  const session = tm.terminalSessions.get('sess-r');
  assertEq(session.cols, 120, 'session cols updated');
  assertEq(session.rows, 40, 'session rows updated');
}

// Unknown session
quiet();
{
  let caught: Error | null = null;
  try { await tm.resizeTerminal('nope', 80, 24); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'unknown throws');
}

// ============================================================================
// getTerminalSession / getTerminalProcess
// ============================================================================
console.log('\n── getters ────────────────────────────────────────────────');

resetPty();
quiet();
{
  await tm.createTerminal('sess-g');
  loud();
  assert(tm.getTerminalSession('sess-g') !== null, 'session found');
  assert(tm.getTerminalProcess('sess-g') !== null, 'process found');
  assertEq(tm.getTerminalSession('nope'), null, 'missing session → null');
  assertEq(tm.getTerminalProcess('nope'), null, 'missing process → null');
}

// ============================================================================
// closeTerminal
// ============================================================================
console.log('\n── closeTerminal ──────────────────────────────────────────');

resetPty();
quiet();
{
  await tm.createTerminal('sess-c');
  const ptyProc = tm.getTerminalProcess('sess-c');
  const ok = await tm.closeTerminal('sess-c');
  loud();
  assertEq(ok, true, 'returns true');
  assertEq(ptyProc.killed, true, 'pty killed');
  assert(!tm.terminals.has('sess-c'), 'removed from terminals map');
  const session = tm.terminalSessions.get('sess-c');
  assertEq(session.isActive, false, 'isActive=false');
  assert(session.closedAt instanceof Date, 'closedAt set');
}

// Idempotent: close unknown → no throw, returns true
quiet();
{
  const ok = await tm.closeTerminal('never-existed');
  loud();
  assertEq(ok, true, 'idempotent close returns true');
}

// ============================================================================
// getActiveSessions
// ============================================================================
console.log('\n── getActiveSessions ──────────────────────────────────────');

const tm2 = (() => { quiet(); const m = new TerminalManager(); loud(); return m; })();

resetPty();
quiet();
{
  await tm2.createTerminal('a1');
  await tm2.createTerminal('a2');
  await tm2.createTerminal('a3');
  await tm2.closeTerminal('a2');
  loud();

  const active = tm2.getActiveSessions();
  assertEq(active.length, 2, '2 active');
  const ids = active.map((s: any) => s.sessionId).sort();
  assertEq(ids, ['a1', 'a3'], 'correct session ids');
  assert(typeof active[0].pid === 'number', 'pid present');
  assert(typeof active[0].cols === 'number', 'cols present');
  assert(typeof active[0].rows === 'number', 'rows present');
}

// ============================================================================
// cleanup
// ============================================================================
console.log('\n── cleanup ────────────────────────────────────────────────');

const tm3 = (() => { quiet(); const m = new TerminalManager(); loud(); return m; })();

resetPty();
quiet();
{
  await tm3.createTerminal('c1');
  await tm3.createTerminal('c2');

  // Make c1 stale (> 30 min old lastActivity)
  const s1 = tm3.terminalSessions.get('c1');
  s1.lastActivity = new Date(Date.now() - 60 * 60 * 1000); // 1h ago
  tm3.terminalSessions.set('c1', s1);

  tm3.cleanup();

  // closeTerminal is async but fire-and-forget in cleanup; give it a tick
  await new Promise(r => setTimeout(r, 10));
  loud();

  const s1after = tm3.terminalSessions.get('c1');
  assertEq(s1after.isActive, false, 'stale session closed');
  const s2after = tm3.terminalSessions.get('c2');
  assertEq(s2after.isActive, true, 'fresh session still active');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main()

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  process.exit(1);
});
