const express = require('express');
const router = express.Router();
const { getAppPool } = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth');

const adminOnly = [requireAuth, requireRole(['super_admin', 'admin'])];

// GET /api/admin/log-search — Paginated search with SQL-level filtering
router.get('/', ...adminOnly, async (req, res) => {
  try {
    const {
      q = '',
      level = '',
      source = '',
      service = '',
      source_component = '',
      user_email = '',
      from = '',
      to = '',
      page = 1,
      limit = 50
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (q) {
      conditions.push('message LIKE ?');
      params.push(`%${q}%`);
    }
    if (level) {
      const levels = level.split(',').map(l => l.trim().toUpperCase()).filter(Boolean);
      if (levels.length === 1) {
        conditions.push('level = ?');
        params.push(levels[0]);
      } else if (levels.length > 1) {
        conditions.push(`level IN (${levels.map(() => '?').join(',')})`);
        params.push(...levels);
      }
    }
    if (source) {
      conditions.push('source LIKE ?');
      params.push(`%${source}%`);
    }
    if (service) {
      conditions.push('(service LIKE ? OR source_component LIKE ?)');
      params.push(`%${service}%`, `%${service}%`);
    }
    if (source_component) {
      conditions.push('source_component LIKE ?');
      params.push(`%${source_component}%`);
    }
    if (user_email) {
      conditions.push('user_email LIKE ?');
      params.push(`%${user_email}%`);
    }
    if (from) {
      conditions.push('timestamp >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('timestamp <= ?');
      params.push(to);
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const pool = getAppPool();

    // Get total count
    const countParams = [...params];
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM system_logs ${whereClause}`,
      countParams
    );
    const total = countResult[0].total;

    // Get rows
    const [rows] = await pool.query(
      `SELECT id, hash, timestamp, level, source, message, meta, user_email,
        service, source_component, session_id, request_id, ip_address,
        user_agent, first_seen, occurrences
       FROM system_logs ${whereClause}
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    // Parse meta JSON
    const parsed = rows.map(row => ({
      ...row,
      meta: row.meta ? (typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta) : {}
    }));

    res.json({
      rows: parsed,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Log search error:', err);
    res.status(500).json({ error: 'Failed to search logs' });
  }
});

// GET /api/admin/log-search/stats — Dashboard aggregates
router.get('/stats', ...adminOnly, async (req, res) => {
  try {
    const pool = getAppPool();

    const [totalResult] = await pool.query('SELECT COUNT(*) as total FROM system_logs');

    const [levelCounts] = await pool.query(
      `SELECT level, COUNT(*) as count FROM system_logs GROUP BY level`
    );

    const [topSources] = await pool.query(
      `SELECT source, COUNT(*) as count FROM system_logs
       GROUP BY source ORDER BY count DESC LIMIT 10`
    );

    // Errors in last 24h
    const [errors24h] = await pool.query(
      `SELECT COUNT(*) as count FROM system_logs
       WHERE level = 'ERROR' AND timestamp >= NOW() - INTERVAL 24 HOUR`
    );

    // Warnings in last 24h
    const [warnings24h] = await pool.query(
      `SELECT COUNT(*) as count FROM system_logs
       WHERE level = 'WARN' AND timestamp >= NOW() - INTERVAL 24 HOUR`
    );

    // Error rate: last hour vs previous hour
    const [lastHourErrors] = await pool.query(
      `SELECT COUNT(*) as count FROM system_logs
       WHERE level = 'ERROR' AND timestamp >= NOW() - INTERVAL 1 HOUR`
    );
    const [prevHourErrors] = await pool.query(
      `SELECT COUNT(*) as count FROM system_logs
       WHERE level = 'ERROR'
         AND timestamp >= NOW() - INTERVAL 2 HOUR
         AND timestamp < NOW() - INTERVAL 1 HOUR`
    );

    const levelMap = {};
    for (const row of levelCounts) {
      levelMap[row.level] = row.count;
    }

    res.json({
      total: totalResult[0].total,
      levels: levelMap,
      errors24h: errors24h[0].count,
      warnings24h: warnings24h[0].count,
      topSources: topSources,
      errorRate: {
        lastHour: lastHourErrors[0].count,
        prevHour: prevHourErrors[0].count
      }
    });
  } catch (err) {
    console.error('Log stats error:', err);
    res.status(500).json({ error: 'Failed to get log stats' });
  }
});

// GET /api/admin/log-search/context/:id — Surrounding logs for context
router.get('/context/:id', ...adminOnly, async (req, res) => {
  try {
    const pool = getAppPool();
    const logId = parseInt(req.params.id, 10);

    if (isNaN(logId)) {
      return res.status(400).json({ error: 'Invalid log ID' });
    }

    // Get the target log entry
    const [target] = await pool.query(
      `SELECT id, timestamp, session_id, request_id FROM system_logs WHERE id = ?`,
      [logId]
    );

    if (target.length === 0) {
      return res.status(404).json({ error: 'Log entry not found' });
    }

    const entry = target[0];
    let contextRows;

    // Try to find context by session_id or request_id first
    if (entry.session_id) {
      const [rows] = await pool.query(
        `SELECT id, hash, timestamp, level, source, message, meta, user_email,
          service, source_component, session_id, request_id, ip_address,
          user_agent, first_seen, occurrences
         FROM system_logs
         WHERE session_id = ?
         ORDER BY timestamp ASC
         LIMIT 50`,
        [entry.session_id]
      );
      if (rows.length > 2) {
        contextRows = rows;
      }
    }

    if (!contextRows && entry.request_id) {
      const [rows] = await pool.query(
        `SELECT id, hash, timestamp, level, source, message, meta, user_email,
          service, source_component, session_id, request_id, ip_address,
          user_agent, first_seen, occurrences
         FROM system_logs
         WHERE request_id = ?
         ORDER BY timestamp ASC
         LIMIT 50`,
        [entry.request_id]
      );
      if (rows.length > 2) {
        contextRows = rows;
      }
    }

    // Fallback: ±10 entries by timestamp
    if (!contextRows) {
      const [rows] = await pool.query(
        `(SELECT id, hash, timestamp, level, source, message, meta, user_email,
            service, source_component, session_id, request_id, ip_address,
            user_agent, first_seen, occurrences
          FROM system_logs
          WHERE timestamp <= ? AND id <= ?
          ORDER BY timestamp DESC, id DESC
          LIMIT 10)
         UNION ALL
         (SELECT id, hash, timestamp, level, source, message, meta, user_email,
            service, source_component, session_id, request_id, ip_address,
            user_agent, first_seen, occurrences
          FROM system_logs
          WHERE timestamp >= ? AND id > ?
          ORDER BY timestamp ASC, id ASC
          LIMIT 10)
         ORDER BY timestamp ASC, id ASC`,
        [entry.timestamp, logId, entry.timestamp, logId]
      );
      contextRows = rows;
    }

    const parsed = contextRows.map(row => ({
      ...row,
      meta: row.meta ? (typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta) : {},
      isFocused: row.id === logId
    }));

    res.json({ targetId: logId, rows: parsed });
  } catch (err) {
    console.error('Log context error:', err);
    res.status(500).json({ error: 'Failed to get log context' });
  }
});

module.exports = router;
