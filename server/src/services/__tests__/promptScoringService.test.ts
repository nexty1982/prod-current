#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptScoringService.js (OMD-980)
 *
 * Tests the pure deterministic helpers:
 *   - calculateScore(prompt) — quality scoring formula
 *   - deriveConfidence(qualityScore, rollingScore) — confidence level
 *   - calculateRollingScore(chainHistory) — moving avg (NOT exported,
 *     reachable via main flow only — skipped)
 *   - detectDegradation(chainHistory, currentScore) — trend analysis
 *   - checkEscalation(score, violationCount, blockerCount, degraded)
 *   - Constant exports: SCORING, CONFIDENCE_THRESHOLDS, DEGRADATION,
 *     ESCALATION
 *
 * The DB-touching methods (scorePrompt, getScore, etc.) are out of scope.
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

// Stub config/db so we don't try to connect on require
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => ({ query: async () => [[]] }) },
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

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ──────────────────────────────────────────');

assertEq(SCORING.BASE, 100, 'SCORING.BASE');
assertEq(SCORING.VIOLATION_PENALTY, 15, 'VIOLATION_PENALTY');
assertEq(SCORING.ISSUE_PENALTY, 8, 'ISSUE_PENALTY');
assertEq(SCORING.BLOCKER_PENALTY, 20, 'BLOCKER_PENALTY');
assertEq(CONFIDENCE_THRESHOLDS.HIGH, 85, 'HIGH threshold');
assertEq(CONFIDENCE_THRESHOLDS.MEDIUM, 60, 'MEDIUM threshold');
assertEq(DEGRADATION.SCORE_DROP_THRESHOLD, 10, 'score drop threshold');
assertEq(ESCALATION.SCORE_THRESHOLD, 60, 'escalation score threshold');

// ============================================================================
// calculateScore — base case (no violations, success)
// ============================================================================
console.log('\n── calculateScore: base ───────────────────────────────');

const perfect = calculateScore({
  violations_found: '[]',
  issues_found: '[]',
  blockers_found: '[]',
  completion_status: 'success',
  evaluator_status: 'pass',
});
assertEq(perfect.quality_score, 100, 'perfect → 100');
assertEq(perfect.violation_count, 0, '0 violations');
assertEq(perfect.issue_count, 0, '0 issues');
assertEq(perfect.blocker_count, 0, '0 blockers');
assertEq(perfect.breakdown, [], 'empty breakdown');

// Missing JSON arrays → treated as empty
const empty = calculateScore({
  completion_status: 'success',
  evaluator_status: 'pass',
});
assertEq(empty.quality_score, 100, 'no JSON arrays → 100');
assertEq(empty.violation_count, 0, '0 violations');

// ============================================================================
// calculateScore — penalties
// ============================================================================
console.log('\n── calculateScore: penalties ──────────────────────────');

// 1 violation = -15
const oneViolation = calculateScore({
  violations_found: '[{"id":1}]',
  completion_status: 'success',
  evaluator_status: 'pass',
});
assertEq(oneViolation.quality_score, 85, '1 violation → 85');
assertEq(oneViolation.violation_count, 1, 'count');
assertEq(oneViolation.breakdown.length, 1, '1 breakdown entry');
assertEq(oneViolation.breakdown[0].factor, 'violations', 'factor');
assertEq(oneViolation.breakdown[0].penalty, -15, 'penalty -15');

// 2 issues = -16
const twoIssues = calculateScore({
  issues_found: '[{"x":1},{"x":2}]',
  completion_status: 'success',
  evaluator_status: 'pass',
});
assertEq(twoIssues.quality_score, 84, '2 issues → 100-16=84');

// 1 blocker = -20
const oneBlocker = calculateScore({
  blockers_found: '[{"x":1}]',
  completion_status: 'success',
  evaluator_status: 'pass',
});
assertEq(oneBlocker.quality_score, 80, '1 blocker → 80');

// Combined: 1 violation + 2 issues + 1 blocker = -51 = 49
const combined = calculateScore({
  violations_found: '[{}]',
  issues_found: '[{},{}]',
  blockers_found: '[{}]',
  completion_status: 'success',
  evaluator_status: 'pass',
});
assertEq(combined.quality_score, 49, 'combined → 49');
assertEq(combined.violation_count, 1, '1 violation counted');
assertEq(combined.issue_count, 2, '2 issues counted');
assertEq(combined.blocker_count, 1, '1 blocker counted');

// ============================================================================
// calculateScore — completion status penalties
// ============================================================================
console.log('\n── calculateScore: completion ─────────────────────────');

const partial = calculateScore({
  completion_status: 'partial',
  evaluator_status: 'pass',
});
assertEq(partial.quality_score, 85, 'partial → -15 → 85');

const failedComp = calculateScore({
  completion_status: 'failed',
  evaluator_status: 'pass',
});
assertEq(failedComp.quality_score, 70, 'failed → -30 → 70');

const blockedComp = calculateScore({
  completion_status: 'blocked',
  evaluator_status: 'pass',
});
assertEq(blockedComp.quality_score, 75, 'blocked → -25 → 75');

// ============================================================================
// calculateScore — evaluator status
// ============================================================================
console.log('\n── calculateScore: evaluator ──────────────────────────');

const evalFail = calculateScore({
  completion_status: 'success',
  evaluator_status: 'fail',
});
assertEq(evalFail.quality_score, 80, 'evaluator fail → -20 → 80');

const evalPending = calculateScore({
  completion_status: 'success',
  evaluator_status: 'pending',
});
assertEq(evalPending.quality_score, 95, 'pending → -5 → 95');

const evalNull = calculateScore({
  completion_status: 'success',
});
assertEq(evalNull.quality_score, 95, 'no evaluator → -5 → 95');

// ============================================================================
// calculateScore — floor at 0, cap at 100
// ============================================================================
console.log('\n── calculateScore: bounds ─────────────────────────────');

// 10 blockers = -200 → floored at 0
const overload = calculateScore({
  blockers_found: JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ i }))),
  completion_status: 'failed',
  evaluator_status: 'fail',
});
assertEq(overload.quality_score, 0, 'huge penalty → 0 (floor)');

// ============================================================================
// calculateScore — JSON parsing edge cases
// ============================================================================
console.log('\n── calculateScore: JSON parsing ───────────────────────');

// Already-parsed array
const parsedArray = calculateScore({
  violations_found: [{ id: 1 }, { id: 2 }],
  completion_status: 'success',
  evaluator_status: 'pass',
});
assertEq(parsedArray.violation_count, 2, 'array passes through');
assertEq(parsedArray.quality_score, 70, '2 violations → 70');

// Non-array JSON → 0
const nonArray = calculateScore({
  violations_found: '{"x":1}',
  completion_status: 'success',
  evaluator_status: 'pass',
});
assertEq(nonArray.violation_count, 0, 'non-array → 0');

// Malformed JSON → 0
const bad = calculateScore({
  violations_found: '{not json',
  completion_status: 'success',
  evaluator_status: 'pass',
});
assertEq(bad.violation_count, 0, 'malformed → 0');

// ============================================================================
// deriveConfidence
// ============================================================================
console.log('\n── deriveConfidence ───────────────────────────────────');

assertEq(deriveConfidence(null, null), 'unknown', 'null score → unknown');
assertEq(deriveConfidence(undefined, null), 'unknown', 'undefined → unknown');
assertEq(deriveConfidence(100, null), 'high', '100 → high');
assertEq(deriveConfidence(85, null), 'high', '85 (boundary) → high');
assertEq(deriveConfidence(84, null), 'medium', '84 → medium');
assertEq(deriveConfidence(60, null), 'medium', '60 (boundary) → medium');
assertEq(deriveConfidence(59, null), 'low', '59 → low');
assertEq(deriveConfidence(0, null), 'low', '0 → low');

// Rolling score considered (worse of current and rolling)
assertEq(deriveConfidence(90, 50), 'low', 'high current, low rolling → low (use min)');
assertEq(deriveConfidence(50, 95), 'low', 'low current, high rolling → low (use min)');
assertEq(deriveConfidence(90, 80), 'medium', 'min(90,80)=80 → medium');
assertEq(deriveConfidence(95, 85), 'high', 'min(95,85)=85 → high');

// ============================================================================
// detectDegradation
// ============================================================================
console.log('\n── detectDegradation ──────────────────────────────────');

// Empty/short chain → not degraded
assertEq(
  detectDegradation([], 100),
  { degraded: false, reasons: [] },
  'empty chain → not degraded'
);
assertEq(
  detectDegradation([
    { quality_score: 90, violation_count: 0 },
    { quality_score: 85, violation_count: 0 },
  ], 80),
  { degraded: false, reasons: [] },
  '2 steps → not enough for trend'
);

// Score declining 10+ points over 3 steps → degraded
const declining = detectDegradation([
  { quality_score: 95, violation_count: 0 },
  { quality_score: 88, violation_count: 0 },
  { quality_score: 80, violation_count: 0 },
], 80);
assertEq(declining.degraded, true, '95→80 declining over 3 → degraded');
assert(declining.reasons[0].includes('declined 15'), 'reason includes decline amount');

// Score declining only 5 points → NOT degraded (also fails low_score check at <50)
// 95→90→90 only declines 5
const minorDecline = detectDegradation([
  { quality_score: 95, violation_count: 0 },
  { quality_score: 92, violation_count: 0 },
  { quality_score: 90, violation_count: 0 },
], 90);
assertEq(minorDecline.degraded, false, '5pt decline → not degraded');

// 2+ consecutive steps with violations → degraded
const consecViol = detectDegradation([
  { quality_score: 80, violation_count: 0 },
  { quality_score: 75, violation_count: 1 },
  { quality_score: 70, violation_count: 2 },
], 70);
assertEq(consecViol.degraded, true, '2 consecutive violations → degraded');
const violReason = consecViol.reasons.find((r: string) => r.includes('consecutive'));
assert(violReason !== undefined, 'reason mentions consecutive violations');

// 2+ steps below 50 → degraded
const lowScore = detectDegradation([
  { quality_score: 60, violation_count: 0 },
  { quality_score: 45, violation_count: 0 },
  { quality_score: 40, violation_count: 0 },
], 40);
assertEq(lowScore.degraded, true, '2 steps below 50 → degraded');
const lowReason = lowScore.reasons.find((r: string) => r.includes('below 50'));
assert(lowReason !== undefined, 'reason mentions below 50');

// Skips null quality_score entries
const withNulls = detectDegradation([
  { quality_score: 95, violation_count: 0 },
  { quality_score: null, violation_count: 0 },
  { quality_score: 80, violation_count: 0 },
], 80);
// Only 2 scored entries → < MIN_STEPS_FOR_TREND → not degraded
assertEq(withNulls.degraded, false, 'null entries skipped');

// ============================================================================
// checkEscalation
// ============================================================================
console.log('\n── checkEscalation ────────────────────────────────────');

// All clear
assertEq(
  checkEscalation(80, 0, 0, false),
  { required: false, reason: '' },
  'clean → not escalated'
);

// Score below 60
const low = checkEscalation(50, 0, 0, false);
assertEq(low.required, true, 'score 50 → escalated');
assert(low.reason.includes('below threshold'), 'reason mentions threshold');

// Boundary: exactly at threshold not escalated
const atThreshold = checkEscalation(60, 0, 0, false);
assertEq(atThreshold.required, false, 'score 60 (boundary) → not escalated');

// Degraded + score < 75
const degraded = checkEscalation(70, 0, 0, true);
assertEq(degraded.required, true, 'degraded + 70 → escalated');
assert(degraded.reason.includes('Degraded'), 'reason mentions degraded');

// Degraded + score >= 75 → not escalated
const degradedHigh = checkEscalation(80, 0, 0, true);
assertEq(degradedHigh.required, false, 'degraded but score 80 → not escalated');

// Any blocker
const blocker = checkEscalation(90, 0, 1, false);
assertEq(blocker.required, true, '1 blocker → escalated');
assert(blocker.reason.includes('blocker'), 'reason mentions blocker');

// 3+ violations in single step
const multiViol = checkEscalation(90, 3, 0, false);
assertEq(multiViol.required, true, '3 violations → escalated');
assert(multiViol.reason.includes('violations in single step'), 'reason mentions violations');

// 2 violations → not escalated by violation rule
const twoViol = checkEscalation(90, 2, 0, false);
assertEq(twoViol.required, false, '2 violations alone → not escalated');

// Multiple reasons joined with '; '
const multi = checkEscalation(40, 5, 2, true);
assertEq(multi.required, true, 'multi-reason → escalated');
const parts = multi.reason.split(';');
assert(parts.length >= 2, 'multiple reasons joined');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
