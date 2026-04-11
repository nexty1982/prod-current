#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentsService.js (OMD-1017)
 *
 * Singleton ES class exported via `module.exports = new ComponentsService()`.
 * Uses fs.promises for manifest I/O. Stubs fs.promises.readFile/writeFile
 * in-place (can't reassign fs.promises getter wholesale).
 *
 * Coverage:
 *   - loadManifest: parses JSON; error throws descriptive Error
 *   - saveManifest: writes JSON; error throws
 *   - validateDependencies: no component → valid true, no deps → valid
 *     true, missing dep, disabled dep, unhealthy dep, all valid
 *   - performHealthCheck: found → returns health + checks; not found →
 *     error shape with health='unknown'
 *   - generateHealthChecks: ports, configPath, dependencies, healthIssues
 *   - getSystemMetrics: aggregation totals + byCategory grouping
 *   - enableComponent: not found → throws; happy path writes updated
 *     manifest
 *   - disableComponent: not found → throws; happy path writes; warns on
 *     dependents
 *
 * Run: npx tsx server/src/services/__tests__/componentsService.test.ts
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

// ─── Stub fs.promises in-place ───────────────────────────────────────
let manifestData: any[] = [];
let readThrows = false;
let writeThrows = false;
const writeLog: { path: string; data: string }[] = [];

const realFs = require('fs');
realFs.promises.readFile = async (_p: string, _enc: string) => {
  if (readThrows) throw new Error('ENOENT: no such file');
  return JSON.stringify(manifestData);
};
realFs.promises.writeFile = async (p: string, data: string) => {
  writeLog.push({ path: p, data });
  if (writeThrows) throw new Error('EACCES');
};

function resetState() {
  manifestData = [];
  readThrows = false;
  writeThrows = false;
  writeLog.length = 0;
}

// Silence console
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

const svc = require('../componentsService');

async function main() {

// ============================================================================
// loadManifest
// ============================================================================
console.log('\n── loadManifest ──────────────────────────────────────────');

resetState();
manifestData = [
  { id: 'api', name: 'API', enabled: true, health: 'healthy' },
];
{
  const r = await svc.loadManifest();
  assertEq(r.length, 1, '1 component loaded');
  assertEq(r[0].id, 'api', 'id');
}

resetState();
readThrows = true;
{
  quiet();
  let caught: Error | null = null;
  try { await svc.loadManifest(); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'read error throws');
  assert(
    caught !== null && caught.message.includes('Failed to load component manifest'),
    'error message wrapped'
  );
}

// ============================================================================
// saveManifest
// ============================================================================
console.log('\n── saveManifest ──────────────────────────────────────────');

resetState();
{
  await svc.saveManifest([{ id: 'x' }]);
  assertEq(writeLog.length, 1, 'writeFile called');
  assert(writeLog[0].path.endsWith('componentManifest.json'), 'writes manifest');
  const saved = JSON.parse(writeLog[0].data);
  assertEq(saved, [{ id: 'x' }], 'data round-trips');
}

resetState();
writeThrows = true;
{
  quiet();
  let caught: Error | null = null;
  try { await svc.saveManifest([]); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'write error throws');
  assert(
    caught !== null && caught.message.includes('Failed to save component manifest'),
    'error message wrapped'
  );
}

// ============================================================================
// validateDependencies
// ============================================================================
console.log('\n── validateDependencies ──────────────────────────────────');

// No component found → valid true, empty issues
resetState();
manifestData = [];
{
  const r = await svc.validateDependencies('missing');
  assertEq(r.valid, true, 'no component → valid');
  assertEq(r.issues, [], 'no issues');
}

// Component with no dependencies → valid true
resetState();
manifestData = [{ id: 'api', name: 'API', enabled: true, health: 'healthy' }];
{
  const r = await svc.validateDependencies('api');
  assertEq(r.valid, true, 'no deps → valid');
  assertEq(r.issues, [], 'no issues');
}

// Missing dependency
resetState();
manifestData = [
  { id: 'api', name: 'API', enabled: true, health: 'healthy', dependencies: ['db'] },
];
{
  const r = await svc.validateDependencies('api');
  assertEq(r.valid, false, 'missing dep → invalid');
  assert(r.issues[0].includes('Missing dependency: db'), 'missing dep issue');
}

// Disabled dependency
resetState();
manifestData = [
  { id: 'api', name: 'API', enabled: true, health: 'healthy', dependencies: ['db'] },
  { id: 'db', name: 'Database', enabled: false, health: 'healthy' },
];
{
  const r = await svc.validateDependencies('api');
  assertEq(r.valid, false, 'disabled dep → invalid');
  assert(r.issues[0].includes('Dependency disabled: Database'), 'disabled dep issue');
}

// Unhealthy dependency
resetState();
manifestData = [
  { id: 'api', name: 'API', enabled: true, health: 'healthy', dependencies: ['db'] },
  { id: 'db', name: 'Database', enabled: true, health: 'failed' },
];
{
  const r = await svc.validateDependencies('api');
  assertEq(r.valid, false, 'unhealthy dep → invalid');
  assert(r.issues[0].includes('Dependency unhealthy: Database'), 'unhealthy dep issue');
}

// All valid
resetState();
manifestData = [
  { id: 'api', name: 'API', enabled: true, health: 'healthy', dependencies: ['db', 'cache'] },
  { id: 'db', name: 'Database', enabled: true, health: 'healthy' },
  { id: 'cache', name: 'Cache', enabled: true, health: 'healthy' },
];
{
  const r = await svc.validateDependencies('api');
  assertEq(r.valid, true, 'all deps valid');
  assertEq(r.issues, [], 'no issues');
  assertEq(r.dependencies, ['db', 'cache'], 'dependencies echoed');
}

// ============================================================================
// performHealthCheck
// ============================================================================
console.log('\n── performHealthCheck ────────────────────────────────────');

// Component found
resetState();
manifestData = [
  {
    id: 'api', name: 'API', enabled: true, health: 'healthy',
    ports: [3001], configPath: '/etc/api.conf',
  },
];
{
  const r = await svc.performHealthCheck('api');
  assertEq(r.componentId, 'api', 'componentId');
  assertEq(r.health, 'healthy', 'health');
  assertEq(typeof r.lastCheck, 'string', 'lastCheck is ISO string');
  assert(Array.isArray(r.checks), 'checks is array');
  assertEq(r.checks.length, 2, '2 checks (port + config)');
}

// Component not found → error shape
resetState();
manifestData = [];
{
  quiet();
  const r = await svc.performHealthCheck('missing');
  loud();
  assertEq(r.componentId, 'missing', 'componentId echoed');
  assertEq(r.health, 'unknown', 'health unknown');
  assert(r.error.includes('not found'), 'error message');
  assertEq(typeof r.lastCheck, 'string', 'lastCheck present');
}

// Health check when loadManifest throws
resetState();
readThrows = true;
{
  quiet();
  const r = await svc.performHealthCheck('any');
  loud();
  assertEq(r.health, 'unknown', 'load error → unknown health');
  assert(typeof r.error === 'string', 'error captured');
}

// ============================================================================
// generateHealthChecks
// ============================================================================
console.log('\n── generateHealthChecks ──────────────────────────────────');

// Ports → pass when healthy, fail when component failed
resetState();
manifestData = [
  { id: 'api', name: 'API', enabled: true, health: 'healthy',
    ports: [3001, 3002] },
];
{
  const checks = await svc.generateHealthChecks(manifestData[0]);
  assertEq(checks.length, 2, '2 port checks');
  assertEq(checks[0].status, 'pass', 'port 3001 pass');
  assertEq(checks[1].status, 'pass', 'port 3002 pass');
  assert(checks[0].name.includes('3001'), 'port 3001 in name');
}

resetState();
manifestData = [
  { id: 'api', name: 'API', enabled: true, health: 'failed', ports: [3001] },
];
{
  const checks = await svc.generateHealthChecks(manifestData[0]);
  assertEq(checks[0].status, 'fail', 'failed health → port fail');
  assert(checks[0].details.includes('unreachable'), 'unreachable detail');
}

// ConfigPath check
resetState();
manifestData = [
  { id: 'x', name: 'X', enabled: true, health: 'healthy',
    configPath: '/etc/x.conf' },
];
{
  const checks = await svc.generateHealthChecks(manifestData[0]);
  assertEq(checks.length, 1, '1 config check');
  assertEq(checks[0].name, 'Configuration File', 'config name');
  assertEq(checks[0].status, 'pass', 'config pass');
  assert(checks[0].details.includes('/etc/x.conf'), 'path in details');
}

// Dependencies check — valid
resetState();
manifestData = [
  { id: 'api', name: 'API', enabled: true, health: 'healthy', dependencies: ['db'] },
  { id: 'db', name: 'DB', enabled: true, health: 'healthy' },
];
{
  const checks = await svc.generateHealthChecks(manifestData[0]);
  const depCheck = checks.find((c: any) => c.name === 'Dependencies');
  assert(depCheck !== undefined, 'dependencies check present');
  assertEq(depCheck.status, 'pass', 'deps pass');
}

// Dependencies check — invalid → warn
resetState();
manifestData = [
  { id: 'api', name: 'API', enabled: true, health: 'healthy', dependencies: ['db'] },
];
{
  const checks = await svc.generateHealthChecks(manifestData[0]);
  const depCheck = checks.find((c: any) => c.name === 'Dependencies');
  assertEq(depCheck.status, 'warn', 'invalid deps → warn');
  assert(depCheck.details.includes('Missing dependency'), 'missing dep detail');
}

// Health issues
resetState();
manifestData = [
  { id: 'x', name: 'X', enabled: true, health: 'degraded',
    healthIssues: ['slow response', 'high cpu'] },
];
{
  const checks = await svc.generateHealthChecks(manifestData[0]);
  const issuesCheck = checks.find((c: any) => c.name === 'Health Issues');
  assert(issuesCheck !== undefined, 'health issues check present');
  assertEq(issuesCheck.status, 'warn', 'warn status');
  assert(issuesCheck.details.includes('slow response'), 'first issue');
  assert(issuesCheck.details.includes('high cpu'), 'second issue');
}

// ============================================================================
// getSystemMetrics
// ============================================================================
console.log('\n── getSystemMetrics ──────────────────────────────────────');

resetState();
manifestData = [
  { id: 'a1', name: 'A1', enabled: true, health: 'healthy', category: 'api' },
  { id: 'a2', name: 'A2', enabled: true, health: 'degraded', category: 'api' },
  { id: 'a3', name: 'A3', enabled: false, health: 'failed', category: 'api' },
  { id: 'd1', name: 'D1', enabled: true, health: 'healthy', category: 'db' },
  { id: 'u1', name: 'U1', enabled: true, health: 'healthy' }, // no category
];
{
  const m = await svc.getSystemMetrics();
  assertEq(m.total, 5, 'total=5');
  assertEq(m.enabled, 4, 'enabled=4');
  assertEq(m.disabled, 1, 'disabled=1');
  assertEq(m.healthy, 3, 'healthy=3');
  assertEq(m.degraded, 1, 'degraded=1');
  assertEq(m.failed, 1, 'failed=1');
  assertEq(typeof m.lastUpdated, 'string', 'lastUpdated ISO');
  assertEq(m.byCategory.api.total, 3, 'api total');
  assertEq(m.byCategory.api.enabled, 2, 'api enabled');
  assertEq(m.byCategory.api.healthy, 1, 'api healthy');
  assertEq(m.byCategory.api.degraded, 1, 'api degraded');
  assertEq(m.byCategory.api.failed, 1, 'api failed');
  assertEq(m.byCategory.db.total, 1, 'db total');
  assertEq(m.byCategory.db.healthy, 1, 'db healthy');
  assertEq(m.byCategory.uncategorized.total, 1, 'uncategorized total');
}

// Empty manifest
resetState();
manifestData = [];
{
  const m = await svc.getSystemMetrics();
  assertEq(m.total, 0, 'empty total');
  assertEq(m.enabled, 0, 'empty enabled');
  assertEq(m.byCategory, {}, 'empty byCategory');
}

// ============================================================================
// enableComponent
// ============================================================================
console.log('\n── enableComponent ───────────────────────────────────────');

// Not found
resetState();
manifestData = [];
{
  quiet();
  let caught: Error | null = null;
  try { await svc.enableComponent('missing'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null && caught.message.includes('not found'),
    'not found throws');
}

// Happy path
resetState();
manifestData = [
  { id: 'api', name: 'API', enabled: false, health: 'unknown' },
];
{
  quiet();
  const r = await svc.enableComponent('api', 'user-1');
  loud();
  assertEq(r.enabled, true, 'enabled=true');
  assertEq(typeof r.lastUpdated, 'string', 'lastUpdated set');
  assertEq(typeof r.lastHealthCheck, 'string', 'lastHealthCheck set');
  assert(writeLog.length >= 1, 'manifest saved');
}

// Enable with dependency issues (just warns, still enables)
resetState();
manifestData = [
  { id: 'api', name: 'API', enabled: false, health: 'unknown', dependencies: ['missing'] },
];
{
  quiet();
  const r = await svc.enableComponent('api');
  loud();
  assertEq(r.enabled, true, 'still enabled despite dep issues');
}

// ============================================================================
// disableComponent
// ============================================================================
console.log('\n── disableComponent ──────────────────────────────────────');

// Not found
resetState();
manifestData = [];
{
  quiet();
  let caught: Error | null = null;
  try { await svc.disableComponent('missing'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null && caught.message.includes('not found'),
    'not found throws');
}

// Happy path with no dependents
resetState();
manifestData = [
  { id: 'api', name: 'API', enabled: true, health: 'healthy' },
];
{
  quiet();
  const r = await svc.disableComponent('api', 'user-2');
  loud();
  assertEq(r.enabled, false, 'enabled=false');
  assert(writeLog.length >= 1, 'manifest saved');
}

// Disable with dependents → still proceeds, just warns
resetState();
manifestData = [
  { id: 'db', name: 'DB', enabled: true, health: 'healthy' },
  { id: 'api', name: 'API', enabled: true, health: 'healthy', dependencies: ['db'] },
];
{
  quiet();
  const r = await svc.disableComponent('db');
  loud();
  assertEq(r.enabled, false, 'still disables despite dependents');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
