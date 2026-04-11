#!/usr/bin/env npx tsx
/**
 * Unit tests for services/autonomyPolicyService.js (OMD-987)
 *
 * Formal policy model for autonomous prompt workflow advancement.
 * Pure functions exported: modePermitsAction, evaluateSafetyGates, checkPauseConditions.
 * DB-touching settings/workflow control out of scope.
 *
 * Stubs `../config/db` with a no-op pool.
 *
 * Coverage:
 *   - AUTONOMY_MODE constants + MODE_ORDER
 *   - ACTION_TYPE constants + ACTION_MODE_REQUIREMENTS
 *   - modePermitsAction:
 *       · OFF permits nothing
 *       · RELEASE_ONLY permits only RELEASE
 *       · SAFE_ADVANCE permits RELEASE, TRIGGER_EVAL, QUEUE_NEXT, ADVANCE_WORKFLOW
 *       · SUPERVISED_FLOW permits everything SAFE_ADVANCE does
 *       · Unknown mode/action → false
 *   - evaluateSafetyGates: 13 gates
 *       · All-pass clean context → safe=true, 13 passed
 *       · Each gate individually can fail and is reported
 *       · failures contain id, name, reason
 *       · passed_count + total_gates
 *   - checkPauseConditions: 8 conditions
 *       · No triggers → shouldPause=false
 *       · Each condition individually triggers pause
 *       · reasons contain id, name, reason
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

// Stub ../config/db
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => ({ query: async () => [[], []] }) },
} as any;

const svc = require('../autonomyPolicyService');

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(svc.AUTONOMY_MODE.OFF, 'OFF', 'OFF');
assertEq(svc.AUTONOMY_MODE.RELEASE_ONLY, 'RELEASE_ONLY', 'RELEASE_ONLY');
assertEq(svc.AUTONOMY_MODE.SAFE_ADVANCE, 'SAFE_ADVANCE', 'SAFE_ADVANCE');
assertEq(svc.AUTONOMY_MODE.SUPERVISED_FLOW, 'SUPERVISED_FLOW', 'SUPERVISED_FLOW');

assertEq(svc.MODE_ORDER, ['OFF', 'RELEASE_ONLY', 'SAFE_ADVANCE', 'SUPERVISED_FLOW'],
  'MODE_ORDER strict ordering');

assertEq(svc.ACTION_TYPE.RELEASE, 'RELEASE', 'RELEASE action');
assertEq(svc.ACTION_TYPE.TRIGGER_EVAL, 'TRIGGER_EVAL', 'TRIGGER_EVAL action');
assertEq(svc.ACTION_TYPE.QUEUE_NEXT, 'QUEUE_NEXT', 'QUEUE_NEXT action');
assertEq(svc.ACTION_TYPE.ADVANCE_WORKFLOW, 'ADVANCE_WORKFLOW', 'ADVANCE_WORKFLOW action');

assertEq(svc.ACTION_MODE_REQUIREMENTS.RELEASE, 'RELEASE_ONLY', 'RELEASE needs RELEASE_ONLY');
assertEq(svc.ACTION_MODE_REQUIREMENTS.TRIGGER_EVAL, 'SAFE_ADVANCE', 'TRIGGER_EVAL needs SAFE_ADVANCE');
assertEq(svc.ACTION_MODE_REQUIREMENTS.QUEUE_NEXT, 'SAFE_ADVANCE', 'QUEUE_NEXT needs SAFE_ADVANCE');
assertEq(svc.ACTION_MODE_REQUIREMENTS.ADVANCE_WORKFLOW, 'SAFE_ADVANCE', 'ADVANCE_WORKFLOW needs SAFE_ADVANCE');

// ============================================================================
// modePermitsAction
// ============================================================================
console.log('\n── modePermitsAction ─────────────────────────────────────');

// OFF permits nothing
assertEq(svc.modePermitsAction('OFF', 'RELEASE'), false, 'OFF → RELEASE denied');
assertEq(svc.modePermitsAction('OFF', 'TRIGGER_EVAL'), false, 'OFF → TRIGGER_EVAL denied');
assertEq(svc.modePermitsAction('OFF', 'QUEUE_NEXT'), false, 'OFF → QUEUE_NEXT denied');
assertEq(svc.modePermitsAction('OFF', 'ADVANCE_WORKFLOW'), false, 'OFF → ADVANCE_WORKFLOW denied');

// RELEASE_ONLY permits only RELEASE
assertEq(svc.modePermitsAction('RELEASE_ONLY', 'RELEASE'), true, 'RELEASE_ONLY → RELEASE allowed');
assertEq(svc.modePermitsAction('RELEASE_ONLY', 'TRIGGER_EVAL'), false, 'RELEASE_ONLY → TRIGGER_EVAL denied');
assertEq(svc.modePermitsAction('RELEASE_ONLY', 'QUEUE_NEXT'), false, 'RELEASE_ONLY → QUEUE_NEXT denied');
assertEq(svc.modePermitsAction('RELEASE_ONLY', 'ADVANCE_WORKFLOW'), false, 'RELEASE_ONLY → ADVANCE_WORKFLOW denied');

// SAFE_ADVANCE permits all 4
assertEq(svc.modePermitsAction('SAFE_ADVANCE', 'RELEASE'), true, 'SAFE_ADVANCE → RELEASE');
assertEq(svc.modePermitsAction('SAFE_ADVANCE', 'TRIGGER_EVAL'), true, 'SAFE_ADVANCE → TRIGGER_EVAL');
assertEq(svc.modePermitsAction('SAFE_ADVANCE', 'QUEUE_NEXT'), true, 'SAFE_ADVANCE → QUEUE_NEXT');
assertEq(svc.modePermitsAction('SAFE_ADVANCE', 'ADVANCE_WORKFLOW'), true, 'SAFE_ADVANCE → ADVANCE_WORKFLOW');

// SUPERVISED_FLOW permits everything
assertEq(svc.modePermitsAction('SUPERVISED_FLOW', 'RELEASE'), true, 'SUPERVISED_FLOW → RELEASE');
assertEq(svc.modePermitsAction('SUPERVISED_FLOW', 'TRIGGER_EVAL'), true, 'SUPERVISED_FLOW → TRIGGER_EVAL');
assertEq(svc.modePermitsAction('SUPERVISED_FLOW', 'QUEUE_NEXT'), true, 'SUPERVISED_FLOW → QUEUE_NEXT');
assertEq(svc.modePermitsAction('SUPERVISED_FLOW', 'ADVANCE_WORKFLOW'), true, 'SUPERVISED_FLOW → ADVANCE_WORKFLOW');

// Unknown mode → false
assertEq(svc.modePermitsAction('UNKNOWN_MODE', 'RELEASE'), false, 'unknown mode denied');
// Unknown action → false
assertEq(svc.modePermitsAction('SUPERVISED_FLOW', 'UNKNOWN_ACTION'), false, 'unknown action denied');

// ============================================================================
// evaluateSafetyGates: all-pass baseline
// ============================================================================
console.log('\n── evaluateSafetyGates: all-pass baseline ────────────────');

// A context that passes every gate
function cleanContext() {
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
  const r = svc.evaluateSafetyGates(cleanContext());
  assertEq(r.safe, true, 'clean context is safe');
  assertEq(r.failures.length, 0, 'no failures');
  assertEq(r.passed_count, 13, '13 gates passed');
  assertEq(r.total_gates, 13, 'total_gates=13');
  assertEq(r.passed.length, 13, 'passed array has 13');
}

// ============================================================================
// evaluateSafetyGates: individual gate failures
// ============================================================================
console.log('\n── evaluateSafetyGates: individual failures ──────────────');

function withOverride(overrides: any) {
  const ctx = cleanContext();
  if (overrides.prompt) Object.assign(ctx.prompt, overrides.prompt);
  if (overrides.workflow) Object.assign(ctx.workflow, overrides.workflow);
  if (overrides.step) Object.assign(ctx.step, overrides.step);
  if ('hasCriticalLearningConflict' in overrides) ctx.hasCriticalLearningConflict = overrides.hasCriticalLearningConflict;
  if ('agentResultFinal' in overrides) ctx.agentResultFinal = overrides.agentResultFinal;
  return ctx;
}

// Helper to verify one gate failed
function expectGateFailure(gateId: string, ctx: any, label: string) {
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.safe, false, `${label}: not safe`);
  const fail = r.failures.find((f: any) => f.id === gateId);
  assert(fail !== undefined, `${label}: ${gateId} failed`);
  assert(typeof fail?.reason === 'string' && fail.reason.length > 0, `${label}: has reason`);
}

// G1: confidence not high
expectGateFailure('G1', withOverride({ prompt: { confidence_level: 'medium' } }), 'G1 medium confidence');
expectGateFailure('G1', withOverride({ prompt: { confidence_level: 'low' } }), 'G1 low confidence');

// G2: evaluator not pass
expectGateFailure('G2', withOverride({ prompt: { evaluator_status: 'fail' } }), 'G2 evaluator fail');
expectGateFailure('G2', withOverride({ prompt: { evaluator_status: 'pending' } }), 'G2 evaluator pending');

// G3: completion not complete
expectGateFailure('G3', withOverride({ prompt: { completion_status: 'partial' } }), 'G3 partial');
expectGateFailure('G3', withOverride({ prompt: { completion_status: 'failed' } }), 'G3 failed');
expectGateFailure('G3', withOverride({ prompt: { completion_status: 'blocked' } }), 'G3 blocked');

// G4: degradation
expectGateFailure('G4', withOverride({ prompt: { degradation_flag: true } }), 'G4 degradation');

// G5: escalation
expectGateFailure('G5', withOverride({ prompt: { escalation_required: true } }), 'G5 escalation');

// G6: dependencies
expectGateFailure('G6', withOverride({ prompt: { queue_status: 'blocked' } }), 'G6 queue blocked');
expectGateFailure('G6', withOverride({ prompt: { queue_status: 'pending' } }), 'G6 queue pending');

// G7: prompt manual_only
expectGateFailure('G7', withOverride({ prompt: { manual_only: true } }), 'G7 prompt manual_only');

// G8: step manual_only
expectGateFailure('G8', withOverride({ step: { manual_only: true } }), 'G8 step manual_only');

// G9: workflow manual_only
expectGateFailure('G9', withOverride({ workflow: { manual_only: true } }), 'G9 workflow manual_only');

// G10: workflow paused
expectGateFailure('G10', withOverride({ workflow: { autonomy_paused: true } }), 'G10 workflow paused');

// G11: critical learning conflict
expectGateFailure('G11', withOverride({ hasCriticalLearningConflict: true }), 'G11 critical conflict');

// G12: agent result not final
expectGateFailure('G12', withOverride({ agentResultFinal: false }), 'G12 agent not final');

// G13: release_mode manual
expectGateFailure('G13', withOverride({ prompt: { release_mode: 'manual' } }), 'G13 manual release mode');

// agentResultFinal undefined → G12 passes (uses !== false)
{
  const ctx = cleanContext();
  delete (ctx as any).agentResultFinal;
  const r = svc.evaluateSafetyGates(ctx);
  const g12 = r.passed.find((p: any) => p.id === 'G12');
  assert(g12 !== undefined, 'G12 passes when agentResultFinal undefined');
}

// Multiple gate failures aggregate
{
  const ctx = withOverride({
    prompt: { confidence_level: 'low', manual_only: true },
    workflow: { autonomy_paused: true },
  });
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.safe, false, 'multi-fail not safe');
  assert(r.failures.length >= 3, 'at least 3 failures');
  const ids = r.failures.map((f: any) => f.id);
  assert(ids.includes('G1'), 'G1 failed');
  assert(ids.includes('G7'), 'G7 failed');
  assert(ids.includes('G10'), 'G10 failed');
}

// SAFETY_GATES export
assertEq(svc.SAFETY_GATES.length, 13, 'SAFETY_GATES has 13 entries');

// ============================================================================
// checkPauseConditions
// ============================================================================
console.log('\n── checkPauseConditions ──────────────────────────────────');

function pauseContext() {
  return {
    recommendation: { action: 'PROCEED' },
    prompt: {
      degradation_flag: false,
      confidence_level: 'high',
    },
    step: { manual_only: false },
    comparisonInconclusive: false,
    correctionCount: 0,
  };
}

// No triggers → shouldPause=false
{
  const r = svc.checkPauseConditions(pauseContext());
  assertEq(r.shouldPause, false, 'clean context no pause');
  assertEq(r.reasons, [], 'no reasons');
}

// P1: FIX_REQUIRED
{
  const ctx = pauseContext();
  ctx.recommendation.action = 'FIX_REQUIRED';
  const r = svc.checkPauseConditions(ctx);
  assertEq(r.shouldPause, true, 'P1 fix required');
  const p1 = r.reasons.find((p: any) => p.id === 'P1');
  assert(p1 !== undefined, 'P1 in reasons');
  assert(p1.reason.includes('FIX_REQUIRED'), 'P1 reason text');
}

// P2: UNBLOCK_REQUIRED
{
  const ctx = pauseContext();
  ctx.recommendation.action = 'UNBLOCK_REQUIRED';
  const r = svc.checkPauseConditions(ctx);
  assertEq(r.shouldPause, true, 'P2 unblock required');
  assert(r.reasons.some((p: any) => p.id === 'P2'), 'P2 triggered');
}

// P3: REVIEW_REQUIRED
{
  const ctx = pauseContext();
  ctx.recommendation.action = 'REVIEW_REQUIRED';
  const r = svc.checkPauseConditions(ctx);
  assert(r.reasons.some((p: any) => p.id === 'P3'), 'P3 triggered');
}

// P4: degradation
{
  const ctx = pauseContext();
  ctx.prompt.degradation_flag = true;
  const r = svc.checkPauseConditions(ctx);
  assert(r.reasons.some((p: any) => p.id === 'P4'), 'P4 degradation');
}

// P5: low confidence
{
  const ctx = pauseContext();
  ctx.prompt.confidence_level = 'low';
  const r = svc.checkPauseConditions(ctx);
  assert(r.reasons.some((p: any) => p.id === 'P5'), 'P5 low confidence');
}

// P5: unknown confidence
{
  const ctx = pauseContext();
  ctx.prompt.confidence_level = 'unknown';
  const r = svc.checkPauseConditions(ctx);
  assert(r.reasons.some((p: any) => p.id === 'P5'), 'P5 unknown confidence');
}

// P6: comparison inconclusive
{
  const ctx = pauseContext();
  ctx.comparisonInconclusive = true;
  const r = svc.checkPauseConditions(ctx);
  assert(r.reasons.some((p: any) => p.id === 'P6'), 'P6 comparison inconclusive');
}

// P7: repeated corrections >= 2
{
  const ctx = pauseContext();
  ctx.correctionCount = 2;
  const r = svc.checkPauseConditions(ctx);
  assert(r.reasons.some((p: any) => p.id === 'P7'), 'P7 at 2 corrections');
}
{
  const ctx = pauseContext();
  ctx.correctionCount = 5;
  const r = svc.checkPauseConditions(ctx);
  assert(r.reasons.some((p: any) => p.id === 'P7'), 'P7 at 5 corrections');
  const p7 = r.reasons.find((p: any) => p.id === 'P7');
  assert(p7.reason.includes('5'), 'reason includes count');
}
{
  const ctx = pauseContext();
  ctx.correctionCount = 1;
  const r = svc.checkPauseConditions(ctx);
  assert(!r.reasons.some((p: any) => p.id === 'P7'), 'P7 not triggered at 1');
}

// P8: step manual-only
{
  const ctx = pauseContext();
  ctx.step.manual_only = true;
  const r = svc.checkPauseConditions(ctx);
  assert(r.reasons.some((p: any) => p.id === 'P8'), 'P8 step manual_only');
}

// Multiple pause conditions aggregate
{
  const ctx = pauseContext();
  ctx.recommendation.action = 'FIX_REQUIRED';
  ctx.prompt.degradation_flag = true;
  ctx.correctionCount = 3;
  const r = svc.checkPauseConditions(ctx);
  assertEq(r.shouldPause, true, 'multi-trigger should pause');
  assert(r.reasons.length >= 3, 'at least 3 reasons');
}

// Undefined recommendation → no P1/P2/P3
{
  const r = svc.checkPauseConditions({
    prompt: { confidence_level: 'high', degradation_flag: false },
    step: { manual_only: false },
    correctionCount: 0,
  });
  assertEq(r.shouldPause, false, 'no recommendation, no pause');
}

// PAUSE_CONDITIONS export
assertEq(svc.PAUSE_CONDITIONS.length, 8, 'PAUSE_CONDITIONS has 8 entries');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
