#!/usr/bin/env node
// Show social menu items for superadmin@orthodoxmetrics.com
const { promisePool, testConnection, close } = require('../config/db-scripts');

async function showMySocialMenu() {
    console.log('🔍 Checking social menu for superadmin@orthodoxmetrics.com...\n');
    
    try {
        const connectionTest = await testConnection();
        if (!connectionTest.success) {
            console.log('❌ Cannot connect to database');
            return;
        }
        
        // Get your user details
        const [users] = await promisePool.execute(
            'SELECT id, email, role FROM users WHERE email = ?',
            ['superadmin@orthodoxmetrics.com']
        );
        
        if (users.length === 0) {
            console.log('❌ User superadmin@orthodoxmetrics.com not found');
            return;
        }
        
        const user = users[0];
        console.log(`👤 User: ${user.email} (ID: ${user.id}, Role: ${user.role})\n`);
        
        // Get all social menu items
        console.log('📱 Available social menu items in database:');
        const [allSocialItems] = await promisePool.execute(`
            SELECT id, menu_key, title, path, description, display_order
            FROM menu_items 
            WHERE menu_key LIKE 'social%'
            ORDER BY 
                CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END,
                display_order, 
                id
        `);
        
        if (allSocialItems.length === 0) {
            console.log('❌ No social menu items found in database!');
            return;
        }
        
        allSocialItems.forEach((item, index) => {
            const isParent = item.menu_key === 'social' ? '📁' : '  📄';
            console.log(`   ${index + 1}. ${isParent} ${item.title} (${item.menu_key})`);
            console.log(`        Path: ${item.path || 'No path'}`);
            console.log(`        Order: ${item.display_order}`);
        });
        
        // Get permissions for your role
        console.log(`\n🔑 Permissions for role "${user.role}":`);
        const [permissions] = await promisePool.execute(`
            SELECT rmp.menu_item_id, rmp.is_visible, mi.menu_key, mi.title, mi.path
            FROM role_menu_permissions rmp
            JOIN menu_items mi ON rmp.menu_item_id = mi.id
            WHERE rmp.role = ? AND mi.menu_key LIKE 'social%'
            ORDER BY mi.display_order, mi.id
        `, [user.role]);
        
        if (permissions.length === 0) {
            console.log('❌ No social permissions found for your role!');
            console.log('🔧 You need to enable social features first.');
            return;
        }
        
        permissions.forEach(perm => {
            const status = perm.is_visible ? '✅ VISIBLE' : '❌ HIDDEN';
            console.log(`   ${status} ${perm.title} → ${perm.path || 'No path'}`);
        });
        
        // Simulate what the API returns
        console.log('\n🌐 What the frontend API call returns:');
        const visiblePermissions = permissions.filter(p => p.is_visible);
        const hasSocialAccess = visiblePermissions.length > 0;
        
        console.log(`   hasSocialAccess: ${hasSocialAccess}`);
        console.log(`   socialPermissions: [${visiblePermissions.map(p => p.menu_key).join(', ')}]`);
        console.log(`   useStaticPermissions: false`);
        
        // Show what should appear in frontend
        console.log('\n🖥️ What should appear in your sidebar:');
        if (hasSocialAccess) {
            console.log('   💬 Social Experience');
            
            // List items in display order
            const socialItems = visiblePermissions
                .filter(p => p.menu_key !== 'social') // Exclude parent item
                .sort((a, b) => {
                    // Custom sort order for social items
                    const order = {
                        'social.blog': 1,
                        'social.friends': 2, 
                        'social.chat': 3,
                        'social.notifications': 4
                    };
                    return (order[a.menu_key] || 99) - (order[b.menu_key] || 99);
                });
            
            socialItems.forEach(item => {
                const icon = getIcon(item.menu_key);
                console.log(`     ${icon} ${item.title}`);
            });
            
            if (socialItems.length === 0) {
                console.log('     ❌ No social items would be visible (only parent menu exists)');
            }
            
        } else {
            console.log('   ❌ Social menu section would NOT appear');
        }
        
        // Check for specific blog issue
        console.log('\n🔍 Blog-specific diagnosis:');
        const blogItem = allSocialItems.find(item => item.menu_key === 'social.blog');
        const blogPermission = permissions.find(p => p.menu_key === 'social.blog');
        
        if (!blogItem) {
            console.log('   ❌ Blog menu item does not exist in database');
            console.log('   🔧 Run: node debug/fix-blog-social-menu.js');
        } else if (!blogPermission) {
            console.log(`   ❌ Blog permission does not exist for role "${user.role}"`);
            console.log('   🔧 Run: node debug/fix-blog-social-menu.js');
        } else if (!blogPermission.is_visible) {
            console.log(`   ❌ Blog permission exists but is disabled for role "${user.role}"`);
            console.log('   🔧 Run: node debug/fix-blog-social-menu.js');
        } else {
            console.log('   ✅ Blog is properly configured and should be visible');
        }
        
        console.log('\n📋 Summary:');
        console.log(`   • Total social items in DB: ${allSocialItems.length}`);
        console.log(`   • Permissions for your role: ${permissions.length}`);
        console.log(`   • Visible permissions: ${visiblePermissions.length}`);
        console.log(`   • Social access enabled: ${hasSocialAccess ? 'YES' : 'NO'}`);
        
        if (hasSocialAccess) {
            console.log('\n🎉 Social menu should be working!');
            console.log('   If you don\'t see the Blog item, refresh your browser page.');
        }
        
    } catch (error) {
        console.error('❌ Error checking social menu:', error.message);
    } finally {
        await close();
    }
}

function getIcon(menuKey) {
    switch (menuKey) {
        case 'social.blog': return '📝';
        case 'social.friends': return '👥';
        case 'social.chat': return '💬';
        case 'social.notifications': return '🔔';
        default: return '📄';
    }
}

showMySocialMenu(); 