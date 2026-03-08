// server/src/routes/admin/church-onboarding.js — Church onboarding pipeline (Phase 2)
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getAppPool } = require('../../config/db');
const { requireRole } = require('../../middleware/auth');

const ADMIN_ROLES = ['super_admin', 'admin'];

// GET /api/admin/church-onboarding/pipeline — All churches with onboarding status
router.get('/pipeline', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();

    const [churches] = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.is_active,
        c.setup_complete,
        c.created_at,
        COALESCE(tok.active_token_count, 0)   AS active_tokens,
        COALESCE(usr.total_users, 0)           AS total_users,
        COALESCE(usr.active_users, 0)          AS active_users,
        COALESCE(usr.pending_users, 0)         AS pending_users
      FROM churches c
      LEFT JOIN (
        SELECT church_id, COUNT(*) AS active_token_count
        FROM church_registration_tokens
        WHERE is_active = 1
        GROUP BY church_id
      ) tok ON tok.church_id = c.id
      LEFT JOIN (
        SELECT
          church_id,
          COUNT(*)                                              AS total_users,
          SUM(CASE WHEN is_locked = 0 THEN 1 ELSE 0 END)      AS active_users,
          SUM(CASE WHEN is_locked = 1 THEN 1 ELSE 0 END)      AS pending_users
        FROM users
        WHERE church_id IS NOT NULL
        GROUP BY church_id
      ) usr ON usr.church_id = c.id
      ORDER BY c.created_at DESC
    `);

    // Derive onboarding_stage for each church
    const pipeline = churches.map(ch => {
      let onboarding_stage;
      if (ch.setup_complete === 1) {
        onboarding_stage = 'setup_complete';
      } else if (ch.active_users > 0) {
        onboarding_stage = 'active';
      } else if (ch.pending_users > 0) {
        onboarding_stage = 'members_joining';
      } else if (ch.active_tokens > 0) {
        onboarding_stage = 'token_issued';
      } else {
        onboarding_stage = 'new';
      }

      return {
        id: ch.id,
        name: ch.name,
        is_active: ch.is_active,
        setup_complete: ch.setup_complete,
        created_at: ch.created_at,
        active_token_count: ch.active_tokens,
        total_users: ch.total_users,
        active_users: ch.active_users,
        pending_users: ch.pending_users,
        onboarding_stage
      };
    });

    res.json({ success: true, churches: pipeline });
  } catch (error) {
    console.error('Failed to load onboarding pipeline:', error);
    res.status(500).json({ success: false, message: 'Failed to load onboarding pipeline.' });
  }
});

// GET /api/admin/church-onboarding/tokens — All tokens across all churches
router.get('/tokens', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pool = getAppPool();

    const [tokens] = await pool.query(`
      SELECT
        crt.id,
        crt.church_id,
        c.name          AS church_name,
        crt.token,
        crt.is_active,
        crt.created_at,
        creator.email   AS created_by_email,
        COALESCE(usage.usage_count, 0) AS usage_count
      FROM church_registration_tokens crt
      JOIN churches c ON crt.church_id = c.id
      LEFT JOIN users creator ON crt.created_by = creator.id
      LEFT JOIN (
        SELECT church_id, COUNT(*) AS usage_count
        FROM users
        WHERE lockout_reason LIKE '%church token%'
        GROUP BY church_id
      ) usage ON usage.church_id = crt.church_id
      ORDER BY crt.created_at DESC
    `);

    res.json({ success: true, tokens });
  } catch (error) {
    console.error('Failed to load onboarding tokens:', error);
    res.status(500).json({ success: false, message: 'Failed to load onboarding tokens.' });
  }
});

// POST /api/admin/church-onboarding/:churchId/send-token — Generate token + registration URL
router.post('/:churchId/send-token', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const currentUser = req.user || req.session?.user;

    if (isNaN(churchId)) {
      return res.status(400).json({ success: false, message: 'Invalid church ID.' });
    }

    const pool = getAppPool();

    // Verify church exists
    const [churches] = await pool.query('SELECT id, name FROM churches WHERE id = ?', [churchId]);
    if (churches.length === 0) {
      return res.status(404).json({ success: false, message: 'Church not found.' });
    }

    const church = churches[0];

    // Deactivate existing active tokens for this church
    await pool.query(
      'UPDATE church_registration_tokens SET is_active = 0 WHERE church_id = ?',
      [churchId]
    );

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      'INSERT INTO church_registration_tokens (church_id, token, created_by) VALUES (?, ?, ?)',
      [churchId, token, currentUser?.id || 0]
    );

    // Build registration URL
    const encodedChurchName = encodeURIComponent(church.name);
    const registrationUrl = `https://orthodoxmetrics.com/auth/register?token=${token}&church=${encodedChurchName}`;

    console.log(`Registration token generated for church ${church.name} (ID: ${churchId}) with URL`);

    res.json({
      success: true,
      token,
      church_id: churchId,
      church_name: church.name,
      registration_url: registrationUrl,
      message: `Registration token generated for ${church.name}.`
    });
  } catch (error) {
    console.error('Failed to generate registration token:', error);
    res.status(500).json({ success: false, message: 'Failed to generate registration token.' });
  }
});

// ---------------------------------------------------------------------------
// Phase 3 endpoints
// ---------------------------------------------------------------------------

// GET /api/admin/church-onboarding/:churchId/detail — Comprehensive onboarding detail
router.get('/:churchId/detail', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) {
      return res.status(400).json({ success: false, message: 'Invalid church ID.' });
    }

    const pool = getAppPool();

    // Church info
    const [churches] = await pool.query(
      `SELECT id, name, email, phone, address, city, state_province, country,
              jurisdiction, is_active, setup_complete, created_at, website, db_name, notes
       FROM churches WHERE id = ?`,
      [churchId]
    );

    if (churches.length === 0) {
      return res.status(404).json({ success: false, message: 'Church not found.' });
    }

    const church = churches[0];

    // Members (users) for this church
    const [members] = await pool.query(
      `SELECT id, email, first_name, last_name, full_name, role, is_locked, lockout_reason, created_at
       FROM users WHERE church_id = ?
       ORDER BY created_at DESC`,
      [churchId]
    );

    // Tokens for this church (with creator email)
    const [tokens] = await pool.query(
      `SELECT crt.id, crt.token, crt.is_active, crt.created_at, u.email AS created_by
       FROM church_registration_tokens crt
       LEFT JOIN users u ON crt.created_by = u.id
       WHERE crt.church_id = ?
       ORDER BY crt.created_at DESC`,
      [churchId]
    );

    // Derive onboarding_stage
    const activeUsers = members.filter(m => m.is_locked === 0).length;
    const pendingUsers = members.filter(m => m.is_locked === 1).length;
    const activeTokens = tokens.filter(t => t.is_active === 1).length;

    let onboarding_stage;
    if (church.setup_complete === 1) {
      onboarding_stage = 'setup_complete';
    } else if (activeUsers > 0) {
      onboarding_stage = 'active';
    } else if (pendingUsers > 0) {
      onboarding_stage = 'members_joining';
    } else if (activeTokens > 0) {
      onboarding_stage = 'token_issued';
    } else {
      onboarding_stage = 'new';
    }

    // Derive checklist
    const checklist = {
      church_created: true,
      token_issued: tokens.length > 0,
      members_registered: members.length > 0,
      members_active: activeUsers > 0,
      setup_complete: church.setup_complete === 1
    };

    res.json({
      success: true,
      church,
      members,
      tokens,
      onboarding_stage,
      checklist
    });
  } catch (error) {
    console.error('Failed to load church onboarding detail:', error);
    res.status(500).json({ success: false, message: 'Failed to load church onboarding detail.' });
  }
});

// POST /api/admin/church-onboarding/:churchId/toggle-setup — Toggle setup_complete flag
router.post('/:churchId/toggle-setup', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) {
      return res.status(400).json({ success: false, message: 'Invalid church ID.' });
    }

    const pool = getAppPool();

    const [churches] = await pool.query('SELECT id, setup_complete FROM churches WHERE id = ?', [churchId]);
    if (churches.length === 0) {
      return res.status(404).json({ success: false, message: 'Church not found.' });
    }

    const newValue = churches[0].setup_complete === 1 ? 0 : 1;
    await pool.query('UPDATE churches SET setup_complete = ? WHERE id = ?', [newValue, churchId]);

    res.json({ success: true, setup_complete: newValue });
  } catch (error) {
    console.error('Failed to toggle setup_complete:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle setup_complete.' });
  }
});

// POST /api/admin/church-onboarding/:churchId/update-notes — Update church notes
router.post('/:churchId/update-notes', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) {
      return res.status(400).json({ success: false, message: 'Invalid church ID.' });
    }

    const { notes } = req.body;
    if (typeof notes !== 'string') {
      return res.status(400).json({ success: false, message: 'Notes must be a string.' });
    }

    const pool = getAppPool();

    const [churches] = await pool.query('SELECT id FROM churches WHERE id = ?', [churchId]);
    if (churches.length === 0) {
      return res.status(404).json({ success: false, message: 'Church not found.' });
    }

    await pool.query('UPDATE churches SET notes = ? WHERE id = ?', [notes, churchId]);

    res.json({ success: true, notes });
  } catch (error) {
    console.error('Failed to update church notes:', error);
    res.status(500).json({ success: false, message: 'Failed to update church notes.' });
  }
});

module.exports = router;
