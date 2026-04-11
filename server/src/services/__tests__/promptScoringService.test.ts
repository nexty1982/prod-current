#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptScoringService.js pure functions
 *
 * Focus: the deterministic scoring + derivation functions. Async DB functions
 * (scorePrompt, getScore, getLowConfidence, getDegraded, getEscalated,
 *  resolveChain, getChainHistory) are out of scope for this suite — they
 * require a real-ish DB fixture and belong in an integration test.
 *
 * Stubs `../config/db` (getAppPool) with a no-op to keep `require`
 * from actually pulling db config.
 *
 * Coverage:
 *   - Exported constants (SCORING, CONFIDENCE_THRESHOLDS, DEGRADATION, ESCALATION)
 *   - calculateScore
 *       · base 100
 *       · violations/issues/blockers count penalties
 *       · completion status penalties (partial/failed/blocked)
 *       · evaluator status (fail / pending / missing / pass)
 *       · floor at 0, cap at 100
 *       · breakdown array populated only when a penalty applies
 *       · violations_found JSON parsing (string & array & null & malformed)
 *   - deriveConfidence
 *       · null/undefined → unknown
 *       · high/medium/low thresholds
 *       · worst-of rolling vs current
 *       · exact boundary (85, 60)
 *   - detectDegradation
 *       · below min steps → not degraded
 *       · score drop trigger
 *       · consecutive violations trigger
 *       · persistent low score trigger
 *       · filters out null quality_scores
 *       · multiple reasons
 *   - checkEscalation
 *       · score < 60
 *       · degraded AND score < 75
 *       · blockers > 0
 *       · violations >= 3 in single step
 *       · multiple reasons joined with "; "
 *       · clean → not required
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

// ── Stub ../config/db before requiring SUT ─────────────────────────
const dbStub = { getAppPool: () => ({ query: async () => [[]] }) };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

const svc = require('../promptScoringService');
const {
  calculateScore,
  deriveConfidence,
  detectDegradation,
  checkEscalation,
  SCORING,
  CONFIDENCE_THRESHOLDS,
  DEGRADATION,
  ESCALATION,
} = svc;

async function main() {

// ============================================================================
// Exported constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(SCORING.BASE, 100, 'SCORING.BASE');
assertEq(SCORING.VIOLATION_PENALTY, 15, 'violation penalty');
assertEq(SCORING.ISSUE_PENALTY, 8, 'issue penalty');
assertEq(SCORING.BLOCKER_PENALTY, 20, 'blocker penalty');
assertEq(SCORING.PARTIAL_COMPLETION_PENALTY, 15, 'partial completion');
assertEq(SCORING.FAILED_COMPLETION_PENALTY, 30, 'failed completion');
assertEq(SCORING.BLOCKED_COMPLETION_PENALTY, 25, 'blocked completion');
assertEq(SCORING.EVALUATOR_FAIL_PENALTY, 20, 'evaluator fail');
assertEq(SCORING.NO_EVALUATOR_PENALTY, 5, 'no evaluator');

assertEq(CONFIDENCE_THRESHOLDS.HIGH, 85, 'HIGH threshold');
assertEq(CONFIDENCE_THRESHOLDS.MEDIUM, 60, 'MEDIUM threshold');

assertEq(DEGRADATION.SCORE_DROP_THRESHOLD, 10, 'score drop');
assertEq(DEGRADATION.MIN_STEPS_FOR_TREND, 3, 'min steps');
assertEq(DEGRADATION.CONSECUTIVE_VIOLATIONS, 2, 'consecutive viols');
assertEq(DEGRADATION.LOW_SCORE_THRESHOLD, 50, 'low score threshold');
assertEq(DEGRADATION.LOW_SCORE_STEPS, 2, 'low score steps');

assertEq(ESCALATION.SCORE_THRESHOLD, 60, 'escalation score');
assertEq(ESCALATION.DEGRADED_SCORE_THRESHOLD, 75, 'degraded escalation');
assertEq(ESCALATION.MAX_VIOLATIONS_SINGLE_STEP, 3, 'max viols');

// ============================================================================
// calculateScore — base cases
// ============================================================================
console.log('\n── calculateScore: base & perfect ────────────────────────');

// Perfect: no violations/issues/blockers, complete status, evaluator pass
{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 100, 'perfect → 100');
  assertEq(r.violation_count, 0, '0 violations');
  assertEq(r.issue_count, 0, '0 issues');
  assertEq(r.blocker_count, 0, '0 blockers');
  assertEq(r.breakdown, [], 'empty breakdown');
}

// ============================================================================
// calculateScore — violations
// ============================================================================
console.log('\n── calculateScore: violations ────────────────────────────');

// 1 violation → -15 = 85
{
  const r = calculateScore({
    violations_found: '["style"]',
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 85, '1 violation → 85');
  assertEq(r.violation_count, 1, '1 counted');
  assertEq(r.breakdown[0].factor, 'violations', 'breakdown factor');
  assertEq(r.breakdown[0].count, 1, 'breakdown count');
  assertEq(r.breakdown[0].penalty, -15, 'breakdown penalty');
}

// 3 violations → -45 = 55
{
  const r = calculateScore({
    violations_found: '["a","b","c"]',
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 55, '3 violations → 55');
  assertEq(r.violation_count, 3, '3 counted');
}

// Array input (not string)
{
  const r = calculateScore({
    violations_found: ['a', 'b'],
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 70, 'array input → 70');
}

// Malformed JSON → empty
{
  const r = calculateScore({
    violations_found: '{not json',
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 100, 'malformed → 0 viols → 100');
  assertEq(r.violation_count, 0, 'malformed → 0 count');
}

// Non-array JSON → empty
{
  const r = calculateScore({
    violations_found: '{"not":"array"}',
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.violation_count, 0, 'non-array JSON → 0 count');
}

// ============================================================================
// calculateScore — issues
// ============================================================================
console.log('\n── calculateScore: issues ────────────────────────────────');

{
  const r = calculateScore({
    issues_found: '["x","y"]',
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 84, '2 issues → 100 - 16 = 84');
  assertEq(r.issue_count, 2, 'counted');
  assertEq(r.breakdown[0].factor, 'issues', 'breakdown factor');
}

// ============================================================================
// calculateScore — blockers
// ============================================================================
console.log('\n── calculateScore: blockers ──────────────────────────────');

{
  const r = calculateScore({
    blockers_found: '["db-down"]',
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 80, '1 blocker → 80');
  assertEq(r.blocker_count, 1, 'counted');
}

// ============================================================================
// calculateScore — completion status
// ============================================================================
console.log('\n── calculateScore: completion status ─────────────────────');

// partial → -15
{
  const r = calculateScore({ completion_status: 'partial', evaluator_status: 'pass' });
  assertEq(r.quality_score, 85, 'partial → 85');
}

// failed → -30
{
  const r = calculateScore({ completion_status: 'failed', evaluator_status: 'pass' });
  assertEq(r.quality_score, 70, 'failed → 70');
}

// blocked → -25
{
  const r = calculateScore({ completion_status: 'blocked', evaluator_status: 'pass' });
  assertEq(r.quality_score, 75, 'blocked → 75');
}

// complete → no penalty
{
  const r = calculateScore({ completion_status: 'complete', evaluator_status: 'pass' });
  assertEq(r.quality_score, 100, 'complete → 100');
}

// ============================================================================
// calculateScore — evaluator status
// ============================================================================
console.log('\n── calculateScore: evaluator status ──────────────────────');

// fail → -20
{
  const r = calculateScore({ completion_status: 'complete', evaluator_status: 'fail' });
  assertEq(r.quality_score, 80, 'fail → 80');
}

// pending → -5 (unknown quality)
{
  const r = calculateScore({ completion_status: 'complete', evaluator_status: 'pending' });
  assertEq(r.quality_score, 95, 'pending → 95');
}

// missing (undefined) → -5
{
  const r = calculateScore({ completion_status: 'complete' });
  assertEq(r.quality_score, 95, 'missing → 95');
}

// null → -5
{
  const r = calculateScore({ completion_status: 'complete', evaluator_status: null });
  assertEq(r.quality_score, 95, 'null → 95');
}

// pass → no penalty
{
  const r = calculateScore({ completion_status: 'complete', evaluator_status: 'pass' });
  assertEq(r.quality_score, 100, 'pass → 100');
}

// ============================================================================
// calculateScore — floor & cap
// ============================================================================
console.log('\n── calculateScore: floor & cap ───────────────────────────');

// Disaster: many blockers → below zero → floor at 0
{
  const r = calculateScore({
    violations_found: '["a","b","c","d"]', // -60
    issues_found: '["x","y"]',              // -16
    blockers_found: '["p","q","r"]',        // -60
    completion_status: 'failed',             // -30
    evaluator_status: 'fail',                // -20
  });
  assertEq(r.quality_score, 0, 'disaster → 0 (floored)');
  assertEq(r.violation_count, 4, 'still counts viols');
  assertEq(r.issue_count, 2, 'still counts issues');
  assertEq(r.blocker_count, 3, 'still counts blockers');
}

// ============================================================================
// calculateScore — combined
// ============================================================================
console.log('\n── calculateScore: combined ──────────────────────────────');

// Realistic: 1 viol + 1 issue + partial + pending
{
  const r = calculateScore({
    violations_found: '["x"]',
    issues_found: '["y"]',
    completion_status: 'partial',
    evaluator_status: 'pending',
  });
  // 100 - 15 - 8 - 15 - 5 = 57
  assertEq(r.quality_score, 57, 'combined = 57');
  assertEq(r.breakdown.length, 4, '4 breakdown items');
}

// ============================================================================
// deriveConfidence
// ============================================================================
console.log('\n── deriveConfidence ──────────────────────────────────────');

assertEq(deriveConfidence(null), 'unknown', 'null → unknown');
assertEq(deriveConfidence(undefined), 'unknown', 'undefined → unknown');
assertEq(deriveConfidence(100), 'high', '100 → high');
assertEq(deriveConfidence(85), 'high', '85 exact → high');
assertEq(deriveConfidence(84), 'medium', '84 → medium');
assertEq(deriveConfidence(60), 'medium', '60 exact → medium');
assertEq(deriveConfidence(59), 'low', '59 → low');
assertEq(deriveConfidence(0), 'low', '0 → low');

// Rolling worse than current
assertEq(deriveConfidence(95, 70), 'medium', 'rolling 70 (worse) → medium');
// Current worse than rolling
assertEq(deriveConfidence(40, 90), 'low', 'current 40 (worse) → low');
// Rolling null → use current
assertEq(deriveConfidence(95, null), 'high', 'rolling null → use current');
// Rolling undefined → use current
assertEq(deriveConfidence(95, undefined), 'high', 'rolling undefined → use current');
// Rolling equal
assertEq(deriveConfidence(85, 85), 'high', 'both 85 → high');
// Rolling triggers demotion to medium at boundary
assertEq(deriveConfidence(85, 84), 'medium', 'rolling 84 → demote to medium');

// ============================================================================
// detectDegradation
// ============================================================================
console.log('\n── detectDegradation: not enough data ────────────────────');

// Empty chain
{
  const r = detectDegradation([], 90);
  assertEq(r, { degraded: false, reasons: [] }, 'empty → not degraded');
}

// Below min steps (1 scored)
{
  const r = detectDegradation([{ quality_score: 80, violation_count: 0 }], 70);
  assertEq(r.degraded, false, '1 step → not degraded');
}

// 2 scored (still below min=3)
{
  const r = detectDegradation([
    { quality_score: 90, violation_count: 0 },
    { quality_score: 85, violation_count: 0 },
  ], 80);
  assertEq(r.degraded, false, '2 steps → not degraded');
}

// Filters out null quality_scores
{
  const r = detectDegradation([
    { quality_score: 90, violation_count: 0 },
    { quality_score: null, violation_count: 0 },
    { quality_score: 85, violation_count: 0 },
  ], 80);
  assertEq(r.degraded, false, 'nulls filtered, only 2 scored → not degraded');
}

console.log('\n── detectDegradation: score drop ─────────────────────────');

// 90 → 80 → 70: drop of 20 ≥ 10
{
  const r = detectDegradation([
    { quality_score: 90, violation_count: 0 },
    { quality_score: 80, violation_count: 0 },
    { quality_score: 70, violation_count: 0 },
  ], 70);
  assertEq(r.degraded, true, 'score drop → degraded');
  assert(r.reasons.some((s: string) => /declined 20 points/.test(s)), 'declined 20 reason');
}

// 80 → 85 → 75: first=80, last=75, drop=5, below threshold
{
  const r = detectDegradation([
    { quality_score: 80, violation_count: 0 },
    { quality_score: 85, violation_count: 0 },
    { quality_score: 75, violation_count: 0 },
  ], 75);
  // Drop of 5 is below threshold of 10 → that particular reason not triggered
  // but nothing else triggers either → not degraded
  assertEq(r.degraded, false, 'drop 5 → not degraded');
}

// Exactly at threshold: drop = 10
{
  const r = detectDegradation([
    { quality_score: 90, violation_count: 0 },
    { quality_score: 85, violation_count: 0 },
    { quality_score: 80, violation_count: 0 },
  ], 80);
  assertEq(r.degraded, true, 'drop exactly 10 → degraded');
}

console.log('\n── detectDegradation: consecutive violations ─────────────');

// 3 steps, last 2 (slice(-3)) have violations → but code uses CONSECUTIVE_VIOLATIONS + 1 = 3
// slice(-3) gives last 3; we need ≥ 2 with violations → degraded
{
  const r = detectDegradation([
    { quality_score: 80, violation_count: 0 },
    { quality_score: 75, violation_count: 2 },
    { quality_score: 70, violation_count: 1 },
  ], 70);
  assertEq(r.degraded, true, '2 consecutive viols → degraded');
  assert(r.reasons.some((s: string) => /consecutive steps with violations/.test(s)), 'consec reason');
}

console.log('\n── detectDegradation: persistent low score ───────────────');

// Last 2 have score < 50
{
  const r = detectDegradation([
    { quality_score: 80, violation_count: 0 },
    { quality_score: 40, violation_count: 0 },
    { quality_score: 30, violation_count: 0 },
  ], 30);
  assertEq(r.degraded, true, 'persistent low → degraded');
  assert(r.reasons.some((s: string) => /below 50/.test(s)), 'low-score reason');
}

// Exactly at threshold boundary (strict <)
{
  const r = detectDegradation([
    { quality_score: 80, violation_count: 0 },
    { quality_score: 50, violation_count: 0 },
    { quality_score: 50, violation_count: 0 },
  ], 50);
  // 50 is NOT below 50 (strict), so low-score not triggered
  // Also 80→50 drop=30 → score drop IS triggered
  assertEq(r.degraded, true, '50 boundary, but score drop triggers');
}

console.log('\n── detectDegradation: multiple reasons ───────────────────');

{
  const r = detectDegradation([
    { quality_score: 85, violation_count: 0 },
    { quality_score: 45, violation_count: 3 },
    { quality_score: 30, violation_count: 2 },
  ], 30);
  assertEq(r.degraded, true, 'multi → degraded');
  assert(r.reasons.length >= 2, 'multiple reasons');
}

// ============================================================================
// checkEscalation
// ============================================================================
console.log('\n── checkEscalation ───────────────────────────────────────');

// Clean: high score, no issues → not required
{
  const r = checkEscalation(90, 0, 0, false);
  assertEq(r.required, false, 'clean → not required');
  assertEq(r.reason, '', 'empty reason');
}

// Score below 60
{
  const r = checkEscalation(59, 0, 0, false);
  assertEq(r.required, true, 'score 59 → required');
  assert(/below threshold/.test(r.reason), 'score reason');
}

// Score exactly 60 → NOT below (strict)
{
  const r = checkEscalation(60, 0, 0, false);
  assertEq(r.required, false, 'score 60 exact → not required');
}

// Degraded + score < 75
{
  const r = checkEscalation(70, 0, 0, true);
  assertEq(r.required, true, 'degraded + 70 → required');
  assert(/Degraded chain/.test(r.reason), 'degraded reason');
}

// Degraded but score high (>= 75)
{
  const r = checkEscalation(80, 0, 0, true);
  assertEq(r.required, false, 'degraded but 80 → not required');
}

// Blockers > 0
{
  const r = checkEscalation(90, 0, 1, false);
  assertEq(r.required, true, 'blocker → required');
  assert(/blocker\(s\) found/.test(r.reason), 'blocker reason');
}

// Violations >= 3
{
  const r = checkEscalation(90, 3, 0, false);
  assertEq(r.required, true, '3 violations → required');
  assert(/violations in single step/.test(r.reason), 'violations reason');
}

// Violations = 2 → not required
{
  const r = checkEscalation(90, 2, 0, false);
  assertEq(r.required, false, '2 viols → not required');
}

// Multiple triggers: reasons joined with "; "
{
  const r = checkEscalation(50, 5, 2, true);
  assertEq(r.required, true, 'all triggers → required');
  // Should have 4 reasons: below threshold, degraded, blockers, viols
  const parts = r.reason.split('; ');
  assertEq(parts.length, 4, '4 reasons joined');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main()

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
