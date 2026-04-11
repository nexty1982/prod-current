#!/usr/bin/env npx tsx
/**
 * Unit tests for services/omaiBackgroundService.js (OMD-1107)
 *
 * Singleton background service with a mock orchestrator. External deps:
 *   - fs.promises (readdir, readFile, mkdir, appendFile)
 *
 * Strategy: replace fs.promises with a virtual-filesystem stub BEFORE
 * requiring the SUT so the captured reference points at the stub.
 *
 * Since the SUT exports a singleton, tests reset its state between cases
 * (isRunning, scheduler, logDir/logFile, orchestrator mockAgents via
 * re-registering).
 *
 * Coverage:
 *   - constructor defaults
 *   - mock orchestrator helpers (initialize, getStatus, getAgents,
 *     registerAgent, runAgent)
 *   - log() writes via fs.appendFile; falls back to console on failure
 *   - ensureLogDirectory: primary mkdir OK; primary fails → fallback local
 *   - initialize: happy path, orchestrator init failure → false
 *   - registerAgents: 5 stub agents registered
 *   - startScheduler / stopScheduler: state transitions, idempotency,
 *     interval scheduling (we pin setInterval to observe and clear)
 *   - runScheduledTasks / runLearningTasks / runKnowledgeIndexing /
 *     runPatternAnalysis: delegation + error isolation
 *   - scanDirectory: extension filter, excluded dirs, permission error
 *   - indexFile: readFile success, error swallowed
 *   - updateAgentMetrics / updateAgentPerformance
 *   - getActiveTenants (default), getStatus
 *
 * Run: npx tsx server/src/services/__tests__/omaiBackgroundService.test.ts
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

// ── Virtual filesystem for fs.promises ─────────────────────────────
type VEntry =
  | { type: 'file'; content: string }
  | { type: 'dir' };

const vfs = new Map<string, VEntry>();
const appendLog: Array<{ path: string; data: string }> = [];
const mkdirLog: Array<{ path: string; recursive: boolean }> = [];

let mkdirFailOn: RegExp | null = null;
let readFileFailOn: RegExp | null = null;
let readdirFailOn: RegExp | null = null;

function resetFs() {
  vfs.clear();
  appendLog.length = 0;
  mkdirLog.length = 0;
  mkdirFailOn = null;
  readFileFailOn = null;
  readdirFailOn = null;
}

function addFile(p: string, content: string) {
  vfs.set(p, { type: 'file', content });
}

function addDir(p: string) {
  vfs.set(p, { type: 'dir' });
}

const path = require('path');

function dirent(name: string, isDir: boolean) {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
  };
}

const fsPromisesStub = {
  readdir: async (p: string, opts?: any) => {
    if (readdirFailOn && readdirFailOn.test(p)) {
      throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
    }
    const children: any[] = [];
    for (const [key, val] of vfs.entries()) {
      if (path.dirname(key) !== p) continue;
      children.push(dirent(path.basename(key), val.type === 'dir'));
    }
    return children;
  },
  readFile: async (p: string, _enc?: string) => {
    if (readFileFailOn && readFileFailOn.test(p)) {
      throw new Error('simulated read failure');
    }
    const entry = vfs.get(p);
    if (!entry || entry.type !== 'file') throw new Error(`ENOENT: ${p}`);
    return entry.content;
  },
  mkdir: async (p: string, opts?: any) => {
    mkdirLog.push({ path: p, recursive: !!(opts && opts.recursive) });
    if (mkdirFailOn && mkdirFailOn.test(p)) {
      throw new Error('simulated mkdir failure');
    }
    addDir(p);
  },
  appendFile: async (p: string, data: string) => {
    appendLog.push({ path: p, data });
    const existing = vfs.get(p);
    const prev = existing && existing.type === 'file' ? existing.content : '';
    addFile(p, prev + data);
  },
};

// Install the stub as fs.promises BEFORE loading the SUT
const realFs = require('fs');
Object.defineProperty(realFs, 'promises', {
  value: fsPromisesStub,
  writable: true,
  configurable: true,
});

// Silence noisy logs from the SUT
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// Require the SUT AFTER the fs.promises override
quiet();
const omai = require('../omaiBackgroundService');
loud();

// ── Helper: reset singleton state between tests
function resetOmai() {
  omai.isRunning = false;
  if (omai.scheduler) {
    clearInterval(omai.scheduler);
    omai.scheduler = null;
  }
  // Re-assign default log paths
  omai.logDir = '/var/log/orthodoxmetrics';
  omai.logFile = path.join(omai.logDir, 'omai.log');
  resetFs();
}

async function main() {

// ============================================================================
// Constructor defaults
// ============================================================================
console.log('\n── constructor defaults ──────────────────────────────────');

{
  assertEq(omai.isRunning, false, 'isRunning false');
  assertEq(omai.scheduler, null, 'scheduler null');
  assertEq(omai.logDir, '/var/log/orthodoxmetrics', 'default logDir');
  assertEq(omai.logFile, '/var/log/orthodoxmetrics/omai.log', 'default logFile');
  assert(typeof omai.orchestrator === 'object', 'orchestrator object');
  assert(typeof omai.orchestrator.runAgent === 'function', 'runAgent fn');
  assert(typeof omai.orchestrator.getStatus === 'function', 'getStatus fn');
  assert(typeof omai.orchestrator.initialize === 'function', 'initialize fn');
  assert(typeof omai.orchestrator.getAgents === 'function', 'getAgents fn');
  assert(typeof omai.orchestrator.registerAgent === 'function', 'registerAgent fn');
}

// ============================================================================
// Mock orchestrator behaviors
// ============================================================================
console.log('\n── mock orchestrator ─────────────────────────────────────');

resetOmai();
{
  quiet();
  const r = await omai.orchestrator.runAgent('test-agent', { x: 1 });
  loud();
  assertEq(r, { success: true, message: 'Mock agent execution' }, 'runAgent result');
}

{
  const s = omai.orchestrator.getStatus();
  assertEq(s, { isRunning: false, status: 'disabled' }, 'getStatus result');
}

{
  quiet();
  const ok = await omai.orchestrator.initialize();
  loud();
  assertEq(ok, true, 'initialize returns true');
}

// registerAgent + getAgents
{
  // Note: singleton already accumulates agents across tests.
  // Capture baseline then register one.
  const before = omai.orchestrator.getAgents().length;
  quiet();
  omai.orchestrator.registerAgent({ name: 'test-x', id: 't1' });
  loud();
  const after = omai.orchestrator.getAgents().length;
  assertEq(after - before, 1, 'one agent added');
}

// ============================================================================
// log() — writes via appendFile
// ============================================================================
console.log('\n── log: writes ────────────────────────────────────────────');

resetOmai();
{
  await omai.log('hello world');
  assertEq(appendLog.length, 1, 'one appendFile call');
  assertEq(appendLog[0].path, '/var/log/orthodoxmetrics/omai.log', 'logFile path');
  assert(/INFO/.test(appendLog[0].data), 'level INFO');
  assert(/hello world/.test(appendLog[0].data), 'message present');
  assert(/\n$/.test(appendLog[0].data), 'ends with newline');
}

// Custom level
resetOmai();
{
  await omai.log('bad thing', 'ERROR');
  assert(/ERROR/.test(appendLog[0].data), 'ERROR level');
  assert(/bad thing/.test(appendLog[0].data), 'message');
}

// log fallback to console on error
resetOmai();
{
  // Force appendFile to throw
  const orig = fsPromisesStub.appendFile;
  fsPromisesStub.appendFile = async () => { throw new Error('disk full'); };
  let logged = '';
  const origLog2 = console.log;
  console.log = (msg: string) => { logged += msg; };
  try {
    await omai.log('stderr message');
  } finally {
    console.log = origLog2;
    fsPromisesStub.appendFile = orig;
  }
  assert(logged.includes('stderr message'), 'fallback wrote to console');
}

// ============================================================================
// ensureLogDirectory
// ============================================================================
console.log('\n── ensureLogDirectory ────────────────────────────────────');

// Primary succeeds
resetOmai();
{
  await omai.ensureLogDirectory();
  assertEq(mkdirLog.length, 1, 'one mkdir');
  assertEq(mkdirLog[0].path, '/var/log/orthodoxmetrics', 'primary path');
  assertEq(mkdirLog[0].recursive, true, 'recursive');
  assertEq(omai.logDir, '/var/log/orthodoxmetrics', 'logDir unchanged');
}

// Primary fails → fallback to local
resetOmai();
{
  mkdirFailOn = /^\/var\/log\/orthodoxmetrics$/;
  await omai.ensureLogDirectory();
  assertEq(mkdirLog.length, 2, 'two mkdir attempts');
  assertEq(mkdirLog[0].path, '/var/log/orthodoxmetrics', 'first attempted');
  assert(omai.logDir !== '/var/log/orthodoxmetrics', 'logDir updated to fallback');
  assert(omai.logDir.endsWith('/logs'), 'fallback ends with /logs');
  assert(omai.logFile.endsWith('/logs/omai.log'), 'fallback logFile');
}

// ============================================================================
// initialize — happy path
// ============================================================================
console.log('\n── initialize: happy ─────────────────────────────────────');

resetOmai();
{
  const ok = await omai.initialize();
  assertEq(ok, true, 'returns true');
  // mkdir + orchestrator.initialize + registerAgents should log
  assert(appendLog.length >= 1, 'at least one log entry');
  // At least one "initialized successfully" log
  const combined = appendLog.map(l => l.data).join('');
  assert(/initialized successfully/.test(combined), 'success log present');
}

// initialize — orchestrator.initialize throws → false
resetOmai();
{
  const origInit = omai.orchestrator.initialize;
  omai.orchestrator.initialize = async () => { throw new Error('orchestrator down'); };
  const ok = await omai.initialize();
  omai.orchestrator.initialize = origInit;
  assertEq(ok, false, 'returns false on error');
  const combined = appendLog.map(l => l.data).join('');
  assert(/Failed to initialize/.test(combined), 'failure logged');
}

// ============================================================================
// registerAgents — registers 5 stub agents
// ============================================================================
console.log('\n── registerAgents ────────────────────────────────────────');

resetOmai();
{
  const before = omai.orchestrator.getAgents().length;
  await omai.registerAgents();
  const after = omai.orchestrator.getAgents().length;
  assertEq(after - before, 5, '5 agents added');
  // Verify expected agent IDs appear among recently-added
  const agents = omai.orchestrator.getAgents();
  const ids = agents.slice(-5).map((a: any) => a.id).sort();
  assertEq(
    ids,
    ['omai-api-guardian', 'omai-doc-bot', 'omai-mediator', 'omai-refactor', 'schema-sentinel'],
    'agent ids'
  );
}

// ============================================================================
// startScheduler / stopScheduler
// ============================================================================
console.log('\n── scheduler lifecycle ───────────────────────────────────');

// Pin setInterval so we can observe and clear
const origSetInterval = global.setInterval;
const origClearInterval = global.clearInterval;
let capturedHandle: any = null;
let capturedMs: any = null;
let capturedFn: any = null;
(global as any).setInterval = (fn: any, ms: number) => {
  capturedFn = fn;
  capturedMs = ms;
  capturedHandle = { __fake: true };
  return capturedHandle;
};
(global as any).clearInterval = (h: any) => {
  if (h && h.__fake) capturedHandle = null;
};

// Start scheduler
resetOmai();
{
  await omai.startScheduler(15);
  assertEq(omai.isRunning, true, 'isRunning true');
  assertEq(omai.scheduler, capturedHandle, 'scheduler set');
  assertEq(capturedMs, 15 * 60 * 1000, '15 minute interval');
}

// Start again while running → no-op
{
  const handleBefore = omai.scheduler;
  await omai.startScheduler(10);
  assertEq(omai.scheduler, handleBefore, 'no change');
}

// Stop
{
  await omai.stopScheduler();
  assertEq(omai.isRunning, false, 'isRunning false');
  assertEq(omai.scheduler, null, 'scheduler null');
}

// Stop again → no-op
{
  await omai.stopScheduler();
  assertEq(omai.isRunning, false, 'still false');
}

// Restore
(global as any).setInterval = origSetInterval;
(global as any).clearInterval = origClearInterval;

// ============================================================================
// scanDirectory
// ============================================================================
console.log('\n── scanDirectory ─────────────────────────────────────────');

resetOmai();
{
  addDir('/proj');
  addFile('/proj/a.js', 'A');
  addFile('/proj/b.txt', 'B');  // not in extensions
  addFile('/proj/c.md', 'C');
  addDir('/proj/sub');
  addFile('/proj/sub/d.ts', 'D');
  addDir('/proj/node_modules');
  addFile('/proj/node_modules/bad.js', 'X'); // should be skipped

  const files = await omai.scanDirectory('/proj', ['.js', '.ts', '.md']);
  const names = files.map((f: string) => path.basename(f)).sort();
  assertEq(names, ['a.js', 'c.md', 'd.ts'], 'correct files (excluded + filtered)');
}

// readdir error is swallowed
resetOmai();
{
  readdirFailOn = /^\/blocked$/;
  const files = await omai.scanDirectory('/blocked', ['.js']);
  assertEq(files.length, 0, 'empty on permission error');
}

// ============================================================================
// indexFile — success + error
// ============================================================================
console.log('\n── indexFile ─────────────────────────────────────────────');

resetOmai();
{
  addFile('/proj/doc.md', '# Doc');
  await omai.indexFile('/proj/doc.md');
  const combined = appendLog.map(l => l.data).join('');
  assert(/Indexed file/.test(combined), 'logs indexed file');
}

// readFile error swallowed with WARN log
resetOmai();
{
  readFileFailOn = /missing\.md$/;
  await omai.indexFile('/proj/missing.md');
  const combined = appendLog.map(l => l.data).join('');
  assert(/Failed to index/.test(combined), 'logs failure');
  assert(/WARN/.test(combined), 'WARN level');
}

// ============================================================================
// runKnowledgeIndexing — delegates to indexCodebase + indexDocumentation
// ============================================================================
console.log('\n── runKnowledgeIndexing ──────────────────────────────────');

resetOmai();
{
  // Spy on indexCodebase & indexDocumentation
  let cbCalled = 0, docCalled = 0;
  const origCb = omai.indexCodebase.bind(omai);
  const origDoc = omai.indexDocumentation.bind(omai);
  omai.indexCodebase = async () => { cbCalled++; };
  omai.indexDocumentation = async () => { docCalled++; };
  await omai.runKnowledgeIndexing();
  omai.indexCodebase = origCb;
  omai.indexDocumentation = origDoc;
  assertEq(cbCalled, 1, 'indexCodebase called');
  assertEq(docCalled, 1, 'indexDocumentation called');
}

// ============================================================================
// runPatternAnalysis — delegates to the two stubs
// ============================================================================
console.log('\n── runPatternAnalysis ────────────────────────────────────');

resetOmai();
{
  let logCalled = 0, codeCalled = 0;
  const origL = omai.analyzeLogPatterns.bind(omai);
  const origC = omai.analyzeCodePatterns.bind(omai);
  omai.analyzeLogPatterns = async () => { logCalled++; };
  omai.analyzeCodePatterns = async () => { codeCalled++; };
  await omai.runPatternAnalysis();
  omai.analyzeLogPatterns = origL;
  omai.analyzeCodePatterns = origC;
  assertEq(logCalled, 1, 'log analysis called');
  assertEq(codeCalled, 1, 'code analysis called');
}

// ============================================================================
// updateAgentMetrics — iterates orchestrator agents
// ============================================================================
console.log('\n── updateAgentMetrics ────────────────────────────────────');

resetOmai();
{
  // Inject deterministic agent list
  const origGetAgents = omai.orchestrator.getAgents;
  omai.orchestrator.getAgents = () => [
    { name: 'agent-a' }, { name: 'agent-b' }, { name: 'agent-c' },
  ];
  let perfCalled = 0;
  const origPerf = omai.updateAgentPerformance.bind(omai);
  omai.updateAgentPerformance = async (_a: any) => { perfCalled++; };
  await omai.updateAgentMetrics();
  omai.orchestrator.getAgents = origGetAgents;
  omai.updateAgentPerformance = origPerf;
  assertEq(perfCalled, 3, 'called 3 times');
}

// ============================================================================
// runScheduledTasks / runLearningTasks — delegation + error isolation
// ============================================================================
console.log('\n── runScheduledTasks ─────────────────────────────────────');

resetOmai();
{
  // Spy on runLearningTasks
  let called = 0;
  const orig = omai.runLearningTasks.bind(omai);
  omai.runLearningTasks = async () => { called++; };
  await omai.runScheduledTasks();
  omai.runLearningTasks = orig;
  assertEq(called, 1, 'delegates to runLearningTasks');
}

// Error inside runLearningTasks is swallowed
resetOmai();
{
  const orig = omai.runLearningTasks.bind(omai);
  omai.runLearningTasks = async () => { throw new Error('boom'); };
  // Should NOT throw
  let threw = false;
  try {
    await omai.runScheduledTasks();
  } catch { threw = true; }
  omai.runLearningTasks = orig;
  assertEq(threw, false, 'error swallowed');
  const combined = appendLog.map(l => l.data).join('');
  assert(/Scheduled tasks failed/.test(combined), 'failure logged');
}

// ============================================================================
// getActiveTenants — default list
// ============================================================================
console.log('\n── getActiveTenants ──────────────────────────────────────');

resetOmai();
{
  const t = await omai.getActiveTenants();
  assertEq(t, ['default'], 'default tenant list');
}

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

resetOmai();
{
  const s = omai.getStatus();
  assertEq(s.isRunning, false, 'isRunning false');
  assertEq(s.orchestratorStatus.status, 'disabled', 'orchestrator status');
  assertEq(s.logFile, '/var/log/orthodoxmetrics/omai.log', 'logFile');
  assert(typeof s.timestamp === 'string', 'timestamp iso');
  assert(/^\d{4}-\d{2}-\d{2}T/.test(s.timestamp), 'timestamp format');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
