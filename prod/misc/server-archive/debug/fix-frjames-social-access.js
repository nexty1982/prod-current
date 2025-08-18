const { promisePool } = require('../../config/db');

async function fixFrJamesSocialAccess() {
    
    try {
        console.log('🔧 Fixing Fr. James social access...');
        
        // Find Fr. James
        const [users] = await promisePool.execute(
            'SELECT id, email, role FROM users WHERE email = ?',
            ['frjames@ssppoc.org']
        );
        
        if (users.length === 0) {
            console.log('❌ Fr. James not found');
            return;
        }
        
        const frJames = users[0];
        console.log(`👤 Found Fr. James: ID ${frJames.id}, Role: ${frJames.role}`);
        
        // Get social menu items
        const [socialMenus] = await promisePool.execute(`
            SELECT id, menu_key, title FROM menu_items 
            WHERE menu_key LIKE 'social%'
            ORDER BY menu_key
        `);
        
        console.log(`📋 Found ${socialMenus.length} social menu items`);
        
        // Enable social menu permissions for his role
        for (const menu of socialMenus) {
            // Check if permission already exists
            const [existing] = await promisePool.execute(
                'SELECT id FROM role_menu_permissions WHERE role = ? AND menu_item_id = ?',
                [frJames.role, menu.id]
            );
            
            if (existing.length === 0) {
                // Insert new permission
                await promisePool.execute(
                    'INSERT INTO role_menu_permissions (role, menu_item_id, is_visible) VALUES (?, ?, 1)',
                    [frJames.role, menu.id]
                );
                console.log(`✅ Added permission: ${menu.menu_key} for role ${frJames.role}`);
            } else {
                // Update existing permission
                await promisePool.execute(
                    'UPDATE role_menu_permissions SET is_visible = 1 WHERE role = ? AND menu_item_id = ?',
                    [frJames.role, menu.id]
                );
                console.log(`✅ Updated permission: ${menu.menu_key} for role ${frJames.role}`);
            }
        }
        
        // Ensure user profile exists
        const [profiles] = await promisePool.execute(
            'SELECT id FROM user_profiles WHERE user_id = ?',
            [frJames.id]
        );
        
        if (profiles.length === 0) {
            await promisePool.execute(`
                INSERT INTO user_profiles (user_id, display_name, is_online, created_at, updated_at)
                VALUES (?, 'Fr. James Parsells', 0, NOW(), NOW())
            `, [frJames.id]);
            console.log('✅ Created user profile for Fr. James');
        }
        
        console.log('🎉 Fr. James social access fixed successfully!');
        console.log('📝 Please refresh your browser to see the social menu');
        
    } catch (error) {
        console.error('❌ Error fixing Fr. James social access:', error);
    }
}

// Run if called directly
if (require.main === module) {
    fixFrJamesSocialAccess().catch(console.error);
}

module.exports = { fixFrJamesSocialAccess }; 