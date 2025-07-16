// server/routes/menuPermissions.js
const express = require('express');
const { promisePool } = require('../config/db');

const router = express.Router();

// Middleware to check if user is super_admin
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

// GET /api/menu-permissions - Get all menu items and their permissions
router.get('/', requireSuperAdmin, async (req, res) => {
    try {
        console.log('🔍 Fetching menu permissions...');

        // Get all menu items with their role permissions
        const [menuItems] = await promisePool.query(`
            SELECT 
                mi.id,
                mi.menu_key,
                mi.title,
                mi.path,
                mi.icon,
                mi.parent_id,
                mi.sort_order,
                mi.description,
                mi.is_active,
                GROUP_CONCAT(DISTINCT mrp.role ORDER BY mrp.role) as allowed_roles
            FROM menu_items mi
            LEFT JOIN menu_role_permissions mrp ON mi.id = mrp.menu_item_id
            WHERE mi.is_active = 1
            GROUP BY mi.id
            ORDER BY mi.sort_order, mi.title
        `);

        // Get all available roles
        const roles = ['admin', 'manager', 'user', 'priest', 'deacon', 'viewer'];

        console.log(`✅ Found ${menuItems.length} menu items`);

        res.json({
            success: true,
            menuItems: menuItems.map(item => ({
                ...item,
                allowed_roles: item.allowed_roles ? item.allowed_roles.split(',') : []
            })),
            availableRoles: roles
        });
    } catch (err) {
        console.error('❌ Error fetching menu permissions:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching menu permissions'
        });
    }
});

// PUT /api/menu-permissions/:menuId - Update menu permissions for a specific menu item
router.put('/:menuId', requireSuperAdmin, async (req, res) => {
    try {
        const menuId = parseInt(req.params.menuId);
        const { allowedRoles } = req.body;

        console.log(`🔍 Updating menu permissions for menu ID ${menuId}:`, allowedRoles);

        // Validate that the menu item exists
        const [menuCheck] = await promisePool.query(
            'SELECT id FROM menu_items WHERE id = ?',
            [menuId]
        );

        if (menuCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }

        // Start transaction
        await promisePool.query('START TRANSACTION');

        try {
            // Remove existing permissions for this menu item
            await promisePool.query(
                'DELETE FROM menu_role_permissions WHERE menu_item_id = ?',
                [menuId]
            );

            // Add new permissions
            if (allowedRoles && allowedRoles.length > 0) {
                const values = allowedRoles.map(role => [menuId, role]);
                await promisePool.query(
                    'INSERT INTO menu_role_permissions (menu_item_id, role) VALUES ?',
                    [values]
                );
            }

            // Commit transaction
            await promisePool.query('COMMIT');

            console.log(`✅ Menu permissions updated for menu ID ${menuId}`);

            res.json({
                success: true,
                message: 'Menu permissions updated successfully'
            });
        } catch (err) {
            // Rollback transaction on error
            await promisePool.query('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('❌ Error updating menu permissions:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while updating menu permissions'
        });
    }
});

// GET /api/menu-permissions/user/:role - Get menu items allowed for a specific role
router.get('/user/:role', async (req, res) => {
    try {
        const userRole = req.params.role;

        console.log(`🔍 Fetching menu items for role: ${userRole}`);

        // Get menu items that this role has access to
        const [menuItems] = await promisePool.query(`
            SELECT DISTINCT
                mi.id,
                mi.menu_key,
                mi.title,
                mi.path,
                mi.icon,
                mi.parent_id,
                mi.sort_order,
                mi.description
            FROM menu_items mi
            LEFT JOIN menu_role_permissions mrp ON mi.id = mrp.menu_item_id
            WHERE mi.is_active = 1
            AND (
                mrp.role = ? 
                OR mi.menu_key IN ('dashboard', 'welcome') -- Always show basic items
                OR ? = 'super_admin' -- Super admin sees everything
            )
            ORDER BY mi.sort_order, mi.title
        `, [userRole, userRole]);

        console.log(`✅ Found ${menuItems.length} menu items for role ${userRole}`);

        res.json({
            success: true,
            menuItems: menuItems
        });
    } catch (err) {
        console.error('❌ Error fetching user menu items:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching user menu items'
        });
    }
});

// POST /api/menu-permissions/menu-item - Create a new menu item (super admin only)
router.post('/menu-item', requireSuperAdmin, async (req, res) => {
    try {
        const {
            menu_key,
            title,
            path,
            icon,
            parent_id,
            sort_order,
            description,
            allowedRoles
        } = req.body;

        console.log('🔍 Creating new menu item:', { menu_key, title, path });

        // Validate required fields
        if (!menu_key || !title) {
            return res.status(400).json({
                success: false,
                message: 'Menu key and title are required'
            });
        }

        // Check if menu key already exists
        const [existingMenu] = await promisePool.query(
            'SELECT id FROM menu_items WHERE menu_key = ?',
            [menu_key]
        );

        if (existingMenu.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Menu key already exists'
            });
        }

        // Start transaction
        await promisePool.query('START TRANSACTION');

        try {
            // Insert new menu item
            const [result] = await promisePool.query(`
                INSERT INTO menu_items (
                    menu_key, title, path, icon, parent_id, sort_order, description, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `, [
                menu_key,
                title,
                path || null,
                icon || null,
                parent_id || null,
                sort_order || 999,
                description || null
            ]);

            const menuItemId = result.insertId;

            // Add role permissions if provided
            if (allowedRoles && allowedRoles.length > 0) {
                const values = allowedRoles.map(role => [menuItemId, role]);
                await promisePool.query(
                    'INSERT INTO menu_role_permissions (menu_item_id, role) VALUES ?',
                    [values]
                );
            }

            // Commit transaction
            await promisePool.query('COMMIT');

            console.log(`✅ Menu item created with ID ${menuItemId}`);

            res.json({
                success: true,
                message: 'Menu item created successfully',
                menuItemId: menuItemId
            });
        } catch (err) {
            // Rollback transaction on error
            await promisePool.query('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('❌ Error creating menu item:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while creating menu item'
        });
    }
});

// PUT /api/menu-permissions/menu-item/:id - Update menu item details
router.put('/menu-item/:id', requireSuperAdmin, async (req, res) => {
    try {
        const menuId = parseInt(req.params.id);
        const {
            title,
            path,
            icon,
            parent_id,
            sort_order,
            description,
            is_active
        } = req.body;

        console.log(`🔍 Updating menu item ${menuId}:`, { title, path });

        // Update menu item
        await promisePool.query(`
            UPDATE menu_items 
            SET 
                title = ?,
                path = ?,
                icon = ?,
                parent_id = ?,
                sort_order = ?,
                description = ?,
                is_active = ?
            WHERE id = ?
        `, [
            title,
            path || null,
            icon || null,
            parent_id || null,
            sort_order || 999,
            description || null,
            is_active !== undefined ? is_active : 1,
            menuId
        ]);

        console.log(`✅ Menu item ${menuId} updated successfully`);

        res.json({
            success: true,
            message: 'Menu item updated successfully'
        });
    } catch (err) {
        console.error('❌ Error updating menu item:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while updating menu item'
        });
    }
});

module.exports = router;
