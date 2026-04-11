#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateInstantiationService.js (OMD-1094)
 *
 * Turns a workflow template + parameter values into a concrete workflow.
 * Three external deps:
 *   - ./workflowTemplateService  (getTemplateById, getVersionSnapshot)
 *   - ./workflowService          (createWorkflow)
 *   - ../config/db               (getAppPool)
 *
 * All stubbed via require.cache BEFORE requiring the SUT.
 *
 * Coverage:
 *   - injectParams: {{param}} substitution, non-string inputs, missing params,
 *                   `$` in values treated literally, unresolved placeholders
 *   - injectStepParams: applies to all 5 text fields, preserves other keys
 *   - validateParams:
 *       · no params → valid
 *       · missing required → errors
 *       · missing required with default_value → uses default
 *       · optional missing with default → uses default; optional missing without → skipped
 *       · number coercion (valid + NaN)
 *       · boolean coercion (true, 'true', other)
 *       · enum validation (valid + invalid)
 *       · string coercion fallback
 *   - previewInstantiation:
 *       · template not found → throws
 *       · validation failure → throws
 *       · version snapshot path (getTemplateSnapshot)
 *       · happy path returns workflow/steps/template shape
 *       · unresolved_warnings captures leftover {{...}} placeholders
 *   - instantiate:
 *       · unresolved warnings → throws
 *       · happy path calls createWorkflow and updates tags/usage_count
 *       · return shape
 *
 * Run: npx tsx server/src/services/__tests__/templateInstantiationService.test.ts
 */

import * as pathMod from 'path';

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

// ── Fakes ─────────────────────────────────────────────────────────────
let templateById: any = null;
let versionSnapshot: any = null;
const fakeTemplateService = {
  getTemplateById: async (_id: any) => templateById,
  getVersionSnapshot: async (_id: any, _v: any) => versionSnapshot,
};

type CreateCall = { def: any; actor: any };
const createCalls: CreateCall[] = [];
let createReturn: any = { id: 500, name: 'created' };
let createThrows = false;
const fakeWorkflowService = {
  createWorkflow: async (def: any, actor: any) => {
    createCalls.push({ def, actor });
    if (createThrows) throw new Error('create failed');
    return createReturn;
  },
};

type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    return [{}, []];
  },
};
const fakeDbModule = { getAppPool: () => fakePool };

// ── Stub modules (both .js and .ts keys) ─────────────────────────────
const fsSync = require('fs');
function stubModule(relFromSrc: string, exports: any) {
  const absWithoutExt = pathMod.resolve(__dirname, '..', '..', relFromSrc);
  const candidates = [`${absWithoutExt}.js`, `${absWithoutExt}.ts`];
  for (const c of candidates) {
    if (fsSync.existsSync(c)) {
      require.cache[c] = { id: c, filename: c, loaded: true, exports } as any;
    }
  }
}

stubModule('services/workflowTemplateService', fakeTemplateService);
stubModule('services/workflowService', fakeWorkflowService);
stubModule('config/db', fakeDbModule);

function resetAll() {
  templateById = null;
  versionSnapshot = null;
  createCalls.length = 0;
  createReturn = { id: 500, name: 'created' };
  createThrows = false;
  queryLog.length = 0;
}

// Silence
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

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

assertEq(injectParams('', {}), '', 'empty string passthrough');
assertEq(injectParams(null, {}), null, 'null passthrough');
assertEq(injectParams(undefined, {}), undefined, 'undefined passthrough');
assertEq(injectParams(42 as any, {}), 42 as any, 'non-string passthrough');
assertEq(injectParams('no placeholders', {}), 'no placeholders', 'no placeholders');
assertEq(injectParams('Hello {{name}}', { name: 'World' }), 'Hello World', 'single substitution');
assertEq(
  injectParams('{{a}} and {{b}}', { a: 'X', b: 'Y' }),
  'X and Y',
  'multiple substitutions'
);
assertEq(
  injectParams('Hello {{name}}', {}),
  'Hello {{name}}',
  'missing param: left as-is'
);
assertEq(
  injectParams('{{a}}', { a: 100 }),
  '100',
  'number coerced to string'
);
// $ handling (critical: must not be interpreted as replacement pattern)
assertEq(
  injectParams('Cost: {{price}}', { price: '$20' }),
  'Cost: $20',
  '$ in value is literal'
);
assertEq(
  injectParams('{{val}}', { val: '$& $1 $$' }),
  '$& $1 $$',
  'special regex substitution chars literal'
);
assertEq(injectParams('text', null as any), 'text', 'null params');
assertEq(injectParams('text', undefined as any), 'text', 'undefined params');

// ============================================================================
// injectStepParams
// ============================================================================
console.log('\n── injectStepParams ──────────────────────────────────────');

{
  const step = {
    step_number: 1,
    title: 'Build {{feature}}',
    purpose: 'Create {{feature}} module',
    component: '{{area}}',
    expected_outcome: 'Works for {{feature}}',
    requirements_summary: 'Needs {{feature}}',
    prompt_type: 'code-generation',
    depends_on_step: null,
  };
  const out = injectStepParams(step, { feature: 'Login', area: 'auth' });
  assertEq(out.title, 'Build Login', 'title injected');
  assertEq(out.purpose, 'Create Login module', 'purpose injected');
  assertEq(out.component, 'auth', 'component injected');
  assertEq(out.expected_outcome, 'Works for Login', 'expected_outcome injected');
  assertEq(out.requirements_summary, 'Needs Login', 'requirements_summary injected');
  assertEq(out.step_number, 1, 'step_number preserved');
  assertEq(out.prompt_type, 'code-generation', 'prompt_type preserved');
  assertEq(out.depends_on_step, null, 'depends_on_step preserved');
}

// ============================================================================
// validateParams — no params
// ============================================================================
console.log('\n── validateParams: no params ─────────────────────────────');

{
  const r = validateParams(null, { foo: 'bar' });
  assertEq(r.valid, true, 'null template → valid');
  assertEq(r.resolved_params, { foo: 'bar' }, 'passes through provided');
}
{
  const r = validateParams([], {});
  assertEq(r.valid, true, 'empty template → valid');
  assertEq(r.resolved_params, {}, 'empty resolved');
}

// ============================================================================
// validateParams — missing required
// ============================================================================
console.log('\n── validateParams: missing required ──────────────────────');

{
  const r = validateParams(
    [{ name: 'feature', label: 'Feature Name', required: true }],
    {}
  );
  assertEq(r.valid, false, 'invalid');
  assertEq(r.errors.length, 1, '1 error');
  assert(r.errors[0].includes('Feature Name'), 'error uses label');
}

// Missing required with default_value → uses default
{
  const r = validateParams(
    [{ name: 'lang', required: true, default_value: 'en' }],
    {}
  );
  assertEq(r.valid, true, 'valid with default');
  assertEq(r.resolved_params.lang, 'en', 'default applied');
}

// Empty string counts as missing
{
  const r = validateParams(
    [{ name: 'foo', required: true }],
    { foo: '' }
  );
  assertEq(r.valid, false, 'empty string is missing');
}

// Optional missing without default → skipped (no error, not in resolved)
{
  const r = validateParams(
    [{ name: 'note', required: false }],
    {}
  );
  assertEq(r.valid, true, 'optional missing: valid');
  assertEq(r.resolved_params.note, undefined, 'not in resolved');
}

// Optional missing with default → uses default
{
  const r = validateParams(
    [{ name: 'note', required: false, default_value: 'hi' }],
    {}
  );
  assertEq(r.resolved_params.note, 'hi', 'optional default applied');
}

// ============================================================================
// validateParams — type coercion
// ============================================================================
console.log('\n── validateParams: type coercion ─────────────────────────');

// number
{
  const r = validateParams([{ name: 'n', type: 'number' }], { n: '42' });
  assertEq(r.valid, true, 'number valid');
  assertEq(r.resolved_params.n, 42, 'coerced to number');
}
{
  const r = validateParams([{ name: 'n', type: 'number' }], { n: 'abc' });
  assertEq(r.valid, false, 'NaN invalid');
  assert(r.errors[0].includes('must be a number'), 'error mentions number');
}

// boolean
{
  const r = validateParams([{ name: 'b', type: 'boolean' }], { b: true });
  assertEq(r.resolved_params.b, true, 'bool true');
}
{
  const r = validateParams([{ name: 'b', type: 'boolean' }], { b: 'true' });
  assertEq(r.resolved_params.b, true, "string 'true' → true");
}
{
  const r = validateParams([{ name: 'b', type: 'boolean' }], { b: 'false' });
  assertEq(r.resolved_params.b, false, "string 'false' → false");
}
{
  const r = validateParams([{ name: 'b', type: 'boolean' }], { b: 1 });
  assertEq(r.resolved_params.b, false, 'non-true number → false');
}

// enum
{
  const r = validateParams(
    [{ name: 'color', type: 'enum', options: ['red', 'blue'] }],
    { color: 'red' }
  );
  assertEq(r.valid, true, 'enum valid');
  assertEq(r.resolved_params.color, 'red', 'enum stored');
}
{
  const r = validateParams(
    [{ name: 'color', type: 'enum', options: ['red', 'blue'] }],
    { color: 'green' }
  );
  assertEq(r.valid, false, 'enum invalid');
  assert(r.errors[0].includes('red, blue'), 'error lists options');
}

// string fallback
{
  const r = validateParams([{ name: 's' }], { s: 42 });
  assertEq(r.resolved_params.s, '42', 'coerced to string');
}

// ============================================================================
// previewInstantiation — template not found
// ============================================================================
console.log('\n── previewInstantiation: not found ───────────────────────');

resetAll();
{
  let caught: any = null;
  try { await previewInstantiation(1, {}); } catch (e) { caught = e; }
  assert(caught !== null, 'throws when template not found');
  assert(caught && /Template not found/.test(caught.message), 'error message');
}

// ============================================================================
// previewInstantiation — validation failure
// ============================================================================
console.log('\n── previewInstantiation: validation failure ──────────────');

resetAll();
templateById = {
  id: 1, name: 'T', description: '', category: 'auth',
  parameters: [{ name: 'required_p', required: true, label: 'Required Param' }],
  steps: [],
};
{
  let caught: any = null;
  try { await previewInstantiation(1, {}); } catch (e) { caught = e; }
  assert(caught !== null, 'validation failure throws');
  assert(
    caught && /Parameter validation failed/.test(caught.message),
    'error message'
  );
}

// ============================================================================
// previewInstantiation — happy path
// ============================================================================
console.log('\n── previewInstantiation: happy path ──────────────────────');

resetAll();
templateById = {
  id: 1,
  name: '{{feature}} Workflow',
  description: 'Builds {{feature}}',
  category: 'frontend',
  version: 3,
  release_mode: 'staging',
  parameters: [{ name: 'feature', required: true }],
  steps: [
    {
      step_number: 1,
      title: 'Design {{feature}}',
      purpose: 'plan',
      component: 'ui',
      expected_outcome: 'mockups',
      requirements_summary: 'mockups for {{feature}}',
      prompt_type: 'design',
      depends_on_step: null,
    },
    {
      step_number: 2,
      title: 'Implement {{feature}}',
      purpose: 'build',
      component: 'ui',
      expected_outcome: 'shipped',
      requirements_summary: '',
      prompt_type: 'code-generation',
      depends_on_step: 1,
    },
  ],
};

{
  const p = await previewInstantiation(1, { feature: 'Login' });
  assertEq(p.workflow.name, 'Login Workflow', 'workflow name injected');
  assertEq(p.workflow.description, 'Builds Login', 'description injected');
  // component uses first step's component
  assertEq(p.workflow.component, 'ui', 'workflow component from step 1');
  assertEq(p.steps.length, 2, '2 steps');
  assertEq(p.steps[0].title, 'Design Login', 'step 1 injected');
  assertEq(p.steps[0].requirements_summary, 'mockups for Login', 'step 1 requirements');
  assertEq(p.steps[1].title, 'Implement Login', 'step 2 injected');
  assertEq(p.parameters_used, { feature: 'Login' }, 'parameters_used');
  assertEq(p.template.id, 1, 'template.id');
  assertEq(p.template.name, '{{feature}} Workflow', 'raw template name preserved');
  assertEq(p.template.version, 3, 'template.version');
  assertEq(p.template.category, 'frontend', 'template.category');
  assertEq(p.template_release_mode, 'staging', 'release_mode');
  assertEq(p.unresolved_warnings, [], 'no unresolved');
}

// ============================================================================
// previewInstantiation — unresolved placeholders captured
// ============================================================================
console.log('\n── previewInstantiation: unresolved placeholders ─────────');

resetAll();
templateById = {
  id: 1, name: 'T', description: '', category: 'x', version: 1,
  parameters: [], // No declared params
  steps: [
    {
      step_number: 1,
      title: 'Build {{ghost}}', // never resolved
      purpose: '',
      component: '',
      expected_outcome: '',
      requirements_summary: '',
    },
  ],
};

{
  const p = await previewInstantiation(1, {});
  assert(p.unresolved_warnings.length > 0, 'unresolved warnings populated');
  assert(p.unresolved_warnings[0].includes('{{ghost}}'), 'warning names the placeholder');
  assert(p.unresolved_warnings[0].includes('title'), 'warning names the field');
  assert(p.unresolved_warnings[0].includes('Step 1'), 'warning has step number');
}

// ============================================================================
// previewInstantiation — version snapshot path
// ============================================================================
console.log('\n── previewInstantiation: version snapshot ────────────────');

resetAll();
versionSnapshot = {
  snapshot: {
    name: 'Snapshot T',
    description: '',
    category: 'x',
    parameters: [],
    steps: [{ step_number: 1, title: 'A', purpose: '', component: 'c', expected_outcome: '', requirements_summary: '' }],
  },
};

{
  const p = await previewInstantiation(99, {}, 5);
  assertEq(p.template.id, 99, 'snapshot: template.id = templateId');
  assertEq(p.template.version, 5, 'snapshot: template.version = version arg');
  assertEq(p.workflow.name, 'Snapshot T', 'snapshot workflow name');
}

// Snapshot not found → throws
resetAll();
versionSnapshot = null;
{
  let caught: any = null;
  try { await previewInstantiation(99, {}, 5); } catch (e) { caught = e; }
  assert(caught !== null, 'snapshot missing throws');
  assert(caught && /version 5 not found/.test(caught.message), 'error message');
}

// ============================================================================
// instantiate — unresolved warnings → throws
// ============================================================================
console.log('\n── instantiate: unresolved warnings throw ────────────────');

resetAll();
templateById = {
  id: 1, name: 'T', description: '', category: 'x',
  parameters: [],
  steps: [
    { step_number: 1, title: 'Use {{ghost}}', purpose: '', component: '', expected_outcome: '', requirements_summary: '' },
  ],
};

{
  let caught: any = null;
  try { await instantiate(1, {}, { user: 'alice' }); } catch (e) { caught = e; }
  assert(caught !== null, 'throws on unresolved');
  assert(caught && /Unresolved template parameters/.test(caught.message), 'error message');
}

// ============================================================================
// instantiate — happy path
// ============================================================================
console.log('\n── instantiate: happy path ───────────────────────────────');

resetAll();
templateById = {
  id: 10,
  name: '{{feature}} Workflow',
  description: 'Build {{feature}}',
  category: 'frontend',
  version: 2,
  release_mode: 'production',
  parameters: [{ name: 'feature', required: true }],
  steps: [
    {
      step_number: 1,
      title: 'Step A {{feature}}',
      purpose: 'p',
      component: 'c',
      expected_outcome: 'o',
      requirements_summary: 'r',
      prompt_type: 'code-generation',
      depends_on_step: null,
    },
  ],
};
createReturn = { id: 777, name: 'Login Workflow' };

{
  const result = await instantiate(10, { feature: 'Login' }, { user: 'bob' });

  // createWorkflow was called correctly
  assertEq(createCalls.length, 1, 'createWorkflow called once');
  assertEq(createCalls[0].def.name, 'Login Workflow', 'name injected');
  assertEq(createCalls[0].def.description, 'Build Login', 'description injected');
  assertEq(createCalls[0].def.release_mode, 'production', 'release_mode propagated');
  assertEq(createCalls[0].def.steps.length, 1, '1 step');
  assertEq(createCalls[0].def.steps[0].title, 'Step A Login', 'step title injected');
  assertEq(createCalls[0].def.steps[0].prompt_type, 'code-generation', 'prompt_type propagated');
  assertEq(createCalls[0].actor, { user: 'bob' }, 'actor propagated');

  // Two follow-up queries: tag the workflow + increment usage
  assertEq(queryLog.length, 2, '2 follow-up queries');
  assert(/UPDATE prompt_workflows/.test(queryLog[0].sql), 'first: tag workflow');
  assertEq(queryLog[0].params, [10, 2, 777], 'tag params [templateId, version, workflowId]');
  assert(/UPDATE workflow_templates/.test(queryLog[1].sql), 'second: increment usage');
  assert(/usage_count = usage_count \+ 1/.test(queryLog[1].sql), 'usage increment expression');
  assertEq(queryLog[1].params, [10], 'usage params [templateId]');

  // Return shape
  assertEq(result.workflow.id, 777, 'returns workflow');
  assertEq(result.template.id, 10, 'returns template');
  assertEq(result.parameters_used, { feature: 'Login' }, 'parameters_used');
}

// Version defaults to 1 when template has no version
resetAll();
templateById = {
  id: 11, name: 'T', description: '', category: 'x',
  parameters: [],
  steps: [{ step_number: 1, title: 'A', purpose: '', component: 'c', expected_outcome: '', requirements_summary: '' }],
};
createReturn = { id: 100 };

{
  await instantiate(11, {}, { user: 'z' });
  // Version default = 1
  assertEq(queryLog[0].params[1], 1, 'version defaults to 1');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
