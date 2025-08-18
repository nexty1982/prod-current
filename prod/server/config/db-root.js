// server/config/db-root.js
// Root-level database connection for administrative operations
const mysql = require('mysql2/promise');
const debug = require('debug')('app:db-root');
const path = require('path');
const fs = require('fs');

// Try to load production environment file if it exists (prefer .env, fallback to .env.production)
const envCandidates = ['../.env', '../.env.production'];
let loadedEnvPath = null;
for (const candidate of envCandidates) {
  const p = path.resolve(__dirname, candidate);
  if (fs.existsSync(p)) { loadedEnvPath = p; break; }
}
if (loadedEnvPath) {
  require('dotenv').config({ path: loadedEnvPath });
  console.log(`✅ Loaded environment from: ${loadedEnvPath}`);
} else {
  console.log('⚠️  No .env or .env.production found, using defaults');
}

// Root database connection (no specific database selected)
const rootPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_ROOT_USER || process.env.DB_USER || 'root',
  password: process.env.DB_ROOT_PASSWORD || process.env.DB_PASSWORD || 'Summerof1982@!',
  // No database specified - allows for creating/managing multiple databases
  connectTimeout: 60000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

// Log all queries for root operations
rootPool.on('enqueue', function () {
  debug('Waiting for available root connection slot');
});

// Add query logging for root operations
function logRootQuery(sql, params) {
  if (params && params.length) {
    console.log('[ROOT DB QUERY]', sql, '\n[PARAMS]', params);
  } else {
    console.log('[ROOT DB QUERY]', sql);
  }
}

const origRootQuery = rootPool.query.bind(rootPool);
rootPool.query = async function(sql, params) {
  logRootQuery(sql, params);
  return origRootQuery(sql, params);
};

// Health check function for root connection
async function testRootConnection() {
  try {
    const [rows] = await rootPool.execute('SELECT 1 as test');
    debug('Root database connection successful');
    return true;
  } catch (error) {
    debug('Root database connection failed:', error.message);
    return false;
  }
}

module.exports = {
  rootPool,
  testRootConnection
};
