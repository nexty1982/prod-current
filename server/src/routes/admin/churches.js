const express = require('express');
const { getAppPool } = require('../../config/db-compat');
const { requireAuth, requireRole } = require('../../middleware/auth');
const ApiResponse = require('../../utils/apiResponse');

const router = express.Router();

// Middleware to check if user is admin or super_admin
const requireChurchAccess = requireRole(['admin', 'super_admin', 'manager']);

/**
 * Validate church access for user - ensures proper church_id scoping
 */
function validateChurchAccess(user, churchId = null) {
  // Super admins can access all churches
  if (user.role === 'super_admin') {
    return { allowed: true };
  }

  // Admins can access churches (allow access even without church assignment for Records Management)
  if (user.role === 'admin') {
    // If no church_id specified, allow access to see available churches
    if (!churchId) {
      return { allowed: true, church_id: user.church_id };
    }

    // If church_id specified, check if user has access to that specific church
    if (!user.church_id) {
      return { allowed: false, reason: 'Admin user has no church assignment' };
    }
    if (parseInt(churchId) !== user.church_id) {
      return { allowed: false, reason: 'Access denied to church outside your assignment' };
    }
    return { allowed: true, church_id: user.church_id };
  }

  // Managers can access their assigned church only
  if (user.role === 'church_admin') {
    // If no church_id specified, allow access to see their assigned church
    if (!churchId) {
      return { allowed: true, church_id: user.church_id };
    }

    // If church_id specified, check if user has access to that specific church
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

// GET /api/admin/churches/:id/field-mapper - Get field mapper settings for a church table
router.get('/:id/field-mapper', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const tableName = req.query.table || 'baptism_records';

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    // Get church database name
    const [churches] = await getAppPool().query(
      'SELECT database_name FROM churches WHERE id = ? AND is_active = 1',
      [churchId]
    );

    if (churches.length === 0) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    const databaseName = churches[0].database_name || `orthodoxmetrics_ch_${churchId}`;
    const { getChurchDbConnection } = require('../../config/db-compat');
    const churchDbPool = await getChurchDbConnection(databaseName);

    // Get table columns
    const [columns] = await churchDbPool.query(
      `SELECT column_name, ordinal_position 
       FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = ? 
       ORDER BY ordinal_position`,
      [databaseName, tableName]
    );

    // Ensure settings table exists
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.field_mapper_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        table_name VARCHAR(255) NOT NULL,
        mappings JSON,
        field_settings JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church_table (church_id, table_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Get existing field mapper settings from the settings table
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
      columns: columns.map(c => ({
        column_name: c.column_name,
        ordinal_position: c.ordinal_position
      })),
      mappings: mappings,
      field_settings: fieldSettings
    }));

  } catch (error) {
    console.error('❌ Error fetching field mapper:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch field mapper settings',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// POST /api/admin/churches/:id/field-mapper - Save field mapper settings for a church table
router.post('/:id/field-mapper', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const { table, mappings, field_settings } = req.body;
    const tableName = table || 'baptism_records';

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    // Get church database name
    const [churches] = await getAppPool().query(
      'SELECT database_name FROM churches WHERE id = ? AND is_active = 1',
      [churchId]
    );

    if (churches.length === 0) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    // Store field mapper settings in the main database (orthodoxmetrics_db)
    // Create table if it doesn't exist
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.field_mapper_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        table_name VARCHAR(255) NOT NULL,
        mappings JSON,
        field_settings JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church_table (church_id, table_name),
        -- FOREIGN KEY removed - table stores both global (church_id=0) and church-specific themes
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Upsert the settings
    await getAppPool().query(`
      INSERT INTO orthodoxmetrics_db.field_mapper_settings 
        (church_id, table_name, mappings, field_settings)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        mappings = VALUES(mappings),
        field_settings = VALUES(field_settings),
        updated_at = CURRENT_TIMESTAMP
    `, [
      churchId,
      tableName,
      JSON.stringify(mappings || {}),
      JSON.stringify(field_settings || {})
    ]);

    res.json(ApiResponse(true, {
      message: 'Field mapper settings saved successfully',
      church_id: churchId,
      table_name: tableName
    }));

  } catch (error) {
    console.error('❌ Error saving field mapper:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to save field mapper settings',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

module.exports = router;


// GET /api/admin/churches/:id/themes - Get themes for a church
router.get('/themes/global', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    // Get global themes from the themes table (church_id = 0 for global)
    const [themes] = await getAppPool().query(
      `SELECT themes
       FROM orthodoxmetrics_db.church_themes
       WHERE church_id = 0
       LIMIT 1`
    );

    const themesData = themes.length > 0 && themes[0].themes ? JSON.parse(themes[0].themes) : {};

    res.json(ApiResponse(true, {
      themes: themesData
    }));

  } catch (error) {
    console.error('❌ Error fetching global themes:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch global themes',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// POST /api/admin/churches/themes/global - Save global themes
router.post('/themes/global', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const { themes } = req.body;

    // Create table if it doesn't exist
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.church_themes (     
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL DEFAULT 0,
        themes JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church (church_id),
        -- FOREIGN KEY removed - table stores both global (church_id=0) and church-specific themes
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci        
    `);

    // Upsert the global themes (church_id = 0 for global)
    await getAppPool().query(`
      INSERT INTO orthodoxmetrics_db.church_themes
        (church_id, themes)
      VALUES (0, ?)
      ON DUPLICATE KEY UPDATE
        themes = VALUES(themes),
        updated_at = CURRENT_TIMESTAMP
    `, [
      JSON.stringify(themes || {})
    ]);

    res.json(ApiResponse(true, {
      message: 'Global themes saved successfully'
    }));

  } catch (error) {
    console.error('❌ Error saving global themes:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to save global themes',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// GET /api/admin/churches/:id/themes - Get themes for a church
router.get('/:id/themes', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    // Get church database name
    const [churches] = await getAppPool().query(
      'SELECT database_name FROM churches WHERE id = ? AND is_active = 1',      
      [churchId]
    );

    if (churches.length === 0) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    // Get existing themes from the themes table
    const [themes] = await getAppPool().query(
      `SELECT themes
       FROM orthodoxmetrics_db.church_themes
       WHERE church_id = ?`,
      [churchId]
    );

    const themesData = themes.length > 0 && themes[0].themes ? JSON.parse(themes[0].themes) : {};

    res.json(ApiResponse(true, {
      themes: themesData
    }));

  } catch (error) {
    console.error('❌ Error fetching themes:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to fetch themes',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// POST /api/admin/churches/:id/themes - Save themes for a church
router.post('/:id/themes', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const { themes } = req.body;

    // Validate church access
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(ApiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        reason: access.reason
      }));
    }

    // Get church database name
    const [churches] = await getAppPool().query(
      'SELECT database_name FROM churches WHERE id = ? AND is_active = 1',      
      [churchId]
    );

    if (churches.length === 0) {
      return res.status(404).json(ApiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    // Create table if it doesn't exist
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.church_themes (     
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL DEFAULT 0,
        themes JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church (church_id),
        -- FOREIGN KEY removed - table stores both global (church_id=0) and church-specific themes
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci        
    `);

    // Upsert the themes
    await getAppPool().query(`
      INSERT INTO orthodoxmetrics_db.church_themes
        (church_id, themes)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        themes = VALUES(themes),
        updated_at = CURRENT_TIMESTAMP
    `, [
      churchId,
      JSON.stringify(themes || {})
    ]);

    res.json(ApiResponse(true, {
      message: 'Themes saved successfully',
      church_id: churchId
    }));

  } catch (error) {
    console.error('❌ Error saving themes:', error);
    res.status(500).json(ApiResponse(false, null, {
      message: 'Failed to save themes',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});
