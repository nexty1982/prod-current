/**
 * Platform Status API — Read-only DB health from dedicated DB VM
 * GET /api/platform/status — Returns live MariaDB health metrics
 */

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { authMiddleware, requireRole } = require('../middleware/auth');

const DB_HOST = process.env.DB_HOST || '192.168.1.241';
const SSH_TIMEOUT_MS = 8000;
const HEALTH_SCRIPT = '/usr/local/bin/om-db-health.sh';

/**
 * GET /api/platform/status
 * Executes om-db-health.sh --json on the DB VM via SSH and returns parsed results
 */
router.get('/status', authMiddleware, requireRole('super_admin'), async (req, res) => {
  const startTime = Date.now();

  try {
    const dbHealth = await getDbHealth();
    const elapsed = Date.now() - startTime;

    res.json({
      status: dbHealth.status || 'ok',
      timestamp: new Date().toISOString(),
      response_time_ms: elapsed,
      database: dbHealth
    });
  } catch (error) {
    console.error('[Platform Status] Failed to get DB health:', error.message);
    const elapsed = Date.now() - startTime;

    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      response_time_ms: elapsed,
      error: error.message,
      database: null
    });
  }
});

function getDbHealth() {
  return new Promise((resolve, reject) => {
    const cmd = `ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=no next@${DB_HOST} "sudo ${HEALTH_SCRIPT} --json" 2>/dev/null`;

    const child = exec(cmd, { timeout: SSH_TIMEOUT_MS }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          return reject(new Error('Health check timed out'));
        }
        return reject(new Error(`Health check failed: ${error.message}`));
      }

      try {
        const data = JSON.parse(stdout.trim());
        resolve(data);
      } catch (parseErr) {
        reject(new Error(`Invalid JSON from health script: ${parseErr.message}`));
      }
    });
  });
}

module.exports = router;
