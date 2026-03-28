/**
 * Task Runner API — Generic task/job monitoring for OMAI Ops
 *
 * Provides CRUD + progress tracking for background operations.
 * Mounted at /api/ops/tasks in index.ts
 *
 * IMPORTANT: All timestamps use UTC_TIMESTAMP() and are formatted as ISO 8601
 * UTC strings in SQL to avoid mysql2 timezone misinterpretation (the Node.js
 * process runs in America/New_York but MariaDB SYSTEM tz is UTC).
 */

const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { getAppPool } = require('../../config/db');

const router = express.Router();
const ADMIN_ROLES = ['super_admin', 'admin'];

// Stale threshold: task is stale if running with no heartbeat for this many seconds
const STALE_THRESHOLD_SECONDS = 60;

// SQL fragment to format TIMESTAMP columns as ISO 8601 UTC strings
// This bypasses mysql2's timezone misinterpretation entirely
const TS = (col) => `DATE_FORMAT(${col}, '%Y-%m-%dT%H:%i:%sZ')`;

// Common SELECT columns with UTC-safe timestamp formatting
const TASK_COLUMNS = `
  t.id, t.task_type, t.source_feature, t.title, t.status,
  t.stage, t.message,
  t.created_by, t.created_by_name,
  ${TS('t.created_at')} AS created_at,
  ${TS('t.started_at')} AS started_at,
  ${TS('t.finished_at')} AS finished_at,
  ${TS('t.last_heartbeat')} AS last_heartbeat,
  ${TS('t.cancel_requested_at')} AS cancel_requested_at,
  t.total_count, t.completed_count, t.success_count, t.failure_count,
  t.metadata_json, t.result_json, t.error_json,
  TIMESTAMPDIFF(SECOND, t.started_at, COALESCE(t.finished_at, UTC_TIMESTAMP())) AS duration_seconds,
  CASE
    WHEN t.status = 'running' AND t.last_heartbeat IS NOT NULL
         AND TIMESTAMPDIFF(SECOND, t.last_heartbeat, UTC_TIMESTAMP()) > ${STALE_THRESHOLD_SECONDS}
    THEN 1
    WHEN t.status = 'running' AND t.last_heartbeat IS NULL
         AND TIMESTAMPDIFF(SECOND, t.started_at, UTC_TIMESTAMP()) > ${STALE_THRESHOLD_SECONDS}
    THEN 1
    ELSE 0
  END AS is_stale
`;

const EVENT_COLUMNS = `
  e.id, e.task_id, e.level, e.stage, e.message, e.detail_json,
  ${TS('e.created_at')} AS created_at
`;

// ─── LIST tasks (with filtering) ────────────────────────────────────────────
router.get('/', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const { status, task_type, source_feature, created_by, limit = 50, offset = 0 } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      where += ` AND t.status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }
    if (task_type) {
      where += ' AND t.task_type = ?';
      params.push(task_type);
    }
    if (source_feature) {
      where += ' AND t.source_feature = ?';
      params.push(source_feature);
    }
    if (created_by) {
      where += ' AND t.created_by = ?';
      params.push(created_by);
    }

    const [rows] = await pool.query(
      `SELECT ${TASK_COLUMNS}
       FROM omai_tasks t
       ${where}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM omai_tasks t ${where}`,
      params
    );

    res.json({
      success: true,
      tasks: rows,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('[TaskRunner] List error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET single task detail ─────────────────────────────────────────────────
router.get('/:id', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) return res.status(400).json({ success: false, error: 'Invalid task ID' });

    const [tasks] = await pool.query(
      `SELECT ${TASK_COLUMNS}
       FROM omai_tasks t WHERE t.id = ?`,
      [taskId]
    );
    if (tasks.length === 0) return res.status(404).json({ success: false, error: 'Task not found' });

    const [events] = await pool.query(
      `SELECT ${EVENT_COLUMNS}
       FROM omai_task_events e WHERE e.task_id = ? ORDER BY e.created_at DESC LIMIT 200`,
      [taskId]
    );

    res.json({ success: true, task: tasks[0], events });
  } catch (err) {
    console.error('[TaskRunner] Detail error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CREATE a new task ──────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const { task_type, source_feature, title, metadata_json } = req.body;

    if (!task_type || !title) {
      return res.status(400).json({ success: false, error: 'task_type and title are required' });
    }

    const userId = req.session?.user?.id || req.user?.id || null;
    const userName = req.session?.user?.username || req.user?.username || null;

    const [result] = await pool.query(
      `INSERT INTO omai_tasks (task_type, source_feature, title, status, created_by, created_by_name, created_at, metadata_json)
       VALUES (?, ?, ?, 'queued', ?, ?, UTC_TIMESTAMP(), ?)`,
      [task_type, source_feature || null, title, userId, userName, metadata_json ? JSON.stringify(metadata_json) : null]
    );

    res.json({ success: true, task_id: result.insertId });
  } catch (err) {
    console.error('[TaskRunner] Create error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── UPDATE task (heartbeat, progress, status) ─────────────────────────────
router.patch('/:id', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) return res.status(400).json({ success: false, error: 'Invalid task ID' });

    const allowed = [
      'status', 'stage', 'message',
      'total_count', 'completed_count', 'success_count', 'failure_count',
      'metadata_json', 'result_json', 'error_json'
    ];

    const sets = [];
    const params = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        const val = (key.endsWith('_json') && typeof req.body[key] === 'object')
          ? JSON.stringify(req.body[key])
          : req.body[key];
        sets.push(`${key} = ?`);
        params.push(val);
      }
    }

    // Auto-set timestamps based on status transitions (all UTC)
    if (req.body.status === 'running') {
      sets.push('started_at = COALESCE(started_at, UTC_TIMESTAMP())');
    }
    if (['succeeded', 'failed', 'cancelled'].includes(req.body.status)) {
      sets.push('finished_at = COALESCE(finished_at, UTC_TIMESTAMP())');
    }

    // Always update heartbeat on any patch
    sets.push('last_heartbeat = UTC_TIMESTAMP()');

    if (sets.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    params.push(taskId);
    await pool.query(`UPDATE omai_tasks SET ${sets.join(', ')} WHERE id = ?`, params);

    res.json({ success: true });
  } catch (err) {
    console.error('[TaskRunner] Update error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── REQUEST CANCELLATION ───────────────────────────────────────────────────
router.post('/:id/cancel', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) return res.status(400).json({ success: false, error: 'Invalid task ID' });

    // Only allow cancellation of queued/running tasks
    const [tasks] = await pool.query('SELECT status FROM omai_tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) return res.status(404).json({ success: false, error: 'Task not found' });

    const { status } = tasks[0];
    if (status !== 'queued' && status !== 'running') {
      return res.status(400).json({ success: false, error: `Cannot cancel task in '${status}' status` });
    }

    // For queued tasks, cancel immediately
    if (status === 'queued') {
      await pool.query(
        `UPDATE omai_tasks SET status = 'cancelled', cancel_requested_at = UTC_TIMESTAMP(), finished_at = UTC_TIMESTAMP(), last_heartbeat = UTC_TIMESTAMP() WHERE id = ?`,
        [taskId]
      );
      return res.json({ success: true, immediate: true, message: 'Task cancelled' });
    }

    // For running tasks, set cancel_requested_at — the execution loop must check this
    await pool.query(
      `UPDATE omai_tasks SET cancel_requested_at = UTC_TIMESTAMP(), last_heartbeat = UTC_TIMESTAMP() WHERE id = ?`,
      [taskId]
    );

    res.json({ success: true, immediate: false, message: 'Cancellation requested — task will stop at next checkpoint' });
  } catch (err) {
    console.error('[TaskRunner] Cancel error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ADD event to task log ──────────────────────────────────────────────────
router.post('/:id/events', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) return res.status(400).json({ success: false, error: 'Invalid task ID' });

    const { level = 'info', stage, message, detail_json } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'message is required' });

    await pool.query(
      `INSERT INTO omai_task_events (task_id, level, stage, message, detail_json, created_at)
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      [taskId, level, stage || null, message, detail_json ? JSON.stringify(detail_json) : null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[TaskRunner] Event error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET distinct task types & source features (for filter dropdowns) ───────
router.get('/meta/filters', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const [types] = await pool.query('SELECT DISTINCT task_type FROM omai_tasks ORDER BY task_type');
    const [sources] = await pool.query('SELECT DISTINCT source_feature FROM omai_tasks WHERE source_feature IS NOT NULL ORDER BY source_feature');

    res.json({
      success: true,
      task_types: types.map(r => r.task_type),
      source_features: sources.map(r => r.source_feature)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
