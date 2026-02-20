// server/src/api/impersonate.js — Super Admin "Login As" impersonation
const express = require('express');
const { getAppPool } = require('../config/db');

const router = express.Router();

// POST / — Start impersonation (super_admin only)
router.post('/', async (req, res) => {
  try {
    const currentUser = req.session?.user;
    if (!currentUser || currentUser.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only super_admin can impersonate users' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Prevent impersonating yourself
    if (Number(userId) === Number(currentUser.id)) {
      return res.status(400).json({ error: 'Cannot impersonate yourself' });
    }

    // Fetch target user
    const pool = getAppPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.church_id, u.is_active,
              u.preferred_language, u.timezone, u.avatar_url,
              c.name AS church_name
       FROM users u
       LEFT JOIN churches c ON u.church_id = c.id
       WHERE u.id = ?`,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = rows[0];

    if (!targetUser.is_active) {
      return res.status(400).json({ error: 'Cannot impersonate an inactive user' });
    }

    // Store original admin info before overwriting
    req.session.originalAdmin = {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
      church_id: currentUser.church_id,
      first_name: currentUser.first_name,
      last_name: currentUser.last_name,
      preferred_language: currentUser.preferred_language,
      timezone: currentUser.timezone,
      avatar_url: currentUser.avatar_url
    };

    // Swap session user to target
    req.session.user = {
      id: targetUser.id,
      email: targetUser.email,
      first_name: targetUser.first_name,
      last_name: targetUser.last_name,
      role: targetUser.role,
      church_id: targetUser.church_id,
      church_name: targetUser.church_name,
      preferred_language: targetUser.preferred_language,
      timezone: targetUser.timezone,
      avatar_url: targetUser.avatar_url,
      is_active: targetUser.is_active
    };

    console.log(`🎭 Impersonation: ${currentUser.email} → ${targetUser.email}`);

    req.session.save((err) => {
      if (err) {
        console.error('Failed to save session during impersonation:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      res.json({ success: true, user: req.session.user });
    });
  } catch (err) {
    console.error('Impersonation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /return — End impersonation, restore original admin session
router.post('/return', async (req, res) => {
  try {
    const originalAdmin = req.session?.originalAdmin;
    if (!originalAdmin) {
      return res.status(400).json({ error: 'Not currently impersonating anyone' });
    }

    // Restore original admin session
    req.session.user = { ...originalAdmin };
    delete req.session.originalAdmin;

    console.log(`🎭 Impersonation ended: restored ${originalAdmin.email}`);

    req.session.save((err) => {
      if (err) {
        console.error('Failed to save session during return:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      res.json({ success: true, user: req.session.user });
    });
  } catch (err) {
    console.error('Return from impersonation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /status — Check if currently impersonating
router.get('/status', (req, res) => {
  if (!req.session?.user) {
    return res.json({ impersonating: false, originalAdmin: null, currentUser: null });
  }
  const originalAdmin = req.session.originalAdmin;
  res.json({
    impersonating: !!originalAdmin,
    originalAdmin: originalAdmin ? { email: originalAdmin.email } : null,
    currentUser: { email: req.session.user.email }
  });
});

module.exports = router;
