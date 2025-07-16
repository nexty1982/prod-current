/**
 * OCR Preprocessing API Endpoint
 * Handles image preprocessing requests with advanced computer vision techniques
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const ImagePreprocessor = require('../utils/imagePreprocessor');

const router = express.Router();
const preprocessor = new ImagePreprocessor();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads/raw');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'raw-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/bmp',
      'image/webp'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

/**
 * POST /api/ocr/preprocess
 * Preprocess image for optimal OCR results
 */
router.post('/preprocess', upload.single('image'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🔄 OCR Preprocessing Request Started');
    console.log('=====================================');
    
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        error: 'No image file provided'
      });
    }

    const {
      language = 'en',
      enhance = 'true',
      outputDir = './uploads/processed'
    } = req.body;

    const inputPath = req.file.path;
    const enhanceBool = enhance === 'true' || enhance === true;
    
    console.log(`📁 Input file: ${inputPath}`);
    console.log(`🌐 Language: ${language}`);
    console.log(`✨ Enhancement: ${enhanceBool ? 'enabled' : 'disabled'}`);
    
    // Get file stats
    const fileStats = await fs.stat(inputPath);
    console.log(`📊 File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

    // Process the image
    const result = await preprocessor.processImage(inputPath, {
      language,
      enhance: enhanceBool,
      outputDir
    });

    const processingTime = Date.now() - startTime;
    
    if (result.status === 'success') {
      // Get processed file stats
      const processedStats = await fs.stat(result.processedImage);
      const sizeReduction = ((fileStats.size - processedStats.size) / fileStats.size * 100).toFixed(1);
      
      console.log('=====================================');
      console.log('✅ OCR Preprocessing Complete!');
      console.log(`⏱️  Processing time: ${processingTime}ms`);
      console.log(`📏 Original: ${result.originalDimensions[0]}x${result.originalDimensions[1]}`);
      console.log(`✂️  Cropped: ${result.croppedDimensions[0]}x${result.croppedDimensions[1]}`);
      console.log(`📐 Final: ${result.finalDimensions[0]}x${result.finalDimensions[1]}`);
      console.log(`🔄 Rotation: ${result.rotationAngle.toFixed(2)}°`);
      console.log(`💾 Size reduction: ${sizeReduction}%`);
      console.log(`🎯 Ready for OCR processing!`);
      console.log('=====================================');

      // Clean up original file
      try {
        await fs.unlink(inputPath);
      } catch (error) {
        console.warn('⚠️  Could not clean up original file:', error.message);
      }

      res.json({
        status: 'success',
        processedImage: result.processedImage,
        rotationAngle: result.rotationAngle,
        originalDimensions: result.originalDimensions,
        croppedDimensions: result.croppedDimensions,
        finalDimensions: result.finalDimensions,
        processingTime,
        sizeReduction: `${sizeReduction}%`,
        processingSteps: result.processingSteps,
        language,
        enhanced: enhanceBool,
        metadata: {
          originalSize: fileStats.size,
          processedSize: processedStats.size,
          compressionRatio: (processedStats.size / fileStats.size).toFixed(3)
        }
      });

    } else {
      console.error('❌ Preprocessing failed:', result.error);
      
      // Clean up original file on error
      try {
        await fs.unlink(inputPath);
      } catch (error) {
        console.warn('⚠️  Could not clean up original file:', error.message);
      }

      res.status(500).json({
        status: 'error',
        error: result.error,
        processingTime
      });
    }

  } catch (error) {
    console.error('❌ Preprocessing endpoint error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.warn('⚠️  Could not clean up file:', unlinkError.message);
      }
    }

    res.status(500).json({
      status: 'error',
      error: error.message || 'Preprocessing failed',
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * POST /api/ocr/preprocess-path
 * Preprocess image from existing file path
 */
router.post('/preprocess-path', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      imagePath,
      language = 'en',
      enhance = true,
      outputDir = './uploads/processed'
    } = req.body;

    if (!imagePath) {
      return res.status(400).json({
        status: 'error',
        error: 'No image path provided'
      });
    }

    console.log(`🔄 Processing existing image: ${imagePath}`);

    // Check if file exists
    try {
      await fs.access(imagePath);
    } catch {
      return res.status(404).json({
        status: 'error',
        error: 'Image file not found'
      });
    }

    // Process the image
    const result = await preprocessor.processImage(imagePath, {
      language,
      enhance,
      outputDir
    });

    const processingTime = Date.now() - startTime;

    if (result.status === 'success') {
      console.log(`✅ Path-based preprocessing complete in ${processingTime}ms`);
      
      res.json({
        status: 'success',
        processedImage: result.processedImage,
        rotationAngle: result.rotationAngle,
        originalDimensions: result.originalDimensions,
        croppedDimensions: result.croppedDimensions,
        finalDimensions: result.finalDimensions,
        processingTime,
        processingSteps: result.processingSteps,
        language,
        enhanced: enhance
      });

    } else {
      res.status(500).json({
        status: 'error',
        error: result.error,
        processingTime
      });
    }

  } catch (error) {
    console.error('❌ Path preprocessing error:', error);
    
    res.status(500).json({
      status: 'error',
      error: error.message || 'Preprocessing failed',
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * GET /api/ocr/preprocess/health
 * Health check for preprocessing service
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'OCR Image Preprocessing',
    features: [
      'Document detection and boundary analysis',
      'Automatic rotation and perspective correction',
      'Intelligent cropping with padding',
      'Standard resolution normalization',
      'CLAHE contrast enhancement',
      'Adaptive thresholding',
      'Morphological text cleanup',
      'Multi-language support'
    ],
    supportedLanguages: ['en', 'el', 'ru', 'ro'],
    supportedFormats: ['JPEG', 'PNG', 'TIFF', 'BMP', 'WebP'],
    maxFileSize: '50MB',
    standardOutputSize: '1024x1440'
  });
});

module.exports = router;
