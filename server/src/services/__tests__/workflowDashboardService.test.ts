#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowDashboardService.js (OMD-1038)
 *
 * Aggregation service for the Workflow Execution Dashboard.
 * Depends on `../config/db` and `./autonomyPolicyService`, both stubbed via
 * require.cache BEFORE requiring the SUT.
 *
 * Coverage:
 *   - classifyWorkflow    — priority rules (action_required > monitor > safe_to_ignore)
 *   - classifyException   — exception classification
 *   - classifyReadyItem   — release gate classification
 *   - classifyActivity    — keyword importance ranking
 *   - _inferResumeAction  — gate_id → recommended-action mapping
 *   - getExecutiveSummary — counts + exception aggregates
 *   - getActiveWorkflows  — batch step loading, progress %, empty-list path
 *   - getExceptionFeed    — filter → WHERE, blocked_reasons JSON, exception_types
 *   - getReadyToRelease   — can_auto_release / needs_review / is_overdue flags
 *   - getRecentActivity   — meta JSON parsing + malformed meta
 *   - getBlockedFrontiers — gate_id + severity + recommended_action mapping
 *   - getAutonomyExplanations — INFO/WARN separation + workflow counts
 *   - getDashboard        — Promise.all aggregation + classification sort
 *
 * Run from server/: npx tsx src/services/__tests__/workflowDashboardService.test.ts
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

// ── fake pool with SQL routing ─────────────────────────────────────────────
type Query = { sql: string; params: any[] };
const queryLog: Query[] = [];
type Route = { match: RegExp; rows?: any; respond?: (params: any[]) => any };
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        return [r.respond ? r.respond(params) : r.rows];
      }
    }
    return [[]];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// ── autonomyPolicyService stub ─────────────────────────────────────────────
let policyStatus: any = { mode: 'auto_full', enabled: true, allowed_actions: ['advance'] };
let pausedWorkflows: any[] = [];

const autonomyPolicyStub = {
  getStatus: async () => policyStatus,
  getPausedWorkflows: async () => pausedWorkflows,
};

const policyPath = require.resolve('../autonomyPolicyService');
require.cache[policyPath] = {
  id: policyPath, filename: policyPath, loaded: true,
  exports: autonomyPolicyStub,
} as any;

function resetAll() {
  queryLog.length = 0;
  routes = [];
  policyStatus = { mode: 'auto_full', enabled: true, allowed_actions: ['advance'] };
  pausedWorkflows = [];
}

// Now require SUT
const svc = require('../workflowDashboardService');
const {
  classifyWorkflow,
  classifyException,
  classifyReadyItem,
  classifyActivity,
  _inferResumeAction,
  getExecutiveSummary,
  getActiveWorkflows,
  getExceptionFeed,
  getReadyToRelease,
  getRecentActivity,
  getBlockedFrontiers,
  getAutonomyExplanations,
  getDashboard,
} = svc;

async function main() {

// ============================================================================
// classifyWorkflow
// ============================================================================
console.log('\n── classifyWorkflow ──────────────────────────────────────');

assertEq(classifyWorkflow({ blocked: 1 }), 'action_required', 'blocked > 0');
assertEq(classifyWorkflow({ blocked: 0, has_exceptions: true }), 'action_required', 'has_exceptions');
assertEq(classifyWorkflow({ blocked: 0, has_exceptions: false, autonomy_paused: true }), 'action_required', 'autonomy_paused');
assertEq(classifyWorkflow({ blocked: 0, has_exceptions: false, autonomy_paused: false, manual_only: true }), 'action_required', 'manual_only');
assertEq(classifyWorkflow({ blocked: 0, has_exceptions: false, executing: 2 }), 'monitor', 'executing > 0');
assertEq(classifyWorkflow({ blocked: 0, has_exceptions: false, executing: 0, progress_pct: 50 }), 'monitor', 'in-progress %');
assertEq(classifyWorkflow({ blocked: 0, has_exceptions: false, executing: 0, progress_pct: 100 }), 'safe_to_ignore', '100% → safe');
assertEq(classifyWorkflow({ blocked: 0, has_exceptions: false, executing: 0, progress_pct: 0, status: 'approved', manual_only: false }), 'safe_to_ignore', 'approved + autonomy → safe');
assertEq(classifyWorkflow({ blocked: 0, has_exceptions: false, executing: 0, progress_pct: 0, status: 'active' }), 'monitor', 'default fallback');

// ============================================================================
// classifyException
// ============================================================================
console.log('\n── classifyException ─────────────────────────────────────');

assertEq(classifyException({ escalation_required: true }), 'action_required', 'escalated');
assertEq(classifyException({ escalation_required: false, queue_status: 'blocked' }), 'action_required', 'blocked');
assertEq(classifyException({ escalation_required: false, queue_status: 'ready', overdue: 1 }), 'action_required', 'overdue');
assertEq(classifyException({ degradation_flag: 1 }), 'monitor', 'degraded → monitor');
assertEq(classifyException({ confidence_level: 'low' }), 'monitor', 'low conf → monitor');
assertEq(classifyException({}), 'monitor', 'default → monitor');

// ============================================================================
// classifyReadyItem
// ============================================================================
console.log('\n── classifyReadyItem ─────────────────────────────────────');

assertEq(classifyReadyItem({ needs_review: true }), 'action_required', 'needs review');
assertEq(classifyReadyItem({ needs_review: false, release_mode: 'manual' }), 'action_required', 'manual mode');
assertEq(classifyReadyItem({ needs_review: false, release_mode: 'auto_full', is_overdue: true }), 'action_required', 'overdue');
assertEq(classifyReadyItem({ needs_review: false, release_mode: 'auto_full', is_overdue: false, can_auto_release: true }), 'safe_to_ignore', 'auto release safe');
assertEq(classifyReadyItem({ needs_review: false, release_mode: 'auto_safe', is_overdue: false, can_auto_release: false }), 'monitor', 'default monitor');

// ============================================================================
// classifyActivity
// ============================================================================
console.log('\n── classifyActivity ──────────────────────────────────────');

{
  const events = [
    { message: 'Workflow paused by operator' },
    { message: 'Execution failed with error' },
    { message: 'Prompt released successfully' },
    { message: 'Step blocked by dependency' },
    { message: 'Execution complete' },
    { message: 'Routine tick' },
    { message: null },
  ];
  const result = classifyActivity(events);
  assertEq(result[0].importance, 'high', 'paused → high');
  assertEq(result[1].importance, 'high', 'fail → high');
  assertEq(result[2].importance, 'high', 'release → high');
  assertEq(result[3].importance, 'high', 'blocked → high');
  assertEq(result[4].importance, 'medium', 'complete → medium');
  assertEq(result[5].importance, 'normal', 'routine → normal');
  assertEq(result[6].importance, 'normal', 'null msg → normal');
}

// ============================================================================
// _inferResumeAction
// ============================================================================
console.log('\n── _inferResumeAction ────────────────────────────────────');

assertEq(_inferResumeAction(null), 'Resolve the blocking condition', 'null → default');
assertEq(_inferResumeAction({}), 'Resolve the blocking condition', 'empty → default');
assert(_inferResumeAction({ gate_id: 'G1' }).includes('confidence'), 'G1 confidence');
assert(_inferResumeAction({ gate_id: 'G2' }).includes('Evaluator'), 'G2 evaluator');
assert(_inferResumeAction({ gate_id: 'G5' }).includes('escalation'), 'G5 escalation');
assert(_inferResumeAction({ gate_id: 'G10' }).includes('autonomy'), 'G10 autonomy');
assert(_inferResumeAction({ gate_id: 'G13' }).includes('release_mode'), 'G13 release mode');
assertEq(_inferResumeAction({ gate_id: 'G999' }), 'Resolve the blocking condition', 'unknown gate → default');
// failed_gates[0].id path
assert(_inferResumeAction({ failed_gates: [{ id: 'G1' }] }).includes('confidence'), 'failed_gates[0]');

// ============================================================================
// getExecutiveSummary
// ============================================================================
console.log('\n── getExecutiveSummary ───────────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM prompt_workflows GROUP BY status/i,
    rows: [
      { status: 'active', cnt: 3 },
      { status: 'draft', cnt: 2 },
      { status: 'completed', cnt: 5 },
    ],
  },
  {
    match: /FROM om_prompt_registry GROUP BY status/i,
    rows: [
      { status: 'draft', cnt: 10 },
      { status: 'verified', cnt: 20 },
    ],
  },
  {
    match: /FROM om_prompt_registry\s+WHERE queue_status IS NOT NULL/i,
    rows: [
      { queue_status: 'released', cnt: 4 },
      { queue_status: 'blocked', cnt: 2 },
    ],
  },
  {
    match: /SUM\(CASE WHEN queue_status = 'blocked'/i,
    rows: [{
      blocked: '2', overdue: '1', degraded: '3', escalated: '0', low_confidence: '1',
    }],
  },
];
{
  const s = await getExecutiveSummary();
  assertEq(s.workflows.total, 10, 'workflows.total');
  assertEq(s.workflows.active, 3, 'workflows.active');
  assertEq(s.workflows.draft, 2, 'workflows.draft');
  assertEq(s.workflows.completed, 5, 'workflows.completed');
  assertEq(s.prompts.total, 30, 'prompts.total');
  assertEq(s.prompts.verified, 20, 'prompts.verified');
  assertEq(s.queue.released, 4, 'queue.released');
  assertEq(s.queue.blocked, 2, 'queue.blocked');
  assertEq(s.exceptions.blocked, 2, 'exceptions.blocked (string → number)');
  assertEq(s.exceptions.overdue, 1, 'exceptions.overdue');
  assertEq(s.exceptions.degraded, 3, 'exceptions.degraded');
  assertEq(s.exceptions.total, 3, 'exceptions.total = blocked+overdue+escalated');
}

// Empty tables
resetAll();
routes = [
  { match: /FROM prompt_workflows GROUP BY status/i, rows: [] },
  { match: /FROM om_prompt_registry GROUP BY status/i, rows: [] },
  { match: /FROM om_prompt_registry\s+WHERE queue_status IS NOT NULL/i, rows: [] },
  { match: /SUM\(CASE/i, rows: [{}] },
];
{
  const s = await getExecutiveSummary();
  assertEq(s.workflows.total, 0, 'empty workflows total');
  assertEq(s.prompts.total, 0, 'empty prompts total');
  assertEq(s.exceptions.blocked, 0, 'null coercion');
}

// ============================================================================
// getActiveWorkflows
// ============================================================================
console.log('\n── getActiveWorkflows ────────────────────────────────────');

// Empty case — short-circuits before second query
resetAll();
routes = [
  { match: /FROM prompt_workflows WHERE status IN/i, rows: [] },
];
{
  const r = await getActiveWorkflows();
  assertEq(r, [], 'empty → []');
  assertEq(queryLog.length, 1, 'only one query (short-circuit)');
}

// With workflows + steps
resetAll();
routes = [
  {
    match: /FROM prompt_workflows WHERE status IN/i,
    rows: [
      { id: 'wf1', name: 'Flow A', component: 'om-backend', status: 'active', activated_at: '2026-01-01', autonomy_paused: 0, manual_only: 0 },
      { id: 'wf2', name: 'Flow B', component: 'om-frontend', status: 'approved', activated_at: '2026-01-02', autonomy_paused: 1, manual_only: 0, autonomy_pause_reason: 'stuck' },
    ],
  },
  {
    match: /FROM prompt_workflow_steps/i,
    rows: [
      { workflow_id: 'wf1', step_number: 1, title: 's1', prompt_id: 'p1', prompt_status: 'verified', queue_status: null, escalation_required: 0, degradation_flag: 0 },
      { workflow_id: 'wf1', step_number: 2, title: 's2', prompt_id: 'p2', prompt_status: 'executing', queue_status: null, escalation_required: 0, degradation_flag: 0 },
      { workflow_id: 'wf2', step_number: 1, title: 's1', prompt_id: 'p3', prompt_status: 'draft', queue_status: 'blocked', escalation_required: 0, degradation_flag: 0 },
    ],
  },
];
{
  const r = await getActiveWorkflows();
  assertEq(r.length, 2, '2 workflows');

  const wf1 = r.find((w: any) => w.id === 'wf1');
  assertEq(wf1.step_count, 2, 'wf1 step count');
  assertEq(wf1.verified, 1, 'wf1 verified');
  assertEq(wf1.executing, 1, 'wf1 executing');
  assertEq(wf1.progress_pct, 50, 'wf1 progress %');
  assertEq(wf1.blocked, 0, 'wf1 blocked');
  assertEq(wf1.has_exceptions, false, 'wf1 no exceptions');
  assertEq(wf1.current_step?.step_number, 2, 'wf1 current_step = executing');
  assertEq(wf1.classification, 'monitor', 'wf1 classified monitor');

  const wf2 = r.find((w: any) => w.id === 'wf2');
  assertEq(wf2.blocked, 1, 'wf2 blocked');
  assertEq(wf2.autonomy_paused, true, 'wf2 autonomy_paused bool');
  assertEq(wf2.classification, 'action_required', 'wf2 action_required');
}

// ============================================================================
// getExceptionFeed
// ============================================================================
console.log('\n── getExceptionFeed ──────────────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM om_prompt_registry\s+WHERE/i,
    rows: [
      {
        id: 'p1', title: 'T1', component: 'om-backend', status: 'draft',
        queue_status: 'blocked', escalation_required: 1, overdue: 0, degradation_flag: 0,
        blocked_reasons: '["dep missing"]', confidence_level: 'high',
      },
      {
        id: 'p2', title: 'T2', component: 'om-backend', status: 'draft',
        queue_status: 'ready', escalation_required: 0, overdue: 1, degradation_flag: 0,
        blocked_reasons: null, confidence_level: 'low',
      },
    ],
  },
];
{
  const r = await getExceptionFeed({ type: 'blocked', component: 'om-backend' });
  assertEq(r.length, 2, '2 exceptions');
  assertEq(r[0].blocked_reasons, ['dep missing'], 'JSON parsed');
  assertEq(r[1].blocked_reasons, [], 'null → []');
  assertEq(r[0].exception_types.includes('escalated'), true, 'p1 escalated type');
  assertEq(r[0].exception_types.includes('blocked'), true, 'p1 blocked type');
  assertEq(r[1].exception_types.includes('overdue'), true, 'p2 overdue type');
  assertEq(r[1].exception_types.includes('low_confidence'), true, 'p2 low_conf type');

  const q = queryLog[0];
  assert(/queue_status = 'blocked'/.test(q.sql), 'filter type=blocked narrows WHERE');
  assert(/AND component = \?/.test(q.sql), 'component filter added');
  assert(q.params.includes('om-backend'), 'component param');
}

// All filter types
resetAll();
routes = [{ match: /FROM om_prompt_registry/i, rows: [] }];
await getExceptionFeed({ type: 'overdue' });
assert(/overdue = 1/.test(queryLog[0].sql), 'type=overdue');

resetAll();
routes = [{ match: /FROM om_prompt_registry/i, rows: [] }];
await getExceptionFeed({ type: 'escalated' });
assert(/escalation_required = 1/.test(queryLog[0].sql), 'type=escalated');

resetAll();
routes = [{ match: /FROM om_prompt_registry/i, rows: [] }];
await getExceptionFeed({ workflow_id: 'wf1' });
assert(/workflow_id = \?/.test(queryLog[0].sql), 'workflow_id filter');

// Default (no filters) — broad WHERE clause
resetAll();
routes = [{ match: /FROM om_prompt_registry/i, rows: [] }];
await getExceptionFeed();
assert(/queue_status = 'blocked' OR overdue = 1/.test(queryLog[0].sql), 'default broad WHERE');

// ============================================================================
// getReadyToRelease
// ============================================================================
console.log('\n── getReadyToRelease ─────────────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM om_prompt_registry\s+WHERE queue_status IN \('ready_for_release', 'overdue'\)/i,
    rows: [
      { id: 'p1', release_mode: 'auto_full', escalation_required: 0, degradation_flag: 0, confidence_level: 'high', queue_status: 'ready_for_release' },
      { id: 'p2', release_mode: 'manual', escalation_required: 0, degradation_flag: 0, confidence_level: 'high', queue_status: 'ready_for_release' },
      { id: 'p3', release_mode: 'auto_full', escalation_required: 1, degradation_flag: 0, confidence_level: 'high', queue_status: 'overdue' },
      { id: 'p4', release_mode: 'auto_safe', escalation_required: 0, degradation_flag: 1, confidence_level: 'low', queue_status: 'ready_for_release' },
    ],
  },
];
{
  const r = await getReadyToRelease();
  assertEq(r[0].can_auto_release, true, 'p1 auto releasable');
  assertEq(r[0].needs_review, false, 'p1 no review');
  assertEq(r[0].is_overdue, false, 'p1 not overdue');
  assertEq(r[1].can_auto_release, false, 'p2 manual → no auto');
  assert(r[2].needs_review, 'p3 escalated → review');
  assertEq(r[2].is_overdue, true, 'p3 overdue');
  assertEq(r[2].can_auto_release, false, 'p3 escalated blocks auto');
  assert(r[3].needs_review, 'p4 degraded → review');
}

// ============================================================================
// getRecentActivity
// ============================================================================
console.log('\n── getRecentActivity ─────────────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM system_logs\s+WHERE source IN/i,
    rows: [
      { timestamp: '2026-01-01', level: 'INFO', source: 'prompt_release', message: 'released', meta: '{"foo":"bar"}', user_email: 'alice' },
      { timestamp: '2026-01-02', level: 'WARN', source: 'prompt_queue', message: 'blocked', meta: 'not-json{{', user_email: 'bob' },
      { timestamp: '2026-01-03', level: 'INFO', source: 'prompt_audit', message: 'audit', meta: null, user_email: null },
    ],
  },
];
{
  const r = await getRecentActivity(50);
  assertEq(r.length, 3, '3 rows');
  assertEq(r[0].meta, { foo: 'bar' }, 'parsed meta');
  assertEq(r[1].meta, null, 'malformed meta → null');
  assertEq(r[2].meta, null, 'null meta → null');
  assertEq(r[0].actor, 'alice', 'user_email → actor');
  // LIMIT param passed through
  assertEq(queryLog[0].params[0], 50, 'limit param');
}

// Default limit
resetAll();
routes = [{ match: /FROM system_logs/i, rows: [] }];
await getRecentActivity();
assertEq(queryLog[0].params[0], 30, 'default limit 30');

// ============================================================================
// getBlockedFrontiers
// ============================================================================
console.log('\n── getBlockedFrontiers ───────────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM prompt_workflows w\s+JOIN prompt_workflow_steps/i,
    rows: [
      // Escalated — G5
      { workflow_id: 'wf1', workflow_name: 'Flow A', component: 'om-backend', step_number: 1, step_title: 's1', prompt_id: 'p1', prompt_status: 'draft', queue_status: 'ready', escalation_required: 1, escalation_reason: 'needs review', degradation_flag: 0, confidence_level: 'high', autonomy_paused: 0, manual_only: 0, prompt_manual_only: 0, blocked_reasons: null, quality_score: 80 },
      // Blocked — G6
      { workflow_id: 'wf2', workflow_name: 'Flow B', component: 'om-backend', step_number: 1, step_title: 's1', prompt_id: 'p2', prompt_status: 'draft', queue_status: 'blocked', escalation_required: 0, degradation_flag: 0, confidence_level: 'high', blocked_reasons: '["dep A","dep B"]', quality_score: 75, autonomy_paused: 0, manual_only: 0, prompt_manual_only: 0 },
      // Degraded — G4
      { workflow_id: 'wf3', workflow_name: 'Flow C', component: 'om-backend', step_number: 1, step_title: 's1', prompt_id: 'p3', prompt_status: 'draft', queue_status: 'ready', escalation_required: 0, degradation_flag: 1, confidence_level: 'high', blocked_reasons: null, quality_score: 60, autonomy_paused: 0, manual_only: 0, prompt_manual_only: 0 },
      // Low confidence — G1
      { workflow_id: 'wf4', workflow_name: 'Flow D', component: 'om-backend', step_number: 1, step_title: 's1', prompt_id: 'p4', prompt_status: 'draft', queue_status: 'ready', escalation_required: 0, degradation_flag: 0, confidence_level: 'low', blocked_reasons: null, quality_score: 40, autonomy_paused: 0, manual_only: 0, prompt_manual_only: 0 },
      // Autonomy paused — G10
      { workflow_id: 'wf5', workflow_name: 'Flow E', component: 'om-backend', step_number: 1, step_title: 's1', prompt_id: 'p5', prompt_status: 'draft', queue_status: 'ready', escalation_required: 0, degradation_flag: 0, confidence_level: 'high', autonomy_paused: 1, autonomy_pause_reason: 'manual hold', manual_only: 0, prompt_manual_only: 0, blocked_reasons: null, quality_score: 70 },
      // Workflow manual_only — G9
      { workflow_id: 'wf6', workflow_name: 'Flow F', component: 'om-backend', step_number: 1, step_title: 's1', prompt_id: 'p6', prompt_status: 'draft', queue_status: 'ready', escalation_required: 0, degradation_flag: 0, confidence_level: 'high', autonomy_paused: 0, manual_only: 1, prompt_manual_only: 0, blocked_reasons: null, quality_score: 70 },
      // Prompt manual_only — G7
      { workflow_id: 'wf7', workflow_name: 'Flow G', component: 'om-backend', step_number: 1, step_title: 's1', prompt_id: 'p7', prompt_status: 'draft', queue_status: 'ready', escalation_required: 0, degradation_flag: 0, confidence_level: 'high', autonomy_paused: 0, manual_only: 0, prompt_manual_only: 1, blocked_reasons: null, quality_score: 70 },
      // Malformed blocked_reasons
      { workflow_id: 'wf8', workflow_name: 'Flow H', component: 'om-backend', step_number: 1, step_title: 's1', prompt_id: 'p8', prompt_status: 'draft', queue_status: 'blocked', escalation_required: 0, degradation_flag: 0, confidence_level: 'high', blocked_reasons: 'garbage{not json', quality_score: 50, autonomy_paused: 0, manual_only: 0, prompt_manual_only: 0 },
    ],
  },
];
{
  const r = await getBlockedFrontiers();
  assertEq(r.length, 8, '8 frontiers');
  assertEq(r[0].gate_id, 'G5', 'escalated → G5');
  assertEq(r[0].severity, 'critical', 'escalated critical');
  assertEq(r[0].explanation, 'needs review', 'uses escalation_reason');
  assertEq(r[1].gate_id, 'G6', 'blocked → G6');
  assertEq(r[1].blocked_reasons, ['dep A', 'dep B'], 'parsed JSON');
  assert(r[1].explanation.includes('dep A'), 'explanation lists deps');
  assertEq(r[2].gate_id, 'G4', 'degraded → G4');
  assertEq(r[2].severity, 'warning', 'degraded warning');
  assertEq(r[3].gate_id, 'G1', 'low conf → G1');
  assertEq(r[4].gate_id, 'G10', 'paused → G10');
  assertEq(r[4].explanation, 'manual hold', 'uses pause_reason');
  assertEq(r[5].gate_id, 'G9', 'wf manual → G9');
  assertEq(r[6].gate_id, 'G7', 'prompt manual → G7');
  assertEq(r[7].blocked_reasons, [], 'malformed → []');
}

// ============================================================================
// getAutonomyExplanations
// ============================================================================
console.log('\n── getAutonomyExplanations ───────────────────────────────');

resetAll();
policyStatus = { mode: 'auto_safe', enabled: true, allowed_actions: ['advance', 'release'] };
pausedWorkflows = [
  { id: 'wf1', name: 'Flow A', autonomy_pause_reason: 'rate limit' },
  { id: 'wf2', name: 'Flow B', autonomy_pause_reason: null },
];
routes = [
  {
    match: /FROM system_logs\s+WHERE source = 'autonomous_advance'/i,
    rows: [
      {
        timestamp: '2026-01-01', level: 'INFO', message: 'advanced step 1',
        meta: JSON.stringify({ action: 'advance', target_title: 'step1', workflow_name: 'Flow A', gates_passed: '13/13', mode: 'auto_full' }),
      },
      {
        timestamp: '2026-01-02', level: 'WARN', message: 'paused on gate G1',
        meta: JSON.stringify({ workflow_name: 'Flow B', gate_id: 'G1', reason: 'low confidence', recommended_action: 'Re-evaluate' }),
      },
      {
        timestamp: '2026-01-03', level: 'INFO', message: 'no meta here',
        meta: null,
      },
    ],
  },
  {
    match: /FROM prompt_workflows\s+WHERE status = 'active'/i,
    rows: [{ total_active: '5', advancing: '3', paused: '2', manual_only: '0' }],
  },
];
{
  const r = await getAutonomyExplanations();
  assertEq(r.current_mode, 'auto_safe', 'mode from status');
  assertEq(r.workflow_counts.total_active, 5, 'total_active (string → number)');
  assertEq(r.workflow_counts.advancing_autonomously, 3, 'advancing');
  assertEq(r.workflow_counts.paused, 2, 'paused');
  assertEq(r.recent_advances.length, 1, 'one advance (skipped null meta)');
  assertEq(r.recent_advances[0].workflow, 'Flow A', 'advance workflow');
  assertEq(r.recent_advances[0].mode, 'auto_full', 'advance mode');
  assertEq(r.recent_pauses.length, 1, 'one pause');
  assertEq(r.recent_pauses[0].failed_gate, 'G1', 'failed_gate');
  assertEq(r.recent_pauses[0].what_must_change, 'Re-evaluate', 'recommended_action used');
  assertEq(r.paused_workflows.length, 2, '2 paused workflows');
  assertEq(r.paused_workflows[0].why_paused, 'rate limit', 'pause reason');
  assertEq(r.paused_workflows[1].why_paused, 'Paused by operator', 'null → default reason');
}

// ============================================================================
// getDashboard
// ============================================================================
console.log('\n── getDashboard ──────────────────────────────────────────');

resetAll();
policyStatus = { mode: 'auto_full', enabled: true, allowed_actions: [] };
pausedWorkflows = [];
routes = [
  // executive summary
  { match: /FROM prompt_workflows GROUP BY status/i, rows: [] },
  { match: /FROM om_prompt_registry GROUP BY status/i, rows: [] },
  { match: /FROM om_prompt_registry\s+WHERE queue_status IS NOT NULL/i, rows: [] },
  { match: /SUM\(CASE/i, rows: [{}] },
  // active workflows — multiple rows so we can test sort
  {
    match: /FROM prompt_workflows WHERE status IN \('active', 'approved'\)/i,
    rows: [
      { id: 'wfA', name: 'A', component: 'om', status: 'active', activated_at: '2026-01-01', autonomy_paused: 0, manual_only: 0 },
      { id: 'wfB', name: 'B', component: 'om', status: 'active', activated_at: '2026-01-02', autonomy_paused: 1, manual_only: 0 },
    ],
  },
  {
    match: /FROM prompt_workflow_steps/i,
    rows: [
      { workflow_id: 'wfA', step_number: 1, title: 's1', prompt_id: 'p', prompt_status: 'verified', queue_status: null, escalation_required: 0, degradation_flag: 0 },
      { workflow_id: 'wfB', step_number: 1, title: 's1', prompt_id: 'q', prompt_status: 'draft', queue_status: null, escalation_required: 0, degradation_flag: 0 },
    ],
  },
  // exception feed
  { match: /FROM om_prompt_registry\s+WHERE/i, rows: [] },
  // ready to release
  { match: /queue_status IN \('ready_for_release', 'overdue'\)/i, rows: [] },
  // recent activity
  { match: /FROM system_logs\s+WHERE source IN/i, rows: [] },
  // blocked frontiers
  { match: /FROM prompt_workflows w\s+JOIN prompt_workflow_steps/i, rows: [] },
  // autonomy explanations
  { match: /FROM system_logs\s+WHERE source = 'autonomous_advance'/i, rows: [] },
  { match: /FROM prompt_workflows\s+WHERE status = 'active'/i, rows: [{}] },
];
{
  const d = await getDashboard({ activity_limit: 10 });
  assert(typeof d.generated_at === 'string', 'has generated_at');
  assert(d.summary !== undefined, 'has summary');
  assert(Array.isArray(d.active_workflows), 'active_workflows array');
  assert(Array.isArray(d.exceptions), 'exceptions array');
  assert(Array.isArray(d.ready_to_release), 'ready_to_release array');
  assert(Array.isArray(d.blocked_frontiers), 'blocked_frontiers array');
  assert(d.autonomy !== undefined, 'has autonomy');
  assert(Array.isArray(d.activity), 'activity array');
  // Sort: wfB (autonomy_paused=action_required) should come before wfA (100% verified=safe_to_ignore)
  assertEq(d.active_workflows[0].id, 'wfB', 'action_required sorted first');
  assertEq(d.active_workflows[1].id, 'wfA', 'safe_to_ignore sorted last');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
