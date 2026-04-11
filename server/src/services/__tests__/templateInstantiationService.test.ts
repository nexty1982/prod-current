#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateInstantiationService.js (OMD-1023)
 *
 * Takes a template + parameters and generates a real workflow via
 * workflowService.createWorkflow. Covers:
 *
 *   - injectParams            placeholder replacement, $ literal safety,
 *                             hasOwnProperty guard, non-string passthrough
 *   - injectStepParams        all 5 text fields injected; others preserved
 *   - validateParams          required/optional, defaults, type coercion
 *                             (number/boolean/enum), multi-error aggregation
 *   - previewInstantiation    not found, validation failure, happy path,
 *                             version snapshot, unresolved warnings
 *   - instantiate             happy path (createWorkflow + 2 UPDATEs),
 *                             blocked on unresolved warnings
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

// ── Stubs ─────────────────────────────────────────────────────────────────

type Call = { method: string; args: any[] };
const calls: Call[] = [];

let getTemplateByIdReturn: any = null;
let getVersionSnapshotReturn: any = null;
let createWorkflowReturn: any = { id: 500 };
let createWorkflowThrows: Error | null = null;

const workflowTemplateServiceStub = {
  getTemplateById: async (...args: any[]) => {
    calls.push({ method: 'getTemplateById', args });
    return getTemplateByIdReturn;
  },
  getVersionSnapshot: async (...args: any[]) => {
    calls.push({ method: 'getVersionSnapshot', args });
    return getVersionSnapshotReturn;
  },
};

const workflowServiceStub = {
  createWorkflow: async (...args: any[]) => {
    calls.push({ method: 'createWorkflow', args });
    if (createWorkflowThrows) throw createWorkflowThrows;
    return createWorkflowReturn;
  },
};

type DbCall = { sql: string; params: any[] };
const dbCalls: DbCall[] = [];
const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    dbCalls.push({ sql, params });
    return [{ affectedRows: 1 }];
  },
};
const dbStub = { getAppPool: () => fakePool };

// Install stubs BEFORE requiring SUT
const tmplPath = require.resolve('../workflowTemplateService');
require.cache[tmplPath] = {
  id: tmplPath, filename: tmplPath, loaded: true,
  exports: workflowTemplateServiceStub,
} as any;

const wfPath = require.resolve('../workflowService');
require.cache[wfPath] = {
  id: wfPath, filename: wfPath, loaded: true,
  exports: workflowServiceStub,
} as any;

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: dbStub,
} as any;

function resetState() {
  calls.length = 0;
  dbCalls.length = 0;
  getTemplateByIdReturn = null;
  getVersionSnapshotReturn = null;
  createWorkflowReturn = { id: 500 };
  createWorkflowThrows = null;
}

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
assertEq(injectParams('Count: {{n}}', { n: 42 }), 'Count: 42', 'number coerced to string');
assertEq(injectParams('{{a}}-{{b}}', { a: 'x', b: 'y' }), 'x-y', 'two placeholders');
assertEq(injectParams('{{x}} {{x}} {{x}}', { x: 'go' }), 'go go go', 'repeated placeholders');
assertEq(injectParams('Hi {{unknown}}', { name: 'X' }), 'Hi {{unknown}}', 'unresolved left as-is');
assertEq(injectParams('Half {{a}}, missing {{b}}', { a: 'A' }), 'Half A, missing {{b}}', 'partial resolution');

// Non-string / null / undefined passthrough
assertEq(injectParams(null, { a: 'x' }), null, 'null passthrough');
assertEq(injectParams(undefined, { a: 'x' }), undefined, 'undefined passthrough');
assertEq(injectParams(42 as any, { a: 'x' }), 42, 'number passthrough');
assertEq(injectParams('hi', null), 'hi', 'null params → text unchanged');
assertEq(injectParams('{{a}}', 'bogus' as any), '{{a}}', 'non-object params → unchanged');

// $ literal safety (replacer function, not string replacement)
assertEq(injectParams('val={{x}}', { x: '$&bar' }), 'val=$&bar', '$& stays literal');
assertEq(injectParams('val={{x}}', { x: '$1' }), 'val=$1', '$1 stays literal');
assertEq(injectParams('val={{x}}', { x: '$$' }), 'val=$$', '$$ stays literal');

// hasOwnProperty guard — inherited props should NOT resolve
const proto = { inherited: 'SHOULD_NOT_APPEAR' };
const params = Object.create(proto);
params.direct = 'DIRECT';
assertEq(injectParams('{{direct}}', params), 'DIRECT', 'direct prop resolved');
assertEq(injectParams('{{inherited}}', params), '{{inherited}}', 'inherited prop blocked');
// toString from Object.prototype
assertEq(injectParams('{{toString}}', {}), '{{toString}}', 'Object.prototype.toString blocked');

// ============================================================================
// injectStepParams
// ============================================================================
console.log('\n── injectStepParams ──────────────────────────────────────');

{
  const step = {
    step_number: 1,
    title: 'Create {{feature}}',
    purpose: 'Build {{feature}} module',
    component: '{{path}}/index.ts',
    expected_outcome: '{{feature}} works',
    requirements_summary: 'Needs {{framework}}',
    prompt_type: 'code',
    depends_on_step: null,
    extra_field: 'untouched',
  };
  const resolved = injectStepParams(step, {
    feature: 'login',
    path: 'src/auth',
    framework: 'React',
  });
  assertEq(resolved.title, 'Create login', 'title injected');
  assertEq(resolved.purpose, 'Build login module', 'purpose injected');
  assertEq(resolved.component, 'src/auth/index.ts', 'component injected');
  assertEq(resolved.expected_outcome, 'login works', 'expected_outcome injected');
  assertEq(resolved.requirements_summary, 'Needs React', 'requirements_summary injected');
  assertEq(resolved.step_number, 1, 'step_number preserved');
  assertEq(resolved.prompt_type, 'code', 'prompt_type preserved');
  assertEq(resolved.depends_on_step, null, 'depends_on_step preserved');
  assertEq(resolved.extra_field, 'untouched', 'non-text fields passthrough');
}

// ============================================================================
// validateParams
// ============================================================================
console.log('\n── validateParams ────────────────────────────────────────');

// Null / empty template params
{
  const r = validateParams(null, { any: 'thing' });
  assertEq(r.valid, true, 'null templateParams → valid');
  assertEq(r.errors, [], 'no errors');
  assertEq(r.resolved_params, { any: 'thing' }, 'provided params passed through');
}

{
  const r = validateParams([], {});
  assertEq(r.valid, true, 'empty templateParams → valid');
  assertEq(r.resolved_params, {}, 'empty resolved');
}

// Required missing → error
{
  const r = validateParams([{ name: 'foo', required: true, label: 'Foo Param' }], {});
  assertEq(r.valid, false, 'required missing → invalid');
  assertEq(r.errors.length, 1, '1 error');
  assert(r.errors[0].includes('Foo Param'), 'error uses label');
}

// Required missing, falls back to name when no label
{
  const r = validateParams([{ name: 'foo', required: true }], {});
  assertEq(r.valid, false, 'required missing → invalid');
  assert(r.errors[0].includes('foo'), 'error uses name when no label');
}

// Required with default_value → uses default
{
  const r = validateParams(
    [{ name: 'foo', required: true, default_value: 'bar' }],
    {}
  );
  assertEq(r.valid, true, 'default_value fills in');
  assertEq(r.resolved_params, { foo: 'bar' }, 'resolved to default');
}

// Optional missing → absent from resolved
{
  const r = validateParams([{ name: 'foo', required: false }], {});
  assertEq(r.valid, true, 'optional missing → valid');
  assertEq(r.resolved_params, {}, 'not in resolved');
}

// Optional with default → uses default
{
  const r = validateParams(
    [{ name: 'foo', required: false, default_value: 'defval' }],
    {}
  );
  assertEq(r.resolved_params, { foo: 'defval' }, 'optional default applied');
}

// Empty-string treated as missing
{
  const r = validateParams([{ name: 'foo', required: true }], { foo: '' });
  assertEq(r.valid, false, 'empty string → missing');
}

// Number type coercion
{
  const r = validateParams([{ name: 'n', type: 'number' }], { n: '42' });
  assertEq(r.valid, true, 'number string coerced');
  assertEq(r.resolved_params, { n: 42 }, 'coerced value');
}

{
  const r = validateParams([{ name: 'n', type: 'number' }], { n: 'not-a-num' });
  assertEq(r.valid, false, 'bad number → invalid');
  assert(r.errors[0].includes('must be a number'), 'error mentions number');
}

// Boolean type coercion
{
  const r = validateParams([{ name: 'b', type: 'boolean' }], { b: 'true' });
  assertEq(r.resolved_params, { b: true }, '"true" → true');
}

{
  const r = validateParams([{ name: 'b', type: 'boolean' }], { b: true });
  assertEq(r.resolved_params, { b: true }, 'true → true');
}

{
  const r = validateParams([{ name: 'b', type: 'boolean' }], { b: 'false' });
  assertEq(r.resolved_params, { b: false }, '"false" → false');
}

// Enum type
{
  const r = validateParams(
    [{ name: 'e', type: 'enum', options: ['a', 'b', 'c'] }],
    { e: 'b' }
  );
  assertEq(r.valid, true, 'valid enum');
  assertEq(r.resolved_params, { e: 'b' }, 'enum resolved');
}

{
  const r = validateParams(
    [{ name: 'e', type: 'enum', options: ['a', 'b'] }],
    { e: 'z' }
  );
  assertEq(r.valid, false, 'invalid enum');
  assert(r.errors[0].includes('one of'), 'error mentions options');
}

// String (default type)
{
  const r = validateParams([{ name: 'foo' }], { foo: 42 });
  assertEq(r.resolved_params, { foo: '42' }, 'default type coerces to string');
}

// Multi-error aggregation
{
  const r = validateParams(
    [
      { name: 'a', required: true, label: 'Alpha' },
      { name: 'b', required: true, label: 'Beta' },
      { name: 'n', type: 'number' },
    ],
    { n: 'bad' }
  );
  assertEq(r.valid, false, 'multi-error → invalid');
  assertEq(r.errors.length, 3, '3 errors');
}

// ============================================================================
// previewInstantiation
// ============================================================================
console.log('\n── previewInstantiation ──────────────────────────────────');

// Not found
resetState();
getTemplateByIdReturn = null;
{
  let caught: Error | null = null;
  try { await previewInstantiation(999, {}); } catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('not found'), 'error mentions not found');
}

// Validation failure
resetState();
getTemplateByIdReturn = {
  id: 1,
  name: 'T',
  parameters: [{ name: 'must_have', required: true, label: 'Must Have' }],
  steps: [],
};
{
  let caught: Error | null = null;
  try { await previewInstantiation(1, {}); } catch (e: any) { caught = e; }
  assert(caught !== null, 'validation failure throws');
  assert(
    caught !== null && caught.message.includes('Parameter validation failed'),
    'error mentions validation'
  );
}

// Happy path — 2 steps, all injected
resetState();
getTemplateByIdReturn = {
  id: 5,
  name: '{{feature}} Workflow',
  description: 'Workflow for {{feature}}',
  category: 'om-frontend',
  version: 3,
  release_mode: 'staged',
  parameters: [
    { name: 'feature', required: true },
    { name: 'owner', required: false, default_value: 'team' },
  ],
  steps: [
    {
      step_number: 1,
      title: 'Plan {{feature}}',
      purpose: 'Planning',
      component: '{{feature}}/index',
      expected_outcome: '{{feature}} plan',
      requirements_summary: 'By {{owner}}',
      prompt_type: 'planning',
      depends_on_step: null,
    },
    {
      step_number: 2,
      title: 'Build {{feature}}',
      purpose: 'Build it',
      component: null,
      expected_outcome: null,
      requirements_summary: null,
      prompt_type: 'code',
      depends_on_step: 1,
    },
  ],
};
{
  const preview = await previewInstantiation(5, { feature: 'search' });
  assertEq(preview.workflow.name, 'search Workflow', 'workflow name injected');
  assertEq(preview.workflow.description, 'Workflow for search', 'description injected');
  assertEq(preview.steps.length, 2, '2 steps');
  assertEq(preview.steps[0].title, 'Plan search', 'step 1 title');
  assertEq(preview.steps[0].component, 'search/index', 'step 1 component');
  assertEq(preview.steps[0].requirements_summary, 'By team', 'default applied');
  assertEq(preview.steps[1].title, 'Build search', 'step 2 title');
  assertEq(preview.parameters_used, { feature: 'search', owner: 'team' }, 'params used');
  assertEq(preview.template.id, 5, 'template id');
  assertEq(preview.template.version, 3, 'template version');
  assertEq(preview.template_release_mode, 'staged', 'release_mode propagated');
  assertEq(preview.unresolved_warnings, [], 'no warnings');
  // workflow.component falls back to first step's component (already injected)
  assertEq(preview.workflow.component, 'search/index', 'workflow.component from first step');
}

// Workflow component falls back to category when no steps
resetState();
getTemplateByIdReturn = {
  id: 6,
  name: 'No Steps',
  category: 'om-backend',
  parameters: [],
  steps: [],
};
{
  const preview = await previewInstantiation(6, {});
  assertEq(preview.workflow.component, 'om-backend', 'category fallback');
  assertEq(preview.steps.length, 0, '0 steps');
}

// Unresolved placeholder warnings
resetState();
getTemplateByIdReturn = {
  id: 7,
  name: 'T',
  parameters: [],
  steps: [
    {
      step_number: 1,
      title: 'Use {{something_missing}}',
      purpose: null,
      component: null,
      expected_outcome: 'Also {{other_missing}} here',
      requirements_summary: null,
    },
  ],
};
{
  const preview = await previewInstantiation(7, {});
  assertEq(preview.unresolved_warnings.length, 2, '2 unresolved warnings');
  assert(preview.unresolved_warnings[0].includes('something_missing'), 'title unresolved');
  assert(preview.unresolved_warnings[1].includes('other_missing'), 'expected_outcome unresolved');
}

// Version snapshot path
resetState();
getVersionSnapshotReturn = {
  snapshot: {
    name: 'Snapshot Name',
    description: 'desc',
    category: 'om-ocr',
    parameters: [],
    steps: [
      { step_number: 1, title: 'S1', purpose: 'P', component: 'C', expected_outcome: 'E', requirements_summary: 'R' },
    ],
  },
};
{
  const preview = await previewInstantiation(8, {}, 2);
  assertEq(preview.workflow.name, 'Snapshot Name', 'snapshot name used');
  assertEq(preview.template.version, 2, 'version from arg');
  assertEq(preview.template.id, 8, 'id from arg');
  // getVersionSnapshot called, not getTemplateById
  const snapCall = calls.find(c => c.method === 'getVersionSnapshot');
  assert(snapCall !== undefined, 'getVersionSnapshot called');
  assertEq(snapCall!.args, [8, 2], 'correct args');
  const byIdCall = calls.find(c => c.method === 'getTemplateById');
  assert(byIdCall === undefined, 'getTemplateById NOT called');
}

// Version not found
resetState();
getVersionSnapshotReturn = null;
{
  let caught: Error | null = null;
  try { await previewInstantiation(8, {}, 99); } catch (e: any) { caught = e; }
  assert(caught !== null, 'version not found throws');
  assert(
    caught !== null && caught.message.includes('version 99'),
    'error mentions version number'
  );
}

// ============================================================================
// instantiate
// ============================================================================
console.log('\n── instantiate ───────────────────────────────────────────');

// Happy path
resetState();
getTemplateByIdReturn = {
  id: 10,
  name: '{{feature}} flow',
  description: 'd',
  category: 'om-frontend',
  version: 4,
  release_mode: 'canary',
  parameters: [{ name: 'feature', required: true }],
  steps: [
    {
      step_number: 1,
      title: 'S1 for {{feature}}',
      purpose: 'p', component: 'c', expected_outcome: 'e',
      requirements_summary: 'r', prompt_type: 'code', depends_on_step: null,
    },
  ],
};
createWorkflowReturn = { id: 555, name: 'search flow' };
{
  const result = await instantiate(10, { feature: 'search' }, { user: 'alice' });

  // createWorkflow called
  const cw = calls.find(c => c.method === 'createWorkflow');
  assert(cw !== undefined, 'createWorkflow called');
  assertEq(cw!.args[0].name, 'search flow', 'workflow name');
  assertEq(cw!.args[0].release_mode, 'canary', 'release_mode from template');
  assertEq(cw!.args[0].steps.length, 1, '1 step passed');
  assertEq(cw!.args[0].steps[0].title, 'S1 for search', 'step injected');
  assertEq(cw!.args[0].steps[0].prompt_type, 'code', 'prompt_type preserved');
  assertEq(cw!.args[0].steps[0].depends_on_step, null, 'depends_on_step preserved');
  assertEq(cw!.args[1], { user: 'alice' }, 'actor passed');

  // Two UPDATEs: tag workflow + increment usage
  assertEq(dbCalls.length, 2, '2 DB queries');
  assert(/UPDATE prompt_workflows/i.test(dbCalls[0].sql), 'UPDATE prompt_workflows');
  assertEq(dbCalls[0].params, [10, 4, 555], 'tag params [templateId, version, workflowId]');
  assert(/UPDATE workflow_templates/i.test(dbCalls[1].sql), 'UPDATE workflow_templates');
  assert(/usage_count/i.test(dbCalls[1].sql), 'increments usage_count');
  assertEq(dbCalls[1].params, [10], 'usage params [templateId]');

  // Return shape
  assertEq(result.workflow.id, 555, 'workflow returned');
  assertEq(result.template.id, 10, 'template in result');
  assertEq(result.parameters_used, { feature: 'search' }, 'params_used');
}

// Blocked on unresolved warnings
resetState();
getTemplateByIdReturn = {
  id: 11,
  name: 'No params',
  parameters: [],
  steps: [
    {
      step_number: 1,
      title: 'Has {{missing}}',
      purpose: null, component: null, expected_outcome: null, requirements_summary: null,
    },
  ],
};
{
  let caught: Error | null = null;
  try { await instantiate(11, {}, {}); } catch (e: any) { caught = e; }
  assert(caught !== null, 'unresolved warnings throw');
  assert(
    caught !== null && caught.message.includes('Unresolved template parameters'),
    'error mentions unresolved'
  );
  // createWorkflow NOT called
  const cw = calls.find(c => c.method === 'createWorkflow');
  assert(cw === undefined, 'createWorkflow NOT called');
  assertEq(dbCalls.length, 0, 'no DB queries');
}

// Version defaults to 1 in tag UPDATE when template has no version
resetState();
getTemplateByIdReturn = {
  id: 12,
  name: 'T',
  parameters: [],
  steps: [
    { step_number: 1, title: 'T', purpose: null, component: null, expected_outcome: null, requirements_summary: null, prompt_type: 'code', depends_on_step: null },
  ],
};
createWorkflowReturn = { id: 600 };
{
  await instantiate(12, {}, {});
  assertEq(dbCalls[0].params, [12, 1, 600], 'version defaults to 1');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
