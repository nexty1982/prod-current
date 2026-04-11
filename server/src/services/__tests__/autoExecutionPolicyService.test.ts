#!/usr/bin/env npx tsx
/**
 * Unit tests for services/autoExecutionPolicyService.js (OMD-1095)
 *
 * A deterministic policy engine. Only DB dependency is `../config/db`
 * (getAppPool). We stub that via require.cache with a SQL-routed fake
 * pool and then require the SUT.
 *
 * Coverage:
 *   - MODE / SETTINGS / SAFE_RULES / FULL_RULES exports
 *   - evaluateEligibility:
 *       · all-pass happy path (SAFE + FULL)
 *       · each of E1-E10 individually failing
 *       · FULL mode relaxes E2 (medium confidence → passes)
 *       · multiple failures aggregated
 *       · output structure (eligible/passed_rules/failures/counts)
 *   - getSetting:
 *       · missing row → default
 *       · boolean coercion (JSON 'true'/true → true; else → false)
 *       · json path: parsed object returned; string that needs re-parse
 *       · json path: double-string that fails re-parse → default
 *       · string path: raw value returned
 *   - setSetting:
 *       · object value → JSON.stringify(value)
 *       · primitive value → JSON.stringify(String(value))
 *       · INSERT … ON DUPLICATE KEY UPDATE params in correct order
 *   - getStatus:
 *       · defaults when settings missing (enabled=false, mode=SAFE)
 *       · invalid stored mode → fallback to SAFE
 *       · last_run_result JSON string parsing (valid + invalid)
 *       · last_run_result already-object passed through
 *   - enable / disable: write ENABLED setting as boolean
 *   - setMode:
 *       · invalid mode throws
 *       · OFF also disables
 *       · valid modes persist
 *   - recordRun: writes LAST_RUN_AT + LAST_RUN_RESULT
 *   - hasChainStepFailure:
 *       · no chain_id → false (short-circuit, no DB)
 *       · no chain_step_number → false
 *       · COUNT > 0 → true
 *       · COUNT = 0 → false
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

// ── SQL-routed fake pool ────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Route = { match: RegExp; result: any };
let routes: Route[] = [];
let queryThrowsOnPattern: RegExp | null = null;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (queryThrowsOnPattern && queryThrowsOnPattern.test(sql)) {
      throw new Error('fake db failure');
    }
    for (const r of routes) {
      if (r.match.test(sql)) {
        return [r.result, []];
      }
    }
    return [[], []];
  },
};

function resetDb() {
  queryLog.length = 0;
  routes = [];
  queryThrowsOnPattern = null;
}

// Stub config/db BEFORE requiring the SUT
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

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

// ── Factories ───────────────────────────────────────────────────────
function makeRec(overrides: Partial<any> = {}): any {
  return {
    action: 'RELEASE_NOW',
    rule_id: 'R6',
    priority: 'medium',
    reason: 'Safe to release',
    ...overrides,
  };
}

function makePrompt(overrides: Partial<any> = {}): any {
  return {
    id: 'p-1',
    title: 'Test Prompt',
    queue_status: 'ready_for_release',
    confidence_level: 'high',
    evaluator_status: 'pass',
    completion_status: 'complete',
    escalation_required: 0,
    degradation_flag: 0,
    release_mode: 'auto_safe',
    chain_id: null,
    chain_step_number: null,
    _has_chain_failure: false,
    _auto_execute_excluded: false,
    ...overrides,
  };
}

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

async function main() {

// ============================================================================
// Exports — MODE / SETTINGS / rule arrays
// ============================================================================
console.log('\n── exports ───────────────────────────────────────────────');

assertEq(MODE.OFF, 'OFF', 'MODE.OFF');
assertEq(MODE.SAFE, 'SAFE', 'MODE.SAFE');
assertEq(MODE.FULL, 'FULL', 'MODE.FULL');
assertEq(Object.keys(MODE).length, 3, 'exactly 3 modes');

assertEq(SETTINGS.ENABLED, 'auto_execution_enabled', 'SETTINGS.ENABLED');
assertEq(SETTINGS.MODE, 'auto_execution_mode', 'SETTINGS.MODE');
assertEq(SETTINGS.LAST_RUN_AT, 'auto_execution_last_run_at', 'SETTINGS.LAST_RUN_AT');
assertEq(SETTINGS.LAST_RUN_RESULT, 'auto_execution_last_run_result', 'SETTINGS.LAST_RUN_RESULT');

assertEq(SAFE_RULES.length, 10, 'SAFE_RULES has 10 rules');
assertEq(FULL_RULES.length, 10, 'FULL_RULES has 10 rules');
for (let i = 1; i <= 10; i++) {
  const rule = SAFE_RULES.find((r: any) => r.id === `E${i}`);
  assert(rule !== undefined, `SAFE_RULES contains E${i}`);
  assert(typeof rule.test === 'function', `E${i} has test function`);
  assert(typeof rule.reason === 'function', `E${i} has reason function`);
}
// FULL rules mirror SAFE_RULES except E2 is relaxed
const safeE2 = SAFE_RULES.find((r: any) => r.id === 'E2');
const fullE2 = FULL_RULES.find((r: any) => r.id === 'E2');
assertEq(safeE2.name, 'confidence_high', 'SAFE E2 name = confidence_high');
assertEq(fullE2.name, 'confidence_acceptable', 'FULL E2 name = confidence_acceptable');

// ============================================================================
// evaluateEligibility — happy path (SAFE)
// ============================================================================
console.log('\n── evaluateEligibility: happy path ───────────────────────');

{
  const r = evaluateEligibility(makeRec(), makePrompt());
  assertEq(r.eligible, true, 'all rules pass → eligible');
  assertEq(r.failures.length, 0, 'no failures');
  assertEq(r.passed_count, 10, '10 passed');
  assertEq(r.total_rules, 10, '10 total');
  assertEq(r.mode, 'SAFE', 'default mode = SAFE');
  assertEq(r.prompt_id, 'p-1', 'prompt_id');
  assertEq(r.title, 'Test Prompt', 'title');
  assert(Array.isArray(r.passed_rules), 'passed_rules is array');
  assertEq(r.passed_rules.length, 10, 'passed_rules populated');
  assertEq(r.passed_rules[0].id, 'E1', 'first passed rule E1');
  assertEq(r.passed_rules[0].name, 'action_is_release', 'first passed name');
}

// overdue queue status also eligible
{
  const r = evaluateEligibility(makeRec(), makePrompt({ queue_status: 'overdue' }));
  assertEq(r.eligible, true, 'overdue queue → eligible');
}

// auto_full release mode also eligible
{
  const r = evaluateEligibility(makeRec(), makePrompt({ release_mode: 'auto_full' }));
  assertEq(r.eligible, true, 'auto_full release mode → eligible');
}

// ============================================================================
// evaluateEligibility — each rule failure (E1-E10)
// ============================================================================
console.log('\n── evaluateEligibility: per-rule failures ────────────────');

function failedIds(r: any): string[] {
  return r.failures.map((f: any) => f.id);
}

// E1: action
{
  const r = evaluateEligibility(makeRec({ action: 'FIX_REQUIRED' }), makePrompt());
  assertEq(r.eligible, false, 'E1 fail: FIX_REQUIRED');
  assert(failedIds(r).includes('E1'), 'E1 in failures');
  const e1 = r.failures.find((f: any) => f.id === 'E1');
  assert(e1.reason.includes('FIX_REQUIRED'), 'E1 reason mentions action');
}

// E2: confidence (SAFE mode — only high is allowed)
{
  const r = evaluateEligibility(makeRec(), makePrompt({ confidence_level: 'medium' }));
  assertEq(r.eligible, false, 'E2 fail: medium confidence (SAFE)');
  assert(failedIds(r).includes('E2'), 'E2 in failures');
  const e2 = r.failures.find((f: any) => f.id === 'E2');
  assert(e2.reason.includes('medium'), 'E2 reason mentions medium');
}
{
  const r = evaluateEligibility(makeRec(), makePrompt({ confidence_level: 'low' }));
  assertEq(r.eligible, false, 'E2 fail: low confidence');
}

// E3: evaluator
{
  const r = evaluateEligibility(makeRec(), makePrompt({ evaluator_status: 'fail' }));
  assertEq(r.eligible, false, 'E3 fail: evaluator fail');
  assert(failedIds(r).includes('E3'), 'E3 in failures');
}
{
  const r = evaluateEligibility(makeRec(), makePrompt({ evaluator_status: null }));
  assertEq(r.eligible, false, 'E3 fail: evaluator null');
  const e3 = r.failures.find((f: any) => f.id === 'E3');
  assert(e3.reason.includes('null'), 'E3 reason shows null');
}

// E4: completion
{
  const r = evaluateEligibility(makeRec(), makePrompt({ completion_status: 'partial' }));
  assertEq(r.eligible, false, 'E4 fail: partial completion');
  assert(failedIds(r).includes('E4'), 'E4 in failures');
}
{
  const r = evaluateEligibility(makeRec(), makePrompt({ completion_status: null }));
  assertEq(r.eligible, false, 'E4 fail: null completion');
}

// E5: escalation
{
  const r = evaluateEligibility(makeRec(), makePrompt({ escalation_required: 1 }));
  assertEq(r.eligible, false, 'E5 fail: escalation=1');
  assert(failedIds(r).includes('E5'), 'E5 in failures');
}
{
  const r = evaluateEligibility(makeRec(), makePrompt({ escalation_required: true }));
  assertEq(r.eligible, false, 'E5 fail: escalation=true');
}
// E5 pass with 0/false/null
{
  assertEq(evaluateEligibility(makeRec(), makePrompt({ escalation_required: 0 })).eligible, true, 'E5 pass: escalation=0');
  assertEq(evaluateEligibility(makeRec(), makePrompt({ escalation_required: false })).eligible, true, 'E5 pass: escalation=false');
  assertEq(evaluateEligibility(makeRec(), makePrompt({ escalation_required: null })).eligible, true, 'E5 pass: escalation=null');
}

// E6: degradation
{
  const r = evaluateEligibility(makeRec(), makePrompt({ degradation_flag: 1 }));
  assertEq(r.eligible, false, 'E6 fail: degradation=1');
  assert(failedIds(r).includes('E6'), 'E6 in failures');
}
{
  assertEq(evaluateEligibility(makeRec(), makePrompt({ degradation_flag: 0 })).eligible, true, 'E6 pass: degradation=0');
}

// E7: queue
{
  const r = evaluateEligibility(makeRec(), makePrompt({ queue_status: 'blocked' }));
  assertEq(r.eligible, false, 'E7 fail: blocked queue');
  assert(failedIds(r).includes('E7'), 'E7 in failures');
}
{
  const r = evaluateEligibility(makeRec(), makePrompt({ queue_status: 'pending' }));
  assertEq(r.eligible, false, 'E7 fail: pending queue');
}

// E8: release_mode
{
  const r = evaluateEligibility(makeRec(), makePrompt({ release_mode: 'manual' }));
  assertEq(r.eligible, false, 'E8 fail: manual release mode');
  assert(failedIds(r).includes('E8'), 'E8 in failures');
}

// E9: chain failure
{
  const r = evaluateEligibility(makeRec(), makePrompt({ _has_chain_failure: true }));
  assertEq(r.eligible, false, 'E9 fail: _has_chain_failure=true');
  assert(failedIds(r).includes('E9'), 'E9 in failures');
}

// E10: excluded
{
  const r = evaluateEligibility(makeRec(), makePrompt({ _auto_execute_excluded: true }));
  assertEq(r.eligible, false, 'E10 fail: excluded');
  assert(failedIds(r).includes('E10'), 'E10 in failures');
}

// ============================================================================
// evaluateEligibility — FULL mode relaxes E2
// ============================================================================
console.log('\n── evaluateEligibility: FULL mode ────────────────────────');

{
  // medium confidence: fails SAFE, passes FULL
  const promptMed = makePrompt({ confidence_level: 'medium' });
  const safeR = evaluateEligibility(makeRec(), promptMed, MODE.SAFE);
  const fullR = evaluateEligibility(makeRec(), promptMed, MODE.FULL);
  assertEq(safeR.eligible, false, 'SAFE: medium → fail');
  assertEq(fullR.eligible, true, 'FULL: medium → pass');
  assertEq(fullR.mode, 'FULL', 'mode reported as FULL');
}
{
  // low confidence: fails both
  const promptLow = makePrompt({ confidence_level: 'low' });
  assertEq(evaluateEligibility(makeRec(), promptLow, MODE.FULL).eligible, false, 'FULL: low confidence → fail');
}
{
  // high confidence: passes both
  assertEq(evaluateEligibility(makeRec(), makePrompt(), MODE.FULL).eligible, true, 'FULL: high confidence → pass');
}
{
  // Other rules still block in FULL mode
  const r = evaluateEligibility(makeRec(), makePrompt({ escalation_required: 1 }), MODE.FULL);
  assertEq(r.eligible, false, 'FULL: escalation still blocks');
}

// ============================================================================
// evaluateEligibility — multiple failures aggregated
// ============================================================================
console.log('\n── evaluateEligibility: multiple failures ────────────────');

{
  const r = evaluateEligibility(
    makeRec({ action: 'FIX_REQUIRED' }),
    makePrompt({
      confidence_level: 'low',
      evaluator_status: 'fail',
      completion_status: 'failed',
      escalation_required: 1,
      degradation_flag: 1,
      queue_status: 'blocked',
      release_mode: 'manual',
      _has_chain_failure: true,
      _auto_execute_excluded: true,
    })
  );
  assertEq(r.eligible, false, 'all fail → ineligible');
  assertEq(r.failures.length, 10, 'all 10 rules failed');
  assertEq(r.passed_count, 0, 'zero passed');
  // Check failure ordering follows rules array order
  assertEq(r.failures[0].id, 'E1', 'failures[0] = E1');
  assertEq(r.failures[9].id, 'E10', 'failures[9] = E10');
}

// ============================================================================
// getSetting — missing row → default
// ============================================================================
console.log('\n── getSetting ────────────────────────────────────────────');

resetDb();
routes = [{ match: /SELECT value_multilang/, result: [] }];
{
  const v = await getSetting('missing_key', 'defaultVal');
  assertEq(v, 'defaultVal', 'missing row returns default');
  assertEq(queryLog[0].params[0], 'missing_key', 'key param passed');
}

// boolean data_type: outer JSON unwraps "true" string → raw==='true'
resetDb();
routes = [{
  match: /SELECT value_multilang/,
  result: [{ value_multilang: '"true"', data_type: 'boolean' }],
}];
{
  const v = await getSetting('enabled');
  assertEq(v, true, 'boolean "true" → true');
}

resetDb();
routes = [{
  match: /SELECT value_multilang/,
  result: [{ value_multilang: '"false"', data_type: 'boolean' }],
}];
{
  const v = await getSetting('enabled');
  assertEq(v, false, 'boolean "false" → false');
}

// boolean when JSON stores raw true (unwraps to boolean)
resetDb();
routes = [{
  match: /SELECT value_multilang/,
  result: [{ value_multilang: 'true', data_type: 'boolean' }],
}];
{
  const v = await getSetting('enabled');
  assertEq(v, true, 'boolean raw true → true');
}

// json data_type: double-parsed path — value_multilang stores JSON string,
// which when outer-parsed yields a string that needs re-parsing to get object
resetDb();
routes = [{
  match: /SELECT value_multilang/,
  result: [{ value_multilang: '"{\\"a\\":1}"', data_type: 'json' }],
}];
{
  const v = await getSetting('cfg');
  assertEq(v, { a: 1 }, 'json string re-parsed → object');
}

// json data_type: outer parse yields object directly
resetDb();
routes = [{
  match: /SELECT value_multilang/,
  result: [{ value_multilang: '{"a":2}', data_type: 'json' }],
}];
{
  const v = await getSetting('cfg');
  assertEq(v, { a: 2 }, 'json object returned directly');
}

// json data_type: un-parseable string → default
resetDb();
routes = [{
  match: /SELECT value_multilang/,
  result: [{ value_multilang: '"not valid json"', data_type: 'json' }],
}];
{
  const v = await getSetting('cfg', { fallback: true });
  assertEq(v, { fallback: true }, 'invalid inner json → default');
}

// string data_type: raw value returned
resetDb();
routes = [{
  match: /SELECT value_multilang/,
  result: [{ value_multilang: '"hello"', data_type: 'string' }],
}];
{
  const v = await getSetting('greeting');
  assertEq(v, 'hello', 'string → raw');
}

// ============================================================================
// setSetting — INSERT … ON DUPLICATE KEY
// ============================================================================
console.log('\n── setSetting ────────────────────────────────────────────');

// primitive value → JSON.stringify(String(value))
resetDb();
await setSetting('k1', 'v1', 'string', 'cat1');
{
  assertEq(queryLog.length, 1, 'one query');
  assert(/INSERT INTO system_settings/.test(queryLog[0].sql), 'INSERT statement');
  assert(/ON DUPLICATE KEY UPDATE/.test(queryLog[0].sql), 'has ON DUPLICATE KEY');
  assertEq(queryLog[0].params[0], 'k1', 'param0 = key');
  assertEq(queryLog[0].params[1], '"v1"', 'param1 = JSON.stringify(String("v1"))');
  assertEq(queryLog[0].params[2], 'string', 'param2 = data_type');
  assertEq(queryLog[0].params[3], 'cat1', 'param3 = category');
  assertEq(queryLog[0].params[4], '"v1"', 'param4 = value (for UPDATE)');
}

// object value → JSON.stringify(value)
resetDb();
await setSetting('k2', { a: 1, b: 'x' }, 'json');
{
  assertEq(queryLog[0].params[1], '{"a":1,"b":"x"}', 'object JSON-stringified');
  assertEq(queryLog[0].params[2], 'json', 'data_type json');
  assertEq(queryLog[0].params[3], 'auto_execution', 'default category');
}

// null value → 'null' (typeof null === 'object' → JSON.stringify(null))
resetDb();
await setSetting('k3', null, 'json');
{
  assertEq(queryLog[0].params[1], 'null', 'null value → "null"');
}

// number value: typeof 'number' !== 'object' → JSON.stringify(String(42)) = '"42"'
resetDb();
await setSetting('k4', 42, 'string');
{
  assertEq(queryLog[0].params[1], '"42"', 'number → String → JSON string');
}

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

// all missing → defaults
resetDb();
routes = [{ match: /SELECT value_multilang/, result: [] }];
{
  const s = await getStatus();
  assertEq(s.enabled, false, 'default enabled=false');
  assertEq(s.mode, 'SAFE', 'default mode=SAFE');
  assertEq(s.last_run_at, null, 'default last_run_at=null');
  assertEq(s.last_run_result, null, 'default last_run_result=null');
}

// enabled stored as boolean true, mode SAFE
resetDb();
{
  const rowMap: Record<string, any[]> = {
    auto_execution_enabled: [{ value_multilang: '"true"', data_type: 'boolean' }],
    auto_execution_mode: [{ value_multilang: '"SAFE"', data_type: 'string' }],
    auto_execution_last_run_at: [{ value_multilang: '"2026-04-11T00:00:00Z"', data_type: 'string' }],
    auto_execution_last_run_result: [{ value_multilang: '{"ok":true,"count":5}', data_type: 'json' }],
  };
  fakePool.query = async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (/SELECT value_multilang/.test(sql)) {
      return [rowMap[params[0]] || [], []];
    }
    return [[], []];
  };
  const s = await getStatus();
  assertEq(s.enabled, true, 'enabled=true');
  assertEq(s.mode, 'SAFE', 'mode=SAFE');
  assertEq(s.last_run_at, '2026-04-11T00:00:00Z', 'last_run_at');
  assertEq(s.last_run_result, { ok: true, count: 5 }, 'last_run_result parsed');
}

// Invalid stored mode → falls back to SAFE
resetDb();
{
  const rowMap: Record<string, any[]> = {
    auto_execution_mode: [{ value_multilang: '"BOGUS"', data_type: 'string' }],
  };
  fakePool.query = async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (/SELECT value_multilang/.test(sql)) {
      return [rowMap[params[0]] || [], []];
    }
    return [[], []];
  };
  const s = await getStatus();
  assertEq(s.mode, 'SAFE', 'invalid mode → SAFE fallback');
}

// FULL mode persists
resetDb();
{
  const rowMap: Record<string, any[]> = {
    auto_execution_mode: [{ value_multilang: '"FULL"', data_type: 'string' }],
  };
  fakePool.query = async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (/SELECT value_multilang/.test(sql)) {
      return [rowMap[params[0]] || [], []];
    }
    return [[], []];
  };
  const s = await getStatus();
  assertEq(s.mode, 'FULL', 'FULL mode persists');
}

// last_run_result as string that can't be parsed → null (via inline catch)
resetDb();
{
  // Store a plain string in json-typed setting: getSetting will double-parse
  // "\"not json{\"" → inner string "not json{" → JSON.parse fails → returns default (null)
  const rowMap: Record<string, any[]> = {
    auto_execution_last_run_result: [{ value_multilang: '"not json{"', data_type: 'json' }],
  };
  fakePool.query = async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (/SELECT value_multilang/.test(sql)) {
      return [rowMap[params[0]] || [], []];
    }
    return [[], []];
  };
  const s = await getStatus();
  // getSetting returns defaultValue (null) because inner parse fails
  assertEq(s.last_run_result, null, 'unparseable last_run_result → null');
}

// ============================================================================
// enable / disable
// ============================================================================
console.log('\n── enable / disable ──────────────────────────────────────');

// enable: writes ENABLED=true
resetDb();
fakePool.query = async (sql: string, params: any[] = []) => {
  queryLog.push({ sql, params });
  if (/SELECT value_multilang/.test(sql)) return [[], []];
  return [{}, []];
};
{
  const s = await enable();
  // Find the INSERT for auto_execution_enabled
  const inserts = queryLog.filter(c => /INSERT INTO system_settings/.test(c.sql));
  assertEq(inserts.length, 1, 'enable(): 1 INSERT');
  assertEq(inserts[0].params[0], 'auto_execution_enabled', 'key = auto_execution_enabled');
  assertEq(inserts[0].params[1], '"true"', 'value = JSON.stringify("true")');
  assertEq(inserts[0].params[2], 'boolean', 'data_type = boolean');
  // Verify getStatus was also called (getStatus queries SELECTs)
  const selects = queryLog.filter(c => /SELECT value_multilang/.test(c.sql));
  assert(selects.length >= 4, 'enable() returns getStatus() result');
}

// disable: writes ENABLED=false
resetDb();
fakePool.query = async (sql: string, params: any[] = []) => {
  queryLog.push({ sql, params });
  if (/SELECT value_multilang/.test(sql)) return [[], []];
  return [{}, []];
};
{
  await disable();
  const inserts = queryLog.filter(c => /INSERT INTO system_settings/.test(c.sql));
  assertEq(inserts[0].params[0], 'auto_execution_enabled', 'key = auto_execution_enabled');
  assertEq(inserts[0].params[1], '"false"', 'value = JSON.stringify("false")');
}

// ============================================================================
// setMode
// ============================================================================
console.log('\n── setMode ───────────────────────────────────────────────');

// Invalid mode throws
resetDb();
{
  let caught: Error | null = null;
  try { await setMode('BOGUS'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid mode throws');
  assert(caught !== null && caught.message.includes('Invalid mode'), 'message mentions Invalid mode');
  assertEq(queryLog.length, 0, 'no DB calls on throw');
}

// Valid SAFE mode
resetDb();
fakePool.query = async (sql: string, params: any[] = []) => {
  queryLog.push({ sql, params });
  if (/SELECT value_multilang/.test(sql)) return [[], []];
  return [{}, []];
};
{
  await setMode('SAFE');
  const inserts = queryLog.filter(c => /INSERT INTO system_settings/.test(c.sql));
  // SAFE does NOT also set ENABLED — only OFF does
  assertEq(inserts.length, 1, 'SAFE: 1 INSERT (mode only)');
  assertEq(inserts[0].params[0], 'auto_execution_mode', 'mode key');
  assertEq(inserts[0].params[1], '"SAFE"', 'mode value');
}

// Valid FULL mode
resetDb();
fakePool.query = async (sql: string, params: any[] = []) => {
  queryLog.push({ sql, params });
  if (/SELECT value_multilang/.test(sql)) return [[], []];
  return [{}, []];
};
{
  await setMode('FULL');
  const inserts = queryLog.filter(c => /INSERT INTO system_settings/.test(c.sql));
  assertEq(inserts.length, 1, 'FULL: 1 INSERT');
  assertEq(inserts[0].params[1], '"FULL"', 'FULL value');
}

// OFF also disables
resetDb();
fakePool.query = async (sql: string, params: any[] = []) => {
  queryLog.push({ sql, params });
  if (/SELECT value_multilang/.test(sql)) return [[], []];
  return [{}, []];
};
{
  await setMode('OFF');
  const inserts = queryLog.filter(c => /INSERT INTO system_settings/.test(c.sql));
  assertEq(inserts.length, 2, 'OFF: 2 INSERTs (disable + mode)');
  // First: ENABLED=false
  assertEq(inserts[0].params[0], 'auto_execution_enabled', 'first: ENABLED');
  assertEq(inserts[0].params[1], '"false"', 'first: false');
  // Second: MODE=OFF
  assertEq(inserts[1].params[0], 'auto_execution_mode', 'second: MODE');
  assertEq(inserts[1].params[1], '"OFF"', 'second: OFF');
}

// ============================================================================
// recordRun
// ============================================================================
console.log('\n── recordRun ─────────────────────────────────────────────');

resetDb();
fakePool.query = async (sql: string, params: any[] = []) => {
  queryLog.push({ sql, params });
  return [{}, []];
};
{
  const result = { processed: 5, eligible: 3, errors: [] };
  await recordRun(result);
  const inserts = queryLog.filter(c => /INSERT INTO system_settings/.test(c.sql));
  assertEq(inserts.length, 2, '2 INSERTs (at + result)');
  assertEq(inserts[0].params[0], 'auto_execution_last_run_at', 'first: LAST_RUN_AT');
  assertEq(inserts[0].params[2], 'string', 'at is string');
  // ISO 8601 format
  assert(/^"\d{4}-\d{2}-\d{2}T/.test(inserts[0].params[1]), 'at is ISO 8601');
  assertEq(inserts[1].params[0], 'auto_execution_last_run_result', 'second: LAST_RUN_RESULT');
  assertEq(inserts[1].params[2], 'json', 'result is json');
  assertEq(inserts[1].params[1], JSON.stringify(result), 'result JSON-stringified');
}

// ============================================================================
// hasChainStepFailure
// ============================================================================
console.log('\n── hasChainStepFailure ───────────────────────────────────');

// No chain_id → false (short circuit, no DB)
resetDb();
fakePool.query = async (sql: string, params: any[] = []) => {
  queryLog.push({ sql, params });
  return [[], []];
};
{
  const r = await hasChainStepFailure({ chain_id: null, chain_step_number: 1, id: 10 });
  assertEq(r, false, 'no chain_id → false');
  assertEq(queryLog.length, 0, 'no DB query');
}

// No chain_step_number → false
resetDb();
fakePool.query = async (sql: string, params: any[] = []) => {
  queryLog.push({ sql, params });
  return [[], []];
};
{
  const r = await hasChainStepFailure({ chain_id: 'c1', chain_step_number: null, id: 10 });
  assertEq(r, false, 'no chain_step_number → false');
  assertEq(queryLog.length, 0, 'no DB query');
}

// COUNT > 0 → true
resetDb();
fakePool.query = async (sql: string, params: any[] = []) => {
  queryLog.push({ sql, params });
  if (/COUNT\(\*\)/.test(sql)) return [[{ cnt: 2 }], []];
  return [[], []];
};
{
  const r = await hasChainStepFailure({ chain_id: 'c1', chain_step_number: 3, id: 99 });
  assertEq(r, true, 'COUNT > 0 → true');
  assertEq(queryLog.length, 1, 'one query');
  assertEq(queryLog[0].params[0], 'c1', 'param0 = chain_id');
  assertEq(queryLog[0].params[1], 3, 'param1 = chain_step_number');
  assertEq(queryLog[0].params[2], 99, 'param2 = id (exclude self)');
  assert(/om_prompt_registry/.test(queryLog[0].sql), 'queries om_prompt_registry');
  assert(/completion_status = 'failed'/.test(queryLog[0].sql), 'checks failed completion');
  assert(/evaluator_status = 'fail'/.test(queryLog[0].sql), 'checks fail evaluator');
  assert(/id != \?/.test(queryLog[0].sql), 'excludes self');
}

// COUNT = 0 → false
resetDb();
fakePool.query = async (sql: string, params: any[] = []) => {
  queryLog.push({ sql, params });
  if (/COUNT\(\*\)/.test(sql)) return [[{ cnt: 0 }], []];
  return [[], []];
};
{
  const r = await hasChainStepFailure({ chain_id: 'c1', chain_step_number: 3, id: 99 });
  assertEq(r, false, 'COUNT = 0 → false');
}

// String count coerced via Number()
resetDb();
fakePool.query = async (sql: string, params: any[] = []) => {
  queryLog.push({ sql, params });
  if (/COUNT\(\*\)/.test(sql)) return [[{ cnt: '5' }], []];
  return [[], []];
};
{
  const r = await hasChainStepFailure({ chain_id: 'c1', chain_step_number: 3, id: 99 });
  assertEq(r, true, 'string count coerced to number');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
