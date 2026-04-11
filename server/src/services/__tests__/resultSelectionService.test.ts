#!/usr/bin/env npx tsx
/**
 * Unit tests for services/resultSelectionService.js (OMD-1235)
 *
 * Deterministic multi-agent result selection with strict scoring rules:
 *   completion_rank * 100 + violation_rank * 10 + confidence_rank
 * Plus tie-breakers: agent_priority ASC, execution_duration_ms ASC.
 *
 * Strategy: stub ../../config/db with a regex-dispatch fake pool, stub uuid
 * with a counter. Test _scoreResult (pure), selectBestResult (DB-heavy),
 * evaluateResult (duplicate suppression), getComparison, getResultsForStep,
 * getAgentResults.
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

// ── Stub uuid ───────────────────────────────────────────────────
let uuidCounter = 0;
const uuidStub = { v4: () => `uuid-${++uuidCounter}` };
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: uuidStub,
} as any;

// ── Fake pool ───────────────────────────────────────────────────
type PoolCall = { sql: string; params: any[] };
const poolLog: PoolCall[] = [];

type Responder = { match: RegExp; respond: (params: any[]) => any };
let poolResponders: Responder[] = [];
let defaultSelect: any[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    poolLog.push({ sql, params });
    for (const r of poolResponders) {
      if (r.match.test(sql)) {
        const out = r.respond(params);
        if (out instanceof Error) throw out;
        return out;
      }
    }
    // Fallback: SELECT → rows, UPDATE → affectedRows:1, INSERT → insertId:1
    if (/^\s*SELECT/i.test(sql)) return [defaultSelect];
    if (/^\s*UPDATE/i.test(sql)) return [{ affectedRows: 1 }];
    if (/^\s*INSERT/i.test(sql)) return [{ insertId: 1 }];
    return [[]];
  },
};

// Stub ../../config/db
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

function resetState() {
  poolLog.length = 0;
  poolResponders = [];
  defaultSelect = [];
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
// COMPLETION_RANK constants
// ============================================================================
console.log('\n── COMPLETION_RANK ───────────────────────────────────────');

assertEq(COMPLETION_RANK.success, 5, 'success=5');
assertEq(COMPLETION_RANK.partial, 3, 'partial=3');
assertEq(COMPLETION_RANK.failure, 1, 'failure=1');
assertEq(COMPLETION_RANK.blocked, 0, 'blocked=0');
assertEq(COMPLETION_RANK.timeout, 0, 'timeout=0');
assertEq(
  VALID_COMPLETION_STATUSES.sort(),
  ['blocked', 'failure', 'partial', 'success', 'timeout'],
  'VALID_COMPLETION_STATUSES'
);

// ============================================================================
// _scoreResult (pure)
// ============================================================================
console.log('\n── _scoreResult ──────────────────────────────────────────');

{
  const s = _scoreResult({
    id: 'r1',
    agent_id: 'a1',
    agent_name: 'Claude',
    agent_priority: 10,
    prompt_plan_step_id: 'step1',
    execution_duration_ms: 500,
    completion_status: 'success',
    violation_count: 0,
    confidence: 1.0,
  });
  assertEq(s.completion_rank, 5, 'completion_rank success=5');
  assertEq(s.violation_rank, 10, '0 violations → rank 10');
  assertEq(s.confidence_rank, 10, 'confidence 1.0 → 10');
  assertEq(s.total_score, 5 * 100 + 10 * 10 + 10, 'total 610');
  assertEq(s.result_id, 'r1', 'result_id passthrough');
  assertEq(s.agent_priority, 10, 'priority');
}

// Defaults for missing fields
{
  const s = _scoreResult({
    id: 'r2',
    agent_id: 'a2',
    agent_name: 'Gemini',
    completion_status: 'blocked',
    // no violation_count, confidence, agent_priority
  });
  assertEq(s.completion_rank, 0, 'blocked=0');
  assertEq(s.violation_rank, 10, 'no violations → 10');
  assertEq(s.confidence_rank, 0, 'no confidence → 0');
  assertEq(s.total_score, 100, '0*100 + 10*10 + 0');
  assertEq(s.agent_priority, 50, 'default priority 50');
}

// Violation clamping (violations > 10 → rank 0, not negative)
{
  const s = _scoreResult({
    id: 'r3', agent_id: 'a3', agent_name: 'X',
    completion_status: 'success',
    violation_count: 15,
    confidence: 0.5,
  });
  assertEq(s.violation_rank, 0, 'violations 15 → clamp 0');
  assertEq(s.confidence_rank, 5, 'confidence 0.5 → 5');
  assertEq(s.total_score, 5 * 100 + 0 + 5, '505');
}

// Partial + mid violations
{
  const s = _scoreResult({
    id: 'r4', agent_id: 'a4', agent_name: 'Y',
    completion_status: 'partial',
    violation_count: 3,
    confidence: 0.7,
  });
  assertEq(s.completion_rank, 3, 'partial=3');
  assertEq(s.violation_rank, 7, '10-3=7');
  assertEq(s.confidence_rank, 7, 'round(0.7*10)=7');
  assertEq(s.total_score, 3 * 100 + 7 * 10 + 7, '377');
}

// Unknown completion status → 0
{
  const s = _scoreResult({
    id: 'r5', agent_id: 'a5', agent_name: 'Z',
    completion_status: 'bogus',
    violation_count: 0,
    confidence: 0,
  });
  assertEq(s.completion_rank, 0, 'unknown status → 0');
  assertEq(s.total_score, 100, '0 + 10*10 + 0');
}

// ============================================================================
// evaluateResult — validation
// ============================================================================
console.log('\n── evaluateResult: validation ────────────────────────────');

// Invalid completion_status
{
  let caught: Error | null = null;
  try {
    await evaluateResult('r1', { completion_status: 'bogus' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid status throws');
  assert(caught !== null && /Invalid completion_status/.test(caught.message), 'error message');
}

// Out-of-range confidence
{
  let caught: Error | null = null;
  try {
    await evaluateResult('r1', { completion_status: 'success', confidence: 1.5 });
  } catch (e: any) { caught = e; }
  assert(caught !== null, '>1 confidence throws');
}

{
  let caught: Error | null = null;
  try {
    await evaluateResult('r1', { completion_status: 'success', confidence: -0.1 });
  } catch (e: any) { caught = e; }
  assert(caught !== null, '<0 confidence throws');
}

// ============================================================================
// evaluateResult — duplicate skip
// ============================================================================
console.log('\n── evaluateResult: duplicate skip ────────────────────────');

// Already evaluated → return skipped without UPDATE
resetState();
poolResponders = [
  {
    match: /SELECT evaluator_status/i,
    respond: () => [[{ evaluator_status: 'evaluated', completion_status: 'success', confidence: 0.9 }]],
  },
];
{
  const r = await evaluateResult('r1', {
    completion_status: 'partial',
    violations: [],
    confidence: 0.5,
  });
  assertEq(r.skipped, true, 'skipped=true');
  assertEq(r.evaluator_status, 'evaluated', 'preserved status');
  assertEq(r.completion_status, 'success', 'existing completion preserved');
  // Only the SELECT should have been issued
  assertEq(poolLog.length, 1, 'only SELECT issued');
}

// Force → bypasses the skip
resetState();
poolResponders = [
  {
    match: /SELECT evaluator_status/i,
    respond: () => [[{ evaluator_status: 'evaluated', completion_status: 'success', confidence: 0.9 }]],
  },
  {
    match: /UPDATE prompt_execution_results/i,
    respond: () => [{ affectedRows: 1 }],
  },
];
{
  const r = await evaluateResult(
    'r1',
    { completion_status: 'partial', violations: [], confidence: 0.5 },
    { force: true }
  );
  assert(!r.skipped, 'force bypasses skip');
  assertEq(r.completion_status, 'partial', 'new status used');
  // No SELECT with force, just UPDATE
  assert(poolLog.some(q => /UPDATE/i.test(q.sql)), 'UPDATE issued');
}

// Not yet evaluated → proceed with UPDATE
resetState();
poolResponders = [
  {
    match: /SELECT evaluator_status/i,
    respond: () => [[{ evaluator_status: 'pending', completion_status: null, confidence: null }]],
  },
  {
    match: /UPDATE prompt_execution_results/i,
    respond: () => [{ affectedRows: 1 }],
  },
];
{
  const r = await evaluateResult('r1', {
    completion_status: 'success',
    violations: [{ type: 'minor', severity: 'low', description: 'x' }],
    confidence: 0.85,
    notes: 'test notes',
  });
  assertEq(r.result_id, 'r1', 'result_id');
  assertEq(r.violation_count, 1, 'violation_count 1');
  assertEq(r.completion_status, 'success', 'completion_status');
  // Verify UPDATE params: completion, violations_json, count, confidence, notes, id
  const updateQ = poolLog.find(q => /UPDATE prompt_execution_results/i.test(q.sql))!;
  assertEq(updateQ.params[0], 'success', 'param[0] status');
  const violationsParsed = JSON.parse(updateQ.params[1]);
  assertEq(violationsParsed.length, 1, 'param[1] violations JSON');
  assertEq(updateQ.params[2], 1, 'param[2] count');
  assertEq(updateQ.params[3], 0.85, 'param[3] confidence');
  assertEq(updateQ.params[4], 'test notes', 'param[4] notes');
  assertEq(updateQ.params[5], 'r1', 'param[5] id');
}

// affectedRows=0 → throws "not found"
resetState();
poolResponders = [
  {
    match: /SELECT evaluator_status/i,
    respond: () => [[]],  // no existing row
  },
  {
    match: /UPDATE prompt_execution_results/i,
    respond: () => [{ affectedRows: 0 }],
  },
];
{
  let caught: Error | null = null;
  try {
    await evaluateResult('missing', { completion_status: 'success' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when not found');
  assert(caught !== null && /not found/.test(caught.message), 'error message');
}

// Missing violations defaults to []
resetState();
poolResponders = [
  { match: /SELECT evaluator_status/i, respond: () => [[]] },
  { match: /UPDATE prompt_execution_results/i, respond: () => [{ affectedRows: 1 }] },
];
{
  const r = await evaluateResult('r1', { completion_status: 'failure' });
  assertEq(r.violation_count, 0, 'default [] → count 0');
  const updateQ = poolLog.find(q => /UPDATE/i.test(q.sql))!;
  assertEq(updateQ.params[1], '[]', 'params[1] is []');
  assertEq(updateQ.params[3], null, 'confidence null when undef');
  assertEq(updateQ.params[4], null, 'notes null when undef');
}

// ============================================================================
// selectBestResult — empty group → throws
// ============================================================================
console.log('\n── selectBestResult: empty ───────────────────────────────');

resetState();
poolResponders = [
  {
    match: /SELECT r\.\*, a\.name as agent_name/i,
    respond: () => [[]],
  },
];
{
  let caught: Error | null = null;
  try { await selectBestResult('group1'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'empty throws');
  assert(caught !== null && /No results found/.test(caught.message), 'error message');
}

// ============================================================================
// selectBestResult — single result → auto-select
// ============================================================================
console.log('\n── selectBestResult: single ──────────────────────────────');

resetState();
poolResponders = [
  {
    match: /SELECT r\.\*, a\.name as agent_name/i,
    respond: () => [[
      {
        id: 'r1', agent_id: 'a1', agent_name: 'Claude',
        agent_priority: 10,
        completion_status: 'success',
        evaluator_status: 'evaluated',
        violation_count: 0,
        confidence: 0.9,
      },
    ]],
  },
  { match: /UPDATE prompt_execution_results SET was_selected = 1/i, respond: () => [{ affectedRows: 1 }] },
];
{
  const r = await selectBestResult('group1');
  assertEq(r.selected_result_id, 'r1', 'single: r1');
  assertEq(r.selected_agent_id, 'a1', 'single: a1');
  assertEq(r.comparison, null, 'single: no comparison');
  assert(/auto-selected/.test(r.selection_reason), 'reason mentions auto-select');
}

// ============================================================================
// selectBestResult — unevaluated throws
// ============================================================================
console.log('\n── selectBestResult: unevaluated ─────────────────────────');

resetState();
poolResponders = [
  {
    match: /SELECT r\.\*, a\.name as agent_name/i,
    respond: () => [[
      { id: 'r1', agent_id: 'a1', agent_name: 'A', agent_priority: 10, evaluator_status: 'evaluated',
        completion_status: 'success', violation_count: 0, confidence: 0.9 },
      { id: 'r2', agent_id: 'a2', agent_name: 'B', agent_priority: 20, evaluator_status: 'pending',
        completion_status: null, violation_count: null, confidence: null },
    ]],
  },
];
{
  let caught: Error | null = null;
  try { await selectBestResult('group1'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'unevaluated throws');
  assert(caught !== null && /not yet evaluated/.test(caught.message), 'error mentions');
}

// ============================================================================
// selectBestResult — winner by completion_status
// ============================================================================
console.log('\n── selectBestResult: by completion ───────────────────────');

resetState();
poolResponders = [
  {
    match: /SELECT r\.\*, a\.name as agent_name/i,
    respond: () => [[
      { id: 'r1', agent_id: 'a1', agent_name: 'ClaudeX', agent_priority: 10,
        evaluator_status: 'evaluated', completion_status: 'success', violation_count: 0,
        confidence: 0.8, execution_duration_ms: 500, prompt_plan_step_id: 'step1' },
      { id: 'r2', agent_id: 'a2', agent_name: 'GeminiY', agent_priority: 10,
        evaluator_status: 'evaluated', completion_status: 'failure', violation_count: 0,
        confidence: 0.9, execution_duration_ms: 200, prompt_plan_step_id: 'step1' },
    ]],
  },
];
{
  const r = await selectBestResult('group1');
  assertEq(r.selected_result_id, 'r1', 'winner r1 (success > failure)');
  assertEq(r.selected_agent_id, 'a1', 'winner a1');
  assert(r.comparison !== null, 'comparison exists');
  assertEq(r.comparison!.tie_breaker_used, false, 'no tie-breaker');
  assert(/completion: success vs failure/.test(r.selection_reason), 'reason mentions completion');
  // Losers marked
  const loserUpdate = poolLog.find(
    q => /UPDATE prompt_execution_results SET was_selected = 0/i.test(q.sql)
  );
  assert(loserUpdate !== undefined, 'loser marked');
  // Comparison INSERT
  const compInsert = poolLog.find(q => /INSERT INTO prompt_agent_comparisons/i.test(q.sql));
  assert(compInsert !== undefined, 'comparison recorded');
  assertEq(compInsert!.params[0], 'uuid-1', 'comparison id uses uuid');
  assertEq(compInsert!.params[10], undefined, 'tie_breaker_method undefined (no tie)');
}

// ============================================================================
// selectBestResult — tie on score, priority tie-breaker
// ============================================================================
console.log('\n── selectBestResult: priority tie-breaker ────────────────');

resetState();
poolResponders = [
  {
    match: /SELECT r\.\*, a\.name as agent_name/i,
    respond: () => [[
      { id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 20,
        evaluator_status: 'evaluated', completion_status: 'success', violation_count: 0,
        confidence: 1.0, execution_duration_ms: 1000, prompt_plan_step_id: 'step1' },
      { id: 'r2', agent_id: 'a2', agent_name: 'Gemini', agent_priority: 5,
        evaluator_status: 'evaluated', completion_status: 'success', violation_count: 0,
        confidence: 1.0, execution_duration_ms: 999, prompt_plan_step_id: 'step1' },
    ]],
  },
];
{
  const r = await selectBestResult('group1');
  assertEq(r.selected_result_id, 'r2', 'lower priority wins (5 < 20)');
  assertEq(r.comparison!.tie_breaker_used, true, 'tie-breaker used');
  assertEq(r.comparison!.tie_breaker_method, 'agent_priority', 'method=agent_priority');
}

// ============================================================================
// selectBestResult — tie on score + priority → execution_speed
// ============================================================================
console.log('\n── selectBestResult: execution_speed tie-breaker ─────────');

resetState();
poolResponders = [
  {
    match: /SELECT r\.\*, a\.name as agent_name/i,
    respond: () => [[
      { id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10,
        evaluator_status: 'evaluated', completion_status: 'success', violation_count: 0,
        confidence: 1.0, execution_duration_ms: 800, prompt_plan_step_id: 'step1' },
      { id: 'r2', agent_id: 'a2', agent_name: 'Gemini', agent_priority: 10,
        evaluator_status: 'evaluated', completion_status: 'success', violation_count: 0,
        confidence: 1.0, execution_duration_ms: 300, prompt_plan_step_id: 'step1' },
    ]],
  },
];
{
  const r = await selectBestResult('group1');
  assertEq(r.selected_result_id, 'r2', 'faster wins (300ms)');
  assertEq(r.comparison!.tie_breaker_method, 'execution_speed', 'method=execution_speed');
}

// ============================================================================
// selectBestResult — 3 agents, stable sort
// ============================================================================
console.log('\n── selectBestResult: 3 agents ────────────────────────────');

resetState();
poolResponders = [
  {
    match: /SELECT r\.\*, a\.name as agent_name/i,
    respond: () => [[
      { id: 'r1', agent_id: 'a1', agent_name: 'A', agent_priority: 10,
        evaluator_status: 'evaluated', completion_status: 'partial', violation_count: 2,
        confidence: 0.7, execution_duration_ms: 500, prompt_plan_step_id: 'step1' },
      { id: 'r2', agent_id: 'a2', agent_name: 'B', agent_priority: 20,
        evaluator_status: 'evaluated', completion_status: 'success', violation_count: 1,
        confidence: 0.9, execution_duration_ms: 400, prompt_plan_step_id: 'step1' },
      { id: 'r3', agent_id: 'a3', agent_name: 'C', agent_priority: 30,
        evaluator_status: 'evaluated', completion_status: 'failure', violation_count: 0,
        confidence: 0.5, execution_duration_ms: 200, prompt_plan_step_id: 'step1' },
    ]],
  },
];
{
  const r = await selectBestResult('group1');
  // Scores: A = 3*100+8*10+7 = 387, B = 5*100+9*10+9 = 599, C = 1*100+10*10+5 = 205
  assertEq(r.selected_result_id, 'r2', 'B has highest score');
  // comparison INSERT has 3 agents
  const compInsert = poolLog.find(q => /INSERT INTO prompt_agent_comparisons/i.test(q.sql))!;
  const agents = JSON.parse(compInsert.params[3]);
  assertEq(agents.length, 3, '3 agents compared');
}

// ============================================================================
// getComparison
// ============================================================================
console.log('\n── getComparison ─────────────────────────────────────────');

resetState();
poolResponders = [
  {
    match: /SELECT c\.\*.*prompt_agent_comparisons/is,
    respond: () => [[{
      id: 'comp1',
      execution_group_id: 'g1',
      agents_compared: '["a1","a2"]',
      comparison_scores: '{"a1":{"total_score":500}}',
      selected_agent_name: 'Claude',
    }]],
  },
];
{
  const r = await getComparison('g1');
  assert(r !== null, 'returns row');
  assertEq(r.agents_compared, ['a1', 'a2'], 'agents_compared parsed');
  assertEq(r.comparison_scores.a1.total_score, 500, 'scores parsed');
  assertEq(r.selected_agent_name, 'Claude', 'agent name');
}

// Empty → null
resetState();
poolResponders = [
  { match: /SELECT c\.\*.*prompt_agent_comparisons/is, respond: () => [[]] },
];
{
  const r = await getComparison('missing');
  assertEq(r, null, 'empty → null');
}

// Bad JSON in agents_compared → fallback
resetState();
poolResponders = [
  {
    match: /SELECT c\.\*.*prompt_agent_comparisons/is,
    respond: () => [[{
      id: 'c', execution_group_id: 'g', agents_compared: 'not-json{',
      comparison_scores: null, selected_agent_name: 'x',
    }]],
  },
];
{
  const r = await getComparison('g');
  assertEq(r.agents_compared, [], 'bad JSON → []');
  assertEq(r.comparison_scores, {}, 'null scores → {}');
}

// ============================================================================
// getResultsForStep
// ============================================================================
console.log('\n── getResultsForStep ─────────────────────────────────────');

resetState();
poolResponders = [
  {
    match: /SELECT r\.\*.*FROM prompt_execution_results/is,
    respond: () => [[
      { id: 'r1', violations_found: '[{"type":"x"}]', agent_name: 'A' },
      { id: 'r2', violations_found: null, agent_name: 'B' },
    ]],
  },
];
{
  const rows = await getResultsForStep('step1');
  assertEq(rows.length, 2, '2 rows');
  assertEq(rows[0].violations_found, [{ type: 'x' }], 'r1 violations parsed');
  assertEq(rows[1].violations_found, [], 'r2 null → []');
  assertEq(poolLog[0].params[0], 'step1', 'stepId param');
}

// ============================================================================
// getAgentResults
// ============================================================================
console.log('\n── getAgentResults ───────────────────────────────────────');

resetState();
poolResponders = [
  {
    match: /WHERE r\.agent_id = \?/is,
    respond: () => [[
      { id: 'r1', violations_found: '[]', agent_name: 'Claude' },
    ]],
  },
];
{
  const rows = await getAgentResults('a1');
  assertEq(rows.length, 1, 'one row');
  assertEq(rows[0].violations_found, [], 'parsed');
  assertEq(poolLog[0].params[0], 'a1', 'agentId param');
  assertEq(poolLog[0].params[1], 20, 'default limit 20');
}

// Custom limit
resetState();
poolResponders = [{ match: /WHERE r\.agent_id = \?/is, respond: () => [[]] }];
{
  await getAgentResults('a1', 5);
  assertEq(poolLog[0].params[1], 5, 'custom limit');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
