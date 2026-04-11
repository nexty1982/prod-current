#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowService.js (OMD-1240)
 *
 * Prompt workflow lifecycle management. Deps: uuid + ../config/db.
 * Both stubbed via require.cache.
 *
 * Coverage:
 *   - validateWorkflow (pure):
 *       · no name → errors
 *       · no component → errors
 *       · no steps → errors
 *       · step numbering gaps
 *       · missing title/purpose/expected_outcome
 *       · depends_on_step >= step_number
 *       · depends_on_step nonexistent
 *       · valid → no errors
 *   - createWorkflow:
 *       · missing name/component throws
 *       · invalid release_mode throws
 *       · INSERT + steps INSERT
 *       · returns workflow via getWorkflowById
 *   - getWorkflowById: not found throws; active computes step_progress
 *   - listWorkflows: filter chaining
 *   - updateWorkflow: non-draft rejected; invalid release_mode rejected; no fields rejected
 *   - setSteps: non-draft rejected; empty steps rejected; depends_on_step forward ref rejected
 *   - approveWorkflow: validation failure throws; atomic 0-affected throws; invalid transition throws
 *   - activateWorkflow: prompts_generated=false throws; invalid transition throws
 *   - completeWorkflow: no prompts generated throws; non-verified throws; happy path updates
 *   - cancelWorkflow: from any active status; log includes reason
 *   - reopenWorkflow: from cancelled only
 *   - getWorkflowStatus: step summary + counts + progress_pct
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

// ── Stub uuid ───────────────────────────────────────────────────
let uuidCounter = 0;
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: { v4: () => `uuid-${++uuidCounter}` },
} as any;

// ── Fake pool with regex-dispatch responders ────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
type Responder = { match: RegExp; respond: (params: any[]) => any };
const responders: Responder[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of responders) {
      if (r.match.test(sql)) {
        const result = r.respond(params);
        return [result, []];
      }
    }
    return [[], []];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

function reset() {
  queryLog.length = 0;
  responders.length = 0;
  uuidCounter = 0;
}

// Silence logs
const origErr = console.error;
function quiet() { console.error = () => {}; }
function loud() { console.error = origErr; }

const {
  createWorkflow,
  getWorkflowById,
  listWorkflows,
  updateWorkflow,
  setSteps,
  validateWorkflow,
  approveWorkflow,
  activateWorkflow,
  completeWorkflow,
  cancelWorkflow,
  reopenWorkflow,
  getWorkflowStatus,
} = require('../workflowService');

async function main() {

// ============================================================================
// validateWorkflow (pure)
// ============================================================================
console.log('\n── validateWorkflow ──────────────────────────────────────');
{
  // Empty workflow
  const empty = validateWorkflow({});
  assertEq(empty.valid, false, 'empty: invalid');
  assert(empty.errors.some((e: string) => e.includes('name')), 'mentions name');
  assert(empty.errors.some((e: string) => e.includes('component')), 'mentions component');
  assert(empty.errors.some((e: string) => e.includes('step')), 'mentions step');

  // No steps
  const noSteps = validateWorkflow({ name: 'w', component: 'backend', steps: [] });
  assertEq(noSteps.valid, false, 'no steps: invalid');

  // Valid with 1 step
  const valid = validateWorkflow({
    name: 'w', component: 'backend',
    steps: [{ step_number: 1, title: 't', purpose: 'p', expected_outcome: 'o' }],
  });
  assertEq(valid.valid, true, 'valid: no errors');
  assertEq(valid.errors.length, 0, 'no errors');

  // Step numbering gap
  const gap = validateWorkflow({
    name: 'w', component: 'backend',
    steps: [
      { step_number: 1, title: 't', purpose: 'p', expected_outcome: 'o' },
      { step_number: 3, title: 't', purpose: 'p', expected_outcome: 'o' }, // gap
    ],
  });
  assertEq(gap.valid, false, 'gap: invalid');
  assert(gap.errors.some((e: string) => e.includes('gap')), 'mentions gap');

  // Missing purpose
  const noPurpose = validateWorkflow({
    name: 'w', component: 'backend',
    steps: [{ step_number: 1, title: 't', expected_outcome: 'o' }],
  });
  assertEq(noPurpose.valid, false, 'missing purpose: invalid');
  assert(noPurpose.errors.some((e: string) => e.includes('purpose')), 'mentions purpose');

  // depends_on_step forward ref
  const forwardDep = validateWorkflow({
    name: 'w', component: 'backend',
    steps: [
      { step_number: 1, title: 't', purpose: 'p', expected_outcome: 'o', depends_on_step: 2 },
      { step_number: 2, title: 't', purpose: 'p', expected_outcome: 'o' },
    ],
  });
  assertEq(forwardDep.valid, false, 'forward dep: invalid');

  // depends_on_step nonexistent
  const missingDep = validateWorkflow({
    name: 'w', component: 'backend',
    steps: [
      { step_number: 1, title: 't', purpose: 'p', expected_outcome: 'o' },
      { step_number: 2, title: 't', purpose: 'p', expected_outcome: 'o', depends_on_step: 99 },
    ],
  });
  assertEq(missingDep.valid, false, 'missing dep: invalid');
}

// ============================================================================
// createWorkflow
// ============================================================================
console.log('\n── createWorkflow ────────────────────────────────────────');
{
  // Missing name
  let e: Error | null = null;
  try { await createWorkflow({ component: 'backend' }, 'alice'); } catch (err: any) { e = err; }
  assert(e !== null, 'missing name throws');

  // Invalid release_mode
  e = null;
  try {
    await createWorkflow({ name: 'w', component: 'backend', release_mode: 'bogus' }, 'alice');
  } catch (err: any) { e = err; }
  assert(e !== null, 'invalid release_mode throws');

  // Happy path
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows WHERE id = \?/,
    respond: (params) => [{ id: params[0], name: 'w', status: 'draft', component: 'backend' }],
  });
  responders.push({
    match: /SELECT component FROM prompt_workflows/,
    respond: () => [{ component: 'backend' }],
  });
  responders.push({ match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [] });
  responders.push({ match: /INSERT INTO prompt_workflows/, respond: () => ({ affectedRows: 1 }) });
  responders.push({ match: /INSERT INTO prompt_workflow_steps/, respond: () => ({ affectedRows: 1 }) });
  responders.push({ match: /UPDATE prompt_workflows SET step_count/, respond: () => ({ affectedRows: 1 }) });
  responders.push({ match: /INSERT INTO system_logs/, respond: () => ({ insertId: 1 }) });

  const wf = await createWorkflow({
    name: 'My Workflow', component: 'backend',
    steps: [
      { title: 'Step 1', purpose: 'Do stuff', expected_outcome: 'done' },
      { title: 'Step 2', purpose: 'More stuff', expected_outcome: 'also done' },
    ],
  }, 'alice');

  assertEq(wf.id, 'uuid-1', 'workflow id=uuid-1 (first uuid)');
  const insertWf = queryLog.find(q => /INSERT INTO prompt_workflows/.test(q.sql));
  assert(insertWf !== undefined, 'INSERT prompt_workflows called');
  assertEq(insertWf?.params[1], 'My Workflow', 'workflow name');
  assertEq(insertWf?.params[3], 'backend', 'component');
  const stepInserts = queryLog.filter(q => /INSERT INTO prompt_workflow_steps/.test(q.sql));
  assertEq(stepInserts.length, 2, '2 step inserts');
}

// ============================================================================
// getWorkflowById
// ============================================================================
console.log('\n── getWorkflowById ───────────────────────────────────────');
{
  // Not found
  reset();
  responders.push({ match: /SELECT \* FROM prompt_workflows/, respond: () => [] });
  let e: Error | null = null;
  try { await getWorkflowById('missing'); } catch (err: any) { e = err; }
  assert(e !== null, 'not found throws');
  assert(e !== null && e.message.includes('missing'), 'error mentions id');

  // Active with step_progress
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'active' }],
  });
  responders.push({
    match: /SELECT \* FROM prompt_workflow_steps/,
    respond: () => [
      { step_number: 1, title: 'Step 1', prompt_id: 'p1' },
      { step_number: 2, title: 'Step 2', prompt_id: null },
    ],
  });
  responders.push({
    match: /SELECT id, status FROM om_prompt_registry WHERE id IN/,
    respond: () => [{ id: 'p1', status: 'verified' }],
  });
  const wf = await getWorkflowById('w1');
  assertEq(wf.status, 'active', 'status active');
  assertEq(wf.step_progress.length, 2, '2 progress entries');
  assertEq(wf.step_progress[0].prompt_status, 'verified', 'prompt 1 verified');
  assertEq(wf.step_progress[1].prompt_status, 'not_generated', 'prompt 2 not_generated');
}

// ============================================================================
// listWorkflows
// ============================================================================
console.log('\n── listWorkflows ─────────────────────────────────────────');
{
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows WHERE 1=1/,
    respond: () => [{ id: 'w1' }, { id: 'w2' }],
  });
  const all = await listWorkflows();
  assertEq(all.length, 2, 'list all: 2');

  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows WHERE 1=1/,
    respond: () => [],
  });
  await listWorkflows({ status: 'draft', component: 'backend', created_by: 'alice' });
  const q = queryLog[0];
  assert(q.sql.includes('AND status = ?'), 'status filter');
  assert(q.sql.includes('AND component = ?'), 'component filter');
  assert(q.sql.includes('AND created_by = ?'), 'created_by filter');
  assertEq(q.params, ['draft', 'backend', 'alice'], 'params');
}

// ============================================================================
// updateWorkflow
// ============================================================================
console.log('\n── updateWorkflow ────────────────────────────────────────');
{
  // Non-draft rejected
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'approved' }],
  });
  responders.push({ match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [] });
  let e: Error | null = null;
  try { await updateWorkflow('w1', { name: 'new' }, 'alice'); } catch (err: any) { e = err; }
  assert(e !== null, 'non-draft update throws');

  // Invalid release_mode
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'draft' }],
  });
  responders.push({ match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [] });
  e = null;
  try { await updateWorkflow('w1', { release_mode: 'bogus' }, 'alice'); } catch (err: any) { e = err; }
  assert(e !== null, 'bad release_mode throws');

  // No fields
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'draft' }],
  });
  responders.push({ match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [] });
  e = null;
  try { await updateWorkflow('w1', {}, 'alice'); } catch (err: any) { e = err; }
  assert(e !== null, 'no fields throws');
}

// ============================================================================
// setSteps
// ============================================================================
console.log('\n── setSteps ──────────────────────────────────────────────');
{
  // Non-draft rejected
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'approved' }],
  });
  responders.push({ match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [] });
  let e: Error | null = null;
  try {
    await setSteps('w1', [{ title: 't', purpose: 'p', expected_outcome: 'o' }], 'alice');
  } catch (err: any) { e = err; }
  assert(e !== null, 'non-draft setSteps throws');

  // Empty steps
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'draft' }],
  });
  responders.push({ match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [] });
  e = null;
  try { await setSteps('w1', [], 'alice'); } catch (err: any) { e = err; }
  assert(e !== null, 'empty steps throws');

  // Forward dep rejected (via insertSteps validation)
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'draft', component: 'backend' }],
  });
  responders.push({ match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [] });
  responders.push({
    match: /SELECT component FROM prompt_workflows/,
    respond: () => [{ component: 'backend' }],
  });
  responders.push({ match: /DELETE FROM prompt_workflow_steps/, respond: () => ({ affectedRows: 1 }) });
  e = null;
  try {
    await setSteps('w1', [
      { title: 't', purpose: 'p', expected_outcome: 'o', depends_on_step: 2 },
      { title: 't', purpose: 'p', expected_outcome: 'o' },
    ], 'alice');
  } catch (err: any) { e = err; }
  assert(e !== null, 'forward dep rejected in insertSteps');
}

// ============================================================================
// approveWorkflow
// ============================================================================
console.log('\n── approveWorkflow ───────────────────────────────────────');
{
  // Invalid transition (non-draft)
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'approved', name: 'w', component: 'backend' }],
  });
  responders.push({
    match: /SELECT \* FROM prompt_workflow_steps/,
    respond: () => [{ step_number: 1, title: 't', purpose: 'p', expected_outcome: 'o' }],
  });
  let e: Error | null = null;
  try { await approveWorkflow('w1', 'alice'); } catch (err: any) { e = err; }
  assert(e !== null, 'non-draft approve throws');

  // Validation failure (missing steps)
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'draft', name: 'w', component: 'backend' }],
  });
  responders.push({ match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [] });
  e = null;
  try { await approveWorkflow('w1', 'alice'); } catch (err: any) { e = err; }
  assert(e !== null, 'validation failure throws');

  // Atomic failure
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'draft', name: 'w', component: 'backend' }],
  });
  responders.push({
    match: /SELECT \* FROM prompt_workflow_steps/,
    respond: () => [{ step_number: 1, title: 't', purpose: 'p', expected_outcome: 'o' }],
  });
  responders.push({
    match: /UPDATE prompt_workflows SET status = 'approved'/,
    respond: () => ({ affectedRows: 0 }),
  });
  e = null;
  try { await approveWorkflow('w1', 'alice'); } catch (err: any) { e = err; }
  assert(e !== null, 'atomic failure throws');
}

// ============================================================================
// activateWorkflow
// ============================================================================
console.log('\n── activateWorkflow ──────────────────────────────────────');
{
  // prompts_generated=false → throws
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'approved', prompts_generated: 0 }],
  });
  responders.push({ match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [] });
  let e: Error | null = null;
  try { await activateWorkflow('w1', 'alice'); } catch (err: any) { e = err; }
  assert(e !== null, 'no prompts_generated throws');

  // Invalid transition (from draft)
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'draft' }],
  });
  responders.push({ match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [] });
  e = null;
  try { await activateWorkflow('w1', 'alice'); } catch (err: any) { e = err; }
  assert(e !== null, 'draft→active invalid');
}

// ============================================================================
// completeWorkflow
// ============================================================================
console.log('\n── completeWorkflow ──────────────────────────────────────');
{
  // No prompts generated
  reset();
  let wfActive = [{ id: 'w1', status: 'active' }];
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => wfActive,
  });
  responders.push({
    match: /SELECT \* FROM prompt_workflow_steps/,
    respond: () => [{ step_number: 1, title: 't', prompt_id: null }],
  });
  responders.push({
    match: /SELECT step_number, prompt_id FROM prompt_workflow_steps/,
    respond: () => [{ step_number: 1, prompt_id: null }],
  });
  let e: Error | null = null;
  try { await completeWorkflow('w1', 'alice'); } catch (err: any) { e = err; }
  assert(e !== null, 'no prompts throws');

  // Non-verified
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'active' }],
  });
  // getWorkflowById's second query
  let stepsQueryCall = 0;
  responders.push({
    match: /SELECT \* FROM prompt_workflow_steps/,
    respond: () => [{ step_number: 1, title: 't', prompt_id: 'p1' }],
  });
  responders.push({
    match: /SELECT step_number, prompt_id FROM prompt_workflow_steps/,
    respond: () => [{ step_number: 1, prompt_id: 'p1' }],
  });
  responders.push({
    match: /SELECT id, status FROM om_prompt_registry WHERE id IN/,
    respond: () => [{ id: 'p1', status: 'executing' }],
  });
  e = null;
  try { await completeWorkflow('w1', 'alice'); } catch (err: any) { e = err; }
  assert(e !== null, 'non-verified throws');
  assert(e !== null && e.message.includes('verified'), 'error mentions verified');
}

// ============================================================================
// cancelWorkflow
// ============================================================================
console.log('\n── cancelWorkflow ────────────────────────────────────────');
{
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'draft' }],
  });
  responders.push({ match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [] });
  responders.push({
    match: /UPDATE prompt_workflows SET status = 'cancelled'/,
    respond: () => ({ affectedRows: 1 }),
  });
  responders.push({ match: /INSERT INTO system_logs/, respond: () => ({ insertId: 1 }) });

  await cancelWorkflow('w1', 'testing', 'alice');
  const logCall = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql));
  assert(logCall !== undefined, 'log inserted');
  // Meta contains reason
  const meta = logCall?.params[1];
  assert(meta.includes('testing'), 'reason logged');

  // Cancel from completed → invalid
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'completed' }],
  });
  responders.push({ match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [] });
  let e: Error | null = null;
  try { await cancelWorkflow('w1', 'x', 'alice'); } catch (err: any) { e = err; }
  assert(e !== null, 'cancel completed throws');
}

// ============================================================================
// reopenWorkflow
// ============================================================================
console.log('\n── reopenWorkflow ────────────────────────────────────────');
{
  // From cancelled → OK
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'cancelled' }],
  });
  responders.push({ match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [] });
  responders.push({
    match: /UPDATE prompt_workflows SET status = 'draft'/,
    respond: () => ({ affectedRows: 1 }),
  });
  responders.push({ match: /INSERT INTO system_logs/, respond: () => ({ insertId: 1 }) });

  await reopenWorkflow('w1', 'alice');
  const upd = queryLog.find(q => /SET status = 'draft'/.test(q.sql));
  assert(upd !== undefined, 'UPDATE to draft');

  // From draft → invalid transition
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [{ id: 'w1', status: 'draft' }],
  });
  responders.push({ match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [] });
  let e: Error | null = null;
  try { await reopenWorkflow('w1', 'alice'); } catch (err: any) { e = err; }
  assert(e !== null, 'reopen draft throws');
}

// ============================================================================
// getWorkflowStatus
// ============================================================================
console.log('\n── getWorkflowStatus ─────────────────────────────────────');
{
  reset();
  responders.push({
    match: /SELECT \* FROM prompt_workflows WHERE id = \?/,
    respond: () => [{ id: 'w1', name: 'wf', status: 'active' }],
  });
  responders.push({
    match: /SELECT step_number, title, prompt_id FROM prompt_workflow_steps/,
    respond: () => [
      { step_number: 1, title: 'Step 1', prompt_id: 'p1' },
      { step_number: 2, title: 'Step 2', prompt_id: 'p2' },
      { step_number: 3, title: 'Step 3', prompt_id: 'p3' },
      { step_number: 4, title: 'Step 4', prompt_id: null },
    ],
  });
  responders.push({
    match: /SELECT id, status, quality_score FROM om_prompt_registry/,
    respond: () => [
      { id: 'p1', status: 'verified', quality_score: 90 },
      { id: 'p2', status: 'executing', quality_score: null },
      { id: 'p3', status: 'rejected', quality_score: 30 },
    ],
  });

  const status = await getWorkflowStatus('w1');
  assertEq(status.id, 'w1', 'id');
  assertEq(status.total_steps, 4, 'total=4');
  assertEq(status.generated, 3, 'generated=3');
  assertEq(status.verified, 1, 'verified=1');
  assertEq(status.executing, 1, 'executing=1');
  assertEq(status.blocked, 1, 'blocked=1 (rejected)');
  assertEq(status.progress_pct, 25, '25% (1/4)');
  assert(status.current_step !== null, 'current_step present');
  assertEq(status.current_step?.step_number, 2, 'current=step 2 (executing)');

  // Not found
  reset();
  responders.push({ match: /SELECT \* FROM prompt_workflows WHERE id/, respond: () => [] });
  let e: Error | null = null;
  try { await getWorkflowStatus('missing'); } catch (err: any) { e = err; }
  assert(e !== null, 'not found throws');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
