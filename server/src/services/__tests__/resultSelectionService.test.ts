#!/usr/bin/env npx tsx
/**
 * Unit tests for services/resultSelectionService.js (OMD-1024)
 *
 * Deterministic rule-based selection of best result from multi-agent execution.
 *
 * Coverage:
 *   - COMPLETION_RANK / VALID_COMPLETION_STATUSES constants
 *   - _scoreResult formula: completion*100 + violation*10 + confidence
 *   - evaluateResult:
 *       · invalid completion_status throws
 *       · out-of-range confidence throws
 *       · dedup: skips when already evaluated (returns {skipped: true})
 *       · force option bypasses dedup
 *       · happy path writes UPDATE + returns summary
 *       · violations JSON-serialized
 *       · not-found throws
 *   - selectBestResult:
 *       · no results → throws
 *       · single result → auto-select (1 UPDATE, null comparison)
 *       · unevaluated results → throws listing IDs
 *       · clear winner (3 agents) → 3 UPDATEs + 1 INSERT comparison
 *       · tie-break by agent_priority
 *       · tie-break by execution_speed
 *   - getComparison:
 *       · null when missing
 *       · parses agents_compared and comparison_scores JSON
 *       · falls back to [] / {} on malformed JSON
 *   - getResultsForStep: parses violations_found
 *   - getAgentResults: limit arg + default 20
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

// ── Stubs ─────────────────────────────────────────────────────────────

type Route = { match: RegExp; rows?: any; result?: any; throws?: Error };
let routes: Route[] = [];
const dbCalls: { sql: string; params: any[] }[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    dbCalls.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        // mysql2 destructure: [rowsOrResult, fields]
        return [r.rows !== undefined ? r.rows : (r.result !== undefined ? r.result : [])];
      }
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };

let uuidCounter = 0;
const uuidStub = { v4: () => `uuid-${++uuidCounter}` };

// Install stubs before SUT
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: dbStub,
} as any;

const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath, filename: uuidPath, loaded: true,
  exports: uuidStub,
} as any;

function resetState() {
  routes = [];
  dbCalls.length = 0;
  uuidCounter = 0;
}

const {
  COMPLETION_RANK,
  VALID_COMPLETION_STATUSES,
  evaluateResult,
  selectBestResult,
  getComparison,
  getResultsForStep,
  getAgentResults,
  _scoreResult,
} = require('../resultSelectionService');

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(COMPLETION_RANK.success, 5, 'success = 5');
assertEq(COMPLETION_RANK.partial, 3, 'partial = 3');
assertEq(COMPLETION_RANK.failure, 1, 'failure = 1');
assertEq(COMPLETION_RANK.blocked, 0, 'blocked = 0');
assertEq(COMPLETION_RANK.timeout, 0, 'timeout = 0');
assert(VALID_COMPLETION_STATUSES.includes('success'), 'VALID includes success');
assertEq(VALID_COMPLETION_STATUSES.length, 5, '5 valid statuses');

// ============================================================================
// _scoreResult
// ============================================================================
console.log('\n── _scoreResult ──────────────────────────────────────────');

// Perfect success: 5*100 + 10*10 + 10 = 610
{
  const s = _scoreResult({
    id: 'r1', agent_id: 'a1', completion_status: 'success',
    violation_count: 0, confidence: 1.0, agent_priority: 10,
  });
  assertEq(s.completion_rank, 5, 'completion_rank success=5');
  assertEq(s.violation_rank, 10, 'violation_rank 10-0=10');
  assertEq(s.confidence_rank, 10, 'confidence_rank 1.0*10=10');
  assertEq(s.total_score, 610, 'total 610');
}

// Partial, 3 violations, 0.7 confidence: 3*100 + 7*10 + 7 = 377
{
  const s = _scoreResult({
    id: 'r2', completion_status: 'partial',
    violation_count: 3, confidence: 0.7,
  });
  assertEq(s.total_score, 377, 'partial/3viol/0.7 = 377');
}

// Violation clamp: 15 violations → rank 0 not -5
{
  const s = _scoreResult({
    completion_status: 'success',
    violation_count: 15, confidence: 0.5,
  });
  assertEq(s.violation_rank, 0, 'violation_rank clamped to 0');
  // 5*100 + 0 + 5 = 505
  assertEq(s.total_score, 505, 'total with clamp');
}

// Unknown status defaults to 0
{
  const s = _scoreResult({ completion_status: 'weird', violation_count: 0, confidence: 0 });
  assertEq(s.completion_rank, 0, 'unknown status rank 0');
}

// agent_priority default 50 when missing
{
  const s = _scoreResult({ completion_status: 'success' });
  assertEq(s.agent_priority, 50, 'agent_priority default 50');
  assertEq(s.violation_count, 0, 'violation_count default 0');
  assertEq(s.confidence, 0, 'confidence default 0');
}

// ============================================================================
// evaluateResult — validation
// ============================================================================
console.log('\n── evaluateResult: validation ────────────────────────────');

resetState();
{
  let caught: Error | null = null;
  try {
    await evaluateResult('r1', { completion_status: 'bogus' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid status throws');
  assert(
    caught !== null && caught.message.includes('Invalid completion_status'),
    'error mentions status'
  );
}

resetState();
{
  let caught: Error | null = null;
  try {
    await evaluateResult('r1', { completion_status: 'success', confidence: 1.5 });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'out-of-range confidence throws');
  assert(
    caught !== null && caught.message.includes('confidence must be between'),
    'error mentions confidence'
  );
}

resetState();
{
  let caught: Error | null = null;
  try {
    await evaluateResult('r1', { completion_status: 'success', confidence: -0.1 });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'negative confidence throws');
}

// ============================================================================
// evaluateResult — dedup skip
// ============================================================================
console.log('\n── evaluateResult: dedup ─────────────────────────────────');

resetState();
routes = [
  { match: /SELECT evaluator_status/i, rows: [{ evaluator_status: 'evaluated', completion_status: 'success', confidence: 0.9 }] },
];
{
  const r = await evaluateResult('r1', { completion_status: 'partial', confidence: 0.5 });
  assertEq(r.skipped, true, 'dedup returns skipped=true');
  assertEq(r.completion_status, 'success', 'returns existing completion_status');
  assertEq(r.confidence, 0.9, 'returns existing confidence');
  assertEq(dbCalls.length, 1, 'only the SELECT, no UPDATE');
}

// Force override
resetState();
routes = [
  { match: /UPDATE prompt_execution_results/i, rows: { affectedRows: 1 } },
];
{
  const r = await evaluateResult(
    'r1',
    { completion_status: 'success', violations: [], confidence: 0.9 },
    { force: true }
  );
  assert(r.skipped !== true, 'force: not skipped');
  assertEq(dbCalls.length, 1, 'force: skips SELECT, goes straight to UPDATE');
  assert(/UPDATE/i.test(dbCalls[0].sql), 'UPDATE called');
}

// ============================================================================
// evaluateResult — happy path
// ============================================================================
console.log('\n── evaluateResult: happy path ────────────────────────────');

resetState();
routes = [
  { match: /SELECT evaluator_status/i, rows: [{ evaluator_status: 'pending', completion_status: null, confidence: null }] },
  { match: /UPDATE prompt_execution_results/i, rows: { affectedRows: 1 } },
];
{
  const viols = [{ type: 'rule', description: 'bad', severity: 'high' }];
  const r = await evaluateResult('rX', {
    completion_status: 'success',
    violations: viols,
    confidence: 0.85,
    notes: 'good',
  });
  assertEq(r.skipped, undefined, 'not skipped');
  assertEq(r.completion_status, 'success', 'status echoed');
  assertEq(r.violation_count, 1, 'violation_count = 1');
  assertEq(r.confidence, 0.85, 'confidence echoed');
  assertEq(dbCalls.length, 2, 'SELECT + UPDATE');

  const upd = dbCalls[1];
  assertEq(upd.params[0], 'success', 'param 0 = status');
  assertEq(upd.params[1], JSON.stringify(viols), 'param 1 = JSON violations');
  assertEq(upd.params[2], 1, 'param 2 = count');
  assertEq(upd.params[3], 0.85, 'param 3 = confidence');
  assertEq(upd.params[4], 'good', 'param 4 = notes');
  assertEq(upd.params[5], 'rX', 'param 5 = resultId');
}

// Not found
resetState();
routes = [
  { match: /SELECT evaluator_status/i, rows: [] },  // no existing row
  { match: /UPDATE prompt_execution_results/i, rows: { affectedRows: 0 } },
];
{
  let caught: Error | null = null;
  try {
    await evaluateResult('nope', { completion_status: 'success' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
  assert(
    caught !== null && caught.message.includes('not found'),
    'error mentions not found'
  );
}

// Default/null violations
resetState();
routes = [
  { match: /SELECT evaluator_status/i, rows: [] },
  { match: /UPDATE prompt_execution_results/i, rows: { affectedRows: 1 } },
];
{
  await evaluateResult('rY', { completion_status: 'success' });
  const upd = dbCalls[1];
  assertEq(upd.params[1], '[]', 'missing violations → []');
  assertEq(upd.params[2], 0, 'count 0');
  assertEq(upd.params[3], null, 'null confidence → null');
  assertEq(upd.params[4], null, 'null notes → null');
}

// ============================================================================
// selectBestResult — no results
// ============================================================================
console.log('\n── selectBestResult: no results ──────────────────────────');

resetState();
routes = [
  { match: /FROM prompt_execution_results r/i, rows: [] },
];
{
  let caught: Error | null = null;
  try { await selectBestResult('eg1'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'no results throws');
  assert(
    caught !== null && caught.message.includes('No results found'),
    'error mentions no results'
  );
}

// ============================================================================
// selectBestResult — single result auto-select
// ============================================================================
console.log('\n── selectBestResult: single auto-select ──────────────────');

resetState();
routes = [
  { match: /FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i, rows: [
    {
      id: 'r1', agent_id: 'a1', prompt_plan_step_id: 'step1',
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      execution_duration_ms: 100, agent_name: 'claude', agent_priority: 10,
      evaluator_status: 'evaluated',
    },
  ]},
  { match: /UPDATE prompt_execution_results SET was_selected/i, rows: { affectedRows: 1 } },
];
{
  const r = await selectBestResult('eg1');
  assertEq(r.selected_result_id, 'r1', 'selected r1');
  assertEq(r.selected_agent_id, 'a1', 'selected a1');
  assertEq(r.comparison, null, 'no comparison (single)');
  assert(r.selection_reason.includes('Single agent'), 'reason mentions single');
  // No INSERT comparison
  const insert = dbCalls.find(c => /INSERT INTO prompt_agent_comparisons/i.test(c.sql));
  assert(insert === undefined, 'no comparison insert');
}

// ============================================================================
// selectBestResult — unevaluated
// ============================================================================
console.log('\n── selectBestResult: unevaluated ─────────────────────────');

resetState();
routes = [
  { match: /FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i, rows: [
    { id: 'r1', agent_id: 'a1', evaluator_status: 'evaluated', completion_status: 'success', violation_count: 0, confidence: 0.9, agent_priority: 10 },
    { id: 'r2', agent_id: 'a2', evaluator_status: 'pending', completion_status: null, violation_count: null, confidence: null, agent_priority: 20 },
    { id: 'r3', agent_id: 'a3', evaluator_status: 'pending', completion_status: null, violation_count: null, confidence: null, agent_priority: 30 },
  ]},
];
{
  let caught: Error | null = null;
  try { await selectBestResult('eg1'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'unevaluated throws');
  assert(
    caught !== null && caught.message.includes('2 result'),
    'error mentions count'
  );
  assert(
    caught !== null && caught.message.includes('r2'),
    'error lists r2'
  );
  assert(
    caught !== null && caught.message.includes('r3'),
    'error lists r3'
  );
}

// ============================================================================
// selectBestResult — clear winner (3 agents)
// ============================================================================
console.log('\n── selectBestResult: clear winner ────────────────────────');

resetState();
routes = [
  { match: /FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i, rows: [
    {
      id: 'r1', agent_id: 'a1', prompt_plan_step_id: 'step1',
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      execution_duration_ms: 200, agent_name: 'claude', agent_priority: 10,
      evaluator_status: 'evaluated',
    },
    {
      id: 'r2', agent_id: 'a2', prompt_plan_step_id: 'step1',
      completion_status: 'partial', violation_count: 2, confidence: 0.7,
      execution_duration_ms: 150, agent_name: 'gpt', agent_priority: 20,
      evaluator_status: 'evaluated',
    },
    {
      id: 'r3', agent_id: 'a3', prompt_plan_step_id: 'step1',
      completion_status: 'failure', violation_count: 5, confidence: 0.3,
      execution_duration_ms: 100, agent_name: 'gemini', agent_priority: 30,
      evaluator_status: 'evaluated',
    },
  ]},
  { match: /UPDATE prompt_execution_results SET was_selected = 1/i, rows: { affectedRows: 1 } },
  { match: /UPDATE prompt_execution_results SET was_selected = 0/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO prompt_agent_comparisons/i, rows: { affectedRows: 1 } },
];
{
  const r = await selectBestResult('eg1');
  assertEq(r.selected_result_id, 'r1', 'winner = r1');
  assertEq(r.selected_agent_id, 'a1', 'winner agent = a1');
  assert(r.comparison !== null, 'comparison present');
  assertEq(r.comparison.tie_breaker_used, false, 'no tie breaker');
  assertEq(r.comparison.tie_breaker_method, null, 'method null');
  // All 3 scored
  assert(r.comparison.scores.a1 !== undefined, 'a1 in scores');
  assert(r.comparison.scores.a2 !== undefined, 'a2 in scores');
  assert(r.comparison.scores.a3 !== undefined, 'a3 in scores');
  assert(r.comparison.scores.a1.total_score > r.comparison.scores.a2.total_score, 'a1 > a2');
  assert(r.selection_reason.includes('claude'), 'reason names winner');

  // 1 SELECT + 1 "was_selected=1" + 2 "was_selected=0" + 1 INSERT = 5
  assertEq(dbCalls.length, 5, '5 DB calls');
  const insert = dbCalls.find(c => /INSERT INTO prompt_agent_comparisons/i.test(c.sql));
  assert(insert !== undefined, 'comparison insert called');
  assertEq(insert!.params[4], 'a1', 'insert selected_agent_id');
  assertEq(insert!.params[5], 'r1', 'insert selected_result_id');
  assertEq(insert!.params[8], 0, 'tie_breaker_used = 0');
  assertEq(insert!.params[9], null, 'tie_breaker_method null');
}

// ============================================================================
// selectBestResult — tie-break by agent_priority
// ============================================================================
console.log('\n── selectBestResult: tie-break priority ──────────────────');

resetState();
routes = [
  { match: /FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i, rows: [
    {
      id: 'r1', agent_id: 'a1', prompt_plan_step_id: 'step1',
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      execution_duration_ms: 200, agent_name: 'slow-high', agent_priority: 10,
      evaluator_status: 'evaluated',
    },
    {
      id: 'r2', agent_id: 'a2', prompt_plan_step_id: 'step1',
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      execution_duration_ms: 100, agent_name: 'fast-low', agent_priority: 20,
      evaluator_status: 'evaluated',
    },
  ]},
  { match: /UPDATE prompt_execution_results SET was_selected = 1/i, rows: { affectedRows: 1 } },
  { match: /UPDATE prompt_execution_results SET was_selected = 0/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO prompt_agent_comparisons/i, rows: { affectedRows: 1 } },
];
{
  const r = await selectBestResult('eg1');
  // Same score → priority wins — slow-high has priority 10 < 20
  assertEq(r.selected_result_id, 'r1', 'priority 10 wins');
  assertEq(r.comparison.tie_breaker_used, true, 'tie_breaker used');
  assertEq(r.comparison.tie_breaker_method, 'agent_priority', 'method = priority');
}

// ============================================================================
// selectBestResult — tie-break by execution_speed
// ============================================================================
console.log('\n── selectBestResult: tie-break speed ─────────────────────');

resetState();
routes = [
  { match: /FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i, rows: [
    {
      id: 'r1', agent_id: 'a1', prompt_plan_step_id: 'step1',
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      execution_duration_ms: 200, agent_name: 'slow', agent_priority: 10,
      evaluator_status: 'evaluated',
    },
    {
      id: 'r2', agent_id: 'a2', prompt_plan_step_id: 'step1',
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      execution_duration_ms: 100, agent_name: 'fast', agent_priority: 10,
      evaluator_status: 'evaluated',
    },
  ]},
  { match: /UPDATE prompt_execution_results SET was_selected = 1/i, rows: { affectedRows: 1 } },
  { match: /UPDATE prompt_execution_results SET was_selected = 0/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO prompt_agent_comparisons/i, rows: { affectedRows: 1 } },
];
{
  const r = await selectBestResult('eg1');
  // Same score, same priority → faster wins
  assertEq(r.selected_result_id, 'r2', 'faster wins');
  assertEq(r.comparison.tie_breaker_used, true, 'tie_breaker used');
  assertEq(r.comparison.tie_breaker_method, 'execution_speed', 'method = speed');
}

// ============================================================================
// getComparison
// ============================================================================
console.log('\n── getComparison ─────────────────────────────────────────');

// Not found
resetState();
routes = [
  { match: /FROM prompt_agent_comparisons/i, rows: [] },
];
{
  const r = await getComparison('eg-missing');
  assertEq(r, null, 'null when missing');
}

// Happy path — JSON parsed
resetState();
routes = [
  { match: /FROM prompt_agent_comparisons/i, rows: [{
    id: 'c1',
    execution_group_id: 'eg1',
    agents_compared: '["a1","a2"]',
    comparison_scores: '{"a1":{"total_score":610}}',
    selected_agent_name: 'claude',
  }]},
];
{
  const r = await getComparison('eg1');
  assert(r !== null, 'not null');
  assertEq(r.agents_compared, ['a1', 'a2'], 'agents parsed');
  assertEq(r.comparison_scores, { a1: { total_score: 610 } }, 'scores parsed');
}

// Malformed JSON → fallback
resetState();
routes = [
  { match: /FROM prompt_agent_comparisons/i, rows: [{
    id: 'c2',
    agents_compared: 'not-json',
    comparison_scores: '{oops',
  }]},
];
{
  const r = await getComparison('eg2');
  assertEq(r.agents_compared, [], 'malformed → [] fallback');
  assertEq(r.comparison_scores, {}, 'malformed → {} fallback');
}

// Null values → fallback
resetState();
routes = [
  { match: /FROM prompt_agent_comparisons/i, rows: [{ agents_compared: null, comparison_scores: null }] },
];
{
  const r = await getComparison('eg3');
  assertEq(r.agents_compared, [], 'null → []');
  assertEq(r.comparison_scores, {}, 'null → {}');
}

// ============================================================================
// getResultsForStep
// ============================================================================
console.log('\n── getResultsForStep ─────────────────────────────────────');

resetState();
routes = [
  { match: /WHERE r\.prompt_plan_step_id/i, rows: [
    { id: 'r1', violations_found: '[{"type":"v"}]', agent_name: 'c' },
    { id: 'r2', violations_found: null, agent_name: 'g' },
  ]},
];
{
  const r = await getResultsForStep('step1');
  assertEq(r.length, 2, '2 rows');
  assertEq(r[0].violations_found, [{ type: 'v' }], 'row 0 parsed');
  assertEq(r[1].violations_found, [], 'null → []');
}

// ============================================================================
// getAgentResults
// ============================================================================
console.log('\n── getAgentResults ───────────────────────────────────────');

resetState();
routes = [
  { match: /WHERE r\.agent_id/i, rows: [
    { id: 'r1', violations_found: '[]', agent_name: 'c' },
  ]},
];
{
  await getAgentResults('a1', 5);
  assertEq(dbCalls[0].params, ['a1', 5], 'limit param passed');
}

resetState();
routes = [
  { match: /WHERE r\.agent_id/i, rows: [] },
];
{
  await getAgentResults('a1');
  assertEq(dbCalls[0].params, ['a1', 20], 'default limit 20');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
