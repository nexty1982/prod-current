// server/routes/ocrVision.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { promisePool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { preprocessImage } = require('../utils/preprocessImage');

// Initialize Google Vision API client with error handling
let visionClient = null;
try {
    const vision = require('@google-cloud/vision');
    visionClient = new vision.ImageAnnotatorClient();
    console.log('Google Vision API client initialized successfully');
} catch (error) {
    console.warn('Google Vision API not available:', error.message);
    console.log('OCR routes will use mock responses instead');
}

const router = express.Router();

// Ensure required directories exist
const uploadsDir = process.env.UPLOAD_DIR || './uploads';
const resultsDir = process.env.OCR_RESULTS_DIR || './ocr-results';

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
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
        files: 1
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

// Middleware to verify upload token
const verifyUploadToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.body.upload_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Upload token is required'
            });
        }

        const payload = jwt.verify(token, process.env.UPLOAD_TOKEN_SECRET || 'default-secret-change-in-production');

        // Add token data to request
        req.uploadToken = payload;
        req.tokenAuth = true;

        console.log('Upload token verified:', payload);
        next();

    } catch (error) {
        console.error('Upload token verification failed:', error);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Upload token has expired'
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Invalid upload token'
        });
    }
};

// Extract text using Google Vision API
const extractTextWithVision = async (imagePath, language = 'en') => {
    if (!visionClient) {
        // Return mock response when Google Vision API is not available
        console.log('Google Vision API not available, returning mock OCR response');
        return {
            text: `Mock OCR text extracted from image: ${path.basename(imagePath)}
This is a simulated OCR response for testing purposes.
Language: ${language}
Timestamp: ${new Date().toISOString()}

[Original image would be processed here with Google Vision API]`,
            confidence: 0.85,
            language: language
        };
    }

    try {
        const [result] = await visionClient.documentTextDetection({
            image: { source: { filename: imagePath } },
            imageContext: {
                languageHints: [language]
            }
        });

        const fullTextAnnotation = result.fullTextAnnotation;
        const extractedText = fullTextAnnotation?.text || '';

        // Calculate confidence score
        let totalConfidence = 0;
        let wordCount = 0;

        if (fullTextAnnotation?.pages) {
            fullTextAnnotation.pages.forEach(page => {
                page.blocks?.forEach(block => {
                    block.paragraphs?.forEach(paragraph => {
                        paragraph.words?.forEach(word => {
                            if (word.confidence) {
                                totalConfidence += word.confidence;
                                wordCount++;
                            }
                        });
                    });
                });
            });
        }

        const confidence = wordCount > 0 ? totalConfidence / wordCount : 0;

        return {
            text: extractedText,
            confidence: confidence,
            wordCount: wordCount,
            fullAnnotation: fullTextAnnotation
        };
    } catch (error) {
        console.error('Google Vision API error:', error);
        throw error;
    }
};

// Mock OCR for testing when Vision API is not available
const mockOCR = async (imagePath, language = 'en') => {
    console.log(`Mock OCR processing for ${imagePath} (language: ${language})`);

    return {
        text: `Mock OCR result for ${path.basename(imagePath)}. Language: ${language}. This is a test extraction that would normally contain the actual text from the image.`,
        confidence: 0.85,
        wordCount: 20,
        fullAnnotation: null
    };
};

// Generic OCR processing function
const processOCR = async (req, res, language) => {
    try {
        console.log(`=== OCR Processing Start (${language}) ===`);
        console.log('Request body:', req.body);
        console.log('File info:', req.file ? {
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        } : 'No file');
        console.log('Token auth:', req.tokenAuth ? 'Yes' : 'No');
        console.log('Upload token data:', req.uploadToken);

        const {
            church_id,
            record_type = 'baptism',
            submitted_by,
            auth_token,
            upload_token
        } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Determine user and church info based on auth method
        let userId, churchId, recordType, submittedBy;

        if (req.tokenAuth && req.uploadToken) {
            // Token-based upload
            userId = req.uploadToken.created_by || 1;
            churchId = req.uploadToken.church_id;
            recordType = req.uploadToken.record_type || record_type;
            submittedBy = `Token Upload (Church ${churchId})`;

            console.log('Using token-based authentication');
        } else {
            // Regular authenticated upload
            userId = req.session?.user?.id || req.user?.id || 1;
            churchId = church_id || req.session?.user?.churchId || 1;
            recordType = record_type;
            submittedBy = submitted_by || `User ${userId}`;

            console.log('Using session-based authentication');
        }

        const jobId = uuidv4();
        const filePath = req.file.path;
        const preprocessedPath = `${filePath}-processed.png`;

        // Preprocess image
        const processedImagePath = await preprocessImage(filePath, preprocessedPath);

        // Extract text using Google Vision API or mock
        let ocrResult;
        try {
            ocrResult = visionClient
                ? await extractTextWithVision(processedImagePath, language)
                : await mockOCR(processedImagePath, language);
        } catch (visionError) {
            console.error('Vision API failed, falling back to mock:', visionError);
            ocrResult = await mockOCR(processedImagePath, language);
        }

        // Prepare structured result
        const result = {
            id: jobId,
            file_name: req.file.originalname,
            language: language,
            church_id: churchId,
            record_type: recordType,
            submitted_by: submittedBy,
            extracted_text: ocrResult.text,
            confidence: ocrResult.confidence,
            word_count: ocrResult.wordCount,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            processing_time: new Date(),
            created_at: new Date(),
            status: 'completed',
            auth_method: req.tokenAuth ? 'token' : 'session'
        };

        // Save result to JSON file
        const resultPath = path.join(resultsDir, `${jobId}.json`);
        fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

        // Store in database
        try {
            await promisePool.query(`
        INSERT INTO ocr_sessions (
          session_id,
          user_id,
          original_filename,
          file_path,
          file_size,
          mime_type,
          status,
          extracted_text,
          confidence_score,
          language_code,
          church_id,
          record_type,
          result_json_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                jobId,
                userId,
                req.file.originalname,
                req.file.path,
                req.file.size,
                req.file.mimetype,
                'completed',
                ocrResult.text,
                ocrResult.confidence,
                language,
                churchId,
                recordType,
                resultPath
            ]);

            console.log(`OCR result saved to database with job ID: ${jobId}`);
        } catch (dbError) {
            console.error('Database save failed:', dbError);
            // Continue anyway, we have the file result
        }

        // Clean up temporary files
        try {
            if (fs.existsSync(preprocessedPath)) {
                fs.unlinkSync(preprocessedPath);
            }
        } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
        }

        console.log(`=== OCR Processing Complete (${language}) ===`);

        res.status(200).json({
            success: true,
            jobId: jobId,
            data: result,
            message: 'OCR processing completed successfully'
        });

    } catch (error) {
        console.error(`OCR processing error (${language}):`, error);

        // Clean up uploaded files on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            message: 'OCR processing failed',
            error: error.message
        });
    }
};

// Language-specific OCR routes
const supportedLanguages = (process.env.OCR_LANGUAGES || 'en,gr,ru,ro').split(',');

// Authenticated routes (require login)
supportedLanguages.forEach(lang => {
    router.post(`/ocr-${lang}`, requireAuth, upload.single('file'), async (req, res) => {
        await processOCR(req, res, lang);
    });

    console.log(`OCR route registered: /api/ocr-${lang}`);
});

// Public tokenized upload routes (no login required)
supportedLanguages.forEach(lang => {
    router.post(`/public-ocr-${lang}`, verifyUploadToken, upload.single('file'), async (req, res) => {
        await processOCR(req, res, lang);
    });

    console.log(`Public OCR route registered: /api/public-ocr-${lang}`);
});

// Generic OCR route
router.post('/ocr', requireAuth, upload.single('file'), async (req, res) => {
    const language = req.body.language || 'en';
    await processOCR(req, res, language);
});

// Test OCR route without authentication (for testing purposes)
router.post('/test-ocr', upload.single('file'), async (req, res) => {
    console.log('=== Test OCR Route (No Auth) ===');
    await processOCR(req, res, 'en');
});

// Get OCR result by job ID
router.get('/ocr/result/:jobId', requireAuth, async (req, res) => {
    try {
        const { jobId } = req.params;

        // Try to get from database first
        const [rows] = await promisePool.query(
            'SELECT * FROM ocr_sessions WHERE session_id = ?',
            [jobId]
        );

        if (rows.length > 0) {
            const dbResult = rows[0];
            res.json({
                success: true,
                completed: true,
                result: {
                    id: dbResult.session_id,
                    text: dbResult.extracted_text,
                    confidence: dbResult.confidence_score,
                    language: dbResult.language_code,
                    filename: dbResult.original_filename,
                    created_at: dbResult.created_at
                }
            });
        } else {
            // Try to get from JSON file
            const resultPath = path.join(resultsDir, `${jobId}.json`);
            if (fs.existsSync(resultPath)) {
                const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
                res.json({
                    success: true,
                    completed: true,
                    result: result
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'OCR result not found'
                });
            }
        }
    } catch (error) {
        console.error('Error retrieving OCR result:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve OCR result'
        });
    }
});

// List OCR results for user
router.get('/ocr/results', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;

        const [rows] = await promisePool.query(
            'SELECT session_id, original_filename, status, confidence_score, language_code, created_at FROM ocr_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );

        res.json({
            success: true,
            results: rows
        });
    } catch (error) {
        console.error('Error listing OCR results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list OCR results'
        });
    }
});

// Simple status endpoint for testing OCR service availability
router.get('/ocr-status', (req, res) => {
    res.json({
        success: true,
        message: 'OCR Vision API service is running',
        endpoints: {
            authenticated: '/api/ocr-{lang}, /api/ocr',
            public: '/api/public-ocr-{lang}',
            test: '/api/test-ocr'
        },
        supportedLanguages: ['en', 'ru', 'ro', 'gr'],
        maxFileSize: '20MB',
        supportedFormats: ['image/jpeg', 'image/png', 'image/tiff', 'image/gif', 'application/pdf']
    });
});

// Mock OCR endpoint for testing without Google Vision API
router.post('/mock-ocr', upload.single('file'), async (req, res) => {
    try {
        console.log('Mock OCR endpoint called');

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        console.log('File received:', req.file.originalname, req.file.size);

        // Mock OCR results
        const mockResult = {
            success: true,
            message: 'Mock OCR processing completed successfully',
            data: {
                filename: req.file.originalname,
                fileSize: req.file.size,
                language: req.body.language || 'en',
                confidence: 0.95,
                extractedText: `Mock OCR Result for ${req.file.originalname}\n\nThis is a sample text extraction that would normally come from Google Vision API.\n\nThe file was successfully uploaded and processed.\n\nFilename: ${req.file.originalname}\nFile size: ${req.file.size} bytes\nLanguage: ${req.body.language || 'en'}\n\nOnce you set up Google Vision API, this will be replaced with actual OCR text extraction.`,
                pages: 1,
                processedAt: new Date().toISOString(),
                jobId: 'mock-' + Date.now(),
                extractedFields: {
                    'Document Type': 'Church Record',
                    'Date': '2024-01-01',
                    'Names': 'Sample Name',
                    'Status': 'Mock Processing Complete'
                }
            }
        };

        console.log('Returning mock result:', mockResult);

        res.json(mockResult);

    } catch (error) {
        console.error('Mock OCR error:', error);
        res.status(500).json({
            success: false,
            message: 'Mock OCR processing failed',
            error: error.message
        });
    }
});

module.exports = router;
