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
const { publishPlatformEvent } = require('../../services/platformEvents');

const router = express.Router();
const ADMIN_ROLES = ['super_admin', 'admin'];

// Helper to extract actor info from request
function getActor(req) {
  const user = req.session?.user || req.user;
  return {
    actor_type: user ? 'user' : 'system',
    actor_id: user?.id || null,
    actor_name: user?.username || user?.email || null,
  };
}

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
  t.cancelled_by, t.cancelled_by_name,
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

// Parse JSON string columns into objects (mysql2 returns JSON columns as strings)
function parseJsonFields(row) {
  for (const key of ['metadata_json', 'result_json', 'error_json']) {
    if (typeof row[key] === 'string') {
      try { row[key] = JSON.parse(row[key]); } catch { /* leave as string */ }
    }
  }
  return row;
}

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
      tasks: rows.map(parseJsonFields),
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

    res.json({ success: true, task: parseJsonFields(tasks[0]), events });
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

    // Publish event (fire-and-forget)
    const actor = getActor(req);
    publishPlatformEvent({
      event_type: 'task.created', category: 'task', severity: 'info',
      source_system: 'task_runner', source_ref_id: result.insertId,
      title: `Task created: ${title}`, message: `Type: ${task_type}`,
      event_payload: { task_type, source_feature, title },
      ...actor, platform: 'omai',
    }).catch(() => {});

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

    // Publish status transition events
    const status = req.body.status;
    if (status && ['running', 'succeeded', 'failed', 'cancelled'].includes(status)) {
      const eventMap = {
        running: { type: 'task.started', sev: 'info' },
        succeeded: { type: 'task.completed', sev: 'success' },
        failed: { type: 'task.failed', sev: 'warning' },
        cancelled: { type: 'task.cancelled', sev: 'info' },
      };
      const { type, sev } = eventMap[status];
      const actor = getActor(req);
      publishPlatformEvent({
        event_type: type, category: 'task', severity: sev,
        source_system: 'task_runner', source_ref_id: taskId,
        title: `Task #${taskId} ${status}`,
        ...actor, platform: 'omai',
      }).catch(() => {});
    }

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

    const userId = req.session?.user?.id || req.user?.id || null;
    const userName = req.session?.user?.username || req.user?.username || null;

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
        `UPDATE omai_tasks SET status = 'cancelled', cancel_requested_at = UTC_TIMESTAMP(), cancelled_by = ?, cancelled_by_name = ?, finished_at = UTC_TIMESTAMP(), last_heartbeat = UTC_TIMESTAMP() WHERE id = ?`,
        [userId, userName, taskId]
      );
      await pool.query(
        `INSERT INTO omai_task_events (task_id, level, stage, message, detail_json, created_at) VALUES (?, 'info', 'system', ?, ?, UTC_TIMESTAMP())`,
        [taskId, `Cancelled by ${userName || 'unknown'}`, JSON.stringify({ cancelled_by: userId, cancelled_by_name: userName })]
      );
      const actor = getActor(req);
      publishPlatformEvent({
        event_type: 'task.cancelled', category: 'task', severity: 'info',
        source_system: 'task_runner', source_ref_id: taskId,
        title: `Task #${taskId} cancelled`, message: `Cancelled by ${userName || 'unknown'}`,
        ...actor, platform: 'omai',
      }).catch(() => {});
      return res.json({ success: true, immediate: true, message: 'Task cancelled' });
    }

    // For running tasks, set cancel_requested_at — the execution loop must check this
    await pool.query(
      `UPDATE omai_tasks SET cancel_requested_at = UTC_TIMESTAMP(), cancelled_by = ?, cancelled_by_name = ?, last_heartbeat = UTC_TIMESTAMP() WHERE id = ?`,
      [userId, userName, taskId]
    );
    await pool.query(
      `INSERT INTO omai_task_events (task_id, level, stage, message, detail_json, created_at) VALUES (?, 'info', 'system', ?, ?, UTC_TIMESTAMP())`,
      [taskId, `Cancellation requested by ${userName || 'unknown'}`, JSON.stringify({ cancelled_by: userId, cancelled_by_name: userName })]
    );

    const actor = getActor(req);
    publishPlatformEvent({
      event_type: 'task.cancelled', category: 'task', severity: 'info',
      source_system: 'task_runner', source_ref_id: taskId,
      title: `Task #${taskId} cancellation requested`,
      ...actor, platform: 'omai',
    }).catch(() => {});

    res.json({ success: true, immediate: false, message: 'Cancellation requested — task will stop at next checkpoint' });
  } catch (err) {
    console.error('[TaskRunner] Cancel error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── RUN a task (transition queued → running) ──────────────────────────────
router.post('/:id/run', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) return res.status(400).json({ success: false, error: 'Invalid task ID' });

    const [tasks] = await pool.query('SELECT status FROM omai_tasks WHERE id = ?', [taskId]);
    if (!tasks.length) return res.status(404).json({ success: false, error: 'Task not found' });

    const { status } = tasks[0];
    if (status !== 'queued') {
      return res.status(400).json({ success: false, error: `Cannot run task in '${status}' status — must be queued` });
    }

    const userName = req.session?.user?.username || req.user?.username || req.user?.email || 'unknown';

    await pool.query(
      `UPDATE omai_tasks SET status = 'running', started_at = UTC_TIMESTAMP(), last_heartbeat = UTC_TIMESTAMP() WHERE id = ?`,
      [taskId]
    );
    await pool.query(
      `INSERT INTO omai_task_events (task_id, level, stage, message, created_at)
       VALUES (?, 'info', 'system', ?, UTC_TIMESTAMP())`,
      [taskId, `Started by ${userName}`]
    );

    const actor = getActor(req);
    publishPlatformEvent({
      event_type: 'task.started', category: 'task', severity: 'info',
      source_system: 'task_runner', source_ref_id: taskId,
      title: `Task #${taskId} started`, message: `Started by ${userName}`,
      ...actor, platform: 'omai',
    }).catch(() => {});

    res.json({ success: true, message: 'Task started' });
  } catch (err) {
    console.error('[TaskRunner] Run error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── RETRY a failed/cancelled task (clone as new queued task) ──────────────
router.post('/:id/retry', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) return res.status(400).json({ success: false, error: 'Invalid task ID' });

    const [tasks] = await pool.query(
      `SELECT task_type, source_feature, title, metadata_json, total_count FROM omai_tasks WHERE id = ?`,
      [taskId]
    );
    if (!tasks.length) return res.status(404).json({ success: false, error: 'Task not found' });

    const orig = tasks[0];
    const userId = req.session?.user?.id || req.user?.id || null;
    const userName = req.session?.user?.username || req.user?.username || req.user?.email || null;

    const [result] = await pool.query(
      `INSERT INTO omai_tasks (task_type, source_feature, title, status, created_by, created_by_name, created_at, total_count, metadata_json, message)
       VALUES (?, ?, ?, 'queued', ?, ?, UTC_TIMESTAMP(), ?, ?, ?)`,
      [orig.task_type, orig.source_feature, orig.title, userId, userName, orig.total_count || 0,
       orig.metadata_json, `Retry of task #${taskId}`]
    );

    // Log event on original task
    await pool.query(
      `INSERT INTO omai_task_events (task_id, level, stage, message, created_at)
       VALUES (?, 'info', 'system', ?, UTC_TIMESTAMP())`,
      [taskId, `Retried as task #${result.insertId} by ${userName || 'unknown'}`]
    );

    const actor = getActor(req);
    publishPlatformEvent({
      event_type: 'task.retry_queued', category: 'task', severity: 'info',
      source_system: 'task_runner', source_ref_id: result.insertId,
      title: `Task #${taskId} retried as #${result.insertId}`,
      event_payload: { original_task_id: taskId },
      ...actor, platform: 'omai',
    }).catch(() => {});

    res.json({ success: true, new_task_id: result.insertId, message: `Retried as task #${result.insertId}` });
  } catch (err) {
    console.error('[TaskRunner] Retry error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ASSIGN a task to a user/agent ────────────────────────────────────────
router.patch('/:id/assign', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) return res.status(400).json({ success: false, error: 'Invalid task ID' });

    const { assignee_name } = req.body;
    if (!assignee_name) return res.status(400).json({ success: false, error: 'assignee_name is required' });

    const [tasks] = await pool.query('SELECT id FROM omai_tasks WHERE id = ?', [taskId]);
    if (!tasks.length) return res.status(404).json({ success: false, error: 'Task not found' });

    // Store assignment in metadata_json
    const [current] = await pool.query('SELECT metadata_json FROM omai_tasks WHERE id = ?', [taskId]);
    let metadata = {};
    if (current[0]?.metadata_json) {
      metadata = typeof current[0].metadata_json === 'string'
        ? JSON.parse(current[0].metadata_json) : current[0].metadata_json;
    }
    metadata.assigned_to = assignee_name;
    metadata.assigned_at = new Date().toISOString();

    const userName = req.session?.user?.username || req.user?.username || req.user?.email || 'unknown';

    await pool.query(
      `UPDATE omai_tasks SET metadata_json = ?, last_heartbeat = UTC_TIMESTAMP() WHERE id = ?`,
      [JSON.stringify(metadata), taskId]
    );
    await pool.query(
      `INSERT INTO omai_task_events (task_id, level, stage, message, created_at)
       VALUES (?, 'info', 'system', ?, UTC_TIMESTAMP())`,
      [taskId, `Assigned to ${assignee_name} by ${userName}`]
    );

    const actor = getActor(req);
    publishPlatformEvent({
      event_type: 'task.assigned', category: 'task', severity: 'info',
      source_system: 'task_runner', source_ref_id: taskId,
      title: `Task #${taskId} assigned to ${assignee_name}`,
      event_payload: { assignee_name },
      ...actor, platform: 'omai',
    }).catch(() => {});

    res.json({ success: true, message: `Task assigned to ${assignee_name}` });
  } catch (err) {
    console.error('[TaskRunner] Assign error:', err);
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
