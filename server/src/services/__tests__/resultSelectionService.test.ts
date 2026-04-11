#!/usr/bin/env npx tsx
/**
 * Unit tests for services/resultSelectionService.js (OMD-1193)
 *
 * Deterministic, rule-based selection of best result across multi-agent
 * executions. No subjective ranking — fixed-order tie-breakers.
 *
 * External deps stubbed via require.cache:
 *   - ../config/db → fake pool (absolute path to avoid env validation)
 *   - uuid         → deterministic { v4 }
 *
 * Coverage:
 *   - COMPLETION_RANK + VALID_COMPLETION_STATUSES exports
 *   - _scoreResult: mapping, fallback defaults, weighting
 *   - evaluateResult:
 *       · invalid completion_status → throws
 *       · confidence out of range → throws
 *       · already-evaluated short-circuit (returns skipped:true)
 *       · force option bypasses short-circuit
 *       · happy path: SQL + params, violations serialized, count computed
 *       · affectedRows=0 → throws "Execution result not found"
 *   - selectBestResult:
 *       · no results → throws
 *       · single result → auto-select (no comparison, no loser updates)
 *       · unevaluated results → throws with ids listed
 *       · multi-result: highest completion_rank wins
 *       · violation tie-break
 *       · confidence tie-break
 *       · agent_priority tie-break (lower wins) — tie_breaker_used
 *       · execution_duration_ms final tie-break (faster wins)
 *       · 3+ results stable sort
 *       · INSERT into prompt_agent_comparisons fields
 *   - getComparison: returns null when empty, parses JSON fields
 *   - getResultsForStep: parses violations_found
 *   - getAgentResults: limit param
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

// ── db stub ──────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

// Scriptable responses
let selectExistingRows: any[] = [];
let selectGroupRows: any[] = [];
let getComparisonRows: any[] = [];
let stepResultRows: any[] = [];
let agentResultRows: any[] = [];
let updateAffectedRows = 1;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });

    // evaluateResult existing check
    if (/SELECT evaluator_status.*FROM prompt_execution_results WHERE id = \?/s.test(sql)) {
      return [selectExistingRows];
    }
    // selectBestResult group load
    if (/FROM prompt_execution_results r/.test(sql) && /agent_registry a/.test(sql) && /execution_group_id/.test(sql)) {
      return [selectGroupRows];
    }
    // getResultsForStep
    if (/FROM prompt_execution_results r/.test(sql) && /prompt_plan_step_id = \?/.test(sql)) {
      return [stepResultRows];
    }
    // getAgentResults
    if (/FROM prompt_execution_results r/.test(sql) && /r\.agent_id = \?/.test(sql) && /LIMIT/.test(sql)) {
      return [agentResultRows];
    }
    // getComparison
    if (/FROM prompt_agent_comparisons c/.test(sql)) {
      return [getComparisonRows];
    }
    // UPDATE on results (evaluateResult / _markSelected / loser update)
    if (/^UPDATE prompt_execution_results/.test(sql.trim())) {
      return [{ affectedRows: updateAffectedRows }];
    }
    // INSERT comparison
    if (/INSERT INTO prompt_agent_comparisons/.test(sql)) {
      return [{ insertId: 0 }];
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };

const nodePath = require('path');
const sutAbs = require.resolve('../resultSelectionService');
const sutDir = nodePath.dirname(sutAbs);
const dbAbs = require.resolve(nodePath.resolve(sutDir, '..', 'config', 'db'));

require.cache[dbAbs] = {
  id: dbAbs,
  filename: dbAbs,
  loaded: true,
  exports: dbStub,
} as any;

// ── uuid stub ────────────────────────────────────────────────────────
let uuidCounter = 0;
const uuidStub = { v4: () => `uuid-${++uuidCounter}` };

const uuidAbs = require.resolve('uuid');
require.cache[uuidAbs] = {
  id: uuidAbs,
  filename: uuidAbs,
  loaded: true,
  exports: uuidStub,
} as any;

function resetState() {
  queryLog.length = 0;
  selectExistingRows = [];
  selectGroupRows = [];
  getComparisonRows = [];
  stepResultRows = [];
  agentResultRows = [];
  updateAffectedRows = 1;
  uuidCounter = 0;
}

// ── Require SUT ──────────────────────────────────────────────────────
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
assertEq(
  VALID_COMPLETION_STATUSES.sort(),
  ['blocked', 'failure', 'partial', 'success', 'timeout'],
  'valid statuses'
);

// ============================================================================
// _scoreResult
// ============================================================================
console.log('\n── _scoreResult ──────────────────────────────────────────');

{
  const r = _scoreResult({
    id: 'r1', agent_id: 'a1', agent_name: 'A1',
    agent_priority: 10, prompt_plan_step_id: 's1',
    execution_duration_ms: 100,
    completion_status: 'success', violation_count: 2, confidence: 0.8,
  });
  assertEq(r.completion_rank, 5, 'success → 5');
  assertEq(r.violation_rank, 8, '10 - 2');
  assertEq(r.confidence_rank, 8, '0.8 * 10');
  assertEq(r.total_score, 5 * 100 + 8 * 10 + 8, 'total_score weighted');
}

// Unknown status → 0
{
  const r = _scoreResult({ completion_status: 'weird', violation_count: 0, confidence: 1 });
  assertEq(r.completion_rank, 0, 'unknown → 0');
  assertEq(r.violation_rank, 10, '0 violations → 10');
  assertEq(r.confidence_rank, 10, 'conf 1 → 10');
}

// Violation count > 10 → violation_rank clamped at 0
{
  const r = _scoreResult({ completion_status: 'success', violation_count: 15, confidence: 0 });
  assertEq(r.violation_rank, 0, 'clamped at 0');
}

// Defaults when undefined
{
  const r = _scoreResult({ id: 'x', agent_id: 'a', completion_status: 'partial' });
  assertEq(r.violation_count, 0, 'default violation_count 0');
  assertEq(r.confidence, 0, 'default confidence 0');
  assertEq(r.agent_priority, 50, 'default priority 50');
}

// ============================================================================
// evaluateResult — validation
// ============================================================================
console.log('\n── evaluateResult: validation ────────────────────────────');

resetState();
{
  let caught: any = null;
  try {
    await evaluateResult('r1', { completion_status: 'BOGUS', violations: [], confidence: 0.5 });
  } catch (e) { caught = e; }
  assert(caught && /Invalid completion_status/.test(caught.message), 'invalid status');
}

resetState();
{
  let caught: any = null;
  try {
    await evaluateResult('r1', { completion_status: 'success', violations: [], confidence: 1.5 });
  } catch (e) { caught = e; }
  assert(caught && /confidence must be between 0 and 1/.test(caught.message), 'conf > 1');
}

resetState();
{
  let caught: any = null;
  try {
    await evaluateResult('r1', { completion_status: 'success', violations: [], confidence: -0.1 });
  } catch (e) { caught = e; }
  assert(caught && /confidence must be between 0 and 1/.test(caught.message), 'conf < 0');
}

// ============================================================================
// evaluateResult — short-circuit on already evaluated
// ============================================================================
console.log('\n── evaluateResult: short-circuit ─────────────────────────');

resetState();
selectExistingRows = [{ evaluator_status: 'evaluated', completion_status: 'success', confidence: 0.9 }];
{
  const r = await evaluateResult('r1', { completion_status: 'partial', violations: [], confidence: 0.5 });
  assertEq(r.skipped, true, 'short-circuited');
  assertEq(r.completion_status, 'success', 'returns existing status');
  assertEq(r.reason, 'Already evaluated', 'reason');
  // Only the SELECT ran, no UPDATE
  assertEq(queryLog.length, 1, 'only 1 query');
  assert(/SELECT/.test(queryLog[0].sql), 'SELECT only');
}

// Force flag bypasses short-circuit
resetState();
selectExistingRows = [{ evaluator_status: 'evaluated', completion_status: 'success', confidence: 0.9 }];
updateAffectedRows = 1;
{
  const r = await evaluateResult('r1', { completion_status: 'partial', violations: [{ type: 'x' }], confidence: 0.5 }, { force: true });
  assertEq(r.skipped, undefined, 'no skipped flag');
  assertEq(r.completion_status, 'partial', 'new status applied');
  // SELECT skipped when force=true, only UPDATE
  const updateQ = queryLog.find(q => /^UPDATE prompt_execution_results/.test(q.sql.trim()));
  assert(updateQ !== undefined, 'UPDATE ran with force');
}

// ============================================================================
// evaluateResult — happy path
// ============================================================================
console.log('\n── evaluateResult: happy path ────────────────────────────');

resetState();
selectExistingRows = [{ evaluator_status: 'pending', completion_status: null, confidence: null }];
updateAffectedRows = 1;
{
  const violations = [
    { type: 'naming', description: 'bad var', severity: 'low' },
    { type: 'logic', description: 'off by one', severity: 'high' },
  ];
  const r = await evaluateResult('r1', {
    completion_status: 'partial',
    violations,
    confidence: 0.75,
    notes: 'Needs work',
  });
  assertEq(r.violation_count, 2, '2 violations');
  const upd = queryLog.find(q => /^UPDATE prompt_execution_results/.test(q.sql.trim()));
  assert(upd !== undefined, 'update ran');
  assertEq(upd!.params[0], 'partial', 'status');
  assertEq(upd!.params[1], JSON.stringify(violations), 'violations JSON');
  assertEq(upd!.params[2], 2, 'violation count');
  assertEq(upd!.params[3], 0.75, 'confidence');
  assertEq(upd!.params[4], 'Needs work', 'notes');
  assertEq(upd!.params[5], 'r1', 'resultId');
}

// Missing violations → empty array
resetState();
selectExistingRows = [];
updateAffectedRows = 1;
{
  const r = await evaluateResult('r1', { completion_status: 'success', violations: null as any, confidence: 0.9 });
  assertEq(r.violation_count, 0, '0 violations');
  const upd = queryLog.find(q => /^UPDATE prompt_execution_results/.test(q.sql.trim()));
  assertEq(upd!.params[1], '[]', 'empty array JSON');
}

// affectedRows = 0 → throws
resetState();
selectExistingRows = [];
updateAffectedRows = 0;
{
  let caught: any = null;
  try {
    await evaluateResult('ghost', { completion_status: 'success', violations: [], confidence: 0.5 });
  } catch (e) { caught = e; }
  assert(caught && /Execution result not found/.test(caught.message), 'not found');
}

// ============================================================================
// selectBestResult — error paths
// ============================================================================
console.log('\n── selectBestResult: errors ──────────────────────────────');

resetState();
selectGroupRows = [];
{
  let caught: any = null;
  try { await selectBestResult('group-1'); } catch (e) { caught = e; }
  assert(caught && /No results found/.test(caught.message), 'no results');
}

// Unevaluated results
resetState();
selectGroupRows = [
  { id: 'r1', agent_id: 'a1', agent_name: 'A1', agent_priority: 10,
    evaluator_status: 'evaluated', completion_status: 'success', violation_count: 0, confidence: 1 },
  { id: 'r2', agent_id: 'a2', agent_name: 'A2', agent_priority: 20,
    evaluator_status: 'pending', completion_status: null, violation_count: 0, confidence: 0 },
];
{
  let caught: any = null;
  try { await selectBestResult('group-1'); } catch (e) { caught = e; }
  assert(caught && /1 result\(s\) not yet evaluated/.test(caught.message), 'throws with count');
  assert(caught && /r2/.test(caught.message), 'mentions unevaluated id');
}

// ============================================================================
// selectBestResult — single result auto-select
// ============================================================================
console.log('\n── selectBestResult: single result ───────────────────────');

resetState();
selectGroupRows = [
  { id: 'r1', agent_id: 'a1', agent_name: 'A1', agent_priority: 10,
    evaluator_status: 'evaluated', completion_status: 'success',
    violation_count: 0, confidence: 1 },
];
{
  const r = await selectBestResult('group-1');
  assertEq(r.selected_result_id, 'r1', 'selected');
  assertEq(r.selected_agent_id, 'a1', 'agent');
  assertEq(r.comparison, null, 'no comparison');
  assert(/auto-selected/.test(r.selection_reason), 'auto-selected reason');
  // Exactly 1 UPDATE (mark selected), no INSERT into comparisons
  const updates = queryLog.filter(q => /^UPDATE prompt_execution_results/.test(q.sql.trim()));
  assertEq(updates.length, 1, '1 update');
  assert(!queryLog.some(q => /INSERT INTO prompt_agent_comparisons/.test(q.sql)), 'no comparison insert');
}

// ============================================================================
// selectBestResult — completion_rank wins
// ============================================================================
console.log('\n── selectBestResult: completion rank ─────────────────────');

resetState();
selectGroupRows = [
  { id: 'r1', agent_id: 'a1', agent_name: 'A1', agent_priority: 10, prompt_plan_step_id: 's1',
    evaluator_status: 'evaluated', completion_status: 'partial', violation_count: 0, confidence: 1, execution_duration_ms: 100 },
  { id: 'r2', agent_id: 'a2', agent_name: 'A2', agent_priority: 20, prompt_plan_step_id: 's1',
    evaluator_status: 'evaluated', completion_status: 'success', violation_count: 5, confidence: 0.3, execution_duration_ms: 500 },
];
{
  const r = await selectBestResult('group-1');
  // r2 wins: success=5 beats partial=3, even though more violations
  assertEq(r.selected_result_id, 'r2', 'success > partial');
  assertEq(r.comparison.tie_breaker_used, false, 'no tie-breaker');
  assert(/A2 selected/.test(r.selection_reason), 'reason mentions A2');
  // INSERT comparison happened
  const cmp = queryLog.find(q => /INSERT INTO prompt_agent_comparisons/.test(q.sql));
  assert(cmp !== undefined, 'comparison inserted');
  assertEq(cmp!.params[0], 'uuid-1', 'uuid for comparison id');
  assertEq(cmp!.params[4], 'a2', 'selected_agent_id');
  assertEq(cmp!.params[5], 'r2', 'selected_result_id');
  // Loser marked
  const loserUpdate = queryLog.find(q =>
    /was_selected = 0/.test(q.sql) && q.params && q.params[1] === 'r1'
  );
  assert(loserUpdate !== undefined, 'loser updated');
}

// ============================================================================
// selectBestResult — violation count tie-break
// ============================================================================
console.log('\n── selectBestResult: violation tie-break ─────────────────');

resetState();
selectGroupRows = [
  { id: 'r1', agent_id: 'a1', agent_name: 'A1', agent_priority: 10, prompt_plan_step_id: 's1',
    evaluator_status: 'evaluated', completion_status: 'success', violation_count: 3, confidence: 0.8, execution_duration_ms: 100 },
  { id: 'r2', agent_id: 'a2', agent_name: 'A2', agent_priority: 20, prompt_plan_step_id: 's1',
    evaluator_status: 'evaluated', completion_status: 'success', violation_count: 1, confidence: 0.8, execution_duration_ms: 200 },
];
{
  const r = await selectBestResult('group-1');
  // Both success (500), r1: vr=7 (70), r2: vr=9 (90), r2 wins
  assertEq(r.selected_result_id, 'r2', 'fewer violations wins');
  assertEq(r.comparison.tie_breaker_used, false, 'not a real tie');
}

// ============================================================================
// selectBestResult — agent_priority tie-breaker
// ============================================================================
console.log('\n── selectBestResult: priority tie-breaker ────────────────');

resetState();
selectGroupRows = [
  { id: 'r1', agent_id: 'a1', agent_name: 'HighPri', agent_priority: 5, prompt_plan_step_id: 's1',
    evaluator_status: 'evaluated', completion_status: 'success', violation_count: 0, confidence: 1, execution_duration_ms: 500 },
  { id: 'r2', agent_id: 'a2', agent_name: 'LowPri', agent_priority: 30, prompt_plan_step_id: 's1',
    evaluator_status: 'evaluated', completion_status: 'success', violation_count: 0, confidence: 1, execution_duration_ms: 100 },
];
{
  const r = await selectBestResult('group-1');
  assertEq(r.selected_result_id, 'r1', 'higher-priority (lower number) wins');
  assertEq(r.comparison.tie_breaker_used, true, 'tie-breaker used');
  assertEq(r.comparison.tie_breaker_method, 'agent_priority', 'tie method = priority');
}

// ============================================================================
// selectBestResult — execution_duration tie-breaker (final)
// ============================================================================
console.log('\n── selectBestResult: speed tie-breaker ───────────────────');

resetState();
selectGroupRows = [
  { id: 'r1', agent_id: 'a1', agent_name: 'Slow', agent_priority: 10, prompt_plan_step_id: 's1',
    evaluator_status: 'evaluated', completion_status: 'success', violation_count: 0, confidence: 1, execution_duration_ms: 500 },
  { id: 'r2', agent_id: 'a2', agent_name: 'Fast', agent_priority: 10, prompt_plan_step_id: 's1',
    evaluator_status: 'evaluated', completion_status: 'success', violation_count: 0, confidence: 1, execution_duration_ms: 100 },
];
{
  const r = await selectBestResult('group-1');
  assertEq(r.selected_result_id, 'r2', 'faster wins (same score, same priority)');
  assertEq(r.comparison.tie_breaker_used, true, 'tie-breaker used');
  assertEq(r.comparison.tie_breaker_method, 'execution_speed', 'tie method = speed');
}

// ============================================================================
// selectBestResult — 3-way comparison
// ============================================================================
console.log('\n── selectBestResult: 3-way ───────────────────────────────');

resetState();
selectGroupRows = [
  { id: 'rA', agent_id: 'a1', agent_name: 'A', agent_priority: 10, prompt_plan_step_id: 's1',
    evaluator_status: 'evaluated', completion_status: 'partial', violation_count: 0, confidence: 1, execution_duration_ms: 100 },
  { id: 'rB', agent_id: 'a2', agent_name: 'B', agent_priority: 20, prompt_plan_step_id: 's1',
    evaluator_status: 'evaluated', completion_status: 'success', violation_count: 0, confidence: 1, execution_duration_ms: 500 },
  { id: 'rC', agent_id: 'a3', agent_name: 'C', agent_priority: 30, prompt_plan_step_id: 's1',
    evaluator_status: 'evaluated', completion_status: 'success', violation_count: 2, confidence: 0.5, execution_duration_ms: 50 },
];
{
  const r = await selectBestResult('group-1');
  // B: 500 + 100 + 10 = 610; C: 500 + 80 + 5 = 585; A: 300 + 100 + 10 = 410
  assertEq(r.selected_result_id, 'rB', 'B highest total');
  assertEq(Object.keys(r.comparison.scores).length, 3, '3 agents in scores');
  // 2 loser updates
  const losers = queryLog.filter(q => /was_selected = 0/.test(q.sql));
  assertEq(losers.length, 2, '2 loser updates');
}

// ============================================================================
// getComparison
// ============================================================================
console.log('\n── getComparison ─────────────────────────────────────────');

resetState();
getComparisonRows = [];
{
  const r = await getComparison('ghost');
  assertEq(r, null, 'null when not found');
}

resetState();
getComparisonRows = [{
  id: 'c1',
  execution_group_id: 'g1',
  selected_agent_id: 'a1',
  selected_agent_name: 'A1',
  agents_compared: JSON.stringify(['a1', 'a2']),
  comparison_scores: JSON.stringify({ a1: { total_score: 100 } }),
}];
{
  const r = await getComparison('g1');
  assertEq(r.id, 'c1', 'id');
  assertEq(r.agents_compared, ['a1', 'a2'], 'parsed agents');
  assertEq(r.comparison_scores, { a1: { total_score: 100 } }, 'parsed scores');
  assertEq(r.selected_agent_name, 'A1', 'name preserved');
}

// ============================================================================
// getResultsForStep / getAgentResults
// ============================================================================
console.log('\n── getResultsForStep ─────────────────────────────────────');

resetState();
stepResultRows = [
  { id: 'r1', agent_name: 'A', violations_found: JSON.stringify([{ type: 'x' }]) },
  { id: 'r2', agent_name: 'B', violations_found: null },
];
{
  const r = await getResultsForStep('step-1');
  assertEq(r.length, 2, '2 results');
  assertEq(r[0].violations_found, [{ type: 'x' }], 'parsed');
  assertEq(r[1].violations_found, [], 'null → []');
}

console.log('\n── getAgentResults ───────────────────────────────────────');

resetState();
agentResultRows = [
  { id: 'r1', agent_name: 'A', violations_found: JSON.stringify([]) },
];
{
  const r = await getAgentResults('agent-1', 5);
  assertEq(r.length, 1, '1 result');
  const q = queryLog[queryLog.length - 1];
  assertEq(q.params, ['agent-1', 5], 'agentId + limit');
}

// Default limit 20
resetState();
agentResultRows = [];
await getAgentResults('agent-1');
assertEq(queryLog[queryLog.length - 1].params, ['agent-1', 20], 'default limit 20');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
