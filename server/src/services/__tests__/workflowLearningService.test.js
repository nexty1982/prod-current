/**
 * Workflow Learning Service — Jest Tests
 *
 * Tests: pattern signatures, violation/success recording, severity escalation,
 * global threshold promotion, constraint query priority, deduplication in
 * injection engine, CRUD operations, and deterministic behavior.
 *
 * Run:  npx jest server/src/services/__tests__/workflowLearningService.test.js
 */

// ─── Mock setup ────────────────────────────────────────────────────────────

const mockPool = { query: jest.fn() };
let mockQueryResults = [];
let queryCalls = [];

jest.mock('../../config/db', () => ({
  getAppPool: () => mockPool,
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

const learningService = require('../workflowLearningService');
const injectionEngine = require('../constraintInjectionEngine');

// ─── Helpers ───────────────────────────────────────────────────────────────

function setupQueryResults(...results) {
  mockQueryResults = [...results];
  mockPool.query.mockImplementation((...args) => {
    queryCalls.push(args);
    const result = mockQueryResults.shift();
    if (result === undefined) {
      return Promise.resolve([[], null]);
    }
    return Promise.resolve(result);
  });
}

afterEach(() => {
  jest.clearAllMocks();
  mockQueryResults = [];
  queryCalls = [];
});

// ─── 1. Pattern Signature ──────────────────────────────────────────────────

describe('buildSignature', () => {
  test('produces correct signature for violation_pattern', () => {
    const sig = learningService.buildSignature('violation_pattern', 'wrong_api_client');
    expect(sig).toBe('violation:wrong_api_client');
  });

  test('produces correct signature for success_pattern', () => {
    const sig = learningService.buildSignature('success_pattern', 'complete_execution');
    expect(sig).toBe('success:complete_execution');
  });

  test('produces correct signature for structural_pattern', () => {
    const sig = learningService.buildSignature('structural_pattern', 'effective_step_sequence');
    expect(sig).toBe('structural:effective_step_sequence');
  });

  test('includes qualifier when provided', () => {
    const sig = learningService.buildSignature('violation_pattern', 'wrong_api_client', 'backend');
    expect(sig).toBe('violation:wrong_api_client:backend');
  });

  test('omits qualifier when null', () => {
    const sig = learningService.buildSignature('violation_pattern', 'wrong_api_client', null);
    expect(sig).toBe('violation:wrong_api_client');
  });

  test('omits qualifier when undefined', () => {
    const sig = learningService.buildSignature('violation_pattern', 'wrong_api_client', undefined);
    expect(sig).toBe('violation:wrong_api_client');
  });

  test('omits qualifier when empty string', () => {
    const sig = learningService.buildSignature('violation_pattern', 'wrong_api_client', '');
    expect(sig).toBe('violation:wrong_api_client');
  });
});

// ─── 2. Violation Recording ────────────────────────────────────────────────

describe('recordViolation', () => {
  test('creates new pattern with correct fields when no existing pattern', async () => {
    // First query: SELECT existing → empty
    // Second query: INSERT
    setupQueryResults(
      [[], null],
      [{ affectedRows: 1 }, null]
    );

    const result = await learningService.recordViolation({
      category: 'wrong_api_client',
      component: 'backend',
      description: 'Used fetch instead of omApi',
      workflow_id: 'wf-1',
      prompt_id: 'p-1',
    });

    expect(result.is_new).toBe(true);
    expect(result.occurrences).toBe(1);
    expect(result.severity).toBe('high');
    expect(result.learning_id).toBe('test-uuid-1234');
    expect(result.global_candidate).toBe(false);

    // Verify INSERT query
    const insertCall = queryCalls[1];
    expect(insertCall[0]).toMatch(/INSERT INTO workflow_learning_registry/);
    const params = insertCall[1];
    expect(params[0]).toBe('test-uuid-1234'); // id
    expect(params[1]).toBe('violation_pattern'); // learning_type
    expect(params[2]).toBe('violation:wrong_api_client:backend'); // signature
    expect(params[3]).toBe('Wrong API Client Used'); // title
    expect(params[4]).toBe('Used fetch instead of omApi'); // description
    expect(params[5]).toBe('Must use omApi (the project API client), not fetch, axios, or custom HTTP clients.'); // constraint_text
    expect(params[6]).toBe('high'); // severity
    expect(params[7]).toBe('high'); // base_severity
    expect(JSON.parse(params[8])).toEqual(['backend']); // affected_components
    expect(JSON.parse(params[9])).toEqual(['wf-1']); // source_workflow_ids
    expect(JSON.parse(params[10])).toEqual(['p-1']); // source_prompt_ids
  });

  test('increments occurrences when same violation recorded twice', async () => {
    const existingRecord = {
      id: 'existing-id',
      occurrences: 1,
      severity: 'high',
      affected_components: JSON.stringify(['backend']),
      source_workflow_ids: JSON.stringify(['wf-1']),
      source_prompt_ids: JSON.stringify(['p-1']),
      global_candidate: 0,
    };

    // SELECT existing → found
    // UPDATE
    setupQueryResults(
      [[existingRecord], null],
      [{ affectedRows: 1 }, null]
    );

    const result = await learningService.recordViolation({
      category: 'wrong_api_client',
      component: 'backend',
      workflow_id: 'wf-2',
      prompt_id: 'p-2',
    });

    expect(result.is_new).toBe(false);
    expect(result.occurrences).toBe(2);
    expect(result.learning_id).toBe('existing-id');

    // Verify UPDATE query
    const updateCall = queryCalls[1];
    expect(updateCall[0]).toMatch(/UPDATE workflow_learning_registry/);
    const params = updateCall[1];
    expect(params[0]).toBe(2); // new occurrences
    // Merged workflow IDs (index 5 after severity_source and global_candidate added)
    const wfIds = JSON.parse(params[5]);
    expect(wfIds).toContain('wf-1');
    expect(wfIds).toContain('wf-2');
  });

  test('throws error for unknown category', async () => {
    await expect(
      learningService.recordViolation({ category: 'nonexistent_category' })
    ).rejects.toThrow('Unknown violation category: nonexistent_category');
  });
});

// ─── 3. Success Recording ──────────────────────────────────────────────────

describe('recordSuccess', () => {
  test('creates new success pattern', async () => {
    setupQueryResults(
      [[], null],
      [{ affectedRows: 1 }, null]
    );

    const result = await learningService.recordSuccess({
      category: 'complete_execution',
      component: 'workflow-engine',
    });

    expect(result.is_new).toBe(true);
    expect(result.occurrences).toBe(1);
    expect(result.severity).toBe('low');

    // Verify signature used
    const selectCall = queryCalls[0];
    expect(selectCall[1][0]).toBe('success:complete_execution:workflow-engine');
  });

  test('throws error for unknown success category', async () => {
    await expect(
      learningService.recordSuccess({ category: 'fake_category' })
    ).rejects.toThrow('Unknown success category: fake_category');
  });
});

// ─── 4. Severity Escalation ───────────────────────────────────────────────

describe('severity escalation', () => {
  test('escalates low to medium at threshold 5', async () => {
    const existingRecord = {
      id: 'esc-1',
      occurrences: 4, // will become 5, meeting threshold
      severity: 'low',
      affected_components: '[]',
      source_workflow_ids: '[]',
      source_prompt_ids: '[]',
      global_candidate: 1,
    };

    setupQueryResults(
      [[existingRecord], null],
      [{ affectedRows: 1 }, null]
    );

    const result = await learningService.recordViolation({
      category: 'inconsistent_naming',
    });

    expect(result.occurrences).toBe(5);
    expect(result.severity).toBe('medium');
  });

  test('escalates medium to high at threshold 8', async () => {
    const existingRecord = {
      id: 'esc-2',
      occurrences: 7,
      severity: 'medium',
      affected_components: '[]',
      source_workflow_ids: '[]',
      source_prompt_ids: '[]',
      global_candidate: 1,
    };

    setupQueryResults(
      [[existingRecord], null],
      [{ affectedRows: 1 }, null]
    );

    const result = await learningService.recordViolation({
      category: 'inconsistent_naming',
    });

    expect(result.occurrences).toBe(8);
    expect(result.severity).toBe('high');
  });

  test('escalates high to critical at threshold 12', async () => {
    const existingRecord = {
      id: 'esc-3',
      occurrences: 11,
      severity: 'high',
      affected_components: '[]',
      source_workflow_ids: '[]',
      source_prompt_ids: '[]',
      global_candidate: 1,
    };

    setupQueryResults(
      [[existingRecord], null],
      [{ affectedRows: 1 }, null]
    );

    const result = await learningService.recordViolation({
      category: 'inconsistent_naming',
    });

    expect(result.occurrences).toBe(12);
    expect(result.severity).toBe('critical');
  });

  test('does not escalate critical (already max)', async () => {
    const existingRecord = {
      id: 'esc-4',
      occurrences: 20,
      severity: 'critical',
      affected_components: '[]',
      source_workflow_ids: '[]',
      source_prompt_ids: '[]',
      global_candidate: 1,
    };

    setupQueryResults(
      [[existingRecord], null],
      [{ affectedRows: 1 }, null]
    );

    const result = await learningService.recordViolation({
      category: 'missing_auth_guard',
    });

    expect(result.occurrences).toBe(21);
    expect(result.severity).toBe('critical');
  });

  test('does not escalate when below threshold', async () => {
    const existingRecord = {
      id: 'esc-5',
      occurrences: 3, // will become 4, still below low->medium threshold of 5
      severity: 'low',
      affected_components: '[]',
      source_workflow_ids: '[]',
      source_prompt_ids: '[]',
      global_candidate: 1,
    };

    setupQueryResults(
      [[existingRecord], null],
      [{ affectedRows: 1 }, null]
    );

    const result = await learningService.recordViolation({
      category: 'inconsistent_naming',
    });

    expect(result.occurrences).toBe(4);
    expect(result.severity).toBe('low');
  });
});

// ─── 5. Global Threshold ──────────────────────────────────────────────────

describe('global threshold promotion', () => {
  test('sets global_candidate to 1 when occurrences reach 3', async () => {
    const existingRecord = {
      id: 'gt-1',
      occurrences: 2, // will become 3
      severity: 'high',
      affected_components: '[]',
      source_workflow_ids: '[]',
      source_prompt_ids: '[]',
      global_candidate: 0,
    };

    setupQueryResults(
      [[existingRecord], null],
      [{ affectedRows: 1 }, null]
    );

    const result = await learningService.recordViolation({
      category: 'wrong_api_client',
    });

    expect(result.occurrences).toBe(3);
    expect(result.global_candidate).toBe(true);

    // Verify the UPDATE query set global_candidate = 1
    const updateParams = queryCalls[1][1];
    expect(updateParams[3]).toBe(1); // global_candidate param (index 3 after severity_source)
  });

  test('global_candidate stays 0 when below threshold', async () => {
    const existingRecord = {
      id: 'gt-2',
      occurrences: 1, // will become 2
      severity: 'high',
      affected_components: '[]',
      source_workflow_ids: '[]',
      source_prompt_ids: '[]',
      global_candidate: 0,
    };

    setupQueryResults(
      [[existingRecord], null],
      [{ affectedRows: 1 }, null]
    );

    const result = await learningService.recordViolation({
      category: 'wrong_api_client',
    });

    expect(result.occurrences).toBe(2);
    expect(result.global_candidate).toBe(false);
  });

  test('global_candidate stays 1 once already promoted', async () => {
    const existingRecord = {
      id: 'gt-3',
      occurrences: 1, // will become 2, below threshold but already global
      severity: 'high',
      affected_components: '[]',
      source_workflow_ids: '[]',
      source_prompt_ids: '[]',
      global_candidate: 1, // already promoted
    };

    setupQueryResults(
      [[existingRecord], null],
      [{ affectedRows: 1 }, null]
    );

    const result = await learningService.recordViolation({
      category: 'wrong_api_client',
    });

    expect(result.global_candidate).toBe(true);
  });
});

// ─── 6. Pattern Aggregation ───────────────────────────────────────────────

describe('aggregatePatterns', () => {
  test('promotes and escalates correctly', async () => {
    setupQueryResults(
      // Promote query
      [{ affectedRows: 3 }, null],
      // Escalate low -> medium
      [{ affectedRows: 1 }, null],
      // Escalate medium -> high
      [{ affectedRows: 2 }, null],
      // Escalate high -> critical
      [{ affectedRows: 0 }, null]
    );

    const result = await learningService.aggregatePatterns();

    expect(result.promoted).toBe(3);
    expect(result.escalated).toBe(3); // 1 + 2 + 0

    // Verify promote query uses GLOBAL_THRESHOLD
    const promoCall = queryCalls[0];
    expect(promoCall[1][0]).toBe(learningService.GLOBAL_THRESHOLD);

    // Verify escalation queries use correct thresholds
    // low -> medium at 5
    expect(queryCalls[1][1]).toEqual(['medium', 'low', 5]);
    // medium -> high at 8
    expect(queryCalls[2][1]).toEqual(['high', 'medium', 8]);
    // high -> critical at 12
    expect(queryCalls[3][1]).toEqual(['critical', 'high', 12]);
  });

  test('returns zeros when nothing to promote or escalate', async () => {
    setupQueryResults(
      [{ affectedRows: 0 }, null],
      [{ affectedRows: 0 }, null],
      [{ affectedRows: 0 }, null],
      [{ affectedRows: 0 }, null]
    );

    const result = await learningService.aggregatePatterns();

    expect(result.promoted).toBe(0);
    expect(result.escalated).toBe(0);
  });
});

// ─── 7. Constraint Query Priority ─────────────────────────────────────────

describe('getConstraints', () => {
  const makeRow = (overrides) => ({
    id: 'c-1',
    learning_type: 'violation_pattern',
    pattern_signature: 'violation:test',
    title: 'Test Constraint',
    description: 'Test',
    constraint_text: 'Do something correctly.',
    occurrences: 5,
    severity: 'high',
    affected_components: JSON.stringify(['backend']),
    global_candidate: 0,
    ...overrides,
  });

  test('always returns critical severity patterns', async () => {
    setupQueryResults([
      [makeRow({ id: 'c-crit', severity: 'critical', affected_components: '[]', global_candidate: 0 })],
      null,
    ]);

    const constraints = await learningService.getConstraints('frontend');

    expect(constraints).toHaveLength(1);
    expect(constraints[0].severity).toBe('critical');
  });

  test('always returns high severity patterns', async () => {
    setupQueryResults([
      [makeRow({ id: 'c-high', severity: 'high', affected_components: '[]', global_candidate: 0 })],
      null,
    ]);

    const constraints = await learningService.getConstraints('frontend');

    expect(constraints).toHaveLength(1);
    expect(constraints[0].severity).toBe('high');
  });

  test('returns medium severity when component matches', async () => {
    setupQueryResults([
      [makeRow({ id: 'c-med', severity: 'medium', affected_components: JSON.stringify(['backend']), global_candidate: 0 })],
      null,
    ]);

    const constraints = await learningService.getConstraints('backend');

    expect(constraints).toHaveLength(1);
    expect(constraints[0].severity).toBe('medium');
  });

  test('returns medium severity when global candidate', async () => {
    setupQueryResults([
      [makeRow({ id: 'c-med-global', severity: 'medium', affected_components: '[]', global_candidate: 1 })],
      null,
    ]);

    const constraints = await learningService.getConstraints('frontend');

    expect(constraints).toHaveLength(1);
  });

  test('does NOT return medium severity when component does not match and not global', async () => {
    setupQueryResults([
      [makeRow({ id: 'c-med-no', severity: 'medium', affected_components: JSON.stringify(['backend']), global_candidate: 0 })],
      null,
    ]);

    const constraints = await learningService.getConstraints('frontend');

    expect(constraints).toHaveLength(0);
  });

  test('returns low severity only when component matches directly', async () => {
    setupQueryResults([
      [makeRow({ id: 'c-low', severity: 'low', affected_components: JSON.stringify(['backend']), global_candidate: 0 })],
      null,
    ]);

    const matchConstraints = await learningService.getConstraints('backend');
    expect(matchConstraints).toHaveLength(1);
  });

  test('does NOT return low severity for non-matching component', async () => {
    setupQueryResults([
      [makeRow({ id: 'c-low-no', severity: 'low', affected_components: JSON.stringify(['backend']), global_candidate: 0 })],
      null,
    ]);

    const constraints = await learningService.getConstraints('frontend');

    expect(constraints).toHaveLength(0);
  });

  test('does NOT return low severity even if global candidate', async () => {
    setupQueryResults([
      [makeRow({ id: 'c-low-global', severity: 'low', affected_components: '[]', global_candidate: 1 })],
      null,
    ]);

    const constraints = await learningService.getConstraints('frontend');

    expect(constraints).toHaveLength(0);
  });

  test('does NOT return patterns with null constraint_text (filtered by SQL)', async () => {
    // The SQL query already filters these out, but if somehow one slips through:
    setupQueryResults([[], null]);

    const constraints = await learningService.getConstraints('backend');

    expect(constraints).toHaveLength(0);
    // Verify SQL includes the filter
    const sql = queryCalls[0][0];
    expect(sql).toMatch(/constraint_text IS NOT NULL/);
    expect(sql).toMatch(/constraint_text != ''/);
  });

  test('does NOT return patterns with empty constraint_text (filtered by SQL)', async () => {
    setupQueryResults([[], null]);

    const constraints = await learningService.getConstraints('backend');

    expect(constraints).toHaveLength(0);
  });

  test('returns constraint fields with injection_reason', async () => {
    setupQueryResults([
      [makeRow({ id: 'c-fields', severity: 'critical', occurrences: 10 })],
      null,
    ]);

    const constraints = await learningService.getConstraints('backend');

    expect(constraints[0]).toHaveProperty('learning_id', 'c-fields');
    expect(constraints[0]).toHaveProperty('title');
    expect(constraints[0]).toHaveProperty('severity', 'critical');
    expect(constraints[0]).toHaveProperty('constraint_text');
    expect(constraints[0]).toHaveProperty('occurrences', 10);
    expect(constraints[0]).toHaveProperty('injection_reason');
    expect(constraints[0]).toHaveProperty('pattern_signature');
  });
});

// ─── 8. Deduplication in injection engine ─────────────────────────────────

describe('constraintInjectionEngine buildConstraintBlock', () => {
  test('deduplicates constraints by constraint_text', async () => {
    const duplicateRows = [
      {
        id: 'dup-1',
        learning_type: 'violation_pattern',
        pattern_signature: 'violation:wrong_api_client:backend',
        title: 'Wrong API Client Used',
        description: 'Test',
        constraint_text: 'Must use omApi.',
        occurrences: 5,
        severity: 'high',
        affected_components: JSON.stringify(['backend']),
        global_candidate: 1,
      },
      {
        id: 'dup-2',
        learning_type: 'violation_pattern',
        pattern_signature: 'violation:wrong_api_client:frontend',
        title: 'Wrong API Client Used (frontend)',
        description: 'Test',
        constraint_text: 'Must use omApi.', // same text
        occurrences: 3,
        severity: 'high',
        affected_components: JSON.stringify(['frontend']),
        global_candidate: 1,
      },
      {
        id: 'dup-3',
        learning_type: 'violation_pattern',
        pattern_signature: 'violation:missing_error_handling',
        title: 'Missing Error Handling',
        description: 'Test',
        constraint_text: 'Handle errors properly.',
        occurrences: 4,
        severity: 'high',
        affected_components: JSON.stringify(['backend']),
        global_candidate: 1,
      },
    ];

    setupQueryResults([duplicateRows, null]);

    const block = await injectionEngine.buildConstraintBlock(
      { component: 'backend' },
      { id: 'wf-1', component: 'backend' }
    );

    // Should have 2 unique constraints, not 3
    expect(block.constraints).toHaveLength(2);
    expect(block.constraints[0].constraint_text).toBe('Must use omApi.');
    expect(block.constraints[1].constraint_text).toBe('Handle errors properly.');

    // Text block should contain both unique constraints
    expect(block.text).toContain('LEARNED CONSTRAINTS');
    expect(block.text).toContain('Must use omApi.');
    expect(block.text).toContain('Handle errors properly.');
  });

  test('returns empty block when no constraints', async () => {
    setupQueryResults([[], null]);

    const block = await injectionEngine.buildConstraintBlock(
      { component: 'backend' },
      { id: 'wf-1', component: 'backend' }
    );

    expect(block.text).toBe('');
    expect(block.constraints).toHaveLength(0);
    expect(typeof block.recordAll).toBe('function');
  });

  test('recordAll records each unique constraint injection', async () => {
    const rows = [
      {
        id: 'rec-1',
        learning_type: 'violation_pattern',
        pattern_signature: 'violation:test1',
        title: 'Test 1',
        description: 'T',
        constraint_text: 'Constraint A.',
        occurrences: 5,
        severity: 'high',
        affected_components: '[]',
        global_candidate: 1,
      },
      {
        id: 'rec-2',
        learning_type: 'violation_pattern',
        pattern_signature: 'violation:test2',
        title: 'Test 2',
        description: 'T',
        constraint_text: 'Constraint B.',
        occurrences: 3,
        severity: 'critical',
        affected_components: '[]',
        global_candidate: 1,
      },
    ];

    // getConstraints query
    setupQueryResults(
      [rows, null],
      // recordInjection INSERT #1
      [{ affectedRows: 1 }, null],
      // recordInjection INSERT #2
      [{ affectedRows: 1 }, null]
    );

    const block = await injectionEngine.buildConstraintBlock(
      { component: 'backend' },
      { id: 'wf-1', component: 'backend' }
    );

    await block.recordAll('prompt-42');

    // Should have made 2 INSERT calls for injections
    const insertCalls = queryCalls.filter(c => c[0].includes('INSERT INTO workflow_learning_injections'));
    expect(insertCalls).toHaveLength(2);
    expect(insertCalls[0][1][2]).toBe('prompt-42'); // prompt_id
    expect(insertCalls[1][1][2]).toBe('prompt-42');
  });
});

// ─── 9. CRUD ──────────────────────────────────────────────────────────────

describe('CRUD operations', () => {
  test('disableLearning sets active = 0', async () => {
    setupQueryResults([{ affectedRows: 1 }, null]);

    const result = await learningService.disableLearning('learn-1');

    expect(result.success).toBe(true);
    expect(queryCalls[0][0]).toMatch(/SET active = 0/);
    expect(queryCalls[0][1]).toEqual(['learn-1']);
  });

  test('disableLearning throws when not found', async () => {
    setupQueryResults([{ affectedRows: 0 }, null]);

    await expect(learningService.disableLearning('nonexistent')).rejects.toThrow('Learning not found');
  });

  test('enableLearning sets active = 1', async () => {
    setupQueryResults([{ affectedRows: 1 }, null]);

    const result = await learningService.enableLearning('learn-1');

    expect(result.success).toBe(true);
    expect(queryCalls[0][0]).toMatch(/SET active = 1/);
  });

  test('setSeverity validates enum, records override trail, and updates', async () => {
    // First query: SELECT current severity
    // Second query: UPDATE
    setupQueryResults(
      [[{ severity: 'medium' }], null],
      [{ affectedRows: 1 }, null]
    );

    const result = await learningService.setSeverity('learn-1', 'high', 'admin@test.com');

    expect(result.success).toBe(true);
    expect(result.previous_severity).toBe('medium');
    expect(result.new_severity).toBe('high');
    expect(result.severity_source).toBe('manual_override');
    expect(result.override_by).toBe('admin@test.com');

    // Verify UPDATE query sets severity_source to manual_override
    const updateCall = queryCalls[1];
    expect(updateCall[0]).toMatch(/severity_source = 'manual_override'/);
    expect(updateCall[0]).toMatch(/override_by = \?/);
    expect(updateCall[0]).toMatch(/override_previous_severity = \?/);
  });

  test('setSeverity throws for invalid severity', async () => {
    await expect(
      learningService.setSeverity('learn-1', 'extreme', 'admin')
    ).rejects.toThrow('Invalid severity: extreme');
  });

  test('setSeverity throws when learning not found', async () => {
    setupQueryResults(
      [[], null]  // SELECT returns empty
    );

    await expect(
      learningService.setSeverity('nonexistent', 'high', 'admin')
    ).rejects.toThrow('Learning not found');
  });

  test('resolveLearning sets resolved_at and active = 0', async () => {
    setupQueryResults([{ affectedRows: 1 }, null]);

    const result = await learningService.resolveLearning('learn-1', 'admin-user');

    expect(result.success).toBe(true);
    expect(queryCalls[0][0]).toMatch(/SET active = 0, resolved_at = NOW\(\), resolved_by = \?/);
    expect(queryCalls[0][1]).toEqual(['admin-user', 'learn-1']);
  });

  test('resolveLearning throws when not found', async () => {
    setupQueryResults([{ affectedRows: 0 }, null]);

    await expect(
      learningService.resolveLearning('nonexistent', 'admin')
    ).rejects.toThrow('Learning not found');
  });
});

// ─── 10. Deterministic behavior ───────────────────────────────────────────

describe('deterministic behavior', () => {
  test('same inputs always produce same pattern_signature', () => {
    const sig1 = learningService.buildSignature('violation_pattern', 'wrong_api_client', 'backend');
    const sig2 = learningService.buildSignature('violation_pattern', 'wrong_api_client', 'backend');
    const sig3 = learningService.buildSignature('violation_pattern', 'wrong_api_client', 'backend');

    expect(sig1).toBe(sig2);
    expect(sig2).toBe(sig3);
  });

  test('different inputs produce different signatures', () => {
    const sig1 = learningService.buildSignature('violation_pattern', 'wrong_api_client', 'backend');
    const sig2 = learningService.buildSignature('violation_pattern', 'wrong_api_client', 'frontend');
    const sig3 = learningService.buildSignature('success_pattern', 'wrong_api_client', 'backend');

    expect(sig1).not.toBe(sig2);
    expect(sig1).not.toBe(sig3);
  });

  test('constraint selection has no randomness — same query returns same order', async () => {
    const rows = [
      {
        id: 'det-1', learning_type: 'violation_pattern', pattern_signature: 'violation:a',
        title: 'A', description: 'A', constraint_text: 'Constraint A.', occurrences: 10,
        severity: 'critical', affected_components: '[]', global_candidate: 1,
      },
      {
        id: 'det-2', learning_type: 'violation_pattern', pattern_signature: 'violation:b',
        title: 'B', description: 'B', constraint_text: 'Constraint B.', occurrences: 5,
        severity: 'high', affected_components: '[]', global_candidate: 1,
      },
    ];

    // Run twice with same data
    setupQueryResults([rows, null]);
    const result1 = await learningService.getConstraints('backend');

    setupQueryResults([rows, null]);
    const result2 = await learningService.getConstraints('backend');

    expect(result1.map(c => c.learning_id)).toEqual(result2.map(c => c.learning_id));
    expect(result1.map(c => c.constraint_text)).toEqual(result2.map(c => c.constraint_text));
  });

  test('all violation categories produce unique signatures', () => {
    const signatures = new Set();
    for (const category of Object.keys(learningService.VIOLATION_CATEGORIES)) {
      const sig = learningService.buildSignature('violation_pattern', category);
      expect(signatures.has(sig)).toBe(false);
      signatures.add(sig);
    }
  });

  test('all success categories produce unique signatures', () => {
    const signatures = new Set();
    for (const category of Object.keys(learningService.SUCCESS_CATEGORIES)) {
      const sig = learningService.buildSignature('success_pattern', category);
      expect(signatures.has(sig)).toBe(false);
      signatures.add(sig);
    }
  });

  test('violation and success signatures never collide for same category name', () => {
    // Even if a category key were shared, the type prefix ensures uniqueness
    const vSig = learningService.buildSignature('violation_pattern', 'test_cat');
    const sSig = learningService.buildSignature('success_pattern', 'test_cat');
    const stSig = learningService.buildSignature('structural_pattern', 'test_cat');

    expect(vSig).not.toBe(sSig);
    expect(vSig).not.toBe(stSig);
    expect(sSig).not.toBe(stSig);
  });
});

// ─── 11. Severity Integrity (Prompt 018) ─────────────────────────────────

describe('severity integrity — traceability and truthfulness', () => {
  test('new pattern records base_severity = category default severity', async () => {
    setupQueryResults(
      [[], null],              // SELECT: no existing
      [{ affectedRows: 1 }, null]  // INSERT
    );

    const result = await learningService.recordViolation({
      category: 'wrong_api_client',
      component: 'backend',
    });

    expect(result.severity).toBe('high');
    expect(result.base_severity).toBe('high');
    expect(result.severity_source).toBe('category_default');

    // Verify INSERT includes base_severity
    const insertCall = queryCalls[1];
    expect(insertCall[0]).toMatch(/base_severity/);
    expect(insertCall[0]).toMatch(/severity_source/);
  });

  test('auto-escalation sets severity_source to threshold_escalated', async () => {
    const existingRecord = {
      id: 'int-1',
      occurrences: 4,
      severity: 'low',
      severity_source: 'category_default',
      base_severity: 'low',
      affected_components: '[]',
      source_workflow_ids: '[]',
      source_prompt_ids: '[]',
      global_candidate: 1,
    };

    setupQueryResults(
      [[existingRecord], null],
      [{ affectedRows: 1 }, null]
    );

    const result = await learningService.recordViolation({
      category: 'inconsistent_naming',
    });

    expect(result.severity).toBe('medium');
    expect(result.severity_source).toBe('threshold_escalated');
    expect(result.base_severity).toBe('low');
  });

  test('manual override prevents automatic escalation in _recordPattern', async () => {
    // Pattern was manually overridden to 'medium' — at 8 occurrences, auto-escalation
    // would normally escalate medium→high, but it must NOT because it's a manual override
    const existingRecord = {
      id: 'int-2',
      occurrences: 7,
      severity: 'medium',
      severity_source: 'manual_override',
      base_severity: 'high',
      affected_components: '[]',
      source_workflow_ids: '[]',
      source_prompt_ids: '[]',
      global_candidate: 1,
    };

    setupQueryResults(
      [[existingRecord], null],
      [{ affectedRows: 1 }, null]
    );

    const result = await learningService.recordViolation({
      category: 'wrong_api_client',
    });

    // Occurrences 8 meets medium→high threshold, but manual_override must be preserved
    expect(result.occurrences).toBe(8);
    expect(result.severity).toBe('medium');
    expect(result.severity_source).toBe('manual_override');
  });

  test('aggregatePatterns skips manual overrides in escalation', async () => {
    setupQueryResults(
      [{ affectedRows: 2 }, null],   // promote
      [{ affectedRows: 1 }, null],   // low→medium
      [{ affectedRows: 0 }, null],   // medium→high
      [{ affectedRows: 0 }, null]    // high→critical
    );

    await learningService.aggregatePatterns();

    // Each escalation query must include the manual_override exclusion
    for (let i = 1; i <= 3; i++) {
      expect(queryCalls[i][0]).toMatch(/severity_source != 'manual_override'/);
    }
  });

  test('setSeverity creates full override audit trail', async () => {
    setupQueryResults(
      [[{ severity: 'low' }], null],     // SELECT current
      [{ affectedRows: 1 }, null]        // UPDATE
    );

    const result = await learningService.setSeverity('int-3', 'critical', 'admin@example.com');

    expect(result.previous_severity).toBe('low');
    expect(result.new_severity).toBe('critical');
    expect(result.severity_source).toBe('manual_override');
    expect(result.override_by).toBe('admin@example.com');

    // Verify UPDATE stores the full trail
    const updateSql = queryCalls[1][0];
    expect(updateSql).toMatch(/override_by/);
    expect(updateSql).toMatch(/override_at/);
    expect(updateSql).toMatch(/override_previous_severity/);
    expect(queryCalls[1][1][2]).toBe('low'); // override_previous_severity
  });

  test('setSeverity defaults actor to unknown when not provided', async () => {
    setupQueryResults(
      [[{ severity: 'medium' }], null],
      [{ affectedRows: 1 }, null]
    );

    const result = await learningService.setSeverity('int-4', 'high');

    expect(result.override_by).toBe('unknown');
  });

  test('getConstraints returns severity_source and base_severity in each constraint', async () => {
    const row = {
      id: 'int-5',
      learning_type: 'violation_pattern',
      pattern_signature: 'violation:test',
      title: 'Test',
      description: 'Test',
      constraint_text: 'Do something.',
      occurrences: 10,
      severity: 'critical',
      base_severity: 'high',
      severity_source: 'threshold_escalated',
      affected_components: JSON.stringify(['backend']),
      global_candidate: 1,
    };

    setupQueryResults([[row], null]);

    const constraints = await learningService.getConstraints('backend');

    expect(constraints).toHaveLength(1);
    expect(constraints[0].severity_source).toBe('threshold_escalated');
    expect(constraints[0].base_severity).toBe('high');
    expect(constraints[0].global_candidate).toBe(true);
    expect(constraints[0].injection_reason).toContain('threshold escalated');
  });

  test('injection reason includes severity source label', async () => {
    const manualRow = {
      id: 'int-6',
      learning_type: 'violation_pattern',
      pattern_signature: 'violation:manual',
      title: 'Manual Override Test',
      description: 'Test',
      constraint_text: 'Must do X.',
      occurrences: 2,
      severity: 'critical',
      base_severity: 'medium',
      severity_source: 'manual_override',
      affected_components: '[]',
      global_candidate: 0,
    };

    setupQueryResults([[manualRow], null]);

    const constraints = await learningService.getConstraints('backend');

    expect(constraints).toHaveLength(1);
    expect(constraints[0].injection_reason).toContain('manual override');
  });

  test('global candidate flag is independent of severity', async () => {
    // A low severity pattern at 3+ occurrences should be global_candidate but
    // still NOT injected for non-matching component (low only injects on direct match)
    const row = {
      id: 'int-7',
      learning_type: 'violation_pattern',
      pattern_signature: 'violation:naming',
      title: 'Naming Issue',
      description: 'Test',
      constraint_text: 'Use correct naming.',
      occurrences: 5,
      severity: 'low',
      base_severity: 'low',
      severity_source: 'category_default',
      affected_components: JSON.stringify(['backend']),
      global_candidate: 1,
    };

    setupQueryResults([[row], null]);

    // Query for 'frontend' — not a direct component match
    const constraints = await learningService.getConstraints('frontend');

    // Low severity + global candidate but NO component match → excluded
    // (global candidate only helps medium severity, not low)
    expect(constraints).toHaveLength(0);
  });

  test('every violation category has a defined default severity', () => {
    for (const [key, def] of Object.entries(learningService.VIOLATION_CATEGORIES)) {
      expect(learningService.VALID_SEVERITIES).toContain(def.severity);
    }
  });

  test('every escalation rule maps to a valid severity', () => {
    for (const [severity, rule] of Object.entries(learningService.SEVERITY_ESCALATION)) {
      if (rule) {
        expect(learningService.VALID_SEVERITIES).toContain(rule.escalate_to);
        expect(typeof rule.threshold).toBe('number');
        expect(rule.threshold).toBeGreaterThan(0);
      }
    }
  });
});
