// routes/admin/churches.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { promisePool } = require('../../config/db');
const { getChurchDbConnection } = require('../../utils/dbSwitcher');
const churchSetupService = require('../../services/churchSetupService'); // Add template integration

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/church-logos');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
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
    const [churches] = await promisePool.execute(`
      SELECT 
        id, name, address, city, region, country, phone, website,
        database_name, preferred_language, timezone, status,
        logo_path, description, established_year, created_at, updated_at
      FROM churches 
      ORDER BY created_at DESC
    `);

    // Get user count for each church
    for (let church of churches) {
      try {
        const churchDb = await getChurchDbConnection(church.database_name);
        const [userCount] = await churchDb.execute('SELECT COUNT(*) as count FROM users');
        church.user_count = userCount[0].count;
        
        const [recordCounts] = await churchDb.execute(`
          SELECT 
            (SELECT COUNT(*) FROM baptism_records) as baptisms,
            (SELECT COUNT(*) FROM marriage_records) as marriages,
            (SELECT COUNT(*) FROM funeral_records) as funerals
        `);
        church.record_counts = recordCounts[0];
      } catch (dbError) {
        console.error(`Error getting stats for church ${church.id}:`, dbError);
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
 * Create database schema for new church
 */
async function createChurchDatabaseSchema(churchDb) {
  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'clergy', 'staff', 'user') DEFAULT 'user',
      title VARCHAR(100),
      status ENUM('active', 'inactive') DEFAULT 'active',
      church_id INT,
      last_login TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

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

    // OCR jobs table
    `CREATE TABLE IF NOT EXISTS ocr_jobs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      church_id INT NOT NULL,
      filename VARCHAR(255) NOT NULL,
      original_filename VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_size BIGINT,
      status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
      language VARCHAR(10) DEFAULT 'en',
      record_type ENUM('baptism', 'marriage', 'funeral', 'unknown') DEFAULT 'unknown',
      confidence_score DECIMAL(3,2) DEFAULT 0.00,
      entity_confidence JSON,
      extracted_entities JSON,
      needs_review BOOLEAN DEFAULT FALSE,
      ocr_result LONGTEXT,
      ocr_result_translation LONGTEXT,
      error_message TEXT,
      processing_time INT,
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

module.exports = router;
