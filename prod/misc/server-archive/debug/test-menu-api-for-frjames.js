#!/usr/bin/env node
// Test menu permissions API endpoint for frjames
const { promisePool, testConnection, close } = require('../config/db-scripts');

async function testMenuApiForFrjames() {
    console.log('🔍 Testing menu permissions API for frjames@ssppoc.org...\n');
    
    try {
        const connectionTest = await testConnection();
        if (!connectionTest.success) {
            console.log('❌ Cannot connect to database');
            return;
        }
        
        // Get frjames user details
        const [users] = await promisePool.execute(
            'SELECT id, email, role FROM users WHERE email = ?',
            ['frjames@ssppoc.org']
        );
        
        if (users.length === 0) {
            console.log('❌ User frjames@ssppoc.org not found');
            return;
        }
        
        const user = users[0];
        console.log(`👤 Testing for user: ${user.email} (ID: ${user.id}, Role: ${user.role})\n`);
        
        // Simulate the API call that the frontend makes
        console.log('🌐 Simulating API call: GET /api/admin/menu-permissions/user-permissions');
        
        // Get all menu items
        const [menuItems] = await promisePool.execute(`
            SELECT id, menu_key, title, path, icon, parent_id, display_order, description
            FROM menu_items
            ORDER BY parent_id, display_order
        `);
        
        console.log(`📋 Found ${menuItems.length} total menu items in database`);
        
        if (menuItems.length === 0) {
            console.log('❌ No menu items found - API would return useStaticPermissions: true');
            return;
        }
        
        // Get permissions for this user's role
        const [permissions] = await promisePool.execute(`
            SELECT rmp.menu_item_id, rmp.is_visible, mi.menu_key, mi.title, mi.path
            FROM role_menu_permissions rmp
            JOIN menu_items mi ON rmp.menu_item_id = mi.id
            WHERE rmp.role = ?
            AND rmp.is_visible = TRUE
        `, [user.role]);
        
        console.log(`🔑 Found ${permissions.length} visible permissions for role "${user.role}"`);
        
        // Build menu permissions response (same logic as API)
        const visibleMenuKeys = new Set(permissions.map(p => p.menu_key));
        
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
        
        // Build API response
        const apiResponse = {
            success: true,
            menuPermissions,
            userRole: user.role,
            hasSocialAccess,
            socialPermissions: socialPermissions.map(p => p.menu_key),
            useStaticPermissions: false
        };
        
        console.log('\n📊 API Response:');
        console.log('================');
        console.log(`✅ success: ${apiResponse.success}`);
        console.log(`👤 userRole: ${apiResponse.userRole}`);
        console.log(`📱 hasSocialAccess: ${apiResponse.hasSocialAccess}`);
        console.log(`🔧 useStaticPermissions: ${apiResponse.useStaticPermissions}`);
        console.log(`📋 menuPermissions: ${apiResponse.menuPermissions.length} items`);
        console.log(`📱 socialPermissions: [${apiResponse.socialPermissions.join(', ')}]`);
        
        // List all social permissions
        console.log('\n📱 Social Menu Items:');
        const socialItems = menuPermissions.filter(item => item.menu_key.startsWith('social'));
        if (socialItems.length === 0) {
            console.log('   ❌ No social menu items found in database');
        } else {
            socialItems.forEach(item => {
                const status = item.is_visible ? '✅ VISIBLE' : '❌ HIDDEN';
                console.log(`   ${status} ${item.title} (${item.menu_key}) → ${item.path || 'No path'}`);
            });
        }
        
        // Test frontend logic
        console.log('\n🖥️ Frontend Impact:');
        console.log('==================');
        console.log(`useDynamicMenuPermissions.hasSocialAccess: ${hasSocialAccess}`);
        console.log(`useDynamicMenuPermissions.isSocialEnabled(): ${hasSocialAccess}`);
        console.log(`useDynamicMenuPermissions.useStaticPermissions: false`);
        
        if (hasSocialAccess) {
            console.log('✅ Social menu items will be added to navigation');
            console.log('   Expected items: Blog, Friends, Chat, Notifications');
        } else {
            console.log('❌ Social menu items will NOT appear in navigation');
        }
        
        // Test what the menu filtering would do
        console.log('\n🔍 Menu Filtering Test:');
        console.log('======================');
        
        const socialMenuTitles = ['Blog', 'Friends', 'Chat', 'Notifications'];
        socialMenuTitles.forEach(title => {
            const href = `/social/${title.toLowerCase()}`;
            console.log(`${title} (${href}): ${hasSocialAccess ? 'VISIBLE' : 'HIDDEN'}`);
        });
        
        // Summary
        console.log('\n📋 Test Summary:');
        console.log('================');
        
        if (menuItems.length === 0) {
            console.log('❌ ISSUE: No menu items in database');
            console.log('   🔧 FIX: Run social setup scripts to create menu items');
        } else {
            console.log('✅ Menu items exist in database');
        }
        
        if (permissions.length === 0) {
            console.log('❌ ISSUE: No permissions for user role');
            console.log('   🔧 FIX: Grant permissions via Admin UI or scripts');
        } else {
            console.log(`✅ ${permissions.length} permissions granted to role`);
        }
        
        if (socialPermissions.length === 0) {
            console.log('❌ ISSUE: No social permissions for user role');
            console.log('   🔧 FIX: Enable social features via Admin → User Management');
        } else {
            console.log(`✅ ${socialPermissions.length} social permissions granted`);
        }
        
        console.log('\n🚀 Next Steps:');
        if (hasSocialAccess) {
            console.log('1. ✅ API is working correctly');
            console.log('2. ✅ Social permissions are enabled');
            console.log('3. 🔄 Restart frontend development server');
            console.log('4. 🔍 Check browser console for social menu logs');
            console.log('5. 👀 Look for "💬 Social Experience" in sidebar');
        } else {
            console.log('1. ❌ Social permissions need to be enabled');
            console.log('2. 🔧 Run: node debug/quick-enable-social-frjames.js');
            console.log('3. 🔄 Restart server to load new API routes');
            console.log('4. 🔄 Restart frontend development server');
            console.log('5. 🔍 Test again');
        }
        
    } catch (error) {
        console.error('❌ Error testing menu API:', error.message);
        console.error(error.stack);
    } finally {
        await close();
    }
}

testMenuApiForFrjames(); 