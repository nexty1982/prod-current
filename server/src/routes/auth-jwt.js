// JWT-based auth routes using orthodoxmetrics_db
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const router = express.Router();

// Create connection pool for orthodoxmetrics_db
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: process.env.DB_DATABASE || 'orthodoxmetrics_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// JWT configuration
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'change_me_access_256bit';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change_me_refresh_256bit';
const ACCESS_TOKEN_TTL = parseInt(process.env.ACCESS_TOKEN_TTL || '900'); // 15 minutes
const REFRESH_TOKEN_TTL = parseInt(process.env.REFRESH_TOKEN_TTL || '2592000'); // 30 days

// Helper functions
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateRefreshToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// POST /api/auth/login - User login with JWT
router.post('/login', async (req, res) => {
  try {
    console.log('[AUTH] Login attempt - Body:', JSON.stringify(req.body));
    console.log('[AUTH] Content-Type:', req.headers['content-type']);
    
    // Handle both 'email' and 'username' fields for compatibility
    const { email, username, password } = req.body;
    const loginEmail = email || username;

    if (!loginEmail || !password) {
      console.log('[AUTH] Missing credentials - email/username:', !!loginEmail, 'password:', !!password);
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user in orthodoxmetrics_db
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [loginEmail]
    );

    const user = users[0];
    if (!user) {
      console.log('[AUTH] User not found for email:', loginEmail);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is locked
    if (user.is_locked) {
      return res.status(401).json({
        success: false,
        message: 'Account is locked. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      churchId: user.church_id
    };

    const accessToken = jwt.sign(tokenPayload, JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_TTL
    });

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

    // Save refresh token
    await pool.execute(
      `INSERT INTO refresh_tokens 
       (user_id, token_hash, expires_at, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, refreshTokenHash, expiresAt, req.ip, req.headers['user-agent']]
    );

    // Update last login
    await pool.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Set refresh token as httpOnly cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // Also set session for backward compatibility
    if (req.session) {
      req.session.user = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        church_id: user.church_id,
        account_expires_at: user.account_expires_at || null
      };
      req.session.loginTime = new Date();
      req.session.lastActivity = new Date();
    }

    console.log(`✅ JWT Authentication successful for: ${loginEmail} Role: ${user.role}`);

    return res.json({
      success: true,
      message: 'Login successful',
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        church_id: user.church_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refresh_token || req.body?.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      });
    }

    const tokenHash = hashToken(refreshToken);
    
    // Find valid refresh token
    const [tokens] = await pool.execute(
      `SELECT * FROM refresh_tokens 
       WHERE token_hash = ? 
       AND expires_at > NOW() 
       AND revoked_at IS NULL`,
      [tokenHash]
    );

    const storedToken = tokens[0];
    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Get user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ? AND is_active = 1',
      [storedToken.user_id]
    );

    const user = users[0];
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Revoke old token
    await pool.execute(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?',
      [storedToken.id]
    );

    // Generate new tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      churchId: user.church_id
    };

    const newAccessToken = jwt.sign(tokenPayload, JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_TTL
    });

    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

    // Save new refresh token
    await pool.execute(
      `INSERT INTO refresh_tokens 
       (user_id, token_hash, expires_at, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, newRefreshTokenHash, expiresAt, req.ip, req.headers['user-agent']]
    );

    // Set new refresh token as httpOnly cookie
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      access_token: newAccessToken
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/auth/check - Check authentication status
router.get('/check', async (req, res) => {
  try {
    // Check for JWT token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get fresh user data from database
        const [users] = await pool.execute(
          'SELECT id, email, first_name, last_name, role, church_id FROM users WHERE id = ? AND is_active = 1',
          [decoded.userId]
        );
        
        if (users[0]) {
          return res.json({
            success: true,
            authenticated: true,
            user: {
              id: users[0].id,
              email: users[0].email,
              first_name: users[0].first_name,
              last_name: users[0].last_name,
              role: users[0].role,
              church_id: users[0].church_id
            }
          });
        }
      } catch (error) {
        console.log('[AUTH] Invalid token in check:', error.message);
      }
    }
    
    // Check session as fallback
    if (req.session && req.session.user) {
      return res.json({
        success: true,
        authenticated: true,
        user: req.session.user
      });
    }
    
    return res.json({
      success: true,
      authenticated: false
    });
  } catch (error) {
    console.error('[AUTH] Error checking auth status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check authentication status'
    });
  }
});

// POST /api/auth/logout - User logout
router.post('/logout', async (req, res) => {
  try {
    // Get user from session or JWT
    let userId = null;
    
    // Check Authorization header for JWT
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = jwt.verify(token, JWT_ACCESS_SECRET);
        userId = payload.userId;
      } catch (err) {
        // Token invalid, check session
      }
    }

    // Fall back to session
    if (!userId && req.session?.user) {
      userId = req.session.user.id;
    }

    // Revoke all user tokens if we have a userId
    if (userId) {
      await pool.execute(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
        [userId]
      );
    }

    // Clear refresh token cookie
    res.clearCookie('refresh_token');

    // Clear session
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
        }
      });
    }

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/auth/verify - Verify token
router.get('/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, JWT_ACCESS_SECRET);

    return res.json({
      success: true,
      user: payload
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

module.exports = router;
