// server/routes/auth.js - Unified and Secure Auth Route Implementation
const express = require('express');
const bcrypt = require('bcrypt');
const { promisePool } = require('../config/db');
const { SessionManager } = require('../config/session');
const router = express.Router();

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const loginEmail = email || username;

    console.log('🔑 Login attempt for:', loginEmail);
    console.log('🔑 Session ID before login:', req.sessionID);

    if (!loginEmail || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    if (req.session.user) {
      console.log('🔄 Clearing existing session for user:', req.session.user.email);
      // Clear session data but don't destroy the session object
      req.session.user = null;
      req.session.loginTime = null;
      req.session.lastActivity = null;
    }

    const [users] = await promisePool.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active, last_login FROM users WHERE email = ? AND is_active = 1',
      [loginEmail]
    );

    if (users.length === 0) {
      console.log('❌ User not found or inactive:', loginEmail);
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = users[0];
    console.log('👤 Found user:', { id: user.id, email: user.email, role: user.role });

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', loginEmail);
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    await promisePool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    if (!req.session) {
      console.error('❌ Session is undefined during login');
      return res.status(500).json({ 
        success: false, 
        message: 'Session middleware is not active',
        code: 'SESSION_ERROR' 
      });
    }

    // Set session data directly (avoid regeneration timing issues)
    req.session.user = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      landing_page: '/dashboards/modern'
    };

    req.session.loginTime = new Date();
    req.session.lastActivity = new Date();

    // 🛡️ Enforce session limits with auto-kick logic
    try {
      await SessionManager.enforceSessionLimits(user.id, user.role, req.sessionID);
    } catch (limitError) {
      console.error('❌ Error enforcing session limits:', limitError);
      // Continue with login even if session limit enforcement fails
    }

    // 🔧 FIXED: Explicitly save session to ensure persistence
    req.session.save(async (saveErr) => {
      if (saveErr) {
        console.error('❌ Error saving session:', saveErr);
        return res.status(500).json({
          error: 'Session save failed',
          code: 'SESSION_SAVE_ERROR'
        });
      }
      
      console.log('✅ Session saved successfully with ID:', req.sessionID);
      console.log('✅ Session user:', req.session.user.email);

      // 🆔 Update session record with user_id for tracking
      try {
        await SessionManager.updateSessionUserId(req.sessionID, user.id);
        console.log('✅ Session user_id updated in database');
      } catch (updateError) {
        console.error('❌ Error updating session user_id:', updateError);
        // Continue - this is not critical for login success
      }

      console.log('✅ Login successful for user:', req.session.user.email);
      console.log('✅ Session ID:', req.sessionID);

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        },
        sessionId: req.sessionID,
        redirectTo: '/dashboards/modern'
      });
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    // Don't destroy session on error - just clear user data
    if (req.session) {
      req.session.user = null;
      req.session.loginTime = null;
      req.session.lastActivity = null;
    }
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/auth/logout - User logout
router.post('/logout', (req, res) => {
  try {
    if (req.session && req.session.user) {
      const userEmail = req.session.user.email;
      console.log('🔑 Logout attempt for:', userEmail);
      
      req.session.destroy((err) => {
        if (err) {
          console.error('❌ Logout error:', err);
          return res.status(500).json({
            error: 'Logout failed',
            code: 'LOGOUT_ERROR'
          });
        }
        
        console.log('✅ Logout successful for user:', userEmail);
        res.json({
          success: true,
          message: 'Logout successful'
        });
      });
    } else {
      res.json({
        success: true,
        message: 'Already logged out'
      });
    }
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// GET /api/auth/check - Check authentication status
router.get('/check', (req, res) => {
  try {
    if (req.session && req.session.user) {
      // Update last activity
      req.session.lastActivity = new Date();
      
      res.json({
        authenticated: true,
        user: {
          id: req.session.user.id,
          email: req.session.user.email,
          first_name: req.session.user.first_name,
          last_name: req.session.user.last_name,
          role: req.session.user.role,
          preferred_language: req.session.user.preferred_language,
          timezone: req.session.user.timezone
        },
        sessionId: req.sessionID,
        lastActivity: req.session.lastActivity
      });
    } else {
      res.status(401).json({
        authenticated: false,
        message: 'Not authenticated'
      });
    }
  } catch (error) {
    console.error('❌ Auth check error:', error);
    res.status(500).json({
      authenticated: false,
      message: 'Authentication check failed',
      code: 'AUTH_CHECK_ERROR'
    });
  }
});

// GET /api/auth/status - Authentication status endpoint
router.get('/status', (req, res) => {
  res.status(200).json({
    authenticated: !!req.session?.user,
    user: req.session?.user || null
  });
});

// PUT /api/auth/profile - Update user profile information
router.put('/profile', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const userId = req.session.user.id;
    const { first_name, last_name, email, preferred_language, timezone } = req.body;

    console.log('📝 Updating profile for user:', userId, req.body);

    // Validate input
    if (!first_name || !last_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and email are required'
      });
    }

    // Check if email is already taken by another user
    if (email !== req.session.user.email) {
      const [existingUsers] = await promisePool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email address is already in use'
        });
      }
    }

    // Update user data
    await promisePool.query(
      `UPDATE users SET 
        first_name = ?, 
        last_name = ?, 
        email = ?, 
        preferred_language = ?, 
        timezone = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [first_name, last_name, email, preferred_language || 'en', timezone || 'UTC', userId]
    );

    // Update session data
    req.session.user = {
      ...req.session.user,
      first_name,
      last_name,
      email,
      preferred_language: preferred_language || 'en',
      timezone: timezone || 'UTC'
    };

    console.log('✅ Profile updated successfully for user:', userId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: req.session.user
    });

  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
});

// PUT /api/auth/password - Change user password
router.put('/password', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const userId = req.session.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    console.log('🔐 Password change request for user:', userId);

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and confirmation are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get current password hash
    const [users] = await promisePool.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await promisePool.query(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, userId]
    );

    console.log('✅ Password updated successfully for user:', userId);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('❌ Password update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update password',
      code: 'PASSWORD_UPDATE_ERROR'
    });
  }
});

// Clear broken session endpoint
router.get('/clear-session', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Failed to destroy session:', err);
        return res.status(500).json({ error: 'Failed to clear session' });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Session cleared' });
    });
  } else {
    res.json({ success: true, message: 'No session to clear' });
  }
});

module.exports = router;
