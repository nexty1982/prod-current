#!/usr/bin/env node
// Fix frjames@ssppoc.org church assignment and role
const { promisePool } = require('../../config/db');

async function fixFrjamesAssignment() {
    console.log('🔧 Fixing frjames@ssppoc.org church assignment and role...\n');
    
    try {
        // Get current user details
        const [users] = await promisePool.execute(
            'SELECT id, email, role, church_id, first_name, last_name, is_active FROM users WHERE email = ?',
            ['frjames@ssppoc.org']
        );
        
        if (users.length === 0) {
            console.log('❌ User frjames@ssppoc.org not found in database');
            return;
        }
        
        const user = users[0];
        console.log('👤 Current user details:');
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Church ID: ${user.church_id || 'Not assigned'}`);
        console.log(`   Is Active: ${user.is_active}`);
        
        // Get available churches
        const [churches] = await promisePool.execute(
            'SELECT id, name, database_name, is_active FROM churches WHERE is_active = 1 ORDER BY id'
        );
        
        console.log('\n🏛️ Available churches:');
        if (churches.length === 0) {
            console.log('   ❌ No active churches found');
            console.log('   💡 Creating Saints Peter and Paul Orthodox Church...');
            
            // Create the church if it doesn't exist
            const [result] = await promisePool.execute(`
                INSERT INTO churches (
                    name, email, phone, address, city, state_province, postal_code, country,
                    website, preferred_language, timezone, currency, database_name, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                'Saints Peter and Paul Orthodox Church',
                'frjames@ssppoc.org',
                '(555) 123-4567',
                '123 Orthodox Way',
                'Potomac',
                'MD',
                '20854',
                'USA',
                'https://ssppoc.org',
                'en',
                'America/New_York',
                'USD',
                'ssppoc_records_db',
                true
            ]);
            
            const churchId = result.insertId;
            console.log(`   ✅ Created church with ID: ${churchId}`);
            
            // Assign user to this church
            await promisePool.execute(
                'UPDATE users SET church_id = ? WHERE email = ?',
                [churchId, 'frjames@ssppoc.org']
            );
            console.log(`   ✅ Assigned user to church ID: ${churchId}`);
            
        } else {
            churches.forEach(church => {
                console.log(`   ${church.id}. ${church.name} (DB: ${church.database_name})`);
            });
            
            // Find Saints Peter and Paul church or use the first one
            let targetChurch = churches.find(c => 
                c.name.toLowerCase().includes('saints') && 
                c.name.toLowerCase().includes('peter') && 
                c.name.toLowerCase().includes('paul')
            );
            
            if (!targetChurch) {
                targetChurch = churches[0];
                console.log(`\n💡 No Saints Peter and Paul church found, using: ${targetChurch.name}`);
            } else {
                console.log(`\n✅ Found Saints Peter and Paul church: ${targetChurch.name}`);
            }
            
            // Update user's church assignment
            await promisePool.execute(
                'UPDATE users SET church_id = ? WHERE email = ?',
                [targetChurch.id, 'frjames@ssppoc.org']
            );
            console.log(`   ✅ Assigned user to church ID: ${targetChurch.id}`);
        }
        
        // Ensure user has admin role (not super_admin)
        if (user.role === 'super_admin') {
            console.log('\n🔧 Changing role from super_admin to admin...');
            await promisePool.execute(
                'UPDATE users SET role = ? WHERE email = ?',
                ['admin', 'frjames@ssppoc.org']
            );
            console.log('   ✅ Changed role to admin');
        }
        
        // Verify the changes
        console.log('\n✅ Verifying changes...');
        const [updatedUsers] = await promisePool.execute(
            'SELECT role, church_id FROM users WHERE email = ?',
            ['frjames@ssppoc.org']
        );
        
        const updatedUser = updatedUsers[0];
        console.log(`   Updated role: ${updatedUser.role}`);
        console.log(`   Updated church_id: ${updatedUser.church_id}`);
        
        // Get church name
        if (updatedUser.church_id) {
            const [assignedChurches] = await promisePool.execute(
                'SELECT name, database_name FROM churches WHERE id = ?',
                [updatedUser.church_id]
            );
            
            if (assignedChurches.length > 0) {
                const church = assignedChurches[0];
                console.log(`   Church name: ${church.name}`);
                console.log(`   Church database: ${church.database_name}`);
                console.log(`   Expected Records Management URL: /${updatedUser.church_id}-records`);
            }
        }
        
        console.log('\n🎉 Fix completed!');
        console.log('\n📋 Expected behavior after fix:');
        console.log('   1. frjames@ssppoc.org logs in');
        console.log('   2. SmartRedirect sees role is "admin" (not super_admin)');
        console.log('   3. SmartRedirect sees user has church_id assigned');
        console.log('   4. Redirects to /{church_id}-records (church records page)');
        console.log('   5. Can access Records Management without permission errors');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await promisePool.end();
    }
}

fixFrjamesAssignment(); 