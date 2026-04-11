#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateInstantiationService.js (OMD-1018)
 *
 * Covers the 5 exported functions:
 *   - injectParams            {{placeholder}} replacement; $-literal safety
 *   - injectStepParams        spreads step + injects 5 text fields
 *   - validateParams          required/default/type-coerce number/boolean/enum
 *   - previewInstantiation    loads template → validates → injects → warns
 *   - instantiate             delegates to workflowService + UPDATEs usage_count
 *
 * Deps stubbed via require.cache:
 *   - ./workflowTemplateService   (getTemplateById, getVersionSnapshot)
 *   - ./workflowService            (createWorkflow)
 *   - ../config/db                 (getAppPool)
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

// ── Stub: workflowTemplateService ─────────────────────────────────────
let templateByIdReturn: any = null;
let templateByIdThrows: Error | null = null;
let versionSnapshotReturn: any = null;
let versionSnapshotThrows: Error | null = null;
const templateServiceCalls: Array<{ method: string; args: any[] }> = [];

const templateServiceStub = {
  getTemplateById: async (...args: any[]) => {
    templateServiceCalls.push({ method: 'getTemplateById', args });
    if (templateByIdThrows) throw templateByIdThrows;
    return templateByIdReturn;
  },
  getVersionSnapshot: async (...args: any[]) => {
    templateServiceCalls.push({ method: 'getVersionSnapshot', args });
    if (versionSnapshotThrows) throw versionSnapshotThrows;
    return versionSnapshotReturn;
  },
};

// ── Stub: workflowService ─────────────────────────────────────────────
let createWorkflowReturn: any = { id: 42 };
let createWorkflowThrows: Error | null = null;
const workflowServiceCalls: Array<{ method: string; args: any[] }> = [];

const workflowServiceStub = {
  createWorkflow: async (...args: any[]) => {
    workflowServiceCalls.push({ method: 'createWorkflow', args });
    if (createWorkflowThrows) throw createWorkflowThrows;
    return createWorkflowReturn;
  },
};

// ── Stub: config/db ───────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    return [{ affectedRows: 1 }];
  },
};

const dbStub = {
  getAppPool: () => fakePool,
};

// Install stubs BEFORE requiring SUT
const templateSvcPath = require.resolve('../workflowTemplateService');
require.cache[templateSvcPath] = {
  id: templateSvcPath,
  filename: templateSvcPath,
  loaded: true,
  exports: templateServiceStub,
} as any;

const workflowSvcPath = require.resolve('../workflowService');
require.cache[workflowSvcPath] = {
  id: workflowSvcPath,
  filename: workflowSvcPath,
  loaded: true,
  exports: workflowServiceStub,
} as any;

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

function resetState() {
  templateByIdReturn = null;
  templateByIdThrows = null;
  versionSnapshotReturn = null;
  versionSnapshotThrows = null;
  templateServiceCalls.length = 0;
  createWorkflowReturn = { id: 42 };
  createWorkflowThrows = null;
  workflowServiceCalls.length = 0;
  queryLog.length = 0;
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
console.log('\n── injectParams ─────────────────────────────────────────');

assertEq(injectParams('Hello {{name}}', { name: 'World' }), 'Hello World', 'basic replace');
assertEq(injectParams('{{a}} + {{b}}', { a: 1, b: 2 }), '1 + 2', 'number coerced to string');
assertEq(injectParams('{{x}}', {}), '{{x}}', 'unresolved left as-is');
assertEq(injectParams('no placeholders', { x: 1 }), 'no placeholders', 'no placeholders passthrough');
assertEq(injectParams('', { x: 1 }), '', 'empty string passthrough');
assertEq(injectParams(null as any, { x: 1 }), null, 'null passthrough');
assertEq(injectParams(undefined as any, { x: 1 }), undefined, 'undefined passthrough');
assertEq(injectParams(123 as any, { x: 1 }), 123, 'non-string passthrough');
assertEq(injectParams('{{x}}', null as any), '{{x}}', 'null params passthrough');
assertEq(injectParams('{{x}}', 'notanobj' as any), '{{x}}', 'non-object params passthrough');

// $ literal safety — String.replace with string value would interpret $&, $1, $$
assertEq(
  injectParams('cost: {{price}}', { price: '$100' }),
  'cost: $100',
  '$ in value treated literally'
);
assertEq(
  injectParams('{{a}}', { a: '$&$1$$' }),
  '$&$1$$',
  '$& $1 $$ in value treated literally (replacer fn)'
);

// Multiple placeholders of same name
assertEq(
  injectParams('{{x}}-{{x}}-{{x}}', { x: 'a' }),
  'a-a-a',
  'repeated placeholders'
);

// Mixed resolved/unresolved
assertEq(
  injectParams('{{a}} and {{b}}', { a: 'one' }),
  'one and {{b}}',
  'partial resolution'
);

// hasOwnProperty check — params inherited from prototype should NOT resolve
const parent = { inherited: 'NOPE' };
const child = Object.create(parent);
child.own = 'YES';
assertEq(
  injectParams('{{own}} {{inherited}}', child),
  'YES {{inherited}}',
  'only hasOwnProperty params resolve'
);

// ============================================================================
// injectStepParams
// ============================================================================
console.log('\n── injectStepParams ─────────────────────────────────────');

{
  const step = {
    step_number: 1,
    title: 'Build {{component}}',
    purpose: 'Make {{component}} work',
    component: '{{component}}',
    expected_outcome: '{{component}} works',
    requirements_summary: 'Req for {{component}}',
    prompt_type: 'task',      // not injected but preserved
    depends_on_step: null,     // not injected but preserved
  };
  const result = injectStepParams(step, { component: 'auth' });
  assertEq(result.title, 'Build auth', 'title injected');
  assertEq(result.purpose, 'Make auth work', 'purpose injected');
  assertEq(result.component, 'auth', 'component injected');
  assertEq(result.expected_outcome, 'auth works', 'expected_outcome injected');
  assertEq(result.requirements_summary, 'Req for auth', 'requirements_summary injected');
  assertEq(result.step_number, 1, 'step_number preserved');
  assertEq(result.prompt_type, 'task', 'prompt_type preserved');
  assertEq(result.depends_on_step, null, 'depends_on_step preserved');
}

// Empty/missing fields
{
  const step: any = { step_number: 2, title: 'only title' };
  const result = injectStepParams(step, {});
  assertEq(result.title, 'only title', 'present field untouched');
  assertEq(result.purpose, undefined, 'missing purpose stays undefined');
}

// ============================================================================
// validateParams
// ============================================================================
console.log('\n── validateParams ───────────────────────────────────────');

// No template params → valid
{
  const r = validateParams(null, { x: 1 });
  assertEq(r.valid, true, 'null templateParams → valid');
  assertEq(r.resolved_params, { x: 1 }, 'providedParams echoed');
}
{
  const r = validateParams([], {});
  assertEq(r.valid, true, 'empty templateParams → valid');
  assertEq(r.resolved_params, {}, 'empty resolved');
}
{
  const r = validateParams([], undefined);
  assertEq(r.resolved_params, {}, 'undefined provided → {}');
}

// Required missing, no default → error
{
  const r = validateParams(
    [{ name: 'x', label: 'X Param', required: true }],
    {}
  );
  assertEq(r.valid, false, 'missing required → invalid');
  assertEq(r.errors.length, 1, 'one error');
  assert(r.errors[0].includes('X Param'), 'uses label in error');
}

// Required missing, has default → use default
{
  const r = validateParams(
    [{ name: 'x', required: true, default_value: 'fallback' }],
    {}
  );
  assertEq(r.valid, true, 'default_value satisfies required');
  assertEq(r.resolved_params.x, 'fallback', 'default used');
}

// Optional missing, no default → not in resolved
{
  const r = validateParams(
    [{ name: 'x', required: false }],
    {}
  );
  assertEq(r.valid, true, 'optional missing → valid');
  assertEq(r.resolved_params.x, undefined, 'not in resolved');
}

// Optional missing, has default → use default
{
  const r = validateParams(
    [{ name: 'x', required: false, default_value: 'opt' }],
    {}
  );
  assertEq(r.resolved_params.x, 'opt', 'optional default used');
}

// Empty string treated as missing
{
  const r = validateParams(
    [{ name: 'x', required: true }],
    { x: '' }
  );
  assertEq(r.valid, false, 'empty string → missing');
}

// Number type coercion
{
  const r = validateParams(
    [{ name: 'n', type: 'number' }],
    { n: '42' }
  );
  assertEq(r.resolved_params.n, 42, 'string "42" → number 42');
}
{
  const r = validateParams(
    [{ name: 'n', type: 'number' }],
    { n: 'abc' }
  );
  assertEq(r.valid, false, 'non-numeric → error');
  assert(r.errors[0].includes('number'), 'error mentions number');
}

// Boolean type coercion
{
  const r = validateParams(
    [{ name: 'b', type: 'boolean' }],
    { b: true }
  );
  assertEq(r.resolved_params.b, true, 'boolean true');
}
{
  const r = validateParams(
    [{ name: 'b', type: 'boolean' }],
    { b: 'true' }
  );
  assertEq(r.resolved_params.b, true, 'string "true" → true');
}
{
  const r = validateParams(
    [{ name: 'b', type: 'boolean' }],
    { b: 'false' }
  );
  assertEq(r.resolved_params.b, false, 'string "false" → false');
}
{
  const r = validateParams(
    [{ name: 'b', type: 'boolean' }],
    { b: 'anything-else' }
  );
  assertEq(r.resolved_params.b, false, 'non-"true" string → false');
}

// Enum type
{
  const r = validateParams(
    [{ name: 'e', type: 'enum', options: ['a', 'b', 'c'] }],
    { e: 'b' }
  );
  assertEq(r.valid, true, 'enum valid value');
  assertEq(r.resolved_params.e, 'b', 'enum value set');
}
{
  const r = validateParams(
    [{ name: 'e', type: 'enum', options: ['a', 'b'] }],
    { e: 'z' }
  );
  assertEq(r.valid, false, 'enum invalid value');
  assert(r.errors[0].includes('a, b'), 'error lists options');
}

// Default string type
{
  const r = validateParams(
    [{ name: 's' }],
    { s: 123 }
  );
  assertEq(r.resolved_params.s, '123', 'default type → String()');
}

// Multi-error aggregation
{
  const r = validateParams(
    [
      { name: 'a', required: true },
      { name: 'b', type: 'number' },
    ],
    { b: 'not-a-number' }
  );
  assertEq(r.valid, false, 'multi-error invalid');
  assertEq(r.errors.length, 2, '2 errors aggregated');
}

// ============================================================================
// previewInstantiation — template not found
// ============================================================================
console.log('\n── previewInstantiation: not found ──────────────────────');

resetState();
templateByIdReturn = null;
{
  let caught: Error | null = null;
  try {
    await previewInstantiation(99, {});
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing template throws');
  assert(caught !== null && caught.message.includes('not found'), 'error mentions not found');
  assertEq(templateServiceCalls[0].method, 'getTemplateById', 'called getTemplateById');
  assertEq(templateServiceCalls[0].args[0], 99, 'with templateId');
}

// ============================================================================
// previewInstantiation — validation failure
// ============================================================================
console.log('\n── previewInstantiation: validation failure ─────────────');

resetState();
templateByIdReturn = {
  id: 1,
  name: 'My {{widget}}',
  description: 'desc',
  category: 'test',
  parameters: [{ name: 'widget', required: true }],
  steps: [],
};
{
  let caught: Error | null = null;
  try {
    await previewInstantiation(1, {});
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'validation failure throws');
  assert(
    caught !== null && caught.message.includes('Parameter validation failed'),
    'error mentions validation'
  );
}

// ============================================================================
// previewInstantiation — happy path
// ============================================================================
console.log('\n── previewInstantiation: happy path ─────────────────────');

resetState();
templateByIdReturn = {
  id: 5,
  name: 'Build {{feature}}',
  description: 'Wire up {{feature}}',
  category: 'backend',
  release_mode: 'auto',
  version: 3,
  parameters: [
    { name: 'feature', required: true },
  ],
  steps: [
    {
      step_number: 1,
      title: 'Plan {{feature}}',
      purpose: 'Design {{feature}}',
      component: 'api',
      prompt_type: 'design',
      expected_outcome: '{{feature}} spec',
      requirements_summary: 'Requirements for {{feature}}',
      depends_on_step: null,
    },
    {
      step_number: 2,
      title: 'Implement {{feature}}',
      purpose: 'Code {{feature}}',
      component: 'api',
      prompt_type: 'implement',
      expected_outcome: '{{feature}} working',
      requirements_summary: 'Build {{feature}}',
      depends_on_step: 1,
    },
  ],
};
{
  const preview = await previewInstantiation(5, { feature: 'auth' });
  assertEq(preview.workflow.name, 'Build auth', 'workflow name injected');
  assertEq(preview.workflow.description, 'Wire up auth', 'description injected');
  assertEq(preview.workflow.component, 'api', 'component from first step');
  assertEq(preview.steps.length, 2, '2 steps');
  assertEq(preview.steps[0].title, 'Plan auth', 'step[0] title');
  assertEq(preview.steps[1].title, 'Implement auth', 'step[1] title');
  assertEq(preview.steps[1].depends_on_step, 1, 'depends_on_step preserved');
  assertEq(preview.parameters_used.feature, 'auth', 'parameters_used');
  assertEq(preview.template.id, 5, 'template.id');
  assertEq(preview.template.name, 'Build {{feature}}', 'template.name (raw)');
  assertEq(preview.template.version, 3, 'template.version');
  assertEq(preview.template.category, 'backend', 'template.category');
  assertEq(preview.template_release_mode, 'auto', 'release_mode propagated');
  assertEq(preview.unresolved_warnings, [], 'no unresolved warnings');
}

// ============================================================================
// previewInstantiation — unresolved placeholder warnings
// ============================================================================
console.log('\n── previewInstantiation: unresolved warnings ────────────');

resetState();
templateByIdReturn = {
  id: 6,
  name: 'T',
  description: '',
  category: 'x',
  parameters: [{ name: 'a' }],  // only 'a' defined — 'b' will be unresolved
  steps: [
    {
      step_number: 1,
      title: 'Use {{a}} and {{b}}',
      purpose: 'purpose {{b}}',
      component: '{{a}}',
      expected_outcome: 'ok',
      requirements_summary: 'reqs',
    },
  ],
};
{
  const preview = await previewInstantiation(6, { a: 'one' });
  assert(preview.unresolved_warnings.length >= 2, 'unresolved warnings captured (>=2)');
  const allWarnings = preview.unresolved_warnings.join(' | ');
  assert(allWarnings.includes('{{b}}'), 'warning mentions {{b}}');
  assert(allWarnings.includes('Step 1'), 'warning includes step number');
}

// ============================================================================
// previewInstantiation — version snapshot path
// ============================================================================
console.log('\n── previewInstantiation: version snapshot ───────────────');

resetState();
versionSnapshotReturn = {
  snapshot: {
    name: 'Snap T',
    description: 'from snapshot',
    category: 'cat',
    parameters: [],
    steps: [{ step_number: 1, title: 'S', component: 'c', prompt_type: 't' }],
  },
};
{
  const preview = await previewInstantiation(7, {}, 2);
  assertEq(templateServiceCalls[0].method, 'getVersionSnapshot', 'uses snapshot');
  assertEq(templateServiceCalls[0].args[0], 7, 'templateId passed');
  assertEq(templateServiceCalls[0].args[1], 2, 'version passed');
  assertEq(preview.workflow.name, 'Snap T', 'snapshot name');
  assertEq(preview.template.id, 7, 'id from snapshot wrapper');
  assertEq(preview.template.version, 2, 'version from arg');
}

// Version not found → throws
resetState();
versionSnapshotReturn = null;
{
  let caught: Error | null = null;
  try {
    await previewInstantiation(8, {}, 99);
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing version throws');
  assert(
    caught !== null && caught.message.includes('version 99'),
    'error mentions version number'
  );
}

// ============================================================================
// instantiate — happy path
// ============================================================================
console.log('\n── instantiate: happy path ──────────────────────────────');

resetState();
templateByIdReturn = {
  id: 10,
  name: 'Feature {{x}}',
  description: 'Do {{x}}',
  category: 'backend',
  release_mode: 'manual',
  version: 5,
  parameters: [{ name: 'x', required: true }],
  steps: [
    {
      step_number: 1,
      title: 'Step1 {{x}}',
      purpose: 'p',
      component: 'api',
      prompt_type: 'task',
      expected_outcome: 'o',
      requirements_summary: 'r',
      depends_on_step: null,
    },
  ],
};
createWorkflowReturn = { id: 555 };

{
  const result = await instantiate(10, { x: 'login' }, 'alice@test.com');

  // workflowService.createWorkflow called once
  assertEq(workflowServiceCalls.length, 1, 'createWorkflow called once');
  const [wfArg, actorArg] = workflowServiceCalls[0].args;
  assertEq(wfArg.name, 'Feature login', 'workflow name injected');
  assertEq(wfArg.description, 'Do login', 'description injected');
  assertEq(wfArg.component, 'api', 'component from step');
  assertEq(wfArg.release_mode, 'manual', 'release_mode propagated');
  assertEq(wfArg.steps.length, 1, '1 step');
  assertEq(wfArg.steps[0].title, 'Step1 login', 'step title injected');
  assertEq(wfArg.steps[0].prompt_type, 'task', 'prompt_type mapped');
  assertEq(actorArg, 'alice@test.com', 'actor passed');

  // 2 UPDATE queries
  assertEq(queryLog.length, 2, '2 queries');
  assert(queryLog[0].sql.includes('UPDATE prompt_workflows'), 'first updates prompt_workflows');
  assert(queryLog[0].sql.includes('template_id'), 'sets template_id');
  assertEq(queryLog[0].params[0], 10, 'templateId');
  assertEq(queryLog[0].params[1], 5, 'template version');
  assertEq(queryLog[0].params[2], 555, 'workflow.id');

  assert(queryLog[1].sql.includes('UPDATE workflow_templates'), 'second updates workflow_templates');
  assert(queryLog[1].sql.includes('usage_count'), 'increments usage_count');
  assertEq(queryLog[1].params[0], 10, 'templateId');

  // return shape
  assertEq(result.workflow.id, 555, 'returns workflow');
  assertEq(result.template.id, 10, 'returns template info');
  assertEq(result.parameters_used.x, 'login', 'returns parameters_used');
}

// ============================================================================
// instantiate — blocks on unresolved warnings
// ============================================================================
console.log('\n── instantiate: blocks on unresolved ────────────────────');

resetState();
templateByIdReturn = {
  id: 11,
  name: 'T',
  description: '',
  category: 'x',
  parameters: [{ name: 'a' }],
  steps: [
    {
      step_number: 1,
      title: 'Has {{missing}}',
      purpose: 'p',
      component: 'c',
      prompt_type: 't',
      expected_outcome: 'o',
      requirements_summary: 'r',
    },
  ],
};
{
  let caught: Error | null = null;
  try {
    await instantiate(11, { a: 'x' }, 'actor');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'unresolved throws');
  assert(
    caught !== null && caught.message.includes('Unresolved template parameters'),
    'error mentions unresolved'
  );
  assertEq(workflowServiceCalls.length, 0, 'createWorkflow NOT called');
  assertEq(queryLog.length, 0, 'no queries run');
}

// ============================================================================
// instantiate — template version default to 1
// ============================================================================
console.log('\n── instantiate: version default ─────────────────────────');

resetState();
templateByIdReturn = {
  id: 12,
  name: 'V',
  description: '',
  category: 'x',
  // no version field → defaults to 1 in UPDATE
  parameters: [],
  steps: [
    { step_number: 1, title: 'T', purpose: 'p', component: 'c', prompt_type: 't',
      expected_outcome: 'o', requirements_summary: 'r' },
  ],
};
createWorkflowReturn = { id: 600 };
{
  await instantiate(12, {}, 'actor');
  assertEq(queryLog[0].params[1], 1, 'missing version defaults to 1');
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
