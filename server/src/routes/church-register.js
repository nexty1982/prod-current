// server/src/routes/church-register.js — Church token-based self-registration
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const router = express.Router();
const { getAppPool } = require('../config/db');

// POST /api/auth/church-register — Public self-registration with church token
router.post('/church-register', async (req, res) => {
  try {
    const { church_name, registration_token, first_name, last_name, email, password } = req.body;

    // Validate required fields
    if (!church_name || !registration_token || !first_name || !last_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: church name, registration token, first name, last name, email, and password.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    const pool = getAppPool();

    // Look up token and verify church name matches
    const [tokenRows] = await pool.query(
      `SELECT crt.id, crt.church_id, crt.token, c.name AS church_name
       FROM church_registration_tokens crt
       JOIN churches c ON crt.church_id = c.id
       WHERE crt.token = ? AND crt.is_active = 1`,
      [registration_token]
    );

    if (tokenRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration token. Please check with your church administrator.'
      });
    }

    const tokenRecord = tokenRows[0];

    // Verify church name matches (case-insensitive)
    if (tokenRecord.church_name.toLowerCase().trim() !== church_name.toLowerCase().trim()) {
      return res.status(400).json({
        success: false,
        message: 'The church name does not match the registration token. Please verify both fields.'
      });
    }

    // Check if email is already registered
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please sign in or use a different email.'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    const full_name = `${first_name.trim()} ${last_name.trim()}`;

    // Create user — locked by default, pending admin review
    const [result] = await pool.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, full_name,
        role, church_id, is_active, is_locked, locked_at, lockout_reason,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'viewer', ?, 1, 1, NOW(), 'Pending admin review - registered via church token', NOW(), NOW())`,
      [
        email.toLowerCase().trim(),
        password_hash,
        first_name.trim(),
        last_name.trim(),
        full_name,
        tokenRecord.church_id
      ]
    );

    console.log(`✅ Church token registration: ${email} registered for church ${tokenRecord.church_name} (ID: ${tokenRecord.church_id}), user ID: ${result.insertId} — account locked pending review`);

    res.json({
      success: true,
      message: 'Your account has been created successfully. It is currently pending admin review. You will be able to sign in once an administrator activates your account.'
    });
  } catch (error) {
    console.error('❌ Church token registration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again later.'
    });
  }
});

// --- Admin endpoints for managing registration tokens ---

// GET /api/admin/churches/:churchId/registration-token
router.get('/admin/churches/:churchId/registration-token', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) {
      return res.status(400).json({ success: false, message: 'Invalid church ID' });
    }

    const pool = getAppPool();
    const [rows] = await pool.query(
      `SELECT crt.id, crt.token, crt.is_active, crt.created_at, c.name AS church_name
       FROM church_registration_tokens crt
       JOIN churches c ON crt.church_id = c.id
       WHERE crt.church_id = ? AND crt.is_active = 1
       ORDER BY crt.created_at DESC LIMIT 1`,
      [churchId]
    );

    if (rows.length === 0) {
      return res.json({ success: true, token: null, message: 'No active registration token for this church.' });
    }

    res.json({ success: true, token: rows[0] });
  } catch (error) {
    console.error('❌ Failed to get registration token:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve registration token.' });
  }
});

// POST /api/admin/churches/:churchId/registration-token — Generate new token
router.post('/admin/churches/:churchId/registration-token', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const currentUser = req.user || req.session?.user;

    if (isNaN(churchId)) {
      return res.status(400).json({ success: false, message: 'Invalid church ID' });
    }

    const pool = getAppPool();

    // Verify church exists
    const [churches] = await pool.query('SELECT id, name FROM churches WHERE id = ?', [churchId]);
    if (churches.length === 0) {
      return res.status(404).json({ success: false, message: 'Church not found.' });
    }

    // Deactivate any existing tokens for this church
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

    console.log(`✅ Registration token generated for church ${churches[0].name} (ID: ${churchId})`);

    res.json({
      success: true,
      token: token,
      church_name: churches[0].name,
      message: `Registration token generated for ${churches[0].name}.`
    });
  } catch (error) {
    console.error('❌ Failed to generate registration token:', error);
    res.status(500).json({ success: false, message: 'Failed to generate registration token.' });
  }
});

// DELETE /api/admin/churches/:churchId/registration-token — Deactivate token
router.delete('/admin/churches/:churchId/registration-token', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (isNaN(churchId)) {
      return res.status(400).json({ success: false, message: 'Invalid church ID' });
    }

    const pool = getAppPool();
    await pool.query(
      'UPDATE church_registration_tokens SET is_active = 0 WHERE church_id = ?',
      [churchId]
    );

    console.log(`🔒 Registration token deactivated for church ID: ${churchId}`);

    res.json({ success: true, message: 'Registration token has been deactivated.' });
  } catch (error) {
    console.error('❌ Failed to deactivate registration token:', error);
    res.status(500).json({ success: false, message: 'Failed to deactivate registration token.' });
  }
});

module.exports = router;
