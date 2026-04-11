#!/usr/bin/env npx tsx
/**
 * Unit tests for services/autonomyPolicyService.js (OMD-1205)
 *
 * Policy enforcement for autonomous workflow advancement. Pure-function
 * gates + thin DB-backed setting/logging layer.
 *
 * Strategy: stub db-compat via require.cache with a regex-dispatch fake
 * pool.
 *
 * Coverage:
 *   - AUTONOMY_MODE / MODE_ORDER / ACTION_TYPE / ACTION_MODE_REQUIREMENTS
 *   - modePermitsAction (pure): each action × each mode
 *   - evaluateSafetyGates (pure): all-pass, single-fail, multi-fail, reason strings
 *   - checkPauseConditions (pure): no pause, P1-P8 individually, ordering
 *   - getStatus: defaults from empty settings; explicit mode persisted;
 *     allowed_actions filtered by mode rank
 *   - setMode: invalid throws; OFF disables; non-OFF enables
 *   - pauseWorkflow / resumeWorkflow: happy + not-found throws
 *   - setManualOnly: invalid target throws, table dispatch, not-found throws
 *   - logAutonomousAction: level mapping, message formats, error swallowed
 *   - getLogs: default/custom limit, meta JSON parsing, null meta handling
 *   - hasCriticalLearningConflict: null component, count>0, count=0
 *   - getCorrectionCount: null id, Number coercion
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

// ── Fake pool ────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Responder = { match: RegExp; respond: (params: any[]) => any };
let responders: Responder[] = [];

function runQuery(sql: string, params: any[] = []) {
  queryLog.push({ sql, params });
  for (const r of responders) {
    if (r.match.test(sql)) return Promise.resolve(r.respond(params));
  }
  return Promise.resolve([[]]);
}

const fakePool = { query: runQuery };

const dbCompatPath = require.resolve('../../config/db');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
    getTenantPool: () => fakePool,
  },
} as any;

function reset() {
  queryLog.length = 0;
  responders = [];
}

const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const svc = require('../autonomyPolicyService');

// Build a fully-passing safety context
function passingCtx(): any {
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
    step: { manual_only: false },
    workflow: { manual_only: false, autonomy_paused: false },
    hasCriticalLearningConflict: false,
    agentResultFinal: true,
  };
}

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── constants ────────────────────────────────────────────');

assertEq(svc.AUTONOMY_MODE, {
  OFF: 'OFF', RELEASE_ONLY: 'RELEASE_ONLY',
  SAFE_ADVANCE: 'SAFE_ADVANCE', SUPERVISED_FLOW: 'SUPERVISED_FLOW',
}, 'AUTONOMY_MODE');
assertEq(svc.MODE_ORDER, ['OFF', 'RELEASE_ONLY', 'SAFE_ADVANCE', 'SUPERVISED_FLOW'], 'MODE_ORDER');
assertEq(svc.ACTION_TYPE, {
  RELEASE: 'RELEASE', TRIGGER_EVAL: 'TRIGGER_EVAL',
  QUEUE_NEXT: 'QUEUE_NEXT', ADVANCE_WORKFLOW: 'ADVANCE_WORKFLOW',
}, 'ACTION_TYPE');
assertEq(svc.SAFETY_GATES.length, 13, '13 safety gates');
assertEq(svc.PAUSE_CONDITIONS.length, 8, '8 pause conditions');

// ============================================================================
// modePermitsAction
// ============================================================================
console.log('\n── modePermitsAction ────────────────────────────────────');

// OFF permits nothing
for (const action of ['RELEASE', 'TRIGGER_EVAL', 'QUEUE_NEXT', 'ADVANCE_WORKFLOW']) {
  assertEq(svc.modePermitsAction('OFF', action), false, `OFF denies ${action}`);
}
// RELEASE_ONLY permits only RELEASE
assertEq(svc.modePermitsAction('RELEASE_ONLY', 'RELEASE'), true, 'RELEASE_ONLY → RELEASE');
assertEq(svc.modePermitsAction('RELEASE_ONLY', 'TRIGGER_EVAL'), false, 'RELEASE_ONLY ✗ TRIGGER_EVAL');
assertEq(svc.modePermitsAction('RELEASE_ONLY', 'QUEUE_NEXT'), false, 'RELEASE_ONLY ✗ QUEUE_NEXT');
assertEq(svc.modePermitsAction('RELEASE_ONLY', 'ADVANCE_WORKFLOW'), false, 'RELEASE_ONLY ✗ ADVANCE_WORKFLOW');
// SAFE_ADVANCE permits all four
for (const action of ['RELEASE', 'TRIGGER_EVAL', 'QUEUE_NEXT', 'ADVANCE_WORKFLOW']) {
  assertEq(svc.modePermitsAction('SAFE_ADVANCE', action), true, `SAFE_ADVANCE ✓ ${action}`);
}
// SUPERVISED_FLOW permits all four
for (const action of ['RELEASE', 'TRIGGER_EVAL', 'QUEUE_NEXT', 'ADVANCE_WORKFLOW']) {
  assertEq(svc.modePermitsAction('SUPERVISED_FLOW', action), true, `SUPERVISED_FLOW ✓ ${action}`);
}
// Unknown mode / action
assertEq(svc.modePermitsAction('BOGUS', 'RELEASE'), false, 'unknown mode → false');
assertEq(svc.modePermitsAction('SAFE_ADVANCE', 'BOGUS'), false, 'unknown action → false');

// ============================================================================
// evaluateSafetyGates
// ============================================================================
console.log('\n── evaluateSafetyGates: all pass ────────────────────────');

{
  const r = svc.evaluateSafetyGates(passingCtx());
  assertEq(r.safe, true, 'all pass → safe');
  assertEq(r.failures.length, 0, 'no failures');
  assertEq(r.passed_count, 13, 'all 13 passed');
  assertEq(r.total_gates, 13, 'total_gates=13');
}

console.log('\n── evaluateSafetyGates: single failures ─────────────────');

// G1 — confidence low
{
  const ctx = passingCtx();
  ctx.prompt.confidence_level = 'low';
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.safe, false, 'low confidence → unsafe');
  assertEq(r.failures[0].id, 'G1', 'G1 failed');
  assert(r.failures[0].reason.includes('low'), 'reason mentions low');
}
// G2 — evaluator pending
{
  const ctx = passingCtx();
  ctx.prompt.evaluator_status = 'pending';
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.failures[0].id, 'G2', 'G2 failed');
}
// G3 — completion incomplete
{
  const ctx = passingCtx();
  ctx.prompt.completion_status = 'partial';
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.failures[0].id, 'G3', 'G3 failed');
}
// G4 — degradation
{
  const ctx = passingCtx();
  ctx.prompt.degradation_flag = true;
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.failures[0].id, 'G4', 'G4 failed');
}
// G5 — escalation
{
  const ctx = passingCtx();
  ctx.prompt.escalation_required = true;
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.failures[0].id, 'G5', 'G5 failed');
}
// G6 — dependencies not satisfied
{
  const ctx = passingCtx();
  ctx.prompt.queue_status = 'blocked';
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.failures[0].id, 'G6', 'G6 failed');
}
// G7 — prompt manual_only
{
  const ctx = passingCtx();
  ctx.prompt.manual_only = true;
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.failures[0].id, 'G7', 'G7 failed');
}
// G8 — step manual_only
{
  const ctx = passingCtx();
  ctx.step.manual_only = true;
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.failures[0].id, 'G8', 'G8 failed');
}
// G9 — workflow manual_only
{
  const ctx = passingCtx();
  ctx.workflow.manual_only = true;
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.failures[0].id, 'G9', 'G9 failed');
}
// G10 — workflow paused
{
  const ctx = passingCtx();
  ctx.workflow.autonomy_paused = true;
  ctx.workflow.autonomy_pause_reason = 'op ask';
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.failures[0].id, 'G10', 'G10 failed');
  assert(r.failures[0].reason.includes('op ask'), 'reason has pause_reason');
}
// G11 — critical learning conflict
{
  const ctx = passingCtx();
  ctx.hasCriticalLearningConflict = true;
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.failures[0].id, 'G11', 'G11 failed');
}
// G12 — agent result not final
{
  const ctx = passingCtx();
  ctx.agentResultFinal = false;
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.failures[0].id, 'G12', 'G12 failed');
}
// G13 — release_mode=manual
{
  const ctx = passingCtx();
  ctx.prompt.release_mode = 'manual';
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.failures[0].id, 'G13', 'G13 failed');
}

console.log('\n── evaluateSafetyGates: multi-fail ──────────────────────');
{
  const ctx = passingCtx();
  ctx.prompt.confidence_level = 'low';
  ctx.prompt.degradation_flag = true;
  ctx.workflow.manual_only = true;
  const r = svc.evaluateSafetyGates(ctx);
  assertEq(r.failures.length, 3, '3 failures');
  assertEq(r.passed_count, 10, '10 passed');
  const ids = r.failures.map((f: any) => f.id);
  assert(ids.includes('G1'), 'G1 in list');
  assert(ids.includes('G4'), 'G4 in list');
  assert(ids.includes('G9'), 'G9 in list');
}

// ============================================================================
// checkPauseConditions
// ============================================================================
console.log('\n── checkPauseConditions ─────────────────────────────────');

// None match
{
  const r = svc.checkPauseConditions({
    recommendation: { action: 'PROCEED' },
    prompt: { degradation_flag: false, confidence_level: 'high' },
    comparisonInconclusive: false,
    correctionCount: 0,
    step: { manual_only: false },
  });
  assertEq(r.shouldPause, false, 'no pause');
  assertEq(r.reasons, [], 'empty reasons');
}

// P1 — FIX_REQUIRED
{
  const r = svc.checkPauseConditions({ recommendation: { action: 'FIX_REQUIRED' } });
  assertEq(r.shouldPause, true, 'P1 pauses');
  assertEq(r.reasons[0].id, 'P1', 'P1 id');
}
// P2
{
  const r = svc.checkPauseConditions({ recommendation: { action: 'UNBLOCK_REQUIRED' } });
  assertEq(r.reasons[0].id, 'P2', 'P2 id');
}
// P3
{
  const r = svc.checkPauseConditions({ recommendation: { action: 'REVIEW_REQUIRED' } });
  assertEq(r.reasons[0].id, 'P3', 'P3 id');
}
// P4 — degradation
{
  const r = svc.checkPauseConditions({ prompt: { degradation_flag: true } });
  assertEq(r.reasons[0].id, 'P4', 'P4 id');
}
// P5 — low confidence
{
  const r = svc.checkPauseConditions({ prompt: { confidence_level: 'low' } });
  assertEq(r.reasons[0].id, 'P5', 'P5 id');
}
// P5 unknown
{
  const r = svc.checkPauseConditions({ prompt: { confidence_level: 'unknown' } });
  assertEq(r.reasons[0].id, 'P5', 'P5 id unknown');
}
// P6
{
  const r = svc.checkPauseConditions({ comparisonInconclusive: true });
  assertEq(r.reasons[0].id, 'P6', 'P6 id');
}
// P7
{
  const r = svc.checkPauseConditions({ correctionCount: 2 });
  assertEq(r.reasons[0].id, 'P7', 'P7 id');
}
// P7 — below threshold
{
  const r = svc.checkPauseConditions({ correctionCount: 1 });
  assertEq(r.shouldPause, false, '1 correction → no pause');
}
// P8
{
  const r = svc.checkPauseConditions({ step: { manual_only: true } });
  assertEq(r.reasons[0].id, 'P8', 'P8 id');
}

// Multi-match: all P1+P4+P5
{
  const r = svc.checkPauseConditions({
    recommendation: { action: 'FIX_REQUIRED' },
    prompt: { degradation_flag: true, confidence_level: 'low' },
  });
  assert(r.reasons.length >= 3, 'multi reasons');
  const ids = r.reasons.map((x: any) => x.id);
  assert(ids.includes('P1') && ids.includes('P4') && ids.includes('P5'),
    'P1+P4+P5 all listed');
}

// ============================================================================
// getStatus / setMode
// ============================================================================
console.log('\n── getStatus: defaults ──────────────────────────────────');

reset();
// Empty settings → default OFF
responders = [{ match: /FROM system_settings/, respond: () => [[]] }];
{
  const r = await svc.getStatus();
  assertEq(r.mode, 'OFF', 'default OFF');
  assertEq(r.enabled, false, 'enabled false');
  assertEq(r.allowed_actions, [], 'no actions allowed');
}

console.log('\n── getStatus: SAFE_ADVANCE mode ─────────────────────────');

reset();
let getSettingCall = 0;
responders = [
  // First call: autonomy_mode, second: autonomy_enabled
  { match: /FROM system_settings/, respond: (p) => {
    const key = p[0];
    if (key === 'autonomy_mode') {
      return [[{ value_multilang: JSON.stringify('SAFE_ADVANCE') }]];
    }
    if (key === 'autonomy_enabled') {
      return [[{ value_multilang: JSON.stringify('true') }]];
    }
    return [[]];
  } },
];
{
  const r = await svc.getStatus();
  assertEq(r.mode, 'SAFE_ADVANCE', 'mode loaded');
  assertEq(r.enabled, true, 'enabled true');
  // SAFE_ADVANCE → all 4 actions
  assertEq(r.allowed_actions.length, 4, '4 actions allowed');
  assert(r.allowed_actions.includes('RELEASE'), 'includes RELEASE');
  assert(r.allowed_actions.includes('ADVANCE_WORKFLOW'), 'includes ADVANCE_WORKFLOW');
}

console.log('\n── setMode ──────────────────────────────────────────────');

reset();
{
  let caught: any = null;
  try { await svc.setMode('BOGUS'); } catch (e) { caught = e; }
  assert(caught !== null, 'invalid mode throws');
  assert(caught.message.includes('Invalid autonomy mode'), 'error message');
}

reset();
responders = [
  { match: /INSERT INTO system_settings/, respond: () => [{ affectedRows: 1 }] },
  // getStatus at end:
  { match: /SELECT value_multilang FROM system_settings/, respond: (p) => {
    if (p[0] === 'autonomy_mode') return [[{ value_multilang: JSON.stringify('RELEASE_ONLY') }]];
    if (p[0] === 'autonomy_enabled') return [[{ value_multilang: JSON.stringify('true') }]];
    return [[]];
  } },
];
{
  const r = await svc.setMode('RELEASE_ONLY');
  assertEq(r.mode, 'RELEASE_ONLY', 'mode set');
  assertEq(r.enabled, true, 'enabled=true when non-OFF');
  // Check first two inserts were the enable + mode writes
  const inserts = queryLog.filter(q => /INSERT INTO system_settings/.test(q.sql));
  assertEq(inserts.length, 2, 'two INSERT/UPSERTs (enable + mode)');
  // First insert: autonomy_enabled = "true"
  assertEq(inserts[0].params[0], 'autonomy_enabled', 'first: enable key');
  assertEq(inserts[0].params[1], JSON.stringify('true'), 'enable value JSON "true"');
  // Second: autonomy_mode
  assertEq(inserts[1].params[0], 'autonomy_mode', 'second: mode key');
  assertEq(inserts[1].params[1], JSON.stringify('RELEASE_ONLY'), 'mode value JSON');
}

// OFF disables
reset();
responders = [
  { match: /INSERT INTO system_settings/, respond: () => [{ affectedRows: 1 }] },
  { match: /SELECT value_multilang FROM system_settings/, respond: () => [[]] },
];
{
  await svc.setMode('OFF');
  const inserts = queryLog.filter(q => /INSERT INTO system_settings/.test(q.sql));
  assertEq(inserts[0].params[0], 'autonomy_enabled', 'first: enable key');
  assertEq(inserts[0].params[1], JSON.stringify('false'), 'enable value "false"');
}

// ============================================================================
// pauseWorkflow / resumeWorkflow
// ============================================================================
console.log('\n── pauseWorkflow / resumeWorkflow ───────────────────────');

reset();
responders = [{ match: /UPDATE prompt_workflows\s+SET autonomy_paused = 1/, respond: () => [{ affectedRows: 1 }] }];
{
  const r = await svc.pauseWorkflow(42, 'maint window');
  assertEq(r.success, true, 'success');
  assertEq(r.workflow_id, 42, 'id');
  assertEq(r.paused, true, 'paused');
  assertEq(queryLog[0].params, ['maint window', 42], 'reason + id params');
}

reset();
responders = [{ match: /UPDATE prompt_workflows\s+SET autonomy_paused = 1/, respond: () => [{ affectedRows: 0 }] }];
{
  let caught: any = null;
  try { await svc.pauseWorkflow(99); } catch (e) { caught = e; }
  assert(caught !== null, 'not found throws');
}

reset();
responders = [{ match: /UPDATE prompt_workflows\s+SET autonomy_paused = 0/, respond: () => [{ affectedRows: 1 }] }];
{
  const r = await svc.resumeWorkflow(42);
  assertEq(r.paused, false, 'paused=false after resume');
  assertEq(queryLog[0].params, [42], 'id param');
}

reset();
responders = [{ match: /UPDATE prompt_workflows\s+SET autonomy_paused = 0/, respond: () => [{ affectedRows: 0 }] }];
{
  let caught: any = null;
  try { await svc.resumeWorkflow(99); } catch (e) { caught = e; }
  assert(caught !== null, 'resume not found throws');
}

// ============================================================================
// setManualOnly
// ============================================================================
console.log('\n── setManualOnly ────────────────────────────────────────');

reset();
{
  let caught: any = null;
  try { await svc.setManualOnly('bogus', 1, true); } catch (e) { caught = e; }
  assert(caught !== null, 'invalid target throws');
  assert(caught.message.includes('Invalid target_type'), 'error');
}

for (const [targetType, table] of [
  ['workflow', 'prompt_workflows'],
  ['step', 'prompt_workflow_steps'],
  ['prompt', 'om_prompt_registry'],
] as const) {
  reset();
  responders = [{ match: new RegExp(`UPDATE ${table} SET manual_only`), respond: () => [{ affectedRows: 1 }] }];
  const r = await svc.setManualOnly(targetType, 5, true);
  assertEq(r.target_type, targetType, `${targetType}: target_type echoed`);
  assertEq(r.manual_only, true, `${targetType}: flag`);
  assertEq(queryLog[0].params, [1, 5], `${targetType}: [1, id]`);
}

// false → 0
reset();
responders = [{ match: /UPDATE prompt_workflows SET manual_only/, respond: () => [{ affectedRows: 1 }] }];
{
  await svc.setManualOnly('workflow', 5, false);
  assertEq(queryLog[0].params[0], 0, 'false → 0');
}

// Not found
reset();
responders = [{ match: /UPDATE prompt_workflows SET manual_only/, respond: () => [{ affectedRows: 0 }] }];
{
  let caught: any = null;
  try { await svc.setManualOnly('workflow', 999, true); } catch (e) { caught = e; }
  assert(caught !== null, 'not found throws');
}

// ============================================================================
// logAutonomousAction
// ============================================================================
console.log('\n── logAutonomousAction ──────────────────────────────────');

reset();
responders = [{ match: /INSERT INTO system_logs/, respond: () => [{ affectedRows: 1 }] }];
{
  await svc.logAutonomousAction('RELEASE', { target_title: 'test', target_id: 1, mode: 'SAFE_ADVANCE' }, 'SUCCESS');
  assertEq(queryLog[0].params[0], 'INFO', 'SUCCESS → INFO');
  assert(queryLog[0].params[1].includes('Autonomous RELEASE'), 'message');
  assert(queryLog[0].params[1].includes('SAFE_ADVANCE'), 'mode in message');
}

reset();
responders = [{ match: /INSERT INTO system_logs/, respond: () => [{ affectedRows: 1 }] }];
{
  await svc.logAutonomousAction('TRIGGER_EVAL', { target_id: 2, reason: 'timeout' }, 'PAUSED');
  assertEq(queryLog[0].params[0], 'WARN', 'PAUSED → WARN');
  assert(queryLog[0].params[1].includes('PAUSED'), 'message PAUSED');
}

reset();
responders = [{ match: /INSERT INTO system_logs/, respond: () => [{ affectedRows: 1 }] }];
{
  await svc.logAutonomousAction('RELEASE', { block_reason: 'gate G1 failed' }, 'BLOCKED');
  assertEq(queryLog[0].params[0], 'WARN', 'BLOCKED → WARN');
  assert(queryLog[0].params[1].includes('BLOCKED'), 'BLOCKED text');
}

reset();
responders = [{ match: /INSERT INTO system_logs/, respond: () => [{ affectedRows: 1 }] }];
{
  await svc.logAutonomousAction('RELEASE', { error: 'DB down' }, 'ERROR');
  assertEq(queryLog[0].params[0], 'ERROR', 'ERROR → ERROR level');
  assert(queryLog[0].params[1].includes('ERROR'), 'ERROR text');
}

// Error swallowed
reset();
responders = [{ match: /INSERT INTO system_logs/, respond: () => { throw new Error('db down'); } }];
quiet();
{
  // Should not throw
  await svc.logAutonomousAction('RELEASE', { mode: 'OFF' });
  loud();
  assert(true, 'log error swallowed');
}

// ============================================================================
// getLogs
// ============================================================================
console.log('\n── getLogs ──────────────────────────────────────────────');

reset();
responders = [{ match: /FROM system_logs\s+WHERE source = 'autonomous_advance'/, respond: () => [[
  { timestamp: 't1', level: 'INFO', message: 'm1', meta: '{"x":1}' },
  { timestamp: 't2', level: 'WARN', message: 'm2', meta: 'bad-json' },
  { timestamp: 't3', level: 'ERROR', message: 'm3', meta: null },
]] }];
{
  const r = await svc.getLogs();
  assertEq(r.length, 3, '3 rows');
  assertEq(r[0].meta, { x: 1 }, 'parsed JSON');
  assertEq(r[1].meta, null, 'bad JSON → null');
  assertEq(r[2].meta, null, 'null meta preserved');
  assertEq(queryLog[0].params, [50], 'default limit 50');
}

reset();
responders = [{ match: /FROM system_logs/, respond: () => [[]] }];
{
  await svc.getLogs(10);
  assertEq(queryLog[0].params, [10], 'custom limit');
}

// ============================================================================
// hasCriticalLearningConflict
// ============================================================================
console.log('\n── hasCriticalLearningConflict ──────────────────────────');

{
  // Null component → false (no query)
  reset();
  const r = await svc.hasCriticalLearningConflict(null);
  assertEq(r, false, 'null → false');
  assertEq(queryLog.length, 0, 'no query');
}

reset();
responders = [{ match: /FROM workflow_learning_registry/, respond: () => [[{ cnt: 3 }]] }];
{
  const r = await svc.hasCriticalLearningConflict('authService');
  assertEq(r, true, 'count>0 → true');
  assertEq(queryLog[0].params, ['%"authService"%'], 'LIKE pattern');
}

reset();
responders = [{ match: /FROM workflow_learning_registry/, respond: () => [[{ cnt: 0 }]] }];
{
  const r = await svc.hasCriticalLearningConflict('authService');
  assertEq(r, false, 'count=0 → false');
}

// ============================================================================
// getCorrectionCount
// ============================================================================
console.log('\n── getCorrectionCount ───────────────────────────────────');

{
  reset();
  const r = await svc.getCorrectionCount(null);
  assertEq(r, 0, 'null → 0');
  assertEq(queryLog.length, 0, 'no query');
}

reset();
responders = [{ match: /FROM om_prompt_registry/, respond: () => [[{ cnt: '4' }]] }];
{
  const r = await svc.getCorrectionCount(42);
  assertEq(r, 4, 'Number coerced');
  assertEq(queryLog[0].params, [42], 'id param');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
