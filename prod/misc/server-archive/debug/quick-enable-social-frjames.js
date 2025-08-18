#!/usr/bin/env node
// Quick enable social features for frjames@ssppoc.org using the new API
const { promisePool, testConnection, close } = require('../config/db-scripts');

async function quickEnableSocialForFrjames() {
    console.log('🚀 Quick enabling social features for frjames@ssppoc.org...\n');
    
    try {
        const connectionTest = await testConnection();
        if (!connectionTest.success) {
            console.log('❌ Cannot connect to database');
            return;
        }
        
        // Get frjames user ID
        const [users] = await promisePool.execute(
            'SELECT id, email, role FROM users WHERE email = ?',
            ['frjames@ssppoc.org']
        );
        
        if (users.length === 0) {
            console.log('❌ User frjames@ssppoc.org not found');
            return;
        }
        
        const user = users[0];
        console.log(`👤 Found user: ${user.email} (ID: ${user.id}, Role: ${user.role})`);
        
        // Ensure social menu items exist (same as API endpoint)
        await ensureSocialMenuItems();
        
        // Enable all social features for frjames's role
        const [menuItems] = await promisePool.execute(`
            SELECT id, title FROM menu_items WHERE menu_key LIKE 'social%'
        `);
        
        console.log(`📱 Found ${menuItems.length} social menu items to enable:`);
        menuItems.forEach(item => {
            console.log(`   - ${item.title}`);
        });
        
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
                console.log(`   ✅ Updated ${item.title} visibility for ${user.role}`);
            } else {
                await promisePool.execute(
                    'INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) VALUES (?, ?, TRUE)',
                    [user.role, item.id]
                );
                console.log(`   ✅ Enabled ${item.title} for ${user.role}`);
            }
            updatedCount++;
        }
        
        console.log(`\n🎉 Successfully enabled ${updatedCount} social features for ${user.email}!`);
        
        // Verify the changes
        console.log('\n🔍 Verification:');
        const [visibleItems] = await promisePool.execute(`
            SELECT mi.title, mi.path 
            FROM menu_items mi
            JOIN role_menu_permissions rmp ON mi.id = rmp.menu_item_id
            WHERE rmp.role = ? AND rmp.is_visible = TRUE AND mi.menu_key LIKE 'social%'
            ORDER BY mi.parent_id, mi.display_order
        `, [user.role]);
        
        console.log(`   Social features now visible for ${user.email}:`);
        visibleItems.forEach(item => {
            console.log(`     ✅ ${item.title}${item.path ? ' (' + item.path + ')' : ''}`);
        });
        
        console.log('\n📋 Next steps:');
        console.log('   1. Login as frjames@ssppoc.org');
        console.log('   2. Look for "Social" menu in the navigation');
        console.log('   3. Should see: Blog, Friends, Chat, Notifications');
        console.log('   4. Super admin can also manage this via User Management > Edit User');
        
    } catch (error) {
        console.error('❌ Error enabling social features:', error.message);
    } finally {
        await close();
    }
}

// Helper function to ensure social menu items exist (same as API)
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

quickEnableSocialForFrjames(); 