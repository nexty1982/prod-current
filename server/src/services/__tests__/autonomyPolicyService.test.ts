#!/usr/bin/env npx tsx
/**
 * Unit tests for services/autonomyPolicyService.js (OMD-1083)
 *
 * Covers:
 *   - Constants: AUTONOMY_MODE, MODE_ORDER, ACTION_TYPE, ACTION_MODE_REQUIREMENTS
 *   - modePermitsAction: exhaustive mode × action matrix + unknown values
 *   - evaluateSafetyGates: each of 13 gates individually + happy path
 *   - checkPauseConditions: each of 8 pause conditions
 *   - getStatus: defaults, filters unknown modes, computes allowed_actions
 *   - setMode: validates mode, writes enabled+mode, returns status
 *   - pauseWorkflow / resumeWorkflow: affected rows 0 throws, success path
 *   - setManualOnly: invalid target_type throws, success path each target
 *   - logAutonomousAction: level-to-logLevel mapping, message formatting,
 *                         swallows DB errors
 *   - getLogs: default limit, parses meta JSON, null meta
 *   - getPausedWorkflows: returns rows
 *   - hasCriticalLearningConflict: null component, count > 0, count == 0
 *   - getCorrectionCount: null prompt, numeric count
 *
 * Stubs config/db via require.cache with SQL-routed fake pool.
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

// ── stubModule helper ───────────────────────────────────────────────
const pathMod = require('path');
function stubModule(relFromSrc: string, exports: any) {
  const absWithoutExt = pathMod.resolve(__dirname, '..', '..', relFromSrc);
  const resolved = require.resolve(absWithoutExt);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  } as any;
}

// ── Fake DB pool ────────────────────────────────────────────────────
type Route = { match: RegExp; respond: (params: any[], sql: string) => any };
const queryLog: { sql: string; params: any[] }[] = [];
let routes: Route[] = [];
let queryThrowsNext: Error | null = null;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (queryThrowsNext) {
      const e = queryThrowsNext;
      queryThrowsNext = null;
      throw e;
    }
    for (const r of routes) {
      if (r.match.test(sql)) return r.respond(params, sql);
    }
    if (/^\s*SELECT/i.test(sql)) return [[], []];
    if (/^\s*UPDATE/i.test(sql)) return [{ affectedRows: 1 }, []];
    if (/^\s*INSERT/i.test(sql)) return [{ insertId: 1, affectedRows: 1 }, []];
    return [[], []];
  },
};

stubModule('config/db', { getAppPool: () => fakePool });

function resetDb() {
  queryLog.length = 0;
  routes = [];
  queryThrowsNext = null;
}

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

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
  logAutonomousAction,
  getLogs,
  getPausedWorkflows,
  hasCriticalLearningConflict,
  getCorrectionCount,
} = require('../autonomyPolicyService');

// ── Helper: build passing context for all 13 safety gates ─────────
function passingContext(overrides: any = {}) {
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
    step: {
      manual_only: false,
    },
    hasCriticalLearningConflict: false,
    agentResultFinal: true,
    ...overrides,
  };
}

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── constants ─────────────────────────────────────────────');

assertEq(AUTONOMY_MODE.OFF, 'OFF', 'OFF');
assertEq(AUTONOMY_MODE.RELEASE_ONLY, 'RELEASE_ONLY', 'RELEASE_ONLY');
assertEq(AUTONOMY_MODE.SAFE_ADVANCE, 'SAFE_ADVANCE', 'SAFE_ADVANCE');
assertEq(AUTONOMY_MODE.SUPERVISED_FLOW, 'SUPERVISED_FLOW', 'SUPERVISED_FLOW');
assertEq(MODE_ORDER, ['OFF', 'RELEASE_ONLY', 'SAFE_ADVANCE', 'SUPERVISED_FLOW'], 'MODE_ORDER');
assertEq(ACTION_TYPE.RELEASE, 'RELEASE', 'RELEASE');
assertEq(ACTION_MODE_REQUIREMENTS.RELEASE, 'RELEASE_ONLY', 'RELEASE requires RELEASE_ONLY');
assertEq(ACTION_MODE_REQUIREMENTS.TRIGGER_EVAL, 'SAFE_ADVANCE', 'TRIGGER_EVAL requires SAFE_ADVANCE');
assertEq(ACTION_MODE_REQUIREMENTS.QUEUE_NEXT, 'SAFE_ADVANCE', 'QUEUE_NEXT requires SAFE_ADVANCE');
assertEq(ACTION_MODE_REQUIREMENTS.ADVANCE_WORKFLOW, 'SAFE_ADVANCE', 'ADVANCE_WORKFLOW requires SAFE_ADVANCE');

// ============================================================================
// modePermitsAction
// ============================================================================
console.log('\n── modePermitsAction ─────────────────────────────────────');

// OFF mode permits nothing
assertEq(modePermitsAction('OFF', 'RELEASE'), false, 'OFF blocks RELEASE');
assertEq(modePermitsAction('OFF', 'TRIGGER_EVAL'), false, 'OFF blocks TRIGGER_EVAL');
assertEq(modePermitsAction('OFF', 'QUEUE_NEXT'), false, 'OFF blocks QUEUE_NEXT');
assertEq(modePermitsAction('OFF', 'ADVANCE_WORKFLOW'), false, 'OFF blocks ADVANCE_WORKFLOW');

// RELEASE_ONLY permits only RELEASE
assertEq(modePermitsAction('RELEASE_ONLY', 'RELEASE'), true, 'RELEASE_ONLY allows RELEASE');
assertEq(modePermitsAction('RELEASE_ONLY', 'TRIGGER_EVAL'), false, 'RELEASE_ONLY blocks TRIGGER_EVAL');
assertEq(modePermitsAction('RELEASE_ONLY', 'QUEUE_NEXT'), false, 'RELEASE_ONLY blocks QUEUE_NEXT');

// SAFE_ADVANCE permits all
assertEq(modePermitsAction('SAFE_ADVANCE', 'RELEASE'), true, 'SAFE_ADVANCE allows RELEASE');
assertEq(modePermitsAction('SAFE_ADVANCE', 'TRIGGER_EVAL'), true, 'SAFE_ADVANCE allows TRIGGER_EVAL');
assertEq(modePermitsAction('SAFE_ADVANCE', 'QUEUE_NEXT'), true, 'SAFE_ADVANCE allows QUEUE_NEXT');
assertEq(modePermitsAction('SAFE_ADVANCE', 'ADVANCE_WORKFLOW'), true, 'SAFE_ADVANCE allows ADVANCE_WORKFLOW');

// SUPERVISED_FLOW permits all
assertEq(modePermitsAction('SUPERVISED_FLOW', 'RELEASE'), true, 'SUPERVISED_FLOW allows RELEASE');
assertEq(modePermitsAction('SUPERVISED_FLOW', 'ADVANCE_WORKFLOW'), true, 'SUPERVISED_FLOW allows ADVANCE_WORKFLOW');

// Unknown mode or action → false
assertEq(modePermitsAction('BOGUS', 'RELEASE'), false, 'unknown mode blocks');
assertEq(modePermitsAction('SAFE_ADVANCE', 'BOGUS_ACTION'), false, 'unknown action blocks');

// ============================================================================
// evaluateSafetyGates — happy path
// ============================================================================
console.log('\n── evaluateSafetyGates: happy path ───────────────────────');

{
  const r = evaluateSafetyGates(passingContext());
  assertEq(r.safe, true, 'safe=true');
  assertEq(r.failures.length, 0, 'no failures');
  assertEq(r.passed.length, 13, 'all 13 passed');
  assertEq(r.passed_count, 13, 'passed_count');
  assertEq(r.total_gates, 13, 'total_gates');
}

// ============================================================================
// evaluateSafetyGates — each gate individually
// ============================================================================
console.log('\n── evaluateSafetyGates: each gate ────────────────────────');

// G1: confidence not high
{
  const r = evaluateSafetyGates(passingContext({ prompt: { ...passingContext().prompt, confidence_level: 'medium' } }));
  assertEq(r.safe, false, 'G1 blocks');
  assert(r.failures.some((f: any) => f.id === 'G1'), 'G1 in failures');
  assert(r.failures.find((f: any) => f.id === 'G1').reason.includes('medium'), 'G1 reason mentions medium');
}

// G2: evaluator not pass
{
  const r = evaluateSafetyGates(passingContext({ prompt: { ...passingContext().prompt, evaluator_status: 'fail' } }));
  assert(r.failures.some((f: any) => f.id === 'G2'), 'G2 blocks on fail');
}

// G3: completion not complete
{
  const r = evaluateSafetyGates(passingContext({ prompt: { ...passingContext().prompt, completion_status: 'partial' } }));
  assert(r.failures.some((f: any) => f.id === 'G3'), 'G3 blocks partial');
}

// G4: degradation flag
{
  const r = evaluateSafetyGates(passingContext({ prompt: { ...passingContext().prompt, degradation_flag: true } }));
  assert(r.failures.some((f: any) => f.id === 'G4'), 'G4 blocks on degradation');
}

// G5: escalation required
{
  const r = evaluateSafetyGates(passingContext({ prompt: { ...passingContext().prompt, escalation_required: true } }));
  assert(r.failures.some((f: any) => f.id === 'G5'), 'G5 blocks on escalation');
}

// G6: queue_status blocked/pending
{
  const r = evaluateSafetyGates(passingContext({ prompt: { ...passingContext().prompt, queue_status: 'blocked' } }));
  assert(r.failures.some((f: any) => f.id === 'G6'), 'G6 blocks blocked');
  const r2 = evaluateSafetyGates(passingContext({ prompt: { ...passingContext().prompt, queue_status: 'pending' } }));
  assert(r2.failures.some((f: any) => f.id === 'G6'), 'G6 blocks pending');
}

// G7: prompt manual_only
{
  const r = evaluateSafetyGates(passingContext({ prompt: { ...passingContext().prompt, manual_only: true } }));
  assert(r.failures.some((f: any) => f.id === 'G7'), 'G7 blocks prompt manual_only');
}

// G8: step manual_only
{
  const r = evaluateSafetyGates(passingContext({ step: { manual_only: true } }));
  assert(r.failures.some((f: any) => f.id === 'G8'), 'G8 blocks step manual_only');
}

// G8: missing step → passes
{
  const r = evaluateSafetyGates(passingContext({ step: null }));
  assert(!r.failures.some((f: any) => f.id === 'G8'), 'G8 passes when no step');
}

// G9: workflow manual_only
{
  const r = evaluateSafetyGates(passingContext({ workflow: { manual_only: true, autonomy_paused: false } }));
  assert(r.failures.some((f: any) => f.id === 'G9'), 'G9 blocks workflow manual_only');
}

// G10: workflow autonomy paused
{
  const r = evaluateSafetyGates(passingContext({ workflow: { manual_only: false, autonomy_paused: true, autonomy_pause_reason: 'Testing' } }));
  assert(r.failures.some((f: any) => f.id === 'G10'), 'G10 blocks paused');
  assert(r.failures.find((f: any) => f.id === 'G10').reason.includes('Testing'), 'G10 reason mentions pause reason');
}

// G11: critical learning conflict
{
  const r = evaluateSafetyGates(passingContext({ hasCriticalLearningConflict: true }));
  assert(r.failures.some((f: any) => f.id === 'G11'), 'G11 blocks on conflict');
}

// G12: agent result not final
{
  const r = evaluateSafetyGates(passingContext({ agentResultFinal: false }));
  assert(r.failures.some((f: any) => f.id === 'G12'), 'G12 blocks non-final');
}

// G13: release_mode manual
{
  const r = evaluateSafetyGates(passingContext({ prompt: { ...passingContext().prompt, release_mode: 'manual' } }));
  assert(r.failures.some((f: any) => f.id === 'G13'), 'G13 blocks manual release');
}

// Multiple failures at once
{
  const r = evaluateSafetyGates(passingContext({
    prompt: {
      confidence_level: 'low',
      evaluator_status: 'fail',
      completion_status: 'partial',
      degradation_flag: true,
      escalation_required: true,
      queue_status: 'blocked',
      manual_only: true,
      release_mode: 'manual',
    },
    workflow: { manual_only: true, autonomy_paused: true },
    step: { manual_only: true },
    hasCriticalLearningConflict: true,
    agentResultFinal: false,
  }));
  assertEq(r.safe, false, 'multi-fail → unsafe');
  assertEq(r.failures.length, 13, 'all 13 gates fail');
  assertEq(r.passed.length, 0, 'none passed');
}

// SAFETY_GATES export count
assertEq(SAFETY_GATES.length, 13, '13 gates exported');

// ============================================================================
// checkPauseConditions
// ============================================================================
console.log('\n── checkPauseConditions ──────────────────────────────────');

// No pause
{
  const r = checkPauseConditions({
    recommendation: { action: 'PROCEED' },
    prompt: { degradation_flag: false, confidence_level: 'high' },
    step: { manual_only: false },
    comparisonInconclusive: false,
    correctionCount: 0,
  });
  assertEq(r.shouldPause, false, 'no pause');
  assertEq(r.reasons.length, 0, 'no reasons');
}

// P1: FIX_REQUIRED
{
  const r = checkPauseConditions({ recommendation: { action: 'FIX_REQUIRED' } });
  assertEq(r.shouldPause, true, 'P1 pauses');
  assert(r.reasons.some((x: any) => x.id === 'P1'), 'P1 in reasons');
}

// P2: UNBLOCK_REQUIRED
{
  const r = checkPauseConditions({ recommendation: { action: 'UNBLOCK_REQUIRED' } });
  assert(r.reasons.some((x: any) => x.id === 'P2'), 'P2');
}

// P3: REVIEW_REQUIRED
{
  const r = checkPauseConditions({ recommendation: { action: 'REVIEW_REQUIRED' } });
  assert(r.reasons.some((x: any) => x.id === 'P3'), 'P3');
}

// P4: degradation
{
  const r = checkPauseConditions({ prompt: { degradation_flag: true } });
  assert(r.reasons.some((x: any) => x.id === 'P4'), 'P4');
}

// P5: low confidence
{
  const r = checkPauseConditions({ prompt: { confidence_level: 'low' } });
  assert(r.reasons.some((x: any) => x.id === 'P5'), 'P5 on low');
  const r2 = checkPauseConditions({ prompt: { confidence_level: 'unknown' } });
  assert(r2.reasons.some((x: any) => x.id === 'P5'), 'P5 on unknown');
}

// P6: comparison inconclusive
{
  const r = checkPauseConditions({ comparisonInconclusive: true });
  assert(r.reasons.some((x: any) => x.id === 'P6'), 'P6');
}

// P7: repeated corrections
{
  const r = checkPauseConditions({ correctionCount: 2 });
  assert(r.reasons.some((x: any) => x.id === 'P7'), 'P7 on 2');
  const r2 = checkPauseConditions({ correctionCount: 5 });
  assert(r2.reasons.some((x: any) => x.id === 'P7'), 'P7 on 5');
  const r3 = checkPauseConditions({ correctionCount: 1 });
  assert(!r3.reasons.some((x: any) => x.id === 'P7'), 'P7 not triggered at 1');
}

// P8: step manual_only
{
  const r = checkPauseConditions({ step: { manual_only: true } });
  assert(r.reasons.some((x: any) => x.id === 'P8'), 'P8');
}

assertEq(PAUSE_CONDITIONS.length, 8, '8 pause conditions');

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

// Defaults when settings missing
resetDb();
{
  const r = await getStatus();
  assertEq(r.enabled, false, 'disabled by default');
  assertEq(r.mode, 'OFF', 'OFF by default');
  assertEq(r.allowed_actions, [], 'no allowed actions');
}

// Unknown mode in DB → falls back to OFF
resetDb();
routes.push({
  match: /SELECT value_multilang FROM system_settings/,
  respond: (params) => {
    if (params[0] === 'autonomy_mode') return [[{ value_multilang: '"BOGUS"' }], []];
    if (params[0] === 'autonomy_enabled') return [[{ value_multilang: '"true"' }], []];
    return [[], []];
  },
});
{
  const r = await getStatus();
  assertEq(r.mode, 'OFF', 'unknown mode → OFF');
}

// SAFE_ADVANCE mode → 4 allowed actions
resetDb();
routes.push({
  match: /SELECT value_multilang FROM system_settings/,
  respond: (params) => {
    if (params[0] === 'autonomy_mode') return [[{ value_multilang: '"SAFE_ADVANCE"' }], []];
    if (params[0] === 'autonomy_enabled') return [[{ value_multilang: '"true"' }], []];
    return [[], []];
  },
});
{
  const r = await getStatus();
  assertEq(r.enabled, true, 'enabled');
  assertEq(r.mode, 'SAFE_ADVANCE', 'SAFE_ADVANCE');
  assertEq(r.allowed_actions.sort(), ['ADVANCE_WORKFLOW', 'QUEUE_NEXT', 'RELEASE', 'TRIGGER_EVAL'], 'all 4 actions allowed');
}

// RELEASE_ONLY mode → only RELEASE allowed
resetDb();
routes.push({
  match: /SELECT value_multilang FROM system_settings/,
  respond: (params) => {
    if (params[0] === 'autonomy_mode') return [[{ value_multilang: '"RELEASE_ONLY"' }], []];
    return [[], []];
  },
});
{
  const r = await getStatus();
  assertEq(r.allowed_actions, ['RELEASE'], 'only RELEASE');
}

// enabled=true as boolean
resetDb();
routes.push({
  match: /SELECT value_multilang FROM system_settings/,
  respond: (params) => {
    if (params[0] === 'autonomy_enabled') return [[{ value_multilang: 'true' }], []];
    return [[], []];
  },
});
{
  const r = await getStatus();
  assertEq(r.enabled, true, 'boolean-ish true');
}

// ============================================================================
// setMode
// ============================================================================
console.log('\n── setMode ───────────────────────────────────────────────');

// Invalid mode
{
  let caught: any = null;
  try { await setMode('BOGUS'); } catch (e) { caught = e; }
  assert(caught !== null, 'invalid mode throws');
  assert(caught.message.includes('Invalid autonomy mode'), 'error message');
}

// Valid mode: SAFE_ADVANCE
resetDb();
routes.push({
  match: /SELECT value_multilang FROM system_settings/,
  respond: (params) => {
    if (params[0] === 'autonomy_mode') return [[{ value_multilang: '"SAFE_ADVANCE"' }], []];
    if (params[0] === 'autonomy_enabled') return [[{ value_multilang: '"true"' }], []];
    return [[], []];
  },
});
{
  const r = await setMode('SAFE_ADVANCE');
  assertEq(r.mode, 'SAFE_ADVANCE', 'set SAFE_ADVANCE');
  // Verify UPSERTs called for enabled + mode
  const upserts = queryLog.filter(q => /INSERT INTO system_settings/.test(q.sql));
  assertEq(upserts.length, 2, '2 upserts (enabled + mode)');
  assertEq(upserts[0].params[0], 'autonomy_enabled', 'first: enabled');
  assertEq(upserts[0].params[1], '"true"', 'enabled=true');
  assertEq(upserts[1].params[0], 'autonomy_mode', 'second: mode');
}

// OFF → enabled=false
resetDb();
routes.push({
  match: /SELECT value_multilang FROM system_settings/,
  respond: () => [[], []],
});
{
  await setMode('OFF');
  const upserts = queryLog.filter(q => /INSERT INTO system_settings/.test(q.sql));
  assertEq(upserts[0].params[1], '"false"', 'OFF → enabled=false');
}

// ============================================================================
// pauseWorkflow / resumeWorkflow
// ============================================================================
console.log('\n── pauseWorkflow / resumeWorkflow ────────────────────────');

// Pause success
resetDb();
{
  const r = await pauseWorkflow(42, 'Testing');
  assertEq(r.success, true, 'success');
  assertEq(r.workflow_id, 42, 'id');
  assertEq(r.paused, true, 'paused');
  const update = queryLog.find(q => /UPDATE prompt_workflows[\s\S]*autonomy_paused = 1/.test(q.sql));
  assert(update !== undefined, 'UPDATE issued');
  assertEq(update!.params[0], 'Testing', 'reason param');
  assertEq(update!.params[1], 42, 'id param');
}

// Default reason
resetDb();
{
  await pauseWorkflow(42);
  const update = queryLog.find(q => /UPDATE prompt_workflows[\s\S]*autonomy_paused = 1/.test(q.sql));
  assertEq(update!.params[0], 'Paused by operator', 'default reason');
}

// Pause not found
resetDb();
routes.push({
  match: /UPDATE prompt_workflows[\s\S]*autonomy_paused = 1/,
  respond: () => [{ affectedRows: 0 }, []],
});
{
  let caught: any = null;
  try { await pauseWorkflow(999); } catch (e) { caught = e; }
  assert(caught !== null, 'not found throws');
}

// Resume success
resetDb();
{
  const r = await resumeWorkflow(42);
  assertEq(r.paused, false, 'resumed');
  const update = queryLog.find(q => /autonomy_paused = 0/.test(q.sql));
  assert(update !== undefined, 'resume UPDATE');
}

// Resume not found
resetDb();
routes.push({
  match: /autonomy_paused = 0/,
  respond: () => [{ affectedRows: 0 }, []],
});
{
  let caught: any = null;
  try { await resumeWorkflow(999); } catch (e) { caught = e; }
  assert(caught !== null, 'resume not found throws');
}

// ============================================================================
// setManualOnly
// ============================================================================
console.log('\n── setManualOnly ─────────────────────────────────────────');

// Invalid target_type
{
  let caught: any = null;
  try { await setManualOnly('bogus', 1, true); } catch (e) { caught = e; }
  assert(caught !== null, 'invalid target_type throws');
  assert(caught.message.includes('Invalid target_type'), 'error message');
}

// workflow success
resetDb();
{
  const r = await setManualOnly('workflow', 5, true);
  assertEq(r.success, true, 'workflow success');
  assertEq(r.manual_only, true, 'manual_only true');
  const update = queryLog[0];
  assert(update.sql.includes('prompt_workflows'), 'targets prompt_workflows');
  assertEq(update.params[0], 1, 'flag=1');
  assertEq(update.params[1], 5, 'id param');
}

// step
resetDb();
{
  await setManualOnly('step', 6, false);
  assert(queryLog[0].sql.includes('prompt_workflow_steps'), 'targets prompt_workflow_steps');
  assertEq(queryLog[0].params[0], 0, 'flag=0');
}

// prompt
resetDb();
{
  await setManualOnly('prompt', 7, true);
  assert(queryLog[0].sql.includes('om_prompt_registry'), 'targets om_prompt_registry');
}

// Not found
resetDb();
routes.push({
  match: /UPDATE prompt_workflows/,
  respond: () => [{ affectedRows: 0 }, []],
});
{
  let caught: any = null;
  try { await setManualOnly('workflow', 999, true); } catch (e) { caught = e; }
  assert(caught !== null, 'not found throws');
  assert(caught.message.includes('workflow not found'), 'error mentions target');
}

// ============================================================================
// logAutonomousAction
// ============================================================================
console.log('\n── logAutonomousAction ───────────────────────────────────');

// SUCCESS → INFO log level
resetDb();
{
  await logAutonomousAction('RELEASE', { target_id: 1, target_title: 'Test', mode: 'SAFE_ADVANCE' }, 'SUCCESS');
  const log = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql));
  assert(log !== undefined, 'log inserted');
  assertEq(log!.params[0], 'INFO', 'INFO level');
  assert(log!.params[1].includes('RELEASE'), 'message includes action');
  assert(log!.params[1].includes('Test'), 'message includes title');
}

// PAUSED → WARN
resetDb();
{
  await logAutonomousAction('RELEASE', { target_id: 2, pause_reason: 'cooldown', mode: 'OFF' }, 'PAUSED');
  const log = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql));
  assertEq(log!.params[0], 'WARN', 'PAUSED → WARN');
  assert(log!.params[1].includes('PAUSED'), 'message has PAUSED');
}

// BLOCKED → WARN
resetDb();
{
  await logAutonomousAction('RELEASE', { block_reason: 'G1 failed' }, 'BLOCKED');
  const log = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql));
  assertEq(log!.params[0], 'WARN', 'BLOCKED → WARN');
  assert(log!.params[1].includes('G1 failed'), 'message has reason');
}

// ERROR → ERROR
resetDb();
{
  await logAutonomousAction('RELEASE', { error: 'oops' }, 'ERROR');
  const log = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql));
  assertEq(log!.params[0], 'ERROR', 'ERROR level');
}

// Default level = SUCCESS
resetDb();
{
  await logAutonomousAction('RELEASE', { target_id: 1, mode: 'OFF' });
  const log = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql));
  assertEq(log!.params[0], 'INFO', 'default SUCCESS → INFO');
}

// DB error swallowed
resetDb();
queryThrowsNext = new Error('db down');
quiet();
{
  // Should not throw
  let threw = false;
  try { await logAutonomousAction('RELEASE', {}, 'SUCCESS'); }
  catch { threw = true; }
  loud();
  assertEq(threw, false, 'error swallowed');
}

// ============================================================================
// getLogs
// ============================================================================
console.log('\n── getLogs ───────────────────────────────────────────────');

// Default limit 50
resetDb();
routes.push({
  match: /FROM system_logs/,
  respond: () => [[
    { timestamp: '2026-04-10 12:00:00', level: 'INFO', message: 'ok', meta: '{"x":1}' },
    { timestamp: '2026-04-10 11:00:00', level: 'ERROR', message: 'bad', meta: null },
  ], []],
});
{
  const r = await getLogs();
  assertEq(r.length, 2, '2 rows');
  assertEq(r[0].meta, { x: 1 }, 'meta JSON parsed');
  assertEq(r[1].meta, null, 'null meta preserved');
  const query = queryLog.find(q => /FROM system_logs/.test(q.sql));
  assertEq(query!.params[0], 50, 'default limit 50');
}

// Custom limit + bad JSON
resetDb();
routes.push({
  match: /FROM system_logs/,
  respond: () => [[
    { timestamp: 't', level: 'INFO', message: 'm', meta: 'not json' },
  ], []],
});
{
  const r = await getLogs(10);
  assertEq(r[0].meta, null, 'bad JSON → null');
  const query = queryLog.find(q => /FROM system_logs/.test(q.sql));
  assertEq(query!.params[0], 10, 'custom limit');
}

// ============================================================================
// getPausedWorkflows
// ============================================================================
console.log('\n── getPausedWorkflows ────────────────────────────────────');

resetDb();
routes.push({
  match: /autonomy_paused = 1/,
  respond: () => [[
    { id: 1, name: 'wf1', status: 'active', autonomy_pause_reason: 'test' },
  ], []],
});
{
  const r = await getPausedWorkflows();
  assertEq(r.length, 1, '1 row');
  assertEq(r[0].id, 1, 'id preserved');
}

// ============================================================================
// hasCriticalLearningConflict
// ============================================================================
console.log('\n── hasCriticalLearningConflict ───────────────────────────');

// Null component → false
{
  const r = await hasCriticalLearningConflict(null);
  assertEq(r, false, 'null → false');
}

// Count > 0 → true
resetDb();
routes.push({
  match: /workflow_learning_registry/,
  respond: () => [[{ cnt: 3 }], []],
});
{
  const r = await hasCriticalLearningConflict('backend');
  assertEq(r, true, 'count > 0 → true');
  const q = queryLog.find(q => /workflow_learning_registry/.test(q.sql));
  assertEq(q!.params[0], '%"backend"%', 'LIKE pattern');
}

// Count 0 → false
resetDb();
routes.push({
  match: /workflow_learning_registry/,
  respond: () => [[{ cnt: 0 }], []],
});
{
  const r = await hasCriticalLearningConflict('backend');
  assertEq(r, false, 'count 0 → false');
}

// ============================================================================
// getCorrectionCount
// ============================================================================
console.log('\n── getCorrectionCount ────────────────────────────────────');

// Null prompt → 0
{
  const r = await getCorrectionCount(null);
  assertEq(r, 0, 'null → 0');
}

// Count returned
resetDb();
routes.push({
  match: /parent_prompt_id = \? AND result_type = 'correction'/,
  respond: () => [[{ cnt: 4 }], []],
});
{
  const r = await getCorrectionCount(123);
  assertEq(r, 4, 'numeric count');
  const q = queryLog.find(q => /result_type = 'correction'/.test(q.sql));
  assertEq(q!.params[0], 123, 'promptId param');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
