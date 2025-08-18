#!/usr/bin/env node
// Enable social menu items for frjames@ssppoc.org and admin role
const { promisePool, testConnection, close } = require('../config/db-scripts');

async function enableSocialMenu() {
    console.log('🚀 Enabling Social Menu for frjames@ssppoc.org...\n');
    
    try {
        const connectionTest = await testConnection();
        if (!connectionTest.success) {
            console.log('❌ Cannot connect to database');
            return;
        }
        
        // 1. Check if menu_items table exists
        console.log('1️⃣ Checking menu system tables...');
        const tablesExist = await checkMenuTables();
        if (!tablesExist) {
            console.log('❌ Menu system tables not found. Creating them...');
            await createMenuTables();
        } else {
            console.log('✅ Menu system tables exist');
        }
        
        // 2. Add social menu items if they don't exist
        console.log('\n2️⃣ Adding social menu items...');
        await addSocialMenuItems();
        
        // 3. Enable social menu for admin role (frjames's role)
        console.log('\n3️⃣ Enabling social menu for admin role...');
        await enableSocialForRole('admin');
        
        // 4. Verify frjames can see social menu
        console.log('\n4️⃣ Verification...');
        await verifyUserAccess('frjames@ssppoc.org');
        
        console.log('\n🎉 Social menu setup complete!');
        console.log('\n📋 What was enabled:');
        console.log('   ✅ Social Blog (/social/blog)');
        console.log('   ✅ Social Friends (/social/friends)');
        console.log('   ✅ Social Chat (/social/chat)');
        console.log('   ✅ Social Notifications (/social/notifications)');
        console.log('\n🧪 Test steps:');
        console.log('   1. Login as frjames@ssppoc.org');
        console.log('   2. Look for "Social" in the main menu');
        console.log('   3. Should see blog, friends, chat, notifications');
        
    } catch (error) {
        console.error('❌ Error enabling social menu:', error.message);
    } finally {
        await close();
    }
}

async function checkMenuTables() {
    try {
        const [tables] = await promisePool.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name IN ('menu_items', 'role_menu_permissions')
        `);
        return tables[0].count === 2;
    } catch (error) {
        return false;
    }
}

async function createMenuTables() {
    console.log('   Creating menu_items table...');
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
    
    console.log('   Creating role_menu_permissions table...');
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
    
    console.log('   ✅ Menu tables created');
}

async function addSocialMenuItems() {
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
    
    for (const item of socialMenuItems) {
        // Check if item already exists
        const [existing] = await promisePool.execute(
            'SELECT id FROM menu_items WHERE menu_key = ?',
            [item.menu_key]
        );
        
        if (existing.length > 0) {
            console.log(`   ⏭️  ${item.title} menu item already exists`);
            continue;
        }
        
        // Get parent_id if needed
        let parent_id = item.parent_id;
        if (item.parent_key) {
            const [parent] = await promisePool.execute(
                'SELECT id FROM menu_items WHERE menu_key = ?',
                [item.parent_key]
            );
            parent_id = parent.length > 0 ? parent[0].id : null;
        }
        
        // Insert menu item
        await promisePool.execute(`
            INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [item.menu_key, item.title, item.path, item.icon, parent_id, item.display_order, item.description]);
        
        console.log(`   ✅ Added ${item.title} menu item`);
    }
}

async function enableSocialForRole(role) {
    // Get all social menu items
    const [socialItems] = await promisePool.execute(`
        SELECT id, title FROM menu_items 
        WHERE menu_key LIKE 'social%'
    `);
    
    console.log(`   Found ${socialItems.length} social menu items for role: ${role}`);
    
    for (const item of socialItems) {
        // Check if permission already exists
        const [existing] = await promisePool.execute(
            'SELECT id FROM role_menu_permissions WHERE role = ? AND menu_item_id = ?',
            [role, item.id]
        );
        
        if (existing.length > 0) {
            // Update to make visible
            await promisePool.execute(
                'UPDATE role_menu_permissions SET is_visible = TRUE WHERE role = ? AND menu_item_id = ?',
                [role, item.id]
            );
            console.log(`   ✅ Updated ${item.title} visibility for ${role}`);
        } else {
            // Insert new permission
            await promisePool.execute(
                'INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) VALUES (?, ?, TRUE)',
                [role, item.id]
            );
            console.log(`   ✅ Enabled ${item.title} for ${role}`);
        }
    }
}

async function verifyUserAccess(email) {
    const [users] = await promisePool.execute(
        'SELECT role FROM users WHERE email = ?',
        [email]
    );
    
    if (users.length === 0) {
        console.log(`   ❌ User ${email} not found`);
        return;
    }
    
    const userRole = users[0].role;
    console.log(`   User role: ${userRole}`);
    
    // Get visible social menu items for this role
    const [visibleItems] = await promisePool.execute(`
        SELECT mi.title, mi.path 
        FROM menu_items mi
        JOIN role_menu_permissions rmp ON mi.id = rmp.menu_item_id
        WHERE rmp.role = ? AND rmp.is_visible = TRUE AND mi.menu_key LIKE 'social%'
        ORDER BY mi.parent_id, mi.display_order
    `, [userRole]);
    
    console.log(`   Visible social menu items for ${email}:`);
    visibleItems.forEach(item => {
        console.log(`     ✅ ${item.title}${item.path ? ' (' + item.path + ')' : ''}`);
    });
    
    if (visibleItems.length === 0) {
        console.log(`   ⚠️  No social menu items visible for ${userRole} role`);
    }
}

enableSocialMenu(); 