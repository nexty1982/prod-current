#!/usr/bin/env npx tsx
/**
 * Unit tests for services/autoExecutionPolicyService.js (OMD-988)
 *
 * Coverage:
 *   - MODE constants (OFF/SAFE/FULL)
 *   - SAFE_RULES: 10 eligibility rules, each tested individually
 *   - FULL_RULES: same as SAFE except E2 relaxes to high|medium
 *   - evaluateEligibility: all-pass baseline, individual failures,
 *     multi-failure aggregation, both modes
 *   - getSetting/setSetting: DB stubbed, JSON unwrap, boolean casting
 *   - getStatus / enable / disable / setMode / recordRun
 *   - hasChainStepFailure: returns false when chain_id missing,
 *     delegates to pool on query
 *
 * Run: npx tsx server/src/services/__tests__/autoExecutionPolicyService.test.ts
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

// ── stub ../config/db BEFORE requiring SUT ─────────────────────────────
type QCall = { sql: string; params: any[] };
let qCalls: QCall[] = [];
let qRoutes: Array<{ match: RegExp; rows?: any[]; result?: any }> = [];

function makePool() {
  return {
    query: async (sql: string, params: any[] = []) => {
      qCalls.push({ sql, params });
      for (const r of qRoutes) {
        if (r.match.test(sql)) {
          if (r.rows !== undefined) return [r.rows, []];
          return [r.result ?? { affectedRows: 1 }, []];
        }
      }
      return [[], []];
    },
  };
}

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    getAppPool: () => makePool(),
  },
} as any;

const svc = require('../autoExecutionPolicyService');
const { MODE, SETTINGS, SAFE_RULES, FULL_RULES, evaluateEligibility, hasChainStepFailure } = svc;

async function main() {

// ============================================================================
// MODE constants
// ============================================================================
console.log('\n── MODE constants ────────────────────────────────────────');

assertEq(MODE.OFF, 'OFF', 'MODE.OFF');
assertEq(MODE.SAFE, 'SAFE', 'MODE.SAFE');
assertEq(MODE.FULL, 'FULL', 'MODE.FULL');
assertEq(Object.keys(MODE).length, 3, '3 modes total');

assertEq(SETTINGS.ENABLED, 'auto_execution_enabled', 'SETTINGS.ENABLED');
assertEq(SETTINGS.MODE, 'auto_execution_mode', 'SETTINGS.MODE');
assertEq(SETTINGS.LAST_RUN_AT, 'auto_execution_last_run_at', 'SETTINGS.LAST_RUN_AT');
assertEq(SETTINGS.LAST_RUN_RESULT, 'auto_execution_last_run_result', 'SETTINGS.LAST_RUN_RESULT');

// ============================================================================
// SAFE_RULES / FULL_RULES structure
// ============================================================================
console.log('\n── SAFE_RULES / FULL_RULES structure ────────────────────');

assertEq(SAFE_RULES.length, 10, 'SAFE_RULES has 10 rules');
assertEq(FULL_RULES.length, 10, 'FULL_RULES has 10 rules');

const safeIds = SAFE_RULES.map((r: any) => r.id);
assertEq(safeIds, ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10'], 'SAFE rule IDs E1-E10');

// FULL_RULES E2 has different name (confidence_acceptable)
const fullE2 = FULL_RULES.find((r: any) => r.id === 'E2');
assertEq(fullE2.name, 'confidence_acceptable', 'FULL E2 name is confidence_acceptable');

const safeE2 = SAFE_RULES.find((r: any) => r.id === 'E2');
assertEq(safeE2.name, 'confidence_high', 'SAFE E2 name is confidence_high');

// ============================================================================
// evaluateEligibility: all-pass baseline
// ============================================================================
console.log('\n── evaluateEligibility: all-pass baseline ────────────────');

function passPrompt(overrides: any = {}) {
  return {
    id: 42,
    title: 'Test Prompt',
    confidence_level: 'high',
    evaluator_status: 'pass',
    completion_status: 'complete',
    escalation_required: false,
    degradation_flag: false,
    queue_status: 'ready_for_release',
    release_mode: 'auto_safe',
    _has_chain_failure: false,
    _auto_execute_excluded: false,
    ...overrides,
  };
}

const passRec = { action: 'RELEASE_NOW' };

{
  const result = evaluateEligibility(passRec, passPrompt(), MODE.SAFE);
  assertEq(result.eligible, true, 'clean SAFE: eligible');
  assertEq(result.prompt_id, 42, 'prompt_id');
  assertEq(result.title, 'Test Prompt', 'title');
  assertEq(result.mode, MODE.SAFE, 'mode');
  assertEq(result.failures.length, 0, 'no failures');
  assertEq(result.passed_rules.length, 10, '10 passed');
  assertEq(result.passed_count, 10, 'passed_count 10');
  assertEq(result.total_rules, 10, 'total_rules 10');
}

// Default mode is SAFE
{
  const result = evaluateEligibility(passRec, passPrompt());
  assertEq(result.mode, MODE.SAFE, 'default mode is SAFE');
  assertEq(result.eligible, true, 'default mode all-pass');
}

// ============================================================================
// evaluateEligibility: individual SAFE rule failures
// ============================================================================
console.log('\n── evaluateEligibility: individual SAFE failures ─────────');

function expectFailure(rec: any, prompt: any, ruleId: string, msg: string) {
  const result = evaluateEligibility(rec, prompt, MODE.SAFE);
  assert(!result.eligible, `${msg}: not eligible`);
  const fail = result.failures.find((f: any) => f.id === ruleId);
  assert(fail !== undefined, `${msg}: ${ruleId} in failures`);
  if (fail) assert(fail.reason && fail.reason.length > 0, `${msg}: has reason`);
}

// E1 action not RELEASE_NOW
expectFailure({ action: 'HOLD' }, passPrompt(), 'E1', 'E1 wrong action');

// E2 confidence not high
expectFailure(passRec, passPrompt({ confidence_level: 'medium' }), 'E2', 'E2 medium confidence');
expectFailure(passRec, passPrompt({ confidence_level: 'low' }), 'E2', 'E2 low confidence');

// E3 evaluator not pass
expectFailure(passRec, passPrompt({ evaluator_status: 'fail' }), 'E3', 'E3 evaluator fail');
expectFailure(passRec, passPrompt({ evaluator_status: null }), 'E3', 'E3 evaluator null');

// E4 completion not complete
expectFailure(passRec, passPrompt({ completion_status: 'partial' }), 'E4', 'E4 partial');
expectFailure(passRec, passPrompt({ completion_status: null }), 'E4', 'E4 null completion');

// E5 escalation required
expectFailure(passRec, passPrompt({ escalation_required: true }), 'E5', 'E5 escalation');

// E6 degradation flag
expectFailure(passRec, passPrompt({ degradation_flag: true }), 'E6', 'E6 degradation');

// E7 queue status
expectFailure(passRec, passPrompt({ queue_status: 'waiting' }), 'E7', 'E7 waiting queue');
// overdue is allowed
{
  const result = evaluateEligibility(passRec, passPrompt({ queue_status: 'overdue' }), MODE.SAFE);
  assertEq(result.eligible, true, 'E7 overdue allowed');
}

// E8 release_mode manual
expectFailure(passRec, passPrompt({ release_mode: 'manual' }), 'E8', 'E8 manual release');
// auto_full is allowed in SAFE mode
{
  const result = evaluateEligibility(passRec, passPrompt({ release_mode: 'auto_full' }), MODE.SAFE);
  assertEq(result.eligible, true, 'E8 auto_full allowed');
}

// E9 chain failure
expectFailure(passRec, passPrompt({ _has_chain_failure: true }), 'E9', 'E9 chain fail');

// E10 excluded
expectFailure(passRec, passPrompt({ _auto_execute_excluded: true }), 'E10', 'E10 excluded');

// ============================================================================
// evaluateEligibility: multi-failure aggregation
// ============================================================================
console.log('\n── evaluateEligibility: multi-failure ────────────────────');

{
  const bad = passPrompt({
    confidence_level: 'low',
    evaluator_status: 'fail',
    completion_status: 'partial',
    escalation_required: true,
  });
  const result = evaluateEligibility(passRec, bad, MODE.SAFE);
  assertEq(result.eligible, false, 'multi-fail not eligible');
  assert(result.failures.length >= 4, 'at least 4 failures');
  const ids = result.failures.map((f: any) => f.id);
  assert(ids.includes('E2'), 'E2 in failures');
  assert(ids.includes('E3'), 'E3 in failures');
  assert(ids.includes('E4'), 'E4 in failures');
  assert(ids.includes('E5'), 'E5 in failures');
}

// ============================================================================
// evaluateEligibility: FULL mode
// ============================================================================
console.log('\n── evaluateEligibility: FULL mode ────────────────────────');

// FULL relaxes E2 — medium confidence passes
{
  const result = evaluateEligibility(
    passRec,
    passPrompt({ confidence_level: 'medium' }),
    MODE.FULL
  );
  assertEq(result.eligible, true, 'FULL: medium confidence eligible');
  assertEq(result.mode, MODE.FULL, 'mode FULL');
}

// FULL rejects 'low' confidence
{
  const result = evaluateEligibility(
    passRec,
    passPrompt({ confidence_level: 'low' }),
    MODE.FULL
  );
  assertEq(result.eligible, false, 'FULL: low confidence rejected');
  const fail = result.failures.find((f: any) => f.id === 'E2');
  assert(fail !== undefined, 'FULL: E2 in failures for low');
}

// FULL still rejects other failures
{
  const result = evaluateEligibility(
    passRec,
    passPrompt({ evaluator_status: 'fail' }),
    MODE.FULL
  );
  assertEq(result.eligible, false, 'FULL: E3 still checked');
}

// ============================================================================
// getSetting: reads & unwraps JSON
// ============================================================================
console.log('\n── getSetting ────────────────────────────────────────────');

qCalls = [];
qRoutes = [
  { match: /SELECT.*system_settings.*WHERE key_name = \?/i, rows: [
    { value_multilang: JSON.stringify('hello'), data_type: 'string' },
  ]},
];
{
  const val = await svc.getSetting('my_key');
  assertEq(val, 'hello', 'getSetting: string value unwrapped');
  assertEq(qCalls[0].params, ['my_key'], 'key param passed');
}

// Missing returns default
qCalls = [];
qRoutes = [{ match: /SELECT.*system_settings/i, rows: [] }];
{
  const val = await svc.getSetting('missing_key', 'DEFAULT');
  assertEq(val, 'DEFAULT', 'getSetting: returns default when no rows');
}

// Boolean casting: 'true' → true
qCalls = [];
qRoutes = [{ match: /SELECT.*system_settings/i, rows: [
  { value_multilang: JSON.stringify('true'), data_type: 'boolean' },
]}];
{
  const val = await svc.getSetting('bool_true');
  assertEq(val, true, 'getSetting: "true" → true');
}

qCalls = [];
qRoutes = [{ match: /SELECT.*system_settings/i, rows: [
  { value_multilang: JSON.stringify('false'), data_type: 'boolean' },
]}];
{
  const val = await svc.getSetting('bool_false');
  assertEq(val, false, 'getSetting: "false" → false');
}

// JSON type
qCalls = [];
qRoutes = [{ match: /SELECT.*system_settings/i, rows: [
  { value_multilang: JSON.stringify({ foo: 'bar' }), data_type: 'json' },
]}];
{
  const val = await svc.getSetting('json_key');
  assertEq(val, { foo: 'bar' }, 'getSetting: json parsed');
}

// ============================================================================
// setSetting: INSERT ON DUPLICATE KEY
// ============================================================================
console.log('\n── setSetting ────────────────────────────────────────────');

qCalls = [];
qRoutes = [{ match: /INSERT.*system_settings/i, result: { affectedRows: 1 } }];
{
  await svc.setSetting('my_key', 'my_value', 'string', 'test_cat');
  assertEq(qCalls.length, 1, '1 query');
  assert(/INSERT.*system_settings/i.test(qCalls[0].sql), 'INSERT sql');
  assertEq(qCalls[0].params[0], 'my_key', 'key');
  assertEq(qCalls[0].params[1], JSON.stringify('my_value'), 'value wrapped in JSON');
  assertEq(qCalls[0].params[2], 'string', 'data_type');
  assertEq(qCalls[0].params[3], 'test_cat', 'category');
}

// Object value
qCalls = [];
qRoutes = [{ match: /INSERT/i, result: {} }];
{
  await svc.setSetting('obj_key', { a: 1 }, 'json');
  assertEq(qCalls[0].params[1], JSON.stringify({ a: 1 }), 'object stringified');
  assertEq(qCalls[0].params[3], 'auto_execution', 'default category');
}

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

qCalls = [];
qRoutes = [{
  match: /SELECT.*system_settings/i,
  rows: [{ value_multilang: JSON.stringify('true'), data_type: 'boolean' }],
}];
{
  // getStatus calls getSetting 4x — stub returns 'true' for each,
  // which means enabled=true, mode='true' (invalid) → fallback to SAFE
  const status = await svc.getStatus();
  assertEq(status.enabled, true, 'enabled');
  assertEq(status.mode, MODE.SAFE, 'mode defaults to SAFE when invalid');
}

// Defaults when empty
qCalls = [];
qRoutes = [{ match: /SELECT.*system_settings/i, rows: [] }];
{
  const status = await svc.getStatus();
  assertEq(status.enabled, false, 'default enabled false');
  assertEq(status.mode, MODE.SAFE, 'default mode SAFE');
  assertEq(status.last_run_at, null, 'default last_run_at null');
  assertEq(status.last_run_result, null, 'default last_run_result null');
}

// ============================================================================
// enable / disable
// ============================================================================
console.log('\n── enable / disable ──────────────────────────────────────');

qCalls = [];
qRoutes = [
  { match: /INSERT/i, result: {} },
  { match: /SELECT/i, rows: [] },
];
{
  await svc.enable();
  // First call should be the INSERT setting ENABLED to 'true'
  const insertCall = qCalls.find(c => /INSERT/i.test(c.sql));
  assert(insertCall !== undefined, 'enable: INSERT called');
  if (insertCall) {
    assertEq(insertCall.params[0], SETTINGS.ENABLED, 'enables ENABLED key');
    assertEq(insertCall.params[1], JSON.stringify('true'), 'value "true"');
    assertEq(insertCall.params[2], 'boolean', 'boolean type');
  }
}

qCalls = [];
qRoutes = [
  { match: /INSERT/i, result: {} },
  { match: /SELECT/i, rows: [] },
];
{
  await svc.disable();
  const insertCall = qCalls.find(c => /INSERT/i.test(c.sql));
  assert(insertCall !== undefined, 'disable: INSERT called');
  if (insertCall) {
    assertEq(insertCall.params[1], JSON.stringify('false'), 'disable value "false"');
  }
}

// ============================================================================
// setMode
// ============================================================================
console.log('\n── setMode ───────────────────────────────────────────────');

qCalls = [];
qRoutes = [
  { match: /INSERT/i, result: {} },
  { match: /SELECT/i, rows: [] },
];
{
  await svc.setMode(MODE.FULL);
  const inserts = qCalls.filter(c => /INSERT/i.test(c.sql));
  assert(inserts.length >= 1, 'setMode FULL: at least 1 insert');
  const modeInsert = inserts.find(c => c.params[0] === SETTINGS.MODE);
  assert(modeInsert !== undefined, 'MODE setting inserted');
  if (modeInsert) assertEq(modeInsert.params[1], JSON.stringify('FULL'), 'mode value FULL');
}

// setMode OFF also disables
qCalls = [];
qRoutes = [
  { match: /INSERT/i, result: {} },
  { match: /SELECT/i, rows: [] },
];
{
  await svc.setMode(MODE.OFF);
  const inserts = qCalls.filter(c => /INSERT/i.test(c.sql));
  const enabledInsert = inserts.find(c => c.params[0] === SETTINGS.ENABLED);
  assert(enabledInsert !== undefined, 'OFF mode also updates ENABLED');
  if (enabledInsert) assertEq(enabledInsert.params[1], JSON.stringify('false'), 'ENABLED set to false');
}

// Invalid mode throws
{
  let thrown = false;
  try {
    await svc.setMode('BOGUS');
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('Invalid mode'), 'error mentions Invalid mode');
  }
  assert(thrown, 'setMode throws for invalid');
}

// ============================================================================
// recordRun
// ============================================================================
console.log('\n── recordRun ─────────────────────────────────────────────');

qCalls = [];
qRoutes = [{ match: /INSERT/i, result: {} }];
{
  await svc.recordRun({ processed: 5, eligible: 2 });
  const inserts = qCalls.filter(c => /INSERT/i.test(c.sql));
  assertEq(inserts.length, 2, '2 inserts (LAST_RUN_AT + LAST_RUN_RESULT)');
  const atInsert = inserts.find(c => c.params[0] === SETTINGS.LAST_RUN_AT);
  const resultInsert = inserts.find(c => c.params[0] === SETTINGS.LAST_RUN_RESULT);
  assert(atInsert !== undefined, 'LAST_RUN_AT inserted');
  assert(resultInsert !== undefined, 'LAST_RUN_RESULT inserted');
  if (atInsert) assertEq(atInsert.params[2], 'string', 'LAST_RUN_AT is string type');
  if (resultInsert) assertEq(resultInsert.params[2], 'json', 'LAST_RUN_RESULT is json type');
}

// ============================================================================
// hasChainStepFailure
// ============================================================================
console.log('\n── hasChainStepFailure ───────────────────────────────────');

// No chain_id → returns false without querying
qCalls = [];
qRoutes = [];
{
  const result = await hasChainStepFailure({ id: 1 });
  assertEq(result, false, 'no chain_id → false');
  assertEq(qCalls.length, 0, 'no queries made');
}

// No chain_step_number → returns false
qCalls = [];
{
  const result = await hasChainStepFailure({ id: 1, chain_id: 'abc' });
  assertEq(result, false, 'no chain_step_number → false');
  assertEq(qCalls.length, 0, 'no queries');
}

// With chain_id + step, count > 0 → true
qCalls = [];
qRoutes = [{ match: /SELECT COUNT.*om_prompt_registry/i, rows: [{ cnt: 2 }] }];
{
  const result = await hasChainStepFailure({ id: 1, chain_id: 'abc', chain_step_number: 1 });
  assertEq(result, true, 'cnt=2 → true');
  assertEq(qCalls.length, 1, '1 query');
  assertEq(qCalls[0].params, ['abc', 1, 1], 'chain_id, step, id params');
}

// cnt = 0 → false
qCalls = [];
qRoutes = [{ match: /SELECT COUNT/i, rows: [{ cnt: 0 }] }];
{
  const result = await hasChainStepFailure({ id: 1, chain_id: 'abc', chain_step_number: 1 });
  assertEq(result, false, 'cnt=0 → false');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
