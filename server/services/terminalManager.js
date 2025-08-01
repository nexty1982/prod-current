/**
 * Terminal Manager
 * Manages actual terminal sessions using node-pty for real shell interaction
 */

const pty = require('node-pty');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;

class TerminalManager {
  constructor() {
    this.terminals = new Map(); // sessionId -> terminal instance
    this.terminalSessions = new Map(); // sessionId -> session data
    
    // Terminal configuration
    this.config = {
      shell: process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash'),
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || os.homedir(),
      env: { ...process.env },
      encoding: 'utf8'
    };
    
    console.log(`[Terminal Manager] Initialized with shell: ${this.config.shell}`);
  }

  /**
   * Create a new terminal session
   * @param {string} sessionId - Unique session identifier
   * @param {object} options - Terminal options (cols, rows, cwd)
   * @returns {object} Terminal session info
   */
  async createTerminal(sessionId, options = {}) {
    try {
      // If terminal already exists for this session, close it first
      if (this.terminals.has(sessionId)) {
        await this.closeTerminal(sessionId);
      }

      // Merge options with defaults
      const terminalOptions = {
        name: 'xterm-color',
        cols: options.cols || this.config.cols,
        rows: options.rows || this.config.rows,
        cwd: options.cwd || this.config.cwd,
        env: { ...this.config.env, ...options.env },
      };

      console.log(`[Terminal Manager] Creating terminal for session ${sessionId}`);
      console.log(`[Terminal Manager] Shell: ${this.config.shell}`);
      console.log(`[Terminal Manager] CWD: ${terminalOptions.cwd}`);
      console.log(`[Terminal Manager] Size: ${terminalOptions.cols}x${terminalOptions.rows}`);

      // Spawn the terminal process
      const ptyProcess = pty.spawn(this.config.shell, [], terminalOptions);

      console.log(`[Terminal Manager] Spawned shell PID: ${ptyProcess.pid}`);

      // Store terminal instance
      this.terminals.set(sessionId, ptyProcess);
      
      // Store session data
      const sessionData = {
        sessionId,
        pid: ptyProcess.pid,
        shell: this.config.shell,
        createdAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
        cols: terminalOptions.cols,
        rows: terminalOptions.rows,
        cwd: terminalOptions.cwd
      };
      
      this.terminalSessions.set(sessionId, sessionData);

      // Set up terminal event handlers
      this.setupTerminalHandlers(sessionId, ptyProcess);

      // Send initial test command to verify shell is working
      setTimeout(() => {
        console.log(`[Terminal Manager] Sending test command to session ${sessionId}`);
        ptyProcess.write('echo "JIT Terminal session active - PID: $$"\n');
      }, 1000);

      return {
        success: true,
        sessionId,
        pid: ptyProcess.pid,
        shell: this.config.shell,
        message: 'Terminal session created successfully'
      };

    } catch (error) {
      console.error(`[Terminal Manager] Failed to create terminal for session ${sessionId}:`, error);
      throw new Error(`Failed to create terminal: ${error.message}`);
    }
  }

  /**
   * Set up event handlers for a terminal process
   * @param {string} sessionId - Session identifier
   * @param {object} ptyProcess - The spawned pty process
   */
  setupTerminalHandlers(sessionId, ptyProcess) {
    // Handle terminal output
    ptyProcess.on('data', (data) => {
      console.log(`[Terminal ${sessionId}] OUTPUT:`, data.toString().trim());
      
      // Update last activity
      const session = this.terminalSessions.get(sessionId);
      if (session) {
        session.lastActivity = new Date();
        this.terminalSessions.set(sessionId, session);
      }
      
      // Emit data event that WebSocket can listen to
      ptyProcess.emit('session_data', sessionId, data);
    });

    // Handle terminal exit
    ptyProcess.on('exit', (code, signal) => {
      console.log(`[Terminal ${sessionId}] CLOSED - code: ${code}, signal: ${signal}`);
      
      // Update session status
      const session = this.terminalSessions.get(sessionId);
      if (session) {
        session.isActive = false;
        session.exitCode = code;
        session.exitSignal = signal;
        session.closedAt = new Date();
        this.terminalSessions.set(sessionId, session);
      }
      
      // Emit exit event
      ptyProcess.emit('session_exit', sessionId, code, signal);
    });

    // Handle errors
    ptyProcess.on('error', (error) => {
      console.error(`[Terminal ${sessionId}] ERROR:`, error);
      
      // Emit error event
      ptyProcess.emit('session_error', sessionId, error);
    });
  }

  /**
   * Write data to a terminal session
   * @param {string} sessionId - Session identifier
   * @param {string} data - Data to write to terminal
   * @returns {boolean} Success status
   */
  async writeToTerminal(sessionId, data) {
    try {
      const ptyProcess = this.terminals.get(sessionId);
      
      if (!ptyProcess) {
        throw new Error(`Terminal session ${sessionId} not found`);
      }

      console.log(`[Terminal ${sessionId}] INPUT:`, data.toString().trim());
      
      // Write data to terminal
      ptyProcess.write(data);
      
      // Update last activity
      const session = this.terminalSessions.get(sessionId);
      if (session) {
        session.lastActivity = new Date();
        this.terminalSessions.set(sessionId, session);
      }
      
      return true;
    } catch (error) {
      console.error(`[Terminal Manager] Failed to write to terminal ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Resize a terminal session
   * @param {string} sessionId - Session identifier
   * @param {number} cols - Number of columns
   * @param {number} rows - Number of rows
   * @returns {boolean} Success status
   */
  async resizeTerminal(sessionId, cols, rows) {
    try {
      const ptyProcess = this.terminals.get(sessionId);
      
      if (!ptyProcess) {
        throw new Error(`Terminal session ${sessionId} not found`);
      }

      console.log(`[Terminal ${sessionId}] RESIZE: ${cols}x${rows}`);
      
      // Resize terminal
      ptyProcess.resize(cols, rows);
      
      // Update session data
      const session = this.terminalSessions.get(sessionId);
      if (session) {
        session.cols = cols;
        session.rows = rows;
        session.lastActivity = new Date();
        this.terminalSessions.set(sessionId, session);
      }
      
      return true;
    } catch (error) {
      console.error(`[Terminal Manager] Failed to resize terminal ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get terminal session info
   * @param {string} sessionId - Session identifier
   * @returns {object|null} Session data
   */
  getTerminalSession(sessionId) {
    return this.terminalSessions.get(sessionId) || null;
  }

  /**
   * Get terminal process for event handling
   * @param {string} sessionId - Session identifier
   * @returns {object|null} Terminal process
   */
  getTerminalProcess(sessionId) {
    return this.terminals.get(sessionId) || null;
  }

  /**
   * Close a terminal session
   * @param {string} sessionId - Session identifier
   * @returns {boolean} Success status
   */
  async closeTerminal(sessionId) {
    try {
      const ptyProcess = this.terminals.get(sessionId);
      
      if (ptyProcess) {
        console.log(`[Terminal Manager] Closing terminal session ${sessionId} (PID: ${ptyProcess.pid})`);
        
        // Kill the process
        ptyProcess.kill();
        
        // Remove from maps
        this.terminals.delete(sessionId);
      }
      
      // Update session status
      const session = this.terminalSessions.get(sessionId);
      if (session) {
        session.isActive = false;
        session.closedAt = new Date();
        this.terminalSessions.set(sessionId, session);
      }
      
      return true;
    } catch (error) {
      console.error(`[Terminal Manager] Failed to close terminal ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get all active terminal sessions
   * @returns {Array} List of active sessions
   */
  getActiveSessions() {
    const activeSessions = [];
    
    for (const [sessionId, session] of this.terminalSessions) {
      if (session.isActive) {
        activeSessions.push({
          sessionId: session.sessionId,
          pid: session.pid,
          shell: session.shell,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          cols: session.cols,
          rows: session.rows,
          cwd: session.cwd
        });
      }
    }
    
    return activeSessions;
  }

  /**
   * Clean up inactive sessions
   */
  cleanup() {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
    
    for (const [sessionId, session] of this.terminalSessions) {
      if (session.isActive && (now - session.lastActivity) > inactiveThreshold) {
        console.log(`[Terminal Manager] Cleaning up inactive session ${sessionId}`);
        this.closeTerminal(sessionId);
      }
    }
  }

  /**
   * Test terminal functionality
   * @returns {object} Test results
   */
  async testTerminal() {
    const testSessionId = `test-${Date.now()}`;
    
    try {
      console.log('[Terminal Manager] Running terminal test...');
      
      // Create test terminal
      const result = await this.createTerminal(testSessionId, {
        cols: 80,
        rows: 24
      });
      
      // Get the process
      const ptyProcess = this.getTerminalProcess(testSessionId);
      
      if (!ptyProcess) {
        throw new Error('Failed to get terminal process');
      }
      
      // Test command execution
      return new Promise((resolve, reject) => {
        let output = '';
        const timeout = setTimeout(() => {
          this.closeTerminal(testSessionId);
          reject(new Error('Terminal test timeout'));
        }, 5000);
        
        ptyProcess.on('data', (data) => {
          output += data.toString();
          
          // Look for test command completion
          if (output.includes('JIT Terminal session active')) {
            clearTimeout(timeout);
            this.closeTerminal(testSessionId);
            
            resolve({
              success: true,
              pid: ptyProcess.pid,
              shell: this.config.shell,
              output: output,
              message: 'Terminal test completed successfully'
            });
          }
        });
        
        ptyProcess.on('error', (error) => {
          clearTimeout(timeout);
          this.closeTerminal(testSessionId);
          reject(error);
        });
      });
      
    } catch (error) {
      await this.closeTerminal(testSessionId);
      throw error;
    }
  }
}

module.exports = TerminalManager;
