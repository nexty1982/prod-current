/**
 * Utility Endpoints
 * Miscellaneous inline endpoints extracted from index.ts.
 * Includes: dropdown-options, config, search, health, system/version,
 *           system/config, OMAI status/fix compatibility endpoints.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// GET /api/dropdown-options — Static dropdown options for forms
router.get('/dropdown-options', (req: any, res: any) => {
  res.json({
    countries: ['United States', 'Canada', 'Greece', 'Romania', 'Russia'],
    states: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA'],
    languages: ['en', 'gr', 'ru', 'ro'],
    roles: ['admin', 'priest', 'supervisor', 'volunteer', 'viewer', 'church'],
    recordTypes: ['baptism', 'marriage', 'funeral']
  });
});

// GET /api/config — App configuration
router.get('/config', (req: any, res: any) => {
  res.json({
    appName: 'OrthodoxMetrics',
    version: '1.0.0',
    supportedLanguages: ['en', 'gr', 'ru', 'ro'],
    features: {
      certificates: true,
      invoices: true,
      calendar: true
    }
  });
});

// GET /api/search — Basic search placeholder
router.get('/search', (req: any, res: any) => {
  const { q, type } = req.query;
  res.json({
    query: q,
    type: type || 'all',
    results: [],
    message: 'Search functionality not yet implemented'
  });
});

// GET /api/health — Healthcheck (auth-optional)
router.get('/health', async (req: any, res: any) => {
  try {
    const db = require('../config/db');
    const dbStatus = await db.testConnection();
    res.json({
      status: dbStatus.success ? 'ok' : 'error',
      user: req.session.user || null,
      database: dbStatus
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/system/version — Server + frontend build info
router.get('/system/version', (req: any, res: any) => {
  let gitSha = process.env.GIT_SHA || 'unknown';
  if (gitSha === 'unknown') {
    try {
      const { execSync } = require('child_process');
      gitSha = execSync('git rev-parse --short=7 HEAD', { cwd: path.resolve(__dirname, '..'), timeout: 3000 }).toString().trim();
    } catch (_) { /* git not available or not a repo */ }
  }

  let packageVersion = '1.0.0';
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
    packageVersion = pkg.version || '1.0.0';
  } catch (_) {}

  res.json({
    success: true,
    server: {
      version: packageVersion,
      gitSha: gitSha.length > 7 ? gitSha.substring(0, 7) : gitSha,
      gitShaFull: gitSha,
      buildTime: process.env.BUILD_TIME || null,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    },
    timestamp: new Date().toISOString()
  });
});

// GET /api/system/config — Current configuration (redacted, admin/dev only)
router.get('/system/config', (req: any, res: any) => {
  try {
    const isAdmin = req.session?.user?.role === 'super_admin' || req.session?.user?.role === 'admin';
    const isDev = process.env.NODE_ENV === 'development';

    if (!isAdmin && !isDev) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.'
      });
    }

    const { formatConfigForLog } = require('../config/redact');
    let serverConfig: any;
    try {
      serverConfig = require('../config');
    } catch (_) {
      serverConfig = {};
    }

    res.json({
      success: true,
      config: formatConfigForLog ? formatConfigForLog(serverConfig) : serverConfig,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to load configuration',
      message: err.message
    });
  }
});

// GET /api/status — OMAI status check for frontend
router.get('/status', async (req: any, res: any) => {
  try {
    const { getOMAIHealth } = require('/var/www/orthodoxmetrics/prod/misc/omai/services/index.js');
    const health = await getOMAIHealth();

    res.json({
      success: true,
      status: health.status,
      version: '1.0.0',
      activeAgents: health.components?.agents || [],
      timestamp: health.timestamp,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error: any) {
    console.error('OMAI status check failed:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// POST /api/fix — OMAI fix endpoint for frontend
router.post('/fix', async (req: any, res: any) => {
  try {
    const { route, component, issues, props, currentCode, errorDetails } = req.body;

    console.log(`[OMAI] Fix request from user ${req.user?.id || 'unknown'} for component ${component}`);

    res.json({
      success: true,
      suggestion: `Fix for ${component} component`,
      codeDiff: '',
      explanation: 'This is a placeholder fix response. AI fix functionality will be implemented.',
      confidence: 0.8,
      estimatedTime: '5 minutes',
      requiresManualReview: true
    });
  } catch (error: any) {
    console.error('OMAI fix failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
export {};
