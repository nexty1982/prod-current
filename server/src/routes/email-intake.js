/**
 * Email Intake Webhook
 * Receives inbound emails forwarded by the email provider (e.g., SendGrid Inbound Parse),
 * validates the sender against the authorized senders whitelist, and forwards to OMAI for processing.
 *
 * Mount: app.use('/api/email-intake', emailIntakeRouter)
 * This route is NOT behind auth middleware — it's protected by webhook secret validation.
 */

const express = require('express');
const router = express.Router();
const { getAppPool } = require('../config/db');
const { getEffectiveFeatures } = require('../utils/featureFlags');
const { processEmailWithOMAI } = require('../services/emailParser');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract email address from "Name <email>" or plain email format
 */
function extractEmailAddress(fromHeader) {
  if (!fromHeader) return '';
  const match = fromHeader.match(/<([^>]+)>/);
  return (match ? match[1] : fromHeader).trim().toLowerCase();
}

/**
 * Strip HTML tags to plain text
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Log a submission to email_submissions table
 */
async function logSubmission(pool, data) {
  try {
    await pool.query(
      `INSERT INTO email_submissions (church_id, sender_email, user_id, subject, status, rejection_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [data.church_id || null, data.sender_email, data.user_id || null,
       data.subject || null, data.status, data.rejection_reason || null]
    );
  } catch (err) {
    console.error('[EmailIntake] Failed to log submission:', err.message);
  }
}

// ─── Webhook Secret Validation ───────────────────────────────────────────────

function validateWebhookSecret(req, res, next) {
  const secret = req.headers['x-webhook-secret'] || req.query.secret;
  const expected = process.env.EMAIL_INTAKE_WEBHOOK_SECRET;

  if (!expected) {
    console.error('[EmailIntake] EMAIL_INTAKE_WEBHOOK_SECRET not configured');
    return res.status(503).json({ error: 'Email intake service not configured' });
  }

  if (!secret || secret !== expected) {
    console.warn('[EmailIntake] Invalid webhook secret from IP:', req.ip);
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}

// ─── Health Check ─────────────────────────────────────────────────────────────

router.get('/health', (req, res) => {
  const configured = !!process.env.EMAIL_INTAKE_WEBHOOK_SECRET;
  res.json({ status: configured ? 'ready' : 'not_configured', service: 'email-intake' });
});

// ─── Inbound Email Webhook ───────────────────────────────────────────────────

router.post('/inbound', validateWebhookSecret, async (req, res) => {
  const startTime = Date.now();
  const pool = getAppPool();

  try {
    // 1. Extract email fields from provider payload
    //    SendGrid Inbound Parse fields: from, to, subject, text, html, envelope
    //    Mailgun: sender, subject, body-plain, body-html
    //    Adapt field extraction as needed for your provider
    const from = req.body.from || req.body.sender || '';
    const subject = req.body.subject || '(no subject)';
    const text = req.body.text || req.body['body-plain'] || '';
    const html = req.body.html || req.body['body-html'] || '';
    const senderEmail = extractEmailAddress(from);
    const emailBody = text || stripHtml(html);

    if (!senderEmail) {
      console.warn('[EmailIntake] No sender email in payload');
      return res.status(200).json({ status: 'rejected', reason: 'no_sender' });
    }

    console.log(`[EmailIntake] Inbound email from: ${senderEmail}, subject: "${subject}"`);

    // 2. Look up sender across all churches
    const [senderRows] = await pool.query(`
      SELECT u.id as user_id, u.email, u.first_name, u.last_name, u.is_active,
             cu.church_id, cu.email_intake_authorized, cu.role as church_role,
             c.name as church_name
      FROM orthodoxmetrics_db.users u
      JOIN church_users cu ON u.id = cu.user_id
      JOIN churches c ON cu.church_id = c.id AND c.is_active = 1
      WHERE LOWER(u.email) = ?
    `, [senderEmail]);

    // 3. No matching user
    if (senderRows.length === 0) {
      console.warn(`[EmailIntake] Unknown sender: ${senderEmail}`);
      await logSubmission(pool, {
        sender_email: senderEmail,
        subject,
        status: 'rejected',
        rejection_reason: 'Unknown sender - no matching user account',
      });
      return res.status(200).json({ status: 'rejected', reason: 'unknown_sender' });
    }

    // 4. Find first authorized & active church assignment
    const authorizedRow = senderRows.find(r => r.email_intake_authorized && r.is_active);

    if (!authorizedRow) {
      console.warn(`[EmailIntake] Sender not authorized: ${senderEmail}`);
      await logSubmission(pool, {
        church_id: senderRows[0].church_id,
        sender_email: senderEmail,
        user_id: senderRows[0].user_id,
        subject,
        status: 'rejected',
        rejection_reason: 'Sender not authorized for email intake',
      });
      return res.status(200).json({ status: 'rejected', reason: 'not_authorized' });
    }

    // 5. Check om_assistant_enabled feature flag for the church
    const { effective } = await getEffectiveFeatures(pool, authorizedRow.church_id);
    if (!effective.om_assistant_enabled) {
      await logSubmission(pool, {
        church_id: authorizedRow.church_id,
        sender_email: senderEmail,
        user_id: authorizedRow.user_id,
        subject,
        status: 'rejected',
        rejection_reason: 'OM Assistant / Email intake not enabled for this church',
      });
      return res.status(200).json({ status: 'rejected', reason: 'feature_disabled' });
    }

    // 6. Insert initial submission (status=received)
    const [insertResult] = await pool.query(
      `INSERT INTO email_submissions (church_id, sender_email, user_id, subject, status, created_at)
       VALUES (?, ?, ?, ?, 'received', NOW())`,
      [authorizedRow.church_id, senderEmail, authorizedRow.user_id, subject]
    );
    const submissionId = insertResult.insertId;

    console.log(`[EmailIntake] Submission #${submissionId} received from ${senderEmail} for church ${authorizedRow.church_name} (${authorizedRow.church_id})`);

    // 7. Process via OMAI
    const omaiResult = await processEmailWithOMAI({
      submissionId,
      churchId: authorizedRow.church_id,
      senderEmail,
      userId: authorizedRow.user_id,
      subject,
      body: emailBody,
      senderName: `${authorizedRow.first_name} ${authorizedRow.last_name}`,
    });

    const processingTime = Date.now() - startTime;

    // 8. Update submission with results
    await pool.query(
      `UPDATE email_submissions
       SET status = ?, record_type = ?, parsed_data = ?,
           backend_response = ?, created_record_id = ?,
           processing_time_ms = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        omaiResult.status,
        omaiResult.recordType || 'unknown',
        JSON.stringify(omaiResult.parsedData),
        JSON.stringify(omaiResult.response),
        omaiResult.createdRecordId,
        processingTime,
        submissionId,
      ]
    );

    console.log(`[EmailIntake] Submission #${submissionId} processed in ${processingTime}ms — status: ${omaiResult.status}, type: ${omaiResult.recordType}`);

    res.status(200).json({
      status: omaiResult.status,
      submission_id: submissionId,
      record_type: omaiResult.recordType,
      created_record_id: omaiResult.createdRecordId,
    });

  } catch (err) {
    const processingTime = Date.now() - startTime;
    console.error('[EmailIntake] Unhandled error:', err);

    // Try to update the submission if one was created
    try {
      const senderEmail = extractEmailAddress(req.body.from || req.body.sender || '');
      await logSubmission(pool, {
        sender_email: senderEmail,
        subject: req.body.subject,
        status: 'failed',
        rejection_reason: `Internal error: ${err.message}`,
      });
    } catch { /* ignore logging errors */ }

    // Always return 200 to prevent email provider retries
    res.status(200).json({ status: 'failed', error: 'Internal processing error' });
  }
});

module.exports = router;
