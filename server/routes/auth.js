// server/routes/auth.js - Unified and Secure Auth Route Implementation
const express = require('express');
const bcrypt = require('bcrypt');
const { promisePool } = require('../config/db');
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

    // Regenerate session ID for security
    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) {
          console.error('❌ Session regeneration failed:', err);
          reject(err);
        } else {
          console.log('✅ Session regenerated successfully');
          resolve();
        }
      });
    });

    // Set session data after regeneration
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

    // Save session to store
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save failed:', err);
          reject(err);
        } else {
          console.log('✅ Session saved successfully');
          resolve();
        }
      });
    });

    console.log('✅ Login successful for user:', req.session.user.email);
    console.log('✅ New Session ID:', req.sessionID);

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
          role: req.session.user.role
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

module.exports = router;
