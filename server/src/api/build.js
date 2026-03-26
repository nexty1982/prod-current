const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { spawn, execSync } = require('child_process');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { formatTimestamp, formatTimestampUser } = require('../utils/formatTimestamp');
const BuildOutputParser = require('../utils/buildOutputParser');

// Apply authentication middleware
router.use(authMiddleware);
router.use(requireRole(['admin', 'super_admin']));

// Initialize build output parser
const buildParser = new BuildOutputParser();

// Build configuration and history storage paths
// __dirname is dist/api or src/api — go up two levels to reach the server root
const SERVER_ROOT = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(SERVER_ROOT, 'data');
const BUILD_CONFIG_PATH = path.join(DATA_DIR, 'build-config.json');
const BUILD_HISTORY_PATH = path.join(DATA_DIR, 'build-history.json');
const BUILD_LOGS_DIR = path.join(SERVER_ROOT, 'logs', 'builds');

// Ensure data directory exists before any file operations
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    if (error.code === 'EACCES' || error.code === 'EROFS') {
      throw new Error(`Cannot create data directory at ${DATA_DIR}: ${error.code}. Directory may be read-only.`);
    }
    throw error;
  }
}

// Ensure logs directory exists
async function ensureLogsDir() {
  try {
    await fs.mkdir(BUILD_LOGS_DIR, { recursive: true });
  } catch (error) {
    // Logs directory failure is non-critical, but log it
    if (error.code !== 'EEXIST') {
      console.error('Failed to create logs directory:', error.message);
    }
  }
}

// Initialize directories on module load
ensureDataDir().catch(err => {
  console.error('Failed to initialize data directory:', err.message);
});
ensureLogsDir();

// Default build configuration
const DEFAULT_CONFIG = {
  mode: 'full',
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
    await ensureDataDir();
    
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
      // Config file doesn't exist, use defaults (first run)
      if (error.code !== 'ENOENT') {
        console.warn('Error reading config file, using defaults:', error.message);
      }
    }
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error loading build config:', error.message);
    res.status(500).json({
      success: false,
      error: `Failed to load build configuration: ${error.message}`
    });
  }
});

// POST /api/build/config - Update build configuration
router.post('/config', async (req, res) => {
  try {
    await ensureDataDir();
    
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
    
    await fs.writeFile(BUILD_CONFIG_PATH, JSON.stringify(newConfig, null, 2));
    
    res.json({
      success: true,
      config: newConfig
    });
  } catch (error) {
    console.error('Error saving build config:', error.message);
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
    await ensureDataDir();
    
    let buildHistory = [];
    
    try {
      const historyData = await fs.readFile(BUILD_HISTORY_PATH, 'utf8');
      buildHistory = JSON.parse(historyData);
    } catch (error) {
      // History file doesn't exist yet (first run) - treat as empty array
      if (error.code !== 'ENOENT') {
        console.warn('Error reading build history:', error.message);
      }
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
    await ensureDataDir();
    
    let buildHistory = [];
    
    try {
      const historyData = await fs.readFile(BUILD_HISTORY_PATH, 'utf8');
      buildHistory = JSON.parse(historyData);
    } catch (error) {
      // History file doesn't exist yet (first run) - treat as empty array
      if (error.code !== 'ENOENT') {
        console.warn('Error reading build history:', error.message);
      }
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
    await ensureDataDir();
    
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
    await ensureDataDir();
    
    const { buildId } = req.params;
    
    // Load current build history
    let buildHistory = [];
    try {
      const historyData = await fs.readFile(BUILD_HISTORY_PATH, 'utf8');
      buildHistory = JSON.parse(historyData);
    } catch (error) {
      // History file doesn't exist (first run)
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          error: 'Build history not found'
        });
      }
      throw error;
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
        const { getAppPool } = require('../config/db');
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
        let target = 'om-frontend';
        const cmd = (row.command || '').toLowerCase();
        if (cmd.includes('be') || cmd.includes('server') || cmd.includes('backend')) target = 'om-server';
        if (cmd.includes('omai') || (meta.repo && meta.repo.includes('omai'))) {
          target = cmd.includes('server') || cmd.includes('be') ? 'omai-server' : 'omai-frontend';
        }
        if (cmd === 'all' || cmd === './scripts/om-deploy.sh') target = 'om-frontend';

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
    'om-frontend': null,
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
    await ensureDataDir();
    
    // Load current configuration
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
      // Use defaults if file doesn't exist (first run)
      if (error.code !== 'ENOENT') {
        console.warn('Error reading config, using defaults:', error.message);
      }
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
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  const buildStart = Date.now();
  const buildId = `stream_build_${buildStart}`;
  let buildOutput = '';
  
  // Send initial message
  res.write(`data: ${JSON.stringify({
    type: 'start',
    message: `Starting build ${buildId}...`,
    buildId: buildId
  })}\n\n`);
  
  try {
    await ensureDataDir();
    
    // Load current configuration
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
      // Use defaults if file doesn't exist (first run)
      if (error.code !== 'ENOENT') {
        console.warn('Error reading config, using defaults:', error.message);
      }
    }
    
    // Execute the build with streaming output
    const buildResult = await executeBuildWithStreaming(config, buildId, (data) => {
      buildOutput += data;
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
  
  res.end();
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Execute build (traditional method)
async function executeBuild(config, buildId) {
  return new Promise((resolve) => {
    // Use development environment path
    const frontendPath = '/var/www/orthodoxmetrics/dev/front-end';
    let output = '';
    let hasError = false;
    
    // Build the command based on configuration
    const args = ['run', 'build'];
    const env = {
      ...process.env,
      NODE_OPTIONS: `--max-old-space-size=${config.memory}`
    };
    
    if (config.legacyPeerDeps) {
      // For legacy peer deps, we need to run install first
      output += '📦 Installing dependencies with --legacy-peer-deps...\n';
    }
    
    output += `🔨 Starting full build...\n`;
    output += `💾 Memory limit: ${config.memory}MB\n`;
    
    if (config.dryRun) {
      output += '🔍 DRY RUN MODE - No actual build execution\n';
      resolve({
        success: true,
        output: output + '✅ Dry run completed successfully\n',
        duration: 1000
      });
      return;
    }
    
    const buildProcess = spawn('npm', args, {
      cwd: frontendPath,
      env: env,
      stdio: ['ignore', 'pipe', 'pipe']
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
    // Use development environment path
    const frontendPath = '/var/www/orthodoxmetrics/dev/front-end';
    
    // Build the command based on configuration
    const args = ['run', 'build'];
    const env = {
      ...process.env,
      NODE_OPTIONS: `--max-old-space-size=${config.memory}`
    };
    
    if (config.dryRun) {
      onData('🔍 DRY RUN MODE - No actual build execution\n');
      setTimeout(() => {
        onData('✅ Dry run completed successfully\n');
        resolve({ success: true });
      }, 1000);
      return;
    }
    
    onData(`🔨 Starting full build...\n`);
    onData(`💾 Memory limit: ${config.memory}MB\n`);
    
    const buildProcess = spawn('npm', args, {
      cwd: frontendPath,
      env: env,
      stdio: ['ignore', 'pipe', 'pipe']
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
    await ensureDataDir();
    await ensureLogsDir();
    
    let buildHistory = [];
    
    try {
      const historyData = await fs.readFile(BUILD_HISTORY_PATH, 'utf8');
      buildHistory = JSON.parse(historyData);
    } catch (error) {
      // History file doesn't exist yet (first run) - treat as empty array
      if (error.code !== 'ENOENT') {
        console.warn('Error reading build history:', error.message);
      }
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
    try {
      const buildLogPath = path.join(BUILD_LOGS_DIR, `${buildData.id}.log`);
      await fs.writeFile(buildLogPath, buildData.output || '');
    } catch (logError) {
      // Log file write failure is non-critical
      console.warn('Failed to save build log file:', logError.message);
    }
    
  } catch (error) {
    console.error('Failed to save build to history:', error.message);
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