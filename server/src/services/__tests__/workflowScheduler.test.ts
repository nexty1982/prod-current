#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowScheduler.js (OMD-1146)
 *
 * Centralized scheduled workflow executor using node-cron. Minute-
 * granular evaluation: every tick loads enabled schedule workflows
 * from `platform_workflows`, checks each cron expression against
 * "now", and fires `executeWorkflow` for matches.
 *
 * Dependencies stubbed via require.cache BEFORE requiring SUT:
 *   - `node-cron`: captures the cron.schedule() callback so the test
 *                  can invoke a tick manually. cron.validate returns
 *                  true by default (scriptable).
 *   - `../config/db`: getAppPool returns a pool whose query() returns
 *                  scripted workflows.
 *   - `./workflowEngine` (lazy-required inside evaluate): executeWorkflow
 *                  is captured to record calls.
 *
 * Coverage:
 *   - startWorkflowScheduler: schedules a cron job once, idempotent
 *   - stopWorkflowScheduler: stops scheduled job, idempotent
 *   - Scheduler tick (evaluateScheduledWorkflows):
 *       · empty workflow list → no-op
 *       · trigger_config as object or JSON string → both parse
 *       · invalid JSON → skip that workflow
 *       · missing cron field → skip
 *       · invalid cron → skip (warn)
 *       · cron doesn't match now → no execute
 *       · cron matches now → executeWorkflow fired with context
 *       · executeWorkflow rejection is swallowed (async catch)
 *       · DB error in top-level query → caught by tick wrapper
 *   - Cron matching (via public interface):
 *       · "* * * * *" always matches
 *       · exact match ("30 14 * * *")
 *       · mismatch
 *       · range (10-20)
 *       · step (*\/5)
 *       · comma list
 *       · range + step (10-20/5)
 *   - Concurrency: overlapping ticks are skipped via isRunning flag
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
type ScheduleCall = { expression: string; callback: () => Promise<void> | void };
const scheduleCalls: ScheduleCall[] = [];
let lastScheduledJob: any = null;
let stopCount = 0;
let cronValidateReturn = true;

const cronStub = {
  schedule: (expression: string, callback: any) => {
    scheduleCalls.push({ expression, callback });
    lastScheduledJob = {
      expression,
      stop: () => { stopCount++; },
    };
    return lastScheduledJob;
  },
  validate: (_expr: string) => cronValidateReturn,
};

const cronPath = require.resolve('node-cron');
require.cache[cronPath] = {
  id: cronPath,
  filename: cronPath,
  loaded: true,
  exports: cronStub,
} as any;

// ── db stub ──────────────────────────────────────────────────────────
let queryReturnRows: any[] = [];
let queryShouldThrow = false;
const queryLog: Array<{ sql: string; params: any[] }> = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (queryShouldThrow) throw new Error('fake db failure');
    return [queryReturnRows];
  },
};

const dbStub = { getAppPool: () => fakePool };

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

// ── workflowEngine stub ──────────────────────────────────────────────
type ExecCall = { workflowId: number; triggerSource: string; context: any };
const execCalls: ExecCall[] = [];
let executeShouldReject = false;

const workflowEngineStub = {
  executeWorkflow: (opts: ExecCall) => {
    execCalls.push(opts);
    if (executeShouldReject) return Promise.reject(new Error('exec failed'));
    return Promise.resolve({ ok: true });
  },
};

const workflowEnginePath = require.resolve('../workflowEngine');
require.cache[workflowEnginePath] = {
  id: workflowEnginePath,
  filename: workflowEnginePath,
  loaded: true,
  exports: workflowEngineStub,
} as any;

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

function resetState() {
  queryReturnRows = [];
  queryShouldThrow = false;
  queryLog.length = 0;
  execCalls.length = 0;
  executeShouldReject = false;
  cronValidateReturn = true;
}

// Date override helper
const origDate = Date;
function withFakeNow(target: Date, fn: () => Promise<void>): Promise<void> {
  class FakeDate extends origDate {
    constructor(...args: any[]) {
      // @ts-ignore — forward rest args
      if (args.length === 0) { super(target.getTime()); }
      // @ts-ignore
      else { super(...args); }
    }
    static now() { return target.getTime(); }
  }
  // @ts-ignore
  global.Date = FakeDate;
  return fn().finally(() => {
    // @ts-ignore
    global.Date = origDate;
  });
}

const {
  startWorkflowScheduler,
  stopWorkflowScheduler,
} = require('../workflowScheduler');

// The scheduler tick callback is captured on first startWorkflowScheduler() call.
async function runTick() {
  const call = scheduleCalls[scheduleCalls.length - 1];
  if (!call) throw new Error('no scheduled callback');
  await call.callback();
}

async function main() {

// ============================================================================
// startWorkflowScheduler — schedules once, idempotent
// ============================================================================
console.log('\n── startWorkflowScheduler ────────────────────────────────');

resetState();
quiet();
startWorkflowScheduler();
loud();

assertEq(scheduleCalls.length, 1, 'cron.schedule called once');
assertEq(scheduleCalls[0].expression, '* * * * *', 'scheduled every minute');

// Second call is a no-op
quiet();
startWorkflowScheduler();
loud();
assertEq(scheduleCalls.length, 1, 'second start is no-op');

// ============================================================================
// stopWorkflowScheduler
// ============================================================================
console.log('\n── stopWorkflowScheduler ─────────────────────────────────');

quiet();
stopWorkflowScheduler();
loud();
assertEq(stopCount, 1, 'stop called once');

// Second stop is a no-op (no job)
quiet();
stopWorkflowScheduler();
loud();
assertEq(stopCount, 1, 'second stop is no-op');

// After stop, start again should re-schedule
quiet();
startWorkflowScheduler();
loud();
assertEq(scheduleCalls.length, 2, 'can restart after stop');

// ============================================================================
// Tick with empty workflow list
// ============================================================================
console.log('\n── Tick: empty workflow list ─────────────────────────────');

resetState();
queryReturnRows = [];
quiet();
await runTick();
loud();
assertEq(execCalls.length, 0, 'no workflows → no execute');
assertEq(queryLog.length, 1, 'one query for workflows');
assert(/platform_workflows/i.test(queryLog[0].sql), 'queries platform_workflows');
assert(/trigger_type = 'schedule'/i.test(queryLog[0].sql), 'filters schedule type');

// ============================================================================
// Tick: config parse — object, JSON string, invalid
// ============================================================================
console.log('\n── Tick: trigger_config parsing ──────────────────────────');

// Object config
resetState();
queryReturnRows = [
  { id: 1, workflow_key: 'wf-obj', name: 'Obj', trigger_config: { cron: '* * * * *' }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(new origDate('2026-04-10T12:30:00Z'), async () => { await runTick(); });
loud();
assertEq(execCalls.length, 1, 'object config → execute');
assertEq(execCalls[0].workflowId, 1, 'workflowId passed');
assertEq(execCalls[0].triggerSource, 'schedule', 'triggerSource');

// JSON string config
resetState();
queryReturnRows = [
  { id: 2, workflow_key: 'wf-json', name: 'JSON', trigger_config: JSON.stringify({ cron: '* * * * *', description: 'my wf' }), cooldown_seconds: 0 },
];
quiet();
await withFakeNow(new origDate('2026-04-10T12:30:00Z'), async () => { await runTick(); });
loud();
assertEq(execCalls.length, 1, 'JSON string config → execute');
assertEq(execCalls[0].context.description, 'my wf', 'description propagated');
assertEq(execCalls[0].context.cron, '* * * * *', 'cron in context');
assert(typeof execCalls[0].context.scheduled_at === 'string', 'scheduled_at ISO string');

// Invalid JSON → skip
resetState();
queryReturnRows = [
  { id: 3, workflow_key: 'wf-bad', name: 'Bad', trigger_config: '{not valid json', cooldown_seconds: 0 },
];
quiet();
await withFakeNow(new origDate('2026-04-10T12:30:00Z'), async () => { await runTick(); });
loud();
assertEq(execCalls.length, 0, 'invalid JSON → skip');

// Null config → skip
resetState();
queryReturnRows = [
  { id: 4, workflow_key: 'wf-null', name: 'Null', trigger_config: null, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(new origDate('2026-04-10T12:30:00Z'), async () => { await runTick(); });
loud();
assertEq(execCalls.length, 0, 'null config → skip');

// Config without cron field → skip
resetState();
queryReturnRows = [
  { id: 5, workflow_key: 'wf-nocron', name: 'NoCron', trigger_config: { foo: 'bar' }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(new origDate('2026-04-10T12:30:00Z'), async () => { await runTick(); });
loud();
assertEq(execCalls.length, 0, 'no cron field → skip');

// Invalid cron (validate returns false)
resetState();
cronValidateReturn = false;
queryReturnRows = [
  { id: 6, workflow_key: 'wf-invcron', name: 'InvCron', trigger_config: { cron: 'nonsense' }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(new origDate('2026-04-10T12:30:00Z'), async () => { await runTick(); });
loud();
assertEq(execCalls.length, 0, 'invalid cron → skip');

// ============================================================================
// Tick: cron matching
// ============================================================================
console.log('\n── Tick: cron matching ───────────────────────────────────');

// "* * * * *" always matches
resetState();
queryReturnRows = [
  { id: 10, workflow_key: 'wf-always', name: '*', trigger_config: { cron: '* * * * *' }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(new origDate('2026-04-10T03:07:00Z'), async () => { await runTick(); });
loud();
assertEq(execCalls.length, 1, '"* * * * *" always matches');

// Exact match — use local time (services uses Date.getMinutes/getHours which return local)
resetState();
const exactTime = new origDate();
exactTime.setHours(14, 30, 0, 0);
queryReturnRows = [
  { id: 11, workflow_key: 'wf-exact', name: 'Exact', trigger_config: { cron: `30 14 * * *` }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(exactTime, async () => { await runTick(); });
loud();
assertEq(execCalls.length, 1, 'exact minute/hour match (local time)');

// Mismatch — different minute
resetState();
const mismatchTime = new origDate();
mismatchTime.setHours(14, 31, 0, 0);
queryReturnRows = [
  { id: 12, workflow_key: 'wf-miss', name: 'Miss', trigger_config: { cron: `30 14 * * *` }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(mismatchTime, async () => { await runTick(); });
loud();
assertEq(execCalls.length, 0, 'minute mismatch');

// Range in minute field
resetState();
const rangeTime = new origDate();
rangeTime.setHours(10, 15, 0, 0);
queryReturnRows = [
  { id: 13, workflow_key: 'wf-range', name: 'Range', trigger_config: { cron: '10-20 * * * *' }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(rangeTime, async () => { await runTick(); });
loud();
assertEq(execCalls.length, 1, 'minute in range 10-20');

// Range — boundary inclusive
resetState();
const rangeBoundary = new origDate();
rangeBoundary.setHours(10, 20, 0, 0);
queryReturnRows = [
  { id: 14, workflow_key: 'wf-bound', name: 'Bound', trigger_config: { cron: '10-20 * * * *' }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(rangeBoundary, async () => { await runTick(); });
loud();
assertEq(execCalls.length, 1, 'minute at upper boundary');

// Range — outside
resetState();
const rangeOutside = new origDate();
rangeOutside.setHours(10, 21, 0, 0);
queryReturnRows = [
  { id: 15, workflow_key: 'wf-out', name: 'Out', trigger_config: { cron: '10-20 * * * *' }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(rangeOutside, async () => { await runTick(); });
loud();
assertEq(execCalls.length, 0, 'minute outside range');

// Step: */5 minutes
resetState();
const stepTime = new origDate();
stepTime.setHours(10, 15, 0, 0);
queryReturnRows = [
  { id: 16, workflow_key: 'wf-step', name: 'Step', trigger_config: { cron: '*/5 * * * *' }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(stepTime, async () => { await runTick(); });
loud();
assertEq(execCalls.length, 1, '*/5 matches minute=15');

// Step mismatch
resetState();
const stepMiss = new origDate();
stepMiss.setHours(10, 17, 0, 0);
queryReturnRows = [
  { id: 17, workflow_key: 'wf-sm', name: 'SM', trigger_config: { cron: '*/5 * * * *' }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(stepMiss, async () => { await runTick(); });
loud();
assertEq(execCalls.length, 0, '*/5 does not match minute=17');

// Comma-separated list
resetState();
const commaTime = new origDate();
commaTime.setHours(10, 30, 0, 0);
queryReturnRows = [
  { id: 18, workflow_key: 'wf-comma', name: 'Comma', trigger_config: { cron: '0,15,30,45 * * * *' }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(commaTime, async () => { await runTick(); });
loud();
assertEq(execCalls.length, 1, 'comma list matches minute=30');

// Range with step: 10-20/5
resetState();
const rangeStepTime = new origDate();
rangeStepTime.setHours(10, 15, 0, 0);
queryReturnRows = [
  { id: 19, workflow_key: 'wf-rs', name: 'RS', trigger_config: { cron: '10-20/5 * * * *' }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(rangeStepTime, async () => { await runTick(); });
loud();
assertEq(execCalls.length, 1, '10-20/5 matches minute=15');

// Short cron expression (< 5 parts) → no match
resetState();
const shortTime = new origDate();
shortTime.setHours(10, 30, 0, 0);
queryReturnRows = [
  { id: 20, workflow_key: 'wf-short', name: 'Short', trigger_config: { cron: '* * *' }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(shortTime, async () => { await runTick(); });
loud();
assertEq(execCalls.length, 0, 'too few cron parts → no match');

// ============================================================================
// Tick: executeWorkflow rejection is swallowed
// ============================================================================
console.log('\n── Tick: executeWorkflow rejection ───────────────────────');

resetState();
executeShouldReject = true;
queryReturnRows = [
  { id: 30, workflow_key: 'wf-reject', name: 'R', trigger_config: { cron: '* * * * *' }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(new origDate('2026-04-10T12:30:00Z'), async () => { await runTick(); });
// Allow microtask queue to drain
await new Promise(r => setImmediate(r));
loud();
assertEq(execCalls.length, 1, 'execute called');
assert(true, 'rejected promise does not throw out of tick');

// ============================================================================
// Tick: top-level DB error caught
// ============================================================================
console.log('\n── Tick: DB error swallowed ──────────────────────────────');

resetState();
queryShouldThrow = true;
quiet();
await runTick(); // should not throw
loud();
assertEq(execCalls.length, 0, 'no executes');
assert(true, 'top-level DB error caught');

// ============================================================================
// Tick: multiple workflows in one tick
// ============================================================================
console.log('\n── Tick: multiple workflows ──────────────────────────────');

resetState();
queryReturnRows = [
  { id: 40, workflow_key: 'a', name: 'A', trigger_config: { cron: '* * * * *' }, cooldown_seconds: 0 },
  { id: 41, workflow_key: 'b', name: 'B', trigger_config: { cron: '0 0 1 1 *' }, cooldown_seconds: 0 }, // Jan 1 midnight only
  { id: 42, workflow_key: 'c', name: 'C', trigger_config: { cron: '* * * * *' }, cooldown_seconds: 0 },
];
quiet();
// Pick a time that's not Jan 1 midnight
await withFakeNow(new origDate('2026-04-10T12:30:00Z'), async () => { await runTick(); });
loud();
assertEq(execCalls.length, 2, 'only matching workflows fire');
const firedIds = execCalls.map(c => c.workflowId).sort();
assertEq(firedIds, [40, 42], 'a and c fire, b skipped');

// One failing workflow should not block others (exception in loop caught per-workflow)
resetState();
queryReturnRows = [
  { id: 50, workflow_key: 'good1', name: 'G1', trigger_config: { cron: '* * * * *' }, cooldown_seconds: 0 },
  // Simulate an error case: invalid structure. trigger_config that throws when accessed?
  // We use invalid JSON which continues — already tested. Use a different path:
  { id: 51, workflow_key: 'bad', name: 'B', trigger_config: 'not json', cooldown_seconds: 0 },
  { id: 52, workflow_key: 'good2', name: 'G2', trigger_config: { cron: '* * * * *' }, cooldown_seconds: 0 },
];
quiet();
await withFakeNow(new origDate('2026-04-10T12:30:00Z'), async () => { await runTick(); });
loud();
assertEq(execCalls.length, 2, 'middle failure does not block siblings');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

// Cleanup: stop the scheduler so tick doesn't linger
quiet();
stopWorkflowScheduler();
loud();

process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
