/**
 * Orthod    database: process.env.DB_NAME || 'orthodoxmetrics_db'x Metrics - Audit Logger Middleware
 * Middleware for logging user actions and record changes
 */

const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Database connection helper
const getDbConnection = async () => {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'orthodoxmetrics_db'
  });
};

/**
 * Audit logger middleware factory
 * @param {string} action - The action being performed
 * @returns {Function} Express middleware function
 */
const auditLogger = (action) => {
  return async (req, res, next) => {
    // Store original res.json to intercept the response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Call original json method
      originalJson.call(this, data);
      
      // Log the audit trail asynchronously (don't block the response)
      setImmediate(async () => {
        await logAuditAction(req, res, action, data);
      });
    };
    
    next();
  };
};

/**
 * Log audit action to database
 */
const logAuditAction = async (req, res, action, responseData) => {
  let connection;
  
  try {
    connection = await getDbConnection();
    
    const auditId = uuidv4();
    const userId = req.user?.id || null;
    const userRole = req.user?.role || 'anonymous';
    const recordType = req.recordType || req.params.recordType || null;
    const recordId = req.params.id || responseData?.data?.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress || null;
    const userAgent = req.get('User-Agent') || null;
    
    // Extract relevant request data
    const requestData = {
      method: req.method,
      url: req.originalUrl,
      body: req.body ? JSON.stringify(req.body) : null,
      query: req.query ? JSON.stringify(req.query) : null,
      headers: {
        'user-agent': userAgent,
        'referer': req.get('Referer')
      }
    };
    
    // Extract response status and relevant data
    const responseInfo = {
      statusCode: res.statusCode,
      success: responseData?.success || false,
      data: responseData?.data || null
    };
    
    const sql = `
      INSERT INTO audit_log (
        id, user_id, user_role, action, record_type, record_id,
        request_data, response_data, ip_address, user_agent,
        created_at, status_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
    `;
    
    await getAppPool().query(sql, [
      auditId,
      userId,
      userRole,
      action,
      recordType,
      recordId,
      JSON.stringify(requestData),
      JSON.stringify(responseInfo),
      ipAddress,
      userAgent,
      res.statusCode
    ]);
    
    console.log(`[AUDIT] ${action} by user ${userId} (${userRole}) - Status: ${res.statusCode}`);
    
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw error - audit logging should not break the main flow
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('Error closing audit log connection:', closeError);
      }
    }
  }
};

/**
 * Middleware to log general user actions
 */
const logUserAction = (action, details = null) => {
  return async (req, res, next) => {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (userId) {
      console.log(`[USER ACTION] ${action} - User: ${userId} (${userRole})`, details);
      
      // Could also log to database here if needed
      // await logActionToDb(userId, action, details);
    }
    
    next();
  };
};

/**
 * Create audit tables if they don't exist
 */
const initializeAuditTables = async () => {
  let connection;
  
  try {
    connection = await getDbConnection();
    
    // Create general audit log table
    const auditLogSql = `
      CREATE TABLE IF NOT EXISTS audit_log (
        id VARCHAR(36) PRIMARY KEY,
        user_id INT NULL,
        user_role VARCHAR(50) NULL,
        action VARCHAR(100) NOT NULL,
        record_type VARCHAR(50) NULL,
        record_id VARCHAR(36) NULL,
        request_data JSON NULL,
        response_data JSON NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status_code INT NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_record_type (record_type),
        INDEX idx_created_at (created_at)
      )
    `;
    
    // Create specific record audit log table
    const recordAuditSql = `
      CREATE TABLE IF NOT EXISTS record_audit_log (
        id VARCHAR(36) PRIMARY KEY,
        record_type VARCHAR(50) NOT NULL,
        record_id VARCHAR(36) NOT NULL,
        user_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        changes JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45) NULL,
        INDEX idx_record (record_type, record_id),
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `;
    
    await getAppPool().query(auditLogSql);
    await getAppPool().query(recordAuditSql);
    
    console.log('Audit tables initialized successfully');
    
  } catch (error) {
    console.error('Error initializing audit tables:', error);
  } finally {
    if (connection) await connection.end();
  }
};

/**
 * Get audit logs with filtering
 */
const getAuditLogs = async (req, res) => {
  let connection;
  
  try {
    connection = await getDbConnection();
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const action = req.query.action || '';
    const userId = req.query.userId || '';
    const recordType = req.query.recordType || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';
    
    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    
    if (action) {
      whereClause += ' AND action = ?';
      queryParams.push(action);
    }
    
    if (userId) {
      whereClause += ' AND user_id = ?';
      queryParams.push(userId);
    }
    
    if (recordType) {
      whereClause += ' AND record_type = ?';
      queryParams.push(recordType);
    }
    
    if (startDate) {
      whereClause += ' AND created_at >= ?';
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND created_at <= ?';
      queryParams.push(endDate);
    }
    
    const countSql = `SELECT COUNT(*) as total FROM audit_log ${whereClause}`;
    const [countRows] = await getAppPool().query(countSql, queryParams);
    const total = countRows[0].total;
    
    const sql = `
      SELECT al.*, u.username, u.role
      FROM audit_log al
      LEFT JOIN orthodoxmetrics_db.users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await getAppPool().query(sql, [...queryParams, limit, offset]);
    
    const logs = rows.map(row => ({
      ...row,
      request_data: row.request_data ? JSON.parse(row.request_data) : null,
      response_data: row.response_data ? JSON.parse(row.response_data) : null
    }));
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to retrieve audit logs'
    });
  } finally {
    if (connection) await connection.end();
  }
};

module.exports = {
  auditLogger,
  logUserAction,
  initializeAuditTables,
  getAuditLogs
};
