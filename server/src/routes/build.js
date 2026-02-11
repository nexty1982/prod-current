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
  let frontendOutput = '';
  let serverOutput = '';
  
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
    const basePath = '/var/www/orthodoxmetrics/dev';
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
    const basePath = '/var/www/orthodoxmetrics/dev';
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