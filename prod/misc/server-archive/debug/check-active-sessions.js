const { promisePool } = require('../../config/db');

(async () => {
    try {
        console.log('🔍 Checking active sessions...\n');
        
        const [activeSessions] = await promisePool.query(`
            SELECT 
                session_id, 
                expires,
                LEFT(data, 200) as data_preview,
                CHAR_LENGTH(data) as data_length,
                TIMESTAMPDIFF(MINUTE, NOW(), expires) as minutes_remaining
            FROM sessions 
            WHERE expires > NOW() 
            ORDER BY expires DESC 
            LIMIT 10
        `);
        
        if (activeSessions.length > 0) {
            console.log(`✅ Found ${activeSessions.length} active sessions:`);
            activeSessions.forEach((session, index) => {
                console.log(`\n${index + 1}. Session ID: ${session.session_id}`);
                console.log(`   Expires: ${session.expires}`);
                console.log(`   Minutes remaining: ${session.minutes_remaining}`);
                console.log(`   Data length: ${session.data_length} bytes`);
                
                // Try to extract user info from session data
                try {
                    const sessionData = session.data_preview;
                    if (sessionData.includes('superadmin@orthodoxmetrics.com')) {
                        console.log(`   🎯 Contains superadmin session data`);
                    }
                } catch (e) {
                    // Session data parsing error, ignore
                }
            });
        } else {
            console.log('❌ No active sessions found - you need to log in again');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Check failed:', err.message);
        process.exit(1);
    }
})(); 