#!/usr/bin/env npx tsx
/**
 * Unit tests for services/taskReconciliation.js (OMD-972)
 *
 * Crash-recovery + retention cleanup for omai_tasks. Stubs
 * `../config/db` getAppPool() via require.cache with a fake pool that
 * routes queries by SQL regex and records all calls.
 *
 * Coverage:
 *   - reconcileOrphanedTasks: empty SELECT → returns 0, no UPDATEs
 *   - reconcileOrphanedTasks: SELECT uses TIMESTAMPDIFF + UTC_TIMESTAMP
 *     and ORPHAN_THRESHOLD_SECONDS=120
 *   - reconcileOrphanedTasks: per orphan, performs UPDATE then INSERT event
 *   - reconcileOrphanedTasks: distinct messages for 'running' vs 'queued'
 *   - reconcileOrphanedTasks: detail_json includes previous_status
 *   - reconcileOrphanedTasks: returns total orphan count
 *   - cleanupExpiredTasks: DELETE called once per RETENTION_DAYS entry
 *     with correct (status, days) params
 *   - cleanupExpiredTasks: sums affectedRows across all DELETEs
 *   - cleanupExpiredTasks: handles 0 affectedRows entries
 *
 * Run: npx tsx server/src/services/__tests__/taskReconciliation.test.ts
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

// ── Stub ../config/db BEFORE requiring SUT ───────────────────────────
type Call = { sql: string; params: any[] };
const calls: Call[] = [];

// Test setup state
let nextSelectRows: any[] = [];
let deleteAffectedByStatus: Record<string, number> = {};

const fakePool = {
  query: async (sql: string, params: any[]) => {
    calls.push({ sql, params });

    if (/^\s*SELECT/i.test(sql) && /omai_tasks/.test(sql)) {
      return [nextSelectRows];
    }
    if (/^\s*UPDATE\s+omai_tasks/i.test(sql)) {
      return [{ affectedRows: 1, changedRows: 1 }];
    }
    if (/^\s*INSERT\s+INTO\s+omai_task_events/i.test(sql)) {
      return [{ insertId: Math.floor(Math.random() * 1000), affectedRows: 1 }];
    }
    if (/^\s*DELETE\s+FROM\s+omai_tasks/i.test(sql)) {
      const status = params[0];
      const affected = deleteAffectedByStatus[status] || 0;
      return [{ affectedRows: affected }];
    }
    return [[]];
  },
};

function reset() {
  calls.length = 0;
  nextSelectRows = [];
  deleteAffectedByStatus = {};
}

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// Silence noisy console.log
const origLog = console.log;
function quiet() { console.log = () => {}; }
function loud() { console.log = origLog; }

const { reconcileOrphanedTasks, cleanupExpiredTasks } = require('../taskReconciliation');

async function main() {

// ============================================================================
// reconcileOrphanedTasks: no orphans
// ============================================================================
console.log('\n── reconcile: no orphans ─────────────────────────────────');

reset();
nextSelectRows = [];
{
  const count = await reconcileOrphanedTasks();
  assertEq(count, 0, 'returns 0');
  assertEq(calls.length, 1, 'only SELECT, no UPDATE/INSERT');
  assert(/^\s*SELECT/i.test(calls[0].sql), 'first call is SELECT');
}

// ============================================================================
// reconcileOrphanedTasks: SELECT shape
// ============================================================================
console.log('\n── reconcile: SELECT shape ───────────────────────────────');

reset();
nextSelectRows = [];
{
  await reconcileOrphanedTasks();
  const sql = calls[0].sql;
  assert(/FROM omai_tasks/.test(sql), 'FROM omai_tasks');
  assert(/status IN \('running', 'queued'\)/.test(sql), 'filters running+queued');
  assert(/TIMESTAMPDIFF\(SECOND/.test(sql), 'uses TIMESTAMPDIFF(SECOND, ...)');
  assert(/UTC_TIMESTAMP\(\)/.test(sql), 'uses UTC_TIMESTAMP()');
  assert(/COALESCE\(last_heartbeat, started_at, created_at\)/.test(sql), 'COALESCE chain');
  assertEq(calls[0].params, [120], 'ORPHAN_THRESHOLD_SECONDS=120');
}

// ============================================================================
// reconcileOrphanedTasks: single running orphan
// ============================================================================
console.log('\n── reconcile: single running orphan ──────────────────────');

reset();
nextSelectRows = [
  { id: 42, task_type: 'build', title: 'do thing', status: 'running' },
];
quiet();
{
  const count = await reconcileOrphanedTasks();
  loud();
  assertEq(count, 1, 'returns 1');
  // Calls: SELECT, UPDATE, INSERT
  assertEq(calls.length, 3, '3 calls total');
  assert(/^\s*SELECT/i.test(calls[0].sql), 'call 0 = SELECT');
  assert(/^\s*UPDATE\s+omai_tasks/i.test(calls[1].sql), 'call 1 = UPDATE');
  assert(/^\s*INSERT\s+INTO\s+omai_task_events/i.test(calls[2].sql), 'call 2 = INSERT event');

  // UPDATE check
  const updateSql = calls[1].sql;
  assert(/SET status = 'failed'/.test(updateSql), 'UPDATE sets status=failed');
  assert(/finished_at = COALESCE\(finished_at, UTC_TIMESTAMP/.test(updateSql), 'preserves finished_at');
  assert(/last_heartbeat = UTC_TIMESTAMP/.test(updateSql), 'updates last_heartbeat');
  assert(/WHERE id = \? AND status IN \('running', 'queued'\)/.test(updateSql), 'WHERE guarded');

  const [reason, id] = calls[1].params;
  assertEq(id, 42, 'UPDATE id=42');
  assert(/process terminated unexpectedly/.test(reason), 'running message');
  assert(/no heartbeat/.test(reason), 'mentions heartbeat');

  // INSERT event check
  const insertParams = calls[2].params;
  assertEq(insertParams[0], 42, 'event task_id=42');
  assertEq(insertParams[1], reason, 'event message matches reason');
  const detail = JSON.parse(insertParams[2]);
  assertEq(detail.previous_status, 'running', 'detail.previous_status=running');
  assertEq(detail.reconciled_by, 'startup', 'detail.reconciled_by=startup');
}

// ============================================================================
// reconcileOrphanedTasks: queued orphan distinct message
// ============================================================================
console.log('\n── reconcile: queued orphan ──────────────────────────────');

reset();
nextSelectRows = [
  { id: 7, task_type: 'sync', title: 'sync x', status: 'queued' },
];
quiet();
{
  await reconcileOrphanedTasks();
  loud();
  const reason = calls[1].params[0];
  assert(/Queued task expired/.test(reason), 'queued message');
  assert(/never started/.test(reason), 'mentions never started');
  const detail = JSON.parse(calls[2].params[2]);
  assertEq(detail.previous_status, 'queued', 'detail.previous_status=queued');
}

// ============================================================================
// reconcileOrphanedTasks: multiple orphans
// ============================================================================
console.log('\n── reconcile: multiple orphans ───────────────────────────');

reset();
nextSelectRows = [
  { id: 1, task_type: 'build', title: 'a', status: 'running' },
  { id: 2, task_type: 'build', title: 'b', status: 'queued' },
  { id: 3, task_type: 'sync',  title: 'c', status: 'running' },
];
quiet();
{
  const count = await reconcileOrphanedTasks();
  loud();
  assertEq(count, 3, 'returns 3');
  // SELECT + 3 * (UPDATE+INSERT) = 7 calls
  assertEq(calls.length, 7, '1 SELECT + 6 mutation calls');

  // Spot-check IDs
  assertEq(calls[1].params[1], 1, 'orphan 1 UPDATE');
  assertEq(calls[2].params[0], 1, 'orphan 1 INSERT task_id');
  assertEq(calls[3].params[1], 2, 'orphan 2 UPDATE');
  assertEq(calls[5].params[1], 3, 'orphan 3 UPDATE');
}

// ============================================================================
// cleanupExpiredTasks: DELETE per status
// ============================================================================
console.log('\n── cleanup: DELETE per retention status ──────────────────');

reset();
deleteAffectedByStatus = { succeeded: 0, cancelled: 0, failed: 0 };
{
  const total = await cleanupExpiredTasks();
  assertEq(total, 0, 'no rows deleted → 0');
  assertEq(calls.length, 3, '3 DELETE calls (succeeded, cancelled, failed)');

  // All DELETEs
  for (const c of calls) {
    assert(/^\s*DELETE\s+FROM\s+omai_tasks/i.test(c.sql), 'DELETE FROM omai_tasks');
    assert(/finished_at IS NOT NULL/.test(c.sql), 'WHERE finished_at IS NOT NULL');
    assert(/TIMESTAMPDIFF\(DAY, finished_at, UTC_TIMESTAMP/.test(c.sql), 'TIMESTAMPDIFF(DAY)');
  }

  // Verify retention windows: succeeded=30, cancelled=30, failed=90
  const params = calls.map(c => c.params);
  assertEq(params[0], ['succeeded', 30], 'succeeded: 30 days');
  assertEq(params[1], ['cancelled', 30], 'cancelled: 30 days');
  assertEq(params[2], ['failed', 90], 'failed: 90 days');
}

// ============================================================================
// cleanupExpiredTasks: sums affectedRows
// ============================================================================
console.log('\n── cleanup: sums affectedRows ────────────────────────────');

reset();
deleteAffectedByStatus = { succeeded: 5, cancelled: 2, failed: 8 };
quiet();
{
  const total = await cleanupExpiredTasks();
  loud();
  assertEq(total, 15, 'sums all affectedRows = 5+2+8');
}

// Mix of zero and non-zero
reset();
deleteAffectedByStatus = { succeeded: 0, cancelled: 3, failed: 0 };
quiet();
{
  const total = await cleanupExpiredTasks();
  loud();
  assertEq(total, 3, 'only counts non-zero');
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
