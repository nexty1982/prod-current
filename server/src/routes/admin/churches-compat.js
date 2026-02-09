/**
 * Compatibility Router for Legacy Admin Church Routes
 * Maps legacy frontend paths to canonical record-table-config endpoint
 * 
 * CANONICAL ENDPOINT:
 * - GET /api/admin/churches/:id/record-table-config?table=<table>
 *   Returns: { churchId, schemaName, table, tables, columns, schema, defaults }
 * 
 * LEGACY ENDPOINTS (forward to canonical logic):
 * - /api/admin/churches/:id/tables → list tables
 * - /api/admin/churches/:id/tables/:table → full canonical bundle
 * - /api/admin/churches/:id/tables/:table/columns → columns only
 * - /api/admin/church/:id/tables/:table/columns → columns only (singular path)
 * - /api/admin/churches/:id/schema?table=... → schema info
 * - /api/admin/churches/:id/table-columns?table=... → table columns
 * - /api/admin/churches/:id/columns?table=... → table columns
 * - /api/admin/churches/:id/_records/columns?table=... → legacy alias
 * 
 * All routes use centralized service helpers from recordTableConfigService
 * All routes require authentication and admin/super_admin/church_admin role
 */

const express = require('express');
const { getAppPool } = require('../../config/db-compat');
const { requireAuth, requireRole } = require('../../middleware/auth');
const ApiResponse = require('../../utils/apiResponse');
const recordTableConfigService = require('../../services/recordTableConfig');

const router = express.Router();

// Middleware to check if user is admin or super_admin
const requireChurchAccess = requireRole(['admin', 'super_admin', 'manager']);

/**
 * Validate church access for user
 */
function validateChurchAccess(user, churchId = null) {
  if (user.role === 'super_admin') {
    return { allowed: true };
  }
  if (user.role === 'admin') {
    if (!churchId) {
      return { allowed: true, church_id: user.church_id };
    }
    if (!user.church_id) {
      return { allowed: false, reason: 'Admin user has no church assignment' };
    }
    if (parseInt(churchId) !== user.church_id) {
      return { allowed: false, reason: 'Access denied to church outside your assignment' };
    }
    return { allowed: true, church_id: user.church_id };
  }
  if (user.role === 'church_admin') {
    if (!churchId) {
      return { allowed: true, church_id: user.church_id };
    }
    if (!user.church_id) {
      return { allowed: false, reason: 'Manager user has no church assignment' };
    }
    if (parseInt(churchId) !== user.church_id) {
      return { allowed: false, reason: 'Access denied to church outside your assignment' };
    }
    return { allowed: true, church_id: user.church_id };
  }
  return { allowed: false, reason: 'Insufficient role for church management' };
}

/**
 * Helper to get church database schema name (delegates to service)
 * @deprecated Use recordTableConfigService.getChurchSchemaName instead
 */
async function getChurchSchema(churchId) {
  return await recordTableConfigService.getChurchSchemaName(churchId);
}

/**
 * Validate table name (delegates to service)
 * @deprecated Use recordTableConfigService.validateTableName instead
 */
function validateTableName(tableName) {
  return recordTableConfigService.validateTableName(tableName);
}

/**
 * GET /api/admin/churches/:id/tables
 * Get list of tables for a church database
 * Uses service helper for consistency
 */
router.get('/:id/tables', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);

    // Validate churchId is numeric
    if (isNaN(churchId) || churchId <= 0) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Invalid church ID',
        code: 'INVALID_PARAMETER'
      }));
    }

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    const schemaName = await recordTableConfigService.getChurchSchemaName(churchId);
    if (!schemaName) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    // Get list of tables using service
    const tables = await recordTableConfigService.listChurchTables(churchId);

    res.json(ApiResponse(true, {
      tables: tables.map(name => ({
        name,
        type: 'BASE TABLE'
      })),
      database: schemaName
    }));

  } catch (error) {
    console.error('❌ Error fetching tables:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch tables',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

/**
 * GET /api/admin/churches/:id/tables/:table/columns
 * Legacy endpoint - forwards to canonical record-table-config
 */
router.get('/:id/tables/:table/columns', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const tableName = req.params.table;

    // Validate churchId is numeric
    if (isNaN(churchId) || churchId <= 0) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Invalid church ID',
        code: 'INVALID_PARAMETER'
      }));
    }

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    // Forward to canonical endpoint logic
    const schemaName = await recordTableConfigService.getChurchSchemaName(churchId);
    if (!schemaName) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    // Validate table name
    if (!recordTableConfigService.validateTableName(tableName)) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Invalid table name',
        code: 'INVALID_PARAMETER',
        table: tableName
      }));
    }

    // Get columns using service
    const columns = await recordTableConfigService.getTableColumns(churchId, tableName);
    if (!columns) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Table not found',
        code: 'TABLE_NOT_FOUND',
        table: tableName
      }));
    }

    // Return legacy format (columns array + table + database)
    res.json(ApiResponse(true, {
      columns,
      table: tableName,
      database: schemaName
    }));

  } catch (error) {
    console.error('❌ Error fetching columns:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch columns',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

/**
 * GET /api/admin/churches/:id/schema
 * Get schema information (tables and columns) for a church database
 * Query param: ?table=tableName (optional, filters to specific table)
 */
router.get('/:id/schema', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const tableName = req.query.table;

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    const schemaName = await getChurchSchema(churchId);
    if (!schemaName) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    if (tableName) {
      // Return schema for specific table
      const [columns] = await getAppPool().query(
        `SHOW COLUMNS FROM \`${schemaName}\`.\`${tableName}\``
      );

      if (columns.length === 0) {
        return res.status(404).json(ApiResponse(false, null, {
          message: 'Table not found',
          code: 'TABLE_NOT_FOUND',
          table: tableName
        }));
      }

      res.json(ApiResponse(true, {
        table: tableName,
        columns: columns.map((c, idx) => ({
          name: c.Field,
          position: idx + 1,
          type: c.Type,
          nullable: c.Null === 'YES',
          default: c.Default,
          key: c.Key,
          extra: c.Extra
        })),
        database: schemaName
      }));
    } else {
      // Return all tables with their columns
      const [tables] = await getAppPool().query(
        `SHOW TABLES FROM \`${schemaName}\``
      );

      const schema = {};
      for (const table of tables) {
        const tableName = Object.values(table)[0];
        const [columns] = await getAppPool().query(
          `SHOW COLUMNS FROM \`${schemaName}\`.\`${tableName}\``
        );

        schema[tableName] = columns.map((c, idx) => ({
          name: c.Field,
          position: idx + 1,
          type: c.Type,
          nullable: c.Null === 'YES',
          default: c.Default,
          key: c.Key,
          extra: c.Extra
        }));
      }

      res.json(ApiResponse(true, {
        schema,
        database: schemaName
      }));
    }

  } catch (error) {
    console.error('❌ Error fetching schema:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch schema',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

/**
 * GET /api/admin/churches/:id/_baptism_records
 * Legacy endpoint - returns field-mapper data for baptism_records
 * Reuses field-mapper logic from churches.js
 */
router.get('/:id/_baptism_records', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const tableName = 'baptism_records';

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    const schemaName = await recordTableConfigService.getChurchSchemaName(churchId);
    if (!schemaName) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    // Get table columns using service
    const columns = await recordTableConfigService.getTableColumns(churchId, tableName);
    if (!columns) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Table not found',
        code: 'TABLE_NOT_FOUND',
        table: tableName
      }));
    }

    // Get existing field mapper settings
    const [settings] = await getAppPool().query(
      `SELECT mappings, field_settings 
       FROM orthodoxmetrics_db.field_mapper_settings 
       WHERE church_id = ? AND table_name = ?`,
      [churchId, tableName]
    );

    const existingSettings = settings.length > 0 ? settings[0] : null;
    const mappings = existingSettings?.mappings ? JSON.parse(existingSettings.mappings) : {};
    const fieldSettings = existingSettings?.field_settings ? JSON.parse(existingSettings.field_settings) : {
      visibility: {},
      sortable: {},
      default_sort_field: null,
      default_sort_direction: 'asc'
    };

    res.json(ApiResponse(true, {
      columns: columns.map((c, idx) => ({
        column_name: c.name,
        ordinal_position: c.position
      })),
      mappings: mappings,
      field_settings: fieldSettings
    }));

  } catch (error) {
    console.error('❌ Error fetching _baptism_records:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch baptism records data',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

/**
 * GET /api/admin/churches/:id/_records/columns
 * Legacy endpoint - uses service helpers
 * Query param: ?table=tableName (required)
 */
router.get('/:id/_records/columns', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const tableName = req.query.table;

    if (!tableName) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Table name required',
        code: 'MISSING_PARAMETER',
        parameter: 'table'
      }));
    }

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    const schemaName = await recordTableConfigService.getChurchSchemaName(churchId);
    if (!schemaName) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    if (!recordTableConfigService.validateTableName(tableName)) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Invalid table name',
        code: 'INVALID_PARAMETER',
        table: tableName
      }));
    }

    const columns = await recordTableConfigService.getTableColumns(churchId, tableName);
    if (!columns) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Table not found',
        code: 'TABLE_NOT_FOUND',
        table: tableName
      }));
    }

    res.json(ApiResponse(true, {
      columns,
      table: tableName,
      database: schemaName
    }));

  } catch (error) {
    console.error('❌ Error fetching _records/columns:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch columns',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

/**
 * GET /api/admin/churches/:id/columns
 * Legacy endpoint - uses service helpers
 * Query param: ?table=tableName (required)
 */
router.get('/:id/columns', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const tableName = req.query.table;

    if (!tableName) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Table name required',
        code: 'MISSING_PARAMETER',
        parameter: 'table'
      }));
    }

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    const schemaName = await recordTableConfigService.getChurchSchemaName(churchId);
    if (!schemaName) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    if (!recordTableConfigService.validateTableName(tableName)) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Invalid table name',
        code: 'INVALID_PARAMETER',
        table: tableName
      }));
    }

    const columns = await recordTableConfigService.getTableColumns(churchId, tableName);
    if (!columns) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Table not found',
        code: 'TABLE_NOT_FOUND',
        table: tableName
      }));
    }

    res.json(ApiResponse(true, {
      columns,
      table: tableName,
      database: schemaName
    }));
  } catch (error) {
    console.error('❌ Error fetching columns:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch columns',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

/**
 * GET /api/admin/churches/:id/table-columns
 * Legacy endpoint - uses service helpers
 * Query param: ?table=tableName (required)
 */
router.get('/:id/table-columns', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const tableName = req.query.table;

    if (!tableName) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Table name required',
        code: 'MISSING_PARAMETER',
        parameter: 'table'
      }));
    }

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    const schemaName = await recordTableConfigService.getChurchSchemaName(churchId);
    if (!schemaName) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    if (!recordTableConfigService.validateTableName(tableName)) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Invalid table name',
        code: 'INVALID_PARAMETER',
        table: tableName
      }));
    }

    const columns = await recordTableConfigService.getTableColumns(churchId, tableName);
    if (!columns) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Table not found',
        code: 'TABLE_NOT_FOUND',
        table: tableName
      }));
    }

    res.json(ApiResponse(true, {
      columns,
      table: tableName,
      database: schemaName
    }));
  } catch (error) {
    console.error('❌ Error fetching table-columns:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch columns',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

/**
 * GET /api/admin/churches/:id/record-settings
 * Returns record display settings from orthodoxmetrics_db.church_record_settings
 */
router.get('/:id/record-settings', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS'
      }));
    }

    // Ensure table exists
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.church_record_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        settings JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church (church_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [rows] = await getAppPool().query(
      'SELECT settings FROM orthodoxmetrics_db.church_record_settings WHERE church_id = ?',
      [churchId]
    );

    const settings = rows.length > 0 && rows[0].settings ? JSON.parse(rows[0].settings) : {};
    res.json({ success: true, settings });
  } catch (error) {
    console.error('❌ Error fetching record-settings:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch record-settings',
      code: 'DATABASE_ERROR'
    }));
  }
});

/**
 * POST /api/admin/churches/:id/record-settings
 * Save record display settings to orthodoxmetrics_db.church_record_settings
 * Accepts multipart/form-data (for logo uploads) or JSON body
 */
router.post('/:id/record-settings', requireAuth, requireChurchAccess, async (req, res) => {
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');
  const uploadDir = path.resolve(__dirname, '../../../uploads/record-settings');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (r, f, cb) => cb(null, uploadDir),
    filename: (r, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  });
  const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

  upload.single('logo')(req, res, async (uploadErr) => {
    try {
      if (uploadErr) {
        return res.status(400).json(ApiResponse(false, null, { message: uploadErr.message, code: 'UPLOAD_ERROR' }));
      }
      const churchId = parseInt(req.params.id);
      const access = validateChurchAccess(req.user, churchId);
      if (!access.allowed) {
        return res.status(403).json(ApiResponse(false, null, { message: 'Access denied', code: 'INSUFFICIENT_PERMISSIONS' }));
      }

      // Build settings from body (form fields or JSON)
      let settings = {};
      if (req.body.settings && typeof req.body.settings === 'string') {
        settings = JSON.parse(req.body.settings);
      } else if (req.body && typeof req.body === 'object') {
        const { settings: s, ...rest } = req.body;
        settings = s ? (typeof s === 'string' ? JSON.parse(s) : s) : rest;
      }

      // If a logo file was uploaded, merge the path into the logo settings object
      if (req.file) {
        const logoPath = `/uploads/record-settings/${req.file.filename}`;
        if (settings.logo && typeof settings.logo === 'object') {
          settings.logo.url = logoPath;
        } else {
          settings.logo = { url: logoPath };
        }
      }

      // Ensure table exists
      await getAppPool().query(`
        CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.church_record_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          church_id INT NOT NULL,
          settings JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_church (church_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await getAppPool().query(`
        INSERT INTO orthodoxmetrics_db.church_record_settings (church_id, settings)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE settings = VALUES(settings), updated_at = CURRENT_TIMESTAMP
      `, [churchId, JSON.stringify(settings)]);

      res.json(ApiResponse(true, { message: 'Record settings saved successfully', church_id: churchId }));
    } catch (error) {
      console.error('❌ Error saving record-settings:', error);
      res.status(500).json(ApiResponse(false, null, { message: 'Failed to save record-settings', code: 'DATABASE_ERROR' }));
    }
  });
});

/**
 * POST /api/admin/churches/:id/record-images
 * Upload record images (header images, backgrounds, etc.)
 */
router.post('/:id/record-images', requireAuth, requireChurchAccess, async (req, res) => {
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');
  const churchId = parseInt(req.params.id);
  const uploadDir = path.resolve(__dirname, `../../../uploads/churches/${churchId}/record-images`);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (r, f, cb) => cb(null, uploadDir),
    filename: (r, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  });
  const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

  upload.single('image')(req, res, async (uploadErr) => {
    try {
      if (uploadErr) {
        return res.status(400).json(ApiResponse(false, null, { message: uploadErr.message, code: 'UPLOAD_ERROR' }));
      }
      if (!req.file) {
        return res.status(400).json(ApiResponse(false, null, { message: 'No image file provided', code: 'NO_FILE' }));
      }
      const imageType = req.body.type || 'general';
      const imagePath = `/uploads/churches/${churchId}/record-images/${req.file.filename}`;

      console.log(`📸 Record image uploaded for church ${churchId}: ${imageType} → ${imagePath}`);
      res.json(ApiResponse(true, {
        message: 'Image uploaded successfully',
        path: imagePath,
        type: imageType,
        filename: req.file.filename,
        size: req.file.size
      }));
    } catch (error) {
      console.error('❌ Error uploading record image:', error);
      res.status(500).json(ApiResponse(false, null, { message: 'Failed to upload image', code: 'UPLOAD_ERROR' }));
    }
  });
});

/**
 * GET /api/admin/churches/:id/dynamic-records-config
 * Returns dynamic records configuration for a church (branding, themes, field rules, button configs)
 */
router.get('/:id/dynamic-records-config', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, { message: 'Access denied', code: 'INSUFFICIENT_PERMISSIONS' }));
    }

    // Ensure table exists
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.church_dynamic_records_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        config JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church (church_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [rows] = await getAppPool().query(
      'SELECT config_json FROM orthodoxmetrics_db.church_dynamic_records_config WHERE church_id = ?',
      [churchId]
    );

    const config = rows.length > 0 && rows[0].config_json ? JSON.parse(rows[0].config_json) : {};
    res.json({ success: true, config, church_id: churchId });
  } catch (error) {
    console.error('❌ Error fetching dynamic-records-config:', error);
    res.status(500).json(ApiResponse(false, null, { message: 'Failed to fetch config', code: 'DATABASE_ERROR' }));
  }
});

/**
 * POST /api/admin/churches/:id/dynamic-records-config
 * Save dynamic records configuration for a church (branding, themes, field rules, button configs)
 */
router.post('/:id/dynamic-records-config', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, { message: 'Access denied', code: 'INSUFFICIENT_PERMISSIONS' }));
    }

    const { config } = req.body;
    if (!config || typeof config !== 'object') {
      return res.status(400).json(ApiResponse(false, null, { message: 'Config object required', code: 'MISSING_PARAMETER' }));
    }

    // Ensure table exists
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.church_dynamic_records_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        config JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church (church_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await getAppPool().query(`
      INSERT INTO orthodoxmetrics_db.church_dynamic_records_config (church_id, config_json)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE config_json = VALUES(config_json), updated_at = CURRENT_TIMESTAMP
    `, [churchId, JSON.stringify(config)]);

    console.log(`✅ Dynamic records config saved for church ${churchId}`);
    res.json(ApiResponse(true, { message: 'Dynamic records config saved successfully', church_id: churchId }));
  } catch (error) {
    console.error('❌ Error saving dynamic-records-config:', error);
    res.status(500).json(ApiResponse(false, null, { message: 'Failed to save config', code: 'DATABASE_ERROR' }));
  }
});

/**
 * POST /api/admin/churches/:id/export-template
 * Export current field mapper configuration as a global template
 */
router.post('/:id/export-template', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, { message: 'Access denied', code: 'INSUFFICIENT_PERMISSIONS' }));
    }

    const { table, language, template_slug, template_name, overwrite } = req.body;
    if (!table || !template_slug) {
      return res.status(400).json(ApiResponse(false, null, { message: 'table and template_slug are required', code: 'MISSING_PARAMETER' }));
    }

    // Get the record type from table name
    const recordType = table.replace('_records', '') || 'custom';

    // Get existing field mapper settings for this church+table
    const [settings] = await getAppPool().query(
      'SELECT mappings, field_settings FROM orthodoxmetrics_db.field_mapper_settings WHERE church_id = ? AND table_name = ?',
      [churchId, table]
    );

    const mappings = settings.length > 0 && settings[0].mappings ? JSON.parse(settings[0].mappings) : {};
    const fieldSettings = settings.length > 0 && settings[0].field_settings ? JSON.parse(settings[0].field_settings) : {};

    // Build template fields from mappings
    const fields = Object.entries(mappings).map(([columnName, displayName]) => ({
      column_name: columnName,
      display_name: displayName,
      visible: fieldSettings.visibility ? fieldSettings.visibility[columnName] !== false : true,
      sortable: fieldSettings.sortable ? fieldSettings.sortable[columnName] !== false : true,
    }));

    // Ensure templates table exists
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.record_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        record_type VARCHAR(50) NOT NULL DEFAULT 'custom',
        description TEXT,
        fields JSON,
        grid_type VARCHAR(50) DEFAULT 'standard',
        theme VARCHAR(100),
        layout_type VARCHAR(50) DEFAULT 'default',
        language_support JSON,
        is_editable BOOLEAN DEFAULT TRUE,
        church_id INT DEFAULT NULL,
        is_global BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Check if template already exists
    const [existing] = await getAppPool().query(
      'SELECT id FROM orthodoxmetrics_db.record_templates WHERE slug = ?',
      [template_slug]
    );

    if (existing.length > 0 && !overwrite) {
      return res.status(409).json(ApiResponse(false, null, {
        message: `Template "${template_slug}" already exists. Enable overwrite to update it.`,
        code: 'TEMPLATE_EXISTS'
      }));
    }

    if (existing.length > 0 && overwrite) {
      await getAppPool().query(`
        UPDATE orthodoxmetrics_db.record_templates 
        SET name = ?, record_type = ?, fields = ?, language_support = ?, is_global = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE slug = ?
      `, [template_name || template_slug, recordType, JSON.stringify(fields), JSON.stringify({ primary: language || 'en' }), template_slug]);
    } else {
      await getAppPool().query(`
        INSERT INTO orthodoxmetrics_db.record_templates (slug, name, record_type, fields, language_support, is_global)
        VALUES (?, ?, ?, ?, ?, TRUE)
      `, [template_slug, template_name || template_slug, recordType, JSON.stringify(fields), JSON.stringify({ primary: language || 'en' })]);
    }

    console.log(`✅ Template exported: ${template_slug} for church ${churchId}`);
    res.json(ApiResponse(true, {
      message: overwrite && existing.length > 0 ? 'Template updated successfully' : 'Template created successfully',
      slug: template_slug,
    }));
  } catch (error) {
    console.error('❌ Error exporting template:', error);
    res.status(500).json(ApiResponse(false, null, { message: 'Failed to export template', code: 'DATABASE_ERROR' }));
  }
});

/**
 * GET /api/admin/churches/:id/tables/:table
 * Preferred endpoint for Field Mapper. Returns full bundle including columns and explicit endpoints.
 */
router.get('/:id/tables/:table', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const tableName = req.params.table;

    if (isNaN(churchId) || churchId <= 0) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Invalid church ID',
        code: 'INVALID_PARAMETER'
      }));
    }

    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    const bundle = await recordTableConfigService.getRecordTableBundle(churchId, tableName);
    if (bundle === null) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Table not found',
        code: 'TABLE_NOT_FOUND',
        table: tableName
      }));
    }

    res.json(ApiResponse(true, bundle));

  } catch (error) {
    console.error('❌ Error fetching table info:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch table info',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

/**
 * CANONICAL ENDPOINT
 * GET /api/admin/churches/:churchId/record-table-config?table=<table>
 * Returns all data needed for field-mapper and grids
 */
router.get('/:id/record-table-config', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const tableName = req.query.table;

    // Validate churchId is numeric
    if (isNaN(churchId) || churchId <= 0) {
      return res.status(400).json(ApiResponse(false, null, {
        message: 'Invalid church ID',
        code: 'INVALID_PARAMETER'
      }));
    }

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    // Use canonical helper function
    const config = await recordTableConfigService.getRecordTableConfig(churchId, tableName || null);

    if (config === null) {
      if (tableName) {
        return res.status(404).json(ApiResponse(false, null, {
          message: 'Table not found',
          code: 'TABLE_NOT_FOUND',
          table: tableName
        }));
      } else {
        return res.status(404).json(ApiResponse(false, null, {
          message: 'Church not found',
          code: 'CHURCH_NOT_FOUND'
        }));
      }
    }

    // Return canonical response
    res.json(ApiResponse(true, config));

  } catch (error) {
    console.error('❌ Error in record-table-config:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch record table configuration',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// ============================================================================
// CHURCH USERS COMPATIBILITY ROUTES
// Frontend calls /api/admin/churches/:id/users but backend has /api/admin/church-users/:id
// ============================================================================

/**
 * GET /api/admin/churches/:id/users
 * Get users assigned to a church
 */
router.get('/:id/users', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    console.log('👥 Getting users for church ID:', churchId);

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    // Query users from orthodoxmetrics_db.users WHERE church_id matches
    const [users] = await getAppPool().query(`
      SELECT
        id,
        email,
        first_name,
        last_name,
        role,
        is_active,
        last_login,
        created_at,
        updated_at,
        phone
      FROM orthodoxmetrics_db.users
      WHERE church_id = ?
      ORDER BY created_at DESC
    `, [churchId]);

    res.json({
      success: true,
      users: users,
      count: users.length
    });

  } catch (error) {
    console.error('❌ Error getting church users:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch church users',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

/**
 * POST /api/admin/churches/:id/users
 * Add new user to church
 */
router.post('/:id/users', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const { email, first_name, last_name, role, is_active = true, phone, password } = req.body;

    console.log('👤 Adding new user to church ID:', churchId);

    if (!email || !first_name || !last_name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, first_name, last_name, role'
      });
    }

    // Map frontend role values to database ENUM values
    // Database ENUM: 'super_admin', 'admin', 'manager', 'user', 'viewer'
    const roleMapping = {
      'church_admin': 'admin',
      'priest': 'user',
      'deacon': 'user',
      'editor': 'user',
      'viewer': 'viewer',
      'manager': 'manager',
      'admin': 'admin',
      'super_admin': 'super_admin',
      'user': 'user'
    };

    const dbRole = roleMapping[role] || 'user';
    console.log(`📋 Role mapping: ${role} -> ${dbRole}`);

    // Check if user already exists
    const [existingUsers] = await getAppPool().query(
      'SELECT id FROM orthodoxmetrics_db.users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate password if not provided
    const bcrypt = require('bcrypt');
    const tempPassword = password || Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Insert user
    const [result] = await getAppPool().query(`
      INSERT INTO orthodoxmetrics_db.users
      (email, first_name, last_name, phone, role, is_active, password_hash, church_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [email, first_name, last_name, phone || null, dbRole, is_active ? 1 : 0, hashedPassword, churchId]);

    const newUserId = result.insertId;

    // Also add to church_users junction table if it exists
    try {
      await getAppPool().query(
        'INSERT INTO orthodoxmetrics_db.church_users (church_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
        [churchId, newUserId, role]
      );
    } catch (junctionError) {
      console.warn('⚠️ Could not add to church_users junction table:', junctionError.message);
    }

    console.log(`✅ User created: ${email} for church ${churchId}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user_id: newUserId,
      tempPassword: password ? undefined : tempPassword
    });

  } catch (error) {
    console.error('❌ Error adding user to church:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/churches/:id/users/:userId
 * Update church user
 */
router.put('/:id/users/:userId', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    const { email, first_name, last_name, role, is_active, phone, password } = req.body;

    console.log('👤 Updating user ID:', userId, 'in church ID:', churchId);

    // Check user exists
    const [existingUsers] = await getAppPool().query(
      'SELECT id FROM orthodoxmetrics_db.users WHERE id = ?',
      [userId]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    if (first_name !== undefined) { updates.push('first_name = ?'); values.push(first_name); }
    if (last_name !== undefined) { updates.push('last_name = ?'); values.push(last_name); }
    if (role !== undefined) { updates.push('role = ?'); values.push(role); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (password) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push('updated_at = NOW()');
    values.push(userId);

    await getAppPool().query(
      `UPDATE orthodoxmetrics_db.users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating church user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/churches/:id/users/:userId/reset-password
 * Reset user password
 */
router.post('/:id/users/:userId/reset-password', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Generate new password
    const bcrypt = require('bcrypt');
    const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await getAppPool().query(
      'UPDATE orthodoxmetrics_db.users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({
      success: true,
      message: 'Password reset successfully',
      newPassword: newPassword
    });

  } catch (error) {
    console.error('❌ Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/churches/:id/users/:userId/activate
 * Activate user account
 */
router.post('/:id/users/:userId/activate', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    await getAppPool().query(
      'UPDATE orthodoxmetrics_db.users SET is_active = 1, updated_at = NOW() WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'User activated successfully'
    });

  } catch (error) {
    console.error('❌ Error activating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate user'
    });
  }
});

/**
 * POST /api/admin/churches/:id/users/:userId/deactivate
 * Deactivate user account
 */
router.post('/:id/users/:userId/deactivate', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    await getAppPool().query(
      'UPDATE orthodoxmetrics_db.users SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('❌ Error deactivating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user'
    });
  }
});

// ============================================================================
// CHURCH DATABASE COMPATIBILITY ROUTES
// Frontend calls /api/admin/churches/:id/database-info but backend has /api/admin/church-database/:id/info
// ============================================================================

/**
 * GET /api/admin/churches/:id/database-info
 * Get comprehensive database information for a church
 */
router.get('/:id/database-info', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    console.log('🗄️ Getting database info for church ID:', churchId);

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS'
      }));
    }

    // Get church with database_name
    const [churches] = await getAppPool().query(
      'SELECT id, name, database_name FROM churches WHERE id = ?',
      [churchId]
    );

    if (churches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Church not found'
      });
    }

    const church = churches[0];
    const database_name = church.database_name || `om_church_${churchId}`;

    // Get database size and table count
    const [dbInfo] = await getAppPool().query(`
      SELECT
        TABLE_SCHEMA as name,
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb,
        COUNT(TABLE_NAME) as table_count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      GROUP BY TABLE_SCHEMA
    `, [database_name]);

    // Get table list
    const [tables] = await getAppPool().query(`
      SELECT
        TABLE_NAME as name,
        TABLE_ROWS as \`rows\`,
        ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `, [database_name]);

    const databaseInfo = {
      name: database_name,
      church_name: church.name,
      size: dbInfo.length > 0 ? `${dbInfo[0].size_mb} MB` : 'N/A',
      size_mb: dbInfo.length > 0 ? dbInfo[0].size_mb : 0,
      table_count: dbInfo.length > 0 ? dbInfo[0].table_count : tables.length,
      tables: tables.map(t => ({
        name: t.name,
        rows: t.rows || 0,
        size_mb: t.size_mb || 0
      }))
    };

    res.json({
      success: true,
      database: databaseInfo
    });

  } catch (error) {
    console.error('❌ Error getting database info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch database info',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/churches/:id/test-connection
 * Test database connection and health
 */
router.post('/:id/test-connection', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    console.log('🔌 Testing database connection for church ID:', churchId);

    // Get church with database_name
    const [churches] = await getAppPool().query(
      'SELECT id, name, database_name FROM churches WHERE id = ?',
      [churchId]
    );

    if (churches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Church not found'
      });
    }

    const church = churches[0];
    const database_name = church.database_name || `om_church_${churchId}`;

    // Test basic connection
    const startTime = Date.now();
    await getAppPool().query('SELECT 1 as test');
    const connectionTime = Date.now() - startTime;

    // Check if database exists
    const [dbExists] = await getAppPool().query(`
      SELECT SCHEMA_NAME
      FROM information_schema.SCHEMATA
      WHERE SCHEMA_NAME = ?
    `, [database_name]);

    // Get database stats
    const [dbStats] = await getAppPool().query(`
      SELECT
        COUNT(TABLE_NAME) as table_count,
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
    `, [database_name]);

    res.json({
      success: true,
      data: {
        connection: {
          database_name,
          church_name: church.name,
          database_exists: dbExists.length > 0,
          connection_time_ms: connectionTime,
          table_count: dbStats[0]?.table_count || 0,
          size_mb: dbStats[0]?.size_mb || 0,
          status: dbExists.length > 0 ? 'healthy' : 'database_missing',
          tested_at: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ Error testing database connection:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection test failed',
      message: error.message
    });
  }
});

// Note: No catch-all here - let requests fall through to main churches router
// This ensures compatibility routes don't block existing routes

module.exports = router;
