#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptQueueService.js (OMD-1120)
 *
 * Covers the calculateQueueStatus state machine (7 output states),
 * isEligibleForRelease with all release modes (manual/auto_safe/auto_full),
 * isPriorStepClean predecessor checks, schedulePrompt validation,
 * validateNoCycle depth + cycle detection, getDependencyChain walking,
 * and the queue query wrappers (getQueue/getNextReady/getBlocked/etc.).
 *
 * ../config/db stubbed via require.cache BEFORE the SUT is required.
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

async function assertThrows(fn: () => Promise<any>, needle: string, message: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${message} — did not throw`); failed++;
  } catch (e: any) {
    if (!needle || (e && e.message && e.message.includes(needle))) {
      console.log(`  PASS: ${message}`); passed++;
    } else {
      console.error(`  FAIL: ${message}\n         expected message to include: ${needle}\n         actual: ${e && e.message}`);
      failed++;
    }
  }
}

// ── Route dispatch pool ─────────────────────────────────────────────
type Route = { match: RegExp; handler: (params: any[]) => any };
let routes: Route[] = [];
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

function dispatch(sql: string, params: any[] = []): any {
  queryLog.push({ sql, params });
  for (const r of routes) {
    if (r.match.test(sql)) return r.handler(params);
  }
  return [[], {}];
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => dispatch(sql, params),
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

function resetAll() {
  routes = [];
  queryLog.length = 0;
}

// Silence console
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

const svc = require('../promptQueueService');

// Build a minimal approved prompt fixture
function approvedPrompt(overrides: any = {}): any {
  return {
    id: 1,
    title: 'Test',
    status: 'approved',
    audit_status: 'pass',
    dependency_type: 'none',
    depends_on_prompt_id: null,
    parent_prompt_id: null,
    sequence_order: 1,
    scheduled_at: null,
    release_window_start: null,
    release_window_end: null,
    release_mode: 'manual',
    priority: 'normal',
    queue_status: 'pending',
    overdue: 0,
    overdue_since: null,
    blocked_reasons: null,
    ...overrides,
  };
}

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(svc.PRIORITY_WEIGHT.critical, 0, 'critical=0');
assertEq(svc.PRIORITY_WEIGHT.low, 3, 'low=3');
assertEq(svc.BLOCK_REASONS.AUDIT_NOT_PASSED, 'audit_not_passed', 'audit reason');
assertEq(svc.BLOCK_REASONS.SEQUENCE_NOT_VERIFIED, 'sequence_not_verified', 'seq reason');
assertEq(svc.BLOCK_REASONS.EXPLICIT_DEP_NOT_VERIFIED, 'explicit_dep_not_verified', 'explicit reason');

// ============================================================================
// calculateQueueStatus — released
// ============================================================================
console.log('\n── calculateQueueStatus: released ────────────────────────');

for (const s of ['executing', 'complete', 'verified']) {
  resetAll();
  const p = approvedPrompt({ status: s });
  const r = await svc.calculateQueueStatus(fakePool, p);
  assertEq(r.queue_status, 'released', `status=${s} → released`);
}

// ============================================================================
// calculateQueueStatus — pending
// ============================================================================
console.log('\n── calculateQueueStatus: pending ─────────────────────────');

for (const s of ['draft', 'audited', 'ready', 'rejected']) {
  resetAll();
  const p = approvedPrompt({ status: s });
  const r = await svc.calculateQueueStatus(fakePool, p);
  assertEq(r.queue_status, 'pending', `status=${s} → pending`);
}

// ============================================================================
// calculateQueueStatus — scheduled (before window start)
// ============================================================================
console.log('\n── calculateQueueStatus: scheduled ───────────────────────');

{
  const future = new Date(Date.now() + 3600_000).toISOString();
  resetAll();
  const p = approvedPrompt({ release_window_start: future });
  const r = await svc.calculateQueueStatus(fakePool, p);
  assertEq(r.queue_status, 'scheduled', 'before window → scheduled');
  assert(r.explanation.includes('Before release window'), 'window explanation');
}

// scheduled (scheduled_at in future)
{
  const future = new Date(Date.now() + 3600_000).toISOString();
  resetAll();
  const p = approvedPrompt({ scheduled_at: future });
  const r = await svc.calculateQueueStatus(fakePool, p);
  assertEq(r.queue_status, 'scheduled', 'future scheduled_at → scheduled');
}

// ============================================================================
// calculateQueueStatus — ready_for_release
// ============================================================================
console.log('\n── calculateQueueStatus: ready_for_release ───────────────');

{
  resetAll();
  const p = approvedPrompt(); // all defaults, no deps, audit=pass
  const r = await svc.calculateQueueStatus(fakePool, p);
  assertEq(r.queue_status, 'ready_for_release', 'no blockers → ready');
  assertEq(r.blocked_reasons.length, 0, 'no reasons');
}

// ============================================================================
// calculateQueueStatus — blocked by audit
// ============================================================================
console.log('\n── calculateQueueStatus: blocked (audit) ─────────────────');

{
  resetAll();
  const p = approvedPrompt({ audit_status: 'pending' });
  const r = await svc.calculateQueueStatus(fakePool, p);
  assertEq(r.queue_status, 'blocked', 'audit pending → blocked');
  assertEq(r.blocked_reasons[0].code, 'audit_not_passed', 'audit reason');
}

// ============================================================================
// calculateQueueStatus — blocked by sequence dependency
// ============================================================================
console.log('\n── calculateQueueStatus: blocked (sequence) ──────────────');

{
  resetAll();
  routes.push({
    match: /sequence_order < \? AND id != \?/i,
    handler: () => [[{ id: 0, sequence_order: 0, status: 'executing', title: 'Prev' }]],
  });
  const p = approvedPrompt({ dependency_type: 'sequence', sequence_order: 2 });
  const r = await svc.calculateQueueStatus(fakePool, p);
  assertEq(r.queue_status, 'blocked', 'predecessor executing → blocked');
  assertEq(r.blocked_reasons[0].code, 'sequence_not_verified', 'seq reason');
}

// sequence dependency satisfied
{
  resetAll();
  routes.push({
    match: /sequence_order < \? AND id != \?/i,
    handler: () => [[{ id: 0, sequence_order: 0, status: 'verified', title: 'Prev' }]],
  });
  const p = approvedPrompt({ dependency_type: 'sequence', sequence_order: 2 });
  const r = await svc.calculateQueueStatus(fakePool, p);
  assertEq(r.queue_status, 'ready_for_release', 'verified predecessor → ready');
}

// sequence with no predecessor
{
  resetAll();
  routes.push({
    match: /sequence_order < \? AND id != \?/i,
    handler: () => [[]],
  });
  const p = approvedPrompt({ dependency_type: 'sequence' });
  const r = await svc.calculateQueueStatus(fakePool, p);
  assertEq(r.queue_status, 'ready_for_release', 'no predecessor → ready');
}

// ============================================================================
// calculateQueueStatus — blocked by explicit dep
// ============================================================================
console.log('\n── calculateQueueStatus: blocked (explicit) ──────────────');

{
  resetAll();
  routes.push({
    match: /sequence_order < \? AND id != \?/i,
    handler: () => [[]],
  });
  routes.push({
    match: /SELECT id, status, title FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[]],
  });
  const p = approvedPrompt({ dependency_type: 'explicit', depends_on_prompt_id: 99 });
  const r = await svc.calculateQueueStatus(fakePool, p);
  assertEq(r.queue_status, 'blocked', 'missing dep → blocked');
  assertEq(r.blocked_reasons[0].code, 'dependency_not_found', 'dep not found');
}

// explicit dep found, not verified
{
  resetAll();
  routes.push({
    match: /sequence_order < \? AND id != \?/i,
    handler: () => [[]],
  });
  routes.push({
    match: /SELECT id, status, title FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[{ id: 99, status: 'audited', title: 'DepTitle' }]],
  });
  const p = approvedPrompt({ dependency_type: 'explicit', depends_on_prompt_id: 99 });
  const r = await svc.calculateQueueStatus(fakePool, p);
  assertEq(r.queue_status, 'blocked', 'unverified dep → blocked');
  assertEq(r.blocked_reasons[0].code, 'explicit_dep_not_verified', 'not verified code');
}

// explicit dep verified
{
  resetAll();
  routes.push({
    match: /sequence_order < \? AND id != \?/i,
    handler: () => [[]],
  });
  routes.push({
    match: /SELECT id, status, title FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[{ id: 99, status: 'verified', title: 'DepTitle' }]],
  });
  const p = approvedPrompt({ dependency_type: 'explicit', depends_on_prompt_id: 99 });
  const r = await svc.calculateQueueStatus(fakePool, p);
  assertEq(r.queue_status, 'ready_for_release', 'verified dep → ready');
}

// ============================================================================
// calculateQueueStatus — overdue
// ============================================================================
console.log('\n── calculateQueueStatus: overdue ─────────────────────────');

{
  const past = new Date(Date.now() - 3600_000).toISOString();
  resetAll();
  const p = approvedPrompt({ scheduled_at: past });
  const r = await svc.calculateQueueStatus(fakePool, p);
  assertEq(r.queue_status, 'overdue', 'past scheduled + ready → overdue');
  assertEq(r.overdue, true, 'overdue=true');
  assertEq(r.overdue_since, past, 'overdue_since set');
}

// overdue + blocked → stays blocked
{
  const past = new Date(Date.now() - 3600_000).toISOString();
  resetAll();
  const p = approvedPrompt({ scheduled_at: past, audit_status: 'pending' });
  const r = await svc.calculateQueueStatus(fakePool, p);
  assertEq(r.queue_status, 'blocked', 'blocked takes precedence');
  assertEq(r.overdue, true, 'still flagged overdue');
}

// past window end → overdue flagged
{
  const past = new Date(Date.now() - 3600_000).toISOString();
  resetAll();
  const p = approvedPrompt({ release_window_end: past });
  const r = await svc.calculateQueueStatus(fakePool, p);
  assert(r.overdue, 'past window end → overdue flag');
}

// ============================================================================
// refreshQueueStatus
// ============================================================================
console.log('\n── refreshQueueStatus ────────────────────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[]],
  });
  await assertThrows(() => svc.refreshQueueStatus(42), 'not found', 'missing throws');
}

resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt()]],
  });
  routes.push({
    match: /UPDATE om_prompt_registry\s+SET queue_status = \?/i,
    handler: () => [{}],
  });
  const r = await svc.refreshQueueStatus(1);
  assertEq(r.queue_status, 'ready_for_release', 'recalculated state');
  const upd = queryLog.find(c => /UPDATE om_prompt_registry\s+SET queue_status = \?/i.test(c.sql));
  assertEq(upd!.params[0], 'ready_for_release', 'persisted queue_status');
}

// ============================================================================
// refreshAllQueueStatuses
// ============================================================================
console.log('\n── refreshAllQueueStatuses ───────────────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry ORDER BY sequence_order/i,
    handler: () => [[
      approvedPrompt({ id: 1, queue_status: 'pending' }), // will change → ready
      approvedPrompt({ id: 2, queue_status: 'ready_for_release' }), // unchanged
    ]],
  });
  routes.push({
    match: /UPDATE om_prompt_registry\s+SET queue_status = \?/i,
    handler: () => [{}],
  });
  const r = await svc.refreshAllQueueStatuses();
  assertEq(r.total, 2, 'total=2');
  assertEq(r.updated, 1, 'only 1 changed');
}

// ============================================================================
// isPriorStepClean
// ============================================================================
console.log('\n── isPriorStepClean ──────────────────────────────────────');

resetAll();
{
  routes.push({
    match: /evaluator_status, completion_status, violations_found/i,
    handler: () => [[]],
  });
  const r = await svc.isPriorStepClean(fakePool, approvedPrompt({ sequence_order: 1 }));
  assertEq(r.clean, true, 'no predecessor → clean');
}

resetAll();
{
  routes.push({
    match: /evaluator_status, completion_status, violations_found/i,
    handler: () => [[{ id: 0, title: 'P', evaluator_status: 'fail', completion_status: 'complete', violations_found: null }]],
  });
  const r = await svc.isPriorStepClean(fakePool, approvedPrompt({ sequence_order: 2 }));
  assertEq(r.clean, false, 'evaluator fail → not clean');
  assert(r.reason.includes('evaluator_status'), 'reason mentions evaluator');
}

resetAll();
{
  routes.push({
    match: /evaluator_status, completion_status, violations_found/i,
    handler: () => [[{ id: 0, title: 'P', evaluator_status: 'pass', completion_status: 'partial', violations_found: null }]],
  });
  const r = await svc.isPriorStepClean(fakePool, approvedPrompt({ sequence_order: 2 }));
  assertEq(r.clean, false, 'partial completion → not clean');
  assert(r.reason.includes('completion_status'), 'reason mentions completion');
}

resetAll();
{
  routes.push({
    match: /evaluator_status, completion_status, violations_found/i,
    handler: () => [[{
      id: 0, title: 'P',
      evaluator_status: 'pass', completion_status: 'complete',
      violations_found: JSON.stringify([{ code: 'x' }, { code: 'y' }]),
    }]],
  });
  const r = await svc.isPriorStepClean(fakePool, approvedPrompt({ sequence_order: 2 }));
  assertEq(r.clean, false, 'violations → not clean');
  assert(r.reason.includes('2 violation'), 'count in reason');
}

resetAll();
{
  routes.push({
    match: /evaluator_status, completion_status, violations_found/i,
    handler: () => [[{
      id: 0, title: 'P',
      evaluator_status: 'pass', completion_status: 'complete',
      violations_found: '[]',
    }]],
  });
  const r = await svc.isPriorStepClean(fakePool, approvedPrompt({ sequence_order: 2 }));
  assertEq(r.clean, true, 'clean predecessor');
}

// ============================================================================
// isEligibleForRelease — various modes
// ============================================================================
console.log('\n── isEligibleForRelease: manual ──────────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt({ release_mode: 'manual' })]],
  });
  routes.push({ match: /UPDATE om_prompt_registry\s+SET queue_status = \?/i, handler: () => [{}] });
  routes.push({ match: /last_release_attempt_at/i, handler: () => [{}] });
  const r = await svc.isEligibleForRelease(1);
  assertEq(r.eligible, true, 'eligible');
  assertEq(r.can_auto_release, false, 'manual: no auto');
  assert(r.conditions.some((c: string) => c.includes('manual mode')), 'manual condition');
}

// auto_full, eligible, no escalation
console.log('\n── isEligibleForRelease: auto_full ───────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt({ release_mode: 'auto_full' })]],
  });
  routes.push({ match: /UPDATE om_prompt_registry\s+SET queue_status = \?/i, handler: () => [{}] });
  routes.push({ match: /last_release_attempt_at/i, handler: () => [{}] });
  const r = await svc.isEligibleForRelease(1);
  assertEq(r.can_auto_release, true, 'auto_full → auto allowed');
}

// auto_full blocked by escalation
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt({ release_mode: 'auto_full', escalation_required: 1 })]],
  });
  routes.push({ match: /UPDATE om_prompt_registry\s+SET queue_status = \?/i, handler: () => [{}] });
  routes.push({ match: /last_release_attempt_at/i, handler: () => [{}] });
  const r = await svc.isEligibleForRelease(1);
  assertEq(r.can_auto_release, false, 'escalation blocks auto_full');
  assertEq(r.escalation_required, true, 'escalation flag');
}

// auto_safe: clean prior step → allowed
console.log('\n── isEligibleForRelease: auto_safe ───────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt({ release_mode: 'auto_safe', confidence_level: 'high', sequence_order: 2 })]],
  });
  routes.push({
    match: /evaluator_status, completion_status, violations_found/i,
    handler: () => [[]],
  });
  routes.push({ match: /UPDATE om_prompt_registry\s+SET queue_status = \?/i, handler: () => [{}] });
  routes.push({ match: /last_release_attempt_at/i, handler: () => [{}] });
  const r = await svc.isEligibleForRelease(1);
  assertEq(r.can_auto_release, true, 'auto_safe clean → auto');
}

// auto_safe: low confidence blocked
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt({ release_mode: 'auto_safe', confidence_level: 'low' })]],
  });
  routes.push({ match: /UPDATE om_prompt_registry\s+SET queue_status = \?/i, handler: () => [{}] });
  routes.push({ match: /last_release_attempt_at/i, handler: () => [{}] });
  const r = await svc.isEligibleForRelease(1);
  assertEq(r.can_auto_release, false, 'low confidence blocks');
  assert(r.conditions.some((c: string) => c.includes('confidence')), 'condition mentions confidence');
}

// auto_safe: degradation blocked
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt({ release_mode: 'auto_safe', degradation_flag: 1 })]],
  });
  routes.push({ match: /UPDATE om_prompt_registry\s+SET queue_status = \?/i, handler: () => [{}] });
  routes.push({ match: /last_release_attempt_at/i, handler: () => [{}] });
  const r = await svc.isEligibleForRelease(1);
  assertEq(r.can_auto_release, false, 'degradation blocks');
}

// not eligible
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt({ status: 'draft' })]],
  });
  routes.push({ match: /UPDATE om_prompt_registry\s+SET queue_status = \?/i, handler: () => [{}] });
  routes.push({ match: /last_release_attempt_at/i, handler: () => [{}] });
  const r = await svc.isEligibleForRelease(1);
  assertEq(r.eligible, false, 'draft not eligible');
}

// not found
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[]],
  });
  await assertThrows(() => svc.isEligibleForRelease(999), 'not found', 'missing throws');
}

// ============================================================================
// schedulePrompt
// ============================================================================
console.log('\n── schedulePrompt ────────────────────────────────────────');

// not found
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[]],
  });
  await assertThrows(() => svc.schedulePrompt(1, {}, 'u'), 'not found', 'missing');
}

// wrong status (executing)
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt({ status: 'executing' })]],
  });
  await assertThrows(() => svc.schedulePrompt(1, { priority: 'high' }, 'u'), 'Cannot schedule', 'executing');
}

// rejected
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt({ status: 'rejected' })]],
  });
  await assertThrows(() => svc.schedulePrompt(1, { priority: 'high' }, 'u'), 'rejected', 'rejected');
}

// invalid window
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt()]],
  });
  await assertThrows(
    () => svc.schedulePrompt(1, {
      release_window_start: '2026-05-01T00:00:00Z',
      release_window_end: '2026-04-01T00:00:00Z',
    }, 'u'),
    'before release_window_end',
    'bad window'
  );
}

// invalid priority
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt()]],
  });
  await assertThrows(
    () => svc.schedulePrompt(1, { priority: 'bogus' }, 'u'),
    'Invalid priority',
    'invalid priority'
  );
}

// invalid release_mode
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt()]],
  });
  await assertThrows(
    () => svc.schedulePrompt(1, { release_mode: 'x' }, 'u'),
    'Invalid release_mode',
    'invalid mode'
  );
}

// invalid dependency_type
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt()]],
  });
  await assertThrows(
    () => svc.schedulePrompt(1, { dependency_type: 'xyz' }, 'u'),
    'Invalid dependency_type',
    'invalid dep type'
  );
}

// depends_on_prompt_id not found
resetAll();
{
  let call = 0;
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt()]],
  });
  routes.push({
    match: /SELECT id FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[]],
  });
  await assertThrows(
    () => svc.schedulePrompt(1, { depends_on_prompt_id: 999 }, 'u'),
    'Dependency prompt not found',
    'missing dep'
  );
}

// no fields
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt()]],
  });
  await assertThrows(() => svc.schedulePrompt(1, {}, 'u'), 'No scheduling fields', 'no fields');
}

// happy path
resetAll();
{
  let selectCall = 0;
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => {
      selectCall++;
      if (selectCall === 1) return [[approvedPrompt()]];
      // after update, refresh reads again, then final fetch
      return [[approvedPrompt({ priority: 'high' })]];
    },
  });
  routes.push({
    match: /^UPDATE om_prompt_registry SET priority = \?/i,
    handler: () => [{}],
  });
  routes.push({
    match: /INSERT INTO system_logs/i,
    handler: () => [{}],
  });
  routes.push({
    match: /UPDATE om_prompt_registry\s+SET queue_status = \?/i,
    handler: () => [{}],
  });
  const r = await svc.schedulePrompt(1, { priority: 'high' }, 'tester');
  assertEq(r.priority, 'high', 'updated prompt returned');
  const log = queryLog.find(c => /INSERT INTO system_logs/i.test(c.sql));
  assert(log !== undefined, 'log written');
  assertEq(log!.params[2], 'tester', 'actor in log');
}

// ============================================================================
// validateNoCycle (via schedulePrompt)
// ============================================================================
console.log('\n── validateNoCycle ───────────────────────────────────────');

// Direct cycle: scheduling 1 → depends_on 1 — first iteration visited has [1], currentId=1, throws
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt({ id: 1 })]],
  });
  routes.push({
    match: /SELECT id FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[{ id: 1 }]],
  });
  await assertThrows(
    () => svc.schedulePrompt(1, { depends_on_prompt_id: 1 }, 'u'),
    'Circular',
    'self cycle'
  );
}

// Chain cycle: 1 → 2 → 1
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt({ id: 1 })]],
  });
  routes.push({
    match: /SELECT id FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[{ id: 2 }]],
  });
  routes.push({
    match: /SELECT depends_on_prompt_id FROM om_prompt_registry WHERE id = \?/i,
    handler: ([id]: any[]) => {
      if (id === 2) return [[{ depends_on_prompt_id: 1 }]];
      return [[{ depends_on_prompt_id: null }]];
    },
  });
  await assertThrows(
    () => svc.schedulePrompt(1, { depends_on_prompt_id: 2 }, 'u'),
    'Circular',
    '2-hop cycle'
  );
}

// ============================================================================
// getQueue / getBlocked / etc.
// ============================================================================
console.log('\n── queue readers ─────────────────────────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry ORDER BY sequence_order/i,
    handler: () => [[]],
  });
  routes.push({
    match: /queue_status NOT IN \('pending'\)/i,
    handler: () => [[{ id: 1 }, { id: 2 }]],
  });
  const r = await svc.getQueue({ queue_status: 'ready_for_release', component: 'x', priority: 'high' });
  assertEq(r.length, 2, 'rows returned');
  const main = queryLog.find(c => /queue_status NOT IN \('pending'\)/i.test(c.sql));
  assert(main!.sql.includes('queue_status = ?'), 'filter added');
  assert(main!.sql.includes('component = ?'), 'component filter');
}

// getNextReady
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry ORDER BY sequence_order/i,
    handler: () => [[]],
  });
  routes.push({
    match: /queue_status IN \('ready_for_release', 'overdue'\)/i,
    handler: () => [[{ id: 1 }]],
  });
  const r = await svc.getNextReady(3);
  assertEq(r.length, 1, 'ready row');
  const call = queryLog.find(c => /queue_status IN \('ready_for_release'/i.test(c.sql));
  assertEq(call!.params[0], 3, 'limit param');
}

// getBlocked — JSON parse blocked_reasons
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry ORDER BY sequence_order/i,
    handler: () => [[]],
  });
  routes.push({
    match: /queue_status = 'blocked'/i,
    handler: () => [[
      { id: 1, blocked_reasons: JSON.stringify([{ code: 'x' }]) },
      { id: 2, blocked_reasons: null },
    ]],
  });
  const r = await svc.getBlocked();
  assertEq(r[0].blocked_reasons[0].code, 'x', 'parsed');
  assertEq(r[1].blocked_reasons, [] as any, 'null → empty array');
}

// getDue
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry ORDER BY sequence_order/i,
    handler: () => [[]],
  });
  routes.push({
    match: /scheduled_at <= NOW\(\)/i,
    handler: () => [[{ id: 5 }]],
  });
  const r = await svc.getDue();
  assertEq(r.length, 1, 'due row');
}

// getOverdue
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry ORDER BY sequence_order/i,
    handler: () => [[]],
  });
  routes.push({
    match: /overdue = 1/i,
    handler: () => [[{ id: 7 }]],
  });
  const r = await svc.getOverdue();
  assertEq(r.length, 1, 'overdue row');
}

// ============================================================================
// getFullQueueStatus
// ============================================================================
console.log('\n── getFullQueueStatus ────────────────────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[]],
  });
  await assertThrows(() => svc.getFullQueueStatus(1), 'not found', 'missing');
}

resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt({ id: 1, priority: 'high', release_mode: 'manual' })]],
  });
  routes.push({ match: /UPDATE om_prompt_registry\s+SET queue_status = \?/i, handler: () => [{}] });
  const r = await svc.getFullQueueStatus(1);
  assertEq(r.prompt_id, 1, 'id');
  assertEq(r.queue_status, 'ready_for_release', 'computed status');
  assertEq(r.scheduling.priority, 'high', 'scheduling bundle');
}

// ============================================================================
// getDependencyChain
// ============================================================================
console.log('\n── getDependencyChain ────────────────────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[]],
  });
  await assertThrows(() => svc.getDependencyChain(1), 'not found', 'missing');
}

// Sequence deps only
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt({ id: 5, sequence_order: 3 })]],
  });
  routes.push({
    match: /sequence_order < \? AND id != \?\s+ORDER BY sequence_order ASC/i,
    handler: () => [[
      { id: 3, title: 'A', sequence_order: 1, status: 'verified', queue_status: 'released' },
      { id: 4, title: 'B', sequence_order: 2, status: 'executing', queue_status: 'released' },
    ]],
  });
  const r = await svc.getDependencyChain(5);
  assertEq(r.dependencies.length, 2, '2 seq deps');
  assertEq(r.dependencies[0].type, 'sequence', 'type seq');
  assertEq(r.dependencies[0].satisfied, true, 'A verified');
  assertEq(r.dependencies[1].satisfied, false, 'B executing');
  assertEq(r.all_satisfied, false, 'not all satisfied');
}

// Explicit chain
resetAll();
{
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    handler: () => [[approvedPrompt({ id: 5, depends_on_prompt_id: 10 })]],
  });
  routes.push({
    match: /sequence_order < \? AND id != \?\s+ORDER BY sequence_order ASC/i,
    handler: () => [[]],
  });
  routes.push({
    match: /FROM om_prompt_registry WHERE id = \?/i,
    handler: ([id]: any[]) => {
      if (id === 10) return [[{ id: 10, title: 'T10', sequence_order: 1, status: 'verified', queue_status: 'released', depends_on_prompt_id: 20 }]];
      if (id === 20) return [[{ id: 20, title: 'T20', sequence_order: 1, status: 'verified', queue_status: 'released', depends_on_prompt_id: null }]];
      return [[]];
    },
  });
  const r = await svc.getDependencyChain(5);
  assertEq(r.dependencies.length, 2, 'chain of 2');
  assertEq(r.dependencies[0].prompt_id, 10, '10 first');
  assertEq(r.dependencies[1].prompt_id, 20, '20 second');
  assertEq(r.all_satisfied, true, 'all verified');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
