#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowGenerationService.js (OMD-1100)
 *
 * Generates prompts for approved workflows and inserts them into
 * om_prompt_registry. Atomic batch creation with transaction rollback
 * on failure, idempotent on re-run.
 *
 * Deps stubbed via require.cache:
 *   - ../config/db            → fake pool with query() + getConnection()
 *   - uuid (v4)               → deterministic id generator
 *   - ./constraintInjectionEngine → fake buildConstraintBlock
 *
 * Coverage:
 *   - buildPromptFromStep (pure, exported for testing):
 *       · 8 required sections present
 *       · METADATA fields populated (ID zero-padded, DATE, COMPONENT,
 *         PURPOSE, PARENT, WORKFLOW, PROMPT_TYPE)
 *       · TYPE_LABELS lookup (known + unknown passthrough)
 *       · step.component overrides workflow.component
 *       · depends_on_step line injected when set
 *       · constraint block injected when provided
 *       · default requirements fallback when requirements_summary missing
 *
 *   - previewGeneration:
 *       · workflow not found → throws
 *       · no steps → throws
 *       · returns preview array with injected_constraints metadata
 *
 *   - generatePrompts:
 *       · workflow not found → throws
 *       · status !== "approved" → throws with descriptive message
 *       · idempotent: prompts_generated=1 → returns existing via JOIN
 *       · no steps → throws
 *       · happy path: transaction begin/commit, INSERTs into
 *         om_prompt_registry, UPDATE prompt_workflow_steps.prompt_id,
 *         UPDATE prompt_workflows SET prompts_generated=1, logAction,
 *         recordAll called post-commit
 *       · dependency_type determination: explicit / sequence / none
 *       · rollback on INSERT failure: connection.rollback called,
 *         generation_error UPDATE, wrapped error thrown, release called
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

// ── Stub module helper ──────────────────────────────────────────────
function stubModule(fromPath: string, relPath: string, exports: any): void {
  const { createRequire } = require('module');
  const path = require('path');
  const fromFile = require.resolve(fromPath);
  const fromDir = path.dirname(fromFile);
  const scopedRequire = createRequire(path.join(fromDir, 'noop.js'));
  try {
    const resolved = scopedRequire.resolve(relPath);
    require.cache[resolved] = {
      id: resolved,
      filename: resolved,
      loaded: true,
      exports,
    } as any;
  } catch {}
}

// ── Fake pool + transaction connection ──────────────────────────────
type Row = Record<string, any>;
type Call = { sql: string; params: any[] };

const poolCalls: Call[] = [];
const connCalls: Call[] = [];
let beginTxCount = 0;
let commitCount = 0;
let rollbackCount = 0;
let releaseCount = 0;

// Scriptable responses: workflow row, steps rows, existing prompts rows
let workflowRows: Row[] = [];
let stepRows: Row[] = [];
let existingPromptsRows: Row[] = [];
let connQueryThrowsOnPattern: RegExp | null = null;
let poolQueryThrowsOnPattern: RegExp | null = null;

function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

async function poolQuery(sql: string, params: any[] = []): Promise<any> {
  poolCalls.push({ sql: normalize(sql), params });
  if (poolQueryThrowsOnPattern && poolQueryThrowsOnPattern.test(sql)) {
    throw new Error('pool query failed');
  }
  if (/FROM prompt_workflows WHERE id = \?/i.test(sql)) {
    return [workflowRows];
  }
  if (/FROM prompt_workflow_steps WHERE workflow_id = \?/i.test(sql)) {
    return [stepRows];
  }
  if (/FROM om_prompt_registry[\s\S]*JOIN prompt_workflow_steps/i.test(sql)) {
    return [existingPromptsRows];
  }
  if (/UPDATE prompt_workflows SET generation_error/i.test(sql)) {
    return [{ affectedRows: 1 }];
  }
  return [[]];
}

const fakeConnection = {
  beginTransaction: async () => { beginTxCount++; },
  commit: async () => { commitCount++; },
  rollback: async () => { rollbackCount++; },
  release: () => { releaseCount++; },
  query: async (sql: string, params: any[] = []) => {
    connCalls.push({ sql: normalize(sql), params });
    if (connQueryThrowsOnPattern && connQueryThrowsOnPattern.test(sql)) {
      throw new Error('conn query failed');
    }
    if (/^\s*INSERT INTO om_prompt_registry/i.test(sql)) {
      return [{ insertId: 0 }];
    }
    if (/^\s*UPDATE prompt_workflow_steps/i.test(sql)) {
      return [{ affectedRows: 1 }];
    }
    if (/^\s*UPDATE prompt_workflows/i.test(sql)) {
      return [{ affectedRows: 1 }];
    }
    return [[]];
  },
};

const fakePool = {
  query: poolQuery,
  getConnection: async () => fakeConnection,
};

function resetState() {
  poolCalls.length = 0;
  connCalls.length = 0;
  beginTxCount = 0;
  commitCount = 0;
  rollbackCount = 0;
  releaseCount = 0;
  workflowRows = [];
  stepRows = [];
  existingPromptsRows = [];
  connQueryThrowsOnPattern = null;
  poolQueryThrowsOnPattern = null;
}

// ── Stub uuid ───────────────────────────────────────────────────────
let uuidCounter = 0;
function nextUuid(): string { return `uuid-${++uuidCounter}`; }
function resetUuid() { uuidCounter = 0; }

const uuidStub = {
  v4: nextUuid,
};

// ── Stub constraintInjectionEngine ──────────────────────────────────
type FakeConstraint = {
  title: string;
  severity: string;
  injection_reason: string;
};
type ConstraintBlock = {
  text: string;
  constraints: FakeConstraint[];
  recordAll: (promptId: string) => Promise<void>;
};

const recordAllCalls: string[] = [];
let recordAllThrows = false;
let constraintBlocksByStep: Record<number, ConstraintBlock> = {};

function defaultBlock(): ConstraintBlock {
  return {
    text: '',
    constraints: [],
    recordAll: async (promptId: string) => {
      recordAllCalls.push(promptId);
      if (recordAllThrows) throw new Error('recordAll failed');
    },
  };
}

const injectionStub = {
  buildConstraintBlock: async (step: any, _workflow: any): Promise<ConstraintBlock> => {
    const custom = constraintBlocksByStep[step.step_number];
    if (custom) return custom;
    return defaultBlock();
  },
};

function resetInjection() {
  recordAllCalls.length = 0;
  recordAllThrows = false;
  constraintBlocksByStep = {};
}

// ── Register stubs ──────────────────────────────────────────────────
const sutPath = '../workflowGenerationService';

// Stub ../config/db used by SUT
stubModule(sutPath, '../config/db', { getAppPool: () => fakePool });

// Stub uuid — resolved from the SUT directory
stubModule(sutPath, 'uuid', uuidStub);

// Stub ./constraintInjectionEngine
stubModule(sutPath, './constraintInjectionEngine', injectionStub);

// Silence console
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
// buildPromptFromStep (pure)
// ============================================================================
console.log('\n── buildPromptFromStep: structure ────────────────────────');

{
  const step = {
    step_number: 2,
    prompt_type: 'implementation',
    component: 'StepComponent',
    title: 'Implement Feature X',
    purpose: 'Add feature X to the system',
    expected_outcome: 'Feature X works correctly',
    requirements_summary: '1. Build it\n2. Test it',
    depends_on_step: 1,
  };
  const workflow = {
    id: 'wf-1',
    name: 'Test Workflow',
    component: 'WorkflowComponent',
  };
  const text = buildPromptFromStep(step, workflow, 1, 3, 'CONSTRAINT TEXT HERE');

  // 8 required sections
  assert(text.includes('[METADATA]'), 'has METADATA section');
  assert(text.includes('CRITICAL EXECUTION RULES'), 'has CRITICAL EXECUTION RULES');
  assert(text.includes('SYSTEM PRIORITIES'), 'has SYSTEM PRIORITIES');
  assert(text.includes('TASK:'), 'has TASK section');
  assert(text.includes('REQUIREMENTS:'), 'has REQUIREMENTS section');
  assert(text.includes('OUTPUT REQUIREMENTS:'), 'has OUTPUT REQUIREMENTS');
  assert(text.includes('PROHIBITIONS:'), 'has PROHIBITIONS section');
  assert(text.includes('FINAL REQUIREMENT:'), 'has FINAL REQUIREMENT section');

  // Metadata content
  assert(text.includes('ID: 002'), 'ID zero-padded to 3 digits');
  assert(text.includes('PARENT: wf-1'), 'PARENT = workflow.id');
  assert(text.includes('WORKFLOW: Test Workflow (step 2 of 3)'), 'WORKFLOW with step/total');
  assert(text.includes('PROMPT_TYPE: implementation'), 'PROMPT_TYPE');
  assert(text.includes('COMPONENT: StepComponent'), 'step.component used');
  assert(text.includes('PURPOSE: Add feature X to the system'), 'PURPOSE');

  // Type label
  assert(text.includes('Type: Implementation'), 'TYPE_LABELS mapped');

  // Depends-on line
  assert(text.includes('Depends on: Step 1'), 'depends_on_step line');

  // Constraint block
  assert(text.includes('CONSTRAINT TEXT HERE'), 'constraint block included');

  // Requirements custom
  assert(text.includes('1. Build it'), 'custom requirements_summary used');
  assert(!text.includes('Complete all objectives described in the task'), 'default not used');

  // Task content
  assert(text.includes('Implement Feature X'), 'title in TASK');
  assert(text.includes('Feature X works correctly'), 'expected_outcome in OUTPUT');

  // Date format (YYYY-MM-DD)
  assert(/DATE: \d{4}-\d{2}-\d{2}/.test(text), 'DATE ISO truncated');
}

// Missing step.component → falls back to workflow.component
console.log('\n── buildPromptFromStep: component fallback ───────────────');

{
  const step = {
    step_number: 1,
    prompt_type: 'plan',
    title: 'Plan Thing',
    purpose: 'plan purpose',
    expected_outcome: 'planned',
  };
  const workflow = { id: 'wf-2', name: 'WF', component: 'FallbackComponent' };
  const text = buildPromptFromStep(step, workflow, 0, 1);
  assert(text.includes('COMPONENT: FallbackComponent'), 'workflow.component fallback');
  assert(text.includes('Type: Planning & Architecture'), 'plan label');
  assert(text.includes('ID: 001'), 'ID 001 for stepIndex 0');
  assert(!text.includes('Depends on: Step'), 'no depends line');
  // Default requirements
  assert(
    text.includes('Complete all objectives described in the task'),
    'default requirements fallback'
  );
}

// Unknown prompt_type passes through
console.log('\n── buildPromptFromStep: label fallthrough ────────────────');

{
  const step = {
    step_number: 1,
    prompt_type: 'custom_type',
    title: 'T',
    purpose: 'p',
    expected_outcome: 'o',
  };
  const workflow = { id: 'w', name: 'n', component: 'c' };
  const text = buildPromptFromStep(step, workflow, 0, 1);
  assert(text.includes('Type: custom_type'), 'unknown type fallthrough');
  assert(text.includes('PROMPT_TYPE: custom_type'), 'PROMPT_TYPE raw value');
}

// All known TYPE_LABELS
console.log('\n── buildPromptFromStep: all type labels ──────────────────');

{
  const labels = [
    ['plan', 'Planning & Architecture'],
    ['implementation', 'Implementation'],
    ['verification', 'Verification & Testing'],
    ['correction', 'Correction & Fix'],
    ['migration', 'Data Migration'],
    ['docs', 'Documentation'],
  ];
  for (const [type, label] of labels) {
    const step = { step_number: 1, prompt_type: type, title: 'T', purpose: 'p', expected_outcome: 'o' };
    const workflow = { id: 'w', name: 'n', component: 'c' };
    const text = buildPromptFromStep(step, workflow, 0, 1);
    assert(text.includes(`Type: ${label}`), `${type} → ${label}`);
  }
}

// No constraint block → no injected section
console.log('\n── buildPromptFromStep: no constraint block ──────────────');

{
  const step = { step_number: 1, prompt_type: 'plan', title: 'T', purpose: 'p', expected_outcome: 'o' };
  const workflow = { id: 'w', name: 'n', component: 'c' };
  const withBlock = buildPromptFromStep(step, workflow, 0, 1, 'BLOCK TEXT');
  const noBlock = buildPromptFromStep(step, workflow, 0, 1, undefined);
  const emptyBlock = buildPromptFromStep(step, workflow, 0, 1, '');
  assert(withBlock.includes('BLOCK TEXT'), 'block text inserted');
  assert(!noBlock.includes('BLOCK TEXT'), 'no block when undefined');
  // Empty string is falsy → no injection section
  const diff = noBlock.length - emptyBlock.length;
  assertEq(diff, 0, 'empty string === undefined (falsy)');
}

// ============================================================================
// previewGeneration
// ============================================================================
console.log('\n── previewGeneration: not found ──────────────────────────');

resetState();
resetInjection();
workflowRows = [];
{
  let caught: Error | null = null;
  try {
    await previewGeneration('missing');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught !== null && /not found/i.test(caught.message), 'message says not found');
}

console.log('\n── previewGeneration: no steps ───────────────────────────');

resetState();
resetInjection();
workflowRows = [{ id: 'wf-1', name: 'Empty', component: 'c', status: 'approved' }];
stepRows = [];
{
  let caught: Error | null = null;
  try {
    await previewGeneration('wf-1');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on no steps');
  assert(caught !== null && /no steps/i.test(caught.message), 'message says no steps');
}

console.log('\n── previewGeneration: happy path ─────────────────────────');

resetState();
resetInjection();
workflowRows = [{ id: 'wf-1', name: 'WF', component: 'WFComp', status: 'approved' }];
stepRows = [
  {
    id: 101, step_number: 1, prompt_type: 'plan', title: 'Plan',
    purpose: 'plan purpose', expected_outcome: 'planned', component: 'CompA',
  },
  {
    id: 102, step_number: 2, prompt_type: 'implementation', title: 'Implement',
    purpose: 'do it', expected_outcome: 'done', depends_on_step: 1,
  },
];
constraintBlocksByStep = {
  1: {
    text: 'STEP 1 BLOCK',
    constraints: [
      { title: 'No Fallback', severity: 'blocker', injection_reason: 'past incident' },
    ],
    recordAll: async (id) => { recordAllCalls.push(id); },
  },
  2: {
    text: 'STEP 2 BLOCK',
    constraints: [],
    recordAll: async (id) => { recordAllCalls.push(id); },
  },
};
{
  const previews = await previewGeneration('wf-1');
  assertEq(previews.length, 2, '2 previews');
  assertEq(previews[0].step_number, 1, 'step 1 first');
  assertEq(previews[0].component, 'CompA', 'step.component used');
  assertEq(previews[0].prompt_type, 'plan', 'prompt_type');
  assertEq(previews[0].injected_constraints.length, 1, 'step 1 has 1 constraint');
  assertEq(previews[0].injected_constraints[0].title, 'No Fallback', 'constraint title');
  assertEq(previews[0].injected_constraints[0].severity, 'blocker', 'severity');
  assertEq(previews[0].injected_constraints[0].reason, 'past incident', 'reason');
  assert(previews[0].prompt_text.includes('STEP 1 BLOCK'), 'step 1 text has block');
  assertEq(previews[1].component, 'WFComp', 'step 2 falls back to workflow.component');
  assertEq(previews[1].depends_on_step, 1, 'depends_on_step preserved');
  assertEq(previews[1].injected_constraints.length, 0, 'step 2 no constraints');
  assert(previews[1].prompt_text.includes('STEP 2 BLOCK'), 'step 2 text has block');
  // Pool query side: workflow load + step load
  const wfQueries = poolCalls.filter(c => /FROM prompt_workflows/i.test(c.sql));
  const stepQueries = poolCalls.filter(c => /FROM prompt_workflow_steps/i.test(c.sql));
  assertEq(wfQueries.length, 1, '1 workflow query');
  assertEq(stepQueries.length, 1, '1 steps query');
  // No DB writes in preview
  assertEq(connCalls.length, 0, 'no transaction queries');
}

// ============================================================================
// generatePrompts: error paths
// ============================================================================
console.log('\n── generatePrompts: not found ────────────────────────────');

resetState();
resetInjection();
resetUuid();
workflowRows = [];
{
  let caught: Error | null = null;
  try { await generatePrompts('missing', 'alice'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on missing workflow');
  assert(caught !== null && /not found/i.test(caught.message), 'not found message');
}

console.log('\n── generatePrompts: not approved ─────────────────────────');

resetState();
resetInjection();
resetUuid();
workflowRows = [{ id: 'wf-1', name: 'WF', component: 'c', status: 'draft', prompts_generated: 0 }];
{
  let caught: Error | null = null;
  try { await generatePrompts('wf-1', 'alice'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when not approved');
  assert(caught !== null && /draft/i.test(caught.message), 'mentions current status');
  assert(caught !== null && /approved/i.test(caught.message), 'mentions required status');
}

console.log('\n── generatePrompts: idempotent ───────────────────────────');

resetState();
resetInjection();
resetUuid();
workflowRows = [{
  id: 'wf-1', name: 'WF', component: 'c', status: 'approved', prompts_generated: 1,
}];
existingPromptsRows = [
  { id: 'p1', step_number: 1, title: 'Plan' },
  { id: 'p2', step_number: 2, title: 'Implement' },
];
{
  const result = await generatePrompts('wf-1', 'alice');
  assertEq(result.already_existed, true, 'already_existed true');
  assertEq(result.injections_count, 0, '0 new injections');
  assertEq(result.prompts.length, 2, 'returns 2 existing prompts');
  assertEq(result.prompts[0].id, 'p1', 'existing p1');
  // Verify uses JOIN query (not the step-load query)
  const joinQ = poolCalls.find(c => /JOIN prompt_workflow_steps/i.test(c.sql));
  assert(joinQ !== undefined, 'JOIN query executed');
  // No connection obtained
  assertEq(beginTxCount, 0, 'no transaction');
  assertEq(connCalls.length, 0, 'no connection queries');
}

console.log('\n── generatePrompts: no steps ─────────────────────────────');

resetState();
resetInjection();
resetUuid();
workflowRows = [{
  id: 'wf-1', name: 'WF', component: 'c', status: 'approved', prompts_generated: 0,
}];
stepRows = [];
{
  let caught: Error | null = null;
  try { await generatePrompts('wf-1', 'alice'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on no steps');
  assert(caught !== null && /no steps/i.test(caught.message), 'message says no steps');
}

// ============================================================================
// generatePrompts: happy path
// ============================================================================
console.log('\n── generatePrompts: happy path ───────────────────────────');

resetState();
resetInjection();
resetUuid();
workflowRows = [{
  id: 'wf-1', name: 'My Workflow', component: 'WFComp', status: 'approved', prompts_generated: 0,
}];
stepRows = [
  {
    id: 10, step_number: 1, prompt_type: 'plan', title: 'Plan',
    purpose: 'plan it', expected_outcome: 'planned', component: 'StepA',
  },
  {
    id: 11, step_number: 2, prompt_type: 'implementation', title: 'Build',
    purpose: 'build it', expected_outcome: 'built',
  },
  {
    id: 12, step_number: 3, prompt_type: 'verification', title: 'Verify',
    purpose: 'verify it', expected_outcome: 'verified', depends_on_step: 1,
  },
];
constraintBlocksByStep = {
  1: {
    text: 'C1',
    constraints: [
      { title: 'CA', severity: 'blocker', injection_reason: 'r1' },
      { title: 'CB', severity: 'high', injection_reason: 'r2' },
    ],
    recordAll: async (id) => { recordAllCalls.push(`1:${id}`); },
  },
  2: {
    text: '',
    constraints: [],
    recordAll: async (id) => { recordAllCalls.push(`2:${id}`); },
  },
  3: {
    text: 'C3',
    constraints: [
      { title: 'CC', severity: 'medium', injection_reason: 'r3' },
    ],
    recordAll: async (id) => { recordAllCalls.push(`3:${id}`); },
  },
};
quiet();
{
  const result = await generatePrompts('wf-1', 'alice');
  loud();
  assertEq(result.already_existed, false, 'new generation');
  assertEq(result.prompts.length, 3, '3 prompts returned');
  assertEq(result.injections_count, 3, '3 total injections (2+0+1)');

  // Transaction lifecycle
  assertEq(beginTxCount, 1, 'beginTransaction called');
  assertEq(commitCount, 1, 'commit called');
  assertEq(rollbackCount, 0, 'no rollback');
  assertEq(releaseCount, 1, 'connection released');

  // One INSERT per step + one step-link UPDATE per step + one workflow UPDATE
  const inserts = connCalls.filter(c => /^INSERT INTO om_prompt_registry/i.test(c.sql));
  const stepUpdates = connCalls.filter(c => /^UPDATE prompt_workflow_steps SET prompt_id/i.test(c.sql));
  const wfUpdates = connCalls.filter(c => /^UPDATE prompt_workflows SET prompts_generated = 1/i.test(c.sql));
  assertEq(inserts.length, 3, '3 INSERTs');
  assertEq(stepUpdates.length, 3, '3 step-link UPDATEs');
  assertEq(wfUpdates.length, 1, '1 workflow UPDATE');

  // Prompt ids are uuid-1/2/3 in step order
  assertEq(result.prompts[0].id, 'uuid-1', 'step 1 → uuid-1');
  assertEq(result.prompts[1].id, 'uuid-2', 'step 2 → uuid-2');
  assertEq(result.prompts[2].id, 'uuid-3', 'step 3 → uuid-3');

  // Dependency type determination
  assertEq(result.prompts[0].dependency_type, 'none', 'step 1: none');
  assertEq(result.prompts[0].depends_on_prompt_id, null, 'step 1: null');
  assertEq(result.prompts[1].dependency_type, 'sequence', 'step 2: sequence');
  assertEq(result.prompts[1].depends_on_prompt_id, 'uuid-1', 'step 2: uuid-1');
  assertEq(result.prompts[2].dependency_type, 'explicit', 'step 3: explicit (depends_on_step=1)');
  assertEq(result.prompts[2].depends_on_prompt_id, 'uuid-1', 'step 3: explicit → uuid-1');

  // constraints_injected per prompt
  assertEq(result.prompts[0].constraints_injected, 2, 'step 1 had 2 constraints');
  assertEq(result.prompts[1].constraints_injected, 0, 'step 2 had 0');
  assertEq(result.prompts[2].constraints_injected, 1, 'step 3 had 1');

  // INSERT param verification for step 1
  const i0 = inserts[0];
  assertEq(i0.params[0], 'uuid-1', 'INSERT[0].id = uuid-1');
  assertEq(i0.params[1], 'alice', 'INSERT[0].created_by = actor');
  assertEq(i0.params[2], 'Plan', 'INSERT[0].title');
  assertEq(i0.params[3], 'plan it', 'INSERT[0].purpose');
  assertEq(i0.params[4], 'StepA', 'INSERT[0].component (step override)');
  assertEq(i0.params[5], 1, 'INSERT[0].sequence_order = step_number');
  assert(typeof i0.params[6] === 'string' && i0.params[6].length > 200, 'INSERT[0].prompt_text is long string');
  assert(i0.params[6].includes('C1'), 'INSERT[0] prompt_text has constraint block');
  assertEq(i0.params[7], 'wf-1', 'INSERT[0].workflow_id');
  assertEq(i0.params[8], 1, 'INSERT[0].workflow_step_number');
  assertEq(i0.params[9], 'none', 'INSERT[0].dependency_type');
  assertEq(i0.params[10], null, 'INSERT[0].depends_on_prompt_id');

  // INSERT param for step 2 (sequence)
  const i1 = inserts[1];
  assertEq(i1.params[0], 'uuid-2', 'INSERT[1].id');
  assertEq(i1.params[4], 'WFComp', 'INSERT[1].component (workflow fallback)');
  assertEq(i1.params[9], 'sequence', 'INSERT[1].dependency_type');
  assertEq(i1.params[10], 'uuid-1', 'INSERT[1].depends_on_prompt_id');

  // INSERT param for step 3 (explicit)
  const i2 = inserts[2];
  assertEq(i2.params[0], 'uuid-3', 'INSERT[2].id');
  assertEq(i2.params[9], 'explicit', 'INSERT[2].dependency_type');
  assertEq(i2.params[10], 'uuid-1', 'INSERT[2].depends_on_prompt_id');

  // Step-link UPDATEs
  assertEq(stepUpdates[0].params, ['uuid-1', 10], 'step link 1');
  assertEq(stepUpdates[1].params, ['uuid-2', 11], 'step link 2');
  assertEq(stepUpdates[2].params, ['uuid-3', 12], 'step link 3');

  // Workflow UPDATE
  assertEq(wfUpdates[0].params, ['wf-1'], 'workflow update param');

  // recordAll called for each step post-commit
  assertEq(recordAllCalls.length, 3, 'recordAll called 3 times');
  assertEq(recordAllCalls[0], '1:uuid-1', 'step 1 recordAll');
  assertEq(recordAllCalls[1], '2:uuid-2', 'step 2 recordAll');
  assertEq(recordAllCalls[2], '3:uuid-3', 'step 3 recordAll');

  // logAction: system_logs INSERT on pool (outside tx)
  const logInsert = poolCalls.find(c => /INSERT INTO system_logs/i.test(c.sql));
  assert(logInsert !== undefined, 'logAction writes to system_logs');
  if (logInsert) {
    assert(logInsert.params[0].includes('PROMPTS_GENERATED'), 'log message has action');
    assert(logInsert.params[0].includes('wf-1'), 'log message has workflow id');
    const meta = JSON.parse(logInsert.params[1]);
    assertEq(meta.prompt_count, 3, 'meta.prompt_count');
    assertEq(meta.constraints_injected, 3, 'meta.constraints_injected');
    assertEq(meta.prompt_ids, ['uuid-1', 'uuid-2', 'uuid-3'], 'meta.prompt_ids');
    assertEq(logInsert.params[2], 'alice', 'log actor');
  }
}

// ============================================================================
// generatePrompts: recordAll failure is non-fatal
// ============================================================================
console.log('\n── generatePrompts: recordAll error swallowed ────────────');

resetState();
resetInjection();
resetUuid();
workflowRows = [{
  id: 'wf-1', name: 'WF', component: 'c', status: 'approved', prompts_generated: 0,
}];
stepRows = [
  { id: 1, step_number: 1, prompt_type: 'plan', title: 'T', purpose: 'p', expected_outcome: 'o' },
];
constraintBlocksByStep = {
  1: {
    text: '', constraints: [],
    recordAll: async () => { throw new Error('record fail'); },
  },
};
quiet();
{
  const result = await generatePrompts('wf-1', 'alice');
  loud();
  assertEq(result.already_existed, false, 'still succeeded');
  assertEq(result.prompts.length, 1, '1 prompt created');
  assertEq(commitCount, 1, 'still committed');
  assertEq(rollbackCount, 0, 'no rollback');
  assertEq(releaseCount, 1, 'released');
}

// ============================================================================
// generatePrompts: INSERT failure → rollback
// ============================================================================
console.log('\n── generatePrompts: rollback on INSERT failure ───────────');

resetState();
resetInjection();
resetUuid();
workflowRows = [{
  id: 'wf-1', name: 'WF', component: 'c', status: 'approved', prompts_generated: 0,
}];
stepRows = [
  { id: 1, step_number: 1, prompt_type: 'plan', title: 'T', purpose: 'p', expected_outcome: 'o' },
];
connQueryThrowsOnPattern = /INSERT INTO om_prompt_registry/i;
quiet();
{
  let caught: Error | null = null;
  try {
    await generatePrompts('wf-1', 'alice');
  } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws');
  assert(caught !== null && /rolled back/i.test(caught.message), 'message mentions rolled back');
  assertEq(beginTxCount, 1, 'transaction began');
  assertEq(commitCount, 0, 'no commit');
  assertEq(rollbackCount, 1, 'rollback called');
  assertEq(releaseCount, 1, 'release called in finally');

  // generation_error UPDATE on pool
  const errUpdate = poolCalls.find(
    c => /UPDATE prompt_workflows SET generation_error/i.test(c.sql)
  );
  assert(errUpdate !== undefined, 'generation_error UPDATE on pool');
  if (errUpdate) {
    assert(typeof errUpdate.params[0] === 'string', 'error message string param');
    assertEq(errUpdate.params[1], 'wf-1', 'workflow id param');
  }
}

// ============================================================================
// generatePrompts: commit failure → rollback + generation_error
// ============================================================================
console.log('\n── generatePrompts: rollback on UPDATE workflow failure ──');

resetState();
resetInjection();
resetUuid();
workflowRows = [{
  id: 'wf-1', name: 'WF', component: 'c', status: 'approved', prompts_generated: 0,
}];
stepRows = [
  { id: 1, step_number: 1, prompt_type: 'plan', title: 'T', purpose: 'p', expected_outcome: 'o' },
];
connQueryThrowsOnPattern = /UPDATE prompt_workflows SET prompts_generated/i;
quiet();
{
  let caught: Error | null = null;
  try {
    await generatePrompts('wf-1', 'alice');
  } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws');
  assertEq(rollbackCount, 1, 'rolled back');
  assertEq(commitCount, 0, 'not committed');
  assertEq(releaseCount, 1, 'released');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
