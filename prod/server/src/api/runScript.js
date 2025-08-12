// server/routes/runScript.js
// Secure Script Runner API for Orthodox Metrics
// Allows super_admin and admin users to execute pre-approved scripts

const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Whitelisted scripts - only these can be executed for security
const SCRIPTS = {
  'convertOCR': {
    name: 'Convert OCR Data',
    description: 'Convert and process OCR text files',
    path: path.join(__dirname, '../scripts/convert-ocr-data.js'),
    timeout: 30000 // 30 seconds
  },
  'maintenance': {
    name: 'Database Maintenance',
    description: 'Run database cleanup and optimization',
    path: path.join(__dirname, '../scripts/database-maintenance.js'),
    timeout: 60000 // 60 seconds
  },
  'checkPermissions': {
    name: 'Check Link Permissions',
    description: 'Verify link permissions and access controls',
    path: path.join(__dirname, '../scripts/check-links-permissions.js'),
    timeout: 45000 // 45 seconds
  },
  'debugChurches': {
    name: 'Debug Churches API',
    description: 'Debug and test churches API endpoints',
    path: path.join(__dirname, '../scripts/debug-churches-api.js'),
    timeout: 30000 // 30 seconds
  },
  'testApiRoutes': {
    name: 'Test API Routes',
    description: 'Test all API routes and endpoints',
    path: path.join(__dirname, '../scripts/test-api-routes.js'),
    timeout: 45000 // 45 seconds
  },
  'fixDatabaseTables': {
    name: 'Fix Database Tables',
    description: 'Fix and repair database table structures',
    path: path.join(__dirname, '../scripts/fix-database-tables.js'),
    timeout: 90000 // 90 seconds
  }
};

// Ensure logs directory exists
const ensureLogsDirectory = async () => {
  const logsDir = path.join(__dirname, '../logs');
  try {
    await fs.access(logsDir);
  } catch (error) {
    await fs.mkdir(logsDir, { recursive: true });
  }
};

// Log script execution
const logExecution = async (userEmail, scriptName, success, output, error = null) => {
  try {
    await ensureLogsDirectory();
    const logFile = path.join(__dirname, '../logs/script-executions.log');
    const timestamp = new Date().toISOString();
    const status = success ? 'SUCCESS' : 'ERROR';
    const logEntry = `[${timestamp}] ${userEmail} ran ${scriptName} - ${status}\n`;
    
    await fs.appendFile(logFile, logEntry);
    
    // Also log detailed output if needed (optional)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📝 Script execution logged: ${logEntry.trim()}`);
      if (output) console.log(`📄 Output: ${output.substring(0, 200)}...`);
      if (error) console.log(`❌ Error: ${error.substring(0, 200)}...`);
    }
  } catch (logError) {
    console.error('Failed to log script execution:', logError.message);
  }
};

// GET /api/scripts - List available scripts
router.get('/scripts', requireRole(['super_admin', 'admin']), (req, res) => {
  try {
    const availableScripts = Object.keys(SCRIPTS).map(key => ({
      id: key,
      name: SCRIPTS[key].name,
      description: SCRIPTS[key].description,
      timeout: SCRIPTS[key].timeout
    }));

    res.json({
      success: true,
      scripts: availableScripts,
      count: availableScripts.length
    });
  } catch (error) {
    console.error('Error listing scripts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list available scripts',
      message: error.message
    });
  }
});

// POST /api/run-script - Execute a whitelisted script
router.post('/run-script', requireRole(['super_admin', 'admin']), async (req, res) => {
  const { scriptName, args = [] } = req.body;
  const userEmail = req.session?.user?.email || 'unknown';
  
  console.log(`🚀 Script execution request: ${scriptName} by ${userEmail}`);

  // Validate script name
  if (!scriptName || typeof scriptName !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Script name is required and must be a string',
      code: 'INVALID_SCRIPT_NAME'
    });
  }

  // Check if script is whitelisted
  if (!SCRIPTS[scriptName]) {
    console.log(`❌ Unauthorized script requested: ${scriptName}`);
    await logExecution(userEmail, scriptName, false, null, 'Script not in whitelist');
    
    return res.status(403).json({
      success: false,
      error: 'Script not authorized for execution',
      code: 'SCRIPT_NOT_WHITELISTED',
      availableScripts: Object.keys(SCRIPTS)
    });
  }

  const script = SCRIPTS[scriptName];
  
  // Verify script file exists
  try {
    await fs.access(script.path);
  } catch (error) {
    console.log(`❌ Script file not found: ${script.path}`);
    await logExecution(userEmail, scriptName, false, null, 'Script file not found');
    
    return res.status(404).json({
      success: false,
      error: 'Script file not found on server',
      code: 'SCRIPT_FILE_NOT_FOUND',
      path: script.path
    });
  }

  // Sanitize arguments (basic validation)
  const sanitizedArgs = Array.isArray(args) ? args.filter(arg => 
    typeof arg === 'string' && arg.length < 100 && !/[;&|`$]/.test(arg)
  ) : [];

  // Build command
  const command = `node "${script.path}"${sanitizedArgs.length > 0 ? ' ' + sanitizedArgs.map(arg => `"${arg}"`).join(' ') : ''}`;
  
  console.log(`📋 Executing command: ${command}`);
  console.log(`⏱️  Timeout: ${script.timeout}ms`);

  // Execute script with timeout
  const execOptions = {
    timeout: script.timeout,
    maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    cwd: path.dirname(script.path)
  };

  exec(command, execOptions, async (error, stdout, stderr) => {
    const executionTime = Date.now();
    
    if (error) {
      console.error(`❌ Script execution failed: ${error.message}`);
      await logExecution(userEmail, scriptName, false, stdout, error.message);
      
      // Handle timeout specifically
      if (error.killed && error.signal === 'SIGTERM') {
        return res.status(408).json({
          success: false,
          error: 'Script execution timed out',
          code: 'EXECUTION_TIMEOUT',
          timeout: script.timeout,
          stdout: stdout || '',
          stderr: stderr || ''
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Script execution failed',
        code: 'EXECUTION_ERROR',
        message: error.message,
        stdout: stdout || '',
        stderr: stderr || ''
      });
    }

    // Success
    console.log(`✅ Script executed successfully: ${scriptName}`);
    await logExecution(userEmail, scriptName, true, stdout);

    res.json({
      success: true,
      message: 'Script executed successfully',
      scriptName: script.name,
      executionTime: new Date().toISOString(),
      stdout: stdout || '',
      stderr: stderr || '',
      hasOutput: !!(stdout || stderr)
    });
  });
});

// GET /api/script-logs - Get recent script execution logs (optional)
router.get('/script-logs', requireRole(['super_admin']), async (req, res) => {
  try {
    const logFile = path.join(__dirname, '../logs/script-executions.log');
    const limit = parseInt(req.query.limit) || 50;
    
    try {
      const logContent = await fs.readFile(logFile, 'utf8');
      const lines = logContent.trim().split('\n').slice(-limit);
      
      const logs = lines.map(line => {
        const match = line.match(/\[(.+?)\] (.+?) ran (.+?) - (.+?)$/);
        if (match) {
          return {
            timestamp: match[1],
            userEmail: match[2],
            scriptName: match[3],
            status: match[4],
            rawLine: line
          };
        }
        return { rawLine: line };
      }).reverse(); // Most recent first

      res.json({
        success: true,
        logs,
        count: logs.length,
        logFile: logFile
      });
    } catch (fileError) {
      res.json({
        success: true,
        logs: [],
        count: 0,
        message: 'No execution logs found yet'
      });
    }
  } catch (error) {
    console.error('Error reading script logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read script logs',
      message: error.message
    });
  }
});

module.exports = router;
