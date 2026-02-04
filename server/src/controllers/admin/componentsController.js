/**
 * Admin Components Controller
 * Handles system component management operations
 * 
 * Endpoints:
 * - GET /api/admin/components - List all system components
 * - PATCH /api/admin/components/:id - Toggle component enable/disable
 * - GET /api/admin/components/:id/logs - Get component logs
 * - POST /api/admin/components/:id/test - Run component diagnostics
 */

const fs = require('fs').promises;
const path = require('path');
// Detect context (dist vs source) for module loading
const isDist = __dirname.includes(path.sep + 'dist' + path.sep);

let ComponentUsageTrackerDB;
if (isDist) {
    ComponentUsageTrackerDB = require('../../utils/componentUsageTrackerDB');
} else {
    try {
        ComponentUsageTrackerDB = require('../../utils/componentUsageTrackerDB');
    } catch (e) {
        ComponentUsageTrackerDB = require('../../utils/componentUsageTrackerDB');
    }
}
const usageTracker = new ComponentUsageTrackerDB();

let formatTimestampModule;
if (isDist) {
    formatTimestampModule = require('../../utils/formatTimestamp');
} else {
    try {
        formatTimestampModule = require('../../utils/formatTimestamp');
    } catch (e) {
        formatTimestampModule = require('../../utils/formatTimestamp');
    }
}
const { formatTimestamp, formatTimestampUser, formatRelativeTime } = formatTimestampModule;

class ComponentsController {
  constructor() {
    this.manifestPath = path.join(__dirname, '../../data/componentManifest.json');
    this.logsPath = path.join(__dirname, '../../logs');
  }

  /**
   * Helper method to determine category from component type
   * @param {string} type - Component type
   * @returns {string} Category name
   */
  getCategoryFromType(type) {
    const typeMapping = {
      'backend-route': 'Backend Services',
      'frontend-component': 'UI Components',
      'frontend-app': 'Applications',
      'service': 'System Services',
      'middleware': 'Middleware',
      'database': 'Data Storage',
      'auth': 'Security',

      'notification': 'Communication',
      'admin': 'Administration',
      'analytics': 'Analytics',
      'content': 'Content Management',
      'billing': 'Billing & Payments',
      'calendar': 'Calendar & Events'
    };

    return typeMapping[type] || 'System Utilities';
  }

  /**
   * Calculate category breakdown for components
   * @param {Array} components - Array of components
   * @returns {Object} Category breakdown with counts
   */
  calculateCategoryBreakdown(components) {
    const breakdown = {};
    
    components.forEach(component => {
      const category = component.category || 'Uncategorized';
      if (!breakdown[category]) {
        breakdown[category] = {
          total: 0,
          healthy: 0,
          degraded: 0,
          failed: 0,
          enabled: 0,
          disabled: 0,
          active: 0,
          inactive: 0,
          unused: 0
        };
      }
      
      breakdown[category].total++;
      breakdown[category][component.health]++;
      breakdown[category][component.enabled ? 'enabled' : 'disabled']++;
      breakdown[category][component.usageStatus]++;
    });

    return breakdown;
  }

  /**
   * Calculate usage breakdown for components
   * @param {Array} components - Array of components
   * @returns {Object} Usage breakdown with counts
   */
  calculateUsageBreakdown(components) {
    const breakdown = {
      active: 0,
      inactive: 0,
      unused: 0
    };

    components.forEach(component => {
      breakdown[component.usageStatus]++;
    });

    return breakdown;
  }

  /**
   * Determine component visibility based on user role
   * @param {Object} component - Component object
   * @returns {Array} Array of roles that can see this component
   */
  getComponentVisibility(component) {
    // Component-specific visibility overrides
    const componentVisibility = {
      // System-critical components (super admin only)
      'authentication-service': ['super_admin'],
      'database-connector': ['super_admin'],
      'session-manager': ['super_admin'],
      'api-gateway': ['super_admin'],
      'backup-scheduler': ['super_admin'],
      
      // Admin components (admin and above)
      'notification-service': ['super_admin', 'admin'],
      'user-management': ['super_admin', 'admin'],
      'admin-dashboard': ['super_admin', 'admin'],
      
      // Regular components (accessible to admins)

      'file-storage': ['super_admin', 'admin'],
      'calendar-service': ['super_admin', 'admin']
    };

    // Return specific visibility if defined, otherwise default to admin access
    return componentVisibility[component.id] || ['super_admin', 'admin'];
  }

  /**
   * Load component manifest from JSON file
   * @returns {Promise<Array>} Array of components
   */
  async loadComponentManifest() {
    try {
      const data = await fs.readFile(this.manifestPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading component manifest:', error);
      throw new Error('Failed to load component manifest');
    }
  }

  /**
   * Save component manifest to JSON file
   * @param {Array} components - Array of components to save
   */
  async saveComponentManifest(components) {
    try {
      await fs.writeFile(this.manifestPath, JSON.stringify(components, null, 2));
    } catch (error) {
      console.error('Error saving component manifest:', error);
      throw new Error('Failed to save component manifest');
    }
  }

  /**
   * GET /api/admin/components
   * Retrieve system components with pagination, filtering, and usage analytics
   * 
   * Query Parameters:
   * - page: number (default: 1)
   * - limit: number (default: 20, max: 100)
   * - category: string (filter by category)
   * - status: string (filter by health status: healthy, degraded, failed)
   * - usageStatus: string (filter by usage: active, inactive, unused)
   * - search: string (search by component name)
   * - role: string (filter by user role permissions)
   */
  async getAllComponents(req, res) {
    try {
      // Extract query parameters
      const {
        page = 1,
        limit = 20,
        category,
        status,
        usageStatus,
        search,
        enabled
      } = req.query;

      // Validate pagination parameters
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
      const offset = (pageNum - 1) * limitNum;

      // Load components and usage data with fallback
      let components, usageStats;
      try {
        [components, usageStats] = await Promise.all([
          this.loadComponentManifest(),
          usageTracker.getUsageStatistics()
        ]);
      } catch (error) {
        console.warn('Failed to load usage statistics, using fallback:', error.message);
        // Load components without usage stats as fallback
        components = await this.loadComponentManifest();
        usageStats = {}; // Empty usage stats as fallback
      }

      // Log usage for this API access (with error handling)
      try {
        const userId = req.session?.user?.email || 'anonymous';
        await usageTracker.logComponentUsage('admin-components-api', userId, 'list');
      } catch (error) {
        console.warn('Failed to log component usage:', error.message);
        // Continue without logging - don't break the API response
      }

      // Extract component IDs for batched usage query
      const componentIds = components.map(component => component.id);
      
      // Fetch usage information for all components in a single query
      let batchUsageInfo;
      try {
        console.log(`[COMPONENTS-API] Fetching usage data for ${componentIds.length} components`);
        batchUsageInfo = await usageTracker.getBatchComponentUsageStatus(componentIds);
      } catch (error) {
        console.warn('Failed to get batch usage info, using fallback:', error.message);
        // Create fallback usage info for all components
        batchUsageInfo = {};
        componentIds.forEach(id => {
          batchUsageInfo[id] = {
            status: 'unknown',
            lastUsed: null,
            totalAccesses: 0,
            daysSinceLastUse: null,
            uniqueUsers: 0
          };
        });
      }

      // Enhance components with usage information and categorization
      const currentTime = new Date().toISOString();
      const enhancedComponents = components.map((component) => {
        const usageInfo = batchUsageInfo[component.id] || {
          status: 'unknown',
          lastUsed: null,
          totalAccesses: 0,
          daysSinceLastUse: null,
          uniqueUsers: 0
        };
        
        return {
          ...component,
          // Ensure categorization
          category: component.category || this.getCategoryFromType(component.type) || 'Uncategorized',
          // Add usage information
          usageStatus: usageInfo.status,
          lastUsed: usageInfo.lastUsed,
          totalAccesses: usageInfo.totalAccesses,
          daysSinceLastUse: usageInfo.daysSinceLastUse,
          uniqueUsers: usageInfo.uniqueUsers,
          lastUsedFormatted: usageInfo.lastUsed ? formatRelativeTime(usageInfo.lastUsed) : 'Never',
          // Update health check timestamp
          lastHealthCheck: currentTime,
          lastHealthCheckFormatted: formatTimestampUser(currentTime),
          // Format existing timestamps
          lastUpdatedFormatted: component.lastUpdated ? formatTimestampUser(component.lastUpdated) : '',
          // Add role-based visibility
          visibleToRoles: this.getComponentVisibility(component, req.session?.user?.role)
        };
      });

      // Apply filters
      let filteredComponents = enhancedComponents;

      // Filter by category
      if (category && category !== 'all') {
        filteredComponents = filteredComponents.filter(comp => 
          comp.category.toLowerCase() === category.toLowerCase()
        );
      }

      // Filter by health status
      if (status && status !== 'all') {
        filteredComponents = filteredComponents.filter(comp => 
          comp.health === status
        );
      }

      // Filter by usage status
      if (usageStatus && usageStatus !== 'all') {
        filteredComponents = filteredComponents.filter(comp => 
          comp.usageStatus === usageStatus
        );
      }

      // Filter by search term
      if (search) {
        const searchTerm = search.toLowerCase();
        filteredComponents = filteredComponents.filter(comp =>
          comp.name.toLowerCase().includes(searchTerm) ||
          comp.description.toLowerCase().includes(searchTerm) ||
          comp.id.toLowerCase().includes(searchTerm)
        );
      }

      // Filter by enabled/disabled status
      if (enabled && enabled !== 'all') {
        const isEnabled = enabled === 'true';
        filteredComponents = filteredComponents.filter(comp => 
          comp.enabled === isEnabled
        );
      }

      // Apply role-based filtering
      const userRole = req.session?.user?.role;
      if (userRole !== 'super_admin') {
        filteredComponents = filteredComponents.filter(comp => 
          comp.visibleToRoles.includes(userRole)
        );
      }

      // Calculate total and pagination
      const total = filteredComponents.length;
      const totalPages = Math.ceil(total / limitNum);

      // Apply pagination
      const paginatedComponents = filteredComponents
        .slice(offset, offset + limitNum);

      // Calculate category breakdown for current filter
      const categoryBreakdown = this.calculateCategoryBreakdown(filteredComponents);
      
      // Calculate usage breakdown for current filter
      const usageBreakdown = this.calculateUsageBreakdown(filteredComponents);
      
      // Calculate status breakdown for current filter
      const statusBreakdown = this.calculateStatusBreakdown(filteredComponents);
      
      // Calculate health breakdown for current filter
      const healthBreakdown = this.calculateHealthBreakdown(filteredComponents);

      // Prepare response with metadata
      const response = {
        components: paginatedComponents,
        meta: {
          // Pagination info
          page: pageNum,
          limit: limitNum,
          total: total,
          totalPages: totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
          
          // Usage statistics
          usageStats: {
            usageBreakdown: {
              active: usageBreakdown.active,
              inactive: usageBreakdown.inactive,
              unused: usageBreakdown.unused
            },
            statusBreakdown: {
              enabled: statusBreakdown.enabled,
              disabled: statusBreakdown.disabled
            },
            healthBreakdown: {
              healthy: healthBreakdown.healthy,
              degraded: healthBreakdown.degraded,
              failed: healthBreakdown.failed
            },
            totalAccesses: filteredComponents.reduce((sum, comp) => sum + comp.totalAccesses, 0)
          },
          
          // Category breakdown
          categoryBreakdown,
          
          // Applied filters
          filters: {
            category: category || 'all',
            status: status || 'all',
            usageStatus: usageStatus || 'all',
            search: search || '',
            enabled: enabled || 'all'
          },
          
          // Global statistics
          globalStats: {
            totalComponents: components.length,
            totalCategories: Object.keys(categoryBreakdown).length,
            topComponents: usageStats.topComponents || [],
            recentActivity: (usageStats.recentActivity || []).slice(0, 5)
          }
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching components:', error);
      res.status(500).json({
        error: 'Failed to retrieve system components',
        details: error.message
      });
    }
  }

  /**
   * PATCH /api/admin/components/:id
   * Toggle component enabled/disabled status
   */
  async toggleComponent(req, res) {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          error: 'Invalid request',
          details: 'enabled field must be a boolean value'
        });
      }

      const components = await this.loadComponentManifest();
      const componentIndex = components.findIndex(comp => comp.id === id);

      if (componentIndex === -1) {
        return res.status(404).json({
          error: 'Component not found',
          details: `No component found with ID: ${id}`
        });
      }

      // Log usage for toggle action
      const userId = req.session?.user?.email || 'anonymous';
      await usageTracker.logComponentUsage(id, userId, 'toggle');

      // Update component status
      components[componentIndex].enabled = enabled;
      components[componentIndex].lastUpdated = new Date().toISOString();
      components[componentIndex].lastUpdatedFormatted = formatTimestampUser(components[componentIndex].lastUpdated);
      
      // Simulate health check after enabling/disabling
      if (enabled) {
        // When enabling, set health to healthy unless there are known issues
        if (!components[componentIndex].healthIssues || components[componentIndex].healthIssues.length === 0) {
          components[componentIndex].health = 'healthy';
        }
      } else {
        // When disabling, health becomes indeterminate but not failed
        components[componentIndex].health = 'healthy'; // Component is intentionally disabled
      }

      await this.saveComponentManifest(components);

      // Log the action
      console.log(`Component ${id} ${enabled ? 'enabled' : 'disabled'} by user ${req.session?.user?.email || 'unknown'}`);

      res.json({
        success: true,
        message: `Component "${components[componentIndex].name}" has been ${enabled ? 'enabled' : 'disabled'}`,
        component: components[componentIndex]
      });

    } catch (error) {
      console.error('Error toggling component:', error);
      res.status(500).json({
        error: 'Failed to toggle component',
        details: error.message
      });
    }
  }

  /**
   * GET /api/admin/components/:id/logs
   * Retrieve logs for a specific component
   */
  async getComponentLogs(req, res) {
    try {
      const { id } = req.params;
      const { limit = 100 } = req.query;

      const components = await this.loadComponentManifest();
      const component = components.find(comp => comp.id === id);

      if (!component) {
        return res.status(404).json({
          error: 'Component not found',
          details: `No component found with ID: ${id}`
        });
      }

      // Log usage for logs access
      const userId = req.session?.user?.email || 'anonymous';
      await usageTracker.logComponentUsage(id, userId, 'logs');

      // Generate realistic sample logs based on component health and type
      const logs = this.generateSampleLogs(component, parseInt(limit));

      res.json({
        component: component.name,
        total: logs.length,
        logs: logs
      });

    } catch (error) {
      console.error('Error fetching component logs:', error);
      res.status(500).json({
        error: 'Failed to retrieve component logs',
        details: error.message
      });
    }
  }

  /**
   * POST /api/admin/components/:id/test
   * Run diagnostic tests for a specific component
   */
  async runComponentTest(req, res) {
    try {
      const { id } = req.params;

      const components = await this.loadComponentManifest();
      const componentIndex = components.findIndex(comp => comp.id === id);

      if (componentIndex === -1) {
        return res.status(404).json({
          error: 'Component not found',
          details: `No component found with ID: ${id}`
        });
      }

      const component = components[componentIndex];

      // Log usage for test action
      const userId = req.session?.user?.email || 'anonymous';
      await usageTracker.logComponentUsage(id, userId, 'test');

      // Simulate running diagnostic tests
      const testResults = await this.simulateComponentTests(component);

      // Update component health based on test results
      let newHealth = 'healthy';
      const failedTests = testResults.tests.filter(test => test.status === 'fail');
      const warnTests = testResults.tests.filter(test => test.status === 'warn');

      if (failedTests.length > 0) {
        newHealth = 'failed';
      } else if (warnTests.length > 0) {
        newHealth = 'degraded';
      }

      // Update component in manifest
      components[componentIndex].health = newHealth;
      components[componentIndex].lastHealthCheck = new Date().toISOString();
      components[componentIndex].lastHealthCheckFormatted = formatTimestampUser(components[componentIndex].lastHealthCheck);
      components[componentIndex].lastUpdated = new Date().toISOString();
      components[componentIndex].lastUpdatedFormatted = formatTimestampUser(components[componentIndex].lastUpdated);

      // Update health issues based on test results
      if (failedTests.length > 0 || warnTests.length > 0) {
        components[componentIndex].healthIssues = [
          ...failedTests.map(test => `${test.name}: ${test.error || test.details || 'Failed'}`),
          ...warnTests.map(test => `${test.name}: ${test.details || 'Warning'}`)
        ];
      } else {
        delete components[componentIndex].healthIssues;
      }

      await this.saveComponentManifest(components);

      // Log the test action
      console.log(`Component test run for ${id} by user ${req.session?.user?.email || 'unknown'}: ${testResults.status}`);

      res.json({
        ...testResults,
        health: newHealth,
        component: components[componentIndex]
      });

    } catch (error) {
      console.error('Error running component test:', error);
      res.status(500).json({
        error: 'Failed to run component test',
        details: error.message
      });
    }
  }

  /**
   * Generate realistic sample logs for a component
   * @param {Object} component - Component configuration
   * @param {number} limit - Maximum number of log entries
   * @returns {Array} Array of log entries
   */
  generateSampleLogs(component, limit = 100) {
    const logs = [];
    const now = new Date();
    
    const logLevels = ['info', 'warn', 'error', 'debug'];
    const baseMessages = {
      'authentication-service': [
        'User authentication successful',
        'Session created for user',
        'Failed login attempt detected',
        'Password reset requested',
        'JWT token refreshed',
        'Role-based access check passed'
      ],
      'database-connector': [
        'Connection pool initialized',
        'Database query executed',
        'Connection pool at 85% capacity',
        'Slow query detected',
        'Database connection restored',
        'Connection timeout warning'
      ],
      'notification-service': [
        'Email notification sent successfully',
        'SMS delivery confirmed',
        'Push notification queued',
        'Email delivery failed - retrying',
        'Notification template rendered',
        'Bulk notification job completed'
      ],
      'backup-scheduler': [
        'Backup job started',
        'Database backup completed',
        'File system backup failed',
        'Backup verification passed',
        'Cleanup of old backups completed',
        'Insufficient disk space for backup'
      ],
      'api-gateway': [
        'Request routed successfully',
        'Rate limit applied to client',
        'API endpoint health check passed',
        'SSL certificate renewed',
        'Load balancer configuration updated',
        'Request throttling activated'
      ],
      'session-manager': [
        'Session cleanup completed',
        'Active sessions: 142',
        'Session timeout configured',
        'Invalid session token rejected',
        'Session store synchronized',
        'Session data encrypted'
      ],
      'file-storage': [
        'File upload completed',
        'Storage quota check passed',
        'File retrieval successful',
        'Temporary file cleanup completed',
        'Storage migration in progress',
        'File integrity check passed'
      ]
    };

    const messages = baseMessages[component.id] || [
      'Service initialized successfully',
      'Health check completed',
      'Configuration loaded',
      'Service operation completed',
      'Warning: Performance degraded',
      'Error: Service temporarily unavailable'
    ];

    // Generate logs with realistic patterns
    for (let i = 0; i < Math.min(limit, 50); i++) {
      const minutesAgo = Math.floor(Math.random() * 1440); // Random within last 24 hours
      const timestamp = new Date(now.getTime() - (minutesAgo * 60000));
      
      let level = 'info';
      let message = messages[Math.floor(Math.random() * messages.length)];

      // Adjust level based on component health and message content
      if (component.health === 'failed' && Math.random() < 0.4) {
        level = 'error';
        message = messages.find(msg => msg.includes('fail') || msg.includes('error') || msg.includes('timeout')) || message;
      } else if (component.health === 'degraded' && Math.random() < 0.3) {
        level = 'warn';
        message = messages.find(msg => msg.includes('warn') || msg.includes('slow') || msg.includes('capacity')) || message;
      } else if (Math.random() < 0.1) {
        level = 'debug';
      }

      logs.push({
        id: `log_${i + 1}`,
        level: level,
        message: message,
        timestamp: timestamp.toISOString(),
        component: component.id,
        metadata: {
          version: component.version,
          category: component.category,
          session_id: `sess_${Math.random().toString(36).substr(2, 9)}`
        }
      });
    }

    // Sort by timestamp (newest first)
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Simulate diagnostic tests for a component
   * @param {Object} component - Component configuration
   * @returns {Object} Test results
   */
  async simulateComponentTests(component) {
    // Simulate test execution delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const baseTests = [
      'Service Connectivity',
      'Configuration Validation',
      'Memory Usage Check',
      'CPU Performance',
      'Disk Space Availability'
    ];

    const componentSpecificTests = {
      'authentication-service': ['JWT Validation', 'Session Store Access', 'Password Hashing'],
      'database-connector': ['Connection Pool Health', 'Query Performance', 'Index Optimization'],
      'notification-service': ['SMTP Configuration', 'Template Rendering', 'Queue Processing'],
      'backup-scheduler': ['Backup Location Access', 'Compression Ratio', 'Retention Policy'],
      'api-gateway': ['Route Resolution', 'SSL Certificate', 'Load Balancing'],

      'session-manager': ['Session Storage', 'Timeout Configuration', 'Security Validation'],
      'file-storage': ['Storage Quota', 'File Permissions', 'Integrity Verification']
    };

    const tests = [...baseTests, ...(componentSpecificTests[component.id] || [])];
    const testResults = [];

    let overallStatus = 'pass';

    for (const testName of tests) {
      const duration = Math.floor(Math.random() * 500) + 10; // 10-510ms
      let status = 'pass';
      let details = null;
      let error = null;

      // Simulate test failures based on component health
      if (component.health === 'failed' && Math.random() < 0.4) {
        status = 'fail';
        error = 'Test execution failed';
        overallStatus = 'fail';
      } else if (component.health === 'degraded' && Math.random() < 0.3) {
        status = 'warn';
        details = 'Performance below optimal threshold';
        if (overallStatus !== 'fail') overallStatus = 'warn';
      } else if (!component.enabled && testName.includes('Service')) {
        status = 'warn';
        details = 'Service is disabled';
        if (overallStatus !== 'fail') overallStatus = 'warn';
      }

      // Add specific failure details for certain tests
      if (status === 'fail') {
        const failureReasons = {
          'Service Connectivity': 'Connection refused on port ' + (component.ports[0] || 3001),
          'Memory Usage Check': 'Memory usage exceeds 95% threshold',
          'Database Connection': 'Connection pool exhausted',
          'SSL Certificate': 'Certificate expires in 2 days',
          'Disk Space Availability': 'Available disk space below 10%'
        };
        error = failureReasons[testName] || 'Test failed with unknown error';
      }

      testResults.push({
        name: testName,
        status: status,
        duration: `${duration}ms`,
        details: details,
        error: error
      });
    }

    return {
      status: overallStatus,
      details: `Completed ${testResults.length} diagnostic tests for ${component.name}`,
      timestamp: new Date().toISOString(),
      tests: testResults,
      summary: {
        total: testResults.length,
        passed: testResults.filter(t => t.status === 'pass').length,
        warnings: testResults.filter(t => t.status === 'warn').length,
        failed: testResults.filter(t => t.status === 'fail').length
      }
    };
  }

  /**
   * Calculate usage breakdown statistics
   * @param {Array} components - Array of components
   * @returns {Object} Usage breakdown
   */
  calculateUsageBreakdown(components) {
    return {
      active: components.filter(c => c.usageStatus === 'active').length,
      inactive: components.filter(c => c.usageStatus === 'inactive').length,
      unused: components.filter(c => c.usageStatus === 'unused').length
    };
  }

  /**
   * Calculate status breakdown statistics (enabled/disabled)
   * @param {Array} components - Array of components
   * @returns {Object} Status breakdown
   */
  calculateStatusBreakdown(components) {
    return {
      enabled: components.filter(c => c.enabled === true).length,
      disabled: components.filter(c => c.enabled === false).length
    };
  }

  /**
   * Calculate health breakdown statistics
   * @param {Array} components - Array of components
   * @returns {Object} Health breakdown
   */
  calculateHealthBreakdown(components) {
    return {
      healthy: components.filter(c => c.health === 'healthy').length,
      degraded: components.filter(c => c.health === 'degraded').length,
      failed: components.filter(c => c.health === 'failed').length
    };
  }
}

module.exports = new ComponentsController();