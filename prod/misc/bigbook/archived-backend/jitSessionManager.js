// JIT Session Manager Service
// Manages PTY sessions, WebSocket connections, logging, and security for JIT Terminal

const pty = require('node-pty');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');

class JITSessionManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.config = this.loadDefaultConfig();
    this.auditLogs = [];
    this.logDirectory = process.env.JIT_LOG_DIR || '/var/log/orthodoxmetrics';
    this.ensureLogDirectory();
    
    // Cleanup expired sessions every minute
    setInterval(() => this.cleanupExpiredSessions(), 60000);
  }

  loadDefaultConfig() {
    return {
      enabled: process.env.ALLOW_JIT_TERMINAL === 'true',
      allowInProduction: process.env.JIT_ALLOW_PRODUCTION === 'true',
      sessionTimeoutMinutes: parseInt(process.env.JIT_TIMEOUT_MINUTES) || 10,
      maxConcurrentSessions: parseInt(process.env.JIT_MAX_SESSIONS) || 3,
      requireReauth: process.env.JIT_REQUIRE_REAUTH === 'true',
      logCommands: process.env.JIT_LOG_COMMANDS !== 'false',
      logDirectory: process.env.JIT_LOG_DIR || '/var/log/orthodoxmetrics'
    };
  }

  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDirectory, { recursive: true });
      await fs.mkdir(path.join(this.logDirectory, 'jit_sessions'), { recursive: true });
    } catch (error) {
      console.error('[JIT Manager] Failed to create log directory:', error);
    }
  }

  generateSessionId() {
    return 'jit-' + crypto.randomBytes(16).toString('hex');
  }

  async createSession(user, options = {}) {
    const sessionId = this.generateSessionId();
    const timeoutMinutes = options.timeoutMinutes || this.config.sessionTimeoutMinutes;
    const startTime = Date.now();
    const expiryTime = startTime + (timeoutMinutes * 60 * 1000);

    // Create PTY process with elevated privileges
    const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
    
    // Set up environment variables
    const sessionEnv = {
      ...process.env,
      TERM: 'xterm-color',
      JIT_SESSION_ID: sessionId,
      JIT_USER_ID: user.id,
      JIT_USER_NAME: user.name
    };

    // Add agent-specific environment variables
    if (options.isAgent) {
      sessionEnv.JIT_AGENT_SESSION = 'true';
      sessionEnv.JIT_AGENT_ID = options.agentId || 'unknown';
      sessionEnv.JIT_AGENT_TASK = options.task || 'unspecified';
    }

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || '/home/ubuntu',
      env: sessionEnv
    });

    const session = {
      id: sessionId,
      userId: user.id,
      userName: user.name,
      startTime,
      expiryTime,
      isActive: true,
      commandCount: 0,
      lastActivity: startTime,
      ptyProcess,
      websockets: new Set(),
      logStream: null,
      commandBuffer: '',
      outputBuffer: '',
      // Agent-specific properties
      isAgent: options.isAgent || false,
      agentId: options.agentId || null,
      task: options.task || null,
      restrictions: options.restrictions || null
    };

    // Set up logging (different for agents)
    if (this.config.logCommands) {
      if (options.isAgent) {
        await this.setupAgentSessionLogging(session);
      } else {
        await this.setupSessionLogging(session);
      }
    }

    // Set up PTY event handlers
    this.setupPTYHandlers(session);

    this.sessions.set(sessionId, session);

    // Log session creation (different for agents)
    if (options.isAgent) {
      await this.logAuditEvent({
        action: 'AGENT_SESSION_CREATED',
        sessionId,
        agentId: options.agentId,
        userId: user.id,
        userName: user.name,
        task: options.task,
        details: {
          timeoutMinutes,
          expiryTime,
          shell,
          restrictions: options.restrictions
        }
      });
    } else {
      await this.logAuditEvent({
        action: 'SESSION_CREATED',
        sessionId,
        userId: user.id,
        userName: user.name,
        details: {
          timeoutMinutes,
          expiryTime,
          shell
        }
      });
    }

    console.log(`[JIT Manager] ${options.isAgent ? 'Agent' : 'User'} session created: ${sessionId} for ${options.isAgent ? `agent ${options.agentId}` : `user ${user.name}`} (expires in ${timeoutMinutes} minutes)`);

    return {
      id: sessionId,
      userId: user.id,
      userName: user.name,
      startTime,
      expiryTime,
      isActive: true,
      commandCount: 0,
      lastActivity: startTime,
      isAgent: options.isAgent || false,
      agentId: options.agentId || null,
      task: options.task || null
    };
  }

  async setupSessionLogging(session) {
    const logFile = path.join(this.logDirectory, 'jit_sessions', `${session.id}.log`);
    
    try {
      const logHeader = [
        `JIT Terminal Session Log`,
        `========================`,
        `Session ID: ${session.id}`,
        `User: ${session.userName} (${session.userId})`,
        `Start Time: ${new Date(session.startTime).toISOString()}`,
        `Shell: ${session.ptyProcess.process}`,
        ``,
        `Command Log:`,
        `============`,
        ``
      ].join('\n');

      await fs.writeFile(logFile, logHeader);
      
      session.logFile = logFile;
      console.log(`[JIT Manager] Session logging enabled: ${logFile}`);
      
    } catch (error) {
      console.error(`[JIT Manager] Failed to setup logging for session ${session.id}:`, error);
    }
  }

  async setupAgentSessionLogging(session) {
    const logFile = path.join(this.logDirectory, 'jit_sessions', `${session.id}.log`);
    
    try {
      const logHeader = [
        `JIT Terminal Agent Session Log`,
        `=============================`,
        `Session ID: ${session.id}`,
        `Agent ID: ${session.agentId}`,
        `Task: ${session.task}`,
        `Start Time: ${new Date(session.startTime).toISOString()}`,
        `Shell: ${session.ptyProcess.process}`,
        ``,
        `Command Log:`,
        `============`,
        ``
      ].join('\n');

      await fs.writeFile(logFile, logHeader);
      
      session.logFile = logFile;
      console.log(`[JIT Manager] Agent session logging enabled: ${logFile}`);
      
    } catch (error) {
      console.error(`[JIT Manager] Failed to setup logging for agent session ${session.id}:`, error);
    }
  }

  setupPTYHandlers(session) {
    // Handle PTY output
    session.ptyProcess.onData((data) => {
      session.lastActivity = Date.now();
      session.outputBuffer += data;
      
      // Send to all connected WebSockets
      const message = JSON.stringify({
        type: 'output',
        data: data
      });
      
      session.websockets.forEach(ws => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(message);
        }
      });

      // Log output if enabled
      if (this.config.logCommands && session.logFile) {
        this.appendToSessionLog(session, `[OUTPUT] ${data}`);
      }
    });

    // Handle PTY exit
    session.ptyProcess.onExit((exitCode, signal) => {
      console.log(`[JIT Manager] PTY process exited for session ${session.id}: code=${exitCode}, signal=${signal}`);
      this.terminateSession(session.id, null, `PTY process exited (code: ${exitCode})`);
    });
  }

  async attachWebSocket(sessionId, ws) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive');
    }

    session.websockets.add(ws);
    session.lastActivity = Date.now();

    // Handle WebSocket messages (terminal input)
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'input') {
          session.ptyProcess.write(data.data);
          session.lastActivity = Date.now();
          
          // Track commands (detect Enter key)
          session.commandBuffer += data.data;
          if (data.data.includes('\r') || data.data.includes('\n')) {
            const command = session.commandBuffer.trim();
            if (command) {
              session.commandCount++;
              
              // Log command
              if (this.config.logCommands) {
                await this.logCommand(session, command);
              }
              
              // Send command logged event
              const commandMessage = JSON.stringify({
                type: 'command_logged',
                command: command
              });
              
              session.websockets.forEach(clientWs => {
                if (clientWs.readyState === 1) {
                  clientWs.send(commandMessage);
                }
              });
            }
            session.commandBuffer = '';
          }
        }
      } catch (error) {
        console.error(`[JIT Manager] WebSocket message error for session ${sessionId}:`, error);
      }
    });

    // Handle WebSocket close
    ws.on('close', () => {
      session.websockets.delete(ws);
      console.log(`[JIT Manager] WebSocket disconnected from session ${sessionId}`);
    });

    // Handle WebSocket error
    ws.on('error', (error) => {
      console.error(`[JIT Manager] WebSocket error for session ${sessionId}:`, error);
      session.websockets.delete(ws);
    });

    console.log(`[JIT Manager] WebSocket attached to session ${sessionId}`);
  }

  async logCommand(session, command) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [COMMAND] ${command}\n`;
      
      await fs.appendFile(session.logFile, logEntry);
      
      // Also log to audit system
      await this.logAuditEvent({
        action: 'COMMAND_EXECUTED',
        sessionId: session.id,
        userId: session.userId,
        userName: session.userName,
        details: {
          command,
          timestamp
        }
      });
      
    } catch (error) {
      console.error(`[JIT Manager] Failed to log command for session ${session.id}:`, error);
    }
  }

  async appendToSessionLog(session, data) {
    if (!session.logFile) return;
    
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${data}\n`;
      await fs.appendFile(session.logFile, logEntry);
    } catch (error) {
      console.error(`[JIT Manager] Failed to append to session log ${session.id}:`, error);
    }
  }

  async terminateSession(sessionId, user = null, reason = 'Manual termination') {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.isActive = false;

    // Close all WebSocket connections
    session.websockets.forEach(ws => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'session_expired'
        }));
        ws.close(1000, 'Session terminated');
      }
    });
    session.websockets.clear();

    // Kill PTY process
    try {
      session.ptyProcess.kill();
    } catch (error) {
      console.error(`[JIT Manager] Failed to kill PTY process for session ${sessionId}:`, error);
    }

    // Finalize session log
    if (session.logFile) {
      const endLog = [
        ``,
        `Session End:`,
        `============`,
        `End Time: ${new Date().toISOString()}`,
        `Reason: ${reason}`,
        `Commands Executed: ${session.commandCount}`,
        `Duration: ${Math.round((Date.now() - session.startTime) / 1000)} seconds`,
        ``
      ].join('\n');
      
      try {
        await fs.appendFile(session.logFile, endLog);
      } catch (error) {
        console.error(`[JIT Manager] Failed to finalize session log ${sessionId}:`, error);
      }
    }

    // Log session termination
    await this.logAuditEvent({
      action: 'SESSION_TERMINATED',
      sessionId,
      userId: session.userId,
      userName: session.userName,
      details: {
        reason,
        duration: Date.now() - session.startTime,
        commandCount: session.commandCount,
        terminatedBy: user ? user.name : 'system'
      }
    });

    this.sessions.delete(sessionId);
    console.log(`[JIT Manager] Session terminated: ${sessionId} (${reason})`);
  }

  async cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];

    for (const [sessionId, session] of this.sessions) {
      if (session.isActive && now > session.expiryTime) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      await this.terminateSession(sessionId, null, 'Session expired');
    }

    if (expiredSessions.length > 0) {
      console.log(`[JIT Manager] Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  async getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      userId: session.userId,
      userName: session.userName,
      startTime: session.startTime,
      expiryTime: session.expiryTime,
      isActive: session.isActive,
      commandCount: session.commandCount,
      lastActivity: session.lastActivity
    };
  }

  async getSessions(userId = null, includeAll = false) {
    const sessions = [];
    
    for (const session of this.sessions.values()) {
      // Filter by user unless includeAll is true (for super_admin)
      if (!includeAll && session.userId !== userId) {
        continue;
      }

      sessions.push({
        id: session.id,
        userId: session.userId,
        userName: session.userName,
        startTime: session.startTime,
        expiryTime: session.expiryTime,
        isActive: session.isActive,
        commandCount: session.commandCount,
        lastActivity: session.lastActivity
      });
    }

    return sessions.sort((a, b) => b.startTime - a.startTime);
  }

  async getActiveSessions(userId = null) {
    const activeSessions = [];
    
    for (const [sessionId, session] of this.sessions) {
      if (session.isActive && new Date() < new Date(session.expiryTime)) {
        // Filter by user if specified
        if (userId && session.userId !== userId) {
          continue;
        }
        
        activeSessions.push({
          id: session.id,
          userId: session.userId,
          userName: session.userName,
          startTime: session.startTime,
          expiryTime: session.expiryTime,
          commandCount: session.commandCount,
          lastActivity: session.lastActivity,
          isAgent: session.isAgent || false,
          agentId: session.agentId || null,
          task: session.task || null
        });
      }
    }
    
    return activeSessions;
  }

  async getSessionLogPath(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      // Check if log file exists for historical session
      const logFile = path.join(this.logDirectory, 'jit_sessions', `${sessionId}.log`);
      return logFile;
    }
    
    return session.logFile;
  }

  async getConfig() {
    return { ...this.config };
  }

  async updateConfig(newConfig, user) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Update log directory if changed
    if (newConfig.logDirectory && newConfig.logDirectory !== oldConfig.logDirectory) {
      this.logDirectory = newConfig.logDirectory;
      await this.ensureLogDirectory();
    }

    // Log configuration change
    await this.logAuditEvent({
      action: 'CONFIG_UPDATED',
      userId: user ? user.id : 'system',
      userName: user ? user.name : 'system',
      details: {
        oldConfig,
        newConfig,
        changedFields: Object.keys(newConfig)
      }
    });

    console.log(`[JIT Manager] Configuration updated by ${user ? user.name : 'system'}`);
  }

  async logAuditEvent(event) {
    const auditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event
    };

    this.auditLogs.push(auditEntry);

    // Keep only recent audit logs in memory
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }

    // Write to audit log file
    try {
      const auditLogFile = path.join(this.logDirectory, 'jit_terminal.log');
      const logLine = JSON.stringify(auditEntry) + '\n';
      await fs.appendFile(auditLogFile, logLine);
    } catch (error) {
      console.error('[JIT Manager] Failed to write audit log:', error);
    }
  }

  async logAgentActivity(event) {
    const auditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'AGENT_ACTIVITY',
      ...event
    };

    this.auditLogs.push(auditEntry);

    // Keep only recent audit logs in memory
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }

    // Write to separate agent log file
    try {
      const agentLogFile = path.join(this.logDirectory, 'jit_agent_activities.log');
      const logLine = JSON.stringify(auditEntry) + '\n';
      await fs.appendFile(agentLogFile, logLine);
      
      // Also write to main audit log for centralized monitoring
      const auditLogFile = path.join(this.logDirectory, 'jit_terminal.log');
      await fs.appendFile(auditLogFile, logLine);
    } catch (error) {
      console.error('[JIT Manager] Failed to write agent activity log:', error);
    }
  }

  async getAuditLogs(filters = {}) {
    let logs = [...this.auditLogs];

    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }

    if (filters.action) {
      logs = logs.filter(log => log.action === filters.action);
    }

    if (filters.startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= filters.startDate);
    }

    if (filters.endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= filters.endDate);
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Graceful shutdown
  async shutdown() {
    console.log('[JIT Manager] Shutting down...');
    
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      await this.terminateSession(sessionId, null, 'System shutdown');
    }

    await this.logAuditEvent({
      action: 'SYSTEM_SHUTDOWN',
      userId: 'system',
      userName: 'system',
      details: {
        sessionsTerminated: sessionIds.length
      }
    });

    console.log('[JIT Manager] Shutdown complete');
  }
}

module.exports = JITSessionManager; 