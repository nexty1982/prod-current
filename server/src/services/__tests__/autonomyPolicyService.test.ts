#!/usr/bin/env npx tsx
/**
 * Unit tests for services/autonomyPolicyService.js (OMD-1128)
 *
 * Policy model governing autonomous advance. Mix of pure functions
 * (modePermitsAction, evaluateSafetyGates, checkPauseConditions) and
 * DB-backed helpers (getStatus/setMode, pause/resume, manual_only,
 * logs, learning-conflict check).
 *
 * Stubs config/db via require.cache with a route-dispatch fake pool.
 *
 * Coverage:
 *   - modePermitsAction: OFF blocks all; RELEASE_ONLY permits RELEASE;
 *     SAFE_ADVANCE permits TRIGGER_EVAL/QUEUE_NEXT/ADVANCE_WORKFLOW;
 *     unknown mode/action → false
 *   - evaluateSafetyGates: all 13 gates pass (safe=true), individual gate
 *     failures (G1 confidence, G2 evaluator, G3 completion, G4 degradation,
 *     G5 escalation, G6 dependencies, G7 prompt manual_only, G8 step
 *     manual_only, G9 workflow manual_only, G10 autonomy_paused, G11
 *     critical learning conflict, G12 agent result not final, G13 manual
 *     release mode)
 *   - checkPauseConditions: each of P1-P8 triggers
 *   - getStatus: default (OFF), stored mode, invalid mode falls back to OFF
 *   - setMode: invalid mode throws; OFF disables; other modes enable
 *   - pauseWorkflow/resumeWorkflow: not found throws; happy
 *   - setManualOnly: invalid target_type; not found; happy per table
 *   - getPausedWorkflows: returns rows
 *   - logAutonomousAction: INFO/WARN/ERROR levels, message format,
 *     error swallowed
 *   - getLogs: parses meta JSON; bad meta → null
 *   - hasCriticalLearningConflict: no component → false; true when rows
 *   - getCorrectionCount: no promptId → 0; row count
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

async function assertThrows(fn: () => Promise<any>, pattern: RegExp, message: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${message} — did not throw`);
    failed++;
  } catch (e: any) {
    if (pattern.test(e.message)) { console.log(`  PASS: ${message}`); passed++; }
    else { console.error(`  FAIL: ${message}\n         got: ${e.message}`); failed++; }
  }
}

// ── Route-dispatch fake pool ─────────────────────────────────────────
type Route = { match: RegExp; handler: (sql: string, params: any[]) => any };
const routes: Route[] = [];
const queryLog: { sql: string; params: any[] }[] = [];

function resetPool() {
  routes.length = 0;
  queryLog.length = 0;
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) return r.handler(sql, params);
    }
    return [[]];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// Silence console.error (logAutonomousAction logs on error swallow)
const origError = console.error;
function quiet() { console.error = () => {}; }
function loud() { console.error = origError; }

const svc = require('../autonomyPolicyService');

async function main() {

// ============================================================================
// modePermitsAction
// ============================================================================
console.log('\n── modePermitsAction ─────────────────────────────────────');

const M = svc.AUTONOMY_MODE;
const A = svc.ACTION_TYPE;

assertEq(svc.modePermitsAction(M.OFF, A.RELEASE), false, 'OFF blocks RELEASE');
assertEq(svc.modePermitsAction(M.OFF, A.TRIGGER_EVAL), false, 'OFF blocks TRIGGER_EVAL');
assertEq(svc.modePermitsAction(M.RELEASE_ONLY, A.RELEASE), true, 'RELEASE_ONLY permits RELEASE');
assertEq(svc.modePermitsAction(M.RELEASE_ONLY, A.TRIGGER_EVAL), false, 'RELEASE_ONLY blocks TRIGGER_EVAL');
assertEq(svc.modePermitsAction(M.RELEASE_ONLY, A.QUEUE_NEXT), false, 'RELEASE_ONLY blocks QUEUE_NEXT');
assertEq(svc.modePermitsAction(M.SAFE_ADVANCE, A.RELEASE), true, 'SAFE_ADVANCE permits RELEASE');
assertEq(svc.modePermitsAction(M.SAFE_ADVANCE, A.TRIGGER_EVAL), true, 'SAFE_ADVANCE permits TRIGGER_EVAL');
assertEq(svc.modePermitsAction(M.SAFE_ADVANCE, A.QUEUE_NEXT), true, 'SAFE_ADVANCE permits QUEUE_NEXT');
assertEq(svc.modePermitsAction(M.SAFE_ADVANCE, A.ADVANCE_WORKFLOW), true, 'SAFE_ADVANCE permits ADVANCE_WORKFLOW');
assertEq(svc.modePermitsAction(M.SUPERVISED_FLOW, A.ADVANCE_WORKFLOW), true, 'SUPERVISED_FLOW permits all');
assertEq(svc.modePermitsAction('BOGUS', A.RELEASE), false, 'unknown mode → false');
assertEq(svc.modePermitsAction(M.OFF, 'BOGUS'), false, 'unknown action → false');

// ============================================================================
// evaluateSafetyGates: all pass
// ============================================================================
console.log('\n── evaluateSafetyGates: all pass ─────────────────────────');

function cleanCtx() {
  return {
    prompt: {
      confidence_level: 'high',
      evaluator_status: 'pass',
      completion_status: 'complete',
      degradation_flag: false,
      escalation_required: false,
      queue_status: 'ready',
      manual_only: false,
      release_mode: 'auto_safe',
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
  const r = svc.evaluateSafetyGates(cleanCtx());
  assertEq(r.safe, true, 'all gates pass');
  assertEq(r.failures.length, 0, 'no failures');
  assertEq(r.passed_count, 13, '13 gates passed');
  assertEq(r.total_gates, 13, 'total gates = 13');
}

// ============================================================================
// evaluateSafetyGates: individual failures
// ============================================================================
console.log('\n── evaluateSafetyGates: individual gates ─────────────────');

// G1: confidence
{
  const ctx = cleanCtx();
  ctx.prompt.confidence_level = 'low';
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.safe, false, 'G1 fails safe');
  assert(r.failures.some((f: any) => f.id === 'G1'), 'G1 failure reported');
}

// G2: evaluator
{
  const ctx = cleanCtx();
  ctx.prompt.evaluator_status = 'fail';
  const r = svc.evaluateSafetyGates(ctx);
  assert(r.failures.some((f: any) => f.id === 'G2'), 'G2 failure');
}

// G3: completion
{
  const ctx = cleanCtx();
  ctx.prompt.completion_status = 'partial';
  const r = svc.evaluateSafetyGates(ctx);
  assert(r.failures.some((f: any) => f.id === 'G3'), 'G3 failure');
}

// G4: degradation
{
  const ctx = cleanCtx();
  ctx.prompt.degradation_flag = true;
  const r = svc.evaluateSafetyGates(ctx);
  assert(r.failures.some((f: any) => f.id === 'G4'), 'G4 failure');
}

// G5: escalation
{
  const ctx = cleanCtx();
  ctx.prompt.escalation_required = true;
  const r = svc.evaluateSafetyGates(ctx);
  assert(r.failures.some((f: any) => f.id === 'G5'), 'G5 failure');
}

// G6: queue status blocked
{
  const ctx = cleanCtx();
  ctx.prompt.queue_status = 'blocked';
  const r = svc.evaluateSafetyGates(ctx);
  assert(r.failures.some((f: any) => f.id === 'G6'), 'G6 failure (blocked)');
}

// G6: queue status pending
{
  const ctx = cleanCtx();
  ctx.prompt.queue_status = 'pending';
  const r = svc.evaluateSafetyGates(ctx);
  assert(r.failures.some((f: any) => f.id === 'G6'), 'G6 failure (pending)');
}

// G7: prompt manual_only
{
  const ctx = cleanCtx();
  ctx.prompt.manual_only = true;
  const r = svc.evaluateSafetyGates(ctx);
  assert(r.failures.some((f: any) => f.id === 'G7'), 'G7 failure');
}

// G8: step manual_only
{
  const ctx = cleanCtx();
  ctx.step.manual_only = true;
  const r = svc.evaluateSafetyGates(ctx);
  assert(r.failures.some((f: any) => f.id === 'G8'), 'G8 failure');
}

// G9: workflow manual_only
{
  const ctx = cleanCtx();
  ctx.workflow.manual_only = true;
  const r = svc.evaluateSafetyGates(ctx);
  assert(r.failures.some((f: any) => f.id === 'G9'), 'G9 failure');
}

// G10: autonomy_paused
{
  const ctx = cleanCtx();
  ctx.workflow.autonomy_paused = true;
  (ctx.workflow as any).autonomy_pause_reason = 'operator';
  const r = svc.evaluateSafetyGates(ctx);
  assert(r.failures.some((f: any) => f.id === 'G10'), 'G10 failure');
  const g10 = r.failures.find((f: any) => f.id === 'G10');
  assert(g10.reason.includes('operator'), 'G10 reason includes pause reason');
}

// G11: critical learning conflict
{
  const ctx = cleanCtx();
  ctx.hasCriticalLearningConflict = true;
  const r = svc.evaluateSafetyGates(ctx);
  assert(r.failures.some((f: any) => f.id === 'G11'), 'G11 failure');
}

// G12: agent result not final
{
  const ctx = cleanCtx();
  ctx.agentResultFinal = false;
  const r = svc.evaluateSafetyGates(ctx);
  assert(r.failures.some((f: any) => f.id === 'G12'), 'G12 failure');
}

// G13: release_mode manual
{
  const ctx = cleanCtx();
  ctx.prompt.release_mode = 'manual';
  const r = svc.evaluateSafetyGates(ctx);
  assert(r.failures.some((f: any) => f.id === 'G13'), 'G13 failure');
}

// Missing workflow/step → gates G8/G9/G10 should still pass
{
  const ctx = cleanCtx() as any;
  ctx.workflow = null;
  ctx.step = null;
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.safe, true, 'null workflow/step → still safe');
}

// ============================================================================
// checkPauseConditions
// ============================================================================
console.log('\n── checkPauseConditions ──────────────────────────────────');

// No pause
{
  const r = svc.checkPauseConditions({
    recommendation: { action: 'RELEASE' },
    prompt: { confidence_level: 'high' },
  });
  assertEq(r.shouldPause, false, 'no pause');
  assertEq(r.reasons.length, 0, 'no reasons');
}

// P1: FIX_REQUIRED
{
  const r = svc.checkPauseConditions({
    recommendation: { action: 'FIX_REQUIRED' },
    prompt: { confidence_level: 'high' },
  });
  assertEq(r.shouldPause, true, 'P1 pause');
  assert(r.reasons.some((x: any) => x.id === 'P1'), 'P1 reported');
}

// P2: UNBLOCK_REQUIRED
{
  const r = svc.checkPauseConditions({
    recommendation: { action: 'UNBLOCK_REQUIRED' },
    prompt: { confidence_level: 'high' },
  });
  assert(r.reasons.some((x: any) => x.id === 'P2'), 'P2');
}

// P3: REVIEW_REQUIRED
{
  const r = svc.checkPauseConditions({
    recommendation: { action: 'REVIEW_REQUIRED' },
    prompt: { confidence_level: 'high' },
  });
  assert(r.reasons.some((x: any) => x.id === 'P3'), 'P3');
}

// P4: degradation
{
  const r = svc.checkPauseConditions({
    recommendation: { action: 'RELEASE' },
    prompt: { confidence_level: 'high', degradation_flag: true },
  });
  assert(r.reasons.some((x: any) => x.id === 'P4'), 'P4');
}

// P5: confidence low
{
  const r = svc.checkPauseConditions({
    recommendation: { action: 'RELEASE' },
    prompt: { confidence_level: 'low' },
  });
  assert(r.reasons.some((x: any) => x.id === 'P5'), 'P5 low');
}

// P5: confidence unknown
{
  const r = svc.checkPauseConditions({
    recommendation: { action: 'RELEASE' },
    prompt: { confidence_level: 'unknown' },
  });
  assert(r.reasons.some((x: any) => x.id === 'P5'), 'P5 unknown');
}

// P6: comparison inconclusive
{
  const r = svc.checkPauseConditions({
    recommendation: { action: 'RELEASE' },
    prompt: { confidence_level: 'high' },
    comparisonInconclusive: true,
  });
  assert(r.reasons.some((x: any) => x.id === 'P6'), 'P6');
}

// P7: repeated corrections
{
  const r = svc.checkPauseConditions({
    recommendation: { action: 'RELEASE' },
    prompt: { confidence_level: 'high' },
    correctionCount: 3,
  });
  assert(r.reasons.some((x: any) => x.id === 'P7'), 'P7');
}

// P8: step manual_only
{
  const r = svc.checkPauseConditions({
    recommendation: { action: 'RELEASE' },
    prompt: { confidence_level: 'high' },
    step: { manual_only: true },
  });
  assert(r.reasons.some((x: any) => x.id === 'P8'), 'P8');
}

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

// Default (empty settings → OFF)
resetPool();
{
  const s = await svc.getStatus();
  assertEq(s.enabled, false, 'default enabled false');
  assertEq(s.mode, M.OFF, 'default mode OFF');
  assertEq(s.allowed_actions, [], 'no allowed actions at OFF');
}

// Stored SAFE_ADVANCE mode + enabled
resetPool();
routes.push({
  match: /system_settings/i,
  handler: (_sql, params) => {
    if (params[0] === 'autonomy_mode') return [[{ value_multilang: JSON.stringify('SAFE_ADVANCE') }]];
    if (params[0] === 'autonomy_enabled') return [[{ value_multilang: JSON.stringify('true') }]];
    return [[]];
  },
});
{
  const s = await svc.getStatus();
  assertEq(s.mode, 'SAFE_ADVANCE', 'stored mode');
  assertEq(s.enabled, true, 'enabled');
  assert(s.allowed_actions.includes('RELEASE'), 'RELEASE allowed');
  assert(s.allowed_actions.includes('TRIGGER_EVAL'), 'TRIGGER_EVAL allowed');
}

// Invalid stored mode falls back to OFF
resetPool();
routes.push({
  match: /system_settings/i,
  handler: (_sql, params) => {
    if (params[0] === 'autonomy_mode') return [[{ value_multilang: JSON.stringify('BOGUS') }]];
    return [[{ value_multilang: JSON.stringify('true') }]];
  },
});
{
  const s = await svc.getStatus();
  assertEq(s.mode, M.OFF, 'invalid mode → OFF');
}

// ============================================================================
// setMode
// ============================================================================
console.log('\n── setMode ───────────────────────────────────────────────');

// Invalid mode
resetPool();
await assertThrows(
  async () => await svc.setMode('BOGUS'),
  /Invalid autonomy mode/,
  'invalid mode throws'
);

// Valid: SAFE_ADVANCE
resetPool();
routes.push({
  match: /INSERT INTO system_settings/i,
  handler: () => [{ affectedRows: 1 }],
});
routes.push({
  match: /SELECT value_multilang/i,
  handler: (_sql, params) => {
    if (params[0] === 'autonomy_mode') return [[{ value_multilang: JSON.stringify('SAFE_ADVANCE') }]];
    return [[{ value_multilang: JSON.stringify('true') }]];
  },
});
{
  const s = await svc.setMode('SAFE_ADVANCE');
  assertEq(s.mode, 'SAFE_ADVANCE', 'mode set');
  assertEq(s.enabled, true, 'enabled true on non-OFF');
  const inserts = queryLog.filter((q) => /INSERT INTO system_settings/i.test(q.sql));
  assert(inserts.length >= 2, 'enabled + mode both written');
}

// OFF → enabled=false
resetPool();
routes.push({ match: /INSERT INTO system_settings/i, handler: () => [{ affectedRows: 1 }] });
routes.push({
  match: /SELECT value_multilang/i,
  handler: (_sql, params) => {
    if (params[0] === 'autonomy_mode') return [[{ value_multilang: JSON.stringify('OFF') }]];
    return [[{ value_multilang: JSON.stringify('false') }]];
  },
});
{
  const s = await svc.setMode('OFF');
  assertEq(s.enabled, false, 'OFF disables');
}

// ============================================================================
// pauseWorkflow / resumeWorkflow
// ============================================================================
console.log('\n── pause/resume workflow ─────────────────────────────────');

// Pause not found
resetPool();
routes.push({ match: /UPDATE prompt_workflows/i, handler: () => [{ affectedRows: 0 }] });
await assertThrows(
  async () => await svc.pauseWorkflow(99, 'test'),
  /not found/,
  'pauseWorkflow not found throws'
);

// Pause happy
resetPool();
routes.push({ match: /UPDATE prompt_workflows/i, handler: () => [{ affectedRows: 1 }] });
{
  const r = await svc.pauseWorkflow(42, 'operator action');
  assertEq(r.success, true, 'pause success');
  assertEq(r.workflow_id, 42, 'workflow_id');
  assertEq(r.paused, true, 'paused true');
  assertEq(queryLog[0].params[0], 'operator action', 'reason param');
}

// Pause with null reason → default
resetPool();
routes.push({ match: /UPDATE prompt_workflows/i, handler: () => [{ affectedRows: 1 }] });
{
  await svc.pauseWorkflow(42, null);
  assertEq(queryLog[0].params[0], 'Paused by operator', 'default reason');
}

// Resume not found
resetPool();
routes.push({ match: /UPDATE prompt_workflows/i, handler: () => [{ affectedRows: 0 }] });
await assertThrows(
  async () => await svc.resumeWorkflow(99),
  /not found/,
  'resumeWorkflow not found throws'
);

// Resume happy
resetPool();
routes.push({ match: /UPDATE prompt_workflows/i, handler: () => [{ affectedRows: 1 }] });
{
  const r = await svc.resumeWorkflow(42);
  assertEq(r.success, true, 'resume success');
  assertEq(r.paused, false, 'paused false');
}

// ============================================================================
// setManualOnly
// ============================================================================
console.log('\n── setManualOnly ─────────────────────────────────────────');

// Invalid target_type
resetPool();
await assertThrows(
  async () => await svc.setManualOnly('bogus', 1, true),
  /Invalid target_type/,
  'invalid target_type throws'
);

// Workflow not found
resetPool();
routes.push({ match: /UPDATE prompt_workflows/i, handler: () => [{ affectedRows: 0 }] });
await assertThrows(
  async () => await svc.setManualOnly('workflow', 99, true),
  /not found/,
  'workflow not found'
);

// Workflow happy
resetPool();
routes.push({ match: /UPDATE prompt_workflows/i, handler: () => [{ affectedRows: 1 }] });
{
  const r = await svc.setManualOnly('workflow', 42, true);
  assertEq(r.success, true, 'wf success');
  assertEq(r.target_type, 'workflow', 'target_type');
  assertEq(r.manual_only, true, 'manual_only true');
  assertEq(queryLog[0].params[0], 1, 'flag=1');
}

// Step (different table)
resetPool();
routes.push({ match: /UPDATE prompt_workflow_steps/i, handler: () => [{ affectedRows: 1 }] });
{
  await svc.setManualOnly('step', 5, false);
  assert(/prompt_workflow_steps/.test(queryLog[0].sql), 'uses steps table');
  assertEq(queryLog[0].params[0], 0, 'flag=0 (false)');
}

// Prompt
resetPool();
routes.push({ match: /UPDATE om_prompt_registry/i, handler: () => [{ affectedRows: 1 }] });
{
  await svc.setManualOnly('prompt', 7, true);
  assert(/om_prompt_registry/.test(queryLog[0].sql), 'uses prompt registry');
}

// ============================================================================
// getPausedWorkflows
// ============================================================================
console.log('\n── getPausedWorkflows ────────────────────────────────────');

resetPool();
routes.push({
  match: /autonomy_paused = 1/i,
  handler: () => [[
    { id: 1, name: 'wf1', component: 'c', status: 'active', autonomy_pause_reason: 'test', autonomy_paused_at: new Date() },
    { id: 2, name: 'wf2', component: 'c', status: 'approved', autonomy_pause_reason: 'test', autonomy_paused_at: new Date() },
  ]],
});
{
  const rows = await svc.getPausedWorkflows();
  assertEq(rows.length, 2, '2 paused workflows');
  assertEq(rows[0].name, 'wf1', 'row name');
}

// ============================================================================
// logAutonomousAction + getLogs
// ============================================================================
console.log('\n── logAutonomousAction ───────────────────────────────────');

// SUCCESS level → INFO
resetPool();
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{ affectedRows: 1 }] });
{
  await svc.logAutonomousAction('RELEASE', {
    target_title: 'test prompt',
    target_id: 5,
    mode: 'SAFE_ADVANCE',
  }, 'SUCCESS');
  assertEq(queryLog[0].params[0], 'INFO', 'SUCCESS → INFO');
  assert(queryLog[0].params[1].includes('Autonomous RELEASE'), 'message format');
  assert(queryLog[0].params[1].includes('test prompt'), 'target title');
}

// PAUSED level → WARN
resetPool();
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{ affectedRows: 1 }] });
{
  await svc.logAutonomousAction('ADVANCE_WORKFLOW', {
    target_id: 1,
    pause_reason: 'operator',
    step_title: 'Step 2',
  }, 'PAUSED');
  assertEq(queryLog[0].params[0], 'WARN', 'PAUSED → WARN');
  assert(queryLog[0].params[1].includes('PAUSED'), 'PAUSED in message');
  assert(queryLog[0].params[1].includes('Step 2'), 'step_title used');
}

// BLOCKED → WARN
resetPool();
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{ affectedRows: 1 }] });
{
  await svc.logAutonomousAction('RELEASE', { block_reason: 'gate G1 failed' }, 'BLOCKED');
  assertEq(queryLog[0].params[0], 'WARN', 'BLOCKED → WARN');
  assert(queryLog[0].params[1].includes('BLOCKED'), 'BLOCKED message');
  assert(queryLog[0].params[1].includes('gate G1 failed'), 'block_reason included');
}

// ERROR level → ERROR
resetPool();
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{ affectedRows: 1 }] });
{
  await svc.logAutonomousAction('RELEASE', { error: 'db down' }, 'ERROR');
  assertEq(queryLog[0].params[0], 'ERROR', 'ERROR → ERROR');
  assert(queryLog[0].params[1].includes('db down'), 'error in message');
}

// DB error swallowed
resetPool();
routes.push({
  match: /INSERT INTO system_logs/i,
  handler: () => { throw new Error('db fail'); },
});
quiet();
{
  // Should not throw
  await svc.logAutonomousAction('RELEASE', { target_id: 1, mode: 'OFF' });
  loud();
  assert(true, 'error swallowed');
}

// ============================================================================
// getLogs
// ============================================================================
console.log('\n── getLogs ───────────────────────────────────────────────');

resetPool();
routes.push({
  match: /source = 'autonomous_advance'/i,
  handler: () => [[
    { timestamp: '2026-01-01', level: 'INFO', message: 'msg1', meta: '{"x":1}' },
    { timestamp: '2026-01-02', level: 'WARN', message: 'msg2', meta: 'not-json' },
    { timestamp: '2026-01-03', level: 'ERROR', message: 'msg3', meta: null },
  ]],
});
{
  const logs = await svc.getLogs(10);
  assertEq(logs.length, 3, '3 logs');
  assertEq(logs[0].meta.x, 1, 'valid JSON parsed');
  assertEq(logs[1].meta, null, 'invalid JSON → null');
  assertEq(logs[2].meta, null, 'null meta → null');
}

// ============================================================================
// hasCriticalLearningConflict
// ============================================================================
console.log('\n── hasCriticalLearningConflict ───────────────────────────');

// No component → false
resetPool();
assertEq(await svc.hasCriticalLearningConflict(null), false, 'null → false');
assertEq(await svc.hasCriticalLearningConflict(''), false, 'empty → false');
assertEq(queryLog.length, 0, 'no DB call when no component');

// Has conflict
resetPool();
routes.push({
  match: /workflow_learning_registry/i,
  handler: () => [[{ cnt: 2 }]],
});
assertEq(await svc.hasCriticalLearningConflict('auth'), true, 'conflict detected');

// No conflict
resetPool();
routes.push({
  match: /workflow_learning_registry/i,
  handler: () => [[{ cnt: 0 }]],
});
assertEq(await svc.hasCriticalLearningConflict('auth'), false, 'no conflict');

// ============================================================================
// getCorrectionCount
// ============================================================================
console.log('\n── getCorrectionCount ────────────────────────────────────');

// No promptId → 0
resetPool();
assertEq(await svc.getCorrectionCount(null), 0, 'null → 0');
assertEq(queryLog.length, 0, 'no DB call');

// With promptId
resetPool();
routes.push({
  match: /parent_prompt_id/i,
  handler: () => [[{ cnt: 3 }]],
});
assertEq(await svc.getCorrectionCount(42), 3, '3 corrections');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main()

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
