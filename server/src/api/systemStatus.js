/**
 * System Status API
 * Provides system information for admin HUD
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { promisePool } = require('../config/db');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// ============================================================================
// PUBLIC HEALTH CHECK ENDPOINT - NO AUTHENTICATION REQUIRED
// ============================================================================
// This endpoint is intentionally public and bypassed in auth middleware
// (see server/src/middleware/auth.js PUBLIC_SYSTEM_ROUTES allowlist).
//
// Used by:
// - External monitoring systems (Pingdom, UptimeRobot, etc.)
// - Kubernetes liveness/readiness probes
// - Docker health checks
// - Load balancer health checks
// - Frontend health polling
//
// Returns: System health metrics (status, uptime, database, memory)
// Auth: NONE - Bypassed via auth middleware allowlist
// Security: Safe - No sensitive data, read-only, aggregated metrics only
//
// DO NOT add auth middleware to this endpoint!
// DO NOT remove from auth middleware allowlist!
// ============================================================================
router.get('/health', async (req, res) => {
  try {
    // Import db module for connection test
    const db = require('../config/db');
    const dbStatus = await db.testConnection();
    const memoryUsage = process.memoryUsage();
    
    // OCR worker status (lightweight — just service + pending count)
    let ocrStatus = null;
    try {
      const { stdout: workerStdout } = await execAsync('systemctl is-active om-ocr-worker 2>/dev/null || echo "inactive"');
      const workerUp = workerStdout.trim() === 'active';
      const [pendingRows] = await promisePool.query("SELECT COUNT(*) AS cnt FROM ocr_jobs WHERE status = 'pending'");
      ocrStatus = { worker: workerUp ? 'running' : 'stopped', pending_jobs: pendingRows[0]?.cnt || 0 };
    } catch { /* non-fatal */ }

    res.json({
      status: dbStatus.success ? 'ok' : 'error',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: dbStatus,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      },
      ...(ocrStatus && { ocr: ocrStatus }),
    });
  } catch (err) {
    // NEVER throw - always return a response
    res.status(500).json({ 
      status: 'error', 
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/system/status - Get system status information (AUTH REQUIRED)
router.get('/status', requireAuth, async (req, res) => {
  try {
    // Only allow super_admin access
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Super Admin only' });
    }

    // Get church count
    const [churchRows] = await promisePool.query('SELECT COUNT(*) as count FROM churches');
    const churchCount = churchRows[0]?.count || 0;

    // Get git SHA (if available)
    let gitSha = 'N/A';
    let gitBranch = 'N/A';
    try {
      const { stdout: sha } = await execAsync('git rev-parse HEAD');
      gitSha = sha.trim();
      
      const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD');
      gitBranch = branch.trim();
    } catch (err) {
      // Git not available or not a git repo
    }

    // Get version from package.json
    let version = 'Unknown';
    try {
      const packageJson = require('../../package.json');
      version = packageJson.version || 'Unknown';
    } catch (err) {
      // package.json not found
    }

    // Get environment
    const environment = process.env.NODE_ENV || 'development';

    // Get uptime
    const uptime = process.uptime();
    const uptimeFormatted = formatUptime(uptime);

    // Check for version mismatch (placeholder logic)
    // You can implement actual version checking logic here
    const versionMismatch = false;

    res.json({
      success: true,
      version_string: version,
      last_git_sha: gitSha,
      git_branch: gitBranch,
      church_count: churchCount,
      version_mismatch: versionMismatch,
      uptime: uptimeFormatted,
      environment: environment,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('Error fetching system status:', err);
    res.status(500).json({ 
      error: 'Failed to fetch system status',
      message: err.message 
    });
  }
});

// ============================================================================
// OCR HEALTH CHECK — Admin-only OCR subsystem health
// ============================================================================
router.get('/ocr/health', requireAuth, async (req, res) => {
  try {
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const checks = {};

    // 1. Worker status — check systemd service
    try {
      const { stdout } = await execAsync('systemctl is-active om-ocr-worker 2>/dev/null || echo "inactive"');
      checks.worker_status = stdout.trim() === 'active' ? 'running' : 'stopped';
    } catch {
      checks.worker_status = 'unknown';
    }

    // 2. Pending/processing job counts
    const [jobCounts] = await promisePool.query(
      `SELECT status, COUNT(*) AS cnt FROM ocr_jobs WHERE status IN ('pending','processing','failed','error') GROUP BY status`
    );
    const counts = {};
    for (const r of jobCounts) counts[r.status] = r.cnt;
    checks.pending_jobs = counts.pending || 0;
    checks.processing_jobs = counts.processing || 0;
    checks.failed_jobs = (counts.failed || 0) + (counts.error || 0);

    // 3. Stale jobs — processing for over 10 minutes (use last_activity_at if available)
    const [staleRows] = await promisePool.query(
      `SELECT id, church_id, COALESCE(last_activity_at, started_at, created_at) AS last_seen
       FROM ocr_jobs
       WHERE status = 'processing'
         AND COALESCE(last_activity_at, started_at, created_at) < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`
    );
    checks.stale_jobs = staleRows.length;
    checks.stale_job_ids = staleRows.map(r => r.id);

    // 4. Average processing time (last 24h completed jobs)
    const [avgRows] = await promisePool.query(
      `SELECT AVG(TIMESTAMPDIFF(SECOND, created_at, COALESCE(completed_at, last_activity_at))) AS avg_seconds
       FROM ocr_jobs WHERE status IN ('complete','completed') AND completed_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );
    checks.avg_processing_time_seconds = avgRows[0]?.avg_seconds ? Math.round(avgRows[0].avg_seconds) : null;

    // 5. Storage writable
    const fs = require('fs');
    const storagePath = require('path').join(__dirname, '../../storage/feeder');
    try {
      fs.accessSync(storagePath, fs.constants.W_OK);
      checks.storage_writable = true;
    } catch {
      checks.storage_writable = false;
    }

    // 6. Oldest pending job
    const [oldestRows] = await promisePool.query(
      `SELECT id, created_at FROM ocr_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1`
    );
    checks.oldest_pending_job = oldestRows.length
      ? { id: oldestRows[0].id, waiting_since: oldestRows[0].created_at }
      : null;

    // 7. Jobs completed last 24h
    const [completedRows] = await promisePool.query(
      `SELECT COUNT(*) AS cnt FROM ocr_jobs WHERE status IN ('complete','completed') AND completed_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );
    checks.completed_last_24h = completedRows[0]?.cnt || 0;

    // Overall status
    const isHealthy = checks.worker_status === 'running' && checks.stale_jobs === 0 && checks.storage_writable;
    const isDegraded = checks.worker_status === 'running' && (checks.stale_jobs > 0 || !checks.storage_writable);

    res.json({
      status: isHealthy ? 'healthy' : isDegraded ? 'degraded' : 'unhealthy',
      timestamp: new Date().toISOString(),
      ...checks,
    });
  } catch (err) {
    console.error('OCR health check error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ============================================================================
// STALE JOB RECOVERY — Auto-reset stuck OCR jobs
// ============================================================================
router.post('/ocr/recover-stale', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Super Admin only' });
    }

    const thresholdMinutes = parseInt(req.body.threshold_minutes) || 10;

    // Find stale jobs
    const [staleJobs] = await promisePool.query(
      `SELECT id, church_id, COALESCE(last_activity_at, started_at, created_at) AS last_seen
       FROM ocr_jobs
       WHERE status = 'processing'
         AND COALESCE(last_activity_at, started_at, created_at) < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [thresholdMinutes]
    );

    if (staleJobs.length === 0) {
      return res.json({ recovered: 0, message: 'No stale jobs found' });
    }

    // Reset to pending
    const ids = staleJobs.map(j => j.id);
    const [updateResult] = await promisePool.query(
      `UPDATE ocr_jobs SET status = 'pending', last_activity_at = NOW()
       WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    // Log recovery
    console.log(`[OCR Recovery] Reset ${updateResult.affectedRows} stale jobs: ${ids.join(', ')}`);

    // Log to system_logs
    try {
      await promisePool.query(
        `INSERT INTO system_logs (level, source, message, metadata) VALUES ('warn', 'ocr-recovery', ?, ?)`,
        [`Recovered ${updateResult.affectedRows} stale OCR jobs`, JSON.stringify({ job_ids: ids, threshold_minutes: thresholdMinutes })]
      );
    } catch { /* non-fatal */ }

    res.json({
      recovered: updateResult.affectedRows,
      job_ids: ids,
      message: `Reset ${updateResult.affectedRows} stale jobs to queued`,
    });
  } catch (err) {
    console.error('OCR stale recovery error:', err);
    res.status(500).json({ error: 'Failed to recover stale jobs' });
  }
});

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

module.exports = router;
