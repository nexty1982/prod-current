#!/usr/bin/env npx tsx
/**
 * Unit tests for services/maintenanceService.js (OMD-1127)
 *
 * Class-based maintenance mode manager that reads/writes flag/config/log
 * files on disk. We monkey-patch `fs.promises` with an in-memory virtual
 * filesystem so tests never touch real paths.
 *
 * Coverage:
 *   - Constructor sets default paths and config
 *   - initialize → ensureDirectories + loadMaintenanceState (no throw)
 *   - loadMaintenanceState: flag missing → isActive=false; flag present →
 *     isActive=true + config loaded
 *   - loadConfig: primary path, backup fallback, both missing → defaults
 *   - activate: writes flag/config/backup, logs ACTIVATED, normalizes eta
 *   - deactivate: not-active → success=false; happy removes flag + clears
 *     state + logs DEACTIVATED with duration
 *   - getStatus: refreshes from disk, returns isActive/config/duration/
 *     timeRemaining
 *   - updateConfig: not-active → throws; happy writes merged config
 *   - isExempt: not-active → true; exempt role; exempt IP; allowlist
 *     email/IP; no match → false
 *   - logMaintenanceEvent: appends JSON line
 *   - getLogs: reversed recent N; filters invalid lines; missing file → []
 *   - getStatistics: processes ACTIVATED/DEACTIVATED pairs, totals, byUser,
 *     byReason, recentActivations cap at 10, shortest Infinity → 0
 *   - emergencyShutdown: delegates to activate with emergency params
 *   - scheduleMaintenance: past time → throws; future → delay + timeout
 *
 * Run: npx tsx server/src/services/__tests__/maintenanceService.test.ts
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

async function assertThrows(fn: () => Promise<any>, pattern: RegExp, message: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${message} — did not throw`);
    failed++;
  } catch (e: any) {
    if (pattern.test(e.message)) { console.log(`  PASS: ${message}`); passed++; }
    else { console.error(`  FAIL: ${message}\n         got: ${e.message}`); failed++; }
  }
}

// ── Silence logger ───────────────────────────────────────────────────
const loggerStub = {
  info: (..._a: any[]) => {},
  warn: (..._a: any[]) => {},
  error: (..._a: any[]) => {},
  debug: (..._a: any[]) => {},
};
const loggerPath = require.resolve('../../utils/logger');
require.cache[loggerPath] = {
  id: loggerPath, filename: loggerPath, loaded: true, exports: loggerStub,
} as any;

// ── Virtual filesystem (monkey-patch fs.promises) ────────────────────
const vfs = new Map<string, string>();

function enoent(p: string): any {
  const e: any = new Error(`ENOENT: no such file or directory, ${p}`);
  e.code = 'ENOENT';
  return e;
}

const fsRaw = require('fs');

fsRaw.promises.mkdir = async (_dir: string, _opts?: any) => undefined;
fsRaw.promises.access = async (p: string) => {
  if (!vfs.has(p)) throw enoent(p);
};
fsRaw.promises.readFile = async (p: string, _enc?: any) => {
  if (!vfs.has(p)) throw enoent(p);
  return vfs.get(p)!;
};
fsRaw.promises.writeFile = async (p: string, content: string) => {
  vfs.set(p, content);
};
fsRaw.promises.appendFile = async (p: string, content: string) => {
  vfs.set(p, (vfs.get(p) || '') + content);
};
fsRaw.promises.unlink = async (p: string) => {
  if (!vfs.has(p)) throw enoent(p);
  vfs.delete(p);
};

function resetVfs() { vfs.clear(); }

const MaintenanceService = require('../maintenanceService');

// Helper: fresh instance with constructor's async init fully drained
async function freshSvc(): Promise<any> {
  const s = new MaintenanceService();
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
  return s;
}

async function main() {

// ============================================================================
// Constructor + defaults
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

resetVfs();
{
  const s = await freshSvc();
  assertEq(s.flagPath, '/etc/omai/maintenance.flag', 'flag path');
  assertEq(s.configPath, '/etc/omai/maintenance.json', 'config path');
  assertEq(s.logPath, '/var/log/omai/maintenance.log', 'log path');
  assert(s.backupConfigPath.includes('config/maintenance.json'), 'backup path');
  assertEq(s.isActive, false, 'not active by default (no flag)');
  assertEq(s.config, null, 'no config by default');
  assertEq(s.defaultConfig.status, 'System maintenance in progress', 'default status');
  assert(s.defaultConfig.exemptRoles.includes('super_admin'), 'super_admin exempt');
  assert(s.defaultConfig.exemptIPs.includes('127.0.0.1'), '127.0.0.1 exempt');
}

// ============================================================================
// loadMaintenanceState: flag present → active
// ============================================================================
console.log('\n── loadMaintenanceState: flag present ────────────────────');

resetVfs();
vfs.set('/etc/omai/maintenance.flag', '{"activated":true}');
vfs.set('/etc/omai/maintenance.json', JSON.stringify({ status: 'Loaded', reason: 'x' }));
{
  const s = await freshSvc();
  assertEq(s.isActive, true, 'active because flag exists');
  assert(s.config !== null, 'config loaded');
  assertEq(s.config.status, 'Loaded', 'config.status merged');
  assertEq(s.config.reason, 'x', 'config.reason merged');
  // default fields still present
  assert(Array.isArray(s.config.exemptRoles), 'defaults preserved');
}

// ============================================================================
// loadConfig: primary missing, backup present
// ============================================================================
console.log('\n── loadConfig: backup fallback ───────────────────────────');

resetVfs();
vfs.set('/etc/omai/maintenance.flag', '{}');
// primary config missing → backup used
{
  const s = await freshSvc();
  // No real backup path known until constructor runs — use the instance's
  const backup = s.backupConfigPath;
  vfs.set(backup, JSON.stringify({ status: 'FromBackup' }));
  await s.loadConfig();
  assertEq(s.config.status, 'FromBackup', 'loaded from backup');
}

// Both missing → defaults
resetVfs();
{
  const s = await freshSvc();
  await s.loadConfig();
  assertEq(s.config.status, 'System maintenance in progress', 'defaults when both missing');
}

// ============================================================================
// activate
// ============================================================================
console.log('\n── activate ──────────────────────────────────────────────');

resetVfs();
{
  const s = await freshSvc();
  const result = await s.activate({
    message: 'Test message',
    status: 'Testing',
    reason: 'unit test',
    activatedBy: 'tester',
  });
  assertEq(result.success, true, 'success true');
  assert(result.config !== null, 'config returned');
  assertEq(result.config.message, 'Test message', 'message set');
  assertEq(result.config.reason, 'unit test', 'reason set');
  assertEq(result.config.activatedBy, 'tester', 'activatedBy set');
  assert(result.config.activatedAt !== null, 'activatedAt set');
  assertEq(s.isActive, true, 'isActive=true');
  // Flag + config + backup written
  assert(vfs.has('/etc/omai/maintenance.flag'), 'flag written');
  assert(vfs.has('/etc/omai/maintenance.json'), 'config written');
  assert(vfs.has(s.backupConfigPath), 'backup written');
  // Log entry appended
  assert(vfs.has('/var/log/omai/maintenance.log'), 'log written');
  const log = vfs.get('/var/log/omai/maintenance.log')!;
  assert(log.includes('ACTIVATED'), 'log has ACTIVATED');
}

// activate with eta → normalized to ISO
resetVfs();
{
  const s = await freshSvc();
  const future = new Date(Date.now() + 3600000);
  const result = await s.activate({ eta: future.toISOString() });
  assertEq(result.config.eta, future.toISOString(), 'eta normalized');
}

// activate with allowlist extends defaults
resetVfs();
{
  const s = await freshSvc();
  const result = await s.activate({
    allowlist: ['admin@x.com'],
    exemptIPs: ['10.0.0.1'],
  });
  assert(result.config.allowlist.includes('admin@x.com'), 'custom allowlist');
  assert(result.config.exemptIPs.includes('10.0.0.1'), 'custom exempt IP appended');
  assert(result.config.exemptIPs.includes('127.0.0.1'), 'default exempt IP preserved');
}

// ============================================================================
// deactivate
// ============================================================================
console.log('\n── deactivate ────────────────────────────────────────────');

// Not active → success false
resetVfs();
{
  const s = await freshSvc();
  const r = await s.deactivate();
  assertEq(r.success, false, 'not-active → false');
  assert(r.message.includes('not currently active'), 'message explains');
}

// Happy path
resetVfs();
{
  const s = await freshSvc();
  await s.activate({ reason: 'scheduled' });
  const r = await s.deactivate('admin', 'finished');
  assertEq(r.success, true, 'success');
  assertEq(s.isActive, false, 'cleared isActive');
  assertEq(s.config, null, 'cleared config');
  assert(!vfs.has('/etc/omai/maintenance.flag'), 'flag removed');
  const log = vfs.get('/var/log/omai/maintenance.log')!;
  assert(log.includes('DEACTIVATED'), 'DEACTIVATED logged');
  assert(log.includes('finished'), 'reason in log');
  assert(log.includes('admin'), 'deactivatedBy in log');
}

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

// Inactive
resetVfs();
{
  const s = await freshSvc();
  const st = await s.getStatus();
  assertEq(st.isActive, false, 'inactive');
  assertEq(st.config, null, 'no config');
  assertEq(st.duration, 0, 'zero duration');
  assertEq(st.timeRemaining, null, 'no timeRemaining');
}

// Active with eta → timeRemaining > 0
resetVfs();
{
  const s = await freshSvc();
  const future = new Date(Date.now() + 60000).toISOString();
  await s.activate({ eta: future });
  const st = await s.getStatus();
  assertEq(st.isActive, true, 'active');
  assert(st.config !== null, 'has config');
  assert(st.duration >= 0, 'duration set');
  assert(st.timeRemaining !== null && st.timeRemaining > 0, 'timeRemaining positive');
}

// Active with past eta → timeRemaining = 0 (Math.max)
resetVfs();
{
  const s = await freshSvc();
  const past = new Date(Date.now() - 60000).toISOString();
  await s.activate({ eta: past });
  const st = await s.getStatus();
  assertEq(st.timeRemaining, 0, 'past eta → 0 (clamped)');
}

// ============================================================================
// updateConfig
// ============================================================================
console.log('\n── updateConfig ──────────────────────────────────────────');

// Not active → throws
resetVfs();
{
  const s = await freshSvc();
  await assertThrows(
    async () => await s.updateConfig({ message: 'new' }),
    /not active/,
    'updateConfig throws when not active'
  );
}

// Happy
resetVfs();
{
  const s = await freshSvc();
  await s.activate({ reason: 'initial' });
  const r = await s.updateConfig({ message: 'updated', status: 'New status' });
  assertEq(r.success, true, 'success');
  assertEq(r.config.message, 'updated', 'message updated');
  assertEq(r.config.status, 'New status', 'status updated');
  assertEq(r.config.reason, 'initial', 'other fields preserved');
  // File re-written
  const written = JSON.parse(vfs.get('/etc/omai/maintenance.json')!);
  assertEq(written.message, 'updated', 'persisted to disk');
}

// ============================================================================
// isExempt
// ============================================================================
console.log('\n── isExempt ──────────────────────────────────────────────');

// Not active → always true
resetVfs();
{
  const s = await freshSvc();
  assertEq(s.isExempt({ role: 'user' }, '8.8.8.8'), true, 'not active → exempt');
}

// Active + exempt role
resetVfs();
{
  const s = await freshSvc();
  await s.activate({});
  assertEq(s.isExempt({ role: 'super_admin' }, null), true, 'super_admin exempt');
  assertEq(s.isExempt({ role: 'dev_admin' }, null), true, 'dev_admin exempt');
  assertEq(s.isExempt({ role: 'user' }, null), false, 'user not exempt');
}

// Active + exempt IP
resetVfs();
{
  const s = await freshSvc();
  await s.activate({});
  assertEq(s.isExempt(null, '127.0.0.1'), true, 'localhost exempt');
  assertEq(s.isExempt(null, '::1'), true, 'ipv6 localhost exempt');
  assertEq(s.isExempt(null, '8.8.8.8'), false, 'external not exempt');
}

// Active + allowlist
resetVfs();
{
  const s = await freshSvc();
  await s.activate({ allowlist: ['x@y.com', '10.0.0.1'] });
  assertEq(s.isExempt({ email: 'x@y.com' }, null), true, 'allowlisted email');
  assertEq(s.isExempt(null, '10.0.0.1'), true, 'allowlisted IP');
  assertEq(s.isExempt({ email: 'other@y.com' }, null), false, 'non-allowlist email');
}

// ============================================================================
// logMaintenanceEvent + getLogs
// ============================================================================
console.log('\n── logMaintenanceEvent + getLogs ─────────────────────────');

// Missing log file → empty
resetVfs();
{
  const s = await freshSvc();
  const logs = await s.getLogs();
  assertEq(logs, [], 'missing file → []');
}

// Append + read
resetVfs();
{
  const s = await freshSvc();
  await s.logMaintenanceEvent('TEST_EVENT', { foo: 'bar' });
  await s.logMaintenanceEvent('OTHER', { baz: 1 });
  const logs = await s.getLogs();
  assertEq(logs.length, 2, '2 entries');
  // Reversed (most recent first)
  assertEq(logs[0].action, 'OTHER', 'newest first');
  assertEq(logs[1].action, 'TEST_EVENT', 'oldest last');
  assertEq(logs[1].details.foo, 'bar', 'details preserved');
}

// Invalid lines filtered
resetVfs();
{
  const s = await freshSvc();
  vfs.set('/var/log/omai/maintenance.log',
    '{"action":"A","timestamp":"2026-01-01T00:00:00Z"}\n' +
    'not json\n' +
    '{"action":"B","timestamp":"2026-01-02T00:00:00Z"}\n'
  );
  const logs = await s.getLogs();
  assertEq(logs.length, 2, 'invalid line filtered');
  assertEq(logs[0].action, 'B', 'B first (reversed)');
}

// limit
resetVfs();
{
  const s = await freshSvc();
  for (let i = 0; i < 60; i++) {
    await s.logMaintenanceEvent('E', { i });
  }
  const logs = await s.getLogs(10);
  assertEq(logs.length, 10, 'limit respected');
  assertEq(logs[0].details.i, 59, 'latest first');
}

// ============================================================================
// getStatistics
// ============================================================================
console.log('\n── getStatistics ─────────────────────────────────────────');

resetVfs();
{
  const s = await freshSvc();
  // Build a log with 3 pairs
  const logLines = [
    { action: 'ACTIVATED', timestamp: '2026-01-01T00:00:00Z', details: { activatedBy: 'alice', reason: 'routine' } },
    { action: 'DEACTIVATED', timestamp: '2026-01-01T00:01:00Z', details: { duration: 60 } },
    { action: 'ACTIVATED', timestamp: '2026-01-02T00:00:00Z', details: { activatedBy: 'bob', reason: 'emergency' } },
    { action: 'DEACTIVATED', timestamp: '2026-01-02T00:10:00Z', details: { duration: 600 } },
    { action: 'ACTIVATED', timestamp: '2026-01-03T00:00:00Z', details: { activatedBy: 'alice', reason: 'routine' } },
    { action: 'DEACTIVATED', timestamp: '2026-01-03T00:02:00Z', details: { duration: 120 } },
  ];
  vfs.set('/var/log/omai/maintenance.log', logLines.map((l) => JSON.stringify(l)).join('\n') + '\n');

  const stats = await s.getStatistics();
  assertEq(stats.totalActivations, 3, '3 activations');
  assertEq(stats.totalDowntime, 780, 'total downtime = 60+600+120');
  assertEq(stats.averageDowntime, 260, 'avg = 260');
  assertEq(stats.longestDowntime, 600, 'longest = 600');
  assertEq(stats.shortestDowntime, 60, 'shortest = 60');
  assertEq(stats.activationsByUser.alice, 2, 'alice: 2');
  assertEq(stats.activationsByUser.bob, 1, 'bob: 1');
  assertEq(stats.activationsByReason.routine, 2, 'routine: 2');
  assertEq(stats.activationsByReason.emergency, 1, 'emergency: 1');
  assertEq(stats.recentActivations.length, 3, 'recent: 3');
}

// No logs → zero stats (shortest clamped)
resetVfs();
{
  const s = await freshSvc();
  const stats = await s.getStatistics();
  assertEq(stats.totalActivations, 0, '0 activations');
  assertEq(stats.shortestDowntime, 0, 'shortest clamped from Infinity');
  assertEq(stats.averageDowntime, 0, 'avg = 0');
}

// ============================================================================
// emergencyShutdown
// ============================================================================
console.log('\n── emergencyShutdown ─────────────────────────────────────');

resetVfs();
{
  const s = await freshSvc();
  const r = await s.emergencyShutdown('server overload', 'ops');
  assertEq(r.success, true, 'success');
  assert(r.timestamp !== undefined, 'has timestamp');
  assertEq(s.isActive, true, 'activated');
  assertEq(s.config.reason, 'server overload', 'reason passed');
  assertEq(s.config.activatedBy, 'ops', 'activatedBy passed');
  assert(s.config.status.toLowerCase().includes('emergency'), 'emergency status');
}

// ============================================================================
// scheduleMaintenance
// ============================================================================
console.log('\n── scheduleMaintenance ───────────────────────────────────');

// Past time → throws
resetVfs();
{
  const s = await freshSvc();
  const past = new Date(Date.now() - 10000).toISOString();
  await assertThrows(
    async () => await s.scheduleMaintenance(past, {}),
    /future/,
    'past time throws'
  );
}

// Future time → returns with delay
resetVfs();
{
  const s = await freshSvc();
  const future = new Date(Date.now() + 300000).toISOString(); // 5 min out
  const r = await s.scheduleMaintenance(future, { reason: 'planned' });
  assertEq(r.success, true, 'success');
  assertEq(r.scheduledFor, future, 'scheduledFor returned');
  assert(r.delay > 0, 'positive delay');
  assert(r.delay <= 300000, 'delay within range');
  // Not yet active
  assertEq(s.isActive, false, 'not yet active');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main()

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
