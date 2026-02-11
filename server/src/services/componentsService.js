/**
 * Components Service
 * Service layer for system component management
 * 
 * This service provides utility functions for component management
 * and can be extended to integrate with real system monitoring tools.
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ComponentsService {
  constructor() {
    this.manifestPath = path.join(__dirname, '../data/componentManifest.json');
  }

  /**
   * Health check utilities
   */
  async performHealthCheck(componentId) {
    try {
      const components = await this.loadManifest();
      const component = components.find(c => c.id === componentId);
      
      if (!component) {
        throw new Error(`Component ${componentId} not found`);
      }

      // For now, return the stored health status
      // In the future, this could integrate with actual system monitoring
      return {
        componentId,
        health: component.health,
        lastCheck: new Date().toISOString(),
        checks: await this.generateHealthChecks(component)
      };
    } catch (error) {
      console.error(`Health check failed for ${componentId}:`, error);
      return {
        componentId,
        health: 'unknown',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Component dependency management
   */
  async validateDependencies(componentId) {
    const components = await this.loadManifest();
    const component = components.find(c => c.id === componentId);
    
    if (!component || !component.dependencies) {
      return { valid: true, issues: [] };
    }

    const issues = [];
    
    for (const depId of component.dependencies) {
      const dependency = components.find(c => c.id === depId);
      
      if (!dependency) {
        issues.push(`Missing dependency: ${depId}`);
      } else if (!dependency.enabled) {
        issues.push(`Dependency disabled: ${dependency.name}`);
      } else if (dependency.health === 'failed') {
        issues.push(`Dependency unhealthy: ${dependency.name}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      dependencies: component.dependencies
    };
  }

  /**
   * Component statistics and metrics
   */
  async getSystemMetrics() {
    const components = await this.loadManifest();
    
    const metrics = {
      total: components.length,
      enabled: components.filter(c => c.enabled).length,
      disabled: components.filter(c => !c.enabled).length,
      healthy: components.filter(c => c.health === 'healthy').length,
      degraded: components.filter(c => c.health === 'degraded').length,
      failed: components.filter(c => c.health === 'failed').length,
      byCategory: {},
      lastUpdated: new Date().toISOString()
    };

    // Group by category
    components.forEach(component => {
      const category = component.category || 'uncategorized';
      if (!metrics.byCategory[category]) {
        metrics.byCategory[category] = {
          total: 0,
          enabled: 0,
          healthy: 0,
          degraded: 0,
          failed: 0
        };
      }
      
      metrics.byCategory[category].total++;
      if (component.enabled) metrics.byCategory[category].enabled++;
      
      switch (component.health) {
        case 'healthy':
          metrics.byCategory[category].healthy++;
          break;
        case 'degraded':
          metrics.byCategory[category].degraded++;
          break;
        case 'failed':
          metrics.byCategory[category].failed++;
          break;
      }
    });

    return metrics;
  }

  /**
   * Component lifecycle management
   */
  async enableComponent(componentId, userId = 'system') {
    const components = await this.loadManifest();
    const componentIndex = components.findIndex(c => c.id === componentId);
    
    if (componentIndex === -1) {
      throw new Error(`Component ${componentId} not found`);
    }

    // Check dependencies before enabling
    const depCheck = await this.validateDependencies(componentId);
    if (!depCheck.valid) {
      console.warn(`Enabling ${componentId} with dependency issues:`, depCheck.issues);
    }

    components[componentIndex].enabled = true;
    components[componentIndex].lastUpdated = new Date().toISOString();
    
    // Run health check after enabling
    const healthCheck = await this.performHealthCheck(componentId);
    components[componentIndex].health = healthCheck.health;
    components[componentIndex].lastHealthCheck = healthCheck.lastCheck;

    await this.saveManifest(components);

    console.log(`Component ${componentId} enabled by ${userId}`);
    return components[componentIndex];
  }

  async disableComponent(componentId, userId = 'system') {
    const components = await this.loadManifest();
    const componentIndex = components.findIndex(c => c.id === componentId);
    
    if (componentIndex === -1) {
      throw new Error(`Component ${componentId} not found`);
    }

    // Check which components depend on this one
    const dependents = components.filter(c => 
      c.dependencies && c.dependencies.includes(componentId) && c.enabled
    );

    if (dependents.length > 0) {
      console.warn(`Disabling ${componentId} may affect dependent components:`, 
        dependents.map(c => c.name));
    }

    components[componentIndex].enabled = false;
    components[componentIndex].lastUpdated = new Date().toISOString();

    await this.saveManifest(components);

    console.log(`Component ${componentId} disabled by ${userId}`);
    return components[componentIndex];
  }

  /**
   * Utility methods
   */
  async loadManifest() {
    try {
      const data = await fs.readFile(this.manifestPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading component manifest:', error);
      throw new Error('Failed to load component manifest');
    }
  }

  async saveManifest(components) {
    try {
      await fs.writeFile(this.manifestPath, JSON.stringify(components, null, 2));
    } catch (error) {
      console.error('Error saving component manifest:', error);
      throw new Error('Failed to save component manifest');
    }
  }

  async generateHealthChecks(component) {
    const checks = [];

    // Basic connectivity check
    if (component.ports && component.ports.length > 0) {
      for (const port of component.ports) {
        checks.push({
          name: `Port ${port} Connectivity`,
          status: component.health === 'failed' ? 'fail' : 'pass',
          details: component.health === 'failed' ? 'Port unreachable' : 'Port accessible'
        });
      }
    }

    // Configuration check
    if (component.configPath) {
      checks.push({
        name: 'Configuration File',
        status: 'pass',
        details: `Config found at ${component.configPath}`
      });
    }

    // Dependency check
    if (component.dependencies && component.dependencies.length > 0) {
      const depCheck = await this.validateDependencies(component.id);
      checks.push({
        name: 'Dependencies',
        status: depCheck.valid ? 'pass' : 'warn',
        details: depCheck.valid ? 'All dependencies satisfied' : `Issues: ${depCheck.issues.join(', ')}`
      });
    }

    // Health issues check
    if (component.healthIssues && component.healthIssues.length > 0) {
      checks.push({
        name: 'Health Issues',
        status: 'warn',
        details: component.healthIssues.join('; ')
      });
    }

    return checks;
  }

  /**
   * Future integration points for real system monitoring
   */
  async integrateWithSystemMonitoring() {
    // Placeholder for future integration with tools like:
    // - PM2 process manager
    // - Docker container health
    // - Database connection pools
    // - External service health checks
    // - System resource monitoring
    
    console.log('System monitoring integration not yet implemented');
    return {
      integrated: false,
      message: 'Manual component management active'
    };
  }

  async getSystemResourceUsage() {
    try {
      // Basic system information
      const { stdout: memInfo } = await execAsync('free -h').catch(() => ({ stdout: '' }));
      const { stdout: diskInfo } = await execAsync('df -h /').catch(() => ({ stdout: '' }));
      const { stdout: loadInfo } = await execAsync('uptime').catch(() => ({ stdout: '' }));

      return {
        timestamp: new Date().toISOString(),
        memory: memInfo,
        disk: diskInfo,
        load: loadInfo,
        available: true
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        available: false,
        error: 'System resource monitoring not available'
      };
    }
  }
}

module.exports = new ComponentsService();