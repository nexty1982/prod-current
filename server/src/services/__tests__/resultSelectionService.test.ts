#!/usr/bin/env npx tsx
/**
 * Unit tests for services/resultSelectionService.js (OMD-1067)
 *
 * Deterministic, rule-based selection of the best result from a multi-agent
 * execution group. Pure scoring + DB read/write orchestration.
 *
 * Scoring algorithm:
 *   total_score = completion_rank * 100 + violation_rank * 10 + confidence_rank
 *   where:
 *     completion_rank ∈ {success:5, partial:3, failure:1, blocked:0, timeout:0}
 *     violation_rank  = max(0, 10 - violation_count)
 *     confidence_rank = round(confidence * 10)
 *
 * Tie-breakers: agent_priority ASC → execution_duration_ms ASC
 *
 * Exports covered:
 *   COMPLETION_RANK, VALID_COMPLETION_STATUSES   (constants)
 *   evaluateResult                               (validation + duplicate-skip + update)
 *   selectBestResult                             (single/multi/tie-break paths)
 *   getComparison / getResultsForStep / getAgentResults (reads + JSON parse)
 *   _scoreResult                                 (exposed for testing)
 *
 * External deps stubbed via require.cache BEFORE requiring the SUT:
 *   - ../config/db    (getAppPool)
 *   - uuid            (v4 — deterministic ids)
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

// ─── SQL-routed fake pool ───────────────────────────────────────────────────

type Route = { match: RegExp; rows?: any[]; respond?: (params: any[]) => any };
let routes: Route[] = [];
const queryLog: { sql: string; params: any[] }[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        const rows = r.respond ? r.respond(params) : (r.rows || []);
        return Array.isArray(rows) ? [rows] : [rows];
      }
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
{
  const path = require('path');
  const configDir = path.resolve(__dirname, '../../config');
  for (const fn of ['db.js', 'db.ts']) {
    const abs = path.join(configDir, fn);
    require.cache[abs] = {
      id: abs, filename: abs, loaded: true, exports: dbStub,
    } as any;
  }
}

// ─── uuid stub ──────────────────────────────────────────────────────────────

let uuidSeq = 0;
const uuidStub = { v4: () => `uuid-${++uuidSeq}` };
{
  const uuidPath = require.resolve('uuid');
  require.cache[uuidPath] = {
    id: uuidPath, filename: uuidPath, loaded: true, exports: uuidStub,
  } as any;
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

function resetState() {
  routes = [];
  queryLog.length = 0;
  uuidSeq = 0;
}

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
assertEq(VALID_COMPLETION_STATUSES.length, 5, '5 valid statuses');
assert(VALID_COMPLETION_STATUSES.includes('success'), 'includes success');

// ============================================================================
// _scoreResult (pure)
// ============================================================================
console.log('\n── _scoreResult ──────────────────────────────────────────');

{
  // Perfect: success, 0 violations, confidence 1.0
  const s = _scoreResult({
    id: 'r1', agent_id: 1, agent_name: 'a',
    completion_status: 'success',
    violation_count: 0,
    confidence: 1.0,
    agent_priority: 10,
    execution_duration_ms: 500,
  });
  assertEq(s.completion_rank, 5, 'completion_rank = 5');
  assertEq(s.violation_rank, 10, 'violation_rank = 10');
  assertEq(s.confidence_rank, 10, 'confidence_rank = 10');
  assertEq(s.total_score, 610, 'total_score = 500+100+10 = 610');
  assertEq(s.agent_priority, 10, 'agent_priority');
}

{
  // Partial, 3 violations, 0.5 confidence
  const s = _scoreResult({
    id: 'r2', agent_id: 2, agent_name: 'b',
    completion_status: 'partial',
    violation_count: 3,
    confidence: 0.5,
  });
  assertEq(s.completion_rank, 3, 'partial → 3');
  assertEq(s.violation_rank, 7, '10 - 3 = 7');
  assertEq(s.confidence_rank, 5, '0.5 * 10 = 5');
  assertEq(s.total_score, 375, '300 + 70 + 5 = 375');
  assertEq(s.agent_priority, 50, 'defaults to 50');
}

{
  // Failure, many violations (clamped to 0)
  const s = _scoreResult({
    id: 'r3', agent_id: 3, agent_name: 'c',
    completion_status: 'failure',
    violation_count: 25,
    confidence: 0.1,
  });
  assertEq(s.violation_rank, 0, 'violation_rank clamped to 0');
  assertEq(s.total_score, 100 + 0 + 1, '100 + 0 + 1 = 101');
}

{
  // Unknown completion status → 0
  const s = _scoreResult({
    id: 'r4', agent_id: 4, agent_name: 'd',
    completion_status: 'weird' as any,
    violation_count: 0,
    confidence: 0.8,
  });
  assertEq(s.completion_rank, 0, 'unknown → 0');
  assertEq(s.total_score, 0 + 100 + 8, '0 + 100 + 8 = 108');
}

{
  // Null/undefined fields defaulted
  const s = _scoreResult({
    id: 'r5', agent_id: 5, agent_name: 'e',
    completion_status: 'success',
    violation_count: null,
    confidence: null,
  });
  assertEq(s.violation_count, 0, 'null violations → 0');
  assertEq(s.confidence, 0, 'null confidence → 0');
  assertEq(s.violation_rank, 10, '10 - 0 = 10');
  assertEq(s.confidence_rank, 0, '0 * 10 = 0');
  assertEq(s.total_score, 500 + 100 + 0, '600');
}

// ============================================================================
// evaluateResult — validation
// ============================================================================
console.log('\n── evaluateResult: validation ────────────────────────────');

resetState();
{
  let caught: Error | null = null;
  try {
    await evaluateResult('r1', { completion_status: 'bogus', violations: [], confidence: 0.5 });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid status throws');
  assert(caught !== null && caught.message.includes('Invalid completion_status'), 'error message');
}

resetState();
{
  let caught: Error | null = null;
  try {
    await evaluateResult('r1', { completion_status: 'success', violations: [], confidence: 1.5 });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'confidence > 1 throws');
  assert(caught !== null && caught.message.includes('confidence must be between'), 'error message');
}

resetState();
{
  let caught: Error | null = null;
  try {
    await evaluateResult('r1', { completion_status: 'success', violations: [], confidence: -0.1 });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'confidence < 0 throws');
}

// ============================================================================
// evaluateResult — duplicate skip (not forced)
// ============================================================================
console.log('\n── evaluateResult: duplicate skip ────────────────────────');

resetState();
routes = [{
  match: /SELECT evaluator_status, completion_status, confidence FROM prompt_execution_results/,
  rows: [{ evaluator_status: 'evaluated', completion_status: 'success', confidence: 0.9 }],
}];
{
  const r = await evaluateResult('r1', {
    completion_status: 'partial',
    violations: [{ type: 'x', description: 'y', severity: 'high' }],
    confidence: 0.5,
  });
  assertEq(r.skipped, true, 'skipped = true');
  assertEq(r.completion_status, 'success', 'returns existing completion');
  assertEq(r.confidence, 0.9, 'returns existing confidence');
  assertEq(r.reason, 'Already evaluated', 'reason');
  // Should NOT have updated
  const updates = queryLog.filter(q => /UPDATE prompt_execution_results/.test(q.sql));
  assertEq(updates.length, 0, 'no UPDATE issued');
}

// ============================================================================
// evaluateResult — force re-evaluates
// ============================================================================
console.log('\n── evaluateResult: force ─────────────────────────────────');

resetState();
routes = [
  // _autoEvaluate still runs SELECT if force is false, but force=true skips check
  { match: /UPDATE prompt_execution_results[\s\S]*evaluator_status = 'evaluated'/,
    rows: { affectedRows: 1 } },
];
{
  const r = await evaluateResult(
    'r1',
    { completion_status: 'success', violations: [], confidence: 0.95, notes: 'great' },
    { force: true }
  );
  assertEq(r.completion_status, 'success', 'updates status');
  assertEq(r.confidence, 0.95, 'confidence returned');
  assertEq(r.violation_count, 0, 'violation_count');
  assertEq(r.skipped, undefined, 'not skipped');
  // SELECT should NOT have been called when force=true
  const selects = queryLog.filter(q => /SELECT evaluator_status/.test(q.sql));
  assertEq(selects.length, 0, 'no SELECT on force');
  // UPDATE called
  const updates = queryLog.filter(q => /UPDATE prompt_execution_results/.test(q.sql));
  assertEq(updates.length, 1, '1 UPDATE');
  // Params: completion_status, violations_json, count, confidence, notes, resultId
  assertEq(updates[0].params[0], 'success', 'completion_status param');
  assertEq(updates[0].params[1], '[]', 'violations JSON (empty)');
  assertEq(updates[0].params[2], 0, 'violation_count param');
  assertEq(updates[0].params[3], 0.95, 'confidence param');
  assertEq(updates[0].params[4], 'great', 'notes param');
  assertEq(updates[0].params[5], 'r1', 'resultId param');
}

// ============================================================================
// evaluateResult — with violations
// ============================================================================
console.log('\n── evaluateResult: with violations ───────────────────────');

resetState();
routes = [
  { match: /SELECT evaluator_status, completion_status, confidence/, rows: [] },
  { match: /UPDATE prompt_execution_results[\s\S]*evaluator_status = 'evaluated'/,
    rows: { affectedRows: 1 } },
];
{
  const violations = [
    { type: 'style', description: 's', severity: 'low' },
    { type: 'logic', description: 'l', severity: 'high' },
  ];
  const r = await evaluateResult('r2', {
    completion_status: 'partial',
    violations,
    confidence: 0.6,
  });
  assertEq(r.violation_count, 2, '2 violations counted');
  const updates = queryLog.filter(q => /UPDATE prompt_execution_results/.test(q.sql));
  assertEq(updates[0].params[1], JSON.stringify(violations), 'violations JSON serialized');
  assertEq(updates[0].params[2], 2, 'count = 2');
}

// ============================================================================
// evaluateResult — row not found
// ============================================================================
console.log('\n── evaluateResult: not found ─────────────────────────────');

resetState();
routes = [
  { match: /SELECT evaluator_status, completion_status, confidence/, rows: [] },
  { match: /UPDATE prompt_execution_results[\s\S]*evaluator_status = 'evaluated'/,
    rows: { affectedRows: 0 } },
];
{
  let caught: Error | null = null;
  try {
    await evaluateResult('missing', {
      completion_status: 'success',
      violations: [],
      confidence: 0.5,
    });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on 0 affectedRows');
  assert(caught !== null && caught.message.includes('not found'), 'error message');
}

// ============================================================================
// selectBestResult — no results
// ============================================================================
console.log('\n── selectBestResult: no results ──────────────────────────');

resetState();
routes = [{
  match: /SELECT r\.\*, a\.name as agent_name, a\.default_priority/,
  rows: [],
}];
{
  let caught: Error | null = null;
  try {
    await selectBestResult('group-empty');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on no results');
  assert(caught !== null && caught.message.includes('No results found'), 'error message');
}

// ============================================================================
// selectBestResult — single result auto-select
// ============================================================================
console.log('\n── selectBestResult: single ──────────────────────────────');

resetState();
routes = [
  { match: /SELECT r\.\*, a\.name as agent_name, a\.default_priority/,
    rows: [{
      id: 'solo', agent_id: 1, agent_name: 'solo', agent_priority: 10,
      execution_group_id: 'g1', prompt_plan_step_id: 42,
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      execution_duration_ms: 100, evaluator_status: 'evaluated',
    }],
  },
  { match: /UPDATE prompt_execution_results SET was_selected/, rows: { affectedRows: 1 } },
];
{
  const r = await selectBestResult('g1');
  assertEq(r.selected_result_id, 'solo', 'solo selected');
  assertEq(r.selected_agent_id, 1, 'solo agent');
  assertEq(r.comparison, null, 'no comparison');
  assertEq(r.selection_reason, 'Single agent execution — auto-selected', 'reason');
  // was_selected = 1 UPDATE issued
  const updates = queryLog.filter(q => /was_selected/.test(q.sql));
  assertEq(updates.length, 1, '1 select update');
}

// ============================================================================
// selectBestResult — unevaluated results
// ============================================================================
console.log('\n── selectBestResult: unevaluated ─────────────────────────');

resetState();
routes = [{
  match: /SELECT r\.\*, a\.name as agent_name, a\.default_priority/,
  rows: [
    { id: 'a', agent_id: 1, agent_name: 'A', evaluator_status: 'evaluated',
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      agent_priority: 10, execution_duration_ms: 100, prompt_plan_step_id: 1 },
    { id: 'b', agent_id: 2, agent_name: 'B', evaluator_status: 'pending',
      completion_status: null, violation_count: 0, confidence: 0,
      agent_priority: 20, execution_duration_ms: 200, prompt_plan_step_id: 1 },
  ],
}];
{
  let caught: Error | null = null;
  try { await selectBestResult('g2'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on unevaluated');
  assert(caught !== null && caught.message.includes('not yet evaluated'), 'error message');
  assert(caught !== null && caught.message.includes('b'), 'includes unevaluated id');
}

// ============================================================================
// selectBestResult — clear winner
// ============================================================================
console.log('\n── selectBestResult: clear winner ────────────────────────');

resetState();
routes = [
  { match: /SELECT r\.\*, a\.name as agent_name, a\.default_priority/,
    rows: [
      { id: 'A', agent_id: 1, agent_name: 'Claude', evaluator_status: 'evaluated',
        completion_status: 'success', violation_count: 0, confidence: 0.95,
        agent_priority: 10, execution_duration_ms: 120, prompt_plan_step_id: 99 },
      { id: 'B', agent_id: 2, agent_name: 'GPT', evaluator_status: 'evaluated',
        completion_status: 'partial', violation_count: 2, confidence: 0.6,
        agent_priority: 20, execution_duration_ms: 150, prompt_plan_step_id: 99 },
    ],
  },
  { match: /UPDATE prompt_execution_results SET was_selected = 1/,
    rows: { affectedRows: 1 } },
  { match: /UPDATE prompt_execution_results SET was_selected = 0/,
    rows: { affectedRows: 1 } },
  { match: /INSERT INTO prompt_agent_comparisons/,
    rows: { affectedRows: 1 } },
];
{
  const r = await selectBestResult('g3');
  assertEq(r.selected_result_id, 'A', 'A selected (higher completion)');
  assertEq(r.selected_agent_id, 1, 'agent 1');
  assertEq(r.comparison.tie_breaker_used, false, 'no tie breaker');
  assertEq(r.comparison.tie_breaker_method, null, 'no tie method');
  assert(r.comparison.id.startsWith('uuid-'), 'comparison uuid');
  // Reason should mention both agents
  assert(r.selection_reason.includes('Claude'), 'reason: Claude');
  assert(r.selection_reason.includes('GPT'), 'reason: GPT');
  assert(r.selection_reason.includes('completion'), 'reason mentions completion');
  assert(r.selection_reason.includes('violations'), 'reason mentions violations');

  // Verify comparison INSERT was called
  const inserts = queryLog.filter(q => /INSERT INTO prompt_agent_comparisons/.test(q.sql));
  assertEq(inserts.length, 1, '1 comparison insert');
  // comparison_method = 'rule_based' is hardcoded in SQL
  assert(/'rule_based'/.test(inserts[0].sql), 'rule_based method');

  // Winner mark + loser mark
  const winnerUpdates = queryLog.filter(q => /was_selected = 1/.test(q.sql));
  const loserUpdates = queryLog.filter(q => /was_selected = 0/.test(q.sql));
  assertEq(winnerUpdates.length, 1, '1 winner mark');
  assertEq(loserUpdates.length, 1, '1 loser mark');
}

// ============================================================================
// selectBestResult — tie-break by agent_priority
// ============================================================================
console.log('\n── selectBestResult: tie-break priority ──────────────────');

resetState();
routes = [
  { match: /SELECT r\.\*, a\.name as agent_name, a\.default_priority/,
    rows: [
      { id: 'A', agent_id: 1, agent_name: 'Lower', evaluator_status: 'evaluated',
        completion_status: 'success', violation_count: 0, confidence: 0.8,
        agent_priority: 20, execution_duration_ms: 100, prompt_plan_step_id: 1 },
      { id: 'B', agent_id: 2, agent_name: 'Preferred', evaluator_status: 'evaluated',
        completion_status: 'success', violation_count: 0, confidence: 0.8,
        agent_priority: 10, execution_duration_ms: 150, prompt_plan_step_id: 1 },
    ],
  },
  { match: /UPDATE prompt_execution_results SET was_selected = 1/, rows: { affectedRows: 1 } },
  { match: /UPDATE prompt_execution_results SET was_selected = 0/, rows: { affectedRows: 1 } },
  { match: /INSERT INTO prompt_agent_comparisons/, rows: { affectedRows: 1 } },
];
{
  const r = await selectBestResult('g4');
  assertEq(r.selected_result_id, 'B', 'B wins (lower priority)');
  assertEq(r.comparison.tie_breaker_used, true, 'tie breaker used');
  assertEq(r.comparison.tie_breaker_method, 'agent_priority', 'priority tie-break');
  assert(r.selection_reason.includes('tie-breaker: agent_priority'), 'reason includes priority');
}

// ============================================================================
// selectBestResult — tie-break by execution speed
// ============================================================================
console.log('\n── selectBestResult: tie-break speed ─────────────────────');

resetState();
routes = [
  { match: /SELECT r\.\*, a\.name as agent_name, a\.default_priority/,
    rows: [
      { id: 'A', agent_id: 1, agent_name: 'Slow', evaluator_status: 'evaluated',
        completion_status: 'success', violation_count: 0, confidence: 0.8,
        agent_priority: 10, execution_duration_ms: 500, prompt_plan_step_id: 1 },
      { id: 'B', agent_id: 2, agent_name: 'Fast', evaluator_status: 'evaluated',
        completion_status: 'success', violation_count: 0, confidence: 0.8,
        agent_priority: 10, execution_duration_ms: 100, prompt_plan_step_id: 1 },
    ],
  },
  { match: /UPDATE prompt_execution_results SET was_selected = 1/, rows: { affectedRows: 1 } },
  { match: /UPDATE prompt_execution_results SET was_selected = 0/, rows: { affectedRows: 1 } },
  { match: /INSERT INTO prompt_agent_comparisons/, rows: { affectedRows: 1 } },
];
{
  const r = await selectBestResult('g5');
  assertEq(r.selected_result_id, 'B', 'B wins (faster)');
  assertEq(r.comparison.tie_breaker_used, true, 'tie breaker used');
  assertEq(r.comparison.tie_breaker_method, 'execution_speed', 'speed tie-break');
}

// ============================================================================
// getComparison
// ============================================================================
console.log('\n── getComparison ─────────────────────────────────────────');

// Found
resetState();
routes = [{
  match: /FROM prompt_agent_comparisons/,
  respond: (params) => {
    assertEq(params[0], 'g-found', 'groupId param');
    return [{
      id: 'c1',
      execution_group_id: 'g-found',
      selected_agent_name: 'Claude',
      agents_compared: '[1,2,3]',
      comparison_scores: '{"1":{"total_score":610}}',
    }];
  },
}];
{
  const r = await getComparison('g-found');
  assertEq(r.id, 'c1', 'id');
  assertEq(r.selected_agent_name, 'Claude', 'agent name');
  assertEq(r.agents_compared, [1, 2, 3], 'agents_compared parsed');
  assertEq(r.comparison_scores['1'].total_score, 610, 'comparison_scores parsed');
}

// Not found
resetState();
routes = [{ match: /FROM prompt_agent_comparisons/, rows: [] }];
{
  const r = await getComparison('g-missing');
  assertEq(r, null, 'not found → null');
}

// Malformed JSON in agents_compared → fallback
resetState();
routes = [{
  match: /FROM prompt_agent_comparisons/,
  rows: [{ id: 'c2', agents_compared: 'not json', comparison_scores: null }],
}];
{
  const r = await getComparison('g-bad');
  assertEq(r.agents_compared, [], 'bad JSON → []');
  assertEq(r.comparison_scores, {}, 'null → {}');
}

// ============================================================================
// getResultsForStep
// ============================================================================
console.log('\n── getResultsForStep ─────────────────────────────────────');

resetState();
routes = [{
  match: /FROM prompt_execution_results r[\s\S]*WHERE r\.prompt_plan_step_id/,
  respond: (params) => {
    assertEq(params[0], 42, 'stepId param');
    return [
      { id: 'r1', agent_name: 'claude',
        violations_found: '[{"type":"x"}]' },
      { id: 'r2', agent_name: 'gpt',
        violations_found: null },
    ];
  },
}];
{
  const r = await getResultsForStep(42);
  assertEq(r.length, 2, '2 results');
  assertEq(r[0].violations_found.length, 1, 'parsed violations');
  assertEq(r[0].violations_found[0].type, 'x', 'violation type');
  assertEq(r[1].violations_found, [], 'null → []');
}

// ============================================================================
// getAgentResults
// ============================================================================
console.log('\n── getAgentResults ───────────────────────────────────────');

// Default limit = 20
resetState();
routes = [{
  match: /FROM prompt_execution_results r[\s\S]*WHERE r\.agent_id[\s\S]*LIMIT/,
  respond: (params) => {
    assertEq(params[0], 7, 'agentId param');
    assertEq(params[1], 20, 'default limit');
    return [{ id: 'r1', agent_name: 'a', violations_found: '[]' }];
  },
}];
{
  const r = await getAgentResults(7);
  assertEq(r.length, 1, '1 result');
  assertEq(r[0].violations_found, [], 'parsed empty violations');
}

// Custom limit
resetState();
routes = [{
  match: /FROM prompt_execution_results r[\s\S]*WHERE r\.agent_id[\s\S]*LIMIT/,
  respond: (params) => {
    assertEq(params[1], 5, 'custom limit');
    return [];
  },
}];
{
  await getAgentResults(7, 5);
  assertEq(queryLog.length, 1, '1 query');
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
