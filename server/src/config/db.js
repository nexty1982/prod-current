// Main database configuration file
const mysql = require('mysql2/promise');
const debug = require('debug')('app:db');

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
        console.warn('⚠️  Centralized config not available, using process.env fallback');
        config = null;
    }
} else {
    // Running from source: try dist path first, then src path
    try {
        config = require('./');
    } catch (error) {
        try {
            config = require('./');
        } catch (e) {
            console.warn('⚠️  Centralized config not available, using process.env fallback');
            config = null;
        }
    }
}

// Get database config from centralized config or fallback to process.env
const getDbConfig = (dbType) => {
  if (config && config.db) {
    const dbConfig = dbType === 'auth' ? config.db.auth : config.db.app;
    return {
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      port: dbConfig.port,
    };
  }
  
  // Fallback to process.env (backward compatibility)
  if (dbType === 'auth') {
    return {
      host: process.env.AUTH_DB_HOST || process.env.DB_HOST || 'localhost',
      user: process.env.AUTH_DB_USER || process.env.DB_USER || 'orthodoxapps',
      password: process.env.AUTH_DB_PASSWORD || process.env.DB_PASSWORD || 'Summerof1982@!',
      database: process.env.AUTH_DB_NAME || process.env.AUTH_DB || process.env.DB_NAME || 'orthodoxmetrics_db',
      port: parseInt(process.env.AUTH_DB_PORT || process.env.DB_PORT || '3306'),
    };
  }
  
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'orthodoxapps',
    password: process.env.DB_PASSWORD || 'Summerof1982@!',
    database: process.env.DB_NAME || 'orthodoxmetrics_db',
    port: parseInt(process.env.DB_PORT || '3306'),
  };
};

// App database pool (main database)
const appDbConfig = getDbConfig('app');
const appPool = mysql.createPool({
  ...appDbConfig,
  connectTimeout: 60000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

// Auth database pool (for sessions and auth data) - MUST be separate
const authDbConfig = getDbConfig('auth');
const authPool = mysql.createPool({
  ...authDbConfig,
  connectTimeout: 60000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

// Log all queries for debugging
function logQuery(sql, params) {
  if (params && params.length) {
    console.log('[DB QUERY]', sql, '\n[PARAMS]', params);
  } else {
    console.log('[DB QUERY]', sql);
  }
}

// Add query logging to app pool
const origAppQuery = appPool.query.bind(appPool);
appPool.query = async function(sql, params) {
  logQuery(sql, params);
  return origAppQuery(sql, params);
};

const origAppExecute = appPool.execute.bind(appPool);
appPool.execute = async function(sql, params) {
  logQuery(sql, params);
  return origAppExecute(sql, params);
};

// Export functions that the application expects
function getAppPool() {
  return appPool;
}

function getAuthPool() {
  return authPool;
}

// Helper function to test the connection
async function testConnection() {
  try {
    const [rows] = await getAppPool().query('SELECT 1 as test');
    return { success: true, message: 'Database connection successful' };
  } catch (error) {
    return { success: false, message: `Database connection failed: ${error.message}` };
  }
}

module.exports = {
  getAppPool,
  getAuthPool,
  testConnection,
  // Legacy exports for compatibility
  promisePool: appPool,
  pool: {
    query: (...args) => appPool.query(...args),
    execute: (...args) => appPool.execute(...args),
  }
};
