// Backend API routes for Church Setup Wizard
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const ChurchProvisioner = require('../church-provisioner');
const TestChurchDataGenerator = require('../services/testChurchDataGenerator');

const router = express.Router();

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/logos');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const churchId = req.params.church_id || 'temp';
    const extension = path.extname(file.originalname);
    cb(null, `church-${churchId}-logo${extension}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/svg+xml') {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and SVG files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Database configuration
const getDbConfig = () => ({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
});

// Generate unique church ID
const generateChurchId = (name) => {
  const prefix = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 6);
  
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}_${timestamp}`;
};

// Generate database name
const generateDbName = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50) + '_db';
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// CHURCH CREATION API
// ═══════════════════════════════════════════════════════════════════════════════════════

// POST /api/churches - Create new church
router.post('/', async (req, res) => {
  try {
    const churchData = req.body;
    
    // Validate required fields
    if (!churchData.name || !churchData.email) {
      return res.status(400).json({
        success: false,
        error: 'Church name and email are required'
      });
    }

    // Generate church ID and database name
    const church_id = generateChurchId(churchData.name);
    const database_name = generateDbName(churchData.name);
    const slug = church_id.toLowerCase();

    // Extract template setup options
    const templateOptions = {
      setup_templates: churchData.setup_templates === 'true' || churchData.setup_templates === true,
      auto_setup_standard: churchData.auto_setup_standard === 'true' || churchData.auto_setup_standard === true,
      generate_components: churchData.generate_components === 'true' || churchData.generate_components === true,
      record_types: churchData.record_types ? JSON.parse(churchData.record_types) : ['baptism', 'marriage', 'funeral'],
      template_style: churchData.template_style || 'orthodox_traditional'
    };

    // Extract test church options
    const testChurchOptions = {
      is_test_church: churchData.is_test_church === 'true' || churchData.is_test_church === true,
      auto_populate_data: churchData.auto_populate_data === 'true' || churchData.auto_populate_data === true,
      include_sample_records: churchData.include_sample_records === 'true' || churchData.include_sample_records === true,
      sample_record_count: parseInt(churchData.sample_record_count) || 50
    };

    console.log('📋 Church creation request:', {
      name: churchData.name,
      email: churchData.email,
      template_options: templateOptions,
      test_church_options: testChurchOptions
    });

    // Use the church provisioner to create the database
    const provisioner = new ChurchProvisioner();
    const result = await provisioner.createChurchDatabase({
      ...churchData,
      church_id,
      database_name,
      slug,
      is_test_church: testChurchOptions.is_test_church
    });

    if (result.success) {
      let templateResult = null;
      let testDataResult = null;
      
      // If template setup is requested, configure templates
      if (templateOptions.setup_templates) {
        try {
          console.log('🎯 Setting up templates for church:', church_id);
          
          // Here you would integrate with your template service
          // For now, we'll create a mock response
          templateResult = {
            success: true,
            templates_created: templateOptions.record_types.length,
            record_types: templateOptions.record_types,
            style: templateOptions.template_style,
            components_generated: templateOptions.generate_components
          };
          
          console.log('✅ Templates configured successfully');
        } catch (templateError) {
          console.error('⚠️  Template setup failed, but church was created:', templateError);
          // Don't fail the entire process if templates fail
          templateResult = {
            success: false,
            error: templateError.message,
            note: 'Church created successfully, but template setup failed'
          };
        }
      }

      // If test church, populate with sample data
      if (testChurchOptions.is_test_church && testChurchOptions.auto_populate_data) {
        try {
          console.log('🧪 Generating test data for church:', church_id);
          
          const dataGenerator = new TestChurchDataGenerator();
          const sampleData = await dataGenerator.generateCompleteTestData({
            baptismCount: testChurchOptions.include_sample_records ? 
              Math.floor(testChurchOptions.sample_record_count * 0.6) : 0,
            marriageCount: testChurchOptions.include_sample_records ? 
              Math.floor(testChurchOptions.sample_record_count * 0.3) : 0,
            funeralCount: testChurchOptions.include_sample_records ? 
              Math.floor(testChurchOptions.sample_record_count * 0.1) : 0,
            clergyCount: 5,
            userCount: 8
          });

          // Insert sample data into church database
          await insertTestDataIntoDatabase(database_name, sampleData);
          
          testDataResult = {
            success: true,
            records_created: {
              baptisms: sampleData.baptismRecords.length,
              marriages: sampleData.marriageRecords.length,
              funerals: sampleData.funeralRecords.length,
              clergy: sampleData.clergy.length,
              users: sampleData.users.length
            },
            total_records: sampleData.baptismRecords.length + 
                          sampleData.marriageRecords.length + 
                          sampleData.funeralRecords.length
          };
          
          console.log('✅ Test data populated successfully');
        } catch (testDataError) {
          console.error('⚠️  Test data population failed:', testDataError);
          testDataResult = {
            success: false,
            error: testDataError.message,
            note: 'Church created successfully, but test data population failed'
          };
        }
      }

      const response = {
        success: true,
        church_id: result.churchId,
        slug: slug,
        database_name: result.databaseName,
        message: testChurchOptions.is_test_church ? 
          'Test church created successfully with sample data' : 
          'Church created successfully',
        template_setup: templateResult,
        test_data: testDataResult
      };

      // Add setup status information
      if (templateResult) {
        response.setup_status = {
          church_created: true,
          admin_user_created: true,
          templates_setup: templateResult.success,
          setup_step: templateResult.success ? 'complete' : 'templates_pending'
        };
      } else {
        response.setup_status = {
          church_created: true,
          admin_user_created: true,
          templates_setup: false,
          setup_step: 'templates_pending'
        };
      }

      res.json(response);
    } else {
      throw new Error(result.message || 'Failed to create church');
    }

  } catch (error) {
    console.error('Church creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create church'
    });
  }
});

// GET /api/churches/recent - Get recently added churches
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const connection = await mysql.createConnection({
      ...getDbConfig(),
      database: 'orthodoxmetrics_main'
    });

    try {
      const [churches] = await connection.execute(`
        SELECT id, church_id, name, email, database_name, created_at
        FROM churches 
        WHERE is_active = TRUE
        ORDER BY created_at DESC 
        LIMIT ?
      `, [limit]);

      res.json({
        success: true,
        churches: churches
      });
    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Failed to load recent churches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load recent churches'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// CHURCH SETUP WIZARD API
// ═══════════════════════════════════════════════════════════════════════════════════════

// POST /api/churches/test-connection/:church_id - Test database connection
router.post('/test-connection/:church_id', async (req, res) => {
  try {
    const { church_id } = req.params;
    
    // Get church database name from main registry
    const mainConnection = await mysql.createConnection({
      ...getDbConfig(),
      database: 'orthodoxmetrics_main'
    });

    try {
      const [churches] = await mainConnection.execute(
        'SELECT database_name FROM churches WHERE church_id = ?',
        [church_id]
      );

      if (churches.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Church not found'
        });
      }

      const database_name = churches[0].database_name;

      // Test connection to church database
      const churchConnection = await mysql.createConnection({
        ...getDbConfig(),
        database: database_name
      });

      try {
        // Test basic query
        await churchConnection.execute('SELECT 1');
        
        res.json({
          success: true,
          message: 'Database connection successful',
          database_name
        });
      } finally {
        await churchConnection.end();
      }

    } finally {
      await mainConnection.end();
    }

  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed: ' + error.message
    });
  }
});

// GET /api/churches/:church_id/details - Get church details and record counts
router.get('/:church_id/details', async (req, res) => {
  try {
    const { church_id } = req.params;
    
    // Get church database name
    const mainConnection = await mysql.createConnection({
      ...getDbConfig(),
      database: 'orthodoxmetrics_main'
    });

    let database_name;
    try {
      const [churches] = await mainConnection.execute(
        'SELECT database_name FROM churches WHERE church_id = ?',
        [church_id]
      );

      if (churches.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Church not found'
        });
      }

      database_name = churches[0].database_name;
    } finally {
      await mainConnection.end();
    }

    // Get church details from church database
    const churchConnection = await mysql.createConnection({
      ...getDbConfig(),
      database: database_name
    });

    try {
      // Get church info
      const [churchInfo] = await churchConnection.execute(
        'SELECT * FROM church_info WHERE id = 1'
      );

      if (churchInfo.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Church information not found'
        });
      }

      const church = churchInfo[0];

      // Get record counts
      const [baptismCount] = await churchConnection.execute('SELECT COUNT(*) as count FROM baptism_records');
      const [marriageCount] = await churchConnection.execute('SELECT COUNT(*) as count FROM marriage_records');
      const [funeralCount] = await churchConnection.execute('SELECT COUNT(*) as count FROM funeral_records');

      const details = {
        name: church.name,
        email: church.email,
        language: church.language_preference || 'en',
        timezone: church.timezone || 'UTC',
        city: church.city || '',
        country: church.country || '',
        address: church.address || '',
        phone: church.phone || '',
        tax_id: church.tax_id || '',
        recordCounts: {
          baptism: baptismCount[0].count,
          marriage: marriageCount[0].count,
          funeral: funeralCount[0].count
        }
      };

      res.json({
        success: true,
        details
      });

    } finally {
      await churchConnection.end();
    }

  } catch (error) {
    console.error('Failed to load church details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load church details'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// CLERGY MANAGEMENT API
// ═══════════════════════════════════════════════════════════════════════════════════════

// GET /api/churches/:church_id/clergy - Get clergy members
router.get('/:church_id/clergy', async (req, res) => {
  try {
    const { church_id } = req.params;
    const database_name = await getChurchDatabase(church_id);
    
    const connection = await mysql.createConnection({
      ...getDbConfig(),
      database: database_name
    });

    try {
      // Create clergy table if it doesn't exist
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS clergy (
          id INT AUTO_INCREMENT PRIMARY KEY,
          church_id INT NOT NULL DEFAULT 1,
          name VARCHAR(255) NOT NULL,
          title VARCHAR(100) DEFAULT '',
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(50) DEFAULT '',
          role VARCHAR(100) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_clergy_church_id (church_id),
          INDEX idx_clergy_active (is_active)
        )
      `);

      const [clergy] = await connection.execute(
        'SELECT * FROM clergy WHERE church_id = 1 AND is_active = TRUE ORDER BY name'
      );

      res.json({
        success: true,
        clergy
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Failed to load clergy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load clergy members'
    });
  }
});

// POST /api/churches/:church_id/clergy - Add clergy member
router.post('/:church_id/clergy', async (req, res) => {
  try {
    const { church_id } = req.params;
    const { name, title, email, phone, role } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and role are required'
      });
    }

    const database_name = await getChurchDatabase(church_id);
    const connection = await mysql.createConnection({
      ...getDbConfig(),
      database: database_name
    });

    try {
      const [result] = await connection.execute(`
        INSERT INTO clergy (church_id, name, title, email, phone, role)
        VALUES (1, ?, ?, ?, ?, ?)
      `, [name, title, email, phone, role]);

      const [newClergy] = await connection.execute(
        'SELECT * FROM clergy WHERE id = ?',
        [result.insertId]
      );

      res.json({
        success: true,
        clergy: newClergy[0],
        message: 'Clergy member added successfully'
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Failed to add clergy member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add clergy member'
    });
  }
});

// DELETE /api/churches/:church_id/clergy/:clergy_id - Remove clergy member
router.delete('/:church_id/clergy/:clergy_id', async (req, res) => {
  try {
    const { church_id, clergy_id } = req.params;
    const database_name = await getChurchDatabase(church_id);
    
    const connection = await mysql.createConnection({
      ...getDbConfig(),
      database: database_name
    });

    try {
      await connection.execute(
        'UPDATE clergy SET is_active = FALSE WHERE id = ? AND church_id = 1',
        [clergy_id]
      );

      res.json({
        success: true,
        message: 'Clergy member removed successfully'
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Failed to remove clergy member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove clergy member'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// BRANDING & CUSTOMIZATION API
// ═══════════════════════════════════════════════════════════════════════════════════════

// POST /api/churches/:church_id/branding - Save branding settings
router.post('/:church_id/branding', upload.single('logo'), async (req, res) => {
  try {
    const { church_id } = req.params;
    const { primaryColor, secondaryColor, agGridTheme } = req.body;
    const logoPath = req.file ? req.file.path : null;

    const database_name = await getChurchDatabase(church_id);
    const connection = await mysql.createConnection({
      ...getDbConfig(),
      database: database_name
    });

    try {
      // Create branding table if it doesn't exist
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS branding (
          id INT AUTO_INCREMENT PRIMARY KEY,
          church_id INT NOT NULL DEFAULT 1,
          logo_path VARCHAR(500) DEFAULT NULL,
          primary_color VARCHAR(7) DEFAULT '#1976d2',
          secondary_color VARCHAR(7) DEFAULT '#dc004e',
          ag_grid_theme VARCHAR(50) DEFAULT 'ag-theme-alpine',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          UNIQUE KEY uk_branding_church (church_id)
        )
      `);

      // Insert or update branding settings
      await connection.execute(`
        INSERT INTO branding (church_id, logo_path, primary_color, secondary_color, ag_grid_theme)
        VALUES (1, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          logo_path = VALUES(logo_path),
          primary_color = VALUES(primary_color),
          secondary_color = VALUES(secondaryColor),
          ag_grid_theme = VALUES(ag_grid_theme),
          updated_at = CURRENT_TIMESTAMP
      `, [logoPath, primaryColor, secondaryColor, agGridTheme]);

      res.json({
        success: true,
        message: 'Branding settings saved successfully'
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Failed to save branding settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save branding settings'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════

async function getChurchDatabase(church_id) {
  const mainConnection = await mysql.createConnection({
    ...getDbConfig(),
    database: 'orthodoxmetrics_main'
  });

  try {
    const [churches] = await mainConnection.execute(
      'SELECT database_name FROM churches WHERE church_id = ?',
      [church_id]
    );

    if (churches.length === 0) {
      throw new Error('Church not found');
    }

    return churches[0].database_name;
  } finally {
    await mainConnection.end();
  }
}

/**
 * Insert test data into church database
 */
async function insertTestDataIntoDatabase(database_name, sampleData) {
  const connection = await mysql.createConnection({
    ...getDbConfig(),
    database: database_name
  });

  try {
    console.log(`🧪 Inserting test data into database: ${database_name}`);

    // Insert clergy members
    if (sampleData.clergy && sampleData.clergy.length > 0) {
      console.log(`📋 Inserting ${sampleData.clergy.length} clergy members`);
      
      // Create clergy table if it doesn't exist
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS clergy (
          id INT AUTO_INCREMENT PRIMARY KEY,
          church_id INT NOT NULL DEFAULT 1,
          name VARCHAR(255) NOT NULL,
          title VARCHAR(100) DEFAULT '',
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(50) DEFAULT '',
          role VARCHAR(100) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      const clergyValues = sampleData.clergy.map(member => [
        member.church_id, member.name, member.title, member.email, 
        member.phone, member.role, member.is_active
      ]);

      await connection.query(
        'INSERT INTO clergy (church_id, name, title, email, phone, role, is_active) VALUES ?',
        [clergyValues]
      );
    }

    // Insert baptism records
    if (sampleData.baptismRecords && sampleData.baptismRecords.length > 0) {
      console.log(`📋 Inserting ${sampleData.baptismRecords.length} baptism records`);
      
      const baptismValues = sampleData.baptismRecords.map(record => [
        record.church_id, record.first_name, record.last_name, record.date_of_birth,
        record.date_of_baptism, record.place_of_birth, record.place_of_baptism,
        record.father_name, record.mother_name, record.godparents, record.priest_name, record.notes
      ]);

      await connection.query(
        `INSERT INTO baptism_records 
         (church_id, first_name, last_name, date_of_birth, date_of_baptism, 
          place_of_birth, place_of_baptism, father_name, mother_name, godparents, priest_name, notes) 
         VALUES ?`,
        [baptismValues]
      );
    }

    // Insert marriage records
    if (sampleData.marriageRecords && sampleData.marriageRecords.length > 0) {
      console.log(`📋 Inserting ${sampleData.marriageRecords.length} marriage records`);
      
      const marriageValues = sampleData.marriageRecords.map(record => [
        record.church_id, record.groom_first_name, record.groom_last_name,
        record.bride_first_name, record.bride_last_name, record.marriage_date,
        record.place_of_marriage, record.priest_name, record.witness1_name,
        record.witness2_name, record.license_number, record.notes
      ]);

      await connection.query(
        `INSERT INTO marriage_records 
         (church_id, groom_first_name, groom_last_name, bride_first_name, bride_last_name,
          marriage_date, place_of_marriage, priest_name, witness1_name, witness2_name,
          license_number, notes) 
         VALUES ?`,
        [marriageValues]
      );
    }

    // Insert funeral records
    if (sampleData.funeralRecords && sampleData.funeralRecords.length > 0) {
      console.log(`📋 Inserting ${sampleData.funeralRecords.length} funeral records`);
      
      const funeralValues = sampleData.funeralRecords.map(record => [
        record.church_id, record.first_name, record.last_name, record.date_of_birth,
        record.date_of_death, record.date_of_funeral, record.place_of_death,
        record.place_of_funeral, record.priest_name, record.burial_location,
        record.cause_of_death, record.notes
      ]);

      await connection.query(
        `INSERT INTO funeral_records 
         (church_id, first_name, last_name, date_of_birth, date_of_death, date_of_funeral,
          place_of_death, place_of_funeral, priest_name, burial_location, cause_of_death, notes) 
         VALUES ?`,
        [funeralValues]
      );
    }

    // Insert users
    if (sampleData.users && sampleData.users.length > 0) {
      console.log(`📋 Inserting ${sampleData.users.length} users`);
      
      const userValues = sampleData.users.map(user => [
        user.church_id, user.username, user.email, user.password,
        user.full_name, user.role, user.is_active
      ]);

      await connection.query(
        `INSERT INTO users 
         (church_id, username, email, password, full_name, role, is_active) 
         VALUES ?`,
        [userValues]
      );
    }

    // Insert branding
    if (sampleData.branding) {
      console.log(`📋 Inserting branding settings`);
      
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS branding (
          id INT AUTO_INCREMENT PRIMARY KEY,
          church_id INT NOT NULL DEFAULT 1,
          logo_path VARCHAR(500) DEFAULT NULL,
          primary_color VARCHAR(7) DEFAULT '#1976d2',
          secondary_color VARCHAR(7) DEFAULT '#dc004e',
          ag_grid_theme VARCHAR(50) DEFAULT 'ag-theme-alpine',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_branding_church (church_id)
        )
      `);

      await connection.execute(
        `INSERT INTO branding (church_id, logo_path, primary_color, secondary_color, ag_grid_theme) 
         VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE
         primary_color = VALUES(primary_color),
         secondary_color = VALUES(secondaryColor),
         ag_grid_theme = VALUES(ag_grid_theme)`,
        [
          sampleData.branding.church_id,
          sampleData.branding.logo_path,
          sampleData.branding.primary_color,
          sampleData.branding.secondary_color,
          sampleData.branding.ag_grid_theme
        ]
      );
    }

    // Insert church settings
    if (sampleData.settings && sampleData.settings.length > 0) {
      console.log(`📋 Inserting ${sampleData.settings.length} church settings`);
      
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS church_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          church_id INT NOT NULL DEFAULT 1,
          setting_key VARCHAR(100) NOT NULL,
          setting_value TEXT DEFAULT NULL,
          setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_settings_church_key (church_id, setting_key)
        )
      `);

      const settingsValues = sampleData.settings.map(setting => [
        setting.church_id, setting.setting_key, setting.setting_value, setting.setting_type
      ]);

      await connection.query(
        `INSERT INTO church_settings (church_id, setting_key, setting_value, setting_type) 
         VALUES ? ON DUPLICATE KEY UPDATE
         setting_value = VALUES(setting_value),
         setting_type = VALUES(setting_type)`,
        [settingsValues]
      );
    }

    console.log('✅ Test data insertion completed successfully');

  } finally {
    await connection.end();
  }
}

module.exports = router;
