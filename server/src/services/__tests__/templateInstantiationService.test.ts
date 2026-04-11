#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateInstantiationService.js (OMD-1171)
 *
 * Generates workflows from templates by injecting {{param}} placeholders.
 * External deps:
 *   - ./workflowTemplateService (getTemplateById, getVersionSnapshot)
 *   - ./workflowService (createWorkflow)
 *   - ../config/db (getAppPool)
 *
 * All stubbed via require.cache BEFORE the SUT is required.
 *
 * Coverage:
 *   - injectParams: null/undefined/non-string, null params, missing key,
 *     $-literal values, unicode, multiple placeholders, repeated placeholder
 *   - injectStepParams: all 5 text fields injected, non-text fields preserved
 *   - validateParams:
 *       · empty template params → valid, resolved=providedParams
 *       · required missing → error
 *       · required missing with default → resolved
 *       · optional missing → no error (not in resolved)
 *       · optional with default → resolved
 *       · number coercion (valid, invalid)
 *       · boolean coercion
 *       · enum validation
 *       · string coercion default
 *       · label used in error message when provided
 *   - previewInstantiation:
 *       · template not found → throws
 *       · validation failure → throws
 *       · happy path: workflow name/desc/component + steps injected
 *       · unresolved_warnings populated when placeholder remains
 *       · version snapshot path
 *   - instantiate:
 *       · unresolved warnings → throws
 *       · happy path: calls workflowService.createWorkflow, tags workflow
 *         with template_id/version, increments usage_count
 *       · returns { workflow, template, parameters_used }
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

// ── Stub workflowTemplateService ─────────────────────────────────────
let scriptedTemplate: any = null;
let scriptedVersionSnapshot: any = null;
const templateCalls: Array<{ method: string; args: any[] }> = [];

const templateServiceStub = {
  getTemplateById: async (id: number) => {
    templateCalls.push({ method: 'getTemplateById', args: [id] });
    return scriptedTemplate;
  },
  getVersionSnapshot: async (id: number, version: number) => {
    templateCalls.push({ method: 'getVersionSnapshot', args: [id, version] });
    return scriptedVersionSnapshot;
  },
};

const templateServicePath = require.resolve('../workflowTemplateService');
require.cache[templateServicePath] = {
  id: templateServicePath,
  filename: templateServicePath,
  loaded: true,
  exports: templateServiceStub,
} as any;

// ── Stub workflowService ─────────────────────────────────────────────
const workflowCalls: Array<{ method: string; args: any[] }> = [];
let createWorkflowReturn: any = { id: 555 };
let createWorkflowThrows = false;

const workflowServiceStub = {
  createWorkflow: async (def: any, actor: any) => {
    workflowCalls.push({ method: 'createWorkflow', args: [def, actor] });
    if (createWorkflowThrows) throw new Error('create failed');
    return createWorkflowReturn;
  },
};

const workflowServicePath = require.resolve('../workflowService');
require.cache[workflowServicePath] = {
  id: workflowServicePath,
  filename: workflowServicePath,
  loaded: true,
  exports: workflowServiceStub,
} as any;

// ── Stub config/db ───────────────────────────────────────────────────
const dbQueries: Array<{ sql: string; params: any[] }> = [];
const fakeAppPool = {
  query: async (sql: string, params: any[] = []) => {
    dbQueries.push({ sql, params });
    return [{ affectedRows: 1 }];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakeAppPool },
} as any;

function resetState() {
  scriptedTemplate = null;
  scriptedVersionSnapshot = null;
  templateCalls.length = 0;
  workflowCalls.length = 0;
  dbQueries.length = 0;
  createWorkflowReturn = { id: 555 };
  createWorkflowThrows = false;
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

assertEq(injectParams(null, {}), null, 'null input');
assertEq(injectParams(undefined, {}), undefined, 'undefined input');
assertEq(injectParams('', {}), '', 'empty string');
assertEq(injectParams(42, {}), 42, 'non-string input passes through');
assertEq(injectParams('Hello world', {}), 'Hello world', 'no placeholders');
assertEq(injectParams('Hello {{name}}', null), 'Hello {{name}}', 'null params');
assertEq(
  injectParams('Hello {{name}}', { name: 'Alice' }),
  'Hello Alice',
  'single replacement'
);
assertEq(
  injectParams('{{first}} {{last}}', { first: 'Alice', last: 'Smith' }),
  'Alice Smith',
  'multiple placeholders'
);
assertEq(
  injectParams('{{x}} and {{x}}', { x: 'same' }),
  'same and same',
  'repeated placeholder'
);
assertEq(
  injectParams('Hello {{missing}}', { other: 'X' }),
  'Hello {{missing}}',
  'missing key → left as-is'
);
// $ should be literal
assertEq(
  injectParams('Hello {{name}}', { name: '$100 & $50' }),
  'Hello $100 & $50',
  '$ value not interpreted'
);
assertEq(
  injectParams('A {{a}} B', { a: '$$' }),
  'A $$ B',
  'double $ literal'
);
// Number value stringified
assertEq(
  injectParams('Count: {{n}}', { n: 42 }),
  'Count: 42',
  'number stringified'
);

// ============================================================================
// injectStepParams
// ============================================================================
console.log('\n── injectStepParams ──────────────────────────────────────');

{
  const step = {
    step_number: 1,
    title: 'Build {{thing}}',
    purpose: 'Purpose for {{thing}}',
    component: 'components/{{thing}}',
    expected_outcome: 'Working {{thing}}',
    requirements_summary: 'Needs {{thing}}',
    prompt_type: 'cursor',
    depends_on_step: null,
  };
  const result = injectStepParams(step, { thing: 'widget' });

  assertEq(result.title, 'Build widget', 'title injected');
  assertEq(result.purpose, 'Purpose for widget', 'purpose injected');
  assertEq(result.component, 'components/widget', 'component injected');
  assertEq(result.expected_outcome, 'Working widget', 'expected_outcome injected');
  assertEq(result.requirements_summary, 'Needs widget', 'requirements injected');
  // Non-text fields preserved
  assertEq(result.step_number, 1, 'step_number preserved');
  assertEq(result.prompt_type, 'cursor', 'prompt_type preserved');
  assertEq(result.depends_on_step, null, 'depends_on_step preserved');
}

// ============================================================================
// validateParams: empty template params
// ============================================================================
console.log('\n── validateParams: empty ─────────────────────────────────');

{
  const r = validateParams([], { a: 1 });
  assertEq(r.valid, true, 'valid when no template params');
  assertEq(r.errors, [], 'no errors');
  assertEq(r.resolved_params, { a: 1 }, 'passes through provided');
}

{
  const r = validateParams(null, undefined);
  assertEq(r.valid, true, 'null templateParams OK');
  assertEq(r.resolved_params, {}, 'empty resolved');
}

// ============================================================================
// validateParams: required missing
// ============================================================================
console.log('\n── validateParams: required missing ──────────────────────');

{
  const r = validateParams(
    [{ name: 'component', required: true }],
    {}
  );
  assertEq(r.valid, false, 'invalid');
  assertEq(r.errors.length, 1, '1 error');
  assert(r.errors[0].includes('component'), 'error mentions name');
}

// Uses label if provided
{
  const r = validateParams(
    [{ name: 'component', label: 'Component Name', required: true }],
    {}
  );
  assert(r.errors[0].includes('Component Name'), 'error uses label');
}

// Empty string also treated as missing
{
  const r = validateParams(
    [{ name: 'x', required: true }],
    { x: '' }
  );
  assertEq(r.valid, false, 'empty string missing');
}

// Required missing WITH default → valid
{
  const r = validateParams(
    [{ name: 'env', required: true, default_value: 'prod' }],
    {}
  );
  assertEq(r.valid, true, 'valid via default');
  assertEq(r.resolved_params, { env: 'prod' }, 'resolved to default');
}

// ============================================================================
// validateParams: optional params
// ============================================================================
console.log('\n── validateParams: optional ──────────────────────────────');

{
  const r = validateParams(
    [{ name: 'optional_thing', required: false }],
    {}
  );
  assertEq(r.valid, true, 'optional missing OK');
  assertEq(r.resolved_params, {}, 'not in resolved');
}

{
  const r = validateParams(
    [{ name: 'optional_thing', required: false, default_value: 'fallback' }],
    {}
  );
  assertEq(r.resolved_params, { optional_thing: 'fallback' }, 'optional default applied');
}

// ============================================================================
// validateParams: number coercion
// ============================================================================
console.log('\n── validateParams: number coercion ───────────────────────');

{
  const r = validateParams(
    [{ name: 'count', type: 'number', required: true }],
    { count: '42' }
  );
  assertEq(r.valid, true, 'numeric string valid');
  assertEq(r.resolved_params.count, 42, 'coerced to number');
}

{
  const r = validateParams(
    [{ name: 'count', type: 'number', required: true }],
    { count: 'abc' }
  );
  assertEq(r.valid, false, 'non-numeric invalid');
  assert(r.errors[0].includes('must be a number'), 'error message');
}

// ============================================================================
// validateParams: boolean coercion
// ============================================================================
console.log('\n── validateParams: boolean coercion ──────────────────────');

{
  const r = validateParams(
    [{ name: 'flag', type: 'boolean' }],
    { flag: true }
  );
  assertEq(r.resolved_params.flag, true, 'true → true');
}

{
  const r = validateParams(
    [{ name: 'flag', type: 'boolean' }],
    { flag: 'true' }
  );
  assertEq(r.resolved_params.flag, true, '"true" → true');
}

{
  const r = validateParams(
    [{ name: 'flag', type: 'boolean' }],
    { flag: 'false' }
  );
  assertEq(r.resolved_params.flag, false, '"false" → false');
}

// ============================================================================
// validateParams: enum
// ============================================================================
console.log('\n── validateParams: enum ──────────────────────────────────');

{
  const r = validateParams(
    [{ name: 'env', type: 'enum', options: ['dev', 'staging', 'prod'] }],
    { env: 'staging' }
  );
  assertEq(r.valid, true, 'valid enum');
  assertEq(r.resolved_params.env, 'staging', 'value set');
}

{
  const r = validateParams(
    [{ name: 'env', type: 'enum', options: ['dev', 'prod'] }],
    { env: 'bogus' }
  );
  assertEq(r.valid, false, 'invalid enum');
  assert(r.errors[0].includes('one of'), 'error lists options');
  assert(r.errors[0].includes('dev'), 'lists dev');
  assert(r.errors[0].includes('prod'), 'lists prod');
}

// ============================================================================
// validateParams: default string coercion
// ============================================================================
console.log('\n── validateParams: string default ────────────────────────');

{
  const r = validateParams(
    [{ name: 'x' }],
    { x: 42 }
  );
  assertEq(r.resolved_params.x, '42', 'coerced to string');
}

// ============================================================================
// previewInstantiation: not found
// ============================================================================
console.log('\n── previewInstantiation: not found ───────────────────────');

resetState();
scriptedTemplate = null;
{
  let caught: Error | null = null;
  try {
    await previewInstantiation(999, {});
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'throws on not found');
  assert(caught !== null && caught.message.includes('not found'), 'error message');
}

// ============================================================================
// previewInstantiation: validation failure
// ============================================================================
console.log('\n── previewInstantiation: validation failure ──────────────');

resetState();
scriptedTemplate = {
  id: 1,
  name: 'Test',
  parameters: [{ name: 'required_thing', required: true }],
  steps: [],
};
{
  let caught: Error | null = null;
  try {
    await previewInstantiation(1, {});
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'throws on validation fail');
  assert(caught !== null && caught.message.includes('Parameter validation failed'), 'error message');
}

// ============================================================================
// previewInstantiation: happy path
// ============================================================================
console.log('\n── previewInstantiation: happy path ──────────────────────');

resetState();
scriptedTemplate = {
  id: 1,
  name: 'Build {{feature}}',
  description: 'Workflow to build {{feature}}',
  category: 'refactor',
  version: 3,
  release_mode: 'manual',
  parameters: [
    { name: 'feature', required: true },
    { name: 'env', required: false, default_value: 'dev' },
  ],
  steps: [
    {
      step_number: 1,
      title: 'Design {{feature}}',
      purpose: 'Design phase for {{feature}}',
      component: 'components/{{feature}}',
      expected_outcome: '{{feature}} designed',
      requirements_summary: 'Need to design {{feature}}',
      prompt_type: 'cursor',
      depends_on_step: null,
    },
    {
      step_number: 2,
      title: 'Build {{feature}} in {{env}}',
      purpose: null,
      component: null,
      expected_outcome: null,
      requirements_summary: null,
      prompt_type: 'cursor',
      depends_on_step: 1,
    },
  ],
};

{
  const preview = await previewInstantiation(1, { feature: 'Widget' });
  assertEq(preview.workflow.name, 'Build Widget', 'name injected');
  assertEq(preview.workflow.description, 'Workflow to build Widget', 'description injected');
  assertEq(preview.workflow.component, 'components/Widget', 'component uses first step');
  assertEq(preview.steps.length, 2, '2 steps');
  assertEq(preview.steps[0].title, 'Design Widget', 'step 1 title');
  assertEq(preview.steps[1].title, 'Build Widget in dev', 'step 2 with default env');
  assertEq(preview.parameters_used, { feature: 'Widget', env: 'dev' }, 'resolved params');
  assertEq(preview.template.id, 1, 'template id');
  assertEq(preview.template.version, 3, 'template version');
  assertEq(preview.template_release_mode, 'manual', 'release mode');
  assertEq(preview.unresolved_warnings, [], 'no warnings');
}

// ============================================================================
// previewInstantiation: unresolved warnings
// ============================================================================
console.log('\n── previewInstantiation: unresolved warnings ─────────────');

resetState();
scriptedTemplate = {
  id: 1,
  name: 'Test',
  parameters: [],
  steps: [
    {
      step_number: 1,
      title: 'Step {{not_defined}}',
      purpose: null,
      component: null,
      expected_outcome: null,
      requirements_summary: null,
      prompt_type: 'cursor',
      depends_on_step: null,
    },
  ],
};

{
  const preview = await previewInstantiation(1, {});
  assert(preview.unresolved_warnings.length > 0, 'warning captured');
  assert(
    preview.unresolved_warnings[0].includes('not_defined'),
    'warning mentions placeholder'
  );
  assert(
    preview.unresolved_warnings[0].includes('title'),
    'warning mentions field'
  );
}

// ============================================================================
// previewInstantiation: version snapshot path
// ============================================================================
console.log('\n── previewInstantiation: version snapshot ────────────────');

resetState();
scriptedVersionSnapshot = {
  snapshot: {
    name: 'Snapshot template',
    description: '',
    category: 'test',
    parameters: [],
    steps: [],
  },
};
{
  const preview = await previewInstantiation(5, {}, 2);
  assertEq(templateCalls.length, 1, '1 template call');
  assertEq(templateCalls[0].method, 'getVersionSnapshot', 'version snapshot method');
  assertEq(templateCalls[0].args, [5, 2], 'args');
  assertEq(preview.template.id, 5, 'template id');
  assertEq(preview.template.version, 2, 'template version');
}

// Snapshot not found → throws
resetState();
scriptedVersionSnapshot = null;
{
  let caught: Error | null = null;
  try {
    await previewInstantiation(5, {}, 99);
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'throws when snapshot missing');
  assert(caught !== null && caught.message.includes('99'), 'error mentions version');
}

// ============================================================================
// instantiate: unresolved warnings → throws
// ============================================================================
console.log('\n── instantiate: unresolved warnings ──────────────────────');

resetState();
scriptedTemplate = {
  id: 1,
  name: 'Test',
  parameters: [],
  steps: [{
    step_number: 1,
    title: 'X {{missing}}',
    prompt_type: 'cursor',
  }],
};
{
  let caught: Error | null = null;
  try {
    await instantiate(1, {}, { userId: 7 });
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'throws on unresolved');
  assert(
    caught !== null && caught.message.includes('Unresolved template parameters'),
    'error mentions unresolved'
  );
}

// ============================================================================
// instantiate: happy path
// ============================================================================
console.log('\n── instantiate: happy path ───────────────────────────────');

resetState();
scriptedTemplate = {
  id: 1,
  name: 'Build {{feature}}',
  description: 'Desc {{feature}}',
  category: 'test',
  version: 2,
  release_mode: 'auto',
  parameters: [{ name: 'feature', required: true }],
  steps: [{
    step_number: 1,
    title: 'Step 1: {{feature}}',
    purpose: 'p',
    component: 'c',
    expected_outcome: 'o',
    requirements_summary: 'r',
    prompt_type: 'cursor',
    depends_on_step: null,
  }],
};
createWorkflowReturn = { id: 777, name: 'Build Widget' };

{
  const result = await instantiate(1, { feature: 'Widget' }, { userId: 9 });

  assertEq(result.workflow.id, 777, 'workflow.id');
  assertEq(result.parameters_used, { feature: 'Widget' }, 'parameters_used');
  assertEq(result.template.id, 1, 'template.id');

  // workflowService.createWorkflow called once
  assertEq(workflowCalls.length, 1, '1 createWorkflow call');
  const [workflowDef, actor] = workflowCalls[0].args;
  assertEq(workflowDef.name, 'Build Widget', 'workflow name');
  assertEq(workflowDef.description, 'Desc Widget', 'workflow desc');
  assertEq(workflowDef.release_mode, 'auto', 'release mode propagated');
  assertEq(workflowDef.steps.length, 1, '1 step');
  assertEq(workflowDef.steps[0].title, 'Step 1: Widget', 'step title injected');
  assertEq(workflowDef.steps[0].prompt_type, 'cursor', 'prompt_type preserved');
  assertEq(actor, { userId: 9 }, 'actor passed');

  // DB updates
  assertEq(dbQueries.length, 2, '2 DB queries');
  assert(/UPDATE prompt_workflows/.test(dbQueries[0].sql), 'tags workflow');
  assertEq(dbQueries[0].params, [1, 2, 777], 'template_id, version, workflow_id');
  assert(/UPDATE workflow_templates/.test(dbQueries[1].sql), 'increments usage');
  assert(/usage_count = usage_count \+ 1/.test(dbQueries[1].sql), 'usage_count inc');
  assertEq(dbQueries[1].params, [1], 'template id');
}

// ============================================================================
// instantiate: version defaults to 1 when template has no version
// ============================================================================
console.log('\n── instantiate: version fallback ─────────────────────────');

resetState();
scriptedTemplate = {
  id: 5,
  name: 'No version',
  description: '',
  category: 'x',
  // version: undefined
  parameters: [],
  steps: [{
    step_number: 1,
    title: 'T',
    prompt_type: 'cursor',
  }],
};
createWorkflowReturn = { id: 888 };
{
  await instantiate(5, {}, {});
  assertEq(dbQueries[0].params, [5, 1, 888], 'version defaults to 1');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
