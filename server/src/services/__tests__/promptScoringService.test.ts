#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptScoringService.js (OMD-1125)
 *
 * Deterministic scoring engine + chain/degradation/escalation tracking.
 *
 * Coverage:
 *   - calculateScore: base, violations, issues, blockers, all 3 completion
 *     penalties, evaluator fail/pending, JSON string + array inputs, floor at 0
 *   - deriveConfidence: null/undefined → unknown, all three bands, rolling
 *     worse-of logic
 *   - resolveChain: no parent, parent chain walk, cycle safety, depth limit
 *   - calculateRollingScore (via scorePrompt): average of history with current
 *   - detectDegradation: not enough steps, score decline, consecutive
 *     violations, persistent low scores, multi-reason
 *   - checkEscalation: below threshold, degraded + below 75, blockers,
 *     3+ violations, combined reasons
 *   - scorePrompt: not found, not scoreable, happy path with UPDATE + log
 *   - getScore: not found, unscored but complete → triggers scoring,
 *     scored prompt with chain_history
 *   - getLowConfidence, getDegraded, getEscalated: simple queries
 *   - parseJsonArray (via calculateScore): null/undefined/invalid JSON/non-array
 *
 * Stub ../config/db via require.cache with route-dispatch pool.
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

async function assertThrows(fn: () => Promise<any>, pattern: RegExp, message: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${message} — did not throw`);
    failed++;
  } catch (e: any) {
    if (pattern.test(e.message)) { console.log(`  PASS: ${message}`); passed++; }
    else { console.error(`  FAIL: ${message}\n         got: ${e.message}`); failed++; }
  }
}

// ── Route-dispatch fake pool ─────────────────────────────────────────
type Route = { match: RegExp; handler: (params: any[], sql: string) => any };
const queryLog: Array<{ sql: string; params: any[] }> = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) if (r.match.test(sql)) return r.handler(params, sql);
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

function resetAll() {
  queryLog.length = 0;
  routes = [];
}

const svc = require('../promptScoringService');

async function main() {

// ============================================================================
// calculateScore (pure)
// ============================================================================
console.log('\n── calculateScore: pure function ─────────────────────────');

{
  // Perfect prompt: no penalties, evaluator=pass
  const r = svc.calculateScore({
    violations_found: null,
    issues_found: null,
    blockers_found: null,
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 100, 'perfect → 100');
  assertEq(r.violation_count, 0, '0 violations');
  assertEq(r.issue_count, 0, '0 issues');
  assertEq(r.blocker_count, 0, '0 blockers');
  assertEq(r.breakdown.length, 0, 'empty breakdown');
}

{
  // 1 violation = -15
  const r = svc.calculateScore({
    violations_found: '[{"id":1}]',
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 85, '1 violation → 85');
  assertEq(r.violation_count, 1, 'count 1');
}

{
  // 2 issues = -16
  const r = svc.calculateScore({
    issues_found: '[{},{}]',
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 84, '2 issues → 84');
  assertEq(r.issue_count, 2, 'count 2');
}

{
  // 1 blocker = -20
  const r = svc.calculateScore({
    blockers_found: '[{}]',
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 80, '1 blocker → 80');
  assertEq(r.blocker_count, 1, 'count 1');
}

{
  // Partial completion = -15
  const r = svc.calculateScore({
    completion_status: 'partial',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 85, 'partial → 85');
}

{
  // Failed completion = -30
  const r = svc.calculateScore({
    completion_status: 'failed',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 70, 'failed → 70');
}

{
  // Blocked completion = -25
  const r = svc.calculateScore({
    completion_status: 'blocked',
    evaluator_status: 'pass',
  });
  assertEq(r.quality_score, 75, 'blocked → 75');
}

{
  // Evaluator fail = -20
  const r = svc.calculateScore({
    completion_status: 'success',
    evaluator_status: 'fail',
  });
  assertEq(r.quality_score, 80, 'evaluator fail → 80');
}

{
  // No evaluator = -5
  const r = svc.calculateScore({
    completion_status: 'success',
    evaluator_status: null,
  });
  assertEq(r.quality_score, 95, 'no evaluator → 95');
}

{
  // Pending evaluator = -5
  const r = svc.calculateScore({
    completion_status: 'success',
    evaluator_status: 'pending',
  });
  assertEq(r.quality_score, 95, 'pending evaluator → 95');
}

{
  // Heavy penalties → floor at 0
  const r = svc.calculateScore({
    violations_found: '[{},{},{},{},{}]', // 5 * 15 = 75
    blockers_found: '[{},{}]',            // 2 * 20 = 40
    completion_status: 'failed',           // 30
    evaluator_status: 'fail',              // 20
  });
  assertEq(r.quality_score, 0, 'floored at 0');
  assertEq(r.violation_count, 5, '5 violations');
  assertEq(r.blocker_count, 2, '2 blockers');
}

{
  // Already-parsed array
  const r = svc.calculateScore({
    violations_found: [{ id: 1 }, { id: 2 }],
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(r.violation_count, 2, 'array input counted');
  assertEq(r.quality_score, 70, 'array → -30 = 70');
}

{
  // Invalid JSON → empty array
  const r = svc.calculateScore({
    violations_found: 'not json',
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(r.violation_count, 0, 'invalid JSON → 0');
  assertEq(r.quality_score, 100, 'bad input ignored');
}

{
  // Non-array JSON → empty
  const r = svc.calculateScore({
    violations_found: '{"not":"array"}',
    completion_status: 'success',
    evaluator_status: 'pass',
  });
  assertEq(r.violation_count, 0, 'non-array JSON → 0');
}

// ============================================================================
// deriveConfidence
// ============================================================================
console.log('\n── deriveConfidence ──────────────────────────────────────');

assertEq(svc.deriveConfidence(null, null), 'unknown', 'null → unknown');
assertEq(svc.deriveConfidence(undefined, undefined), 'unknown', 'undefined → unknown');
assertEq(svc.deriveConfidence(100, null), 'high', '100 → high');
assertEq(svc.deriveConfidence(85, null), 'high', '85 → high');
assertEq(svc.deriveConfidence(84, null), 'medium', '84 → medium');
assertEq(svc.deriveConfidence(60, null), 'medium', '60 → medium');
assertEq(svc.deriveConfidence(59, null), 'low', '59 → low');
assertEq(svc.deriveConfidence(0, null), 'low', '0 → low');

// Rolling score worse-of
assertEq(svc.deriveConfidence(95, 50), 'low', 'high current + low rolling → low');
assertEq(svc.deriveConfidence(70, 90), 'medium', 'medium current, high rolling → medium');

// ============================================================================
// checkEscalation (pure)
// ============================================================================
console.log('\n── checkEscalation ───────────────────────────────────────');

{
  const r = svc.checkEscalation(90, 0, 0, false);
  assertEq(r.required, false, 'clean → no escalation');
}

{
  const r = svc.checkEscalation(50, 0, 0, false);
  assertEq(r.required, true, 'score<60 → escalate');
  assert(/50 below threshold/.test(r.reason), 'reason mentions score');
}

{
  const r = svc.checkEscalation(70, 0, 0, true);
  assertEq(r.required, true, 'degraded + score<75 → escalate');
  assert(/Degraded chain/.test(r.reason), 'reason mentions degraded');
}

{
  const r = svc.checkEscalation(80, 0, 0, true);
  assertEq(r.required, false, 'degraded but score≥75 → no escalation');
}

{
  const r = svc.checkEscalation(90, 0, 2, false);
  assertEq(r.required, true, 'blockers → escalate');
  assert(/2 blocker/.test(r.reason), 'reason mentions blockers');
}

{
  const r = svc.checkEscalation(90, 3, 0, false);
  assertEq(r.required, true, '3 violations → escalate');
  assert(/3 violations/.test(r.reason), 'reason mentions violations');
}

{
  // Combined reasons
  const r = svc.checkEscalation(40, 4, 2, true);
  assertEq(r.required, true, 'multi-reason → escalate');
  assert(r.reason.split(';').length >= 3, 'multiple reasons joined');
}

// ============================================================================
// detectDegradation (pure)
// ============================================================================
console.log('\n── detectDegradation ─────────────────────────────────────');

{
  // Not enough history
  const r = svc.detectDegradation([
    { quality_score: 90, violation_count: 0 },
    { quality_score: 85, violation_count: 0 },
  ], 85);
  assertEq(r.degraded, false, '2 steps → not enough');
  assertEq(r.reasons.length, 0, 'no reasons');
}

{
  // Score drop: 95 → 75 = 20 pts over 3 steps
  const r = svc.detectDegradation([
    { quality_score: 95, violation_count: 0 },
    { quality_score: 85, violation_count: 0 },
    { quality_score: 75, violation_count: 0 },
  ], 75);
  assertEq(r.degraded, true, '20pt drop → degraded');
  assert(r.reasons.some((x: string) => /declined/.test(x)), 'declining reason');
}

{
  // No drop
  const r = svc.detectDegradation([
    { quality_score: 90, violation_count: 0 },
    { quality_score: 92, violation_count: 0 },
    { quality_score: 95, violation_count: 0 },
  ], 95);
  assertEq(r.degraded, false, 'improving → not degraded');
}

{
  // Consecutive violations
  const r = svc.detectDegradation([
    { quality_score: 90, violation_count: 0 },
    { quality_score: 85, violation_count: 1 },
    { quality_score: 80, violation_count: 2 },
  ], 80);
  assertEq(r.degraded, true, '2 consecutive violations → degraded');
  assert(r.reasons.some((x: string) => /consecutive/.test(x)), 'consecutive reason');
}

{
  // Persistent low scores
  const r = svc.detectDegradation([
    { quality_score: 60, violation_count: 0 },
    { quality_score: 40, violation_count: 0 },
    { quality_score: 30, violation_count: 0 },
  ], 30);
  assertEq(r.degraded, true, 'persistent low → degraded');
  const reasons: string[] = r.reasons;
  assert(reasons.some((x: string) => /below 50/.test(x)), 'low score reason');
}

// ============================================================================
// resolveChain
// ============================================================================
console.log('\n── resolveChain ──────────────────────────────────────────');

resetAll();
{
  // No parent
  const r = await svc.resolveChain(fakePool, { id: 'p1', parent_prompt_id: null });
  assertEq(r.chain_id, 'p1', 'self-rooted');
  assertEq(r.chain_step_number, 1, 'depth 1');
}

resetAll();
{
  // 2-hop parent chain: p3 → p2 → p1
  routes = [
    {
      match: /SELECT id, parent_prompt_id FROM om_prompt_registry/i,
      handler: (params) => {
        const id = params[0];
        if (id === 'p2') return [[{ id: 'p2', parent_prompt_id: 'p1' }]];
        if (id === 'p1') return [[{ id: 'p1', parent_prompt_id: null }]];
        return [[]];
      },
    },
  ];
  const r = await svc.resolveChain(fakePool, { id: 'p3', parent_prompt_id: 'p2' });
  assertEq(r.chain_id, 'p1', 'root = p1');
  assertEq(r.chain_step_number, 3, 'depth 3');
}

resetAll();
{
  // Cycle safety: p2 → p1 → p2 (cycle)
  let calls = 0;
  routes = [
    {
      match: /SELECT id, parent_prompt_id FROM om_prompt_registry/i,
      handler: (params) => {
        calls++;
        const id = params[0];
        if (id === 'p2') return [[{ id: 'p2', parent_prompt_id: 'p1' }]];
        if (id === 'p1') return [[{ id: 'p1', parent_prompt_id: 'p2' }]];
        return [[]];
      },
    },
  ];
  const r = await svc.resolveChain(fakePool, { id: 'p1', parent_prompt_id: 'p2' });
  // Starts: id=p1 visited. currentId=p2. Query p2 → {parent:p1}. p1 in visited → break.
  assertEq(r.chain_id, 'p2', 'stops at p2 (cycle detected)');
  assert(calls <= 2, 'did not infinite loop');
}

// ============================================================================
// scorePrompt — not found
// ============================================================================
console.log('\n── scorePrompt: not found ────────────────────────────────');

resetAll();
routes = [
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, handler: () => [[]] },
];
await assertThrows(
  () => svc.scorePrompt('missing'),
  /Prompt not found: missing/,
  'missing prompt throws'
);

// ============================================================================
// scorePrompt — not scoreable
// ============================================================================
console.log('\n── scorePrompt: not scoreable ────────────────────────────');

resetAll();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[{
      id: 'p1', status: 'draft', evaluator_status: null,
    }]],
  },
];
{
  const r = await svc.scorePrompt('p1');
  assertEq(r.scored, false, 'not scored');
  assert(/not yet scoreable/.test(r.reason), 'reason given');
}

// ============================================================================
// scorePrompt — happy path (complete + clean)
// ============================================================================
console.log('\n── scorePrompt: happy path ───────────────────────────────');

resetAll();
{
  let updateParams: any[] = [];
  let logParams: any[] = [];
  const prompt = {
    id: 'p1', title: 'Step 1', status: 'complete',
    parent_prompt_id: null,
    violations_found: '[]',
    issues_found: '[]',
    blockers_found: '[]',
    completion_status: 'success',
    evaluator_status: 'pass',
  };
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      handler: () => [[prompt]],
    },
    {
      match: /FROM om_prompt_registry[\s\S]*WHERE chain_id/i,
      handler: () => [[]], // no prior chain history
    },
    {
      match: /UPDATE om_prompt_registry SET/i,
      handler: (params) => { updateParams = params; return [{ affectedRows: 1 }]; },
    },
    {
      match: /INSERT INTO system_logs/i,
      handler: (params) => { logParams = params; return [{}]; },
    },
  ];

  const r = await svc.scorePrompt('p1');
  assertEq(r.scored, true, 'scored');
  assertEq(r.quality_score, 100, 'clean → 100');
  assertEq(r.confidence_level, 'high', 'high confidence');
  assertEq(r.chain_id, 'p1', 'self-chain');
  assertEq(r.chain_step_number, 1, 'depth 1');
  assertEq(r.degradation_flag, false, 'not degraded');
  assertEq(r.escalation_required, false, 'no escalation');
  // Update params: [score, confidence, vCount, iCount, bCount, degraded, escRequired, escReason, chainId, chainStep, rolling, prev, id]
  assertEq(updateParams[0], 100, 'update: score');
  assertEq(updateParams[1], 'high', 'update: confidence');
  assertEq(updateParams[5], 0, 'update: degraded=0');
  assertEq(updateParams[6], 0, 'update: escalation=0');
  assertEq(updateParams[8], 'p1', 'update: chain_id=p1');
  assertEq(updateParams[12], 'p1', 'update: id=p1');
  assertEq(logParams[0], 'INFO', 'log level INFO');
  assert(logParams[1].includes('100/100'), 'log message has score');
}

// ============================================================================
// scorePrompt — escalation case
// ============================================================================
console.log('\n── scorePrompt: escalation ───────────────────────────────');

resetAll();
{
  let updateParams: any[] = [];
  let logLevel = '';
  const prompt = {
    id: 'p1', title: 'Bad step', status: 'complete',
    parent_prompt_id: null,
    violations_found: '[{},{},{}]', // -45
    issues_found: '[]',
    blockers_found: '[{}]',          // -20
    completion_status: 'success',
    evaluator_status: 'pass',
  };
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      handler: () => [[prompt]],
    },
    { match: /FROM om_prompt_registry[\s\S]*WHERE chain_id/i, handler: () => [[]] },
    {
      match: /UPDATE om_prompt_registry SET/i,
      handler: (params) => { updateParams = params; return [{ affectedRows: 1 }]; },
    },
    {
      match: /INSERT INTO system_logs/i,
      handler: (params) => { logLevel = params[0]; return [{}]; },
    },
  ];

  const r = await svc.scorePrompt('p1');
  assertEq(r.quality_score, 35, '100-45-20=35');
  assertEq(r.escalation_required, true, 'escalation required');
  assert(r.escalation_reason.length > 0, 'reason given');
  assertEq(updateParams[6], 1, 'update escalation=1');
  assertEq(logLevel, 'WARN', 'escalation → WARN log');
}

// ============================================================================
// getScore
// ============================================================================
console.log('\n── getScore ──────────────────────────────────────────────');

resetAll();
routes = [
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, handler: () => [[]] },
];
await assertThrows(
  () => svc.getScore('missing'),
  /Prompt not found: missing/,
  'missing prompt throws'
);

resetAll();
{
  // Already scored
  const prompt = {
    id: 'p1', title: 'Step', status: 'verified',
    quality_score: 85, confidence_level: 'high',
    violation_count: 1, issue_count: 0, blocker_count: 0,
    degradation_flag: 0, escalation_required: 0, escalation_reason: null,
    chain_id: 'c1', chain_step_number: 2,
    rolling_quality_score: 88, previous_quality_score: 90,
  };
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      handler: () => [[prompt]],
    },
    {
      match: /FROM om_prompt_registry[\s\S]*WHERE chain_id/i,
      handler: () => [[
        { id: 'px', title: 'Prior', chain_step_number: 1, quality_score: 90,
          confidence_level: 'high', violation_count: 0, degradation_flag: 0,
          status: 'verified' },
        { id: 'p1', title: 'Step', chain_step_number: 2, quality_score: 85,
          confidence_level: 'high', violation_count: 1, degradation_flag: 0,
          status: 'verified' },
      ]],
    },
  ];
  const r = await svc.getScore('p1');
  assertEq(r.scored, true, 'scored');
  assertEq(r.quality_score, 85, '85');
  assertEq(r.chain_history.length, 2, 'chain_history has 2 entries');
  assertEq(r.chain_history[0].step, 1, 'first entry step 1');
  assertEq(r.degradation_flag, false, 'coerced to bool');
}

resetAll();
{
  // Unscored complete → triggers scorePrompt
  const prompt = {
    id: 'p1', title: 'Step', status: 'complete',
    quality_score: null, parent_prompt_id: null,
    violations_found: '[]', issues_found: '[]', blockers_found: '[]',
    completion_status: 'success', evaluator_status: 'pass',
  };
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      handler: () => [[prompt]],
    },
    { match: /FROM om_prompt_registry[\s\S]*WHERE chain_id/i, handler: () => [[]] },
    { match: /UPDATE om_prompt_registry SET/i, handler: () => [{ affectedRows: 1 }] },
    { match: /INSERT INTO system_logs/i, handler: () => [{}] },
  ];
  const r = await svc.getScore('p1');
  assertEq(r.scored, true, 'triggered scoring');
  assertEq(r.quality_score, 100, 'scored 100');
}

// ============================================================================
// getLowConfidence / getDegraded / getEscalated
// ============================================================================
console.log('\n── simple queries ────────────────────────────────────────');

resetAll();
routes = [
  {
    match: /WHERE confidence_level = 'low'/i,
    handler: () => [[{ id: 'p1' }, { id: 'p2' }]],
  },
];
{
  const r = await svc.getLowConfidence();
  assertEq(r.length, 2, 'low confidence returns 2');
}

resetAll();
routes = [
  {
    match: /WHERE degradation_flag = 1/i,
    handler: () => [[{ id: 'p1' }]],
  },
];
{
  const r = await svc.getDegraded();
  assertEq(r.length, 1, 'degraded returns 1');
}

resetAll();
routes = [
  {
    match: /WHERE escalation_required = 1/i,
    handler: () => [[{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]],
  },
];
{
  const r = await svc.getEscalated();
  assertEq(r.length, 3, 'escalated returns 3');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
