/**
 * Church Onboarding Pipeline — Extended API
 *
 * Adds record requirements, sample templates, email workflow, and activity logging
 * to the existing CRM/church-lifecycle system.
 *
 * Mounted at /api/admin/onboarding-pipeline
 */

const express = require('express');
const router = express.Router();
const { getAppPool } = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth');

const ADMIN_ROLES = ['super_admin', 'admin'];

// Helper: get current user ID from session or JWT
function getUserId(req) {
  return req.session?.user?.id || req.user?.userId || null;
}

// Helper: log onboarding activity
async function logActivity(pool, onboardingId, activityType, summary, actorUserId, details = null) {
  await pool.query(
    `INSERT INTO onboarding_activity_log (onboarding_id, activity_type, actor_user_id, summary, details_json)
     VALUES (?, ?, ?, ?, ?)`,
    [onboardingId, activityType, actorUserId, summary, details ? JSON.stringify(details) : null]
  );
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE LIST — extended onboarding pipeline view
// ═══════════════════════════════════════════════════════════════

router.get('/list', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const { search, status, assigned, jurisdiction, custom_required, provisioning } = req.query;

    let conditions = [];
    let params = [];

    if (search) {
      conditions.push('(uc.name LIKE ? OR uc.city LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      conditions.push('uc.pipeline_stage = ?');
      params.push(status);
    }
    if (assigned) {
      conditions.push('uc.assigned_to_user_id = ?');
      params.push(parseInt(assigned));
    }
    if (jurisdiction) {
      conditions.push('uc.jurisdiction_id = ?');
      params.push(parseInt(jurisdiction));
    }
    if (custom_required === '1') {
      conditions.push('uc.custom_structure_required = 1');
    }
    if (provisioning === 'ready') {
      conditions.push('uc.provisioning_ready = 1 AND uc.provisioning_completed = 0');
    }
    if (provisioning === 'completed') {
      conditions.push('uc.provisioning_completed = 1');
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await pool.query(`
      SELECT
        uc.id,
        uc.name,
        uc.city,
        uc.state_code,
        uc.phone,
        uc.website,
        uc.pipeline_stage,
        uc.priority,
        uc.is_client,
        uc.provisioned_church_id,
        uc.last_contacted_at,
        uc.next_follow_up,
        uc.jurisdiction,
        uc.jurisdiction_id,
        uc.current_records_situation,
        uc.estimated_volume,
        uc.custom_structure_required,
        uc.provisioning_ready,
        uc.provisioning_completed,
        uc.activation_date,
        uc.assigned_to_user_id,
        uc.created_at,
        ps.label AS stage_label,
        ps.color AS stage_color,
        ps.sort_order AS stage_order,
        j.name AS jurisdiction_name,
        assigned.email AS assigned_to_email,
        assigned.full_name AS assigned_to_name,
        (SELECT COUNT(*) FROM crm_contacts cc WHERE cc.church_id = uc.id) AS contact_count,
        (SELECT COUNT(*) FROM onboarding_emails oe WHERE oe.onboarding_id = uc.id) AS email_count,
        (SELECT MAX(oal.created_at) FROM onboarding_activity_log oal WHERE oal.onboarding_id = uc.id) AS last_activity
      FROM us_churches uc
      LEFT JOIN crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
      LEFT JOIN jurisdictions j ON uc.jurisdiction_id = j.id
      LEFT JOIN users assigned ON uc.assigned_to_user_id = assigned.id
      ${where}
      ORDER BY ps.sort_order ASC, uc.name ASC
    `, params);

    res.json({ success: true, churches: rows });
  } catch (err) {
    console.error('Onboarding pipeline list error:', err);
    res.status(500).json({ success: false, error: 'Failed to load pipeline' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DETAIL — full onboarding detail for a CRM church
// ═══════════════════════════════════════════════════════════════

router.get('/:id/detail', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    // Church (CRM lead) data
    const [churches] = await pool.query(`
      SELECT uc.*, ps.label AS stage_label, ps.color AS stage_color,
             j.name AS jurisdiction_name,
             assigned.email AS assigned_to_email, assigned.full_name AS assigned_to_name
      FROM us_churches uc
      LEFT JOIN crm_pipeline_stages ps ON uc.pipeline_stage = ps.stage_key
      LEFT JOIN jurisdictions j ON uc.jurisdiction_id = j.id
      LEFT JOIN users assigned ON uc.assigned_to_user_id = assigned.id
      WHERE uc.id = ?
    `, [id]);

    if (!churches.length) return res.status(404).json({ error: 'Church not found' });
    const church = churches[0];

    // Contacts
    const [contacts] = await pool.query(
      'SELECT * FROM crm_contacts WHERE church_id = ? ORDER BY is_primary DESC, first_name', [id]
    );

    // Record requirements
    const [requirements] = await pool.query(`
      SELECT orr.*, srt.name AS template_name, srt.code AS template_code
      FROM onboarding_record_requirements orr
      LEFT JOIN sample_record_templates srt ON orr.sample_template_id = srt.id
      WHERE orr.onboarding_id = ?
      ORDER BY orr.record_type
    `, [id]);

    // Emails
    const [emails] = await pool.query(`
      SELECT oe.*, u.email AS creator_email, u.full_name AS creator_name
      FROM onboarding_emails oe
      LEFT JOIN users u ON oe.created_by = u.id
      WHERE oe.onboarding_id = ?
      ORDER BY oe.created_at DESC
    `, [id]);

    // Activity log
    const [activities] = await pool.query(`
      SELECT oal.*, u.email AS actor_email, u.full_name AS actor_name
      FROM onboarding_activity_log oal
      LEFT JOIN users u ON oal.actor_user_id = u.id
      WHERE oal.onboarding_id = ?
      ORDER BY oal.created_at DESC
      LIMIT 100
    `, [id]);

    // CRM follow-ups
    const [followUps] = await pool.query(
      'SELECT * FROM crm_follow_ups WHERE church_id = ? ORDER BY due_date ASC', [id]
    );

    // Provisioning data (if provisioned)
    let provisionedChurch = null;
    let members = [];
    let tokens = [];
    if (church.provisioned_church_id) {
      const [pRows] = await pool.query('SELECT * FROM churches WHERE id = ?', [church.provisioned_church_id]);
      if (pRows.length) provisionedChurch = pRows[0];
      const [m] = await pool.query(
        'SELECT id, email, first_name, last_name, full_name, role, is_locked, created_at FROM users WHERE church_id = ? ORDER BY created_at DESC',
        [church.provisioned_church_id]
      );
      members = m;
      const [t] = await pool.query(
        'SELECT crt.*, u.email AS created_by_email FROM church_registration_tokens crt LEFT JOIN users u ON crt.created_by = u.id WHERE crt.church_id = ? ORDER BY crt.created_at DESC',
        [church.provisioned_church_id]
      );
      tokens = t;
    }

    // Derive checklist
    const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
    const checklist = {
      contact_complete: !!(primaryContact?.email && primaryContact?.first_name),
      record_requirements_set: requirements.length > 0,
      templates_or_custom: requirements.some(r => r.uses_sample || r.custom_required),
      internal_review_done: church.provisioning_ready === 1,
      provisioning_email_sent: emails.some(e => e.email_type === 'provisioned' && e.status !== 'draft'),
      response_received: emails.some(e => e.status === 'replied' || e.status === 'completed'),
      account_created: !!church.provisioned_church_id,
      invite_sent: tokens.length > 0,
      activated: !!church.activation_date || (provisionedChurch && provisionedChurch.setup_complete === 1),
    };

    res.json({
      success: true,
      church,
      contacts,
      requirements,
      emails,
      activities,
      followUps,
      provisionedChurch,
      members,
      tokens,
      checklist,
    });
  } catch (err) {
    console.error('Onboarding detail error:', err);
    res.status(500).json({ success: false, error: 'Failed to load detail' });
  }
});

// ═══════════════════════════════════════════════════════════════
// UPDATE — update onboarding fields on CRM church
// ═══════════════════════════════════════════════════════════════

router.put('/:id', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const allowedFields = [
      'current_records_situation', 'estimated_volume', 'historical_import_needed',
      'ocr_assistance_needed', 'public_records_needed', 'desired_launch_timeline',
      'custom_structure_required', 'provisioning_ready', 'provisioning_completed',
      'activation_date', 'assigned_to_user_id', 'discovery_notes', 'blockers',
      'pipeline_stage', 'priority', 'crm_notes'
    ];

    const updates = [];
    const params = [];
    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        params.push(value === '' ? null : value);
      }
    }

    if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

    params.push(id);
    await pool.query(`UPDATE us_churches SET ${updates.join(', ')} WHERE id = ?`, params);

    // Log activity
    await logActivity(pool, id, 'update', 'Onboarding record updated', getUserId(req), { fields: Object.keys(req.body).filter(k => allowedFields.includes(k)) });

    res.json({ success: true });
  } catch (err) {
    console.error('Onboarding update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update' });
  }
});

// ═══════════════════════════════════════════════════════════════
// SAMPLE TEMPLATES
// ═══════════════════════════════════════════════════════════════

router.get('/templates', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const [templates] = await pool.query(
      'SELECT * FROM sample_record_templates WHERE is_active = 1 ORDER BY record_type, sort_order'
    );
    // Parse fields_json
    const parsed = templates.map(t => ({
      ...t,
      fields: typeof t.fields_json === 'string' ? JSON.parse(t.fields_json) : t.fields_json,
    }));
    res.json({ success: true, templates: parsed });
  } catch (err) {
    console.error('Templates error:', err);
    res.status(500).json({ success: false, error: 'Failed to load templates' });
  }
});

// ═══════════════════════════════════════════════════════════════
// RECORD REQUIREMENTS — manage per-record-type decisions
// ═══════════════════════════════════════════════════════════════

router.get('/:id/requirements', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const id = parseInt(req.params.id);
    const [rows] = await pool.query(`
      SELECT orr.*, srt.name AS template_name, srt.code AS template_code
      FROM onboarding_record_requirements orr
      LEFT JOIN sample_record_templates srt ON orr.sample_template_id = srt.id
      WHERE orr.onboarding_id = ?
      ORDER BY orr.record_type
    `, [id]);
    res.json({ success: true, requirements: rows });
  } catch (err) {
    console.error('Requirements error:', err);
    res.status(500).json({ success: false, error: 'Failed to load requirements' });
  }
});

router.post('/:id/requirements', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const onboardingId = parseInt(req.params.id);
    const { record_type, uses_sample, sample_template_id, custom_required, custom_notes, review_required } = req.body;

    if (!record_type) return res.status(400).json({ error: 'record_type is required' });

    // Upsert: delete existing for this type, insert new
    await pool.query(
      'DELETE FROM onboarding_record_requirements WHERE onboarding_id = ? AND record_type = ?',
      [onboardingId, record_type]
    );

    const [result] = await pool.query(
      `INSERT INTO onboarding_record_requirements
       (onboarding_id, record_type, uses_sample, sample_template_id, custom_required, custom_notes, review_required)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [onboardingId, record_type, uses_sample ? 1 : 0, sample_template_id || null,
       custom_required ? 1 : 0, custom_notes || null, review_required ? 1 : 0]
    );

    // Update custom_structure_required flag on parent
    const [allReqs] = await pool.query(
      'SELECT custom_required FROM onboarding_record_requirements WHERE onboarding_id = ?', [onboardingId]
    );
    const hasCustom = allReqs.some(r => r.custom_required);
    await pool.query('UPDATE us_churches SET custom_structure_required = ? WHERE id = ?', [hasCustom ? 1 : 0, onboardingId]);

    await logActivity(pool, onboardingId, 'requirement', `Record requirement set: ${record_type}`, getUserId(req), {
      record_type, uses_sample, custom_required
    });

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Requirement save error:', err);
    res.status(500).json({ success: false, error: 'Failed to save requirement' });
  }
});

router.delete('/:id/requirements/:reqId', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    await pool.query('DELETE FROM onboarding_record_requirements WHERE id = ? AND onboarding_id = ?',
      [parseInt(req.params.reqId), parseInt(req.params.id)]);
    await logActivity(pool, parseInt(req.params.id), 'requirement_removed', 'Record requirement removed', getUserId(req));
    res.json({ success: true });
  } catch (err) {
    console.error('Requirement delete error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete requirement' });
  }
});

// ═══════════════════════════════════════════════════════════════
// EMAILS — formal email workflow
// ═══════════════════════════════════════════════════════════════

const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Welcome to OrthodoxMetrics — Next Steps for {church_name}',
    body: `Dear {contact_name},

Thank you for your interest in OrthodoxMetrics. We are pleased to begin the onboarding process for {church_name}.

OrthodoxMetrics provides comprehensive tools for managing your parish's sacramental records, including baptisms, marriages, funerals, and chrismations, with support for multiple languages and OCR digitization of historical ledgers.

Next steps:
1. We will review your record-keeping requirements
2. You will select or customize your record structure templates
3. We will provision your church account and send you a registration link
4. Your parish staff can begin entering and managing records

If you have any questions or would like to schedule a call to discuss your needs, please reply to this email.

With respect,
OrthodoxMetrics Team`
  },
  info_request: {
    subject: 'Information Needed — {church_name} Onboarding',
    body: `Dear {contact_name},

To proceed with setting up {church_name} on OrthodoxMetrics, we need the following information:

1. Which types of sacramental records do you maintain? (Baptisms, Marriages, Funerals, Chrismations)
2. Approximately how many historical records would you like to digitize?
3. Do you currently use paper books, spreadsheets, or another software system?
4. Are there any specific fields or formats unique to your parish records?
5. Would you like assistance with OCR scanning of historical ledgers?

Please reply with this information at your convenience, and we will configure your account accordingly.

With respect,
OrthodoxMetrics Team`
  },
  template_confirm: {
    subject: 'Record Structure Confirmed — {church_name}',
    body: `Dear {contact_name},

We have confirmed the record structure templates for {church_name}. Your account will be configured with the selected standard templates, which you can further customize after setup.

We will proceed with provisioning your account and will send you a registration link shortly.

If you have any questions about the selected record structures, please do not hesitate to reach out.

With respect,
OrthodoxMetrics Team`
  },
  custom_review: {
    subject: 'Custom Record Structure Review — {church_name}',
    body: `Dear {contact_name},

Thank you for providing details about your parish's custom record-keeping requirements for {church_name}.

Our team is reviewing the custom structure you have described to ensure your OrthodoxMetrics account accurately reflects your existing record formats. We may reach out with follow-up questions.

Once the review is complete, we will proceed with provisioning your account.

With respect,
OrthodoxMetrics Team`
  },
  provisioned: {
    subject: 'Your OrthodoxMetrics Account Is Ready — {church_name}',
    body: `Dear {contact_name},

We are pleased to inform you that your OrthodoxMetrics account for {church_name} has been provisioned and is ready for use.

To get started:
1. Click the registration link below to create your admin account
2. Complete the initial setup wizard
3. Invite additional parish staff as needed

Registration Link: {registration_url}

If you have any questions or need assistance during setup, please reply to this email.

With respect,
OrthodoxMetrics Team`
  },
  reminder: {
    subject: 'Follow-Up — {church_name} Onboarding',
    body: `Dear {contact_name},

We wanted to follow up on the onboarding process for {church_name} with OrthodoxMetrics.

{custom_message}

Please let us know if you have any questions or if there is anything we can help with to move forward.

With respect,
OrthodoxMetrics Team`
  }
};

router.get('/email-templates', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  res.json({
    success: true,
    templates: Object.entries(EMAIL_TEMPLATES).map(([key, val]) => ({
      type: key,
      subject: val.subject,
      body: val.body,
    }))
  });
});

router.get('/:id/emails', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const id = parseInt(req.params.id);
    const [rows] = await pool.query(`
      SELECT oe.*, u.email AS creator_email, u.full_name AS creator_name
      FROM onboarding_emails oe
      LEFT JOIN users u ON oe.created_by = u.id
      WHERE oe.onboarding_id = ?
      ORDER BY oe.created_at DESC
    `, [id]);
    res.json({ success: true, emails: rows });
  } catch (err) {
    console.error('Emails list error:', err);
    res.status(500).json({ success: false, error: 'Failed to load emails' });
  }
});

router.post('/:id/emails', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const onboardingId = parseInt(req.params.id);
    const { email_type, subject, recipients, cc, body, status, notes } = req.body;

    if (!email_type || !subject || !recipients || !body) {
      return res.status(400).json({ error: 'email_type, subject, recipients, and body are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO onboarding_emails (onboarding_id, email_type, subject, recipients, cc, body, status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [onboardingId, email_type, subject, recipients, cc || null, body, status || 'draft', notes || null, getUserId(req)]
    );

    await logActivity(pool, onboardingId, 'email_created', `Email drafted: ${email_type} — ${subject}`, getUserId(req), {
      email_id: result.insertId, email_type, status: status || 'draft'
    });

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Email create error:', err);
    res.status(500).json({ success: false, error: 'Failed to create email' });
  }
});

router.put('/:id/emails/:emailId', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const onboardingId = parseInt(req.params.id);
    const emailId = parseInt(req.params.emailId);
    const { subject, recipients, cc, body, status, notes, sent_at, replied_at } = req.body;

    const updates = [];
    const params = [];

    if (subject !== undefined) { updates.push('subject = ?'); params.push(subject); }
    if (recipients !== undefined) { updates.push('recipients = ?'); params.push(recipients); }
    if (cc !== undefined) { updates.push('cc = ?'); params.push(cc || null); }
    if (body !== undefined) { updates.push('body = ?'); params.push(body); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes || null); }
    if (sent_at !== undefined) { updates.push('sent_at = ?'); params.push(sent_at); }
    if (replied_at !== undefined) { updates.push('replied_at = ?'); params.push(replied_at); }

    if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

    params.push(emailId, onboardingId);
    await pool.query(`UPDATE onboarding_emails SET ${updates.join(', ')} WHERE id = ? AND onboarding_id = ?`, params);

    if (status) {
      await logActivity(pool, onboardingId, 'email_status', `Email status changed to: ${status}`, getUserId(req), {
        email_id: emailId, status
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Email update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update email' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ═══════════════════════════════════════════════════════════════

router.get('/:id/activities', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const id = parseInt(req.params.id);
    const [rows] = await pool.query(`
      SELECT oal.*, u.email AS actor_email, u.full_name AS actor_name
      FROM onboarding_activity_log oal
      LEFT JOIN users u ON oal.actor_user_id = u.id
      WHERE oal.onboarding_id = ?
      ORDER BY oal.created_at DESC
      LIMIT 200
    `, [id]);
    res.json({ success: true, activities: rows });
  } catch (err) {
    console.error('Activities error:', err);
    res.status(500).json({ success: false, error: 'Failed to load activities' });
  }
});

router.post('/:id/activities', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const onboardingId = parseInt(req.params.id);
    const { activity_type, summary, details } = req.body;

    if (!activity_type || !summary) {
      return res.status(400).json({ error: 'activity_type and summary are required' });
    }

    await logActivity(pool, onboardingId, activity_type, summary, getUserId(req), details);
    res.json({ success: true });
  } catch (err) {
    console.error('Activity log error:', err);
    res.status(500).json({ success: false, error: 'Failed to log activity' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PROVISIONING READINESS
// ═══════════════════════════════════════════════════════════════

router.post('/:id/mark-ready', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const id = parseInt(req.params.id);
    await pool.query('UPDATE us_churches SET provisioning_ready = 1 WHERE id = ?', [id]);
    await logActivity(pool, id, 'provisioning_ready', 'Marked ready for provisioning', getUserId(req));
    res.json({ success: true });
  } catch (err) {
    console.error('Mark ready error:', err);
    res.status(500).json({ success: false, error: 'Failed to mark ready' });
  }
});

router.post('/:id/mark-active', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();
    const id = parseInt(req.params.id);
    const now = new Date().toISOString().split('T')[0];
    await pool.query(
      'UPDATE us_churches SET provisioning_completed = 1, activation_date = ?, pipeline_stage = ? WHERE id = ?',
      [now, 'active', id]
    );
    await logActivity(pool, id, 'activated', 'Church marked as active', getUserId(req));
    res.json({ success: true });
  } catch (err) {
    console.error('Mark active error:', err);
    res.status(500).json({ success: false, error: 'Failed to mark active' });
  }
});

module.exports = router;
