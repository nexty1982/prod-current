// routes/admin/churches.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { getAppPool } = require('../../config/db');
// Support both development and production paths
let dbSwitcherModule;
try {
    dbSwitcherModule = require('../../src/utils/dbSwitcher');
} catch (e) {
    dbSwitcherModule = require('../../utils/dbSwitcher');
}
const { getChurchDbConnection } = dbSwitcherModule;

let churchSetupService;
try {
    churchSetupService = require('../../src/services/churchSetupService');
} catch (e) {
    churchSetupService = require('../../services/churchSetupService');
}
const { requireAuth } = require("../../middleware/requireAuth");
const APP_DB = process.env.APP_DB_NAME || 'orthodoxmetrics_db';
// 🔒 Apply authentication to ALL admin church routes
router.use(requireAuth);

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../misc/uploads/church-logos');

    // Use a promise-based wrapper for async/await logic
    (async () => {
      try {
        await fs.mkdir(uploadDir, { recursive: true });

        // Optionally validate the church record
        const churchId = req.body.churchId;
        const [churches] = await getAppPool().query(
          'SELECT * FROM churches WHERE id = ?',
          [churchId]
        );

        if (churches.length === 0) {
          return cb(new Error('Invalid church ID'));
        }

        cb(null, uploadDir);
      } catch (err) {
        cb(err);
      }
    })();
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `church-logo-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * Create a new church instance with optional template setup
 * POST /api/admin/churches
 */
router.post('/', upload.single('logo'), async (req, res) => {
  try {
    const {
      name,
      address,
      city,
      region,
      country,
      phone,
      website,
      preferred_language,
      timezone,
      calendar_type,
      admin_full_name,
      admin_email,
      admin_password,
      admin_title,
      description,
      established_year,
      // New template setup options
      setup_templates = true,
      auto_setup_standard = false,
      generate_components = false,
      record_types = ['baptism', 'marriage', 'funeral'],
      template_style = 'orthodox_traditional'
    } = req.body;

    // Validate required fields
    if (!name || !address || !city || !country || !admin_full_name || !admin_email || !admin_password) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'address', 'city', 'country', 'admin_full_name', 'admin_email', 'admin_password']
      });
    }

    // Duplicate name check (only among active churches)
    const [existingChurches] = await getAppPool().query(
      'SELECT id FROM orthodoxmetrics_db.churches WHERE church_name = ? AND is_active = 1',
      [name]
    );
    if (existingChurches.length > 0) {
      return res.status(400).json({
        error: 'Church name already exists (active church)'
      });
    }
    // Duplicate email check (only among active churches)
    const [existingEmails] = await getAppPool().query(
      'SELECT id FROM orthodoxmetrics_db.churches WHERE admin_email = ? AND is_active = 1',
      [admin_email]
    );
    if (existingEmails.length > 0) {
      return res.status(400).json({
        error: 'Church admin email already exists (active church)'
      });
    }

    // Handle logo file
    let logoPath = null;
    if (req.file) {
      logoPath = `/uploads/church-logos/${req.file.filename}`;
    }

    // Prepare church data
    const churchData = {
      name, address, city, region, country, phone, website,
      preferred_language, timezone, calendar_type,
      admin_full_name, admin_email, admin_password, admin_title,
      description, established_year, logoPath
    };

    // Prepare template options
    const templateOptions = {
      setupTemplates: setup_templates,
      autoSetupStandard: auto_setup_standard,
      generateComponents: generate_components,
      recordTypes: record_types,
      templateStyle: template_style,
      includeGlobalTemplates: true,
      createCustomTemplates: false
    };

    // Use enhanced church setup service
    const setupResult = await churchSetupService.setupNewChurch(churchData, templateOptions);

    res.status(201).json({
      success: true,
      message: 'Church created successfully',
      church: setupResult.church,
      templates: setupResult.templates,
      next_steps: setupResult.next_steps,
      setup_complete: setupResult.church.setup_status.setup_step === 'complete'
    });

  } catch (error) {
    console.error('Error creating church:', error);
    
    // Clean up uploaded file if error occurs
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({
      error: 'Failed to create church',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Complete template setup for a church (for churches that skipped initial setup)
 * POST /api/admin/churches/:id/complete-template-setup
 */
router.post('/:id/complete-template-setup', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const {
      auto_setup_standard = true,
      generate_components = true,
      record_types = ['baptism', 'marriage', 'funeral'],
      template_style = 'orthodox_traditional'
    } = req.body;

    const templateOptions = {
      autoSetupStandard: auto_setup_standard,
      generateComponents: generate_components,
      recordTypes: record_types,
      templateStyle: template_style,
      includeGlobalTemplates: true
    };

    const result = await churchSetupService.completeTemplateSetup(churchId, templateOptions);

    res.json({
      success: true,
      message: result.message,
      templates: result.templates
    });

  } catch (error) {
    console.error('Error completing template setup:', error);
    res.status(500).json({
      error: 'Failed to complete template setup',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get church setup status
 * GET /api/admin/churches/:id/setup-status
 */
router.get('/:id/setup-status', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const setupStatus = await churchSetupService.getChurchSetupStatus(churchId);
    
    if (!setupStatus) {
      return res.status(404).json({ error: 'Church not found' });
    }

    res.json({
      success: true,
      church: setupStatus,
      next_steps: churchSetupService.getNextSteps(setupStatus.setup_status || {})
    });

  } catch (error) {
    console.error('Error getting church setup status:', error);
    res.status(500).json({
      error: 'Failed to get setup status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get all churches (for admin panel)
 * GET /api/churches
 */
router.get('/', async (req, res) => {
  try {
    const [churches] = await getAppPool().execute(`
      SELECT 
        id, church_name as name, email, phone, address, city, state_province, postal_code, country, 
        website, preferred_language, timezone, currency, tax_id, 
        description_multilang, settings, is_active, database_name, created_at, updated_at
      FROM churches 
      ORDER BY created_at DESC
    `);

    // Get user count for each church
    for (let church of churches) {
      try {
        // Skip if church doesn't have a database_name configured
        if (!church.database_name) {
          console.warn(`Church ${church.id} (${church.name}) has no database_name configured`);
          church.user_count = 0;
          church.record_counts = { baptisms: 0, marriages: 0, funerals: 0 };
          continue;
        }

        const churchDb = await getChurchDbConnection(church.database_name);
        
        // Test if connection is valid and database exists
        await churchDb.execute('SELECT 1');
        
        const [userCount] = await churchDb.execute('SELECT COUNT(*) as count FROM orthodoxmetrics_db.users');
        church.user_count = userCount[0].count;
        
        const [recordCounts] = await churchDb.execute(`
          SELECT 
            (SELECT COUNT(*) FROM baptism_records) as baptisms,
            (SELECT COUNT(*) FROM marriage_records) as marriages,
            (SELECT COUNT(*) FROM funeral_records) as funerals
        `);
        church.record_counts = recordCounts[0];
      } catch (dbError) {
        console.error(`Error getting stats for church ${church.id} (${church.name}):`, dbError.message);
        church.user_count = 0;
        church.record_counts = { baptisms: 0, marriages: 0, funerals: 0 };
      }
    }

    res.json({
      success: true,
      churches
    });

  } catch (error) {
    console.error('Error fetching churches:', error);
    res.status(500).json({
      error: 'Failed to fetch churches',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get church details by ID (for admin panel)
 * GET /api/admin/churches/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const [rows] = await getAppPool().query(
      `SELECT * FROM churches WHERE id = ?`, [churchId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Church not found' });
    }
    res.json({ success: true, church: rows[0] });
  } catch (error) {
    console.error('Error fetching church:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch church', error: error.message });
  }
});

/**
 * Update a church
 * PUT /api/admin/churches/:id
 */
router.put('/:id', upload.single('logo'), async (req, res) => {
  try {
    console.log('🔄 PUT /api/admin/churches/:id route started');
    console.log('Request params:', req.params);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const currentChurchId = parseInt(req.params.id);
    
    // Define valid columns that can be updated
    const validColumns = [
      'name', 'email', 'phone', 'address', 'city', 'state_province', 'postal_code', 
      'country', 'preferred_language', 'timezone', 'currency', 'website', 'is_active',
      'database_name', 'has_baptism_records', 'has_marriage_records', 'has_funeral_records',
      'setup_complete', 'logo_path', 'tax_id', 'description_multilang', 'settings'
    ];
    
    // Filter updateData to only include valid columns and validate lengths
    const updateData = {};
    const columnLimits = {
      'preferred_language': 10,
      'currency': 10,
      'timezone': 50,
      'postal_code': 20,
      'state_province': 100,
      'city': 100,
      'country': 100,
      'phone': 50,
      'email': 255,
      'name': 255,
      'website': 500
    };
    
    validColumns.forEach(col => {
      if (req.body[col] !== undefined) {
        let value = req.body[col];
        
        // Force preferred_language to 'en' since we only support English
        if (col === 'preferred_language') {
          value = 'en';
        }
        
        // Truncate string values that exceed column limits
        if (typeof value === 'string' && columnLimits[col]) {
          if (value.length > columnLimits[col]) {
            console.log(`⚠️ Truncating ${col} from ${value.length} to ${columnLimits[col]} characters`);
            value = value.substring(0, columnLimits[col]);
          }
        }
        
        updateData[col] = value;
      }
    });
    
    // Always set preferred_language to 'en' if it's not already set
    if (updateData.preferred_language === undefined) {
      updateData.preferred_language = 'en';
    }
    
    // Note: church_id is not a valid column in the churches table
    // The primary key is 'id', not 'church_id'
    
    console.log('Parsed currentChurchId:', currentChurchId);
    console.log('Initial updateData:', JSON.stringify(updateData, null, 2));
    
    // Handle logo upload if provided
    if (req.file) {
      updateData.logo_path = `/uploads/orthodox-banners/${req.file.filename}`;
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === '') {
        delete updateData[key];
      }
    });

    // Note: Primary key updates are not supported for churches table
    // The 'id' field is auto-increment and cannot be changed

    if (false) { // Disabled: Primary key updates not supported
      // Handle church ID change using a safe method
      // First get all the current church data
      const [currentChurch] = await getAppPool().execute(
        'SELECT * FROM churches WHERE id = ?',
        [currentChurchId]
      );
      
      if (currentChurch.length === 0) {
        return res.status(404).json({
          error: 'Church not found'
        });
      }
      
      const churchData = currentChurch[0];
      
      // Merge update data with existing data
      const mergedData = { ...churchData, ...updateData };
      
      // Create insert query for new church with new ID
      const insertFields = Object.keys(mergedData).filter(key => key !== 'id');
      const insertValues = insertFields.map(key => mergedData[key]);
      insertValues.unshift(newChurchId); // Add new church ID at beginning
      
      const insertQuery = `
        INSERT INTO churches 
        (id, ${insertFields.join(', ')}, updated_at) 
        VALUES (?, ${insertFields.map(() => '?').join(', ')}, CURRENT_TIMESTAMP)
      `;
      
      console.log('Creating new church record with ID:', newChurchId);
      
      // Insert new church record
      await getAppPool().execute(insertQuery, insertValues);
      
      // Delete old church record
      await getAppPool().execute(
        'DELETE FROM churches WHERE id = ?',
        [currentChurchId]
      );
      
      console.log(`🎉 Church ID successfully changed from ${currentChurchId} to ${newChurchId}`);
      
      // Fetch the newly created church
      const [updated] = await getAppPool().execute(
        'SELECT * FROM churches WHERE id = ?',
        [newChurchId]
      );
      
      return res.json({
        success: true,
        church: updated[0],
        message: `Church ID successfully changed from ${currentChurchId} to ${newChurchId}`
      });
      
    } else {
      // Regular update (no church ID change)
      const fieldKeys = Object.keys(updateData);
      
      if (fieldKeys.length === 0) {
        return res.status(400).json({
          error: 'No valid fields to update'
        });
      }
      
      const setClause = fieldKeys.map(key => `${key} = ?`).join(', ');
      const values = fieldKeys.map(key => updateData[key]);
      values.push(currentChurchId);

      // Debug logging
      console.log('--- Church Update Debug ---');
      console.log('Current Church ID:', currentChurchId);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Update data:', JSON.stringify(updateData, null, 2));
      console.log('Set clause:', setClause);
      console.log('Values:', values);
      // End debug logging

      const [result] = await getAppPool().execute(
        `UPDATE churches SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );
      console.log('Update result:', result);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: 'Church not found'
        });
      }

      // Fetch updated church
      const [updated] = await getAppPool().execute(
        'SELECT * FROM churches WHERE id = ?',
        [currentChurchId]
      );

      console.log('✅ Church updated successfully');
      
      res.json({
        success: true,
        church: updated[0],
        message: 'Church updated successfully'
      });
    }

  } catch (error) {
    console.error('❌ ERROR updating church:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Provide more specific error messages for common issues
    let errorMessage = 'Failed to update church';
    if (error.code === 'ER_DUP_ENTRY') {
      errorMessage = 'Church ID already exists or duplicate data detected';
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      errorMessage = 'Invalid reference in update data';
    }
    
    res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Delete a church
 * DELETE /api/admin/churches/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    
    // First get church info including database name
    const [churchResult] = await getAppPool().execute(
      'SELECT id, church_name as name, database_name, db_user FROM churches WHERE id = ?',
      [churchId]
    );

    if (churchResult.length === 0) {
      return res.status(404).json({
        error: 'Church not found'
      });
    }

    const church = churchResult[0];
    const dbName = church.database_name || `om_church_${churchId}`;
    const dbUser = church.db_user || `church_${churchId}`;
    
    console.log(`🗑️ Deleting church: ${church.name} (ID: ${churchId})`);
    console.log(`🗑️ Database to drop: ${dbName}, User: ${dbUser}`);

    // Delete church record first
    const [result] = await getAppPool().execute(
      'DELETE FROM churches WHERE id = ?',
      [churchId]
    );

    let databaseDeleted = false;
    try {
      // Drop the church-specific database
      await getAppPool().execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
      console.log(`✅ Dropped database: ${dbName}`);
      
      // Drop the database user
      await getAppPool().execute(`DROP USER IF EXISTS '${dbUser}'@'localhost'`);
      console.log(`✅ Dropped user: ${dbUser}`);
      
      databaseDeleted = true;
    } catch (dbError) {
      console.error(`⚠️ Failed to clean up database/user for church ${churchId}:`, dbError.message);
      // Don't fail the entire operation if database cleanup fails
    }

    res.json({
      success: true,
      message: 'Church deleted successfully',
      databaseDeleted: databaseDeleted
    });

  } catch (error) {
    console.error('Error deleting church:', error);
    res.status(500).json({
      error: 'Failed to delete church',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Update church status
 * PATCH /api/admin/churches/:id/status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    const { active } = req.body;
    
    const status = active ? 'active' : 'inactive';
    
    const [result] = await getAppPool().execute(
      'UPDATE churches SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [active ? 1 : 0, churchId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Church not found'
      });
    }

    res.json({
      success: true,
      message: `Church ${active ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Error updating church status:', error);
    res.status(500).json({
      error: 'Failed to update church status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Remove all users from a church before deletion
 */
router.post('/:id/remove-all-users', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    // Set church_id to NULL for all users assigned to this church
    await getAppPool().query('UPDATE orthodoxmetrics_db.users SET church_id = NULL WHERE church_id = ?', [churchId]);
    res.json({ success: true, message: 'All users removed from church.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove users from church.', error: error.message });
  }
});

/**
 * Create database schema for new church
 */
async function createChurchDatabaseSchema(churchDb) {
  const tables = [
    // NOTE: Users are stored in orthodoxmetrics_db, not in individual church databases
    // Church databases are for records only. User management is handled centrally.
    // Use the church_users junction table in orthodoxmetrics_db to assign users to churches.

    // Church configuration
    `CREATE TABLE IF NOT EXISTS church_config (
      id INT PRIMARY KEY AUTO_INCREMENT,
      church_id INT NOT NULL,
      preferred_language VARCHAR(5) DEFAULT 'en',
      timezone VARCHAR(100) DEFAULT 'America/New_York',
      calendar_type ENUM('gregorian', 'julian', 'both') DEFAULT 'gregorian',
      logo_path VARCHAR(500),
      description TEXT,
      established_year INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Baptism records
    `CREATE TABLE IF NOT EXISTS baptism_records (
      id INT PRIMARY KEY AUTO_INCREMENT,
      first_name VARCHAR(255) NOT NULL,
      middle_name VARCHAR(255),
      last_name VARCHAR(255) NOT NULL,
      birth_date DATE,
      baptism_date DATE NOT NULL,
      father_name VARCHAR(255),
      mother_name VARCHAR(255),
      godfather_name VARCHAR(255),
      godmother_name VARCHAR(255),
      priest_name VARCHAR(255),
      church_name VARCHAR(255),
      notes TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Marriage records
    `CREATE TABLE IF NOT EXISTS marriage_records (
      id INT PRIMARY KEY AUTO_INCREMENT,
      groom_first_name VARCHAR(255) NOT NULL,
      groom_last_name VARCHAR(255) NOT NULL,
      groom_birth_date DATE,
      bride_first_name VARCHAR(255) NOT NULL,
      bride_last_name VARCHAR(255) NOT NULL,
      bride_birth_date DATE,
      marriage_date DATE NOT NULL,
      priest_name VARCHAR(255),
      church_name VARCHAR(255),
      best_man_name VARCHAR(255),
      maid_of_honor_name VARCHAR(255),
      witness1_name VARCHAR(255),
      witness2_name VARCHAR(255),
      notes TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Funeral records
    `CREATE TABLE IF NOT EXISTS funeral_records (
      id INT PRIMARY KEY AUTO_INCREMENT,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      birth_date DATE,
      death_date DATE NOT NULL,
      funeral_date DATE,
      burial_date DATE,
      cemetery_name VARCHAR(255),
      priest_name VARCHAR(255),
      church_name VARCHAR(255),
      cause_of_death VARCHAR(500),
      notes TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,



    // Entity extraction corrections
    `CREATE TABLE IF NOT EXISTS entity_extraction_corrections (
      id INT PRIMARY KEY AUTO_INCREMENT,
      job_id INT NOT NULL,
      field_name VARCHAR(100) NOT NULL,
      original_value TEXT,
      corrected_value TEXT,
      confidence_before DECIMAL(3,2),
      confidence_after DECIMAL(3,2),
      correction_type ENUM('manual', 'suggested', 'auto') DEFAULT 'manual',
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_job_id (job_id)
    )`,

    // Activity logs
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      action VARCHAR(100) NOT NULL,
      description TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at)
    )`
  ];

  // Execute each table creation
  for (const tableSQL of tables) {
    await churchDb.execute(tableSQL);
  }
}

/**
 * Standardized API response helper
 */
function apiResponse(success, data = null, error = null, meta = null) {
    const response = { success };
    if (data) response.data = data;
    if (error) response.error = error;
    if (meta) response.meta = meta;
    return response;
}

/**
 * Validates church access and returns church info
 */
async function validateChurchAccess(churchId) {
    const [churches] = await getAppPool().query(
        'SELECT id, church_name as name, database_name FROM churches WHERE id = ? AND is_active = 1',
        [churchId]
    );
    
    if (churches.length === 0) {
        throw new Error('Church not found or inactive');
    }
    
    return churches[0];
}

// GET /api/admin/churches/:id/columns?table=<table>
router.get('/:id/columns', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id, 10);
    const table = String(req.query.table || '').trim();
    if (!churchId || !table) {
      return res.status(400).json({ success: false, error: 'churchId and table are required' });
    }

    // Validate and get DB name (reuses your helper)
    const { database_name } = await validateChurchAccess(churchId);

    // Read column names from INFORMATION_SCHEMA
    const [rows] = await getAppPool().query(
      `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION`,
      [database_name, table]
    );

    const columns = rows.map(r => r.COLUMN_NAME);
    return res.json({ success: true, columns });
  } catch (err) {
    console.error('❌ Error getting columns:', err);
    return res.status(500).json({ success: false, error: err.message || 'failed to load columns' });
  }
});

// GET /api/admin/churches/:id/tables/:table/columns
router.get('/:id/tables/:table/columns', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id, 10);
    const table = String(req.params.table || '').trim();
    if (!churchId || !table) {
      return res.status(400).json({ success: false, error: 'churchId and table are required' });
    }

    const { database_name } = await validateChurchAccess(churchId);

    const [rows] = await getAppPool().query(
      `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION`,
      [database_name, table]
    );

    const columns = rows.map(r => r.COLUMN_NAME);
    return res.json({ success: true, columns });
  } catch (err) {
    console.error('❌ Error getting columns:', err);
    return res.status(500).json({ success: false, error: err.message || 'failed to load columns' });
  }
});

// POST /api/admin/churches/:id/field-mapper
router.post('/:id/field-mapper', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id, 10);
    const { table, mapping = {}, field_settings = {} } = req.body || {};

    if (!churchId || !table) {
      return res.status(400).json({ success: false, error: 'churchId and table are required' });
    }

    await validateChurchAccess(churchId);

    // Ensure table exists in the central app DB (MariaDB 10.6: LONGTEXT + JSON_VALID)
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS \`${APP_DB}\`.church_field_mappings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        table_name VARCHAR(128) NOT NULL,
        mapping_json LONGTEXT NULL,
        field_settings_json LONGTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_church_table (church_id, table_name),
        CHECK (JSON_VALID(mapping_json)),
        CHECK (JSON_VALID(field_settings_json))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Add missing columns/constraints if table pre-existed in an older shape
    await getAppPool().query(`
      ALTER TABLE \`${APP_DB}\`.church_field_mappings
        ADD COLUMN IF NOT EXISTS mapping_json LONGTEXT NULL,
        ADD COLUMN IF NOT EXISTS field_settings_json LONGTEXT NULL
    `);

    // Schema-qualified upsert (forces write into orthodoxmetrics_db)
    await getAppPool().query(
      `INSERT INTO \`${APP_DB}\`.church_field_mappings
         (church_id, table_name, mapping_json, field_settings_json)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         mapping_json = VALUES(mapping_json),
         field_settings_json = VALUES(field_settings_json),
         updated_at = CURRENT_TIMESTAMP`,
      [churchId, table, JSON.stringify(mapping), JSON.stringify(field_settings)]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('❌ Error saving field mapping:', err);
    return res.status(500).json({ success: false, error: err.message || 'failed to save mapping' });
  }
});

// GET /api/admin/churches/:id/field-mapper?table=TABLE_NAME
router.get('/:id/field-mapper', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id, 10);
    const table = String(req.query.table || '').trim();
    if (!churchId || !table) {
      return res.status(400).json({ success: false, error: 'churchId and table are required' });
    }

    await validateChurchAccess(churchId);

    const [rows] = await getAppPool().query(
      `SELECT mapping_json, field_settings_json
         FROM \`${APP_DB}\`.church_field_mappings
        WHERE church_id = ? AND table_name = ?
        LIMIT 1`,
      [churchId, table]
    );

    if (!rows.length) {
      return res.json({ success: true, mappings: {}, field_settings: {} });
    }

    // MariaDB returns LONGTEXT; ensure we parse to objects if strings
    let { mapping_json, field_settings_json } = rows[0] || {};
    if (typeof mapping_json === 'string') {
      try { mapping_json = JSON.parse(mapping_json); } catch {}
    }
    if (typeof field_settings_json === 'string') {
      try { field_settings_json = JSON.parse(field_settings_json); } catch {}
    }

    return res.json({
      success: true,
      mappings: mapping_json || {},
      field_settings: field_settings_json || {}
    });
  } catch (err) {
    console.error('❌ Error loading field mapping:', err);
    return res.status(500).json({ success: false, error: err.message || 'failed to load mapping' });
  }
});

// GET /api/admin/churches/:id/debug - Debug church database connection
router.get('/:id/debug', async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);
        console.log('🐛 Debug: Getting church info for ID:', churchId);

        // Check what's actually in the church record
        const [churches] = await getAppPool().query(
            'SELECT * FROM churches WHERE id = ?',
            [churchId]
        );

        if (churches.length === 0) {
            return res.json({
                success: false,
                error: 'Church not found',
                churchId
            });
        }

        const church = churches[0];
        console.log('🐛 Debug: Church record:', church);

        res.json({
            success: true,
            debug: {
                churchId,
                church,
                database_name: church.database_name,
                database_name_type: typeof church.database_name,
                database_name_is_null: church.database_name === null,
                database_name_is_undefined: church.database_name === undefined,
                database_name_length: church.database_name?.length || 0
            }
        });

    } catch (error) {
        console.error('❌ Debug error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/admin/churches/:id/database-info - Get comprehensive database information
router.get('/:id/database-info', async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);
        console.log('🗄️ Getting database info for church ID:', churchId);

        // Validate church exists and get database name
        const church = await validateChurchAccess(churchId);
        const { database_name, name: church_name } = church;

        // Get database size and table count
        const [dbInfo] = await getAppPool().execute(`
            SELECT 
                TABLE_SCHEMA as name,
                ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb,
                COUNT(TABLE_NAME) as table_count
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
            GROUP BY TABLE_SCHEMA
        `, [database_name]);

        // Get detailed table information
        const [tables] = await getAppPool().execute(`
            SELECT 
                TABLE_NAME as name, 
                TABLE_ROWS as row_count, 
                ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb,
                CREATE_TIME as created_at,
                UPDATE_TIME as updated_at
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
            ORDER BY size_mb DESC, TABLE_NAME
        `, [database_name]);

        // Calculate totals if main query didn't work
        let totalSize = 0;
        let tableCount = tables.length;
        
        if (tables.length > 0) {
            totalSize = tables.reduce((sum, table) => sum + (parseFloat(table.size_mb) || 0), 0);
        }

        // Use main query results if available, otherwise use calculated values
        const databaseInfo = {
            name: database_name,
            church_name,
            size_mb: dbInfo[0]?.size_mb || totalSize,
            table_count: dbInfo[0]?.table_count || tableCount,
            tables: tables.map(table => ({
                name: table.name,
                rows: table.row_count || 0,
                size_mb: table.size_mb || 0,
                created_at: table.created_at,
                updated_at: table.updated_at
            }))
        };

        // Add mock backup info (in production, this would come from backup system)
        const backupInfo = {
            last_backup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
            backup_size_mb: Math.round(totalSize * 0.8), // Compressed backup estimate
            status: 'success',
            retention_days: 30
        };

        res.json({
            success: true,
            database: databaseInfo,
            backup: backupInfo,
            church_id: churchId,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting database info:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/admin/churches/:id/test-connection - Test database connection and health
router.post('/:id/test-connection', async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);
        console.log('🔌 Testing database connection for church ID:', churchId);

        // Validate church exists and get database info
        const church = await validateChurchAccess(churchId);
        const { database_name, name: church_name } = church;

        // Test basic connection
        const startTime = Date.now();
        const [connectionTest] = await getAppPool().query('SELECT 1 as test');
        const connectionTime = Date.now() - startTime;

        // Test database existence
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

        // Test sample queries on common tables
        const sampleQueries = {};
        const commonTables = ['baptism_records', 'marriage_records', 'funeral_records', 'members'];
        
        for (const tableName of commonTables) {
            try {
                const [sampleQuery] = await getAppPool().query(`
                    SELECT COUNT(*) as record_count 
                    FROM \`${database_name}\`.\`${tableName}\` 
                    LIMIT 1
                `);
                sampleQueries[tableName] = {
                    success: true,
                    record_count: sampleQuery[0].record_count
                };
            } catch (tableError) {
                sampleQueries[tableName] = {
                    success: false,
                    error: `Table '${tableName}' not accessible`
                };
            }
        }

        const connectionResult = {
            database_name,
            church_name,
            database_exists: dbExists.length > 0,
            connection_time_ms: connectionTime,
            table_count: dbStats[0]?.table_count || 0,
            size_mb: dbStats[0]?.size_mb || 0,
            sample_queries: sampleQueries,
            status: dbExists.length > 0 ? 'healthy' : 'database_missing',
            tested_at: new Date().toISOString()
        };

        res.json({
            success: true,
            data: {
                connection: connectionResult,
                church_id: churchId
            }
        });

    } catch (error) {
        console.error('❌ Error testing database connection:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/admin/churches/:id/tables
router.get('/:id/tables', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id, 10);
    if (!churchId) return res.status(400).json({ success: false, error: 'churchId is required' });

    // Use your helper to validate + fetch the DB name
    const { database_name } = await validateChurchAccess(churchId);

    // Pull tables from INFORMATION_SCHEMA (names + rough size)
    const [rows] = await getAppPool().query(
      `SELECT
         TABLE_NAME              AS table_name,
         TABLE_ROWS              AS row_count,
         DATA_LENGTH + INDEX_LENGTH AS size_bytes
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME`,
      [database_name]
    );

    // Normalize + filter out system/internal tables
    const allTables = rows.map(r => ({
      name: r.table_name,
      row_count: Number(r.row_count ?? 0),
      size_mb: r.size_bytes ? Math.round((Number(r.size_bytes) / 1024 / 1024) * 100) / 100 : 0
    }));

    const isRelevant = (t) => {
      const n = t.name.toLowerCase();
      // include obvious domain tables
      const includes = [
        'baptism', 'marriage', 'funeral',
        'member', 'family', 'donation', 'record'
      ].some(k => n.includes(k));

      // exclude obvious system tables
      const excludes = [
        'migrations', 'knex', 'sys', 'information_schema',
        'performance_schema', 'mysql', 'audit', 'event'
      ].some(k => n.includes(k));

      return includes && !excludes;
    };

    const relevant = allTables.filter(isRelevant);

    return res.json({
      success: true,
      tables: relevant.map(t => t.name),    // simple list for front-end fallback
      meta: {
        total_tables: allTables.length,
        relevant_count: relevant.length,
        database: database_name,
        details: relevant                    // richer info if you need it later
      }
    });
  } catch (err) {
    console.error('❌ Error getting tables:', err);
    return res.status(500).json({ success: false, error: err.message || 'failed to load tables' });
  }
});


// POST /api/admin/churches/:id/update-database - Update church database with template tables
router.post('/:id/update-database', async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);
        const { template } = req.body;
        
        if (!template) {
            return res.status(400).json({
                success: false,
                error: 'Template name is required'
            });
        }
        
        console.log(`🔄 Updating database for church ${churchId} with template: ${template}`);
        
        // Get church details
        const [churchResult] = await getAppPool().query(
            'SELECT id, church_name as name, database_name FROM churches WHERE id = ?',
            [churchId]
        );
        
        if (churchResult.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Church not found'
            });
        }
        
        const church = churchResult[0];
        const dbName = church.database_name || `om_church_${churchId}`;
        
        // Get all tables from the template database
        const [templateTables] = await getAppPool().query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME NOT IN ('church_info', 'church_settings')
        `, [template]);
        
        let tablesCreated = 0;
        let errors = [];
        
        // Disable foreign key checks to avoid constraint issues
        await getAppPool().query('SET FOREIGN_KEY_CHECKS = 0');
        
        for (const table of templateTables) {
            const tableName = table.TABLE_NAME;
            
            try {
                // Check if table already exists in church database
                const [existingTables] = await getAppPool().query(`
                    SELECT TABLE_NAME 
                    FROM information_schema.TABLES 
                    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
                `, [dbName, tableName]);
                
                if (existingTables.length === 0) {
                    // Table doesn't exist, create it
                    console.log(`📋 Creating table: ${tableName} in ${dbName}`);
                    
                    // Get CREATE TABLE statement from template
                    const [createTableResult] = await getAppPool().query(`SHOW CREATE TABLE \`${template}\`.\`${tableName}\``);
                    let createStatement = createTableResult[0]['Create Table'];
                    
                    // Replace table name and execute in church database
                    createStatement = createStatement.replace(`CREATE TABLE \`${tableName}\``, `CREATE TABLE IF NOT EXISTS \`${dbName}\`.\`${tableName}\``);
                    await getAppPool().query(createStatement);
                    
                    tablesCreated++;
                    console.log(`✅ Created table: ${tableName}`);
                } else {
                    console.log(`⏭️ Table ${tableName} already exists, skipping`);
                }
            } catch (tableError) {
                console.warn(`⚠️ Failed to create table ${tableName}:`, tableError.message);
                errors.push(`${tableName}: ${tableError.message}`);
            }
        }
        
        // Re-enable foreign key checks
        await getAppPool().query('SET FOREIGN_KEY_CHECKS = 1');
        
        const message = `Database update completed. ${tablesCreated} tables created.${errors.length > 0 ? ` ${errors.length} errors occurred.` : ''}`;
        
        res.json({
            success: true,
            message: message,
            tablesCreated: tablesCreated,
            totalTables: templateTables.length,
            errors: errors
        });
        
    } catch (error) {
        console.error('❌ Database update failed:', error);
        
        // Make sure to re-enable foreign key checks even if there's an error
        try {
            await getAppPool().query('SET FOREIGN_KEY_CHECKS = 1');
        } catch (fkError) {
            console.warn('⚠️ Failed to re-enable foreign key checks:', fkError.message);
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to update database',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/admin/churches/:id/record-counts - Get record counts for church database
router.get('/:id/record-counts', async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);
        console.log('📊 Getting record counts for church ID:', churchId);

        // Validate church exists and get database name
        const church = await validateChurchAccess(churchId);
        const { database_name } = church;

        // Get table names for record tables
        const [tables] = await getAppPool().query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? 
            AND (TABLE_NAME LIKE '%_records'
                 OR TABLE_NAME IN ('clergy', 'members', 'donations', 'calendar_events'))
            ORDER BY TABLE_NAME
        `, [database_name]);

        const counts = {};
        const errors = {};
        
        // Get count for each table
        for (const table of tables) {
            try {
                const [countResult] = await getAppPool().query(`
                    SELECT COUNT(*) as count FROM \`${database_name}\`.\`${table.TABLE_NAME}\`
                `);
                counts[table.TABLE_NAME] = countResult[0].count;
            } catch (tableError) {
                console.warn(`⚠️ Error counting ${table.TABLE_NAME}:`, tableError.message);
                counts[table.TABLE_NAME] = 0;
                errors[table.TABLE_NAME] = tableError.message;
            }
        }

        // Calculate total records
        const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

        res.json({
            success: true,
            counts: counts,
            total_records: totalRecords,
            church_id: churchId,
            database_name,
            errors: Object.keys(errors).length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('❌ Error getting record counts:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
});

// Configure multer for record images (separate from logo uploads)
// Uses RECORD_IMAGES_DIR env var, defaults to /var/www/orthodoxmetrics/uploads/record-images
const RECORD_IMAGES_BASE_DIR = process.env.RECORD_IMAGES_DIR || '/var/www/orthodoxmetrics/uploads/record-images';
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = ['baptism', 'marriage', 'funeral', 'logo', 'bg', 'g1', 'omLogo', 'recordImage'];

// Ensure base directory exists at startup
(async () => {
  try {
    await fs.mkdir(RECORD_IMAGES_BASE_DIR, { recursive: true });
    console.log(`✅ Record images base directory ready: ${RECORD_IMAGES_BASE_DIR}`);
  } catch (err) {
    console.error(`❌ Failed to create record images base directory: ${err.message}`);
  }
})();

const recordImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use synchronous approach with promise handling
    // Wrap in try-catch to catch any synchronous errors
    try {
      const asyncFn = (async () => {
        try {
          const churchId = req.params.id || req.params.churchId;
          const type = req.query.type || (req.body && req.body.type) || 'image';
          
          if (!churchId) {
            const err = new Error('Church ID is required');
            err.code = 'MISSING_CHURCH_ID';
            return cb(err);
          }
          
          // Sanitize type to prevent directory traversal
          const sanitizedType = type.replace(/[^a-zA-Z0-9_-]/g, '') || 'image';
          
          // Create directory structure: baseDir/churchId/type/
          const uploadDir = path.join(RECORD_IMAGES_BASE_DIR, String(churchId), sanitizedType);
          
          console.log(`📁 Creating record images directory: ${uploadDir}`);
          
          // Create directory recursively
          await fs.mkdir(uploadDir, { recursive: true });
          
          console.log(`✅ Record images directory ready: ${uploadDir}`);
          cb(null, uploadDir);
        } catch (err) {
          console.error('❌ Error creating record images directory:', {
            path: RECORD_IMAGES_BASE_DIR,
            churchId: req.params.id,
            type: req.query.type || req.body?.type,
            error: err.message,
            code: err.code,
            stack: err.stack
          });
          // Create a proper error object for multer
          const multerError = new Error(`Failed to create upload directory: ${err.message}`);
          multerError.code = err.code || 'DIRECTORY_ERROR';
          cb(multerError);
        }
      })();
      
      // Catch any unhandled promise rejections
      asyncFn.catch((unhandledErr) => {
        console.error('❌ Unhandled promise rejection in destination callback:', {
          error: unhandledErr.message,
          code: unhandledErr.code,
          stack: unhandledErr.stack
        });
        const multerError = new Error(`Unhandled error in upload destination: ${unhandledErr.message}`);
        multerError.code = unhandledErr.code || 'UNHANDLED_ERROR';
        cb(multerError);
      });
    } catch (syncErr) {
      // Catch any synchronous errors in the destination callback setup
      console.error('❌ Synchronous error in destination callback:', {
        error: syncErr.message,
        code: syncErr.code,
        stack: syncErr.stack
      });
      const multerError = new Error(`Failed to setup upload destination: ${syncErr.message}`);
      multerError.code = syncErr.code || 'DESTINATION_ERROR';
      cb(multerError);
    }
  },
  filename: (req, file, cb) => {
    try {
      // Generate safe filename: timestamp-random + original extension
      const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname) || '.png';
      const safeExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
      const filename = `${uniqueId}${safeExt}`;
      
      cb(null, filename);
    } catch (err) {
      console.error('❌ Error in filename callback:', err);
      cb(err);
    }
  }
});

const recordImageUpload = multer({
  storage: recordImageStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    // Check mimetype
    if (!file.mimetype || !ALLOWED_IMAGE_TYPES.includes(file.mimetype.toLowerCase())) {
      return cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`));
    }
    cb(null, true);
  }
});

// GET /api/admin/churches/:id/record-images/test - Test endpoint to verify route is accessible
router.get('/:id/record-images/test', (req, res) => {
  console.log('✅✅✅ TEST ROUTE HIT:', req.params.id);
  res.json({ success: true, message: 'Route is accessible', churchId: req.params.id });
});

// POST /api/admin/churches/:id/record-images - Upload record images (logo, bg, baptism, marriage, funeral, g1, omLogo)
router.post('/:id/record-images', async (req, res, next) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  // Log immediately to ensure we can track the request
  console.log(`[${requestId}] 🚀 ROUTE HIT: POST /api/admin/churches/:id/record-images`);
  
  // Wrap in error handler to ensure JSON responses
  const handleError = (err, statusCode = 500) => {
    if (res.headersSent) {
      console.error(`[${requestId}] ⚠️ Headers already sent, cannot send JSON error`);
      return next(err);
    }
    console.error(`[${requestId}] ❌ Error in record-images route:`, {
      message: err.message,
      code: err.code,
      statusCode,
      stack: err.stack
    });
    try {
      return res.status(statusCode).json({
        success: false,
        error: err.message || 'Internal server error',
        code: err.code || 'INTERNAL_ERROR'
      });
    } catch (jsonErr) {
      console.error(`[${requestId}] ❌ Failed to send JSON error response:`, jsonErr);
      // Last resort - try to send plain text
      if (!res.headersSent) {
        res.status(statusCode).send(`Error: ${err.message || 'Internal server error'}`);
      }
    }
  };
  
  const userId = req.user?.id || req.session?.user?.id || 'anonymous';
  const userEmail = req.user?.email || req.session?.user?.email || 'unknown';
  const churchIdParam = req.params.id; // Route is /:id/record-images
  
  // Initial logging
  console.log(`[${requestId}] 📤 POST /api/admin/churches/:id/record-images`, {
    churchId: churchIdParam,
    userId,
    userEmail,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    timestamp: new Date().toISOString()
  });

  // Check if recordImageUpload is defined
  if (!recordImageUpload) {
    console.error(`[${requestId}] ❌ recordImageUpload is not defined`);
    return handleError(new Error('Upload handler not configured'), 500);
  }

  // Wrap multer middleware call in try-catch to catch any initialization errors
  try {
    // Use multer middleware manually to catch errors
    recordImageUpload.single('image')(req, res, async (multerErr) => {
    if (multerErr) {
      // Handle multer-specific errors
      let statusCode = 400;
      let errorCode = 'UPLOAD_ERROR';
      
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        errorCode = 'FILE_TOO_LARGE';
        multerErr.message = `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`;
      } else if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
        errorCode = 'UNEXPECTED_FIELD';
        multerErr.message = 'Unexpected field name. Expected field name: "image"';
      } else if (multerErr.code === 'DIRECTORY_ERROR' || multerErr.message?.includes('directory')) {
        errorCode = 'DIRECTORY_ERROR';
        statusCode = 500;
        multerErr.message = multerErr.message || 'Failed to create upload directory. Please check server permissions.';
      }
      
      console.error(`[${requestId}] ❌ Multer error:`, {
        code: multerErr.code,
        message: multerErr.message,
        field: multerErr.field,
        ...(process.env.NODE_ENV === 'development' && { stack: multerErr.stack })
      });
      
      // Ensure we return JSON, not HTML
      if (!res.headersSent) {
        return res.status(statusCode).json({
          success: false,
          error: multerErr.message || 'File upload error',
          code: errorCode
        });
      }
      return;
    }

    try {
      // Validate churchId
      const churchId = parseInt(churchIdParam, 10);
      if (isNaN(churchId) || churchId <= 0) {
        console.error(`[${requestId}] ❌ Invalid church ID:`, churchIdParam);
        return res.status(400).json({
          success: false,
          error: 'Invalid church ID. Must be a positive integer.',
          code: 'INVALID_CHURCH_ID'
        });
      }
      
      // Validate type
      const type = (req.body.type || req.query.type || '').trim();
      if (!type) {
        console.error(`[${requestId}] ❌ Missing type parameter`);
        return res.status(400).json({ 
          success: false,
          error: 'Image type is required (e.g., baptism, marriage, funeral, logo, bg, g1, omLogo)',
          code: 'MISSING_TYPE'
        });
      }
      
      // Sanitize and validate type
      const sanitizedType = type.replace(/[^a-zA-Z0-9_-]/g, '');
      if (!ALLOWED_TYPES.includes(sanitizedType)) {
        console.warn(`[${requestId}] ⚠️  Unknown type "${type}", but allowing upload`);
      }
      
      // Validate file exists
      if (!req.file) {
        console.error(`[${requestId}] ❌ No file in request`);
        return res.status(400).json({ 
          success: false,
          error: 'No image file provided. Ensure field name is "image".',
          code: 'NO_FILE'
        });
      }
      
      // Log file metadata
      console.log(`[${requestId}] 📁 File received:`, {
        originalname: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        destination: req.file.destination,
        path: req.file.path
      });
      
      // Validate church access (throws error if invalid)
      console.log(`[${requestId}] 🔍 Validating church access for church ${churchId}...`);
      await validateChurchAccess(churchId);
      console.log(`[${requestId}] ✅ Church access validated`);
      
      // Generate URL path (relative to public directory or configured base URL)
      // Files are stored in: RECORD_IMAGES_BASE_DIR/churchId/type/filename
      // For serving, we need to map this to a URL path
      // If using front-end/public/images/records, use that path
      // Otherwise, use a configured base URL or serve from uploads directory
      const imageUrl = `/images/records/${churchId}/${sanitizedType}/${req.file.filename}`;
      const fullPath = req.file.path;
      
      console.log(`[${requestId}] ✅ Upload successful:`, {
        churchId,
        type: sanitizedType,
        filename: req.file.filename,
        url: imageUrl,
        path: fullPath
      });
      
      // Return success response
      res.status(201).json({
        ok: true,
        success: true,
        message: 'Image uploaded successfully',
        churchId,
        type: sanitizedType,
        filename: req.file.filename,
        path: fullPath,
        url: imageUrl
      });
      
    } catch (error) {
      // Pass error to global error handler
      console.error(`[${requestId}] ❌ Upload handler error:`, {
        message: error.message,
        code: error.code,
        churchId: churchIdParam,
        type: req.body?.type || req.query?.type,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
      
      // Set status code if not already set
      error.statusCode = error.statusCode || 500;
      error.status = error.statusCode;
      
      // Use handleError instead of next to ensure JSON response
      return handleError(error, error.statusCode || 500);
    }
  });
  } catch (initError) {
    // Catch any errors during multer middleware initialization
    console.error(`[${requestId}] ❌ Multer initialization error:`, {
      message: initError.message,
      code: initError.code,
      stack: initError.stack
    });
    return handleError(initError, 500);
  }
});

// GET /api/admin/churches/:id/record-settings - Get record settings
router.get('/:id/record-settings', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id, 10);
    if (!churchId) {
      return res.status(400).json({ success: false, error: 'Invalid church ID' });
    }
    
    await validateChurchAccess(churchId);
    
    // Ensure table exists with correct schema
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS ${APP_DB}.church_record_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        settings JSON NOT NULL,
        updated_by INT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church (church_id),
        INDEX idx_church_id (church_id),
        INDEX idx_updated_at (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Check for and add missing columns
    try {
      const [existingColumns] = await getAppPool().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'church_record_settings'
      `, [APP_DB]);
      
      const columnNames = existingColumns.map(col => col.COLUMN_NAME);
      const requiredColumns = [
        { name: 'settings', def: 'JSON NOT NULL', after: 'church_id' },
        { name: 'updated_by', def: 'INT NULL', after: 'settings' },
        { name: 'updated_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', after: 'updated_by' },
        { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', after: 'updated_at' }
      ];
      
      for (const col of requiredColumns) {
        if (!columnNames.includes(col.name)) {
          await getAppPool().query(`
            ALTER TABLE ${APP_DB}.church_record_settings 
            ADD COLUMN ${col.name} ${col.def} ${col.after ? `AFTER ${col.after}` : ''}
          `);
          console.log(`✅ Added ${col.name} column to church_record_settings table`);
        }
      }
    } catch (alterError) {
      console.error('⚠️ Error checking/adding columns:', alterError);
      // Continue anyway, might already exist
    }
    
    // Fetch settings from database
    const [rows] = await getAppPool().query(
      `SELECT settings FROM ${APP_DB}.church_record_settings WHERE church_id = ?`,
      [churchId]
    );
    
    if (rows.length > 0 && rows[0].settings) {
      const settings = typeof rows[0].settings === 'string' 
        ? JSON.parse(rows[0].settings) 
        : rows[0].settings;
      res.json({ success: true, settings });
    } else {
      // Return empty settings if none exist
      res.json({ success: true, settings: {} });
    }
  } catch (error) {
    console.error('❌ Error fetching record settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch record settings'
    });
  }
});

// POST /api/admin/churches/:id/record-settings - Save record settings
router.post('/:id/record-settings', upload.single('logo'), async (req, res) => {
  try {
    const churchId = parseInt(req.params.id, 10);
    if (!churchId) {
      return res.status(400).json({ success: false, error: 'Invalid church ID' });
    }
    
    await validateChurchAccess(churchId);
    
    // Parse settings from FormData
    let settings = {};
    if (req.body.settings) {
      try {
        settings = typeof req.body.settings === 'string' 
          ? JSON.parse(req.body.settings) 
          : req.body.settings;
      } catch (parseError) {
        console.error('❌ Error parsing settings JSON:', parseError);
        return res.status(400).json({ success: false, error: 'Invalid settings JSON' });
      }
    }
    
    // Handle logo file upload if provided
    if (req.file) {
      const logoPath = `/uploads/church-logos/${req.file.filename}`;
      if (!settings.logo) settings.logo = {};
      settings.logo.path = logoPath;
    }
    
    // Ensure table exists
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS ${APP_DB}.church_record_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        settings JSON NOT NULL,
        updated_by INT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church (church_id),
        INDEX idx_church_id (church_id),
        INDEX idx_updated_at (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Check for and add missing columns
    try {
      const [existingColumns] = await getAppPool().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'church_record_settings'
      `, [APP_DB]);
      
      const columnNames = existingColumns.map(col => col.COLUMN_NAME);
      const requiredColumns = [
        { name: 'settings', def: 'JSON NOT NULL', after: 'church_id' },
        { name: 'updated_by', def: 'INT NULL', after: 'settings' },
        { name: 'updated_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', after: 'updated_by' },
        { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', after: 'updated_at' }
      ];
      
      for (const col of requiredColumns) {
        if (!columnNames.includes(col.name)) {
          await getAppPool().query(`
            ALTER TABLE ${APP_DB}.church_record_settings 
            ADD COLUMN ${col.name} ${col.def} ${col.after ? `AFTER ${col.after}` : ''}
          `);
          console.log(`✅ Added ${col.name} column to church_record_settings table`);
        }
      }
    } catch (alterError) {
      console.error('⚠️ Error checking/adding columns:', alterError);
      // Continue anyway, might already exist
    }
    
    // Get user ID from session if available
    const userId = req.user?.id || req.session?.user?.id || null;
    
    // Save or update settings
    await getAppPool().query(
      `INSERT INTO ${APP_DB}.church_record_settings (church_id, settings, updated_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         settings = VALUES(settings),
         updated_by = VALUES(updated_by),
         updated_at = CURRENT_TIMESTAMP`,
      [churchId, JSON.stringify(settings), userId]
    );
    
    res.json({ success: true, message: 'Settings saved successfully', settings });
  } catch (error) {
    console.error('❌ Error saving record settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save record settings'
    });
  }
});

// GET /api/admin/churches/:id/themes - Get church themes
router.get('/:id/themes', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id, 10);
    if (!churchId) {
      return res.status(400).json({ success: false, error: 'Invalid church ID' });
    }
    
    await validateChurchAccess(churchId);
    
    // Ensure table exists with correct schema
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS ${APP_DB}.church_themes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        themes JSON NOT NULL,
        updated_by INT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church (church_id),
        INDEX idx_church_id (church_id),
        INDEX idx_updated_at (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ensure all required columns exist (themes, updated_by, updated_at)
    try {
      const [columns] = await getAppPool().query(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'church_themes'
      `, [APP_DB]);

      const existingColumns = new Set(columns.map((c) => c.COLUMN_NAME));
      const alterStatements = [];

      // Add themes column if missing (use LONGTEXT for compatibility, MySQL will handle JSON)
      if (!existingColumns.has('themes')) {
        console.log('⚠️  Adding missing "themes" column to church_themes table');
        alterStatements.push(`ADD COLUMN themes LONGTEXT NOT NULL DEFAULT ('[]') AFTER church_id`);
      }

      // Add updated_by column if missing
      if (!existingColumns.has('updated_by')) {
        console.log('⚠️  Adding missing "updated_by" column to church_themes table');
        alterStatements.push(`ADD COLUMN updated_by INT NULL AFTER themes`);
      }

      // Add updated_at column if missing
      if (!existingColumns.has('updated_at')) {
        console.log('⚠️  Adding missing "updated_at" column to church_themes table');
        alterStatements.push(`ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER updated_by`);
      }

      if (alterStatements.length > 0) {
        await getAppPool().query(`
          ALTER TABLE ${APP_DB}.church_themes 
          ${alterStatements.join(', ')}
        `);
        console.log(`✅ Successfully added ${alterStatements.length} column(s)`);
      } else {
        console.log('✅ All required columns exist');
      }
    } catch (alterError) {
      console.warn('⚠️  Could not check/add columns:', alterError.message);
      // Continue anyway - table might have different structure
    }

    // Get existing themes from the themes table
    // Use COALESCE to handle missing columns gracefully
    const [themes] = await getAppPool().query(
      `SELECT 
        COALESCE(themes, '{}') as themes,
        COALESCE(updated_at, created_at, NOW()) as updated_at,
        updated_by
       FROM ${APP_DB}.church_themes
       WHERE church_id = ?`,
      [churchId]
    );

    let themesData = {};
    if (themes.length > 0 && themes[0].themes) {
      try {
        const rawThemes = themes[0].themes;
        if (typeof rawThemes === 'string') {
          themesData = JSON.parse(rawThemes);
        } else {
          themesData = rawThemes;
        }
        // Ensure it's an object (for backward compatibility) or convert array to object
        if (Array.isArray(themesData)) {
          // Convert array to object map for frontend compatibility
          themesData = themesData.reduce((acc, theme, idx) => {
            const key = theme.name || theme.id || `theme_${idx}`;
            acc[key] = theme;
            return acc;
          }, {});
        }
      } catch (parseError) {
        console.warn('⚠️  Failed to parse themes JSON:', parseError);
        themesData = {};
      }
    }

    res.json({ 
      success: true, 
      themes: themesData,
      updated_at: themes[0]?.updated_at || null,
      updated_by: themes[0]?.updated_by || null
    });
  } catch (error) {
    console.error('❌ Error fetching themes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch themes'
    });
  }
});

// POST /api/admin/churches/:id/themes - Save/upsert church themes
// 
// Example curl tests:
// 
// Standard format (themes as array in object):
// curl -X POST http://localhost:3000/api/admin/churches/46/themes \
//   -H "Content-Type: application/json" \
//   -H "Cookie: orthodoxmetrics.sid=YOUR_SESSION_ID" \
//   -d '{"themes": [{"name": "Orthodox Traditional", "palette": {"primary": "#5B2EBF", "secondary": "#D4AF37"}}]}'
//
// Direct array format (if body is array):
// curl -X POST http://localhost:3000/api/admin/churches/46/themes \
//   -H "Content-Type: application/json" \
//   -H "Cookie: orthodoxmetrics.sid=YOUR_SESSION_ID" \
//   -d '[{"name": "Orthodox Traditional", "palette": {"primary": "#5B2EBF"}}]'
//
// Production example:
// curl -sS -X POST "https://orthodoxmetrics.com/api/admin/churches/46/themes" \
//   -H "Content-Type: application/json" \
//   -H "Cookie: orthodoxmetrics.sid=YOUR_SESSION_ID" \
//   -d '{"themes":[{"name":"Test","palette":{"primary":"#000000"}}]}' | head
//
router.post('/:id/themes', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id, 10);
    if (!churchId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid church ID' 
      });
    }

    // Validate church access
    await validateChurchAccess(churchId);

    // Debug logging to understand incoming request shape
    console.log('📥 POST /api/admin/churches/:id/themes - Request received');
    console.log('   typeof req.body:', typeof req.body);
    console.log('   typeof req.body?.themes:', typeof req.body?.themes);
    console.log('   Array.isArray(req.body):', Array.isArray(req.body));
    console.log('   Array.isArray(req.body?.themes):', Array.isArray(req.body?.themes));
    console.log('   req.body keys:', req.body ? Object.keys(req.body) : 'null');
    if (req.body?.themes) {
      console.log('   req.body.themes sample:', JSON.stringify(req.body.themes).substring(0, 200));
    }

    // Robust normalization: handle multiple input shapes
    let themes = null;
    let receivedType = 'unknown';

    // Case 1: req.body is already an array
    if (Array.isArray(req.body)) {
      themes = req.body;
      receivedType = 'array (direct)';
      console.log('✅ Normalized: Using req.body as themes array');
    }
    // Case 2: req.body.themes is an array
    else if (Array.isArray(req.body?.themes)) {
      themes = req.body.themes;
      receivedType = 'array (nested)';
      console.log('✅ Normalized: Using req.body.themes as themes array');
    }
    // Case 3: req.body.themes is a string (JSON string)
    else if (typeof req.body?.themes === 'string') {
      try {
        const parsed = JSON.parse(req.body.themes);
        if (Array.isArray(parsed)) {
          themes = parsed;
          receivedType = 'string (parsed to array)';
          console.log('✅ Normalized: Parsed JSON string to themes array');
        } else {
          receivedType = 'string (parsed but not array)';
          console.warn('⚠️  Parsed string but result is not an array:', typeof parsed);
        }
      } catch (parseError) {
        receivedType = 'string (invalid JSON)';
        console.error('❌ Failed to parse themes string:', parseError.message);
      }
    }
    // Case 4: req.body.themes is an object/map (Record<string, Theme>)
    else if (req.body?.themes && typeof req.body.themes === 'object' && !Array.isArray(req.body.themes)) {
      // Check if it looks like a single theme object (has name or palette)
      if (req.body.themes.name || req.body.themes.palette || req.body.themes.colors) {
        // It's a single theme object, wrap it in an array
        themes = [req.body.themes];
        receivedType = 'object (single theme, wrapped in array)';
        console.log('✅ Normalized: Wrapped single theme object in array');
      } else {
        // It's a map/object of themes (Record<string, Theme>) - convert to array
        const themesMap = req.body.themes;
        const themesArray = Object.values(themesMap).filter((theme) => 
          theme && (theme.name || theme.palette || theme.colors)
        );
        if (themesArray.length > 0) {
          themes = themesArray;
          receivedType = 'object (map converted to array)';
          console.log(`✅ Normalized: Converted themes map to array (${themesArray.length} themes)`);
        } else {
          // Empty object - treat as empty array
          themes = [];
          receivedType = 'object (empty map, treated as empty array)';
          console.log('✅ Normalized: Empty themes map treated as empty array');
        }
      }
    }
    // Case 5: req.body.themes exists but is not array/string/object
    else if (req.body?.themes !== undefined) {
      receivedType = typeof req.body.themes;
      console.warn('⚠️  req.body.themes exists but is not array, string, or object:', receivedType);
    }
    // Case 5: No themes found
    else {
      receivedType = 'undefined';
      console.warn('⚠️  No themes found in request body');
    }

    // Validate we have an array
    if (!themes || !Array.isArray(themes)) {
      return res.status(400).json({
        success: false,
        error: 'Themes must be an array',
        code: 'INVALID_THEMES_FORMAT',
        receivedType: receivedType,
        receivedValue: req.body?.themes !== undefined 
          ? (typeof req.body.themes === 'string' 
              ? req.body.themes.substring(0, 100) 
              : String(req.body.themes).substring(0, 100))
          : 'undefined',
        hint: 'Expected: {"themes": [...]} or [...] (direct array)'
      });
    }

    // Validate each theme has required fields
    for (let i = 0; i < themes.length; i++) {
      const theme = themes[i];
      if (!theme.name || typeof theme.name !== 'string') {
        return res.status(400).json({
          success: false,
          error: `Theme at index ${i} is missing required field: name`,
          code: 'INVALID_THEME'
        });
      }
      // Palette is optional but if present should be an object
      if (theme.palette && typeof theme.palette !== 'object') {
        return res.status(400).json({
          success: false,
          error: `Theme "${theme.name}" has invalid palette (must be an object)`,
          code: 'INVALID_PALETTE'
        });
      }
    }

    // Get user ID for updated_by
    const userId = req.user?.id || req.session?.user?.id || null;

    // Create table if it doesn't exist
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS ${APP_DB}.church_themes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        themes LONGTEXT NOT NULL DEFAULT ('[]'),
        updated_by INT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_church (church_id),
        INDEX idx_church_id (church_id),
        INDEX idx_updated_at (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ensure all required columns exist (for existing tables with old schema)
    try {
      const [columns] = await getAppPool().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'church_themes'
      `, [APP_DB]);

      const existingColumns = new Set(columns.map((c) => c.COLUMN_NAME));
      const alterStatements = [];

      if (!existingColumns.has('themes')) {
        console.log('⚠️  Adding missing "themes" column to church_themes table');
        alterStatements.push(`ADD COLUMN themes LONGTEXT NOT NULL DEFAULT ('[]') AFTER church_id`);
      }
      if (!existingColumns.has('updated_by')) {
        console.log('⚠️  Adding missing "updated_by" column to church_themes table');
        alterStatements.push(`ADD COLUMN updated_by INT NULL AFTER themes`);
      }
      if (!existingColumns.has('updated_at')) {
        console.log('⚠️  Adding missing "updated_at" column to church_themes table');
        alterStatements.push(`ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER updated_by`);
      }

      if (alterStatements.length > 0) {
        await getAppPool().query(`
          ALTER TABLE ${APP_DB}.church_themes 
          ${alterStatements.join(', ')}
        `);
        console.log(`✅ Successfully added ${alterStatements.length} column(s) in POST route`);
      }
    } catch (alterError) {
      console.warn('⚠️  Could not check/add columns in POST route:', alterError.message);
    }

    // Upsert the themes (store as JSON string in LONGTEXT column)
    await getAppPool().query(`
      INSERT INTO ${APP_DB}.church_themes
        (church_id, themes, updated_by)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        themes = VALUES(themes),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP
    `, [
      churchId,
      JSON.stringify(themes),
      userId
    ]);

    // Fetch the saved themes to return (use COALESCE for missing columns)
    const [saved] = await getAppPool().query(
      `SELECT 
        COALESCE(themes, '[]') as themes,
        COALESCE(updated_at, created_at, NOW()) as updated_at,
        updated_by
       FROM ${APP_DB}.church_themes
       WHERE church_id = ?`,
      [churchId]
    );

    let savedThemes = {}; // Default to empty object for frontend compatibility
    if (saved.length > 0 && saved[0].themes) {
      try {
        const rawThemes = saved[0].themes;
        const parsed = typeof rawThemes === 'string' ? JSON.parse(rawThemes) : rawThemes;
        // Convert array back to object map for frontend compatibility (Record<string, Theme>)
        if (Array.isArray(parsed)) {
          savedThemes = parsed.reduce((acc, theme, idx) => {
            const key = theme.name || theme.id || `theme_${idx}`;
            acc[key] = theme;
            return acc;
          }, {});
        } else if (typeof parsed === 'object' && parsed !== null) {
          // Already an object/map
          savedThemes = parsed;
        }
      } catch (parseError) {
        console.warn('⚠️  Failed to parse saved themes:', parseError);
        // Convert input themes array to object map as fallback
        savedThemes = themes.reduce((acc, theme, idx) => {
          const key = theme.name || theme.id || `theme_${idx}`;
          acc[key] = theme;
          return acc;
        }, {});
      }
    } else {
      // No saved themes, convert input array to object map
      savedThemes = themes.reduce((acc, theme, idx) => {
        const key = theme.name || theme.id || `theme_${idx}`;
        acc[key] = theme;
        return acc;
      }, {});
    }

    console.log(`✅ Themes saved for church ${churchId} by user ${userId}`);

    // Return response consistent with GET format (themes as object map)
    res.json({
      success: true,
      themes: savedThemes,
      updated_at: saved[0]?.updated_at || null,
      updated_by: saved[0]?.updated_by || userId
    });

  } catch (error) {
    console.error('❌ Error saving themes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save themes',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/admin/churches/:id/dynamic-records-config - Get dynamic records configuration
router.get('/:id/dynamic-records-config', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id, 10);
    if (!churchId) {
      return res.status(400).json({ success: false, error: 'Invalid church ID' });
    }
    
    await validateChurchAccess(churchId);
    
    // Return empty config for now - can be extended later
    res.json({ success: true, config: {} });
  } catch (error) {
    console.error('❌ Error fetching dynamic records config:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch dynamic records config'
    });
  }
});

// POST /api/admin/churches/wizard - Create church via wizard interface
router.post('/wizard', upload.single('logo'), async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const {
      church_name,
      name = church_name, // Fallback for backwards compatibility
      address,
      city,
      region,
      country,  
      phone,
      website,
      preferred_language,
      timezone,
      calendar_type,
      admin_full_name,
      admin_email,
      admin_password,
      admin_title,
      description,
      established_year,
      // Template setup options
      setup_templates = true,
      auto_setup_standard = false,
      generate_components = false,
      record_types = ['baptism', 'marriage', 'funeral'],
      template_style = 'orthodox_traditional'
    } = req.body;

    const finalChurchName = church_name || name;

    // Add debug logging
    console.info('[ChurchWizard]', { 
      requestId,
      church_name: finalChurchName, 
      email: admin_email,
      requester: req.user?.email || req.session?.user?.email
    });

    // Validate required fields
    if (!finalChurchName || !address || !city || !country || !admin_full_name || !admin_email || !admin_password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['church_name', 'address', 'city', 'country', 'admin_full_name', 'admin_email', 'admin_password']
      });
    }

    // Fixed duplicate name check - use church_name column
    const [existingChurches] = await getAppPool().query(
      'SELECT id FROM orthodoxmetrics_db.churches WHERE church_name = ? AND is_active = 1',
      [finalChurchName]
    );
    if (existingChurches.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Church name already exists (active church)'
      });
    }

    // Fixed duplicate email check  
    const [existingEmails] = await getAppPool().query(
      'SELECT id FROM orthodoxmetrics_db.churches WHERE admin_email = ? AND is_active = 1',
      [admin_email]
    );
    if (existingEmails.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Church admin email already exists (active church)'
      });
    }

    // Handle logo file
    let logoPath = null;
    if (req.file) {
      logoPath = `/uploads/church-logos/${req.file.filename}`;
    }

    // Prepare church data
    const churchData = {
      name: finalChurchName, 
      address, 
      city, 
      region, 
      country, 
      phone, 
      website,
      preferred_language, 
      timezone, 
      calendar_type,
      admin_full_name, 
      admin_email, 
      admin_password, 
      admin_title,
      description, 
      established_year, 
      logoPath
    };

    // Prepare template options
    const templateOptions = {
      setupTemplates: setup_templates,
      autoSetupStandard: auto_setup_standard,
      generateComponents: generate_components,
      recordTypes: record_types,
      templateStyle: template_style,
      includeGlobalTemplates: true,
      createCustomTemplates: false
    };

    // Use enhanced church setup service
    const setupResult = await churchSetupService.setupNewChurch(churchData, templateOptions);

    console.log(`✅ Church created via wizard: ${finalChurchName} (ID: ${setupResult.church.id}) by ${req.user?.email || req.session?.user?.email || 'System'}`);

    res.status(201).json({
      success: true,
      message: 'Church created successfully via wizard',
      church: {
        id: setupResult.church.id,
        church_name: setupResult.church.church_name,
        name: setupResult.church.church_name, // Backwards compatibility
        admin_email: setupResult.church.admin_email,
        database_name: setupResult.church.database_name
      },
      setup: setupResult.setup,
      templates: setupResult.templates
    });

  } catch (error) {
    console.error(`[ChurchWizard:${requestId}] Error:`, {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      message: error.message,
      requester: req.user?.email || req.session?.user?.email
    });
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create church via wizard' 
    });
  }
});
module.exports = router;

