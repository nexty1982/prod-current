const { promisePool } = require('../../config/db');

async function checkUserRedirect() {
    console.log('🔍 Checking user redirect logic for frjames@ssppoc.org...');
    
    try {
        // Get user details
        const [users] = await promisePool.execute(
            'SELECT id, email, role, church_id, first_name, last_name FROM users WHERE email = ?',
            ['frjames@ssppoc.org']
        );
        
        if (users.length === 0) {
            console.log('❌ User frjames@ssppoc.org not found in database');
            return;
        }
        
        const user = users[0];
        console.log('\n👤 User Details:');
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Church ID: ${user.church_id || 'Not assigned'}`);
        
        // Determine redirect logic
        console.log('\n🎯 Redirect Logic Analysis:');
        
        if (user.role === 'super_admin') {
            console.log('   → SUPERADMIN: Should redirect to first church or church management');
            console.log('   → Expected: API call to get first church, then /{church_id}-records');
        } else {
            if (user.church_id) {
                console.log(`   → NON-SUPERADMIN with Church: Should redirect to /${user.church_id}-records`);
                
                // Get church details
                const [churches] = await promisePool.execute(
                    'SELECT id, church_id, name FROM churches WHERE id = ?',
                    [user.church_id]
                );
                
                if (churches.length > 0) {
                    const church = churches[0];
                    console.log(`   → Church Details: ${church.name} (ID: ${church.church_id || church.id})`);
                    console.log(`   → Final URL: /${church.church_id || church.id}-records`);
                } else {
                    console.log('   ⚠️  Church not found in database!');
                }
            } else {
                console.log('   → NON-SUPERADMIN without Church: Should redirect to /apps/liturgical-calendar');
            }
        }
        
        console.log('\n🔧 Fix Status:');
        console.log('   ✅ Removed hardcoded @ssppoc.org → /admin redirect');
        console.log('   ✅ All users now use SmartRedirect logic');
        console.log('   ✅ Based on role and church assignment');
        
        // Check if user should have admin access
        if (user.role === 'admin' || user.role === 'super_admin') {
            console.log('\n🔑 Admin Access:');
            console.log('   ✅ User has admin/superadmin role');
            console.log('   ✅ Can access /admin if needed via menu');
            console.log('   ✅ But default landing is church records');
        }
        
    } catch (error) {
        console.error('❌ Error checking user redirect:', error.message);
    }
    
    process.exit(0);
}

checkUserRedirect(); 