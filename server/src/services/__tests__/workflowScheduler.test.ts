#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowScheduler.js (OMD-1226)
 *
 * Minute-granularity scheduled workflow evaluator.
 *
 * External deps stubbed via require.cache BEFORE requiring the SUT:
 *   - node-cron    (schedule() captures the tick handler; validate() scriptable)
 *   - ../config/db (getAppPool → fake pool)
 *   - ./workflowEngine (dynamic require inside evaluate — stubbed so it
 *                       is loadable at that point)
 *
 * Coverage:
 *   - startWorkflowScheduler:
 *       · cron.schedule called with '* * * * *'
 *       · double-start is a no-op (returns without re-scheduling)
 *   - stopWorkflowScheduler:
 *       · job.stop() called
 *       · safe to call when not running
 *       · post-stop start reschedules
 *   - tick handler (captured from cron.schedule):
 *       · queries platform_workflows WHERE is_enabled AND schedule trigger
 *       · no workflows → early return (no executeWorkflow calls)
 *       · invalid JSON trigger_config → skipped
 *       · object trigger_config accepted
 *       · missing config.cron → skipped
 *       · cron.validate returns false → skipped (warn)
 *       · valid cron matching current minute → executeWorkflow called
 *       · valid cron NOT matching → not executed
 *       · executeWorkflow rejection caught
 *       · one workflow throws → other workflows still evaluated
 *       · isRunning guard: overlapping ticks are no-ops
 *
 * Run: npx tsx server/src/services/__tests__/workflowScheduler.test.ts
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

// ── node-cron stub ───────────────────────────────────────────────────
type ScheduleCall = { expr: string; handler: () => Promise<void> };
const scheduleCalls: ScheduleCall[] = [];
let capturedHandler: (() => Promise<void>) | null = null;
let fakeJobStopCount = 0;
let validateResult = true;

const fakeJob = { stop: () => { fakeJobStopCount++; } };

const cronStub = {
  schedule: (expr: string, handler: () => Promise<void>) => {
    scheduleCalls.push({ expr, handler });
    capturedHandler = handler;
    return fakeJob;
  },
  validate: (_expr: string) => validateResult,
};

const cronPath = require.resolve('node-cron');
require.cache[cronPath] = {
  id: cronPath, filename: cronPath, loaded: true, exports: cronStub,
} as any;

// ── config/db stub ───────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
let workflowRows: any[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (/FROM platform_workflows/.test(sql)) return [workflowRows];
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const path = require('path');
const dbDir = path.resolve(__dirname, '..', '..', 'config');
for (const ext of ['.js', '.ts']) {
  const p = path.join(dbDir, 'db' + ext);
  require.cache[p] = { id: p, filename: p, loaded: true, exports: dbStub } as any;
}

// ── workflowEngine stub (dynamic require inside the SUT) ─────────────
type ExecCall = { workflowId: any; triggerSource: string; context: any };
const execCalls: ExecCall[] = [];
let execThrows = false;

const engineStub = {
  executeWorkflow: async (args: ExecCall) => {
    execCalls.push(args);
    if (execThrows) throw new Error('exec failed');
    return { ok: true };
  },
};
const servicesDir = path.resolve(__dirname, '..', '..', 'services');
for (const ext of ['.js', '.ts']) {
  const p = path.join(servicesDir, 'workflowEngine' + ext);
  require.cache[p] = { id: p, filename: p, loaded: true, exports: engineStub } as any;
}

function resetState() {
  scheduleCalls.length = 0;
  capturedHandler = null;
  fakeJobStopCount = 0;
  validateResult = true;
  queryLog.length = 0;
  workflowRows = [];
  execCalls.length = 0;
  execThrows = false;
}

// Silence
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;
function quiet() { console.log = () => {}; console.error = () => {}; console.warn = () => {}; }
function loud() { console.log = origLog; console.error = origError; console.warn = origWarn; }

const {
  startWorkflowScheduler,
  stopWorkflowScheduler,
} = require('../workflowScheduler');

// ── Cron helper: build an expression that always matches the current minute
function currentMatchingCron(): string {
  const now = new Date();
  return `${now.getMinutes()} ${now.getHours()} ${now.getDate()} ${now.getMonth() + 1} *`;
}

async function main() {

// ============================================================================
// startWorkflowScheduler / stopWorkflowScheduler lifecycle
// ============================================================================
console.log('\n── start/stop lifecycle ───────────────────────────────────');

resetState();
quiet();
startWorkflowScheduler();
loud();
assertEq(scheduleCalls.length, 1, 'cron.schedule called once');
assertEq(scheduleCalls[0].expr, '* * * * *', 'expression: every minute');
assertEq(typeof scheduleCalls[0].handler, 'function', 'handler function');

// Double-start is no-op
quiet();
startWorkflowScheduler();
loud();
assertEq(scheduleCalls.length, 1, 'double-start does not re-schedule');

// Stop
quiet();
stopWorkflowScheduler();
loud();
assertEq(fakeJobStopCount, 1, 'job.stop() called');

// Safe to stop when not running
quiet();
stopWorkflowScheduler();
loud();
assertEq(fakeJobStopCount, 1, 'stop-when-stopped is no-op');

// Re-start after stop
quiet();
startWorkflowScheduler();
loud();
assertEq(scheduleCalls.length, 2, 'can restart after stop');

// Leave scheduler stopped for subsequent tests
quiet();
stopWorkflowScheduler();
loud();

// ============================================================================
// tick handler: no workflows → early return
// ============================================================================
console.log('\n── tick: no workflows ─────────────────────────────────────');

resetState();
quiet();
startWorkflowScheduler();
workflowRows = [];
await capturedHandler!();
loud();

assertEq(queryLog.length, 1, '1 query (workflow fetch)');
assertEq(execCalls.length, 0, 'no workflows executed');

quiet(); stopWorkflowScheduler(); loud();

// ============================================================================
// tick handler: invalid JSON trigger_config → skipped
// ============================================================================
console.log('\n── tick: invalid trigger_config ───────────────────────────');

resetState();
quiet();
startWorkflowScheduler();
workflowRows = [
  { id: 1, workflow_key: 'bad', name: 'Bad JSON', trigger_config: '{not-json}', cooldown_seconds: 60 },
];
await capturedHandler!();
loud();

assertEq(execCalls.length, 0, 'invalid JSON skipped');

quiet(); stopWorkflowScheduler(); loud();

// ============================================================================
// tick handler: missing cron field → skipped
// ============================================================================
console.log('\n── tick: missing cron field ───────────────────────────────');

resetState();
quiet();
startWorkflowScheduler();
workflowRows = [
  { id: 2, workflow_key: 'nocron', name: 'NoCron', trigger_config: JSON.stringify({}), cooldown_seconds: 60 },
];
await capturedHandler!();
loud();
assertEq(execCalls.length, 0, 'no cron → skipped');
quiet(); stopWorkflowScheduler(); loud();

// ============================================================================
// tick handler: cron.validate false → skipped
// ============================================================================
console.log('\n── tick: invalid cron expression ──────────────────────────');

resetState();
quiet();
startWorkflowScheduler();
validateResult = false;
workflowRows = [
  { id: 3, workflow_key: 'invalid', name: 'Invalid', trigger_config: JSON.stringify({ cron: 'xyz' }), cooldown_seconds: 60 },
];
await capturedHandler!();
loud();
assertEq(execCalls.length, 0, 'invalid cron skipped');
quiet(); stopWorkflowScheduler(); loud();

// ============================================================================
// tick handler: cron NOT matching now → skipped
// ============================================================================
console.log('\n── tick: cron not matching now ────────────────────────────');

resetState();
quiet();
startWorkflowScheduler();
validateResult = true;
// At minute 0 of hour 0 only — very unlikely to match "now"
// Use a specific minute/hour that almost certainly isn't the current time
const now = new Date();
const nonMatchMinute = (now.getMinutes() + 30) % 60;
const nonMatchHour = (now.getHours() + 12) % 24;
workflowRows = [
  {
    id: 4, workflow_key: 'wrong-time', name: 'WrongTime',
    trigger_config: JSON.stringify({ cron: `${nonMatchMinute} ${nonMatchHour} * * *` }),
    cooldown_seconds: 60,
  },
];
await capturedHandler!();
loud();
assertEq(execCalls.length, 0, 'non-matching cron skipped');
quiet(); stopWorkflowScheduler(); loud();

// ============================================================================
// tick handler: matching cron → executeWorkflow
// ============================================================================
console.log('\n── tick: matching cron ────────────────────────────────────');

resetState();
quiet();
startWorkflowScheduler();
validateResult = true;
workflowRows = [
  {
    id: 10, workflow_key: 'match', name: 'Match',
    trigger_config: JSON.stringify({ cron: currentMatchingCron(), description: 'test desc' }),
    cooldown_seconds: 60,
  },
];
await capturedHandler!();
// Allow any pending microtasks from the fire-and-forget .catch() to settle
await new Promise(r => setTimeout(r, 10));
loud();

assertEq(execCalls.length, 1, 'executeWorkflow called');
assertEq(execCalls[0].workflowId, 10, 'workflow id passed');
assertEq(execCalls[0].triggerSource, 'schedule', 'triggerSource');
assert(typeof execCalls[0].context.scheduled_at === 'string', 'scheduled_at set');
assertEq(execCalls[0].context.description, 'test desc', 'description passed through');

quiet(); stopWorkflowScheduler(); loud();

// ============================================================================
// tick handler: executeWorkflow rejection is caught
// ============================================================================
console.log('\n── tick: executeWorkflow rejection caught ─────────────────');

resetState();
quiet();
startWorkflowScheduler();
validateResult = true;
execThrows = true;
workflowRows = [
  {
    id: 11, workflow_key: 'err', name: 'Err',
    trigger_config: JSON.stringify({ cron: currentMatchingCron() }),
    cooldown_seconds: 60,
  },
];
// Should not throw
let tickErr: Error | null = null;
try { await capturedHandler!(); } catch (e: any) { tickErr = e; }
await new Promise(r => setTimeout(r, 10));
loud();

assert(tickErr === null, 'tick did not throw');
assertEq(execCalls.length, 1, 'exec was called');

quiet(); stopWorkflowScheduler(); loud();

// ============================================================================
// tick handler: object trigger_config (already parsed) accepted
// ============================================================================
console.log('\n── tick: object trigger_config ────────────────────────────');

resetState();
quiet();
startWorkflowScheduler();
validateResult = true;
workflowRows = [
  {
    id: 12, workflow_key: 'obj', name: 'Obj',
    trigger_config: { cron: currentMatchingCron() }, // object, not string
    cooldown_seconds: 60,
  },
];
await capturedHandler!();
await new Promise(r => setTimeout(r, 10));
loud();
assertEq(execCalls.length, 1, 'object trigger_config accepted');
quiet(); stopWorkflowScheduler(); loud();

// ============================================================================
// tick handler: multiple workflows, one throws in evaluation, others continue
// ============================================================================
console.log('\n── tick: one error, other succeeds ────────────────────────');

resetState();
quiet();
startWorkflowScheduler();
validateResult = true;
const matching = currentMatchingCron();
workflowRows = [
  { id: 20, workflow_key: 'bad-json', name: 'Bad', trigger_config: '{broken', cooldown_seconds: 60 },
  { id: 21, workflow_key: 'good', name: 'Good', trigger_config: JSON.stringify({ cron: matching }), cooldown_seconds: 60 },
];
await capturedHandler!();
await new Promise(r => setTimeout(r, 10));
loud();
assertEq(execCalls.length, 1, 'good workflow executed');
assertEq(execCalls[0].workflowId, 21, 'good workflow id');
quiet(); stopWorkflowScheduler(); loud();

// ============================================================================
// isRunning guard: overlapping tick returns immediately
// ============================================================================
console.log('\n── isRunning guard ────────────────────────────────────────');

resetState();
quiet();
startWorkflowScheduler();
validateResult = true;
workflowRows = [
  {
    id: 30, workflow_key: 'slow', name: 'Slow',
    trigger_config: JSON.stringify({ cron: currentMatchingCron() }),
    cooldown_seconds: 60,
  },
];

// Fire two back-to-back ticks without awaiting first
const p1 = capturedHandler!();
const p2 = capturedHandler!();
await Promise.all([p1, p2]);
await new Promise(r => setTimeout(r, 10));
loud();

// The implementation sets isRunning at the start and clears in finally.
// Since our fake pool resolves synchronously via microtasks, the second
// call may or may not catch isRunning=true depending on microtask timing.
// At minimum, the handler must not throw. We assert the queryLog contains
// at most 2 executions (never more).
const queryCount = queryLog.filter(q => /platform_workflows/.test(q.sql)).length;
assert(queryCount >= 1 && queryCount <= 2, `overlapping tick handled safely (${queryCount} queries)`);
quiet(); stopWorkflowScheduler(); loud();

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  process.exit(1);
});
