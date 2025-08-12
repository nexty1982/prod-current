const path = require('path');
const DatabaseService = require('../services/databaseService');

/**
 * Fixed Database Access Script
 * Now properly accessing the data from DatabaseService.queryPlatform results
 */

async function fixDatabaseAccess() {
    console.log('🔧 FIXING DATABASE ACCESS PATTERN');
    console.log('========================================');

    try {
        // Test 1: Get user count with correct access pattern
        console.log('\n1. Testing corrected user count access...');
        const countResult = await DatabaseService.queryPlatform('SELECT COUNT(*) as total FROM users');
        const countData = countResult[0]; // First element contains the data rows
        const userCount = countData[0].total; // First row, total column
        console.log(`✅ User count: ${userCount}`);

        // Test 2: Get all users with correct access pattern
        console.log('\n2. Testing corrected users access...');
        const usersResult = await DatabaseService.queryPlatform('SELECT id, email, role FROM users');
        const usersData = usersResult[0]; // First element contains the data rows
        console.log(`✅ Found ${usersData.length} users:`);
        
        usersData.forEach((user, index) => {
            console.log(`   User ${index + 1}: ID=${user.id}, Email=${user.email}, Role=${user.role}`);
        });

        // Test 3: Check if specific user exists
        console.log('\n3. Testing specific user lookup...');
        const testEmail = 'test@orthodoxmetrics.com';
        const userResult = await DatabaseService.queryPlatform(
            'SELECT id, email, role FROM users WHERE email = ?', 
            [testEmail]
        );
        const userData = userResult[0]; // First element contains the data rows
        
        if (userData.length > 0) {
            const user = userData[0];
            console.log(`✅ User found: ID=${user.id}, Email=${user.email}, Role=${user.role}`);
        } else {
            console.log(`❌ User ${testEmail} not found`);
        }

        // Test 4: Check activity_log entries
        console.log('\n4. Testing activity_log access...');
        const activityResult = await DatabaseService.queryPlatform(
            'SELECT COUNT(*) as total FROM activity_log WHERE action = ?', 
            ['login']
        );
        const activityData = activityResult[0]; // First element contains the data rows
        const loginCount = activityData[0].total;
        console.log(`✅ Login activities count: ${loginCount}`);

        // Test 5: Get recent login activities
        console.log('\n5. Testing recent login activities...');
        const recentResult = await DatabaseService.queryPlatform(
            'SELECT user_id, ip_address, created_at FROM activity_log WHERE action = ? ORDER BY created_at DESC LIMIT 5', 
            ['login']
        );
        const recentData = recentResult[0]; // First element contains the data rows
        console.log(`✅ Recent login activities (${recentData.length}):`);
        
        recentData.forEach((activity, index) => {
            console.log(`   Activity ${index + 1}: User=${activity.user_id}, IP=${activity.ip_address}, Time=${activity.created_at}`);
        });

        console.log('\n🎉 DATABASE ACCESS PATTERN FIXED!');
        console.log('The correct pattern is: result[0] contains data rows, result[1] contains metadata');
        
        return true;

    } catch (error) {
        console.error('❌ Error during database access test:', error);
        return false;
    }
}

// Run the fix
fixDatabaseAccess()
    .then((success) => {
        if (success) {
            console.log('\n✅ Database access pattern validated successfully');
            process.exit(0);
        } else {
            console.log('\n❌ Database access pattern validation failed');
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
