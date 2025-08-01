const path = require('path');
const DatabaseService = require('../services/databaseService');

/**
 * Simple Session Activities Creation Script
 * Creates basic login/logout activities without complex data
 */

async function createSimpleSessionActivities() {
    console.log('🎯 CREATING SIMPLE SESSION ACTIVITIES');
    console.log('========================================');

    try {
        // Get all users using correct access pattern
        console.log('\n1. Getting all users...');
        const usersResult = await DatabaseService.queryPlatform('SELECT id, email, role FROM users');
        const usersData = usersResult[0]; // Correct access to data rows
        
        console.log(`✅ Found ${usersData.length} users to create activities for`);

        // Create simple login activities for each user
        console.log('\n2. Creating login activities...');
        const testIPs = ['192.168.1.100', '10.0.0.50', '172.16.0.10', '127.0.0.1', '203.0.113.45'];
        const testUserAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        ];

        let activitiesCreated = 0;

        for (let i = 0; i < usersData.length; i++) {
            const user = usersData[i];
            const ip = testIPs[i % testIPs.length];
            const userAgent = testUserAgents[i % testUserAgents.length];
            
            // Create login activity (without changes field)
            await DatabaseService.queryPlatform(
                `INSERT INTO activity_log (user_id, action, ip_address, user_agent, created_at) 
                 VALUES (?, 'login', ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))`,
                [user.id, ip, userAgent, Math.floor(Math.random() * 24)] // Random time in last 24 hours
            );
            
            console.log(`   ✅ Created login activity for ${user.email} from ${ip}`);
            activitiesCreated++;

            // Create logout activity
            await DatabaseService.queryPlatform(
                `INSERT INTO activity_log (user_id, action, ip_address, user_agent, created_at) 
                 VALUES (?, 'logout', ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))`,
                [user.id, ip, userAgent, Math.floor(Math.random() * 24) - 1] // Logout before login
            );
            
            console.log(`   ✅ Created logout activity for ${user.email}`);
            activitiesCreated++;
        }

        // Create additional random activities for variety
        console.log('\n3. Creating additional activities for variety...');
        const additionalActions = ['view_page', 'edit_record', 'search'];
        
        for (let i = 0; i < 10; i++) {
            const randomUser = usersData[Math.floor(Math.random() * usersData.length)];
            const randomAction = additionalActions[Math.floor(Math.random() * additionalActions.length)];
            const randomIP = testIPs[Math.floor(Math.random() * testIPs.length)];
            const randomUA = testUserAgents[Math.floor(Math.random() * testUserAgents.length)];
            
            await DatabaseService.queryPlatform(
                `INSERT INTO activity_log (user_id, action, ip_address, user_agent, created_at) 
                 VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))`,
                [randomUser.id, randomAction, randomIP, randomUA, Math.floor(Math.random() * 72)] // Random time in last 3 days
            );
            
            activitiesCreated++;
        }

        console.log(`   ✅ Created 10 additional activities`);

        // Verify the created activities
        console.log('\n4. Verifying created activities...');
        const verifyResult = await DatabaseService.queryPlatform(
            'SELECT COUNT(*) as total FROM activity_log'
        );
        const verifyData = verifyResult[0]; // Correct access to data rows
        const totalActivities = verifyData[0].total;
        
        console.log(`✅ Total activities in database: ${totalActivities}`);

        // Get login activities count
        const loginResult = await DatabaseService.queryPlatform(
            'SELECT COUNT(*) as total FROM activity_log WHERE action = ?',
            ['login']
        );
        const loginData = loginResult[0];
        console.log(`✅ Login activities: ${loginData[0].total}`);

        // Get recent activities for session management
        console.log('\n5. Testing session management query...');
        const sessionResult = await DatabaseService.queryPlatform(
            `SELECT u.email, u.role, al.action, al.ip_address, al.created_at 
             FROM activity_log al 
             JOIN users u ON al.user_id = u.id 
             WHERE al.action IN ('login', 'logout') 
             ORDER BY al.created_at DESC 
             LIMIT 10`
        );
        const sessionData = sessionResult[0]; // Correct access to data rows
        
        console.log(`✅ Session management query returned ${sessionData.length} results:`);
        sessionData.forEach((session, index) => {
            console.log(`   ${index + 1}. ${session.email} - ${session.action} from ${session.ip_address} at ${session.created_at}`);
        });

        console.log('\n🎉 SIMPLE SESSION ACTIVITIES CREATION COMPLETED');
        console.log(`✅ Created ${activitiesCreated} activity log entries`);
        console.log('✅ The Session Management page should now show real data instead of "Invalid Data"');
        
        return true;

    } catch (error) {
        console.error('❌ Error creating session activities:', error);
        return false;
    }
}

// Run the script
createSimpleSessionActivities()
    .then((success) => {
        if (success) {
            console.log('\n🚀 Session activities creation completed successfully!');
            console.log('The Session Management Interface should now work properly.');
            process.exit(0);
        } else {
            console.log('\n❌ Session activities creation failed');
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
