#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/omaiMaintenanceInterface.js (OMD-960)
 *
 * Thin wrapper around `../services/maintenanceService`. We stub the
 * MaintenanceService class and the logger via require.cache BEFORE
 * requiring the SUT. The wrapper itself exports a *singleton instance*,
 * so the test covers the singleton behavior.
 *
 * Coverage:
 *   - activate             default message; custom message; ETA conversion;
 *                          error propagation
 *   - deactivate           delegates; error propagation
 *   - status               transforms service response; handles missing config
 *   - update               only allows whitelisted fields; eta ISO conversion;
 *                          throws when no valid fields; error propagation
 *   - emergency            delegates with activatedBy OMAI-EMERGENCY
 *   - schedule             requires scheduledTime; ETA ISO conversion;
 *                          default options
 *   - logs                 delegates; default limit 20
 *   - statistics           delegates
 *   - isExempt             delegates; returns false on error (safe default)
 *   - getAvailableMethods  returns full map of 9 methods
 *
 * Run from server/: npx tsx src/utils/__tests__/omaiMaintenanceInterface.test.ts
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

// ── MaintenanceService stub ──────────────────────────────────────────
type Call = { method: string; args: any[] };
const calls: Call[] = [];
let initThrows = false;
let activateReturn: any = { ok: 'activate' };
let deactivateReturn: any = { ok: 'deactivate', duration: 1000 };
let getStatusReturn: any = {
  isActive: true,
  duration: 5000,
  timeRemaining: 1000,
  config: {
    activatedAt: '2026-04-10T10:00:00.000Z',
    activatedBy: 'OMAI',
    reason: 'test',
    message: 'msg',
    status: 'in progress',
    eta: '2026-04-10T11:00:00.000Z',
    exemptRoles: ['super_admin'],
    allowlist: ['1.2.3.4'],
  },
};
let updateConfigReturn: any = { ok: 'updated' };
let emergencyReturn: any = { ok: 'emergency' };
let scheduleReturn: any = { ok: 'scheduled' };
let logsReturn: any[] = [{ event: 'a' }, { event: 'b' }];
let statisticsReturn: any = { total: 5 };
let isExemptReturn: any = true;
let activateThrows = false;
let deactivateThrows = false;
let getStatusThrows = false;
let updateConfigThrows = false;
let isExemptThrows = false;

function resetSvc() {
  calls.length = 0;
  initThrows = false;
  activateThrows = false;
  deactivateThrows = false;
  getStatusThrows = false;
  updateConfigThrows = false;
  isExemptThrows = false;
}

class FakeMaintenanceService {
  async initialize() {
    calls.push({ method: 'initialize', args: [] });
    if (initThrows) throw new Error('init failed');
  }
  async activate(options: any) {
    calls.push({ method: 'activate', args: [options] });
    if (activateThrows) throw new Error('activate failed');
    return activateReturn;
  }
  async deactivate(by: any, reason: any) {
    calls.push({ method: 'deactivate', args: [by, reason] });
    if (deactivateThrows) throw new Error('deactivate failed');
    return deactivateReturn;
  }
  async getStatus() {
    calls.push({ method: 'getStatus', args: [] });
    if (getStatusThrows) throw new Error('status failed');
    return getStatusReturn;
  }
  async updateConfig(updates: any) {
    calls.push({ method: 'updateConfig', args: [updates] });
    if (updateConfigThrows) throw new Error('update failed');
    return updateConfigReturn;
  }
  async emergencyShutdown(reason: any, by: any) {
    calls.push({ method: 'emergencyShutdown', args: [reason, by] });
    return emergencyReturn;
  }
  async scheduleMaintenance(time: any, options: any) {
    calls.push({ method: 'scheduleMaintenance', args: [time, options] });
    return scheduleReturn;
  }
  async getLogs(limit: any) {
    calls.push({ method: 'getLogs', args: [limit] });
    return logsReturn;
  }
  async getStatistics() {
    calls.push({ method: 'getStatistics', args: [] });
    return statisticsReturn;
  }
  isExempt(user: any, ip: any) {
    calls.push({ method: 'isExempt', args: [user, ip] });
    if (isExemptThrows) throw new Error('exempt check failed');
    return isExemptReturn;
  }
}

const svcPath = require.resolve('../../services/maintenanceService');
require.cache[svcPath] = {
  id: svcPath,
  filename: svcPath,
  loaded: true,
  exports: FakeMaintenanceService,
} as any;

// ── logger stub ──────────────────────────────────────────────────────
const loggerPath = require.resolve('../logger');
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

// SUT exports a singleton which triggers constructor → initialize() on load
const omaiMaint = require('../omaiMaintenanceInterface');

async function main() {

// Wait for constructor initialize() to settle
await new Promise((r) => setImmediate(r));

// ============================================================================
// activate
// ============================================================================
console.log('\n── activate ──────────────────────────────────────────────');

// Default message, no ETA, default reason
resetSvc();
{
  const r = await omaiMaint.activate();
  assertEq(r.success, true, 'success=true');
  assert(r.message.includes('activated via OMAI'), 'return message');
  // Find the activate call
  const activateCall = calls.find((c) => c.method === 'activate');
  assert(activateCall !== undefined, 'activate called');
  const opts = activateCall!.args[0];
  assert(opts.message.includes('temporarily unavailable'), 'default message');
  assertEq(opts.status, 'System maintenance in progress via OMAI', 'status');
  assertEq(opts.eta, null, 'eta null when no estimatedTime');
  assertEq(opts.reason, 'OMAI activation', 'default reason');
  assertEq(opts.activatedBy, 'OMAI', 'activatedBy');
  assertEq(opts.exemptRoles, ['super_admin', 'dev_admin'], 'exemptRoles');
  assertEq(opts.exemptIPs, ['127.0.0.1', '::1'], 'exemptIPs');
}

// Custom message + estimatedTime converted to ISO
resetSvc();
{
  const r = await omaiMaint.activate('Custom msg', '2026-05-01T12:00:00Z', 'upgrade');
  assertEq(r.success, true, 'success');
  const activateCall = calls.find((c) => c.method === 'activate')!;
  assertEq(activateCall.args[0].message, 'Custom msg', 'custom message');
  assertEq(activateCall.args[0].eta, '2026-05-01T12:00:00.000Z', 'eta converted to ISO');
  assertEq(activateCall.args[0].reason, 'upgrade', 'custom reason');
}

// Error propagation (activate throws)
resetSvc();
activateThrows = true;
{
  let caught: Error | null = null;
  try {
    await omaiMaint.activate('x');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on service error');
  assert(caught!.message.includes('OMAI maintenance activation failed'), 'wrapped error message');
}

// ============================================================================
// deactivate
// ============================================================================
console.log('\n── deactivate ────────────────────────────────────────────');

resetSvc();
{
  const r = await omaiMaint.deactivate('cleanup');
  assertEq(r.success, true, 'success');
  assertEq(r.duration, 1000, 'duration from service');
  const c = calls.find((x) => x.method === 'deactivate')!;
  assertEq(c.args[0], 'OMAI', 'activatedBy=OMAI');
  assertEq(c.args[1], 'cleanup', 'reason passed');
}

// Default reason
resetSvc();
{
  await omaiMaint.deactivate();
  const c = calls.find((x) => x.method === 'deactivate')!;
  assertEq(c.args[1], 'OMAI deactivation', 'default reason');
}

// Error
resetSvc();
deactivateThrows = true;
{
  let caught: Error | null = null;
  try { await omaiMaint.deactivate(); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught!.message.includes('deactivation failed'), 'wrapped');
}

// ============================================================================
// status
// ============================================================================
console.log('\n── status ────────────────────────────────────────────────');

resetSvc();
{
  const r = await omaiMaint.status();
  assertEq(r.success, true, 'success');
  assertEq(r.data.isActive, true, 'isActive');
  assertEq(r.data.activatedBy, 'OMAI', 'activatedBy from config');
  assertEq(r.data.reason, 'test', 'reason');
  assertEq(r.data.duration, 5000, 'duration');
  assertEq(r.data.exemptRoles, ['super_admin'], 'exemptRoles');
  assertEq(r.data.allowlist, ['1.2.3.4'], 'allowlist');
}

// Missing config fields → nulls/empty arrays
resetSvc();
const savedStatus = getStatusReturn;
getStatusReturn = { isActive: false, duration: 0, timeRemaining: 0, config: null };
{
  const r = await omaiMaint.status();
  assertEq(r.data.activatedBy, null, 'null activatedBy');
  assertEq(r.data.reason, null, 'null reason');
  assertEq(r.data.exemptRoles, [], 'empty exemptRoles');
  assertEq(r.data.allowlist, [], 'empty allowlist');
}
getStatusReturn = savedStatus;

// Error
resetSvc();
getStatusThrows = true;
{
  let caught: Error | null = null;
  try { await omaiMaint.status(); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
}

// ============================================================================
// update
// ============================================================================
console.log('\n── update ────────────────────────────────────────────────');

// Only whitelisted fields pass through
resetSvc();
{
  const r = await omaiMaint.update({
    message: 'new msg',
    status: 'new status',
    eta: '2026-05-01T00:00:00Z',
    allowlist: ['9.9.9.9'],
    // These should be ignored:
    activatedBy: 'attacker',
    secret: 'x',
  });
  assertEq(r.success, true, 'success');
  assertEq(
    r.updatedFields.sort(),
    ['allowlist', 'eta', 'message', 'status'],
    'only whitelisted fields'
  );
  const c = calls.find((x) => x.method === 'updateConfig')!;
  assert(!('activatedBy' in c.args[0]), 'activatedBy stripped');
  assert(!('secret' in c.args[0]), 'secret stripped');
  assertEq(c.args[0].eta, '2026-05-01T00:00:00.000Z', 'eta ISO-converted');
}

// Throws when no valid fields
resetSvc();
{
  let caught: Error | null = null;
  try {
    await omaiMaint.update({ junk: 'x' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws with no valid fields');
  assert(caught!.message.includes('update failed'), 'wrapped error');
}

// ============================================================================
// emergency
// ============================================================================
console.log('\n── emergency ─────────────────────────────────────────────');

resetSvc();
{
  const r = await omaiMaint.emergency('hack');
  assertEq(r.success, true, 'success');
  assertEq(r.reason, 'hack', 'reason');
  const c = calls.find((x) => x.method === 'emergencyShutdown')!;
  assertEq(c.args[0], 'hack', 'reason passed');
  assertEq(c.args[1], 'OMAI-EMERGENCY', 'activatedBy');
}

// Default reason
resetSvc();
{
  await omaiMaint.emergency();
  const c = calls.find((x) => x.method === 'emergencyShutdown')!;
  assertEq(c.args[0], 'OMAI emergency shutdown', 'default reason');
}

// ============================================================================
// schedule
// ============================================================================
console.log('\n── schedule ──────────────────────────────────────────────');

// Requires scheduledTime
resetSvc();
{
  let caught: Error | null = null;
  try { await omaiMaint.schedule(null); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws without scheduledTime');
  assert(caught!.message.includes('scheduling failed'), 'wrapped');
}

// With options
resetSvc();
{
  const r = await omaiMaint.schedule('2026-05-01T02:00:00Z', {
    message: 'upgrade',
    eta: '2026-05-01T04:00:00Z',
    reason: 'db',
    allowlist: ['1.1.1.1'],
  });
  assertEq(r.success, true, 'success');
  assertEq(r.scheduledFor, '2026-05-01T02:00:00.000Z', 'ISO scheduledFor');
  const c = calls.find((x) => x.method === 'scheduleMaintenance')!;
  assertEq(c.args[0], '2026-05-01T02:00:00Z', 'scheduledTime raw');
  assertEq(c.args[1].message, 'upgrade', 'message');
  assertEq(c.args[1].eta, '2026-05-01T04:00:00.000Z', 'eta ISO');
  assertEq(c.args[1].activatedBy, 'OMAI-SCHEDULER', 'activatedBy');
  assertEq(c.args[1].allowlist, ['1.1.1.1'], 'allowlist');
}

// Default options
resetSvc();
{
  await omaiMaint.schedule('2026-05-01T02:00:00Z');
  const c = calls.find((x) => x.method === 'scheduleMaintenance')!;
  assertEq(c.args[1].message, 'Scheduled maintenance is now in progress', 'default message');
  assertEq(c.args[1].reason, 'OMAI scheduled maintenance', 'default reason');
  assertEq(c.args[1].eta, null, 'eta null');
  assertEq(c.args[1].allowlist, [], 'empty allowlist');
}

// ============================================================================
// logs
// ============================================================================
console.log('\n── logs ──────────────────────────────────────────────────');

resetSvc();
{
  const r = await omaiMaint.logs(50);
  assertEq(r.success, true, 'success');
  assertEq(r.count, 2, 'count from logs length');
  assertEq(r.limit, 50, 'limit');
  const c = calls.find((x) => x.method === 'getLogs')!;
  assertEq(c.args[0], 50, 'limit passed');
}

// Default limit
resetSvc();
{
  await omaiMaint.logs();
  const c = calls.find((x) => x.method === 'getLogs')!;
  assertEq(c.args[0], 20, 'default limit 20');
}

// ============================================================================
// statistics
// ============================================================================
console.log('\n── statistics ────────────────────────────────────────────');

resetSvc();
{
  const r = await omaiMaint.statistics();
  assertEq(r.success, true, 'success');
  assertEq(r.statistics, { total: 5 }, 'stats from service');
}

// ============================================================================
// isExempt
// ============================================================================
console.log('\n── isExempt ──────────────────────────────────────────────');

resetSvc();
{
  const r = omaiMaint.isExempt({ id: 1 }, '127.0.0.1');
  assertEq(r, true, 'delegates return');
  const c = calls.find((x) => x.method === 'isExempt')!;
  assertEq(c.args[0], { id: 1 }, 'user passed');
  assertEq(c.args[1], '127.0.0.1', 'ip passed');
}

// Returns false on error (safe default)
resetSvc();
isExemptThrows = true;
{
  const r = omaiMaint.isExempt({ id: 1 }, '127.0.0.1');
  assertEq(r, false, 'false on error (safe default)');
}

// ============================================================================
// getAvailableMethods
// ============================================================================
console.log('\n── getAvailableMethods ───────────────────────────────────');

{
  const methods = omaiMaint.getAvailableMethods();
  const names = Object.keys(methods).sort();
  assertEq(names.length, 9, '9 methods exposed');
  assert(names.includes('activate'), 'has activate');
  assert(names.includes('deactivate'), 'has deactivate');
  assert(names.includes('status'), 'has status');
  assert(names.includes('update'), 'has update');
  assert(names.includes('emergency'), 'has emergency');
  assert(names.includes('schedule'), 'has schedule');
  assert(names.includes('logs'), 'has logs');
  assert(names.includes('statistics'), 'has statistics');
  assert(names.includes('isExempt'), 'has isExempt');
  assertEq(
    typeof methods.activate.description,
    'string',
    'each has description'
  );
  assert(Array.isArray(methods.activate.parameters), 'each has parameters');
  assertEq(typeof methods.activate.example, 'string', 'each has example');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
