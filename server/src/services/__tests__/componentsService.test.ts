#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentsService.js (OMD-1230)
 *
 * Manifest-backed component manager (reads/writes a JSON file in
 * server/src/data). No DB access. Depends on:
 *   - fs.promises.readFile / writeFile for the manifest
 *   - child_process.exec (wrapped via util.promisify) for system metrics
 *
 * Strategy: stub fs.promises with an in-memory manifest keyed by path
 * so the service writes/reads our fake file; we don't touch real disk.
 * child_process.exec is stubbed via a fake with util.promisify.custom
 * so getSystemResourceUsage can be tested without shell execution.
 *
 * Coverage:
 *   - loadManifest: happy path, read error → throws
 *   - saveManifest: happy path, write error → throws
 *   - performHealthCheck: found / not found / generates checks
 *   - validateDependencies:
 *       · no dependencies → valid
 *       · missing dep → issue
 *       · disabled dep → issue
 *       · failed dep → issue
 *       · all-good → valid
 *   - getSystemMetrics:
 *       · totals + enabled/disabled counts
 *       · health counts
 *       · byCategory grouping (with uncategorized)
 *   - enableComponent:
 *       · not found → throws
 *       · happy path sets enabled + lastUpdated + triggers health check
 *   - disableComponent:
 *       · not found → throws
 *       · happy path logs dependents (doesn't block)
 *   - generateHealthChecks: ports, configPath, dependencies, healthIssues
 *   - integrateWithSystemMonitoring: placeholder
 *   - getSystemResourceUsage: available=true with stubbed exec
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

// ── fs stub (promises.readFile / writeFile) ──────────────────────────
const realFs = require('fs');
const fakeFiles: Record<string, string> = {};
let readThrows: Error | null = null;
let writeThrows: Error | null = null;

const fakePromisesFs = {
  readFile: async (p: string, _enc?: any): Promise<string> => {
    if (readThrows) throw readThrows;
    if (p in fakeFiles) return fakeFiles[p];
    throw new Error(`ENOENT: no such fake file ${p}`);
  },
  writeFile: async (p: string, content: string): Promise<void> => {
    if (writeThrows) throw writeThrows;
    fakeFiles[p] = content;
  },
};

const fsStub = {
  ...realFs,
  promises: fakePromisesFs,
};
const fsPath = require.resolve('fs');
require.cache[fsPath] = { id: fsPath, filename: fsPath, loaded: true, exports: fsStub } as any;

// ── child_process stub (exec with promisify.custom) ──────────────────
const util = require('util');
const customSymbol = util.promisify.custom;

const fakeExec: any = (cmd: string, cb: any) => cb(null, `out:${cmd}`, '');
fakeExec[customSymbol] = async (cmd: string) => ({ stdout: `out:${cmd}`, stderr: '' });

const cpStub = { exec: fakeExec };
const cpPath = require.resolve('child_process');
require.cache[cpPath] = { id: cpPath, filename: cpPath, loaded: true, exports: cpStub } as any;

// Silence
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;
function quiet() { console.log = () => {}; console.error = () => {}; console.warn = () => {}; }
function loud() { console.log = origLog; console.error = origError; console.warn = origWarn; }

// ── Require SUT after all stubs are installed ────────────────────────
const path = require('path');
const componentsService = require('../componentsService');

// manifestPath captured by the singleton
const manifestPath = componentsService.manifestPath;

function setManifest(components: any[]): void {
  fakeFiles[manifestPath] = JSON.stringify(components, null, 2);
}

function getManifest(): any[] {
  return JSON.parse(fakeFiles[manifestPath] || '[]');
}

function resetState() {
  for (const k of Object.keys(fakeFiles)) delete fakeFiles[k];
  readThrows = null;
  writeThrows = null;
}

async function main() {

// ============================================================================
// loadManifest
// ============================================================================
console.log('\n── loadManifest ──────────────────────────────────────────');

resetState();
setManifest([{ id: 'c1', name: 'C1', enabled: true, health: 'healthy' }]);
{
  const c = await componentsService.loadManifest();
  assertEq(c.length, 1, 'loaded array');
  assertEq(c[0].id, 'c1', 'parsed JSON');
}

// Read error
resetState();
readThrows = new Error('disk error');
quiet();
{
  let err: Error | null = null;
  try { await componentsService.loadManifest(); } catch (e: any) { err = e; }
  loud();
  assert(err !== null, 'throws on read error');
  assert(err !== null && /Failed to load/.test(err.message), 'wraps error');
}
readThrows = null;

// ============================================================================
// saveManifest
// ============================================================================
console.log('\n── saveManifest ──────────────────────────────────────────');

resetState();
{
  await componentsService.saveManifest([{ id: 'x' }]);
  assertEq(getManifest(), [{ id: 'x' }], 'manifest written');
}

// Write error
resetState();
writeThrows = new Error('disk full');
quiet();
{
  let err: Error | null = null;
  try { await componentsService.saveManifest([]); } catch (e: any) { err = e; }
  loud();
  assert(err !== null && /Failed to save/.test(err.message), 'throws wrapped');
}
writeThrows = null;

// ============================================================================
// performHealthCheck
// ============================================================================
console.log('\n── performHealthCheck ────────────────────────────────────');

resetState();
setManifest([
  { id: 'api', name: 'API', enabled: true, health: 'healthy', ports: [3001], configPath: '/etc/api.conf' },
]);
{
  const r = await componentsService.performHealthCheck('api');
  assertEq(r.componentId, 'api', 'componentId');
  assertEq(r.health, 'healthy', 'health');
  assert(typeof r.lastCheck === 'string', 'lastCheck iso');
  assert(Array.isArray(r.checks), 'checks array');
  assert(r.checks.length >= 2, 'has port + config checks');
}

// Not found
resetState();
setManifest([{ id: 'other', enabled: true, health: 'healthy' }]);
quiet();
{
  const r = await componentsService.performHealthCheck('missing');
  loud();
  assertEq(r.health, 'unknown', 'unknown health on not found');
  assert(r.error !== undefined && /not found/.test(r.error), 'error message');
}

// ============================================================================
// validateDependencies
// ============================================================================
console.log('\n── validateDependencies ──────────────────────────────────');

// No deps
resetState();
setManifest([{ id: 'a', enabled: true, health: 'healthy' }]);
{
  const r = await componentsService.validateDependencies('a');
  assertEq(r.valid, true, 'valid');
  assertEq(r.issues, [], 'no issues');
}

// Missing dep
resetState();
setManifest([
  { id: 'a', enabled: true, health: 'healthy', dependencies: ['b'] },
]);
{
  const r = await componentsService.validateDependencies('a');
  assertEq(r.valid, false, 'invalid');
  assertEq(r.issues.length, 1, '1 issue');
  assert(/Missing dependency: b/.test(r.issues[0]), 'missing message');
}

// Disabled dep
resetState();
setManifest([
  { id: 'a', enabled: true, health: 'healthy', dependencies: ['b'] },
  { id: 'b', name: 'Dep B', enabled: false, health: 'healthy' },
]);
{
  const r = await componentsService.validateDependencies('a');
  assertEq(r.valid, false, 'invalid');
  assert(/Dependency disabled: Dep B/.test(r.issues[0]), 'disabled message');
}

// Failed dep
resetState();
setManifest([
  { id: 'a', enabled: true, health: 'healthy', dependencies: ['b'] },
  { id: 'b', name: 'Dep B', enabled: true, health: 'failed' },
]);
{
  const r = await componentsService.validateDependencies('a');
  assertEq(r.valid, false, 'invalid');
  assert(/Dependency unhealthy: Dep B/.test(r.issues[0]), 'unhealthy message');
}

// All good
resetState();
setManifest([
  { id: 'a', enabled: true, health: 'healthy', dependencies: ['b', 'c'] },
  { id: 'b', name: 'B', enabled: true, health: 'healthy' },
  { id: 'c', name: 'C', enabled: true, health: 'degraded' },  // degraded is OK per SUT logic
]);
{
  const r = await componentsService.validateDependencies('a');
  assertEq(r.valid, true, 'degraded deps OK');
  assertEq(r.dependencies, ['b', 'c'], 'dependencies echoed');
}

// ============================================================================
// getSystemMetrics
// ============================================================================
console.log('\n── getSystemMetrics ──────────────────────────────────────');

resetState();
setManifest([
  { id: 'a1', enabled: true,  health: 'healthy',  category: 'core' },
  { id: 'a2', enabled: true,  health: 'degraded', category: 'core' },
  { id: 'a3', enabled: false, health: 'failed',   category: 'aux' },
  { id: 'a4', enabled: true,  health: 'healthy' }, // no category
]);
{
  const m = await componentsService.getSystemMetrics();
  assertEq(m.total, 4, 'total 4');
  assertEq(m.enabled, 3, 'enabled 3');
  assertEq(m.disabled, 1, 'disabled 1');
  assertEq(m.healthy, 2, 'healthy 2');
  assertEq(m.degraded, 1, 'degraded 1');
  assertEq(m.failed, 1, 'failed 1');
  assertEq(m.byCategory.core.total, 2, 'core total');
  assertEq(m.byCategory.core.enabled, 2, 'core enabled');
  assertEq(m.byCategory.core.healthy, 1, 'core healthy');
  assertEq(m.byCategory.core.degraded, 1, 'core degraded');
  assertEq(m.byCategory.aux.total, 1, 'aux total');
  assertEq(m.byCategory.aux.failed, 1, 'aux failed');
  assert(m.byCategory.uncategorized !== undefined, 'uncategorized bucket');
  assertEq(m.byCategory.uncategorized.total, 1, 'uncategorized total');
}

// ============================================================================
// enableComponent / disableComponent
// ============================================================================
console.log('\n── enableComponent ───────────────────────────────────────');

// Not found
resetState();
setManifest([{ id: 'other', enabled: false, health: 'healthy' }]);
{
  let err: Error | null = null;
  try { await componentsService.enableComponent('ghost'); } catch (e: any) { err = e; }
  assert(err !== null && /not found/.test(err.message), 'throws not found');
}

// Happy path
resetState();
setManifest([{ id: 'api', name: 'API', enabled: false, health: 'unknown' }]);
quiet();
{
  const c = await componentsService.enableComponent('api', 'alice');
  loud();
  assertEq(c.id, 'api', 'id');
  assertEq(c.enabled, true, 'enabled true');
  assert(typeof c.lastUpdated === 'string', 'lastUpdated set');
  assert(typeof c.lastHealthCheck === 'string', 'lastHealthCheck set');
  // Persisted
  const saved = getManifest();
  assertEq(saved[0].enabled, true, 'saved enabled');
}

// Dependency issues warning (doesn't block)
resetState();
setManifest([
  { id: 'api', name: 'API', enabled: false, health: 'unknown', dependencies: ['db'] },
  // no db
]);
quiet();
{
  const c = await componentsService.enableComponent('api');
  loud();
  assertEq(c.enabled, true, 'enabled despite issues');
}

console.log('\n── disableComponent ──────────────────────────────────────');

// Not found
resetState();
setManifest([{ id: 'x', enabled: true }]);
{
  let err: Error | null = null;
  try { await componentsService.disableComponent('ghost'); } catch (e: any) { err = e; }
  assert(err !== null && /not found/.test(err.message), 'throws not found');
}

// Happy path with dependents → warns but proceeds
resetState();
setManifest([
  { id: 'db', name: 'DB', enabled: true, health: 'healthy' },
  { id: 'api', name: 'API', enabled: true, health: 'healthy', dependencies: ['db'] },
]);
quiet();
{
  const c = await componentsService.disableComponent('db', 'bob');
  loud();
  assertEq(c.enabled, false, 'disabled');
  const saved = getManifest();
  assertEq(saved.find((s: any) => s.id === 'db').enabled, false, 'persisted');
}

// ============================================================================
// generateHealthChecks (direct)
// ============================================================================
console.log('\n── generateHealthChecks ──────────────────────────────────');

resetState();
setManifest([
  { id: 'full', name: 'Full', enabled: true, health: 'healthy',
    ports: [80, 443], configPath: '/etc/app.conf',
    dependencies: ['missing-dep'],
    healthIssues: ['slow startup', 'memory leak'] },
]);
{
  const comp = (await componentsService.loadManifest())[0];
  const checks = await componentsService.generateHealthChecks(comp);
  // Should have: 2 ports + 1 config + 1 deps + 1 health issues = 5
  assertEq(checks.length, 5, '5 checks');
  const names = checks.map((c: any) => c.name);
  assert(names.filter((n: string) => /Port/.test(n)).length === 2, '2 port checks');
  assert(names.includes('Configuration File'), 'config check');
  assert(names.includes('Dependencies'), 'deps check');
  assert(names.includes('Health Issues'), 'health issues');
  const depCheck = checks.find((c: any) => c.name === 'Dependencies');
  assertEq(depCheck.status, 'warn', 'deps warn when missing');
  const issuesCheck = checks.find((c: any) => c.name === 'Health Issues');
  assertEq(issuesCheck.status, 'warn', 'issues warn');
  assert(/slow startup/.test(issuesCheck.details), 'includes first issue');
}

// Failed component: port checks fail
resetState();
setManifest([{ id: 'bad', health: 'failed', ports: [9000] }]);
{
  const comp = (await componentsService.loadManifest())[0];
  const checks = await componentsService.generateHealthChecks(comp);
  const portCheck = checks.find((c: any) => /Port 9000/.test(c.name));
  assertEq(portCheck.status, 'fail', 'failed → port fail');
  assertEq(portCheck.details, 'Port unreachable', 'fail details');
}

// No ports / config / deps / issues
resetState();
setManifest([{ id: 'bare', health: 'healthy' }]);
{
  const comp = (await componentsService.loadManifest())[0];
  const checks = await componentsService.generateHealthChecks(comp);
  assertEq(checks.length, 0, 'no checks for bare component');
}

// ============================================================================
// integrateWithSystemMonitoring (placeholder)
// ============================================================================
console.log('\n── integrateWithSystemMonitoring ─────────────────────────');

quiet();
{
  const r = await componentsService.integrateWithSystemMonitoring();
  loud();
  assertEq(r.integrated, false, 'not integrated');
  assert(/Manual component management/.test(r.message), 'placeholder message');
}

// ============================================================================
// getSystemResourceUsage
// ============================================================================
console.log('\n── getSystemResourceUsage ────────────────────────────────');

{
  const r = await componentsService.getSystemResourceUsage();
  assertEq(r.available, true, 'available true');
  assert(typeof r.timestamp === 'string', 'timestamp iso');
  assertEq(r.memory, 'out:free -h', 'memory from stubbed exec');
  assertEq(r.disk, 'out:df -h /', 'disk from stubbed exec');
  assertEq(r.load, 'out:uptime', 'load from stubbed exec');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

}

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  process.exit(1);
});
