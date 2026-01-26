// controllers/churchOcrController.js
// Detects context (dist vs source) and uses appropriate path
const path = require('path');
const isDist = __dirname.includes(path.sep + 'dist' + path.sep);

let dbSwitcherModule;
if (isDist) {
    dbSwitcherModule = require('../utils/dbSwitcher');
} else {
    try {
        dbSwitcherModule = require('../utils/dbSwitcher');
    } catch (e) {
        dbSwitcherModule = require('../src/utils/dbSwitcher');
    }
}
const { getChurchDbConnection } = dbSwitcherModule;

let dbConnectionsModule;
if (isDist) {
    dbConnectionsModule = require('../utils/dbConnections');
} else {
    try {
        dbConnectionsModule = require('../utils/dbConnections');
    } catch (e) {
        dbConnectionsModule = require('../src/utils/dbConnections');
    }
}
const { getOcrDbPool } = dbConnectionsModule;

const { promisePool } = require('../config/db'); // central DB connection

let ImagePreprocessor;
if (isDist) {
    ImagePreprocessor = require('../utils/imagePreprocessor');
} else {
    try {
        ImagePreprocessor = require('../utils/imagePreprocessor');
    } catch (e) {
        ImagePreprocessor = require('../src/utils/imagePreprocessor');
    }
}
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Initialize image preprocessor
const imagePreprocessor = new ImagePreprocessor();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const churchId = req.params.id;
    const uploadDir = path.join(__dirname, '..', 'uploads', 'ocr', `church_${churchId}`);
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileHash = crypto.randomBytes(8).toString('hex');
    cb(null, `ocr_${uniqueSuffix}_${fileHash}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
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

/**
 * Upload image for OCR processing
 */
exports.uploadImage = [upload.single('image'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const churchId = req.params.id;
    const { recordType, language, enablePreprocessing = 'true' } = req.body;
    
    console.log('🔄 OCR Upload request received:', {
      churchId,
      hasFile: !!req.file,
      recordType,
      language,
      preprocessing: enablePreprocessing,
      fileInfo: req.file ? {
        originalname: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : null
    });
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate church exists in central database
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    // Get connection to church-specific database
    const db = await getChurchDbConnection(churchRows[0].database_name);
    
    // Step 1: Apply intelligent image preprocessing if enabled
    let processedImagePath = req.file.path;
    let preprocessingResults = null;
    
    if (enablePreprocessing === 'true' && req.file.mimetype.startsWith('image/')) {
      console.log('🎯 Applying intelligent image preprocessing...');
      
      try {
        const preprocessorOptions = {
          language: language || 'en',
          enhance: true,
          outputDir: path.join(path.dirname(req.file.path), 'processed')
        };
        
        preprocessingResults = await imagePreprocessor.processImage(req.file.path, preprocessorOptions);
        
        if (preprocessingResults.status === 'success') {
          processedImagePath = preprocessingResults.outputPath;
          const rotationAngle = preprocessingResults.metadata?.transformations?.rotationAngle || 0;
          const originalDims = preprocessingResults.metadata?.original;
          const processedDims = preprocessingResults.metadata?.processed;
          
          console.log(`✅ Preprocessing successful: rotation ${rotationAngle.toFixed(2)}°`);
          if (originalDims && processedDims) {
            console.log(`📐 Dimensions: ${originalDims.width}x${originalDims.height} → ${processedDims.width}x${processedDims.height}`);
          }
        } else {
          console.warn('⚠️  Preprocessing failed, using original image:', preprocessingResults.error);
        }
      } catch (preprocessError) {
        console.warn('⚠️  Preprocessing error, using original image:', preprocessError.message);
      }
    }

    // Step 2: Create OCR job record
    const [result] = await db.query(`
      INSERT INTO ocr_jobs (
        church_id, filename, original_filename, file_path, file_size, mime_type, status, 
        record_type, language, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())
    `, [
      churchId,
      req.file.filename,
      req.file.originalname,
      req.file.path,
      req.file.size,
      req.file.mimetype,
      recordType || 'baptism',
      language || 'en'
    ]);

    const jobId = result.insertId;
    
    // Step 3: Trigger immediate OCR processing with preprocessed image (or original if preprocessing failed)
    console.log('🚀 Starting OCR processing...');
    
    // Use processed image if available, otherwise use original
    const imageToProcess = processedImagePath || req.file.path;
    
    // Process OCR in background (non-blocking)
    processOcrJob(db, jobId, imageToProcess, {
      language: language || 'en',
      recordType: recordType || 'baptism'
    }).catch(error => {
      console.error(`❌ Background OCR processing failed for job ${jobId}:`, error);
    });

    // Log the upload activity
    try {
      await db.query(
        'INSERT INTO activity_log (church_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, NOW())',
        [churchId, req.user?.id || null, 'ocr_upload', `OCR job created: ${req.file.originalname} (preprocessing: ${enablePreprocessing === 'true' ? 'enabled' : 'disabled'})`]
      );
    } catch (logError) {
      console.warn('Failed to log OCR upload activity:', logError);
    }

    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      jobId: jobId,
      filename: req.file.filename,
      originalFilename: req.file.originalname,
      status: 'pending',
      processingTime,
      preprocessing: preprocessingResults ? {
        enabled: true,
        rotationAngle: preprocessingResults.rotationAngle,
        originalDimensions: preprocessingResults.originalDimensions,
        finalDimensions: preprocessingResults.finalDimensions
      } : { enabled: false },
      message: 'Image uploaded successfully and queued for OCR processing'
    });

  } catch (error) {
    console.error('Error in uploadImage:', error);
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error.message 
    });
  }
}];

/**
 * Get paginated list of OCR jobs for a church
 */
exports.getOcrJobs = async (req, res) => {
  try {
    const churchId = req.params.id;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      recordType, 
      language,
      dateFrom,
      dateTo 
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Validate church exists in central database
    const [churchRows] = await promisePool.query('SELECT id, name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    // Use OCR database for OCR-related operations
    const ocrDb = getOcrDbPool();

    // Build WHERE clause dynamically
    let whereConditions = ['church_id = ?'];
    let queryParams = [churchId];

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }
    if (recordType) {
      whereConditions.push('record_type = ?');
      queryParams.push(recordType);
    }
    if (language) {
      whereConditions.push('language = ?');
      queryParams.push(language);
    }
    if (dateFrom) {
      whereConditions.push('created_at >= ?');
      queryParams.push(dateFrom);
    }
    if (dateTo) {
      whereConditions.push('created_at <= ?');
      queryParams.push(dateTo);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Get jobs with pagination from OCR database
    const [jobs] = await ocrDb.query(`
      SELECT 
        id, filename, original_filename, status, record_type, language,
        confidence_score, created_at, updated_at, description,
        CASE WHEN ocr_result IS NOT NULL AND ocr_result != '' THEN TRUE ELSE FALSE END as hasResult
      FROM ocr_jobs 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    // Get total count for pagination from OCR database
    const [[countResult]] = await ocrDb.query(`
      SELECT COUNT(*) as total FROM ocr_jobs ${whereClause}
    `, queryParams);

    res.json({
      jobs: jobs || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult?.total || 0,
        pages: Math.ceil((countResult?.total || 0) / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error in getOcrJobs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch OCR jobs',
      details: error.message 
    });
  }
};

/**
 * Get specific OCR job result
 */
exports.getOcrResult = async (req, res) => {
  try {
    const churchId = req.params.id;
    const jobId = req.params.jobId;

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Get job details
    const [jobs] = await db.query(`
      SELECT 
        id, filename, original_filename, status, record_type, language,
        confidence_score, error_regions, ocr_result, ocr_result_translation,
        translation_confidence, detected_language, description,
        created_at, updated_at
      FROM ocr_jobs 
      WHERE id = ? AND church_id = ?
    `, [jobId, churchId]);

    if (!jobs.length) {
      return res.status(404).json({ error: 'OCR job not found' });
    }

    const job = jobs[0];

    res.json({
      id: job.id,
      filename: job.filename,
      originalFilename: job.original_filename,
      status: job.status,
      recordType: job.record_type,
      language: job.language,
      detectedLanguage: job.detected_language,
      confidenceScore: job.confidence_score,
      translationConfidence: job.translation_confidence,
      errorRegions: job.error_regions ? JSON.parse(job.error_regions) : null,
      ocrResult: job.ocr_result,
      ocrResultTranslation: job.ocr_result_translation,
      description: job.description,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    });

  } catch (error) {
    console.error('Error in getOcrResult:', error);
    res.status(500).json({ 
      error: 'Failed to fetch OCR result',
      details: error.message 
    });
  }
};

/**
 * Get OCR jobs with errors or low confidence
 */
exports.getOcrErrors = async (req, res) => {
  try {
    const churchId = req.params.id;
    const { page = 1, limit = 20, minConfidence = 0.8 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Get jobs with errors or low confidence
    const [jobs] = await db.query(`
      SELECT 
        id, filename, original_filename, status, record_type, language,
        confidence_score, error_regions, created_at, description
      FROM ocr_jobs 
      WHERE church_id = ? AND (
        status = 'error' OR 
        (confidence_score IS NOT NULL AND confidence_score < ?) OR
        error_regions IS NOT NULL
      )
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [churchId, parseFloat(minConfidence), parseInt(limit), offset]);

    // Get total count
    const [[countResult]] = await db.query(`
      SELECT COUNT(*) as total FROM ocr_jobs 
      WHERE church_id = ? AND (
        status = 'error' OR 
        (confidence_score IS NOT NULL AND confidence_score < ?) OR
        error_regions IS NOT NULL
      )
    `, [churchId, parseFloat(minConfidence)]);

    res.json({
      errorJobs: jobs || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult?.total || 0,
        pages: Math.ceil((countResult?.total || 0) / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error in getOcrErrors:', error);
    res.status(500).json({ 
      error: 'Failed to fetch OCR errors',
      details: error.message 
    });
  }
};

/**
 * Get OCR queue status and health metrics
 */
exports.getOcrStatus = async (req, res) => {
  try {
    const churchId = req.params.id;

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Get status counts
    const [statusCounts] = await db.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM ocr_jobs 
      WHERE church_id = ?
      GROUP BY status
    `, [churchId]);

    // Get recent activity (last 24 hours)
    const [recentActivity] = await db.query(`
      SELECT COUNT(*) as count
      FROM ocr_jobs 
      WHERE church_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `, [churchId]);

    // Get average confidence score
    const [[avgConfidence]] = await db.query(`
      SELECT AVG(confidence_score) as avg_confidence
      FROM ocr_jobs 
      WHERE church_id = ? AND confidence_score IS NOT NULL
    `, [churchId]);

    const statusMap = {};
    statusCounts.forEach(row => {
      statusMap[row.status] = row.count;
    });

    res.json({
      churchId: parseInt(churchId),
      queueStatus: {
        pending: statusMap.pending || 0,
        processing: statusMap.processing || 0,
        complete: statusMap.complete || 0,
        error: statusMap.error || 0
      },
      metrics: {
        last24Hours: recentActivity[0]?.count || 0,
        averageConfidence: avgConfidence?.avg_confidence || null,
        totalJobs: Object.values(statusMap).reduce((sum, count) => sum + count, 0)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in getOcrStatus:', error);
    res.status(500).json({ 
      error: 'Failed to fetch OCR status',
      details: error.message 
    });
  }
};

/**
 * Get specific OCR job details including extracted text and entities
 */
exports.getOcrJobDetails = async (req, res) => {
  try {
    const churchId = req.params.id;
    const jobId = req.params.jobId;

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Get job details
    const [jobs] = await db.query(`
      SELECT 
        id, church_id, filename, original_filename, file_path, status,
        ocr_result, ocr_result_translation, 
        extracted_entities, entity_confidence, confidence_score,
        record_type, language, created_at, updated_at,
        processing_started_at, processing_completed_at
      FROM ocr_jobs 
      WHERE church_id = ? AND id = ?
    `, [churchId, jobId]);

    if (!jobs.length) {
      return res.status(404).json({ error: 'OCR job not found' });
    }

    const job = jobs[0];

    // Parse extracted entities if they exist
    let extractedEntities = null;
    if (job.extracted_entities) {
      try {
        extractedEntities = typeof job.extracted_entities === 'string' 
          ? JSON.parse(job.extracted_entities) 
          : job.extracted_entities;
      } catch (e) {
        console.warn('Failed to parse extracted entities:', e);
      }
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        church_id: job.church_id,
        filename: job.filename,
        original_filename: job.original_filename,
        status: job.status,
        extracted_text: job.ocr_result, // Use ocr_result as extracted_text
        ocr_result: job.ocr_result,
        ocr_result_translation: job.ocr_result_translation,
        extracted_entities: extractedEntities,
        entity_confidence: job.entity_confidence,
        confidence_score: job.confidence_score,
        record_type: job.record_type,
        language: job.language,
        created_at: job.created_at,
        updated_at: job.updated_at,
        processing_started_at: job.processing_started_at,
        processing_completed_at: job.processing_completed_at
      }
    });

  } catch (error) {
    console.error('Error in getOcrJobDetails:', error);
    res.status(500).json({ 
      error: 'Failed to fetch OCR job details',
      details: error.message 
    });
  }
};

/**
 * Get OCR job image file
 */
exports.getOcrJobImage = async (req, res) => {
  try {
    const churchId = req.params.id;
    const jobId = req.params.jobId;

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Get job file path
    const [jobs] = await db.query(`
      SELECT file_path, original_filename, mime_type
      FROM ocr_jobs 
      WHERE church_id = ? AND id = ?
    `, [churchId, jobId]);

    if (!jobs.length) {
      return res.status(404).json({ error: 'OCR job not found' });
    }

    const job = jobs[0];
    
    if (!job.file_path) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    // Check if file exists
    try {
      await fs.access(job.file_path);
    } catch (err) {
      return res.status(404).json({ error: 'Image file no longer exists on disk' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', job.mime_type || 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename="${job.original_filename}"`);
    
    // Send the file
    res.sendFile(path.resolve(job.file_path));

  } catch (error) {
    console.error('Error in getOcrJobImage:', error);
    res.status(500).json({ 
      error: 'Failed to fetch OCR job image',
      details: error.message 
    });
  }
};

/**
 * Update OCR job extracted fields
 */
exports.updateOcrJobFields = async (req, res) => {
  try {
    const churchId = req.params.id;
    const jobId = req.params.jobId;
    const { extracted_fields } = req.body;

    if (!extracted_fields || !Array.isArray(extracted_fields)) {
      return res.status(400).json({ error: 'extracted_fields must be an array' });
    }

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Update the job with new extracted entities
    const [result] = await db.query(`
      UPDATE ocr_jobs 
      SET 
        extracted_entities = ?,
        updated_at = NOW()
      WHERE church_id = ? AND id = ?
    `, [JSON.stringify(extracted_fields), churchId, jobId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'OCR job not found' });
    }

    // Log the update activity
    try {
      await db.query(
        'INSERT INTO activity_log (church_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, NOW())',
        [churchId, req.user?.id || null, 'ocr_update', `OCR job ${jobId} fields updated`]
      );
    } catch (logError) {
      console.warn('Failed to log OCR update activity:', logError);
    }

    res.json({
      success: true,
      message: 'OCR job fields updated successfully'
    });

  } catch (error) {
    console.error('Error in updateOcrJobFields:', error);
    res.status(500).json({ 
      error: 'Failed to update OCR job fields',
      details: error.message 
    });
  }
};

/**
 * Export OCR job results as JSON
 */
exports.exportOcrJobResults = async (req, res) => {
  try {
    const churchId = req.params.id;
    const jobId = req.params.jobId;

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Get job details
    const [jobs] = await db.query(`
      SELECT 
        id, church_id, filename, original_filename, status,
        extracted_text, ocr_result, ocr_result_translation,
        extracted_entities, entity_confidence, confidence_score,
        record_type, language, created_at, updated_at
      FROM ocr_jobs 
      WHERE church_id = ? AND id = ?
    `, [churchId, jobId]);

    if (!jobs.length) {
      return res.status(404).json({ error: 'OCR job not found' });
    }

    const job = jobs[0];

    // Parse extracted entities
    let extractedEntities = null;
    if (job.extracted_entities) {
      try {
        extractedEntities = typeof job.extracted_entities === 'string' 
          ? JSON.parse(job.extracted_entities) 
          : job.extracted_entities;
      } catch (e) {
        console.warn('Failed to parse extracted entities:', e);
      }
    }

    const exportData = {
      job_id: job.id,
      church_id: job.church_id,
      filename: job.original_filename,
      record_type: job.record_type,
      language: job.language,
      status: job.status,
      confidence_score: job.confidence_score,
      extracted_text: job.extracted_text || job.ocr_result,
      extracted_entities: extractedEntities,
      processing_dates: {
        created_at: job.created_at,
        updated_at: job.updated_at
      },
      export_date: new Date().toISOString()
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="ocr-results-${jobId}.json"`);
    
    res.json(exportData);

  } catch (error) {
    console.error('Error in exportOcrJobResults:', error);
    res.status(500).json({ 
      error: 'Failed to export OCR job results',
      details: error.message 
    });
  }
};

/**
 * Get OCR job details for preview modal
 */
exports.getOcrJobDetails = async (req, res) => {
  try {
    const churchId = req.params.id;
    const jobId = req.params.jobId;

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Get job details including extracted entities
    const [jobs] = await db.query(`
      SELECT 
        id, filename, original_filename, status, record_type, language,
        confidence_score, ocr_result, ocr_result_translation,
        extracted_entities, entity_confidence,
        created_at, updated_at, file_path
      FROM ocr_jobs 
      WHERE id = ? AND church_id = ?
    `, [jobId, churchId]);

    if (!jobs.length) {
      return res.status(404).json({ error: 'OCR job not found' });
    }

    const job = jobs[0];

    res.json({
      job: {
        id: job.id,
        filename: job.filename,
        original_filename: job.original_filename,
        status: job.status,
        record_type: job.record_type,
        language: job.language,
        confidence_score: job.confidence_score,
        ocr_result: job.ocr_result,
        ocr_result_translation: job.ocr_result_translation,
        extracted_text: job.ocr_result, // Use ocr_result as extracted_text
        extracted_entities: job.extracted_entities,
        entity_confidence: job.entity_confidence,
        created_at: job.created_at,
        updated_at: job.updated_at,
        file_path: job.file_path
      }
    });

  } catch (error) {
    console.error('Error in getOcrJobDetails:', error);
    res.status(500).json({ 
      error: 'Failed to fetch OCR job details',
      details: error.message 
    });
  }
};

/**
 * Get OCR job image for preview
 */
exports.getOcrJobImage = async (req, res) => {
  try {
    const churchId = req.params.id;
    const jobId = req.params.jobId;

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Get job file path
    const [jobs] = await db.query(`
      SELECT file_path, filename, mime_type
      FROM ocr_jobs 
      WHERE id = ? AND church_id = ?
    `, [jobId, churchId]);

    if (!jobs.length) {
      return res.status(404).json({ error: 'OCR job not found' });
    }

    const job = jobs[0];
    
    if (!job.file_path) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(job.file_path)) {
      return res.status(404).json({ error: 'Image file not found on disk' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', job.mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    
    // Stream the file
    fs.createReadStream(job.file_path).pipe(res);

  } catch (error) {
    console.error('Error in getOcrJobImage:', error);
    res.status(500).json({ 
      error: 'Failed to fetch OCR job image',
      details: error.message 
    });
  }
};

/**
 * Enhanced OCR parsing with preprocessing options
 */
exports.parseEnhanced = [upload.single('image'), async (req, res) => {
  try {
    const churchId = req.params.id;
    const { language = 'en', preprocess } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    let preprocessingOptions = {};
    if (preprocess) {
      try {
        preprocessingOptions = typeof preprocess === 'string' ? JSON.parse(preprocess) : preprocess;
      } catch (e) {
        console.warn('Failed to parse preprocessing options:', e);
      }
    }

    console.log('Enhanced OCR parse request:', {
      churchId,
      filename: req.file.originalname,
      language,
      preprocessingOptions
    });

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Create OCR job with enhanced options
    const [result] = await db.query(`
      INSERT INTO ocr_jobs (
        church_id, filename, original_filename, file_path, file_size, mime_type, 
        status, record_type, language, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'processing', 'baptism', ?, NOW())
    `, [
      churchId,
      req.file.filename,
      req.file.originalname,
      req.file.path,
      req.file.size,
      req.file.mimetype,
      language
    ]);

    const jobId = result.insertId;

    // TODO: Implement actual Google Vision API call with preprocessing
    // For now, return a mock response with structured segments
    const mockResponse = {
      text: "Sample extracted text from baptism record",
      confidence: 0.85,
      segments: [
        {
          text: "John Doe",
          confidence: 0.95,
          boundingBox: [100, 50, 200, 80],
          level: 'word'
        },
        {
          text: "Born: January 15, 1990", 
          confidence: 0.88,
          boundingBox: [100, 100, 300, 130],
          level: 'line'
        },
        {
          text: "Parents: Michael and Sarah Doe",
          confidence: 0.82,
          boundingBox: [100, 150, 400, 180],
          level: 'line'
        }
      ],
      processingTime: 1250,
      language: language
    };

    // Update job with results
    await db.query(`
      UPDATE ocr_jobs 
      SET 
        status = 'complete',
        ocr_result = ?,
        confidence_score = ?,
        raw_response_json = ?,
        processing_completed_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [
      mockResponse.text,
      mockResponse.confidence,
      JSON.stringify(mockResponse),
      jobId
    ]);

    res.json({
      success: true,
      jobId: jobId,
      ...mockResponse
    });

  } catch (error) {
    console.error('Error in enhanced OCR parsing:', error);
    res.status(500).json({ 
      error: 'Enhanced OCR parsing failed',
      details: error.message 
    });
  }
}];

/**
 * Extract structured fields from OCR results
 */
exports.extractFields = async (req, res) => {
  try {
    const churchId = req.params.id;
    const { ocrResults, recordType = 'baptism', language = 'en' } = req.body;

    if (!ocrResults || !Array.isArray(ocrResults)) {
      return res.status(400).json({ error: 'ocrResults must be an array' });
    }

    // Mock field extraction based on record type
    const extractedFields = [];
    
    if (recordType === 'baptism') {
      extractedFields.push(
        { label: 'Full Name', value: 'John Doe', confidence: 0.95, editable: true, required: true },
        { label: 'Birth Date', value: 'January 15, 1990', confidence: 0.88, editable: true, required: true },
        { label: 'Parents', value: 'Michael and Sarah Doe', confidence: 0.82, editable: true, required: false },
        { label: 'Clergy', value: 'Fr. George', confidence: 0.75, editable: true, required: false },
        { label: 'Date of Baptism', value: '', confidence: 0, editable: true, required: true }
      );
    }

    res.json({
      success: true,
      fields: extractedFields,
      recordType,
      language
    });

  } catch (error) {
    console.error('Error in field extraction:', error);
    res.status(500).json({ 
      error: 'Field extraction failed',
      details: error.message 
    });
  }
};

/**
 * Save wizard results
 */
exports.saveWizardResults = async (req, res) => {
  try {
    const churchId = req.params.id;
    const { 
      files, 
      preprocessingOptions, 
      ocrResults, 
      extractedFields, 
      approved = false 
    } = req.body;

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    const savedJobs = [];

    // Save each file's results
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ocrResult = ocrResults[i];
      
      const [result] = await db.query(`
        INSERT INTO ocr_jobs (
          church_id, filename, original_filename, status, record_type, language,
          ocr_result, confidence_score, extracted_entities, 
          raw_response_json, approved, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        churchId,
        file.name,
        file.name,
        approved ? 'approved' : 'complete',
        'baptism',
        preprocessingOptions.language,
        ocrResult.text,
        ocrResult.confidence,
        JSON.stringify(extractedFields),
        JSON.stringify(ocrResult),
        approved ? 1 : 0
      ]);

      savedJobs.push({
        jobId: result.insertId,
        filename: file.name,
        status: approved ? 'approved' : 'complete'
      });
    }

    // Log the wizard completion
    try {
      await db.query(
        'INSERT INTO activity_log (church_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, NOW())',
        [churchId, req.user?.id || null, 'ocr_wizard_complete', `Wizard completed: ${files.length} files processed`]
      );
    } catch (logError) {
      console.warn('Failed to log wizard completion:', logError);
    }

    res.json({
      success: true,
      message: `Successfully saved ${savedJobs.length} OCR results`,
      jobs: savedJobs
    });

  } catch (error) {
    console.error('Error saving wizard results:', error);
    res.status(500).json({ 
      error: 'Failed to save wizard results',
      details: error.message 
    });
  }
};

/**
 * Process OCR job with Google Vision API using preprocessed image
 */
async function processOcrJob(db, jobId, imagePath, options = {}) {
  const startTime = Date.now();
  
  try {
    console.log(`🔍 Processing OCR job ${jobId} with image: ${imagePath}`);
    
    // Update job status to processing
    await db.query('UPDATE ocr_jobs SET status = ?, processing_started_at = NOW() WHERE id = ?', ['processing', jobId]);
    
    const { language = 'en', recordType = 'baptism' } = options;
    
    // Check if Google Vision API is configured
    const vision = require('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient();
    
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
    const confidence = calculateAverageConfidence(textAnnotations);
    
    console.log(`📝 OCR completed: ${extractedText.length} characters extracted`);
    console.log(`🎯 Confidence score: ${(confidence * 100).toFixed(1)}%`);
    
    // Structure the response data
    const ocrData = {
      text: extractedText,
      confidence: confidence,
      segments: textAnnotations.slice(1).map(annotation => ({
        text: annotation.description,
        confidence: annotation.confidence || 0.5,
        boundingBox: annotation.boundingPoly
      })),
      language: language,
      pages: fullTextAnnotation.pages || [],
      rawResponse: {
        textAnnotations: textAnnotations.length,
        hasFullText: !!fullTextAnnotation.text
      }
    };
    
    const processingTime = Date.now() - startTime;
    
    // Update job with results
    await db.query(`
      UPDATE ocr_jobs SET 
        status = 'complete',
        ocr_result = ?,
        confidence_score = ?,
        raw_response_json = ?,
        segments_json = ?,
        processing_completed_at = NOW()
      WHERE id = ?
    `, [
      extractedText,
      confidence,
      JSON.stringify(result),
      JSON.stringify(ocrData.segments),
      jobId
    ]);
    
    console.log(`✅ OCR job ${jobId} completed successfully in ${processingTime}ms`);
    
    return {
      success: true,
      jobId,
      extractedText,
      confidence,
      processingTime
    };
    
  } catch (error) {
    console.error(`❌ OCR processing failed for job ${jobId}:`, error);
    
    const processingTime = Date.now() - startTime;
    
    // Update job with error status
    try {
      await db.query(`
        UPDATE ocr_jobs SET 
          status = 'error',
          error_message = ?,
          processing_completed_at = NOW(),
          updated_at = NOW()
        WHERE id = ?
      `, [
        error.message,
        jobId
      ]);
    } catch (updateError) {
      console.error('Failed to update job with error status:', updateError);
    }
    
    throw error;
  }
}

/**
 * Calculate average confidence score from text annotations
 */
function calculateAverageConfidence(textAnnotations) {
  if (!textAnnotations || textAnnotations.length === 0) {
    return 0;
  }
  
  // Skip the first annotation (full text) and calculate from individual words
  const wordAnnotations = textAnnotations.slice(1);
  
  if (wordAnnotations.length === 0) {
    return 0.5; // Default confidence if no word-level data
  }
  
  const totalConfidence = wordAnnotations.reduce((sum, annotation) => {
    return sum + (annotation.confidence || 0.5);
  }, 0);
  
  return totalConfidence / wordAnnotations.length;
}
