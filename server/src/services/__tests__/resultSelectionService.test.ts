#!/usr/bin/env npx tsx
/**
 * Unit tests for services/resultSelectionService.js (OMD-1202)
 *
 * Deterministic multi-agent result scoring/selection. Deps: config/db, uuid.
 *
 * Strategy: replace cached uuid module with deterministic v4 stub;
 * stub db-compat via require.cache with a regex-dispatch fake pool
 * whose responders are scripted per test.
 *
 * Coverage:
 *   - COMPLETION_RANK / VALID_COMPLETION_STATUSES exported constants
 *   - _scoreResult: weight formula, default priority 50, violation clamp,
 *     confidence round, null-safety
 *   - evaluateResult: invalid completion_status + confidence throws,
 *     already-evaluated skip (unless force), UPDATE params, not-found throws
 *   - selectBestResult: no results → throws, single result auto-select,
 *     unevaluated results → throws, multi-result ranking by score,
 *     tie-breaker by agent_priority, tie-breaker by execution_duration_ms,
 *     comparison record inserted with uuid + scores map
 *   - getComparison / getResultsForStep / getAgentResults: JSON parsing
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

// ── Fake pool ────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Responder = { match: RegExp; respond: (params: any[]) => any };
let responders: Responder[] = [];

function runQuery(sql: string, params: any[] = []) {
  queryLog.push({ sql, params });
  for (const r of responders) {
    if (r.match.test(sql)) return Promise.resolve(r.respond(params));
  }
  return Promise.resolve([[]]);
}

const fakePool = { query: runQuery };

const dbCompatPath = require.resolve('../../config/db');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
    getTenantPool: () => fakePool,
  },
} as any;

// uuid stub via require.cache replacement
let nextUuid = 'comp-uuid-1';
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: { v4: () => nextUuid },
} as any;

function reset() {
  queryLog.length = 0;
  responders = [];
}

const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const svc = require('../resultSelectionService');

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── constants ────────────────────────────────────────────');

assertEq(svc.COMPLETION_RANK, {
  success: 5, partial: 3, failure: 1, blocked: 0, timeout: 0,
}, 'COMPLETION_RANK values');
assertEq(svc.VALID_COMPLETION_STATUSES,
  ['success', 'partial', 'failure', 'blocked', 'timeout'],
  'VALID_COMPLETION_STATUSES'
);

// ============================================================================
// _scoreResult (direct)
// ============================================================================
console.log('\n── _scoreResult ─────────────────────────────────────────');

{
  // success, 0 violations, confidence 1.0
  const s = svc._scoreResult({
    id: 'r1', agent_id: 'a1', agent_name: 'A', agent_priority: 10,
    prompt_plan_step_id: 'st', execution_duration_ms: 1000,
    completion_status: 'success', violation_count: 0, confidence: 1.0,
  });
  // completion_rank = 5, violation_rank = 10, confidence_rank = 10
  // total = 5*100 + 10*10 + 10 = 610
  assertEq(s.completion_rank, 5, 'success → completion 5');
  assertEq(s.violation_rank, 10, '0 violations → 10');
  assertEq(s.confidence_rank, 10, '1.0 conf → 10');
  assertEq(s.total_score, 610, 'total 610');
  assertEq(s.agent_priority, 10, 'priority preserved');
}

{
  // partial, 3 violations, confidence 0.5
  const s = svc._scoreResult({
    id: 'r2', completion_status: 'partial', violation_count: 3, confidence: 0.5,
  });
  // completion=3, violation=7, confidence=5 → 300+70+5=375
  assertEq(s.completion_rank, 3, 'partial → 3');
  assertEq(s.violation_rank, 7, '3 violations → 7');
  assertEq(s.confidence_rank, 5, '0.5 → 5');
  assertEq(s.total_score, 375, 'total 375');
  assertEq(s.agent_priority, 50, 'default priority 50 when missing');
}

{
  // violation clamp: 15 violations → 0
  const s = svc._scoreResult({
    id: 'r3', completion_status: 'failure', violation_count: 15, confidence: 0,
  });
  // completion=1, violation=max(0,10-15)=0, confidence=0 → 100+0+0=100
  assertEq(s.violation_rank, 0, 'violation clamped to 0');
  assertEq(s.total_score, 100, 'total 100');
}

{
  // null safety
  const s = svc._scoreResult({
    id: 'r4', completion_status: 'blocked',
  });
  // completion=0, violation=10, confidence=0 → 0+100+0=100
  assertEq(s.completion_rank, 0, 'blocked → 0');
  assertEq(s.violation_count, 0, 'null violations → 0');
  assertEq(s.confidence, 0, 'null confidence → 0');
  assertEq(s.total_score, 100, 'total 100');
}

{
  // unknown status → 0
  const s = svc._scoreResult({ id: 'r5', completion_status: 'wtf' });
  assertEq(s.completion_rank, 0, 'unknown status → 0');
}

// ============================================================================
// evaluateResult
// ============================================================================
console.log('\n── evaluateResult: validation ───────────────────────────');

reset();
{
  let caught: any = null;
  try { await svc.evaluateResult('r1', { completion_status: 'bogus' }); } catch (e) { caught = e; }
  assert(caught !== null, 'invalid completion_status throws');
  assert(caught.message.includes('Invalid completion_status'), 'error message');

  caught = null;
  try {
    await svc.evaluateResult('r1', { completion_status: 'success', confidence: 1.5 });
  } catch (e) { caught = e; }
  assert(caught !== null, 'confidence > 1 throws');

  caught = null;
  try {
    await svc.evaluateResult('r1', { completion_status: 'success', confidence: -0.1 });
  } catch (e) { caught = e; }
  assert(caught !== null, 'confidence < 0 throws');
}

console.log('\n── evaluateResult: already evaluated → skip ─────────────');

reset();
responders = [
  { match: /SELECT evaluator_status/, respond: () => [[
    { evaluator_status: 'evaluated', completion_status: 'success', confidence: 0.9 },
  ]] },
];
{
  const r = await svc.evaluateResult('r1', { completion_status: 'partial', confidence: 0.5 });
  assertEq(r.skipped, true, 'returns skipped');
  assertEq(r.reason, 'Already evaluated', 'reason');
  assertEq(r.completion_status, 'success', 'preserved existing status');
  assertEq(queryLog.length, 1, 'only SELECT, no UPDATE');
}

console.log('\n── evaluateResult: force re-eval ────────────────────────');

reset();
responders = [
  { match: /UPDATE prompt_execution_results/, respond: () => [{ affectedRows: 1 }] },
];
{
  const r = await svc.evaluateResult(
    'r1',
    { completion_status: 'success', violations: [{ type: 'x' }, { type: 'y' }], confidence: 0.8, notes: 'ok' },
    { force: true }
  );
  assertEq(r.violation_count, 2, 'violation count');
  assertEq(r.completion_status, 'success', 'status');
  // No SELECT query (bypassed by force)
  assertEq(queryLog.length, 1, 'one query (UPDATE only)');
  const p = queryLog[0].params;
  assertEq(p[0], 'success', 'status param');
  assertEq(p[1], JSON.stringify([{ type: 'x' }, { type: 'y' }]), 'violations JSON');
  assertEq(p[2], 2, 'violation_count');
  assertEq(p[3], 0.8, 'confidence');
  assertEq(p[4], 'ok', 'notes');
  assertEq(p[5], 'r1', 'resultId');
}

console.log('\n── evaluateResult: fresh eval ───────────────────────────');

reset();
responders = [
  { match: /SELECT evaluator_status/, respond: () => [[
    { evaluator_status: 'pending', completion_status: null, confidence: null },
  ]] },
  { match: /UPDATE prompt_execution_results/, respond: () => [{ affectedRows: 1 }] },
];
{
  const r = await svc.evaluateResult('r1', { completion_status: 'partial' });
  assertEq(r.violation_count, 0, 'no violations → 0');
  assertEq(r.completion_status, 'partial', 'status');
  assertEq(queryLog.length, 2, 'SELECT + UPDATE');
  // violations JSON should be '[]'
  assertEq(queryLog[1].params[1], '[]', 'empty violations JSON');
  assertEq(queryLog[1].params[3], null, 'null confidence when omitted');
}

console.log('\n── evaluateResult: not found → throws ───────────────────');

reset();
responders = [
  { match: /SELECT evaluator_status/, respond: () => [[]] },  // no existing row
  { match: /UPDATE prompt_execution_results/, respond: () => [{ affectedRows: 0 }] },
];
{
  let caught: any = null;
  try { await svc.evaluateResult('missing', { completion_status: 'success' }); } catch (e) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught.message.includes('not found'), 'error message');
}

// ============================================================================
// selectBestResult
// ============================================================================
console.log('\n── selectBestResult: no results → throws ────────────────');

reset();
responders = [{ match: /SELECT r\.\*, a\.name as agent_name/, respond: () => [[]] }];
{
  let caught: any = null;
  try { await svc.selectBestResult('grp1'); } catch (e) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught.message.includes('No results found'), 'error message');
}

console.log('\n── selectBestResult: single result → auto-select ────────');

reset();
responders = [
  { match: /SELECT r\.\*, a\.name as agent_name/, respond: () => [[
    { id: 'r1', agent_id: 'a1', agent_name: 'Solo', agent_priority: 10,
      evaluator_status: 'evaluated', completion_status: 'success',
      violation_count: 0, confidence: 1.0 },
  ]] },
  { match: /UPDATE prompt_execution_results SET was_selected = 1/, respond: () => [{ affectedRows: 1 }] },
];
{
  const r = await svc.selectBestResult('grp1');
  assertEq(r.selected_result_id, 'r1', 'selected id');
  assertEq(r.selected_agent_id, 'a1', 'agent id');
  assertEq(r.comparison, null, 'no comparison for single');
  assert(/auto-selected/.test(r.selection_reason), 'reason mentions auto');
  // Should NOT insert comparison record
  assert(!queryLog.some(q => /INSERT INTO prompt_agent_comparisons/.test(q.sql)),
    'no comparison record inserted');
}

console.log('\n── selectBestResult: unevaluated → throws ───────────────');

reset();
responders = [
  { match: /SELECT r\.\*, a\.name as agent_name/, respond: () => [[
    { id: 'r1', agent_id: 'a1', agent_name: 'A', evaluator_status: 'evaluated',
      completion_status: 'success', violation_count: 0, confidence: 1.0 },
    { id: 'r2', agent_id: 'a2', agent_name: 'B', evaluator_status: 'pending' },
  ]] },
];
{
  let caught: any = null;
  try { await svc.selectBestResult('grp1'); } catch (e) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught.message.includes('not yet evaluated'), 'error message');
  assert(caught.message.includes('r2'), 'error lists unevaluated id');
}

console.log('\n── selectBestResult: clear winner by score ──────────────');

reset();
nextUuid = 'comp-uuid-winner';
responders = [
  { match: /SELECT r\.\*, a\.name as agent_name/, respond: () => [[
    { id: 'r1', agent_id: 'a1', agent_name: 'A', agent_priority: 10,
      prompt_plan_step_id: 'st', execution_duration_ms: 500,
      evaluator_status: 'evaluated', completion_status: 'success',
      violation_count: 0, confidence: 1.0 },
    { id: 'r2', agent_id: 'a2', agent_name: 'B', agent_priority: 20,
      prompt_plan_step_id: 'st', execution_duration_ms: 400,
      evaluator_status: 'evaluated', completion_status: 'partial',
      violation_count: 2, confidence: 0.7 },
  ]] },
  { match: /UPDATE prompt_execution_results SET was_selected = 1/, respond: () => [{ affectedRows: 1 }] },
  { match: /UPDATE prompt_execution_results SET was_selected = 0/, respond: () => [{ affectedRows: 1 }] },
  { match: /INSERT INTO prompt_agent_comparisons/, respond: () => [{ affectedRows: 1 }] },
];
{
  const r = await svc.selectBestResult('grp1');
  assertEq(r.selected_result_id, 'r1', 'A wins by completion_status');
  assertEq(r.selected_agent_id, 'a1', 'a1 winner');
  assertEq(r.comparison.tie_breaker_used, false, 'no tie-breaker');
  assertEq(r.comparison.id, 'comp-uuid-winner', 'uuid used');
  // Scores map
  assertEq(r.comparison.scores.a1.total_score, 610, 'a1 score 610');
  assertEq(r.comparison.scores.a2.total_score, 3 * 100 + 8 * 10 + 7, 'a2 score');
  // Comparison record inserted
  const insertCall = queryLog.find(q => /INSERT INTO prompt_agent_comparisons/.test(q.sql));
  assert(insertCall !== undefined, 'insert call made');
  const p = insertCall!.params;
  assertEq(p[0], 'comp-uuid-winner', 'insert uuid');
  assertEq(p[1], 'grp1', 'execution_group_id');
  assertEq(p[2], 'st', 'step id');
  assertEq(p[3], JSON.stringify(['a1', 'a2']), 'agents_compared array');
  assertEq(p[4], 'a1', 'selected_agent_id');
  assertEq(p[5], 'r1', 'selected_result_id');
  assertEq(p[8], 0, 'tie_breaker_used flag false');
  assertEq(p[9], null, 'tie_breaker_method null');
}

console.log('\n── selectBestResult: tie → agent_priority wins ──────────');

reset();
nextUuid = 'comp-tie-priority';
responders = [
  { match: /SELECT r\.\*, a\.name as agent_name/, respond: () => [[
    { id: 'r1', agent_id: 'a1', agent_name: 'High', agent_priority: 30,
      prompt_plan_step_id: 'st', execution_duration_ms: 1000,
      evaluator_status: 'evaluated', completion_status: 'success',
      violation_count: 0, confidence: 1.0 },
    { id: 'r2', agent_id: 'a2', agent_name: 'Low', agent_priority: 10,
      prompt_plan_step_id: 'st', execution_duration_ms: 2000,
      evaluator_status: 'evaluated', completion_status: 'success',
      violation_count: 0, confidence: 1.0 },
  ]] },
  { match: /UPDATE prompt_execution_results SET was_selected/, respond: () => [{ affectedRows: 1 }] },
  { match: /INSERT INTO prompt_agent_comparisons/, respond: () => [{ affectedRows: 1 }] },
];
{
  const r = await svc.selectBestResult('grp1');
  // Same score → lower priority number wins (a2 priority=10)
  assertEq(r.selected_agent_id, 'a2', 'lower priority wins tie');
  assertEq(r.comparison.tie_breaker_used, true, 'tie-breaker used');
  assertEq(r.comparison.tie_breaker_method, 'agent_priority', 'by priority');
}

console.log('\n── selectBestResult: tie → execution_speed wins ─────────');

reset();
nextUuid = 'comp-tie-speed';
responders = [
  { match: /SELECT r\.\*, a\.name as agent_name/, respond: () => [[
    { id: 'r1', agent_id: 'a1', agent_name: 'Slow', agent_priority: 10,
      prompt_plan_step_id: 'st', execution_duration_ms: 2000,
      evaluator_status: 'evaluated', completion_status: 'success',
      violation_count: 0, confidence: 1.0 },
    { id: 'r2', agent_id: 'a2', agent_name: 'Fast', agent_priority: 10,
      prompt_plan_step_id: 'st', execution_duration_ms: 500,
      evaluator_status: 'evaluated', completion_status: 'success',
      violation_count: 0, confidence: 1.0 },
  ]] },
  { match: /UPDATE prompt_execution_results SET was_selected/, respond: () => [{ affectedRows: 1 }] },
  { match: /INSERT INTO prompt_agent_comparisons/, respond: () => [{ affectedRows: 1 }] },
];
{
  const r = await svc.selectBestResult('grp1');
  assertEq(r.selected_agent_id, 'a2', 'faster wins when priority equal');
  assertEq(r.comparison.tie_breaker_method, 'execution_speed', 'speed tie-breaker');
}

// ============================================================================
// getComparison
// ============================================================================
console.log('\n── getComparison ────────────────────────────────────────');

reset();
responders = [
  { match: /SELECT c\.\*, a\.name as selected_agent_name/, respond: () => [[
    {
      id: 'c1', execution_group_id: 'g1', selected_agent_name: 'A',
      agents_compared: '["a1","a2"]',
      comparison_scores: '{"a1":{"total_score":610}}',
    },
  ]] },
];
{
  const r = await svc.getComparison('g1');
  assertEq(r.id, 'c1', 'id');
  assertEq(r.agents_compared, ['a1', 'a2'], 'parsed array');
  assertEq(r.comparison_scores, { a1: { total_score: 610 } }, 'parsed scores');
}

reset();
responders = [{ match: /SELECT c\.\*, a\.name as selected_agent_name/, respond: () => [[]] }];
{
  const r = await svc.getComparison('none');
  assertEq(r, null, 'not found → null');
}

// ============================================================================
// getResultsForStep
// ============================================================================
console.log('\n── getResultsForStep ────────────────────────────────────');

reset();
responders = [
  { match: /WHERE r\.prompt_plan_step_id = \?/, respond: () => [[
    { id: 'r1', violations_found: '["v1","v2"]' },
    { id: 'r2', violations_found: 'not-json' },
  ]] },
];
{
  const r = await svc.getResultsForStep('st1');
  assertEq(r.length, 2, 'two results');
  assertEq(r[0].violations_found, ['v1', 'v2'], 'parsed JSON');
  assertEq(r[1].violations_found, [], 'invalid JSON → []');
  assert(/ORDER BY r\.created_at DESC/.test(queryLog[0].sql), 'DESC order');
}

// ============================================================================
// getAgentResults
// ============================================================================
console.log('\n── getAgentResults ──────────────────────────────────────');

reset();
responders = [
  { match: /WHERE r\.agent_id = \?/, respond: () => [[
    { id: 'r1', violations_found: '[]' },
  ]] },
];
{
  await svc.getAgentResults('a1');
  assertEq(queryLog[0].params, ['a1', 20], 'default limit 20');
}

reset();
responders = [{ match: /WHERE r\.agent_id = \?/, respond: () => [[]] }];
{
  await svc.getAgentResults('a1', 5);
  assertEq(queryLog[0].params, ['a1', 5], 'custom limit');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
