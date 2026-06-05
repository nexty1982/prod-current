/**
 * Migration: add notes column to every church DB.
 *
 * Adds to baptism_records / marriage_records / funeral_records across all
 * om_church_## databases:
 *   - notes      TEXT NULL
 *
 * Idempotent (ADD COLUMN IF NOT EXISTS) — safe to re-run.
 *
 * Run:  node server/database/migrations/2026-06-05-add-notes-column.js
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
           ADD COLUMN IF NOT EXISTS \`notes\` TEXT NULL`
      );
      result.tables[table] = 'ok';
    } catch (err) {
      result.tables[table] = `ERROR: ${err.message}`;
    }
  }
  return result;
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: +(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || process.env.DB_PASS,
    database: process.env.DB_NAME || 'orthodoxmetrics_db',
  });

  try {
    const [churches] = await conn.query(
      `SELECT id, name, database_name FROM churches
        WHERE database_name IS NOT NULL AND database_name <> ''
        ORDER BY id`
    );
    console.log(`Found ${churches.length} church database(s) to migrate.\n`);

    const summary = [];
    for (const c of churches) {
      summary.push({ church: c.id, name: c.name, db: c.database_name, ...(await addColumns(conn, c.database_name)) });
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
