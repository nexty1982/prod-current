#!/usr/bin/env npx tsx
/**
 * Unit tests for services/socketService.js (OMD-1145)
 *
 * Thin wrapper around Socket.IO for admin log-monitoring. Exports a
 * singleton SocketService instance. Dependencies:
 *   - `socket.io` Server class
 *   - `./logMonitor` (EventEmitter with getStats/getLogBuffer)
 *
 * Strategy: stub both via require.cache BEFORE requiring the SUT.
 * The socket.io stub exposes a fake Server whose `.of()` returns a
 * fake namespace that records emits and supports `.on()` for event
 * registration. logMonitor is a minimal EventEmitter-like object with
 * scripted getStats/getLogBuffer responses.
 *
 * Coverage:
 *   - Singleton exports the expected class shape
 *   - Initial state: io = null, adminNamespace = null
 *   - getIO() before init → null; after init → fake io
 *   - broadcastToAdmins: no-op when adminNamespace is null;
 *                        delegates to namespace.emit when set
 *   - initialize():
 *       · creates Server with correct CORS/path/transports config
 *       · passes allowedOrigins through to Server options
 *       · calls io.of('/admin') to create admin namespace
 *       · registers 'connection' handler
 *       · wires logMonitor 'log-alert' → namespace.emit
 *   - connection handler:
 *       · emits 'log-stats' + 'log-buffer' on connect
 *       · 'request-buffer' re-emits buffer
 *       · 'request-stats' re-emits stats
 *       · 'disconnect' handler registered
 *   - log-alert propagation: emits log-alert AND log-stats
 *
 * Run: npx tsx server/src/services/__tests__/socketService.test.ts
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

// ── socket.io Server stub ────────────────────────────────────────────
type EmitRecord = { event: string; data: any };
type HandlerMap = Record<string, Function[]>;

// Fake socket passed to 'connection' handler
function makeFakeSocket(id: string) {
  const emits: EmitRecord[] = [];
  const handlers: HandlerMap = {};
  return {
    id,
    emits,
    handlers,
    emit: (event: string, data?: any) => { emits.push({ event, data }); },
    on: (event: string, handler: Function) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    },
    // helper to simulate client-side event
    fire: (event: string, ...args: any[]) => {
      (handlers[event] || []).forEach(h => h(...args));
    },
  };
}

// Fake namespace returned by io.of('/admin')
type FakeNamespace = {
  emits: EmitRecord[];
  connectionHandlers: Function[];
  emit: (event: string, data?: any) => void;
  on: (event: string, handler: Function) => void;
  // helper: simulate a new client connection
  fireConnection: (socket: any) => void;
};

function makeFakeNamespace(): FakeNamespace {
  const emits: EmitRecord[] = [];
  const connectionHandlers: Function[] = [];
  return {
    emits,
    connectionHandlers,
    emit: (event, data) => { emits.push({ event, data }); },
    on: (event, handler) => {
      if (event === 'connection') connectionHandlers.push(handler);
    },
    fireConnection(socket) {
      connectionHandlers.forEach(h => h(socket));
    },
  };
}

// Capture Server construction arguments + instance
type ServerCall = { httpServer: any; options: any };
const serverCalls: ServerCall[] = [];
let lastNamespace: FakeNamespace | null = null;
let lastIoInstance: any = null;

class FakeServer {
  httpServer: any;
  options: any;
  constructor(httpServer: any, options: any) {
    this.httpServer = httpServer;
    this.options = options;
    serverCalls.push({ httpServer, options });
    lastIoInstance = this;
  }
  of(_path: string) {
    lastNamespace = makeFakeNamespace();
    return lastNamespace;
  }
}

const socketIoStub = { Server: FakeServer };

const socketIoPath = require.resolve('socket.io');
require.cache[socketIoPath] = {
  id: socketIoPath,
  filename: socketIoPath,
  loaded: true,
  exports: socketIoStub,
} as any;

// ── logMonitor stub ──────────────────────────────────────────────────
let statsValue: any = { total: 0, errors: 0 };
let bufferValue: any[] = [];
const logMonitorHandlers: HandlerMap = {};

const logMonitorStub = {
  getStats: () => statsValue,
  getLogBuffer: () => bufferValue,
  on: (event: string, handler: Function) => {
    if (!logMonitorHandlers[event]) logMonitorHandlers[event] = [];
    logMonitorHandlers[event].push(handler);
  },
  // test helper
  fire: (event: string, ...args: any[]) => {
    (logMonitorHandlers[event] || []).forEach(h => h(...args));
  },
};

const logMonitorPath = require.resolve('../logMonitor');
require.cache[logMonitorPath] = {
  id: logMonitorPath,
  filename: logMonitorPath,
  loaded: true,
  exports: logMonitorStub,
} as any;

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

function resetState() {
  serverCalls.length = 0;
  lastNamespace = null;
  lastIoInstance = null;
  statsValue = { total: 0, errors: 0 };
  bufferValue = [];
  Object.keys(logMonitorHandlers).forEach(k => delete logMonitorHandlers[k]);
}

const socketService = require('../socketService');

async function main() {

// ============================================================================
// Singleton shape
// ============================================================================
console.log('\n── Singleton shape ───────────────────────────────────────');

assert(typeof socketService === 'object', 'exports an object');
assert(typeof socketService.initialize === 'function', 'has initialize()');
assert(typeof socketService.broadcastToAdmins === 'function', 'has broadcastToAdmins()');
assert(typeof socketService.getIO === 'function', 'has getIO()');

// ============================================================================
// Initial state
// ============================================================================
console.log('\n── Initial state ─────────────────────────────────────────');

assertEq(socketService.io, null, 'io starts null');
assertEq(socketService.adminNamespace, null, 'adminNamespace starts null');
assertEq(socketService.getIO(), null, 'getIO() returns null initially');

// ============================================================================
// broadcastToAdmins — no-op before init
// ============================================================================
console.log('\n── broadcastToAdmins: before init ────────────────────────');

// Should not throw when adminNamespace is null
socketService.broadcastToAdmins('test', { foo: 'bar' });
assert(true, 'no-op before init does not throw');

// ============================================================================
// initialize
// ============================================================================
console.log('\n── initialize ────────────────────────────────────────────');

resetState();
quiet();
{
  const fakeHttpServer = { fake: 'http-server' };
  const allowedOrigins = ['https://example.com', 'https://foo.com'];
  socketService.initialize(fakeHttpServer, allowedOrigins);
  loud();

  assertEq(serverCalls.length, 1, 'Server constructed once');
  assertEq(serverCalls[0].httpServer, fakeHttpServer, 'httpServer passed through');
  assertEq(serverCalls[0].options.cors.origin, allowedOrigins, 'allowedOrigins in CORS');
  assertEq(serverCalls[0].options.cors.credentials, true, 'credentials=true');
  assertEq(serverCalls[0].options.cors.methods, ['GET', 'POST'], 'methods set');
  assertEq(serverCalls[0].options.path, '/socket.io/', 'socket.io path');
  assertEq(serverCalls[0].options.transports, ['websocket', 'polling'], 'transports set');

  assertEq(socketService.io, lastIoInstance, 'io assigned to instance');
  assertEq(socketService.getIO(), lastIoInstance, 'getIO() returns instance');
  assert(socketService.adminNamespace !== null, 'adminNamespace set');
  assertEq(socketService.adminNamespace, lastNamespace, 'adminNamespace is from of(/admin)');

  // Connection handler registered
  assertEq(lastNamespace!.connectionHandlers.length, 1, 'one connection handler');

  // logMonitor 'log-alert' handler registered
  assertEq((logMonitorHandlers['log-alert'] || []).length, 1, 'log-alert handler registered');
}

// ============================================================================
// Connection handler emits on connect
// ============================================================================
console.log('\n── Connection: emits on connect ──────────────────────────');

statsValue = { total: 5, errors: 1 };
bufferValue = [{ msg: 'entry1' }, { msg: 'entry2' }];
{
  const sock = makeFakeSocket('client-A');
  quiet();
  lastNamespace!.fireConnection(sock);
  loud();

  // Should have emitted log-stats and log-buffer
  const events = sock.emits.map(e => e.event);
  assert(events.includes('log-stats'), 'emits log-stats on connect');
  assert(events.includes('log-buffer'), 'emits log-buffer on connect');

  const stats = sock.emits.find(e => e.event === 'log-stats');
  assertEq(stats!.data, { total: 5, errors: 1 }, 'log-stats data');
  const buf = sock.emits.find(e => e.event === 'log-buffer');
  assertEq(buf!.data, [{ msg: 'entry1' }, { msg: 'entry2' }], 'log-buffer data');

  // Socket handlers registered
  assert('disconnect' in sock.handlers, 'disconnect handler registered');
  assert('request-buffer' in sock.handlers, 'request-buffer handler registered');
  assert('request-stats' in sock.handlers, 'request-stats handler registered');
}

// ============================================================================
// 'request-buffer' re-emits buffer
// ============================================================================
console.log('\n── Connection: request-buffer ────────────────────────────');

{
  bufferValue = [{ msg: 'fresh' }];
  const sock = makeFakeSocket('client-B');
  quiet();
  lastNamespace!.fireConnection(sock);
  loud();

  sock.emits.length = 0; // reset

  bufferValue = [{ msg: 'updated' }];
  sock.fire('request-buffer');

  const buf = sock.emits.find(e => e.event === 'log-buffer');
  assert(buf !== undefined, 'buffer emitted in response');
  assertEq(buf!.data, [{ msg: 'updated' }], 'fresh buffer value');
}

// ============================================================================
// 'request-stats' re-emits stats
// ============================================================================
console.log('\n── Connection: request-stats ─────────────────────────────');

{
  statsValue = { total: 10, errors: 2 };
  const sock = makeFakeSocket('client-C');
  quiet();
  lastNamespace!.fireConnection(sock);
  loud();

  sock.emits.length = 0;

  statsValue = { total: 20, errors: 5 };
  sock.fire('request-stats');

  const stats = sock.emits.find(e => e.event === 'log-stats');
  assert(stats !== undefined, 'stats emitted in response');
  assertEq(stats!.data, { total: 20, errors: 5 }, 'fresh stats value');
}

// ============================================================================
// 'disconnect' handler logs (does not throw)
// ============================================================================
console.log('\n── Connection: disconnect ────────────────────────────────');

{
  const sock = makeFakeSocket('client-D');
  quiet();
  lastNamespace!.fireConnection(sock);
  // Just verify disconnect handler is callable without error
  try {
    sock.fire('disconnect');
    loud();
    assert(true, 'disconnect handler runs without error');
  } catch (e) {
    loud();
    assert(false, `disconnect handler threw: ${e}`);
  }
}

// ============================================================================
// log-alert propagation → namespace
// ============================================================================
console.log('\n── logMonitor log-alert → namespace ──────────────────────');

{
  lastNamespace!.emits.length = 0;
  statsValue = { total: 99, errors: 3 };

  const alertEntry = { severity: 'error', message: 'boom' };
  quiet();
  logMonitorStub.fire('log-alert', alertEntry);
  loud();

  // Should emit 'log-alert' AND 'log-stats'
  const events = lastNamespace!.emits.map(e => e.event);
  assert(events.includes('log-alert'), 'log-alert broadcast');
  assert(events.includes('log-stats'), 'log-stats broadcast after alert');

  const alertEmit = lastNamespace!.emits.find(e => e.event === 'log-alert');
  assertEq(alertEmit!.data, alertEntry, 'alert data forwarded');

  const statsEmit = lastNamespace!.emits.find(e => e.event === 'log-stats');
  assertEq(statsEmit!.data, { total: 99, errors: 3 }, 'stats snapshot');
}

// ============================================================================
// broadcastToAdmins after init
// ============================================================================
console.log('\n── broadcastToAdmins: after init ─────────────────────────');

{
  lastNamespace!.emits.length = 0;
  socketService.broadcastToAdmins('custom-event', { hello: 'world' });
  assertEq(lastNamespace!.emits.length, 1, 'namespace emit called once');
  assertEq(lastNamespace!.emits[0].event, 'custom-event', 'event name');
  assertEq(lastNamespace!.emits[0].data, { hello: 'world' }, 'event data');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
