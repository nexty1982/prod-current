#!/usr/bin/env node
/**
 * prune-snapshots.js — Retention cleanup for platform_status_snapshots
 *
 * Deletes rows older than RETENTION_DAYS (default 30).
 * Designed to run via cron: node /var/www/orthodoxmetrics/prod/server/src/maintenance/prune-snapshots.js
 *
 * Safe: read-only table, append-only writes — this only removes old rows.
 * Logs deleted count to stdout for cron mail / journalctl.
 */

const mysql = require('mysql2/promise');
const path = require('path');

const RETENTION_DAYS = 30;

async function run() {
  // Load .env from server root
  const envPath = path.resolve(__dirname, '../../.env');
  try { require('dotenv').config({ path: envPath }); } catch (_) { /* dotenv optional */ }

  const pool = await mysql.createPool({
    host: process.env.DB_HOST || '192.168.1.241',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'orthodoxapps',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'orthodoxmetrics_db',
    connectionLimit: 1,
  });

  try {
    const [result] = await pool.query(
      `DELETE FROM platform_status_snapshots WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [RETENTION_DAYS]
    );

    const deleted = result.affectedRows;
    const ts = new Date().toISOString();

    if (deleted > 0) {
      console.log(`[${ts}] prune-snapshots: deleted ${deleted} rows older than ${RETENTION_DAYS} days`);
    } else {
      console.log(`[${ts}] prune-snapshots: no rows to prune (retention=${RETENTION_DAYS}d)`);
    }
  } finally {
    await pool.end();
  }
}

run().catch(err => {
  console.error(`[${new Date().toISOString()}] prune-snapshots: FAILED —`, err.message);
  process.exit(1);
});
