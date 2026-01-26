#!/usr/bin/env node
/**
 * Migration Script: Normalize OCR Schema for All Church Databases
 * 
 * This script runs the normalize_ocr_schema.sql migration for each church database.
 * It ensures DB is the single source of truth by standardizing column names.
 * 
 * Usage: node scripts/migrate-all-church-ocr-schemas.js
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Load database configuration
const { promisePool } = require('../config/db');

async function getChurchDatabases() {
  const [churches] = await promisePool.query(
    'SELECT id, name, database_name FROM churches ORDER BY id'
  );
  return churches;
}

async function runMigrationForChurch(dbName, churchId) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  const migrationFile = path.join(__dirname, '../database/migrations/normalize_ocr_schema.sql');
  
  // Get DB config using same logic as config/db.js
  let dbHost = process.env.DB_HOST || 'localhost';
  let dbUser = process.env.DB_USER || 'orthodoxapps';
  let dbPassword = process.env.DB_PASSWORD || 'Summerof1982@!'; // Fallback from db.js
  let dbPort = process.env.DB_PORT || '3306';
  
  // Try to get password from config if not in env
  try {
    const dbConfigModule = require('../config/db');
    if (dbConfigModule && dbConfigModule.getDbConfig) {
      const config = dbConfigModule.getDbConfig('app');
      dbHost = config.host || dbHost;
      dbUser = config.user || dbUser;
      dbPassword = config.password || dbPassword;
      dbPort = config.port || dbPort;
    }
  } catch (e) {
    // Config might not be available, use fallback values
    console.log(`  Using fallback DB config (config not available)`);
  }

  console.log(`\n[${churchId}] Migrating ${dbName}...`);

  try {
    // Use mysql command-line tool which handles multi-statement SQL correctly
    // This preserves SET variables and PREPARE/EXECUTE statements
    // Note: -p flag must be followed by password with no space, or use --password=password
    const mysqlCmd = `mysql -h${dbHost} -u${dbUser} --password=${dbPassword} -P${dbPort} ${dbName} < "${migrationFile}"`;
    
    const { stdout, stderr } = await execAsync(mysqlCmd, {
      cwd: __dirname,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    if (stderr && !stderr.includes('Warning')) {
      // Check for actual errors (warnings are OK)
      if (stderr.includes('ERROR')) {
        throw new Error(stderr);
      }
    }

    console.log(`[${churchId}] ✅ Migration completed for ${dbName}`);
    return { success: true, churchId, dbName };
  } catch (error) {
    // Check if error is about columns/indexes already existing (idempotent migration)
    const errMsg = error.message || error.stderr || '';
    if (
      errMsg.includes('Duplicate column') ||
      errMsg.includes('already exists') ||
      errMsg.includes('Duplicate key') ||
      errMsg.includes('Duplicate index')
    ) {
      console.log(`[${churchId}] ⚠️  Migration completed with warnings (some columns/indexes already exist) for ${dbName}`);
      return { success: true, churchId, dbName, warning: 'Some columns/indexes already existed' };
    }
    console.error(`[${churchId}] ❌ Migration failed for ${dbName}:`, error.message || error.stderr);
    return { success: false, churchId, dbName, error: error.message || error.stderr };
  }
}

async function main() {
  console.log('Starting OCR schema normalization for all church databases...\n');

  try {
    const churches = await getChurchDatabases();
    console.log(`Found ${churches.length} church databases to migrate\n`);

    const results = [];
    for (const church of churches) {
      const result = await runMigrationForChurch(church.database_name, church.id);
      results.push(result);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary:');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\nFailed migrations:');
      failed.forEach(r => {
        console.log(`  - Church ${r.churchId} (${r.dbName}): ${r.error}`);
      });
    }

    console.log('\nMigration complete. Next steps:');
    console.log('1. Verify canonical columns exist in all databases');
    console.log('2. Update code to use canonical column names only');
    console.log('3. Remove dynamic column detection logic');
    console.log('4. Test with bundle files removed');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = { runMigrationForChurch, getChurchDatabases };
