#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowEngine.js (OMD-1039)
 *
 * Platform workflow orchestration. Coverage:
 *   - executeWorkflow
 *       · not found / disabled → throws
 *       · cooldown active → skipped_cooldown
 *       · max concurrent reached → skipped_concurrency
 *       · invalid JSON definition → run marked failed
 *       · empty definition → run marked failed
 *       · happy path: steps run sequentially, completion published
 *       · step throws SKIP → remaining steps marked skipped, run = partially_completed
 *       · step throws non-SKIP → remaining steps cancelled, run = failed
 *   - retryWorkflowRun (not found, delegates to executeWorkflow)
 *   - cancelWorkflowRun (not found, success)
 *   - evaluateWorkflowTriggers (filter branches: event_type, category, severity_min, min_count)
 *   - executeScheduledWorkflows (per-workflow loop + error capture)
 *   - queryWorkflows (filter SQL)
 *   - getWorkflowDetail (not found, JSON parsing, recent runs)
 *   - getWorkflowRunDetail (not found, steps JSON parsing)
 *   - queryWorkflowRuns (limit/offset, count)
 *   - toggleWorkflow
 *
 * Dependencies stubbed via require.cache BEFORE requiring the SUT:
 *   - ../config/db        → fake pool with SQL-routed responses
 *   - ./platformEvents    → publishPlatformEvent spy
 *
 * Run from server/: npx tsx src/services/__tests__/workflowEngine.test.ts
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

async function assertThrows(fn: () => Promise<any>, msgFragment: string, label: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${label} — expected throw containing "${msgFragment}"`);
    failed++;
  } catch (e: any) {
    if (String(e.message || '').includes(msgFragment)) {
      console.log(`  PASS: ${label}`); passed++;
    } else {
      console.error(`  FAIL: ${label}\n         expected throw containing: ${msgFragment}\n         actual:                    ${e.message}`);
      failed++;
    }
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

// ── platformEvents stub ────────────────────────────────────────────────────
const publishCalls: any[] = [];
let publishReturnId = 1;
let publishThrows = false;

const platformEventsStub = {
  publishPlatformEvent: async (event: any) => {
    publishCalls.push(event);
    if (publishThrows) throw new Error('publish failed');
    return { id: publishReturnId++ };
  },
};

const peBase = require.resolve('../platformEvents');
require.cache[peBase] = {
  id: peBase, filename: peBase, loaded: true,
  exports: platformEventsStub,
} as any;

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

function resetAll() {
  queryLog.length = 0;
  routes = [];
  publishCalls.length = 0;
  publishReturnId = 1;
  publishThrows = false;
}

// Now require SUT
const svc = require('../workflowEngine');
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
} = svc;

async function main() {

// ============================================================================
// executeWorkflow — not found / disabled
// ============================================================================
console.log('\n── executeWorkflow: not found ────────────────────────────');

resetAll();
routes = [
  { match: /SELECT \* FROM platform_workflows WHERE id = \? AND is_enabled = 1/i, rows: [] },
];
await assertThrows(
  () => executeWorkflow({ workflowId: 999 }),
  'not found or disabled',
  'missing workflow → throws'
);

// ============================================================================
// executeWorkflow — cooldown active
// ============================================================================
console.log('\n── executeWorkflow: cooldown ─────────────────────────────');

resetAll();
routes = [
  {
    match: /SELECT \* FROM platform_workflows WHERE id = \? AND is_enabled = 1/i,
    rows: [{ id: 1, name: 'Flow A', workflow_key: 'flowA', cooldown_seconds: 300, definition: '[]' }],
  },
  // cooldown check returns a recent run
  {
    match: /FROM platform_workflow_runs\s+WHERE workflow_id = \? AND status IN/i,
    rows: [{ id: 42 }],
  },
];
{
  const r = await executeWorkflow({ workflowId: 1 });
  assertEq(r.status, 'skipped_cooldown', 'returns skipped_cooldown');
  assertEq(r.runId, null, 'no run created');
  assert(publishCalls.some(c => c.event_type === 'workflow.skipped_cooldown'), 'cooldown event published');
}

// ============================================================================
// executeWorkflow — max concurrent
// ============================================================================
console.log('\n── executeWorkflow: concurrency ──────────────────────────');

resetAll();
routes = [
  {
    match: /SELECT \* FROM platform_workflows WHERE id = \?/i,
    rows: [{ id: 1, name: 'Flow A', workflow_key: 'flowA', max_concurrent: 2, definition: '[]' }],
  },
  // Concurrency check
  {
    match: /SELECT COUNT\(\*\) AS cnt FROM platform_workflow_runs\s+WHERE workflow_id = \? AND status IN \('queued','running'\)/i,
    rows: [{ cnt: 2 }],
  },
];
{
  const r = await executeWorkflow({ workflowId: 1 });
  assertEq(r.status, 'skipped_concurrency', 'skipped_concurrency');
  assert(publishCalls.some(c => c.event_type === 'workflow.skipped_concurrency'), 'skip event');
}

// ============================================================================
// executeWorkflow — invalid definition JSON
// ============================================================================
console.log('\n── executeWorkflow: invalid JSON def ─────────────────────');

resetAll();
routes = [
  {
    match: /SELECT \* FROM platform_workflows WHERE id = \?/i,
    rows: [{ id: 1, name: 'Flow', workflow_key: 'flowA', definition: 'not json{{{' }],
  },
  {
    match: /INSERT INTO platform_workflow_runs/i,
    rows: { insertId: 100 },
  },
  { match: /UPDATE platform_workflow_runs\s+SET status = 'failed'/i, rows: { affectedRows: 1 } },
];
{
  const r = await executeWorkflow({ workflowId: 1 });
  assertEq(r.runId, 100, 'run inserted');
  assertEq(r.status, 'failed', 'failed on parse error');
  const failUpdate = queryLog.find(q => /SET status = 'failed'/.test(q.sql));
  assert(failUpdate !== undefined, 'failRun called');
  assert(/Invalid workflow definition/.test(failUpdate!.params[0]), 'error message set');
}

// Empty definition array
resetAll();
routes = [
  {
    match: /SELECT \* FROM platform_workflows WHERE id = \?/i,
    rows: [{ id: 1, name: 'Flow', workflow_key: 'flowA', definition: '[]' }],
  },
  { match: /INSERT INTO platform_workflow_runs/i, rows: { insertId: 101 } },
  { match: /UPDATE platform_workflow_runs\s+SET status = 'failed'/i, rows: { affectedRows: 1 } },
];
{
  const r = await executeWorkflow({ workflowId: 1 });
  assertEq(r.status, 'failed', 'empty steps → failed');
  const failUpdate = queryLog.find(q => /SET status = 'failed'/.test(q.sql));
  assert(/no steps/.test(failUpdate!.params[0]), 'no-steps message');
}

// ============================================================================
// executeWorkflow — happy path with create_task step
// ============================================================================
console.log('\n── executeWorkflow: happy path ───────────────────────────');

resetAll();
const defn = [
  {
    step_key: 'create_followup_task',
    step_type: 'create_task',
    config: {
      task_type: 'audit',
      title: 'Audit for {{trigger_event.title}}',
      metadata: { foo: 'bar' },
    },
  },
  {
    step_key: 'emit_completed',
    step_type: 'emit_event',
    config: {
      event_type: 'workflow.custom_event',
      title: 'Custom event',
      message: 'done',
    },
  },
];

routes = [
  {
    match: /SELECT \* FROM platform_workflows WHERE id = \?/i,
    rows: [{ id: 1, name: 'Flow A', workflow_key: 'flowA', definition: JSON.stringify(defn) }],
  },
  { match: /INSERT INTO platform_workflow_runs/i, rows: { insertId: 200 } },
  { match: /INSERT INTO platform_workflow_steps/i, rows: { insertId: 300 } },
  { match: /INSERT INTO omai_tasks/i, rows: { insertId: 888 } },
  { match: /UPDATE omai_tasks SET workflow_run_id/i, rows: { affectedRows: 1 } },
  { match: /UPDATE platform_workflow_steps\s+SET status = 'completed'/i, rows: { affectedRows: 1 } },
  { match: /UPDATE platform_workflow_runs\s+SET status = \?/i, rows: { affectedRows: 1 } },
];
{
  const r = await executeWorkflow({
    workflowId: 1,
    context: { trigger_event: { title: 'High CPU' } },
  });
  assertEq(r.status, 'completed', 'completed');
  assertEq(r.runId, 200, 'runId');

  // Step 1: task insert with template resolved
  const taskInsert = queryLog.find(q => /INSERT INTO omai_tasks/.test(q.sql));
  assert(taskInsert !== undefined, 'omai_tasks inserted');
  assertEq(taskInsert!.params[0], 'audit', 'task_type from config');
  assertEq(taskInsert!.params[2], 'Audit for High CPU', 'template resolved');
  const metaParsed = JSON.parse(taskInsert!.params[3]);
  assertEq(metaParsed.workflow_key, 'flowA', 'metadata includes workflow_key');
  assertEq(metaParsed.foo, 'bar', 'user metadata merged');

  // Step 2: emit_event called publishPlatformEvent
  const emit = publishCalls.find(c => c.event_type === 'workflow.custom_event');
  assert(emit !== undefined, 'custom event emitted');

  // Completion event
  const completed = publishCalls.find(c => c.event_type === 'workflow.completed');
  assert(completed !== undefined, 'workflow.completed event published');
  assertEq(completed.severity, 'success', 'success severity');
}

// ============================================================================
// executeWorkflow — unknown step type → failed
// ============================================================================
console.log('\n── executeWorkflow: unknown step ─────────────────────────');

resetAll();
routes = [
  {
    match: /SELECT \* FROM platform_workflows WHERE id = \?/i,
    rows: [{
      id: 1, name: 'Flow A', workflow_key: 'flowA',
      definition: JSON.stringify([{ step_key: 'bad', step_type: 'nonexistent', config: {} }]),
    }],
  },
  { match: /INSERT INTO platform_workflow_runs/i, rows: { insertId: 210 } },
  { match: /INSERT INTO platform_workflow_steps/i, rows: { insertId: 301 } },
  { match: /UPDATE platform_workflow_steps\s+SET status = 'failed'/i, rows: { affectedRows: 1 } },
  { match: /UPDATE platform_workflow_runs\s+SET status = \?/i, rows: { affectedRows: 1 } },
];
{
  const r = await executeWorkflow({ workflowId: 1 });
  assertEq(r.status, 'failed', 'unknown step → failed');
  const failEv = publishCalls.find(c => c.event_type === 'workflow.failed');
  assert(failEv !== undefined, 'failed event published');
  assertEq(failEv.severity, 'critical', 'critical severity on failure');
}

// ============================================================================
// executeWorkflow — condition_check SKIP branch
// ============================================================================
console.log('\n── executeWorkflow: condition SKIP ───────────────────────');

resetAll();
const skipDef = [
  {
    step_key: 'check',
    step_type: 'condition_check',
    config: { check: 'stale_task_count', threshold: 5, operator: '>=' },
  },
  {
    step_key: 'after',
    step_type: 'create_task',
    config: { title: 'should be skipped' },
  },
];
routes = [
  {
    match: /SELECT \* FROM platform_workflows WHERE id = \?/i,
    rows: [{ id: 1, name: 'Flow', workflow_key: 'flow', definition: JSON.stringify(skipDef) }],
  },
  { match: /INSERT INTO platform_workflow_runs/i, rows: { insertId: 220 } },
  { match: /INSERT INTO platform_workflow_steps/i, rows: { insertId: 302 } },
  // condition returns value < threshold
  {
    match: /SELECT COUNT\(\*\) AS cnt FROM omai_tasks\s+WHERE status = 'running'/i,
    rows: [{ cnt: 1 }],
  },
  { match: /UPDATE platform_workflow_steps\s+SET status = 'skipped'/i, rows: { affectedRows: 1 } },
  { match: /UPDATE platform_workflow_runs\s+SET status = \?/i, rows: { affectedRows: 1 } },
];
{
  const r = await executeWorkflow({ workflowId: 1 });
  assertEq(r.status, 'partially_completed', 'partially_completed on SKIP');
  // The second step should be inserted as skipped (status is a SQL literal, not a param)
  const skippedInserts = queryLog.filter(q =>
    /INSERT INTO platform_workflow_steps[\s\S]*'skipped'/.test(q.sql)
  );
  assert(skippedInserts.length === 1, 'remaining step inserted as skipped');
}

// ============================================================================
// executeWorkflow — condition_check passes → completes
// ============================================================================
console.log('\n── executeWorkflow: condition passes ─────────────────────');

resetAll();
const passDef = [
  { step_key: 'check', step_type: 'condition_check', config: { check: 'stale_task_count', threshold: 1 } },
];
routes = [
  {
    match: /SELECT \* FROM platform_workflows WHERE id = \?/i,
    rows: [{ id: 1, name: 'Flow', workflow_key: 'flow', definition: JSON.stringify(passDef) }],
  },
  { match: /INSERT INTO platform_workflow_runs/i, rows: { insertId: 230 } },
  { match: /INSERT INTO platform_workflow_steps/i, rows: { insertId: 303 } },
  { match: /SELECT COUNT\(\*\) AS cnt FROM omai_tasks\s+WHERE status = 'running'/i, rows: [{ cnt: 10 }] },
  { match: /UPDATE platform_workflow_steps\s+SET status = 'completed'/i, rows: { affectedRows: 1 } },
  { match: /UPDATE platform_workflow_runs\s+SET status = \?/i, rows: { affectedRows: 1 } },
];
{
  const r = await executeWorkflow({ workflowId: 1 });
  assertEq(r.status, 'completed', 'condition passes → completed');
}

// ============================================================================
// retryWorkflowRun
// ============================================================================
console.log('\n── retryWorkflowRun ──────────────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflow_runs WHERE id = \? AND status IN \('failed','partially_completed'\)/i,
    rows: [],
  },
];
await assertThrows(
  () => retryWorkflowRun(999),
  'not found or not retryable',
  'retry not found → throws'
);

// Retry delegates to executeWorkflow — give it a full flow
resetAll();
routes = [
  {
    match: /FROM platform_workflow_runs WHERE id = \? AND status IN \('failed','partially_completed'\)/i,
    rows: [{ id: 100, workflow_id: 1, trigger_event_id: 5, context: '{"foo":"bar"}' }],
  },
  {
    match: /SELECT \* FROM platform_workflows WHERE id = \?/i,
    rows: [{ id: 1, name: 'Flow', workflow_key: 'f', definition: '[]' }],
  },
  { match: /INSERT INTO platform_workflow_runs/i, rows: { insertId: 300 } },
  { match: /UPDATE platform_workflow_runs\s+SET status = 'failed'/i, rows: { affectedRows: 1 } },
];
{
  const r = await retryWorkflowRun(100);
  assertEq(r.runId, 300, 'new run created');
  // The INSERT should use retry trigger source
  const runInsert = queryLog.find(q => /INSERT INTO platform_workflow_runs/.test(q.sql));
  assertEq(runInsert!.params[2], 'retry', 'trigger_source=retry');
  assertEq(runInsert!.params[1], 5, 'trigger_event_id copied');
}

// ============================================================================
// cancelWorkflowRun
// ============================================================================
console.log('\n── cancelWorkflowRun ─────────────────────────────────────');

resetAll();
routes = [
  { match: /UPDATE platform_workflow_runs\s+SET status = 'cancelled'/i, rows: { affectedRows: 0 } },
];
await assertThrows(
  () => cancelWorkflowRun(999),
  'not found or already terminal',
  'cancel not found → throws'
);

resetAll();
routes = [
  { match: /UPDATE platform_workflow_runs\s+SET status = 'cancelled'/i, rows: { affectedRows: 1 } },
  { match: /UPDATE platform_workflow_steps\s+SET status = 'cancelled'/i, rows: { affectedRows: 3 } },
];
{
  const r = await cancelWorkflowRun(100);
  assertEq(r.runId, 100, 'runId returned');
  assertEq(r.status, 'cancelled', 'cancelled');
  assertEq(queryLog.length, 2, 'run + steps cancelled');
}

// ============================================================================
// evaluateWorkflowTriggers
// ============================================================================
console.log('\n── evaluateWorkflowTriggers ──────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows\s+WHERE is_enabled = 1 AND trigger_type = 'event'/i,
    rows: [
      {
        id: 1, workflow_key: 'match_both',
        trigger_config: JSON.stringify({ event_type: 'task.failed', category: 'system', severity_min: 'warning' }),
      },
      {
        id: 2, workflow_key: 'wrong_type',
        trigger_config: JSON.stringify({ event_type: 'other.event' }),
      },
      {
        id: 3, workflow_key: 'wrong_cat',
        trigger_config: JSON.stringify({ category: 'alert' }),
      },
      {
        id: 4, workflow_key: 'too_low_sev',
        trigger_config: JSON.stringify({ severity_min: 'critical' }),
      },
      {
        id: 5, workflow_key: 'count_gate',
        trigger_config: JSON.stringify({ min_count: 3, time_window_seconds: 600 }),
      },
      {
        id: 6, workflow_key: 'null_config',
        trigger_config: null,
      },
      {
        id: 7, workflow_key: 'broken_json',
        trigger_config: '{{ not json',
      },
    ],
  },
  // count gate: returns 5 which satisfies min_count=3
  {
    match: /SELECT COUNT\(\*\) AS cnt FROM platform_events/i,
    rows: [{ cnt: 5 }],
  },
  // Fall-through for executeWorkflow
  {
    match: /SELECT \* FROM platform_workflows WHERE id = \?/i,
    rows: [],
  },
];

quiet();
await evaluateWorkflowTriggers(42, {
  event_type: 'task.failed',
  category: 'system',
  severity: 'warning',
  title: 'Test',
});
loud();

// fire-and-forget executeWorkflow launches happen for:
//   id=1 (matches all filters)
//   id=5 (min_count satisfied; no other filters)
// Wait briefly for the async fire-and-forget to complete
await new Promise(r => setTimeout(r, 50));

// The workflows loaded but actual workflow fetches will fail since we return []
assert(queryLog.some(q => /FROM platform_events/.test(q.sql)), 'count check ran');

// ============================================================================
// executeScheduledWorkflows
// ============================================================================
console.log('\n── executeScheduledWorkflows ─────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows\s+WHERE is_enabled = 1 AND trigger_type = 'schedule'/i,
    rows: [
      { id: 1, workflow_key: 'sched_a' },
      { id: 2, workflow_key: 'sched_b' },
    ],
  },
  // per-workflow lookup returns empty → each throws "not found" and is captured
  { match: /SELECT \* FROM platform_workflows WHERE id = \?/i, rows: [] },
];
quiet();
{
  const r = await executeScheduledWorkflows();
  loud();
  assertEq(r.length, 2, '2 results');
  assertEq(r[0].workflow_key, 'sched_a', 'first key');
  assertEq(r[0].status, 'error', 'error captured');
  assert(/not found/.test(r[0].error), 'error message preserved');
}

// ============================================================================
// queryWorkflows
// ============================================================================
console.log('\n── queryWorkflows ────────────────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflows/i,
    rows: [
      { id: 1, workflow_key: 'a', trigger_config: '{"x":1}' },
      { id: 2, workflow_key: 'b', trigger_config: null },
    ],
  },
];
{
  const r = await queryWorkflows({ category: 'system', trigger_type: 'event', is_enabled: true });
  assertEq(r.length, 2, '2 rows');
  assertEq(r[0].trigger_config, { x: 1 }, 'JSON parsed');
  assertEq(r[1].trigger_config, null, 'null preserved');
  const q = queryLog[0];
  assert(/AND category = \?/.test(q.sql), 'category filter');
  assert(/AND trigger_type = \?/.test(q.sql), 'trigger_type filter');
  assert(/AND is_enabled = \?/.test(q.sql), 'is_enabled filter');
  assert(q.params.includes('system'), 'category param');
  assert(q.params.includes(1), 'is_enabled=1 param');
}

// ============================================================================
// getWorkflowDetail
// ============================================================================
console.log('\n── getWorkflowDetail ─────────────────────────────────────');

resetAll();
routes = [{ match: /SELECT \* FROM platform_workflows WHERE id = \?/i, rows: [] }];
{
  const r = await getWorkflowDetail(999);
  assertEq(r, null, 'not found → null');
}

resetAll();
routes = [
  {
    match: /SELECT \* FROM platform_workflows WHERE id = \?/i,
    rows: [{
      id: 1, workflow_key: 'x',
      definition: '[{"s":1}]',
      trigger_config: '{"t":2}',
    }],
  },
  {
    match: /FROM platform_workflow_runs\s+WHERE workflow_id = \?/i,
    rows: [{ id: 10, status: 'completed' }, { id: 11, status: 'failed' }],
  },
];
{
  const r = await getWorkflowDetail(1);
  assertEq(r.definition, [{ s: 1 }], 'definition parsed');
  assertEq(r.trigger_config, { t: 2 }, 'trigger_config parsed');
  assertEq(r.recent_runs.length, 2, 'recent_runs loaded');
}

// ============================================================================
// getWorkflowRunDetail
// ============================================================================
console.log('\n── getWorkflowRunDetail ──────────────────────────────────');

resetAll();
routes = [{ match: /FROM platform_workflow_runs r\s+JOIN platform_workflows w/i, rows: [] }];
{
  const r = await getWorkflowRunDetail(999);
  assertEq(r, null, 'not found → null');
}

resetAll();
routes = [
  {
    match: /FROM platform_workflow_runs r\s+JOIN platform_workflows w/i,
    rows: [{ id: 100, workflow_id: 1, context: '{"c":3}' }],
  },
  {
    match: /SELECT \* FROM platform_workflow_steps\s+WHERE workflow_run_id = \?/i,
    rows: [
      { id: 1, input_json: '{"i":1}', output_json: '{"o":1}' },
      { id: 2, input_json: null, output_json: null },
      { id: 3, input_json: 'not json!', output_json: 'also not json' },
    ],
  },
];
{
  const r = await getWorkflowRunDetail(100);
  assertEq(r.context, { c: 3 }, 'context parsed');
  assertEq(r.steps.length, 3, '3 steps');
  assertEq(r.steps[0].input_json, { i: 1 }, 'step input parsed');
  assertEq(r.steps[0].output_json, { o: 1 }, 'step output parsed');
  assertEq(r.steps[1].input_json, null, 'null input preserved');
  // malformed JSON is left as-is
  assertEq(r.steps[2].input_json, 'not json!', 'malformed left as string');
}

// ============================================================================
// queryWorkflowRuns
// ============================================================================
console.log('\n── queryWorkflowRuns ─────────────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM platform_workflow_runs r\s+JOIN platform_workflows w/i,
    rows: [{ id: 1 }, { id: 2 }],
  },
  {
    match: /SELECT COUNT\(\*\) AS total FROM platform_workflow_runs/i,
    rows: [{ total: 42 }],
  },
];
{
  const r = await queryWorkflowRuns({ workflow_id: 1, status: 'completed', trigger_source: 'manual', limit: 10, offset: 5 });
  assertEq(r.runs.length, 2, '2 runs');
  assertEq(r.total, 42, 'total count');
  assertEq(r.limit, 10, 'limit');
  assertEq(r.offset, 5, 'offset');
  // Both run query and count query built with filters
  const runQ = queryLog[0];
  assert(/r\.workflow_id = \?/.test(runQ.sql), 'workflow_id filter');
  assert(/r\.status = \?/.test(runQ.sql), 'status filter');
  assert(/r\.trigger_source = \?/.test(runQ.sql), 'trigger_source filter');
}

// Limit cap at 200
resetAll();
routes = [
  { match: /FROM platform_workflow_runs r\s+JOIN platform_workflows w/i, rows: [] },
  { match: /SELECT COUNT\(\*\) AS total/i, rows: [{ total: 0 }] },
];
{
  const r = await queryWorkflowRuns({ limit: 1000 });
  assertEq(r.limit, 200, 'limit capped at 200');
}

// Default limit
resetAll();
routes = [
  { match: /FROM platform_workflow_runs r\s+JOIN platform_workflows w/i, rows: [] },
  { match: /SELECT COUNT\(\*\) AS total/i, rows: [{ total: 0 }] },
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
  { match: /UPDATE platform_workflows SET is_enabled = \?/i, rows: { affectedRows: 1 } },
];
{
  const r = await toggleWorkflow(1, true, 'alice');
  assertEq(r, true, 'returns true on success');
  const q = queryLog[0];
  assertEq(q.params[0], 1, 'enabled → 1');
  assertEq(q.params[1], 'alice', 'updated_by');
  assertEq(q.params[2], 1, 'id');
}

resetAll();
routes = [
  { match: /UPDATE platform_workflows SET is_enabled = \?/i, rows: { affectedRows: 0 } },
];
{
  const r = await toggleWorkflow(999, false);
  assertEq(r, false, 'returns false on no match');
  assertEq(queryLog[0].params[0], 0, 'disabled → 0');
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
  loud();
  console.error('Unhandled test error:', e);
  process.exit(1);
});
