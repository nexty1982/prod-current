const express = require('express');
const router = express.Router();
const { requireRole } = require('../../middleware/auth');
const DatabaseService = require('../../src/services/databaseService');

/**
 * Session Management API Routes
 * Accessible only to super_admin and admin roles
 */

// GET /api/admin/sessions - Get all sessions with user information
router.get('/', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { search, status, limit = 100, offset = 0 } = req.query;
    
    // Build the query using the correct sessions table
    let query = `
      SELECT 
        s.session_id,
        s.expires,
        s.data,
        FROM_UNIXTIME(s.expires) as expires_readable,
        CASE WHEN FROM_UNIXTIME(s.expires) > NOW() THEN 1 ELSE 0 END as is_active,
        TIMESTAMPDIFF(MINUTE, NOW(), FROM_UNIXTIME(s.expires)) as minutes_until_expiry,
        CHAR_LENGTH(s.data) as data_size
      FROM sessions s
      WHERE 1=1
    `;
    
    const params = [];
    
    // Apply status filter
    if (status === 'active') {
      query += ` AND FROM_UNIXTIME(s.expires) > NOW()`;
    } else if (status === 'expired') {
      query += ` AND FROM_UNIXTIME(s.expires) <= NOW()`;
    }
    
    // Apply search filter on session data if provided
    if (search) {
      query += ` AND s.data LIKE ?`;
      params.push(`%${search}%`);
    }
    
    // Add ordering and limits
    query += ` ORDER BY s.expires DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    console.log('Session query:', query);
    console.log('Session params:', params);
    
    const db = await DatabaseService.getDatabase();
    const [sessions] = await db.query(query, params);
    
    // Parse session data to extract user information
    const enrichedSessions = sessions.map(session => {
      let userData = null;
      try {
        const sessionData = JSON.parse(session.data);
        userData = sessionData.user || null;
      } catch (err) {
        console.log('Failed to parse session data:', err.message);
      }
      
      return {
        session_id: session.session_id,
        expires: session.expires_readable,
        is_active: session.is_active,
        minutes_until_expiry: session.minutes_until_expiry,
        data_size: session.data_size,
        user: userData
      };
    });
    
    res.json({
      success: true,
      sessions: enrichedSessions,
      total: enrichedSessions.length
    });
    
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions',
      error: error.message
    });
  }
});

// GET /api/admin/sessions/stats - Get session statistics
router.get('/stats', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const db = await DatabaseService.getDatabase();
    
    // Get session statistics from the correct sessions table
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN FROM_UNIXTIME(expires) > NOW() THEN 1 ELSE 0 END) as active_sessions,
        SUM(CASE WHEN FROM_UNIXTIME(expires) <= NOW() THEN 1 ELSE 0 END) as expired_sessions,
        AVG(CHAR_LENGTH(data)) as avg_session_size,
        MIN(FROM_UNIXTIME(expires)) as oldest_session,
        MAX(FROM_UNIXTIME(expires)) as newest_session
      FROM sessions
    `);
    
    res.json({
      success: true,
      stats: stats[0]
    });
    
  } catch (error) {
    console.error('Error fetching session stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session statistics',
      error: error.message
    });
  }
});

// DELETE /api/admin/sessions/:sessionId - Delete a specific session
router.delete('/:sessionId', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const db = await DatabaseService.getDatabase();
    const [result] = await db.query(
      'DELETE FROM sessions WHERE session_id = ?',
      [sessionId]
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

// DELETE /api/admin/sessions/cleanup/expired - Delete all expired sessions
router.delete('/cleanup/expired', requireRole(['super_admin']), async (req, res) => {
  try {
    const db = await DatabaseService.getDatabase();
    const [result] = await db.query(
      'DELETE FROM sessions WHERE FROM_UNIXTIME(expires) <= NOW()'
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

module.exports = router;
