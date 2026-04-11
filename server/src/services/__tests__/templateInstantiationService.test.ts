#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateInstantiationService.js (OMD-999)
 *
 * Exports:
 *   - injectParams(text, params)                 (pure)
 *   - injectStepParams(step, params)             (pure)
 *   - validateParams(templateParams, provided)   (pure)
 *   - previewInstantiation(templateId, params, version?)
 *   - instantiate(templateId, params, actor, version?)
 *
 * Stubs:
 *   - ./workflowTemplateService → getTemplateById, getVersionSnapshot
 *   - ./workflowService → createWorkflow
 *   - ../config/db → getAppPool
 *
 * Run: npx tsx server/src/services/__tests__/templateInstantiationService.test.ts
 */

// ── stubs ─────────────────────────────────────────────────────────────
let getTemplateByIdResult: any = null;
let getVersionSnapshotResult: any = null;
let getTemplateByIdCalls: any[] = [];
let getVersionSnapshotCalls: any[] = [];

const templateServicePath = require.resolve('../workflowTemplateService');
require.cache[templateServicePath] = {
  id: templateServicePath,
  filename: templateServicePath,
  loaded: true,
  exports: {
    getTemplateById: async (id: any) => {
      getTemplateByIdCalls.push(id);
      return getTemplateByIdResult;
    },
    getVersionSnapshot: async (id: any, version: any) => {
      getVersionSnapshotCalls.push({ id, version });
      return getVersionSnapshotResult;
    },
  },
} as any;

let createWorkflowResult: any = { id: 7777, name: 'Created' };
let createWorkflowCalls: any[] = [];
const workflowServicePath = require.resolve('../workflowService');
require.cache[workflowServicePath] = {
  id: workflowServicePath,
  filename: workflowServicePath,
  loaded: true,
  exports: {
    createWorkflow: async (def: any, actor: any) => {
      createWorkflowCalls.push({ def, actor });
      return createWorkflowResult;
    },
  },
} as any;

type PoolCall = { sql: string; params: any[] };
let poolCalls: PoolCall[] = [];
const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    poolCalls.push({ sql, params });
    return [{}, {}];
  },
};
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

const svc = require('../templateInstantiationService');

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

function resetStubs() {
  getTemplateByIdResult = null;
  getVersionSnapshotResult = null;
  getTemplateByIdCalls = [];
  getVersionSnapshotCalls = [];
  createWorkflowResult = { id: 7777, name: 'Created' };
  createWorkflowCalls = [];
  poolCalls = [];
}

async function main() {

// ============================================================================
// injectParams
// ============================================================================
console.log('\n── injectParams ─────────────────────────────────────────');

assertEq(svc.injectParams('', { a: 1 }), '', 'empty string unchanged');
assertEq(svc.injectParams(null, { a: 1 }), null, 'null unchanged');
assertEq(svc.injectParams(undefined, { a: 1 }), undefined, 'undefined unchanged');
assertEq(svc.injectParams(123 as any, { a: 1 }), 123 as any, 'non-string unchanged');
assertEq(svc.injectParams('plain text', { a: 1 }), 'plain text', 'no placeholders unchanged');

// Null / undefined params
assertEq(svc.injectParams('Hi {{name}}', null), 'Hi {{name}}', 'null params unchanged');
assertEq(svc.injectParams('Hi {{name}}', undefined), 'Hi {{name}}', 'undefined params unchanged');
assertEq(svc.injectParams('Hi {{name}}', 'not object' as any), 'Hi {{name}}', 'non-object params unchanged');

// Single placeholder
assertEq(svc.injectParams('Hello {{name}}', { name: 'Alice' }), 'Hello Alice', 'single replaced');
// Multiple + repeat
assertEq(
  svc.injectParams('{{greeting}}, {{name}}! {{greeting}} again.', { greeting: 'Hi', name: 'Bob' }),
  'Hi, Bob! Hi again.',
  'multi + repeat'
);
// Missing placeholder left as-is
assertEq(
  svc.injectParams('Hi {{name}} from {{city}}', { name: 'Alice' }),
  'Hi Alice from {{city}}',
  'unresolved left in place'
);
// Non-string param coerced via String()
assertEq(svc.injectParams('Count: {{n}}', { n: 42 }), 'Count: 42', 'number coerced');
assertEq(svc.injectParams('Flag: {{b}}', { b: true }), 'Flag: true', 'boolean coerced');
// $-character in value handled literally (regression guard)
assertEq(
  svc.injectParams('Price: {{amount}}', { amount: '$5.00' }),
  'Price: $5.00',
  '$ char literal (no $& interpretation)'
);
assertEq(
  svc.injectParams('x={{v}}', { v: '$1$&' }),
  'x=$1$&',
  '$1 / $& treated literally'
);

// hasOwnProperty guard — inherited props not used
{
  const proto: any = { inherited: 'SHOULD_NOT_USE' };
  const params = Object.create(proto);
  assertEq(
    svc.injectParams('{{inherited}}', params),
    '{{inherited}}',
    'inherited prop ignored'
  );
}

// ============================================================================
// injectStepParams
// ============================================================================
console.log('\n── injectStepParams ─────────────────────────────────────');

{
  const step = {
    step_number: 1,
    title: '{{action}} the {{resource}}',
    purpose: 'Perform {{action}}',
    component: '{{resource}}Component',
    expected_outcome: 'All {{resource}}s {{action}}ed',
    requirements_summary: 'Requires {{resource}}',
    other_field: 'unchanged {{action}}',
    depends_on_step: 0,
  };
  const result = svc.injectStepParams(step, { action: 'update', resource: 'user' });

  assertEq(result.title, 'update the user', 'title injected');
  assertEq(result.purpose, 'Perform update', 'purpose injected');
  assertEq(result.component, 'userComponent', 'component injected');
  assertEq(result.expected_outcome, 'All users updateed', 'expected_outcome injected');
  assertEq(result.requirements_summary, 'Requires user', 'requirements_summary injected');
  // Other fields untouched
  assertEq(result.other_field, 'unchanged {{action}}', 'other_field untouched (not in inject list)');
  assertEq(result.step_number, 1, 'step_number preserved');
  assertEq(result.depends_on_step, 0, 'depends_on_step preserved');
  assert(result !== step, 'returns new object (not mutated)');
}

// ============================================================================
// validateParams
// ============================================================================
console.log('\n── validateParams ───────────────────────────────────────');

// No template params → valid
{
  const r = svc.validateParams([], { a: 1 });
  assertEq(r.valid, true, 'empty template params → valid');
  assertEq(r.errors, [], 'no errors');
  assertEq(r.resolved_params, { a: 1 }, 'provided passed through');
}
{
  const r = svc.validateParams(null, null);
  assertEq(r.valid, true, 'null templateParams → valid');
  assertEq(r.resolved_params, {}, 'null provided → {}');
}

// Required missing → error
{
  const r = svc.validateParams(
    [{ name: 'city', label: 'City Name', required: true }],
    {}
  );
  assertEq(r.valid, false, 'missing required → invalid');
  assertEq(r.errors.length, 1, '1 error');
  assert(r.errors[0].includes('City Name'), 'error uses label');
  assert(r.errors[0].includes('missing'), 'error says missing');
}

// Required missing but default provided → resolved
{
  const r = svc.validateParams(
    [{ name: 'city', required: true, default_value: 'NYC' }],
    {}
  );
  assertEq(r.valid, true, 'default fills in');
  assertEq(r.resolved_params.city, 'NYC', 'default value used');
}

// Required with empty string → still treated as missing
{
  const r = svc.validateParams(
    [{ name: 'title', required: true }],
    { title: '' }
  );
  assertEq(r.valid, false, 'empty string → missing');
}

// Optional missing, no default → skipped (not in resolved)
{
  const r = svc.validateParams(
    [{ name: 'note', required: false }],
    {}
  );
  assertEq(r.valid, true, 'optional missing is ok');
  assertEq(r.resolved_params, {}, 'optional without default not in resolved');
}

// Optional missing, default provided → resolved
{
  const r = svc.validateParams(
    [{ name: 'note', required: false, default_value: 'n/a' }],
    {}
  );
  assertEq(r.resolved_params.note, 'n/a', 'optional default used');
}

// Number type coercion
{
  const r = svc.validateParams(
    [{ name: 'count', type: 'number' }],
    { count: '42' }
  );
  assertEq(r.valid, true, 'valid number string');
  assertEq(r.resolved_params.count, 42, 'coerced to number');
}
{
  const r = svc.validateParams(
    [{ name: 'count', type: 'number' }],
    { count: 'abc' }
  );
  assertEq(r.valid, false, 'non-numeric → invalid');
  assert(r.errors[0].includes('must be a number'), 'error message');
}

// Boolean coercion
{
  const r = svc.validateParams(
    [{ name: 'flag', type: 'boolean' }],
    { flag: true }
  );
  assertEq(r.resolved_params.flag, true, 'true → true');
}
{
  const r = svc.validateParams(
    [{ name: 'flag', type: 'boolean' }],
    { flag: 'true' }
  );
  assertEq(r.resolved_params.flag, true, '"true" string → true');
}
{
  const r = svc.validateParams(
    [{ name: 'flag', type: 'boolean' }],
    { flag: 'no' }
  );
  assertEq(r.resolved_params.flag, false, 'other string → false');
}

// Enum validation
{
  const r = svc.validateParams(
    [{ name: 'color', type: 'enum', options: ['red', 'green', 'blue'] }],
    { color: 'red' }
  );
  assertEq(r.valid, true, 'enum valid');
  assertEq(r.resolved_params.color, 'red', 'enum preserved');
}
{
  const r = svc.validateParams(
    [{ name: 'color', type: 'enum', options: ['red', 'green', 'blue'] }],
    { color: 'purple' }
  );
  assertEq(r.valid, false, 'enum invalid');
  assert(r.errors[0].includes('one of'), 'error lists options');
}

// Default string coerce
{
  const r = svc.validateParams(
    [{ name: 'msg' }],
    { msg: 123 }
  );
  assertEq(r.resolved_params.msg, '123', 'default type → String()');
}

// Multiple errors accumulated
{
  const r = svc.validateParams(
    [
      { name: 'a', required: true },
      { name: 'b', type: 'number' },
    ],
    { b: 'not-a-number' }
  );
  assertEq(r.valid, false, 'multiple errors');
  assertEq(r.errors.length, 2, '2 errors');
}

// ============================================================================
// previewInstantiation — template not found
// ============================================================================
console.log('\n── previewInstantiation: not found ──────────────────────');

{
  resetStubs();
  getTemplateByIdResult = null;
  let thrown = false;
  try {
    await svc.previewInstantiation(1, {});
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('not found'), 'error message');
  }
  assert(thrown, 'throws when template not found');
}

// ============================================================================
// previewInstantiation — happy path
// ============================================================================
console.log('\n── previewInstantiation: happy path ─────────────────────');

{
  resetStubs();
  getTemplateByIdResult = {
    id: 42,
    name: 'Test Workflow for {{resource}}',
    description: 'Processes {{resource}}',
    category: 'admin',
    version: 3,
    release_mode: 'staged',
    parameters: [
      { name: 'resource', required: true },
      { name: 'count', type: 'number', default_value: 5, required: false },
    ],
    steps: [
      {
        step_number: 1,
        title: 'Fetch {{resource}}',
        purpose: 'Get all {{count}} {{resource}}s',
        component: '{{resource}}Service',
        expected_outcome: 'Got {{resource}}s',
        requirements_summary: '',
        prompt_type: 'code',
        depends_on_step: 0,
      },
      {
        step_number: 2,
        title: 'Validate {{resource}}',
        purpose: 'Check {{resource}} integrity',
        component: '{{resource}}Validator',
        expected_outcome: '{{resource}} valid',
        requirements_summary: 'none',
        prompt_type: 'code',
        depends_on_step: 1,
      },
    ],
  };

  const preview = await svc.previewInstantiation(42, { resource: 'user' });

  assertEq(getTemplateByIdCalls, [42], 'getTemplateById called once');
  assertEq(getVersionSnapshotCalls, [], 'no version snapshot');

  assertEq(preview.workflow.name, 'Test Workflow for user', 'workflow name injected');
  assertEq(preview.workflow.description, 'Processes user', 'description injected');
  // component picks from steps[0].component
  assertEq(preview.workflow.component, 'userService', 'component from steps[0]');

  assertEq(preview.steps.length, 2, '2 steps');
  assertEq(preview.steps[0].title, 'Fetch user', 'step 0 title');
  assertEq(preview.steps[0].purpose, 'Get all 5 users', 'step 0 uses default count');
  assertEq(preview.steps[1].title, 'Validate user', 'step 1 title');

  assertEq(preview.parameters_used, { resource: 'user', count: 5 }, 'resolved params include default');
  assertEq(preview.template.id, 42, 'template id');
  assertEq(preview.template.name, 'Test Workflow for {{resource}}', 'template name (raw)');
  assertEq(preview.template.version, 3, 'template version');
  assertEq(preview.template.category, 'admin', 'template category');
  assertEq(preview.template_release_mode, 'staged', 'release_mode pulled');
  assertEq(preview.unresolved_warnings, [], 'no unresolved warnings');
}

// ============================================================================
// previewInstantiation — unresolved warnings
// ============================================================================
console.log('\n── previewInstantiation: unresolved warnings ────────────');

{
  resetStubs();
  getTemplateByIdResult = {
    id: 1,
    name: 'T',
    category: 'admin',
    parameters: [{ name: 'resource', required: true }],
    steps: [
      {
        step_number: 1,
        title: '{{resource}} and {{unknown}}',
        purpose: 'p',
        component: 'c',
        expected_outcome: 'e',
        requirements_summary: 'Another {{missing}} here',
      },
    ],
  };
  const preview = await svc.previewInstantiation(1, { resource: 'user' });
  assert(preview.unresolved_warnings.length >= 1, 'has unresolved warnings');
  const joined = preview.unresolved_warnings.join(' ');
  assert(joined.includes('{{unknown}}'), 'warns about {{unknown}}');
  assert(joined.includes('{{missing}}'), 'warns about {{missing}}');
  assert(joined.includes('Step 1'), 'warning mentions step number');
}

// ============================================================================
// previewInstantiation — validation failure
// ============================================================================
console.log('\n── previewInstantiation: validation failure ─────────────');

{
  resetStubs();
  getTemplateByIdResult = {
    id: 1,
    name: 'T',
    category: 'admin',
    parameters: [{ name: 'resource', required: true }],
    steps: [],
  };
  let thrown = false;
  try {
    await svc.previewInstantiation(1, {}); // missing resource
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('Parameter validation failed'), 'error prefix');
    assert(e.message.includes('resource'), 'mentions param');
  }
  assert(thrown, 'throws on validation failure');
}

// ============================================================================
// previewInstantiation — with version (uses snapshot)
// ============================================================================
console.log('\n── previewInstantiation: with version ───────────────────');

{
  resetStubs();
  getVersionSnapshotResult = {
    snapshot: {
      name: 'Snap',
      category: 'admin',
      parameters: [],
      steps: [{ step_number: 1, title: 'ok', component: 'x' }],
    },
  };
  const preview = await svc.previewInstantiation(77, {}, 5);
  assertEq(getTemplateByIdCalls, [], 'getTemplateById NOT called');
  assertEq(getVersionSnapshotCalls, [{ id: 77, version: 5 }], 'version snapshot called');
  assertEq(preview.template.id, 77, 'id from param');
  assertEq(preview.template.version, 5, 'version from param');
}

// version snapshot not found
{
  resetStubs();
  getVersionSnapshotResult = null;
  let thrown = false;
  try {
    await svc.previewInstantiation(77, {}, 99);
  } catch (e: any) {
    thrown = true;
    assert(
      e.message.includes('version 99'),
      'version snapshot error message'
    );
  }
  assert(thrown, 'version snapshot throws');
}

// ============================================================================
// instantiate — happy path
// ============================================================================
console.log('\n── instantiate: happy path ──────────────────────────────');

{
  resetStubs();
  getTemplateByIdResult = {
    id: 10,
    name: 'Instantiate {{what}}',
    description: 'Doing {{what}}',
    category: 'admin',
    version: 2,
    release_mode: 'direct',
    parameters: [{ name: 'what', required: true }],
    steps: [{
      step_number: 1,
      title: 'Do {{what}}',
      purpose: 'Do',
      component: 'Svc',
      expected_outcome: 'Done',
      requirements_summary: '',
      prompt_type: 'code',
      depends_on_step: 0,
    }],
  };
  createWorkflowResult = { id: 555, name: 'Instantiate thing' };

  const result = await svc.instantiate(10, { what: 'thing' }, 'alice');

  // createWorkflow called with correct shape + actor
  assertEq(createWorkflowCalls.length, 1, 'createWorkflow called once');
  const call = createWorkflowCalls[0];
  assertEq(call.actor, 'alice', 'actor forwarded');
  assertEq(call.def.name, 'Instantiate thing', 'name injected');
  assertEq(call.def.description, 'Doing thing', 'description injected');
  assertEq(call.def.component, 'Svc', 'component from step[0]');
  assertEq(call.def.release_mode, 'direct', 'release_mode forwarded');
  assertEq(call.def.steps.length, 1, '1 step');
  assertEq(call.def.steps[0].title, 'Do thing', 'step title injected');
  // Ensures only whitelisted step fields forwarded
  const stepKeys = Object.keys(call.def.steps[0]).sort();
  assertEq(
    stepKeys,
    [
      'component', 'depends_on_step', 'expected_outcome', 'prompt_type',
      'purpose', 'requirements_summary', 'step_number', 'title',
    ],
    'only whitelisted step fields passed'
  );

  // Two pool queries: tag workflow + increment usage
  assertEq(poolCalls.length, 2, '2 pool queries');
  assert(/UPDATE prompt_workflows/i.test(poolCalls[0].sql), 'UPDATE prompt_workflows');
  assertEq(poolCalls[0].params, [10, 2, 555], 'template_id, version, workflow.id');
  assert(/UPDATE workflow_templates/i.test(poolCalls[1].sql), 'UPDATE workflow_templates');
  assert(/usage_count = usage_count \+ 1/i.test(poolCalls[1].sql), 'increments usage');
  assertEq(poolCalls[1].params, [10], 'template id param');

  // Return shape
  assertEq(result.workflow, { id: 555, name: 'Instantiate thing' }, 'returns workflow');
  assertEq(result.template.id, 10, 'returns template');
  assertEq(result.parameters_used, { what: 'thing' }, 'returns parameters_used');
}

// ============================================================================
// instantiate — version defaults to 1 if missing
// ============================================================================
console.log('\n── instantiate: version default ─────────────────────────');

{
  resetStubs();
  getTemplateByIdResult = {
    id: 11,
    name: 'n',
    category: 'admin',
    parameters: [],
    steps: [{ step_number: 1, title: 'x', component: 'c' }],
    // no version field
  };
  await svc.instantiate(11, {}, 'bob');
  // template_version param index 1 should be 1
  assertEq(poolCalls[0].params[1], 1, 'version defaults to 1');
}

// ============================================================================
// instantiate — unresolved placeholders → throws
// ============================================================================
console.log('\n── instantiate: unresolved placeholders ─────────────────');

{
  resetStubs();
  getTemplateByIdResult = {
    id: 12,
    name: 'n',
    category: 'admin',
    parameters: [],
    steps: [{
      step_number: 1,
      title: 'missing {{x}}',
      component: 'c',
    }],
  };
  let thrown = false;
  try {
    await svc.instantiate(12, {}, 'carol');
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('Unresolved'), 'error prefix');
    assert(e.message.includes('{{x}}'), 'error mentions placeholder');
  }
  assert(thrown, 'throws on unresolved');
  assertEq(createWorkflowCalls.length, 0, 'createWorkflow NOT called');
  assertEq(poolCalls.length, 0, 'no pool queries');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
