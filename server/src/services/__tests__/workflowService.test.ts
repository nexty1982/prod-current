#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowService.js (OMD-1122)
 *
 * Manages prompt workflow lifecycle: creation, step definition, validation,
 * approval flow, and status tracking.
 *
 * State machine:
 *   draft → approved → active → completed
 *   draft → cancelled
 *   approved → cancelled
 *   active → cancelled
 *   cancelled → draft (reopen)
 *
 * Strategy: stub `../config/db` via require.cache with a route-dispatch
 * fake pool (Route[] matched in order). No real DB required.
 *
 * Coverage:
 *   - validateTransition: all valid + invalid transitions
 *   - createWorkflow: missing name/component, invalid release_mode, happy path with steps
 *   - getWorkflowById: not found, active with progress computation
 *   - listWorkflows: all filter combinations
 *   - updateWorkflow: non-draft rejected, invalid release_mode, no fields, happy path
 *   - insertSteps (via setSteps): missing fields, bad depends_on_step
 *   - setSteps: non-draft rejected, empty steps, happy path
 *   - validateWorkflow: missing name/component/steps, step numbering gaps,
 *     missing step fields, depends_on_step forward/nonexistent
 *   - approveWorkflow: invalid transition, validation failure, concurrent modify, happy path
 *   - activateWorkflow: no prompts_generated, concurrent modify, happy path
 *   - completeWorkflow: no prompts, incomplete prompts, non-verified, happy path
 *   - cancelWorkflow: invalid transition, happy path
 *   - reopenWorkflow: happy path
 *   - getWorkflowStatus: not found, with prompts progress
 *   - logAction: swallows errors
 *
 * Run: npx tsx server/src/services/__tests__/workflowService.test.ts
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
    if (pattern.test(e.message)) {
      console.log(`  PASS: ${message}`);
      passed++;
    } else {
      console.error(`  FAIL: ${message}\n         pattern: ${pattern}\n         got:     ${e.message}`);
      failed++;
    }
  }
}

// ── Route-dispatch fake pool ─────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
type Route = { match: RegExp; handler: (params: any[], sql: string) => any };

const queryLog: QueryCall[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        return r.handler(params, sql);
      }
    }
    return [[]];
  },
};

const dbStub = {
  getAppPool: () => fakePool,
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

function resetAll() {
  queryLog.length = 0;
  routes = [];
}

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const svc = require('../workflowService');

async function main() {

// ============================================================================
// createWorkflow — input validation
// ============================================================================
console.log('\n── createWorkflow: input validation ──────────────────────');

resetAll();
await assertThrows(
  () => svc.createWorkflow({ component: 'x' }, 'alice'),
  /name and component are required/i,
  'missing name throws'
);

await assertThrows(
  () => svc.createWorkflow({ name: 'x' }, 'alice'),
  /name and component are required/i,
  'missing component throws'
);

await assertThrows(
  () => svc.createWorkflow({ name: 'x', component: 'y', release_mode: 'bogus' }, 'alice'),
  /Invalid release_mode/i,
  'bad release_mode throws'
);

// ============================================================================
// createWorkflow — happy path (no steps)
// ============================================================================
console.log('\n── createWorkflow: happy path (no steps) ─────────────────');

resetAll();
{
  let insertedRow: any = null;
  routes = [
    {
      match: /INSERT INTO prompt_workflows/i,
      handler: (params) => {
        insertedRow = {
          id: params[0], name: params[1], description: params[2],
          component: params[3], status: 'draft', created_by: params[4],
          step_count: params[5], release_mode: params[6],
          prompts_generated: 0,
        };
        return [{ affectedRows: 1 }];
      },
    },
    {
      match: /SELECT \* FROM prompt_workflows WHERE id/i,
      handler: () => [insertedRow ? [insertedRow] : []],
    },
    {
      match: /SELECT \* FROM prompt_workflow_steps/i,
      handler: () => [[]],
    },
    { match: /INSERT INTO system_logs/i, handler: () => [{}] },
  ];

  const wf = await svc.createWorkflow(
    { name: 'W1', description: 'desc', component: 'frontend', release_mode: 'auto_safe' },
    'alice'
  );
  assertEq(wf.name, 'W1', 'returns workflow with name');
  assertEq(wf.status, 'draft', 'starts in draft');
  assertEq(wf.release_mode, 'auto_safe', 'release_mode set');
  assertEq(wf.step_count, 0, 'no steps');
  const insert = queryLog.find(q => /INSERT INTO prompt_workflows/.test(q.sql));
  assert(insert !== undefined, 'INSERT was executed');
  assertEq(insert!.params[3], 'frontend', 'component param');
  const logCall = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql));
  assert(logCall !== undefined, 'logAction called');
  assert(logCall!.params[0].includes('[CREATED]'), 'log has CREATED action');
}

// ============================================================================
// createWorkflow — with steps
// ============================================================================
console.log('\n── createWorkflow: with steps ────────────────────────────');

resetAll();
{
  let insertedRow: any = null;
  let insertedSteps: any[] = [];
  routes = [
    {
      match: /INSERT INTO prompt_workflows/i,
      handler: (params) => {
        insertedRow = {
          id: params[0], name: params[1], component: params[3],
          status: 'draft', step_count: params[5], prompts_generated: 0,
        };
        return [{ affectedRows: 1 }];
      },
    },
    {
      match: /SELECT component FROM prompt_workflows/i,
      handler: () => [[{ component: 'backend' }]],
    },
    {
      match: /INSERT INTO prompt_workflow_steps/i,
      handler: (params) => {
        insertedSteps.push({
          id: params[0], step_number: params[2], title: params[3],
          purpose: params[4], component: params[5],
          prompt_type: params[6], expected_outcome: params[7],
          depends_on_step: params[9],
        });
        return [{ affectedRows: 1 }];
      },
    },
    {
      match: /UPDATE prompt_workflows SET step_count/i,
      handler: () => [{ affectedRows: 1 }],
    },
    {
      match: /SELECT \* FROM prompt_workflows WHERE id/i,
      handler: () => [insertedRow ? [insertedRow] : []],
    },
    {
      match: /SELECT \* FROM prompt_workflow_steps WHERE workflow_id/i,
      handler: () => [insertedSteps.slice()],
    },
    { match: /INSERT INTO system_logs/i, handler: () => [{}] },
  ];

  const steps = [
    { title: 'Step1', purpose: 'p1', expected_outcome: 'o1', prompt_type: 'plan' },
    { title: 'Step2', purpose: 'p2', expected_outcome: 'o2', depends_on_step: 1 },
  ];
  const wf = await svc.createWorkflow({ name: 'W2', component: 'backend', steps }, 'bob');
  assertEq(wf.step_count, 2, 'step_count=2');
  assertEq(insertedSteps.length, 2, 'two steps inserted');
  assertEq(insertedSteps[0].step_number, 1, 'step 1 numbered 1');
  assertEq(insertedSteps[0].prompt_type, 'plan', 'prompt_type passed');
  assertEq(insertedSteps[1].step_number, 2, 'step 2 numbered 2');
  assertEq(insertedSteps[1].prompt_type, 'implementation', 'default prompt_type');
  assertEq(insertedSteps[1].depends_on_step, 1, 'depends_on_step preserved');
  assertEq(insertedSteps[1].component, 'backend', 'defaults to workflow component');
}

// ============================================================================
// insertSteps — validation errors
// ============================================================================
console.log('\n── insertSteps: validation ───────────────────────────────');

resetAll();
{
  // setSteps to exercise insertSteps
  const existing = { id: 'wf1', status: 'draft', component: 'frontend', steps: [] };
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE id/i,
      handler: () => [[existing]],
    },
    {
      match: /SELECT \* FROM prompt_workflow_steps/i,
      handler: () => [[]],
    },
    {
      match: /DELETE FROM prompt_workflow_steps/i,
      handler: () => [{ affectedRows: 0 }],
    },
    {
      match: /SELECT component FROM prompt_workflows/i,
      handler: () => [[{ component: 'frontend' }]],
    },
  ];

  await assertThrows(
    () => svc.setSteps('wf1', [{ purpose: 'p', expected_outcome: 'o' }], 'actor'),
    /title, purpose, and expected_outcome are required/i,
    'missing title throws'
  );

  await assertThrows(
    () => svc.setSteps('wf1', [
      { title: 't1', purpose: 'p', expected_outcome: 'o' },
      { title: 't2', purpose: 'p', expected_outcome: 'o', depends_on_step: 2 },
    ], 'actor'),
    /depends_on_step must reference an earlier step/i,
    'depends_on_step forward-reference throws'
  );
}

// ============================================================================
// getWorkflowById — not found
// ============================================================================
console.log('\n── getWorkflowById: not found ────────────────────────────');

resetAll();
routes = [
  {
    match: /SELECT \* FROM prompt_workflows WHERE id/i,
    handler: () => [[]],
  },
];
await assertThrows(
  () => svc.getWorkflowById('missing'),
  /Workflow not found: missing/,
  'missing id throws'
);

// ============================================================================
// getWorkflowById — active with progress
// ============================================================================
console.log('\n── getWorkflowById: active with progress ─────────────────');

resetAll();
{
  const wfRow = { id: 'wf1', name: 'W', status: 'active' };
  const stepRows = [
    { step_number: 1, title: 'S1', prompt_id: 'p1' },
    { step_number: 2, title: 'S2', prompt_id: 'p2' },
    { step_number: 3, title: 'S3', prompt_id: null },
  ];
  const promptRows = [
    { id: 'p1', status: 'verified' },
    { id: 'p2', status: 'executing' },
  ];

  routes = [
    { match: /SELECT \* FROM prompt_workflows WHERE id/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [stepRows] },
    { match: /SELECT id, status FROM om_prompt_registry/i, handler: () => [promptRows] },
  ];

  const wf = await svc.getWorkflowById('wf1');
  assertEq(wf.status, 'active', 'status preserved');
  assertEq(wf.steps.length, 3, '3 steps');
  assert(Array.isArray(wf.step_progress), 'step_progress computed');
  assertEq(wf.step_progress.length, 3, '3 step_progress');
  assertEq(wf.step_progress[0].prompt_status, 'verified', 'step 1 verified');
  assertEq(wf.step_progress[1].prompt_status, 'executing', 'step 2 executing');
  assertEq(wf.step_progress[2].prompt_status, 'not_generated', 'step 3 not_generated');
}

// ============================================================================
// listWorkflows — filters
// ============================================================================
console.log('\n── listWorkflows: filters ────────────────────────────────');

resetAll();
{
  let capturedParams: any[] = [];
  let capturedSql = '';
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE/i,
      handler: (params, sql) => {
        capturedParams = params;
        capturedSql = sql;
        return [[{ id: 'wf1', name: 'W' }]];
      },
    },
  ];

  const rows = await svc.listWorkflows({ status: 'active', component: 'backend', created_by: 'alice' });
  assertEq(rows.length, 1, 'returns 1 row');
  assert(/status = \?/.test(capturedSql), 'status filter in SQL');
  assert(/component = \?/.test(capturedSql), 'component filter in SQL');
  assert(/created_by = \?/.test(capturedSql), 'created_by filter in SQL');
  assertEq(capturedParams, ['active', 'backend', 'alice'], 'all params');

  // No filters
  resetAll();
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE/i,
      handler: (params) => { capturedParams = params; return [[]]; },
    },
  ];
  await svc.listWorkflows();
  assertEq(capturedParams.length, 0, 'no filters = empty params');
}

// ============================================================================
// updateWorkflow — rules
// ============================================================================
console.log('\n── updateWorkflow ────────────────────────────────────────');

resetAll();
{
  const wfRow = { id: 'wf1', status: 'approved', name: 'Old' };
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
  ];
  await assertThrows(
    () => svc.updateWorkflow('wf1', { name: 'New' }, 'alice'),
    /Only draft workflows can be edited/i,
    'non-draft rejected'
  );
}

resetAll();
{
  const wfRow = { id: 'wf1', status: 'draft', name: 'Old' };
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
  ];
  await assertThrows(
    () => svc.updateWorkflow('wf1', { release_mode: 'bogus' }, 'alice'),
    /Invalid release_mode/i,
    'invalid release_mode'
  );
  await assertThrows(
    () => svc.updateWorkflow('wf1', {}, 'alice'),
    /No valid fields to update/i,
    'no fields'
  );
}

resetAll();
{
  let updateCalled = false;
  let updateSql = '';
  let updateParams: any[] = [];
  const wfRow = { id: 'wf1', status: 'draft', name: 'Old' };
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
    {
      match: /^UPDATE prompt_workflows SET name/i,
      handler: (params, sql) => {
        updateCalled = true;
        updateSql = sql;
        updateParams = params;
        return [{ affectedRows: 1 }];
      },
    },
    { match: /INSERT INTO system_logs/i, handler: () => [{}] },
  ];
  await svc.updateWorkflow('wf1', { name: 'New', description: 'D' }, 'alice');
  assert(updateCalled, 'UPDATE executed');
  assert(/name = \?/.test(updateSql), 'name in SET clause');
  assert(/description = \?/.test(updateSql), 'description in SET clause');
  assertEq(updateParams[0], 'New', 'name param');
  assertEq(updateParams[1], 'D', 'description param');
}

// ============================================================================
// validateWorkflow (pure)
// ============================================================================
console.log('\n── validateWorkflow ──────────────────────────────────────');

{
  // Missing name/component/steps
  let r = svc.validateWorkflow({});
  assertEq(r.valid, false, 'empty invalid');
  assert(r.errors.some((e: string) => /name is required/.test(e)), 'name error');
  assert(r.errors.some((e: string) => /component is required/.test(e)), 'component error');
  assert(r.errors.some((e: string) => /at least one step/.test(e)), 'steps error');

  // Step numbering gap
  r = svc.validateWorkflow({
    name: 'W', component: 'x',
    steps: [
      { step_number: 1, title: 't', purpose: 'p', expected_outcome: 'o' },
      { step_number: 3, title: 't', purpose: 'p', expected_outcome: 'o' },
    ],
  });
  assertEq(r.valid, false, 'gap invalid');
  assert(r.errors.some((e: string) => /numbering gap/.test(e)), 'numbering gap error');

  // Missing step fields
  r = svc.validateWorkflow({
    name: 'W', component: 'x',
    steps: [{ step_number: 1 }],
  });
  assertEq(r.valid, false, 'missing fields invalid');
  assert(r.errors.some((e: string) => /missing title/.test(e)), 'missing title');
  assert(r.errors.some((e: string) => /missing purpose/.test(e)), 'missing purpose');
  assert(r.errors.some((e: string) => /missing expected_outcome/.test(e)), 'missing outcome');

  // depends_on_step forward reference
  r = svc.validateWorkflow({
    name: 'W', component: 'x',
    steps: [
      { step_number: 1, title: 't', purpose: 'p', expected_outcome: 'o', depends_on_step: 2 },
      { step_number: 2, title: 't', purpose: 'p', expected_outcome: 'o' },
    ],
  });
  assertEq(r.valid, false, 'forward dep invalid');
  assert(r.errors.some((e: string) => /must be less than step_number/.test(e)), 'forward dep error');

  // depends_on_step nonexistent
  r = svc.validateWorkflow({
    name: 'W', component: 'x',
    steps: [
      { step_number: 1, title: 't', purpose: 'p', expected_outcome: 'o' },
      { step_number: 2, title: 't', purpose: 'p', expected_outcome: 'o', depends_on_step: 99 },
    ],
  });
  assertEq(r.valid, false, 'nonexistent dep invalid');

  // All valid
  r = svc.validateWorkflow({
    name: 'W', component: 'x',
    steps: [
      { step_number: 1, title: 't1', purpose: 'p1', expected_outcome: 'o1' },
      { step_number: 2, title: 't2', purpose: 'p2', expected_outcome: 'o2', depends_on_step: 1 },
    ],
  });
  assertEq(r.valid, true, 'valid workflow');
  assertEq(r.errors.length, 0, 'no errors');
}

// ============================================================================
// approveWorkflow
// ============================================================================
console.log('\n── approveWorkflow ───────────────────────────────────────');

resetAll();
{
  // Invalid transition (already approved)
  const wfRow = { id: 'wf1', status: 'approved', name: 'W', component: 'x' };
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
  ];
  await assertThrows(
    () => svc.approveWorkflow('wf1', 'alice'),
    /Invalid workflow transition: "approved" → "approved"/,
    'already-approved rejected'
  );
}

resetAll();
{
  // Validation failure
  const wfRow = { id: 'wf1', status: 'draft', name: 'W', component: 'x' };
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] }, // no steps
  ];
  await assertThrows(
    () => svc.approveWorkflow('wf1', 'alice'),
    /validation failed/i,
    'validation failure throws'
  );
}

resetAll();
{
  // Happy path
  const wfRow = {
    id: 'wf1', status: 'draft', name: 'W', component: 'x',
  };
  const stepRows = [
    { step_number: 1, title: 't', purpose: 'p', expected_outcome: 'o' },
  ];
  let updated = false;
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [stepRows] },
    {
      match: /UPDATE prompt_workflows SET status = 'approved'/i,
      handler: () => { updated = true; return [{ affectedRows: 1 }]; },
    },
    { match: /INSERT INTO system_logs/i, handler: () => [{}] },
  ];
  await svc.approveWorkflow('wf1', 'alice');
  assert(updated, 'UPDATE executed');
  const logEntry = queryLog.find(q =>
    /INSERT INTO system_logs/.test(q.sql) && q.params[0]?.includes('APPROVED')
  );
  assert(logEntry !== undefined, 'APPROVED logged');
}

resetAll();
{
  // Concurrent modify (affectedRows 0)
  const wfRow = { id: 'wf1', status: 'draft', name: 'W', component: 'x' };
  const stepRows = [{ step_number: 1, title: 't', purpose: 'p', expected_outcome: 'o' }];
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [stepRows] },
    {
      match: /UPDATE prompt_workflows SET status = 'approved'/i,
      handler: () => [{ affectedRows: 0 }],
    },
  ];
  await assertThrows(
    () => svc.approveWorkflow('wf1', 'alice'),
    /Atomic approval failed/,
    'concurrent modify detected'
  );
}

// ============================================================================
// activateWorkflow
// ============================================================================
console.log('\n── activateWorkflow ──────────────────────────────────────');

resetAll();
{
  const wfRow = { id: 'wf1', status: 'approved', name: 'W', prompts_generated: 0 };
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
  ];
  await assertThrows(
    () => svc.activateWorkflow('wf1', 'alice'),
    /prompts have not been generated/,
    'no prompts_generated rejected'
  );
}

resetAll();
{
  const wfRow = { id: 'wf1', status: 'approved', name: 'W', prompts_generated: 1 };
  let updated = false;
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
    {
      match: /UPDATE prompt_workflows SET status = 'active'/i,
      handler: () => { updated = true; return [{ affectedRows: 1 }]; },
    },
    { match: /INSERT INTO system_logs/i, handler: () => [{}] },
  ];
  await svc.activateWorkflow('wf1', 'alice');
  assert(updated, 'activation UPDATE executed');
}

resetAll();
{
  const wfRow = { id: 'wf1', status: 'approved', name: 'W', prompts_generated: 1 };
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
    {
      match: /UPDATE prompt_workflows SET status = 'active'/i,
      handler: () => [{ affectedRows: 0 }],
    },
  ];
  await assertThrows(
    () => svc.activateWorkflow('wf1', 'alice'),
    /Atomic activation failed/,
    'concurrent modify detected'
  );
}

// ============================================================================
// completeWorkflow
// ============================================================================
console.log('\n── completeWorkflow ──────────────────────────────────────');

resetAll();
{
  // no prompts at all
  const wfRow = { id: 'wf1', status: 'active', prompts_generated: 1 };
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
    {
      match: /SELECT step_number, prompt_id FROM prompt_workflow_steps/i,
      handler: () => [[{ step_number: 1, prompt_id: null }]],
    },
  ];
  await assertThrows(
    () => svc.completeWorkflow('wf1', 'alice'),
    /no prompts have been generated/,
    'no generated prompts rejected'
  );
}

resetAll();
{
  // Incomplete prompt count
  const wfRow = { id: 'wf1', status: 'active', prompts_generated: 1 };
  const stepListCalls: any[][] = [
    // first: getWorkflowById's steps (just return array)
    [],
    // second: completeWorkflow's step_number, prompt_id query
    [{ step_number: 1, prompt_id: 'p1' }, { step_number: 2, prompt_id: null }],
  ];
  let stepCallIdx = 0;
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
    {
      match: /SELECT step_number, prompt_id FROM prompt_workflow_steps/i,
      handler: () => [stepListCalls[1]],
    },
  ];
  await assertThrows(
    () => svc.completeWorkflow('wf1', 'alice'),
    /only 1 of 2 steps/,
    'incomplete count rejected'
  );
}

resetAll();
{
  // Non-verified prompt
  const wfRow = { id: 'wf1', status: 'active', prompts_generated: 1 };
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
    {
      match: /SELECT step_number, prompt_id FROM prompt_workflow_steps/i,
      handler: () => [[{ step_number: 1, prompt_id: 'p1' }]],
    },
    {
      match: /SELECT id, status FROM om_prompt_registry/i,
      handler: () => [[{ id: 'p1', status: 'executing' }]],
    },
  ];
  await assertThrows(
    () => svc.completeWorkflow('wf1', 'alice'),
    /not yet verified/,
    'non-verified rejected'
  );
}

resetAll();
{
  // Happy path
  const wfRow = { id: 'wf1', status: 'active', prompts_generated: 1 };
  let updated = false;
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
    {
      match: /SELECT step_number, prompt_id FROM prompt_workflow_steps/i,
      handler: () => [[{ step_number: 1, prompt_id: 'p1' }]],
    },
    {
      match: /SELECT id, status FROM om_prompt_registry/i,
      handler: () => [[{ id: 'p1', status: 'verified' }]],
    },
    {
      match: /UPDATE prompt_workflows SET status = 'completed'/i,
      handler: () => { updated = true; return [{ affectedRows: 1 }]; },
    },
    { match: /INSERT INTO system_logs/i, handler: () => [{}] },
  ];
  await svc.completeWorkflow('wf1', 'alice');
  assert(updated, 'completion UPDATE executed');
}

resetAll();
{
  // Atomic completion failure
  const wfRow = { id: 'wf1', status: 'active', prompts_generated: 1 };
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
    {
      match: /SELECT step_number, prompt_id FROM prompt_workflow_steps/i,
      handler: () => [[{ step_number: 1, prompt_id: 'p1' }]],
    },
    {
      match: /SELECT id, status FROM om_prompt_registry/i,
      handler: () => [[{ id: 'p1', status: 'verified' }]],
    },
    {
      match: /UPDATE prompt_workflows SET status = 'completed'/i,
      handler: () => [{ affectedRows: 0 }],
    },
  ];
  await assertThrows(
    () => svc.completeWorkflow('wf1', 'alice'),
    /Atomic completion failed/,
    'concurrent completion detected'
  );
}

// ============================================================================
// cancelWorkflow
// ============================================================================
console.log('\n── cancelWorkflow ────────────────────────────────────────');

resetAll();
{
  const wfRow = { id: 'wf1', status: 'completed' };
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
  ];
  await assertThrows(
    () => svc.cancelWorkflow('wf1', 'reason', 'alice'),
    /Invalid workflow transition: "completed" → "cancelled"/,
    'cannot cancel completed'
  );
}

resetAll();
{
  const wfRow = { id: 'wf1', status: 'draft' };
  let updated = false;
  let logParams: any[] = [];
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
    {
      match: /UPDATE prompt_workflows SET status = 'cancelled'/i,
      handler: () => { updated = true; return [{ affectedRows: 1 }]; },
    },
    {
      match: /INSERT INTO system_logs/i,
      handler: (params) => { logParams = params; return [{}]; },
    },
  ];
  await svc.cancelWorkflow('wf1', 'Not needed', 'alice');
  assert(updated, 'cancel UPDATE executed');
  assert(logParams[0]?.includes('CANCELLED'), 'CANCELLED logged');
  const meta = JSON.parse(logParams[1]);
  assertEq(meta.reason, 'Not needed', 'reason in log meta');
  assertEq(meta.previous_status, 'draft', 'previous_status in log meta');
}

// ============================================================================
// reopenWorkflow
// ============================================================================
console.log('\n── reopenWorkflow ────────────────────────────────────────');

resetAll();
{
  const wfRow = { id: 'wf1', status: 'cancelled' };
  let updateSql = '';
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
    {
      match: /UPDATE prompt_workflows SET status = 'draft'/i,
      handler: (_p, sql) => { updateSql = sql; return [{ affectedRows: 1 }]; },
    },
    { match: /INSERT INTO system_logs/i, handler: () => [{}] },
  ];
  await svc.reopenWorkflow('wf1', 'alice');
  assert(/approved_by = NULL/.test(updateSql), 'clears approved_by');
  assert(/activated_at = NULL/.test(updateSql), 'clears activated_at');
  assert(/prompts_generated = 0/.test(updateSql), 'resets prompts_generated');
}

resetAll();
{
  // Cannot reopen from draft
  const wfRow = { id: 'wf1', status: 'draft' };
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
  ];
  await assertThrows(
    () => svc.reopenWorkflow('wf1', 'alice'),
    /Invalid workflow transition: "draft" → "draft"/,
    'cannot reopen from draft'
  );
}

// ============================================================================
// setSteps
// ============================================================================
console.log('\n── setSteps ──────────────────────────────────────────────');

resetAll();
{
  const wfRow = { id: 'wf1', status: 'approved' };
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
  ];
  await assertThrows(
    () => svc.setSteps('wf1', [{ title: 't', purpose: 'p', expected_outcome: 'o' }], 'alice'),
    /must be "draft"/,
    'non-draft rejected'
  );
}

resetAll();
{
  const wfRow = { id: 'wf1', status: 'draft' };
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
  ];
  await assertThrows(
    () => svc.setSteps('wf1', [], 'alice'),
    /At least one step is required/,
    'empty steps rejected'
  );
}

resetAll();
{
  // Happy path
  const wfRow = { id: 'wf1', status: 'draft', component: 'frontend' };
  let deleted = false;
  let insertedCount = 0;
  let countUpdate = 0;
  routes = [
    { match: /SELECT \* FROM prompt_workflows WHERE id/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
    {
      match: /DELETE FROM prompt_workflow_steps/i,
      handler: () => { deleted = true; return [{ affectedRows: 0 }]; },
    },
    {
      match: /SELECT component FROM prompt_workflows/i,
      handler: () => [[{ component: 'frontend' }]],
    },
    {
      match: /INSERT INTO prompt_workflow_steps/i,
      handler: () => { insertedCount++; return [{ affectedRows: 1 }]; },
    },
    {
      match: /UPDATE prompt_workflows SET step_count/i,
      handler: (params) => { countUpdate = params[0]; return [{ affectedRows: 1 }]; },
    },
    { match: /INSERT INTO system_logs/i, handler: () => [{}] },
  ];
  await svc.setSteps('wf1', [
    { title: 't1', purpose: 'p1', expected_outcome: 'o1' },
    { title: 't2', purpose: 'p2', expected_outcome: 'o2' },
  ], 'alice');
  assert(deleted, 'existing steps deleted');
  assertEq(insertedCount, 2, '2 steps inserted');
  assertEq(countUpdate, 2, 'step_count updated to 2');
}

// ============================================================================
// getWorkflowStatus
// ============================================================================
console.log('\n── getWorkflowStatus ─────────────────────────────────────');

resetAll();
routes = [
  { match: /SELECT \* FROM prompt_workflows WHERE id/i, handler: () => [[]] },
];
await assertThrows(
  () => svc.getWorkflowStatus('missing'),
  /Workflow not found: missing/,
  'status not found throws'
);

resetAll();
{
  const wfRow = { id: 'wf1', name: 'W', status: 'active' };
  const stepRows = [
    { step_number: 1, title: 'S1', prompt_id: 'p1' },
    { step_number: 2, title: 'S2', prompt_id: 'p2' },
    { step_number: 3, title: 'S3', prompt_id: 'p3' },
    { step_number: 4, title: 'S4', prompt_id: null },
  ];
  const promptRows = [
    { id: 'p1', status: 'verified', quality_score: 95 },
    { id: 'p2', status: 'executing', quality_score: null },
    { id: 'p3', status: 'rejected', quality_score: 30 },
  ];
  routes = [
    { match: /SELECT \* FROM prompt_workflows WHERE id/i, handler: () => [[wfRow]] },
    {
      match: /SELECT step_number, title, prompt_id FROM prompt_workflow_steps/i,
      handler: () => [stepRows],
    },
    {
      match: /SELECT id, status, quality_score FROM om_prompt_registry/i,
      handler: () => [promptRows],
    },
  ];

  const r = await svc.getWorkflowStatus('wf1');
  assertEq(r.id, 'wf1', 'id');
  assertEq(r.total_steps, 4, 'total 4');
  assertEq(r.generated, 3, 'generated 3');
  assertEq(r.verified, 1, 'verified 1');
  assertEq(r.executing, 1, 'executing 1');
  assertEq(r.blocked, 1, 'blocked (rejected) 1');
  assertEq(r.progress_pct, 25, '1/4 = 25%');
  assertEq(r.steps.length, 4, '4 step entries');
  assertEq(r.steps[0].prompt_status, 'verified', 'step 1 verified');
  assertEq(r.steps[0].quality_score, 95, 'step 1 score');
  assertEq(r.steps[3].prompt_status, 'not_generated', 'step 4 not_generated');
  // current_step is one of {draft, audited, ready, approved, executing}; step 2 has executing
  assert(r.current_step !== null, 'current_step found');
  assertEq(r.current_step?.step_number, 2, 'current step = step 2 (executing)');
}

// ============================================================================
// logAction error swallowing
// ============================================================================
console.log('\n── logAction: errors swallowed ───────────────────────────');

resetAll();
{
  // Cancel with failing log — should not throw
  const wfRow = { id: 'wf1', status: 'draft' };
  routes = [
    { match: /SELECT \* FROM prompt_workflows/i, handler: () => [[wfRow]] },
    { match: /SELECT \* FROM prompt_workflow_steps/i, handler: () => [[]] },
    {
      match: /UPDATE prompt_workflows SET status = 'cancelled'/i,
      handler: () => [{ affectedRows: 1 }],
    },
    {
      match: /INSERT INTO system_logs/i,
      handler: () => { throw new Error('log db down'); },
    },
  ];
  quiet();
  try {
    await svc.cancelWorkflow('wf1', 'r', 'alice');
    loud();
    assert(true, 'cancelWorkflow succeeds despite log failure');
  } catch (e: any) {
    loud();
    assert(false, `logAction should swallow but threw: ${e.message}`);
  }
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
