/**
 * taskRunner — Internal helper for creating and updating omai_tasks from services.
 *
 * Usage:
 *   const { createTask, updateTask, addTaskEvent } = require('./taskRunner');
 *   const taskId = await createTask(pool, { task_type: 'enrichment_batch', title: '...', ... });
 *   await updateTask(pool, taskId, { status: 'running', stage: 'Fetching pages', completed_count: 5 });
 *   await addTaskEvent(pool, taskId, { level: 'info', message: 'Enriched Church X' });
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
       (task_type, source_feature, title, status, created_by, created_by_name, total_count, metadata_json)
     VALUES (?, ?, ?, 'queued', ?, ?, ?, ?)`,
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
    sets.push('started_at = COALESCE(started_at, NOW())');
  }
  if (['succeeded', 'failed', 'cancelled'].includes(updates.status)) {
    sets.push('finished_at = COALESCE(finished_at, NOW())');
  }

  sets.push('last_heartbeat = NOW()');

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
    `INSERT INTO omai_task_events (task_id, level, stage, message, detail_json)
     VALUES (?, ?, ?, ?, ?)`,
    [taskId, level, stage, message, detail_json ? JSON.stringify(detail_json) : null]
  );
}

module.exports = { createTask, updateTask, addTaskEvent };
