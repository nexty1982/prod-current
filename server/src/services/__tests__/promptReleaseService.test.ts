#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptReleaseService.js (OMD-975)
 *
 * Stubs:
 *   - ../config/db getAppPool() — fake pool routing queries by SQL regex
 *   - ./promptQueueService — controllable isEligibleForRelease,
 *     refreshAllQueueStatuses, getOverdue
 *
 * Coverage:
 *   - checkReleaseEligibility delegates to queueService
 *   - releasePrompt: rejects when not eligible (joins reasons or falls
 *     back to explanation)
 *   - releasePrompt: atomic UPDATE with WHERE status='approved'
 *   - releasePrompt: concurrent-modification error includes current status
 *   - releasePrompt: system_logs INSERT with title, prompt_id,
 *     release_mode, conditions
 *   - releasePrompt: cascade refreshAllQueueStatuses
 *   - releasePrompt: returns updated row
 *   - generateWorkplan: refresh called first
 *   - generateWorkplan: ORDER BY FIELD priority + sequence_order
 *   - generateWorkplan: groups by component, "uncategorized" fallback
 *   - generateWorkplan: overdue=true when release_window_end past
 *   - generateWorkplan: total_ready/total_overdue/total_blocked
 *
 * Run: npx tsx server/src/services/__tests__/promptReleaseService.test.ts
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

// ── Stub ../config/db ────────────────────────────────────────────────
type Call = { sql: string; params: any[] };
const dbCalls: Call[] = [];

// Test setup
let nextSelectRows: any[] = [];
let nextUpdateAffected = 1;
let nextStatusRow: any = { status: 'approved' };
let nextUpdatedRow: any = { id: 1, status: 'executing', queue_status: 'released' };
let nextReadyRows: any[] = [];
let nextBlockedCount = 0;

function dbReset() {
  dbCalls.length = 0;
  nextSelectRows = [];
  nextUpdateAffected = 1;
  nextStatusRow = { status: 'approved' };
  nextUpdatedRow = { id: 1, status: 'executing', queue_status: 'released' };
  nextReadyRows = [];
  nextBlockedCount = 0;
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    dbCalls.push({ sql, params });

    if (/^\s*UPDATE\s+om_prompt_registry/i.test(sql)) {
      return [{ affectedRows: nextUpdateAffected }];
    }
    if (/^\s*INSERT\s+INTO\s+system_logs/i.test(sql)) {
      return [{ insertId: 1, affectedRows: 1 }];
    }
    if (/^\s*SELECT status FROM om_prompt_registry/i.test(sql)) {
      return [nextStatusRow ? [nextStatusRow] : []];
    }
    if (/^\s*SELECT \* FROM om_prompt_registry WHERE id = \?/i.test(sql)) {
      return [[nextUpdatedRow]];
    }
    if (/queue_status = 'ready_for_release'/i.test(sql)) {
      return [nextReadyRows];
    }
    if (/COUNT\(\*\) as cnt FROM om_prompt_registry WHERE queue_status = 'blocked'/i.test(sql)) {
      return [[{ cnt: nextBlockedCount }]];
    }
    return [[]];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// ── Stub ./promptQueueService ────────────────────────────────────────
let nextEligibility: any = { eligible: true, blocked_reasons: [], title: 'X',
  release_mode: 'manual', conditions: {} };
let nextOverdue: any[] = [];
const queueCalls: { method: string; args: any[] }[] = [];

function queueReset() {
  queueCalls.length = 0;
  nextEligibility = { eligible: true, blocked_reasons: [], title: 'X',
    release_mode: 'manual', conditions: {} };
  nextOverdue = [];
}

const queueSvcPath = require.resolve('../promptQueueService');
require.cache[queueSvcPath] = {
  id: queueSvcPath,
  filename: queueSvcPath,
  loaded: true,
  exports: {
    isEligibleForRelease: async (...args: any[]) => {
      queueCalls.push({ method: 'isEligibleForRelease', args });
      return nextEligibility;
    },
    refreshAllQueueStatuses: async (...args: any[]) => {
      queueCalls.push({ method: 'refreshAllQueueStatuses', args });
    },
    getOverdue: async (...args: any[]) => {
      queueCalls.push({ method: 'getOverdue', args });
      return nextOverdue;
    },
  },
} as any;

const { checkReleaseEligibility, releasePrompt, generateWorkplan } = require('../promptReleaseService');

async function main() {

// ============================================================================
// checkReleaseEligibility delegation
// ============================================================================
console.log('\n── checkReleaseEligibility ───────────────────────────────');

dbReset(); queueReset();
nextEligibility = { eligible: true, blocked_reasons: [], title: 'My Prompt' };
{
  const result = await checkReleaseEligibility(123);
  assertEq(result, nextEligibility, 'returns queueService result');
  assertEq(queueCalls.length, 1, 'one queue call');
  assertEq(queueCalls[0].method, 'isEligibleForRelease', 'method');
  assertEq(queueCalls[0].args, [123], 'promptId passed');
}

// ============================================================================
// releasePrompt: not eligible → throws
// ============================================================================
console.log('\n── releasePrompt: not eligible ───────────────────────────');

dbReset(); queueReset();
nextEligibility = {
  eligible: false,
  blocked_reasons: [
    { code: 'DEPS_NOT_MET', detail: 'depends_on=42 not done' },
    { code: 'OUT_OF_WINDOW', detail: 'outside release window' },
  ],
  explanation: 'fallback explanation',
};
{
  let caught: Error | null = null;
  try { await releasePrompt(7, 'admin@x.com'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught!.message.includes('depends_on=42 not done'), 'first detail in error');
  assert(caught!.message.includes('outside release window'), 'second detail in error');
  assert(!caught!.message.includes('fallback'), 'fallback not used when details present');
  assertEq(dbCalls.length, 0, 'no DB calls');
}

// Empty blocked_reasons + explanation fallback
dbReset(); queueReset();
nextEligibility = {
  eligible: false,
  blocked_reasons: [],
  explanation: 'queue is paused',
};
{
  let caught: Error | null = null;
  try { await releasePrompt(7, 'admin@x.com'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught!.message.includes('queue is paused'), 'falls back to explanation');
}

// ============================================================================
// releasePrompt: happy path
// ============================================================================
console.log('\n── releasePrompt: happy path ─────────────────────────────');

dbReset(); queueReset();
nextEligibility = {
  eligible: true,
  blocked_reasons: [],
  title: 'Process Daily',
  release_mode: 'auto_safe',
  conditions: { deps_met: true, prior_clean: true },
};
nextUpdateAffected = 1;
nextUpdatedRow = { id: 99, status: 'executing', queue_status: 'released', title: 'Process Daily' };

{
  const result = await releasePrompt(99, 'svc@x.com');
  // Ensure UPDATE called with correct shape
  const updateCall = dbCalls.find(c => /^\s*UPDATE/.test(c.sql))!;
  assert(updateCall !== undefined, 'UPDATE called');
  assert(/SET status = 'executing', queue_status = 'released'/.test(updateCall.sql), 'transitions both status fields');
  assert(/WHERE id = \? AND status = 'approved'/.test(updateCall.sql), 'guarded WHERE');
  assertEq(updateCall.params, [99], 'UPDATE id=99');

  // Ensure INSERT into system_logs with title + meta
  const insertCall = dbCalls.find(c => /^\s*INSERT INTO system_logs/i.test(c.sql))!;
  assert(insertCall !== undefined, 'system_logs INSERT called');
  assertEq(insertCall.params[0], 'Prompt released for execution: Process Daily', 'log message includes title');
  const meta = JSON.parse(insertCall.params[1]);
  assertEq(meta.prompt_id, 99, 'meta.prompt_id');
  assertEq(meta.release_mode, 'auto_safe', 'meta.release_mode');
  assertEq(meta.conditions, { deps_met: true, prior_clean: true }, 'meta.conditions');
  assertEq(insertCall.params[2], 'svc@x.com', 'log actor');

  // Ensure cascade refresh
  const refresh = queueCalls.find(c => c.method === 'refreshAllQueueStatuses');
  assert(refresh !== undefined, 'refreshAllQueueStatuses cascade');

  // Returns updated row
  assertEq(result, nextUpdatedRow, 'returns updated row');
}

// ============================================================================
// releasePrompt: concurrent modification (affectedRows=0)
// ============================================================================
console.log('\n── releasePrompt: concurrent modification ────────────────');

dbReset(); queueReset();
nextEligibility = { eligible: true, blocked_reasons: [], title: 'X',
  release_mode: 'manual', conditions: {} };
nextUpdateAffected = 0;
nextStatusRow = { status: 'executing' };
{
  let caught: Error | null = null;
  try { await releasePrompt(50, 'a@x'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on affectedRows=0');
  assert(caught!.message.includes('"executing"'), 'mentions current status');
  assert(caught!.message.includes('"approved"'), 'mentions expected status');
  assert(caught!.message.includes('concurrent modification'), 'concurrent modification hint');
}

// Status not found (deleted) → "unknown"
dbReset(); queueReset();
nextEligibility = { eligible: true, blocked_reasons: [], title: 'X',
  release_mode: 'manual', conditions: {} };
nextUpdateAffected = 0;
nextStatusRow = null;
{
  let caught: Error | null = null;
  try { await releasePrompt(50, 'a@x'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when status row missing');
  assert(caught!.message.includes('unknown'), 'falls back to "unknown"');
}

// ============================================================================
// generateWorkplan
// ============================================================================
console.log('\n── generateWorkplan ──────────────────────────────────────');

dbReset(); queueReset();
const now = new Date();
const past = new Date(now.getTime() - 60_000).toISOString();
const future = new Date(now.getTime() + 60_000).toISOString();

nextReadyRows = [
  { id: 1, title: 'A1', component: 'records', priority: 'critical',
    sequence_order: 10, status: 'approved', queue_status: 'ready_for_release',
    release_mode: 'auto_safe', scheduled_at: null, release_window_end: future },
  { id: 2, title: 'A2', component: 'records', priority: 'normal',
    sequence_order: 20, status: 'approved', queue_status: 'ready_for_release',
    release_mode: 'manual', scheduled_at: null, release_window_end: past },
  { id: 3, title: 'B1', component: null, priority: 'high',
    sequence_order: 5, status: 'approved', queue_status: 'ready_for_release',
    release_mode: 'auto_full', scheduled_at: null, release_window_end: null },
];
nextOverdue = [{ id: 99 }, { id: 100 }];
nextBlockedCount = 7;

{
  const plan = await generateWorkplan();

  // Refresh called first
  assertEq(queueCalls[0].method, 'refreshAllQueueStatuses', 'refresh called first');

  // SELECT shape
  const sel = dbCalls.find(c => /queue_status = 'ready_for_release'/.test(c.sql))!;
  assert(sel !== undefined, 'ready SELECT issued');
  assert(/scheduled_at <= NOW\(\)/.test(sel.sql), 'includes due scheduled_at');
  assert(/FIELD\(priority, 'critical','high','normal','low'\)/.test(sel.sql), 'priority FIELD ordering');
  assert(/sequence_order ASC/.test(sel.sql), 'sequence_order ASC tie-break');

  // Counts
  assertEq(plan.total_ready, 3, 'total_ready=3');
  assertEq(plan.total_overdue, 2, 'total_overdue from getOverdue.length');
  assertEq(plan.total_blocked, 7, 'total_blocked from COUNT query');
  assert(typeof plan.generated_at === 'string', 'generated_at ISO');

  // Grouping
  assertEq(plan.components.records.length, 2, 'records group has 2');
  assertEq(plan.components.uncategorized.length, 1, 'null component → uncategorized');
  assertEq(plan.components.records[0].id, 1, 'records[0]=A1');
  assertEq(plan.components.records[1].id, 2, 'records[1]=A2');

  // Overdue computation
  assertEq(plan.components.records[0].overdue, false, 'A1 not overdue (future)');
  assertEq(plan.components.records[1].overdue, true, 'A2 overdue (past)');
  assertEq(plan.components.uncategorized[0].overdue, false, 'B1 not overdue (null window)');

  // Flat items list also returned
  assertEq(plan.items.length, 3, 'flat items=3');
}

// generateWorkplan with no ready rows
dbReset(); queueReset();
nextReadyRows = [];
nextOverdue = [];
nextBlockedCount = 0;
{
  const plan = await generateWorkplan();
  assertEq(plan.total_ready, 0, 'total_ready=0');
  assertEq(plan.total_overdue, 0, 'total_overdue=0');
  assertEq(plan.total_blocked, 0, 'total_blocked=0');
  assertEq(plan.components, {}, 'no component groups');
  assertEq(plan.items, [], 'no items');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
