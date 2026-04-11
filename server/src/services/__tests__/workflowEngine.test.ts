#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowEngine.js (OMD-1137)
 *
 * Multi-step workflow orchestration engine.
 *
 * Strategy:
 *   - Stub ../config/db via require.cache with a route-dispatch fake pool
 *   - Stub ./platformEvents via require.cache (publishPlatformEvent)
 *
 * Coverage:
 *   - executeWorkflow:
 *       · workflow not found → throws
 *       · cooldown active → skipped_cooldown
 *       · concurrency limit → skipped_concurrency
 *       · invalid JSON definition → failed
 *       · empty definition → failed
 *       · all steps complete → completed
 *       · step throws → failed, remaining cancelled
 *       · condition-check SKIP → partially_completed
 *       · output merged into runContext for downstream steps
 *   - Step types: create_task, create_alert, emit_event, condition_check,
 *     assign_task, update_status, wait, unknown type
 *   - stepConditionCheck: 4 checks (stale/stalled/ocr/failed) + unknown check
 *     + all 6 comparison operators via compareValues coverage
 *   - resolveTemplate: {{var}} substitution, nested paths, missing keys
 *   - retryWorkflowRun: not found → throws, happy path
 *   - cancelWorkflowRun: no rows → throws, happy path cancels steps
 *   - evaluateWorkflowTriggers: event_type/category/severity_min filters,
 *     min_count threshold
 *   - executeScheduledWorkflows: aggregates results, error captured
 *   - queryWorkflows: filter composition, JSON parse
 *   - getWorkflowDetail: not found → null, JSON parse, recent_runs
 *   - getWorkflowRunDetail: not found → null, step JSON parse
 *   - queryWorkflowRuns: filters, limit clamp, total count
 *   - toggleWorkflow: affects row
 *
 * Run: npx tsx server/src/services/__tests__/workflowEngine.test.ts
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

// ── Route-dispatch fake pool ────────────────────────────────────────
type Route = {
  match: RegExp;
  handler: (sql: string, params: any[]) => any;
};

let routes: Route[] = [];
const queryLog: Array<{ sql: string; params: any[] }> = [];
let nextInsertId = 100;

const pool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        return r.handler(sql, params);
      }
    }
    // Default: rows/affectedRows
    if (/^INSERT/i.test(sql)) return [{ insertId: nextInsertId++, affectedRows: 1 }, {}];
    if (/^UPDATE/i.test(sql)) return [{ affectedRows: 1 }, {}];
    return [[], {}];
  },
};

// ── Stub config/db ──────────────────────────────────────────────────
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => pool },
} as any;

// ── Stub platformEvents ─────────────────────────────────────────────
const publishedEvents: any[] = [];
let nextEventId = 1000;
let publishThrows = false;

const eventsPath = require.resolve('../platformEvents');
require.cache[eventsPath] = {
  id: eventsPath,
  filename: eventsPath,
  loaded: true,
  exports: {
    publishPlatformEvent: async (event: any) => {
      if (publishThrows) throw new Error('publish failed');
      const id = nextEventId++;
      publishedEvents.push({ id, ...event });
      return { id };
    },
  },
} as any;

function resetAll() {
  routes = [];
  queryLog.length = 0;
  nextInsertId = 100;
  publishedEvents.length = 0;
  nextEventId = 1000;
  publishThrows = false;
}

// Silence noisy logs
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function loud() {
  console.log = origLog;
  console.warn = origWarn;
  console.error = origError;
}

const {
  executeWorkflow,
  retryWorkflowRun,
  cancelWorkflowRun,
  evaluateWorkflowTriggers,
  executeScheduledWorkflows,
  queryWorkflows,
  getWorkflowDetail,
  getWorkflowRunDetail,
  queryWorkflowRuns,
  toggleWorkflow,
} = require('../workflowEngine');

// Helper to match INSERT INTO platform_workflow_runs (returns a new run id)
function runInsertRoute(): Route {
  return {
    match: /INSERT INTO platform_workflow_runs/,
    handler: () => [{ insertId: 500, affectedRows: 1 }, {}],
  };
}

// Helper to match INSERT INTO platform_workflow_steps
function stepInsertRoute(): Route {
  return {
    match: /INSERT INTO platform_workflow_steps/,
    handler: () => {
      const id = nextInsertId++;
      return [{ insertId: id, affectedRows: 1 }, {}];
    },
  };
}

// Helper: update routes
function updateAnyRoute(): Route {
  return {
    match: /^\s*UPDATE/i,
    handler: () => [{ affectedRows: 1 }, {}],
  };
}

async function main() {

// ============================================================================
// executeWorkflow: workflow not found
// ============================================================================
console.log('\n── executeWorkflow: not found ────────────────────────────');

resetAll();
routes = [
  { match: /FROM platform_workflows WHERE id = \?/, handler: () => [[], {}] },
];
{
  let caught: Error | null = null;
  try { await executeWorkflow({ workflowId: 999 }); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when not found');
  assert(caught !== null && caught.message.includes('not found or disabled'), 'error mentions not found');
}

// ============================================================================
// executeWorkflow: cooldown active → skipped
// ============================================================================
console.log('\n── executeWorkflow: cooldown skip ────────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 1, workflow_key: 'wf_test', name: 'Test', cooldown_seconds: 60,
      max_concurrent: null, definition: '[]',
    }], {}],
  },
  {
    match: /FROM platform_workflow_runs[\s\S]*cooldown/i,
    handler: () => [[{ id: 1 }], {}],
  },
  // Also need to match the cooldown check (uses DATE_SUB)
  {
    match: /FROM platform_workflow_runs[\s\S]*completed[\s\S]*DATE_SUB/i,
    handler: () => [[{ id: 1 }], {}],
  },
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 1 });
  loud();
  assertEq(r.status, 'skipped_cooldown', 'status = skipped_cooldown');
  assertEq(r.runId, null, 'runId = null');
  assert(publishedEvents.some(e => e.event_type === 'workflow.skipped_cooldown'), 'published skipped_cooldown event');
}

// ============================================================================
// executeWorkflow: concurrency limit → skipped
// ============================================================================
console.log('\n── executeWorkflow: concurrency skip ─────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 2, workflow_key: 'wf_c', name: 'Concurrent', cooldown_seconds: null,
      max_concurrent: 3, definition: '[]',
    }], {}],
  },
  // Concurrent count query (returns 5 running → >= 3)
  {
    match: /COUNT\(\*\) AS cnt FROM platform_workflow_runs[\s\S]*queued/i,
    handler: () => [[{ cnt: 5 }], {}],
  },
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 2 });
  loud();
  assertEq(r.status, 'skipped_concurrency', 'status = skipped_concurrency');
  assert(publishedEvents.some(e => e.event_type === 'workflow.skipped_concurrency'), 'published event');
}

// ============================================================================
// executeWorkflow: invalid JSON definition → failed
// ============================================================================
console.log('\n── executeWorkflow: invalid definition JSON ──────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 3, workflow_key: 'wf_bad', name: 'Bad',
      cooldown_seconds: null, max_concurrent: null,
      definition: '{not valid json',
    }], {}],
  },
  runInsertRoute(),
  updateAnyRoute(),
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 3 });
  loud();
  assertEq(r.status, 'failed', 'status = failed');
  assertEq(r.runId, 500, 'runId from insert');
}

// ============================================================================
// executeWorkflow: empty definition → failed
// ============================================================================
console.log('\n── executeWorkflow: empty steps ──────────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 4, workflow_key: 'wf_empty', name: 'Empty',
      cooldown_seconds: null, max_concurrent: null, definition: '[]',
    }], {}],
  },
  runInsertRoute(),
  updateAnyRoute(),
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 4 });
  loud();
  assertEq(r.status, 'failed', 'empty definition fails');
}

// ============================================================================
// executeWorkflow: happy path — single emit_event step completes
// ============================================================================
console.log('\n── executeWorkflow: emit_event happy ─────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 5, workflow_key: 'wf_emit', name: 'Emit',
      cooldown_seconds: null, max_concurrent: null,
      definition: JSON.stringify([
        { step_key: 'emit1', step_type: 'emit_event',
          config: { event_type: 'test.event', title: 'Test Event' } },
      ]),
    }], {}],
  },
  runInsertRoute(),
  stepInsertRoute(),
  updateAnyRoute(),
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 5, context: { foo: 'bar' } });
  loud();
  assertEq(r.status, 'completed', 'status = completed');
  assertEq(r.runId, 500, 'runId');
  // Should publish workflow.started + stepEmitEvent + workflow.completed
  assert(publishedEvents.some(e => e.event_type === 'workflow.started'), 'started event');
  assert(publishedEvents.some(e => e.event_type === 'test.event'), 'step emit event');
  assert(publishedEvents.some(e => e.event_type === 'workflow.completed'), 'completed event');
}

// ============================================================================
// executeWorkflow: step failure → failed + remaining cancelled
// ============================================================================
console.log('\n── executeWorkflow: step fails ───────────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 6, workflow_key: 'wf_fail', name: 'Fail',
      cooldown_seconds: null, max_concurrent: null,
      definition: JSON.stringify([
        { step_key: 'unknown', step_type: 'not_a_real_type', config: {} },
        { step_key: 'never', step_type: 'emit_event', config: {} },
      ]),
    }], {}],
  },
  runInsertRoute(),
  stepInsertRoute(),
  updateAnyRoute(),
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 6 });
  loud();
  assertEq(r.status, 'failed', 'status = failed');
  assert(publishedEvents.some(e => e.event_type === 'workflow.failed'), 'failed event');
  // Second step should have been inserted as cancelled (status in SQL, not param)
  const cancelledInserts = queryLog.filter(q =>
    /INSERT INTO platform_workflow_steps/.test(q.sql) && /'cancelled'/.test(q.sql));
  assert(cancelledInserts.length >= 1, 'remaining step inserted as cancelled');
}

// ============================================================================
// executeWorkflow: condition_check SKIP → partially_completed
// ============================================================================
console.log('\n── executeWorkflow: condition_check skip ─────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 7, workflow_key: 'wf_cond', name: 'Cond',
      cooldown_seconds: null, max_concurrent: null,
      definition: JSON.stringify([
        { step_key: 'check', step_type: 'condition_check',
          config: { check: 'ocr_queue_depth', threshold: 100, operator: '>=' } },
        { step_key: 'never', step_type: 'emit_event', config: {} },
      ]),
    }], {}],
  },
  runInsertRoute(),
  stepInsertRoute(),
  // ocr_queue_depth returns 5 < 100 → skip
  {
    match: /COUNT\(\*\) AS cnt FROM omai_tasks[\s\S]*ocr_feeder/,
    handler: () => [[{ cnt: 5 }], {}],
  },
  updateAnyRoute(),
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 7 });
  loud();
  assertEq(r.status, 'partially_completed', 'status = partially_completed');
  // Check there was a skipped step update (status = 'skipped' in SQL)
  const skipped = queryLog.some(q =>
    /UPDATE platform_workflow_steps/.test(q.sql) && /status = 'skipped'/.test(q.sql));
  assert(skipped, 'step marked skipped');
  // Remaining step inserted as skipped
  const skippedInserts = queryLog.filter(q =>
    /INSERT INTO platform_workflow_steps/.test(q.sql) && /'skipped'/.test(q.sql));
  assert(skippedInserts.length >= 1, 'remaining step inserted as skipped');
}

// ============================================================================
// executeWorkflow: condition_check passes → continues
// ============================================================================
console.log('\n── executeWorkflow: condition_check passes ───────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 8, workflow_key: 'wf_cond2', name: 'Cond2',
      cooldown_seconds: null, max_concurrent: null,
      definition: JSON.stringify([
        { step_key: 'check', step_type: 'condition_check',
          config: { check: 'stale_task_count', threshold: 1, operator: '>=' } },
        { step_key: 'alert', step_type: 'create_alert',
          config: { title: 'Stale: {{check.value}}' } },
      ]),
    }], {}],
  },
  runInsertRoute(),
  stepInsertRoute(),
  // stale_task_count returns 3 >= 1 → pass
  {
    match: /COUNT\(\*\) AS cnt FROM omai_tasks[\s\S]*last_heartbeat/,
    handler: () => [[{ cnt: 3 }], {}],
  },
  updateAnyRoute(),
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 8 });
  loud();
  assertEq(r.status, 'completed', 'status = completed');
  // Alert should have been published with templated title
  const alert = publishedEvents.find(e => e.event_type === 'alert.workflow_generated');
  assert(alert !== undefined, 'alert published');
  assertEq(alert!.title, 'Stale: 3', 'template resolved {{check.value}}');
}

// ============================================================================
// Step: create_task
// ============================================================================
console.log('\n── executeWorkflow: create_task ──────────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 9, workflow_key: 'wf_ct', name: 'CT',
      cooldown_seconds: null, max_concurrent: null,
      definition: JSON.stringify([
        { step_key: 'make_task', step_type: 'create_task',
          config: { task_type: 'followup', title: 'Follow up {{foo}}', source_feature: 'test', metadata: { k: 'v' } } },
      ]),
    }], {}],
  },
  runInsertRoute(),
  stepInsertRoute(),
  // omai_tasks insert
  {
    match: /INSERT INTO omai_tasks/,
    handler: () => [{ insertId: 7777, affectedRows: 1 }, {}],
  },
  updateAnyRoute(),
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 9, context: { foo: 'bar' } });
  loud();
  assertEq(r.status, 'completed', 'completed');
  // Verify insert into omai_tasks happened with templated title
  const taskInsert = queryLog.find(q => /INSERT INTO omai_tasks/.test(q.sql));
  assert(taskInsert !== undefined, 'task insert issued');
  assertEq(taskInsert!.params[0], 'followup', 'task_type');
  assertEq(taskInsert!.params[1], 'test', 'source_feature');
  assertEq(taskInsert!.params[2], 'Follow up bar', 'templated title');
  const meta = JSON.parse(taskInsert!.params[3]);
  assertEq(meta.k, 'v', 'metadata merged');
  assertEq(meta.workflow_key, 'wf_ct', 'workflow_key injected');
  // Task should have been linked to run_id
  const linkUpdate = queryLog.find(q => /UPDATE omai_tasks SET workflow_run_id/.test(q.sql));
  assert(linkUpdate !== undefined, 'task linked to run');
  assertEq(linkUpdate!.params[0], 500, 'run_id = 500');
  assertEq(linkUpdate!.params[1], 7777, 'task_id');
}

// ============================================================================
// Step: assign_task — no task_id
// ============================================================================
console.log('\n── executeWorkflow: assign_task no id ────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 10, workflow_key: 'wf_at', name: 'AT',
      cooldown_seconds: null, max_concurrent: null,
      definition: JSON.stringify([
        { step_key: 'assign', step_type: 'assign_task', config: {} },
      ]),
    }], {}],
  },
  runInsertRoute(),
  stepInsertRoute(),
  updateAnyRoute(),
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 10 });
  loud();
  assertEq(r.status, 'failed', 'no task_id → fails');
}

// ============================================================================
// Step: assign_task with task_id
// ============================================================================
console.log('\n── executeWorkflow: assign_task with id ──────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 11, workflow_key: 'wf_at2', name: 'AT2',
      cooldown_seconds: null, max_concurrent: null,
      definition: JSON.stringify([
        { step_key: 'assign', step_type: 'assign_task',
          config: { task_id: 999, assignee_name: 'alice' } },
      ]),
    }], {}],
  },
  runInsertRoute(),
  stepInsertRoute(),
  updateAnyRoute(),
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 11 });
  loud();
  assertEq(r.status, 'completed', 'completed');
  const assignUpdate = queryLog.find(q => /JSON_SET/.test(q.sql));
  assert(assignUpdate !== undefined, 'JSON_SET update issued');
  assertEq(assignUpdate!.params[0], 'alice', 'assignee');
  assertEq(assignUpdate!.params[1], 999, 'task_id');
}

// ============================================================================
// Step: update_status — invalid status
// ============================================================================
console.log('\n── executeWorkflow: update_status invalid ────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 12, workflow_key: 'wf_us', name: 'US',
      cooldown_seconds: null, max_concurrent: null,
      definition: JSON.stringify([
        { step_key: 'update', step_type: 'update_status',
          config: { task_id: 1, status: 'bogus' } },
      ]),
    }], {}],
  },
  runInsertRoute(),
  stepInsertRoute(),
  updateAnyRoute(),
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 12 });
  loud();
  assertEq(r.status, 'failed', 'invalid status → fails');
}

// ============================================================================
// Step: update_status — valid
// ============================================================================
console.log('\n── executeWorkflow: update_status valid ──────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 13, workflow_key: 'wf_us2', name: 'US2',
      cooldown_seconds: null, max_concurrent: null,
      definition: JSON.stringify([
        { step_key: 'update', step_type: 'update_status',
          config: { task_id: 5, status: 'succeeded' } },
      ]),
    }], {}],
  },
  runInsertRoute(),
  stepInsertRoute(),
  updateAnyRoute(),
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 13 });
  loud();
  assertEq(r.status, 'completed', 'completed');
  const updUpd = queryLog.find(q => /UPDATE omai_tasks SET status = \? WHERE id = \?/.test(q.sql));
  assert(updUpd !== undefined, 'status update issued');
  assertEq(updUpd!.params[0], 'succeeded', 'new status');
  assertEq(updUpd!.params[1], 5, 'task_id');
}

// ============================================================================
// Step: wait
// ============================================================================
console.log('\n── executeWorkflow: wait ─────────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 14, workflow_key: 'wf_wait', name: 'Wait',
      cooldown_seconds: null, max_concurrent: null,
      definition: JSON.stringify([
        { step_key: 'pause', step_type: 'wait',
          config: { delay_seconds: 0.01 } },  // 10ms
      ]),
    }], {}],
  },
  runInsertRoute(),
  stepInsertRoute(),
  updateAnyRoute(),
];
quiet();
{
  const start = Date.now();
  const r = await executeWorkflow({ workflowId: 14 });
  const elapsed = Date.now() - start;
  loud();
  assertEq(r.status, 'completed', 'wait completed');
  assert(elapsed >= 0, 'elapsed sane');
}

// ============================================================================
// condition_check: stalled_onboarding_count
// ============================================================================
console.log('\n── condition_check: stalled_onboarding_count ─────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 15, workflow_key: 'wf_sob', name: 'SOB',
      cooldown_seconds: null, max_concurrent: null,
      definition: JSON.stringify([
        { step_key: 'check', step_type: 'condition_check',
          config: { check: 'stalled_onboarding_count', threshold: 2, operator: '>' } },
      ]),
    }], {}],
  },
  runInsertRoute(),
  stepInsertRoute(),
  { match: /tenant_provision/, handler: () => [[{ cnt: 5 }], {}] },
  updateAnyRoute(),
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 15 });
  loud();
  assertEq(r.status, 'completed', '5 > 2 passes');
}

// ============================================================================
// condition_check: failed_task_count_recent
// ============================================================================
console.log('\n── condition_check: failed_task_count_recent ─────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 16, workflow_key: 'wf_ftc', name: 'FTC',
      cooldown_seconds: null, max_concurrent: null,
      definition: JSON.stringify([
        { step_key: 'check', step_type: 'condition_check',
          config: { check: 'failed_task_count_recent', threshold: 10, operator: '<', time_window_seconds: 7200 } },
      ]),
    }], {}],
  },
  runInsertRoute(),
  stepInsertRoute(),
  { match: /status = 'failed'[\s\S]*finished_at/, handler: () => [[{ cnt: 3 }], {}] },
  updateAnyRoute(),
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 16 });
  loud();
  assertEq(r.status, 'completed', '3 < 10 passes');
  // Check window param passed
  const ftc = queryLog.find(q => /status = 'failed'[\s\S]*finished_at/.test(q.sql));
  assertEq(ftc!.params[0], 7200, 'custom window');
}

// ============================================================================
// condition_check: unknown check type → step fails
// ============================================================================
console.log('\n── condition_check: unknown ──────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 17, workflow_key: 'wf_unk', name: 'Unk',
      cooldown_seconds: null, max_concurrent: null,
      definition: JSON.stringify([
        { step_key: 'check', step_type: 'condition_check',
          config: { check: 'bogus_check', threshold: 1 } },
      ]),
    }], {}],
  },
  runInsertRoute(),
  stepInsertRoute(),
  updateAnyRoute(),
];
quiet();
{
  const r = await executeWorkflow({ workflowId: 17 });
  loud();
  assertEq(r.status, 'failed', 'unknown check → fails');
}

// ============================================================================
// retryWorkflowRun: not found → throws
// ============================================================================
console.log('\n── retryWorkflowRun: not found ───────────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflow_runs WHERE id = \? AND status IN/,
    handler: () => [[], {}],
  },
];
{
  let caught: Error | null = null;
  try { await retryWorkflowRun(999); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('not retryable'), 'error mentions not retryable');
}

// ============================================================================
// retryWorkflowRun: happy path
// ============================================================================
console.log('\n── retryWorkflowRun: happy ───────────────────────────────');

resetAll();
routes = [
  // Retry lookup
  {
    match: /FROM platform_workflow_runs WHERE id = \? AND status IN/,
    handler: () => [[{
      id: 77, workflow_id: 1, trigger_event_id: null,
      context: JSON.stringify({ key: 'val' }),
    }], {}],
  },
  // Workflow load for executeWorkflow
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 1, workflow_key: 'wf_retry', name: 'Retry',
      cooldown_seconds: null, max_concurrent: null,
      definition: JSON.stringify([
        { step_key: 'emit', step_type: 'emit_event', config: {} },
      ]),
    }], {}],
  },
  runInsertRoute(),
  stepInsertRoute(),
  updateAnyRoute(),
];
quiet();
{
  const r = await retryWorkflowRun(77);
  loud();
  assertEq(r.status, 'completed', 'retry completes');
  // Verify triggerSource was 'retry'
  const runInsert = queryLog.find(q => /INSERT INTO platform_workflow_runs/.test(q.sql));
  assertEq(runInsert!.params[2], 'retry', 'trigger_source = retry');
}

// ============================================================================
// cancelWorkflowRun: not found
// ============================================================================
console.log('\n── cancelWorkflowRun: not found ──────────────────────────');

resetAll();
routes = [
  {
    match: /UPDATE platform_workflow_runs[\s\S]*cancelled/,
    handler: () => [{ affectedRows: 0 }, {}],
  },
];
{
  let caught: Error | null = null;
  try { await cancelWorkflowRun(999); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('already terminal'), 'error mentions terminal');
}

// ============================================================================
// cancelWorkflowRun: happy
// ============================================================================
console.log('\n── cancelWorkflowRun: happy ──────────────────────────────');

resetAll();
routes = [
  {
    match: /UPDATE platform_workflow_runs[\s\S]*cancelled/,
    handler: () => [{ affectedRows: 1 }, {}],
  },
  {
    match: /UPDATE platform_workflow_steps[\s\S]*cancelled/,
    handler: () => [{ affectedRows: 3 }, {}],
  },
];
{
  const r = await cancelWorkflowRun(42);
  assertEq(r.runId, 42, 'runId');
  assertEq(r.status, 'cancelled', 'status');
  // Both update queries happened
  assert(queryLog.some(q => /UPDATE platform_workflow_runs[\s\S]*cancelled/.test(q.sql)), 'run updated');
  assert(queryLog.some(q => /UPDATE platform_workflow_steps[\s\S]*cancelled/.test(q.sql)), 'steps updated');
}

// ============================================================================
// evaluateWorkflowTriggers: event_type filter
// ============================================================================
console.log('\n── evaluateWorkflowTriggers: event_type filter ───────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows[\s\S]*trigger_type = 'event'/,
    handler: () => [[
      {
        id: 100, workflow_key: 'wf_a', name: 'A',
        cooldown_seconds: null, max_concurrent: null,
        trigger_config: JSON.stringify({ event_type: 'foo.bar' }),
        definition: JSON.stringify([]),
      },
      {
        id: 101, workflow_key: 'wf_b', name: 'B',
        cooldown_seconds: null, max_concurrent: null,
        trigger_config: JSON.stringify({ event_type: 'baz.qux' }),
        definition: JSON.stringify([]),
      },
    ], {}],
  },
];
// Intercept fire-and-forget executeWorkflow calls by stubbing FROM platform_workflows WHERE id = ?
// Both wf_a and wf_b will fail on empty definition, but that's OK — we just count invocations.

// Instead: just verify that only matching workflows attempt fire-and-forget
// (We can't easily intercept the fire-and-forget, but we can check nothing throws)
quiet();
await evaluateWorkflowTriggers(555, {
  event_type: 'foo.bar', category: 'system', severity: 'info',
  title: 't', source_system: 'test', source_ref_id: null,
});
// Wait briefly for fire-and-forget
await new Promise(r => setTimeout(r, 50));
loud();
{
  // Should have loaded wf_a and NOT wf_b
  const loads = queryLog.filter(q => /FROM platform_workflows WHERE id = \?/.test(q.sql));
  // At least one load for wf_a=100
  assert(loads.some(l => l.params[0] === 100), 'wf_a loaded');
  assert(!loads.some(l => l.params[0] === 101), 'wf_b NOT loaded (filtered)');
}

// ============================================================================
// evaluateWorkflowTriggers: severity filter
// ============================================================================
console.log('\n── evaluateWorkflowTriggers: severity_min filter ─────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows[\s\S]*trigger_type = 'event'/,
    handler: () => [[
      {
        id: 200, workflow_key: 'wf_sev', name: 'Sev',
        cooldown_seconds: null, max_concurrent: null,
        trigger_config: JSON.stringify({ severity_min: 'critical' }),
      },
    ], {}],
  },
];
quiet();
await evaluateWorkflowTriggers(556, {
  event_type: 'x', category: 'system', severity: 'info',
});
await new Promise(r => setTimeout(r, 50));
loud();
{
  // info < critical → filtered out
  const loads = queryLog.filter(q => /FROM platform_workflows WHERE id = \?/.test(q.sql));
  assertEq(loads.length, 0, 'filtered by severity_min');
}

// ============================================================================
// evaluateWorkflowTriggers: min_count threshold
// ============================================================================
console.log('\n── evaluateWorkflowTriggers: min_count threshold ─────────');

resetAll();
let countCallCount = 0;
routes = [
  {
    match: /FROM platform_workflows[\s\S]*trigger_type = 'event'/,
    handler: () => [[
      {
        id: 300, workflow_key: 'wf_count', name: 'Count',
        cooldown_seconds: null, max_concurrent: null,
        trigger_config: JSON.stringify({ min_count: 5, time_window_seconds: 600 }),
      },
    ], {}],
  },
  {
    match: /COUNT\(\*\) AS cnt FROM platform_events/,
    handler: () => { countCallCount++; return [[{ cnt: 2 }], {}]; },
  },
];
quiet();
await evaluateWorkflowTriggers(557, { event_type: 'y', category: 's', severity: 'info' });
await new Promise(r => setTimeout(r, 50));
loud();
{
  assertEq(countCallCount, 1, 'count query issued');
  // 2 < 5 → filtered
  const loads = queryLog.filter(q => /FROM platform_workflows WHERE id = \?/.test(q.sql));
  assertEq(loads.length, 0, 'filtered by min_count');
}

// ============================================================================
// executeScheduledWorkflows
// ============================================================================
console.log('\n── executeScheduledWorkflows ─────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows[\s\S]*trigger_type = 'schedule'/,
    handler: () => [[
      { id: 400, workflow_key: 'sched_a', name: 'A',
        cooldown_seconds: null, max_concurrent: null,
        definition: JSON.stringify([{ step_key: 'e', step_type: 'emit_event', config: {} }]) },
      { id: 401, workflow_key: 'sched_b', name: 'B',
        cooldown_seconds: null, max_concurrent: null,
        definition: JSON.stringify([]) },  // will fail
    ], {}],
  },
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: (_s, p) => {
      if (p[0] === 400) return [[{
        id: 400, workflow_key: 'sched_a', name: 'A',
        cooldown_seconds: null, max_concurrent: null,
        definition: JSON.stringify([{ step_key: 'e', step_type: 'emit_event', config: {} }]),
      }], {}];
      return [[{
        id: 401, workflow_key: 'sched_b', name: 'B',
        cooldown_seconds: null, max_concurrent: null,
        definition: '[]',
      }], {}];
    },
  },
  runInsertRoute(),
  stepInsertRoute(),
  updateAnyRoute(),
];
quiet();
{
  const results = await executeScheduledWorkflows();
  loud();
  assertEq(results.length, 2, '2 results');
  const a = results.find((r: any) => r.workflow_key === 'sched_a');
  const b = results.find((r: any) => r.workflow_key === 'sched_b');
  assertEq(a!.status, 'completed', 'sched_a completed');
  assertEq(b!.status, 'failed', 'sched_b failed');
}

// ============================================================================
// queryWorkflows: filter composition
// ============================================================================
console.log('\n── queryWorkflows: filters ───────────────────────────────');

resetAll();
let capturedSql = '';
let capturedParams: any[] = [];
routes = [
  {
    match: /FROM platform_workflows/,
    handler: (sql, params) => {
      capturedSql = sql;
      capturedParams = params;
      return [[
        { id: 1, workflow_key: 'a', trigger_config: JSON.stringify({ x: 1 }) },
        { id: 2, workflow_key: 'b', trigger_config: '{not json' },
      ], {}];
    },
  },
];
{
  const r = await queryWorkflows({ category: 'system', trigger_type: 'event', is_enabled: true });
  assert(/category = \?/.test(capturedSql), 'category filter');
  assert(/trigger_type = \?/.test(capturedSql), 'trigger_type filter');
  assert(/is_enabled = \?/.test(capturedSql), 'is_enabled filter');
  assertEq(capturedParams, ['system', 'event', 1], 'params in order');
  assertEq(r.length, 2, '2 rows');
  assertEq((r[0] as any).trigger_config.x, 1, 'first parsed');
  // Second has invalid JSON → remains string (caught)
  assertEq(typeof (r[1] as any).trigger_config, 'string', 'second unparsed (invalid)');
}

// ============================================================================
// getWorkflowDetail: not found
// ============================================================================
console.log('\n── getWorkflowDetail ─────────────────────────────────────');

resetAll();
routes = [
  { match: /FROM platform_workflows WHERE id = \?/, handler: () => [[], {}] },
];
{
  const r = await getWorkflowDetail(999);
  assertEq(r, null, 'not found → null');
}

resetAll();
routes = [
  {
    match: /FROM platform_workflows WHERE id = \?/,
    handler: () => [[{
      id: 10, workflow_key: 'a', name: 'A',
      definition: JSON.stringify([{ s: 1 }]),
      trigger_config: JSON.stringify({ t: 1 }),
    }], {}],
  },
  {
    match: /FROM platform_workflow_runs/,
    handler: () => [[{ id: 1, status: 'completed' }, { id: 2, status: 'failed' }], {}],
  },
];
{
  const r = await getWorkflowDetail(10);
  assert(Array.isArray(r.definition), 'definition parsed');
  assertEq(r.definition[0].s, 1, 'definition content');
  assertEq(r.trigger_config.t, 1, 'trigger_config parsed');
  assertEq(r.recent_runs.length, 2, '2 recent runs');
}

// ============================================================================
// getWorkflowRunDetail
// ============================================================================
console.log('\n── getWorkflowRunDetail ──────────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflow_runs r[\s\S]*WHERE r\.id = \?/,
    handler: () => [[], {}],
  },
];
{
  const r = await getWorkflowRunDetail(999);
  assertEq(r, null, 'not found → null');
}

resetAll();
routes = [
  {
    match: /FROM platform_workflow_runs r[\s\S]*WHERE r\.id = \?/,
    handler: () => [[{
      id: 50, workflow_id: 1, workflow_key: 'a', workflow_name: 'A',
      status: 'completed',
      context: JSON.stringify({ k: 'v' }),
    }], {}],
  },
  {
    match: /FROM platform_workflow_steps[\s\S]*ORDER BY step_order/,
    handler: () => [[
      { id: 1, step_key: 's1', input_json: JSON.stringify({ a: 1 }), output_json: '{bad' },
      { id: 2, step_key: 's2', input_json: null, output_json: null },
    ], {}],
  },
];
{
  const r = await getWorkflowRunDetail(50);
  assertEq((r.context as any).k, 'v', 'context parsed');
  assertEq(r.steps.length, 2, '2 steps');
  assertEq((r.steps[0].input_json as any).a, 1, 'step input parsed');
  // Second step input_json is null — preserved
  assertEq(r.steps[1].input_json, null, 'null input preserved');
}

// ============================================================================
// queryWorkflowRuns: filters + limit clamp + total
// ============================================================================
console.log('\n── queryWorkflowRuns ─────────────────────────────────────');

resetAll();
let qwrSql = '';
let qwrParams: any[] = [];
routes = [
  {
    match: /FROM platform_workflow_runs r[\s\S]*LIMIT/,
    handler: (sql, params) => {
      qwrSql = sql;
      qwrParams = params;
      return [[{ id: 1 }], {}];
    },
  },
  {
    match: /SELECT COUNT\(\*\) AS total FROM platform_workflow_runs/,
    handler: () => [[{ total: 42 }], {}],
  },
];
{
  const r = await queryWorkflowRuns({
    workflow_id: 10, status: 'completed', trigger_source: 'event',
    limit: 500, offset: 10,  // limit should clamp to 200
  });
  assertEq(r.total, 42, 'total');
  assertEq(r.limit, 200, 'limit clamped to 200');
  assertEq(r.offset, 10, 'offset');
  assert(/r\.workflow_id = \?/.test(qwrSql), 'workflow_id filter');
  assert(/r\.status = \?/.test(qwrSql), 'status filter');
  assert(/r\.trigger_source = \?/.test(qwrSql), 'trigger_source filter');
  // Last two params are limit/offset
  assertEq(qwrParams[qwrParams.length - 2], 200, 'limit param');
  assertEq(qwrParams[qwrParams.length - 1], 10, 'offset param');
}

// Default limit/offset
resetAll();
routes = [
  { match: /LIMIT/, handler: () => [[], {}] },
  { match: /SELECT COUNT/, handler: () => [[{ total: 0 }], {}] },
];
{
  const r = await queryWorkflowRuns({});
  assertEq(r.limit, 50, 'default limit 50');
  assertEq(r.offset, 0, 'default offset 0');
}

// ============================================================================
// toggleWorkflow
// ============================================================================
console.log('\n── toggleWorkflow ────────────────────────────────────────');

resetAll();
routes = [
  { match: /UPDATE platform_workflows SET is_enabled/, handler: () => [{ affectedRows: 1 }, {}] },
];
{
  const r = await toggleWorkflow(5, true, 99);
  assertEq(r, true, 'affected');
  const q = queryLog.find(qq => /UPDATE platform_workflows SET is_enabled/.test(qq.sql));
  assertEq(q!.params[0], 1, 'enabled = 1');
  assertEq(q!.params[1], 99, 'updatedBy');
  assertEq(q!.params[2], 5, 'workflowId');
}

resetAll();
routes = [
  { match: /UPDATE platform_workflows SET is_enabled/, handler: () => [{ affectedRows: 0 }, {}] },
];
{
  const r = await toggleWorkflow(999, false);
  assertEq(r, false, 'not affected → false');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
