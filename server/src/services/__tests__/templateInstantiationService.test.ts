#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateInstantiationService.js (OMD-1116)
 *
 * Parameter injection + workflow instantiation from templates.
 * Three external deps: workflowTemplateService, workflowService, config/db.
 *
 * Strategy: stub all three via require.cache with scriptable fakes,
 * BEFORE requiring the SUT. Route-dispatch fake pool for DB calls.
 *
 * Coverage:
 *   - injectParams (pure):
 *       · basic {{name}} substitution
 *       · multiple placeholders
 *       · unresolved placeholders left as-is
 *       · non-string input passthrough (null, number, undefined)
 *       · no-params input passthrough
 *       · $-prefixed values treated literally ($ not interpreted)
 *       · number/boolean values coerced to string
 *   - injectStepParams:
 *       · applies injection to title, purpose, component,
 *         expected_outcome, requirements_summary
 *       · other fields preserved
 *   - validateParams (pure):
 *       · no template params → valid
 *       · missing required → errors
 *       · default_value used when missing
 *       · optional missing no default → omitted
 *       · number type coercion + NaN error
 *       · boolean type coercion
 *       · enum validation + error on invalid
 *       · string coercion for untyped values
 *   - previewInstantiation:
 *       · template not found → throws
 *       · invalid params → throws
 *       · happy path returns workflow + steps + parameters_used + template
 *       · version snapshot path
 *       · unresolved placeholders captured in warnings
 *       · template_release_mode propagated
 *   - instantiate:
 *       · unresolved warnings → throws
 *       · happy path: calls workflowService.createWorkflow, tags template,
 *         increments usage_count, returns workflow
 *       · propagates release_mode
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

async function assertThrows(fn: () => Promise<any>, substring: string, message: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${message} (did not throw)`);
    failed++;
  } catch (e: any) {
    if (e.message && e.message.includes(substring)) {
      console.log(`  PASS: ${message}`); passed++;
    } else {
      console.error(`  FAIL: ${message}\n         expected error containing: ${substring}\n         got: ${e.message}`);
      failed++;
    }
  }
}

// ── Scriptable workflowTemplateService stub ─────────────────────────────
let stubTemplate: any = null;
let stubVersionSnapshot: any = null;
const templateServiceStub = {
  getTemplateById: async (id: string) => {
    if (stubTemplate && stubTemplate.id === id) return stubTemplate;
    if (stubTemplate && !stubTemplate.id) return stubTemplate;  // id-less fixture
    return null;
  },
  getVersionSnapshot: async (id: string, version: number) => {
    if (stubVersionSnapshot) return stubVersionSnapshot;
    return null;
  },
};

const tmplPath = require.resolve('../workflowTemplateService');
require.cache[tmplPath] = {
  id: tmplPath,
  filename: tmplPath,
  loaded: true,
  exports: templateServiceStub,
} as any;

// ── Scriptable workflowService stub ─────────────────────────────────────
type CreateCall = { data: any; actor: string };
const createWorkflowCalls: CreateCall[] = [];
let createWorkflowResponse: any = { id: 'wf-1', name: 'Stub WF' };
let createWorkflowError: Error | null = null;

const workflowServiceStub = {
  createWorkflow: async (data: any, actor: string) => {
    createWorkflowCalls.push({ data, actor });
    if (createWorkflowError) throw createWorkflowError;
    return createWorkflowResponse;
  },
};

const wfPath = require.resolve('../workflowService');
require.cache[wfPath] = {
  id: wfPath,
  filename: wfPath,
  loaded: true,
  exports: workflowServiceStub,
} as any;

// ── Fake pool via route dispatch ────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
type Route = { match: RegExp; handler: (params: any[]) => any };

const queryCalls: QueryCall[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryCalls.push({ sql, params });
    for (const route of routes) {
      if (route.match.test(sql)) return route.handler(params);
    }
    throw new Error(`No route matched SQL: ${sql.slice(0, 100)}`);
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

function resetAll() {
  stubTemplate = null;
  stubVersionSnapshot = null;
  createWorkflowCalls.length = 0;
  createWorkflowResponse = { id: 'wf-1', name: 'Stub WF' };
  createWorkflowError = null;
  queryCalls.length = 0;
  routes = [];
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
// injectParams — pure function
// ============================================================================
console.log('\n── injectParams ──────────────────────────────────────────');

assertEq(injectParams('Hello {{name}}', { name: 'World' }), 'Hello World', 'basic substitution');
assertEq(
  injectParams('{{greeting}} {{name}}!', { greeting: 'Hi', name: 'Alice' }),
  'Hi Alice!',
  'multiple placeholders'
);
assertEq(injectParams('{{a}} {{b}} {{a}}', { a: 'X', b: 'Y' }), 'X Y X', 'repeated placeholder');
assertEq(injectParams('No placeholders here', { x: 1 }), 'No placeholders here', 'no placeholders');
assertEq(
  injectParams('Unresolved: {{unknown}}', { name: 'X' }),
  'Unresolved: {{unknown}}',
  'unknown placeholder preserved'
);

// Passthrough for non-string
assertEq(injectParams(null, { x: 1 }), null, 'null → null');
assertEq(injectParams(undefined, { x: 1 }), undefined, 'undefined → undefined');
assertEq(injectParams(42 as any, { x: 1 }), 42, 'number → number');

// No params → passthrough
assertEq(injectParams('Hello {{name}}', null), 'Hello {{name}}', 'null params → unchanged');
assertEq(injectParams('Hello {{name}}', undefined), 'Hello {{name}}', 'undefined params → unchanged');

// $-prefixed values literal ($ not interpreted as replace backref)
assertEq(
  injectParams('Price: {{price}}', { price: '$100' }),
  'Price: $100',
  '$ literal in value'
);
assertEq(
  injectParams('Escape: {{x}}', { x: '$&$1$$' }),
  'Escape: $&$1$$',
  '$&, $1, $$ literal in value'
);

// Value coercion to String
assertEq(injectParams('Num: {{n}}', { n: 42 }), 'Num: 42', 'number coerced to string');
assertEq(injectParams('Bool: {{b}}', { b: true }), 'Bool: true', 'boolean coerced to string');

// ============================================================================
// injectStepParams
// ============================================================================
console.log('\n── injectStepParams ──────────────────────────────────────');

{
  const step = {
    step_number: 1,
    title: '{{name}} setup',
    purpose: 'Implement {{feature}}',
    component: '{{component}}',
    expected_outcome: 'Tests pass for {{feature}}',
    requirements_summary: 'Need {{feature}} running',
    prompt_type: 'implementation',  // untouched
    depends_on_step: null,
  };
  const result = injectStepParams(step, { name: 'Auth', feature: 'Login', component: 'LoginForm' });
  assertEq(result.title, 'Auth setup', 'title injected');
  assertEq(result.purpose, 'Implement Login', 'purpose injected');
  assertEq(result.component, 'LoginForm', 'component injected');
  assertEq(result.expected_outcome, 'Tests pass for Login', 'expected_outcome injected');
  assertEq(result.requirements_summary, 'Need Login running', 'requirements_summary injected');
  assertEq(result.prompt_type, 'implementation', 'prompt_type preserved');
  assertEq(result.step_number, 1, 'step_number preserved');
  assertEq(result.depends_on_step, null, 'depends_on_step preserved');
}

// Null fields preserved
{
  const step = { title: 'X', purpose: null, component: null, expected_outcome: null, requirements_summary: null };
  const result = injectStepParams(step, {});
  assertEq(result.purpose, null, 'null purpose preserved');
  assertEq(result.component, null, 'null component preserved');
}

// ============================================================================
// validateParams — pure function
// ============================================================================
console.log('\n── validateParams ────────────────────────────────────────');

// No params defined
{
  const r = validateParams([], { anything: 1 });
  assertEq(r.valid, true, 'empty defs valid');
  assertEq(r.errors, [], 'no errors');
  assertEq(r.resolved_params, { anything: 1 }, 'passes through provided');
}

{
  const r = validateParams(null, null);
  assertEq(r.valid, true, 'null defs valid');
  assertEq(r.resolved_params, {}, 'empty resolved');
}

// Required missing
{
  const r = validateParams(
    [{ name: 'feature_name', label: 'Feature', type: 'string' }],
    {}
  );
  assertEq(r.valid, false, 'missing required → invalid');
  assert(r.errors[0].includes('Feature'), 'error uses label');
}

// Required missing, no label
{
  const r = validateParams(
    [{ name: 'feature_name', type: 'string' }],
    {}
  );
  assertEq(r.valid, false, 'missing required (no label)');
  assert(r.errors[0].includes('feature_name'), 'error uses name when no label');
}

// Default value when missing
{
  const r = validateParams(
    [{ name: 'mode', type: 'string', default_value: 'auto' }],
    {}
  );
  assertEq(r.valid, true, 'default used');
  assertEq(r.resolved_params.mode, 'auto', 'default value resolved');
}

// Optional missing, no default → omitted
{
  const r = validateParams(
    [{ name: 'opt', type: 'string', required: false }],
    {}
  );
  assertEq(r.valid, true, 'optional missing valid');
  assertEq(r.resolved_params.opt, undefined, 'optional omitted when missing');
}

// Optional missing with default → resolved
{
  const r = validateParams(
    [{ name: 'opt', type: 'string', required: false, default_value: 'x' }],
    {}
  );
  assertEq(r.resolved_params.opt, 'x', 'optional default used');
}

// Number coercion
{
  const r = validateParams(
    [{ name: 'count', type: 'number' }],
    { count: '42' }
  );
  assertEq(r.valid, true, 'number string coerces');
  assertEq(r.resolved_params.count, 42, 'coerced to number');
}

{
  const r = validateParams(
    [{ name: 'count', type: 'number' }],
    { count: 'abc' }
  );
  assertEq(r.valid, false, 'NaN → invalid');
  assert(r.errors[0].includes('must be a number'), 'NaN error message');
}

// Boolean coercion
{
  const r = validateParams(
    [{ name: 'flag', type: 'boolean' }],
    { flag: 'true' }
  );
  assertEq(r.resolved_params.flag, true, 'string "true" → true');
}

{
  const r = validateParams(
    [{ name: 'flag', type: 'boolean' }],
    { flag: true }
  );
  assertEq(r.resolved_params.flag, true, 'boolean true → true');
}

{
  const r = validateParams(
    [{ name: 'flag', type: 'boolean' }],
    { flag: 'false' }
  );
  assertEq(r.resolved_params.flag, false, 'string "false" → false');
}

// Enum validation
{
  const r = validateParams(
    [{ name: 'env', type: 'enum', options: ['dev', 'prod'] }],
    { env: 'dev' }
  );
  assertEq(r.valid, true, 'valid enum option');
  assertEq(r.resolved_params.env, 'dev', 'enum value set');
}

{
  const r = validateParams(
    [{ name: 'env', type: 'enum', options: ['dev', 'prod'] }],
    { env: 'staging' }
  );
  assertEq(r.valid, false, 'invalid enum option');
  assert(r.errors[0].includes('must be one of: dev, prod'), 'enum error lists options');
}

// String coercion (untyped / other)
{
  const r = validateParams(
    [{ name: 'name' }],
    { name: 42 }
  );
  assertEq(r.resolved_params.name, '42', 'number coerced to string for untyped');
}

// Empty string treated as missing
{
  const r = validateParams(
    [{ name: 'x', type: 'string' }],
    { x: '' }
  );
  assertEq(r.valid, false, 'empty string counts as missing');
}

// Multiple params with mix of errors
{
  const r = validateParams(
    [
      { name: 'required_name', type: 'string' },
      { name: 'count', type: 'number' },
    ],
    { count: 'NaN' }
  );
  assertEq(r.valid, false, 'multiple errors');
  assertEq(r.errors.length, 2, 'two errors collected');
}

// ============================================================================
// previewInstantiation
// ============================================================================
console.log('\n── previewInstantiation: not found ───────────────────────');

resetAll();
await assertThrows(
  () => previewInstantiation('missing', {}),
  'Template not found',
  'missing template throws'
);

console.log('\n── previewInstantiation: invalid params ──────────────────');

resetAll();
stubTemplate = {
  id: 't1',
  name: 'Build {{feature}}',
  description: 'Builds {{feature}} end to end',
  category: 'frontend',
  parameters: [{ name: 'feature', label: 'Feature', type: 'string' }],
  steps: [],
};
await assertThrows(
  () => previewInstantiation('t1', {}),
  'Parameter validation failed',
  'missing required params throws'
);

console.log('\n── previewInstantiation: happy path ──────────────────────');

resetAll();
stubTemplate = {
  id: 't2',
  name: 'Build {{feature}}',
  description: 'Builds {{feature}} for {{team}}',
  category: 'frontend',
  version: 3,
  release_mode: 'auto_safe',
  parameters: [
    { name: 'feature', label: 'Feature', type: 'string' },
    { name: 'team', label: 'Team', type: 'string', default_value: 'core' },
  ],
  steps: [
    {
      step_number: 1,
      title: '{{feature}} design',
      purpose: 'Plan {{feature}}',
      component: '{{feature}}Page',
      expected_outcome: 'Design doc for {{feature}}',
      requirements_summary: null,
      prompt_type: 'plan',
      depends_on_step: null,
    },
    {
      step_number: 2,
      title: '{{feature}} implementation',
      purpose: 'Build {{feature}}',
      component: '{{feature}}Page',
      expected_outcome: 'Tests pass',
      requirements_summary: 'Need {{feature}} ready',
      prompt_type: 'implementation',
      depends_on_step: 1,
    },
  ],
};
{
  const result = await previewInstantiation('t2', { feature: 'Login' });
  assertEq(result.workflow.name, 'Build Login', 'workflow name injected');
  assertEq(result.workflow.description, 'Builds Login for core', 'description uses default team');
  assertEq(result.workflow.component, 'LoginPage', 'component from first step');
  assertEq(result.steps.length, 2, '2 steps');
  assertEq(result.steps[0].title, 'Login design', 'step 1 title injected');
  assertEq(result.steps[0].component, 'LoginPage', 'step 1 component injected');
  assertEq(result.steps[1].requirements_summary, 'Need Login ready', 'step 2 requirements injected');
  assertEq(result.parameters_used, { feature: 'Login', team: 'core' }, 'resolved params');
  assertEq(result.template.id, 't2', 'template id');
  assertEq(result.template.name, 'Build {{feature}}', 'template name unchanged');
  assertEq(result.template.version, 3, 'template version');
  assertEq(result.template.category, 'frontend', 'template category');
  assertEq(result.template_release_mode, 'auto_safe', 'release_mode propagated');
  assertEq(result.unresolved_warnings, [], 'no warnings');
}

// Workflow component falls back to category when no steps
console.log('\n── previewInstantiation: no steps → category fallback ──');
resetAll();
stubTemplate = {
  id: 't3',
  name: 'Empty',
  description: 'desc',
  category: 'backend',
  parameters: [],
  steps: [],
};
{
  const result = await previewInstantiation('t3', {});
  assertEq(result.workflow.component, 'backend', 'fallback to category');
  assertEq(result.steps, [], 'no steps');
}

// Version snapshot path
console.log('\n── previewInstantiation: version snapshot ────────────────');
resetAll();
stubVersionSnapshot = {
  snapshot: {
    name: 'Snapshot {{x}}',
    description: 'v2',
    category: 'docs',
    parameters: [{ name: 'x', type: 'string' }],
    steps: [
      { step_number: 1, title: '{{x}} step', purpose: 'p', component: 'c', expected_outcome: 'o', prompt_type: 'implementation' },
    ],
  },
};
{
  const result = await previewInstantiation('t4', { x: 'hello' }, 2);
  assertEq(result.workflow.name, 'Snapshot hello', 'snapshot name injected');
  assertEq(result.template.id, 't4', 'snapshot template id');
  assertEq(result.template.version, 2, 'snapshot version');
}

// Version not found throws
resetAll();
stubVersionSnapshot = null;
await assertThrows(
  () => previewInstantiation('t5', {}, 99),
  'Template version 99 not found',
  'snapshot not found throws'
);

// Unresolved placeholders captured
console.log('\n── previewInstantiation: unresolved placeholders ─────────');
resetAll();
stubTemplate = {
  id: 't6',
  name: 'Unresolved',
  description: '',
  category: 'backend',
  parameters: [],
  steps: [
    { step_number: 1, title: 'Use {{missing}}', purpose: 'p', component: 'c', expected_outcome: 'o', prompt_type: 'implementation' },
  ],
};
{
  const result = await previewInstantiation('t6', {});
  assert(result.unresolved_warnings.length > 0, 'unresolved warnings present');
  assert(/Step 1/.test(result.unresolved_warnings[0]), 'warning mentions step number');
  assert(/\{\{missing\}\}/.test(result.unresolved_warnings[0]), 'warning mentions placeholder');
}

// ============================================================================
// instantiate
// ============================================================================
console.log('\n── instantiate: unresolved throws ────────────────────────');

resetAll();
stubTemplate = {
  id: 't7',
  name: 'Unresolved',
  description: '',
  category: 'backend',
  parameters: [],
  steps: [
    { step_number: 1, title: '{{missing}}', purpose: 'p', component: 'c', expected_outcome: 'o', prompt_type: 'implementation' },
  ],
};
await assertThrows(
  () => instantiate('t7', {}, 'actor'),
  'Unresolved template parameters',
  'unresolved throws'
);
assertEq(createWorkflowCalls.length, 0, 'createWorkflow not called');

console.log('\n── instantiate: happy path ───────────────────────────────');

resetAll();
stubTemplate = {
  id: 't8',
  name: 'Build {{f}}',
  description: 'desc',
  category: 'frontend',
  version: 5,
  release_mode: 'auto_full',
  parameters: [{ name: 'f', type: 'string' }],
  steps: [
    {
      step_number: 1, title: '{{f}} step', purpose: 'p', component: '{{f}}Page',
      expected_outcome: 'o', requirements_summary: 'r', prompt_type: 'implementation',
      depends_on_step: null,
    },
  ],
};
createWorkflowResponse = { id: 'wf-42', name: 'Build Login' };
routes = [
  { match: /UPDATE prompt_workflows SET template_id/i, handler: () => [{ affectedRows: 1 }] },
  { match: /UPDATE workflow_templates SET usage_count/i, handler: () => [{ affectedRows: 1 }] },
];
{
  const result = await instantiate('t8', { f: 'Login' }, 'nick');

  // createWorkflow called with injected values
  assertEq(createWorkflowCalls.length, 1, 'createWorkflow called once');
  const call = createWorkflowCalls[0];
  assertEq(call.actor, 'nick', 'actor passed');
  assertEq(call.data.name, 'Build Login', 'name injected');
  assertEq(call.data.component, 'LoginPage', 'component injected');
  assertEq(call.data.release_mode, 'auto_full', 'release_mode propagated');
  assertEq(call.data.steps.length, 1, '1 step');
  assertEq(call.data.steps[0].title, 'Login step', 'step title injected');
  assertEq(call.data.steps[0].component, 'LoginPage', 'step component injected');
  // Only whitelisted fields in step
  assert('step_number' in call.data.steps[0], 'step_number present');
  assert('prompt_type' in call.data.steps[0], 'prompt_type present');
  assert('depends_on_step' in call.data.steps[0], 'depends_on_step present');

  // Tag + increment queries
  const sqls = queryCalls.map(c => c.sql);
  const tagQuery = queryCalls.find(c => /UPDATE prompt_workflows SET template_id/i.test(c.sql))!;
  assertEq(tagQuery.params[0], 't8', 'tag: templateId');
  assertEq(tagQuery.params[1], 5, 'tag: template version');
  assertEq(tagQuery.params[2], 'wf-42', 'tag: workflow id');
  assert(sqls.some(s => /UPDATE workflow_templates SET usage_count = usage_count \+ 1/i.test(s)), 'usage_count incremented');

  // Return shape
  assertEq(result.workflow, { id: 'wf-42', name: 'Build Login' }, 'workflow returned');
  assertEq(result.template.id, 't8', 'template id');
  assertEq(result.parameters_used, { f: 'Login' }, 'parameters_used');
}

// Instantiate with null release_mode
console.log('\n── instantiate: null release_mode ────────────────────────');
resetAll();
stubTemplate = {
  id: 't9',
  name: 'Plain',
  description: '',
  category: 'backend',
  version: 1,
  release_mode: null,
  parameters: [],
  steps: [
    { step_number: 1, title: 'step', purpose: 'p', component: 'c', expected_outcome: 'o', prompt_type: 'implementation' },
  ],
};
routes = [
  { match: /UPDATE prompt_workflows/i, handler: () => [{ affectedRows: 1 }] },
  { match: /UPDATE workflow_templates/i, handler: () => [{ affectedRows: 1 }] },
];
{
  await instantiate('t9', {}, 'a');
  assertEq(createWorkflowCalls[0].data.release_mode, null, 'null release_mode');
}

// Version override used when tagging
console.log('\n── instantiate: version-specific tagging ─────────────────');
resetAll();
stubVersionSnapshot = {
  snapshot: {
    name: 'Snap',
    description: '',
    category: 'backend',
    parameters: [],
    steps: [
      { step_number: 1, title: 's', purpose: 'p', component: 'c', expected_outcome: 'o', prompt_type: 'implementation' },
    ],
  },
};
routes = [
  { match: /UPDATE prompt_workflows/i, handler: () => [{ affectedRows: 1 }] },
  { match: /UPDATE workflow_templates/i, handler: () => [{ affectedRows: 1 }] },
];
{
  await instantiate('t10', {}, 'a', 7);
  const tagQuery = queryCalls.find(c => /UPDATE prompt_workflows/i.test(c.sql))!;
  assertEq(tagQuery.params[1], 7, 'tag version matches supplied version');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  console.error('Unhandled:', e);
  process.exit(1);
});
