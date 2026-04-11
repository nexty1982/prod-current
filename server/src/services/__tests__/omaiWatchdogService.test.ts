#!/usr/bin/env npx tsx
/**
 * Unit tests for services/omaiWatchdogService.js (OMD-1077)
 *
 * OMAIWatchdogService tails log files via `tail -f`, pattern-matches lines
 * for severity/category, generates alerts, runs periodic system checks, and
 * emits daily summaries. Most methods are pure helpers we can test directly
 * on an instance; the disk/memory/cpu/service health checks shell out via
 * execSync and we cover them by stubbing child_process.
 *
 * Patching strategy (applied BEFORE requiring the SUT):
 *   - fs.promises: readFile throws ENOENT (fall through to default config),
 *                  mkdir resolves, stat returns a small size, writeFile records.
 *   - child_process.spawn: returns a fake tail process with hookable stdout.
 *   - child_process.execSync: scripted by scenario (swappable function).
 *   - ../utils/logger: no-op stub.
 *   - global setInterval/setTimeout: no-op to avoid scheduling real timers
 *     during construction (startSystemHealthChecks / scheduleDailySummary).
 *
 * Coverage:
 *   - construction + compilePatterns (defaults)
 *   - detectSeverity (critical / error / warning / info / default info)
 *   - categorizeLogEntry (file path → category mapping)
 *   - parseLogLine (IP, service, error code extraction)
 *   - isQuietHours (same-day window + cross-midnight window)
 *   - shouldAlert (alertLevel threshold; quiet hours only passes critical)
 *   - parseFrequency (5m, 1h, 1d, invalid → default)
 *   - generateAlertTitle (authentication / error code / critical / service / fallback)
 *   - generateAlertMessage (IP + service + errorCode + truncation)
 *   - generateSuggestedActions (block_ip / restart_nginx / check_mysql / system_status)
 *   - createAlert (push, emit, maxAlerts trimming)
 *   - processLogLine (blocked pattern skip, end-to-end alert)
 *   - addToDailySummary (counts severity/category/service/IP, date rollover)
 *   - generateDailySummary (emits event, narrative content)
 *   - generateSummaryNarrative (top categories/services, recommendations)
 *   - getAlerts (filter by severity/category/acknowledged; limit)
 *   - acknowledgeAlert (found / not found)
 *   - getSystemStatus (shape)
 *   - updateConfiguration (merges, recompiles patterns, emits config_updated)
 *   - executeSuggestedAction (alert/action not found; execSync success/fail)
 *   - saveConfiguration (writeFile called with JSON)
 *
 * Run: npx tsx server/src/services/__tests__/omaiWatchdogService.test.ts
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

// ── Silence console during noisy blocks ─────────────────────────────
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

// ── Patch global timers BEFORE requiring SUT ────────────────────────
// The constructor triggers startSystemHealthChecks → setInterval+setTimeout
// and scheduleDailySummary → setTimeout. We no-op both to keep tests
// deterministic and avoid leaked handles.
const origSetInterval = global.setInterval;
const origSetTimeout = global.setTimeout;
const intervalLog: Array<{ ms: number }> = [];
const timeoutLog: Array<{ ms: number }> = [];
(global as any).setInterval = ((fn: any, ms: number) => {
  intervalLog.push({ ms });
  return { unref: () => {} } as any;
}) as any;
(global as any).setTimeout = ((fn: any, ms: number) => {
  timeoutLog.push({ ms });
  return { unref: () => {} } as any;
}) as any;

// ── Stub logger via require.cache ───────────────────────────────────
const loggerStub = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};
function stubModule(relFromSUT: string, exports: any) {
  const base = pathMod.resolve(
    __dirname,
    '..',
    relFromSUT,
  );
  for (const candidate of [base, base + '.js', base + '.ts']) {
    try {
      const resolved = require.resolve(candidate);
      require.cache[resolved] = {
        id: resolved,
        filename: resolved,
        loaded: true,
        exports,
      } as any;
    } catch { /* not resolvable, fine */ }
  }
}
stubModule('utils/logger', loggerStub);

// ── Patch fs.promises ───────────────────────────────────────────────
const fs = require('fs').promises;
const origReadFile = fs.readFile;
const origMkdir = fs.mkdir;
const origStat = fs.stat;
const origWriteFile = fs.writeFile;

const writeFileLog: Array<{ path: string; content: string }> = [];

fs.readFile = async (_p: string, _enc: string) => {
  const err: any = new Error('ENOENT');
  err.code = 'ENOENT';
  throw err;
};
fs.mkdir = async (_p: string, _opts: any) => undefined;
fs.stat = async (_p: string) => ({ size: 0 });
fs.writeFile = async (p: string, content: string) => {
  writeFileLog.push({ path: p, content });
};

// ── Patch child_process ─────────────────────────────────────────────
const cp = require('child_process');
const origSpawn = cp.spawn;
const origExecSync = cp.execSync;

type FakeTail = {
  stdout: { on: (evt: string, cb: (data: Buffer) => void) => void };
  stderr: { on: (evt: string, cb: (data: Buffer) => void) => void };
  on: (evt: string, cb: (code: number) => void) => void;
  kill: () => void;
  _emitLine: (line: string) => void;
};
const spawnLog: Array<{ cmd: string; args: string[] }> = [];
const spawnedProcesses: FakeTail[] = [];

cp.spawn = (cmd: string, args: string[], _opts?: any) => {
  spawnLog.push({ cmd, args });
  const stdoutHandlers: Array<(d: Buffer) => void> = [];
  const p: FakeTail = {
    stdout: {
      on: (evt, cb) => { if (evt === 'data') stdoutHandlers.push(cb); },
    },
    stderr: { on: () => {} },
    on: () => {},
    kill: () => {},
    _emitLine: (line: string) => {
      stdoutHandlers.forEach(h => h(Buffer.from(line + '\n')));
    },
  };
  spawnedProcesses.push(p);
  return p as any;
};

// execSync is swappable per-test via setExec()
let currentExec: (cmd: string) => string | Buffer = (_cmd: string) => '';
cp.execSync = ((cmd: string, _opts?: any) => currentExec(cmd)) as any;
function setExec(fn: (cmd: string) => string | Buffer) {
  currentExec = fn;
}
function throwingExec(_cmd: string): string {
  throw new Error('command failed');
}

// ── Require SUT ─────────────────────────────────────────────────────
quiet();
const OMAIWatchdogService = require('../omaiWatchdogService');
loud();

async function main() {

  // ========================================================================
  // Construction + compilePatterns
  // ========================================================================
  console.log('\n── construction + compilePatterns ────────────────────────');

  quiet();
  const svc = new OMAIWatchdogService();
  // Give initialize() a tick to settle
  await new Promise(r => origSetTimeout.call(global, r, 0));
  loud();

  assert(svc instanceof OMAIWatchdogService, 'instance created');
  assertEq(svc.isActive, false, 'isActive default');
  assertEq(svc.isMonitoring, false, 'isMonitoring default');
  assertEq(svc.alerts.length, 0, 'alerts empty');
  assert(svc.patterns.critical instanceof RegExp, 'critical RegExp');
  assert(svc.patterns.error instanceof RegExp, 'error RegExp');
  assert(svc.patterns.warning instanceof RegExp, 'warning RegExp');
  assert(svc.patterns.info instanceof RegExp, 'info RegExp');
  assert(svc.patterns.blocked instanceof RegExp, 'blocked RegExp');
  assert(svc.patterns.critical.test('kernel panic'), 'matches kernel panic');
  assert(svc.patterns.critical.test('out of memory'), 'matches OOM');
  assert(svc.patterns.error.test('authentication failure'), 'matches auth failure');
  assert(svc.patterns.warning.test('slow query'), 'matches slow');
  assert(svc.patterns.info.test('connect from host'), 'matches connect');
  assert(svc.patterns.blocked.test('password=hunter2'), 'matches password');

  // ========================================================================
  // detectSeverity
  // ========================================================================
  console.log('\n── detectSeverity ────────────────────────────────────────');

  assertEq(svc.detectSeverity('Service died unexpectedly'), 'critical', 'critical match');
  // Note: iteration order of Object.entries on patterns is critical/error/warning/info,
  // so the first match wins. Strings that match multiple return the highest-severity.
  assertEq(svc.detectSeverity('connection refused'), 'error', 'error match');
  assertEq(svc.detectSeverity('slow disk access'), 'warning', 'warning match');
  assertEq(svc.detectSeverity('user logout'), 'info', 'info match');
  assertEq(svc.detectSeverity('nothing unusual happened'), 'info', 'default info');

  // ========================================================================
  // categorizeLogEntry
  // ========================================================================
  console.log('\n── categorizeLogEntry ────────────────────────────────────');

  assertEq(svc.categorizeLogEntry('x', '/var/log/auth.log'), 'authentication', 'auth.log');
  assertEq(svc.categorizeLogEntry('x', '/var/log/nginx/error.log'), 'webserver', 'nginx');
  assertEq(svc.categorizeLogEntry('x', '/var/log/apache2/error.log'), 'webserver', 'apache');
  assertEq(svc.categorizeLogEntry('x', '/var/log/mysql/error.log'), 'database', 'mysql');
  assertEq(svc.categorizeLogEntry('x', '/var/log/mariadb/error.log'), 'database', 'mariadb');
  assertEq(svc.categorizeLogEntry('x', '/var/log/kern.log'), 'kernel', 'kern.log');
  assertEq(svc.categorizeLogEntry('x', '/var/log/pm2/pm2.log'), 'application', 'pm2');
  assertEq(svc.categorizeLogEntry('x', '/var/log/omai/watchdog.log'), 'omai', 'omai');
  assertEq(svc.categorizeLogEntry('x', '/var/log/syslog'), 'system', 'default system');

  // ========================================================================
  // parseLogLine
  // ========================================================================
  console.log('\n── parseLogLine ──────────────────────────────────────────');

  {
    const line = 'failed password for invalid user admin from 192.168.1.100 via ssh service';
    const e = svc.parseLogLine('/var/log/auth.log', line);
    assertEq(e.ip, '192.168.1.100', 'ip extracted');
    assertEq(e.service, 'ssh', 'service ssh');
    assertEq(e.errorCode, null, 'no error code');
    assertEq(e.category, 'authentication', 'category');
    assertEq(e.severity, 'error', 'severity error (failed)');
    assertEq(e.filePath, '/var/log/auth.log', 'filePath carried');
    assertEq(e.message, line, 'message carried');
    assert(typeof e.timestamp === 'string', 'timestamp string');
  }

  {
    const line = '127.0.0.1 - - [10/Apr/2026] "GET / HTTP/1.1" 500 123 "nginx upstream error"';
    const e = svc.parseLogLine('/var/log/nginx/error.log', line);
    assertEq(e.ip, '127.0.0.1', 'nginx ip');
    assertEq(e.service, 'nginx', 'nginx service');
    assertEq(e.errorCode, 500, '500 code');
    assertEq(e.category, 'webserver', 'webserver');
    assertEq(e.severity, 'error', 'severity error');
  }

  {
    const line = 'Hello from the void';
    const e = svc.parseLogLine('/var/log/syslog', line);
    assertEq(e.ip, null, 'no ip');
    assertEq(e.service, null, 'no service');
    assertEq(e.errorCode, null, 'no code');
    assertEq(e.severity, 'info', 'info default');
  }

  // ========================================================================
  // isQuietHours
  // ========================================================================
  console.log('\n── isQuietHours ──────────────────────────────────────────');

  const origDate = global.Date;
  function mockNow(h: number, m: number) {
    const fixed = new origDate(2026, 3, 11, h, m, 0, 0);
    (global as any).Date = class extends origDate {
      constructor(...args: any[]) {
        if (args.length === 0) { super(fixed.getTime()); return; }
        // @ts-ignore
        super(...args);
      }
      static now() { return fixed.getTime(); }
    };
  }
  function restoreDate() { (global as any).Date = origDate; }

  // Default quiet hours: 01:00 to 06:00 (same day, not cross-midnight)
  svc.config.quietHours = { start: '01:00', end: '06:00' };
  mockNow(3, 0);
  assertEq(svc.isQuietHours(), true, '03:00 in 01:00-06:00');
  mockNow(7, 0);
  assertEq(svc.isQuietHours(), false, '07:00 not in 01:00-06:00');
  mockNow(0, 30);
  assertEq(svc.isQuietHours(), false, '00:30 before 01:00');

  // Cross-midnight window: 22:00 - 05:00
  svc.config.quietHours = { start: '22:00', end: '05:00' };
  mockNow(23, 30);
  assertEq(svc.isQuietHours(), true, '23:30 in 22-05');
  mockNow(3, 0);
  assertEq(svc.isQuietHours(), true, '03:00 in 22-05');
  mockNow(12, 0);
  assertEq(svc.isQuietHours(), false, '12:00 not in 22-05');

  restoreDate();
  svc.config.quietHours = { start: '01:00', end: '06:00' };

  // ========================================================================
  // shouldAlert
  // ========================================================================
  console.log('\n── shouldAlert ───────────────────────────────────────────');

  svc.config.alertLevel = 'warning';
  mockNow(12, 0); // outside quiet hours

  assertEq(svc.shouldAlert({ severity: 'critical' }), true, 'critical>warning: alert');
  assertEq(svc.shouldAlert({ severity: 'error' }), true, 'error>=warning: alert');
  assertEq(svc.shouldAlert({ severity: 'warning' }), true, 'warning==warning: alert');
  assertEq(svc.shouldAlert({ severity: 'info' }), false, 'info<warning: no alert');

  // Raise bar to error
  svc.config.alertLevel = 'error';
  assertEq(svc.shouldAlert({ severity: 'warning' }), false, 'warning<error: no');
  assertEq(svc.shouldAlert({ severity: 'error' }), true, 'error==error: yes');

  // Quiet hours → only critical
  svc.config.alertLevel = 'warning';
  mockNow(3, 0);
  assertEq(svc.shouldAlert({ severity: 'critical' }), true, 'quiet: critical yes');
  assertEq(svc.shouldAlert({ severity: 'error' }), false, 'quiet: error no');
  assertEq(svc.shouldAlert({ severity: 'warning' }), false, 'quiet: warning no');

  restoreDate();

  // ========================================================================
  // parseFrequency
  // ========================================================================
  console.log('\n── parseFrequency ────────────────────────────────────────');

  assertEq(svc.parseFrequency('5m'), 5 * 60 * 1000, '5m');
  assertEq(svc.parseFrequency('15m'), 15 * 60 * 1000, '15m');
  assertEq(svc.parseFrequency('1h'), 60 * 60 * 1000, '1h');
  assertEq(svc.parseFrequency('2h'), 2 * 60 * 60 * 1000, '2h');
  assertEq(svc.parseFrequency('1d'), 24 * 60 * 60 * 1000, '1d');
  assertEq(svc.parseFrequency('bogus'), 300000, 'invalid → default 5m');
  assertEq(svc.parseFrequency(''), 300000, 'empty → default');

  // ========================================================================
  // generateAlertTitle
  // ========================================================================
  console.log('\n── generateAlertTitle ────────────────────────────────────');

  assertEq(
    svc.generateAlertTitle({
      severity: 'error',
      category: 'authentication',
      service: 'ssh',
      errorCode: null,
      message: 'failed password for admin',
    }),
    'Authentication failure detected',
    'auth failure title',
  );
  assertEq(
    svc.generateAlertTitle({
      severity: 'error',
      category: 'webserver',
      service: 'nginx',
      errorCode: 500,
      message: 'upstream error',
    }),
    'HTTP 500 error in nginx',
    'HTTP error title',
  );
  assertEq(
    svc.generateAlertTitle({
      severity: 'error',
      category: 'webserver',
      service: null,
      errorCode: 404,
      message: 'not found',
    }),
    'HTTP 404 error in web server',
    'HTTP error fallback service',
  );
  assertEq(
    svc.generateAlertTitle({
      severity: 'critical',
      category: 'system',
      service: null,
      errorCode: null,
      message: 'panic',
    }),
    'Critical system issue detected',
    'critical title',
  );
  assertEq(
    svc.generateAlertTitle({
      severity: 'error',
      category: 'database',
      service: 'mysql',
      errorCode: null,
      message: 'connection dropped',
    }),
    'MYSQL error event',
    'service event title',
  );
  assertEq(
    svc.generateAlertTitle({
      severity: 'warning',
      category: 'system',
      service: null,
      errorCode: null,
      message: 'slow',
    }),
    'system warning detected',
    'fallback title',
  );

  // ========================================================================
  // generateAlertMessage
  // ========================================================================
  console.log('\n── generateAlertMessage ──────────────────────────────────');

  {
    const m = svc.generateAlertMessage({
      severity: 'error',
      category: 'authentication',
      service: 'ssh',
      ip: '1.2.3.4',
      errorCode: null,
      message: 'failed password for admin',
    });
    assert(m.includes('1.2.3.4'), 'includes IP');
    assert(m.includes('attempted failed authentication'), 'auth phrasing');
    assert(m.includes('in ssh'), 'in service');
    assert(m.includes('Original log:'), 'includes original log');
  }

  {
    const m = svc.generateAlertMessage({
      severity: 'error',
      category: 'webserver',
      service: 'nginx',
      ip: null,
      errorCode: 502,
      message: 'bad gateway',
    });
    assert(m.includes('HTTP 502'), 'HTTP code');
    assert(m.includes('in nginx'), 'in service');
    assert(!m.includes('IP address'), 'no IP phrasing');
  }

  {
    const m = svc.generateAlertMessage({
      severity: 'critical',
      category: 'system',
      service: null,
      ip: null,
      errorCode: null,
      message: 'kernel panic',
    });
    assert(m.includes('critical system event'), 'critical phrasing');
  }

  {
    const m = svc.generateAlertMessage({
      severity: 'warning',
      category: 'system',
      service: null,
      ip: null,
      errorCode: null,
      message: 'slow processing',
    });
    assert(m.includes('generated a warning level event'), 'warning phrasing');
  }

  {
    const longMsg = 'x'.repeat(300);
    const m = svc.generateAlertMessage({
      severity: 'error',
      category: 'system',
      service: null,
      ip: null,
      errorCode: null,
      message: longMsg,
    });
    assert(m.includes('...'), 'truncated with ellipsis');
    // Original is 300 chars; truncated to 200 + '...'
    assert(m.includes('x'.repeat(200) + '...'), '200-char truncation');
  }

  // ========================================================================
  // generateSuggestedActions
  // ========================================================================
  console.log('\n── generateSuggestedActions ──────────────────────────────');

  {
    const actions = svc.generateSuggestedActions({
      category: 'authentication',
      message: 'failed password for admin',
      ip: '9.9.9.9',
      service: 'ssh',
      severity: 'error',
      errorCode: null,
    });
    assertEq(actions.length, 1, 'auth: one action');
    assertEq(actions[0].type, 'block_ip', 'block_ip type');
    assert(actions[0].command.includes('9.9.9.9'), 'command has IP');
  }

  {
    const actions = svc.generateSuggestedActions({
      category: 'webserver',
      message: 'upstream error',
      ip: null,
      service: 'nginx',
      severity: 'error',
      errorCode: 502,
    });
    assertEq(actions.length, 1, 'nginx 5xx: one action');
    assertEq(actions[0].type, 'restart_service', 'restart_service type');
    assert(actions[0].command.includes('nginx'), 'restarts nginx');
  }

  {
    const actions = svc.generateSuggestedActions({
      category: 'database',
      message: 'mysqld failed',
      ip: null,
      service: 'mysql',
      severity: 'error',
      errorCode: null,
    });
    assertEq(actions.length, 1, 'mysql error: one action');
    assertEq(actions[0].type, 'check_mysql', 'check_mysql type');
  }

  {
    const actions = svc.generateSuggestedActions({
      category: 'system',
      message: 'kernel panic',
      ip: null,
      service: null,
      severity: 'critical',
      errorCode: null,
    });
    assertEq(actions.length, 1, 'critical: one action');
    assertEq(actions[0].type, 'system_status', 'system_status type');
  }

  {
    const actions = svc.generateSuggestedActions({
      category: 'webserver',
      message: 'nginx 5xx',
      ip: null,
      service: 'nginx',
      severity: 'critical',
      errorCode: 503,
    });
    assertEq(actions.length, 2, 'nginx 5xx + critical: two actions');
    const types = actions.map((a: any) => a.type);
    assert(types.includes('restart_service'), 'includes restart');
    assert(types.includes('system_status'), 'includes system_status');
  }

  {
    const actions = svc.generateSuggestedActions({
      category: 'system',
      message: 'nothing interesting',
      ip: null,
      service: null,
      severity: 'warning',
      errorCode: null,
    });
    assertEq(actions.length, 0, 'no actions');
  }

  // ========================================================================
  // createAlert: push, emit, cap
  // ========================================================================
  console.log('\n── createAlert ───────────────────────────────────────────');

  svc.alerts = [];
  svc.config.maxAlerts = 3;

  let alertEmitCount = 0;
  const alertListener = () => { alertEmitCount++; };
  svc.on('alert', alertListener);

  const a1 = svc.createAlert({
    severity: 'error',
    category: 'webserver',
    filePath: '/var/log/nginx/error.log',
    message: 'line1',
    service: 'nginx',
    ip: null,
    errorCode: 500,
  });
  assert(typeof a1.id === 'string', 'alert id string');
  assertEq(a1.acknowledged, false, 'not acknowledged');
  assertEq(a1.severity, 'error', 'severity carried');
  assert(Array.isArray(a1.actions), 'actions array');
  assertEq(svc.alerts.length, 1, 'alerts = 1');
  assertEq(svc.alerts[0].id, a1.id, 'unshifted to front');

  svc.createAlert({
    severity: 'warning',
    category: 'system',
    filePath: '/var/log/syslog',
    message: 'line2',
    service: null,
    ip: null,
    errorCode: null,
  });
  svc.createAlert({
    severity: 'info',
    category: 'system',
    filePath: '/var/log/syslog',
    message: 'line3',
    service: null,
    ip: null,
    errorCode: null,
  });
  assertEq(svc.alerts.length, 3, 'alerts = 3 (cap)');
  // Fourth push should trim
  svc.createAlert({
    severity: 'critical',
    category: 'system',
    filePath: '/var/log/syslog',
    message: 'line4',
    service: null,
    ip: null,
    errorCode: null,
  });
  assertEq(svc.alerts.length, 3, 'still capped at 3');
  assertEq(svc.alerts[0].severity, 'critical', 'newest at front');
  assertEq(alertEmitCount, 4, 'alert event emitted 4 times');

  svc.off('alert', alertListener);
  svc.config.maxAlerts = 100;

  // ========================================================================
  // processLogLine: blocked pattern skip / end-to-end
  // ========================================================================
  console.log('\n── processLogLine ────────────────────────────────────────');

  svc.alerts = [];
  svc.config.alertLevel = 'warning';
  mockNow(12, 0); // outside quiet

  // Blocked pattern (password) should be skipped: no alert created.
  svc.processLogLine('/var/log/auth.log', 'login with password=hunter2');
  assertEq(svc.alerts.length, 0, 'blocked pattern skipped');

  // End-to-end: real alert-worthy line
  svc.processLogLine(
    '/var/log/nginx/error.log',
    '2026-04-11 nginx [error] upstream connection refused from 10.0.0.1',
  );
  assertEq(svc.alerts.length, 1, 'alert created');
  assertEq(svc.alerts[0].category, 'webserver', 'category webserver');
  assertEq(svc.alerts[0].severity, 'error', 'severity error');

  // Info-level should be filtered out when alertLevel=warning
  svc.processLogLine('/var/log/syslog', 'user login success');
  assertEq(svc.alerts.length, 1, 'info filtered out');

  restoreDate();

  // ========================================================================
  // addToDailySummary
  // ========================================================================
  console.log('\n── addToDailySummary ─────────────────────────────────────');

  svc.dailySummary = null;
  svc.addToDailySummary({
    severity: 'error',
    category: 'authentication',
    service: 'ssh',
    ip: '1.2.3.4',
  });
  assert(svc.dailySummary !== null, 'summary created');
  assertEq(svc.dailySummary.events.error, 1, 'error count');
  assertEq(svc.dailySummary.categories.authentication, 1, 'auth category');
  assertEq(svc.dailySummary.services.ssh, 1, 'ssh service');
  assertEq(svc.dailySummary.topIPs['1.2.3.4'], 1, 'ip counted');

  svc.addToDailySummary({
    severity: 'error',
    category: 'authentication',
    service: 'ssh',
    ip: '1.2.3.4',
  });
  assertEq(svc.dailySummary.events.error, 2, 'error count 2');
  assertEq(svc.dailySummary.topIPs['1.2.3.4'], 2, 'ip count 2');

  svc.addToDailySummary({
    severity: 'critical',
    category: 'system',
    service: null,
    ip: null,
  });
  assertEq(svc.dailySummary.events.critical, 1, 'critical count');
  assertEq(svc.dailySummary.categories.system, 1, 'system category');

  // Null entry is a no-op
  svc.addToDailySummary(null);
  assertEq(svc.dailySummary.events.error, 2, 'null no-op');

  // Date rollover: stamp a stale date and verify it resets
  svc.dailySummary.date = 'Tue Jan 01 2020';
  svc.addToDailySummary({
    severity: 'warning',
    category: 'system',
    service: null,
    ip: null,
  });
  assertEq(svc.dailySummary.events.warning, 1, 'new day: warning=1');
  assertEq(svc.dailySummary.events.error, 0, 'new day: error reset');
  assertEq(svc.dailySummary.events.critical, 0, 'new day: critical reset');

  // ========================================================================
  // generateDailySummary / generateSummaryNarrative
  // ========================================================================
  console.log('\n── generateDailySummary ──────────────────────────────────');

  // Null summary → early return, no emission
  svc.dailySummary = null;
  let summaryEmitted = 0;
  const summaryListener = () => { summaryEmitted++; };
  svc.on('daily_summary', summaryListener);
  const nullResult = svc.generateDailySummary();
  assertEq(nullResult, undefined, 'null summary returns undefined');
  assertEq(summaryEmitted, 0, 'no emission');

  // Populated summary
  svc.dailySummary = {
    date: 'Sat Apr 11 2026',
    events: { critical: 2, error: 15, warning: 5, info: 20 },
    categories: { authentication: 10, webserver: 8, system: 6 },
    services: { ssh: 7, nginx: 5, mysql: 3 },
    topIPs: { '1.1.1.1': 15, '2.2.2.2': 5, '3.3.3.3': 2 },
    trends: [],
  };
  const result = svc.generateDailySummary();
  assertEq(summaryEmitted, 1, 'summary emitted');
  assert(typeof result.narrative === 'string', 'narrative present');
  assert(result.narrative.includes('Sat Apr 11 2026'), 'narrative has date');
  assert(result.narrative.includes('Total events processed: 42'), 'narrative has total');
  assert(result.narrative.includes('Critical Issues'), 'mentions critical');
  assert(result.narrative.includes('Error Activity'), 'mentions errors (>10)');
  assert(result.narrative.includes('authentication'), 'top category');
  assert(result.narrative.includes('ssh'), 'top service');
  assert(result.narrative.includes('1.1.1.1'), 'suspicious IP');
  assert(result.narrative.includes('Recommendations'), 'has recommendations');
  assert(result.narrative.includes('Big Book'), 'has big book reference');

  svc.off('daily_summary', summaryListener);

  // Narrative without critical/high-error
  {
    const n = svc.generateSummaryNarrative({
      date: 'x',
      events: { critical: 0, error: 2, warning: 1, info: 5 },
      categories: { system: 3 },
      services: { nginx: 2 },
      topIPs: {},
    });
    assert(!n.includes('Critical Issues'), 'no critical section');
    assert(!n.includes('Error Activity'), 'no error activity section');
    assert(!n.includes('High Activity IPs'), 'no suspicious ip section');
  }

  // Narrative with 51+ errors triggers maintenance recommendation
  {
    const n = svc.generateSummaryNarrative({
      date: 'x',
      events: { critical: 0, error: 51, warning: 0, info: 0 },
      categories: {},
      services: {},
      topIPs: {},
    });
    assert(n.includes('system instability'), 'instability warning');
  }

  // ========================================================================
  // getAlerts: filtering
  // ========================================================================
  console.log('\n── getAlerts ─────────────────────────────────────────────');

  svc.alerts = [
    { id: 'a', severity: 'critical', category: 'system', acknowledged: false },
    { id: 'b', severity: 'error', category: 'webserver', acknowledged: true },
    { id: 'c', severity: 'warning', category: 'system', acknowledged: false },
    { id: 'd', severity: 'critical', category: 'database', acknowledged: false },
    { id: 'e', severity: 'info', category: 'system', acknowledged: true },
  ];

  assertEq(svc.getAlerts().length, 5, 'no filter: all');
  assertEq(svc.getAlerts({ severity: 'critical' }).length, 2, 'critical only');
  assertEq(svc.getAlerts({ category: 'system' }).length, 3, 'system only');
  assertEq(svc.getAlerts({ acknowledged: false }).length, 3, 'unacked only');
  assertEq(svc.getAlerts({ acknowledged: true }).length, 2, 'acked only');
  assertEq(svc.getAlerts({ severity: 'critical', category: 'system' }).length, 1, 'critical system');
  assertEq(svc.getAlerts({ limit: 2 }).length, 2, 'limit 2');

  // ========================================================================
  // acknowledgeAlert
  // ========================================================================
  console.log('\n── acknowledgeAlert ──────────────────────────────────────');

  svc.alerts = [
    { id: 'x1', acknowledged: false },
    { id: 'x2', acknowledged: false },
  ];
  assertEq(svc.acknowledgeAlert('x1'), true, 'found → true');
  assertEq(svc.alerts[0].acknowledged, true, 'flag set');
  assert(typeof svc.alerts[0].acknowledgedAt === 'string', 'acknowledgedAt set');
  assertEq(svc.acknowledgeAlert('nope'), false, 'not found → false');
  assertEq(svc.alerts[1].acknowledged, false, 'other unchanged');

  // ========================================================================
  // getSystemStatus
  // ========================================================================
  console.log('\n── getSystemStatus ───────────────────────────────────────');

  svc.alerts = [
    { id: '1', acknowledged: false },
    { id: '2', acknowledged: true },
    { id: '3', acknowledged: false },
  ];
  svc.watchedFiles.set('/var/log/syslog', {});
  svc.isActive = true;
  svc.isMonitoring = true;

  const status = svc.getSystemStatus();
  assertEq(status.isActive, true, 'isActive');
  assertEq(status.isMonitoring, true, 'isMonitoring');
  assertEq(status.activeAlerts, 2, 'activeAlerts = unacked count');
  assertEq(status.totalAlerts, 3, 'totalAlerts');
  assert(Array.isArray(status.watchedFiles), 'watchedFiles array');
  assert(status.watchedFiles.includes('/var/log/syslog'), 'contains syslog');
  assert(typeof status.uptime === 'number', 'uptime number');
  assert(status.config === svc.config, 'config ref');

  svc.watchedFiles.clear();
  svc.isActive = false;
  svc.isMonitoring = false;

  // ========================================================================
  // updateConfiguration
  // ========================================================================
  console.log('\n── updateConfiguration ───────────────────────────────────');

  let configEmitted = 0;
  const cfgListener = () => { configEmitted++; };
  svc.on('config_updated', cfgListener);

  const origAlertLevel = svc.config.alertLevel;
  writeFileLog.length = 0;
  quiet();
  await svc.updateConfiguration({ alertLevel: 'error' });
  loud();
  assertEq(svc.config.alertLevel, 'error', 'alertLevel merged');
  assertEq(configEmitted, 1, 'config_updated emitted');
  assertEq(writeFileLog.length, 1, 'saveConfiguration wrote');
  assert(writeFileLog[0].path.endsWith('watchdog.json'), 'correct path');
  // Recompiled patterns are still valid
  assert(svc.patterns.error instanceof RegExp, 'patterns recompiled');

  svc.config.alertLevel = origAlertLevel;
  svc.off('config_updated', cfgListener);

  // ========================================================================
  // saveConfiguration: error path
  // ========================================================================
  console.log('\n── saveConfiguration error ───────────────────────────────');

  const saveOrig = fs.writeFile;
  fs.writeFile = async () => { throw new Error('disk full'); };
  let caught: Error | null = null;
  quiet();
  try { await svc.saveConfiguration(); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'saveConfiguration rethrows');
  fs.writeFile = saveOrig;

  // ========================================================================
  // executeSuggestedAction
  // ========================================================================
  console.log('\n── executeSuggestedAction ────────────────────────────────');

  svc.alerts = [{
    id: 'alert1',
    actions: [
      { type: 'block_ip', command: 'echo blocked' },
      { type: 'restart_service', command: 'echo restart' },
    ],
  }];

  // Alert not found
  {
    let err: Error | null = null;
    try { await svc.executeSuggestedAction('nope', 'block_ip'); }
    catch (e: any) { err = e; }
    assert(err !== null, 'alert not found throws');
    assert(err?.message.includes('Alert not found'), 'correct message');
  }

  // Action not found
  {
    let err: Error | null = null;
    try { await svc.executeSuggestedAction('alert1', 'unknown_action'); }
    catch (e: any) { err = e; }
    assert(err !== null, 'action not found throws');
    assert(err?.message.includes('Action not found'), 'correct message');
  }

  // Happy path
  setExec((cmd: string) => `executed: ${cmd}`);
  {
    const r = await svc.executeSuggestedAction('alert1', 'block_ip');
    assertEq(r.success, true, 'success true');
    assert(r.output.includes('echo blocked'), 'output from execSync');
    assert(typeof r.executedAt === 'string', 'executedAt set');
  }

  // execSync throws
  setExec(throwingExec);
  {
    let err: Error | null = null;
    quiet();
    try { await svc.executeSuggestedAction('alert1', 'restart_service'); }
    catch (e: any) { err = e; }
    loud();
    assert(err !== null, 'execSync failure rethrows');
    assert(err?.message.includes('Action execution failed'), 'wrapped message');
  }

  // ========================================================================
  // System checks (through execSync)
  // ========================================================================
  console.log('\n── system checks ─────────────────────────────────────────');

  // Disk space over threshold → alert
  svc.alerts = [];
  setExec(() => '/dev/sda1 100G 95G 5G 95% /\n/dev/sdb1 50G 40G 10G 80% /var');
  await svc.checkDiskSpace();
  assert(svc.alerts.length >= 1, 'disk alert created');
  assert(
    svc.alerts.some((a: any) => a.message.includes('95%')),
    'alert mentions 95%',
  );

  // Memory over threshold
  svc.alerts = [];
  // free: Mem: total used ...
  setExec(() => 'Mem: 1000 950 50 0 0 0');
  await svc.checkMemoryUsage();
  assert(svc.alerts.length >= 1, 'memory alert created');

  // CPU over threshold
  svc.alerts = [];
  setExec(() => '97.5');
  await svc.checkCPUUsage();
  assert(svc.alerts.length >= 1, 'cpu alert created');

  // Load average over threshold
  svc.alerts = [];
  setExec(() => ' 12.50');
  await svc.checkLoadAverage();
  assert(svc.alerts.length >= 1, 'load alert created');
  assert(
    svc.alerts.some((a: any) => a.severity === 'critical'),
    'load >= 10 is critical',
  );

  // Failed logins over threshold
  svc.alerts = [];
  setExec(() => '15');
  await svc.checkFailedLogins();
  assert(svc.alerts.length >= 1, 'failed login alert');

  // Failed logins far over → critical
  svc.alerts = [];
  setExec(() => '60');
  await svc.checkFailedLogins();
  assert(
    svc.alerts.some((a: any) => a.severity === 'critical'),
    '60 failed logins = critical',
  );

  // Service health: one inactive
  svc.alerts = [];
  setExec((cmd: string) => {
    if (cmd.includes('nginx')) return 'active';
    if (cmd.includes('mysql')) return 'inactive';
    if (cmd.includes('pm2')) return 'failed';
    return 'active';
  });
  await svc.checkServiceHealth();
  assertEq(svc.alerts.length, 2, 'mysql+pm2 alerts');

  // Service health: execSync throws → create alert
  svc.alerts = [];
  setExec(throwingExec);
  await svc.checkServiceHealth();
  assertEq(svc.alerts.length, 3, '3 service check failures');

  // Reset exec
  setExec((_cmd: string) => '');

  // Disk check failure swallowed
  svc.alerts = [];
  setExec(throwingExec);
  quiet();
  await svc.checkDiskSpace();
  loud();
  assertEq(svc.alerts.length, 0, 'disk error swallowed');

  setExec((_cmd: string) => '');

  // ========================================================================
  // monitorFile: spawns tail, feeds lines, stopMonitoring kills
  // ========================================================================
  console.log('\n── monitorFile / stopMonitoring ──────────────────────────');

  spawnLog.length = 0;
  spawnedProcesses.length = 0;
  svc.alerts = [];
  svc.config.alertLevel = 'warning';
  mockNow(12, 0);

  svc.monitorFile('/var/log/auth.log');
  assertEq(spawnLog.length, 1, 'spawn called once');
  assertEq(spawnLog[0].cmd, 'tail', 'spawn cmd = tail');
  assert(spawnLog[0].args.includes('-f'), 'spawn uses -f');
  assert(spawnLog[0].args.includes('/var/log/auth.log'), 'spawn with path');
  assertEq(svc.watchedFiles.size, 1, 'watchedFiles registered');

  // Feed an error-worthy line (avoid blocked words like "password")
  const fake = spawnedProcesses[0];
  fake._emitLine('connection refused from 10.0.0.2 to sshd');
  assert(svc.alerts.length >= 1, 'alert from streamed line');

  // stopMonitoring (isMonitoring must be true first)
  svc.isMonitoring = true;
  let killed = false;
  (svc.watchedFiles.get('/var/log/auth.log') as any).kill = () => { killed = true; };
  quiet();
  await svc.stopMonitoring();
  loud();
  assertEq(svc.isMonitoring, false, 'stopped');
  assertEq(killed, true, 'watcher killed');
  assertEq(svc.watchedFiles.size, 0, 'watched cleared');

  // stopMonitoring while already stopped: early return
  await svc.stopMonitoring();

  restoreDate();

  // ========================================================================
  // Cleanup
  // ========================================================================
  fs.readFile = origReadFile;
  fs.mkdir = origMkdir;
  fs.stat = origStat;
  fs.writeFile = origWriteFile;
  cp.spawn = origSpawn;
  cp.execSync = origExecSync;
  global.setInterval = origSetInterval;
  global.setTimeout = origSetTimeout;

  // ========================================================================
  // Summary
  // ========================================================================
  console.log(`\n──────────────────────────────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  process.exit(1);
});
