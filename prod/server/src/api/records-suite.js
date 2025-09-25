const express = require('express');
const mysql = require('mysql2/promise');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const { getAppPool } = require('../../config/db-compat');

const router = express.Router();

// Validation schemas
const churchIdSchema = z.string().regex(/^[0-9]{1,6}$/, 'Church ID must be 1-6 digits');
const tableNameSchema = z.string().regex(/^[A-Za-z0-9_]+_records$/, 'Table name must end with _records');

/**
 * GET /api/records-suite/:churchId/tables
 * List all *_records tables for a specific church database
 */
router.get('/:churchId/tables', requireAuth, async (req, res) => {
  try {
    const churchId = churchIdSchema.parse(req.params.churchId);
    
    // For super_admin only
    if (req.session.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Super admin required.'
      });
    }

    const churchDbName = `om_church_${churchId}`;
    
    // Get all tables ending with _records from the church database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: churchDbName
    });

    const [tables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? 
        AND table_name LIKE '%_records'
      ORDER BY table_name
    `, [churchDbName]);

    await connection.end();

    const tableNames = tables.map(t => t.table_name);

    res.json({
      success: true,
      data: {
        churchId,
        tables: tableNames,
        count: tableNames.length
      }
    });

  } catch (error) {
    console.error('Error fetching tables:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid church ID format',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch tables',
      message: error.message
    });
  }
});

/**
 * GET /api/records-suite/:churchId/:table/columns
 * Get column information for a specific records table
 */
router.get('/:churchId/:table/columns', requireAuth, async (req, res) => {
  try {
    const churchId = churchIdSchema.parse(req.params.churchId);
    const tableName = tableNameSchema.parse(req.params.table);
    
    if (req.session.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Super admin required.'
      });
    }

    const churchDbName = `om_church_${churchId}`;
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: churchDbName
    });

    // Get column information from INFORMATION_SCHEMA
    const [columns] = await connection.execute(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        column_comment,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_schema = ? 
        AND table_name = ?
      ORDER BY ordinal_position
    `, [churchDbName, tableName]);

    await connection.end();

    // Transform columns to include labels and hide ID field
    const transformedColumns = columns.map(col => ({
      name: col.column_name,
      type: col.data_type,
      label: getFieldLabel(churchId, tableName, col.column_name, col.ordinal_position),
      hidden: col.column_name === 'id', // Always hide ID field
      nullable: col.is_nullable === 'YES',
      defaultValue: col.column_default,
      comment: col.column_comment,
      order: col.ordinal_position
    }));

    res.json({
      success: true,
      data: {
        churchId,
        tableName,
        columns: transformedColumns
      }
    });

  } catch (error) {
    console.error('Error fetching columns:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch columns',
      message: error.message
    });
  }
});

/**
 * GET /api/records-suite/:churchId/:table
 * Get records from a specific table with pagination and search
 */
router.get('/:churchId/:table', requireAuth, async (req, res) => {
  try {
    const churchId = churchIdSchema.parse(req.params.churchId);
    const tableName = tableNameSchema.parse(req.params.table);
    
    if (req.session.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Super admin required.'
      });
    }

    // Parse query parameters
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';
    const orderBy = req.query.orderBy || 'id';
    const orderDir = req.query.orderDir === 'desc' ? 'DESC' : 'ASC';

    const churchDbName = `om_church_${churchId}`;
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: churchDbName
    });

    // Build WHERE clause for search (search in first N text-like columns)
    let whereClause = '';
    let searchParams = [];

    if (search.trim()) {
      // Get text-like columns for search
      const [textColumns] = await connection.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = ? 
          AND table_name = ?
          AND data_type IN ('varchar', 'text', 'char', 'mediumtext', 'longtext')
        ORDER BY ordinal_position
        LIMIT 5
      `, [churchDbName, tableName]);

      if (textColumns.length > 0) {
        const searchConditions = textColumns.map(col => `${col.column_name} LIKE ?`);
        whereClause = `WHERE ${searchConditions.join(' OR ')}`;
        searchParams = textColumns.map(() => `%${search}%`);
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;
    const [countResult] = await connection.execute(countQuery, searchParams);
    const totalRecords = countResult[0].total;

    // Get records with pagination
    const dataQuery = `
      SELECT * FROM ${tableName} 
      ${whereClause} 
      ORDER BY ${orderBy} ${orderDir} 
      LIMIT ? OFFSET ?
    `;
    const [records] = await connection.execute(dataQuery, [...searchParams, limit, offset]);

    await connection.end();

    res.json({
      success: true,
      data: {
        churchId,
        tableName,
        records,
        pagination: {
          limit,
          offset,
          total: totalRecords,
          pages: Math.ceil(totalRecords / limit),
          currentPage: Math.floor(offset / limit) + 1
        },
        search: search || null
      }
    });

  } catch (error) {
    console.error('Error fetching records:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch records',
      message: error.message
    });
  }
});

/**
 * GET /api/records-suite/templates
 * Get all available record display templates
 */
router.get('/templates', requireAuth, async (req, res) => {
  try {
    if (req.session.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Super admin required.'
      });
    }

    const connection = getAppPool();
    
    const [templates] = await connection.execute(`
      SELECT 
        template_id,
        name,
        description,
        category,
        theme_vars,
        css_content,
        is_published,
        version,
        created_by,
        created_at,
        updated_at
      FROM om_records_templates 
      WHERE is_published = true
      ORDER BY category, name
    `);

    // Parse JSON fields
    const processedTemplates = templates.map(template => ({
      ...template,
      theme_vars: typeof template.theme_vars === 'string' 
        ? JSON.parse(template.theme_vars) 
        : template.theme_vars
    }));

    res.json({
      success: true,
      data: {
        templates: processedTemplates,
        count: processedTemplates.length
      }
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
      message: error.message
    });
  }
});

/**
 * Helper function to get field label (either custom or generated)
 */
function getFieldLabel(churchId, tableName, fieldName, ordinalPosition) {
  // In a real implementation, this would query om_field_maps table
  // For now, return a sensible default
  if (fieldName === 'id') return 'ID';
  
  // Convert snake_case to Title Case
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * POST /api/records-suite/parish-profile
 * Save parish customization profile
 */
router.post('/parish-profile', requireAuth, async (req, res) => {
  try {
    if (req.session.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Super admin required.'
      });
    }

    const { churchId, templateId, customThemeVars, customCss } = req.body;
    
    const validatedChurchId = churchIdSchema.parse(churchId);

    const connection = getAppPool();

    await connection.execute(`
      INSERT INTO om_parish_record_profiles 
        (church_id, template_id, custom_theme_vars, custom_css, is_active)
      VALUES (?, ?, ?, ?, true)
      ON DUPLICATE KEY UPDATE
        template_id = VALUES(template_id),
        custom_theme_vars = VALUES(custom_theme_vars),
        custom_css = VALUES(custom_css),
        updated_at = CURRENT_TIMESTAMP
    `, [
      validatedChurchId,
      templateId,
      JSON.stringify(customThemeVars || {}),
      customCss || ''
    ]);

    res.json({
      success: true,
      message: 'Parish profile saved successfully',
      data: { churchId: validatedChurchId }
    });

  } catch (error) {
    console.error('Error saving parish profile:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid church ID format',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to save parish profile',
      message: error.message
    });
  }
});

module.exports = router;