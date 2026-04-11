#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowScheduler.js (OMD-996)
 *
 * Exports: startWorkflowScheduler, stopWorkflowScheduler
 *
 * We stub:
 *   - `node-cron` to capture the tick callback set by startWorkflowScheduler
 *   - `../config/db` to supply a fake pool
 *   - `./workflowEngine` to capture executeWorkflow calls
 *
 * By capturing the tick callback we can trigger it at will and indirectly
 * exercise evaluateScheduledWorkflows + cronMatchesNow + fieldMatches.
 *
 * Run from server/: npx tsx src/services/__tests__/workflowScheduler.test.ts
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

// ── node-cron stub ────────────────────────────────────────────────────
let lastScheduleExpr: string | null = null;
let lastScheduleCb: (() => Promise<void> | void) | null = null;
let cronStopCount = 0;
const fakeTask = {
  stop: () => { cronStopCount++; },
};
const cronStub = {
  schedule: (expr: string, cb: () => Promise<void> | void) => {
    lastScheduleExpr = expr;
    lastScheduleCb = cb;
    return fakeTask;
  },
  validate: (expr: string) => {
    // Accept any 5-field expression that isn't literally "invalid"
    return expr !== 'invalid' && expr.trim().split(/\s+/).length >= 5;
  },
};
const cronPath = require.resolve('node-cron');
require.cache[cronPath] = {
  id: cronPath,
  filename: cronPath,
  loaded: true,
  exports: cronStub,
} as any;

// ── ../config/db stub ─────────────────────────────────────────────────
type QCall = { sql: string; params: any[] };
let qCalls: QCall[] = [];
let nextRows: any[] = [];
let poolThrows = false;
const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    qCalls.push({ sql, params });
    if (poolThrows) throw new Error('db down');
    return [nextRows, {}];
  },
};
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// ── ./workflowEngine stub ─────────────────────────────────────────────
type ExecCall = { workflowId: number; triggerSource: string; context: any };
let execCalls: ExecCall[] = [];
let execShouldReject = false;
const engineStub = {
  executeWorkflow: async (opts: ExecCall) => {
    execCalls.push(opts);
    if (execShouldReject) throw new Error('execution failed');
    return { success: true };
  },
};
const enginePath = require.resolve('../workflowEngine');
require.cache[enginePath] = {
  id: enginePath,
  filename: enginePath,
  loaded: true,
  exports: engineStub,
} as any;

const {
  startWorkflowScheduler,
  stopWorkflowScheduler,
} = require('../workflowScheduler');

// Silence logs
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;
function quiet() { console.log = () => {}; console.error = () => {}; console.warn = () => {}; }
function loud() { console.log = origLog; console.error = origError; console.warn = origWarn; }

function resetState() {
  lastScheduleExpr = null;
  lastScheduleCb = null;
  cronStopCount = 0;
  qCalls = [];
  nextRows = [];
  poolThrows = false;
  execCalls = [];
  execShouldReject = false;
}

/**
 * Build a cron expression that is guaranteed to match the *current* minute.
 * This is the simplest way to verify the scheduler would fire a workflow.
 */
function nowCron(): string {
  const now = new Date();
  return `${now.getMinutes()} ${now.getHours()} ${now.getDate()} ${now.getMonth() + 1} *`;
}

/**
 * Build a cron expression guaranteed NOT to match the current minute.
 */
function neverNowCron(): string {
  const now = new Date();
  const wrongMinute = (now.getMinutes() + 30) % 60;
  return `${wrongMinute} ${now.getHours()} ${now.getDate()} ${now.getMonth() + 1} *`;
}

async function main() {

// ============================================================================
// startWorkflowScheduler — registers cron tick
// ============================================================================
console.log('\n── startWorkflowScheduler ───────────────────────────────');

resetState();
quiet();
startWorkflowScheduler();
loud();
assertEq(lastScheduleExpr, '* * * * *', 'schedules every minute');
assert(typeof lastScheduleCb === 'function', 'callback registered');

// Idempotent — second call doesn't re-register
const firstCb = lastScheduleCb;
lastScheduleExpr = null;
quiet();
startWorkflowScheduler();
loud();
assertEq(lastScheduleExpr, null, 'second start is no-op');
assert(lastScheduleCb === firstCb, 'same callback');

// ============================================================================
// stopWorkflowScheduler
// ============================================================================
console.log('\n── stopWorkflowScheduler ────────────────────────────────');

quiet();
stopWorkflowScheduler();
loud();
assertEq(cronStopCount, 1, 'task.stop() called');

// Stop when already stopped → no-op
quiet();
stopWorkflowScheduler();
loud();
assertEq(cronStopCount, 1, 'second stop is no-op');

// Restart to get a fresh callback for remaining tests
resetState();
quiet();
startWorkflowScheduler();
loud();
const tickCb = lastScheduleCb!;
assert(tickCb !== null, 'restarted scheduler');

// ============================================================================
// tick with no workflows → no error, no exec
// ============================================================================
console.log('\n── tick: no workflows ───────────────────────────────────');

qCalls = [];
execCalls = [];
nextRows = [];
await tickCb();
assertEq(qCalls.length, 1, 'one SELECT query');
assert(/FROM platform_workflows/i.test(qCalls[0].sql), 'queries platform_workflows');
assert(/is_enabled = 1/i.test(qCalls[0].sql), 'filters enabled');
assert(/trigger_type = 'schedule'/i.test(qCalls[0].sql), 'filters schedule type');
assertEq(execCalls.length, 0, 'no execution');

// ============================================================================
// tick: workflow matching current minute → triggers execution
// ============================================================================
console.log('\n── tick: matching cron triggers exec ────────────────────');

qCalls = [];
execCalls = [];
nextRows = [{
  id: 42,
  workflow_key: 'every_minute',
  name: 'Every minute',
  trigger_config: JSON.stringify({ cron: nowCron(), description: 'test desc' }),
  cooldown_seconds: 60,
}];
quiet();
await tickCb();
loud();
assertEq(execCalls.length, 1, 'executeWorkflow called');
assertEq(execCalls[0].workflowId, 42, 'workflowId');
assertEq(execCalls[0].triggerSource, 'schedule', 'triggerSource');
assert(typeof execCalls[0].context.scheduled_at === 'string', 'context.scheduled_at set');
assertEq(execCalls[0].context.description, 'test desc', 'context.description');

// ============================================================================
// tick: workflow NOT matching current minute → no exec
// ============================================================================
console.log('\n── tick: non-matching cron → no exec ────────────────────');

qCalls = [];
execCalls = [];
nextRows = [{
  id: 43,
  workflow_key: 'wrong_minute',
  name: 'Wrong minute',
  trigger_config: JSON.stringify({ cron: neverNowCron() }),
  cooldown_seconds: 60,
}];
await tickCb();
assertEq(execCalls.length, 0, 'not executed when cron does not match');

// ============================================================================
// tick: trigger_config as object (not string)
// ============================================================================
console.log('\n── tick: trigger_config as object ───────────────────────');

execCalls = [];
nextRows = [{
  id: 44,
  workflow_key: 'obj_config',
  name: 'Object config',
  trigger_config: { cron: nowCron() }, // already parsed
  cooldown_seconds: 60,
}];
quiet();
await tickCb();
loud();
assertEq(execCalls.length, 1, 'object trigger_config works');
assertEq(execCalls[0].workflowId, 44, 'executed');

// ============================================================================
// tick: invalid JSON in trigger_config → skip (no crash)
// ============================================================================
console.log('\n── tick: invalid JSON → skip ────────────────────────────');

execCalls = [];
nextRows = [{
  id: 45,
  workflow_key: 'bad_json',
  name: 'Bad JSON',
  trigger_config: '{not valid json',
  cooldown_seconds: 60,
}];
await tickCb();
assertEq(execCalls.length, 0, 'invalid JSON skipped silently');

// ============================================================================
// tick: missing cron field → skip
// ============================================================================
console.log('\n── tick: missing cron → skip ────────────────────────────');

execCalls = [];
nextRows = [{
  id: 46,
  workflow_key: 'no_cron',
  name: 'No cron',
  trigger_config: JSON.stringify({ description: 'no cron here' }),
  cooldown_seconds: 60,
}];
await tickCb();
assertEq(execCalls.length, 0, 'no cron field → skip');

// null trigger_config
execCalls = [];
nextRows = [{
  id: 47,
  workflow_key: 'null_config',
  trigger_config: null,
  cooldown_seconds: 60,
}];
await tickCb();
assertEq(execCalls.length, 0, 'null trigger_config → skip');

// ============================================================================
// tick: invalid cron expression → warn + skip
// ============================================================================
console.log('\n── tick: invalid cron expression → skip ─────────────────');

execCalls = [];
nextRows = [{
  id: 48,
  workflow_key: 'bad_cron',
  name: 'Bad cron',
  trigger_config: JSON.stringify({ cron: 'invalid' }),
  cooldown_seconds: 60,
}];
quiet();
await tickCb();
loud();
assertEq(execCalls.length, 0, 'invalid cron skipped');

// ============================================================================
// tick: executeWorkflow rejection is caught (doesn't crash tick)
// ============================================================================
console.log('\n── tick: exec rejection caught ──────────────────────────');

execCalls = [];
execShouldReject = true;
nextRows = [{
  id: 49,
  workflow_key: 'will_reject',
  name: 'Will reject',
  trigger_config: JSON.stringify({ cron: nowCron() }),
  cooldown_seconds: 60,
}];
quiet();
await tickCb();
// Give the rejection a microtask to settle
await new Promise((r) => setImmediate(r));
loud();
assertEq(execCalls.length, 1, 'execution still attempted');
execShouldReject = false;

// ============================================================================
// tick: multiple workflows — some match, some don't, some invalid
// ============================================================================
console.log('\n── tick: mixed workflows ────────────────────────────────');

execCalls = [];
nextRows = [
  {
    id: 50,
    workflow_key: 'match',
    trigger_config: JSON.stringify({ cron: nowCron() }),
    cooldown_seconds: 60,
  },
  {
    id: 51,
    workflow_key: 'no_match',
    trigger_config: JSON.stringify({ cron: neverNowCron() }),
    cooldown_seconds: 60,
  },
  {
    id: 52,
    workflow_key: 'bad_cron',
    trigger_config: JSON.stringify({ cron: 'invalid' }),
    cooldown_seconds: 60,
  },
  {
    id: 53,
    workflow_key: 'match_wildcard',
    trigger_config: JSON.stringify({ cron: '* * * * *' }),
    cooldown_seconds: 60,
  },
];
quiet();
await tickCb();
loud();
assertEq(execCalls.length, 2, 'only matching workflows fire');
assert(execCalls.some((c) => c.workflowId === 50), 'exact-match fires');
assert(execCalls.some((c) => c.workflowId === 53), 'wildcard fires');
assert(!execCalls.some((c) => c.workflowId === 51), 'non-matching does not fire');
assert(!execCalls.some((c) => c.workflowId === 52), 'invalid cron does not fire');

// ============================================================================
// tick: db error → caught (logs only)
// ============================================================================
console.log('\n── tick: db error caught ────────────────────────────────');

poolThrows = true;
execCalls = [];
quiet();
await tickCb(); // should not throw
loud();
assertEq(execCalls.length, 0, 'no exec on db error');
poolThrows = false;

// ============================================================================
// cron field matching — coverage via tick
// ============================================================================
console.log('\n── cron field matching ──────────────────────────────────');

const now = new Date();

// Range match: hour range that includes current
execCalls = [];
nextRows = [{
  id: 60,
  workflow_key: 'hour_range',
  trigger_config: JSON.stringify({ cron: `${now.getMinutes()} 0-23 * * *` }),
  cooldown_seconds: 60,
}];
quiet();
await tickCb();
loud();
assertEq(execCalls.length, 1, 'hour range matches');

// Step: every 1 minute should always match
execCalls = [];
nextRows = [{
  id: 61,
  workflow_key: 'step',
  trigger_config: JSON.stringify({ cron: `*/1 * * * *` }),
  cooldown_seconds: 60,
}];
quiet();
await tickCb();
loud();
assertEq(execCalls.length, 1, 'step */1 matches');

// Comma list containing current minute
execCalls = [];
nextRows = [{
  id: 62,
  workflow_key: 'list',
  trigger_config: JSON.stringify({
    cron: `0,${now.getMinutes()},59 * * * *`,
  }),
  cooldown_seconds: 60,
}];
quiet();
await tickCb();
loud();
assertEq(execCalls.length, 1, 'comma list matches');

// Comma list NOT containing current minute
execCalls = [];
const wrongMin = (now.getMinutes() + 10) % 60;
const otherWrong = (now.getMinutes() + 20) % 60;
nextRows = [{
  id: 63,
  workflow_key: 'list_no',
  trigger_config: JSON.stringify({
    cron: `${wrongMin},${otherWrong} * * * *`,
  }),
  cooldown_seconds: 60,
}];
await tickCb();
assertEq(execCalls.length, 0, 'comma list without match skips');

// Less than 5 fields → cron.validate filters (our stub says < 5 = false)
execCalls = [];
nextRows = [{
  id: 64,
  workflow_key: 'short',
  trigger_config: JSON.stringify({ cron: '* *' }),
  cooldown_seconds: 60,
}];
quiet();
await tickCb();
loud();
assertEq(execCalls.length, 0, 'short cron skipped');

// ============================================================================
// Cleanup
// ============================================================================
quiet();
stopWorkflowScheduler();
loud();

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
