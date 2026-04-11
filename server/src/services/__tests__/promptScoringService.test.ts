#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptScoringService.js (OMD-1113)
 *
 * Deterministic scoring, confidence derivation, chain tracking,
 * degradation detection, and escalation routing. Single external dep
 * (../config/db) stubbed via require.cache BEFORE loading the SUT.
 *
 * Coverage:
 *   exports: SCORING / CONFIDENCE_THRESHOLDS / DEGRADATION / ESCALATION
 *
 *   calculateScore (pure):
 *     · clean prompt → 100 (perfect), minus no-evaluator penalty when
 *       evaluator_status is pending/null (-5)
 *     · violations (-15 each)
 *     · issues (-8 each)
 *     · blockers (-20 each)
 *     · partial completion (-15)
 *     · failed completion (-30)
 *     · blocked completion (-25)
 *     · evaluator fail (-20)
 *     · floor at 0 (many penalties)
 *     · JSON string violations/issues/blockers parsed
 *     · array passthrough
 *     · malformed JSON → [] fallback
 *     · cap at 100
 *     · breakdown entries emitted only when penalty non-zero
 *
 *   deriveConfidence (pure):
 *     · null/undefined → 'unknown'
 *     · >=85 high, 60-84 medium, <60 low
 *     · rolling worse than current → uses worse
 *     · rolling null → uses current only
 *
 *   detectDegradation (pure):
 *     · too few steps → not degraded
 *     · rolling drop >= 10 over 3+ steps → degraded
 *     · 2+ consecutive violations → degraded
 *     · 2+ steps below LOW_SCORE_THRESHOLD → degraded
 *     · stable high scores → not degraded
 *     · multiple reasons aggregated
 *
 *   checkEscalation (pure):
 *     · score >= 60, no blockers, no violations → not required
 *     · score < 60 → required
 *     · degraded + score < 75 → required
 *     · blockers > 0 → required
 *     · violations >= 3 → required
 *     · combined reasons
 *
 *   resolveChain (DB):
 *     · no parent → self is root, depth 1
 *     · walks parent chain
 *     · stops on cycle (visited set)
 *     · stops when parent not found
 *     · stops at max depth 50
 *
 *   getChainHistory: returns rows
 *
 *   scorePrompt (DB orchestration):
 *     · not found → throws
 *     · not yet scoreable → returns { scored: false }
 *     · scoreable: calculates, persists, logs, returns full result
 *     · persists escalation_reason when required, null otherwise
 *
 *   getScore:
 *     · not found → throws
 *     · unscored + status complete → calls scorePrompt
 *     · scored → returns detailed view with chain_history
 *     · no chain_id → empty chain_history
 *
 *   getLowConfidence / getDegraded / getEscalated: delegates to DB
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

async function assertThrows(fn: () => Promise<any>, matcher: RegExp | string, message: string) {
  try {
    await fn();
    console.error(`  FAIL: ${message} (no throw)`); failed++;
  } catch (e: any) {
    const matches = typeof matcher === 'string'
      ? e.message.includes(matcher)
      : matcher.test(e.message);
    if (matches) { console.log(`  PASS: ${message}`); passed++; }
    else {
      console.error(`  FAIL: ${message}\n         message: ${e.message}`); failed++;
    }
  }
}

// ── Route-dispatch fake pool ─────────────────────────────────────────────────
type Route = { match: RegExp; handler: (params: any[], sql: string) => any };
const routes: Route[] = [];
const queryLog: { sql: string; params: any[] }[] = [];

function addRoute(match: RegExp, handler: (params: any[], sql: string) => any) {
  routes.push({ match, handler });
}

function resetRoutes() {
  routes.length = 0;
  queryLog.length = 0;
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) return [r.handler(params, sql)];
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: dbStub } as any;

const svc = require('../promptScoringService');
const {
  calculateScore,
  deriveConfidence,
  detectDegradation,
  checkEscalation,
  resolveChain,
  getChainHistory,
  scorePrompt,
  getScore,
  getLowConfidence,
  getDegraded,
  getEscalated,
  SCORING,
  CONFIDENCE_THRESHOLDS,
  DEGRADATION,
  ESCALATION,
} = svc;

// Silence logs
const origError = console.error;

function makePrompt(overrides: any = {}) {
  return {
    id: 100, title: 'Test Prompt', parent_prompt_id: null,
    status: 'complete', evaluator_status: 'pass',
    completion_status: 'complete',
    violations_found: null, issues_found: null, blockers_found: null,
    chain_id: 100, chain_step_number: 1,
    quality_score: null, confidence_level: null,
    violation_count: 0, issue_count: 0, blocker_count: 0,
    degradation_flag: 0, escalation_required: 0, escalation_reason: null,
    rolling_quality_score: null, previous_quality_score: null,
    ...overrides,
  };
}

async function main() {

// ============================================================================
// Constant exports
// ============================================================================
console.log('\n── exports ───────────────────────────────────────────────');
assertEq(SCORING.BASE, 100, 'SCORING.BASE');
assertEq(SCORING.VIOLATION_PENALTY, 15, 'VIOLATION_PENALTY');
assertEq(SCORING.ISSUE_PENALTY, 8, 'ISSUE_PENALTY');
assertEq(SCORING.BLOCKER_PENALTY, 20, 'BLOCKER_PENALTY');
assertEq(CONFIDENCE_THRESHOLDS.HIGH, 85, 'HIGH threshold');
assertEq(CONFIDENCE_THRESHOLDS.MEDIUM, 60, 'MEDIUM threshold');
assertEq(DEGRADATION.SCORE_DROP_THRESHOLD, 10, 'SCORE_DROP_THRESHOLD');
assertEq(ESCALATION.SCORE_THRESHOLD, 60, 'ESCALATION.SCORE_THRESHOLD');

// ============================================================================
// calculateScore — pure
// ============================================================================
console.log('\n── calculateScore: clean/perfect ─────────────────────────');

{
  const r = calculateScore({
    evaluator_status: 'pass', completion_status: 'complete',
    violations_found: [], issues_found: [], blockers_found: [],
  });
  assertEq(r.quality_score, 100, 'clean pass → 100');
  assertEq(r.violation_count, 0, '0 violations');
  assertEq(r.issue_count, 0, '0 issues');
  assertEq(r.blocker_count, 0, '0 blockers');
  assertEq(r.breakdown, [], 'empty breakdown');
}

// No evaluator → -5
{
  const r = calculateScore({
    evaluator_status: 'pending', completion_status: 'complete',
    violations_found: [], issues_found: [], blockers_found: [],
  });
  assertEq(r.quality_score, 95, 'pending evaluator → 95');
  assertEq(r.breakdown.length, 1, '1 breakdown entry');
  assertEq(r.breakdown[0].factor, 'no_evaluator', 'no_evaluator factor');
  assertEq(r.breakdown[0].penalty, -5, '-5 penalty');
}

// Null evaluator → -5
{
  const r = calculateScore({
    evaluator_status: null, completion_status: 'complete',
    violations_found: [], issues_found: [], blockers_found: [],
  });
  assertEq(r.quality_score, 95, 'null evaluator → 95');
}

// Violations
{
  const r = calculateScore({
    evaluator_status: 'pass', completion_status: 'complete',
    violations_found: [{ t: 1 }, { t: 2 }],
  });
  assertEq(r.quality_score, 70, '2 violations: 100 - 30');
  assertEq(r.violation_count, 2, 'count 2');
}

// Issues
{
  const r = calculateScore({
    evaluator_status: 'pass', completion_status: 'complete',
    issues_found: [1, 2, 3],
  });
  assertEq(r.quality_score, 76, '3 issues: 100 - 24');
  assertEq(r.issue_count, 3, 'count 3');
}

// Blockers
{
  const r = calculateScore({
    evaluator_status: 'pass', completion_status: 'complete',
    blockers_found: [1],
  });
  assertEq(r.quality_score, 80, '1 blocker: 100 - 20');
}

// Partial completion
{
  const r = calculateScore({
    evaluator_status: 'pass', completion_status: 'partial',
  });
  assertEq(r.quality_score, 85, 'partial: 100 - 15');
}

// Failed completion
{
  const r = calculateScore({
    evaluator_status: 'pass', completion_status: 'failed',
  });
  assertEq(r.quality_score, 70, 'failed: 100 - 30');
}

// Blocked completion
{
  const r = calculateScore({
    evaluator_status: 'pass', completion_status: 'blocked',
  });
  assertEq(r.quality_score, 75, 'blocked: 100 - 25');
}

// Evaluator fail
{
  const r = calculateScore({
    evaluator_status: 'fail', completion_status: 'complete',
  });
  assertEq(r.quality_score, 80, 'evaluator fail: 100 - 20');
}

// Floor at 0
{
  const r = calculateScore({
    evaluator_status: 'fail', completion_status: 'failed',
    violations_found: Array(10).fill({ v: 1 }),
    issues_found: Array(5).fill({ i: 1 }),
    blockers_found: Array(3).fill({ b: 1 }),
  });
  assertEq(r.quality_score, 0, 'floor at 0');
}

// JSON string parsing
{
  const r = calculateScore({
    evaluator_status: 'pass', completion_status: 'complete',
    violations_found: '[{"x":1}]',
  });
  assertEq(r.quality_score, 85, 'JSON string parsed (1 violation)');
  assertEq(r.violation_count, 1, 'count from JSON');
}

// Malformed JSON → fallback []
{
  const r = calculateScore({
    evaluator_status: 'pass', completion_status: 'complete',
    violations_found: 'not json',
  });
  assertEq(r.violation_count, 0, 'malformed JSON → 0');
  assertEq(r.quality_score, 100, 'no penalty');
}

// Non-array JSON → fallback []
{
  const r = calculateScore({
    evaluator_status: 'pass', completion_status: 'complete',
    violations_found: '{"not":"array"}',
  });
  assertEq(r.violation_count, 0, 'non-array → 0');
}

// ============================================================================
// deriveConfidence
// ============================================================================
console.log('\n── deriveConfidence ──────────────────────────────────────');

assertEq(deriveConfidence(null, null), 'unknown', 'null → unknown');
assertEq(deriveConfidence(undefined, null), 'unknown', 'undefined → unknown');
assertEq(deriveConfidence(100, null), 'high', '100 → high');
assertEq(deriveConfidence(85, null), 'high', '85 → high');
assertEq(deriveConfidence(84, null), 'medium', '84 → medium');
assertEq(deriveConfidence(60, null), 'medium', '60 → medium');
assertEq(deriveConfidence(59, null), 'low', '59 → low');
assertEq(deriveConfidence(0, null), 'low', '0 → low');

// Rolling score worse than current → uses worse
assertEq(deriveConfidence(90, 50), 'low', 'rolling 50 drags to low');
assertEq(deriveConfidence(90, 70), 'medium', 'rolling 70 drags to medium');
// Rolling score better than current → uses current
assertEq(deriveConfidence(50, 100), 'low', 'current worse wins');

// ============================================================================
// detectDegradation
// ============================================================================
console.log('\n── detectDegradation ─────────────────────────────────────');

// Too few steps
{
  const r = detectDegradation(
    [{ quality_score: 100 }, { quality_score: 50 }],
    50
  );
  assertEq(r.degraded, false, '2 steps < min 3 → not degraded');
  assertEq(r.reasons, [], 'no reasons');
}

// Stable high scores
{
  const r = detectDegradation(
    [{ quality_score: 95 }, { quality_score: 90 }, { quality_score: 92 }],
    92
  );
  assertEq(r.degraded, false, 'stable → not degraded');
}

// Score declining by 10+
{
  const r = detectDegradation(
    [{ quality_score: 90, violation_count: 0 }, { quality_score: 85, violation_count: 0 }, { quality_score: 75, violation_count: 0 }],
    75
  );
  assertEq(r.degraded, true, 'decline of 15 → degraded');
  assert(r.reasons[0].includes('declined'), 'reason mentions declined');
}

// Consecutive violations
{
  const r = detectDegradation(
    [
      { quality_score: 90, violation_count: 0 },
      { quality_score: 85, violation_count: 2 },
      { quality_score: 80, violation_count: 1 },
    ],
    80
  );
  assertEq(r.degraded, true, 'consecutive violations → degraded');
  assert(r.reasons.some((r: string) => r.includes('consecutive steps with violations')), 'reason mentions consecutive');
}

// Low scores persisting
{
  const r = detectDegradation(
    [
      { quality_score: 60, violation_count: 0 },
      { quality_score: 45, violation_count: 0 },
      { quality_score: 40, violation_count: 0 },
    ],
    40
  );
  assertEq(r.degraded, true, 'low scores → degraded');
  assert(r.reasons.some((reason: string) => reason.includes('below 50')), 'reason mentions below 50');
}

// ============================================================================
// checkEscalation
// ============================================================================
console.log('\n── checkEscalation ───────────────────────────────────────');

{
  const r = checkEscalation(90, 0, 0, false);
  assertEq(r.required, false, '90/clean → not required');
  assertEq(r.reason, '', 'empty reason');
}

{
  const r = checkEscalation(50, 0, 0, false);
  assertEq(r.required, true, '50 < 60 → required');
  assert(r.reason.includes('Quality score 50'), 'reason mentions score');
}

{
  const r = checkEscalation(70, 0, 0, true);
  assertEq(r.required, true, 'degraded + 70 < 75 → required');
  assert(r.reason.includes('Degraded'), 'reason mentions degraded');
}

{
  const r = checkEscalation(80, 0, 0, true);
  assertEq(r.required, false, 'degraded but score 80 >= 75 → not required');
}

{
  const r = checkEscalation(80, 0, 2, false);
  assertEq(r.required, true, 'blockers → required');
  assert(r.reason.includes('2 blocker'), 'reason mentions blockers');
}

{
  const r = checkEscalation(80, 3, 0, false);
  assertEq(r.required, true, '3 violations → required');
  assert(r.reason.includes('3 violations'), 'reason mentions violations');
}

{
  const r = checkEscalation(80, 2, 0, false);
  assertEq(r.required, false, '2 violations < threshold 3 → not required');
}

// Combined reasons
{
  const r = checkEscalation(40, 5, 2, true);
  assertEq(r.required, true, 'combined → required');
  const parts = r.reason.split('; ');
  assert(parts.length >= 3, 'multiple reasons joined');
}

// ============================================================================
// resolveChain (DB)
// ============================================================================
console.log('\n── resolveChain ──────────────────────────────────────────');

// No parent → self is root
resetRoutes();
{
  const r = await resolveChain(fakePool, { id: 100, parent_prompt_id: null });
  assertEq(r.chain_id, 100, 'self is root');
  assertEq(r.chain_step_number, 1, 'depth 1');
}

// Walks parent chain
resetRoutes();
const parentMap: Record<number, number | null> = { 101: 100, 100: null };
addRoute(/FROM om_prompt_registry WHERE id = \?/i, (params) => {
  const id = params[0];
  if (id in parentMap) return [{ id, parent_prompt_id: parentMap[id] }];
  return [];
});
{
  const r = await resolveChain(fakePool, { id: 102, parent_prompt_id: 101 });
  assertEq(r.chain_id, 100, 'walks up to 100');
  assertEq(r.chain_step_number, 3, 'depth 3');
}

// Stops on cycle
resetRoutes();
const cycleMap: Record<number, number | null> = { 200: 201, 201: 200 };
addRoute(/FROM om_prompt_registry WHERE id = \?/i, (params) => {
  const id = params[0];
  if (id in cycleMap) return [{ id, parent_prompt_id: cycleMap[id] }];
  return [];
});
{
  const r = await resolveChain(fakePool, { id: 202, parent_prompt_id: 201 });
  // 202 → 201 (found, depth=2) → 200 (found, depth=3) → 201 (already visited, break)
  assertEq(r.chain_id, 200, 'last non-cycle root');
  assert(r.chain_step_number >= 1, 'bounded depth');
}

// Stops when parent not found
resetRoutes();
addRoute(/FROM om_prompt_registry WHERE id = \?/i, () => []);
{
  const r = await resolveChain(fakePool, { id: 300, parent_prompt_id: 999 });
  assertEq(r.chain_id, 300, 'stays at start when parent missing');
  assertEq(r.chain_step_number, 1, 'depth 1');
}

// ============================================================================
// getChainHistory
// ============================================================================
console.log('\n── getChainHistory ───────────────────────────────────────');

resetRoutes();
addRoute(/FROM om_prompt_registry[\s\S]*WHERE chain_id = \?[\s\S]*ORDER BY chain_step_number/i, () => [
  { id: 1, chain_step_number: 1, quality_score: 95 },
  { id: 2, chain_step_number: 2, quality_score: 90 },
]);
{
  const rows = await getChainHistory(fakePool, 1);
  assertEq(rows.length, 2, '2 rows');
  assertEq(rows[0].id, 1, 'order preserved');
}

// ============================================================================
// scorePrompt
// ============================================================================
console.log('\n── scorePrompt: not found ────────────────────────────────');

resetRoutes();
addRoute(/^\s*SELECT \* FROM om_prompt_registry WHERE id = \?/i, () => []);
await assertThrows(
  () => scorePrompt(999),
  /Prompt not found/,
  'missing prompt → throws'
);

console.log('\n── scorePrompt: not scoreable ────────────────────────────');

resetRoutes();
addRoute(/^\s*SELECT \* FROM om_prompt_registry WHERE id = \?/i, () => [
  makePrompt({ id: 1, status: 'draft', evaluator_status: null }),
]);
{
  const r = await scorePrompt(1);
  assertEq(r.scored, false, 'not scoreable');
  assert(r.reason.includes('draft'), 'reason mentions status');
}

console.log('\n── scorePrompt: happy path ───────────────────────────────');

resetRoutes();
addRoute(/^\s*SELECT \* FROM om_prompt_registry WHERE id = \?/i, () => [
  makePrompt({
    id: 100, title: 'Clean', status: 'complete',
    evaluator_status: 'pass', completion_status: 'complete',
    parent_prompt_id: null,
  }),
]);
// Chain history
addRoute(/FROM om_prompt_registry[\s\S]*WHERE chain_id = \?[\s\S]*ORDER BY chain_step_number/i, () => []);
// UPDATE
let updateParams: any[] = [];
addRoute(/UPDATE om_prompt_registry SET/i, (params) => {
  updateParams = params;
  return { affectedRows: 1 };
});
// INSERT log
let logParams: any[] = [];
addRoute(/INSERT INTO system_logs/i, (params) => {
  logParams = params;
  return { affectedRows: 1 };
});
{
  const r = await scorePrompt(100);
  assertEq(r.scored, true, 'scored');
  assertEq(r.quality_score, 100, 'perfect score');
  assertEq(r.confidence_level, 'high', 'high confidence');
  assertEq(r.violation_count, 0, '0 violations');
  assertEq(r.degradation_flag, false, 'no degradation');
  assertEq(r.escalation_required, false, 'no escalation');
  // UPDATE params: [score, confidence, vCount, iCount, bCount, degraded, esc, escReason, chain_id, step, rolling, prev, id]
  assertEq(updateParams[0], 100, 'score');
  assertEq(updateParams[1], 'high', 'confidence');
  assertEq(updateParams[5], 0, 'degraded 0');
  assertEq(updateParams[6], 0, 'escalation 0');
  assertEq(updateParams[7], null, 'escalation_reason null');
  assertEq(updateParams[updateParams.length - 1], 100, 'id last');
  // Log
  assertEq(logParams[0], 'INFO', 'INFO level');
  assert(logParams[1].includes('100/100'), 'message has score');
  assert(!logParams[1].includes('ESCALATION'), 'no escalation in msg');
}

// Escalation case
resetRoutes();
addRoute(/^\s*SELECT \* FROM om_prompt_registry WHERE id = \?/i, () => [
  makePrompt({
    id: 200, title: 'Bad', status: 'complete',
    evaluator_status: 'fail',
    completion_status: 'failed',
    violations_found: [1, 2, 3, 4],
    parent_prompt_id: null,
  }),
]);
addRoute(/FROM om_prompt_registry[\s\S]*WHERE chain_id = \?[\s\S]*ORDER BY chain_step_number/i, () => []);
addRoute(/UPDATE om_prompt_registry SET/i, (params) => {
  updateParams = params;
  return { affectedRows: 1 };
});
addRoute(/INSERT INTO system_logs/i, (params) => {
  logParams = params;
  return { affectedRows: 1 };
});
{
  const r = await scorePrompt(200);
  // 100 - 60 (violations) - 30 (failed) - 20 (evaluator fail) = -10 → 0
  assertEq(r.quality_score, 0, 'floored at 0');
  assertEq(r.confidence_level, 'low', 'low confidence');
  assertEq(r.escalation_required, true, 'escalation required');
  assert(r.escalation_reason.length > 0, 'reason populated');
  assertEq(updateParams[6], 1, 'escalation flag 1');
  assert(updateParams[7] !== null, 'escalation_reason persisted');
  assertEq(logParams[0], 'WARN', 'WARN level for escalation');
  assert(logParams[1].includes('ESCALATION REQUIRED'), 'log message mentions escalation');
}

// ============================================================================
// getScore
// ============================================================================
console.log('\n── getScore ──────────────────────────────────────────────');

resetRoutes();
addRoute(/^\s*SELECT \* FROM om_prompt_registry WHERE id = \?/i, () => []);
await assertThrows(() => getScore(1), /Prompt not found/, 'not found → throws');

// Already scored → returns detail
resetRoutes();
addRoute(/^\s*SELECT \* FROM om_prompt_registry WHERE id = \?/i, () => [
  makePrompt({
    id: 100, quality_score: 90, confidence_level: 'high',
    chain_id: 50, chain_step_number: 1,
    violation_count: 0, issue_count: 0, blocker_count: 0,
    degradation_flag: 0, escalation_required: 0,
  }),
]);
addRoute(/FROM om_prompt_registry[\s\S]*WHERE chain_id = \?[\s\S]*ORDER BY chain_step_number/i, () => [
  { id: 50, chain_step_number: 1, quality_score: 90, confidence_level: 'high',
    title: 'step1', violation_count: 0, degradation_flag: 0, status: 'complete' },
]);
{
  const r = await getScore(100);
  assertEq(r.scored, true, 'scored');
  assertEq(r.quality_score, 90, 'score');
  assertEq(r.degradation_flag, false, 'flag bool');
  assertEq(r.chain_history.length, 1, 'chain history');
  assertEq(r.chain_history[0].step, 1, 'step number');
}

// No chain_id
resetRoutes();
addRoute(/^\s*SELECT \* FROM om_prompt_registry WHERE id = \?/i, () => [
  makePrompt({ id: 100, quality_score: 80, chain_id: null }),
]);
{
  const r = await getScore(100);
  assertEq(r.chain_history, [], 'no chain → empty history');
}

// Unscored + complete → calls scorePrompt
resetRoutes();
addRoute(/^\s*SELECT \* FROM om_prompt_registry WHERE id = \?/i, () => [
  makePrompt({
    id: 100, quality_score: null, status: 'complete',
    evaluator_status: 'pass', completion_status: 'complete',
    parent_prompt_id: null,
  }),
]);
addRoute(/FROM om_prompt_registry[\s\S]*WHERE chain_id = \?[\s\S]*ORDER BY chain_step_number/i, () => []);
let updateHit = false;
addRoute(/UPDATE om_prompt_registry SET/i, () => {
  updateHit = true;
  return { affectedRows: 1 };
});
addRoute(/INSERT INTO system_logs/i, () => ({ affectedRows: 1 }));
{
  const r = await getScore(100);
  assertEq(r.scored, true, 'scorePrompt was called');
  assertEq(updateHit, true, 'UPDATE hit');
}

// ============================================================================
// getLowConfidence / getDegraded / getEscalated
// ============================================================================
console.log('\n── query functions ───────────────────────────────────────');

resetRoutes();
addRoute(/FROM om_prompt_registry[\s\S]*confidence_level = 'low'/i, () => [
  { id: 1, quality_score: 40 }, { id: 2, quality_score: 30 },
]);
{
  const r = await getLowConfidence();
  assertEq(r.length, 2, '2 low-confidence prompts');
}

resetRoutes();
addRoute(/FROM om_prompt_registry[\s\S]*degradation_flag = 1/i, () => [{ id: 5 }]);
{
  const r = await getDegraded();
  assertEq(r.length, 1, '1 degraded');
}

resetRoutes();
addRoute(/FROM om_prompt_registry[\s\S]*escalation_required = 1/i, () => [{ id: 7 }, { id: 8 }]);
{
  const r = await getEscalated();
  assertEq(r.length, 2, '2 escalated');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
