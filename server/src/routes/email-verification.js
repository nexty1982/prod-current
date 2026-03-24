/**
 * Email Verification Routes
 * Handles email verification for user registration flows.
 * OM Daily #500
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getAppPool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// POST /api/auth/send-verification - Send verification email
router.post('/send-verification', authMiddleware, async (req, res) => {
  try {
    const pool = getAppPool();
    const userId = req.user?.id || req.session?.user?.id;
    const email = req.body.email || req.user?.email || req.session?.user?.email;

    if (!userId || !email) {
      return res.status(400).json({ success: false, error: 'User ID and email required' });
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Invalidate any existing tokens for this user
    await pool.query(
      'UPDATE email_verifications SET expires_at = NOW() WHERE user_id = ? AND verified_at IS NULL',
      [userId]
    );

    // Create new verification record
    await pool.query(
      'INSERT INTO email_verifications (user_id, email, token, expires_at) VALUES (?, ?, ?, ?)',
      [userId, email, token, expiresAt]
    );

    // TODO: Actually send the email via notification service
    // For now, store the token and return it in dev mode
    const isDev = process.env.NODE_ENV !== 'production';

    res.json({
      success: true,
      message: 'Verification email sent',
      ...(isDev ? { token } : {}), // Only expose token in dev
    });
  } catch (error) {
    console.error('[Email Verification] send error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/verify-email/:token - Verify email with token
router.get('/verify-email/:token', async (req, res) => {
  try {
    const pool = getAppPool();
    const { token } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM email_verifications WHERE token = ? AND verified_at IS NULL AND expires_at > NOW()',
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification token' });
    }

    const verification = rows[0];

    // Mark as verified
    await pool.query('UPDATE email_verifications SET verified_at = NOW() WHERE id = ?', [verification.id]);

    // Update user's email_verified status
    await pool.query('UPDATE users SET email_verified = 1 WHERE id = ?', [verification.user_id]);

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('[Email Verification] verify error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/verification-status - Check current user's verification status
router.get('/verification-status', authMiddleware, async (req, res) => {
  try {
    const pool = getAppPool();
    const userId = req.user?.id || req.session?.user?.id;

    const [rows] = await pool.query(
      'SELECT email_verified FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      verified: rows.length > 0 && rows[0].email_verified === 1,
    });
  } catch (error) {
    console.error('[Email Verification] status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
