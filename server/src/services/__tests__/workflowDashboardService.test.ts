#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowDashboardService.js (OMD-1135)
 *
 * Covers:
 *   - Pure classifiers: classifyWorkflow / classifyException /
 *     classifyReadyItem / classifyActivity / _inferResumeAction
 *   - SQL-backed aggregators: getExecutiveSummary, getActiveWorkflows,
 *     getExceptionFeed, getReadyToRelease, getRecentActivity,
 *     getBlockedFrontiers, getAutonomyExplanations, getDashboard
 *
 * Strategy:
 *   - Route-dispatch fake pool injected into config/db
 *   - autonomyPolicyService stubbed via require.cache
 *
 * Run: npx tsx src/services/__tests__/workflowDashboardService.test.ts
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

// ── Fake pool: route-dispatch ────────────────────────────────────────
type Route = { match: RegExp; handler: (sql: string, params: any[]) => any };
const routes: Route[] = [];
const queryLog: { sql: string; params: any[] }[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []): Promise<any> => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) return r.handler(sql, params);
    }
    return [[]];
  },
};

function resetRoutes(): void {
  routes.length = 0;
  queryLog.length = 0;
}

// ── Stub config/db ────────────────────────────────────────────────────
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
    getTenantPool: () => fakePool,
  },
} as any;

// ── Stub autonomyPolicyService ────────────────────────────────────────
const autonomyPath = require.resolve('../autonomyPolicyService');
const fakeAutonomy = {
  getStatus: async () => ({
    mode: 'SAFE_ADVANCE',
    enabled: true,
    allowed_actions: ['advance'],
  }),
  getPausedWorkflows: async () => [],
};
require.cache[autonomyPath] = {
  id: autonomyPath,
  filename: autonomyPath,
  loaded: true,
  exports: fakeAutonomy,
} as any;

// ── Require SUT ───────────────────────────────────────────────────────
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
} = require('../workflowDashboardService');

async function main() {

// ============================================================================
// classifyWorkflow
// ============================================================================
console.log('\n── classifyWorkflow ──────────────────────────────────');

assertEq(
  classifyWorkflow({ blocked: 1, executing: 0, progress_pct: 50 }),
  'action_required',
  'blocked > 0'
);

assertEq(
  classifyWorkflow({ blocked: 0, has_exceptions: true }),
  'action_required',
  'has_exceptions'
);

assertEq(
  classifyWorkflow({ blocked: 0, autonomy_paused: true }),
  'action_required',
  'autonomy_paused'
);

assertEq(
  classifyWorkflow({ blocked: 0, manual_only: true }),
  'action_required',
  'manual_only'
);

assertEq(
  classifyWorkflow({ blocked: 0, executing: 2, progress_pct: 50 }),
  'monitor',
  'executing > 0'
);

assertEq(
  classifyWorkflow({ blocked: 0, executing: 0, progress_pct: 50 }),
  'monitor',
  'progress 0-100'
);

assertEq(
  classifyWorkflow({ blocked: 0, executing: 0, progress_pct: 100 }),
  'safe_to_ignore',
  'progress 100'
);

assertEq(
  classifyWorkflow({ blocked: 0, executing: 0, progress_pct: 0, status: 'approved' }),
  'safe_to_ignore',
  'approved + not manual'
);

assertEq(
  classifyWorkflow({ blocked: 0, executing: 0, progress_pct: 0, status: 'draft' }),
  'monitor',
  'default → monitor'
);

// ============================================================================
// classifyException
// ============================================================================
console.log('\n── classifyException ─────────────────────────────────');

assertEq(classifyException({ escalation_required: true }), 'action_required', 'escalation');
assertEq(classifyException({ queue_status: 'blocked' }), 'action_required', 'blocked');
assertEq(classifyException({ overdue: true }), 'action_required', 'overdue');
assertEq(classifyException({ degradation_flag: true }), 'monitor', 'degradation');
assertEq(classifyException({ confidence_level: 'low' }), 'monitor', 'low confidence');
assertEq(classifyException({}), 'monitor', 'default monitor');

// ============================================================================
// classifyReadyItem
// ============================================================================
console.log('\n── classifyReadyItem ─────────────────────────────────');

assertEq(classifyReadyItem({ needs_review: true }), 'action_required', 'needs_review');
assertEq(classifyReadyItem({ release_mode: 'manual' }), 'action_required', 'manual release');
assertEq(classifyReadyItem({ is_overdue: true }), 'action_required', 'is_overdue');
assertEq(classifyReadyItem({ can_auto_release: true }), 'safe_to_ignore', 'auto-release');
assertEq(classifyReadyItem({}), 'monitor', 'default monitor');

// ============================================================================
// classifyActivity
// ============================================================================
console.log('\n── classifyActivity ──────────────────────────────────');

{
  const events = [
    { message: 'workflow paused' },
    { message: 'error occurred' },
    { message: 'Release initiated' },
    { message: 'blocked dependency' },
    { message: 'Completed successfully' },
    { message: 'Nothing special' },
    { message: '' },
  ];
  const result = classifyActivity(events);
  assertEq(result[0].importance, 'high', 'paused → high');
  assertEq(result[1].importance, 'high', 'error → high');
  assertEq(result[2].importance, 'high', 'release → high');
  assertEq(result[3].importance, 'high', 'blocked → high');
  assertEq(result[4].importance, 'medium', 'complete → medium');
  assertEq(result[5].importance, 'normal', 'neutral → normal');
  assertEq(result[6].importance, 'normal', 'empty → normal');
}

// ============================================================================
// _inferResumeAction (13 gates + default)
// ============================================================================
console.log('\n── _inferResumeAction ────────────────────────────────');

assertEq(_inferResumeAction(null), 'Resolve the blocking condition', 'null meta');
assertEq(
  _inferResumeAction({ gate_id: 'G1' }).includes('confidence'),
  true,
  'G1 confidence'
);
assertEq(
  _inferResumeAction({ gate_id: 'G2' }).includes('Evaluator'),
  true,
  'G2 evaluator'
);
assertEq(
  _inferResumeAction({ gate_id: 'G3' }).includes('Completion'),
  true,
  'G3 completion'
);
assertEq(
  _inferResumeAction({ gate_id: 'G4' }).includes('degradation'),
  true,
  'G4 degradation'
);
assertEq(
  _inferResumeAction({ gate_id: 'G5' }).includes('escalation'),
  true,
  'G5 escalation'
);
assertEq(
  _inferResumeAction({ gate_id: 'G6' }).includes('dependencies'),
  true,
  'G6 dependencies'
);
assertEq(
  _inferResumeAction({ gate_id: 'G7' }).includes('manual_only'),
  true,
  'G7 prompt manual'
);
assertEq(
  _inferResumeAction({ gate_id: 'G10' }).includes('autonomy'),
  true,
  'G10 autonomy'
);
assertEq(
  _inferResumeAction({ gate_id: 'G13' }).includes('release_mode'),
  true,
  'G13 release_mode'
);
// Fallback
assertEq(
  _inferResumeAction({ gate_id: 'UNKNOWN' }),
  'Resolve the blocking condition',
  'unknown gate → default'
);
// Extracts gate_id from failed_gates array
assertEq(
  _inferResumeAction({ failed_gates: [{ id: 'G5' }] }).includes('escalation'),
  true,
  'failed_gates[0].id'
);

// ============================================================================
// getExecutiveSummary
// ============================================================================
console.log('\n── getExecutiveSummary ───────────────────────────────');

{
  resetRoutes();
  routes.push({
    match: /FROM prompt_workflows GROUP BY status/i,
    handler: () => [[
      { status: 'draft', cnt: 2 },
      { status: 'active', cnt: 3 },
      { status: 'completed', cnt: 5 },
    ]],
  });
  routes.push({
    match: /FROM om_prompt_registry GROUP BY status/i,
    handler: () => [[
      { status: 'draft', cnt: 4 },
      { status: 'ready', cnt: 7 },
    ]],
  });
  routes.push({
    match: /queue_status.*IS NOT NULL.*GROUP BY queue_status/is,
    handler: () => [[
      { queue_status: 'ready_for_release', cnt: 3 },
      { queue_status: 'blocked', cnt: 1 },
    ]],
  });
  routes.push({
    match: /SUM\(CASE WHEN queue_status = 'blocked'/i,
    handler: () => [[
      { blocked: 1, overdue: 2, degraded: 0, escalated: 1, low_confidence: 3 },
    ]],
  });

  const summary = await getExecutiveSummary();
  assertEq(summary.workflows.draft, 2, 'wf draft');
  assertEq(summary.workflows.active, 3, 'wf active');
  assertEq(summary.workflows.total, 10, 'wf total');
  assertEq(summary.prompts.total, 11, 'prompt total');
  assertEq(summary.prompts.draft, 4, 'prompt draft');
  assertEq(summary.queue.ready_for_release, 3, 'queue ready_for_release');
  assertEq(summary.queue.blocked, 1, 'queue blocked');
  assertEq(summary.exceptions.blocked, 1, 'exc blocked');
  assertEq(summary.exceptions.overdue, 2, 'exc overdue');
  assertEq(summary.exceptions.escalated, 1, 'exc escalated');
  assertEq(summary.exceptions.low_confidence, 3, 'low_confidence');
  assertEq(summary.exceptions.total, 4, 'exc total = blocked+overdue+escalated');
}

// Empty data
{
  resetRoutes();
  routes.push({ match: /FROM prompt_workflows GROUP BY status/i, handler: () => [[]] });
  routes.push({ match: /FROM om_prompt_registry GROUP BY status/i, handler: () => [[]] });
  routes.push({ match: /queue_status.*GROUP BY queue_status/is, handler: () => [[]] });
  routes.push({ match: /SUM\(CASE WHEN queue_status/i, handler: () => [[{}]] });

  const summary = await getExecutiveSummary();
  assertEq(summary.workflows.total, 0, 'empty wf total');
  assertEq(summary.exceptions.total, 0, 'empty exc total');
}

// ============================================================================
// getActiveWorkflows
// ============================================================================
console.log('\n── getActiveWorkflows ────────────────────────────────');

{
  resetRoutes();
  routes.push({
    match: /FROM prompt_workflows WHERE status IN/i,
    handler: () => [[
      {
        id: 'wf-1', name: 'Workflow A', component: 'frontend', status: 'active',
        activated_at: '2026-04-11', approved_at: '2026-04-10',
        autonomy_paused: 0, manual_only: 0, autonomy_pause_reason: null,
      },
      {
        id: 'wf-2', name: 'Workflow B', component: 'backend', status: 'approved',
        activated_at: null, approved_at: '2026-04-11',
        autonomy_paused: 1, manual_only: 0, autonomy_pause_reason: 'debug',
      },
    ]],
  });
  routes.push({
    match: /FROM prompt_workflow_steps s/i,
    handler: () => [[
      // wf-1 steps: 1 verified, 1 executing
      { workflow_id: 'wf-1', step_number: 1, title: 'S1', prompt_id: 'p1', prompt_status: 'verified', queue_status: null },
      { workflow_id: 'wf-1', step_number: 2, title: 'S2', prompt_id: 'p2', prompt_status: 'executing', queue_status: null },
      // wf-2: 1 blocked
      { workflow_id: 'wf-2', step_number: 1, title: 'S1', prompt_id: 'p3', prompt_status: 'draft', queue_status: 'blocked' },
    ]],
  });

  const wfs = await getActiveWorkflows();
  assertEq(wfs.length, 2, '2 workflows');
  assertEq(wfs[0].id, 'wf-1', 'wf-1');
  assertEq(wfs[0].step_count, 2, 'wf-1 step_count');
  assertEq(wfs[0].verified, 1, 'wf-1 verified');
  assertEq(wfs[0].executing, 1, 'wf-1 executing');
  assertEq(wfs[0].progress_pct, 50, 'wf-1 progress 50%');
  assert(wfs[0].current_step !== null, 'current_step set');
  assertEq(wfs[0].classification, 'monitor', 'wf-1 monitor (executing)');

  assertEq(wfs[1].blocked, 1, 'wf-2 blocked');
  assertEq(wfs[1].autonomy_paused, true, 'wf-2 paused');
  assertEq(wfs[1].classification, 'action_required', 'wf-2 action_required');
}

// Empty → early return
{
  resetRoutes();
  routes.push({
    match: /FROM prompt_workflows WHERE status IN/i,
    handler: () => [[]],
  });
  const wfs = await getActiveWorkflows();
  assertEq(wfs.length, 0, 'empty');
  // Second query should NOT have been called
  assertEq(queryLog.length, 1, 'only 1 query on empty');
}

// ============================================================================
// getExceptionFeed
// ============================================================================
console.log('\n── getExceptionFeed ──────────────────────────────────');

{
  resetRoutes();
  routes.push({
    match: /FROM om_prompt_registry\s+WHERE/i,
    handler: () => [[
      {
        id: 'p1', title: 'Prompt 1', component: 'frontend',
        status: 'draft', queue_status: 'blocked', priority: 'critical',
        escalation_required: 1, overdue: 0, degradation_flag: 0, confidence_level: 'high',
        blocked_reasons: '["missing dep"]',
      },
      {
        id: 'p2', title: 'Prompt 2', component: 'backend',
        status: 'ready', queue_status: null, priority: 'normal',
        escalation_required: 0, overdue: 1, degradation_flag: 0, confidence_level: 'high',
        blocked_reasons: null,
      },
    ]],
  });

  const excs = await getExceptionFeed();
  assertEq(excs.length, 2, '2 exceptions');
  assertEq(excs[0].blocked_reasons, ['missing dep'], 'blocked_reasons parsed from JSON string');
  assert(excs[0].exception_types.includes('escalated'), 'p1 escalated');
  assert(excs[0].exception_types.includes('blocked'), 'p1 blocked');
  assert(excs[1].exception_types.includes('overdue'), 'p2 overdue');
  assertEq(excs[1].blocked_reasons, [], 'null → []');
}

// Filter by type
{
  resetRoutes();
  routes.push({
    match: /FROM om_prompt_registry/i,
    handler: (sql: string) => {
      // Verify the filter was applied
      if (!/queue_status = 'blocked'/.test(sql)) {
        throw new Error('filter not applied');
      }
      return [[]];
    },
  });
  await getExceptionFeed({ type: 'blocked' });
  assert(true, 'blocked filter applied');
}

// Filter by component + workflow_id
{
  resetRoutes();
  let capturedParams: any[] = [];
  routes.push({
    match: /FROM om_prompt_registry/i,
    handler: (_sql: string, params: any[]) => {
      capturedParams = params;
      return [[]];
    },
  });
  await getExceptionFeed({ component: 'frontend', workflow_id: 'wf-1' });
  assertEq(capturedParams, ['frontend', 'wf-1'], 'component+wf params');
}

// ============================================================================
// getReadyToRelease
// ============================================================================
console.log('\n── getReadyToRelease ─────────────────────────────────');

{
  resetRoutes();
  routes.push({
    match: /FROM om_prompt_registry\s+WHERE queue_status IN \('ready_for_release'/i,
    handler: () => [[
      {
        id: 'r1', title: 'Ready 1', component: 'frontend',
        queue_status: 'ready_for_release', release_mode: 'auto_full',
        escalation_required: 0, degradation_flag: 0, confidence_level: 'high',
      },
      {
        id: 'r2', title: 'Ready 2', component: 'backend',
        queue_status: 'overdue', release_mode: 'manual',
        escalation_required: 1, degradation_flag: 0, confidence_level: 'high',
      },
    ]],
  });

  const ready = await getReadyToRelease();
  assertEq(ready.length, 2, '2 ready');
  assertEq(ready[0].can_auto_release, true, 'r1 auto');
  assertEq(ready[0].needs_review, false, 'r1 no review');
  assertEq(ready[0].is_overdue, false, 'r1 not overdue');
  assertEq(ready[1].can_auto_release, false, 'r2 not auto (escalation)');
  assert(!!ready[1].needs_review, 'r2 needs review');
  assertEq(ready[1].is_overdue, true, 'r2 overdue');
}

// ============================================================================
// getRecentActivity
// ============================================================================
console.log('\n── getRecentActivity ─────────────────────────────────');

{
  resetRoutes();
  routes.push({
    match: /FROM system_logs\s+WHERE source IN/i,
    handler: (_sql: string, params: any[]) => {
      assertEq(params[0], 30, 'default limit 30');
      return [[
        {
          timestamp: '2026-04-11T10:00:00Z', level: 'INFO',
          source: 'prompt_workflow_plan', message: 'Started',
          meta: '{"action":"start"}', user_email: 'admin@x.com',
        },
        {
          timestamp: '2026-04-11T10:01:00Z', level: 'ERROR',
          source: 'prompt_release', message: 'Failed',
          meta: 'invalid json', user_email: null,
        },
      ]];
    },
  });

  const activity = await getRecentActivity();
  assertEq(activity.length, 2, '2 activities');
  assertEq(activity[0].actor, 'admin@x.com', 'user_email → actor');
  assertEq(activity[0].meta, { action: 'start' }, 'meta parsed');
  assertEq(activity[1].meta, null, 'invalid meta → null');
}

// Custom limit
{
  resetRoutes();
  routes.push({
    match: /FROM system_logs/i,
    handler: (_sql: string, params: any[]) => {
      assertEq(params[0], 5, 'custom limit 5');
      return [[]];
    },
  });
  await getRecentActivity(5);
}

// ============================================================================
// getBlockedFrontiers
// ============================================================================
console.log('\n── getBlockedFrontiers ───────────────────────────────');

{
  resetRoutes();
  routes.push({
    match: /FROM prompt_workflows w\s+JOIN prompt_workflow_steps s/is,
    handler: () => [[
      {
        workflow_id: 'wf-1', workflow_name: 'A', component: 'fe',
        step_number: 1, step_title: 'S1', prompt_id: 'p1',
        escalation_required: 1, escalation_reason: 'needs human',
        queue_status: null, degradation_flag: 0, confidence_level: 'high',
        blocked_reasons: null, quality_score: 80,
      },
      {
        workflow_id: 'wf-2', workflow_name: 'B', component: 'be',
        step_number: 2, step_title: 'S2', prompt_id: 'p2',
        escalation_required: 0, queue_status: 'blocked',
        blocked_reasons: '["dep1","dep2"]',
        degradation_flag: 0, confidence_level: 'high', quality_score: 70,
      },
      {
        workflow_id: 'wf-3', workflow_name: 'C', component: 'db',
        step_number: 1, step_title: 'S1', prompt_id: 'p3',
        escalation_required: 0, queue_status: null,
        degradation_flag: 1, blocked_reasons: null,
        confidence_level: 'high', quality_score: 50,
      },
      {
        workflow_id: 'wf-4', workflow_name: 'D', component: 'x',
        step_number: 1, step_title: 'S1', prompt_id: 'p4',
        escalation_required: 0, queue_status: null,
        degradation_flag: 0, confidence_level: 'low',
        blocked_reasons: null, quality_score: 30,
      },
      {
        workflow_id: 'wf-5', workflow_name: 'E', component: 'y',
        step_number: 1, step_title: 'S1', prompt_id: 'p5',
        escalation_required: 0, queue_status: null, degradation_flag: 0,
        confidence_level: 'high', blocked_reasons: null, quality_score: 90,
        autonomy_paused: 1, autonomy_pause_reason: 'operator pause',
      },
      {
        workflow_id: 'wf-6', workflow_name: 'F', component: 'z',
        step_number: 1, step_title: 'S1', prompt_id: 'p6',
        escalation_required: 0, queue_status: null, degradation_flag: 0,
        confidence_level: 'high', blocked_reasons: null, quality_score: 90,
        manual_only: 1,
      },
      {
        workflow_id: 'wf-7', workflow_name: 'G', component: 'z',
        step_number: 1, step_title: 'S1', prompt_id: 'p7',
        escalation_required: 0, queue_status: null, degradation_flag: 0,
        confidence_level: 'high', blocked_reasons: null, quality_score: 90,
        prompt_manual_only: 1,
      },
    ]],
  });

  const frontiers = await getBlockedFrontiers();
  assertEq(frontiers.length, 7, '7 frontiers');
  // wf-1: escalation → G5
  assertEq(frontiers[0].gate_id, 'G5', 'wf-1 G5');
  assertEq(frontiers[0].severity, 'critical', 'G5 critical');
  assertEq(frontiers[0].explanation, 'needs human', 'wf-1 explanation');
  // wf-2: blocked → G6
  assertEq(frontiers[1].gate_id, 'G6', 'wf-2 G6');
  assertEq(frontiers[1].blocked_reasons, ['dep1', 'dep2'], 'wf-2 blocked reasons');
  assert(frontiers[1].explanation.includes('dep1'), 'explanation has deps');
  // wf-3: degradation → G4
  assertEq(frontiers[2].gate_id, 'G4', 'wf-3 G4');
  assertEq(frontiers[2].severity, 'warning', 'G4 warning');
  // wf-4: low confidence → G1
  assertEq(frontiers[3].gate_id, 'G1', 'wf-4 G1');
  // wf-5: autonomy_paused → G10
  assertEq(frontiers[4].gate_id, 'G10', 'wf-5 G10');
  assertEq(frontiers[4].severity, 'info', 'G10 info');
  // wf-6: workflow manual_only → G9
  assertEq(frontiers[5].gate_id, 'G9', 'wf-6 G9');
  // wf-7: prompt manual_only → G7
  assertEq(frontiers[6].gate_id, 'G7', 'wf-7 G7');
}

// Blocked reasons with malformed JSON → empty
{
  resetRoutes();
  routes.push({
    match: /FROM prompt_workflows w\s+JOIN prompt_workflow_steps s/is,
    handler: () => [[
      {
        workflow_id: 'wf-x', workflow_name: 'X',
        escalation_required: 0, queue_status: 'blocked',
        blocked_reasons: 'invalid json!!!',
        degradation_flag: 0, confidence_level: 'high',
      },
    ]],
  });
  const frontiers = await getBlockedFrontiers();
  assertEq(frontiers[0].blocked_reasons, [], 'malformed → []');
}

// ============================================================================
// getAutonomyExplanations
// ============================================================================
console.log('\n── getAutonomyExplanations ───────────────────────────');

{
  resetRoutes();
  routes.push({
    match: /FROM system_logs\s+WHERE source = 'autonomous_advance'/is,
    handler: () => [[
      {
        timestamp: '2026-04-11T10:00:00Z', level: 'INFO',
        message: 'Advanced to next step',
        meta: JSON.stringify({
          action: 'advance', target_title: 'Prompt X',
          workflow_name: 'WF', passed_count: 13, total_gates: 13, mode: 'SAFE_ADVANCE',
        }),
      },
      {
        timestamp: '2026-04-11T10:05:00Z', level: 'WARN',
        message: 'Paused due to failed gate',
        meta: JSON.stringify({
          gate_id: 'G5', workflow_name: 'WF',
          reason: 'escalation needed',
        }),
      },
    ]],
  });
  routes.push({
    match: /COUNT\(\*\) as total_active/i,
    handler: () => [[
      { total_active: 5, advancing: 3, paused: 1, manual_only: 1 },
    ]],
  });

  const exp = await getAutonomyExplanations();
  assertEq(exp.current_mode, 'SAFE_ADVANCE', 'mode');
  assertEq(exp.enabled, true, 'enabled');
  assertEq(exp.workflow_counts.total_active, 5, 'total_active');
  assertEq(exp.workflow_counts.advancing_autonomously, 3, 'advancing');
  assertEq(exp.recent_advances.length, 1, '1 advance');
  assertEq(exp.recent_advances[0].action, 'advance', 'action');
  assertEq(exp.recent_pauses.length, 1, '1 pause');
  assertEq(exp.recent_pauses[0].failed_gate, 'G5', 'failed_gate');
  assert(exp.recent_pauses[0].what_must_change.includes('escalation'), 'resume action G5');
}

// ============================================================================
// getDashboard
// ============================================================================
console.log('\n── getDashboard ──────────────────────────────────────');

{
  resetRoutes();
  // Executive summary routes
  routes.push({ match: /FROM prompt_workflows GROUP BY status/i, handler: () => [[]] });
  routes.push({ match: /FROM om_prompt_registry GROUP BY status/i, handler: () => [[]] });
  routes.push({ match: /queue_status IS NOT NULL/i, handler: () => [[]] });
  routes.push({ match: /SUM\(CASE WHEN queue_status/i, handler: () => [[{}]] });
  // Active workflows
  routes.push({
    match: /FROM prompt_workflows WHERE status IN \('active'/i,
    handler: () => [[
      { id: 'wf-1', name: 'A', component: 'fe', status: 'active',
        blocked: 0, executing: 0, progress_pct: 100,
        autonomy_paused: 0, manual_only: 0 },
      { id: 'wf-2', name: 'B', component: 'be', status: 'active',
        autonomy_paused: 1, manual_only: 0 },
    ]],
  });
  routes.push({
    match: /FROM prompt_workflow_steps s/i,
    handler: () => [[]],
  });
  // Exception feed
  routes.push({
    match: /FROM om_prompt_registry\s+WHERE\s+\(queue_status = 'blocked'/i,
    handler: () => [[]],
  });
  // Ready to release
  routes.push({
    match: /FROM om_prompt_registry\s+WHERE queue_status IN \('ready_for_release'/i,
    handler: () => [[]],
  });
  // Recent activity
  routes.push({ match: /FROM system_logs\s+WHERE source IN/i, handler: () => [[]] });
  // Blocked frontiers
  routes.push({ match: /FROM prompt_workflows w\s+JOIN/is, handler: () => [[]] });
  // Autonomy explanations
  routes.push({
    match: /FROM system_logs\s+WHERE source = 'autonomous_advance'/is,
    handler: () => [[]],
  });
  routes.push({
    match: /COUNT\(\*\) as total_active/i,
    handler: () => [[{ total_active: 2, advancing: 1, paused: 1, manual_only: 0 }]],
  });

  const dash = await getDashboard();
  assert(dash.generated_at !== undefined, 'generated_at');
  assert(dash.summary !== undefined, 'summary');
  assert(Array.isArray(dash.active_workflows), 'active_workflows array');
  assert(Array.isArray(dash.exceptions), 'exceptions');
  assert(Array.isArray(dash.ready_to_release), 'ready_to_release');
  assert(Array.isArray(dash.blocked_frontiers), 'blocked_frontiers');
  assert(dash.autonomy !== undefined, 'autonomy');
  assert(Array.isArray(dash.activity), 'activity');

  // Classification-based sort: action_required (wf-2) should come before safe_to_ignore (wf-1)
  assertEq(dash.active_workflows[0].id, 'wf-2', 'action_required first');
  assertEq(dash.active_workflows[1].id, 'wf-1', 'safe_to_ignore second');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
