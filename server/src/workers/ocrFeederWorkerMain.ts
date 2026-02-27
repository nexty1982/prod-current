/**
 * OCR Feeder Worker — Standalone Entrypoint (Phase 7.1)
 *
 * Run as a dedicated systemd service (om-ocr-worker.service).
 * Loads environment, acquires a MySQL advisory lock to prevent
 * duplicate workers, then starts the polling loop.
 *
 * Usage:
 *   node dist/workers/ocrFeederWorkerMain.js
 *
 * Signals:
 *   SIGTERM / SIGINT → graceful shutdown (finish current job, then exit)
 */

// Load environment before anything else
import * as path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

import { workerLoop, requestShutdown } from './ocrFeederWorker';

// ── DB lock for singleton guard ─────────────────────────────────────────────

const LOCK_NAME = 'om_ocr_worker';
const LOCK_TIMEOUT_SEC = 1;

async function acquireLock(): Promise<boolean> {
  const { promisePool } = require('../config/db');
  try {
    const [rows] = await promisePool.query(
      `SELECT GET_LOCK(?, ?) AS acquired`,
      [LOCK_NAME, LOCK_TIMEOUT_SEC],
    );
    const acquired = rows[0]?.acquired === 1;
    if (!acquired) {
      console.error(`OCR_WORKER_LOCK_FAILED Another worker instance holds lock '${LOCK_NAME}'. Exiting.`);
    }
    return acquired;
  } catch (err: any) {
    console.error(`OCR_WORKER_LOCK_ERROR ${err.message}`);
    return false;
  }
}

async function releaseLock(): Promise<void> {
  try {
    const { promisePool } = require('../config/db');
    await promisePool.query(`SELECT RELEASE_LOCK(?)`, [LOCK_NAME]);
    console.log('OCR_WORKER_LOCK_RELEASED');
  } catch (_) {
    // Best-effort; MySQL releases on disconnect anyway
  }
}

// ── Signal handlers ─────────────────────────────────────────────────────────

let shuttingDown = false;

function handleSignal(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`OCR_WORKER_SIGNAL ${signal} — requesting graceful shutdown...`);
  requestShutdown();

  // Safety timeout: if the loop doesn't exit within 30s, force exit
  setTimeout(() => {
    console.error('OCR_WORKER_FORCE_EXIT Shutdown timeout exceeded (30s)');
    process.exit(1);
  }, 30000).unref();
}

process.on('SIGTERM', () => handleSignal('SIGTERM'));
process.on('SIGINT', () => handleSignal('SIGINT'));

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`OCR_WORKER_MAIN_START pid=${process.pid} env=${process.env.NODE_ENV || 'production'}`);

  // 1. Acquire singleton lock
  const locked = await acquireLock();
  if (!locked) {
    process.exit(1);
  }
  console.log(`OCR_WORKER_LOCK_ACQUIRED lock='${LOCK_NAME}'`);

  // 2. Run worker loop (blocks until shutdown requested)
  try {
    await workerLoop();
  } catch (err: any) {
    console.error(`OCR_WORKER_FATAL ${err.message}`);
    await releaseLock();
    process.exit(1);
  }

  // 3. Clean up
  await releaseLock();
  console.log('OCR_WORKER_MAIN_EXIT graceful shutdown complete');
  process.exit(0);
}

main();
