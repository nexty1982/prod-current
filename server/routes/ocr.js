// OCR Routes with Barcode Validation
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { validateOCRSession, markSessionAsUsed } = require('../middleware/sessionValidation');
const { sendOCRReceipt, sendErrorNotification } = require('../utils/emailService');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 20 * 1024 * 1024, // 20MB
    files: parseInt(process.env.MAX_FILES_PER_UPLOAD) || 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/gif',
      'image/webp',
      'application/pdf'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

// Rate limiting for session creation
const sessionCreateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 sessions per IP per 15 minutes
  message: {
    success: false,
    error: 'Too many session creation attempts. Please try again later.'
  }
});

// Rate limiting for uploads
const uploadLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per IP per hour
  message: {
    success: false,
    error: 'Upload limit exceeded. Please try again later.'
  }
});

// Middleware to log requests
router.use((req, res, next) => {
  if (logger && logger.info) {
    logger.info(`OCR API Request: ${req.method} ${req.path} from ${req.ip}`);
  }
  next();
});

// Enhanced OCR upload endpoint with session validation
router.post('/upload', uploadLimit, upload.array('files', 10), validateOCRSession, async (req, res) => {
  let uploadedFiles = [];

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
        code: 'NO_FILES'
      });
    }

    uploadedFiles = req.files;
    const session = req.ocrSession; // Attached by middleware
    const {
      language = 'auto',
      includeTranslation = false,
      targetLanguage = 'en',
      enhanceImage = true
    } = req.body;

    const startTime = Date.now();
    const results = [];

    // Process each file
    for (const file of req.files) {
      try {
        // Here you would integrate with Google Vision API
        // For now, we'll simulate OCR processing
        const result = await processOCRFile(file, {
          language,
          enhanceImage,
          includeTranslation,
          targetLanguage
        });

        results.push({
          filename: file.originalname,
          success: true,
          text: result.text,
          confidence: result.confidence,
          translatedText: result.translatedText,
          metadata: result.metadata
        });

      } catch (fileError) {
        results.push({
          filename: file.originalname,
          success: false,
          error: fileError.message
        });
      }
    }

    const processingTime = Date.now() - startTime;

    // Aggregate results
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    const responseData = {
      success: successfulResults.length > 0,
      sessionId: session.session_id,
      results,
      summary: {
        totalFiles: req.files.length,
        successful: successfulResults.length,
        failed: failedResults.length,
        processingTime: processingTime,
        totalExtractedText: successfulResults.map(r => r.text).join('\n\n')
      }
    };

    // Send email receipt if user email is available
    if (session.user_email && successfulResults.length > 0) {
      try {
        await sendOCRReceipt(session, {
          processedImages: successfulResults.length,
          extractedText: responseData.summary.totalExtractedText,
          translatedText: successfulResults.map(r => r.translatedText).filter(Boolean).join('\n\n'),
          confidence: successfulResults.reduce((avg, r) => avg + r.confidence, 0) / successfulResults.length
        });
      } catch (emailError) {
        console.error('Failed to send receipt email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Mark session as used
    await markSessionAsUsed(req, res, () => { });

    // Clean up uploaded files
    uploadedFiles.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });

    res.json(responseData);

  } catch (error) {
    console.error('OCR processing error:', error);

    // Send error notification email
    if (req.ocrSession?.user_email) {
      try {
        await sendErrorNotification(req.ocrSession, error);
      } catch (emailError) {
        console.error('Failed to send error notification:', emailError);
      }
    }

    // Clean up uploaded files
    uploadedFiles.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });

    res.status(500).json({
      success: false,
      error: 'OCR processing failed',
      details: error.message,
      code: 'PROCESSING_ERROR'
    });
  }
});

// Simulate OCR processing (replace with actual Google Vision integration)
async function processOCRFile(file, options) {
  // This is a placeholder - integrate with Google Vision API
  const mockResult = {
    text: `Extracted text from ${file.originalname}\n\nSample Orthodox Church Record:\nName: John Doe\nDate: 2024-01-15\nPlace: St. Nicholas Orthodox Church`,
    confidence: 0.85 + Math.random() * 0.1,
    metadata: {
      language: options.language,
      fileSize: file.size,
      mimeType: file.mimetype,
      processedAt: new Date().toISOString()
    }
  };

  // Simulate translation if requested
  if (options.includeTranslation && options.targetLanguage !== 'auto') {
    mockResult.translatedText = `[Translated to ${options.targetLanguage}] ${mockResult.text}`;
  }

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  return mockResult;
}

// Russian OCR endpoint
router.post('/ocr-ru', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const startTime = Date.now();
    const result = await processOCR(req.file.path, 'Russian');
    const processingTime = Date.now() - startTime;

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      text: result.text,
      confidence: result.confidence,
      metadata: {
        language: 'Russian',
        processingTime: processingTime,
        fileSize: req.file.size,
        imageResolution: req.file.mimetype.startsWith('image/') ? {
          width: null,
          height: null
        } : undefined
      }
    });
  } catch (error) {
    console.error('Russian OCR error:', error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'OCR processing failed'
    });
  }
});

// Romanian OCR endpoint
router.post('/ocr-ro', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const startTime = Date.now();
    const result = await processOCR(req.file.path, 'Romanian');
    const processingTime = Date.now() - startTime;

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      text: result.text,
      confidence: result.confidence,
      metadata: {
        language: 'Romanian',
        processingTime: processingTime,
        fileSize: req.file.size,
        imageResolution: req.file.mimetype.startsWith('image/') ? {
          width: null,
          height: null
        } : undefined
      }
    });
  } catch (error) {
    console.error('Romanian OCR error:', error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'OCR processing failed'
    });
  }
});

// Greek OCR endpoint
router.post('/ocr-gr', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const startTime = Date.now();
    const result = await processOCR(req.file.path, 'Greek');
    const processingTime = Date.now() - startTime;

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      text: result.text,
      confidence: result.confidence,
      metadata: {
        language: 'Greek',
        processingTime: processingTime,
        fileSize: req.file.size,
        imageResolution: req.file.mimetype.startsWith('image/') ? {
          width: null,
          height: null
        } : undefined
      }
    });
  } catch (error) {
    console.error('Greek OCR error:', error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'OCR processing failed'
    });
  }
});

// General OCR processing endpoint
router.post('/ocr', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const { language = 'English' } = req.body;
    const results = [];
    const startTime = Date.now();

    console.log(`🔍 Processing ${req.files.length} files for OCR with language: ${language}`);

    // Process each file
    for (const file of req.files) {
      try {
        console.log(`📄 Processing file: ${file.originalname}`);
        const result = await processOCR(file.path, language);

        results.push({
          filename: file.originalname,
          success: true,
          text: result.text,
          confidence: result.confidence,
          language: language
        });

        // Clean up file
        fs.unlinkSync(file.path);
      } catch (fileError) {
        console.error(`❌ Error processing ${file.originalname}:`, fileError);
        results.push({
          filename: file.originalname,
          success: false,
          error: fileError.message
        });

        // Clean up file even if processing failed
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }
    }

    const processingTime = Date.now() - startTime;
    const successfulResults = results.filter(r => r.success);

    console.log(`✅ OCR processing complete: ${successfulResults.length}/${results.length} files successful`);

    res.json({
      success: successfulResults.length > 0,
      results,
      summary: {
        totalFiles: req.files.length,
        successful: successfulResults.length,
        failed: results.length - successfulResults.length,
        processingTime: processingTime,
        language: language,
        extractedText: successfulResults.map(r => r.text).join('\n\n')
      }
    });

  } catch (error) {
    console.error('❌ OCR processing error:', error);

    // Clean up any uploaded files
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'OCR processing failed'
    });
  }
});

// OCR processing endpoint with session validation (alternative endpoint)
router.post('/process', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const { language = 'English', sessionId } = req.body;
    const results = [];
    const startTime = Date.now();

    console.log(`🔍 Processing ${req.files.length} files for OCR with language: ${language}, sessionId: ${sessionId}`);

    // Process each file
    for (const file of req.files) {
      try {
        console.log(`📄 Processing file: ${file.originalname}`);
        const result = await processOCR(file.path, language);

        results.push({
          filename: file.originalname,
          success: true,
          text: result.text,
          confidence: result.confidence,
          language: language
        });

        // Clean up file
        fs.unlinkSync(file.path);
      } catch (fileError) {
        console.error(`❌ Error processing ${file.originalname}:`, fileError);
        results.push({
          filename: file.originalname,
          success: false,
          error: fileError.message
        });

        // Clean up file even if processing failed
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }
    }

    const processingTime = Date.now() - startTime;
    const successfulResults = results.filter(r => r.success);

    console.log(`✅ OCR processing complete: ${successfulResults.length}/${results.length} files successful`);

    res.json({
      success: successfulResults.length > 0,
      sessionId: sessionId,
      results,
      summary: {
        totalFiles: req.files.length,
        successful: successfulResults.length,
        failed: results.length - successfulResults.length,
        processingTime: processingTime,
        language: language,
        extractedText: successfulResults.map(r => r.text).join('\n\n')
      }
    });

  } catch (error) {
    console.error('❌ OCR processing error:', error);

    // Clean up any uploaded files
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'OCR processing failed'
    });
  }
});

// Health check endpoint
router.get('/ocr-health', (req, res) => {
  res.json({
    success: true,
    message: 'OCR service is running',
    supportedLanguages: ['English', 'Russian', 'Romanian', 'Greek'],
    maxFileSize: '20MB',
    supportedFormats: ['PNG', 'JPG', 'JPEG', 'PDF']
  });
});

// Enhanced OCR parsing endpoint with preprocessing
router.post('/parse-enhanced', upload.single('image'), async (req, res) => {
  const { churchOcrController } = require('../controllers/churchOcrController');
  return churchOcrController.parseEnhanced(req, res);
});

// Field extraction endpoint
router.post('/extract-fields', async (req, res) => {
  const { churchOcrController } = require('../controllers/churchOcrController');
  return churchOcrController.extractFields(req, res);
});

// Save wizard results endpoint  
router.post('/wizard-results', upload.array('images'), async (req, res) => {
  const { churchOcrController } = require('../controllers/churchOcrController');
  return churchOcrController.saveWizardResults(req, res);
});

// Submit corrected multi-record results endpoint
router.post('/submit-corrected-records', async (req, res) => {
  try {
    const { churchId, records, ocrLines, mappingMetadata } = req.body;

    if (!churchId || !records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: churchId, records'
      });
    }

    // Validate at least one record has required fields
    const validRecords = records.filter(record => 
      record.name && record.name.trim() && 
      record.death_date && record.death_date.trim()
    );

    if (validRecords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one record must have name and death_date'
      });
    }

    // Connect to the church's database
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: `church_${churchId}_records`
    });

    const insertedRecords = [];

    try {
      await connection.beginTransaction();

      // Insert each valid record into the database
      for (const record of validRecords) {
        const insertQuery = `
          INSERT INTO funeralrecords (
            death_date, burial_date, name, age, cause_of_death,
            priest_administered, priest_officiated, burial_location,
            created_at, updated_at, data_source, ocr_confidence_avg
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 'multi_record_ocr', ?)
        `;

        // Calculate average confidence for the record
        const confidenceScores = [];
        Object.keys(record).forEach(key => {
          if (key.endsWith('_metadata') && record[key]?.confidence) {
            confidenceScores.push(record[key].confidence);
          }
        });
        const avgConfidence = confidenceScores.length > 0 
          ? confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length 
          : 0.5;

        const values = [
          record.death_date || null,
          record.burial_date || null,
          record.name || null,
          record.age ? parseInt(record.age) : null,
          record.cause_of_death || null,
          record.priest_administered || null,
          record.priest_officiated || null,
          record.burial_location || null,
          Math.round(avgConfidence * 100) / 100
        ];

        const [result] = await connection.execute(insertQuery, values);
        
        insertedRecords.push({
          id: result.insertId,
          originalId: record.id,
          name: record.name,
          death_date: record.death_date,
          confidence: avgConfidence
        });
      }

      await connection.commit();

      // Log the successful processing
      if (logger && logger.info) {
        logger.info(`Multi-record OCR: Inserted ${insertedRecords.length} death records for church ${churchId}`);
      }

      res.json({
        success: true,
        message: `Successfully processed ${insertedRecords.length} death records`,
        insertedRecords,
        metadata: {
          totalSubmitted: records.length,
          validRecords: validRecords.length,
          insertedCount: insertedRecords.length,
          averageConfidence: insertedRecords.reduce((sum, r) => sum + r.confidence, 0) / insertedRecords.length,
          processingMetadata: mappingMetadata
        }
      });

    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      await connection.end();
    }

  } catch (error) {
    if (logger && logger.error) {
      logger.error('Multi-record OCR submission failed:', error);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process corrected records',
      details: error.message
    });
  }
});

module.exports = router;
