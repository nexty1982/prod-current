#!/usr/bin/env npx tsx
/**
 * Unit tests for services/resultSelectionService.js (OMD-1003)
 *
 * Covers:
 *   Pure:
 *     - COMPLETION_RANK + VALID_COMPLETION_STATUSES
 *     - _scoreResult         deterministic scoring, null handling, violation clamp
 *
 *   SQL-routed fake pool:
 *     - evaluateResult       invalid status, invalid confidence, dedup skip,
 *                             happy path persist, force re-eval, not-found
 *     - selectBestResult     no results, single-result auto-select, unevaluated
 *                             guard, happy path 3-agent compare with UPDATE+INSERT,
 *                             tie-breaker: agent_priority, tie-breaker: duration,
 *                             selection_reason structure
 *     - getComparison        not found, happy path with JSON parsing
 *     - getResultsForStep    SQL match, JSON parsing of violations_found
 *     - getAgentResults      SQL match, limit, JSON parsing
 *
 * Run: npx tsx server/src/services/__tests__/resultSelectionService.test.ts
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

// ── SQL-routed fake pool ──────────────────────────────────────────────────
type Route = { match: RegExp; rows: any[]; result?: any };
let routes: Route[] = [];
const queryCalls: Array<{ sql: string; params: any[] }> = [];

function resetPool() {
  routes = [];
  queryCalls.length = 0;
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryCalls.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) return [r.rows, r.result ?? {}];
    }
    return [[], {}];
  },
};

// ── Stub ../config/db BEFORE requiring SUT ───────────────────────────────
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// ── Stub uuid ─────────────────────────────────────────────────────────────
let uuidCounter = 0;
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: { v4: () => `uuid-${++uuidCounter}` },
} as any;

const svc = require('../resultSelectionService');
const {
  COMPLETION_RANK,
  VALID_COMPLETION_STATUSES,
  evaluateResult,
  selectBestResult,
  getComparison,
  getResultsForStep,
  getAgentResults,
  _scoreResult,
} = svc;

async function main() {

// ============================================================================
// COMPLETION_RANK sanity
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');
assertEq(COMPLETION_RANK.success, 5, 'success = 5');
assertEq(COMPLETION_RANK.partial, 3, 'partial = 3');
assertEq(COMPLETION_RANK.failure, 1, 'failure = 1');
assertEq(COMPLETION_RANK.blocked, 0, 'blocked = 0');
assertEq(COMPLETION_RANK.timeout, 0, 'timeout = 0');
assert(VALID_COMPLETION_STATUSES.includes('success'), 'valid statuses include success');
assertEq(VALID_COMPLETION_STATUSES.length, 5, '5 valid statuses');

// ============================================================================
// _scoreResult
// ============================================================================
console.log('\n── _scoreResult ──────────────────────────────────────────');

// Perfect score
{
  const s = _scoreResult({
    id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10,
    prompt_plan_step_id: 'step1', execution_duration_ms: 1500,
    completion_status: 'success', violation_count: 0, confidence: 1.0,
  });
  assertEq(s.result_id, 'r1', 'result_id');
  assertEq(s.completion_rank, 5, 'success → 5');
  assertEq(s.violation_rank, 10, '0 violations → 10');
  assertEq(s.confidence_rank, 10, '1.0 confidence → 10');
  assertEq(s.total_score, 5 * 100 + 10 * 10 + 10, 'total 610');
}

// Violations clamp at 0 minimum
{
  const s = _scoreResult({
    id: 'r', agent_id: 'a', completion_status: 'success', violation_count: 20, confidence: 1.0,
  });
  assertEq(s.violation_rank, 0, 'violation_rank floored to 0');
  assertEq(s.total_score, 5 * 100 + 0 * 10 + 10, 'total 510');
}

// Null fields handled
{
  const s = _scoreResult({
    id: 'r', agent_id: 'a', completion_status: 'failure',
    violation_count: null, confidence: null,
  });
  assertEq(s.violation_count, 0, 'null violation_count → 0');
  assertEq(s.confidence, 0, 'null confidence → 0');
  assertEq(s.confidence_rank, 0, '0 confidence → 0');
  assertEq(s.total_score, 1 * 100 + 10 * 10 + 0, 'failure+0+0 → 200');
}

// Unknown completion_status → 0
{
  const s = _scoreResult({
    id: 'r', agent_id: 'a', completion_status: 'weird_state', violation_count: 0, confidence: 0.5,
  });
  assertEq(s.completion_rank, 0, 'unknown → 0');
}

// Default agent_priority = 50
{
  const s = _scoreResult({ id: 'r', agent_id: 'a', completion_status: 'partial' });
  assertEq(s.agent_priority, 50, 'default priority 50');
}

// Confidence rounding
{
  const s = _scoreResult({
    id: 'r', agent_id: 'a', completion_status: 'success', violation_count: 0, confidence: 0.75,
  });
  assertEq(s.confidence_rank, 8, '0.75 → round(7.5) = 8');
}

// ============================================================================
// evaluateResult: validation
// ============================================================================
console.log('\n── evaluateResult: validation ────────────────────────────');

// Invalid completion_status
{
  let caught: Error | null = null;
  try {
    await evaluateResult('r1', { completion_status: 'bogus' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid status throws');
  assert(caught !== null && caught.message.includes('Invalid'), 'error mentions invalid');
}

// Invalid confidence out of range
{
  let caught: Error | null = null;
  try {
    await evaluateResult('r1', { completion_status: 'success', confidence: 1.5 });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'confidence > 1 throws');
}
{
  let caught: Error | null = null;
  try {
    await evaluateResult('r1', { completion_status: 'success', confidence: -0.1 });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'confidence < 0 throws');
}

// ============================================================================
// evaluateResult: dedup skip
// ============================================================================
console.log('\n── evaluateResult: dedup ─────────────────────────────────');

resetPool();
routes = [
  {
    match: /SELECT evaluator_status, completion_status, confidence/,
    rows: [{ evaluator_status: 'evaluated', completion_status: 'success', confidence: 0.9 }],
  },
];
{
  const r = await evaluateResult('r1', { completion_status: 'partial', confidence: 0.5 });
  assertEq(r.skipped, true, 'dedup skip');
  assertEq(r.completion_status, 'success', 'returns existing status');
  // Only 1 query made (SELECT, no UPDATE)
  const updateCalls = queryCalls.filter(c => /^UPDATE/i.test(c.sql.trim()));
  assertEq(updateCalls.length, 0, 'no UPDATE when dedup');
}

// Force re-eval bypasses dedup
resetPool();
routes = [
  {
    match: /^UPDATE prompt_execution_results/im,
    rows: [],
    result: { affectedRows: 1 },
  },
];
// Stub query to return a proper update response and avoid duplicate check
const origQuery = fakePool.query;
fakePool.query = async (sql: string, params: any[] = []) => {
  queryCalls.push({ sql, params });
  if (/^UPDATE prompt_execution_results/i.test(sql.trim())) {
    return [{ affectedRows: 1 }, {}] as any;
  }
  return [[], {}] as any;
};
{
  const r = await evaluateResult(
    'r1',
    { completion_status: 'success', confidence: 0.8 },
    { force: true },
  );
  assertEq(r.evaluator_status, 'evaluated', 'force: evaluator_status set');
  assertEq(r.completion_status, 'success', 'force: status recorded');
  const selectCalls = queryCalls.filter(c => /^SELECT evaluator_status/i.test(c.sql.trim()));
  assertEq(selectCalls.length, 0, 'force: no dedup SELECT');
}
fakePool.query = origQuery;

// ============================================================================
// evaluateResult: happy path persist
// ============================================================================
console.log('\n── evaluateResult: persist ───────────────────────────────');

resetPool();
let updateParams: any[] = [];
fakePool.query = async (sql: string, params: any[] = []) => {
  queryCalls.push({ sql, params });
  if (/^SELECT evaluator_status/i.test(sql.trim())) {
    return [[], {}] as any; // not yet evaluated
  }
  if (/^UPDATE prompt_execution_results/i.test(sql.trim())) {
    updateParams = params;
    return [{ affectedRows: 1 }, {}] as any;
  }
  return [[], {}] as any;
};
{
  const violations = [{ type: 'v1', description: 'x', severity: 'high' }];
  const r = await evaluateResult('result-99', {
    completion_status: 'partial',
    violations,
    confidence: 0.7,
    notes: 'some notes',
  });
  assertEq(r.result_id, 'result-99', 'result_id returned');
  assertEq(r.evaluator_status, 'evaluated', 'evaluator_status');
  assertEq(r.violation_count, 1, 'violation_count = 1');
  // UPDATE params: status, JSON violations, count, confidence, notes, resultId
  assertEq(updateParams[0], 'partial', 'status param');
  assertEq(JSON.parse(updateParams[1]).length, 1, 'violations JSON');
  assertEq(updateParams[2], 1, 'count param');
  assertEq(updateParams[3], 0.7, 'confidence param');
  assertEq(updateParams[4], 'some notes', 'notes param');
  assertEq(updateParams[5], 'result-99', 'id last');
}
fakePool.query = origQuery;

// ============================================================================
// evaluateResult: not found
// ============================================================================
console.log('\n── evaluateResult: not found ─────────────────────────────');

resetPool();
fakePool.query = async (sql: string, params: any[] = []) => {
  queryCalls.push({ sql, params });
  if (/^SELECT evaluator_status/i.test(sql.trim())) return [[], {}] as any;
  if (/^UPDATE/i.test(sql.trim())) return [{ affectedRows: 0 }, {}] as any;
  return [[], {}] as any;
};
{
  let caught: Error | null = null;
  try {
    await evaluateResult('missing', { completion_status: 'success' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'not-found throws');
  assert(caught !== null && caught.message.includes('not found'), 'error message');
}
fakePool.query = origQuery;

// ============================================================================
// selectBestResult: no results
// ============================================================================
console.log('\n── selectBestResult: no results ──────────────────────────');

resetPool();
routes = [
  { match: /FROM prompt_execution_results r[\s\S]*execution_group_id/, rows: [] },
];
{
  let caught: Error | null = null;
  try { await selectBestResult('grp-empty'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when no results');
  assert(caught !== null && caught.message.includes('grp-empty'), 'includes group id');
}

// ============================================================================
// selectBestResult: single result auto-select
// ============================================================================
console.log('\n── selectBestResult: single result ───────────────────────');

resetPool();
const singleResult = {
  id: 'r-only', agent_id: 'a-only', agent_name: 'Solo', agent_priority: 10,
  prompt_plan_step_id: 'step1', execution_duration_ms: 500,
  completion_status: 'success', violation_count: 0, confidence: 0.9,
  evaluator_status: 'pending',
};
let singleMarkCalled = false;
fakePool.query = async (sql: string, params: any[] = []) => {
  queryCalls.push({ sql, params });
  if (/FROM prompt_execution_results r[\s\S]*execution_group_id/.test(sql)) {
    return [[singleResult], {}] as any;
  }
  if (/^UPDATE prompt_execution_results SET was_selected/i.test(sql.trim())) {
    singleMarkCalled = true;
    return [{ affectedRows: 1 }, {}] as any;
  }
  return [[], {}] as any;
};
{
  const r = await selectBestResult('grp-single');
  assertEq(r.selected_result_id, 'r-only', 'single → auto-selected');
  assertEq(r.selected_agent_id, 'a-only', 'agent_id');
  assertEq(r.comparison, null, 'no comparison for single');
  assert(r.selection_reason.includes('auto-selected'), 'reason mentions auto');
  assert(singleMarkCalled, 'mark-selected UPDATE called');
}
fakePool.query = origQuery;

// ============================================================================
// selectBestResult: unevaluated guard
// ============================================================================
console.log('\n── selectBestResult: unevaluated guard ───────────────────');

resetPool();
routes = [{
  match: /FROM prompt_execution_results r[\s\S]*execution_group_id/,
  rows: [
    { id: 'r1', agent_id: 'a1', agent_name: 'A', agent_priority: 10,
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      evaluator_status: 'evaluated' },
    { id: 'r2', agent_id: 'a2', agent_name: 'B', agent_priority: 20,
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      evaluator_status: 'pending' }, // not evaluated!
  ],
}];
{
  let caught: Error | null = null;
  try { await selectBestResult('grp-mixed'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when unevaluated present');
  assert(caught !== null && caught.message.includes('not yet evaluated'), 'error message');
  assert(caught !== null && caught.message.includes('r2'), 'mentions unevaluated id');
}

// ============================================================================
// selectBestResult: 3-agent happy path with winner
// ============================================================================
console.log('\n── selectBestResult: 3-agent compare ─────────────────────');

resetPool();
const threeResults = [
  // Mid agent — partial completion
  { id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10, prompt_plan_step_id: 'step1',
    execution_duration_ms: 2000, completion_status: 'partial', violation_count: 1,
    confidence: 0.7, evaluator_status: 'evaluated' },
  // Winner — success with no violations
  { id: 'r2', agent_id: 'a2', agent_name: 'GPT', agent_priority: 20, prompt_plan_step_id: 'step1',
    execution_duration_ms: 1500, completion_status: 'success', violation_count: 0,
    confidence: 0.95, evaluator_status: 'evaluated' },
  // Loser — failure
  { id: 'r3', agent_id: 'a3', agent_name: 'Gemini', agent_priority: 30, prompt_plan_step_id: 'step1',
    execution_duration_ms: 1200, completion_status: 'failure', violation_count: 3,
    confidence: 0.5, evaluator_status: 'evaluated' },
];
const updates: Array<{ resultId: any; selected: number }> = [];
let comparisonInsertParams: any[] = [];
uuidCounter = 0;
fakePool.query = async (sql: string, params: any[] = []) => {
  queryCalls.push({ sql, params });
  if (/FROM prompt_execution_results r[\s\S]*execution_group_id/.test(sql)) {
    return [threeResults, {}] as any;
  }
  if (/^UPDATE prompt_execution_results SET was_selected = 1/i.test(sql.trim())) {
    updates.push({ resultId: params[1], selected: 1 });
    return [{ affectedRows: 1 }, {}] as any;
  }
  if (/^UPDATE prompt_execution_results SET was_selected = 0/i.test(sql.trim())) {
    updates.push({ resultId: params[1], selected: 0 });
    return [{ affectedRows: 1 }, {}] as any;
  }
  if (/^INSERT INTO prompt_agent_comparisons/i.test(sql.trim())) {
    comparisonInsertParams = params;
    return [{ insertId: 1 }, {}] as any;
  }
  return [[], {}] as any;
};
{
  const r = await selectBestResult('grp-3');
  assertEq(r.selected_result_id, 'r2', 'winner is r2 (success)');
  assertEq(r.selected_agent_id, 'a2', 'winner agent is a2');
  assert(r.comparison !== null, 'comparison returned');
  assertEq(r.comparison.id, 'uuid-1', 'uuid used for comparison id');
  assertEq(r.comparison.tie_breaker_used, false, 'no tie-breaker needed');
  assertEq(updates.length, 3, '3 updates (1 winner + 2 losers)');
  assertEq(updates[0].selected, 1, 'first update is winner');
  assertEq(updates.slice(1).every(u => u.selected === 0), true, 'rest are losers');
  // Comparison insert params
  assertEq(comparisonInsertParams[0], 'uuid-1', 'comparison id');
  assertEq(comparisonInsertParams[1], 'grp-3', 'group id');
  assertEq(comparisonInsertParams[4], 'a2', 'selected agent id');
  assertEq(comparisonInsertParams[8], 0, 'tie_breaker_used = 0');
  assertEq(comparisonInsertParams[9], null, 'tie_breaker_method = null (no tie)');
  // comparison_scores contains all 3
  const scores = JSON.parse(comparisonInsertParams[6]);
  assertEq(Object.keys(scores).length, 3, '3 agents in comparison scores');
  assert(scores.a2.total_score > scores.a1.total_score, 'winner score higher');
}
fakePool.query = origQuery;

// ============================================================================
// selectBestResult: tie-breaker by agent_priority
// ============================================================================
console.log('\n── selectBestResult: tie → agent_priority ────────────────');

resetPool();
const tiedPriority = [
  // Both same score: success, 0 violations, 0.9 confidence — differ in priority
  { id: 'r1', agent_id: 'a1', agent_name: 'LowPri', agent_priority: 30,
    prompt_plan_step_id: 'step1', execution_duration_ms: 1000,
    completion_status: 'success', violation_count: 0, confidence: 0.9,
    evaluator_status: 'evaluated' },
  { id: 'r2', agent_id: 'a2', agent_name: 'HighPri', agent_priority: 10,
    prompt_plan_step_id: 'step1', execution_duration_ms: 1500,
    completion_status: 'success', violation_count: 0, confidence: 0.9,
    evaluator_status: 'evaluated' },
];
uuidCounter = 0;
fakePool.query = async (sql: string, params: any[] = []) => {
  queryCalls.push({ sql, params });
  if (/FROM prompt_execution_results r[\s\S]*execution_group_id/.test(sql)) {
    return [tiedPriority, {}] as any;
  }
  if (/^UPDATE/i.test(sql.trim())) return [{ affectedRows: 1 }, {}] as any;
  if (/^INSERT/i.test(sql.trim())) return [{ insertId: 1 }, {}] as any;
  return [[], {}] as any;
};
{
  const r = await selectBestResult('grp-tie');
  assertEq(r.selected_agent_id, 'a2', 'higher priority (lower number) wins');
  assertEq(r.comparison.tie_breaker_used, true, 'tie-breaker used');
  assertEq(r.comparison.tie_breaker_method, 'agent_priority', 'method = agent_priority');
}
fakePool.query = origQuery;

// ============================================================================
// selectBestResult: tie-breaker by duration
// ============================================================================
console.log('\n── selectBestResult: tie → duration ──────────────────────');

resetPool();
const tiedDuration = [
  { id: 'r1', agent_id: 'a1', agent_name: 'Slow', agent_priority: 10,
    prompt_plan_step_id: 'step1', execution_duration_ms: 3000,
    completion_status: 'success', violation_count: 0, confidence: 0.9,
    evaluator_status: 'evaluated' },
  { id: 'r2', agent_id: 'a2', agent_name: 'Fast', agent_priority: 10,
    prompt_plan_step_id: 'step1', execution_duration_ms: 1000,
    completion_status: 'success', violation_count: 0, confidence: 0.9,
    evaluator_status: 'evaluated' },
];
uuidCounter = 0;
fakePool.query = async (sql: string, params: any[] = []) => {
  queryCalls.push({ sql, params });
  if (/FROM prompt_execution_results r[\s\S]*execution_group_id/.test(sql)) {
    return [tiedDuration, {}] as any;
  }
  if (/^UPDATE/i.test(sql.trim())) return [{ affectedRows: 1 }, {}] as any;
  if (/^INSERT/i.test(sql.trim())) return [{ insertId: 1 }, {}] as any;
  return [[], {}] as any;
};
{
  const r = await selectBestResult('grp-dur');
  assertEq(r.selected_agent_id, 'a2', 'faster agent wins');
  assertEq(r.comparison.tie_breaker_used, true, 'tie-breaker used');
  assertEq(r.comparison.tie_breaker_method, 'execution_speed', 'method = execution_speed');
}
fakePool.query = origQuery;

// ============================================================================
// getComparison
// ============================================================================
console.log('\n── getComparison ─────────────────────────────────────────');

// Not found
resetPool();
routes = [{ match: /FROM prompt_agent_comparisons/, rows: [] }];
{
  const r = await getComparison('none');
  assertEq(r, null, 'not found → null');
}

// Happy path with JSON parsing
resetPool();
routes = [{
  match: /FROM prompt_agent_comparisons/,
  rows: [{
    id: 'c1',
    execution_group_id: 'grp',
    selected_agent_id: 'a1',
    selected_agent_name: 'Claude',
    agents_compared: JSON.stringify(['a1', 'a2']),
    comparison_scores: JSON.stringify({ a1: { total: 500 }, a2: { total: 300 } }),
    selection_reason: 'best',
    tie_breaker_used: 0,
  }],
}];
{
  const r = await getComparison('grp');
  assertEq(r.id, 'c1', 'id returned');
  assertEq(r.agents_compared, ['a1', 'a2'], 'agents_compared parsed');
  assertEq((r.comparison_scores as any).a1.total, 500, 'scores parsed');
}

// Malformed JSON → fallback to default
resetPool();
routes = [{
  match: /FROM prompt_agent_comparisons/,
  rows: [{
    id: 'c2',
    selected_agent_name: 'X',
    agents_compared: '{malformed',
    comparison_scores: 'also bad',
  }],
}];
{
  const r = await getComparison('grp2');
  assertEq(r.agents_compared, [], 'malformed → fallback []');
  assertEq(r.comparison_scores, {}, 'malformed → fallback {}');
}

// ============================================================================
// getResultsForStep
// ============================================================================
console.log('\n── getResultsForStep ─────────────────────────────────────');

resetPool();
routes = [{
  match: /FROM prompt_execution_results r[\s\S]*prompt_plan_step_id/,
  rows: [
    { id: 'r1', agent_name: 'A', agent_provider: 'anthropic',
      violations_found: JSON.stringify([{ type: 'v' }]) },
    { id: 'r2', agent_name: 'B', agent_provider: 'openai',
      violations_found: null },
  ],
}];
{
  const r = await getResultsForStep('step-1');
  assertEq(r.length, 2, '2 results');
  assertEq(r[0].violations_found, [{ type: 'v' }], 'violations parsed');
  assertEq(r[1].violations_found, [], 'null → empty array');
  assertEq(queryCalls[0].params[0], 'step-1', 'step id bound');
}

// ============================================================================
// getAgentResults
// ============================================================================
console.log('\n── getAgentResults ───────────────────────────────────────');

resetPool();
routes = [{
  match: /FROM prompt_execution_results r[\s\S]*agent_id/,
  rows: [
    { id: 'r1', agent_name: 'A', violations_found: JSON.stringify([]) },
  ],
}];
{
  const r = await getAgentResults('agent-1');
  assertEq(r.length, 1, '1 result');
  assertEq(queryCalls[0].params[0], 'agent-1', 'agent id bound');
  assertEq(queryCalls[0].params[1], 20, 'default limit 20');
}

resetPool();
routes = [{
  match: /FROM prompt_execution_results r[\s\S]*agent_id/,
  rows: [],
}];
{
  await getAgentResults('agent-2', 5);
  assertEq(queryCalls[0].params[1], 5, 'custom limit');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
