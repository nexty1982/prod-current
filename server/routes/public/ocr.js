// Public OCR API Routes - No authentication required
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Import the OCR processing service
const ocrService = require('../../services/ocrProcessingService');

// Import cost monitoring for translation
const TranslationCostMonitor = require('../../utils/translationCostMonitor');
const costMonitor = new TranslationCostMonitor();

// Import entity extraction routes
const entityExtractionRoutes = require('./entityExtraction');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
    }
  }
});

// Process OCR for uploaded file
router.post('/process', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { 
      language = 'auto', 
      enableTranslation = false,  // Translation is now opt-in
      targetLanguage = 'en'       // Target language for translation
    } = req.body;
    const jobId = uuidv4();

    console.log(`🔍 Processing public OCR job ${jobId} for file: ${req.file.originalname}`);
    console.log(`   - Translation enabled: ${enableTranslation}`);
    console.log(`   - Target language: ${targetLanguage}`);

    // Create a temporary file path
    const tempDir = path.join(__dirname, '../../temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, `${jobId}_${req.file.originalname}`);
    await fs.writeFile(tempFilePath, req.file.buffer);

    try {
      // Process OCR
      const ocrResult = await ocrService.performOcr(tempFilePath, language);
      
      // Extract text and confidence from Google Vision result
      let extractedText = '';
      let averageConfidence = 0;
      let detectedLanguage = language;
      
      if (ocrResult.textAnnotations && ocrResult.textAnnotations.length > 0) {
        // First annotation contains the full text
        extractedText = ocrResult.textAnnotations[0].description || '';
        
        // Calculate average confidence from all text annotations
        const confidences = ocrResult.textAnnotations
          .filter(annotation => annotation.confidence !== undefined)
          .map(annotation => annotation.confidence);
        
        if (confidences.length > 0) {
          averageConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
        } else {
          averageConfidence = 0.8; // Default confidence if not provided
        }
        
        // Try to detect language from the text
        if (ocrResult.textAnnotations[0].locale) {
          detectedLanguage = ocrResult.textAnnotations[0].locale;
        }
      } else {
        throw new Error('No text detected in image');
      }
      
      let translationResult = null;
      let translationCost = 0;
      
      // Only translate if explicitly requested by the user
      if (enableTranslation && extractedText && extractedText.trim().length > 0) {
        // Check cost limits before translation
        const characterCount = extractedText.length;
        const limitCheck = await costMonitor.checkLimits(characterCount);
        
        if (!limitCheck.allowed) {
          console.warn(`⚠️ Translation blocked: ${limitCheck.reason}`);
        } else {
          const estimatedCost = costMonitor.calculateCost(characterCount);
          console.log(`💰 Translation approved: $${estimatedCost.formattedCost} for ${characterCount} characters`);
          
          // Check if we need to translate (don't translate if already in target language)
          const shouldTranslate = detectedLanguage && 
                                 detectedLanguage !== targetLanguage && 
                                 detectedLanguage !== targetLanguage.substring(0, 2); // Handle 'en' vs 'eng'
          
          if (shouldTranslate) {
            try {
              translationResult = await ocrService.translateText(extractedText, detectedLanguage, targetLanguage);
              translationCost = estimatedCost.cost;
              
              // Log the actual cost
              await costMonitor.logCost(jobId, characterCount, translationCost, detectedLanguage, targetLanguage);
              
              console.log(`📝 Translated from ${detectedLanguage} to ${targetLanguage} (Cost: $${translationCost.toFixed(4)})`);
            } catch (translateError) {
              console.warn('⚠️ Translation failed:', translateError.message);
              // Continue without translation - not a critical error
            }
          } else {
            console.log(`ℹ️ Skipping translation - text is already in ${targetLanguage}`);
          }
        }
      } else if (!enableTranslation) {
        console.log('ℹ️ Translation disabled by user request');
      }

      // Clean up temporary file
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temp file:', cleanupError.message);
      }

      // Return results
      const response = {
        id: jobId,
        filename: req.file.originalname,
        text: extractedText,
        confidence: averageConfidence,
        detectedLanguage: detectedLanguage,
        language: language,
        translatedText: translationResult?.translation || null,
        translationConfidence: translationResult?.confidence || null,
        translationEnabled: enableTranslation,
        translationCost: translationCost,
        processedAt: new Date().toISOString(),
        status: 'completed'
      };

      console.log(`✅ Public OCR job ${jobId} completed successfully`);
      console.log(`   - Original text length: ${extractedText?.length || 0} characters`);
      console.log(`   - Confidence: ${(averageConfidence * 100).toFixed(1)}%`);
      console.log(`   - Language: ${detectedLanguage || language}`);
      console.log(`   - Translation: ${translationResult ? 'Yes' : 'No'}`);
      console.log(`   - Translation cost: $${translationCost.toFixed(4)}`);

      res.json(response);

    } catch (ocrError) {
      // Clean up temporary file on error
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temp file after error:', cleanupError.message);
      }
      throw ocrError;
    }

  } catch (error) {
    console.error('❌ Public OCR processing error:', error);
    
    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only images (JPEG, PNG, GIF, BMP, TIFF) and PDFs are supported.' 
      });
    }
    
    if (error.message.includes('File too large')) {
      return res.status(400).json({ 
        error: 'File too large. Maximum file size is 10MB.' 
      });
    }

    res.status(500).json({ 
      error: 'OCR processing failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Public OCR API',
    timestamp: new Date().toISOString(),
    supportedLanguages: [
      'auto', 'en', 'el', 'ro', 'ka', 'ru', 'sr', 'bg', 'mk'
    ],
    maxFileSize: '10MB',
    maxFiles: 5
  });
});

// Get supported languages
router.get('/languages', (req, res) => {
  const languages = [
    { code: 'auto', name: 'Auto-detect', native: 'Auto-detect' },
    { code: 'en', name: 'English', native: 'English' },
    { code: 'el', name: 'Greek', native: 'Ελληνικά' },
    { code: 'ro', name: 'Romanian', native: 'Română' },
    { code: 'ka', name: 'Georgian', native: 'ქართული' },
    { code: 'ru', name: 'Russian', native: 'Русский' },
    { code: 'sr', name: 'Serbian', native: 'Српски' },
    { code: 'bg', name: 'Bulgarian', native: 'Български' },
    { code: 'mk', name: 'Macedonian', native: 'Македонски' }
  ];
  
  res.json({ languages });
});

// Get translation cost usage statistics
router.get('/translation-stats', async (req, res) => {
  try {
    const stats = await costMonitor.getUsageStats();
    
    if (!stats) {
      return res.status(500).json({ error: 'Failed to retrieve usage statistics' });
    }

    res.json({
      usage: stats,
      limits: stats.limits,
      recommendations: {
        dailyRemaining: Math.max(0, stats.limits.daily - stats.dailyCost),
        monthlyRemaining: Math.max(0, stats.limits.monthly - stats.monthlyCost),
        averageCostPerTranslation: stats.totalTranslations > 0 ? stats.totalCost / stats.totalTranslations : 0
      }
    });

  } catch (error) {
    console.error('❌ Translation stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get translation statistics',
      details: error.message 
    });
  }
});

// Mount entity extraction routes
router.use('/', entityExtractionRoutes);

module.exports = router;
