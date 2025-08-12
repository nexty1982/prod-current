const path = require('path');
const bcrypt = require('bcrypt');
const DatabaseService = require('../services/databaseService');

/**
 * Complete Session Management Setup Script
 * Creates users and session data for testing the Session Management Interface
 */

async function setupCompleteSessionData() {
    console.log('🚀 COMPLETE SESSION MANAGEMENT SETUP');
    console.log('========================================');

    try {
        // Step 1: Ensure we have test users
        console.log('\n📋 Step 1: Setting up test users...');
        
        const testUsers = [
            { 
                email: 'test@orthodoxmetrics.com', 
                role: 'admin', 
                password: 'TestPassword123!',
                first_name: 'Test',
                last_name: 'Administrator'
            },
            { 
                email: 'testuser@orthodoxmetrics.com', 
                role: 'user', 
                password: 'UserPassword123!',
                first_name: 'Test',
                last_name: 'User'
            },
            { 
                email: 'testviewer@orthodoxmetrics.com', 
                role: 'viewer', 
                password: 'ViewerPassword123!',
                first_name: 'Test',
                last_name: 'Viewer'
            }
        ];

        const createdUsers = [];

        for (const testUser of testUsers) {
            // Check if user exists
            const existingResult = await DatabaseService.queryPlatform(
                'SELECT id, email, role FROM users WHERE email = ?', 
                [testUser.email]
            );
            const existingData = existingResult[0];
            
            if (existingData.length > 0) {
                const user = existingData[0];
                console.log(`   ✅ User ${user.email} already exists (ID: ${user.id})`);
                createdUsers.push(user);
            } else {
                // Create new user
                const hashedPassword = await bcrypt.hash(testUser.password, 10);
                await DatabaseService.queryPlatform(
                    'INSERT INTO users (email, password_hash, first_name, last_name, role, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                    [testUser.email, hashedPassword, testUser.first_name, testUser.last_name, testUser.role]
                );
                
                // Get the created user
                const newUserResult = await DatabaseService.queryPlatform(
                    'SELECT id, email, role FROM users WHERE email = ?', 
                    [testUser.email]
                );
                const newUserData = newUserResult[0];
                const user = newUserData[0];
                
                console.log(`   ✅ Created user ${user.email} (ID: ${user.id}, Role: ${user.role})`);
                createdUsers.push(user);
            }
        }

        // Step 2: Create realistic session activities
        console.log('\n📊 Step 2: Creating realistic session activities...');
        
        const activities = [
            'login', 'logout', 'view_page', 'edit_record', 'delete_record', 
            'upload_file', 'download_file', 'search', 'export_data'
        ];
        
        const ipAddresses = [
            '192.168.1.100', '192.168.1.101', '10.0.0.50', '172.16.0.10', 
            '203.0.113.45', '198.51.100.23', '127.0.0.1'
        ];
        
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (Version/17.0 Mobile/15E148 Safari/604.1)',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
        ];

        let totalActivities = 0;

        // Create activities for each user over the past week
        for (const user of createdUsers) {
            const numActivities = Math.floor(Math.random() * 15) + 5; // 5-20 activities per user
            
            for (let i = 0; i < numActivities; i++) {
                const activity = activities[Math.floor(Math.random() * activities.length)];
                const ip = ipAddresses[Math.floor(Math.random() * ipAddresses.length)];
                const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
                
                // Random time in the past week
                const hoursAgo = Math.floor(Math.random() * 168); // 0-168 hours (1 week)
                
                await DatabaseService.queryPlatform(
                    `INSERT INTO activity_log (user_id, action, ip_address, user_agent, changes, created_at) 
                     VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))`,
                    [
                        user.id, 
                        activity, 
                        ip, 
                        userAgent, 
                        `${activity} action by ${user.email}`,
                        hoursAgo
                    ]
                );
                
                totalActivities++;
            }
            
            console.log(`   ✅ Created ${numActivities} activities for ${user.email}`);
        }

        // Step 3: Verify the setup
        console.log('\n🔍 Step 3: Verifying session data setup...');
        
        // Count total activities
        const totalResult = await DatabaseService.queryPlatform(
            'SELECT COUNT(*) as total FROM activity_log'
        );
        const totalData = totalResult[0];
        console.log(`   ✅ Total activities in database: ${totalData[0].total}`);

        // Count login activities specifically
        const loginResult = await DatabaseService.queryPlatform(
            'SELECT COUNT(*) as total FROM activity_log WHERE action = ?',
            ['login']
        );
        const loginData = loginResult[0];
        console.log(`   ✅ Login activities: ${loginData[0].total}`);

        // Get session summary by user
        console.log('\n📈 Session Summary by User:');
        const summaryResult = await DatabaseService.queryPlatform(
            `SELECT u.email, u.role, COUNT(al.id) as activity_count,
                    MAX(al.created_at) as last_activity
             FROM users u 
             LEFT JOIN activity_log al ON u.id = al.user_id 
             GROUP BY u.id, u.email, u.role 
             ORDER BY activity_count DESC`
        );
        const summaryData = summaryResult[0];
        
        summaryData.forEach((summary, index) => {
            console.log(`   ${index + 1}. ${summary.email} (${summary.role}): ${summary.activity_count} activities, last: ${summary.last_activity || 'never'}`);
        });

        // Step 4: Test the session management query
        console.log('\n🧪 Step 4: Testing session management query...');
        
        const sessionQuery = `
            SELECT 
                u.id as user_id,
                u.email,
                u.role,
                al.action,
                al.ip_address,
                al.user_agent,
                al.created_at,
                al.changes
            FROM activity_log al
            JOIN users u ON al.user_id = u.id
            WHERE al.action IN ('login', 'logout')
            ORDER BY al.created_at DESC
            LIMIT 20
        `;
        
        const sessionResult = await DatabaseService.queryPlatform(sessionQuery);
        const sessionData = sessionResult[0];
        
        console.log(`   ✅ Session query returned ${sessionData.length} results`);
        console.log('   Sample session data:');
        
        sessionData.slice(0, 5).forEach((session, index) => {
            console.log(`      ${index + 1}. ${session.email} - ${session.action} from ${session.ip_address} at ${session.created_at}`);
        });

        console.log('\n🎉 COMPLETE SESSION MANAGEMENT SETUP FINISHED!');
        console.log(`✅ Created ${totalActivities} new activity log entries`);
        console.log('✅ The Session Management Interface should now show proper data');
        console.log('✅ Users can log in and their activities will be tracked');
        
        return true;

    } catch (error) {
        console.error('❌ Error during complete session setup:', error);
        return false;
    }
}

// Run the complete setup
setupCompleteSessionData()
    .then((success) => {
        if (success) {
            console.log('\n🚀 Session Management System is now fully set up!');
            console.log('Navigate to the Session Management page to see the results.');
            process.exit(0);
        } else {
            console.log('\n❌ Session management setup failed');
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
