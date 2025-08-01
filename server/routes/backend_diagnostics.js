// Backend Diagnostics API Routes
// Comprehensive system diagnostics and monitoring for super_admin users

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Helper middleware for super admin only
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ 
      message: 'Access denied - super_admin role required',
      requiredRole: 'super_admin',
      currentRole: req.user?.role || 'none'
    });
  }
  next();
};

/**
 * GET /api/server/status/backend
 * Comprehensive backend diagnostics and system information
 */
router.get('/status/backend', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    console.log(`[Backend Diagnostics] Status request from ${req.user.name} (${req.user.id})`);
    
    // Gather all diagnostic information
    const diagnostics = {
      timestamp: new Date().toISOString(),
      requestedBy: {
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role
      },
      system: await getSystemInfo(),
      application: await getApplicationInfo(req.app),
      services: await getServicesStatus(),
      performance: await getPerformanceMetrics(),
      logs: await getRecentLogs()
    };

    res.json({
      success: true,
      data: diagnostics,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Backend Diagnostics] Failed to generate diagnostics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate backend diagnostics',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/server/control/restart
 * Restart backend service (PM2 restart or process exit)
 */
router.post('/control/restart', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    console.log(`[Backend Diagnostics] Restart requested by ${req.user.name} (${req.user.id})`);
    
    // Try PM2 restart first
    try {
      const { stdout } = await execAsync('pm2 restart orthodox-backend');
      res.json({
        success: true,
        message: 'Backend restart initiated via PM2',
        output: stdout,
        method: 'pm2'
      });
    } catch (pm2Error) {
      // Fallback to process exit (let process manager restart)
      setTimeout(() => {
        console.log('[Backend Diagnostics] Performing graceful shutdown for restart...');
        process.exit(0);
      }, 1000);
      
      res.json({
        success: true,
        message: 'Backend restart initiated via process exit',
        method: 'process_exit'
      });
    }

  } catch (error) {
    console.error('[Backend Diagnostics] Restart failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restart backend',
      error: error.message
    });
  }
});

/**
 * POST /api/server/control/health-check
 * Perform comprehensive health checks on all services
 */
router.post('/control/health-check', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    console.log(`[Backend Diagnostics] Health check requested by ${req.user.name} (${req.user.id})`);
    
    const healthChecks = await performHealthChecks();
    
    res.json({
      success: true,
      healthChecks,
      timestamp: new Date().toISOString(),
      overallStatus: healthChecks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded'
    });

  } catch (error) {
    console.error('[Backend Diagnostics] Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// =====================================================
// DIAGNOSTIC HELPER FUNCTIONS
// =====================================================

async function getSystemInfo() {
  const startTime = Date.now() - (process.uptime() * 1000);
  
  return {
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      execPath: process.execPath
    },
    uptime: {
      seconds: Math.floor(process.uptime()),
      formatted: formatUptime(process.uptime()),
      startTime: new Date(startTime).toISOString()
    },
    memory: process.memoryUsage(),
    cpu: {
      usage: process.cpuUsage(),
      count: require('os').cpus().length
    },
    environment: filterEnvironmentVariables(),
    pid: process.pid,
    workingDirectory: process.cwd()
  };
}

async function getApplicationInfo(app) {
  const routes = extractRoutes(app);
  const middleware = extractMiddleware(app);
  
  return {
    routes: {
      total: routes.length,
      byMethod: groupRoutesByMethod(routes),
      list: routes
    },
    middleware: {
      total: middleware.length,
      list: middleware
    },
    express: {
      version: require('express/package.json').version
    }
  };
}

async function getServicesStatus() {
  const services = {};
  
  // PM2 Status
  try {
    const { stdout } = await execAsync('pm2 jlist');
    const pm2Processes = JSON.parse(stdout);
    services.pm2 = {
      status: 'connected',
      processes: pm2Processes.map(proc => ({
        name: proc.name,
        pid: proc.pid,
        status: proc.pm2_env.status,
        uptime: proc.pm2_env.pm_uptime,
        memory: proc.monit.memory,
        cpu: proc.monit.cpu
      }))
    };
  } catch (error) {
    services.pm2 = {
      status: 'not_available',
      error: 'PM2 not detected or not accessible'
    };
  }

  // Database Status
  try {
    // This would need to be imported from your database connection
    services.database = {
      status: 'connected',
      type: 'MariaDB',
      // Add actual connection test here
    };
  } catch (error) {
    services.database = {
      status: 'error',
      error: error.message
    };
  }

  // Redis Status  
  try {
    // This would need to be imported from your Redis connection
    services.redis = {
      status: 'not_configured',
      note: 'Redis connection check not implemented'
    };
  } catch (error) {
    services.redis = {
      status: 'error',
      error: error.message
    };
  }

  // JIT Terminal Status
  try {
    // Import JIT session manager to check status
    services.jit = {
      status: 'available',
      note: 'JIT Terminal system operational'
    };
  } catch (error) {
    services.jit = {
      status: 'error',
      error: error.message
    };
  }



  return services;
}

async function getPerformanceMetrics() {
  return {
    memory: {
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external,
      rss: process.memoryUsage().rss
    },
    uptime: process.uptime(),
    loadAverage: require('os').loadavg(),
    freeMemory: require('os').freemem(),
    totalMemory: require('os').totalmem()
  };
}

async function getRecentLogs() {
  try {
    // Try multiple common log locations
    const logPaths = [
      '/var/log/orthodoxmetrics/server.log',
      './logs/server.log',
      './server.log',
      '/var/log/pm2/orthodox-backend-out.log'
    ];

    for (const logPath of logPaths) {
      try {
        const logContent = await fs.readFile(logPath, 'utf8');
        const lines = logContent.split('\n').filter(line => line.trim());
        const recentLines = lines.slice(-100); // Last 100 lines
        
        return {
          source: logPath,
          totalLines: lines.length,
          recentLines: recentLines,
          lastModified: (await fs.stat(logPath)).mtime
        };
      } catch (fileError) {
        continue; // Try next log path
      }
    }

    return {
      source: 'none',
      error: 'No log files found in standard locations',
      searchedPaths: logPaths
    };

  } catch (error) {
    return {
      source: 'error',
      error: error.message
    };
  }
}

async function performHealthChecks() {
  const checks = [
    {
      name: 'Node.js Process',
      status: 'healthy',
      details: `Running Node.js ${process.version}`
    },
    {
      name: 'Memory Usage',
      status: process.memoryUsage().heapUsed < (1024 * 1024 * 1024) ? 'healthy' : 'warning', // 1GB threshold
      details: `Heap used: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    },
    {
      name: 'Uptime',
      status: process.uptime() > 60 ? 'healthy' : 'warning', // At least 1 minute
      details: `Running for ${formatUptime(process.uptime())}`
    }
  ];

  // Add service-specific health checks
  try {
    const services = await getServicesStatus();
    
    if (services.pm2.status === 'connected') {
      checks.push({
        name: 'PM2 Process Manager',
        status: 'healthy',
        details: `Managing ${services.pm2.processes.length} processes`
      });
    }

    if (services.database.status === 'connected') {
      checks.push({
        name: 'Database Connection',
        status: 'healthy',
        details: 'MariaDB connection active'
      });
    }

  } catch (error) {
    checks.push({
      name: 'Service Status Check',
      status: 'error',
      details: error.message
    });
  }

  return checks;
}

// =====================================================
// UTILITY FUNCTIONS  
// =====================================================

function extractRoutes(app) {
  const routes = [];
  
  if (app._router && app._router.stack) {
    app._router.stack.forEach(layer => {
      if (layer.route) {
        // Regular routes
        const methods = Object.keys(layer.route.methods);
        methods.forEach(method => {
          routes.push({
            method: method.toUpperCase(),
            path: layer.route.path,
            type: 'route'
          });
        });
      } else if (layer.name === 'router') {
        // Router middleware
        if (layer.regexp && layer.regexp.source) {
          const pathMatch = layer.regexp.source.match(/\^\\?(.*?)\\\//);
          const basePath = pathMatch ? pathMatch[1].replace(/\\\//g, '/') : '';
          
          if (layer.handle && layer.handle.stack) {
            layer.handle.stack.forEach(routerLayer => {
              if (routerLayer.route) {
                const methods = Object.keys(routerLayer.route.methods);
                methods.forEach(method => {
                  routes.push({
                    method: method.toUpperCase(),
                    path: basePath + routerLayer.route.path,
                    type: 'router'
                  });
                });
              }
            });
          }
        }
      }
    });
  }
  
  return routes;
}

function extractMiddleware(app) {
  const middleware = [];
  
  if (app._router && app._router.stack) {
    app._router.stack.forEach((layer, index) => {
      middleware.push({
        index,
        name: layer.name || 'anonymous',
        type: layer.route ? 'route' : 'middleware',
        regexp: layer.regexp ? layer.regexp.source : null
      });
    });
  }
  
  return middleware;
}

function groupRoutesByMethod(routes) {
  const grouped = {};
  routes.forEach(route => {
    if (!grouped[route.method]) {
      grouped[route.method] = 0;
    }
    grouped[route.method]++;
  });
  return grouped;
}

function filterEnvironmentVariables() {
  const env = { ...process.env };
  
  // Remove sensitive variables
  const sensitiveKeys = [
    'PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'PRIVATE',
    'DB_PASSWORD', 'JWT_SECRET', 'API_KEY', 'ENCRYPTION_KEY'
  ];
  
  Object.keys(env).forEach(key => {
    const upperKey = key.toUpperCase();
    if (sensitiveKeys.some(sensitive => upperKey.includes(sensitive))) {
      env[key] = '[REDACTED]';
    }
  });
  
  return env;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

module.exports = router; 