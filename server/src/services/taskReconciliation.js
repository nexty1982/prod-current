/**
 * taskReconciliation — Crash recovery and retention cleanup for omai_tasks.
 *
 * reconcileOrphanedTasks(): Detects tasks stuck in running/queued after a
 *   server crash and marks them failed with audit events.
 *
 * cleanupExpiredTasks(): Removes old terminal tasks beyond retention windows.
 *   Events are cleaned automatically via ON DELETE CASCADE.
 *
 * IMPORTANT: All timestamps use UTC_TIMESTAMP() to avoid mysql2 timezone
 * misinterpretation (Node.js runs in America/New_York but MariaDB SYSTEM tz is UTC).
 */

const { getAppPool } = require('../config/db');

// Tasks with no heartbeat for this many seconds are considered orphaned
const ORPHAN_THRESHOLD_SECONDS = 120;

// Retention windows (days since finished_at)
const RETENTION_DAYS = {
  succeeded: 30,
  cancelled: 30,
  failed: 90
};

/**
 * Detect and recover tasks stuck in running/queued state.
 * Called at server startup and periodically (every 30 min).
 */
async function reconcileOrphanedTasks() {
  const pool = getAppPool();

  const [orphans] = await pool.query(
    `SELECT id, task_type, title, status
     FROM omai_tasks
     WHERE status IN ('running', 'queued')
       AND TIMESTAMPDIFF(SECOND,
             COALESCE(last_heartbeat, started_at, created_at),
             UTC_TIMESTAMP()) > ?`,
    [ORPHAN_THRESHOLD_SECONDS]
  );

  if (orphans.length === 0) return 0;

  for (const task of orphans) {
    const reason = task.status === 'running'
      ? 'Task marked failed by system — process terminated unexpectedly (no heartbeat)'
      : 'Queued task expired — never started (server may have restarted)';

    await pool.query(
      `UPDATE omai_tasks
       SET status = 'failed',
           finished_at = COALESCE(finished_at, UTC_TIMESTAMP()),
           last_heartbeat = UTC_TIMESTAMP(),
           message = ?
       WHERE id = ? AND status IN ('running', 'queued')`,
      [reason, task.id]
    );

    await pool.query(
      `INSERT INTO omai_task_events (task_id, level, stage, message, detail_json, created_at)
       VALUES (?, 'warn', 'system', ?, ?, UTC_TIMESTAMP())`,
      [
        task.id,
        reason,
        JSON.stringify({ previous_status: task.status, reconciled_by: 'startup' })
      ]
    );

    console.log(`[TASK-RECONCILIATION] Task #${task.id} (${task.task_type}): ${task.status} → failed — ${reason}`);
  }

  console.log(`[TASK-RECONCILIATION] Reconciled ${orphans.length} orphaned task(s)`);
  return orphans.length;
}

/**
 * Delete old terminal tasks beyond their retention windows.
 * Events are cleaned automatically via ON DELETE CASCADE.
 */
async function cleanupExpiredTasks() {
  const pool = getAppPool();
  let totalDeleted = 0;

  for (const [status, days] of Object.entries(RETENTION_DAYS)) {
    const [result] = await pool.query(
      `DELETE FROM omai_tasks
       WHERE status = ?
         AND finished_at IS NOT NULL
         AND TIMESTAMPDIFF(DAY, finished_at, UTC_TIMESTAMP()) > ?`,
      [status, days]
    );

    if (result.affectedRows > 0) {
      console.log(`[TASK-CLEANUP] Deleted ${result.affectedRows} ${status} task(s) older than ${days} days`);
      totalDeleted += result.affectedRows;
    }
  }

  return totalDeleted;
}

module.exports = { reconcileOrphanedTasks, cleanupExpiredTasks };
