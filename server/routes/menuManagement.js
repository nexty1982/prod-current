// server/routes/menuManagement.js
const express = require('express');
const { promisePool } = require('../config/db');

const router = express.Router();

// Middleware to check if user is super admin (only super admin can manage menus)
const requireSuperAdmin = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    const userRole = req.session.user.role;
    if (userRole !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Super administrator privileges required'
        });
    }

    next();
};

// GET /menu-management/permissions - Get all menu permissions for all roles (super admin only)
router.get('/permissions', requireSuperAdmin, async (req, res) => {
    try {
        console.log('🔍 Menu permissions request from:', req.session.user?.email);

        const [rows] = await promisePool.query(`
            SELECT 
                mi.id as menu_item_id,
                mi.menu_key,
                mi.title,
                mi.path,
                mi.icon,
                mi.parent_id,
                mi.display_order,
                mi.is_system_required,
                mi.description,
                rmp.role,
                rmp.is_visible
            FROM menu_items mi
            LEFT JOIN role_menu_permissions rmp ON mi.id = rmp.menu_item_id
            ORDER BY mi.display_order, mi.title, rmp.role
        `);

        // Group by menu item for easier frontend handling
        const menuPermissions = {};

        rows.forEach(row => {
            if (!menuPermissions[row.menu_item_id]) {
                menuPermissions[row.menu_item_id] = {
                    id: row.menu_item_id,
                    menu_key: row.menu_key,
                    title: row.title,
                    path: row.path,
                    icon: row.icon,
                    parent_id: row.parent_id,
                    display_order: row.display_order,
                    is_system_required: row.is_system_required,
                    description: row.description,
                    permissions: {}
                };
            }

            if (row.role) {
                menuPermissions[row.menu_item_id].permissions[row.role] = row.is_visible;
            }
        });

        res.json({
            success: true,
            menuPermissions: Object.values(menuPermissions)
        });
    } catch (err) {
        console.error('❌ Error fetching menu permissions:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching menu permissions',
            error: err.message
        });
    }
});

// GET /menu-management/for-role/:role - Get visible menu items for a specific role
router.get('/for-role/:role', async (req, res) => {
    try {
        const { role } = req.params;

        // Validate role
        const validRoles = ['super_admin', 'admin', 'manager', 'user', 'viewer', 'priest', 'deacon'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role specified'
            });
        }

        console.log('🔍 Menu items request for role:', role);

        const [rows] = await promisePool.query(`
            SELECT 
                mi.id,
                mi.menu_key,
                mi.title,
                mi.path,
                mi.icon,
                mi.parent_id,
                mi.display_order,
                mi.description
            FROM menu_items mi
            INNER JOIN role_menu_permissions rmp ON mi.id = rmp.menu_item_id
            WHERE rmp.role = ? AND rmp.is_visible = TRUE
            ORDER BY mi.display_order, mi.title
        `, [role]);

        // Build hierarchical menu structure
        const menuItems = buildMenuHierarchy(rows);

        res.json({
            success: true,
            role: role,
            menuItems: menuItems
        });
    } catch (err) {
        console.error('❌ Error fetching menu items for role:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching menu items',
            error: err.message
        });
    }
});

// PUT /menu-management/permissions - Update menu permissions for roles (super admin only)
router.put('/permissions', requireSuperAdmin, async (req, res) => {
    try {
        const { updates } = req.body; // Array of {menu_item_id, role, is_visible}

        if (!Array.isArray(updates)) {
            return res.status(400).json({
                success: false,
                message: 'Updates must be an array'
            });
        }

        console.log('🔍 Updating menu permissions:', updates.length, 'updates');

        // Start transaction
        await promisePool.query('START TRANSACTION');

        try {
            for (const update of updates) {
                const { menu_item_id, role, is_visible } = update;

                // Check if menu item is system required and cannot be disabled for certain roles
                const [menuItem] = await promisePool.query(
                    'SELECT is_system_required, menu_key FROM menu_items WHERE id = ?',
                    [menu_item_id]
                );

                if (menuItem.length > 0 && menuItem[0].is_system_required) {
                    // System required items cannot be disabled for super_admin and admin roles
                    if (!is_visible && (role === 'super_admin' || role === 'admin')) {
                        console.log('⚠️ Skipping system required item for admin/super_admin:', menuItem[0].menu_key);
                        continue;
                    }
                    // For other roles, system required items can be disabled for access control
                }

                // Update or insert permission
                await promisePool.query(`
                    INSERT INTO role_menu_permissions (role, menu_item_id, is_visible)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        is_visible = VALUES(is_visible),
                        updated_at = CURRENT_TIMESTAMP
                `, [role, menu_item_id, is_visible]);
            }

            await promisePool.query('COMMIT');

            console.log('✅ Menu permissions updated successfully by:', req.session.user.email);

            res.json({
                success: true,
                message: 'Menu permissions updated successfully',
                updatedCount: updates.length
            });
        } catch (updateErr) {
            await promisePool.query('ROLLBACK');
            throw updateErr;
        }
    } catch (err) {
        console.error('❌ Error updating menu permissions:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while updating menu permissions',
            error: err.message
        });
    }
});

// GET /menu-management/current-user - Get menu items for current logged-in user
router.get('/current-user', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userRole = req.session.user.role;
        console.log('🔍 Menu items request for current user role:', userRole);

        const [rows] = await promisePool.query(`
            SELECT 
                mi.id,
                mi.menu_key,
                mi.title,
                mi.path,
                mi.icon,
                mi.parent_id,
                mi.display_order,
                mi.description
            FROM menu_items mi
            INNER JOIN role_menu_permissions rmp ON mi.id = rmp.menu_item_id
            WHERE rmp.role = ? AND rmp.is_visible = TRUE
            ORDER BY mi.display_order, mi.title
        `, [userRole]);

        // Build hierarchical menu structure
        const menuItems = buildMenuHierarchy(rows);

        res.json({
            success: true,
            role: userRole,
            menuItems: menuItems
        });
    } catch (err) {
        console.error('❌ Error fetching current user menu items:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching menu items',
            error: err.message
        });
    }
});

// Helper function to build hierarchical menu structure
function buildMenuHierarchy(flatMenuItems) {
    const itemMap = {};
    const rootItems = [];

    // First pass: create item map
    flatMenuItems.forEach(item => {
        itemMap[item.id] = {
            ...item,
            children: []
        };
    });

    // Second pass: build hierarchy
    flatMenuItems.forEach(item => {
        if (item.parent_id && itemMap[item.parent_id]) {
            itemMap[item.parent_id].children.push(itemMap[item.id]);
        } else {
            rootItems.push(itemMap[item.id]);
        }
    });

    return rootItems;
}

module.exports = router;
