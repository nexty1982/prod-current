/**
 * Multi-Agent System — Jest Tests
 *
 * Tests: agent registry, routing resolution, result scoring, deterministic
 * selection, tie-breaking, traceability, and configuration.
 *
 * Run:  cd server && npx jest src/services/__tests__/multiAgentSystem.test.js --no-coverage
 */

// ─── Mock setup ────────────────────────────────────────────────────────────

const mockPool = { query: jest.fn() };
let mockQueryResults = [];
let queryCalls = [];

jest.mock('../../config/db', () => ({
  getAppPool: () => mockPool,
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-' + Math.random().toString(36).slice(2, 8)),
}));

const registryService = require('../agentRegistryService');
const routingService = require('../agentRoutingService');
const selectionService = require('../resultSelectionService');

// ─── Helpers ───────────────────────────────────────────────────────────────

function setupQueryResults(...results) {
  mockQueryResults = [...results];
  mockPool.query.mockImplementation((...args) => {
    queryCalls.push(args);
    const result = mockQueryResults.shift();
    if (result === undefined) return Promise.resolve([[], null]);
    return Promise.resolve(result);
  });
}

afterEach(() => {
  jest.clearAllMocks();
  mockQueryResults = [];
  queryCalls = [];
});

// ─── 1. Agent Registry ────────────────────────────────────────────────────

describe('agentRegistryService', () => {
  test('createAgent requires name, provider, model_id', async () => {
    await expect(registryService.createAgent({ name: 'Test' }))
      .rejects.toThrow('name, provider, and model_id are required');
  });

  test('createAgent rejects invalid provider', async () => {
    await expect(registryService.createAgent({
      name: 'Test', provider: 'invalid', model_id: 'test'
    })).rejects.toThrow('Invalid provider: invalid');
  });

  test('createAgent inserts with correct fields', async () => {
    setupQueryResults([{ affectedRows: 1 }, null]);

    const result = await registryService.createAgent({
      name: 'Claude Sonnet',
      provider: 'anthropic',
      model_id: 'claude-sonnet-4-6',
      capabilities: ['backend', 'frontend'],
      default_priority: 10,
    });

    expect(result.name).toBe('Claude Sonnet');
    expect(result.agent_id).toBeDefined();
    const insertCall = queryCalls[0];
    expect(insertCall[0]).toMatch(/INSERT INTO agent_registry/);
    expect(insertCall[1][1]).toBe('Claude Sonnet');
    expect(insertCall[1][2]).toBe('anthropic');
    expect(JSON.parse(insertCall[1][4])).toEqual(['backend', 'frontend']);
  });

  test('setStatus validates enum', async () => {
    await expect(registryService.setStatus('id', 'invalid'))
      .rejects.toThrow('Invalid status: invalid');
  });

  test('setStatus updates correctly', async () => {
    setupQueryResults([{ affectedRows: 1 }, null]);

    const result = await registryService.setStatus('agent-1', 'inactive');

    expect(result.success).toBe(true);
    expect(queryCalls[0][1]).toEqual(['inactive', 'agent-1']);
  });

  test('listAgents parses JSON fields', async () => {
    setupQueryResults([[{
      id: 'a1', name: 'Test', provider: 'anthropic', model_id: 'test',
      capabilities: '["backend","frontend"]', config: '{"temperature":0.3}',
      status: 'active', default_priority: 10,
    }], null]);

    const agents = await registryService.listAgents();

    expect(agents[0].capabilities).toEqual(['backend', 'frontend']);
    expect(agents[0].config).toEqual({ temperature: 0.3 });
  });

  test('getByCapability uses JSON_CONTAINS', async () => {
    setupQueryResults([[], null]);

    await registryService.getByCapability('backend');

    expect(queryCalls[0][0]).toMatch(/JSON_CONTAINS/);
    expect(queryCalls[0][1][0]).toBe('"backend"');
  });
});

// ─── 2. Routing Resolution ────────────────────────────────────────────────

describe('agentRoutingService', () => {
  const makeRule = (overrides) => ({
    id: 'rule-1',
    rule_name: 'Test Rule',
    component: null,
    prompt_type: null,
    agent_id: 'agent-1',
    agent_name: 'Claude',
    agent_status: 'active',
    priority: 50,
    is_multi_agent: 0,
    comparison_agent_ids: null,
    active: 1,
    ...overrides,
  });

  const makeAgent = (overrides) => ({
    id: 'agent-1',
    name: 'Claude',
    provider: 'anthropic',
    model_id: 'claude-sonnet-4-6',
    capabilities: '["backend"]',
    config: null,
    status: 'active',
    default_priority: 10,
    ...overrides,
  });

  test('resolves exact component + type match first', async () => {
    setupQueryResults(
      // Rules query
      [[
        makeRule({ id: 'r1', component: 'backend', prompt_type: 'implementation', priority: 10, agent_id: 'a1' }),
        makeRule({ id: 'r2', component: null, prompt_type: null, priority: 100, agent_id: 'a2' }),
      ], null],
      // getAgent for primary
      [[makeAgent({ id: 'a1', name: 'Claude Sonnet' })], null]
    );

    const result = await routingService.resolveAgent('backend', 'implementation');

    expect(result.primary_agent.name).toBe('Claude Sonnet');
    expect(result.rule.id).toBe('r1');
  });

  test('falls back to catch-all when no specific match', async () => {
    setupQueryResults(
      [[
        makeRule({ id: 'r1', component: 'backend', prompt_type: 'implementation', priority: 10 }),
        makeRule({ id: 'catch', component: null, prompt_type: null, priority: 100, agent_id: 'a2' }),
      ], null],
      [[makeAgent({ id: 'a2', name: 'Catch-all Agent' })], null]
    );

    const result = await routingService.resolveAgent('frontend', 'docs');

    expect(result.primary_agent.name).toBe('Catch-all Agent');
    expect(result.rule.id).toBe('catch');
  });

  test('falls back to system default when no rules match', async () => {
    setupQueryResults(
      // No rules
      [[], null],
      // System default query
      [[makeAgent({ id: 'default', name: 'Default Agent' })], null]
    );

    const result = await routingService.resolveAgent('unknown', 'unknown');

    expect(result.primary_agent.name).toBe('Default Agent');
    expect(result.rule).toBeNull();
  });

  test('throws when no active agents exist', async () => {
    setupQueryResults(
      [[], null],  // no rules
      [[], null]   // no agents
    );

    await expect(routingService.resolveAgent('backend', 'implementation'))
      .rejects.toThrow('No active agents configured');
  });

  test('resolves multi-agent mode when rule enables it', async () => {
    setupQueryResults(
      [[makeRule({
        id: 'multi', is_multi_agent: 1,
        comparison_agent_ids: '["comp-1","comp-2"]',
        agent_id: 'primary-1',
      })], null],
      // primary agent
      [[makeAgent({ id: 'primary-1', name: 'Primary' })], null],
      // comparison agent 1
      [[makeAgent({ id: 'comp-1', name: 'Comparison 1' })], null],
      // comparison agent 2
      [[makeAgent({ id: 'comp-2', name: 'Comparison 2' })], null]
    );

    const result = await routingService.resolveAgent('backend', 'implementation');

    expect(result.is_multi_agent).toBe(true);
    expect(result.comparison_agents).toHaveLength(2);
    expect(result.comparison_agents[0].name).toBe('Comparison 1');
  });

  test('priority order determines rule matching (lowest first)', async () => {
    setupQueryResults(
      [[
        makeRule({ id: 'low-priority', component: null, prompt_type: null, priority: 100, agent_id: 'a-low' }),
        makeRule({ id: 'high-priority', component: null, prompt_type: null, priority: 10, agent_id: 'a-high' }),
      ], null],
      // Note: SQL ORDER BY priority ASC means high-priority (10) comes first
      // But our mock returns them in the order we provide — let's fix this
    );

    // Reset and provide correctly ordered results (as SQL would return)
    queryCalls = [];
    mockQueryResults = [];
    setupQueryResults(
      [[
        makeRule({ id: 'high-priority', component: null, prompt_type: null, priority: 10, agent_id: 'a-high' }),
        makeRule({ id: 'low-priority', component: null, prompt_type: null, priority: 100, agent_id: 'a-low' }),
      ], null],
      [[makeAgent({ id: 'a-high', name: 'High Priority Agent' })], null]
    );

    const result = await routingService.resolveAgent('anything', 'anything');

    expect(result.primary_agent.name).toBe('High Priority Agent');
  });

  test('createRule validates prompt_type', async () => {
    await expect(routingService.createRule({
      rule_name: 'Test', agent_id: 'a1', prompt_type: 'invalid_type'
    })).rejects.toThrow('Invalid prompt_type: invalid_type');
  });

  test('createRule requires rule_name and agent_id', async () => {
    await expect(routingService.createRule({}))
      .rejects.toThrow('rule_name and agent_id are required');
  });
});

// ─── 3. Result Scoring ────────────────────────────────────────────────────

describe('resultSelectionService scoring', () => {
  test('_scoreResult produces deterministic scores', () => {
    const result = {
      id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10,
      prompt_plan_step_id: 1, execution_duration_ms: 5000,
      completion_status: 'success', violation_count: 0, confidence: 0.95,
    };

    const score1 = selectionService._scoreResult(result);
    const score2 = selectionService._scoreResult(result);

    expect(score1.total_score).toBe(score2.total_score);
    expect(score1.completion_rank).toBe(5);
    expect(score1.violation_rank).toBe(10);
    expect(score1.confidence_rank).toBe(10); // 0.95 * 10 rounded
    expect(score1.total_score).toBe(5 * 100 + 10 * 10 + 10); // 610
  });

  test('success beats partial', () => {
    const success = selectionService._scoreResult({
      completion_status: 'success', violation_count: 0, confidence: 0.8,
    });
    const partial = selectionService._scoreResult({
      completion_status: 'partial', violation_count: 0, confidence: 0.8,
    });

    expect(success.total_score).toBeGreaterThan(partial.total_score);
  });

  test('fewer violations wins within same completion', () => {
    const clean = selectionService._scoreResult({
      completion_status: 'success', violation_count: 0, confidence: 0.8,
    });
    const dirty = selectionService._scoreResult({
      completion_status: 'success', violation_count: 3, confidence: 0.8,
    });

    expect(clean.total_score).toBeGreaterThan(dirty.total_score);
  });

  test('higher confidence wins within same completion and violations', () => {
    const highConf = selectionService._scoreResult({
      completion_status: 'success', violation_count: 0, confidence: 0.95,
    });
    const lowConf = selectionService._scoreResult({
      completion_status: 'success', violation_count: 0, confidence: 0.6,
    });

    expect(highConf.total_score).toBeGreaterThan(lowConf.total_score);
  });

  test('completion status always dominates violation count', () => {
    // Even with 0 violations, partial never beats success with 5 violations
    const successDirty = selectionService._scoreResult({
      completion_status: 'success', violation_count: 5, confidence: 0.5,
    });
    const partialClean = selectionService._scoreResult({
      completion_status: 'partial', violation_count: 0, confidence: 1.0,
    });

    expect(successDirty.total_score).toBeGreaterThan(partialClean.total_score);
  });

  test('violation rank clamps at 0 for high violation counts', () => {
    const result = selectionService._scoreResult({
      completion_status: 'success', violation_count: 20, confidence: 0.5,
    });

    expect(result.violation_rank).toBe(0);
  });
});

// ─── 4. Deterministic Selection ───────────────────────────────────────────

describe('resultSelectionService selectBestResult', () => {
  const makeResult = (overrides) => ({
    id: 'result-1',
    agent_id: 'agent-1',
    agent_name: 'Claude',
    agent_priority: 10,
    prompt_plan_step_id: 1,
    execution_group_id: 'group-1',
    execution_duration_ms: 5000,
    evaluator_status: 'evaluated',
    completion_status: 'success',
    violation_count: 0,
    violations_found: '[]',
    confidence: 0.9,
    ...overrides,
  });

  test('auto-selects single result', async () => {
    setupQueryResults(
      // Load results
      [[makeResult()], null],
      // Mark selected
      [{ affectedRows: 1 }, null]
    );

    const result = await selectionService.selectBestResult('group-1');

    expect(result.selected_result_id).toBe('result-1');
    expect(result.selection_reason).toContain('Single agent');
    expect(result.comparison).toBeNull();
  });

  test('selects agent with better completion status', async () => {
    setupQueryResults(
      [[
        makeResult({ id: 'r1', agent_id: 'a1', agent_name: 'Claude', completion_status: 'success' }),
        makeResult({ id: 'r2', agent_id: 'a2', agent_name: 'GPT', completion_status: 'partial' }),
      ], null],
      // Mark winner
      [{ affectedRows: 1 }, null],
      // Mark loser
      [{ affectedRows: 1 }, null],
      // Insert comparison
      [{ affectedRows: 1 }, null]
    );

    const result = await selectionService.selectBestResult('group-1');

    expect(result.selected_agent_id).toBe('a1');
    expect(result.selection_reason).toContain('Claude selected');
    expect(result.selection_reason).toContain('completion');
  });

  test('selects agent with fewer violations when completion is same', async () => {
    setupQueryResults(
      [[
        makeResult({ id: 'r1', agent_id: 'a1', agent_name: 'Claude', violation_count: 0 }),
        makeResult({ id: 'r2', agent_id: 'a2', agent_name: 'GPT', violation_count: 3 }),
      ], null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null]
    );

    const result = await selectionService.selectBestResult('group-1');

    expect(result.selected_agent_id).toBe('a1');
    expect(result.selection_reason).toContain('violations');
  });

  test('selects agent with higher confidence when completion and violations are same', async () => {
    setupQueryResults(
      [[
        makeResult({ id: 'r1', agent_id: 'a1', agent_name: 'Claude', confidence: 0.92 }),
        makeResult({ id: 'r2', agent_id: 'a2', agent_name: 'GPT', confidence: 0.78 }),
      ], null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null]
    );

    const result = await selectionService.selectBestResult('group-1');

    expect(result.selected_agent_id).toBe('a1');
    expect(result.selection_reason).toContain('confidence');
  });

  test('uses agent_priority as tie-breaker', async () => {
    setupQueryResults(
      [[
        makeResult({ id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10, confidence: 0.9 }),
        makeResult({ id: 'r2', agent_id: 'a2', agent_name: 'GPT', agent_priority: 30, confidence: 0.9 }),
      ], null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null]
    );

    const result = await selectionService.selectBestResult('group-1');

    expect(result.selected_agent_id).toBe('a1'); // lower priority = preferred
    expect(result.comparison.tie_breaker_used).toBe(true);
    expect(result.comparison.tie_breaker_method).toBe('agent_priority');
  });

  test('uses execution speed as final tie-breaker', async () => {
    setupQueryResults(
      [[
        makeResult({ id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10, confidence: 0.9, execution_duration_ms: 5000 }),
        makeResult({ id: 'r2', agent_id: 'a2', agent_name: 'GPT', agent_priority: 10, confidence: 0.9, execution_duration_ms: 3000 }),
      ], null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null]
    );

    const result = await selectionService.selectBestResult('group-1');

    expect(result.selected_agent_id).toBe('a2'); // faster
    expect(result.comparison.tie_breaker_used).toBe(true);
    expect(result.comparison.tie_breaker_method).toBe('execution_speed');
  });

  test('rejects selection when results not evaluated', async () => {
    setupQueryResults(
      [[
        makeResult({ id: 'r1', evaluator_status: 'evaluated' }),
        makeResult({ id: 'r2', evaluator_status: 'pending' }),
      ], null]
    );

    await expect(selectionService.selectBestResult('group-1'))
      .rejects.toThrow('Cannot select: 1 result(s) not yet evaluated');
  });

  test('records comparison with full scores', async () => {
    setupQueryResults(
      [[
        makeResult({ id: 'r1', agent_id: 'a1', agent_name: 'Claude', violation_count: 0, confidence: 0.92 }),
        makeResult({ id: 'r2', agent_id: 'a2', agent_name: 'GPT', violation_count: 2, confidence: 0.78 }),
      ], null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null]
    );

    const result = await selectionService.selectBestResult('group-1');

    // Verify comparison INSERT was called
    const insertCalls = queryCalls.filter(c => c[0].includes('INSERT INTO prompt_agent_comparisons'));
    expect(insertCalls).toHaveLength(1);

    const compScores = JSON.parse(insertCalls[0][1][6]); // comparison_scores param
    expect(compScores['a1']).toBeDefined();
    expect(compScores['a2']).toBeDefined();
    expect(compScores['a1'].total_score).toBeGreaterThan(compScores['a2'].total_score);
  });
});

// ─── 5. Evaluation ────────────────────────────────────────────────────────

describe('resultSelectionService evaluateResult', () => {
  test('validates completion_status', async () => {
    await expect(selectionService.evaluateResult('r1', {
      completion_status: 'invalid'
    })).rejects.toThrow('Invalid completion_status');
  });

  test('validates confidence range', async () => {
    await expect(selectionService.evaluateResult('r1', {
      completion_status: 'success', confidence: 1.5
    })).rejects.toThrow('confidence must be between 0 and 1');
  });

  test('records evaluation correctly', async () => {
    // First query: duplicate check (returns pending = not yet evaluated)
    // Second query: UPDATE
    setupQueryResults(
      [[{ evaluator_status: 'pending', completion_status: null, confidence: null }]],
      [{ affectedRows: 1 }, null]
    );

    const result = await selectionService.evaluateResult('r1', {
      completion_status: 'success',
      violations: [{ type: 'test', description: 'minor', severity: 'low' }],
      confidence: 0.85,
      notes: 'Looks good',
    });

    expect(result.evaluator_status).toBe('evaluated');
    expect(result.violation_count).toBe(1);
    expect(result.confidence).toBe(0.85);

    // queryCalls[0] is the duplicate check SELECT, queryCalls[1] is the UPDATE
    const updateSql = queryCalls[1][0];
    expect(updateSql).toMatch(/evaluator_status = 'evaluated'/);
    expect(updateSql).toMatch(/violation_count = \?/);
  });
});

// ─── 6. Traceability ──────────────────────────────────────────────────────

describe('traceability', () => {
  test('selection reason contains human-readable comparison', async () => {
    setupQueryResults(
      [[
        {
          id: 'r1', agent_id: 'a1', agent_name: 'Claude Sonnet 4', agent_priority: 10,
          prompt_plan_step_id: 1, execution_group_id: 'g1', execution_duration_ms: 4000,
          evaluator_status: 'evaluated', completion_status: 'success',
          violation_count: 0, confidence: 0.92, violations_found: '[]',
        },
        {
          id: 'r2', agent_id: 'a2', agent_name: 'GPT-4o', agent_priority: 30,
          prompt_plan_step_id: 1, execution_group_id: 'g1', execution_duration_ms: 6000,
          evaluator_status: 'evaluated', completion_status: 'success',
          violation_count: 2, confidence: 0.78, violations_found: '[{"type":"test"}]',
        },
      ], null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null]
    );

    const result = await selectionService.selectBestResult('g1');

    // Reason should be human-readable and contain key comparison data
    expect(result.selection_reason).toContain('Claude Sonnet 4 selected');
    expect(result.selection_reason).toContain('GPT-4o');
    expect(result.selection_reason).toContain('violations: 0 vs 2');
    expect(result.selection_reason).toContain('confidence: 0.92 vs 0.78');
  });

  test('loser results get rejection reason', async () => {
    setupQueryResults(
      [[
        {
          id: 'r1', agent_id: 'a1', agent_name: 'Claude', agent_priority: 10,
          prompt_plan_step_id: 1, execution_group_id: 'g1', execution_duration_ms: 4000,
          evaluator_status: 'evaluated', completion_status: 'success',
          violation_count: 0, confidence: 0.9, violations_found: '[]',
        },
        {
          id: 'r2', agent_id: 'a2', agent_name: 'GPT', agent_priority: 30,
          prompt_plan_step_id: 1, execution_group_id: 'g1', execution_duration_ms: 6000,
          evaluator_status: 'evaluated', completion_status: 'partial',
          violation_count: 1, confidence: 0.7, violations_found: '[]',
        },
      ], null],
      [{ affectedRows: 1 }, null], // mark winner
      [{ affectedRows: 1 }, null], // mark loser
      [{ affectedRows: 1 }, null]  // insert comparison
    );

    await selectionService.selectBestResult('g1');

    // Find the UPDATE call for the loser
    const loserUpdate = queryCalls.find(c =>
      c[0].includes('was_selected = 0') && c[0].includes('selection_reason')
    );
    expect(loserUpdate).toBeDefined();
    expect(loserUpdate[1][0]).toContain('Not selected');
    expect(loserUpdate[1][0]).toContain('outscored by Claude');
  });
});

// ─── 7. COMPLETION_RANK constants ─────────────────────────────────────────

describe('COMPLETION_RANK ordering', () => {
  test('rank ordering is deterministic and correct', () => {
    const { COMPLETION_RANK } = selectionService;

    expect(COMPLETION_RANK.success).toBeGreaterThan(COMPLETION_RANK.partial);
    expect(COMPLETION_RANK.partial).toBeGreaterThan(COMPLETION_RANK.failure);
    expect(COMPLETION_RANK.failure).toBeGreaterThanOrEqual(COMPLETION_RANK.blocked);
    expect(COMPLETION_RANK.failure).toBeGreaterThanOrEqual(COMPLETION_RANK.timeout);
  });

  test('all valid completion statuses have a rank', () => {
    const { COMPLETION_RANK, VALID_COMPLETION_STATUSES } = selectionService;
    for (const status of VALID_COMPLETION_STATUSES) {
      expect(COMPLETION_RANK[status]).toBeDefined();
      expect(typeof COMPLETION_RANK[status]).toBe('number');
    }
  });
});

// ─── 8. Same inputs → same outputs (determinism) ─────────────────────────

describe('determinism guarantees', () => {
  test('same result data always produces same score', () => {
    const data = {
      completion_status: 'partial', violation_count: 2, confidence: 0.75,
    };

    const scores = Array.from({ length: 10 }, () => selectionService._scoreResult(data));
    const firstScore = scores[0].total_score;

    for (const s of scores) {
      expect(s.total_score).toBe(firstScore);
    }
  });

  test('scoring order is transitive: if A > B and B > C, then A > C', () => {
    const a = selectionService._scoreResult({ completion_status: 'success', violation_count: 0, confidence: 0.9 });
    const b = selectionService._scoreResult({ completion_status: 'success', violation_count: 2, confidence: 0.8 });
    const c = selectionService._scoreResult({ completion_status: 'partial', violation_count: 0, confidence: 1.0 });

    expect(a.total_score).toBeGreaterThan(b.total_score);
    expect(b.total_score).toBeGreaterThan(c.total_score);
    expect(a.total_score).toBeGreaterThan(c.total_score);
  });
});

// ─── 9. Hardening: Routing Edge Cases ────────────────────────────────────

describe('routing hardening', () => {
  const makeAgent = (overrides) => ({
    id: 'agent-1', name: 'Claude', provider: 'anthropic',
    model_id: 'claude-sonnet-4-6', capabilities: '["backend"]',
    config: null, status: 'active', default_priority: 10,
    ...overrides,
  });

  test('fallback agent has parsed JSON fields (capabilities, config)', async () => {
    setupQueryResults(
      [[], null],  // no rules
      [[makeAgent({
        id: 'fallback',
        name: 'Fallback',
        capabilities: '["backend","frontend"]',
        config: '{"temperature":0.5}',
      })], null]
    );

    const result = await routingService.resolveAgent('unknown', 'unknown');

    // Must be parsed arrays/objects, not raw JSON strings
    expect(Array.isArray(result.primary_agent.capabilities)).toBe(true);
    expect(result.primary_agent.capabilities).toEqual(['backend', 'frontend']);
    expect(result.primary_agent.config).toEqual({ temperature: 0.5 });
  });

  test('fallback agent has null config parsed as null, not string', async () => {
    setupQueryResults(
      [[], null],
      [[makeAgent({ capabilities: '[]', config: null })], null]
    );

    const result = await routingService.resolveAgent('x', 'x');

    expect(result.primary_agent.capabilities).toEqual([]);
    expect(result.primary_agent.config).toBeNull();
  });

  test('inactive agent in rule is excluded by SQL WHERE clause', async () => {
    // If an agent is inactive, the JOIN + WHERE a.status='active' excludes it.
    // Simulate: no rules returned (because agent was inactive), then fallback.
    setupQueryResults(
      [[], null],
      [[makeAgent({ id: 'active-fallback', name: 'Active Fallback' })], null]
    );

    const result = await routingService.resolveAgent('backend', 'implementation');

    expect(result.primary_agent.name).toBe('Active Fallback');
    expect(result.rule).toBeNull();
  });

  test('component-only rule matches any prompt_type', async () => {
    const makeRule = (overrides) => ({
      id: 'r1', rule_name: 'Test', component: null, prompt_type: null,
      agent_id: 'a1', agent_name: 'Claude', agent_status: 'active',
      priority: 50, is_multi_agent: 0, comparison_agent_ids: null, active: 1,
      ...overrides,
    });

    setupQueryResults(
      [[makeRule({ component: 'backend', prompt_type: null, priority: 10 })], null],
      [[makeAgent({ id: 'a1' })], null]
    );

    const result = await routingService.resolveAgent('backend', 'docs');

    expect(result.rule.component).toBe('backend');
    expect(result.primary_agent).toBeDefined();
  });

  test('type-only rule matches any component', async () => {
    const makeRule = (overrides) => ({
      id: 'r1', rule_name: 'Test', component: null, prompt_type: null,
      agent_id: 'a1', agent_name: 'Claude', agent_status: 'active',
      priority: 50, is_multi_agent: 0, comparison_agent_ids: null, active: 1,
      ...overrides,
    });

    setupQueryResults(
      [[makeRule({ component: null, prompt_type: 'verification', priority: 10 })], null],
      [[makeAgent({ id: 'a1' })], null]
    );

    const result = await routingService.resolveAgent('frontend', 'verification');

    expect(result.rule.prompt_type).toBe('verification');
  });

  test('multi-agent rule with inactive comparison agent excludes that agent', async () => {
    const makeRule = (overrides) => ({
      id: 'r1', rule_name: 'Multi', component: null, prompt_type: null,
      agent_id: 'primary', agent_name: 'Claude', agent_status: 'active',
      priority: 10, is_multi_agent: 1, comparison_agent_ids: '["comp-1","comp-2"]',
      active: 1, ...overrides,
    });

    setupQueryResults(
      [[makeRule()], null],
      [[makeAgent({ id: 'primary', name: 'Primary' })], null],
      // comp-1 is active
      [[makeAgent({ id: 'comp-1', name: 'Comp 1', status: 'active' })], null],
      // comp-2 is inactive — getAgent returns it but status check filters it
      [[makeAgent({ id: 'comp-2', name: 'Comp 2', status: 'inactive' })], null]
    );

    const result = await routingService.resolveAgent('backend', 'implementation');

    expect(result.comparison_agents).toHaveLength(1);
    expect(result.comparison_agents[0].name).toBe('Comp 1');
    // is_multi_agent should be true since at least one comparison agent is active
    expect(result.is_multi_agent).toBe(true);
  });

  test('multi-agent rule with all comparison agents inactive falls back to single', async () => {
    const makeRule = (overrides) => ({
      id: 'r1', rule_name: 'Multi', component: null, prompt_type: null,
      agent_id: 'primary', agent_name: 'Claude', agent_status: 'active',
      priority: 10, is_multi_agent: 1, comparison_agent_ids: '["comp-1"]',
      active: 1, ...overrides,
    });

    setupQueryResults(
      [[makeRule()], null],
      [[makeAgent({ id: 'primary', name: 'Primary' })], null],
      [[makeAgent({ id: 'comp-1', name: 'Comp 1', status: 'inactive' })], null]
    );

    const result = await routingService.resolveAgent('backend', 'implementation');

    expect(result.comparison_agents).toHaveLength(0);
    expect(result.is_multi_agent).toBe(false);
  });
});

// ─── 10. Hardening: Selection Edge Cases ─────────────────────────────────

describe('selection hardening', () => {
  const makeResult = (overrides) => ({
    id: 'result-1', agent_id: 'agent-1', agent_name: 'Claude',
    agent_priority: 10, prompt_plan_step_id: 1, execution_group_id: 'group-1',
    execution_duration_ms: 5000, evaluator_status: 'evaluated',
    completion_status: 'success', violation_count: 0,
    violations_found: '[]', confidence: 0.9,
    ...overrides,
  });

  test('3-agent tie-break: score > priority > speed', async () => {
    setupQueryResults(
      [[
        makeResult({ id: 'r1', agent_id: 'a1', agent_name: 'Agent A', agent_priority: 20, execution_duration_ms: 3000, confidence: 0.9 }),
        makeResult({ id: 'r2', agent_id: 'a2', agent_name: 'Agent B', agent_priority: 10, execution_duration_ms: 5000, confidence: 0.9 }),
        makeResult({ id: 'r3', agent_id: 'a3', agent_name: 'Agent C', agent_priority: 30, execution_duration_ms: 1000, confidence: 0.9 }),
      ], null],
      [{ affectedRows: 1 }, null], // mark winner
      [{ affectedRows: 1 }, null], // mark loser 1
      [{ affectedRows: 1 }, null], // mark loser 2
      [{ affectedRows: 1 }, null]  // insert comparison
    );

    const result = await selectionService.selectBestResult('group-1');

    // All same score, so priority breaks it: a2 (priority 10) wins
    expect(result.selected_agent_id).toBe('a2');
    expect(result.comparison.tie_breaker_used).toBe(true);
    expect(result.comparison.tie_breaker_method).toBe('agent_priority');
  });

  test('3-agent tie-break: same score + same priority → speed wins', async () => {
    setupQueryResults(
      [[
        makeResult({ id: 'r1', agent_id: 'a1', agent_name: 'Agent A', agent_priority: 10, execution_duration_ms: 8000, confidence: 0.9 }),
        makeResult({ id: 'r2', agent_id: 'a2', agent_name: 'Agent B', agent_priority: 10, execution_duration_ms: 2000, confidence: 0.9 }),
        makeResult({ id: 'r3', agent_id: 'a3', agent_name: 'Agent C', agent_priority: 10, execution_duration_ms: 5000, confidence: 0.9 }),
      ], null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null]
    );

    const result = await selectionService.selectBestResult('group-1');

    // Same score, same priority — fastest wins: a2 (2000ms)
    expect(result.selected_agent_id).toBe('a2');
    expect(result.comparison.tie_breaker_method).toBe('execution_speed');
  });

  test('null execution_duration_ms treated as Infinity in tie-break', async () => {
    setupQueryResults(
      [[
        makeResult({ id: 'r1', agent_id: 'a1', agent_name: 'Agent A', agent_priority: 10, execution_duration_ms: null, confidence: 0.9 }),
        makeResult({ id: 'r2', agent_id: 'a2', agent_name: 'Agent B', agent_priority: 10, execution_duration_ms: 5000, confidence: 0.9 }),
      ], null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null]
    );

    const result = await selectionService.selectBestResult('group-1');

    // Null duration → Infinity, so a2 (5000ms) wins
    expect(result.selected_agent_id).toBe('a2');
    expect(result.comparison.tie_breaker_method).toBe('execution_speed');
  });

  test('failure result scores below partial regardless of violations/confidence', () => {
    const failure = selectionService._scoreResult({
      completion_status: 'failure', violation_count: 0, confidence: 1.0,
    });
    const partial = selectionService._scoreResult({
      completion_status: 'partial', violation_count: 10, confidence: 0.0,
    });

    // failure: 1*100 + 10*10 + 10 = 210
    // partial: 3*100 + 0*10 + 0 = 300
    expect(partial.total_score).toBeGreaterThan(failure.total_score);
  });

  test('blocked and timeout score identically (both 0)', () => {
    const blocked = selectionService._scoreResult({
      completion_status: 'blocked', violation_count: 0, confidence: 0.5,
    });
    const timeout = selectionService._scoreResult({
      completion_status: 'timeout', violation_count: 0, confidence: 0.5,
    });

    expect(blocked.total_score).toBe(timeout.total_score);
  });

  test('unknown completion_status gets rank 0', () => {
    const unknown = selectionService._scoreResult({
      completion_status: 'never_heard_of_this', violation_count: 0, confidence: 1.0,
    });

    expect(unknown.completion_rank).toBe(0);
    // 0*100 + 10*10 + 10 = 110
    expect(unknown.total_score).toBe(110);
  });

  test('null confidence and null violation_count default to 0', () => {
    const result = selectionService._scoreResult({
      completion_status: 'success', violation_count: null, confidence: null,
    });

    expect(result.violation_rank).toBe(10); // max(0, 10-0)
    expect(result.confidence_rank).toBe(0); // round(0 * 10)
    expect(result.total_score).toBe(5 * 100 + 10 * 10 + 0); // 600
  });

  test('loser rejection reason includes correct scores for 3 agents', async () => {
    setupQueryResults(
      [[
        makeResult({ id: 'r1', agent_id: 'a1', agent_name: 'Winner', violation_count: 0, confidence: 0.95 }),
        makeResult({ id: 'r2', agent_id: 'a2', agent_name: 'Loser1', violation_count: 2, confidence: 0.80 }),
        makeResult({ id: 'r3', agent_id: 'a3', agent_name: 'Loser2', violation_count: 5, confidence: 0.60 }),
      ], null],
      [{ affectedRows: 1 }, null], // mark winner
      [{ affectedRows: 1 }, null], // mark loser 1
      [{ affectedRows: 1 }, null], // mark loser 2
      [{ affectedRows: 1 }, null]  // insert comparison
    );

    await selectionService.selectBestResult('group-1');

    // Find loser UPDATE calls
    const loserUpdates = queryCalls.filter(c =>
      c[0].includes('was_selected = 0')
    );
    expect(loserUpdates).toHaveLength(2);

    // Both losers should reference the winner
    for (const update of loserUpdates) {
      expect(update[1][0]).toContain('outscored by Winner');
    }
  });

  test('comparison record contains all agent scores for 3 agents', async () => {
    setupQueryResults(
      [[
        makeResult({ id: 'r1', agent_id: 'a1', agent_name: 'A', confidence: 0.95 }),
        makeResult({ id: 'r2', agent_id: 'a2', agent_name: 'B', confidence: 0.80 }),
        makeResult({ id: 'r3', agent_id: 'a3', agent_name: 'C', confidence: 0.60 }),
      ], null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null],
      [{ affectedRows: 1 }, null]
    );

    await selectionService.selectBestResult('group-1');

    const insertCall = queryCalls.find(c => c[0].includes('INSERT INTO prompt_agent_comparisons'));
    const scores = JSON.parse(insertCall[1][6]);

    expect(Object.keys(scores)).toHaveLength(3);
    expect(scores['a1']).toBeDefined();
    expect(scores['a2']).toBeDefined();
    expect(scores['a3']).toBeDefined();
    // Verify ordering: a1 > a2 > a3
    expect(scores['a1'].total_score).toBeGreaterThanOrEqual(scores['a2'].total_score);
    expect(scores['a2'].total_score).toBeGreaterThanOrEqual(scores['a3'].total_score);
  });
});

// ─── 11. Hardening: Constraint Parity ────────────────────────────────────

describe('constraint parity', () => {
  test('VALID_PROMPT_TYPES is frozen and matches routing expectations', () => {
    expect(routingService.VALID_PROMPT_TYPES).toEqual(
      ['plan', 'implementation', 'verification', 'correction', 'migration', 'docs']
    );
  });

  test('VALID_COMPLETION_STATUSES matches COMPLETION_RANK keys', () => {
    const { COMPLETION_RANK, VALID_COMPLETION_STATUSES } = selectionService;
    expect(VALID_COMPLETION_STATUSES.sort()).toEqual(Object.keys(COMPLETION_RANK).sort());
  });

  test('all COMPLETION_RANK values are non-negative integers', () => {
    for (const [status, rank] of Object.entries(selectionService.COMPLETION_RANK)) {
      expect(Number.isInteger(rank)).toBe(true);
      expect(rank).toBeGreaterThanOrEqual(0);
    }
  });

  test('scoring formula is purely additive — no NaN possible with valid inputs', () => {
    for (const status of selectionService.VALID_COMPLETION_STATUSES) {
      const result = selectionService._scoreResult({
        completion_status: status, violation_count: 0, confidence: 0.5,
      });
      expect(Number.isNaN(result.total_score)).toBe(false);
      expect(Number.isFinite(result.total_score)).toBe(true);
    }
  });
});
