#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptScoringService.js (OMD-1144)
 *
 * Deterministic quality scoring + chain/degradation/escalation tracking.
 * One external dep: `../config/db.getAppPool`.
 *
 * Strategy: stub db via require.cache with a route-dispatch fake pool
 * that matches SQL patterns and returns scripted responses. Silence
 * console output during flows that log.
 *
 * Coverage:
 *   Pure functions:
 *     - calculateScore: base, violations, issues, blockers, completion,
 *                       evaluator states, floor at 0, breakdown shape,
 *                       parseJsonArray (string/array/invalid/null)
 *     - deriveConfidence: thresholds, null→unknown, rollingScore min logic
 *     - detectDegradation: <3 not degraded, score drop, consecutive
 *                          violations, persistent low, filters nulls
 *     - checkEscalation: each trigger + combined reasons string
 *   Async functions:
 *     - resolveChain: walks parents, cycle safety, depth cap
 *     - getChainHistory: SELECT with chain_id
 *     - scorePrompt: not found throws; status gate; full happy path
 *     - getScore: not found throws; auto-score when null+complete;
 *                 returns chain_history
 *     - getLowConfidence / getDegraded / getEscalated: SELECT dispatch
 *   Exports:
 *     - SCORING, CONFIDENCE_THRESHOLDS, DEGRADATION, ESCALATION constants
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

// ── Fake pool ────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

// Scriptable responses
let promptRows: Record<number, any> = {};      // id → prompt row (for SELECT by id)
let chainRowsMap: Record<number, any[]> = {};  // chain_id → ordered history rows
let lowConfidenceRows: any[] = [];
let degradedRows: any[] = [];
let escalatedRows: any[] = [];
let throwOnPattern: RegExp | null = null;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });

    if (throwOnPattern && throwOnPattern.test(sql)) {
      throw new Error('fake db failure');
    }

    // resolveChain parent lookup: SELECT id, parent_prompt_id FROM om_prompt_registry WHERE id = ?
    if (/SELECT id, parent_prompt_id FROM om_prompt_registry WHERE id = \?/i.test(sql)) {
      const row = promptRows[params[0]];
      return [row ? [{ id: row.id, parent_prompt_id: row.parent_prompt_id ?? null }] : []];
    }

    // getChainHistory
    if (/FROM om_prompt_registry\s+WHERE chain_id = \?/i.test(sql)) {
      return [chainRowsMap[params[0]] || []];
    }

    // SELECT * by id (scorePrompt / getScore)
    if (/SELECT \* FROM om_prompt_registry WHERE id = \?/i.test(sql)) {
      const row = promptRows[params[0]];
      return [row ? [row] : []];
    }

    // getLowConfidence
    if (/WHERE confidence_level = 'low'/i.test(sql)) {
      return [lowConfidenceRows];
    }

    // getDegraded
    if (/WHERE degradation_flag = 1/i.test(sql)) {
      return [degradedRows];
    }

    // getEscalated
    if (/WHERE escalation_required = 1/i.test(sql)) {
      return [escalatedRows];
    }

    // UPDATE om_prompt_registry
    if (/^\s*UPDATE om_prompt_registry/i.test(sql)) {
      return [{ affectedRows: 1 }];
    }

    // INSERT INTO system_logs
    if (/^\s*INSERT INTO system_logs/i.test(sql)) {
      return [{ insertId: 1 }];
    }

    return [[]];
  },
};

const dbStub = {
  getAppPool: () => fakePool,
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

function resetState() {
  queryLog.length = 0;
  promptRows = {};
  chainRowsMap = {};
  lowConfidenceRows = [];
  degradedRows = [];
  escalatedRows = [];
  throwOnPattern = null;
}

// Silence noisy logs
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function loud() {
  console.log = origLog;
  console.warn = origWarn;
  console.error = origError;
}

const {
  calculateScore,
  deriveConfidence,
  resolveChain,
  detectDegradation,
  checkEscalation,
  scorePrompt,
  getScore,
  getLowConfidence,
  getDegraded,
  getEscalated,
  getChainHistory,
  SCORING,
  CONFIDENCE_THRESHOLDS,
  DEGRADATION,
  ESCALATION,
} = require('../promptScoringService');

async function main() {

// ============================================================================
// Exported constants
// ============================================================================
console.log('\n── Exported constants ────────────────────────────────────');

assertEq(SCORING.BASE, 100, 'SCORING.BASE');
assertEq(SCORING.VIOLATION_PENALTY, 15, 'SCORING.VIOLATION_PENALTY');
assertEq(SCORING.ISSUE_PENALTY, 8, 'SCORING.ISSUE_PENALTY');
assertEq(SCORING.BLOCKER_PENALTY, 20, 'SCORING.BLOCKER_PENALTY');
assertEq(SCORING.PARTIAL_COMPLETION_PENALTY, 15, 'SCORING.PARTIAL_COMPLETION_PENALTY');
assertEq(SCORING.FAILED_COMPLETION_PENALTY, 30, 'SCORING.FAILED_COMPLETION_PENALTY');
assertEq(SCORING.BLOCKED_COMPLETION_PENALTY, 25, 'SCORING.BLOCKED_COMPLETION_PENALTY');
assertEq(SCORING.EVALUATOR_FAIL_PENALTY, 20, 'SCORING.EVALUATOR_FAIL_PENALTY');
assertEq(SCORING.NO_EVALUATOR_PENALTY, 5, 'SCORING.NO_EVALUATOR_PENALTY');

assertEq(CONFIDENCE_THRESHOLDS.HIGH, 85, 'CONFIDENCE_THRESHOLDS.HIGH');
assertEq(CONFIDENCE_THRESHOLDS.MEDIUM, 60, 'CONFIDENCE_THRESHOLDS.MEDIUM');

assertEq(DEGRADATION.SCORE_DROP_THRESHOLD, 10, 'DEGRADATION.SCORE_DROP_THRESHOLD');
assertEq(DEGRADATION.MIN_STEPS_FOR_TREND, 3, 'DEGRADATION.MIN_STEPS_FOR_TREND');
assertEq(DEGRADATION.CONSECUTIVE_VIOLATIONS, 2, 'DEGRADATION.CONSECUTIVE_VIOLATIONS');
assertEq(DEGRADATION.LOW_SCORE_THRESHOLD, 50, 'DEGRADATION.LOW_SCORE_THRESHOLD');
assertEq(DEGRADATION.LOW_SCORE_STEPS, 2, 'DEGRADATION.LOW_SCORE_STEPS');

assertEq(ESCALATION.SCORE_THRESHOLD, 60, 'ESCALATION.SCORE_THRESHOLD');
assertEq(ESCALATION.DEGRADED_SCORE_THRESHOLD, 75, 'ESCALATION.DEGRADED_SCORE_THRESHOLD');
assertEq(ESCALATION.MAX_VIOLATIONS_SINGLE_STEP, 3, 'ESCALATION.MAX_VIOLATIONS_SINGLE_STEP');

// ============================================================================
// calculateScore — base cases
// ============================================================================
console.log('\n── calculateScore: base ──────────────────────────────────');

// Evaluator pass, no violations/issues/blockers, no completion penalty → 100
{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 100, 'clean prompt → 100');
  assertEq(r.violation_count, 0, 'no violations');
  assertEq(r.issue_count, 0, 'no issues');
  assertEq(r.blocker_count, 0, 'no blockers');
  assertEq(r.breakdown, [], 'empty breakdown');
}

// No evaluator run → -5
{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: null,
  });
  assertEq(r.quality_score, 95, 'no evaluator → 95');
  assertEq(r.breakdown.length, 1, '1 breakdown entry');
  assertEq(r.breakdown[0].factor, 'no_evaluator', 'no_evaluator factor');
  assertEq(r.breakdown[0].penalty, -5, 'no_evaluator penalty');
}

// Evaluator pending → -5
{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'pending',
  });
  assertEq(r.quality_score, 95, 'pending evaluator → 95');
}

// Evaluator fail → -20
{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'fail',
  });
  assertEq(r.quality_score, 80, 'evaluator fail → 80');
  assertEq(r.breakdown[0].factor, 'evaluator_fail', 'evaluator_fail factor');
  assertEq(r.breakdown[0].penalty, -20, 'evaluator_fail penalty');
}

// ============================================================================
// calculateScore — violations
// ============================================================================
console.log('\n── calculateScore: violations ────────────────────────────');

{
  const r = calculateScore({
    violations_found: ['v1'],
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 85, '1 violation → 85');
  assertEq(r.violation_count, 1, '1 violation');
  assertEq(r.breakdown[0].factor, 'violations', 'violations factor');
  assertEq(r.breakdown[0].count, 1, 'violation count');
  assertEq(r.breakdown[0].penalty, -15, 'violation penalty');
}

{
  const r = calculateScore({
    violations_found: ['v1', 'v2', 'v3'],
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 55, '3 violations → 55');
  assertEq(r.violation_count, 3, '3 violations counted');
}

// Violations as JSON string
{
  const r = calculateScore({
    violations_found: JSON.stringify(['v1', 'v2']),
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 70, 'JSON string violations parsed');
  assertEq(r.violation_count, 2, 'violation count from string');
}

// Invalid JSON string → treated as empty
{
  const r = calculateScore({
    violations_found: 'not json',
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 100, 'invalid JSON → 0 violations');
  assertEq(r.violation_count, 0, 'invalid JSON yields no count');
}

// Non-array JSON → treated as empty
{
  const r = calculateScore({
    violations_found: JSON.stringify({ not: 'array' }),
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.violation_count, 0, 'non-array JSON → 0 violations');
}

// ============================================================================
// calculateScore — issues
// ============================================================================
console.log('\n── calculateScore: issues ────────────────────────────────');

{
  const r = calculateScore({
    violations_found: null,
    issues_found: ['i1', 'i2'],
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 84, '2 issues → 84');
  assertEq(r.issue_count, 2, '2 issues');
  assertEq(r.breakdown[0].factor, 'issues', 'issues factor');
  assertEq(r.breakdown[0].penalty, -16, 'issues penalty');
}

// ============================================================================
// calculateScore — blockers
// ============================================================================
console.log('\n── calculateScore: blockers ──────────────────────────────');

{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: ['b1'],
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 80, '1 blocker → 80');
  assertEq(r.blocker_count, 1, '1 blocker');
  assertEq(r.breakdown[0].factor, 'blockers', 'blockers factor');
  assertEq(r.breakdown[0].penalty, -20, 'blocker penalty');
}

// ============================================================================
// calculateScore — completion status
// ============================================================================
console.log('\n── calculateScore: completion status ─────────────────────');

{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'partial',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 85, 'partial → 85');
  assert(r.breakdown.some((b: any) => b.factor === 'partial_completion'), 'partial_completion in breakdown');
}

{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'failed',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 70, 'failed → 70');
  assert(r.breakdown.some((b: any) => b.factor === 'failed_completion'), 'failed_completion in breakdown');
}

{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'blocked',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 75, 'blocked → 75');
  assert(r.breakdown.some((b: any) => b.factor === 'blocked_completion'), 'blocked_completion in breakdown');
}

// ============================================================================
// calculateScore — floor at 0
// ============================================================================
console.log('\n── calculateScore: floor at 0 ────────────────────────────');

{
  const r = calculateScore({
    violations_found: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'],  // -120
    issues_found: ['i1', 'i2', 'i3'],          // -24
    blockers_found: ['b1', 'b2'],              // -40
    completion_status: 'failed',               // -30
    evaluator_status: 'fail',                  // -20
  });
  assertEq(r.quality_score, 0, 'massive penalties floor at 0');
  assertEq(r.violation_count, 8, '8 violations');
  assertEq(r.issue_count, 3, '3 issues');
  assertEq(r.blocker_count, 2, '2 blockers');
}

// ============================================================================
// calculateScore — combined
// ============================================================================
console.log('\n── calculateScore: combined ──────────────────────────────');

{
  const r = calculateScore({
    violations_found: ['v1'],       // -15
    issues_found: ['i1', 'i2'],     // -16
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'pending',    // -5
  });
  assertEq(r.quality_score, 64, '1v + 2i + pending → 64');
  assertEq(r.breakdown.length, 3, '3 breakdown entries');
}

// ============================================================================
// deriveConfidence
// ============================================================================
console.log('\n── deriveConfidence ──────────────────────────────────────');

assertEq(deriveConfidence(null, null), 'unknown', 'null → unknown');
assertEq(deriveConfidence(undefined, null), 'unknown', 'undefined → unknown');
assertEq(deriveConfidence(100, null), 'high', '100 → high');
assertEq(deriveConfidence(85, null), 'high', '85 boundary → high');
assertEq(deriveConfidence(84, null), 'medium', '84 → medium');
assertEq(deriveConfidence(60, null), 'medium', '60 boundary → medium');
assertEq(deriveConfidence(59, null), 'low', '59 → low');
assertEq(deriveConfidence(0, null), 'low', '0 → low');

// rollingScore uses min (worst of current/rolling)
assertEq(deriveConfidence(90, 50), 'low', 'rolling 50 drags down to low');
assertEq(deriveConfidence(90, 70), 'medium', 'rolling 70 drags to medium');
assertEq(deriveConfidence(90, 85), 'high', 'rolling 85 stays high');
assertEq(deriveConfidence(50, 95), 'low', 'current 50 still low even with rolling 95');
assertEq(deriveConfidence(85, undefined), 'high', 'undefined rolling ignored');

// ============================================================================
// detectDegradation — under minimum steps
// ============================================================================
console.log('\n── detectDegradation: under minimum ──────────────────────');

{
  const r = detectDegradation([
    { quality_score: 40, violation_count: 2 },
    { quality_score: 30, violation_count: 1 },
  ], 30);
  assertEq(r.degraded, false, '2 steps → not degraded');
  assertEq(r.reasons, [], 'no reasons');
}

// Null scores filtered
{
  const r = detectDegradation([
    { quality_score: null, violation_count: 0 },
    { quality_score: null, violation_count: 0 },
    { quality_score: null, violation_count: 0 },
  ], 50);
  assertEq(r.degraded, false, 'all nulls → not degraded');
}

// ============================================================================
// detectDegradation — score drop
// ============================================================================
console.log('\n── detectDegradation: score drop ─────────────────────────');

{
  const r = detectDegradation([
    { quality_score: 90, violation_count: 0 },
    { quality_score: 85, violation_count: 0 },
    { quality_score: 75, violation_count: 0 },
  ], 75);
  assertEq(r.degraded, true, '15pt drop → degraded');
  assert(r.reasons.some((s: string) => s.includes('declined')), 'score decline reason');
  assert(r.reasons[0].includes('90'), 'mentions first score');
  assert(r.reasons[0].includes('75'), 'mentions last score');
}

// Drop exactly at threshold
{
  const r = detectDegradation([
    { quality_score: 90, violation_count: 0 },
    { quality_score: 85, violation_count: 0 },
    { quality_score: 80, violation_count: 0 },
  ], 80);
  assertEq(r.degraded, true, '10pt drop (exact threshold) → degraded');
}

// Drop below threshold
{
  const r = detectDegradation([
    { quality_score: 90, violation_count: 0 },
    { quality_score: 88, violation_count: 0 },
    { quality_score: 82, violation_count: 0 },
  ], 82);
  assertEq(r.degraded, false, '8pt drop → not degraded');
}

// ============================================================================
// detectDegradation — consecutive violations
// ============================================================================
console.log('\n── detectDegradation: consecutive violations ─────────────');

{
  const r = detectDegradation([
    { quality_score: 85, violation_count: 0 },
    { quality_score: 80, violation_count: 1 },
    { quality_score: 75, violation_count: 2 },
  ], 75);
  assertEq(r.degraded, true, '2 consecutive violations → degraded');
  assert(r.reasons.some((s: string) => s.includes('consecutive steps with violations')), 'consecutive reason');
}

// ============================================================================
// detectDegradation — persistent low score
// ============================================================================
console.log('\n── detectDegradation: persistent low ─────────────────────');

{
  const r = detectDegradation([
    { quality_score: 80, violation_count: 0 },
    { quality_score: 40, violation_count: 0 },
    { quality_score: 30, violation_count: 0 },
  ], 30);
  assertEq(r.degraded, true, '2 steps below 50 → degraded');
  assert(r.reasons.some((s: string) => s.includes('below 50')), 'low-score reason');
}

// ============================================================================
// detectDegradation — multiple reasons combine
// ============================================================================
console.log('\n── detectDegradation: combined ───────────────────────────');

{
  const r = detectDegradation([
    { quality_score: 80, violation_count: 1 },
    { quality_score: 45, violation_count: 2 },
    { quality_score: 30, violation_count: 1 },
  ], 30);
  assertEq(r.degraded, true, 'combined triggers → degraded');
  assert(r.reasons.length >= 2, 'multiple reasons');
}

// ============================================================================
// checkEscalation
// ============================================================================
console.log('\n── checkEscalation ───────────────────────────────────────');

// No triggers
{
  const r = checkEscalation(85, 1, 0, false);
  assertEq(r.required, false, 'clean prompt → no escalation');
  assertEq(r.reason, '', 'no reason');
}

// Low score
{
  const r = checkEscalation(55, 1, 0, false);
  assertEq(r.required, true, 'score<60 → escalation');
  assert(r.reason.includes('below threshold'), 'score reason');
}

// Boundary — score exactly 60 is NOT below threshold
{
  const r = checkEscalation(60, 0, 0, false);
  assertEq(r.required, false, 'score=60 → no escalation');
}

// Degraded + score < 75
{
  const r = checkEscalation(70, 0, 0, true);
  assertEq(r.required, true, 'degraded+score<75 → escalation');
  assert(r.reason.includes('Degraded chain'), 'degraded reason');
}

// Degraded + score ≥ 75 — no degraded trigger but still no low-score trigger
{
  const r = checkEscalation(80, 0, 0, true);
  assertEq(r.required, false, 'degraded+score≥75 → no escalation');
}

// Blocker present
{
  const r = checkEscalation(90, 0, 1, false);
  assertEq(r.required, true, 'blocker → escalation');
  assert(r.reason.includes('blocker'), 'blocker reason');
}

// Multiple blockers
{
  const r = checkEscalation(90, 0, 3, false);
  assert(r.reason.includes('3 blocker'), 'reason mentions count');
}

// Violations ≥ threshold
{
  const r = checkEscalation(90, 3, 0, false);
  assertEq(r.required, true, '3 violations → escalation');
  assert(r.reason.includes('violations in single step'), 'violations reason');
}

// Violations below threshold
{
  const r = checkEscalation(90, 2, 0, false);
  assertEq(r.required, false, '2 violations → no escalation');
}

// Multiple triggers joined with semicolons
{
  const r = checkEscalation(40, 5, 2, true);
  assertEq(r.required, true, 'multiple triggers → escalation');
  assert(r.reason.split(';').length >= 3, 'multiple reasons joined');
}

// ============================================================================
// resolveChain
// ============================================================================
console.log('\n── resolveChain ──────────────────────────────────────────');

// No parent — root prompt itself
resetState();
{
  const r = await resolveChain(fakePool, { id: 10, parent_prompt_id: null });
  assertEq(r.chain_id, 10, 'self root chain_id');
  assertEq(r.chain_step_number, 1, 'depth 1');
  assertEq(queryLog.length, 0, 'no query when no parent');
}

// Simple parent chain
resetState();
promptRows = {
  5: { id: 5, parent_prompt_id: null },
  10: { id: 10, parent_prompt_id: 5 },
};
{
  const r = await resolveChain(fakePool, { id: 10, parent_prompt_id: 5 });
  assertEq(r.chain_id, 5, 'root is ancestor');
  assertEq(r.chain_step_number, 2, 'depth 2');
}

// Multi-level chain
resetState();
promptRows = {
  1: { id: 1, parent_prompt_id: null },
  2: { id: 2, parent_prompt_id: 1 },
  3: { id: 3, parent_prompt_id: 2 },
  4: { id: 4, parent_prompt_id: 3 },
};
{
  const r = await resolveChain(fakePool, { id: 4, parent_prompt_id: 3 });
  assertEq(r.chain_id, 1, 'walks to root');
  assertEq(r.chain_step_number, 4, 'depth 4');
}

// Cycle safety — parent points back to already-visited
resetState();
promptRows = {
  1: { id: 1, parent_prompt_id: 2 },
  2: { id: 2, parent_prompt_id: 1 }, // cycle
};
{
  const r = await resolveChain(fakePool, { id: 1, parent_prompt_id: 2 });
  // Walks to id=2, then tries currentId=1 which is in visited → break
  assertEq(r.chain_id, 2, 'stops at cycle');
  assertEq(r.chain_step_number, 2, 'depth 2 before cycle break');
}

// Parent not found in DB
resetState();
{
  // prompt references parent 99 which doesn't exist
  const r = await resolveChain(fakePool, { id: 10, parent_prompt_id: 99 });
  assertEq(r.chain_id, 10, 'fallback to self when parent missing');
  assertEq(r.chain_step_number, 1, 'depth stays at 1');
}

// ============================================================================
// getChainHistory
// ============================================================================
console.log('\n── getChainHistory ───────────────────────────────────────');

resetState();
chainRowsMap = {
  5: [
    { id: 5, title: 'Root', chain_step_number: 1, quality_score: 90 },
    { id: 6, title: 'Step 2', chain_step_number: 2, quality_score: 85 },
    { id: 7, title: 'Step 3', chain_step_number: 3, quality_score: 80 },
  ],
};
{
  const rows = await getChainHistory(fakePool, 5);
  assertEq(rows.length, 3, '3 rows');
  assertEq(rows[0].title, 'Root', 'first row');
  assertEq(queryLog.length, 1, 'one query');
  assert(/chain_id = \?/i.test(queryLog[0].sql), 'uses chain_id param');
  assertEq(queryLog[0].params[0], 5, 'chain_id param');
}

// Empty chain
resetState();
{
  const rows = await getChainHistory(fakePool, 999);
  assertEq(rows, [], 'empty chain returns empty array');
}

// ============================================================================
// scorePrompt — not found
// ============================================================================
console.log('\n── scorePrompt: not found ────────────────────────────────');

resetState();
{
  let caught: Error | null = null;
  try {
    await scorePrompt(999);
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'throws when not found');
  assert(caught !== null && caught.message.includes('999'), 'error includes id');
}

// ============================================================================
// scorePrompt — status gate
// ============================================================================
console.log('\n── scorePrompt: status gate ──────────────────────────────');

resetState();
promptRows = {
  100: {
    id: 100, title: 'Pending', status: 'pending', evaluator_status: null,
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: null, parent_prompt_id: null,
  },
};
{
  const r = await scorePrompt(100);
  assertEq(r.scored, false, 'not scoreable → scored=false');
  assert(r.reason.includes('pending'), 'reason mentions status');
  assertEq(r.prompt_id, 100, 'returns prompt_id');
}

// In-progress with evaluator_status → still scoreable
resetState();
promptRows = {
  101: {
    id: 101, title: 'Eval ran', status: 'in_progress', evaluator_status: 'pass',
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: 'complete', parent_prompt_id: null,
  },
};
chainRowsMap = { 101: [] };
quiet();
{
  const r = await scorePrompt(101);
  loud();
  assertEq(r.scored, true, 'evaluator_status makes scoreable');
}

// ============================================================================
// scorePrompt — full happy path
// ============================================================================
console.log('\n── scorePrompt: happy path ───────────────────────────────');

resetState();
promptRows = {
  200: {
    id: 200, title: 'Test Prompt', status: 'complete',
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: 'complete', evaluator_status: 'pass',
    parent_prompt_id: null,
  },
};
chainRowsMap = { 200: [] };
quiet();
{
  const r = await scorePrompt(200);
  loud();
  assertEq(r.scored, true, 'scored');
  assertEq(r.quality_score, 100, 'clean → 100');
  assertEq(r.confidence_level, 'high', 'high confidence');
  assertEq(r.chain_id, 200, 'chain_id is self');
  assertEq(r.chain_step_number, 1, 'step 1');
  assertEq(r.degradation_flag, false, 'not degraded');
  assertEq(r.escalation_required, false, 'no escalation');
  assert(queryLog.some(c => /^\s*UPDATE om_prompt_registry/i.test(c.sql)), 'UPDATE issued');
  assert(queryLog.some(c => /^\s*INSERT INTO system_logs/i.test(c.sql)), 'system_logs INSERT');
}

// Verified status also scoreable
resetState();
promptRows = {
  201: {
    id: 201, title: 'Verified', status: 'verified',
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: 'complete', evaluator_status: 'pass',
    parent_prompt_id: null,
  },
};
chainRowsMap = { 201: [] };
quiet();
{
  const r = await scorePrompt(201);
  loud();
  assertEq(r.scored, true, 'verified status is scoreable');
}

// Low score triggers escalation
resetState();
promptRows = {
  300: {
    id: 300, title: 'Bad', status: 'complete',
    violations_found: ['v1', 'v2'],       // -30
    issues_found: ['i1', 'i2', 'i3'],     // -24
    blockers_found: ['b1'],                // -20
    completion_status: 'failed',           // -30
    evaluator_status: 'fail',              // -20
    parent_prompt_id: null,
  },
};
chainRowsMap = { 300: [] };
quiet();
{
  const r = await scorePrompt(300);
  loud();
  assertEq(r.quality_score, 0, 'massive penalties floor at 0');
  assertEq(r.escalation_required, true, 'escalation required');
  assert(r.escalation_reason.length > 0, 'escalation reason present');
  assertEq(r.confidence_level, 'low', 'low confidence');
}

// ============================================================================
// getScore — not found
// ============================================================================
console.log('\n── getScore: not found ───────────────────────────────────');

resetState();
{
  let caught: Error | null = null;
  try {
    await getScore(999);
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'throws when not found');
}

// ============================================================================
// getScore — already scored
// ============================================================================
console.log('\n── getScore: already scored ──────────────────────────────');

resetState();
promptRows = {
  400: {
    id: 400, title: 'Scored', status: 'complete',
    quality_score: 85, confidence_level: 'high',
    violation_count: 1, issue_count: 0, blocker_count: 0,
    degradation_flag: 0, escalation_required: 0, escalation_reason: null,
    chain_id: 400, chain_step_number: 1,
    rolling_quality_score: 85, previous_quality_score: null,
  },
};
chainRowsMap = {
  400: [
    {
      id: 400, title: 'Scored', chain_step_number: 1,
      quality_score: 85, confidence_level: 'high', violation_count: 1,
      degradation_flag: 0, status: 'complete',
    },
  ],
};
{
  const r = await getScore(400);
  assertEq(r.prompt_id, 400, 'prompt_id');
  assertEq(r.scored, true, 'scored true');
  assertEq(r.quality_score, 85, 'score');
  assertEq(r.confidence_level, 'high', 'confidence');
  assertEq(r.chain_history.length, 1, 'chain_history present');
  assertEq(r.chain_history[0].step, 1, 'chain step mapped');
  assertEq(r.degradation_flag, false, 'degradation_flag boolean');
  assertEq(r.escalation_required, false, 'escalation_required boolean');
}

// ============================================================================
// getScore — auto-scores when null + complete
// ============================================================================
console.log('\n── getScore: auto-score ──────────────────────────────────');

resetState();
promptRows = {
  500: {
    id: 500, title: 'Not yet scored', status: 'complete',
    quality_score: null,
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: 'complete', evaluator_status: 'pass',
    parent_prompt_id: null,
  },
};
chainRowsMap = { 500: [] };
quiet();
{
  const r = await getScore(500);
  loud();
  // Delegated to scorePrompt → returns scored shape
  assertEq(r.scored, true, 'auto-scored');
  assertEq(r.quality_score, 100, 'computed score');
}

// ============================================================================
// getScore — no chain_id
// ============================================================================
console.log('\n── getScore: no chain ────────────────────────────────────');

resetState();
promptRows = {
  600: {
    id: 600, title: 'No chain', status: 'complete',
    quality_score: 75, confidence_level: 'medium',
    violation_count: 0, issue_count: 0, blocker_count: 0,
    degradation_flag: 0, escalation_required: 0, escalation_reason: null,
    chain_id: null, chain_step_number: null,
    rolling_quality_score: null, previous_quality_score: null,
  },
};
{
  const r = await getScore(600);
  assertEq(r.chain_history, [], 'empty chain_history when no chain_id');
}

// ============================================================================
// getLowConfidence / getDegraded / getEscalated
// ============================================================================
console.log('\n── getLowConfidence / getDegraded / getEscalated ─────────');

resetState();
lowConfidenceRows = [{ id: 1, quality_score: 40 }, { id: 2, quality_score: 50 }];
{
  const rows = await getLowConfidence();
  assertEq(rows.length, 2, 'returns low confidence rows');
  assertEq(rows[0].id, 1, 'first row');
  assert(/confidence_level = 'low'/i.test(queryLog[0].sql), 'uses confidence filter');
}

resetState();
degradedRows = [{ id: 7 }];
{
  const rows = await getDegraded();
  assertEq(rows.length, 1, 'returns degraded rows');
  assert(/degradation_flag = 1/i.test(queryLog[0].sql), 'uses degradation filter');
}

resetState();
escalatedRows = [{ id: 9 }, { id: 10 }, { id: 11 }];
{
  const rows = await getEscalated();
  assertEq(rows.length, 3, 'returns escalated rows');
  assert(/escalation_required = 1/i.test(queryLog[0].sql), 'uses escalation filter');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
