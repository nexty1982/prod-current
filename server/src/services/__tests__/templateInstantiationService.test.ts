#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateInstantiationService.js (OMD-1219)
 *
 * Dependencies:
 *   - `./workflowTemplateService`  → getTemplateById, getVersionSnapshot
 *   - `./workflowService`          → createWorkflow
 *   - `../config/db`               → getAppPool (for post-create tagging)
 *
 * Strategy: stub all three via require.cache BEFORE requiring the SUT.
 * Fake template/workflow service provide scriptable responses per test.
 *
 * Coverage:
 *   - injectParams: basic + preserves unknown + special chars + non-string
 *   - injectStepParams: 5 fields get injected, others passthrough
 *   - validateParams:
 *       · empty template params → valid
 *       · required missing → error
 *       · required with default → resolved from default
 *       · non-required missing → skipped
 *       · type number: valid + NaN error
 *       · type boolean: true / false / string "true"
 *       · type enum: valid + invalid value error
 *       · type string (default) → coerces to String
 *   - previewInstantiation:
 *       · template not found → throws
 *       · validation failure → throws with errors joined
 *       · happy path: returns workflow + steps + parameters_used
 *       · unresolved placeholder detected in warnings
 *       · version snapshot path
 *   - instantiate:
 *       · unresolved warnings → throws
 *       · happy path: createWorkflow + 2 tagging queries + returned shape
 *
 * Run: npx tsx server/src/services/__tests__/templateInstantiationService.test.ts
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

// ── Fake workflowTemplateService ────────────────────────────────────
let templateById: any = null;
let versionSnapshot: any = null;
const templateSvcCalls: any[] = [];

const fakeTemplateService = {
  getTemplateById: async (id: any) => {
    templateSvcCalls.push({ method: 'getTemplateById', id });
    return templateById;
  },
  getVersionSnapshot: async (id: any, ver: any) => {
    templateSvcCalls.push({ method: 'getVersionSnapshot', id, ver });
    return versionSnapshot;
  },
};

const tmplSvcPath = require.resolve('../workflowTemplateService');
require.cache[tmplSvcPath] = {
  id: tmplSvcPath,
  filename: tmplSvcPath,
  loaded: true,
  exports: fakeTemplateService,
} as any;

// ── Fake workflowService ────────────────────────────────────────────
const createWorkflowCalls: any[] = [];
let createWorkflowReturn: any = { id: 7777 };

const fakeWorkflowService = {
  createWorkflow: async (def: any, actor: any) => {
    createWorkflowCalls.push({ def, actor });
    return createWorkflowReturn;
  },
};

const wfSvcPath = require.resolve('../workflowService');
require.cache[wfSvcPath] = {
  id: wfSvcPath,
  filename: wfSvcPath,
  loaded: true,
  exports: fakeWorkflowService,
} as any;

// ── Fake pool ───────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const poolCalls: QueryCall[] = [];
const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    poolCalls.push({ sql, params });
    return [{ affectedRows: 1 }, []];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

function resetState() {
  templateById = null;
  versionSnapshot = null;
  templateSvcCalls.length = 0;
  createWorkflowCalls.length = 0;
  createWorkflowReturn = { id: 7777 };
  poolCalls.length = 0;
}

// ── Load SUT ────────────────────────────────────────────────────────
const {
  injectParams,
  injectStepParams,
  validateParams,
  previewInstantiation,
  instantiate,
} = require('../templateInstantiationService');

async function main() {

// ============================================================================
// injectParams
// ============================================================================
console.log('\n── injectParams ──────────────────────────────────────────');

assertEq(injectParams('Hello {{name}}', { name: 'World' }), 'Hello World', 'basic replace');
assertEq(injectParams('{{a}} and {{b}}', { a: 'X', b: 'Y' }), 'X and Y', 'multiple placeholders');
assertEq(
  injectParams('Hello {{missing}}', { other: 'x' }),
  'Hello {{missing}}',
  'unknown placeholder preserved',
);

// Special chars in values (dollars in replacement) should be literal
assertEq(
  injectParams('amount: {{val}}', { val: '$100 $& $1' }),
  'amount: $100 $& $1',
  'dollar chars in value treated literally',
);

// Non-string values coerced
assertEq(injectParams('n={{n}}', { n: 42 }), 'n=42', 'number coerced');
assertEq(injectParams('b={{b}}', { b: true }), 'b=true', 'boolean coerced');

// Non-string input / null params → passthrough
assertEq(injectParams(null, { x: 1 }), null, 'null input passthrough');
assertEq(injectParams(undefined, { x: 1 }), undefined, 'undefined input passthrough');
assertEq(injectParams('text', null as any), 'text', 'null params returns text');
assertEq(injectParams('text', undefined as any), 'text', 'undefined params returns text');

// ============================================================================
// injectStepParams
// ============================================================================
console.log('\n── injectStepParams ──────────────────────────────────────');

{
  const step = {
    step_number: 1,
    title: 'Do {{action}}',
    purpose: 'For {{reason}}',
    component: '{{component}}',
    expected_outcome: '{{outcome}} expected',
    requirements_summary: 'Req: {{req}}',
    prompt_type: 'code',
    depends_on_step: null,
  };
  const injected = injectStepParams(step, {
    action: 'build',
    reason: 'tests',
    component: 'api',
    outcome: 'pass',
    req: 'jest',
  });
  assertEq(injected.title, 'Do build', 'title injected');
  assertEq(injected.purpose, 'For tests', 'purpose injected');
  assertEq(injected.component, 'api', 'component injected');
  assertEq(injected.expected_outcome, 'pass expected', 'expected_outcome injected');
  assertEq(injected.requirements_summary, 'Req: jest', 'requirements_summary injected');
  assertEq(injected.step_number, 1, 'step_number passthrough');
  assertEq(injected.prompt_type, 'code', 'prompt_type passthrough');
}

// ============================================================================
// validateParams
// ============================================================================
console.log('\n── validateParams: empty template params ─────────────────');

{
  const r = validateParams(null, { a: 1 });
  assertEq(r.valid, true, 'null template params: valid');
  assertEq(r.errors, [], 'no errors');
  assertEq(r.resolved_params, { a: 1 }, 'passes provided through');
}

{
  const r = validateParams([], {});
  assertEq(r.valid, true, 'empty template params: valid');
}

console.log('\n── validateParams: required missing ──────────────────────');

{
  const r = validateParams([{ name: 'n', label: 'Name', required: true }], {});
  assertEq(r.valid, false, 'invalid');
  assertEq(r.errors.length, 1, '1 error');
  assert(/Name/.test(r.errors[0]), 'error mentions label');
}

{
  // Empty string treated as missing
  const r = validateParams([{ name: 'n', required: true }], { n: '' });
  assertEq(r.valid, false, 'empty string → missing');
}

console.log('\n── validateParams: required with default ─────────────────');

{
  const r = validateParams(
    [{ name: 'n', required: true, default_value: 'fallback' }],
    {},
  );
  assertEq(r.valid, true, 'valid with default');
  assertEq(r.resolved_params, { n: 'fallback' }, 'default used');
}

console.log('\n── validateParams: non-required missing skipped ──────────');

{
  const r = validateParams(
    [{ name: 'n', required: false }],
    {},
  );
  assertEq(r.valid, true, 'valid');
  assertEq(r.resolved_params, {}, 'nothing resolved');
}

{
  const r = validateParams(
    [{ name: 'n', required: false, default_value: 'opt-default' }],
    {},
  );
  assertEq(r.resolved_params, { n: 'opt-default' }, 'optional default applied');
}

console.log('\n── validateParams: type coercion ─────────────────────────');

// number — valid
{
  const r = validateParams([{ name: 'n', type: 'number' }], { n: '42' });
  assertEq(r.valid, true, 'number string valid');
  assertEq(r.resolved_params.n, 42, 'coerced to number');
}

// number — NaN error
{
  const r = validateParams([{ name: 'n', type: 'number' }], { n: 'abc' });
  assertEq(r.valid, false, 'non-numeric string invalid');
  assert(/must be a number/.test(r.errors[0]), 'error message');
}

// boolean — true
{
  const r = validateParams([{ name: 'b', type: 'boolean' }], { b: true });
  assertEq(r.resolved_params.b, true, 'true passed');
}

// boolean — string "true"
{
  const r = validateParams([{ name: 'b', type: 'boolean' }], { b: 'true' });
  assertEq(r.resolved_params.b, true, '"true" → true');
}

// boolean — anything else → false
{
  const r = validateParams([{ name: 'b', type: 'boolean' }], { b: 'false' });
  assertEq(r.resolved_params.b, false, '"false" → false');
}

// enum — valid
{
  const r = validateParams(
    [{ name: 'mode', type: 'enum', options: ['a', 'b', 'c'] }],
    { mode: 'b' },
  );
  assertEq(r.valid, true, 'enum valid');
  assertEq(r.resolved_params.mode, 'b', 'enum value used');
}

// enum — invalid
{
  const r = validateParams(
    [{ name: 'mode', type: 'enum', options: ['a', 'b'] }],
    { mode: 'z' },
  );
  assertEq(r.valid, false, 'enum invalid');
  assert(/must be one of/.test(r.errors[0]), 'error message');
}

// default type string (fallback)
{
  const r = validateParams([{ name: 's' }], { s: 42 });
  assertEq(r.resolved_params.s, '42', 'fallback coerces to String');
}

// ============================================================================
// previewInstantiation
// ============================================================================
console.log('\n── previewInstantiation: template not found ──────────────');

resetState();
templateById = null;
{
  let caught: Error | null = null;
  try { await previewInstantiation(1, {}); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /Template not found/.test(caught.message), 'throws when not found');
}

console.log('\n── previewInstantiation: validation failure ──────────────');

resetState();
templateById = {
  id: 1,
  name: 'Test',
  parameters: [{ name: 'n', label: 'N', required: true }],
  steps: [],
};
{
  let caught: Error | null = null;
  try { await previewInstantiation(1, {}); }
  catch (e: any) { caught = e; }
  assert(
    caught !== null && /Parameter validation failed/.test(caught.message),
    'throws with validation errors',
  );
}

console.log('\n── previewInstantiation: happy path ──────────────────────');

resetState();
templateById = {
  id: 1,
  name: 'Build {{component}}',
  description: 'Implements {{component}} component',
  category: 'backend',
  release_mode: 'manual',
  parameters: [
    { name: 'component', required: true },
  ],
  steps: [
    {
      step_number: 1,
      title: 'Design {{component}}',
      purpose: 'Plan {{component}} structure',
      component: '{{component}}',
      expected_outcome: 'Design doc for {{component}}',
      requirements_summary: 'Requirements for {{component}}',
      prompt_type: 'architecture',
    },
    {
      step_number: 2,
      title: 'Build {{component}}',
      purpose: 'Implement {{component}}',
      component: '{{component}}',
      expected_outcome: 'Working {{component}}',
      requirements_summary: 'Feature spec',
      prompt_type: 'code',
    },
  ],
};

{
  const preview = await previewInstantiation(1, { component: 'auth' });
  assertEq(preview.workflow.name, 'Build auth', 'workflow.name injected');
  assertEq(preview.workflow.description, 'Implements auth component', 'workflow.description injected');
  assertEq(preview.workflow.component, 'auth', 'workflow.component from steps[0]');
  assertEq(preview.steps.length, 2, 'both steps returned');
  assertEq(preview.steps[0].title, 'Design auth', 'step 1 title injected');
  assertEq(preview.steps[1].title, 'Build auth', 'step 2 title injected');
  assertEq(preview.parameters_used, { component: 'auth' }, 'parameters_used');
  assertEq(preview.template.id, 1, 'template.id');
  assertEq(preview.template.name, 'Build {{component}}', 'template.name raw');
  assertEq(preview.template_release_mode, 'manual', 'release_mode passthrough');
  assertEq(preview.unresolved_warnings, [], 'no unresolved warnings');
}

// workflow.component falls back to template.category when no steps
console.log('\n── previewInstantiation: component fallback ──────────────');

resetState();
templateById = {
  id: 2,
  name: 'Empty',
  category: '{{cat}}',
  parameters: [{ name: 'cat', required: true }],
  steps: [],
};
{
  const preview = await previewInstantiation(2, { cat: 'frontend' });
  assertEq(
    preview.workflow.component,
    'frontend',
    'falls back to category when no steps',
  );
}

console.log('\n── previewInstantiation: unresolved placeholder warning ──');

resetState();
templateById = {
  id: 3,
  name: 'Test',
  parameters: [],
  steps: [
    {
      step_number: 1,
      title: 'has {{ghost}} placeholder',
      purpose: 'ok',
      component: 'x',
      expected_outcome: '',
      requirements_summary: '',
    },
  ],
};
{
  const preview = await previewInstantiation(3, {});
  assert(preview.unresolved_warnings.length > 0, 'warning raised');
  assert(/ghost/.test(preview.unresolved_warnings[0]), 'warning mentions placeholder name');
  assert(/Step 1 title/.test(preview.unresolved_warnings[0]), 'warning mentions field');
}

console.log('\n── previewInstantiation: version snapshot path ───────────');

resetState();
templateById = null;
versionSnapshot = {
  snapshot: {
    name: 'Snapshot v2',
    category: 'ops',
    parameters: [],
    steps: [],
  },
};
{
  const preview = await previewInstantiation(5, {}, 2);
  assertEq(preview.workflow.name, 'Snapshot v2', 'uses snapshot name');
  assertEq(preview.template.version, 2, 'template.version from param');
  assertEq(preview.template.id, 5, 'template.id from param');
  // getVersionSnapshot should have been called
  const call = templateSvcCalls.find(c => c.method === 'getVersionSnapshot');
  assert(call !== undefined, 'getVersionSnapshot called');
  assertEq(call.id, 5, 'snapshot called with templateId');
  assertEq(call.ver, 2, 'snapshot called with version');
}

// version snapshot not found → throws
resetState();
versionSnapshot = null;
{
  let caught: Error | null = null;
  try { await previewInstantiation(5, {}, 99); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /version 99 not found/.test(caught.message), 'snapshot not found throws');
}

// ============================================================================
// instantiate
// ============================================================================
console.log('\n── instantiate: unresolved warnings → throws ─────────────');

resetState();
templateById = {
  id: 1,
  name: 'T',
  parameters: [],
  steps: [
    { step_number: 1, title: '{{missing}}', component: 'x' },
  ],
};
{
  let caught: Error | null = null;
  try { await instantiate(1, {}, 'actor'); }
  catch (e: any) { caught = e; }
  assert(
    caught !== null && /Unresolved template parameters/.test(caught.message),
    'throws on unresolved warnings',
  );
  assertEq(createWorkflowCalls.length, 0, 'createWorkflow not called');
}

console.log('\n── instantiate: happy path ───────────────────────────────');

resetState();
templateById = {
  id: 10,
  name: 'Do {{thing}}',
  description: 'For {{thing}}',
  category: 'misc',
  release_mode: 'auto',
  parameters: [{ name: 'thing', required: true }],
  steps: [
    {
      step_number: 1,
      title: 'Plan {{thing}}',
      purpose: 'Plan',
      component: 'planner',
      prompt_type: 'plan',
      expected_outcome: 'Plan done',
      requirements_summary: '',
      depends_on_step: null,
    },
  ],
};
createWorkflowReturn = { id: 42, name: 'Do cleanup' };

{
  const result = await instantiate(10, { thing: 'cleanup' }, 'nick@example.com');

  assertEq(createWorkflowCalls.length, 1, 'createWorkflow called once');
  const [call] = createWorkflowCalls;
  assertEq(call.actor, 'nick@example.com', 'actor forwarded');
  assertEq(call.def.name, 'Do cleanup', 'workflow name injected');
  assertEq(call.def.description, 'For cleanup', 'workflow description injected');
  assertEq(call.def.release_mode, 'auto', 'release_mode passthrough');
  assertEq(call.def.steps.length, 1, 'steps mapped');
  assertEq(call.def.steps[0].title, 'Plan cleanup', 'step title injected');

  // Post-create tagging: 2 pool queries
  assertEq(poolCalls.length, 2, '2 tagging queries');
  assert(/UPDATE prompt_workflows SET template_id/.test(poolCalls[0].sql), '1st: prompt_workflows tag');
  assertEq(poolCalls[0].params, [10, 1, 42], 'tag params [templateId, version=1, workflow.id]');
  assert(/UPDATE workflow_templates SET usage_count/.test(poolCalls[1].sql), '2nd: usage_count bump');
  assertEq(poolCalls[1].params, [10], 'usage_count: [templateId]');

  assertEq(result.workflow, createWorkflowReturn, 'returns workflow');
  assertEq(result.parameters_used, { thing: 'cleanup' }, 'parameters_used returned');
  assertEq(result.template.id, 10, 'template.id');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
