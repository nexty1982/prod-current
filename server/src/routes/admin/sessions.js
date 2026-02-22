const express = require('express');
const router = express.Router();
const { requireRole } = require('../../middleware/auth');
// Support both development and production paths
let DatabaseService;
try {
    DatabaseService = require('../../services/databaseService');
} catch (e) {
    DatabaseService = require('../../services/databaseService');
}

/**
 * Session Management API Routes
 * Accessible only to super_admin and admin roles
 */

// GET /api/admin/sessions - Get all sessions with user information
// Returns both express-session sessions and JWT refresh token sessions
router.get('/', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { search, status, limit = 100, offset = 0 } = req.query;
    
    const db = DatabaseService.getDatabase();
    if (!db || typeof db.query !== 'function') {
      throw new Error('Database connection not initialized correctly (no db.query)');
    }
    
    // Get JWT refresh token sessions (primary source since app uses JWT)
    let jwtQuery = `
      SELECT 
        CONCAT('jwt_', rt.id) as session_id,
        rt.expires_at as expires,
        rt.expires_at as expires_readable,
        CASE WHEN rt.expires_at > NOW() THEN 1 ELSE 0 END as is_active,
        TIMESTAMPDIFF(MINUTE, NOW(), rt.expires_at) as minutes_until_expiry,
        rt.ip_address,
        rt.user_agent,
        rt.created_at as login_time,
        rt.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.display_name,
        COALESCE(c.church_name, '') as church_name
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      LEFT JOIN churches c ON u.church_id = c.id
      WHERE 1=1
    `;
    
    const jwtParams = [];
    
    // Apply status filter
    if (status === 'active') {
      jwtQuery += ` AND rt.expires_at > NOW()`;
    } else if (status === 'expired') {
      jwtQuery += ` AND rt.expires_at <= NOW()`;
    }
    
    // Apply search filter
    if (search) {
      jwtQuery += ` AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.display_name LIKE ?)`;
      const searchTerm = `%${search}%`;
      jwtParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Add ordering and limits
    jwtQuery += ` ORDER BY rt.expires_at DESC LIMIT ? OFFSET ?`;
    jwtParams.push(parseInt(limit), parseInt(offset));
    
    const [jwtSessions] = await db.query(jwtQuery, jwtParams);
    
    // Transform JWT sessions to match expected format
    const enrichedSessions = jwtSessions.map(session => {
      return {
        session_id: session.session_id,
        expires: session.expires_readable,
        is_active: session.is_active === 1 || session.is_active === true,
        minutes_until_expiry: session.minutes_until_expiry || 0,
        ip_address: session.ip_address || 'N/A',
        user_agent: session.user_agent || 'Unknown',
        login_time: session.login_time || null,
        user: {
          id: session.user_id,
          email: session.email,
          first_name: session.first_name,
          last_name: session.last_name,
          role: session.role,
          display_name: session.display_name,
          church_name: session.church_name
        }
      };
    });
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE 1=1
    `;
    const countParams = [];
    
    if (status === 'active') {
      countQuery += ` AND rt.expires_at > NOW()`;
    } else if (status === 'expired') {
      countQuery += ` AND rt.expires_at <= NOW()`;
    }
    
    if (search) {
      countQuery += ` AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.display_name LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;
    
    res.json({
      success: true,
      sessions: enrichedSessions,
      total: total
    });
    
  } catch (error) {
    console.error('Error fetching sessions:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/admin/sessions/stats - Get session statistics
router.get('/stats', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const db = DatabaseService.getDatabase();
    if (!db || typeof db.query !== 'function') {
      throw new Error('Database connection not initialized correctly (no db.query)');
    }
    
    // Get session statistics from refresh_tokens table (JWT sessions)
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN expires_at > NOW() THEN 1 ELSE 0 END) as active_sessions,
        SUM(CASE WHEN expires_at <= NOW() THEN 1 ELSE 0 END) as expired_sessions,
        MIN(expires_at) as oldest_session,
        MAX(expires_at) as newest_session
      FROM refresh_tokens
    `);
    
    // Calculate unique users and IPs from active sessions
    const [activeSessions] = await db.query(`
      SELECT DISTINCT user_id, ip_address
      FROM refresh_tokens
      WHERE expires_at > NOW()
    `);
    
    const uniqueUsers = new Set();
    const uniqueIPs = new Set();
    
    activeSessions.forEach(session => {
      if (session.user_id) {
        uniqueUsers.add(session.user_id);
      }
      if (session.ip_address) {
        uniqueIPs.add(session.ip_address);
      }
    });
    
    const statsResult = stats[0];
    statsResult.unique_users = uniqueUsers.size;
    statsResult.unique_ips = uniqueIPs.size;
    statsResult.latest_login = statsResult.newest_session;
    statsResult.earliest_login = statsResult.oldest_session;
    statsResult.avg_session_size = 0; // Not applicable for JWT tokens
    
    res.json({
      success: true,
      stats: statsResult
    });
    
  } catch (error) {
    console.error('Error fetching session stats:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session statistics',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/admin/sessions/user/:userId/terminate-all - Terminate all sessions for a user
router.post('/user/:userId/terminate-all', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const db = DatabaseService.getDatabase();
    if (!db || typeof db.query !== 'function') {
      throw new Error('Database connection not initialized correctly (no db.query)');
    }
    
    const [result] = await db.query(
      'DELETE FROM refresh_tokens WHERE user_id = ?',
      [userId]
    );
    
    // Log terminate_session activity (non-blocking)
    const { getAppPool } = require('../../config/db-compat');
    getAppPool().query(
      `INSERT INTO activity_log (user_id, action, details, ip_address, user_agent, created_at)
       VALUES (?, 'terminate_session', ?, ?, ?, NOW())`,
      [
        req.user?.id || 0,
        JSON.stringify({ target_user_id: userId, sessions_terminated: result.affectedRows, performed_by: req.user?.email }),
        req.ip || 'unknown',
        (req.get('User-Agent') || 'unknown').substring(0, 255)
      ]
    ).catch(err => console.error('Failed to log terminate_session activity:', err.message));

    res.json({
      success: true,
      message: `Terminated ${result.affectedRows} session(s) for user ${userId}`
    });

  } catch (error) {
    console.error('Error terminating user sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to terminate user sessions',
      error: error.message
    });
  }
});

// POST /api/admin/sessions/terminate-all - Terminate all sessions
router.post('/terminate-all', requireRole(['super_admin']), async (req, res) => {
  try {
    const db = DatabaseService.getDatabase();
    if (!db || typeof db.query !== 'function') {
      throw new Error('Database connection not initialized correctly (no db.query)');
    }
    
    const [result] = await db.query('DELETE FROM refresh_tokens');
    
    res.json({
      success: true,
      message: `Terminated ${result.affectedRows} session(s)`
    });
    
  } catch (error) {
    console.error('Error terminating all sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to terminate all sessions',
      error: error.message
    });
  }
});

// POST /api/admin/sessions/cleanup - Cleanup sessions older than specified days
router.post('/cleanup', requireRole(['super_admin']), async (req, res) => {
  try {
    const { days_old = 7 } = req.body;
    const db = DatabaseService.getDatabase();
    if (!db || typeof db.query !== 'function') {
      throw new Error('Database connection not initialized correctly (no db.query)');
    }
    
    const [result] = await db.query(
      'DELETE FROM refresh_tokens WHERE expires_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days_old]
    );
    
    res.json({
      success: true,
      message: `Deleted ${result.affectedRows} session(s) older than ${days_old} days`
    });
    
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup sessions',
      error: error.message
    });
  }
});

// DELETE /api/admin/sessions/cleanup/expired - Delete all expired sessions
router.delete('/cleanup/expired', requireRole(['super_admin']), async (req, res) => {
  try {
    const db = DatabaseService.getDatabase();
    if (!db || typeof db.query !== 'function') {
      throw new Error('Database connection not initialized correctly (no db.query)');
    }
    const [result] = await db.query(
      'DELETE FROM refresh_tokens WHERE expires_at <= NOW()'
    );
    
    res.json({
      success: true,
      message: `Deleted ${result.affectedRows} expired sessions`
    });
    
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup expired sessions',
      error: error.message
    });
  }
});

// DELETE /api/admin/sessions/:sessionId - Delete a specific session
router.delete('/:sessionId', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const db = DatabaseService.getDatabase();
    if (!db || typeof db.query !== 'function') {
      throw new Error('Database connection not initialized correctly (no db.query)');
    }
    
    // Extract ID from session_id format (jwt_{id} or just the id)
    let tokenId = sessionId;
    if (sessionId.startsWith('jwt_')) {
      tokenId = sessionId.replace('jwt_', '');
    }
    
    const [result] = await db.query(
      'DELETE FROM refresh_tokens WHERE id = ?',
      [tokenId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete session',
      error: error.message
    });
  }
});

module.exports = router;
