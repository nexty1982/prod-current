/**
 * OCR Admin Test Controller
 * Backend API endpoints for OCR system testing
 * Mirrors the command line testing scripts with REST API
 */

const mysql = require('mysql2/promise');
const vision = require('@google-cloud/vision');

class OcrAdminTestController {
  constructor() {
    // Database configurations
    this.dbConfigs = {
      orthodoxmetrics: {
        host: 'localhost',
        user: 'orthodoxapps',
        password: 'Summerof1982@!',
        database: 'orthodoxmetrics_db'
      },
      ocr: {
        host: 'localhost',
        user: 'orthodoxapps',
        password: 'Summerof1982@!',
        database: process.env.OCR_DATABASE || 'orthodoxmetrics_ocr_db'
      },
      records: {
        host: 'localhost',
        user: 'orthodoxapps',
        password: 'Summerof1982@!',
        database: 'ssppoc_records_db'
      }
    };
  }

  // Utility method to check if user is superadmin
  async validateSuperAdmin(req, res, next) {
    try {
      // Check if user exists in session or JWT
      const userEmail = req.user?.email || req.body?.userEmail || req.headers['x-user-email'];
      
      if (userEmail !== 'superadmin@orthodoxmetrics.com') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. SuperAdmin privileges required.'
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Authentication error',
        error: error.message
      });
    }
  }

  // Test database connections
  async testDatabaseConnection(req, res) {
    const startTime = Date.now();
    const results = {};

    try {
      // Test orthodoxmetrics_db
      try {
        const orthodoxConnection = await mysql.createConnection(this.dbConfigs.orthodoxmetrics);
        const [rows] = await orthodoxConnection.execute('SELECT COUNT(*) as count FROM churches');
        await orthodoxConnection.end();
        results.orthodoxmetrics = {
          status: 'connected',
          churches: rows[0].count,
          message: `Connected successfully - ${rows[0].count} churches found`
        };
      } catch (error) {
        results.orthodoxmetrics = {
          status: 'failed',
          error: error.message
        };
      }

      // Test OCR database
      try {
        const ocrConnection = await mysql.createConnection(this.dbConfigs.ocr);
        const [rows] = await ocrConnection.execute('SELECT COUNT(*) as count FROM ocr_jobs');
        await ocrConnection.end();
        results.ocr = {
          status: 'connected',
          jobs: rows[0].count,
          message: `Connected successfully - ${rows[0].count} OCR jobs found`
        };
      } catch (error) {
        results.ocr = {
          status: 'failed',
          error: error.message
        };
      }

      // Test Records database
      try {
        const recordsConnection = await mysql.createConnection(this.dbConfigs.records);
        const [tables] = await recordsConnection.execute('SHOW TABLES');
        await recordsConnection.end();
        results.records = {
          status: 'connected',
          tables: tables.length,
          message: `Connected successfully - ${tables.length} tables found`
        };
      } catch (error) {
        results.records = {
          status: 'failed',
          error: error.message
        };
      }

      const allConnected = Object.values(results).every(r => r.status === 'connected');
      const duration = Date.now() - startTime;

      res.json({
        success: allConnected,
        message: allConnected ? 'All database connections successful' : 'Some database connections failed',
        details: results,
        duration
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Database connection test failed',
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  // Test OCR schema validation
  async testOcrSchema(req, res) {
    const startTime = Date.now();

    try {
      const connection = await mysql.createConnection(this.dbConfigs.ocr);
      
      // Check if all required columns exist
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'ocr_jobs'
      `, [process.env.OCR_DATABASE || 'orthodoxmetrics_ocr_db']);

      const requiredColumns = [
        'id', 'church_id', 'file_path', 'original_filename', 'status', 'ocr_result',
        'confidence_score', 'processing_time', 'error_message', 'created_at',
        'updated_at', 'user_id', 'record_type', 'auto_process', 'ocr_result_translation',
        'translation_confidence', 'extracted_entities', 'entity_confidence',
        'needs_review', 'detected_language', 'google_vision_response',
        'processing_started_at', 'processing_completed_at', 'retry_count',
        'priority', 'queue_position', 'file_size'
      ];

      const existingColumns = columns.map(col => col.COLUMN_NAME);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      await connection.end();

      const duration = Date.now() - startTime;
      const isValid = missingColumns.length === 0;

      res.json({
        success: isValid,
        message: isValid ? 
          `OCR schema validation passed - all ${requiredColumns.length} columns present` :
          `OCR schema validation failed - ${missingColumns.length} missing columns`,
        details: {
          total_required: requiredColumns.length,
          total_existing: existingColumns.length,
          missing_columns: missingColumns,
          existing_columns: existingColumns
        },
        duration
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'OCR schema validation failed',
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  // Test Google Vision API
  async testGoogleVision(req, res) {
    const startTime = Date.now();

    try {
      // Create a simple test image (1x1 pixel base64 image)
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      const visionClient = new vision.ImageAnnotatorClient();
      const [result] = await visionClient.textDetection({
        image: { content: Buffer.from(testImageBase64, 'base64') }
      });
      
      const duration = Date.now() - startTime;

      res.json({
        success: true,
        message: 'Google Vision API connection successful',
        details: {
          response_received: !!result,
          api_accessible: true,
          test_completed: true,
          detections: result.textAnnotations ? result.textAnnotations.length : 0
        },
        duration
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Google Vision API test failed',
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  // Test OCR processing queue
  async testOcrQueue(req, res) {
    const startTime = Date.now();

    try {
      const connection = await mysql.createConnection(this.dbConfigs.ocr);
      
      const [queueStats] = await connection.execute(`
        SELECT 
          status,
          COUNT(*) as count
        FROM ocr_jobs 
        GROUP BY status
        ORDER BY status
      `);

      const [recentJobs] = await connection.execute(`
        SELECT id, status, created_at, processing_time
        FROM ocr_jobs 
        ORDER BY created_at DESC 
        LIMIT 10
      `);

      await connection.end();

      const stats = {};
      queueStats.forEach(stat => {
        stats[stat.status] = stat.count;
      });

      const duration = Date.now() - startTime;
      const hasJobs = queueStats.length > 0;

      res.json({
        success: hasJobs,
        message: hasJobs ? 
          `OCR queue test passed - ${queueStats.reduce((sum, s) => sum + s.count, 0)} total jobs found` :
          'OCR queue test passed - no jobs found',
        details: {
          queue_stats: stats,
          recent_jobs: recentJobs,
          total_jobs: queueStats.reduce((sum, s) => sum + s.count, 0)
        },
        duration
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'OCR queue test failed',
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  // Test entity extraction
  async testEntityExtraction(req, res) {
    const startTime = Date.now();

    try {
      const connection = await mysql.createConnection(this.dbConfigs.ocr);
      
      const [entitiesJobs] = await connection.execute(`
        SELECT 
          id, 
          extracted_entities, 
          entity_confidence,
          status,
          created_at
        FROM ocr_jobs 
        WHERE extracted_entities IS NOT NULL 
        AND extracted_entities != ''
        ORDER BY created_at DESC
        LIMIT 5
      `);

      await connection.end();

      const duration = Date.now() - startTime;
      const hasEntities = entitiesJobs.length > 0;

      res.json({
        success: hasEntities,
        message: hasEntities ? 
          `Entity extraction test passed - ${entitiesJobs.length} jobs with extracted entities found` :
          'Entity extraction test failed - no jobs with extracted entities found',
        details: {
          jobs_with_entities: entitiesJobs.length,
          sample_jobs: entitiesJobs.map(job => ({
            id: job.id,
            entity_confidence: job.entity_confidence,
            status: job.status,
            created_at: job.created_at,
            has_entities: !!job.extracted_entities
          }))
        },
        duration
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Entity extraction test failed',
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  // Test cross-database connectivity
  async testCrossDatabase(req, res) {
    const startTime = Date.now();

    try {
      // Test connection between all three databases
      const orthodoxConnection = await mysql.createConnection(this.dbConfigs.orthodoxmetrics);
      const ocrConnection = await mysql.createConnection(this.dbConfigs.ocr);
      const recordsConnection = await mysql.createConnection(this.dbConfigs.records);

      // Test a cross-database query scenario
      const [churches] = await orthodoxConnection.execute('SELECT id, name FROM churches LIMIT 1');
      
      if (churches.length > 0) {
        const churchId = churches[0].id;
        const [ocrJobs] = await ocrConnection.execute('SELECT COUNT(*) as count FROM ocr_jobs WHERE church_id = ?', [churchId]);
        
        // Check if records database has corresponding structure
        const [recordTables] = await recordsConnection.execute("SHOW TABLES LIKE '%_records'");
        
        await orthodoxConnection.end();
        await ocrConnection.end();
        await recordsConnection.end();

        const duration = Date.now() - startTime;

        res.json({
          success: true,
          message: 'Cross-database connectivity test passed',
          details: {
            test_church: churches[0],
            ocr_jobs_for_church: ocrJobs[0].count,
            record_tables_available: recordTables.length,
            cross_query_successful: true
          },
          duration
        });
      } else {
        throw new Error('No churches found to test cross-database connectivity');
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Cross-database connectivity test failed',
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  // Test translation service
  async testTranslation(req, res) {
    const startTime = Date.now();

    try {
      const connection = await mysql.createConnection(this.dbConfigs.ocr);
      
      const [translationJobs] = await connection.execute(`
        SELECT 
          id,
          ocr_result_translation,
          translation_confidence,
          detected_language,
          status
        FROM ocr_jobs 
        WHERE ocr_result_translation IS NOT NULL 
        AND ocr_result_translation != ''
        ORDER BY created_at DESC
        LIMIT 5
      `);

      await connection.end();

      const duration = Date.now() - startTime;
      const hasTranslations = translationJobs.length > 0;

      res.json({
        success: hasTranslations,
        message: hasTranslations ? 
          `Translation service test passed - ${translationJobs.length} jobs with translations found` :
          'Translation service test failed - no jobs with translations found',
        details: {
          jobs_with_translations: translationJobs.length,
          sample_jobs: translationJobs.map(job => ({
            id: job.id,
            translation_confidence: job.translation_confidence,
            detected_language: job.detected_language,
            status: job.status,
            has_translation: !!job.ocr_result_translation
          }))
        },
        duration
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Translation service test failed',
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  // Retry failed jobs
  async retryFailedJobs(req, res) {
    const startTime = Date.now();

    try {
      const connection = await mysql.createConnection(this.dbConfigs.ocr);
      
      // First, get count of failed jobs
      const [failedCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM ocr_jobs WHERE status = 'failed'
      `);

      // Reset failed jobs to pending
      const [result] = await connection.execute(`
        UPDATE ocr_jobs 
        SET status = 'pending', 
            retry_count = retry_count + 1,
            error_message = NULL,
            updated_at = NOW()
        WHERE status = 'failed'
      `);

      await connection.end();

      const duration = Date.now() - startTime;

      res.json({
        success: true,
        message: `Successfully retried ${result.affectedRows} failed jobs`,
        details: {
          failed_jobs_found: failedCount[0].count,
          jobs_retried: result.affectedRows,
          reset_to_pending: true
        },
        duration
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retry jobs',
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }
}

module.exports = OcrAdminTestController;
