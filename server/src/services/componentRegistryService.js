const { getAppPool } = require('../config/db-compat');
/**
 * Component Registry Service - Database Implementation
 * Replaces auto-discovered-components.json with database queries
 */

const { promisePool } = require('../config/db-compat');

class ComponentRegistryService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Get all components from the registry
   * @returns {Object} Component discovery results
   */
  async getAllComponents() {
    const cacheKey = 'all_components';
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const [components] = await getAppPool().query(`
        SELECT id, name, file_path, relative_path, directory, extension, category,
               props, imports, exports, is_default, has_jsx, has_hooks,
               dependencies, file_size, lines_of_code, complexity_score,
               last_modified, discovery_version, discovered_at, updated_at
        FROM component_registry 
        WHERE is_active = TRUE
        ORDER BY name
      `);

      // Build the result in the same format as the original JSON
      const result = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        generatedBy: 'OrthodoxMetrics Component Discovery System (Database)',
        description: 'Auto-discovered React components from the OrthodoxMetrics frontend codebase',
        discoveryTime: 0, // From database
        components: components.map(comp => ({
          id: comp.id,
          name: comp.name,
          filePath: comp.file_path,
          relativePath: comp.relative_path,
          directory: comp.directory,
          extension: comp.extension,
          category: comp.category,
          props: JSON.parse(comp.props || '[]'),
          imports: JSON.parse(comp.imports || '[]'),
          exports: JSON.parse(comp.exports || '[]'),
          isDefault: comp.is_default ? [`export default function ${comp.name}`] : [],
          hasJSX: comp.has_jsx,
          hasHooks: comp.has_hooks,
          dependencies: JSON.parse(comp.dependencies || '[]'),
          size: comp.file_size,
          lines: comp.lines_of_code,
          complexity: comp.complexity_score,
          lastModified: comp.last_modified,
          discoveryVersion: comp.discovery_version,
          discoveredAt: comp.discovered_at,
          updatedAt: comp.updated_at
        }))
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Error fetching components from database:', error);
      return this.getFallbackComponents();
    }
  }

  /**
   * Get component by name
   * @param {string} name - Component name
   * @returns {Object|null} Component data or null if not found
   */
  async getComponentByName(name) {
    try {
      const [rows] = await getAppPool().query(`
        SELECT id, name, file_path, relative_path, directory, extension, category,
               props, imports, exports, is_default, has_jsx, has_hooks,
               dependencies, file_size, lines_of_code, complexity_score,
               last_modified, discovery_version, discovered_at, updated_at
        FROM component_registry 
        WHERE name = ? AND is_active = TRUE
      `, [name]);

      if (rows.length === 0) {
        return null;
      }

      const comp = rows[0];
      return {
        id: comp.id,
        name: comp.name,
        filePath: comp.file_path,
        relativePath: comp.relative_path,
        directory: comp.directory,
        extension: comp.extension,
        category: comp.category,
        props: JSON.parse(comp.props || '[]'),
        imports: JSON.parse(comp.imports || '[]'),
        exports: JSON.parse(comp.exports || '[]'),
        isDefault: comp.is_default,
        hasJSX: comp.has_jsx,
        hasHooks: comp.has_hooks,
        dependencies: JSON.parse(comp.dependencies || '[]'),
        size: comp.file_size,
        lines: comp.lines_of_code,
        complexity: comp.complexity_score,
        lastModified: comp.last_modified,
        discoveryVersion: comp.discovery_version,
        discoveredAt: comp.discovered_at,
        updatedAt: comp.updated_at
      };
    } catch (error) {
      console.error(`Error fetching component ${name}:`, error);
      return null;
    }
  }

  /**
   * Search components by various criteria
   * @param {Object} filters - Search filters
   * @returns {Array} Matching components
   */
  async searchComponents(filters = {}) {
    try {
      let query = `
        SELECT id, name, file_path, relative_path, directory, extension, category,
               props, imports, exports, is_default, has_jsx, has_hooks,
               dependencies, file_size, lines_of_code, complexity_score
        FROM component_registry 
        WHERE is_active = TRUE
      `;
      const params = [];

      if (filters.category) {
        query += ` AND category = ?`;
        params.push(filters.category);
      }

      if (filters.hasJSX !== undefined) {
        query += ` AND has_jsx = ?`;
        params.push(filters.hasJSX);
      }

      if (filters.hasHooks !== undefined) {
        query += ` AND has_hooks = ?`;
        params.push(filters.hasHooks);
      }

      if (filters.directory) {
        query += ` AND directory LIKE ?`;
        params.push(`%${filters.directory}%`);
      }

      if (filters.search) {
        query += ` AND (name LIKE ? OR directory LIKE ?)`;
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      query += ` ORDER BY name LIMIT ${filters.limit || 100}`;

      const [rows] = await getAppPool().query(query, params);

      return rows.map(comp => ({
        id: comp.id,
        name: comp.name,
        filePath: comp.file_path,
        relativePath: comp.relative_path,
        directory: comp.directory,
        extension: comp.extension,
        category: comp.category,
        props: JSON.parse(comp.props || '[]'),
        imports: JSON.parse(comp.imports || '[]'),
        exports: JSON.parse(comp.exports || '[]'),
        isDefault: comp.is_default,
        hasJSX: comp.has_jsx,
        hasHooks: comp.has_hooks,
        dependencies: JSON.parse(comp.dependencies || '[]'),
        size: comp.file_size,
        lines: comp.lines_of_code,
        complexity: comp.complexity_score
      }));
    } catch (error) {
      console.error('Error searching components:', error);
      return [];
    }
  }

  /**
   * Get component summary statistics
   * @returns {Object} Summary statistics
   */
  async getComponentSummary() {
    try {
      const [stats] = await getAppPool().query(`
        SELECT 
          COUNT(*) as total_components,
          COUNT(DISTINCT category) as total_categories,
          COUNT(DISTINCT directory) as total_directories,
          AVG(file_size) as avg_file_size,
          AVG(lines_of_code) as avg_lines,
          SUM(CASE WHEN has_jsx THEN 1 ELSE 0 END) as jsx_components,
          SUM(CASE WHEN has_hooks THEN 1 ELSE 0 END) as hook_components,
          MAX(updated_at) as last_updated
        FROM component_registry 
        WHERE is_active = TRUE
      `);

      const [categories] = await getAppPool().query(`
        SELECT category, COUNT(*) as count
        FROM component_registry 
        WHERE is_active = TRUE AND category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
      `);

      return {
        total: stats[0].total_components,
        categories: categories.map(cat => ({
          name: cat.category,
          count: cat.count
        })),
        statistics: {
          totalDirectories: stats[0].total_directories,
          averageFileSize: Math.round(stats[0].avg_file_size || 0),
          averageLines: Math.round(stats[0].avg_lines || 0),
          jsxComponents: stats[0].jsx_components,
          hookComponents: stats[0].hook_components,
          lastUpdated: stats[0].last_updated
        }
      };
    } catch (error) {
      console.error('Error fetching component summary:', error);
      return {
        total: 0,
        categories: [],
        statistics: {}
      };
    }
  }

  /**
   * Update component information
   * @param {string} name - Component name
   * @param {Object} updateData - Data to update
   */
  async updateComponent(name, updateData) {
    try {
      const updateFields = [];
      const params = [];

      if (updateData.category) {
        updateFields.push('category = ?');
        params.push(updateData.category);
      }

      if (updateData.file_size) {
        updateFields.push('file_size = ?');
        params.push(updateData.file_size);
      }

      if (updateData.lines_of_code) {
        updateFields.push('lines_of_code = ?');
        params.push(updateData.lines_of_code);
      }

      if (updateData.complexity_score) {
        updateFields.push('complexity_score = ?');
        params.push(updateData.complexity_score);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(name);

        await getAppPool().query(`
          UPDATE component_registry 
          SET ${updateFields.join(', ')}
          WHERE name = ?
        `, params);

        this.clearCache();
        console.log(`Component ${name} updated successfully`);
      }
    } catch (error) {
      console.error(`Error updating component ${name}:`, error);
      throw error;
    }
  }

  /**
   * Clear component cache
   */
  clearCache() {
    this.cache.clear();
    console.log('Component registry cache cleared');
  }

  /**
   * Fallback components if database is unavailable
   * @private
   */
  getFallbackComponents() {
    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      generatedBy: 'Fallback (database unavailable)',
      description: 'Fallback component data',
      discoveryTime: 0,
      components: []
    };
  }
}

module.exports = ComponentRegistryService;