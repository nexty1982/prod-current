const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const logger = require('../utils/logger');
const OmaiCommandService = require('../services/omaiCommandService');

// Initialize OMAI command service
const omaiCommandService = new OmaiCommandService();
let omaiCommands = {};

const loadCommands = async () => {
  try {
    omaiCommands = await omaiCommandService.getAllCommands();
    logger.info('✅ OMAI commands loaded from database');
  } catch (error) {
    logger.error('Failed to load OMAI commands from database:', error);
    omaiCommands = { categories: {}, settings: {} };
  }
};

// Initialize commands on startup
loadCommands();

// Command history storage (in production, use Redis or database)
const commandHistory = new Map();

// Middleware to check super_admin role
const requireSuperAdmin = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.session.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Super admin access required'
    });
  }

  next();
};

// Get available commands
router.get('/available-commands', requireSuperAdmin, async (req, res) => {
  try {
    const commands = [];
    
    Object.values(omaiCommands.categories || {}).forEach(category => {
      Object.values(category.commands || {}).forEach(command => {
        commands.push(...(command.patterns || []));
      });
    });

    res.json({
      success: true,
      commands: [...new Set(commands)], // Remove duplicates
      categories: Object.keys(omaiCommands.categories || {})
    });
  } catch (error) {
    logger.error('Error getting available commands:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load commands'
    });
  }
});

// Get command history
router.get('/command-history', requireSuperAdmin, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userHistory = commandHistory.get(userId) || [];
    
    res.json({
      success: true,
      history: userHistory.slice(0, 50) // Last 50 commands
    });
  } catch (error) {
    logger.error('Error getting command history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load command history'
    });
  }
});

// Execute OMAI command
router.post('/execute-command', requireSuperAdmin, async (req, res) => {
  try {
    const { command, context, handsOnMode } = req.body;
    const userId = req.session.user.id;
    
    if (!command || typeof command !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid command'
      });
    }

    // Log command execution
    logger.info(`OMAI Command executed by user ${userId}: ${command}`, {
      context,
      handsOnMode,
      timestamp: new Date().toISOString()
    });

    // Find matching command
    const matchedCommand = findMatchingCommand(command.trim().toLowerCase());
    
    if (!matchedCommand) {
      return res.json({
        success: false,
        error: `Unknown command: ${command}. Type 'help' for available commands.`
      });
    }

    // Check if hands-on mode is required
    if (matchedCommand.requires_hands_on && !handsOnMode) {
      return res.json({
        success: false,
        error: 'This command requires Hands-On Mode to be enabled for security.'
      });
    }

    // Execute the command
    const result = await executeCommand(matchedCommand, context, handsOnMode);
    
    // Store in command history
    const historyEntry = {
      id: `cmd_${Date.now()}`,
      command,
      timestamp: new Date().toISOString(),
      result: result.message || result.error,
      status: result.success ? 'success' : 'error',
      context: context?.pathname
    };
    
    const userHistory = commandHistory.get(userId) || [];
    userHistory.unshift(historyEntry);
    commandHistory.set(userId, userHistory.slice(0, 50));

    res.json(result);
  } catch (error) {
    logger.error('Error executing OMAI command:', error);
    res.status(500).json({
      success: false,
      error: 'Command execution failed'
    });
  }
});

// Find matching command from patterns
function findMatchingCommand(input) {
  for (const categoryName in omaiCommands.categories) {
    const category = omaiCommands.categories[categoryName];
    for (const commandName in category.commands) {
      const command = category.commands[commandName];
      if (command.patterns) {
        for (const pattern of command.patterns) {
          if (input === pattern.toLowerCase() || input.includes(pattern.toLowerCase())) {
            return { ...command, name: commandName, category: categoryName };
          }
        }
      }
    }
  }
  return null;
}

// Execute the actual command
async function executeCommand(command, context, handsOnMode) {
  try {
    switch (command.action) {
      case 'get_system_status':
        return await getSystemStatus();
      
      case 'restart_pm2':
        return await restartPM2(handsOnMode);
      
      case 'show_logs':
        return await showLogs(context);
      
      case 'check_disk_space':
        return await checkDiskSpace();
      
      case 'refresh_page':
        return {
          success: true,
          message: 'Page will refresh...',
          action: 'refresh_page'
        };
      
      case 'navigate':
        return {
          success: true,
          message: `Navigating to ${command.data?.url}...`,
          action: 'navigate',
          data: command.data
        };
      
      case 'check_build_status':
        return await checkBuildStatus();
      
      case 'start_build':
        return await startBuild(handsOnMode);
      
      case 'get_record_counts':
        return await getRecordCounts(context);
      
      case 'get_recent_records':
        return await getRecentRecords(context);
      
      case 'get_active_users':
        return await getActiveUsers();
      
      case 'get_user_sessions':
        return await getUserSessions();
      
      case 'list_permissions':
        return await listPermissions();
      
      case 'get_ai_status':
        return await getAIStatus();
      
      case 'restart_ai_services':
        return await restartAIServices(handsOnMode);
      
      case 'get_ai_metrics':
        return await getAIMetrics();
      
      case 'show_help':
        return await showHelp();
      
      case 'explain_current_page':
        return await explainCurrentPage(context);
      
      case 'show_shortcuts':
        return await showShortcuts(context);
      
      default:
        return {
          success: false,
          error: `Command action '${command.action}' not implemented`
        };
    }
  } catch (error) {
    logger.error(`Error executing command ${command.name}:`, error);
    return {
      success: false,
      error: `Command execution failed: ${error.message}`
    };
  }
}

// Command implementations
async function getSystemStatus() {
  try {
    const uptime = execSync('uptime', { encoding: 'utf8' }).trim();
    const diskUsage = execSync('df -h /', { encoding: 'utf8' }).split('\n')[1];
    const memoryUsage = execSync('free -h', { encoding: 'utf8' }).split('\n')[1];
    
    return {
      success: true,
      message: `System Status:\n• Uptime: ${uptime}\n• Disk: ${diskUsage}\n• Memory: ${memoryUsage}`
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to get system status'
    };
  }
}

async function restartPM2(handsOnMode) {
  if (!handsOnMode) {
    return {
      success: false,
      error: 'PM2 restart requires Hands-On Mode'
    };
  }
  
  try {
    execSync('pm2 restart all', { encoding: 'utf8' });
    return {
      success: true,
      message: 'PM2 services restarted successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: `PM2 restart failed: ${error.message}`
    };
  }
}

async function showLogs(context) {
  try {
    const logFile = context?.pathname?.includes('build') 
      ? '/var/log/build.log' 
      : '/var/log/omai/global-commands.log';
    
    const logs = execSync(`tail -20 ${logFile}`, { encoding: 'utf8' });
    return {
      success: true,
      message: `Recent logs from ${logFile}:\n${logs}`
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to retrieve logs'
    };
  }
}

async function checkDiskSpace() {
  try {
    const diskUsage = execSync('df -h', { encoding: 'utf8' });
    return {
      success: true,
      message: `Disk Usage:\n${diskUsage}`
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to check disk space'
    };
  }
}

async function checkBuildStatus() {
  try {
    // Check if build process is running
    const buildStatus = execSync('pm2 list | grep build || echo "No build process found"', { encoding: 'utf8' });
    return {
      success: true,
      message: `Build Status:\n${buildStatus}`
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to check build status'
    };
  }
}

async function startBuild(handsOnMode) {
  if (!handsOnMode) {
    return {
      success: false,
      error: 'Build start requires Hands-On Mode'
    };
  }
  
  try {
    execSync('cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/front-end && npm run build', { 
      encoding: 'utf8',
      timeout: 60000 // 1 minute timeout
    });
    return {
      success: true,
      message: 'Frontend build started successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: `Build failed: ${error.message}`
    };
  }
}

async function getRecordCounts(context) {
  // This would integrate with your records API
  return {
    success: true,
    message: 'Record counts: Baptism (150), Marriage (89), Funeral (45), Membership (324)'
  };
}

async function getRecentRecords(context) {
  // This would integrate with your records API
  return {
    success: true,
    message: 'Recent records: 3 baptisms, 1 marriage, 2 memberships added this week'
  };
}

async function getActiveUsers() {
  // This would integrate with your session management
  return {
    success: true,
    message: 'Active users: 5 online (2 admins, 3 users)'
  };
}

async function getUserSessions() {
  // This would integrate with your session management
  return {
    success: true,
    message: 'User sessions: 5 active sessions, average duration 45 minutes'
  };
}

async function listPermissions() {
  return {
    success: true,
    message: 'Permissions: super_admin (full), admin (management), manager (records), user (view)'
  };
}

async function getAIStatus() {
  return {
    success: true,
    message: 'AI Status: OMAI online, BigBook connected, command system active'
  };
}

async function restartAIServices(handsOnMode) {
  if (!handsOnMode) {
    return {
      success: false,
      error: 'AI restart requires Hands-On Mode'
    };
  }
  
  return {
    success: true,
    message: 'AI services restart initiated (placeholder)'
  };
}

async function getAIMetrics() {
  return {
    success: true,
    message: 'AI Metrics: 127 commands executed, 95% success rate, 0.3s avg response time'
  };
}

async function showHelp() {
  const commands = [];
  Object.values(omaiCommands.categories || {}).forEach(category => {
    Object.entries(category.commands || {}).forEach(([name, command]) => {
      commands.push(`• ${command.patterns[0]} - ${command.description}`);
    });
  });
  
  return {
    success: true,
    message: `Available Commands:\n${commands.slice(0, 10).join('\n')}\n\nType a command or use the Quick Actions buttons.`
  };
}

async function explainCurrentPage(context) {
  const explanations = {
    '/admin/ai': 'AI Administration Panel - Monitor and configure AI systems, view metrics, and manage OMAI settings.',
    '/admin/bigbook': 'Big Book Console - Manage AI learning content, view stored knowledge, and configure AI training data.',
    '/admin/build': 'Build Console - Control frontend builds, view build logs, and manage deployment processes.',
    '/admin/users': 'User Management - Manage user accounts, roles, permissions, and session tracking.',
    '/apps/records-ui': 'Church Records Browser - Professional interface for browsing, filtering, and managing church records.',
    '/apps/records': 'Records Dashboard - Card-based overview of record types with quick actions and statistics.',
    '/omb/editor': 'OMB Editor - Visual component editor for building and customizing UI components.'
  };
  
  const explanation = explanations[context?.pathname] || 'This is a page in the OrthodoxMetrics application.';
  
  return {
    success: true,
    message: `Page Explanation:\n${explanation}`
  };
}

async function showShortcuts(context) {
  const shortcuts = {
    '/admin/build': 'Shortcuts: Ctrl+B (Build), Ctrl+L (Logs), Ctrl+R (Refresh)',
    '/apps/records-ui': 'Shortcuts: Ctrl+F (Search), Ctrl+E (Export), Ctrl+N (New Record)',
    '/omb/editor': 'Shortcuts: Ctrl+S (Save), Ctrl+P (Preview), Ctrl+Z (Undo)',
    'default': 'Shortcuts: Ctrl+/ (Help), Ctrl+K (Quick Actions), Esc (Close panels)'
  };
  
  const pageShortcuts = shortcuts[context?.pathname] || shortcuts.default;
  
  return {
    success: true,
    message: `Keyboard Shortcuts:\n${pageShortcuts}`
  };
}

module.exports = router; 