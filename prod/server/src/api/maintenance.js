const express = require('express');
const router = express.Router();
const MaintenanceService = require('../services/maintenanceService');
const logger = require('../utils/logger');

// Initialize maintenance service
const maintenanceService = new MaintenanceService();

/**
 * Middleware to check maintenance permissions
 */
const requireMaintenancePermission = (req, res, next) => {
  console.log('🔐 Maintenance permission check - Session user:', req.session?.user);
  
  if (!req.session?.user) {
    console.log('❌ No authenticated user found in maintenance permission check');
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  const userRole = req.session.user.role;
  console.log('🔐 Maintenance permission check - User role:', userRole);
  
  if (!userRole || !['super_admin'].includes(userRole)) {
    console.log('❌ Maintenance access denied - User role not authorized:', userRole);
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions. Maintenance access requires super_admin role.'
    });
  }
  
  console.log('✅ Maintenance permission check passed for role:', userRole);
  next();
};

/**
 * GET /api/admin/maintenance/status
 * Get current maintenance mode status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await maintenanceService.getStatus();
    
    res.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get maintenance status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/maintenance/activate
 * Activate maintenance mode
 */
router.post('/activate', requireMaintenancePermission, async (req, res) => {
  try {
    const {
      message,
      status,
      eta,
      reason,
      allowlist = [],
      exemptRoles,
      exemptIPs
    } = req.body;
    
    const user = req.session.user;
    const userIP = req.ip || req.connection.remoteAddress;
    
    const options = {
      message,
      status,
      eta,
      reason: reason || 'Manual activation via API',
      activatedBy: `${user.email} (${user.role})`,
      allowlist,
      exemptRoles,
      exemptIPs
    };
    
    const result = await maintenanceService.activate(options);
    
    // Log the activation
    logger.info('Maintenance mode activated via API', {
      activatedBy: user.email,
      userRole: user.role,
      userIP,
      reason: options.reason,
      eta
    });
    
    res.json({
      success: true,
      message: 'Maintenance mode activated successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to activate maintenance mode via API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/maintenance/deactivate
 * Deactivate maintenance mode
 */
router.post('/deactivate', requireMaintenancePermission, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = req.session.user;
    const userIP = req.ip || req.connection.remoteAddress;
    
    const deactivatedBy = `${user.email} (${user.role})`;
    const deactivationReason = reason || 'Manual deactivation via API';
    
    const result = await maintenanceService.deactivate(deactivatedBy, deactivationReason);
    
    // Log the deactivation
    logger.info('Maintenance mode deactivated via API', {
      deactivatedBy: user.email,
      userRole: user.role,
      userIP,
      reason: deactivationReason,
      duration: result.duration
    });
    
    res.json({
      success: true,
      message: 'Maintenance mode deactivated successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to deactivate maintenance mode via API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/admin/maintenance/config
 * Update maintenance configuration
 */
router.put('/config', requireMaintenancePermission, async (req, res) => {
  try {
    const updates = req.body;
    const user = req.session.user;
    
    // Remove sensitive fields that shouldn't be updated via API
    const sanitizedUpdates = { ...updates };
    delete sanitizedUpdates.activatedAt;
    delete sanitizedUpdates.activatedBy;
    
    const result = await maintenanceService.updateConfig(sanitizedUpdates);
    
    logger.info('Maintenance configuration updated via API', {
      updatedBy: user.email,
      userRole: user.role,
      updates: Object.keys(sanitizedUpdates)
    });
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to update maintenance config via API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/maintenance/emergency
 * Emergency shutdown - immediate maintenance activation
 */
router.post('/emergency', requireMaintenancePermission, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = req.session.user;
    const userIP = req.ip || req.connection.remoteAddress;
    
    const emergencyReason = reason || 'Emergency shutdown via API';
    const activatedBy = `${user.email} (${user.role}) - EMERGENCY`;
    
    const result = await maintenanceService.emergencyShutdown(emergencyReason, activatedBy);
    
    // Log the emergency activation
    logger.warn('EMERGENCY SHUTDOWN activated via API', {
      activatedBy: user.email,
      userRole: user.role,
      userIP,
      reason: emergencyReason
    });
    
    res.json({
      success: true,
      message: 'Emergency shutdown activated',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to activate emergency shutdown via API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/maintenance/schedule
 * Schedule maintenance for future activation
 */
router.post('/schedule', requireMaintenancePermission, async (req, res) => {
  try {
    const {
      scheduledTime,
      message,
      status,
      eta,
      reason,
      allowlist = []
    } = req.body;
    
    if (!scheduledTime) {
      return res.status(400).json({
        success: false,
        error: 'scheduledTime is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const user = req.session.user;
    
    const options = {
      message,
      status,
      eta,
      reason: reason || 'Scheduled maintenance via API',
      activatedBy: `${user.email} (${user.role}) - SCHEDULED`,
      allowlist
    };
    
    const result = await maintenanceService.scheduleMaintenance(scheduledTime, options);
    
    logger.info('Maintenance scheduled via API', {
      scheduledBy: user.email,
      userRole: user.role,
      scheduledFor: scheduledTime,
      reason: options.reason
    });
    
    res.json({
      success: true,
      message: 'Maintenance scheduled successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to schedule maintenance via API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/maintenance/logs
 * Get maintenance event logs
 */
router.get('/logs', requireMaintenancePermission, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const logs = await maintenanceService.getLogs(parseInt(limit));
    
    res.json({
      success: true,
      logs: logs,
      count: logs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get maintenance logs via API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/maintenance/statistics
 * Get maintenance statistics
 */
router.get('/statistics', requireMaintenancePermission, async (req, res) => {
  try {
    const stats = await maintenanceService.getStatistics();
    
    res.json({
      success: true,
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get maintenance statistics via API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/maintenance/check-exempt
 * Check if current user/IP is exempt from maintenance
 */
router.get('/check-exempt', async (req, res) => {
  try {
    const user = req.session?.user;
    const userIP = req.ip || req.connection.remoteAddress;
    
    const isExempt = maintenanceService.isExempt(user, userIP);
    
    res.json({
      success: true,
      isExempt: isExempt,
      user: user ? {
        email: user.email,
        role: user.role
      } : null,
      ip: userIP,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to check exemption status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 