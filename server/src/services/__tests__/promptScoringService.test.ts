#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptScoringService.js (OMD-1196)
 *
 * Deterministic quality scoring + chain tracking + degradation detection
 * + escalation routing. One external dep: config/db (getAppPool).
 *
 * Stub strategy: replace config/db via require.cache with a fake pool
 * that dispatches on SQL regex. Pure functions are tested directly; DB
 * functions drive the fake pool with scripted rows.
 *
 * Coverage:
 *   - calculateScore:
 *       · clean prompt (pending evaluator) → 100 - 5 = 95
 *       · violations/issues/blockers applied
 *       · completion status penalties (partial/failed/blocked)
 *       · evaluator_fail penalty, pending/missing → -5
 *       · floor at 0, cap at 100
 *       · JSON array parsing (string/array/malformed)
 *       · breakdown entries
 *   - deriveConfidence:
 *       · null → unknown
 *       · high / medium / low thresholds
 *       · rolling score takes minimum
 *   - detectDegradation:
 *       · under min steps → not degraded
 *       · score drop detected
 *       · consecutive violations detected
 *       · low-score persistence detected
 *       · multiple reasons aggregated
 *   - checkEscalation:
 *       · score < 60 → escalate
 *       · degraded + score < 75 → escalate
 *       · blockers > 0 → escalate
 *       · 3+ violations → escalate
 *       · clean → not escalated
 *   - resolveChain:
 *       · no parent → depth 1, self root
 *       · parent walk
 *       · cycle safety
 *       · broken parent chain stops early
 *   - getChainHistory:
 *       · queries om_prompt_registry with chain_id
 *   - calculateRollingScore (via detectDegradation path & resolveChain ordering):
 *       · indirectly via scorePrompt happy path
 *   - scorePrompt:
 *       · not-yet-scoreable status returns scored:false
 *       · not found throws
 *       · happy path: computes + persists + logs
 *       · escalation flag in log level WARN
 *   - getScore:
 *       · not found throws
 *       · not yet scored + complete → scores now
 *       · already scored → returns with chain_history
 *   - getLowConfidence / getDegraded / getEscalated:
 *       · correct SQL filter
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

// ── Stub config/db via require.cache ────────────────────────────────
const nodePath = require('path');
const sutDir = nodePath.dirname(require.resolve('../promptScoringService'));
const dbAbs = require.resolve(nodePath.resolve(sutDir, '..', 'config', 'db'));

type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
type Responder = (params: any[]) => any[];
let responders: Array<{ match: RegExp; respond: Responder }> = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of responders) {
      if (r.match.test(sql)) {
        const result = r.respond(params);
        return [result];
      }
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };

require.cache[dbAbs] = {
  id: dbAbs, filename: dbAbs, loaded: true, exports: dbStub,
} as any;

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

function resetDb() {
  queryLog.length = 0;
  responders = [];
}

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// ============================================================================
// Constants sanity
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(SCORING.BASE, 100, 'BASE=100');
assertEq(SCORING.VIOLATION_PENALTY, 15, 'VIOLATION_PENALTY=15');
assertEq(SCORING.BLOCKER_PENALTY, 20, 'BLOCKER_PENALTY=20');
assertEq(CONFIDENCE_THRESHOLDS.HIGH, 85, 'HIGH=85');
assertEq(CONFIDENCE_THRESHOLDS.MEDIUM, 60, 'MEDIUM=60');
assertEq(DEGRADATION.MIN_STEPS_FOR_TREND, 3, 'min 3 steps');
assertEq(ESCALATION.SCORE_THRESHOLD, 60, 'escalation below 60');

// ============================================================================
// calculateScore
// ============================================================================
console.log('\n── calculateScore ────────────────────────────────────────');

// Clean prompt (evaluator passed) — all penalties zero
{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 100, 'clean=100');
  assertEq(r.violation_count, 0, 'violations=0');
  assertEq(r.issue_count, 0, 'issues=0');
  assertEq(r.blocker_count, 0, 'blockers=0');
  assertEq(r.breakdown.length, 0, 'no breakdown entries');
}

// Clean but evaluator pending → -5
{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: null,
  });
  assertEq(r.quality_score, 95, 'no evaluator = 95');
  assert(r.breakdown.some((b: any) => b.factor === 'no_evaluator'), 'breakdown has no_evaluator');
}

// Violations applied
{
  const r = calculateScore({
    violations_found: JSON.stringify([{ id: 1 }, { id: 2 }]),
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 70, '100 - 2*15 = 70');
  assertEq(r.violation_count, 2, '2 violations');
}

// Issues applied (-8 each)
{
  const r = calculateScore({
    violations_found: null,
    issues_found: JSON.stringify([{}, {}, {}]),
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 76, '100 - 3*8 = 76');
  assertEq(r.issue_count, 3, '3 issues');
}

// Blockers (-20 each)
{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: JSON.stringify([{}]),
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 80, '100 - 20 = 80');
  assertEq(r.blocker_count, 1, '1 blocker');
}

// Completion status — partial
{
  const r = calculateScore({
    completion_status: 'partial',
    evaluator_status: 'pass',
    violations_found: null,
    issues_found: null,
    blockers_found: null,
  });
  assertEq(r.quality_score, 85, 'partial=-15');
}

// Completion status — failed
{
  const r = calculateScore({
    completion_status: 'failed',
    evaluator_status: 'pass',
    violations_found: null,
    issues_found: null,
    blockers_found: null,
  });
  assertEq(r.quality_score, 70, 'failed=-30');
}

// Completion status — blocked
{
  const r = calculateScore({
    completion_status: 'blocked',
    evaluator_status: 'pass',
    violations_found: null,
    issues_found: null,
    blockers_found: null,
  });
  assertEq(r.quality_score, 75, 'blocked=-25');
}

// Evaluator failed
{
  const r = calculateScore({
    completion_status: 'complete',
    evaluator_status: 'fail',
    violations_found: null, issues_found: null, blockers_found: null,
  });
  assertEq(r.quality_score, 80, 'evaluator fail=-20');
}

// Score floor at 0
{
  const r = calculateScore({
    violations_found: JSON.stringify(new Array(20).fill({})),
    issues_found: null,
    blockers_found: null,
    completion_status: 'failed',
    evaluator_status: 'fail',
  });
  assertEq(r.quality_score, 0, 'floored at 0');
}

// Accepts parsed array directly (not just stringified)
{
  const r = calculateScore({
    violations_found: [{ id: 1 }],
    issues_found: [],
    blockers_found: [],
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.violation_count, 1, 'array accepted directly');
}

// Malformed JSON → treated as empty
{
  const r = calculateScore({
    violations_found: '{not-json',
    issues_found: null,
    blockers_found: null,
    completion_status: 'complete',
    evaluator_status: 'pass',
  });
  assertEq(r.violation_count, 0, 'malformed → 0 violations');
}

// Breakdown contains all active factors
{
  const r = calculateScore({
    violations_found: JSON.stringify([{}]),
    issues_found: JSON.stringify([{}]),
    blockers_found: JSON.stringify([{}]),
    completion_status: 'partial',
    evaluator_status: 'fail',
  });
  const factors = r.breakdown.map((b: any) => b.factor);
  assert(factors.includes('violations'), 'breakdown has violations');
  assert(factors.includes('issues'), 'breakdown has issues');
  assert(factors.includes('blockers'), 'breakdown has blockers');
  assert(factors.includes('partial_completion'), 'breakdown has partial');
  assert(factors.includes('evaluator_fail'), 'breakdown has evaluator_fail');
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

// Rolling score is worse — should dominate
assertEq(deriveConfidence(95, 70), 'medium', 'rolling 70 with current 95 → medium');
assertEq(deriveConfidence(95, 50), 'low', 'rolling 50 → low');
// Rolling better — current dominates
assertEq(deriveConfidence(70, 95), 'medium', 'current 70 < rolling 95 → medium');

// ============================================================================
// detectDegradation
// ============================================================================
console.log('\n── detectDegradation ─────────────────────────────────────');

// Fewer than 3 steps → not degraded
{
  const r = detectDegradation([
    { quality_score: 80, violation_count: 0 },
    { quality_score: 70, violation_count: 0 },
  ], 70);
  assertEq(r.degraded, false, 'under min steps');
  assertEq(r.reasons.length, 0, 'no reasons');
}

// Score drop ≥10 over 3 steps
{
  const r = detectDegradation([
    { quality_score: 95, violation_count: 0 },
    { quality_score: 88, violation_count: 0 },
    { quality_score: 80, violation_count: 0 },
  ], 80);
  assertEq(r.degraded, true, 'score drop 15 → degraded');
  assert(r.reasons[0].includes('declined'), 'reason mentions decline');
}

// Consecutive violations
{
  const r = detectDegradation([
    { quality_score: 80, violation_count: 1 },
    { quality_score: 78, violation_count: 2 },
    { quality_score: 75, violation_count: 1 },
  ], 75);
  assertEq(r.degraded, true, '3 steps with violations → degraded');
  assert(r.reasons.some((x: string) => x.includes('consecutive')), 'reason mentions consecutive');
}

// Low score persistence
{
  const r = detectDegradation([
    { quality_score: 70, violation_count: 0 },
    { quality_score: 45, violation_count: 0 },
    { quality_score: 40, violation_count: 0 },
  ], 40);
  assertEq(r.degraded, true, 'low-score persistence → degraded');
  assert(r.reasons.some((x: string) => x.includes('below')), 'reason mentions below threshold');
}

// Nulls filtered out before check
{
  const r = detectDegradation([
    { quality_score: null, violation_count: 0 },
    { quality_score: null, violation_count: 0 },
    { quality_score: 90, violation_count: 0 },
  ], 90);
  assertEq(r.degraded, false, 'nulls filtered; only 1 scored step');
}

// ============================================================================
// checkEscalation
// ============================================================================
console.log('\n── checkEscalation ───────────────────────────────────────');

// Clean
{
  const r = checkEscalation(90, 0, 0, false);
  assertEq(r.required, false, 'clean not escalated');
  assertEq(r.reason, '', 'empty reason');
}

// Low score
{
  const r = checkEscalation(55, 0, 0, false);
  assertEq(r.required, true, 'low score → escalate');
  assert(r.reason.includes('55'), 'reason includes score');
}

// Degraded + borderline
{
  const r = checkEscalation(70, 0, 0, true);
  assertEq(r.required, true, 'degraded + score 70 → escalate');
  assert(r.reason.includes('Degraded'), 'reason mentions Degraded');
}

// Degraded but high enough
{
  const r = checkEscalation(80, 0, 0, true);
  assertEq(r.required, false, 'degraded but score 80 → no escalation');
}

// Blockers present
{
  const r = checkEscalation(90, 0, 2, false);
  assertEq(r.required, true, 'blockers → escalate');
  assert(r.reason.includes('2 blocker'), 'reason includes blocker count');
}

// 3 violations
{
  const r = checkEscalation(90, 3, 0, false);
  assertEq(r.required, true, '3 violations → escalate');
  assert(r.reason.includes('3 violations'), 'reason includes violation count');
}

// Multiple reasons joined
{
  const r = checkEscalation(40, 5, 1, true);
  assert(r.reason.includes(';'), 'multiple reasons joined');
}

async function main() {

// ============================================================================
// resolveChain
// ============================================================================
console.log('\n── resolveChain ──────────────────────────────────────────');

// No parent → self root, depth 1
resetDb();
{
  const r = await resolveChain(fakePool, { id: 5, parent_prompt_id: null });
  assertEq(r.chain_id, 5, 'chain_id = self');
  assertEq(r.chain_step_number, 1, 'depth 1');
  assertEq(queryLog.length, 0, 'no queries');
}

// Walk parent chain: 5 → 3 → 1
resetDb();
{
  responders = [{
    match: /WHERE id = \?/,
    respond: (params) => {
      const id = params[0];
      if (id === 3) return [{ id: 3, parent_prompt_id: 1 }];
      if (id === 1) return [{ id: 1, parent_prompt_id: null }];
      return [];
    },
  }];
  const r = await resolveChain(fakePool, { id: 5, parent_prompt_id: 3 });
  assertEq(r.chain_id, 1, 'root = 1');
  assertEq(r.chain_step_number, 3, 'depth 3');
}

// Cycle safety (parent points back to self)
resetDb();
{
  responders = [{
    match: /WHERE id = \?/,
    respond: (params) => {
      const id = params[0];
      if (id === 2) return [{ id: 2, parent_prompt_id: 5 }]; // cycle
      return [];
    },
  }];
  const r = await resolveChain(fakePool, { id: 5, parent_prompt_id: 2 });
  assertEq(r.chain_id, 2, 'root = 2 (cycle stopped)');
  assertEq(r.chain_step_number, 2, 'depth 2');
}

// Broken parent chain — parent row not found
resetDb();
{
  responders = [{
    match: /WHERE id = \?/,
    respond: () => [],
  }];
  const r = await resolveChain(fakePool, { id: 10, parent_prompt_id: 999 });
  assertEq(r.chain_id, 10, 'falls back to self');
  assertEq(r.chain_step_number, 1, 'depth 1');
}

// ============================================================================
// getChainHistory
// ============================================================================
console.log('\n── getChainHistory ───────────────────────────────────────');

resetDb();
{
  responders = [{
    match: /WHERE chain_id = \?/,
    respond: (params) => [
      { id: 1, title: 'Step 1', chain_step_number: 1, quality_score: 90 },
      { id: 2, title: 'Step 2', chain_step_number: 2, quality_score: 85 },
    ],
  }];
  const rows = await getChainHistory(fakePool, 1);
  assertEq(rows.length, 2, 'returns 2 rows');
  assertEq(queryLog[0].params[0], 1, 'chain_id param');
  assert(/ORDER BY chain_step_number/.test(queryLog[0].sql), 'ordered by step');
}

// ============================================================================
// scorePrompt
// ============================================================================
console.log('\n── scorePrompt ───────────────────────────────────────────');

// Not found → throws
resetDb();
{
  responders = [{ match: /om_prompt_registry WHERE id = \?/, respond: () => [] }];
  let caught = null;
  try {
    await scorePrompt(999);
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'throws for missing');
  assert(caught.message.includes('not found'), 'error message');
}

// Not yet scoreable (status=approved, no evaluator)
resetDb();
{
  responders = [{
    match: /om_prompt_registry WHERE id = \?/,
    respond: () => [{
      id: 1, title: 'T', status: 'approved', evaluator_status: null,
      violations_found: null, issues_found: null, blockers_found: null,
      completion_status: null, parent_prompt_id: null,
    }],
  }];
  const r = await scorePrompt(1);
  assertEq(r.scored, false, 'not scored');
  assert(r.reason.includes('not yet scoreable'), 'reason');
}

// Happy path: simple scoring with no chain
resetDb();
quiet();
{
  let updateCalled = false;
  let logCalled = false;
  let logLevel: string | null = null;
  responders = [
    {
      match: /om_prompt_registry WHERE id = \?/,
      respond: () => [{
        id: 1, title: 'Happy', status: 'complete',
        evaluator_status: 'pass', completion_status: 'complete',
        violations_found: null, issues_found: null, blockers_found: null,
        parent_prompt_id: null,
      }],
    },
    {
      match: /WHERE chain_id = \?/,
      respond: () => [],
    },
    {
      match: /^UPDATE om_prompt_registry/i,
      respond: () => { updateCalled = true; return []; },
    },
    {
      match: /^INSERT INTO system_logs/i,
      respond: (params) => { logCalled = true; logLevel = params[0]; return []; },
    },
  ];
  const r = await scorePrompt(1);
  loud();
  assertEq(r.scored, true, 'scored=true');
  assertEq(r.quality_score, 100, 'clean score 100');
  assertEq(r.confidence_level, 'high', 'high confidence');
  assertEq(r.escalation_required, false, 'no escalation');
  assert(updateCalled, 'UPDATE called');
  assert(logCalled, 'log INSERT called');
  assertEq(logLevel, 'INFO', 'INFO log level');
  assertEq(r.chain_id, 1, 'self is root');
  assertEq(r.chain_step_number, 1, 'depth 1');
}

// Escalation path: very bad score → WARN log + escalation flag set
resetDb();
quiet();
{
  let logLevel: string | null = null;
  responders = [
    {
      match: /om_prompt_registry WHERE id = \?/,
      respond: () => [{
        id: 2, title: 'Bad', status: 'complete',
        evaluator_status: 'fail', completion_status: 'failed',
        violations_found: JSON.stringify([{}, {}, {}]),
        issues_found: null, blockers_found: JSON.stringify([{}]),
        parent_prompt_id: null,
      }],
    },
    { match: /WHERE chain_id = \?/, respond: () => [] },
    { match: /^UPDATE/i, respond: () => [] },
    {
      match: /^INSERT INTO system_logs/i,
      respond: (params) => { logLevel = params[0]; return []; },
    },
  ];
  const r = await scorePrompt(2);
  loud();
  assertEq(r.scored, true, 'scored');
  assertEq(r.escalation_required, true, 'escalation required');
  assert(r.quality_score < 60, 'low score');
  assertEq(logLevel, 'WARN', 'WARN log level');
  assert(r.escalation_reason.length > 0, 'reason populated');
}

// ============================================================================
// getScore
// ============================================================================
console.log('\n── getScore ──────────────────────────────────────────────');

// Not found
resetDb();
{
  responders = [{ match: /WHERE id = \?/, respond: () => [] }];
  let caught = null;
  try {
    await getScore(999);
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
}

// Already scored → returns with chain_history
resetDb();
{
  responders = [
    {
      match: /om_prompt_registry WHERE id = \?/,
      respond: () => [{
        id: 5, title: 'Scored', status: 'verified',
        quality_score: 92, confidence_level: 'high',
        violation_count: 0, issue_count: 0, blocker_count: 0,
        degradation_flag: 0, escalation_required: 0, escalation_reason: null,
        chain_id: 5, chain_step_number: 1,
        rolling_quality_score: 92, previous_quality_score: null,
      }],
    },
    {
      match: /WHERE chain_id = \?/,
      respond: () => [
        { id: 5, title: 'Scored', chain_step_number: 1, quality_score: 92,
          confidence_level: 'high', violation_count: 0, degradation_flag: 0,
          status: 'verified' },
      ],
    },
  ];
  const r = await getScore(5);
  assertEq(r.scored, true, 'scored');
  assertEq(r.quality_score, 92, 'score');
  assertEq(r.chain_history.length, 1, 'chain history returned');
  assertEq(r.chain_history[0].step, 1, 'step in history');
}

// Not yet scored but complete → calls scorePrompt
resetDb();
quiet();
{
  let calls = 0;
  responders = [
    {
      match: /om_prompt_registry WHERE id = \?/,
      respond: () => {
        calls++;
        return [{
          id: 7, title: 'Fresh', status: 'complete',
          quality_score: null, chain_id: null,
          evaluator_status: 'pass', completion_status: 'complete',
          violations_found: null, issues_found: null, blockers_found: null,
          parent_prompt_id: null,
        }];
      },
    },
    { match: /WHERE chain_id = \?/, respond: () => [] },
    { match: /^UPDATE/i, respond: () => [] },
    { match: /^INSERT INTO system_logs/i, respond: () => [] },
  ];
  const r = await getScore(7);
  loud();
  assertEq(r.scored, true, 'scored via scorePrompt');
  assertEq(r.quality_score, 100, 'scored value');
  assert(calls >= 2, 'prompt queried by getScore and scorePrompt');
}

// ============================================================================
// Query functions
// ============================================================================
console.log('\n── getLowConfidence / getDegraded / getEscalated ─────────');

resetDb();
{
  responders = [{ match: /confidence_level = 'low'/, respond: () => [{ id: 1 }] }];
  const rows = await getLowConfidence();
  assertEq(rows.length, 1, 'one row');
  assert(/confidence_level = 'low'/.test(queryLog[0].sql), 'SQL filters low');
}

resetDb();
{
  responders = [{ match: /degradation_flag = 1/, respond: () => [{ id: 2 }, { id: 3 }] }];
  const rows = await getDegraded();
  assertEq(rows.length, 2, '2 degraded');
  assert(/degradation_flag = 1/.test(queryLog[0].sql), 'SQL filters degraded');
}

resetDb();
{
  responders = [{ match: /escalation_required = 1/, respond: () => [{ id: 4 }] }];
  const rows = await getEscalated();
  assertEq(rows.length, 1, '1 escalated');
  assert(/escalation_required = 1/.test(queryLog[0].sql), 'SQL filters escalated');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
