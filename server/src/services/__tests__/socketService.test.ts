#!/usr/bin/env npx tsx
/**
 * Unit tests for services/socketService.js (OMD-1186)
 *
 * Socket.IO wrapper that exposes an /admin namespace and bridges log-alerts
 * from the logMonitor EventEmitter. We stub `socket.io` and `./logMonitor`
 * via require.cache before requiring the SUT.
 *
 * The SUT module exports a singleton — we test it directly.
 *
 * Coverage:
 *   - initialize: constructs Server with cors/path/transports; creates
 *     /admin namespace; wires connection handler; wires logMonitor 'log-alert'
 *   - Admin connection handler: sends log-stats + log-buffer on connect;
 *     responds to 'request-buffer' and 'request-stats'; logs on disconnect
 *   - log-alert bridge: emits 'log-alert' + updated 'log-stats' to namespace
 *   - broadcastToAdmins: no-op if not initialized; emits when initialized
 *   - getIO: returns current io (null before init)
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

// ── logMonitor stub ──────────────────────────────────────────────────
const { EventEmitter } = require('events');

let statsReturn: any = { total: 0, errors: 0 };
let bufferReturn: any[] = [];

const logMonitorStub = Object.assign(new EventEmitter(), {
  getStats: () => statsReturn,
  getLogBuffer: () => bufferReturn,
});

// Stub both .js and (unlikely) .ts resolutions
function stubModule(relative: string, exports: any) {
  try {
    const p = require.resolve(relative);
    require.cache[p] = { id: p, filename: p, loaded: true, exports } as any;
  } catch {}
}
stubModule('../logMonitor', logMonitorStub);

// ── socket.io stub ───────────────────────────────────────────────────
type EmitCall = { event: string; data: any };
type OnCall = { event: string; handler: Function };

// Fake namespace — tracks emits, 'connection' handler, and exposes trigger
class FakeNamespace {
  emits: EmitCall[] = [];
  connectionHandler: Function | null = null;
  on(event: string, handler: Function) {
    if (event === 'connection') this.connectionHandler = handler;
    return this;
  }
  emit(event: string, data: any) {
    this.emits.push({ event, data });
    return true;
  }
  // Helper for tests
  simulateConnect(socket: FakeSocket) {
    if (this.connectionHandler) this.connectionHandler(socket);
  }
}

// Fake socket — records emits + registered event handlers
class FakeSocket {
  id: string;
  emits: EmitCall[] = [];
  handlers: Map<string, Function> = new Map();
  constructor(id: string) { this.id = id; }
  emit(event: string, data: any) { this.emits.push({ event, data }); return true; }
  on(event: string, handler: Function) { this.handlers.set(event, handler); return this; }
  trigger(event: string, ...args: any[]) {
    const h = this.handlers.get(event);
    if (h) h(...args);
  }
}

// Fake Server — records constructor options, `.of(namespace)` returns FakeNamespace
const serverConstructions: Array<{ httpServer: any; options: any }> = [];
let lastServer: FakeServer | null = null;

class FakeServer {
  namespaces: Map<string, FakeNamespace> = new Map();
  constructor(httpServer: any, options: any) {
    serverConstructions.push({ httpServer, options });
    lastServer = this;
  }
  of(path: string) {
    if (!this.namespaces.has(path)) this.namespaces.set(path, new FakeNamespace());
    return this.namespaces.get(path);
  }
}

const socketIoStub = { Server: FakeServer };
stubModule('socket.io', socketIoStub);

// Silence console
const origLog = console.log;
function quiet() { console.log = () => {}; }
function loud() { console.log = origLog; }

// ── Require SUT ──────────────────────────────────────────────────────
const socketService = require('../socketService');

async function main() {

// ============================================================================
// Pre-initialize state
// ============================================================================
console.log('\n── pre-init ──────────────────────────────────────────────');

assertEq(socketService.getIO(), null, 'getIO null before init');
// broadcastToAdmins is a no-op before init (no throw)
socketService.broadcastToAdmins('x', { a: 1 });
assert(true, 'broadcastToAdmins pre-init no-op (no throw)');

// ============================================================================
// initialize
// ============================================================================
console.log('\n── initialize ────────────────────────────────────────────');

const fakeHttpServer = { __name: 'http-server' };
const allowedOrigins = ['https://a.com', 'https://b.com'];

quiet();
socketService.initialize(fakeHttpServer, allowedOrigins);
loud();

assertEq(serverConstructions.length, 1, 'Server constructed once');
assertEq(serverConstructions[0].httpServer, fakeHttpServer, 'httpServer passed through');
assertEq(serverConstructions[0].options.cors.origin, allowedOrigins, 'cors.origin');
assertEq(serverConstructions[0].options.cors.credentials, true, 'cors.credentials');
assertEq(serverConstructions[0].options.cors.methods, ['GET', 'POST'], 'cors.methods');
assertEq(serverConstructions[0].options.path, '/socket.io/', 'path');
assertEq(serverConstructions[0].options.transports, ['websocket', 'polling'], 'transports');

// getIO now returns the server
assert(socketService.getIO() === lastServer, 'getIO returns server');

// /admin namespace was created
assert(lastServer !== null && lastServer.namespaces.has('/admin'), '/admin namespace created');
const adminNs = lastServer!.namespaces.get('/admin') as FakeNamespace;
assert(adminNs.connectionHandler !== null, 'connection handler registered');

// ============================================================================
// Admin connection: initial emits
// ============================================================================
console.log('\n── admin connection: initial state ───────────────────────');

statsReturn = { total: 42, errors: 3 };
bufferReturn = [{ level: 'info', msg: 'hi' }];

quiet();
const sock1 = new FakeSocket('sock-1');
adminNs.simulateConnect(sock1);
loud();

assertEq(sock1.emits.length, 2, 'two initial emits');
assertEq(sock1.emits[0].event, 'log-stats', 'first: log-stats');
assertEq(sock1.emits[0].data, statsReturn, 'stats data');
assertEq(sock1.emits[1].event, 'log-buffer', 'second: log-buffer');
assertEq(sock1.emits[1].data, bufferReturn, 'buffer data');
assert(sock1.handlers.has('disconnect'), 'disconnect handler set');
assert(sock1.handlers.has('request-buffer'), 'request-buffer handler set');
assert(sock1.handlers.has('request-stats'), 'request-stats handler set');

// ============================================================================
// Request handlers
// ============================================================================
console.log('\n── request-buffer / request-stats ────────────────────────');

sock1.emits.length = 0;
bufferReturn = [{ level: 'warn', msg: 'ok' }];
sock1.trigger('request-buffer');
assertEq(sock1.emits.length, 1, 'one emit on request-buffer');
assertEq(sock1.emits[0].event, 'log-buffer', 'event = log-buffer');
assertEq(sock1.emits[0].data, bufferReturn, 'buffer data refreshed');

sock1.emits.length = 0;
statsReturn = { total: 100, errors: 5 };
sock1.trigger('request-stats');
assertEq(sock1.emits.length, 1, 'one emit on request-stats');
assertEq(sock1.emits[0].event, 'log-stats', 'event = log-stats');
assertEq(sock1.emits[0].data, statsReturn, 'stats data refreshed');

// Disconnect handler just logs — should not throw
quiet();
sock1.trigger('disconnect');
loud();
assert(true, 'disconnect handler runs without error');

// ============================================================================
// log-alert bridge from logMonitor
// ============================================================================
console.log('\n── log-alert bridge ──────────────────────────────────────');

adminNs.emits.length = 0;
statsReturn = { total: 101, errors: 6 };
const alert = { level: 'error', msg: 'boom', timestamp: 'now' };
logMonitorStub.emit('log-alert', alert);

assertEq(adminNs.emits.length, 2, 'two namespace emits per log-alert');
assertEq(adminNs.emits[0].event, 'log-alert', 'first: log-alert');
assertEq(adminNs.emits[0].data, alert, 'alert payload');
assertEq(adminNs.emits[1].event, 'log-stats', 'second: log-stats');
assertEq(adminNs.emits[1].data, statsReturn, 'updated stats');

// ============================================================================
// broadcastToAdmins
// ============================================================================
console.log('\n── broadcastToAdmins ─────────────────────────────────────');

adminNs.emits.length = 0;
socketService.broadcastToAdmins('custom-event', { payload: 1 });
assertEq(adminNs.emits.length, 1, 'broadcast emits once');
assertEq(adminNs.emits[0].event, 'custom-event', 'custom event name');
assertEq(adminNs.emits[0].data, { payload: 1 }, 'custom event data');

// ============================================================================
// Multiple connections
// ============================================================================
console.log('\n── multiple connections ──────────────────────────────────');

statsReturn = { total: 200 };
bufferReturn = [];

quiet();
const sock2 = new FakeSocket('sock-2');
adminNs.simulateConnect(sock2);
const sock3 = new FakeSocket('sock-3');
adminNs.simulateConnect(sock3);
loud();

assertEq(sock2.emits.length, 2, 'sock2 got 2 emits');
assertEq(sock3.emits.length, 2, 'sock3 got 2 emits');
assertEq(sock2.emits[0].data, statsReturn, 'sock2 stats');
assertEq(sock3.emits[0].data, statsReturn, 'sock3 stats');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
