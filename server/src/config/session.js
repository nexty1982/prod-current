const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const mysql = require('mysql'); // Use 'mysql' package (not mysql2) for express-mysql-session

// Use centralized configuration
// Detects context (dist vs source) and uses appropriate path
const path = require('path');
const isDist = __dirname.includes(path.sep + 'dist' + path.sep);

let config;
if (isDist) {
    // Running from dist: only try dist path (src/ doesn't exist in dist)
    try {
        config = require('./');
    } catch (error) {
        config = null; // Will use process.env fallback
    }
} else {
    // Running from source: try dist path first, then src path
    try {
        config = require('./');
    } catch (error) {
        try {
            config = require('./');
        } catch (e) {
            config = null; // Will use process.env fallback
        }
    }
}

// Get database connection config for express-mysql-session
// Use auth database for sessions (separate from app DB)
const getDbConfig = () => {
  if (config && config.db && config.db.auth) {
    return {
      host: config.db.auth.host,
      user: config.db.auth.user,
      password: config.db.auth.password,
      database: config.db.auth.database,
      port: config.db.auth.port,
      charset: 'utf8mb4',
    };
  }
  
  // Fallback to process.env (backward compatibility)
  return {
    host: process.env.AUTH_DB_HOST || process.env.DB_HOST || 'localhost',
    user: process.env.AUTH_DB_USER || process.env.DB_USER || 'orthodoxapps',
    password: process.env.AUTH_DB_PASSWORD || process.env.DB_PASSWORD || 'Summerof1982@!',
    database: process.env.AUTH_DB_NAME || process.env.AUTH_DB || process.env.DB_NAME || 'orthodoxmetrics_db',
    port: parseInt(process.env.AUTH_DB_PORT || process.env.DB_PORT || '3306'),
    charset: 'utf8mb4',
  };
};

const dbConfig = getDbConfig();

// Get session config from centralized config or fallback
const getSessionConfig = () => {
  const secret = (config && config.session && config.session.secret) || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('FATAL: SESSION_SECRET is not set. Refusing to start with a fallback secret. Set SESSION_SECRET in your .env file.');
  }
  const cookieName = (config && config.session && config.session.cookieName) || process.env.SESSION_COOKIE_NAME || 'orthodoxmetrics.sid';
  const maxAge = (config && config.session && config.session.maxAgeMs) || parseInt(process.env.SESSION_MAX_AGE_MS || '86400000');

  return {
    name: cookieName,
    secret: secret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: true,
    // !! CRITICAL — DO NOT CHANGE secure OR domain — SEE server/CONFIG.md !!
    // Setting secure:true or domain:'orthodoxmetrics.com' WILL break all sessions.
    // This caused a production outage on 2026-02-02. Read CONFIG.md before touching.
    cookie: {
      secure: false,          // MUST be false — nginx terminates SSL, backend is HTTP
      httpOnly: true,
      maxAge: maxAge,
      sameSite: 'lax',
      path: '/',
      domain: undefined,      // MUST be undefined — let browser handle domain matching
    },
  };
};

// Create session store
let sessionStore = null;
const sessionStoreType = config?.session?.store || process.env.SESSION_STORE || 'mysql';
const wantMysqlStore = (
  sessionStoreType.toLowerCase() === 'mysql' ||
  (config?.server?.env === 'production')
);

if (wantMysqlStore) {
  try {
    const connectionPool = mysql.createPool(dbConfig);
    
    const sessionCfg = getSessionConfig();
    sessionStore = new MySQLStore({
      expiration: sessionCfg.cookie.maxAge,
      createDatabaseTable: true,
      schema: {
        tableName: 'sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data'
        }
      }
    }, connectionPool);
    console.log('✅ MySQL session store initialized');
  } catch (error) {
    console.error('⚠️  Failed to initialize MySQL session store. Falling back to MemoryStore:', error.message);
    sessionStore = null;
  }
}

const sessionConfig = getSessionConfig();
console.log('🔑 Session config check:', {
  name: sessionConfig.name,
  secretLength: sessionConfig.secret?.length || 0,
  secretPrefix: sessionConfig.secret?.substring(0, 8) || 'MISSING',
  secure: sessionConfig.cookie.secure,
  domain: sessionConfig.cookie.domain,
  sameSite: sessionConfig.cookie.sameSite,
  path: sessionConfig.cookie.path,
  maxAge: sessionConfig.cookie.maxAge,
});

// Only add store if it was successfully created
if (sessionStore) {
  sessionConfig.store = sessionStore;
} else {
  console.warn('⚠️  Using MemoryStore for sessions. This is NOT recommended for production.');
}

module.exports = session(sessionConfig);
