#!/usr/bin/env npx tsx
/**
 * Unit tests for services/socketService.js (OMD-1215)
 *
 * Thin wrapper over socket.io + logMonitor. Singleton pattern: the module
 * exports one `SocketService` instance.
 *
 * Strategy:
 *   - Stub `socket.io` with a fake `Server` class whose `.of(ns)` returns
 *     a recordable namespace that also extends EventEmitter-ish behavior
 *     so we can later simulate a 'connection' event with a fake socket.
 *   - Stub `./logMonitor` as an EventEmitter with scripted stats/buffer
 *     so we can also fire 'log-alert' to drive the fan-out path.
 *   - Stubs must be installed BEFORE requiring the SUT.
 *
 * Coverage:
 *   - initial state: io and adminNamespace null
 *   - initialize: constructs Server with correct CORS/path/transports
 *   - initialize: creates /admin namespace
 *   - connection handler:
 *       · emits log-stats + log-buffer on connection
 *       · responds to 'request-buffer' with current buffer
 *       · responds to 'request-stats' with current stats
 *       · disconnect logs (no crash)
 *   - logMonitor 'log-alert' → broadcast to admins + re-emit stats
 *   - broadcastToAdmins: no-op when not initialized
 *   - broadcastToAdmins: emits on namespace when initialized
 *   - getIO: returns io after initialize, null before
 *
 * Run: npx tsx server/src/services/__tests__/socketService.test.ts
 */

const { EventEmitter } = require('events');

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

// ── Fake socket.io Server ───────────────────────────────────────────
//
// Records constructor args; `.of(name)` returns a fake namespace that is
// also an EventEmitter so the SUT's `.on('connection', handler)` hooks
// up a real listener we can fire later.
//
// Namespace also has a scriptable `emits` log to verify broadcasts.

type Emit = { event: string; data: any };

class FakeNamespace extends EventEmitter {
  name: string;
  emits: Emit[] = [];
  constructor(name: string) {
    super();
    this.name = name;
  }
  emit(event: string, data?: any): boolean {
    // Record broadcast calls from the SUT.
    this.emits.push({ event, data });
    // Also invoke base EventEmitter so test-driven 'connection' fires handlers.
    return super.emit(event, data);
  }
}

class FakeSocket extends EventEmitter {
  id: string;
  emits: Emit[] = [];
  constructor(id: string) {
    super();
    this.id = id;
  }
  emit(event: string, data?: any): boolean {
    this.emits.push({ event, data });
    return super.emit(event, data);
  }
}

let lastServerArgs: { httpServer: any; opts: any } | null = null;
let lastServerInstance: FakeServer | null = null;
const createdNamespaces: Record<string, FakeNamespace> = {};

class FakeServer {
  constructor(httpServer: any, opts: any) {
    lastServerArgs = { httpServer, opts };
    lastServerInstance = this;
  }
  of(name: string): FakeNamespace {
    if (!createdNamespaces[name]) {
      createdNamespaces[name] = new FakeNamespace(name);
    }
    return createdNamespaces[name];
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

// ── Fake logMonitor ─────────────────────────────────────────────────
const fakeLogMonitor: any = new EventEmitter();
let currentStats: any = { total: 0, errors: 0 };
let currentBuffer: any[] = [];
fakeLogMonitor.getStats = () => currentStats;
fakeLogMonitor.getLogBuffer = () => currentBuffer;

const logMonitorPath = require.resolve('../logMonitor');
require.cache[logMonitorPath] = {
  id: logMonitorPath,
  filename: logMonitorPath,
  loaded: true,
  exports: fakeLogMonitor,
} as any;

// Silence console.log
const origLog = console.log;
function quiet() { console.log = () => {}; }
function loud() { console.log = origLog; }

// ── Load SUT ────────────────────────────────────────────────────────
const socketService = require('../socketService');

async function main() {

// ============================================================================
// Pre-initialize state
// ============================================================================
console.log('\n── pre-initialize state ──────────────────────────────────');

assertEq(socketService.getIO(), null, 'io null before initialize');

// broadcastToAdmins is a silent no-op when not initialized
{
  let threw = false;
  try { socketService.broadcastToAdmins('hello', { a: 1 }); }
  catch { threw = true; }
  assert(!threw, 'broadcastToAdmins pre-init: no throw');
}

// ============================================================================
// initialize
// ============================================================================
console.log('\n── initialize ────────────────────────────────────────────');

const fakeHttpServer = { __marker: 'http' };
const allowed = ['https://example.test', 'https://foo.test'];
quiet();
socketService.initialize(fakeHttpServer, allowed);
loud();

assert(lastServerArgs !== null, 'Server constructor called');
assertEq(
  (lastServerArgs as any).httpServer,
  fakeHttpServer,
  'httpServer forwarded',
);
assertEq((lastServerArgs as any).opts.cors.origin, allowed, 'cors.origin = allowedOrigins');
assertEq((lastServerArgs as any).opts.cors.credentials, true, 'cors.credentials true');
assertEq((lastServerArgs as any).opts.cors.methods, ['GET', 'POST'], 'cors.methods');
assertEq((lastServerArgs as any).opts.path, '/socket.io/', 'path');
assertEq((lastServerArgs as any).opts.transports, ['websocket', 'polling'], 'transports');

assert(createdNamespaces['/admin'] !== undefined, '/admin namespace created');
assertEq(socketService.getIO(), lastServerInstance, 'getIO returns server');

// ============================================================================
// connection handler: stats + buffer emitted on connect
// ============================================================================
console.log('\n── connection handler: initial emits ─────────────────────');

currentStats = { total: 42, errors: 3 };
currentBuffer = [{ msg: 'hello' }, { msg: 'world' }];

const sock = new FakeSocket('sock-1');
quiet();
createdNamespaces['/admin'].emit('connection', sock);
loud();

// Socket should have received log-stats then log-buffer
assertEq(sock.emits.length, 2, 'initial: 2 emits to socket');
assertEq(sock.emits[0].event, 'log-stats', 'initial: log-stats first');
assertEq(sock.emits[0].data, { total: 42, errors: 3 }, 'initial: stats payload');
assertEq(sock.emits[1].event, 'log-buffer', 'initial: log-buffer second');
assertEq(
  sock.emits[1].data,
  [{ msg: 'hello' }, { msg: 'world' }],
  'initial: buffer payload',
);

// ============================================================================
// connection handler: request-buffer / request-stats
// ============================================================================
console.log('\n── connection handler: request-* ─────────────────────────');

currentBuffer = [{ msg: 'new entry' }];
sock.emits.length = 0;
sock.emit = function (event: string, data?: any): boolean {
  // Re-record; the 'request-*' handlers call sock.emit
  sock.emits.push({ event, data });
  return true;
};

// Fire request-buffer → handler should push log-buffer back
sock.listeners('request-buffer')[0]?.();
assertEq(sock.emits.length, 1, 'request-buffer: 1 emit');
assertEq(sock.emits[0].event, 'log-buffer', 'request-buffer: emits log-buffer');
assertEq(sock.emits[0].data, [{ msg: 'new entry' }], 'request-buffer: latest buffer');

currentStats = { total: 99, errors: 7 };
sock.emits.length = 0;
sock.listeners('request-stats')[0]?.();
assertEq(sock.emits.length, 1, 'request-stats: 1 emit');
assertEq(sock.emits[0].event, 'log-stats', 'request-stats: emits log-stats');
assertEq(sock.emits[0].data, { total: 99, errors: 7 }, 'request-stats: latest stats');

// disconnect handler: should run without error
{
  let threw = false;
  try {
    quiet();
    sock.listeners('disconnect')[0]?.();
    loud();
  } catch { threw = true; }
  assert(!threw, 'disconnect handler: no throw');
}

// ============================================================================
// log-alert fan-out
// ============================================================================
console.log('\n── log-alert fan-out ─────────────────────────────────────');

const adminNs = createdNamespaces['/admin'];
adminNs.emits.length = 0;

currentStats = { total: 100, errors: 10 };
const alertEntry = { level: 'error', message: 'disk full' };
fakeLogMonitor.emit('log-alert', alertEntry);

// SUT should have fanned out 2 events on the namespace
assert(adminNs.emits.length >= 2, 'namespace received >= 2 emits');
const events = adminNs.emits.map(e => e.event);
assert(events.includes('log-alert'), 'fan-out includes log-alert');
assert(events.includes('log-stats'), 'fan-out includes log-stats');

const alertEmit = adminNs.emits.find(e => e.event === 'log-alert');
assertEq(alertEmit?.data, alertEntry, 'log-alert payload matches');
const statsEmit = adminNs.emits.find(e => e.event === 'log-stats');
assertEq(statsEmit?.data, { total: 100, errors: 10 }, 'log-stats payload current');

// ============================================================================
// broadcastToAdmins (initialized)
// ============================================================================
console.log('\n── broadcastToAdmins: initialized ────────────────────────');

adminNs.emits.length = 0;
socketService.broadcastToAdmins('custom-event', { x: 1 });
assertEq(adminNs.emits.length, 1, 'one emit from broadcastToAdmins');
assertEq(adminNs.emits[0].event, 'custom-event', 'correct event name');
assertEq(adminNs.emits[0].data, { x: 1 }, 'correct payload');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
