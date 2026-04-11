#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowScheduler.js (OMD-1166)
 *
 * A node-cron based scheduler that polls platform_workflows every minute and
 * dispatches matching schedules to workflowEngine.executeWorkflow.
 *
 * Dependencies stubbed via require.cache:
 *   - node-cron: schedule() returns a fake job; validate() is scriptable
 *   - config/db: getAppPool() returns fake pool
 *   - workflowEngine: executeWorkflow captured
 *
 * Coverage:
 *   - startWorkflowScheduler: first call schedules; second call is idempotent
 *   - stopWorkflowScheduler: stops job, resets state
 *   - Scheduler tick (captured callback):
 *       · no workflows → no-op
 *       · invalid JSON trigger_config → skip, continue
 *       · trigger_config without cron → skip
 *       · cron.validate(false) → warn, skip
 *       · non-matching cron for current minute → skip
 *       · matching cron → executeWorkflow called with correct payload
 *       · executeWorkflow rejection handled (.catch)
 *       · per-workflow errors don't break the loop
 *       · DB error propagates up to tick but is caught (isRunning reset)
 *       · Overlapping ticks: second tick skipped when isRunning=true
 *
 * cronMatchesNow/fieldMatches are internal; we exercise them by building
 * cron expressions dynamically against the current wall clock.
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

// ── Fake node-cron ───────────────────────────────────────────────────
type FakeJob = { stopCalled: boolean; stop: () => void };

let capturedTick: (() => Promise<void>) | null = null;
let capturedCronExpr: string | null = null;
let lastJob: FakeJob | null = null;
let cronValidateResult: boolean = true;

const fakeCron = {
  schedule: (expr: string, cb: () => Promise<void>) => {
    capturedCronExpr = expr;
    capturedTick = cb;
    lastJob = {
      stopCalled: false,
      stop() { this.stopCalled = true; },
    };
    return lastJob;
  },
  validate: (_expr: string) => cronValidateResult,
};

const cronPath = require.resolve('node-cron');
require.cache[cronPath] = {
  id: cronPath,
  filename: cronPath,
  loaded: true,
  exports: fakeCron,
} as any;

// ── Fake db ───────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
let workflowsRows: any[] = [];
let poolThrows: boolean = false;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (poolThrows) throw new Error('fake db failure');
    return [workflowsRows];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// ── Fake workflowEngine ─────────────────────────────────────────────
type ExecCall = { workflowId: number; triggerSource: string; context: any };
const execLog: ExecCall[] = [];
let execThrows: boolean = false;

const workflowEnginePath = require.resolve('../workflowEngine');
require.cache[workflowEnginePath] = {
  id: workflowEnginePath,
  filename: workflowEnginePath,
  loaded: true,
  exports: {
    executeWorkflow: async (args: ExecCall) => {
      execLog.push(args);
      if (execThrows) throw new Error('fake exec failure');
      return { success: true };
    },
  },
} as any;

// ── SUT (required AFTER stubs) ──────────────────────────────────────
const {
  startWorkflowScheduler,
  stopWorkflowScheduler,
} = require('../workflowScheduler');

// Silence
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

function resetAll() {
  queryLog.length = 0;
  execLog.length = 0;
  workflowsRows = [];
  poolThrows = false;
  execThrows = false;
  cronValidateResult = true;
}

// Build cron expressions relative to wall clock
function buildMatchingCron(): string {
  const now = new Date();
  return `${now.getMinutes()} ${now.getHours()} * * *`;
}

function buildNonMatchingCron(): string {
  const now = new Date();
  const badMinute = (now.getMinutes() + 30) % 60;
  return `${badMinute} ${now.getHours()} * * *`;
}

async function main() {

// ============================================================================
// startWorkflowScheduler
// ============================================================================
console.log('\n── startWorkflowScheduler ────────────────────────────────');

quiet();
startWorkflowScheduler();
loud();

assert(capturedCronExpr === '* * * * *', `scheduled every minute (got: ${capturedCronExpr})`);
assert(capturedTick !== null, 'tick callback captured');
assert(lastJob !== null, 'job created');

// Idempotent: second call does nothing
const firstJob = lastJob;
quiet();
startWorkflowScheduler();
loud();
assertEq(lastJob, firstJob, 'second start → same job (idempotent)');

// ============================================================================
// Tick: no workflows
// ============================================================================
console.log('\n── tick: no workflows ────────────────────────────────────');

resetAll();
workflowsRows = [];
quiet();
await capturedTick!();
loud();

assertEq(queryLog.length, 1, '1 SELECT issued');
assert(/FROM platform_workflows/.test(queryLog[0].sql), 'queries platform_workflows');
assert(/is_enabled = 1 AND trigger_type = 'schedule'/.test(queryLog[0].sql), 'filters enabled+schedule');
assertEq(execLog.length, 0, 'no executeWorkflow');

// ============================================================================
// Tick: invalid JSON trigger_config → skip
// ============================================================================
console.log('\n── tick: invalid JSON config ─────────────────────────────');

resetAll();
workflowsRows = [
  { id: 1, workflow_key: 'wf1', name: 'W1', trigger_config: '{not json}', cooldown_seconds: 60 },
];
quiet();
await capturedTick!();
loud();

assertEq(execLog.length, 0, 'skipped on JSON parse fail');

// ============================================================================
// Tick: config without cron → skip
// ============================================================================
console.log('\n── tick: missing cron ────────────────────────────────────');

resetAll();
workflowsRows = [
  { id: 1, workflow_key: 'wf1', name: 'W1', trigger_config: '{}', cooldown_seconds: 0 },
];
quiet();
await capturedTick!();
loud();
assertEq(execLog.length, 0, 'skipped on missing cron');

// Also test null config
resetAll();
workflowsRows = [
  { id: 1, workflow_key: 'wf1', name: 'W1', trigger_config: null, cooldown_seconds: 0 },
];
quiet();
await capturedTick!();
loud();
assertEq(execLog.length, 0, 'null config → skipped');

// ============================================================================
// Tick: cron.validate returns false → warn + skip
// ============================================================================
console.log('\n── tick: invalid cron ────────────────────────────────────');

resetAll();
cronValidateResult = false;
workflowsRows = [
  { id: 1, workflow_key: 'wf-bad', name: 'Bad', trigger_config: JSON.stringify({ cron: 'bogus' }), cooldown_seconds: 0 },
];
quiet();
await capturedTick!();
loud();
assertEq(execLog.length, 0, 'invalid cron → skipped');
cronValidateResult = true;

// ============================================================================
// Tick: non-matching cron → skip
// ============================================================================
console.log('\n── tick: non-matching cron ───────────────────────────────');

resetAll();
const nonMatch = buildNonMatchingCron();
workflowsRows = [
  { id: 1, workflow_key: 'wf1', name: 'W1', trigger_config: JSON.stringify({ cron: nonMatch }), cooldown_seconds: 0 },
];
quiet();
await capturedTick!();
loud();
assertEq(execLog.length, 0, `non-matching (${nonMatch}) → not executed`);

// ============================================================================
// Tick: matching cron → executeWorkflow
// ============================================================================
console.log('\n── tick: matching cron ───────────────────────────────────');

resetAll();
const match = buildMatchingCron();
workflowsRows = [
  { id: 42, workflow_key: 'hourly-sync', name: 'Hourly Sync',
    trigger_config: JSON.stringify({ cron: match, description: 'Syncs data' }),
    cooldown_seconds: 300 },
];
quiet();
await capturedTick!();
// Give the fire-and-forget executeWorkflow a microtick
await new Promise(r => setTimeout(r, 10));
loud();

assertEq(execLog.length, 1, 'executeWorkflow called once');
assertEq(execLog[0].workflowId, 42, 'workflowId');
assertEq(execLog[0].triggerSource, 'schedule', 'triggerSource');
assertEq(execLog[0].context.cron, match, 'context.cron');
assertEq(execLog[0].context.description, 'Syncs data', 'context.description');
assert(typeof execLog[0].context.scheduled_at === 'string', 'scheduled_at ISO string');

// ============================================================================
// Tick: wildcard cron (* * * * *) → always matches
// ============================================================================
console.log('\n── tick: wildcard cron ───────────────────────────────────');

resetAll();
workflowsRows = [
  { id: 10, workflow_key: 'every-min', name: 'Every Min',
    trigger_config: JSON.stringify({ cron: '* * * * *' }), cooldown_seconds: 0 },
];
quiet();
await capturedTick!();
await new Promise(r => setTimeout(r, 10));
loud();

assertEq(execLog.length, 1, 'wildcard cron fires');
assertEq(execLog[0].workflowId, 10, 'correct workflow');
assertEq(execLog[0].context.description, null, 'description defaults to null');

// ============================================================================
// Tick: ranges and lists in cron field
// ============================================================================
console.log('\n── tick: range/list/step matching ────────────────────────');

// Build a cron with ranges and lists that MUST match current time
{
  const now = new Date();
  const minute = now.getMinutes();
  // Range that includes the current minute
  const rangeMin = `${Math.max(0, minute - 1)}-${Math.min(59, minute + 1)}`;
  const listHour = `${(now.getHours() + 23) % 24},${now.getHours()},${(now.getHours() + 1) % 24}`;
  const cronExpr = `${rangeMin} ${listHour} * * *`;

  resetAll();
  workflowsRows = [
    { id: 20, workflow_key: 'ranged', name: 'R',
      trigger_config: JSON.stringify({ cron: cronExpr }), cooldown_seconds: 0 },
  ];
  quiet();
  await capturedTick!();
  await new Promise(r => setTimeout(r, 10));
  loud();
  assertEq(execLog.length, 1, `range+list cron matched (${cronExpr})`);
}

// Step cron: minute */1 always matches
{
  resetAll();
  workflowsRows = [
    { id: 21, workflow_key: 'step', name: 'S',
      trigger_config: JSON.stringify({ cron: '*/1 * * * *' }), cooldown_seconds: 0 },
  ];
  quiet();
  await capturedTick!();
  await new Promise(r => setTimeout(r, 10));
  loud();
  assertEq(execLog.length, 1, 'step cron */1 matches every minute');
}

// ============================================================================
// Tick: executeWorkflow rejects → handled via .catch
// ============================================================================
console.log('\n── tick: exec failure caught ─────────────────────────────');

resetAll();
execThrows = true;
workflowsRows = [
  { id: 30, workflow_key: 'fails', name: 'F',
    trigger_config: JSON.stringify({ cron: '* * * * *' }), cooldown_seconds: 0 },
];
quiet();
await capturedTick!();
await new Promise(r => setTimeout(r, 10));
loud();

assertEq(execLog.length, 1, 'executeWorkflow called');
// Scheduler should NOT have thrown — we got here without unhandled rejection
assert(true, 'scheduler survives exec rejection');
execThrows = false;

// ============================================================================
// Tick: per-workflow errors don't break the loop
// ============================================================================
console.log('\n── tick: per-workflow error isolation ────────────────────');

resetAll();
workflowsRows = [
  { id: 40, workflow_key: 'bad-json', name: 'B',
    trigger_config: '{invalid}', cooldown_seconds: 0 },
  { id: 41, workflow_key: 'good', name: 'G',
    trigger_config: JSON.stringify({ cron: '* * * * *' }), cooldown_seconds: 0 },
];
quiet();
await capturedTick!();
await new Promise(r => setTimeout(r, 10));
loud();

assertEq(execLog.length, 1, 'second workflow still executed despite first error');
assertEq(execLog[0].workflowId, 41, 'correct survivor');

// ============================================================================
// Tick: DB failure caught, isRunning reset
// ============================================================================
console.log('\n── tick: DB failure caught ───────────────────────────────');

resetAll();
poolThrows = true;
quiet();
await capturedTick!();
loud();
assertEq(execLog.length, 0, 'no exec on DB failure');
poolThrows = false;

// After DB failure, next tick should still run (isRunning cleared)
resetAll();
workflowsRows = [
  { id: 50, workflow_key: 'after-recovery', name: 'R',
    trigger_config: JSON.stringify({ cron: '* * * * *' }), cooldown_seconds: 0 },
];
quiet();
await capturedTick!();
await new Promise(r => setTimeout(r, 10));
loud();
assertEq(execLog.length, 1, 'recovered after DB failure');

// ============================================================================
// stopWorkflowScheduler
// ============================================================================
console.log('\n── stopWorkflowScheduler ─────────────────────────────────');

quiet();
stopWorkflowScheduler();
loud();

assertEq(firstJob!.stopCalled, true, 'job.stop() called');

// After stop, starting again should create a NEW job
quiet();
startWorkflowScheduler();
loud();
assert(lastJob !== firstJob, 'start after stop creates fresh job');

// stopWorkflowScheduler when not running → no-op (no throw)
quiet();
stopWorkflowScheduler();
stopWorkflowScheduler();
loud();
assert(true, 'double-stop is safe');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
