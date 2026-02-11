/**
 * Component Usage Tracker
 * Tracks when components are accessed and provides usage analytics
 */

const fs = require('fs').promises;
const path = require('path');
const { formatTimestamp, formatTimestampUser } = require('./formatTimestamp');

class ComponentUsageTracker {
  constructor() {
    this.usageFilePath = path.join(__dirname, '../data/componentUsage.json');
    this.usageCache = null;
    this.cacheExpiry = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Log component usage with current timestamp
   * @param {string} componentId - The component identifier
   * @param {string} userId - User who accessed the component (optional)
   * @param {string} action - Action performed (view, toggle, test, logs)
   */
  async logComponentUsage(componentId, userId = 'anonymous', action = 'access') {
    try {
      const usage = await this.loadUsageData();
      const timestamp = new Date().toISOString(); // Keep ISO for storage
      const displayTimestamp = formatTimestampUser(timestamp);

      // Initialize component usage if it doesn't exist
      if (!usage[componentId]) {
        usage[componentId] = {
          firstUsed: timestamp,
          lastUsed: timestamp,
          totalAccesses: 0,
          actions: {},
          users: {}
        };
      }

      // Update usage data
      usage[componentId].lastUsed = timestamp;
      usage[componentId].totalAccesses += 1;
      
      // Track action types
      if (!usage[componentId].actions[action]) {
        usage[componentId].actions[action] = 0;
      }
      usage[componentId].actions[action] += 1;

      // Track user access
      if (!usage[componentId].users[userId]) {
        usage[componentId].users[userId] = {
          firstAccess: timestamp,
          lastAccess: timestamp,
          accessCount: 0
        };
      }
      usage[componentId].users[userId].lastAccess = timestamp;
      usage[componentId].users[userId].accessCount += 1;

      await this.saveUsageData(usage);
      
      // Clear cache to ensure fresh data
      this.usageCache = null;
      
      console.log(`[USAGE] Component ${componentId} accessed by ${userId} (${action})`);
    } catch (error) {
      console.error('Error logging component usage:', error);
      // Don't throw - usage tracking shouldn't break the application
    }
  }

  /**
   * Get usage data for all components
   * @returns {Object} Usage data object
   */
  async getUsageData() {
    return await this.loadUsageData();
  }

  /**
   * Get usage status for a component
   * @param {string} componentId - Component identifier
   * @returns {Object} Usage status information
   */
  async getComponentUsageStatus(componentId) {
    const usage = await this.loadUsageData();
    const componentUsage = usage[componentId];

    if (!componentUsage) {
      return {
        status: 'unused',
        lastUsed: null,
        totalAccesses: 0,
        daysSinceLastUse: null
      };
    }

    const now = new Date();
    const lastUsed = new Date(componentUsage.lastUsed);
    const daysSinceLastUse = Math.floor((now - lastUsed) / (1000 * 60 * 60 * 24));

    let status = 'unused';
    if (daysSinceLastUse === 0) {
      status = 'active'; // Used today
    } else if (daysSinceLastUse <= 1) {
      status = 'active'; // Used within last 24 hours
    } else if (daysSinceLastUse <= 30) {
      status = 'inactive'; // Used within last 30 days
    }

    return {
      status,
      lastUsed: componentUsage.lastUsed,
      totalAccesses: componentUsage.totalAccesses,
      daysSinceLastUse,
      actions: componentUsage.actions,
      uniqueUsers: Object.keys(componentUsage.users).length
    };
  }

  /**
   * Get usage statistics for all components
   * @returns {Object} Aggregated usage statistics
   */
  async getUsageStatistics() {
    const usage = await this.loadUsageData();
    const stats = {
      total: 0,
      active: 0,
      inactive: 0,
      unused: 0,
      totalAccesses: 0,
      componentBreakdown: {},
      topComponents: [],
      recentActivity: []
    };

    const componentStats = [];

    for (const [componentId, data] of Object.entries(usage)) {
      stats.total += 1;
      stats.totalAccesses += data.totalAccesses;

      const componentStatus = await this.getComponentUsageStatus(componentId);
      stats[componentStatus.status] += 1;

      componentStats.push({
        id: componentId,
        ...componentStatus
      });
    }

    // Sort by total accesses for top components
    stats.topComponents = componentStats
      .sort((a, b) => b.totalAccesses - a.totalAccesses)
      .slice(0, 10)
      .map(comp => ({
        id: comp.id,
        totalAccesses: comp.totalAccesses,
        status: comp.status,
        lastUsed: comp.lastUsed
      }));

    // Recent activity (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    stats.recentActivity = componentStats
      .filter(comp => comp.lastUsed && new Date(comp.lastUsed) > oneDayAgo)
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, 20)
      .map(comp => ({
        id: comp.id,
        lastUsed: comp.lastUsed,
        totalAccesses: comp.totalAccesses
      }));

    return stats;
  }

  /**
   * Clean old usage data (older than specified days)
   * @param {number} daysToKeep - Number of days of usage data to retain
   */
  async cleanOldUsageData(daysToKeep = 365) {
    try {
      const usage = await this.loadUsageData();
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const [componentId, data] of Object.entries(usage)) {
        const lastUsed = new Date(data.lastUsed);
        if (lastUsed < cutoffDate) {
          delete usage[componentId];
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        await this.saveUsageData(usage);
        console.log(`[USAGE] Cleaned ${cleanedCount} old component usage records`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning old usage data:', error);
      return 0;
    }
  }

  /**
   * Load usage data from file with caching
   * @returns {Object} Usage data
   */
  async loadUsageData() {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.usageCache && this.cacheExpiry && now < this.cacheExpiry) {
      return this.usageCache;
    }

    try {
      const data = await fs.readFile(this.usageFilePath, 'utf8');
      
      // Validate JSON before parsing
      if (!data.trim()) {
        throw new Error('Empty file');
      }
      
      // Additional validation for common corruption patterns
      const trimmedData = data.trim();
      if (!trimmedData.startsWith('{') || !trimmedData.endsWith('}')) {
        throw new Error('File does not appear to be valid JSON (missing braces)');
      }
      
      // Count braces to detect obvious corruption
      const openBraces = (trimmedData.match(/\{/g) || []).length;
      const closeBraces = (trimmedData.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        throw new Error(`Mismatched braces: ${openBraces} open, ${closeBraces} close`);
      }
      
      this.usageCache = JSON.parse(data);
      this.cacheExpiry = now + this.cacheTimeout;
      return this.usageCache;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create empty usage data
        console.log('[USAGE] Creating new usage data file');
        const emptyData = {};
        await this.saveUsageData(emptyData);
        this.usageCache = emptyData;
        this.cacheExpiry = now + this.cacheTimeout;
        return emptyData;
      }
      
      // Handle corrupted file
      console.error(`[USAGE] File corruption detected: ${error.message}`);
      console.error('[USAGE] Backing up corrupted file and creating new one');
      
      try {
        // Backup corrupted file
        const backupPath = this.usageFilePath + '.corrupted.' + Date.now();
        await fs.copyFile(this.usageFilePath, backupPath);
        console.log(`[USAGE] Corrupted file backed up to: ${backupPath}`);
        
        // Create fresh empty data
        const emptyData = {};
        await this.saveUsageData(emptyData);
        this.usageCache = emptyData;
        this.cacheExpiry = now + this.cacheTimeout;
        return emptyData;
      } catch (recoveryError) {
        console.error('[USAGE] Failed to recover from corruption:', recoveryError);
        throw new Error(`Usage data corrupted and recovery failed: ${recoveryError.message}`);
      }
    }
  }

  /**
   * Save usage data to file with atomic write and validation
   * @param {Object} usage - Usage data to save
   */
  async saveUsageData(usage) {
    // Wait for any ongoing write to complete
    while (this.isWriting) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.isWriting = true;
    
    try {
      // Validate the data before writing
      if (!usage || typeof usage !== 'object') {
        throw new Error('Invalid usage data: must be an object');
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(this.usageFilePath), { recursive: true });
      
      // Create JSON string and validate it
      const jsonString = JSON.stringify(usage, null, 2);
      
      // Validate that our JSON is parseable
      try {
        JSON.parse(jsonString);
      } catch (parseError) {
        throw new Error(`Generated invalid JSON: ${parseError.message}`);
      }
      
      // Atomic write: write to temp file first, then rename
      const tempFilePath = this.usageFilePath + '.tmp';
      
      await fs.writeFile(tempFilePath, jsonString + '\n', 'utf8');
      
      // Verify the temp file is valid JSON
      try {
        const verifyData = await fs.readFile(tempFilePath, 'utf8');
        JSON.parse(verifyData);
      } catch (verifyError) {
        // Clean up temp file if verification fails
        try {
          await fs.unlink(tempFilePath);
        } catch (unlinkError) {
          console.error('Failed to clean up temp file:', unlinkError);
        }
        throw new Error(`Written file failed validation: ${verifyError.message}`);
      }
      
      // Atomic rename - this is the critical moment
      await fs.rename(tempFilePath, this.usageFilePath);
      
      // Update cache with the new data
      this.usageCache = usage;
      this.cacheExpiry = Date.now() + this.cacheTimeout;
      
      console.log(`[USAGE] Successfully saved usage data (${Object.keys(usage).length} components)`);
      
    } catch (error) {
      console.error('Error saving usage data:', error);
      throw error;
    } finally {
      this.isWriting = false;
    }
  }

  /**
   * Get formatted time since last use
   * @param {string} lastUsed - ISO timestamp string
   * @returns {string} Human-readable time difference
   */
  static formatTimeSinceLastUse(lastUsed) {
    if (!lastUsed) return 'Never used';

    const now = new Date();
    const used = new Date(lastUsed);
    const diffMs = now - used;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  }
}

// Export singleton instance
module.exports = new ComponentUsageTracker(); 