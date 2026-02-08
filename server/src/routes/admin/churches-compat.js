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
 * Returns record settings (placeholder for now)
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
    // Placeholder - return empty object for now
    res.json(ApiResponse(true, {}));
  } catch (error) {
    console.error('❌ Error fetching record-settings:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch record-settings',
      code: 'DATABASE_ERROR'
    }));
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

// Note: No catch-all here - let requests fall through to main churches router
// This ensures compatibility routes don't block existing routes

module.exports = router;
