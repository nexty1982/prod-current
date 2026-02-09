/**
 * Admin Logs API
 * Endpoints for managing backend log monitoring and archiving
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logMonitor = require('../services/logMonitor');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * GET /api/admin/logs/stats
 * Get current log monitoring statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = logMonitor.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[AdminLogs] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get log stats'
    });
  }
});

/**
 * GET /api/admin/logs/buffer
 * Get current log buffer
 */
router.get('/buffer', (req, res) => {
  try {
    const logs = logMonitor.getLogBuffer();
    res.json({
      success: true,
      logs,
      count: logs.length
    });
  } catch (error) {
    console.error('[AdminLogs] Error getting buffer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get log buffer'
    });
  }
});

/**
 * POST /api/admin/logs/archive
 * Archive current logs to file and clear buffer
 */
router.post('/archive', (req, res) => {
  try {
    const { logEntries } = req.body;
    
    // Use provided entries or get from buffer
    const entries = logEntries || logMonitor.getLogBuffer();
    
    if (entries.length === 0) {
      return res.json({
        success: true,
        message: 'No logs to archive',
        archived: 0
      });
    }

    // Create filename with current date
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `adminhud-${dateStr}.log`;
    const filePath = path.join(logsDir, fileName);

    // Format log entries
    const content = entries.map(entry => {
      const timestamp = entry.timestamp || new Date().toISOString();
      const type = (entry.type || 'info').toUpperCase();
      const message = entry.message || '';
      return `[${timestamp}] ${type}: ${message}`;
    }).join('\n');

    // Append to file
    fs.appendFileSync(filePath, content + '\n');

    // Clear the buffer
    logMonitor.clearBuffer();

    res.json({
      success: true,
      message: 'Logs archived successfully',
      archived: entries.length,
      file: fileName
    });

  } catch (error) {
    console.error('[AdminLogs] Error archiving logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive logs'
    });
  }
});

/**
 * POST /api/admin/logs/start
 * Start log monitoring
 */
router.post('/start', (req, res) => {
  try {
    const { appName } = req.body;
    logMonitor.start(appName || 'orthodox-backend');
    
    res.json({
      success: true,
      message: 'Log monitoring started'
    });
  } catch (error) {
    console.error('[AdminLogs] Error starting monitor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start log monitoring'
    });
  }
});

/**
 * POST /api/admin/logs/stop
 * Stop log monitoring
 */
router.post('/stop', (req, res) => {
  try {
    logMonitor.stop();
    
    res.json({
      success: true,
      message: 'Log monitoring stopped'
    });
  } catch (error) {
    console.error('[AdminLogs] Error stopping monitor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop log monitoring'
    });
  }
});

module.exports = router;
