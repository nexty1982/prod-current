// JIT Terminal API Routes
// Express routes for managing JIT (Just-In-Time) terminal sessions

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const JITSessionManager = require('../services/jitSessionManager');
const TerminalManager = require('../services/terminalManager');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Initialize managers
const jitManager = new JITSessionManager();
const terminalManager = new TerminalManager();

// Token storage for CLI access (in production, use Redis or database)
const cliTokens = new Map();

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

// CLI Token validation middleware
const validateCliToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Check for CLI token in Authorization header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (cliTokens.has(token)) {
        const tokenData = cliTokens.get(token);
        
        // Check if token is expired
        if (tokenData.expiresAt < Date.now()) {
          cliTokens.delete(token);
          return res.status(401).json({
            success: false,
            message: 'CLI token has expired',
            error: 'TOKEN_EXPIRED'
          });
        }
        
        // Update token usage
        tokenData.lastUsed = Date.now();
        tokenData.usageCount += 1;
        cliTokens.set(token, tokenData);
        
        // Set user data from token for downstream middleware
        req.user = {
          id: tokenData.userId,
          name: tokenData.userName,
          role: tokenData.role,
          authType: 'cli_token',
          tokenId: token.substring(0, 8) + '...'
        };
        
        console.log(`[JIT CLI] Token authenticated: ${req.user.name} (${req.user.tokenId})`);
        return next();
      }
    }
    
    // Fall back to regular auth middleware if no valid CLI token
    return authMiddleware(req, res, next);
    
  } catch (error) {
    console.error('[JIT CLI] Token validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Token validation failed',
      error: error.message
    });
  }
};

// Combined auth middleware that accepts both session auth and CLI tokens
const jitAuthMiddleware = (req, res, next) => {
  return validateCliToken(req, res, next);
};

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of cliTokens.entries()) {
    if (data.expiresAt < now) {
      cliTokens.delete(token);
      console.log(`[JIT CLI] Expired token cleaned up: ${token.substring(0, 8)}...`);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

/**
 * GET /api/jit/config
 * Get JIT Terminal configuration
 */
router.get('/config', jitAuthMiddleware, requireRole(['super_admin']), async (req, res) => {
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
router.put('/config', jitAuthMiddleware, requireRole(['super_admin']), async (req, res) => {
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
    console.log(`[JIT API] Configuration updated by ${req.user.name} (${req.user.id}) via ${req.user.authType || 'session'}`);
    
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
router.get('/sessions', jitAuthMiddleware, requireRole(['super_admin']), async (req, res) => {
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
router.post('/start-session', jitAuthMiddleware, requireRole(['super_admin']), async (req, res) => {
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

    // Verify user password if required
    if (config.requirePassword && password) {
      const passwordValid = await verifyUserPassword(req.user.id, password);
      if (!passwordValid) {
        return res.status(401).json({ 
          message: 'Invalid password' 
        });
      }
    }

    // Create new session
    const session = await jitManager.createSession({
      userId: req.user.id,
      userName: req.user.name || req.user.email || 'Unknown User',
      timeoutMinutes: timeoutMinutes || config.defaultTimeoutMinutes,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    console.log(`[JIT API] Session created for ${req.user.name || req.user.email} (${req.user.id}) - Session ID: ${session.id}`);

    res.json({
      message: 'Session created successfully',
      sessionId: session.id,
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        accessUrl: `/api/jit/access/${session.id}`
      }
    });
  } catch (error) {
    console.error('[JIT API] Failed to create session:', error);
    res.status(500).json({ message: 'Failed to create session' });
  }
});

/**
 * GET /api/jit/access/:sessionId
 * Access JIT Terminal session
 */
router.get('/access/:sessionId', authMiddleware, requireRole(['super_admin']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Validate session
    const session = await jitManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if session is expired
    if (new Date() > new Date(session.expiresAt)) {
      await jitManager.terminateSession(sessionId);
      return res.status(410).json({ message: 'Session has expired' });
    }

    // Check if user has access to this session
    if (session.userId !== req.user.id && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied to this session' });
    }

    // Update session activity
    await jitManager.updateSessionActivity(sessionId);

    // Return session access information
    res.json({
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        isActive: true
      }
    });
  } catch (error) {
    console.error('[JIT API] Failed to access session:', error);
    res.status(500).json({ message: 'Failed to access session' });
  }
});

/**
 * DELETE /api/jit/sessions/:sessionId
 * Terminate a JIT Terminal session
 */
router.delete('/sessions/:sessionId', authMiddleware, requireRole(['super_admin']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Check if session exists
    const session = await jitManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user has permission to terminate this session
    if (session.userId !== req.user.id && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied to terminate this session' });
    }

    // Terminate session
    await jitManager.terminateSession(sessionId);
    
    console.log(`[JIT API] Session ${sessionId} terminated by ${req.user.name} (${req.user.id})`);
    
    res.json({ message: 'Session terminated successfully' });
  } catch (error) {
    console.error('[JIT API] Failed to terminate session:', error);
    res.status(500).json({ message: 'Failed to terminate session' });
  }
});

/**
 * POST /api/jit/end-session
 * End a JIT Terminal session (alternative endpoint for frontend)
 */
router.post('/end-session', authMiddleware, requireRole(['super_admin']), async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }
    
    // Check if session exists
    const session = await jitManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if user has permission to terminate this session
    if (session.userId !== req.user.id && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied to terminate this session' });
    }

    // Terminate session
    await jitManager.terminateSession(sessionId);
    
    console.log(`[JIT API] Session ${sessionId} ended by ${req.user.name} (${req.user.id})`);
    
    res.json({ message: 'Session ended successfully' });
  } catch (error) {
    console.error('[JIT API] Failed to end session:', error);
    res.status(500).json({ message: 'Failed to end session' });
  }
});

/**
 * GET /api/jit/status
 * Get JIT Terminal system status
 */
router.get('/status', authMiddleware, requireRole(['super_admin']), async (req, res) => {
  try {
    const status = await jitManager.getSystemStatus();
    const activeSessions = terminalManager.getActiveSessions();
    
    res.json({
      ...status,
      terminals: {
        activeSessions: activeSessions.length,
        sessions: activeSessions
      }
    });
  } catch (error) {
    console.error('[JIT API] Failed to get status:', error);
    res.status(500).json({ message: 'Failed to retrieve system status' });
  }
});

/**
 * POST /api/jit/test-terminal
 * Test terminal functionality
 */
router.post('/test-terminal', authMiddleware, requireRole(['super_admin']), async (req, res) => {
  try {
    console.log(`[JIT API] Terminal test requested by ${req.user.name} (${req.user.id})`);
    
    const testResult = await terminalManager.testTerminal();
    
    res.json({
      success: true,
      message: 'Terminal test completed successfully',
      test: testResult
    });
  } catch (error) {
    console.error('[JIT API] Terminal test failed:', error);
    res.status(500).json({ 
      success: false,
      message: 'Terminal test failed',
      error: error.message 
    });
  }
});

/**
 * POST /api/jit-terminal/agent-access
 * Request JIT Terminal access for AI agents
 */
router.post('/agent-access', jitAuthMiddleware, async (req, res) => {
  try {
    const { agentId, task, timeoutMinutes } = req.body;
    
    console.log(`[JIT API] Agent access request from ${req.user?.name || 'unknown'} (role: ${req.user?.role}) via ${req.user?.authType || 'session'}`);
    
    // Validate agent authentication
    if (!req.user || (req.user.role !== 'ai_agent' && req.user.role !== 'omai' && req.user.role !== 'super_admin')) {
      return res.status(403).json({ 
        message: 'Access denied - only authenticated AI agents can request terminal access',
        requiresRole: ['ai_agent', 'omai', 'super_admin']
      });
    }

    // Validate required fields
    if (!agentId || !task) {
      return res.status(400).json({ 
        message: 'Agent ID and task description are required',
        required: ['agentId', 'task']
      });
    }

    // Check if JIT is enabled
    const config = await jitManager.getConfig();
    if (!config.enabled) {
      return res.status(503).json({ 
        message: 'JIT Terminal is currently disabled' 
      });
    }

    // Check production environment restrictions
    if (isProduction() && !config.allowInProduction) {
      return res.status(503).json({ 
        message: 'JIT Terminal is disabled in production environment' 
      });
    }

    // Check concurrent session limit for agents
    const activeSessions = await jitManager.getActiveSessions();
    const agentSessions = activeSessions.filter(s => s.isAgent);
    if (agentSessions.length >= Math.floor(config.maxConcurrentSessions / 2)) { // Reserve half slots for agents
      return res.status(429).json({ 
        message: 'Maximum concurrent agent sessions reached. Please try again later.',
        maxAgentSessions: Math.floor(config.maxConcurrentSessions / 2),
        currentAgentSessions: agentSessions.length
      });
    }

    // Create agent session with special metadata
    const sessionOptions = {
      timeoutMinutes: timeoutMinutes || config.defaultTimeoutMinutes || 15, // Shorter timeout for agents
      isAgent: true,
      agentId,
      task,
      restrictions: {
        commandWhitelist: await getAgentCommandWhitelist(),
        allowedDirectories: await getAgentAllowedDirectories(),
        blockedCommands: await getAgentBlockedCommands()
      }
    };

    const session = await jitManager.createSession(req.user, sessionOptions);
    
    // Log agent session creation
    await jitManager.logAgentActivity({
      action: 'AGENT_SESSION_CREATED',
      agentId,
      sessionId: session.id,
      task,
      userId: req.user.id,
      restrictions: sessionOptions.restrictions
    });

    console.log(`[JIT API] Agent session created: ${session.id} for agent ${agentId} (task: ${task})`);

    // Return session info for WebSocket connection
    res.json({
      success: true,
      session: {
        id: session.id,
        agentId,
        task,
        expiresAt: session.expiryTime,
        restrictions: sessionOptions.restrictions,
        websocketUrl: `/api/jit/ws?sessionId=${session.id}`,
        message: 'Agent terminal session created successfully'
      }
    });

  } catch (error) {
    console.error('[JIT API] Agent access request failed:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create agent terminal session',
      error: error.message 
    });
  }
});

/**
 * POST /api/jit/token
 * Generate a CLI access token for super_admin users
 */
router.post('/token', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { expiresInHours = 24 } = req.body;
    
    // Validate expiration time (max 72 hours for security)
    const maxHours = 72;
    const requestedHours = Math.min(Math.max(1, expiresInHours), maxHours);
    
    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (requestedHours * 60 * 60 * 1000);
    
    // Store token with user metadata
    const tokenData = {
      token,
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.role,
      createdAt: Date.now(),
      expiresAt,
      lastUsed: null,
      usageCount: 0
    };
    
    cliTokens.set(token, tokenData);
    
    // Log token generation
    await jitManager.logAuditEvent({
      action: 'CLI_TOKEN_GENERATED',
      userId: req.user.id,
      userName: req.user.name,
      details: {
        tokenId: token.substring(0, 8) + '...',
        expiresAt: new Date(expiresAt).toISOString(),
        expiresInHours: requestedHours
      }
    });
    
    console.log(`[JIT CLI] Token generated for ${req.user.name} (${req.user.id}) - expires in ${requestedHours}h`);
    
    res.json({
      success: true,
      token,
      expiresAt,
      expiresIn: requestedHours * 3600, // seconds
      message: `CLI access token generated (expires in ${requestedHours} hours)`
    });
    
  } catch (error) {
    console.error('[JIT CLI] Token generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate CLI access token',
      error: error.message
    });
  }
});

/**
 * DELETE /api/jit/token/:token
 * Revoke a specific CLI access token
 */
router.delete('/token/:token', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!cliTokens.has(token)) {
      return res.status(404).json({
        success: false,
        message: 'Token not found or already expired'
      });
    }
    
    const tokenData = cliTokens.get(token);
    
    // Only allow users to revoke their own tokens (or super_admin can revoke any)
    if (tokenData.userId !== req.user.id && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot revoke token belonging to another user'
      });
    }
    
    cliTokens.delete(token);
    
    // Log token revocation
    await jitManager.logAuditEvent({
      action: 'CLI_TOKEN_REVOKED',
      userId: req.user.id,
      userName: req.user.name,
      details: {
        tokenId: token.substring(0, 8) + '...',
        originalOwner: tokenData.userName,
        usageCount: tokenData.usageCount
      }
    });
    
    console.log(`[JIT CLI] Token revoked by ${req.user.name}: ${token.substring(0, 8)}...`);
    
    res.json({
      success: true,
      message: 'CLI access token revoked successfully'
    });
    
  } catch (error) {
    console.error('[JIT CLI] Token revocation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke CLI access token',
      error: error.message
    });
  }
});

/**
 * GET /api/jit/tokens
 * List active CLI tokens for current user (super_admin sees all)
 */
router.get('/tokens', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const now = Date.now();
    const activeTokens = [];
    
    for (const [token, data] of cliTokens.entries()) {
      // Skip expired tokens
      if (data.expiresAt < now) continue;
      
      // Only show user's own tokens unless super_admin
      if (data.userId !== req.user.id && req.user.role !== 'super_admin') continue;
      
      activeTokens.push({
        tokenId: token.substring(0, 8) + '...',
        userId: data.userId,
        userName: data.userName,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        lastUsed: data.lastUsed,
        usageCount: data.usageCount,
        isExpired: data.expiresAt < now
      });
    }
    
    res.json({
      success: true,
      tokens: activeTokens,
      count: activeTokens.length
    });
    
  } catch (error) {
    console.error('[JIT CLI] Failed to list tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve CLI tokens',
      error: error.message
    });
  }
});

// =====================================================
// AGENT SECURITY FUNCTIONS
// =====================================================

/**
 * Get whitelisted commands for AI agents
 */
async function getAgentCommandWhitelist() {
  return [
    // Basic navigation and reading
    'ls', 'll', 'pwd', 'cd', 'cat', 'head', 'tail', 'less', 'more',
    'find', 'grep', 'awk', 'sed', 'sort', 'uniq', 'wc',
    
    // File viewing and basic operations
    'file', 'stat', 'du', 'df', 'whoami', 'id', 'groups',
    'ps', 'top', 'htop', 'free', 'uptime', 'date',
    
    // Echo and basic output
    'echo', 'printf', 'basename', 'dirname',
    
    // Whitelisted custom tools
    '/usr/local/om-tools/*',
    '/home/ubuntu/runner/*',
    'npm', 'node', 'python3', 'python',
    
    // Git operations (read-only)
    'git status', 'git log', 'git show', 'git diff', 'git branch',
    
    // Service status (read-only)
    'systemctl status', 'service status', 'pm2 status', 'pm2 list'
  ];
}

/**
 * Get allowed directories for AI agents
 */
async function getAgentAllowedDirectories() {
  return [
    '/home/ubuntu',
    '/usr/local/om-tools',
    '/var/log/orthodoxmetrics',
    '/tmp/agent-workspace',
    process.cwd() // Current working directory
  ];
}

/**
 * Get blocked commands for AI agents
 */
async function getAgentBlockedCommands() {
  return [
    // Destructive file operations
    'rm', 'rmdir', 'mv', 'cp', 'dd', 'shred', 'truncate',
    
    // System modification
    'sudo', 'su', 'chmod', 'chown', 'chgrp', 'mount', 'umount',
    'systemctl start', 'systemctl stop', 'systemctl restart',
    'service start', 'service stop', 'service restart',
    
    // Network and security
    'ssh', 'scp', 'rsync', 'curl', 'wget', 'nc', 'netcat',
    'iptables', 'ufw', 'firewall-cmd',
    
    // Package management
    'apt', 'yum', 'dnf', 'pacman', 'brew', 'pip install', 'npm install -g',
    
    // Process control
    'kill', 'killall', 'pkill', 'nohup', 'screen', 'tmux',
    
    // System shutdown
    'shutdown', 'reboot', 'halt', 'poweroff', 'init',
    
    // Database operations
    'mysql', 'psql', 'mongo', 'redis-cli',
    
    // File editors (prevent hanging)
    'vi', 'vim', 'nano', 'emacs'
  ];
}

/**
 * Filter and validate agent commands
 */
function filterAgentCommand(command, restrictions) {
  const cmd = command.trim();
  
  // Check if command is blocked
  for (const blocked of restrictions.blockedCommands) {
    if (cmd.startsWith(blocked)) {
      throw new Error(`Command '${blocked}' is not allowed for AI agents`);
    }
  }
  
  // Check if command is whitelisted
  const isWhitelisted = restrictions.commandWhitelist.some(allowed => {
    if (allowed.includes('*')) {
      // Handle wildcard patterns
      const pattern = allowed.replace('*', '.*');
      return new RegExp(`^${pattern}`).test(cmd);
    }
    return cmd.startsWith(allowed);
  });
  
  if (!isWhitelisted) {
    throw new Error(`Command '${cmd.split(' ')[0]}' is not in the agent whitelist`);
  }
  
  return cmd;
}

// WebSocket setup function
function setupJITWebSocket(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/api/jit/ws'
  });
  
  wss.on('connection', (ws, req) => {
    console.log('[JIT WebSocket] New connection established');
    
    // Extract session ID from URL
    const url = new URL(req.url, 'http://localhost');
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }
    
    // Validate session
    jitManager.getSession(sessionId).then(async session => {
      if (!session || new Date() > new Date(session.expiresAt)) {
        ws.close(1008, 'Invalid or expired session');
        return;
      }
      
      // Store session info in WebSocket
      ws.sessionId = sessionId;
      ws.userId = session.userId;
      
      console.log(`[JIT WebSocket] Session ${sessionId} connected for user ${session.userId}`);
      
      try {
        // Create actual terminal session
        const terminalResult = await terminalManager.createTerminal(sessionId, {
          cols: 80,
          rows: 24
        });
        
        console.log(`[JIT WebSocket] Terminal created for session ${sessionId}:`, terminalResult);
        
        // Get terminal process for event handling
        const ptyProcess = terminalManager.getTerminalProcess(sessionId);
        
        if (ptyProcess) {
          // Set up terminal data handler
          ptyProcess.on('session_data', (terminalSessionId, data) => {
            if (terminalSessionId === sessionId && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'terminal_data',
                data: data.toString()
              }));
            }
          });
          
          // Set up terminal exit handler
          ptyProcess.on('session_exit', (terminalSessionId, code, signal) => {
            if (terminalSessionId === sessionId && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'terminal_exit',
                code: code,
                signal: signal,
                message: `Terminal session ended (code: ${code})`
              }));
            }
          });
          
          // Set up terminal error handler
          ptyProcess.on('session_error', (terminalSessionId, error) => {
            if (terminalSessionId === sessionId && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'terminal_error',
                message: error.message,
                error: error.toString()
              }));
            }
          });
        }
        
        // Send welcome message with terminal info
        ws.send(JSON.stringify({
          type: 'welcome',
          message: session.isAgent ? 
            `JIT Terminal Agent Session connected for ${session.agentId}` :
            'JIT Terminal connected successfully',
          sessionId: sessionId,
          terminal: {
            pid: terminalResult.pid,
            shell: terminalResult.shell
          },
          session: {
            isAgent: session.isAgent || false,
            agentId: session.agentId || null,
            task: session.task || null,
            restrictions: session.restrictions || null
          }
        }));

        // Send agent-specific welcome commands if this is an agent session
        if (session.isAgent) {
          // Give the terminal a moment to initialize
          setTimeout(() => {
            const agentPrompt = [
              `echo "JIT Terminal [Agent: ${session.agentId}] session started"`,
              `echo "Task: ${session.task}"`,
              `echo "Security: Command filtering is active"`,
              `echo "Shell: ${terminalResult.shell} (PID: ${terminalResult.pid})"`,
              `echo ""`
            ].join(' && ');
            
            terminalManager.writeToTerminal(sessionId, agentPrompt + '\n');
          }, 1500);
        }
        
      } catch (error) {
        console.error(`[JIT WebSocket] Failed to create terminal for session ${sessionId}:`, error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to create terminal session',
          error: error.message
        }));
        ws.close(1011, 'Terminal creation failed');
        return;
      }
      
    }).catch(error => {
      console.error('[JIT WebSocket] Session validation failed:', error);
      ws.close(1008, 'Session validation failed');
    });
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log(`[JIT WebSocket] Received message from session ${ws.sessionId}:`, data.type);
        
        // Handle different message types
        switch (data.type) {
          case 'terminal_input':
            handleTerminalInput(ws, data);
            break;
          case 'terminal_resize':
            handleTerminalResize(ws, data);
            break;
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          default:
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Unknown message type' 
            }));
        }
      } catch (error) {
        console.error('[JIT WebSocket] Message handling error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    });
    
    ws.on('close', async () => {
      console.log(`[JIT WebSocket] Session ${ws.sessionId} disconnected`);
      
      // Close terminal session
      if (ws.sessionId) {
        try {
          await terminalManager.closeTerminal(ws.sessionId);
          console.log(`[JIT WebSocket] Terminal closed for session ${ws.sessionId}`);
        } catch (error) {
          console.error(`[JIT WebSocket] Failed to close terminal for session ${ws.sessionId}:`, error);
        }
      }
    });
  });
  
  return wss;
}

// Handle terminal input
async function handleTerminalInput(ws, data) {
  try {
    const { input } = data;
    
    if (!input) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Input data is required'
      }));
      return;
    }
    
    // Get session details for command filtering
    const session = await jitManager.getSession(ws.sessionId);
    if (!session) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Session not found'
      }));
      return;
    }

    // Filter commands for agent sessions
    if (session.isAgent && session.restrictions) {
      try {
        // Only filter complete commands (ending with newline)
        if (input.includes('\n') || input.includes('\r')) {
          const command = input.trim();
          if (command) {
            filterAgentCommand(command, session.restrictions);
            
            // Log agent command
            await jitManager.logAgentActivity({
              action: 'AGENT_COMMAND_EXECUTED',
              sessionId: ws.sessionId,
              agentId: session.agentId,
              command: command,
              userId: session.userId,
              task: session.task,
              timestamp: new Date().toISOString()
            });
            
            console.log(`[JIT WebSocket] Agent command validated: ${command}`);
          }
        }
      } catch (filterError) {
        // Command was blocked
        ws.send(JSON.stringify({
          type: 'terminal_data',
          data: `\r\n\x1b[31m[SECURITY] ${filterError.message}\x1b[0m\r\n`
        }));
        
        // Log blocked command attempt
        await jitManager.logAgentActivity({
          action: 'AGENT_COMMAND_BLOCKED',
          sessionId: ws.sessionId,
          agentId: session.agentId,
          command: input.trim(),
          reason: filterError.message,
          userId: session.userId,
          task: session.task,
          timestamp: new Date().toISOString()
        });
        
        console.log(`[JIT WebSocket] Agent command blocked: ${input.trim()} - ${filterError.message}`);
        return; // Don't send the blocked command to terminal
      }
    }
    
    // Update session activity
    await jitManager.updateSessionActivity(ws.sessionId);
    
    // Write input to terminal
    await terminalManager.writeToTerminal(ws.sessionId, input);
    
    console.log(`[JIT WebSocket] Input sent to terminal ${ws.sessionId}: ${input.trim()}`);
    
  } catch (error) {
    console.error('[JIT WebSocket] Terminal input error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to process terminal input',
      error: error.message
    }));
  }
}

// Handle terminal resize
async function handleTerminalResize(ws, data) {
  try {
    const { cols, rows } = data;
    
    if (!cols || !rows) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Columns and rows are required for resize'
      }));
      return;
    }
    
    // Update session activity
    await jitManager.updateSessionActivity(ws.sessionId);
    
    // Resize terminal
    await terminalManager.resizeTerminal(ws.sessionId, cols, rows);
    
    console.log(`[JIT WebSocket] Terminal ${ws.sessionId} resized to ${cols}x${rows}`);
    
    ws.send(JSON.stringify({
      type: 'terminal_resized',
      cols: cols,
      rows: rows
    }));
    
  } catch (error) {
    console.error('[JIT WebSocket] Terminal resize error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to resize terminal',
      error: error.message
    }));
  }
}

// Configuration validation
function validateJITConfig(config) {
  const errors = [];
  
  if (typeof config.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }
  
  if (typeof config.maxConcurrentSessions !== 'number' || config.maxConcurrentSessions < 1) {
    errors.push('maxConcurrentSessions must be a positive number');
  }
  
  if (typeof config.defaultTimeoutMinutes !== 'number' || config.defaultTimeoutMinutes < 1) {
    errors.push('defaultTimeoutMinutes must be a positive number');
  }
  
  if (typeof config.requirePassword !== 'boolean') {
    errors.push('requirePassword must be a boolean');
  }
  
  if (typeof config.allowInProduction !== 'boolean') {
    errors.push('allowInProduction must be a boolean');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// Environment check
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

// Password verification stub
async function verifyUserPassword(userId, password) {
  // This would be implemented to verify the user's password
  // For now, return true as a stub
  return true;
}

module.exports = router;
module.exports.setupJITWebSocket = setupJITWebSocket;
module.exports.validateCliToken = validateCliToken;
module.exports.requireSuperAdmin = requireSuperAdmin;
module.exports.jitAuthMiddleware = jitAuthMiddleware; 
