#!/usr/bin/env npx tsx
/**
 * Unit tests for services/resultSelectionService.js (OMD-984)
 *
 * Deterministic rule-based winner selection across multi-agent executions.
 * Stubs `../config/db` and `uuid` via require.cache BEFORE requiring the SUT.
 *
 * Coverage:
 *   - Constants: COMPLETION_RANK ordering, VALID_COMPLETION_STATUSES
 *   - _scoreResult (exported): completion_rank, violation_rank (clamped at 0),
 *                              confidence_rank, total_score formula
 *                              defaults when fields missing
 *   - evaluateResult:
 *       · invalid completion_status throws
 *       · invalid confidence range throws
 *       · duplicate evaluation skipped when already 'evaluated' (no UPDATE)
 *       · force option bypasses dedup
 *       · UPDATE params correct; affectedRows=0 throws
 *   - selectBestResult:
 *       · zero results throws
 *       · single result: auto-selected, no comparison record
 *       · unevaluated results throws
 *       · 2 agents with different completion_status → higher ranks wins
 *       · tie on completion+violation+confidence → agent_priority breaks tie
 *       · tie on completion+violation+confidence+priority → speed breaks tie
 *       · 3 agents: stable sort picks winner correctly
 *       · losers marked was_selected=0 with descriptive reason
 *       · comparison record inserted with scores, method, tie-breaker flags
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

// ── Fake mysql pool with SQL routing ─────────────────────────────────────
type Route = { match: RegExp; rows?: any[]; result?: any };
type PoolCall = { sql: string; params: any[] };

function makePool(routes: Route[]) {
  const calls: PoolCall[] = [];
  const pool = {
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      for (const r of routes) {
        if (r.match.test(sql)) {
          if (r.rows !== undefined) return [r.rows, []];
          if (r.result !== undefined) return [r.result, []];
          return [[], []];
        }
      }
      return [[], []];
    },
  };
  return { pool, calls };
}

// ── Stub uuid ────────────────────────────────────────────────────────────
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: { v4: () => 'comp-uuid-1' },
} as any;

// ── Stub ../config/db ────────────────────────────────────────────────────
let currentPool: any = { query: async () => [[], []] };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => currentPool },
} as any;

const svc = require('../resultSelectionService');

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(svc.COMPLETION_RANK.success, 5, 'success=5');
assertEq(svc.COMPLETION_RANK.partial, 3, 'partial=3');
assertEq(svc.COMPLETION_RANK.failure, 1, 'failure=1');
assertEq(svc.COMPLETION_RANK.blocked, 0, 'blocked=0');
assertEq(svc.COMPLETION_RANK.timeout, 0, 'timeout=0');
assert(svc.COMPLETION_RANK.success > svc.COMPLETION_RANK.partial, 'success > partial');
assert(svc.COMPLETION_RANK.partial > svc.COMPLETION_RANK.failure, 'partial > failure');

assertEq(svc.VALID_COMPLETION_STATUSES.sort(),
  ['blocked', 'failure', 'partial', 'success', 'timeout'],
  'VALID_COMPLETION_STATUSES covers all ranks');

// ============================================================================
// _scoreResult
// ============================================================================
console.log('\n── _scoreResult ──────────────────────────────────────────');

{
  const r = {
    id: 'r1', agent_id: 'a1', agent_name: 'A1',
    agent_priority: 10,
    prompt_plan_step_id: 'step1',
    execution_duration_ms: 500,
    completion_status: 'success',
    violation_count: 0,
    confidence: 1.0,
  };
  const s = svc._scoreResult(r);
  assertEq(s.completion_rank, 5, 'success → rank 5');
  assertEq(s.violation_rank, 10, 'no violations → rank 10');
  assertEq(s.confidence_rank, 10, 'confidence 1.0 → rank 10');
  assertEq(s.total_score, 5 * 100 + 10 * 10 + 10, 'total_score formula');
  assertEq(s.total_score, 610, 'total_score=610');
  assertEq(s.result_id, 'r1', 'result_id passthrough');
  assertEq(s.agent_priority, 10, 'agent_priority passthrough');
}

// Partial success with 3 violations + 0.5 confidence
{
  const r = {
    id: 'r2', agent_id: 'a2', agent_name: 'A2',
    agent_priority: 20,
    completion_status: 'partial',
    violation_count: 3,
    confidence: 0.5,
  };
  const s = svc._scoreResult(r);
  assertEq(s.completion_rank, 3, 'partial=3');
  assertEq(s.violation_rank, 7, '10-3=7');
  assertEq(s.confidence_rank, 5, '0.5*10=5');
  assertEq(s.total_score, 3 * 100 + 7 * 10 + 5, 'partial total');
  assertEq(s.total_score, 375, 'total=375');
}

// Violation count > 10 clamps to 0
{
  const r = {
    id: 'r3', agent_id: 'a3',
    completion_status: 'success',
    violation_count: 15,
    confidence: 0.8,
  };
  const s = svc._scoreResult(r);
  assertEq(s.violation_rank, 0, 'violation_rank clamped to 0');
  assertEq(s.total_score, 5 * 100 + 0 + 8, 'clamped total = 508');
}

// Missing fields → defaults
{
  const r = { id: 'r4', agent_id: 'a4', completion_status: 'failure' };
  const s = svc._scoreResult(r);
  assertEq(s.completion_rank, 1, 'failure=1');
  assertEq(s.violation_rank, 10, 'no violation_count → 10');
  assertEq(s.confidence_rank, 0, 'no confidence → 0');
  assertEq(s.agent_priority, 50, 'default priority=50');
  assertEq(s.violation_count, 0, 'default violation_count=0');
  assertEq(s.confidence, 0, 'default confidence=0');
}

// Unknown status → rank 0
{
  const s = svc._scoreResult({ id: 'r5', completion_status: 'weird' });
  assertEq(s.completion_rank, 0, 'unknown status → 0');
}

// Confidence rounding
{
  const s = svc._scoreResult({ id: 'r6', completion_status: 'success', confidence: 0.75 });
  assertEq(s.confidence_rank, 8, '0.75*10 rounded = 8');
}

// ============================================================================
// evaluateResult: validation
// ============================================================================
console.log('\n── evaluateResult: validation ────────────────────────────');

currentPool = makePool([]).pool;

let err: any = null;
try {
  await svc.evaluateResult('r1', { completion_status: 'bogus', violations: [], confidence: 0.5 });
} catch (e) { err = e; }
assert(err !== null, 'invalid completion_status throws');
assert(err.message.includes('bogus'), 'error names bad status');

err = null;
try {
  await svc.evaluateResult('r1', { completion_status: 'success', confidence: 1.5 });
} catch (e) { err = e; }
assert(err !== null, 'confidence > 1 throws');

err = null;
try {
  await svc.evaluateResult('r1', { completion_status: 'success', confidence: -0.1 });
} catch (e) { err = e; }
assert(err !== null, 'confidence < 0 throws');

// ============================================================================
// evaluateResult: duplicate prevention
// ============================================================================
console.log('\n── evaluateResult: duplicate prevention ──────────────────');

// Already evaluated → skip (no UPDATE)
{
  const { pool, calls } = makePool([
    { match: /^SELECT evaluator_status/, rows: [{ evaluator_status: 'evaluated', completion_status: 'success', confidence: 0.9 }] },
    { match: /^UPDATE/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.evaluateResult('r1', {
    completion_status: 'partial',
    violations: [],
    confidence: 0.5,
  });
  assertEq(result.skipped, true, 'skipped=true');
  assertEq(result.evaluator_status, 'evaluated', 'returns existing status');
  assertEq(result.completion_status, 'success', 'returns existing completion');
  assertEq(result.confidence, 0.9, 'returns existing confidence');
  assertEq(calls.length, 1, 'only SELECT, no UPDATE');
  assert(/^SELECT/.test(calls[0].sql), 'first query is SELECT');
}

// Not yet evaluated → proceeds to UPDATE
{
  const { pool, calls } = makePool([
    { match: /^SELECT evaluator_status/, rows: [{ evaluator_status: 'pending', completion_status: null, confidence: null }] },
    { match: /^UPDATE/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.evaluateResult('r1', {
    completion_status: 'success',
    violations: [{ type: 'x', description: 'y' }],
    confidence: 0.8,
    notes: 'looks good',
  });
  assertEq(result.skipped, undefined, 'skipped not set');
  assertEq(result.violation_count, 1, 'violation_count=1');
  assertEq(result.completion_status, 'success', 'returned status');
  assertEq(calls.length, 2, 'SELECT + UPDATE');

  const p = calls[1].params;
  assertEq(p[0], 'success', 'UPDATE completion_status');
  assertEq(JSON.parse(p[1]).length, 1, 'violations JSON');
  assertEq(p[2], 1, 'violation_count');
  assertEq(p[3], 0.8, 'confidence');
  assertEq(p[4], 'looks good', 'notes');
  assertEq(p[5], 'r1', 'id');
}

// force=true bypasses dedup check
{
  const { pool, calls } = makePool([
    { match: /^UPDATE/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  await svc.evaluateResult('r1', { completion_status: 'success', violations: [] }, { force: true });
  assertEq(calls.length, 1, 'force → only UPDATE (no SELECT)');
  assert(/^UPDATE/.test(calls[0].sql), 'directly UPDATE');
}

// affectedRows=0 → throws
{
  const { pool } = makePool([
    { match: /^SELECT evaluator_status/, rows: [] },
    { match: /^UPDATE/, result: { affectedRows: 0 } },
  ]);
  currentPool = pool;

  let e: any = null;
  try {
    await svc.evaluateResult('missing', { completion_status: 'success', violations: [] });
  } catch (ex) { e = ex; }
  assert(e !== null, 'missing result throws');
  assert(e.message.includes('not found'), 'error: not found');
}

// Default violations to empty array when undefined
{
  const { pool, calls } = makePool([
    { match: /^SELECT evaluator_status/, rows: [{ evaluator_status: 'pending' }] },
    { match: /^UPDATE/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;
  const result = await svc.evaluateResult('r1', { completion_status: 'success' });
  assertEq(result.violation_count, 0, 'undefined violations → count 0');
  assertEq(calls[1].params[1], '[]', 'undefined violations → empty JSON array');
}

// ============================================================================
// selectBestResult: zero results
// ============================================================================
console.log('\n── selectBestResult: edge cases ──────────────────────────');

{
  const { pool } = makePool([
    { match: /^SELECT r\.\*/, rows: [] },
  ]);
  currentPool = pool;
  let e: any = null;
  try { await svc.selectBestResult('empty-group'); } catch (ex) { e = ex; }
  assert(e !== null, 'zero results throws');
  assert(e.message.includes('empty-group'), 'error names group');
}

// Single result: auto-select, no comparison insert
{
  const singleRow = {
    id: 'r1', agent_id: 'a1', agent_name: 'A1', agent_priority: 10,
    completion_status: 'success', violation_count: 0, confidence: 1,
    evaluator_status: 'evaluated', prompt_plan_step_id: 'step1',
    execution_duration_ms: 100,
  };
  const { pool, calls } = makePool([
    { match: /^SELECT r\.\*/, rows: [singleRow] },
    { match: /^UPDATE prompt_execution_results SET was_selected = 1/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.selectBestResult('solo-group');
  assertEq(result.selected_result_id, 'r1', 'auto-selected id');
  assertEq(result.selected_agent_id, 'a1', 'auto-selected agent');
  assertEq(result.comparison, null, 'no comparison record');
  assert(result.selection_reason.includes('Single agent'), 'reason mentions single agent');
  assertEq(calls.length, 2, 'SELECT + 1 UPDATE only (no INSERT comparison)');
}

// Unevaluated results throws
{
  const rows = [
    { id: 'r1', agent_id: 'a1', evaluator_status: 'pending', agent_priority: 10 },
    { id: 'r2', agent_id: 'a2', evaluator_status: 'evaluated', agent_priority: 20 },
  ];
  const { pool } = makePool([{ match: /^SELECT r\.\*/, rows }]);
  currentPool = pool;
  let e: any = null;
  try { await svc.selectBestResult('g1'); } catch (ex) { e = ex; }
  assert(e !== null, 'unevaluated throws');
  assert(e.message.includes('1 result'), 'error counts unevaluated');
  assert(e.message.includes('r1'), 'error lists IDs');
}

// ============================================================================
// selectBestResult: 2 agents, clear winner on completion_status
// ============================================================================
console.log('\n── selectBestResult: winner by completion ────────────────');

{
  const rows = [
    // A1: partial (rank 3), A2: success (rank 5) → A2 wins
    { id: 'r1', agent_id: 'a1', agent_name: 'A1', agent_priority: 10,
      completion_status: 'partial', violation_count: 0, confidence: 1.0,
      evaluator_status: 'evaluated', prompt_plan_step_id: 'step1',
      execution_duration_ms: 100 },
    { id: 'r2', agent_id: 'a2', agent_name: 'A2', agent_priority: 20,
      completion_status: 'success', violation_count: 0, confidence: 1.0,
      evaluator_status: 'evaluated', prompt_plan_step_id: 'step1',
      execution_duration_ms: 500 },
  ];
  const { pool, calls } = makePool([
    { match: /^SELECT r\.\*/, rows },
    { match: /^UPDATE.*was_selected = 1/, result: { affectedRows: 1 } },
    { match: /^UPDATE.*was_selected = 0/, result: { affectedRows: 1 } },
    { match: /^INSERT INTO prompt_agent_comparisons/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.selectBestResult('g1');
  assertEq(result.selected_result_id, 'r2', 'A2 wins on completion');
  assertEq(result.selected_agent_id, 'a2', 'a2 selected');
  assertEq(result.comparison.tie_breaker_used, false, 'no tie-breaker');
  assert(result.selection_reason.includes('A2 selected'), 'reason mentions winner');
  assert(result.selection_reason.includes('completion: success vs partial'), 'reason explains');
  assert(result.selection_reason.includes('over A1'), 'reason names loser');

  // Verify INSERT params
  const insertCall = calls.find(c => /INSERT/.test(c.sql))!;
  assert(insertCall !== undefined, 'comparison inserted');
  const ip = insertCall.params;
  assertEq(ip[0], 'comp-uuid-1', 'comp id from uuid');
  assertEq(ip[1], 'g1', 'execution_group_id');
  assertEq(ip[2], 'step1', 'prompt_plan_step_id');
  // agents_compared JSON — both agents
  assertEq(JSON.parse(ip[3]).sort(), ['a1', 'a2'], 'agents_compared');
  assertEq(ip[4], 'a2', 'selected_agent_id');
  assertEq(ip[5], 'r2', 'selected_result_id');
  // comparison_scores JSON has both agents
  const scores = JSON.parse(ip[6]);
  assert('a1' in scores, 'a1 in scores');
  assert('a2' in scores, 'a2 in scores');
  assertEq(scores.a2.total_score, 610, 'a2 score 610');
  assertEq(scores.a1.total_score, 410, 'a1 score 3*100+100+10=410');
  // comparison_method is a literal 'rule_based' in SQL, not a param.
  // Params after selection_reason: tie_breaker_used, tie_breaker_method
  assertEq(ip[8], 0, 'tie_breaker_used=0');
  assertEq(ip[9], null, 'tie_breaker_method=null');
}

// ============================================================================
// selectBestResult: winner by violation count
// ============================================================================
console.log('\n── selectBestResult: winner by violations ────────────────');

{
  const rows = [
    { id: 'r1', agent_id: 'a1', agent_name: 'A1', agent_priority: 10,
      completion_status: 'success', violation_count: 5, confidence: 1.0,
      evaluator_status: 'evaluated', prompt_plan_step_id: 'step1',
      execution_duration_ms: 100 },
    { id: 'r2', agent_id: 'a2', agent_name: 'A2', agent_priority: 20,
      completion_status: 'success', violation_count: 1, confidence: 1.0,
      evaluator_status: 'evaluated', prompt_plan_step_id: 'step1',
      execution_duration_ms: 500 },
  ];
  const { pool } = makePool([
    { match: /^SELECT r\.\*/, rows },
    { match: /^UPDATE/, result: { affectedRows: 1 } },
    { match: /^INSERT/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.selectBestResult('g2');
  assertEq(result.selected_result_id, 'r2', 'fewer violations wins');
  assert(result.selection_reason.includes('violations: 1 vs 5'), 'reason lists violations');
}

// ============================================================================
// selectBestResult: tie-breaker by agent_priority
// ============================================================================
console.log('\n── selectBestResult: agent_priority tie-break ────────────');

{
  // Identical scores, different priorities → lower priority wins
  const rows = [
    { id: 'r1', agent_id: 'a1', agent_name: 'A1', agent_priority: 30,
      completion_status: 'success', violation_count: 0, confidence: 1.0,
      evaluator_status: 'evaluated', prompt_plan_step_id: 'step1',
      execution_duration_ms: 100 },
    { id: 'r2', agent_id: 'a2', agent_name: 'A2', agent_priority: 10,
      completion_status: 'success', violation_count: 0, confidence: 1.0,
      evaluator_status: 'evaluated', prompt_plan_step_id: 'step1',
      execution_duration_ms: 500 },
  ];
  const { pool } = makePool([
    { match: /^SELECT r\.\*/, rows },
    { match: /^UPDATE/, result: { affectedRows: 1 } },
    { match: /^INSERT/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.selectBestResult('g3');
  assertEq(result.selected_agent_id, 'a2', 'lower priority (a2=10) wins tie');
  assertEq(result.comparison.tie_breaker_used, true, 'tie-breaker used');
  assertEq(result.comparison.tie_breaker_method, 'agent_priority', 'method=agent_priority');
}

// ============================================================================
// selectBestResult: tie-breaker by execution speed
// ============================================================================
console.log('\n── selectBestResult: speed tie-break ─────────────────────');

{
  // Identical scores AND priorities → faster wins
  const rows = [
    { id: 'r1', agent_id: 'a1', agent_name: 'A1', agent_priority: 10,
      completion_status: 'success', violation_count: 0, confidence: 1.0,
      evaluator_status: 'evaluated', prompt_plan_step_id: 'step1',
      execution_duration_ms: 800 },
    { id: 'r2', agent_id: 'a2', agent_name: 'A2', agent_priority: 10,
      completion_status: 'success', violation_count: 0, confidence: 1.0,
      evaluator_status: 'evaluated', prompt_plan_step_id: 'step1',
      execution_duration_ms: 200 },
  ];
  const { pool } = makePool([
    { match: /^SELECT r\.\*/, rows },
    { match: /^UPDATE/, result: { affectedRows: 1 } },
    { match: /^INSERT/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.selectBestResult('g4');
  assertEq(result.selected_agent_id, 'a2', 'faster agent wins');
  assertEq(result.comparison.tie_breaker_method, 'execution_speed', 'method=execution_speed');
}

// ============================================================================
// selectBestResult: 3 agents, stable sort
// ============================================================================
console.log('\n── selectBestResult: 3 agents ────────────────────────────');

{
  const rows = [
    // A1: partial, A2: success+2v, A3: success+0v → A3 wins
    { id: 'r1', agent_id: 'a1', agent_name: 'A1', agent_priority: 10,
      completion_status: 'partial', violation_count: 0, confidence: 1.0,
      evaluator_status: 'evaluated', prompt_plan_step_id: 'step1',
      execution_duration_ms: 100 },
    { id: 'r2', agent_id: 'a2', agent_name: 'A2', agent_priority: 20,
      completion_status: 'success', violation_count: 2, confidence: 0.8,
      evaluator_status: 'evaluated', prompt_plan_step_id: 'step1',
      execution_duration_ms: 200 },
    { id: 'r3', agent_id: 'a3', agent_name: 'A3', agent_priority: 30,
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      evaluator_status: 'evaluated', prompt_plan_step_id: 'step1',
      execution_duration_ms: 300 },
  ];
  const { pool, calls } = makePool([
    { match: /^SELECT r\.\*/, rows },
    { match: /^UPDATE.*was_selected = 1/, result: { affectedRows: 1 } },
    { match: /^UPDATE.*was_selected = 0/, result: { affectedRows: 1 } },
    { match: /^INSERT/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.selectBestResult('g5');
  assertEq(result.selected_agent_id, 'a3', 'A3 wins (success+0v)');
  // Verify losers marked: 2 separate UPDATEs with was_selected=0
  const loserUpdates = calls.filter(c => /was_selected = 0/.test(c.sql));
  assertEq(loserUpdates.length, 2, 'both losers marked');
  // Each loser gets descriptive reason
  assert(loserUpdates.every(c => c.params[0].includes('outscored by A3')), 'losers reason mentions A3');
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
