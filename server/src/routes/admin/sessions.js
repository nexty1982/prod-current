/**
 * admin/sessions.js — Full Session Management & Control API
 *
 * Source of truth: user_sessions table (populated by sessionTracker middleware).
 * Also queries refresh_tokens for JWT-linked sessions and express sessions table.
 *
 * Endpoints:
 *   GET    /                         List sessions (paginated, filterable)
 *   GET    /stats                    Dashboard statistics
 *   GET    /:id                      Session detail (with recent routes)
 *   POST   /:id/terminate            Terminate a session
 *   POST   /:id/lock                 Lock a session
 *   POST   /:id/unlock               Unlock a session
 *   POST   /:id/message              Send message to session user
 *   POST   /user/:userId/terminate-all   Terminate all sessions for a user
 *   DELETE /cleanup/expired           Purge expired sessions
 */

const express = require('express');
const router = express.Router();
const { requireRole } = require('../../middleware/auth');
const { getAppPool } = require('../../config/db');

const pool = () => getAppPool();

// ─── GET / — List sessions ──────────────────────────────────
router.get('/', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const {
      search = '',
      status = '',
      role: roleFilter = '',
      sort = 'last_activity',
      direction = 'desc',
      limit = 50,
      offset = 0
    } = req.query;

    const allowedSorts = ['last_activity', 'created_at', 'user_email', 'ip_address', 'role'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'last_activity';
    const dir = direction === 'asc' ? 'ASC' : 'DESC';

    let where = '1=1';
    const params = [];

    // Status filter
    if (status === 'active') {
      where += ' AND s.is_active = 1 AND s.terminated_at IS NULL AND s.is_locked = 0';
    } else if (status === 'expired') {
      where += ' AND (s.is_active = 0 OR s.expires_at <= NOW())';
    } else if (status === 'locked') {
      where += ' AND s.is_locked = 1';
    } else if (status === 'terminated') {
      where += ' AND s.terminated_at IS NOT NULL';
    }

    // Role filter
    if (roleFilter) {
      where += ' AND s.role = ?';
      params.push(roleFilter);
    }

    // Search
    if (search) {
      where += ' AND (s.user_email LIKE ? OR s.ip_address LIKE ? OR s.client LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    // Count
    const [countRows] = await pool().query(
      `SELECT COUNT(*) as total FROM user_sessions s WHERE ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // Data
    const dataParams = [...params, parseInt(limit), parseInt(offset)];
    const [sessions] = await pool().query(`
      SELECT
        s.id,
        s.session_token,
        s.session_source,
        s.user_id,
        s.user_email,
        s.role,
        s.church_id,
        s.ip_address,
        s.user_agent,
        s.client,
        s.device_type,
        s.location,
        s.created_at,
        s.last_activity,
        s.expires_at,
        s.is_active,
        s.is_locked,
        s.lock_reason,
        s.terminated_at,
        s.terminated_by,
        CASE
          WHEN s.terminated_at IS NOT NULL THEN 'terminated'
          WHEN s.is_locked = 1 THEN 'locked'
          WHEN s.expires_at <= NOW() OR s.is_active = 0 THEN 'expired'
          ELSE 'active'
        END as computed_status,
        TIMESTAMPDIFF(SECOND, s.created_at, COALESCE(s.terminated_at, NOW())) as duration_seconds
      FROM user_sessions s
      WHERE ${where}
      ORDER BY s.${sortCol} ${dir}
      LIMIT ? OFFSET ?
    `, dataParams);

    res.json({
      success: true,
      sessions,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[Sessions] List error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions', error: error.message });
  }
});

// ─── GET /stats — Dashboard statistics ──────────────────────
router.get('/stats', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const [rows] = await pool().query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 AND terminated_at IS NULL AND is_locked = 0 AND expires_at > NOW() THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN (is_active = 0 OR expires_at <= NOW()) AND terminated_at IS NULL THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN is_locked = 1 THEN 1 ELSE 0 END) as locked,
        SUM(CASE WHEN terminated_at IS NOT NULL THEN 1 ELSE 0 END) as terminated_count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT ip_address) as unique_ips,
        COUNT(DISTINCT CASE WHEN device_type = 'mobile' THEN id END) as mobile_sessions,
        COUNT(DISTINCT CASE WHEN device_type = 'desktop' THEN id END) as desktop_sessions,
        MIN(created_at) as oldest_session,
        MAX(last_activity) as most_recent_activity
      FROM user_sessions
    `);

    // Active sessions breakdown by role
    const [roleBreakdown] = await pool().query(`
      SELECT role, COUNT(*) as count
      FROM user_sessions
      WHERE is_active = 1 AND terminated_at IS NULL AND expires_at > NOW()
      GROUP BY role
      ORDER BY count DESC
    `);

    // Sessions per user (for duplicate detection)
    const [perUser] = await pool().query(`
      SELECT user_id, user_email, COUNT(*) as session_count
      FROM user_sessions
      WHERE is_active = 1 AND terminated_at IS NULL AND expires_at > NOW()
      GROUP BY user_id, user_email
      HAVING session_count > 1
      ORDER BY session_count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      ...rows[0],
      role_breakdown: roleBreakdown,
      duplicate_sessions: perUser
    });
  } catch (error) {
    console.error('[Sessions] Stats error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: error.message });
  }
});

// ─── GET /:id — Session detail with activity ────────────────
router.get('/:id', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const [sessions] = await pool().query(`
      SELECT s.*,
        u.first_name, u.last_name, u.display_name, u.email as user_email_verified,
        COALESCE(c.church_name, '') as church_name,
        CASE
          WHEN s.terminated_at IS NOT NULL THEN 'terminated'
          WHEN s.is_locked = 1 THEN 'locked'
          WHEN s.expires_at <= NOW() OR s.is_active = 0 THEN 'expired'
          ELSE 'active'
        END as computed_status,
        TIMESTAMPDIFF(SECOND, s.created_at, COALESCE(s.terminated_at, NOW())) as duration_seconds
      FROM user_sessions s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN churches c ON u.church_id = c.id
      WHERE s.id = ?
    `, [id]);

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const session = sessions[0];

    // Recent route activity (last 50)
    const [routes] = await pool().query(`
      SELECT method, path, status_code, response_time_ms, created_at
      FROM session_route_log
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [id]);

    // Messages for this session
    const [messages] = await pool().query(`
      SELECT id, message_type, title, body, sent_by, sent_at, read_at, delivered_at
      FROM session_messages
      WHERE session_id = ?
      ORDER BY sent_at DESC
      LIMIT 20
    `, [id]);

    res.json({
      success: true,
      session,
      routes,
      messages
    });
  } catch (error) {
    console.error('[Sessions] Detail error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch session detail', error: error.message });
  }
});

// ─── POST /:id/terminate — Terminate a session ─────────────
router.post('/:id/terminate', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || req.session?.user?.id;

    // Get session info first
    const [existing] = await pool().query('SELECT id, user_id, session_token FROM user_sessions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const sess = existing[0];

    // Mark terminated
    await pool().query(
      'UPDATE user_sessions SET terminated_at = NOW(), terminated_by = ?, is_active = 0 WHERE id = ?',
      [adminId, id]
    );

    // Also revoke matching refresh token if JWT session
    if (sess.session_token?.startsWith('jwt_')) {
      const tokenHash = sess.session_token.substring(4);
      await pool().query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash LIKE ? AND user_id = ?',
        [`${tokenHash}%`, sess.user_id]
      ).catch(() => {}); // Best effort
    }

    // Delete express session if session-based
    if (sess.session_token?.startsWith('sid_')) {
      const sid = sess.session_token.substring(4);
      await pool().query('DELETE FROM sessions WHERE session_id = ?', [sid]).catch(() => {});
    }

    // Audit log
    pool().query(
      `INSERT INTO activity_log (user_id, action, details, ip_address, user_agent, created_at)
       VALUES (?, 'session_terminate', ?, ?, ?, NOW())`,
      [adminId, JSON.stringify({ session_id: id, target_user_id: sess.user_id }), req.ip, (req.get('User-Agent') || '').substring(0, 255)]
    ).catch(() => {});

    res.json({ success: true, message: 'Session terminated' });
  } catch (error) {
    console.error('[Sessions] Terminate error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to terminate session', error: error.message });
  }
});

// ─── POST /:id/lock — Lock a session ───────────────────────
router.post('/:id/lock', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [existing] = await pool().query('SELECT id FROM user_sessions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    await pool().query(
      'UPDATE user_sessions SET is_locked = 1, lock_reason = ? WHERE id = ?',
      [reason || 'Locked by administrator', id]
    );

    res.json({ success: true, message: 'Session locked' });
  } catch (error) {
    console.error('[Sessions] Lock error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to lock session', error: error.message });
  }
});

// ─── POST /:id/unlock — Unlock a session ───────────────────
router.post('/:id/unlock', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await pool().query(
      'UPDATE user_sessions SET is_locked = 0, lock_reason = NULL WHERE id = ?',
      [id]
    );

    res.json({ success: true, message: 'Session unlocked' });
  } catch (error) {
    console.error('[Sessions] Unlock error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to unlock session', error: error.message });
  }
});

// ─── POST /:id/message — Send message to session ───────────
router.post('/:id/message', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { message_type = 'info', title, body } = req.body;
    const sentBy = req.user?.id || req.session?.user?.id;

    if (!body) {
      return res.status(400).json({ success: false, message: 'Message body is required' });
    }

    const [existing] = await pool().query('SELECT id FROM user_sessions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const [result] = await pool().query(
      'INSERT INTO session_messages (session_id, message_type, title, body, sent_by) VALUES (?, ?, ?, ?, ?)',
      [id, message_type, title || null, body, sentBy]
    );

    res.json({ success: true, message: 'Message sent', id: result.insertId });
  } catch (error) {
    console.error('[Sessions] Message error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send message', error: error.message });
  }
});

// ─── POST /user/:userId/terminate-all — Force logout user ──
router.post('/user/:userId/terminate-all', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user?.id || req.session?.user?.id;

    // Terminate all user_sessions
    const [result] = await pool().query(
      'UPDATE user_sessions SET terminated_at = NOW(), terminated_by = ?, is_active = 0 WHERE user_id = ? AND terminated_at IS NULL',
      [adminId, userId]
    );

    // Revoke all refresh tokens
    await pool().query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [userId]).catch(() => {});

    // Delete express sessions for this user
    await pool().query('DELETE FROM sessions WHERE user_id = ?', [userId]).catch(() => {});

    // Audit log
    pool().query(
      `INSERT INTO activity_log (user_id, action, details, ip_address, user_agent, created_at)
       VALUES (?, 'force_logout_user', ?, ?, ?, NOW())`,
      [adminId, JSON.stringify({ target_user_id: userId, sessions_terminated: result.affectedRows }), req.ip, (req.get('User-Agent') || '').substring(0, 255)]
    ).catch(() => {});

    res.json({ success: true, message: `Terminated ${result.affectedRows} session(s) for user ${userId}` });
  } catch (error) {
    console.error('[Sessions] Force logout error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to terminate user sessions', error: error.message });
  }
});

// ─── DELETE /cleanup/expired — Purge expired sessions ───────
router.delete('/cleanup/expired', requireRole(['super_admin']), async (req, res) => {
  try {
    // Mark expired sessions as inactive
    const [updated] = await pool().query(
      'UPDATE user_sessions SET is_active = 0 WHERE expires_at <= NOW() AND is_active = 1'
    );

    // Delete sessions terminated more than 30 days ago
    const [deleted] = await pool().query(
      'DELETE FROM user_sessions WHERE terminated_at IS NOT NULL AND terminated_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );

    // Clean old route logs (> 7 days)
    await pool().query('DELETE FROM session_route_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)').catch(() => {});

    // Also clean expired refresh tokens
    const [rtDeleted] = await pool().query('DELETE FROM refresh_tokens WHERE expires_at <= NOW()');

    // Also clean expired express sessions
    await pool().query('DELETE FROM sessions WHERE expires <= UNIX_TIMESTAMP()').catch(() => {});

    res.json({
      success: true,
      message: `Marked ${updated.affectedRows} expired, purged ${deleted.affectedRows} old terminated, cleaned ${rtDeleted.affectedRows} refresh tokens`
    });
  } catch (error) {
    console.error('[Sessions] Cleanup error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to cleanup', error: error.message });
  }
});

// ─── Backward compat: DELETE /:sessionId (old format) ───────
router.delete('/:sessionId', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    // Numeric ID → user_sessions.id
    const numId = parseInt(sessionId, 10);
    if (!isNaN(numId)) {
      const [result] = await pool().query('UPDATE user_sessions SET terminated_at = NOW(), is_active = 0 WHERE id = ?', [numId]);
      if (result.affectedRows > 0) {
        return res.json({ success: true, message: 'Session terminated' });
      }
    }
    // Old jwt_ format → refresh_tokens
    let tokenId = sessionId;
    if (sessionId.startsWith('jwt_')) tokenId = sessionId.replace('jwt_', '');
    const [result] = await pool().query('DELETE FROM refresh_tokens WHERE id = ?', [tokenId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    console.error('[Sessions] Delete error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete session', error: error.message });
  }
});

module.exports = router;
