#!/usr/bin/env npx tsx
/**
 * Unit tests for services/terminalManager.js (OMD-1159)
 *
 * Manages node-pty sessions. External deps:
 *   - node-pty  (native) → stubbed via require.cache with EventEmitter-based fake
 *   - os        (stdlib) → left intact
 *
 * The fake pty:
 *   - spawn(...) returns EventEmitter with write/resize/kill spy methods + pid
 *   - records all spawn calls so we can verify shell / options
 *   - emit('data') / emit('exit') / emit('error') simulate real pty lifecycle
 *
 * Coverage:
 *   - constructor: config defaults, maps empty
 *   - createTerminal:
 *       · spawns with merged options (custom cols/rows/cwd/env)
 *       · stores terminal + session data
 *       · returns {success, sessionId, pid, shell, message}
 *       · if session exists, closes first
 *   - writeToTerminal:
 *       · missing session → throws
 *       · happy path → calls pty.write, updates lastActivity
 *   - resizeTerminal:
 *       · missing session → throws
 *       · happy path → updates cols/rows/lastActivity
 *   - getTerminalSession / getTerminalProcess: null when missing
 *   - closeTerminal: kills, removes from map, marks inactive
 *   - getActiveSessions: filters isActive
 *   - cleanup: closes stale sessions (>30min idle)
 *   - setupTerminalHandlers:
 *       · data event updates lastActivity + emits session_data
 *       · exit event marks session closed + emits session_exit
 *       · error event emits session_error
 *   - testTerminal:
 *       · resolves when 'JIT Terminal session active' output observed
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
type SpawnCall = { shell: string; args: any[]; options: any };
const spawnCalls: SpawnCall[] = [];

// Each fake process is an EventEmitter with spy methods
class FakePty extends EventEmitter {
  pid: number;
  writeLog: string[] = [];
  resizeLog: Array<{ cols: number; rows: number }> = [];
  killCalled = false;
  constructor(pid: number) {
    super();
    this.pid = pid;
  }
  write(data: string) { this.writeLog.push(data); }
  resize(cols: number, rows: number) { this.resizeLog.push({ cols, rows }); }
  kill() { this.killCalled = true; }
}

let nextPid = 1000;
const fakePtyModule = {
  spawn: (shell: string, args: any[], options: any) => {
    spawnCalls.push({ shell, args, options });
    return new FakePty(nextPid++);
  },
};

// Install stub BEFORE require
(() => {
  // node-pty is a bare specifier — require.resolve it to get its real path
  try {
    const resolved = require.resolve('node-pty');
    require.cache[resolved] = {
      id: resolved, filename: resolved, loaded: true, exports: fakePtyModule,
    } as any;
  } catch {
    // Native module may not be buildable here; inject under the bare name via Module._cache override
    const Module = require('module');
    const origResolve = Module._resolveFilename;
    Module._resolveFilename = function (req: string, ...rest: any[]) {
      if (req === 'node-pty') return 'node-pty-stub';
      return origResolve.call(this, req, ...rest);
    };
    require.cache['node-pty-stub'] = {
      id: 'node-pty-stub', filename: 'node-pty-stub', loaded: true, exports: fakePtyModule,
    } as any;
  }
})();

// ── SUT ──────────────────────────────────────────────────────────────
const TerminalManager = require('../terminalManager');

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

async function main() {

// ============================================================================
// constructor
// ============================================================================
console.log('\n── constructor ──────────────────────────────────────────');

quiet();
const tm1 = new TerminalManager();
loud();
assert(tm1.terminals instanceof Map, 'terminals is Map');
assert(tm1.terminalSessions instanceof Map, 'terminalSessions is Map');
assertEq(tm1.terminals.size, 0, 'empty terminals');
assertEq(tm1.terminalSessions.size, 0, 'empty sessions');
assertEq(tm1.config.cols, 80, 'default cols=80');
assertEq(tm1.config.rows, 24, 'default rows=24');
assert(typeof tm1.config.shell === 'string' && tm1.config.shell.length > 0, 'shell set');
assertEq(tm1.config.encoding, 'utf8', 'encoding utf8');

// ============================================================================
// createTerminal — basic
// ============================================================================
console.log('\n── createTerminal: basic ────────────────────────────────');

spawnCalls.length = 0;
quiet();
{
  const result = await tm1.createTerminal('s1');
  loud();
  assertEq(result.success, true, 'returns success');
  assertEq(result.sessionId, 's1', 'returns sessionId');
  assert(typeof result.pid === 'number', 'returns pid');
  assertEq(result.shell, tm1.config.shell, 'returns shell');
  assertEq(spawnCalls.length, 1, 'pty.spawn called once');
  assertEq(spawnCalls[0].shell, tm1.config.shell, 'spawn shell');
  assertEq(spawnCalls[0].args, [], 'spawn args empty');
  assertEq(spawnCalls[0].options.cols, 80, 'default cols');
  assertEq(spawnCalls[0].options.rows, 24, 'default rows');
  assertEq(spawnCalls[0].options.name, 'xterm-color', 'name xterm-color');
  assertEq(tm1.terminals.size, 1, 'stored 1 terminal');
  assertEq(tm1.terminalSessions.size, 1, 'stored 1 session');

  const session = tm1.terminalSessions.get('s1');
  assert(session !== undefined, 'session stored');
  assertEq(session.sessionId, 's1', 'sessionId');
  assertEq(session.isActive, true, 'isActive');
  assertEq(session.cols, 80, 'cols stored');
  assertEq(session.rows, 24, 'rows stored');
  assert(session.createdAt instanceof Date, 'createdAt Date');
  assert(session.lastActivity instanceof Date, 'lastActivity Date');
}

// Custom options
spawnCalls.length = 0;
quiet();
{
  await tm1.createTerminal('s2', {
    cols: 120, rows: 40, cwd: '/tmp', env: { FOO: 'bar' },
  });
  loud();
  assertEq(spawnCalls[0].options.cols, 120, 'custom cols');
  assertEq(spawnCalls[0].options.rows, 40, 'custom rows');
  assertEq(spawnCalls[0].options.cwd, '/tmp', 'custom cwd');
  assertEq(spawnCalls[0].options.env.FOO, 'bar', 'custom env merged');
  // Still has parent env (PATH etc)
  assert(spawnCalls[0].options.env !== undefined, 'env set');

  const session = tm1.terminalSessions.get('s2');
  assertEq(session.cols, 120, 'session cols');
  assertEq(session.rows, 40, 'session rows');
  assertEq(session.cwd, '/tmp', 'session cwd');
}

// Recreate — should close existing first
quiet();
const firstProc = tm1.terminals.get('s1') as FakePty;
{
  await tm1.createTerminal('s1');
  loud();
  assertEq(firstProc.killCalled, true, 'old pty killed on recreate');
  assertEq(tm1.terminals.size, 2, 'still 2 terminals (s1 replaced, s2 still)');
}

// ============================================================================
// writeToTerminal
// ============================================================================
console.log('\n── writeToTerminal ──────────────────────────────────────');

quiet();
{
  let caught: Error | null = null;
  try { await tm1.writeToTerminal('nonexistent', 'ls\n'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null && /not found/i.test(caught!.message), 'missing session throws');
}

quiet();
{
  const proc = tm1.terminals.get('s2') as FakePty;
  const before = tm1.terminalSessions.get('s2').lastActivity.getTime();
  await new Promise(r => setTimeout(r, 5));
  const ok = await tm1.writeToTerminal('s2', 'ls\n');
  loud();
  assertEq(ok, true, 'write returns true');
  assertEq(proc.writeLog.length, 1, 'pty.write called');
  assertEq(proc.writeLog[0], 'ls\n', 'data forwarded');
  const after = tm1.terminalSessions.get('s2').lastActivity.getTime();
  assert(after >= before, 'lastActivity updated');
}

// ============================================================================
// resizeTerminal
// ============================================================================
console.log('\n── resizeTerminal ───────────────────────────────────────');

quiet();
{
  let caught: Error | null = null;
  try { await tm1.resizeTerminal('nonexistent', 100, 50); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'missing session throws');
}

quiet();
{
  const proc = tm1.terminals.get('s2') as FakePty;
  const ok = await tm1.resizeTerminal('s2', 100, 50);
  loud();
  assertEq(ok, true, 'resize returns true');
  assertEq(proc.resizeLog.length, 1, 'pty.resize called');
  assertEq(proc.resizeLog[0], { cols: 100, rows: 50 }, 'dimensions forwarded');
  const session = tm1.terminalSessions.get('s2');
  assertEq(session.cols, 100, 'session cols updated');
  assertEq(session.rows, 50, 'session rows updated');
}

// ============================================================================
// getters
// ============================================================================
console.log('\n── getTerminalSession / getTerminalProcess ──────────────');

assertEq(tm1.getTerminalSession('missing'), null, 'missing session → null');
assertEq(tm1.getTerminalProcess('missing'), null, 'missing process → null');
assert(tm1.getTerminalSession('s2') !== null, 's2 session present');
assert(tm1.getTerminalProcess('s2') !== null, 's2 process present');

// ============================================================================
// closeTerminal
// ============================================================================
console.log('\n── closeTerminal ────────────────────────────────────────');

quiet();
{
  const proc = tm1.terminals.get('s2') as FakePty;
  const ok = await tm1.closeTerminal('s2');
  loud();
  assertEq(ok, true, 'close returns true');
  assertEq(proc.killCalled, true, 'pty.kill called');
  assert(!tm1.terminals.has('s2'), 's2 removed from terminals map');
  const session = tm1.terminalSessions.get('s2');
  assertEq(session.isActive, false, 'session marked inactive');
  assert(session.closedAt instanceof Date, 'closedAt set');
}

// Close nonexistent session → no throw, still returns true
quiet();
{
  const ok = await tm1.closeTerminal('ghost');
  loud();
  assertEq(ok, true, 'closing nonexistent returns true');
}

// ============================================================================
// getActiveSessions
// ============================================================================
console.log('\n── getActiveSessions ────────────────────────────────────');

// Add two active sessions to a fresh manager
quiet();
const tm2 = new TerminalManager();
await tm2.createTerminal('a');
await tm2.createTerminal('b');
await tm2.createTerminal('c');
await tm2.closeTerminal('b'); // mark b inactive
loud();

const active = tm2.getActiveSessions();
assertEq(active.length, 2, '2 active sessions');
const ids = active.map((s: any) => s.sessionId).sort();
assertEq(ids, ['a', 'c'], 'a and c active');
assert(active[0].sessionId !== undefined, 'has sessionId');
assert(active[0].pid !== undefined, 'has pid');
assert(active[0].shell !== undefined, 'has shell');

// ============================================================================
// cleanup — closes stale sessions
// ============================================================================
console.log('\n── cleanup ──────────────────────────────────────────────');

// Artificially age 'a' to 31 min ago
const sessionA = tm2.terminalSessions.get('a');
sessionA.lastActivity = new Date(Date.now() - 31 * 60 * 1000);
tm2.terminalSessions.set('a', sessionA);

quiet();
tm2.cleanup();
// cleanup calls closeTerminal async — give it a tick
await new Promise(r => setImmediate(r));
await new Promise(r => setImmediate(r));
loud();

// 'a' should be closed, 'c' still active
assertEq(tm2.terminalSessions.get('a').isActive, false, 'a closed by cleanup');
assertEq(tm2.terminalSessions.get('c').isActive, true, 'c still active');

// ============================================================================
// setupTerminalHandlers — data/exit/error forwarding
// ============================================================================
console.log('\n── setupTerminalHandlers ────────────────────────────────');

quiet();
const tm3 = new TerminalManager();
await tm3.createTerminal('h1');
loud();

const proc = tm3.terminals.get('h1') as FakePty;

// data event
let dataReceived: any = null;
proc.on('session_data', (sid: string, data: Buffer) => {
  dataReceived = { sid, data };
});
proc.emit('data', 'hello');
assert(dataReceived !== null, 'session_data emitted');
assertEq(dataReceived.sid, 'h1', 'session_data sid');

// exit event
let exitReceived: any = null;
proc.on('session_exit', (sid: string, code: number, signal: any) => {
  exitReceived = { sid, code, signal };
});
proc.emit('exit', 0, null);
assertEq(exitReceived.sid, 'h1', 'session_exit sid');
assertEq(exitReceived.code, 0, 'exit code');
const sessionH1 = tm3.terminalSessions.get('h1');
assertEq(sessionH1.isActive, false, 'session marked inactive after exit');
assertEq(sessionH1.exitCode, 0, 'exitCode stored');

// error event
let errorReceived: any = null;
proc.on('session_error', (sid: string, err: Error) => {
  errorReceived = { sid, err };
});
quiet();
proc.emit('error', new Error('boom'));
loud();
assertEq(errorReceived.sid, 'h1', 'session_error sid');
assert(errorReceived.err instanceof Error, 'error object passed');

// ============================================================================
// testTerminal — simulated output path
// ============================================================================
console.log('\n── testTerminal ─────────────────────────────────────────');

quiet();
const tm4 = new TerminalManager();

// Start the test terminal but don't await yet — we need to inject data
const testPromise = tm4.testTerminal();

// Wait one tick for createTerminal + handler setup
await new Promise(r => setImmediate(r));
await new Promise(r => setImmediate(r));

// Find the spawned test session process
let testProc: FakePty | null = null;
for (const [sid, p] of tm4.terminals as Map<string, FakePty>) {
  if (sid.startsWith('test-')) testProc = p;
}

if (testProc) {
  testProc.emit('data', 'JIT Terminal session active - PID: 1234');
}

const testResult = await testPromise.catch((e: any) => ({ error: e.message }));
loud();

assertEq((testResult as any).success, true, 'testTerminal resolves success');
assert(typeof (testResult as any).pid === 'number', 'returns pid');
assert(/active/i.test((testResult as any).output), 'captured output');

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
