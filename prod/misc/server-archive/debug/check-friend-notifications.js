const { promisePool } = require('../../config/db');

async function checkFriendNotifications() {
    
    try {
        console.log('🔔 Checking friend request notifications...');
        
        // Find Fr. James
        const [users] = await promisePool.execute(
            'SELECT id, email, first_name, last_name FROM users WHERE email = ?',
            ['frjames@ssppoc.org']
        );
        
        if (users.length === 0) {
            console.log('❌ Fr. James not found');
            return;
        }
        
        const frJames = users[0];
        console.log(`👤 Found Fr. James: ID ${frJames.id}`);
        
        // Check for friend requests sent TO Fr. James
        const [friendRequests] = await promisePool.execute(`
            SELECT 
                f.id,
                f.status,
                f.requested_at,
                u.first_name,
                u.last_name,
                u.email
            FROM friendships f
            JOIN users u ON u.id = f.requester_id
            WHERE f.addressee_id = ?
            ORDER BY f.requested_at DESC
        `, [frJames.id]);
        
        console.log(`📥 Friend requests TO Fr. James: ${friendRequests.length}`);
        friendRequests.forEach(req => {
            console.log(`  - From: ${req.first_name} ${req.last_name} (${req.email})`);
            console.log(`    Status: ${req.status}, Date: ${req.requested_at}`);
        });
        
        // Check for notifications for Fr. James
        const [notifications] = await promisePool.execute(`
            SELECT 
                id,
                type,
                title,
                message,
                is_read,
                created_at,
                data
            FROM notifications
            WHERE user_id = ?
            AND type IN ('friend_request', 'friend_accepted')
            ORDER BY created_at DESC
            LIMIT 10
        `, [frJames.id]);
        
        console.log(`🔔 Notifications for Fr. James: ${notifications.length}`);
        notifications.forEach(notif => {
            console.log(`  - Type: ${notif.type}`);
            console.log(`    Title: ${notif.title}`);
            console.log(`    Read: ${notif.is_read ? 'Yes' : 'No'}`);
            console.log(`    Date: ${notif.created_at}`);
            console.log(`    Data: ${notif.data}`);
            console.log('');
        });
        
        // Check if notification types exist
        const [notifTypes] = await promisePool.execute(`
            SELECT name, is_active FROM notification_types 
            WHERE name IN ('friend_request', 'friend_accepted')
        `);
        
        console.log(`📋 Notification types configured: ${notifTypes.length}`);
        notifTypes.forEach(type => {
            console.log(`  - ${type.name}: ${type.is_active ? 'Active' : 'Inactive'}`);
        });
        
        // Check if SendFriendRequest procedure exists
        const [procedures] = await promisePool.execute(`
            SELECT ROUTINE_NAME 
            FROM INFORMATION_SCHEMA.ROUTINES 
            WHERE ROUTINE_SCHEMA = DATABASE() 
            AND ROUTINE_NAME = 'SendFriendRequest'
        `);
        
        console.log(`⚙️ SendFriendRequest procedure: ${procedures.length > 0 ? 'EXISTS' : 'MISSING'}`);
        
        if (friendRequests.length > 0 && notifications.length === 0) {
            console.log('⚠️ Found friend requests but no notifications!');
            console.log('💡 This suggests the notification creation might be failing');
            
            // Try to create a test notification manually
            const testRequest = friendRequests[0];
            await promisePool.execute(`
                INSERT INTO notifications (user_id, type, title, message, sender_id, data)
                VALUES (?, 'friend_request', 'Test Friend Request', ?, ?, ?)
            `, [
                frJames.id,
                `You have a friend request from ${testRequest.first_name} ${testRequest.last_name}`,
                testRequest.requester_id,
                JSON.stringify({ request_id: testRequest.id })
            ]);
            
            console.log('✅ Created test notification');
        }
        
    } catch (error) {
        console.error('❌ Error checking friend notifications:', error);
    }
}

// Run if called directly
if (require.main === module) {
    checkFriendNotifications().catch(console.error);
}

module.exports = { checkFriendNotifications }; 