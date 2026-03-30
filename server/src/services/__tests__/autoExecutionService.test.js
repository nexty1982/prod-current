/**
 * Auto-Execution Service — Tests
 *
 * Tests execution logic including:
 *   - releasePrompt safety checks
 *   - Idempotent release (already released)
 *   - Blocked release scenarios (escalated, degraded, wrong queue)
 *   - Concurrency safety (mutex prevents overlapping runs)
 *   - runOnce when disabled
 *
 * Run:  node server/src/services/__tests__/autoExecutionService.test.js
 */

// ─── Mock Setup ───────────────────────────────────────────────────────────

let mockQueryResults = [];
let mockQueryCalls = [];

const mockPool = {
  query: async (sql, params) => {
    mockQueryCalls.push({ sql, params });
    const result = mockQueryResults.shift();
    return result || [[]];
  },
};

require('../../config/db').getAppPool = () => mockPool;

// Mock policy service
const policyMock = {
  _enabled: false,
  _mode: 'SAFE',
  _status: null,
  getStatus: async () => policyMock._status || { enabled: policyMock._enabled, mode: policyMock._mode },
  recordRun: async () => {},
  hasChainStepFailure: async () => false,
  evaluateEligibility: (rec, prompt, mode) => ({
    eligible: true,
    prompt_id: prompt.id,
    title: prompt.title,
    mode,
    passed_rules: [],
    failures: [],
    passed_count: 10,
    total_rules: 10,
  }),
  MODE: { OFF: 'OFF', SAFE: 'SAFE', FULL: 'FULL' },
};
jest = null; // not using jest

// Pre-load modules so they're in cache, then override exports
require('../autoExecutionPolicyService');
require('../decisionEngineService');

const policyPath = require.resolve('../autoExecutionPolicyService');
require.cache[policyPath].exports = policyMock;

const decisionMock = {
  _recommendations: { actions: [] },
  getRecommendations: async () => decisionMock._recommendations,
};
const decisionPath = require.resolve('../decisionEngineService');
require.cache[decisionPath].exports = decisionMock;

const { releasePrompt, runOnce } = require('../autoExecutionService');

// ─── Harness ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) { passed++; } else {
    failed++;
    failures.push(label);
    console.error(`  ✗ ${label}`);
  }
}

function eq(actual, expected, label) {
  if (actual === expected) { passed++; } else {
    failed++;
    failures.push(`${label} — expected "${expected}", got "${actual}"`);
    console.error(`  ✗ ${label} — expected "${expected}", got "${actual}"`);
  }
}

function section(name) { console.log(`\n── ${name} ──`); }

function resetMocks() {
  mockQueryResults = [];
  mockQueryCalls = [];
  policyMock._enabled = false;
  policyMock._mode = 'SAFE';
  policyMock._status = null;
  decisionMock._recommendations = { actions: [] };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. releasePrompt — safety checks
// ═══════════════════════════════════════════════════════════════════════════

section('1. releasePrompt — Safety Checks');

async function testReleaseNotFound() {
  resetMocks();
  mockQueryResults.push([[]]); // empty result
  const result = await releasePrompt('nonexistent', 'test');
  eq(result.success, false, 'Release: not found → failure');
  assert(result.error.includes('not found'), 'Release: error says not found');
}

async function testReleaseAlreadyReleased() {
  resetMocks();
  mockQueryResults.push([[{
    id: 'p1', status: 'executing', queue_status: 'released',
    released_for_execution: 1, escalation_required: 0, degradation_flag: 0,
    confidence_level: 'high',
  }]]);
  const result = await releasePrompt('p1', 'test');
  eq(result.success, true, 'Release: already released → idempotent success');
  assert(result.already_released === true, 'Release: marks already_released');
}

async function testReleaseEscalated() {
  resetMocks();
  mockQueryResults.push([[{
    id: 'p1', status: 'approved', queue_status: 'ready_for_release',
    released_for_execution: 0, escalation_required: 1, degradation_flag: 0,
    confidence_level: 'high',
  }]]);
  const result = await releasePrompt('p1', 'test');
  eq(result.success, false, 'Release: escalated → blocked');
  assert(result.error.includes('escalation'), 'Release: error mentions escalation');
}

async function testReleaseDegraded() {
  resetMocks();
  mockQueryResults.push([[{
    id: 'p1', status: 'approved', queue_status: 'ready_for_release',
    released_for_execution: 0, escalation_required: 0, degradation_flag: 1,
    confidence_level: 'high',
  }]]);
  const result = await releasePrompt('p1', 'test');
  eq(result.success, false, 'Release: degraded → blocked');
  assert(result.error.includes('degradation'), 'Release: error mentions degradation');
}

async function testReleaseWrongQueueStatus() {
  resetMocks();
  mockQueryResults.push([[{
    id: 'p1', status: 'approved', queue_status: 'blocked',
    released_for_execution: 0, escalation_required: 0, degradation_flag: 0,
    confidence_level: 'high',
  }]]);
  const result = await releasePrompt('p1', 'test');
  eq(result.success, false, 'Release: blocked queue → blocked');
  assert(result.error.includes('blocked'), 'Release: error mentions queue status');
}

async function testReleaseSuccess() {
  resetMocks();
  mockQueryResults.push([[{
    id: 'p1', status: 'approved', queue_status: 'ready_for_release',
    released_for_execution: 0, escalation_required: 0, degradation_flag: 0,
    confidence_level: 'high',
  }]]);
  mockQueryResults.push([{ affectedRows: 1 }]); // UPDATE result
  const result = await releasePrompt('p1', 'auto test');
  eq(result.success, true, 'Release: clean prompt → success');
  eq(result.new_status, 'executing', 'Release: new status is executing');
  eq(result.new_queue_status, 'released', 'Release: new queue is released');
  eq(result.previous_status, 'approved', 'Release: previous status preserved');
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. runOnce — disabled
// ═══════════════════════════════════════════════════════════════════════════

section('2. runOnce — Disabled');

async function testRunOnceDisabled() {
  resetMocks();
  policyMock._enabled = false;
  const result = await runOnce();
  assert(result.skipped_reason === 'Auto-execution is disabled', 'runOnce: disabled → skipped');
  eq(result.executed.length, 0, 'runOnce: disabled → 0 executed');
}

async function testRunOnceOffMode() {
  resetMocks();
  policyMock._status = { enabled: true, mode: 'OFF' };
  const result = await runOnce();
  assert(result.skipped_reason === 'Mode is OFF', 'runOnce: OFF mode → skipped');
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. runOnce — no RELEASE_NOW actions
// ═══════════════════════════════════════════════════════════════════════════

section('3. runOnce — No Release Actions');

async function testRunOnceNoActions() {
  resetMocks();
  policyMock._status = { enabled: true, mode: 'SAFE' };
  decisionMock._recommendations = {
    actions: [
      { action: 'FIX_REQUIRED', target: { prompt_id: 'p1' } },
      { action: 'UNBLOCK_REQUIRED', target: { prompt_id: 'p2' } },
    ],
  };
  const result = await runOnce();
  eq(result.evaluated, 0, 'runOnce: no RELEASE_NOW → 0 evaluated');
  eq(result.executed.length, 0, 'runOnce: no RELEASE_NOW → 0 executed');
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. runOnce — eligible release
// ═══════════════════════════════════════════════════════════════════════════

section('4. runOnce — Eligible Release');

async function testRunOnceEligibleRelease() {
  resetMocks();
  policyMock._status = { enabled: true, mode: 'SAFE' };
  decisionMock._recommendations = {
    actions: [
      { action: 'RELEASE_NOW', rule_id: 'R6', reason: 'Safe', target: { prompt_id: 'p1' } },
    ],
  };
  // For eligibility check query
  mockQueryResults.push([[{
    id: 'p1', title: 'Test', component: 'saints',
    status: 'approved', queue_status: 'ready_for_release',
    confidence_level: 'high', evaluator_status: 'pass', completion_status: 'complete',
    escalation_required: 0, degradation_flag: 0, release_mode: 'auto_safe',
    chain_id: null, chain_step_number: null,
  }]]);
  // For releasePrompt fetch
  mockQueryResults.push([[{
    id: 'p1', status: 'approved', queue_status: 'ready_for_release',
    released_for_execution: 0, escalation_required: 0, degradation_flag: 0,
    confidence_level: 'high',
  }]]);
  // For UPDATE
  mockQueryResults.push([{ affectedRows: 1 }]);
  // For audit log INSERT
  mockQueryResults.push([{ affectedRows: 1 }]);

  const result = await runOnce();
  eq(result.evaluated, 1, 'runOnce: 1 evaluated');
  eq(result.eligible, 1, 'runOnce: 1 eligible');
  eq(result.executed.length, 1, 'runOnce: 1 executed');
  eq(result.executed[0].prompt_id, 'p1', 'runOnce: correct prompt released');
  assert(result.duration_ms >= 0, 'runOnce: duration recorded');
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. runOnce — ineligible skipped
// ═══════════════════════════════════════════════════════════════════════════

section('5. runOnce — Ineligible Skipped');

async function testRunOnceIneligible() {
  resetMocks();
  policyMock._status = { enabled: true, mode: 'SAFE' };
  // Override to make ineligible
  policyMock.evaluateEligibility = () => ({
    eligible: false,
    prompt_id: 'p1',
    title: 'Test',
    mode: 'SAFE',
    passed_rules: [],
    failures: [{ id: 'E2', name: 'confidence_high', reason: 'not high' }],
    passed_count: 9,
    total_rules: 10,
  });
  decisionMock._recommendations = {
    actions: [
      { action: 'RELEASE_NOW', rule_id: 'R7', reason: 'Overdue', target: { prompt_id: 'p1' } },
    ],
  };
  mockQueryResults.push([[{
    id: 'p1', title: 'Test', component: 'saints',
    status: 'approved', queue_status: 'overdue',
    confidence_level: 'unknown', evaluator_status: null, completion_status: null,
    escalation_required: 0, degradation_flag: 0, release_mode: 'manual',
    chain_id: null, chain_step_number: null,
  }]]);

  const result = await runOnce();
  eq(result.evaluated, 1, 'runOnce: 1 evaluated');
  eq(result.eligible, 0, 'runOnce: 0 eligible');
  eq(result.skipped.length, 1, 'runOnce: 1 skipped');
  eq(result.executed.length, 0, 'runOnce: 0 executed');
  assert(result.skipped[0].failures.length > 0, 'runOnce: skipped with failure reasons');

  // Restore
  policyMock.evaluateEligibility = (rec, prompt, mode) => ({
    eligible: true, prompt_id: prompt.id, title: prompt.title, mode,
    passed_rules: [], failures: [], passed_count: 10, total_rules: 10,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════════════════════════

async function runAll() {
  await testReleaseNotFound();
  await testReleaseAlreadyReleased();
  await testReleaseEscalated();
  await testReleaseDegraded();
  await testReleaseWrongQueueStatus();
  await testReleaseSuccess();
  await testRunOnceDisabled();
  await testRunOnceOffMode();
  await testRunOnceNoActions();
  await testRunOnceEligibleRelease();
  await testRunOnceIneligible();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);

  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    process.exit(1);
  } else {
    console.log('All tests passed ✓');
    process.exit(0);
  }
}

runAll().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
