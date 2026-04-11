#!/usr/bin/env npx tsx
/**
 * Unit tests for services/resultSelectionService.js (OMD-1082)
 *
 * Covers:
 *   - Constants: COMPLETION_RANK, VALID_COMPLETION_STATUSES
 *   - _scoreResult: pure scoring function (completion × 100 + violation × 10 + confidence)
 *   - evaluateResult:
 *       · invalid completion_status → throws
 *       · confidence out of range → throws
 *       · already evaluated → skip (returns skipped:true)
 *       · force flag → re-evaluate even if already evaluated
 *       · happy path: UPDATE executed, returns evaluation
 *       · no rows affected → throws "Execution result not found"
 *       · violations optional; notes optional; confidence optional
 *   - selectBestResult:
 *       · no results → throws
 *       · single result → auto-select with reason
 *       · multi results, one unevaluated → throws
 *       · multi results, different completion_status → winner by completion
 *       · tie on completion, different violations → winner by violations
 *       · tie on violations, different confidence → winner by confidence
 *       · full tie → agent_priority tie-breaker
 *       · tie on priority → execution_duration tie-breaker
 *       · losers marked with UPDATE
 *       · comparison row inserted with uuid
 *   - getComparison: null when missing, parses JSON fields
 *   - getResultsForStep: parses violations_found per row
 *   - getAgentResults: default limit, parses violations_found
 *
 * Stubs config/db and uuid.
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

// ── stubModule helper ───────────────────────────────────────────────
const pathMod = require('path');
function stubModule(relFromSrc: string, exports: any) {
  // require.resolve returns the canonical path including .js extension,
  // which is what require.cache is keyed by.
  const absWithoutExt = pathMod.resolve(__dirname, '..', '..', relFromSrc);
  const resolved = require.resolve(absWithoutExt);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  } as any;
}

// ── Fake DB pool with SQL routing ───────────────────────────────────
type Route = { match: RegExp; respond: (params: any[], sql: string) => any };

const queryLog: { sql: string; params: any[] }[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        return r.respond(params, sql);
      }
    }
    // Default: return empty result sets
    // Detect SELECT vs UPDATE/INSERT by the SQL shape
    if (/^\s*SELECT/i.test(sql)) return [[], []];
    if (/^\s*UPDATE/i.test(sql)) return [{ affectedRows: 1 }, []];
    if (/^\s*INSERT/i.test(sql)) return [{ insertId: 1, affectedRows: 1 }, []];
    return [[], []];
  },
};

stubModule('config/db', { getAppPool: () => fakePool });

// ── Stub uuid ───────────────────────────────────────────────────────
let nextUuid = 'fixed-uuid-1';
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: { v4: () => nextUuid },
} as any;

function resetDb() {
  queryLog.length = 0;
  routes = [];
  nextUuid = 'fixed-uuid-1';
}

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

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
console.log('\n── constants ─────────────────────────────────────────────');

assertEq(COMPLETION_RANK.success, 5, 'success = 5');
assertEq(COMPLETION_RANK.partial, 3, 'partial = 3');
assertEq(COMPLETION_RANK.failure, 1, 'failure = 1');
assertEq(COMPLETION_RANK.blocked, 0, 'blocked = 0');
assertEq(COMPLETION_RANK.timeout, 0, 'timeout = 0');
assertEq(
  VALID_COMPLETION_STATUSES.sort(),
  ['blocked', 'failure', 'partial', 'success', 'timeout'],
  'VALID_COMPLETION_STATUSES'
);

// ============================================================================
// _scoreResult — pure scoring
// ============================================================================
console.log('\n── _scoreResult ──────────────────────────────────────────');

{
  const score = _scoreResult({
    id: 'r1',
    agent_id: 'a1',
    agent_name: 'Claude',
    agent_priority: 10,
    prompt_plan_step_id: 'step1',
    execution_duration_ms: 1000,
    completion_status: 'success',
    violation_count: 0,
    confidence: 1.0,
  });
  assertEq(score.completion_rank, 5, 'success → 5');
  assertEq(score.violation_rank, 10, '0 violations → 10');
  assertEq(score.confidence_rank, 10, '1.0 confidence → 10');
  assertEq(score.total_score, 5 * 100 + 10 * 10 + 10, 'total = 610');
}

{
  const score = _scoreResult({
    id: 'r2',
    agent_id: 'a2',
    agent_name: 'Cursor',
    agent_priority: 20,
    completion_status: 'partial',
    violation_count: 3,
    confidence: 0.5,
  });
  assertEq(score.completion_rank, 3, 'partial → 3');
  assertEq(score.violation_rank, 7, '3 violations → 10-3=7');
  assertEq(score.confidence_rank, 5, '0.5 confidence → 5');
  assertEq(score.total_score, 375, 'total = 300+70+5');
}

// Violation count above 10 clamps to 0
{
  const score = _scoreResult({
    completion_status: 'failure',
    violation_count: 15,
    confidence: 0.3,
  });
  assertEq(score.violation_rank, 0, 'violation_rank clamped to 0');
  assertEq(score.total_score, 100 + 0 + 3, 'total reflects clamp');
}

// Missing/null violation_count and confidence treated as 0
{
  const score = _scoreResult({
    completion_status: 'blocked',
    // no violation_count, no confidence
  });
  assertEq(score.completion_rank, 0, 'blocked = 0');
  assertEq(score.violation_rank, 10, 'missing violation_count → 10');
  assertEq(score.confidence_rank, 0, 'missing confidence → 0');
  assertEq(score.total_score, 100, 'total = 0*100 + 10*10 + 0');
  assertEq(score.agent_priority, 50, 'missing priority defaults to 50');
}

// Unknown completion_status → completion_rank 0
{
  const score = _scoreResult({
    completion_status: 'bogus',
    violation_count: 0,
    confidence: 0.5,
  });
  assertEq(score.completion_rank, 0, 'unknown status → 0');
}

// ============================================================================
// evaluateResult — validation
// ============================================================================
console.log('\n── evaluateResult: validation ────────────────────────────');

{
  let caught: any = null;
  try {
    await evaluateResult('r1', { completion_status: 'bogus', violations: [], confidence: 0.5 });
  } catch (e) { caught = e; }
  assert(caught !== null, 'invalid status throws');
  assert(caught.message.includes('Invalid completion_status'), 'error mentions validation');
}

{
  let caught: any = null;
  try {
    await evaluateResult('r1', { completion_status: 'success', violations: [], confidence: 2.0 });
  } catch (e) { caught = e; }
  assert(caught !== null, 'confidence > 1 throws');
  assert(caught.message.includes('confidence must be between'), 'error mentions confidence');
}

{
  let caught: any = null;
  try {
    await evaluateResult('r1', { completion_status: 'success', violations: [], confidence: -0.1 });
  } catch (e) { caught = e; }
  assert(caught !== null, 'confidence < 0 throws');
}

// ============================================================================
// evaluateResult — happy path
// ============================================================================
console.log('\n── evaluateResult: happy path ────────────────────────────');

resetDb();
// SELECT evaluator_status: not evaluated
routes.push({
  match: /SELECT evaluator_status/,
  respond: () => [[{ evaluator_status: 'pending', completion_status: null, confidence: null }], []],
});
// UPDATE returns affectedRows 1 (default)
{
  const r = await evaluateResult('r1', {
    completion_status: 'success',
    violations: [{ type: 'minor', description: 'x', severity: 'low' }],
    confidence: 0.9,
    notes: 'Looks good',
  });
  assertEq(r.result_id, 'r1', 'result_id');
  assertEq(r.evaluator_status, 'evaluated', 'status');
  assertEq(r.completion_status, 'success', 'completion');
  assertEq(r.violation_count, 1, 'violation_count');
  assertEq(r.confidence, 0.9, 'confidence');
  // Verify UPDATE was called with serialized violations
  const updateCall = queryLog.find(q => /UPDATE prompt_execution_results/.test(q.sql));
  assert(updateCall !== undefined, 'UPDATE issued');
  assertEq(updateCall!.params[0], 'success', 'param: completion');
  assertEq(
    updateCall!.params[1],
    JSON.stringify([{ type: 'minor', description: 'x', severity: 'low' }]),
    'param: violations serialized'
  );
  assertEq(updateCall!.params[2], 1, 'param: violation_count');
  assertEq(updateCall!.params[3], 0.9, 'param: confidence');
  assertEq(updateCall!.params[4], 'Looks good', 'param: notes');
  assertEq(updateCall!.params[5], 'r1', 'param: resultId');
}

// Violations optional (undefined → empty array)
resetDb();
routes.push({
  match: /SELECT evaluator_status/,
  respond: () => [[{ evaluator_status: 'pending' }], []],
});
{
  const r = await evaluateResult('r2', { completion_status: 'failure' });
  assertEq(r.violation_count, 0, 'no violations → 0');
  const updateCall = queryLog.find(q => /UPDATE prompt_execution_results/.test(q.sql));
  assertEq(updateCall!.params[1], '[]', 'empty array serialized');
  assertEq(updateCall!.params[3], null, 'confidence null when missing');
  assertEq(updateCall!.params[4], null, 'notes null when missing');
}

// ============================================================================
// evaluateResult — skip if already evaluated
// ============================================================================
console.log('\n── evaluateResult: skip on already-evaluated ─────────────');

resetDb();
routes.push({
  match: /SELECT evaluator_status/,
  respond: () => [[{
    evaluator_status: 'evaluated',
    completion_status: 'success',
    confidence: 0.8,
  }], []],
});
{
  const r = await evaluateResult('r3', {
    completion_status: 'partial',
    violations: [],
    confidence: 0.5,
  });
  assertEq(r.skipped, true, 'skipped=true');
  assertEq(r.reason, 'Already evaluated', 'reason');
  assertEq(r.completion_status, 'success', 'existing status preserved');
  assertEq(r.confidence, 0.8, 'existing confidence preserved');
  const updateCall = queryLog.find(q => /UPDATE prompt_execution_results/.test(q.sql));
  assert(updateCall === undefined, 'no UPDATE issued when skipped');
}

// force=true re-evaluates even when already evaluated
resetDb();
routes.push({
  match: /SELECT evaluator_status/,
  respond: () => [[{ evaluator_status: 'evaluated', completion_status: 'success', confidence: 0.8 }], []],
});
{
  const r = await evaluateResult('r4', {
    completion_status: 'partial',
    violations: [],
    confidence: 0.5,
  }, { force: true });
  assertEq(r.skipped, undefined, 'no skipped flag');
  // force bypasses the SELECT entirely
  const selectCall = queryLog.find(q => /SELECT evaluator_status/.test(q.sql));
  assert(selectCall === undefined, 'force bypasses SELECT');
  const updateCall = queryLog.find(q => /UPDATE prompt_execution_results/.test(q.sql));
  assert(updateCall !== undefined, 'UPDATE issued with force');
}

// ============================================================================
// evaluateResult — not found → throws
// ============================================================================
console.log('\n── evaluateResult: not found ─────────────────────────────');

resetDb();
routes.push({
  match: /SELECT evaluator_status/,
  respond: () => [[{ evaluator_status: 'pending' }], []],
});
routes.push({
  match: /UPDATE prompt_execution_results/,
  respond: () => [{ affectedRows: 0 }, []],
});
{
  let caught: any = null;
  try {
    await evaluateResult('missing', { completion_status: 'success', confidence: 0.5 });
  } catch (e) { caught = e; }
  assert(caught !== null, 'throws when not found');
  assert(caught.message.includes('not found'), 'error mentions not found');
}

// ============================================================================
// selectBestResult — no results
// ============================================================================
console.log('\n── selectBestResult: no results ──────────────────────────');

resetDb();
// Default SELECT returns [] for execution group query
{
  let caught: any = null;
  try {
    await selectBestResult('group-empty');
  } catch (e) { caught = e; }
  assert(caught !== null, 'throws when no results');
  assert(caught.message.includes('No results found'), 'error message');
}

// ============================================================================
// selectBestResult — single result → auto-select
// ============================================================================
console.log('\n── selectBestResult: single result ───────────────────────');

resetDb();
routes.push({
  match: /SELECT r\.\*, a\.name as agent_name/,
  respond: () => [[{
    id: 'res-only',
    agent_id: 'agent-a',
    agent_name: 'Claude',
    agent_priority: 10,
    prompt_plan_step_id: 'step1',
    evaluator_status: 'evaluated',
    completion_status: 'success',
    violation_count: 0,
    confidence: 1.0,
    execution_duration_ms: 500,
    execution_group_id: 'group-1',
  }], []],
});
{
  const r = await selectBestResult('group-1');
  assertEq(r.selected_result_id, 'res-only', 'selected id');
  assertEq(r.selected_agent_id, 'agent-a', 'agent id');
  assertEq(r.comparison, null, 'no comparison for single');
  assert(r.selection_reason.includes('Single'), 'single reason');
  // Marks selected
  const updateCall = queryLog.find(q => /UPDATE prompt_execution_results SET was_selected = 1/.test(q.sql));
  assert(updateCall !== undefined, 'marked selected');
}

// ============================================================================
// selectBestResult — unevaluated → throws
// ============================================================================
console.log('\n── selectBestResult: unevaluated ─────────────────────────');

resetDb();
routes.push({
  match: /SELECT r\.\*, a\.name as agent_name/,
  respond: () => [[
    { id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10, evaluator_status: 'evaluated' },
    { id: 'r2', agent_id: 'a2', agent_name: 'Cursor', agent_priority: 20, evaluator_status: 'pending' },
  ], []],
});
{
  let caught: any = null;
  try {
    await selectBestResult('group-2');
  } catch (e) { caught = e; }
  assert(caught !== null, 'throws on unevaluated');
  assert(caught.message.includes('not yet evaluated'), 'error mentions unevaluated');
  assert(caught.message.includes('r2'), 'lists id');
}

// ============================================================================
// selectBestResult — winner by completion rank
// ============================================================================
console.log('\n── selectBestResult: winner by completion ────────────────');

resetDb();
nextUuid = 'uuid-completion';
routes.push({
  match: /SELECT r\.\*, a\.name as agent_name/,
  respond: () => [[
    {
      id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10,
      prompt_plan_step_id: 'step1', evaluator_status: 'evaluated',
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      execution_duration_ms: 1000,
    },
    {
      id: 'r2', agent_id: 'a2', agent_name: 'Cursor', agent_priority: 20,
      prompt_plan_step_id: 'step1', evaluator_status: 'evaluated',
      completion_status: 'partial', violation_count: 0, confidence: 0.9,
      execution_duration_ms: 1000,
    },
  ], []],
});
{
  const r = await selectBestResult('group-3');
  assertEq(r.selected_result_id, 'r1', 'success beats partial');
  assertEq(r.selected_agent_id, 'a1', 'agent a1 selected');
  assertEq(r.comparison.id, 'uuid-completion', 'uuid used');
  assertEq(r.comparison.tie_breaker_used, false, 'no tie-breaker');
  assertEq(r.comparison.tie_breaker_method, null, 'no method');
  assert(r.selection_reason.includes('Claude'), 'reason has winner name');
  assert(r.selection_reason.includes('completion'), 'reason mentions completion');
  // Loser UPDATE issued
  const loserUpdate = queryLog.find(q => /was_selected = 0/.test(q.sql));
  assert(loserUpdate !== undefined, 'loser marked');
  assertEq(loserUpdate!.params[1], 'r2', 'loser id r2');
  // Comparison row INSERTed
  const insertCall = queryLog.find(q => /INSERT INTO prompt_agent_comparisons/.test(q.sql));
  assert(insertCall !== undefined, 'comparison row inserted');
  assertEq(insertCall!.params[0], 'uuid-completion', 'comparisonId param');
  assertEq(insertCall!.params[5], 'r1', 'selected_result_id param');
  assertEq(insertCall!.params[8], false ? 1 : 0, 'tie_breaker_used param 0');
}

// ============================================================================
// selectBestResult — tie on completion, different violations
// ============================================================================
console.log('\n── selectBestResult: winner by violations ────────────────');

resetDb();
routes.push({
  match: /SELECT r\.\*, a\.name as agent_name/,
  respond: () => [[
    {
      id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10,
      evaluator_status: 'evaluated',
      completion_status: 'success', violation_count: 2, confidence: 0.9,
      execution_duration_ms: 1000,
    },
    {
      id: 'r2', agent_id: 'a2', agent_name: 'Cursor', agent_priority: 20,
      evaluator_status: 'evaluated',
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      execution_duration_ms: 1000,
    },
  ], []],
});
{
  const r = await selectBestResult('group-4');
  assertEq(r.selected_result_id, 'r2', 'fewer violations wins');
  assert(r.selection_reason.includes('violations'), 'reason mentions violations');
}

// ============================================================================
// selectBestResult — tie on violations, different confidence
// ============================================================================
console.log('\n── selectBestResult: winner by confidence ────────────────');

resetDb();
routes.push({
  match: /SELECT r\.\*, a\.name as agent_name/,
  respond: () => [[
    {
      id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10,
      evaluator_status: 'evaluated',
      completion_status: 'success', violation_count: 0, confidence: 0.7,
      execution_duration_ms: 1000,
    },
    {
      id: 'r2', agent_id: 'a2', agent_name: 'Cursor', agent_priority: 20,
      evaluator_status: 'evaluated',
      completion_status: 'success', violation_count: 0, confidence: 0.95,
      execution_duration_ms: 1000,
    },
  ], []],
});
{
  const r = await selectBestResult('group-5');
  assertEq(r.selected_result_id, 'r2', 'higher confidence wins');
  assert(r.selection_reason.includes('confidence'), 'reason mentions confidence');
}

// ============================================================================
// selectBestResult — full tie → agent_priority tie-breaker
// ============================================================================
console.log('\n── selectBestResult: tie → priority ──────────────────────');

resetDb();
routes.push({
  match: /SELECT r\.\*, a\.name as agent_name/,
  respond: () => [[
    {
      id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10,
      evaluator_status: 'evaluated',
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      execution_duration_ms: 2000,
    },
    {
      id: 'r2', agent_id: 'a2', agent_name: 'Cursor', agent_priority: 30,
      evaluator_status: 'evaluated',
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      execution_duration_ms: 1000,
    },
  ], []],
});
{
  const r = await selectBestResult('group-6');
  assertEq(r.selected_result_id, 'r1', 'lower priority wins');
  assertEq(r.comparison.tie_breaker_used, true, 'tie_breaker_used');
  assertEq(r.comparison.tie_breaker_method, 'agent_priority', 'method agent_priority');
}

// ============================================================================
// selectBestResult — tie on priority → execution_duration
// ============================================================================
console.log('\n── selectBestResult: tie → duration ──────────────────────');

resetDb();
routes.push({
  match: /SELECT r\.\*, a\.name as agent_name/,
  respond: () => [[
    {
      id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10,
      evaluator_status: 'evaluated',
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      execution_duration_ms: 3000,
    },
    {
      id: 'r2', agent_id: 'a2', agent_name: 'Cursor', agent_priority: 10,
      evaluator_status: 'evaluated',
      completion_status: 'success', violation_count: 0, confidence: 0.9,
      execution_duration_ms: 1500,
    },
  ], []],
});
{
  const r = await selectBestResult('group-7');
  assertEq(r.selected_result_id, 'r2', 'faster execution wins');
  assertEq(r.comparison.tie_breaker_used, true, 'tie_breaker_used');
  assertEq(r.comparison.tie_breaker_method, 'execution_speed', 'method execution_speed');
}

// ============================================================================
// selectBestResult — 3 agents, full ordering
// ============================================================================
console.log('\n── selectBestResult: 3 agents ────────────────────────────');

resetDb();
routes.push({
  match: /SELECT r\.\*, a\.name as agent_name/,
  respond: () => [[
    {
      id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10,
      evaluator_status: 'evaluated',
      completion_status: 'partial', violation_count: 1, confidence: 0.7,
      execution_duration_ms: 1000,
    },
    {
      id: 'r2', agent_id: 'a2', agent_name: 'Cursor', agent_priority: 20,
      evaluator_status: 'evaluated',
      completion_status: 'success', violation_count: 2, confidence: 0.8,
      execution_duration_ms: 2000,
    },
    {
      id: 'r3', agent_id: 'a3', agent_name: 'Windsurf', agent_priority: 30,
      evaluator_status: 'evaluated',
      completion_status: 'failure', violation_count: 0, confidence: 0.5,
      execution_duration_ms: 500,
    },
  ], []],
});
{
  const r = await selectBestResult('group-8');
  // r2 has success (500), r1 partial (380), r3 failure (155) → r2 wins
  assertEq(r.selected_result_id, 'r2', 'success beats all');
  assertEq(Object.keys(r.comparison.scores).length, 3, 'all 3 scored');
}

// ============================================================================
// getComparison
// ============================================================================
console.log('\n── getComparison ─────────────────────────────────────────');

// No row → null
resetDb();
{
  const r = await getComparison('none');
  assertEq(r, null, 'null when missing');
}

// Row with JSON fields
resetDb();
routes.push({
  match: /SELECT c\.\*, a\.name as selected_agent_name/,
  respond: () => [[{
    id: 'cmp1',
    execution_group_id: 'g1',
    agents_compared: '["a1","a2"]',
    comparison_scores: '{"a1":{"total_score":600}}',
    selected_agent_name: 'Claude',
  }], []],
});
{
  const r = await getComparison('g1');
  assert(r !== null, 'returns row');
  assertEq(r.agents_compared, ['a1', 'a2'], 'agents_compared parsed');
  assertEq(r.comparison_scores, { a1: { total_score: 600 } }, 'scores parsed');
  assertEq(r.selected_agent_name, 'Claude', 'joined field');
}

// Invalid JSON → fallback
resetDb();
routes.push({
  match: /SELECT c\.\*, a\.name as selected_agent_name/,
  respond: () => [[{
    id: 'cmp2',
    agents_compared: 'not json',
    comparison_scores: '}}}{{{',
  }], []],
});
{
  const r = await getComparison('g2');
  assertEq(r.agents_compared, [], 'fallback [] on bad JSON');
  assertEq(r.comparison_scores, {}, 'fallback {} on bad JSON');
}

// ============================================================================
// getResultsForStep
// ============================================================================
console.log('\n── getResultsForStep ─────────────────────────────────────');

resetDb();
routes.push({
  match: /WHERE r\.prompt_plan_step_id = \?/,
  respond: (params) => {
    return [[
      { id: 'r1', agent_name: 'Claude', violations_found: '[{"type":"x"}]' },
      { id: 'r2', agent_name: 'Cursor', violations_found: null },
    ], []];
  },
});
{
  const r = await getResultsForStep('step-123');
  assertEq(r.length, 2, '2 rows');
  assertEq(r[0].violations_found, [{ type: 'x' }], 'parsed JSON');
  assertEq(r[1].violations_found, [], 'null → []');
  const query = queryLog.find(q => /prompt_plan_step_id/.test(q.sql));
  assertEq(query!.params[0], 'step-123', 'stepId param');
}

// ============================================================================
// getAgentResults
// ============================================================================
console.log('\n── getAgentResults ───────────────────────────────────────');

resetDb();
routes.push({
  match: /WHERE r\.agent_id = \?/,
  respond: () => [[
    { id: 'r1', violations_found: '[{"v":1}]' },
  ], []],
});
{
  const r = await getAgentResults('agent-x');
  assertEq(r.length, 1, '1 row');
  assertEq(r[0].violations_found, [{ v: 1 }], 'parsed');
  const query = queryLog.find(q => /WHERE r\.agent_id = \?/.test(q.sql));
  assertEq(query!.params[0], 'agent-x', 'agentId param');
  assertEq(query!.params[1], 20, 'default limit 20');
}

// Custom limit
resetDb();
routes.push({
  match: /WHERE r\.agent_id = \?/,
  respond: () => [[], []],
});
{
  await getAgentResults('agent-y', 5);
  const query = queryLog.find(q => /WHERE r\.agent_id = \?/.test(q.sql));
  assertEq(query!.params[1], 5, 'custom limit 5');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
