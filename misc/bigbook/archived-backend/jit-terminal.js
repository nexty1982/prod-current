// JIT Terminal API Routes
// Express routes for managing JIT (Just-In-Time) terminal sessions

const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');
const JITSessionManager = require('../services/jitSessionManager');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;

// Initialize JIT Session Manager
const jitManager = new JITSessionManager();

/**
 * GET /api/jit/config
 * Get JIT Terminal configuration
 */
router.get('/config', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const config = await jitManager.getConfig();
    res.json(config);
  } catch (error) {
    console.error('[JIT API] Failed to get config:', error);
    res.status(500).json({ message: 'Failed to retrieve configuration' });
  }
});

/**
 * PUT /api/jit/config
 * Update JIT Terminal configuration
 */
router.put('/config', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const config = req.body;
    
    // Validate configuration
    const validation = validateJITConfig(config);
    if (!validation.valid) {
      return res.status(400).json({ 
        message: 'Invalid configuration',
        errors: validation.errors 
      });
    }

    await jitManager.updateConfig(config, req.user);
    
    // Log configuration change
    console.log(`[JIT API] Configuration updated by ${req.user.name} (${req.user.id})`);
    
    res.json({ message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('[JIT API] Failed to update config:', error);
    res.status(500).json({ message: 'Failed to update configuration' });
  }
});

/**
 * GET /api/jit/sessions
 * Get all JIT Terminal sessions for current user or all (super_admin)
 */
router.get('/sessions', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const sessions = await jitManager.getSessions(req.user.id, true); // Get all sessions for super_admin
    res.json(sessions);
  } catch (error) {
    console.error('[JIT API] Failed to get sessions:', error);
    res.status(500).json({ message: 'Failed to retrieve sessions' });
  }
});

/**
 * POST /api/jit/start-session
 * Create a new JIT Terminal session
 */
router.post('/start-session', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { timeoutMinutes, password } = req.body;
    
    // Check if JIT is enabled
    const config = await jitManager.getConfig();
    if (!config.enabled) {
      return res.status(403).json({ 
        message: 'JIT Terminal is currently disabled' 
      });
    }

    // Check production environment restrictions
    if (isProduction() && !config.allowInProduction) {
      return res.status(403).json({ 
        message: 'JIT Terminal is disabled in production environment' 
      });
    }

    // Check concurrent session limit
    const activeSessions = await jitManager.getActiveSessions(req.user.id);
    if (activeSessions.length >= config.maxConcurrentSessions) {
      return res.status(429).json({ 
        message: `Maximum concurrent sessions limit reached (${config.maxConcurrentSessions})` 
      });
    }

    // Re-authentication if required
    if (config.requireReauth) {
      if (!password) {
        return res.status(400).json({ 
          message: 'Password required for re-authentication' 
        });
      }
      
      // Verify password (implement your authentication logic)
      const isValidPassword = await verifyUserPassword(req.user.id, password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          message: 'Invalid password for re-authentication' 
        });
      }
    }

    // Create new session
    const session = await jitManager.createSession(req.user, {
      timeoutMinutes: timeoutMinutes || config.sessionTimeoutMinutes
    });

    console.log(`[JIT API] Session created: ${session.id} for user ${req.user.name}`);

    res.status(201).json({
      sessionId: session.id,
      expiryTime: session.expiryTime,
      message: 'JIT Terminal session created successfully'
    });

  } catch (error) {
    console.error('[JIT API] Failed to create session:', error);
    res.status(500).json({ message: 'Failed to create terminal session' });
  }
});

/**
 * POST /api/jit/end-session
 * Terminate a JIT Terminal session
 */
router.post('/end-session', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID required' });
    }

    // Get session to verify ownership or admin access
    const session = await jitManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only allow session owner or super_admin to terminate
    if (session.userId !== req.user.id && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Insufficient permissions to terminate session' });
    }

    await jitManager.terminateSession(sessionId, req.user);
    
    console.log(`[JIT API] Session terminated: ${sessionId} by ${req.user.name}`);
    
    res.json({ message: 'Session terminated successfully' });

  } catch (error) {
    console.error('[JIT API] Failed to terminate session:', error);
    res.status(500).json({ message: 'Failed to terminate session' });
  }
});

/**
 * GET /api/jit/session-log/:sessionId
 * Download session log file
 */
router.get('/session-log/:sessionId', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get session to verify access
    const session = await jitManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only allow session owner or super_admin to download logs
    if (session.userId !== req.user.id && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Insufficient permissions to access session log' });
    }

    const logPath = await jitManager.getSessionLogPath(sessionId);
    
    try {
      await fs.access(logPath);
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="jit-session-${sessionId}.log"`);
      
      const logContent = await fs.readFile(logPath, 'utf8');
      res.send(logContent);
      
      console.log(`[JIT API] Session log downloaded: ${sessionId} by ${req.user.name}`);
      
    } catch (fileError) {
      res.status(404).json({ message: 'Session log file not found' });
    }

  } catch (error) {
    console.error('[JIT API] Failed to get session log:', error);
    res.status(500).json({ message: 'Failed to retrieve session log' });
  }
});

/**
 * GET /api/jit/audit-logs
 * Get JIT audit logs (super_admin only)
 */
router.get('/audit-logs', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userId, action } = req.query;
    
    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (userId) filters.userId = userId;
    if (action) filters.action = action;

    const auditLogs = await jitManager.getAuditLogs(filters);
    res.json(auditLogs);

  } catch (error) {
    console.error('[JIT API] Failed to get audit logs:', error);
    res.status(500).json({ message: 'Failed to retrieve audit logs' });
  }
});

/**
 * WebSocket connection handler for JIT Terminal
 * This should be called from the main server file to set up WebSocket handling
 */
function setupJITWebSocket(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/api/jit/socket'
  });

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }

    try {
      // Verify session exists and is active
      const session = await jitManager.getSession(sessionId);
      if (!session || !session.isActive) {
        ws.close(1008, 'Invalid or expired session');
        return;
      }

      // Attach WebSocket to session
      await jitManager.attachWebSocket(sessionId, ws);
      
      console.log(`[JIT WebSocket] Connected to session: ${sessionId}`);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'session_update',
        session: session
      }));

    } catch (error) {
      console.error('[JIT WebSocket] Connection error:', error);
      ws.close(1011, 'Internal server error');
    }
  });

  return wss;
}

// Helper functions

function validateJITConfig(config) {
  const errors = [];
  
  if (typeof config.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }
  
  if (typeof config.allowInProduction !== 'boolean') {
    errors.push('allowInProduction must be a boolean');
  }
  
  if (!Number.isInteger(config.sessionTimeoutMinutes) || 
      config.sessionTimeoutMinutes < 1 || 
      config.sessionTimeoutMinutes > 60) {
    errors.push('sessionTimeoutMinutes must be an integer between 1 and 60');
  }
  
  if (!Number.isInteger(config.maxConcurrentSessions) || 
      config.maxConcurrentSessions < 1 || 
      config.maxConcurrentSessions > 10) {
    errors.push('maxConcurrentSessions must be an integer between 1 and 10');
  }
  
  if (typeof config.requireReauth !== 'boolean') {
    errors.push('requireReauth must be a boolean');
  }
  
  if (typeof config.logCommands !== 'boolean') {
    errors.push('logCommands must be a boolean');
  }
  
  if (typeof config.logDirectory !== 'string' || !config.logDirectory.trim()) {
    errors.push('logDirectory must be a non-empty string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

async function verifyUserPassword(userId, password) {
  // Implement your password verification logic here
  // This is a placeholder - you should integrate with your existing auth system
  try {
    // Example: bcrypt.compare(password, userHashedPassword)
    return true; // Placeholder - always returns true for demo
  } catch (error) {
    console.error('[JIT API] Password verification error:', error);
    return false;
  }
}

module.exports = { 
  router,
  setupJITWebSocket
}; 