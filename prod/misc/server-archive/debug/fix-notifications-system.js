const { promisePool } = require('../../config/db');

async function fixNotificationsSystem() {
    try {
        console.log('🔧 Fixing notifications system...');
        
        // First, check if notifications table exists and its structure
        const [tables] = await promisePool.execute(`
            SHOW TABLES LIKE 'notifications'
        `);
        
        if (tables.length === 0) {
            console.log('❌ Notifications table does not exist, creating it...');
            
            // Create notifications table
            await promisePool.execute(`
                CREATE TABLE notifications (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    notification_type_id INT NULL,
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    data JSON NULL,
                    is_read BOOLEAN DEFAULT FALSE,
                    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
                    action_url VARCHAR(500) NULL,
                    expires_at DATETIME NULL,
                    sender_id INT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    read_at TIMESTAMP NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_user_id (user_id),
                    INDEX idx_is_read (is_read),
                    INDEX idx_created_at (created_at),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
                )
            `);
            console.log('✅ Created notifications table');
        } else {
            console.log('✅ Notifications table exists');
        }
        
        // Check if notification_types table exists
        const [notifTypes] = await promisePool.execute(`
            SHOW TABLES LIKE 'notification_types'
        `);
        
        if (notifTypes.length === 0) {
            console.log('❌ Notification_types table does not exist, creating it...');
            
            // Create notification_types table
            await promisePool.execute(`
                CREATE TABLE notification_types (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    description TEXT,
                    category ENUM('user', 'system', 'admin') DEFAULT 'user',
                    is_active BOOLEAN DEFAULT TRUE,
                    default_enabled BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            
            // Insert default notification types
            await promisePool.execute(`
                INSERT INTO notification_types (name, description, category) VALUES
                ('friend_request', 'Friend request notifications', 'user'),
                ('friend_accepted', 'Friend request accepted notifications', 'user'),
                ('chat_message', 'Chat message notifications', 'user'),
                ('blog_comment', 'Blog comment notifications', 'user'),
                ('blog_like', 'Blog like notifications', 'user'),
                ('mention', 'User mention notifications', 'user'),
                ('system', 'System notifications', 'system')
            `);
            console.log('✅ Created notification_types table with default types');
        } else {
            console.log('✅ Notification_types table exists');
        }
        
        // Now create notifications for the existing friend request
        console.log('🔍 Checking for existing friend requests...');
        
        const [friendRequests] = await promisePool.execute(`
            SELECT 
                f.id,
                f.requester_id,
                f.addressee_id,
                f.status,
                f.requested_at,
                u1.first_name as requester_first_name,
                u1.last_name as requester_last_name,
                u1.email as requester_email,
                u2.first_name as addressee_first_name,
                u2.last_name as addressee_last_name,
                u2.email as addressee_email
            FROM friendships f
            JOIN users u1 ON u1.id = f.requester_id
            JOIN users u2 ON u2.id = f.addressee_id
            WHERE f.status = 'pending'
            ORDER BY f.requested_at DESC
        `);
        
        console.log(`📥 Found ${friendRequests.length} pending friend requests`);
        
        // Get notification type IDs
        const [notifTypeResults] = await promisePool.execute(`
            SELECT id, name FROM notification_types WHERE name IN ('friend_request', 'friend_accepted')
        `);
        
        const notifTypeMap = {};
        notifTypeResults.forEach(type => {
            notifTypeMap[type.name] = type.id;
        });
        
        // Create notifications for each friend request
        for (const request of friendRequests) {
            console.log(`📤 Processing request from ${request.requester_email} to ${request.addressee_email}`);
            
            // Check if notification already exists for the recipient
            const [existingRecipient] = await promisePool.execute(`
                SELECT id FROM notifications 
                WHERE user_id = ? AND sender_id = ? AND notification_type_id = ?
            `, [request.addressee_id, request.requester_id, notifTypeMap.friend_request]);
            
            if (existingRecipient.length === 0) {
                // Create notification for recipient (person receiving the friend request)
                await promisePool.execute(`
                    INSERT INTO notifications (
                        user_id, notification_type_id, title, message, data, sender_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    request.addressee_id,
                    notifTypeMap.friend_request,
                    'New Friend Request',
                    `${request.requester_first_name} ${request.requester_last_name} sent you a friend request`,
                    JSON.stringify({ 
                        request_id: request.id,
                        requester_id: request.requester_id,
                        action_type: 'friend_request_received'
                    }),
                    request.requester_id,
                    request.requested_at
                ]);
                console.log(`  ✅ Created notification for recipient: ${request.addressee_email}`);
            }
            
            // Check if activity record exists for the sender
            const [existingSender] = await promisePool.execute(`
                SELECT id FROM notifications 
                WHERE user_id = ? AND notification_type_id = ? AND JSON_EXTRACT(data, '$.target_user_id') = ?
            `, [request.requester_id, notifTypeMap.friend_request, request.addressee_id]);
            
            if (existingSender.length === 0) {
                // Create activity record for sender (person who sent the friend request)
                await promisePool.execute(`
                    INSERT INTO notifications (
                        user_id, notification_type_id, title, message, data, is_read, created_at
                    ) VALUES (?, ?, ?, ?, ?, 1, ?)
                `, [
                    request.requester_id,
                    notifTypeMap.friend_request,
                    'Friend Request Sent',
                    `Sent friend request to ${request.addressee_first_name} ${request.addressee_last_name}`,
                    JSON.stringify({ 
                        request_id: request.id,
                        target_user_id: request.addressee_id,
                        target_email: request.addressee_email,
                        action_type: 'friend_request_sent'
                    }),
                    request.requested_at
                ]);
                console.log(`  ✅ Created activity record for sender: ${request.requester_email}`);
            }
        }
        
        console.log('🎉 Notifications system fixed successfully!');
        console.log('📝 Both users should now see appropriate notifications/activities');
        
    } catch (error) {
        console.error('❌ Error fixing notifications system:', error);
    }
}

// Run if called directly
if (require.main === module) {
    fixNotificationsSystem().catch(console.error);
}

module.exports = { fixNotificationsSystem }; 