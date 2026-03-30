/**
 * Decision Engine Service — Tests
 *
 * Tests the pure, deterministic functions exported by decisionEngineService:
 *   - classifyPrompt: correct action classification for each rule
 *   - prioritizeActions: ordering correctness across all 5 levels
 *   - No conflicting actions (one action per prompt)
 *   - Edge cases: combined flags (blocked+degraded, escalated+ready, etc.)
 *
 * Run:  node server/src/services/__tests__/decisionEngineService.test.js
 *
 * These tests mock `getAppPool` so no database is needed.
 */

// ─── Mock DB before requiring the service ─────────────────────────────────
const mockDb = { query: async () => [[]] };
require('../../config/db').getAppPool = () => mockDb;

const {
  ACTION, ACTION_SEVERITY, RULES,
  classifyPrompt, isBlockingPipeline, prioritizeActions,
} = require('../decisionEngineService');

// ─── Test Harness ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.error(`  ✗ ${label}`);
  }
}

function eq(actual, expected, label) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    failures.push(`${label} — expected "${expected}", got "${actual}"`);
    console.error(`  ✗ ${label} — expected "${expected}", got "${actual}"`);
  }
}

function section(name) {
  console.log(`\n── ${name} ──`);
}

// ─── Prompt Factory ───────────────────────────────────────────────────────

function makePrompt(overrides = {}) {
  return {
    id: 1,
    title: 'Test Prompt',
    component: 'saints',
    status: 'approved',
    queue_status: 'pending',
    priority: 'normal',
    quality_score: 75,
    confidence_level: 'high',
    degradation_flag: 0,
    escalation_required: 0,
    escalation_reason: null,
    evaluator_status: null,
    overdue: 0,
    overdue_since: null,
    blocked_reasons: null,
    release_mode: 'manual',
    scheduled_at: null,
    workflow_id: null,
    workflow_step_number: null,
    sequence_order: 1,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. ACTION CLASSIFICATION — one test per rule
// ═══════════════════════════════════════════════════════════════════════════

section('1. Action Classification');

// R1: Terminal states
{
  const r = classifyPrompt(makePrompt({ status: 'verified' }));
  eq(r.action, ACTION.NO_ACTION, 'R1: verified → NO_ACTION');
  eq(r.rule_id, 'R1', 'R1: rule_id');
  assert(r.ignore_safe === true, 'R1: ignore_safe is true');
}
{
  const r = classifyPrompt(makePrompt({ status: 'complete' }));
  eq(r.action, ACTION.NO_ACTION, 'R1: complete → NO_ACTION');
}

// R2: Escalation required
{
  const r = classifyPrompt(makePrompt({ escalation_required: 1, escalation_reason: 'Quality below threshold' }));
  eq(r.action, ACTION.FIX_REQUIRED, 'R2: escalated → FIX_REQUIRED');
  eq(r.priority, 'critical', 'R2: priority is critical');
  eq(r.rule_id, 'R2', 'R2: rule_id');
  assert(r.reason.includes('Quality below threshold'), 'R2: reason includes escalation_reason');
}

// R3: Evaluator failed
{
  const r = classifyPrompt(makePrompt({ evaluator_status: 'fail' }));
  eq(r.action, ACTION.FIX_REQUIRED, 'R3: evaluator fail → FIX_REQUIRED');
  eq(r.priority, 'high', 'R3: priority is high');
  eq(r.rule_id, 'R3', 'R3: rule_id');
}

// R4: Blocked
{
  const reasons = JSON.stringify([{ code: 'sequence_not_verified', detail: 'Step 2 not verified' }]);
  const r = classifyPrompt(makePrompt({ queue_status: 'blocked', blocked_reasons: reasons }));
  eq(r.action, ACTION.UNBLOCK_REQUIRED, 'R4: blocked → UNBLOCK_REQUIRED');
  eq(r.priority, 'high', 'R4: priority is high');
  assert(r.reason.includes('Step 2 not verified'), 'R4: reason includes blocked detail');
  assert(r.clear_condition.includes('predecessor'), 'R4: clear_condition mentions predecessor');
}

// R5: Degradation (not escalated)
{
  const r = classifyPrompt(makePrompt({ degradation_flag: 1, escalation_required: 0 }));
  eq(r.action, ACTION.INVESTIGATE_DEGRADATION, 'R5: degraded (no escalation) → INVESTIGATE_DEGRADATION');
  eq(r.priority, 'medium', 'R5: priority is medium');
}

// R6: Ready + high confidence + clean
{
  const r = classifyPrompt(makePrompt({
    queue_status: 'ready_for_release', confidence_level: 'high',
    escalation_required: 0, degradation_flag: 0,
  }));
  eq(r.action, ACTION.RELEASE_NOW, 'R6: ready+high confidence → RELEASE_NOW');
  eq(r.rule_id, 'R6', 'R6: rule_id');
}

// R6 also matches unknown confidence
{
  const r = classifyPrompt(makePrompt({
    queue_status: 'ready_for_release', confidence_level: 'unknown',
    escalation_required: 0, degradation_flag: 0,
  }));
  eq(r.action, ACTION.RELEASE_NOW, 'R6: ready+unknown confidence → RELEASE_NOW');
}

// R7: Overdue
{
  const r = classifyPrompt(makePrompt({ queue_status: 'overdue', overdue: 1, overdue_since: '2026-03-28' }));
  eq(r.action, ACTION.RELEASE_NOW, 'R7: overdue → RELEASE_NOW');
  eq(r.priority, 'high', 'R7: priority is high');
  assert(r.reason.includes('2026-03-28'), 'R7: reason includes overdue_since date');
}

// R8: Ready but low confidence
{
  const r = classifyPrompt(makePrompt({
    queue_status: 'ready_for_release', confidence_level: 'low',
    quality_score: 40,
  }));
  eq(r.action, ACTION.REVIEW_REQUIRED, 'R8: ready+low confidence → REVIEW_REQUIRED');
  eq(r.rule_id, 'R8', 'R8: rule_id');
  assert(r.reason.includes('low'), 'R8: reason mentions low confidence');
}

// R8: Ready but medium confidence
{
  const r = classifyPrompt(makePrompt({
    queue_status: 'ready_for_release', confidence_level: 'medium',
    quality_score: 55,
  }));
  eq(r.action, ACTION.REVIEW_REQUIRED, 'R8: ready+medium confidence → REVIEW_REQUIRED');
}

// R9: Low confidence, not blocked, not escalated
{
  const r = classifyPrompt(makePrompt({
    confidence_level: 'low', quality_score: 35,
    queue_status: 'pending', escalation_required: 0,
  }));
  eq(r.action, ACTION.REVIEW_REQUIRED, 'R9: low confidence (pending) → REVIEW_REQUIRED');
  eq(r.rule_id, 'R9', 'R9: rule_id');
}

// R10: Pre-pipeline states
for (const status of ['draft', 'audited', 'ready']) {
  const r = classifyPrompt(makePrompt({ status }));
  eq(r.action, ACTION.WAIT, `R10: ${status} → WAIT`);
  assert(r.ignore_safe === true, `R10: ${status} ignore_safe is true`);
}

// R11: Approved + scheduled
{
  const r = classifyPrompt(makePrompt({ status: 'approved', queue_status: 'scheduled' }));
  eq(r.action, ACTION.WAIT, 'R11: approved+scheduled → WAIT');
  eq(r.rule_id, 'R11', 'R11: rule_id');
}

// R12: Fallback
{
  const r = classifyPrompt(makePrompt({ status: 'executing', queue_status: 'pending' }));
  eq(r.action, ACTION.NO_ACTION, 'R12: executing+pending (no flags) → NO_ACTION (fallback)');
  eq(r.rule_id, 'R12', 'R12: rule_id');
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. EDGE CASES — combined flags, rule ordering
// ═══════════════════════════════════════════════════════════════════════════

section('2. Edge Cases');

// Escalated + ready_for_release → R2 FIX wins over R6 RELEASE
{
  const r = classifyPrompt(makePrompt({
    escalation_required: 1, queue_status: 'ready_for_release',
    confidence_level: 'high', degradation_flag: 0,
  }));
  eq(r.action, ACTION.FIX_REQUIRED, 'Edge: escalated+ready → FIX_REQUIRED (R2 before R6)');
  eq(r.rule_id, 'R2', 'Edge: escalated+ready matched R2');
}

// Blocked + degraded → R4 UNBLOCK wins over R5 INVESTIGATE
{
  const r = classifyPrompt(makePrompt({
    queue_status: 'blocked', degradation_flag: 1,
  }));
  eq(r.action, ACTION.UNBLOCK_REQUIRED, 'Edge: blocked+degraded → UNBLOCK_REQUIRED (R4 before R5)');
  eq(r.rule_id, 'R4', 'Edge: blocked+degraded matched R4');
}

// Escalated + degraded → R2 FIX wins over R5 INVESTIGATE
{
  const r = classifyPrompt(makePrompt({
    escalation_required: 1, degradation_flag: 1,
  }));
  eq(r.action, ACTION.FIX_REQUIRED, 'Edge: escalated+degraded → FIX_REQUIRED (R2 before R5)');
}

// Degradation + escalation_required → R2 wins (R5 explicitly checks !escalation_required)
{
  const r = classifyPrompt(makePrompt({
    degradation_flag: 1, escalation_required: 1,
  }));
  eq(r.action, ACTION.FIX_REQUIRED, 'Edge: degraded+escalated → FIX (R5 skips due to !escalation check)');
}

// Verified + escalated → R1 wins (terminal first)
{
  const r = classifyPrompt(makePrompt({
    status: 'verified', escalation_required: 1,
  }));
  eq(r.action, ACTION.NO_ACTION, 'Edge: verified+escalated → NO_ACTION (R1 terminal wins)');
}

// Evaluator fail + blocked → R3 FIX wins over R4 UNBLOCK (rule order)
{
  const r = classifyPrompt(makePrompt({
    evaluator_status: 'fail', queue_status: 'blocked',
  }));
  eq(r.action, ACTION.FIX_REQUIRED, 'Edge: eval fail+blocked → FIX_REQUIRED (R3 before R4)');
}

// Overdue + degraded → R5 INVESTIGATE wins over R7 (R5 before R7)
{
  const r = classifyPrompt(makePrompt({
    degradation_flag: 1, queue_status: 'overdue', overdue: 1,
  }));
  eq(r.action, ACTION.INVESTIGATE_DEGRADATION, 'Edge: degraded+overdue → INVESTIGATE (R5 before R7)');
}

// Ready + degraded (no escalation) → R5 INVESTIGATE wins over R8 REVIEW
{
  const r = classifyPrompt(makePrompt({
    queue_status: 'ready_for_release', degradation_flag: 1,
    confidence_level: 'high', escalation_required: 0,
  }));
  eq(r.action, ACTION.INVESTIGATE_DEGRADATION, 'Edge: ready+degraded → INVESTIGATE (R5 before R6/R8)');
}

// Low confidence + blocked → R4 UNBLOCK wins over R9 REVIEW
{
  const r = classifyPrompt(makePrompt({
    confidence_level: 'low', queue_status: 'blocked',
  }));
  eq(r.action, ACTION.UNBLOCK_REQUIRED, 'Edge: low confidence+blocked → UNBLOCK (R4 before R9)');
}

// Draft + low confidence → R9 REVIEW wins over R10 WAIT (rule order: R9 before R10)
{
  const r = classifyPrompt(makePrompt({
    status: 'draft', confidence_level: 'low', quality_score: 20,
  }));
  eq(r.action, ACTION.REVIEW_REQUIRED, 'Edge: draft+low confidence → REVIEW (R9 before R10)');
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. DETERMINISM — same input → same output
// ═══════════════════════════════════════════════════════════════════════════

section('3. Determinism');

{
  const prompt = makePrompt({ queue_status: 'blocked', degradation_flag: 1, priority: 'high' });
  const r1 = classifyPrompt(prompt);
  const r2 = classifyPrompt(prompt);
  const r3 = classifyPrompt(prompt);
  eq(r1.action, r2.action, 'Determinism: 3 calls same action');
  eq(r1.rule_id, r3.rule_id, 'Determinism: 3 calls same rule_id');
  eq(r1.priority, r2.priority, 'Determinism: 3 calls same priority');
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. NO CONFLICTING ACTIONS — each prompt gets exactly one action
// ═══════════════════════════════════════════════════════════════════════════

section('4. No Conflicting Actions');

{
  // Simulate a batch of prompts with diverse states
  const prompts = [
    makePrompt({ id: 1, status: 'verified' }),
    makePrompt({ id: 2, escalation_required: 1 }),
    makePrompt({ id: 3, evaluator_status: 'fail' }),
    makePrompt({ id: 4, queue_status: 'blocked' }),
    makePrompt({ id: 5, degradation_flag: 1 }),
    makePrompt({ id: 6, queue_status: 'ready_for_release', confidence_level: 'high' }),
    makePrompt({ id: 7, queue_status: 'overdue', overdue: 1 }),
    makePrompt({ id: 8, queue_status: 'ready_for_release', confidence_level: 'low' }),
    makePrompt({ id: 9, confidence_level: 'low', queue_status: 'pending' }),
    makePrompt({ id: 10, status: 'draft' }),
    makePrompt({ id: 11, status: 'approved', queue_status: 'scheduled' }),
    makePrompt({ id: 12, status: 'executing', queue_status: 'pending' }),
  ];

  const actions = prompts.map(p => classifyPrompt(p));
  const ids = actions.map(a => a.target.prompt_id);
  const uniqueIds = new Set(ids);
  eq(uniqueIds.size, ids.length, 'No conflicts: each prompt has exactly one action');

  // Every prompt gets a result
  assert(actions.every(a => a !== null), 'No conflicts: no null results');

  // Every action is a valid type
  const validTypes = new Set(Object.values(ACTION));
  assert(actions.every(a => validTypes.has(a.action)), 'No conflicts: all actions are valid types');
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. PRIORITIZATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

section('5. Prioritization');

// 5a: Action severity ordering
{
  const actions = [
    classifyPrompt(makePrompt({ id: 1, status: 'approved', queue_status: 'scheduled' })),  // WAIT
    classifyPrompt(makePrompt({ id: 2, queue_status: 'ready_for_release', confidence_level: 'high' })),  // RELEASE_NOW
    classifyPrompt(makePrompt({ id: 3, escalation_required: 1 })),  // FIX_REQUIRED
    classifyPrompt(makePrompt({ id: 4, queue_status: 'blocked' })),  // UNBLOCK_REQUIRED
    classifyPrompt(makePrompt({ id: 5, degradation_flag: 1 })),  // INVESTIGATE
  ];

  prioritizeActions(actions);
  eq(actions[0].action, ACTION.FIX_REQUIRED, 'Priority: FIX first');
  eq(actions[1].action, ACTION.UNBLOCK_REQUIRED, 'Priority: UNBLOCK second');
  eq(actions[2].action, ACTION.INVESTIGATE_DEGRADATION, 'Priority: INVESTIGATE third');
  eq(actions[3].action, ACTION.RELEASE_NOW, 'Priority: RELEASE fourth');
  eq(actions[4].action, ACTION.WAIT, 'Priority: WAIT last');
}

// 5b: Blocking pipeline takes priority within same action type
{
  const blocking = classifyPrompt(makePrompt({
    id: 1, queue_status: 'blocked', workflow_id: 10, workflow_step_number: 3,
  }));
  const nonBlocking = classifyPrompt(makePrompt({
    id: 2, queue_status: 'blocked', workflow_id: null,
  }));

  const actions = [nonBlocking, blocking];
  prioritizeActions(actions);
  eq(actions[0].target.prompt_id, 1, 'Priority: blocking pipeline prompt first');
  eq(actions[1].target.prompt_id, 2, 'Priority: non-blocking prompt second');
}

// 5c: Overdue before non-overdue within same type+blocking
{
  const overdue = classifyPrompt(makePrompt({
    id: 1, queue_status: 'overdue', overdue: 1,
  }));
  const notOverdue = classifyPrompt(makePrompt({
    id: 2, queue_status: 'ready_for_release', confidence_level: 'high',
  }));
  // Both are RELEASE_NOW
  const actions = [notOverdue, overdue];
  prioritizeActions(actions);
  eq(actions[0].target.prompt_id, 1, 'Priority: overdue RELEASE before non-overdue RELEASE');
}

// 5d: Priority enum ordering (critical > high > normal > low)
{
  const low = classifyPrompt(makePrompt({
    id: 1, queue_status: 'blocked', priority: 'low',
  }));
  const critical = classifyPrompt(makePrompt({
    id: 2, queue_status: 'blocked', priority: 'critical',
  }));
  const high = classifyPrompt(makePrompt({
    id: 3, queue_status: 'blocked', priority: 'high',
  }));

  // Override priorities since classifyPrompt uses rule priority
  low.priority = 'low';
  critical.priority = 'critical';
  high.priority = 'high';

  const actions = [low, critical, high];
  prioritizeActions(actions);
  eq(actions[0].priority, 'critical', 'Priority enum: critical first');
  eq(actions[1].priority, 'high', 'Priority enum: high second');
  eq(actions[2].priority, 'low', 'Priority enum: low last');
}

// 5e: Workflow step number ordering (earlier steps first)
{
  const step5 = classifyPrompt(makePrompt({
    id: 1, queue_status: 'blocked', workflow_id: 10, workflow_step_number: 5,
  }));
  const step1 = classifyPrompt(makePrompt({
    id: 2, queue_status: 'blocked', workflow_id: 10, workflow_step_number: 1,
  }));
  const step3 = classifyPrompt(makePrompt({
    id: 3, queue_status: 'blocked', workflow_id: 10, workflow_step_number: 3,
  }));

  const actions = [step5, step1, step3];
  prioritizeActions(actions);
  eq(actions[0].target.workflow_step_number, 1, 'Step order: step 1 first');
  eq(actions[1].target.workflow_step_number, 3, 'Step order: step 3 second');
  eq(actions[2].target.workflow_step_number, 5, 'Step order: step 5 third');
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. isBlockingPipeline
// ═══════════════════════════════════════════════════════════════════════════

section('6. Pipeline Blocking Detection');

{
  assert(isBlockingPipeline(makePrompt({ workflow_id: 5, status: 'approved' })) === true,
    'Blocking: workflow prompt in non-terminal status');
  assert(isBlockingPipeline(makePrompt({ workflow_id: 5, status: 'verified' })) === false,
    'Not blocking: workflow prompt in verified (terminal)');
  assert(isBlockingPipeline(makePrompt({ workflow_id: null, status: 'approved' })) === false,
    'Not blocking: no workflow_id');
  assert(isBlockingPipeline(makePrompt({ workflow_id: 5, queue_status: 'blocked' })) === true,
    'Blocking: blocked workflow prompt');
  assert(isBlockingPipeline(makePrompt({ workflow_id: 5, queue_status: 'overdue' })) === true,
    'Blocking: overdue workflow prompt');
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. OUTPUT STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

section('7. Output Structure');

{
  const r = classifyPrompt(makePrompt({
    id: 42, title: 'Saint Nicholas', component: 'saints',
    queue_status: 'blocked', workflow_id: 7, workflow_step_number: 3,
    quality_score: 65, confidence_level: 'medium', release_mode: 'manual',
  }));

  // Required fields
  assert(r.action !== undefined, 'Output: has action');
  assert(r.action_label !== undefined, 'Output: has action_label');
  assert(r.rule_id !== undefined, 'Output: has rule_id');
  assert(r.rule_name !== undefined, 'Output: has rule_name');
  assert(r.priority !== undefined, 'Output: has priority');
  assert(typeof r.reason === 'string', 'Output: reason is string');
  assert(r.clear_condition !== undefined, 'Output: has clear_condition');
  assert(typeof r.ignore_safe === 'boolean', 'Output: ignore_safe is boolean');
  assert(typeof r.blocking_pipeline === 'boolean', 'Output: blocking_pipeline is boolean');

  // Target
  eq(r.target.prompt_id, 42, 'Output: target.prompt_id');
  eq(r.target.title, 'Saint Nicholas', 'Output: target.title');
  eq(r.target.component, 'saints', 'Output: target.component');
  eq(r.target.workflow_id, 7, 'Output: target.workflow_id');
  eq(r.target.workflow_step_number, 3, 'Output: target.workflow_step_number');

  // Context
  eq(r.context.status, 'approved', 'Output: context.status');
  eq(r.context.queue_status, 'blocked', 'Output: context.queue_status');
  eq(r.context.quality_score, 65, 'Output: context.quality_score');
  eq(r.context.confidence_level, 'medium', 'Output: context.confidence_level');
  eq(r.context.release_mode, 'manual', 'Output: context.release_mode');
  assert(Array.isArray(r.context.blocked_reasons), 'Output: blocked_reasons is array');
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. RULE COVERAGE — verify all 12 rules are tested
// ═══════════════════════════════════════════════════════════════════════════

section('8. Rule Coverage');

{
  const ruleIds = RULES.map(r => r.id);
  eq(ruleIds.length, 12, 'Rule count: 12 rules defined');

  const expected = ['R1','R2','R3','R4','R5','R6','R7','R8','R9','R10','R11','R12'];
  for (const id of expected) {
    assert(ruleIds.includes(id), `Rule ${id} exists in RULES array`);
  }

  // Verify R12 is a catch-all (always true)
  const r12 = RULES.find(r => r.id === 'R12');
  assert(r12.test({}) === true, 'R12: fallback test always returns true');
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. BLOCKED REASONS PARSING
// ═══════════════════════════════════════════════════════════════════════════

section('9. Blocked Reasons Edge Cases');

{
  // String JSON
  const r1 = classifyPrompt(makePrompt({
    queue_status: 'blocked',
    blocked_reasons: '[{"code":"audit_not_passed","detail":"Audit pending"}]',
  }));
  assert(r1.clear_condition.includes('audit'), 'Blocked reasons: parsed string JSON, audit condition');
}
{
  // Already-parsed array
  const r2 = classifyPrompt(makePrompt({
    queue_status: 'blocked',
    blocked_reasons: [{ code: 'outside_release_window', detail: 'Window closed' }],
  }));
  assert(r2.clear_condition.includes('release window'), 'Blocked reasons: parsed array, window condition');
}
{
  // null blocked_reasons
  const r3 = classifyPrompt(makePrompt({
    queue_status: 'blocked',
    blocked_reasons: null,
  }));
  eq(r3.action, ACTION.UNBLOCK_REQUIRED, 'Blocked reasons: null → still UNBLOCK');
}
{
  // Invalid JSON string
  const r4 = classifyPrompt(makePrompt({
    queue_status: 'blocked',
    blocked_reasons: 'not valid json',
  }));
  eq(r4.action, ACTION.UNBLOCK_REQUIRED, 'Blocked reasons: invalid JSON → still UNBLOCK');
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exit(1);
} else {
  console.log('All tests passed ✓');
  process.exit(0);
}
