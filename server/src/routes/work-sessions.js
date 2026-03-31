/**
 * work-sessions.js — Work session tracking for authenticated users.
 *
 * Mounted at /api/work-sessions in index.ts.
 *
 * Endpoints:
 *   GET  /active  — Check for an active session for the current user
 *   POST /start   — Start a new work session (ends any existing active session first)
 *   POST /end     — End the current active session
 */

const express = require('express');
const { getAppPool } = require('../config/db-compat');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/work-sessions/active
 * Returns the active work session for the authenticated user, if any.
 */
router.get('/active', requireAuth, async (req, res) => {
  try {
    const pool = getAppPool();
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const [rows] = await pool.query(
      `SELECT id, user_id, started_at, ended_at, status, source_system, summary_note, context_json,
              TIMESTAMPDIFF(SECOND, started_at, NOW()) AS elapsed_seconds
       FROM work_sessions
       WHERE user_id = ? AND status = 'active'
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.json({ active: false, session: null });
    }

    const session = rows[0];
    return res.json({
      active: true,
      session: {
        id: session.id,
        started_at: session.started_at,
        status: session.status,
        source_system: session.source_system,
        summary_note: session.summary_note,
        elapsed_seconds: session.elapsed_seconds || 0,
      },
    });
  } catch (error) {
    console.error('[Work Sessions] active error:', error);
    return res.status(500).json({ error: 'Failed to check active session' });
  }
});

/**
 * POST /api/work-sessions/start
 * Starts a new work session. If an active session already exists, ends it first.
 * Body: { source_system?: string, context?: object }
 */
router.post('/start', requireAuth, async (req, res) => {
  try {
    const pool = getAppPool();
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { source_system = 'orthodoxmetrics', context } = req.body || {};

    // End any existing active session for this user
    await pool.query(
      `UPDATE work_sessions SET status = 'ended', ended_at = NOW() WHERE user_id = ? AND status = 'active'`,
      [userId]
    );

    // Create new session
    const contextJson = context ? JSON.stringify(context) : null;
    const [result] = await pool.query(
      `INSERT INTO work_sessions (user_id, source_system, context_json) VALUES (?, ?, ?)`,
      [userId, source_system, contextJson]
    );

    const sessionId = result.insertId;

    // Return the created session
    const [rows] = await pool.query(
      `SELECT id, user_id, started_at, status, source_system, summary_note,
              TIMESTAMPDIFF(SECOND, started_at, NOW()) AS elapsed_seconds
       FROM work_sessions WHERE id = ?`,
      [sessionId]
    );

    const session = rows[0];
    return res.json({
      success: true,
      session: {
        id: session.id,
        started_at: session.started_at,
        status: session.status,
        source_system: session.source_system,
        summary_note: session.summary_note,
        elapsed_seconds: session.elapsed_seconds || 0,
      },
    });
  } catch (error) {
    console.error('[Work Sessions] start error:', error);
    return res.status(500).json({ error: 'Failed to start work session' });
  }
});

/**
 * POST /api/work-sessions/end
 * Ends the active work session for the authenticated user.
 * Body: { summary_note?: string, context?: object }
 */
router.post('/end', requireAuth, async (req, res) => {
  try {
    const pool = getAppPool();
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { summary_note, context } = req.body || {};

    // Find active session
    const [rows] = await pool.query(
      `SELECT id, started_at, TIMESTAMPDIFF(SECOND, started_at, NOW()) AS elapsed_seconds
       FROM work_sessions WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No active session to end' });
    }

    const sessionId = rows[0].id;
    const elapsed = rows[0].elapsed_seconds || 0;

    // Build update
    const updates = [`status = 'ended'`, `ended_at = NOW()`];
    const params = [];

    if (summary_note !== undefined) {
      updates.push(`summary_note = ?`);
      params.push(summary_note);
    }
    if (context) {
      updates.push(`context_json = ?`);
      params.push(JSON.stringify(context));
    }

    params.push(sessionId);
    await pool.query(`UPDATE work_sessions SET ${updates.join(', ')} WHERE id = ?`, params);

    return res.json({
      success: true,
      ended: true,
      elapsed_seconds: elapsed,
    });
  } catch (error) {
    console.error('[Work Sessions] end error:', error);
    return res.status(500).json({ error: 'Failed to end work session' });
  }
});

module.exports = router;
