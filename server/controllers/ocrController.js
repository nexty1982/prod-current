// Secure OCR Session Controller with Barcode Validation
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const QRCode = require('qrcode');
const sharp = require('sharp');
const { GoogleAuth } = require('google-auth-library');
const vision = require('@google-cloud/vision');
const db = require('../config/db');
const emailSender = require('../utils/emailSender');
const imageProcessor = require('../utils/imageProcessor');
const logger = require('../utils/logger');

// Initialize Google Vision client
// Support both GOOGLE_VISION_KEY_PATH and GOOGLE_APPLICATION_CREDENTIALS
const visionClientConfig = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
};

// Use GOOGLE_VISION_KEY_PATH if set, otherwise fall back to GOOGLE_APPLICATION_CREDENTIALS
// If neither is set, ImageAnnotatorClient will use default credentials lookup
if (process.env.GOOGLE_VISION_KEY_PATH) {
  visionClientConfig.keyFilename = process.env.GOOGLE_VISION_KEY_PATH;
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  visionClientConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const visionClient = new vision.ImageAnnotatorClient(visionClientConfig);

// Session timeout in minutes
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 10;
const UPLOAD_TIMEOUT = parseInt(process.env.UPLOAD_TIMEOUT_MINUTES) || 30;

class OCRController {

  /**
   * Generate a new OCR session with barcode
   */
  async createSession(req, res) {
    try {
      const sessionId = uuidv4();
      const pinCode = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + SESSION_TIMEOUT * 60 * 1000);

      // Generate barcode data
      const barcodeData = `${process.env.BASE_URL}/validate-upload?id=${sessionId}&pin=${pinCode}`;

      // Generate QR code image
      const qrCodeBuffer = await QRCode.toBuffer(barcodeData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Save session to database
      await db.query(`
        INSERT INTO ocr_sessions (
          id, pin_code, barcode_data, expires_at, session_metadata
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        sessionId,
        pinCode,
        barcodeData,
        expiresAt,
        JSON.stringify({
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          createdFrom: 'web'
        })
      ]);

      logger.info(`Created OCR session: ${sessionId} with PIN: ${pinCode}`);

      res.json({
        success: true,
        sessionId,
        pinCode,
        qrCode: `data:image/png;base64,${qrCodeBuffer.toString('base64')}`,
        barcodeUrl: barcodeData,
        expiresAt: expiresAt.toISOString(),
        timeoutMinutes: SESSION_TIMEOUT
      });

    } catch (error) {
      logger.error('Failed to create OCR session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create session'
      });
    }
  }

  /**
   * Validate barcode scan and activate session
   */
  async validateSession(req, res) {
    try {
      const { id: sessionId, pin } = req.query;

      if (!sessionId || !pin) {
        return res.status(400).json({
          success: false,
          error: 'Session ID and PIN are required'
        });
      }

      // Find and validate session
      const [sessions] = await db.query(`
        SELECT * FROM ocr_sessions
        WHERE id = ? AND pin_code = ? AND expires_at > NOW()
      `, [sessionId, pin]);

      if (sessions.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Invalid or expired session'
        });
      }

      const session = sessions[0];

      if (session.is_verified) {
        return res.status(400).json({
          success: false,
          error: 'Session already verified'
        });
      }

      // Mark session as verified
      await db.query(`
        UPDATE ocr_sessions
        SET is_verified = TRUE, verified_at = NOW()
        WHERE id = ?
      `, [sessionId]);

      logger.info(`Session verified: ${sessionId}`);

      // If accessed via mobile (barcode scan), show success page
      const isMobile = req.headers['user-agent']?.includes('Mobile');

      if (isMobile) {
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Upload Validated</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-align: center;
                padding: 40px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin: 0;
              }
              .container {
                max-width: 400px;
                margin: 0 auto;
                background: white;
                color: #333;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
              }
              .success-icon {
                font-size: 64px;
                color: #28a745;
                margin-bottom: 20px;
              }
              h1 {
                color: #28a745;
                margin-bottom: 10px;
              }
              p {
                margin-bottom: 20px;
                line-height: 1.5;
              }
              .session-info {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .small {
                font-size: 0.9em;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">✅</div>
              <h1>Upload Validated!</h1>
              <p>Your session has been successfully verified. You can now return to your computer to upload church records.</p>
              <div class="session-info">
                <strong>Session ID:</strong><br>
                <code>${sessionId.substring(0, 8)}...</code>
              </div>
              <p class="small">This window can be closed. Return to your computer to continue.</p>
            </div>
          </body>
          </html>
        `);
      } else {
        // API response for web interface
        res.json({
          success: true,
          message: 'Session verified successfully',
          sessionId
        });
      }

    } catch (error) {
      logger.error('Failed to validate session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate session'
      });
    }
  }

  /**
   * Check session status
   */
  async checkSessionStatus(req, res) {
    try {
      const { sessionId } = req.params;

      const [sessions] = await db.query(`
        SELECT id, is_verified, expires_at, created_at, disclaimer_accepted
        FROM ocr_sessions
        WHERE id = ?
      `, [sessionId]);

      if (sessions.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      const session = sessions[0];
      const now = new Date();
      const expired = new Date(session.expires_at) < now;

      res.json({
        success: true,
        sessionId: session.id,
        isVerified: !!session.is_verified,
        isExpired: expired,
        disclaimerAccepted: !!session.disclaimer_accepted,
        expiresAt: session.expires_at,
        timeRemaining: expired ? 0 : Math.max(0, new Date(session.expires_at) - now)
      });

    } catch (error) {
      logger.error('Failed to check session status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check session status'
      });
    }
  }

  /**
   * Accept disclaimer and update session
   */
  async acceptDisclaimer(req, res) {
    try {
      const { sessionId } = req.params;
      const {
        accepted,
        language = 'en',
        email,
        tierLevel = 'standard'
      } = req.body;

      if (!accepted) {
        return res.status(400).json({
          success: false,
          error: 'Disclaimer must be accepted'
        });
      }

      // Verify session exists and is verified
      const [sessions] = await db.query(`
        SELECT * FROM ocr_sessions
        WHERE id = ? AND is_verified = TRUE AND expires_at > NOW()
      `, [sessionId]);

      if (sessions.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Invalid or expired session'
        });
      }

      // Update session with disclaimer acceptance
      await db.query(`
        UPDATE ocr_sessions
        SET disclaimer_accepted = TRUE,
            disclaimer_language = ?,
            user_email = ?,
            tier_level = ?
        WHERE id = ?
      `, [language, email, tierLevel, sessionId]);

      logger.info(`Disclaimer accepted for session: ${sessionId}`);

      res.json({
        success: true,
        message: 'Disclaimer accepted successfully'
      });

    } catch (error) {
      logger.error('Failed to accept disclaimer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to accept disclaimer'
      });
    }
  }

  /**
   * Upload and process images with Google Vision OCR
   */
  async uploadAndProcess(req, res) {
    try {
      const { sessionId } = req.params;
      const files = req.files;
      const { targetLanguage = 'en' } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded'
        });
      }

      // Verify session is ready for upload
      const [sessions] = await db.query(`
        SELECT * FROM ocr_sessions
        WHERE id = ? AND is_verified = TRUE AND disclaimer_accepted = TRUE
        AND expires_at > NOW() AND is_used = FALSE
      `, [sessionId]);

      if (sessions.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Invalid session or session not ready for upload'
        });
      }

      const session = sessions[0];
      const uploadResults = [];

      // Process each uploaded file
      for (const file of files) {
        try {
          const uploadId = uuidv4();
          const startTime = Date.now();

          // Validate and enhance image
          const enhancedImagePath = await imageProcessor.enhanceForOCR(file.path);

          // Insert upload record
          await db.query(`
            INSERT INTO ocr_uploads (
              id, session_id, original_filename, file_path, file_size,
              file_type, enhanced_image_path, processing_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'processing')
          `, [
            uploadId, sessionId, file.originalname, file.path,
            file.size, file.mimetype, enhancedImagePath
          ]);

          // Perform OCR with Google Vision
          const [result] = await visionClient.textDetection(enhancedImagePath);
          const detections = result.textAnnotations;

          if (!detections || detections.length === 0) {
            throw new Error('No text detected in image');
          }

          const extractedText = detections[0].description;
          const confidence = this.calculateConfidence(detections);

          // Translate if target language is different
          let translatedText = extractedText;
          if (targetLanguage !== 'en') {
            // Implement translation logic here
            translatedText = await this.translateText(extractedText, targetLanguage);
          }

          const processingTime = Date.now() - startTime;

          // Update upload record with results
          await db.query(`
            UPDATE ocr_uploads
            SET processing_status = 'completed',
                ocr_result = ?,
                translated_text = ?,
                confidence_score = ?,
                processing_time_ms = ?,
                processed_at = NOW()
            WHERE id = ?
          `, [
            extractedText, translatedText, confidence, processingTime, uploadId
          ]);

          uploadResults.push({
            uploadId,
            filename: file.originalname,
            success: true,
            text: extractedText,
            translatedText,
            confidence,
            processingTime
          });

          logger.info(`OCR completed for upload: ${uploadId}`);

        } catch (fileError) {
          logger.error(`OCR failed for file ${file.originalname}:`, fileError);

          await db.query(`
            UPDATE ocr_uploads
            SET processing_status = 'failed',
                error_message = ?,
                processed_at = NOW()
            WHERE original_filename = ? AND session_id = ?
          `, [fileError.message, file.originalname, sessionId]);

          uploadResults.push({
            filename: file.originalname,
            success: false,
            error: fileError.message
          });
        }
      }

      // Mark session as used
      await db.query(`
        UPDATE ocr_sessions
        SET is_used = TRUE, upload_completed_at = NOW()
        WHERE id = ?
      `, [sessionId]);

      // Send email receipt if email provided
      if (session.user_email) {
        try {
          await emailSender.sendUploadReceipt(session.user_email, {
            sessionId,
            uploadResults,
            timestamp: new Date(),
            language: targetLanguage
          });
        } catch (emailError) {
          logger.error('Failed to send email receipt:', emailError);
        }
      }

      res.json({
        success: true,
        sessionId,
        results: uploadResults,
        totalFiles: files.length,
        successfulFiles: uploadResults.filter(r => r.success).length
      });

    } catch (error) {
      logger.error('Failed to process uploads:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process uploads'
      });
    }
  }

  /**
   * Get processing status and results
   */
  async getResults(req, res) {
    try {
      const { sessionId } = req.params;

      const [uploads] = await db.query(`
        SELECT * FROM ocr_uploads
        WHERE session_id = ?
        ORDER BY created_at ASC
      `, [sessionId]);

      const [sessions] = await db.query(`
        SELECT user_email, tier_level, target_language
        FROM ocr_sessions
        WHERE id = ?
      `, [sessionId]);

      if (sessions.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        sessionId,
        uploads: uploads.map(upload => ({
          id: upload.id,
          filename: upload.original_filename,
          status: upload.processing_status,
          text: upload.ocr_result,
          translatedText: upload.translated_text,
          confidence: upload.confidence_score,
          processingTime: upload.processing_time_ms,
          error: upload.error_message,
          createdAt: upload.created_at,
          processedAt: upload.processed_at
        }))
      });

    } catch (error) {
      logger.error('Failed to get results:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get results'
      });
    }
  }

  /**
   * Calculate confidence score from Google Vision detections
   */
  calculateConfidence(detections) {
    if (!detections || detections.length === 0) return 0;

    let totalConfidence = 0;
    let count = 0;

    detections.forEach(detection => {
      if (detection.confidence !== undefined) {
        totalConfidence += detection.confidence;
        count++;
      }
    });

    return count > 0 ? Math.round((totalConfidence / count) * 100) : 85;
  }

  /**
   * Translate text (placeholder - implement with Google Translate API)
   */
  async translateText(text, targetLanguage) {
    // Implement Google Translate API integration
    // For now, return original text
    return text;
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions() {
    try {
      const [result] = await db.query(`
        DELETE FROM ocr_sessions
        WHERE expires_at < NOW() AND created_at < DATE_SUB(NOW(), INTERVAL 1 DAY)
      `);

      logger.info(`Cleaned up ${result.affectedRows} expired sessions`);
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
    }
  }
}

module.exports = new OCRController();

