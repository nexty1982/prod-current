#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentsService.js (OMD-1209)
 *
 * The module exports a SINGLETON instance of ComponentsService whose
 * manifest lives at a disk path resolved at construction time.
 * External deps:
 *   - fs.promises.readFile / writeFile  → patched in-place (after SUT
 *                                          require, gated by a flag)
 *   - child_process.exec via util.promisify → captured at load time;
 *                                          out of scope for these tests
 *                                          (getSystemResourceUsage not
 *                                          covered)
 *
 * Coverage:
 *   - loadManifest: happy path (JSON parse), readFile error → rethrows
 *     as "Failed to load component manifest"
 *   - saveManifest: happy path (writeFile called with pretty JSON),
 *     writeFile error → rethrows as "Failed to save component manifest"
 *   - performHealthCheck:
 *       · happy path — returns { componentId, health, lastCheck, checks }
 *       · component not found — returns error payload with health "unknown"
 *       · loadManifest error — caught, returns error payload
 *   - validateDependencies:
 *       · component with no dependencies → valid
 *       · all dependencies present + enabled + healthy → valid
 *       · missing dependency detected
 *       · disabled dependency detected
 *       · failed-health dependency detected
 *       · component not found → valid (SUT returns early)
 *   - getSystemMetrics:
 *       · total / enabled / disabled / health counts
 *       · byCategory aggregation including uncategorized fallback
 *   - enableComponent:
 *       · not found → throws
 *       · sets enabled=true, lastUpdated, runs health check, saves
 *       · ignores dependency issues (only warns)
 *   - disableComponent:
 *       · not found → throws
 *       · sets enabled=false, lastUpdated, saves
 *       · warns when there are dependents
 *   - generateHealthChecks:
 *       · ports list → one check per port, status based on health
 *       · configPath present → config check
 *       · dependencies → dep check (pass/warn)
 *       · healthIssues → warn check
 *       · no fields → empty array
 *   - integrateWithSystemMonitoring: placeholder shape
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

// ── Load the SUT FIRST (before patching fs — see OMD-1207 gotcha) ────
const componentsService = require('../componentsService');

// ── Patch fs.promises in-place, gated by a flag ─────────────────────
const fs = require('fs');
const origReadFile = fs.promises.readFile;
const origWriteFile = fs.promises.writeFile;

let fsStubActive = false;
type FsCall = { op: string; args: any[] };
const fsCalls: FsCall[] = [];

let readFileImpl: (p: any, enc: any) => Promise<any> = async () => '[]';
let writeFileImpl: (p: any, data: any) => Promise<any> = async () => {};

fs.promises.readFile = async (p: any, enc: any) => {
  if (!fsStubActive) return origReadFile.call(fs.promises, p, enc);
  fsCalls.push({ op: 'readFile', args: [p, enc] });
  return readFileImpl(p, enc);
};
fs.promises.writeFile = async (p: any, data: any) => {
  if (!fsStubActive) return origWriteFile.call(fs.promises, p, data);
  fsCalls.push({ op: 'writeFile', args: [p, data] });
  return writeFileImpl(p, data);
};

function enableFs() {
  fsStubActive = true;
  fsCalls.length = 0;
  readFileImpl = async () => '[]';
  writeFileImpl = async () => {};
}
function resetFs() {
  enableFs();
}

// ── Silence console ─────────────────────────────────────────────────
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

// ── Sample manifest builder ─────────────────────────────────────────
function sampleManifest() {
  return [
    {
      id: 'api',
      name: 'API Server',
      category: 'backend',
      enabled: true,
      health: 'healthy',
      ports: [3001],
      configPath: '/etc/api/config.json',
      dependencies: ['db'],
      healthIssues: [],
    },
    {
      id: 'db',
      name: 'Database',
      category: 'backend',
      enabled: true,
      health: 'healthy',
      ports: [3306],
    },
    {
      id: 'cache',
      name: 'Cache',
      category: 'backend',
      enabled: false,
      health: 'degraded',
    },
    {
      id: 'worker',
      // category missing — should bucket as 'uncategorized'
      enabled: true,
      health: 'failed',
      dependencies: ['db', 'cache'],
      healthIssues: ['memory leak', 'slow'],
    },
  ];
}

function loadSample() {
  readFileImpl = async () => JSON.stringify(sampleManifest());
}

async function main() {

enableFs();

// ============================================================================
// loadManifest
// ============================================================================
console.log('\n── loadManifest ──────────────────────────────────────────');

{
  resetFs();
  loadSample();
  const m = await componentsService.loadManifest();
  assertEq(m.length, 4, '4 components loaded');
  assertEq(m[0].id, 'api', 'first component id');
  assertEq(fsCalls.length, 1, '1 fs call');
  assertEq(fsCalls[0].op, 'readFile', 'readFile called');
  assertEq(fsCalls[0].args[1], 'utf8', 'utf8 encoding');
}

// loadManifest — read error → throws
{
  resetFs();
  readFileImpl = async () => { throw new Error('ENOENT'); };
  let caught: Error | null = null;
  quiet();
  try {
    await componentsService.loadManifest();
  } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws on read error');
  assert(
    caught !== null && caught.message === 'Failed to load component manifest',
    'error message rewritten'
  );
}

// ============================================================================
// saveManifest
// ============================================================================
console.log('\n── saveManifest ──────────────────────────────────────────');

{
  resetFs();
  const data = [{ id: 'x' }];
  await componentsService.saveManifest(data);
  assertEq(fsCalls.length, 1, '1 fs call');
  assertEq(fsCalls[0].op, 'writeFile', 'writeFile called');
  assertEq(fsCalls[0].args[1], JSON.stringify(data, null, 2), 'pretty JSON');
}

// saveManifest — write error → throws
{
  resetFs();
  writeFileImpl = async () => { throw new Error('EACCES'); };
  let caught: Error | null = null;
  quiet();
  try {
    await componentsService.saveManifest([]);
  } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws on write error');
  assert(
    caught !== null && caught.message === 'Failed to save component manifest',
    'error message rewritten'
  );
}

// ============================================================================
// performHealthCheck
// ============================================================================
console.log('\n── performHealthCheck ────────────────────────────────────');

// Happy path
{
  resetFs();
  loadSample();
  const result = await componentsService.performHealthCheck('api');
  assertEq(result.componentId, 'api', 'componentId');
  assertEq(result.health, 'healthy', 'health');
  assert(typeof result.lastCheck === 'string', 'lastCheck ISO');
  assert(Array.isArray(result.checks), 'checks array');
}

// Not found → returns error payload
{
  resetFs();
  loadSample();
  quiet();
  const result = await componentsService.performHealthCheck('nonexistent');
  loud();
  assertEq(result.componentId, 'nonexistent', 'componentId preserved');
  assertEq(result.health, 'unknown', 'health unknown');
  assert(
    typeof result.error === 'string' && result.error.includes('not found'),
    'error mentions not found'
  );
}

// loadManifest error → returns error payload
{
  resetFs();
  readFileImpl = async () => { throw new Error('boom'); };
  quiet();
  const result = await componentsService.performHealthCheck('api');
  loud();
  assertEq(result.health, 'unknown', 'unknown on load error');
  assert(typeof result.error === 'string', 'error present');
}

// ============================================================================
// validateDependencies
// ============================================================================
console.log('\n── validateDependencies ──────────────────────────────────');

// Component with no dependencies
{
  resetFs();
  loadSample();
  const r = await componentsService.validateDependencies('db');
  assertEq(r.valid, true, 'db has no deps → valid');
  assertEq(r.issues, [], 'no issues');
}

// All deps satisfied
{
  resetFs();
  loadSample();
  const r = await componentsService.validateDependencies('api');
  assertEq(r.valid, true, 'api deps satisfied');
  assertEq(r.issues, [], 'no issues');
  assertEq(r.dependencies, ['db'], 'dependencies echoed');
}

// Missing + disabled + failed
{
  resetFs();
  readFileImpl = async () => JSON.stringify([
    { id: 'target', dependencies: ['missing-one', 'disabled-one', 'failed-one'] },
    { id: 'disabled-one', name: 'Disabled', enabled: false, health: 'healthy' },
    { id: 'failed-one', name: 'Failed', enabled: true, health: 'failed' },
  ]);
  const r = await componentsService.validateDependencies('target');
  assertEq(r.valid, false, 'not valid');
  assertEq(r.issues.length, 3, '3 issues');
  assert(r.issues.some((i: string) => i.includes('Missing dependency: missing-one')), 'missing listed');
  assert(r.issues.some((i: string) => i.includes('Disabled')), 'disabled listed');
  assert(r.issues.some((i: string) => i.includes('Failed')), 'failed listed');
}

// Component not found → valid (early return)
{
  resetFs();
  loadSample();
  const r = await componentsService.validateDependencies('nonexistent');
  assertEq(r.valid, true, 'non-existent component → valid');
  assertEq(r.issues, [], 'no issues');
}

// ============================================================================
// getSystemMetrics
// ============================================================================
console.log('\n── getSystemMetrics ──────────────────────────────────────');

{
  resetFs();
  loadSample();
  const m = await componentsService.getSystemMetrics();
  assertEq(m.total, 4, 'total 4');
  assertEq(m.enabled, 3, '3 enabled');
  assertEq(m.disabled, 1, '1 disabled');
  assertEq(m.healthy, 2, '2 healthy');
  assertEq(m.degraded, 1, '1 degraded');
  assertEq(m.failed, 1, '1 failed');
  assert(typeof m.lastUpdated === 'string', 'lastUpdated string');

  // byCategory
  assert('backend' in m.byCategory, 'backend category');
  assert('uncategorized' in m.byCategory, 'uncategorized category');
  assertEq(m.byCategory.backend.total, 3, 'backend total');
  assertEq(m.byCategory.backend.enabled, 2, 'backend enabled');
  assertEq(m.byCategory.backend.healthy, 2, 'backend healthy');
  assertEq(m.byCategory.backend.degraded, 1, 'backend degraded');
  assertEq(m.byCategory.backend.failed, 0, 'backend failed');
  assertEq(m.byCategory.uncategorized.total, 1, 'uncat total');
  assertEq(m.byCategory.uncategorized.failed, 1, 'uncat failed');
}

// ============================================================================
// enableComponent
// ============================================================================
console.log('\n── enableComponent ───────────────────────────────────────');

// Not found → throws
{
  resetFs();
  loadSample();
  let caught: Error | null = null;
  quiet();
  try {
    await componentsService.enableComponent('nonexistent');
  } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null && caught.message.includes('not found'), 'throws for missing');
}

// Happy path — toggles enabled + saves
{
  resetFs();
  // Start with cache disabled, then enable it
  const manifest = sampleManifest();
  readFileImpl = async () => JSON.stringify(manifest);
  let written: any = null;
  writeFileImpl = async (_p: any, data: any) => {
    written = JSON.parse(data);
  };

  quiet();
  const result = await componentsService.enableComponent('cache', 'user1');
  loud();

  assertEq(result.id, 'cache', 'returns component');
  assertEq(result.enabled, true, 'enabled true');
  assert(typeof result.lastUpdated === 'string', 'lastUpdated set');
  assert(written !== null, 'saveManifest invoked');
  const saved = written.find((c: any) => c.id === 'cache');
  assertEq(saved.enabled, true, 'saved as enabled');
}

// With dependency issues — warns but still enables
{
  resetFs();
  readFileImpl = async () => JSON.stringify([
    { id: 'x', name: 'X', enabled: false, health: 'healthy', dependencies: ['missing'] },
  ]);
  writeFileImpl = async () => {};
  quiet();
  const result = await componentsService.enableComponent('x');
  loud();
  assertEq(result.enabled, true, 'enabled despite missing dep');
}

// ============================================================================
// disableComponent
// ============================================================================
console.log('\n── disableComponent ──────────────────────────────────────');

// Not found → throws
{
  resetFs();
  loadSample();
  let caught: Error | null = null;
  quiet();
  try {
    await componentsService.disableComponent('nonexistent');
  } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null && caught.message.includes('not found'), 'throws for missing');
}

// Happy path
{
  resetFs();
  loadSample();
  let written: any = null;
  writeFileImpl = async (_p: any, data: any) => { written = JSON.parse(data); };
  quiet();
  const result = await componentsService.disableComponent('api', 'user1');
  loud();
  assertEq(result.enabled, false, 'enabled false');
  assert(typeof result.lastUpdated === 'string', 'lastUpdated set');
  const saved = written.find((c: any) => c.id === 'api');
  assertEq(saved.enabled, false, 'saved as disabled');
}

// With dependents — warns (covered implicitly by loadSample where api depends on db)
{
  resetFs();
  loadSample();
  writeFileImpl = async () => {};
  quiet();
  const result = await componentsService.disableComponent('db');
  loud();
  assertEq(result.enabled, false, 'db disabled even though api depends on it');
}

// ============================================================================
// generateHealthChecks
// ============================================================================
console.log('\n── generateHealthChecks ──────────────────────────────────');

// Ports only — healthy
{
  resetFs();
  loadSample();
  const comp = { id: 'x', health: 'healthy', ports: [8080, 9090] };
  const checks = await componentsService.generateHealthChecks(comp);
  const portChecks = checks.filter((c: any) => c.name.includes('Port'));
  assertEq(portChecks.length, 2, '2 port checks');
  assertEq(portChecks[0].status, 'pass', 'pass when not failed');
}

// Ports — failed state
{
  resetFs();
  loadSample();
  const comp = { id: 'x', health: 'failed', ports: [8080] };
  const checks = await componentsService.generateHealthChecks(comp);
  const portCheck = checks.find((c: any) => c.name.includes('Port'));
  assertEq(portCheck.status, 'fail', 'fail when health failed');
  assert(portCheck.details.includes('unreachable'), 'unreachable text');
}

// Config check
{
  resetFs();
  loadSample();
  const comp = { id: 'x', health: 'healthy', configPath: '/etc/x.conf' };
  const checks = await componentsService.generateHealthChecks(comp);
  const cfg = checks.find((c: any) => c.name === 'Configuration File');
  assert(cfg !== undefined, 'config check present');
  assertEq(cfg.status, 'pass', 'config pass');
  assert(cfg.details.includes('/etc/x.conf'), 'path in details');
}

// Dependencies — valid
{
  resetFs();
  loadSample();
  const comp = { id: 'api', health: 'healthy', dependencies: ['db'] };
  const checks = await componentsService.generateHealthChecks(comp);
  const dep = checks.find((c: any) => c.name === 'Dependencies');
  assert(dep !== undefined, 'dep check present');
  assertEq(dep.status, 'pass', 'dep pass');
}

// Dependencies — invalid
{
  resetFs();
  readFileImpl = async () => JSON.stringify([
    { id: 'target', dependencies: ['ghost'] },
  ]);
  const comp = { id: 'target', health: 'healthy', dependencies: ['ghost'] };
  const checks = await componentsService.generateHealthChecks(comp);
  const dep = checks.find((c: any) => c.name === 'Dependencies');
  assertEq(dep.status, 'warn', 'dep warn');
  assert(dep.details.includes('Issues'), 'issues in details');
}

// Health issues present
{
  resetFs();
  loadSample();
  const comp = {
    id: 'x',
    health: 'degraded',
    healthIssues: ['slow', 'high cpu'],
  };
  const checks = await componentsService.generateHealthChecks(comp);
  const hi = checks.find((c: any) => c.name === 'Health Issues');
  assert(hi !== undefined, 'health issues check present');
  assertEq(hi.status, 'warn', 'warn status');
  assert(hi.details.includes('slow'), 'slow listed');
  assert(hi.details.includes('high cpu'), 'high cpu listed');
}

// No relevant fields → empty array
{
  resetFs();
  loadSample();
  const checks = await componentsService.generateHealthChecks({ id: 'bare', health: 'healthy' });
  assertEq(checks, [], 'no fields → no checks');
}

// ============================================================================
// integrateWithSystemMonitoring
// ============================================================================
console.log('\n── integrateWithSystemMonitoring ─────────────────────────');

{
  quiet();
  const result = await componentsService.integrateWithSystemMonitoring();
  loud();
  assertEq(result.integrated, false, 'not integrated');
  assert(typeof result.message === 'string', 'message string');
}

// ============================================================================
// Summary
// ============================================================================
// Restore fs
fs.promises.readFile = origReadFile;
fs.promises.writeFile = origWriteFile;

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main()

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
