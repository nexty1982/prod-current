// server/config/db.js
const mysql = require('mysql2/promise');
const debug = require('debug')('app:db');
const path = require('path');
const fs = require('fs');

// Try to load environment file if it exists
const envFile = process.env.NODE_ENV === 'development'
  ? '../.env.production'
  : '../.env.development';

const envPath = path.resolve(__dirname, envFile);
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log(`✅ Loaded environment from: ${envPath}`);
} else {
  console.log(`⚠️  Environment file not found: ${envPath}, using defaults`);
}

const promisePool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: process.env.DB_NAME || 'orthodmetrics_dev',
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

// --- Add query logging for all queries ---
function logQuery(sql, params) {
  if (params && params.length) {
    console.log('[DB QUERY]', sql, '\n[PARAMS]', params);
  } else {
    console.log('[DB QUERY]', sql);
  }
}

const origQuery = promisePool.query.bind(promisePool);
promisePool.query = async function(sql, params) {
  logQuery(sql, params);
  return origQuery(sql, params);
};

const origExecute = promisePool.execute.bind(promisePool);
promisePool.execute = async function(sql, params) {
  logQuery(sql, params);
  return origExecute(sql, params);
};

// Export both the callback-based pool and the promise-based pool
module.exports = {
  promisePool: promisePool,
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
