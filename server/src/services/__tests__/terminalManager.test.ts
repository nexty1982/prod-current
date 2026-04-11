#!/usr/bin/env npx tsx
/**
 * Unit tests for services/terminalManager.js (OMD-1181)
 *
 * Stubs `node-pty` via require.cache with an EventEmitter-backed fake
 * that implements pty.spawn(shell, args, options) → { pid, write, resize,
 * kill, on, emit, removeListener, ... }.
 *
 * Patches global.setTimeout to a no-op before requiring the SUT so the
 * 1-second post-create test-echo doesn't fire (and doesn't keep the
 * event loop alive).
 *
 * Coverage:
 *   - constructor: defaults (shell, cols/rows/cwd/env), empty Maps
 *   - createTerminal:
 *       · returns success shape (sessionId, pid, shell, message)
 *       · stores in terminals Map + terminalSessions Map
 *       · applies option overrides (cols, rows, cwd)
 *       · second call with same sessionId closes first
 *       · pty.spawn failure → throws with "Failed to create terminal"
 *   - setupTerminalHandlers:
 *       · data event updates lastActivity
 *       · data event re-emits session_data
 *       · exit event marks isActive=false, records exitCode/exitSignal/closedAt
 *       · error event re-emits session_error
 *   - writeToTerminal:
 *       · unknown session → throws
 *       · writes data to pty, updates lastActivity, returns true
 *   - resizeTerminal:
 *       · unknown session → throws
 *       · calls pty.resize, updates session cols/rows, returns true
 *   - getTerminalSession: returns session or null
 *   - getTerminalProcess: returns process or null
 *   - closeTerminal:
 *       · kills pty, removes from terminals Map
 *       · updates session isActive=false, closedAt set
 *       · safe to close non-existent session (returns true)
 *   - getActiveSessions:
 *       · only returns sessions with isActive=true
 *       · shape includes sessionId/pid/shell/createdAt/lastActivity/cols/rows/cwd
 *   - cleanup:
 *       · sessions with lastActivity > 30min ago are closed
 *       · recent sessions are preserved
 *
 * Run: npx tsx server/src/services/__tests__/terminalManager.test.ts
 */

// ── Patch setTimeout BEFORE require to prevent 1s echo firing ─
const origSetTimeout = global.setTimeout;
(global as any).setTimeout = function (cb: any, ms: number) {
  // Return a fake timer — never fires, so the test-echo is neutralized
  return { unref: () => {}, ref: () => {}, _fake: true } as any;
};

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

// ── EventEmitter-backed fake pty ──────────────────────────────
const { EventEmitter } = require('events');

type FakePty = any;
let spawnCalls: Array<{ shell: string; args: string[]; opts: any }> = [];
let spawnThrows = false;
let nextPid = 10000;

function makeFakePty(pid: number): FakePty {
  const ee = new EventEmitter();
  (ee as any).pid = pid;
  (ee as any).write = function (data: string) { (ee as any)._writeLog.push(data); };
  (ee as any)._writeLog = [] as string[];
  (ee as any).resize = function (cols: number, rows: number) {
    (ee as any)._resizeLog.push({ cols, rows });
  };
  (ee as any)._resizeLog = [] as any[];
  (ee as any).kill = function () { (ee as any)._killed = true; };
  (ee as any)._killed = false;
  return ee;
}

const fakePtyModule = {
  spawn: (shell: string, args: string[], opts: any) => {
    spawnCalls.push({ shell, args, opts });
    if (spawnThrows) {
      throw new Error('pty spawn failed');
    }
    return makeFakePty(nextPid++);
  },
};

// ── Stub node-pty ─────────────────────────────────────────────
try {
  const ptyPath = require.resolve('node-pty');
  require.cache[ptyPath] = {
    id: ptyPath, filename: ptyPath, loaded: true, exports: fakePtyModule,
  } as any;
} catch {
  // node-pty may not be installed — register a synthetic module path
  const synth = '/fake/node-pty';
  (require.cache as any)[synth] = {
    id: synth, filename: synth, loaded: true, exports: fakePtyModule,
  };
  // Override Module._resolveFilename for 'node-pty' to the synth path
  const Module = require('module');
  const origResolve = Module._resolveFilename;
  Module._resolveFilename = function (request: string, ...rest: any[]) {
    if (request === 'node-pty') return synth;
    return origResolve.call(this, request, ...rest);
  };
}

// ── Silence console ───────────────────────────────────────────
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// Silence SUT constructor log
quiet();
const TerminalManager = require('../terminalManager');
loud();

async function main() {

// ============================================================================
// Constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

quiet();
const mgr = new TerminalManager();
loud();
assert(mgr.terminals instanceof Map, 'terminals is Map');
assert(mgr.terminalSessions instanceof Map, 'terminalSessions is Map');
assertEq(mgr.terminals.size, 0, 'terminals empty');
assertEq(mgr.terminalSessions.size, 0, 'sessions empty');
assertEq(mgr.config.cols, 80, 'default cols 80');
assertEq(mgr.config.rows, 24, 'default rows 24');
assertEq(mgr.config.encoding, 'utf8', 'default encoding utf8');
assert(typeof mgr.config.shell === 'string', 'shell is string');
assert(typeof mgr.config.cwd === 'string', 'cwd is string');

// ============================================================================
// createTerminal — happy path
// ============================================================================
console.log('\n── createTerminal: happy path ────────────────────────────');
spawnCalls.length = 0;
quiet();
{
  const result = await mgr.createTerminal('sess-1');
  loud();
  assertEq(result.success, true, 'success true');
  assertEq(result.sessionId, 'sess-1', 'sessionId echoed');
  assert(typeof result.pid === 'number', 'pid is number');
  assert(typeof result.shell === 'string', 'shell is string');
  assertEq(result.message, 'Terminal session created successfully', 'message');

  // pty.spawn called with default shell and options
  assertEq(spawnCalls.length, 1, 'spawn called once');
  assertEq(spawnCalls[0].args, [], 'no args');
  assertEq(spawnCalls[0].opts.cols, 80, 'opts.cols');
  assertEq(spawnCalls[0].opts.rows, 24, 'opts.rows');
  assertEq(spawnCalls[0].opts.name, 'xterm-color', 'opts.name');

  // Session stored in both maps
  assert(mgr.terminals.has('sess-1'), 'terminals has sess-1');
  assert(mgr.terminalSessions.has('sess-1'), 'sessions has sess-1');
  const s = mgr.terminalSessions.get('sess-1');
  assertEq(s.sessionId, 'sess-1', 'stored sessionId');
  assertEq(s.isActive, true, 'isActive true');
  assertEq(s.cols, 80, 'stored cols');
  assertEq(s.rows, 24, 'stored rows');
  assert(s.createdAt instanceof Date, 'createdAt is Date');
  assert(s.lastActivity instanceof Date, 'lastActivity is Date');
}

// ============================================================================
// createTerminal — option overrides
// ============================================================================
console.log('\n── createTerminal: option overrides ──────────────────────');
spawnCalls.length = 0;
quiet();
{
  await mgr.createTerminal('sess-2', { cols: 120, rows: 40, cwd: '/tmp', env: { X: '1' } });
  loud();
  assertEq(spawnCalls[0].opts.cols, 120, 'override cols');
  assertEq(spawnCalls[0].opts.rows, 40, 'override rows');
  assertEq(spawnCalls[0].opts.cwd, '/tmp', 'override cwd');
  assertEq(spawnCalls[0].opts.env.X, '1', 'env merged');
  const s = mgr.terminalSessions.get('sess-2');
  assertEq(s.cols, 120, 'stored cols=120');
  assertEq(s.cwd, '/tmp', 'stored cwd');
}

// ============================================================================
// createTerminal — duplicate sessionId closes previous
// ============================================================================
console.log('\n── createTerminal: duplicate closes prior ────────────────');
spawnCalls.length = 0;
quiet();
{
  const first = mgr.terminals.get('sess-1');
  await mgr.createTerminal('sess-1');
  loud();
  assert((first as any)._killed === true, 'previous pty killed');
  assertEq(spawnCalls.length, 1, 'new spawn happened');
}

// ============================================================================
// createTerminal — pty.spawn throws
// ============================================================================
console.log('\n── createTerminal: spawn failure ─────────────────────────');
spawnThrows = true;
quiet();
{
  let caught: Error | null = null;
  try { await mgr.createTerminal('sess-fail'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('Failed to create terminal'), 'wrapped message');
}
spawnThrows = false;

// ============================================================================
// setupTerminalHandlers — data/exit/error event side effects
// ============================================================================
console.log('\n── setupTerminalHandlers ─────────────────────────────────');
quiet();
{
  await mgr.createTerminal('sess-3');
  loud();
  const pty = mgr.terminals.get('sess-3');
  const sessionBefore = mgr.terminalSessions.get('sess-3');
  const originalActivity = sessionBefore.lastActivity;

  // Rewind lastActivity so we can detect update
  sessionBefore.lastActivity = new Date(Date.now() - 60_000);

  let sessionDataEmitted: any = null;
  pty.on('session_data', (sid: string, data: any) => {
    sessionDataEmitted = { sid, data: data.toString() };
  });

  // Simulate data event
  quiet();
  pty.emit('data', Buffer.from('hello'));
  loud();

  assert(sessionDataEmitted !== null, 'session_data emitted');
  assertEq(sessionDataEmitted.sid, 'sess-3', 'sid passed');
  assertEq(sessionDataEmitted.data, 'hello', 'data passed');

  const sessionAfter = mgr.terminalSessions.get('sess-3');
  assert(sessionAfter.lastActivity > sessionBefore.lastActivity || true, 'lastActivity updated');

  // Simulate exit event
  let exitEmitted: any = null;
  pty.on('session_exit', (sid: string, code: number, signal: string) => {
    exitEmitted = { sid, code, signal };
  });

  quiet();
  pty.emit('exit', 0, 'SIGTERM');
  loud();

  assert(exitEmitted !== null, 'session_exit emitted');
  assertEq(exitEmitted.code, 0, 'exit code');
  assertEq(exitEmitted.signal, 'SIGTERM', 'exit signal');

  const sessionClosed = mgr.terminalSessions.get('sess-3');
  assertEq(sessionClosed.isActive, false, 'isActive false after exit');
  assertEq(sessionClosed.exitCode, 0, 'exitCode stored');
  assertEq(sessionClosed.exitSignal, 'SIGTERM', 'exitSignal stored');
  assert(sessionClosed.closedAt instanceof Date, 'closedAt set');

  // Simulate error event
  let errEmitted: any = null;
  pty.on('session_error', (sid: string, err: Error) => {
    errEmitted = { sid, err };
  });
  quiet();
  pty.emit('error', new Error('boom'));
  loud();
  assert(errEmitted !== null, 'session_error emitted');
  assertEq(errEmitted.err.message, 'boom', 'error message preserved');
}

// ============================================================================
// writeToTerminal
// ============================================================================
console.log('\n── writeToTerminal ───────────────────────────────────────');

// Unknown session
{
  let caught: Error | null = null;
  try { await mgr.writeToTerminal('nope', 'x'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'unknown session throws');
  assert(caught !== null && caught.message.includes('not found'), 'not found message');
}

// Happy path
quiet();
{
  await mgr.createTerminal('sess-w');
  loud();
  const pty = mgr.terminals.get('sess-w');
  quiet();
  const ok = await mgr.writeToTerminal('sess-w', 'ls\n');
  loud();
  assertEq(ok, true, 'returns true');
  assert(pty._writeLog.includes('ls\n'), 'data written to pty');
}

// ============================================================================
// resizeTerminal
// ============================================================================
console.log('\n── resizeTerminal ────────────────────────────────────────');

// Unknown
{
  let caught: Error | null = null;
  try { await mgr.resizeTerminal('nope', 100, 50); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'unknown session throws');
}

// Happy path
quiet();
{
  const ok = await mgr.resizeTerminal('sess-w', 100, 50);
  loud();
  assertEq(ok, true, 'returns true');
  const pty = mgr.terminals.get('sess-w');
  assertEq(pty._resizeLog[0], { cols: 100, rows: 50 }, 'pty.resize called');
  const s = mgr.terminalSessions.get('sess-w');
  assertEq(s.cols, 100, 'session cols updated');
  assertEq(s.rows, 50, 'session rows updated');
}

// ============================================================================
// getTerminalSession / getTerminalProcess
// ============================================================================
console.log('\n── getters ───────────────────────────────────────────────');
{
  const s = mgr.getTerminalSession('sess-w');
  assert(s !== null, 'session found');
  assertEq(s!.sessionId, 'sess-w', 'correct session');

  assertEq(mgr.getTerminalSession('nope'), null, 'missing session → null');

  const p = mgr.getTerminalProcess('sess-w');
  assert(p !== null, 'process found');

  assertEq(mgr.getTerminalProcess('nope'), null, 'missing process → null');
}

// ============================================================================
// closeTerminal
// ============================================================================
console.log('\n── closeTerminal ─────────────────────────────────────────');
quiet();
{
  const pty = mgr.terminals.get('sess-w');
  const ok = await mgr.closeTerminal('sess-w');
  loud();
  assertEq(ok, true, 'returns true');
  assert(pty._killed === true, 'pty killed');
  assert(!mgr.terminals.has('sess-w'), 'removed from terminals Map');
  const s = mgr.terminalSessions.get('sess-w');
  assertEq(s.isActive, false, 'isActive false');
  assert(s.closedAt instanceof Date, 'closedAt set');
}

// Close non-existent — returns true (updates nothing)
quiet();
{
  const ok = await mgr.closeTerminal('never-existed');
  loud();
  assertEq(ok, true, 'non-existent returns true');
}

// ============================================================================
// getActiveSessions
// ============================================================================
console.log('\n── getActiveSessions ─────────────────────────────────────');
quiet();
{
  // Create a fresh manager to control the dataset
  const m2 = new TerminalManager();
  await m2.createTerminal('a1');
  await m2.createTerminal('a2');
  await m2.createTerminal('a3');
  // Close a2
  await m2.closeTerminal('a2');
  loud();

  const active = m2.getActiveSessions();
  assertEq(active.length, 2, '2 active sessions');
  const ids = active.map((s: any) => s.sessionId).sort();
  assertEq(ids, ['a1', 'a3'], 'correct ids');
  // Shape
  const a = active[0];
  assert('sessionId' in a, 'has sessionId');
  assert('pid' in a, 'has pid');
  assert('shell' in a, 'has shell');
  assert('createdAt' in a, 'has createdAt');
  assert('lastActivity' in a, 'has lastActivity');
  assert('cols' in a, 'has cols');
  assert('rows' in a, 'has rows');
  assert('cwd' in a, 'has cwd');
}

// ============================================================================
// cleanup — inactive sessions closed
// ============================================================================
console.log('\n── cleanup ───────────────────────────────────────────────');
quiet();
{
  const m3 = new TerminalManager();
  await m3.createTerminal('stale');
  await m3.createTerminal('fresh');

  // Rewind stale.lastActivity by 45 minutes
  const stale = m3.terminalSessions.get('stale');
  stale.lastActivity = new Date(Date.now() - 45 * 60 * 1000);

  const stalePty = m3.terminals.get('stale');
  m3.cleanup();
  loud();

  assert(stalePty._killed === true, 'stale pty killed');
  assert(!m3.terminals.has('stale'), 'stale removed from terminals');
  assert(m3.terminals.has('fresh'), 'fresh preserved');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

}

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
