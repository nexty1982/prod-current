// services/ocrProcessingService.js
const { getChurchDbConnection } = require('../utils/dbSwitcher');
const { promisePool } = require('../config/db');
const vision = require('@google-cloud/vision');
const { Translate } = require('@google-cloud/translate').v2;
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const ChurchRecordEntityExtractor = require('./churchRecordEntityExtractor');

// Initialize Google Vision and Translate clients
const visionClient = new vision.ImageAnnotatorClient();
const translateClient = new Translate();

// Initialize entity extractor
const entityExtractor = new ChurchRecordEntityExtractor();

class OcrProcessingService {
    constructor() {
        this.isProcessing = false;
        this.processInterval = null;
    }

    /**
     * Start the OCR processing service
     */
    start() {
        console.log('🚀 Starting OCR Processing Service...');
        
        // Process immediately, then every 30 seconds
        this.processQueue();
        this.processInterval = setInterval(() => {
            this.processQueue();
        }, 30000);
        
        console.log('✅ OCR Processing Service started');
    }

    /**
     * Stop the OCR processing service
     */
    stop() {
        console.log('⏹️  Stopping OCR Processing Service...');
        
        if (this.processInterval) {
            clearInterval(this.processInterval);
            this.processInterval = null;
        }
        
        console.log('✅ OCR Processing Service stopped');
    }

    /**
     * Process pending OCR jobs in all church databases
     */
    async processQueue() {
        if (this.isProcessing) {
            console.log('⏳ OCR processing already in progress, skipping...');
            return;
        }

        try {
            this.isProcessing = true;
            console.log('🔄 Processing OCR queue...');

            // Get all active churches
            const [churches] = await promisePool.query(
                'SELECT id, name, database_name FROM churches WHERE is_active = 1'
            );

            let totalProcessed = 0;

            for (const church of churches) {
                try {
                    const processed = await this.processChurchQueue(church);
                    totalProcessed += processed;
                } catch (error) {
                    console.error(`❌ Error processing church ${church.name}:`, error);
                }
            }

            if (totalProcessed > 0) {
                console.log(`✅ Processed ${totalProcessed} OCR jobs across ${churches.length} churches`);
            }

        } catch (error) {
            console.error('❌ Error in OCR queue processing:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process OCR jobs for a specific church
     */
    async processChurchQueue(church) {
        const db = await getChurchDbConnection(church.database_name);
        
        // Get pending OCR jobs
        const [pendingJobs] = await db.query(`
            SELECT id, church_id, filename, original_filename, file_path, record_type, language, mime_type
            FROM ocr_jobs 
            WHERE status = 'pending' 
            ORDER BY created_at ASC 
            LIMIT 5
        `);

        if (pendingJobs.length === 0) {
            return 0;
        }

        // Get church OCR settings for processing preferences
        const [settings] = await db.query(`
            SELECT confidence_threshold, default_language, preprocessing_enabled, auto_contrast, auto_rotate, noise_reduction
            FROM ocr_settings 
            WHERE church_id = ? 
            LIMIT 1
        `, [church.id]);

        const churchSettings = settings[0] || { 
            confidence_threshold: 0.75,
            default_language: 'en',
            preprocessing_enabled: true,
            auto_contrast: true,
            auto_rotate: true,
            noise_reduction: true
        };

        console.log(`📋 Processing ${pendingJobs.length} jobs for ${church.name}`);

        for (const job of pendingJobs) {
            try {
                await this.processOcrJob(db, job, churchSettings);
            } catch (error) {
                console.error(`❌ Error processing job ${job.id}:`, error);
                await this.markJobAsError(db, job.id, error.message);
            }
        }

        return pendingJobs.length;
    }

    /**
     * Process a single OCR job with translation
     */
    async processOcrJob(db, job, churchSettings) {
        console.log(`🔍 Processing OCR job ${job.id}: ${job.filename}`);

        // Mark job as processing
        await db.query(
            'UPDATE ocr_jobs SET status = ?, updated_at = NOW() WHERE id = ?',
            ['processing', job.id]
        );

        // Check if file exists
        const filePath = job.file_path;
        try {
            await fs.access(filePath);
        } catch (error) {
            throw new Error(`File not found: ${filePath}`);
        }

        // Preprocess image
        const preprocessedPath = await this.preprocessImage(filePath);
        
        // Perform OCR with language support
        const ocrResult = await this.performOcr(preprocessedPath || filePath, job.language);
        
        // Calculate confidence score
        const confidenceScore = this.calculateConfidence(ocrResult);
        
        // Detect error regions (if confidence is low)
        const errorRegions = confidenceScore < 0.6 ? 
            await this.detectErrorRegions(ocrResult) : null;

        // Extract text from OCR result
        const extractedText = ocrResult.fullTextAnnotation?.text || '';
        
        // Detect language and translate if needed
        let translatedText = null;
        let translationConfidence = null;
        let detectedLanguage = job.language;
        
        // Translation features disabled (columns not in current schema)
        // if (extractedText && churchSettings.enable_translation) {
        //     const translationResult = await this.translateText(
        //         extractedText, 
        //         job.language, 
        //         churchSettings.target_language
        //     );
        //     
        //     if (translationResult) {
        //         translatedText = translationResult.translation;
        //         translationConfidence = translationResult.confidence;
        //         detectedLanguage = translationResult.detectedLanguage || job.language;
        //     }
        // }
        
        // Save OCR result as text file
        const resultFilePath = await this.saveOcrResultFile(
            job, 
            extractedText, 
            translatedText,
            confidenceScore, 
            translationConfidence,
            detectedLanguage,
            errorRegions
        );

        // 🤖 NEW: Perform AI entity extraction
        let extractedEntities = null;
        let entityConfidence = 0;
        let needsReview = false;

        try {
            console.log(`🤖 Starting AI entity extraction for job ${job.id}...`);
            
            // Use the translated text if available and confidence is high, otherwise use original
            const textForExtraction = (translatedText && translationConfidence > 0.7) ? translatedText : extractedText;
            
            extractedEntities = await entityExtractor.extractEntities(
                textForExtraction,
                job.record_type,
                detectedLanguage || job.language,
                job.church_id
            );
            
            entityConfidence = extractedEntities.confidence;
            needsReview = entityConfidence < 0.6; // Flag for review if confidence is low
            
            console.log(`✅ Entity extraction completed with ${(entityConfidence * 100).toFixed(1)}% confidence`);
            
        } catch (extractionError) {
            console.warn('❌ Entity extraction failed:', extractionError.message);
            needsReview = true; // Flag for review if extraction fails
        }

        // Update job with results (using only existing columns)
        await db.query(`
            UPDATE ocr_jobs 
            SET status = ?, confidence_score = ?, ocr_result = ?, error_regions = ?, 
                processing_log = ?, updated_at = NOW()
            WHERE id = ?
        `, [
            'complete',
            confidenceScore,
            extractedText,
            errorRegions ? JSON.stringify(errorRegions) : null,
            `Processed successfully with ${ocrResult.textAnnotations?.length || 0} text regions detected. No translation (feature disabled). Entity extraction: ${extractedEntities ? (entityConfidence * 100).toFixed(1) + '%' : 'failed'}. Result saved to: ${resultFilePath}`,
            job.id
        ]);

        // Log activity
        try {
            await db.query(
                'INSERT INTO activity_log (church_id, action, details, created_at) VALUES (?, ?, ?, NOW())',
                [job.church_id, 'ocr_complete', `OCR processing completed for ${job.filename} (confidence: ${(confidenceScore * 100).toFixed(1)}%) ${translatedText ? '- Translation: ' + (translationConfidence * 100).toFixed(1) + '%' : ''}${extractedEntities ? ' - Entities: ' + (entityConfidence * 100).toFixed(1) + '%' : ''}`]
            );
        } catch (logError) {
            console.warn('Failed to log OCR completion:', logError);
        }

        // Clean up preprocessed file if it was created
        if (preprocessedPath && preprocessedPath !== filePath) {
            try {
                await fs.unlink(preprocessedPath);
            } catch (cleanupError) {
                console.warn('Failed to cleanup preprocessed file:', cleanupError);
            }
        }

        console.log(`✅ OCR job ${job.id} completed with ${(confidenceScore * 100).toFixed(1)}% confidence${translatedText ? ` (Translation: ${(translationConfidence * 100).toFixed(1)}%)` : ''}${extractedEntities ? ` (Entities: ${(entityConfidence * 100).toFixed(1)}%)` : ''}`);
    }

    /**
     * Preprocess image for better OCR results
     */
    async preprocessImage(inputPath) {
        try {
            const ext = path.extname(inputPath).toLowerCase();
            
            // Skip preprocessing for PDFs
            if (ext === '.pdf') {
                return null;
            }

            const outputPath = inputPath.replace(/(\.[^.]+)$/, '_preprocessed$1');
            
            await sharp(inputPath)
                .resize(null, 2000, { 
                    withoutEnlargement: true,
                    kernel: sharp.kernel.lanczos3 
                })
                .sharpen()
                .normalize()
                .greyscale()
                .png({ quality: 95 })
                .toFile(outputPath);
            
            return outputPath;

        } catch (error) {
            console.warn('Image preprocessing failed, using original:', error.message);
            return null;
        }
    }

    /**
     * Perform OCR using Google Vision API
     */
    async performOcr(imagePath, language = 'en') {
        try {
            // Configure language hints for better accuracy
            const languageHints = this.getLanguageHints(language);
            
            const request = {
                image: { content: require('fs').readFileSync(imagePath) },
                features: [{ type: 'TEXT_DETECTION' }],
                imageContext: {
                    languageHints: languageHints
                }
            };
            
            const [result] = await visionClient.annotateImage(request);
            
            if (!result.textAnnotations || result.textAnnotations.length === 0) {
                throw new Error('No text detected in image');
            }

            return result;

        } catch (error) {
            // Fallback to Tesseract if Google Vision fails
            console.warn('Google Vision failed, attempting fallback OCR:', error.message);
            return await this.performFallbackOcr(imagePath);
        }
    }

    /**
     * Get language hints for Google Vision API
     */
    getLanguageHints(languageCode) {
        const languageMap = {
            'en': ['en'],
            'el': ['el'],      // Greek (Modern)
            'grc': ['grc'],    // Greek (Ancient)
            'ru': ['ru'],      // Russian
            'ru-PETR1708': ['ru'],  // Russian (Old Orthography - use modern Russian OCR)
            'sr': ['sr'],      // Serbian (Cyrillic)
            'sr-Latn': ['sr-Latn'], // Serbian (Latin)
            'bg': ['bg'],      // Bulgarian
            'ro': ['ro'],      // Romanian
            'uk': ['uk'],      // Ukrainian
            'mk': ['mk'],      // Macedonian
            'be': ['be'],      // Belarusian
            'ka': ['ka']       // Georgian
        };
        
        return languageMap[languageCode] || ['en'];
    }

    /**
     * Fallback OCR using basic text detection
     */
    async performFallbackOcr(imagePath) {
        // Simple fallback implementation
        // In a real implementation, you might use Tesseract.js or another OCR library
        return {
            fullTextAnnotation: {
                text: 'Fallback OCR: Text detection failed. Manual review required.'
            },
            textAnnotations: [{
                description: 'Fallback OCR result',
                boundingPoly: { vertices: [] }
            }]
        };
    }

    /**
     * Calculate confidence score from OCR result
     */
    calculateConfidence(ocrResult) {
        if (!ocrResult.textAnnotations || ocrResult.textAnnotations.length === 0) {
            return 0.0;
        }

        // Simple confidence calculation based on number of detected text regions
        const textRegions = ocrResult.textAnnotations.length;
        const fullText = ocrResult.fullTextAnnotation?.text || '';
        
        // Base confidence on text length and number of regions
        const lengthScore = Math.min(fullText.length / 100, 1.0);
        const regionScore = Math.min(textRegions / 10, 1.0);
        
        // Combine scores
        const confidence = (lengthScore * 0.7) + (regionScore * 0.3);
        
        return Math.max(0.1, Math.min(1.0, confidence));
    }

    /**
     * Detect error regions in OCR result
     */
    async detectErrorRegions(ocrResult) {
        const errorRegions = [];
        
        if (ocrResult.textAnnotations) {
            // Mark regions with very short text as potential errors
            ocrResult.textAnnotations.forEach((annotation, index) => {
                if (annotation.description && annotation.description.length < 3) {
                    errorRegions.push({
                        index: index,
                        reason: 'Short text detected',
                        boundingBox: annotation.boundingPoly,
                        text: annotation.description
                    });
                }
            });
        }
        
        return errorRegions.length > 0 ? errorRegions : null;
    }

    /**
     * Translate text using Google Translate API
     */
    async translateText(text, sourceLanguage, targetLanguage) {
        try {
            // Skip translation if source and target are the same
            if (sourceLanguage === targetLanguage) {
                return null;
            }

            // Skip translation if text is too short
            if (!text || text.trim().length < 3) {
                return null;
            }

            console.log(`🌍 Translating from ${sourceLanguage} to ${targetLanguage}...`);

            // Detect language first if needed
            const [detections] = await translateClient.detect(text);
            const detectedLanguage = detections.language;
            
            // Perform translation
            const [translation] = await translateClient.translate(text, {
                from: sourceLanguage,
                to: targetLanguage
            });

            // Calculate translation confidence based on detected vs expected language
            const languageMatch = detectedLanguage === sourceLanguage || 
                                this.isLanguageVariant(detectedLanguage, sourceLanguage);
            const confidence = languageMatch ? 0.9 : 0.7;

            return {
                translation: translation,
                confidence: confidence,
                detectedLanguage: detectedLanguage
            };

        } catch (error) {
            console.warn('Translation failed:', error.message);
            return null;
        }
    }

    /**
     * Check if two language codes are variants of the same language
     */
    isLanguageVariant(lang1, lang2) {
        const variants = {
            'ru': ['ru-PETR1708'],
            'sr': ['sr-Latn'],
            'el': ['grc']
        };

        for (const [base, variantList] of Object.entries(variants)) {
            if ((lang1 === base && variantList.includes(lang2)) ||
                (lang2 === base && variantList.includes(lang1))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Save OCR result as a text file with translation
     */
    async saveOcrResultFile(job, extractedText, translatedText, confidenceScore, translationConfidence, detectedLanguage, errorRegions) {
        try {
            // Create result directory structure
            const baseDir = path.join(__dirname, '..', 'ocr-results');
            const churchDir = path.join(baseDir, `church_${job.church_id}`);
            
            // Ensure directories exist
            await fs.mkdir(baseDir, { recursive: true });
            await fs.mkdir(churchDir, { recursive: true });
            
            // Generate result filename based on original filename
            const originalName = path.parse(job.original_filename).name;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const resultFileName = `${originalName}_result_${timestamp}.txt`;
            const resultFilePath = path.join(churchDir, resultFileName);
            
            // Prepare result content with translation
            const resultContent = this.formatOcrResultWithTranslation(
                job, 
                extractedText, 
                translatedText,
                confidenceScore, 
                translationConfidence,
                detectedLanguage,
                errorRegions
            );
            
            // Save the text file
            await fs.writeFile(resultFilePath, resultContent, 'utf8');
            
            console.log(`💾 OCR result saved to: ${resultFilePath}`);
            return resultFilePath;
            
        } catch (error) {
            console.error('Failed to save OCR result file:', error);
            return null;
        }
    }

    /**
     * Format OCR result for text file output with translation
     */
    formatOcrResultWithTranslation(job, extractedText, translatedText, confidenceScore, translationConfidence, detectedLanguage, errorRegions) {
        const separator = '='.repeat(60);
        const timestamp = new Date().toISOString();
        
        let content = `${separator}\n`;
        content += `MULTI-LANGUAGE OCR RESULT\n`;
        content += `${separator}\n`;
        content += `Original File: ${job.original_filename}\n`;
        content += `Processed File: ${job.filename}\n`;
        content += `Expected Language: ${job.language || 'en'}\n`;
        content += `Detected Language: ${detectedLanguage || 'unknown'}\n`;
        content += `Record Type: ${job.record_type || 'unknown'}\n`;
        content += `OCR Confidence: ${(confidenceScore * 100).toFixed(1)}%\n`;
        if (translationConfidence) {
            content += `Translation Confidence: ${(translationConfidence * 100).toFixed(1)}%\n`;
        }
        content += `Processing Date: ${timestamp}\n`;
        content += `Job ID: ${job.id}\n`;
        content += `${separator}\n\n`;
        
        if (extractedText && extractedText.trim()) {
            content += `ORIGINAL TEXT (${detectedLanguage || job.language}):\n`;
            content += `${'-'.repeat(40)}\n`;
            content += `${extractedText}\n`;
            content += `${'-'.repeat(40)}\n\n`;
        } else {
            content += `NO TEXT EXTRACTED\n\n`;
        }

        if (translatedText && translatedText.trim()) {
            content += `ENGLISH TRANSLATION:\n`;
            content += `${'-'.repeat(40)}\n`;
            content += `${translatedText}\n`;
            content += `${'-'.repeat(40)}\n\n`;
        } else if (extractedText && extractedText.trim()) {
            content += `NO TRANSLATION AVAILABLE\n\n`;
        }
        
        if (errorRegions && errorRegions.length > 0) {
            content += `DETECTED ISSUES:\n`;
            content += `${'-'.repeat(40)}\n`;
            errorRegions.forEach((region, index) => {
                content += `${index + 1}. ${region.reason}: "${region.text}"\n`;
            });
            content += `${'-'.repeat(40)}\n\n`;
        }
        
        content += `${separator}\n`;
        content += `End of Multi-Language OCR Result\n`;
        content += `${separator}\n`;
        
        return content;
    }

    /**
     * Mark job as error
     */
    async markJobAsError(db, jobId, errorMessage) {
        try {
            await db.query(`
                UPDATE ocr_jobs 
                SET status = 'error', processing_log = ?, updated_at = NOW()
                WHERE id = ?
            `, [errorMessage, jobId]);
            
            console.log(`❌ Marked job ${jobId} as error: ${errorMessage}`);
        } catch (error) {
            console.error('Failed to mark job as error:', error);
        }
    }

    /**
     * Get processing statistics
     */
    async getProcessingStats() {
        try {
            const [churches] = await promisePool.query(
                'SELECT id, name, database_name FROM churches WHERE is_active = 1'
            );

            const stats = {
                totalChurches: churches.length,
                queueStatus: {
                    pending: 0,
                    processing: 0,
                    complete: 0,
                    error: 0
                },
                timestamp: new Date().toISOString()
            };

            for (const church of churches) {
                try {
                    const db = await getChurchDbConnection(church.database_name);
                    const [statusCounts] = await db.query(`
                        SELECT status, COUNT(*) as count
                        FROM ocr_jobs 
                        GROUP BY status
                    `);

                    statusCounts.forEach(row => {
                        stats.queueStatus[row.status] += row.count;
                    });
                } catch (error) {
                    console.warn(`Failed to get stats for church ${church.name}:`, error);
                }
            }

            return stats;
        } catch (error) {
            console.error('Failed to get processing stats:', error);
            return null;
        }
    }
}

// Export singleton instance
module.exports = new OcrProcessingService();
