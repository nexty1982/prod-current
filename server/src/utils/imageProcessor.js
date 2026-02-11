// Image Processing Utilities for OCR Enhancement
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');

class ImageProcessor {
  
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.enhancedDir = path.join(this.uploadDir, 'enhanced');
    this.maxWidth = parseInt(process.env.MAX_IMAGE_WIDTH) || 2048;
    this.maxHeight = parseInt(process.env.MAX_IMAGE_HEIGHT) || 2048;
    
    // Ensure directories exist
    this.ensureDirectories();
  }
  
  async ensureDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.enhancedDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create directories:', error);
    }
  }
  
  /**
   * Validate uploaded image file
   */
  async validateImage(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      
      const validations = {
        isValid: true,
        errors: [],
        metadata
      };
      
      // Check if file is actually an image
      if (!metadata.format) {
        validations.isValid = false;
        validations.errors.push('File is not a valid image');
        return validations;
      }
      
      // Check supported formats
      const supportedFormats = ['jpeg', 'png', 'tiff', 'webp', 'gif'];
      if (!supportedFormats.includes(metadata.format)) {
        validations.isValid = false;
        validations.errors.push(`Unsupported format: ${metadata.format}`);
      }
      
      // Check minimum dimensions
      if (metadata.width < 100 || metadata.height < 100) {
        validations.isValid = false;
        validations.errors.push('Image too small (minimum 100x100 pixels)');
      }
      
      // Check maximum dimensions
      if (metadata.width > 10000 || metadata.height > 10000) {
        validations.isValid = false;
        validations.errors.push('Image too large (maximum 10000x10000 pixels)');
      }
      
      return validations;
      
    } catch (error) {
      logger.error('Image validation failed:', error);
      return {
        isValid: false,
        errors: ['Unable to process image file'],
        metadata: null
      };
    }
  }
  
  /**
   * Enhance image for better OCR results
   */
  async enhanceForOCR(inputPath) {
    try {
      const filename = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(this.enhancedDir, `${filename}_enhanced.png`);
      
      logger.info(`Enhancing image for OCR: ${inputPath}`);
      
      // Validate input image first
      const validation = await this.validateImage(inputPath);
      if (!validation.isValid) {
        throw new Error(`Invalid image: ${validation.errors.join(', ')}`);
      }
      
      const metadata = validation.metadata;
      
      // Create enhancement pipeline
      let pipeline = sharp(inputPath);
      
      // Auto-rotate based on EXIF orientation
      pipeline = pipeline.rotate();
      
      // Resize if too large (maintain aspect ratio)
      if (metadata.width > this.maxWidth || metadata.height > this.maxHeight) {
        pipeline = pipeline.resize(this.maxWidth, this.maxHeight, {
          fit: 'inside',
          withoutEnlargement: false
        });
      }
      
      // Convert to grayscale for better OCR
      pipeline = pipeline.grayscale();
      
      // Enhance contrast and sharpness
      pipeline = pipeline
        .normalize() // Auto-adjust levels
        .sharpen({
          sigma: 1,
          flat: 1,
          jagged: 2
        })
        .gamma(1.2) // Slight gamma correction
        .linear(1.2, -(128 * 1.2) + 128); // Increase contrast
      
      // Apply noise reduction for scanned documents
      pipeline = pipeline.median(2);
      
      // Convert to PNG for lossless storage
      pipeline = pipeline.png({
        quality: 95,
        compressionLevel: 6
      });
      
      // Save enhanced image
      await pipeline.toFile(outputPath);
      
      // Verify the enhanced image was created successfully
      const enhancedStats = await fs.stat(outputPath);
      if (enhancedStats.size === 0) {
        throw new Error('Enhanced image file is empty');
      }
      
      logger.info(`Image enhanced successfully: ${outputPath}`);
      return outputPath;
      
    } catch (error) {
      logger.error('Image enhancement failed:', error);
      throw new Error(`Image enhancement failed: ${error.message}`);
    }
  }
  
  /**
   * Auto-crop document borders (experimental)
   */
  async autoCropDocument(inputPath) {
    try {
      const filename = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(this.enhancedDir, `${filename}_cropped.png`);
      
      // Get image info
      const { width, height } = await sharp(inputPath).metadata();
      
      // Create edge detection pipeline
      const edges = await sharp(inputPath)
        .grayscale()
        .normalise()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] // Edge detection kernel
        })
        .threshold(50)
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      // Simple crop detection (placeholder algorithm)
      // In production, implement more sophisticated document detection
      const cropMargin = Math.min(width, height) * 0.05; // 5% margin
      const cropBox = {
        left: Math.round(cropMargin),
        top: Math.round(cropMargin),
        width: Math.round(width - (cropMargin * 2)),
        height: Math.round(height - (cropMargin * 2))
      };
      
      // Apply crop if it would be meaningful
      if (cropBox.width > width * 0.8 && cropBox.height > height * 0.8) {
        await sharp(inputPath)
          .extract(cropBox)
          .toFile(outputPath);
        
        logger.info(`Document auto-cropped: ${outputPath}`);
        return outputPath;
      } else {
        // Return original if crop wouldn't help
        return inputPath;
      }
      
    } catch (error) {
      logger.error('Auto-crop failed:', error);
      // Return original image if cropping fails
      return inputPath;
    }
  }
  
  /**
   * Generate thumbnail for preview
   */
  async generateThumbnail(inputPath, maxSize = 300) {
    try {
      const filename = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(this.enhancedDir, `${filename}_thumb.jpg`);
      
      await sharp(inputPath)
        .resize(maxSize, maxSize, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({
          quality: 80,
          progressive: true
        })
        .toFile(outputPath);
      
      return outputPath;
      
    } catch (error) {
      logger.error('Thumbnail generation failed:', error);
      return null;
    }
  }
  
  /**
   * Extract image metadata for analysis
   */
  async extractMetadata(inputPath) {
    try {
      const metadata = await sharp(inputPath).metadata();
      const stats = await fs.stat(inputPath);
      
      return {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        hasProfile: metadata.hasProfile,
        isProgressive: metadata.isProgressive,
        fileSize: stats.size,
        lastModified: stats.mtime,
        aspectRatio: metadata.width / metadata.height,
        megapixels: (metadata.width * metadata.height) / 1000000
      };
      
    } catch (error) {
      logger.error('Metadata extraction failed:', error);
      return null;
    }
  }
  
  /**
   * Estimate processing time based on image characteristics
   */
  estimateProcessingTime(metadata) {
    if (!metadata) return 30; // Default 30 seconds
    
    const { width, height, fileSize, format } = metadata;
    const megapixels = (width * height) / 1000000;
    
    // Base time calculation (in seconds)
    let estimatedTime = 10; // Base processing time
    
    // Add time based on image size
    estimatedTime += megapixels * 2; // 2 seconds per megapixel
    
    // Add time based on file size
    estimatedTime += (fileSize / (1024 * 1024)) * 1; // 1 second per MB
    
    // Adjust for format complexity
    const formatMultipliers = {
      'jpeg': 1.0,
      'png': 1.2,
      'tiff': 1.5,
      'gif': 0.8,
      'webp': 1.1
    };
    
    estimatedTime *= formatMultipliers[format] || 1.0;
    
    // Minimum 5 seconds, maximum 120 seconds
    return Math.max(5, Math.min(120, Math.round(estimatedTime)));
  }
  
  /**
   * Clean up old enhanced images
   */
  async cleanupOldFiles(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.enhancedDir);
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      let cleanedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.enhancedDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }
      
      logger.info(`Cleaned up ${cleanedCount} old enhanced images`);
      return cleanedCount;
      
    } catch (error) {
      logger.error('Cleanup failed:', error);
      return 0;
    }
  }
}

module.exports = new ImageProcessor();
