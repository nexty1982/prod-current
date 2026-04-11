#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowGenerationService.js (OMD-1223)
 *
 * Atomic batch prompt generation for approved workflows.
 *
 * External deps stubbed via require.cache BEFORE requiring the SUT:
 *   - ../config/db          (getAppPool → fake pool + connection)
 *   - ./constraintInjectionEngine (buildConstraintBlock)
 *   - uuid                  (v4 → deterministic counter)
 *
 * Coverage:
 *   - buildPromptFromStep (pure):
 *       · all 8 required sections present
 *       · METADATA contains workflow id, step number, component
 *       · depends_on_step → "Depends on: Step N" line
 *       · requirements_summary respected; default fallback used when absent
 *       · type label applied for known types; falls through for unknown
 *       · constraintBlock embedded when provided; omitted when empty
 *   - previewGeneration:
 *       · workflow not found → throws
 *       · no steps → throws
 *       · returns array of previews with prompt_text + injected_constraints
 *   - generatePrompts:
 *       · workflow not found → throws
 *       · workflow not approved → throws, mentions current status
 *       · already generated → returns existing (already_existed=true)
 *       · no steps → throws
 *       · happy path: INSERTs one prompt per step, UPDATEs steps, UPDATEs workflow,
 *         commits, calls recordAll outside transaction, logs
 *       · dependency_type = 'none' | 'sequence' | 'explicit'
 *       · INSERT failure inside transaction → rollback + generation_error stored
 *       · returns { prompts, already_existed:false, injections_count }
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

// ── uuid stub (deterministic) ────────────────────────────────────────
let uuidCounter = 0;
const uuidStub = { v4: () => `uuid-${++uuidCounter}` };
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath, filename: uuidPath, loaded: true, exports: uuidStub,
} as any;

// ── config/db stub ───────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[]; conn?: boolean };
const queryLog: QueryCall[] = [];

type Responder = { match: RegExp; respond: (params: any[]) => any };
let poolResponders: Responder[] = [];
let connResponders: Responder[] = [];
let connInsertThrows = false;

let beginTxCount = 0;
let commitCount = 0;
let rollbackCount = 0;
let releaseCount = 0;

const fakeConnection = {
  beginTransaction: async () => { beginTxCount++; },
  commit: async () => { commitCount++; },
  rollback: async () => { rollbackCount++; },
  release: () => { releaseCount++; },
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params, conn: true });
    if (connInsertThrows && /INSERT INTO om_prompt_registry/.test(sql)) {
      throw new Error('insert failed');
    }
    for (const r of connResponders) {
      if (r.match.test(sql)) return r.respond(params);
    }
    return [{}];
  },
};

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of poolResponders) {
      if (r.match.test(sql)) return r.respond(params);
    }
    return [[]];
  },
  getConnection: async () => fakeConnection,
};

const dbStub = { getAppPool: () => fakePool };
const path = require('path');
const dbDir = path.resolve(__dirname, '..', '..', 'config');
for (const ext of ['.js', '.ts']) {
  const p = path.join(dbDir, 'db' + ext);
  require.cache[p] = { id: p, filename: p, loaded: true, exports: dbStub } as any;
}

// ── constraintInjectionEngine stub ───────────────────────────────────
let injectionRecordAllCalls: string[] = [];
let injectionRecordAllThrows = false;
let injectionConstraintsByStep: Array<{ title: string; severity: string; injection_reason: string }> = [];

const injectionStub = {
  buildConstraintBlock: async (_step: any, _workflow: any) => {
    return {
      text: injectionConstraintsByStep.length > 0
        ? `CONSTRAINTS: ${injectionConstraintsByStep.map(c => c.title).join(', ')}`
        : '',
      constraints: [...injectionConstraintsByStep],
      recordAll: async (promptId: string) => {
        injectionRecordAllCalls.push(promptId);
        if (injectionRecordAllThrows) throw new Error('record fail');
      },
    };
  },
};
const servicesDir = path.resolve(__dirname, '..', '..', 'services');
for (const ext of ['.js', '.ts']) {
  const p = path.join(servicesDir, 'constraintInjectionEngine' + ext);
  require.cache[p] = { id: p, filename: p, loaded: true, exports: injectionStub } as any;
}

function resetState() {
  queryLog.length = 0;
  poolResponders = [];
  connResponders = [];
  connInsertThrows = false;
  beginTxCount = 0;
  commitCount = 0;
  rollbackCount = 0;
  releaseCount = 0;
  injectionRecordAllCalls = [];
  injectionRecordAllThrows = false;
  injectionConstraintsByStep = [];
  uuidCounter = 0;
}

// Silence
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const {
  previewGeneration,
  generatePrompts,
  buildPromptFromStep,
} = require('../workflowGenerationService');

// ── Fixture helpers ──────────────────────────────────────────────────
function makeWorkflow(overrides: any = {}) {
  return {
    id: 'wf-1',
    name: 'Build Widget',
    component: 'widgets',
    status: 'approved',
    prompts_generated: 0,
    ...overrides,
  };
}

function makeStep(overrides: any = {}) {
  return {
    id: 1,
    step_number: 1,
    workflow_id: 'wf-1',
    title: 'Step One',
    purpose: 'purpose text',
    component: null,
    prompt_type: 'plan',
    expected_outcome: 'An outcome description.',
    requirements_summary: null,
    depends_on_step: null,
    ...overrides,
  };
}

async function main() {

// ============================================================================
// buildPromptFromStep (pure)
// ============================================================================
console.log('\n── buildPromptFromStep ────────────────────────────────────');

{
  const wf = makeWorkflow();
  const step = makeStep({ title: 'Design API', purpose: 'Create OpenAPI spec' });
  const text = buildPromptFromStep(step, wf, 0, 3, '');

  // 8 required sections present
  assert(/\[METADATA\]/.test(text), '[METADATA] present');
  assert(/CRITICAL EXECUTION RULES/.test(text), 'CRITICAL EXECUTION RULES');
  assert(/SYSTEM PRIORITIES/.test(text), 'SYSTEM PRIORITIES');
  assert(/TASK:/.test(text), 'TASK');
  assert(/REQUIREMENTS:/.test(text), 'REQUIREMENTS');
  assert(/OUTPUT REQUIREMENTS:/.test(text), 'OUTPUT REQUIREMENTS');
  assert(/PROHIBITIONS:/.test(text), 'PROHIBITIONS');
  assert(/FINAL REQUIREMENT:/.test(text), 'FINAL REQUIREMENT');

  // Metadata
  assert(text.includes('PARENT: wf-1'), 'PARENT includes workflow id');
  assert(text.includes('WORKFLOW: Build Widget (step 1 of 3)'), 'WORKFLOW heading with step count');
  assert(text.includes('PROMPT_TYPE: plan'), 'PROMPT_TYPE');
  assert(text.includes('Design API'), 'title in TASK');
  assert(text.includes('Create OpenAPI spec'), 'purpose in TASK');
  assert(text.includes('Type: Planning & Architecture'), 'type label applied');
  assert(text.includes('Component: widgets'), 'component from workflow default');

  // No constraint block when empty
  assert(!text.includes('CONSTRAINTS:'), 'no constraint block');

  // Default requirements fallback
  assert(text.includes('1. Complete all objectives'), 'default requirements');
}

// With step.component override + requirements_summary + depends_on_step
{
  const wf = makeWorkflow();
  const step = makeStep({
    component: 'widgets-core',
    requirements_summary: '- Must be idempotent\n- Must be transactional',
    depends_on_step: 2,
  });
  const text = buildPromptFromStep(step, wf, 2, 4, 'CONSTRAINTS: No fallback');

  assert(text.includes('Component: widgets-core'), 'step.component override');
  assert(text.includes('Must be idempotent'), 'custom requirements');
  assert(!text.includes('1. Complete all objectives'), 'default not used');
  assert(text.includes('Depends on: Step 2'), 'depends_on_step rendered');
  assert(text.includes('CONSTRAINTS: No fallback'), 'constraint block embedded');
  assert(text.includes('step 1 of 4'), 'step index+1 / total'); // i=2 → ID 003, but header uses step.step_number
  // ID field uses padded (stepIndex+1)
  assert(/ID:\s*003/.test(text), 'padded ID 003');
}

// Unknown prompt_type falls through
{
  const wf = makeWorkflow();
  const step = makeStep({ prompt_type: 'unknown_type' });
  const text = buildPromptFromStep(step, wf, 0, 1, '');
  assert(text.includes('Type: unknown_type'), 'unknown type falls through');
}

// All known type labels
{
  const wf = makeWorkflow();
  const labels: Record<string, string> = {
    plan: 'Planning & Architecture',
    implementation: 'Implementation',
    verification: 'Verification & Testing',
    correction: 'Correction & Fix',
    migration: 'Data Migration',
    docs: 'Documentation',
  };
  for (const [type, label] of Object.entries(labels)) {
    const text = buildPromptFromStep(makeStep({ prompt_type: type }), wf, 0, 1, '');
    assert(text.includes(`Type: ${label}`), `type ${type} → ${label}`);
  }
}

// ============================================================================
// previewGeneration — workflow not found
// ============================================================================
console.log('\n── previewGeneration: not found ───────────────────────────');

resetState();
poolResponders = [
  { match: /SELECT \* FROM prompt_workflows WHERE id = \?/, respond: () => [[]] },
];
{
  let caught: Error | null = null;
  try { await previewGeneration('missing'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('Workflow not found'), 'message');
}

// ============================================================================
// previewGeneration — no steps
// ============================================================================
console.log('\n── previewGeneration: no steps ────────────────────────────');

resetState();
poolResponders = [
  { match: /SELECT \* FROM prompt_workflows/, respond: () => [[makeWorkflow()]] },
  { match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [[]] },
];
{
  let caught: Error | null = null;
  try { await previewGeneration('wf-1'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on no steps');
  assert(caught !== null && caught.message.includes('no steps'), 'message');
}

// ============================================================================
// previewGeneration — happy path
// ============================================================================
console.log('\n── previewGeneration: happy path ──────────────────────────');

resetState();
injectionConstraintsByStep = [
  { title: 'No mocks', severity: 'high', injection_reason: 'past failure' },
];
poolResponders = [
  { match: /SELECT \* FROM prompt_workflows/, respond: () => [[makeWorkflow()]] },
  {
    match: /SELECT \* FROM prompt_workflow_steps/,
    respond: () => [[
      makeStep({ id: 1, step_number: 1, title: 'Plan' }),
      makeStep({ id: 2, step_number: 2, title: 'Implement', prompt_type: 'implementation' }),
    ]],
  },
];

{
  const previews = await previewGeneration('wf-1');
  assertEq(previews.length, 2, '2 previews');
  assertEq(previews[0].step_number, 1, 'first step_number');
  assertEq(previews[0].title, 'Plan', 'first title');
  assertEq(previews[0].prompt_type, 'plan', 'first prompt_type');
  assert(previews[0].prompt_text.includes('[METADATA]'), 'prompt_text populated');
  assert(previews[0].prompt_text.includes('CONSTRAINTS: No mocks'), 'constraint block injected');
  assertEq(previews[0].injected_constraints.length, 1, '1 constraint recorded');
  assertEq(previews[0].injected_constraints[0].title, 'No mocks', 'constraint title');
  assertEq(previews[0].injected_constraints[0].severity, 'high', 'constraint severity');
  assertEq(previews[0].injected_constraints[0].reason, 'past failure', 'reason');
}

// ============================================================================
// generatePrompts — workflow not found
// ============================================================================
console.log('\n── generatePrompts: not found ─────────────────────────────');

resetState();
poolResponders = [{ match: /SELECT \* FROM prompt_workflows/, respond: () => [[]] }];
{
  let caught: Error | null = null;
  try { await generatePrompts('missing', 'tester'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('Workflow not found'), 'message');
}

// ============================================================================
// generatePrompts — not approved
// ============================================================================
console.log('\n── generatePrompts: not approved ──────────────────────────');

resetState();
poolResponders = [
  {
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [[makeWorkflow({ status: 'draft' })]],
  },
];
{
  let caught: Error | null = null;
  try { await generatePrompts('wf-1', 'tester'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('draft'), 'mentions current status');
  assert(caught !== null && caught.message.includes('approved'), 'mentions required status');
}

// ============================================================================
// generatePrompts — already generated (idempotent)
// ============================================================================
console.log('\n── generatePrompts: already generated ─────────────────────');

resetState();
poolResponders = [
  {
    match: /SELECT \* FROM prompt_workflows/,
    respond: () => [[makeWorkflow({ prompts_generated: 1 })]],
  },
  {
    match: /SELECT p\.\*, s\.step_number FROM om_prompt_registry/,
    respond: () => [[
      { id: 'p1', step_number: 1 },
      { id: 'p2', step_number: 2 },
    ]],
  },
];
{
  const r = await generatePrompts('wf-1', 'tester');
  assertEq(r.already_existed, true, 'already_existed=true');
  assertEq(r.prompts.length, 2, '2 existing prompts');
  assertEq(r.injections_count, 0, 'no new injections');
  assertEq(beginTxCount, 0, 'no transaction started');
}

// ============================================================================
// generatePrompts — no steps
// ============================================================================
console.log('\n── generatePrompts: no steps ──────────────────────────────');

resetState();
poolResponders = [
  { match: /SELECT \* FROM prompt_workflows/, respond: () => [[makeWorkflow()]] },
  { match: /SELECT \* FROM prompt_workflow_steps/, respond: () => [[]] },
];
{
  let caught: Error | null = null;
  try { await generatePrompts('wf-1', 'tester'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('no steps'), 'message');
}

// ============================================================================
// generatePrompts — happy path with 3 steps
// ============================================================================
console.log('\n── generatePrompts: happy path ────────────────────────────');

resetState();
injectionConstraintsByStep = [
  { title: 'cx', severity: 'high', injection_reason: 'learned' },
];
poolResponders = [
  { match: /SELECT \* FROM prompt_workflows/, respond: () => [[makeWorkflow()]] },
  {
    match: /SELECT \* FROM prompt_workflow_steps/,
    respond: () => [[
      makeStep({ id: 10, step_number: 1, title: 'Plan' }),
      makeStep({ id: 11, step_number: 2, title: 'Build', depends_on_step: null }),
      makeStep({ id: 12, step_number: 3, title: 'Verify', depends_on_step: 1 }),
    ]],
  },
  { match: /UPDATE prompt_workflows SET generation_error/, respond: () => [{}] },
  { match: /INSERT INTO system_logs/, respond: () => [{}] },
];

{
  const r = await generatePrompts('wf-1', 'tester');
  loud();

  assertEq(r.already_existed, false, 'newly generated');
  assertEq(r.prompts.length, 3, '3 prompts generated');
  assertEq(r.injections_count, 3, '3 total injections (1 per step)');

  // Transaction lifecycle
  assertEq(beginTxCount, 1, 'beginTransaction');
  assertEq(commitCount, 1, 'commit');
  assertEq(rollbackCount, 0, 'no rollback');
  assertEq(releaseCount, 1, 'release');

  // Dependency types: 1=none, 2=sequence, 3=explicit (depends_on_step=1)
  assertEq(r.prompts[0].dependency_type, 'none', 'step 1 = none');
  assertEq(r.prompts[0].depends_on_prompt_id, null, 'step 1 no dep');
  assertEq(r.prompts[1].dependency_type, 'sequence', 'step 2 = sequence');
  assertEq(r.prompts[1].depends_on_prompt_id, r.prompts[0].id, 'step 2 → step 1');
  assertEq(r.prompts[2].dependency_type, 'explicit', 'step 3 = explicit');
  assertEq(r.prompts[2].depends_on_prompt_id, r.prompts[0].id, 'step 3 → step 1 (explicit)');

  // uuid sequence
  assertEq(r.prompts[0].id, 'uuid-1', 'uuid 1');
  assertEq(r.prompts[1].id, 'uuid-2', 'uuid 2');
  assertEq(r.prompts[2].id, 'uuid-3', 'uuid 3');

  // recordAll called outside tx for each prompt
  assertEq(injectionRecordAllCalls.length, 3, 'recordAll x3');
  assertEq(injectionRecordAllCalls[0], 'uuid-1', 'recordAll p1');

  // INSERT calls — 3 inserts + 3 step updates + 1 workflow update + system_logs
  const insertCalls = queryLog.filter(q => /INSERT INTO om_prompt_registry/.test(q.sql));
  assertEq(insertCalls.length, 3, '3 INSERTs');

  const stepUpdateCalls = queryLog.filter(q => /UPDATE prompt_workflow_steps SET prompt_id/.test(q.sql));
  assertEq(stepUpdateCalls.length, 3, '3 step prompt_id updates');

  const wfUpdateCalls = queryLog.filter(q => /UPDATE prompt_workflows SET prompts_generated = 1/.test(q.sql));
  assertEq(wfUpdateCalls.length, 1, 'workflow prompts_generated=1');

  const logCalls = queryLog.filter(q => /INSERT INTO system_logs/.test(q.sql));
  assertEq(logCalls.length, 1, 'system_logs INSERT');

  // INSERT params: confirm first param is promptId, status draft, guardrails
  const firstInsert = insertCalls[0];
  assertEq(firstInsert.params[0], 'uuid-1', 'insert param: uuid');
  assertEq(firstInsert.params[1], 'tester', 'insert param: actor');
  assertEq(firstInsert.params[2], 'Plan', 'insert param: title');
}

// recordAll error is swallowed (logged but not thrown)
resetState();
injectionRecordAllThrows = true;
injectionConstraintsByStep = [
  { title: 'cx', severity: 'high', injection_reason: 'x' },
];
poolResponders = [
  { match: /SELECT \* FROM prompt_workflows/, respond: () => [[makeWorkflow()]] },
  {
    match: /SELECT \* FROM prompt_workflow_steps/,
    respond: () => [[makeStep({ id: 10, step_number: 1 })]],
  },
  { match: /INSERT INTO system_logs/, respond: () => [{}] },
];

quiet();
{
  const r = await generatePrompts('wf-1', 'tester');
  loud();
  assertEq(r.prompts.length, 1, 'still succeeds');
  assertEq(commitCount, 1, 'transaction committed');
  assertEq(injectionRecordAllCalls.length, 1, 'recordAll attempted');
}

// ============================================================================
// generatePrompts — INSERT failure inside transaction
// ============================================================================
console.log('\n── generatePrompts: rollback on failure ───────────────────');

resetState();
connInsertThrows = true;
poolResponders = [
  { match: /SELECT \* FROM prompt_workflows/, respond: () => [[makeWorkflow()]] },
  {
    match: /SELECT \* FROM prompt_workflow_steps/,
    respond: () => [[makeStep({ id: 10, step_number: 1 })]],
  },
  // Error record UPDATE after rollback
  { match: /UPDATE prompt_workflows SET generation_error/, respond: () => [{}] },
];

quiet();
{
  let caught: Error | null = null;
  try { await generatePrompts('wf-1', 'tester'); }
  catch (e: any) { caught = e; }
  loud();

  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('rolled back'), 'mentions rollback');
  assertEq(rollbackCount, 1, 'rollback called');
  assertEq(commitCount, 0, 'not committed');
  assertEq(releaseCount, 1, 'connection released via finally');

  // generation_error UPDATE fired on pool
  const errUpdate = queryLog.find(q => /UPDATE prompt_workflows SET generation_error/.test(q.sql));
  assert(errUpdate !== undefined, 'generation_error UPDATE issued');
  assertEq(errUpdate!.params[0], 'insert failed', 'error text persisted');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  process.exit(1);
});
