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
    
    res.json({
      status: dbStatus.success ? 'ok' : 'error',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: dbStatus,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      }
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
