#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowGenerationService.js (OMD-1160)
 *
 * External deps stubbed via require.cache:
 *   - uuid                          → sequential ids
 *   - ../config/db                  → fake pool with getConnection transaction
 *   - ./constraintInjectionEngine   → observable buildConstraintBlock + recordAll
 *
 * Coverage:
 *   - buildPromptFromStep (pure, exposed for testing):
 *       · contains all 8 required sections
 *       · constraint block injected between REQUIREMENTS and OUTPUT REQUIREMENTS
 *       · depends_on_step line rendered
 *       · typeLabel from TYPE_LABELS or raw fallback
 *       · METADATA contains workflow id/name/step_number
 *   - previewGeneration:
 *       · workflow not found → throws
 *       · no steps → throws
 *       · happy path: one preview per step with prompt_text + injected_constraints
 *   - generatePrompts:
 *       · workflow not found → throws
 *       · status !== approved → throws
 *       · prompts_generated=true → returns existing (idempotent, no insert)
 *       · no steps → throws
 *       · happy path: transaction, inserts all prompts, links steps, marks flag
 *       · dependency chain: explicit (depends_on_step) vs sequence (i>0) vs none
 *       · transaction rollback on INSERT failure
 *       · generation_error written when rollback occurs
 *       · recordAll called outside transaction
 *       · logAction runs after commit
 *
 * Run: npx tsx server/src/services/__tests__/workflowGenerationService.test.ts
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

function installStub(relPath: string, exports: any) {
  const tsxResolved = require.resolve(relPath);
  const jsPath = tsxResolved.replace(/\.ts$/, '.js');
  for (const p of [tsxResolved, jsPath]) {
    require.cache[p] = { id: p, filename: p, loaded: true, exports } as any;
  }
}

// ── uuid stub ────────────────────────────────────────────────────────
let uuidCounter = 0;
const uuidStub = {
  v4: () => `uuid-${++uuidCounter}`,
};
installStub('uuid', uuidStub);

// ── constraintInjectionEngine stub ───────────────────────────────────
type BuildCall = { step: any; workflow: any };
const injectionCalls: BuildCall[] = [];
let defaultConstraintBlock = 'CONSTRAINT: Always validate input';
let defaultConstraints: any[] = [
  { title: 'Input Validation', severity: 'high', injection_reason: 'prior-incident' },
];
let recordAllCalls: Array<{ promptId: string }> = [];
let recordAllThrows = false;

function resetInjectionEngine() {
  injectionCalls.length = 0;
  recordAllCalls.length = 0;
  defaultConstraintBlock = 'CONSTRAINT: Always validate input';
  defaultConstraints = [
    { title: 'Input Validation', severity: 'high', injection_reason: 'prior-incident' },
  ];
  recordAllThrows = false;
}

const injectionEngineStub = {
  buildConstraintBlock: async (step: any, workflow: any) => {
    injectionCalls.push({ step, workflow });
    return {
      text: defaultConstraintBlock,
      constraints: defaultConstraints,
      recordAll: async (promptId: string) => {
        recordAllCalls.push({ promptId });
        if (recordAllThrows) throw new Error('record failed');
      },
    };
  },
};
installStub('../constraintInjectionEngine', injectionEngineStub);

// ── Fake pool with connection ────────────────────────────────────────
type QueryCall = { sql: string; params: any[]; where: 'pool' | 'conn' };
const queryLog: QueryCall[] = [];

let workflowRows: any[] = [];
let stepsRows: any[] = [];
let existingPromptsRows: any[] = [];
let connInsertThrowsOnCall: number | null = null;
let connQueryCount = 0;
let commitCount = 0;
let rollbackCount = 0;
let releaseCount = 0;
let beginCount = 0;

function resetState() {
  queryLog.length = 0;
  workflowRows = [];
  stepsRows = [];
  existingPromptsRows = [];
  connInsertThrowsOnCall = null;
  connQueryCount = 0;
  commitCount = 0;
  rollbackCount = 0;
  releaseCount = 0;
  beginCount = 0;
  uuidCounter = 0;
  resetInjectionEngine();
}

const fakeConnection = {
  query: async (sql: string, params: any[] = []) => {
    connQueryCount++;
    queryLog.push({ sql, params, where: 'conn' });
    if (connInsertThrowsOnCall !== null && connQueryCount >= connInsertThrowsOnCall) {
      throw new Error('insert blew up');
    }
    if (/^INSERT INTO om_prompt_registry/i.test(sql)) {
      return [{ affectedRows: 1 }];
    }
    if (/^UPDATE prompt_workflow_steps/i.test(sql)) {
      return [{ affectedRows: 1 }];
    }
    if (/^UPDATE prompt_workflows SET prompts_generated/i.test(sql)) {
      return [{ affectedRows: 1 }];
    }
    return [[]];
  },
  beginTransaction: async () => { beginCount++; },
  commit: async () => { commitCount++; },
  rollback: async () => { rollbackCount++; },
  release: () => { releaseCount++; },
};

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params, where: 'pool' });

    if (/SELECT \* FROM prompt_workflows WHERE id = /i.test(sql)) {
      return [workflowRows];
    }
    if (/SELECT \* FROM prompt_workflow_steps WHERE workflow_id = /i.test(sql)) {
      return [stepsRows];
    }
    if (/FROM om_prompt_registry p[\s\S]*JOIN prompt_workflow_steps s/i.test(sql)) {
      return [existingPromptsRows];
    }
    if (/^UPDATE prompt_workflows SET generation_error/i.test(sql)) {
      return [{ affectedRows: 1 }];
    }
    if (/^INSERT INTO system_logs/i.test(sql)) {
      return [{ insertId: 1 }];
    }
    return [[]];
  },
  getConnection: async () => fakeConnection,
};

installStub('../../config/db', { getAppPool: () => fakePool });

// ── SUT ──────────────────────────────────────────────────────────────
const {
  previewGeneration,
  generatePrompts,
  buildPromptFromStep,
} = require('../workflowGenerationService');

const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// Helper to build a step/workflow
function mkWorkflow(overrides: any = {}) {
  return {
    id: 'wf-1',
    name: 'Test Workflow',
    component: 'backend',
    status: 'approved',
    prompts_generated: 0,
    ...overrides,
  };
}

function mkStep(overrides: any = {}) {
  return {
    id: 1,
    step_number: 1,
    title: 'Step One',
    purpose: 'Do a thing',
    component: null,
    prompt_type: 'implementation',
    requirements_summary: null,
    expected_outcome: 'Thing done',
    depends_on_step: null,
    ...overrides,
  };
}

async function main() {

// ============================================================================
// buildPromptFromStep — pure
// ============================================================================
console.log('\n── buildPromptFromStep ──────────────────────────────────');

{
  const workflow = mkWorkflow();
  const step = mkStep({ step_number: 2, depends_on_step: 1 });
  const text = buildPromptFromStep(step, workflow, 1, 5, 'INJECT: custom');

  // All 8 required sections
  assert(/\[METADATA\]/.test(text), 'has [METADATA]');
  assert(/CRITICAL EXECUTION RULES/.test(text), 'has CRITICAL EXECUTION RULES');
  assert(/SYSTEM PRIORITIES/.test(text), 'has SYSTEM PRIORITIES');
  assert(/TASK:/.test(text), 'has TASK:');
  assert(/REQUIREMENTS:/.test(text), 'has REQUIREMENTS:');
  assert(/OUTPUT REQUIREMENTS:/.test(text), 'has OUTPUT REQUIREMENTS:');
  assert(/PROHIBITIONS:/.test(text), 'has PROHIBITIONS:');
  assert(/FINAL REQUIREMENT:/.test(text), 'has FINAL REQUIREMENT:');

  // Metadata content
  assert(text.includes('Test Workflow'), 'metadata includes workflow name');
  assert(text.includes('wf-1'), 'metadata includes workflow id');
  assert(text.includes('step 2 of 5'), 'metadata step count');
  assert(text.includes('implementation'), 'includes prompt_type');
  assert(text.includes('Implementation'), 'includes type label');

  // Constraint block injected
  assert(text.includes('INJECT: custom'), 'constraint block included');

  // Dependency line
  assert(/Depends on: Step 1/.test(text), 'dependency line rendered');

  // Default component fallback
  assert(text.includes('backend'), 'falls back to workflow.component');
}

// No constraint block (null)
{
  const text = buildPromptFromStep(mkStep(), mkWorkflow(), 0, 1, null);
  assert(!/INJECT:/.test(text), 'no constraint when null');
}

// Unknown prompt_type → raw value
{
  const text = buildPromptFromStep(mkStep({ prompt_type: 'unknown_type' }), mkWorkflow(), 0, 1, '');
  assert(text.includes('unknown_type'), 'raw prompt_type when no label');
}

// step.component overrides workflow.component
{
  const text = buildPromptFromStep(mkStep({ component: 'auth-service' }), mkWorkflow(), 0, 1, '');
  assert(text.includes('auth-service'), 'step.component overrides');
}

// No depends_on_step → no Depends line
{
  const text = buildPromptFromStep(mkStep(), mkWorkflow(), 0, 1, '');
  assert(!/Depends on: Step/.test(text), 'no dependency line when null');
}

// Default requirements when summary missing
{
  const text = buildPromptFromStep(mkStep({ requirements_summary: null }), mkWorkflow(), 0, 1, '');
  assert(text.includes('Complete all objectives'), 'default requirements text');
}

// Custom requirements_summary passed through
{
  const text = buildPromptFromStep(
    mkStep({ requirements_summary: 'My custom reqs\n- Must do X' }),
    mkWorkflow(), 0, 1, ''
  );
  assert(text.includes('My custom reqs'), 'custom requirements passed through');
  assert(text.includes('Must do X'), 'full requirements text');
}

// ============================================================================
// previewGeneration
// ============================================================================
console.log('\n── previewGeneration ────────────────────────────────────');

resetState();
workflowRows = [];
{
  let caught: Error | null = null;
  try { await previewGeneration('missing'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /not found/i.test(caught!.message), 'missing workflow throws');
}

resetState();
workflowRows = [mkWorkflow()];
stepsRows = [];
{
  let caught: Error | null = null;
  try { await previewGeneration('wf-1'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /no steps/i.test(caught!.message), 'no steps throws');
}

resetState();
workflowRows = [mkWorkflow()];
stepsRows = [
  mkStep({ id: 1, step_number: 1, title: 'First' }),
  mkStep({ id: 2, step_number: 2, title: 'Second', depends_on_step: 1 }),
];
{
  const previews = await previewGeneration('wf-1');
  assertEq(previews.length, 2, '2 previews');
  assertEq(previews[0].step_number, 1, 'preview 0 step_number');
  assertEq(previews[0].title, 'First', 'preview 0 title');
  assertEq(previews[0].component, 'backend', 'component default');
  assert(previews[0].prompt_text.includes('[METADATA]'), 'has full prompt text');
  assertEq(previews[0].injected_constraints.length, 1, 'constraints array');
  assertEq(previews[0].injected_constraints[0].title, 'Input Validation', 'constraint title');
  assertEq(previews[0].injected_constraints[0].severity, 'high', 'severity');
  assertEq(injectionCalls.length, 2, 'buildConstraintBlock called per step');
}

// ============================================================================
// generatePrompts — workflow not found
// ============================================================================
console.log('\n── generatePrompts: workflow not found ──────────────────');

resetState();
workflowRows = [];
{
  let caught: Error | null = null;
  try { await generatePrompts('missing', 'alice'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /not found/i.test(caught!.message), 'not found throws');
}

// ============================================================================
// generatePrompts — status not approved
// ============================================================================
console.log('\n── generatePrompts: wrong status ────────────────────────');

resetState();
workflowRows = [mkWorkflow({ status: 'draft' })];
{
  let caught: Error | null = null;
  try { await generatePrompts('wf-1', 'alice'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /must be "approved"/i.test(caught!.message), 'draft throws');
}

// ============================================================================
// generatePrompts — idempotent (already generated)
// ============================================================================
console.log('\n── generatePrompts: idempotent ──────────────────────────');

resetState();
workflowRows = [mkWorkflow({ prompts_generated: 1 })];
existingPromptsRows = [
  { id: 'p1', step_number: 1, title: 'One' },
  { id: 'p2', step_number: 2, title: 'Two' },
];
{
  const result = await generatePrompts('wf-1', 'alice');
  assertEq(result.already_existed, true, 'already_existed true');
  assertEq(result.prompts.length, 2, 'returns existing prompts');
  assertEq(result.injections_count, 0, 'no injections');

  // Should NOT have called getConnection/beginTransaction
  assertEq(beginCount, 0, 'no transaction started');
  assertEq(connQueryCount, 0, 'no conn queries');
}

// ============================================================================
// generatePrompts — no steps error
// ============================================================================
console.log('\n── generatePrompts: no steps ────────────────────────────');

resetState();
workflowRows = [mkWorkflow()];
stepsRows = [];
{
  let caught: Error | null = null;
  try { await generatePrompts('wf-1', 'alice'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /no steps/i.test(caught!.message), 'no steps throws');
}

// ============================================================================
// generatePrompts — happy path
// ============================================================================
console.log('\n── generatePrompts: happy path ──────────────────────────');

resetState();
workflowRows = [mkWorkflow()];
stepsRows = [
  mkStep({ id: 10, step_number: 1, title: 'First step' }),
  mkStep({ id: 20, step_number: 2, title: 'Second step', depends_on_step: 1 }),
  mkStep({ id: 30, step_number: 3, title: 'Third step' }),
];
quiet();
{
  const result = await generatePrompts('wf-1', 'alice');
  loud();

  assertEq(result.already_existed, false, 'not already existed');
  assertEq(result.prompts.length, 3, '3 prompts generated');
  assertEq(result.injections_count, 3, 'injections: 1 per step × 3');

  // Transaction lifecycle
  assertEq(beginCount, 1, 'beginTransaction called');
  assertEq(commitCount, 1, 'commit called');
  assertEq(rollbackCount, 0, 'no rollback');
  assertEq(releaseCount, 1, 'connection released');

  // Conn queries: 3 INSERT + 3 UPDATE step.prompt_id + 1 UPDATE prompts_generated = 7
  const connQueries = queryLog.filter(q => q.where === 'conn');
  const inserts = connQueries.filter(q => /INSERT INTO om_prompt_registry/i.test(q.sql));
  assertEq(inserts.length, 3, '3 INSERT queries');

  // First insert: dep_type='none', depends_on_prompt_id=null
  assertEq(inserts[0].params[9], 'none', 'step 1 dep_type none');
  assertEq(inserts[0].params[10], null, 'step 1 depends_on null');

  // Second insert: explicit (depends_on_step=1)
  assertEq(inserts[1].params[9], 'explicit', 'step 2 dep_type explicit');
  assertEq(inserts[1].params[10], 'uuid-1', 'step 2 depends on first prompt');

  // Third insert: sequence (no depends_on_step, but i>0)
  assertEq(inserts[2].params[9], 'sequence', 'step 3 dep_type sequence');
  assertEq(inserts[2].params[10], 'uuid-2', 'step 3 depends on second prompt');

  // UPDATE step links
  const stepUpdates = connQueries.filter(q => /UPDATE prompt_workflow_steps SET prompt_id/i.test(q.sql));
  assertEq(stepUpdates.length, 3, '3 step links');
  assertEq(stepUpdates[0].params[0], 'uuid-1', 'step 1 → uuid-1');
  assertEq(stepUpdates[0].params[1], 10, 'step 1 id');

  // Workflow marked generated
  const wfUpdate = connQueries.find(q => /UPDATE prompt_workflows SET prompts_generated/i.test(q.sql))!;
  assert(wfUpdate !== undefined, 'prompts_generated UPDATE fired');

  // recordAll called outside transaction
  assertEq(recordAllCalls.length, 3, 'recordAll called for each prompt');
  assertEq(recordAllCalls[0].promptId, 'uuid-1', 'recordAll prompt 1');

  // system_logs insert happened
  const logInsert = queryLog.find(q => /INSERT INTO system_logs/i.test(q.sql));
  assert(logInsert !== undefined, 'system_logs insert fired');
}

// ============================================================================
// generatePrompts — transaction rollback on failure
// ============================================================================
console.log('\n── generatePrompts: rollback ────────────────────────────');

resetState();
workflowRows = [mkWorkflow()];
stepsRows = [
  mkStep({ id: 10, step_number: 1, title: 'First' }),
  mkStep({ id: 20, step_number: 2, title: 'Second' }),
];
// Throw on the 2nd conn query (second INSERT)
// Order: beginTransaction (not queried), INSERT #1, UPDATE step #1, INSERT #2 (THROW)
connInsertThrowsOnCall = 3;
quiet();
{
  let caught: Error | null = null;
  try { await generatePrompts('wf-1', 'alice'); }
  catch (e: any) { caught = e; }
  loud();

  assert(caught !== null && /rolled back/i.test(caught!.message), 'rollback error thrown');
  assertEq(rollbackCount, 1, 'rollback called');
  assertEq(commitCount, 0, 'no commit');
  assertEq(releaseCount, 1, 'connection released in finally');

  // generation_error written
  const errUpdate = queryLog.find(q => /UPDATE prompt_workflows SET generation_error/i.test(q.sql))!;
  assert(errUpdate !== undefined, 'generation_error UPDATE fired');
  assert(/insert blew up/.test(errUpdate.params[0]), 'error message preserved');
}

// ============================================================================
// generatePrompts — recordAll failure is swallowed
// ============================================================================
console.log('\n── generatePrompts: recordAll failure ───────────────────');

resetState();
workflowRows = [mkWorkflow()];
stepsRows = [mkStep({ id: 10, step_number: 1 })];
recordAllThrows = true;
quiet();
{
  const result = await generatePrompts('wf-1', 'alice');
  loud();
  assertEq(result.prompts.length, 1, 'still returns prompts');
  assertEq(commitCount, 1, 'commit still happened');
  assertEq(recordAllCalls.length, 1, 'recordAll attempted');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  process.exit(1);
});
