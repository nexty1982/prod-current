#!/usr/bin/env npx tsx
/**
 * Unit tests for services/autonomyPolicyService.js
 *
 * Formal policy model for autonomous workflow advancement.
 * One dep: `../config/db` (getAppPool). Stubbed via require.cache.
 *
 * Coverage:
 *   - Exported constants (AUTONOMY_MODE, MODE_ORDER, ACTION_TYPE,
 *     ACTION_MODE_REQUIREMENTS)
 *   - modePermitsAction: all 4 modes × all 4 action types matrix,
 *     plus invalid mode/action → false
 *   - evaluateSafetyGates: all 13 gates pass when "good" ctx,
 *     each gate individually tripped, failures[] populated correctly,
 *     safe flag is false iff any failure
 *   - checkPauseConditions: all 8 conditions, clean ctx → no pause,
 *     each condition triggers individually, multiple reasons
 *   - getStatus: mode + enabled from settings, unknown mode → OFF,
 *     allowed_actions derived from mode hierarchy
 *   - setMode: validation, sets enabled true/false based on OFF, persists mode
 *   - pauseWorkflow / resumeWorkflow: affected=1 → success, affected=0 → throw
 *   - setManualOnly: dispatch by target type (workflow/step/prompt),
 *     invalid type → throw, missing target → throw
 *   - getLogs: default limit, JSON meta parsing, null meta
 *   - getPausedWorkflows: passthrough
 *   - hasCriticalLearningConflict: no component → false, count>0 → true
 *   - getCorrectionCount: no promptId → 0, returns count
 *
 * Run: npx tsx server/src/services/__tests__/autonomyPolicyService.test.ts
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

// ── Scriptable SQL-routed pool ─────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Route = { match: RegExp; respond?: (params: any[]) => any; rows?: any; throws?: Error };
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        const out = r.respond ? r.respond(params) : r.rows;
        return [out];
      }
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

function reset() { queryLog.length = 0; routes = []; }

// Silence console (module logs on error)
const origError = console.error;
function quiet() { console.error = () => {}; }
function loud() { console.error = origError; }

const svc = require('../autonomyPolicyService');
const {
  AUTONOMY_MODE,
  MODE_ORDER,
  ACTION_TYPE,
  ACTION_MODE_REQUIREMENTS,
  modePermitsAction,
  evaluateSafetyGates,
  SAFETY_GATES,
  checkPauseConditions,
  PAUSE_CONDITIONS,
  getStatus,
  setMode,
  pauseWorkflow,
  resumeWorkflow,
  setManualOnly,
  getLogs,
  getPausedWorkflows,
  hasCriticalLearningConflict,
  getCorrectionCount,
} = svc;

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(AUTONOMY_MODE.OFF, 'OFF', 'OFF');
assertEq(AUTONOMY_MODE.RELEASE_ONLY, 'RELEASE_ONLY', 'RELEASE_ONLY');
assertEq(AUTONOMY_MODE.SAFE_ADVANCE, 'SAFE_ADVANCE', 'SAFE_ADVANCE');
assertEq(AUTONOMY_MODE.SUPERVISED_FLOW, 'SUPERVISED_FLOW', 'SUPERVISED_FLOW');

assertEq(MODE_ORDER, ['OFF', 'RELEASE_ONLY', 'SAFE_ADVANCE', 'SUPERVISED_FLOW'], 'MODE_ORDER');

assertEq(ACTION_TYPE.RELEASE, 'RELEASE', 'RELEASE');
assertEq(ACTION_TYPE.TRIGGER_EVAL, 'TRIGGER_EVAL', 'TRIGGER_EVAL');
assertEq(ACTION_TYPE.QUEUE_NEXT, 'QUEUE_NEXT', 'QUEUE_NEXT');
assertEq(ACTION_TYPE.ADVANCE_WORKFLOW, 'ADVANCE_WORKFLOW', 'ADVANCE_WORKFLOW');

assertEq(ACTION_MODE_REQUIREMENTS.RELEASE, 'RELEASE_ONLY', 'RELEASE needs RELEASE_ONLY');
assertEq(ACTION_MODE_REQUIREMENTS.TRIGGER_EVAL, 'SAFE_ADVANCE', 'TRIGGER_EVAL needs SAFE_ADVANCE');
assertEq(ACTION_MODE_REQUIREMENTS.QUEUE_NEXT, 'SAFE_ADVANCE', 'QUEUE_NEXT needs SAFE_ADVANCE');
assertEq(ACTION_MODE_REQUIREMENTS.ADVANCE_WORKFLOW, 'SAFE_ADVANCE', 'ADVANCE_WORKFLOW needs SAFE_ADVANCE');

// SAFETY_GATES & PAUSE_CONDITIONS sanity
assertEq(SAFETY_GATES.length, 13, '13 safety gates');
assertEq(PAUSE_CONDITIONS.length, 8, '8 pause conditions');

// ============================================================================
// modePermitsAction
// ============================================================================
console.log('\n── modePermitsAction: matrix ─────────────────────────────');

// OFF: nothing allowed
assertEq(modePermitsAction('OFF', 'RELEASE'), false, 'OFF ✗ RELEASE');
assertEq(modePermitsAction('OFF', 'TRIGGER_EVAL'), false, 'OFF ✗ TRIGGER_EVAL');
assertEq(modePermitsAction('OFF', 'QUEUE_NEXT'), false, 'OFF ✗ QUEUE_NEXT');
assertEq(modePermitsAction('OFF', 'ADVANCE_WORKFLOW'), false, 'OFF ✗ ADVANCE_WORKFLOW');

// RELEASE_ONLY: RELEASE yes, advance no
assertEq(modePermitsAction('RELEASE_ONLY', 'RELEASE'), true, 'RELEASE_ONLY ✓ RELEASE');
assertEq(modePermitsAction('RELEASE_ONLY', 'TRIGGER_EVAL'), false, 'RELEASE_ONLY ✗ TRIGGER_EVAL');
assertEq(modePermitsAction('RELEASE_ONLY', 'QUEUE_NEXT'), false, 'RELEASE_ONLY ✗ QUEUE_NEXT');
assertEq(modePermitsAction('RELEASE_ONLY', 'ADVANCE_WORKFLOW'), false, 'RELEASE_ONLY ✗ ADVANCE_WORKFLOW');

// SAFE_ADVANCE: all allowed
assertEq(modePermitsAction('SAFE_ADVANCE', 'RELEASE'), true, 'SAFE_ADVANCE ✓ RELEASE');
assertEq(modePermitsAction('SAFE_ADVANCE', 'TRIGGER_EVAL'), true, 'SAFE_ADVANCE ✓ TRIGGER_EVAL');
assertEq(modePermitsAction('SAFE_ADVANCE', 'QUEUE_NEXT'), true, 'SAFE_ADVANCE ✓ QUEUE_NEXT');
assertEq(modePermitsAction('SAFE_ADVANCE', 'ADVANCE_WORKFLOW'), true, 'SAFE_ADVANCE ✓ ADVANCE_WORKFLOW');

// SUPERVISED_FLOW: all allowed (superset)
assertEq(modePermitsAction('SUPERVISED_FLOW', 'RELEASE'), true, 'SUPERVISED_FLOW ✓ RELEASE');
assertEq(modePermitsAction('SUPERVISED_FLOW', 'ADVANCE_WORKFLOW'), true, 'SUPERVISED_FLOW ✓ ADVANCE');

// Invalid mode
assertEq(modePermitsAction('BOGUS', 'RELEASE'), false, 'invalid mode → false');
// Invalid action
assertEq(modePermitsAction('SAFE_ADVANCE', 'BOGUS'), false, 'invalid action → false');

// ============================================================================
// evaluateSafetyGates — all pass
// ============================================================================
console.log('\n── evaluateSafetyGates: all pass ─────────────────────────');

function goodCtx() {
  return {
    prompt: {
      confidence_level: 'high',
      evaluator_status: 'pass',
      completion_status: 'complete',
      degradation_flag: false,
      escalation_required: false,
      queue_status: 'ready',
      manual_only: false,
      release_mode: 'auto',
    },
    workflow: {
      manual_only: false,
      autonomy_paused: false,
    },
    step: { manual_only: false },
    hasCriticalLearningConflict: false,
    agentResultFinal: true,
  };
}

{
  const r = evaluateSafetyGates(goodCtx());
  assertEq(r.safe, true, 'good ctx → safe');
  assertEq(r.failures, [], 'no failures');
  assertEq(r.passed_count, 13, 'all 13 passed');
  assertEq(r.total_gates, 13, 'total = 13');
}

// ============================================================================
// evaluateSafetyGates — individual gate failures
// ============================================================================
console.log('\n── evaluateSafetyGates: individual failures ──────────────');

function tripGate(mutate: (ctx: any) => void, expectedGate: string, label: string) {
  const ctx = goodCtx();
  mutate(ctx);
  const r = evaluateSafetyGates(ctx);
  assertEq(r.safe, false, `${label}: safe=false`);
  const failure = r.failures.find((f: any) => f.id === expectedGate);
  assert(failure !== undefined, `${label}: ${expectedGate} in failures`);
}

// G1: confidence not high
tripGate(c => { c.prompt.confidence_level = 'medium'; }, 'G1', 'medium confidence');
tripGate(c => { c.prompt.confidence_level = 'low'; }, 'G1', 'low confidence');
tripGate(c => { c.prompt.confidence_level = null; }, 'G1', 'null confidence');

// G2: evaluator not pass
tripGate(c => { c.prompt.evaluator_status = 'fail'; }, 'G2', 'evaluator fail');
tripGate(c => { c.prompt.evaluator_status = 'pending'; }, 'G2', 'evaluator pending');

// G3: completion not complete
tripGate(c => { c.prompt.completion_status = 'partial'; }, 'G3', 'partial');
tripGate(c => { c.prompt.completion_status = 'failed'; }, 'G3', 'failed');

// G4: degradation flag set
tripGate(c => { c.prompt.degradation_flag = true; }, 'G4', 'degradation');

// G5: escalation required
tripGate(c => { c.prompt.escalation_required = true; }, 'G5', 'escalation');

// G6: queue status blocked/pending
tripGate(c => { c.prompt.queue_status = 'blocked'; }, 'G6', 'queue blocked');
tripGate(c => { c.prompt.queue_status = 'pending'; }, 'G6', 'queue pending');

// G7: prompt manual_only
tripGate(c => { c.prompt.manual_only = true; }, 'G7', 'prompt manual');

// G8: step manual_only
tripGate(c => { c.step.manual_only = true; }, 'G8', 'step manual');

// G9: workflow manual_only
tripGate(c => { c.workflow.manual_only = true; }, 'G9', 'workflow manual');

// G10: workflow autonomy_paused
tripGate(c => { c.workflow.autonomy_paused = true; }, 'G10', 'workflow paused');

// G11: critical learning conflict
tripGate(c => { c.hasCriticalLearningConflict = true; }, 'G11', 'learning conflict');

// G12: agent result NOT final (explicitly false)
tripGate(c => { c.agentResultFinal = false; }, 'G12', 'agent not final');

// G13: release_mode = manual
tripGate(c => { c.prompt.release_mode = 'manual'; }, 'G13', 'release manual');

// G8/G9 undefined step/workflow → pass (optional)
{
  const ctx = goodCtx();
  ctx.step = undefined as any;
  ctx.workflow = undefined as any;
  const r = evaluateSafetyGates(ctx);
  assertEq(r.safe, true, 'undefined step/workflow still safe');
}

// ============================================================================
// evaluateSafetyGates — multiple failures
// ============================================================================
console.log('\n── evaluateSafetyGates: multiple failures ────────────────');

{
  const ctx = goodCtx();
  ctx.prompt.confidence_level = 'low';
  ctx.prompt.evaluator_status = 'fail';
  ctx.prompt.escalation_required = true;
  const r = evaluateSafetyGates(ctx);
  assertEq(r.safe, false, 'multiple failures → unsafe');
  assertEq(r.failures.length, 3, '3 failures');
  assertEq(r.passed_count, 10, '10 passed');
}

// ============================================================================
// checkPauseConditions
// ============================================================================
console.log('\n── checkPauseConditions: clean ───────────────────────────');

function cleanCtx() {
  return {
    recommendation: { action: 'PROCEED' },
    prompt: { degradation_flag: false, confidence_level: 'high' },
    comparisonInconclusive: false,
    correctionCount: 0,
    step: { manual_only: false },
  };
}

{
  const r = checkPauseConditions(cleanCtx());
  assertEq(r.shouldPause, false, 'clean → no pause');
  assertEq(r.reasons, [], 'empty reasons');
}

console.log('\n── checkPauseConditions: triggers ────────────────────────');

function tripPause(mutate: (ctx: any) => void, expectedId: string, label: string) {
  const ctx = cleanCtx();
  mutate(ctx);
  const r = checkPauseConditions(ctx);
  assertEq(r.shouldPause, true, `${label}: pause`);
  const match = r.reasons.find((x: any) => x.id === expectedId);
  assert(match !== undefined, `${label}: ${expectedId} in reasons`);
}

// P1: FIX_REQUIRED
tripPause(c => { c.recommendation.action = 'FIX_REQUIRED'; }, 'P1', 'FIX_REQUIRED');
// P2: UNBLOCK_REQUIRED
tripPause(c => { c.recommendation.action = 'UNBLOCK_REQUIRED'; }, 'P2', 'UNBLOCK_REQUIRED');
// P3: REVIEW_REQUIRED
tripPause(c => { c.recommendation.action = 'REVIEW_REQUIRED'; }, 'P3', 'REVIEW_REQUIRED');
// P4: degradation
tripPause(c => { c.prompt.degradation_flag = true; }, 'P4', 'degradation');
// P5: confidence low
tripPause(c => { c.prompt.confidence_level = 'low'; }, 'P5', 'confidence low');
tripPause(c => { c.prompt.confidence_level = 'unknown'; }, 'P5', 'confidence unknown');
// P6: comparison inconclusive
tripPause(c => { c.comparisonInconclusive = true; }, 'P6', 'comparison inconclusive');
// P7: correction count >= 2
tripPause(c => { c.correctionCount = 2; }, 'P7', '2 corrections');
tripPause(c => { c.correctionCount = 5; }, 'P7', '5 corrections');
// Boundary: correctionCount = 1 → no pause
{
  const ctx = cleanCtx();
  ctx.correctionCount = 1;
  const r = checkPauseConditions(ctx);
  assertEq(r.shouldPause, false, '1 correction → no pause');
}
// P8: step manual_only
tripPause(c => { c.step.manual_only = true; }, 'P8', 'step manual');

// Multiple reasons
{
  const ctx = cleanCtx();
  ctx.prompt.degradation_flag = true;
  ctx.prompt.confidence_level = 'low';
  ctx.correctionCount = 3;
  const r = checkPauseConditions(ctx);
  assertEq(r.shouldPause, true, 'multi → pause');
  assertEq(r.reasons.length, 3, '3 reasons');
}

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

reset();
// _getSetting queries SELECT value_multilang FROM system_settings WHERE key_name = ?
// First call: mode. Second call: enabled.
routes.push({
  match: /SELECT value_multilang FROM system_settings/,
  respond: (params: any[]) => {
    if (params[0] === 'autonomy_mode') return [{ value_multilang: JSON.stringify('SAFE_ADVANCE') }];
    if (params[0] === 'autonomy_enabled') return [{ value_multilang: JSON.stringify('true') }];
    return [];
  },
});
{
  const r = await getStatus();
  assertEq(r.enabled, true, 'enabled');
  assertEq(r.mode, 'SAFE_ADVANCE', 'mode');
  assert(r.allowed_actions.includes('RELEASE'), 'RELEASE allowed');
  assert(r.allowed_actions.includes('TRIGGER_EVAL'), 'TRIGGER_EVAL allowed');
  assert(r.allowed_actions.includes('QUEUE_NEXT'), 'QUEUE_NEXT allowed');
  assert(r.allowed_actions.includes('ADVANCE_WORKFLOW'), 'ADVANCE_WORKFLOW allowed');
}

// OFF mode: no actions allowed
reset();
routes.push({
  match: /SELECT value_multilang FROM system_settings/,
  respond: (params: any[]) => {
    if (params[0] === 'autonomy_mode') return [{ value_multilang: JSON.stringify('OFF') }];
    if (params[0] === 'autonomy_enabled') return [{ value_multilang: JSON.stringify('false') }];
    return [];
  },
});
{
  const r = await getStatus();
  assertEq(r.enabled, false, 'OFF: not enabled');
  assertEq(r.mode, 'OFF', 'OFF mode');
  assertEq(r.allowed_actions, [], 'OFF: no actions');
}

// Unknown mode → normalized to OFF
reset();
routes.push({
  match: /SELECT value_multilang FROM system_settings/,
  respond: (params: any[]) => {
    if (params[0] === 'autonomy_mode') return [{ value_multilang: JSON.stringify('UNKNOWN') }];
    return [{ value_multilang: JSON.stringify('true') }];
  },
});
{
  const r = await getStatus();
  assertEq(r.mode, 'OFF', 'unknown mode → OFF');
}

// RELEASE_ONLY: only RELEASE allowed
reset();
routes.push({
  match: /SELECT value_multilang FROM system_settings/,
  respond: (params: any[]) => {
    if (params[0] === 'autonomy_mode') return [{ value_multilang: JSON.stringify('RELEASE_ONLY') }];
    return [{ value_multilang: JSON.stringify('true') }];
  },
});
{
  const r = await getStatus();
  assertEq(r.allowed_actions, ['RELEASE'], 'RELEASE_ONLY: only RELEASE');
}

// Default (no row) → OFF / false
reset();
routes.push({ match: /SELECT value_multilang FROM system_settings/, rows: [] });
{
  const r = await getStatus();
  assertEq(r.mode, 'OFF', 'no row → OFF');
  assertEq(r.enabled, false, 'no row → not enabled');
}

// ============================================================================
// setMode
// ============================================================================
console.log('\n── setMode ───────────────────────────────────────────────');

// Invalid mode
{
  let caught: any = null;
  try { await setMode('BOGUS'); }
  catch (e) { caught = e; }
  assert(caught && /Invalid autonomy mode/.test(caught.message), 'invalid mode throws');
}

// OFF → disables
reset();
routes.push({ match: /INSERT INTO system_settings/, rows: {} });
routes.push({ match: /SELECT value_multilang/, rows: [] });
{
  await setMode('OFF');
  // We expect 2 INSERTs (enabled, mode) + getStatus calls (2 selects)
  const inserts = queryLog.filter(q => /INSERT INTO system_settings/.test(q.sql));
  assertEq(inserts.length, 2, '2 upserts');
  // First upsert = enabled 'false'
  assertEq(inserts[0].params[0], 'autonomy_enabled', 'enabled key');
  // JSON.stringify('false') → '"false"'
  assertEq(inserts[0].params[1], '"false"', 'enabled false JSON');
  // Second upsert = mode 'OFF'
  assertEq(inserts[1].params[0], 'autonomy_mode', 'mode key');
  assertEq(inserts[1].params[1], '"OFF"', 'mode OFF JSON');
}

// SAFE_ADVANCE → enables
reset();
routes.push({ match: /INSERT INTO system_settings/, rows: {} });
routes.push({ match: /SELECT value_multilang/, rows: [] });
{
  await setMode('SAFE_ADVANCE');
  const inserts = queryLog.filter(q => /INSERT INTO system_settings/.test(q.sql));
  assertEq(inserts[0].params[1], '"true"', 'enabled true JSON');
  assertEq(inserts[1].params[1], '"SAFE_ADVANCE"', 'mode SAFE_ADVANCE JSON');
}

// ============================================================================
// pauseWorkflow / resumeWorkflow
// ============================================================================
console.log('\n── pauseWorkflow / resumeWorkflow ────────────────────────');

// pauseWorkflow success
reset();
routes.push({ match: /UPDATE prompt_workflows[\s\S]*autonomy_paused = 1/, rows: { affectedRows: 1 } });
{
  const r = await pauseWorkflow(42, 'testing');
  assertEq(r.success, true, 'success');
  assertEq(r.workflow_id, 42, 'workflow_id');
  assertEq(r.paused, true, 'paused');
  assertEq(queryLog[0].params, ['testing', 42], 'params');
}

// Default reason when not provided
reset();
routes.push({ match: /UPDATE prompt_workflows[\s\S]*autonomy_paused = 1/, rows: { affectedRows: 1 } });
{
  await pauseWorkflow(42);
  assertEq(queryLog[0].params[0], 'Paused by operator', 'default reason');
}

// pauseWorkflow not found
reset();
routes.push({ match: /UPDATE prompt_workflows[\s\S]*autonomy_paused = 1/, rows: { affectedRows: 0 } });
{
  let caught: any = null;
  try { await pauseWorkflow(999); }
  catch (e) { caught = e; }
  assert(caught && /not found/.test(caught.message), '0 affected → throws');
}

// resumeWorkflow success
reset();
routes.push({ match: /UPDATE prompt_workflows[\s\S]*autonomy_paused = 0/, rows: { affectedRows: 1 } });
{
  const r = await resumeWorkflow(42);
  assertEq(r, { success: true, workflow_id: 42, paused: false }, 'resumed');
}

// resumeWorkflow not found
reset();
routes.push({ match: /UPDATE prompt_workflows[\s\S]*autonomy_paused = 0/, rows: { affectedRows: 0 } });
{
  let caught: any = null;
  try { await resumeWorkflow(999); }
  catch (e) { caught = e; }
  assert(caught && /not found/.test(caught.message), 'resume 0 affected → throws');
}

// ============================================================================
// setManualOnly
// ============================================================================
console.log('\n── setManualOnly ─────────────────────────────────────────');

// workflow
reset();
routes.push({ match: /UPDATE prompt_workflows SET manual_only/, rows: { affectedRows: 1 } });
{
  const r = await setManualOnly('workflow', 42, true);
  assertEq(r.success, true, 'workflow success');
  assertEq(r.target_type, 'workflow', 'target_type');
  assertEq(r.target_id, 42, 'target_id');
  assertEq(r.manual_only, true, 'manual_only');
  assertEq(queryLog[0].params, [1, 42], 'flag=1, id');
}

// step
reset();
routes.push({ match: /UPDATE prompt_workflow_steps/, rows: { affectedRows: 1 } });
{
  await setManualOnly('step', 10, false);
  assert(/prompt_workflow_steps/.test(queryLog[0].sql), 'steps table');
  assertEq(queryLog[0].params, [0, 10], 'flag=0, id');
}

// prompt
reset();
routes.push({ match: /UPDATE om_prompt_registry/, rows: { affectedRows: 1 } });
{
  await setManualOnly('prompt', 7, true);
  assert(/om_prompt_registry/.test(queryLog[0].sql), 'registry table');
}

// Invalid target_type
{
  let caught: any = null;
  try { await setManualOnly('bogus', 1, true); }
  catch (e) { caught = e; }
  assert(caught && /Invalid target_type/.test(caught.message), 'invalid type throws');
}

// Not found
reset();
routes.push({ match: /UPDATE prompt_workflows SET manual_only/, rows: { affectedRows: 0 } });
{
  let caught: any = null;
  try { await setManualOnly('workflow', 999, true); }
  catch (e) { caught = e; }
  assert(caught && /not found/.test(caught.message), 'missing target throws');
}

// ============================================================================
// getLogs
// ============================================================================
console.log('\n── getLogs ───────────────────────────────────────────────');

reset();
routes.push({
  match: /FROM system_logs[\s\S]*autonomous_advance/,
  rows: [
    { timestamp: 't1', level: 'INFO', message: 'm1', meta: '{"k":1}' },
    { timestamp: 't2', level: 'WARN', message: 'm2', meta: null },
    { timestamp: 't3', level: 'ERROR', message: 'm3', meta: '{invalid' },
  ],
});
{
  const r = await getLogs();
  assertEq(queryLog[0].params, [50], 'default limit 50');
  assertEq(r.length, 3, '3 logs');
  assertEq(r[0].meta, { k: 1 }, 'meta parsed');
  assertEq(r[1].meta, null, 'null meta');
  assertEq(r[2].meta, null, 'malformed meta → null');
}

// Custom limit
reset();
routes.push({ match: /FROM system_logs/, rows: [] });
{
  await getLogs(100);
  assertEq(queryLog[0].params, [100], 'custom limit');
}

// ============================================================================
// getPausedWorkflows
// ============================================================================
console.log('\n── getPausedWorkflows ────────────────────────────────────');

reset();
routes.push({
  match: /FROM prompt_workflows[\s\S]*autonomy_paused = 1/,
  rows: [
    { id: 1, name: 'wf1', component: 'backend', status: 'active',
      autonomy_pause_reason: 'test', autonomy_paused_at: '2026-04-10' },
  ],
});
{
  const r = await getPausedWorkflows();
  assertEq(r.length, 1, '1 paused');
  assertEq(r[0].name, 'wf1', 'name passed through');
}

// ============================================================================
// hasCriticalLearningConflict
// ============================================================================
console.log('\n── hasCriticalLearningConflict ───────────────────────────');

// No component → false (no query)
reset();
{
  const r = await hasCriticalLearningConflict(null);
  assertEq(r, false, 'null component → false');
  assertEq(queryLog.length, 0, 'no query');
}

// count > 0 → true
reset();
routes.push({ match: /workflow_learning_registry/, rows: [{ cnt: 3 }] });
{
  const r = await hasCriticalLearningConflict('backend');
  assertEq(r, true, 'count 3 → true');
  assertEq(queryLog[0].params, ['%"backend"%'], 'LIKE param');
}

// count = 0 → false
reset();
routes.push({ match: /workflow_learning_registry/, rows: [{ cnt: 0 }] });
{
  const r = await hasCriticalLearningConflict('frontend');
  assertEq(r, false, 'count 0 → false');
}

// ============================================================================
// getCorrectionCount
// ============================================================================
console.log('\n── getCorrectionCount ────────────────────────────────────');

// No promptId → 0
reset();
{
  const r = await getCorrectionCount(null);
  assertEq(r, 0, 'null → 0');
  assertEq(queryLog.length, 0, 'no query');
}

// Count > 0
reset();
routes.push({
  match: /FROM om_prompt_registry[\s\S]*result_type = 'correction'/,
  rows: [{ cnt: 3 }],
});
{
  const r = await getCorrectionCount('prompt-1');
  assertEq(r, 3, 'count 3');
  assertEq(queryLog[0].params, ['prompt-1'], 'id param');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main()

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
