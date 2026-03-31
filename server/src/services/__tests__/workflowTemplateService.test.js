/**
 * Workflow Template & Instantiation Service — Jest Tests
 *
 * Tests template validation, parameter injection, workflow generation,
 * sequence correctness, version isolation, and preview correctness.
 */

// ─── Mock DB ──────────────────────────────────────────────────────────────

const mockQueryResults = [];
let queryCalls = [];

const mockConnection = {
  query: async (...args) => {
    queryCalls.push(args);
    return mockQueryResults.shift() || [[]];
  },
  release: () => {},
};

const mockPool = {
  query: async (...args) => {
    queryCalls.push(args);
    return mockQueryResults.shift() || [[]];
  },
  getConnection: async () => mockConnection,
};

require('../../config/db').getAppPool = () => mockPool;

// ─── Mock workflowService ─────────────────────────────────────────────────

let createWorkflowCalls = [];
let createWorkflowResult = { id: 'wf-generated-1', name: 'Test Workflow' };

require('../workflowService').createWorkflow = async (data, actor) => {
  createWorkflowCalls.push({ data, actor });
  return { ...createWorkflowResult, ...data };
};

// ─── Load modules under test ──────────────────────────────────────────────

const {
  VALID_CATEGORIES,
  VALID_PROMPT_TYPES,
  VALID_DEPENDENCY_TYPES,
  VALID_PARAM_TYPES,
  validateTemplate,
  publishNewVersion,
} = require('../workflowTemplateService');

const {
  injectParams,
  injectStepParams,
  validateParams,
  previewInstantiation,
  instantiate,
} = require('../templateInstantiationService');

// ─── Helpers ──────────────────────────────────────────────────────────────

function resetMocks() {
  queryCalls = [];
  createWorkflowCalls = [];
  mockQueryResults.length = 0;
}

function makeValidTemplate(overrides = {}) {
  return {
    name: 'Add REST Endpoint',
    description: 'Template for adding a new REST endpoint',
    category: 'backend',
    parameters: [
      { name: 'resource_name', label: 'Resource Name', type: 'string' },
      { name: 'http_method', label: 'HTTP Method', type: 'enum', options: ['GET', 'POST', 'PUT', 'DELETE'] },
    ],
    steps: [
      { step_number: 1, title: 'Plan {{resource_name}} endpoint', purpose: 'Design the {{http_method}} endpoint', prompt_type: 'plan', component: '{{resource_name}}-api', dependency_type: 'none' },
      { step_number: 2, title: 'Implement {{resource_name}} route', purpose: 'Build the route handler', prompt_type: 'implementation', expected_outcome: '{{resource_name}} route responds to {{http_method}}', dependency_type: 'sequential' },
      { step_number: 3, title: 'Verify {{resource_name}} endpoint', purpose: 'Test the endpoint', prompt_type: 'verification', requirements_summary: '{{resource_name}} must return correct status codes', dependency_type: 'sequential' },
    ],
    ...overrides,
  };
}

function makeMinimalTemplate(overrides = {}) {
  return {
    name: 'Minimal',
    category: 'backend',
    steps: [
      { step_number: 1, title: 'Do thing', purpose: 'Reason', prompt_type: 'implementation' },
    ],
    ...overrides,
  };
}

const originalGetById = require('../workflowTemplateService').getTemplateById;

afterEach(() => {
  resetMocks();
  require('../workflowTemplateService').getTemplateById = originalGetById;
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. TEMPLATE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

describe('Template Validation', () => {
  test('empty name is invalid', () => {
    const r = validateTemplate({ ...makeMinimalTemplate(), name: '' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('name'))).toBe(true);
  });

  test('null name is invalid', () => {
    const r = validateTemplate({ ...makeMinimalTemplate(), name: null });
    expect(r.valid).toBe(false);
  });

  test('whitespace-only name is invalid', () => {
    const r = validateTemplate({ ...makeMinimalTemplate(), name: '   ' });
    expect(r.valid).toBe(false);
  });

  test('invalid category is invalid', () => {
    const r = validateTemplate({ ...makeMinimalTemplate(), category: 'invalid_cat' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('category'))).toBe(true);
  });

  test.each(VALID_CATEGORIES)('category "%s" is valid', (cat) => {
    const r = validateTemplate({ ...makeMinimalTemplate(), category: cat });
    expect(r.valid).toBe(true);
  });

  test('missing step title is invalid', () => {
    const r = validateTemplate({
      ...makeMinimalTemplate(),
      steps: [{ step_number: 1, purpose: 'x', prompt_type: 'plan' }],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('title'))).toBe(true);
  });

  test('missing step purpose is invalid', () => {
    const r = validateTemplate({
      ...makeMinimalTemplate(),
      steps: [{ step_number: 1, title: 'x', prompt_type: 'plan' }],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('purpose'))).toBe(true);
  });

  test('invalid prompt_type is invalid', () => {
    const r = validateTemplate({
      ...makeMinimalTemplate(),
      steps: [{ step_number: 1, title: 'x', purpose: 'y', prompt_type: 'bogus' }],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('prompt_type'))).toBe(true);
  });

  test('empty steps array is invalid', () => {
    const r = validateTemplate({ ...makeMinimalTemplate(), steps: [] });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('at least one step'))).toBe(true);
  });

  test('non-sequential step numbers (1, 3) is invalid', () => {
    const r = validateTemplate({
      ...makeMinimalTemplate(),
      steps: [
        { step_number: 1, title: 'A', purpose: 'A', prompt_type: 'plan' },
        { step_number: 3, title: 'B', purpose: 'B', prompt_type: 'plan' },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('sequential'))).toBe(true);
  });

  test('step starting at 2 is invalid', () => {
    const r = validateTemplate({
      ...makeMinimalTemplate(),
      steps: [{ step_number: 2, title: 'A', purpose: 'A', prompt_type: 'plan' }],
    });
    expect(r.valid).toBe(false);
  });

  test('duplicate step numbers is invalid', () => {
    const r = validateTemplate({
      ...makeMinimalTemplate(),
      steps: [
        { step_number: 1, title: 'A', purpose: 'A', prompt_type: 'plan' },
        { step_number: 1, title: 'B', purpose: 'B', prompt_type: 'plan' },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('duplicate'))).toBe(true);
  });

  test('invalid dependency_type is invalid', () => {
    const r = validateTemplate({
      ...makeMinimalTemplate(),
      steps: [{ step_number: 1, title: 'A', purpose: 'A', prompt_type: 'plan', dependency_type: 'bogus' }],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('dependency_type'))).toBe(true);
  });

  test('explicit dependency referencing valid step is valid', () => {
    const r = validateTemplate({
      ...makeMinimalTemplate(),
      steps: [
        { step_number: 1, title: 'A', purpose: 'A', prompt_type: 'plan', dependency_type: 'none' },
        { step_number: 2, title: 'B', purpose: 'B', prompt_type: 'plan', dependency_type: 'explicit', depends_on_step: 1 },
      ],
    });
    expect(r.valid).toBe(true);
  });

  test('uppercase param name is invalid', () => {
    const r = validateTemplate({
      ...makeMinimalTemplate(),
      parameters: [{ name: 'UpperCase', label: 'Bad', type: 'string' }],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('lowercase identifier'))).toBe(true);
  });

  test('param name starting with number is invalid', () => {
    const r = validateTemplate({
      ...makeMinimalTemplate(),
      parameters: [{ name: '1bad', label: 'Bad', type: 'string' }],
    });
    expect(r.valid).toBe(false);
  });

  test('duplicate param names is invalid', () => {
    const r = validateTemplate({
      ...makeMinimalTemplate(),
      parameters: [
        { name: 'good_name', label: 'Good', type: 'string' },
        { name: 'good_name', label: 'Duplicate', type: 'string' },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('duplicate'))).toBe(true);
  });

  test('missing param name is invalid', () => {
    const r = validateTemplate({
      ...makeMinimalTemplate(),
      parameters: [{ label: 'Missing Name', type: 'string' }],
    });
    expect(r.valid).toBe(false);
  });

  test('invalid param type is invalid', () => {
    const r = validateTemplate({
      ...makeMinimalTemplate(),
      parameters: [{ name: 'x', label: 'X', type: 'invalid_type' }],
    });
    expect(r.valid).toBe(false);
  });

  test('valid full template passes', () => {
    const r = validateTemplate(makeValidTemplate());
    expect(r.valid).toBe(true);
    expect(r.errors.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. PARAMETER INJECTION
// ═══════════════════════════════════════════════════════════════════════════

describe('Parameter Injection', () => {
  describe('injectParams', () => {
    test('simple replacement', () => {
      expect(injectParams('Build {{feature_name}} module', { feature_name: 'calendar' }))
        .toBe('Build calendar module');
    });

    test('multiple replacements', () => {
      expect(injectParams('{{method}} /api/{{resource}}', { method: 'GET', resource: 'users' }))
        .toBe('GET /api/users');
    });

    test('no placeholders unchanged', () => {
      expect(injectParams('No params here', { feature_name: 'calendar' }))
        .toBe('No params here');
    });

    test('null input returns null', () => {
      expect(injectParams(null, { feature_name: 'calendar' })).toBeNull();
    });

    test('undefined input returns undefined', () => {
      expect(injectParams(undefined, { feature_name: 'calendar' })).toBeUndefined();
    });

    test('unresolved param left as-is', () => {
      expect(injectParams('Missing {{unknown_param}}', { feature_name: 'calendar' }))
        .toBe('Missing {{unknown_param}}');
    });

    test('number param coerced to string', () => {
      expect(injectParams('Count: {{count}}', { count: 42 }))
        .toBe('Count: 42');
    });
  });

  describe('injectStepParams', () => {
    test('injects all injectable fields', () => {
      const step = {
        step_number: 1,
        title: 'Build {{resource_name}}',
        purpose: 'Implement {{resource_name}} for {{http_method}}',
        component: '{{resource_name}}-api',
        prompt_type: 'implementation',
        expected_outcome: '{{resource_name}} responds to {{http_method}}',
        requirements_summary: '{{resource_name}} returns correct codes',
        dependency_type: 'sequential',
      };
      const params = { resource_name: 'users', http_method: 'POST' };
      const injected = injectStepParams(step, params);

      expect(injected.title).toBe('Build users');
      expect(injected.purpose).toBe('Implement users for POST');
      expect(injected.component).toBe('users-api');
      expect(injected.expected_outcome).toBe('users responds to POST');
      expect(injected.requirements_summary).toBe('users returns correct codes');
      expect(injected.prompt_type).toBe('implementation');
      expect(injected.dependency_type).toBe('sequential');
      expect(injected.step_number).toBe(1);
    });
  });

  describe('unresolved warnings', () => {
    test('detects unresolved params in preview', async () => {
      const template = {
        id: 'tmpl-unresolved',
        name: 'Test {{missing_global}}',
        description: 'Desc',
        category: 'backend',
        version: 1,
        parameters: [{ name: 'known_param', label: 'Known', type: 'string' }],
        steps: [{
          step_number: 1,
          title: 'Do {{known_param}} and {{unknown_param}}',
          purpose: 'Check {{unknown_param}}',
          component: null, prompt_type: 'plan',
          expected_outcome: null, requirements_summary: null,
          dependency_type: 'sequential',
        }],
      };

      require('../workflowTemplateService').getTemplateById = async () => template;
      const preview = await previewInstantiation('tmpl-unresolved', { known_param: 'value' });

      expect(preview.unresolved_warnings.length).toBeGreaterThan(0);
      expect(preview.unresolved_warnings.some(w => w.includes('unknown_param'))).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. WORKFLOW GENERATION
// ═══════════════════════════════════════════════════════════════════════════

describe('Workflow Generation', () => {
  test('instantiate creates workflow with injected params', async () => {
    const template = {
      id: 'tmpl-gen-1',
      name: 'Generate {{feature}}',
      description: 'Create {{feature}} feature',
      category: 'backend',
      version: 2,
      parameters: [{ name: 'feature', label: 'Feature', type: 'string' }],
      steps: [
        { step_number: 1, title: 'Plan {{feature}}', purpose: 'Design', prompt_type: 'plan', component: '{{feature}}-mod', expected_outcome: null, requirements_summary: null, dependency_type: 'none' },
        { step_number: 2, title: 'Build {{feature}}', purpose: 'Implement', prompt_type: 'implementation', component: null, expected_outcome: 'Working {{feature}}', requirements_summary: null, dependency_type: 'sequential' },
      ],
    };

    require('../workflowTemplateService').getTemplateById = async () => template;

    mockQueryResults.push([{ affectedRows: 1 }]); // UPDATE template_id
    mockQueryResults.push([{ affectedRows: 1 }]); // UPDATE usage_count

    const result = await instantiate('tmpl-gen-1', { feature: 'calendar' }, 'test-actor');

    expect(createWorkflowCalls.length).toBe(1);
    expect(createWorkflowCalls[0].actor).toBe('test-actor');
    expect(createWorkflowCalls[0].data.name).toBe('Generate calendar');
    expect(createWorkflowCalls[0].data.description).toBe('Create calendar feature');
    expect(createWorkflowCalls[0].data.steps.length).toBe(2);
    expect(createWorkflowCalls[0].data.steps[0].title).toBe('Plan calendar');
    expect(createWorkflowCalls[0].data.steps[1].expected_outcome).toBe('Working calendar');

    const tagQuery = queryCalls.find(q => typeof q[0] === 'string' && q[0].includes('template_id'));
    expect(tagQuery).toBeDefined();

    const usageQuery = queryCalls.find(q => typeof q[0] === 'string' && q[0].includes('usage_count'));
    expect(usageQuery).toBeDefined();

    expect(result.workflow).toBeDefined();
    expect(result.template.id).toBe('tmpl-gen-1');
    expect(result.template.version).toBe(2);
    expect(result.parameters_used.feature).toBe('calendar');
  });

  test('instantiate rejects unresolved params', async () => {
    const template = {
      id: 'tmpl-unres-2',
      name: 'Has {{missing}}',
      description: '',
      category: 'frontend',
      version: 1,
      parameters: [{ name: 'provided', label: 'Provided', type: 'string' }],
      steps: [
        { step_number: 1, title: '{{provided}} and {{missing}}', purpose: 'Test', prompt_type: 'plan', component: null, expected_outcome: null, requirements_summary: null, dependency_type: 'none' },
      ],
    };

    require('../workflowTemplateService').getTemplateById = async () => template;
    await expect(instantiate('tmpl-unres-2', { provided: 'hello' }, 'actor'))
      .rejects.toThrow(/Unresolved/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. SEQUENCE CORRECTNESS
// ═══════════════════════════════════════════════════════════════════════════

describe('Sequence Correctness', () => {
  test('sequential 1,2,3 is valid', () => {
    const r = validateTemplate({
      name: 'Seq', category: 'backend',
      steps: [
        { step_number: 1, title: 'A', purpose: 'A', prompt_type: 'plan' },
        { step_number: 2, title: 'B', purpose: 'B', prompt_type: 'implementation' },
        { step_number: 3, title: 'C', purpose: 'C', prompt_type: 'verification' },
      ],
    });
    expect(r.valid).toBe(true);
  });

  test('gap in sequence (1,2,4) is invalid', () => {
    const r = validateTemplate({
      name: 'Gap', category: 'backend',
      steps: [
        { step_number: 1, title: 'A', purpose: 'A', prompt_type: 'plan' },
        { step_number: 2, title: 'B', purpose: 'B', prompt_type: 'implementation' },
        { step_number: 4, title: 'C', purpose: 'C', prompt_type: 'verification' },
      ],
    });
    expect(r.valid).toBe(false);
  });

  test('starting at 0 is invalid', () => {
    const r = validateTemplate({
      name: 'Zero', category: 'backend',
      steps: [
        { step_number: 0, title: 'A', purpose: 'A', prompt_type: 'plan' },
        { step_number: 1, title: 'B', purpose: 'B', prompt_type: 'implementation' },
      ],
    });
    expect(r.valid).toBe(false);
  });

  test('valid explicit dependencies accepted', () => {
    const r = validateTemplate({
      name: 'Dep', category: 'backend',
      steps: [
        { step_number: 1, title: 'A', purpose: 'A', prompt_type: 'plan', dependency_type: 'none' },
        { step_number: 2, title: 'B', purpose: 'B', prompt_type: 'implementation', dependency_type: 'explicit', depends_on_step: 1 },
        { step_number: 3, title: 'C', purpose: 'C', prompt_type: 'verification', dependency_type: 'explicit', depends_on_step: 2 },
      ],
    });
    expect(r.valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. VERSION ISOLATION
// ═══════════════════════════════════════════════════════════════════════════

describe('Version Isolation', () => {
  test('publishNewVersion increments version and creates snapshot', async () => {
    const templateRow = {
      id: 'tmpl-ver-1', name: 'Versioned', description: 'Original',
      category: 'backend', version: 1, parameters: null,
    };
    const stepRows = [{
      step_number: 1, title: 'Step 1', purpose: 'v1', component: null,
      prompt_type: 'plan', expected_outcome: null, requirements_summary: null,
      dependency_type: 'none', depends_on_step: null,
    }];

    mockQueryResults.push([[templateRow]]);                         // getTemplateById SELECT
    mockQueryResults.push([stepRows]);                              // getTemplateById steps
    mockQueryResults.push([{ affectedRows: 1 }]);                  // UPDATE version
    mockQueryResults.push([[{ ...templateRow, version: 2 }]]);     // snapshot getTemplateById
    mockQueryResults.push([stepRows]);                              // snapshot steps
    mockQueryResults.push([{ affectedRows: 1 }]);                  // INSERT snapshot

    const result = await publishNewVersion('tmpl-ver-1', 'test-actor');
    expect(result.version).toBe(2);
    expect(result.template_id).toBe('tmpl-ver-1');

    const updateQuery = queryCalls.find(q => typeof q[0] === 'string' && q[0].includes('UPDATE workflow_templates SET version'));
    expect(updateQuery).toBeDefined();

    const snapshotInsert = queryCalls.find(q => typeof q[0] === 'string' && q[0].includes('INSERT INTO workflow_template_versions'));
    expect(snapshotInsert).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. PREVIEW CORRECTNESS
// ═══════════════════════════════════════════════════════════════════════════

describe('Preview Correctness', () => {
  test('preview returns injected steps without creating workflow', async () => {
    const template = {
      id: 'tmpl-preview-1', name: 'Preview {{entity}}', description: 'Preview for {{entity}}',
      category: 'fullstack', version: 3,
      parameters: [
        { name: 'entity', label: 'Entity', type: 'string' },
        { name: 'optional_flag', label: 'Flag', type: 'boolean', required: false, default_value: true },
      ],
      steps: [
        { step_number: 1, title: 'Design {{entity}}', purpose: 'Plan {{entity}} module', component: '{{entity}}-fe', prompt_type: 'plan', expected_outcome: '{{entity}} design doc', requirements_summary: null, dependency_type: 'none' },
        { step_number: 2, title: 'Build {{entity}}', purpose: 'Implement', component: null, prompt_type: 'implementation', expected_outcome: null, requirements_summary: '{{entity}} must work', dependency_type: 'sequential' },
      ],
    };

    require('../workflowTemplateService').getTemplateById = async () => template;
    const preview = await previewInstantiation('tmpl-preview-1', { entity: 'parish' });

    expect(createWorkflowCalls.length).toBe(0);
    expect(preview.workflow.name).toBe('Preview parish');
    expect(preview.workflow.description).toBe('Preview for parish');
    expect(preview.steps.length).toBe(2);
    expect(preview.steps[0].title).toBe('Design parish');
    expect(preview.steps[0].component).toBe('parish-fe');
    expect(preview.steps[0].expected_outcome).toBe('parish design doc');
    expect(preview.steps[1].requirements_summary).toBe('parish must work');
    expect(preview.template.id).toBe('tmpl-preview-1');
    expect(preview.template.version).toBe(3);
    expect(preview.parameters_used.entity).toBe('parish');
    expect(preview.parameters_used.optional_flag).toBe(true);
    expect(preview.unresolved_warnings.length).toBe(0);
  });

  test('preview rejects missing required param', async () => {
    const template = {
      id: 'tmpl-preview-2', name: 'Requires {{entity}}', description: '',
      category: 'backend', version: 1,
      parameters: [{ name: 'entity', label: 'Entity', type: 'string' }],
      steps: [{ step_number: 1, title: '{{entity}}', purpose: 'Do', prompt_type: 'plan', component: null, expected_outcome: null, requirements_summary: null, dependency_type: 'none' }],
    };

    require('../workflowTemplateService').getTemplateById = async () => template;
    await expect(previewInstantiation('tmpl-preview-2', {}))
      .rejects.toThrow(/Parameter validation failed/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. VALIDATE PARAMS
// ═══════════════════════════════════════════════════════════════════════════

describe('validateParams', () => {
  test('no params defined is valid', () => {
    expect(validateParams([], {}).valid).toBe(true);
  });

  test('null params is valid', () => {
    expect(validateParams(null, {}).valid).toBe(true);
  });

  test('required param provided is valid', () => {
    const r = validateParams([{ name: 'x', label: 'X', type: 'string' }], { x: 'hello' });
    expect(r.valid).toBe(true);
    expect(r.resolved_params.x).toBe('hello');
  });

  test('required param missing is invalid', () => {
    const r = validateParams([{ name: 'x', label: 'X', type: 'string' }], {});
    expect(r.valid).toBe(false);
  });

  test('optional param with default is valid', () => {
    const r = validateParams(
      [{ name: 'x', label: 'X', type: 'string', required: false, default_value: 'fallback' }], {}
    );
    expect(r.valid).toBe(true);
    expect(r.resolved_params.x).toBe('fallback');
  });

  test('number string coerced', () => {
    const r = validateParams([{ name: 'n', label: 'N', type: 'number' }], { n: '42' });
    expect(r.valid).toBe(true);
    expect(r.resolved_params.n).toBe(42);
  });

  test('non-numeric string for number is invalid', () => {
    const r = validateParams([{ name: 'n', label: 'N', type: 'number' }], { n: 'not_a_number' });
    expect(r.valid).toBe(false);
  });

  test('boolean true string coerced', () => {
    const r = validateParams([{ name: 'b', label: 'B', type: 'boolean' }], { b: 'true' });
    expect(r.valid).toBe(true);
    expect(r.resolved_params.b).toBe(true);
  });

  test('boolean false string coerced', () => {
    const r = validateParams([{ name: 'b', label: 'B', type: 'boolean' }], { b: 'false' });
    expect(r.valid).toBe(true);
    expect(r.resolved_params.b).toBe(false);
  });

  test('enum value not in options is invalid', () => {
    const r = validateParams(
      [{ name: 'e', label: 'E', type: 'enum', options: ['GET', 'POST'] }], { e: 'PUT' }
    );
    expect(r.valid).toBe(false);
  });

  test('valid enum value accepted', () => {
    const r = validateParams(
      [{ name: 'e', label: 'E', type: 'enum', options: ['GET', 'POST'] }], { e: 'GET' }
    );
    expect(r.valid).toBe(true);
    expect(r.resolved_params.e).toBe('GET');
  });

  test('empty string with default uses default', () => {
    const r = validateParams(
      [{ name: 'x', label: 'X', type: 'string', default_value: 'backup' }], { x: '' }
    );
    expect(r.valid).toBe(true);
    expect(r.resolved_params.x).toBe('backup');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. ENUM CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Enum Constants', () => {
  test('VALID_CATEGORIES includes expected values', () => {
    expect(VALID_CATEGORIES).toContain('backend');
    expect(VALID_CATEGORIES).toContain('frontend');
    expect(VALID_CATEGORIES).toContain('fullstack');
  });

  test('VALID_PROMPT_TYPES includes expected values', () => {
    expect(VALID_PROMPT_TYPES).toContain('plan');
    expect(VALID_PROMPT_TYPES).toContain('implementation');
    expect(VALID_PROMPT_TYPES).toContain('verification');
  });

  test('VALID_DEPENDENCY_TYPES includes expected values', () => {
    expect(VALID_DEPENDENCY_TYPES).toContain('sequential');
    expect(VALID_DEPENDENCY_TYPES).toContain('explicit');
    expect(VALID_DEPENDENCY_TYPES).toContain('none');
  });

  test('VALID_PARAM_TYPES includes expected values', () => {
    expect(VALID_PARAM_TYPES).toContain('string');
    expect(VALID_PARAM_TYPES).toContain('enum');
    expect(VALID_PARAM_TYPES).toContain('boolean');
    expect(VALID_PARAM_TYPES).toContain('number');
  });
});
