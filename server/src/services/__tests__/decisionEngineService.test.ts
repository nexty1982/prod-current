#!/usr/bin/env npx tsx
/**
 * Unit tests for services/decisionEngineService.js (OMD-1195)
 *
 * Deterministic rule-based action recommendation engine. Pure logic
 * except for getRecommendations which queries `om_prompt_registry` via
 * getAppPool(). We stub `config/db` via require.cache.
 *
 * Coverage:
 *   - classifyPrompt:
 *       · R1 terminal state (verified/complete) → NO_ACTION
 *       · R2 escalation_required → FIX_REQUIRED (critical)
 *       · R3 evaluator_status=fail → FIX_REQUIRED (high)
 *       · R4 blocked with parsed reasons → UNBLOCK_REQUIRED
 *       · R4 clear_condition for different block codes
 *       · R5 degradation without escalation → INVESTIGATE_DEGRADATION
 *       · R6 ready + high/unknown confidence + clean → RELEASE_NOW
 *       · R7 overdue → RELEASE_NOW (high)
 *       · R8 ready + low/medium confidence or flags → REVIEW_REQUIRED
 *       · R9 low confidence but not blocked → REVIEW_REQUIRED
 *       · R10 draft/audited/ready → WAIT
 *       · R11 approved+scheduled → WAIT
 *       · R12 fallback → NO_ACTION
 *       · Rule precedence: R2 beats R3 beats R4 etc.
 *       · Output shape: target/context/blocking_pipeline
 *   - isBlockingPipeline:
 *       · workflow + non-terminal → true
 *       · terminal → false
 *       · blocked + workflow → true
 *       · no workflow → false
 *   - prioritizeActions:
 *       · Sorted by action severity first
 *       · Ties broken by blocking_pipeline
 *       · Then overdue
 *       · Then priority enum
 *       · Then workflow_step_number
 *   - getRecommendations:
 *       · Queries om_prompt_registry
 *       · Classifies each prompt
 *       · Splits actionable vs ignorable
 *       · Groups actionable by type
 *       · Deduplicates by id
 *       · Counts by action
 *
 * Run: npx tsx server/src/services/__tests__/decisionEngineService.test.ts
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
const sutDir = nodePath.dirname(require.resolve('../decisionEngineService'));
const dbAbs = require.resolve(nodePath.resolve(sutDir, '..', 'config', 'db'));

type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
let queryRows: any[] = [];
let queryThrows = false;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (queryThrows) throw new Error('fake db failure');
    return [queryRows];
  },
};

const dbStub = {
  getAppPool: () => fakePool,
};

require.cache[dbAbs] = {
  id: dbAbs,
  filename: dbAbs,
  loaded: true,
  exports: dbStub,
} as any;

const svc = require('../decisionEngineService');
const {
  ACTION,
  ACTION_LABELS,
  ACTION_SEVERITY,
  classifyPrompt,
  isBlockingPipeline,
  prioritizeActions,
  getRecommendations,
} = svc;

function resetDb() {
  queryLog.length = 0;
  queryRows = [];
  queryThrows = false;
}

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// Minimal prompt factory — tests override fields explicitly
function makePrompt(overrides: any = {}) {
  return {
    id: 1,
    title: 'Test Prompt',
    component: 'test.component',
    status: 'approved',
    queue_status: 'pending',
    priority: 'normal',
    quality_score: 75,
    confidence_level: 'high',
    degradation_flag: false,
    escalation_required: false,
    escalation_reason: null,
    evaluator_status: 'pass',
    completion_status: null,
    overdue: false,
    overdue_since: null,
    blocked_reasons: null,
    release_mode: 'automatic',
    scheduled_at: null,
    workflow_id: null,
    workflow_step_number: null,
    sequence_order: 1,
    depends_on_prompt_id: null,
    dependency_type: null,
    ...overrides,
  };
}

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(ACTION.RELEASE_NOW, 'RELEASE_NOW', 'ACTION.RELEASE_NOW');
assertEq(ACTION.FIX_REQUIRED, 'FIX_REQUIRED', 'ACTION.FIX_REQUIRED');
assertEq(ACTION_LABELS['FIX_REQUIRED'], 'Fix Required', 'FIX_REQUIRED label');
assertEq(ACTION_LABELS['NO_ACTION'], 'No Action', 'NO_ACTION label');
assertEq(ACTION_SEVERITY['FIX_REQUIRED'], 0, 'FIX_REQUIRED severity 0 (most urgent)');
assertEq(ACTION_SEVERITY['NO_ACTION'], 6, 'NO_ACTION severity 6 (least urgent)');
assert(ACTION_SEVERITY['UNBLOCK_REQUIRED'] < ACTION_SEVERITY['RELEASE_NOW'], 'unblock before release');

// ============================================================================
// classifyPrompt: R1 terminal state
// ============================================================================
console.log('\n── classifyPrompt: R1 terminal ───────────────────────────');

{
  const r = classifyPrompt(makePrompt({ status: 'verified' }));
  assertEq(r.action, ACTION.NO_ACTION, 'verified → NO_ACTION');
  assertEq(r.rule_id, 'R1', 'rule R1');
  assertEq(r.ignore_safe, true, 'ignore_safe');
}
{
  const r = classifyPrompt(makePrompt({ status: 'complete' }));
  assertEq(r.action, ACTION.NO_ACTION, 'complete → NO_ACTION');
  assertEq(r.rule_id, 'R1', 'rule R1');
}

// ============================================================================
// classifyPrompt: R2 escalation_required
// ============================================================================
console.log('\n── classifyPrompt: R2 escalation ─────────────────────────');

{
  const r = classifyPrompt(makePrompt({
    escalation_required: true,
    escalation_reason: 'quality dropped below threshold',
    quality_score: 40,
  }));
  assertEq(r.action, ACTION.FIX_REQUIRED, 'FIX_REQUIRED');
  assertEq(r.rule_id, 'R2', 'rule R2');
  assertEq(r.priority, 'critical', 'priority critical');
  assertEq(r.reason, 'quality dropped below threshold', 'uses escalation_reason');
  assertEq(r.ignore_safe, false, 'not ignore_safe');
}

// Without escalation_reason → fallback message
{
  const r = classifyPrompt(makePrompt({
    escalation_required: true,
    escalation_reason: null,
    quality_score: 30,
  }));
  assert(r.reason.includes('30/100'), 'fallback reason uses quality_score');
}

// R2 beats R3 (both would trigger)
{
  const r = classifyPrompt(makePrompt({
    escalation_required: true,
    evaluator_status: 'fail',
  }));
  assertEq(r.rule_id, 'R2', 'R2 precedence over R3');
}

// ============================================================================
// classifyPrompt: R3 evaluator_failed
// ============================================================================
console.log('\n── classifyPrompt: R3 evaluator_failed ───────────────────');

{
  const r = classifyPrompt(makePrompt({ evaluator_status: 'fail' }));
  assertEq(r.action, ACTION.FIX_REQUIRED, 'FIX_REQUIRED');
  assertEq(r.rule_id, 'R3', 'rule R3');
  assertEq(r.priority, 'high', 'priority high');
}

// ============================================================================
// classifyPrompt: R4 blocked_dependency
// ============================================================================
console.log('\n── classifyPrompt: R4 blocked ────────────────────────────');

// Blocked with structured reasons array
{
  const reasons = [
    { code: 'sequence_not_verified', detail: 'Predecessor #42 not verified' },
  ];
  const r = classifyPrompt(makePrompt({
    queue_status: 'blocked',
    blocked_reasons: JSON.stringify(reasons),
  }));
  assertEq(r.action, ACTION.UNBLOCK_REQUIRED, 'UNBLOCK_REQUIRED');
  assertEq(r.rule_id, 'R4', 'rule R4');
  assertEq(r.priority, 'high', 'priority high');
  assert(r.reason.includes('Predecessor #42'), 'reason uses detail');
  assert(r.clear_condition.includes('predecessor'), 'clear_condition for sequence_not_verified');
  assertEq(r.context.blocked_reasons.length, 1, 'context.blocked_reasons parsed');
}

// Blocked with audit_not_passed code
{
  const reasons = [{ code: 'audit_not_passed', detail: 'Audit failed' }];
  const r = classifyPrompt(makePrompt({
    queue_status: 'blocked',
    blocked_reasons: JSON.stringify(reasons),
  }));
  assert(r.clear_condition.includes('audit'), 'clear_condition for audit');
}

// Blocked with outside_release_window
{
  const reasons = [{ code: 'outside_release_window', detail: 'Not in window' }];
  const r = classifyPrompt(makePrompt({
    queue_status: 'blocked',
    blocked_reasons: JSON.stringify(reasons),
  }));
  assert(r.clear_condition.includes('window'), 'clear_condition for release window');
}

// Blocked with unknown code → generic
{
  const reasons = [{ code: 'unknown_code', detail: 'Some reason' }];
  const r = classifyPrompt(makePrompt({
    queue_status: 'blocked',
    blocked_reasons: JSON.stringify(reasons),
  }));
  assert(r.clear_condition.includes('Resolve'), 'generic clear_condition');
}

// Blocked with no reasons → generic reason
{
  const r = classifyPrompt(makePrompt({
    queue_status: 'blocked',
    blocked_reasons: null,
  }));
  assertEq(r.action, ACTION.UNBLOCK_REQUIRED, 'UNBLOCK_REQUIRED');
  assert(r.reason.includes('unmet dependencies'), 'generic reason');
}

// Blocked with malformed JSON → treated as empty
{
  const r = classifyPrompt(makePrompt({
    queue_status: 'blocked',
    blocked_reasons: '{not-json',
  }));
  assertEq(r.action, ACTION.UNBLOCK_REQUIRED, 'still UNBLOCK_REQUIRED');
  assertEq(r.context.blocked_reasons.length, 0, 'malformed → empty array');
}

// ============================================================================
// classifyPrompt: R5 degradation
// ============================================================================
console.log('\n── classifyPrompt: R5 degradation ────────────────────────');

{
  const r = classifyPrompt(makePrompt({
    degradation_flag: true,
    escalation_required: false,
  }));
  assertEq(r.action, ACTION.INVESTIGATE_DEGRADATION, 'INVESTIGATE_DEGRADATION');
  assertEq(r.rule_id, 'R5', 'rule R5');
  assertEq(r.priority, 'medium', 'priority medium');
}

// Degradation + escalation → R2 wins
{
  const r = classifyPrompt(makePrompt({
    degradation_flag: true,
    escalation_required: true,
  }));
  assertEq(r.rule_id, 'R2', 'R2 beats R5');
}

// ============================================================================
// classifyPrompt: R6 ready clean release
// ============================================================================
console.log('\n── classifyPrompt: R6 ready_clean_release ────────────────');

{
  const r = classifyPrompt(makePrompt({
    queue_status: 'ready_for_release',
    confidence_level: 'high',
  }));
  assertEq(r.action, ACTION.RELEASE_NOW, 'RELEASE_NOW');
  assertEq(r.rule_id, 'R6', 'rule R6');
  assertEq(r.priority, 'medium', 'priority medium');
}

// confidence_level=unknown also qualifies
{
  const r = classifyPrompt(makePrompt({
    queue_status: 'ready_for_release',
    confidence_level: 'unknown',
  }));
  assertEq(r.action, ACTION.RELEASE_NOW, 'unknown also releases');
}

// ============================================================================
// classifyPrompt: R7 overdue
// ============================================================================
console.log('\n── classifyPrompt: R7 overdue ────────────────────────────');

{
  const r = classifyPrompt(makePrompt({
    queue_status: 'overdue',
    overdue: true,
    overdue_since: '2026-04-01T00:00:00Z',
  }));
  assertEq(r.action, ACTION.RELEASE_NOW, 'RELEASE_NOW');
  assertEq(r.rule_id, 'R7', 'rule R7');
  assertEq(r.priority, 'high', 'priority high');
  assert(r.reason.includes('2026-04-01'), 'reason mentions overdue_since');
}

// ============================================================================
// classifyPrompt: R8 ready_needs_review
// ============================================================================
console.log('\n── classifyPrompt: R8 ready_needs_review ─────────────────');

// Low confidence but ready
{
  const r = classifyPrompt(makePrompt({
    queue_status: 'ready_for_release',
    confidence_level: 'low',
    quality_score: 45,
  }));
  assertEq(r.action, ACTION.REVIEW_REQUIRED, 'REVIEW_REQUIRED');
  assertEq(r.rule_id, 'R8', 'rule R8');
  assert(r.reason.includes('low'), 'reason mentions low');
}

// Medium confidence
{
  const r = classifyPrompt(makePrompt({
    queue_status: 'ready_for_release',
    confidence_level: 'medium',
    quality_score: 65,
  }));
  assertEq(r.rule_id, 'R8', 'medium also triggers R8');
  assert(r.reason.includes('medium'), 'reason mentions medium');
}

// Degradation flag on ready prompt (no escalation)
{
  const r = classifyPrompt(makePrompt({
    queue_status: 'ready_for_release',
    confidence_level: 'high',
    degradation_flag: true,
  }));
  // R5 catches this first (degradation without escalation)
  assertEq(r.rule_id, 'R5', 'R5 degradation beats R8');
}

// ============================================================================
// classifyPrompt: R9 low confidence standalone
// ============================================================================
console.log('\n── classifyPrompt: R9 low_confidence_review ──────────────');

{
  const r = classifyPrompt(makePrompt({
    queue_status: 'pending',
    confidence_level: 'low',
    quality_score: 40,
  }));
  assertEq(r.action, ACTION.REVIEW_REQUIRED, 'REVIEW_REQUIRED');
  assertEq(r.rule_id, 'R9', 'rule R9');
  assert(r.reason.includes('40/100'), 'reason includes quality_score');
}

// ============================================================================
// classifyPrompt: R10 pre_pipeline
// ============================================================================
console.log('\n── classifyPrompt: R10 pre_pipeline ──────────────────────');

for (const s of ['draft', 'audited', 'ready'] as const) {
  const r = classifyPrompt(makePrompt({ status: s }));
  assertEq(r.action, ACTION.WAIT, `${s} → WAIT`);
  assertEq(r.rule_id, 'R10', `rule R10 for ${s}`);
  assertEq(r.ignore_safe, true, 'ignore_safe');
}

// Clear conditions are status-specific
{
  const r = classifyPrompt(makePrompt({ status: 'draft' }));
  assert(r.clear_condition.includes('audit'), 'draft → audit message');
}
{
  const r = classifyPrompt(makePrompt({ status: 'audited' }));
  assert(r.clear_condition.includes('ready'), 'audited → mark ready');
}
{
  const r = classifyPrompt(makePrompt({ status: 'ready' }));
  assert(r.clear_condition.includes('Approve'), 'ready → approve');
}

// ============================================================================
// classifyPrompt: R11 scheduled_waiting
// ============================================================================
console.log('\n── classifyPrompt: R11 scheduled ─────────────────────────');

{
  const r = classifyPrompt(makePrompt({
    status: 'approved',
    queue_status: 'scheduled',
    scheduled_at: '2026-05-01T00:00:00Z',
  }));
  assertEq(r.action, ACTION.WAIT, 'WAIT');
  assertEq(r.rule_id, 'R11', 'rule R11');
  assert(r.reason.includes('2026-05-01'), 'reason includes scheduled_at');
}

// ============================================================================
// classifyPrompt: R12 fallback
// ============================================================================
console.log('\n── classifyPrompt: R12 fallback ──────────────────────────');

{
  const r = classifyPrompt(makePrompt({
    status: 'approved',
    queue_status: 'pending',
    confidence_level: 'high',
  }));
  assertEq(r.action, ACTION.NO_ACTION, 'NO_ACTION');
  assertEq(r.rule_id, 'R12', 'rule R12');
  assertEq(r.ignore_safe, true, 'ignore_safe');
}

// ============================================================================
// classifyPrompt: output shape
// ============================================================================
console.log('\n── classifyPrompt: output shape ──────────────────────────');

{
  const p = makePrompt({
    id: 99,
    title: 'Shape Test',
    component: 'my.comp',
    workflow_id: 5,
    workflow_step_number: 3,
    queue_status: 'overdue',
    overdue: true,
  });
  const r = classifyPrompt(p);
  assertEq(r.target.prompt_id, 99, 'target.prompt_id');
  assertEq(r.target.title, 'Shape Test', 'target.title');
  assertEq(r.target.component, 'my.comp', 'target.component');
  assertEq(r.target.workflow_id, 5, 'target.workflow_id');
  assertEq(r.target.workflow_step_number, 3, 'target.workflow_step_number');
  assertEq(r.context.overdue, true, 'context.overdue');
  assertEq(r.context.escalation_required, false, 'context.escalation_required');
  assertEq(r.blocking_pipeline, true, 'blocking pipeline (workflow + overdue)');
}

// ============================================================================
// isBlockingPipeline
// ============================================================================
console.log('\n── isBlockingPipeline ────────────────────────────────────');

// Active workflow, non-terminal → true
assertEq(
  isBlockingPipeline(makePrompt({ workflow_id: 5, status: 'approved' })),
  true,
  'workflow + non-terminal → true'
);

// Workflow but terminal → false
assertEq(
  isBlockingPipeline(makePrompt({ workflow_id: 5, status: 'verified' })),
  false,
  'workflow + verified → false'
);
assertEq(
  isBlockingPipeline(makePrompt({ workflow_id: 5, status: 'complete' })),
  false,
  'workflow + complete → false'
);

// No workflow → false
assertEq(
  isBlockingPipeline(makePrompt({ workflow_id: null, queue_status: 'blocked' })),
  false,
  'no workflow → false'
);

// Blocked + workflow → true (even if status were terminal-ish, first branch catches)
assertEq(
  isBlockingPipeline(makePrompt({ workflow_id: 5, status: 'approved', queue_status: 'blocked' })),
  true,
  'blocked + workflow → true'
);

// ============================================================================
// prioritizeActions: sort by action severity
// ============================================================================
console.log('\n── prioritizeActions: severity ordering ──────────────────');

{
  const prompts = [
    makePrompt({ id: 1, status: 'approved', queue_status: 'pending' }),
    makePrompt({ id: 2, escalation_required: true }),
    makePrompt({ id: 3, queue_status: 'blocked', blocked_reasons: '[]' }),
    makePrompt({ id: 4, status: 'draft' }),
  ];
  const actions = prompts.map(p => classifyPrompt(p));
  prioritizeActions(actions);
  assertEq(actions[0].action, ACTION.FIX_REQUIRED, 'first: FIX_REQUIRED');
  assertEq(actions[1].action, ACTION.UNBLOCK_REQUIRED, 'second: UNBLOCK_REQUIRED');
  // Remaining two are WAIT and NO_ACTION (NO_ACTION severity 6 > WAIT 5)
  assertEq(actions[2].action, ACTION.WAIT, 'third: WAIT');
  assertEq(actions[3].action, ACTION.NO_ACTION, 'fourth: NO_ACTION');
}

// Tie-breaker: blocking_pipeline first within same severity
{
  const a = classifyPrompt(makePrompt({
    id: 10, status: 'approved', queue_status: 'blocked',
    blocked_reasons: '[]', workflow_id: null,
  }));
  const b = classifyPrompt(makePrompt({
    id: 11, status: 'approved', queue_status: 'blocked',
    blocked_reasons: '[]', workflow_id: 3,
  }));
  const sorted = prioritizeActions([a, b]);
  assertEq(sorted[0].target.prompt_id, 11, 'blocking pipeline first');
}

// Tie-breaker: overdue before non-overdue within same severity
{
  // Two RELEASE_NOW via ready_for_release
  const a = classifyPrompt(makePrompt({
    id: 20, queue_status: 'ready_for_release', confidence_level: 'high',
    overdue: false,
  }));
  const b = classifyPrompt(makePrompt({
    id: 21, queue_status: 'ready_for_release', confidence_level: 'high',
    overdue: true,
  }));
  const sorted = prioritizeActions([a, b]);
  assertEq(sorted[0].target.prompt_id, 21, 'overdue first within RELEASE_NOW');
}

// Tie-breaker: priority enum (critical > high > normal > low)
{
  const a = classifyPrompt(makePrompt({
    id: 30, status: 'approved', queue_status: 'pending',
    priority: 'low', confidence_level: 'high',
  }));
  const b = classifyPrompt(makePrompt({
    id: 31, status: 'approved', queue_status: 'pending',
    priority: 'high', confidence_level: 'high',
  }));
  // Both will land in R12 NO_ACTION; rule sets priority to null → falls back to p.priority
  const sorted = prioritizeActions([a, b]);
  assertEq(sorted[0].target.prompt_id, 31, 'higher priority first');
}

// Tie-breaker: workflow_step_number (lower first)
{
  const a = classifyPrompt(makePrompt({
    id: 40, status: 'draft', workflow_step_number: 5,
  }));
  const b = classifyPrompt(makePrompt({
    id: 41, status: 'draft', workflow_step_number: 2,
  }));
  const sorted = prioritizeActions([a, b]);
  assertEq(sorted[0].target.prompt_id, 41, 'earlier step first');
}

async function mainAsync() {

// ============================================================================
// getRecommendations
// ============================================================================
console.log('\n── getRecommendations ────────────────────────────────────');

// Empty DB
resetDb();
queryRows = [];
{
  const r = await getRecommendations();
  assertEq(r.total_prompts, 0, '0 total');
  assertEq(r.total_actionable, 0, '0 actionable');
  assertEq(r.total_ignorable, 0, '0 ignorable');
  assertEq(r.actions.length, 0, 'no actions');
  assert(/om_prompt_registry/.test(queryLog[0].sql), 'queried registry');
  assert(/ORDER BY sequence_order/.test(queryLog[0].sql), 'ordered by sequence');
  assert(typeof r.generated_at === 'string', 'generated_at timestamp');
}

// Mixed set: actionable + ignorable
resetDb();
queryRows = [
  makePrompt({ id: 1, status: 'verified' }),           // R1 → NO_ACTION (ignorable)
  makePrompt({ id: 2, escalation_required: true }),    // R2 → FIX_REQUIRED (actionable)
  makePrompt({ id: 3, evaluator_status: 'fail' }),     // R3 → FIX_REQUIRED (actionable)
  makePrompt({ id: 4, status: 'draft' }),              // R10 → WAIT (ignorable)
  makePrompt({                                          // R6 → RELEASE_NOW (actionable)
    id: 5, queue_status: 'ready_for_release', confidence_level: 'high',
  }),
];
{
  const r = await getRecommendations();
  assertEq(r.total_prompts, 5, '5 total');
  assertEq(r.total_actionable, 3, '3 actionable');
  assertEq(r.total_ignorable, 2, '2 ignorable');
  assertEq(r.counts[ACTION.FIX_REQUIRED], 2, '2 FIX_REQUIRED');
  assertEq(r.counts[ACTION.RELEASE_NOW], 1, '1 RELEASE_NOW');
  assert(r.grouped[ACTION.FIX_REQUIRED] !== undefined, 'grouped has FIX_REQUIRED');
  assertEq(r.grouped[ACTION.FIX_REQUIRED].length, 2, '2 in FIX_REQUIRED group');
  // Verified should NOT be in grouped (it's ignorable NO_ACTION)
  assert(r.grouped[ACTION.NO_ACTION] === undefined, 'NO_ACTION not grouped (ignorable)');
  // First action should be highest severity (FIX_REQUIRED)
  assertEq(r.actions[0].action, ACTION.FIX_REQUIRED, 'first is FIX_REQUIRED');
  assertEq(r.actions[r.actions.length - 1].action, ACTION.RELEASE_NOW, 'last is RELEASE_NOW');
}

// Dedup guard — same id appears twice, only classified once
resetDb();
queryRows = [
  makePrompt({ id: 100, escalation_required: true }),
  makePrompt({ id: 100, escalation_required: true }),
];
{
  const r = await getRecommendations();
  assertEq(r.total_prompts, 2, 'raw count still 2');
  assertEq(r.total_actionable, 1, 'deduped to 1 action');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end mainAsync

mainAsync().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
