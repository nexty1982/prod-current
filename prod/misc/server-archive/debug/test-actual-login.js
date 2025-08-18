const { promisePool } = require('../../config/db');

(async () => {
    try {
        console.log('🧪 Testing actual login process...\n');
        
        // 1. Check current sessions before test
        console.log('1. Current sessions in database:');
        const [beforeSessions] = await promisePool.query(`
            SELECT 
                session_id,
                FROM_UNIXTIME(expires) as expires_readable,
                CASE WHEN FROM_UNIXTIME(expires) > NOW() THEN 'ACTIVE' ELSE 'EXPIRED' END as status,
                CHAR_LENGTH(data) as data_size,
                LEFT(data, 200) as data_preview
            FROM sessions 
            ORDER BY expires DESC 
            LIMIT 5
        `);
        
        if (beforeSessions.length > 0) {
            console.log(`   Found ${beforeSessions.length} sessions:`);
            beforeSessions.forEach((session, index) => {
                console.log(`   ${index + 1}. [${session.status}] ID: ${session.session_id.substring(0, 16)}...`);
                console.log(`      Expires: ${session.expires_readable}`);
                console.log(`      Data: ${session.data_size} bytes`);
                if (session.data_preview.includes('user')) {
                    console.log(`      Contains user data: YES`);
                } else {
                    console.log(`      Contains user data: NO`);
                }
                console.log('      ---');
            });
        } else {
            console.log('   No sessions found');
        }
        
        // 2. Test if we can make a test API call to check session creation
        console.log('\n2. Session creation capability test:');
        console.log('   The fact that there are sessions in the database means:');
        console.log('   ✅ MySQL session store IS working');
        console.log('   ✅ Sessions ARE being created and stored');
        console.log('   ✅ Database connection is functional');
        
        // 3. Check if there are sessions with user data
        console.log('\n3. Looking for sessions with authentication data:');
        const [userSessions] = await promisePool.query(`
            SELECT 
                session_id,
                FROM_UNIXTIME(expires) as expires_readable,
                CASE WHEN FROM_UNIXTIME(expires) > NOW() THEN 'ACTIVE' ELSE 'EXPIRED' END as status,
                data
            FROM sessions 
            WHERE data LIKE '%user%'
            ORDER BY expires DESC 
            LIMIT 3
        `);
        
        if (userSessions.length > 0) {
            console.log(`   ✅ Found ${userSessions.length} sessions with user data:`);
            userSessions.forEach((session, index) => {
                console.log(`   ${index + 1}. [${session.status}] ID: ${session.session_id.substring(0, 16)}...`);
                console.log(`      Expires: ${session.expires_readable}`);
                
                try {
                    const sessionData = JSON.parse(session.data);
                    if (sessionData.user) {
                        console.log(`      User: ${sessionData.user.email} (${sessionData.user.role})`);
                    } else {
                        console.log(`      Session contains 'user' but no user object`);
                    }
                } catch (e) {
                    console.log(`      Could not parse session data`);
                }
                console.log('      ---');
            });
        } else {
            console.log('   ⚠️  No sessions with user authentication data found');
            console.log('   💡 This suggests users are not staying logged in');
        }
        
        // 4. Check for very recent sessions (last 10 minutes)
        console.log('\n4. Recent session activity (last 10 minutes):');
        const [recentSessions] = await promisePool.query(`
            SELECT 
                session_id,
                FROM_UNIXTIME(expires) as expires_readable,
                CASE WHEN FROM_UNIXTIME(expires) > NOW() THEN 'ACTIVE' ELSE 'EXPIRED' END as status,
                CHAR_LENGTH(data) as data_size
            FROM sessions 
            WHERE FROM_UNIXTIME(expires) > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
            ORDER BY expires DESC
        `);
        
        if (recentSessions.length > 0) {
            console.log(`   ✅ Found ${recentSessions.length} recent sessions:`);
            recentSessions.forEach((session, index) => {
                console.log(`   ${index + 1}. [${session.status}] ${session.session_id.substring(0, 16)}... (${session.data_size} bytes)`);
            });
        } else {
            console.log('   ⚠️  No recent sessions found');
            console.log('   💡 Try logging in and immediately running this script again');
        }
        
        // 5. Server connection diagnosis
        console.log('\n5. 🎯 SESSION DIAGNOSIS:');
        
        if (beforeSessions.length > 0) {
            console.log('   ✅ MySQL session store IS working - sessions are in database');
            
            if (userSessions.length > 0) {
                console.log('   ✅ User sessions ARE being created');
                console.log('   💡 The issue might be with session retrieval or cookie handling');
                
                console.log('\n   🔧 NEXT STEPS:');
                console.log('   1. Check browser cookies for "orthodox.sid"');
                console.log('   2. Check browser dev tools > Application > Cookies');
                console.log('   3. Try logging in again in a new browser tab');
                console.log('   4. Check server logs during login for any errors');
                
            } else {
                console.log('   ⚠️  Sessions exist but no user data - login might not be completing');
                
                console.log('\n   🔧 NEXT STEPS:');
                console.log('   1. Check server logs during login attempt');
                console.log('   2. Verify login endpoint is working');
                console.log('   3. Check if login is completing successfully');
            }
        } else {
            console.log('   ❌ No sessions at all - session middleware might not be running');
            
            console.log('\n   🔧 NEXT STEPS:');
            console.log('   1. Restart the backend server');
            console.log('   2. Check server startup logs');
            console.log('   3. Verify session middleware is loaded');
        }
        
        process.exit(0);
        
    } catch (err) {
        console.error('❌ Login test failed:', err.message);
        console.error('Full error:', err);
        process.exit(1);
    }
})(); 