// TEMPORARY HOTFIX - Cookie not persisting issue
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { getAppPool } = require('./db'); // Import database pool

// Load environment variables
require('dotenv').config();

// Database connection options for session store
const sessionStoreOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Summerof2025@!',
  database: process.env.DB_NAME || 'orthodoxmetrics_db',
  charset: 'utf8mb4',
  expiration: 86400000, // 24 hours
  checkExpirationInterval: 900000, // Check every 15 minutes
  createDatabaseTable: true,
  endConnectionOnClose: true,
  clearExpired: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
};

// Create MySQL connection for session management
const mysql = require('mysql2/promise');
const sessionConnection = mysql.createPool({
  host: sessionStoreOptions.host,
  port: sessionStoreOptions.port,
  user: sessionStoreOptions.user,
  password: sessionStoreOptions.password,
  database: sessionStoreOptions.database,
  charset: sessionStoreOptions.charset,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const store = new MySQLStore(sessionStoreOptions);

// Enhanced error handling for session store
store.on('error', (error) => {
  console.error('❌ Session store error:', error);
  console.error('❌ This may cause phantom user issues!');
});

store.on('connect', () => {
  console.log('✅ Session store connected successfully');
});

store.on('disconnect', () => {
  console.log('⚠️ Session store disconnected');
});

// HOTFIX: Simplified configuration that works everywhere
const sessionSecret = process.env.SESSION_SECRET || 'orthodox-metrics-dev-secret-2025';

// FIXED: Simple cookie config that actually persists
const sessionConfig = {
  name: 'orthodoxmetrics.sid',
  secret: sessionSecret,
  store: store,
  resave: false,
  saveUninitialized: false, // Only save sessions that have been modified (after login)
  rolling: true,
  proxy: false, // Don't trust proxy - causes issues
  cookie: {
    httpOnly: true,
    secure: false, // Works with both HTTP and HTTPS
    sameSite: 'lax',
    maxAge: 86400000, // 24 hours
    path: '/'
    // No domain restriction - browser handles it correctly
  }
};

// Only log session config in development
if (process.env.NODE_ENV === 'development') {
  console.log('🍪 Session config: secure=' + sessionConfig.cookie.secure + ', domain=' + (sessionConfig.cookie.domain || 'auto'));
}

// Create session middleware with enhanced debugging
const sessionMiddleware = session(sessionConfig);

// Production-ready middleware - minimal logging
const debugSessionMiddleware = (req, res, next) => {
  sessionMiddleware(req, res, (err) => {
    if (err) {
      console.error('❌ Session error:', err);
      return next(err);
    }
    
    // Only log warnings for session issues
    if (req.path === '/api/auth/login') {
      const hasSession = !!req.sessionID;
      const hasUser = !!req.session?.user;
      
      if (!hasSession) {
        console.warn('⚠️ No session created during login');
      } else if (req.method === 'POST' && hasSession && !hasUser && req.body?.email) {
        // Login attempt - will log success/failure in auth route
      }
    }
    
    next();
  });
};

// Session management utilities
const SessionManager = {
  async getUserSessionCount(userId) {
    const [rows] = await getAppPool().query(
      'SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND expires > NOW()',
      [userId]
    );
    return rows[0].count;
  },

  async getOldestUserSession(userId) {
    const [rows] = await getAppPool().query(
      'SELECT session_id FROM sessions WHERE user_id = ? AND expires > NOW() ORDER BY expires ASC LIMIT 1',
      [userId]
    );
    return rows[0] || null;
  },

  async deleteSession(sessionId) {
    await getAppPool().query('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
  },

  async updateSessionUserId(sessionId, userId) {
    await getAppPool().query(
      'UPDATE sessions SET user_id = ? WHERE session_id = ?',
      [userId, sessionId]
    );
  },

  async enforceSessionLimits(userId, userRole, currentSessionId) {
    // Determine session limits based on role
    const sessionLimit = userRole === 'super_admin' ? 5 : 3;
    
    console.log(`🛡️ Checking session limits for user ${userId} (${userRole}): max ${sessionLimit} sessions`);
    
    const currentCount = await this.getUserSessionCount(userId);
    console.log(`📊 Current sessions: ${currentCount}/${sessionLimit}`);
    
    if (currentCount >= sessionLimit) {
      const oldestSession = await this.getOldestUserSession(userId);
      if (oldestSession && oldestSession.session_id !== currentSessionId) {
        console.log(`🚨 Session limit exceeded! Auto-kicking oldest session: ${oldestSession.session_id}`);
        await this.deleteSession(oldestSession.session_id);
        console.log(`✅ Oldest session removed. New count: ${await this.getUserSessionCount(userId)}`);
      }
    }
  }
};

module.exports = {
  sessionMiddleware: debugSessionMiddleware,
  sessionConnection,
  SessionManager
};
