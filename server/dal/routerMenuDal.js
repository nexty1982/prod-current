/**
 * Data Access Layer for Router Menu Studio
 * Handles all database operations for routes, menus, menu items, and versions
 */

const { getAppPool } = require('../config/db');
const debug = require('debug')('app:dal:router-menu');

class RouterMenuDal {
  constructor() {
    this.pool = getAppPool();
  }

  // ===== ROUTES OPERATIONS =====
  
  /**
   * Get all routes with optional filtering
   * @param {object} filters - { role?, q? }
   * @returns {Promise<Array>}
   */
  async listRoutes(filters = {}) {
    let sql = `
      SELECT id, path, component_path, title, required_role, is_protected, meta, 
             created_at, updated_at 
      FROM routes 
      WHERE 1=1
    `;
    const params = [];

    if (filters.role) {
      sql += ` AND (required_role = ? OR required_role = 'anonymous')`;
      params.push(filters.role);
    }

    if (filters.q) {
      sql += ` AND (path LIKE ? OR title LIKE ? OR component_path LIKE ?)`;
      const searchTerm = `%${filters.q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ` ORDER BY path ASC`;

    const [rows] = await this.pool.execute(sql, params);
    return rows;
  }

  /**
   * Create a new route
   * @param {object} routeData - Route data object
   * @returns {Promise<number>} - New route ID
   */
  async createRoute(routeData) {
    const sql = `
      INSERT INTO routes (path, component_path, title, required_role, is_protected, meta) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      routeData.path,
      routeData.component_path,
      routeData.title || null,
      routeData.required_role || 'default',
      routeData.is_protected !== undefined ? routeData.is_protected : true,
      routeData.meta ? JSON.stringify(routeData.meta) : null
    ];

    const [result] = await this.pool.execute(sql, params);
    return result.insertId;
  }

  /**
   * Update an existing route
   * @param {number} id - Route ID
   * @param {object} updateData - Fields to update
   * @returns {Promise<boolean>}
   */
  async updateRoute(id, updateData) {
    const fields = [];
    const params = [];

    if (updateData.path !== undefined) {
      fields.push('path = ?');
      params.push(updateData.path);
    }
    if (updateData.component_path !== undefined) {
      fields.push('component_path = ?');
      params.push(updateData.component_path);
    }
    if (updateData.title !== undefined) {
      fields.push('title = ?');
      params.push(updateData.title);
    }
    if (updateData.required_role !== undefined) {
      fields.push('required_role = ?');
      params.push(updateData.required_role);
    }
    if (updateData.is_protected !== undefined) {
      fields.push('is_protected = ?');
      params.push(updateData.is_protected);
    }
    if (updateData.meta !== undefined) {
      fields.push('meta = ?');
      params.push(updateData.meta ? JSON.stringify(updateData.meta) : null);
    }

    if (fields.length === 0) {
      return false;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const sql = `UPDATE routes SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await this.pool.execute(sql, params);
    return result.affectedRows > 0;
  }

  /**
   * Delete a route
   * @param {number} id - Route ID
   * @returns {Promise<boolean>}
   */
  async deleteRoute(id) {
    const sql = 'DELETE FROM routes WHERE id = ?';
    const [result] = await this.pool.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  // ===== MENUS OPERATIONS =====

  /**
   * Get menus by role
   * @param {string} role - 'super_admin' or 'default'
   * @returns {Promise<Array>}
   */
  async getMenus(role = null) {
    let sql = `
      SELECT id, name, role, is_active, version, created_by, created_at, updated_at 
      FROM menus 
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    sql += ' ORDER BY role DESC, name ASC';

    const [rows] = await this.pool.execute(sql, params);
    return rows;
  }

  /**
   * Create a new menu
   * @param {object} menuData - Menu data object
   * @returns {Promise<number>} - New menu ID
   */
  async createMenu(menuData) {
    const sql = `
      INSERT INTO menus (name, role, is_active, version, created_by) 
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      menuData.name,
      menuData.role || 'default',
      menuData.is_active !== undefined ? menuData.is_active : true,
      menuData.version || 1,
      menuData.created_by || null
    ];

    const [result] = await this.pool.execute(sql, params);
    return result.insertId;
  }

  /**
   * Update a menu
   * @param {number} id - Menu ID
   * @param {object} updateData - Fields to update
   * @returns {Promise<boolean>}
   */
  async updateMenu(id, updateData) {
    const fields = [];
    const params = [];

    if (updateData.name !== undefined) {
      fields.push('name = ?');
      params.push(updateData.name);
    }
    if (updateData.is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(updateData.is_active);
    }
    if (updateData.version !== undefined) {
      fields.push('version = ?');
      params.push(updateData.version);
    }

    if (fields.length === 0) {
      return false;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const sql = `UPDATE menus SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await this.pool.execute(sql, params);
    return result.affectedRows > 0;
  }

  // ===== MENU ITEMS OPERATIONS =====

  /**
   * Get menu items for a menu (as tree structure)
   * @param {number} menuId - Menu ID
   * @returns {Promise<Array>}
   */
  async getMenuItems(menuId) {
    const sql = `
      SELECT id, menu_id, label, path, icon, parent_id, sort_order, 
             is_devel_tool, visible_roles, created_at, updated_at 
      FROM router_menu_items 
      WHERE menu_id = ? 
      ORDER BY parent_id ASC, sort_order ASC, label ASC
    `;

    const [rows] = await this.pool.execute(sql, [menuId]);
    
    // Parse JSON fields
    const items = rows.map(item => ({
      ...item,
      visible_roles: item.visible_roles ? JSON.parse(item.visible_roles) : null
    }));

    // Build tree structure
    return this._buildMenuTree(items);
  }

  /**
   * Bulk upsert menu items (replaces all items for a menu)
   * @param {number} menuId - Menu ID
   * @param {Array} items - Array of menu items
   * @param {string} userId - User making the change
   * @returns {Promise<boolean>}
   */
  async upsertMenuItems(menuId, items, userId = null) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get current items for versioning
      const [currentItems] = await connection.execute(
        'SELECT * FROM router_menu_items WHERE menu_id = ? ORDER BY id',
        [menuId]
      );

      // Delete existing items
      await connection.execute('DELETE FROM router_menu_items WHERE menu_id = ?', [menuId]);

      // Insert new items
      if (items && items.length > 0) {
        const flatItems = this._flattenMenuTree(items);
        
        for (const item of flatItems) {
          await connection.execute(`
            INSERT INTO router_menu_items 
            (menu_id, label, path, icon, parent_id, sort_order, is_devel_tool, visible_roles) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            menuId,
            item.label,
            item.path || null,
            item.icon || null,
            item.parent_id || null,
            item.sort_order || 0,
            item.is_devel_tool || false,
            item.visible_roles ? JSON.stringify(item.visible_roles) : null
          ]);
        }
      }

      // Create version record
      await this._createVersion(connection, 'menu', menuId, 'update', currentItems, items, userId);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Publish menu (create snapshot)
   * @param {number} menuId - Menu ID
   * @param {string} userId - User making the change
   * @returns {Promise<boolean>}
   */
  async publishMenu(menuId, userId = null) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get current menu and items
      const [menu] = await connection.execute('SELECT * FROM menus WHERE id = ?', [menuId]);
      const [items] = await connection.execute('SELECT * FROM router_menu_items WHERE menu_id = ?', [menuId]);

      // Increment version
      await connection.execute('UPDATE menus SET version = version + 1 WHERE id = ?', [menuId]);

      // Create version record
      await this._createVersion(connection, 'menu', menuId, 'publish', null, { menu: menu[0], items }, userId);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ===== VERSIONS OPERATIONS =====

  /**
   * Get version history
   * @param {string} scope - 'routes' or 'menu'
   * @param {number} scopeId - ID for menu scope (null for routes)
   * @returns {Promise<Array>}
   */
  async getVersions(scope, scopeId = null) {
    let sql = `
      SELECT id, scope, scope_id, change_type, before_json, after_json, 
             changed_by, created_at 
      FROM router_menu_versions 
      WHERE scope = ?
    `;
    const params = [scope];

    if (scopeId !== null) {
      sql += ' AND scope_id = ?';
      params.push(scopeId);
    }

    sql += ' ORDER BY created_at DESC LIMIT 50';

    const [rows] = await this.pool.execute(sql, params);
    return rows;
  }

  // ===== TEMPLATES OPERATIONS =====

  /**
   * Save a template
   * @param {string} name - Template name
   * @param {object} payload - Template data
   * @param {string} templateType - 'menu', 'routes', or 'combined'
   * @param {string} userId - User creating template
   * @returns {Promise<number>}
   */
  async saveTemplate(name, payload, templateType = 'menu', userId = null) {
    const sql = `
      INSERT INTO router_menu_templates (name, template_type, payload, created_by) 
      VALUES (?, ?, ?, ?)
    `;
    const params = [name, templateType, JSON.stringify(payload), userId];

    const [result] = await this.pool.execute(sql, params);
    return result.insertId;
  }

  /**
   * Get all templates
   * @param {string} templateType - Optional filter by type
   * @returns {Promise<Array>}
   */
  async getTemplates(templateType = null) {
    let sql = `
      SELECT id, name, description, template_type, payload, created_by, created_at, updated_at 
      FROM router_menu_templates 
      WHERE 1=1
    `;
    const params = [];

    if (templateType) {
      sql += ' AND template_type = ?';
      params.push(templateType);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await this.pool.execute(sql, params);
    return rows.map(row => ({
      ...row,
      payload: JSON.parse(row.payload)
    }));
  }

  /**
   * Apply a template to a role's menu
   * @param {number} templateId - Template ID
   * @param {string} role - Target role
   * @param {string} userId - User applying template
   * @returns {Promise<boolean>}
   */
  async applyTemplate(templateId, role, userId = null) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get template
      const [templates] = await connection.execute(
        'SELECT * FROM router_menu_templates WHERE id = ?',
        [templateId]
      );

      if (templates.length === 0) {
        throw new Error('Template not found');
      }

      const template = templates[0];
      const payload = JSON.parse(template.payload);

      // Get or create menu for role
      let [menus] = await connection.execute(
        'SELECT id FROM menus WHERE role = ? LIMIT 1',
        [role]
      );

      let menuId;
      if (menus.length === 0) {
        // Create new menu
        const [result] = await connection.execute(
          'INSERT INTO menus (name, role, created_by) VALUES (?, ?, ?)',
          [`${role} Menu`, role, userId]
        );
        menuId = result.insertId;
      } else {
        menuId = menus[0].id;
      }

      // Apply template items
      if (template.template_type === 'menu' && payload.items) {
        await connection.execute('DELETE FROM router_menu_items WHERE menu_id = ?', [menuId]);
        
        const flatItems = this._flattenMenuTree(payload.items);
        for (const item of flatItems) {
          await connection.execute(`
            INSERT INTO router_menu_items 
            (menu_id, label, path, icon, parent_id, sort_order, is_devel_tool, visible_roles) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            menuId,
            item.label,
            item.path || null,
            item.icon || null,
            item.parent_id || null,
            item.sort_order || 0,
            item.is_devel_tool || false,
            item.visible_roles ? JSON.stringify(item.visible_roles) : null
          ]);
        }
      }

      // Create version record
      await this._createVersion(connection, 'menu', menuId, 'template', null, payload, userId);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Build tree structure from flat menu items
   * @private
   */
  _buildMenuTree(items) {
    const itemMap = {};
    const rootItems = [];

    // Create map and identify root items
    items.forEach(item => {
      itemMap[item.id] = { ...item, children: [] };
      if (!item.parent_id) {
        rootItems.push(itemMap[item.id]);
      }
    });

    // Build parent-child relationships
    items.forEach(item => {
      if (item.parent_id && itemMap[item.parent_id]) {
        itemMap[item.parent_id].children.push(itemMap[item.id]);
      }
    });

    return rootItems;
  }

  /**
   * Flatten tree structure to array with parent_id references
   * @private
   */
  _flattenMenuTree(items, parentId = null) {
    const result = [];

    items.forEach((item, index) => {
      const flatItem = {
        ...item,
        parent_id: parentId,
        sort_order: item.sort_order || (index + 1) * 10
      };

      // Remove children from the flat item
      delete flatItem.children;
      result.push(flatItem);

      // Recursively flatten children
      if (item.children && item.children.length > 0) {
        result.push(...this._flattenMenuTree(item.children, item.id));
      }
    });

    return result;
  }

  /**
   * Create a version record
   * @private
   */
  async _createVersion(connection, scope, scopeId, changeType, beforeData, afterData, userId) {
    await connection.execute(`
      INSERT INTO router_menu_versions (scope, scope_id, change_type, before_json, after_json, changed_by) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      scope,
      scopeId,
      changeType,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
      userId
    ]);
  }
}

module.exports = RouterMenuDal;