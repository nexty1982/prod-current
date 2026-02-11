const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db');
const { requireRole } = require('../../middleware/auth');

// Get user's social permissions
router.get('/user/:userId', requireRole(['super_admin', 'admin']), async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`📱 Getting social permissions for user ${userId}`);
        
        // Get user role
        const [users] = await promisePool.execute(
            'SELECT role FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const userRole = users[0].role;
        
        // Get social menu items
        const [socialItems] = await promisePool.execute(`
            SELECT mi.id, mi.menu_key, mi.title, mi.path, mi.description
            FROM menu_items mi
            WHERE mi.menu_key LIKE 'social%'
            ORDER BY mi.parent_id, mi.display_order
        `);
        
        // Get current permissions for this user's role
        let permissions = [];
        if (socialItems.length > 0) {
            const [permissionsResult] = await promisePool.execute(`
                SELECT rmp.menu_item_id, rmp.is_visible
                FROM role_menu_permissions rmp
                WHERE rmp.role = ?
                AND rmp.menu_item_id IN (${socialItems.map(() => '?').join(',')})
            `, [userRole, ...socialItems.map(item => item.id)]);
            permissions = permissionsResult;
        }
        
        // Build response with current permissions
        const socialPermissions = socialItems.map(item => {
            const permission = permissions.find(p => p.menu_item_id === item.id);
            return {
                ...item,
                enabled: permission ? permission.is_visible : false
            };
        });
        
        res.json({
            success: true,
            userRole,
            socialPermissions
        });
        
    } catch (error) {
        console.error('Error getting social permissions:', error);
        res.status(500).json({ success: false, message: 'Failed to get social permissions' });
    }
});

// Update user's social permissions
router.put('/user/:userId', requireRole(['super_admin']), async (req, res) => {
    try {
        const { userId } = req.params;
        const { enabled, socialItems } = req.body;
        
        console.log(`📱 Updating social permissions for user ${userId}:`, { enabled, socialItems });
        
        // Get user role
        const [users] = await promisePool.execute(
            'SELECT role FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const userRole = users[0].role;
        
        // Ensure menu items exist
        await ensureSocialMenuItems();
        
        // Get all social menu item IDs
        const [menuItems] = await promisePool.execute(`
            SELECT id FROM menu_items WHERE menu_key LIKE 'social%'
        `);
        
        const menuItemIds = menuItems.map(item => item.id);
        
        // Update permissions for user's role
        for (const menuItemId of menuItemIds) {
            // Check if permission exists
            const [existing] = await promisePool.execute(
                'SELECT id FROM role_menu_permissions WHERE role = ? AND menu_item_id = ?',
                [userRole, menuItemId]
            );
            
            if (existing.length > 0) {
                // Update existing permission
                await promisePool.execute(
                    'UPDATE role_menu_permissions SET is_visible = ? WHERE role = ? AND menu_item_id = ?',
                    [enabled, userRole, menuItemId]
                );
            } else {
                // Insert new permission
                await promisePool.execute(
                    'INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) VALUES (?, ?, ?)',
                    [userRole, menuItemId, enabled]
                );
            }
        }
        
        console.log(`📱 Updated ${menuItemIds.length} social permissions for role ${userRole} (enabled: ${enabled})`);
        
        res.json({
            success: true,
            message: `Social features ${enabled ? 'enabled' : 'disabled'} for user`,
            userRole,
            updatedCount: menuItemIds.length
        });
        
    } catch (error) {
        console.error('Error updating social permissions:', error);
        res.status(500).json({ success: false, message: 'Failed to update social permissions' });
    }
});

// Enable social features for specific users (individual user override)
router.post('/user/:userId/enable', requireRole(['super_admin']), async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`📱 Enabling social features for individual user ${userId}`);
        
        // Get user details
        const [users] = await promisePool.execute(
            'SELECT email, role FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const user = users[0];
        
        // Ensure social menu items exist
        await ensureSocialMenuItems();
        
        // Enable all social features for this user's role
        const [menuItems] = await promisePool.execute(`
            SELECT id, title FROM menu_items WHERE menu_key LIKE 'social%'
        `);
        
        let updatedCount = 0;
        for (const item of menuItems) {
            // Check if permission exists
            const [existing] = await promisePool.execute(
                'SELECT id FROM role_menu_permissions WHERE role = ? AND menu_item_id = ?',
                [user.role, item.id]
            );
            
            if (existing.length > 0) {
                await promisePool.execute(
                    'UPDATE role_menu_permissions SET is_visible = TRUE WHERE role = ? AND menu_item_id = ?',
                    [user.role, item.id]
                );
            } else {
                await promisePool.execute(
                    'INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) VALUES (?, ?, TRUE)',
                    [user.role, item.id]
                );
            }
            updatedCount++;
        }
        
        console.log(`📱 Enabled ${updatedCount} social features for ${user.email} (${user.role})`);
        
        res.json({
            success: true,
            message: `Social features enabled for ${user.email}`,
            user: {
                email: user.email,
                role: user.role
            },
            enabledFeatures: menuItems.map(item => item.title),
            updatedCount
        });
        
    } catch (error) {
        console.error('Error enabling social features:', error);
        res.status(500).json({ success: false, message: 'Failed to enable social features' });
    }
});

// Helper function to ensure social menu items exist
async function ensureSocialMenuItems() {
    const socialMenuItems = [
        {
            menu_key: 'social',
            title: 'Social',
            path: null,
            icon: 'IconUsers',
            parent_id: null,
            display_order: 10,
            description: 'Social features and community'
        },
        {
            menu_key: 'social.blog',
            title: 'Blog',
            path: '/social/blog',
            icon: 'IconArticle',
            parent_key: 'social',
            display_order: 1,
            description: 'Community blog posts'
        },
        {
            menu_key: 'social.friends',
            title: 'Friends',
            path: '/social/friends',
            icon: 'IconUserPlus',
            parent_key: 'social',
            display_order: 2,
            description: 'Friends and connections'
        },
        {
            menu_key: 'social.chat',
            title: 'Chat',
            path: '/social/chat',
            icon: 'IconMessageCircle',
            parent_key: 'social',
            display_order: 3,
            description: 'Social messaging'
        },
        {
            menu_key: 'social.notifications',
            title: 'Notifications',
            path: '/social/notifications',
            icon: 'IconBell',
            parent_key: 'social',
            display_order: 4,
            description: 'Social notifications'
        }
    ];
    
    // Ensure menu_items table exists
    await promisePool.execute(`
        CREATE TABLE IF NOT EXISTS menu_items (
            id INT PRIMARY KEY AUTO_INCREMENT,
            menu_key VARCHAR(100) UNIQUE NOT NULL,
            title VARCHAR(255) NOT NULL,
            path VARCHAR(255),
            icon VARCHAR(100),
            parent_id INT NULL,
            display_order INT DEFAULT 0,
            is_system_required BOOLEAN DEFAULT FALSE,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE CASCADE,
            INDEX idx_menu_parent (parent_id),
            INDEX idx_menu_order (display_order)
        )
    `);
    
    // Ensure role_menu_permissions table exists
    await promisePool.execute(`
        CREATE TABLE IF NOT EXISTS role_menu_permissions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            role ENUM('super_admin', 'admin', 'manager', 'user', 'viewer', 'priest', 'deacon') NOT NULL,
            menu_item_id INT NOT NULL,
            is_visible BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
            UNIQUE KEY unique_role_menu (role, menu_item_id),
            INDEX idx_role_permissions (role),
            INDEX idx_menu_permissions (menu_item_id)
        )
    `);
    
    // Add social menu items if they don't exist
    for (const item of socialMenuItems) {
        const [existing] = await promisePool.execute(
            'SELECT id FROM menu_items WHERE menu_key = ?',
            [item.menu_key]
        );
        
        if (existing.length === 0) {
            // Get parent_id if needed
            let parent_id = item.parent_id;
            if (item.parent_key) {
                const [parent] = await promisePool.execute(
                    'SELECT id FROM menu_items WHERE menu_key = ?',
                    [item.parent_key]
                );
                parent_id = parent.length > 0 ? parent[0].id : null;
            }
            
            await promisePool.execute(`
                INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, description)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [item.menu_key, item.title, item.path, item.icon, parent_id, item.display_order, item.description]);
        }
    }
}

module.exports = router; 