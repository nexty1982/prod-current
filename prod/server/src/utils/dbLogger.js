const { getAppPool } = require('../../config/db-compat');
// Centralized Database Logger
// Replaces filesystem-based Winston and custom file logging
const { promisePool } = require('../../config/db-compat');
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Create separate connection pool for OMAI error tracking database
const omaiPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: 'orthodoxmetrics_db',
  connectTimeout: 60000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

class DatabaseLogger {
  constructor() {
    this.buffer = [];
    this.bufferSize = 100;
    this.fallbackLogDir = path.join(__dirname, '../logs');
    this.fallbackEnabled = true;
    this.isInitialized = false;
    this.initializeDatabase();
  }

  async initializeDatabase() {
    try {
      // Create tables if they don't exist
      const sqlPath = path.join(__dirname, '../database/create-system-logs-table.sql');
      const sql = await fs.readFile(sqlPath, 'utf8');
      
      // Split and execute SQL statements
      const statements = sql.split(';').filter(stmt => {
        const trimmed = stmt.trim();
        // Filter out empty statements and comment-only statements
        return trimmed && 
               !trimmed.startsWith('--') && 
               trimmed.length > 0 &&
               !trimmed.match(/^[\s\-]*$/);
      });
      
      for (const statement of statements) {
        const cleanStatement = statement.trim();
        if (cleanStatement) {
          console.log(`[DB INIT] Executing: ${cleanStatement.substring(0, 50)}...`);
          await getAppPool().query(cleanStatement);
        }
      }
      
      this.isInitialized = true;
      await this.flushBuffer();
      console.log('✅ Database logger initialized');
    } catch (error) {
      console.error('❌ Failed to initialize database logger:', error.message);
      this.fallbackEnabled = true;
    }
  }

  async log(level, source, message, meta = {}, user = null, service = null, context = {}) {
    const logEntry = {
      timestamp: new Date(),
      level: level.toUpperCase(),
      source,
      message,
      meta: JSON.stringify(meta),
      user_email: user?.email || user || null,
      service,
      session_id: context.sessionId || null,
      request_id: context.requestId || null,
      ip_address: context.ipAddress || null,
      user_agent: context.userAgent || null
    };

    try {
      if (this.isInitialized) {
        await this.writeToDatabase(logEntry);
      } else {
        // Buffer logs until database is ready
        this.buffer.push(logEntry);
        if (this.buffer.length >= this.bufferSize) {
          await this.flushBuffer();
        }
      }
    } catch (error) {
      // Fallback to file logging if database fails
      if (this.fallbackEnabled) {
        await this.writeToFallbackFile(logEntry, error);
      }
      
      // Also buffer for retry
      this.buffer.push(logEntry);
    }

    // Always log to console for development
    this.logToConsole(logEntry);
  }

  async writeToDatabase(logEntry) {
    const sql = `
      INSERT INTO system_logs (timestamp, level, source, message, meta, user_email, service, session_id, request_id, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      logEntry.timestamp,
      logEntry.level,
      logEntry.source,
      logEntry.message,
      logEntry.meta,
      logEntry.user_email,
      logEntry.service,
      logEntry.session_id,
      logEntry.request_id,
      logEntry.ip_address,
      logEntry.user_agent
    ];

    const [result] = await getAppPool().query(sql, values);
    
    // Add the generated ID to the log entry for broadcasting
    const completeLogEntry = {
      id: result.insertId,
      timestamp: logEntry.timestamp.toISOString(),
      level: logEntry.level,
      source: logEntry.source,
      message: logEntry.message,
      meta: JSON.parse(logEntry.meta),
      user_email: logEntry.user_email,
      service: logEntry.service,
      session_id: logEntry.session_id,
      request_id: logEntry.request_id,
      ip_address: logEntry.ip_address,
      user_agent: logEntry.user_agent
    };

    // Broadcast to WebSocket clients (non-blocking)
    setImmediate(() => {
      try {
        const websocketService = require('../services/websocketService');
        websocketService.broadcastLogEntry(completeLogEntry);
      } catch (broadcastError) {
        // Don't fail the logging operation if broadcast fails
        console.error('Failed to broadcast log entry:', broadcastError.message);
      }
    });

    return result;
  }

  async flushBuffer() {
    if (this.buffer.length === 0) return;

    const bufferedLogs = [...this.buffer];
    this.buffer = [];

    for (const logEntry of bufferedLogs) {
      try {
        await this.writeToDatabase(logEntry);
      } catch (error) {
        // Re-buffer failed entries
        this.buffer.push(logEntry);
        if (this.fallbackEnabled) {
          await this.writeToFallbackFile(logEntry, error);
        }
      }
    }
  }

  async writeToFallbackFile(logEntry, originalError) {
    try {
      await fs.mkdir(this.fallbackLogDir, { recursive: true });
      const fallbackFile = path.join(this.fallbackLogDir, 'db-logger-fallback.log');
      
      const fallbackLogLine = JSON.stringify({
        ...logEntry,
        timestamp: logEntry.timestamp.toISOString(),
        fallback_reason: originalError?.message || 'Database unavailable'
      }) + '\n';

      await fs.appendFile(fallbackFile, fallbackLogLine);
    } catch (fallbackError) {
      console.error('❌ Fallback logging failed:', fallbackError.message);
    }
  }

  logToConsole(logEntry) {
    const timestamp = logEntry.timestamp.toISOString();
    const levelColors = {
      INFO: '\x1b[36m',    // Cyan
      WARN: '\x1b[33m',    // Yellow
      ERROR: '\x1b[31m',   // Red
      DEBUG: '\x1b[90m',   // Dark gray
      SUCCESS: '\x1b[32m'  // Green
    };
    
    const color = levelColors[logEntry.level] || '\x1b[0m';
    const reset = '\x1b[0m';
    
    const consoleMessage = `${color}[${timestamp}] ${logEntry.level}${reset} [${logEntry.source}] ${logEntry.message}`;
    
    if (logEntry.level === 'ERROR') {
      console.error(consoleMessage);
    } else if (logEntry.level === 'WARN') {
      console.warn(consoleMessage);
    } else {
      console.log(consoleMessage);
    }

    // Show metadata if present and not empty
    if (logEntry.meta && logEntry.meta !== '{}') {
      console.log(`  Meta: ${logEntry.meta}`);
    }
  }

  // Convenience methods for different log levels
  async info(source, message, meta = {}, user = null, service = null, context = {}) {
    return this.log('INFO', source, message, meta, user, service, context);
  }

  async warn(source, message, meta = {}, user = null, service = null, context = {}) {
    return this.log('WARN', source, message, meta, user, service, context);
  }

  async error(source, message, meta = {}, user = null, service = null, context = {}) {
    return this.log('ERROR', source, message, meta, user, service, context);
  }

  async debug(source, message, meta = {}, user = null, service = null, context = {}) {
    return this.log('DEBUG', source, message, meta, user, service, context);
  }

  async success(source, message, meta = {}, user = null, service = null, context = {}) {
    return this.log('SUCCESS', source, message, meta, user, service, context);
  }

  // Migration helper for existing Winston logs
  async migrateFromWinston(winstonLogData) {
    const { timestamp, level, message, ...meta } = winstonLogData;
    
    return this.log(
      level || 'INFO',
      meta.service || 'winston-migration',
      message,
      meta,
      meta.user_email,
      meta.service
    );
  }

  // Query helpers for log retrieval - Updated for OMAI Error Tracking DB
  async getLogs(filters = {}, useOmaiDatabase = false) {
    const {
      level,
      source,
      service,
      user_email,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = filters;

    // Query the errors table in orthodoxmetrics_db with new schema
    let sql = `SELECT 
      id, 
      hash, 
      type, 
      source, 
      message, 
      first_seen, 
      last_seen, 
      occurrences, 
      status, 
      severity, 
      log_level as level,
      origin, 
      source_component,
      auto_tracked,
      last_seen as timestamp
    FROM errors WHERE 1=1`;
    const params = [];

    if (level) {
      // Handle multiple levels (comma-separated)
      if (level.includes(',')) {
        const levels = level.split(',').map(l => l.trim());
        sql += ` AND log_level IN (${levels.map(() => '?').join(',')})`;
        params.push(...levels);
      } else {
        sql += ' AND log_level = ?';
        params.push(level);
      }
    }

    if (source) {
      // Check both source and origin fields
      sql += ' AND (source LIKE ? OR origin LIKE ?)';
      params.push(`%${source}%`, `%${source}%`);
    }

    if (service || filters.source_component) {
      const serviceFilter = service || filters.source_component;
      sql += ' AND source_component LIKE ?';
      params.push(`%${serviceFilter}%`);
    }

    if (startDate) {
      sql += ' AND last_seen >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND last_seen <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY last_seen DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Use OMAI database pool if flag is set, otherwise use default pool
    const dbPool = useOmaiDatabase ? omaiPool : promisePool;
    const [rows] = await getAppPool().query(sql, params);
    
    // Transform rows to match expected format
    return rows.map(row => ({
      id: row.id,
      level: row.level || row.log_level,
      source: row.origin || row.source,
      service: row.source_component,
      message: row.message,
      timestamp: row.timestamp || row.last_seen,
      meta: {
        hash: row.hash,
        type: row.type,
        occurrences: row.occurrences,
        status: row.status,
        severity: row.severity,
        auto_tracked: row.auto_tracked,
        first_seen: row.first_seen
      }
    }));
  }

  // Cleanup old logs (retention policy)
  async cleanupOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const sql = 'DELETE FROM system_logs WHERE timestamp < ?';
    const [result] = await getAppPool().query(sql, [cutoffDate]);
    
    await this.info('DatabaseLogger', `Cleaned up ${result.affectedRows} old log entries`, {
      cutoffDate: cutoffDate.toISOString(),
      daysToKeep
    });

    return result.affectedRows;
  }
}

// Create singleton instance
const dbLogger = new DatabaseLogger();

// Export convenience functions
module.exports = {
  dbLogger,
  log: (level, source, message, meta, user, service, context) => 
    dbLogger.log(level, source, message, meta, user, service, context),
  info: (source, message, meta, user, service, context) => 
    dbLogger.info(source, message, meta, user, service, context),
  warn: (source, message, meta, user, service, context) => 
    dbLogger.warn(source, message, meta, user, service, context),
  error: (source, message, meta, user, service, context) => 
    dbLogger.error(source, message, meta, user, service, context),
  debug: (source, message, meta, user, service, context) => 
    dbLogger.debug(source, message, meta, user, service, context),
  success: (source, message, meta, user, service, context) => 
    dbLogger.success(source, message, meta, user, service, context),
  getLogs: (filters) => dbLogger.getLogs(filters),
  cleanupOldLogs: (daysToKeep) => dbLogger.cleanupOldLogs(daysToKeep)
};