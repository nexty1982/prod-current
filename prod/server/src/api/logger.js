const express = require('express');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();
const mysql = require('mysql2/promise');
const { body, validationResult } = require('express-validator');


// Create dedicated connection for error tracking database
const errorTrackingDb = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: 'omai_error_tracking_db',
  connectTimeout: 60000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

/**
 * POST /api/logger
 * Create a new log entry with SUCCESS/DEBUG support
 */
router.post('/', [
  // Validation middleware
  body('log_level').isIn(['INFO', 'WARN', 'ERROR', 'DEBUG', 'SUCCESS']).withMessage('Invalid log level'),
  body('source').optional().isLength({ max: 64 }).withMessage('Source too long'),
  body('origin').optional().isLength({ max: 64 }).withMessage('Origin too long'),
  body('message').isLength({ min: 1, max: 1000 }).withMessage('Message required and must be under 1000 chars'),
  body('details').optional().isLength({ max: 5000 }).withMessage('Details too long'),
  body('source_component').optional().isLength({ max: 128 }).withMessage('Source component too long'),
  body('session_id').optional().isLength({ max: 128 }).withMessage('Session ID too long'),
  body('user_agent').optional().isLength({ max: 500 }).withMessage('User agent too long')
], async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      log_level = 'INFO',
      source = 'unknown',
      origin = 'server',
      message,
      details = '',
      source_component = '',
      session_id = '',
      user_agent = ''
    } = req.body;

    // Sanitize message and details
    const sanitizedMessage = message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
    const sanitizedDetails = details.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();

    // Create hash for deduplication
    const hashContent = `${log_level}:${source}:${sanitizedMessage}:${source_component}`;
    const hash = crypto.createHash('md5').update(hashContent).digest('hex');

    // Check if this error/log already exists
    const [existingRows] = await errorTrackingDb.query(
      'SELECT id, occurrences FROM errors WHERE hash = ?',
      [hash]
    );

    if (existingRows.length > 0) {
      // Update existing entry
      const existingId = existingRows[0].id;
      const newOccurrences = existingRows[0].occurrences + 1;

      await errorTrackingDb.query(`
        UPDATE errors 
        SET last_seen = NOW(), 
            occurrences = ?
        WHERE id = ?
      `, [newOccurrences, existingId]);

      // Create event record
      const contextJson = JSON.stringify({
        details: sanitizedDetails,
        timestamp: new Date().toISOString(),
        requestType: 'logger_api'
      });
      await errorTrackingDb.query(`
        INSERT INTO error_events (
          error_id,
          occurred_at,
          user_agent,
          session_id,
          additional_context
        ) VALUES (?, NOW(), ?, ?, ?)
      `, [existingId, user_agent, session_id, contextJson]);

      res.json({
        success: true,
        message: 'Log entry updated',
        id: existingId,
        occurrences: newOccurrences
      });
    } else {
      // Create new entry
      // Map origin to valid type enum values
      const typeMapping = {
        'frontend': 'frontend',
        'backend': 'backend',
        'server': 'backend',
        'browser': 'frontend',
        'api': 'api',
        'nginx': 'nginx',
        'db': 'db'
      };
      const validType = typeMapping[origin] || 'backend';

      const [result] = await errorTrackingDb.query(`
        INSERT INTO errors (
          hash, 
          type,
          source, 
          message, 
          log_level, 
          origin, 
          source_component,
          first_seen, 
          last_seen, 
          occurrences
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        hash,
        validType,
        source,
        sanitizedMessage,
        log_level,
        origin,
        JSON.stringify(source_component),
        new Date(),
        new Date(),
        1
      ]);

      // Create event record
      const contextJson = JSON.stringify({
        details: sanitizedDetails,
        timestamp: new Date().toISOString(),
        requestType: 'logger_api'
      });
      await errorTrackingDb.query(`
        INSERT INTO error_events (
          error_id,
          occurred_at,
          user_agent,
          session_id,
          additional_context
        ) VALUES (?, NOW(), ?, ?, ?)
      `, [result.insertId, user_agent, session_id, contextJson]);

      res.json({
        success: true,
        message: 'Log entry created',
        id: result.insertId,
        occurrences: 1
      });
    }

  } catch (error) {
    console.error('Logger API Error:', error);
    console.error('Logger API Stack:', error.stack);
    console.error('Logger API Request Body:', JSON.stringify(req.body, null, 2));

    // Log this error to the database as well
    try {
      const errorHash = crypto.createHash('md5').update(`Logger API Error: ${error.message}`).digest('hex');
      await errorTrackingDb.query(`
        INSERT INTO errors (
          hash, type, source, message, log_level, origin, source_component, first_seen, last_seen, occurrences
        ) VALUES (?, 'backend', 'backend', ?, 'ERROR', 'server', 'LoggerAPI', NOW(), NOW(), 1)
        ON DUPLICATE KEY UPDATE 
        last_seen = NOW(), 
        occurrences = occurrences + 1
      `, [errorHash, `Logger API Error: ${error.message}`]);
    } catch (dbError) {
      console.error('Failed to log Logger API error to database:', dbError);
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/logger/client
 * Handle frontend console logs (console.log, console.debug, etc.)
 */
router.post('/client', [
  body('type').optional().isIn(['frontend', 'browser', 'devtools']).withMessage('Invalid type'),
  body('level').isIn(['info', 'debug', 'warn', 'error', 'log']).withMessage('Invalid level'),
  body('message').isLength({ min: 1, max: 2000 }).withMessage('Message required and must be under 2000 chars'),
  body('source').optional().isLength({ max: 128 }).withMessage('Source too long'),
  body('url').optional().isLength({ max: 512 }).withMessage('URL too long'),
  body('line').optional().isInt().withMessage('Line must be integer'),
  body('column').optional().isInt().withMessage('Column must be integer'),
  body('stack').optional().isLength({ max: 5000 }).withMessage('Stack trace too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      type = 'frontend',
      level,
      message,
      source = 'console',
      url = '',
      line = null,
      column = null,
      stack = ''
    } = req.body;

    // Map frontend console levels to database levels
    const levelMap = {
      'log': 'INFO',
      'info': 'INFO',
      'debug': 'DEBUG',
      'warn': 'WARN',
      'error': 'ERROR'
    };

    const dbLevel = levelMap[level] || 'INFO';

    // Sanitize message
    const sanitizedMessage = message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();

    // Create hash for deduplication (client-side logs)
    const hashInput = `${dbLevel}:${type}:${sanitizedMessage}`;
    const hash = crypto.createHash('md5').update(hashInput).digest('hex');

    // Check if this log entry already exists (for deduplication)
    const [existingRows] = await errorTrackingDb.query(
      'SELECT id, occurrences FROM errors WHERE hash = ?',
      [hash]
    );

    let result;
    if (existingRows.length > 0) {
      // Update existing entry
      await errorTrackingDb.query(`
        UPDATE errors 
        SET last_seen = NOW(), occurrences = occurrences + 1
        WHERE hash = ?
      `, [hash]);

      // Create event record
      const contextJson = JSON.stringify({
        stack: stack || sanitizedMessage,
        url: url,
        line: line,
        column: column,
        timestamp: new Date().toISOString(),
        requestType: 'client_logger'
      });
      await errorTrackingDb.query(`
        INSERT INTO error_events (
          error_id,
          occurred_at,
          user_agent,
          session_id,
          additional_context
        ) VALUES (?, NOW(), ?, ?, ?)
      `, [existingRows[0].id, req.headers['user-agent'] || '', '', contextJson]);

      result = {
        id: existingRows[0].id,
        occurrences: existingRows[0].occurrences + 1,
        updated: true
      };
    } else {
      // Insert new entry
      // Map type to valid enum values
      const typeMapping = {
        'frontend': 'frontend',
        'backend': 'backend',
        'server': 'backend',
        'browser': 'frontend',
        'api': 'api',
        'nginx': 'nginx',
        'db': 'db'
      };
      const validType = typeMapping[type] || 'frontend';

      const insertResult = await errorTrackingDb.query(`
        INSERT INTO errors (
          hash, type, source, message, log_level, origin, source_component, 
          first_seen, last_seen, occurrences
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)
      `, [
        hash,
        validType,
        'frontend',
        sanitizedMessage,
        dbLevel,
        type,
        source
      ]);

      // Create event record
      const contextJson = JSON.stringify({
        url: url,
        line: line,
        column: column,
        userAgent: req.headers['user-agent'] || '',
        timestamp: new Date().toISOString(),
        stack: stack || `Frontend console.${level} from ${source}`,
        requestType: 'client_logger'
      });
      await errorTrackingDb.query(`
        INSERT INTO error_events (
          error_id,
          occurred_at,
          user_agent,
          session_id,
          additional_context
        ) VALUES (?, NOW(), ?, ?, ?)
      `, [insertResult[0].insertId, req.headers['user-agent'] || '', '', contextJson]);

      result = {
        id: insertResult[0].insertId,
        occurrences: 1,
        created: true
      };
    }

    res.json({
      success: true,
      message: 'Client log recorded',
      data: result
    });

  } catch (error) {
    console.error('Client Logger API Error:', error);
    console.error('Client Logger API Stack:', error.stack);
    console.error('Client Logger API Request Body:', JSON.stringify(req.body, null, 2));

    // Log this error to the database as well
    try {
      const errorHash = crypto.createHash('md5').update(`Client Logger API Error: ${error.message}`).digest('hex');
      await errorTrackingDb.query(`
        INSERT INTO errors (
          hash, type, source, message, log_level, origin, source_component, first_seen, last_seen, occurrences
        ) VALUES (?, 'backend', 'backend', ?, 'ERROR', 'server', 'ClientLoggerAPI', NOW(), NOW(), 1)
        ON DUPLICATE KEY UPDATE 
        last_seen = NOW(), 
        occurrences = occurrences + 1
      `, [errorHash, `Client Logger API Error: ${error.message}`]);
    } catch (dbError) {
      console.error('Failed to log Client Logger API error to database:', dbError);
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/logger/levels
 * Get available log levels
 */
router.get('/levels', (req, res) => {
  res.json({
    success: true,
    levels: ['INFO', 'WARN', 'ERROR', 'DEBUG', 'SUCCESS'],
    colors: {
      'INFO': { text: '#60a5fa', bg: 'rgba(30, 58, 138, 0.2)', border: 'rgba(29, 78, 216, 0.5)' },
      'WARN': { text: '#facc15', bg: 'rgba(113, 63, 18, 0.2)', border: 'rgba(161, 98, 7, 0.5)' },
      'ERROR': { text: '#f87171', bg: 'rgba(153, 27, 27, 0.2)', border: 'rgba(185, 28, 28, 0.5)' },
      'DEBUG': { text: '#9ca3af', bg: 'rgba(17, 24, 39, 0.2)', border: 'rgba(55, 65, 81, 0.5)' },
      'SUCCESS': { text: '#4ade80', bg: 'rgba(20, 83, 45, 0.2)', border: 'rgba(21, 128, 61, 0.5)' }
    }
  });
});

/**
 * GET /api/logger/stats
 * Get logging statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [stats] = await errorTrackingDb.query(`
      SELECT 
        log_level,
        COUNT(*) as count,
        SUM(occurrences) as total_occurrences
      FROM errors 
      WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY log_level
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      stats: stats,
      period: '24 hours'
    });
  } catch (error) {
    console.error('Logger Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats'
    });
  }
});

/**
 * GET /api/logger/logs
 * Get logs from OMAI error tracking database
 */
router.get('/logs', async (req, res) => {
  try {
    const {
      limit = 100,
      offset = 0,
      level = null,
      source = null,
      origin = null,
      since = null,
      severity = null
    } = req.query;

    // Build dynamic WHERE clause
    let whereConditions = [];
    let queryParams = [];

    if (level) {
      whereConditions.push('log_level = ?');
      queryParams.push(level);
    }

    if (source) {
      whereConditions.push('source LIKE ?');
      queryParams.push(`%${source}%`);
    }

    if (origin) {
      whereConditions.push('origin = ?');
      queryParams.push(origin);
    }

    if (severity) {
      whereConditions.push('severity = ?');
      queryParams.push(severity);
    }

    if (since) {
      whereConditions.push('last_seen >= ?');
      queryParams.push(since);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count for pagination
    const [countResult] = await errorTrackingDb.query(`
      SELECT COUNT(*) as total FROM errors ${whereClause}
    `, queryParams);

    const total = countResult[0].total;

    // Get paginated logs
    queryParams.push(parseInt(limit));
    queryParams.push(parseInt(offset));

    const [logs] = await errorTrackingDb.query(`
      SELECT 
        id,
        hash,
        type,
        source,
        message,
        log_level as level,
        origin,
        source_component,
        first_seen,
        last_seen,
        occurrences,
        status,
        severity,
        UNIX_TIMESTAMP(last_seen) * 1000 as timestamp
      FROM errors 
      ${whereClause}
      ORDER BY last_seen DESC 
      LIMIT ? OFFSET ?
    `, queryParams);

    // Transform logs to match frontend LogEntry interface
    const transformedLogs = logs.map(log => ({
      id: log.id,
      timestamp: new Date(log.last_seen),
      level: log.level,
      source: log.origin || log.type,
      message: log.message,
      service: log.source,
      origin: log.origin,
      source_component: log.source_component,
      meta: {
        hash: log.hash,
        occurrences: log.occurrences,
        status: log.status,
        severity: log.severity,
        first_seen: log.first_seen
      }
    }));

    res.json({
      success: true,
      logs: transformedLogs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });

  } catch (error) {
    console.error('Logger Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch logs'
    });
  }
});

/**
 * GET /api/logger/realtime
 * Get real-time logs (last 50 entries)
 */
router.get('/realtime', async (req, res) => {
  try {
    const { limit = 50, level = null } = req.query;

    let whereClause = '';
    let queryParams = [];

    if (level && level !== 'All Logs') {
      whereClause = 'WHERE log_level = ?';
      queryParams.push(level);
    }

    const [logs] = await errorTrackingDb.query(`
      SELECT 
        id,
        hash,
        type,
        source,
        message,
        log_level as level,
        origin,
        source_component,
        last_seen,
        occurrences,
        status,
        severity,
        UNIX_TIMESTAMP(last_seen) * 1000 as timestamp
      FROM errors 
      ${whereClause}
      ORDER BY last_seen DESC 
      LIMIT ?
    `, [...queryParams, parseInt(limit)]);

    // Transform logs to match frontend LogEntry interface
    const transformedLogs = logs.map(log => ({
      id: log.id,
      timestamp: new Date(log.last_seen),
      level: log.level,
      source: log.origin || log.type,
      message: log.message,
      service: log.source,
      origin: log.origin,
      source_component: log.source_component,
      meta: {
        hash: log.hash,
        occurrences: log.occurrences,
        status: log.status,
        severity: log.severity
      }
    }));

    res.json({
      success: true,
      logs: transformedLogs,
      count: transformedLogs.length
    });

  } catch (error) {
    console.error('Realtime Logger Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch realtime logs'
    });
  }
});

/**
 * GET /api/logger/critical
 * Get critical events (ERROR level and above)
 */
router.get('/critical', async (req, res) => {
  try {
    const { limit = 25 } = req.query;

    const [logs] = await errorTrackingDb.query(`
      SELECT 
        id,
        hash,
        type,
        source,
        message,
        log_level as level,
        origin,
        source_component,
        last_seen,
        occurrences,
        status,
        severity,
        UNIX_TIMESTAMP(last_seen) * 1000 as timestamp
      FROM errors 
      WHERE log_level IN ('ERROR', 'CRITICAL') OR severity IN ('critical', 'high')
      ORDER BY 
        CASE 
          WHEN severity = 'critical' THEN 1
          WHEN severity = 'high' THEN 2
          WHEN log_level = 'ERROR' THEN 3
          ELSE 4
        END,
        last_seen DESC 
      LIMIT ?
    `, [parseInt(limit)]);

    // Transform logs to match frontend LogEntry interface
    const transformedLogs = logs.map(log => ({
      id: log.id,
      timestamp: new Date(log.last_seen),
      level: log.level,
      source: log.origin || log.type,
      message: log.message,
      service: log.source,
      origin: log.origin,
      source_component: log.source_component,
      meta: {
        hash: log.hash,
        occurrences: log.occurrences,
        status: log.status,
        severity: log.severity
      }
    }));

    res.json({
      success: true,
      logs: transformedLogs,
      count: transformedLogs.length
    });

  } catch (error) {
    console.error('Critical Logger Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch critical logs'
    });
  }
});

/**
 * POST /api/logger/batch
 * Handle batch debug logs from frontend
 */
router.post('/batch', [
  body('logs').isArray().withMessage('Logs must be an array'),
  body('debugMode').optional().isBoolean().withMessage('Debug mode must be boolean')
], async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { logs, debugMode = false } = req.body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No logs provided'
      });
    }

    let processedCount = 0;
    let errorCount = 0;

    // Process each log entry
    for (const log of logs) {
      try {
        const {
          level = 'INFO',
          source = 'unknown',
          origin = 'browser',
          message,
          details = '',
          source_component = '',
          sessionId = '',
          timestamp = Date.now()
        } = log;

        // Sanitize message and details
        const sanitizedMessage = String(message || '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
        const sanitizedDetails = String(details || '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();

        // Write to filesystem if debug mode enabled
        if (debugMode || process.env.DEBUG_MODE === 'true') {
          await writeDebugLogToFile({
            timestamp: new Date(timestamp),
            level,
            source,
            origin,
            source_component,
            message: sanitizedMessage,
            details: sanitizedDetails
          });
        }

        // Create hash for deduplication
        const hashContent = `${level}:${source}:${sanitizedMessage}:${source_component}`;
        const hash = crypto.createHash('md5').update(hashContent).digest('hex');

        // Check if this error/log already exists
        const [existingRows] = await errorTrackingDb.query(
          'SELECT id, occurrences FROM errors WHERE hash = ?',
          [hash]
        );

        if (existingRows.length > 0) {
          // Update existing entry
          const existingId = existingRows[0].id;
          const newOccurrences = existingRows[0].occurrences + 1;

          await errorTrackingDb.query(`
            UPDATE errors 
            SET last_seen = FROM_UNIXTIME(?), 
                occurrences = ?
            WHERE id = ?
          `, [
            Math.floor(timestamp / 1000),
            newOccurrences,
            existingId
          ]);

          // Create event record
          const contextJson = JSON.stringify({
            details: sanitizedDetails,
            timestamp: new Date(timestamp).toISOString(),
            requestType: 'batch_logger'
          });
          await errorTrackingDb.query(`
            INSERT INTO error_events (
              error_id,
              occurred_at,
              user_agent,
              session_id,
              additional_context
            ) VALUES (?, FROM_UNIXTIME(?), ?, ?, ?)
          `, [existingId, Math.floor(timestamp / 1000), '', sessionId, contextJson]);
        } else {
          // Create new entry
          // Map origin to valid type enum values
          const typeMapping = {
            'frontend': 'frontend',
            'backend': 'backend',
            'server': 'backend',
            'browser': 'frontend',
            'api': 'api',
            'nginx': 'nginx',
            'db': 'db'
          };
          const validType = typeMapping[origin] || 'backend';

          const [result] = await errorTrackingDb.query(`
            INSERT INTO errors (
              hash, 
              type,
              source, 
              message, 
              log_level, 
              origin, 
              source_component,
              first_seen, 
              last_seen, 
              occurrences
            ) VALUES (?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?), 1)
          `, [
            hash,
            validType,
            source,
            sanitizedMessage,
            level,
            origin,
            source_component,
            Math.floor(timestamp / 1000),
            Math.floor(timestamp / 1000)
          ]);

          // Create event record
          const contextJson = JSON.stringify({
            details: sanitizedDetails,
            timestamp: new Date(timestamp).toISOString(),
            requestType: 'batch_logger'
          });
          await errorTrackingDb.query(`
            INSERT INTO error_events (
              error_id,
              occurred_at,
              user_agent,
              session_id,
              additional_context
            ) VALUES (?, FROM_UNIXTIME(?), ?, ?, ?)
          `, [result.insertId, Math.floor(timestamp / 1000), '', sessionId, contextJson]);
        }

        processedCount++;
      } catch (logError) {
        console.error('Error processing individual log:', logError);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `Processed ${processedCount} logs successfully`,
      processed: processedCount,
      errors: errorCount,
      debugMode: debugMode || process.env.DEBUG_MODE === 'true'
    });

  } catch (error) {
    console.error('Batch Logger API Error:', error);
    console.error('Batch Logger API Stack:', error.stack);
    console.error('Batch Logger API Request Body:', JSON.stringify(req.body, null, 2));

    // Log this error to the database as well
    try {
      const errorHash = crypto.createHash('md5').update(`Batch Logger API Error: ${error.message}`).digest('hex');
      await errorTrackingDb.query(`
        INSERT INTO errors (
          hash, type, source, message, log_level, origin, source_component, first_seen, last_seen, occurrences
        ) VALUES (?, 'backend', 'backend', ?, 'ERROR', 'server', 'BatchLoggerAPI', NOW(), NOW(), 1)
        ON DUPLICATE KEY UPDATE 
        last_seen = NOW(), 
        occurrences = occurrences + 1
      `, [errorHash, `Batch Logger API Error: ${error.message}`]);
    } catch (dbError) {
      console.error('Failed to log Batch Logger API error to database:', dbError);
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Write debug log to filesystem
 */
async function writeDebugLogToFile(logData) {
  try {
    const logDir = '/var/log/omai';
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const logFile = path.join(logDir, `debug-${today}.log`);

    // Ensure log directory exists
    await fs.mkdir(logDir, { recursive: true });

    // Format log entry
    const timestamp = logData.timestamp.toISOString();
    const logLine = `[${timestamp}] [${logData.level}] [${logData.source}/${logData.origin}] ${logData.source_component || 'unknown'}: ${logData.message}\n`;

    // Append to log file
    await fs.appendFile(logFile, logLine);

    // Clean up old log files (keep only 7 days)
    await cleanupOldLogFiles(logDir);

  } catch (error) {
    console.error('Failed to write debug log to filesystem:', error);
    // Don't throw - we don't want filesystem errors to break the API
  }
}

/**
 * Clean up old debug log files (older than 7 days)
 */
async function cleanupOldLogFiles(logDir) {
  try {
    const files = await fs.readdir(logDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    for (const file of files) {
      if (!file.startsWith('debug-') || !file.endsWith('.log')) continue;

      const filePath = path.join(logDir, file);
      const stats = await fs.stat(filePath);

      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        console.log(`Cleaned up old debug log file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old log files:', error);
  }
}

module.exports = router;