const { promisePool } = require('../../config/db');

async function checkNotificationsSchema() {
    try {
        console.log('🔍 Checking notifications table structure...');
        
        // Check if notifications table exists and get its structure
        const [tables] = await promisePool.execute(`
            SHOW TABLES LIKE 'notifications'
        `);
        
        if (tables.length === 0) {
            console.log('❌ Notifications table does not exist');
            
            // Check for other similar tables
            const [allTables] = await promisePool.execute(`
                SHOW TABLES LIKE '%notif%'
            `);
            
            console.log('📋 Tables with "notif" in name:', allTables.map(t => Object.values(t)[0]));
            return;
        }
        
        console.log('✅ Notifications table exists');
        
        // Get table structure
        const [columns] = await promisePool.execute(`
            DESCRIBE notifications
        `);
        
        console.log('📋 Notifications table columns:');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'} ${col.Key ? `[${col.Key}]` : ''}`);
        });
        
        // Check for any existing notifications for Fr. James
        const [notifications] = await promisePool.execute(`
            SELECT * FROM notifications WHERE user_id = 20 LIMIT 5
        `);
        
        console.log(`\n📬 Sample notifications for Fr. James: ${notifications.length}`);
        if (notifications.length > 0) {
            notifications.forEach(notif => {
                console.log('  Sample notification:', notif);
            });
        }
        
        // Check for friend requests
        const [friendRequests] = await promisePool.execute(`
            SELECT id, status, requested_at FROM friendships WHERE addressee_id = 20
        `);
        
        console.log(`\n📥 Friend requests for Fr. James: ${friendRequests.length}`);
        
    } catch (error) {
        console.error('❌ Error checking notifications schema:', error);
    }
}

// Run if called directly
if (require.main === module) {
    checkNotificationsSchema().catch(console.error);
}

module.exports = { checkNotificationsSchema }; 