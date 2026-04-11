#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptQueueService.js (OMD-1075)
 *
 * The queue service derives queue_status on every read (single source of
 * truth = calculateQueueStatus). External dep: ../config/db.getAppPool().
 *
 * Strategy:
 *   - Stub ../config/db via require.cache dual-path.
 *   - SQL-routed fake pool: { match: RegExp, respond: (params, sql) => rows }
 *     returning [rows, []] to match mysql2 destructuring.
 *   - Default UPDATE → [{affectedRows: 1}, []]; default INSERT → [{}, []].
 *   - Clock is mocked via Date.now override (save/restore pattern).
 *
 * Coverage:
 *   - Constants: PRIORITY_WEIGHT, BLOCK_REASONS
 *   - calculateQueueStatus:
 *       · released (executing/complete/verified)
 *       · pending (draft/audited/ready/rejected)
 *       · approved + scheduled future → scheduled
 *       · approved + before release_window_start → scheduled
 *       · approved + audit failed → blocked
 *       · approved + past window_end → overdue flag set
 *       · approved + sequence predecessor not verified → blocked
 *       · approved + explicit dep not verified → blocked
 *       · approved + explicit dep missing → blocked
 *       · approved + all good → ready_for_release
 *       · approved + scheduled past, no blocks → overdue
 *   - persistQueueState (via refreshQueueStatus)
 *   - refreshQueueStatus: not found throws
 *   - refreshAllQueueStatuses: only updates diffs
 *   - isEligibleForRelease:
 *       · not found throws
 *       · auto_full blocked by escalation
 *       · auto_full clean → can_auto_release
 *       · auto_safe blocked by degradation / low confidence / escalation
 *       · auto_safe prior step not clean → manual
 *       · auto_safe clean → can_auto_release
 *       · manual mode → never auto
 *       · last_release_attempt_at recorded
 *   - isPriorStepClean: no predecessor / pred not pass / pred has violations
 *   - getQueue / getNextReady / getBlocked / getDue / getOverdue basic SQL
 *   - schedulePrompt:
 *       · not found / executing / rejected → throws
 *       · bad priority/mode/dep_type → throws
 *       · invalid window (end ≤ start) → throws
 *       · missing dependency target → throws
 *       · cycle detection → throws
 *       · no fields → throws
 *       · happy path updates + logs + returns updated row
 *   - validateNoCycle (indirect via schedulePrompt)
 *   - getDependencyChain: sequence deps + explicit chain + satisfied flag
 *   - getFullQueueStatus: wraps calculate + persist + returns nested scheduling
 *
 * Run: npx tsx server/src/services/__tests__/promptQueueService.test.ts
 */

import * as pathMod from 'path';

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

// ── Mocked clock ─────────────────────────────────────────────────────
const FIXED_NOW = new Date('2026-04-11T12:00:00Z').getTime();
const origDateNow = Date.now;
Date.now = () => FIXED_NOW;

// ── Fake pool with SQL routing ───────────────────────────────────────
type Route = { match: RegExp; respond?: (params: any[], sql: string) => any };
let routes: Route[] = [];
let queryLog: { sql: string; params: any[] }[] = [];

function resetPool() {
  routes = [];
  queryLog = [];
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        const result = r.respond ? r.respond(params, sql) : [];
        return [result, []];
      }
    }
    // Defaults
    if (/^\s*UPDATE /i.test(sql)) return [{ affectedRows: 1 }, []];
    if (/^\s*INSERT /i.test(sql)) return [{ insertId: 1, affectedRows: 1 }, []];
    return [[], []];
  },
};

// ── Stub ../config/db ────────────────────────────────────────────────
function stubRequireDual(relFromSUT: string, exports: any) {
  const base = pathMod.resolve(__dirname, '..', relFromSUT);
  for (const ext of ['.js', '.ts', '']) {
    const key = base + ext;
    require.cache[key] = { id: key, filename: key, loaded: true, exports } as any;
  }
}
stubRequireDual('../config/db', { getAppPool: () => fakePool });

const {
  calculateQueueStatus,
  refreshQueueStatus,
  refreshAllQueueStatuses,
  isEligibleForRelease,
  getQueue,
  getNextReady,
  getBlocked,
  getDue,
  getOverdue,
  schedulePrompt,
  getDependencyChain,
  getFullQueueStatus,
  isPriorStepClean,
  PRIORITY_WEIGHT,
  BLOCK_REASONS,
} = require('../promptQueueService');

// Helper: seed a prompt row
function mkPrompt(overrides: any = {}): any {
  return {
    id: 1,
    title: 'Test',
    status: 'approved',
    audit_status: 'pass',
    sequence_order: 1,
    parent_prompt_id: null,
    dependency_type: 'none',
    depends_on_prompt_id: null,
    scheduled_at: null,
    release_window_start: null,
    release_window_end: null,
    release_mode: 'manual',
    priority: 'normal',
    queue_status: 'pending',
    overdue: 0,
    blocked_reasons: null,
    confidence_level: 'high',
    quality_score: 90,
    degradation_flag: 0,
    escalation_required: 0,
    escalation_reason: null,
    ...overrides,
  };
}

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(PRIORITY_WEIGHT.critical, 0, 'critical weight');
assertEq(PRIORITY_WEIGHT.high, 1, 'high weight');
assertEq(PRIORITY_WEIGHT.normal, 2, 'normal weight');
assertEq(PRIORITY_WEIGHT.low, 3, 'low weight');

assertEq(BLOCK_REASONS.SEQUENCE_NOT_VERIFIED, 'sequence_not_verified', 'seq reason');
assertEq(BLOCK_REASONS.EXPLICIT_DEP_NOT_VERIFIED, 'explicit_dep_not_verified', 'explicit reason');
assertEq(BLOCK_REASONS.AUDIT_NOT_PASSED, 'audit_not_passed', 'audit reason');
assertEq(BLOCK_REASONS.OUTSIDE_RELEASE_WINDOW, 'outside_release_window', 'window reason');
assertEq(BLOCK_REASONS.DEPENDENCY_NOT_FOUND, 'dependency_not_found', 'missing reason');

// ============================================================================
// calculateQueueStatus — released
// ============================================================================
console.log('\n── calculateQueueStatus: released ────────────────────────');

for (const s of ['executing', 'complete', 'verified']) {
  resetPool();
  const r = await calculateQueueStatus(fakePool, mkPrompt({ status: s }));
  assertEq(r.queue_status, 'released', `${s} → released`);
}

// ============================================================================
// calculateQueueStatus — pending
// ============================================================================
console.log('\n── calculateQueueStatus: pending ─────────────────────────');

for (const s of ['draft', 'audited', 'ready', 'rejected']) {
  resetPool();
  const r = await calculateQueueStatus(fakePool, mkPrompt({ status: s }));
  assertEq(r.queue_status, 'pending', `${s} → pending`);
}

// ============================================================================
// calculateQueueStatus — scheduled (future)
// ============================================================================
console.log('\n── calculateQueueStatus: scheduled ───────────────────────');

{
  resetPool();
  const future = new Date(FIXED_NOW + 60_000).toISOString();
  const r = await calculateQueueStatus(fakePool, mkPrompt({ scheduled_at: future }));
  assertEq(r.queue_status, 'scheduled', 'future scheduled_at');
  assert(r.explanation.includes('Scheduled'), 'explanation mentions scheduled');
}

// Before release window start
{
  resetPool();
  const future = new Date(FIXED_NOW + 60_000).toISOString();
  const r = await calculateQueueStatus(fakePool, mkPrompt({ release_window_start: future }));
  assertEq(r.queue_status, 'scheduled', 'before window → scheduled');
  assert(r.explanation.includes('Before release window'), 'mentions window');
}

// ============================================================================
// calculateQueueStatus — blocked: audit not passed
// ============================================================================
console.log('\n── calculateQueueStatus: audit blocked ───────────────────');

{
  resetPool();
  const r = await calculateQueueStatus(fakePool, mkPrompt({ audit_status: 'fail' }));
  assertEq(r.queue_status, 'blocked', 'audit fail → blocked');
  assertEq(r.blocked_reasons.length, 1, '1 reason');
  assertEq(r.blocked_reasons[0].code, BLOCK_REASONS.AUDIT_NOT_PASSED, 'audit code');
}

// audit pending
{
  resetPool();
  const r = await calculateQueueStatus(fakePool, mkPrompt({ audit_status: null }));
  assertEq(r.queue_status, 'blocked', 'audit null → blocked');
}

// ============================================================================
// calculateQueueStatus — past window_end → overdue flag
// ============================================================================
console.log('\n── calculateQueueStatus: past window end ─────────────────');

{
  resetPool();
  const past = new Date(FIXED_NOW - 60_000).toISOString();
  const r = await calculateQueueStatus(fakePool, mkPrompt({ release_window_end: past }));
  assertEq(r.overdue, true, 'overdue flag set');
  assertEq(r.queue_status, 'overdue', 'ready + overdue → overdue state');
}

// ============================================================================
// calculateQueueStatus — sequence predecessor not verified
// ============================================================================
console.log('\n── calculateQueueStatus: sequence blocked ────────────────');

{
  resetPool();
  routes.push({
    match: /parent_prompt_id <=> \? AND sequence_order < \?/i,
    respond: () => [{ id: 99, sequence_order: 0, status: 'executing', title: 'Prev' }],
  });
  const r = await calculateQueueStatus(fakePool, mkPrompt({ dependency_type: 'sequence' }));
  assertEq(r.queue_status, 'blocked', 'pred not verified → blocked');
  assertEq(r.blocked_reasons[0].code, BLOCK_REASONS.SEQUENCE_NOT_VERIFIED, 'seq code');
}

// Sequence dep but pred IS verified → ready
{
  resetPool();
  routes.push({
    match: /parent_prompt_id <=> \? AND sequence_order < \?/i,
    respond: () => [{ id: 99, sequence_order: 0, status: 'verified', title: 'Prev' }],
  });
  const r = await calculateQueueStatus(fakePool, mkPrompt({ dependency_type: 'sequence' }));
  assertEq(r.queue_status, 'ready_for_release', 'pred verified → ready');
}

// No predecessor → ready
{
  resetPool();
  routes.push({
    match: /parent_prompt_id <=> \? AND sequence_order < \?/i,
    respond: () => [],
  });
  const r = await calculateQueueStatus(fakePool, mkPrompt({ dependency_type: 'sequence' }));
  assertEq(r.queue_status, 'ready_for_release', 'no pred → ready');
}

// ============================================================================
// calculateQueueStatus — explicit dep
// ============================================================================
console.log('\n── calculateQueueStatus: explicit blocked ────────────────');

// Dep not verified
{
  resetPool();
  routes.push({
    match: /parent_prompt_id <=> \? AND sequence_order < \?/i,
    respond: () => [],
  });
  routes.push({
    match: /WHERE id = \?/i,
    respond: (params) => params[0] === 42
      ? [{ id: 42, status: 'executing', title: 'Dep' }]
      : [],
  });
  const r = await calculateQueueStatus(fakePool, mkPrompt({
    dependency_type: 'explicit', depends_on_prompt_id: 42,
  }));
  assertEq(r.queue_status, 'blocked', 'dep not verified → blocked');
  assertEq(r.blocked_reasons[0].code, BLOCK_REASONS.EXPLICIT_DEP_NOT_VERIFIED, 'code');
}

// Dep missing
{
  resetPool();
  routes.push({
    match: /parent_prompt_id <=> \? AND sequence_order < \?/i,
    respond: () => [],
  });
  routes.push({
    match: /WHERE id = \?/i,
    respond: () => [],
  });
  const r = await calculateQueueStatus(fakePool, mkPrompt({
    dependency_type: 'explicit', depends_on_prompt_id: 42,
  }));
  assertEq(r.queue_status, 'blocked', 'dep missing → blocked');
  assertEq(r.blocked_reasons[0].code, BLOCK_REASONS.DEPENDENCY_NOT_FOUND, 'missing code');
}

// ============================================================================
// calculateQueueStatus — overdue (ready + past scheduled)
// ============================================================================
console.log('\n── calculateQueueStatus: overdue ─────────────────────────');

{
  resetPool();
  const past = new Date(FIXED_NOW - 60_000).toISOString();
  const r = await calculateQueueStatus(fakePool, mkPrompt({ scheduled_at: past }));
  assertEq(r.overdue, true, 'overdue flag');
  assertEq(r.queue_status, 'overdue', 'overdue state');
  assert(r.overdue_since === past, 'overdue_since = scheduled_at');
}

// ============================================================================
// calculateQueueStatus — happy ready_for_release
// ============================================================================
console.log('\n── calculateQueueStatus: ready ───────────────────────────');

{
  resetPool();
  const r = await calculateQueueStatus(fakePool, mkPrompt());
  assertEq(r.queue_status, 'ready_for_release', 'all good → ready');
  assertEq(r.blocked_reasons, [], 'no reasons');
}

// ============================================================================
// refreshQueueStatus
// ============================================================================
console.log('\n── refreshQueueStatus ────────────────────────────────────');

{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt({ id: 5 })],
  });
  const state = await refreshQueueStatus(5);
  assertEq(state.queue_status, 'ready_for_release', 'persisted state');
  // Verify UPDATE call happened
  const updateCall = queryLog.find(q => /UPDATE om_prompt_registry[\s\S]*SET queue_status/i.test(q.sql));
  assert(updateCall !== undefined, 'persist UPDATE called');
}

// Not found
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [],
  });
  let err: Error | null = null;
  try { await refreshQueueStatus(999); } catch (e: any) { err = e; }
  assert(err !== null, 'throws');
  assert(err !== null && err.message.includes('not found'), 'not found error');
}

// ============================================================================
// refreshAllQueueStatuses — only updates diffs
// ============================================================================
console.log('\n── refreshAllQueueStatuses ───────────────────────────────');

{
  resetPool();
  routes.push({
    match: /ORDER BY sequence_order ASC/i,
    respond: () => [
      // Already matches computed state → no update
      mkPrompt({ id: 1, queue_status: 'ready_for_release', overdue: 0, blocked_reasons: null }),
      // Stale → needs update
      mkPrompt({ id: 2, queue_status: 'pending', overdue: 0, blocked_reasons: null }),
    ],
  });
  const result = await refreshAllQueueStatuses();
  assertEq(result.total, 2, 'total 2');
  assertEq(result.updated, 1, '1 updated');
}

// ============================================================================
// isPriorStepClean
// ============================================================================
console.log('\n── isPriorStepClean ──────────────────────────────────────');

// No predecessor
{
  resetPool();
  routes.push({
    match: /parent_prompt_id <=> \? AND sequence_order < \?/i,
    respond: () => [],
  });
  const r = await isPriorStepClean(fakePool, mkPrompt());
  assertEq(r.clean, true, 'clean');
  assertEq(r.reason, 'No predecessor', 'reason');
}

// Predecessor evaluator failed
{
  resetPool();
  routes.push({
    match: /parent_prompt_id <=> \? AND sequence_order < \?/i,
    respond: () => [{
      id: 1, title: 'P', evaluator_status: 'fail',
      completion_status: 'complete', violations_found: null,
    }],
  });
  const r = await isPriorStepClean(fakePool, mkPrompt());
  assertEq(r.clean, false, 'not clean');
  assert(r.reason.includes('evaluator_status'), 'mentions evaluator');
}

// Pred completion not complete
{
  resetPool();
  routes.push({
    match: /parent_prompt_id <=> \? AND sequence_order < \?/i,
    respond: () => [{
      id: 1, title: 'P', evaluator_status: 'pass',
      completion_status: 'partial', violations_found: null,
    }],
  });
  const r = await isPriorStepClean(fakePool, mkPrompt());
  assertEq(r.clean, false, 'not clean');
  assert(r.reason.includes('completion_status'), 'mentions completion');
}

// Pred has violations (JSON string)
{
  resetPool();
  routes.push({
    match: /parent_prompt_id <=> \? AND sequence_order < \?/i,
    respond: () => [{
      id: 1, title: 'P', evaluator_status: 'pass',
      completion_status: 'complete',
      violations_found: JSON.stringify([{ v: 1 }, { v: 2 }]),
    }],
  });
  const r = await isPriorStepClean(fakePool, mkPrompt());
  assertEq(r.clean, false, 'not clean');
  assert(r.reason.includes('2 violation'), 'counts 2 violations');
}

// Pred clean
{
  resetPool();
  routes.push({
    match: /parent_prompt_id <=> \? AND sequence_order < \?/i,
    respond: () => [{
      id: 1, title: 'P', evaluator_status: 'pass',
      completion_status: 'complete', violations_found: null,
    }],
  });
  const r = await isPriorStepClean(fakePool, mkPrompt());
  assertEq(r.clean, true, 'clean');
  assertEq(r.reason, 'Predecessor clean', 'reason');
}

// ============================================================================
// isEligibleForRelease
// ============================================================================
console.log('\n── isEligibleForRelease ──────────────────────────────────');

// Not found
{
  resetPool();
  routes.push({ match: /WHERE id = \?/i, respond: () => [] });
  let err: Error | null = null;
  try { await isEligibleForRelease(999); } catch (e: any) { err = e; }
  assert(err !== null, 'throws not found');
}

// Not eligible (blocked)
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt({ audit_status: 'fail' })],
  });
  const r = await isEligibleForRelease(1);
  assertEq(r.eligible, false, 'not eligible');
  assertEq(r.can_auto_release, false, 'no auto');
  assert(r.conditions.some((c: string) => c.includes('Not eligible')), 'reason logged');
}

// auto_full + escalation → blocked
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt({ release_mode: 'auto_full', escalation_required: 1 })],
  });
  const r = await isEligibleForRelease(1);
  assertEq(r.eligible, true, 'eligible');
  assertEq(r.can_auto_release, false, 'blocked by escalation');
  assert(r.conditions.some((c: string) => c.includes('BLOCKED')), 'BLOCKED in conditions');
}

// auto_full clean → auto-release
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt({ release_mode: 'auto_full' })],
  });
  const r = await isEligibleForRelease(1);
  assertEq(r.can_auto_release, true, 'auto ok');
}

// auto_safe + degradation → blocked
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt({ release_mode: 'auto_safe', degradation_flag: 1 })],
  });
  const r = await isEligibleForRelease(1);
  assertEq(r.can_auto_release, false, 'blocked by degradation');
}

// auto_safe + low confidence → blocked
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt({ release_mode: 'auto_safe', confidence_level: 'low' })],
  });
  const r = await isEligibleForRelease(1);
  assertEq(r.can_auto_release, false, 'blocked by low confidence');
}

// auto_safe + prior step not clean → manual
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt({ release_mode: 'auto_safe' })],
  });
  routes.push({
    match: /parent_prompt_id <=> \? AND sequence_order < \?/i,
    respond: () => [{
      id: 1, title: 'P', evaluator_status: 'fail',
      completion_status: 'complete', violations_found: null,
    }],
  });
  const r = await isEligibleForRelease(1);
  assertEq(r.can_auto_release, false, 'blocked by prior step');
  assert(r.conditions.some((c: string) => c.includes('manual release')), 'manual reason');
}

// auto_safe + prior clean → auto-release
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt({ release_mode: 'auto_safe' })],
  });
  routes.push({
    match: /parent_prompt_id <=> \? AND sequence_order < \?/i,
    respond: () => [],
  });
  const r = await isEligibleForRelease(1);
  assertEq(r.can_auto_release, true, 'auto_safe clean → auto');
}

// manual mode → never auto
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt({ release_mode: 'manual' })],
  });
  const r = await isEligibleForRelease(1);
  assertEq(r.can_auto_release, false, 'manual → no auto');
  assert(r.conditions.some((c: string) => c.includes('explicit release action')), 'manual condition');
}

// last_release_attempt_at recorded
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt()],
  });
  await isEligibleForRelease(1);
  const attemptCall = queryLog.find(q =>
    /UPDATE om_prompt_registry SET last_release_attempt_at/i.test(q.sql)
  );
  assert(attemptCall !== undefined, 'last_release_attempt_at updated');
}

// ============================================================================
// Queue queries
// ============================================================================
console.log('\n── Queue queries ─────────────────────────────────────────');

// getQueue
{
  resetPool();
  routes.push({
    match: /ORDER BY sequence_order ASC/i,
    respond: () => [],
  });
  routes.push({
    match: /queue_status NOT IN \('pending'\)/i,
    respond: () => [mkPrompt({ id: 10 })],
  });
  const r = await getQueue({ queue_status: 'blocked', component: 'x', priority: 'high' });
  assertEq(r.length, 1, '1 row');
  const call = queryLog.find(q => /queue_status NOT IN/i.test(q.sql))!;
  assert(call.sql.includes('AND queue_status = ?'), 'status filter added');
  assert(call.sql.includes('AND component = ?'), 'component filter');
  assert(call.sql.includes('AND priority = ?'), 'priority filter');
}

// getNextReady
{
  resetPool();
  routes.push({
    match: /ORDER BY sequence_order ASC/i,
    respond: () => [],
  });
  routes.push({
    match: /queue_status IN \('ready_for_release', 'overdue'\)/i,
    respond: () => [mkPrompt({ id: 11 })],
  });
  const r = await getNextReady(3);
  assertEq(r.length, 1, '1 ready');
  const call = queryLog.find(q => /LIMIT \?/i.test(q.sql))!;
  assertEq(call.params, [3], 'limit param');
}

// getBlocked
{
  resetPool();
  routes.push({
    match: /ORDER BY sequence_order ASC/i,
    respond: () => [],
  });
  routes.push({
    match: /queue_status = 'blocked'/i,
    respond: () => [
      { id: 1, title: 'A', blocked_reasons: JSON.stringify([{ code: 'x' }]) },
      { id: 2, title: 'B', blocked_reasons: null },
    ],
  });
  const r = await getBlocked();
  assertEq(r.length, 2, '2 blocked');
  assertEq(r[0].blocked_reasons, [{ code: 'x' }], 'JSON parsed');
  assertEq(r[1].blocked_reasons, [], 'null → []');
}

// getDue
{
  resetPool();
  routes.push({
    match: /ORDER BY sequence_order ASC/i,
    respond: () => [],
  });
  routes.push({
    match: /scheduled_at IS NOT NULL/i,
    respond: () => [mkPrompt({ id: 12 })],
  });
  const r = await getDue();
  assertEq(r.length, 1, '1 due');
}

// getOverdue
{
  resetPool();
  routes.push({
    match: /ORDER BY sequence_order ASC/i,
    respond: () => [],
  });
  routes.push({
    match: /WHERE overdue = 1/i,
    respond: () => [mkPrompt({ id: 13 })],
  });
  const r = await getOverdue();
  assertEq(r.length, 1, '1 overdue');
}

// ============================================================================
// schedulePrompt
// ============================================================================
console.log('\n── schedulePrompt ────────────────────────────────────────');

// Not found
{
  resetPool();
  routes.push({ match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, respond: () => [] });
  let err: Error | null = null;
  try { await schedulePrompt(1, { priority: 'high' }, 'user'); } catch (e: any) { err = e; }
  assert(err !== null, 'not found throws');
}

// Executing → cannot schedule
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt({ status: 'executing' })],
  });
  let err: Error | null = null;
  try { await schedulePrompt(1, { priority: 'high' }, 'u'); } catch (e: any) { err = e; }
  assert(err !== null, 'executing throws');
}

// Rejected
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt({ status: 'rejected' })],
  });
  let err: Error | null = null;
  try { await schedulePrompt(1, { priority: 'high' }, 'u'); } catch (e: any) { err = e; }
  assert(err !== null && err.message.includes('rejected'), 'rejected throws');
}

// Bad window (end ≤ start)
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt()],
  });
  let err: Error | null = null;
  try {
    await schedulePrompt(1, {
      release_window_start: '2026-04-11T14:00:00Z',
      release_window_end: '2026-04-11T13:00:00Z',
    }, 'u');
  } catch (e: any) { err = e; }
  assert(err !== null, 'bad window throws');
}

// Bad priority
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt()],
  });
  let err: Error | null = null;
  try { await schedulePrompt(1, { priority: 'urgent' as any }, 'u'); } catch (e: any) { err = e; }
  assert(err !== null, 'bad priority throws');
}

// Bad release_mode
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt()],
  });
  let err: Error | null = null;
  try { await schedulePrompt(1, { release_mode: 'yolo' as any }, 'u'); } catch (e: any) { err = e; }
  assert(err !== null, 'bad release_mode throws');
}

// Bad dependency_type
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt()],
  });
  let err: Error | null = null;
  try { await schedulePrompt(1, { dependency_type: 'hard' as any }, 'u'); } catch (e: any) { err = e; }
  assert(err !== null, 'bad dep_type throws');
}

// Missing dep target
{
  resetPool();
  let seq = 0;
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => seq++ === 0 ? [mkPrompt()] : [],
  });
  routes.push({
    match: /SELECT id FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [],
  });
  let err: Error | null = null;
  try { await schedulePrompt(1, { depends_on_prompt_id: 42 }, 'u'); } catch (e: any) { err = e; }
  assert(err !== null && err.message.includes('Dependency prompt not found'), 'missing dep throws');
}

// No fields
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt()],
  });
  let err: Error | null = null;
  try { await schedulePrompt(1, {}, 'u'); } catch (e: any) { err = e; }
  assert(err !== null && err.message.includes('No scheduling fields'), 'no fields throws');
}

// Happy path
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt({ id: 7 })],
  });
  const r = await schedulePrompt(7, {
    scheduled_at: '2026-04-15T10:00:00Z',
    priority: 'high',
    release_mode: 'auto_safe',
    dependency_type: 'none',
  }, 'admin');
  assertEq(r.id, 7, 'returns updated row');
  // UPDATE + INSERT log + UPDATE persistQueueState
  const updatePrompt = queryLog.find(q =>
    /UPDATE om_prompt_registry SET /i.test(q.sql) &&
    /priority/i.test(q.sql) &&
    !/queue_status/i.test(q.sql) &&
    !/last_release_attempt_at/i.test(q.sql)
  );
  assert(updatePrompt !== undefined, 'fields update called');
  const logCall = queryLog.find(q => /INSERT INTO system_logs/i.test(q.sql));
  assert(logCall !== undefined, 'audit log written');
}

// Cycle detection
{
  resetPool();
  let seq = 0;
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => seq++ === 0 ? [mkPrompt({ id: 1 })] : [mkPrompt({ id: 1 })],
  });
  routes.push({
    match: /SELECT id FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [{ id: 2 }],
  });
  // validateNoCycle walks depends_on chain — 2 points back to 1
  routes.push({
    match: /SELECT depends_on_prompt_id FROM om_prompt_registry WHERE id = \?/i,
    respond: (params) => {
      if (params[0] === 2) return [{ depends_on_prompt_id: 1 }];
      return [{ depends_on_prompt_id: null }];
    },
  });
  let err: Error | null = null;
  try {
    await schedulePrompt(1, { depends_on_prompt_id: 2 }, 'u');
  } catch (e: any) { err = e; }
  assert(err !== null && err.message.includes('Circular'), 'cycle detected');
}

// ============================================================================
// getDependencyChain
// ============================================================================
console.log('\n── getDependencyChain ────────────────────────────────────');

// Not found
{
  resetPool();
  routes.push({ match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, respond: () => [] });
  let err: Error | null = null;
  try { await getDependencyChain(99); } catch (e: any) { err = e; }
  assert(err !== null, 'not found throws');
}

// Sequence deps + explicit chain
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt({ id: 10, sequence_order: 3, depends_on_prompt_id: 20 })],
  });
  routes.push({
    match: /parent_prompt_id <=> \? AND sequence_order < \?/i,
    respond: () => [
      { id: 1, title: 'A', sequence_order: 1, status: 'verified', queue_status: 'released' },
      { id: 2, title: 'B', sequence_order: 2, status: 'executing', queue_status: 'released' },
    ],
  });
  routes.push({
    match: /SELECT id, title, sequence_order, status, queue_status, depends_on_prompt_id/i,
    respond: (params) => {
      if (params[0] === 20) return [{ id: 20, title: 'Dep1', sequence_order: 0, status: 'verified', queue_status: 'released', depends_on_prompt_id: null }];
      return [];
    },
  });
  const r = await getDependencyChain(10);
  assertEq(r.dependencies.length, 3, '3 deps');
  assertEq(r.dependencies[0].type, 'sequence', 'seq type');
  assertEq(r.dependencies[0].satisfied, true, 'A satisfied');
  assertEq(r.dependencies[1].satisfied, false, 'B not satisfied');
  assertEq(r.dependencies[2].type, 'explicit', 'explicit type');
  assertEq(r.dependencies[2].satisfied, true, 'Dep1 satisfied');
  assertEq(r.all_satisfied, false, 'not all satisfied');
}

// ============================================================================
// getFullQueueStatus
// ============================================================================
console.log('\n── getFullQueueStatus ────────────────────────────────────');

// Not found
{
  resetPool();
  routes.push({ match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, respond: () => [] });
  let err: Error | null = null;
  try { await getFullQueueStatus(99); } catch (e: any) { err = e; }
  assert(err !== null, 'not found throws');
}

// Happy
{
  resetPool();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => [mkPrompt({ id: 5, release_mode: 'auto_safe', priority: 'high' })],
  });
  const r = await getFullQueueStatus(5);
  assertEq(r.prompt_id, 5, 'prompt_id');
  assertEq(r.queue_status, 'ready_for_release', 'ready');
  assertEq(r.scheduling.priority, 'high', 'nested scheduling.priority');
  assertEq(r.scheduling.release_mode, 'auto_safe', 'release_mode nested');
}

// ============================================================================
// Summary
// ============================================================================
Date.now = origDateNow;
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  Date.now = origDateNow;
  console.error('Unhandled test error:', e);
  process.exit(1);
});
