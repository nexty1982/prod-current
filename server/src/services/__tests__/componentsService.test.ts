#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentsService.js (OMD-1097)
 *
 * Singleton class that manages a component manifest JSON file and
 * exposes lifecycle / metrics / health-check operations.
 *
 * Strategy:
 *   - Replace child_process.exec with a controllable stub BEFORE
 *     the SUT requires() it (promisify captures the reference at
 *     require-time).
 *   - Replace fs.promises.readFile / writeFile with stubs. Since
 *     fs.promises is a shared object, mutations on its methods are
 *     visible to the SUT even if we patch post-require.
 *   - Scope fs stubs to the manifest path so other readFile calls
 *     (tsx/node internals) are unaffected.
 *   - The SUT exports a singleton — there is only one instance to
 *     test against.
 *
 * Coverage:
 *   - loadManifest / saveManifest (happy + error → throws)
 *   - performHealthCheck (ok, not-found, stored-error propagation)
 *   - validateDependencies (no deps, missing dep, disabled dep,
 *     failed dep, all healthy)
 *   - getSystemMetrics (totals, per-health, byCategory grouping)
 *   - enableComponent (not-found throws, enables + runs health check)
 *   - disableComponent (not-found throws, disables, warns on
 *     dependents)
 *   - generateHealthChecks (port checks for healthy/failed,
 *     configPath check, dependency check, healthIssues warnings)
 *   - getSystemResourceUsage (happy path, error path)
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

const pathMod = require('path');
const util = require('util');

// ── Stub child_process.exec BEFORE requiring SUT ────────────────────
// The SUT does `const { exec } = require('child_process');`
// followed by `const execAsync = promisify(exec);`
// So we must replace `exec` before SUT load.
//
// The real child_process.exec has a util.promisify.custom symbol that
// makes promisify(exec) resolve to {stdout, stderr}. Our stub must
// preserve that contract or destructuring `const { stdout } = await
// execAsync(...)` will fail.
const childProcess = require('child_process');
const origExec = childProcess.exec;

type ExecResponse = { stdout: string; stderr?: string } | Error;
let execResponses: Record<string, ExecResponse> = {};
let execCalls: string[] = [];

function resolveExec(cmd: string): Promise<{ stdout: string; stderr: string }> {
  execCalls.push(cmd);
  const key = Object.keys(execResponses).find(k => cmd.includes(k));
  const resp = key ? execResponses[key] : { stdout: '', stderr: '' };
  if (resp instanceof Error) return Promise.reject(resp);
  return Promise.resolve({ stdout: resp.stdout, stderr: resp.stderr || '' });
}

// Regular callback form (in case anything else calls the un-promisified
// function); also attach the promisify.custom symbol so that promisify(exec)
// returns a function resolving to {stdout, stderr}.
const stubExec: any = (cmd: string, ...rest: any[]) => {
  const cb = rest[rest.length - 1];
  resolveExec(cmd).then(
    ({ stdout, stderr }) => { if (typeof cb === 'function') cb(null, stdout, stderr); },
    (err) => { if (typeof cb === 'function') cb(err); }
  );
  return {};
};
stubExec[util.promisify.custom] = resolveExec;
childProcess.exec = stubExec;

// ── Stub fs.promises.readFile / writeFile (scoped to manifest path) ──
const fsMod = require('fs');
const origReadFile = fsMod.promises.readFile;
const origWriteFile = fsMod.promises.writeFile;

let manifestContent: string | Error = '[]';
let writeLog: Array<{ path: string; content: string }> = [];

function isManifestPath(p: any): boolean {
  const s = typeof p === 'string' ? p : p.toString();
  return s.includes('componentManifest.json');
}

fsMod.promises.readFile = async (p: any, encoding: any) => {
  if (isManifestPath(p)) {
    if (manifestContent instanceof Error) throw manifestContent;
    return manifestContent;
  }
  return origReadFile.call(fsMod.promises, p, encoding);
};

fsMod.promises.writeFile = async (p: any, content: any, ...rest: any[]) => {
  if (isManifestPath(p)) {
    writeLog.push({ path: String(p), content: String(content) });
    return;
  }
  return origWriteFile.call(fsMod.promises, p, content, ...rest);
};

// ── Now require the SUT (a singleton instance) ──────────────────────
const componentsService = require('../componentsService');

// Silence noisy logs
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

function setManifest(components: any[]): void {
  manifestContent = JSON.stringify(components);
  writeLog = [];
}

function setManifestError(err: Error): void {
  manifestContent = err;
  writeLog = [];
}

function resetExec(): void {
  execResponses = {};
  execCalls = [];
}

async function main() {

// ============================================================================
// loadManifest
// ============================================================================
console.log('\n── loadManifest ──────────────────────────────────────────');

setManifest([{ id: 'a', name: 'A' }]);
{
  const r = await componentsService.loadManifest();
  assertEq(r, [{ id: 'a', name: 'A' }], 'loads parsed manifest');
}

setManifestError(new Error('ENOENT'));
quiet();
{
  let threw = false;
  try { await componentsService.loadManifest(); } catch { threw = true; }
  loud();
  assertEq(threw, true, 'throws on read error');
}

// ============================================================================
// saveManifest
// ============================================================================
console.log('\n── saveManifest ──────────────────────────────────────────');

setManifest([]);
{
  await componentsService.saveManifest([{ id: 'x', name: 'X' }]);
  assertEq(writeLog.length, 1, 'one write');
  assert(writeLog[0].path.includes('componentManifest.json'), 'correct path');
  const parsed = JSON.parse(writeLog[0].content);
  assertEq(parsed, [{ id: 'x', name: 'X' }], 'written content');
}

// saveManifest error path — monkey-patch writeFile to throw once
{
  const origScoped = fsMod.promises.writeFile;
  fsMod.promises.writeFile = async (p: any) => {
    if (isManifestPath(p)) throw new Error('EACCES');
    return origWriteFile.call(fsMod.promises, p);
  };
  quiet();
  let threw = false;
  try { await componentsService.saveManifest([]); } catch { threw = true; }
  loud();
  assertEq(threw, true, 'throws on write error');
  fsMod.promises.writeFile = origScoped;
}

// ============================================================================
// performHealthCheck
// ============================================================================
console.log('\n── performHealthCheck ────────────────────────────────────');

setManifest([
  { id: 'db', name: 'DB', health: 'healthy', ports: [3306], configPath: '/etc/db.conf' },
  { id: 'api', name: 'API', health: 'degraded', dependencies: ['db'] },
]);
{
  const r = await componentsService.performHealthCheck('db');
  assertEq(r.componentId, 'db', 'componentId echoed');
  assertEq(r.health, 'healthy', 'health from manifest');
  assert(typeof r.lastCheck === 'string', 'lastCheck ISO timestamp');
  assert(Array.isArray(r.checks), 'checks array');
}

// Not found → returns error object (caught inside)
quiet();
{
  const r = await componentsService.performHealthCheck('nonexistent');
  loud();
  assertEq(r.componentId, 'nonexistent', 'componentId in error response');
  assertEq(r.health, 'unknown', 'health=unknown on error');
  assert(r.error.includes('not found'), 'error message');
  assert(typeof r.lastCheck === 'string', 'lastCheck still set');
}

// Load error → handled
setManifestError(new Error('EIO'));
quiet();
{
  const r = await componentsService.performHealthCheck('db');
  loud();
  assertEq(r.health, 'unknown', 'health=unknown on load error');
  assert(r.error.length > 0, 'error populated');
}

// ============================================================================
// validateDependencies
// ============================================================================
console.log('\n── validateDependencies ──────────────────────────────────');

// No dependencies → valid
setManifest([{ id: 'stand-alone', name: 'S', enabled: true, health: 'healthy' }]);
{
  const r = await componentsService.validateDependencies('stand-alone');
  assertEq(r.valid, true, 'no-deps → valid');
  assertEq(r.issues, [], 'no issues');
}

// Component not found → valid (no deps)
{
  const r = await componentsService.validateDependencies('nope');
  assertEq(r.valid, true, 'component not found → valid (treated as no deps)');
}

// Missing dependency
setManifest([
  { id: 'api', name: 'API', enabled: true, dependencies: ['db', 'redis'] },
  { id: 'db', name: 'DB', enabled: true, health: 'healthy' },
]);
{
  const r = await componentsService.validateDependencies('api');
  assertEq(r.valid, false, 'missing dep → invalid');
  assert(r.issues.some((i: string) => i.includes('redis')), 'missing redis in issues');
  assertEq(r.dependencies, ['db', 'redis'], 'dependencies echoed');
}

// Disabled dependency
setManifest([
  { id: 'api', name: 'API', enabled: true, dependencies: ['db'] },
  { id: 'db', name: 'DB', enabled: false, health: 'healthy' },
]);
{
  const r = await componentsService.validateDependencies('api');
  assertEq(r.valid, false, 'disabled dep → invalid');
  assert(r.issues.some((i: string) => i.includes('disabled')), 'disabled in issues');
  assert(r.issues.some((i: string) => i.includes('DB')), 'uses dep name');
}

// Failed dependency
setManifest([
  { id: 'api', name: 'API', enabled: true, dependencies: ['db'] },
  { id: 'db', name: 'DB', enabled: true, health: 'failed' },
]);
{
  const r = await componentsService.validateDependencies('api');
  assertEq(r.valid, false, 'failed dep → invalid');
  assert(r.issues.some((i: string) => i.includes('unhealthy')), 'unhealthy in issues');
}

// All healthy
setManifest([
  { id: 'api', name: 'API', enabled: true, dependencies: ['db'] },
  { id: 'db', name: 'DB', enabled: true, health: 'healthy' },
]);
{
  const r = await componentsService.validateDependencies('api');
  assertEq(r.valid, true, 'all healthy → valid');
  assertEq(r.issues, [], 'no issues');
}

// ============================================================================
// getSystemMetrics
// ============================================================================
console.log('\n── getSystemMetrics ──────────────────────────────────────');

setManifest([
  { id: 'a', enabled: true, health: 'healthy', category: 'db' },
  { id: 'b', enabled: true, health: 'degraded', category: 'db' },
  { id: 'c', enabled: false, health: 'failed', category: 'cache' },
  { id: 'd', enabled: true, health: 'healthy', category: 'api' },
  { id: 'e', enabled: true, health: 'healthy' },  // no category → uncategorized
]);
{
  const m = await componentsService.getSystemMetrics();
  assertEq(m.total, 5, 'total=5');
  assertEq(m.enabled, 4, 'enabled=4');
  assertEq(m.disabled, 1, 'disabled=1');
  assertEq(m.healthy, 3, 'healthy=3');
  assertEq(m.degraded, 1, 'degraded=1');
  assertEq(m.failed, 1, 'failed=1');
  assert(typeof m.lastUpdated === 'string', 'lastUpdated set');

  // byCategory
  assertEq(m.byCategory.db.total, 2, 'db: 2 total');
  assertEq(m.byCategory.db.enabled, 2, 'db: 2 enabled');
  assertEq(m.byCategory.db.healthy, 1, 'db: 1 healthy');
  assertEq(m.byCategory.db.degraded, 1, 'db: 1 degraded');
  assertEq(m.byCategory.cache.total, 1, 'cache: 1 total');
  assertEq(m.byCategory.cache.enabled, 0, 'cache: 0 enabled');
  assertEq(m.byCategory.cache.failed, 1, 'cache: 1 failed');
  assertEq(m.byCategory.api.healthy, 1, 'api: 1 healthy');
  assertEq(m.byCategory.uncategorized.total, 1, 'uncategorized: 1 total');
}

// Empty manifest
setManifest([]);
{
  const m = await componentsService.getSystemMetrics();
  assertEq(m.total, 0, 'empty: total=0');
  assertEq(m.enabled, 0, 'empty: enabled=0');
  assertEq(m.byCategory, {}, 'empty: byCategory empty');
}

// ============================================================================
// enableComponent
// ============================================================================
console.log('\n── enableComponent ───────────────────────────────────────');

// Not found throws
setManifest([{ id: 'a', name: 'A', enabled: false, health: 'healthy' }]);
{
  let threw = false;
  try { await componentsService.enableComponent('zzz'); }
  catch (e: any) {
    threw = true;
    assert(e.message.includes('not found'), 'error mentions not found');
  }
  assertEq(threw, true, 'throws on not-found');
}

// Happy path
setManifest([
  { id: 'api', name: 'API', enabled: false, health: 'healthy',
    dependencies: ['db'] },
  { id: 'db', name: 'DB', enabled: true, health: 'healthy' },
]);
quiet();
{
  const r = await componentsService.enableComponent('api', 'alice');
  loud();
  assertEq(r.enabled, true, 'enabled=true');
  assertEq(r.health, 'healthy', 'health populated from performHealthCheck');
  assert(typeof r.lastUpdated === 'string', 'lastUpdated set');
  assert(typeof r.lastHealthCheck === 'string', 'lastHealthCheck set');
  // Manifest was persisted
  assertEq(writeLog.length, 1, '1 write');
  const written = JSON.parse(writeLog[0].content);
  assertEq(written.find((c: any) => c.id === 'api').enabled, true, 'persisted enabled');
}

// Enable with dep issues warns but still proceeds
setManifest([
  { id: 'api', name: 'API', enabled: false, health: 'healthy',
    dependencies: ['redis'] },  // missing redis
]);
quiet();
{
  const r = await componentsService.enableComponent('api');
  loud();
  assertEq(r.enabled, true, 'enables even with dep issues');
}

// ============================================================================
// disableComponent
// ============================================================================
console.log('\n── disableComponent ──────────────────────────────────────');

setManifest([{ id: 'a', name: 'A', enabled: true, health: 'healthy' }]);
{
  let threw = false;
  try { await componentsService.disableComponent('zzz'); }
  catch (e: any) {
    threw = true;
    assert(e.message.includes('not found'), 'error mentions not found');
  }
  assertEq(threw, true, 'throws on not-found');
}

// Happy path
setManifest([
  { id: 'api', name: 'API', enabled: true, health: 'healthy' },
  { id: 'client', name: 'Client', enabled: true, dependencies: ['api'] },
]);
quiet();
{
  const r = await componentsService.disableComponent('api', 'bob');
  loud();
  assertEq(r.enabled, false, 'enabled=false');
  assert(typeof r.lastUpdated === 'string', 'lastUpdated set');
  // Manifest persisted
  assertEq(writeLog.length, 1, '1 write');
  const written = JSON.parse(writeLog[0].content);
  assertEq(written.find((c: any) => c.id === 'api').enabled, false, 'persisted disabled');
}

// Disable with no dependents (just ensure it works)
setManifest([{ id: 'iso', name: 'Isolated', enabled: true }]);
quiet();
{
  const r = await componentsService.disableComponent('iso');
  loud();
  assertEq(r.enabled, false, 'isolated disable ok');
}

// ============================================================================
// generateHealthChecks (via performHealthCheck)
// ============================================================================
console.log('\n── generateHealthChecks ──────────────────────────────────');

// Port checks (healthy)
setManifest([
  { id: 'db', name: 'DB', enabled: true, health: 'healthy', ports: [3306, 3307] },
]);
{
  const r = await componentsService.performHealthCheck('db');
  const portChecks = r.checks.filter((c: any) => c.name.includes('Port'));
  assertEq(portChecks.length, 2, '2 port checks');
  assertEq(portChecks[0].status, 'pass', 'healthy → pass');
  assert(portChecks[0].details.includes('accessible'), 'accessible message');
}

// Port checks (failed)
setManifest([
  { id: 'db', name: 'DB', enabled: true, health: 'failed', ports: [3306] },
]);
{
  const r = await componentsService.performHealthCheck('db');
  const portCheck = r.checks.find((c: any) => c.name.includes('Port'));
  assertEq(portCheck.status, 'fail', 'failed → fail');
  assert(portCheck.details.includes('unreachable'), 'unreachable message');
}

// Config path check
setManifest([
  { id: 'app', name: 'App', enabled: true, health: 'healthy', configPath: '/etc/app.conf' },
]);
{
  const r = await componentsService.performHealthCheck('app');
  const cfgCheck = r.checks.find((c: any) => c.name === 'Configuration File');
  assert(cfgCheck !== undefined, 'config check present');
  assertEq(cfgCheck.status, 'pass', 'config pass');
  assert(cfgCheck.details.includes('/etc/app.conf'), 'includes path');
}

// Dependencies check (satisfied)
setManifest([
  { id: 'app', name: 'App', enabled: true, health: 'healthy', dependencies: ['db'] },
  { id: 'db', name: 'DB', enabled: true, health: 'healthy' },
]);
{
  const r = await componentsService.performHealthCheck('app');
  const dCheck = r.checks.find((c: any) => c.name === 'Dependencies');
  assert(dCheck !== undefined, 'deps check present');
  assertEq(dCheck.status, 'pass', 'deps pass');
  assert(dCheck.details.includes('satisfied'), 'satisfied message');
}

// Dependencies check (unsatisfied)
setManifest([
  { id: 'app', name: 'App', enabled: true, health: 'healthy', dependencies: ['missing'] },
]);
{
  const r = await componentsService.performHealthCheck('app');
  const dCheck = r.checks.find((c: any) => c.name === 'Dependencies');
  assertEq(dCheck.status, 'warn', 'deps warn');
  assert(dCheck.details.includes('Issues:'), 'issues in details');
}

// Health issues warnings
setManifest([
  { id: 'app', name: 'App', enabled: true, health: 'degraded',
    healthIssues: ['slow response', 'high memory'] },
]);
{
  const r = await componentsService.performHealthCheck('app');
  const hCheck = r.checks.find((c: any) => c.name === 'Health Issues');
  assert(hCheck !== undefined, 'health issues check');
  assertEq(hCheck.status, 'warn', 'health warn');
  assert(hCheck.details.includes('slow response'), 'issue 1');
  assert(hCheck.details.includes('high memory'), 'issue 2');
}

// ============================================================================
// integrateWithSystemMonitoring
// ============================================================================
console.log('\n── integrateWithSystemMonitoring ─────────────────────────');

quiet();
{
  const r = await componentsService.integrateWithSystemMonitoring();
  loud();
  assertEq(r.integrated, false, 'not integrated (placeholder)');
  assert(r.message.length > 0, 'has message');
}

// ============================================================================
// getSystemResourceUsage
// ============================================================================
console.log('\n── getSystemResourceUsage ────────────────────────────────');

resetExec();
execResponses = {
  'free -h': { stdout: 'total used free\n16G  8G  8G' },
  'df -h /': { stdout: 'Filesystem Size Used\n/dev/sda 100G 50G' },
  'uptime': { stdout: '12:00 up 5 days, load 0.5' },
};
{
  const r = await componentsService.getSystemResourceUsage();
  assertEq(r.available, true, 'available');
  assert(r.memory.includes('16G'), 'memory populated');
  assert(r.disk.includes('100G'), 'disk populated');
  assert(r.load.includes('load 0.5'), 'load populated');
  assert(typeof r.timestamp === 'string', 'timestamp set');
  // Verify exec called
  assert(execCalls.some(c => c.includes('free')), 'free called');
  assert(execCalls.some(c => c.includes('df')), 'df called');
  assert(execCalls.some(c => c.includes('uptime')), 'uptime called');
}

// Each exec fails individually — inner .catch fallbacks kick in per command,
// so r.available remains true with empty stdout strings
resetExec();
execResponses = {
  'free -h': new Error('command not found'),
  'df -h /': new Error('command not found'),
  'uptime': new Error('command not found'),
};
{
  const r = await componentsService.getSystemResourceUsage();
  assertEq(r.available, true, 'available=true (per-command catches)');
  assertEq(r.memory, '', 'memory empty string on error');
  assertEq(r.disk, '', 'disk empty string on error');
  assertEq(r.load, '', 'load empty string on error');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

// Restore originals
childProcess.exec = origExec;
fsMod.promises.readFile = origReadFile;
fsMod.promises.writeFile = origWriteFile;

if (failed > 0) process.exit(1);

} // end main

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  childProcess.exec = origExec;
  fsMod.promises.readFile = origReadFile;
  fsMod.promises.writeFile = origWriteFile;
  process.exit(1);
});
