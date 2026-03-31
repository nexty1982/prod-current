#!/usr/bin/env node
/**
 * Translation Management System — Seed & Data Migration
 *
 * 1. Seeds translations_source from ENGLISH_DEFAULTS in i18n.js
 * 2. Migrates ui_translations → translations_localized with status derivation
 * 3. Preserves all existing translation content
 *
 * Safe to re-run (uses INSERT IGNORE / ON DUPLICATE KEY UPDATE).
 *
 * Usage: node server/database/migrations/20260328_seed_translation_tables.js
 */

const crypto = require('crypto');
const path = require('path');

function md5(text) {
  return crypto.createHash('md5').update(text, 'utf8').digest('hex');
}

async function main() {
  // Load DB pool
  // Load credentials from .env
  const envPath = path.join(__dirname, '../../.env');
  const envContent = require('fs').readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }

  const mysql = require(path.join(__dirname, '../../node_modules/mysql2/promise'));
  const pool = mysql.createPool({
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT || '3306'),
    user: env.DB_USER || 'orthodoxapps',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'orthodoxmetrics_db',
    waitForConnections: true,
    connectionLimit: 5,
    charset: 'utf8mb4',
  });

  try {
    // ─── 1. Extract ENGLISH_DEFAULTS from i18n.js ──────────────────
    console.log('─── Step 1: Extracting ENGLISH_DEFAULTS from i18n.js ───');
    const fs = require('fs');
    const i18nPath = path.join(__dirname, '../../src/routes/i18n.js');
    const content = fs.readFileSync(i18nPath, 'utf8');
    const match = content.match(/const ENGLISH_DEFAULTS = (\{[\s\S]*?\n\});/);
    if (!match) throw new Error('Could not extract ENGLISH_DEFAULTS from i18n.js');

    const defaults = eval('(' + match[1] + ')');
    const entries = Object.entries(defaults);
    console.log(`  Found ${entries.length} English keys`);

    // ─── 2. Seed translations_source ────────────────────────────────
    console.log('─── Step 2: Seeding translations_source ───');
    let sourceInserted = 0;
    let sourceUpdated = 0;

    // Batch insert in chunks of 50
    const CHUNK_SIZE = 50;
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE);
      const placeholders = chunk.map(() => '(?, ?, ?, ?)').join(', ');
      const values = [];
      for (const [key, text] of chunk) {
        const ns = key.split('.')[0];
        const hash = md5(text);
        values.push(key, ns, text, hash);
      }

      const [result] = await pool.query(
        `INSERT INTO translations_source (translation_key, namespace, english_text, english_hash)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE
           english_text = VALUES(english_text),
           english_hash = VALUES(english_hash),
           namespace = VALUES(namespace)`,
        values
      );
      // affectedRows: 1 per insert, 2 per update (MySQL convention)
      sourceInserted += result.affectedRows;
    }
    console.log(`  Upserted ${entries.length} source keys (affected rows: ${sourceInserted})`);

    // ─── 3. Migrate ui_translations → translations_localized ────────
    console.log('─── Step 3: Migrating ui_translations → translations_localized ───');

    // Build hash lookup from translations_source
    const [sourceRows] = await pool.query(
      'SELECT translation_key, english_hash FROM translations_source'
    );
    const hashMap = {};
    for (const row of sourceRows) {
      hashMap[row.translation_key] = row.english_hash;
    }
    console.log(`  Hash map built: ${Object.keys(hashMap).length} keys`);

    // Read all existing ui_translations
    const [uiRows] = await pool.query(
      'SELECT translation_key, lang_code, translation_text FROM ui_translations'
    );
    console.log(`  Found ${uiRows.length} rows in ui_translations`);

    let localizedInserted = 0;
    let orphanedKeys = 0;

    for (let i = 0; i < uiRows.length; i += CHUNK_SIZE) {
      const chunk = uiRows.slice(i, i + CHUNK_SIZE);
      const placeholders = chunk.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const values = [];

      for (const row of chunk) {
        const sourceHash = hashMap[row.translation_key] || null;
        // If the source key exists, mark as 'review' (needs human verification)
        // If the source key doesn't exist, still import as 'review'
        const status = sourceHash ? 'review' : 'review';
        if (!sourceHash) orphanedKeys++;

        values.push(
          row.translation_key,
          row.lang_code,
          row.translation_text,
          sourceHash, // translated_from_hash — set to current hash (will be marked review for verification)
          status
        );
      }

      const [result] = await pool.query(
        `INSERT INTO translations_localized (translation_key, language_code, translated_text, translated_from_hash, status)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE
           translated_text = VALUES(translated_text),
           translated_from_hash = VALUES(translated_from_hash),
           status = VALUES(status)`,
        values
      );
      localizedInserted += result.affectedRows;
    }
    console.log(`  Migrated ${uiRows.length} translations (affected rows: ${localizedInserted})`);
    if (orphanedKeys > 0) {
      console.log(`  ⚠ ${orphanedKeys} translations have no matching source key`);
    }

    // ─── 4. Summary ─────────────────────────────────────────────────
    console.log('\n─── Migration Summary ───');
    const [srcCount] = await pool.query('SELECT COUNT(*) as c FROM translations_source');
    const [locCount] = await pool.query('SELECT COUNT(*) as c FROM translations_localized');
    const [logCount] = await pool.query('SELECT COUNT(*) as c FROM translation_change_log');

    console.log(`  translations_source:    ${srcCount[0].c} rows`);
    console.log(`  translations_localized: ${locCount[0].c} rows`);
    console.log(`  translation_change_log: ${logCount[0].c} rows`);

    // Check status distribution
    const [statusDist] = await pool.query(
      'SELECT status, COUNT(*) as c FROM translations_localized GROUP BY status'
    );
    console.log('  Status distribution:', statusDist.map(r => `${r.status}=${r.c}`).join(', '));

    // Check language distribution
    const [langDist] = await pool.query(
      'SELECT language_code, COUNT(*) as c FROM translations_localized GROUP BY language_code'
    );
    console.log('  Language distribution:', langDist.map(r => `${r.language_code}=${r.c}`).join(', '));

    console.log('\n✅ Migration complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
