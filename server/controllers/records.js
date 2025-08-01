/**
 * Orthodox Metrics - Records Controller
 * Business logic for church records CRUD operations
 */

const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Database connection helper
const getDbConnection = async () => {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'orthodmetrics_dev'
  });
};

// Helper function to get table name based on record type
const getTableName = (recordType) => {
  const tableMap = {
    'baptism': 'baptism_records',
    'marriage': 'marriage_records', 
    'funeral': 'funeral_records'
  };
  return tableMap[recordType];
};

// Helper function to log audit trail
const logAuditTrail = async (connection, action, recordType, recordId, userId, changes = null) => {
  const auditSql = `
    INSERT INTO record_audit_log (
      id, record_type, record_id, user_id, action, changes, 
      created_at, ip_address
    ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
  `;
  
  const auditId = uuidv4();
  const changesJson = changes ? JSON.stringify(changes) : null;
  
  await connection.execute(auditSql, [
    auditId, recordType, recordId, userId, action, changesJson, null
  ]);
};

/**
 * List all records of a specific type
 */
const listRecords = async (req, res) => {
  let connection;
  
  try {
    connection = await getDbConnection();
    const { recordType } = req;
    const tableName = getTableName(recordType);
    
    // Query parameters for pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    
    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    
    if (search) {
      whereClause += ' AND (JSON_EXTRACT(fields, "$.*.value") LIKE ? OR id LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    
    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }
    
    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;
    const [countRows] = await connection.execute(countSql, queryParams);
    const total = countRows[0].total;
    
    // Get records with pagination
    const sql = `
      SELECT id, record_type, fields, metadata, color_overrides, tags, 
             created_at, updated_at, status
      FROM ${tableName} 
      ${whereClause}
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await connection.execute(sql, [...queryParams, limit, offset]);
    
    // Parse JSON fields
    const records = rows.map(row => ({
      ...row,
      fields: JSON.parse(row.fields || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      colorOverrides: JSON.parse(row.color_overrides || '{}'),
      tags: JSON.parse(row.tags || '[]')
    }));
    
    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error listing records:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to retrieve records',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) await connection.end();
  }
};

/**
 * Get a single record by ID
 */
const getRecordById = async (req, res) => {
  let connection;
  
  try {
    connection = await getDbConnection();
    const { recordType } = req;
    const { id } = req.params;
    const tableName = getTableName(recordType);
    
    const sql = `
      SELECT id, record_type, fields, metadata, color_overrides, tags,
             created_at, updated_at, status
      FROM ${tableName} 
      WHERE id = ?
    `;
    
    const [rows] = await connection.execute(sql, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Record not found',
        message: `No ${recordType} record found with ID: ${id}`
      });
    }
    
    const record = {
      ...rows[0],
      fields: JSON.parse(rows[0].fields || '[]'),
      metadata: JSON.parse(rows[0].metadata || '{}'),
      colorOverrides: JSON.parse(rows[0].color_overrides || '{}'),
      tags: JSON.parse(rows[0].tags || '[]')
    };
    
    res.json({
      success: true,
      data: record
    });
    
  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to retrieve record',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) await connection.end();
  }
};

/**
 * Create a new record
 */
const createRecord = async (req, res) => {
  let connection;
  
  try {
    connection = await getDbConnection();
    const { recordType } = req;
    const { fields, metadata, colorOverrides, tags } = req.body;
    const tableName = getTableName(recordType);
    
    const recordId = uuidv4();
    const userId = req.user.id;
    
    const sql = `
      INSERT INTO ${tableName} (
        id, record_type, fields, metadata, color_overrides, tags,
        created_at, updated_at, created_by, updated_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, 'active')
    `;
    
    const values = [
      recordId,
      recordType,
      JSON.stringify(fields || []),
      JSON.stringify({
        churchId: req.user.church_id || 1,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        version: 1,
        ...metadata
      }),
      JSON.stringify(colorOverrides || {}),
      JSON.stringify(tags || []),
      userId,
      userId
    ];
    
    await connection.execute(sql, values);
    
    // Log audit trail
    await logAuditTrail(connection, 'CREATE', recordType, recordId, userId, {
      fields: fields,
      metadata: metadata
    });
    
    res.status(201).json({
      success: true,
      data: {
        id: recordId,
        recordType,
        message: `${recordType} record created successfully`
      }
    });
    
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to create record',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) await connection.end();
  }
};

/**
 * Update an existing record
 */
const updateRecord = async (req, res) => {
  let connection;
  
  try {
    connection = await getDbConnection();
    const { recordType } = req;
    const { id } = req.params;
    const { fields, metadata, colorOverrides, tags } = req.body;
    const tableName = getTableName(recordType);
    const userId = req.user.id;
    
    // First, get the existing record for audit trail
    const [existingRows] = await connection.execute(
      `SELECT fields, metadata, color_overrides, tags FROM ${tableName} WHERE id = ?`,
      [id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        error: 'Record not found',
        message: `No ${recordType} record found with ID: ${id}`
      });
    }
    
    const existingRecord = existingRows[0];
    
    const sql = `
      UPDATE ${tableName} 
      SET fields = ?, metadata = ?, color_overrides = ?, tags = ?,
          updated_at = NOW(), updated_by = ?
      WHERE id = ?
    `;
    
    const updatedMetadata = {
      ...JSON.parse(existingRecord.metadata || '{}'),
      ...metadata,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
      version: (JSON.parse(existingRecord.metadata || '{}').version || 1) + 1
    };
    
    const values = [
      JSON.stringify(fields || []),
      JSON.stringify(updatedMetadata),
      JSON.stringify(colorOverrides || {}),
      JSON.stringify(tags || []),
      userId,
      id
    ];
    
    const [result] = await connection.execute(sql, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Record not found',
        message: `No ${recordType} record found with ID: ${id}`
      });
    }
    
    // Log audit trail with changes
    const changes = {
      before: {
        fields: JSON.parse(existingRecord.fields || '[]'),
        metadata: JSON.parse(existingRecord.metadata || '{}')
      },
      after: {
        fields: fields,
        metadata: updatedMetadata
      }
    };
    
    await logAuditTrail(connection, 'UPDATE', recordType, id, userId, changes);
    
    res.json({
      success: true,
      data: {
        id,
        recordType,
        message: `${recordType} record updated successfully`,
        version: updatedMetadata.version
      }
    });
    
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({
      error: 'Database error', 
      message: 'Failed to update record',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) await connection.end();
  }
};

/**
 * Delete a record
 */
const deleteRecord = async (req, res) => {
  let connection;
  
  try {
    connection = await getDbConnection();
    const { recordType } = req;
    const { id } = req.params;
    const tableName = getTableName(recordType);
    const userId = req.user.id;
    
    // Get record before deletion for audit trail
    const [existingRows] = await connection.execute(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [id]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        error: 'Record not found',
        message: `No ${recordType} record found with ID: ${id}`
      });
    }
    
    const existingRecord = existingRows[0];
    
    // Soft delete by updating status
    const sql = `
      UPDATE ${tableName} 
      SET status = 'deleted', updated_at = NOW(), updated_by = ?
      WHERE id = ?
    `;
    
    await connection.execute(sql, [userId, id]);
    
    // Log audit trail
    await logAuditTrail(connection, 'DELETE', recordType, id, userId, {
      deletedRecord: {
        fields: JSON.parse(existingRecord.fields || '[]'),
        metadata: JSON.parse(existingRecord.metadata || '{}')
      }
    });
    
    res.json({
      success: true,
      data: {
        id,
        recordType,
        message: `${recordType} record deleted successfully`
      }
    });
    
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to delete record', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) await connection.end();
  }
};

/**
 * Get record audit history
 */
const getRecordHistory = async (req, res) => {
  let connection;
  
  try {
    connection = await getDbConnection();
    const { recordType } = req;
    const { id } = req.params;
    
    const sql = `
      SELECT ral.*, u.username, u.role
      FROM record_audit_log ral
      LEFT JOIN users u ON ral.user_id = u.id
      WHERE ral.record_type = ? AND ral.record_id = ?
      ORDER BY ral.created_at DESC
    `;
    
    const [rows] = await connection.execute(sql, [recordType, id]);
    
    const history = rows.map(row => ({
      ...row,
      changes: row.changes ? JSON.parse(row.changes) : null
    }));
    
    res.json({
      success: true,
      data: history
    });
    
  } catch (error) {
    console.error('Error fetching record history:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to retrieve record history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) await connection.end();
  }
};

/**
 * Validate record data
 */
const validateRecord = async (req, res) => {
  try {
    const { recordType } = req;
    const { fields } = req.body;
    
    // Basic validation rules based on record type
    const validationRules = {
      baptism: ['person_name', 'baptism_date', 'church'],
      marriage: ['spouse1_name', 'spouse2_name', 'marriage_date', 'church'],
      funeral: ['person_name', 'death_date', 'funeral_date', 'church']
    };
    
    const requiredFields = validationRules[recordType] || [];
    const errors = [];
    
    // Check required fields
    requiredFields.forEach(fieldKey => {
      const field = fields.find(f => f.key === fieldKey);
      if (!field || !field.value) {
        errors.push({
          field: fieldKey,
          message: `${fieldKey.replace('_', ' ')} is required`
        });
      }
    });
    
    // Validate dates
    fields.forEach(field => {
      if (field.type === 'date' && field.value) {
        const date = new Date(field.value);
        if (isNaN(date.getTime())) {
          errors.push({
            field: field.key,
            message: `${field.label} must be a valid date`
          });
        }
      }
    });
    
    res.json({
      success: true,
      data: {
        isValid: errors.length === 0,
        errors
      }
    });
    
  } catch (error) {
    console.error('Error validating record:', error);
    res.status(500).json({
      error: 'Validation error',
      message: 'Failed to validate record'
    });
  }
};

/**
 * Get records statistics
 */
const getRecordStats = async (req, res) => {
  let connection;
  
  try {
    connection = await getDbConnection();
    
    const stats = {};
    const recordTypes = ['baptism', 'marriage', 'funeral'];
    
    for (const recordType of recordTypes) {
      const tableName = getTableName(recordType);
      
      const [totalRows] = await connection.execute(
        `SELECT COUNT(*) as total FROM ${tableName} WHERE status = 'active'`
      );
      
      const [recentRows] = await connection.execute(
        `SELECT COUNT(*) as recent FROM ${tableName} 
         WHERE status = 'active' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
      );
      
      stats[recordType] = {
        total: totalRows[0].total,
        recent: recentRows[0].recent
      };
    }
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error fetching record stats:', error);
    res.status(500).json({
      error: 'Database error',
      message: 'Failed to retrieve statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) await connection.end();
  }
};

module.exports = {
  listRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  getRecordHistory,
  validateRecord,
  getRecordStats
};
