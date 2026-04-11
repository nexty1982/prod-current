#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentsService.js (OMD-1176)
 *
 * Exports a singleton instance, so mocks must be installed BEFORE require.
 * Dependencies:
 *   - fs.promises.readFile/writeFile → manifest persistence
 *   - child_process.exec (via promisify(exec)) → system resource commands
 *
 * Approach:
 *   - Patch fs.promises.readFile/writeFile in place
 *   - Replace child_process.exec with a mock that honors util.promisify.custom
 *     so `promisify(exec)` returns our scripted result
 *   - Keep an in-memory `manifestData` array, round-trip via the patched fs
 *     so enable/disable → save → re-read cycles work
 *
 * Coverage:
 *   - loadManifest: happy, parse error → throws "Failed to load..."
 *   - saveManifest: happy (writes JSON), write error → throws "Failed to save..."
 *   - performHealthCheck: not found → {health:'unknown', error}; happy path
 *     returns {componentId, health, lastCheck, checks[]}
 *   - validateDependencies: not found → valid; no deps → valid; missing/disabled/
 *     failed dep → respective issue; multiple issues collected
 *   - getSystemMetrics: total/enabled/disabled/healthy/degraded/failed counts,
 *     byCategory grouping including 'uncategorized' fallback
 *   - enableComponent: not found throws; sets enabled=true, runs health check,
 *     persists; dep-check warning path still enables
 *   - disableComponent: not found throws; sets enabled=false; warns if dependents
 *   - generateHealthChecks: ports (pass/fail by health), configPath, dependencies
 *     (pass/warn), healthIssues
 *   - integrateWithSystemMonitoring: returns stub {integrated:false}
 *   - getSystemResourceUsage: happy path (mock exec), error path (all execs reject
 *     → .catch(()=>({stdout:''})) → returns {available:true} with empty strings)
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

// ── Patch fs.promises ───────────────────────────────────────────────
const fs = require('fs');
const origReadFile = fs.promises.readFile;
const origWriteFile = fs.promises.writeFile;

let manifestData: any[] = [];
let readFileThrows = false;
let readFileReturnsInvalidJson = false;
let writeFileThrows = false;

fs.promises.readFile = async (_p: string, _enc?: string) => {
  if (readFileThrows) throw new Error('ENOENT');
  if (readFileReturnsInvalidJson) return 'not valid json {{{';
  return JSON.stringify(manifestData);
};

fs.promises.writeFile = async (_p: string, contents: string) => {
  if (writeFileThrows) throw new Error('EIO');
  // Round-trip: update in-memory manifest so read-after-write works
  manifestData = JSON.parse(contents);
};

// ── Patch child_process.exec to honor util.promisify.custom ─────────
const util = require('util');
const cp = require('child_process');
const origExec = cp.exec;

const execCalls: string[] = [];
let execResult: { stdout: string; stderr: string } = { stdout: 'mock output', stderr: '' };
let execThrows = false;

const mockExec: any = function () {
  throw new Error('mock exec: use promisify form');
};
mockExec[util.promisify.custom] = async (cmd: string) => {
  execCalls.push(cmd);
  if (execThrows) throw new Error('mock exec failed');
  return execResult;
};
cp.exec = mockExec;

function resetAll() {
  manifestData = [];
  readFileThrows = false;
  readFileReturnsInvalidJson = false;
  writeFileThrows = false;
  execCalls.length = 0;
  execResult = { stdout: 'mock output', stderr: '' };
  execThrows = false;
}

// Silence noisy logs
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

// Require SUT (exports singleton)
const componentsService = require('../componentsService');

async function main() {

// ============================================================================
// loadManifest
// ============================================================================
console.log('\n── loadManifest ──────────────────────────────────────────');

resetAll();
manifestData = [
  { id: 'a', name: 'Alpha', enabled: true, health: 'healthy' },
  { id: 'b', name: 'Beta', enabled: false, health: 'failed' },
];
{
  const r = await componentsService.loadManifest();
  assertEq(r.length, 2, '2 components loaded');
  assertEq(r[0].id, 'a', 'first component');
}

// Read error → throws
resetAll();
readFileThrows = true;
quiet();
{
  let caught: any = null;
  try { await componentsService.loadManifest(); } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'throws on read error');
  assert(caught.message === 'Failed to load component manifest', 'error message');
}

// Invalid JSON → throws
resetAll();
readFileReturnsInvalidJson = true;
quiet();
{
  let caught: any = null;
  try { await componentsService.loadManifest(); } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'throws on invalid JSON');
}

// ============================================================================
// saveManifest
// ============================================================================
console.log('\n── saveManifest ──────────────────────────────────────────');

resetAll();
{
  const data = [{ id: 'x', name: 'X', enabled: true }];
  await componentsService.saveManifest(data);
  assertEq(manifestData, data, 'manifest round-tripped');
}

// Write error → throws
resetAll();
writeFileThrows = true;
quiet();
{
  let caught: any = null;
  try { await componentsService.saveManifest([]); } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'throws on write error');
  assert(caught.message === 'Failed to save component manifest', 'error message');
}

// ============================================================================
// performHealthCheck
// ============================================================================
console.log('\n── performHealthCheck ────────────────────────────────────');

// Component not found → error branch
resetAll();
manifestData = [];
quiet();
{
  const r = await componentsService.performHealthCheck('nonexistent');
  loud();
  assertEq(r.componentId, 'nonexistent', 'componentId');
  assertEq(r.health, 'unknown', 'unknown health');
  assert(r.error.includes('not found'), 'error mentions not found');
  assert(typeof r.lastCheck === 'string', 'lastCheck is ISO');
}

// Happy path with checks
resetAll();
manifestData = [
  { id: 'svc', name: 'Svc', enabled: true, health: 'healthy', ports: [3001], configPath: '/etc/svc.conf' },
];
{
  const r = await componentsService.performHealthCheck('svc');
  assertEq(r.componentId, 'svc', 'componentId');
  assertEq(r.health, 'healthy', 'health');
  assert(Array.isArray(r.checks), 'checks array');
  assertEq(r.checks.length, 2, '2 checks (port + config)');
  assertEq(r.checks[0].name, 'Port 3001 Connectivity', 'port check name');
  assertEq(r.checks[0].status, 'pass', 'port check pass');
  assertEq(r.checks[1].name, 'Configuration File', 'config check name');
}

// ============================================================================
// validateDependencies
// ============================================================================
console.log('\n── validateDependencies ──────────────────────────────────');

// Component not found → valid (no issues)
resetAll();
manifestData = [];
{
  const r = await componentsService.validateDependencies('nope');
  assertEq(r.valid, true, 'unknown component → valid');
  assertEq(r.issues, [], 'no issues');
}

// No dependencies → valid
resetAll();
manifestData = [{ id: 'a', name: 'A', enabled: true, health: 'healthy' }];
{
  const r = await componentsService.validateDependencies('a');
  assertEq(r.valid, true, 'no deps → valid');
}

// Missing dependency
resetAll();
manifestData = [
  { id: 'a', name: 'A', enabled: true, health: 'healthy', dependencies: ['missing'] },
];
{
  const r = await componentsService.validateDependencies('a');
  assertEq(r.valid, false, 'missing dep → invalid');
  assertEq(r.issues.length, 1, '1 issue');
  assert(r.issues[0].includes('Missing dependency: missing'), 'missing message');
}

// Disabled dependency
resetAll();
manifestData = [
  { id: 'a', name: 'A', enabled: true, health: 'healthy', dependencies: ['b'] },
  { id: 'b', name: 'Beta', enabled: false, health: 'healthy' },
];
{
  const r = await componentsService.validateDependencies('a');
  assertEq(r.valid, false, 'disabled dep → invalid');
  assert(r.issues[0].includes('Dependency disabled: Beta'), 'disabled message uses name');
}

// Failed dependency
resetAll();
manifestData = [
  { id: 'a', name: 'A', enabled: true, health: 'healthy', dependencies: ['b'] },
  { id: 'b', name: 'Beta', enabled: true, health: 'failed' },
];
{
  const r = await componentsService.validateDependencies('a');
  assertEq(r.valid, false, 'failed dep → invalid');
  assert(r.issues[0].includes('Dependency unhealthy: Beta'), 'failed message');
}

// Multiple issues
resetAll();
manifestData = [
  { id: 'a', name: 'A', enabled: true, health: 'healthy', dependencies: ['missing', 'b', 'c'] },
  { id: 'b', name: 'Beta', enabled: false, health: 'healthy' },
  { id: 'c', name: 'Gamma', enabled: true, health: 'failed' },
];
{
  const r = await componentsService.validateDependencies('a');
  assertEq(r.valid, false, 'multi-issue → invalid');
  assertEq(r.issues.length, 3, '3 issues collected');
  assertEq(r.dependencies, ['missing', 'b', 'c'], 'deps returned');
}

// ============================================================================
// getSystemMetrics
// ============================================================================
console.log('\n── getSystemMetrics ──────────────────────────────────────');

resetAll();
manifestData = [];
{
  const r = await componentsService.getSystemMetrics();
  assertEq(r.total, 0, 'total 0');
  assertEq(r.enabled, 0, 'enabled 0');
  assertEq(r.disabled, 0, 'disabled 0');
  assertEq(r.healthy, 0, 'healthy 0');
  assertEq(r.degraded, 0, 'degraded 0');
  assertEq(r.failed, 0, 'failed 0');
  assertEq(r.byCategory, {}, 'empty byCategory');
}

resetAll();
manifestData = [
  { id: '1', name: 'A', enabled: true, health: 'healthy', category: 'backend' },
  { id: '2', name: 'B', enabled: true, health: 'degraded', category: 'backend' },
  { id: '3', name: 'C', enabled: false, health: 'failed', category: 'frontend' },
  { id: '4', name: 'D', enabled: true, health: 'healthy' /* no category */ },
];
{
  const r = await componentsService.getSystemMetrics();
  assertEq(r.total, 4, 'total 4');
  assertEq(r.enabled, 3, 'enabled 3');
  assertEq(r.disabled, 1, 'disabled 1');
  assertEq(r.healthy, 2, 'healthy 2');
  assertEq(r.degraded, 1, 'degraded 1');
  assertEq(r.failed, 1, 'failed 1');
  // byCategory
  assertEq(r.byCategory.backend.total, 2, 'backend total');
  assertEq(r.byCategory.backend.enabled, 2, 'backend enabled');
  assertEq(r.byCategory.backend.healthy, 1, 'backend healthy');
  assertEq(r.byCategory.backend.degraded, 1, 'backend degraded');
  assertEq(r.byCategory.frontend.total, 1, 'frontend total');
  assertEq(r.byCategory.frontend.failed, 1, 'frontend failed');
  assertEq(r.byCategory.uncategorized.total, 1, 'uncategorized fallback');
  assertEq(r.byCategory.uncategorized.healthy, 1, 'uncategorized healthy');
}

// ============================================================================
// enableComponent
// ============================================================================
console.log('\n── enableComponent ───────────────────────────────────────');

resetAll();
manifestData = [];
quiet();
{
  let caught: any = null;
  try { await componentsService.enableComponent('missing'); } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'throws when not found');
  assert(caught.message.includes('not found'), 'error message');
}

// Happy path
resetAll();
manifestData = [
  { id: 'x', name: 'X', enabled: false, health: 'healthy', ports: [8080] },
];
quiet();
{
  const r = await componentsService.enableComponent('x', 'admin');
  loud();
  assertEq(r.enabled, true, 'enabled');
  assert(typeof r.lastUpdated === 'string', 'lastUpdated set');
  assert(typeof r.lastHealthCheck === 'string', 'lastHealthCheck set');
  // Manifest persisted
  assertEq(manifestData[0].enabled, true, 'persisted');
}

// With dep check warning (enables despite issues)
resetAll();
manifestData = [
  { id: 'x', name: 'X', enabled: false, health: 'healthy', dependencies: ['missing-dep'] },
];
quiet();
{
  const r = await componentsService.enableComponent('x');
  loud();
  assertEq(r.enabled, true, 'still enabled despite dep issue');
}

// ============================================================================
// disableComponent
// ============================================================================
console.log('\n── disableComponent ──────────────────────────────────────');

resetAll();
manifestData = [];
quiet();
{
  let caught: any = null;
  try { await componentsService.disableComponent('missing'); } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'throws when not found');
}

// Happy path
resetAll();
manifestData = [
  { id: 'x', name: 'X', enabled: true, health: 'healthy' },
];
quiet();
{
  const r = await componentsService.disableComponent('x', 'admin');
  loud();
  assertEq(r.enabled, false, 'disabled');
  assert(typeof r.lastUpdated === 'string', 'lastUpdated set');
  assertEq(manifestData[0].enabled, false, 'persisted');
}

// Warns about dependents
resetAll();
manifestData = [
  { id: 'x', name: 'X', enabled: true, health: 'healthy' },
  { id: 'y', name: 'Y', enabled: true, health: 'healthy', dependencies: ['x'] },
];
quiet();
{
  const r = await componentsService.disableComponent('x');
  loud();
  assertEq(r.enabled, false, 'disabled');
  // Dependent y unchanged
  assertEq(manifestData.find(c => c.id === 'y').enabled, true, 'dependent still enabled');
}

// ============================================================================
// generateHealthChecks
// ============================================================================
console.log('\n── generateHealthChecks ──────────────────────────────────');

resetAll();
manifestData = [
  { id: 'svc', name: 'Svc', enabled: true, health: 'healthy' },
];
{
  // Empty component → no checks
  const noopChecks = await componentsService.generateHealthChecks({ id: 'svc' });
  assertEq(noopChecks, [], 'no checks for bare component');
}

// Ports (pass when healthy)
{
  const checks = await componentsService.generateHealthChecks({
    id: 'x', health: 'healthy', ports: [80, 443],
  });
  assertEq(checks.length, 2, '2 port checks');
  assertEq(checks[0].status, 'pass', 'port 80 pass');
  assertEq(checks[0].name, 'Port 80 Connectivity', 'port 80 name');
  assertEq(checks[1].status, 'pass', 'port 443 pass');
  assert(checks[0].details.includes('accessible'), 'accessible detail');
}

// Ports (fail when failed)
{
  const checks = await componentsService.generateHealthChecks({
    id: 'x', health: 'failed', ports: [80],
  });
  assertEq(checks[0].status, 'fail', 'port fail on failed health');
  assert(checks[0].details.includes('unreachable'), 'unreachable detail');
}

// Configuration file check
{
  const checks = await componentsService.generateHealthChecks({
    id: 'x', health: 'healthy', configPath: '/etc/x.conf',
  });
  assertEq(checks.length, 1, '1 check');
  assertEq(checks[0].name, 'Configuration File', 'config check name');
  assertEq(checks[0].status, 'pass', 'config pass');
  assert(checks[0].details.includes('/etc/x.conf'), 'includes path');
}

// Dependencies check (pass)
resetAll();
manifestData = [
  { id: 'a', name: 'A', enabled: true, health: 'healthy', dependencies: ['b'] },
  { id: 'b', name: 'B', enabled: true, health: 'healthy' },
];
{
  const checks = await componentsService.generateHealthChecks(manifestData[0]);
  const depCheck = checks.find((c: any) => c.name === 'Dependencies');
  assert(depCheck !== undefined, 'dependency check present');
  assertEq(depCheck.status, 'pass', 'dependencies pass');
}

// Dependencies check (warn)
resetAll();
manifestData = [
  { id: 'a', name: 'A', enabled: true, health: 'healthy', dependencies: ['missing'] },
];
{
  const checks = await componentsService.generateHealthChecks(manifestData[0]);
  const depCheck = checks.find((c: any) => c.name === 'Dependencies');
  assertEq(depCheck.status, 'warn', 'dependencies warn');
  assert(depCheck.details.includes('Missing dependency'), 'warn detail');
}

// healthIssues check
{
  const checks = await componentsService.generateHealthChecks({
    id: 'x', health: 'degraded', healthIssues: ['slow response', 'memory pressure'],
  });
  const issuesCheck = checks.find((c: any) => c.name === 'Health Issues');
  assert(issuesCheck !== undefined, 'health issues check present');
  assertEq(issuesCheck.status, 'warn', 'health issues warn');
  assert(issuesCheck.details.includes('slow response'), 'first issue in detail');
  assert(issuesCheck.details.includes('memory pressure'), 'second issue in detail');
}

// ============================================================================
// integrateWithSystemMonitoring
// ============================================================================
console.log('\n── integrateWithSystemMonitoring ─────────────────────────');

resetAll();
quiet();
{
  const r = await componentsService.integrateWithSystemMonitoring();
  loud();
  assertEq(r.integrated, false, 'not integrated');
  assert(r.message.includes('Manual'), 'message says manual');
}

// ============================================================================
// getSystemResourceUsage
// ============================================================================
console.log('\n── getSystemResourceUsage ────────────────────────────────');

// Happy path with mocked exec
resetAll();
execResult = { stdout: 'mock data', stderr: '' };
{
  const r = await componentsService.getSystemResourceUsage();
  assertEq(r.available, true, 'available');
  assertEq(r.memory, 'mock data', 'memory stdout');
  assertEq(r.disk, 'mock data', 'disk stdout');
  assertEq(r.load, 'mock data', 'load stdout');
  assertEq(execCalls.length, 3, '3 exec calls');
  assert(execCalls.includes('free -h'), 'free -h');
  assert(execCalls.includes('df -h /'), 'df -h /');
  assert(execCalls.includes('uptime'), 'uptime');
  assert(typeof r.timestamp === 'string', 'timestamp ISO');
}

// Error path: all execs reject → caught per-call → empty stdouts → still available
resetAll();
execThrows = true;
{
  const r = await componentsService.getSystemResourceUsage();
  assertEq(r.available, true, 'still available (per-call catches)');
  assertEq(r.memory, '', 'memory empty from catch');
  assertEq(r.disk, '', 'disk empty from catch');
  assertEq(r.load, '', 'load empty from catch');
}

// ============================================================================
// Summary — restore patched globals
// ============================================================================
fs.promises.readFile = origReadFile;
fs.promises.writeFile = origWriteFile;
cp.exec = origExec;

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
