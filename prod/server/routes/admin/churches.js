// routes/admin/churches.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { getAppPool } = require('../../config/db');
const { getChurchDbConnection } = require('../../src/utils/dbSwitcher');
const churchSetupService = require('../../src/services/churchSetupService'); // Add template integration

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
    fileSize: 5 * 1024 * 1024, // 5MB limit
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
      'SELECT id FROM churches WHERE name = ? AND is_active = 1',
      [name]
    );
    if (existingChurches.length > 0) {
      return res.status(400).json({
        error: 'Church name already exists (active church)'
      });
    }
    // Duplicate email check (only among active churches)
    const [existingEmails] = await getAppPool().query(
      'SELECT id FROM churches WHERE admin_email = ? AND is_active = 1',
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
        id, name, email, phone, address, city, state_province, postal_code, country, 
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
        
        const [userCount] = await churchDb.execute('SELECT COUNT(*) as count FROM orthodoxmetrics_auth_db.users');
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
      'SELECT id, name, database_name, db_user FROM churches WHERE id = ?',
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
    await getAppPool().query('UPDATE orthodoxmetrics_auth_db.users SET church_id = NULL WHERE church_id = ?', [churchId]);
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
        'SELECT id, name, database_name FROM churches WHERE id = ? AND is_active = 1',
        [churchId]
    );
    
    if (churches.length === 0) {
        throw new Error('Church not found or inactive');
    }
    
    return churches[0];
}

// GET /api/admin/churches/:id/debug - Debug church database connection
router.get('/:id/debug', async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);
        console.log('🐛 Debug: Getting church info for ID:', churchId);

        // Check what's actually in the church record
        const [churches] = await getAppPool().query(
            'SELECT * FROM orthodoxmetrics_db.churches WHERE id = ?',
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

// GET /api/admin/churches/:id/tables - Get available tables for a church
router.get('/:id/tables', async (req, res) => {
    try {
        const churchId = req.params.id;
        
        // Get church details
        const [churchResult] = await getAppPool().query(
            'SELECT id, name, database_name FROM churches WHERE id = ?',
            [churchId]
        );
        
        if (churchResult.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Church not found'
            });
        }
        
        const church = churchResult[0];
        const database_name = church.database_name;
        
        // Get list of tables in the church database
        const [tables] = await getAppPool().query(`
            SELECT 
                TABLE_NAME as name,
                TABLE_ROWS as row_count,
                ROUND(DATA_LENGTH / 1024 / 1024, 2) as size_mb,
                TABLE_COMMENT as comment
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME
        `, [database_name]);
        
        // Filter to only include relevant tables (exclude system tables)
        const relevantTables = tables.filter(table => {
            const tableName = table.name.toLowerCase();
            return tableName.includes('baptism') || 
                   tableName.includes('marriage') || 
                   tableName.includes('funeral') ||
                   tableName.includes('member') ||
                   tableName.includes('family') ||
                   tableName.includes('donation') ||
                   tableName.includes('event');
        });
        
        res.json({
            success: true,
            tables: relevantTables.length > 0 ? relevantTables : tables,
            total_tables: tables.length,
            database_name: database_name
        });
        
    } catch (error) {
        console.error('❌ Error fetching church tables:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch church tables'
        });
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
            'SELECT id, name, database_name FROM churches WHERE id = ?',
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

module.exports = router;
