const path = require('path');
const DatabaseService = require('../services/databaseService');

/**
 * Fixed Session Test Data Creation Script
 * Using correct database access pattern for session management testing
 */

async function createSessionTestData() {
    console.log('📊 CREATING SESSION TEST DATA WITH FIXED DATABASE ACCESS');
    console.log('========================================');

    try {
        // Get all users using correct access pattern
        console.log('\n1. Getting all users...');
        const usersResult = await DatabaseService.queryPlatform('SELECT id, email, role FROM users');
        const usersData = usersResult[0]; // Correct access to data rows
        
        console.log(`✅ Found ${usersData.length} users:`);
        usersData.forEach((user, index) => {
            console.log(`   User ${index + 1}: ID=${user.id}, Email=${user.email}, Role=${user.role}`);
        });

        if (usersData.length === 0) {
            console.log('❌ No users found. Please create users first.');
            return false;
        }

        // Create test login activities for each user
        console.log('\n2. Creating test login activities...');
        const testIPs = ['192.168.1.100', '10.0.0.50', '172.16.0.10', '127.0.0.1'];
        const testUserAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
        ];

        let activitiesCreated = 0;

        for (let i = 0; i < usersData.length; i++) {
            const user = usersData[i];
            const ip = testIPs[i % testIPs.length];
            const userAgent = testUserAgents[i % testUserAgents.length];
            
            // Create login activity
            const activityResult = await DatabaseService.queryPlatform(
                `INSERT INTO activity_log (user_id, action, ip_address, user_agent, details, created_at) 
                 VALUES (?, 'login', ?, ?, ?, NOW())`,
                [user.id, ip, userAgent, `Test login for ${user.email}`]
            );
            
            console.log(`   ✅ Created login activity for user ${user.email} from IP ${ip}`);
            activitiesCreated++;

            // Create logout activity (1 minute later simulation)
            const logoutResult = await DatabaseService.queryPlatform(
                `INSERT INTO activity_log (user_id, action, ip_address, user_agent, details, created_at) 
                 VALUES (?, 'logout', ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 MINUTE))`,
                [user.id, ip, userAgent, `Test logout for ${user.email}`]
            );
            
            console.log(`   ✅ Created logout activity for user ${user.email}`);
            activitiesCreated++;
        }

        // Verify the created activities
        console.log('\n3. Verifying created activities...');
        const verifyResult = await DatabaseService.queryPlatform(
            'SELECT COUNT(*) as total FROM activity_log WHERE action IN (?, ?)',
            ['login', 'logout']
        );
        const verifyData = verifyResult[0]; // Correct access to data rows
        const totalActivities = verifyData[0].total;
        
        console.log(`✅ Total login/logout activities in database: ${totalActivities}`);

        // Get recent activities summary
        console.log('\n4. Recent activities summary...');
        const recentResult = await DatabaseService.queryPlatform(
            `SELECT al.user_id, u.email, al.action, al.ip_address, al.created_at 
             FROM activity_log al 
             JOIN users u ON al.user_id = u.id 
             WHERE al.action IN ('login', 'logout') 
             ORDER BY al.created_at DESC 
             LIMIT 10`
        );
        const recentData = recentResult[0]; // Correct access to data rows
        
        console.log(`✅ Recent activities (${recentData.length}):`);
        recentData.forEach((activity, index) => {
            console.log(`   ${index + 1}. ${activity.email} - ${activity.action} from ${activity.ip_address} at ${activity.created_at}`);
        });

        console.log('\n🎉 SESSION TEST DATA CREATION COMPLETED');
        console.log(`Created ${activitiesCreated} activity log entries`);
        console.log('The Session Management page should now show proper data instead of "Invalid Data"');
        
        return true;

    } catch (error) {
        console.error('❌ Error creating session test data:', error);
        return false;
    }
}

// Run the script
createSessionTestData()
    .then((success) => {
        if (success) {
            console.log('\n✅ Session test data creation completed successfully');
            console.log('You can now check the Session Management page - it should show real session data');
            process.exit(0);
        } else {
            console.log('\n❌ Session test data creation failed');
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
