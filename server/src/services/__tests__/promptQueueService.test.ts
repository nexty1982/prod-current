#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptQueueService.js (OMD-1033)
 *
 * Single source of truth for prompt queue state. All queue_status values are
 * DERIVED from calculateQueueStatus(pool, prompt) — a pure function of the
 * prompt row plus a few DB lookups for dependencies.
 *
 * Test strategy: SQL-routed fake pool stubs `../config/db` via require.cache.
 * Pure logic functions (calculateQueueStatus, isPriorStepClean) are called
 * directly with a minimal fake pool. Other functions exercise the full
 * refresh → persist → recalculate loop.
 *
 * Coverage:
 *   - Constants: PRIORITY_WEIGHT, BLOCK_REASONS
 *   - calculateQueueStatus:
 *       · executing/complete/verified → released
 *       · draft/audited/ready/rejected → pending
 *       · approved + scheduled in future → scheduled
 *       · approved + before release_window_start → scheduled
 *       · approved + audit not pass → blocked(AUDIT_NOT_PASSED)
 *       · approved + ready with all gates met → ready_for_release
 *       · approved + ready + overdue schedule → overdue
 *       · approved + past window_end → overdue flag set
 *       · sequence dep: predecessor not verified → blocked(SEQUENCE_NOT_VERIFIED)
 *       · sequence dep: predecessor verified → not blocked
 *       · explicit dep not found → blocked(DEPENDENCY_NOT_FOUND)
 *       · explicit dep not verified → blocked(EXPLICIT_DEP_NOT_VERIFIED)
 *       · multiple blockers stack
 *       · overdue + blocked → stays blocked
 *   - persistQueueState: UPDATE with serialized blocked_reasons
 *   - refreshQueueStatus: not found → throw; happy path returns state
 *   - refreshAllQueueStatuses: only updates changed rows
 *   - isEligibleForRelease:
 *       · not eligible → eligible=false, can_auto_release=false
 *       · auto_full + no escalation → auto-releasable
 *       · auto_full + escalation → blocked from auto
 *       · auto_safe + escalation → blocked
 *       · auto_safe + degradation → blocked
 *       · auto_safe + low confidence → blocked
 *       · auto_safe + clean predecessor → auto-releasable
 *       · auto_safe + dirty predecessor → manual required
 *       · manual mode → never auto-released
 *   - isPriorStepClean:
 *       · no predecessor → clean
 *       · evaluator_status != pass → dirty
 *       · completion_status != complete → dirty
 *       · violations found → dirty
 *       · all clean → clean
 *   - schedulePrompt:
 *       · not found → throw
 *       · executing/complete/verified → throw
 *       · rejected → throw
 *       · window_start >= window_end → throw
 *       · unknown dep id → throw
 *       · invalid priority → throw
 *       · invalid release_mode → throw
 *       · invalid dependency_type → throw
 *       · no fields → throw
 *       · happy path: UPDATE + system log + refresh
 *   - validateNoCycle (via schedulePrompt): simple cycle rejected
 *   - getFullQueueStatus: not found → throw; shape check
 *   - getDependencyChain: not found → throw; sequence + explicit merged
 *
 * Run: npx tsx server/src/services/__tests__/promptQueueService.test.ts
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

// ── SQL-routed fake pool ────────────────────────────────────────────
type Route = { match: RegExp; rows?: any; throws?: Error; respond?: (params: any[]) => any };
type Call = { sql: string; params: any[] };

const callLog: Call[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    callLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        if (r.respond) return [r.respond(params)];
        return [r.rows];
      }
    }
    // Default empty result
    return [[]];
  },
};

function resetRoutes() {
  callLog.length = 0;
  routes = [];
}

// ── Stub ../config/db via require.cache ─────────────────────────────
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
    promisePool: fakePool,
  },
} as any;

// ── Silence logs ─────────────────────────────────────────────────────
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

const {
  calculateQueueStatus,
  refreshQueueStatus,
  refreshAllQueueStatuses,
  isEligibleForRelease,
  isPriorStepClean,
  schedulePrompt,
  getFullQueueStatus,
  getDependencyChain,
  PRIORITY_WEIGHT,
  BLOCK_REASONS,
} = require('../promptQueueService');

// ── Helpers ──────────────────────────────────────────────────────────
function basePrompt(overrides: any = {}): any {
  return {
    id: 1,
    title: 'Test prompt',
    status: 'approved',
    audit_status: 'pass',
    sequence_order: 5,
    parent_prompt_id: null,
    dependency_type: 'none',
    depends_on_prompt_id: null,
    scheduled_at: null,
    release_window_start: null,
    release_window_end: null,
    priority: 'normal',
    release_mode: 'manual',
    escalation_required: 0,
    degradation_flag: 0,
    confidence_level: 'high',
    quality_score: 85,
    queue_status: 'pending',
    blocked_reasons: null,
    overdue: 0,
    overdue_since: null,
    ...overrides,
  };
}

const futureIso = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString();
const pastIso = () => new Date(Date.now() - 24 * 3600 * 1000).toISOString();

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── constants ─────────────────────────────────────────────');

assertEq(PRIORITY_WEIGHT.critical, 0, 'critical=0');
assertEq(PRIORITY_WEIGHT.high, 1, 'high=1');
assertEq(PRIORITY_WEIGHT.normal, 2, 'normal=2');
assertEq(PRIORITY_WEIGHT.low, 3, 'low=3');

assertEq(BLOCK_REASONS.SEQUENCE_NOT_VERIFIED, 'sequence_not_verified', 'SEQUENCE_NOT_VERIFIED');
assertEq(BLOCK_REASONS.EXPLICIT_DEP_NOT_VERIFIED, 'explicit_dep_not_verified', 'EXPLICIT_DEP_NOT_VERIFIED');
assertEq(BLOCK_REASONS.AUDIT_NOT_PASSED, 'audit_not_passed', 'AUDIT_NOT_PASSED');
assertEq(BLOCK_REASONS.OUTSIDE_RELEASE_WINDOW, 'outside_release_window', 'OUTSIDE_RELEASE_WINDOW');
assertEq(BLOCK_REASONS.DEPENDENCY_NOT_FOUND, 'dependency_not_found', 'DEPENDENCY_NOT_FOUND');

// ============================================================================
// calculateQueueStatus — released states
// ============================================================================
console.log('\n── calculateQueueStatus: released ────────────────────────');

for (const st of ['executing', 'complete', 'verified']) {
  resetRoutes();
  const s = await calculateQueueStatus(fakePool, basePrompt({ status: st }));
  assertEq(s.queue_status, 'released', `${st} → released`);
  assert(s.explanation.includes(st), `explanation mentions ${st}`);
  assertEq(callLog.length, 0, `${st}: no DB calls (short-circuit)`);
}

// ============================================================================
// calculateQueueStatus — pending states
// ============================================================================
console.log('\n── calculateQueueStatus: pending ─────────────────────────');

for (const st of ['draft', 'audited', 'ready', 'rejected']) {
  resetRoutes();
  const s = await calculateQueueStatus(fakePool, basePrompt({ status: st }));
  assertEq(s.queue_status, 'pending', `${st} → pending`);
  assertEq(s.blocked_reasons, [], 'no blockers');
}

// ============================================================================
// calculateQueueStatus — scheduled in the future
// ============================================================================
console.log('\n── calculateQueueStatus: scheduled future ────────────────');

resetRoutes();
{
  const s = await calculateQueueStatus(fakePool, basePrompt({ scheduled_at: futureIso() }));
  assertEq(s.queue_status, 'scheduled', 'future schedule → scheduled');
  assertEq(s.overdue, false, 'not overdue');
}

// ============================================================================
// calculateQueueStatus — before release window start
// ============================================================================
console.log('\n── calculateQueueStatus: before window ───────────────────');

resetRoutes();
{
  const s = await calculateQueueStatus(fakePool, basePrompt({ release_window_start: futureIso() }));
  assertEq(s.queue_status, 'scheduled', 'before window → scheduled');
  assert(s.explanation.includes('Before release window'), 'explanation');
}

// ============================================================================
// calculateQueueStatus — audit not passed
// ============================================================================
console.log('\n── calculateQueueStatus: audit not passed ────────────────');

resetRoutes();
{
  const s = await calculateQueueStatus(fakePool, basePrompt({ audit_status: 'fail' }));
  assertEq(s.queue_status, 'blocked', 'blocked');
  assertEq(s.blocked_reasons.length, 1, '1 blocker');
  assertEq(s.blocked_reasons[0].code, BLOCK_REASONS.AUDIT_NOT_PASSED, 'AUDIT_NOT_PASSED');
}

// pending audit also blocks
resetRoutes();
{
  const s = await calculateQueueStatus(fakePool, basePrompt({ audit_status: null }));
  assertEq(s.queue_status, 'blocked', 'null audit → blocked');
  assertEq(s.blocked_reasons[0].code, BLOCK_REASONS.AUDIT_NOT_PASSED, 'AUDIT_NOT_PASSED');
}

// ============================================================================
// calculateQueueStatus — ready for release
// ============================================================================
console.log('\n── calculateQueueStatus: ready ───────────────────────────');

resetRoutes();
{
  const s = await calculateQueueStatus(fakePool, basePrompt());
  assertEq(s.queue_status, 'ready_for_release', 'ready');
  assertEq(s.blocked_reasons, [], 'no blockers');
  assertEq(s.overdue, false, 'not overdue');
  assert(s.explanation.includes('All constraints satisfied'), 'explanation');
}

// ============================================================================
// calculateQueueStatus — overdue (ready but past scheduled_at)
// ============================================================================
console.log('\n── calculateQueueStatus: overdue ─────────────────────────');

resetRoutes();
{
  const past = pastIso();
  const s = await calculateQueueStatus(fakePool, basePrompt({ scheduled_at: past }));
  assertEq(s.queue_status, 'overdue', 'ready but past → overdue');
  assertEq(s.overdue, true, 'overdue flag');
  assertEq(s.overdue_since, past, 'overdue_since');
}

// ============================================================================
// calculateQueueStatus — past release_window_end
// ============================================================================
console.log('\n── calculateQueueStatus: past window_end ─────────────────');

resetRoutes();
{
  const past = pastIso();
  const s = await calculateQueueStatus(fakePool, basePrompt({
    release_window_start: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    release_window_end: past,
  }));
  // ready + overdue flag → promoted to 'overdue'
  assertEq(s.queue_status, 'overdue', 'past window_end → overdue');
  assertEq(s.overdue, true, 'overdue flag set');
  assertEq(s.overdue_since, past, 'overdue_since = window_end');
}

// ============================================================================
// calculateQueueStatus — sequence dependency (not verified)
// ============================================================================
console.log('\n── calculateQueueStatus: sequence dep unverified ─────────');

resetRoutes();
routes = [
  {
    match: /sequence_order < \? AND id != \?/,
    rows: [{ id: 4, sequence_order: 4, status: 'complete', title: 'Prev step' }],
  },
];
{
  const s = await calculateQueueStatus(fakePool, basePrompt({ dependency_type: 'sequence' }));
  assertEq(s.queue_status, 'blocked', 'blocked');
  assertEq(s.blocked_reasons[0].code, BLOCK_REASONS.SEQUENCE_NOT_VERIFIED, 'SEQUENCE_NOT_VERIFIED');
  assert(s.blocked_reasons[0].detail.includes('Prev step'), 'detail mentions predecessor');
}

// Sequence dep verified → not blocked
resetRoutes();
routes = [
  {
    match: /sequence_order < \? AND id != \?/,
    rows: [{ id: 4, sequence_order: 4, status: 'verified', title: 'Prev step' }],
  },
];
{
  const s = await calculateQueueStatus(fakePool, basePrompt({ dependency_type: 'sequence' }));
  assertEq(s.queue_status, 'ready_for_release', 'ready');
}

// Sequence dep but no predecessor → not blocked
resetRoutes();
routes = [
  { match: /sequence_order < \? AND id != \?/, rows: [] },
];
{
  const s = await calculateQueueStatus(fakePool, basePrompt({ dependency_type: 'sequence' }));
  assertEq(s.queue_status, 'ready_for_release', 'no predecessor → ready');
}

// ============================================================================
// calculateQueueStatus — explicit dependency
// ============================================================================
console.log('\n── calculateQueueStatus: explicit dep ────────────────────');

// Dep not found
resetRoutes();
routes = [
  { match: /sequence_order < \? AND id != \?/, rows: [] },
  { match: /SELECT id, status, title FROM om_prompt_registry WHERE id = \?/, rows: [] },
];
{
  const s = await calculateQueueStatus(fakePool, basePrompt({
    dependency_type: 'explicit',
    depends_on_prompt_id: 99,
  }));
  assertEq(s.queue_status, 'blocked', 'blocked');
  assertEq(s.blocked_reasons[0].code, BLOCK_REASONS.DEPENDENCY_NOT_FOUND, 'DEPENDENCY_NOT_FOUND');
}

// Dep exists but not verified
resetRoutes();
routes = [
  { match: /sequence_order < \? AND id != \?/, rows: [] },
  {
    match: /SELECT id, status, title FROM om_prompt_registry WHERE id = \?/,
    rows: [{ id: 99, status: 'executing', title: 'Dep A' }],
  },
];
{
  const s = await calculateQueueStatus(fakePool, basePrompt({
    dependency_type: 'explicit',
    depends_on_prompt_id: 99,
  }));
  assertEq(s.queue_status, 'blocked', 'blocked');
  assertEq(s.blocked_reasons[0].code, BLOCK_REASONS.EXPLICIT_DEP_NOT_VERIFIED, 'EXPLICIT_DEP_NOT_VERIFIED');
}

// Dep verified → ready
resetRoutes();
routes = [
  { match: /sequence_order < \? AND id != \?/, rows: [] },
  {
    match: /SELECT id, status, title FROM om_prompt_registry WHERE id = \?/,
    rows: [{ id: 99, status: 'verified', title: 'Dep A' }],
  },
];
{
  const s = await calculateQueueStatus(fakePool, basePrompt({
    dependency_type: 'explicit',
    depends_on_prompt_id: 99,
  }));
  assertEq(s.queue_status, 'ready_for_release', 'verified dep → ready');
}

// ============================================================================
// calculateQueueStatus — multiple blockers stack
// ============================================================================
console.log('\n── calculateQueueStatus: multiple blockers ───────────────');

resetRoutes();
routes = [
  {
    match: /sequence_order < \? AND id != \?/,
    rows: [{ id: 4, sequence_order: 4, status: 'complete', title: 'Prev' }],
  },
];
{
  const s = await calculateQueueStatus(fakePool, basePrompt({
    audit_status: 'fail',
    dependency_type: 'sequence',
  }));
  assertEq(s.queue_status, 'blocked', 'blocked');
  assertEq(s.blocked_reasons.length, 2, '2 blockers');
  const codes = s.blocked_reasons.map((r: any) => r.code);
  assert(codes.includes(BLOCK_REASONS.AUDIT_NOT_PASSED), 'audit blocker');
  assert(codes.includes(BLOCK_REASONS.SEQUENCE_NOT_VERIFIED), 'sequence blocker');
}

// ============================================================================
// calculateQueueStatus — overdue + blocked stays blocked
// ============================================================================
console.log('\n── calculateQueueStatus: overdue+blocked ─────────────────');

resetRoutes();
{
  const s = await calculateQueueStatus(fakePool, basePrompt({
    audit_status: 'fail',
    scheduled_at: pastIso(),
  }));
  assertEq(s.queue_status, 'blocked', 'stays blocked');
  assertEq(s.overdue, true, 'overdue flag set');
}

// ============================================================================
// refreshQueueStatus — not found
// ============================================================================
console.log('\n── refreshQueueStatus: not found ─────────────────────────');

resetRoutes();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [] }];
{
  let caught: Error | null = null;
  try { await refreshQueueStatus(999); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('not found'), 'error mentions not found');
}

// Happy path
resetRoutes();
routes = [
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [basePrompt()] },
  { match: /UPDATE om_prompt_registry/, rows: { affectedRows: 1 } },
];
{
  const state = await refreshQueueStatus(1);
  assertEq(state.queue_status, 'ready_for_release', 'state returned');
}

// ============================================================================
// refreshAllQueueStatuses
// ============================================================================
console.log('\n── refreshAllQueueStatuses ───────────────────────────────');

resetRoutes();
{
  const p1 = basePrompt({ id: 1, queue_status: 'pending' });        // will change to ready
  const p2 = basePrompt({ id: 2, queue_status: 'ready_for_release' }); // unchanged
  routes = [
    { match: /SELECT \* FROM om_prompt_registry ORDER BY sequence_order/, rows: [p1, p2] },
    { match: /UPDATE om_prompt_registry/, rows: { affectedRows: 1 } },
  ];
  const r = await refreshAllQueueStatuses();
  assertEq(r.total, 2, 'total 2');
  assertEq(r.updated, 1, 'only 1 updated (p1 changed)');
}

// ============================================================================
// isPriorStepClean
// ============================================================================
console.log('\n── isPriorStepClean ──────────────────────────────────────');

// No predecessor → clean
resetRoutes();
routes = [{ match: /sequence_order < \? AND id != \?/, rows: [] }];
{
  const r = await isPriorStepClean(fakePool, basePrompt());
  assertEq(r.clean, true, 'no predecessor → clean');
  assertEq(r.reason, 'No predecessor', 'reason');
}

// Predecessor fails evaluator
resetRoutes();
routes = [{
  match: /sequence_order < \? AND id != \?/,
  rows: [{ id: 4, title: 'Prev', evaluator_status: 'fail', completion_status: 'complete', violations_found: null }],
}];
{
  const r = await isPriorStepClean(fakePool, basePrompt());
  assertEq(r.clean, false, 'fail evaluator → dirty');
  assert(r.reason.includes('evaluator_status'), 'reason mentions evaluator');
}

// Predecessor incomplete
resetRoutes();
routes = [{
  match: /sequence_order < \? AND id != \?/,
  rows: [{ id: 4, title: 'Prev', evaluator_status: 'pass', completion_status: 'partial', violations_found: null }],
}];
{
  const r = await isPriorStepClean(fakePool, basePrompt());
  assertEq(r.clean, false, 'incomplete → dirty');
  assert(r.reason.includes('completion_status'), 'reason mentions completion');
}

// Predecessor has violations
resetRoutes();
routes = [{
  match: /sequence_order < \? AND id != \?/,
  rows: [{
    id: 4, title: 'Prev',
    evaluator_status: 'pass',
    completion_status: 'complete',
    violations_found: JSON.stringify([{ rule: 'x' }, { rule: 'y' }]),
  }],
}];
{
  const r = await isPriorStepClean(fakePool, basePrompt());
  assertEq(r.clean, false, 'violations → dirty');
  assert(r.reason.includes('2 violation'), 'reason mentions count');
}

// Predecessor all clean
resetRoutes();
routes = [{
  match: /sequence_order < \? AND id != \?/,
  rows: [{
    id: 4, title: 'Prev',
    evaluator_status: 'pass',
    completion_status: 'complete',
    violations_found: null,
  }],
}];
{
  const r = await isPriorStepClean(fakePool, basePrompt());
  assertEq(r.clean, true, 'all clean → clean');
}

// Empty violations array → clean
resetRoutes();
routes = [{
  match: /sequence_order < \? AND id != \?/,
  rows: [{
    id: 4, title: 'Prev',
    evaluator_status: 'pass',
    completion_status: 'complete',
    violations_found: JSON.stringify([]),
  }],
}];
{
  const r = await isPriorStepClean(fakePool, basePrompt());
  assertEq(r.clean, true, 'empty violations → clean');
}

// ============================================================================
// isEligibleForRelease — not found
// ============================================================================
console.log('\n── isEligibleForRelease: not found ───────────────────────');

resetRoutes();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [] }];
{
  let caught: Error | null = null;
  try { await isEligibleForRelease(999); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
}

// ============================================================================
// isEligibleForRelease — not eligible (pending)
// ============================================================================
console.log('\n── isEligibleForRelease: not eligible ────────────────────');

resetRoutes();
routes = [
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [basePrompt({ status: 'draft' })] },
  { match: /UPDATE om_prompt_registry SET queue_status/, rows: { affectedRows: 1 } },
  { match: /UPDATE om_prompt_registry SET last_release_attempt_at/, rows: { affectedRows: 1 } },
];
{
  const r = await isEligibleForRelease(1);
  assertEq(r.eligible, false, 'not eligible');
  assertEq(r.can_auto_release, false, 'cannot auto-release');
  assertEq(r.queue_status, 'pending', 'queue_status pending');
}

// ============================================================================
// isEligibleForRelease — auto_full, no escalation
// ============================================================================
console.log('\n── isEligibleForRelease: auto_full happy ─────────────────');

resetRoutes();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    rows: [basePrompt({ release_mode: 'auto_full', escalation_required: 0 })],
  },
  { match: /UPDATE om_prompt_registry SET queue_status/, rows: { affectedRows: 1 } },
  { match: /UPDATE om_prompt_registry SET last_release_attempt_at/, rows: { affectedRows: 1 } },
];
{
  const r = await isEligibleForRelease(1);
  assertEq(r.eligible, true, 'eligible');
  assertEq(r.can_auto_release, true, 'auto-releasable');
  assert(r.conditions.some((c: string) => c.includes('auto_full')), 'mentions auto_full');
}

// auto_full + escalation → blocked from auto
resetRoutes();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    rows: [basePrompt({ release_mode: 'auto_full', escalation_required: 1 })],
  },
  { match: /UPDATE om_prompt_registry SET queue_status/, rows: { affectedRows: 1 } },
  { match: /UPDATE om_prompt_registry SET last_release_attempt_at/, rows: { affectedRows: 1 } },
];
{
  const r = await isEligibleForRelease(1);
  assertEq(r.eligible, true, 'eligible but');
  assertEq(r.can_auto_release, false, 'NOT auto-releasable (escalation)');
  assertEq(r.escalation_required, true, 'escalation flag');
}

// ============================================================================
// isEligibleForRelease — auto_safe variants
// ============================================================================
console.log('\n── isEligibleForRelease: auto_safe ───────────────────────');

// escalation → blocked
resetRoutes();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    rows: [basePrompt({ release_mode: 'auto_safe', escalation_required: 1 })],
  },
  { match: /UPDATE om_prompt_registry SET queue_status/, rows: { affectedRows: 1 } },
  { match: /UPDATE om_prompt_registry SET last_release_attempt_at/, rows: { affectedRows: 1 } },
];
{
  const r = await isEligibleForRelease(1);
  assertEq(r.can_auto_release, false, 'escalation blocks auto_safe');
}

// degradation → blocked
resetRoutes();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    rows: [basePrompt({ release_mode: 'auto_safe', degradation_flag: 1 })],
  },
  { match: /UPDATE om_prompt_registry SET queue_status/, rows: { affectedRows: 1 } },
  { match: /UPDATE om_prompt_registry SET last_release_attempt_at/, rows: { affectedRows: 1 } },
];
{
  const r = await isEligibleForRelease(1);
  assertEq(r.can_auto_release, false, 'degradation blocks auto_safe');
  assertEq(r.degradation_flag, true, 'degradation flag');
}

// low confidence → blocked
resetRoutes();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    rows: [basePrompt({ release_mode: 'auto_safe', confidence_level: 'low' })],
  },
  { match: /UPDATE om_prompt_registry SET queue_status/, rows: { affectedRows: 1 } },
  { match: /UPDATE om_prompt_registry SET last_release_attempt_at/, rows: { affectedRows: 1 } },
];
{
  const r = await isEligibleForRelease(1);
  assertEq(r.can_auto_release, false, 'low confidence blocks auto_safe');
}

// auto_safe + clean predecessor → auto-releasable
resetRoutes();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    rows: [basePrompt({ release_mode: 'auto_safe', confidence_level: 'high' })],
  },
  { match: /UPDATE om_prompt_registry SET queue_status/, rows: { affectedRows: 1 } },
  // isPriorStepClean lookup
  { match: /sequence_order < \? AND id != \?/, rows: [] },
  { match: /UPDATE om_prompt_registry SET last_release_attempt_at/, rows: { affectedRows: 1 } },
];
{
  const r = await isEligibleForRelease(1);
  assertEq(r.can_auto_release, true, 'auto_safe + clean → auto');
}

// auto_safe + dirty predecessor → manual required
resetRoutes();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    rows: [basePrompt({ release_mode: 'auto_safe', confidence_level: 'high' })],
  },
  { match: /UPDATE om_prompt_registry SET queue_status/, rows: { affectedRows: 1 } },
  {
    match: /sequence_order < \? AND id != \?/,
    rows: [{ id: 4, title: 'Prev', evaluator_status: 'fail', completion_status: 'complete', violations_found: null }],
  },
  { match: /UPDATE om_prompt_registry SET last_release_attempt_at/, rows: { affectedRows: 1 } },
];
{
  const r = await isEligibleForRelease(1);
  assertEq(r.can_auto_release, false, 'dirty predecessor blocks auto_safe');
}

// ============================================================================
// isEligibleForRelease — manual mode never auto-releases
// ============================================================================
console.log('\n── isEligibleForRelease: manual ──────────────────────────');

resetRoutes();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    rows: [basePrompt({ release_mode: 'manual' })],
  },
  { match: /UPDATE om_prompt_registry SET queue_status/, rows: { affectedRows: 1 } },
  { match: /UPDATE om_prompt_registry SET last_release_attempt_at/, rows: { affectedRows: 1 } },
];
{
  const r = await isEligibleForRelease(1);
  assertEq(r.eligible, true, 'eligible');
  assertEq(r.can_auto_release, false, 'manual never auto');
  assert(r.conditions.some((c: string) => c.includes('manual')), 'mentions manual');
}

// ============================================================================
// schedulePrompt — error paths
// ============================================================================
console.log('\n── schedulePrompt: errors ────────────────────────────────');

// Not found
resetRoutes();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [] }];
{
  let caught: Error | null = null;
  try { await schedulePrompt(1, { priority: 'high' }, 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'not found → throws');
}

// Executing → throw
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [basePrompt({ status: 'executing' })],
}];
{
  let caught: Error | null = null;
  try { await schedulePrompt(1, { priority: 'high' }, 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Cannot schedule'), 'executing → throws');
}

// Rejected → throw
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [basePrompt({ status: 'rejected' })],
}];
{
  let caught: Error | null = null;
  try { await schedulePrompt(1, { priority: 'high' }, 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('rejected'), 'rejected → throws');
}

// Invalid window
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [basePrompt({ status: 'draft' })],
}];
{
  let caught: Error | null = null;
  try {
    await schedulePrompt(1, {
      release_window_start: '2026-04-10T00:00:00Z',
      release_window_end: '2026-04-09T00:00:00Z',
    }, 'actor');
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('before'), 'window start >= end → throws');
}

// Unknown dep id
resetRoutes();
let selectCount = 0;
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [basePrompt({ status: 'draft' })],
}, {
  match: /SELECT id FROM om_prompt_registry WHERE id = \?/,
  rows: [],
}];
{
  let caught: Error | null = null;
  try { await schedulePrompt(1, { depends_on_prompt_id: 99 }, 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Dependency prompt not found'), 'dep not found → throws');
}

// Invalid priority
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [basePrompt({ status: 'draft' })],
}];
{
  let caught: Error | null = null;
  try { await schedulePrompt(1, { priority: 'urgent' }, 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Invalid priority'), 'invalid priority → throws');
}

// Invalid release_mode
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [basePrompt({ status: 'draft' })],
}];
{
  let caught: Error | null = null;
  try { await schedulePrompt(1, { release_mode: 'yolo' }, 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Invalid release_mode'), 'invalid release_mode → throws');
}

// Invalid dependency_type
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [basePrompt({ status: 'draft' })],
}];
{
  let caught: Error | null = null;
  try { await schedulePrompt(1, { dependency_type: 'weird' }, 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Invalid dependency_type'), 'invalid dependency_type → throws');
}

// No fields
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [basePrompt({ status: 'draft' })],
}];
{
  let caught: Error | null = null;
  try { await schedulePrompt(1, {}, 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('No scheduling fields'), 'no fields → throws');
}

// ============================================================================
// schedulePrompt — happy path
// ============================================================================
console.log('\n── schedulePrompt: happy path ────────────────────────────');

resetRoutes();
let selectSeen = 0;
routes = [
  {
    match: /^SELECT \* FROM om_prompt_registry WHERE id = \?$/,
    respond: () => {
      selectSeen++;
      // First call = initial fetch; second call = final "return updated" fetch
      return [basePrompt({ status: 'draft', priority: 'normal' })];
    },
  },
  { match: /UPDATE om_prompt_registry SET .* WHERE id = \?/, rows: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/, rows: { insertId: 1 } },
];
quiet();
{
  const result = await schedulePrompt(1, {
    priority: 'high',
    release_mode: 'auto_safe',
    dependency_type: 'sequence',
  }, 'admin@example.com');
  loud();
  assert(result !== null, 'returns prompt');
  // Check that UPDATE was issued
  const updateCall = callLog.find(c => /^UPDATE om_prompt_registry SET /.test(c.sql) && !c.sql.includes('queue_status'));
  assert(updateCall !== undefined, 'update executed');
  assert(updateCall!.sql.includes('priority'), 'sets priority');
  assert(updateCall!.sql.includes('release_mode'), 'sets release_mode');
  assert(updateCall!.sql.includes('dependency_type'), 'sets dependency_type');
  // INSERT system log
  const logCall = callLog.find(c => /INSERT INTO system_logs/.test(c.sql));
  assert(logCall !== undefined, 'system log inserted');
  assertEq(logCall!.params[2], 'admin@example.com', 'actor logged');
}

// ============================================================================
// schedulePrompt — simple cycle detection
// ============================================================================
console.log('\n── schedulePrompt: cycle ─────────────────────────────────');

// Direct self-cycle: prompt 1 depends on 2, we schedule 2 to depend on 1 → cycle
resetRoutes();
let depSelectCount = 0;
routes = [
  {
    match: /^SELECT \* FROM om_prompt_registry WHERE id = \?$/,
    rows: [basePrompt({ id: 2, status: 'draft' })],
  },
  {
    match: /^SELECT id FROM om_prompt_registry WHERE id = \?$/,
    rows: [{ id: 1 }],
  },
  {
    match: /^SELECT depends_on_prompt_id FROM om_prompt_registry WHERE id = \?$/,
    respond: (params: any[]) => {
      // Chain: schedule(2, depends_on=1). Walk from 1 → 1.depends_on = 2 → visited=true → cycle
      depSelectCount++;
      if (params[0] === 1) return [{ depends_on_prompt_id: 2 }];
      return [];
    },
  },
];
{
  let caught: Error | null = null;
  try { await schedulePrompt(2, { depends_on_prompt_id: 1 }, 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'cycle throws');
  assert(caught !== null && caught.message.includes('Circular'), 'error mentions circular');
}

// ============================================================================
// getFullQueueStatus
// ============================================================================
console.log('\n── getFullQueueStatus ────────────────────────────────────');

// Not found
resetRoutes();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [] }];
{
  let caught: Error | null = null;
  try { await getFullQueueStatus(999); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'not found → throws');
}

// Happy shape
resetRoutes();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    rows: [basePrompt({ id: 7, title: 'Hello', priority: 'high' })],
  },
  { match: /UPDATE om_prompt_registry/, rows: { affectedRows: 1 } },
];
{
  const r = await getFullQueueStatus(7);
  assertEq(r.prompt_id, 7, 'prompt_id');
  assertEq(r.title, 'Hello', 'title');
  assertEq(r.status, 'approved', 'status');
  assertEq(r.queue_status, 'ready_for_release', 'queue_status');
  assertEq(r.scheduling.priority, 'high', 'scheduling.priority');
  assert(r.scheduling.release_mode !== undefined, 'scheduling.release_mode present');
}

// ============================================================================
// getDependencyChain
// ============================================================================
console.log('\n── getDependencyChain ────────────────────────────────────');

// Not found
resetRoutes();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [] }];
{
  let caught: Error | null = null;
  try { await getDependencyChain(999); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'not found → throws');
}

// Sequence + explicit chain
resetRoutes();
routes = [
  {
    match: /^SELECT \* FROM om_prompt_registry WHERE id = \?$/,
    rows: [basePrompt({ id: 10, sequence_order: 5, depends_on_prompt_id: 99 })],
  },
  {
    match: /WHERE parent_prompt_id <=> \? AND sequence_order < \? AND id != \?\s*ORDER BY sequence_order ASC/,
    rows: [
      { id: 3, title: 'Step 3', sequence_order: 3, status: 'verified', queue_status: 'released' },
      { id: 4, title: 'Step 4', sequence_order: 4, status: 'complete', queue_status: 'released' },
    ],
  },
  {
    match: /^SELECT id, title, sequence_order, status, queue_status, depends_on_prompt_id/,
    rows: [{ id: 99, title: 'Dep A', sequence_order: 1, status: 'verified', queue_status: 'released', depends_on_prompt_id: null }],
  },
];
{
  const r = await getDependencyChain(10);
  assertEq(r.prompt_id, 10, 'prompt_id');
  assertEq(r.dependencies.length, 3, '2 sequence + 1 explicit');
  assertEq(r.dependencies[0].type, 'sequence', 'first = sequence');
  assertEq(r.dependencies[0].satisfied, true, 'step 3 satisfied');
  assertEq(r.dependencies[1].satisfied, false, 'step 4 not verified → unsatisfied');
  assertEq(r.dependencies[2].type, 'explicit', 'last = explicit');
  assertEq(r.dependencies[2].satisfied, true, 'explicit dep verified');
  assertEq(r.all_satisfied, false, 'overall not satisfied (step 4 not verified)');
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
