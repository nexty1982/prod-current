const { getAppPool } = require('../config/db-compat');
/**
 * Database-based Component Usage Tracker
 * Replaces the JSON file approach to prevent race conditions and corruption
 */

const { promisePool } = require('../config/db-compat');
const { formatTimestamp, formatTimestampUser } = require('./formatTimestamp');

class ComponentUsageTrackerDB {
  constructor() {
    this.cacheTimeout = 2 * 60 * 1000; // 2 minutes cache for summary data
    this.summaryCache = new Map();
  }

  /**
   * Log component usage to database
   * @param {string} componentId - Component identifier
   * @param {string} userId - User identifier
   * @param {string} action - Action type (access, toggle, logs, test)
   * @param {Object} metadata - Additional metadata (session, IP, etc.)
   */
  async logComponentUsage(componentId, userId = 'anonymous', action = 'access', metadata = {}) {
    try {
      const timestamp = new Date();
      const displayTimestamp = formatTimestampUser(timestamp);
      
      // Insert usage record
      await getAppPool().query(`
        INSERT INTO component_usage (
          component_id, user_id, action, timestamp, session_id, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        componentId,
        userId,
        action,
        timestamp,
        metadata.sessionId || null,
        metadata.ipAddress || null,
        metadata.userAgent || null
      ]);

      // Update summary tables using ON DUPLICATE KEY UPDATE for atomic operations
      await this.updateSummaryTables(componentId, userId, action, timestamp);
      
      // Clear relevant cache
      this.summaryCache.delete(componentId);
      this.summaryCache.delete(`all_components`);
      
      console.log(`[USAGE-DB] Component ${componentId} accessed by ${userId} (${action}) at ${displayTimestamp}`);
    } catch (error) {
      console.error('Error logging component usage to database:', error);
      // Don't throw - usage tracking shouldn't break the application
    }
  }

  /**
   * Update summary tables atomically
   */
  async updateSummaryTables(componentId, userId, action, timestamp) {
    const connection = await promisePool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Update component_usage_summary
      // MariaDB compatible syntax - replace VALUES() with actual parameters
      await getAppPool().query(`
        INSERT INTO component_usage_summary (
          component_id, first_used, last_used, total_accesses, unique_users
        ) VALUES (?, ?, ?, 1, 1)
        ON DUPLICATE KEY UPDATE
          last_used = ?,
          total_accesses = total_accesses + 1,
          unique_users = (
            SELECT COUNT(DISTINCT user_id) 
            FROM component_usage 
            WHERE component_id = ?
          )
      `, [componentId, timestamp, timestamp, timestamp, componentId]);

      // Update component_action_summary
      await getAppPool().query(`
        INSERT INTO component_action_summary (component_id, action, count)
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE count = count + 1
      `, [componentId, action]);

      // Update user_component_summary
      await getAppPool().query(`
        INSERT INTO user_component_summary (
          user_id, component_id, first_access, last_access, access_count
        ) VALUES (?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          last_access = VALUES(last_access),
          access_count = access_count + 1
      `, [userId, componentId, timestamp, timestamp]);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get usage statistics for all components
   * @returns {Object} Usage statistics by component
   */
  async getUsageStatistics() {
    const cacheKey = 'all_components';
    const cached = this.summaryCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const [summaryRows] = await getAppPool().query(`
        SELECT 
          component_id,
          first_used,
          last_used,
          total_accesses,
          unique_users
        FROM component_usage_summary
      `);

      const [actionRows] = await getAppPool().query(`
        SELECT component_id, action, count
        FROM component_action_summary
      `);

      // Build the statistics object
      const stats = {};
      
      // Process summary data
      summaryRows.forEach(row => {
        stats[row.component_id] = {
          firstUsed: row.first_used ? row.first_used.toISOString() : null,
          lastUsed: row.last_used ? row.last_used.toISOString() : null,
          totalAccesses: row.total_accesses,
          uniqueUsers: row.unique_users,
          actions: {},
          users: {} // Will be populated if needed
        };
      });

      // Process action data
      actionRows.forEach(row => {
        if (stats[row.component_id]) {
          stats[row.component_id].actions[row.action] = row.count;
        }
      });

      // Generate topComponents and recentActivity for compatibility
      const topComponents = await this.getTopComponents(10);
      const recentActivity = await this.getUsageBreakdown(null, 7); // Last 7 days
      
      // Add these properties to the stats object for controller compatibility
      stats.topComponents = topComponents;
      stats.recentActivity = recentActivity;

      // Cache the result
      this.summaryCache.set(cacheKey, {
        data: stats,
        timestamp: Date.now()
      });

      return stats;
    } catch (error) {
      console.error('Error fetching usage statistics from database:', error);
      return {
        topComponents: [],
        recentActivity: []
      };
    }
  }

  /**
   * Get usage data for multiple components in a single query (optimized)
   * @param {Array} componentIds - Array of component identifiers
   * @returns {Object} Map of component usage data by component ID
   */
  async getBatchComponentUsageStatus(componentIds) {
    if (!componentIds || componentIds.length === 0) {
      return {};
    }

    // Check cache for all components first
    const results = {};
    const uncachedIds = [];
    
    componentIds.forEach(componentId => {
      const cached = this.summaryCache.get(componentId);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        results[componentId] = cached.data;
      } else {
        uncachedIds.push(componentId);
      }
    });

    // If all components are cached, return early
    if (uncachedIds.length === 0) {
      return results;
    }

    try {
      // Create parameterized placeholders for the IN clause
      const placeholders = uncachedIds.map(() => '?').join(', ');
      
      console.log(`[USAGE-DB] Fetching usage stats for ${uncachedIds.length} components in single query`);
      
      const [summaryRows] = await getAppPool().query(`
        SELECT component_id, first_used, last_used, total_accesses, unique_users
        FROM component_usage_summary
        WHERE component_id IN (${placeholders})
      `, uncachedIds);

      const now = new Date();
      
      // Create a map of existing data
      const summaryMap = {};
      summaryRows.forEach(row => {
        summaryMap[row.component_id] = row;
      });

      // Process all requested component IDs
      uncachedIds.forEach(componentId => {
        const summary = summaryMap[componentId];
        
        let result;
        if (!summary) {
          // Component has no usage data
          result = {
            status: 'unused',
            lastUsed: null,
            totalAccesses: 0,
            daysSinceLastUse: null,
            uniqueUsers: 0
          };
        } else {
          const lastUsed = summary.last_used ? new Date(summary.last_used) : null;
          const daysSinceLastUse = lastUsed ? Math.floor((now - lastUsed) / (1000 * 60 * 60 * 24)) : null;

          let status = 'unused';
          if (lastUsed) {
            if (daysSinceLastUse <= 1) {
              status = 'active'; // Used within last 24 hours
            } else if (daysSinceLastUse <= 30) {
              status = 'inactive'; // Used within last 30 days
            }
          }

          result = {
            status,
            lastUsed: lastUsed ? lastUsed.toISOString() : null,
            totalAccesses: summary.total_accesses,
            daysSinceLastUse,
            uniqueUsers: summary.unique_users
          };
        }

        // Cache the result
        this.summaryCache.set(componentId, {
          data: result,
          timestamp: Date.now()
        });

        results[componentId] = result;
      });

      return results;
    } catch (error) {
      console.error(`Error fetching batch usage status for components:`, error);
      
      // Return fallback data for all requested components
      const fallbackResults = {};
      uncachedIds.forEach(componentId => {
        fallbackResults[componentId] = {
          status: 'unused',
          lastUsed: null,
          totalAccesses: 0,
          daysSinceLastUse: null,
          uniqueUsers: 0
        };
      });
      
      return { ...results, ...fallbackResults };
    }
  }

  /**
   * Get usage data for a specific component
   * @param {string} componentId - Component identifier
   * @returns {Object} Component usage data
   */
  async getComponentUsageStatus(componentId) {
    // Use the batched method for consistency
    const batchResults = await this.getBatchComponentUsageStatus([componentId]);
    return batchResults[componentId] || {
      status: 'unused',
      lastUsed: null,
      totalAccesses: 0,
      daysSinceLastUse: null,
      uniqueUsers: 0
    };
  }

  /**
   * Get usage breakdown by time period
   * @param {string} componentId - Component identifier (optional)
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Object} Usage breakdown
   */
  async getUsageBreakdown(componentId = null, days = 30) {
    try {
      const whereClause = componentId ? 
        'WHERE component_id = ? AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)' : 
        'WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      const params = componentId ? [componentId, days] : [days];

      const [rows] = await getAppPool().query(`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as accesses,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT component_id) as unique_components
        FROM component_usage
        ${whereClause}
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `, params);

      return rows.map(row => ({
        date: row.date,
        accesses: row.accesses,
        uniqueUsers: row.unique_users,
        uniqueComponents: row.unique_components
      }));
    } catch (error) {
      console.error('Error fetching usage breakdown:', error);
      return [];
    }
  }

  /**
   * Get top used components
   * @param {number} limit - Number of components to return
   * @param {number} days - Time period in days (optional)
   * @returns {Array} Top components by usage
   */
  async getTopComponents(limit = 10, days = null) {
    try {
      let query = `
        SELECT 
          s.component_id,
          s.total_accesses,
          s.unique_users,
          s.last_used
        FROM component_usage_summary s
      `;
      
      const params = [];
      
      if (days) {
        query += ` WHERE s.last_used >= DATE_SUB(NOW(), INTERVAL ? DAY)`;
        params.push(days);
      }
      
      query += ` ORDER BY s.total_accesses DESC LIMIT ?`;
      params.push(limit);

      const [rows] = await getAppPool().query(query, params);

      return rows.map(row => ({
        componentId: row.component_id,
        totalAccesses: row.total_accesses,
        uniqueUsers: row.unique_users,
        lastUsed: row.last_used ? row.last_used.toISOString() : null
      }));
    } catch (error) {
      console.error('Error fetching top components:', error);
      return [];
    }
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache() {
    this.summaryCache.clear();
    console.log('[USAGE-DB] Cache cleared');
  }

  /**
   * Migrate data from JSON file (one-time operation)
   * @param {string} jsonFilePath - Path to the JSON file
   */
  async migrateFromJSON(jsonFilePath) {
    try {
      const fs = require('fs').promises;
      const jsonData = JSON.parse(await fs.readFile(jsonFilePath, 'utf8'));
      
      console.log(`[USAGE-DB] Starting migration from ${jsonFilePath}`);
      let migrated = 0;

      for (const [componentId, componentData] of Object.entries(jsonData)) {
        if (componentData.users) {
          for (const [userId, userData] of Object.entries(componentData.users)) {
            // Create a usage record for each user
            await this.logComponentUsage(
              componentId,
              userId,
              'access', // Default action
              {}
            );
            migrated++;
          }
        }
      }

      console.log(`[USAGE-DB] Migration completed: ${migrated} records migrated`);
      return migrated;
    } catch (error) {
      console.error('[USAGE-DB] Migration failed:', error);
      throw error;
    }
  }
}

module.exports = ComponentUsageTrackerDB;