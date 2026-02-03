const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { promisePool } = require('../config/db');

// Read version from package.json
let baseVersion = '1.0.0';
try {
  const packagePath = path.join(__dirname, '../../package.json');
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    baseVersion = pkg.version || '1.0.0';
  }
} catch (e) {
  console.error('Failed to read package.json version:', e.message);
}

// Append -dev suffix in non-production environments
const environment = process.env.NODE_ENV || 'development';
const packageVersion = environment === 'production' ? baseVersion : `${baseVersion}-dev`;

/**
 * GET /api/system/version
 * Returns server version and build information
 */
router.get('/version', (req, res) => {
  const gitSha = process.env.GIT_SHA || process.env.VITE_GIT_SHA || 'unknown';
  const buildTime = process.env.BUILD_TIME || new Date().toISOString();
  const nodeVersion = process.version;
  const environment = process.env.NODE_ENV || 'development';
  
  res.json({
    success: true,
    server: {
      version: packageVersion,
      gitSha: gitSha.length > 7 ? gitSha.substring(0, 7) : gitSha,
      gitShaFull: gitSha,
      buildTime: buildTime,
      nodeVersion: nodeVersion,
      environment: environment,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/system/health
 * Basic health check
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/system/status
 * 3-Point Check: Compare MariaDB version vs package.json versions
 */
router.get('/status', async (req, res) => {
  try {
    // 1. Get version from MariaDB (source of truth)
    let dbInfo = null;
    try {
      const [rows] = await promisePool.query(
        'SELECT version_string, build_status, last_git_sha, last_build_time, maintenance_mode, node_version, environment, app_name FROM system_info WHERE id = 1'
      );
      dbInfo = rows[0] || null;
    } catch (dbError) {
      console.error('Failed to query system_info:', dbError.message);
    }

    // 2. Get versions from package.json files
    const pkgVersions = {};
    const pkgPaths = {
      root: path.join(__dirname, '../../../package.json'),
      server: path.join(__dirname, '../../package.json'),
      frontend: path.join(__dirname, '../../../front-end/package.json')
    };

    for (const [key, pkgPath] of Object.entries(pkgPaths)) {
      try {
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          pkgVersions[key] = pkg.version || 'unknown';
        } else {
          pkgVersions[key] = 'not found';
        }
      } catch (e) {
        pkgVersions[key] = 'error';
      }
    }

    // 3. Determine sync status
    const dbVersion = dbInfo?.version_string || 'unknown';
    const allMatch = Object.values(pkgVersions).every(v => v === dbVersion);
    const syncStatus = allMatch ? 'SYNCED' : 'MISMATCH';

    // 4. Build response
    res.json({
      success: true,
      status: syncStatus,
      database: {
        version: dbVersion,
        buildStatus: dbInfo?.build_status || 'UNKNOWN',
        lastGitSha: dbInfo?.last_git_sha || null,
        lastBuildTime: dbInfo?.last_build_time || null,
        maintenanceMode: dbInfo?.maintenance_mode === 1,
        nodeVersion: dbInfo?.node_version || null,
        environment: dbInfo?.environment || 'unknown',
        appName: dbInfo?.app_name || 'OrthodoxMetrics'
      },
      packages: {
        root: pkgVersions.root,
        server: pkgVersions.server,
        frontend: pkgVersions.frontend
      },
      runtime: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        uptime: Math.round(process.uptime()),
        gitSha: process.env.GIT_SHA || 'unknown'
      },
      checks: {
        dbMatchesRoot: dbVersion === pkgVersions.root,
        dbMatchesServer: dbVersion === pkgVersions.server,
        dbMatchesFrontend: dbVersion === pkgVersions.frontend,
        allSynced: allMatch
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /api/system/status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system status',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
