#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptScoringService.js (OMD-1025)
 *
 * Quality scoring, confidence tracking, chain management, degradation
 * detection, and escalation routing. Pure functions + DB orchestration.
 *
 * Coverage:
 *   - Constants: SCORING, CONFIDENCE_THRESHOLDS, DEGRADATION, ESCALATION
 *   - calculateScore: perfect, violations, issues, blockers, partial/failed/
 *     blocked completion, evaluator fail, no evaluator, floor at 0,
 *     array vs JSON input, malformed input
 *   - deriveConfidence: null → unknown, boundary scores, rolling worse-case
 *   - detectDegradation: <3 steps false, score drop, consecutive violations,
 *     low score persistence, multi-reason aggregation, null quality filtered
 *   - checkEscalation: clean, low score, degraded+<75, blockers, 3+
 *     violations, multi-reason join
 *   - resolveChain: no parent, 2-level walk, cycle bound
 *   - scorePrompt: not found, unscoreable early-return, happy path with
 *     UPDATE + INFO log, escalation path with WARN log
 *   - getScore: not found, returns cached with boolean coercion (no UPDATE)
 *   - getLowConfidence / getDegraded / getEscalated list helpers
 *
 * Run: npx tsx server/src/services/__tests__/promptScoringService.test.ts
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

// ── Stubs ───────────────────────────────────────────────────────────────

type Route = { match: RegExp; rows?: any; result?: any; throws?: Error };
let routes: Route[] = [];
const dbCalls: { sql: string; params: any[] }[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    dbCalls.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        return [r.rows !== undefined ? r.rows : (r.result !== undefined ? r.result : [])];
      }
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

function resetState() {
  routes = [];
  dbCalls.length = 0;
}

const {
  SCORING,
  CONFIDENCE_THRESHOLDS,
  DEGRADATION,
  ESCALATION,
  calculateScore,
  deriveConfidence,
  detectDegradation,
  checkEscalation,
  resolveChain,
  scorePrompt,
  getScore,
  getLowConfidence,
  getDegraded,
  getEscalated,
  getChainHistory,
} = require('../promptScoringService');

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(SCORING.BASE, 100, 'SCORING.BASE');
assertEq(SCORING.VIOLATION_PENALTY, 15, 'violation penalty');
assertEq(SCORING.BLOCKER_PENALTY, 20, 'blocker penalty');
assertEq(SCORING.FAILED_COMPLETION_PENALTY, 30, 'failed penalty');
assertEq(CONFIDENCE_THRESHOLDS.HIGH, 85, 'confidence high');
assertEq(CONFIDENCE_THRESHOLDS.MEDIUM, 60, 'confidence medium');
assertEq(DEGRADATION.SCORE_DROP_THRESHOLD, 10, 'degradation score drop');
assertEq(DEGRADATION.MIN_STEPS_FOR_TREND, 3, 'degradation min steps');
assertEq(ESCALATION.SCORE_THRESHOLD, 60, 'escalation threshold');
assertEq(ESCALATION.MAX_VIOLATIONS_SINGLE_STEP, 3, 'escalation max viol');

// ============================================================================
// calculateScore
// ============================================================================
console.log('\n── calculateScore ────────────────────────────────────────');

// Perfect (evaluator_status = pass)
{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 100, 'perfect = 100');
  assertEq(r.violation_count, 0, '0 violations');
  assertEq(r.blocker_count, 0, '0 blockers');
  assertEq(r.breakdown, [], 'no breakdown');
}

// 1 violation → 100 - 15 = 85
{
  const r = calculateScore({
    violations_found: '[{"type":"v"}]',
    evaluator_status: 'pass',
    completion_status: 'success',
  });
  assertEq(r.quality_score, 85, '1 violation = 85');
  assertEq(r.violation_count, 1, 'violation_count 1');
}

// Mix: 2 viol + 1 issue + partial + no evaluator
// 100 - 30 - 8 - 15 - 5 = 42
{
  const r = calculateScore({
    violations_found: '[{"a":1},{"b":2}]',
    issues_found: '[{"c":3}]',
    blockers_found: null,
    completion_status: 'partial',
    evaluator_status: null,
  });
  assertEq(r.quality_score, 42, 'mixed = 42');
  assertEq(r.violation_count, 2, '2 viol');
  assertEq(r.issue_count, 1, '1 issue');
  assert(r.breakdown.some((b: any) => b.factor === 'violations'), 'breakdown has violations');
  assert(r.breakdown.some((b: any) => b.factor === 'partial_completion'), 'breakdown has partial');
  assert(r.breakdown.some((b: any) => b.factor === 'no_evaluator'), 'breakdown has no_evaluator');
}

// Floor at 0: 10 viol (150) + 3 block (60) + failed (30) + eval fail (20) = 260
{
  const r = calculateScore({
    violations_found: JSON.stringify(Array(10).fill({ v: 1 })),
    blockers_found: JSON.stringify(Array(3).fill({ b: 1 })),
    completion_status: 'failed',
    evaluator_status: 'fail',
  });
  assertEq(r.quality_score, 0, 'floored to 0');
  assertEq(r.violation_count, 10, '10 viol');
  assertEq(r.blocker_count, 3, '3 block');
}

// Array input (not JSON string)
{
  const r = calculateScore({
    violations_found: [{ a: 1 }, { b: 2 }],
    evaluator_status: 'pass',
    completion_status: 'success',
  });
  assertEq(r.violation_count, 2, 'array input works');
  assertEq(r.quality_score, 70, '100 - 30 = 70');
}

// Malformed JSON → no penalty
{
  const r = calculateScore({
    violations_found: '{not-json',
    evaluator_status: 'pass',
    completion_status: 'success',
  });
  assertEq(r.violation_count, 0, 'malformed JSON → 0');
  assertEq(r.quality_score, 100, 'malformed → 100');
}

// Blocked completion: 100 - 25 = 75
{
  const r = calculateScore({
    completion_status: 'blocked',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 75, 'blocked completion = 75');
}

// Evaluator fail: 100 - 20 = 80
{
  const r = calculateScore({
    completion_status: 'success',
    evaluator_status: 'fail',
  });
  assertEq(r.quality_score, 80, 'eval fail = 80');
}

// Pending evaluator: 100 - 5 = 95
{
  const r = calculateScore({
    completion_status: 'success',
    evaluator_status: 'pending',
  });
  assertEq(r.quality_score, 95, 'pending eval = 95');
}

// ============================================================================
// deriveConfidence
// ============================================================================
console.log('\n── deriveConfidence ──────────────────────────────────────');

assertEq(deriveConfidence(null, null), 'unknown', 'null → unknown');
assertEq(deriveConfidence(undefined, null), 'unknown', 'undefined → unknown');
assertEq(deriveConfidence(100, null), 'high', '100 high');
assertEq(deriveConfidence(85, null), 'high', '85 high (boundary)');
assertEq(deriveConfidence(84, null), 'medium', '84 medium');
assertEq(deriveConfidence(60, null), 'medium', '60 medium (boundary)');
assertEq(deriveConfidence(59, null), 'low', '59 low');
assertEq(deriveConfidence(0, null), 'low', '0 low');

// Rolling worse-case
assertEq(deriveConfidence(90, 50), 'low', 'rolling 50 drags to low');
assertEq(deriveConfidence(50, 90), 'low', 'current 50 = low');
assertEq(deriveConfidence(90, 85), 'high', 'both high → high');
assertEq(deriveConfidence(100, 70), 'medium', 'rolling 70 → medium');

// ============================================================================
// detectDegradation
// ============================================================================
console.log('\n── detectDegradation ─────────────────────────────────────');

// <3 steps → false
{
  const r = detectDegradation([{ quality_score: 50 }, { quality_score: 40 }], 40);
  assertEq(r.degraded, false, '<3 steps not degraded');
  assertEq(r.reasons, [], 'no reasons');
}

// Null scores filtered
{
  const r = detectDegradation([
    { quality_score: null },
    { quality_score: null },
    { quality_score: 100 },
  ], 100);
  assertEq(r.degraded, false, 'nulls filter → only 1 real → not degraded');
}

// Score drop detection (≥10 points over 3 steps)
{
  const r = detectDegradation([
    { quality_score: 90, violation_count: 0 },
    { quality_score: 80, violation_count: 0 },
    { quality_score: 75, violation_count: 0 },
  ], 75);
  assertEq(r.degraded, true, 'score drop detected');
  assert(r.reasons.some((x: string) => x.includes('declined')), 'reason mentions decline');
}

// Consecutive violations
{
  const r = detectDegradation([
    { quality_score: 85, violation_count: 2 },
    { quality_score: 80, violation_count: 1 },
    { quality_score: 90, violation_count: 3 },
  ], 90);
  assertEq(r.degraded, true, 'consecutive violations');
  assert(r.reasons.some((x: string) => x.includes('consecutive')), 'reason mentions consecutive');
}

// Low score persistence (2+ below 50)
{
  const r = detectDegradation([
    { quality_score: 80, violation_count: 0 },
    { quality_score: 40, violation_count: 0 },
    { quality_score: 30, violation_count: 0 },
  ], 30);
  assertEq(r.degraded, true, 'low scores persisting');
  assert(r.reasons.some((x: string) => x.includes('below 50')), 'reason mentions low');
}

// ============================================================================
// checkEscalation
// ============================================================================
console.log('\n── checkEscalation ───────────────────────────────────────');

// Clean
{
  const r = checkEscalation(90, 0, 0, false);
  assertEq(r.required, false, 'clean not required');
  assertEq(r.reason, '', 'empty reason');
}

// Score < 60
{
  const r = checkEscalation(55, 0, 0, false);
  assertEq(r.required, true, '55 escalates');
  assert(r.reason.includes('below threshold'), 'mentions threshold');
}

// Degraded + below 75
{
  const r = checkEscalation(70, 0, 0, true);
  assertEq(r.required, true, 'degraded+70 escalates');
  assert(r.reason.includes('Degraded'), 'mentions degraded');
}

// Degraded but above 75 → no escalation from that reason
{
  const r = checkEscalation(80, 0, 0, true);
  assertEq(r.required, false, 'degraded+80 not escalated');
}

// Blockers
{
  const r = checkEscalation(100, 0, 2, false);
  assertEq(r.required, true, 'blockers escalate');
  assert(r.reason.includes('blocker'), 'mentions blocker');
}

// 3+ violations in single step
{
  const r = checkEscalation(100, 3, 0, false);
  assertEq(r.required, true, '3+ violations escalate');
  assert(r.reason.includes('violations in single step'), 'mentions single-step');
}

// Multi-reason join
{
  const r = checkEscalation(50, 5, 2, true);
  assertEq(r.required, true, 'multi required');
  assert(r.reason.includes(';'), 'joined with ;');
}

// ============================================================================
// resolveChain
// ============================================================================
console.log('\n── resolveChain ──────────────────────────────────────────');

// No parent → single prompt, no queries
resetState();
{
  const r = await resolveChain(fakePool, { id: 1, parent_prompt_id: null });
  assertEq(r.chain_id, 1, 'self is root');
  assertEq(r.chain_step_number, 1, 'depth 1');
  assertEq(dbCalls.length, 0, 'no DB queries');
}

// 2-level walk
resetState();
routes = [
  { match: /SELECT id, parent_prompt_id[\s\S]*WHERE id = \?/i, rows: [] },  // fallback
];
let callNum = 0;
const origQuery = fakePool.query;
fakePool.query = async (sql: string, params: any[] = []) => {
  dbCalls.push({ sql, params });
  callNum++;
  // First call returns parent_id=10 (root, no further parent)
  if (callNum === 1) return [[{ id: 10, parent_prompt_id: null }]];
  return [[]];
};
{
  const r = await resolveChain(fakePool, { id: 20, parent_prompt_id: 10 });
  assertEq(r.chain_id, 10, 'chain_id = root parent');
  assertEq(r.chain_step_number, 2, 'depth 2');
  assertEq(dbCalls.length, 1, '1 query');
}
fakePool.query = origQuery;

// ============================================================================
// scorePrompt
// ============================================================================
console.log('\n── scorePrompt ───────────────────────────────────────────');

// Not found
resetState();
routes = [
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, rows: [] },
];
{
  let caught: Error | null = null;
  try { await scorePrompt(999); } catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
  assert(
    caught !== null && caught.message.includes('not found'),
    'error mentions not found'
  );
}

// Unscoreable (status=draft, no evaluator)
resetState();
routes = [
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, rows: [{
    id: 5, status: 'draft', evaluator_status: null, title: 'T',
  }]},
];
{
  const r = await scorePrompt(5);
  assertEq(r.scored, false, 'not scored');
  assert(r.reason.includes('not yet scoreable'), 'reason mentions scoreable');
  assertEq(dbCalls.length, 1, 'only SELECT, no UPDATE');
}

// Happy path: complete, evaluator pass, no issues
resetState();
routes = [
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, rows: [{
    id: 7, status: 'complete', title: 'MyPrompt',
    parent_prompt_id: null,
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: 'success', evaluator_status: 'pass',
  }]},
  { match: /FROM om_prompt_registry[\s\S]*WHERE chain_id = \?/i, rows: [] },
  { match: /UPDATE om_prompt_registry SET/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/i, rows: { affectedRows: 1 } },
];
{
  const r = await scorePrompt(7);
  assertEq(r.scored, true, 'scored');
  assertEq(r.quality_score, 100, 'score 100');
  assertEq(r.confidence_level, 'high', 'high confidence');
  assertEq(r.escalation_required, false, 'no escalation');

  // Log is INFO
  const log = dbCalls.find(c => /INSERT INTO system_logs/i.test(c.sql));
  assert(log !== undefined, 'log called');
  assertEq(log!.params[0], 'INFO', 'INFO level');
}

// Escalation path: failed completion, 3 violations
resetState();
routes = [
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, rows: [{
    id: 8, status: 'complete', title: 'Bad',
    parent_prompt_id: null,
    violations_found: '[{"a":1},{"b":2},{"c":3}]',
    issues_found: null, blockers_found: null,
    completion_status: 'failed', evaluator_status: 'fail',
  }]},
  { match: /FROM om_prompt_registry[\s\S]*WHERE chain_id = \?/i, rows: [] },
  { match: /UPDATE om_prompt_registry SET/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/i, rows: { affectedRows: 1 } },
];
{
  const r = await scorePrompt(8);
  // 100 - 45 - 30 - 20 = 5
  assertEq(r.quality_score, 5, 'bad score');
  assertEq(r.confidence_level, 'low', 'low');
  assertEq(r.escalation_required, true, 'escalates');
  assert(r.escalation_reason.length > 0, 'has reason');

  const log = dbCalls.find(c => /INSERT INTO system_logs/i.test(c.sql));
  assertEq(log!.params[0], 'WARN', 'WARN level on escalation');
}

// ============================================================================
// getScore
// ============================================================================
console.log('\n── getScore ──────────────────────────────────────────────');

// Not found
resetState();
routes = [
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, rows: [] },
];
{
  let caught: Error | null = null;
  try { await getScore(999); } catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
}

// Cached return (already has quality_score)
resetState();
routes = [
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, rows: [{
    id: 10, title: 'T', status: 'complete',
    quality_score: 85, confidence_level: 'high',
    violation_count: 0, issue_count: 0, blocker_count: 0,
    degradation_flag: 1, escalation_required: 0,
    escalation_reason: null,
    chain_id: 10, chain_step_number: 1,
    rolling_quality_score: 85, previous_quality_score: null,
  }]},
  { match: /FROM om_prompt_registry[\s\S]*WHERE chain_id = \?/i, rows: [] },
];
{
  const r = await getScore(10);
  assertEq(r.scored, true, 'scored=true when quality_score set');
  assertEq(r.quality_score, 85, 'score');
  assertEq(r.degradation_flag, true, 'boolean coerced true');
  assertEq(r.escalation_required, false, 'boolean coerced false');

  // No UPDATE issued
  const update = dbCalls.find(c => /UPDATE/i.test(c.sql));
  assert(update === undefined, 'no UPDATE');
}

// ============================================================================
// List helpers
// ============================================================================
console.log('\n── List helpers ──────────────────────────────────────────');

resetState();
routes = [
  { match: /confidence_level = 'low'/i, rows: [{ id: 1 }, { id: 2 }] },
];
{
  const r = await getLowConfidence();
  assertEq(r.length, 2, 'getLowConfidence');
}

resetState();
routes = [
  { match: /degradation_flag = 1/i, rows: [{ id: 1 }] },
];
{
  const r = await getDegraded();
  assertEq(r.length, 1, 'getDegraded');
}

resetState();
routes = [
  { match: /escalation_required = 1/i, rows: [{ id: 1 }, { id: 2 }, { id: 3 }] },
];
{
  const r = await getEscalated();
  assertEq(r.length, 3, 'getEscalated');
}

// getChainHistory
resetState();
routes = [
  { match: /WHERE chain_id = \?[\s\S]*ORDER BY chain_step_number/i, rows: [
    { id: 1, chain_step_number: 1 },
    { id: 2, chain_step_number: 2 },
  ]},
];
{
  const r = await getChainHistory(fakePool, 1);
  assertEq(r.length, 2, 'getChainHistory');
  assertEq(dbCalls[0].params, [1], 'chainId param');
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
