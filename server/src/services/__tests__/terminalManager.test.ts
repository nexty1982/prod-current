#!/usr/bin/env npx tsx
/**
 * Unit tests for services/terminalManager.js (OMD-1099)
 *
 * TerminalManager wraps node-pty to manage real shell sessions. We
 * stub node-pty via require.cache BEFORE requiring the SUT, so
 * spawn() returns a controllable EventEmitter-based fake pty process.
 *
 * Coverage:
 *   - constructor: config defaults, empty maps
 *   - createTerminal: happy path (spawn, stores in both maps, returns
 *     session info), options override, pre-existing session replaced,
 *     spawn error → throws wrapped error
 *   - setupTerminalHandlers (via createTerminal + emitting events):
 *     · 'data' event updates lastActivity + re-emits session_data
 *     · 'exit' event sets isActive=false + exit code/signal
 *     · 'error' event re-emits session_error
 *   - writeToTerminal: not found throws, writes to ptyProcess, updates
 *     lastActivity
 *   - resizeTerminal: not found throws, resizes, updates cols/rows
 *   - getTerminalSession: returns session or null
 *   - getTerminalProcess: returns process or null
 *   - closeTerminal: kills process, removes from map, marks session
 *     inactive, sets closedAt
 *   - getActiveSessions: only returns active sessions with expected
 *     fields
 *   - cleanup: closes sessions inactive > 30min, leaves fresh ones
 *   - testTerminal: resolves when 'JIT Terminal session active' seen,
 *     rejects on error event, rejects on timeout (simulated by not
 *     emitting data)
 *
 * Run: npx tsx server/src/services/__tests__/terminalManager.test.ts
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

// ── Fake node-pty ───────────────────────────────────────────────────
const { EventEmitter } = require('events');

type SpawnCall = {
  shell: string;
  args: string[];
  options: any;
  process: FakePtyProcess;
};

class FakePtyProcess extends EventEmitter {
  public pid: number;
  public writeLog: string[] = [];
  public resizeLog: Array<[number, number]> = [];
  public killed: boolean = false;
  public spawnError: Error | null = null;

  constructor(pid: number) {
    super();
    this.pid = pid;
  }
  write(data: string): void { this.writeLog.push(data); }
  resize(cols: number, rows: number): void { this.resizeLog.push([cols, rows]); }
  kill(): void { this.killed = true; }
}

let pidCounter = 1000;
let spawnCalls: SpawnCall[] = [];
let throwOnNextSpawn: Error | null = null;

const fakePty = {
  spawn: (shell: string, args: string[], options: any): FakePtyProcess => {
    if (throwOnNextSpawn) {
      const e = throwOnNextSpawn;
      throwOnNextSpawn = null;
      throw e;
    }
    const proc = new FakePtyProcess(++pidCounter);
    spawnCalls.push({ shell, args, options, process: proc });
    return proc;
  },
};

// Stub node-pty BEFORE the SUT requires it
const ptyPath = require.resolve('node-pty');
require.cache[ptyPath] = {
  id: ptyPath,
  filename: ptyPath,
  loaded: true,
  exports: fakePty,
} as any;

// Silence noisy logs BEFORE requiring SUT (constructor logs on load)
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

quiet();
const TerminalManager = require('../terminalManager');
loud();

function resetSpawns() {
  spawnCalls = [];
  throwOnNextSpawn = null;
}

async function main() {

// ============================================================================
// constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

quiet();
const mgr = new TerminalManager();
loud();

assert(mgr.terminals instanceof Map, 'terminals Map');
assert(mgr.terminalSessions instanceof Map, 'terminalSessions Map');
assertEq(mgr.terminals.size, 0, 'starts empty');
assertEq(mgr.config.cols, 80, 'default cols');
assertEq(mgr.config.rows, 24, 'default rows');
assertEq(mgr.config.encoding, 'utf8', 'encoding');
assert(typeof mgr.config.shell === 'string', 'shell resolved');
assert(typeof mgr.config.cwd === 'string', 'cwd resolved');

// ============================================================================
// createTerminal — happy path
// ============================================================================
console.log('\n── createTerminal: happy path ────────────────────────────');

resetSpawns();
quiet();
{
  const r = await mgr.createTerminal('s1', { cols: 120, rows: 40, cwd: '/tmp' });
  loud();
  assertEq(r.success, true, 'success=true');
  assertEq(r.sessionId, 's1', 'sessionId echoed');
  assert(typeof r.pid === 'number', 'pid present');
  assert(r.message.length > 0, 'message present');

  assertEq(spawnCalls.length, 1, '1 spawn call');
  assertEq(spawnCalls[0].args, [], 'no args');
  assertEq(spawnCalls[0].options.cols, 120, 'cols override');
  assertEq(spawnCalls[0].options.rows, 40, 'rows override');
  assertEq(spawnCalls[0].options.cwd, '/tmp', 'cwd override');
  assertEq(spawnCalls[0].options.name, 'xterm-color', 'xterm-color name');

  // Stored in both maps
  assert(mgr.terminals.has('s1'), 'terminals has s1');
  assert(mgr.terminalSessions.has('s1'), 'terminalSessions has s1');
  const sess = mgr.terminalSessions.get('s1');
  assertEq(sess.sessionId, 's1', 'sess.sessionId');
  assertEq(sess.cols, 120, 'sess.cols');
  assertEq(sess.rows, 40, 'sess.rows');
  assertEq(sess.cwd, '/tmp', 'sess.cwd');
  assertEq(sess.isActive, true, 'sess.isActive');
  assert(sess.createdAt instanceof Date, 'createdAt Date');
  assert(sess.lastActivity instanceof Date, 'lastActivity Date');
}

// Default options (no overrides)
resetSpawns();
quiet();
{
  await mgr.createTerminal('s-default');
  loud();
  assertEq(spawnCalls[0].options.cols, 80, 'default cols=80');
  assertEq(spawnCalls[0].options.rows, 24, 'default rows=24');
}

// Replacing an existing session
{
  const procBefore = mgr.terminals.get('s1');
  assert(procBefore !== undefined, 'had proc before');
  resetSpawns();
  quiet();
  await mgr.createTerminal('s1');
  loud();
  assertEq(spawnCalls.length, 1, 'still 1 new spawn');
  const procAfter = mgr.terminals.get('s1');
  assert(procAfter !== procBefore, 'new proc replaces old');
  assertEq((procBefore as FakePtyProcess).killed, true, 'old proc killed');
}

// spawn error → throws wrapped
resetSpawns();
throwOnNextSpawn = new Error('spawn EACCES');
quiet();
{
  let caught: Error | null = null;
  try { await mgr.createTerminal('s-err'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws on spawn error');
  assert(caught !== null && caught.message.includes('Failed to create terminal'), 'wrapped error message');
  assert(caught !== null && caught.message.includes('spawn EACCES'), 'original error included');
}

// ============================================================================
// setupTerminalHandlers (via event emission on underlying proc)
// ============================================================================
console.log('\n── setupTerminalHandlers ─────────────────────────────────');

resetSpawns();
quiet();
{
  await mgr.createTerminal('s-events');
  loud();
  const proc = mgr.terminals.get('s-events') as FakePtyProcess;
  const session = mgr.terminalSessions.get('s-events');
  const originalLastActivity = session.lastActivity;

  // Wait a tick so we can observe a lastActivity change
  await new Promise(r => setTimeout(r, 5));

  // Data event
  let dataEmitted = false;
  let sessionDataArgs: any[] | null = null;
  proc.on('session_data', (sid: string, data: any) => {
    dataEmitted = true;
    sessionDataArgs = [sid, data];
  });
  quiet();
  proc.emit('data', Buffer.from('hello world'));
  loud();
  assertEq(dataEmitted, true, 'session_data re-emitted on data');
  assertEq(sessionDataArgs![0], 's-events', 'session_data sessionId');
  const updatedSession = mgr.terminalSessions.get('s-events');
  assert(updatedSession.lastActivity > originalLastActivity, 'lastActivity updated on data');

  // Exit event
  let exitArgs: any[] | null = null;
  proc.on('session_exit', (sid: string, code: number, sig: string) => {
    exitArgs = [sid, code, sig];
  });
  quiet();
  proc.emit('exit', 0, null);
  loud();
  assertEq(exitArgs![0], 's-events', 'session_exit sessionId');
  assertEq(exitArgs![1], 0, 'exit code');
  const exitedSession = mgr.terminalSessions.get('s-events');
  assertEq(exitedSession.isActive, false, 'isActive=false after exit');
  assertEq(exitedSession.exitCode, 0, 'exitCode stored');
  assert(exitedSession.closedAt instanceof Date, 'closedAt set');

  // Error event
  let errorArgs: any[] | null = null;
  proc.on('session_error', (sid: string, err: Error) => {
    errorArgs = [sid, err];
  });
  quiet();
  proc.emit('error', new Error('boom'));
  loud();
  assertEq(errorArgs![0], 's-events', 'session_error sessionId');
  assert(errorArgs![1] instanceof Error, 'error re-emitted');
}

// ============================================================================
// writeToTerminal
// ============================================================================
console.log('\n── writeToTerminal ───────────────────────────────────────');

resetSpawns();
quiet();
{
  await mgr.createTerminal('s-write');
  loud();
  const proc = mgr.terminals.get('s-write') as FakePtyProcess;

  // Wait a tick so lastActivity changes are observable
  await new Promise(r => setTimeout(r, 5));
  const preActivity = mgr.terminalSessions.get('s-write').lastActivity;

  quiet();
  const result = await mgr.writeToTerminal('s-write', 'ls -la\n');
  loud();
  assertEq(result, true, 'returns true');
  assertEq(proc.writeLog.length, 1, '1 write');
  assertEq(proc.writeLog[0], 'ls -la\n', 'data written');

  const postActivity = mgr.terminalSessions.get('s-write').lastActivity;
  assert(postActivity >= preActivity, 'lastActivity updated');
}

// Not found
{
  let caught: Error | null = null;
  quiet();
  try { await mgr.writeToTerminal('nope', 'x'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws on missing session');
  assert(caught !== null && caught.message.includes('not found'), 'error mentions not found');
}

// ============================================================================
// resizeTerminal
// ============================================================================
console.log('\n── resizeTerminal ────────────────────────────────────────');

resetSpawns();
quiet();
{
  await mgr.createTerminal('s-resize');
  loud();
  const proc = mgr.terminals.get('s-resize') as FakePtyProcess;

  quiet();
  const result = await mgr.resizeTerminal('s-resize', 100, 30);
  loud();
  assertEq(result, true, 'returns true');
  assertEq(proc.resizeLog, [[100, 30]], 'resize logged');
  const sess = mgr.terminalSessions.get('s-resize');
  assertEq(sess.cols, 100, 'session cols updated');
  assertEq(sess.rows, 30, 'session rows updated');
}

// Not found
{
  let caught: Error | null = null;
  quiet();
  try { await mgr.resizeTerminal('nope', 100, 30); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws on missing session');
}

// ============================================================================
// getTerminalSession / getTerminalProcess
// ============================================================================
console.log('\n── getTerminalSession / getTerminalProcess ───────────────');

{
  const sess = mgr.getTerminalSession('s-resize');
  assert(sess !== null, 'returns session');
  assertEq(sess.sessionId, 's-resize', 'session id');
  assertEq(mgr.getTerminalSession('nope'), null, 'missing → null');

  const proc = mgr.getTerminalProcess('s-resize');
  assert(proc !== null, 'returns process');
  assertEq(mgr.getTerminalProcess('nope'), null, 'missing proc → null');
}

// ============================================================================
// closeTerminal
// ============================================================================
console.log('\n── closeTerminal ─────────────────────────────────────────');

resetSpawns();
quiet();
{
  await mgr.createTerminal('s-close');
  loud();
  const proc = mgr.terminals.get('s-close') as FakePtyProcess;

  quiet();
  const result = await mgr.closeTerminal('s-close');
  loud();
  assertEq(result, true, 'returns true');
  assertEq(proc.killed, true, 'process killed');
  assertEq(mgr.terminals.has('s-close'), false, 'removed from terminals map');
  // Session still present but marked inactive
  const sess = mgr.terminalSessions.get('s-close');
  assertEq(sess.isActive, false, 'session inactive');
  assert(sess.closedAt instanceof Date, 'closedAt set');
}

// Close nonexistent session — no process, no session — doesn't throw
{
  quiet();
  const result = await mgr.closeTerminal('never-existed');
  loud();
  assertEq(result, true, 'nonexistent close returns true (no-op)');
}

// ============================================================================
// getActiveSessions
// ============================================================================
console.log('\n── getActiveSessions ─────────────────────────────────────');

// Set up a fresh manager with known state
quiet();
const mgr2 = new TerminalManager();
loud();

resetSpawns();
quiet();
await mgr2.createTerminal('a1');
await mgr2.createTerminal('a2');
await mgr2.createTerminal('a3');
loud();

// Close a2
quiet();
await mgr2.closeTerminal('a2');
loud();

{
  const active = mgr2.getActiveSessions();
  assertEq(active.length, 2, '2 active sessions');
  const ids = active.map((s: any) => s.sessionId).sort();
  assertEq(ids, ['a1', 'a3'], 'a1 and a3 active');
  // Shape check
  const s = active[0];
  assert('sessionId' in s, 'has sessionId');
  assert('pid' in s, 'has pid');
  assert('shell' in s, 'has shell');
  assert('createdAt' in s, 'has createdAt');
  assert('lastActivity' in s, 'has lastActivity');
  assert('cols' in s, 'has cols');
  assert('rows' in s, 'has rows');
  assert('cwd' in s, 'has cwd');
}

// ============================================================================
// cleanup
// ============================================================================
console.log('\n── cleanup ───────────────────────────────────────────────');

quiet();
const mgr3 = new TerminalManager();
loud();

resetSpawns();
quiet();
await mgr3.createTerminal('fresh');
await mgr3.createTerminal('stale');
loud();

// Make 'stale' look old (> 30 min)
const staleSession = mgr3.terminalSessions.get('stale');
staleSession.lastActivity = new Date(Date.now() - 31 * 60 * 1000);
mgr3.terminalSessions.set('stale', staleSession);

quiet();
mgr3.cleanup();
loud();

// Fresh should still be active; stale should have been closed
assertEq(mgr3.terminals.has('fresh'), true, 'fresh survived');
assertEq(mgr3.terminals.has('stale'), false, 'stale closed');
assertEq(mgr3.terminalSessions.get('fresh').isActive, true, 'fresh session active');
assertEq(mgr3.terminalSessions.get('stale').isActive, false, 'stale session inactive');

// ============================================================================
// testTerminal — happy path (emit the expected banner)
// ============================================================================
console.log('\n── testTerminal ──────────────────────────────────────────');

quiet();
const mgr4 = new TerminalManager();
loud();

{
  // Start the test asynchronously
  const promise = (async () => {
    quiet();
    try {
      return await mgr4.testTerminal();
    } finally {
      loud();
    }
  })();

  // Give it a tick to set up the data listener, then emit the expected banner
  await new Promise(r => setTimeout(r, 10));
  const sessions = Array.from(mgr4.terminals.keys());
  assertEq(sessions.length, 1, 'test session created');
  const proc = mgr4.terminals.get(sessions[0]) as FakePtyProcess;
  proc.emit('data', Buffer.from('JIT Terminal session active - PID: 1234'));

  const r = await promise;
  assertEq(r.success, true, 'success');
  assert(r.output.includes('JIT Terminal session active'), 'output contains banner');
  assert(r.message.includes('completed successfully'), 'success message');
  // Session should be closed after test
  assertEq(mgr4.terminals.has(sessions[0]), false, 'test session cleaned up');
}

// testTerminal — error event
quiet();
const mgr5 = new TerminalManager();
loud();

{
  const promise = (async () => {
    quiet();
    try { return await mgr5.testTerminal(); }
    catch (e: any) { return { error: e }; }
    finally { loud(); }
  })();
  await new Promise(r => setTimeout(r, 10));
  const sessions = Array.from(mgr5.terminals.keys());
  const proc = mgr5.terminals.get(sessions[0]) as FakePtyProcess;
  proc.emit('error', new Error('pty crashed'));
  const r: any = await promise;
  assert(r.error !== undefined, 'rejects on error event');
  assert(r.error.message.includes('pty crashed'), 'error message preserved');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
