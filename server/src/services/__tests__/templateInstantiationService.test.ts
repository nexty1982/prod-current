#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateInstantiationService.js (OMD-1151)
 *
 * Dependencies stubbed via require.cache BEFORE requiring SUT:
 *   - ./workflowTemplateService: getTemplateById / getVersionSnapshot
 *   - ./workflowService:         createWorkflow
 *   - ../config/db:              getAppPool (route-dispatch fake pool)
 *
 * Coverage:
 *   - injectParams: null/non-string/non-object guards, placeholder sub,
 *       unresolved placeholders left as-is, $ literal preservation
 *   - injectStepParams: preserves other fields, injects known text fields
 *   - validateParams:
 *       · empty param defs → valid with providedParams as resolved
 *       · required missing → error
 *       · required missing w/ default_value → resolved to default
 *       · optional missing w/ default_value → resolved
 *       · number type coercion + NaN rejection
 *       · boolean coercion (true | 'true' → true, else false)
 *       · enum validation + options check
 *       · default string coercion
 *   - previewInstantiation:
 *       · template not found → throws
 *       · validation failure → throws
 *       · happy path: injected name/desc/steps, parameters_used,
 *         template metadata, unresolved_warnings detected
 *       · version snapshot path
 *   - instantiate:
 *       · unresolved warnings → throws (no DB writes, no createWorkflow)
 *       · happy path: createWorkflow called with preview fields, tags
 *         workflow with template_id/version, increments usage_count,
 *         returns { workflow, template, parameters_used }
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

// ── workflowTemplateService stub ─────────────────────────────────────
let templateByIdReturn: any = null;
let versionSnapshotReturn: any = null;
const templateCalls: Array<{ method: string; args: any[] }> = [];

const workflowTemplateServiceStub = {
  getTemplateById: async (id: number) => {
    templateCalls.push({ method: 'getTemplateById', args: [id] });
    return templateByIdReturn;
  },
  getVersionSnapshot: async (id: number, version: number) => {
    templateCalls.push({ method: 'getVersionSnapshot', args: [id, version] });
    return versionSnapshotReturn;
  },
};

// ── workflowService stub ─────────────────────────────────────────────
let createWorkflowReturn: any = { id: 777, name: 'fake-workflow' };
let createWorkflowThrows = false;
const workflowCalls: Array<{ method: string; args: any[] }> = [];

const workflowServiceStub = {
  createWorkflow: async (workflow: any, actor: any) => {
    workflowCalls.push({ method: 'createWorkflow', args: [workflow, actor] });
    if (createWorkflowThrows) throw new Error('createWorkflow failed');
    return createWorkflowReturn;
  },
};

// ── db stub (route-dispatch fake pool) ───────────────────────────────
type QueryCall = { sql: string; params: any[] };
const dbQueries: QueryCall[] = [];

const fakeAppPool = {
  query: async (sql: string, params: any[] = []) => {
    dbQueries.push({ sql, params });
    return [{ affectedRows: 1 }];
  },
};

const dbStub = { getAppPool: () => fakeAppPool };

// Install stubs into require.cache — handle both .ts and .js resolutions
function installStub(relPath: string, exports: any): void {
  const tsxResolved = require.resolve(relPath);
  const alt = tsxResolved.endsWith('.ts')
    ? tsxResolved.replace(/\.ts$/, '.js')
    : tsxResolved.replace(/\.js$/, '.ts');
  for (const p of [tsxResolved, alt]) {
    require.cache[p] = { id: p, filename: p, loaded: true, exports } as any;
  }
}

installStub('../workflowTemplateService', workflowTemplateServiceStub);
installStub('../workflowService', workflowServiceStub);
installStub('../../config/db', dbStub);

function resetState() {
  templateCalls.length = 0;
  workflowCalls.length = 0;
  dbQueries.length = 0;
  templateByIdReturn = null;
  versionSnapshotReturn = null;
  createWorkflowReturn = { id: 777, name: 'fake-workflow' };
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

assertEq(injectParams(null, { a: 1 }), null, 'null text passthrough');
assertEq(injectParams(undefined, { a: 1 }), undefined, 'undefined passthrough');
assertEq(injectParams('', { a: 1 }), '', 'empty string passthrough');
assertEq(injectParams(123 as any, { a: 1 }), 123, 'non-string passthrough');
assertEq(injectParams('hello {{name}}', null), 'hello {{name}}', 'null params passthrough');
assertEq(injectParams('hello {{name}}', 'not-obj' as any), 'hello {{name}}', 'non-object passthrough');

assertEq(
  injectParams('hello {{name}}!', { name: 'Alice' }),
  'hello Alice!',
  'single substitution'
);
assertEq(
  injectParams('{{a}} and {{b}}', { a: 'x', b: 'y' }),
  'x and y',
  'multiple substitutions'
);
assertEq(
  injectParams('{{missing}} here', { other: 'val' }),
  '{{missing}} here',
  'unresolved placeholder preserved'
);
assertEq(
  injectParams('price: ${{amount}}', { amount: '$50' }),
  'price: $$50',
  '$ literal in replacement value preserved'
);
assertEq(
  injectParams('{{num}}', { num: 42 }),
  '42',
  'numeric param stringified'
);
assertEq(
  injectParams('{{flag}}', { flag: true }),
  'true',
  'boolean param stringified'
);

// ============================================================================
// injectStepParams
// ============================================================================
console.log('\n── injectStepParams ──────────────────────────────────────');

{
  const step = {
    step_number: 1,
    title: 'Build {{component}}',
    purpose: 'Add {{feature}}',
    component: '{{component}}',
    expected_outcome: 'Shipped {{feature}}',
    requirements_summary: 'Use {{tech}}',
    prompt_type: 'generate',
    depends_on_step: null,
  };
  const out = injectStepParams(step, { component: 'auth', feature: 'SSO', tech: 'OAuth' });
  assertEq(out.step_number, 1, 'preserves step_number');
  assertEq(out.prompt_type, 'generate', 'preserves prompt_type');
  assertEq(out.depends_on_step, null, 'preserves depends_on_step');
  assertEq(out.title, 'Build auth', 'injects title');
  assertEq(out.purpose, 'Add SSO', 'injects purpose');
  assertEq(out.component, 'auth', 'injects component');
  assertEq(out.expected_outcome, 'Shipped SSO', 'injects expected_outcome');
  assertEq(out.requirements_summary, 'Use OAuth', 'injects requirements_summary');
}

// ============================================================================
// validateParams
// ============================================================================
console.log('\n── validateParams ────────────────────────────────────────');

// Empty template param defs
{
  const r = validateParams([], { a: 1 });
  assertEq(r.valid, true, 'empty defs → valid');
  assertEq(r.errors, [], 'no errors');
  assertEq(r.resolved_params, { a: 1 }, 'providedParams passed through');
}
{
  const r = validateParams(null, { a: 1 });
  assertEq(r.valid, true, 'null defs → valid');
  assertEq(r.resolved_params, { a: 1 }, 'providedParams passed through');
}
{
  const r = validateParams([], null);
  assertEq(r.resolved_params, {}, 'null params → empty resolved');
}

// Required missing
{
  const r = validateParams(
    [{ name: 'title', label: 'Title', required: true }],
    {}
  );
  assertEq(r.valid, false, 'required missing → invalid');
  assert(r.errors.length === 1, 'one error');
  assert(r.errors[0].includes('Title'), 'error uses label');
}

// Required missing with default
{
  const r = validateParams(
    [{ name: 'count', required: true, default_value: 10 }],
    {}
  );
  assertEq(r.valid, true, 'required w/ default → valid');
  assertEq(r.resolved_params.count, 10, 'default applied');
}

// Optional missing with default
{
  const r = validateParams(
    [{ name: 'tag', required: false, default_value: 'prod' }],
    {}
  );
  assertEq(r.valid, true, 'optional w/ default → valid');
  assertEq(r.resolved_params.tag, 'prod', 'default applied');
}

// Optional missing without default → not in resolved
{
  const r = validateParams(
    [{ name: 'extra', required: false }],
    {}
  );
  assertEq(r.valid, true, 'optional missing → valid');
  assertEq(r.resolved_params.extra, undefined, 'key not present');
}

// Number coercion
{
  const r = validateParams(
    [{ name: 'n', type: 'number' }],
    { n: '42' }
  );
  assertEq(r.valid, true, 'number from string → valid');
  assertEq(r.resolved_params.n, 42, 'coerced to number');
}
{
  const r = validateParams(
    [{ name: 'n', type: 'number' }],
    { n: 'abc' }
  );
  assertEq(r.valid, false, 'NaN → invalid');
  assert(r.errors[0].includes('must be a number'), 'error mentions number');
}

// Boolean coercion
{
  const r = validateParams(
    [
      { name: 'a', type: 'boolean' },
      { name: 'b', type: 'boolean' },
      { name: 'c', type: 'boolean' },
    ],
    { a: true, b: 'true', c: 'false' }
  );
  assertEq(r.resolved_params.a, true, 'true → true');
  assertEq(r.resolved_params.b, true, "'true' → true");
  assertEq(r.resolved_params.c, false, "'false' → false");
}

// Enum validation
{
  const r = validateParams(
    [{ name: 'env', type: 'enum', options: ['dev', 'stg', 'prod'] }],
    { env: 'prod' }
  );
  assertEq(r.valid, true, 'valid enum');
  assertEq(r.resolved_params.env, 'prod', 'enum stored');
}
{
  const r = validateParams(
    [{ name: 'env', type: 'enum', options: ['dev', 'stg', 'prod'] }],
    { env: 'bogus' }
  );
  assertEq(r.valid, false, 'invalid enum');
  assert(r.errors[0].includes('must be one of'), 'error mentions options');
}

// Default string coercion
{
  const r = validateParams(
    [{ name: 'name' }],
    { name: 123 }
  );
  assertEq(r.resolved_params.name, '123', 'default string coercion');
}

// Empty string treated as missing
{
  const r = validateParams(
    [{ name: 'x', required: true }],
    { x: '' }
  );
  assertEq(r.valid, false, 'empty string treated as missing');
}

// ============================================================================
// previewInstantiation — template not found
// ============================================================================
console.log('\n── previewInstantiation: not found ───────────────────────');

resetState();
templateByIdReturn = null;
{
  let caught: Error | null = null;
  try { await previewInstantiation(1, {}); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when template missing');
  assert(caught !== null && caught.message.includes('not found'), 'error mentions not found');
}

// ============================================================================
// previewInstantiation — validation failure
// ============================================================================
console.log('\n── previewInstantiation: validation failure ──────────────');

resetState();
templateByIdReturn = {
  id: 1,
  name: 'Tmpl',
  description: '',
  category: 'backend',
  parameters: [{ name: 'component', required: true }],
  steps: [],
};
{
  let caught: Error | null = null;
  try { await previewInstantiation(1, {}); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on validation failure');
  assert(caught !== null && caught.message.includes('Parameter validation failed'), 'error mentions validation');
}

// ============================================================================
// previewInstantiation — happy path
// ============================================================================
console.log('\n── previewInstantiation: happy path ──────────────────────');

resetState();
templateByIdReturn = {
  id: 7,
  name: 'Build {{component}} feature',
  description: 'A template for {{component}}',
  category: 'backend',
  version: 3,
  release_mode: 'shadow',
  parameters: [{ name: 'component', required: true }],
  steps: [
    {
      step_number: 1,
      title: 'Design {{component}}',
      purpose: 'Plan {{component}} work',
      component: '{{component}}',
      expected_outcome: '{{component}} plan',
      requirements_summary: 'Use best practices',
      prompt_type: 'plan',
      depends_on_step: null,
    },
    {
      step_number: 2,
      title: 'Implement {{component}}',
      purpose: '{{component}}',
      component: '{{component}}',
      expected_outcome: 'Working {{component}}',
      requirements_summary: 'Code',
      prompt_type: 'generate',
      depends_on_step: 1,
    },
  ],
};
{
  const p = await previewInstantiation(7, { component: 'auth' });
  assertEq(p.workflow.name, 'Build auth feature', 'name injected');
  assertEq(p.workflow.description, 'A template for auth', 'desc injected');
  assertEq(p.workflow.component, 'auth', 'workflow.component from step[0]');
  assertEq(p.steps.length, 2, 'two steps');
  assertEq(p.steps[0].title, 'Design auth', 'step[0].title injected');
  assertEq(p.steps[1].depends_on_step, 1, 'depends_on_step preserved');
  assertEq(p.parameters_used, { component: 'auth' }, 'parameters_used');
  assertEq(p.template.id, 7, 'template.id');
  assertEq(p.template.name, 'Build {{component}} feature', 'template.name original');
  assertEq(p.template.version, 3, 'template.version');
  assertEq(p.template.category, 'backend', 'template.category');
  assertEq(p.template_release_mode, 'shadow', 'release_mode propagated');
  assertEq(p.unresolved_warnings.length, 0, 'no unresolved');
}

// Unresolved warnings detection
resetState();
templateByIdReturn = {
  id: 8,
  name: 'T',
  description: '',
  category: 'backend',
  parameters: [], // no params required
  steps: [
    {
      step_number: 1,
      title: 'Has {{missing}}',
      purpose: 'OK',
      component: 'c',
      expected_outcome: 'out',
      requirements_summary: 'r',
      prompt_type: 'gen',
    },
  ],
};
{
  const p = await previewInstantiation(8, {});
  assertEq(p.unresolved_warnings.length, 1, 'one unresolved warning');
  assert(p.unresolved_warnings[0].includes('missing'), 'names placeholder');
  assert(p.unresolved_warnings[0].includes('Step 1 title'), 'names field');
}

// Version snapshot path
resetState();
versionSnapshotReturn = {
  snapshot: {
    name: 'Snapshot {{x}}',
    description: '',
    category: 'docs',
    parameters: [],
    steps: [],
  },
};
{
  const p = await previewInstantiation(5, { x: 'v1' }, 2);
  assertEq(templateCalls[0].method, 'getVersionSnapshot', 'uses snapshot API');
  assertEq(templateCalls[0].args, [5, 2], 'snapshot args');
  assertEq(p.workflow.name, 'Snapshot v1', 'name injected from snapshot');
  assertEq(p.template.version, 2, 'version set from arg');
  assertEq(p.template.id, 5, 'id set');
}

// Version snapshot missing
resetState();
versionSnapshotReturn = null;
{
  let caught: Error | null = null;
  try { await previewInstantiation(5, {}, 9); } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing snapshot throws');
  assert(caught !== null && caught.message.includes('version 9'), 'error names version');
}

// ============================================================================
// instantiate — unresolved warnings → throws
// ============================================================================
console.log('\n── instantiate: unresolved → throws ──────────────────────');

resetState();
templateByIdReturn = {
  id: 9,
  name: 'T',
  description: '',
  category: 'backend',
  parameters: [],
  steps: [{
    step_number: 1,
    title: 'Unresolved {{x}}',
    purpose: 'p', component: 'c',
    expected_outcome: 'e', requirements_summary: 'r',
    prompt_type: 'gen',
  }],
};
{
  let caught: Error | null = null;
  try { await instantiate(9, {}, { id: 1 }); } catch (e: any) { caught = e; }
  assert(caught !== null, 'unresolved throws');
  assert(caught !== null && caught.message.includes('Unresolved template parameters'), 'error message');
  assertEq(workflowCalls.length, 0, 'no createWorkflow');
  assertEq(dbQueries.length, 0, 'no DB writes');
}

// ============================================================================
// instantiate — happy path
// ============================================================================
console.log('\n── instantiate: happy path ───────────────────────────────');

resetState();
templateByIdReturn = {
  id: 10,
  name: '{{kind}} workflow',
  description: 'For {{kind}}',
  category: 'backend',
  version: 2,
  release_mode: 'live',
  parameters: [{ name: 'kind', required: true }],
  steps: [
    {
      step_number: 1,
      title: 'Do {{kind}}',
      purpose: '{{kind}}',
      component: '{{kind}}',
      expected_outcome: 'done',
      requirements_summary: 'r',
      prompt_type: 'plan',
      depends_on_step: null,
    },
  ],
};
createWorkflowReturn = { id: 555, name: 'auth workflow' };
{
  const result = await instantiate(10, { kind: 'auth' }, { id: 42, email: 'a@b' });

  assertEq(workflowCalls.length, 1, 'createWorkflow called once');
  const [wfArg, actorArg] = workflowCalls[0].args;
  assertEq(wfArg.name, 'auth workflow', 'wf.name injected');
  assertEq(wfArg.description, 'For auth', 'wf.description injected');
  assertEq(wfArg.component, 'auth', 'wf.component injected');
  assertEq(wfArg.release_mode, 'live', 'release_mode propagated');
  assertEq(wfArg.steps.length, 1, 'one step passed');
  assertEq(wfArg.steps[0].title, 'Do auth', 'step injected');
  assertEq(wfArg.steps[0].step_number, 1, 'step_number preserved');
  assertEq(wfArg.steps[0].prompt_type, 'plan', 'prompt_type preserved');
  assertEq(actorArg.id, 42, 'actor passed');

  // DB writes: 1) UPDATE prompt_workflows template tag, 2) UPDATE usage_count
  assertEq(dbQueries.length, 2, 'two DB queries');
  assert(/UPDATE prompt_workflows SET template_id/.test(dbQueries[0].sql), 'first: tag workflow');
  assertEq(dbQueries[0].params, [10, 2, 555], 'tag params [templateId, version, workflowId]');
  assert(/workflow_templates SET usage_count/.test(dbQueries[1].sql), 'second: usage count');
  assertEq(dbQueries[1].params, [10], 'usage count by templateId');

  assertEq(result.workflow.id, 555, 'returns workflow');
  assertEq(result.template.id, 10, 'returns template');
  assertEq(result.parameters_used, { kind: 'auth' }, 'returns parameters_used');
}

// instantiate falls back to version=1 when template.version missing
resetState();
templateByIdReturn = {
  id: 11,
  name: 'x',
  description: '',
  category: 'backend',
  parameters: [],
  steps: [{
    step_number: 1,
    title: 't', purpose: 'p', component: 'c',
    expected_outcome: 'e', requirements_summary: 'r',
    prompt_type: 'gen', depends_on_step: null,
  }],
};
createWorkflowReturn = { id: 600 };
{
  await instantiate(11, {}, { id: 1 });
  assertEq(dbQueries[0].params, [11, 1, 600], 'defaults version to 1');
}

// Propagates createWorkflow errors
resetState();
templateByIdReturn = {
  id: 12,
  name: 'x',
  description: '',
  category: 'backend',
  parameters: [],
  steps: [{
    step_number: 1,
    title: 't', purpose: 'p', component: 'c',
    expected_outcome: 'e', requirements_summary: 'r',
    prompt_type: 'gen', depends_on_step: null,
  }],
};
createWorkflowThrows = true;
{
  let caught: Error | null = null;
  try { await instantiate(12, {}, { id: 1 }); } catch (e: any) { caught = e; }
  assert(caught !== null, 'createWorkflow error propagates');
  assertEq(dbQueries.length, 0, 'no DB writes on error');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
