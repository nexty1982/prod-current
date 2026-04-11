#!/usr/bin/env npx tsx
/**
 * Unit tests for services/autonomousAdvanceService.js (OMD-1058)
 *
 * Policy-governed workflow advancement engine. Two exported functions:
 *   - advanceWorkflows   (main loop)
 *   - getAutonomyDashboard
 *
 * External deps (stubbed via require.cache BEFORE SUT require):
 *   - ../config/db                  → getAppPool
 *   - ./autonomyPolicyService       → AUTONOMY_MODE, ACTION_TYPE, ...
 *   - ./decisionEngineService       → classifyPrompt
 *   - ./workflowService             → completeWorkflow
 *   - ./autoExecutionService        → releasePrompt (lazy-loaded)
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

// ── Enum constants (mirror autonomyPolicyService) ───────────────────
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

// ── Fake pool with SQL routing ──────────────────────────────────────
type SqlRoute = {
  match: RegExp;
  respond?: (params: any[]) => any;
  rows?: any;
};

let poolRoutes: SqlRoute[] = [];
const queryLog: { sql: string; params: any[] }[] = [];

function setPoolRoutes(rs: SqlRoute[]) { poolRoutes = rs; }

function routeQuery(sql: string, params: any[]): any {
  for (const r of poolRoutes) {
    if (r.match.test(sql)) {
      if (r.respond) return r.respond(params);
      return r.rows ?? [[]];
    }
  }
  return [[]];
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    return routeQuery(sql, params);
  },
};

// ── Stub trackers ───────────────────────────────────────────────────
type LogCall = { actionType: string; entry: any; outcome: string };
let autonomyLogs: LogCall[] = [];
let statusResult: any = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
let pausedWorkflows: any[] = [];
let logsResult: any[] = [];
let safetyGateResult: any = { safe: true, passed: [], failures: [], passed_count: 5, total_gates: 5 };
let pauseCheckResult: any = { shouldPause: false, reasons: [] };
let hasCriticalConflict = false;
let correctionCount = 0;
let modePermitsMap: Record<string, Record<string, boolean>> = {};
let pauseCalls: any[] = [];
let completeWorkflowCalls: any[] = [];
let completeWorkflowThrows: Error | null = null;
let releasePromptResult: any = { success: true, previous_status: 'ready', new_status: 'executing' };
let releasePromptThrows: Error | null = null;

function resetAll() {
  queryLog.length = 0;
  poolRoutes = [];
  autonomyLogs = [];
  statusResult = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
  pausedWorkflows = [];
  logsResult = [];
  safetyGateResult = { safe: true, passed: [], failures: [], passed_count: 5, total_gates: 5 };
  pauseCheckResult = { shouldPause: false, reasons: [] };
  hasCriticalConflict = false;
  correctionCount = 0;
  modePermitsMap = {
    SAFE_ADVANCE: { RELEASE: true, TRIGGER_EVAL: true, ADVANCE_WORKFLOW: true },
    SUPERVISED_FLOW: { RELEASE: true, TRIGGER_EVAL: true, ADVANCE_WORKFLOW: true },
  };
  pauseCalls = [];
  completeWorkflowCalls = [];
  completeWorkflowThrows = null;
  releasePromptResult = { success: true, previous_status: 'ready', new_status: 'executing' };
  releasePromptThrows = null;
}

// ── Stub ../config/db ───────────────────────────────────────────────
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// ── Stub ./autonomyPolicyService ────────────────────────────────────
const autonomyPolicyPath = require.resolve('../autonomyPolicyService');
require.cache[autonomyPolicyPath] = {
  id: autonomyPolicyPath,
  filename: autonomyPolicyPath,
  loaded: true,
  exports: {
    AUTONOMY_MODE,
    ACTION_TYPE,
    getStatus: async () => statusResult,
    logAutonomousAction: async (actionType: string, entry: any, outcome: string) => {
      autonomyLogs.push({ actionType, entry, outcome });
    },
    checkPauseConditions: (_ctx: any) => pauseCheckResult,
    evaluateSafetyGates: (_ctx: any) => safetyGateResult,
    modePermitsAction: (mode: string, action: string) => {
      return modePermitsMap[mode]?.[action] ?? false;
    },
    pauseWorkflow: async (workflowId: number, reason: string) => {
      pauseCalls.push({ workflowId, reason });
    },
    hasCriticalLearningConflict: async (_component: string) => hasCriticalConflict,
    getCorrectionCount: async (_promptId: number) => correctionCount,
    getPausedWorkflows: async () => pausedWorkflows,
    getLogs: async (_limit: number) => logsResult,
  },
} as any;

// ── Stub ./decisionEngineService ────────────────────────────────────
const decisionEnginePath = require.resolve('../decisionEngineService');
require.cache[decisionEnginePath] = {
  id: decisionEnginePath,
  filename: decisionEnginePath,
  loaded: true,
  exports: {
    classifyPrompt: (_prompt: any) => ({ recommendation: 'RELEASE', confidence: 'high' }),
  },
} as any;

// ── Stub ./workflowService ──────────────────────────────────────────
const workflowServicePath = require.resolve('../workflowService');
require.cache[workflowServicePath] = {
  id: workflowServicePath,
  filename: workflowServicePath,
  loaded: true,
  exports: {
    completeWorkflow: async (workflowId: number, actor: string) => {
      completeWorkflowCalls.push({ workflowId, actor });
      if (completeWorkflowThrows) throw completeWorkflowThrows;
      return { success: true };
    },
  },
} as any;

// ── Stub ./autoExecutionService (lazy-loaded inside SUT) ────────────
const autoExecPath = require.resolve('../autoExecutionService');
require.cache[autoExecPath] = {
  id: autoExecPath,
  filename: autoExecPath,
  loaded: true,
  exports: {
    releasePrompt: async (_promptId: number, _reason: string) => {
      if (releasePromptThrows) throw releasePromptThrows;
      return releasePromptResult;
    },
  },
} as any;

// Silence noisy logs
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

const { advanceWorkflows, getAutonomyDashboard } = require('../autonomousAdvanceService');

async function main() {

// ============================================================================
// advanceWorkflows: skip modes
// ============================================================================
console.log('\n── advanceWorkflows: skip modes ──────────────────────────');

resetAll();
statusResult = { enabled: false, mode: AUTONOMY_MODE.SAFE_ADVANCE };
{
  const r = await advanceWorkflows();
  assertEq(r.skipped, true, 'disabled → skipped');
  assert(r.reason?.includes('not enabled'), 'reason mentions not enabled');
  assertEq(r.actions_taken.length, 0, 'no actions');
}

resetAll();
statusResult = { enabled: true, mode: AUTONOMY_MODE.OFF };
{
  const r = await advanceWorkflows();
  assertEq(r.skipped, true, 'OFF → skipped');
}

resetAll();
statusResult = { enabled: true, mode: AUTONOMY_MODE.RELEASE_ONLY };
{
  const r = await advanceWorkflows();
  assertEq(r.skipped, true, 'RELEASE_ONLY → skipped');
}

// ============================================================================
// advanceWorkflows: no workflows
// ============================================================================
console.log('\n── advanceWorkflows: no workflows ────────────────────────');

resetAll();
setPoolRoutes([{ match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[]] }]);
{
  const r = await advanceWorkflows();
  assertEq(r.workflows_inspected, 0, '0 inspected');
  assertEq(r.actions_taken.length, 0, 'no actions');
  assertEq(r.pauses.length, 0, 'no pauses');
  assertEq(r.errors.length, 0, 'no errors');
}

// ============================================================================
// advanceWorkflows: manual_only workflow → pause G9
// ============================================================================
console.log('\n── advanceWorkflows: manual_only gate ────────────────────');

resetAll();
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 1, name: 'wf-manual', manual_only: 1, autonomy_paused: 0 },
  ]] },
]);
{
  const r = await advanceWorkflows();
  assertEq(r.workflows_inspected, 1, '1 inspected');
  assertEq(r.pauses.length, 1, '1 pause');
  assertEq(r.pauses[0].gate_id, 'G9', 'G9 gate');
  assert(r.pauses[0].reason.includes('manual_only'), 'reason mentions manual_only');
  assertEq(r.actions_taken.length, 0, 'no actions');
}

// ============================================================================
// advanceWorkflows: autonomy_paused → pause G10
// ============================================================================
console.log('\n── advanceWorkflows: autonomy_paused gate ────────────────');

resetAll();
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 2, name: 'wf-paused', manual_only: 0, autonomy_paused: 1, autonomy_pause_reason: 'op hold' },
  ]] },
]);
{
  const r = await advanceWorkflows();
  assertEq(r.pauses[0].gate_id, 'G10', 'G10 gate');
  assertEq(r.pauses[0].reason, 'op hold', 'custom reason preserved');
}

// Default pause reason when none set
resetAll();
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 3, name: 'wf3', manual_only: 0, autonomy_paused: 1, autonomy_pause_reason: null },
  ]] },
]);
{
  const r = await advanceWorkflows();
  assert(r.pauses[0].reason.includes('paused by operator'), 'default pause reason');
}

// ============================================================================
// advanceWorkflows: all steps verified → advance workflow
// ============================================================================
console.log('\n── advanceWorkflows: all verified → advance ──────────────');

resetAll();
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 10, name: 'wf-done', manual_only: 0, autonomy_paused: 0 },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[
    { step_number: 1, prompt_id: 100, prompt_status: 'verified', title: 's1' },
    { step_number: 2, prompt_id: 101, prompt_status: 'verified', title: 's2' },
  ]] },
]);
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 1, '1 action');
  assertEq(r.actions_taken[0].action, ACTION_TYPE.ADVANCE_WORKFLOW, 'ADVANCE_WORKFLOW');
  assertEq(r.actions_taken[0].new_state, 'completed', 'new_state=completed');
  assertEq(completeWorkflowCalls.length, 1, 'completeWorkflow called');
  assertEq(completeWorkflowCalls[0].workflowId, 10, 'called with workflow id');
  assert(autonomyLogs.some(l => l.actionType === ACTION_TYPE.ADVANCE_WORKFLOW), 'action logged');
}

// completeWorkflow throws "Invalid workflow transition" → swallowed
resetAll();
completeWorkflowThrows = new Error('Invalid workflow transition from completed to completed');
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 11, name: 'wf11', manual_only: 0, autonomy_paused: 0 },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[
    { step_number: 1, prompt_id: 1, prompt_status: 'verified', title: 's' },
  ]] },
]);
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 0, 'no action recorded on swallowed error');
  assertEq(r.errors.length, 0, 'not recorded as error');
}

// Other error from completeWorkflow bubbles up
resetAll();
completeWorkflowThrows = new Error('database is down');
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 12, name: 'wf12', manual_only: 0, autonomy_paused: 0 },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[
    { step_number: 1, prompt_id: 1, prompt_status: 'verified', title: 's' },
  ]] },
]);
quiet();
{
  const r = await advanceWorkflows();
  loud();
  assertEq(r.errors.length, 1, 'error captured');
  assert(r.errors[0].error.includes('database is down'), 'error message preserved');
  assert(autonomyLogs.some(l => l.actionType === 'ERROR'), 'ERROR logged');
}

// ============================================================================
// advanceWorkflows: no steps → no action, no pause
// ============================================================================
console.log('\n── advanceWorkflows: no steps ────────────────────────────');

resetAll();
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 20, name: 'wf-empty', manual_only: 0, autonomy_paused: 0 },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[]] },
]);
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 0, 'no actions');
  assertEq(r.pauses.length, 0, 'no pauses');
}

// ============================================================================
// advanceWorkflows: frontier RELEASE action
// ============================================================================
console.log('\n── advanceWorkflows: frontier RELEASE ────────────────────');

resetAll();
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 30, name: 'wf-release', manual_only: 0, autonomy_paused: 0, component: 'cmp' },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[
    { step_number: 1, prompt_id: 300, prompt_status: 'verified', title: 'done', queue_status: null },
    { step_number: 2, prompt_id: 301, prompt_status: 'ready_for_release', queue_status: 'ready_for_release', title: 'frontier' },
  ]] },
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [[{ id: 301, queue_status: 'ready_for_release' }]] },
]);
releasePromptResult = { success: true, previous_status: 'ready', new_status: 'executing' };
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 1, '1 action');
  assertEq(r.actions_taken[0].action, ACTION_TYPE.RELEASE, 'RELEASE action');
  assertEq(r.actions_taken[0].target_id, 301, 'target_id=frontier prompt');
  assertEq(r.actions_taken[0].previous_state, 'ready', 'previous_state');
  assertEq(r.actions_taken[0].new_state, 'executing', 'new_state');
  assert(autonomyLogs.some(l => l.actionType === ACTION_TYPE.RELEASE), 'RELEASE logged');
}

// Safety gate blocks → BLOCKED log + pause
resetAll();
safetyGateResult = {
  safe: false,
  passed: [],
  failures: [{ gate: 'G1', reason: 'confidence too low' }],
  passed_count: 3,
  total_gates: 5,
};
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 31, name: 'wf-block', manual_only: 0, autonomy_paused: 0, component: 'c' },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[
    { step_number: 1, prompt_id: 310, prompt_status: 'ready_for_release', queue_status: 'ready_for_release', title: 'blk' },
  ]] },
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [[{ id: 310 }]] },
]);
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 0, 'no actions');
  assertEq(r.pauses.length, 1, '1 pause');
  assert(r.pauses[0].block_reason?.includes('confidence too low'), 'block reason');
  assert(autonomyLogs.some(l => l.outcome === 'BLOCKED'), 'BLOCKED logged');
}

// Release fails (not already_released) → pause with execution error
resetAll();
releasePromptThrows = null;
releasePromptResult = { success: false, error: 'could not release' };
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 32, name: 'wf-fail', manual_only: 0, autonomy_paused: 0, component: 'c' },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[
    { step_number: 1, prompt_id: 320, prompt_status: 'ready_for_release', queue_status: 'ready_for_release', title: 't' },
  ]] },
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [[{ id: 320 }]] },
]);
{
  const r = await advanceWorkflows();
  assertEq(r.pauses.length, 1, '1 pause from execution error');
  assert(r.pauses[0].reason?.includes('Execution error') || r.pauses[0].reason?.includes('could not release'), 'execution error pause');
}

// Release says already_released → action succeeds
resetAll();
releasePromptResult = { success: false, already_released: true, previous_status: 'executing', new_status: 'executing' };
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 33, name: 'wf', manual_only: 0, autonomy_paused: 0, component: 'c' },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[
    { step_number: 1, prompt_id: 330, prompt_status: 'ready_for_release', queue_status: 'ready_for_release', title: 't' },
  ]] },
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [[{ id: 330 }]] },
]);
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 1, 'action recorded despite already_released');
  assertEq(r.actions_taken[0].already_released, true, 'already_released flag passed through');
}

// ============================================================================
// advanceWorkflows: TRIGGER_EVAL on executing prompt
// ============================================================================
console.log('\n── advanceWorkflows: TRIGGER_EVAL ────────────────────────');

resetAll();
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 40, name: 'wf-eval', manual_only: 0, autonomy_paused: 0, component: 'c' },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[
    {
      step_number: 1,
      prompt_id: 400,
      prompt_status: 'executing',
      evaluator_status: 'pending',
      title: 'exec',
    },
  ]] },
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [[{ id: 400, evaluator_status: 'pending' }]] },
]);
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 1, '1 action');
  assertEq(r.actions_taken[0].action, ACTION_TYPE.TRIGGER_EVAL, 'TRIGGER_EVAL');
  assert(autonomyLogs.some(l => l.actionType === ACTION_TYPE.TRIGGER_EVAL), 'TRIGGER_EVAL logged');
}

// Mode doesn't permit trigger_eval → null → break
resetAll();
modePermitsMap.SAFE_ADVANCE.TRIGGER_EVAL = false;
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 41, name: 'wf', manual_only: 0, autonomy_paused: 0, component: 'c' },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[
    { step_number: 1, prompt_id: 410, prompt_status: 'executing', evaluator_status: 'pending', title: 't' },
  ]] },
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [[{ id: 410 }]] },
]);
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 0, 'no action when mode forbids TRIGGER_EVAL');
}

// ============================================================================
// advanceWorkflows: draft/audited prompts → no action
// ============================================================================
console.log('\n── advanceWorkflows: pre-pipeline states ─────────────────');

resetAll();
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 50, name: 'wf', manual_only: 0, autonomy_paused: 0, component: 'c' },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[
    { step_number: 1, prompt_id: 500, prompt_status: 'draft', title: 't' },
  ]] },
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [[{ id: 500 }]] },
]);
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 0, 'draft → no action');
}

// ============================================================================
// advanceWorkflows: step without prompt_id → no action
// ============================================================================
console.log('\n── advanceWorkflows: no prompt_id ────────────────────────');

resetAll();
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 60, name: 'wf', manual_only: 0, autonomy_paused: 0, component: 'c' },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[
    { step_number: 1, prompt_id: null, prompt_status: null, title: 't' },
  ]] },
]);
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 0, 'null prompt_id → no action');
}

// ============================================================================
// advanceWorkflows: SUPERVISED_FLOW chains + pause condition
// ============================================================================
console.log('\n── advanceWorkflows: SUPERVISED_FLOW chaining ────────────');

resetAll();
statusResult = { enabled: true, mode: AUTONOMY_MODE.SUPERVISED_FLOW };
modePermitsMap.SUPERVISED_FLOW = { RELEASE: true, TRIGGER_EVAL: true, ADVANCE_WORKFLOW: true };
// Chain: step1 RELEASE succeeds, step2 triggers pause check
pauseCheckResult = { shouldPause: true, reasons: [{ reason: 'quality dropped' }] };
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 70, name: 'wf-chain', manual_only: 0, autonomy_paused: 0, component: 'c' },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[
    { step_number: 1, prompt_id: 700, prompt_status: 'ready_for_release', queue_status: 'ready_for_release', title: 'first' },
    { step_number: 2, prompt_id: 701, prompt_status: 'ready_for_release', queue_status: 'ready_for_release', title: 'second' },
  ]] },
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [[{ id: 700 }]] },
]);
releasePromptResult = { success: true, previous_status: 'ready', new_status: 'executing' };
{
  const r = await advanceWorkflows();
  // First step released; pause check fires for step 2 → auto-pause
  assertEq(r.actions_taken.length, 1, '1 action (first step released)');
  assertEq(r.pauses.length, 1, '1 pause (second step)');
  assert(r.pauses[0].reason?.includes('quality dropped'), 'pause reason');
  assertEq(pauseCalls.length, 1, 'pauseWorkflow invoked');
  assertEq(pauseCalls[0].workflowId, 70, 'correct workflow id');
}

// ============================================================================
// advanceWorkflows: SAFE_ADVANCE limits to one step
// ============================================================================
console.log('\n── advanceWorkflows: SAFE_ADVANCE one-step limit ─────────');

resetAll();
statusResult = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 80, name: 'wf-safe', manual_only: 0, autonomy_paused: 0, component: 'c' },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[
    { step_number: 1, prompt_id: 800, prompt_status: 'ready_for_release', queue_status: 'ready_for_release', title: 's1' },
    { step_number: 2, prompt_id: 801, prompt_status: 'ready_for_release', queue_status: 'ready_for_release', title: 's2' },
  ]] },
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [[{ id: 800 }]] },
]);
{
  const r = await advanceWorkflows();
  assertEq(r.actions_taken.length, 1, 'SAFE_ADVANCE: exactly 1 action');
}

// ============================================================================
// getAutonomyDashboard
// ============================================================================
console.log('\n── getAutonomyDashboard ──────────────────────────────────');

resetAll();
statusResult = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
pausedWorkflows = [{ id: 99, name: 'stuck' }];
logsResult = [{ id: 1, action: 'RELEASE' }];
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 1, name: 'wf-dash', component: 'c', manual_only: 0, autonomy_paused: 0, autonomy_pause_reason: null },
    { id: 2, name: 'wf-paused', component: 'c2', manual_only: 0, autonomy_paused: 1, autonomy_pause_reason: 'ops hold' },
  ]] },
  {
    match: /FROM prompt_workflow_steps/,
    respond: (params: any[]) => {
      const wfId = params[0];
      if (wfId === 1) {
        return [[
          { step_number: 1, prompt_id: 100, prompt_status: 'verified', title: 'done' },
          { step_number: 2, prompt_id: 101, prompt_status: 'executing', title: 'curr', queue_status: 'executing' },
        ]];
      }
      return [[
        { step_number: 1, prompt_id: 200, prompt_status: 'executing', title: 't' },
      ]];
    },
  },
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [[{ id: 101 }]] },
]);
{
  const dash = await getAutonomyDashboard();
  assertEq(dash.status.mode, AUTONOMY_MODE.SAFE_ADVANCE, 'status.mode');
  assertEq(dash.paused_workflows.length, 1, 'paused_workflows');
  assertEq(dash.recent_activity.length, 1, 'recent_activity');
  assertEq(dash.workflow_details.length, 2, '2 workflow details');

  const wf1 = dash.workflow_details[0];
  assertEq(wf1.id, 1, 'wf1 id');
  assertEq(wf1.autonomy_paused, false, 'wf1 not paused');
  assertEq(wf1.frontier_step?.step_number, 2, 'wf1 frontier = step 2');
  assert(wf1.why_advancing?.includes('gates passed'), 'wf1 why_advancing set');
  assertEq(wf1.why_paused, null, 'wf1 why_paused null');
  assertEq(wf1.gate_results?.safe, true, 'wf1 gate safe');

  const wf2 = dash.workflow_details[1];
  assertEq(wf2.autonomy_paused, true, 'wf2 paused');
  assertEq(wf2.why_paused, 'ops hold', 'wf2 why_paused = ops hold');
}

// Dashboard with gate failure populates why_paused
resetAll();
statusResult = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
safetyGateResult = {
  safe: false,
  passed: [],
  failures: [{ gate: 'G1', reason: 'quality too low' }],
  passed_count: 2,
  total_gates: 5,
};
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 1, name: 'wf-blocked', component: 'c', manual_only: 0, autonomy_paused: 0, autonomy_pause_reason: null },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[
    { step_number: 1, prompt_id: 100, prompt_status: 'ready_for_release', title: 't', queue_status: 'ready_for_release' },
  ]] },
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [[{ id: 100 }]] },
]);
{
  const dash = await getAutonomyDashboard();
  const wf = dash.workflow_details[0];
  assertEq(wf.gate_results?.safe, false, 'gate unsafe');
  assertEq(wf.why_paused, 'quality too low', 'why_paused = first failure reason');
  assertEq(wf.why_advancing, null, 'why_advancing null when blocked');
}

// Dashboard: manual_only workflow has no gate eval
resetAll();
statusResult = { enabled: true, mode: AUTONOMY_MODE.SAFE_ADVANCE };
setPoolRoutes([
  { match: /FROM prompt_workflows WHERE status = 'active'/, rows: [[
    { id: 1, name: 'wf', component: 'c', manual_only: 1, autonomy_paused: 0, autonomy_pause_reason: null },
  ]] },
  { match: /FROM prompt_workflow_steps/, rows: [[
    { step_number: 1, prompt_id: null, prompt_status: null, title: 't' },
  ]] },
]);
{
  const dash = await getAutonomyDashboard();
  const wf = dash.workflow_details[0];
  assertEq(wf.manual_only, true, 'manual_only flag');
  assertEq(wf.frontier_step, null, 'no frontier (null prompt_status filtered out)');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
