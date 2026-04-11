#!/usr/bin/env npx tsx
/**
 * Unit tests for services/autonomousAdvanceService.js (OMD-1123)
 *
 * Policy-governed engine that advances workflow steps beyond simple release.
 * Delegates all decision/gate/release logic to other services — we stub:
 *   - ../config/db            (route-dispatch pool)
 *   - ./autonomyPolicyService (all methods used + AUTONOMY_MODE/ACTION_TYPE)
 *   - ./decisionEngineService (classifyPrompt)
 *   - ./workflowService       (completeWorkflow)
 *   - ./autoExecutionService  (releasePrompt)
 *
 * Coverage:
 *   advanceWorkflows:
 *     · not enabled → skipped
 *     · mode OFF → skipped
 *     · mode RELEASE_ONLY → skipped
 *     · workflow manual_only → pause G9
 *     · workflow autonomy_paused → pause G10
 *     · all steps verified → completeWorkflow called (ADVANCE_WORKFLOW action)
 *     · completeWorkflow "Invalid workflow transition" → swallowed
 *     · executing prompt + pending evaluator → TRIGGER_EVAL action
 *     · ready_for_release + gates safe → RELEASE action
 *     · ready_for_release + gates fail → blocked (pause)
 *     · SUPERVISED_FLOW chaining + pause condition on step 2
 *     · per-workflow error captured in results.errors
 *     · no prompt_id → no action (loop continues)
 *     · SAFE_ADVANCE caps at 1 action
 *
 *   getAutonomyDashboard:
 *     · returns status, paused_workflows, workflow_details, recent_activity
 *     · computes frontier step + gate results
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

// ── Route-dispatch fake pool ─────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
type Route = { match: RegExp; handler: (params: any[], sql: string) => any };

const queryLog: QueryCall[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) return r.handler(params, sql);
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

// ── autonomyPolicy stub ──────────────────────────────────────────────
const AUTONOMY_MODE = {
  OFF: 'OFF',
  RELEASE_ONLY: 'RELEASE_ONLY',
  SAFE_ADVANCE: 'SAFE_ADVANCE',
  SUPERVISED_FLOW: 'SUPERVISED_FLOW',
};
const ACTION_TYPE = {
  RELEASE: 'RELEASE',
  TRIGGER_EVAL: 'TRIGGER_EVAL',
  ADVANCE_WORKFLOW: 'ADVANCE_WORKFLOW',
};

type LogCall = { action: string; entry: any; status: string };
const autonomyLog: LogCall[] = [];
const pausedLog: Array<{ workflowId: string; reason: string }> = [];

let statusReturn: any = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
let pauseCheckReturn: any = { shouldPause: false, reasons: [] };
let gateEvalReturn: any = { safe: true, failures: [], passed: [], passed_count: 5, total_gates: 5 };
let modePermitsReturn = true;
let hasCriticalReturn = false;
let correctionCountReturn = 0;
let pausedWorkflowsReturn: any[] = [];
let logsReturn: any[] = [];

const autonomyPolicyStub = {
  AUTONOMY_MODE,
  ACTION_TYPE,
  getStatus: async () => statusReturn,
  logAutonomousAction: async (action: string, entry: any, status: string) => {
    autonomyLog.push({ action, entry, status });
  },
  checkPauseConditions: (_ctx: any) => pauseCheckReturn,
  evaluateSafetyGates: (_ctx: any) => gateEvalReturn,
  modePermitsAction: (_mode: string, _action: string) => modePermitsReturn,
  pauseWorkflow: async (workflowId: string, reason: string) => {
    pausedLog.push({ workflowId, reason });
  },
  hasCriticalLearningConflict: async (_component: string) => hasCriticalReturn,
  getCorrectionCount: async (_promptId: any) => correctionCountReturn,
  getPausedWorkflows: async () => pausedWorkflowsReturn,
  getLogs: async (_n: number) => logsReturn,
};

const autonomyPolicyPath = require.resolve('../autonomyPolicyService');
require.cache[autonomyPolicyPath] = {
  id: autonomyPolicyPath, filename: autonomyPolicyPath, loaded: true,
  exports: autonomyPolicyStub,
} as any;

// ── decisionEngine stub ──────────────────────────────────────────────
let classifyReturn: any = { recommendation: 'release' };
const decisionEngineStub = {
  classifyPrompt: (_p: any) => classifyReturn,
};
const decisionEnginePath = require.resolve('../decisionEngineService');
require.cache[decisionEnginePath] = {
  id: decisionEnginePath, filename: decisionEnginePath, loaded: true,
  exports: decisionEngineStub,
} as any;

// ── workflowService stub ─────────────────────────────────────────────
let completeWorkflowCalls: Array<{ id: string; actor: string }> = [];
let completeWorkflowThrows: Error | null = null;
const workflowServiceStub = {
  completeWorkflow: async (id: string, actor: string) => {
    completeWorkflowCalls.push({ id, actor });
    if (completeWorkflowThrows) throw completeWorkflowThrows;
    return { id, status: 'completed' };
  },
};
const workflowServicePath = require.resolve('../workflowService');
require.cache[workflowServicePath] = {
  id: workflowServicePath, filename: workflowServicePath, loaded: true,
  exports: workflowServiceStub,
} as any;

// ── autoExecutionService stub ────────────────────────────────────────
let releasePromptReturn: any = { success: true, previous_status: 'ready', new_status: 'released' };
let releasePromptCalls: Array<{ promptId: any; reason: string }> = [];
const autoExecutionServiceStub = {
  releasePrompt: async (promptId: any, reason: string) => {
    releasePromptCalls.push({ promptId, reason });
    return releasePromptReturn;
  },
};
const autoExecPath = require.resolve('../autoExecutionService');
require.cache[autoExecPath] = {
  id: autoExecPath, filename: autoExecPath, loaded: true,
  exports: autoExecutionServiceStub,
} as any;

function resetAll() {
  queryLog.length = 0;
  routes = [];
  autonomyLog.length = 0;
  pausedLog.length = 0;
  statusReturn = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
  pauseCheckReturn = { shouldPause: false, reasons: [] };
  gateEvalReturn = { safe: true, failures: [], passed: [], passed_count: 5, total_gates: 5 };
  modePermitsReturn = true;
  hasCriticalReturn = false;
  correctionCountReturn = 0;
  pausedWorkflowsReturn = [];
  logsReturn = [];
  classifyReturn = { recommendation: 'release' };
  completeWorkflowCalls = [];
  completeWorkflowThrows = null;
  releasePromptReturn = { success: true, previous_status: 'ready', new_status: 'released' };
  releasePromptCalls = [];
}

const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const svc = require('../autonomousAdvanceService');

async function main() {

// ============================================================================
// advanceWorkflows — skipped modes
// ============================================================================
console.log('\n── advanceWorkflows: skipped modes ───────────────────────');

resetAll();
statusReturn = { enabled: false, mode: AUTONOMY_MODE.SAFE_ADVANCE };
{
  const r = await svc.advanceWorkflows();
  assertEq(r.skipped, true, 'not enabled → skipped');
  assert(/not enabled/.test(r.reason), 'reason explains');
  assertEq(r.actions_taken.length, 0, 'no actions');
}

resetAll();
statusReturn = { enabled: true, mode: AUTONOMY_MODE.OFF };
{
  const r = await svc.advanceWorkflows();
  assertEq(r.skipped, true, 'OFF → skipped');
}

resetAll();
statusReturn = { enabled: true, mode: AUTONOMY_MODE.RELEASE_ONLY };
{
  const r = await svc.advanceWorkflows();
  assertEq(r.skipped, true, 'RELEASE_ONLY → skipped');
}

// ============================================================================
// advanceWorkflows — workflow manual_only → pause
// ============================================================================
console.log('\n── advanceWorkflows: manual_only workflow ────────────────');

resetAll();
{
  const wf = { id: 'wf1', name: 'W1', manual_only: 1, autonomy_paused: 0 };
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[wf]],
    },
  ];
  const r = await svc.advanceWorkflows();
  assertEq(r.workflows_inspected, 1, '1 inspected');
  assertEq(r.pauses.length, 1, '1 pause');
  assertEq(r.pauses[0].gate_id, 'G9', 'G9 pause');
  assert(/manual_only/.test(r.pauses[0].reason), 'manual_only reason');
  assertEq(r.actions_taken.length, 0, 'no actions');
}

// ============================================================================
// advanceWorkflows — autonomy_paused → pause G10
// ============================================================================
console.log('\n── advanceWorkflows: autonomy_paused workflow ────────────');

resetAll();
{
  const wf = {
    id: 'wf1', name: 'W1', manual_only: 0,
    autonomy_paused: 1, autonomy_pause_reason: 'manual hold',
  };
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[wf]],
    },
  ];
  const r = await svc.advanceWorkflows();
  assertEq(r.pauses.length, 1, '1 pause');
  assertEq(r.pauses[0].gate_id, 'G10', 'G10 pause');
  assertEq(r.pauses[0].reason, 'manual hold', 'custom pause reason');
}

// ============================================================================
// advanceWorkflows — all steps verified → completeWorkflow
// ============================================================================
console.log('\n── advanceWorkflows: all verified → complete ─────────────');

resetAll();
{
  const wf = { id: 'wf1', name: 'W1', manual_only: 0, autonomy_paused: 0 };
  const steps = [
    { step_number: 1, prompt_id: 'p1', prompt_status: 'verified' },
    { step_number: 2, prompt_id: 'p2', prompt_status: 'verified' },
  ];
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[wf]],
    },
    {
      match: /FROM prompt_workflow_steps s/i,
      handler: () => [steps],
    },
  ];
  const r = await svc.advanceWorkflows();
  assertEq(completeWorkflowCalls.length, 1, 'completeWorkflow called');
  assertEq(completeWorkflowCalls[0].id, 'wf1', 'completeWorkflow id');
  assertEq(completeWorkflowCalls[0].actor, 'system:autonomy', 'actor is system:autonomy');
  assertEq(r.actions_taken.length, 1, '1 action');
  assertEq(r.actions_taken[0].action, 'ADVANCE_WORKFLOW', 'ADVANCE_WORKFLOW action');
  assertEq(r.actions_taken[0].new_state, 'completed', 'new state completed');
  const logged = autonomyLog.find(l => l.action === 'ADVANCE_WORKFLOW');
  assert(logged !== undefined, 'logged ADVANCE_WORKFLOW');
}

// ============================================================================
// advanceWorkflows — completeWorkflow "Invalid workflow transition" swallowed
// ============================================================================
console.log('\n── advanceWorkflows: invalid transition swallowed ────────');

resetAll();
{
  const wf = { id: 'wf1', name: 'W1', manual_only: 0, autonomy_paused: 0 };
  const steps = [{ step_number: 1, prompt_id: 'p1', prompt_status: 'verified' }];
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[wf]],
    },
    { match: /FROM prompt_workflow_steps s/i, handler: () => [steps] },
  ];
  completeWorkflowThrows = new Error('Invalid workflow transition: "completed" → "completed"');
  const r = await svc.advanceWorkflows();
  assertEq(r.errors.length, 0, 'no error — swallowed');
  assertEq(r.actions_taken.length, 0, 'no action recorded');
}

resetAll();
{
  // Non-swallowed error
  const wf = { id: 'wf1', name: 'W1', manual_only: 0, autonomy_paused: 0 };
  const steps = [{ step_number: 1, prompt_id: 'p1', prompt_status: 'verified' }];
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[wf]],
    },
    { match: /FROM prompt_workflow_steps s/i, handler: () => [steps] },
  ];
  completeWorkflowThrows = new Error('unexpected db error');
  const r = await svc.advanceWorkflows();
  assertEq(r.errors.length, 1, 'db error captured');
  assertEq(r.errors[0].workflow_id, 'wf1', 'error has workflow_id');
  const errLog = autonomyLog.find(l => l.action === 'ERROR');
  assert(errLog !== undefined, 'ERROR logged to autonomy log');
}

// ============================================================================
// advanceWorkflows — executing prompt + pending evaluator → TRIGGER_EVAL
// ============================================================================
console.log('\n── advanceWorkflows: trigger eval on executing ───────────');

resetAll();
{
  const wf = { id: 'wf1', name: 'W1', manual_only: 0, autonomy_paused: 0 };
  const steps = [{
    step_number: 1, prompt_id: 'p1',
    prompt_status: 'executing', evaluator_status: 'pending',
  }];
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[wf]],
    },
    { match: /FROM prompt_workflow_steps s/i, handler: () => [steps] },
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      handler: (params) => [[{
        id: params[0], evaluator_status: 'pending', status: 'executing',
      }]],
    },
  ];
  modePermitsReturn = true;
  const r = await svc.advanceWorkflows();
  assertEq(r.actions_taken.length, 1, '1 action');
  assertEq(r.actions_taken[0].action, 'TRIGGER_EVAL', 'TRIGGER_EVAL');
  assertEq(r.actions_taken[0].target_id, 'p1', 'target prompt p1');
}

// ============================================================================
// advanceWorkflows — ready_for_release + safe → RELEASE
// ============================================================================
console.log('\n── advanceWorkflows: release on ready ────────────────────');

resetAll();
{
  const wf = { id: 'wf1', name: 'W1', manual_only: 0, autonomy_paused: 0 };
  const steps = [{
    step_number: 1, prompt_id: 'p1', title: 'Step 1',
    prompt_status: 'approved', queue_status: 'ready_for_release',
  }];
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[wf]],
    },
    { match: /FROM prompt_workflow_steps s/i, handler: () => [steps] },
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      handler: (params) => [[{ id: params[0], status: 'approved' }]],
    },
  ];
  gateEvalReturn = { safe: true, failures: [], passed: [], passed_count: 5, total_gates: 5 };
  modePermitsReturn = true;
  const r = await svc.advanceWorkflows();
  assertEq(r.actions_taken.length, 1, '1 action');
  assertEq(r.actions_taken[0].action, 'RELEASE', 'RELEASE action');
  assertEq(releasePromptCalls.length, 1, 'releasePrompt called');
  assertEq(releasePromptCalls[0].promptId, 'p1', 'released p1');
  assert(/Autonomous advance/.test(releasePromptCalls[0].reason), 'reason contains Autonomous advance');
}

// ============================================================================
// advanceWorkflows — ready_for_release + unsafe → blocked
// ============================================================================
console.log('\n── advanceWorkflows: blocked on unsafe gates ─────────────');

resetAll();
{
  const wf = { id: 'wf1', name: 'W1', manual_only: 0, autonomy_paused: 0 };
  const steps = [{
    step_number: 1, prompt_id: 'p1', title: 'Step 1',
    prompt_status: 'approved', queue_status: 'ready_for_release',
  }];
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[wf]],
    },
    { match: /FROM prompt_workflow_steps s/i, handler: () => [steps] },
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      handler: (params) => [[{ id: params[0], status: 'approved' }]],
    },
  ];
  gateEvalReturn = {
    safe: false,
    failures: [{ gate_id: 'G5', reason: 'Escalation required' }],
    passed: [], passed_count: 4, total_gates: 5,
  };
  const r = await svc.advanceWorkflows();
  assertEq(r.actions_taken.length, 0, 'no actions');
  assertEq(r.pauses.length, 1, '1 pause (first step blocked)');
  assertEq(r.pauses[0].block_reason, 'Escalation required', 'block reason');
  const blockedLog = autonomyLog.find(l => l.status === 'BLOCKED');
  assert(blockedLog !== undefined, 'BLOCKED logged');
}

// ============================================================================
// advanceWorkflows — SUPERVISED_FLOW chaining with pause on step 2
// ============================================================================
console.log('\n── advanceWorkflows: SUPERVISED_FLOW chaining ────────────');

resetAll();
{
  statusReturn = { enabled: true, mode: AUTONOMY_MODE.SUPERVISED_FLOW };
  const wf = { id: 'wf1', name: 'W1', manual_only: 0, autonomy_paused: 0 };
  const steps = [
    {
      step_number: 1, prompt_id: 'p1', title: 'S1',
      prompt_status: 'approved', queue_status: 'ready_for_release',
    },
    {
      step_number: 2, prompt_id: 'p2', title: 'S2',
      prompt_status: 'approved', queue_status: 'ready_for_release',
    },
  ];
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[wf]],
    },
    { match: /FROM prompt_workflow_steps s/i, handler: () => [steps] },
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      handler: (params) => [[{ id: params[0], status: 'approved' }]],
    },
  ];

  // First pause check returns shouldPause
  let pauseCheckCount = 0;
  pauseCheckReturn = { shouldPause: true, reasons: [{ reason: 'chain limit' }] };
  // Actually — pauseCheck is only called when advanceCount > 0, so step 1 will release
  // then step 2's pause check hits.
  const r = await svc.advanceWorkflows();
  assertEq(r.actions_taken.length, 1, 'step 1 released');
  assertEq(r.actions_taken[0].action, 'RELEASE', 'RELEASE');
  assertEq(r.pauses.length, 1, 'step 2 paused');
  assertEq(r.pauses[0].step_number, 2, 'paused at step 2');
  assertEq(pausedLog.length, 1, 'pauseWorkflow called');
  assertEq(pausedLog[0].workflowId, 'wf1', 'paused wf1');
  assert(/step 2/.test(pausedLog[0].reason), 'pause reason mentions step');
  const pauseLogged = autonomyLog.find(l => l.action === 'PAUSE');
  assert(pauseLogged !== undefined, 'PAUSE logged');
}

// ============================================================================
// advanceWorkflows — SAFE_ADVANCE caps at 1 step
// ============================================================================
console.log('\n── advanceWorkflows: SAFE_ADVANCE caps at 1 ──────────────');

resetAll();
{
  statusReturn = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
  const wf = { id: 'wf1', name: 'W1', manual_only: 0, autonomy_paused: 0 };
  const steps = [
    {
      step_number: 1, prompt_id: 'p1', title: 'S1',
      prompt_status: 'approved', queue_status: 'ready_for_release',
    },
    {
      step_number: 2, prompt_id: 'p2', title: 'S2',
      prompt_status: 'approved', queue_status: 'ready_for_release',
    },
  ];
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[wf]],
    },
    { match: /FROM prompt_workflow_steps s/i, handler: () => [steps] },
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      handler: (params) => [[{ id: params[0], status: 'approved' }]],
    },
  ];
  const r = await svc.advanceWorkflows();
  assertEq(r.actions_taken.length, 1, 'SAFE_ADVANCE stops after 1 step');
  assertEq(releasePromptCalls.length, 1, 'only 1 release call');
}

// ============================================================================
// advanceWorkflows — no prompt_id → no action, loop stops
// ============================================================================
console.log('\n── advanceWorkflows: no prompt_id → skip ─────────────────');

resetAll();
{
  const wf = { id: 'wf1', name: 'W1', manual_only: 0, autonomy_paused: 0 };
  const steps = [
    { step_number: 1, prompt_id: null, prompt_status: null },
  ];
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[wf]],
    },
    { match: /FROM prompt_workflow_steps s/i, handler: () => [steps] },
  ];
  const r = await svc.advanceWorkflows();
  assertEq(r.actions_taken.length, 0, 'no action');
  assertEq(r.pauses.length, 0, 'no pause');
}

// ============================================================================
// advanceWorkflows — draft step → no action
// ============================================================================
console.log('\n── advanceWorkflows: draft status → no action ────────────');

resetAll();
{
  const wf = { id: 'wf1', name: 'W1', manual_only: 0, autonomy_paused: 0 };
  const steps = [{
    step_number: 1, prompt_id: 'p1',
    prompt_status: 'draft', queue_status: 'pending',
  }];
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[wf]],
    },
    { match: /FROM prompt_workflow_steps s/i, handler: () => [steps] },
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      handler: (params) => [[{ id: params[0], status: 'draft' }]],
    },
  ];
  const r = await svc.advanceWorkflows();
  assertEq(r.actions_taken.length, 0, 'no action on draft');
  assertEq(r.pauses.length, 0, 'no pause');
}

// ============================================================================
// advanceWorkflows — empty workflow list
// ============================================================================
console.log('\n── advanceWorkflows: no active workflows ─────────────────');

resetAll();
{
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[]],
    },
  ];
  const r = await svc.advanceWorkflows();
  assertEq(r.workflows_inspected, 0, '0 inspected');
  assertEq(r.actions_taken.length, 0, 'no actions');
}

// ============================================================================
// advanceWorkflows — releasePrompt error → result.pause set
// ============================================================================
console.log('\n── advanceWorkflows: release error → pause ───────────────');

resetAll();
{
  const wf = { id: 'wf1', name: 'W1', manual_only: 0, autonomy_paused: 0 };
  const steps = [{
    step_number: 1, prompt_id: 'p1', title: 'S1',
    prompt_status: 'approved', queue_status: 'ready_for_release',
  }];
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[wf]],
    },
    { match: /FROM prompt_workflow_steps s/i, handler: () => [steps] },
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      handler: (params) => [[{ id: params[0], status: 'approved' }]],
    },
  ];
  releasePromptReturn = { success: false, error: 'simulated release failure' };
  const r = await svc.advanceWorkflows();
  assertEq(r.actions_taken.length, 0, 'no action recorded');
  assertEq(r.pauses.length, 1, 'pause recorded');
  assert(/Execution error/.test(r.pauses[0].reason), 'pause reason is execution error');
}

// ============================================================================
// getAutonomyDashboard
// ============================================================================
console.log('\n── getAutonomyDashboard ──────────────────────────────────');

resetAll();
{
  statusReturn = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
  pausedWorkflowsReturn = [{ id: 'wf2', reason: 'held' }];
  logsReturn = [{ action: 'RELEASE', status: 'SUCCESS' }];

  const wf = {
    id: 'wf1', name: 'W1', component: 'frontend',
    autonomy_paused: 0, manual_only: 0,
  };
  const steps = [
    {
      step_number: 1, title: 'S1', prompt_id: 'p1',
      prompt_status: 'verified', queue_status: 'released',
    },
    {
      step_number: 2, title: 'S2', prompt_id: 'p2',
      prompt_status: 'approved', queue_status: 'ready_for_release',
    },
  ];
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[wf]],
    },
    { match: /FROM prompt_workflow_steps s/i, handler: () => [steps] },
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      handler: (params) => [[{ id: params[0], status: 'approved' }]],
    },
  ];
  gateEvalReturn = { safe: true, failures: [], passed: [], passed_count: 5, total_gates: 5 };

  const dash = await svc.getAutonomyDashboard();
  assert(dash.status !== undefined, 'status present');
  assertEq(dash.paused_workflows.length, 1, '1 paused workflow');
  assertEq(dash.recent_activity.length, 1, '1 log entry');
  assertEq(dash.workflow_details.length, 1, '1 workflow detail');
  assertEq(dash.workflow_details[0].id, 'wf1', 'wf1');
  assert(dash.workflow_details[0].frontier_step !== null, 'frontier step set');
  assertEq(dash.workflow_details[0].frontier_step.step_number, 2, 'frontier=step 2');
  assert(dash.workflow_details[0].gate_results !== null, 'gate_results set');
  assertEq(dash.workflow_details[0].gate_results.safe, true, 'gates safe');
  assert(/5 safety gates passed/.test(dash.workflow_details[0].why_advancing), 'why_advancing populated');
}

// Dashboard: paused workflow → why_paused populated
resetAll();
{
  statusReturn = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
  const wf = {
    id: 'wf1', name: 'W1', component: 'frontend',
    autonomy_paused: 1, autonomy_pause_reason: 'operator hold',
    manual_only: 0,
  };
  const steps = [{
    step_number: 1, title: 'S1', prompt_id: 'p1',
    prompt_status: 'approved', queue_status: 'pending',
  }];
  routes = [
    {
      match: /SELECT \* FROM prompt_workflows WHERE status = 'active'/i,
      handler: () => [[wf]],
    },
    { match: /FROM prompt_workflow_steps s/i, handler: () => [steps] },
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      handler: (params) => [[{ id: params[0], status: 'approved' }]],
    },
  ];
  const dash = await svc.getAutonomyDashboard();
  assertEq(dash.workflow_details[0].why_paused, 'operator hold', 'why_paused = operator hold');
  assertEq(dash.workflow_details[0].autonomy_paused, true, 'autonomy_paused true');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
