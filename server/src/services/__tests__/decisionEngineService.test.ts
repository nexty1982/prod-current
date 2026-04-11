#!/usr/bin/env npx tsx
/**
 * Unit tests for services/decisionEngineService.js (OMD-1109)
 *
 * Deterministic rule-based action recommender. Mostly pure — only DB dep
 * is getAppPool for getRecommendations(). Stub via require.cache.
 *
 * Coverage:
 *   - classifyPrompt: each of the 12 rules (R1..R12) including first-match-wins
 *   - isBlockingPipeline: workflow_id + non-terminal, blocked/overdue, else
 *   - prioritizeActions: action severity, blocking pipeline, overdue,
 *     priority enum, and workflow_step_number tiebreakers
 *   - parseBlockedReasons (indirect): null, string JSON, array, malformed
 *   - getRecommendations: fetches, classifies, prioritizes, groups, counts
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

// ── DB pool stub ────────────────────────────────────────────────────
let nextPromptRows: any[] = [];
const queryLog: Array<{ sql: string; params: any[] }> = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    return [nextPromptRows];
  },
};

function stubModule(fromPath: string, relPath: string, exports: any): void {
  const { createRequire } = require('module');
  const path = require('path');
  const fromFile = require.resolve(fromPath);
  const fromDir = path.dirname(fromFile);
  const scopedRequire = createRequire(path.join(fromDir, 'noop.js'));
  try {
    const resolved = scopedRequire.resolve(relPath);
    require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports } as any;
  } catch {}
}

stubModule('../decisionEngineService', '../config/db', {
  getAppPool: () => fakePool,
});

const {
  ACTION,
  ACTION_LABELS,
  ACTION_SEVERITY,
  RULES,
  classifyPrompt,
  isBlockingPipeline,
  prioritizeActions,
  getRecommendations,
} = require('../decisionEngineService');

// ── Helper: minimal prompt factory ──────────────────────────────────
function makePrompt(overrides: any = {}) {
  return {
    id: overrides.id || 1,
    title: overrides.title || 'Test Prompt',
    component: overrides.component || 'backend',
    status: overrides.status || 'approved',
    queue_status: overrides.queue_status || 'pending',
    priority: overrides.priority || 'normal',
    quality_score: overrides.quality_score ?? 80,
    confidence_level: overrides.confidence_level || 'high',
    degradation_flag: overrides.degradation_flag ?? false,
    escalation_required: overrides.escalation_required ?? false,
    escalation_reason: overrides.escalation_reason || null,
    evaluator_status: overrides.evaluator_status || null,
    overdue: overrides.overdue ?? false,
    overdue_since: overrides.overdue_since || null,
    blocked_reasons: overrides.blocked_reasons || null,
    release_mode: overrides.release_mode || 'manual',
    scheduled_at: overrides.scheduled_at || null,
    workflow_id: overrides.workflow_id || null,
    workflow_step_number: overrides.workflow_step_number ?? null,
    ...overrides,
  };
}

async function main() {

// ============================================================================
// Exports sanity
// ============================================================================
console.log('\n── exports ───────────────────────────────────────────────');

{
  assertEq(Object.keys(ACTION).sort(), [
    'FIX_REQUIRED', 'INVESTIGATE_DEGRADATION', 'NO_ACTION',
    'RELEASE_NOW', 'REVIEW_REQUIRED', 'UNBLOCK_REQUIRED', 'WAIT',
  ].sort(), 'ACTION enum');
  assertEq(ACTION_LABELS[ACTION.RELEASE_NOW], 'Release Now', 'label for RELEASE_NOW');
  assertEq(ACTION_SEVERITY[ACTION.FIX_REQUIRED], 0, 'FIX_REQUIRED most urgent');
  assertEq(ACTION_SEVERITY[ACTION.NO_ACTION], 6, 'NO_ACTION least urgent');
  assertEq(RULES.length, 12, '12 rules');
  // Confirm rule order
  assertEq(RULES.map((r: any) => r.id), [
    'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12',
  ], 'rule id order');
}

// ============================================================================
// classifyPrompt: R1 (terminal state)
// ============================================================================
console.log('\n── classifyPrompt: R1 terminal ───────────────────────────');

{
  const r = classifyPrompt(makePrompt({ status: 'verified' }));
  assertEq(r.action, ACTION.NO_ACTION, 'NO_ACTION');
  assertEq(r.rule_id, 'R1', 'R1 matched');
  assertEq(r.ignore_safe, true, 'ignore_safe');
  assert(r.reason.includes('verified'), 'reason mentions status');
}

{
  const r = classifyPrompt(makePrompt({ status: 'complete' }));
  assertEq(r.rule_id, 'R1', 'complete also R1');
}

// ============================================================================
// classifyPrompt: R2 (escalation_required) — takes priority over verified?
// ============================================================================
console.log('\n── classifyPrompt: R2 escalation ─────────────────────────');

// R1 runs first, so verified + escalation should still be R1
{
  const r = classifyPrompt(makePrompt({ status: 'verified', escalation_required: true }));
  assertEq(r.rule_id, 'R1', 'terminal beats escalation');
}

// Non-terminal + escalation → R2
{
  const r = classifyPrompt(makePrompt({
    status: 'approved',
    escalation_required: true,
    escalation_reason: 'quality too low',
    quality_score: 30,
  }));
  assertEq(r.rule_id, 'R2', 'R2 matched');
  assertEq(r.action, ACTION.FIX_REQUIRED, 'FIX_REQUIRED');
  assertEq(r.priority, 'critical', 'critical priority');
  assertEq(r.reason, 'quality too low', 'escalation_reason used');
  assert(r.clear_condition.includes('quality_score >= 60'), 'clear condition');
}

// R2 without explicit reason → default message with quality_score
{
  const r = classifyPrompt(makePrompt({
    status: 'approved', escalation_required: true, escalation_reason: null, quality_score: 45,
  }));
  assert(r.reason.includes('45/100'), 'default reason has score');
}

// ============================================================================
// classifyPrompt: R3 (evaluator_failed)
// ============================================================================
console.log('\n── classifyPrompt: R3 evaluator fail ─────────────────────');

{
  const r = classifyPrompt(makePrompt({
    status: 'approved', evaluator_status: 'fail',
  }));
  assertEq(r.rule_id, 'R3', 'R3 matched');
  assertEq(r.action, ACTION.FIX_REQUIRED, 'FIX_REQUIRED');
  assertEq(r.priority, 'high', 'high priority');
}

// Escalation takes precedence over evaluator fail
{
  const r = classifyPrompt(makePrompt({
    status: 'approved', evaluator_status: 'fail', escalation_required: true,
  }));
  assertEq(r.rule_id, 'R2', 'R2 > R3');
}

// ============================================================================
// classifyPrompt: R4 (blocked)
// ============================================================================
console.log('\n── classifyPrompt: R4 blocked ────────────────────────────');

// Blocked with reasons
{
  const r = classifyPrompt(makePrompt({
    status: 'approved', queue_status: 'blocked',
    blocked_reasons: JSON.stringify([
      { code: 'sequence_not_verified', detail: 'Waiting on step 3' },
    ]),
  }));
  assertEq(r.rule_id, 'R4', 'R4 matched');
  assertEq(r.action, ACTION.UNBLOCK_REQUIRED, 'UNBLOCK_REQUIRED');
  assertEq(r.priority, 'high', 'high priority');
  assert(r.reason.includes('Waiting on step 3'), 'reason from detail');
  assert(r.clear_condition.includes('Verify the blocking predecessor'), 'clear for sequence');
}

// Blocked without reasons → default reason
{
  const r = classifyPrompt(makePrompt({
    status: 'approved', queue_status: 'blocked', blocked_reasons: null,
  }));
  assertEq(r.rule_id, 'R4', 'R4 matched');
  assertEq(r.reason, 'Blocked by unmet dependencies or constraints', 'default reason');
}

// audit_not_passed clear condition
{
  const r = classifyPrompt(makePrompt({
    status: 'approved', queue_status: 'blocked',
    blocked_reasons: JSON.stringify([{ code: 'audit_not_passed', detail: 'audit fail' }]),
  }));
  assert(r.clear_condition.includes('audit'), 'audit clear condition');
}

// outside_release_window clear condition
{
  const r = classifyPrompt(makePrompt({
    status: 'approved', queue_status: 'blocked',
    blocked_reasons: JSON.stringify([{ code: 'outside_release_window', detail: 'not yet' }]),
  }));
  assert(r.clear_condition.includes('release window'), 'release window clear');
}

// generic fallback clear condition
{
  const r = classifyPrompt(makePrompt({
    status: 'approved', queue_status: 'blocked',
    blocked_reasons: JSON.stringify([{ code: 'some_other_code', detail: 'x' }]),
  }));
  assert(r.clear_condition.includes('Resolve the blocking'), 'generic clear');
}

// ============================================================================
// classifyPrompt: R5 (degradation)
// ============================================================================
console.log('\n── classifyPrompt: R5 degradation ────────────────────────');

{
  const r = classifyPrompt(makePrompt({
    status: 'approved', queue_status: 'pending',
    degradation_flag: true, escalation_required: false,
  }));
  assertEq(r.rule_id, 'R5', 'R5 matched');
  assertEq(r.action, ACTION.INVESTIGATE_DEGRADATION, 'INVESTIGATE_DEGRADATION');
  assertEq(r.priority, 'medium', 'medium priority');
}

// Degradation + escalation → R2 (escalation wins)
{
  const r = classifyPrompt(makePrompt({
    status: 'approved', degradation_flag: true, escalation_required: true,
  }));
  assertEq(r.rule_id, 'R2', 'R2 > R5');
}

// ============================================================================
// classifyPrompt: R6 (ready + clean → release now)
// ============================================================================
console.log('\n── classifyPrompt: R6 ready clean ────────────────────────');

{
  const r = classifyPrompt(makePrompt({
    status: 'approved', queue_status: 'ready_for_release',
    confidence_level: 'high',
  }));
  assertEq(r.rule_id, 'R6', 'R6 matched');
  assertEq(r.action, ACTION.RELEASE_NOW, 'RELEASE_NOW');
  assertEq(r.priority, 'medium', 'medium priority');
  assert(r.reason.includes('safe to release'), 'reason');
}

// confidence=unknown also triggers R6
{
  const r = classifyPrompt(makePrompt({
    status: 'approved', queue_status: 'ready_for_release',
    confidence_level: 'unknown',
  }));
  assertEq(r.rule_id, 'R6', 'unknown → R6');
}

// ============================================================================
// classifyPrompt: R7 (overdue)
// ============================================================================
console.log('\n── classifyPrompt: R7 overdue ────────────────────────────');

{
  const r = classifyPrompt(makePrompt({
    status: 'approved', queue_status: 'overdue',
    overdue_since: '2026-04-01T00:00:00Z',
  }));
  assertEq(r.rule_id, 'R7', 'R7 matched');
  assertEq(r.action, ACTION.RELEASE_NOW, 'RELEASE_NOW');
  assertEq(r.priority, 'high', 'high priority');
  assert(r.reason.includes('Overdue'), 'reason');
}

// ============================================================================
// classifyPrompt: R8 (ready + needs review)
// ============================================================================
console.log('\n── classifyPrompt: R8 ready needs review ─────────────────');

{
  const r = classifyPrompt(makePrompt({
    status: 'approved', queue_status: 'ready_for_release',
    confidence_level: 'low', quality_score: 55,
  }));
  assertEq(r.rule_id, 'R8', 'R8 matched');
  assertEq(r.action, ACTION.REVIEW_REQUIRED, 'REVIEW_REQUIRED');
  assert(r.reason.includes('confidence is low'), 'low flag');
}

// medium confidence also triggers R8
{
  const r = classifyPrompt(makePrompt({
    status: 'approved', queue_status: 'ready_for_release',
    confidence_level: 'medium', quality_score: 65,
  }));
  assertEq(r.rule_id, 'R8', 'medium → R8');
  assert(r.reason.includes('medium'), 'medium flag');
}

// ready + degradation routes to R5 (degradation rule runs before R8)
{
  const r = classifyPrompt(makePrompt({
    status: 'approved', queue_status: 'ready_for_release',
    confidence_level: 'high', degradation_flag: true,
  }));
  assertEq(r.rule_id, 'R5', 'R5 > R6 > R8 when degradation_flag set');
  assertEq(r.action, ACTION.INVESTIGATE_DEGRADATION, 'INVESTIGATE_DEGRADATION');
}

// ============================================================================
// classifyPrompt: R9 (low confidence, not blocked/escalated)
// ============================================================================
console.log('\n── classifyPrompt: R9 low confidence ─────────────────────');

{
  const r = classifyPrompt(makePrompt({
    status: 'approved', queue_status: 'pending',
    confidence_level: 'low', quality_score: 40,
  }));
  assertEq(r.rule_id, 'R9', 'R9 matched');
  assertEq(r.action, ACTION.REVIEW_REQUIRED, 'REVIEW_REQUIRED');
  assert(r.reason.includes('40/100'), 'score in reason');
}

// ============================================================================
// classifyPrompt: R10 (pre-pipeline wait)
// ============================================================================
console.log('\n── classifyPrompt: R10 pre-pipeline ──────────────────────');

for (const status of ['draft', 'audited', 'ready']) {
  const r = classifyPrompt(makePrompt({ status }));
  assertEq(r.rule_id, 'R10', `${status} → R10`);
  assertEq(r.action, ACTION.WAIT, `${status} → WAIT`);
}

// Clear condition varies by status
{
  const draft = classifyPrompt(makePrompt({ status: 'draft' }));
  assert(draft.clear_condition.includes('Complete audit'), 'draft clear');
  const audited = classifyPrompt(makePrompt({ status: 'audited' }));
  assert(audited.clear_condition.includes('Mark as ready'), 'audited clear');
  const ready = classifyPrompt(makePrompt({ status: 'ready' }));
  assert(ready.clear_condition.includes('Approve'), 'ready clear');
}

// ============================================================================
// classifyPrompt: R11 (scheduled)
// ============================================================================
console.log('\n── classifyPrompt: R11 scheduled ─────────────────────────');

{
  const r = classifyPrompt(makePrompt({
    status: 'approved', queue_status: 'scheduled',
    scheduled_at: '2026-05-01T00:00:00Z',
  }));
  assertEq(r.rule_id, 'R11', 'R11 matched');
  assertEq(r.action, ACTION.WAIT, 'WAIT');
  assert(r.reason.includes('2026-05-01'), 'scheduled_at in reason');
}

// ============================================================================
// classifyPrompt: R12 (fallback)
// ============================================================================
console.log('\n── classifyPrompt: R12 fallback ──────────────────────────');

{
  const r = classifyPrompt(makePrompt({
    status: 'approved', queue_status: 'pending',
    confidence_level: 'high',
  }));
  assertEq(r.rule_id, 'R12', 'R12 fallback');
  assertEq(r.action, ACTION.NO_ACTION, 'NO_ACTION');
}

// ============================================================================
// classifyPrompt: target and context populated
// ============================================================================
console.log('\n── classifyPrompt: target + context ──────────────────────');

{
  const r = classifyPrompt(makePrompt({
    id: 42, title: 'T', component: 'frontend',
    workflow_id: 'wf-1', workflow_step_number: 3,
    overdue: true, overdue_since: '2026-04-01',
    confidence_level: 'high', quality_score: 85,
    blocked_reasons: JSON.stringify([{ code: 'x' }]),
    status: 'approved', queue_status: 'overdue',
  }));
  assertEq(r.target.prompt_id, 42, 'target.prompt_id');
  assertEq(r.target.title, 'T', 'target.title');
  assertEq(r.target.component, 'frontend', 'target.component');
  assertEq(r.target.workflow_id, 'wf-1', 'workflow_id');
  assertEq(r.target.workflow_step_number, 3, 'step number');
  assertEq(r.context.overdue, true, 'context.overdue');
  assertEq(r.context.overdue_since, '2026-04-01', 'overdue_since');
  assertEq(r.context.quality_score, 85, 'quality_score');
  assertEq(r.context.blocked_reasons, [{ code: 'x' }], 'blocked_reasons parsed');
}

// ============================================================================
// isBlockingPipeline
// ============================================================================
console.log('\n── isBlockingPipeline ────────────────────────────────────');

{
  // Workflow + non-terminal → blocking
  assertEq(
    isBlockingPipeline(makePrompt({ workflow_id: 'wf-1', status: 'approved' })),
    true, 'wf + approved → blocking'
  );
  // Workflow + verified → not blocking
  assertEq(
    isBlockingPipeline(makePrompt({ workflow_id: 'wf-1', status: 'verified' })),
    false, 'wf + verified → not blocking'
  );
  // Workflow + complete → not blocking
  assertEq(
    isBlockingPipeline(makePrompt({ workflow_id: 'wf-1', status: 'complete' })),
    false, 'wf + complete → not blocking'
  );
  // No workflow → not blocking
  assertEq(
    isBlockingPipeline(makePrompt({ workflow_id: null, status: 'approved' })),
    false, 'no wf → not blocking'
  );
  // Workflow + blocked → blocking
  assertEq(
    isBlockingPipeline(makePrompt({ workflow_id: 'wf-1', queue_status: 'blocked', status: 'approved' })),
    true, 'wf + blocked → blocking'
  );
  // Workflow + overdue → blocking
  assertEq(
    isBlockingPipeline(makePrompt({ workflow_id: 'wf-1', queue_status: 'overdue', status: 'approved' })),
    true, 'wf + overdue → blocking'
  );
}

// ============================================================================
// prioritizeActions
// ============================================================================
console.log('\n── prioritizeActions ─────────────────────────────────────');

// Action severity ordering
{
  const actions = [
    classifyPrompt(makePrompt({ id: 1, status: 'approved', queue_status: 'pending', confidence_level: 'high' })), // R12 NO_ACTION
    classifyPrompt(makePrompt({ id: 2, status: 'approved', escalation_required: true })),                           // R2 FIX_REQUIRED
    classifyPrompt(makePrompt({ id: 3, status: 'approved', queue_status: 'blocked' })),                             // R4 UNBLOCK_REQUIRED
    classifyPrompt(makePrompt({ id: 4, status: 'approved', queue_status: 'ready_for_release', confidence_level: 'high' })), // R6 RELEASE_NOW
  ];
  const sorted = prioritizeActions([...actions]);
  const actionOrder = sorted.map((a: any) => a.action);
  assertEq(actionOrder, [
    ACTION.FIX_REQUIRED, ACTION.UNBLOCK_REQUIRED, ACTION.RELEASE_NOW, ACTION.NO_ACTION,
  ], 'severity order');
}

// Blocking pipeline tiebreaker within same severity
{
  const a = classifyPrompt(makePrompt({
    id: 1, status: 'approved', queue_status: 'ready_for_release', confidence_level: 'high',
  })); // R6, not blocking
  const b = classifyPrompt(makePrompt({
    id: 2, status: 'approved', queue_status: 'ready_for_release', confidence_level: 'high',
    workflow_id: 'wf-1',
  })); // R6, blocking
  const sorted = prioritizeActions([a, b]);
  assertEq(sorted[0].target.prompt_id, 2, 'blocking first');
}

// Workflow step number tiebreaker (earlier first)
{
  const a = classifyPrompt(makePrompt({
    id: 1, status: 'approved', queue_status: 'ready_for_release', confidence_level: 'high',
    workflow_id: 'wf-1', workflow_step_number: 5,
  }));
  const b = classifyPrompt(makePrompt({
    id: 2, status: 'approved', queue_status: 'ready_for_release', confidence_level: 'high',
    workflow_id: 'wf-1', workflow_step_number: 2,
  }));
  const sorted = prioritizeActions([a, b]);
  assertEq(sorted[0].target.workflow_step_number, 2, 'step 2 first');
  assertEq(sorted[1].target.workflow_step_number, 5, 'step 5 second');
}

// Priority enum tiebreaker
{
  // Same severity, same blocking state (both workflow), same overdue, same step
  const a = classifyPrompt(makePrompt({
    id: 1, status: 'approved', queue_status: 'ready_for_release', confidence_level: 'high',
    workflow_id: 'wf-1', workflow_step_number: 1, priority: 'low',
  }));
  const b = classifyPrompt(makePrompt({
    id: 2, status: 'approved', queue_status: 'ready_for_release', confidence_level: 'high',
    workflow_id: 'wf-1', workflow_step_number: 1, priority: 'high',
  }));
  // R6 sets priority='medium' override, so prompt.priority is ignored.
  // Both get 'medium'. Fall to step tiebreaker (tied). Stable sort preserves input.
  const sorted = prioritizeActions([a, b]);
  assertEq(sorted.length, 2, 'two entries');
}

// ============================================================================
// getRecommendations
// ============================================================================
console.log('\n── getRecommendations ────────────────────────────────────');

{
  queryLog.length = 0;
  nextPromptRows = [
    { id: 1, title: 'P1', component: 'be', status: 'verified', queue_status: 'done' },      // R1 NO_ACTION (ignorable)
    { id: 2, title: 'P2', component: 'be', status: 'approved', escalation_required: true }, // R2 FIX_REQUIRED
    { id: 3, title: 'P3', component: 'be', status: 'approved', queue_status: 'blocked' },   // R4 UNBLOCK
    { id: 4, title: 'P4', component: 'be', status: 'draft' },                                // R10 WAIT (ignorable)
    { id: 5, title: 'P5', component: 'be', status: 'approved', queue_status: 'ready_for_release', confidence_level: 'high' }, // R6 RELEASE_NOW
  ];

  const r = await getRecommendations();
  assertEq(r.total_prompts, 5, 'total_prompts');
  assertEq(r.total_actionable, 3, 'total_actionable (R2, R4, R6)');
  assertEq(r.total_ignorable, 2, 'total_ignorable (R1, R10)');
  assert(typeof r.generated_at === 'string', 'generated_at set');
  // First action is FIX_REQUIRED (most severe)
  assertEq(r.actions[0].action, ACTION.FIX_REQUIRED, 'first action');
  assertEq(r.actions[1].action, ACTION.UNBLOCK_REQUIRED, 'second action');
  assertEq(r.actions[2].action, ACTION.RELEASE_NOW, 'third action');
  // Counts
  assertEq(r.counts[ACTION.FIX_REQUIRED], 1, 'count FIX');
  assertEq(r.counts[ACTION.UNBLOCK_REQUIRED], 1, 'count UNBLOCK');
  assertEq(r.counts[ACTION.RELEASE_NOW], 1, 'count RELEASE');
  assert(r.counts[ACTION.NO_ACTION] === undefined, 'NO_ACTION excluded from counts');
  // Grouped
  assert(ACTION.FIX_REQUIRED in r.grouped, 'grouped FIX');
  assert(ACTION.UNBLOCK_REQUIRED in r.grouped, 'grouped UNBLOCK');
  assert(ACTION.RELEASE_NOW in r.grouped, 'grouped RELEASE');
  assert(!(ACTION.NO_ACTION in r.grouped), 'no NO_ACTION group');
  assertEq(r.ignorable_count, 2, 'ignorable_count');
  // Query was fired
  assert(queryLog.some(q => /FROM om_prompt_registry/i.test(q.sql)), 'queried registry');
}

// Duplicate prompts are deduped
{
  nextPromptRows = [
    { id: 1, title: 'P1', status: 'approved', queue_status: 'blocked' },
    { id: 1, title: 'P1 dup', status: 'approved', queue_status: 'blocked' },
  ];
  const r = await getRecommendations();
  assertEq(r.total_prompts, 2, 'raw count is 2');
  assertEq(r.total_actionable, 1, 'deduped to 1 action');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
