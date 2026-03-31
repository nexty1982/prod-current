/**
 * work-sessions.ts — Work Session Tracking + Weekly Report API
 *
 * Mounted at /api/work-sessions in index.ts.
 *
 * Provides:
 *   - Work session lifecycle (start, end, cancel, note)
 *   - Active session check (cross-app via shared auth)
 *   - Session history + stats
 *   - Weekly report config, generation, and delivery
 */

import express, { Request, Response } from 'express';

const router = express.Router();
const { getAppPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// ============================================================================
// Helpers
// ============================================================================

function getUserId(req: Request): number | null {
  return (req as any).user?.id || (req as any).session?.user?.id || null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ============================================================================
// Work Session Endpoints
// ============================================================================

/**
 * GET /api/work-sessions/active
 * Returns the current user's active work session, or { active: false }
 */
router.get('/active', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const pool = getAppPool();
    const [rows]: any = await pool.query(
      `SELECT id, user_id, source_system, started_at, ended_at, duration_seconds,
              status, start_context, end_context, summary_note, created_at, updated_at
       FROM work_sessions
       WHERE user_id = ? AND status = 'active'
       ORDER BY started_at DESC LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.json({ active: false });
    }

    const session = rows[0];
    // Parse JSON fields
    if (session.start_context && typeof session.start_context === 'string') {
      try { session.start_context = JSON.parse(session.start_context); } catch {}
    }
    if (session.end_context && typeof session.end_context === 'string') {
      try { session.end_context = JSON.parse(session.end_context); } catch {}
    }

    // Compute elapsed using DB server time to avoid timezone drift
    const [nowRows]: any = await pool.query('SELECT NOW() as now');
    const dbNow = new Date(nowRows[0].now);
    const startedAt = new Date(session.started_at);
    const elapsedSeconds = Math.max(0, Math.floor((dbNow.getTime() - startedAt.getTime()) / 1000));

    return res.json({
      active: true,
      session: {
        ...session,
        elapsed_seconds: elapsedSeconds
      }
    });
  } catch (error: any) {
    console.error('Error fetching active work session:', error);
    return res.status(500).json({ error: 'Failed to fetch active session' });
  }
});

/**
 * POST /api/work-sessions/start
 * Start a new work session. Idempotent — returns existing active session if one exists.
 * Body: { source_system?, summary_note?, context? }
 */
router.post('/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const pool = getAppPool();
    const { source_system = 'orthodoxmetrics', summary_note = null, context = {} } = req.body || {};

    // Check for existing active session (idempotent)
    const [existing]: any = await pool.query(
      `SELECT id, user_id, source_system, started_at, status, summary_note, created_at
       FROM work_sessions
       WHERE user_id = ? AND status = 'active'
       LIMIT 1`,
      [userId]
    );

    if (existing.length > 0) {
      const session = existing[0];
      return res.json({
        created: false,
        message: 'Active session already exists',
        session: {
          ...session,
          elapsed_seconds: Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
        }
      });
    }

    // Build start context
    const startContext = {
      page: context.page || null,
      ip: req.ip || (req as any).headers?.['x-real-ip'] || null,
      user_agent: (req.get('User-Agent') || '').substring(0, 255),
      ...context
    };

    // Create new session
    const [result]: any = await pool.query(
      `INSERT INTO work_sessions (user_id, source_system, started_at, status, start_context, summary_note)
       VALUES (?, ?, NOW(), 'active', ?, ?)`,
      [userId, source_system, JSON.stringify(startContext), summary_note]
    );

    const sessionId = result.insertId;

    // Log start event
    await pool.query(
      `INSERT INTO work_session_events (work_session_id, event_type, event_timestamp, metadata_json)
       VALUES (?, 'started', NOW(), ?)`,
      [sessionId, JSON.stringify({ source_system, ip: startContext.ip })]
    );

    // Fetch the created session
    const [created]: any = await pool.query(
      `SELECT id, user_id, source_system, started_at, status, summary_note, created_at
       FROM work_sessions WHERE id = ?`,
      [sessionId]
    );

    return res.status(201).json({
      created: true,
      session: {
        ...created[0],
        elapsed_seconds: 0
      }
    });
  } catch (error: any) {
    console.error('Error starting work session:', error);
    return res.status(500).json({ error: 'Failed to start work session' });
  }
});

/**
 * POST /api/work-sessions/end
 * End the current active work session.
 * Body: { summary_note?, context? }
 */
router.post('/end', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const pool = getAppPool();
    const { summary_note = null, context = {} } = req.body || {};

    // Find active session
    const [active]: any = await pool.query(
      `SELECT id, started_at FROM work_sessions
       WHERE user_id = ? AND status = 'active'
       LIMIT 1`,
      [userId]
    );

    if (active.length === 0) {
      return res.status(404).json({ error: 'No active work session found' });
    }

    const session = active[0];
    const endContext = {
      page: context.page || null,
      ip: req.ip || (req as any).headers?.['x-real-ip'] || null,
      ...context
    };

    // End the session
    await pool.query(
      `UPDATE work_sessions
       SET status = 'completed',
           ended_at = NOW(),
           duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()),
           end_context = ?,
           summary_note = COALESCE(?, summary_note),
           updated_at = NOW()
       WHERE id = ?`,
      [JSON.stringify(endContext), summary_note, session.id]
    );

    // Log end event
    await pool.query(
      `INSERT INTO work_session_events (work_session_id, event_type, event_timestamp, metadata_json)
       VALUES (?, 'ended', NOW(), ?)`,
      [session.id, JSON.stringify({ ip: endContext.ip })]
    );

    // Fetch updated session
    const [ended]: any = await pool.query(
      `SELECT id, user_id, source_system, started_at, ended_at, duration_seconds,
              status, summary_note, created_at, updated_at
       FROM work_sessions WHERE id = ?`,
      [session.id]
    );

    return res.json({
      ended: true,
      session: ended[0]
    });
  } catch (error: any) {
    console.error('Error ending work session:', error);
    return res.status(500).json({ error: 'Failed to end work session' });
  }
});

/**
 * POST /api/work-sessions/:id/note
 * Add or update the summary note on a session.
 * Body: { summary_note }
 */
router.post('/:id/note', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const pool = getAppPool();
    const sessionId = parseInt(req.params.id, 10);
    const { summary_note } = req.body || {};

    if (!summary_note) {
      return res.status(400).json({ error: 'summary_note is required' });
    }

    // Verify ownership
    const [rows]: any = await pool.query(
      'SELECT id FROM work_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await pool.query(
      'UPDATE work_sessions SET summary_note = ?, updated_at = NOW() WHERE id = ?',
      [summary_note, sessionId]
    );

    // Log note event
    await pool.query(
      `INSERT INTO work_session_events (work_session_id, event_type, event_timestamp, metadata_json)
       VALUES (?, 'note_added', NOW(), ?)`,
      [sessionId, JSON.stringify({ note_length: summary_note.length })]
    );

    return res.json({ updated: true });
  } catch (error: any) {
    console.error('Error updating session note:', error);
    return res.status(500).json({ error: 'Failed to update note' });
  }
});

/**
 * POST /api/work-sessions/:id/cancel
 * Cancel a session (e.g., started by mistake).
 */
router.post('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const pool = getAppPool();
    const sessionId = parseInt(req.params.id, 10);

    const [rows]: any = await pool.query(
      'SELECT id, status FROM work_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (rows[0].status !== 'active') {
      return res.status(400).json({ error: 'Only active sessions can be cancelled' });
    }

    await pool.query(
      `UPDATE work_sessions
       SET status = 'cancelled', ended_at = NOW(),
           duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()),
           updated_at = NOW()
       WHERE id = ?`,
      [sessionId]
    );

    await pool.query(
      `INSERT INTO work_session_events (work_session_id, event_type, event_timestamp, metadata_json)
       VALUES (?, 'cancelled', NOW(), ?)`,
      [sessionId, JSON.stringify({ reason: req.body?.reason || 'user_cancelled' })]
    );

    return res.json({ cancelled: true });
  } catch (error: any) {
    console.error('Error cancelling session:', error);
    return res.status(500).json({ error: 'Failed to cancel session' });
  }
});

/**
 * GET /api/work-sessions/history
 * List past sessions. Query params: page, limit, status, from, to
 */
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const pool = getAppPool();
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const from = req.query.from as string;
    const to = req.query.to as string;

    let where = 'WHERE user_id = ?';
    const params: any[] = [userId];

    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }
    if (from) {
      where += ' AND started_at >= ?';
      params.push(from);
    }
    if (to) {
      where += ' AND started_at <= ?';
      params.push(to + ' 23:59:59');
    }

    const [countRows]: any = await pool.query(
      `SELECT COUNT(*) as total FROM work_sessions ${where}`, params
    );
    const total = countRows[0].total;

    const [rows]: any = await pool.query(
      `SELECT id, user_id, source_system, started_at, ended_at, duration_seconds,
              status, summary_note, created_at
       FROM work_sessions ${where}
       ORDER BY started_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      sessions: rows,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    console.error('Error fetching session history:', error);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/work-sessions/stats
 * Weekly/daily stats for the current user.
 * Query params: from, to (defaults to current week)
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const pool = getAppPool();

    // Default to current week (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const from = (req.query.from as string) || monday.toISOString().split('T')[0];
    const to = (req.query.to as string) || sunday.toISOString().split('T')[0];

    // Total stats
    const [totals]: any = await pool.query(
      `SELECT COUNT(*) as session_count,
              COALESCE(SUM(duration_seconds), 0) as total_seconds,
              MIN(started_at) as earliest_start,
              MAX(ended_at) as latest_end
       FROM work_sessions
       WHERE user_id = ? AND status IN ('completed', 'active')
         AND started_at >= ? AND started_at <= ?`,
      [userId, from, to + ' 23:59:59']
    );

    // Daily breakdown
    const [daily]: any = await pool.query(
      `SELECT DATE(started_at) as date,
              COUNT(*) as session_count,
              COALESCE(SUM(duration_seconds), 0) as total_seconds
       FROM work_sessions
       WHERE user_id = ? AND status IN ('completed', 'active')
         AND started_at >= ? AND started_at <= ?
       GROUP BY DATE(started_at)
       ORDER BY date`,
      [userId, from, to + ' 23:59:59']
    );

    const stats = totals[0];
    return res.json({
      period: { from, to },
      total_seconds: stats.total_seconds,
      total_formatted: formatDuration(stats.total_seconds),
      session_count: stats.session_count,
      earliest_start: stats.earliest_start,
      latest_end: stats.latest_end,
      daily: daily.map((d: any) => ({
        date: d.date,
        session_count: d.session_count,
        total_seconds: d.total_seconds,
        total_formatted: formatDuration(d.total_seconds)
      }))
    });
  } catch (error: any) {
    console.error('Error fetching session stats:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============================================================================
// Weekly Report Endpoints
// ============================================================================

/**
 * GET /api/work-sessions/report/sections
 * List available report sections from the registry.
 */
router.get('/report/sections', requireAuth, async (_req: Request, res: Response) => {
  try {
    const pool = getAppPool();
    const [rows]: any = await pool.query(
      'SELECT id, action_key, display_name, description, default_enabled, sort_order FROM report_action_registry ORDER BY sort_order'
    );
    return res.json({ sections: rows });
  } catch (error: any) {
    console.error('Error fetching report sections:', error);
    return res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

/**
 * GET /api/work-sessions/report/config
 * Get the current user's weekly report configuration.
 */
router.get('/report/config', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const pool = getAppPool();
    const [rows]: any = await pool.query(
      'SELECT * FROM weekly_report_configs WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      // Return defaults
      return res.json({
        config: null,
        defaults: {
          is_enabled: true,
          schedule_day: 1,
          schedule_hour: 8,
          timezone: 'America/New_York',
          recipients: [],
          enabled_sections: ['work_sessions', 'tasks_completed', 'highlights']
        }
      });
    }

    const config = rows[0];
    if (config.recipients && typeof config.recipients === 'string') {
      try { config.recipients = JSON.parse(config.recipients); } catch {}
    }
    if (config.enabled_sections && typeof config.enabled_sections === 'string') {
      try { config.enabled_sections = JSON.parse(config.enabled_sections); } catch {}
    }

    return res.json({ config });
  } catch (error: any) {
    console.error('Error fetching report config:', error);
    return res.status(500).json({ error: 'Failed to fetch config' });
  }
});

/**
 * PUT /api/work-sessions/report/config
 * Create or update the user's weekly report configuration.
 */
router.put('/report/config', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const pool = getAppPool();
    const {
      is_enabled = true,
      schedule_day = 1,
      schedule_hour = 8,
      timezone = 'America/New_York',
      recipients = [],
      enabled_sections = ['work_sessions', 'tasks_completed', 'highlights']
    } = req.body || {};

    await pool.query(
      `INSERT INTO weekly_report_configs
        (user_id, is_enabled, schedule_day, schedule_hour, timezone, recipients, enabled_sections)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        is_enabled = VALUES(is_enabled),
        schedule_day = VALUES(schedule_day),
        schedule_hour = VALUES(schedule_hour),
        timezone = VALUES(timezone),
        recipients = VALUES(recipients),
        enabled_sections = VALUES(enabled_sections),
        updated_at = NOW()`,
      [
        userId, is_enabled ? 1 : 0, schedule_day, schedule_hour, timezone,
        JSON.stringify(recipients), JSON.stringify(enabled_sections)
      ]
    );

    return res.json({ updated: true });
  } catch (error: any) {
    console.error('Error updating report config:', error);
    return res.status(500).json({ error: 'Failed to update config' });
  }
});

/**
 * GET /api/work-sessions/report/runs
 * List report run history. Query params: page, limit
 */
router.get('/report/runs', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const pool = getAppPool();
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const offset = (page - 1) * limit;

    const [rows]: any = await pool.query(
      `SELECT id, config_id, user_id, period_start, period_end, status,
              error_message, generated_at, sent_at, created_at
       FROM weekly_report_runs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [countRows]: any = await pool.query(
      'SELECT COUNT(*) as total FROM weekly_report_runs WHERE user_id = ?',
      [userId]
    );

    return res.json({
      runs: rows,
      pagination: { page, limit, total: countRows[0].total }
    });
  } catch (error: any) {
    console.error('Error fetching report runs:', error);
    return res.status(500).json({ error: 'Failed to fetch runs' });
  }
});

/**
 * POST /api/work-sessions/report/generate
 * Generate a report now (preview). Body: { period_start?, period_end? }
 */
router.post('/report/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    // Default to last 7 days
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const periodStart = (req.body?.period_start) || weekAgo.toISOString().split('T')[0];
    const periodEnd = (req.body?.period_end) || now.toISOString().split('T')[0];

    const { generateReport } = require('../services/weeklyReportService');
    const report = await generateReport(userId, periodStart, periodEnd);

    return res.json(report);
  } catch (error: any) {
    console.error('Error generating report:', error);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * POST /api/work-sessions/report/send
 * Send or resend a report. Body: { run_id }
 */
router.post('/report/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { run_id } = req.body || {};
    if (!run_id) return res.status(400).json({ error: 'run_id is required' });

    const { sendReport } = require('../services/weeklyReportService');
    await sendReport(run_id, userId);

    return res.json({ sent: true });
  } catch (error: any) {
    console.error('Error sending report:', error);
    return res.status(500).json({ error: 'Failed to send report' });
  }
});

/**
 * GET /api/work-sessions/report/runs/:id/html
 * Get the HTML content of a specific report run (for preview).
 */
router.get('/report/runs/:id/html', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const pool = getAppPool();
    const runId = parseInt(req.params.id, 10);

    const [rows]: any = await pool.query(
      'SELECT report_html FROM weekly_report_runs WHERE id = ? AND user_id = ?',
      [runId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.set('Content-Type', 'text/html');
    return res.send(rows[0].report_html || '<p>No report content</p>');
  } catch (error: any) {
    console.error('Error fetching report HTML:', error);
    return res.status(500).json({ error: 'Failed to fetch report' });
  }
});

module.exports = router;
export default router;
