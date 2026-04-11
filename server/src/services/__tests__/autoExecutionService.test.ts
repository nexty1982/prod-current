#!/usr/bin/env npx tsx
/**
 * Unit tests for services/autoExecutionService.js (OMD-1243)
 *
 * Deterministic tests for the auto-execution loop service:
 *   - releasePrompt: idempotent (already released), guard checks for
 *     missing, escalation, degradation, queue_status, and happy path
 *   - _getRegistryFingerprint: format from query row
 *   - _getAutonomyFingerprint: composite from three queries
 *   - _describeAutonomyTrigger: delta parsing
 *   - runOnce:
 *     · disabled (policy.enabled=false) — short-circuit + recordRun
 *     · mode OFF
 *     · no fingerprint change (skips without recordRun)
 *     · release path runs decisionEngine + policy eligibility,
 *       executes release on eligible, logs to system_logs
 *     · autonomy path calls autonomousAdvance
 *     · fatal error swallowed, recordRun called, logExecution(FATAL_ERROR)
 *   - logExecution: maps level, writes system_logs row (or swallows error)
 *   - getLogs: parses meta JSON
 *   - start/stop/isLoopRunning/isExecuting lifecycle
 *
 * All 5 deps (db, policyService, decisionEngine, autonomousAdvance,
 * promptProgression) stubbed via require.cache.
 *
 * Run: npx tsx server/src/services/__tests__/autoExecutionService.test.ts
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

// ─── Fake pool ──────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Responder = {
  match: RegExp;
  respond: (params: any[]) => any;
};
let responders: Responder[] = [];
let queryThrows = false;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (queryThrows) throw new Error('fake db failure');
    for (const r of responders) {
      if (r.match.test(sql)) {
        return [r.respond(params)];
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

// ─── Stubs for sibling services ────────────────────────────────────
const policyCalls: any[] = [];
let policyStatus: any = { enabled: true, mode: 'AUTO' };
let policyRecordRunArgs: any[] = [];
let policyEligibility: any = { eligible: true, passed_count: 3, total_rules: 3, failures: [] };

const policyStub = {
  MODE: { OFF: 'OFF', AUTO: 'AUTO', DRY_RUN: 'DRY_RUN' },
  getStatus: async () => {
    policyCalls.push({ fn: 'getStatus' });
    return policyStatus;
  },
  recordRun: async (r: any) => {
    policyRecordRunArgs.push(r);
  },
  evaluateEligibility: (rec: any, prompt: any, mode: any) => {
    policyCalls.push({ fn: 'evaluateEligibility', rec, prompt, mode });
    return policyEligibility;
  },
  hasChainStepFailure: async (_prompt: any) => false,
};
const policyPath = require.resolve('../autoExecutionPolicyService');
require.cache[policyPath] = {
  id: policyPath, filename: policyPath, loaded: true, exports: policyStub,
} as any;

let decisionRecs: any = { actions: [] };
const decisionStub = {
  getRecommendations: async () => decisionRecs,
};
const decisionPath = require.resolve('../decisionEngineService');
require.cache[decisionPath] = {
  id: decisionPath, filename: decisionPath, loaded: true, exports: decisionStub,
} as any;

let advanceResult: any = {
  skipped: false,
  mode: 'AUTO',
  workflows_inspected: 2,
  actions_taken: [],
  pauses: [],
  errors: [],
};
let advanceThrows = false;
const advanceStub = {
  advanceWorkflows: async () => {
    if (advanceThrows) throw new Error('advance failed');
    return advanceResult;
  },
};
const advancePath = require.resolve('../autonomousAdvanceService');
require.cache[advancePath] = {
  id: advancePath, filename: advancePath, loaded: true, exports: advanceStub,
} as any;

let progressionResult: any = { advanced: 0, transitions: [] };
let progressionThrows = false;
const progressionStub = {
  advanceAll: async () => {
    if (progressionThrows) throw new Error('progression failed');
    return progressionResult;
  },
};
const progressionPath = require.resolve('../promptProgressionService');
require.cache[progressionPath] = {
  id: progressionPath, filename: progressionPath, loaded: true, exports: progressionStub,
} as any;

function resetState() {
  queryLog.length = 0;
  responders = [];
  queryThrows = false;
  policyCalls.length = 0;
  policyStatus = { enabled: true, mode: 'AUTO' };
  policyRecordRunArgs = [];
  policyEligibility = { eligible: true, passed_count: 3, total_rules: 3, failures: [] };
  decisionRecs = { actions: [] };
  advanceResult = {
    skipped: false,
    mode: 'AUTO',
    workflows_inspected: 2,
    actions_taken: [],
    pauses: [],
    errors: [],
  };
  advanceThrows = false;
  progressionResult = { advanced: 0, transitions: [] };
  progressionThrows = false;
}

// Silence noise
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function loud() {
  console.log = origLog;
  console.warn = origWarn;
  console.error = origError;
}

const svc = require('../autoExecutionService');
const {
  runOnce,
  releasePrompt,
  getLogs,
  logExecution,
  start,
  stop,
  isLoopRunning,
  isExecuting,
  _getRegistryFingerprint,
  _getAutonomyFingerprint,
  _describeAutonomyTrigger,
  _resetFingerprints,
} = svc;

async function main() {

// ============================================================================
// _describeAutonomyTrigger — pure
// ============================================================================
console.log('\n── _describeAutonomyTrigger ──────────────────────────────');

assertEq(_describeAutonomyTrigger(null, 'p:5:x|w:2:y:0|l:1:z'), 'initial_run', 'null prev → initial_run');
assertEq(_describeAutonomyTrigger('p:5:x|w:2:y:0|l:1:z', 'p:5:x|w:2:y:0|l:1:z'), 'unknown_change', 'identical → unknown_change');
assertEq(
  _describeAutonomyTrigger('p:5:x|w:2:y:0|l:1:z', 'p:6:x|w:2:y:0|l:1:z'),
  'prompt_state_changed',
  'prompt changed'
);
assertEq(
  _describeAutonomyTrigger('p:5:x|w:2:y:0|l:1:z', 'p:5:x|w:3:y:0|l:1:z'),
  'workflow_state_changed',
  'workflow changed'
);
assertEq(
  _describeAutonomyTrigger('p:5:x|w:2:y:0|l:1:z', 'p:5:x|w:2:y:0|l:2:z'),
  'learning_state_changed',
  'learning changed'
);
{
  const s = _describeAutonomyTrigger('p:5:x|w:2:y:0|l:1:z', 'p:6:x|w:3:y:0|l:2:z');
  assert(s.includes('prompt_state_changed'), 'combined: prompt');
  assert(s.includes('workflow_state_changed'), 'combined: workflow');
  assert(s.includes('learning_state_changed'), 'combined: learning');
}

// ============================================================================
// _getRegistryFingerprint
// ============================================================================
console.log('\n── _getRegistryFingerprint ───────────────────────────────');

resetState();
{
  responders.push({
    match: /queue_status IN \('ready_for_release', 'overdue'\)/,
    respond: () => [{ cnt: 7, max_updated: '2026-04-11T12:00:00Z' }],
  });
  const fp = await _getRegistryFingerprint();
  assertEq(fp, '7:2026-04-11T12:00:00Z', 'fingerprint format');
}

// Null max_updated → "null" literal
resetState();
{
  responders.push({
    match: /queue_status IN \('ready_for_release', 'overdue'\)/,
    respond: () => [{ cnt: 0, max_updated: null }],
  });
  const fp = await _getRegistryFingerprint();
  assertEq(fp, '0:null', 'empty state fingerprint');
}

// ============================================================================
// _getAutonomyFingerprint
// ============================================================================
console.log('\n── _getAutonomyFingerprint ───────────────────────────────');

resetState();
{
  responders.push({
    match: /prompt_workflow_steps/,
    respond: () => [{ cnt: 5, max_prompt_updated: 't1' }],
  });
  responders.push({
    match: /FROM prompt_workflows[\s\S]*WHERE status IN/,
    respond: () => [{ cnt: 3, max_wf_updated: 't2', paused_count: 1 }],
  });
  responders.push({
    match: /FROM workflow_learning_registry/,
    respond: () => [{ cnt: 2, max_learn_updated: 't3' }],
  });
  const fp = await _getAutonomyFingerprint();
  assertEq(fp, 'p:5:t1|w:3:t2:1|l:2:t3', 'composite fingerprint');
}

// With nulls
resetState();
{
  responders.push({
    match: /prompt_workflow_steps/,
    respond: () => [{ cnt: 0, max_prompt_updated: null }],
  });
  responders.push({
    match: /FROM prompt_workflows[\s\S]*WHERE status IN/,
    respond: () => [{ cnt: 0, max_wf_updated: null, paused_count: null }],
  });
  responders.push({
    match: /FROM workflow_learning_registry/,
    respond: () => [{ cnt: 0, max_learn_updated: null }],
  });
  const fp = await _getAutonomyFingerprint();
  assertEq(fp, 'p:0:null|w:0:null:0|l:0:null', 'all-null fingerprint');
}

// ============================================================================
// releasePrompt
// ============================================================================
console.log('\n── releasePrompt ─────────────────────────────────────────');

// Not found
resetState();
{
  responders.push({
    match: /SELECT id, status, queue_status/,
    respond: () => [],
  });
  const r = await releasePrompt('p1', 'test');
  assertEq(r.success, false, 'missing → not success');
  assertEq(r.error, 'Prompt not found', 'missing error');
}

// Already released — idempotent
resetState();
{
  responders.push({
    match: /SELECT id, status, queue_status/,
    respond: () => [{
      id: 'p1', status: 'executing', queue_status: 'released',
      released_for_execution: 1, escalation_required: 0,
      degradation_flag: 0, confidence_level: 0.9,
    }],
  });
  const r = await releasePrompt('p1', 'test');
  assertEq(r.success, true, 'already released → success');
  assertEq(r.already_released, true, 'already_released flag');
  assert(!queryLog.some(q => /^\s*UPDATE/i.test(q.sql)), 'no UPDATE on idempotent');
}

// Escalation required
resetState();
{
  responders.push({
    match: /SELECT id, status, queue_status/,
    respond: () => [{
      id: 'p1', status: 'ready', queue_status: 'ready_for_release',
      released_for_execution: 0, escalation_required: 1,
      degradation_flag: 0, confidence_level: 0.9,
    }],
  });
  const r = await releasePrompt('p1', 'test');
  assertEq(r.success, false, 'escalation → not success');
  assert(r.error.includes('escalation required'), 'escalation error');
}

// Degradation flag
resetState();
{
  responders.push({
    match: /SELECT id, status, queue_status/,
    respond: () => [{
      id: 'p1', status: 'ready', queue_status: 'ready_for_release',
      released_for_execution: 0, escalation_required: 0,
      degradation_flag: 1, confidence_level: 0.9,
    }],
  });
  const r = await releasePrompt('p1', 'test');
  assertEq(r.success, false, 'degradation → not success');
  assert(r.error.includes('degradation'), 'degradation error');
}

// Wrong queue_status
resetState();
{
  responders.push({
    match: /SELECT id, status, queue_status/,
    respond: () => [{
      id: 'p1', status: 'ready', queue_status: 'draft',
      released_for_execution: 0, escalation_required: 0,
      degradation_flag: 0, confidence_level: 0.9,
    }],
  });
  const r = await releasePrompt('p1', 'test');
  assertEq(r.success, false, 'wrong queue_status → not success');
  assert(r.error.includes('draft'), 'includes current status');
}

// Happy path — ready_for_release
resetState();
{
  responders.push({
    match: /SELECT id, status, queue_status/,
    respond: () => [{
      id: 'p1', status: 'ready', queue_status: 'ready_for_release',
      released_for_execution: 0, escalation_required: 0,
      degradation_flag: 0, confidence_level: 0.9,
    }],
  });
  responders.push({
    match: /^\s*UPDATE om_prompt_registry[\s\S]*released_for_execution = 1/,
    respond: () => ({ affectedRows: 1 }),
  });
  const r = await releasePrompt('p1', 'auto');
  assertEq(r.success, true, 'happy: success');
  assertEq(r.new_status, 'executing', 'new_status');
  assertEq(r.new_queue_status, 'released', 'new_queue');
  assertEq(r.previous_status, 'ready', 'previous_status');
  assertEq(r.previous_queue_status, 'ready_for_release', 'previous_queue');
  assertEq(r.reason, 'auto', 'reason passthrough');
}

// Happy path — overdue also valid
resetState();
{
  responders.push({
    match: /SELECT id, status, queue_status/,
    respond: () => [{
      id: 'p1', status: 'ready', queue_status: 'overdue',
      released_for_execution: 0, escalation_required: 0,
      degradation_flag: 0, confidence_level: 0.9,
    }],
  });
  responders.push({
    match: /^\s*UPDATE om_prompt_registry[\s\S]*released_for_execution = 1/,
    respond: () => ({ affectedRows: 1 }),
  });
  const r = await releasePrompt('p1', 'auto');
  assertEq(r.success, true, 'overdue queue_status valid');
}

// ============================================================================
// logExecution
// ============================================================================
console.log('\n── logExecution ──────────────────────────────────────────');

// SUCCESS
resetState();
{
  responders.push({
    match: /INSERT INTO system_logs/,
    respond: () => ({ affectedRows: 1 }),
  });
  await logExecution(
    { prompt_id: 'p1', title: 'T', rule_id: 'r1', policy_mode: 'AUTO' },
    'SUCCESS'
  );
  const q = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql))!;
  assertEq(q.params[0], 'SUCCESS', 'level SUCCESS preserved');
  assert(q.params[1].includes('Auto-released prompt "T"'), 'success message');
  assert(q.params[2].includes('"prompt_id":"p1"'), 'meta JSON');
}

// FAILED → WARN level
resetState();
{
  responders.push({
    match: /INSERT INTO system_logs/,
    respond: () => ({ affectedRows: 1 }),
  });
  await logExecution({ prompt_id: 'p1', title: 'T', error: 'oops' }, 'FAILED');
  const q = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql))!;
  assertEq(q.params[0], 'WARN', 'FAILED → WARN');
  assert(q.params[1].includes('Auto-release FAILED'), 'failed message');
  assert(q.params[1].includes('oops'), 'includes error text');
}

// ERROR → ERROR
resetState();
{
  responders.push({
    match: /INSERT INTO system_logs/,
    respond: () => ({ affectedRows: 1 }),
  });
  await logExecution({ error: 'boom' }, 'ERROR');
  const q = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql))!;
  assertEq(q.params[0], 'ERROR', 'ERROR level');
  assert(q.params[1].includes('Auto-execution error'), 'error message');
}

// FATAL_ERROR → ERROR level too
resetState();
{
  responders.push({
    match: /INSERT INTO system_logs/,
    respond: () => ({ affectedRows: 1 }),
  });
  await logExecution({ error: 'fatal' }, 'FATAL_ERROR');
  const q = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql))!;
  assertEq(q.params[0], 'ERROR', 'FATAL_ERROR → ERROR level');
}

// DB error swallowed
resetState();
quiet();
{
  queryThrows = true;
  let threw = false;
  try {
    await logExecution({ error: 'x' }, 'ERROR');
  } catch { threw = true; }
  loud();
  assert(!threw, 'log DB failure swallowed');
}

// ============================================================================
// getLogs
// ============================================================================
console.log('\n── getLogs ───────────────────────────────────────────────');

resetState();
{
  responders.push({
    match: /FROM system_logs[\s\S]*WHERE source = 'auto_execution'/,
    respond: () => [
      { timestamp: 't1', level: 'SUCCESS', message: 'm1', meta: '{"a":1}' },
      { timestamp: 't2', level: 'WARN', message: 'm2', meta: null },
      { timestamp: 't3', level: 'ERROR', message: 'm3', meta: 'not-json' },
    ],
  });
  const logs = await getLogs(10);
  assertEq(logs.length, 3, '3 logs');
  assertEq(logs[0].meta, { a: 1 }, 'meta parsed');
  assertEq(logs[1].meta, null, 'null meta passthrough');
  assertEq(logs[2].meta, null, 'bad meta → null');
}

// ============================================================================
// runOnce — disabled
// ============================================================================
console.log('\n── runOnce: disabled ─────────────────────────────────────');

resetState();
_resetFingerprints();
{
  policyStatus = { enabled: false, mode: 'AUTO' };
  const r = await runOnce();
  assertEq(r.skipped_reason, 'Auto-execution is disabled', 'disabled reason');
  assertEq(policyRecordRunArgs.length, 1, 'recordRun called once');
}

// ============================================================================
// runOnce — mode OFF
// ============================================================================
console.log('\n── runOnce: mode OFF ─────────────────────────────────────');

resetState();
_resetFingerprints();
{
  policyStatus = { enabled: true, mode: 'OFF' };
  const r = await runOnce();
  assertEq(r.skipped_reason, 'Mode is OFF', 'OFF reason');
  assertEq(policyRecordRunArgs.length, 1, 'recordRun called');
}

// ============================================================================
// runOnce — no state change (skip)
// ============================================================================
console.log('\n── runOnce: no change ────────────────────────────────────');

resetState();
_resetFingerprints();
{
  policyStatus = { enabled: true, mode: 'AUTO' };
  // Both fingerprint queries return the same thing twice
  responders.push({
    match: /queue_status IN \('ready_for_release', 'overdue'\)/,
    respond: () => [{ cnt: 0, max_updated: null }],
  });
  responders.push({
    match: /prompt_workflow_steps/,
    respond: () => [{ cnt: 0, max_prompt_updated: null }],
  });
  responders.push({
    match: /FROM prompt_workflows[\s\S]*WHERE status IN/,
    respond: () => [{ cnt: 0, max_wf_updated: null, paused_count: null }],
  });
  responders.push({
    match: /FROM workflow_learning_registry/,
    respond: () => [{ cnt: 0, max_learn_updated: null }],
  });
  // First call: fingerprints change from null → values (first run)
  const r1 = await runOnce();
  // Second call: fingerprints match → skip
  const r2 = await runOnce();
  assert(r2.skipped_reason && r2.skipped_reason.includes('No state changes'), 'skipped on 2nd');
  // No recordRun on skip
  const recordCountBetween = policyRecordRunArgs.length;
  await runOnce(); // 3rd skip
  assertEq(policyRecordRunArgs.length, recordCountBetween, 'no recordRun on skipped cycles');
}

// ============================================================================
// runOnce — release pipeline happy path
// ============================================================================
console.log('\n── runOnce: release path ────────────────────────────────');

resetState();
_resetFingerprints();
{
  policyStatus = { enabled: true, mode: 'AUTO' };
  // Release fingerprint returns non-zero
  responders.push({
    match: /queue_status IN \('ready_for_release', 'overdue'\)/,
    respond: () => [{ cnt: 1, max_updated: 'ts' }],
  });
  responders.push({
    match: /prompt_workflow_steps/,
    respond: () => [{ cnt: 0, max_prompt_updated: null }],
  });
  responders.push({
    match: /FROM prompt_workflows[\s\S]*WHERE status IN/,
    respond: () => [{ cnt: 0, max_wf_updated: null, paused_count: null }],
  });
  responders.push({
    match: /FROM workflow_learning_registry/,
    respond: () => [{ cnt: 0, max_learn_updated: null }],
  });
  // Second query: full prompt row for eligibility
  responders.push({
    match: /^SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: (params: any[]) => [{
      id: params[0], title: 'Test', component: 'comp',
      status: 'ready', queue_status: 'ready_for_release',
      released_for_execution: 0, escalation_required: 0,
      degradation_flag: 0, confidence_level: 0.9,
    }],
  });
  // releasePrompt's SELECT
  responders.push({
    match: /SELECT id, status, queue_status/,
    respond: (params: any[]) => [{
      id: params[0], status: 'ready', queue_status: 'ready_for_release',
      released_for_execution: 0, escalation_required: 0,
      degradation_flag: 0, confidence_level: 0.9,
    }],
  });
  responders.push({
    match: /^\s*UPDATE om_prompt_registry[\s\S]*released_for_execution = 1/,
    respond: () => ({ affectedRows: 1 }),
  });
  responders.push({
    match: /INSERT INTO system_logs/,
    respond: () => ({ affectedRows: 1 }),
  });

  decisionRecs = {
    actions: [
      { action: 'RELEASE_NOW', target: { prompt_id: 'p1' }, reason: 'overdue', rule_id: 'R1' },
      { action: 'WAIT', target: { prompt_id: 'p2' }, reason: 'ok', rule_id: 'R2' },
    ],
  };

  const r = await runOnce();
  assertEq(r.evaluated, 1, '1 evaluated (only RELEASE_NOW)');
  assertEq(r.eligible, 1, '1 eligible');
  assertEq(r.executed.length, 1, '1 executed');
  assertEq(r.executed[0].prompt_id, 'p1', 'executed p1');
  assertEq(r.executed[0].action, 'RELEASE_NOW', 'action recorded');
  assertEq(r.errors.length, 0, 'no errors');
  assert(r.trigger.release_changed, 'trigger.release_changed');
  assert(policyRecordRunArgs.length >= 1, 'recordRun called');
}

// ============================================================================
// runOnce — eligibility rejection
// ============================================================================
console.log('\n── runOnce: eligibility rejection ────────────────────────');

resetState();
_resetFingerprints();
{
  policyStatus = { enabled: true, mode: 'AUTO' };
  policyEligibility = { eligible: false, failures: ['rule X failed'], passed_count: 2, total_rules: 3 };
  responders.push({
    match: /queue_status IN \('ready_for_release', 'overdue'\)/,
    respond: () => [{ cnt: 1, max_updated: 'ts' }],
  });
  responders.push({
    match: /prompt_workflow_steps/,
    respond: () => [{ cnt: 0, max_prompt_updated: null }],
  });
  responders.push({
    match: /FROM prompt_workflows[\s\S]*WHERE status IN/,
    respond: () => [{ cnt: 0, max_wf_updated: null, paused_count: null }],
  });
  responders.push({
    match: /FROM workflow_learning_registry/,
    respond: () => [{ cnt: 0, max_learn_updated: null }],
  });
  responders.push({
    match: /^SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: (params: any[]) => [{
      id: params[0], title: 'T', component: 'c',
      status: 'ready', queue_status: 'ready_for_release',
      released_for_execution: 0, escalation_required: 0,
      degradation_flag: 0,
    }],
  });
  decisionRecs = {
    actions: [{ action: 'RELEASE_NOW', target: { prompt_id: 'p1' }, reason: 'x', rule_id: 'R1' }],
  };

  const r = await runOnce();
  assertEq(r.evaluated, 1, '1 evaluated');
  assertEq(r.eligible, 0, '0 eligible');
  assertEq(r.skipped.length, 1, '1 skipped');
  assertEq(r.executed.length, 0, '0 executed');
  assertEq(r.skipped[0].prompt_id, 'p1', 'skip records prompt_id');
  assertEq(r.skipped[0].failures, ['rule X failed'], 'skip records failures');
}

// ============================================================================
// runOnce — prompt missing during eligibility check
// ============================================================================
console.log('\n── runOnce: missing prompt ───────────────────────────────');

resetState();
_resetFingerprints();
{
  policyStatus = { enabled: true, mode: 'AUTO' };
  responders.push({
    match: /queue_status IN \('ready_for_release', 'overdue'\)/,
    respond: () => [{ cnt: 1, max_updated: 'ts' }],
  });
  responders.push({
    match: /prompt_workflow_steps/,
    respond: () => [{ cnt: 0, max_prompt_updated: null }],
  });
  responders.push({
    match: /FROM prompt_workflows[\s\S]*WHERE status IN/,
    respond: () => [{ cnt: 0, max_wf_updated: null, paused_count: null }],
  });
  responders.push({
    match: /FROM workflow_learning_registry/,
    respond: () => [{ cnt: 0, max_learn_updated: null }],
  });
  responders.push({
    match: /^SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => [],
  });
  decisionRecs = {
    actions: [{ action: 'RELEASE_NOW', target: { prompt_id: 'ghost' }, reason: 'x', rule_id: 'R1' }],
  };

  const r = await runOnce();
  assertEq(r.errors.length, 1, '1 error');
  assert(r.errors[0].error.includes('not found'), 'error message');
  assertEq(r.executed.length, 0, 'nothing executed');
}

// ============================================================================
// runOnce — autonomy path
// ============================================================================
console.log('\n── runOnce: autonomy path ────────────────────────────────');

resetState();
_resetFingerprints();
{
  policyStatus = { enabled: true, mode: 'AUTO' };
  // Release fingerprint stays empty (no release work)
  responders.push({
    match: /queue_status IN \('ready_for_release', 'overdue'\)/,
    respond: () => [{ cnt: 0, max_updated: null }],
  });
  // Autonomy fingerprint has non-zero prompt state
  responders.push({
    match: /prompt_workflow_steps/,
    respond: () => [{ cnt: 3, max_prompt_updated: 'ts' }],
  });
  responders.push({
    match: /FROM prompt_workflows[\s\S]*WHERE status IN/,
    respond: () => [{ cnt: 1, max_wf_updated: 'ts', paused_count: 0 }],
  });
  responders.push({
    match: /FROM workflow_learning_registry/,
    respond: () => [{ cnt: 0, max_learn_updated: null }],
  });

  advanceResult = {
    skipped: false,
    mode: 'AUTO',
    workflows_inspected: 2,
    actions_taken: [{ workflow_id: 'w1', action: 'advance' }],
    pauses: [],
    errors: [],
  };

  const r = await runOnce();
  assert(r.trigger.autonomy_changed, 'autonomy_changed trigger');
  assert(r.autonomy, 'autonomy result present');
  assertEq(r.autonomy.workflows_inspected, 2, 'workflows_inspected');
  assertEq(r.autonomy.actions_taken, 1, 'actions_taken count');
  assertEq(r.autonomy.details.length, 1, 'details populated');
  assertEq(r.autonomy.trigger, 'state_change', 'trigger label');
}

// ============================================================================
// runOnce — autonomy error swallowed
// ============================================================================
console.log('\n── runOnce: autonomy error ───────────────────────────────');

resetState();
_resetFingerprints();
quiet();
{
  policyStatus = { enabled: true, mode: 'AUTO' };
  responders.push({
    match: /queue_status IN \('ready_for_release', 'overdue'\)/,
    respond: () => [{ cnt: 0, max_updated: null }],
  });
  responders.push({
    match: /prompt_workflow_steps/,
    respond: () => [{ cnt: 3, max_prompt_updated: 'ts' }],
  });
  responders.push({
    match: /FROM prompt_workflows[\s\S]*WHERE status IN/,
    respond: () => [{ cnt: 1, max_wf_updated: 'ts', paused_count: 0 }],
  });
  responders.push({
    match: /FROM workflow_learning_registry/,
    respond: () => [{ cnt: 0, max_learn_updated: null }],
  });
  advanceThrows = true;
  const r = await runOnce();
  loud();
  assertEq(r.autonomy_error, 'advance failed', 'error captured');
}

// ============================================================================
// runOnce — progression called on any trigger
// ============================================================================
console.log('\n── runOnce: progression ──────────────────────────────────');

resetState();
_resetFingerprints();
{
  policyStatus = { enabled: true, mode: 'AUTO' };
  responders.push({
    match: /queue_status IN \('ready_for_release', 'overdue'\)/,
    respond: () => [{ cnt: 1, max_updated: 'ts' }],
  });
  responders.push({
    match: /prompt_workflow_steps/,
    respond: () => [{ cnt: 0, max_prompt_updated: null }],
  });
  responders.push({
    match: /FROM prompt_workflows[\s\S]*WHERE status IN/,
    respond: () => [{ cnt: 0, max_wf_updated: null, paused_count: null }],
  });
  responders.push({
    match: /FROM workflow_learning_registry/,
    respond: () => [{ cnt: 0, max_learn_updated: null }],
  });
  // No release actions to keep it simple
  decisionRecs = { actions: [] };
  progressionResult = {
    advanced: 2,
    transitions: [{ from: 'draft', to: 'audited' }, { from: 'audited', to: 'ready' }],
  };

  const r = await runOnce();
  assert(r.progression, 'progression result present');
  assertEq(r.progression.advanced, 2, 'progression.advanced');
  assertEq(r.progression.transitions.length, 2, 'progression.transitions');
}

// Progression error captured
resetState();
_resetFingerprints();
quiet();
{
  policyStatus = { enabled: true, mode: 'AUTO' };
  responders.push({
    match: /queue_status IN \('ready_for_release', 'overdue'\)/,
    respond: () => [{ cnt: 1, max_updated: 'ts' }],
  });
  responders.push({
    match: /prompt_workflow_steps/,
    respond: () => [{ cnt: 0, max_prompt_updated: null }],
  });
  responders.push({
    match: /FROM prompt_workflows[\s\S]*WHERE status IN/,
    respond: () => [{ cnt: 0, max_wf_updated: null, paused_count: null }],
  });
  responders.push({
    match: /FROM workflow_learning_registry/,
    respond: () => [{ cnt: 0, max_learn_updated: null }],
  });
  decisionRecs = { actions: [] };
  progressionThrows = true;

  const r = await runOnce();
  loud();
  assertEq(r.progression_error, 'progression failed', 'progression error captured');
}

// ============================================================================
// runOnce — mutex: second call returns skipped without actually executing
// ============================================================================
console.log('\n── runOnce: mutex ────────────────────────────────────────');

// We can't easily simulate overlapping without real async delay.
// Instead, verify the mutex guard path by setting _running manually.
// The service doesn't expose _running directly, but we can verify
// the skipped-reason text by inducing a hang via blocking policy fn.
// For simplicity: just verify isExecuting() returns false at rest.
resetState();
{
  assertEq(isExecuting(), false, 'isExecuting=false at rest');
}

// ============================================================================
// runOnce — fatal error path
// ============================================================================
console.log('\n── runOnce: fatal error ──────────────────────────────────');

resetState();
_resetFingerprints();
quiet();
{
  // Make policy.getStatus throw — this will be caught in the outer try
  policyStub.getStatus = async () => { throw new Error('policy boom'); };
  responders.push({
    match: /INSERT INTO system_logs/,
    respond: () => ({ affectedRows: 1 }),
  });
  const r = await runOnce();
  loud();
  assertEq(r.fatal_error, 'policy boom', 'fatal error captured');
  assert(r.duration_ms !== undefined, 'duration_ms set');
  // Restore
  policyStub.getStatus = async () => {
    policyCalls.push({ fn: 'getStatus' });
    return policyStatus;
  };
}

// ============================================================================
// Loop lifecycle
// ============================================================================
console.log('\n── Loop lifecycle ────────────────────────────────────────');

resetState();
_resetFingerprints();
quiet();
{
  assertEq(isLoopRunning(), false, 'loop not running initially');
  start(10000);
  assertEq(isLoopRunning(), true, 'loop running after start');
  // Second call should not create new timer (idempotent)
  start(10000);
  assertEq(isLoopRunning(), true, 'still running after second start');
  stop();
  assertEq(isLoopRunning(), false, 'loop stopped');
  // Stop is idempotent
  stop();
  assertEq(isLoopRunning(), false, 'stop idempotent');
  loud();
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
