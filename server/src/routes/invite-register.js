// server/src/routes/invite-register.js — Public invite validation + registration
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getAppPool } = require('../config/db');

// GET /api/invite/:token — Validate invite and return details
router.get('/:token', async (req, res) => {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query(
      `SELECT it.email, it.role, it.church_id, it.expires_at, it.account_expires_at, it.used_at,
              c.name AS church_name
       FROM invite_tokens it
       LEFT JOIN churches c ON it.church_id = c.id
       WHERE it.token = ?`,
      [req.params.token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid invite link.' });
    }

    const invite = rows[0];

    if (invite.used_at) {
      return res.status(410).json({ success: false, message: 'This invite has already been used.' });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This invite has expired.' });
    }

    res.json({
      success: true,
      email: invite.email,
      role: invite.role,
      church_name: invite.church_name,
      account_expires_at: invite.account_expires_at
    });
  } catch (error) {
    console.error('Error validating invite:', error);
    res.status(500).json({ success: false, message: 'Failed to validate invite.' });
  }
});

// POST /api/invite/:token/register — Register with invite
router.post('/:token/register', async (req, res) => {
  try {
    const { first_name, last_name, password, phone } = req.body;

    if (!first_name || !last_name || !password) {
      return res.status(400).json({ success: false, message: 'First name, last name, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const pool = getAppPool();

    // Re-validate the token
    const [rows] = await pool.query(
      `SELECT * FROM invite_tokens WHERE token = ?`,
      [req.params.token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid invite link.' });
    }

    const invite = rows[0];

    if (invite.used_at) {
      return res.status(410).json({ success: false, message: 'This invite has already been used.' });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This invite has expired.' });
    }

    // Check email not already taken (race condition guard)
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [invite.email]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [insertResult] = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, church_id, phone, is_active, account_expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
      [invite.email, hashedPassword, first_name, last_name, invite.role, invite.church_id, phone || null, invite.account_expires_at]
    );

    // Mark token as used
    await pool.query(
      'UPDATE invite_tokens SET used_at = NOW() WHERE id = ?',
      [invite.id]
    );

    console.log(`User registered via invite: ${invite.email} as ${invite.role} (user ID: ${insertResult.insertId})`);

    res.json({
      success: true,
      message: 'Account created successfully. You can now log in.'
    });
  } catch (error) {
    console.error('Error registering with invite:', error);
    res.status(500).json({ success: false, message: 'Failed to create account.' });
  }
});

module.exports = router;
