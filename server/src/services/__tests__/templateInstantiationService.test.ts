#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateInstantiationService.js (OMD-1060)
 *
 * Instantiates workflow templates by substituting {{param_name}} placeholders
 * and delegating to workflowService.createWorkflow.
 *
 * External deps (all stubbed via require.cache BEFORE requiring SUT):
 *   - ./workflowTemplateService  (getTemplateById, getVersionSnapshot)
 *   - ./workflowService          (createWorkflow)
 *   - ../config/db               (getAppPool → fake pool)
 *
 * Coverage:
 *   - injectParams:     simple, multiple, missing → leave as-is, $ literal,
 *                       empty/non-string, no params
 *   - injectStepParams: applies to title/purpose/component/expected_outcome/
 *                       requirements_summary; preserves other fields
 *   - validateParams:   no params → valid; required missing → error; default
 *                       applied when missing; number/boolean/enum coercion;
 *                       enum out-of-range error; optional-with-default
 *   - previewInstantiation: happy path, missing template, validation failure,
 *                       version snapshot, unresolved placeholder warning,
 *                       template release_mode passthrough
 *   - instantiate:      happy path (creates workflow + tags + increments usage),
 *                       unresolved → throws, version passthrough
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

// ─── Stubs ──────────────────────────────────────────────────────────────────

type Call = { method: string; args: any[] };
const calls: Call[] = [];

let templateByIdResult: any = null;
let templateByIdThrows: Error | null = null;
let versionSnapshotResult: any = null;

const templateServiceStub = {
  getTemplateById: async (id: number) => {
    calls.push({ method: 'getTemplateById', args: [id] });
    if (templateByIdThrows) throw templateByIdThrows;
    return templateByIdResult;
  },
  getVersionSnapshot: async (id: number, v: number) => {
    calls.push({ method: 'getVersionSnapshot', args: [id, v] });
    return versionSnapshotResult;
  },
};

let createWorkflowResult: any = { id: 555 };
let createWorkflowThrows: Error | null = null;

const workflowServiceStub = {
  createWorkflow: async (def: any, actor: any) => {
    calls.push({ method: 'createWorkflow', args: [def, actor] });
    if (createWorkflowThrows) throw createWorkflowThrows;
    return createWorkflowResult;
  },
};

// ── Fake DB pool ──
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

// Register stubs BEFORE requiring SUT
const tplSvcPath = require.resolve('../workflowTemplateService');
require.cache[tplSvcPath] = {
  id: tplSvcPath, filename: tplSvcPath, loaded: true, exports: templateServiceStub,
} as any;

const wfSvcPath = require.resolve('../workflowService');
require.cache[wfSvcPath] = {
  id: wfSvcPath, filename: wfSvcPath, loaded: true, exports: workflowServiceStub,
} as any;

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

function resetState() {
  calls.length = 0;
  queryLog.length = 0;
  templateByIdResult = null;
  templateByIdThrows = null;
  versionSnapshotResult = null;
  createWorkflowResult = { id: 555 };
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

assertEq(injectParams('Hello {{name}}', { name: 'World' }), 'Hello World', 'simple substitution');
assertEq(
  injectParams('{{a}}-{{b}}-{{a}}', { a: 'X', b: 'Y' }),
  'X-Y-X',
  'multiple + repeated placeholders'
);
assertEq(
  injectParams('Hi {{user}} and {{missing}}', { user: 'Alice' }),
  'Hi Alice and {{missing}}',
  'missing param leaves placeholder'
);
assertEq(
  injectParams('Price: {{price}}', { price: '$1.00' }),
  'Price: $1.00',
  '$ in value preserved literally'
);
assertEq(
  injectParams('Ref: {{code}}', { code: '$&$1$$' }),
  'Ref: $&$1$$',
  'regex-special $& $1 $$ preserved literally'
);
assertEq(injectParams('', { a: 'b' }), '', 'empty string → empty');
assertEq(injectParams(null, { a: 'b' }), null, 'null → null');
assertEq(injectParams(undefined, { a: 'b' }), undefined, 'undefined → undefined');
assertEq(injectParams(123 as any, { a: 'b' }), 123, 'non-string returned as-is');
assertEq(injectParams('no placeholders here', {}), 'no placeholders here', 'text without placeholders');
assertEq(injectParams('Hello {{x}}', null as any), 'Hello {{x}}', 'null params → text unchanged');
assertEq(injectParams('Hello {{x}}', 'bogus' as any), 'Hello {{x}}', 'non-object params → text unchanged');
assertEq(
  injectParams('Count: {{n}}', { n: 42 }),
  'Count: 42',
  'number value coerced via String()'
);
assertEq(
  injectParams('Flag: {{on}}', { on: true }),
  'Flag: true',
  'boolean value coerced via String()'
);

// ============================================================================
// injectStepParams
// ============================================================================
console.log('\n── injectStepParams ──────────────────────────────────────');

{
  const step = {
    step_number: 1,
    title: 'Build {{component}}',
    purpose: 'Ship {{feature}}',
    component: '{{component}}',
    expected_outcome: '{{component}} works',
    requirements_summary: 'Needs {{dep}}',
    depends_on_step: null,
    prompt_type: 'implementation',
  };
  const params = { component: 'UserMenu', feature: 'search', dep: 'axios' };
  const out = injectStepParams(step, params);

  assertEq(out.title, 'Build UserMenu', 'title injected');
  assertEq(out.purpose, 'Ship search', 'purpose injected');
  assertEq(out.component, 'UserMenu', 'component injected');
  assertEq(out.expected_outcome, 'UserMenu works', 'expected_outcome injected');
  assertEq(out.requirements_summary, 'Needs axios', 'requirements_summary injected');
  assertEq(out.step_number, 1, 'step_number preserved');
  assertEq(out.depends_on_step, null, 'depends_on_step preserved');
  assertEq(out.prompt_type, 'implementation', 'prompt_type preserved');
}

// ============================================================================
// validateParams
// ============================================================================
console.log('\n── validateParams ────────────────────────────────────────');

// No template params → valid, provided params returned
{
  const r = validateParams([], { a: 1 });
  assertEq(r.valid, true, 'empty template params → valid');
  assertEq(r.resolved_params, { a: 1 }, 'provided params returned as-is');
}

// null template params → valid
{
  const r = validateParams(null, {});
  assertEq(r.valid, true, 'null template params → valid');
  assertEq(r.resolved_params, {}, 'empty resolved');
}

// Required param missing → error
{
  const r = validateParams(
    [{ name: 'component', label: 'Component Name', type: 'string' }],
    {}
  );
  assertEq(r.valid, false, 'required missing → invalid');
  assertEq(r.errors.length, 1, 'one error');
  assert(r.errors[0].includes('Component Name'), 'error uses label');
}

// Required missing with default → default applied
{
  const r = validateParams(
    [{ name: 'level', type: 'string', default_value: 'medium' }],
    {}
  );
  assertEq(r.valid, true, 'missing+default → valid');
  assertEq(r.resolved_params.level, 'medium', 'default applied');
}

// Required param provided → string coerce
{
  const r = validateParams(
    [{ name: 'component', type: 'string' }],
    { component: 'UserMenu' }
  );
  assertEq(r.valid, true, 'string provided → valid');
  assertEq(r.resolved_params.component, 'UserMenu', 'string value');
}

// Number coercion — valid
{
  const r = validateParams(
    [{ name: 'count', type: 'number' }],
    { count: '42' }
  );
  assertEq(r.valid, true, 'number string → valid');
  assertEq(r.resolved_params.count, 42, 'coerced to number');
}

// Number coercion — invalid
{
  const r = validateParams(
    [{ name: 'count', type: 'number' }],
    { count: 'nope' }
  );
  assertEq(r.valid, false, 'non-numeric → invalid');
  assert(r.errors[0].includes('must be a number'), 'error mentions number');
}

// Boolean coercion
{
  const r = validateParams(
    [
      { name: 'enabled', type: 'boolean' },
      { name: 'visible', type: 'boolean' },
      { name: 'active', type: 'boolean' },
    ],
    { enabled: true, visible: 'true', active: 'false' }
  );
  assertEq(r.valid, true, 'boolean coerce → valid');
  assertEq(r.resolved_params.enabled, true, 'true boolean');
  assertEq(r.resolved_params.visible, true, '"true" string → true');
  assertEq(r.resolved_params.active, false, '"false" string → false');
}

// Enum coercion — valid
{
  const r = validateParams(
    [{ name: 'priority', type: 'enum', options: ['low', 'medium', 'high'] }],
    { priority: 'high' }
  );
  assertEq(r.valid, true, 'enum match → valid');
  assertEq(r.resolved_params.priority, 'high', 'enum value');
}

// Enum coercion — invalid
{
  const r = validateParams(
    [{ name: 'priority', type: 'enum', options: ['low', 'medium', 'high'] }],
    { priority: 'urgent' }
  );
  assertEq(r.valid, false, 'enum miss → invalid');
  assert(r.errors[0].includes('must be one of'), 'error mentions allowed values');
  assert(r.errors[0].includes('low, medium, high'), 'error lists options');
}

// Optional param (required:false) missing → skipped
{
  const r = validateParams(
    [{ name: 'extra', type: 'string', required: false }],
    {}
  );
  assertEq(r.valid, true, 'optional missing → valid');
  assertEq('extra' in r.resolved_params, false, 'optional skipped (no default)');
}

// Optional with default → default applied when missing
{
  const r = validateParams(
    [{ name: 'theme', type: 'string', required: false, default_value: 'light' }],
    {}
  );
  assertEq(r.valid, true, 'optional+default → valid');
  assertEq(r.resolved_params.theme, 'light', 'default applied to optional');
}

// Empty string treated as missing
{
  const r = validateParams(
    [{ name: 'name', type: 'string' }],
    { name: '' }
  );
  assertEq(r.valid, false, 'empty string counts as missing');
}

// Multiple errors collected
{
  const r = validateParams(
    [
      { name: 'a', type: 'string' },
      { name: 'b', type: 'number' },
    ],
    { b: 'not-a-number' }
  );
  assertEq(r.valid, false, 'multiple errors → invalid');
  assertEq(r.errors.length, 2, 'two errors collected');
}

// ============================================================================
// previewInstantiation — happy path
// ============================================================================
console.log('\n── previewInstantiation: happy path ──────────────────────');

resetState();
templateByIdResult = {
  id: 10,
  name: 'Build {{component}}',
  description: '{{component}} implementation',
  category: 'frontend',
  version: 2,
  release_mode: 'staged',
  parameters: [
    { name: 'component', type: 'string' },
  ],
  steps: [
    {
      step_number: 1,
      title: 'Design {{component}}',
      purpose: 'Plan {{component}}',
      component: '{{component}}',
      prompt_type: 'design',
      expected_outcome: '{{component}} designed',
      requirements_summary: 'Needs figma',
      depends_on_step: null,
    },
    {
      step_number: 2,
      title: 'Implement {{component}}',
      purpose: 'Code {{component}}',
      component: '{{component}}',
      prompt_type: 'implementation',
      expected_outcome: '{{component}} shipped',
      requirements_summary: 'Needs react',
      depends_on_step: 1,
    },
  ],
};
{
  const preview = await previewInstantiation(10, { component: 'UserMenu' });
  assertEq(preview.workflow.name, 'Build UserMenu', 'workflow name injected');
  assertEq(preview.workflow.description, 'UserMenu implementation', 'description injected');
  assertEq(preview.workflow.component, 'UserMenu', 'workflow component from step[0]');
  assertEq(preview.steps.length, 2, '2 steps');
  assertEq(preview.steps[0].title, 'Design UserMenu', 'step 1 title injected');
  assertEq(preview.steps[1].title, 'Implement UserMenu', 'step 2 title injected');
  assertEq(preview.parameters_used, { component: 'UserMenu' }, 'resolved params returned');
  assertEq(preview.template.id, 10, 'template id');
  assertEq(preview.template.name, 'Build {{component}}', 'template name raw (not injected)');
  assertEq(preview.template.version, 2, 'template version');
  assertEq(preview.template.category, 'frontend', 'template category');
  assertEq(preview.template_release_mode, 'staged', 'release_mode passthrough');
  assertEq(preview.unresolved_warnings.length, 0, 'no unresolved');
  assertEq(calls[0].method, 'getTemplateById', 'called getTemplateById');
  assertEq(calls[0].args[0], 10, 'with templateId');
}

// ============================================================================
// previewInstantiation — template not found
// ============================================================================
console.log('\n── previewInstantiation: template not found ──────────────');

resetState();
templateByIdResult = null;
{
  let caught: Error | null = null;
  try {
    await previewInstantiation(999, {});
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'throws when template missing');
  assert(caught !== null && caught.message.includes('Template not found'), 'error message');
}

// ============================================================================
// previewInstantiation — validation failure
// ============================================================================
console.log('\n── previewInstantiation: validation failure ──────────────');

resetState();
templateByIdResult = {
  id: 11,
  name: 'Test',
  parameters: [{ name: 'component', label: 'Component', type: 'string' }],
  steps: [],
};
{
  let caught: Error | null = null;
  try {
    await previewInstantiation(11, {});
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'throws on validation failure');
  assert(
    caught !== null && caught.message.includes('Parameter validation failed'),
    'error mentions validation'
  );
  assert(
    caught !== null && caught.message.includes('Component'),
    'error includes missing param label'
  );
}

// ============================================================================
// previewInstantiation — version snapshot path
// ============================================================================
console.log('\n── previewInstantiation: version snapshot ────────────────');

resetState();
versionSnapshotResult = {
  snapshot: {
    name: 'Old {{component}}',
    description: '',
    category: 'legacy',
    parameters: [{ name: 'component', type: 'string' }],
    steps: [
      {
        step_number: 1,
        title: '{{component}}',
        purpose: '',
        component: '{{component}}',
        prompt_type: 'impl',
        expected_outcome: '',
        requirements_summary: '',
        depends_on_step: null,
      },
    ],
  },
};
{
  const preview = await previewInstantiation(20, { component: 'Legacy' }, 3);
  assertEq(calls[0].method, 'getVersionSnapshot', 'called getVersionSnapshot');
  assertEq(calls[0].args[0], 20, 'with templateId');
  assertEq(calls[0].args[1], 3, 'with version');
  assertEq(preview.workflow.name, 'Old Legacy', 'snapshot name injected');
  assertEq(preview.template.version, 3, 'version from arg');
  assertEq(preview.template.id, 20, 'id from arg');
}

// Version snapshot missing → throws
resetState();
versionSnapshotResult = null;
{
  let caught: Error | null = null;
  try {
    await previewInstantiation(20, {}, 3);
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'missing snapshot → throws');
  assert(
    caught !== null && caught.message.includes('version 3 not found'),
    'error mentions version'
  );
}

// ============================================================================
// previewInstantiation — unresolved placeholder warnings
// ============================================================================
console.log('\n── previewInstantiation: unresolved warnings ─────────────');

resetState();
templateByIdResult = {
  id: 12,
  name: 'Test',
  description: '',
  category: 'misc',
  parameters: [{ name: 'a', type: 'string' }],
  steps: [
    {
      step_number: 1,
      title: 'Hello {{a}}',
      purpose: 'Unknown {{ghost}}',  // unresolved
      component: '{{a}}',
      prompt_type: 'impl',
      expected_outcome: '{{phantom}}',  // unresolved
      requirements_summary: '',
      depends_on_step: null,
    },
  ],
};
{
  const preview = await previewInstantiation(12, { a: 'Alice' });
  assert(preview.unresolved_warnings.length >= 2, 'unresolved warnings collected');
  const joined = preview.unresolved_warnings.join('\n');
  assert(joined.includes('{{ghost}}'), 'warning mentions ghost');
  assert(joined.includes('{{phantom}}'), 'warning mentions phantom');
  assert(joined.includes('Step 1'), 'warning includes step number');
  assertEq(preview.steps[0].title, 'Hello Alice', 'resolved ones still injected');
}

// release_mode null → passthrough as null
resetState();
templateByIdResult = {
  id: 13,
  name: 'NoMode',
  parameters: [],
  steps: [],
};
{
  const preview = await previewInstantiation(13, {});
  assertEq(preview.template_release_mode, null, 'null release_mode → null');
}

// Template with no steps → empty array, no warnings, workflow.component from category
resetState();
templateByIdResult = {
  id: 14,
  name: 'Empty',
  description: 'desc',
  category: 'tooling',
  parameters: [],
  steps: [],
};
{
  const preview = await previewInstantiation(14, {});
  assertEq(preview.steps, [], 'no steps');
  assertEq(preview.unresolved_warnings, [], 'no warnings');
  assertEq(preview.workflow.component, 'tooling', 'fallback to category when no step[0]');
}

// ============================================================================
// instantiate — happy path
// ============================================================================
console.log('\n── instantiate: happy path ───────────────────────────────');

resetState();
templateByIdResult = {
  id: 30,
  name: 'Build {{component}}',
  description: 'Build {{component}} feature',
  category: 'frontend',
  version: 5,
  release_mode: 'staged',
  parameters: [{ name: 'component', type: 'string' }],
  steps: [
    {
      step_number: 1,
      title: 'Design {{component}}',
      purpose: 'Plan',
      component: '{{component}}',
      prompt_type: 'design',
      expected_outcome: 'Designed',
      requirements_summary: 'req',
      depends_on_step: null,
    },
  ],
};
createWorkflowResult = { id: 999, name: 'Build UserMenu' };
{
  const result = await instantiate(30, { component: 'UserMenu' }, 'actor-alice');

  // Verify createWorkflow was called with injected values
  const cwCall = calls.find(c => c.method === 'createWorkflow');
  assert(cwCall !== undefined, 'createWorkflow called');
  assertEq(cwCall!.args[0].name, 'Build UserMenu', 'workflow name injected');
  assertEq(cwCall!.args[0].description, 'Build UserMenu feature', 'description injected');
  assertEq(cwCall!.args[0].component, 'UserMenu', 'component injected');
  assertEq(cwCall!.args[0].release_mode, 'staged', 'release_mode propagated');
  assertEq(cwCall!.args[0].steps.length, 1, '1 step passed');
  assertEq(cwCall!.args[0].steps[0].title, 'Design UserMenu', 'step title injected');
  assertEq(cwCall!.args[0].steps[0].step_number, 1, 'step_number');
  assertEq(cwCall!.args[0].steps[0].depends_on_step, null, 'depends_on_step');
  assertEq(cwCall!.args[1], 'actor-alice', 'actor passed');

  // Verify DB tagging
  assertEq(queryLog.length, 2, 'two UPDATE queries');
  assert(/UPDATE prompt_workflows/.test(queryLog[0].sql), 'first: tag workflow');
  assert(queryLog[0].sql.includes('template_id'), 'sets template_id');
  assert(queryLog[0].sql.includes('template_version'), 'sets template_version');
  assertEq(queryLog[0].params[0], 30, 'templateId param');
  assertEq(queryLog[0].params[1], 5, 'version param');
  assertEq(queryLog[0].params[2], 999, 'workflow.id param');

  assert(/UPDATE workflow_templates/.test(queryLog[1].sql), 'second: increment usage');
  assert(queryLog[1].sql.includes('usage_count'), 'usage_count column');
  assertEq(queryLog[1].params[0], 30, 'templateId for usage increment');

  // Return shape
  assertEq(result.workflow.id, 999, 'returns workflow');
  assertEq(result.template.id, 30, 'returns template info');
  assertEq(result.parameters_used.component, 'UserMenu', 'returns resolved params');
}

// ============================================================================
// instantiate — unresolved placeholder → throws
// ============================================================================
console.log('\n── instantiate: unresolved → throws ──────────────────────');

resetState();
templateByIdResult = {
  id: 31,
  name: 'X',
  parameters: [],
  steps: [
    {
      step_number: 1,
      title: 'Use {{ghost}}',
      purpose: '',
      component: '',
      prompt_type: 'impl',
      expected_outcome: '',
      requirements_summary: '',
      depends_on_step: null,
    },
  ],
};
{
  let caught: Error | null = null;
  try {
    await instantiate(31, {}, 'actor');
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'unresolved → throws');
  assert(
    caught !== null && caught.message.includes('Unresolved template parameters'),
    'error message'
  );
  // createWorkflow NOT called
  const cwCall = calls.find(c => c.method === 'createWorkflow');
  assert(cwCall === undefined, 'createWorkflow not called');
  assertEq(queryLog.length, 0, 'no DB queries');
}

// ============================================================================
// instantiate — missing template version defaults to 1
// ============================================================================
console.log('\n── instantiate: version default ──────────────────────────');

resetState();
templateByIdResult = {
  id: 32,
  name: 'V',
  parameters: [],
  steps: [
    {
      step_number: 1,
      title: 'Hi',
      purpose: '',
      component: 'x',
      prompt_type: 'impl',
      expected_outcome: '',
      requirements_summary: '',
      depends_on_step: null,
    },
  ],
  // no version field, no release_mode
};
createWorkflowResult = { id: 888 };
{
  await instantiate(32, {}, 'actor');
  // template_version param defaults to 1 when preview.template.version is falsy
  assertEq(queryLog[0].params[1], 1, 'template_version defaults to 1');

  // release_mode null when absent
  const cwCall = calls.find(c => c.method === 'createWorkflow');
  assertEq(cwCall!.args[0].release_mode, null, 'release_mode null when absent');
}

// ============================================================================
// instantiate — version parameter passthrough
// ============================================================================
console.log('\n── instantiate: version arg ──────────────────────────────');

resetState();
versionSnapshotResult = {
  snapshot: {
    name: 'Snap',
    description: '',
    category: 'c',
    parameters: [],
    steps: [
      {
        step_number: 1,
        title: 'Snap step',
        purpose: '',
        component: 'c',
        prompt_type: 'impl',
        expected_outcome: '',
        requirements_summary: '',
        depends_on_step: null,
      },
    ],
  },
};
createWorkflowResult = { id: 777 };
{
  await instantiate(40, {}, 'actor-b', 7);
  // Version passed to getVersionSnapshot
  const gsCall = calls.find(c => c.method === 'getVersionSnapshot');
  assert(gsCall !== undefined, 'called getVersionSnapshot');
  assertEq(gsCall!.args[1], 7, 'version 7 passed');
  // template_version saved as 7
  assertEq(queryLog[0].params[1], 7, 'template_version = 7');
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
