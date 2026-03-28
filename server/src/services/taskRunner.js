/**
 * taskRunner — Internal helper for creating and updating omai_tasks from services.
 *
 * IMPORTANT: All timestamps use UTC_TIMESTAMP() to avoid mysql2 timezone
 * misinterpretation (Node.js runs in America/New_York but MariaDB SYSTEM tz is UTC).
 *
 * Usage:
 *   const { createTask, updateTask, addTaskEvent, isCancelled } = require('./taskRunner');
 *   const taskId = await createTask(pool, { task_type: 'enrichment_batch', title: '...', ... });
 *   await updateTask(pool, taskId, { status: 'running', stage: 'Fetching pages', completed_count: 5 });
 *   await addTaskEvent(pool, taskId, { level: 'info', message: 'Enriched Church X' });
 *   if (await isCancelled(pool, taskId)) { /* stop work */ }
 */

const { getAppPool } = require('../config/db');

/**
 * Create a new task row. Returns the task ID.
 */
async function createTask(pool, opts) {
  pool = pool || getAppPool();
  const {
    task_type, source_feature, title,
    created_by = null, created_by_name = null,
    total_count = 0, metadata_json = null
  } = opts;

  const [result] = await pool.query(
    `INSERT INTO omai_tasks
       (task_type, source_feature, title, status, created_by, created_by_name, created_at, total_count, metadata_json)
     VALUES (?, ?, ?, 'queued', ?, ?, UTC_TIMESTAMP(), ?, ?)`,
    [
      task_type, source_feature || null, title,
      created_by, created_by_name,
      total_count,
      metadata_json ? JSON.stringify(metadata_json) : null
    ]
  );
  return result.insertId;
}

/**
 * Update a task. Automatically manages timestamps based on status.
 */
async function updateTask(pool, taskId, updates) {
  pool = pool || getAppPool();
  const sets = [];
  const params = [];

  const fields = [
    'status', 'stage', 'message',
    'total_count', 'completed_count', 'success_count', 'failure_count',
    'metadata_json', 'result_json', 'error_json'
  ];

  for (const key of fields) {
    if (updates[key] !== undefined) {
      const val = (key.endsWith('_json') && typeof updates[key] === 'object')
        ? JSON.stringify(updates[key])
        : updates[key];
      sets.push(`${key} = ?`);
      params.push(val);
    }
  }

  if (updates.status === 'running') {
    sets.push('started_at = COALESCE(started_at, UTC_TIMESTAMP())');
  }
  if (['succeeded', 'failed', 'cancelled'].includes(updates.status)) {
    sets.push('finished_at = COALESCE(finished_at, UTC_TIMESTAMP())');
  }

  sets.push('last_heartbeat = UTC_TIMESTAMP()');

  if (sets.length === 0) return;

  params.push(taskId);
  await pool.query(`UPDATE omai_tasks SET ${sets.join(', ')} WHERE id = ?`, params);
}

/**
 * Add a log event to a task.
 */
async function addTaskEvent(pool, taskId, opts) {
  pool = pool || getAppPool();
  const { level = 'info', stage = null, message, detail_json = null } = opts;

  await pool.query(
    `INSERT INTO omai_task_events (task_id, level, stage, message, detail_json, created_at)
     VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [taskId, level, stage, message, detail_json ? JSON.stringify(detail_json) : null]
  );
}

/**
 * Check if a task has a pending cancellation request.
 * Returns true if cancel_requested_at is set.
 */
async function isCancelled(pool, taskId) {
  pool = pool || getAppPool();
  const [rows] = await pool.query(
    'SELECT cancel_requested_at FROM omai_tasks WHERE id = ?',
    [taskId]
  );
  return rows.length > 0 && rows[0].cancel_requested_at !== null;
}

/**
 * Find an active (queued/running) task matching the given scope.
 * Used for duplicate-run prevention.
 *
 * @param {object} pool - DB pool
 * @param {string} taskType - e.g. 'enrichment_batch'
 * @param {string} sourceFeature - e.g. 'church-enrichment'
 * @param {object} scopeValues - key/value pairs to match against metadata_json
 * @returns {object|null} The matching task row, or null
 */
async function findActiveTaskByScope(pool, taskType, sourceFeature, scopeValues) {
  pool = pool || getAppPool();

  const [rows] = await pool.query(
    `SELECT id, title, status, metadata_json
     FROM omai_tasks
     WHERE task_type = ?
       AND source_feature = ?
       AND status IN ('queued', 'running')
     ORDER BY created_at DESC`,
    [taskType, sourceFeature]
  );

  for (const row of rows) {
    let meta = row.metadata_json;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch { continue; }
    }
    if (!meta) continue;

    // Check if all scope keys match (normalize null/undefined/empty-string to null)
    const normalize = (v) => (v === undefined || v === null || v === '') ? null : String(v);
    const matches = Object.entries(scopeValues).every(
      ([key, val]) => normalize(meta[key]) === normalize(val)
    );

    if (matches) return { id: row.id, title: row.title, status: row.status };
  }

  return null;
}

module.exports = { createTask, updateTask, addTaskEvent, isCancelled, findActiveTaskByScope };
