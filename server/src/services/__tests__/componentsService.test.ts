#!/usr/bin/env npx tsx
/**
 * Unit tests for services/componentsService.js (OMD-1059)
 *
 * Exports a singleton ComponentsService. External deps:
 *   - fs.promises.readFile / writeFile
 *   - child_process.exec (via promisify) — for getSystemResourceUsage
 *
 * Both are stubbed via require.cache BEFORE requiring the SUT.
 *
 * Coverage:
 *   - loadManifest (happy + fs error → throw)
 *   - saveManifest (happy + fs error → throw)
 *   - performHealthCheck (found, not found → unknown)
 *   - validateDependencies (no deps, missing dep, disabled dep, failed dep, all ok)
 *   - getSystemMetrics (counts by enabled/disabled/health, grouped byCategory)
 *   - enableComponent (happy + not found + dependency issues warn)
 *   - disableComponent (happy + not found + dependents warn)
 *   - generateHealthChecks (ports / config / dependencies / healthIssues)
 *   - integrateWithSystemMonitoring (placeholder returns)
 *   - getSystemResourceUsage (exec success + exec-rejected fallbacks)
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

// ── fs.promises stub ────────────────────────────────────────────────
let manifestData: any[] = [];
let readFileThrows: Error | null = null;
let writeFileThrows: Error | null = null;
const writeFileLog: string[] = [];

const fakeFsPromises = {
  readFile: async (_path: string, _enc: string) => {
    if (readFileThrows) throw readFileThrows;
    return JSON.stringify(manifestData);
  },
  writeFile: async (_path: string, data: string) => {
    if (writeFileThrows) throw writeFileThrows;
    writeFileLog.push(data);
  },
};

// Patch fs.promises directly
const realFs = require('fs');
const origFsPromises = realFs.promises;
Object.defineProperty(realFs, 'promises', {
  value: fakeFsPromises,
  writable: true,
  configurable: true,
});

// ── child_process.exec stub ─────────────────────────────────────────
type ExecResult = { stdout: string; stderr?: string };
let execResponses: Record<string, ExecResult | Error> = {};

const fakeExec = (cmd: string, cb: (err: Error | null, result?: ExecResult) => void) => {
  // Find matching response by substring
  for (const key of Object.keys(execResponses)) {
    if (cmd.includes(key)) {
      const r = execResponses[key];
      if (r instanceof Error) {
        cb(r);
        return;
      }
      cb(null, r);
      return;
    }
  }
  cb(null, { stdout: '', stderr: '' });
};

const cpPath = require.resolve('child_process');
const realCp = require('child_process');
require.cache[cpPath] = {
  id: cpPath,
  filename: cpPath,
  loaded: true,
  exports: { ...realCp, exec: fakeExec },
} as any;

function resetAll() {
  manifestData = [];
  readFileThrows = null;
  writeFileThrows = null;
  writeFileLog.length = 0;
  execResponses = {};
}

// Silence console
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

const svc = require('../componentsService');

async function main() {

// ============================================================================
// loadManifest
// ============================================================================
console.log('\n── loadManifest ──────────────────────────────────────────');

resetAll();
manifestData = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
{
  const loaded = await svc.loadManifest();
  assertEq(loaded.length, 2, 'loads 2 components');
  assertEq(loaded[0].id, 'a', 'first id');
}

// fs error → wrapped error
resetAll();
readFileThrows = new Error('ENOENT');
quiet();
{
  let caught: Error | null = null;
  try { await svc.loadManifest(); } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws on fs error');
  assert(caught?.message.includes('Failed to load'), 'wraps with "Failed to load"');
}

// ============================================================================
// saveManifest
// ============================================================================
console.log('\n── saveManifest ──────────────────────────────────────────');

resetAll();
{
  await svc.saveManifest([{ id: 'x', name: 'X' }]);
  assertEq(writeFileLog.length, 1, 'writeFile called');
  const parsed = JSON.parse(writeFileLog[0]);
  assertEq(parsed[0].id, 'x', 'serialized content');
}

// fs write error
resetAll();
writeFileThrows = new Error('EACCES');
quiet();
{
  let caught: Error | null = null;
  try { await svc.saveManifest([]); } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws on write error');
  assert(caught?.message.includes('Failed to save'), 'wraps with "Failed to save"');
}

// ============================================================================
// performHealthCheck
// ============================================================================
console.log('\n── performHealthCheck ────────────────────────────────────');

resetAll();
manifestData = [
  { id: 'api', name: 'API', health: 'healthy', ports: [3001], configPath: '/etc/api.conf' },
];
{
  const r = await svc.performHealthCheck('api');
  assertEq(r.componentId, 'api', 'componentId');
  assertEq(r.health, 'healthy', 'health');
  assert(r.checks.length >= 2, 'has port + config checks');
  assert(typeof r.lastCheck === 'string', 'lastCheck ISO');
}

// Not found — returns unknown w/ error (swallowed via try/catch)
resetAll();
manifestData = [{ id: 'api', health: 'healthy' }];
quiet();
{
  const r = await svc.performHealthCheck('missing');
  loud();
  assertEq(r.health, 'unknown', 'not found → unknown');
  assert(r.error?.includes('not found'), 'error mentions not found');
}

// ============================================================================
// validateDependencies
// ============================================================================
console.log('\n── validateDependencies ──────────────────────────────────');

// No dependencies → valid
resetAll();
manifestData = [{ id: 'a' }];
{
  const r = await svc.validateDependencies('a');
  assertEq(r.valid, true, 'no deps → valid');
  assertEq(r.issues.length, 0, 'no issues');
}

// Component not found → valid (returns early)
resetAll();
manifestData = [];
{
  const r = await svc.validateDependencies('missing');
  assertEq(r.valid, true, 'missing component → valid');
}

// Missing dep
resetAll();
manifestData = [{ id: 'a', dependencies: ['b'] }];
{
  const r = await svc.validateDependencies('a');
  assertEq(r.valid, false, 'missing dep → invalid');
  assertEq(r.issues.length, 1, '1 issue');
  assert(r.issues[0].includes('Missing dependency'), 'missing dependency reason');
}

// Disabled dep
resetAll();
manifestData = [
  { id: 'a', dependencies: ['b'] },
  { id: 'b', name: 'B', enabled: false, health: 'healthy' },
];
{
  const r = await svc.validateDependencies('a');
  assertEq(r.valid, false, 'disabled → invalid');
  assert(r.issues[0].includes('disabled'), 'issue mentions disabled');
}

// Failed dep
resetAll();
manifestData = [
  { id: 'a', dependencies: ['b'] },
  { id: 'b', name: 'B', enabled: true, health: 'failed' },
];
{
  const r = await svc.validateDependencies('a');
  assertEq(r.valid, false, 'failed → invalid');
  assert(r.issues[0].includes('unhealthy'), 'issue mentions unhealthy');
}

// All ok
resetAll();
manifestData = [
  { id: 'a', dependencies: ['b'] },
  { id: 'b', name: 'B', enabled: true, health: 'healthy' },
];
{
  const r = await svc.validateDependencies('a');
  assertEq(r.valid, true, 'all ok → valid');
  assertEq(r.issues.length, 0, 'no issues');
  assertEq(r.dependencies.length, 1, 'dependencies returned');
}

// ============================================================================
// getSystemMetrics
// ============================================================================
console.log('\n── getSystemMetrics ──────────────────────────────────────');

resetAll();
manifestData = [
  { id: 'a', enabled: true, health: 'healthy', category: 'api' },
  { id: 'b', enabled: true, health: 'degraded', category: 'api' },
  { id: 'c', enabled: false, health: 'failed', category: 'db' },
  { id: 'd', enabled: true, health: 'healthy' }, // no category
];
{
  const m = await svc.getSystemMetrics();
  assertEq(m.total, 4, 'total=4');
  assertEq(m.enabled, 3, 'enabled=3');
  assertEq(m.disabled, 1, 'disabled=1');
  assertEq(m.healthy, 2, 'healthy=2');
  assertEq(m.degraded, 1, 'degraded=1');
  assertEq(m.failed, 1, 'failed=1');
  assertEq(m.byCategory.api.total, 2, 'api total');
  assertEq(m.byCategory.api.enabled, 2, 'api enabled');
  assertEq(m.byCategory.api.healthy, 1, 'api healthy');
  assertEq(m.byCategory.api.degraded, 1, 'api degraded');
  assertEq(m.byCategory.db.total, 1, 'db total');
  assertEq(m.byCategory.db.failed, 1, 'db failed');
  assertEq(m.byCategory.uncategorized.total, 1, 'uncategorized total');
  assert(typeof m.lastUpdated === 'string', 'lastUpdated set');
}

// ============================================================================
// enableComponent
// ============================================================================
console.log('\n── enableComponent ───────────────────────────────────────');

resetAll();
manifestData = [{ id: 'a', name: 'A', enabled: false, health: 'unknown' }];
quiet();
{
  const r = await svc.enableComponent('a', 'tester');
  loud();
  assertEq(r.enabled, true, 'enabled=true');
  assert(typeof r.lastUpdated === 'string', 'lastUpdated set');
  assertEq(writeFileLog.length, 1, 'manifest saved');
  // Verify saved content reflects enabled=true
  const saved = JSON.parse(writeFileLog[0]);
  assertEq(saved[0].enabled, true, 'saved state reflects enable');
}

// Not found throws
resetAll();
manifestData = [{ id: 'a' }];
{
  let caught: Error | null = null;
  try { await svc.enableComponent('missing', 'tester'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing throws');
  assert(caught?.message.includes('not found'), 'error mentions not found');
}

// Enable with dependency issues — warns but proceeds
resetAll();
manifestData = [
  { id: 'a', name: 'A', enabled: false, dependencies: ['b'], health: 'healthy' },
  // missing dep 'b'
];
quiet();
{
  const r = await svc.enableComponent('a', 'tester');
  loud();
  assertEq(r.enabled, true, 'enabled despite dep issues');
}

// ============================================================================
// disableComponent
// ============================================================================
console.log('\n── disableComponent ──────────────────────────────────────');

resetAll();
manifestData = [
  { id: 'a', name: 'A', enabled: true },
  { id: 'b', name: 'B', enabled: true, dependencies: ['a'] },
];
quiet();
{
  const r = await svc.disableComponent('a', 'tester');
  loud();
  assertEq(r.enabled, false, 'enabled=false');
  const saved = JSON.parse(writeFileLog[0]);
  assertEq(saved[0].enabled, false, 'saved state');
}

// Not found
resetAll();
manifestData = [{ id: 'a' }];
{
  let caught: Error | null = null;
  try { await svc.disableComponent('missing', 't'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing throws');
  assert(caught?.message.includes('not found'), 'error mentions not found');
}

// ============================================================================
// generateHealthChecks
// ============================================================================
console.log('\n── generateHealthChecks ──────────────────────────────────');

resetAll();
manifestData = [
  {
    id: 'full',
    name: 'Full',
    enabled: true,
    health: 'healthy',
    ports: [3001, 3002],
    configPath: '/etc/full.conf',
    dependencies: [],
    healthIssues: ['high cpu usage'],
  },
];
{
  const checks = await svc.generateHealthChecks(manifestData[0]);
  // 2 port checks + 1 config check + 1 health issues check = 4 (no deps → 0)
  assertEq(checks.length, 4, '4 checks');
  assertEq(checks[0].name, 'Port 3001 Connectivity', 'port 1 check');
  assertEq(checks[0].status, 'pass', 'port 1 pass');
  assertEq(checks[1].name, 'Port 3002 Connectivity', 'port 2 check');
  assertEq(checks[2].name, 'Configuration File', 'config check');
  assertEq(checks[2].status, 'pass', 'config pass');
  assertEq(checks[3].name, 'Health Issues', 'health issues check');
  assertEq(checks[3].status, 'warn', 'health issues warn');
  assert(checks[3].details.includes('high cpu usage'), 'details preserved');
}

// Failed health — ports reported as fail
resetAll();
{
  const component = { id: 'x', health: 'failed', ports: [8080] };
  const checks = await svc.generateHealthChecks(component);
  assertEq(checks[0].status, 'fail', 'failed health → port fail');
  assert(checks[0].details.includes('unreachable'), 'unreachable message');
}

// Component with dep validation
resetAll();
manifestData = [
  { id: 'a', dependencies: ['b'] },
  { id: 'b', enabled: true, health: 'healthy' },
];
{
  const checks = await svc.generateHealthChecks(manifestData[0]);
  const depCheck = checks.find((c: any) => c.name === 'Dependencies');
  assertEq(depCheck.status, 'pass', 'dep check pass');
  assert(depCheck.details.includes('satisfied'), 'details say satisfied');
}

// Dep validation with issues → warn
resetAll();
manifestData = [
  { id: 'a', dependencies: ['missing'] },
];
{
  const checks = await svc.generateHealthChecks(manifestData[0]);
  const depCheck = checks.find((c: any) => c.name === 'Dependencies');
  assertEq(depCheck.status, 'warn', 'dep check warn');
  assert(depCheck.details.includes('Issues'), 'details mention issues');
}

// Component with nothing → empty checks
resetAll();
{
  const checks = await svc.generateHealthChecks({ id: 'bare', health: 'healthy' });
  assertEq(checks.length, 0, 'no checks for bare component');
}

// ============================================================================
// integrateWithSystemMonitoring
// ============================================================================
console.log('\n── integrateWithSystemMonitoring ─────────────────────────');

resetAll();
quiet();
{
  const r = await svc.integrateWithSystemMonitoring();
  loud();
  assertEq(r.integrated, false, 'placeholder returns integrated=false');
  assert(r.message.includes('Manual'), 'message mentions manual');
}

// ============================================================================
// getSystemResourceUsage
// ============================================================================
console.log('\n── getSystemResourceUsage ────────────────────────────────');

resetAll();
execResponses = {
  'free -h': { stdout: 'Mem: 16G\n' },
  'df -h /': { stdout: '/ 100G 50G 50G 50%\n' },
  'uptime': { stdout: ' 12:00:00 up 1 day\n' },
};
{
  const r = await svc.getSystemResourceUsage();
  assertEq(r.available, true, 'available=true');
  assert(r.memory.includes('16G'), 'memory populated');
  assert(r.disk.includes('100G'), 'disk populated');
  assert(r.load.includes('up 1 day'), 'load populated');
  assert(typeof r.timestamp === 'string', 'timestamp');
}

// Individual exec failures fall back to empty stdout
resetAll();
execResponses = {
  'free -h': new Error('command not found'),
  'df -h /': { stdout: '/' },
  'uptime': { stdout: 'up' },
};
{
  const r = await svc.getSystemResourceUsage();
  assertEq(r.available, true, 'still available (each exec caught)');
  assertEq(r.memory, '', 'memory empty after fallback');
  assertEq(r.disk, '/', 'disk populated');
}

// Restore fs.promises so we don't break other tests
Object.defineProperty(realFs, 'promises', {
  value: origFsPromises,
  writable: true,
  configurable: true,
});

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
