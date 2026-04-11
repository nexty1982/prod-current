#!/usr/bin/env npx tsx
/**
 * Unit tests for services/omaiBackgroundService.js (OMD-1069)
 *
 * Singleton service wrapping a mock OMAI orchestrator with a scheduler,
 * file indexing, and log file writer. Real dependencies:
 *   - fs.promises (mkdir, readdir, readFile, appendFile)
 *
 * Strategy: patch fs.promises methods at test time with scriptable
 * fakes; restore originals between tests. Silence console.
 *
 * Coverage:
 *   - constructor: orchestrator mock present, isRunning=false, logFile path
 *   - initialize: happy path, log-dir failure fallback, orchestrator error
 *   - registerAgents: 5 stub agents registered into mock orchestrator
 *   - startScheduler / stopScheduler: idempotency + state transitions
 *   - runScheduledTasks / runLearningTasks: error swallowing (via log)
 *   - scanDirectory: recursion, extension filter, skip node_modules/.git/dist/build,
 *                    permission-error swallow
 *   - indexFile: reads file, logs relative path, swallows errors
 *   - indexCodebase / indexDocumentation: walk + index
 *   - updateAgentMetrics: iterates all registered agents
 *   - getActiveTenants: default ['default']
 *   - ensureLogDirectory: primary mkdir success + fallback path
 *   - log: appends to file; falls back to console on error
 *   - getStatus: shape
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

// ── fs.promises patching ────────────────────────────────
const fs = require('fs');
const realMkdir = fs.promises.mkdir;
const realReaddir = fs.promises.readdir;
const realReadFile = fs.promises.readFile;
const realAppendFile = fs.promises.appendFile;

type MkdirCall = { p: string; opts: any };
const mkdirCalls: MkdirCall[] = [];
let mkdirThrowFirstN = 0;
let mkdirCallCount = 0;

type AppendCall = { p: string; data: string };
const appendCalls: AppendCall[] = [];
let appendThrows = false;

type ReaddirResp = Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>;
let readdirTree: Record<string, ReaddirResp> = {};
let readdirThrowOn: Set<string> = new Set();

let readFileMap: Record<string, string> = {};
let readFileThrowOn: Set<string> = new Set();

function installFsStubs() {
  fs.promises.mkdir = async (p: string, opts: any) => {
    mkdirCallCount++;
    mkdirCalls.push({ p, opts });
    if (mkdirCallCount <= mkdirThrowFirstN) {
      const err: any = new Error('EACCES');
      err.code = 'EACCES';
      throw err;
    }
    return undefined;
  };
  fs.promises.readdir = async (p: string, _opts: any) => {
    if (readdirThrowOn.has(p)) throw new Error(`readdir fail: ${p}`);
    return readdirTree[p] || [];
  };
  fs.promises.readFile = async (p: string, _enc: any) => {
    if (readFileThrowOn.has(p)) throw new Error(`readFile fail: ${p}`);
    return readFileMap[p] ?? 'content';
  };
  fs.promises.appendFile = async (p: string, data: string) => {
    if (appendThrows) throw new Error('append fail');
    appendCalls.push({ p, data });
  };
}

function restoreFs() {
  fs.promises.mkdir = realMkdir;
  fs.promises.readdir = realReaddir;
  fs.promises.readFile = realReadFile;
  fs.promises.appendFile = realAppendFile;
}

function resetFsState() {
  mkdirCalls.length = 0;
  mkdirCallCount = 0;
  mkdirThrowFirstN = 0;
  appendCalls.length = 0;
  appendThrows = false;
  readdirTree = {};
  readdirThrowOn = new Set();
  readFileMap = {};
  readFileThrowOn = new Set();
}

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// Helper: build a dirent-like entry
function ent(name: string, kind: 'dir' | 'file') {
  return {
    name,
    isDirectory: () => kind === 'dir',
    isFile: () => kind === 'file',
  };
}

installFsStubs();

// Load SUT (after fs stubs so constructor uses our mkdir if it runs any — it doesn't)
const omaiBackgroundService = require('../omaiBackgroundService');

async function main() {

// ============================================================================
// constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

assertEq(omaiBackgroundService.isRunning, false, 'isRunning=false');
assertEq(omaiBackgroundService.scheduler, null, 'scheduler=null');
assert(typeof omaiBackgroundService.orchestrator === 'object', 'orchestrator exists');
assert(typeof omaiBackgroundService.orchestrator.runAgent === 'function', 'runAgent fn');
assert(typeof omaiBackgroundService.orchestrator.getStatus === 'function', 'getStatus fn');
assert(typeof omaiBackgroundService.orchestrator.initialize === 'function', 'initialize fn');
assert(typeof omaiBackgroundService.orchestrator.getAgents === 'function', 'getAgents fn');
assert(typeof omaiBackgroundService.orchestrator.registerAgent === 'function', 'registerAgent fn');
assert(omaiBackgroundService.logFile.endsWith('omai.log'), 'logFile path');

// mock orchestrator runAgent
quiet();
{
  const r = await omaiBackgroundService.orchestrator.runAgent('x', { a: 1 });
  loud();
  assertEq(r.success, true, 'runAgent returns success');
}

// mock orchestrator getStatus
{
  const s = omaiBackgroundService.orchestrator.getStatus();
  assertEq(s.isRunning, false, 'mock status isRunning');
  assertEq(s.status, 'disabled', 'mock status disabled');
}

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

{
  const s = omaiBackgroundService.getStatus();
  assertEq(s.isRunning, false, 'status isRunning');
  assertEq(s.orchestratorStatus.status, 'disabled', 'orchestratorStatus.status');
  assert(typeof s.logFile === 'string', 'logFile string');
  assert(typeof s.timestamp === 'string', 'timestamp string');
}

// ============================================================================
// ensureLogDirectory
// ============================================================================
console.log('\n── ensureLogDirectory ────────────────────────────────────');

// Happy path
resetFsState();
quiet();
await omaiBackgroundService.ensureLogDirectory();
loud();
assertEq(mkdirCalls.length, 1, 'one mkdir');
assert(mkdirCalls[0].opts && mkdirCalls[0].opts.recursive === true, 'recursive:true');

// Primary path fails → fallback path
resetFsState();
mkdirThrowFirstN = 1;
quiet();
await omaiBackgroundService.ensureLogDirectory();
loud();
assertEq(mkdirCalls.length, 2, 'tries twice');
assert(mkdirCalls[1].p.endsWith('/logs'), 'fallback to ./logs');
assert(omaiBackgroundService.logFile.endsWith('/logs/omai.log'), 'logFile switched');

// Reset logFile to something sane for later tests
omaiBackgroundService.logDir = '/var/log/orthodoxmetrics';
const path = require('path');
omaiBackgroundService.logFile = path.join(omaiBackgroundService.logDir, 'omai.log');

// ============================================================================
// log
// ============================================================================
console.log('\n── log ───────────────────────────────────────────────────');

resetFsState();
await omaiBackgroundService.log('hello world');
assertEq(appendCalls.length, 1, 'one appendFile');
assert(appendCalls[0].data.includes('[INFO]'), 'default level INFO');
assert(appendCalls[0].data.includes('hello world'), 'message appended');

await omaiBackgroundService.log('oops', 'ERROR');
assertEq(appendCalls.length, 2, 'second log');
assert(appendCalls[1].data.includes('[ERROR]'), 'ERROR level');

// Fallback to console on append error
resetFsState();
appendThrows = true;
let consoleLogged = false;
const origLog2 = console.log;
console.log = (msg: string) => {
  if (typeof msg === 'string' && msg.includes('[OMAI Background]')) consoleLogged = true;
};
await omaiBackgroundService.log('fallback test');
console.log = origLog2;
assert(consoleLogged, 'fell back to console.log on append failure');
appendThrows = false;

// ============================================================================
// registerAgents
// ============================================================================
console.log('\n── registerAgents ────────────────────────────────────────');

resetFsState();
quiet();
// Wipe any previous registrations from prior initialize()
// (our mock stores in a closure array — can't clear without re-constructing,
//  so we read the count before and after)
const beforeAgents = omaiBackgroundService.orchestrator.getAgents().length;
await omaiBackgroundService.registerAgents();
loud();
const afterAgents = omaiBackgroundService.orchestrator.getAgents().length;
assertEq(afterAgents - beforeAgents, 5, '5 agents registered');

// Verify specific agent IDs were added
const allAgents = omaiBackgroundService.orchestrator.getAgents();
const ids = allAgents.map((a: any) => a.id);
assert(ids.includes('omai-doc-bot'), 'omai-doc-bot');
assert(ids.includes('omai-api-guardian'), 'omai-api-guardian');
assert(ids.includes('schema-sentinel'), 'schema-sentinel');
assert(ids.includes('omai-mediator'), 'omai-mediator');
assert(ids.includes('omai-refactor'), 'omai-refactor');

// Agents have execute fn
const docBot = allAgents.find((a: any) => a.id === 'omai-doc-bot');
const execResult = await docBot.execute({});
assertEq(execResult.success, true, 'stub agent execute success');
assertEq(execResult.result, 'Documentation generated', 'doc bot result');

// ============================================================================
// initialize
// ============================================================================
console.log('\n── initialize ────────────────────────────────────────────');

resetFsState();
quiet();
{
  const ok = await omaiBackgroundService.initialize();
  loud();
  assertEq(ok, true, 'initialize returns true');
  assert(mkdirCalls.length >= 1, 'mkdir called');
}

// initialize fails when orchestrator.initialize throws
resetFsState();
const realOrchInit = omaiBackgroundService.orchestrator.initialize;
omaiBackgroundService.orchestrator.initialize = async () => { throw new Error('boom'); };
quiet();
{
  const ok = await omaiBackgroundService.initialize();
  loud();
  assertEq(ok, false, 'initialize returns false on error');
}
omaiBackgroundService.orchestrator.initialize = realOrchInit;

// ============================================================================
// scanDirectory
// ============================================================================
console.log('\n── scanDirectory ─────────────────────────────────────────');

resetFsState();
readdirTree = {
  '/root': [
    ent('file1.js', 'file'),
    ent('file2.ts', 'file'),
    ent('README.md', 'file'),
    ent('image.png', 'file'),
    ent('sub', 'dir'),
    ent('node_modules', 'dir'),
    ent('.git', 'dir'),
    ent('dist', 'dir'),
    ent('build', 'dir'),
  ],
  '/root/sub': [
    ent('nested.tsx', 'file'),
    ent('style.css', 'file'),
  ],
};

quiet();
const files = await omaiBackgroundService.scanDirectory('/root', ['.js', '.ts', '.tsx', '.md']);
loud();
// file1.js, file2.ts, README.md, sub/nested.tsx (4 matches)
assertEq(files.length, 4, '4 files (filtered by extension)');
assert(files.some((f: string) => f.endsWith('file1.js')), 'includes file1.js');
assert(files.some((f: string) => f.endsWith('file2.ts')), 'includes file2.ts');
assert(files.some((f: string) => f.endsWith('README.md')), 'includes README.md');
assert(files.some((f: string) => f.endsWith('nested.tsx')), 'includes nested.tsx');
assert(!files.some((f: string) => f.includes('image.png')), 'excludes .png');
assert(!files.some((f: string) => f.includes('style.css')), 'excludes .css');
assert(!files.some((f: string) => f.includes('node_modules')), 'skips node_modules');
assert(!files.some((f: string) => f.includes('.git')), 'skips .git');
assert(!files.some((f: string) => f.includes('dist')), 'skips dist');

// Permission error → swallowed, returns []
resetFsState();
readdirThrowOn.add('/bad');
quiet();
const bad = await omaiBackgroundService.scanDirectory('/bad', ['.js']);
loud();
assertEq(bad.length, 0, 'readdir fail → []');

// ============================================================================
// indexFile
// ============================================================================
console.log('\n── indexFile ─────────────────────────────────────────────');

resetFsState();
readFileMap['/some/file.js'] = 'console.log(1)';
quiet();
await omaiBackgroundService.indexFile('/some/file.js');
loud();
// Success is silent — no throw is the success indicator
assert(true, 'indexFile does not throw on success');

// File read error → swallowed
resetFsState();
readFileThrowOn.add('/no/file.js');
quiet();
let indexFileThrew = false;
try {
  await omaiBackgroundService.indexFile('/no/file.js');
} catch (e) {
  indexFileThrew = true;
}
loud();
assert(!indexFileThrew, 'indexFile swallows read errors');

// ============================================================================
// indexCodebase / indexDocumentation
// ============================================================================
console.log('\n── indexCodebase / indexDocumentation ────────────────────');

resetFsState();
readdirTree = {
  '/base': [ent('a.js', 'file'), ent('b.txt', 'file')],
};
readFileMap['/base/a.js'] = 'x';
quiet();
await omaiBackgroundService.indexCodebase('/base');
loud();
assert(true, 'indexCodebase walks without throwing');

resetFsState();
readdirTree = {
  '/docs': [ent('guide.md', 'file'), ent('notes.txt', 'file')],
};
readFileMap['/docs/guide.md'] = '# guide';
readFileMap['/docs/notes.txt'] = 'notes';
quiet();
await omaiBackgroundService.indexDocumentation('/docs');
loud();
assert(true, 'indexDocumentation walks without throwing');

// indexCodebase swallows errors
resetFsState();
readdirThrowOn.add('/fail');
quiet();
let icThrew = false;
try {
  await omaiBackgroundService.indexCodebase('/fail');
} catch (e) {
  icThrew = true;
}
loud();
assert(!icThrew, 'indexCodebase swallows scan errors');

// ============================================================================
// pattern / log analysis / metrics (stubs — just verify no throw)
// ============================================================================
console.log('\n── analysis / metrics stubs ──────────────────────────────');

resetFsState();
quiet();
await omaiBackgroundService.analyzeLogPatterns();
await omaiBackgroundService.analyzeCodePatterns();
await omaiBackgroundService.runPatternAnalysis();
loud();
assert(true, 'pattern stubs do not throw');

// updateAgentMetrics iterates registered agents
resetFsState();
quiet();
let metricCount = 0;
const realUpdatePerf = omaiBackgroundService.updateAgentPerformance.bind(omaiBackgroundService);
omaiBackgroundService.updateAgentPerformance = async (_agent: any) => {
  metricCount++;
};
await omaiBackgroundService.updateAgentMetrics();
omaiBackgroundService.updateAgentPerformance = realUpdatePerf;
loud();
assert(metricCount >= 5, 'called updateAgentPerformance per agent');

// ============================================================================
// getActiveTenants
// ============================================================================
console.log('\n── getActiveTenants ──────────────────────────────────────');

resetFsState();
quiet();
{
  const t = await omaiBackgroundService.getActiveTenants();
  loud();
  assertEq(t, ['default'], 'returns [default]');
}

// ============================================================================
// runScheduledTasks / runLearningTasks
// ============================================================================
console.log('\n── runScheduledTasks / runLearningTasks ──────────────────');

resetFsState();
readdirTree = { [require('path').join(__dirname, '..', '..')]: [] };
quiet();
let runThrew = false;
try {
  await omaiBackgroundService.runScheduledTasks();
} catch (e) {
  runThrew = true;
}
loud();
assert(!runThrew, 'runScheduledTasks does not throw');

// Error-swallowing: if a sub-task throws, runScheduledTasks should not re-throw
resetFsState();
const realLearning = omaiBackgroundService.runLearningTasks.bind(omaiBackgroundService);
omaiBackgroundService.runLearningTasks = async () => { throw new Error('learn boom'); };
quiet();
let runThrew2 = false;
try {
  await omaiBackgroundService.runScheduledTasks();
} catch (e) {
  runThrew2 = true;
}
omaiBackgroundService.runLearningTasks = realLearning;
loud();
assert(!runThrew2, 'runScheduledTasks swallows sub-task errors');

// ============================================================================
// startScheduler / stopScheduler
// ============================================================================
console.log('\n── startScheduler / stopScheduler ────────────────────────');

// Stop when not running → early return
resetFsState();
omaiBackgroundService.isRunning = false;
omaiBackgroundService.scheduler = null;
quiet();
await omaiBackgroundService.stopScheduler();
loud();
assertEq(omaiBackgroundService.isRunning, false, 'still not running');

// Start when already running → early return
resetFsState();
omaiBackgroundService.isRunning = true;
quiet();
await omaiBackgroundService.startScheduler(5);
loud();
assertEq(omaiBackgroundService.isRunning, true, 'still running (early return)');
omaiBackgroundService.isRunning = false;

// Start then stop — use a stubbed runScheduledTasks to avoid fs work
resetFsState();
const realRunSched = omaiBackgroundService.runScheduledTasks.bind(omaiBackgroundService);
omaiBackgroundService.runScheduledTasks = async () => { /* noop */ };
quiet();
await omaiBackgroundService.startScheduler(60); // 60 min → 3.6M ms, won't fire during test
loud();
assertEq(omaiBackgroundService.isRunning, true, 'scheduler running');
assert(omaiBackgroundService.scheduler !== null, 'interval id stored');

quiet();
await omaiBackgroundService.stopScheduler();
loud();
assertEq(omaiBackgroundService.isRunning, false, 'scheduler stopped');
assertEq(omaiBackgroundService.scheduler, null, 'interval id cleared');

omaiBackgroundService.runScheduledTasks = realRunSched;

// ============================================================================
// Cleanup + Summary
// ============================================================================
restoreFs();

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); restoreFs(); console.error('Unhandled:', e); process.exit(1); });
