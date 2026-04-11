#!/usr/bin/env npx tsx
/**
 * Unit tests for services/resultSelectionService.js (OMD-1019)
 *
 * Covers:
 *   - COMPLETION_RANK / VALID_COMPLETION_STATUSES constants
 *   - _scoreResult formula
 *   - evaluateResult: invalid inputs, duplicate prevention, force override,
 *     happy path, not-found throw
 *   - selectBestResult: no results, single auto-select, unevaluated reject,
 *     multi-agent scoring with comparison INSERT, tie-breaker by agent_priority,
 *     tie-breaker by execution_duration_ms
 *   - getComparison: null when missing, JSON parse of agents_compared / scores
 *   - getResultsForStep: JSON parse of violations_found
 *   - getAgentResults: passes limit param
 *
 * Stubs (installed BEFORE requiring SUT):
 *   - ../config/db          (getAppPool)
 *   - uuid                  (v4)
 *
 * Fake pool uses regex-routed responses plus INSERT/UPDATE tracking.
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

// ── Fake pool with routed responses ──────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Route = { match: RegExp; rows?: any; result?: any; throws?: Error };
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        // mysql2 destructure: const [rows] = await pool.query(...)
        // rows slot holds SELECT rows OR the OkPacket for INSERT/UPDATE
        return [r.rows !== undefined ? r.rows : (r.result !== undefined ? r.result : [])];
      }
    }
    // Default for unmatched UPDATE/INSERT
    return [{ affectedRows: 1 }];
  },
};

const dbStub = { getAppPool: () => fakePool };

// uuid stub — counter-based for deterministic tests
let uuidCounter = 0;
const uuidStub = {
  v4: () => `uuid-${++uuidCounter}`,
};

// Install stubs BEFORE require
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: uuidStub,
} as any;

function resetState() {
  queryLog.length = 0;
  routes = [];
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
console.log('\n── Constants ────────────────────────────────────────────');

assertEq(COMPLETION_RANK.success, 5, 'success = 5');
assertEq(COMPLETION_RANK.partial, 3, 'partial = 3');
assertEq(COMPLETION_RANK.failure, 1, 'failure = 1');
assertEq(COMPLETION_RANK.blocked, 0, 'blocked = 0');
assertEq(COMPLETION_RANK.timeout, 0, 'timeout = 0');
assertEq(VALID_COMPLETION_STATUSES.length, 5, '5 valid statuses');
assert(VALID_COMPLETION_STATUSES.includes('success'), 'includes success');
assert(VALID_COMPLETION_STATUSES.includes('timeout'), 'includes timeout');

// ============================================================================
// _scoreResult
// ============================================================================
console.log('\n── _scoreResult ─────────────────────────────────────────');

{
  // success, 0 violations, 1.0 confidence → 5*100 + 10*10 + 10 = 610
  const s = _scoreResult({
    id: 'r1', agent_id: 'a1', agent_name: 'A', prompt_plan_step_id: 's1',
    execution_duration_ms: 100,
    completion_status: 'success', violation_count: 0, confidence: 1.0,
    agent_priority: 10,
  });
  assertEq(s.completion_rank, 5, 'success → 5');
  assertEq(s.violation_rank, 10, '0 violations → 10');
  assertEq(s.confidence_rank, 10, '1.0 confidence → 10');
  assertEq(s.total_score, 610, 'total = 5*100 + 10*10 + 10');
  assertEq(s.agent_priority, 10, 'priority preserved');
}

{
  // partial, 3 violations, 0.7 confidence → 3*100 + 7*10 + 7 = 377
  const s = _scoreResult({
    id: 'r', agent_id: 'a', prompt_plan_step_id: 's',
    completion_status: 'partial', violation_count: 3, confidence: 0.7,
  });
  assertEq(s.total_score, 377, 'partial/3viol/0.7 = 377');
}

{
  // violation_count > 10 → violation_rank clamped to 0
  const s = _scoreResult({
    id: 'r', agent_id: 'a', prompt_plan_step_id: 's',
    completion_status: 'success', violation_count: 25, confidence: 0,
  });
  assertEq(s.violation_rank, 0, 'violations > 10 clamped to 0');
}

{
  // Defaults when fields missing
  const s = _scoreResult({
    id: 'r', agent_id: 'a', prompt_plan_step_id: 's',
    completion_status: 'unknown-status',
  });
  assertEq(s.completion_rank, 0, 'unknown status → 0');
  assertEq(s.violation_count, 0, 'missing violations → 0');
  assertEq(s.confidence, 0, 'missing confidence → 0');
  assertEq(s.agent_priority, 50, 'missing priority → 50 default');
}

// ============================================================================
// evaluateResult — invalid completion_status
// ============================================================================
console.log('\n── evaluateResult: validation ───────────────────────────');

resetState();
{
  let caught: Error | null = null;
  try {
    await evaluateResult('r1', { completion_status: 'bogus', violations: [], confidence: 0.5 });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid status throws');
  assert(caught !== null && caught.message.includes('Invalid completion_status'), 'error mentions invalid');
  assertEq(queryLog.length, 0, 'no DB calls for invalid input');
}

// confidence out of range
resetState();
{
  let caught: Error | null = null;
  try {
    await evaluateResult('r1', { completion_status: 'success', violations: [], confidence: 1.5 });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'confidence > 1 throws');
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
// evaluateResult — skip when already evaluated
// ============================================================================
console.log('\n── evaluateResult: skip duplicate ───────────────────────');

resetState();
routes = [
  {
    match: /SELECT evaluator_status.*FROM prompt_execution_results/i,
    rows: [{ evaluator_status: 'evaluated', completion_status: 'success', confidence: 0.9 }],
  },
];
{
  const r = await evaluateResult('r1', {
    completion_status: 'success',
    violations: [],
    confidence: 0.9,
  });
  assertEq(r.skipped, true, 'skipped = true');
  assertEq(r.reason, 'Already evaluated', 'reason set');
  assertEq(r.completion_status, 'success', 'existing status returned');
  assertEq(queryLog.length, 1, 'only SELECT executed (no UPDATE)');
}

// force override — re-evaluate even if already evaluated
resetState();
routes = [
  {
    match: /UPDATE prompt_execution_results/i,
    rows: { affectedRows: 1 },  // mysql2 OkPacket in rows slot for destructure
  },
];
{
  const r = await evaluateResult(
    'r1',
    { completion_status: 'partial', violations: [{ type: 'v1' }], confidence: 0.6 },
    { force: true }
  );
  assertEq(r.skipped, undefined, 'not skipped');
  assertEq(r.violation_count, 1, 'violation count from array');
  // With force, no SELECT — only UPDATE
  assertEq(queryLog.length, 1, 'only UPDATE (force skips SELECT)');
  assert(/UPDATE prompt_execution_results/i.test(queryLog[0].sql), 'UPDATE ran');
}

// ============================================================================
// evaluateResult — happy path (not yet evaluated)
// ============================================================================
console.log('\n── evaluateResult: happy path ───────────────────────────');

resetState();
routes = [
  {
    match: /SELECT evaluator_status.*FROM prompt_execution_results/i,
    rows: [{ evaluator_status: 'pending', completion_status: null, confidence: null }],
  },
  {
    match: /UPDATE prompt_execution_results/i,
    rows: { affectedRows: 1 },
  },
];
{
  const r = await evaluateResult('r1', {
    completion_status: 'success',
    violations: [{ type: 'x' }, { type: 'y' }],
    confidence: 0.8,
    notes: 'looks good',
  });
  assertEq(r.completion_status, 'success', 'status');
  assertEq(r.violation_count, 2, '2 violations');
  assertEq(r.confidence, 0.8, 'confidence');
  assertEq(queryLog.length, 2, 'SELECT + UPDATE');
  const updateParams = queryLog[1].params;
  assertEq(updateParams[0], 'success', 'UPDATE param[0] = status');
  assertEq(JSON.parse(updateParams[1]).length, 2, 'violations JSON-serialized');
  assertEq(updateParams[2], 2, 'violation_count param');
  assertEq(updateParams[3], 0.8, 'confidence param');
  assertEq(updateParams[4], 'looks good', 'notes param');
  assertEq(updateParams[5], 'r1', 'resultId param');
}

// ============================================================================
// evaluateResult — not found
// ============================================================================
console.log('\n── evaluateResult: not found ────────────────────────────');

resetState();
routes = [
  {
    match: /SELECT evaluator_status.*FROM prompt_execution_results/i,
    rows: [],
  },
  {
    match: /UPDATE prompt_execution_results/i,
    rows: { affectedRows: 0 },  // not found
  },
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
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('not found'), 'error message');
}

// ============================================================================
// selectBestResult — no results
// ============================================================================
console.log('\n── selectBestResult: no results ─────────────────────────');

resetState();
routes = [
  { match: /FROM prompt_execution_results/i, rows: [] },
];
{
  let caught: Error | null = null;
  try {
    await selectBestResult('g1');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'no results throws');
  assert(caught !== null && caught.message.includes('No results'), 'error message');
}

// ============================================================================
// selectBestResult — single result auto-selects
// ============================================================================
console.log('\n── selectBestResult: single auto-select ─────────────────');

resetState();
routes = [
  {
    match: /FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i,
    rows: [{
      id: 'r1', agent_id: 'a1', agent_name: 'Solo', agent_priority: 10,
      prompt_plan_step_id: 's1', execution_duration_ms: 100,
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      evaluator_status: 'evaluated',
    }],
  },
  { match: /UPDATE prompt_execution_results/i, rows: { affectedRows: 1 } },
];
{
  const r = await selectBestResult('g1');
  assertEq(r.selected_result_id, 'r1', 'selected result');
  assertEq(r.selected_agent_id, 'a1', 'selected agent');
  assertEq(r.comparison, null, 'no comparison for single');
  assert(r.selection_reason.includes('Single'), 'reason mentions single');
  // Only the winner UPDATE runs — no INSERT, no loser updates
  const updates = queryLog.filter(q => /UPDATE prompt_execution_results/i.test(q.sql));
  assertEq(updates.length, 1, 'one UPDATE (winner only)');
  const inserts = queryLog.filter(q => /INSERT INTO prompt_agent_comparisons/i.test(q.sql));
  assertEq(inserts.length, 0, 'no comparison INSERT');
}

// ============================================================================
// selectBestResult — some unevaluated → throws
// ============================================================================
console.log('\n── selectBestResult: unevaluated reject ─────────────────');

resetState();
routes = [
  {
    match: /FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i,
    rows: [
      { id: 'r1', agent_id: 'a1', agent_name: 'A', agent_priority: 10, prompt_plan_step_id: 's',
        completion_status: 'success', violation_count: 0, confidence: 0.9, evaluator_status: 'evaluated' },
      { id: 'r2', agent_id: 'a2', agent_name: 'B', agent_priority: 20, prompt_plan_step_id: 's',
        completion_status: null, violation_count: 0, confidence: 0, evaluator_status: 'pending' },
    ],
  },
];
{
  let caught: Error | null = null;
  try {
    await selectBestResult('g2');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'unevaluated throws');
  assert(caught !== null && caught.message.includes('not yet evaluated'), 'error message');
  assert(caught !== null && caught.message.includes('r2'), 'error lists IDs');
}

// ============================================================================
// selectBestResult — multi-agent, clear winner
// ============================================================================
console.log('\n── selectBestResult: clear winner ───────────────────────');

resetState();
routes = [
  {
    match: /FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i,
    rows: [
      { id: 'r1', agent_id: 'a1', agent_name: 'Alpha', agent_priority: 10,
        prompt_plan_step_id: 's1', execution_duration_ms: 500,
        completion_status: 'success', violation_count: 0, confidence: 0.95,
        evaluator_status: 'evaluated' },
      { id: 'r2', agent_id: 'a2', agent_name: 'Beta', agent_priority: 20,
        prompt_plan_step_id: 's1', execution_duration_ms: 300,
        completion_status: 'partial', violation_count: 2, confidence: 0.7,
        evaluator_status: 'evaluated' },
      { id: 'r3', agent_id: 'a3', agent_name: 'Gamma', agent_priority: 30,
        prompt_plan_step_id: 's1', execution_duration_ms: 800,
        completion_status: 'failure', violation_count: 5, confidence: 0.4,
        evaluator_status: 'evaluated' },
    ],
  },
  { match: /UPDATE prompt_execution_results/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO prompt_agent_comparisons/i, rows: { affectedRows: 1 } },
];
{
  const r = await selectBestResult('g3');
  assertEq(r.selected_result_id, 'r1', 'Alpha wins (best completion)');
  assertEq(r.selected_agent_id, 'a1', 'winner = a1');
  assertEq(r.comparison.tie_breaker_used, false, 'no tie-breaker');
  assertEq(r.comparison.id, 'uuid-1', 'uuid issued');
  assert(r.comparison.scores.a1, 'a1 in scores');
  assertEq(r.comparison.scores.a1.completion_rank, 5, 'a1 completion_rank');
  assertEq(r.comparison.scores.a2.completion_rank, 3, 'a2 completion_rank');
  assertEq(r.comparison.scores.a3.completion_rank, 1, 'a3 completion_rank');
  // Winner + 2 losers + INSERT = 4 UPDATEs/INSERTs after the SELECT
  const updates = queryLog.filter(q => /UPDATE prompt_execution_results/i.test(q.sql));
  assertEq(updates.length, 3, '1 winner + 2 loser UPDATEs');
  const inserts = queryLog.filter(q => /INSERT INTO prompt_agent_comparisons/i.test(q.sql));
  assertEq(inserts.length, 1, 'comparison INSERT');
  // Check INSERT params
  const insertParams = inserts[0].params;
  assertEq(insertParams[0], 'uuid-1', 'comparison id');
  assertEq(insertParams[1], 'g3', 'execution_group_id');
  assertEq(insertParams[2], 's1', 'step_id');
  assertEq(insertParams[4], 'a1', 'selected_agent_id');
  assertEq(insertParams[5], 'r1', 'selected_result_id');
  assertEq(insertParams[8], 0, 'tie_breaker_used = 0');
  assertEq(insertParams[9], null, 'tie_breaker_method = null');
}

// ============================================================================
// selectBestResult — tie broken by agent_priority
// ============================================================================
console.log('\n── selectBestResult: tie-break priority ─────────────────');

resetState();
routes = [
  {
    match: /FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i,
    rows: [
      // Both identical score; a1 has lower priority (preferred)
      { id: 'r1', agent_id: 'a1', agent_name: 'Alpha', agent_priority: 10,
        prompt_plan_step_id: 's1', execution_duration_ms: 500,
        completion_status: 'success', violation_count: 0, confidence: 0.9,
        evaluator_status: 'evaluated' },
      { id: 'r2', agent_id: 'a2', agent_name: 'Beta', agent_priority: 20,
        prompt_plan_step_id: 's1', execution_duration_ms: 300,
        completion_status: 'success', violation_count: 0, confidence: 0.9,
        evaluator_status: 'evaluated' },
    ],
  },
  { match: /UPDATE prompt_execution_results/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO prompt_agent_comparisons/i, rows: { affectedRows: 1 } },
];
{
  const r = await selectBestResult('g4');
  assertEq(r.selected_agent_id, 'a1', 'a1 wins on lower priority');
  assertEq(r.comparison.tie_breaker_used, true, 'tie-breaker used');
  assertEq(r.comparison.tie_breaker_method, 'agent_priority', 'method = agent_priority');
}

// ============================================================================
// selectBestResult — tie broken by execution speed
// ============================================================================
console.log('\n── selectBestResult: tie-break speed ────────────────────');

resetState();
routes = [
  {
    match: /FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i,
    rows: [
      // Identical score AND identical priority; a2 is faster
      { id: 'r1', agent_id: 'a1', agent_name: 'Alpha', agent_priority: 10,
        prompt_plan_step_id: 's1', execution_duration_ms: 500,
        completion_status: 'success', violation_count: 0, confidence: 0.9,
        evaluator_status: 'evaluated' },
      { id: 'r2', agent_id: 'a2', agent_name: 'Beta', agent_priority: 10,
        prompt_plan_step_id: 's1', execution_duration_ms: 200,
        completion_status: 'success', violation_count: 0, confidence: 0.9,
        evaluator_status: 'evaluated' },
    ],
  },
  { match: /UPDATE prompt_execution_results/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO prompt_agent_comparisons/i, rows: { affectedRows: 1 } },
];
{
  const r = await selectBestResult('g5');
  assertEq(r.selected_agent_id, 'a2', 'a2 wins on speed');
  assertEq(r.comparison.tie_breaker_used, true, 'tie-breaker used');
  assertEq(r.comparison.tie_breaker_method, 'execution_speed', 'method = execution_speed');
}

// ============================================================================
// getComparison
// ============================================================================
console.log('\n── getComparison ────────────────────────────────────────');

// Not found
resetState();
routes = [
  { match: /FROM prompt_agent_comparisons/i, rows: [] },
];
{
  const r = await getComparison('nope');
  assertEq(r, null, 'missing → null');
}

// Happy path with JSON parsing
resetState();
routes = [
  {
    match: /FROM prompt_agent_comparisons/i,
    rows: [{
      id: 'c1',
      execution_group_id: 'g1',
      agents_compared: '["a1","a2","a3"]',
      comparison_scores: '{"a1":{"total_score":610}}',
      selected_agent_name: 'Alpha',
    }],
  },
];
{
  const r = await getComparison('g1');
  assertEq(r.id, 'c1', 'id');
  assertEq(r.agents_compared, ['a1', 'a2', 'a3'], 'agents_compared parsed');
  assertEq(r.comparison_scores.a1.total_score, 610, 'scores parsed');
  assertEq(r.selected_agent_name, 'Alpha', 'agent_name');
}

// Malformed JSON → fallback to defaults
resetState();
routes = [
  {
    match: /FROM prompt_agent_comparisons/i,
    rows: [{
      id: 'c2',
      agents_compared: 'not json',
      comparison_scores: 'also not json',
    }],
  },
];
{
  const r = await getComparison('g2');
  assertEq(r.agents_compared, [], 'malformed agents → []');
  assertEq(r.comparison_scores, {}, 'malformed scores → {}');
}

// ============================================================================
// getResultsForStep
// ============================================================================
console.log('\n── getResultsForStep ────────────────────────────────────');

resetState();
routes = [
  {
    match: /FROM prompt_execution_results r[\s\S]*WHERE r\.prompt_plan_step_id/i,
    rows: [
      { id: 'r1', agent_name: 'A', violations_found: '[{"type":"v1"}]' },
      { id: 'r2', agent_name: 'B', violations_found: null },
    ],
  },
];
{
  const r = await getResultsForStep('s1');
  assertEq(r.length, 2, '2 results');
  assertEq(r[0].violations_found.length, 1, 'first: parsed array');
  assertEq(r[0].violations_found[0].type, 'v1', 'first: content');
  assertEq(r[1].violations_found, [], 'second: null → []');
}

// ============================================================================
// getAgentResults
// ============================================================================
console.log('\n── getAgentResults ──────────────────────────────────────');

resetState();
routes = [
  {
    match: /FROM prompt_execution_results r[\s\S]*WHERE r\.agent_id/i,
    rows: [
      { id: 'r1', agent_name: 'A', violations_found: '[]' },
    ],
  },
];
{
  const r = await getAgentResults('a1', 5);
  assertEq(r.length, 1, '1 result');
  assertEq(queryLog[0].params[0], 'a1', 'agentId param');
  assertEq(queryLog[0].params[1], 5, 'limit param');
  assertEq(r[0].violations_found, [], 'empty violations parsed');
}

// Default limit = 20
resetState();
routes = [
  { match: /FROM prompt_execution_results/i, rows: [] },
];
{
  await getAgentResults('a1');
  assertEq(queryLog[0].params[1], 20, 'default limit = 20');
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
