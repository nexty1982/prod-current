#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowGenerationService.js (OMD-1182)
 *
 * Stubs (via require.cache, before SUT require):
 *   - uuid → deterministic sequence (uuid-1, uuid-2, ...)
 *   - ../config/db → route-dispatch fake pool w/ getConnection()
 *   - ./constraintInjectionEngine → scriptable buildConstraintBlock
 *
 * Coverage:
 *   - buildPromptFromStep (pure):
 *       · includes all 8 required sections
 *       · [METADATA] ID zero-padded + DATE isoformat + WORKFLOW step line
 *       · TASK section includes title, purpose, step_number, type label
 *       · depends_on_step rendered when set
 *       · constraintBlock injected between REQUIREMENTS and OUTPUT REQUIREMENTS
 *       · unknown prompt_type falls back to the raw type string
 *       · step.component override beats workflow.component
 *       · step.requirements_summary populates REQUIREMENTS
 *       · default REQUIREMENTS when summary missing
 *   - previewGeneration:
 *       · workflow not found → throws
 *       · workflow has no steps → throws
 *       · happy path: returns one preview per step with injected_constraints shape
 *   - generatePrompts:
 *       · workflow not found → throws
 *       · status != approved → throws with status in message
 *       · prompts_generated=true → idempotent early return w/ already_existed=true
 *       · empty steps → throws
 *       · happy path: inserts one prompt per step, links steps, updates workflow,
 *         commits, calls recordAll for each constraint block, writes system_logs
 *       · dependency_type: step 0 = 'none', step 1 with depends_on_step = 'explicit',
 *         step 2 without depends_on_step = 'sequence'
 *       · conn.query throws → rollback called, generation_error updated, throws wrapped
 *       · recordAll failure is swallowed (non-critical)
 *       · conn.release called in finally
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

// ── uuid stub ──────────────────────────────────────────────────
let uuidCounter = 0;
const uuidStub = {
  v4: () => `uuid-${++uuidCounter}`,
};
try {
  const p = require.resolve('uuid');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: uuidStub } as any;
} catch {}

// ── constraintInjectionEngine stub ─────────────────────────────
let buildConstraintBlockResponse: any[] = [];
let recordAllCalls: Array<{ promptId: string; idx: number }> = [];
let recordAllThrowsOn: number | null = null;
let buildIdx = 0;

const injectionStub = {
  buildConstraintBlock: async (step: any, workflow: any) => {
    const idx = buildIdx++;
    const resp = buildConstraintBlockResponse[idx] || {
      text: '',
      constraints: [],
    };
    return {
      text: resp.text,
      constraints: resp.constraints,
      recordAll: async (promptId: string) => {
        recordAllCalls.push({ promptId, idx });
        if (recordAllThrowsOn === idx) {
          throw new Error('recordAll failed');
        }
      },
    };
  },
};
try {
  const p = require.resolve('../constraintInjectionEngine');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: injectionStub } as any;
} catch {
  // Module may not physically exist — that's fine, SUT require will try and we pre-cached
  const synth = require('path').resolve(
    __dirname, '..', 'constraintInjectionEngine'
  );
  (require.cache as any)[synth + '.js'] = {
    id: synth + '.js', filename: synth + '.js', loaded: true, exports: injectionStub,
  };
}

// ── Fake pool + fake connection ────────────────────────────────
type QueryCall = { sql: string; params: any[]; via: 'pool' | 'conn' };
const queryLog: QueryCall[] = [];

let wfRow: any = null;
let stepsRows: any[] = [];
let existingPromptsRows: any[] = [];
let connQueryThrowsOnPattern: RegExp | null = null;
let connState = { beginTransactionCalled: 0, commitCalled: 0, rollbackCalled: 0, releaseCalled: 0 };

const fakeConn = {
  beginTransaction: async () => { connState.beginTransactionCalled++; },
  commit: async () => { connState.commitCalled++; },
  rollback: async () => { connState.rollbackCalled++; },
  release: () => { connState.releaseCalled++; },
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params, via: 'conn' });
    if (connQueryThrowsOnPattern && connQueryThrowsOnPattern.test(sql)) {
      throw new Error('conn query fail');
    }
    return [{ affectedRows: 1 }];
  },
};

const fakePool = {
  getConnection: async () => fakeConn,
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params, via: 'pool' });

    // prompt_workflows SELECT
    if (/SELECT \* FROM prompt_workflows WHERE id = \?/i.test(sql)) {
      return [wfRow === null ? [] : [wfRow]];
    }
    // prompt_workflow_steps SELECT
    if (/SELECT \* FROM prompt_workflow_steps WHERE workflow_id = \?/i.test(sql)) {
      return [stepsRows];
    }
    // Existing prompts (idempotency branch)
    if (/FROM om_prompt_registry p[\s\S]*JOIN prompt_workflow_steps/i.test(sql)) {
      return [existingPromptsRows];
    }
    // UPDATE generation_error
    if (/UPDATE prompt_workflows SET generation_error/i.test(sql)) {
      return [{ affectedRows: 1 }];
    }
    // system_logs INSERT
    if (/INSERT INTO system_logs/i.test(sql)) {
      return [{ insertId: 1 }];
    }
    return [[]];
  },
};

function resetState() {
  queryLog.length = 0;
  wfRow = null;
  stepsRows = [];
  existingPromptsRows = [];
  connQueryThrowsOnPattern = null;
  connState = { beginTransactionCalled: 0, commitCalled: 0, rollbackCalled: 0, releaseCalled: 0 };
  buildConstraintBlockResponse = [];
  recordAllCalls = [];
  recordAllThrowsOn = null;
  buildIdx = 0;
  uuidCounter = 0;
}

// ── Stub ../config/db ──────────────────────────────────────────
const dbStub = { getAppPool: () => fakePool };
try {
  const p = require.resolve('../../config/db');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: dbStub } as any;
} catch {}

// ── Silence console ───────────────────────────────────────────
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const {
  previewGeneration,
  generatePrompts,
  buildPromptFromStep,
} = require('../workflowGenerationService');

async function main() {

// ============================================================================
// buildPromptFromStep — pure function
// ============================================================================
console.log('\n── buildPromptFromStep ───────────────────────────────────');

const wf = { id: 'wf-1', name: 'Test Workflow', component: 'om-backend' };
const step1 = {
  step_number: 1, prompt_type: 'plan', component: null,
  purpose: 'Design the architecture',
  title: 'Plan the widget',
  requirements_summary: '1. A\n2. B\n3. C',
  expected_outcome: 'Working widget',
  depends_on_step: null,
};
{
  const text = buildPromptFromStep(step1, wf, 0, 3);
  // All 8 required sections
  assert(text.includes('[METADATA]'), 'METADATA');
  assert(/CRITICAL\s+EXECUTION\s+RULES/i.test(text), 'CRITICAL EXECUTION RULES');
  assert(/SYSTEM\s+PRIORITIES/i.test(text), 'SYSTEM PRIORITIES');
  assert(/\bTASK\s*:/i.test(text), 'TASK');
  assert(/\bREQUIREMENTS\s*:/i.test(text), 'REQUIREMENTS');
  assert(/OUTPUT\s+REQUIREMENTS\s*:/i.test(text), 'OUTPUT REQUIREMENTS');
  assert(/\bPROHIBITIONS\s*:/i.test(text), 'PROHIBITIONS');
  assert(/FINAL\s+REQUIREMENT\s*:/i.test(text), 'FINAL REQUIREMENT');

  assert(text.includes('ID: 001'), 'ID zero-padded (index 0)');
  assert(text.includes('WORKFLOW: Test Workflow (step 1 of 3)'), 'workflow step header');
  assert(text.includes('PROMPT_TYPE: plan'), 'prompt type in metadata');
  assert(text.includes('COMPONENT: om-backend'), 'component from workflow');
  assert(text.includes('Plan the widget'), 'title in TASK');
  assert(text.includes('Design the architecture'), 'purpose in TASK');
  assert(text.includes('Type: Planning & Architecture'), 'type label');
  assert(text.includes('1. A'), 'requirements_summary');
  assert(text.includes('Working widget'), 'expected outcome');
  assert(!text.includes('Depends on: Step'), 'no depends_on line when null');
  // No constraint block → no extra section
  assert(!/\n---\n\n(Injected|Constraint)/i.test(text), 'no constraint block');
}

// step.component overrides workflow.component
{
  const step = { ...step1, component: 'om-frontend', step_number: 2 };
  const text = buildPromptFromStep(step, wf, 1, 3);
  assert(text.includes('COMPONENT: om-frontend'), 'step.component override');
  assert(text.includes('ID: 002'), 'ID 002 (index 1)');
}

// depends_on_step populated
{
  const step = { ...step1, depends_on_step: 2 };
  const text = buildPromptFromStep(step, wf, 2, 5);
  assert(text.includes('Depends on: Step 2'), 'depends_on rendered');
  assert(text.includes('ID: 003'), 'ID 003 (index 2)');
  assert(text.includes('step 1 of 5'), 'total steps');
}

// constraintBlock injected
{
  const text = buildPromptFromStep(step1, wf, 0, 1, '⚠ Constraint: no null fields.');
  assert(text.includes('⚠ Constraint: no null fields.'), 'constraint block injected');
}

// Unknown prompt_type falls back to raw
{
  const step = { ...step1, prompt_type: 'exotic_type' };
  const text = buildPromptFromStep(step, wf, 0, 1);
  assert(text.includes('Type: exotic_type'), 'unknown type raw');
  assert(text.includes('PROMPT_TYPE: exotic_type'), 'metadata raw');
}

// Default REQUIREMENTS when summary missing
{
  const step = { ...step1, requirements_summary: null };
  const text = buildPromptFromStep(step, wf, 0, 1);
  assert(text.includes('Complete all objectives'), 'default requirements');
  assert(text.includes('Follow existing codebase patterns'), 'default reqs line 3');
}

// ============================================================================
// previewGeneration
// ============================================================================
console.log('\n── previewGeneration ─────────────────────────────────────');

// Not found
resetState();
{
  let caught: Error | null = null;
  try { await previewGeneration('missing'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'workflow not found');
}

// No steps
resetState();
wfRow = { id: 'wf-1', name: 'WF', component: 'om-backend' };
stepsRows = [];
{
  let caught: Error | null = null;
  try { await previewGeneration('wf-1'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('no steps'), 'no steps throws');
}

// Happy path
resetState();
wfRow = { id: 'wf-1', name: 'WF', component: 'om-backend' };
stepsRows = [
  { id: 1, step_number: 1, title: 'Step1', purpose: 'do a thing', prompt_type: 'plan',
    component: null, depends_on_step: null, expected_outcome: 'done',
    requirements_summary: 'x' },
  { id: 2, step_number: 2, title: 'Step2', purpose: 'do another', prompt_type: 'implementation',
    component: null, depends_on_step: 1, expected_outcome: 'done2',
    requirements_summary: 'y' },
];
buildConstraintBlockResponse = [
  { text: 'block1', constraints: [{ title: 'C1', severity: 'high', injection_reason: 'r1' }] },
  { text: 'block2', constraints: [] },
];
{
  const previews = await previewGeneration('wf-1');
  assertEq(previews.length, 2, '2 previews');
  assertEq(previews[0].step_number, 1, 'step 1');
  assertEq(previews[0].title, 'Step1', 'title 1');
  assertEq(previews[0].injected_constraints.length, 1, '1 constraint injected');
  assertEq(previews[0].injected_constraints[0], { title: 'C1', severity: 'high', reason: 'r1' }, 'constraint shape');
  assert(previews[0].prompt_text.includes('block1'), 'block1 in prompt text');
  assertEq(previews[1].injected_constraints.length, 0, 'no constraints step 2');
  assert(previews[1].prompt_text.includes('block2'), 'block2 in prompt text');
}

// ============================================================================
// generatePrompts — validation paths
// ============================================================================
console.log('\n── generatePrompts: validation ───────────────────────────');

// Not found
resetState();
{
  let caught: Error | null = null;
  try { await generatePrompts('missing', 'tester'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'not found');
}

// Wrong status
resetState();
wfRow = { id: 'wf-1', status: 'draft' };
{
  let caught: Error | null = null;
  try { await generatePrompts('wf-1', 'tester'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'wrong status throws');
  assert(caught !== null && caught.message.includes('"draft"'), 'includes current status');
}

// Idempotent: prompts_generated=true
resetState();
wfRow = { id: 'wf-1', status: 'approved', prompts_generated: 1 };
existingPromptsRows = [{ id: 'p-old-1', step_number: 1 }, { id: 'p-old-2', step_number: 2 }];
{
  const r = await generatePrompts('wf-1', 'tester');
  assertEq(r.already_existed, true, 'already_existed true');
  assertEq(r.prompts.length, 2, 'returns existing');
  assertEq(r.injections_count, 0, 'no new injections');
  assertEq(connState.beginTransactionCalled, 0, 'no transaction opened');
}

// Empty steps
resetState();
wfRow = { id: 'wf-1', status: 'approved', prompts_generated: 0, name: 'WF', component: 'c' };
stepsRows = [];
{
  let caught: Error | null = null;
  try { await generatePrompts('wf-1', 'tester'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('no steps'), 'empty steps throws');
}

// ============================================================================
// generatePrompts — happy path
// ============================================================================
console.log('\n── generatePrompts: happy path ───────────────────────────');

resetState();
wfRow = { id: 'wf-1', status: 'approved', prompts_generated: 0, name: 'WF', component: 'om-backend' };
stepsRows = [
  { id: 10, step_number: 1, title: 'Plan', purpose: 'plan it', prompt_type: 'plan',
    component: null, depends_on_step: null, expected_outcome: 'planned',
    requirements_summary: 'r1' },
  { id: 11, step_number: 2, title: 'Impl', purpose: 'build it', prompt_type: 'implementation',
    component: null, depends_on_step: 1, expected_outcome: 'built',
    requirements_summary: 'r2' },
  { id: 12, step_number: 3, title: 'Test', purpose: 'test it', prompt_type: 'verification',
    component: null, depends_on_step: null, expected_outcome: 'verified',
    requirements_summary: 'r3' },
];
buildConstraintBlockResponse = [
  { text: '', constraints: [{ title: 'C1', severity: 'high', injection_reason: 'r' }] },
  { text: 'block2', constraints: [] },
  { text: 'block3', constraints: [{ title: 'C2' }, { title: 'C3' }] },
];
quiet();
{
  const r = await generatePrompts('wf-1', 'actor@x');
  loud();

  assertEq(r.already_existed, false, 'not already existed');
  assertEq(r.prompts.length, 3, '3 prompts');
  assertEq(r.injections_count, 3, '1 + 0 + 2 = 3 injections total');

  // UUIDs assigned in order
  assertEq(r.prompts[0].id, 'uuid-1', 'first id');
  assertEq(r.prompts[1].id, 'uuid-2', 'second id');
  assertEq(r.prompts[2].id, 'uuid-3', 'third id');

  // Dependency types
  assertEq(r.prompts[0].dependency_type, 'none', 'step 0 dep = none');
  assertEq(r.prompts[0].depends_on_prompt_id, null, 'step 0 no dep');

  assertEq(r.prompts[1].dependency_type, 'explicit', 'step 1 dep = explicit');
  assertEq(r.prompts[1].depends_on_prompt_id, 'uuid-1', 'step 1 → uuid-1');

  assertEq(r.prompts[2].dependency_type, 'sequence', 'step 2 dep = sequence (no explicit)');
  assertEq(r.prompts[2].depends_on_prompt_id, 'uuid-2', 'step 2 → uuid-2');

  // Transaction lifecycle
  assertEq(connState.beginTransactionCalled, 1, 'beginTransaction called');
  assertEq(connState.commitCalled, 1, 'commit called');
  assertEq(connState.rollbackCalled, 0, 'no rollback');
  assertEq(connState.releaseCalled, 1, 'release called');

  // INSERT count
  const inserts = queryLog.filter(c =>
    c.via === 'conn' && /INSERT INTO om_prompt_registry/i.test(c.sql)
  );
  assertEq(inserts.length, 3, '3 INSERTs');

  // step → prompt linking updates
  const updates = queryLog.filter(c =>
    c.via === 'conn' && /UPDATE prompt_workflow_steps SET prompt_id/i.test(c.sql)
  );
  assertEq(updates.length, 3, '3 step linkage UPDATEs');

  // Workflow marked generated
  const wfUpdate = queryLog.find(c =>
    c.via === 'conn' && /UPDATE prompt_workflows SET prompts_generated = 1/i.test(c.sql)
  );
  assert(!!wfUpdate, 'workflow prompts_generated=1');

  // system_logs entry
  const sysLog = queryLog.find(c => /INSERT INTO system_logs/i.test(c.sql));
  assert(!!sysLog, 'system_logs insert');
  assert((sysLog!.params[0] as string).includes('PROMPTS_GENERATED'), 'message action');
  assertEq(sysLog!.params[2], 'actor@x', 'actor logged');

  // recordAll called 3 times, one per prompt
  assertEq(recordAllCalls.length, 3, 'recordAll called thrice');
  assertEq(recordAllCalls[0].promptId, 'uuid-1', 'recordAll uuid-1');
  assertEq(recordAllCalls[1].promptId, 'uuid-2', 'recordAll uuid-2');
  assertEq(recordAllCalls[2].promptId, 'uuid-3', 'recordAll uuid-3');
}

// ============================================================================
// generatePrompts — conn.query throws → rollback
// ============================================================================
console.log('\n── generatePrompts: transaction rollback ─────────────────');

resetState();
wfRow = { id: 'wf-1', status: 'approved', prompts_generated: 0, name: 'WF', component: 'c' };
stepsRows = [
  { id: 10, step_number: 1, title: 'Plan', purpose: 'plan', prompt_type: 'plan',
    component: null, depends_on_step: null, expected_outcome: 'p',
    requirements_summary: 'r' },
];
buildConstraintBlockResponse = [{ text: '', constraints: [] }];
connQueryThrowsOnPattern = /INSERT INTO om_prompt_registry/;
quiet();
{
  let caught: Error | null = null;
  try { await generatePrompts('wf-1', 'tester'); }
  catch (e: any) { caught = e; }
  loud();

  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('Batch generation failed'), 'wrapped message');
  assert(caught !== null && caught.message.includes('rolled back'), 'mentions rollback');

  assertEq(connState.beginTransactionCalled, 1, 'transaction started');
  assertEq(connState.commitCalled, 0, 'no commit');
  assertEq(connState.rollbackCalled, 1, 'rollback called');
  assertEq(connState.releaseCalled, 1, 'release called in finally');

  // generation_error persisted
  const errUpdate = queryLog.find(c =>
    c.via === 'pool' && /UPDATE prompt_workflows SET generation_error/i.test(c.sql)
  );
  assert(!!errUpdate, 'generation_error updated');
  assert(typeof errUpdate!.params[0] === 'string', 'error message persisted');
}

// ============================================================================
// generatePrompts — recordAll failure is swallowed
// ============================================================================
console.log('\n── generatePrompts: recordAll swallowed ──────────────────');

resetState();
wfRow = { id: 'wf-1', status: 'approved', prompts_generated: 0, name: 'WF', component: 'c' };
stepsRows = [
  { id: 10, step_number: 1, title: 'Plan', purpose: 'plan', prompt_type: 'plan',
    component: null, depends_on_step: null, expected_outcome: 'p',
    requirements_summary: 'r' },
];
buildConstraintBlockResponse = [{ text: '', constraints: [] }];
recordAllThrowsOn = 0;
quiet();
{
  const r = await generatePrompts('wf-1', 'tester');
  loud();
  assertEq(r.prompts.length, 1, 'prompt generated despite recordAll failure');
  assertEq(connState.commitCalled, 1, 'commit succeeded');
  assertEq(recordAllCalls.length, 1, 'recordAll still called');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

}

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
