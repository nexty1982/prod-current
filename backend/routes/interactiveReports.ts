/**
 * Interactive Reports API Routes
 * Handles priest/admin and recipient endpoints for delegation workflow
 */

import express, { Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { generateToken, hashToken, verifyToken } from '../utils/tokenUtils';
import { sendRecipientInvite, sendPriestSummary } from '../utils/emailService';
import { recipientGetLimiter, recipientSubmitLimiter } from '../middleware/rateLimiter';
import { db } from '../db';

const router = express.Router();

// Priest/Admin authenticated endpoints

/**
 * POST /api/records/interactive-reports
 * Create a new interactive report
 */
router.post(
  '/',
  authenticateToken,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req: Request, res: Response) => {
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

      const userId = (req as any).user?.id;
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

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresDays);

      // Create report
      const reportResult = await db.query(
        `INSERT INTO interactive_reports 
         (church_id, record_type, created_by_user_id, title, filters_json, allowed_fields_json, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'sent', $7)
         RETURNING id`,
        [churchId, recordType, userId, title, JSON.stringify(filters || {}), JSON.stringify(allowedFields), expiresAt]
      );

      const reportId = reportResult.rows[0].id;

      // Create recipients and assignments
      const recipientIds: string[] = [];
      for (const recipient of recipients) {
        if (!recipient.email || !recipient.recordIds || recipient.recordIds.length === 0) {
          continue;
        }

        // Generate token
        const token = generateToken();
        const tokenHash = hashToken(token);

        // Create recipient
        const recipientResult = await db.query(
          `INSERT INTO interactive_report_recipients 
           (report_id, email, token_hash, status)
           VALUES ($1, $2, $3, 'sent')
           RETURNING id`,
          [reportId, recipient.email, tokenHash]
        );

        const recipientId = recipientResult.rows[0].id;
        recipientIds.push(recipientId);

        // Create assignments
        const recordTable = `${recordType}_records`;
        for (const recordId of recipient.recordIds) {
          // Fetch record context (safe fields only)
          const recordResult = await db.query(
            `SELECT first_name, last_name, name, 
                    date_of_baptism, reception_date, mdate, marriage_date, 
                    death_date, burial_date, deceased_date
             FROM om_church_${churchId}.${recordTable}
             WHERE id = $1`,
            [recordId]
          );

          const record = recordResult.rows[0];
          const context = {
            name: record?.name || `${record?.first_name || ''} ${record?.last_name || ''}`.trim() || 'Unknown',
            date: record?.date_of_baptism || record?.reception_date || record?.mdate || 
                  record?.marriage_date || record?.death_date || record?.burial_date || record?.deceased_date || null,
          };

          await db.query(
            `INSERT INTO interactive_report_assignments 
             (report_id, recipient_id, record_id, record_table, record_context_json)
             VALUES ($1, $2, $3, $4, $5)`,
            [reportId, recipientId, recordId, recordTable, JSON.stringify(context)]
          );
        }

        // Send email to recipient (non-blocking)
        const reportUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/r/interactive/${token}`;
        
        // Get church name if available
        db.query('SELECT church_name FROM churches WHERE id = $1', [churchId])
          .then((churchResult) => {
            const churchName = churchResult.rows[0]?.church_name;
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
      await db.query(
        `INSERT INTO interactive_report_audit 
         (report_id, actor_type, actor_identifier, action, details_json)
         VALUES ($1, 'priest', $2, 'sent', $3)`,
        [reportId, userId.toString(), JSON.stringify({ recipientCount: recipientIds.length })]
      );

      res.json({
        id: reportId,
        recipientCount: recipientIds.length,
        message: 'Report created and emails sent',
      });
    } catch (error: any) {
      console.error('Error creating interactive report:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * GET /api/records/interactive-reports/:id
 * Get report details
 */
router.get(
  '/:id',
  authenticateToken,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const reportResult = await db.query(
        `SELECT r.*, u.email as created_by_email
         FROM interactive_reports r
         LEFT JOIN users u ON r.created_by_user_id = u.id
         WHERE r.id = $1`,
        [id]
      );

      if (reportResult.rows.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const report = reportResult.rows[0];

      // Get recipients
      const recipientsResult = await db.query(
        `SELECT id, email, status, last_opened_at, submitted_at
         FROM interactive_report_recipients
         WHERE report_id = $1`,
        [id]
      );

      // Get patch counts
      const patchCountsResult = await db.query(
        `SELECT status, COUNT(*) as count
         FROM interactive_report_patches
         WHERE report_id = $1
         GROUP BY status`,
        [id]
      );

      const patchCounts = patchCountsResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>);

      res.json({
        ...report,
        recipients: recipientsResult.rows,
        patchCounts: {
          pending: patchCounts.pending || 0,
          accepted: patchCounts.accepted || 0,
          rejected: patchCounts.rejected || 0,
        },
      });
    } catch (error: any) {
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
  authenticateToken,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const patchesResult = await db.query(
        `SELECT p.*, r.email as recipient_email, a.record_context_json
         FROM interactive_report_patches p
         JOIN interactive_report_recipients r ON p.recipient_id = r.id
         JOIN interactive_report_assignments a ON p.report_id = a.report_id 
           AND p.record_id = a.record_id
         WHERE p.report_id = $1
         ORDER BY p.record_id, p.field_key`,
        [id]
      );

      // Group by record
      const grouped: Record<number, any[]> = {};
      patchesResult.rows.forEach((patch) => {
        if (!grouped[patch.record_id]) {
          grouped[patch.record_id] = [];
        }
        grouped[patch.record_id].push(patch);
      });

      res.json({ patches: grouped });
    } catch (error: any) {
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
  authenticateToken,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req: Request, res: Response) => {
    try {
      const { id, patchId } = req.params;
      const userId = (req as any).user?.id;
      const { modifiedValue } = req.body; // Optional: priest can modify before accepting

      // Get patch and report
      const patchResult = await db.query(
        `SELECT p.*, r.church_id, r.record_type, r.allowed_fields_json, a.record_table
         FROM interactive_report_patches p
         JOIN interactive_reports r ON p.report_id = r.id
         JOIN interactive_report_assignments a ON p.report_id = a.report_id 
           AND p.record_id = a.record_id
         WHERE p.id = $1 AND p.report_id = $2`,
        [patchId, id]
      );

      if (patchResult.rows.length === 0) {
        return res.status(404).json({ error: 'Patch not found' });
      }

      const patch = patchResult.rows[0];
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
      await db.query('BEGIN');

      try {
        // Update patch status
        await db.query(
          `UPDATE interactive_report_patches
           SET status = 'accepted', decided_by_user_id = $1, decided_at = CURRENT_TIMESTAMP,
               new_value = $2
           WHERE id = $3`,
          [userId, finalValue, patchId]
        );

        // Write to record table (parameterized to prevent SQL injection)
        const recordTable = `om_church_${patch.church_id}.${patch.record_table}`;
        
        await db.query(
          `UPDATE ${recordTable}
           SET ${patch.field_key} = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [finalValue, patch.record_id]
        );

        // Audit log
        await db.query(
          `INSERT INTO interactive_report_audit 
           (report_id, actor_type, actor_identifier, action, details_json)
           VALUES ($1, 'priest', $2, 'accepted', $3)`,
          [id, userId.toString(), JSON.stringify({ patchId, recordId: patch.record_id, field: patch.field_key })]
        );

        await db.query('COMMIT');

        res.json({ message: 'Patch accepted', patchId });
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    } catch (error: any) {
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
  authenticateToken,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req: Request, res: Response) => {
    try {
      const { id, patchId } = req.params;
      const userId = (req as any).user?.id;

      await db.query(
        `UPDATE interactive_report_patches
         SET status = 'rejected', decided_by_user_id = $1, decided_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND report_id = $3`,
        [userId, patchId, id]
      );

      // Audit log
      await db.query(
        `INSERT INTO interactive_report_audit 
         (report_id, actor_type, actor_identifier, action, details_json)
         VALUES ($1, 'priest', $2, 'rejected', $3)`,
        [id, userId.toString(), JSON.stringify({ patchId })]
      );

      res.json({ message: 'Patch rejected', patchId });
    } catch (error: any) {
      console.error('Error rejecting patch:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * POST /api/records/interactive-reports/:id/accept-all
 * Accept all pending patches (with guardrails)
 */
router.post(
  '/:id/accept-all',
  authenticateToken,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      // Get all pending patches
      const patchesResult = await db.query(
        `SELECT p.*, r.church_id, r.allowed_fields_json, a.record_table
         FROM interactive_report_patches p
         JOIN interactive_reports r ON p.report_id = r.id
         JOIN interactive_report_assignments a ON p.report_id = a.report_id 
           AND p.record_id = a.record_id
         WHERE p.report_id = $1 AND p.status = 'pending'`,
        [id]
      );

      const patches = patchesResult.rows;
      const allowedFields = patches.length > 0 ? JSON.parse(patches[0].allowed_fields_json) : [];

      let accepted = 0;
      let skipped = 0;
      const errors: string[] = [];

      // Process in transaction
      await db.query('BEGIN');

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
             SET status = 'accepted', decided_by_user_id = $1, decided_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [userId, patch.id]
          );

          // Write to record table (parameterized)
          const recordTable = `om_church_${patch.church_id}.${patch.record_table}`;
          
          await db.query(
            `UPDATE ${recordTable}
             SET ${patch.field_key} = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [patch.new_value, patch.record_id]
          );

          accepted++;
        }

        await db.query('COMMIT');

        // Audit log
        await db.query(
          `INSERT INTO interactive_report_audit 
           (report_id, actor_type, actor_identifier, action, details_json)
           VALUES ($1, 'priest', $2, 'accept_all', $3)`,
          [id, userId.toString(), JSON.stringify({ accepted, skipped, errors })]
        );

        res.json({ accepted, skipped, errors });
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    } catch (error: any) {
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
  authenticateToken,
  requireRole(['admin', 'super_admin', 'church_admin', 'priest']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      await db.query(
        `UPDATE interactive_reports SET status = 'revoked' WHERE id = $1`,
        [id]
      );

      await db.query(
        `UPDATE interactive_report_recipients SET status = 'revoked' WHERE report_id = $1`,
        [id]
      );

      // Audit log
      await db.query(
        `INSERT INTO interactive_report_audit 
         (report_id, actor_type, actor_identifier, action, details_json)
         VALUES ($1, 'priest', $2, 'revoked', $3)`,
        [id, userId.toString(), JSON.stringify({})]
      );

      res.json({ message: 'Report revoked' });
    } catch (error: any) {
      console.error('Error revoking report:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Recipient unauthenticated endpoints (token-based)

/**
 * GET /r/interactive/:token
 * Get report details for recipient
 */
router.get(
  '/r/interactive/:token',
  recipientGetLimiter,
  async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const tokenHash = hashToken(token);

      // Find recipient
      const recipientResult = await db.query(
        `SELECT r.*, rep.title, rep.record_type, rep.allowed_fields_json, rep.expires_at, rep.status as report_status
         FROM interactive_report_recipients r
         JOIN interactive_reports rep ON r.report_id = rep.id
         WHERE r.token_hash = $1`,
        [tokenHash]
      );

      if (recipientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Invalid or expired link' });
      }

      const recipient = recipientResult.rows[0];

      // Check expiration
      if (new Date(recipient.expires_at) < new Date()) {
        return res.status(410).json({ error: 'This link has expired' });
      }

      if (recipient.report_status === 'revoked') {
        return res.status(410).json({ error: 'This report has been revoked' });
      }

      // Update last opened
      await db.query(
        `UPDATE interactive_report_recipients 
         SET last_opened_at = CURRENT_TIMESTAMP, status = 'opened'
         WHERE id = $1 AND status != 'revoked'`,
        [recipient.id]
      );

      // Get assignments
      const assignmentsResult = await db.query(
        `SELECT record_id, record_table, record_context_json
         FROM interactive_report_assignments
         WHERE report_id = $1 AND recipient_id = $2`,
        [recipient.report_id, recipient.id]
      );

      res.json({
        title: recipient.title,
        recordType: recipient.record_type,
        allowedFields: JSON.parse(recipient.allowed_fields_json),
        assignments: assignmentsResult.rows,
      });
    } catch (error: any) {
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
  async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { patches } = req.body;
      const tokenHash = hashToken(token);

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
      const recipientResult = await db.query(
        `SELECT r.*, rep.allowed_fields_json, rep.status as report_status
         FROM interactive_report_recipients r
         JOIN interactive_reports rep ON r.report_id = rep.id
         WHERE r.token_hash = $1`,
        [tokenHash]
      );

      if (recipientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Invalid or expired link' });
      }

      const recipient = recipientResult.rows[0];

      if (recipient.report_status === 'revoked') {
        return res.status(410).json({ error: 'This report has been revoked' });
      }

      const allowedFields = JSON.parse(recipient.allowed_fields_json);

      // Validate patches
      const assignmentRecordIds = new Set<number>();
      const assignmentsResult = await db.query(
        `SELECT record_id FROM interactive_report_assignments
         WHERE report_id = $1 AND recipient_id = $2`,
        [recipient.report_id, recipient.id]
      );
      assignmentsResult.rows.forEach((row) => assignmentRecordIds.add(row.record_id));

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
      await db.query(
        `INSERT INTO interactive_report_submissions 
         (report_id, recipient_id, submitted_json)
         VALUES ($1, $2, $3)`,
        [recipient.report_id, recipient.id, JSON.stringify(patches)]
      );

      // Create patches
      for (const patch of patches) {
        // Get old value snapshot (would need church_id to query actual value)
        // For now, store null - in production, fetch from the actual record table

        await db.query(
          `INSERT INTO interactive_report_patches 
           (report_id, recipient_id, record_id, field_key, new_value, status)
           VALUES ($1, $2, $3, $4, $5, 'pending')
           ON CONFLICT (report_id, recipient_id, record_id, field_key) 
           DO UPDATE SET new_value = EXCLUDED.new_value, status = 'pending'`,
          [recipient.report_id, recipient.id, patch.record_id, patch.field, patch.new_value]
        );
      }

      // Update recipient status
      await db.query(
        `UPDATE interactive_report_recipients 
         SET submitted_at = CURRENT_TIMESTAMP, status = 'submitted'
         WHERE id = $1`,
        [recipient.id]
      );

      // Audit log
      await db.query(
        `INSERT INTO interactive_report_audit 
         (report_id, actor_type, actor_identifier, action, details_json)
         VALUES ($1, 'recipient', $2, 'submitted', $3)`,
        [recipient.report_id, recipient.email, JSON.stringify({ patchCount: patches.length })]
      );

      // Email priest (non-blocking)
      db.query(
        `SELECT u.email, r.title, r.church_id
         FROM users u
         JOIN interactive_reports r ON u.id = r.created_by_user_id
         WHERE r.id = $1`,
        [recipient.report_id]
      )
        .then((priestResult) => {
          if (priestResult.rows.length > 0) {
            const priestData = priestResult.rows[0];
            const reviewUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/apps/records/interactive-reports/${recipient.report_id}`;
            
            // Get church name
            return db.query('SELECT church_name FROM churches WHERE id = $1', [priestData.church_id])
              .then((churchResult) => {
                const churchName = churchResult.rows[0]?.church_name;
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
    } catch (error: any) {
      console.error('Error submitting patches:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

export default router;
