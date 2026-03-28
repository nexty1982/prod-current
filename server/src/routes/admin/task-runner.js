/**
 * Task Runner API — Generic task/job monitoring for OMAI Ops
 *
 * Provides CRUD + progress tracking for background operations.
 * Mounted at /api/ops/tasks in index.ts
 */

const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { getAppPool } = require('../../config/db');

const router = express.Router();
const ADMIN_ROLES = ['super_admin', 'admin'];

// ─── LIST tasks (with filtering) ────────────────────────────────────────────
router.get('/', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const { status, task_type, source_feature, created_by, limit = 50, offset = 0 } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (status) {
      // Support comma-separated statuses
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
      `SELECT t.*,
              TIMESTAMPDIFF(SECOND, t.started_at, COALESCE(t.finished_at, NOW())) AS duration_seconds
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
      `SELECT t.*,
              TIMESTAMPDIFF(SECOND, t.started_at, COALESCE(t.finished_at, NOW())) AS duration_seconds
       FROM omai_tasks t WHERE t.id = ?`,
      [taskId]
    );
    if (tasks.length === 0) return res.status(404).json({ success: false, error: 'Task not found' });

    const [events] = await pool.query(
      `SELECT * FROM omai_task_events WHERE task_id = ? ORDER BY created_at DESC LIMIT 200`,
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
      `INSERT INTO omai_tasks (task_type, source_feature, title, status, created_by, created_by_name, metadata_json)
       VALUES (?, ?, ?, 'queued', ?, ?, ?)`,
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

    // Auto-set timestamps based on status transitions
    if (req.body.status === 'running') {
      sets.push('started_at = COALESCE(started_at, NOW())');
    }
    if (['succeeded', 'failed', 'cancelled'].includes(req.body.status)) {
      sets.push('finished_at = COALESCE(finished_at, NOW())');
    }

    // Always update heartbeat on any patch
    sets.push('last_heartbeat = NOW()');

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

// ─── ADD event to task log ──────────────────────────────────────────────────
router.post('/:id/events', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) return res.status(400).json({ success: false, error: 'Invalid task ID' });

    const { level = 'info', stage, message, detail_json } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'message is required' });

    await pool.query(
      `INSERT INTO omai_task_events (task_id, level, stage, message, detail_json)
       VALUES (?, ?, ?, ?, ?)`,
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
