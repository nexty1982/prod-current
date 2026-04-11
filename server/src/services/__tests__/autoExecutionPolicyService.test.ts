#!/usr/bin/env npx tsx
/**
 * Unit tests for services/autoExecutionPolicyService.js (OMD-1015)
 *
 * Policy engine with pure evaluation + system_settings CRUD. Stubs
 * ../config/db.getAppPool with a SQL-routed fake pool.
 *
 * Coverage:
 *   - MODE / SETTINGS constants
 *   - evaluateEligibility (SAFE mode): all 10 rules pass happy path,
 *     each rule failure isolated, FULL mode relaxed confidence (accepts
 *     medium), shape of result (passed_rules / failures / counts)
 *   - getSetting: not found → default; boolean true/false; json unwrap;
 *     plain string
 *   - setSetting: JSON encoding of string / object values
 *   - getStatus: defaults when no rows; mode validation (invalid → SAFE);
 *     last_run_result JSON unwrap
 *   - enable/disable/setMode: persists correct values; OFF also disables;
 *     invalid mode throws
 *   - recordRun: writes last_run_at + last_run_result
 *   - hasChainStepFailure: returns false when no chain_id; queries when
 *     present; returns true when cnt>0
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

// ─── Stub config/db.getAppPool ───────────────────────────────────────
type Route = { match: RegExp; rows?: any };
const queryLog: { sql: string; params: any[] }[] = [];
let routes: Route[] = [];
const settingsMap: Record<string, { value_multilang: string; data_type: string }> = {};

// The SELECT for getSetting uses key_name parameter; route based on query type
const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    // SELECT from system_settings
    if (/SELECT value_multilang, data_type FROM system_settings/.test(sql)) {
      const key = params[0];
      if (settingsMap[key]) return [[settingsMap[key]], {}];
      return [[], {}];
    }
    // INSERT/UPDATE into system_settings (upsert)
    if (/INSERT INTO system_settings/.test(sql)) {
      const [key, jsonValue, dataType] = params;
      settingsMap[key] = { value_multilang: jsonValue, data_type: dataType };
      return [{}, {}];
    }
    // Routed overrides
    for (const r of routes) {
      if (r.match.test(sql)) return [r.rows ?? [], {}];
    }
    return [[], {}];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

function resetState() {
  queryLog.length = 0;
  routes = [];
  for (const k of Object.keys(settingsMap)) delete settingsMap[k];
}

const svc = require('../autoExecutionPolicyService');
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
} = svc;

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── MODE / SETTINGS ───────────────────────────────────────');

assertEq(MODE.OFF, 'OFF', 'MODE.OFF');
assertEq(MODE.SAFE, 'SAFE', 'MODE.SAFE');
assertEq(MODE.FULL, 'FULL', 'MODE.FULL');
assertEq(SETTINGS.ENABLED, 'auto_execution_enabled', 'ENABLED key');
assertEq(SETTINGS.MODE, 'auto_execution_mode', 'MODE key');
assertEq(SAFE_RULES.length, 10, '10 SAFE rules');
assertEq(FULL_RULES.length, 10, '10 FULL rules');

// ============================================================================
// evaluateEligibility — happy path
// ============================================================================
console.log('\n── evaluateEligibility: happy path ───────────────────────');

function makeValidPrompt(overrides: any = {}) {
  return {
    id: 101,
    title: 'test prompt',
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
function makeRelease() {
  return { action: 'RELEASE_NOW' };
}

{
  const result = evaluateEligibility(makeRelease(), makeValidPrompt(), MODE.SAFE);
  assertEq(result.eligible, true, 'eligible=true');
  assertEq(result.prompt_id, 101, 'prompt_id');
  assertEq(result.passed_count, 10, 'all 10 passed');
  assertEq(result.failures.length, 0, 'no failures');
  assertEq(result.total_rules, 10, 'total rules');
  assertEq(result.mode, 'SAFE', 'mode echoed');
  assertEq(result.title, 'test prompt', 'title echoed');
}

// ============================================================================
// evaluateEligibility — each rule can fail
// ============================================================================
console.log('\n── evaluateEligibility: individual failures ──────────────');

// E1: action
{
  const r = evaluateEligibility({ action: 'HOLD' }, makeValidPrompt());
  assertEq(r.eligible, false, 'E1 fails when not RELEASE_NOW');
  assert(r.failures.some((f: any) => f.id === 'E1'), 'E1 in failures');
}

// E2: confidence
{
  const r = evaluateEligibility(makeRelease(), makeValidPrompt({ confidence_level: 'medium' }));
  assertEq(r.eligible, false, 'E2 fails on non-high in SAFE');
  assert(r.failures.some((f: any) => f.id === 'E2'), 'E2 in failures');
}

// E3: evaluator_status
{
  const r = evaluateEligibility(makeRelease(), makeValidPrompt({ evaluator_status: 'fail' }));
  assert(r.failures.some((f: any) => f.id === 'E3'), 'E3 in failures');
}
// E3: null
{
  const r = evaluateEligibility(makeRelease(), makeValidPrompt({ evaluator_status: null }));
  assert(
    r.failures.some((f: any) => f.id === 'E3' && f.reason.includes('null')),
    'E3 reason mentions null'
  );
}

// E4: completion
{
  const r = evaluateEligibility(makeRelease(), makeValidPrompt({ completion_status: 'in_progress' }));
  assert(r.failures.some((f: any) => f.id === 'E4'), 'E4 in failures');
}

// E5: escalation
{
  const r = evaluateEligibility(makeRelease(), makeValidPrompt({ escalation_required: true }));
  assert(r.failures.some((f: any) => f.id === 'E5'), 'E5 in failures');
}

// E6: degradation
{
  const r = evaluateEligibility(makeRelease(), makeValidPrompt({ degradation_flag: true }));
  assert(r.failures.some((f: any) => f.id === 'E6'), 'E6 in failures');
}

// E7: queue_status
{
  const r = evaluateEligibility(makeRelease(), makeValidPrompt({ queue_status: 'waiting' }));
  assert(r.failures.some((f: any) => f.id === 'E7'), 'E7 in failures');
}
// E7: overdue is also allowed
{
  const r = evaluateEligibility(makeRelease(), makeValidPrompt({ queue_status: 'overdue' }));
  assertEq(r.eligible, true, 'overdue queue_status allowed');
}

// E8: release_mode
{
  const r = evaluateEligibility(makeRelease(), makeValidPrompt({ release_mode: 'manual' }));
  assert(r.failures.some((f: any) => f.id === 'E8'), 'E8 in failures');
}
{
  const r = evaluateEligibility(makeRelease(), makeValidPrompt({ release_mode: 'auto_full' }));
  assertEq(r.eligible, true, 'auto_full allowed');
}

// E9: prior chain failure
{
  const r = evaluateEligibility(makeRelease(), makeValidPrompt({ _has_chain_failure: true }));
  assert(r.failures.some((f: any) => f.id === 'E9'), 'E9 in failures');
}

// E10: operator excluded
{
  const r = evaluateEligibility(makeRelease(), makeValidPrompt({ _auto_execute_excluded: true }));
  assert(r.failures.some((f: any) => f.id === 'E10'), 'E10 in failures');
}

// Multiple failures at once
{
  const r = evaluateEligibility(
    { action: 'HOLD' },
    makeValidPrompt({ confidence_level: 'low', escalation_required: true })
  );
  assertEq(r.failures.length, 3, '3 failures captured');
  assertEq(r.passed_count, 7, '7 passed');
}

// ============================================================================
// evaluateEligibility — FULL mode
// ============================================================================
console.log('\n── evaluateEligibility: FULL mode ────────────────────────');

// medium confidence allowed in FULL
{
  const r = evaluateEligibility(
    makeRelease(),
    makeValidPrompt({ confidence_level: 'medium' }),
    MODE.FULL
  );
  assertEq(r.eligible, true, 'medium confidence eligible in FULL');
  assertEq(r.mode, 'FULL', 'mode=FULL');
}

// low still fails
{
  const r = evaluateEligibility(
    makeRelease(),
    makeValidPrompt({ confidence_level: 'low' }),
    MODE.FULL
  );
  assertEq(r.eligible, false, 'low confidence still fails FULL');
  assert(r.failures.some((f: any) => f.id === 'E2'), 'E2 fails');
}

// ============================================================================
// getSetting
// ============================================================================
console.log('\n── getSetting ────────────────────────────────────────────');

// Not found → default
resetState();
{
  const v = await getSetting('missing', 'fallback');
  assertEq(v, 'fallback', 'missing → default');
}
{
  const v = await getSetting('missing');
  assertEq(v, null, 'default defaults to null');
}

// Boolean true
resetState();
settingsMap['b1'] = { value_multilang: JSON.stringify('true'), data_type: 'boolean' };
{
  const v = await getSetting('b1');
  assertEq(v, true, 'boolean "true" string → true');
}

// Boolean false
settingsMap['b2'] = { value_multilang: JSON.stringify('false'), data_type: 'boolean' };
{
  const v = await getSetting('b2');
  assertEq(v, false, 'boolean "false" string → false');
}

// String value (wrapped in JSON)
settingsMap['s1'] = { value_multilang: JSON.stringify('hello'), data_type: 'string' };
{
  const v = await getSetting('s1');
  assertEq(v, 'hello', 'string unwrapped');
}

// JSON value (stored as JSON-stringified object)
settingsMap['j1'] = { value_multilang: JSON.stringify({ foo: 'bar', n: 1 }), data_type: 'json' };
{
  const v = await getSetting('j1');
  assertEq(v, { foo: 'bar', n: 1 }, 'json object returned');
}

// JSON value stored as double-stringified (edge case)
settingsMap['j2'] = {
  value_multilang: JSON.stringify(JSON.stringify({ nested: true })),
  data_type: 'json',
};
{
  const v = await getSetting('j2');
  assertEq(v, { nested: true }, 'double-stringified JSON re-parsed');
}

// ============================================================================
// setSetting
// ============================================================================
console.log('\n── setSetting ────────────────────────────────────────────');

resetState();
await setSetting('mykey', 'myvalue', 'string', 'mycat');
{
  // Should round-trip via getSetting
  const v = await getSetting('mykey');
  assertEq(v, 'myvalue', 'string round-trip');
}

await setSetting('obj', { a: 1, b: [2, 3] }, 'json');
{
  const v = await getSetting('obj');
  assertEq(v, { a: 1, b: [2, 3] }, 'object round-trip');
}

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

// Defaults when unset
resetState();
{
  const s = await getStatus();
  assertEq(s.enabled, false, 'default enabled=false');
  assertEq(s.mode, 'SAFE', 'default mode=SAFE');
  assertEq(s.last_run_at, null, 'default last_run_at=null');
  assertEq(s.last_run_result, null, 'default last_run_result=null');
}

// Invalid mode → falls back to SAFE
resetState();
settingsMap[SETTINGS.MODE] = {
  value_multilang: JSON.stringify('BOGUS'),
  data_type: 'string',
};
{
  const s = await getStatus();
  assertEq(s.mode, 'SAFE', 'invalid mode coerced to SAFE');
}

// ============================================================================
// enable / disable / setMode
// ============================================================================
console.log('\n── enable / disable / setMode ────────────────────────────');

resetState();
{
  const s = await enable();
  assertEq(s.enabled, true, 'enable → enabled=true');
}

{
  const s = await disable();
  assertEq(s.enabled, false, 'disable → enabled=false');
}

// setMode happy paths
{
  const s = await setMode('FULL');
  assertEq(s.mode, 'FULL', 'setMode FULL');
}

{
  const s = await setMode('SAFE');
  assertEq(s.mode, 'SAFE', 'setMode SAFE');
}

// setMode OFF also disables
resetState();
await enable();
{
  const s = await setMode('OFF');
  assertEq(s.mode, 'OFF', 'setMode OFF');
  assertEq(s.enabled, false, 'OFF also disables');
}

// Invalid mode throws
{
  let caught: Error | null = null;
  try { await setMode('BOGUS'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid mode throws');
  assert(caught !== null && caught.message.includes('Invalid mode'),
    'error mentions Invalid mode');
}

// ============================================================================
// recordRun
// ============================================================================
console.log('\n── recordRun ─────────────────────────────────────────────');

resetState();
await recordRun({ success: true, executed: 5, skipped: 2 });
{
  const at = await getSetting(SETTINGS.LAST_RUN_AT);
  const res = await getSetting(SETTINGS.LAST_RUN_RESULT);
  assertEq(typeof at, 'string', 'last_run_at is string');
  assert((at as string).includes('T'), 'ISO timestamp format');
  assertEq(res, { success: true, executed: 5, skipped: 2 }, 'result round-trip');
}

// ============================================================================
// hasChainStepFailure
// ============================================================================
console.log('\n── hasChainStepFailure ───────────────────────────────────');

// No chain_id → false
{
  const r = await hasChainStepFailure({ id: 1 });
  assertEq(r, false, 'no chain_id → false');
}

// No chain_step_number → false
{
  const r = await hasChainStepFailure({ id: 1, chain_id: 'c1' });
  assertEq(r, false, 'no chain_step_number → false');
}

// With chain data, cnt=0 → false
resetState();
// Override the general route for this specific query
const origQuery = fakePool.query;
(fakePool as any).query = async (sql: string, params: any[]) => {
  queryLog.push({ sql, params });
  if (/om_prompt_registry/.test(sql)) {
    return [[{ cnt: 0 }], {}];
  }
  return origQuery.call(fakePool, sql, params);
};
{
  const r = await hasChainStepFailure({ id: 1, chain_id: 'c1', chain_step_number: 2 });
  assertEq(r, false, 'cnt=0 → false');
  const call = queryLog[queryLog.length - 1];
  assertEq(call.params, ['c1', 2, 1], 'chain_id, step, id params');
}

// cnt > 0 → true
(fakePool as any).query = async (sql: string, params: any[]) => {
  queryLog.push({ sql, params });
  if (/om_prompt_registry/.test(sql)) {
    return [[{ cnt: 3 }], {}];
  }
  return origQuery.call(fakePool, sql, params);
};
{
  const r = await hasChainStepFailure({ id: 1, chain_id: 'c1', chain_step_number: 2 });
  assertEq(r, true, 'cnt>0 → true');
}

// Restore
(fakePool as any).query = origQuery;

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
