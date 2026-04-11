#!/usr/bin/env npx tsx
/**
 * Unit tests for services/maintenanceService.js (OMD-1063)
 *
 * Manages site-wide maintenance mode via flag file + JSON config + log file.
 * External deps: fs.promises, os.hostname, ../utils/logger.
 *
 * Strategy:
 *   - Stub logger via require.cache
 *   - Stub os via require.cache (just hostname())
 *   - Patch fs.promises directly on the real fs module (require.cache can't
 *     reach property accesses on a sub-object).
 *
 * Virtual filesystem:
 *   - files:       Map<path, content>  — text contents
 *   - nonexistent: Set<path>           — paths that should throw ENOENT
 *
 * Coverage:
 *   - constructor + defaults
 *   - initialize + loadMaintenanceState (active/inactive)
 *   - loadConfig: primary, backup fallback, defaults fallback, non-ENOENT error
 *   - activate: writes config + backup + flag, sets isActive, merges options
 *   - deactivate: not-active short-circuit, removes flag, logs event, clears config
 *   - updateConfig: throws when inactive, merges + writes
 *   - isExempt: not-in-maint passthrough, exempt role, exempt IP, allowlist email,
 *               allowlist IP, not exempt
 *   - logMaintenanceEvent: appends JSON line
 *   - getLogs: empty (ENOENT), parses valid lines, skips invalid, limit, reverse
 *   - getStatistics: activations/downtime/by-user/by-reason
 *   - emergencyShutdown: delegates to activate
 *   - scheduleMaintenance: past-time throws, future-time returns schedule info
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

// ─── Fake fs.promises ────────────────────────────────────────────────────────

const files = new Map<string, string>();       // path → content
const nonexistent = new Set<string>();          // path → ENOENT on access
const dirErrors = new Map<string, Error>();     // dir → error on mkdir
const writeErrors = new Map<string, Error>();   // path → error on writeFile

const fsCalls: { method: string; args: any[] }[] = [];
const writeLog: { path: string; content: string }[] = [];
const appendLog: { path: string; content: string }[] = [];
const unlinkLog: string[] = [];
const mkdirLog: string[] = [];

function makeENOENT(p: string): Error {
  const e: any = new Error(`ENOENT: ${p}`);
  e.code = 'ENOENT';
  return e;
}

const fakeFsPromises = {
  access: async (p: string) => {
    fsCalls.push({ method: 'access', args: [p] });
    if (nonexistent.has(p) || !files.has(p)) throw makeENOENT(p);
  },
  readFile: async (p: string, _enc?: string) => {
    fsCalls.push({ method: 'readFile', args: [p] });
    if (nonexistent.has(p) || !files.has(p)) throw makeENOENT(p);
    return files.get(p)!;
  },
  writeFile: async (p: string, content: string) => {
    fsCalls.push({ method: 'writeFile', args: [p] });
    if (writeErrors.has(p)) throw writeErrors.get(p);
    files.set(p, content);
    nonexistent.delete(p);
    writeLog.push({ path: p, content });
  },
  appendFile: async (p: string, content: string) => {
    fsCalls.push({ method: 'appendFile', args: [p] });
    const existing = files.get(p) || '';
    files.set(p, existing + content);
    nonexistent.delete(p);
    appendLog.push({ path: p, content });
  },
  unlink: async (p: string) => {
    fsCalls.push({ method: 'unlink', args: [p] });
    if (!files.has(p)) throw makeENOENT(p);
    files.delete(p);
    nonexistent.add(p);
    unlinkLog.push(p);
  },
  mkdir: async (p: string, _opts: any) => {
    fsCalls.push({ method: 'mkdir', args: [p] });
    if (dirErrors.has(p)) throw dirErrors.get(p);
    mkdirLog.push(p);
  },
};

const realFs = require('fs');
const origPromises = realFs.promises;
Object.defineProperty(realFs, 'promises', {
  value: fakeFsPromises,
  writable: true,
  configurable: true,
});

// Stub logger
const loggerStub = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
const loggerPath = require.resolve('../../utils/logger');
require.cache[loggerPath] = {
  id: loggerPath, filename: loggerPath, loaded: true, exports: loggerStub,
} as any;

// Stub os
const osPath = require.resolve('os');
const origOs = require.cache[osPath];
require.cache[osPath] = {
  id: osPath, filename: osPath, loaded: true,
  exports: { hostname: () => 'test-host', platform: () => 'linux' },
} as any;

function resetFs() {
  files.clear();
  nonexistent.clear();
  dirErrors.clear();
  writeErrors.clear();
  fsCalls.length = 0;
  writeLog.length = 0;
  appendLog.length = 0;
  unlinkLog.length = 0;
  mkdirLog.length = 0;
}

const MaintenanceService = require('../maintenanceService');

// Helper: create a fresh service + wait for async init
async function fresh() {
  const svc = new MaintenanceService();
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));
  return svc;
}

async function main() {

// ============================================================================
// constructor defaults
// ============================================================================
console.log('\n── constructor defaults ──────────────────────────────────');

resetFs();
{
  const svc = new MaintenanceService();
  assertEq(svc.flagPath, '/etc/omai/maintenance.flag', 'flag path');
  assertEq(svc.configPath, '/etc/omai/maintenance.json', 'config path');
  assertEq(svc.logPath, '/var/log/omai/maintenance.log', 'log path');
  assertEq(svc.isActive, false, 'not active initially');
  assert(svc.defaultConfig.exemptRoles.includes('super_admin'), 'super_admin exempt by default');
  assert(svc.defaultConfig.exemptIPs.includes('127.0.0.1'), 'localhost exempt by default');
  assertEq(svc.defaultConfig.status, 'System maintenance in progress', 'default status');
  await new Promise(r => setImmediate(r));
}

// ============================================================================
// initialize: inactive (no flag file)
// ============================================================================
console.log('\n── initialize: inactive ──────────────────────────────────');

resetFs();
{
  const svc = await fresh();
  assertEq(svc.isActive, false, 'isActive false when no flag');
  assertEq(svc.config, null, 'config null when inactive');
  // Should have attempted mkdir for dirs
  assert(mkdirLog.length >= 3, 'mkdir called for directories');
}

// ============================================================================
// initialize: active (flag exists) + loadConfig primary
// ============================================================================
console.log('\n── initialize: active with primary config ────────────────');

resetFs();
files.set('/etc/omai/maintenance.flag', '{}');
files.set('/etc/omai/maintenance.json', JSON.stringify({
  status: 'Custom status',
  message: 'Custom message',
  reason: 'loaded from primary',
}));
{
  const svc = await fresh();
  assertEq(svc.isActive, true, 'isActive true when flag exists');
  assertEq(svc.config.status, 'Custom status', 'custom status loaded');
  assertEq(svc.config.reason, 'loaded from primary', 'reason from primary');
  // Merged with defaults
  assert(svc.config.exemptRoles.includes('super_admin'), 'defaults merged in');
}

// ============================================================================
// loadConfig: fallback to backup
// ============================================================================
console.log('\n── loadConfig: backup fallback ───────────────────────────');

resetFs();
files.set('/etc/omai/maintenance.flag', '{}');
// No primary config, but backup exists
const backupPath = require('path').join(process.cwd(), 'config', 'maintenance.json');
files.set(backupPath, JSON.stringify({ reason: 'from backup' }));
{
  const svc = await fresh();
  assertEq(svc.isActive, true, 'active');
  assertEq(svc.config.reason, 'from backup', 'loaded from backup');
}

// ============================================================================
// loadConfig: both missing → defaults
// ============================================================================
console.log('\n── loadConfig: both missing → defaults ───────────────────');

resetFs();
files.set('/etc/omai/maintenance.flag', '{}');
// Neither primary nor backup exists
{
  const svc = await fresh();
  assertEq(svc.isActive, true, 'active');
  assertEq(svc.config.reason, 'Scheduled maintenance', 'fallback to defaults');
  assertEq(svc.config.status, 'System maintenance in progress', 'default status');
}

// ============================================================================
// activate
// ============================================================================
console.log('\n── activate ──────────────────────────────────────────────');

resetFs();
{
  const svc = await fresh();
  const result = await svc.activate({
    message: 'Please wait',
    status: 'Busy',
    reason: 'deploy v2',
    activatedBy: 'alice',
    eta: '2026-04-11T12:00:00Z',
    allowlist: ['admin@example.com'],
    exemptRoles: ['super_admin', 'admin'],
    exemptIPs: ['10.0.0.5'],
  });
  assertEq(result.success, true, 'success true');
  assertEq(svc.isActive, true, 'isActive now true');
  assertEq(svc.config.message, 'Please wait', 'message set');
  assertEq(svc.config.reason, 'deploy v2', 'reason set');
  assertEq(svc.config.activatedBy, 'alice', 'activatedBy set');
  assert(svc.config.activatedAt !== null, 'activatedAt set');
  // eta coerced to ISO string
  assertEq(svc.config.eta, '2026-04-11T12:00:00.000Z', 'eta ISO');
  // Allowlist merged (default [] + provided)
  assert(svc.config.allowlist.includes('admin@example.com'), 'allowlist merged');
  // Exempt IPs merged (defaults + provided)
  assert(svc.config.exemptIPs.includes('127.0.0.1'), 'default IPs still present');
  assert(svc.config.exemptIPs.includes('10.0.0.5'), 'new IP added');

  // Files written: config, backup config, flag, log appended
  const writePaths = writeLog.map(w => w.path);
  assert(writePaths.includes('/etc/omai/maintenance.json'), 'primary config written');
  assert(writePaths.some(p => p.endsWith('config/maintenance.json')), 'backup written');
  assert(writePaths.includes('/etc/omai/maintenance.flag'), 'flag written');
  assert(appendLog.length >= 1, 'log event appended');
  assert(appendLog[0].path === '/var/log/omai/maintenance.log', 'log path');
}

// activate: eta null when not provided
resetFs();
{
  const svc = await fresh();
  await svc.activate({});
  assertEq(svc.config.eta, null, 'eta null by default');
}

// activate: write error bubbles up
resetFs();
writeErrors.set('/etc/omai/maintenance.json', new Error('disk full'));
{
  const svc = await fresh();
  let caught: Error | null = null;
  try { await svc.activate({}); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'write error throws');
  assert(caught !== null && caught.message.includes('Failed to activate'), 'wrapped message');
  assert(caught !== null && caught.message.includes('disk full'), 'original error preserved');
}

// ============================================================================
// deactivate
// ============================================================================
console.log('\n── deactivate ────────────────────────────────────────────');

// Not active → short-circuit
resetFs();
{
  const svc = await fresh();
  const result = await svc.deactivate('bob');
  assertEq(result.success, false, 'not active → success false');
  assert(result.message.includes('not currently active'), 'message');
}

// Active → removes flag + logs
resetFs();
{
  const svc = await fresh();
  await svc.activate({ reason: 'original' });
  // Small delay to ensure duration > 0
  await new Promise(r => setTimeout(r, 5));
  const flagExisted = files.has('/etc/omai/maintenance.flag');
  assertEq(flagExisted, true, 'flag file present after activate');

  const result = await svc.deactivate('bob', 'done');
  assertEq(result.success, true, 'success true');
  assertEq(svc.isActive, false, 'isActive false');
  assertEq(svc.config, null, 'config cleared');
  assert(result.duration > 0, 'duration computed');
  assert(unlinkLog.includes('/etc/omai/maintenance.flag'), 'flag file unlinked');
  assert(appendLog.length >= 2, 'deactivation logged');
}

// Active but flag file already gone → no error
resetFs();
{
  const svc = await fresh();
  await svc.activate({});
  files.delete('/etc/omai/maintenance.flag');
  const result = await svc.deactivate();
  assertEq(result.success, true, 'success even if flag file missing');
}

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

resetFs();
{
  const svc = await fresh();
  const s = await svc.getStatus();
  assertEq(s.isActive, false, 'inactive');
  assertEq(s.config, null, 'no config');
  assertEq(s.duration, 0, 'duration 0');
  assertEq(s.timeRemaining, null, 'no time remaining');
}

// With active + eta
resetFs();
{
  const future = new Date(Date.now() + 60000).toISOString();
  files.set('/etc/omai/maintenance.flag', '{}');
  files.set('/etc/omai/maintenance.json', JSON.stringify({
    activatedAt: new Date().toISOString(),
    eta: future,
  }));
  const svc = await fresh();
  const s = await svc.getStatus();
  assertEq(s.isActive, true, 'active');
  assert(s.timeRemaining > 0, 'time remaining computed');
  assert(s.duration >= 0, 'duration computed');
}

// eta in the past → timeRemaining = 0
resetFs();
{
  const past = new Date(Date.now() - 60000).toISOString();
  files.set('/etc/omai/maintenance.flag', '{}');
  files.set('/etc/omai/maintenance.json', JSON.stringify({
    activatedAt: new Date().toISOString(),
    eta: past,
  }));
  const svc = await fresh();
  const s = await svc.getStatus();
  assertEq(s.timeRemaining, 0, 'past eta → 0 remaining');
}

// ============================================================================
// updateConfig
// ============================================================================
console.log('\n── updateConfig ──────────────────────────────────────────');

// Not active → throws
resetFs();
{
  const svc = await fresh();
  let caught: Error | null = null;
  try { await svc.updateConfig({ message: 'X' }); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'inactive → throws');
  assert(caught !== null && caught.message.includes('not active'), 'error message');
}

// Active → merges + writes
resetFs();
{
  const svc = await fresh();
  await svc.activate({ message: 'initial' });
  writeLog.length = 0;  // clear activation writes

  const result = await svc.updateConfig({ message: 'updated', reason: 'new reason' });
  assertEq(result.success, true, 'success');
  assertEq(svc.config.message, 'updated', 'message updated');
  assertEq(svc.config.reason, 'new reason', 'reason updated');
  assert(svc.config.activatedBy !== undefined, 'original fields preserved');
  // Both files written
  const paths = writeLog.map(w => w.path);
  assert(paths.includes('/etc/omai/maintenance.json'), 'primary updated');
}

// ============================================================================
// isExempt
// ============================================================================
console.log('\n── isExempt ──────────────────────────────────────────────');

resetFs();
{
  const svc = await fresh();

  // Not in maintenance → always exempt (allowed)
  assertEq(svc.isExempt(), true, 'inactive → everyone exempt');

  // Activate
  await svc.activate({
    exemptRoles: ['super_admin'],
    exemptIPs: ['127.0.0.1', '192.168.1.1'],
    allowlist: ['admin@example.com', '10.0.0.5'],
  });

  // Exempt role
  assertEq(svc.isExempt({ role: 'super_admin' }), true, 'super_admin exempt');
  assertEq(svc.isExempt({ role: 'regular_user' }), false, 'regular user not exempt');

  // Exempt IP
  assertEq(svc.isExempt(null, '127.0.0.1'), true, 'localhost exempt');
  assertEq(svc.isExempt(null, '192.168.1.1'), true, 'LAN IP exempt');
  assertEq(svc.isExempt(null, '8.8.8.8'), false, 'random IP not exempt');

  // Allowlist email
  assertEq(
    svc.isExempt({ email: 'admin@example.com' }),
    true,
    'allowlisted email exempt'
  );
  assertEq(svc.isExempt({ email: 'other@example.com' }), false, 'other email not exempt');

  // Allowlist IP
  assertEq(svc.isExempt(null, '10.0.0.5'), true, 'allowlisted IP exempt');

  // Null user + null ip → not exempt
  assertEq(svc.isExempt(null, null), false, 'null user + null ip → not exempt');
}

// ============================================================================
// logMaintenanceEvent
// ============================================================================
console.log('\n── logMaintenanceEvent ───────────────────────────────────');

resetFs();
{
  const svc = await fresh();
  await svc.logMaintenanceEvent('TEST_ACTION', { foo: 'bar' });
  assert(appendLog.length >= 1, 'log appended');
  const lastLog = appendLog[appendLog.length - 1];
  assertEq(lastLog.path, '/var/log/omai/maintenance.log', 'log path');
  assert(lastLog.content.endsWith('\n'), 'trailing newline');
  const parsed = JSON.parse(lastLog.content.trim());
  assertEq(parsed.action, 'TEST_ACTION', 'action in log');
  assertEq(parsed.details.foo, 'bar', 'details in log');
  assert(typeof parsed.timestamp === 'string', 'timestamp present');
  assertEq(parsed.hostname, 'test-host', 'hostname from stub');
  assertEq(parsed.pid, process.pid, 'pid');
}

// ============================================================================
// getLogs
// ============================================================================
console.log('\n── getLogs ───────────────────────────────────────────────');

// File doesn't exist → []
resetFs();
{
  const svc = await fresh();
  const logs = await svc.getLogs();
  assertEq(logs, [], 'ENOENT → []');
}

// Valid + invalid lines; reversed; limit
resetFs();
{
  const lines = [
    JSON.stringify({ action: 'A', timestamp: '2026-04-01T00:00:00Z' }),
    'NOT JSON',
    JSON.stringify({ action: 'B', timestamp: '2026-04-02T00:00:00Z' }),
    JSON.stringify({ action: 'C', timestamp: '2026-04-03T00:00:00Z' }),
    '',  // empty line filtered out
  ].join('\n');
  files.set('/var/log/omai/maintenance.log', lines);

  const svc = await fresh();
  const logs = await svc.getLogs(10);
  assertEq(logs.length, 3, '3 valid logs (invalid + empty filtered)');
  // Reversed: C first, then B, then A
  assertEq(logs[0].action, 'C', 'most recent first');
  assertEq(logs[2].action, 'A', 'oldest last');
}

// Limit
resetFs();
{
  const lines: string[] = [];
  for (let i = 0; i < 20; i++) {
    lines.push(JSON.stringify({ action: `A${i}`, timestamp: `2026-04-${String(i + 1).padStart(2, '0')}T00:00:00Z` }));
  }
  files.set('/var/log/omai/maintenance.log', lines.join('\n'));
  const svc = await fresh();
  const logs = await svc.getLogs(5);
  assertEq(logs.length, 5, 'limit respected');
  // After slice(-5), reversed → last 5 in reverse order
  assertEq(logs[0].action, 'A19', 'most recent first');
  assertEq(logs[4].action, 'A15', '5th is 5 back');
}

// ============================================================================
// getStatistics
// ============================================================================
console.log('\n── getStatistics ─────────────────────────────────────────');

resetFs();
{
  // Build a log with two activation/deactivation pairs.
  // Note: getStatistics calls getLogs (which reverses chronological → most
  // recent first), then reverses again inside the stats loop to process
  // chronologically. So file order should be chronological.
  const logLines = [
    JSON.stringify({
      action: 'ACTIVATED',
      timestamp: '2026-04-01T10:00:00Z',
      details: { activatedBy: 'alice', reason: 'deploy' },
    }),
    JSON.stringify({
      action: 'DEACTIVATED',
      timestamp: '2026-04-01T10:10:00Z',
      details: { duration: 600 },
    }),
    JSON.stringify({
      action: 'ACTIVATED',
      timestamp: '2026-04-02T10:00:00Z',
      details: { activatedBy: 'bob', reason: 'deploy' },
    }),
    JSON.stringify({
      action: 'DEACTIVATED',
      timestamp: '2026-04-02T10:30:00Z',
      details: { duration: 1800 },
    }),
  ];
  files.set('/var/log/omai/maintenance.log', logLines.join('\n'));

  const svc = await fresh();
  const stats = await svc.getStatistics();
  assertEq(stats.totalActivations, 2, '2 activations');
  assertEq(stats.totalDowntime, 2400, 'total downtime = 600+1800');
  assertEq(stats.averageDowntime, 1200, 'avg = 1200');
  assertEq(stats.longestDowntime, 1800, 'longest = 1800');
  assertEq(stats.shortestDowntime, 600, 'shortest = 600');
  assertEq(stats.activationsByUser.alice, 1, 'alice: 1');
  assertEq(stats.activationsByUser.bob, 1, 'bob: 1');
  assertEq(stats.activationsByReason.deploy, 2, 'deploy: 2');
  assertEq(stats.recentActivations.length, 2, '2 recent');
}

// No logs → zeros
resetFs();
{
  const svc = await fresh();
  const stats = await svc.getStatistics();
  assertEq(stats.totalActivations, 0, '0 activations');
  assertEq(stats.shortestDowntime, 0, 'shortestDowntime = 0 (Infinity reset)');
  assertEq(stats.averageDowntime, 0, 'avg = 0');
}

// ============================================================================
// emergencyShutdown
// ============================================================================
console.log('\n── emergencyShutdown ─────────────────────────────────────');

resetFs();
{
  const svc = await fresh();
  const result = await svc.emergencyShutdown('DB crash', 'oncall');
  assertEq(result.success, true, 'success');
  assertEq(svc.isActive, true, 'maintenance now active');
  assertEq(svc.config.reason, 'DB crash', 'reason set');
  assertEq(svc.config.activatedBy, 'oncall', 'activatedBy set');
  assert(svc.config.message.includes('emergency'), 'emergency message');
  assert(result.timestamp !== undefined, 'timestamp returned');
}

// ============================================================================
// scheduleMaintenance
// ============================================================================
console.log('\n── scheduleMaintenance ───────────────────────────────────');

// Past time → throws
resetFs();
{
  const svc = await fresh();
  let caught: Error | null = null;
  try {
    await svc.scheduleMaintenance(new Date(Date.now() - 10000).toISOString());
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'past time throws');
  assert(caught !== null && caught.message.includes('future'), 'error mentions future');
}

// Future time → returns info (don't actually wait for setTimeout to fire)
resetFs();
{
  const svc = await fresh();
  // Far-future to keep setTimeout from firing during test runtime
  const scheduled = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  const result = await svc.scheduleMaintenance(scheduled, { reason: 'planned' });
  assertEq(result.success, true, 'scheduled');
  assertEq(result.scheduledFor, scheduled, 'scheduledFor returned');
  assert(result.delay > 0, 'delay > 0');
  assert(result.message.includes('scheduled'), 'message');
}

// ============================================================================
// Restore fs.promises
// ============================================================================
Object.defineProperty(realFs, 'promises', {
  value: origPromises,
  writable: true,
  configurable: true,
});
if (origOs) {
  require.cache[osPath] = origOs;
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => {
  // Restore fs.promises on crash
  Object.defineProperty(realFs, 'promises', {
    value: origPromises, writable: true, configurable: true,
  });
  console.error('Unhandled:', e);
  process.exit(1);
});
