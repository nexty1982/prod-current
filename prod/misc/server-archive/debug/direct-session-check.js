const mysql = require('mysql2/promise');

(async () => {
    let connection;
    
    try {
        console.log('🔍 Direct session database check...\n');
        
        // Create direct MySQL connection
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Summerof1982@!',
            database: 'orthodoxmetrics_db'
        });
        
        console.log('✅ Connected to orthodoxmetrics_db database');
        
        // 1. Check if sessions table exists
        console.log('\n1. Checking sessions table...');
        try {
            const [tableCheck] = await connection.execute('SHOW TABLES LIKE "sessions"');
            if (tableCheck.length > 0) {
                console.log('✅ Sessions table exists');
                
                // Get table structure
                const [structure] = await connection.execute('DESCRIBE sessions');
                console.log('   Table structure:');
                structure.forEach(col => {
                    console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
                });
            } else {
                console.log('❌ Sessions table does not exist!');
                return;
            }
        } catch (err) {
            console.log(`❌ Error checking sessions table: ${err.message}`);
            return;
        }
        
        // 2. Count all sessions
        console.log('\n2. Session counts...');
        const [counts] = await connection.execute(`
            SELECT 
                COUNT(*) as total_sessions,
                SUM(CASE WHEN expires > NOW() THEN 1 ELSE 0 END) as active_sessions,
                SUM(CASE WHEN expires <= NOW() THEN 1 ELSE 0 END) as expired_sessions
            FROM sessions
        `);
        
        const stats = counts[0];
        console.log(`   Total sessions: ${stats.total_sessions}`);
        console.log(`   Active sessions: ${stats.active_sessions}`);
        console.log(`   Expired sessions: ${stats.expired_sessions}`);
        
        // 3. Show recent sessions (active and expired)
        console.log('\n3. Recent sessions (last 10)...');
        const [recentSessions] = await connection.execute(`
            SELECT 
                session_id,
                expires,
                TIMESTAMPDIFF(MINUTE, NOW(), expires) as minutes_remaining,
                CASE WHEN expires > NOW() THEN 'ACTIVE' ELSE 'EXPIRED' END as status,
                CHAR_LENGTH(data) as data_size,
                LEFT(data, 150) as data_preview
            FROM sessions 
            ORDER BY expires DESC 
            LIMIT 10
        `);
        
        if (recentSessions.length > 0) {
            recentSessions.forEach((session, index) => {
                console.log(`   ${index + 1}. [${session.status}] ID: ${session.session_id.substring(0, 16)}...`);
                console.log(`      Expires: ${session.expires} (${session.minutes_remaining} min)`);
                console.log(`      Data: ${session.data_size} bytes`);
                console.log(`      Preview: ${session.data_preview}...`);
                console.log('      ---');
            });
        } else {
            console.log('   No sessions found');
        }
        
        // 4. Check if any sessions contain user data
        console.log('\n4. Looking for sessions with user data...');
        const [userSessions] = await connection.execute(`
            SELECT 
                session_id,
                expires,
                data,
                CASE WHEN expires > NOW() THEN 'ACTIVE' ELSE 'EXPIRED' END as status
            FROM sessions 
            WHERE data LIKE '%user%' 
            ORDER BY expires DESC 
            LIMIT 5
        `);
        
        if (userSessions.length > 0) {
            console.log(`   Found ${userSessions.length} sessions with user data:`);
            userSessions.forEach((session, index) => {
                console.log(`   ${index + 1}. [${session.status}] ${session.session_id.substring(0, 16)}...`);
                console.log(`      Data: ${session.data}`);
                console.log('      ---');
            });
        } else {
            console.log('   No sessions with user data found');
        }
        
        // 5. Current timestamp check
        console.log('\n5. Database time check...');
        const [timeCheck] = await connection.execute('SELECT NOW() as current_time');
        console.log(`   Current database time: ${timeCheck[0].current_time}`);
        
        console.log('\n🎯 Diagnosis:');
        if (stats.total_sessions === 0) {
            console.log('   ❌ No sessions are being created at all');
            console.log('   💡 This suggests the session middleware is not working');
        } else if (stats.active_sessions === 0) {
            console.log('   ⚠️  Sessions are being created but all have expired');
            console.log('   💡 Try logging in again and immediately run this script');
        } else {
            console.log('   ✅ Sessions are being created and some are active');
            console.log('   💡 The issue might be with session retrieval or cookies');
        }
        
    } catch (error) {
        console.error('❌ Direct session check failed:', error.message);
        console.error('Full error:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✅ Database connection closed');
        }
    }
})(); 