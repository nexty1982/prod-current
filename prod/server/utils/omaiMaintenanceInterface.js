const MaintenanceService = require('../services/maintenanceService');
const logger = require('./logger');

class OMAIMaintenanceInterface {
  constructor() {
    this.maintenanceService = new MaintenanceService();
    this.initialized = false;
    
    this.initialize();
  }

  async initialize() {
    try {
      await this.maintenanceService.initialize();
      this.initialized = true;
      logger.info('OMAI Maintenance Interface initialized');
    } catch (error) {
      logger.error('Failed to initialize OMAI Maintenance Interface:', error);
    }
  }

  /**
   * OMAI.maintenance.activate(message, estimatedTime, reason)
   * Activate maintenance mode via OMAI
   */
  async activate(message = null, estimatedTime = null, reason = 'OMAI activation') {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const options = {
        message: message || 'The system is temporarily unavailable for maintenance. We will be back shortly.',
        status: 'System maintenance in progress via OMAI',
        eta: estimatedTime ? new Date(estimatedTime).toISOString() : null,
        reason: reason,
        activatedBy: 'OMAI',
        allowlist: [],
        exemptRoles: ['super_admin', 'dev_admin'],
        exemptIPs: ['127.0.0.1', '::1']
      };

      const result = await this.maintenanceService.activate(options);

      logger.info('OMAI activated maintenance mode', {
        message: message?.substring(0, 50),
        estimatedTime,
        reason
      });

      return {
        success: true,
        message: 'Maintenance mode activated via OMAI',
        data: result,
        activatedAt: new Date().toISOString(),
        estimatedTime: estimatedTime
      };
    } catch (error) {
      logger.error('OMAI failed to activate maintenance mode:', error);
      throw new Error(`OMAI maintenance activation failed: ${error.message}`);
    }
  }

  /**
   * OMAI.maintenance.deactivate()
   * Deactivate maintenance mode via OMAI
   */
  async deactivate(reason = 'OMAI deactivation') {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const result = await this.maintenanceService.deactivate('OMAI', reason);

      logger.info('OMAI deactivated maintenance mode', {
        reason,
        duration: result.duration
      });

      return {
        success: true,
        message: 'Maintenance mode deactivated via OMAI',
        data: result,
        deactivatedAt: new Date().toISOString(),
        duration: result.duration
      };
    } catch (error) {
      logger.error('OMAI failed to deactivate maintenance mode:', error);
      throw new Error(`OMAI maintenance deactivation failed: ${error.message}`);
    }
  }

  /**
   * OMAI.maintenance.status()
   * Get current maintenance status
   */
  async status() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const status = await this.maintenanceService.getStatus();

      return {
        success: true,
        data: {
          isActive: status.isActive,
          activatedAt: status.config?.activatedAt || null,
          activatedBy: status.config?.activatedBy || null,
          reason: status.config?.reason || null,
          message: status.config?.message || null,
          status: status.config?.status || null,
          eta: status.config?.eta || null,
          duration: status.duration,
          timeRemaining: status.timeRemaining,
          exemptRoles: status.config?.exemptRoles || [],
          allowlist: status.config?.allowlist || []
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('OMAI failed to get maintenance status:', error);
      throw new Error(`OMAI maintenance status check failed: ${error.message}`);
    }
  }

  /**
   * OMAI.maintenance.update(config)
   * Update maintenance configuration
   */
  async update(config = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const allowedUpdates = {};

      // Only allow certain fields to be updated via OMAI
      const allowedFields = ['message', 'status', 'eta', 'allowlist'];
      
      for (const field of allowedFields) {
        if (config[field] !== undefined) {
          allowedUpdates[field] = config[field];
        }
      }

      if (Object.keys(allowedUpdates).length === 0) {
        throw new Error('No valid fields provided for update');
      }

      // Convert eta to ISO string if provided
      if (allowedUpdates.eta) {
        allowedUpdates.eta = new Date(allowedUpdates.eta).toISOString();
      }

      const result = await this.maintenanceService.updateConfig(allowedUpdates);

      logger.info('OMAI updated maintenance configuration', {
        updates: Object.keys(allowedUpdates)
      });

      return {
        success: true,
        message: 'Maintenance configuration updated via OMAI',
        data: result,
        updatedFields: Object.keys(allowedUpdates),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('OMAI failed to update maintenance config:', error);
      throw new Error(`OMAI maintenance update failed: ${error.message}`);
    }
  }

  /**
   * OMAI.maintenance.emergency(reason)
   * Emergency shutdown via OMAI
   */
  async emergency(reason = 'OMAI emergency shutdown') {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const result = await this.maintenanceService.emergencyShutdown(reason, 'OMAI-EMERGENCY');

      logger.warn('OMAI activated emergency shutdown', { reason });

      return {
        success: true,
        message: 'Emergency shutdown activated via OMAI',
        data: result,
        reason: reason,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('OMAI failed to activate emergency shutdown:', error);
      throw new Error(`OMAI emergency shutdown failed: ${error.message}`);
    }
  }

  /**
   * OMAI.maintenance.schedule(time, options)
   * Schedule maintenance for future activation
   */
  async schedule(scheduledTime, options = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!scheduledTime) {
        throw new Error('Scheduled time is required');
      }

      const scheduleOptions = {
        message: options.message || 'Scheduled maintenance is now in progress',
        status: options.status || 'Scheduled maintenance via OMAI',
        eta: options.eta || null,
        reason: options.reason || 'OMAI scheduled maintenance',
        activatedBy: 'OMAI-SCHEDULER',
        allowlist: options.allowlist || []
      };

      if (scheduleOptions.eta) {
        scheduleOptions.eta = new Date(scheduleOptions.eta).toISOString();
      }

      const result = await this.maintenanceService.scheduleMaintenance(scheduledTime, scheduleOptions);

      logger.info('OMAI scheduled maintenance', {
        scheduledTime,
        reason: scheduleOptions.reason
      });

      return {
        success: true,
        message: 'Maintenance scheduled via OMAI',
        data: result,
        scheduledFor: new Date(scheduledTime).toISOString(),
        options: scheduleOptions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('OMAI failed to schedule maintenance:', error);
      throw new Error(`OMAI maintenance scheduling failed: ${error.message}`);
    }
  }

  /**
   * OMAI.maintenance.logs(limit)
   * Get maintenance event logs
   */
  async logs(limit = 20) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const logs = await this.maintenanceService.getLogs(limit);

      return {
        success: true,
        logs: logs,
        count: logs.length,
        limit: limit,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('OMAI failed to get maintenance logs:', error);
      throw new Error(`OMAI maintenance logs retrieval failed: ${error.message}`);
    }
  }

  /**
   * OMAI.maintenance.statistics()
   * Get maintenance statistics
   */
  async statistics() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const stats = await this.maintenanceService.getStatistics();

      return {
        success: true,
        statistics: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('OMAI failed to get maintenance statistics:', error);
      throw new Error(`OMAI maintenance statistics retrieval failed: ${error.message}`);
    }
  }

  /**
   * OMAI.maintenance.isExempt(user, ip)
   * Check if user/IP is exempt from maintenance
   */
  isExempt(user = null, ip = null) {
    try {
      return this.maintenanceService.isExempt(user, ip);
    } catch (error) {
      logger.error('OMAI failed to check exemption status:', error);
      return false;
    }
  }

  /**
   * Get all available OMAI maintenance methods
   */
  getAvailableMethods() {
    return {
      'activate': {
        description: 'Activate maintenance mode',
        parameters: ['message (optional)', 'estimatedTime (optional)', 'reason (optional)'],
        example: 'OMAI.maintenance.activate("Database upgrade in progress", "2025-01-27T03:00:00Z", "Database maintenance")'
      },
      'deactivate': {
        description: 'Deactivate maintenance mode',
        parameters: ['reason (optional)'],
        example: 'OMAI.maintenance.deactivate("Maintenance completed")'
      },
      'status': {
        description: 'Get current maintenance status',
        parameters: [],
        example: 'OMAI.maintenance.status()'
      },
      'update': {
        description: 'Update maintenance configuration',
        parameters: ['config (object)'],
        example: 'OMAI.maintenance.update({ message: "New message", eta: "2025-01-27T04:00:00Z" })'
      },
      'emergency': {
        description: 'Activate emergency shutdown',
        parameters: ['reason (optional)'],
        example: 'OMAI.maintenance.emergency("Critical security issue")'
      },
      'schedule': {
        description: 'Schedule maintenance for future activation',
        parameters: ['scheduledTime', 'options (optional)'],
        example: 'OMAI.maintenance.schedule("2025-01-27T02:00:00Z", { message: "Scheduled upgrade", eta: "2025-01-27T04:00:00Z" })'
      },
      'logs': {
        description: 'Get maintenance event logs',
        parameters: ['limit (optional)'],
        example: 'OMAI.maintenance.logs(50)'
      },
      'statistics': {
        description: 'Get maintenance statistics',
        parameters: [],
        example: 'OMAI.maintenance.statistics()'
      },
      'isExempt': {
        description: 'Check if user/IP is exempt from maintenance',
        parameters: ['user (optional)', 'ip (optional)'],
        example: 'OMAI.maintenance.isExempt(currentUser, "192.168.1.100")'
      }
    };
  }
}

// Export singleton instance
module.exports = new OMAIMaintenanceInterface(); 