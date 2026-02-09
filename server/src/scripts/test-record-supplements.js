#!/usr/bin/env node
/**
 * Smoke test: CRUD cycle for record_supplements table.
 * Runs against a single known church DB.
 *
 * Guards:
 *   - Will NOT run if NODE_ENV === 'production' unless --force flag is passed.
 *
 * Usage:
 *   NODE_ENV=development node server/src/scripts/test-record-supplements.js
 *   node server/src/scripts/test-record-supplements.js --force
 */

// Load .env from server root
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
const forceFlag = process.argv.includes('--force');

if (isProduction && !forceFlag) {
  console.error('Refusing to run in production. Use --force to override.');
  process.exit(1);
}

const TEST_DB = process.env.TEST_CHURCH_DB || 'om_church_46';
const TEST_RECORD_TYPE = 'baptism';
const TEST_RECORD_ID = 99999; // High ID unlikely to collide with real data

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || process.env.DB_PASS,
  connectTimeout: 30000,
  waitForConnections: true,
  connectionLimit: 3,
  charset: 'utf8mb4',
});

const qt = `\`${TEST_DB}\`.\`record_supplements\``;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function run() {
  let insertedId;

  try {
    console.log(`\nSmoke test: record_supplements in ${TEST_DB}\n`);

    // 1. CREATE
    console.log('1. INSERT supplement...');
    const [insertResult] = await pool.execute(
      `INSERT INTO ${qt}
        (record_type, record_id, field_key, field_type, value_string, source, confidence, notes, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [TEST_RECORD_TYPE, TEST_RECORD_ID, 'test_field', 'string', 'Test Value', 'manual', 0.95, 'Smoke test entry', 1, 1]
    );
    insertedId = insertResult.insertId;
    assert(insertedId > 0, 'Insert should return a positive ID');
    console.log(`   ✅ Inserted ID: ${insertedId}`);

    // 2. READ
    console.log('2. SELECT supplement...');
    const [rows] = await pool.execute(
      `SELECT * FROM ${qt} WHERE id = ?`, [insertedId]
    );
    assert(rows.length === 1, 'Should find exactly one row');
    const row = rows[0];
    assert(row.record_type === TEST_RECORD_TYPE, `record_type should be ${TEST_RECORD_TYPE}`);
    assert(Number(row.record_id) === TEST_RECORD_ID, `record_id should be ${TEST_RECORD_ID}`);
    assert(row.field_key === 'test_field', 'field_key should be test_field');
    assert(row.value_string === 'Test Value', 'value_string should be Test Value');
    assert(row.source === 'manual', 'source should be manual');
    assert(Number(row.confidence) === 0.95, 'confidence should be 0.95');
    console.log('   ✅ Read back matches');

    // 3. UPDATE
    console.log('3. UPDATE supplement...');
    await pool.execute(
      `UPDATE ${qt} SET value_string = ?, notes = ?, updated_by = ? WHERE id = ? AND record_type = ? AND record_id = ?`,
      ['Updated Value', 'Updated by smoke test', 2, insertedId, TEST_RECORD_TYPE, TEST_RECORD_ID]
    );
    const [updatedRows] = await pool.execute(
      `SELECT * FROM ${qt} WHERE id = ?`, [insertedId]
    );
    assert(updatedRows[0].value_string === 'Updated Value', 'value_string should be Updated Value');
    assert(updatedRows[0].notes === 'Updated by smoke test', 'notes should be updated');
    console.log('   ✅ Update verified');

    // 4. DELETE
    console.log('4. DELETE supplement...');
    const [deleteResult] = await pool.execute(
      `DELETE FROM ${qt} WHERE id = ? AND record_type = ? AND record_id = ?`,
      [insertedId, TEST_RECORD_TYPE, TEST_RECORD_ID]
    );
    assert(deleteResult.affectedRows === 1, 'Should delete exactly one row');
    console.log('   ✅ Deleted');

    // 5. VERIFY DELETION
    console.log('5. VERIFY deletion...');
    const [gone] = await pool.execute(
      `SELECT * FROM ${qt} WHERE id = ?`, [insertedId]
    );
    assert(gone.length === 0, 'Row should be gone after delete');
    console.log('   ✅ Confirmed deleted');

    console.log('\n🎉 All smoke tests passed!\n');
  } catch (err) {
    console.error(`\n❌ Test failed: ${err.message}\n`);

    // Clean up test data if it was inserted
    if (insertedId) {
      try {
        await pool.execute(`DELETE FROM ${qt} WHERE id = ?`, [insertedId]);
        console.log('   (Cleaned up test row)');
      } catch { /* ignore cleanup errors */ }
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
