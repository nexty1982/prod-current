// OMAI Logger API - Connects to omai_error_tracking_db
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { requireAuth } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');

// Create a separate connection pool for the error tracking database
const errorTrackingPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: 'omai_error_tracking_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// GET /api/omai-logger/logs - Get logs with filtering
router.get('/logs', requireAuth, async (req, res) => {
  try {
    const { 
      level, 
      source, 
      limit = 100, 
      offset = 0, 
      startDate, 
      endDate,
      search,
      category
    } = req.query;

    let query = `
      SELECT 
        e.id,
        e.last_seen as timestamp,
        e.log_level as level,
        e.source,
        e.source_component as category,
        e.message,
        e.type,
        e.severity,
        e.status,
        e.occurrences,
        e.first_seen,
        e.last_seen,
        ee.session_id,
        ee.user_agent,
        ee.additional_context as metadata
      FROM errors e
      LEFT JOIN error_events ee ON e.id = ee.error_id
      WHERE 1=1
    `;
    
    const params = [];

    // Add filters
    if (level && level !== 'all') {
      query += ' AND e.log_level = ?';
      params.push(level);
    }

    if (source) {
      query += ' AND e.source = ?';
      params.push(source);
    }

    if (category) {
      query += ' AND e.source_component = ?';
      params.push(category);
    }

    if (startDate) {
      query += ' AND e.last_seen >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND e.last_seen <= ?';
      params.push(endDate);
    }

    if (search) {
      query += ' AND (e.message LIKE ? OR ee.additional_context LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Add grouping and ordering
    query += ' GROUP BY e.id ORDER BY e.last_seen DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await getAppPool().query(query, params);

    // Parse JSON metadata
    const parsedLogs = logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    }));

    res.json(ApiResponse.success(parsedLogs, 'Logs retrieved successfully'));
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json(
      ApiResponse.error('Failed to fetch logs', 'DATABASE_ERROR', 500, error)
    );
  }
});

// GET /api/omai-logger/critical-events - Get critical events
router.get('/critical-events', requireAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const [events] = await getAppPool().query(`
      SELECT 
        e.id,
        e.last_seen as timestamp,
        e.log_level as level,
        e.source,
        e.source_component as category,
        e.message,
        e.severity,
        e.status,
        e.occurrences,
        ee.additional_context as metadata,
        ee.user_agent
      FROM errors e
      LEFT JOIN error_events ee ON e.id = ee.error_id
      WHERE e.severity IN ('critical', 'high')
        AND e.last_seen >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY e.id
      ORDER BY e.last_seen DESC
      LIMIT ?
    `, [parseInt(limit)]);

    const parsedEvents = events.map(event => ({
      ...event,
      metadata: event.metadata ? JSON.parse(event.metadata) : null
    }));

    res.json(ApiResponse.success(parsedEvents, 'Critical events retrieved'));
  } catch (error) {
    console.error('Error fetching critical events:', error);
    res.status(500).json(
      ApiResponse.error('Failed to fetch critical events', 'DATABASE_ERROR', 500, error)
    );
  }
});

// GET /api/omai-logger/system-messages - Get system messages
router.get('/system-messages', requireAuth, async (req, res) => {
  try {
    const { limit = 25 } = req.query;

    const [messages] = await getAppPool().query(`
      SELECT 
        e.id,
        e.last_seen as timestamp,
        e.log_level as level,
        e.source,
        e.source_component as category,
        e.message,
        e.type,
        ee.additional_context as metadata
      FROM errors e
      LEFT JOIN error_events ee ON e.id = ee.error_id
      WHERE e.type = 'backend' AND e.source_component LIKE '%system%'
        AND e.last_seen >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY e.id
      ORDER BY e.last_seen DESC
      LIMIT ?
    `, [parseInt(limit)]);

    const parsedMessages = messages.map(msg => ({
      ...msg,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : null
    }));

    res.json(ApiResponse.success(parsedMessages, 'System messages retrieved'));
  } catch (error) {
    console.error('Error fetching system messages:', error);
    res.status(500).json(
      ApiResponse.error('Failed to fetch system messages', 'DATABASE_ERROR', 500, error)
    );
  }
});

// GET /api/omai-logger/historical - Get historical logs
router.get('/historical', requireAuth, async (req, res) => {
  try {
    const { 
      date = new Date().toISOString().split('T')[0],
      limit = 100 
    } = req.query;

    const [logs] = await getAppPool().query(`
      SELECT 
        e.id,
        e.last_seen as timestamp,
        e.log_level as level,
        e.source,
        e.source_component as category,
        e.message,
        e.severity,
        e.occurrences,
        ee.session_id,
        ee.additional_context as metadata
      FROM errors e
      LEFT JOIN error_events ee ON e.id = ee.error_id
      WHERE DATE(e.last_seen) = ?
      GROUP BY e.id
      ORDER BY e.last_seen DESC
      LIMIT ?
    `, [date, parseInt(limit)]);

    const parsedLogs = logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    }));

    // Get count by level for the date
    const [stats] = await getAppPool().query(`
      SELECT 
        log_level as level,
        COUNT(*) as count
      FROM errors
      WHERE DATE(last_seen) = ?
      GROUP BY log_level
    `, [date]);

    res.json(ApiResponse.success({
      logs: parsedLogs,
      stats: stats,
      date: date
    }, 'Historical logs retrieved'));
  } catch (error) {
    console.error('Error fetching historical logs:', error);
    res.status(500).json(
      ApiResponse.error('Failed to fetch historical logs', 'DATABASE_ERROR', 500, error)
    );
  }
});

// GET /api/omai-logger/stats - Get log statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // Get total logs count
    const [totalResult] = await getAppPool().query(
      'SELECT COUNT(*) as total FROM errors'
    );

    // Get logs by level in last 24 hours
    const [levelStats] = await getAppPool().query(`
      SELECT 
        log_level as level,
        COUNT(*) as count
      FROM errors
      WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY log_level
    `);

    // Get recent error count
    const [errorCount] = await getAppPool().query(`
      SELECT COUNT(*) as count
      FROM errors
      WHERE severity IN ('critical', 'high')
        AND last_seen >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `);

    // Get active filters count
    const [activeFilters] = await getAppPool().query(`
      SELECT 
        COUNT(DISTINCT source) as sources,
        COUNT(DISTINCT source_component) as categories
      FROM errors
      WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);

    res.json(ApiResponse.success({
      totalLogs: totalResult[0].total,
      recentErrors: errorCount[0].count,
      levelDistribution: levelStats,
      activeFilters: activeFilters[0].sources || 0
    }, 'Statistics retrieved'));
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json(
      ApiResponse.error('Failed to fetch statistics', 'DATABASE_ERROR', 500, error)
    );
  }
});

// POST /api/omai-logger/log - Create a new log entry
router.post('/log', async (req, res) => {
  try {
    const {
      level = 'INFO',
      source = 'frontend',
      category = 'general',
      message,
      metadata = {},
      stack_trace = null
    } = req.body;

    if (!message) {
      return res.status(400).json(
        ApiResponse.error('Message is required', 'VALIDATION_ERROR', 400)
      );
    }

    // Create a hash for the error to check for duplicates
    const crypto = require('crypto');
    const errorHash = crypto.createHash('md5').update(`${source}:${message}`).digest('hex');
    
    // Check if error already exists
    const [existing] = await getAppPool().query(
      'SELECT id, occurrences FROM errors WHERE hash = ?',
      [errorHash]
    );
    
    let errorId;
    if (existing.length > 0) {
      // Update existing error
      await getAppPool().query(
        'UPDATE errors SET last_seen = NOW(), occurrences = occurrences + 1 WHERE id = ?',
        [existing[0].id]
      );
      errorId = existing[0].id;
    } else {
      // Insert new error
      const [result] = await getAppPool().query(`
        INSERT INTO errors (
          hash,
          type,
          source,
          message,
          first_seen,
          last_seen,
          occurrences,
          status,
          severity,
          log_level,
          source_component
        ) VALUES (?, ?, ?, ?, NOW(), NOW(), 1, 'pending', 'medium', ?, ?)
      `, [
        errorHash,
        'frontend',
        source,
        message,
        level,
        category
      ]);
      errorId = result.insertId;
    }
    
    // Add error event
    await getAppPool().query(`
      INSERT INTO error_events (
        error_id,
        occurred_at,
        user_agent,
        session_id,
        additional_context
      ) VALUES (?, NOW(), ?, ?, ?)
    `, [
      errorId,
      req.headers['user-agent'],
      req.sessionID || null,
      JSON.stringify({
        ...metadata,
        user_id: req.user?.id || null,
        ip_address: req.ip,
        url: req.headers.referer || null,
        method: req.method,
        stack_trace
      })
    ]);

    res.status(201).json(
      ApiResponse.success({ id: errorId }, 'Log created successfully')
    );
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).json(
      ApiResponse.error('Failed to create log', 'DATABASE_ERROR', 500, error)
    );
  }
});

// WebSocket support for real-time logs
let clients = [];

router.ws = (ws) => {
  clients.push(ws);
  
  ws.on('close', () => {
    clients = clients.filter(client => client !== ws);
  });
};

// Function to broadcast new logs to all connected clients
const broadcastLog = (log) => {
  clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(log));
    }
  });
};

// Export both router and broadcast function
module.exports = { router, broadcastLog };
