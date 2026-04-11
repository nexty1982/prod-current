#!/usr/bin/env npx tsx
/**
 * Unit tests for services/autonomousAdvanceService.js (OMD-1110)
 *
 * Controlled workflow advancement engine.
 * External deps stubbed via require.cache BEFORE requiring the SUT:
 *   - ../config/db            → fake getAppPool returning route-dispatch pool
 *   - ./autonomyPolicyService → scriptable status/gate/pause/log/mode helpers
 *   - ./decisionEngineService → classifyPrompt spy
 *   - ./workflowService       → completeWorkflow spy
 *   - ./autoExecutionService  → releasePrompt spy (dynamically required)
 *
 * Coverage:
 *   advanceWorkflows:
 *     · autonomy disabled → skipped
 *     · mode OFF or RELEASE_ONLY → skipped
 *     · zero active workflows → empty lists
 *     · happy multi-workflow iteration (actions aggregated)
 *     · per-workflow error caught → results.errors + ERROR log
 *
 *   _advanceSingleWorkflow (exercised via advanceWorkflows):
 *     · manual_only → pause G9
 *     · autonomy_paused → pause G10
 *     · no steps → empty result
 *     · all verified → completeWorkflow + ADVANCE_WORKFLOW action
 *     · completeWorkflow "Invalid workflow transition" → silently swallowed
 *     · completeWorkflow other error → propagates (caught outer)
 *     · SAFE_ADVANCE stops after 1 step
 *     · SUPERVISED_FLOW chains until MAX_CHAIN_STEPS=5
 *     · SUPERVISED_FLOW stops on checkPauseConditions after 1st step
 *     · blocked first step → recorded as pause
 *     · blocked after advance → not a pause (just stops)
 *     · execution error → pause
 *
 *   _determineStepAction (via above):
 *     · no prompt_id → null (skipped)
 *     · executing + pending eval + TRIGGER_EVAL allowed → TRIGGER_EVAL
 *     · executing + evaluator not pending → null
 *     · executing + mode doesn't permit TRIGGER_EVAL → null
 *     · ready_for_release + safe + RELEASE allowed → RELEASE
 *     · ready_for_release + unsafe gates → blocked
 *     · ready_for_release + RELEASE not permitted → null
 *     · overdue also triggers release path
 *     · draft/audited/ready/approved → null
 *
 *   _executeAction:
 *     · RELEASE success path
 *     · RELEASE already_released → success entry
 *     · RELEASE failure → throws
 *     · TRIGGER_EVAL → logged entry
 *
 *   getAutonomyDashboard:
 *     · returns status/paused/logs/workflow_details
 *     · workflow with frontier + gate evaluation
 *     · workflow with no frontier → gate_results null
 *     · why_paused / why_advancing derivation
 *
 * Run: npx tsx server/src/services/__tests__/autonomousAdvanceService.test.ts
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

// ── Constants (mirror autonomyPolicyService) ─────────────────────────────────
const AUTONOMY_MODE = {
  OFF: 'OFF',
  RELEASE_ONLY: 'RELEASE_ONLY',
  SAFE_ADVANCE: 'SAFE_ADVANCE',
  SUPERVISED_FLOW: 'SUPERVISED_FLOW',
};
const ACTION_TYPE = {
  RELEASE: 'RELEASE',
  TRIGGER_EVAL: 'TRIGGER_EVAL',
  QUEUE_NEXT: 'QUEUE_NEXT',
  ADVANCE_WORKFLOW: 'ADVANCE_WORKFLOW',
};

// ── Route-dispatch fake pool ─────────────────────────────────────────────────
type Route = { match: RegExp; handler: (params: any[], sql: string) => any; once?: boolean; hit?: boolean };
const routes: Route[] = [];
const queryLog: { sql: string; params: any[] }[] = [];

function addRoute(match: RegExp, handler: (params: any[], sql: string) => any, once = false) {
  routes.push({ match, handler, once });
}

function resetRoutes() {
  routes.length = 0;
  queryLog.length = 0;
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.once && r.hit) continue;
      if (r.match.test(sql)) {
        r.hit = true;
        const out = r.handler(params, sql);
        return [out];
      }
    }
    return [[]];
  },
};

// ── Scriptable autonomyPolicy stub ───────────────────────────────────────────
type AutonomyLog = { action: string; details: any; status: string };
let statusReturn: any = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
let gateResultReturn: any = { safe: true, passed: ['G1'], failures: [], passed_count: 1, total_gates: 1 };
let pauseCheckReturn: any = { shouldPause: false, reasons: [] };
let modePermitsReturn: Record<string, boolean> = {
  RELEASE: true, TRIGGER_EVAL: true, QUEUE_NEXT: true, ADVANCE_WORKFLOW: true,
};
let criticalConflictReturn = false;
let correctionCountReturn = 0;
let pausedWorkflowsReturn: any[] = [];
let logsReturn: any[] = [];
const logSpy: AutonomyLog[] = [];
const pauseWorkflowSpy: { workflow_id: number; reason: string }[] = [];

const autonomyPolicyStub = {
  AUTONOMY_MODE,
  ACTION_TYPE,
  getStatus: async () => statusReturn,
  evaluateSafetyGates: (_ctx: any) => gateResultReturn,
  checkPauseConditions: (_ctx: any) => pauseCheckReturn,
  modePermitsAction: (_mode: string, action: string) => modePermitsReturn[action] ?? false,
  logAutonomousAction: async (action: string, details: any, status: string) => {
    logSpy.push({ action, details, status });
  },
  pauseWorkflow: async (workflow_id: number, reason: string) => {
    pauseWorkflowSpy.push({ workflow_id, reason });
  },
  hasCriticalLearningConflict: async (_component: string) => criticalConflictReturn,
  getCorrectionCount: async (_promptId: number) => correctionCountReturn,
  getPausedWorkflows: async () => pausedWorkflowsReturn,
  getLogs: async (_n: number) => logsReturn,
};

// ── decisionEngine stub ──────────────────────────────────────────────────────
let classifyReturn: any = { rule_id: 'R7', action: 'RELEASE_NOW', reason: 'ready' };
const classifyCalls: any[] = [];
const decisionEngineStub = {
  classifyPrompt: (prompt: any) => {
    classifyCalls.push(prompt);
    return classifyReturn;
  },
};

// ── workflowService stub ─────────────────────────────────────────────────────
let completeWorkflowImpl: (id: number, actor: string) => Promise<any> = async () => ({});
const completeWorkflowCalls: any[] = [];
const workflowServiceStub = {
  completeWorkflow: async (id: number, actor: string) => {
    completeWorkflowCalls.push({ id, actor });
    return completeWorkflowImpl(id, actor);
  },
};

// ── autoExecutionService stub (dynamic require inside _executeAction) ───────
let releasePromptImpl: (id: number, reason: string) => Promise<any> = async () => ({
  success: true, previous_status: 'ready_for_release', new_status: 'released',
});
const releasePromptCalls: any[] = [];
const autoExecStub = {
  releasePrompt: async (id: number, reason: string) => {
    releasePromptCalls.push({ id, reason });
    return releasePromptImpl(id, reason);
  },
};

// ── db stub ──────────────────────────────────────────────────────────────────
const dbStub = { getAppPool: () => fakePool };

// ── Install stubs via require.cache BEFORE loading SUT ──────────────────────
function stubAt(relPath: string, exports: any) {
  const p = require.resolve(relPath);
  require.cache[p] = { id: p, filename: p, loaded: true, exports } as any;
}

stubAt('../../config/db', dbStub);
stubAt('../autonomyPolicyService', autonomyPolicyStub);
stubAt('../decisionEngineService', decisionEngineStub);
stubAt('../workflowService', workflowServiceStub);
stubAt('../autoExecutionService', autoExecStub);

const { advanceWorkflows, getAutonomyDashboard } = require('../autonomousAdvanceService');

// ── Reset helper ─────────────────────────────────────────────────────────────
function resetAll() {
  resetRoutes();
  statusReturn = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
  gateResultReturn = { safe: true, passed: ['G1'], failures: [], passed_count: 1, total_gates: 1 };
  pauseCheckReturn = { shouldPause: false, reasons: [] };
  modePermitsReturn = {
    RELEASE: true, TRIGGER_EVAL: true, QUEUE_NEXT: true, ADVANCE_WORKFLOW: true,
  };
  criticalConflictReturn = false;
  correctionCountReturn = 0;
  pausedWorkflowsReturn = [];
  logsReturn = [];
  logSpy.length = 0;
  pauseWorkflowSpy.length = 0;
  classifyCalls.length = 0;
  classifyReturn = { rule_id: 'R7', action: 'RELEASE_NOW', reason: 'ready' };
  completeWorkflowCalls.length = 0;
  completeWorkflowImpl = async () => ({});
  releasePromptCalls.length = 0;
  releasePromptImpl = async () => ({
    success: true, previous_status: 'ready_for_release', new_status: 'released',
  });
}

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// ── Test utilities ───────────────────────────────────────────────────────────
function makeWorkflow(overrides: any = {}): any {
  return {
    id: 1, name: 'WF1', component: 'backend',
    manual_only: 0, autonomy_paused: 0, autonomy_pause_reason: null,
    ...overrides,
  };
}

function makeStep(overrides: any = {}): any {
  return {
    id: 100, workflow_id: 1, step_number: 1, title: 'Step 1', component: 'backend',
    prompt_id: 500,
    prompt_status: 'ready_for_release',
    queue_status: 'ready_for_release',
    confidence_level: 'high',
    evaluator_status: 'verified',
    completion_status: 'complete',
    degradation_flag: false,
    escalation_required: false,
    prompt_manual_only: false,
    release_mode: 'auto_safe',
    released_for_execution: false,
    quality_score: 95,
    ...overrides,
  };
}

function makePrompt(overrides: any = {}): any {
  return {
    id: 500, status: 'ready_for_release', queue_status: 'ready_for_release',
    confidence_level: 'high', evaluator_status: 'verified',
    completion_status: 'complete', degradation_flag: false,
    escalation_required: false, manual_only: false,
    release_mode: 'auto_safe', quality_score: 95,
    ...overrides,
  };
}

// Install default routes for a workflow/steps/prompt scenario
function setupScenario(opts: {
  workflows?: any[];
  stepsByWf?: Record<number, any[]>;
  promptsById?: Record<number, any>;
}) {
  const workflows = opts.workflows ?? [];
  const stepsByWf = opts.stepsByWf ?? {};
  const promptsById = opts.promptsById ?? {};

  // advanceWorkflows / getAutonomyDashboard: SELECT * FROM prompt_workflows WHERE status = 'active'
  addRoute(/FROM prompt_workflows/i, () => workflows);

  // Steps query (has LEFT JOIN om_prompt_registry and ORDER BY step_number)
  addRoute(/FROM prompt_workflow_steps s[\s\S]*LEFT JOIN om_prompt_registry/i, (params) => {
    const wfId = params[0];
    return stepsByWf[wfId] ?? [];
  });

  // Individual prompt lookup (SELECT * FROM om_prompt_registry WHERE id = ?)
  addRoute(/^\s*SELECT \* FROM om_prompt_registry WHERE id = \?/i, (params) => {
    const pid = params[0];
    const p = promptsById[pid];
    return p ? [p] : [];
  });
}

async function main() {

// ============================================================================
// advanceWorkflows: autonomy gating
// ============================================================================
console.log('\n── advanceWorkflows: autonomy gating ─────────────────────');

resetAll();
statusReturn = { enabled: false, mode: AUTONOMY_MODE.SAFE_ADVANCE };
{
  const r = await advanceWorkflows();
  assertEq(r.skipped, true, 'disabled → skipped');
  assertEq(r.actions_taken, [], 'no actions');
  assert(r.reason.includes('not enabled'), 'reason mentions not enabled');
}

resetAll();
statusReturn = { enabled: true, mode: AUTONOMY_MODE.OFF };
{
  const r = await advanceWorkflows();
  assertEq(r.skipped, true, 'mode OFF → skipped');
}

resetAll();
statusReturn = { enabled: true, mode: AUTONOMY_MODE.RELEASE_ONLY };
{
  const r = await advanceWorkflows();
  assertEq(r.skipped, true, 'mode RELEASE_ONLY → skipped');
}

// ============================================================================
// advanceWorkflows: zero active workflows
// ============================================================================
console.log('\n── advanceWorkflows: no workflows ────────────────────────');

resetAll();
setupScenario({ workflows: [] });
{
  const r = await advanceWorkflows();
  assertEq(r.skipped as any, undefined, 'not skipped');
  assertEq(r.workflows_inspected, 0, '0 inspected');
  assertEq(r.actions_taken, [], 'no actions');
  assertEq(r.pauses, [], 'no pauses');
  assertEq(r.errors, [], 'no errors');
  assertEq(r.mode, AUTONOMY_MODE.SAFE_ADVANCE, 'mode in result');
  assert(typeof r.timestamp === 'string', 'timestamp set');
}

// ============================================================================
// advanceWorkflows: workflow manual_only → pause G9
// ============================================================================
console.log('\n── manual_only → pause G9 ────────────────────────────────');

resetAll();
setupScenario({ workflows: [makeWorkflow({ manual_only: 1 })] });
{
  const r = await advanceWorkflows();
  assertEq(r.workflows_inspected, 1, '1 inspected');
  assertEq(r.pauses.length, 1, '1 pause');
  assertEq(r.pauses[0].gate_id, 'G9', 'gate G9');
  assert(r.pauses[0].reason.includes('manual_only'), 'reason mentions manual_only');
  assertEq(r.actions_taken, [], 'no actions');
}

// ============================================================================
// advanceWorkflows: workflow autonomy_paused → pause G10
// ============================================================================
console.log('\n── autonomy_paused → pause G10 ───────────────────────────');

resetAll();
setupScenario({
  workflows: [makeWorkflow({ autonomy_paused: 1, autonomy_pause_reason: 'operator pause' })],
});
{
  const r = await advanceWorkflows();
  assertEq(r.pauses.length, 1, '1 pause');
  assertEq(r.pauses[0].gate_id, 'G10', 'gate G10');
  assertEq(r.pauses[0].reason, 'operator pause', 'uses custom reason');
}

resetAll();
setupScenario({
  workflows: [makeWorkflow({ autonomy_paused: 1, autonomy_pause_reason: null })],
});
{
  const r = await advanceWorkflows();
  assertEq(r.pauses[0].gate_id, 'G10', 'still G10');
  assert(r.pauses[0].reason.includes('autonomy paused'), 'default pause reason');
}

// ============================================================================
// advanceWorkflows: no steps → empty result
// ============================================================================
console.log('\n── no steps → nothing ────────────────────────────────────');

resetAll();
setupScenario({
  workflows: [makeWorkflow()],
  stepsByWf: { 1: [] },
});
{
  const r = await advanceWorkflows();
  assertEq(r.workflows_inspected, 1, '1 inspected');
  assertEq(r.actions_taken, [], 'no actions');
  assertEq(r.pauses, [], 'no pauses');
  assertEq(r.errors, [], 'no errors');
}

// ============================================================================
// advanceWorkflows: all steps verified → completeWorkflow + ADVANCE_WORKFLOW
// ============================================================================
console.log('\n── all verified → ADVANCE_WORKFLOW ───────────────────────');

resetAll();
setupScenario({
  workflows: [makeWorkflow({ id: 7, name: 'VerifiedWF' })],
  stepsByWf: { 7: [
    makeStep({ step_number: 1, prompt_status: 'verified' }),
    makeStep({ step_number: 2, prompt_status: 'verified' }),
  ]},
});
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 1, '1 action');
  assertEq(r.actions_taken[0].action, ACTION_TYPE.ADVANCE_WORKFLOW, 'ADVANCE_WORKFLOW');
  assertEq(r.actions_taken[0].target_id, 7, 'target is workflow id');
  assertEq(r.actions_taken[0].target_type, 'workflow', 'target_type');
  assertEq(r.actions_taken[0].new_state, 'completed', 'new_state');
  assertEq(completeWorkflowCalls.length, 1, 'completeWorkflow called');
  assertEq(completeWorkflowCalls[0].id, 7, 'called with workflow id');
  assertEq(completeWorkflowCalls[0].actor, 'system:autonomy', 'actor = system:autonomy');
  assertEq(logSpy.length, 1, '1 log entry');
  assertEq(logSpy[0].action, ACTION_TYPE.ADVANCE_WORKFLOW, 'logged ADVANCE_WORKFLOW');
  assertEq(logSpy[0].status, 'SUCCESS', 'log status SUCCESS');
}

// completeWorkflow "Invalid workflow transition" swallowed
resetAll();
completeWorkflowImpl = async () => { throw new Error('Invalid workflow transition: already completed'); };
setupScenario({
  workflows: [makeWorkflow({ id: 8 })],
  stepsByWf: { 8: [makeStep({ prompt_status: 'verified' })] },
});
{
  const r = await advanceWorkflows();
  assertEq(r.errors, [], 'no outer errors');
  assertEq(r.actions_taken, [], 'no action recorded (threw before push)');
  assertEq(r.pauses, [], 'no pauses');
}

// completeWorkflow other error propagates → caught outer → results.errors
resetAll();
completeWorkflowImpl = async () => { throw new Error('db explosion'); };
setupScenario({
  workflows: [makeWorkflow({ id: 9 })],
  stepsByWf: { 9: [makeStep({ prompt_status: 'verified' })] },
});
quiet();
{
  const r = await advanceWorkflows();
  loud();
  assertEq(r.errors.length, 1, '1 error captured');
  assertEq(r.errors[0].workflow_id, 9, 'error workflow_id');
  assert(r.errors[0].error.includes('db explosion'), 'error message');
  // ERROR logged via autonomyPolicy.logAutonomousAction
  const errLogs = logSpy.filter(l => l.action === 'ERROR');
  assertEq(errLogs.length, 1, 'ERROR log emitted');
  assertEq(errLogs[0].status, 'ERROR', 'status ERROR');
}

// ============================================================================
// advanceWorkflows: SAFE_ADVANCE single step release
// ============================================================================
console.log('\n── SAFE_ADVANCE: release one step ────────────────────────');

resetAll();
statusReturn = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
setupScenario({
  workflows: [makeWorkflow({ id: 10, name: 'ReleaseWF' })],
  stepsByWf: { 10: [
    makeStep({ step_number: 1, prompt_id: 501, prompt_status: 'ready_for_release',
               queue_status: 'ready_for_release' }),
    makeStep({ step_number: 2, prompt_id: 502, prompt_status: 'ready_for_release',
               queue_status: 'ready_for_release' }),
  ]},
  promptsById: {
    501: makePrompt({ id: 501 }),
    502: makePrompt({ id: 502 }),
  },
});
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 1, 'SAFE_ADVANCE → only 1 step');
  assertEq(r.actions_taken[0].action, ACTION_TYPE.RELEASE, 'RELEASE action');
  assertEq(r.actions_taken[0].target_id, 501, 'first prompt released');
  assertEq(r.actions_taken[0].step_number, 1, 'step 1');
  assertEq(releasePromptCalls.length, 1, '1 release call');
  assertEq(releasePromptCalls[0].id, 501, 'released prompt 501');
  assert(releasePromptCalls[0].reason.includes('SAFE_ADVANCE'), 'reason mentions mode');
  assert(releasePromptCalls[0].reason.includes('ReleaseWF'), 'reason mentions workflow name');
}

// SAFE_ADVANCE with verified first step → skip to next
resetAll();
statusReturn = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
setupScenario({
  workflows: [makeWorkflow({ id: 11 })],
  stepsByWf: { 11: [
    makeStep({ step_number: 1, prompt_status: 'verified', prompt_id: 601 }),
    makeStep({ step_number: 2, prompt_id: 602, prompt_status: 'ready_for_release',
               queue_status: 'ready_for_release' }),
  ]},
  promptsById: { 602: makePrompt({ id: 602 }) },
});
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 1, 'still 1 action');
  assertEq(r.actions_taken[0].target_id, 602, 'released step 2');
  assertEq(r.actions_taken[0].step_number, 2, 'step 2');
}

// ============================================================================
// SUPERVISED_FLOW chains until MAX_CHAIN_STEPS=5
// ============================================================================
console.log('\n── SUPERVISED_FLOW: chain steps ──────────────────────────');

resetAll();
statusReturn = { enabled: true, mode: AUTONOMY_MODE.SUPERVISED_FLOW };
const chainSteps = [];
const chainPrompts: Record<number, any> = {};
for (let i = 1; i <= 7; i++) {
  chainSteps.push(makeStep({
    id: 1000 + i, step_number: i, prompt_id: 700 + i,
    prompt_status: 'ready_for_release', queue_status: 'ready_for_release',
  }));
  chainPrompts[700 + i] = makePrompt({ id: 700 + i });
}
setupScenario({
  workflows: [makeWorkflow({ id: 12 })],
  stepsByWf: { 12: chainSteps },
  promptsById: chainPrompts,
});
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 5, 'chained 5 actions (MAX_CHAIN_STEPS)');
  assertEq(r.actions_taken[0].step_number, 1, 'first is step 1');
  assertEq(r.actions_taken[4].step_number, 5, 'last is step 5');
  assertEq(releasePromptCalls.length, 5, '5 releases');
}

// SUPERVISED_FLOW: pauseCheck triggers stop after 1st step
resetAll();
statusReturn = { enabled: true, mode: AUTONOMY_MODE.SUPERVISED_FLOW };
// Script pauseCheck: first call from step 2 should trigger
let pauseCallCount = 0;
autonomyPolicyStub.checkPauseConditions = (_ctx: any) => {
  pauseCallCount++;
  return { shouldPause: true, reasons: [{ reason: 'Too many recent failures' }] };
};
setupScenario({
  workflows: [makeWorkflow({ id: 13, name: 'PauseWF' })],
  stepsByWf: { 13: [
    makeStep({ step_number: 1, prompt_id: 801 }),
    makeStep({ step_number: 2, prompt_id: 802 }),
    makeStep({ step_number: 3, prompt_id: 803 }),
  ]},
  promptsById: {
    801: makePrompt({ id: 801 }),
    802: makePrompt({ id: 802 }),
    803: makePrompt({ id: 803 }),
  },
});
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 1, 'only 1 step executed before pause');
  assertEq(r.actions_taken[0].step_number, 1, 'step 1 succeeded');
  assertEq(r.pauses.length, 1, '1 pause');
  assertEq(r.pauses[0].step_number, 2, 'paused at step 2');
  assertEq(r.pauses[0].reason, 'Too many recent failures', 'pause reason');
  assertEq(pauseWorkflowSpy.length, 1, 'pauseWorkflow called');
  assertEq(pauseWorkflowSpy[0].workflow_id, 13, 'paused workflow 13');
  assert(pauseWorkflowSpy[0].reason.includes('step 2'), 'pause call mentions step 2');
  // Restore
  autonomyPolicyStub.checkPauseConditions = (_ctx: any) => pauseCheckReturn;
}

// ============================================================================
// _determineStepAction: TRIGGER_EVAL path
// ============================================================================
console.log('\n── TRIGGER_EVAL: executing + pending eval ────────────────');

resetAll();
statusReturn = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
setupScenario({
  workflows: [makeWorkflow({ id: 14 })],
  stepsByWf: { 14: [makeStep({
    step_number: 1, prompt_id: 900,
    prompt_status: 'executing',
    evaluator_status: 'pending',
  })]},
  promptsById: { 900: makePrompt({ id: 900, status: 'executing', evaluator_status: 'pending' }) },
});
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 1, '1 action');
  assertEq(r.actions_taken[0].action, ACTION_TYPE.TRIGGER_EVAL, 'TRIGGER_EVAL');
  assertEq(r.actions_taken[0].target_id, 900, 'target 900');
  assertEq(r.actions_taken[0].target_type, 'prompt', 'target_type prompt');
  assert(logSpy.some(l => l.action === ACTION_TYPE.TRIGGER_EVAL), 'TRIGGER_EVAL logged');
}

// executing but evaluator already not pending → null action → stop
resetAll();
setupScenario({
  workflows: [makeWorkflow({ id: 15 })],
  stepsByWf: { 15: [makeStep({
    prompt_id: 901,
    prompt_status: 'executing',
    evaluator_status: 'verified',
  })]},
  promptsById: { 901: makePrompt({ id: 901 }) },
});
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken, [], 'no action (waiting)');
  assertEq(r.pauses, [], 'no pause');
}

// executing but mode doesn't permit TRIGGER_EVAL → null
resetAll();
modePermitsReturn = { ...modePermitsReturn, TRIGGER_EVAL: false };
setupScenario({
  workflows: [makeWorkflow({ id: 16 })],
  stepsByWf: { 16: [makeStep({
    prompt_id: 902,
    prompt_status: 'executing',
    evaluator_status: 'pending',
  })]},
  promptsById: { 902: makePrompt({ id: 902, evaluator_status: 'pending' }) },
});
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken, [], 'TRIGGER_EVAL not permitted → no action');
}

// ============================================================================
// _determineStepAction: blocked by safety gates
// ============================================================================
console.log('\n── blocked by unsafe safety gates ────────────────────────');

resetAll();
gateResultReturn = {
  safe: false, passed: [], failures: [{ gate_id: 'G3', reason: 'quality score too low' }],
  passed_count: 0, total_gates: 5,
};
setupScenario({
  workflows: [makeWorkflow({ id: 17 })],
  stepsByWf: { 17: [makeStep({ step_number: 1, prompt_id: 910, quality_score: 50 })]},
  promptsById: { 910: makePrompt({ id: 910 }) },
});
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken, [], 'no actions');
  assertEq(r.pauses.length, 1, 'first step block → pause');
  assertEq(r.pauses[0].block_reason, 'quality score too low', 'block_reason');
  assertEq(r.pauses[0].step_number, 1, 'step 1');
  assertEq(r.pauses[0].failed_gates.length, 1, 'failed_gates populated');
  const blockedLogs = logSpy.filter(l => l.action === 'BLOCKED');
  assertEq(blockedLogs.length, 1, 'BLOCKED logged');
}

// Blocked after a successful advance → not a pause, just stops
resetAll();
statusReturn = { enabled: true, mode: AUTONOMY_MODE.SUPERVISED_FLOW };
// First step safe, second step unsafe
let gateCall = 0;
autonomyPolicyStub.evaluateSafetyGates = (_ctx: any) => {
  gateCall++;
  return gateCall === 1
    ? { safe: true, passed: ['G1'], failures: [], passed_count: 1, total_gates: 1 }
    : { safe: false, passed: [], failures: [{ gate_id: 'G3', reason: 'bad' }], passed_count: 0, total_gates: 1 };
};
setupScenario({
  workflows: [makeWorkflow({ id: 18 })],
  stepsByWf: { 18: [
    makeStep({ step_number: 1, prompt_id: 920 }),
    makeStep({ step_number: 2, prompt_id: 921 }),
  ]},
  promptsById: {
    920: makePrompt({ id: 920 }),
    921: makePrompt({ id: 921 }),
  },
});
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 1, '1 action succeeded');
  assertEq(r.actions_taken[0].step_number, 1, 'step 1 released');
  // advanceCount > 0 when step 2 blocks → NOT recorded as pause
  assertEq(r.pauses.length, 0, 'blocked-after-advance not recorded as pause');
  // Restore
  autonomyPolicyStub.evaluateSafetyGates = (_ctx: any) => gateResultReturn;
}

// ============================================================================
// _determineStepAction: RELEASE not permitted → null → stop
// ============================================================================
console.log('\n── RELEASE not permitted → no action ─────────────────────');

resetAll();
modePermitsReturn = { ...modePermitsReturn, RELEASE: false };
setupScenario({
  workflows: [makeWorkflow({ id: 19 })],
  stepsByWf: { 19: [makeStep({ prompt_id: 930 })]},
  promptsById: { 930: makePrompt({ id: 930 }) },
});
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken, [], 'no actions');
  assertEq(r.pauses, [], 'no pauses');
}

// ============================================================================
// queue_status='overdue' also triggers release path
// ============================================================================
console.log('\n── overdue queue_status triggers release ─────────────────');

resetAll();
setupScenario({
  workflows: [makeWorkflow({ id: 20 })],
  stepsByWf: { 20: [makeStep({
    prompt_id: 940,
    prompt_status: 'ready_for_release',
    queue_status: 'overdue',
  })]},
  promptsById: { 940: makePrompt({ id: 940 }) },
});
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 1, '1 action');
  assertEq(r.actions_taken[0].action, ACTION_TYPE.RELEASE, 'RELEASE for overdue');
  assertEq(r.actions_taken[0].target_id, 940, 'target 940');
}

// ============================================================================
// Step with no prompt_id → null → skipped
// ============================================================================
console.log('\n── step with no prompt_id → skipped ──────────────────────');

resetAll();
setupScenario({
  workflows: [makeWorkflow({ id: 21 })],
  stepsByWf: { 21: [makeStep({ prompt_id: null, prompt_status: null })] },
});
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken, [], 'no actions');
  assertEq(r.pauses, [], 'no pauses');
}

// ============================================================================
// Step in draft/audited/ready/approved → null → stop
// ============================================================================
console.log('\n── step in pre-pipeline state → null ─────────────────────');

for (const state of ['draft', 'audited', 'ready', 'approved']) {
  resetAll();
  setupScenario({
    workflows: [makeWorkflow({ id: 22 })],
    stepsByWf: { 22: [makeStep({
      prompt_id: 950,
      prompt_status: state,
      queue_status: 'pending',
    })]},
    promptsById: { 950: makePrompt({ id: 950, status: state }) },
  });
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 0, `${state}: no actions`);
}

// ============================================================================
// _executeAction: RELEASE already_released path
// ============================================================================
console.log('\n── RELEASE already_released → success entry ─────────────');

resetAll();
releasePromptImpl = async () => ({
  success: false, already_released: true,
  previous_status: 'released', new_status: null,
});
setupScenario({
  workflows: [makeWorkflow({ id: 23 })],
  stepsByWf: { 23: [makeStep({ prompt_id: 960 })]},
  promptsById: { 960: makePrompt({ id: 960 }) },
});
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 1, '1 action recorded');
  assertEq(r.actions_taken[0].already_released, true, 'already_released flag');
  assertEq(r.actions_taken[0].new_state, 'already_released', 'new_state fallback');
  assertEq(r.errors, [], 'no errors');
}

// RELEASE failure → throws → pause
resetAll();
releasePromptImpl = async () => ({
  success: false, already_released: false, error: 'quota exceeded',
});
setupScenario({
  workflows: [makeWorkflow({ id: 24 })],
  stepsByWf: { 24: [makeStep({ prompt_id: 970 })]},
  promptsById: { 970: makePrompt({ id: 970 }) },
});
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken, [], 'no successful actions');
  assertEq(r.pauses.length, 1, '1 pause from exec error');
  assert(r.pauses[0].reason.includes('quota exceeded'), 'pause mentions error');
}

// ============================================================================
// advanceWorkflows: multiple workflows aggregated
// ============================================================================
console.log('\n── multi-workflow aggregation ────────────────────────────');

resetAll();
setupScenario({
  workflows: [
    makeWorkflow({ id: 30, name: 'WF-A' }),
    makeWorkflow({ id: 31, name: 'WF-B', manual_only: 1 }),
    makeWorkflow({ id: 32, name: 'WF-C' }),
  ],
  stepsByWf: {
    30: [makeStep({ prompt_id: 1001, step_number: 1 })],
    // 31 skipped (manual_only)
    32: [makeStep({ prompt_id: 1003, step_number: 1 })],
  },
  promptsById: {
    1001: makePrompt({ id: 1001 }),
    1003: makePrompt({ id: 1003 }),
  },
});
{
  const r = await advanceWorkflows();
  assertEq(r.workflows_inspected, 3, '3 inspected');
  assertEq(r.actions_taken.length, 2, '2 releases');
  assertEq(r.pauses.length, 1, '1 pause (WF-B manual_only)');
  assertEq(r.pauses[0].workflow_name, 'WF-B', 'pause is WF-B');
  const targetIds = r.actions_taken.map((a: any) => a.target_id).sort();
  assertEq(targetIds, [1001, 1003], 'both released');
}

// ============================================================================
// getAutonomyDashboard
// ============================================================================
console.log('\n── getAutonomyDashboard ──────────────────────────────────');

resetAll();
statusReturn = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
pausedWorkflowsReturn = [{ id: 99, name: 'PausedWF' }];
logsReturn = [{ id: 1, action: 'RELEASE', created_at: '2026-04-10' }];
setupScenario({
  workflows: [
    makeWorkflow({ id: 40, name: 'AdvancingWF', component: 'backend' }),
    makeWorkflow({ id: 41, name: 'PausedDash', autonomy_paused: 1, autonomy_pause_reason: 'operator' }),
  ],
  stepsByWf: {
    40: [
      makeStep({ step_number: 1, prompt_id: 2001, prompt_status: 'verified' }),
      makeStep({ step_number: 2, prompt_id: 2002, prompt_status: 'ready_for_release' }),
    ],
    41: [
      makeStep({ step_number: 1, prompt_id: 2003, prompt_status: 'ready_for_release' }),
    ],
  },
  promptsById: {
    2002: makePrompt({ id: 2002 }),
    2003: makePrompt({ id: 2003 }),
  },
});
{
  const dash = await getAutonomyDashboard();
  assertEq(dash.status.mode, AUTONOMY_MODE.SAFE_ADVANCE, 'status.mode');
  assertEq(dash.paused_workflows.length, 1, '1 paused workflow');
  assertEq(dash.paused_workflows[0].id, 99, 'paused id');
  assertEq(dash.recent_activity.length, 1, '1 log entry');
  assertEq(dash.workflow_details.length, 2, '2 workflow details');

  const wf40 = dash.workflow_details.find((w: any) => w.id === 40);
  assertEq(wf40.name, 'AdvancingWF', 'wf40 name');
  assertEq(wf40.autonomy_paused, false, 'wf40 not paused');
  assertEq(wf40.manual_only, false, 'wf40 not manual_only');
  // frontier = first non-verified = step 2
  assertEq(wf40.frontier_step.step_number, 2, 'wf40 frontier step 2');
  assertEq(wf40.frontier_step.title, 'Step 1', 'wf40 frontier title');
  assert(wf40.gate_results !== null, 'wf40 gate_results populated');
  assertEq(wf40.gate_results.safe, true, 'wf40 gates safe');
  assert(wf40.why_advancing !== null, 'wf40 why_advancing set');
  assert(wf40.why_advancing.includes('safety gates passed'), 'wf40 why_advancing text');
  assertEq(wf40.why_paused, null, 'wf40 why_paused null');

  const wf41 = dash.workflow_details.find((w: any) => w.id === 41);
  assertEq(wf41.autonomy_paused, true, 'wf41 paused');
  assertEq(wf41.why_paused, 'operator', 'wf41 why_paused = reason');
}

// Dashboard: workflow with no frontier (all verified) → gate_results null
resetAll();
statusReturn = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
setupScenario({
  workflows: [makeWorkflow({ id: 50, name: 'AllDoneWF' })],
  stepsByWf: {
    50: [
      makeStep({ step_number: 1, prompt_status: 'verified' }),
      makeStep({ step_number: 2, prompt_status: 'verified' }),
    ],
  },
});
{
  const dash = await getAutonomyDashboard();
  assertEq(dash.workflow_details.length, 1, '1 workflow');
  const wf = dash.workflow_details[0];
  assertEq(wf.frontier_step, null, 'no frontier');
  assertEq(wf.gate_results, null, 'no gate_results');
  assertEq(wf.why_advancing, null, 'no why_advancing');
}

// Dashboard: frontier with unsafe gates → why_paused from gate failure
resetAll();
statusReturn = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
gateResultReturn = {
  safe: false, passed: [], failures: [{ gate_id: 'G2', reason: 'escalation required' }],
  passed_count: 0, total_gates: 3,
};
setupScenario({
  workflows: [makeWorkflow({ id: 51, name: 'BlockedWF' })],
  stepsByWf: {
    51: [makeStep({ step_number: 1, prompt_id: 3001 })],
  },
  promptsById: { 3001: makePrompt({ id: 3001 }) },
});
{
  const dash = await getAutonomyDashboard();
  const wf = dash.workflow_details[0];
  assertEq(wf.gate_results.safe, false, 'not safe');
  assertEq(wf.why_paused, 'escalation required', 'why_paused from gate');
  assertEq(wf.why_advancing, null, 'why_advancing null');
}

// Dashboard: manual_only workflow
resetAll();
statusReturn = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
setupScenario({
  workflows: [makeWorkflow({ id: 52, manual_only: 1 })],
  stepsByWf: {
    52: [makeStep({ step_number: 1, prompt_id: 3100 })],
  },
  promptsById: { 3100: makePrompt({ id: 3100 }) },
});
{
  const dash = await getAutonomyDashboard();
  const wf = dash.workflow_details[0];
  assertEq(wf.manual_only, true, 'manual_only flag');
  assertEq(wf.why_advancing, null, 'no why_advancing for manual_only');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
