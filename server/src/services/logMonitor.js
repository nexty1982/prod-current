/**
 * Backend Log Monitor Service
 * Monitors PM2 logs for errors and warnings in real-time
 * Emits alerts via Socket.IO to connected admin clients
 */

const { spawn } = require('child_process');
const EventEmitter = require('events');

class LogMonitor extends EventEmitter {
  constructor() {
    super();
    this.pm2Process = null;
    this.isMonitoring = false;
    this.logBuffer = [];
    this.maxBufferSize = 500;
  }

  /**
   * Start monitoring PM2 logs
   * @param {string} appName - PM2 app name to monitor (default: 'orthodox-backend')
   */
  start(appName = 'orthodox-backend') {
    if (this.isMonitoring) {
      console.log('[LogMonitor] Already monitoring');
      return;
    }

    console.log(`[LogMonitor] Starting monitor for ${appName}`);
    this.isMonitoring = true;

    try {
      // Spawn PM2 logs process with raw output
      this.pm2Process = spawn('pm2', ['logs', appName, '--lines', '100', '--raw']);

      // Handle stdout data
      this.pm2Process.stdout.on('data', (data) => {
        this.processLogData(data);
      });

      // Handle stderr data
      this.pm2Process.stderr.on('data', (data) => {
        console.error('[LogMonitor] PM2 stderr:', data.toString());
      });

      // Handle process exit
      this.pm2Process.on('close', (code) => {
        console.log(`[LogMonitor] PM2 process exited with code ${code}`);
        this.isMonitoring = false;
        
        // Auto-restart after 5 seconds if not manually stopped
        if (code !== 0) {
          setTimeout(() => this.start(appName), 5000);
        }
      });

      // Handle process errors
      this.pm2Process.on('error', (err) => {
        console.error('[LogMonitor] PM2 process error:', err);
        this.isMonitoring = false;
      });

    } catch (error) {
      console.error('[LogMonitor] Failed to start monitoring:', error);
      this.isMonitoring = false;
    }
  }

  /**
   * Process incoming log data and categorize
   * @param {Buffer} data - Raw log data from PM2
   */
  processLogData(data) {
    const lines = data.toString().split('\n');
    
    lines.forEach(line => {
      if (!line.trim()) return;

      // Check for error patterns
      const isError = /error|exception|fail|fatal|crash/i.test(line);
      const isWarning = /warn|warning|deprecated/i.test(line);

      if (isError || isWarning) {
        const logEntry = {
          type: isError ? 'error' : 'warning',
          message: line.trim(),
          timestamp: new Date().toISOString(),
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };

        // Add to buffer
        this.logBuffer.push(logEntry);
        
        // Maintain buffer size limit
        if (this.logBuffer.length > this.maxBufferSize) {
          this.logBuffer.shift();
        }

        // Emit event for real-time notification
        this.emit('log-alert', logEntry);
      }
    });
  }

  /**
   * Get current log buffer
   * @returns {Array} Array of log entries
   */
  getLogBuffer() {
    return [...this.logBuffer];
  }

  /**
   * Get log statistics
   * @returns {Object} Stats object with counts
   */
  getStats() {
    const errors = this.logBuffer.filter(log => log.type === 'error').length;
    const warnings = this.logBuffer.filter(log => log.type === 'warning').length;
    
    return {
      total: this.logBuffer.length,
      errors,
      warnings,
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Clear the log buffer and return cleared entries
   * @returns {Array} Cleared log entries
   */
  clearBuffer() {
    const cleared = [...this.logBuffer];
    this.logBuffer = [];
    return cleared;
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.pm2Process) {
      console.log('[LogMonitor] Stopping monitor');
      this.pm2Process.kill();
      this.pm2Process = null;
    }
    this.isMonitoring = false;
  }
}

// Singleton instance
const logMonitor = new LogMonitor();

module.exports = logMonitor;
