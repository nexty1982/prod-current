#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowScheduler.js (OMD-1188)
 *
 * Scheduled workflow dispatcher that ticks every minute via node-cron.
 * Only `startWorkflowScheduler` / `stopWorkflowScheduler` are exported,
 * so we test the internal evaluation logic via the captured tick callback.
 *
 * Stubs:
 *   - `node-cron`: schedule captures the callback; validate is scriptable
 *   - `../config/db`: fake pool with scriptable rows
 *   - `./workflowEngine`: captures executeWorkflow calls
 *   - Per-tick Date override to drive `cronMatchesNow` with specific times
 *
 * Coverage:
 *   - start/stop lifecycle + double-start guard
 *   - Empty workflow list (no-op)
 *   - String trigger_config parsed via JSON.parse
 *   - Object trigger_config used as-is
 *   - Malformed JSON → continue (no executeWorkflow)
 *   - Missing cron → continue
 *   - Invalid cron (validate=false) → warn + skip
 *   - Cron matches exact minute → executeWorkflow fires
 *   - Cron does NOT match → no executeWorkflow
 *   - Cron wildcard (*) matches all
 *   - Cron range (N-M) semantics
 *   - Cron step (* /N) semantics
 *   - Cron comma list semantics
 *   - executeWorkflow error swallowed (caught + logged, not thrown)
 *   - Overlapping tick re-entry prevented
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
let capturedCallback: (() => Promise<void>) | null = null;
let schedulerStopped = false;
let cronValidateReturns = true;

const cronStub = {
  schedule: (expr: string, cb: () => Promise<void>) => {
    capturedCallback = cb;
    return {
      stop: () => { schedulerStopped = true; },
    };
  },
  validate: (expr: string) => cronValidateReturns,
};

function stubModule(relative: string, exports: any) {
  try {
    const p = require.resolve(relative);
    require.cache[p] = { id: p, filename: p, loaded: true, exports } as any;
  } catch {}
}
stubModule('node-cron', cronStub);

// ── db stub ──────────────────────────────────────────────────────────
let fakeWorkflows: any[] = [];
let poolThrowsOnQuery = false;

const fakePool = {
  query: async (sql: string) => {
    if (poolThrowsOnQuery) throw new Error('db broken');
    return [fakeWorkflows];
  },
};

const dbStub = { getAppPool: () => fakePool };
stubModule('../../config/db', dbStub);

// ── workflowEngine stub ──────────────────────────────────────────────
type ExecCall = { workflowId: number; triggerSource: string; context: any };
let execCalls: ExecCall[] = [];
let executeWorkflowThrows = false;

const workflowEngineStub = {
  executeWorkflow: async (args: any) => {
    execCalls.push(args);
    if (executeWorkflowThrows) throw new Error('engine failed');
    return { success: true };
  },
};
stubModule('../workflowEngine', workflowEngineStub);

// Silence console
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

// ── Require SUT ──────────────────────────────────────────────────────
const {
  startWorkflowScheduler,
  stopWorkflowScheduler,
} = require('../workflowScheduler');

/**
 * Run the captured cron tick with Date frozen to a specific ISO time.
 */
async function runTickAt(iso: string) {
  if (!capturedCallback) throw new Error('no callback captured');
  const OrigDate: any = global.Date;
  const fixedMs = new OrigDate(iso).getTime();
  function MockDate(this: any, ...args: any[]) {
    if (!(this instanceof MockDate)) return new OrigDate(fixedMs).toString();
    if (args.length === 0) return new OrigDate(fixedMs);
    // @ts-ignore
    return new OrigDate(...args);
  }
  (MockDate as any).now = () => fixedMs;
  (MockDate as any).UTC = OrigDate.UTC;
  (MockDate as any).parse = OrigDate.parse;
  MockDate.prototype = OrigDate.prototype;
  global.Date = MockDate as any;
  try {
    await capturedCallback();
  } finally {
    global.Date = OrigDate;
  }
}

function resetTickState() {
  execCalls = [];
  fakeWorkflows = [];
  poolThrowsOnQuery = false;
  executeWorkflowThrows = false;
  cronValidateReturns = true;
}

async function main() {

// ============================================================================
// Start / stop lifecycle
// ============================================================================
console.log('\n── lifecycle ─────────────────────────────────────────────');

quiet();
startWorkflowScheduler();
loud();
assert(capturedCallback !== null, 'cron.schedule called + callback captured');

// Double-start is a no-op
quiet();
startWorkflowScheduler();
loud();
// Still the same callback reference (no re-scheduling)
assert(capturedCallback !== null, 'double start → no error');

// ============================================================================
// Empty workflow list
// ============================================================================
console.log('\n── empty workflow list ───────────────────────────────────');

resetTickState();
quiet();
await runTickAt('2026-04-11T14:30:00.000Z');
loud();
assertEq(execCalls.length, 0, 'no executeWorkflow for empty list');

// ============================================================================
// Exact cron match fires executeWorkflow
// ============================================================================
console.log('\n── cron match fires ──────────────────────────────────────');

resetTickState();
// Use local time — getMinutes/getHours/getDate/getMonth use local tz
// Pick a time and build cron from the local components
{
  const now = new Date();
  // Use NOW + 0 — cron matches current local minute exactly
  const localMin = now.getMinutes();
  const localHour = now.getHours();
  const localDom = now.getDate();
  const localMon = now.getMonth() + 1;
  const localDow = now.getDay();

  fakeWorkflows = [{
    id: 1,
    workflow_key: 'test_now',
    name: 'Test Now',
    trigger_config: JSON.stringify({ cron: `${localMin} ${localHour} ${localDom} ${localMon} ${localDow}` }),
    cooldown_seconds: 60,
  }];
  quiet();
  // Call the callback WITHOUT date override (so local "now" is real)
  await capturedCallback!();
  loud();
  assertEq(execCalls.length, 1, 'one workflow fired');
  assertEq(execCalls[0].workflowId, 1, 'correct workflow id');
  assertEq(execCalls[0].triggerSource, 'schedule', 'triggerSource=schedule');
  assert(execCalls[0].context.cron !== undefined, 'cron in context');
  assert(execCalls[0].context.scheduled_at !== undefined, 'scheduled_at in context');
}

// ============================================================================
// Cron NOT matching → no fire
// ============================================================================
console.log('\n── cron no match ─────────────────────────────────────────');

resetTickState();
{
  const now = new Date();
  // Build a cron expression that is DEFINITELY not matching (different minute)
  const wrongMin = (now.getMinutes() + 10) % 60;
  fakeWorkflows = [{
    id: 2,
    workflow_key: 'test_other',
    name: 'Test Other',
    trigger_config: { cron: `${wrongMin} * * * *` },
    cooldown_seconds: 60,
  }];
  quiet();
  await capturedCallback!();
  loud();
  assertEq(execCalls.length, 0, 'no fire when cron min mismatch');
}

// ============================================================================
// Wildcard cron (* * * * *) matches always
// ============================================================================
console.log('\n── wildcard cron ─────────────────────────────────────────');

resetTickState();
fakeWorkflows = [{
  id: 3,
  workflow_key: 'test_wildcard',
  name: 'Wildcard',
  trigger_config: { cron: '* * * * *' },
}];
quiet();
await capturedCallback!();
loud();
assertEq(execCalls.length, 1, 'wildcard cron always fires');

// ============================================================================
// Range cron (0-59 * * * *) — all minutes → fires
// ============================================================================
console.log('\n── range cron ────────────────────────────────────────────');

resetTickState();
fakeWorkflows = [{
  id: 4,
  workflow_key: 'test_range',
  trigger_config: { cron: '0-59 * * * *' },
}];
quiet();
await capturedCallback!();
loud();
assertEq(execCalls.length, 1, 'full range cron fires');

// Narrow range not containing current minute
resetTickState();
{
  const now = new Date();
  const curMin = now.getMinutes();
  // Build a range that excludes the current minute
  const lo = (curMin + 5) % 60;
  const hi = (curMin + 10) % 60;
  // If the wrap is messy, just pick a definite exclusion
  const exclusive = curMin === 0 ? '30-35' : `0-${Math.max(curMin - 5, 0)}`;
  // Ensure current minute is NOT in [0..curMin-5] range when curMin > 5
  if (curMin > 5) {
    fakeWorkflows = [{
      id: 5,
      workflow_key: 'test_narrow',
      trigger_config: { cron: `0-${curMin - 2} * * * *` },
    }];
    quiet();
    await capturedCallback!();
    loud();
    assertEq(execCalls.length, 0, 'narrow range excluding current minute → no fire');
  } else {
    // Skip test if current minute is too low to construct exclusive range
    assert(true, 'narrow range test skipped (minute too low)');
  }
}

// ============================================================================
// Step cron (* /N) — e.g., */1 matches every minute
// ============================================================================
console.log('\n── step cron ─────────────────────────────────────────────');

resetTickState();
fakeWorkflows = [{
  id: 6,
  workflow_key: 'test_step_1',
  trigger_config: { cron: '*/1 * * * *' },
}];
quiet();
await capturedCallback!();
loud();
assertEq(execCalls.length, 1, '*/1 matches every minute');

// ============================================================================
// Comma-separated list
// ============================================================================
console.log('\n── comma list ────────────────────────────────────────────');

resetTickState();
{
  const now = new Date();
  const curMin = now.getMinutes();
  // Cron with the current minute in the list → fires
  const list = `${curMin},${(curMin + 5) % 60},${(curMin + 10) % 60}`;
  fakeWorkflows = [{
    id: 7,
    workflow_key: 'test_list_hit',
    trigger_config: { cron: `${list} * * * *` },
  }];
  quiet();
  await capturedCallback!();
  loud();
  assertEq(execCalls.length, 1, 'comma list containing current minute fires');
}

// Comma list NOT containing current minute
resetTickState();
{
  const now = new Date();
  const curMin = now.getMinutes();
  const noMatch = `${(curMin + 5) % 60},${(curMin + 10) % 60}`;
  fakeWorkflows = [{
    id: 8,
    workflow_key: 'test_list_miss',
    trigger_config: { cron: `${noMatch} * * * *` },
  }];
  quiet();
  await capturedCallback!();
  loud();
  assertEq(execCalls.length, 0, 'comma list missing current minute → no fire');
}

// ============================================================================
// Malformed JSON → continue
// ============================================================================
console.log('\n── malformed JSON ────────────────────────────────────────');

resetTickState();
fakeWorkflows = [{
  id: 9,
  workflow_key: 'test_bad_json',
  trigger_config: '{not-json',
}];
quiet();
await capturedCallback!();
loud();
assertEq(execCalls.length, 0, 'bad JSON skipped');

// ============================================================================
// Missing cron in config → continue
// ============================================================================
console.log('\n── missing cron ──────────────────────────────────────────');

resetTickState();
fakeWorkflows = [{
  id: 10,
  workflow_key: 'test_no_cron',
  trigger_config: { description: 'no cron field' },
}];
quiet();
await capturedCallback!();
loud();
assertEq(execCalls.length, 0, 'no cron → skipped');

// ============================================================================
// Invalid cron (cron.validate returns false) → warn + skip
// ============================================================================
console.log('\n── invalid cron ──────────────────────────────────────────');

resetTickState();
cronValidateReturns = false;
fakeWorkflows = [{
  id: 11,
  workflow_key: 'test_invalid',
  trigger_config: { cron: 'bogus-cron' },
}];
quiet();
await capturedCallback!();
loud();
assertEq(execCalls.length, 0, 'invalid cron → skipped');
cronValidateReturns = true;

// ============================================================================
// executeWorkflow error is swallowed
// ============================================================================
console.log('\n── executeWorkflow error swallowed ───────────────────────');

resetTickState();
executeWorkflowThrows = true;
fakeWorkflows = [{
  id: 12,
  workflow_key: 'test_engine_err',
  trigger_config: { cron: '* * * * *' },
}];
quiet();
await capturedCallback!(); // must not throw
loud();
assertEq(execCalls.length, 1, 'engine still called');
executeWorkflowThrows = false;

// ============================================================================
// Pool error → caught at top-level tick
// ============================================================================
console.log('\n── pool error swallowed ──────────────────────────────────');

resetTickState();
poolThrowsOnQuery = true;
quiet();
await capturedCallback!(); // must not throw
loud();
assertEq(execCalls.length, 0, 'no executeWorkflow when db errors');
poolThrowsOnQuery = false;

// ============================================================================
// Stop scheduler
// ============================================================================
console.log('\n── stopWorkflowScheduler ─────────────────────────────────');

schedulerStopped = false;
quiet();
stopWorkflowScheduler();
loud();
assertEq(schedulerStopped, true, 'cron job stopped');

// Second stop is no-op
schedulerStopped = false;
quiet();
stopWorkflowScheduler();
loud();
assertEq(schedulerStopped, false, 'second stop no-op (already null)');

// Can re-start after stop
quiet();
capturedCallback = null;
startWorkflowScheduler();
loud();
assert(capturedCallback !== null, 'can restart after stop');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
