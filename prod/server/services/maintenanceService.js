const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class MaintenanceService {
  constructor() {
    this.flagPath = '/etc/omai/maintenance.flag';
    this.configPath = '/etc/omai/maintenance.json';
    this.logPath = '/var/log/omai/maintenance.log';
    this.backupConfigPath = path.join(process.cwd(), 'config', 'maintenance.json');
    this.isActive = false;
    this.config = null;
    
    // Default maintenance configuration
    this.defaultConfig = {
      status: 'System maintenance in progress',
      message: 'We are currently performing scheduled maintenance to improve your experience.',
      eta: null,
      reason: 'Scheduled maintenance',
      activatedAt: null,
      activatedBy: 'system',
      allowlist: [],
      exemptRoles: ['super_admin', 'dev_admin'],
      exemptIPs: ['127.0.0.1', '::1'],
      contactInfo: {
        email: 'support@orthodoxmetrics_db.com',
        phone: null
      },
      theme: {
        backgroundColor: '#1e40af',
        textColor: '#ffffff',
        logoUrl: '/assets/logo.png'
      }
    };
    
    this.initialize();
  }

  /**
   * Initialize maintenance service
   */
  async initialize() {
    try {
      // Ensure directories exist
      await this.ensureDirectories();
      
      // Check if maintenance mode is currently active
      await this.loadMaintenanceState();
      
      logger.info('Maintenance service initialized', {
        isActive: this.isActive,
        configLoaded: !!this.config
      });
    } catch (error) {
      logger.error('Failed to initialize maintenance service:', error);
    }
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    const directories = [
      path.dirname(this.flagPath),
      path.dirname(this.configPath),
      path.dirname(this.logPath),
      path.dirname(this.backupConfigPath)
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true, mode: 0o755 });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          logger.warn(`Could not create directory ${dir}:`, error.message);
        }
      }
    }
  }

  /**
   * Load current maintenance state
   */
  async loadMaintenanceState() {
    try {
      // Check if flag file exists
      await fs.access(this.flagPath);
      this.isActive = true;
      
      // Load configuration
      await this.loadConfig();
      
      logger.info('Maintenance mode is currently ACTIVE');
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.isActive = false;
        this.config = null;
        logger.info('Maintenance mode is currently INACTIVE');
      } else {
        logger.error('Error checking maintenance state:', error);
      }
    }
  }

  /**
   * Load maintenance configuration
   */
  async loadConfig() {
    try {
      const configContent = await fs.readFile(this.configPath, 'utf8');
      this.config = { ...this.defaultConfig, ...JSON.parse(configContent) };
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Try backup location
        try {
          const backupContent = await fs.readFile(this.backupConfigPath, 'utf8');
          this.config = { ...this.defaultConfig, ...JSON.parse(backupContent) };
          logger.info('Loaded maintenance config from backup location');
        } catch (backupError) {
          this.config = { ...this.defaultConfig };
          logger.warn('Using default maintenance configuration');
        }
      } else {
        logger.error('Error loading maintenance config:', error);
        this.config = { ...this.defaultConfig };
      }
    }
  }

  /**
   * Activate maintenance mode
   */
  async activate(options = {}) {
    try {
      const {
        message = this.defaultConfig.message,
        status = this.defaultConfig.status,
        eta = null,
        reason = 'Manual activation',
        activatedBy = 'system',
        allowlist = [],
        exemptRoles = this.defaultConfig.exemptRoles,
        exemptIPs = this.defaultConfig.exemptIPs
      } = options;

      // Create maintenance configuration
      this.config = {
        ...this.defaultConfig,
        message,
        status,
        eta: eta ? new Date(eta).toISOString() : null,
        reason,
        activatedAt: new Date().toISOString(),
        activatedBy,
        allowlist: [...this.defaultConfig.allowlist, ...allowlist],
        exemptRoles,
        exemptIPs: [...this.defaultConfig.exemptIPs, ...exemptIPs]
      };

      // Write configuration file
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
      
      // Write backup configuration
      await fs.writeFile(this.backupConfigPath, JSON.stringify(this.config, null, 2));

      // Create flag file
      await fs.writeFile(this.flagPath, JSON.stringify({
        activated: true,
        timestamp: new Date().toISOString(),
        activatedBy,
        reason
      }, null, 2));

      this.isActive = true;

      // Log activation
      await this.logMaintenanceEvent('ACTIVATED', {
        activatedBy,
        reason,
        eta,
        message: message.substring(0, 100)
      });

      logger.info('Maintenance mode ACTIVATED', {
        activatedBy,
        reason,
        eta
      });

      return {
        success: true,
        message: 'Maintenance mode activated successfully',
        config: this.config
      };
    } catch (error) {
      logger.error('Failed to activate maintenance mode:', error);
      throw new Error(`Failed to activate maintenance mode: ${error.message}`);
    }
  }

  /**
   * Deactivate maintenance mode
   */
  async deactivate(deactivatedBy = 'system', reason = 'Manual deactivation') {
    try {
      if (!this.isActive) {
        return {
          success: false,
          message: 'Maintenance mode is not currently active'
        };
      }

      const duration = this.config?.activatedAt 
        ? Date.now() - new Date(this.config.activatedAt).getTime()
        : 0;

      // Remove flag file
      try {
        await fs.unlink(this.flagPath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          logger.warn('Could not remove flag file:', error.message);
        }
      }

      // Log deactivation before clearing config
      await this.logMaintenanceEvent('DEACTIVATED', {
        deactivatedBy,
        reason,
        duration: Math.round(duration / 1000), // seconds
        originalReason: this.config?.reason,
        activatedBy: this.config?.activatedBy
      });

      this.isActive = false;
      this.config = null;

      logger.info('Maintenance mode DEACTIVATED', {
        deactivatedBy,
        reason,
        duration: Math.round(duration / 1000)
      });

      return {
        success: true,
        message: 'Maintenance mode deactivated successfully',
        duration: duration
      };
    } catch (error) {
      logger.error('Failed to deactivate maintenance mode:', error);
      throw new Error(`Failed to deactivate maintenance mode: ${error.message}`);
    }
  }

  /**
   * Get current maintenance status
   */
  async getStatus() {
    // Refresh state from filesystem
    await this.loadMaintenanceState();

    return {
      isActive: this.isActive,
      config: this.config,
      duration: this.config?.activatedAt 
        ? Date.now() - new Date(this.config.activatedAt).getTime()
        : 0,
      timeRemaining: this.config?.eta 
        ? Math.max(0, new Date(this.config.eta).getTime() - Date.now())
        : null
    };
  }

  /**
   * Update maintenance configuration
   */
  async updateConfig(updates) {
    try {
      if (!this.isActive) {
        throw new Error('Cannot update config: maintenance mode is not active');
      }

      this.config = { ...this.config, ...updates };

      // Write updated configuration
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
      await fs.writeFile(this.backupConfigPath, JSON.stringify(this.config, null, 2));

      logger.info('Maintenance configuration updated', { updates });

      return {
        success: true,
        message: 'Configuration updated successfully',
        config: this.config
      };
    } catch (error) {
      logger.error('Failed to update maintenance config:', error);
      throw error;
    }
  }

  /**
   * Check if user/IP should be allowed during maintenance
   */
  isExempt(user = null, ip = null) {
    if (!this.isActive || !this.config) {
      return true; // Not in maintenance mode
    }

    // Check exempt roles
    if (user && user.role && this.config.exemptRoles.includes(user.role)) {
      return true;
    }

    // Check exempt IPs
    if (ip && this.config.exemptIPs.includes(ip)) {
      return true;
    }

    // Check allowlist (email or IP)
    if (user && user.email && this.config.allowlist.includes(user.email)) {
      return true;
    }

    if (ip && this.config.allowlist.includes(ip)) {
      return true;
    }

    return false;
  }

  /**
   * Log maintenance events
   */
  async logMaintenanceEvent(action, details = {}) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        details,
        pid: process.pid,
        hostname: require('os').hostname()
      };

      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.logPath, logLine);

      // Also log to application logger
      logger.info(`Maintenance ${action}`, details);
    } catch (error) {
      logger.error('Failed to log maintenance event:', error);
    }
  }

  /**
   * Get maintenance logs
   */
  async getLogs(limit = 50) {
    try {
      const content = await fs.readFile(this.logPath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      const logs = lines
        .slice(-limit)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(log => log !== null)
        .reverse(); // Most recent first

      return logs;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      logger.error('Failed to read maintenance logs:', error);
      throw error;
    }
  }

  /**
   * Get maintenance statistics
   */
  async getStatistics() {
    try {
      const logs = await this.getLogs(1000); // Get more logs for statistics
      
      const stats = {
        totalActivations: 0,
        totalDowntime: 0, // in seconds
        averageDowntime: 0,
        longestDowntime: 0,
        shortestDowntime: Infinity,
        activationsByUser: {},
        activationsByReason: {},
        recentActivations: []
      };

      let currentActivation = null;

      // Process logs in chronological order
      for (const log of logs.reverse()) {
        if (log.action === 'ACTIVATED') {
          currentActivation = {
            activatedAt: new Date(log.timestamp),
            activatedBy: log.details.activatedBy || 'unknown',
            reason: log.details.reason || 'unknown'
          };
        } else if (log.action === 'DEACTIVATED' && currentActivation) {
          const duration = log.details.duration || 0;
          
          stats.totalActivations++;
          stats.totalDowntime += duration;
          
          if (duration > stats.longestDowntime) {
            stats.longestDowntime = duration;
          }
          if (duration < stats.shortestDowntime) {
            stats.shortestDowntime = duration;
          }

          // Track by user
          const user = currentActivation.activatedBy;
          stats.activationsByUser[user] = (stats.activationsByUser[user] || 0) + 1;

          // Track by reason
          const reason = currentActivation.reason;
          stats.activationsByReason[reason] = (stats.activationsByReason[reason] || 0) + 1;

          // Recent activations
          if (stats.recentActivations.length < 10) {
            stats.recentActivations.push({
              ...currentActivation,
              deactivatedAt: new Date(log.timestamp),
              duration
            });
          }

          currentActivation = null;
        }
      }

      // Calculate averages
      if (stats.totalActivations > 0) {
        stats.averageDowntime = Math.round(stats.totalDowntime / stats.totalActivations);
      }
      
      if (stats.shortestDowntime === Infinity) {
        stats.shortestDowntime = 0;
      }

      return stats;
    } catch (error) {
      logger.error('Failed to generate maintenance statistics:', error);
      return null;
    }
  }

  /**
   * Emergency shutdown - force maintenance mode activation
   */
  async emergencyShutdown(reason = 'Emergency shutdown', activatedBy = 'system') {
    try {
      await this.activate({
        message: 'The system is temporarily unavailable due to an emergency. We apologize for the inconvenience.',
        status: 'Emergency maintenance in progress',
        reason,
        activatedBy,
        eta: null
      });

      logger.warn('EMERGENCY SHUTDOWN activated', { reason, activatedBy });
      
      return {
        success: true,
        message: 'Emergency shutdown activated',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to activate emergency shutdown:', error);
      throw error;
    }
  }

  /**
   * Schedule maintenance for future activation
   */
  async scheduleMaintenance(scheduledTime, options = {}) {
    try {
      const scheduleTime = new Date(scheduledTime);
      const now = new Date();

      if (scheduleTime <= now) {
        throw new Error('Scheduled time must be in the future');
      }

      const delay = scheduleTime.getTime() - now.getTime();

      // Store scheduled maintenance info
      const scheduleInfo = {
        scheduledFor: scheduleTime.toISOString(),
        options,
        createdAt: now.toISOString(),
        status: 'scheduled'
      };

      // Set timeout for activation
      setTimeout(async () => {
        try {
          await this.activate({
            ...options,
            reason: options.reason || 'Scheduled maintenance',
            activatedBy: options.activatedBy || 'system-scheduler'
          });
        } catch (error) {
          logger.error('Failed to activate scheduled maintenance:', error);
        }
      }, delay);

      logger.info('Maintenance scheduled', {
        scheduledFor: scheduleTime.toISOString(),
        delay: Math.round(delay / 1000)
      });

      return {
        success: true,
        message: 'Maintenance scheduled successfully',
        scheduledFor: scheduleTime.toISOString(),
        delay: delay
      };
    } catch (error) {
      logger.error('Failed to schedule maintenance:', error);
      throw error;
    }
  }
}

module.exports = MaintenanceService; 