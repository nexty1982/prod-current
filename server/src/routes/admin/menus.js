/**
 * Admin Menus API Routes
 * Handles menu seeding and management for the Menu Editor
 */

const express = require('express');
const router = express.Router();
const { getAppPool } = require('../../config/db-compat');
const { requireRole } = require('../../middleware/auth');

// All routes require super_admin
router.use(requireRole(['super_admin']));

/**
 * POST /api/admin/menus/seed
 * Seed menu items from template
 * Uses UPSERT logic to prevent duplicates
 * 
 * Body: {
 *   templateId: "default-superadmins",
 *   role: "super_admin",
 *   items: [...]
 * }
 */
router.post('/seed', async (req, res) => {
  const connection = await getAppPool().getConnection();
  
  try {
    const { templateId, role, items } = req.body;
    const userId = req.user?.id || req.session?.user?.id;
    
    // Validate required fields
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required'
      });
    }
    
    // Validate templateId (whitelist)
    const allowedTemplates = ['default-superadmins'];
    if (templateId && !allowedTemplates.includes(templateId)) {
      return res.status(400).json({
        success: false,
        error: `Invalid templateId. Allowed: ${allowedTemplates.join(', ')}`
      });
    }
    
    // Validate role
    const allowedRoles = ['super_admin', 'default'];
    const targetRole = role || req.session?.user?.role || 'super_admin';
    if (!allowedRoles.includes(targetRole)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Allowed: ${allowedRoles.join(', ')}`
      });
    }
    
    console.log(`🌱 Seeding ${items.length} menu items from template "${templateId || 'direct'}" for role: ${targetRole}`);
    
    // Start transaction
    await connection.beginTransaction();
    
    try {
      // Get menu_id for the target role
      const [menus] = await connection.query(`
        SELECT id FROM menus WHERE role = ? LIMIT 1
      `, [targetRole]);
      
      if (menus.length === 0) {
        throw new Error(`No menu found for role: ${targetRole}`);
      }
      
      const menuId = menus[0].id;
      console.log(`📋 Using menu_id: ${menuId} for role: ${targetRole}`);
      
      // Track inserted/updated items for parent_id resolution
      const keyToIdMap = {};
      const itemsWithParents = [];
      let insertedCount = 0;
      let updatedCount = 0;
      
      // First pass: UPSERT all items (without resolving parent_id yet)
      for (const item of items) {
        const {
          key_name,
          label,
          path,
          icon,
          parent_key_name, // NEW: use parent_key_name instead of parent_id
          order_index,
          is_active,
          meta
        } = item;
        
        // Validate key_name
        if (!key_name || key_name.trim() === '') {
          console.warn(`⚠️ Skipping item without key_name: ${label}`);
          continue;
        }
        
        // Validate key_name length
        if (key_name.length > 255) {
          console.warn(`⚠️ Skipping item with key_name too long (>255): ${key_name}`);
          continue;
        }
        
        // Validate path
        if (path && path !== '#') {
          const validPrefixes = [
            '/apps/', '/admin/', '/devel/', '/dashboards/', '/tools/',
            '/sandbox/', '/social/', '/church/', '/frontend-pages/', '/devel-tools/'
          ];
          const isValid = validPrefixes.some(prefix => path.startsWith(prefix));
          if (!isValid) {
            console.warn(`⚠️ Unusual path for "${label}": ${path}`);
          }
        }
        
        // Validate icon
        const allowedIcons = [
          'IconPoint', 'IconShield', 'IconUsers', 'IconLayoutDashboard',
          'IconSettings', 'IconLayout', 'IconSitemap', 'IconTerminal',
          'IconFileDescription', 'IconDatabase', 'IconEdit', 'IconBug',
          'IconRocket', 'IconActivity', 'IconBell', 'IconMessage',
          'IconUserPlus', 'IconComponents', 'IconPalette', 'IconTool',
          'IconCheckbox', 'IconBorderAll', 'IconGitBranch', 'IconNotes',
          'IconWriting', 'OrthodoxChurchIcon'
        ];
        if (icon && !allowedIcons.includes(icon)) {
          console.warn(`⚠️ Unknown icon for "${label}": ${icon}, using IconPoint`);
        }
        
        // Check if item already exists
        const [existing] = await connection.query(`
          SELECT id FROM router_menu_items WHERE menu_id = ? AND key_name = ?
        `, [menuId, key_name]);
        
        const isUpdate = existing.length > 0;
        
        // Insert or update item
        // ON DUPLICATE KEY UPDATE based on UNIQUE(menu_id, key_name)
        const [result] = await connection.query(`
          INSERT INTO router_menu_items (
            menu_id, key_name, label, path, icon, parent_id, 
            sort_order, is_devel_tool, visible_roles, updated_at
          )
          VALUES (?, ?, ?, ?, ?, NULL, ?, 0, NULL, NOW())
          ON DUPLICATE KEY UPDATE
            label = VALUES(label),
            path = VALUES(path),
            icon = VALUES(icon),
            sort_order = VALUES(sort_order),
            updated_at = NOW()
        `, [
          menuId,
          key_name,
          label,
          path || null,
          icon || null,
          order_index || 0
        ]);
        
        // Track insert vs update
        if (isUpdate) {
          updatedCount++;
        } else {
          insertedCount++;
        }
        
        // Get the inserted/updated ID
        const itemId = result.insertId || existing[0].id;
        
        // Map key_name to database id
        keyToIdMap[key_name] = itemId;
        
        // Track if this item has a parent (for second pass)
        if (parent_key_name !== null && parent_key_name !== undefined) {
          itemsWithParents.push({
            id: itemId,
            key_name,
            parent_key_name: parent_key_name
          });
        }
      }
      
      console.log(`✅ First pass complete: ${insertedCount} inserted, ${updatedCount} updated`);
      
      // Second pass: Resolve parent_id relationships using parent_key_name
      for (const item of itemsWithParents) {
        const resolvedParentId = keyToIdMap[item.parent_key_name];
        
        // Update parent_id if we found a valid parent
        if (resolvedParentId) {
          await connection.query(`
            UPDATE router_menu_items
            SET parent_id = ?
            WHERE id = ?
          `, [resolvedParentId, item.id]);
        } else {
          console.warn(`⚠️ Parent not found for "${item.key_name}": ${item.parent_key_name}`);
          // Set parent_id to NULL if parent not found
          await connection.query(`
            UPDATE router_menu_items
            SET parent_id = NULL
            WHERE id = ?
          `, [item.id]);
        }
      }
      
      console.log(`✅ Second pass complete: ${itemsWithParents.length} parent relationships resolved`);
      
      // Commit transaction
      await connection.commit();
      
      res.json({
        success: true,
        message: `Successfully seeded menu from template "${templateId || 'direct'}"`,
        templateId: templateId || null,
        role: targetRole,
        stats: {
          totalProcessed: items.length,
          inserted: insertedCount,
          updated: updatedCount,
          parentsResolved: itemsWithParents.length
        }
      });
      
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error seeding menu items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed menu items',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * POST /api/admin/menus/reset-to-template
 * Reset menu to template (delete all existing items, then seed)
 * 
 * Body: {
 *   templateId: "default-superadmins",
 *   role: "super_admin",
 *   items: [...]
 * }
 */
router.post('/reset-to-template', async (req, res) => {
  const connection = await getAppPool().getConnection();
  
  try {
    const { templateId, role, items } = req.body;
    const userId = req.user?.id || req.session?.user?.id;
    
    // Validate required fields
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required'
      });
    }
    
    // Validate templateId (whitelist)
    const allowedTemplates = ['default-superadmins'];
    if (!templateId || !allowedTemplates.includes(templateId)) {
      return res.status(400).json({
        success: false,
        error: `Invalid or missing templateId. Allowed: ${allowedTemplates.join(', ')}`
      });
    }
    
    // Validate role
    const allowedRoles = ['super_admin', 'default'];
    const targetRole = role || req.session?.user?.role || 'super_admin';
    if (!allowedRoles.includes(targetRole)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Allowed: ${allowedRoles.join(', ')}`
      });
    }
    
    console.log(`🔄 Resetting menu to template "${templateId}" for role: ${targetRole}`);
    
    // Start transaction
    await connection.beginTransaction();
    
    try {
      // Get menu_id for the target role
      const [menus] = await connection.query(`
        SELECT id FROM menus WHERE role = ? LIMIT 1
      `, [targetRole]);
      
      if (menus.length === 0) {
        throw new Error(`No menu found for role: ${targetRole}`);
      }
      
      const menuId = menus[0].id;
      console.log(`📋 Using menu_id: ${menuId} for role: ${targetRole}`);
      
      // Count existing items before deletion
      const [countBefore] = await connection.query(`
        SELECT COUNT(*) as count FROM router_menu_items WHERE menu_id = ?
      `, [menuId]);
      const deletedCount = countBefore[0].count;
      
      // Delete all existing items for this menu
      await connection.query(`
        DELETE FROM router_menu_items WHERE menu_id = ?
      `, [menuId]);
      
      console.log(`🗑️ Deleted ${deletedCount} existing menu items`);
      
      // Now seed from template (same logic as /seed endpoint)
      const keyToIdMap = {};
      const itemsWithParents = [];
      let insertedCount = 0;
      
      // First pass: INSERT all items
      for (const item of items) {
        const {
          key_name,
          label,
          path,
          icon,
          parent_key_name,
          order_index,
          is_active,
          meta
        } = item;
        
        // Validate key_name
        if (!key_name || key_name.trim() === '' || key_name.length > 255) {
          console.warn(`⚠️ Skipping invalid key_name: ${key_name}`);
          continue;
        }
        
        // Insert item (no UPSERT needed since we deleted everything)
        const [result] = await connection.query(`
          INSERT INTO router_menu_items (
            menu_id, key_name, label, path, icon, parent_id, 
            sort_order, is_devel_tool, visible_roles, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, NULL, ?, 0, NULL, NOW(), NOW())
        `, [
          menuId,
          key_name,
          label,
          path || null,
          icon || null,
          order_index || 0
        ]);
        
        insertedCount++;
        
        // Map key_name to database id
        keyToIdMap[key_name] = result.insertId;
        
        // Track if this item has a parent
        if (parent_key_name !== null && parent_key_name !== undefined) {
          itemsWithParents.push({
            id: result.insertId,
            key_name,
            parent_key_name: parent_key_name
          });
        }
      }
      
      console.log(`✅ First pass complete: ${insertedCount} items inserted`);
      
      // Second pass: Resolve parent_id relationships
      for (const item of itemsWithParents) {
        const resolvedParentId = keyToIdMap[item.parent_key_name];
        
        if (resolvedParentId) {
          await connection.query(`
            UPDATE router_menu_items
            SET parent_id = ?
            WHERE id = ?
          `, [resolvedParentId, item.id]);
        } else {
          console.warn(`⚠️ Parent not found for "${item.key_name}": ${item.parent_key_name}`);
        }
      }
      
      console.log(`✅ Second pass complete: ${itemsWithParents.length} parent relationships resolved`);
      
      // Commit transaction
      await connection.commit();
      
      res.json({
        success: true,
        message: `Successfully reset menu to template "${templateId}"`,
        templateId: templateId,
        role: targetRole,
        stats: {
          deleted: deletedCount,
          inserted: insertedCount,
          parentsResolved: itemsWithParents.length
        }
      });
      
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error resetting menu to template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset menu to template',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/admin/menus/stats
 * Get menu statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [stats] = await getAppPool().query(`
      SELECT 
        COUNT(*) AS total_items,
        COUNT(DISTINCT menu_id) AS total_menus,
        COUNT(DISTINCT key_name) AS unique_keys,
        SUM(CASE WHEN parent_id IS NULL THEN 1 ELSE 0 END) AS top_level_items,
        SUM(CASE WHEN parent_id IS NOT NULL THEN 1 ELSE 0 END) AS nested_items
      FROM router_menu_items
    `);
    
    res.json({
      success: true,
      stats: stats[0]
    });
  } catch (error) {
    console.error('Error getting menu stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/menus/verify-uniqueness
 * Check for duplicate menu items (diagnostic endpoint)
 */
router.post('/verify-uniqueness', async (req, res) => {
  try {
    const [duplicates] = await getAppPool().query(`
      SELECT 
        menu_id, 
        key_name,
        label, 
        path,
        COUNT(*) AS duplicate_count,
        GROUP_CONCAT(id ORDER BY id) AS duplicate_ids
      FROM router_menu_items
      GROUP BY menu_id, key_name
      HAVING COUNT(*) > 1
    `);
    
    res.json({
      success: true,
      hasDuplicates: duplicates.length > 0,
      duplicates
    });
  } catch (error) {
    console.error('Error verifying uniqueness:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
