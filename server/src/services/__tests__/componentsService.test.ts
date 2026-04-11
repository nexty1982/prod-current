#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentsService.js (OMD-994)
 *
 * The SUT exports a singleton `new ComponentsService()`. We stub
 * `fs.promises.readFile` / `writeFile` before requiring the SUT
 * and control the in-memory manifest from the test.
 *
 * Coverage:
 *   - loadManifest: success + error path (throws)
 *   - saveManifest: success + error path (throws)
 *   - performHealthCheck: happy path + not-found → 'unknown'
 *   - validateDependencies: no dependencies, missing, disabled, unhealthy
 *   - getSystemMetrics: counts, byCategory grouping, uncategorized default
 *   - enableComponent: updates flag, performs health check, calls save
 *   - disableComponent: updates flag, calls save, logs dependents
 *   - generateHealthChecks: ports, config, deps, health issues
 *
 * Run: npx tsx server/src/services/__tests__/componentsService.test.ts
 */

// ── Stub fs.promises ───────────────────────────────────────────────────
let manifestContent: string = '[]';
let writeCalls: string[] = [];
let readFileShouldThrow = false;
let writeFileShouldThrow = false;

const fsPath = require.resolve('fs');
const realFs = require('fs');
const fsStub = {
  ...realFs,
  promises: {
    ...realFs.promises,
    readFile: async (_path: string, _enc: string) => {
      if (readFileShouldThrow) throw new Error('ENOENT');
      return manifestContent;
    },
    writeFile: async (_path: string, data: string) => {
      if (writeFileShouldThrow) throw new Error('EACCES');
      writeCalls.push(data);
    },
  },
};
require.cache[fsPath] = {
  id: fsPath,
  filename: fsPath,
  loaded: true,
  exports: fsStub,
} as any;

const svc = require('../componentsService');

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

// Silence SUT logs
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;
function quiet() {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
}
function loud() {
  console.log = origLog;
  console.error = origError;
  console.warn = origWarn;
}

function setManifest(components: any[]): void {
  manifestContent = JSON.stringify(components);
}

async function main() {

// ============================================================================
// loadManifest
// ============================================================================
console.log('\n── loadManifest ──────────────────────────────────────────');

setManifest([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]);
readFileShouldThrow = false;
{
  const components = await svc.loadManifest();
  assertEq(components.length, 2, '2 components loaded');
  assertEq(components[0].id, 'a', 'first id');
  assertEq(components[1].id, 'b', 'second id');
}

// Load error → throws
readFileShouldThrow = true;
quiet();
{
  let thrown = false;
  try {
    await svc.loadManifest();
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('Failed to load'), 'error mentions Failed to load');
  }
  assert(thrown, 'loadManifest throws on read error');
}
loud();
readFileShouldThrow = false;

// ============================================================================
// saveManifest
// ============================================================================
console.log('\n── saveManifest ──────────────────────────────────────────');

writeCalls = [];
writeFileShouldThrow = false;
{
  await svc.saveManifest([{ id: 'x' }]);
  assertEq(writeCalls.length, 1, '1 write call');
  assertEq(JSON.parse(writeCalls[0]), [{ id: 'x' }], 'wrote the manifest');
}

// Save error → throws
writeFileShouldThrow = true;
quiet();
{
  let thrown = false;
  try {
    await svc.saveManifest([]);
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('Failed to save'), 'error mentions Failed to save');
  }
  assert(thrown, 'saveManifest throws on write error');
}
loud();
writeFileShouldThrow = false;

// ============================================================================
// performHealthCheck: happy path
// ============================================================================
console.log('\n── performHealthCheck ────────────────────────────────────');

setManifest([
  { id: 'db', name: 'Database', health: 'healthy', enabled: true, ports: [3306], configPath: '/etc/db.conf' },
  { id: 'api', name: 'API', health: 'degraded', enabled: true, dependencies: ['db'] },
]);

{
  const result = await svc.performHealthCheck('db');
  assertEq(result.componentId, 'db', 'componentId');
  assertEq(result.health, 'healthy', 'health');
  assert(typeof result.lastCheck === 'string', 'lastCheck ISO');
  assert(Array.isArray(result.checks), 'checks array');
  // Should include port connectivity and config file checks
  assert(result.checks.some((c: any) => c.name.includes('Port 3306')), 'port 3306 check');
  assert(result.checks.some((c: any) => c.name === 'Configuration File'), 'config file check');
}

// Not found → returns 'unknown' with error (error swallowed)
quiet();
{
  const result = await svc.performHealthCheck('missing');
  assertEq(result.componentId, 'missing', 'componentId preserved');
  assertEq(result.health, 'unknown', 'health unknown');
  assert(result.error.includes('not found'), 'error mentions not found');
}
loud();

// ============================================================================
// validateDependencies
// ============================================================================
console.log('\n── validateDependencies ──────────────────────────────────');

// No dependencies → valid
setManifest([{ id: 'x', name: 'X', enabled: true, health: 'healthy' }]);
{
  const result = await svc.validateDependencies('x');
  assertEq(result.valid, true, 'no deps valid');
  assertEq(result.issues.length, 0, 'no issues');
}

// Missing dependency
setManifest([
  { id: 'x', name: 'X', enabled: true, dependencies: ['missing-dep'] },
]);
{
  const result = await svc.validateDependencies('x');
  assertEq(result.valid, false, 'missing dep → invalid');
  assert(result.issues.some((i: string) => i.includes('Missing dependency: missing-dep')), 'missing dep issue');
}

// Disabled dependency
setManifest([
  { id: 'x', name: 'X', enabled: true, dependencies: ['y'] },
  { id: 'y', name: 'Y', enabled: false, health: 'healthy' },
]);
{
  const result = await svc.validateDependencies('x');
  assertEq(result.valid, false, 'disabled dep → invalid');
  assert(result.issues.some((i: string) => i.includes('Dependency disabled: Y')), 'disabled dep issue');
}

// Unhealthy (failed) dependency
setManifest([
  { id: 'x', name: 'X', enabled: true, dependencies: ['y'] },
  { id: 'y', name: 'Y', enabled: true, health: 'failed' },
]);
{
  const result = await svc.validateDependencies('x');
  assertEq(result.valid, false, 'failed dep → invalid');
  assert(result.issues.some((i: string) => i.includes('Dependency unhealthy: Y')), 'unhealthy dep issue');
}

// Component not found → no deps → valid
setManifest([]);
{
  const result = await svc.validateDependencies('nonexistent');
  assertEq(result.valid, true, 'not found → valid (no deps)');
}

// ============================================================================
// getSystemMetrics
// ============================================================================
console.log('\n── getSystemMetrics ──────────────────────────────────────');

setManifest([
  { id: 'a1', category: 'database', enabled: true, health: 'healthy' },
  { id: 'a2', category: 'database', enabled: true, health: 'degraded' },
  { id: 'a3', category: 'database', enabled: false, health: 'failed' },
  { id: 'b1', category: 'api', enabled: true, health: 'healthy' },
  { id: 'b2', category: 'api', enabled: true, health: 'failed' },
  { id: 'c1', enabled: true, health: 'healthy' }, // no category → uncategorized
]);
{
  const metrics = await svc.getSystemMetrics();
  assertEq(metrics.total, 6, 'total 6');
  assertEq(metrics.enabled, 5, 'enabled 5');
  assertEq(metrics.disabled, 1, 'disabled 1');
  assertEq(metrics.healthy, 3, 'healthy 3');
  assertEq(metrics.degraded, 1, 'degraded 1');
  assertEq(metrics.failed, 2, 'failed 2');
  assert(typeof metrics.lastUpdated === 'string', 'lastUpdated ISO');

  // Category breakdown
  assertEq(metrics.byCategory.database.total, 3, 'db total 3');
  assertEq(metrics.byCategory.database.enabled, 2, 'db enabled 2');
  assertEq(metrics.byCategory.database.healthy, 1, 'db healthy 1');
  assertEq(metrics.byCategory.database.degraded, 1, 'db degraded 1');
  assertEq(metrics.byCategory.database.failed, 1, 'db failed 1');

  assertEq(metrics.byCategory.api.total, 2, 'api total 2');
  assertEq(metrics.byCategory.api.healthy, 1, 'api healthy 1');
  assertEq(metrics.byCategory.api.failed, 1, 'api failed 1');

  assertEq(metrics.byCategory.uncategorized.total, 1, 'uncategorized total 1');
  assertEq(metrics.byCategory.uncategorized.healthy, 1, 'uncategorized healthy 1');
}

// Empty manifest
setManifest([]);
{
  const metrics = await svc.getSystemMetrics();
  assertEq(metrics.total, 0, 'empty total');
  assertEq(metrics.enabled, 0, 'empty enabled');
  assertEq(metrics.byCategory, {}, 'empty byCategory');
}

// ============================================================================
// enableComponent
// ============================================================================
console.log('\n── enableComponent ───────────────────────────────────────');

setManifest([
  { id: 'x', name: 'X', enabled: false, health: 'healthy' },
]);
writeCalls = [];
quiet();
{
  const result = await svc.enableComponent('x', 'admin');
  loud();
  assertEq(result.id, 'x', 'component id');
  assertEq(result.enabled, true, 'enabled true');
  assertEq(result.health, 'healthy', 'health updated from health check');
  assert(typeof result.lastUpdated === 'string', 'lastUpdated set');
  assert(typeof result.lastHealthCheck === 'string', 'lastHealthCheck set');
  assertEq(writeCalls.length, 1, 'save called');
  const saved = JSON.parse(writeCalls[0]);
  assertEq(saved[0].enabled, true, 'saved manifest has enabled=true');
}

// Not found → throws
setManifest([]);
quiet();
{
  let thrown = false;
  try {
    await svc.enableComponent('missing');
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('not found'), 'error mentions not found');
  }
  assert(thrown, 'enableComponent throws if not found');
}
loud();

// ============================================================================
// disableComponent
// ============================================================================
console.log('\n── disableComponent ──────────────────────────────────────');

setManifest([
  { id: 'x', name: 'X', enabled: true, health: 'healthy' },
  { id: 'y', name: 'Y', enabled: true, dependencies: ['x'] },
]);
writeCalls = [];
quiet();
{
  const result = await svc.disableComponent('x', 'admin');
  loud();
  assertEq(result.id, 'x', 'id');
  assertEq(result.enabled, false, 'disabled');
  assert(typeof result.lastUpdated === 'string', 'lastUpdated set');
  assertEq(writeCalls.length, 1, 'save called');
}

// Not found
setManifest([]);
quiet();
{
  let thrown = false;
  try {
    await svc.disableComponent('missing');
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('not found'), 'error mentions not found');
  }
  assert(thrown, 'disableComponent throws if not found');
}
loud();

// ============================================================================
// generateHealthChecks
// ============================================================================
console.log('\n── generateHealthChecks ──────────────────────────────────');

setManifest([
  { id: 'full', enabled: true, health: 'healthy', ports: [80, 443], configPath: '/etc/x.conf', dependencies: [], healthIssues: ['disk usage 85%'] },
]);
{
  const checks = await svc.generateHealthChecks({
    id: 'full',
    health: 'healthy',
    ports: [80, 443],
    configPath: '/etc/x.conf',
    dependencies: [],
    healthIssues: ['disk usage 85%'],
  });
  // Note: dependencies array empty → check still runs if length > 0,
  // but here dependencies.length is 0 so no deps check.
  assert(checks.length >= 3, 'has port + config + healthIssues checks');
  assert(checks.some((c: any) => c.name === 'Port 80 Connectivity' && c.status === 'pass'), 'port 80 pass');
  assert(checks.some((c: any) => c.name === 'Port 443 Connectivity' && c.status === 'pass'), 'port 443 pass');
  assert(checks.some((c: any) => c.name === 'Configuration File'), 'config file check');
  assert(checks.some((c: any) => c.name === 'Health Issues' && c.status === 'warn'), 'health issues warn');
}

// Failed component → port checks fail
{
  const checks = await svc.generateHealthChecks({
    id: 'f', health: 'failed', ports: [8080],
  });
  assert(checks.some((c: any) => c.name === 'Port 8080 Connectivity' && c.status === 'fail'), 'failed port');
}

// Deps check with issues
setManifest([
  { id: 'x', enabled: true, dependencies: ['missing'] },
]);
{
  const checks = await svc.generateHealthChecks({
    id: 'x', dependencies: ['missing'],
  });
  assert(checks.some((c: any) => c.name === 'Dependencies' && c.status === 'warn'), 'deps warn');
}

// No ports/config/deps/issues → empty checks
{
  const checks = await svc.generateHealthChecks({ id: 'bare' });
  assertEq(checks, [], 'no checks for bare component');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
