#!/usr/bin/env npx tsx
/**
 * Unit tests for services/autoExecutionPolicyService.js (OMD-1173)
 *
 * Deterministic policy engine for auto-execution eligibility. Stubs
 * config/db via require.cache; everything else is pure.
 *
 * Coverage:
 *   - MODE / SETTINGS / SAFE_RULES / FULL_RULES shape
 *   - evaluateEligibility (SAFE mode):
 *       · all rules pass → eligible: true
 *       · each rule E1..E10 fails individually → correct failure reason
 *       · multiple failures all captured
 *       · passed_count and total_rules counts correct
 *   - evaluateEligibility (FULL mode):
 *       · medium confidence accepted
 *       · low confidence still rejected
 *   - getSetting:
 *       · key not found → default
 *       · boolean dataType ("true"/"false" → boolean)
 *       · json dataType (parsed)
 *       · string dataType (raw value)
 *   - setSetting:
 *       · scalar → JSON-stringified string value
 *       · object → JSON-stringified
 *       · INSERT ... ON DUPLICATE KEY UPDATE pattern
 *   - getStatus: defaults + valid mode coercion
 *   - enable / disable / setMode:
 *       · setMode(OFF) also disables
 *       · setMode invalid → throws
 *   - recordRun: stores timestamp + result
 *   - hasChainStepFailure:
 *       · missing chain_id → false (no query)
 *       · query returns 0 → false
 *       · query returns 1+ → true
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

// ── Fake DB pool ─────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

// Scriptable settings store: key → { value_multilang, data_type }
const settingsStore: Record<string, { value_multilang: string; data_type: string }> = {};

let chainFailureCount = 0;

const fakeAppPool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });

    // SELECT from system_settings
    if (/SELECT value_multilang, data_type FROM system_settings/i.test(sql)) {
      const key = params[0];
      if (settingsStore[key]) {
        return [[settingsStore[key]]];
      }
      return [[]];
    }

    // INSERT into system_settings
    if (/^\s*INSERT INTO system_settings/i.test(sql)) {
      const [key, value_multilang, data_type] = params;
      settingsStore[key] = { value_multilang, data_type };
      return [{ affectedRows: 1 }];
    }

    // SELECT COUNT(*) FROM om_prompt_registry
    if (/FROM om_prompt_registry[\s\S]*chain_id/i.test(sql)) {
      return [[{ cnt: chainFailureCount }]];
    }

    return [[]];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakeAppPool },
} as any;

function resetState() {
  queryLog.length = 0;
  for (const k in settingsStore) delete settingsStore[k];
  chainFailureCount = 0;
}

const {
  MODE,
  SETTINGS,
  SAFE_RULES,
  FULL_RULES,
  evaluateEligibility,
  getSetting,
  setSetting,
  getStatus,
  enable,
  disable,
  setMode,
  recordRun,
  hasChainStepFailure,
} = require('../autoExecutionPolicyService');

// Helper to build a fully-eligible (SAFE) prompt fixture
function goodPrompt(overrides: any = {}) {
  return {
    id: 100,
    title: 'Test prompt',
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

function goodRec(overrides: any = {}) {
  return { action: 'RELEASE_NOW', ...overrides };
}

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(MODE.OFF, 'OFF', 'MODE.OFF');
assertEq(MODE.SAFE, 'SAFE', 'MODE.SAFE');
assertEq(MODE.FULL, 'FULL', 'MODE.FULL');

assertEq(SETTINGS.ENABLED, 'auto_execution_enabled', 'SETTINGS.ENABLED');
assertEq(SETTINGS.MODE, 'auto_execution_mode', 'SETTINGS.MODE');
assertEq(SETTINGS.LAST_RUN_AT, 'auto_execution_last_run_at', 'SETTINGS.LAST_RUN_AT');
assertEq(SETTINGS.LAST_RUN_RESULT, 'auto_execution_last_run_result', 'SETTINGS.LAST_RUN_RESULT');

assertEq(SAFE_RULES.length, 10, '10 SAFE rules');
assertEq(FULL_RULES.length, 10, '10 FULL rules');
// All rule IDs E1..E10 present
const safeIds = SAFE_RULES.map((r: any) => r.id).sort();
assertEq(safeIds, ['E1', 'E10', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9'], 'SAFE rule ids');

// ============================================================================
// evaluateEligibility: SAFE mode, all pass
// ============================================================================
console.log('\n── evaluateEligibility: SAFE all pass ────────────────────');

{
  const r = evaluateEligibility(goodRec(), goodPrompt(), MODE.SAFE);
  assertEq(r.eligible, true, 'eligible');
  assertEq(r.mode, 'SAFE', 'mode SAFE');
  assertEq(r.prompt_id, 100, 'prompt_id');
  assertEq(r.title, 'Test prompt', 'title');
  assertEq(r.failures, [], 'no failures');
  assertEq(r.passed_count, 10, 'all 10 passed');
  assertEq(r.total_rules, 10, 'total 10');
  assertEq(r.passed_rules.length, 10, 'passed_rules count');
}

// Default mode is SAFE
{
  const r = evaluateEligibility(goodRec(), goodPrompt());
  assertEq(r.mode, 'SAFE', 'default mode SAFE');
  assertEq(r.eligible, true, 'eligible in default');
}

// ============================================================================
// evaluateEligibility: individual rule failures (SAFE)
// ============================================================================
console.log('\n── evaluateEligibility: individual failures ──────────────');

// E1: action not RELEASE_NOW
{
  const r = evaluateEligibility(
    goodRec({ action: 'HOLD' }),
    goodPrompt()
  );
  assertEq(r.eligible, false, 'E1 fail');
  assertEq(r.failures.length, 1, '1 failure');
  assertEq(r.failures[0].id, 'E1', 'E1 id');
  assert(r.failures[0].reason.includes('HOLD'), 'reason mentions action');
  assertEq(r.passed_count, 9, '9 passed');
}

// E2: confidence not high
{
  const r = evaluateEligibility(
    goodRec(),
    goodPrompt({ confidence_level: 'medium' })
  );
  assertEq(r.failures[0].id, 'E2', 'E2');
  assert(r.failures[0].reason.includes('medium'), 'reason mentions medium');
}

// E3: evaluator not pass
{
  const r = evaluateEligibility(
    goodRec(),
    goodPrompt({ evaluator_status: 'fail' })
  );
  assertEq(r.failures[0].id, 'E3', 'E3');
}

// E4: completion not complete
{
  const r = evaluateEligibility(
    goodRec(),
    goodPrompt({ completion_status: 'partial' })
  );
  assertEq(r.failures[0].id, 'E4', 'E4');
}

// E5: escalation required
{
  const r = evaluateEligibility(
    goodRec(),
    goodPrompt({ escalation_required: true })
  );
  assertEq(r.failures[0].id, 'E5', 'E5');
}

// E6: degradation flag
{
  const r = evaluateEligibility(
    goodRec(),
    goodPrompt({ degradation_flag: true })
  );
  assertEq(r.failures[0].id, 'E6', 'E6');
}

// E7: queue_status not ready_for_release / overdue
{
  const r = evaluateEligibility(
    goodRec(),
    goodPrompt({ queue_status: 'waiting' })
  );
  assertEq(r.failures[0].id, 'E7', 'E7');
  assert(r.failures[0].reason.includes('waiting'), 'reason mentions status');
}

// E7 positive: queue_status = overdue also passes
{
  const r = evaluateEligibility(
    goodRec(),
    goodPrompt({ queue_status: 'overdue' })
  );
  assertEq(r.eligible, true, 'overdue passes E7');
}

// E8: release_mode not auto_*
{
  const r = evaluateEligibility(
    goodRec(),
    goodPrompt({ release_mode: 'manual' })
  );
  assertEq(r.failures[0].id, 'E8', 'E8');
}

// E8 positive: auto_full also passes
{
  const r = evaluateEligibility(
    goodRec(),
    goodPrompt({ release_mode: 'auto_full' })
  );
  assertEq(r.eligible, true, 'auto_full passes E8');
}

// E9: chain failure
{
  const r = evaluateEligibility(
    goodRec(),
    goodPrompt({ _has_chain_failure: true })
  );
  assertEq(r.failures[0].id, 'E9', 'E9');
}

// E10: excluded
{
  const r = evaluateEligibility(
    goodRec(),
    goodPrompt({ _auto_execute_excluded: true })
  );
  assertEq(r.failures[0].id, 'E10', 'E10');
}

// ============================================================================
// evaluateEligibility: multiple failures captured
// ============================================================================
console.log('\n── evaluateEligibility: multi-failure ────────────────────');

{
  const r = evaluateEligibility(
    goodRec({ action: 'HOLD' }),
    goodPrompt({
      confidence_level: 'low',
      evaluator_status: 'fail',
      escalation_required: true,
    })
  );
  assertEq(r.eligible, false, 'not eligible');
  assert(r.failures.length >= 4, 'at least 4 failures');
  const ids = r.failures.map((f: any) => f.id).sort();
  assert(ids.includes('E1'), 'E1 in failures');
  assert(ids.includes('E2'), 'E2 in failures');
  assert(ids.includes('E3'), 'E3 in failures');
  assert(ids.includes('E5'), 'E5 in failures');
}

// ============================================================================
// evaluateEligibility: FULL mode
// ============================================================================
console.log('\n── evaluateEligibility: FULL mode ────────────────────────');

// Medium confidence accepted in FULL
{
  const r = evaluateEligibility(
    goodRec(),
    goodPrompt({ confidence_level: 'medium' }),
    MODE.FULL
  );
  assertEq(r.eligible, true, 'medium OK in FULL');
  assertEq(r.mode, 'FULL', 'mode FULL');
}

// Low confidence still rejected in FULL
{
  const r = evaluateEligibility(
    goodRec(),
    goodPrompt({ confidence_level: 'low' }),
    MODE.FULL
  );
  assertEq(r.eligible, false, 'low rejected in FULL');
  assertEq(r.failures[0].id, 'E2', 'E2 still fails');
  assert(r.failures[0].reason.includes('high or medium'), 'FULL reason');
}

// ============================================================================
// getSetting
// ============================================================================
console.log('\n── getSetting ────────────────────────────────────────────');

resetState();
// Not found → default
{
  const v = await getSetting('missing_key', 'fallback');
  assertEq(v, 'fallback', 'default when missing');
}

// String data type
resetState();
settingsStore['s_key'] = { value_multilang: '"hello"', data_type: 'string' };
{
  const v = await getSetting('s_key');
  assertEq(v, 'hello', 'string value unwrapped');
}

// Boolean data type — "true" string
resetState();
settingsStore['b_key'] = { value_multilang: '"true"', data_type: 'boolean' };
{
  const v = await getSetting('b_key');
  assertEq(v, true, 'boolean true');
}

// Boolean "false"
resetState();
settingsStore['b_key'] = { value_multilang: '"false"', data_type: 'boolean' };
{
  const v = await getSetting('b_key');
  assertEq(v, false, 'boolean false');
}

// JSON data type
resetState();
settingsStore['j_key'] = { value_multilang: JSON.stringify({ a: 1, b: 2 }), data_type: 'json' };
{
  const v = await getSetting('j_key');
  assertEq(v, { a: 1, b: 2 }, 'json object');
}

// ============================================================================
// setSetting
// ============================================================================
console.log('\n── setSetting ────────────────────────────────────────────');

resetState();
{
  await setSetting('key1', 'value1', 'string', 'cat');
  assertEq(queryLog.length, 1, '1 query');
  assert(/INSERT INTO system_settings/.test(queryLog[0].sql), 'INSERT');
  assert(/ON DUPLICATE KEY UPDATE/.test(queryLog[0].sql), 'ON DUP KEY');
  // value_multilang stored as JSON-stringified string
  assertEq(queryLog[0].params[0], 'key1', 'key');
  assertEq(queryLog[0].params[1], '"value1"', 'JSON-stringified');
  assertEq(queryLog[0].params[2], 'string', 'data_type');
  assertEq(queryLog[0].params[3], 'cat', 'category');
}

// Object value
resetState();
{
  await setSetting('key2', { a: 1 }, 'json');
  assertEq(queryLog[0].params[1], '{"a":1}', 'object JSON');
  assertEq(queryLog[0].params[3], 'auto_execution', 'default category');
}

// Scalar number → stringified
resetState();
{
  await setSetting('key3', 42);
  assertEq(queryLog[0].params[1], '"42"', 'number → string → JSON');
}

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

// Defaults when nothing set
resetState();
{
  const s = await getStatus();
  assertEq(s.enabled, false, 'enabled default false');
  assertEq(s.mode, 'SAFE', 'mode default SAFE');
  assertEq(s.last_run_at, null, 'last_run_at null');
  assertEq(s.last_run_result, null, 'last_run_result null');
}

// After enable
resetState();
await enable();
{
  const s = await getStatus();
  assertEq(s.enabled, true, 'enabled after enable()');
}

// After disable
resetState();
await enable();
await disable();
{
  const s = await getStatus();
  assertEq(s.enabled, false, 'disabled after disable()');
}

// Unknown mode in store → coerced to SAFE
resetState();
settingsStore[SETTINGS.MODE] = { value_multilang: '"BOGUS"', data_type: 'string' };
{
  const s = await getStatus();
  assertEq(s.mode, 'SAFE', 'unknown mode → SAFE');
}

// ============================================================================
// setMode
// ============================================================================
console.log('\n── setMode ───────────────────────────────────────────────');

// Invalid → throws
{
  let caught: Error | null = null;
  try {
    await setMode('BOGUS');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid throws');
  assert(caught !== null && caught.message.includes('Invalid mode'), 'error message');
}

// FULL mode
resetState();
{
  const s = await setMode(MODE.FULL);
  assertEq(s.mode, 'FULL', 'mode FULL');
}

// SAFE mode
resetState();
{
  const s = await setMode(MODE.SAFE);
  assertEq(s.mode, 'SAFE', 'mode SAFE');
}

// OFF mode → also disables
resetState();
await enable();
{
  const s = await setMode(MODE.OFF);
  assertEq(s.mode, 'OFF', 'mode OFF');
  assertEq(s.enabled, false, 'OFF also disables');
}

// ============================================================================
// recordRun
// ============================================================================
console.log('\n── recordRun ─────────────────────────────────────────────');

resetState();
{
  await recordRun({ processed: 5, failed: 0 });
  assertEq(queryLog.length, 2, '2 inserts: timestamp + result');
  // First call: last_run_at
  assertEq(queryLog[0].params[0], SETTINGS.LAST_RUN_AT, 'timestamp key');
  // Second call: last_run_result (JSON)
  assertEq(queryLog[1].params[0], SETTINGS.LAST_RUN_RESULT, 'result key');
  assertEq(queryLog[1].params[2], 'json', 'json data_type');
}

// ============================================================================
// hasChainStepFailure
// ============================================================================
console.log('\n── hasChainStepFailure ───────────────────────────────────');

// Missing chain_id → false, no query
resetState();
{
  const r = await hasChainStepFailure({ id: 1, chain_step_number: 2 });
  assertEq(r, false, 'no chain_id → false');
  assertEq(queryLog.length, 0, 'no query');
}

// Missing chain_step_number → false
resetState();
{
  const r = await hasChainStepFailure({ id: 1, chain_id: 'c' });
  assertEq(r, false, 'no step number → false');
  assertEq(queryLog.length, 0, 'no query');
}

// Has chain_id + step, no failures found
resetState();
chainFailureCount = 0;
{
  const r = await hasChainStepFailure({ id: 1, chain_id: 'c', chain_step_number: 2 });
  assertEq(r, false, 'count 0 → false');
  assertEq(queryLog.length, 1, '1 query');
  assertEq(queryLog[0].params, ['c', 2, 1], 'chain_id, step, id');
}

// Has failures
resetState();
chainFailureCount = 3;
{
  const r = await hasChainStepFailure({ id: 1, chain_id: 'c', chain_step_number: 2 });
  assertEq(r, true, 'count 3 → true');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
