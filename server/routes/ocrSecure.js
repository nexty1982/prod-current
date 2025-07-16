// OCR Routes with Barcode Validation - New Secure System
const express = require('express');
const multer = require('multer');
const path = require('path');
const rateLimit = require('express-rate-limit');
const ocrController = require('../controllers/ocrController');

const router = express.Router();

// Mock logger for compatibility
const logger = {
  info: (msg) => console.log('[INFO]', msg),
  error: (msg) => console.error('[ERROR]', msg)
};

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
  logger.info(`OCR API Request: ${req.method} ${req.path} from ${req.ip}`);
  next();
});

/**
 * POST /api/ocr/session
 * Create a new OCR session with barcode
 */
router.post('/session', sessionCreateLimit, ocrController.createSession);

/**
 * GET /validate-upload
 * Validate barcode scan (public endpoint for mobile access)
 */
router.get('/validate-upload', ocrController.validateSession);

/**
 * GET /api/ocr/session/:sessionId/status
 * Check session status and verification state
 */
router.get('/session/:sessionId/status', ocrController.checkSessionStatus);

/**
 * POST /api/ocr/session/:sessionId/disclaimer
 * Accept disclaimer and configure session
 */
router.post('/session/:sessionId/disclaimer', ocrController.acceptDisclaimer);

/**
 * POST /api/ocr/session/:sessionId/upload
 * Upload and process images (requires verified session)
 */
router.post('/session/:sessionId/upload', 
  uploadLimit,
  upload.array('images', 10),
  (req, res, next) => {
    // Validate file upload
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }
    
    // Log upload details
    logger.info(`Received ${req.files.length} files for session ${req.params.sessionId}`);
    req.files.forEach(file => {
      logger.info(`  - ${file.originalname} (${file.size} bytes, ${file.mimetype})`);
    });
    
    next();
  },
  ocrController.uploadAndProcess
);

/**
 * GET /api/ocr/session/:sessionId/results
 * Get processing results
 */
router.get('/session/:sessionId/results', ocrController.getResults);

/**
 * GET /api/ocr/download/:sessionId/:format
 * Download results in PDF or Excel format
 */
router.get('/download/:sessionId/:format', async (req, res) => {
  try {
    const { sessionId, format } = req.params;
    
    if (!['pdf', 'xlsx'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Use pdf or xlsx.'
      });
    }
    
    // For now, return a placeholder response
    res.json({
      success: true,
      message: `${format.toUpperCase()} download will be available soon`,
      sessionId,
      format
    });
    
  } catch (error) {
    logger.error('Download failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate download'
    });
  }
});

/**
 * GET /api/ocr/languages
 * Get supported languages
 */
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    languages: [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'gr', name: 'Greek', flag: '🇬🇷' },
      { code: 'ru', name: 'Russian', flag: '🇷🇺' },
      { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
      { code: 'sr', name: 'Serbian', flag: '🇷🇸' },
      { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' }
    ]
  });
});

/**
 * GET /api/ocr/disclaimers/:language
 * Get disclaimer text in specified language
 */
router.get('/disclaimers/:language', (req, res) => {
  const { language } = req.params;
  
  const disclaimers = {
    en: {
      title: 'Terms of Use - OCR Processing Service',
      sections: [
        {
          title: 'Data Processing',
          content: 'By uploading documents, you consent to OCR processing using Google Vision API. Your images will be temporarily stored and processed on our secure servers.'
        },
        {
          title: 'Privacy',
          content: 'Uploaded documents are automatically deleted after 24 hours. We do not retain copies of your documents or extracted text beyond this period.'
        },
        {
          title: 'Accuracy',
          content: 'OCR results may contain errors. We recommend reviewing all extracted text for accuracy before using it for official purposes.'
        },
        {
          title: 'Liability',
          content: 'This service is provided "as-is" without warranties. We are not liable for any errors, omissions, or damages arising from the use of this service.'
        },
        {
          title: 'Acceptable Use',
          content: 'This service is intended for Orthodox church records only. Do not upload personal documents, copyrighted material, or sensitive information.'
        }
      ],
      acceptance: 'I understand and accept these terms',
      required: 'You must accept the terms to continue'
    },
    gr: {
      title: 'Όροι Χρήσης - Υπηρεσία Επεξεργασίας OCR',
      sections: [
        {
          title: 'Επεξεργασία Δεδομένων',
          content: 'Ανεβάζοντας έγγραφα, συναινείτε στην επεξεργασία OCR με χρήση Google Vision API. Οι εικόνες σας θα αποθηκευτούν προσωρινά και θα επεξεργαστούν στους ασφαλείς διακομιστές μας.'
        },
        {
          title: 'Απόρρητο',
          content: 'Τα έγγραφα που ανεβάζετε διαγράφονται αυτόματα μετά από 24 ώρες. Δεν διατηρούμε αντίγραφα των εγγράφων ή του εξαγόμενου κειμένου πέρα από αυτό το διάστημα.'
        }
      ],
      acceptance: 'Κατανοώ και αποδέχομαι αυτούς τους όρους',
      required: 'Πρέπει να αποδεχτείτε τους όρους για να συνεχίσετε'
    }
  };
  
  const disclaimer = disclaimers[language] || disclaimers.en;
  
  res.json({
    success: true,
    language,
    disclaimer
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  logger.error('OCR API Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 20MB.'
      });
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum 10 files per upload.'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});

module.exports = router;
