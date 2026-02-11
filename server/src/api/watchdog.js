const express = require('express');
const router = express.Router();
const OMAIWatchdogService = require('../services/omaiWatchdogService');
const logger = require('../utils/logger');

// Initialize watchdog service singleton
let watchdogService = null;

// Middleware to check watchdog permissions (super admin only)
const requireWatchdogPermission = (req, res, next) => {
  console.log('🔐 Watchdog permission check - Session user:', req.session?.user);
  
  if (!req.session?.user) {
    console.log('❌ No authenticated user found in watchdog permission check');
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  const userRole = req.session.user.role;
  console.log('🔐 Watchdog permission check - User role:', userRole);
  
  if (!userRole || !['super_admin'].includes(userRole)) {
    console.log('❌ Watchdog access denied - User role not authorized:', userRole);
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions. Watchdog access requires super_admin role.'
    });
  }
  
  console.log('✅ Watchdog permission check passed for role:', userRole);
  next();
};

// Initialize watchdog service
const initializeWatchdogService = () => {
  if (!watchdogService) {
    watchdogService = new OMAIWatchdogService();
    
    // Set up event listeners
    watchdogService.on('alert', (alert) => {
      logger.warn('OMAI Watchdog Alert Emitted:', {
        id: alert.id,
        severity: alert.severity,
        title: alert.title
      });
      
      // TODO: Integrate with notification system
      // Could broadcast to connected WebSocket clients
    });
    
    watchdogService.on('daily_summary', (summary) => {
      logger.info('OMAI Watchdog Daily Summary Generated:', {
        date: summary.date,
        totalEvents: Object.values(summary.events).reduce((a, b) => a + b, 0)
      });
      
      // TODO: Send to Big Book storage
    });
  }
  return watchdogService;
};

// Apply permission check to all routes
router.use(requireWatchdogPermission);

/**
 * GET /api/admin/watchdog/status
 * Get current watchdog system status
 */
router.get('/status', (req, res) => {
  try {
    const service = initializeWatchdogService();
    const status = service.getSystemStatus();
    
    res.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get watchdog status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/watchdog/start
 * Start watchdog monitoring
 */
router.post('/start', async (req, res) => {
  try {
    const service = initializeWatchdogService();
    
    if (service.isMonitoring) {
      return res.json({
        success: true,
        message: 'Watchdog is already monitoring',
        timestamp: new Date().toISOString()
      });
    }
    
    await service.startMonitoring();
    
    logger.info('Watchdog monitoring started via API', {
      user: req.session.user.email
    });
    
    res.json({
      success: true,
      message: 'Watchdog monitoring started successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to start watchdog monitoring:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/watchdog/stop
 * Stop watchdog monitoring
 */
router.post('/stop', async (req, res) => {
  try {
    const service = initializeWatchdogService();
    
    if (!service.isMonitoring) {
      return res.json({
        success: true,
        message: 'Watchdog is not currently monitoring',
        timestamp: new Date().toISOString()
      });
    }
    
    await service.stopMonitoring();
    
    logger.info('Watchdog monitoring stopped via API', {
      user: req.session.user.email
    });
    
    res.json({
      success: true,
      message: 'Watchdog monitoring stopped successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to stop watchdog monitoring:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/watchdog/config
 * Get current watchdog configuration
 */
router.get('/config', (req, res) => {
  try {
    const service = initializeWatchdogService();
    
    res.json({
      success: true,
      config: service.config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get watchdog config:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/admin/watchdog/config
 * Update watchdog configuration
 */
router.put('/config', async (req, res) => {
  try {
    const service = initializeWatchdogService();
    const newConfig = req.body;
    
    // Validate configuration
    if (newConfig.alertLevel && !['info', 'warning', 'error', 'critical'].includes(newConfig.alertLevel)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid alert level. Must be one of: info, warning, error, critical',
        timestamp: new Date().toISOString()
      });
    }
    
    if (newConfig.scanFrequency && !newConfig.scanFrequency.match(/^\d+[mhd]$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scan frequency. Must be in format like: 5m, 1h, or 1d',
        timestamp: new Date().toISOString()
      });
    }
    
    await service.updateConfiguration(newConfig);
    
    logger.info('Watchdog configuration updated via API', {
      user: req.session.user.email,
      changes: Object.keys(newConfig)
    });
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      config: service.config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to update watchdog config:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/watchdog/alerts
 * Get current alerts
 */
router.get('/alerts', (req, res) => {
  try {
    const service = initializeWatchdogService();
    const { 
      severity, 
      category, 
      acknowledged, 
      limit = 50 
    } = req.query;
    
    const options = {
      severity,
      category,
      acknowledged: acknowledged !== undefined ? acknowledged === 'true' : null,
      limit: parseInt(limit)
    };
    
    const alerts = service.getAlerts(options);
    
    res.json({
      success: true,
      alerts: alerts,
      count: alerts.length,
      filters: options,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get watchdog alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/watchdog/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:id/acknowledge', (req, res) => {
  try {
    const service = initializeWatchdogService();
    const { id } = req.params;
    
    const acknowledged = service.acknowledgeAlert(id);
    
    if (acknowledged) {
      logger.info('Watchdog alert acknowledged via API', {
        alertId: id,
        user: req.session.user.email
      });
      
      res.json({
        success: true,
        message: 'Alert acknowledged successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Alert not found',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Failed to acknowledge alert:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/watchdog/alerts/:id/execute/:action
 * Execute a suggested action for an alert
 */
router.post('/alerts/:id/execute/:action', async (req, res) => {
  try {
    const service = initializeWatchdogService();
    const { id, action } = req.params;
    
    const result = await service.executeSuggestedAction(id, action);
    
    logger.info('Watchdog action executed via API', {
      alertId: id,
      action,
      user: req.session.user.email,
      success: result.success
    });
    
    res.json({
      success: true,
      message: 'Action executed successfully',
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to execute watchdog action:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/watchdog/summary
 * Get current daily summary
 */
router.get('/summary', (req, res) => {
  try {
    const service = initializeWatchdogService();
    
    res.json({
      success: true,
      summary: service.dailySummary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get watchdog summary:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/watchdog/summary/generate
 * Force generate current daily summary
 */
router.post('/summary/generate', (req, res) => {
  try {
    const service = initializeWatchdogService();
    const summary = service.generateDailySummary();
    
    logger.info('Daily summary generated via API', {
      user: req.session.user.email
    });
    
    res.json({
      success: true,
      message: 'Daily summary generated successfully',
      summary: summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to generate daily summary:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/watchdog/health
 * Get system health check results
 */
router.get('/health', async (req, res) => {
  try {
    const service = initializeWatchdogService();
    
    // Force a health check
    await service.performSystemHealthCheck();
    
    // Get recent health-related alerts
    const healthAlerts = service.getAlerts({
      category: 'system',
      limit: 20
    });
    
    res.json({
      success: true,
      healthAlerts: healthAlerts,
      config: service.config.systemChecks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get system health:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/watchdog/stats
 * Get watchdog statistics
 */
router.get('/stats', (req, res) => {
  try {
    const service = initializeWatchdogService();
    const alerts = service.getAlerts({ limit: 1000 });
    
    const stats = {
      totalAlerts: alerts.length,
      unacknowledged: alerts.filter(a => !a.acknowledged).length,
      bySeverity: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        error: alerts.filter(a => a.severity === 'error').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length
      },
      byCategory: {},
      recentActivity: alerts.slice(0, 10),
      systemHealth: {
        isMonitoring: service.isMonitoring,
        watchedFiles: service.config.allowedFiles.length,
        lastSummary: service.dailySummary?.date || null
      }
    };
    
    // Calculate category stats
    alerts.forEach(alert => {
      stats.byCategory[alert.category] = (stats.byCategory[alert.category] || 0) + 1;
    });
    
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get watchdog stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/watchdog/test
 * Test watchdog functionality with a sample alert
 */
router.post('/test', (req, res) => {
  try {
    const service = initializeWatchdogService();
    
    // Create a test alert
    const testAlert = service.createAlert({
      timestamp: new Date().toISOString(),
      filePath: 'test',
      severity: 'warning',
      message: 'This is a test alert generated by the API',
      category: 'test',
      service: 'api'
    });
    
    logger.info('Test alert created via API', {
      alertId: testAlert.id,
      user: req.session.user.email
    });
    
    res.json({
      success: true,
      message: 'Test alert created successfully',
      alert: testAlert,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to create test alert:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 