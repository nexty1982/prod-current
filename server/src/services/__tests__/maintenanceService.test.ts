#!/usr/bin/env npx tsx
/**
 * Unit tests for services/maintenanceService.js (OMD-1035)
 *
 * Class-based service that manages maintenance mode via filesystem artifacts:
 *   - flag file (presence = active)
 *   - config file (JSON)
 *   - log file (JSONL)
 *   - backup config file
 *
 * Strategy: stub `../utils/logger` via require.cache. Construct an instance
 * then immediately override its hard-coded path fields to point to a
 * /tmp sandbox. The initial `initialize()` may fail trying to mkdir
 * /etc/omai but the error is swallowed by the ctor's try/catch.
 *
 * Coverage:
 *   - initialize / loadMaintenanceState: inactive by default (no flag)
 *   - activate:
 *       · writes flag + config + backup
 *       · merges options with defaults
 *       · eta ISO-formatted when provided
 *       · writes log event
 *       · sets isActive = true
 *   - deactivate:
 *       · no-op when not active
 *       · removes flag file
 *       · writes log event with duration
 *       · clears config + isActive
 *       · missing flag file tolerated
 *   - getStatus: refreshes from disk, reports duration + timeRemaining
 *   - updateConfig:
 *       · throws when not active
 *       · merges updates + persists to both config + backup
 *   - isExempt:
 *       · returns true when inactive
 *       · exempt role
 *       · exempt IP
 *       · allowlist email
 *       · allowlist IP
 *       · non-exempt user/IP
 *   - logMaintenanceEvent: appends JSON line
 *   - getLogs:
 *       · returns [] when file missing
 *       · returns newest-first, limited
 *       · skips malformed lines
 *   - getStatistics:
 *       · counts activations, aggregates downtime, tracks by user/reason
 *       · handles no activations (returns zeros, shortest=0)
 *   - emergencyShutdown: activates with emergency config
 *   - scheduleMaintenance:
 *       · past time → throws
 *       · future time → returns schedule info
 *
 * Run: npx tsx server/src/services/__tests__/maintenanceService.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

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

// ── Stub logger ──────────────────────────────────────────────────────
const loggerPath = require.resolve('../../utils/logger');
const loggerCalls: any[] = [];
require.cache[loggerPath] = {
  id: loggerPath,
  filename: loggerPath,
  loaded: true,
  exports: {
    info: (...args: any[]) => { loggerCalls.push({ level: 'info', args }); },
    warn: (...args: any[]) => { loggerCalls.push({ level: 'warn', args }); },
    error: (...args: any[]) => { loggerCalls.push({ level: 'error', args }); },
    debug: (...args: any[]) => { loggerCalls.push({ level: 'debug', args }); },
  },
} as any;

const MaintenanceService = require('../maintenanceService');

// ── Sandbox helpers ──────────────────────────────────────────────────
const SANDBOX = `/tmp/maintenance-test-${process.pid}-${Date.now()}`;
fs.mkdirSync(SANDBOX, { recursive: true });

let sandboxCounter = 0;
function newSandbox(): { flag: string; cfg: string; log: string; bak: string } {
  sandboxCounter++;
  const dir = path.join(SANDBOX, `s${sandboxCounter}`);
  fs.mkdirSync(dir, { recursive: true });
  return {
    flag: path.join(dir, 'maintenance.flag'),
    cfg: path.join(dir, 'maintenance.json'),
    log: path.join(dir, 'maintenance.log'),
    bak: path.join(dir, 'backup.json'),
  };
}

function buildService(): any {
  const svc = new MaintenanceService();
  const paths = newSandbox();
  svc.flagPath = paths.flag;
  svc.configPath = paths.cfg;
  svc.logPath = paths.log;
  svc.backupConfigPath = paths.bak;
  // Reset state since initial `initialize()` may have left it
  svc.isActive = false;
  svc.config = null;
  return svc;
}

// Wait for any pending async ops from ctor to settle
async function settle() {
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));
}

function cleanup() {
  try { fs.rmSync(SANDBOX, { recursive: true, force: true }); } catch {}
}

async function main() {
try {

// ============================================================================
// initialize / loadMaintenanceState
// ============================================================================
console.log('\n── initialize / loadMaintenanceState ─────────────────────');

{
  const svc = buildService();
  await svc.loadMaintenanceState();
  assertEq(svc.isActive, false, 'inactive when no flag');
  assertEq(svc.config, null, 'no config');
}

// ============================================================================
// activate
// ============================================================================
console.log('\n── activate ──────────────────────────────────────────────');

{
  const svc = buildService();
  const result = await svc.activate({
    message: 'Custom message',
    reason: 'Testing',
    activatedBy: 'tester@x.com',
    eta: '2026-05-01T12:00:00Z',
    exemptIPs: ['10.0.0.5'],
    allowlist: ['vip@x.com'],
  });

  assertEq(result.success, true, 'success');
  assertEq(svc.isActive, true, 'isActive=true');
  assert(fs.existsSync(svc.flagPath), 'flag file exists');
  assert(fs.existsSync(svc.configPath), 'config file exists');
  assert(fs.existsSync(svc.backupConfigPath), 'backup file exists');
  assert(fs.existsSync(svc.logPath), 'log file exists');

  // Config merged
  assertEq(svc.config.message, 'Custom message', 'custom message');
  assertEq(svc.config.reason, 'Testing', 'reason');
  assertEq(svc.config.activatedBy, 'tester@x.com', 'activatedBy');
  assert(svc.config.activatedAt, 'activatedAt set');
  assertEq(svc.config.eta, '2026-05-01T12:00:00.000Z', 'eta ISO');
  assert(svc.config.exemptIPs.includes('10.0.0.5'), 'exemptIPs merged');
  assert(svc.config.exemptIPs.includes('127.0.0.1'), 'default exemptIPs kept');
  assert(svc.config.allowlist.includes('vip@x.com'), 'allowlist merged');

  // Config file on disk
  const onDisk = JSON.parse(fs.readFileSync(svc.configPath, 'utf8'));
  assertEq(onDisk.message, 'Custom message', 'persisted message');

  // Flag file content
  const flag = JSON.parse(fs.readFileSync(svc.flagPath, 'utf8'));
  assertEq(flag.activated, true, 'flag.activated');
  assertEq(flag.activatedBy, 'tester@x.com', 'flag.activatedBy');

  // Log line written
  const logContent = fs.readFileSync(svc.logPath, 'utf8').trim();
  const logLines = logContent.split('\n');
  const lastLog = JSON.parse(logLines[logLines.length - 1]);
  assertEq(lastLog.action, 'ACTIVATED', 'log action');
  assertEq(lastLog.details.activatedBy, 'tester@x.com', 'log details.activatedBy');
}

// Activate with defaults (no options)
{
  const svc = buildService();
  await svc.activate();
  assertEq(svc.isActive, true, 'default activate');
  assertEq(svc.config.reason, 'Manual activation', 'default reason');
  assertEq(svc.config.eta, null, 'null eta when not provided');
}

// ============================================================================
// deactivate
// ============================================================================
console.log('\n── deactivate ────────────────────────────────────────────');

// Not active → no-op
{
  const svc = buildService();
  const result = await svc.deactivate('admin', 'testing');
  assertEq(result.success, false, 'not active → success=false');
  assert(result.message.includes('not currently active'), 'message');
}

// Happy path
{
  const svc = buildService();
  await svc.activate({ reason: 'Upgrade', activatedBy: 'admin' });
  assert(fs.existsSync(svc.flagPath), 'flag exists before deactivate');

  const result = await svc.deactivate('admin', 'done');
  assertEq(result.success, true, 'success');
  assertEq(svc.isActive, false, 'isActive=false');
  assertEq(svc.config, null, 'config cleared');
  assert(!fs.existsSync(svc.flagPath), 'flag removed');
  assert(typeof result.duration === 'number', 'duration numeric');

  // Log should have DEACTIVATED event
  const logLines = fs.readFileSync(svc.logPath, 'utf8').trim().split('\n');
  const deactLog = JSON.parse(logLines[logLines.length - 1]);
  assertEq(deactLog.action, 'DEACTIVATED', 'DEACTIVATED logged');
  assertEq(deactLog.details.deactivatedBy, 'admin', 'deactivatedBy logged');
  assertEq(deactLog.details.originalReason, 'Upgrade', 'originalReason logged');
}

// Missing flag file tolerated
{
  const svc = buildService();
  await svc.activate({ reason: 'test' });
  // Manually delete flag to simulate external removal
  fs.unlinkSync(svc.flagPath);
  const result = await svc.deactivate('admin', 'cleanup');
  assertEq(result.success, true, 'still succeeds when flag missing');
  assertEq(svc.isActive, false, 'deactivated');
}

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

{
  const svc = buildService();
  const inactive = await svc.getStatus();
  assertEq(inactive.isActive, false, 'inactive');
  assertEq(inactive.duration, 0, 'duration 0');
  assertEq(inactive.timeRemaining, null, 'timeRemaining null');

  await svc.activate({
    reason: 'test',
    eta: new Date(Date.now() + 60_000).toISOString(),
  });
  const active = await svc.getStatus();
  assertEq(active.isActive, true, 'active');
  assert(active.duration >= 0, 'duration >=0');
  assert(active.timeRemaining !== null && active.timeRemaining > 0, 'timeRemaining > 0');
}

// ============================================================================
// updateConfig
// ============================================================================
console.log('\n── updateConfig ──────────────────────────────────────────');

// Not active → throws
{
  const svc = buildService();
  let caught: Error | null = null;
  try { await svc.updateConfig({ message: 'new' }); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not active'), 'not active throws');
}

// Happy path
{
  const svc = buildService();
  await svc.activate({ message: 'Original', reason: 'test' });
  const result = await svc.updateConfig({ message: 'Updated', newField: 42 });
  assertEq(result.success, true, 'success');
  assertEq(svc.config.message, 'Updated', 'message updated');
  assertEq((svc.config as any).newField, 42, 'new field added');
  assertEq(svc.config.reason, 'test', 'other fields kept');

  // Persisted to disk
  const onDisk = JSON.parse(fs.readFileSync(svc.configPath, 'utf8'));
  assertEq(onDisk.message, 'Updated', 'disk config updated');
  const backup = JSON.parse(fs.readFileSync(svc.backupConfigPath, 'utf8'));
  assertEq(backup.message, 'Updated', 'backup updated');
}

// ============================================================================
// isExempt
// ============================================================================
console.log('\n── isExempt ──────────────────────────────────────────────');

// Inactive → always exempt
{
  const svc = buildService();
  assertEq(svc.isExempt({ role: 'user' }, '1.2.3.4'), true, 'inactive → exempt');
  assertEq(svc.isExempt(null, null), true, 'null user/ip, inactive');
}

// Active: check all exempt paths
{
  const svc = buildService();
  await svc.activate({
    exemptRoles: ['super_admin'],
    exemptIPs: ['10.0.0.1'],
    allowlist: ['vip@x.com', '192.168.1.1'],
  });

  assertEq(svc.isExempt({ role: 'super_admin' }, null), true, 'exempt role');
  assertEq(svc.isExempt({ role: 'user' }, null), false, 'non-exempt role');
  assertEq(svc.isExempt(null, '10.0.0.1'), true, 'exempt IP (merged defaults incl 127.0.0.1)');
  assertEq(svc.isExempt(null, '127.0.0.1'), true, 'default exempt IP still works');
  assertEq(svc.isExempt(null, '8.8.8.8'), false, 'non-exempt IP');
  assertEq(svc.isExempt({ email: 'vip@x.com' }, null), true, 'allowlist email');
  assertEq(svc.isExempt({ email: 'other@x.com' }, null), false, 'non-allowlist email');
  assertEq(svc.isExempt(null, '192.168.1.1'), true, 'allowlist IP');
  assertEq(svc.isExempt(null, null), false, 'null user/ip, active');
}

// ============================================================================
// logMaintenanceEvent + getLogs
// ============================================================================
console.log('\n── logMaintenanceEvent / getLogs ─────────────────────────');

// Empty log → []
{
  const svc = buildService();
  const logs = await svc.getLogs();
  assertEq(logs, [], 'no log file → []');
}

// Write + read back
{
  const svc = buildService();
  await svc.logMaintenanceEvent('TEST_A', { x: 1 });
  await svc.logMaintenanceEvent('TEST_B', { y: 2 });
  await svc.logMaintenanceEvent('TEST_C', { z: 3 });

  const logs = await svc.getLogs();
  assertEq(logs.length, 3, '3 entries');
  // Newest first
  assertEq(logs[0].action, 'TEST_C', 'newest first');
  assertEq(logs[2].action, 'TEST_A', 'oldest last');
  assertEq(logs[0].details.z, 3, 'details preserved');
  assert(logs[0].timestamp, 'timestamp present');
  assertEq(logs[0].pid, process.pid, 'pid recorded');
}

// Limit
{
  const svc = buildService();
  for (let i = 0; i < 5; i++) {
    await svc.logMaintenanceEvent(`E${i}`, {});
  }
  const logs = await svc.getLogs(2);
  assertEq(logs.length, 2, 'limit=2');
  assertEq(logs[0].action, 'E4', 'newest (E4) included');
  assertEq(logs[1].action, 'E3', 'next newest (E3) included');
}

// Malformed lines skipped
{
  const svc = buildService();
  fs.writeFileSync(svc.logPath, '{"valid":1}\nNOT JSON\n{"also":2}\n');
  const logs = await svc.getLogs();
  assertEq(logs.length, 2, 'malformed skipped');
}

// ============================================================================
// getStatistics
// ============================================================================
console.log('\n── getStatistics ─────────────────────────────────────────');

// No activations
{
  const svc = buildService();
  const stats = await svc.getStatistics();
  assertEq(stats.totalActivations, 0, '0 activations');
  assertEq(stats.totalDowntime, 0, '0 downtime');
  assertEq(stats.averageDowntime, 0, 'avg 0');
  assertEq(stats.shortestDowntime, 0, 'shortest 0 (Infinity normalized)');
  assertEq(stats.longestDowntime, 0, 'longest 0');
}

// Multiple activate/deactivate cycles
{
  const svc = buildService();
  // Write pre-seeded logs directly (newest first in file doesn't matter — getLogs reverses)
  const events = [
    { ts: '2026-04-01T00:00:00Z', action: 'ACTIVATED', details: { activatedBy: 'alice', reason: 'upgrade' } },
    { ts: '2026-04-01T00:10:00Z', action: 'DEACTIVATED', details: { deactivatedBy: 'alice', duration: 600 } },
    { ts: '2026-04-02T00:00:00Z', action: 'ACTIVATED', details: { activatedBy: 'bob', reason: 'fix' } },
    { ts: '2026-04-02T00:05:00Z', action: 'DEACTIVATED', details: { deactivatedBy: 'bob', duration: 300 } },
    { ts: '2026-04-03T00:00:00Z', action: 'ACTIVATED', details: { activatedBy: 'alice', reason: 'upgrade' } },
    { ts: '2026-04-03T00:20:00Z', action: 'DEACTIVATED', details: { deactivatedBy: 'alice', duration: 1200 } },
  ];
  const lines = events
    .map(e => JSON.stringify({
      timestamp: e.ts,
      action: e.action,
      details: e.details,
      pid: 1,
      hostname: 'test',
    }))
    .join('\n') + '\n';
  fs.writeFileSync(svc.logPath, lines);

  const stats = await svc.getStatistics();
  assertEq(stats.totalActivations, 3, '3 activations');
  assertEq(stats.totalDowntime, 600 + 300 + 1200, 'total downtime 2100s');
  assertEq(stats.averageDowntime, 700, 'avg 700s');
  assertEq(stats.longestDowntime, 1200, 'longest 1200s');
  assertEq(stats.shortestDowntime, 300, 'shortest 300s');
  assertEq(stats.activationsByUser.alice, 2, 'alice 2 activations');
  assertEq(stats.activationsByUser.bob, 1, 'bob 1 activation');
  assertEq(stats.activationsByReason.upgrade, 2, 'upgrade 2');
  assertEq(stats.activationsByReason.fix, 1, 'fix 1');
  assertEq(stats.recentActivations.length, 3, '3 recent (under cap of 10)');
}

// ============================================================================
// emergencyShutdown
// ============================================================================
console.log('\n── emergencyShutdown ─────────────────────────────────────');

{
  const svc = buildService();
  const result = await svc.emergencyShutdown('Fire in server room', 'ops');
  assertEq(result.success, true, 'success');
  assertEq(svc.isActive, true, 'active after emergency');
  assertEq(svc.config.reason, 'Fire in server room', 'reason');
  assertEq(svc.config.activatedBy, 'ops', 'activatedBy');
  assert(svc.config.message.includes('emergency'), 'emergency message');
  assertEq(svc.config.status, 'Emergency maintenance in progress', 'emergency status');
}

// ============================================================================
// scheduleMaintenance
// ============================================================================
console.log('\n── scheduleMaintenance ───────────────────────────────────');

// Past time → throws
{
  const svc = buildService();
  let caught: Error | null = null;
  try {
    await svc.scheduleMaintenance(new Date(Date.now() - 1000).toISOString(), {});
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('must be in the future'), 'past → throws');
}

// Future time → success (we set a very long delay so setTimeout never fires in the test)
{
  const svc = buildService();
  const future = new Date(Date.now() + 3600_000).toISOString();
  const result = await svc.scheduleMaintenance(future, { reason: 'planned' });
  assertEq(result.success, true, 'scheduled');
  assertEq(result.scheduledFor, future, 'scheduledFor');
  assert(result.delay > 0, 'delay > 0');
  // Note: the setTimeout is still pending — it would fire after ~1h, well past test end.
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

} finally {
  cleanup();
}

if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { cleanup(); console.error('Unhandled:', e); process.exit(1); });
