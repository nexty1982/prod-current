// logger.js
const fs = require('fs').promises;
const path = require('path');
const { formatTimestamp, formatTimestampUser } = require('./formatTimestamp');

class Logger {
  constructor() {
    this.logDir = '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/logs';
    this.ensureLogDir();
  }

  async ensureLogDir() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      // Log directory creation failed, but we can still log to console
      console.error('Failed to create log directory:', error);
    }
  }

  async writeToFile(level, message, details = null) {
    const rawTimestamp = new Date().toISOString();
    const formattedTimestamp = formatTimestamp(rawTimestamp);
    const logEntry = {
      timestamp: rawTimestamp, // Keep ISO for file storage
      timestampFormatted: formattedTimestamp, // Add formatted version
      level,
      message,
      details
    };

    const logFile = path.join(this.logDir, 'encrypted-storage.log');
    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      // Fallback to console if file write fails
      console.error('Failed to write to log file:', error);
    }

    // Also log to console for development - use formatted timestamp
    const consoleMessage = `[${formattedTimestamp}] ${level.toUpperCase()}: ${message}`;
    if (details) {
      console.log(consoleMessage, details);
    } else {
      console.log(consoleMessage);
    }
  }

  info(message, details = null) {
    this.writeToFile('info', message, details);
  }

  warn(message, details = null) {
    this.writeToFile('warn', message, details);
  }

  error(message, details = null) {
    this.writeToFile('error', message, details);
  }

  debug(message, details = null) {
    this.writeToFile('debug', message, details);
  }
}

module.exports = new Logger();
