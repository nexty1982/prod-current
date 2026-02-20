// server/src/routes/admin/invites.js — Invite user CRUD endpoints
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const { getAppPool } = require('../../config/db');

const requireAdmin = requireRole(['admin', 'super_admin']);

// Valid roles (must match users.role enum in DB)
const VALID_ROLES = ['super_admin', 'admin', 'manager', 'priest', 'moderator', 'user', 'viewer', 'guest', 'readonly_user'];

// Roles that non-super_admin admins cannot invite
const SUPER_ADMIN_ONLY_ROLES = ['super_admin', 'admin'];

// POST /api/admin/invites — Create a new invite
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, role, church_id, expiration_days } = req.body;
    const user = req.session?.user || req.user;

    if (!email || !role || !expiration_days) {
      return res.status(400).json({ success: false, message: 'Email, role, and expiration period are required.' });
    }

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    // Validate expiration_days
    const validDays = [7, 30, 90, 180, 365];
    if (!validDays.includes(Number(expiration_days))) {
      return res.status(400).json({ success: false, message: 'Invalid expiration period.' });
    }

    // Role permission check: non-super_admin can't invite admin/super_admin
    if (SUPER_ADMIN_ONLY_ROLES.includes(role) && user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only super admins can invite admin or super_admin roles.' });
    }

    const pool = getAppPool();

    // Check if email is already a user
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
    }

    // Check if there's already a pending invite for this email
    const [existingInvites] = await pool.query(
      'SELECT id FROM invite_tokens WHERE email = ? AND used_at IS NULL AND expires_at > NOW()',
      [email]
    );
    if (existingInvites.length > 0) {
      return res.status(409).json({ success: false, message: 'A pending invite already exists for this email.' });
    }

    // Generate secure token
    const token = crypto.randomBytes(48).toString('hex');

    // Calculate expiration dates
    const now = new Date();
    const inviteExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // invite link valid for 7 days
    const accountExpiresAt = new Date(now.getTime() + Number(expiration_days) * 24 * 60 * 60 * 1000);

    // Insert invite
    await pool.query(
      `INSERT INTO invite_tokens (token, email, role, church_id, expires_at, account_expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [token, email, role, church_id || null, inviteExpiresAt, accountExpiresAt, user.id]
    );

    const inviteUrl = `https://orthodoxmetrics.com/auth/accept-invite/${token}`;

    // Send invite email (non-blocking)
    try {
      const { sendInviteEmail } = require('../../utils/emailService');
      await sendInviteEmail(email, inviteUrl, role, accountExpiresAt);
    } catch (emailErr) {
      console.error('Failed to send invite email (non-fatal):', emailErr.message);
    }

    res.json({
      success: true,
      message: 'Invite created successfully.',
      invite_url: inviteUrl,
      token
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ success: false, message: 'Failed to create invite.' });
  }
});

// GET /api/admin/invites — List all invites
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    const [invites] = await pool.query(
      `SELECT it.*, u.email AS created_by_email, u.first_name AS created_by_name,
              c.name AS church_name
       FROM invite_tokens it
       LEFT JOIN users u ON it.created_by = u.id
       LEFT JOIN churches c ON it.church_id = c.id
       ORDER BY it.created_at DESC`
    );

    // Add computed status
    const now = new Date();
    const enriched = invites.map(inv => ({
      ...inv,
      status: inv.used_at ? 'used' : (new Date(inv.expires_at) < now ? 'expired' : 'pending')
    }));

    res.json({ success: true, invites: enriched });
  } catch (error) {
    console.error('Error listing invites:', error);
    res.status(500).json({ success: false, message: 'Failed to list invites.' });
  }
});

// DELETE /api/admin/invites/:id — Revoke a pending invite
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    const [result] = await pool.query(
      'DELETE FROM invite_tokens WHERE id = ? AND used_at IS NULL',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Invite not found or already used.' });
    }

    res.json({ success: true, message: 'Invite revoked.' });
  } catch (error) {
    console.error('Error revoking invite:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke invite.' });
  }
});

module.exports = router;
