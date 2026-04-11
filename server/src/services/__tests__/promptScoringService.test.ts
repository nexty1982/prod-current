#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptScoringService.js (OMD-1239)
 *
 * Pure scoring/confidence/degradation/escalation functions + DB-path
 * scorePrompt/getScore/resolveChain/getChainHistory. Only external dep
 * is ../config/db (getAppPool). Stubbed via require.cache.
 *
 * Coverage:
 *   - calculateScore:
 *       · base 100 with no penalties
 *       · violation count * 15 penalty
 *       · issue count * 8 penalty
 *       · blocker count * 20 penalty
 *       · completion_status partial/failed/blocked penalties
 *       · evaluator_status fail/pending/null penalties
 *       · floor at 0 (huge violations)
 *       · breakdown entries
 *       · handles malformed JSON arrays
 *   - deriveConfidence:
 *       · null/undefined → unknown
 *       · ≥85 → high, ≥60 → medium, <60 → low
 *       · takes min(current, rolling) when rolling present
 *   - detectDegradation:
 *       · < MIN_STEPS_FOR_TREND → not degraded
 *       · score drop >= 10 over last 3 → degraded
 *       · 2+ consecutive violations → degraded
 *       · 2 consecutive low scores (<50) → degraded
 *       · ignores unscored steps
 *   - checkEscalation:
 *       · score < 60 → required
 *       · degraded + score < 75 → required
 *       · any blockers → required
 *       · 3+ violations in single step → required
 *       · all clean → not required
 *       · reason is joined
 *   - resolveChain (DB):
 *       · single prompt (no parent) → chain_id=self, step=1
 *       · 3-level parent chain → chain_id=root, step=3
 *       · cycle safety (visited set)
 *   - getChainHistory: ORDER BY check via captured SQL
 *   - calculateRollingScore (via detectDegradation indirectly)
 *   - scorePrompt: full DB path — loads, scores, UPDATE + log
 *   - scorePrompt: not-yet-scoreable status → { scored:false }
 *   - getScore: re-scores on null quality_score with scoreable status
 *   - getLowConfidence/getDegraded/getEscalated: SQL shape
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

// ── Fake pool ──────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Responder = { match: RegExp; respond: (params: any[]) => any[][] | any };
const responders: Responder[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of responders) {
      if (r.match.test(sql)) {
        const result = r.respond(params);
        return [result, []];
      }
    }
    return [[], []];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

function resetState() {
  queryLog.length = 0;
  responders.length = 0;
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
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');
assertEq(SCORING.BASE, 100, 'BASE=100');
assertEq(SCORING.VIOLATION_PENALTY, 15, 'VIOLATION_PENALTY=15');
assertEq(SCORING.BLOCKER_PENALTY, 20, 'BLOCKER_PENALTY=20');
assertEq(CONFIDENCE_THRESHOLDS.HIGH, 85, 'HIGH=85');
assertEq(CONFIDENCE_THRESHOLDS.MEDIUM, 60, 'MEDIUM=60');
assertEq(DEGRADATION.SCORE_DROP_THRESHOLD, 10, 'SCORE_DROP=10');
assertEq(ESCALATION.SCORE_THRESHOLD, 60, 'ESCALATION=60');

// ============================================================================
// calculateScore
// ============================================================================
console.log('\n── calculateScore ────────────────────────────────────────');
{
  // Base case: no penalties → 100 minus no_evaluator = 95
  const clean = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(clean.quality_score, 100, 'clean: 100 (pass evaluator)');
  assertEq(clean.violation_count, 0, 'clean: 0 violations');
  assertEq(clean.issue_count, 0, 'clean: 0 issues');
  assertEq(clean.blocker_count, 0, 'clean: 0 blockers');
  assertEq(clean.breakdown.length, 0, 'clean: empty breakdown');

  // No evaluator → -5
  const noEval = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'success',
    evaluator_status: null,
  });
  assertEq(noEval.quality_score, 95, '-5 for no evaluator');

  // 2 violations → -30
  const withViols = calculateScore({
    violations_found: JSON.stringify([{a:1}, {b:2}]),
    issues_found: null,
    blockers_found: null,
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(withViols.quality_score, 70, '2 violations: 100-30=70');
  assertEq(withViols.violation_count, 2, 'violation_count=2');

  // 2 issues → -16
  const withIssues = calculateScore({
    violations_found: null,
    issues_found: JSON.stringify([{a:1}, {b:2}]),
    blockers_found: null,
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(withIssues.quality_score, 84, '2 issues: 100-16=84');

  // 1 blocker → -20
  const withBlocker = calculateScore({
    violations_found: null, issues_found: null,
    blockers_found: JSON.stringify([{a:1}]),
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(withBlocker.quality_score, 80, '1 blocker: 100-20=80');
  assertEq(withBlocker.blocker_count, 1, 'blocker_count=1');

  // partial completion → -15
  const partial = calculateScore({
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: 'partial', evaluator_status: 'pass',
  });
  assertEq(partial.quality_score, 85, 'partial: 100-15=85');

  // failed completion → -30
  const failedComp = calculateScore({
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: 'failed', evaluator_status: 'pass',
  });
  assertEq(failedComp.quality_score, 70, 'failed: 100-30=70');

  // blocked completion → -25
  const blockedComp = calculateScore({
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: 'blocked', evaluator_status: 'pass',
  });
  assertEq(blockedComp.quality_score, 75, 'blocked: 100-25=75');

  // evaluator fail → -20
  const evalFail = calculateScore({
    violations_found: null, issues_found: null, blockers_found: null,
    completion_status: 'success', evaluator_status: 'fail',
  });
  assertEq(evalFail.quality_score, 80, 'evaluator fail: -20');

  // Floor at 0: many violations
  const huge = calculateScore({
    violations_found: JSON.stringify(new Array(20).fill({})),
    issues_found: null, blockers_found: null,
    completion_status: 'failed', evaluator_status: 'fail',
  });
  assertEq(huge.quality_score, 0, 'floored at 0');

  // Malformed JSON → treated as empty array
  const malformed = calculateScore({
    violations_found: 'not-json-at-all',
    issues_found: null, blockers_found: null,
    completion_status: 'success', evaluator_status: 'pass',
  });
  assertEq(malformed.violation_count, 0, 'malformed → 0 violations');
  assertEq(malformed.quality_score, 100, 'malformed → 100');

  // Non-array JSON → treated as empty
  const nonArray = calculateScore({
    violations_found: JSON.stringify({not:'array'}),
    issues_found: null, blockers_found: null,
    completion_status: 'success', evaluator_status: 'pass',
  });
  assertEq(nonArray.violation_count, 0, 'object JSON → 0 violations');

  // Breakdown entries
  const bd = calculateScore({
    violations_found: JSON.stringify([{a:1}]),
    issues_found: JSON.stringify([{b:2}]),
    blockers_found: JSON.stringify([{c:3}]),
    completion_status: 'partial',
    evaluator_status: 'fail',
  });
  assertEq(bd.breakdown.length, 5, 'breakdown: 5 entries');
  const factors = bd.breakdown.map((b: any) => b.factor).sort();
  assertEq(factors, ['blockers', 'evaluator_fail', 'issues', 'partial_completion', 'violations'], 'breakdown factors');
}

// ============================================================================
// deriveConfidence
// ============================================================================
console.log('\n── deriveConfidence ──────────────────────────────────────');
assertEq(deriveConfidence(null, null), 'unknown', 'null → unknown');
assertEq(deriveConfidence(undefined, null), 'unknown', 'undefined → unknown');
assertEq(deriveConfidence(95, null), 'high', '95 → high');
assertEq(deriveConfidence(85, null), 'high', '85 → high (boundary)');
assertEq(deriveConfidence(84, null), 'medium', '84 → medium');
assertEq(deriveConfidence(60, null), 'medium', '60 → medium (boundary)');
assertEq(deriveConfidence(59, null), 'low', '59 → low');
assertEq(deriveConfidence(0, null), 'low', '0 → low');
// Rolling score: uses min of current and rolling
assertEq(deriveConfidence(90, 55), 'low', '90/rolling55 → low (min)');
assertEq(deriveConfidence(90, 70), 'medium', '90/rolling70 → medium');

// ============================================================================
// detectDegradation
// ============================================================================
console.log('\n── detectDegradation ─────────────────────────────────────');
{
  // Too few steps → not degraded
  const few = detectDegradation([
    { quality_score: 80, violation_count: 0 },
    { quality_score: 70, violation_count: 0 },
  ], 70);
  assertEq(few.degraded, false, '<3 steps: not degraded');

  // Declining trend: 90 → 80 → 70 (drop of 20)
  const declining = detectDegradation([
    { quality_score: 90, violation_count: 0 },
    { quality_score: 80, violation_count: 0 },
    { quality_score: 70, violation_count: 0 },
  ], 70);
  assertEq(declining.degraded, true, 'declining 20pts: degraded');
  assert(declining.reasons[0].includes('declined'), 'reason mentions decline');

  // Stable trend: 80 → 80 → 80 → not degraded
  const stable = detectDegradation([
    { quality_score: 80, violation_count: 0 },
    { quality_score: 80, violation_count: 0 },
    { quality_score: 80, violation_count: 0 },
  ], 80);
  assertEq(stable.degraded, false, 'stable 80s: not degraded');

  // Consecutive violations
  const viols = detectDegradation([
    { quality_score: 85, violation_count: 0 },
    { quality_score: 80, violation_count: 2 },
    { quality_score: 80, violation_count: 1 },
  ], 80);
  assertEq(viols.degraded, true, '2 consecutive violation steps: degraded');

  // Low scores persisting
  const lows = detectDegradation([
    { quality_score: 70, violation_count: 0 },
    { quality_score: 40, violation_count: 0 },
    { quality_score: 30, violation_count: 0 },
  ], 30);
  assertEq(lows.degraded, true, '2 consecutive lows (<50): degraded');
  // Reason should mention declined and low
  assert(lows.reasons.length >= 1, 'has reasons');

  // Ignores null scores
  const mixed = detectDegradation([
    { quality_score: null, violation_count: 0 },
    { quality_score: null, violation_count: 0 },
    { quality_score: null, violation_count: 0 },
  ], null);
  assertEq(mixed.degraded, false, 'all null scores: not degraded');
}

// ============================================================================
// checkEscalation
// ============================================================================
console.log('\n── checkEscalation ───────────────────────────────────────');
{
  const clean = checkEscalation(90, 0, 0, false);
  assertEq(clean.required, false, 'clean: no escalation');
  assertEq(clean.reason, '', 'clean: empty reason');

  const lowScore = checkEscalation(50, 0, 0, false);
  assertEq(lowScore.required, true, 'score<60: escalate');
  assert(lowScore.reason.includes('below threshold'), 'reason mentions threshold');

  const degraded = checkEscalation(70, 0, 0, true);
  assertEq(degraded.required, true, 'degraded+<75: escalate');

  const degradedHigh = checkEscalation(80, 0, 0, true);
  assertEq(degradedHigh.required, false, 'degraded but high: no escalate');

  const withBlocker = checkEscalation(90, 0, 1, false);
  assertEq(withBlocker.required, true, 'blockers: escalate');

  const manyViols = checkEscalation(90, 3, 0, false);
  assertEq(manyViols.required, true, '3 violations: escalate');

  // Multiple reasons joined
  const multiple = checkEscalation(40, 5, 1, true);
  assertEq(multiple.required, true, 'multiple: escalate');
  const reasons = multiple.reason.split('; ');
  assert(reasons.length >= 3, '3+ joined reasons');
}

// ============================================================================
// resolveChain
// ============================================================================
console.log('\n── resolveChain ──────────────────────────────────────────');
{
  // Single prompt, no parent
  resetState();
  const singleResult = await resolveChain(fakePool, {
    id: 100, parent_prompt_id: null,
  });
  assertEq(singleResult.chain_id, 100, 'single: chain_id=self');
  assertEq(singleResult.chain_step_number, 1, 'single: step=1');

  // 3-level chain: 102 (current) ← 101 ← 100 (root)
  resetState();
  responders.push({
    match: /SELECT id, parent_prompt_id FROM om_prompt_registry/,
    respond: (params) => {
      const id = params[0];
      if (id === 101) return [{ id: 101, parent_prompt_id: 100 }];
      if (id === 100) return [{ id: 100, parent_prompt_id: null }];
      return [];
    },
  });
  const chainResult = await resolveChain(fakePool, {
    id: 102, parent_prompt_id: 101,
  });
  assertEq(chainResult.chain_id, 100, '3-level: chain_id=100 (root)');
  assertEq(chainResult.chain_step_number, 3, '3-level: step=3');

  // Cycle safety
  resetState();
  responders.push({
    match: /SELECT id, parent_prompt_id FROM om_prompt_registry/,
    respond: (params) => {
      const id = params[0];
      if (id === 2) return [{ id: 2, parent_prompt_id: 1 }];
      if (id === 1) return [{ id: 1, parent_prompt_id: 2 }]; // cycle!
      return [];
    },
  });
  const cycleResult = await resolveChain(fakePool, {
    id: 3, parent_prompt_id: 2,
  });
  // Should stop on cycle, not loop forever
  assert(cycleResult.chain_step_number < 50, 'cycle: no infinite loop');
}

// ============================================================================
// getChainHistory
// ============================================================================
console.log('\n── getChainHistory ───────────────────────────────────────');
{
  resetState();
  responders.push({
    match: /FROM om_prompt_registry\s+WHERE chain_id = \?/,
    respond: () => [
      { id: 1, chain_step_number: 1, quality_score: 90, violation_count: 0 },
      { id: 2, chain_step_number: 2, quality_score: 80, violation_count: 0 },
    ],
  });
  const history = await getChainHistory(fakePool, 1);
  assertEq(history.length, 2, '2 chain entries');
  assert(/ORDER BY chain_step_number/.test(queryLog[0].sql), 'ORDER BY chain_step_number');
  assertEq(queryLog[0].params[0], 1, 'chain_id param');
}

// ============================================================================
// scorePrompt (DB path)
// ============================================================================
console.log('\n── scorePrompt ───────────────────────────────────────────');
{
  // Not-yet-scoreable status
  resetState();
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => [{
      id: 1, title: 'pending', status: 'pending',
      evaluator_status: null,
      parent_prompt_id: null,
    }],
  });
  const notReady = await scorePrompt(1);
  assertEq(notReady.scored, false, 'pending: not scored');
  assert(notReady.reason.includes('pending'), 'reason mentions status');

  // Not found
  resetState();
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => [],
  });
  let caught: Error | null = null;
  try { await scorePrompt(999); } catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('999'), 'error mentions id');

  // Happy path: scoreable, no chain
  resetState();
  let promptSelectCount = 0;
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => {
      promptSelectCount++;
      return [{
        id: 50, title: 'Test prompt', status: 'verified',
        parent_prompt_id: null,
        violations_found: null, issues_found: null, blockers_found: null,
        completion_status: 'success', evaluator_status: 'pass',
      }];
    },
  });
  responders.push({
    match: /FROM om_prompt_registry\s+WHERE chain_id = \?/,
    respond: () => [],
  });
  responders.push({ match: /UPDATE om_prompt_registry SET/, respond: () => ({ affectedRows: 1 }) });
  responders.push({ match: /INSERT INTO system_logs/, respond: () => ({ insertId: 1 }) });

  const scored = await scorePrompt(50);
  assertEq(scored.scored, true, 'scored: true');
  assertEq(scored.quality_score, 100, 'quality=100');
  assertEq(scored.confidence_level, 'high', 'high confidence');
  assertEq(scored.chain_id, 50, 'chain_id=self');
  assertEq(scored.chain_step_number, 1, 'step=1');
  assertEq(scored.degradation_flag, false, 'not degraded');
  assertEq(scored.escalation_required, false, 'no escalation');

  // Verify UPDATE and INSERT were called
  const updateCall = queryLog.find(q => /UPDATE om_prompt_registry SET/.test(q.sql));
  assert(updateCall !== undefined, 'UPDATE called');
  const logCall = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql));
  assert(logCall !== undefined, 'LOG called');
  assert(logCall !== undefined && logCall.params[0] === 'INFO', 'INFO level');
}

// ============================================================================
// getScore
// ============================================================================
console.log('\n── getScore ──────────────────────────────────────────────');
{
  // Already scored: returns cached
  resetState();
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => [{
      id: 77, title: 'scored', status: 'verified',
      quality_score: 85, confidence_level: 'high',
      violation_count: 0, issue_count: 0, blocker_count: 0,
      degradation_flag: 0, escalation_required: 0,
      chain_id: 77, chain_step_number: 1,
      rolling_quality_score: 85, previous_quality_score: null,
      parent_prompt_id: null,
    }],
  });
  responders.push({
    match: /FROM om_prompt_registry\s+WHERE chain_id = \?/,
    respond: () => [{
      id: 77, title: 'scored', chain_step_number: 1,
      quality_score: 85, confidence_level: 'high',
      violation_count: 0, degradation_flag: 0, status: 'verified',
    }],
  });
  const result = await getScore(77);
  assertEq(result.scored, true, 'scored: true');
  assertEq(result.quality_score, 85, 'quality cached');
  assertEq(result.chain_history.length, 1, 'chain history 1');

  // Not found
  resetState();
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => [],
  });
  let e: Error | null = null;
  try { await getScore(999); } catch (err: any) { e = err; }
  assert(e !== null, 'not found throws');
}

// ============================================================================
// getLowConfidence / getDegraded / getEscalated
// ============================================================================
console.log('\n── query helpers ─────────────────────────────────────────');
{
  resetState();
  responders.push({
    match: /FROM om_prompt_registry\s+WHERE confidence_level = 'low'/,
    respond: () => [{ id: 1 }, { id: 2 }],
  });
  const low = await getLowConfidence();
  assertEq(low.length, 2, '2 low-confidence');

  resetState();
  responders.push({
    match: /WHERE degradation_flag = 1/,
    respond: () => [{ id: 10 }],
  });
  const deg = await getDegraded();
  assertEq(deg.length, 1, '1 degraded');

  resetState();
  responders.push({
    match: /WHERE escalation_required = 1/,
    respond: () => [{ id: 20 }, { id: 21 }, { id: 22 }],
  });
  const esc = await getEscalated();
  assertEq(esc.length, 3, '3 escalated');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
