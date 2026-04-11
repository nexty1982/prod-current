#!/usr/bin/env npx tsx
/**
 * Unit tests for services/omaiWatchdogService.js (OMD-1142)
 *
 * OMAI Watchdog: monitors log files, classifies severity, fires alerts,
 * maintains a daily summary. The class is constructed as a singleton but
 * the constructor calls `initialize()` which touches fs (readFile, mkdir)
 * and potentially `spawn('tail')`. We stub those so the constructor is
 * safe, then exercise pure helpers.
 *
 * Stubbed before require:
 *   - fs (promises.readFile → ENOENT, mkdir → noop, stat → ENOENT, writeFile → noop)
 *   - child_process (spawn → inert EventEmitter-like, execSync → noop)
 *   - ../utils/logger (silent)
 *
 * Coverage (pure / near-pure methods):
 *   - compilePatterns             → blocked + severity regexes
 *   - detectSeverity              → first match wins (critical → info fallback)
 *   - categorizeLogEntry          → path-based routing
 *   - parseLogLine                → IP / service / errorCode extraction
 *   - shouldAlert                 → alertLevel threshold + quiet hours override
 *   - isQuietHours                → non-span AND span-midnight branches
 *   - generateAlertTitle          → all branches
 *   - generateAlertMessage        → IP + category + errorCode + long-msg truncation
 *   - generateSuggestedActions    → block_ip / restart_service / check_mysql / system_status
 *   - parseFrequency              → m / h / d / invalid default
 *   - addToDailySummary           → init, counters, null safety, date reset
 *   - createAlert                 → ring buffer respects maxAlerts, emits
 *   - getAlerts                   → severity / category / acknowledged filters + limit
 *   - acknowledgeAlert            → updates + returns boolean
 *   - getSystemStatus             → shape
 *   - generateSummaryNarrative    → key phrases included
 *   - generateDailySummary        → returns narrative, emits
 *
 * Run: npx tsx server/src/services/__tests__/omaiWatchdogService.test.ts
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

// ── fs stub ──────────────────────────────────────────────────────────
// SUT: const fs = require('fs').promises
// We stub the whole fs module so require('fs').promises returns our fakes.
const enoent = (): Error => {
  const e: any = new Error('ENOENT: no such file');
  e.code = 'ENOENT';
  return e;
};

const fsPath = require.resolve('fs');
const origFs = require('fs');
const fsStub = {
  ...origFs,
  promises: {
    readFile: async () => { throw enoent(); },
    writeFile: async () => { /* noop */ },
    mkdir: async () => { /* noop */ },
    stat: async () => { throw enoent(); },
  },
};
require.cache[fsPath] = {
  id: fsPath,
  filename: fsPath,
  loaded: true,
  exports: fsStub,
} as any;

// ── child_process stub ───────────────────────────────────────────────
const cpPath = require.resolve('child_process');
const origCp = require('child_process');
function fakeSpawn() {
  const proc: any = {
    stdout: { on: () => {} },
    stderr: { on: () => {} },
    on: () => {},
    kill: () => {},
  };
  return proc;
}
function fakeExecSync() {
  return '';
}
require.cache[cpPath] = {
  id: cpPath,
  filename: cpPath,
  loaded: true,
  exports: { ...origCp, spawn: fakeSpawn, execSync: fakeExecSync },
} as any;

// ── logger stub ──────────────────────────────────────────────────────
const loggerPath = require.resolve('../../utils/logger');
require.cache[loggerPath] = {
  id: loggerPath,
  filename: loggerPath,
  loaded: true,
  exports: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
} as any;

// ── silence console during noisy sections ───────────────────────────
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function loud() {
  console.log = origLog;
  console.warn = origWarn;
  console.error = origError;
}

// ── Fake time helper (for isQuietHours) ──────────────────────────────
function withFakeTime(hh: number, mm: number, fn: () => void): void {
  const origH = Date.prototype.getHours;
  const origM = Date.prototype.getMinutes;
  Date.prototype.getHours = function () { return hh; };
  Date.prototype.getMinutes = function () { return mm; };
  try { fn(); }
  finally {
    Date.prototype.getHours = origH;
    Date.prototype.getMinutes = origM;
  }
}

// ── Import SUT ───────────────────────────────────────────────────────
const OMAIWatchdogService = require('../omaiWatchdogService');

async function main() {

// Construct one shared instance. The constructor's initialize() is async
// and fire-and-forget; with our fs stubs it no-ops quickly.
quiet();
const svc = new OMAIWatchdogService();
loud();

// Wait a tick for initialize()'s pending promises to settle.
await new Promise((r) => setImmediate(r));

// ============================================================================
// compilePatterns
// ============================================================================
console.log('\n── compilePatterns ───────────────────────────────────────');

const patterns = svc.compilePatterns();
assert(patterns.critical instanceof RegExp, 'critical is RegExp');
assert(patterns.error instanceof RegExp, 'error is RegExp');
assert(patterns.warning instanceof RegExp, 'warning is RegExp');
assert(patterns.info instanceof RegExp, 'info is RegExp');
assert(patterns.blocked instanceof RegExp, 'blocked is RegExp');
assert(patterns.critical.test('Kernel panic at pc'), 'critical matches "panic"');
assert(patterns.blocked.test('User entered password=xxx'), 'blocked matches "password"');
assert(patterns.blocked.test('api_token=abc'), 'blocked matches "token"');

// ============================================================================
// detectSeverity
// ============================================================================
console.log('\n── detectSeverity ────────────────────────────────────────');

assertEq(svc.detectSeverity('kernel panic detected'), 'critical', 'panic → critical');
assertEq(svc.detectSeverity('out of memory killer'), 'critical', 'OOM → critical');
assertEq(svc.detectSeverity('connection error'), 'error', 'error → error');
assertEq(svc.detectSeverity('authentication failure'), 'error', 'auth failure → error');
assertEq(svc.detectSeverity('request timeout'), 'error', 'timeout → error');
assertEq(svc.detectSeverity('slow query detected'), 'warning', 'slow → warning');
assertEq(svc.detectSeverity('deprecated API'), 'warning', 'deprecated → warning');
assertEq(svc.detectSeverity('user login successful'), 'info', 'login → info');
assertEq(svc.detectSeverity('system started'), 'info', 'start → info');
assertEq(svc.detectSeverity('nothing interesting'), 'info', 'fallback → info');
// Precedence: critical beats error beats warning beats info
assertEq(
  svc.detectSeverity('panic error warn info'),
  'critical',
  'critical precedence'
);

// ============================================================================
// categorizeLogEntry
// ============================================================================
console.log('\n── categorizeLogEntry ────────────────────────────────────');

assertEq(svc.categorizeLogEntry('x', '/var/log/auth.log'), 'authentication', 'auth.log');
assertEq(svc.categorizeLogEntry('x', '/var/log/nginx/error.log'), 'webserver', 'nginx');
assertEq(svc.categorizeLogEntry('x', '/var/log/apache2/error.log'), 'webserver', 'apache');
assertEq(svc.categorizeLogEntry('x', '/var/log/mysql/error.log'), 'database', 'mysql');
assertEq(svc.categorizeLogEntry('x', '/var/log/mariadb.log'), 'database', 'mariadb');
assertEq(svc.categorizeLogEntry('x', '/var/log/kern.log'), 'kernel', 'kern.log');
assertEq(svc.categorizeLogEntry('x', '/var/log/pm2/pm2.log'), 'application', 'pm2');
assertEq(svc.categorizeLogEntry('x', '/var/log/omai/watchdog.log'), 'omai', 'omai');
assertEq(svc.categorizeLogEntry('x', '/var/log/other.log'), 'system', 'default system');

// ============================================================================
// parseLogLine
// ============================================================================
console.log('\n── parseLogLine ──────────────────────────────────────────');

{
  const entry = svc.parseLogLine(
    '/var/log/nginx/error.log',
    '2026-04-11 nginx: 192.168.1.42 triggered 500 error during request'
  );
  assertEq(entry.filePath, '/var/log/nginx/error.log', 'filePath preserved');
  assertEq(entry.severity, 'error', 'severity detected');
  assertEq(entry.ip, '192.168.1.42', 'IP extracted');
  assertEq(entry.service, 'nginx', 'service lowercased');
  assertEq(entry.errorCode, 500, 'errorCode parsed as int');
  assertEq(entry.category, 'webserver', 'category from path');
  assert(typeof entry.timestamp === 'string', 'timestamp set');
  assert(entry.message.includes('nginx'), 'message preserved');
}

{
  // No IP / no service / no errorCode
  const entry = svc.parseLogLine('/var/log/plain.log', 'system up and running');
  assertEq(entry.ip, null, 'no IP → null');
  assertEq(entry.service, null, 'no service → null');
  assertEq(entry.errorCode, null, 'no errorCode → null');
  assertEq(entry.severity, 'info', 'default info');
  assertEq(entry.category, 'system', 'default system');
}

{
  // errorCode match: 404 in a string of digits-only near the boundary
  const entry = svc.parseLogLine('/var/log/nginx/access.log', 'GET /foo 404 not found');
  assertEq(entry.errorCode, 404, '404 extracted');
}

// ============================================================================
// shouldAlert
// ============================================================================
console.log('\n── shouldAlert ───────────────────────────────────────────');

// Force out of quiet hours (12:30 — middle of the day)
svc.config.alertLevel = 'warning';
svc.config.quietHours = { start: '01:00', end: '06:00' };
withFakeTime(12, 30, () => {
  assertEq(
    svc.shouldAlert({ severity: 'info' }),
    false,
    'info < warning → suppressed'
  );
  assertEq(
    svc.shouldAlert({ severity: 'warning' }),
    true,
    'warning == threshold → allowed'
  );
  assertEq(
    svc.shouldAlert({ severity: 'error' }),
    true,
    'error > threshold → allowed'
  );
  assertEq(
    svc.shouldAlert({ severity: 'critical' }),
    true,
    'critical → allowed'
  );
});

// Quiet hours: only critical allowed
withFakeTime(2, 30, () => {
  assertEq(
    svc.shouldAlert({ severity: 'warning' }),
    false,
    'quiet hours: warning blocked'
  );
  assertEq(
    svc.shouldAlert({ severity: 'error' }),
    false,
    'quiet hours: error blocked'
  );
  assertEq(
    svc.shouldAlert({ severity: 'critical' }),
    true,
    'quiet hours: critical still fires'
  );
});

// alertLevel = 'critical' → everything below blocked
svc.config.alertLevel = 'critical';
withFakeTime(12, 0, () => {
  assertEq(svc.shouldAlert({ severity: 'error' }), false, 'crit level blocks error');
  assertEq(svc.shouldAlert({ severity: 'critical' }), true, 'crit level allows crit');
});
svc.config.alertLevel = 'warning'; // restore

// ============================================================================
// isQuietHours
// ============================================================================
console.log('\n── isQuietHours ──────────────────────────────────────────');

// Non-span branch (start <= end): 01:00..06:00
svc.config.quietHours = { start: '01:00', end: '06:00' };
withFakeTime(3, 30, () => {
  assertEq(svc.isQuietHours(), true, 'non-span: 03:30 inside');
});
withFakeTime(7, 0, () => {
  assertEq(svc.isQuietHours(), false, 'non-span: 07:00 outside');
});
withFakeTime(0, 30, () => {
  assertEq(svc.isQuietHours(), false, 'non-span: 00:30 before start');
});

// Span-midnight: start=22:00 end=05:00
svc.config.quietHours = { start: '22:00', end: '05:00' };
withFakeTime(23, 15, () => {
  assertEq(svc.isQuietHours(), true, 'span: 23:15 after start');
});
withFakeTime(3, 0, () => {
  assertEq(svc.isQuietHours(), true, 'span: 03:00 before end');
});
withFakeTime(10, 0, () => {
  assertEq(svc.isQuietHours(), false, 'span: 10:00 outside');
});

svc.config.quietHours = { start: '01:00', end: '06:00' }; // restore

// ============================================================================
// generateAlertTitle
// ============================================================================
console.log('\n── generateAlertTitle ────────────────────────────────────');

assertEq(
  svc.generateAlertTitle({
    severity: 'error',
    category: 'authentication',
    message: 'failed password for root',
  }),
  'Authentication failure detected',
  'auth failure title'
);

assertEq(
  svc.generateAlertTitle({
    severity: 'error',
    category: 'webserver',
    service: 'nginx',
    errorCode: 500,
    message: '500 error',
  }),
  'HTTP 500 error in nginx',
  'http errorCode title'
);

assertEq(
  svc.generateAlertTitle({
    severity: 'error',
    category: 'webserver',
    errorCode: 404,
    message: '404 not found',
  }),
  'HTTP 404 error in web server',
  'http errorCode fallback "web server"'
);

assertEq(
  svc.generateAlertTitle({
    severity: 'critical',
    category: 'system',
    message: 'kernel panic',
  }),
  'Critical system issue detected',
  'critical title'
);

assertEq(
  svc.generateAlertTitle({
    severity: 'error',
    category: 'database',
    service: 'mysql',
    message: 'query error',
  }),
  'MYSQL error event',
  'service title uppercased'
);

assertEq(
  svc.generateAlertTitle({
    severity: 'warning',
    category: 'system',
    message: 'odd thing',
  }),
  'system warning detected',
  'default category/severity title'
);

// ============================================================================
// generateAlertMessage
// ============================================================================
console.log('\n── generateAlertMessage ──────────────────────────────────');

{
  const msg = svc.generateAlertMessage({
    severity: 'error',
    category: 'authentication',
    ip: '10.0.0.1',
    message: 'failed password for invalid user',
  });
  assert(msg.includes('IP address 10.0.0.1'), 'includes IP');
  assert(msg.includes('attempted failed authentication'), 'auth message');
  assert(msg.includes('Original log:'), 'original log appended');
}

{
  const msg = svc.generateAlertMessage({
    severity: 'error',
    category: 'webserver',
    ip: '1.2.3.4',
    service: 'nginx',
    errorCode: 503,
    message: '503 Service Unavailable',
  });
  assert(msg.includes('triggered HTTP 503 error'), 'errorCode phrase');
  assert(msg.includes('in nginx'), 'service suffix');
}

{
  const msg = svc.generateAlertMessage({
    severity: 'critical',
    category: 'system',
    message: 'kernel panic',
  });
  assert(msg.includes('caused a critical system event'), 'critical phrase');
}

{
  const msg = svc.generateAlertMessage({
    severity: 'warning',
    category: 'system',
    message: 'slow query',
  });
  assert(msg.includes('generated a warning level event'), 'default severity phrase');
}

{
  // Long message → truncated at 200 chars + ellipsis
  const longMsg = 'x'.repeat(300);
  const msg = svc.generateAlertMessage({
    severity: 'warning',
    category: 'system',
    message: longMsg,
  });
  // 200 xs + '...'
  assert(msg.includes('x'.repeat(200) + '...'), 'long message truncated with ellipsis');
}

// ============================================================================
// generateSuggestedActions
// ============================================================================
console.log('\n── generateSuggestedActions ──────────────────────────────');

{
  const actions = svc.generateSuggestedActions({
    severity: 'error',
    category: 'authentication',
    ip: '10.0.0.1',
    message: 'failed password attempt',
  });
  const blockIp = actions.find((a: any) => a.type === 'block_ip');
  assert(blockIp !== undefined, 'auth failure → block_ip action');
  assert(blockIp.command.includes('10.0.0.1'), 'block_ip command includes IP');
}

{
  const actions = svc.generateSuggestedActions({
    severity: 'error',
    category: 'webserver',
    service: 'nginx',
    errorCode: 502,
    message: '502 Bad Gateway',
  });
  const restart = actions.find((a: any) => a.type === 'restart_service');
  assert(restart !== undefined, 'nginx 5xx → restart_service');
  assertEq(restart.command, 'sudo systemctl restart nginx', 'restart command');
}

{
  // nginx with 4xx → no restart suggestion
  const actions = svc.generateSuggestedActions({
    severity: 'error',
    category: 'webserver',
    service: 'nginx',
    errorCode: 404,
    message: '404',
  });
  const restart = actions.find((a: any) => a.type === 'restart_service');
  assertEq(restart, undefined, 'nginx 4xx → no restart action');
}

{
  const actions = svc.generateSuggestedActions({
    severity: 'error',
    category: 'database',
    service: 'mysql',
    message: 'db error',
  });
  const check = actions.find((a: any) => a.type === 'check_mysql');
  assert(check !== undefined, 'mysql error → check_mysql action');
}

{
  const actions = svc.generateSuggestedActions({
    severity: 'critical',
    category: 'system',
    message: 'kernel panic',
  });
  const status = actions.find((a: any) => a.type === 'system_status');
  assert(status !== undefined, 'critical → system_status action');
}

{
  // Plain warning → no actions
  const actions = svc.generateSuggestedActions({
    severity: 'warning',
    category: 'system',
    message: 'odd',
  });
  assertEq(actions.length, 0, 'plain warning → no actions');
}

// ============================================================================
// parseFrequency
// ============================================================================
console.log('\n── parseFrequency ────────────────────────────────────────');

assertEq(svc.parseFrequency('5m'), 5 * 60 * 1000, '5m');
assertEq(svc.parseFrequency('15m'), 15 * 60 * 1000, '15m');
assertEq(svc.parseFrequency('1h'), 1 * 60 * 60 * 1000, '1h');
assertEq(svc.parseFrequency('3h'), 3 * 60 * 60 * 1000, '3h');
assertEq(svc.parseFrequency('1d'), 24 * 60 * 60 * 1000, '1d');
assertEq(svc.parseFrequency('2d'), 2 * 24 * 60 * 60 * 1000, '2d');
assertEq(svc.parseFrequency('bogus'), 300000, 'invalid → default 5m');
assertEq(svc.parseFrequency(''), 300000, 'empty → default 5m');
assertEq(svc.parseFrequency('5x'), 300000, 'unknown unit → default');

// ============================================================================
// addToDailySummary
// ============================================================================
console.log('\n── addToDailySummary ─────────────────────────────────────');

// Fresh state
svc.dailySummary = null;
svc.addToDailySummary(null);
assertEq(svc.dailySummary, null, 'null entry → no init, no throw');

svc.dailySummary = null;
svc.addToDailySummary({
  severity: 'error',
  category: 'webserver',
  service: 'nginx',
  ip: '1.1.1.1',
});
assert(svc.dailySummary !== null, 'first valid entry initializes summary');
assertEq(svc.dailySummary.events.error, 1, 'error counted');
assertEq(svc.dailySummary.events.warning, 0, 'warning untouched');
assertEq(svc.dailySummary.categories.webserver, 1, 'category counted');
assertEq(svc.dailySummary.services.nginx, 1, 'service counted');
assertEq(svc.dailySummary.topIPs['1.1.1.1'], 1, 'ip counted');

// Second entry same category/service/ip → increments
svc.addToDailySummary({
  severity: 'error',
  category: 'webserver',
  service: 'nginx',
  ip: '1.1.1.1',
});
assertEq(svc.dailySummary.events.error, 2, 'error=2');
assertEq(svc.dailySummary.categories.webserver, 2, 'category=2');
assertEq(svc.dailySummary.services.nginx, 2, 'service=2');
assertEq(svc.dailySummary.topIPs['1.1.1.1'], 2, 'ip=2');

// New category, no service/ip → only category counted
svc.addToDailySummary({
  severity: 'warning',
  category: 'kernel',
  service: null,
  ip: null,
});
assertEq(svc.dailySummary.events.warning, 1, 'warning counted');
assertEq(svc.dailySummary.categories.kernel, 1, 'new category tracked');
assertEq(
  Object.keys(svc.dailySummary.services).length,
  1,
  'no new service key (still just nginx)'
);

// Date reset: force summary date to yesterday, then addEntry → should reset
svc.dailySummary.date = 'Wed Jan 01 2020';
svc.addToDailySummary({
  severity: 'info',
  category: 'system',
});
assert(svc.dailySummary.date !== 'Wed Jan 01 2020', 'date advanced to today');
assertEq(svc.dailySummary.events.info, 1, 'info=1 after reset');
assertEq(svc.dailySummary.events.error, 0, 'error reset to 0');
assertEq(svc.dailySummary.categories.webserver, undefined, 'categories cleared');

// ============================================================================
// createAlert + getAlerts + acknowledgeAlert (ring buffer)
// ============================================================================
console.log('\n── createAlert + ring buffer ────────────────────────────');

// Reset alerts and shrink ring buffer for deterministic test
svc.alerts = [];
svc.config.maxAlerts = 3;

const a1 = svc.createAlert({
  severity: 'warning',
  category: 'system',
  filePath: '/var/log/test.log',
  message: 'first alert',
});
assert(a1 && typeof a1.id === 'string', 'createAlert returns alert with id');
assertEq(svc.alerts.length, 1, 'one alert stored');
assertEq(a1.acknowledged, false, 'new alert not acknowledged');

svc.createAlert({ severity: 'error', category: 'system', filePath: 'x', message: 'a2' });
svc.createAlert({ severity: 'critical', category: 'system', filePath: 'x', message: 'a3' });
svc.createAlert({ severity: 'info', category: 'system', filePath: 'x', message: 'a4' });
assertEq(svc.alerts.length, 3, 'ring buffer capped at maxAlerts=3');
// Most recent (a4 inserted via unshift) is first; oldest (a1) is evicted
assert(svc.alerts[0].message.includes('a4'), 'most recent at index 0');
assert(!svc.alerts.some((a: any) => a.message.includes('first alert')), 'oldest evicted');

// Restore
svc.config.maxAlerts = 100;

// ============================================================================
// getAlerts filters
// ============================================================================
console.log('\n── getAlerts ─────────────────────────────────────────────');

svc.alerts = [
  {
    id: '1',
    severity: 'critical',
    category: 'system',
    acknowledged: false,
    timestamp: 't1',
  },
  {
    id: '2',
    severity: 'error',
    category: 'webserver',
    acknowledged: false,
    timestamp: 't2',
  },
  {
    id: '3',
    severity: 'warning',
    category: 'system',
    acknowledged: true,
    timestamp: 't3',
  },
  {
    id: '4',
    severity: 'error',
    category: 'system',
    acknowledged: false,
    timestamp: 't4',
  },
];

assertEq(svc.getAlerts().length, 4, 'no filter → all');
assertEq(
  svc.getAlerts({ severity: 'error' }).length,
  2,
  'severity filter: 2 errors'
);
assertEq(
  svc.getAlerts({ category: 'system' }).length,
  3,
  'category filter: 3 system'
);
assertEq(
  svc.getAlerts({ acknowledged: false }).length,
  3,
  'acknowledged=false → 3'
);
assertEq(
  svc.getAlerts({ acknowledged: true }).length,
  1,
  'acknowledged=true → 1'
);
assertEq(
  svc.getAlerts({ severity: 'error', category: 'system' }).length,
  1,
  'combined filter'
);
assertEq(svc.getAlerts({ limit: 2 }).length, 2, 'limit respected');

// ============================================================================
// acknowledgeAlert
// ============================================================================
console.log('\n── acknowledgeAlert ──────────────────────────────────────');

assertEq(svc.acknowledgeAlert('1'), true, 'ack existing → true');
const ack1 = svc.alerts.find((a: any) => a.id === '1');
assertEq(ack1.acknowledged, true, 'flag flipped');
assert(typeof ack1.acknowledgedAt === 'string', 'acknowledgedAt set');

assertEq(svc.acknowledgeAlert('nonexistent'), false, 'ack missing → false');

// ============================================================================
// getSystemStatus
// ============================================================================
console.log('\n── getSystemStatus ───────────────────────────────────────');

{
  const status = svc.getSystemStatus();
  assert('isActive' in status, 'isActive present');
  assert('isMonitoring' in status, 'isMonitoring present');
  assert('config' in status, 'config present');
  assert(typeof status.activeAlerts === 'number', 'activeAlerts is number');
  assert(typeof status.totalAlerts === 'number', 'totalAlerts is number');
  assert(Array.isArray(status.watchedFiles), 'watchedFiles is array');
  assert(typeof status.uptime === 'number', 'uptime is number');
  assertEq(status.totalAlerts, svc.alerts.length, 'totalAlerts matches');
  // activeAlerts = non-acknowledged
  const nonAck = svc.alerts.filter((a: any) => !a.acknowledged).length;
  assertEq(status.activeAlerts, nonAck, 'activeAlerts counts unacknowledged');
}

// ============================================================================
// generateSummaryNarrative
// ============================================================================
console.log('\n── generateSummaryNarrative ──────────────────────────────');

{
  const narrative = svc.generateSummaryNarrative({
    date: 'Sat Apr 11 2026',
    events: { critical: 2, error: 15, warning: 8, info: 40 },
    categories: { webserver: 20, database: 10, system: 5 },
    services: { nginx: 15, mysql: 8 },
    topIPs: { '10.0.0.1': 25, '10.0.0.2': 5 },
  });
  assert(narrative.includes('Sat Apr 11 2026'), 'date included');
  assert(narrative.includes('Total events processed:'), 'total line');
  assert(narrative.includes('Critical: 2'), 'critical count');
  assert(narrative.includes('Errors: 15'), 'error count');
  assert(narrative.includes('Critical Issues'), 'critical section');
  assert(narrative.includes('Error Activity'), 'error section (15 > 10)');
  assert(narrative.includes('webserver: 20'), 'top category');
  assert(narrative.includes('nginx: 15'), 'top service');
  assert(narrative.includes('10.0.0.1: 25'), 'suspicious IP');
  assert(narrative.includes('Review and resolve 2 critical'), 'recommendation for crits');
  assert(narrative.includes('Big Book'), 'trailing recommendation');
}

{
  // Zero events: still produces narrative without optional sections
  const narrative = svc.generateSummaryNarrative({
    date: 'Sun Apr 12 2026',
    events: { critical: 0, error: 0, warning: 0, info: 0 },
    categories: {},
    services: {},
    topIPs: {},
  });
  assert(narrative.includes('Total events processed: 0'), 'zero total');
  assert(!narrative.includes('Critical Issues'), 'no critical section');
  assert(!narrative.includes('Error Activity'), 'no error section');
  assert(!narrative.includes('Top Activity Categories'), 'no top categories');
  assert(!narrative.includes('Most Active Services'), 'no active services');
  assert(!narrative.includes('High Activity IPs'), 'no IPs section');
}

// ============================================================================
// generateDailySummary
// ============================================================================
console.log('\n── generateDailySummary ──────────────────────────────────');

// Null summary → early return
svc.dailySummary = null;
{
  const r = svc.generateDailySummary();
  assertEq(r, undefined, 'null summary → undefined');
}

// Real summary → returns with narrative + generatedAt, emits event
svc.dailySummary = {
  date: 'Sat Apr 11 2026',
  events: { critical: 0, error: 1, warning: 2, info: 3 },
  categories: { webserver: 3 },
  services: { nginx: 3 },
  topIPs: {},
  trends: [],
};

let emitted: any = null;
const listener = (s: any) => { emitted = s; };
svc.on('daily_summary', listener);
{
  const r = svc.generateDailySummary();
  assert(r && typeof r.generatedAt === 'string', 'generatedAt set');
  assert(r && typeof r.narrative === 'string', 'narrative set');
  assert(r.narrative.includes('Sat Apr 11 2026'), 'narrative for date');
  assert(emitted !== null, 'daily_summary emitted');
}
svc.removeListener('daily_summary', listener);

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => {
  loud();
  console.error('Unhandled test error:', e);
  process.exit(1);
});
