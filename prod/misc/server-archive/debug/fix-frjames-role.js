#!/usr/bin/env node
// Fix frjames@ssppoc.org role and church assignment
const { promisePool, testConnection, close } = require('../config/db-scripts');

async function fixFrjamesUser() {
    console.log('🔧 Fixing frjames@ssppoc.org User Settings...\n');
    
    try {
        // Test connection first
        const connectionTest = await testConnection();
        if (!connectionTest.success) {
            console.log('❌ Cannot connect to database. Please run test-db-connection.js first.');
            return;
        }
        
        // Get current user details
        console.log('1️⃣ Current user settings:');
        const [users] = await promisePool.execute(
            'SELECT id, email, role, church_id, first_name, last_name FROM users WHERE email = ?',
            ['frjames@ssppoc.org']
        );
        
        if (users.length === 0) {
            console.log('❌ User frjames@ssppoc.org not found in database');
            return;
        }
        
        const user = users[0];
        console.log(`   Current role: ${user.role}`);
        console.log(`   Current church_id: ${user.church_id || 'none'}`);
        
        // Check what needs to be fixed
        let needsRoleFix = false;
        let needsChurchFix = false;
        
        if (user.role === 'super_admin') {
            console.log('\n🎯 Issue found: User has super_admin role');
            console.log('   This causes redirect to admin/church management instead of church records');
            needsRoleFix = true;
        }
        
        if (!user.church_id) {
            console.log('\n🎯 Issue found: User has no church assignment');
            console.log('   This would cause redirect to liturgical calendar');
            needsChurchFix = true;
        }
        
        if (!needsRoleFix && !needsChurchFix) {
            console.log('\n✅ User settings look correct!');
            console.log('   Role is not super_admin and church is assigned');
            console.log('   The redirect issue might be elsewhere');
            return;
        }
        
        // Fix role if needed
        if (needsRoleFix) {
            console.log('\n2️⃣ Fixing user role...');
            await promisePool.execute(
                'UPDATE users SET role = ? WHERE email = ?',
                ['admin', 'frjames@ssppoc.org']
            );
            console.log('   ✅ Changed role from "super_admin" to "admin"');
        }
        
        // Fix church assignment if needed
        if (needsChurchFix) {
            console.log('\n3️⃣ Fixing church assignment...');
            
            // Get available churches
            const [churches] = await promisePool.execute(
                'SELECT id, church_id, name FROM churches WHERE is_active = 1 ORDER BY id LIMIT 5'
            );
            
            if (churches.length === 0) {
                console.log('   ❌ No active churches found in database');
                console.log('   Please create a church first or run church setup scripts');
            } else {
                console.log('   Available churches:');
                churches.forEach((church, index) => {
                    console.log(`     ${index + 1}. ${church.name} (ID: ${church.church_id || church.id})`);
                });
                
                // Assign to first church (usually SSPPOC or similar)
                const targetChurch = churches[0];
                await promisePool.execute(
                    'UPDATE users SET church_id = ? WHERE email = ?',
                    [targetChurch.id, 'frjames@ssppoc.org']
                );
                console.log(`   ✅ Assigned to church: ${targetChurch.name} (ID: ${targetChurch.id})`);
            }
        }
        
        // Verify changes
        console.log('\n4️⃣ Verifying changes...');
        const [updatedUsers] = await promisePool.execute(
            'SELECT role, church_id FROM users WHERE email = ?',
            ['frjames@ssppoc.org']
        );
        
        const updatedUser = updatedUsers[0];
        console.log(`   Updated role: ${updatedUser.role}`);
        console.log(`   Updated church_id: ${updatedUser.church_id || 'none'}`);
        
        // Get church name if assigned
        if (updatedUser.church_id) {
            const [assignedChurches] = await promisePool.execute(
                'SELECT name, church_id FROM churches WHERE id = ?',
                [updatedUser.church_id]
            );
            
            if (assignedChurches.length > 0) {
                const church = assignedChurches[0];
                console.log(`   Church name: ${church.name}`);
                console.log(`   Expected redirect: /${church.church_id || updatedUser.church_id}-records`);
            }
        }
        
        console.log('\n🎉 User fix completed!');
        console.log('\n📋 Expected behavior after fix:');
        console.log('   1. frjames@ssppoc.org logs in');
        console.log('   2. SmartRedirect sees role is NOT super_admin');
        console.log('   3. SmartRedirect sees user has church_id assigned');
        console.log('   4. Redirects to /{church_id}-records (church records page)');
        console.log('\n🧪 Test steps:');
        console.log('   1. Restart the server');
        console.log('   2. Login as frjames@ssppoc.org');
        console.log('   3. Should go to church records instead of admin');
        
    } catch (error) {
        console.error('❌ Error fixing user:', error.message);
    } finally {
        await close();
    }
}

fixFrjamesUser(); 