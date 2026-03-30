/**
 * Workflow Optimization Tests
 *
 * Tests for performance and cost optimizations across the Prompt Workflow System:
 *   1. Config caching (multiAgentExecutionService)
 *   2. Smart multi-agent skip (multiAgentExecutionService)
 *   3. Change detection (autoExecutionService)
 *   4. Duplicate evaluation prevention (resultSelectionService)
 *   5. Dashboard N+1 elimination (workflowDashboardService)
 *   6. Cost reporting (workflowCostService)
 *   7. Multi-agent routing optimization rules
 *
 * Run: cd server && npx jest src/services/__tests__/workflowOptimization.test.js --no-coverage
 */

// ─── Mock Setup ───────────────────────────────────────────────────────────

const mockPool = { query: jest.fn(), getConnection: jest.fn() };
let mockQueryResults = [];
let queryCalls = [];

jest.mock('../../config/db', () => ({
  getAppPool: () => mockPool,
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-' + Math.random().toString(36).slice(2, 8)),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────

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
  jest.resetModules();
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. CONFIG CACHING
// ═══════════════════════════════════════════════════════════════════════════

describe('Config Caching', () => {
  test('getConfig uses cached values on repeated calls within TTL', async () => {
    // Must re-require after mock setup to get fresh module
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const execService = require('../multiAgentExecutionService');
    execService.invalidateConfigCache();

    // First call: loads from DB
    setupQueryResults(
      [[{ config_key: 'multi_agent_enabled', config_value: 'false' },
        { config_key: 'auto_evaluate', config_value: 'true' }]]
    );
    const val1 = await execService.getConfig('multi_agent_enabled');
    expect(val1).toBe('false');
    expect(mockPool.query).toHaveBeenCalledTimes(1);

    // Second call: should use cache (no new DB query)
    mockPool.query.mockClear();
    const val2 = await execService.getConfig('auto_evaluate');
    expect(val2).toBe('true');
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  test('setConfig invalidates cache', async () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const execService = require('../multiAgentExecutionService');
    execService.invalidateConfigCache();

    // Load cache
    setupQueryResults(
      [[{ config_key: 'test', config_value: 'old' }]]
    );
    await execService.getConfig('test');
    expect(mockPool.query).toHaveBeenCalledTimes(1);

    // setConfig writes and invalidates
    mockPool.query.mockClear();
    setupQueryResults(
      [{ affectedRows: 1 }], // INSERT/UPDATE result
      [[{ config_key: 'test', config_value: 'new' }]] // cache reload
    );
    await execService.setConfig('test', 'new');
    const val = await execService.getConfig('test');
    expect(val).toBe('new');
    // Should have 2 calls: one for SET, one for cache reload
    expect(mockPool.query).toHaveBeenCalledTimes(2);
  });

  test('getAllConfig returns config map from cache', async () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const execService = require('../multiAgentExecutionService');
    execService.invalidateConfigCache();

    setupQueryResults(
      [[
        { config_key: 'a', config_value: '1' },
        { config_key: 'b', config_value: '2' },
      ]]
    );
    const config = await execService.getAllConfig();
    expect(config).toEqual({ a: '1', b: '2' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. DUPLICATE EVALUATION PREVENTION
// ═══════════════════════════════════════════════════════════════════════════

describe('Duplicate Evaluation Prevention', () => {
  test('evaluateResult skips when already evaluated', async () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const selectionService = require('../resultSelectionService');

    // Return existing evaluation
    setupQueryResults(
      [[{ evaluator_status: 'evaluated', completion_status: 'success', confidence: 0.8 }]]
    );

    const result = await selectionService.evaluateResult('result-1', {
      completion_status: 'success',
      violations: [],
      confidence: 0.9,
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('Already evaluated');
    // Only the SELECT check, no UPDATE
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });

  test('evaluateResult proceeds when force=true', async () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const selectionService = require('../resultSelectionService');

    // No skip check needed with force
    setupQueryResults(
      [{ affectedRows: 1 }] // UPDATE result
    );

    const result = await selectionService.evaluateResult('result-1', {
      completion_status: 'success',
      violations: [],
      confidence: 0.9,
    }, { force: true });

    expect(result.skipped).toBeUndefined();
    expect(result.completion_status).toBe('success');
  });

  test('evaluateResult proceeds when not yet evaluated', async () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const selectionService = require('../resultSelectionService');

    setupQueryResults(
      [[{ evaluator_status: 'pending', completion_status: null, confidence: null }]], // SELECT check
      [{ affectedRows: 1 }] // UPDATE
    );

    const result = await selectionService.evaluateResult('result-1', {
      completion_status: 'partial',
      violations: [{ type: 'test', description: 'test', severity: 'low' }],
      confidence: 0.5,
    });

    expect(result.skipped).toBeUndefined();
    expect(result.completion_status).toBe('partial');
    expect(result.violation_count).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. DASHBOARD N+1 ELIMINATION
// ═══════════════════════════════════════════════════════════════════════════

describe('Dashboard Active Workflows Batch Query', () => {
  test('getActiveWorkflows uses batch query instead of N+1', async () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const dashboardService = require('../workflowDashboardService');

    const workflows = [
      { id: 'wf-1', name: 'WF1', component: 'backend', status: 'active', activated_at: new Date() },
      { id: 'wf-2', name: 'WF2', component: 'frontend', status: 'active', activated_at: new Date() },
      { id: 'wf-3', name: 'WF3', component: 'backend', status: 'approved', activated_at: null },
    ];

    const allSteps = [
      { workflow_id: 'wf-1', step_number: 1, title: 'S1', prompt_id: 'p1', prompt_status: 'verified', quality_score: 90, confidence_level: 'high', escalation_required: 0, degradation_flag: 0, queue_status: null },
      { workflow_id: 'wf-1', step_number: 2, title: 'S2', prompt_id: 'p2', prompt_status: 'executing', quality_score: null, confidence_level: null, escalation_required: 0, degradation_flag: 0, queue_status: null },
      { workflow_id: 'wf-2', step_number: 1, title: 'S3', prompt_id: 'p3', prompt_status: 'draft', quality_score: null, confidence_level: null, escalation_required: 0, degradation_flag: 0, queue_status: 'blocked' },
      { workflow_id: 'wf-3', step_number: 1, title: 'S4', prompt_id: null, prompt_status: null, quality_score: null, confidence_level: null, escalation_required: 0, degradation_flag: 0, queue_status: null },
    ];

    setupQueryResults(
      [workflows],  // SELECT workflows
      [allSteps],   // SELECT all steps (batch)
    );

    const result = await dashboardService.getActiveWorkflows();

    // Should only make 2 queries (workflows + batch steps), NOT 2 + 3 per-workflow
    expect(mockPool.query).toHaveBeenCalledTimes(2);

    // Verify correct data grouping
    expect(result.length).toBe(3);
    expect(result[0].step_count).toBe(2);
    expect(result[0].verified).toBe(1);
    expect(result[0].executing).toBe(1);
    expect(result[1].step_count).toBe(1);
    expect(result[1].blocked).toBe(1);
    expect(result[2].step_count).toBe(1);
  });

  test('getActiveWorkflows handles empty workflow list', async () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const dashboardService = require('../workflowDashboardService');

    setupQueryResults([[]]);

    const result = await dashboardService.getActiveWorkflows();
    expect(result).toEqual([]);
    expect(mockPool.query).toHaveBeenCalledTimes(1); // Only the workflows query
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. MULTI-AGENT ROUTING OPTIMIZATION RULES
// ═══════════════════════════════════════════════════════════════════════════

describe('Multi-Agent Routing Optimization', () => {
  test('docs prompt type routes to cost-effective agent (single mode)', async () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const routingService = require('../agentRoutingService');

    // Mock: routing rules include docs → Haiku
    const haikuAgent = {
      id: 'haiku-1', name: 'Claude Haiku', provider: 'anthropic',
      model_id: 'claude-haiku-4-5', status: 'active', default_priority: 20,
      capabilities: '[]', config: null,
    };

    setupQueryResults(
      // Active rules
      [[{
        id: 'rule-docs', rule_name: 'Docs → Haiku', component: null,
        prompt_type: 'docs', agent_id: 'haiku-1', priority: 50,
        is_multi_agent: 0, comparison_agent_ids: null, active: 1,
        agent_name: 'Claude Haiku', agent_status: 'active',
      }]],
      // Agent lookup
      [[haikuAgent]],
    );

    const result = await routingService.resolveAgent(null, 'docs');
    expect(result.primary_agent.name).toBe('Claude Haiku');
    expect(result.is_multi_agent).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. COST REPORTING
// ═══════════════════════════════════════════════════════════════════════════

describe('Cost Reporting Service', () => {
  test('getCostReport returns structured report', async () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const costService = require('../workflowCostService');

    setupQueryResults(
      // Agent usage
      [[{
        agent_id: 'a1', agent_name: 'Sonnet', provider: 'anthropic',
        cost_per_1k_input: '0.003', cost_per_1k_output: '0.015',
        execution_count: 5, total_input_tokens: '10000', total_output_tokens: '5000',
        avg_duration_ms: 3000, selected_count: '5', success_count: '4', failure_count: '1',
      }]],
      // Comparison stats
      [[{ total_comparisons: '0', tie_breaker_count: null, unique_groups: '0' }]],
      // Workflow costs
      [[{
        id: 'wf-1', name: 'Test WF', component: 'backend', status: 'active', step_count: 3,
        execution_count: 5, total_input_tokens: '10000', total_output_tokens: '5000',
      }]],
      // Prompt type costs
      [[{
        prompt_type: 'implementation', execution_count: 3,
        input_tokens: '8000', output_tokens: '4000',
      }]],
    );

    const report = await costService.getCostReport();

    expect(report.summary.total_cost_usd).toBeGreaterThan(0);
    expect(report.summary.total_executions).toBe(5);
    expect(report.agent_distribution.length).toBe(1);
    expect(report.agent_distribution[0].agent_name).toBe('Sonnet');
    expect(report.agent_distribution[0].success_rate).toBe(80);
    expect(report.most_expensive_workflows.length).toBe(1);
    expect(report.cost_by_prompt_type.length).toBe(1);
    expect(report.generated_at).toBeDefined();
  });

  test('getCostReport handles zero executions', async () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const costService = require('../workflowCostService');

    setupQueryResults(
      [[{ agent_id: 'a1', agent_name: 'Sonnet', provider: 'anthropic',
          cost_per_1k_input: '0.003', cost_per_1k_output: '0.015',
          execution_count: 0, total_input_tokens: null, total_output_tokens: null,
          avg_duration_ms: null, selected_count: null, success_count: '0', failure_count: '0' }]],
      [[{ total_comparisons: '0', tie_breaker_count: null, unique_groups: '0' }]],
      [[]],
      [[]],
    );

    const report = await costService.getCostReport();
    expect(report.summary.total_cost_usd).toBe(0);
    expect(report.summary.total_executions).toBe(0);
    expect(report.summary.avg_cost_per_execution).toBe(0);
  });

  test('getWorkflowCost returns per-workflow breakdown', async () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const costService = require('../workflowCostService');

    setupQueryResults(
      // Workflow
      [[{ id: 'wf-1', name: 'Test', component: 'backend', status: 'active', step_count: 2 }]],
      // Execution results
      [[
        { prompt_plan_step_id: 'p1', agent_id: 'a1', execution_duration_ms: 2000,
          token_count_input: 5000, token_count_output: 2000, was_selected: 1,
          completion_status: 'success', evaluator_status: 'evaluated',
          agent_name: 'Sonnet', cost_per_1k_input: '0.003', cost_per_1k_output: '0.015' },
      ]],
    );

    const cost = await costService.getWorkflowCost('wf-1');
    expect(cost.workflow_name).toBe('Test');
    expect(cost.cost.total_usd).toBeGreaterThan(0);
    expect(cost.cost.execution_count).toBe(1);
    expect(cost.cost.wasted_executions).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. CHANGE DETECTION (Auto-Execution)
// ═══════════════════════════════════════════════════════════════════════════

describe('Auto-Execution Change Detection', () => {
  test('decision engine classifyPrompt is deterministic', () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const decisionEngine = require('../decisionEngineService');

    const prompt = {
      id: 'p1', title: 'Test', component: 'backend', status: 'approved',
      queue_status: 'ready_for_release', priority: 'normal', quality_score: 85,
      confidence_level: 'high', degradation_flag: 0, escalation_required: 0,
      evaluator_status: 'pass', completion_status: 'complete',
      overdue: 0, release_mode: 'auto_safe',
    };

    // Same input must produce same output (determinism check)
    const result1 = decisionEngine.classifyPrompt(prompt);
    const result2 = decisionEngine.classifyPrompt(prompt);
    expect(result1.action).toBe(result2.action);
    expect(result1.rule_id).toBe(result2.rule_id);
    expect(result1.action).toBe('RELEASE_NOW');
  });

  test('classifyPrompt returns NO_ACTION for terminal states', () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const decisionEngine = require('../decisionEngineService');

    const verified = { id: 'p1', status: 'verified', queue_status: null };
    expect(decisionEngine.classifyPrompt(verified).action).toBe('NO_ACTION');
  });

  test('classifyPrompt returns FIX_REQUIRED for escalated prompts', () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const decisionEngine = require('../decisionEngineService');

    const escalated = {
      id: 'p1', status: 'approved', queue_status: 'ready_for_release',
      escalation_required: 1, quality_score: 20, escalation_reason: 'Low quality',
    };
    const result = decisionEngine.classifyPrompt(escalated);
    expect(result.action).toBe('FIX_REQUIRED');
    expect(result.rule_id).toBe('R2');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. QUEUE RECALCULATION CORRECTNESS
// ═══════════════════════════════════════════════════════════════════════════

describe('Queue and Dashboard Safety Under Optimization', () => {
  test('getDashboard runs all 5 panels in parallel', async () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const dashboardService = require('../workflowDashboardService');

    // Set up enough query results for all 5 parallel calls
    // Each panel may run multiple queries
    const emptyResult = [[]];
    for (let i = 0; i < 20; i++) {
      mockQueryResults.push(emptyResult);
    }
    mockPool.query.mockImplementation(() => {
      const result = mockQueryResults.shift();
      return Promise.resolve(result || [[]]);
    });

    const dashboard = await dashboardService.getDashboard({});
    expect(dashboard.generated_at).toBeDefined();
    expect(dashboard.summary).toBeDefined();
    expect(dashboard.active_workflows).toBeDefined();
    expect(dashboard.exceptions).toBeDefined();
    expect(dashboard.ready_to_release).toBeDefined();
    expect(dashboard.activity).toBeDefined();
  });

  test('prioritizeActions maintains deterministic sort', () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const decisionEngine = require('../decisionEngineService');

    const actions = [
      { action: 'WAIT', blocking_pipeline: false, context: { overdue: false }, priority: 'low', target: { workflow_step_number: 1 } },
      { action: 'FIX_REQUIRED', blocking_pipeline: true, context: { overdue: false }, priority: 'critical', target: { workflow_step_number: 2 } },
      { action: 'RELEASE_NOW', blocking_pipeline: false, context: { overdue: true }, priority: 'high', target: { workflow_step_number: 1 } },
      { action: 'UNBLOCK_REQUIRED', blocking_pipeline: true, context: { overdue: false }, priority: 'high', target: { workflow_step_number: 3 } },
    ];

    const sorted = decisionEngine.prioritizeActions([...actions]);
    expect(sorted[0].action).toBe('FIX_REQUIRED');
    expect(sorted[1].action).toBe('UNBLOCK_REQUIRED');
    expect(sorted[2].action).toBe('RELEASE_NOW');
    expect(sorted[3].action).toBe('WAIT');

    // Run again — must produce same order (determinism)
    const sorted2 = decisionEngine.prioritizeActions([...actions]);
    expect(sorted2.map(s => s.action)).toEqual(sorted.map(s => s.action));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. LEARNING SYSTEM SAFETY
// ═══════════════════════════════════════════════════════════════════════════

describe('Learning System Safety Under Optimization', () => {
  test('buildSignature is deterministic', () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const learningService = require('../workflowLearningService');

    const sig1 = learningService.buildSignature('violation_pattern', 'wrong_api_client', 'backend');
    const sig2 = learningService.buildSignature('violation_pattern', 'wrong_api_client', 'backend');
    expect(sig1).toBe(sig2);
    expect(sig1).toBe('violation:wrong_api_client:backend');
  });

  test('severity escalation thresholds are consistent', () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const learningService = require('../workflowLearningService');

    expect(learningService.SEVERITY_ESCALATION.low.threshold).toBe(5);
    expect(learningService.SEVERITY_ESCALATION.low.escalate_to).toBe('medium');
    expect(learningService.SEVERITY_ESCALATION.medium.threshold).toBe(8);
    expect(learningService.SEVERITY_ESCALATION.critical).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. AUTO-EXECUTION POLICY SAFETY
// ═══════════════════════════════════════════════════════════════════════════

describe('Auto-Execution Policy Safety', () => {
  test('SAFE mode requires all 10 rules to pass', () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const policyService = require('../autoExecutionPolicyService');

    // A prompt that passes all rules
    const rec = { action: 'RELEASE_NOW' };
    const prompt = {
      id: 'p1', title: 'Test', confidence_level: 'high',
      evaluator_status: 'pass', completion_status: 'complete',
      escalation_required: false, degradation_flag: false,
      queue_status: 'ready_for_release', release_mode: 'auto_safe',
      _has_chain_failure: false, _auto_execute_excluded: false,
    };

    const result = policyService.evaluateEligibility(rec, prompt, 'SAFE');
    expect(result.eligible).toBe(true);
    expect(result.passed_count).toBe(10);
    expect(result.failures.length).toBe(0);
  });

  test('SAFE mode rejects low confidence', () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const policyService = require('../autoExecutionPolicyService');

    const rec = { action: 'RELEASE_NOW' };
    const prompt = {
      id: 'p1', title: 'Test', confidence_level: 'low',
      evaluator_status: 'pass', completion_status: 'complete',
      escalation_required: false, degradation_flag: false,
      queue_status: 'ready_for_release', release_mode: 'auto_safe',
      _has_chain_failure: false, _auto_execute_excluded: false,
    };

    const result = policyService.evaluateEligibility(rec, prompt, 'SAFE');
    expect(result.eligible).toBe(false);
    expect(result.failures.some(f => f.id === 'E2')).toBe(true);
  });

  test('FULL mode accepts medium confidence', () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const policyService = require('../autoExecutionPolicyService');

    const rec = { action: 'RELEASE_NOW' };
    const prompt = {
      id: 'p1', title: 'Test', confidence_level: 'medium',
      evaluator_status: 'pass', completion_status: 'complete',
      escalation_required: false, degradation_flag: false,
      queue_status: 'ready_for_release', release_mode: 'auto_full',
      _has_chain_failure: false, _auto_execute_excluded: false,
    };

    const result = policyService.evaluateEligibility(rec, prompt, 'FULL');
    expect(result.eligible).toBe(true);
  });

  test('cannot auto-execute with chain failure', () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const policyService = require('../autoExecutionPolicyService');

    const rec = { action: 'RELEASE_NOW' };
    const prompt = {
      id: 'p1', title: 'Test', confidence_level: 'high',
      evaluator_status: 'pass', completion_status: 'complete',
      escalation_required: false, degradation_flag: false,
      queue_status: 'ready_for_release', release_mode: 'auto_safe',
      _has_chain_failure: true, _auto_execute_excluded: false,
    };

    const result = policyService.evaluateEligibility(rec, prompt, 'SAFE');
    expect(result.eligible).toBe(false);
    expect(result.failures.some(f => f.id === 'E9')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. RESULT SCORING DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════

describe('Result Scoring Determinism', () => {
  test('_scoreResult produces deterministic scores', () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const selectionService = require('../resultSelectionService');

    const result = {
      id: 'r1', agent_id: 'a1', agent_name: 'Sonnet',
      agent_priority: 10, prompt_plan_step_id: 's1',
      execution_duration_ms: 3000, completion_status: 'success',
      violation_count: 0, confidence: 0.85,
    };

    const score1 = selectionService._scoreResult(result);
    const score2 = selectionService._scoreResult(result);

    expect(score1.total_score).toBe(score2.total_score);
    expect(score1.total_score).toBe(5 * 100 + 10 * 10 + 9); // success=5, violations=0→10, confidence=0.85→9
  });

  test('success always beats partial in scoring', () => {
    jest.resetModules();
    jest.mock('../../config/db', () => ({ getAppPool: () => mockPool }));
    const selectionService = require('../resultSelectionService');

    const success = selectionService._scoreResult({
      completion_status: 'success', violation_count: 2, confidence: 0.5,
    });
    const partial = selectionService._scoreResult({
      completion_status: 'partial', violation_count: 0, confidence: 1.0,
    });

    expect(success.total_score).toBeGreaterThan(partial.total_score);
  });
});
