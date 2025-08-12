const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Get all activity logs with filtering and pagination
router.get('/', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const {
      search = '',
      action_filter = '',
      user_filter = '',
      date_from = '',
      date_to = '',
      limit = 50,
      offset = 0,
    } = req.query;

    let whereConditions = [];
    let queryParams = [];

    // Build WHERE conditions
    if (search) {
      whereConditions.push('(u.email LIKE ? OR al.action LIKE ? OR al.changes LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (action_filter) {
      whereConditions.push('al.action = ?');
      queryParams.push(action_filter);
    }

    if (user_filter) {
      whereConditions.push('al.user_id = ?');
      queryParams.push(parseInt(user_filter));
    }

    if (date_from) {
      whereConditions.push('al.created_at >= ?');
      queryParams.push(date_from);
    }

    if (date_to) {
      whereConditions.push('al.created_at <= ?');
      queryParams.push(date_to + ' 23:59:59');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM activity_log al
      LEFT JOIN orthodoxmetrics_auth_db.users u ON al.user_id = u.id
      ${whereClause}
    `;

    const [countResult] = await promisePool.query(countQuery, queryParams);
    const total = countResult[0].total;

    // Get activity logs with user details
    const query = `
      SELECT 
        al.id,
        al.user_id,
        al.action,
        al.changes,
        al.ip_address,
        al.user_agent,
        al.created_at,
        u.email as user_email,
        u.first_name,
        u.last_name,
        u.role as user_role
      FROM activity_log al
      LEFT JOIN orthodoxmetrics_auth_db.users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), parseInt(offset));
    const [activities] = await promisePool.query(query, queryParams);

    // Get activity stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_activities,
        COUNT(DISTINCT al.user_id) as unique_users,
        COUNT(DISTINCT DATE(al.created_at)) as active_days,
        COUNT(DISTINCT al.action) as unique_actions
      FROM activity_log al
      WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;

    const [statsResult] = await promisePool.query(statsQuery);
    const stats = statsResult[0];

    // Get top actions
    const topActionsQuery = `
      SELECT 
        al.action,
        COUNT(*) as count
      FROM activity_log al
      WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY al.action
      ORDER BY count DESC
      LIMIT 10
    `;

    const [topActions] = await promisePool.query(topActionsQuery);

    res.json({
      activities: activities.map(activity => ({
        ...activity,
        changes: activity.changes ? JSON.parse(activity.changes) : null,
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit)),
      },
      stats,
      topActions,
    });

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch activity logs',
      details: error.message 
    });
  }
});

// Get activity log details by ID
router.get('/:id', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        al.id,
        al.user_id,
        al.action,
        al.changes,
        al.ip_address,
        al.user_agent,
        al.created_at,
        u.email as user_email,
        u.first_name,
        u.last_name,
        u.role as user_role
      FROM activity_log al
      LEFT JOIN orthodoxmetrics_auth_db.users u ON al.user_id = u.id
      WHERE al.id = ?
    `;

    const [result] = await promisePool.query(query, [id]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Activity log not found' });
    }

    const activity = result[0];
    activity.changes = activity.changes ? JSON.parse(activity.changes) : null;

    res.json(activity);

  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ 
      error: 'Failed to fetch activity log',
      details: error.message 
    });
  }
});

// Clear old activity logs (admin only)
router.delete('/cleanup', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const { days_old = 90 } = req.body;

    const query = `
      DELETE FROM activity_log 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;

    const [result] = await promisePool.query(query, [parseInt(days_old)]);

    // Log this cleanup action
    await promisePool.query(
      'INSERT INTO activity_log (user_id, action, changes, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [
        req.session.user.id,
        'cleanup_activity_logs',
        JSON.stringify({
          days_old: parseInt(days_old),
          records_deleted: result.affectedRows,
          performed_by: req.session.user.email,
        }),
        req.ip,
        req.get('User-Agent'),
      ]
    );

    res.json({
      success: true,
      message: `Cleaned up ${result.affectedRows} old activity log records`,
      records_deleted: result.affectedRows,
    });

  } catch (error) {
    console.error('Error cleaning up activity logs:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup activity logs',
      details: error.message 
    });
  }
});

module.exports = router;
