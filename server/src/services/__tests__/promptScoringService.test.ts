#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptScoringService.js (OMD-1001)
 *
 * Covers:
 *   Pure helpers:
 *     - calculateScore         all penalty branches, floor/cap, JSON parse
 *     - deriveConfidence       null/undefined, high/medium/low, rolling worst-case
 *     - detectDegradation      min-steps gate, score drop, violations, low score
 *     - checkEscalation        all four trigger conditions, combined reason
 *
 *   SQL-dependent (fake pool):
 *     - resolveChain           walks parent chain, cycle guard, depth cap
 *     - getChainHistory        SQL routed
 *     - scorePrompt            not-yet-scoreable short-circuit, full happy path
 *                              (UPDATE + system_logs insert), not-found throws
 *     - getScore               not-found, not-yet-scored → scorePrompt delegation,
 *                              already-scored return shape with chain history
 *     - getLowConfidence / getDegraded / getEscalated    query smoke test
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

// ── SQL-routed fake pool ──────────────────────────────────────────────────
type Route = { match: RegExp; rows: any[]; result?: any };
let routes: Route[] = [];
const queryCalls: Array<{ sql: string; params: any[] }> = [];

function resetPool() {
  routes = [];
  queryCalls.length = 0;
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryCalls.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        return [r.rows, r.result ?? {}];
      }
    }
    return [[], {}];
  },
};

// ── Stub ../config/db BEFORE requiring SUT ───────────────────────────────
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

const svc = require('../promptScoringService');
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
} = svc;

// Silence console inside SUT
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

async function main() {

// ============================================================================
// calculateScore
// ============================================================================
console.log('\n── calculateScore ────────────────────────────────────────');

// Baseline: no penalties except no_evaluator default
{
  const r = calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 100, 'all-clean + pass → 100');
  assertEq(r.violation_count, 0, 'violation_count 0');
  assertEq(r.issue_count, 0, 'issue_count 0');
  assertEq(r.blocker_count, 0, 'blocker_count 0');
  assertEq(r.breakdown.length, 0, 'no breakdown entries');
}

// No evaluator → -5
{
  const r = calculateScore({
    violations_found: [],
    issues_found: [],
    blockers_found: [],
    completion_status: 'success',
    evaluator_status: null,
  });
  assertEq(r.quality_score, 95, 'null evaluator → -5');
  assert(r.breakdown.some((b: any) => b.factor === 'no_evaluator'), 'breakdown has no_evaluator');
}

// Pending evaluator treated as no evaluator
{
  const r = calculateScore({
    violations_found: [],
    issues_found: [],
    blockers_found: [],
    completion_status: 'success',
    evaluator_status: 'pending',
  });
  assertEq(r.quality_score, 95, 'pending evaluator → -5');
}

// Violations → -15 each
{
  const r = calculateScore({
    violations_found: JSON.stringify(['v1', 'v2']),
    issues_found: [],
    blockers_found: [],
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 70, '2 violations → -30');
  assertEq(r.violation_count, 2, 'violation_count from JSON string parses');
}

// Issues → -8 each
{
  const r = calculateScore({
    violations_found: [],
    issues_found: ['i1', 'i2', 'i3'],
    blockers_found: [],
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 100 - 24, '3 issues → -24');
  assertEq(r.issue_count, 3, 'issue_count 3');
}

// Blockers → -20 each
{
  const r = calculateScore({
    violations_found: [],
    issues_found: [],
    blockers_found: ['b1'],
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 80, '1 blocker → -20');
  assertEq(r.blocker_count, 1, 'blocker_count 1');
}

// Partial completion → -15
{
  const r = calculateScore({
    violations_found: [], issues_found: [], blockers_found: [],
    completion_status: 'partial',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 85, 'partial → -15');
}

// Failed completion → -30
{
  const r = calculateScore({
    violations_found: [], issues_found: [], blockers_found: [],
    completion_status: 'failed',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 70, 'failed → -30');
}

// Blocked completion → -25
{
  const r = calculateScore({
    violations_found: [], issues_found: [], blockers_found: [],
    completion_status: 'blocked',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 75, 'blocked → -25');
}

// Evaluator fail → -20
{
  const r = calculateScore({
    violations_found: [], issues_found: [], blockers_found: [],
    completion_status: 'success',
    evaluator_status: 'fail',
  });
  assertEq(r.quality_score, 80, 'evaluator fail → -20');
}

// Combined penalties floor at 0
{
  const r = calculateScore({
    violations_found: ['v', 'v', 'v', 'v', 'v', 'v', 'v'], // 7×15 = 105
    issues_found: [],
    blockers_found: [],
    completion_status: 'failed', // -30
    evaluator_status: 'fail',    // -20
  });
  assertEq(r.quality_score, 0, 'floored at 0 for huge penalty');
}

// Invalid JSON in fields → treated as empty
{
  const r = calculateScore({
    violations_found: 'not json',
    issues_found: '{not:array}',
    blockers_found: null,
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 100, 'invalid JSON → parseJsonArray returns []');
  assertEq(r.violation_count, 0, 'invalid JSON → count 0');
}

// Non-array JSON → treated as empty
{
  const r = calculateScore({
    violations_found: JSON.stringify({ not: 'array' }),
    issues_found: [], blockers_found: [],
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(r.violation_count, 0, 'non-array JSON → 0');
}

// Breakdown includes all triggered factors
{
  const r = calculateScore({
    violations_found: ['a'],
    issues_found: ['b'],
    blockers_found: ['c'],
    completion_status: 'partial',
    evaluator_status: 'fail',
  });
  const factors = r.breakdown.map((b: any) => b.factor).sort();
  assertEq(
    factors,
    ['blockers', 'evaluator_fail', 'issues', 'partial_completion', 'violations'].sort(),
    'breakdown lists all 5 factors',
  );
}

// ============================================================================
// deriveConfidence
// ============================================================================
console.log('\n── deriveConfidence ──────────────────────────────────────');

assertEq(deriveConfidence(null, null), 'unknown', 'null score → unknown');
assertEq(deriveConfidence(undefined, null), 'unknown', 'undefined → unknown');
assertEq(deriveConfidence(100, null), 'high', '100 → high');
assertEq(deriveConfidence(85, null), 'high', '85 → high (boundary)');
assertEq(deriveConfidence(84, null), 'medium', '84 → medium');
assertEq(deriveConfidence(60, null), 'medium', '60 → medium (boundary)');
assertEq(deriveConfidence(59, null), 'low', '59 → low');
assertEq(deriveConfidence(0, null), 'low', '0 → low');

// Rolling score uses worse value
assertEq(deriveConfidence(90, 50), 'low', 'current 90 + rolling 50 → low (worst)');
assertEq(deriveConfidence(50, 90), 'low', 'current 50 + rolling 90 → low (worst)');
assertEq(deriveConfidence(90, 85), 'high', 'current 90 + rolling 85 → high');
assertEq(deriveConfidence(90, 70), 'medium', '90 + 70 → medium');
assertEq(deriveConfidence(90, undefined), 'high', 'undefined rolling ignored');

// ============================================================================
// detectDegradation
// ============================================================================
console.log('\n── detectDegradation ─────────────────────────────────────');

// Empty history → not enough steps
{
  const r = detectDegradation([], 100);
  assertEq(r.degraded, false, 'empty → not degraded');
  assertEq(r.reasons.length, 0, 'no reasons');
}

// Below min steps for trend
{
  const r = detectDegradation(
    [{ quality_score: 90, violation_count: 0 }, { quality_score: 50, violation_count: 0 }],
    50,
  );
  assertEq(r.degraded, false, '2 steps → below threshold for trend');
}

// Score drop ≥10 over 3+ steps
{
  const r = detectDegradation(
    [
      { quality_score: 90, violation_count: 0 },
      { quality_score: 85, violation_count: 0 },
      { quality_score: 75, violation_count: 0 },
    ],
    75,
  );
  assertEq(r.degraded, true, '90 → 75 over 3 steps → degraded');
  assert(r.reasons.some((x: string) => x.includes('declined')), 'reason mentions decline');
}

// Drop < threshold → not degraded
{
  const r = detectDegradation(
    [
      { quality_score: 90, violation_count: 0 },
      { quality_score: 88, violation_count: 0 },
      { quality_score: 85, violation_count: 0 },
    ],
    85,
  );
  assertEq(r.degraded, false, '90 → 85 only 5pt → not degraded');
}

// Consecutive violations (2+)
{
  const r = detectDegradation(
    [
      { quality_score: 90, violation_count: 0 },
      { quality_score: 85, violation_count: 1 },
      { quality_score: 80, violation_count: 2 },
    ],
    80,
  );
  assertEq(r.degraded, true, 'consecutive violations → degraded');
  assert(
    r.reasons.some((x: string) => x.includes('consecutive steps with violations')),
    'reason mentions consecutive violations',
  );
}

// 2+ steps below low-score threshold
{
  const r = detectDegradation(
    [
      { quality_score: 80, violation_count: 0 },
      { quality_score: 45, violation_count: 0 },
      { quality_score: 40, violation_count: 0 },
    ],
    40,
  );
  assertEq(r.degraded, true, '2 steps below 50 → degraded');
  assert(
    r.reasons.some((x: string) => x.includes('below 50')),
    'reason mentions low score',
  );
}

// Null scores are excluded from trend analysis
{
  const r = detectDegradation(
    [
      { quality_score: null, violation_count: 0 },
      { quality_score: null, violation_count: 0 },
    ],
    null,
  );
  assertEq(r.degraded, false, 'all-null history → not degraded');
}

// ============================================================================
// checkEscalation
// ============================================================================
console.log('\n── checkEscalation ───────────────────────────────────────');

// Clean
{
  const r = checkEscalation(90, 0, 0, false);
  assertEq(r.required, false, '90/0/0/clean → no escalation');
  assertEq(r.reason, '', 'empty reason');
}

// Score below threshold
{
  const r = checkEscalation(50, 0, 0, false);
  assertEq(r.required, true, '50 → escalation');
  assert(r.reason.includes('60'), 'reason mentions threshold');
}

// Degraded + score below degraded threshold
{
  const r = checkEscalation(70, 0, 0, true);
  assertEq(r.required, true, '70 + degraded → escalate');
  assert(r.reason.includes('Degraded'), 'reason mentions degradation');
}

// Degraded but score high → no escalation on degraded alone
{
  const r = checkEscalation(80, 0, 0, true);
  assertEq(r.required, false, '80 + degraded (> 75) → no escalate');
}

// Any blocker
{
  const r = checkEscalation(90, 0, 1, false);
  assertEq(r.required, true, '1 blocker → escalate');
  assert(r.reason.includes('blocker'), 'reason mentions blocker');
}

// 3+ violations in a step
{
  const r = checkEscalation(90, 3, 0, false);
  assertEq(r.required, true, '3 violations → escalate');
  assert(r.reason.includes('violations'), 'reason mentions violations');
}

// 2 violations → not (yet) a trigger on its own
{
  const r = checkEscalation(90, 2, 0, false);
  assertEq(r.required, false, '2 violations → no escalate');
}

// Multi-cause: joined by ';'
{
  const r = checkEscalation(40, 3, 2, true);
  assertEq(r.required, true, 'multi-cause → escalate');
  assert(r.reason.includes(';'), 'multiple reasons joined');
}

// ============================================================================
// resolveChain
// ============================================================================
console.log('\n── resolveChain ──────────────────────────────────────────');

// No parent → self is root
resetPool();
{
  const chain = await resolveChain(fakePool, { id: 10, parent_prompt_id: null });
  assertEq(chain.chain_id, 10, 'no parent → chain_id = self');
  assertEq(chain.chain_step_number, 1, 'no parent → step 1');
  assertEq(queryCalls.length, 0, 'no queries when no parent');
}

// Parent chain → walks up
resetPool();
routes = [
  { match: /WHERE id = \?/, rows: [{ id: 5, parent_prompt_id: 1 }] },
];
{
  // first call returns parent 5→1, second call returns 1→null
  // Use dynamic routing via a counter
}

// Use routing with stateful responses
resetPool();
const walkStack: any[][] = [
  [{ id: 5, parent_prompt_id: 1 }],
  [{ id: 1, parent_prompt_id: null }],
];
routes = [{
  match: /WHERE id = \?/,
  rows: [], // overridden by function below
}];
// Replace fakePool.query for this test
const origQuery = fakePool.query;
fakePool.query = async (sql: string, params: any[] = []) => {
  queryCalls.push({ sql, params });
  if (/WHERE id = \?/.test(sql)) {
    const rows = walkStack.shift() || [];
    return [rows, {}] as any;
  }
  return [[], {}] as any;
};
{
  const chain = await resolveChain(fakePool, { id: 10, parent_prompt_id: 5 });
  assertEq(chain.chain_id, 1, 'walks up to root id=1');
  assertEq(chain.chain_step_number, 3, 'depth 3 (10 → 5 → 1)');
}
fakePool.query = origQuery;

// Parent missing in DB → stops walk
resetPool();
routes = [
  { match: /WHERE id = \?/, rows: [] }, // parent not found
];
{
  const chain = await resolveChain(fakePool, { id: 10, parent_prompt_id: 99 });
  assertEq(chain.chain_id, 10, 'missing parent → current is root');
  assertEq(chain.chain_step_number, 1, 'depth 1 when lookup fails');
}

// Cycle guard — visited tracking
resetPool();
const cycleStack: any[][] = [
  [{ id: 5, parent_prompt_id: 10 }], // cycle back to 10 (already visited)
];
fakePool.query = async (sql: string, params: any[] = []) => {
  queryCalls.push({ sql, params });
  if (/WHERE id = \?/.test(sql)) {
    const rows = cycleStack.shift() || [];
    return [rows, {}] as any;
  }
  return [[], {}] as any;
};
{
  const chain = await resolveChain(fakePool, { id: 10, parent_prompt_id: 5 });
  // After first lookup: rootId=5 depth=2, currentId=10 which is in visited → break
  assertEq(chain.chain_id, 5, 'cycle guard: stops at rootId=5');
  assertEq(chain.chain_step_number, 2, 'depth 2 before cycle break');
}
fakePool.query = origQuery;

// ============================================================================
// getChainHistory
// ============================================================================
console.log('\n── getChainHistory ───────────────────────────────────────');

resetPool();
routes = [{
  match: /FROM om_prompt_registry[\s\S]*WHERE chain_id/,
  rows: [
    { id: 1, quality_score: 90, chain_step_number: 1 },
    { id: 2, quality_score: 80, chain_step_number: 2 },
  ],
}];
{
  const hist = await getChainHistory(fakePool, 1);
  assertEq(hist.length, 2, 'returns 2 rows');
  assertEq(hist[0].id, 1, 'first row id=1');
  assertEq(queryCalls[0].params[0], 1, 'chain_id bound');
}

// ============================================================================
// scorePrompt: not-found throws
// ============================================================================
console.log('\n── scorePrompt: errors ───────────────────────────────────');

resetPool();
routes = [
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [] },
];
{
  let caught: Error | null = null;
  try {
    await scorePrompt(999);
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when prompt not found');
  assert(caught !== null && caught.message.includes('999'), 'error mentions id');
}

// ============================================================================
// scorePrompt: not scoreable yet → short-circuit
// ============================================================================
console.log('\n── scorePrompt: not scoreable ────────────────────────────');

resetPool();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    rows: [{
      id: 5, title: 't', status: 'draft', evaluator_status: null,
      parent_prompt_id: null,
    }],
  },
];
{
  const r = await scorePrompt(5);
  assertEq(r.scored, false, 'not scored');
  assert(r.reason && r.reason.includes('draft'), 'reason mentions status');
  assertEq(queryCalls.length, 1, 'only 1 query (no update/insert)');
}

// ============================================================================
// scorePrompt: full happy path
// ============================================================================
console.log('\n── scorePrompt: happy path ───────────────────────────────');

resetPool();
let updateCalled = false;
let insertCalled = false;

// Stateful query: first call returns the prompt; resolveChain queries parent walk;
// getChainHistory returns chain; UPDATE + INSERT are side effects.
const promptRow = {
  id: 7, title: 'Step 2', status: 'complete',
  parent_prompt_id: 3,
  violations_found: JSON.stringify(['v1', 'v2']), // 2×15 = -30
  issues_found: [],
  blockers_found: [],
  completion_status: 'success',
  evaluator_status: 'pass',
};

const parentRow = { id: 3, parent_prompt_id: null };

const chainHistoryRows = [
  { id: 3, title: 'Root', chain_step_number: 1, quality_score: 90, violation_count: 0, status: 'complete' },
  { id: 7, title: 'Step 2', chain_step_number: 2, quality_score: null, violation_count: 0, status: 'complete' },
];

fakePool.query = async (sql: string, params: any[] = []) => {
  queryCalls.push({ sql, params });
  if (/^UPDATE om_prompt_registry SET/i.test(sql.trim())) {
    updateCalled = true;
    return [{ affectedRows: 1 }, {}] as any;
  }
  if (/^INSERT INTO system_logs/i.test(sql.trim())) {
    insertCalled = true;
    return [{ insertId: 1 }, {}] as any;
  }
  if (/SELECT \* FROM om_prompt_registry WHERE id = \?/.test(sql)) {
    return [[promptRow], {}] as any;
  }
  if (/SELECT id, parent_prompt_id FROM om_prompt_registry WHERE id = \?/.test(sql)) {
    return [[parentRow], {}] as any;
  }
  if (/FROM om_prompt_registry[\s\S]*WHERE chain_id/.test(sql)) {
    return [chainHistoryRows, {}] as any;
  }
  return [[], {}] as any;
};

{
  const r = await scorePrompt(7);
  assertEq(r.scored, true, 'scored=true');
  assertEq(r.quality_score, 70, 'quality_score = 100 - 30 (2 violations)');
  assertEq(r.violation_count, 2, 'violation_count 2');
  assertEq(r.issue_count, 0, 'issue_count 0');
  assertEq(r.blocker_count, 0, 'blocker_count 0');
  assertEq(r.chain_id, 3, 'chain_id = root id');
  assertEq(r.chain_step_number, 2, 'step number 2');
  assertEq(r.confidence_level, 'medium', '70 → medium');
  assert(updateCalled, 'UPDATE executed');
  assert(insertCalled, 'system_logs INSERT executed');

  // previous_score from chain history (before update) should be 90 from id=3
  assertEq(r.previous_quality_score, 90, 'previous score from root step');

  // Rolling = avg of (90 from root) and (70 current) = 80
  assertEq(r.rolling_quality_score, 80, 'rolling = average(90, 70) = 80');
}
fakePool.query = origQuery;

// ============================================================================
// scorePrompt: evaluator_status path also scorable
// ============================================================================
console.log('\n── scorePrompt: evaluator path ───────────────────────────');

resetPool();
const evalRow = {
  id: 8, title: 'Eval', status: 'draft', // not complete/verified
  parent_prompt_id: null,
  violations_found: [],
  issues_found: [],
  blockers_found: [],
  completion_status: 'success',
  evaluator_status: 'pass', // triggers scorable branch
};

fakePool.query = async (sql: string, params: any[] = []) => {
  queryCalls.push({ sql, params });
  if (/^UPDATE/i.test(sql.trim())) return [{ affectedRows: 1 }, {}] as any;
  if (/^INSERT INTO system_logs/i.test(sql.trim())) return [{ insertId: 1 }, {}] as any;
  if (/SELECT \* FROM om_prompt_registry WHERE id = \?/.test(sql)) return [[evalRow], {}] as any;
  if (/WHERE chain_id/.test(sql)) return [[], {}] as any;
  return [[], {}] as any;
};
{
  const r = await scorePrompt(8);
  assertEq(r.scored, true, 'scorable via evaluator_status');
  assertEq(r.quality_score, 100, 'clean score');
  assertEq(r.confidence_level, 'high', '100 → high');
  assertEq(r.escalation_required, false, 'no escalation');
  assertEq(r.degradation_flag, false, 'no degradation (empty history)');
}
fakePool.query = origQuery;

// ============================================================================
// scorePrompt: escalation triggered
// ============================================================================
console.log('\n── scorePrompt: escalation ───────────────────────────────');

resetPool();
const badRow = {
  id: 9, title: 'Bad', status: 'complete',
  parent_prompt_id: null,
  violations_found: JSON.stringify(['v1', 'v2', 'v3']), // -45
  issues_found: [],
  blockers_found: JSON.stringify(['b1']),               // -20
  completion_status: 'failed',                          // -30
  evaluator_status: 'fail',                             // -20
};

let updatedEscalation: any = null;
fakePool.query = async (sql: string, params: any[] = []) => {
  queryCalls.push({ sql, params });
  if (/^UPDATE/i.test(sql.trim())) {
    // params index 6 = escalation_required
    updatedEscalation = params[6];
    return [{ affectedRows: 1 }, {}] as any;
  }
  if (/^INSERT INTO system_logs/i.test(sql.trim())) return [{ insertId: 1 }, {}] as any;
  if (/SELECT \* FROM om_prompt_registry WHERE id = \?/.test(sql)) return [[badRow], {}] as any;
  if (/WHERE chain_id/.test(sql)) return [[], {}] as any;
  return [[], {}] as any;
};
{
  const r = await scorePrompt(9);
  assertEq(r.quality_score, 0, 'floored to 0');
  assertEq(r.escalation_required, true, 'escalation required');
  assert(r.escalation_reason && r.escalation_reason.length > 0, 'escalation reason set');
  assertEq(updatedEscalation, 1, 'UPDATE persisted escalation_required=1');
}
fakePool.query = origQuery;

// ============================================================================
// getScore
// ============================================================================
console.log('\n── getScore ──────────────────────────────────────────────');

// Not found → throws
resetPool();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [] }];
{
  let caught: Error | null = null;
  try { await getScore(42); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when not found');
}

// Already scored → returns stored values
resetPool();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    rows: [{
      id: 11, title: 'Scored', status: 'complete',
      quality_score: 85, confidence_level: 'high',
      violation_count: 0, issue_count: 0, blocker_count: 0,
      degradation_flag: 0, escalation_required: 0, escalation_reason: null,
      chain_id: 11, chain_step_number: 1,
      rolling_quality_score: 85, previous_quality_score: null,
    }],
  },
  {
    match: /FROM om_prompt_registry[\s\S]*WHERE chain_id/,
    rows: [
      { id: 11, title: 'Scored', chain_step_number: 1, quality_score: 85,
        confidence_level: 'high', violation_count: 0, degradation_flag: 0, status: 'complete' },
    ],
  },
];
{
  const r = await getScore(11);
  assertEq(r.prompt_id, 11, 'prompt_id');
  assertEq(r.scored, true, 'scored=true');
  assertEq(r.quality_score, 85, 'quality_score from row');
  assertEq(r.confidence_level, 'high', 'confidence from row');
  assertEq(r.degradation_flag, false, 'degradation_flag coerced to bool');
  assertEq(r.escalation_required, false, 'escalation_required coerced');
  assertEq(r.chain_history.length, 1, 'chain history returned');
  assertEq(r.chain_history[0].step, 1, 'chain_history entry has step');
}

// Not yet scored but complete → delegates to scorePrompt
resetPool();
const freshRow = {
  id: 12, title: 'Fresh', status: 'complete',
  quality_score: null,
  parent_prompt_id: null,
  violations_found: [], issues_found: [], blockers_found: [],
  completion_status: 'success', evaluator_status: 'pass',
};
fakePool.query = async (sql: string, params: any[] = []) => {
  queryCalls.push({ sql, params });
  if (/^UPDATE/i.test(sql.trim())) return [{ affectedRows: 1 }, {}] as any;
  if (/^INSERT INTO system_logs/i.test(sql.trim())) return [{ insertId: 1 }, {}] as any;
  if (/SELECT \* FROM om_prompt_registry WHERE id = \?/.test(sql)) return [[freshRow], {}] as any;
  if (/WHERE chain_id/.test(sql)) return [[], {}] as any;
  return [[], {}] as any;
};
{
  const r = await getScore(12);
  assertEq(r.scored, true, 'getScore delegates to scorePrompt for unscored-complete');
  assertEq(r.quality_score, 100, 'clean score 100');
}
fakePool.query = origQuery;

// No chain_id → empty history
resetPool();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [{
    id: 13, title: 'Stale', status: 'draft',
    quality_score: 50, confidence_level: 'low',
    violation_count: 0, issue_count: 0, blocker_count: 0,
    degradation_flag: 0, escalation_required: 1, escalation_reason: 'low',
    chain_id: null, chain_step_number: null,
    rolling_quality_score: null, previous_quality_score: null,
  }],
}];
{
  const r = await getScore(13);
  assertEq(r.chain_history.length, 0, 'no chain_id → empty history');
  assertEq(r.escalation_required, true, 'escalation_required truthy');
}

// ============================================================================
// Query functions
// ============================================================================
console.log('\n── getLowConfidence / getDegraded / getEscalated ─────────');

resetPool();
routes = [{
  match: /WHERE confidence_level = 'low'/,
  rows: [{ id: 1, confidence_level: 'low' }, { id: 2, confidence_level: 'low' }],
}];
{
  const r = await getLowConfidence();
  assertEq(r.length, 2, 'returns 2 low-confidence prompts');
}

resetPool();
routes = [{
  match: /WHERE degradation_flag = 1/,
  rows: [{ id: 3 }],
}];
{
  const r = await getDegraded();
  assertEq(r.length, 1, 'returns degraded prompt');
}

resetPool();
routes = [{
  match: /WHERE escalation_required = 1/,
  rows: [{ id: 4 }, { id: 5 }, { id: 6 }],
}];
{
  const r = await getEscalated();
  assertEq(r.length, 3, 'returns 3 escalated prompts');
}

// ============================================================================
// Constants sanity
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');
assertEq(SCORING.BASE, 100, 'SCORING.BASE = 100');
assertEq(CONFIDENCE_THRESHOLDS.HIGH, 85, 'HIGH threshold = 85');
assertEq(CONFIDENCE_THRESHOLDS.MEDIUM, 60, 'MEDIUM threshold = 60');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  loud();
  console.error('Unhandled test error:', e);
  process.exit(1);
});
