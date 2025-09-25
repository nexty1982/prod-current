// src/server/records/explorer.js
const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db');

// Validation patterns
const CHURCH_ID_PATTERN = /^[0-9]{1,6}$/;
const TABLE_NAME_PATTERN = /^[a-zA-Z0-9_]+_records$/;

/**
 * Security middleware - restrict to super_admin only
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.session.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Super administrator privileges required'
    });
  }

  next();
};

/**
 * Validate church ID parameter
 */
const validateChurchId = (req, res, next) => {
  const { churchId } = req.params;
  
  if (!CHURCH_ID_PATTERN.test(churchId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid church ID format'
    });
  }

  next();
};

/**
 * Validate table name parameter
 */
const validateTableName = (req, res, next) => {
  const { table } = req.params;
  
  if (!TABLE_NAME_PATTERN.test(table)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid table name format'
    });
  }

  next();
};

/**
 * GET /api/records/:churchId/tables
 * List all tables ending with _records for a church
 */
router.get('/:churchId/tables', requireSuperAdmin, validateChurchId, async (req, res) => {
  try {
    const { churchId } = req.params;
    const dbName = `om_church_${churchId}`;

    // Check if database exists by querying INFORMATION_SCHEMA
    const [dbCheck] = await promisePool.query(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [dbName]
    );

    if (dbCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Database ${dbName} not found`
      });
    }

    // List tables ending with _records
    const [tables] = await promisePool.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE '%\\_records' ESCAPE '\\\\'
       ORDER BY TABLE_NAME`,
      [dbName]
    );

    res.json({
      success: true,
      data: tables,
      meta: {
        database: dbName,
        count: tables.length
      }
    });

  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tables'
    });
  }
});

/**
 * GET /api/records/:churchId/:table/columns
 * Get column information for a specific table
 */
router.get('/:churchId/:table/columns', requireSuperAdmin, validateChurchId, validateTableName, async (req, res) => {
  try {
    const { churchId, table } = req.params;
    const dbName = `om_church_${churchId}`;

    // Get column information
    const [columns] = await promisePool.query(
      `SELECT COLUMN_NAME, ORDINAL_POSITION, DATA_TYPE, IS_NULLABLE, COLUMN_KEY 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
       ORDER BY ORDINAL_POSITION`,
      [dbName, table]
    );

    if (columns.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Table ${table} not found in database ${dbName}`
      });
    }

    // Filter out 'id' column from display but keep for internal use
    const displayColumns = columns.filter(col => col.COLUMN_NAME !== 'id');
    
    // Generate display headers
    const headersWithLabels = displayColumns.map(col => ({
      ...col,
      DISPLAY_HEADER: `Field ${col.ORDINAL_POSITION}` // Default fallback
    }));

    res.json({
      success: true,
      data: {
        columns: headersWithLabels,
        allColumns: columns // Include all columns for internal use
      },
      meta: {
        database: dbName,
        table: table,
        totalColumns: columns.length,
        displayColumns: displayColumns.length
      }
    });

  } catch (error) {
    console.error('Error fetching columns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch columns'
    });
  }
});

/**
 * GET /api/records/:churchId/:table
 * Get table data with pagination, search and sorting
 */
router.get('/:churchId/:table', requireSuperAdmin, validateChurchId, validateTableName, async (req, res) => {
  try {
    const { churchId, table } = req.params;
    const { 
      limit = 50, 
      offset = 0, 
      order = 'id:desc',
      search = ''
    } = req.query;

    const dbName = `om_church_${churchId}`;

    // Validate limit and offset
    const limitNum = Math.min(Math.max(parseInt(limit), 1), 100);
    const offsetNum = Math.max(parseInt(offset), 0);

    // Parse order parameter
    let orderClause = 'ORDER BY id DESC';
    if (order && typeof order === 'string') {
      const [field, direction] = order.split(':');
      if (field && ['asc', 'desc'].includes(direction?.toLowerCase())) {
        // Simple validation - only allow basic column names
        if (/^[a-zA-Z0-9_]+$/.test(field)) {
          orderClause = `ORDER BY \`${field}\` ${direction.toUpperCase()}`;
        }
      }
    }

    // Build search clause if provided
    let searchClause = '';
    let queryParams = [dbName, table];
    
    if (search && search.trim()) {
      // Get text-like columns for search
      const [textColumns] = await promisePool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
         AND DATA_TYPE IN ('varchar', 'text', 'char', 'tinytext', 'mediumtext', 'longtext')
         ORDER BY ORDINAL_POSITION
         LIMIT 10`,
        [dbName, table]
      );

      if (textColumns.length > 0) {
        const searchFields = textColumns.map(col => `\`${col.COLUMN_NAME}\``).join(", ' ', ");
        searchClause = `WHERE CONCAT_WS(' ', ${searchFields}) LIKE ?`;
        queryParams.push(`%${search.trim()}%`);
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM \`${dbName}\`.\`${table}\` ${searchClause}`;
    const [countResult] = await promisePool.query(countQuery, queryParams.slice(2));
    const total = countResult[0].total;

    // Get data
    const dataQuery = `SELECT * FROM \`${dbName}\`.\`${table}\` ${searchClause} ${orderClause} LIMIT ? OFFSET ?`;
    const [rows] = await promisePool.query(dataQuery, [...queryParams.slice(2), limitNum, offsetNum]);

    // Remove 'id' from display data
    const displayRows = rows.map(row => {
      const { id, ...displayRow } = row;
      return displayRow;
    });

    res.json({
      success: true,
      data: displayRows,
      meta: {
        database: dbName,
        table: table,
        total: total,
        limit: limitNum,
        offset: offsetNum,
        count: rows.length,
        hasMore: offsetNum + limitNum < total
      }
    });

  } catch (error) {
    console.error('Error fetching table data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table data'
    });
  }
});

module.exports = router;