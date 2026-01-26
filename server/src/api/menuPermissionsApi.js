const { getAppPool } = require('../../config/db-compat');
// Menu Permissions API - Enhanced for Super Admin Configuration
const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db-compat');
const { requireAuth, requireRole } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');

// Middleware to ensure only super admins can manage menu permissions
const requireSuperAdmin = requireRole(['super_admin']);

// GET /api/menu-permissions/items - Get all menu items
router.get('/items', requireAuth, async (req, res) => {
  try {
    console.log('📋 Fetching all menu items for configuration');
    console.log('User role:', req.user?.role);
    
    // Check if user is super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json(
        ApiResponse.error('Only super administrators can access menu configuration', 'FORBIDDEN', 403)
      );
    }
    
    const [menuItems] = await getAppPool().query(`
      SELECT 
        id,
        menu_key,
        title,
        path,
        icon,
        parent_id,
        display_order,
        is_system_required,
        description,
        created_at,
        updated_at
      FROM menu_items
      ORDER BY parent_id, display_order, title
    `);
    
    console.log(`✅ Found ${menuItems.length} menu items`);
    
    res.json(ApiResponse.success(menuItems, 'Menu items retrieved successfully'));
  } catch (error) {
    console.error('❌ Error fetching menu items:', error);
    res.status(500).json(
      ApiResponse.error('Failed to fetch menu items', 'DATABASE_ERROR', 500, error)
    );
  }
});

// GET /api/menu-permissions/permissions - Get all role permissions
router.get('/permissions', requireAuth, async (req, res) => {
  try {
    console.log('📋 Fetching all role permissions');
    
    // Check if user is super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json(
        ApiResponse.error('Only super administrators can access menu configuration', 'FORBIDDEN', 403)
      );
    }
    
    const [permissions] = await getAppPool().query(`
      SELECT 
        rmp.id,
        rmp.role,
        rmp.menu_item_id,
        rmp.is_visible,
        mi.menu_key,
        mi.title
      FROM role_menu_permissions rmp
      JOIN menu_items mi ON rmp.menu_item_id = mi.id
      ORDER BY rmp.role, mi.display_order
    `);
    
    console.log(`✅ Found ${permissions.length} permission entries`);
    
    res.json(ApiResponse.success(permissions, 'Permissions retrieved successfully'));
  } catch (error) {
    console.error('❌ Error fetching permissions:', error);
    res.status(500).json(
      ApiResponse.error('Failed to fetch permissions', 'DATABASE_ERROR', 500, error)
    );
  }
});

// GET /api/menu-permissions/role/:role - Get permissions for specific role
router.get('/role/:role', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    console.log(`📋 Fetching permissions for role: ${role}`);
    
    const [permissions] = await getAppPool().query(`
      SELECT 
        mi.id,
        mi.menu_key,
        mi.title,
        mi.path,
        mi.icon,
        mi.parent_id,
        mi.display_order,
        mi.is_system_required,
        mi.description,
        COALESCE(rmp.is_visible, FALSE) as is_visible
      FROM menu_items mi
      LEFT JOIN role_menu_permissions rmp 
        ON mi.id = rmp.menu_item_id 
        AND rmp.role = ?
      ORDER BY mi.parent_id, mi.display_order
    `, [role]);
    
    console.log(`✅ Found ${permissions.length} menu items for role ${role}`);
    
    res.json(ApiResponse.success(permissions, `Permissions for role ${role} retrieved`));
  } catch (error) {
    console.error(`❌ Error fetching permissions for role ${role}:`, error);
    res.status(500).json(
      ApiResponse.error('Failed to fetch role permissions', 'DATABASE_ERROR', 500, error)
    );
  }
});

// POST /api/menu-permissions/bulk-update - Bulk update permissions
router.post('/bulk-update', requireAuth, async (req, res) => {
  // Check if user is super admin
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json(
      ApiResponse.error('Only super administrators can update menu permissions', 'FORBIDDEN', 403)
    );
  }
  
  const connection = await promisePool.getConnection();
  
  try {
    const { permissions } = req.body;
    
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json(
        ApiResponse.error('Invalid permissions data', 'VALIDATION_ERROR', 400)
      );
    }
    
    console.log(`📝 Bulk updating ${permissions.length} permission entries`);
    console.log('User performing update:', req.user?.email, 'Role:', req.user?.role);
    
    await connection.beginTransaction();
    
    // Clear existing permissions
    await getAppPool().query('DELETE FROM role_menu_permissions');
    
    // Insert new permissions
    if (permissions.length > 0) {
      // Use individual inserts for better compatibility
      for (const p of permissions) {
        await getAppPool().query(
          `INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) 
           VALUES (?, ?, ?)`,
          [p.role, p.menu_item_id, p.is_visible || false]
        );
      }
    }
    
    await connection.commit();
    
    // Log the update (wrap in try-catch to avoid breaking the main operation)
    try {
      await getAppPool().query(
        `INSERT INTO activity_logs 
         (church_id, user_id, user_name, user_role, action, description, ip_address) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.church_id || 0,
          req.user.id,
          req.user.name || req.user.email,
          req.user.role,
          'UPDATE_MENU_PERMISSIONS',
          `Updated menu permissions for all roles`,
          req.ip
        ]
      );
    } catch (logError) {
      console.error('Warning: Could not log activity:', logError);
      // Continue - don't fail the whole operation just because logging failed
    }
    
    console.log('✅ Menu permissions updated successfully');
    
    res.json(ApiResponse.success(null, 'Menu permissions updated successfully'));
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error updating menu permissions:', error);
    res.status(500).json(
      ApiResponse.error('Failed to update menu permissions', 'DATABASE_ERROR', 500, error)
    );
  } finally {
    connection.release();
  }
});

// PUT /api/menu-permissions/item/:menuItemId - Update permissions for specific menu item
router.put('/item/:menuItemId', requireAuth, requireSuperAdmin, async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    const { menuItemId } = req.params;
    const { permissions } = req.body;
    
    console.log(`📝 Updating permissions for menu item ${menuItemId}`);
    
    await connection.beginTransaction();
    
    // Delete existing permissions for this menu item
    await getAppPool().query(
      'DELETE FROM role_menu_permissions WHERE menu_item_id = ?',
      [menuItemId]
    );
    
    // Insert new permissions
    const roles = Object.keys(permissions);
    if (roles.length > 0) {
      const values = roles
        .filter(role => permissions[role] === true)
        .map(role => [role, menuItemId, true]);
      
      if (values.length > 0) {
        await getAppPool().query(
          `INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) 
           VALUES ?`,
          [values]
        );
      }
    }
    
    await connection.commit();
    
    console.log('✅ Menu item permissions updated successfully');
    
    res.json(ApiResponse.success(null, 'Menu item permissions updated'));
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error updating menu item permissions:', error);
    res.status(500).json(
      ApiResponse.error('Failed to update menu item permissions', 'DATABASE_ERROR', 500, error)
    );
  } finally {
    connection.release();
  }
});

// PUT /api/menu-permissions/role/:role - Update permissions for specific role
router.put('/role/:role', requireAuth, requireSuperAdmin, async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    const { role } = req.params;
    const { permissions } = req.body;
    
    console.log(`📝 Updating permissions for role ${role}`);
    
    await connection.beginTransaction();
    
    // Delete existing permissions for this role
    await getAppPool().query(
      'DELETE FROM role_menu_permissions WHERE role = ?',
      [role]
    );
    
    // Insert new permissions
    const menuItemIds = Object.keys(permissions);
    if (menuItemIds.length > 0) {
      const values = menuItemIds
        .filter(id => permissions[id] === true)
        .map(id => [role, id, true]);
      
      if (values.length > 0) {
        await getAppPool().query(
          `INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) 
           VALUES ?`,
          [values]
        );
      }
    }
    
    await connection.commit();
    
    console.log('✅ Role permissions updated successfully');
    
    res.json(ApiResponse.success(null, 'Role permissions updated'));
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error updating role permissions:', error);
    res.status(500).json(
      ApiResponse.error('Failed to update role permissions', 'DATABASE_ERROR', 500, error)
    );
  } finally {
    connection.release();
  }
});

// POST /api/menu-permissions/item - Create new menu item
router.post('/item', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { 
      menu_key, 
      title, 
      path, 
      icon, 
      parent_id, 
      display_order, 
      is_system_required, 
      description 
    } = req.body;
    
    // Validate required fields
    if (!menu_key || !title) {
      return res.status(400).json(
        ApiResponse.error('Menu key and title are required', 'VALIDATION_ERROR', 400)
      );
    }
    
    console.log(`📝 Creating new menu item: ${title}`);
    
    // Check if menu_key already exists
    const [existing] = await getAppPool().query(
      'SELECT id FROM menu_items WHERE menu_key = ?',
      [menu_key]
    );
    
    if (existing.length > 0) {
      return res.status(409).json(
        ApiResponse.error('Menu key already exists', 'DUPLICATE_KEY', 409)
      );
    }
    
    // Insert new menu item
    const [result] = await getAppPool().query(
      `INSERT INTO menu_items 
       (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        menu_key,
        title,
        path || null,
        icon || null,
        parent_id || null,
        display_order || 999,
        is_system_required || false,
        description || null
      ]
    );
    
    console.log('✅ Menu item created successfully');
    
    res.status(201).json(
      ApiResponse.success({ id: result.insertId }, 'Menu item created successfully')
    );
  } catch (error) {
    console.error('❌ Error creating menu item:', error);
    res.status(500).json(
      ApiResponse.error('Failed to create menu item', 'DATABASE_ERROR', 500, error)
    );
  }
});

// PUT /api/menu-permissions/item/:menuItemId/details - Update menu item details
router.put('/item/:menuItemId/details', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const updates = req.body;
    
    console.log(`📝 Updating menu item ${menuItemId}`);
    
    // Build update query dynamically
    const updateFields = [];
    const values = [];
    
    const allowedFields = [
      'title', 'path', 'icon', 'parent_id', 
      'display_order', 'is_system_required', 'description'
    ];
    
    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json(
        ApiResponse.error('No valid fields to update', 'VALIDATION_ERROR', 400)
      );
    }
    
    values.push(menuItemId);
    
    await getAppPool().query(
      `UPDATE menu_items SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );
    
    console.log('✅ Menu item updated successfully');
    
    res.json(ApiResponse.success(null, 'Menu item updated successfully'));
  } catch (error) {
    console.error('❌ Error updating menu item:', error);
    res.status(500).json(
      ApiResponse.error('Failed to update menu item', 'DATABASE_ERROR', 500, error)
    );
  }
});

// DELETE /api/menu-permissions/item/:menuItemId - Delete menu item
router.delete('/item/:menuItemId', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { menuItemId } = req.params;
    
    console.log(`🗑️ Deleting menu item ${menuItemId}`);
    
    // Check if it's a system required item
    const [item] = await getAppPool().query(
      'SELECT is_system_required FROM menu_items WHERE id = ?',
      [menuItemId]
    );
    
    if (item.length > 0 && item[0].is_system_required) {
      return res.status(403).json(
        ApiResponse.error('Cannot delete system required menu item', 'FORBIDDEN', 403)
      );
    }
    
    // Delete menu item (permissions will cascade delete)
    await getAppPool().query(
      'DELETE FROM menu_items WHERE id = ?',
      [menuItemId]
    );
    
    console.log('✅ Menu item deleted successfully');
    
    res.json(ApiResponse.success(null, 'Menu item deleted successfully'));
  } catch (error) {
    console.error('❌ Error deleting menu item:', error);
    res.status(500).json(
      ApiResponse.error('Failed to delete menu item', 'DATABASE_ERROR', 500, error)
    );
  }
});

// GET /api/menu-permissions/current-user - Get menu items for current user
router.get('/current-user', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.role;
    console.log(`📋 Fetching menu items for current user (${userRole})`);
    
    // Super admins see everything
    if (userRole === 'super_admin') {
      const [menuItems] = await getAppPool().query(`
        SELECT 
          id,
          menu_key,
          title,
          path,
          icon,
          parent_id,
          display_order,
          description
        FROM menu_items
        ORDER BY parent_id, display_order
      `);
      
      res.json(ApiResponse.success(menuItems, 'Menu items retrieved'));
      return;
    }
    
    // Other roles see only permitted items
    const [menuItems] = await getAppPool().query(`
      SELECT DISTINCT
        mi.id,
        mi.menu_key,
        mi.title,
        mi.path,
        mi.icon,
        mi.parent_id,
        mi.display_order,
        mi.description
      FROM menu_items mi
      LEFT JOIN role_menu_permissions rmp 
        ON mi.id = rmp.menu_item_id
      WHERE mi.is_system_required = TRUE
        OR (rmp.role = ? AND rmp.is_visible = TRUE)
      ORDER BY mi.parent_id, mi.display_order
    `, [userRole]);
    
    console.log(`✅ Found ${menuItems.length} menu items for user`);
    
    res.json(ApiResponse.success(menuItems, 'Menu items retrieved'));
  } catch (error) {
    console.error('❌ Error fetching current user menu:', error);
    res.status(500).json(
      ApiResponse.error('Failed to fetch menu items', 'DATABASE_ERROR', 500, error)
    );
  }
});

// POST /api/menu-permissions/reset-defaults - Reset to default permissions
router.post('/reset-defaults', requireAuth, requireSuperAdmin, async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    console.log('🔄 Resetting menu permissions to defaults');
    
    await connection.beginTransaction();
    
    // Clear all permissions
    await getAppPool().query('DELETE FROM role_menu_permissions');
    
    // Set default permissions
    const defaultPermissions = [
      // Super admin sees everything
      ['super_admin', 'SELECT id FROM menu_items', true],
      // Admin sees most things
      ['admin', 'SELECT id FROM menu_items WHERE menu_key NOT IN ("system_settings", "menu_config")', true],
      // Manager sees operational items
      ['manager', 'SELECT id FROM menu_items WHERE menu_key IN ("dashboard", "records", "reports", "calendar")', true],
      // Priest sees church-related items
      ['priest', 'SELECT id FROM menu_items WHERE menu_key IN ("dashboard", "records", "calendar", "members")', true],
      // User sees basic items
      ['user', 'SELECT id FROM menu_items WHERE menu_key IN ("dashboard", "profile", "calendar")', true],
      // Viewer sees minimal items
      ['viewer', 'SELECT id FROM menu_items WHERE menu_key IN ("dashboard", "calendar")', true],
    ];
    
    for (const [role, query, isVisible] of defaultPermissions) {
      const [menuIds] = await getAppPool().query(query);
      if (menuIds.length > 0) {
        const values = menuIds.map(item => [role, item.id, isVisible]);
        await getAppPool().query(
          'INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) VALUES ?',
          [values]
        );
      }
    }
    
    await connection.commit();
    
    console.log('✅ Menu permissions reset to defaults');
    
    res.json(ApiResponse.success(null, 'Menu permissions reset to defaults'));
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error resetting permissions:', error);
    res.status(500).json(
      ApiResponse.error('Failed to reset permissions', 'DATABASE_ERROR', 500, error)
    );
  } finally {
    connection.release();
  }
});

// GET /api/menu-permissions/export - Export menu configuration
router.get('/export', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    console.log('📤 Exporting menu configuration');
    
    const [menuItems] = await getAppPool().query(`
      SELECT * FROM menu_items ORDER BY parent_id, display_order
    `);
    
    const [permissions] = await getAppPool().query(`
      SELECT * FROM role_menu_permissions ORDER BY role, menu_item_id
    `);
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      menuItems,
      permissions
    };
    
    res.json(ApiResponse.success(exportData, 'Menu configuration exported'));
  } catch (error) {
    console.error('❌ Error exporting configuration:', error);
    res.status(500).json(
      ApiResponse.error('Failed to export configuration', 'DATABASE_ERROR', 500, error)
    );
  }
});

// POST /api/menu-permissions/import - Import menu configuration
router.post('/import', requireAuth, requireSuperAdmin, async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    const { config } = req.body;
    
    if (!config || !config.menuItems || !config.permissions) {
      return res.status(400).json(
        ApiResponse.error('Invalid configuration data', 'VALIDATION_ERROR', 400)
      );
    }
    
    console.log('📥 Importing menu configuration');
    
    await connection.beginTransaction();
    
    // Clear existing data
    await getAppPool().query('DELETE FROM role_menu_permissions');
    await getAppPool().query('DELETE FROM menu_items');
    
    // Import menu items
    if (config.menuItems.length > 0) {
      const menuValues = config.menuItems.map(item => [
        item.menu_key,
        item.title,
        item.path,
        item.icon,
        item.parent_id,
        item.display_order,
        item.is_system_required,
        item.description
      ]);
      
      await getAppPool().query(
        `INSERT INTO menu_items 
         (menu_key, title, path, icon, parent_id, display_order, is_system_required, description) 
         VALUES ?`,
        [menuValues]
      );
    }
    
    // Import permissions
    if (config.permissions.length > 0) {
      const permValues = config.permissions.map(perm => [
        perm.role,
        perm.menu_item_id,
        perm.is_visible
      ]);
      
      await getAppPool().query(
        `INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) VALUES ?`,
        [permValues]
      );
    }
    
    await connection.commit();
    
    console.log('✅ Menu configuration imported successfully');
    
    res.json(ApiResponse.success(null, 'Menu configuration imported successfully'));
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error importing configuration:', error);
    res.status(500).json(
      ApiResponse.error('Failed to import configuration', 'DATABASE_ERROR', 500, error)
    );
  } finally {
    connection.release();
  }
});

module.exports = router;
