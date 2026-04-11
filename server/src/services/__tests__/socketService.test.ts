#!/usr/bin/env npx tsx
/**
 * Unit tests for services/socketService.js (OMD-1089)
 *
 * Singleton Socket.IO wrapper. Two external deps:
 *   - socket.io: named export `Server` (constructor we stub)
 *   - ./logMonitor: EventEmitter-ish object with getStats / getLogBuffer
 *
 * Both are replaced via require.cache BEFORE requiring the SUT.
 * The SUT is a singleton, so we can't get a fresh instance per test —
 * the key thing we test is that `initialize` wires everything up
 * correctly, which we can do by inspecting the fake Server instance
 * it ended up using and the handlers it registered.
 *
 * Coverage:
 *   - initialize: constructs Server with correct CORS/path/transports,
 *                 creates /admin namespace, registers connection handler
 *                 that emits log-stats + log-buffer + wires request-*
 *                 events + disconnect, subscribes to logMonitor 'log-alert'
 *                 and broadcasts both 'log-alert' and 'log-stats' on event
 *   - broadcastToAdmins: no-op when namespace unset, emits when set
 *   - getIO: returns internal io
 *
 * Run: npx tsx server/src/services/__tests__/socketService.test.ts
 */

import * as pathMod from 'path';

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

// ── Fake Socket.IO Server ───────────────────────────────────────────
type Handler = (...args: any[]) => void;

class FakeSocket {
  id: string;
  handlers: Record<string, Handler[]> = {};
  emitted: Array<{ event: string; data: any }> = [];
  constructor(id: string) { this.id = id; }
  on(event: string, cb: Handler) {
    (this.handlers[event] ||= []).push(cb);
  }
  emit(event: string, data: any) {
    this.emitted.push({ event, data });
  }
  trigger(event: string, ...args: any[]) {
    for (const h of (this.handlers[event] || [])) h(...args);
  }
}

class FakeNamespace {
  connectionHandlers: Handler[] = [];
  emitted: Array<{ event: string; data: any }> = [];
  on(event: string, cb: Handler) {
    if (event === 'connection') this.connectionHandlers.push(cb);
  }
  emit(event: string, data: any) {
    this.emitted.push({ event, data });
  }
  // Simulate a client connecting
  connectClient(socket: FakeSocket) {
    for (const h of this.connectionHandlers) h(socket);
  }
}

const fakeNamespaces: Record<string, FakeNamespace> = {};

class FakeServer {
  opts: any;
  httpServer: any;
  constructor(httpServer: any, opts: any) {
    this.httpServer = httpServer;
    this.opts = opts;
  }
  of(nsName: string) {
    if (!fakeNamespaces[nsName]) fakeNamespaces[nsName] = new FakeNamespace();
    return fakeNamespaces[nsName];
  }
}

// ── Fake logMonitor (EventEmitter-ish) ──────────────────────────────
const logMonitorListeners: Record<string, Handler[]> = {};
let currentStats: any = { total: 0, errors: 0 };
let currentBuffer: any[] = [];

const fakeLogMonitor = {
  getStats: () => currentStats,
  getLogBuffer: () => currentBuffer,
  on: (event: string, cb: Handler) => {
    (logMonitorListeners[event] ||= []).push(cb);
  },
  // Simulate an alert being emitted
  trigger: (event: string, payload: any) => {
    for (const h of (logMonitorListeners[event] || [])) h(payload);
  },
};

// ── Stub require.cache ──────────────────────────────────────────────
// socket.io — use its resolved path
const ioResolved = require.resolve('socket.io');
require.cache[ioResolved] = {
  id: ioResolved, filename: ioResolved, loaded: true,
  exports: { Server: FakeServer },
} as any;

// ./logMonitor — relative to services directory
function stubModule(relFromSrc: string, exports: any) {
  const absWithoutExt = pathMod.resolve(__dirname, '..', '..', relFromSrc);
  const resolved = require.resolve(absWithoutExt);
  require.cache[resolved] = {
    id: resolved, filename: resolved, loaded: true, exports,
  } as any;
}
stubModule('services/logMonitor', fakeLogMonitor);

const origLog = console.log;
function quiet() { console.log = () => {}; }
function loud() { console.log = origLog; }

const socketService = require('../socketService');

async function main() {

// ============================================================================
// Pre-init state
// ============================================================================
console.log('\n── pre-init ──────────────────────────────────────────────');

assertEq(socketService.getIO(), null, 'getIO null before initialize');

// broadcastToAdmins is a no-op when namespace is unset
socketService.broadcastToAdmins('test-event', { x: 1 });
assert(true, 'broadcastToAdmins no-op (no throw)');

// ============================================================================
// initialize
// ============================================================================
console.log('\n── initialize ────────────────────────────────────────────');

const fakeHttp = { __fake: true };
const origins = ['https://example.com'];

quiet();
socketService.initialize(fakeHttp, origins);
loud();

// io is set to a FakeServer instance with correct opts
const io = socketService.getIO();
assert(io !== null, 'getIO returns instance');
assert(io instanceof FakeServer, 'io is FakeServer');
assertEq(io.httpServer, fakeHttp, 'http server passed through');
assertEq(io.opts.cors.origin, origins, 'CORS origin');
assertEq(io.opts.cors.credentials, true, 'CORS credentials');
assertEq(io.opts.cors.methods, ['GET', 'POST'], 'CORS methods');
assertEq(io.opts.path, '/socket.io/', 'path');
assertEq(io.opts.transports, ['websocket', 'polling'], 'transports');

// /admin namespace was created
const adminNs = fakeNamespaces['/admin'];
assert(!!adminNs, '/admin namespace created');
assertEq(adminNs.connectionHandlers.length, 1, '1 connection handler registered');

// logMonitor 'log-alert' subscription was wired
assertEq((logMonitorListeners['log-alert'] || []).length, 1, 'log-alert listener registered');

// ============================================================================
// Admin client connection flow
// ============================================================================
console.log('\n── connection handler ────────────────────────────────────');

currentStats = { total: 42, errors: 3 };
currentBuffer = [{ level: 'info', msg: 'a' }, { level: 'error', msg: 'b' }];

const socket = new FakeSocket('sock-1');
quiet();
adminNs.connectClient(socket);
loud();

// Initial emits: log-stats then log-buffer
assertEq(socket.emitted.length, 2, '2 initial emits');
assertEq(socket.emitted[0].event, 'log-stats', 'first emit: log-stats');
assertEq(socket.emitted[0].data, currentStats, 'stats payload');
assertEq(socket.emitted[1].event, 'log-buffer', 'second emit: log-buffer');
assertEq(socket.emitted[1].data, currentBuffer, 'buffer payload');

// Socket handlers registered
assert('disconnect' in socket.handlers, 'disconnect handler');
assert('request-buffer' in socket.handlers, 'request-buffer handler');
assert('request-stats' in socket.handlers, 'request-stats handler');

// request-buffer emits fresh buffer
currentBuffer = [{ level: 'warn', msg: 'fresh' }];
socket.emitted.length = 0;
socket.trigger('request-buffer');
assertEq(socket.emitted.length, 1, 'request-buffer: 1 emit');
assertEq(socket.emitted[0].event, 'log-buffer', 'request-buffer: log-buffer event');
assertEq(socket.emitted[0].data, currentBuffer, 'request-buffer: fresh buffer');

// request-stats emits fresh stats
currentStats = { total: 100, errors: 5 };
socket.emitted.length = 0;
socket.trigger('request-stats');
assertEq(socket.emitted.length, 1, 'request-stats: 1 emit');
assertEq(socket.emitted[0].event, 'log-stats', 'request-stats: log-stats event');
assertEq(socket.emitted[0].data, currentStats, 'request-stats: fresh stats');

// disconnect is a no-op besides logging — doesn't throw
quiet();
socket.trigger('disconnect');
loud();
assert(true, 'disconnect no-op');

// ============================================================================
// logMonitor 'log-alert' → broadcast to /admin
// ============================================================================
console.log('\n── log-alert broadcast ───────────────────────────────────');

adminNs.emitted.length = 0;
currentStats = { total: 101, errors: 6 };
const alertEntry = { level: 'error', msg: 'boom', ts: 123 };

fakeLogMonitor.trigger('log-alert', alertEntry);

// Should emit both log-alert and log-stats
assertEq(adminNs.emitted.length, 2, '2 broadcasts');
assertEq(adminNs.emitted[0].event, 'log-alert', 'first: log-alert');
assertEq(adminNs.emitted[0].data, alertEntry, 'alert payload');
assertEq(adminNs.emitted[1].event, 'log-stats', 'second: log-stats');
assertEq(adminNs.emitted[1].data, currentStats, 'stats payload');

// ============================================================================
// broadcastToAdmins (post-init)
// ============================================================================
console.log('\n── broadcastToAdmins ─────────────────────────────────────');

adminNs.emitted.length = 0;
socketService.broadcastToAdmins('custom-event', { foo: 'bar' });
assertEq(adminNs.emitted.length, 1, '1 emit');
assertEq(adminNs.emitted[0].event, 'custom-event', 'event name');
assertEq(adminNs.emitted[0].data, { foo: 'bar' }, 'payload');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
