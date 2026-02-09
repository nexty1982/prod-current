#!/usr/bin/env node
/**
 * Migration: Create record_supplements table in all om_church_## databases.
 * Idempotent — uses CREATE TABLE IF NOT EXISTS.
 *
 * Usage:  node server/src/scripts/migrate-record-supplements.js
 */

// Load .env from server root
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || process.env.DB_PASS,
  connectTimeout: 30000,
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4',
});

function getCreateTableSQL(dbName) {
  return `
CREATE TABLE IF NOT EXISTS \`${dbName}\`.\`record_supplements\` (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  record_type VARCHAR(64) NOT NULL,
  record_id BIGINT UNSIGNED NOT NULL,
  field_key VARCHAR(128) NOT NULL,
  field_type ENUM('string','number','date','bool','json') NOT NULL DEFAULT 'string',
  value_string TEXT NULL,
  value_number DECIMAL(18,6) NULL,
  value_date DATE NULL,
  value_bool TINYINT(1) NULL,
  value_json JSON NULL,
  source ENUM('manual','ocr','import','system') NOT NULL DEFAULT 'manual',
  confidence DECIMAL(4,3) NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_record_lookup (record_type, record_id),
  KEY idx_field_key (field_key),
  KEY idx_record_field (record_type, record_id, field_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `.trim();
}

async function migrate() {
  let failed = 0;
  let succeeded = 0;

  try {
    const [databases] = await pool.query("SHOW DATABASES LIKE 'om\\_church\\_%'");
    const dbNames = databases.map(row => Object.values(row)[0]);

    if (dbNames.length === 0) {
      console.log('No om_church_% databases found. Nothing to migrate.');
      process.exit(0);
    }

    console.log(`Found ${dbNames.length} church database(s) to migrate.\n`);

    for (const dbName of dbNames) {
      // Validate database name format
      if (!/^om_church_\d+$/.test(dbName)) {
        console.warn(`  ⚠️  Skipping unexpected database name: ${dbName}`);
        continue;
      }

      try {
        await pool.query(getCreateTableSQL(dbName));
        console.log(`  ✅ ${dbName} — record_supplements table ready`);
        succeeded++;
      } catch (err) {
        console.error(`  ❌ ${dbName} — FAILED: ${err.message}`);
        failed++;
      }
    }

    console.log(`\nMigration complete: ${succeeded} succeeded, ${failed} failed out of ${dbNames.length} databases.`);
  } catch (err) {
    console.error('Fatal error during migration:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

migrate();
