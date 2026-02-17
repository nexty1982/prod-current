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

// ── Tenant pool factory ────────────────────────────────────────────────────
// Cached pools keyed by churchId. Same host/user/password, only schema differs.

const _tenantPools = new Map();

/**
 * Derive the tenant schema name from a churchId.
 * Convention: om_church_<churchId>
 */
function tenantSchema(churchId) {
  return `om_church_${churchId}`;
}

/**
 * Return a cached mysql2/promise pool connected to om_church_<churchId>.
 * Creates the pool on first call, reuses on subsequent calls.
 */
function getTenantPool(churchId) {
  const id = Number(churchId);
  if (!id || id <= 0) throw new Error(`getTenantPool: invalid churchId ${churchId}`);
  if (_tenantPools.has(id)) return _tenantPools.get(id);

  const baseConfig = getDbConfig('app');
  const pool = mysql.createPool({
    ...baseConfig,
    database: tenantSchema(id),
    connectTimeout: 60000,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: 'utf8mb4',
  });
  _tenantPools.set(id, pool);
  console.log(`[DB] Tenant pool created for church ${id} → ${tenantSchema(id)}`);
  return pool;
}

/**
 * Assert that BOTH ocr_feeder_pages and ocr_feeder_artifacts tables exist
 * in the tenant schema. Throws loud error if either is missing.
 */
async function assertTenantOcrTablesExist(churchId) {
  const schema = tenantSchema(churchId);
  const [rows] = await appPool.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('ocr_feeder_pages', 'ocr_feeder_artifacts')`,
    [schema]
  );
  const found = new Set(rows.map(r => r.TABLE_NAME));
  const missing = [];
  if (!found.has('ocr_feeder_pages'))    missing.push('ocr_feeder_pages');
  if (!found.has('ocr_feeder_artifacts')) missing.push('ocr_feeder_artifacts');
  if (missing.length > 0) {
    const msg = `[OCR Worker] FATAL: Missing tenant tables in ${schema}: ${missing.join(', ')}. churchId=${churchId}`;
    console.error(msg);
    throw new Error(msg);
  }

  // Ensure composite index and extra columns exist (idempotent)
  const pool = getTenantPool(churchId);
  try {
    await pool.query(`ALTER TABLE ocr_feeder_artifacts ADD INDEX IF NOT EXISTS idx_page_type_created (page_id, type, created_at)`);
    await pool.query(`ALTER TABLE ocr_feeder_artifacts ADD COLUMN IF NOT EXISTS sha256 VARCHAR(64) NULL`);
    await pool.query(`ALTER TABLE ocr_feeder_artifacts ADD COLUMN IF NOT EXISTS bytes BIGINT NULL`);
    await pool.query(`ALTER TABLE ocr_feeder_artifacts ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100) NULL`);
  } catch (e) {
    // Best effort — index/column may already exist
    if (e.code !== 'ER_DUP_KEYNAME' && e.code !== 'ER_DUP_FIELDNAME') {
      console.warn(`[assertTenantOcrTablesExist] ${schema}: index/column creation warning: ${e.message}`);
    }
  }
}

/**
 * Idempotently normalize a tenant's ocr_jobs schema to ensure it has
 * the columns the application code expects. Safe to call repeatedly.
 * Adds missing columns; never drops existing ones.
 */
async function normalizeTenantOcrSchema(churchId) {
  const schema = tenantSchema(churchId);
  const pool = getTenantPool(churchId);
  const tag = `[normalizeTenantOcr] ${schema}`;

  // First check if ocr_jobs table exists at all
  const [tables] = await pool.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ocr_jobs'`,
    [schema]
  );
  if (tables.length === 0) {
    console.log(`${tag} ocr_jobs table does not exist — skipping normalization`);
    return { schema, status: 'no_table' };
  }

  // Get existing columns
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ocr_jobs'`,
    [schema]
  );
  const existing = new Set(cols.map(c => c.COLUMN_NAME));

  // Columns to ensure exist (idempotent ALTERs)
  const additions = [
    { col: 'filename', sql: `ADD COLUMN filename VARCHAR(255) NULL AFTER church_id` },
    { col: 'original_filename', sql: `ADD COLUMN original_filename VARCHAR(255) NULL AFTER filename` },
    { col: 'ocr_text', sql: `ADD COLUMN ocr_text LONGTEXT NULL` },
    { col: 'ocr_result_json', sql: `ADD COLUMN ocr_result_json LONGTEXT NULL` },
    { col: 'error', sql: `ADD COLUMN error TEXT NULL` },
    { col: 'confidence_score', sql: `ADD COLUMN confidence_score DECIMAL(5,2) NULL` },
    { col: 'record_type', sql: `ADD COLUMN record_type VARCHAR(50) DEFAULT 'baptism'` },
    { col: 'language', sql: `ADD COLUMN language VARCHAR(10) DEFAULT 'en'` },
  ];

  const added = [];
  for (const { col, sql } of additions) {
    if (!existing.has(col)) {
      try {
        await pool.query(`ALTER TABLE ocr_jobs ${sql}`);
        added.push(col);
        console.log(`${tag} Added column: ${col}`);
      } catch (err) {
        // Column may have been added concurrently
        if (err.code !== 'ER_DUP_FIELDNAME') {
          console.error(`${tag} Failed to add column ${col}: ${err.message}`);
        }
      }
    }
  }

  // Migrate file_name -> filename if both exist
  if (existing.has('file_name') && (existing.has('filename') || added.includes('filename'))) {
    try {
      await pool.query(`UPDATE ocr_jobs SET filename = COALESCE(NULLIF(filename, ''), file_name) WHERE (filename IS NULL OR filename = '') AND file_name IS NOT NULL`);
      console.log(`${tag} Migrated file_name -> filename`);
    } catch (err) {
      console.warn(`${tag} file_name migration skipped: ${err.message}`);
    }
  }

  console.log(`${tag} Normalization complete. Added ${added.length} columns: ${added.join(', ') || 'none'}`);
  return { schema, status: 'ok', added };
}

module.exports = {
  getAppPool,
  getAuthPool,
  testConnection,
  // Tenant helpers
  tenantSchema,
  getTenantPool,
  assertTenantOcrTablesExist,
  normalizeTenantOcrSchema,
  // Legacy exports for compatibility
  promisePool: appPool,
  pool: {
    query: (...args) => appPool.query(...args),
    execute: (...args) => appPool.execute(...args),
  }
};
