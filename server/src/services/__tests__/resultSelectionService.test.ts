#!/usr/bin/env npx tsx
/**
 * Unit tests for services/resultSelectionService.js (OMD-1112)
 *
 * Deterministic multi-agent result selection. One external dep
 * (../config/db) stubbed via require.cache BEFORE loading the SUT.
 *
 * Coverage:
 *   exports:
 *     · COMPLETION_RANK shape (success=5, partial=3, failure=1, blocked=0, timeout=0)
 *     · VALID_COMPLETION_STATUSES list
 *
 *   _scoreResult (pure):
 *     · total_score = completion_rank*100 + violation_rank*10 + confidence_rank
 *     · violation_rank clamps at 0 (no negatives for >10 violations)
 *     · confidence rounds to nearest integer
 *     · missing completion_status → rank 0
 *     · default agent_priority 50 when missing
 *
 *   evaluateResult:
 *     · invalid completion_status → throws
 *     · invalid confidence bounds → throws
 *     · already evaluated → skipped (no UPDATE)
 *     · force=true → UPDATE even if evaluated
 *     · not found (affectedRows=0) → throws
 *     · happy path: violations/confidence/notes persisted
 *     · violations defaults to [] when undefined
 *     · confidence defaults to null when falsy
 *
 *   selectBestResult:
 *     · no results → throws
 *     · single result → auto-selected, no comparison row
 *     · all must be evaluated (throws if any not)
 *     · happy path with 2 agents: winner by completion rank
 *     · happy path with 3 agents: stable sort applies tie-breakers in order
 *     · tie-breaker: agent_priority (lower wins)
 *     · tie-breaker: execution_duration_ms (faster wins)
 *     · comparison_scores include all agents
 *     · marks loser rows with selection_reason
 *     · writes comparison row
 *
 *   getComparison:
 *     · found → parses agents_compared + comparison_scores
 *     · not found → null
 *
 *   getResultsForStep / getAgentResults:
 *     · returns rows with violations_found parsed
 *     · default limit 20 for getAgentResults
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

async function assertThrows(fn: () => Promise<any>, matcher: RegExp | string, message: string) {
  try {
    await fn();
    console.error(`  FAIL: ${message} (no throw)`); failed++;
  } catch (e: any) {
    const matches = typeof matcher === 'string'
      ? e.message.includes(matcher)
      : matcher.test(e.message);
    if (matches) { console.log(`  PASS: ${message}`); passed++; }
    else {
      console.error(`  FAIL: ${message}\n         message: ${e.message}`); failed++;
    }
  }
}

// ── Route-dispatch fake pool ─────────────────────────────────────────────────
type Route = { match: RegExp; handler: (params: any[], sql: string) => any };
const routes: Route[] = [];
const queryLog: { sql: string; params: any[] }[] = [];

function addRoute(match: RegExp, handler: (params: any[], sql: string) => any) {
  routes.push({ match, handler });
}

function resetRoutes() {
  routes.length = 0;
  queryLog.length = 0;
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) return [r.handler(params, sql)];
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: dbStub } as any;

const rss = require('../resultSelectionService');
const {
  COMPLETION_RANK,
  VALID_COMPLETION_STATUSES,
  evaluateResult,
  selectBestResult,
  getComparison,
  getResultsForStep,
  getAgentResults,
  _scoreResult,
} = rss;

function makeResult(overrides: any = {}) {
  return {
    id: 'res-1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10,
    prompt_plan_step_id: 'step-1',
    execution_duration_ms: 1000,
    completion_status: 'success',
    violation_count: 0,
    confidence: 0.9,
    evaluator_status: 'evaluated',
    ...overrides,
  };
}

async function main() {

// ============================================================================
// Exports
// ============================================================================
console.log('\n── exports ───────────────────────────────────────────────');
assertEq(COMPLETION_RANK.success, 5, 'success=5');
assertEq(COMPLETION_RANK.partial, 3, 'partial=3');
assertEq(COMPLETION_RANK.failure, 1, 'failure=1');
assertEq(COMPLETION_RANK.blocked, 0, 'blocked=0');
assertEq(COMPLETION_RANK.timeout, 0, 'timeout=0');
assertEq(VALID_COMPLETION_STATUSES.length, 5, '5 valid statuses');
assert(VALID_COMPLETION_STATUSES.includes('success'), 'includes success');

// ============================================================================
// _scoreResult (pure)
// ============================================================================
console.log('\n── _scoreResult: pure scoring ────────────────────────────');

{
  const s = _scoreResult(makeResult({
    completion_status: 'success', violation_count: 0, confidence: 1.0,
  }));
  // 5*100 + 10*10 + 10 = 610
  assertEq(s.total_score, 610, 'perfect score = 610');
  assertEq(s.completion_rank, 5, 'completion_rank');
  assertEq(s.violation_rank, 10, 'violation_rank');
  assertEq(s.confidence_rank, 10, 'confidence_rank');
}

{
  const s = _scoreResult(makeResult({
    completion_status: 'partial', violation_count: 3, confidence: 0.5,
  }));
  // 3*100 + (10-3)*10 + 5 = 375
  assertEq(s.total_score, 375, 'partial with 3 violations');
}

{
  const s = _scoreResult(makeResult({
    completion_status: 'failure', violation_count: 15, confidence: 0,
  }));
  // 1*100 + max(0, 10-15)*10 + 0 = 100 + 0 = 100
  assertEq(s.total_score, 100, 'clamped violation_rank at 0');
  assertEq(s.violation_rank, 0, 'violation_rank clamped');
}

{
  const s = _scoreResult(makeResult({
    completion_status: 'blocked', violation_count: 0, confidence: 0,
  }));
  // 0*100 + 10*10 + 0 = 100
  assertEq(s.total_score, 100, 'blocked + clean = 100');
}

// Missing completion_status → 0
{
  const s = _scoreResult({
    id: 'x', agent_id: 'a', agent_priority: 50,
    prompt_plan_step_id: 's', completion_status: 'unknown_status',
    violation_count: 0, confidence: 0.5,
  });
  assertEq(s.completion_rank, 0, 'unknown status → 0');
  assertEq(s.total_score, 100 + 5, 'score uses 0 for completion');
}

// Confidence rounding
{
  const s = _scoreResult(makeResult({ confidence: 0.74 }));
  assertEq(s.confidence_rank, 7, '0.74 → 7 (rounded)');
}

{
  const s = _scoreResult(makeResult({ confidence: 0.75 }));
  assertEq(s.confidence_rank, 8, '0.75 → 8 (round half up)');
}

// Default agent_priority
{
  const s = _scoreResult({
    id: 'x', agent_id: 'a', completion_status: 'success',
    violation_count: 0, confidence: 1,
  });
  assertEq(s.agent_priority, 50, 'default agent_priority 50');
}

// Default violation_count/confidence when undefined
{
  const s = _scoreResult({
    id: 'x', agent_id: 'a', agent_priority: 5,
    completion_status: 'success',
  });
  assertEq(s.violation_count, 0, 'default violation_count 0');
  assertEq(s.confidence, 0, 'default confidence 0');
  assertEq(s.confidence_rank, 0, 'rank 0 for undefined confidence');
}

// ============================================================================
// evaluateResult: validation
// ============================================================================
console.log('\n── evaluateResult: validation ────────────────────────────');

resetRoutes();
await assertThrows(
  () => evaluateResult('r1', { completion_status: 'bogus' }),
  /Invalid completion_status/,
  'invalid completion_status → throws'
);

resetRoutes();
await assertThrows(
  () => evaluateResult('r1', { completion_status: 'success', confidence: 1.5 }),
  /confidence must be between 0 and 1/,
  'confidence > 1 → throws'
);

resetRoutes();
await assertThrows(
  () => evaluateResult('r1', { completion_status: 'success', confidence: -0.1 }),
  /confidence must be between 0 and 1/,
  'confidence < 0 → throws'
);

// ============================================================================
// evaluateResult: duplicate prevention
// ============================================================================
console.log('\n── evaluateResult: duplicate skip ────────────────────────');

resetRoutes();
addRoute(/SELECT evaluator_status.*FROM prompt_execution_results/i, () => [
  { evaluator_status: 'evaluated', completion_status: 'success', confidence: 0.9 },
]);
let updateCalled = false;
addRoute(/UPDATE prompt_execution_results/i, () => {
  updateCalled = true;
  return { affectedRows: 1 };
});
{
  const r = await evaluateResult('r1', {
    completion_status: 'partial', violations: [], confidence: 0.5,
  });
  assertEq(r.skipped, true, 'skipped flag');
  assertEq(r.completion_status, 'success', 'keeps existing status');
  assertEq(updateCalled, false, 'no UPDATE issued');
}

// force=true → UPDATE runs even when already evaluated
resetRoutes();
addRoute(/SELECT evaluator_status.*FROM prompt_execution_results/i, () => [
  { evaluator_status: 'evaluated', completion_status: 'success', confidence: 0.9 },
]);
updateCalled = false;
addRoute(/UPDATE prompt_execution_results/i, () => {
  updateCalled = true;
  return { affectedRows: 1 };
});
{
  const r = await evaluateResult(
    'r1',
    { completion_status: 'partial', violations: [{ type: 'x' }], confidence: 0.5 },
    { force: true }
  );
  assertEq(r.skipped as any, undefined, 'not skipped');
  assertEq(updateCalled, true, 'UPDATE called with force');
  assertEq(r.completion_status, 'partial', 'uses new status');
  assertEq(r.violation_count, 1, '1 violation');
}

// ============================================================================
// evaluateResult: happy path (no existing eval)
// ============================================================================
console.log('\n── evaluateResult: happy path ────────────────────────────');

resetRoutes();
// Empty SELECT → proceed to UPDATE
addRoute(/SELECT evaluator_status.*FROM prompt_execution_results/i, () => []);
let updateParams: any[] = [];
addRoute(/UPDATE prompt_execution_results/i, (params) => {
  updateParams = params;
  return { affectedRows: 1 };
});
{
  const r = await evaluateResult('r1', {
    completion_status: 'success',
    violations: [{ type: 'minor' }, { type: 'warn' }],
    confidence: 0.8,
    notes: 'ok',
  });
  assertEq(r.result_id, 'r1', 'result_id');
  assertEq(r.evaluator_status, 'evaluated', 'evaluator_status');
  assertEq(r.completion_status, 'success', 'status');
  assertEq(r.violation_count, 2, 'violation_count');
  // params: [status, violations_json, violation_count, confidence, notes, id]
  assertEq(updateParams[0], 'success', 'status param');
  assertEq(updateParams[1], JSON.stringify([{ type: 'minor' }, { type: 'warn' }]), 'violations JSON');
  assertEq(updateParams[2], 2, 'count param');
  assertEq(updateParams[3], 0.8, 'confidence param');
  assertEq(updateParams[4], 'ok', 'notes param');
  assertEq(updateParams[5], 'r1', 'id param');
}

// Not found
resetRoutes();
addRoute(/SELECT evaluator_status.*FROM prompt_execution_results/i, () => []);
addRoute(/UPDATE prompt_execution_results/i, () => ({ affectedRows: 0 }));
await assertThrows(
  () => evaluateResult('missing', { completion_status: 'success' }),
  /Execution result not found/,
  'not found → throws'
);

// Defaults: no violations, no confidence, no notes
resetRoutes();
addRoute(/SELECT evaluator_status.*FROM prompt_execution_results/i, () => []);
addRoute(/UPDATE prompt_execution_results/i, (params) => {
  updateParams = params;
  return { affectedRows: 1 };
});
{
  await evaluateResult('r1', { completion_status: 'partial' });
  assertEq(updateParams[1], '[]', 'violations defaults to []');
  assertEq(updateParams[2], 0, 'count 0');
  assertEq(updateParams[3], null, 'confidence → null');
  assertEq(updateParams[4], null, 'notes → null');
}

// ============================================================================
// selectBestResult: empty group
// ============================================================================
console.log('\n── selectBestResult: empty group ─────────────────────────');

resetRoutes();
addRoute(/FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i, () => []);
await assertThrows(
  () => selectBestResult('eg-empty'),
  /No results found for execution group/,
  'empty → throws'
);

// ============================================================================
// selectBestResult: single result → auto-select
// ============================================================================
console.log('\n── selectBestResult: single → auto-select ────────────────');

resetRoutes();
addRoute(/FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i, () => [
  { id: 'res-only', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10,
    prompt_plan_step_id: 'step-1', execution_duration_ms: 500,
    completion_status: 'success', violation_count: 0, confidence: 0.9,
    evaluator_status: 'pending' /* even unevaluated — single bypasses check */ },
]);
let selectedMarkParams: any[] = [];
addRoute(/UPDATE prompt_execution_results SET was_selected = 1/i, (params) => {
  selectedMarkParams = params;
  return { affectedRows: 1 };
});
let insertCalled = false;
addRoute(/INSERT INTO prompt_agent_comparisons/i, () => {
  insertCalled = true;
  return { affectedRows: 1 };
});
{
  const r = await selectBestResult('eg-solo');
  assertEq(r.selected_result_id, 'res-only', 'auto-selected');
  assertEq(r.selected_agent_id, 'a1', 'agent id');
  assertEq(r.comparison, null, 'no comparison');
  assert(r.selection_reason.includes('Single agent'), 'reason mentions single');
  assertEq(selectedMarkParams[0], r.selection_reason, 'selection_reason marked');
  assertEq(selectedMarkParams[1], 'res-only', 'id marked');
  assertEq(insertCalled, false, 'no comparison insert for single');
}

// ============================================================================
// selectBestResult: unevaluated results → throws
// ============================================================================
console.log('\n── selectBestResult: unevaluated → throws ────────────────');

resetRoutes();
addRoute(/FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i, () => [
  makeResult({ id: 'r1', evaluator_status: 'evaluated' }),
  makeResult({ id: 'r2', agent_id: 'a2', evaluator_status: 'pending' }),
]);
await assertThrows(
  () => selectBestResult('eg-unev'),
  /not yet evaluated/,
  'unevaluated → throws'
);

// ============================================================================
// selectBestResult: 2 agents, clear winner by completion
// ============================================================================
console.log('\n── selectBestResult: 2 agents, winner by completion ──────');

resetRoutes();
addRoute(/FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i, () => [
  makeResult({ id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10,
    completion_status: 'success', violation_count: 0, confidence: 0.9 }),
  makeResult({ id: 'r2', agent_id: 'a2', agent_name: 'GPT', agent_priority: 20,
    completion_status: 'partial', violation_count: 2, confidence: 0.7 }),
]);
let markCount = 0;
const markParamsSeq: any[][] = [];
addRoute(/UPDATE prompt_execution_results SET was_selected = 1/i, (params) => {
  markCount++; markParamsSeq.push(params);
  return { affectedRows: 1 };
});
addRoute(/UPDATE prompt_execution_results SET was_selected = 0/i, (params) => {
  markParamsSeq.push(params);
  return { affectedRows: 1 };
});
let insertedParams: any[] = [];
addRoute(/INSERT INTO prompt_agent_comparisons/i, (params) => {
  insertedParams = params;
  return { affectedRows: 1 };
});
{
  const r = await selectBestResult('eg-1');
  assertEq(r.selected_result_id, 'r1', 'Claude wins');
  assertEq(r.selected_agent_id, 'a1', 'agent a1 selected');
  assertEq(r.comparison.tie_breaker_used, false, 'no tiebreaker');
  assertEq(Object.keys(r.comparison.scores).length, 2, '2 agents scored');
  assert(r.comparison.scores.a1.total_score > r.comparison.scores.a2.total_score, 'a1 scored higher');
  assertEq(markCount, 1, '1 winner mark');
  assert(r.selection_reason.includes('Claude'), 'reason mentions Claude');
  assert(r.selection_reason.includes('GPT'), 'reason mentions loser');
  // Comparison insert params: [id, execution_group_id, step_id, agents_compared, selected_agent_id, selected_result_id, scores, reason, tie, method]
  assertEq(insertedParams[1], 'eg-1', 'group id');
  assertEq(insertedParams[4], 'a1', 'selected agent in insert');
  assertEq(insertedParams[5], 'r1', 'selected result in insert');
  assertEq(insertedParams[8], 0, 'tie_breaker_used = 0');
  assertEq(insertedParams[9], null, 'tie_breaker_method null');
}

// ============================================================================
// selectBestResult: 3 agents with tie at top, tie-broken by agent_priority
// ============================================================================
console.log('\n── selectBestResult: tie-breaker agent_priority ──────────');

resetRoutes();
addRoute(/FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i, () => [
  // a1 and a2 tie on score; a1 has lower priority (wins)
  makeResult({ id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 5,
    completion_status: 'success', violation_count: 0, confidence: 0.9 }),
  makeResult({ id: 'r2', agent_id: 'a2', agent_name: 'GPT', agent_priority: 20,
    completion_status: 'success', violation_count: 0, confidence: 0.9 }),
  makeResult({ id: 'r3', agent_id: 'a3', agent_name: 'Loser', agent_priority: 30,
    completion_status: 'failure', violation_count: 5, confidence: 0.1 }),
]);
addRoute(/UPDATE prompt_execution_results SET was_selected = 1/i, () => ({ affectedRows: 1 }));
addRoute(/UPDATE prompt_execution_results SET was_selected = 0/i, () => ({ affectedRows: 1 }));
addRoute(/INSERT INTO prompt_agent_comparisons/i, (params) => {
  insertedParams = params;
  return { affectedRows: 1 };
});
{
  const r = await selectBestResult('eg-tie');
  assertEq(r.selected_result_id, 'r1', 'Claude wins priority tiebreak');
  assertEq(r.comparison.tie_breaker_used, true, 'tiebreaker used');
  assertEq(r.comparison.tie_breaker_method, 'agent_priority', 'priority tiebreaker');
  assertEq(insertedParams[8], 1, 'tie_breaker_used=1 in insert');
  assertEq(insertedParams[9], 'agent_priority', 'method in insert');
  assert(r.selection_reason.includes('tie-breaker'), 'reason mentions tiebreaker');
}

// ============================================================================
// selectBestResult: tie-breaker execution_speed
// ============================================================================
console.log('\n── selectBestResult: tie-breaker execution_speed ─────────');

resetRoutes();
addRoute(/FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i, () => [
  // Same score AND same priority → duration tiebreaker; a1 faster
  makeResult({ id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10,
    execution_duration_ms: 200,
    completion_status: 'success', violation_count: 0, confidence: 0.9 }),
  makeResult({ id: 'r2', agent_id: 'a2', agent_name: 'GPT', agent_priority: 10,
    execution_duration_ms: 500,
    completion_status: 'success', violation_count: 0, confidence: 0.9 }),
]);
addRoute(/UPDATE prompt_execution_results SET was_selected = 1/i, () => ({ affectedRows: 1 }));
addRoute(/UPDATE prompt_execution_results SET was_selected = 0/i, () => ({ affectedRows: 1 }));
addRoute(/INSERT INTO prompt_agent_comparisons/i, (params) => {
  insertedParams = params;
  return { affectedRows: 1 };
});
{
  const r = await selectBestResult('eg-speed');
  assertEq(r.selected_result_id, 'r1', 'faster wins');
  assertEq(r.comparison.tie_breaker_used, true, 'tiebreaker used');
  assertEq(r.comparison.tie_breaker_method, 'execution_speed', 'speed tiebreaker');
  assertEq(insertedParams[9], 'execution_speed', 'method in insert');
}

// ============================================================================
// getComparison
// ============================================================================
console.log('\n── getComparison ─────────────────────────────────────────');

resetRoutes();
addRoute(/FROM prompt_agent_comparisons c/i, () => [
  { id: 'cmp-1', execution_group_id: 'eg-1', selected_agent_id: 'a1',
    selected_agent_name: 'Claude',
    agents_compared: '["a1","a2"]',
    comparison_scores: '{"a1":{"total_score":610}}',
    tie_breaker_used: 0, tie_breaker_method: null },
]);
{
  const c = await getComparison('eg-1');
  assertEq(c.id, 'cmp-1', 'id');
  assertEq(c.agents_compared, ['a1', 'a2'], 'agents_compared parsed');
  assertEq(c.comparison_scores.a1.total_score, 610, 'scores parsed');
  assertEq(c.selected_agent_name, 'Claude', 'join field preserved');
}

// Not found
resetRoutes();
addRoute(/FROM prompt_agent_comparisons c/i, () => []);
{
  const c = await getComparison('eg-missing');
  assertEq(c, null, 'missing → null');
}

// Malformed JSON falls back
resetRoutes();
addRoute(/FROM prompt_agent_comparisons c/i, () => [
  { id: 'cmp', execution_group_id: 'eg',
    agents_compared: 'not json',
    comparison_scores: 'not json',
    tie_breaker_used: 0, tie_breaker_method: null },
]);
{
  const c = await getComparison('eg');
  assertEq(c.agents_compared, [], 'bad JSON → []');
  assertEq(c.comparison_scores, {}, 'bad JSON → {}');
}

// ============================================================================
// getResultsForStep
// ============================================================================
console.log('\n── getResultsForStep ─────────────────────────────────────');

resetRoutes();
addRoute(/FROM prompt_execution_results r[\s\S]*WHERE r.prompt_plan_step_id = \?/i, (params) => [
  { id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_provider: 'anthropic',
    prompt_plan_step_id: params[0],
    violations_found: JSON.stringify([{ type: 'x' }]) },
  { id: 'r2', agent_id: 'a2', agent_name: 'GPT', agent_provider: 'openai',
    prompt_plan_step_id: params[0],
    violations_found: null },
]);
{
  const results = await getResultsForStep('step-1');
  assertEq(results.length, 2, '2 rows');
  assertEq(results[0].violations_found, [{ type: 'x' }], 'parsed JSON');
  assertEq(results[1].violations_found, [], 'null → []');
  assertEq(results[0].agent_name, 'Claude', 'agent name preserved');
}

// ============================================================================
// getAgentResults
// ============================================================================
console.log('\n── getAgentResults ───────────────────────────────────────');

resetRoutes();
let agentParams: any[] = [];
addRoute(/FROM prompt_execution_results r[\s\S]*WHERE r.agent_id = \?/i, (params) => {
  agentParams = params;
  return [
    { id: 'r1', agent_id: 'a1', agent_name: 'Claude', violations_found: null },
  ];
});
{
  const r = await getAgentResults('a1');
  assertEq(r.length, 1, '1 row');
  assertEq(agentParams, ['a1', 20], 'default limit 20');
  assertEq(r[0].violations_found, [], 'null → []');
}

// Custom limit
resetRoutes();
addRoute(/FROM prompt_execution_results r[\s\S]*WHERE r.agent_id = \?/i, (params) => {
  agentParams = params;
  return [];
});
{
  await getAgentResults('a1', 5);
  assertEq(agentParams, ['a1', 5], 'custom limit 5');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
