// routes/ocr.js
// ⚠️  DEPRECATED: Legacy OCR routes
// These routes are deprecated in favor of church-scoped routes in server/src/index.ts
// New code should use /api/church/:churchId/ocr/* endpoints
// This file is kept for backward compatibility but will be removed in a future version

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const router = express.Router();

// Detect context (dist vs source) for module loading
const isDist = __dirname.includes(path.sep + 'dist' + path.sep);

// Import the church OCR controller
const churchOcrController = require('../controllers/churchOcrController');

// Store uploads in 'uploads/' folder
const storage = multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// POST /api/ocr/upload (legacy route)
router.post('/upload', upload.single('image'), async (req, res) => {
    const imagePath = path.resolve(__dirname, '..', 'uploads', req.file.filename);

    console.log(`🖼 Uploaded file saved: ${imagePath}`);

    // Run the OCR pipeline
    exec('python3 ocr_pipeline.py', (err, stdout, stderr) => {
        if (err) {
            console.error(`❌ OCR error: ${stderr}`);
            return res.status(500).json({ error: 'OCR processing failed' });
        }

        console.log(`✅ OCR stdout: ${stdout}`);
        res.json({
            message: 'OCR processing complete',
            filename: req.file.filename,
            sqlFile: `/exports/sql/${req.file.filename.replace(/\.[^.]+$/, '.sql')}`
        });
    });
});

// GET /api/ocr/jobs - Get list of OCR jobs
// ⚠️  DEPRECATED: Use GET /api/church/:churchId/ocr/jobs instead
router.get('/jobs', async (req, res) => {
  console.warn('[DEPRECATED] /api/ocr/jobs is deprecated. Use GET /api/church/:churchId/ocr/jobs instead.');
  
  // Return 410 Gone with migration message
  return res.status(410).json({
    error: 'This endpoint has been deprecated',
    message: 'Please use GET /api/church/:churchId/ocr/jobs instead',
    migration_guide: 'https://docs.orthodoxmetrics.com/ocr/migration'
  });
  try {
    const { churchId } = req.query;
    
    if (!churchId) {
      return res.status(400).json({ 
        error: 'churchId is required',
        jobs: []
      });
    }

    const { promisePool } = require('../config/db');
    
    // Validate church exists
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ 
        error: 'Church not found',
        jobs: []
      });
    }

    // Get church database connection
    let dbSwitcherModule;
    if (isDist) {
      dbSwitcherModule = require('../utils/dbSwitcher');
    } else {
      try {
        dbSwitcherModule = require('../utils/dbSwitcher');
      } catch (e) {
        dbSwitcherModule = require('../utils/dbSwitcher');
      }
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Get OCR jobs - check if error column exists first
    let jobs;
    try {
      // Try with error column first
      [jobs] = await db.query(`
        SELECT 
          id, filename, original_filename as originalFilename, status, 
          record_type as recordType, language, confidence_score as confidenceScore,
          file_size as fileSize, mime_type as fileType, pages,
          created_at as createdAt, updated_at as updatedAt,
          church_id as churchId, error
        FROM ocr_jobs 
        WHERE church_id = ?
        ORDER BY created_at DESC
        LIMIT 100
      `, [churchId]);
    } catch (err) {
      // If error column doesn't exist, query without it
      if (err.code === 'ER_BAD_FIELD_ERROR' && err.message.includes('error')) {
        [jobs] = await db.query(`
          SELECT 
            id, filename, original_filename as originalFilename, status, 
            record_type as recordType, language, confidence_score as confidenceScore,
            file_size as fileSize, mime_type as fileType, pages,
            created_at as createdAt, updated_at as updatedAt,
            church_id as churchId
          FROM ocr_jobs 
          WHERE church_id = ?
          ORDER BY created_at DESC
          LIMIT 100
        `, [churchId]);
      } else {
        throw err;
      }
    }

    // Read Job Bundle manifests for all jobs to get authoritative status
    let jobBundleModule = null;
    const manifestMap = new Map(); // jobId -> manifest
    
    try {
      try {
        jobBundleModule = require('../utils/jobBundle');
      } catch (e) {
        try {
          jobBundleModule = require('../utils/jobBundle');
        } catch (e2) {
          jobBundleModule = null;
        }
      }
      
      if (jobBundleModule) {
        const { tryReadManifest } = jobBundleModule;
        // Read manifests for all jobs in parallel (only if they exist - don't create defaults)
        const manifestPromises = (jobs || []).map(async (job) => {
          try {
            const manifest = await tryReadManifest(churchId, String(job.id));
            if (manifest) {
              manifestMap.set(job.id, manifest);
            }
            // If manifest is null, it doesn't exist - that's fine, we'll use DB status
          } catch (bundleError) {
            // Non-blocking - if read fails, use DB status
            console.log(`[OCR Jobs List] Could not read manifest for job ${job.id} (non-blocking):`, bundleError.message);
          }
        });
        await Promise.all(manifestPromises);
        console.log(`[OCR Jobs List] Loaded ${manifestMap.size} manifests from Job Bundle (${jobs.length} total jobs)`);
      }
    } catch (bundleError) {
      console.warn(`[OCR Jobs List] Job Bundle read failed (non-blocking):`, bundleError.message);
    }

    // Convert to expected format, prioritizing bundle status over DB status
    const formattedJobs = (jobs || []).map(job => {
      const manifest = manifestMap.get(job.id);
      return {
        id: job.id.toString(),
        filename: job.filename,
        originalFilename: job.originalFilename,
        // Bundle status is source of truth, fallback to DB status
        status: manifest?.status || job.status || 'pending',
        recordType: manifest?.recordType || job.recordType,
        language: job.language,
        confidenceScore: job.confidenceScore,
        fileSize: job.fileSize,
        fileType: job.fileType,
        pages: job.pages,
        createdAt: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: manifest?.updatedAt || (job.updatedAt ? new Date(job.updatedAt).toISOString() : new Date().toISOString()),
        churchId: job.churchId,
        error: job.error,
        // Include bundle metadata if available
        page_year: manifest?.page_year || null,
        draftCounts: manifest?.draftCounts || null,
      };
    });

    res.json({
      jobs: formattedJobs
    });

  } catch (error) {
    console.error('Error in /api/ocr/jobs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch OCR jobs',
      details: error.message,
      jobs: []
    });
  }
});

// POST /api/ocr/jobs/upload - New route for OCR Studio page (handles multiple files)
// This route expects FormData with:
// - files: array of files
// - churchId: optional church ID
// - settings: optional JSON string with OCR settings
router.post('/jobs/upload', async (req, res) => {
  // Use a temporary storage first, then we'll organize by churchId after parsing
  const tempStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
      // Use absolute path: /var/www/orthodoxmetrics/prod/server/uploads/ocr/temp
      const baseUploadPath = process.env.UPLOAD_BASE_PATH || '/var/www/orthodoxmetrics/prod/server/uploads';
      const uploadDir = path.join(baseUploadPath, 'ocr', 'temp');
      try {
        const fs = require('fs').promises;
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const crypto = require('crypto');
      const fileHash = crypto.randomBytes(8).toString('hex');
      cb(null, `ocr_${uniqueSuffix}_${fileHash}${path.extname(file.originalname)}`);
    }
  });

  const tempUpload = multer({
    storage: tempStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|webp|pdf/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image and PDF files are allowed'));
      }
    }
  });

  // Use fields to get both churchId and files
  tempUpload.fields([
    { name: 'files', maxCount: 10 },
    { name: 'churchId', maxCount: 1 },
    { name: 'settings', maxCount: 1 }
  ])(req, res, async () => {
    try {
      // Extract churchId from form data
      let churchId = req.body.churchId ? parseInt(req.body.churchId) : null;
      
      // If churchId is missing, try to get it from the user's session/profile
      if (!churchId) {
        // Check session user first
        const sessionUser = req.session?.user;
        if (sessionUser?.church_id) {
          churchId = parseInt(sessionUser.church_id);
          console.log(`[OCR Upload] Resolved churchId from session user: ${churchId}`);
        } else if (sessionUser?.id) {
          // If we have user ID but no church_id in session, fetch from database
          try {
            const { promisePool } = require('../config/db');
            const [userRows] = await promisePool.query(
              'SELECT church_id FROM users WHERE id = ?',
              [sessionUser.id]
            );
            if (userRows.length > 0 && userRows[0].church_id) {
              churchId = parseInt(userRows[0].church_id);
              console.log(`[OCR Upload] Resolved churchId from database for user ${sessionUser.id}: ${churchId}`);
            }
          } catch (dbError) {
            console.warn('[OCR Upload] Could not fetch church_id from database:', dbError.message);
          }
        }
      }
      
      // Validate churchId - reject only if:
      // 1. User is admin/superadmin and didn't provide one, OR
      // 2. User is priest but has no assigned church_id
      if (!churchId) {
        const userRole = req.session?.user?.role || req.user?.role;
        const isAdmin = userRole === 'admin' || userRole === 'super_admin';
        const isPriest = userRole === 'priest';
        
        if (isAdmin) {
          return res.status(400).json({ 
            error: 'churchId is required. Please select a church.',
            jobs: []
          });
        } else if (isPriest) {
          return res.status(400).json({ 
            error: 'churchId is required. Your account is not assigned to a church. Please contact an administrator.',
            jobs: []
          });
        } else {
          return res.status(400).json({ 
            error: 'churchId is required',
            jobs: []
          });
        }
      }

      // Get files from the fields
      const files = req.files?.files || [];
      
      console.log('🔄 OCR Jobs Upload request received:', {
        fileCount: files.length,
        churchId: churchId,
        hasSettings: !!req.body.settings,
        files: files.map(f => ({
          originalname: f.originalname,
          size: f.size,
          mimetype: f.mimetype
        }))
      });

      if (!files || files.length === 0) {
        return res.status(400).json({ 
          error: 'No files provided',
          jobs: []
        });
      }

      let settings = null;
      
      if (req.body.settings) {
        try {
          settings = typeof req.body.settings === 'string' 
            ? JSON.parse(req.body.settings) 
            : req.body.settings;
        } catch (e) {
          console.warn('Failed to parse settings:', e);
        }
      }

      // Move files to church-specific directory
      // Check for per-church ocr_base_dir override, else use default
      const fsPromises = require('fs').promises;
      const { promisePool: mainPool } = require('../config/db');
      const [churchPathRows] = await mainPool.query(
        'SELECT ocr_base_dir FROM churches WHERE id = ?', [churchId]
      );
      const churchOcrBaseDir = churchPathRows.length > 0 && churchPathRows[0].ocr_base_dir
        ? churchPathRows[0].ocr_base_dir
        : null;
      const baseUploadPath = process.env.UPLOAD_BASE_PATH || '/var/www/orthodoxmetrics/prod/server/uploads';
      const effectiveOcrBase = churchOcrBaseDir || path.join(baseUploadPath, `om_church_${churchId}`);
      const churchUploadDir = path.join(effectiveOcrBase, 'uploaded');
      await fsPromises.mkdir(churchUploadDir, { recursive: true });
      
      // Move each file to the church directory
      for (const file of files) {
        const newPath = path.join(churchUploadDir, path.basename(file.filename));
        await fsPromises.rename(file.path, newPath);
        file.path = newPath; // Update the path for database storage
      }

    // Process each file - create OCR jobs
    const jobs = [];
    const { promisePool } = require('../config/db');
    
    // Validate church exists
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ 
        error: 'Church not found',
        jobs: []
      });
    }

    // Get church database connection
    let dbSwitcherModule;
    if (isDist) {
      dbSwitcherModule = require('../utils/dbSwitcher');
    } else {
      try {
        dbSwitcherModule = require('../utils/dbSwitcher');
      } catch (e) {
        dbSwitcherModule = require('../utils/dbSwitcher');
      }
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

      // Process each uploaded file
      for (const file of files) {
      try {
        const recordType = settings?.recordType || 'baptism';
        const language = settings?.language || 'en';
        const enablePreprocessing = settings?.enablePreprocessing !== false;

        // Create OCR job record
        // Check table structure - some tables use file_name instead of filename
        // Try the standard schema first, fallback if columns don't match
        let jobId;
        try {
          // Try with standard column names (if table was created with our schema)
          const [result] = await db.query(`
            INSERT INTO ocr_jobs (
              church_id, filename, original_filename, file_path, file_size, mime_type, status, 
              record_type, language, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())
          `, [
            churchId,
            file.filename,
            file.originalname,
            file.path,
            file.size,
            file.mimetype,
            recordType,
            language
          ]);
          jobId = result.insertId;
        } catch (insertError) {
          // If columns don't match, try with alternative schema (file_name instead of filename)
          if (insertError.code === 'ER_BAD_FIELD_ERROR' || insertError.message.includes('Unknown column')) {
            try {
              // Try with file_name (alternative schema)
              const [result] = await db.query(`
                INSERT INTO ocr_jobs (
                  church_id, file_name, file_path, status, 
                  record_type, language_detected, created_at
                ) VALUES (?, ?, ?, 'pending', ?, ?, NOW())
              `, [
                churchId,
                file.originalname || file.filename,
                file.path,
                recordType,
                language
              ]);
              jobId = result.insertId;
            } catch (altError) {
              console.error(`Error creating OCR job for ${file.originalname}:`, altError);
              throw altError;
            }
          } else {
            console.error(`Error creating OCR job for ${file.originalname}:`, insertError);
            throw insertError;
          }
        }

        console.log(`📝 OCR job ${jobId} created for file ${file.originalname}, status: pending`);

        // Initialize Job Bundle manifest (best-effort, non-blocking)
        try {
          let jobBundleModule = null;
          if (isDist) {
            try {
              jobBundleModule = require('../utils/jobBundle');
            } catch (e) {
              jobBundleModule = null;
            }
          } else {
            try {
              jobBundleModule = require('../utils/jobBundle');
            } catch (e) {
              try {
                jobBundleModule = require('../utils/jobBundle');
              } catch (e2) {
                jobBundleModule = null;
              }
            }
          }
          
          if (jobBundleModule) {
            const { readManifest } = jobBundleModule;
            // Create manifest with job details
            await readManifest(churchId, String(jobId), {
              recordType: recordType,
              status: 'pending',
            });
            console.log(`[JobBundle] Initialized manifest for job ${jobId} (church ${churchId})`);
          }
        } catch (bundleError) {
          console.warn(`[JobBundle] Could not initialize manifest for job ${jobId} (non-blocking):`, bundleError.message);
        }

        jobs.push({
          id: jobId.toString(),
          filename: file.filename,
          originalFilename: file.originalname,
          status: 'pending',
          churchId: churchId,
          createdAt: new Date().toISOString()
        });

        // Trigger background OCR processing with Google Vision AI
        // Process asynchronously so we don't block the response
        processOcrJobAsync(db, jobId, file.path, {
          language: language,
          recordType: recordType,
          engine: settings?.engine || 'google-vision',
          churchId: churchId
        }).catch(error => {
          console.error(`❌ Background OCR processing failed for job ${jobId}:`, error);
        });

      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        // Continue with other files even if one fails
      }
    }

      console.log(`✅ Created ${jobs.length} OCR jobs from ${files.length} files`);

      res.json({
        success: true,
        jobs: jobs,
        message: `Successfully uploaded ${jobs.length} file(s) for OCR processing`
      });

    } catch (error) {
      console.error('Error in /api/ocr/jobs/upload:', error);
      res.status(500).json({ 
        error: 'Failed to upload files for OCR processing',
        details: error.message,
        jobs: []
      });
    }
  });
});

/**
 * GET /api/ocr/settings
 * Get OCR settings (global or church-specific)
 */
router.get('/settings', async (req, res) => {
  try {
    const churchId = req.query.churchId ? parseInt(req.query.churchId) : null;
    
    console.log(`[OCR Settings] GET /api/ocr/settings - churchId: ${churchId} (type: ${typeof churchId})`);
    
    // Default settings
    const defaultSettings = {
      engine: 'google-vision',
      language: 'eng',
      defaultLanguage: 'en',
      dpi: 300,
      deskew: true,
      removeNoise: true,
      preprocessImages: true,
      outputFormat: 'json',
      confidenceThreshold: 75
    };

    // If churchId provided, try to get church-specific settings
    if (churchId) {
      const { promisePool } = require('../config/db');
      
      // Validate church exists
      const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
      if (churchRows.length) {
        // Get church database connection
        let dbSwitcherModule;
        try {
          dbSwitcherModule = require('../utils/dbSwitcher');
        } catch (e) {
          dbSwitcherModule = require('../utils/dbSwitcher');
        }
        const { getChurchDbConnection } = dbSwitcherModule;
        const db = await getChurchDbConnection(churchRows[0].database_name);

        // Try to get settings from ocr_settings table
        try {
          const [settingsRows] = await db.query(`
            SELECT 
              engine, language, dpi, deskew, remove_noise, preprocess_images, output_format,
              confidence_threshold, default_language, preprocessing_enabled, auto_rotate, noise_reduction
            FROM ocr_settings 
            WHERE church_id = ?
            ORDER BY updated_at DESC
            LIMIT 1
          `, [churchId]);

          if (settingsRows.length > 0) {
            const s = settingsRows[0];
            // Map database columns to frontend format, with fallbacks
            const loadedSettings = {
              engine: s.engine || defaultSettings.engine,
              language: s.language || defaultSettings.language,
              defaultLanguage: s.default_language || 'en',
              dpi: s.dpi || defaultSettings.dpi,
              deskew: s.deskew !== undefined ? Boolean(s.deskew) : (s.auto_rotate !== undefined ? Boolean(s.auto_rotate) : defaultSettings.deskew),
              removeNoise: s.remove_noise !== undefined ? Boolean(s.remove_noise) : (s.noise_reduction !== undefined ? Boolean(s.noise_reduction) : defaultSettings.removeNoise),
              preprocessImages: s.preprocess_images !== undefined ? Boolean(s.preprocess_images) : (s.preprocessing_enabled !== undefined ? Boolean(s.preprocessing_enabled) : defaultSettings.preprocessImages),
              outputFormat: s.output_format || defaultSettings.outputFormat,
              confidenceThreshold: s.confidence_threshold !== null && s.confidence_threshold !== undefined ? Math.round(Number(s.confidence_threshold) * 100) : defaultSettings.confidenceThreshold
            };
            console.log(`[OCR Settings] Loaded settings for church ${churchId}:`, loadedSettings);
            return res.json(loadedSettings);
          } else {
            console.log(`[OCR Settings] No saved settings found for church ${churchId}, using defaults`);
          }
        } catch (dbError) {
          console.warn('OCR settings table may not exist, using defaults:', dbError.message);
        }
      }
    }

    // If no churchId, try to load global settings
    if (!churchId) {
      try {
        const { promisePool } = require('../config/db');
        const [globalRows] = await promisePool.query(`
          SELECT 
            engine, language, default_language, dpi, deskew, remove_noise, preprocess_images, output_format,
            confidence_threshold
          FROM ocr_global_settings 
          ORDER BY updated_at DESC
          LIMIT 1
        `);
        
        if (globalRows.length > 0) {
          const s = globalRows[0];
          const loadedSettings = {
            engine: s.engine || defaultSettings.engine,
            language: s.language || defaultSettings.language,
            dpi: s.dpi || defaultSettings.dpi,
            deskew: s.deskew !== undefined ? Boolean(s.deskew) : defaultSettings.deskew,
            removeNoise: s.remove_noise !== undefined ? Boolean(s.remove_noise) : defaultSettings.removeNoise,
            preprocessImages: s.preprocess_images !== undefined ? Boolean(s.preprocess_images) : defaultSettings.preprocessImages,
            outputFormat: s.output_format || defaultSettings.outputFormat,
            confidenceThreshold: s.confidence_threshold ? Math.round(s.confidence_threshold * 100) : defaultSettings.confidenceThreshold
          };
          console.log(`[OCR Settings] Loaded global settings:`, loadedSettings);
          return res.json(loadedSettings);
        }
      } catch (globalError) {
        // Table doesn't exist yet - this is expected on first run, don't log as error
        if (globalError.code !== 'ER_NO_SUCH_TABLE') {
          console.warn('Global settings table error:', globalError.message);
        }
      }
    }
    
    // Return default settings
    res.json(defaultSettings);
  } catch (error) {
    console.error('Error fetching OCR settings:', error);
    res.status(500).json({
      error: 'Failed to fetch OCR settings',
      message: error.message
    });
  }
});

/**
 * PUT /api/ocr/settings
 * Update OCR settings (global or church-specific)
 */
router.put('/settings', async (req, res) => {
  try {
    const churchId = req.body.churchId ? parseInt(req.body.churchId) : null;
    const settings = { ...req.body };
    delete settings.churchId; // Remove churchId from settings object
    
    console.log(`[OCR Settings] PUT /api/ocr/settings - churchId: ${churchId} (type: ${typeof churchId}), settings:`, JSON.stringify(settings));
    
    // Validate required fields
    if (!settings.engine || !settings.language) {
      return res.status(400).json({
        error: 'Invalid settings',
        message: 'Engine and language are required'
      });
    }

    // If churchId provided, save to church-specific settings
    if (churchId) {
      const { promisePool } = require('../config/db');
      
      // Validate church exists
      const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
      if (!churchRows.length) {
        return res.status(404).json({
          error: 'Church not found',
          message: `Church with ID ${churchId} does not exist`
        });
      }

      // Get church database connection
      let dbSwitcherModule;
      try {
        dbSwitcherModule = require('../utils/dbSwitcher');
      } catch (e) {
        dbSwitcherModule = require('../utils/dbSwitcher');
      }
      const { getChurchDbConnection } = dbSwitcherModule;
      const db = await getChurchDbConnection(churchRows[0].database_name);

      // Check if settings table exists and add new columns if needed
      try {
        // Check if table exists and what columns it has
        const [columns] = await db.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'ocr_settings'
        `);
        
        const columnNames = columns.map(c => c.COLUMN_NAME);
        
        // Add new columns if they don't exist (for new OCR Studio features)
        const alterStatements = [];
        if (!columnNames.includes('engine')) {
          alterStatements.push('ADD COLUMN engine VARCHAR(50) DEFAULT "google-vision"');
        }
        if (!columnNames.includes('language')) {
          alterStatements.push('ADD COLUMN language VARCHAR(10) DEFAULT "eng"');
        }
        if (!columnNames.includes('dpi')) {
          alterStatements.push('ADD COLUMN dpi INT DEFAULT 300');
        }
        if (!columnNames.includes('deskew')) {
          alterStatements.push('ADD COLUMN deskew TINYINT(1) DEFAULT 1');
        }
        if (!columnNames.includes('remove_noise')) {
          alterStatements.push('ADD COLUMN remove_noise TINYINT(1) DEFAULT 1');
        }
        if (!columnNames.includes('preprocess_images')) {
          alterStatements.push('ADD COLUMN preprocess_images TINYINT(1) DEFAULT 1');
        }
        if (!columnNames.includes('output_format')) {
          alterStatements.push('ADD COLUMN output_format VARCHAR(20) DEFAULT "json"');
        }
        
        if (alterStatements.length > 0) {
          await db.query(`ALTER TABLE ocr_settings ${alterStatements.join(', ')}`);
          console.log(`✅ Added ${alterStatements.length} new columns to ocr_settings table`);
        }
      } catch (createError) {
        // Table might not exist, try to create it
        try {
          await db.query(`
            CREATE TABLE IF NOT EXISTS ocr_settings (
              id INT AUTO_INCREMENT PRIMARY KEY,
              church_id INT NOT NULL,
              engine VARCHAR(50) DEFAULT 'google-vision',
              language VARCHAR(10) DEFAULT 'eng',
              dpi INT DEFAULT 300,
              deskew TINYINT(1) DEFAULT 1,
              remove_noise TINYINT(1) DEFAULT 1,
              preprocess_images TINYINT(1) DEFAULT 1,
              output_format VARCHAR(20) DEFAULT 'json',
              confidence_threshold DECIMAL(5,2) DEFAULT 0.75,
              default_language CHAR(2) DEFAULT 'en',
              preprocessing_enabled TINYINT(1) DEFAULT 1,
              auto_contrast TINYINT(1) DEFAULT 1,
              auto_rotate TINYINT(1) DEFAULT 1,
              noise_reduction TINYINT(1) DEFAULT 1,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY unique_church_settings (church_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `);
          console.log(`✅ Created ocr_settings table for church ${churchId}`);
        } catch (createTableError) {
          console.warn('Could not create/modify ocr_settings table:', createTableError.message);
        }
      }

      // Normalize confidenceThreshold: API sends percent (0-100), DB stores fraction (0-1)
      const confidenceThresholdFraction = settings.confidenceThreshold !== null && settings.confidenceThreshold !== undefined
        ? Number(settings.confidenceThreshold) / 100
        : 0.75;
      
      // Normalize defaultLanguage: accept defaultLanguage from API, fallback to language or 'en'
      // Convert 3-char language codes to 2-char for default_language (CHAR(2) column)
      const languageToDefaultLanguage = (lang) => {
        if (!lang) return 'en';
        const mapping = {
          'eng': 'en',
          'ell': 'el',
          'grc': 'gr',
          'rus': 'ru',
          'ron': 'ro',
          'srp': 'sr',
          'bul': 'bg',
          'ukr': 'uk'
        };
        return mapping[lang] || (lang.length >= 2 ? lang.substring(0, 2) : 'en');
      };
      
      const defaultLanguage = settings.defaultLanguage 
        ? languageToDefaultLanguage(settings.defaultLanguage)
        : (settings.language ? languageToDefaultLanguage(settings.language) : 'en');
      
      // Only update language if explicitly provided
      const languageValue = settings.language !== undefined ? settings.language : null;
      
      console.log(`[OCR Settings] Saving settings for church ${churchId}:`, {
        engine: settings.engine,
        language: languageValue,
        defaultLanguage: defaultLanguage,
        dpi: settings.dpi,
        deskew: settings.deskew,
        removeNoise: settings.removeNoise,
        preprocessImages: settings.preprocessImages,
        outputFormat: settings.outputFormat,
        confidenceThreshold: settings.confidenceThreshold,
        confidenceThresholdFraction: confidenceThresholdFraction
      });
      
      await db.query(`
        INSERT INTO ocr_settings (
          church_id, engine, language, dpi, deskew, remove_noise, 
          preprocess_images, output_format, confidence_threshold,
          default_language, preprocessing_enabled, auto_contrast, auto_rotate, noise_reduction,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          engine = COALESCE(VALUES(engine), engine),
          language = COALESCE(IFNULL(VALUES(language), language), language),
          dpi = COALESCE(VALUES(dpi), dpi),
          deskew = COALESCE(VALUES(deskew), deskew),
          remove_noise = COALESCE(VALUES(remove_noise), remove_noise),
          preprocess_images = COALESCE(VALUES(preprocess_images), preprocess_images),
          output_format = COALESCE(VALUES(output_format), output_format),
          confidence_threshold = COALESCE(VALUES(confidence_threshold), confidence_threshold),
          default_language = COALESCE(VALUES(default_language), default_language),
          preprocessing_enabled = COALESCE(VALUES(preprocess_images), preprocessing_enabled),
          auto_rotate = COALESCE(VALUES(deskew), auto_rotate),
          noise_reduction = COALESCE(VALUES(remove_noise), noise_reduction),
          updated_at = NOW()
      `, [
        churchId,
        settings.engine || 'google-vision',
        languageValue || 'eng', // Use provided language or default
        settings.dpi || 300,
        settings.deskew !== undefined ? (settings.deskew ? 1 : 0) : 1,
        settings.removeNoise !== undefined ? (settings.removeNoise ? 1 : 0) : 1,
        settings.preprocessImages !== undefined ? (settings.preprocessImages ? 1 : 0) : 1,
        settings.outputFormat || 'json',
        confidenceThresholdFraction, // Store as fraction (0-1)
        defaultLanguage, // Store defaultLanguage
        settings.preprocessImages !== undefined ? (settings.preprocessImages ? 1 : 0) : 1,
        1, // auto_contrast (default)
        settings.deskew !== undefined ? (settings.deskew ? 1 : 0) : 1,
        settings.removeNoise !== undefined ? (settings.removeNoise ? 1 : 0) : 1
      ]);

      // Verify the settings were saved
      const [verifyRows] = await db.query(`
        SELECT engine, language, dpi, deskew, remove_noise, preprocess_images, output_format, confidence_threshold
        FROM ocr_settings 
        WHERE church_id = ?
      `, [churchId]);
      
      if (verifyRows.length > 0) {
        console.log(`✅ Saved OCR settings for church ${churchId}:`, verifyRows[0]);
      } else {
        console.error(`❌ Failed to verify saved settings for church ${churchId}`);
      }
      return res.json({
        success: true,
        message: 'OCR settings saved successfully',
        settings: settings
      });
    }

    // For global settings (no churchId), store in the main database with church_id = 0
    const { promisePool } = require('../config/db');
    
    try {
      // Check if global_settings table exists, create if not
      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS ocr_global_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          engine VARCHAR(50) DEFAULT 'google-vision',
          language VARCHAR(10) DEFAULT 'eng',
          dpi INT DEFAULT 300,
          deskew TINYINT(1) DEFAULT 1,
          remove_noise TINYINT(1) DEFAULT 1,
          preprocess_images TINYINT(1) DEFAULT 1,
          output_format VARCHAR(20) DEFAULT 'json',
          confidence_threshold DECIMAL(5,2) DEFAULT 0.75,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_global_settings (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      // Normalize confidenceThreshold: API sends percent (0-100), DB stores fraction (0-1)
      const confidenceThresholdFraction = settings.confidenceThreshold !== null && settings.confidenceThreshold !== undefined
        ? Number(settings.confidenceThreshold) / 100
        : 0.75;
      
      // Normalize defaultLanguage: accept defaultLanguage from API, fallback to language or 'en'
      // Convert 3-char language codes to 2-char for default_language (CHAR(2) column)
      const languageToDefaultLanguage = (lang) => {
        if (!lang) return 'en';
        const mapping = {
          'eng': 'en',
          'ell': 'el',
          'grc': 'gr',
          'rus': 'ru',
          'ron': 'ro',
          'srp': 'sr',
          'bul': 'bg',
          'ukr': 'uk'
        };
        return mapping[lang] || (lang.length >= 2 ? lang.substring(0, 2) : 'en');
      };
      
      const defaultLanguage = settings.defaultLanguage 
        ? languageToDefaultLanguage(settings.defaultLanguage)
        : (settings.language ? languageToDefaultLanguage(settings.language) : 'en');
      
      // Only update language if explicitly provided
      const languageValue = settings.language !== undefined ? settings.language : null;

      // Insert or update global settings (only one row allowed)
      await promisePool.query(`
        INSERT INTO ocr_global_settings (
          engine, language, default_language, dpi, deskew, remove_noise, 
          preprocess_images, output_format, confidence_threshold, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          engine = VALUES(engine),
          language = COALESCE(IFNULL(VALUES(language), language), language),
          default_language = COALESCE(VALUES(default_language), default_language),
          dpi = VALUES(dpi),
          deskew = VALUES(deskew),
          remove_noise = VALUES(remove_noise),
          preprocess_images = VALUES(preprocess_images),
          output_format = VALUES(output_format),
          confidence_threshold = VALUES(confidence_threshold),
          updated_at = NOW()
      `, [
        settings.engine || 'google-vision',
        languageValue || 'eng',
        defaultLanguage,
        settings.dpi || 300,
        settings.deskew !== undefined ? (settings.deskew ? 1 : 0) : 1,
        settings.removeNoise !== undefined ? (settings.removeNoise ? 1 : 0) : 1,
        settings.preprocessImages !== undefined ? (settings.preprocessImages ? 1 : 0) : 1,
        settings.outputFormat || 'json',
        confidenceThresholdFraction
      ]);
      
      console.log(`✅ Saved global OCR settings`);
      res.json({
        success: true,
        message: 'Global OCR settings saved successfully',
        settings: settings
      });
    } catch (globalError) {
      console.error('Error saving global OCR settings:', globalError);
      res.json({
        success: true,
        message: 'Settings saved (global settings storage failed, use church-specific settings)',
        settings: settings
      });
    }
  } catch (error) {
    console.error('Error saving OCR settings:', error);
    res.status(500).json({
      error: 'Failed to save OCR settings',
      message: error.message
    });
  }
});

/**
 * Process OCR job asynchronously with Google Vision AI
 */
async function processOcrJobAsync(db, jobId, imagePath, options = {}) {
  const startTime = Date.now();
  const { language = 'en', recordType = 'baptism', engine = 'google-vision' } = options;
  
  try {
    console.log(`🔍 Processing OCR job ${jobId} with ${engine}: ${imagePath}`);
    
    // Update job status to processing in DB (best-effort)
    try {
      await db.query('UPDATE ocr_jobs SET status = ? WHERE id = ?', ['processing', jobId]);
    } catch (dbError) {
      console.warn(`[OCR Processing] DB status update to 'processing' failed (non-blocking):`, dbError.message);
    }
    
    // Update Job Bundle manifest to processing (best-effort, non-blocking)
    try {
      let jobBundleModule;
      try {
        jobBundleModule = require('../utils/jobBundle');
      } catch (e) {
        try {
          jobBundleModule = require('../utils/jobBundle');
        } catch (e2) {
          jobBundleModule = null;
        }
      }
      
      if (jobBundleModule) {
        const { writeManifest } = jobBundleModule;
        await writeManifest(options.churchId || 46, String(jobId), {
          status: 'processing',
        });
        console.log(`[JobBundle] Updated manifest status to 'processing' for job ${jobId}`);
      }
    } catch (bundleError) {
      console.warn(`[JobBundle] Could not update manifest to 'processing' for job ${jobId} (non-blocking):`, bundleError.message);
    }
    
    // Only process with Google Vision AI if engine is set to google-vision
    if (engine === 'google-vision') {
      const vision = require('@google-cloud/vision');
      
      // Initialize client with credentials from environment
      const visionClientConfig = {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      };
      
      if (process.env.GOOGLE_VISION_KEY_PATH) {
        visionClientConfig.keyFilename = process.env.GOOGLE_VISION_KEY_PATH;
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        visionClientConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
      
      const client = new vision.ImageAnnotatorClient(visionClientConfig);
      
      // Read the image file
      const imageBuffer = await fs.readFile(imagePath);
      
      // Configure OCR request with language hints
      const request = {
        image: { content: imageBuffer },
        imageContext: {
          languageHints: [language, 'en'], // Always include English as fallback
        },
        features: [
          { type: 'TEXT_DETECTION' },
          { type: 'DOCUMENT_TEXT_DETECTION' }
        ]
      };
      
      console.log(`🌐 Calling Google Vision API with language: ${language}`);
      
      // Call Google Vision API
      const [result] = await client.annotateImage(request);
      
      const textAnnotations = result.textAnnotations || [];
      const fullTextAnnotation = result.fullTextAnnotation || {};
      
      // Extract text and confidence
      const extractedText = textAnnotations.length > 0 ? textAnnotations[0].description : '';
      
      // Calculate average confidence from pages if available
      let totalConfidence = 0;
      let count = 0;
      
      // Try to get confidence from fullTextAnnotation pages
      if (fullTextAnnotation.pages) {
        fullTextAnnotation.pages.forEach(page => {
          if (page.confidence !== undefined) {
            totalConfidence += page.confidence;
            count++;
          }
          // Also check blocks for confidence
          (page.blocks || []).forEach(block => {
            if (block.confidence !== undefined) {
              totalConfidence += block.confidence;
              count++;
            }
          });
        });
      }
      
      // Fallback to textAnnotations confidence
      if (count === 0) {
        textAnnotations.forEach(annotation => {
          if (annotation.confidence !== undefined) {
            totalConfidence += annotation.confidence;
            count++;
          }
        });
      }
      
      const confidence = count > 0 ? totalConfidence / count : 0.85;
      
      console.log(`📝 OCR completed: ${extractedText.length} characters extracted`);
      console.log(`🎯 Confidence score: ${(confidence * 100).toFixed(1)}%`);
      
      const processingTime = Date.now() - startTime;
      
      // Prepare Vision result JSON for bounding box overlay support
      // Include textAnnotations (words with bboxes) and fullTextAnnotation (structured data)
      const visionResultJson = {
        textAnnotations: textAnnotations.map(a => ({
          description: a.description,
          boundingPoly: a.boundingPoly,
          confidence: a.confidence
        })),
        fullTextAnnotation: fullTextAnnotation
      };
      const visionResultJsonStr = JSON.stringify(visionResultJson);
      
      const path = require('path');
      
      // Get churchId from options
      const churchId = options.churchId || 46;
      // Check for per-church ocr_base_dir override, else use default
      const baseUploadPath = process.env.UPLOAD_BASE_PATH || '/var/www/orthodoxmetrics/prod/server/uploads';
      let effectiveOcrBase;
      try {
        const { promisePool: ocrPool } = require('../config/db');
        const [ocrChurchRows] = await ocrPool.query(
          'SELECT ocr_base_dir FROM churches WHERE id = ?', [churchId]
        );
        const ocrOverride = ocrChurchRows.length > 0 && ocrChurchRows[0].ocr_base_dir
          ? ocrChurchRows[0].ocr_base_dir : null;
        effectiveOcrBase = ocrOverride || path.join(baseUploadPath, `om_church_${churchId}`);
      } catch (dbErr) {
        console.warn('Could not check ocr_base_dir override, using default:', dbErr.message);
        effectiveOcrBase = path.join(baseUploadPath, `om_church_${churchId}`);
      }
      const processedDir = path.join(effectiveOcrBase, 'processed');
      
      console.log(`📁 Base upload path: ${baseUploadPath}`);
      console.log(`📁 Processed dir: ${processedDir}`);
      
      // Ensure processed directory exists
      await fs.mkdir(processedDir, { recursive: true });
      
      // Get original filename from path
      const originalFilename = path.basename(imagePath);
      const filenameWithoutExt = path.parse(originalFilename).name;
      
      // Write OCR text result to file
      const textFilePath = path.join(processedDir, `${filenameWithoutExt}_ocr.txt`);
      const ocrOutput = [
        `=== OCR Result for Job ${jobId} ===`,
        `File: ${originalFilename}`,
        `Processed: ${new Date().toISOString()}`,
        `Confidence: ${(confidence * 100).toFixed(1)}%`,
        `Processing Time: ${processingTime}ms`,
        ``,
        `=== Extracted Text ===`,
        extractedText,
        ``,
        `=== End ===`
      ].join('\n');
      
      await fs.writeFile(textFilePath, ocrOutput, 'utf8');
      console.log(`📄 OCR result written to: ${textFilePath}`);
      
      // Write full Vision JSON result to separate file (for bounding boxes)
      const jsonFilePath = path.join(processedDir, `${filenameWithoutExt}_ocr.json`);
      await fs.writeFile(jsonFilePath, visionResultJsonStr, 'utf8');
      console.log(`📄 OCR JSON written to: ${jsonFilePath}`);
      
      // Move image from uploaded to processed
      const processedImagePath = path.join(processedDir, originalFilename);
      try {
        await fs.rename(imagePath, processedImagePath);
        console.log(`📁 Image moved to: ${processedImagePath}`);
      } catch (moveError) {
        // If rename fails (cross-device), try copy then delete
        if (moveError.code === 'EXDEV') {
          await fs.copyFile(imagePath, processedImagePath);
          await fs.unlink(imagePath);
          console.log(`📁 Image copied to: ${processedImagePath}`);
        } else {
          console.warn(`⚠️ Could not move image: ${moveError.message}`);
        }
      }
      
      // ============================================================================
      // PRE-PROCESSING SCRIPT HOOK
      // ============================================================================
      // Run custom script before finalizing processing (if configured)
      // This runs after OCR is complete but before database update
      const preProcessingScript = process.env.OCR_PRE_PROCESSING_SCRIPT || options.preProcessingScript;
      if (preProcessingScript) {
        try {
          console.log(`🔧 Running pre-processing script: ${preProcessingScript}`);
          const { exec } = require('child_process');
          const { promisify } = require('util');
          const execAsync = promisify(exec);
          
          // Prepare environment variables for the script
          const scriptEnv = {
            ...process.env,
            OCR_JOB_ID: String(jobId),
            OCR_CHURCH_ID: String(churchId),
            OCR_IMAGE_PATH: processedImagePath,
            OCR_TEXT_FILE: textFilePath,
            OCR_JSON_FILE: jsonFilePath,
            OCR_EXTRACTED_TEXT: extractedText,
            OCR_CONFIDENCE: String(confidence),
            OCR_RECORD_TYPE: recordType || 'baptism',
            OCR_LANGUAGE: language || 'en',
            OCR_PROCESSING_TIME: String(processingTime),
          };
          
          // Execute the script with a timeout (5 minutes max)
          const { stdout, stderr } = await execAsync(preProcessingScript, {
            env: scriptEnv,
            timeout: 300000, // 5 minutes
            cwd: path.dirname(preProcessingScript) || process.cwd(),
          });
          
          if (stdout) {
            console.log(`[Pre-Processing Script] stdout:`, stdout);
          }
          if (stderr) {
            console.warn(`[Pre-Processing Script] stderr:`, stderr);
          }
          
          console.log(`✅ Pre-processing script completed successfully`);
        } catch (scriptError) {
          // Log error but don't fail the OCR job
          console.error(`❌ Pre-processing script failed (non-blocking):`, scriptError.message);
          console.error(`   Script: ${preProcessingScript}`);
          console.error(`   Error:`, scriptError);
        }
      }
      
      // Update job status and file path in database (check columns dynamically)
      let dbUpdateSuccess = false;
      try {
        // Check which columns exist in the table
        const [columns] = await db.query(`SHOW COLUMNS FROM ocr_jobs`);
        const columnNames = new Set(columns.map(c => c.Field));
        
        // Build UPDATE statement dynamically based on available columns
        const updateParts = [];
        const updateValues = [];
        
        // Always try these columns
        if (columnNames.has('status')) {
          updateParts.push('status = ?');
          updateValues.push('completed');
        }
        if (columnNames.has('file_path')) {
          updateParts.push('file_path = ?');
          updateValues.push(processedImagePath);
        }
        if (columnNames.has('confidence_score')) {
          updateParts.push('confidence_score = ?');
          updateValues.push(confidence);
        }
        if (columnNames.has('ocr_text') && extractedText) {
          updateParts.push('ocr_text = ?');
          updateValues.push(extractedText);
        }
        if (columnNames.has('ocr_result_json') && visionResultJsonStr) {
          updateParts.push('ocr_result_json = ?');
          updateValues.push(visionResultJsonStr);
        }
        if (columnNames.has('updated_at')) {
          updateParts.push('updated_at = NOW()');
        }
        
        if (updateParts.length > 0) {
          updateValues.push(jobId);
          await db.query(`
            UPDATE ocr_jobs SET 
              ${updateParts.join(', ')}
            WHERE id = ?
          `, updateValues);
          dbUpdateSuccess = true;
          console.log(`[OCR Processing] DB updated successfully for job ${jobId} with ${updateParts.length} fields`);
        } else {
          console.warn(`[OCR Processing] No updatable columns found for job ${jobId}`);
        }
      } catch (dbError) {
        console.warn(`[OCR Processing] DB update failed, trying minimal update:`, dbError.message);
        // Try with minimal columns (status, file_path, confidence_score only)
        try {
          await db.query(`
            UPDATE ocr_jobs SET 
              status = 'completed',
              file_path = ?,
              confidence_score = ?,
              updated_at = NOW()
            WHERE id = ?
          `, [processedImagePath, confidence, jobId]);
          dbUpdateSuccess = true;
          console.log(`[OCR Processing] Minimal DB update succeeded for job ${jobId}`);
        } catch (dbError2) {
          // Try with 'complete' status if 'completed' fails (for older schemas)
          try {
            await db.query(`
              UPDATE ocr_jobs SET 
                status = 'complete',
                file_path = ?,
                confidence_score = ?,
                updated_at = NOW()
              WHERE id = ?
            `, [processedImagePath, confidence, jobId]);
            dbUpdateSuccess = true;
            console.log(`[OCR Processing] DB updated with 'complete' status for job ${jobId}`);
          } catch (dbError3) {
            console.warn(`[OCR Processing] All DB update attempts failed (non-blocking):`, dbError3.message);
          }
        }
      }
      
      // Update Job Bundle manifest to completed (if module exists)
      try {
        let jobBundleModule;
        const fs = require('fs');
        const path = require('path');
        
        // Use context detection instead of file existence check
        if (isDist) {
          try {
            jobBundleModule = require('../utils/jobBundle');
          } catch (e) {
            // Module exists but failed to load
            console.warn(`[JobBundle] Module found but failed to load:`, e.message);
          }
        } else {
          try {
            jobBundleModule = require('../utils/jobBundle');
          } catch (e) {
            try {
              jobBundleModule = require('../utils/jobBundle');
            } catch (e2) {
              console.warn(`[JobBundle] Module found but failed to load:`, e.message);
            }
          }
        }
        
        if (jobBundleModule && jobBundleModule.writeManifest) {
          const { writeManifest } = jobBundleModule;
          await writeManifest(options.churchId || 46, String(jobId), {
            status: 'completed',
          });
          console.log(`[JobBundle] ✅ Updated manifest status to 'completed' for job ${jobId}`);
        } else {
          // JobBundle module is optional - not all deployments have it
          console.log(`[JobBundle] Module not available (optional) - using DB status only for job ${jobId}`);
        }
      } catch (bundleError) {
        // Non-critical - DB update already succeeded
        console.warn(`[JobBundle] Could not update manifest for job ${jobId} (non-critical):`, bundleError.message);
      }
      
      console.log(`✅ OCR job ${jobId} completed successfully in ${processingTime}ms`);
      
      return {
        success: true,
        jobId,
        extractedText,
        confidence,
        processingTime
      };
    } else {
      // For other engines (tesseract, etc.), mark as completed with placeholder
      // TODO: Implement other OCR engines if needed
      console.log(`⚠️ OCR engine "${engine}" not yet implemented, marking as completed`);
      await db.query('UPDATE ocr_jobs SET status = ? WHERE id = ?', ['completed', jobId]);
      return { success: true, jobId, message: `Engine ${engine} not implemented` };
    }
    
  } catch (error) {
    console.error(`❌ OCR processing failed for job ${jobId}:`, error);
    
    const processingTime = Date.now() - startTime;
    
    // Update job with error status (best-effort DB write)
    try {
      await db.query(`
        UPDATE ocr_jobs SET 
          status = 'failed',
          error = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        error.message || 'OCR processing failed',
        jobId
      ]);
    } catch (updateError) {
      // If error column doesn't exist, try without it
      try {
        await db.query('UPDATE ocr_jobs SET status = ? WHERE id = ?', ['failed', jobId]);
      } catch (dbError2) {
        console.warn(`[OCR Processing] DB error update failed (non-blocking):`, dbError2.message);
      }
    }
    
    // Update Job Bundle manifest (best-effort, non-blocking)
    try {
      let jobBundleModule;
      try {
        jobBundleModule = require('../utils/jobBundle');
      } catch (e) {
        try {
          jobBundleModule = require('../utils/jobBundle');
        } catch (e2) {
          jobBundleModule = null;
        }
      }
      
      if (jobBundleModule) {
        const { writeManifest } = jobBundleModule;
        await writeManifest(options.churchId || 46, String(jobId), {
          status: 'failed',
        });
        console.log(`[JobBundle] Updated manifest status to 'failed' for job ${jobId}`);
      }
    } catch (bundleError) {
      console.warn(`[JobBundle] Could not update manifest for job ${jobId} (non-blocking):`, bundleError.message);
    }
    
    throw error;
  }
}

// =============================================================================
// IMAGE SERVING ENDPOINT - Serves OCR job images
// =============================================================================

/**
 * GET /api/ocr/image/:jobId
 * Serve the image file for an OCR job
 */
router.get('/image/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const churchId = req.query.churchId ? parseInt(req.query.churchId) : null;
    
    if (!churchId) {
      return res.status(400).json({ error: 'churchId query parameter is required' });
    }
    
    const { promisePool } = require('../config/db');
    
    // Get church database
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }
    
    let dbSwitcherModule;
    if (isDist) {
      dbSwitcherModule = require('../utils/dbSwitcher');
    } else {
      try {
        dbSwitcherModule = require('../utils/dbSwitcher');
      } catch (e) {
        dbSwitcherModule = require('../utils/dbSwitcher');
      }
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);
    
    // Get job file path
    const [jobs] = await db.query('SELECT file_path, mime_type FROM ocr_jobs WHERE id = ?', [jobId]);
    
    if (!jobs.length || !jobs[0].file_path) {
      return res.status(404).json({ error: 'Job or image not found' });
    }
    
    const filePath = jobs[0].file_path;
    const mimeType = jobs[0].mime_type || 'image/jpeg';
    
    // Check if file exists
    const fsSync = require('fs');
    if (!fsSync.existsSync(filePath)) {
      console.warn(`Image file not found: ${filePath}`);
      return res.status(404).json({ error: 'Image file not found on disk' });
    }
    
    // Serve the file
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    fsSync.createReadStream(filePath).pipe(res);
    
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Failed to serve image', details: error.message });
  }
});

// =============================================================================
// JOB DETAIL ENDPOINT - Returns full OCR result with bounding boxes
// =============================================================================

/**
 * GET /api/ocr/jobs/:jobId
 * Get detailed job information including full OCR result
 * Reads from Job Bundle first, merges with DB data if available
 */
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const churchId = req.query.churchId ? parseInt(req.query.churchId) : null;
    
    if (!churchId) {
      return res.status(400).json({ error: 'churchId query parameter is required' });
    }
    
    const { promisePool } = require('../config/db');
    
    // Get church database
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }
    
    // Read from Job Bundle (file-backed source of truth)
    let jobBundleModule = null;
    if (isDist) {
      try {
        jobBundleModule = require('../utils/jobBundle');
      } catch (e) {
        console.warn('[Job Detail GET] JobBundle module not found, using DB only');
      }
    } else {
      try {
        jobBundleModule = require('../utils/jobBundle');
      } catch (e) {
        try {
          jobBundleModule = require('../utils/jobBundle');
        } catch (e2) {
          console.warn('[Job Detail GET] JobBundle module not found, using DB only');
        }
      }
    }

    let manifest = null;
    let drafts = null;
    
    if (jobBundleModule) {
      try {
        const { readManifest, readDrafts } = jobBundleModule;
        console.log(`[Job Detail GET] Reading Job Bundle for job ${jobId} (church ${churchId})`);
        manifest = await readManifest(churchId, String(jobId));
        drafts = await readDrafts(churchId, String(jobId));
      } catch (bundleError) {
        console.warn(`[Job Detail GET] Job Bundle read failed (non-blocking):`, bundleError.message);
      }
    }
    
    // Best-effort DB read (merge with bundle data)
    let dbJob = null;
    let mapping = null;
    let ocrResultJson = null;
    
    try {
      let dbSwitcherModule;
      try {
        dbSwitcherModule = require('../utils/dbSwitcher');
      } catch (e) {
        dbSwitcherModule = require('../utils/dbSwitcher');
      }
      const { getChurchDbConnection } = dbSwitcherModule;
      const db = await getChurchDbConnection(churchRows[0].database_name);
      
      // Dynamically build SELECT based on available columns
      const [columns] = await db.query(`SHOW COLUMNS FROM ocr_jobs`);
      const columnNames = columns.map(c => c.Field);
      
      const baseColumns = [
        'id', 'filename', 'original_filename', 'file_path', 'status',
        'record_type', 'language', 'confidence_score', 'file_size', 
        'mime_type', 'pages', 'created_at', 'updated_at', 'church_id'
      ];
      
      const optionalColumns = ['ocr_result', 'ocr_text', 'ocr_result_json', 'error', 'processing_time_ms'];
      const selectColumns = baseColumns.filter(c => columnNames.includes(c));
      optionalColumns.forEach(c => {
        if (columnNames.includes(c)) selectColumns.push(c);
      });
      
      const [jobs] = await db.query(
        `SELECT ${selectColumns.join(', ')} FROM ocr_jobs WHERE id = ?`,
        [jobId]
      );
      
      if (jobs.length > 0) {
        dbJob = jobs[0];
        
        // Parse OCR result JSON if available
        if (dbJob.ocr_result_json) {
          try {
            ocrResultJson = typeof dbJob.ocr_result_json === 'string'
              ? JSON.parse(dbJob.ocr_result_json)
              : dbJob.ocr_result_json;
          } catch (e) {
            console.warn('Could not parse ocr_result_json:', e.message);
          }
        }
        
        // Fetch any saved mapping (legacy)
        try {
          const [mappings] = await db.query(
            'SELECT * FROM ocr_mappings WHERE ocr_job_id = ?',
            [jobId]
          );
          if (mappings.length > 0) {
            mapping = {
              id: mappings[0].id,
              recordType: mappings[0].record_type,
              mappingJson: typeof mappings[0].mapping_json === 'string' 
                ? JSON.parse(mappings[0].mapping_json) 
                : mappings[0].mapping_json,
              bboxLinks: mappings[0].bbox_links ? (
                typeof mappings[0].bbox_links === 'string'
                  ? JSON.parse(mappings[0].bbox_links)
                  : mappings[0].bbox_links
              ) : null,
              status: mappings[0].status,
              createdAt: mappings[0].created_at,
              updatedAt: mappings[0].updated_at
            };
          }
        } catch (mappingError) {
          // Table might not exist, that's okay
          console.log('Could not fetch mapping (table may not exist):', mappingError.message);
        }
      }
    } catch (dbError) {
      console.warn(`[Job Detail GET] DB read failed (non-blocking):`, dbError.message);
    }
    
    // Build response: prefer bundle data, merge with DB data
    const response = {
      id: jobId.toString(),
      filename: dbJob?.filename || null,
      originalFilename: dbJob?.original_filename || null,
      filePath: dbJob?.file_path || null,
      status: manifest?.status || dbJob?.status || 'pending',
      recordType: manifest?.recordType || dbJob?.record_type || 'baptism',
      language: dbJob?.language || 'en',
      confidenceScore: dbJob?.confidence_score || 0,
      fileSize: dbJob?.file_size || null,
      mimeType: dbJob?.mime_type || null,
      pages: dbJob?.pages || 1,
      churchId: churchId,
      createdAt: dbJob?.created_at || null,
      updatedAt: manifest?.updatedAt || dbJob?.updated_at || null,
      processingTimeMs: dbJob?.processing_time_ms || null,
      error: dbJob?.error || null,
      // OCR content (from DB)
      ocrText: dbJob?.ocr_text || dbJob?.ocr_result || null,
      ocrResultJson: ocrResultJson,
      // Mapping data (legacy, from DB)
      mapping: mapping,
      // Bundle data
      page_year: manifest?.page_year || null,
      draftCounts: manifest?.draftCounts || null,
    };
    
    // If no DB data and no bundle, return 404
    if (!dbJob && !manifest) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching job detail:', error);
    res.status(500).json({ error: 'Failed to fetch job detail', details: error.message });
  }
});

// =============================================================================
// MAPPING ENDPOINTS - Save and manage field mappings
// =============================================================================

/**
 * POST /api/ocr/jobs/:jobId/mapping
 * Save field mapping for an OCR job
 */
router.post('/jobs/:jobId/mapping', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { churchId, recordType, mappingJson, bboxLinks } = req.body;
    
    if (!churchId) {
      return res.status(400).json({ error: 'churchId is required' });
    }
    
    if (!recordType || !['baptism', 'marriage', 'funeral'].includes(recordType)) {
      return res.status(400).json({ error: 'Valid recordType is required (baptism, marriage, funeral)' });
    }
    
    if (!mappingJson || typeof mappingJson !== 'object') {
      return res.status(400).json({ error: 'mappingJson object is required' });
    }
    
    const { promisePool } = require('../config/db');
    
    // Get church database
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }
    
    let dbSwitcherModule;
    if (isDist) {
      dbSwitcherModule = require('../utils/dbSwitcher');
    } else {
      try {
        dbSwitcherModule = require('../utils/dbSwitcher');
      } catch (e) {
        dbSwitcherModule = require('../utils/dbSwitcher');
      }
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);
    
    // Get user ID from session
    const userId = req.session?.user?.id || req.user?.id || null;
    
    // Upsert mapping (insert or update on duplicate key)
    const mappingJsonStr = JSON.stringify(mappingJson);
    const bboxLinksStr = bboxLinks ? JSON.stringify(bboxLinks) : null;
    
    try {
      const [result] = await db.query(`
        INSERT INTO ocr_mappings (
          ocr_job_id, church_id, record_type, mapping_json, bbox_links, 
          status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'draft', ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          record_type = VALUES(record_type),
          mapping_json = VALUES(mapping_json),
          bbox_links = VALUES(bbox_links),
          updated_at = NOW()
      `, [jobId, churchId, recordType, mappingJsonStr, bboxLinksStr, userId]);
      
      const mappingId = result.insertId || result.affectedRows;
      
      res.json({
        success: true,
        message: 'Mapping saved successfully',
        mappingId: mappingId
      });
    } catch (insertError) {
      // If table doesn't exist, try to create it
      if (insertError.code === 'ER_NO_SUCH_TABLE') {
        await db.query(`
          CREATE TABLE IF NOT EXISTS ocr_mappings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ocr_job_id INT NOT NULL,
            church_id INT NOT NULL,
            record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,
            mapping_json JSON NOT NULL,
            bbox_links JSON NULL,
            status ENUM('draft', 'reviewed', 'approved', 'rejected') DEFAULT 'draft',
            created_by INT NULL,
            reviewed_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_ocr_job (ocr_job_id),
            INDEX idx_church (church_id),
            UNIQUE KEY unique_job_mapping (ocr_job_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // Retry insert
        const [result] = await db.query(`
          INSERT INTO ocr_mappings (
            ocr_job_id, church_id, record_type, mapping_json, bbox_links, 
            status, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'draft', ?, NOW(), NOW())
        `, [jobId, churchId, recordType, mappingJsonStr, bboxLinksStr, userId]);
        
        res.json({
          success: true,
          message: 'Mapping saved successfully (table created)',
          mappingId: result.insertId
        });
      } else {
        throw insertError;
      }
    }
    
  } catch (error) {
    console.error('Error saving mapping:', error);
    res.status(500).json({ error: 'Failed to save mapping', details: error.message });
  }
});

/**
 * POST /api/ocr/jobs/:jobId/draft-record
 * Create a draft sacramental record from mapping
 */
router.post('/jobs/:jobId/draft-record', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { churchId, recordType, mappingJson } = req.body;
    
    console.log('[Draft Record] Request body:', { jobId, churchId, recordType, mappingJson: !!mappingJson });
    
    if (!churchId || !recordType || !mappingJson) {
      console.log('[Draft Record] Missing required fields:', { churchId: !!churchId, recordType: !!recordType, mappingJson: !!mappingJson });
      return res.status(400).json({ 
        error: 'churchId, recordType, and mappingJson are required' 
      });
    }
    
    const parsedChurchId = parseInt(churchId, 10);
    if (isNaN(parsedChurchId)) {
      return res.status(400).json({ error: 'churchId must be a valid number' });
    }
    
    const { promisePool } = require('../config/db');
    
    // Get church database
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [parsedChurchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }
    
    let dbSwitcherModule;
    if (isDist) {
      dbSwitcherModule = require('../utils/dbSwitcher');
    } else {
      try {
        dbSwitcherModule = require('../utils/dbSwitcher');
      } catch (e) {
        dbSwitcherModule = require('../utils/dbSwitcher');
      }
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);
    
    const userId = req.session?.user?.id || req.user?.id || null;
    
    // First, update the mapping status to 'reviewed'
    try {
      await db.query(`
        UPDATE ocr_mappings SET status = 'reviewed', reviewed_by = ?, updated_at = NOW()
        WHERE ocr_job_id = ?
      `, [userId, jobId]);
    } catch (e) {
      console.log('Could not update mapping status:', e.message);
    }
    
    // For now, we store draft records in a generic ocr_draft_records table
    // This avoids writing directly to sacramental tables
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS ocr_draft_records (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ocr_job_id INT NOT NULL,
          church_id INT NOT NULL,
          record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,
          record_data JSON NOT NULL,
          status ENUM('draft', 'approved', 'rejected', 'imported') DEFAULT 'draft',
          created_by INT NULL,
          approved_by INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          imported_at TIMESTAMP NULL,
          imported_record_id INT NULL,
          INDEX idx_ocr_job (ocr_job_id),
          INDEX idx_church (church_id),
          INDEX idx_status (status),
          UNIQUE KEY unique_job_draft (ocr_job_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      const recordDataStr = JSON.stringify(mappingJson);
      
      const [result] = await db.query(`
        INSERT INTO ocr_draft_records (
          ocr_job_id, church_id, record_type, record_data, 
          status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'draft', ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          record_type = VALUES(record_type),
          record_data = VALUES(record_data),
          status = 'draft',
          updated_at = NOW()
      `, [parseInt(jobId, 10), parsedChurchId, recordType, recordDataStr, userId]);
      
      res.json({
        success: true,
        message: 'Draft record created successfully',
        draftId: result.insertId || 1,
        recordType: recordType
      });
      
    } catch (error) {
      throw error;
    }
    
  } catch (error) {
    console.error('Error creating draft record:', error);
    res.status(500).json({ error: 'Failed to create draft record', details: error.message });
  }
});

module.exports = router;
