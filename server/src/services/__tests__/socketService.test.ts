#!/usr/bin/env npx tsx
/**
 * Unit tests for services/socketService.js (OMD-1165)
 *
 * Socket.IO admin namespace wrapper for log monitoring. Dependencies:
 *   - socket.io (Server constructor)
 *   - ./logMonitor (EventEmitter with getStats/getLogBuffer)
 *
 * Both stubbed via require.cache before requiring the SUT.
 *
 * Coverage:
 *   - initialize: creates Server with CORS/path/transports, creates /admin
 *                 namespace, wires connection handler
 *   - connection handler: emits log-stats and log-buffer on connect,
 *                         wires disconnect/request-buffer/request-stats
 *   - logMonitor 'log-alert' handler: broadcasts alert + fresh stats
 *   - broadcastToAdmins: emits to namespace when present; no-op when null
 *   - getIO: returns internal io reference
 *
 * Run: npx tsx server/src/services/__tests__/socketService.test.ts
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

// ── Stub socket.io ───────────────────────────────────────────────────
type EmitCall = { event: string; data: any };
type NamespaceRef = {
  name: string;
  emitLog: EmitCall[];
  listeners: Record<string, Function[]>;
  emit: (event: string, data: any) => void;
  on: (event: string, handler: Function) => void;
};

function makeNamespace(name: string): NamespaceRef {
  const ns: NamespaceRef = {
    name,
    emitLog: [],
    listeners: {},
    emit(event, data) {
      this.emitLog.push({ event, data });
    },
    on(event, handler) {
      (this.listeners[event] = this.listeners[event] || []).push(handler);
    },
  };
  return ns;
}

type ServerRef = {
  httpServer: any;
  options: any;
  namespaces: Record<string, NamespaceRef>;
  of: (name: string) => NamespaceRef;
};

let lastServer: ServerRef | null = null;

class FakeIOServer implements ServerRef {
  httpServer: any;
  options: any;
  namespaces: Record<string, NamespaceRef> = {};

  constructor(httpServer: any, options: any) {
    this.httpServer = httpServer;
    this.options = options;
    lastServer = this;
  }

  of(name: string) {
    if (!this.namespaces[name]) {
      this.namespaces[name] = makeNamespace(name);
    }
    return this.namespaces[name];
  }
}

const socketIOPath = require.resolve('socket.io');
require.cache[socketIOPath] = {
  id: socketIOPath,
  filename: socketIOPath,
  loaded: true,
  exports: { Server: FakeIOServer },
} as any;

// ── Stub logMonitor ─────────────────────────────────────────────────
class FakeLogMonitor extends EventEmitter {
  statsValue: any = { errors: 0, warnings: 0 };
  bufferValue: any[] = [];
  getStats() { return this.statsValue; }
  getLogBuffer() { return this.bufferValue; }
}

const fakeLogMonitor = new FakeLogMonitor();
const logMonitorPath = require.resolve('../logMonitor');
require.cache[logMonitorPath] = {
  id: logMonitorPath,
  filename: logMonitorPath,
  loaded: true,
  exports: fakeLogMonitor,
} as any;

// Silence
const origLog = console.log;
function quiet() { console.log = () => {}; }
function loud() { console.log = origLog; }

const socketService = require('../socketService');

async function main() {

// ============================================================================
// getIO — initially null
// ============================================================================
console.log('\n── getIO: initial state ──────────────────────────────────');

assertEq(socketService.getIO(), null, 'io is null before initialize');

// ============================================================================
// broadcastToAdmins — no-op when uninitialized
// ============================================================================
console.log('\n── broadcastToAdmins: uninitialized ──────────────────────');

// Should not throw
socketService.broadcastToAdmins('test', { x: 1 });
assert(true, 'no throw when uninitialized');

// ============================================================================
// initialize
// ============================================================================
console.log('\n── initialize ────────────────────────────────────────────');

const fakeHttpServer = { _fake: true };
const allowedOrigins = ['https://example.com', 'https://admin.example.com'];

quiet();
fakeLogMonitor.statsValue = { errors: 3, warnings: 5 };
fakeLogMonitor.bufferValue = [{ level: 'error', message: 'test' }];
socketService.initialize(fakeHttpServer, allowedOrigins);
loud();

assert(lastServer !== null, 'Server constructed');
assertEq(lastServer!.httpServer, fakeHttpServer, 'httpServer passed through');
assertEq(lastServer!.options.cors.origin, allowedOrigins, 'CORS origin');
assertEq(lastServer!.options.cors.credentials, true, 'CORS credentials');
assertEq(lastServer!.options.cors.methods, ['GET', 'POST'], 'CORS methods');
assertEq(lastServer!.options.path, '/socket.io/', 'path');
assertEq(lastServer!.options.transports, ['websocket', 'polling'], 'transports');

// Admin namespace created
const adminNs = lastServer!.namespaces['/admin'];
assert(adminNs !== undefined, '/admin namespace created');
assert(Array.isArray(adminNs.listeners.connection), 'connection listener registered');
assertEq(adminNs.listeners.connection.length, 1, '1 connection listener');

// getIO now returns the fake server
assertEq(socketService.getIO(), lastServer, 'getIO returns server');

// ============================================================================
// Admin connection handler
// ============================================================================
console.log('\n── connection handler ────────────────────────────────────');

// Simulate a client connecting
const fakeSocket: any = {
  id: 'sock-1',
  emitLog: [] as EmitCall[],
  listeners: {} as Record<string, Function[]>,
  emit(event: string, data: any) { this.emitLog.push({ event, data }); },
  on(event: string, handler: Function) {
    (this.listeners[event] = this.listeners[event] || []).push(handler);
  },
};

quiet();
adminNs.listeners.connection[0](fakeSocket);
loud();

// On connect, should emit log-stats and log-buffer
assertEq(fakeSocket.emitLog.length, 2, '2 emits on connect');
assertEq(fakeSocket.emitLog[0].event, 'log-stats', 'first: log-stats');
assertEq(fakeSocket.emitLog[0].data, { errors: 3, warnings: 5 }, 'stats data');
assertEq(fakeSocket.emitLog[1].event, 'log-buffer', 'second: log-buffer');
assertEq(fakeSocket.emitLog[1].data, [{ level: 'error', message: 'test' }], 'buffer data');

// Disconnect listener registered
assert(Array.isArray(fakeSocket.listeners.disconnect), 'disconnect listener');
assert(Array.isArray(fakeSocket.listeners['request-buffer']), 'request-buffer listener');
assert(Array.isArray(fakeSocket.listeners['request-stats']), 'request-stats listener');

// ============================================================================
// request-buffer / request-stats handlers
// ============================================================================
console.log('\n── request handlers ──────────────────────────────────────');

fakeSocket.emitLog.length = 0;
fakeLogMonitor.bufferValue = [{ level: 'info', message: 'updated' }];
fakeSocket.listeners['request-buffer'][0]();
assertEq(fakeSocket.emitLog.length, 1, '1 emit from request-buffer');
assertEq(fakeSocket.emitLog[0].event, 'log-buffer', 'event name');
assertEq(fakeSocket.emitLog[0].data[0].message, 'updated', 'uses current buffer');

fakeSocket.emitLog.length = 0;
fakeLogMonitor.statsValue = { errors: 10, warnings: 20 };
fakeSocket.listeners['request-stats'][0]();
assertEq(fakeSocket.emitLog.length, 1, '1 emit from request-stats');
assertEq(fakeSocket.emitLog[0].event, 'log-stats', 'event name');
assertEq(fakeSocket.emitLog[0].data, { errors: 10, warnings: 20 }, 'current stats');

// Disconnect handler — should not throw
quiet();
fakeSocket.listeners.disconnect[0]();
loud();
assert(true, 'disconnect handler ok');

// ============================================================================
// log-alert event → broadcast to admin namespace
// ============================================================================
console.log('\n── log-alert broadcast ───────────────────────────────────');

adminNs.emitLog.length = 0;
fakeLogMonitor.statsValue = { errors: 11, warnings: 20 };
const alertEntry = { level: 'error', message: 'New alert' };
fakeLogMonitor.emit('log-alert', alertEntry);

assertEq(adminNs.emitLog.length, 2, '2 namespace emits');
assertEq(adminNs.emitLog[0].event, 'log-alert', 'log-alert emitted');
assertEq(adminNs.emitLog[0].data, alertEntry, 'alert data');
assertEq(adminNs.emitLog[1].event, 'log-stats', 'log-stats follows');
assertEq(adminNs.emitLog[1].data, { errors: 11, warnings: 20 }, 'fresh stats');

// ============================================================================
// broadcastToAdmins (post-init)
// ============================================================================
console.log('\n── broadcastToAdmins: initialized ────────────────────────');

adminNs.emitLog.length = 0;
socketService.broadcastToAdmins('custom-event', { foo: 'bar' });
assertEq(adminNs.emitLog.length, 1, '1 emit');
assertEq(adminNs.emitLog[0].event, 'custom-event', 'event');
assertEq(adminNs.emitLog[0].data, { foo: 'bar' }, 'data');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
