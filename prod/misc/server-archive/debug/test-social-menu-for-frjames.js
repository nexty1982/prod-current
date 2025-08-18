#!/usr/bin/env node
// Test social menu permissions for frjames@ssppoc.org
const { promisePool, testConnection, close } = require('../config/db-scripts');

async function testSocialMenuForFrjames() {
    console.log('🔍 Testing social menu permissions for frjames@ssppoc.org...\n');
    
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
        console.log(`👤 Found user: ${user.email} (ID: ${user.id}, Role: ${user.role})\n`);
        
        // Test 1: Check if social menu items exist
        console.log('1️⃣ Checking social menu items...');
        const [socialMenuItems] = await promisePool.execute(`
            SELECT id, menu_key, title, path, description
            FROM menu_items 
            WHERE menu_key LIKE 'social%'
            ORDER BY parent_id, display_order
        `);
        
        if (socialMenuItems.length === 0) {
            console.log('❌ No social menu items found in database!');
            console.log('💡 This explains why social menu doesn\'t appear.');
            console.log('🔧 Run the social permissions script first to create menu items.');
            return;
        }
        
        console.log(`✅ Found ${socialMenuItems.length} social menu items:`);
        socialMenuItems.forEach(item => {
            console.log(`   - ${item.title} (${item.menu_key}) → ${item.path || 'No path'}`);
        });
        
        // Test 2: Check role permissions for frjames's role
        console.log(`\n2️⃣ Checking role permissions for "${user.role}"...`);
        const [rolePermissions] = await promisePool.execute(`
            SELECT rmp.menu_item_id, rmp.is_visible, mi.menu_key, mi.title, mi.path
            FROM role_menu_permissions rmp
            JOIN menu_items mi ON rmp.menu_item_id = mi.id
            WHERE rmp.role = ? AND mi.menu_key LIKE 'social%'
            ORDER BY mi.display_order
        `, [user.role]);
        
        if (rolePermissions.length === 0) {
            console.log(`❌ No social permissions found for role "${user.role}"`);
            console.log('💡 This explains why social menu doesn\'t appear.');
            console.log('🔧 Need to grant social permissions to this role.');
        } else {
            console.log(`✅ Found ${rolePermissions.length} social permissions for role "${user.role}":`);
            rolePermissions.forEach(perm => {
                const status = perm.is_visible ? '✅ VISIBLE' : '❌ HIDDEN';
                console.log(`   ${status} ${perm.title} (${perm.menu_key})`);
            });
        }
        
        // Test 3: Simulate the API call that frontend makes
        console.log('\n3️⃣ Simulating frontend API call...');
        
        // Get all menu items
        const [allMenuItems] = await promisePool.execute(`
            SELECT id, menu_key, title, path, icon, parent_id, display_order, description
            FROM menu_items
            ORDER BY parent_id, display_order
        `);
        
        // Get permissions for this user's role
        const [permissions] = await promisePool.execute(`
            SELECT rmp.menu_item_id, rmp.is_visible, mi.menu_key, mi.title, mi.path
            FROM role_menu_permissions rmp
            JOIN menu_items mi ON rmp.menu_item_id = mi.id
            WHERE rmp.role = ?
            AND rmp.is_visible = TRUE
        `, [user.role]);
        
        // Build menu permissions response (same logic as API)
        const visibleMenuKeys = new Set(permissions.map(p => p.menu_key));
        const socialPermissions = permissions.filter(p => p.menu_key.startsWith('social'));
        const hasSocialAccess = socialPermissions.length > 0;
        
        console.log(`📊 API Response Simulation:`);
        console.log(`   Total menu items: ${allMenuItems.length}`);
        console.log(`   Visible for ${user.role}: ${permissions.length}`);
        console.log(`   Social access: ${hasSocialAccess ? 'ENABLED' : 'DISABLED'}`);
        console.log(`   Social permissions: ${socialPermissions.map(p => p.menu_key).join(', ')}`);
        
        // Test 4: Check frontend menu filtering logic
        console.log('\n4️⃣ Testing frontend menu filtering...');
        
        const socialMenuTitles = ['Blog', 'Friends', 'Chat', 'Notifications'];
        const socialMenuPaths = ['/social/blog', '/social/friends', '/social/chat', '/social/notifications'];
        
        console.log('   Frontend isSocialEnabled() would return:', hasSocialAccess);
        console.log('   Social menu items would be:', hasSocialAccess ? 'VISIBLE' : 'HIDDEN');
        
        if (hasSocialAccess) {
            console.log('   ✅ Expected social menu items in navigation:');
            socialMenuTitles.forEach((title, index) => {
                console.log(`      - ${title} → ${socialMenuPaths[index]}`);
            });
        }
        
        // Test 5: Troubleshooting
        console.log('\n🔧 Troubleshooting Summary:');
        console.log('=====================================');
        
        if (socialMenuItems.length === 0) {
            console.log('❌ ISSUE: No social menu items in database');
            console.log('   🔧 FIX: Run social permissions setup script');
        } else {
            console.log('✅ Social menu items exist in database');
        }
        
        if (rolePermissions.length === 0) {
            console.log('❌ ISSUE: No social permissions for user role');
            console.log('   🔧 FIX: Grant social permissions via Admin UI or script');
        } else {
            const visibleCount = rolePermissions.filter(p => p.is_visible).length;
            if (visibleCount === 0) {
                console.log('❌ ISSUE: Social permissions exist but all are disabled');
                console.log('   🔧 FIX: Enable social permissions via Admin UI');
            } else {
                console.log(`✅ ${visibleCount} social permissions enabled for role`);
            }
        }
        
        if (hasSocialAccess) {
            console.log('✅ All permissions are correctly configured!');
            console.log('\n🚀 Expected Result:');
            console.log('   1. Login as frjames@ssppoc.org');
            console.log('   2. Look for "💬 Social Experience" section in sidebar');
            console.log('   3. Should see: Blog, Friends, Chat, Notifications');
            console.log('   4. If not visible, check browser console for errors');
        } else {
            console.log('\n❌ Social menu will NOT appear for this user');
            console.log('🔧 Next Steps:');
            console.log('   1. Enable social features via Admin → User Management');
            console.log('   2. Or run: node debug/quick-enable-social-frjames.js');
            console.log('   3. Restart frontend and try again');
        }
        
    } catch (error) {
        console.error('❌ Error testing social menu:', error.message);
    } finally {
        await close();
    }
}

testSocialMenuForFrjames(); 