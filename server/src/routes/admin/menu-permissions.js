const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db');
const { requireRole, authMiddleware } = require('../../middleware/auth');

// Get current user's menu permissions  
router.get('/user-permissions', authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        
        const userId = req.user.id;
        const userRole = req.user.role;
        
        console.log(`📋 Getting menu permissions for user ${userId} (${userRole})`);
        
        // Get all menu items
        const [menuItems] = await promisePool.execute(`
            SELECT id, menu_key, title, path, icon, parent_id, display_order, description
            FROM menu_items
            ORDER BY parent_id, display_order
        `);
        
        if (menuItems.length === 0) {
            console.log('📋 No menu items found in database, using static permissions');
            return res.json({
                success: true,
                menuPermissions: [],
                useStaticPermissions: true,
                userRole
            });
        }
        
        // Get permissions for this user's role
        const [permissions] = await promisePool.execute(`
            SELECT rmp.menu_item_id, rmp.is_visible, mi.menu_key, mi.title, mi.path
            FROM role_menu_permissions rmp
            JOIN menu_items mi ON rmp.menu_item_id = mi.id
            WHERE rmp.role = ?
            AND rmp.is_visible = TRUE
        `, [userRole]);
        
        console.log(`📋 Found ${permissions.length} visible menu permissions for role ${userRole}`);
        
        // Build menu permissions response
        const visibleMenuKeys = new Set(permissions.map(p => p.menu_key));
        
        // Map menu items to their permissions
        const menuPermissions = menuItems.map(item => ({
            id: item.id,
            menu_key: item.menu_key,
            title: item.title,
            path: item.path,
            icon: item.icon,
            parent_id: item.parent_id,
            display_order: item.display_order,
            description: item.description,
            is_visible: visibleMenuKeys.has(item.menu_key)
        }));
        
        // Special handling for social menu items
        const socialPermissions = permissions.filter(p => p.menu_key.startsWith('social'));
        const hasSocialAccess = socialPermissions.length > 0;
        
        console.log(`📱 Social menu access for ${userRole}: ${hasSocialAccess ? 'ENABLED' : 'DISABLED'}`);
        if (hasSocialAccess) {
            console.log(`   Social items: ${socialPermissions.map(p => p.title).join(', ')}`);
        }
        
        res.json({
            success: true,
            menuPermissions,
            userRole,
            hasSocialAccess,
            socialPermissions: socialPermissions.map(p => p.menu_key),
            useStaticPermissions: false
        });
        
    } catch (error) {
        console.error('Error getting user menu permissions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get menu permissions',
            useStaticPermissions: true // Fallback to static permissions
        });
    }
});

// Get menu permissions for a specific role (admin use)
router.get('/role/:role', requireRole(['super_admin', 'admin']), async (req, res) => {
    try {
        const { role } = req.params;
        
        console.log(`📋 Getting menu permissions for role: ${role}`);
        
        // Get permissions for the specified role
        const [permissions] = await promisePool.execute(`
            SELECT mi.id, mi.menu_key, mi.title, mi.path, mi.icon, 
                   mi.parent_id, mi.display_order, mi.description,
                   COALESCE(rmp.is_visible, FALSE) as is_visible
            FROM menu_items mi
            LEFT JOIN role_menu_permissions rmp ON mi.id = rmp.menu_item_id AND rmp.role = ?
            ORDER BY mi.parent_id, mi.display_order
        `, [role]);
        
        res.json({
            success: true,
            role,
            permissions
        });
        
    } catch (error) {
        console.error('Error getting role menu permissions:', error);
        res.status(500).json({ success: false, message: 'Failed to get role menu permissions' });
    }
});

// Update menu permissions for a role
router.put('/role/:role', requireRole(['super_admin']), async (req, res) => {
    try {
        const { role } = req.params;
        const { permissions } = req.body;
        
        console.log(`📋 Updating menu permissions for role: ${role}`);
        console.log(`📋 Permissions to update: ${permissions.length} items`);
        
        // Update permissions
        for (const permission of permissions) {
            const { menu_item_id, is_visible } = permission;
            
            // Check if permission exists
            const [existing] = await promisePool.execute(
                'SELECT id FROM role_menu_permissions WHERE role = ? AND menu_item_id = ?',
                [role, menu_item_id]
            );
            
            if (existing.length > 0) {
                // Update existing permission
                await promisePool.execute(
                    'UPDATE role_menu_permissions SET is_visible = ? WHERE role = ? AND menu_item_id = ?',
                    [is_visible, role, menu_item_id]
                );
            } else {
                // Insert new permission
                await promisePool.execute(
                    'INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) VALUES (?, ?, ?)',
                    [role, menu_item_id, is_visible]
                );
            }
        }
        
        console.log(`📋 Updated ${permissions.length} menu permissions for role ${role}`);
        
        res.json({
            success: true,
            message: `Updated menu permissions for role ${role}`,
            updatedCount: permissions.length
        });
        
    } catch (error) {
        console.error('Error updating role menu permissions:', error);
        res.status(500).json({ success: false, message: 'Failed to update menu permissions' });
    }
});

module.exports = router; 