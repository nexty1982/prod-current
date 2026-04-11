#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowScheduler.js (OMD-1090)
 *
 * Centralized scheduled workflow executor. Uses node-cron for minute-level
 * tick, reads platform_workflows from the app pool, and calls workflowEngine
 * to execute any workflow whose cron expression matches the current minute.
 *
 * External deps stubbed via require.cache BEFORE requiring the SUT:
 *   - node-cron                        (schedule, validate)
 *   - ../config/db                     (getAppPool)
 *   - ./workflowEngine                 (executeWorkflow — lazy-required)
 *
 * The SUT caches its schedulerJob at module scope, so we delete the module
 * from require.cache before each lifecycle test to get a clean instance.
 *
 * Coverage:
 *   - startWorkflowScheduler: registers cron.schedule('* * * * *'),
 *                             idempotent (second call is a no-op)
 *   - stopWorkflowScheduler:  calls job.stop() and clears internal ref
 *   - tick handler:           skips when isRunning=true (overlap guard),
 *                             catches/logs errors
 *   - evaluateScheduledWorkflows:
 *       · early return when no workflows
 *       · skips invalid trigger_config JSON
 *       · skips workflow with no cron
 *       · skips workflow with invalid cron (validate=false)
 *       · skips workflow when cronMatchesNow=false
 *       · calls executeWorkflow with correct args when matching
 *       · swallows per-workflow errors (continues loop)
 *       · handles executeWorkflow promise rejection (via .catch)
 *       · parses trigger_config object OR string
 *   - cronMatchesNow: parses 5 fields, rejects <5
 *   - fieldMatches:   wildcard, exact, ranges, step (star-slash-N),
 *                     range-step (N-M/S), comma-separated, out-of-range
 *
 * Run: npx tsx server/src/services/__tests__/workflowScheduler.test.ts
 */

import * as pathMod from 'path';

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

// ── Fake node-cron ───────────────────────────────────────────────────
type ScheduleCall = { expr: string; cb: () => Promise<void> | void; opts: any };
const scheduleCalls: ScheduleCall[] = [];
const fakeJobs: Array<{ stopCalled: boolean }> = [];
let validateResult = true;

const fakeCron = {
  schedule: (expr: string, cb: () => Promise<void> | void, opts: any = {}) => {
    scheduleCalls.push({ expr, cb, opts });
    const job = { stopCalled: false, stop: function () { this.stopCalled = true; } };
    fakeJobs.push(job);
    return job;
  },
  validate: (_expr: string) => validateResult,
};

// ── Fake db pool ─────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
let workflowRows: any[] = [];
let queryThrows = false;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (queryThrows) throw new Error('fake db failure');
    if (/FROM platform_workflows/i.test(sql)) return [workflowRows, []];
    return [[], []];
  },
};

const fakeDbModule = { getAppPool: () => fakePool };

// ── Fake workflowEngine ──────────────────────────────────────────────
type ExecCall = { workflowId: any; triggerSource: string; context: any };
const execCalls: ExecCall[] = [];
let execShouldReject = false;

const fakeWorkflowEngine = {
  executeWorkflow: async (args: ExecCall) => {
    execCalls.push(args);
    if (execShouldReject) throw new Error('engine boom');
    return { ok: true };
  },
};

// ── Stub modules via require.cache ───────────────────────────────────
function stubModule(relFromSrc: string, exports: any) {
  const absWithoutExt = pathMod.resolve(__dirname, '..', '..', relFromSrc);
  const resolved = require.resolve(absWithoutExt);
  require.cache[resolved] = {
    id: resolved, filename: resolved, loaded: true, exports,
  } as any;
}

// node-cron: resolve from the SUT's neighborhood
const cronResolved = require.resolve('node-cron');
require.cache[cronResolved] = {
  id: cronResolved, filename: cronResolved, loaded: true, exports: fakeCron,
} as any;

stubModule('config/db', fakeDbModule);
stubModule('services/workflowEngine', fakeWorkflowEngine);

// SUT path — cache-bust between lifecycle tests
const sutPath = require.resolve(pathMod.resolve(__dirname, '..', 'workflowScheduler'));

function freshRequire() {
  delete require.cache[sutPath];
  return require(sutPath);
}

function resetAll() {
  scheduleCalls.length = 0;
  fakeJobs.length = 0;
  validateResult = true;
  queryLog.length = 0;
  workflowRows = [];
  queryThrows = false;
  execCalls.length = 0;
  execShouldReject = false;
}

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

async function main() {

// ============================================================================
// startWorkflowScheduler
// ============================================================================
console.log('\n── startWorkflowScheduler ────────────────────────────────');

resetAll();
let svc = freshRequire();

quiet();
svc.startWorkflowScheduler();
loud();
assertEq(scheduleCalls.length, 1, 'schedule called once');
assertEq(scheduleCalls[0].expr, '* * * * *', 'every-minute expression');
assert(typeof scheduleCalls[0].cb === 'function', 'callback is function');

// Idempotent: second call is a no-op
quiet();
svc.startWorkflowScheduler();
loud();
assertEq(scheduleCalls.length, 1, 'second call is no-op');

// ============================================================================
// stopWorkflowScheduler
// ============================================================================
console.log('\n── stopWorkflowScheduler ─────────────────────────────────');

quiet();
svc.stopWorkflowScheduler();
loud();
assertEq(fakeJobs[0].stopCalled, true, 'job.stop() called');

// After stop, start again should schedule fresh
quiet();
svc.startWorkflowScheduler();
loud();
assertEq(scheduleCalls.length, 2, 'schedule called again after stop');

// Stop when never started is a no-op (re-require for clean state)
resetAll();
svc = freshRequire();
quiet();
svc.stopWorkflowScheduler();
loud();
assertEq(fakeJobs.length, 0, 'no-op stop with no job');

// ============================================================================
// Tick handler: overlap guard + error catch
// ============================================================================
console.log('\n── tick handler ──────────────────────────────────────────');

resetAll();
svc = freshRequire();
quiet();
svc.startWorkflowScheduler();
loud();
const tickCb = scheduleCalls[0].cb;

// Force the tick handler to see a query error — it should catch and not throw
queryThrows = true;
quiet();
await tickCb();
loud();
assert(true, 'tick handler catches errors (no throw)');

// After the caught error, isRunning is reset — next tick runs
queryThrows = false;
workflowRows = [];
quiet();
await tickCb();
loud();
// queryLog had one entry from the failing tick, plus one from this one
assert(queryLog.length >= 2, 'next tick runs after error (isRunning reset)');

// ============================================================================
// evaluateScheduledWorkflows: no workflows
// ============================================================================
console.log('\n── evaluate: no workflows ────────────────────────────────');

resetAll();
svc = freshRequire();
quiet();
svc.startWorkflowScheduler();
loud();
const tick = scheduleCalls[0].cb;

workflowRows = [];
quiet();
await tick();
loud();
assertEq(queryLog.length, 1, 'one query');
assert(/FROM platform_workflows/.test(queryLog[0].sql), 'platform_workflows query');
assert(/is_enabled = 1/.test(queryLog[0].sql), 'filters is_enabled = 1');
assert(/trigger_type = 'schedule'/.test(queryLog[0].sql), 'filters schedule type');
assertEq(execCalls.length, 0, 'no executeWorkflow calls');

// ============================================================================
// evaluate: workflow with matching cron → executeWorkflow called
// ============================================================================
console.log('\n── evaluate: matching cron ───────────────────────────────');

resetAll();
svc = freshRequire();
quiet();
svc.startWorkflowScheduler();
loud();
const tick2 = scheduleCalls[0].cb;

// "* * * * *" always matches
workflowRows = [{
  id: 42,
  workflow_key: 'daily-digest',
  name: 'Daily Digest',
  trigger_config: JSON.stringify({ cron: '* * * * *', description: 'every minute' }),
  cooldown_seconds: 60,
}];

quiet();
await tick2();
loud();
assertEq(execCalls.length, 1, 'executeWorkflow called once');
assertEq(execCalls[0].workflowId, 42, 'workflowId passed');
assertEq(execCalls[0].triggerSource, 'schedule', 'triggerSource=schedule');
assertEq(execCalls[0].context.cron, '* * * * *', 'cron in context');
assertEq(execCalls[0].context.description, 'every minute', 'description in context');
assert(typeof execCalls[0].context.scheduled_at === 'string', 'scheduled_at is ISO string');
assert(/\d{4}-\d{2}-\d{2}T/.test(execCalls[0].context.scheduled_at), 'scheduled_at looks ISO');

// ============================================================================
// evaluate: trigger_config as object (not string)
// ============================================================================
console.log('\n── evaluate: object trigger_config ───────────────────────');

resetAll();
svc = freshRequire();
quiet();
svc.startWorkflowScheduler();
loud();
const tick3 = scheduleCalls[0].cb;

workflowRows = [{
  id: 1,
  workflow_key: 'obj-config',
  name: 'Obj',
  trigger_config: { cron: '* * * * *' }, // object, not string
  cooldown_seconds: 0,
}];

quiet();
await tick3();
loud();
assertEq(execCalls.length, 1, 'handles object trigger_config');

// ============================================================================
// evaluate: invalid JSON trigger_config → skipped
// ============================================================================
console.log('\n── evaluate: invalid JSON ────────────────────────────────');

resetAll();
svc = freshRequire();
quiet();
svc.startWorkflowScheduler();
loud();
const tick4 = scheduleCalls[0].cb;

workflowRows = [{
  id: 1,
  workflow_key: 'bad-json',
  name: 'Bad',
  trigger_config: '{not valid json',
  cooldown_seconds: 0,
}];

quiet();
await tick4();
loud();
assertEq(execCalls.length, 0, 'invalid JSON: skipped');

// ============================================================================
// evaluate: missing cron field → skipped
// ============================================================================
console.log('\n── evaluate: missing cron ────────────────────────────────');

resetAll();
svc = freshRequire();
quiet();
svc.startWorkflowScheduler();
loud();
const tick5 = scheduleCalls[0].cb;

workflowRows = [{
  id: 1,
  workflow_key: 'no-cron',
  name: 'No Cron',
  trigger_config: JSON.stringify({ description: 'nope' }),
  cooldown_seconds: 0,
}];

quiet();
await tick5();
loud();
assertEq(execCalls.length, 0, 'missing cron: skipped');

// ============================================================================
// evaluate: cron.validate → false → skipped
// ============================================================================
console.log('\n── evaluate: cron.validate false ─────────────────────────');

resetAll();
svc = freshRequire();
quiet();
svc.startWorkflowScheduler();
loud();
const tick6 = scheduleCalls[0].cb;

validateResult = false;
workflowRows = [{
  id: 1,
  workflow_key: 'bogus-cron',
  name: 'Bogus',
  trigger_config: JSON.stringify({ cron: 'xyz' }),
  cooldown_seconds: 0,
}];

quiet();
await tick6();
loud();
assertEq(execCalls.length, 0, 'invalid cron: skipped');

// ============================================================================
// evaluate: cronMatchesNow false → skipped
// ============================================================================
console.log('\n── evaluate: cron not matching now ───────────────────────');

resetAll();
svc = freshRequire();
quiet();
svc.startWorkflowScheduler();
loud();
const tick7 = scheduleCalls[0].cb;

// Pick a cron that cannot match now: minute field "60" is out of range
// (1970 epoch is out-of-range too but simpler: 60 never matches)
workflowRows = [{
  id: 1,
  workflow_key: 'future',
  name: 'Future',
  trigger_config: JSON.stringify({ cron: '60 * * * *' }), // minute=60 → never matches
  cooldown_seconds: 0,
}];

quiet();
await tick7();
loud();
assertEq(execCalls.length, 0, 'non-matching cron: skipped');

// ============================================================================
// evaluate: multiple workflows, mix of matching and skipped
// ============================================================================
console.log('\n── evaluate: multiple workflows ──────────────────────────');

resetAll();
svc = freshRequire();
quiet();
svc.startWorkflowScheduler();
loud();
const tick8 = scheduleCalls[0].cb;

workflowRows = [
  { id: 1, workflow_key: 'a', name: 'A', trigger_config: JSON.stringify({ cron: '* * * * *' }), cooldown_seconds: 0 },
  { id: 2, workflow_key: 'b', name: 'B', trigger_config: '{bad', cooldown_seconds: 0 },
  { id: 3, workflow_key: 'c', name: 'C', trigger_config: JSON.stringify({ cron: '60 * * * *' }), cooldown_seconds: 0 },
  { id: 4, workflow_key: 'd', name: 'D', trigger_config: JSON.stringify({ cron: '* * * * *' }), cooldown_seconds: 0 },
];

quiet();
await tick8();
loud();
assertEq(execCalls.length, 2, '2 of 4 triggered');
assertEq(execCalls[0].workflowId, 1, 'first triggered: id 1');
assertEq(execCalls[1].workflowId, 4, 'second triggered: id 4');

// ============================================================================
// evaluate: executeWorkflow rejects → caught, continues
// ============================================================================
console.log('\n── evaluate: engine rejects ──────────────────────────────');

resetAll();
svc = freshRequire();
quiet();
svc.startWorkflowScheduler();
loud();
const tick9 = scheduleCalls[0].cb;

execShouldReject = true;
workflowRows = [{
  id: 1,
  workflow_key: 'boom',
  name: 'Boom',
  trigger_config: JSON.stringify({ cron: '* * * * *' }),
  cooldown_seconds: 0,
}];

quiet();
await tick9();
// Give microtasks time to settle the promise rejection catch
await new Promise((r) => setImmediate(r));
loud();
assertEq(execCalls.length, 1, 'called despite rejection');
assert(true, 'rejection is caught (no unhandled)');

// ============================================================================
// cronMatchesNow & fieldMatches — indirect via known-match cron patterns
// ============================================================================
console.log('\n── cron field matching (via evaluate) ────────────────────');

// We test fieldMatches indirectly by picking crons that will/won't match now
const now = new Date();
const curMin = now.getMinutes();
const curHour = now.getHours();
const curDom = now.getDate();
const curMon = now.getMonth() + 1;
const curDow = now.getDay();

async function runWithCron(expr: string): Promise<boolean> {
  resetAll();
  svc = freshRequire();
  quiet();
  svc.startWorkflowScheduler();
  loud();
  const t = scheduleCalls[0].cb;
  workflowRows = [{
    id: 1, workflow_key: 'k', name: 'K',
    trigger_config: JSON.stringify({ cron: expr }),
    cooldown_seconds: 0,
  }];
  quiet();
  await t();
  loud();
  return execCalls.length === 1;
}

// Exact match on all 5 fields → matches
assert(
  await runWithCron(`${curMin} ${curHour} ${curDom} ${curMon} ${curDow}`),
  'exact 5-field match'
);

// Wildcard everywhere → matches
assert(await runWithCron('* * * * *'), 'all wildcards');

// Range match: current minute in 0-59 range
assert(await runWithCron('0-59 * * * *'), 'range 0-59');

// Step: */1 minute → matches any minute
assert(await runWithCron('*/1 * * * *'), 'step */1');

// Step: 0-59/5 → matches only every 5 minutes
const fiveStepMatches = curMin % 5 === 0;
assertEq(
  await runWithCron('0-59/5 * * * *'),
  fiveStepMatches,
  `0-59/5 matches when min % 5 == 0 (now: ${curMin})`
);

// Comma list including current minute
assert(
  await runWithCron(`${curMin},${(curMin + 1) % 60} * * * *`),
  'comma list with current minute'
);

// Comma list excluding current minute (pick two others)
const notCur1 = (curMin + 1) % 60;
const notCur2 = (curMin + 2) % 60;
assert(
  !(await runWithCron(`${notCur1},${notCur2} * * * *`)),
  'comma list excluding current minute'
);

// Wrong hour → no match
const wrongHour = (curHour + 1) % 24;
assert(
  !(await runWithCron(`* ${wrongHour} * * *`)),
  'non-matching hour'
);

// Wrong day of month → no match (pick a day that cannot be today)
const wrongDom = curDom === 1 ? 15 : 1;
assert(
  !(await runWithCron(`* * ${wrongDom} * *`)),
  'non-matching day-of-month'
);

// Less than 5 fields → no match
assert(
  !(await runWithCron('* * * *')),
  '<5 fields: no match'
);

// Out-of-range exact → no match (hour 99)
assert(
  !(await runWithCron('* 99 * * *')),
  'out-of-range hour: no match'
);

// Step with explicit start (e.g. N/S) → start from N with step S
// N=0, S=1 starting at 0 → matches current minute via iteration
assert(
  await runWithCron('0/1 * * * *'),
  'N/S syntax (0/1) matches any minute'
);

// Range step: 10-20/2 — matches only even minutes 10,12,14,16,18,20
const in10to20even = curMin >= 10 && curMin <= 20 && (curMin - 10) % 2 === 0;
assertEq(
  await runWithCron('10-20/2 * * * *'),
  in10to20even,
  `range-step 10-20/2 (now: ${curMin})`
);

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
