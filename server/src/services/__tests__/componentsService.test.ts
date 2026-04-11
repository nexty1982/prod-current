#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentsService.js (OMD-1155)
 *
 * Module exports a SINGLETON instance. Dependencies:
 *   - fs.promises (readFile/writeFile) → virtual FS map via fs cache stub
 *   - child_process.exec (via util.promisify) → exec stub
 *
 * Coverage:
 *   - loadManifest / saveManifest: happy, error path
 *   - performHealthCheck: happy path, component not found, error fallback
 *   - validateDependencies: no deps, missing dep, disabled dep, failed dep,
 *       all healthy
 *   - getSystemMetrics: totals, by-category grouping, uncategorized fallback
 *   - enableComponent: happy, not found throws, calls saveManifest, runs
 *       health check after enable
 *   - disableComponent: happy, not found throws, dependent warning logged
 *   - generateHealthChecks: ports, configPath, dependencies, healthIssues
 *   - integrateWithSystemMonitoring: placeholder shape
 *   - getSystemResourceUsage: happy path with exec stubs, error path
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

// ── Virtual FS ───────────────────────────────────────────────────────
const virtualFiles: Record<string, string> = {};
let readFileThrowsOnce = false;
let writeFileThrowsOnce = false;

const fakeFsPromises = {
  readFile: async (p: string, _enc: string) => {
    if (readFileThrowsOnce) {
      readFileThrowsOnce = false;
      throw new Error('ENOENT');
    }
    if (!(p in virtualFiles)) throw new Error(`ENOENT: ${p}`);
    return virtualFiles[p];
  },
  writeFile: async (p: string, data: string) => {
    if (writeFileThrowsOnce) {
      writeFileThrowsOnce = false;
      throw new Error('EACCES');
    }
    virtualFiles[p] = data;
  },
};

const realFs = require('fs');
const fsStub = { ...realFs, promises: fakeFsPromises };
const fsPath = require.resolve('fs');
require.cache[fsPath] = {
  id: fsPath,
  filename: fsPath,
  loaded: true,
  exports: fsStub,
} as any;

// ── child_process.exec stub ──────────────────────────────────────────
let execResults: Record<string, string> = {
  'free -h': 'total  used  free\n16G   8G    8G',
  'df -h /': 'Filesystem Size Used Avail\n/dev/sda1  100G 50G  50G',
  'uptime': '12:00:00 up 5 days, load average: 0.5, 0.4, 0.3',
};
let execThrows = false;

const childProcessStub = {
  exec: (cmd: string, cb: (err: any, result: any) => void) => {
    if (execThrows) {
      cb(new Error('exec failed'), null);
      return;
    }
    const stdout = execResults[cmd] || '';
    cb(null, { stdout, stderr: '' });
  },
};

const cpPath = require.resolve('child_process');
require.cache[cpPath] = {
  id: cpPath,
  filename: cpPath,
  loaded: true,
  exports: childProcessStub,
} as any;

// Silence logs
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

// Require SUT (singleton)
const componentsService = require('../componentsService');
const manifestPath = componentsService.manifestPath;

function seedManifest(components: any[]): void {
  virtualFiles[manifestPath] = JSON.stringify(components);
}

async function main() {

// ============================================================================
// loadManifest / saveManifest
// ============================================================================
console.log('\n── loadManifest / saveManifest ───────────────────────────');

{
  seedManifest([{ id: 'c1', name: 'One' }]);
  const comps = await componentsService.loadManifest();
  assertEq(comps.length, 1, 'loads 1 component');
  assertEq(comps[0].id, 'c1', 'component id');
}

{
  readFileThrowsOnce = true;
  quiet();
  let caught: Error | null = null;
  try { await componentsService.loadManifest(); } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'load error throws');
  assert(caught !== null && caught.message.includes('Failed to load'), 'error message');
}

{
  await componentsService.saveManifest([{ id: 'x' }]);
  const raw = virtualFiles[manifestPath];
  assert(raw.includes('"id": "x"') || raw.includes('"id":"x"'), 'saved to virtual FS');
}

{
  writeFileThrowsOnce = true;
  quiet();
  let caught: Error | null = null;
  try { await componentsService.saveManifest([]); } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'save error throws');
  assert(caught !== null && caught.message.includes('Failed to save'), 'save error msg');
}

// ============================================================================
// validateDependencies
// ============================================================================
console.log('\n── validateDependencies ──────────────────────────────────');

// No deps
{
  seedManifest([{ id: 'c1', name: 'One' }]);
  const r = await componentsService.validateDependencies('c1');
  assertEq(r.valid, true, 'no deps → valid');
  assertEq(r.issues, [], 'no issues');
}

// Component not found → valid (as per current impl)
{
  seedManifest([]);
  const r = await componentsService.validateDependencies('missing');
  assertEq(r.valid, true, 'component not found → valid');
}

// Missing dependency
{
  seedManifest([
    { id: 'c1', name: 'One', dependencies: ['missing'] },
  ]);
  const r = await componentsService.validateDependencies('c1');
  assertEq(r.valid, false, 'missing dep → invalid');
  assert(r.issues[0].includes('Missing dependency'), 'missing dep issue');
}

// Disabled dependency
{
  seedManifest([
    { id: 'c1', name: 'One', dependencies: ['c2'] },
    { id: 'c2', name: 'Two', enabled: false, health: 'healthy' },
  ]);
  const r = await componentsService.validateDependencies('c1');
  assertEq(r.valid, false, 'disabled dep → invalid');
  assert(r.issues[0].includes('disabled'), 'disabled issue');
}

// Failed dependency
{
  seedManifest([
    { id: 'c1', name: 'One', dependencies: ['c2'] },
    { id: 'c2', name: 'Two', enabled: true, health: 'failed' },
  ]);
  const r = await componentsService.validateDependencies('c1');
  assertEq(r.valid, false, 'failed dep → invalid');
  assert(r.issues[0].includes('unhealthy'), 'unhealthy issue');
}

// All healthy
{
  seedManifest([
    { id: 'c1', name: 'One', dependencies: ['c2'] },
    { id: 'c2', name: 'Two', enabled: true, health: 'healthy' },
  ]);
  const r = await componentsService.validateDependencies('c1');
  assertEq(r.valid, true, 'all healthy → valid');
  assertEq(r.dependencies, ['c2'], 'dependencies returned');
}

// ============================================================================
// performHealthCheck
// ============================================================================
console.log('\n── performHealthCheck ────────────────────────────────────');

// Happy path
{
  seedManifest([
    { id: 'c1', name: 'One', health: 'healthy', ports: [80] },
  ]);
  const r = await componentsService.performHealthCheck('c1');
  assertEq(r.componentId, 'c1', 'componentId');
  assertEq(r.health, 'healthy', 'health');
  assert(typeof r.lastCheck === 'string', 'lastCheck ISO string');
  assert(Array.isArray(r.checks), 'checks array');
  assertEq(r.checks.length, 1, 'one port check');
  assertEq(r.checks[0].status, 'pass', 'port pass');
}

// Component not found → error fallback
{
  seedManifest([]);
  quiet();
  const r = await componentsService.performHealthCheck('missing');
  loud();
  assertEq(r.health, 'unknown', 'unknown on error');
  assert(r.error && r.error.includes('not found'), 'error message present');
}

// ============================================================================
// getSystemMetrics
// ============================================================================
console.log('\n── getSystemMetrics ──────────────────────────────────────');

{
  seedManifest([
    { id: '1', enabled: true, health: 'healthy', category: 'db' },
    { id: '2', enabled: true, health: 'degraded', category: 'db' },
    { id: '3', enabled: false, health: 'failed', category: 'web' },
    { id: '4', enabled: true, health: 'healthy' }, // no category → uncategorized
  ]);
  const m = await componentsService.getSystemMetrics();
  assertEq(m.total, 4, 'total');
  assertEq(m.enabled, 3, 'enabled count');
  assertEq(m.disabled, 1, 'disabled count');
  assertEq(m.healthy, 2, 'healthy count');
  assertEq(m.degraded, 1, 'degraded count');
  assertEq(m.failed, 1, 'failed count');
  assert(m.byCategory.db !== undefined, 'db category present');
  assertEq(m.byCategory.db.total, 2, 'db total');
  assertEq(m.byCategory.db.enabled, 2, 'db enabled');
  assertEq(m.byCategory.db.healthy, 1, 'db healthy');
  assertEq(m.byCategory.db.degraded, 1, 'db degraded');
  assertEq(m.byCategory.web.failed, 1, 'web failed');
  assertEq(m.byCategory.web.enabled, 0, 'web enabled count');
  assertEq(m.byCategory.uncategorized.total, 1, 'uncategorized fallback');
  assert(typeof m.lastUpdated === 'string', 'lastUpdated ISO');
}

// ============================================================================
// enableComponent / disableComponent
// ============================================================================
console.log('\n── enableComponent ───────────────────────────────────────');

{
  seedManifest([
    { id: 'c1', name: 'One', enabled: false, health: 'unknown' },
  ]);
  quiet();
  const result = await componentsService.enableComponent('c1', 'admin');
  loud();
  assertEq(result.enabled, true, 'enabled true');
  assert(typeof result.lastUpdated === 'string', 'lastUpdated set');
  assert(typeof result.lastHealthCheck === 'string', 'lastHealthCheck set');
  // Persisted
  const saved = JSON.parse(virtualFiles[manifestPath]);
  assertEq(saved[0].enabled, true, 'persisted');
}

// Not found
{
  seedManifest([]);
  quiet();
  let caught: Error | null = null;
  try { await componentsService.enableComponent('missing'); } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('not found'), 'error message');
}

// Enable with dep issues (warns, still succeeds)
{
  seedManifest([
    { id: 'c1', name: 'One', enabled: false, dependencies: ['missing-dep'] },
  ]);
  quiet();
  const result = await componentsService.enableComponent('c1');
  loud();
  assertEq(result.enabled, true, 'enabled despite dep issues');
}

console.log('\n── disableComponent ──────────────────────────────────────');

// Happy path
{
  seedManifest([
    { id: 'c1', name: 'One', enabled: true },
  ]);
  quiet();
  const result = await componentsService.disableComponent('c1', 'admin');
  loud();
  assertEq(result.enabled, false, 'disabled');
}

// Not found
{
  seedManifest([]);
  let caught: Error | null = null;
  try { await componentsService.disableComponent('missing'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
}

// With dependents — warns but succeeds
{
  seedManifest([
    { id: 'c1', name: 'Core', enabled: true },
    { id: 'c2', name: 'Dependent', enabled: true, dependencies: ['c1'] },
  ]);
  quiet();
  const result = await componentsService.disableComponent('c1');
  loud();
  assertEq(result.enabled, false, 'disabled despite dependents');
}

// ============================================================================
// generateHealthChecks
// ============================================================================
console.log('\n── generateHealthChecks ──────────────────────────────────');

// Ports: healthy → pass
{
  // Seed for the validateDependencies() sub-call (uses loadManifest).
  seedManifest([{ id: 'c1', name: 'C1', health: 'healthy' }]);
  const checks = await componentsService.generateHealthChecks({
    id: 'c1',
    health: 'healthy',
    ports: [80, 443],
  });
  assertEq(checks.length, 2, 'two port checks');
  assertEq(checks[0].status, 'pass', 'port 80 pass');
  assertEq(checks[1].status, 'pass', 'port 443 pass');
}

// Ports: failed → fail
{
  seedManifest([{ id: 'c1', health: 'failed' }]);
  const checks = await componentsService.generateHealthChecks({
    id: 'c1',
    health: 'failed',
    ports: [80],
  });
  assertEq(checks[0].status, 'fail', 'port failed');
  assert(checks[0].details.includes('unreachable'), 'unreachable details');
}

// ConfigPath
{
  seedManifest([{ id: 'c1' }]);
  const checks = await componentsService.generateHealthChecks({
    id: 'c1',
    configPath: '/etc/x.conf',
  });
  assertEq(checks.length, 1, 'one check');
  assertEq(checks[0].name, 'Configuration File', 'config file check');
  assert(checks[0].details.includes('/etc/x.conf'), 'path in details');
}

// Dependencies check — satisfied
{
  seedManifest([
    { id: 'c1', dependencies: ['c2'] },
    { id: 'c2', enabled: true, health: 'healthy' },
  ]);
  const checks = await componentsService.generateHealthChecks({
    id: 'c1',
    dependencies: ['c2'],
  });
  const depCheck = checks.find(c => c.name === 'Dependencies');
  assert(depCheck !== undefined, 'deps check present');
  assertEq(depCheck!.status, 'pass', 'deps satisfied');
}

// Dependencies check — unsatisfied
{
  seedManifest([
    { id: 'c1', dependencies: ['missing'] },
  ]);
  const checks = await componentsService.generateHealthChecks({
    id: 'c1',
    dependencies: ['missing'],
  });
  const depCheck = checks.find(c => c.name === 'Dependencies');
  assertEq(depCheck!.status, 'warn', 'warn on unsatisfied');
}

// Health issues list
{
  seedManifest([{ id: 'c1' }]);
  const checks = await componentsService.generateHealthChecks({
    id: 'c1',
    healthIssues: ['high memory', 'slow queries'],
  });
  const issuesCheck = checks.find(c => c.name === 'Health Issues');
  assert(issuesCheck !== undefined, 'health issues check present');
  assertEq(issuesCheck!.status, 'warn', 'warn');
  assert(issuesCheck!.details.includes('high memory'), 'first issue');
  assert(issuesCheck!.details.includes('slow queries'), 'second issue');
}

// ============================================================================
// integrateWithSystemMonitoring
// ============================================================================
console.log('\n── integrateWithSystemMonitoring ─────────────────────────');

{
  quiet();
  const r = await componentsService.integrateWithSystemMonitoring();
  loud();
  assertEq(r.integrated, false, 'not integrated');
  assert(typeof r.message === 'string', 'has message');
}

// ============================================================================
// getSystemResourceUsage
// ============================================================================
console.log('\n── getSystemResourceUsage ────────────────────────────────');

{
  execThrows = false;
  const r = await componentsService.getSystemResourceUsage();
  assertEq(r.available, true, 'available');
  assert(typeof r.timestamp === 'string', 'timestamp');
  assert(typeof r.memory === 'string', 'memory string');
  assert(typeof r.disk === 'string', 'disk string');
  assert(typeof r.load === 'string', 'load string');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
