// server/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const { promisePool } = require('../config/db');
const router = express.Router();

// GET /api/auth/check - Check current session status
router.get('/check', async (req, res) => {
  console.log('🔍 Auth check - Session user:', req.session?.user);
  console.log('🔍 Auth check - Session ID:', req.sessionID);
  console.log('🔍 Auth check - Session keys:', Object.keys(req.session || {}));

  if (req.session?.user) {
    // Verify user still exists and is active
    try {
      const [users] = await promisePool.query(
        'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = ? AND is_active = 1',
        [req.session.user.id]
      );

      if (users.length > 0) {
        res.json({
          authenticated: true,
          user: {
            id: users[0].id,
            email: users[0].email,
            first_name: users[0].first_name,
            last_name: users[0].last_name,
            role: users[0].role
          }
        });
      } else {
        // User no longer exists or is inactive
        req.session.destroy();
        res.json({ authenticated: false });
      }
    } catch (err) {
      console.error('❌ Error checking user session:', err);
      res.status(500).json({ error: 'Session verification failed' });
    }
  } else {
    res.json({ authenticated: false });
  }
});

// POST /api/auth/sign-in - User login
router.post('/sign-in', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔑 Login attempt for email:', email);
    console.log('🔑 Request headers:', req.headers);
    console.log('🔑 Session before login:', req.session);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Look up user by email in ssppoc_records_db.users
    const [users] = await promisePool.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active, last_login FROM users WHERE email = ? AND is_active = 1',
      [email]
    );

    if (users.length === 0) {
      console.log('❌ User not found or inactive:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    console.log('👤 Found user:', { id: user.id, email: user.email, role: user.role });

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login timestamp
    await promisePool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // Create session
    req.session.user = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      landing_page: '/dashboards/modern'
    };

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({ error: 'Session creation failed' });
      }

      console.log('✅ Login successful for user:', req.session.user);
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
        redirectTo: '/dashboards/modern'
      });
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/auth/login - User login (alias for sign-in to match frontend)
router.post('/login', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Support both email and username fields (frontend might send either)
    const loginEmail = email || username;

    console.log('🔑 Login attempt for email:', loginEmail);
    console.log('🔑 Request headers:', req.headers);
    console.log('🔑 Session before login:', req.session);

    if (!loginEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Look up user by email in ssppoc_records_db.users
    const [users] = await promisePool.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active, last_login FROM users WHERE email = ? AND is_active = 1',
      [loginEmail]
    );

    if (users.length === 0) {
      console.log('❌ User not found or inactive:', loginEmail);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    console.log('👤 Found user:', { id: user.id, email: user.email, role: user.role });

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', loginEmail);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login timestamp
    await promisePool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // Create session
    req.session.user = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      landing_page: '/dashboards/modern'
    };

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({ error: 'Session creation failed' });
      }

      console.log('✅ Login successful for user:', req.session.user);
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
        redirectTo: '/dashboards/modern'
      });
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/auth/sign-out - User logout
router.post('/sign-out', (req, res) => {
  console.log('🔓 Logout attempt for user:', req.session?.user);

  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }

    console.log('✅ Logout successful');
    res.clearCookie('connect.sid'); // Clear session cookie
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// POST /api/auth/logout - User logout (alias for sign-out to match frontend)
router.post('/logout', (req, res) => {
  console.log('🔓 Logout attempt for user:', req.session?.user);

  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }

    console.log('✅ Logout successful');
    res.clearCookie('connect.sid'); // Clear session cookie
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// GET /api/auth/user - Get current user info
router.get('/user', (req, res) => {
  if (req.session?.user) {
    res.json({
      authenticated: true,
      user: req.session.user
    });
  } else {
    res.json({ authenticated: false });
  }
});

// POST /api/auth/change-password - Change user password
router.post('/change-password', async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get current user's password hash
    const [users] = await promisePool.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.session.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await promisePool.query(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, req.session.user.id]
    );

    console.log('✅ Password changed for user:', req.session.user.email);
    res.json({ success: true, message: 'Password changed successfully' });

  } catch (error) {
    console.error('❌ Password change error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// PUT /api/auth/change-password - Change user password (alias for POST to match frontend)
router.put('/change-password', async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get current user's password hash
    const [users] = await promisePool.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.session.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await promisePool.query(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, req.session.user.id]
    );

    console.log('✅ Password changed for user:', req.session.user.email);
    res.json({ success: true, message: 'Password changed successfully' });

  } catch (error) {
    console.error('❌ Password change error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// GET /api/auth/permissions - Get user permissions
router.get('/permissions', async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Basic role-based permissions
    const userRole = req.session.user.role;
    let permissions = {
      canViewRecords: false,
      canEditRecords: false,
      canDeleteRecords: false,
      canViewAdmin: false,
      canManageUsers: false,
      canViewReports: false,
      canExportData: false
    };

    switch (userRole) {
      case 'super_admin':
        permissions = {
          canViewRecords: true,
          canEditRecords: true,
          canDeleteRecords: true,
          canViewAdmin: true,
          canManageUsers: true,
          canViewReports: true,
          canExportData: true
        };
        break;
      case 'admin':
        permissions = {
          canViewRecords: true,
          canEditRecords: true,
          canDeleteRecords: true,
          canViewAdmin: true,
          canManageUsers: false,
          canViewReports: true,
          canExportData: true
        };
        break;
      case 'priest':
      case 'supervisor':
        permissions = {
          canViewRecords: true,
          canEditRecords: true,
          canDeleteRecords: false,
          canViewAdmin: false,
          canManageUsers: false,
          canViewReports: true,
          canExportData: true
        };
        break;
      case 'volunteer':
        permissions = {
          canViewRecords: true,
          canEditRecords: true,
          canDeleteRecords: false,
          canViewAdmin: false,
          canManageUsers: false,
          canViewReports: false,
          canExportData: false
        };
        break;
      case 'viewer':
      default:
        permissions = {
          canViewRecords: true,
          canEditRecords: false,
          canDeleteRecords: false,
          canViewAdmin: false,
          canManageUsers: false,
          canViewReports: false,
          canExportData: false
        };
        break;
    }

    res.json({
      role: userRole,
      permissions
    });

  } catch (error) {
    console.error('❌ Permissions error:', error);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
});

module.exports = router;
