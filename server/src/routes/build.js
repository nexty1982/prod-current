const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { spawn, execSync } = require('child_process');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { formatTimestamp, formatTimestampUser } = require('../utils/formatTimestamp');
const BuildOutputParser = require('../utils/buildOutputParser');

// Helper function to find npm executable (called dynamically to ensure PATH is available)
const findNpmPath = () => {
  const fsSync = require('fs');
  
  try {
    // Method 1: Try to find npm using which/where
    if (process.platform === 'win32') {
      try {
        const result = execSync('where npm', { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] });
        const npmPath = result.trim().split('\r\n')[0] || result.trim().split('\n')[0];
        if (npmPath && npmPath.trim() && fsSync.existsSync(npmPath.trim())) {
          console.log(`✅ Found npm at: ${npmPath.trim()}`);
          return npmPath.trim();
        }
      } catch (err) {
        // Continue to next method
      }
    } else {
      try {
        const npmPath = execSync('which npm', { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        if (npmPath && npmPath.trim() && fsSync.existsSync(npmPath.trim())) {
          console.log(`✅ Found npm at: ${npmPath.trim()}`);
          return npmPath.trim();
        }
      } catch (err) {
        // Continue to next method
      }
    }
    
    // Method 2: Try to find npm relative to node executable
    // npm is usually in the same directory as node
    const nodePath = process.execPath;
    const nodeDir = path.dirname(nodePath);
    const npmInNodeDir = path.join(nodeDir, process.platform === 'win32' ? 'npm.cmd' : 'npm');
    
    if (fsSync.existsSync(npmInNodeDir)) {
      console.log(`✅ Found npm at: ${npmInNodeDir}`);
      return npmInNodeDir;
    }
    
    // Method 3: Try common npm locations
    const commonPaths = [
      '/usr/bin/npm',
      '/usr/local/bin/npm',
      '/opt/homebrew/bin/npm',
      '/usr/local/node/bin/npm',
      'C:\\Program Files\\nodejs\\npm.cmd',
      'C:\\Program Files (x86)\\nodejs\\npm.cmd',
      path.join(process.env.HOME || process.env.USERPROFILE || '', '.nvm/versions/node', process.version, 'bin/npm'),
      path.join(process.env.HOME || process.env.USERPROFILE || '', '.nvm/versions/node', process.version.split('.')[0], 'bin/npm')
    ];
    
    for (const commonPath of commonPaths) {
      if (commonPath && fsSync.existsSync(commonPath)) {
        console.log(`✅ Found npm at: ${commonPath}`);
        return commonPath;
      }
    }
    
    // Method 4: Try using npx (more likely to be in PATH)
    try {
      if (process.platform === 'win32') {
        const result = execSync('where npx', { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] });
        const npxPath = result.trim().split('\r\n')[0] || result.trim().split('\n')[0];
        if (npxPath && npxPath.trim() && fsSync.existsSync(npxPath.trim())) {
          console.log(`⚠️ Using npx instead of npm: ${npxPath.trim()}`);
          return npxPath.trim();
        }
      } else {
        const npxPath = execSync('which npx', { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        if (npxPath && npxPath.trim() && fsSync.existsSync(npxPath.trim())) {
          console.log(`⚠️ Using npx instead of npm: ${npxPath.trim()}`);
          return npxPath.trim();
        }
      }
    } catch (err) {
      // Continue
    }
    
    // Final fallback - log warning but return npm
    console.warn('⚠️ Could not find npm in PATH or common locations');
    console.warn('⚠️ Using "npm" directly - this may fail if npm is not in PATH');
    console.warn('⚠️ Current PATH:', process.env.PATH || 'not set');
    return 'npm';
  } catch (error) {
    console.error('❌ Error finding npm:', error.message);
    console.warn('⚠️ Falling back to "npm" (may fail if not in PATH)');
    return 'npm';
  }
};

// Find npm path on module load
let NPM_PATH = findNpmPath();
console.log(`📦 Initial npm path: ${NPM_PATH}`);

// Also provide a function to refresh npm path (useful if PATH changes)
const refreshNpmPath = () => {
  NPM_PATH = findNpmPath();
  console.log(`📦 Refreshed npm path: ${NPM_PATH}`);
  return NPM_PATH;
};

// Apply authentication middleware
router.use(authMiddleware);
router.use(requireRole(['admin', 'super_admin']));

// Initialize build output parser
const buildParser = new BuildOutputParser();

// Build configuration and history storage paths
// In production, __dirname points to dist/routes/, so we need to go up to server root
// In development, __dirname points to src/routes/, so we need to go up to server root
// Both cases: go up two levels (routes/ -> src/ or dist/ -> server root)
const SERVER_ROOT = path.resolve(__dirname, '../..');
const BUILD_CONFIG_PATH = path.join(SERVER_ROOT, 'data', 'build-config.json');
const BUILD_HISTORY_PATH = path.join(SERVER_ROOT, 'data', 'build-history.json');
const BUILD_LOGS_DIR = path.join(SERVER_ROOT, 'logs', 'builds');

// Ensure required directories exist
const ensureDirectories = async () => {
  try {
    await fs.mkdir(path.dirname(BUILD_CONFIG_PATH), { recursive: true });
    await fs.mkdir(BUILD_LOGS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create build directories:', error);
  }
};
ensureDirectories();

// Default build configuration
const DEFAULT_CONFIG = {
  mode: 'full',
  buildTarget: 'frontend',
  buildPath: '/var/www/orthodoxmetrics/dev',
  memory: 4096,
  installPackage: '',
  legacyPeerDeps: true,
  skipInstall: false,
  dryRun: false
};

// =====================================================
// CONFIGURATION ENDPOINTS
// =====================================================

// GET /api/build/config - Get current build configuration
router.get('/config', async (req, res) => {
  try {
    let config = { ...DEFAULT_CONFIG };
    
    try {
      const configData = await fs.readFile(BUILD_CONFIG_PATH, 'utf8');
      const parsedConfig = JSON.parse(configData);
      config = { 
        ...DEFAULT_CONFIG, 
        ...parsedConfig,
        buildTarget: parsedConfig.buildTarget || DEFAULT_CONFIG.buildTarget || 'frontend'
      };
      
      // Validate buildTarget
      if (!['frontend', 'server', 'dual'].includes(config.buildTarget)) {
        config.buildTarget = 'frontend';
      }
    } catch (error) {
      // Config file doesn't exist, use defaults
      if (error.code !== 'ENOENT') {
        console.warn('Error reading config file, using defaults:', error.message);
      }
    }
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error loading build config:', error);
    res.status(500).json({
      success: false,
      error: `Failed to load build configuration: ${error.message}`
    });
  }
});

// POST /api/build/config - Update build configuration
router.post('/config', async (req, res) => {
  try {
    // Ensure directories exist
    await ensureDirectories();
    
    // Merge with defaults to ensure all required fields are present
    const newConfig = { 
      ...DEFAULT_CONFIG, 
      ...req.body,
      buildTarget: req.body.buildTarget || DEFAULT_CONFIG.buildTarget || 'frontend'
    };
    
    // Validate buildTarget
    if (!['frontend', 'server', 'dual'].includes(newConfig.buildTarget)) {
      newConfig.buildTarget = 'frontend';
    }

    // Validate buildPath - must be an absolute path, no command injection
    if (newConfig.buildPath && (typeof newConfig.buildPath !== 'string' || !path.isAbsolute(newConfig.buildPath) || /[;&|`$]/.test(newConfig.buildPath))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid build path. Must be an absolute path without shell metacharacters.'
      });
    }

    await fs.writeFile(BUILD_CONFIG_PATH, JSON.stringify(newConfig, null, 2));
    
    res.json({
      success: true,
      config: newConfig
    });
  } catch (error) {
    console.error('Error saving build config:', error);
    res.status(500).json({
      success: false,
      error: `Failed to save build configuration: ${error.message}`
    });
  }
});

// =====================================================
// HISTORY ENDPOINTS  
// =====================================================

// GET /api/build/logs - Get build history logs
router.get('/logs', async (req, res) => {
  try {
    let buildHistory = [];
    
    try {
      const historyData = await fs.readFile(BUILD_HISTORY_PATH, 'utf8');
      buildHistory = JSON.parse(historyData);
    } catch (error) {
      // History file doesn't exist yet
    }
    
    // Sort by most recent first and limit to last 50 builds
    buildHistory = buildHistory
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50)
      .map(build => ({
        ...build,
        timestampFormatted: formatTimestampUser(build.timestamp),
        durationFormatted: formatDuration(build.duration || 0)
      }));
    
    res.json({
      success: true,
      logs: buildHistory
    });
  } catch (error) {
    console.error('Error loading build history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load build history'
    });
  }
});

// GET /api/build/meta - Get build metadata and statistics
router.get('/meta', async (req, res) => {
  try {
    let buildHistory = [];
    
    try {
      const historyData = await fs.readFile(BUILD_HISTORY_PATH, 'utf8');
      buildHistory = JSON.parse(historyData);
    } catch (error) {
      // History file doesn't exist yet
    }
    
    const totalBuilds = buildHistory.length;
    const successfulBuilds = buildHistory.filter(b => b.success).length;
    const failedBuilds = totalBuilds - successfulBuilds;
    const averageDuration = totalBuilds > 0 
      ? buildHistory.reduce((sum, b) => sum + (b.duration || 0), 0) / totalBuilds 
      : 0;
    
    const lastBuild = buildHistory.length > 0 
      ? buildHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
      : null;
    
    const meta = {
      totalBuilds,
      successfulBuilds,
      failedBuilds,
      successRate: totalBuilds > 0 ? ((successfulBuilds / totalBuilds) * 100).toFixed(1) : 0,
      averageDuration: Math.round(averageDuration),
      averageDurationFormatted: formatDuration(averageDuration),
      lastBuild: lastBuild ? {
        ...lastBuild,
        timestampFormatted: formatTimestampUser(lastBuild.timestamp),
        durationFormatted: formatDuration(lastBuild.duration || 0)
      } : null
    };
    
    res.json({
      success: true,
      meta
    });
  } catch (error) {
    console.error('Error loading build metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load build metadata'
    });
  }
});

// DELETE /api/build/history - Clear all build history
router.delete('/history', async (req, res) => {
  try {
    // Clear build history file
    await fs.writeFile(BUILD_HISTORY_PATH, '[]');
    
    // Clear build logs directory
    try {
      const files = await fs.readdir(BUILD_LOGS_DIR);
      await Promise.all(
        files.map(file => 
          fs.unlink(path.join(BUILD_LOGS_DIR, file)).catch(err => 
            console.warn(`Failed to delete log file ${file}:`, err)
          )
        )
      );
    } catch (error) {
      console.warn('Failed to clear build logs directory:', error);
    }
    
    res.json({
      success: true,
      message: 'Build history cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing build history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear build history'
    });
  }
});

// DELETE /api/build/history/:buildId - Delete specific build entry
router.delete('/history/:buildId', async (req, res) => {
  try {
    const { buildId } = req.params;
    
    // Load current build history
    let buildHistory = [];
    try {
      const historyData = await fs.readFile(BUILD_HISTORY_PATH, 'utf8');
      buildHistory = JSON.parse(historyData);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Build history not found'
      });
    }
    
    // Find and remove the specific build
    const initialLength = buildHistory.length;
    buildHistory = buildHistory.filter(build => build.id !== buildId);
    
    if (buildHistory.length === initialLength) {
      return res.status(404).json({
        success: false,
        error: 'Build not found'
      });
    }
    
    // Save updated history
    await fs.writeFile(BUILD_HISTORY_PATH, JSON.stringify(buildHistory, null, 2));
    
    // Delete associated log file if exists
    try {
      const logFile = path.join(BUILD_LOGS_DIR, `${buildId}.log`);
      await fs.unlink(logFile);
    } catch (error) {
      // Log file might not exist, which is okay
    }
    
    res.json({
      success: true,
      message: `Build ${buildId} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting build:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete build'
    });
  }
});

// =====================================================
// INDIVIDUAL BUILD LOG
// =====================================================

// GET /api/build/logs/:buildId - Get log output for a specific build
router.get('/logs/:buildId', async (req, res) => {
  try {
    const { buildId } = req.params;
    const logFile = path.join(BUILD_LOGS_DIR, `${buildId}.log`);

    try {
      const output = await fs.readFile(logFile, 'utf8');
      return res.json({ success: true, output });
    } catch (fileErr) {
      // Log file doesn't exist — check if the history entry has inline output
      try {
        const historyData = await fs.readFile(BUILD_HISTORY_PATH, 'utf8');
        const history = JSON.parse(historyData);
        const entry = history.find(b => b.id === buildId);
        if (entry && entry.output) {
          return res.json({ success: true, output: entry.output });
        }
      } catch { /* no history file */ }

      return res.json({ success: false, output: '' });
    }
  } catch (error) {
    console.error('Error loading build log:', error);
    res.status(500).json({ success: false, error: 'Failed to load build log' });
  }
});

// =====================================================
// WATCH-ALL SSE (multi-build tracking)
// =====================================================

// In-memory registry for builds triggered via run-stream on this server
const activeSseBuilds = new Map();

// GET /api/build/watch-all - SSE endpoint to track all running builds
router.get('/watch-all', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send heartbeat immediately
  res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);

  // Track log tailing offsets per build target
  const tailOffsets = {};

  const poll = async () => {
    try {
      // 1. Check build_runs table for CLI-triggered builds (via om-deploy.sh)
      let dbBuilds = [];
      try {
        const { getAppPool } = require('../config/db-compat');
        const [rows] = await getAppPool().query(
          `SELECT run_id, origin, command, status, started_at, ended_at, meta_json
           FROM build_runs
           WHERE status = 'running'
              OR (status IN ('success','failed') AND ended_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE))
           ORDER BY started_at DESC LIMIT 10`
        );
        dbBuilds = rows;
      } catch { /* DB not available or table missing */ }

      // 2. Check active-builds.json file (for builds from OMAI runtime)
      let fileBuilds = [];
      try {
        const activeManifest = path.join(SERVER_ROOT, 'data', 'active-builds.json');
        const data = await fs.readFile(activeManifest, 'utf8');
        const parsed = JSON.parse(data);
        // Expire stale entries (30 min)
        fileBuilds = (Array.isArray(parsed) ? parsed : [])
          .filter(b => (Date.now() - b.startedAt) < 30 * 60 * 1000);
      } catch { /* file doesn't exist */ }

      // 3. Check activeSseBuilds (in-process builds from run-stream)
      const sseBuilds = Array.from(activeSseBuilds.values());

      // Merge all sources into unified build list
      const builds = [];
      const seenTargets = new Set();

      // DB builds (from om-deploy.sh)
      for (const row of dbBuilds) {
        const meta = typeof row.meta_json === 'string' ? JSON.parse(row.meta_json || '{}') : (row.meta_json || {});
        // Map origin/command to a target key
        let target = 'om-frontend';
        const cmd = (row.command || '').toLowerCase();
        if (cmd.includes('be') || cmd.includes('server') || cmd.includes('backend')) target = 'om-server';
        if (cmd.includes('omai') || (meta.repo && meta.repo.includes('omai'))) {
          target = cmd.includes('server') || cmd.includes('be') ? 'omai-server' : 'omai-frontend';
        }
        if (cmd === 'all' || cmd === './scripts/om-deploy.sh') target = 'om-frontend'; // default

        if (!seenTargets.has(target)) {
          seenTargets.add(target);
          builds.push({
            id: row.run_id,
            target,
            startedAt: new Date(row.started_at).getTime(),
            status: row.status === 'running' ? 'running' : 'done',
            success: row.status === 'success',
            label: `${row.origin} · ${row.command}`,
          });
        }
      }

      // File-based active builds
      for (const fb of fileBuilds) {
        const target = fb.target || 'om-frontend';
        if (!seenTargets.has(target)) {
          seenTargets.add(target);
          builds.push({
            id: fb.id,
            target,
            startedAt: fb.startedAt,
            status: fb.status === 'running' ? 'running' : 'done',
            success: fb.status === 'success',
            label: fb.label || target,
          });
        }
      }

      // SSE in-process builds
      for (const sb of sseBuilds) {
        if (!seenTargets.has(sb.target)) {
          seenTargets.add(sb.target);
          builds.push(sb);
        }
      }

      // Send builds update
      res.write(`data: ${JSON.stringify({ type: 'builds', builds })}\n\n`);

      // 4. Tail log files for running builds
      for (const b of builds.filter(x => x.status === 'running')) {
        const logFile = path.join(BUILD_LOGS_DIR, `${b.id}.log`);
        try {
          const content = await fs.readFile(logFile, 'utf8');
          const prevOffset = tailOffsets[b.target] || 0;
          if (content.length > prevOffset) {
            const newData = content.slice(prevOffset);
            tailOffsets[b.target] = content.length;
            res.write(`data: ${JSON.stringify({ type: 'output', target: b.target, data: newData })}\n\n`);
          }
        } catch { /* log file not yet created */ }
      }
    } catch (err) {
      // Non-fatal — keep SSE alive
      console.error('[watch-all] poll error:', err.message);
    }
  };

  // Poll immediately and then every 2 seconds
  await poll();
  const interval = setInterval(poll, 2000);

  // Heartbeat every 15s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(interval);
    clearInterval(heartbeat);
  });
});

// =====================================================
// SERVICE RESTART
// =====================================================

// POST /api/build/restart - Restart a service (no rebuild)
router.post('/restart', async (req, res) => {
  const { target } = req.body;
  if (!target) return res.status(400).json({ success: false, error: 'Missing target' });

  const serviceMap = {
    'om-frontend': null, // Frontend has no service to restart — it's static files
    'om-server': 'orthodox-backend',
    'omai-frontend': null,
    'omai-server': 'omai',
  };

  const service = serviceMap[target];
  if (service === undefined) {
    return res.status(400).json({ success: false, error: `Unknown target: ${target}` });
  }
  if (!service) {
    return res.status(400).json({ success: false, error: `${target} is a static frontend — no service to restart` });
  }

  try {
    execSync(`sudo systemctl restart ${service}`, { timeout: 15000 });
    res.json({ success: true, message: `${service} restarted successfully` });
  } catch (err) {
    console.error(`Failed to restart ${service}:`, err.message);
    res.status(500).json({ success: false, error: `Failed to restart ${service}: ${err.message}` });
  }
});

// =====================================================
// BUILD EXECUTION ENDPOINTS
// =====================================================

// POST /api/build/run - Execute build (traditional method)
router.post('/run', async (req, res) => {
  try {
    // Load current configuration
    let config = DEFAULT_CONFIG;
    try {
      const configData = await fs.readFile(BUILD_CONFIG_PATH, 'utf8');
      config = { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
    } catch (error) {
      // Use defaults
    }
    
    const buildStart = Date.now();
    const buildId = `build_${buildStart}`;
    
    // Execute the build
    const buildResult = await executeBuild(config, buildId);
    
    // Save build to history
    // Parse and categorize build output
    const categorizedData = buildParser.parse(
      buildResult.output || '',
      buildResult.success,
      Date.now() - buildStart
    );

    await saveBuildToHistory({
      id: buildId,
      timestamp: new Date(buildStart).toISOString(),
      duration: Date.now() - buildStart,
      success: buildResult.success,
      config: config,
      output: buildResult.output || '',
      error: buildResult.error || null,
      triggeredBy: req.session?.user?.email || 'unknown',
      categorizedData: categorizedData // Store categorized data
    });
    
    res.json({
      success: buildResult.success,
      buildResult: {
        ...buildResult,
        categorizedData: categorizedData // Include in response
      },
      buildId: buildId
    });
    
  } catch (error) {
    console.error('Build execution failed:', error);
    res.status(500).json({
      success: false,
      error: 'Build execution failed',
      buildResult: {
        success: false,
        error: error.message,
        output: `Build failed: ${error.message}`
      }
    });
  }
});

// GET /api/build/run-stream - Server-Sent Events endpoint for streaming builds
router.get('/run-stream', async (req, res) => {
  const approvalRequestId = req.query.approvalRequestId || null;

  // If approvalRequestId provided, validate and mark as running
  if (approvalRequestId) {
    try {
      const { getAppPool } = require('../config/db-compat');
      const [[approval]] = await getAppPool().query(
        'SELECT * FROM build_approval_requests WHERE request_id = ?',
        [approvalRequestId]
      );
      if (!approval || !['approved', 'queued'].includes(approval.status)) {
        return res.status(403).json({ success: false, error: `Build not authorized. Status: ${approval?.status || 'not found'}` });
      }
      await getAppPool().query(
        'UPDATE build_approval_requests SET status = ? WHERE request_id = ?',
        ['running', approvalRequestId]
      );
    } catch (err) {
      console.error('Approval validation error:', err);
      // Non-blocking — proceed with build even if approval tracking fails
    }
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  const buildStart = Date.now();
  const sseTarget = req.query.target || 'om-frontend';
  const buildId = `stream_build_${buildStart}`;
  let buildOutput = '';
  let frontendOutput = '';
  let serverOutput = '';

  // Register in activeSseBuilds so watch-all can track it
  activeSseBuilds.set(sseTarget, {
    id: buildId, target: sseTarget, startedAt: buildStart, status: 'running', success: false, label: `Console · ${sseTarget}`,
  });

  // Write live output to a log file so watch-all can tail it
  const liveLogPath = path.join(BUILD_LOGS_DIR, `${buildId}.log`);
  const appendLog = async (text) => {
    try { await fs.appendFile(liveLogPath, text); } catch { /* non-critical */ }
  };
  
  try {
    // Load current configuration
    let config = DEFAULT_CONFIG;
    try {
      const configData = await fs.readFile(BUILD_CONFIG_PATH, 'utf8');
      config = { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
    } catch (error) {
      // Use defaults
    }
    
    // Check if dual build
    if (config.buildTarget === 'dual') {
      // Send initial message for dual build
      res.write(`data: ${JSON.stringify({
        type: 'start',
        message: `Starting dual build (frontend + server) ${buildId}...`,
        buildId: buildId
      })}\n\n`);
      
      // Execute both builds in parallel
      const frontendConfig = { ...config, buildTarget: 'frontend' };
      const serverConfig = { ...config, buildTarget: 'server' };
      
      const [frontendResult, serverResult] = await Promise.allSettled([
        executeBuildWithStreaming(frontendConfig, `${buildId}_frontend`, (data) => {
          frontendOutput += data;
          res.write(`data: ${JSON.stringify({
            type: 'output',
            target: 'frontend',
            data: data
          })}\n\n`);
        }),
        executeBuildWithStreaming(serverConfig, `${buildId}_server`, (data) => {
          serverOutput += data;
          res.write(`data: ${JSON.stringify({
            type: 'output',
            target: 'server',
            data: data
          })}\n\n`);
        })
      ]);
      
      // Handle frontend completion
      const frontendSuccess = frontendResult.status === 'fulfilled' && frontendResult.value.success;
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        target: 'frontend',
        success: frontendSuccess,
        duration: Date.now() - buildStart,
        buildId: `${buildId}_frontend`
      })}\n\n`);
      
      // Handle server completion
      const serverSuccess = serverResult.status === 'fulfilled' && serverResult.value.success;
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        target: 'server',
        success: serverSuccess,
        duration: Date.now() - buildStart,
        buildId: `${buildId}_server`
      })}\n\n`);
      
      // Overall completion
      const overallSuccess = frontendSuccess && serverSuccess;
      buildOutput = `=== FRONTEND BUILD ===\n${frontendOutput}\n\n=== SERVER BUILD ===\n${serverOutput}`;
      
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        success: overallSuccess,
        duration: Date.now() - buildStart,
        buildId: buildId
      })}\n\n`);
      
      // Save build to history
      await saveBuildToHistory({
        id: buildId,
        timestamp: new Date(buildStart).toISOString(),
        duration: Date.now() - buildStart,
        success: overallSuccess,
        config: config,
        output: buildOutput,
        error: overallSuccess ? null : 'One or more builds failed',
        triggeredBy: req.session?.user?.email || 'unknown',
        categorizedData: null // Dual builds don't use categorized data
      });
    } else {
      // Single build (frontend or server)
      res.write(`data: ${JSON.stringify({
        type: 'start',
        message: `Starting build ${buildId}...`,
        buildId: buildId
      })}\n\n`);
      
      // Execute the build with streaming output
      const buildResult = await executeBuildWithStreaming(config, buildId, (data) => {
        buildOutput += data;
        appendLog(data);
        res.write(`data: ${JSON.stringify({
          type: 'output',
          data: data
        })}\n\n`);
      });
      
      // Send completion message
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        success: buildResult.success,
        duration: Date.now() - buildStart,
        buildId: buildId
      })}\n\n`);
      
      // Parse and categorize build output for streaming
      const categorizedData = buildParser.parse(
        buildOutput,
        buildResult.success,
        Date.now() - buildStart
      );

      // Save build to history
      await saveBuildToHistory({
        id: buildId,
        timestamp: new Date(buildStart).toISOString(),
        duration: Date.now() - buildStart,
        success: buildResult.success,
        buildTarget: sseTarget,
        config: config,
        output: buildOutput,
        error: buildResult.error || null,
        triggeredBy: req.session?.user?.email || 'unknown',
        categorizedData: categorizedData
      });

      // Send categorized data to client
      res.write(`data: ${JSON.stringify({
        type: 'categorized',
        categorizedData: categorizedData
      })}\n\n`);
    }

    // Update approval request with build result
    if (approvalRequestId) {
      try {
        const { getAppPool } = require('../config/db-compat');
        const finalStatus = buildOutput.includes('✅') ? 'completed' : 'failed';
        await getAppPool().query(
          `UPDATE build_approval_requests SET status = ?, build_id = ?, build_success = ?, build_duration = ? WHERE request_id = ?`,
          [finalStatus, buildId, finalStatus === 'completed' ? 1 : 0, Date.now() - buildStart, approvalRequestId]
        );
      } catch (err) { console.error('Failed to update approval request:', err); }
    }

  } catch (error) {
    console.error('Streaming build failed:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      data: `Build failed: ${error.message}`,
      error: error.message
    })}\n\n`);

    res.write(`data: ${JSON.stringify({
      type: 'complete',
      success: false,
      duration: Date.now() - buildStart,
      buildId: buildId
    })}\n\n`);
  }

  // Deregister from activeSseBuilds (mark done briefly so watch-all sees the result)
  const finalSuccess = buildOutput.includes('✅');
  activeSseBuilds.set(sseTarget, {
    id: buildId, target: sseTarget, startedAt: buildStart, status: 'done', success: finalSuccess, label: `Console · ${sseTarget}`,
  });
  setTimeout(() => activeSseBuilds.delete(sseTarget), 60000); // Remove after 60s

  res.end();
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Execute build (traditional method)
async function executeBuild(config, buildId) {
  return new Promise((resolve) => {
    // Determine build path based on target
    const buildTarget = config.buildTarget || 'frontend';
    const basePath = config.buildPath || '/var/www/orthodoxmetrics/dev';
    const buildPath = buildTarget === 'server'
      ? path.join(basePath, 'server')
      : path.join(basePath, 'front-end');
    
    // Verify build path exists
    const fsSync = require('fs');
    if (!fsSync.existsSync(buildPath)) {
      const errorMsg = `Build path does not exist: ${buildPath}`;
      console.error(`❌ ${errorMsg}`);
      resolve({
        success: false,
        output: `❌ ${errorMsg}\nPlease ensure the build directory exists.`,
        error: errorMsg
      });
      return;
    }
    
    let output = '';
    let hasError = false;
    
    // Build the command based on configuration
    const args = ['run', 'build'];
    const env = {
      ...process.env,
      NODE_OPTIONS: `--max-old-space-size=${config.memory}`
    };
    
    output += `🎯 Build Target: ${buildTarget === 'server' ? 'Server (server/package.json)' : 'Frontend (front-end/package.json)'}\n`;
    
    if (config.legacyPeerDeps && buildTarget === 'frontend') {
      // For legacy peer deps, we need to run install first (frontend only)
      output += '📦 Installing dependencies with --legacy-peer-deps...\n';
    }
    
    output += `🔨 Starting ${buildTarget} build...\n`;
    output += `💾 Memory limit: ${config.memory}MB\n`;
    output += `📁 Working directory: ${buildPath}\n`;
    
    if (config.dryRun) {
      output += '🔍 DRY RUN MODE - No actual build execution\n';
      resolve({
        success: true,
        output: output + '✅ Dry run completed successfully\n',
        duration: 1000
      });
      return;
    }
    
    // Refresh npm path before each build in case PATH changed
    const currentNpmPath = refreshNpmPath();
    
    // Verify npm path exists before spawning
    if (currentNpmPath !== 'npm' && !fsSync.existsSync(currentNpmPath)) {
      console.warn(`⚠️ npm path ${currentNpmPath} does not exist, trying to find npm again...`);
      const refreshedPath = refreshNpmPath();
      if (refreshedPath === 'npm' || !fsSync.existsSync(refreshedPath)) {
        output += `\n❌ ERROR: Cannot find npm executable. Please ensure npm is installed and in PATH.\n`;
        output += `   Searched paths: ${currentNpmPath}\n`;
        output += `   Current PATH: ${process.env.PATH || 'not set'}\n`;
        resolve({
          success: false,
          output: output,
          error: 'npm executable not found'
        });
        return;
      }
    }
    
    const buildProcess = spawn(currentNpmPath, args, {
      cwd: buildPath,
      env: {
        ...env,
        PATH: process.env.PATH || '' // Ensure PATH is passed to child process
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32' // Use shell on Windows
    });
    
    buildProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    buildProcess.stderr.on('data', (data) => {
      const errorData = data.toString();
      output += errorData;
      
      // Only treat actual errors as failures, not warnings
      if (errorData.toLowerCase().includes('error:') || 
          errorData.toLowerCase().includes('failed') ||
          errorData.toLowerCase().includes('cannot resolve') ||
          errorData.toLowerCase().includes('module not found')) {
        hasError = true;
      }
    });
    
    buildProcess.on('close', (code) => {
      // Exit code 0 means success, regardless of warnings in stderr
      const success = code === 0;
      output += success 
        ? '\n✅ Build completed successfully!' 
        : `\n❌ Build failed with exit code: ${code}`;
      
      resolve({
        success: success,
        output: output,
        error: !success ? `Build failed with exit code: ${code}` : null
      });
    });
    
    buildProcess.on('error', (error) => {
      resolve({
        success: false,
        output: output + `\n❌ Failed to start build process: ${error.message}`,
        error: error.message
      });
    });
  });
}

// Execute build with streaming output
async function executeBuildWithStreaming(config, buildId, onData) {
  return new Promise((resolve) => {
    // Determine build path based on target
    const buildTarget = config.buildTarget || 'frontend';
    const basePath = config.buildPath || '/var/www/orthodoxmetrics/dev';
    const buildPath = buildTarget === 'server'
      ? path.join(basePath, 'server')
      : path.join(basePath, 'front-end');
    
    // Verify build path exists
    const fsSync = require('fs');
    if (!fsSync.existsSync(buildPath)) {
      const errorMsg = `Build path does not exist: ${buildPath}`;
      onData(`❌ ${errorMsg}\n`);
      onData(`Please ensure the build directory exists.\n`);
      resolve({
        success: false,
        error: errorMsg
      });
      return;
    }
    
    // Build the command based on configuration
    const args = ['run', 'build'];
    const env = {
      ...process.env,
      NODE_OPTIONS: `--max-old-space-size=${config.memory}`
    };
    
    onData(`🎯 Build Target: ${buildTarget === 'server' ? 'Server (server/package.json)' : 'Frontend (front-end/package.json)'}\n`);
    
    if (config.dryRun) {
      onData('🔍 DRY RUN MODE - No actual build execution\n');
      setTimeout(() => {
        onData('✅ Dry run completed successfully\n');
        resolve({ success: true });
      }, 1000);
      return;
    }
    
    // Refresh npm path before each build in case PATH changed
    const currentNpmPath = refreshNpmPath();
    
    // Verify npm path exists before spawning
    if (currentNpmPath !== 'npm' && !fsSync.existsSync(currentNpmPath)) {
      console.warn(`⚠️ npm path ${currentNpmPath} does not exist, trying to find npm again...`);
      const refreshedPath = refreshNpmPath();
      if (refreshedPath === 'npm' || !fsSync.existsSync(refreshedPath)) {
        onData(`\n❌ ERROR: Cannot find npm executable. Please ensure npm is installed and in PATH.\n`);
        onData(`   Searched paths: ${currentNpmPath}\n`);
        onData(`   Current PATH: ${process.env.PATH || 'not set'}\n`);
        resolve({
          success: false,
          error: 'npm executable not found'
        });
        return;
      }
    }
    
    onData(`🔨 Starting ${buildTarget} build...\n`);
    onData(`💾 Memory limit: ${config.memory}MB\n`);
    onData(`📁 Working directory: ${buildPath}\n`);
    onData(`📦 Using npm: ${currentNpmPath}\n`);
    
    const buildProcess = spawn(currentNpmPath, args, {
      cwd: buildPath,
      env: {
        ...env,
        PATH: process.env.PATH || '' // Ensure PATH is passed to child process
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32' // Use shell on Windows
    });
    
    buildProcess.stdout.on('data', (data) => {
      onData(data.toString());
    });
    
    buildProcess.stderr.on('data', (data) => {
      onData(data.toString());
      // Don't automatically mark as error - let exit code determine success
    });
    
    buildProcess.on('close', (code) => {
      // Exit code 0 means success, regardless of stderr output
      const success = code === 0;
      const message = success 
        ? '\n✅ Build completed successfully!' 
        : `\n❌ Build failed with exit code: ${code}`;
      
      onData(message);
      
      resolve({
        success: success,
        error: !success ? `Build failed with exit code: ${code}` : null
      });
    });
    
    buildProcess.on('error', (error) => {
      onData(`\n❌ Failed to start build process: ${error.message}`);
      resolve({
        success: false,
        error: error.message
      });
    });
  });
}

// Save build result to history
async function saveBuildToHistory(buildData) {
  try {
    let buildHistory = [];
    
    try {
      const historyData = await fs.readFile(BUILD_HISTORY_PATH, 'utf8');
      buildHistory = JSON.parse(historyData);
    } catch (error) {
      // History file doesn't exist yet, start with empty array
    }
    
    // Add new build to history
    buildHistory.push(buildData);
    
    // Keep only the last 100 builds to prevent file size growth
    buildHistory = buildHistory
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 100);
    
    // Save back to file
    await fs.writeFile(BUILD_HISTORY_PATH, JSON.stringify(buildHistory, null, 2));
    
    // Also save individual build log file
    const buildLogPath = path.join(BUILD_LOGS_DIR, `${buildData.id}.log`);
    await fs.writeFile(buildLogPath, buildData.output || '');
    
  } catch (error) {
    console.error('Failed to save build to history:', error);
  }
}

// Format duration in milliseconds to human readable format
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

module.exports = router;