const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { formatTimestamp, formatTimestampUser } = require('../utils/formatTimestamp');
const BuildOutputParser = require('../utils/buildOutputParser');

// Apply authentication middleware
router.use(authMiddleware);
router.use(requireRole(['admin', 'super_admin']));

// Initialize build output parser
const buildParser = new BuildOutputParser();

// Build configuration and history storage paths
const BUILD_CONFIG_PATH = path.join(__dirname, '../data/build-config.json');
const BUILD_HISTORY_PATH = path.join(__dirname, '../data/build-history.json');
const BUILD_LOGS_DIR = path.join(__dirname, '../logs/builds');

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
    let config = DEFAULT_CONFIG;
    
    try {
      const configData = await fs.readFile(BUILD_CONFIG_PATH, 'utf8');
      config = { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
    } catch (error) {
      // Config file doesn't exist, use defaults
    }
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error loading build config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load build configuration'
    });
  }
});

// POST /api/build/config - Update build configuration
router.post('/config', async (req, res) => {
  try {
    const newConfig = { ...DEFAULT_CONFIG, ...req.body };
    
    await fs.writeFile(BUILD_CONFIG_PATH, JSON.stringify(newConfig, null, 2));
    
    res.json({
      success: true,
      config: newConfig
    });
  } catch (error) {
    console.error('Error saving build config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save build configuration'
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
  
  // Send initial message
  res.write(`data: ${JSON.stringify({
    type: 'start',
    message: `Starting build ${buildId}...`,
    buildId: buildId
  })}\n\n`);
  
  try {
    // Load current configuration
    let config = DEFAULT_CONFIG;
    try {
      const configData = await fs.readFile(BUILD_CONFIG_PATH, 'utf8');
      config = { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
    } catch (error) {
      // Use defaults
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
    const frontendPath = '/var/www/orthodmetrics/dev/front-end';
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
    const frontendPath = '/var/www/orthodmetrics/dev/front-end';
    
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