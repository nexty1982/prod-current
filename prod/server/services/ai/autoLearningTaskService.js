// server/services/ai/autoLearningTaskService.js
// 24-Hour Auto-Learning OCR Task Service
// Processes all available record images to improve OCR mapping and field recognition

const fs = require('fs').promises;
const path = require('path');
const { promisePool: db } = require('../../config/db');
const { switchToDatabase } = require('../../utils/dbSwitcher');
const logger = require('../../utils/logger');

class AutoLearningTaskService {
  constructor() {
    this.isRunning = false;
    this.startTime = null;
    this.endTime = null;
    this.stats = {
      recordsProcessed: 0,
      successRate: 0,
      averageConfidence: 0,
      errorCount: 0,
      mostFailedFields: [],
      lastImage: '',
      timeRemaining: '',
      totalRecords: 0,
      completed: 0,
      errors: 0,
      trainingRulesGenerated: 0
    };
    this.processingErrors = [];
    this.learningRules = new Map();
    this.maxHours = 24;
    this.batchSize = 10; // Process 10 images at a time
  }

  /**
   * Start the auto-learning task
   * @param {string} basePath - Base directory path for record images
   * @param {number} hours - Maximum hours to run (default: 24)
   */
  async startTask(basePath = 'data/records/', hours = 24) {
    if (this.isRunning) {
      throw new Error('Auto-learning task is already running');
    }

    this.isRunning = true;
    this.startTime = new Date();
    this.maxHours = hours;
    this.endTime = new Date(this.startTime.getTime() + (hours * 60 * 60 * 1000));

    logger.info('AutoLearningTask', 'Starting 24h auto-learning OCR task', {
      basePath,
      maxHours: hours,
      startTime: this.startTime,
      endTime: this.endTime
    });

    try {
      // Initialize processing directories
      await this.initializeDirectories();
      
      // Discover all images in record directories
      const imageFiles = await this.discoverImages(basePath);
      this.stats.totalRecords = imageFiles.length;

      logger.info('AutoLearningTask', `Discovered ${imageFiles.length} images to process`);

      // Process images in batches
      await this.processImageBatches(imageFiles);

      // Generate final summary
      await this.generateFinalSummary();

    } catch (error) {
      logger.error('AutoLearningTask', 'Error in auto-learning task', { error: error.message });
      this.processingErrors.push({
        type: 'task_error',
        message: error.message,
        timestamp: new Date(),
        stack: error.stack
      });
    } finally {
      this.isRunning = false;
      logger.info('AutoLearningTask', 'Auto-learning task completed', {
        duration: new Date() - this.startTime,
        stats: this.stats
      });
    }
  }

  /**
   * Stop the running task
   */
  async stopTask() {
    if (!this.isRunning) {
      return false;
    }

    this.isRunning = false;
    logger.info('AutoLearningTask', 'Auto-learning task stopped by user');
    await this.generateFinalSummary();
    return true;
  }

  /**
   * Get current task status
   */
  getStatus() {
    if (!this.isRunning && this.startTime) {
      // Task completed
      return {
        ...this.stats,
        status: 'completed',
        duration: new Date() - this.startTime,
        isRunning: false
      };
    }

    if (this.isRunning) {
      const now = new Date();
      const elapsed = now - this.startTime;
      const remaining = Math.max(0, this.endTime - now);
      
      this.stats.timeRemaining = this.formatDuration(remaining);
      
      return {
        ...this.stats,
        status: 'running',
        elapsed: this.formatDuration(elapsed),
        isRunning: true,
        progress: this.stats.totalRecords > 0 ? 
          Math.round((this.stats.recordsProcessed / this.stats.totalRecords) * 100) : 0
      };
    }

    return {
      status: 'idle',
      isRunning: false,
      stats: this.stats
    };
  }

  /**
   * Initialize required directories
   */
  async initializeDirectories() {
    const dirs = [
      '/processed_data',
      '/logs',
      '/ai/learning'
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * Discover all images in record directories
   */
  async discoverImages(basePath) {
    const recordTypes = ['baptism', 'marriage', 'funeral'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.tiff', '.pdf'];
    const images = [];

    // Resolve the base path relative to the project root
    const fullBasePath = path.resolve(process.cwd(), basePath);
    
    logger.info('AutoLearningTask', `Searching for images in: ${fullBasePath}`);

    for (const recordType of recordTypes) {
      const recordPath = path.join(fullBasePath, recordType);
      
      try {
        await fs.access(recordPath);
        const files = await fs.readdir(recordPath);
        
        logger.info('AutoLearningTask', `Found ${files.length} files in ${recordType} directory`);
        
        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (imageExtensions.includes(ext)) {
            images.push({
              path: path.join(recordPath, file),
              filename: file,
              recordType,
              extension: ext
            });
          }
        }
      } catch (error) {
        logger.warn('AutoLearningTask', `Skipping directory ${recordPath}: ${error.message}`);
      }
    }

    logger.info('AutoLearningTask', `Total images discovered: ${images.length}`);
    return images;
  }

  /**
   * Process images in batches
   */
  async processImageBatches(imageFiles) {
    for (let i = 0; i < imageFiles.length && this.isRunning; i += this.batchSize) {
      // Check time limit
      if (new Date() >= this.endTime) {
        logger.info('AutoLearningTask', 'Time limit reached, stopping processing');
        break;
      }

      const batch = imageFiles.slice(i, i + this.batchSize);
      await this.processBatch(batch);

      // Small delay between batches to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Process a batch of images
   */
  async processBatch(batch) {
    const promises = batch.map(image => this.processImage(image));
    await Promise.allSettled(promises);
  }

  /**
   * Process a single image
   */
  async processImage(image) {
    try {
      this.stats.lastImage = image.filename;
      logger.info('AutoLearningTask', `Processing image: ${image.filename}`);

      // 1. Apply preprocessing pipeline
      const preprocessedImage = await this.preprocessImage(image);

      // 2. Run OCR with both Tesseract and Google Vision
      const ocrResults = await this.runOcrProcessing(preprocessedImage);

      // 3. Map fields using existing field mapper
      const mappedFields = await this.mapFields(ocrResults, image.recordType);

      // 4. Analyze confidence and compare with existing records
      const analysis = await this.analyzeResults(mappedFields, image);

      // 5. Store results and learning data
      await this.storeResults(image, ocrResults, mappedFields, analysis);

      // 6. Generate learning rules if corrections exist
      await this.generateLearningRules(image, mappedFields, analysis);

      this.stats.recordsProcessed++;
      this.updateSuccessRate();

    } catch (error) {
      this.stats.errorCount++;
      this.processingErrors.push({
        type: 'image_processing_error',
        filename: image.filename,
        message: error.message,
        timestamp: new Date()
      });
      
      logger.error('AutoLearningTask', `Error processing ${image.filename}`, { error: error.message });
    }
  }

  /**
   * Apply preprocessing pipeline to image
   */
  async preprocessImage(image) {
    // TODO: Implement image preprocessing
    // - Grayscale conversion
    // - Thresholding
    // - Denoising
    // - Deskewing
    // - Cropping
    
    return {
      ...image,
      preprocessed: true,
      preprocessingSteps: ['grayscale', 'threshold', 'denoise', 'deskew', 'crop']
    };
  }

  /**
   * Run OCR processing with multiple engines
   */
  async runOcrProcessing(image) {
    const results = {
      tesseract: null,
      googleVision: null,
      timestamp: new Date()
    };

    try {
      // Switch to OCR database
      await switchToDatabase(process.env.OCR_DATABASE || 'orthodoxmetrics_ocr_db');

      // Create OCR job for Google Vision processing
      const [jobResult] = await db.query(`
        INSERT INTO ocr_jobs (
          filename, 
          file_path, 
          record_type,
          status,
          church_id,
          created_at,
          auto_learning,
          batch_id,
          ocr_engine
        ) VALUES (?, ?, ?, 'pending', 14, NOW(), 1, ?, 'hybrid')
      `, [
        image.filename,
        image.path,
        image.recordType,
        `auto_learning_${Date.now()}`
      ]);

      const jobId = jobResult.insertId;

      // Process with Google Vision API
      results.googleVision = await this.processWithGoogleVision(image, jobId);
      
      // Process with Tesseract for comparison
      results.tesseract = await this.processWithTesseract(image);

      logger.info('AutoLearningTask', `Completed dual OCR processing for ${image.filename}`, {
        jobId,
        googleVisionConfidence: results.googleVision?.confidence,
        tesseractConfidence: results.tesseract?.confidence,
        tesseractSimulated: results.tesseract?.simulated || false
      });

    } catch (error) {
      logger.error('AutoLearningTask', `OCR processing failed for ${image.filename}`, { error: error.message });
    }

    return results;
  }

  /**
   * Process image with Google Vision API
   */
  async processWithGoogleVision(image, jobId) {
    try {
      const vision = require('@google-cloud/vision');
      const client = new vision.ImageAnnotatorClient();

      // Read the image file
      const imageBuffer = await fs.readFile(image.path);

      // Configure the request
      const request = {
        image: { content: imageBuffer },
        features: [
          { type: 'TEXT_DETECTION' },
          { type: 'DOCUMENT_TEXT_DETECTION' }
        ],
        imageContext: {
          languageHints: ['en', 'el'] // English and Greek for Orthodox records
        }
      };

      // Perform OCR
      const [result] = await client.annotateImage(request);
      
      const detections = result.textAnnotations;
      const fullText = result.fullTextAnnotation;

      if (detections && detections.length > 0) {
        // Calculate confidence from detection scores
        const confidenceSum = detections.slice(1).reduce((sum, detection) => {
          return sum + (detection.confidence || 0.8); // Default confidence if not provided
        }, 0);
        const avgConfidence = confidenceSum / Math.max(1, detections.length - 1);

        // Update OCR job status
        await db.query(`
          UPDATE ocr_jobs 
          SET status = 'completed',
              extracted_text = ?,
              confidence_score = ?,
              completed_at = NOW()
          WHERE id = ?
        `, [
          detections[0].description,
          avgConfidence,
          jobId
        ]);

        return {
          jobId,
          extractedText: detections[0].description,
          confidence: avgConfidence,
          fullTextAnnotation: fullText,
          detections: detections.slice(1, 6), // First 5 individual detections
          engine: 'google_vision'
        };
      } else {
        throw new Error('No text detected by Google Vision');
      }

    } catch (error) {
      logger.error('AutoLearningTask', `Google Vision processing failed for ${image.filename}`, { error: error.message });
      
      // Update job status as failed
      if (jobId) {
        await db.query(`
          UPDATE ocr_jobs 
          SET status = 'failed',
              error_message = ?,
              completed_at = NOW()
          WHERE id = ?
        `, [error.message, jobId]);
      }

      return {
        jobId,
        extractedText: '',
        confidence: 0,
        error: error.message,
        engine: 'google_vision'
      };
    }
  }

  /**
   * Process image with Tesseract (fallback/comparison)
   */
  async processWithTesseract(image) {
    try {
      const { createWorker } = require('tesseract.js');
      
      logger.info('AutoLearningTask', `Processing ${image.filename} with Tesseract OCR`);
      
      // Create a new Tesseract worker
      const worker = await createWorker('eng+ell', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            logger.debug('AutoLearningTask', `Tesseract progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      try {
        // Configure Tesseract for better Orthodox church record recognition
        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:()/-+ ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω',
          tessedit_pageseg_mode: '6', // Uniform block of text
          preserve_interword_spaces: '1'
        });

        // Perform OCR recognition
        const { data: { text, confidence, words } } = await worker.recognize(image.path);
        
        // Calculate word-level confidence average
        let wordConfidenceSum = 0;
        let validWords = 0;
        
        if (words && words.length > 0) {
          words.forEach(word => {
            if (word.confidence > 0) {
              wordConfidenceSum += word.confidence;
              validWords++;
            }
          });
        }
        
        const avgConfidence = validWords > 0 ? wordConfidenceSum / validWords / 100 : confidence / 100;
        
        logger.info('AutoLearningTask', `Tesseract completed for ${image.filename}`, {
          textLength: text.length,
          confidence: avgConfidence,
          wordCount: validWords
        });

        return {
          extractedText: text.trim(),
          confidence: Math.max(0, Math.min(1, avgConfidence)), // Ensure 0-1 range
          wordCount: validWords,
          words: words?.slice(0, 10), // First 10 words for analysis
          engine: 'tesseract',
          simulated: false
        };

      } finally {
        // Always terminate the worker to free resources
        await worker.terminate();
      }

    } catch (error) {
      logger.error('AutoLearningTask', `Tesseract processing failed for ${image.filename}`, { error: error.message });
      
      return {
        extractedText: '',
        confidence: 0,
        error: error.message,
        engine: 'tesseract',
        simulated: false
      };
    }
  }

  /**
   * Map OCR results to database fields
   */
  async mapFields(ocrResults, recordType) {
    try {
      // Get the best OCR result (prefer Google Vision, fallback to Tesseract)
      const primaryOcrResult = ocrResults.googleVision?.extractedText ? 
        ocrResults.googleVision : ocrResults.tesseract;
      
      if (!primaryOcrResult?.extractedText) {
        throw new Error('No OCR text available for field mapping');
      }

      const extractedText = primaryOcrResult.extractedText;
      const baseConfidence = primaryOcrResult.confidence || 0.5;

      // Initialize field mapping result
      const mappedFields = {
        mapped: true,
        recordType,
        primaryEngine: primaryOcrResult.engine,
        fields: {}
      };

      // Define field patterns for each record type
      const fieldPatterns = this.getFieldPatternsForRecordType(recordType);

      // Extract fields using pattern matching
      for (const [fieldName, pattern] of Object.entries(fieldPatterns)) {
        const fieldResult = this.extractFieldFromText(extractedText, pattern, baseConfidence);
        if (fieldResult.value) {
          mappedFields.fields[fieldName] = fieldResult;
        }
      }

      // Compare results between OCR engines if both available
      if (ocrResults.googleVision && ocrResults.tesseract) {
        mappedFields.engineComparison = this.compareOcrResults(
          ocrResults.googleVision, 
          ocrResults.tesseract
        );
      }

      return mappedFields;

    } catch (error) {
      logger.error('AutoLearningTask', `Field mapping failed`, { error: error.message });
      
      return {
        mapped: false,
        recordType,
        error: error.message,
        fields: {}
      };
    }
  }

  /**
   * Get field patterns for specific record type
   */
  getFieldPatternsForRecordType(recordType) {
    const commonPatterns = {
      'full_name': /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
      'date': /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\w+\s+\d{1,2},?\s+\d{4})/g,
      'location': /([\w\s]+(?:Church|Parish|Cathedral|Chapel))/gi,
      'clergy': /((?:Father|Fr\.|Priest|Archpriest|Deacon|Bishop)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi
    };

    switch (recordType) {
      case 'baptism':
        return {
          ...commonPatterns,
          'birth_date': /(?:born|birth)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
          'baptism_date': /(?:baptized|baptism)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
          'parents': /(?:parents|father|mother)[\s:]*([A-Z][a-z]+\s+[A-Z][a-z]+)/gi
        };
      
      case 'marriage':
        return {
          ...commonPatterns,
          'bride_name': /(?:bride|wife)[\s:]*([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
          'groom_name': /(?:groom|husband)[\s:]*([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
          'marriage_date': /(?:married|marriage|wedding)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
          'witnesses': /(?:witnesses?)[\s:]*([A-Z][a-z]+\s+[A-Z][a-z]+)/gi
        };
      
      case 'funeral':
        return {
          ...commonPatterns,
          'death_date': /(?:died|death|deceased)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
          'funeral_date': /(?:funeral|burial|service)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
          'age': /(?:age|aged)[\s:]*(\d{1,3})/gi
        };
      
      default:
        return commonPatterns;
    }
  }

  /**
   * Extract field value from text using pattern
   */
  extractFieldFromText(text, pattern, baseConfidence) {
    const matches = text.match(pattern);
    
    if (matches && matches.length > 0) {
      // Use the first match, clean it up
      const value = matches[0].trim();
      
      // Calculate confidence based on pattern strength and base confidence
      const patternConfidence = matches.length > 1 ? 0.9 : 0.7; // Higher if multiple matches
      const finalConfidence = Math.min(baseConfidence * patternConfidence, 0.95);
      
      return {
        value,
        confidence: finalConfidence,
        matches: matches.length,
        pattern: pattern.source
      };
    }
    
    return {
      value: null,
      confidence: 0,
      matches: 0,
      pattern: pattern.source
    };
  }

  /**
   * Compare OCR results between engines
   */
  compareOcrResults(googleVision, tesseract) {
    return {
      textSimilarity: this.calculateTextSimilarity(
        googleVision.extractedText, 
        tesseract.extractedText
      ),
      confidenceDifference: Math.abs(googleVision.confidence - tesseract.confidence),
      recommendedEngine: googleVision.confidence > tesseract.confidence ? 'google_vision' : 'tesseract',
      agreement: googleVision.extractedText === tesseract.extractedText
    };
  }

  /**
   * Calculate text similarity between two strings
   */
  calculateTextSimilarity(text1, text2) {
    if (text1 === text2) return 1.0;
    
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Analyze results and compare with existing records
   */
  async analyzeResults(mappedFields, image) {
    const analysis = {
      averageConfidence: 0,
      lowConfidenceFields: [],
      potentialMatches: [],
      hasErrors: false
    };

    // Calculate average confidence
    const confidences = Object.values(mappedFields.fields || {})
      .map(field => field.confidence || 0);
    
    if (confidences.length > 0) {
      analysis.averageConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    }

    // Identify low confidence fields
    analysis.lowConfidenceFields = Object.entries(mappedFields.fields || {})
      .filter(([, field]) => field.confidence < 0.7)
      .map(([fieldName]) => fieldName);

    this.updateAverageConfidence(analysis.averageConfidence);
    
    return analysis;
  }

  /**
   * Store processing results
   */
  async storeResults(image, ocrResults, mappedFields, analysis) {
    const results = {
      filename: image.filename,
      recordType: image.recordType,
      ocrResults,
      mappedFields,
      analysis,
      timestamp: new Date()
    };

    // Write to processed_data/ocr_results.json
    const resultsPath = path.join(process.cwd(), 'processed_data', 'ocr_results.json');
    
    try {
      let existingResults = [];
      try {
        const data = await fs.readFile(resultsPath, 'utf8');
        existingResults = JSON.parse(data);
      } catch (error) {
        // File doesn't exist yet, start with empty array
      }

      existingResults.push(results);
      await fs.writeFile(resultsPath, JSON.stringify(existingResults, null, 2));
      
    } catch (error) {
      logger.error('AutoLearningTask', `Failed to store results for ${image.filename}`, { error: error.message });
    }
  }

  /**
   * Generate learning rules from corrections
   */
  async generateLearningRules(image, mappedFields, analysis) {
    try {
      // Generate rules for low confidence fields
      if (analysis.lowConfidenceFields.length > 0) {
        for (const fieldName of analysis.lowConfidenceFields) {
          await this.createFieldImprovementRule(fieldName, mappedFields, image);
        }
      }

      // Generate rules for OCR engine comparison
      if (mappedFields.engineComparison) {
        await this.createEngineComparisonRule(mappedFields.engineComparison, image);
      }

      // Generate pattern-based rules
      await this.createPatternBasedRules(mappedFields, image);

      // Store learning rules to file
      await this.storeLearningRules();

    } catch (error) {
      logger.error('AutoLearningTask', `Learning rule generation failed for ${image.filename}`, { 
        error: error.message 
      });
    }
  }

  /**
   * Create improvement rule for low confidence field
   */
  async createFieldImprovementRule(fieldName, mappedFields, image) {
    this.stats.trainingRulesGenerated++;

    const field = mappedFields.fields[fieldName];
    const ruleId = `field_improvement_${this.stats.trainingRulesGenerated}`;

    const rule = {
      id: ruleId,
      type: 'field_improvement',
      field: fieldName,
      pattern: field?.pattern || 'unknown',
      issue: 'low_confidence',
      currentConfidence: field?.confidence || 0,
      suggestion: this.generateFieldSuggestion(fieldName, field),
      recordType: image.recordType,
      imageExtension: image.extension,
      frequency: 1,
      timestamp: new Date()
    };

    this.learningRules.set(ruleId, rule);
    
    logger.info('AutoLearningTask', `Generated field improvement rule for ${fieldName}`, {
      ruleId,
      confidence: field?.confidence
    });
  }

  /**
   * Create rule based on OCR engine comparison
   */
  async createEngineComparisonRule(comparison, image) {
    if (comparison.confidenceDifference > 0.2) { // Significant difference
      this.stats.trainingRulesGenerated++;

      const ruleId = `engine_comparison_${this.stats.trainingRulesGenerated}`;
      
      const rule = {
        id: ruleId,
        type: 'engine_comparison',
        issue: 'engine_disagreement',
        textSimilarity: comparison.textSimilarity,
        confidenceDifference: comparison.confidenceDifference,
        recommendedEngine: comparison.recommendedEngine,
        suggestion: comparison.textSimilarity < 0.5 ? 
          'Consider image preprocessing' : 
          `Prefer ${comparison.recommendedEngine} for similar images`,
        recordType: image.recordType,
        imageExtension: image.extension,
        timestamp: new Date()
      };

      this.learningRules.set(ruleId, rule);
      
      logger.info('AutoLearningTask', `Generated engine comparison rule`, {
        ruleId,
        similarity: comparison.textSimilarity,
        recommended: comparison.recommendedEngine
      });
    }
  }

  /**
   * Create pattern-based learning rules
   */
  async createPatternBasedRules(mappedFields, image) {
    // Generate rules for successful pattern matches
    for (const [fieldName, field] of Object.entries(mappedFields.fields)) {
      if (field.confidence > 0.8 && field.matches > 0) {
        const existingRule = Array.from(this.learningRules.values()).find(
          rule => rule.type === 'pattern_success' && 
                  rule.field === fieldName && 
                  rule.pattern === field.pattern
        );

        if (existingRule) {
          // Update existing rule frequency
          existingRule.frequency++;
          existingRule.averageConfidence = (
            (existingRule.averageConfidence * (existingRule.frequency - 1)) + field.confidence
          ) / existingRule.frequency;
        } else {
          // Create new pattern success rule
          this.stats.trainingRulesGenerated++;
          const ruleId = `pattern_success_${this.stats.trainingRulesGenerated}`;

          const rule = {
            id: ruleId,
            type: 'pattern_success',
            field: fieldName,
            pattern: field.pattern,
            averageConfidence: field.confidence,
            frequency: 1,
            recordType: image.recordType,
            suggestion: `Pattern works well for ${fieldName} in ${image.recordType} records`,
            timestamp: new Date()
          };

          this.learningRules.set(ruleId, rule);
        }
      }
    }
  }

  /**
   * Generate suggestion for field improvement
   */
  generateFieldSuggestion(fieldName, field) {
    if (!field || field.confidence < 0.3) {
      return `Consider alternative pattern for ${fieldName} extraction`;
    } else if (field.confidence < 0.5) {
      return `Improve preprocessing for ${fieldName} field clarity`;
    } else if (field.confidence < 0.7) {
      return `Refine pattern matching for ${fieldName}`;
    } else {
      return `Monitor ${fieldName} extraction patterns`;
    }
  }

  /**
   * Store learning rules to file
   */
  async storeLearningRules() {
    try {
      const rulesData = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        totalRules: this.learningRules.size,
        rules: Array.from(this.learningRules.values()),
        categories: this.categorizeLearningRules()
      };

      const rulesPath = path.join(process.cwd(), 'ai', 'learning', 'mappings.json');
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(rulesPath), { recursive: true });
      
      await fs.writeFile(rulesPath, JSON.stringify(rulesData, null, 2));
      
      logger.info('AutoLearningTask', `Learning rules stored to ${rulesPath}`, {
        totalRules: this.learningRules.size
      });

    } catch (error) {
      logger.error('AutoLearningTask', `Failed to store learning rules`, { 
        error: error.message 
      });
    }
  }

  /**
   * Categorize learning rules by type
   */
  categorizeLearningRules() {
    const categories = {
      fieldImprovements: [],
      engineComparisons: [],
      patternSuccesses: [],
      other: []
    };

    for (const rule of this.learningRules.values()) {
      switch (rule.type) {
        case 'field_improvement':
          categories.fieldImprovements.push(rule);
          break;
        case 'engine_comparison':
          categories.engineComparisons.push(rule);
          break;
        case 'pattern_success':
          categories.patternSuccesses.push(rule);
          break;
        default:
          categories.other.push(rule);
      }
    }

    return categories;
  }

  /**
   * Generate final summary report
   */
  async generateFinalSummary() {
    const summary = {
      totalRecords: this.stats.totalRecords,
      completed: this.stats.recordsProcessed,
      errors: this.stats.errorCount,
      runtime: this.formatDuration(new Date() - this.startTime),
      trainingRulesGenerated: this.stats.trainingRulesGenerated,
      averageConfidence: this.stats.averageConfidence,
      successRate: this.stats.successRate,
      learningRules: Array.from(this.learningRules.values()),
      errors: this.processingErrors,
      timestamp: new Date()
    };

    const summaryPath = path.join(
      process.cwd(), 
      'logs', 
      `summary-${new Date().toISOString().split('T')[0].replace(/-/g, '')}.json`
    );

    try {
      await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
      logger.info('AutoLearningTask', `Summary written to ${summaryPath}`);
    } catch (error) {
      logger.error('AutoLearningTask', `Failed to write summary`, { error: error.message });
    }

    return summary;
  }

  /**
   * Update success rate calculation
   */
  updateSuccessRate() {
    if (this.stats.recordsProcessed > 0) {
      this.stats.successRate = ((this.stats.recordsProcessed - this.stats.errorCount) / this.stats.recordsProcessed) * 100;
    }
  }

  /**
   * Update running average confidence
   */
  updateAverageConfidence(newConfidence) {
    if (this.stats.recordsProcessed === 1) {
      this.stats.averageConfidence = newConfidence;
    } else {
      this.stats.averageConfidence = (
        (this.stats.averageConfidence * (this.stats.recordsProcessed - 1)) + newConfidence
      ) / this.stats.recordsProcessed;
    }
  }

  /**
   * Format duration in human-readable format
   */
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

module.exports = AutoLearningTaskService;
