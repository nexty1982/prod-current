// server/config/session.js - FIXED VERSION FOR HTTPS PRODUCTION
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

// Load environment variables
require('dotenv').config();

// Database connection options for session store
const sessionStoreOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
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

// Dynamic environment detection
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || 'orthodox-metrics-dev-secret-2025';

// Dynamic cookie configuration
const getCookieConfig = () => {
  const baseConfig = {
    httpOnly: true,
    maxAge: 86400000, // 24 hours
    sameSite: 'lax'
  };
  
  if (isProduction) {
    return {
      ...baseConfig,
      secure: true,
      domain: process.env.COOKIE_DOMAIN || '.orthodoxmetrics.com'
    };
  }
  
  // Development config
  return {
    ...baseConfig,
    secure: false // Allow HTTP in development
    // No domain restriction in development
  };
};

const sessionConfig = {
  name: 'orthodoxmetrics.sid',
  secret: sessionSecret,
  store: store,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: isProduction, // Only trust proxy in production
  cookie: getCookieConfig()
};

console.log('🍪 Session configuration:');
console.log('   Environment:', process.env.NODE_ENV || 'development');
console.log('   Secure cookies:', sessionConfig.cookie.secure);
console.log('   Cookie domain:', sessionConfig.cookie.domain || 'not set');

// Create session middleware with enhanced debugging
const sessionMiddleware = session(sessionConfig);

// Wrap session middleware to add debugging for phantom user issues
const debugSessionMiddleware = (req, res, next) => {
  const originalSessionId = req.sessionID;
  
  // Log session state before middleware
  console.log(`🍪 SESSION DEBUG - ${req.method} ${req.path}`);
  console.log(`   Session ID before: ${originalSessionId || 'NONE'}`);
  console.log(`   Cookie header: ${req.headers.cookie ? 'PRESENT' : 'MISSING'}`);
  
  sessionMiddleware(req, res, (err) => {
    if (err) {
      console.error('❌ Session middleware error:', err);
      return next(err);
    }
    
    const newSessionId = req.sessionID;
    console.log(`   Session ID after: ${newSessionId || 'NONE'}`);
    console.log(`   Session user: ${req.session?.user?.email || 'NONE'}`);
    console.log(`   Session keys: ${req.session ? Object.keys(req.session).join(', ') : 'NONE'}`);
    
    // Check for phantom user issue
    if (newSessionId && !req.session?.user) {
      console.log('⚠️  PHANTOM USER DETECTED: Session ID exists but no user data');
      console.log('⚠️  This indicates session store or cookie transmission issues');
    }
    
    // Check for session ID changes (indicates session not persisting)
    if (originalSessionId && newSessionId && originalSessionId !== newSessionId) {
      console.log('⚠️  SESSION ID CHANGED: Session not persisting properly');
      console.log(`   Original: ${originalSessionId}`);
      console.log(`   New: ${newSessionId}`);
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
