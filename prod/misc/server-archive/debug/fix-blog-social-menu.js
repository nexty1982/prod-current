#!/usr/bin/env node
// Fix missing blog social menu item
const { promisePool, testConnection, close } = require('../config/db-scripts');

async function fixBlogSocialMenu() {
    console.log('🔍 Diagnosing missing blog social menu item...\n');
    
    try {
        const connectionTest = await testConnection();
        if (!connectionTest.success) {
            console.log('❌ Cannot connect to database');
            return;
        }
        
        // Check current social menu items
        console.log('1️⃣ Checking existing social menu items...');
        const [socialMenuItems] = await promisePool.execute(`
            SELECT id, menu_key, title, path, description, display_order
            FROM menu_items 
            WHERE menu_key LIKE 'social%'
            ORDER BY display_order, id
        `);
        
        console.log(`   Found ${socialMenuItems.length} social menu items:`);
        socialMenuItems.forEach(item => {
            console.log(`     - ${item.title} (${item.menu_key}) → ${item.path || 'No path'} [Order: ${item.display_order}]`);
        });
        
        // Check if blog menu item exists
        const blogItem = socialMenuItems.find(item => item.menu_key === 'social.blog');
        
        if (!blogItem) {
            console.log('\n❌ Blog menu item missing! Creating it...');
            
            // Get the social parent menu item
            const [parentItems] = await promisePool.execute(
                'SELECT id FROM menu_items WHERE menu_key = ?',
                ['social']
            );
            
            let parent_id = null;
            if (parentItems.length > 0) {
                parent_id = parentItems[0].id;
                console.log(`   Found social parent menu with ID: ${parent_id}`);
            }
            
            // Create the blog menu item
            const [result] = await promisePool.execute(`
                INSERT INTO menu_items (menu_key, title, path, icon, parent_id, display_order, description)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                'social.blog',
                'Blog',
                '/social/blog',
                'IconArticle', 
                parent_id,
                1, // First item in social menu
                'Community blog posts and articles'
            ]);
            
            console.log(`   ✅ Created blog menu item with ID: ${result.insertId}`);
            
        } else {
            console.log(`\n✅ Blog menu item exists: ${blogItem.title} (ID: ${blogItem.id})`);
        }
        
        // Check permissions for your user (assuming super_admin role)
        console.log('\n2️⃣ Checking permissions for super_admin role...');
        const [permissions] = await promisePool.execute(`
            SELECT rmp.menu_item_id, rmp.is_visible, mi.menu_key, mi.title
            FROM role_menu_permissions rmp
            JOIN menu_items mi ON rmp.menu_item_id = mi.id
            WHERE rmp.role = 'super_admin' AND mi.menu_key LIKE 'social%'
            ORDER BY mi.display_order
        `);
        
        console.log(`   Found ${permissions.length} social permissions for super_admin:`);
        permissions.forEach(perm => {
            const status = perm.is_visible ? '✅ VISIBLE' : '❌ HIDDEN';
            console.log(`     ${status} ${perm.title} (${perm.menu_key})`);
        });
        
        // Get the blog menu item ID (after potentially creating it)
        const [blogMenuItems] = await promisePool.execute(
            'SELECT id, title FROM menu_items WHERE menu_key = ?',
            ['social.blog']
        );
        
        if (blogMenuItems.length === 0) {
            console.log('❌ Failed to create or find blog menu item');
            return;
        }
        
        const blogMenuId = blogMenuItems[0].id;
        
        // Check if blog permission exists for super_admin
        const blogPermission = permissions.find(p => p.menu_key === 'social.blog');
        
        if (!blogPermission) {
            console.log('\n❌ Blog permission missing for super_admin! Creating it...');
            
            await promisePool.execute(
                'INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) VALUES (?, ?, ?)',
                ['super_admin', blogMenuId, true]
            );
            
            console.log('   ✅ Created blog permission for super_admin');
            
        } else if (!blogPermission.is_visible) {
            console.log('\n❌ Blog permission exists but is disabled! Enabling it...');
            
            await promisePool.execute(
                'UPDATE role_menu_permissions SET is_visible = TRUE WHERE role = ? AND menu_item_id = ?',
                ['super_admin', blogMenuId]
            );
            
            console.log('   ✅ Enabled blog permission for super_admin');
            
        } else {
            console.log('\n✅ Blog permission is correctly enabled for super_admin');
        }
        
        // Also enable for other social-enabled roles
        console.log('\n3️⃣ Enabling blog for other roles with social access...');
        
        // Get all roles that have any social permissions
        const [socialRoles] = await promisePool.execute(`
            SELECT DISTINCT rmp.role
            FROM role_menu_permissions rmp
            JOIN menu_items mi ON rmp.menu_item_id = mi.id
            WHERE mi.menu_key LIKE 'social%' AND rmp.is_visible = TRUE
        `);
        
        console.log(`   Found ${socialRoles.length} roles with social access:`);
        
        for (const roleRow of socialRoles) {
            const role = roleRow.role;
            console.log(`     Checking role: ${role}`);
            
            // Check if this role has blog permission
            const [roleBlogPerms] = await promisePool.execute(
                'SELECT id, is_visible FROM role_menu_permissions WHERE role = ? AND menu_item_id = ?',
                [role, blogMenuId]
            );
            
            if (roleBlogPerms.length === 0) {
                // Create blog permission for this role
                await promisePool.execute(
                    'INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) VALUES (?, ?, ?)',
                    [role, blogMenuId, true]
                );
                console.log(`       ✅ Created blog permission for ${role}`);
                
            } else if (!roleBlogPerms[0].is_visible) {
                // Enable blog permission for this role
                await promisePool.execute(
                    'UPDATE role_menu_permissions SET is_visible = TRUE WHERE role = ? AND menu_item_id = ?',
                    [role, blogMenuId]
                );
                console.log(`       ✅ Enabled blog permission for ${role}`);
                
            } else {
                console.log(`       ✅ Blog already enabled for ${role}`);
            }
        }
        
        // Verify the fix
        console.log('\n4️⃣ Verification - Final social menu state:');
        const [finalSocialItems] = await promisePool.execute(`
            SELECT mi.id, mi.menu_key, mi.title, mi.path, mi.display_order,
                   COUNT(rmp.id) as permission_count,
                   SUM(CASE WHEN rmp.is_visible = TRUE THEN 1 ELSE 0 END) as visible_count
            FROM menu_items mi
            LEFT JOIN role_menu_permissions rmp ON mi.id = rmp.menu_item_id
            WHERE mi.menu_key LIKE 'social%'
            GROUP BY mi.id, mi.menu_key, mi.title, mi.path, mi.display_order
            ORDER BY mi.display_order, mi.id
        `);
        
        console.log('   Social menu items with permissions:');
        finalSocialItems.forEach(item => {
            console.log(`     ${item.title} (${item.menu_key}): ${item.visible_count}/${item.permission_count} roles can see it`);
        });
        
        console.log('\n🎉 Blog social menu fix complete!');
        console.log('\n🚀 Next steps:');
        console.log('   1. Refresh your browser page');
        console.log('   2. The Blog item should now appear in your social menu');
        console.log('   3. If using development server, it should update automatically');
        console.log('   4. Check browser console for "📱 Adding dynamic social menu items" message');
        
    } catch (error) {
        console.error('❌ Error fixing blog social menu:', error.message);
        console.error(error.stack);
    } finally {
        await close();
    }
}

fixBlogSocialMenu(); 