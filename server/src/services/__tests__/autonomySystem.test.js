/**
 * Autonomy System Tests
 *
 * Comprehensive tests for:
 *   - Mode ordering and action permissions
 *   - Safety gates (G1-G12)
 *   - Pause conditions (P1-P8)
 *   - Manual-only flags (workflow, step, prompt)
 *   - Autonomous advance engine (single step, chaining, completion)
 *   - Traceability logging
 *   - Determinism guarantees
 *   - Auto-execution integration
 */

const autonomyPolicy = require('../autonomyPolicyService');
const { AUTONOMY_MODE, ACTION_TYPE, MODE_ORDER } = autonomyPolicy;

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCtx(overrides = {}) {
  return {
    prompt: {
      id: 1,
      confidence_level: 'high',
      evaluator_status: 'pass',
      completion_status: 'complete',
      degradation_flag: 0,
      escalation_required: 0,
      queue_status: 'ready_for_release',
      manual_only: 0,
      ...overrides.prompt,
    },
    workflow: {
      id: 10,
      name: 'Test Workflow',
      manual_only: 0,
      autonomy_paused: 0,
      autonomy_pause_reason: null,
      ...overrides.workflow,
    },
    step: {
      id: 100,
      step_number: 1,
      manual_only: 0,
      ...overrides.step,
    },
    recommendation: overrides.recommendation || null,
    hasCriticalLearningConflict: overrides.hasCriticalLearningConflict || false,
    agentResultFinal: overrides.agentResultFinal !== undefined ? overrides.agentResultFinal : true,
    correctionCount: overrides.correctionCount || 0,
    comparisonInconclusive: overrides.comparisonInconclusive || false,
  };
}

// ─── 1. Mode Ordering ─────────────────────────────────────────────────────

describe('Autonomy Mode Ordering', () => {
  test('modes are ordered OFF < RELEASE_ONLY < SAFE_ADVANCE < SUPERVISED_FLOW', () => {
    expect(MODE_ORDER).toEqual(['OFF', 'RELEASE_ONLY', 'SAFE_ADVANCE', 'SUPERVISED_FLOW']);
  });

  test('OFF permits no actions', () => {
    expect(autonomyPolicy.modePermitsAction('OFF', ACTION_TYPE.RELEASE)).toBe(false);
    expect(autonomyPolicy.modePermitsAction('OFF', ACTION_TYPE.TRIGGER_EVAL)).toBe(false);
    expect(autonomyPolicy.modePermitsAction('OFF', ACTION_TYPE.QUEUE_NEXT)).toBe(false);
    expect(autonomyPolicy.modePermitsAction('OFF', ACTION_TYPE.ADVANCE_WORKFLOW)).toBe(false);
  });

  test('RELEASE_ONLY permits only RELEASE', () => {
    expect(autonomyPolicy.modePermitsAction('RELEASE_ONLY', ACTION_TYPE.RELEASE)).toBe(true);
    expect(autonomyPolicy.modePermitsAction('RELEASE_ONLY', ACTION_TYPE.TRIGGER_EVAL)).toBe(false);
    expect(autonomyPolicy.modePermitsAction('RELEASE_ONLY', ACTION_TYPE.QUEUE_NEXT)).toBe(false);
    expect(autonomyPolicy.modePermitsAction('RELEASE_ONLY', ACTION_TYPE.ADVANCE_WORKFLOW)).toBe(false);
  });

  test('SAFE_ADVANCE permits RELEASE + TRIGGER_EVAL + QUEUE_NEXT + ADVANCE_WORKFLOW', () => {
    expect(autonomyPolicy.modePermitsAction('SAFE_ADVANCE', ACTION_TYPE.RELEASE)).toBe(true);
    expect(autonomyPolicy.modePermitsAction('SAFE_ADVANCE', ACTION_TYPE.TRIGGER_EVAL)).toBe(true);
    expect(autonomyPolicy.modePermitsAction('SAFE_ADVANCE', ACTION_TYPE.QUEUE_NEXT)).toBe(true);
    expect(autonomyPolicy.modePermitsAction('SAFE_ADVANCE', ACTION_TYPE.ADVANCE_WORKFLOW)).toBe(true);
  });

  test('SUPERVISED_FLOW permits all actions', () => {
    expect(autonomyPolicy.modePermitsAction('SUPERVISED_FLOW', ACTION_TYPE.RELEASE)).toBe(true);
    expect(autonomyPolicy.modePermitsAction('SUPERVISED_FLOW', ACTION_TYPE.TRIGGER_EVAL)).toBe(true);
    expect(autonomyPolicy.modePermitsAction('SUPERVISED_FLOW', ACTION_TYPE.QUEUE_NEXT)).toBe(true);
    expect(autonomyPolicy.modePermitsAction('SUPERVISED_FLOW', ACTION_TYPE.ADVANCE_WORKFLOW)).toBe(true);
  });

  test('unknown mode permits nothing', () => {
    expect(autonomyPolicy.modePermitsAction('BOGUS', ACTION_TYPE.RELEASE)).toBe(false);
  });

  test('unknown action type returns false', () => {
    expect(autonomyPolicy.modePermitsAction('SUPERVISED_FLOW', 'DESTROY_EVERYTHING')).toBe(false);
  });
});

// ─── 2. Safety Gates ──────────────────────────────────────────────────────

describe('Safety Gates (G1-G12)', () => {
  test('all gates pass with valid context', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx());
    expect(result.safe).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(result.passed_count).toBe(12);
    expect(result.total_gates).toBe(12);
  });

  test('G1: blocks when confidence is not high', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({ prompt: { confidence_level: 'medium' } }));
    expect(result.safe).toBe(false);
    expect(result.failures.some(f => f.id === 'G1')).toBe(true);
  });

  test('G1: blocks when confidence is null/unknown', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({ prompt: { confidence_level: null } }));
    expect(result.failures.some(f => f.id === 'G1')).toBe(true);
  });

  test('G2: blocks when evaluator_status is not pass', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({ prompt: { evaluator_status: 'pending' } }));
    expect(result.failures.some(f => f.id === 'G2')).toBe(true);
  });

  test('G3: blocks when completion_status is not complete', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({ prompt: { completion_status: 'partial' } }));
    expect(result.failures.some(f => f.id === 'G3')).toBe(true);
  });

  test('G4: blocks when degradation_flag is set', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({ prompt: { degradation_flag: 1 } }));
    expect(result.failures.some(f => f.id === 'G4')).toBe(true);
  });

  test('G5: blocks when escalation_required is set', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({ prompt: { escalation_required: 1 } }));
    expect(result.failures.some(f => f.id === 'G5')).toBe(true);
  });

  test('G6: blocks when queue_status is blocked', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({ prompt: { queue_status: 'blocked' } }));
    expect(result.failures.some(f => f.id === 'G6')).toBe(true);
  });

  test('G6: blocks when queue_status is pending', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({ prompt: { queue_status: 'pending' } }));
    expect(result.failures.some(f => f.id === 'G6')).toBe(true);
  });

  test('G7: blocks when prompt manual_only is set', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({ prompt: { manual_only: 1 } }));
    expect(result.failures.some(f => f.id === 'G7')).toBe(true);
  });

  test('G8: blocks when step manual_only is set', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({ step: { manual_only: 1 } }));
    expect(result.failures.some(f => f.id === 'G8')).toBe(true);
  });

  test('G9: blocks when workflow manual_only is set', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({ workflow: { manual_only: 1 } }));
    expect(result.failures.some(f => f.id === 'G9')).toBe(true);
  });

  test('G10: blocks when workflow autonomy_paused is set', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({
      workflow: { autonomy_paused: 1, autonomy_pause_reason: 'operator paused' }
    }));
    expect(result.failures.some(f => f.id === 'G10')).toBe(true);
  });

  test('G11: blocks when critical learning conflict exists', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({ hasCriticalLearningConflict: true }));
    expect(result.failures.some(f => f.id === 'G11')).toBe(true);
  });

  test('G12: blocks when agent result not final', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({ agentResultFinal: false }));
    expect(result.failures.some(f => f.id === 'G12')).toBe(true);
  });

  test('multiple gates can fail simultaneously', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({
      prompt: { confidence_level: 'low', degradation_flag: 1, escalation_required: 1 },
    }));
    expect(result.safe).toBe(false);
    expect(result.failures.length).toBeGreaterThanOrEqual(3);
    const ids = result.failures.map(f => f.id);
    expect(ids).toContain('G1');
    expect(ids).toContain('G4');
    expect(ids).toContain('G5');
  });

  test('gate evaluation is deterministic — same input gives same output', () => {
    const ctx = makeCtx({ prompt: { confidence_level: 'medium' } });
    const r1 = autonomyPolicy.evaluateSafetyGates(ctx);
    const r2 = autonomyPolicy.evaluateSafetyGates(ctx);
    expect(r1).toEqual(r2);
  });

  test('null step does not block (G8 passes)', () => {
    const ctx = makeCtx();
    ctx.step = null;
    const result = autonomyPolicy.evaluateSafetyGates(ctx);
    expect(result.failures.some(f => f.id === 'G8')).toBe(false);
  });

  test('null workflow does not block (G9, G10 pass)', () => {
    const ctx = makeCtx();
    ctx.workflow = null;
    const result = autonomyPolicy.evaluateSafetyGates(ctx);
    expect(result.failures.some(f => f.id === 'G9')).toBe(false);
    expect(result.failures.some(f => f.id === 'G10')).toBe(false);
  });
});

// ─── 3. Pause Conditions ──────────────────────────────────────────────────

describe('Pause Conditions (P1-P8)', () => {
  test('no pause with clean context', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx());
    expect(result.shouldPause).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  test('P1: pauses on FIX_REQUIRED recommendation', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx({
      recommendation: { action: 'FIX_REQUIRED' },
    }));
    expect(result.shouldPause).toBe(true);
    expect(result.reasons.some(r => r.id === 'P1')).toBe(true);
  });

  test('P2: pauses on UNBLOCK_REQUIRED recommendation', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx({
      recommendation: { action: 'UNBLOCK_REQUIRED' },
    }));
    expect(result.shouldPause).toBe(true);
    expect(result.reasons.some(r => r.id === 'P2')).toBe(true);
  });

  test('P3: pauses on REVIEW_REQUIRED recommendation', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx({
      recommendation: { action: 'REVIEW_REQUIRED' },
    }));
    expect(result.shouldPause).toBe(true);
    expect(result.reasons.some(r => r.id === 'P3')).toBe(true);
  });

  test('P4: pauses on degradation flag', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx({
      prompt: { degradation_flag: 1 },
    }));
    expect(result.shouldPause).toBe(true);
    expect(result.reasons.some(r => r.id === 'P4')).toBe(true);
  });

  test('P5: pauses on low confidence', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx({
      prompt: { confidence_level: 'low' },
    }));
    expect(result.shouldPause).toBe(true);
    expect(result.reasons.some(r => r.id === 'P5')).toBe(true);
  });

  test('P5: pauses on unknown confidence', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx({
      prompt: { confidence_level: 'unknown' },
    }));
    expect(result.shouldPause).toBe(true);
    expect(result.reasons.some(r => r.id === 'P5')).toBe(true);
  });

  test('P5: does NOT pause on medium confidence', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx({
      prompt: { confidence_level: 'medium' },
    }));
    expect(result.reasons.some(r => r.id === 'P5')).toBe(false);
  });

  test('P6: pauses on inconclusive comparison', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx({
      comparisonInconclusive: true,
    }));
    expect(result.shouldPause).toBe(true);
    expect(result.reasons.some(r => r.id === 'P6')).toBe(true);
  });

  test('P7: pauses on 2+ corrections', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx({
      correctionCount: 2,
    }));
    expect(result.shouldPause).toBe(true);
    expect(result.reasons.some(r => r.id === 'P7')).toBe(true);
  });

  test('P7: does NOT pause on 1 correction', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx({
      correctionCount: 1,
    }));
    expect(result.reasons.some(r => r.id === 'P7')).toBe(false);
  });

  test('P8: pauses on step manual_only', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx({
      step: { manual_only: 1 },
    }));
    expect(result.shouldPause).toBe(true);
    expect(result.reasons.some(r => r.id === 'P8')).toBe(true);
  });

  test('multiple pause conditions can trigger simultaneously', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx({
      prompt: { degradation_flag: 1, confidence_level: 'low' },
      recommendation: { action: 'FIX_REQUIRED' },
      correctionCount: 3,
    }));
    expect(result.shouldPause).toBe(true);
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });

  test('pause check is deterministic', () => {
    const ctx = makeCtx({ recommendation: { action: 'FIX_REQUIRED' } });
    const r1 = autonomyPolicy.checkPauseConditions(ctx);
    const r2 = autonomyPolicy.checkPauseConditions(ctx);
    expect(r1).toEqual(r2);
  });
});

// ─── 4. Manual-Only Flags ─────────────────────────────────────────────────

describe('Manual-Only Gate Behavior', () => {
  test('prompt manual_only blocks safety gates (G7)', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({ prompt: { manual_only: 1 } }));
    expect(result.safe).toBe(false);
    expect(result.failures.find(f => f.id === 'G7').reason).toContain('manual_only');
  });

  test('step manual_only blocks safety gates (G8) AND pause conditions (P8)', () => {
    const ctx = makeCtx({ step: { manual_only: 1 } });
    const gateResult = autonomyPolicy.evaluateSafetyGates(ctx);
    const pauseResult = autonomyPolicy.checkPauseConditions(ctx);
    expect(gateResult.failures.some(f => f.id === 'G8')).toBe(true);
    expect(pauseResult.reasons.some(r => r.id === 'P8')).toBe(true);
  });

  test('workflow manual_only blocks safety gates (G9)', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({ workflow: { manual_only: 1 } }));
    expect(result.failures.some(f => f.id === 'G9')).toBe(true);
  });

  test('manual_only=0 does not block', () => {
    const ctx = makeCtx({
      prompt: { manual_only: 0 },
      step: { manual_only: 0 },
      workflow: { manual_only: 0 },
    });
    const result = autonomyPolicy.evaluateSafetyGates(ctx);
    expect(result.failures.some(f => ['G7', 'G8', 'G9'].includes(f.id))).toBe(false);
  });
});

// ─── 5. Autonomous Advance Engine ─────────────────────────────────────────

describe('Autonomous Advance Service', () => {
  // These tests use mocked DB — we test the advance engine's logic
  // by mocking autonomyPolicyService and workflowService

  let advanceService;
  let mockPool;
  let mockQuery;

  beforeEach(() => {
    jest.resetModules();

    mockQuery = jest.fn();
    mockPool = { query: mockQuery };

    // Mock db config
    jest.mock('../../config/db', () => ({
      getAppPool: () => mockPool,
    }));

    // Mock autonomyPolicy
    jest.mock('../autonomyPolicyService', () => {
      const actual = jest.requireActual('../autonomyPolicyService');
      return {
        ...actual,
        getStatus: jest.fn(),
        logAutonomousAction: jest.fn().mockResolvedValue(undefined),
        pauseWorkflow: jest.fn().mockResolvedValue(undefined),
        hasCriticalLearningConflict: jest.fn().mockResolvedValue(false),
        getCorrectionCount: jest.fn().mockResolvedValue(0),
      };
    });

    // Mock workflowService
    jest.mock('../workflowService', () => ({
      completeWorkflow: jest.fn().mockResolvedValue({}),
    }));

    // Mock decisionEngine
    jest.mock('../decisionEngineService', () => ({
      classifyPrompt: jest.fn().mockReturnValue({ action: 'RELEASE_NOW' }),
    }));

    advanceService = require('../autonomousAdvanceService');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('skips when mode is OFF', async () => {
    const policy = require('../autonomyPolicyService');
    policy.getStatus.mockResolvedValue({ enabled: false, mode: 'OFF' });

    const result = await advanceService.advanceWorkflows();
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('OFF');
  });

  test('skips when mode is RELEASE_ONLY', async () => {
    const policy = require('../autonomyPolicyService');
    policy.getStatus.mockResolvedValue({ enabled: true, mode: 'RELEASE_ONLY' });

    const result = await advanceService.advanceWorkflows();
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('RELEASE_ONLY');
  });

  test('skips when not enabled', async () => {
    const policy = require('../autonomyPolicyService');
    policy.getStatus.mockResolvedValue({ enabled: false, mode: 'SAFE_ADVANCE' });

    const result = await advanceService.advanceWorkflows();
    expect(result.skipped).toBe(true);
  });

  test('processes active workflows in SAFE_ADVANCE mode', async () => {
    const policy = require('../autonomyPolicyService');
    policy.getStatus.mockResolvedValue({ enabled: true, mode: 'SAFE_ADVANCE' });

    // No active workflows
    mockQuery.mockResolvedValueOnce([[], []]); // SELECT * FROM prompt_workflows

    const result = await advanceService.advanceWorkflows();
    expect(result.skipped).toBeUndefined();
    expect(result.mode).toBe('SAFE_ADVANCE');
    expect(result.workflows_inspected).toBe(0);
  });

  test('pauses on manual_only workflow', async () => {
    const policy = require('../autonomyPolicyService');
    policy.getStatus.mockResolvedValue({ enabled: true, mode: 'SAFE_ADVANCE' });

    // Return one manual_only workflow
    mockQuery.mockResolvedValueOnce([[{
      id: 1, name: 'Manual WF', status: 'active', manual_only: 1, autonomy_paused: 0,
    }], []]);

    const result = await advanceService.advanceWorkflows();
    expect(result.workflows_inspected).toBe(1);
    expect(result.pauses).toHaveLength(1);
    expect(result.pauses[0].gate_id).toBe('G9');
  });

  test('pauses on autonomy_paused workflow', async () => {
    const policy = require('../autonomyPolicyService');
    policy.getStatus.mockResolvedValue({ enabled: true, mode: 'SAFE_ADVANCE' });

    mockQuery.mockResolvedValueOnce([[{
      id: 1, name: 'Paused WF', status: 'active', manual_only: 0,
      autonomy_paused: 1, autonomy_pause_reason: 'Test pause',
    }], []]);

    const result = await advanceService.advanceWorkflows();
    expect(result.pauses).toHaveLength(1);
    expect(result.pauses[0].gate_id).toBe('G10');
  });

  test('completes workflow when all steps are verified', async () => {
    const policy = require('../autonomyPolicyService');
    const workflowSvc = require('../workflowService');
    policy.getStatus.mockResolvedValue({ enabled: true, mode: 'SAFE_ADVANCE' });

    // Active workflow
    mockQuery.mockResolvedValueOnce([[{
      id: 1, name: 'Ready WF', status: 'active', manual_only: 0,
      autonomy_paused: 0, component: 'test',
    }], []]);

    // All steps verified
    mockQuery.mockResolvedValueOnce([[
      { step_number: 1, prompt_id: 10, prompt_status: 'verified', title: 'Step 1' },
      { step_number: 2, prompt_id: 11, prompt_status: 'verified', title: 'Step 2' },
    ], []]);

    const result = await advanceService.advanceWorkflows();
    expect(result.actions_taken).toHaveLength(1);
    expect(result.actions_taken[0].action).toBe('ADVANCE_WORKFLOW');
    expect(workflowSvc.completeWorkflow).toHaveBeenCalledWith(1, 'system:autonomy');
  });

  test('records errors without crashing the loop', async () => {
    const policy = require('../autonomyPolicyService');
    policy.getStatus.mockResolvedValue({ enabled: true, mode: 'SAFE_ADVANCE' });

    // Active workflow
    mockQuery.mockResolvedValueOnce([[{
      id: 1, name: 'Error WF', status: 'active', manual_only: 0, autonomy_paused: 0,
    }], []]);

    // Throw on steps query
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    const result = await advanceService.advanceWorkflows();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe('DB connection lost');
  });

  test('returns empty actions for workflow with no steps', async () => {
    const policy = require('../autonomyPolicyService');
    policy.getStatus.mockResolvedValue({ enabled: true, mode: 'SAFE_ADVANCE' });

    mockQuery.mockResolvedValueOnce([[{
      id: 1, name: 'Empty WF', status: 'active', manual_only: 0, autonomy_paused: 0,
    }], []]);

    // No steps
    mockQuery.mockResolvedValueOnce([[], []]);

    const result = await advanceService.advanceWorkflows();
    expect(result.actions_taken).toHaveLength(0);
    expect(result.pauses).toHaveLength(0);
  });
});

// ─── 6. Traceability ──────────────────────────────────────────────────────

describe('Traceability & Logging', () => {
  test('SAFETY_GATES array has exactly 12 gates', () => {
    expect(autonomyPolicy.SAFETY_GATES).toHaveLength(12);
  });

  test('PAUSE_CONDITIONS array has exactly 8 conditions', () => {
    expect(autonomyPolicy.PAUSE_CONDITIONS).toHaveLength(8);
  });

  test('every gate has id, name, test, and reason', () => {
    for (const gate of autonomyPolicy.SAFETY_GATES) {
      expect(gate).toHaveProperty('id');
      expect(gate).toHaveProperty('name');
      expect(typeof gate.test).toBe('function');
      expect(typeof gate.reason).toBe('function');
    }
  });

  test('every pause condition has id, name, test, and reason', () => {
    for (const cond of autonomyPolicy.PAUSE_CONDITIONS) {
      expect(cond).toHaveProperty('id');
      expect(cond).toHaveProperty('name');
      expect(typeof cond.test).toBe('function');
      expect(typeof cond.reason).toBe('function');
    }
  });

  test('gate IDs are unique and sequential G1-G12', () => {
    const ids = autonomyPolicy.SAFETY_GATES.map(g => g.id);
    for (let i = 1; i <= 12; i++) {
      expect(ids).toContain(`G${i}`);
    }
    expect(new Set(ids).size).toBe(12);
  });

  test('pause condition IDs are unique and sequential P1-P8', () => {
    const ids = autonomyPolicy.PAUSE_CONDITIONS.map(p => p.id);
    for (let i = 1; i <= 8; i++) {
      expect(ids).toContain(`P${i}`);
    }
    expect(new Set(ids).size).toBe(8);
  });

  test('evaluateSafetyGates returns full audit info (passed_count, total_gates)', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx());
    expect(result).toHaveProperty('passed_count');
    expect(result).toHaveProperty('total_gates');
    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('failures');
    expect(result.passed_count + result.failures.length).toBe(result.total_gates);
  });

  test('gate failure reasons include context values', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({
      prompt: { confidence_level: 'low', evaluator_status: 'fail' },
    }));
    const g1 = result.failures.find(f => f.id === 'G1');
    expect(g1.reason).toContain('low');
    const g2 = result.failures.find(f => f.id === 'G2');
    expect(g2.reason).toContain('fail');
  });
});

// ─── 7. Determinism ──────────────────────────────────────────────────────

describe('Determinism Guarantees', () => {
  test('same context produces identical gate results across 100 runs', () => {
    const ctx = makeCtx({
      prompt: { confidence_level: 'medium', degradation_flag: 1 },
      hasCriticalLearningConflict: true,
    });
    const baseline = autonomyPolicy.evaluateSafetyGates(ctx);
    for (let i = 0; i < 100; i++) {
      const result = autonomyPolicy.evaluateSafetyGates(ctx);
      expect(result.safe).toBe(baseline.safe);
      expect(result.failures.length).toBe(baseline.failures.length);
      expect(result.failures.map(f => f.id)).toEqual(baseline.failures.map(f => f.id));
    }
  });

  test('same context produces identical pause results across 100 runs', () => {
    const ctx = makeCtx({
      recommendation: { action: 'FIX_REQUIRED' },
      correctionCount: 3,
    });
    const baseline = autonomyPolicy.checkPauseConditions(ctx);
    for (let i = 0; i < 100; i++) {
      const result = autonomyPolicy.checkPauseConditions(ctx);
      expect(result.shouldPause).toBe(baseline.shouldPause);
      expect(result.reasons.map(r => r.id)).toEqual(baseline.reasons.map(r => r.id));
    }
  });

  test('modePermitsAction is pure function — no side effects', () => {
    const r1 = autonomyPolicy.modePermitsAction('SAFE_ADVANCE', ACTION_TYPE.RELEASE);
    const r2 = autonomyPolicy.modePermitsAction('SAFE_ADVANCE', ACTION_TYPE.RELEASE);
    expect(r1).toBe(r2);
    expect(r1).toBe(true);
  });
});

// ─── 8. Edge Cases ────────────────────────────────────────────────────────

describe('Edge Cases', () => {
  test('empty prompt object triggers appropriate gate failures', () => {
    const result = autonomyPolicy.evaluateSafetyGates(makeCtx({
      prompt: {
        confidence_level: undefined,
        evaluator_status: undefined,
        completion_status: undefined,
        degradation_flag: 0,
        escalation_required: 0,
        queue_status: 'ready_for_release',
        manual_only: 0,
      },
    }));
    expect(result.safe).toBe(false);
    // G1, G2, G3 should fail
    expect(result.failures.some(f => f.id === 'G1')).toBe(true);
    expect(result.failures.some(f => f.id === 'G2')).toBe(true);
    expect(result.failures.some(f => f.id === 'G3')).toBe(true);
  });

  test('ACTION_MODE_REQUIREMENTS covers all action types', () => {
    for (const type of Object.values(ACTION_TYPE)) {
      expect(autonomyPolicy.ACTION_MODE_REQUIREMENTS).toHaveProperty(type);
    }
  });

  test('RELEASE_NOW recommendation does not trigger any pause condition', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx({
      recommendation: { action: 'RELEASE_NOW' },
    }));
    expect(result.shouldPause).toBe(false);
  });

  test('HOLD recommendation does not trigger pause conditions', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx({
      recommendation: { action: 'HOLD' },
    }));
    expect(result.shouldPause).toBe(false);
  });

  test('high confidence does NOT trigger P5 pause', () => {
    const result = autonomyPolicy.checkPauseConditions(makeCtx({
      prompt: { confidence_level: 'high' },
    }));
    expect(result.reasons.some(r => r.id === 'P5')).toBe(false);
  });
});
