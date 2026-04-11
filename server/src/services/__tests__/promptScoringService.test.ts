#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptScoringService.js (OMD-1042)
 *
 * Covers the deterministic/pure methods:
 *   - calculateScore — base 100 minus penalties for violations/issues/blockers,
 *     completion status, evaluator status; floor 0, cap 100
 *   - deriveConfidence — score → high/medium/low/unknown, uses worst of
 *     current and rolling
 *   - detectDegradation — 3 triggers (score drop, consecutive violations,
 *     persisting low score); requires MIN_STEPS_FOR_TREND
 *   - checkEscalation — score/degraded/blockers/violations trigger reasons
 *   - Exported SCORING/CONFIDENCE_THRESHOLDS/DEGRADATION/ESCALATION constants
 *
 * DB-backed methods (scorePrompt, resolveChain, getChainHistory, getScore,
 * getLowConfidence, getDegraded, getEscalated) are out of scope — they can
 * be tested separately with pool stubbing.
 *
 * Stubs `../config/db` via require.cache with a no-op getAppPool so the
 * module loads without hitting a real DB.
 *
 * Run from server/: npx tsx src/services/__tests__/promptScoringService.test.ts
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

// ── Stub config/db BEFORE requiring the SUT ───────────────────────────
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    getAppPool: () => ({
      query: async () => [[]],
    }),
  },
} as any;

const {
  calculateScore,
  deriveConfidence,
  detectDegradation,
  checkEscalation,
  SCORING,
  CONFIDENCE_THRESHOLDS,
  DEGRADATION,
  ESCALATION,
} = require('../promptScoringService');

async function main() {

// ============================================================================
// Exported constants (transparency)
// ============================================================================
console.log('\n── constants ─────────────────────────────────────────────');

assertEq(SCORING.BASE, 100, 'SCORING.BASE');
assertEq(SCORING.VIOLATION_PENALTY, 15, 'VIOLATION_PENALTY');
assertEq(SCORING.ISSUE_PENALTY, 8, 'ISSUE_PENALTY');
assertEq(SCORING.BLOCKER_PENALTY, 20, 'BLOCKER_PENALTY');
assertEq(SCORING.PARTIAL_COMPLETION_PENALTY, 15, 'PARTIAL_COMPLETION_PENALTY');
assertEq(SCORING.FAILED_COMPLETION_PENALTY, 30, 'FAILED_COMPLETION_PENALTY');
assertEq(SCORING.BLOCKED_COMPLETION_PENALTY, 25, 'BLOCKED_COMPLETION_PENALTY');
assertEq(SCORING.EVALUATOR_FAIL_PENALTY, 20, 'EVALUATOR_FAIL_PENALTY');
assertEq(SCORING.NO_EVALUATOR_PENALTY, 5, 'NO_EVALUATOR_PENALTY');
assertEq(CONFIDENCE_THRESHOLDS.HIGH, 85, 'CONFIDENCE.HIGH');
assertEq(CONFIDENCE_THRESHOLDS.MEDIUM, 60, 'CONFIDENCE.MEDIUM');
assertEq(DEGRADATION.SCORE_DROP_THRESHOLD, 10, 'DEGRADATION.SCORE_DROP_THRESHOLD');
assertEq(DEGRADATION.MIN_STEPS_FOR_TREND, 3, 'DEGRADATION.MIN_STEPS_FOR_TREND');
assertEq(DEGRADATION.CONSECUTIVE_VIOLATIONS, 2, 'DEGRADATION.CONSECUTIVE_VIOLATIONS');
assertEq(DEGRADATION.LOW_SCORE_THRESHOLD, 50, 'DEGRADATION.LOW_SCORE_THRESHOLD');
assertEq(DEGRADATION.LOW_SCORE_STEPS, 2, 'DEGRADATION.LOW_SCORE_STEPS');
assertEq(ESCALATION.SCORE_THRESHOLD, 60, 'ESCALATION.SCORE_THRESHOLD');
assertEq(ESCALATION.DEGRADED_SCORE_THRESHOLD, 75, 'ESCALATION.DEGRADED_SCORE_THRESHOLD');
assertEq(ESCALATION.MAX_VIOLATIONS_SINGLE_STEP, 3, 'ESCALATION.MAX_VIOLATIONS_SINGLE_STEP');

// ============================================================================
// calculateScore
// ============================================================================
console.log('\n── calculateScore: baseline ──────────────────────────────');

// Clean prompt with passing evaluator → 100
{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 100, 'clean pass → 100');
  assertEq(r.violation_count, 0, 'no violations');
  assertEq(r.issue_count, 0, 'no issues');
  assertEq(r.blocker_count, 0, 'no blockers');
  assertEq(r.breakdown.length, 0, 'empty breakdown');
}

// No evaluator → -5
{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: null,
  });
  assertEq(r.quality_score, 95, 'no evaluator → 95');
  assertEq(r.breakdown[0].factor, 'no_evaluator', 'breakdown: no_evaluator');
  assertEq(r.breakdown[0].penalty, -5, 'penalty -5');
}

// Pending evaluator → -5 (same as null)
{
  const r = calculateScore({
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: 'complete', evaluator_status: 'pending',
  });
  assertEq(r.quality_score, 95, 'pending evaluator → 95');
}

console.log('\n── calculateScore: violations/issues/blockers ────────────');

// One violation → -15
{
  const r = calculateScore({
    violations_found: ['no tests'],
    issues_found: null, blockers_found: null,
    completion_status: 'complete', evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 85, '1 violation → 85');
  assertEq(r.violation_count, 1, '1 violation');
  assertEq(r.breakdown[0].factor, 'violations', 'factor');
  assertEq(r.breakdown[0].penalty, -15, 'penalty');
}

// Three violations (stringified JSON)
{
  const r = calculateScore({
    violations_found: JSON.stringify(['a', 'b', 'c']),
    issues_found: null, blockers_found: null,
    completion_status: 'complete', evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 55, '3 violations → 100-45=55');
  assertEq(r.violation_count, 3, 'count from JSON string');
}

// Issues
{
  const r = calculateScore({
    violations_found: null,
    issues_found: ['x', 'y'],
    blockers_found: null,
    completion_status: 'complete', evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 84, '2 issues → 100-16=84');
  assertEq(r.issue_count, 2, 'issue count');
}

// Blockers
{
  const r = calculateScore({
    violations_found: null, issues_found: null,
    blockers_found: ['db down'],
    completion_status: 'complete', evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 80, '1 blocker → 80');
  assertEq(r.blocker_count, 1, 'blocker count');
}

console.log('\n── calculateScore: completion status ─────────────────────');

{
  const r = calculateScore({
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: 'partial', evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 85, 'partial → 85');
  assertEq(r.breakdown[0].factor, 'partial_completion', 'factor');
}

{
  const r = calculateScore({
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: 'failed', evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 70, 'failed → 70');
}

{
  const r = calculateScore({
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: 'blocked', evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 75, 'blocked → 75');
}

console.log('\n── calculateScore: evaluator fail ────────────────────────');

{
  const r = calculateScore({
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: 'complete', evaluator_status: 'fail',
  });
  assertEq(r.quality_score, 80, 'evaluator fail → 80');
  assertEq(r.breakdown[0].factor, 'evaluator_fail', 'factor');
}

console.log('\n── calculateScore: floor + combo ─────────────────────────');

// Max penalty case: 5 violations (-75) + 3 blockers (-60) + failed (-30) + eval fail (-20)
// Base 100 - 75 - 60 - 30 - 20 = -85 → floored to 0
{
  const r = calculateScore({
    violations_found: ['a','b','c','d','e'],
    issues_found: null,
    blockers_found: ['x','y','z'],
    completion_status: 'failed',
    evaluator_status: 'fail',
  });
  assertEq(r.quality_score, 0, 'floor at 0');
  assertEq(r.violation_count, 5, 'violation count');
  assertEq(r.blocker_count, 3, 'blocker count');
}

// Unknown completion_status → no penalty applied (only partial/failed/blocked matter)
{
  const r = calculateScore({
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: 'in_progress', evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 100, 'in_progress status → no penalty');
}

// Malformed violations_found (not JSON) → treated as 0
{
  const r = calculateScore({
    violations_found: 'not json',
    issues_found: null, blockers_found: null,
    completion_status: 'complete', evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 100, 'malformed → 0 penalty');
  assertEq(r.violation_count, 0, 'count 0');
}

// Non-array parsed JSON → treated as 0
{
  const r = calculateScore({
    violations_found: '{"not":"array"}',
    issues_found: null, blockers_found: null,
    completion_status: 'complete', evaluator_status: 'pass',
  });
  assertEq(r.violation_count, 0, 'non-array → 0');
}

// Determinism: same input → same output
{
  const input = {
    violations_found: ['a'], issues_found: ['b'],
    blockers_found: null, completion_status: 'partial', evaluator_status: 'fail',
  };
  const r1 = calculateScore(input);
  const r2 = calculateScore(input);
  assertEq(r1.quality_score, r2.quality_score, 'deterministic score');
}

// ============================================================================
// deriveConfidence
// ============================================================================
console.log('\n── deriveConfidence ──────────────────────────────────────');

assertEq(deriveConfidence(null, null), 'unknown', 'null score → unknown');
assertEq(deriveConfidence(undefined, null), 'unknown', 'undefined score → unknown');
assertEq(deriveConfidence(100, null), 'high', '100 → high');
assertEq(deriveConfidence(85, null), 'high', '85 (boundary) → high');
assertEq(deriveConfidence(84, null), 'medium', '84 → medium');
assertEq(deriveConfidence(60, null), 'medium', '60 (boundary) → medium');
assertEq(deriveConfidence(59, null), 'low', '59 → low');
assertEq(deriveConfidence(0, null), 'low', '0 → low');

// Rolling score takes worst
assertEq(deriveConfidence(90, 70), 'medium', 'current 90 + rolling 70 → medium (worst)');
assertEq(deriveConfidence(90, 50), 'low', 'current 90 + rolling 50 → low (worst)');
assertEq(deriveConfidence(90, 95), 'high', 'rolling > current → uses current (worst)');

// undefined rolling is treated as absent
assertEq(deriveConfidence(90, undefined), 'high', 'undefined rolling → current only');

// ============================================================================
// detectDegradation
// ============================================================================
console.log('\n── detectDegradation ─────────────────────────────────────');

// Too few steps → not degraded
{
  const r = detectDegradation(
    [{ quality_score: 100, violation_count: 0 }, { quality_score: 50, violation_count: 5 }],
    50
  );
  assertEq(r.degraded, false, 'below MIN_STEPS_FOR_TREND → not degraded');
  assertEq(r.reasons.length, 0, 'no reasons');
}

// Trigger 1: score drop ≥ 10 points
{
  const r = detectDegradation(
    [
      { quality_score: 90, violation_count: 0 },
      { quality_score: 85, violation_count: 0 },
      { quality_score: 75, violation_count: 0 },  // 90 - 75 = 15 ≥ 10
    ],
    75
  );
  assertEq(r.degraded, true, 'score drop → degraded');
  assert(r.reasons.some((x: string) => /declined/i.test(x)), 'reason mentions decline');
}

// Trigger 2: consecutive violations
{
  const r = detectDegradation(
    [
      { quality_score: 90, violation_count: 0 },
      { quality_score: 85, violation_count: 2 },
      { quality_score: 80, violation_count: 1 },  // last 2 (with count>0): 2 + 1 → 2 consecutive
    ],
    80
  );
  // score drop 10 ≥ 10 also triggers — but both reasons should be present
  assertEq(r.degraded, true, 'consecutive violations → degraded');
  assert(r.reasons.some((x: string) => /consecutive.*violations/i.test(x)), 'reason mentions consecutive violations');
}

// Trigger 3: low score persisting
{
  const r = detectDegradation(
    [
      { quality_score: 80, violation_count: 0 },
      { quality_score: 40, violation_count: 0 },
      { quality_score: 30, violation_count: 0 },  // last 2: 40, 30 both < 50
    ],
    30
  );
  assertEq(r.degraded, true, 'persisting low → degraded');
  assert(r.reasons.some((x: string) => /below 50/i.test(x)), 'reason mentions threshold');
}

// All healthy: flat scores, no violations, above threshold
{
  const r = detectDegradation(
    [
      { quality_score: 90, violation_count: 0 },
      { quality_score: 92, violation_count: 0 },
      { quality_score: 91, violation_count: 0 },
    ],
    91
  );
  assertEq(r.degraded, false, 'stable high → not degraded');
}

// Null scores filtered
{
  const r = detectDegradation(
    [
      { quality_score: null, violation_count: 0 },
      { quality_score: null, violation_count: 0 },
    ],
    null
  );
  assertEq(r.degraded, false, 'all null scored → not degraded');
}

// ============================================================================
// checkEscalation
// ============================================================================
console.log('\n── checkEscalation ───────────────────────────────────────');

// High score, no issues → no escalation
{
  const r = checkEscalation(90, 0, 0, false);
  assertEq(r.required, false, 'healthy → no escalation');
  assertEq(r.reason, '', 'empty reason');
}

// Score below 60 → escalation
{
  const r = checkEscalation(55, 0, 0, false);
  assertEq(r.required, true, 'score<60 → escalate');
  assert(/below threshold/i.test(r.reason), 'reason mentions threshold');
}

// Exactly 60 → NOT escalated (strict <)
{
  const r = checkEscalation(60, 0, 0, false);
  assertEq(r.required, false, 'score=60 boundary → no escalation');
}

// Degraded + score < 75 → escalation
{
  const r = checkEscalation(70, 0, 0, true);
  assertEq(r.required, true, 'degraded+<75 → escalate');
  assert(/degraded.*70/i.test(r.reason), 'reason mentions degraded');
}

// Degraded but score >= 75 → NOT escalated on degradation reason
{
  const r = checkEscalation(80, 0, 0, true);
  assertEq(r.required, false, 'degraded but high score → no escalation');
}

// Blockers present → escalation
{
  const r = checkEscalation(90, 0, 2, false);
  assertEq(r.required, true, 'blockers → escalate');
  assert(/2 blocker/i.test(r.reason), 'reason mentions blockers');
}

// Max violations
{
  const r = checkEscalation(90, 3, 0, false);
  assertEq(r.required, true, '3 violations → escalate');
  assert(/3 violations/.test(r.reason), 'reason mentions violations');
}

// 2 violations → NOT escalated (strict >= 3)
{
  const r = checkEscalation(90, 2, 0, false);
  assertEq(r.required, false, '2 violations → no escalation');
}

// Multiple reasons joined with ;
{
  const r = checkEscalation(50, 5, 2, true);
  assertEq(r.required, true, 'multiple → escalate');
  assert(r.reason.includes(';'), 'reasons joined with ;');
  assert(/below threshold/i.test(r.reason), 'has score reason');
  assert(/blocker/.test(r.reason), 'has blocker reason');
  assert(/violations/.test(r.reason), 'has violations reason');
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
