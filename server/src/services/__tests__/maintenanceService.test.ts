#!/usr/bin/env npx tsx
/**
 * Unit tests for services/maintenanceService.js (OMD-1213)
 *
 * SUT manages maintenance-mode state via three files: flag, config, log.
 * All fs access goes through `fs.promises` (captured at top of module), so
 * we stub `fs` via require.cache BEFORE loading the SUT.
 *
 * The constructor fire-and-forgets initialize() → ensureDirectories() +
 * loadMaintenanceState(). Tests await a tick after construction and then
 * seed the virtual filesystem with a clean slate per scenario.
 *
 * Coverage:
 *   - constructor: default config, paths
 *   - ensureDirectories: creates 4 dirs (recursive + mode)
 *   - loadMaintenanceState: flag present → isActive, flag missing → inactive
 *   - loadConfig: primary path → backup fallback → default
 *   - activate: writes all 3 files, merges options, logs event
 *   - deactivate: not active → soft message, active → removes flag + logs
 *   - getStatus: refreshes + returns shape with duration/timeRemaining
 *   - updateConfig: throws if not active, else writes
 *   - isExempt: not-active pass, role exempt, IP exempt, allowlist (email/IP)
 *   - logMaintenanceEvent: appends JSON line
 *   - getLogs: parses, limits, reverses; ENOENT → []
 *   - getStatistics: aggregates ACTIVATED/DEACTIVATED pairs
 *   - emergencyShutdown: calls activate with emergency params
 *   - scheduleMaintenance: rejects past time, accepts future time
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

// ── logger stub ────────────────────────────────────────────────────────
const loggerStub = { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} };
const loggerPath = require.resolve('../../utils/logger');
require.cache[loggerPath] = {
  id: loggerPath,
  filename: loggerPath,
  loaded: true,
  exports: loggerStub,
} as any;

// ── fs stub ────────────────────────────────────────────────────────────
// Virtual in-memory filesystem keyed by absolute path
const vfs = new Map<string, string>();
const mkdirCalls: Array<{ dir: string; opts: any }> = [];

function enoent(p: string): Error {
  const e: any = new Error(`ENOENT: ${p}`);
  e.code = 'ENOENT';
  return e;
}

const fsPromisesMock = {
  mkdir: async (dir: string, opts: any) => {
    mkdirCalls.push({ dir, opts });
    return undefined;
  },
  access: async (p: string) => {
    if (!vfs.has(p)) throw enoent(p);
    return undefined;
  },
  readFile: async (p: string, _enc?: string) => {
    if (!vfs.has(p)) throw enoent(p);
    return vfs.get(p)!;
  },
  writeFile: async (p: string, data: string) => {
    vfs.set(p, data);
  },
  appendFile: async (p: string, data: string) => {
    vfs.set(p, (vfs.get(p) || '') + data);
  },
  unlink: async (p: string) => {
    if (!vfs.has(p)) throw enoent(p);
    vfs.delete(p);
  },
};

// Preserve real fs for anything outside promises (the SUT only uses .promises)
const realFs = require('fs');
const fsPath = require.resolve('fs');
require.cache[fsPath] = {
  id: fsPath,
  filename: fsPath,
  loaded: true,
  exports: Object.assign({}, realFs, { promises: fsPromisesMock }),
} as any;

function resetVfs() {
  vfs.clear();
  mkdirCalls.length = 0;
}

const MaintenanceService = require('../maintenanceService');

// Helper: fresh service + initialized
async function freshService(): Promise<any> {
  resetVfs();
  const svc = new MaintenanceService();
  // Let fire-and-forget initialize() complete
  await new Promise(r => setTimeout(r, 10));
  return svc;
}

async function main() {

// ============================================================================
// constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

{
  resetVfs();
  const svc = new MaintenanceService();
  assertEq(svc.flagPath, '/etc/omai/maintenance.flag', 'flagPath');
  assertEq(svc.configPath, '/etc/omai/maintenance.json', 'configPath');
  assertEq(svc.logPath, '/var/log/omai/maintenance.log', 'logPath');
  assert(/config\/maintenance\.json$/.test(svc.backupConfigPath), 'backupConfigPath ends in config/maintenance.json');
  assertEq(svc.isActive, false, 'isActive starts false');
  assertEq(svc.defaultConfig.exemptRoles, ['super_admin', 'dev_admin'], 'default exempt roles');
  assertEq(svc.defaultConfig.exemptIPs, ['127.0.0.1', '::1'], 'default exempt IPs');
  assertEq(svc.defaultConfig.allowlist, [], 'default allowlist empty');

  await new Promise(r => setTimeout(r, 10));
  // After initialize(), mkdir should have been called for 4 directories
  assert(mkdirCalls.length >= 4, 'mkdir called for directories');
  const dirs = mkdirCalls.map(c => c.dir);
  assert(dirs.includes('/etc/omai'), '/etc/omai dir');
  assert(dirs.includes('/var/log/omai'), '/var/log/omai dir');
  assertEq(mkdirCalls[0].opts.recursive, true, 'mkdir recursive');
  assertEq(mkdirCalls[0].opts.mode, 0o755, 'mkdir mode 755');
}

// ============================================================================
// loadMaintenanceState: inactive (no flag)
// ============================================================================
console.log('\n── loadMaintenanceState ──────────────────────────────────');

{
  const svc = await freshService();
  assertEq(svc.isActive, false, 'no flag → inactive');
  assertEq(svc.config, null, 'config null');
}

// Flag present → active, loads config
{
  resetVfs();
  vfs.set('/etc/omai/maintenance.flag', '{"activated":true}');
  vfs.set('/etc/omai/maintenance.json', JSON.stringify({ reason: 'test', message: 'hello', status: 'up' }));
  const svc = new MaintenanceService();
  await new Promise(r => setTimeout(r, 10));
  assertEq(svc.isActive, true, 'flag present → active');
  assertEq(svc.config.reason, 'test', 'config reason loaded');
  assertEq(svc.config.message, 'hello', 'config message loaded');
  assertEq(svc.config.status, 'up', 'config status loaded');
  // Defaults merged in
  assertEq(svc.config.exemptRoles, ['super_admin', 'dev_admin'], 'defaults merged');
}

// ============================================================================
// loadConfig: backup fallback
// ============================================================================
console.log('\n── loadConfig: fallbacks ─────────────────────────────────');

// Primary missing, backup present
{
  resetVfs();
  vfs.set('/etc/omai/maintenance.flag', 'x');
  const svc = new MaintenanceService();
  await new Promise(r => setTimeout(r, 10));
  // Set backup at the instance's backup path
  vfs.set(svc.backupConfigPath, JSON.stringify({ reason: 'from-backup' }));
  // Call loadConfig directly to exercise the fallback
  await svc.loadConfig();
  assertEq(svc.config.reason, 'from-backup', 'loaded from backup');
}

// Both missing → defaults
{
  resetVfs();
  const svc = new MaintenanceService();
  await new Promise(r => setTimeout(r, 10));
  await svc.loadConfig();
  assertEq(svc.config.reason, 'Scheduled maintenance', 'default reason');
  assertEq(svc.config.status, 'System maintenance in progress', 'default status');
}

// ============================================================================
// activate
// ============================================================================
console.log('\n── activate ──────────────────────────────────────────────');

{
  const svc = await freshService();
  const result = await svc.activate({
    message: 'Hello',
    status: 'Down',
    reason: 'Upgrade',
    activatedBy: 'admin',
    allowlist: ['user@example.com'],
    eta: '2026-12-31T00:00:00Z',
  });
  assertEq(result.success, true, 'activate success');
  assertEq(result.config.message, 'Hello', 'config.message');
  assertEq(result.config.reason, 'Upgrade', 'config.reason');
  assertEq(result.config.activatedBy, 'admin', 'activatedBy');
  assertEq(result.config.eta, '2026-12-31T00:00:00.000Z', 'eta ISO');
  assert(result.config.allowlist.includes('user@example.com'), 'allowlist merged');
  assert(result.config.exemptIPs.includes('127.0.0.1'), 'exempt IPs default included');
  assertEq(svc.isActive, true, 'isActive = true');
  // Files written
  assert(vfs.has('/etc/omai/maintenance.json'), 'configPath written');
  assert(vfs.has('/etc/omai/maintenance.flag'), 'flagPath written');
  assert(vfs.has(svc.backupConfigPath), 'backupConfigPath written');
  // Log entry appended
  assert(vfs.has('/var/log/omai/maintenance.log'), 'log file appended');
  const logContent = vfs.get('/var/log/omai/maintenance.log')!;
  assert(/ACTIVATED/.test(logContent), 'log mentions ACTIVATED');
}

// Activate with no options → defaults
{
  const svc = await freshService();
  const r = await svc.activate();
  assertEq(r.config.activatedBy, 'system', 'default activatedBy');
  assertEq(r.config.reason, 'Manual activation', 'default reason');
  assertEq(r.config.eta, null, 'default eta null');
}

// ============================================================================
// deactivate
// ============================================================================
console.log('\n── deactivate ────────────────────────────────────────────');

// Not active → soft failure
{
  const svc = await freshService();
  const r = await svc.deactivate('admin', 'unneeded');
  assertEq(r.success, false, 'not active → success false');
  assert(/not currently active/.test(r.message), 'message mentions not active');
}

// Active → deactivates cleanly
{
  const svc = await freshService();
  await svc.activate({ reason: 'test', activatedBy: 'alice' });
  assertEq(svc.isActive, true, 'active before deactivate');
  const r = await svc.deactivate('bob', 'done');
  assertEq(r.success, true, 'deactivate success');
  assert(typeof r.duration === 'number', 'duration number');
  assertEq(svc.isActive, false, 'isActive false after');
  assertEq(svc.config, null, 'config cleared');
  assert(!vfs.has('/etc/omai/maintenance.flag'), 'flag removed');
  // Log should have DEACTIVATED entry
  const logContent = vfs.get('/var/log/omai/maintenance.log')!;
  assert(/DEACTIVATED/.test(logContent), 'log mentions DEACTIVATED');
}

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

{
  const svc = await freshService();
  const s = await svc.getStatus();
  assertEq(s.isActive, false, 'inactive status');
  assertEq(s.config, null, 'null config');
  assertEq(s.duration, 0, 'zero duration');
  assertEq(s.timeRemaining, null, 'null timeRemaining');
}

// Active with ETA in the future
{
  const svc = await freshService();
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await svc.activate({ eta: future });
  const s = await svc.getStatus();
  assertEq(s.isActive, true, 'active status');
  assert(s.duration >= 0, 'duration non-negative');
  assert(s.timeRemaining !== null, 'timeRemaining not null');
  assert(s.timeRemaining > 0, 'timeRemaining positive');
}

// ============================================================================
// updateConfig
// ============================================================================
console.log('\n── updateConfig ──────────────────────────────────────────');

// Not active → throws
{
  const svc = await freshService();
  let caught: Error | null = null;
  try { await svc.updateConfig({ message: 'x' }); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when inactive');
  assert(caught !== null && /not active/.test(caught.message), 'error mentions not active');
}

// Active → merges updates + writes
{
  const svc = await freshService();
  await svc.activate({ reason: 'r1', message: 'm1' });
  const r = await svc.updateConfig({ message: 'new message', eta: '2027-01-01T00:00:00Z' });
  assertEq(r.success, true, 'updateConfig success');
  assertEq(svc.config.message, 'new message', 'message updated');
  assertEq(svc.config.reason, 'r1', 'reason preserved');
  // File rewritten — check persistence
  const configOnDisk = JSON.parse(vfs.get('/etc/omai/maintenance.json')!);
  assertEq(configOnDisk.message, 'new message', 'config file updated');
}

// ============================================================================
// isExempt
// ============================================================================
console.log('\n── isExempt ──────────────────────────────────────────────');

// Not active → everyone exempt
{
  const svc = await freshService();
  assertEq(svc.isExempt(null, null), true, 'inactive: null user/ip exempt');
  assertEq(svc.isExempt({ role: 'user' }, '1.2.3.4'), true, 'inactive: anyone exempt');
}

// Active: exempt role
{
  const svc = await freshService();
  await svc.activate();
  assertEq(svc.isExempt({ role: 'super_admin' }, null), true, 'super_admin exempt');
  assertEq(svc.isExempt({ role: 'dev_admin' }, null), true, 'dev_admin exempt');
  assertEq(svc.isExempt({ role: 'priest' }, null), false, 'priest NOT exempt');
  assertEq(svc.isExempt(null, null), false, 'null user/ip NOT exempt when active');
}

// Exempt IP
{
  const svc = await freshService();
  await svc.activate();
  assertEq(svc.isExempt(null, '127.0.0.1'), true, '127.0.0.1 exempt');
  assertEq(svc.isExempt(null, '::1'), true, '::1 exempt');
  assertEq(svc.isExempt(null, '8.8.8.8'), false, '8.8.8.8 NOT exempt');
}

// Allowlist — email
{
  const svc = await freshService();
  await svc.activate({ allowlist: ['vip@example.com'] });
  assertEq(svc.isExempt({ email: 'vip@example.com' }, null), true, 'vip email exempt');
  assertEq(svc.isExempt({ email: 'other@example.com' }, null), false, 'other email NOT exempt');
}

// Allowlist — IP
{
  const svc = await freshService();
  await svc.activate({ allowlist: ['10.0.0.1'] });
  assertEq(svc.isExempt(null, '10.0.0.1'), true, '10.0.0.1 in allowlist exempt');
}

// ============================================================================
// logMaintenanceEvent
// ============================================================================
console.log('\n── logMaintenanceEvent ───────────────────────────────────');

{
  const svc = await freshService();
  await svc.logMaintenanceEvent('TEST', { foo: 'bar' });
  const content = vfs.get('/var/log/omai/maintenance.log');
  assert(content !== undefined, 'log file exists');
  assert(/TEST/.test(content!), 'action logged');
  assert(/"foo":"bar"/.test(content!), 'details serialized');
  assert(/"pid":/.test(content!), 'pid included');
  assert(/"hostname":/.test(content!), 'hostname included');
}

// ============================================================================
// getLogs
// ============================================================================
console.log('\n── getLogs ───────────────────────────────────────────────');

{
  const svc = await freshService();
  await svc.logMaintenanceEvent('ACTIVATED', { reason: 'a' });
  await svc.logMaintenanceEvent('DEACTIVATED', { duration: 10 });
  await svc.logMaintenanceEvent('ACTIVATED', { reason: 'b' });

  const logs = await svc.getLogs(10);
  assertEq(logs.length, 3, '3 logs');
  // Most recent first
  assertEq(logs[0].action, 'ACTIVATED', 'most recent first');
  assertEq(logs[0].details.reason, 'b', 'newest reason');
  assertEq(logs[2].details.reason, 'a', 'oldest reason last');
}

// Limit
{
  const svc = await freshService();
  for (let i = 0; i < 20; i++) {
    await svc.logMaintenanceEvent('TEST', { n: i });
  }
  const logs = await svc.getLogs(5);
  assertEq(logs.length, 5, '5 returned');
}

// ENOENT → []
{
  const svc = await freshService();
  vfs.delete('/var/log/omai/maintenance.log'); // ensure no log
  const logs = await svc.getLogs();
  assertEq(logs, [], 'no file → empty array');
}

// Malformed JSON line filtered out
{
  const svc = await freshService();
  vfs.set('/var/log/omai/maintenance.log', '{"ok":1}\nnot-json\n{"ok":2}\n');
  const logs = await svc.getLogs();
  assertEq(logs.length, 2, '2 valid entries');
}

// ============================================================================
// getStatistics
// ============================================================================
console.log('\n── getStatistics ─────────────────────────────────────────');

{
  const svc = await freshService();
  // Emit activation pairs via logMaintenanceEvent
  await svc.logMaintenanceEvent('ACTIVATED', { activatedBy: 'alice', reason: 'upgrade' });
  await new Promise(r => setTimeout(r, 5));
  await svc.logMaintenanceEvent('DEACTIVATED', { duration: 60 });
  await new Promise(r => setTimeout(r, 5));
  await svc.logMaintenanceEvent('ACTIVATED', { activatedBy: 'alice', reason: 'hotfix' });
  await new Promise(r => setTimeout(r, 5));
  await svc.logMaintenanceEvent('DEACTIVATED', { duration: 20 });
  await new Promise(r => setTimeout(r, 5));
  await svc.logMaintenanceEvent('ACTIVATED', { activatedBy: 'bob', reason: 'upgrade' });
  await new Promise(r => setTimeout(r, 5));
  await svc.logMaintenanceEvent('DEACTIVATED', { duration: 100 });

  const stats = await svc.getStatistics();
  assertEq(stats.totalActivations, 3, '3 activations');
  assertEq(stats.totalDowntime, 180, 'total downtime 180s');
  assertEq(stats.averageDowntime, 60, 'avg downtime 60s');
  assertEq(stats.longestDowntime, 100, 'longest 100s');
  assertEq(stats.shortestDowntime, 20, 'shortest 20s');
  assertEq(stats.activationsByUser['alice'], 2, 'alice 2 activations');
  assertEq(stats.activationsByUser['bob'], 1, 'bob 1 activation');
  assertEq(stats.activationsByReason['upgrade'], 2, 'upgrade 2');
  assertEq(stats.activationsByReason['hotfix'], 1, 'hotfix 1');
  assertEq(stats.recentActivations.length, 3, '3 recent activations');
}

// Empty logs → zero stats
{
  const svc = await freshService();
  const stats = await svc.getStatistics();
  assertEq(stats.totalActivations, 0, '0 activations');
  assertEq(stats.totalDowntime, 0, '0 downtime');
  assertEq(stats.averageDowntime, 0, '0 avg');
  assertEq(stats.longestDowntime, 0, '0 longest');
  assertEq(stats.shortestDowntime, 0, '0 shortest (Infinity normalized)');
}

// ============================================================================
// emergencyShutdown
// ============================================================================
console.log('\n── emergencyShutdown ─────────────────────────────────────');

{
  const svc = await freshService();
  const r = await svc.emergencyShutdown('fire!', 'oncall');
  assertEq(r.success, true, 'emergency success');
  assert(typeof r.timestamp === 'string', 'timestamp returned');
  assertEq(svc.isActive, true, 'isActive after emergency');
  assertEq(svc.config.activatedBy, 'oncall', 'activatedBy propagated');
  assertEq(svc.config.reason, 'fire!', 'reason propagated');
  assert(/Emergency/.test(svc.config.status), 'emergency status');
}

// ============================================================================
// scheduleMaintenance
// ============================================================================
console.log('\n── scheduleMaintenance ───────────────────────────────────');

// Past time → throws
{
  const svc = await freshService();
  let caught: Error | null = null;
  try {
    await svc.scheduleMaintenance(new Date(Date.now() - 1000).toISOString());
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'past time throws');
  assert(caught !== null && /in the future/.test(caught.message), 'error message');
}

// Future time → accepted
{
  const svc = await freshService();
  const future = new Date(Date.now() + 60 * 1000).toISOString();
  const r = await svc.scheduleMaintenance(future, { reason: 'planned' });
  assertEq(r.success, true, 'scheduled success');
  assertEq(r.scheduledFor, future, 'scheduledFor matches');
  assert(r.delay > 0, 'positive delay');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

// Important: scheduleMaintenance set a real 60s timer via setTimeout — exit
// early so the test process doesn't hang waiting for it.
process.exit(0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
