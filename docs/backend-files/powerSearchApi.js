/**
 * Power Search API for Baptism Records
 * Server-side filtering, pagination, and sorting with advanced query support
 * 
 * @module powerSearchApi
 */

const express = require('express');
const router = express.Router();
const { parseSearchQuery } = require('./powerSearchParser');
const { requireAuth } = require('../middleware/auth');

/**
 * Whitelist of sortable columns for security
 */
const SORTABLE_COLUMNS = new Set([
  'id',
  'person_first',
  'person_last',
  'person_full',
  'birth_date',
  'baptism_date',
  'reception_date',
  'place_name',
  'father_name',
  'mother_name',
  'officiant_name',
  'certificate_no',
  'book_no',
  'page_no',
  'entry_no',
  'created_at',
  'updated_at',
]);

/**
 * Validate and sanitize sort parameters
 */
function validateSort(sortBy, sortDir) {
  const column = sortBy && SORTABLE_COLUMNS.has(sortBy) ? sortBy : 'baptism_date';
  const direction = sortDir && ['asc', 'desc'].includes(sortDir.toLowerCase()) ? sortDir.toLowerCase() : 'desc';
  return { column, direction };
}

/**
 * GET /api/records/baptism
 * Power Search endpoint with server-side filtering, pagination, and sorting
 * 
 * Query Parameters:
 * - q: string (search query with Power Search syntax)
 * - page: number (1-based page number, default: 1)
 * - pageSize: number (records per page, default: 25, max: 100)
 * - sortBy: string (column to sort by, default: baptism_date)
 * - sortDir: 'asc' | 'desc' (sort direction, default: desc)
 * - churchId: number (church ID for multi-tenancy, optional if derived from auth)
 * 
 * Response:
 * {
 *   success: true,
 *   rows: [...],
 *   total: number,
 *   page: number,
 *   pageSize: number,
 *   totalPages: number,
 *   applied: { parsedQuerySummary },
 *   warnings: string[]
 * }
 */
router.get('/baptism', requireAuth, async (req, res) => {
  try {
    const {
      q = '',
      page = 1,
      pageSize = 25,
      sortBy = 'baptism_date',
      sortDir = 'desc',
      churchId: queryChurchId
    } = req.query;

    // Determine church ID (from query, session, or user context)
    let churchId = queryChurchId ? parseInt(queryChurchId, 10) : null;
    
    // If not provided, try to get from user session/context
    if (!churchId && req.user?.church_id) {
      churchId = req.user.church_id;
    }
    
    // Super admins can query without church_id (all churches)
    // Other roles must have a church_id
    if (!churchId && req.user?.role !== 'super_admin') {
      return res.status(400).json({
        success: false,
        error: 'church_id is required',
        message: 'You must specify a church to search records'
      });
    }

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 25));
    const offset = (pageNum - 1) * pageSizeNum;

    // Validate sort parameters
    const { column: sortColumn, direction: sortDirection } = validateSort(sortBy, sortDir);

    // Parse search query
    const { sql: whereSql, params: whereParams, warnings, summary } = parseSearchQuery(q);

    // Build SQL query
    let countSql = 'SELECT COUNT(*) as total FROM baptism_records';
    let dataSql = `
      SELECT 
        id,
        person_first,
        person_middle,
        person_last,
        person_full,
        birth_date,
        baptism_date,
        reception_date,
        place_name,
        father_name,
        mother_name,
        parents,
        officiant_name,
        godparents,
        certificate_no,
        book_no,
        page_no,
        entry_no,
        notes,
        source_system,
        source_row_id,
        created_at,
        updated_at
      FROM baptism_records
    `;

    const queryParams = [];

    // Add church filter
    const whereConditions = [];
    if (churchId) {
      whereConditions.push('church_id = ?');
      queryParams.push(churchId);
    }

    // Add search filter
    if (whereSql) {
      whereConditions.push(`(${whereSql})`);
      queryParams.push(...whereParams);
    }

    // Combine WHERE conditions
    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
      countSql += whereClause;
      dataSql += whereClause;
    }

    // Add sorting
    dataSql += ` ORDER BY ${sortColumn} ${sortDirection.toUpperCase()}`;

    // Add pagination
    dataSql += ` LIMIT ? OFFSET ?`;
    const dataParams = [...queryParams, pageSizeNum, offset];

    // Get database connection
    // NOTE: You'll need to adapt this to your actual DB connection method
    const db = req.db || req.app.locals.db;
    
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Execute count query
    const countResult = await db.query(countSql, queryParams);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSizeNum);

    // Execute data query
    const rows = await db.query(dataSql, dataParams);

    // Log query for debugging (remove in production or use proper logger)
    console.log('🔍 Power Search Query:', {
      query: q,
      churchId,
      page: pageNum,
      pageSize: pageSizeNum,
      sortBy: sortColumn,
      sortDir: sortDirection,
      whereSql,
      whereParams,
      total,
      returned: rows.length,
      warnings
    });

    // Return response
    res.json({
      success: true,
      rows,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages,
      applied: {
        query: q,
        parsedSummary: summary,
        sortBy: sortColumn,
        sortDir: sortDirection,
        churchId
      },
      warnings
    });

  } catch (error) {
    console.error('❌ Power Search Error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/records/baptism/:id
 * Get a single baptism record by ID
 */
router.get('/baptism/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { churchId: queryChurchId } = req.query;

    let churchId = queryChurchId ? parseInt(queryChurchId, 10) : null;
    if (!churchId && req.user?.church_id) {
      churchId = req.user.church_id;
    }

    const db = req.db || req.app.locals.db;
    
    let sql = 'SELECT * FROM baptism_records WHERE id = ?';
    const params = [id];

    if (churchId) {
      sql += ' AND church_id = ?';
      params.push(churchId);
    }

    const rows = await db.query(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }

    res.json({
      success: true,
      record: rows[0]
    });

  } catch (error) {
    console.error('❌ Get Record Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch record',
      message: error.message
    });
  }
});

module.exports = router;
