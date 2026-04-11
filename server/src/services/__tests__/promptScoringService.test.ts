#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptScoringService.js (OMD-1020)
 *
 * Covers pure functions + DB-orchestrated functions:
 *   - calculateScore: base/violations/issues/blockers/completion/evaluator
 *     penalties, floor at 0, cap at 100
 *   - deriveConfidence: high/medium/low thresholds, unknown, rolling worse-case
 *   - detectDegradation: min-steps guard, score drop, consecutive violations,
 *     persistent low score, multi-reason aggregation
 *   - checkEscalation: score threshold, degraded-with-score, blockers,
 *     max-violations, multi-reason aggregation
 *   - resolveChain: single prompt, multi-level chain walk, cycle safety
 *   - getChainHistory, getLowConfidence, getDegraded, getEscalated: query shape
 *   - scorePrompt: not-found throw, unscoreable early-return, happy path UPDATE
 *     + INSERT into system_logs, escalation WARN level
 *   - getScore: not-found throw, auto-score path, already-scored returns cached
 *
 * Stubs ../config/db via require.cache, fake pool with regex-routed responses.
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

// ── Fake pool ─────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Route = { match: RegExp; rows?: any; throws?: Error };
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        return [r.rows !== undefined ? r.rows : []];
      }
    }
    // Default UPDATE/INSERT response
    return [{ affectedRows: 1 }];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

function resetState() {
  queryLog.length = 0;
  routes = [];
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
console.log('\n── Constants ────────────────────────────────────────────');

assertEq(SCORING.BASE, 100, 'BASE = 100');
assertEq(SCORING.VIOLATION_PENALTY, 15, 'violation penalty');
assertEq(SCORING.BLOCKER_PENALTY, 20, 'blocker penalty');
assertEq(CONFIDENCE_THRESHOLDS.HIGH, 85, 'HIGH threshold');
assertEq(CONFIDENCE_THRESHOLDS.MEDIUM, 60, 'MEDIUM threshold');
assertEq(DEGRADATION.SCORE_DROP_THRESHOLD, 10, 'score drop threshold');
assertEq(ESCALATION.SCORE_THRESHOLD, 60, 'escalation threshold');

// ============================================================================
// calculateScore
// ============================================================================
console.log('\n── calculateScore ───────────────────────────────────────');

// Perfect run (evaluated, no issues)
{
  const r = calculateScore({
    violations_found: '[]',
    issues_found: '[]',
    blockers_found: '[]',
    completion_status: 'completed',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 100, 'perfect = 100');
  assertEq(r.violation_count, 0, '0 violations');
  assertEq(r.breakdown.length, 0, 'no breakdown');
}

// 1 violation only
{
  const r = calculateScore({
    violations_found: '[{"t":"v1"}]',
    completion_status: 'completed',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 85, '100 - 15 = 85');
  assertEq(r.violation_count, 1, '1 violation');
  assertEq(r.breakdown[0].factor, 'violations', 'breakdown factor');
  assertEq(r.breakdown[0].penalty, -15, 'breakdown penalty');
}

// Mix: 2 violations + 1 issue + partial + no evaluator
// 100 - 30 - 8 - 15 - 5 = 42
{
  const r = calculateScore({
    violations_found: '[{"t":1},{"t":2}]',
    issues_found: '[{"t":1}]',
    completion_status: 'partial',
    evaluator_status: null,
  });
  assertEq(r.quality_score, 42, '100-30-8-15-5=42');
  assertEq(r.violation_count, 2, '2 violations');
  assertEq(r.issue_count, 1, '1 issue');
}

// Floor at 0
{
  const r = calculateScore({
    violations_found: '[1,2,3,4,5,6,7,8,9,10]',  // -150
    blockers_found: '[1,2,3]',                     // -60
    completion_status: 'failed',                    // -30
    evaluator_status: 'fail',                       // -20
  });
  assertEq(r.quality_score, 0, 'floored at 0');
}

// Already-parsed array input
{
  const r = calculateScore({
    violations_found: [{ t: 'a' }, { t: 'b' }],
    completion_status: 'completed',
    evaluator_status: 'pass',
  });
  assertEq(r.violation_count, 2, 'array input works');
  assertEq(r.quality_score, 70, '100 - 30 = 70');
}

// Malformed JSON → treated as empty
{
  const r = calculateScore({
    violations_found: 'not json',
    completion_status: 'completed',
    evaluator_status: 'pass',
  });
  assertEq(r.violation_count, 0, 'malformed → 0');
  assertEq(r.quality_score, 100, 'malformed → no penalty');
}

// Blocked completion
{
  const r = calculateScore({
    completion_status: 'blocked',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 75, '100 - 25 blocked');
}

// Evaluator fail
{
  const r = calculateScore({
    completion_status: 'completed',
    evaluator_status: 'fail',
  });
  assertEq(r.quality_score, 80, '100 - 20 eval fail');
}

// Pending evaluator = no evaluator (-5)
{
  const r = calculateScore({
    completion_status: 'completed',
    evaluator_status: 'pending',
  });
  assertEq(r.quality_score, 95, '100 - 5 no evaluator');
}

// ============================================================================
// deriveConfidence
// ============================================================================
console.log('\n── deriveConfidence ─────────────────────────────────────');

assertEq(deriveConfidence(null, null), 'unknown', 'null score → unknown');
assertEq(deriveConfidence(undefined, null), 'unknown', 'undefined → unknown');
assertEq(deriveConfidence(100, null), 'high', '100 → high');
assertEq(deriveConfidence(85, null), 'high', '85 → high (boundary)');
assertEq(deriveConfidence(84, null), 'medium', '84 → medium');
assertEq(deriveConfidence(60, null), 'medium', '60 → medium (boundary)');
assertEq(deriveConfidence(59, null), 'low', '59 → low');
assertEq(deriveConfidence(0, null), 'low', '0 → low');

// Rolling worse-case: uses Math.min(score, rolling)
assertEq(deriveConfidence(90, 70), 'medium', '90 score but 70 rolling → medium');
assertEq(deriveConfidence(50, 90), 'low', '50 score beats 90 rolling → low');
assertEq(deriveConfidence(90, 90), 'high', 'both high → high');

// ============================================================================
// detectDegradation
// ============================================================================
console.log('\n── detectDegradation ────────────────────────────────────');

// < 3 scored steps → not degraded
{
  const history = [
    { quality_score: 50, violation_count: 0 },
    { quality_score: 40, violation_count: 0 },
  ];
  const r = detectDegradation(history, 30);
  assertEq(r.degraded, false, '<3 steps → not degraded');
  assertEq(r.reasons, [], 'no reasons');
}

// Score drop ≥ 10
{
  const history = [
    { quality_score: 90, violation_count: 0 },
    { quality_score: 80, violation_count: 0 },
    { quality_score: 75, violation_count: 0 },
  ];
  const r = detectDegradation(history, 75);
  assertEq(r.degraded, true, 'score dropped ≥ 10');
  assert(r.reasons[0].includes('declined'), 'mentions decline');
}

// Consecutive violations
{
  const history = [
    { quality_score: 80, violation_count: 0 },
    { quality_score: 75, violation_count: 2 },
    { quality_score: 70, violation_count: 3 },
  ];
  const r = detectDegradation(history, 70);
  assertEq(r.degraded, true, 'consecutive violations flagged');
  assert(
    r.reasons.some((x: string) => x.includes('consecutive steps with violations')),
    'mentions consecutive'
  );
}

// Persistent low score
{
  const history = [
    { quality_score: 80, violation_count: 0 },
    { quality_score: 40, violation_count: 0 },
    { quality_score: 30, violation_count: 0 },
  ];
  const r = detectDegradation(history, 30);
  assertEq(r.degraded, true, 'persistent low score');
  // Both "declined" (80→30=50) and "below 50" reasons should fire
  assert(r.reasons.length >= 2, 'multiple reasons');
}

// null quality_scores filtered out
{
  const history = [
    { quality_score: null, violation_count: 0 },
    { quality_score: null, violation_count: 0 },
    { quality_score: 80, violation_count: 0 },
    { quality_score: 70, violation_count: 0 },
  ];
  const r = detectDegradation(history, 70);
  // Only 2 scored < MIN_STEPS_FOR_TREND
  assertEq(r.degraded, false, 'null scores filtered');
}

// ============================================================================
// checkEscalation
// ============================================================================
console.log('\n── checkEscalation ──────────────────────────────────────');

// Clean: no escalation
{
  const r = checkEscalation(90, 0, 0, false);
  assertEq(r.required, false, 'clean → no escalation');
  assertEq(r.reason, '', 'empty reason');
}

// Low score
{
  const r = checkEscalation(50, 0, 0, false);
  assertEq(r.required, true, 'score < 60');
  assert(r.reason.includes('below threshold'), 'mentions threshold');
}

// Degraded with moderate score
{
  const r = checkEscalation(70, 0, 0, true);
  assertEq(r.required, true, 'degraded + <75');
  assert(r.reason.includes('Degraded'), 'mentions degraded');
}

// Degraded with high score → not escalated
{
  const r = checkEscalation(80, 0, 0, true);
  assertEq(r.required, false, 'degraded but ≥75 → no escalation');
}

// Blockers
{
  const r = checkEscalation(90, 0, 2, false);
  assertEq(r.required, true, 'blockers trigger');
  assert(r.reason.includes('blocker'), 'mentions blockers');
}

// 3+ violations in single step
{
  const r = checkEscalation(90, 3, 0, false);
  assertEq(r.required, true, '3+ violations trigger');
  assert(r.reason.includes('violations in single step'), 'mentions violations');
}

// Multiple reasons joined
{
  const r = checkEscalation(40, 5, 2, true);
  assertEq(r.required, true, 'multi-reason escalation');
  assert(r.reason.includes(';'), 'reasons semicolon-joined');
  assert(r.reason.split(';').length >= 3, '3+ reasons');
}

// ============================================================================
// resolveChain
// ============================================================================
console.log('\n── resolveChain ─────────────────────────────────────────');

// Single prompt (no parent)
resetState();
{
  const r = await resolveChain(fakePool, { id: 5, parent_prompt_id: null });
  assertEq(r.chain_id, 5, 'own id');
  assertEq(r.chain_step_number, 1, 'step 1');
  assertEq(queryLog.length, 0, 'no queries');
}

// 2-level chain
resetState();
routes = [
  {
    match: /SELECT id, parent_prompt_id FROM om_prompt_registry/i,
    rows: [{ id: 10, parent_prompt_id: null }],
  },
];
{
  const r = await resolveChain(fakePool, { id: 11, parent_prompt_id: 10 });
  assertEq(r.chain_id, 10, 'root = 10');
  assertEq(r.chain_step_number, 2, 'step 2');
}

// Cycle protection — parent points back to self
resetState();
let callCount = 0;
routes = [
  {
    match: /SELECT id, parent_prompt_id FROM om_prompt_registry/i,
    get rows() {
      callCount++;
      // Always return same parent → would loop forever without visited set
      return [{ id: 20, parent_prompt_id: 21 }];
    },
  } as any,
];
{
  const r = await resolveChain(fakePool, { id: 21, parent_prompt_id: 20 });
  // Should terminate safely
  assert(r.chain_step_number <= 50, 'bounded by max depth');
}

// ============================================================================
// getChainHistory + simple queries
// ============================================================================
console.log('\n── getChainHistory / low-confidence / degraded ──────────');

resetState();
routes = [
  {
    match: /FROM om_prompt_registry[\s\S]*WHERE chain_id/i,
    rows: [
      { id: 1, chain_step_number: 1, quality_score: 90 },
      { id: 2, chain_step_number: 2, quality_score: 80 },
    ],
  },
];
{
  const r = await getChainHistory(fakePool, 1);
  assertEq(r.length, 2, '2 steps');
  assertEq(queryLog[0].params[0], 1, 'chainId param');
}

resetState();
routes = [
  { match: /WHERE confidence_level = 'low'/i, rows: [{ id: 1 }, { id: 2 }] },
];
{
  const r = await getLowConfidence();
  assertEq(r.length, 2, '2 low-confidence');
}

resetState();
routes = [
  { match: /WHERE degradation_flag = 1/i, rows: [{ id: 5 }] },
];
{
  const r = await getDegraded();
  assertEq(r.length, 1, '1 degraded');
}

resetState();
routes = [
  { match: /WHERE escalation_required = 1/i, rows: [{ id: 7 }] },
];
{
  const r = await getEscalated();
  assertEq(r.length, 1, '1 escalated');
}

// ============================================================================
// scorePrompt — not found
// ============================================================================
console.log('\n── scorePrompt: not found ───────────────────────────────');

resetState();
routes = [
  { match: /SELECT \* FROM om_prompt_registry WHERE id/i, rows: [] },
];
{
  let caught: Error | null = null;
  try {
    await scorePrompt(999);
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('not found'), 'error message');
}

// ============================================================================
// scorePrompt — unscoreable (early return)
// ============================================================================
console.log('\n── scorePrompt: unscoreable ─────────────────────────────');

resetState();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id/i,
    rows: [{
      id: 1, status: 'draft', evaluator_status: null,
    }],
  },
];
{
  const r = await scorePrompt(1);
  assertEq(r.scored, false, 'not scored');
  assert(r.reason.includes('draft'), 'reason mentions status');
  // No UPDATE or INSERT should have run
  const updates = queryLog.filter(q => /UPDATE om_prompt_registry/i.test(q.sql));
  assertEq(updates.length, 0, 'no UPDATE');
  const inserts = queryLog.filter(q => /INSERT INTO system_logs/i.test(q.sql));
  assertEq(inserts.length, 0, 'no log insert');
}

// ============================================================================
// scorePrompt — happy path, no escalation
// ============================================================================
console.log('\n── scorePrompt: happy path ──────────────────────────────');

resetState();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id/i,
    rows: [{
      id: 10,
      title: 'Clean prompt',
      status: 'complete',
      evaluator_status: 'pass',
      violations_found: '[]',
      issues_found: '[]',
      blockers_found: '[]',
      completion_status: 'completed',
      parent_prompt_id: null,
    }],
  },
  {
    // getChainHistory returns just this prompt
    match: /FROM om_prompt_registry[\s\S]*WHERE chain_id/i,
    rows: [],
  },
];
{
  const r = await scorePrompt(10);
  assertEq(r.scored, true, 'scored');
  assertEq(r.quality_score, 100, 'perfect score');
  assertEq(r.confidence_level, 'high', 'high confidence');
  assertEq(r.escalation_required, false, 'no escalation');
  // UPDATE + INSERT log
  const updates = queryLog.filter(q => /UPDATE om_prompt_registry/i.test(q.sql));
  assertEq(updates.length, 1, '1 UPDATE');
  const logs = queryLog.filter(q => /INSERT INTO system_logs/i.test(q.sql));
  assertEq(logs.length, 1, '1 system_logs INSERT');
  // Log level = INFO (not escalated)
  assertEq(logs[0].params[0], 'INFO', 'log level INFO');
}

// ============================================================================
// scorePrompt — escalation path
// ============================================================================
console.log('\n── scorePrompt: escalation ──────────────────────────────');

resetState();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id/i,
    rows: [{
      id: 20,
      title: 'Bad prompt',
      status: 'complete',
      evaluator_status: 'fail',
      violations_found: '[1,2,3,4]',   // 4 violations → -60
      issues_found: '[]',
      blockers_found: '[1]',           // 1 blocker → -20
      completion_status: 'failed',     // -30
      parent_prompt_id: null,
    }],
  },
  { match: /FROM om_prompt_registry[\s\S]*WHERE chain_id/i, rows: [] },
];
{
  const r = await scorePrompt(20);
  assertEq(r.scored, true, 'scored');
  // 100 - 60 - 20 - 30 - 20(eval fail) = -30 → floored to 0
  assertEq(r.quality_score, 0, 'floored to 0');
  assertEq(r.confidence_level, 'low', 'low confidence');
  assertEq(r.escalation_required, true, 'escalation required');
  // Log level should be WARN
  const logs = queryLog.filter(q => /INSERT INTO system_logs/i.test(q.sql));
  assertEq(logs[0].params[0], 'WARN', 'WARN level on escalation');
}

// ============================================================================
// getScore — not found
// ============================================================================
console.log('\n── getScore: not found ──────────────────────────────────');

resetState();
routes = [
  { match: /SELECT \* FROM om_prompt_registry WHERE id/i, rows: [] },
];
{
  let caught: Error | null = null;
  try {
    await getScore(99);
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
}

// ============================================================================
// getScore — already scored (cached return)
// ============================================================================
console.log('\n── getScore: cached ─────────────────────────────────────');

resetState();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id/i,
    rows: [{
      id: 30,
      title: 'Already scored',
      status: 'complete',
      quality_score: 80,
      confidence_level: 'medium',
      violation_count: 1,
      issue_count: 0,
      blocker_count: 0,
      degradation_flag: 0,
      escalation_required: 0,
      escalation_reason: null,
      chain_id: 30,
      chain_step_number: 1,
      rolling_quality_score: 80,
      previous_quality_score: null,
    }],
  },
  { match: /FROM om_prompt_registry[\s\S]*WHERE chain_id/i, rows: [] },
];
{
  const r = await getScore(30);
  assertEq(r.scored, true, 'scored = true');
  assertEq(r.quality_score, 80, 'quality_score from cache');
  assertEq(r.confidence_level, 'medium', 'confidence cached');
  assertEq(r.degradation_flag, false, 'degradation coerced to bool');
  assertEq(r.escalation_required, false, 'escalation coerced to bool');
  // Should NOT trigger a re-score UPDATE
  const updates = queryLog.filter(q => /UPDATE om_prompt_registry/i.test(q.sql));
  assertEq(updates.length, 0, 'no UPDATE (cached)');
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
