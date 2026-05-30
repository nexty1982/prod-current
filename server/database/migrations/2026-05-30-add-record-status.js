/**
 * Migration: add record status + verification columns to every church DB.
 *
 * Adds to baptism_records / marriage_records / funeral_records across all
 * om_church_## databases:
 *   - status      VARCHAR(30) NOT NULL DEFAULT 'Recorded'
 *   - verified_by INT NULL            (baptism already has it)
 *   - verified_at DATETIME NULL       (baptism already has it)
 *
 * Then back-fills status='Verified' for any record that already has
 * verified_at set. Idempotent (ADD COLUMN IF NOT EXISTS) — safe to re-run.
 *
 * Run:  node server/database/migrations/2026-05-30-add-record-status.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const RECORD_TABLES = ['baptism_records', 'marriage_records', 'funeral_records'];

async function tableExists(conn, dbName, table) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ? LIMIT 1`,
    [dbName, table]
  );
  return rows.length > 0;
}

// Phase 1: add the columns (idempotent). Kept separate from the back-fill so a
// no-op ADD COLUMN IF NOT EXISTS can't leave stale column metadata on the
// connection used for the follow-up UPDATE (a MariaDB re-run quirk).
async function addColumns(conn, dbName) {
  const result = { db: dbName, tables: {} };
  for (const table of RECORD_TABLES) {
    try {
      if (!(await tableExists(conn, dbName, table))) {
        result.tables[table] = 'skipped (no table)';
        continue;
      }
      await conn.query(
        `ALTER TABLE \`${dbName}\`.\`${table}\`
           ADD COLUMN IF NOT EXISTS \`status\` VARCHAR(30) NOT NULL DEFAULT 'Recorded'`
      );
      if (table !== 'baptism_records') {
        await conn.query(
          `ALTER TABLE \`${dbName}\`.\`${table}\`
             ADD COLUMN IF NOT EXISTS \`verified_by\` INT NULL,
             ADD COLUMN IF NOT EXISTS \`verified_at\` DATETIME NULL`
        );
      }
      result.tables[table] = 'ok';
    } catch (err) {
      result.tables[table] = `ERROR: ${err.message}`;
    }
  }
  return result;
}

// Phase 2 (fresh connection): an already-verified record should read 'Verified'.
async function backfillStatus(conn, dbName, result) {
  for (const table of RECORD_TABLES) {
    if (String(result.tables[table]).startsWith('ERROR') || result.tables[table] === 'skipped (no table)') continue;
    try {
      const [upd] = await conn.query(
        `UPDATE \`${dbName}\`.\`${table}\`
            SET \`status\` = 'Verified'
          WHERE \`verified_at\` IS NOT NULL AND (\`status\` IS NULL OR \`status\` = 'Recorded')`
      );
      result.tables[table] = `ok (verified back-filled: ${upd.affectedRows})`;
    } catch (err) {
      result.tables[table] = `ok (back-fill skipped: ${err.message})`;
    }
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: +(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || process.env.DB_PASS,
    database: process.env.DB_NAME || 'orthodoxmetrics_db',
    multipleStatements: false,
  });

  try {
    const [churches] = await conn.query(
      `SELECT id, name, database_name FROM churches
        WHERE database_name IS NOT NULL AND database_name <> ''
        ORDER BY id`
    );
    console.log(`Found ${churches.length} church database(s) to migrate.\n`);

    // Phase 1: add columns.
    const summary = [];
    for (const c of churches) {
      summary.push({ church: c.id, name: c.name, db: c.database_name, ...(await addColumns(conn, c.database_name)) });
    }

    // Phase 2: back-fill verified status on a fresh connection (avoids the
    // stale-metadata quirk after no-op ADD COLUMN on re-runs).
    const conn2 = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || process.env.DB_PASS,
      database: process.env.DB_NAME || 'orthodoxmetrics_db',
    });
    try {
      for (const s of summary) await backfillStatus(conn2, s.db, s);
    } finally {
      await conn2.end();
    }

    for (const s of summary) {
      console.log(`[church ${s.church}] ${s.db}`);
      for (const [t, status] of Object.entries(s.tables)) console.log(`    ${t.padEnd(18)} ${status}`);
    }

    const failures = summary.filter((s) =>
      Object.values(s.tables).some((v) => String(v).startsWith('ERROR'))
    );
    console.log(`\nDone. ${churches.length} DB(s) processed, ${failures.length} with errors.`);
    process.exitCode = failures.length ? 1 : 0;
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
