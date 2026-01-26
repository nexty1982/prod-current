/**
 * Interactive Reports API Routes
 * Handles priest/admin and recipient endpoints for delegation workflow
 * Adapted for MySQL and server structure
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Import paths that work in both src/ and dist/ contexts
// In src: ../middleware/auth -> src/middleware/auth (bridge to ../../middleware/auth)
// In dist: ../middleware/auth -> dist/middleware/auth (bridge to ../../middleware/auth)
const { requireAuth, requireRole } = require('../middleware/auth');

// In src: ../../utils/tokenUtils -> server/utils/tokenUtils
// In dist: ../../utils/tokenUtils -> dist/utils/tokenUtils (copied from server/utils)
const { generateToken, hashToken, verifyToken } = require('../../utils/tokenUtils');

// In src: ../../utils/emailService -> server/utils/emailService
// In dist: ../../utils/emailService -> dist/utils/emailService (copied from server/utils)
const { sendRecipientInvite, sendPriestSummary } = require('../../utils/emailService');

// In src: ../../middleware/rateLimiter -> server/middleware/rateLimiter
// In dist: ../../middleware/rateLimiter -> dist/middleware/rateLimiter (copied from server/middleware)
const { recipientGetLimiter, recipientSubmitLimiter } = require('../../middleware/rateLimiter');

// In src: ../config/db -> src/config/db (bridge to ../../config/db)
// In dist: ../config/db -> dist/config/db (copied from server/config)
const { getAppPool } = require('../config/db');

const router = express.Router();

// Helper to get database pool
function getDb() {
  return getAppPool();
}

// Priest/Admin authenticated endpoints

/**
 * POST /api/records/interactive-reports
 * Create a new interactive report
 */
router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req, res) => {
    try {
      const {
        churchId,
        recordType,
        title,
        filters,
        allowedFields,
        recipients,
        expiresDays = 30,
      } = req.body;

      const userId = req.user?.id || req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate inputs
      if (!churchId || !recordType || !title || !allowedFields || !recipients) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!['baptism', 'marriage', 'funeral'].includes(recordType)) {
        return res.status(400).json({ error: 'Invalid record type' });
      }

      const db = getDb();

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresDays);

      // Generate UUID for report
      const reportId = uuidv4();

      // Count records and recipients for job payload
      const totalRecordIds = recipients.reduce((sum, r) => sum + (r.recordIds?.length || 0), 0);
      
      // Create job record (status will be updated to COMPLETED after successful creation)
      const jobPayload = {
        recordType,
        recordIdsCount: totalRecordIds,
        recipientsCount: recipients.length,
        expiresDays,
        selectedFieldsCount: allowedFields.length,
        title
      };

      let jobId;
      try {
        const [jobResult] = await db.query(
          `INSERT INTO interactive_report_jobs 
           (created_by_user_id, church_id, report_id, job_type, status, progress, payload_json)
           VALUES (?, ?, ?, 'CREATE_REPORT', 'RUNNING', 0, ?)`,
          [userId.toString(), churchId, reportId, JSON.stringify(jobPayload)]
        );
        jobId = jobResult.insertId;
      } catch (jobError) {
        console.error('Failed to create job record:', jobError);
        // Continue with report creation even if job creation fails
      }

      // Create report
      await db.query(
        `INSERT INTO interactive_reports 
         (id, church_id, record_type, created_by_user_id, title, filters_json, allowed_fields_json, status, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', ?)`,
        [
          reportId,
          churchId,
          recordType,
          userId,
          title,
          JSON.stringify(filters || {}),
          JSON.stringify(allowedFields),
          expiresAt,
        ]
      );

      // Create recipients and assignments
      const recipientIds = [];
      for (const recipient of recipients) {
        if (!recipient.email || !recipient.recordIds || recipient.recordIds.length === 0) {
          continue;
        }

        // Generate token
        const token = generateToken();
        const tokenHash = hashToken(token);

        // Generate UUID for recipient
        const recipientId = uuidv4();

        // Create recipient
        await db.query(
          `INSERT INTO interactive_report_recipients 
           (id, report_id, email, token_hash, status)
           VALUES (?, ?, ?, ?, 'sent')`,
          [recipientId, reportId, recipient.email, tokenHash]
        );
        
        recipientIds.push(recipientId);

        // Create assignments
        const recordTable = `${recordType}_records`;
        const schemaName = `om_church_${churchId}`;
        
        // Introspect available columns to build safe SELECT list
        let availableColumns = [];
        try {
          const [columns] = await db.query(
            `SELECT column_name 
             FROM information_schema.columns 
             WHERE table_schema = ? AND table_name = ?`,
            [schemaName, recordTable]
          );
          availableColumns = columns.map(c => c.column_name);
        } catch (error) {
          console.error(`Failed to introspect columns for ${schemaName}.${recordTable}:`, error);
          // Continue with empty list - will use fallback
        }
        
        // Preferred field list (in order of preference)
        const preferredFields = {
          name: ['name', 'first_name', 'last_name'],
          date: ['date_of_baptism', 'reception_date', 'mdate', 'marriage_date', 'death_date', 'burial_date', 'deceased_date']
        };
        
        // Build SELECT list from available columns
        const selectFields = [];
        const nameFields = preferredFields.name.filter(f => availableColumns.includes(f));
        const dateFields = preferredFields.date.filter(f => availableColumns.includes(f));
        
        if (nameFields.length > 0) {
          selectFields.push(...nameFields);
        }
        if (dateFields.length > 0) {
          selectFields.push(...dateFields);
        }
        
        // If no preferred fields exist, use id as fallback
        if (selectFields.length === 0 && availableColumns.includes('id')) {
          selectFields.push('id');
        }
        
        if (selectFields.length === 0) {
          console.error(`No usable fields found for ${schemaName}.${recordTable}`);
          continue; // Skip this record
        }
        
        for (const recordId of recipient.recordIds) {
          // Fetch record context (safe fields only) - MySQL uses backticks for schema.table
          const [recordResult] = await db.query(
            `SELECT ${selectFields.join(', ')}
             FROM \`${schemaName}\`.\`${recordTable}\`
             WHERE id = ?`,
            [recordId]
          );

          const record = recordResult[0] || {};
          
          // Build name from available fields
          let name = 'Unknown';
          if (record.name) {
            name = record.name;
          } else if (record.first_name || record.last_name) {
            name = `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'Unknown';
          }
          
          // Build date from available fields
          let date = null;
          for (const dateField of preferredFields.date) {
            if (record[dateField]) {
              date = record[dateField];
              break;
            }
          }
          
          const context = {
            name,
            date
          };

          // Generate UUID for assignment (MySQL requires explicit UUID for CHAR(36) primary key)
          const assignmentId = uuidv4();

          await db.query(
            `INSERT INTO interactive_report_assignments 
             (id, report_id, recipient_id, record_id, record_table, record_context_json)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [assignmentId, reportId, recipientId, recordId, recordTable, JSON.stringify(context)]
          );
        }

        // Send email to recipient (non-blocking)
        const reportUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/r/interactive/${token}`;
        
        // Get church name if available
        db.query('SELECT church_name FROM churches WHERE id = ?', [churchId])
          .then(([churchResult]) => {
            const churchName = churchResult[0]?.church_name;
            return sendRecipientInvite({
              to: recipient.email,
              reportTitle: title,
              link: reportUrl,
              expiresAt,
              churchName,
            });
          })
          .catch((err) => {
            console.error('Failed to send recipient email:', err);
            // Don't fail the request if email fails
          });
      }

      // Audit log
      const auditId = uuidv4();
      await db.query(
        `INSERT INTO interactive_report_audit 
         (id, report_id, actor_type, actor_identifier, action, details_json)
         VALUES (?, ?, 'priest', ?, 'sent', ?)`,
        [auditId, reportId, userId.toString(), JSON.stringify({ recipientCount: recipientIds.length })]
      );

      // Update job to COMPLETED if job was created
      if (typeof jobId !== 'undefined') {
        try {
          const jobResultData = {
            reportId,
            recipientCount: recipientIds.length,
            assignmentCount: totalRecordIds,
            completedAt: new Date().toISOString()
          };

          await db.query(
            `UPDATE interactive_report_jobs 
             SET status = 'COMPLETED', 
                 progress = 100,
                 finished_at = NOW(),
                 result_json = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [JSON.stringify(jobResultData), jobId]
          );
        } catch (jobError) {
          console.error('Failed to update job status:', jobError);
          // Don't fail the request if job update fails
        }
      }

      res.json({
        id: reportId,
        recipientCount: recipientIds.length,
        message: 'Report created and emails sent',
        jobId
      });
    } catch (error) {
      console.error('Error creating interactive report:', error);
      
      // Update job to FAILED if it was created
      if (typeof jobId !== 'undefined') {
        try {
          const db = getDb();
          await db.query(
            `UPDATE interactive_report_jobs 
             SET status = 'FAILED', 
                 error_message = ?,
                 finished_at = NOW(),
                 updated_at = NOW()
             WHERE id = ?`,
            [error.message || 'Unknown error', jobId]
          );
        } catch (jobError) {
          console.error('Error updating job status:', jobError);
        }
      }
      
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// ==========================================
// JOBS ROUTES - Must be defined BEFORE /:id to avoid route conflicts
// ==========================================

/**
 * GET /api/records/interactive-reports/jobs
 * Get list of interactive report jobs
 */
router.get(
  '/jobs',
  requireAuth,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req, res) => {
    try {
      const {
        status,
        churchId,
        reportId,
        q,
        limit = 50,
        offset = 0
      } = req.query;

      const db = getDb();
      let query = 'SELECT * FROM interactive_report_jobs WHERE 1=1';
      const params = [];
      const countParams = [];

      // Apply filters
      if (status) {
        query += ' AND status = ?';
        params.push(status);
        countParams.push(status);
      }

      if (churchId) {
        query += ' AND church_id = ?';
        params.push(parseInt(churchId));
        countParams.push(parseInt(churchId));
      }

      if (reportId) {
        query += ' AND report_id = ?';
        params.push(reportId);
        countParams.push(reportId);
      }

      if (q) {
        query += ' AND (job_type LIKE ? OR error_message LIKE ?)';
        const searchTerm = `%${q}%`;
        params.push(searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm);
      }

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const [countResult] = await db.query(countQuery, countParams);
      const total = countResult[0]?.total || 0;

      // Apply sorting and pagination
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [jobs] = await db.query(query, params);

      // Parse JSON columns safely
      const items = jobs.map(job => ({
        id: job.id,
        jobType: job.job_type,
        status: job.status,
        progress: job.progress,
        attempts: job.attempts,
        maxAttempts: job.max_attempts,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        startedAt: job.started_at,
        finishedAt: job.finished_at,
        churchId: job.church_id,
        reportId: job.report_id,
        createdByUserId: job.created_by_user_id,
        errorMessage: job.error_message,
        payload: job.payload_json ? (typeof job.payload_json === 'string' ? JSON.parse(job.payload_json) : job.payload_json) : null,
        result: job.result_json ? (typeof job.result_json === 'string' ? JSON.parse(job.result_json) : job.result_json) : null
      }));

      res.json({
        items,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * GET /api/records/interactive-reports/jobs/:id
 * Get job details
 */
router.get(
  '/jobs/:id',
  requireAuth,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();

      const [jobs] = await db.query(
        'SELECT * FROM interactive_report_jobs WHERE id = ?',
        [id]
      );

      if (jobs.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = jobs[0];
      const jobData = {
        id: job.id,
        jobType: job.job_type,
        status: job.status,
        progress: job.progress,
        attempts: job.attempts,
        maxAttempts: job.max_attempts,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        startedAt: job.started_at,
        finishedAt: job.finished_at,
        nextRunAt: job.next_run_at,
        churchId: job.church_id,
        reportId: job.report_id,
        createdByUserId: job.created_by_user_id,
        errorMessage: job.error_message,
        payload: job.payload_json ? (typeof job.payload_json === 'string' ? JSON.parse(job.payload_json) : job.payload_json) : null,
        result: job.result_json ? (typeof job.result_json === 'string' ? JSON.parse(job.result_json) : job.result_json) : null
      };

      res.json(jobData);
    } catch (error) {
      console.error('Error fetching job:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * POST /api/records/interactive-reports/jobs/:id/cancel
 * Cancel a pending or running job
 */
router.post(
  '/jobs/:id/cancel',
  requireAuth,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();

      // Check if job exists and is cancellable
      const [jobs] = await db.query(
        'SELECT * FROM interactive_report_jobs WHERE id = ?',
        [id]
      );

      if (jobs.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = jobs[0];
      if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
        return res.status(400).json({ error: `Cannot cancel job with status: ${job.status}` });
      }

      // Update job status
      await db.query(
        `UPDATE interactive_report_jobs 
         SET status = 'CANCELLED', 
             finished_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [id]
      );

      res.json({ message: 'Job cancelled successfully', id });
    } catch (error) {
      console.error('Error cancelling job:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// ==========================================
// REPORT ROUTES - /:id routes come after /jobs routes
// ==========================================

/**
 * GET /api/records/interactive-reports/:id
 * Get report details
 */
router.get(
  '/:id',
  requireAuth,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();

      const [reportResult] = await db.query(
        `SELECT r.*, u.email as created_by_email
         FROM interactive_reports r
         LEFT JOIN users u ON r.created_by_user_id = u.id
         WHERE r.id = ?`,
        [id]
      );

      if (reportResult.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const report = reportResult[0];

      // Get recipients
      const [recipientsResult] = await db.query(
        `SELECT id, email, status, last_opened_at, submitted_at
         FROM interactive_report_recipients
         WHERE report_id = ?`,
        [id]
      );

      // Get patch counts
      const [patchCountsResult] = await db.query(
        `SELECT status, COUNT(*) as count
         FROM interactive_report_patches
         WHERE report_id = ?
         GROUP BY status`,
        [id]
      );

      const patchCounts = patchCountsResult.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {});

      res.json({
        ...report,
        recipients: recipientsResult,
        patchCounts: {
          pending: patchCounts.pending || 0,
          accepted: patchCounts.accepted || 0,
          rejected: patchCounts.rejected || 0,
        },
      });
    } catch (error) {
      console.error('Error fetching report:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * GET /api/records/interactive-reports/:id/patches
 * Get patches grouped by record
 */
router.get(
  '/:id/patches',
  requireAuth,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();

      const [patchesResult] = await db.query(
        `SELECT p.*, r.email as recipient_email, a.record_context_json
         FROM interactive_report_patches p
         JOIN interactive_report_recipients r ON p.recipient_id = r.id
         JOIN interactive_report_assignments a ON p.report_id = a.report_id 
           AND p.record_id = a.record_id
         WHERE p.report_id = ?
         ORDER BY p.record_id, p.field_key`,
        [id]
      );

      // Group by record
      const grouped = {};
      patchesResult.forEach((patch) => {
        if (!grouped[patch.record_id]) {
          grouped[patch.record_id] = [];
        }
        grouped[patch.record_id].push(patch);
      });

      res.json({ patches: grouped });
    } catch (error) {
      console.error('Error fetching patches:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * POST /api/records/interactive-reports/:id/patches/:patchId/accept
 * Accept a single patch
 */
router.post(
  '/:id/patches/:patchId/accept',
  requireAuth,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req, res) => {
    try {
      const { id, patchId } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      const { modifiedValue } = req.body; // Optional: priest can modify before accepting
      const db = getDb();

      // Get patch and report
      const [patchResult] = await db.query(
        `SELECT p.*, r.church_id, r.record_type, r.allowed_fields_json, a.record_table
         FROM interactive_report_patches p
         JOIN interactive_reports r ON p.report_id = r.id
         JOIN interactive_report_assignments a ON p.report_id = a.report_id 
           AND p.record_id = a.record_id
         WHERE p.id = ? AND p.report_id = ?`,
        [patchId, id]
      );

      if (patchResult.length === 0) {
        return res.status(404).json({ error: 'Patch not found' });
      }

      const patch = patchResult[0];
      const allowedFields = JSON.parse(patch.allowed_fields_json);

      // Validate field is allowed
      if (!allowedFields.includes(patch.field_key)) {
        return res.status(400).json({ error: 'Field not allowed' });
      }

      const finalValue = modifiedValue !== undefined ? modifiedValue : patch.new_value;

      // Validate value (skip empty strings for required fields)
      if (!finalValue || finalValue.trim() === '') {
        return res.status(400).json({ error: 'Cannot accept empty value' });
      }

      // Validate date format if it's a date field
      if (patch.field_key.toLowerCase().includes('date')) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(finalValue)) {
          return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }
      }

      // Start transaction
      await db.query('START TRANSACTION');

      try {
        // Update patch status
        await db.query(
          `UPDATE interactive_report_patches
           SET status = 'accepted', decided_by_user_id = ?, decided_at = NOW(),
               new_value = ?
           WHERE id = ?`,
          [userId, finalValue, patchId]
        );

        // Write to record table (use backticks for schema.table in MySQL)
        const recordTable = `\`om_church_${patch.church_id}\`.\`${patch.record_table}\``;
        
        await db.query(
          `UPDATE ${recordTable}
           SET \`${patch.field_key}\` = ?, updated_at = NOW()
           WHERE id = ?`,
          [finalValue, patch.record_id]
        );

        // Audit log
        const auditId = uuidv4();
        await db.query(
          `INSERT INTO interactive_report_audit 
           (id, report_id, actor_type, actor_identifier, action, details_json)
           VALUES (?, ?, 'priest', ?, 'accepted', ?)`,
          [auditId, id, userId.toString(), JSON.stringify({ patchId, recordId: patch.record_id, field: patch.field_key })]
        );

        await db.query('COMMIT');

        res.json({ message: 'Patch accepted', patchId });
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error accepting patch:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * POST /api/records/interactive-reports/:id/patches/:patchId/reject
 * Reject a single patch
 */
router.post(
  '/:id/patches/:patchId/reject',
  requireAuth,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req, res) => {
    try {
      const { id, patchId } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      const db = getDb();

      // Update patch status
      await db.query(
        `UPDATE interactive_report_patches
         SET status = 'rejected', decided_by_user_id = ?, decided_at = NOW()
         WHERE id = ? AND report_id = ?`,
        [userId, patchId, id]
      );

      // Audit log
      const auditId = uuidv4();
      await db.query(
        `INSERT INTO interactive_report_audit 
         (id, report_id, actor_type, actor_identifier, action, details_json)
         VALUES (?, ?, 'priest', ?, 'rejected', ?)`,
        [auditId, id, userId.toString(), JSON.stringify({ patchId })]
      );

      res.json({ message: 'Patch rejected', patchId });
    } catch (error) {
      console.error('Error rejecting patch:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * POST /api/records/interactive-reports/:id/accept-all
 * Accept all pending patches
 */
router.post(
  '/:id/accept-all',
  requireAuth,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      const db = getDb();

      // Get all pending patches
      const [patchesResult] = await db.query(
        `SELECT p.*, r.church_id, r.allowed_fields_json, a.record_table
         FROM interactive_report_patches p
         JOIN interactive_reports r ON p.report_id = r.id
         JOIN interactive_report_assignments a ON p.report_id = a.report_id 
           AND p.record_id = a.record_id
         WHERE p.report_id = ? AND p.status = 'pending'`,
        [id]
      );

      const patches = patchesResult;
      const allowedFields = patches.length > 0 ? JSON.parse(patches[0].allowed_fields_json) : [];

      let accepted = 0;
      let skipped = 0;
      const errors = [];

      // Process in transaction
      await db.query('START TRANSACTION');

      try {
        for (const patch of patches) {
          // Validate field is allowed
          if (!allowedFields.includes(patch.field_key)) {
            skipped++;
            errors.push(`Field ${patch.field_key} not allowed`);
            continue;
          }

          // Validate value (skip empty strings for required fields)
          if (!patch.new_value || patch.new_value.trim() === '') {
            skipped++;
            errors.push(`Empty value for ${patch.field_key} skipped`);
            continue;
          }

          // Validate date format if it's a date field
          if (patch.field_key.toLowerCase().includes('date')) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(patch.new_value)) {
              skipped++;
              errors.push(`Invalid date format for ${patch.field_key}`);
              continue;
            }
          }

          // Update patch
          await db.query(
            `UPDATE interactive_report_patches
             SET status = 'accepted', decided_by_user_id = ?, decided_at = NOW()
             WHERE id = ?`,
            [userId, patch.id]
          );

          // Write to record table (use backticks for schema.table)
          const recordTable = `\`om_church_${patch.church_id}\`.\`${patch.record_table}\``;
          
          await db.query(
            `UPDATE ${recordTable}
             SET \`${patch.field_key}\` = ?, updated_at = NOW()
             WHERE id = ?`,
            [patch.new_value, patch.record_id]
          );

          accepted++;
        }

        await db.query('COMMIT');

        // Audit log
        const auditId = uuidv4();
        await db.query(
          `INSERT INTO interactive_report_audit 
           (id, report_id, actor_type, actor_identifier, action, details_json)
           VALUES (?, ?, 'priest', ?, 'accept_all', ?)`,
          [auditId, id, userId.toString(), JSON.stringify({ accepted, skipped, errors })]
        );

        res.json({ accepted, skipped, errors });
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error accepting all patches:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * POST /api/records/interactive-reports/:id/revoke
 * Revoke a report
 */
router.post(
  '/:id/revoke',
  requireAuth,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      const db = getDb();

      // Update report status
      await db.query(
        `UPDATE interactive_reports SET status = 'revoked' WHERE id = ?`,
        [id]
      );

      // Update recipient statuses
      await db.query(
        `UPDATE interactive_report_recipients SET status = 'revoked' WHERE report_id = ?`,
        [id]
      );

      // Audit log
      const auditId = uuidv4();
      await db.query(
        `INSERT INTO interactive_report_audit 
         (id, report_id, actor_type, actor_identifier, action, details_json)
         VALUES (?, ?, 'priest', ?, 'revoked', ?)`,
        [auditId, id, userId.toString(), JSON.stringify({})]
      );

      res.json({ message: 'Report revoked' });
    } catch (error) {
      console.error('Error revoking report:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Public recipient endpoints (token-based, no auth required)

/**
 * GET /r/interactive/:token
 * Get report data for recipient
 */
router.get(
  '/r/interactive/:token',
  recipientGetLimiter,
  async (req, res) => {
    try {
      const { token } = req.params;
      const tokenHash = hashToken(token);
      const db = getDb();

      // Find recipient
      const [recipientResult] = await db.query(
        `SELECT r.*, rep.title, rep.record_type, rep.allowed_fields_json, rep.status as report_status
         FROM interactive_report_recipients r
         JOIN interactive_reports rep ON r.report_id = rep.id
         WHERE r.token_hash = ?`,
        [tokenHash]
      );

      if (recipientResult.length === 0) {
        return res.status(404).json({ error: 'Invalid or expired link' });
      }

      const recipient = recipientResult[0];

      if (recipient.report_status === 'revoked') {
        return res.status(410).json({ error: 'This report has been revoked' });
      }

      // Check expiration
      const [reportResult] = await db.query(
        'SELECT expires_at FROM interactive_reports WHERE id = ?',
        [recipient.report_id]
      );
      
      if (reportResult.length > 0 && reportResult[0].expires_at) {
        const expiresAt = new Date(reportResult[0].expires_at);
        if (expiresAt < new Date()) {
          return res.status(410).json({ error: 'This link has expired' });
        }
      }

      // Update last opened
      await db.query(
        `UPDATE interactive_report_recipients 
         SET last_opened_at = NOW(), status = CASE WHEN status = 'sent' THEN 'opened' ELSE status END
         WHERE id = ?`,
        [recipient.id]
      );

      // Get assignments
      const [assignmentsResult] = await db.query(
        `SELECT record_id, record_table, record_context_json
         FROM interactive_report_assignments
         WHERE report_id = ? AND recipient_id = ?`,
        [recipient.report_id, recipient.id]
      );

      const allowedFields = JSON.parse(recipient.allowed_fields_json);

      res.json({
        title: recipient.title,
        recordType: recipient.record_type,
        allowedFields,
        assignments: assignmentsResult.map((a) => ({
          recordId: a.record_id,
          recordTable: a.record_table,
          context: typeof a.record_context_json === 'string' 
            ? JSON.parse(a.record_context_json) 
            : a.record_context_json,
        })),
      });
    } catch (error) {
      console.error('Error fetching recipient report:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * POST /r/interactive/:token/submit
 * Submit patches from recipient
 */
router.post(
  '/r/interactive/:token/submit',
  recipientSubmitLimiter,
  async (req, res) => {
    try {
      const { token } = req.params;
      const { patches } = req.body;
      const tokenHash = hashToken(token);
      const db = getDb();

      // Rate limiting: reject too many patches
      if (!Array.isArray(patches) || patches.length > 200) {
        return res.status(400).json({ error: 'Too many patches. Maximum 200 patches per submission.' });
      }

      // Body size limit
      const bodySize = JSON.stringify(req.body).length;
      if (bodySize > 1 * 1024 * 1024) {
        // 1MB limit
        return res.status(400).json({ error: 'Request body too large' });
      }

      // Find recipient
      const [recipientResult] = await db.query(
        `SELECT r.*, rep.allowed_fields_json, rep.status as report_status
         FROM interactive_report_recipients r
         JOIN interactive_reports rep ON r.report_id = rep.id
         WHERE r.token_hash = ?`,
        [tokenHash]
      );

      if (recipientResult.length === 0) {
        return res.status(404).json({ error: 'Invalid or expired link' });
      }

      const recipient = recipientResult[0];

      if (recipient.report_status === 'revoked') {
        return res.status(410).json({ error: 'This report has been revoked' });
      }

      const allowedFields = JSON.parse(recipient.allowed_fields_json);

      // Validate patches
      const assignmentRecordIds = new Set();
      const [assignmentsResult] = await db.query(
        `SELECT record_id FROM interactive_report_assignments
         WHERE report_id = ? AND recipient_id = ?`,
        [recipient.report_id, recipient.id]
      );
      assignmentsResult.forEach((row) => assignmentRecordIds.add(row.record_id));

      for (const patch of patches) {
        // Validate field is allowed
        if (!allowedFields.includes(patch.field)) {
          return res.status(400).json({ error: `Field ${patch.field} is not allowed` });
        }
        
        // Validate record is assigned to this recipient
        if (!assignmentRecordIds.has(patch.record_id)) {
          return res.status(403).json({ error: `Record ${patch.record_id} is not assigned to you` });
        }
      }

      // Store submission
      const submissionId = uuidv4();
      await db.query(
        `INSERT INTO interactive_report_submissions 
         (id, report_id, recipient_id, submitted_json)
         VALUES (?, ?, ?, ?)`,
        [submissionId, recipient.report_id, recipient.id, JSON.stringify(patches)]
      );

      // Create patches (MySQL uses INSERT ... ON DUPLICATE KEY UPDATE)
      for (const patch of patches) {
        const patchId = uuidv4();
        await db.query(
          `INSERT INTO interactive_report_patches 
           (id, report_id, recipient_id, record_id, field_key, new_value, status)
           VALUES (?, ?, ?, ?, ?, ?, 'pending')
           ON DUPLICATE KEY UPDATE 
           new_value = VALUES(new_value), status = 'pending'`,
          [patchId, recipient.report_id, recipient.id, patch.record_id, patch.field, patch.new_value]
        );
      }

      // Update recipient status
      await db.query(
        `UPDATE interactive_report_recipients 
         SET submitted_at = NOW(), status = 'submitted'
         WHERE id = ?`,
        [recipient.id]
      );

      // Audit log
      const auditId = uuidv4();
      await db.query(
        `INSERT INTO interactive_report_audit 
         (id, report_id, actor_type, actor_identifier, action, details_json)
         VALUES (?, ?, 'recipient', ?, 'submitted', ?)`,
        [auditId, recipient.report_id, recipient.email, JSON.stringify({ patchCount: patches.length })]
      );

      // Email priest (non-blocking)
      db.query(
        `SELECT u.email, r.title, r.church_id
         FROM users u
         JOIN interactive_reports r ON u.id = r.created_by_user_id
         WHERE r.id = ?`,
        [recipient.report_id]
      )
        .then(([priestResult]) => {
          if (priestResult.length > 0) {
            const priestData = priestResult[0];
            const reviewUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/apps/records/interactive-reports/${recipient.report_id}`;
            
            // Get church name
            return db.query('SELECT church_name FROM churches WHERE id = ?', [priestData.church_id])
              .then(([churchResult]) => {
                const churchName = churchResult[0]?.church_name;
                return sendPriestSummary({
                  to: priestData.email,
                  reportTitle: priestData.title || 'Interactive Report',
                  link: reviewUrl,
                  submittedBy: recipient.email,
                  counts: { patchCount: patches.length },
                  churchName,
                });
              });
          }
        })
        .catch((err) => {
          console.error('Failed to send priest email:', err);
          // Don't fail the request if email fails
        });

      res.json({ message: 'Submission received', patchCount: patches.length });
    } catch (error) {
      console.error('Error submitting patches:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

module.exports = router;
