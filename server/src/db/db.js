// server/src/config/db.js
const mysql = require('mysql2/promise');
const debug = require('debug')('app:db');
const path = require('path');
const fs = require('fs');

// Try to load environment file if it exists (development only)
if (process.env.NODE_ENV !== 'production') {
  const envFile = process.env.NODE_ENV === 'production'
    ? './.env.production'
    : './.env.development';

  const envPath = path.resolve(__dirname, envFile);
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`✅ Loaded environment from: ${envPath}`);
  } else {
    console.log(`⚠️  Environment file not found: ${envPath}, using defaults`);
  }
} else {
  // Production: rely on environment variables set by system/deployment
  console.log(`✅ Production environment detected, using system environment variables`);
}

const promisePool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: process.env.DB_NAME || 'orthodoxmetrics_db',
  connectTimeout: 60000, // Connection timeout in milliseconds
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  // debug: true // Disable MySQL debug logging
});
// Log all queries
promisePool.on('enqueue', function () {
  debug('Waiting for available connection slot');
});

// --- Query logging disabled for production ---
function logQuery(sql, params) {
  // Logging disabled - too verbose
}

const origQuery = promisePool.query.bind(promisePool);
promisePool.query = async function(sql, params) {
  // logQuery(sql, params); // Disabled
  return origQuery(sql, params);
};

const origExecute = promisePool.execute.bind(promisePool);
promisePool.execute = async function(sql, params) {
  // logQuery(sql, params); // Disabled
  return origExecute(sql, params);
};

// Export both the callback-based pool and the promise-based pool
module.exports = {
  promisePool: promisePool,
  getAppPool: () => promisePool, // Helper function for compatibility
  // Helper function to test the connection
  testConnection: async () => {
    try {
      const [rows] = await promisePool.query('SELECT 1');
      return { success: true, message: 'Database connection successful' };
    } catch (error) {
      return { success: false, message: `Database connection failed: ${error.message}` };
    }
  }
};
