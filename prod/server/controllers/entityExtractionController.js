// controllers/entityExtractionController.js
const { getChurchDbConnection } = require('../src/utils/dbSwitcher');
const { promisePool } = require('../../config/db');
const ChurchRecordEntityExtractor = require('../services/churchRecordEntityExtractor');

const entityExtractor = new ChurchRecordEntityExtractor();

/**
 * Get extracted entities for a specific OCR job
 */
exports.getJobEntities = async (req, res) => {
  try {
    const churchId = req.params.id;
    const jobId = req.params.jobId;

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Get job with extracted entities
    const [jobs] = await db.query(`
      SELECT 
        id, filename, original_filename, status, record_type, language,
        confidence_score, entity_confidence, extracted_entities, needs_review,
        ocr_result, ocr_result_translation, created_at, updated_at
      FROM ocr_jobs 
      WHERE id = ? AND church_id = ?
    `, [jobId, churchId]);

    if (!jobs.length) {
      return res.status(404).json({ error: 'OCR job not found' });
    }

    const job = jobs[0];

    // Parse extracted entities if they exist
    let entities = null;
    if (job.extracted_entities) {
      try {
        entities = JSON.parse(job.extracted_entities);
      } catch (parseError) {
        console.warn('Failed to parse extracted entities:', parseError);
      }
    }

    res.json({
      jobId: job.id,
      filename: job.filename,
      originalFilename: job.original_filename,
      status: job.status,
      recordType: job.record_type,
      language: job.language,
      ocrConfidence: job.confidence_score,
      entityConfidence: job.entity_confidence,
      needsReview: job.needs_review,
      extractedEntities: entities,
      ocrResult: job.ocr_result,
      ocrResultTranslation: job.ocr_result_translation,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    });

  } catch (error) {
    console.error('Error in getJobEntities:', error);
    res.status(500).json({ 
      error: 'Failed to fetch job entities',
      details: error.message 
    });
  }
};

/**
 * Update extracted entities with user corrections
 */
exports.updateJobEntities = async (req, res) => {
  try {
    const churchId = req.params.id;
    const jobId = req.params.jobId;
    const { correctedFields, reviewNotes } = req.body;

    if (!correctedFields) {
      return res.status(400).json({ error: 'Corrected fields are required' });
    }

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Get original entities
    const [jobs] = await db.query(`
      SELECT extracted_entities, record_type
      FROM ocr_jobs 
      WHERE id = ? AND church_id = ?
    `, [jobId, churchId]);

    if (!jobs.length) {
      return res.status(404).json({ error: 'OCR job not found' });
    }

    let originalEntities = null;
    if (jobs[0].extracted_entities) {
      try {
        originalEntities = JSON.parse(jobs[0].extracted_entities);
      } catch (parseError) {
        originalEntities = { fields: {} };
      }
    }

    // Create updated entities structure
    const updatedEntities = {
      ...originalEntities,
      fields: { ...originalEntities?.fields, ...correctedFields },
      lastUpdated: new Date().toISOString(),
      userCorrected: true
    };

    // Update the job
    await db.query(`
      UPDATE ocr_jobs 
      SET extracted_entities = ?, needs_review = FALSE, reviewed_by = ?, 
          review_date = NOW(), review_notes = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      JSON.stringify(updatedEntities),
      req.user?.id || null,
      reviewNotes || 'User corrections applied',
      jobId
    ]);

    // Learn from the correction
    if (originalEntities && originalEntities.fields) {
      await entityExtractor.learnFromCorrection(
        jobId, 
        originalEntities.fields, 
        correctedFields, 
        churchId
      );
    }

    // Log the correction activity
    await db.query(
      'INSERT INTO activity_log (church_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, NOW())',
      [churchId, req.user?.id || null, 'entity_correction', `User corrected extracted entities for job ${jobId}`]
    );

    res.json({
      success: true,
      message: 'Entities updated successfully',
      updatedEntities: updatedEntities
    });

  } catch (error) {
    console.error('Error in updateJobEntities:', error);
    res.status(500).json({ 
      error: 'Failed to update job entities',
      details: error.message 
    });
  }
};

/**
 * Manually trigger entity extraction for a job
 */
exports.extractJobEntities = async (req, res) => {
  try {
    const churchId = req.params.id;
    const jobId = req.params.jobId;
    const { recordType, language } = req.body;

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Get job details
    const [jobs] = await db.query(`
      SELECT id, record_type, language, ocr_result, ocr_result_translation, translation_confidence
      FROM ocr_jobs 
      WHERE id = ? AND church_id = ?
    `, [jobId, churchId]);

    if (!jobs.length) {
      return res.status(404).json({ error: 'OCR job not found' });
    }

    const job = jobs[0];

    if (!job.ocr_result) {
      return res.status(400).json({ error: 'No OCR result available for entity extraction' });
    }

    // Use provided parameters or defaults from job
    const extractionRecordType = recordType || job.record_type;
    const extractionLanguage = language || job.language;

    // Choose best text for extraction
    const textForExtraction = (job.ocr_result_translation && job.translation_confidence > 0.7) 
      ? job.ocr_result_translation 
      : job.ocr_result;

    // Perform entity extraction
    const extractedEntities = await entityExtractor.extractEntities(
      textForExtraction,
      extractionRecordType,
      extractionLanguage,
      churchId
    );

    // Update job with extracted entities
    await db.query(`
      UPDATE ocr_jobs 
      SET extracted_entities = ?, entity_confidence = ?, needs_review = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      JSON.stringify(extractedEntities),
      extractedEntities.confidence,
      extractedEntities.confidence < 0.6,
      jobId
    ]);

    // Log the extraction activity
    await db.query(
      'INSERT INTO activity_log (church_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, NOW())',
      [churchId, req.user?.id || null, 'manual_entity_extraction', `Manual entity extraction triggered for job ${jobId} with ${(extractedEntities.confidence * 100).toFixed(1)}% confidence`]
    );

    res.json({
      success: true,
      message: 'Entity extraction completed',
      extractedEntities: extractedEntities
    });

  } catch (error) {
    console.error('Error in extractJobEntities:', error);
    res.status(500).json({ 
      error: 'Failed to extract entities',
      details: error.message 
    });
  }
};

/**
 * Get extraction statistics for a church
 */
exports.getExtractionStats = async (req, res) => {
  try {
    const churchId = req.params.id;
    const { timeframe = '30d' } = req.query;

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Calculate date filter based on timeframe
    let dateFilter = '';
    switch (timeframe) {
      case '7d':
        dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      case '90d':
        dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
        break;
      case 'all':
        dateFilter = '';
        break;
      default:
        dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    // Get extraction statistics
    const [stats] = await db.query(`
      SELECT 
        record_type,
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN extracted_entities IS NOT NULL THEN 1 END) as jobs_with_entities,
        AVG(CASE WHEN entity_confidence IS NOT NULL THEN entity_confidence END) as avg_entity_confidence,
        COUNT(CASE WHEN needs_review = TRUE THEN 1 END) as jobs_needing_review,
        COUNT(CASE WHEN reviewed_by IS NOT NULL THEN 1 END) as jobs_reviewed,
        MAX(updated_at) as last_extraction
      FROM ocr_jobs 
      WHERE church_id = ? ${dateFilter}
      GROUP BY record_type
    `, [churchId]);

    // Get overall statistics
    const [[overallStats]] = await db.query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN extracted_entities IS NOT NULL THEN 1 END) as jobs_with_entities,
        AVG(CASE WHEN entity_confidence IS NOT NULL THEN entity_confidence END) as avg_entity_confidence,
        COUNT(CASE WHEN needs_review = TRUE THEN 1 END) as jobs_needing_review,
        COUNT(CASE WHEN reviewed_by IS NOT NULL THEN 1 END) as jobs_reviewed
      FROM ocr_jobs 
      WHERE church_id = ? ${dateFilter}
    `, [churchId]);

    // Get correction statistics
    const [[correctionStats]] = await db.query(`
      SELECT 
        COUNT(*) as total_corrections,
        COUNT(DISTINCT ocr_job_id) as jobs_corrected,
        MAX(correction_date) as last_correction
      FROM ocr_correction_log 
      WHERE church_id = ? ${dateFilter.replace('created_at', 'correction_date')}
    `, [churchId]);

    res.json({
      timeframe: timeframe,
      overall: {
        totalJobs: overallStats?.total_jobs || 0,
        jobsWithEntities: overallStats?.jobs_with_entities || 0,
        extractionRate: overallStats?.total_jobs ? 
          ((overallStats.jobs_with_entities / overallStats.total_jobs) * 100).toFixed(1) : '0.0',
        avgEntityConfidence: overallStats?.avg_entity_confidence ? 
          (overallStats.avg_entity_confidence * 100).toFixed(1) : '0.0',
        jobsNeedingReview: overallStats?.jobs_needing_review || 0,
        jobsReviewed: overallStats?.jobs_reviewed || 0,
        reviewRate: overallStats?.jobs_needing_review ? 
          ((overallStats.jobs_reviewed / overallStats.jobs_needing_review) * 100).toFixed(1) : '0.0'
      },
      byRecordType: stats || [],
      corrections: {
        totalCorrections: correctionStats?.total_corrections || 0,
        jobsCorrected: correctionStats?.jobs_corrected || 0,
        lastCorrection: correctionStats?.last_correction
      }
    });

  } catch (error) {
    console.error('Error in getExtractionStats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch extraction statistics',
      details: error.message 
    });
  }
};

/**
 * Get jobs that need review
 */
exports.getJobsNeedingReview = async (req, res) => {
  try {
    const churchId = req.params.id;
    const { page = 1, limit = 20, recordType } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Build WHERE clause
    let whereConditions = ['church_id = ?', 'needs_review = TRUE'];
    let queryParams = [churchId];

    if (recordType) {
      whereConditions.push('record_type = ?');
      queryParams.push(recordType);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Get jobs needing review
    const [jobs] = await db.query(`
      SELECT 
        id, filename, original_filename, status, record_type, language,
        confidence_score, entity_confidence, needs_review, created_at,
        CASE WHEN extracted_entities IS NOT NULL THEN TRUE ELSE FALSE END as has_entities
      FROM ocr_jobs 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    // Get total count
    const [[countResult]] = await db.query(`
      SELECT COUNT(*) as total FROM ocr_jobs ${whereClause}
    `, queryParams);

    res.json({
      jobs: jobs || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult?.total || 0,
        pages: Math.ceil((countResult?.total || 0) / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error in getJobsNeedingReview:', error);
    res.status(500).json({ 
      error: 'Failed to fetch jobs needing review',
      details: error.message 
    });
  }
};

/**
 * Bulk extraction for multiple jobs
 */
exports.bulkExtractEntities = async (req, res) => {
  try {
    const churchId = req.params.id;
    const { jobIds, recordType, language } = req.body;

    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({ error: 'Job IDs array is required' });
    }

    if (jobIds.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 jobs allowed per bulk operation' });
    }

    // Get church database connection
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const db = await getChurchDbConnection(churchRows[0].database_name);

    const results = {
      success: 0,
      failed: 0,
      results: []
    };

    // Process each job
    for (const jobId of jobIds) {
      try {
        // Get job details
        const [jobs] = await db.query(`
          SELECT id, record_type, language, ocr_result, ocr_result_translation, translation_confidence
          FROM ocr_jobs 
          WHERE id = ? AND church_id = ?
        `, [jobId, churchId]);

        if (!jobs.length) {
          results.failed++;
          results.results.push({
            jobId: jobId,
            success: false,
            error: 'Job not found'
          });
          continue;
        }

        const job = jobs[0];

        if (!job.ocr_result) {
          results.failed++;
          results.results.push({
            jobId: jobId,
            success: false,
            error: 'No OCR result available'
          });
          continue;
        }

        // Choose parameters
        const extractionRecordType = recordType || job.record_type;
        const extractionLanguage = language || job.language;

        // Choose best text for extraction
        const textForExtraction = (job.ocr_result_translation && job.translation_confidence > 0.7) 
          ? job.ocr_result_translation 
          : job.ocr_result;

        // Perform entity extraction
        const extractedEntities = await entityExtractor.extractEntities(
          textForExtraction,
          extractionRecordType,
          extractionLanguage,
          churchId
        );

        // Update job
        await db.query(`
          UPDATE ocr_jobs 
          SET extracted_entities = ?, entity_confidence = ?, needs_review = ?, updated_at = NOW()
          WHERE id = ?
        `, [
          JSON.stringify(extractedEntities),
          extractedEntities.confidence,
          extractedEntities.confidence < 0.6,
          jobId
        ]);

        results.success++;
        results.results.push({
          jobId: jobId,
          success: true,
          confidence: extractedEntities.confidence
        });

      } catch (error) {
        console.error(`Failed to extract entities for job ${jobId}:`, error);
        results.failed++;
        results.results.push({
          jobId: jobId,
          success: false,
          error: error.message
        });
      }
    }

    // Log bulk extraction activity
    await db.query(
      'INSERT INTO activity_log (church_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, NOW())',
      [churchId, req.user?.id || null, 'bulk_entity_extraction', `Bulk entity extraction completed: ${results.success} successful, ${results.failed} failed`]
    );

    res.json({
      message: 'Bulk extraction completed',
      summary: {
        total: jobIds.length,
        successful: results.success,
        failed: results.failed
      },
      results: results.results
    });

  } catch (error) {
    console.error('Error in bulkExtractEntities:', error);
    res.status(500).json({ 
      error: 'Failed to perform bulk extraction',
      details: error.message 
    });
  }
};
