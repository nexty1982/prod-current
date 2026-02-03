const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

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

module.exports = router;
