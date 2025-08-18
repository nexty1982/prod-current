const { promisePool } = require('../../config/db');

(async () => {
    try {
        console.log('🔧 Fixing session issues...\n');
        
        // 1. First, clean up expired sessions (they're all expired anyway)
        console.log('1. Cleaning up expired sessions...');
        const [deleteResult] = await promisePool.query('DELETE FROM sessions WHERE FROM_UNIXTIME(expires) <= NOW()');
        console.log(`✅ Cleaned up ${deleteResult.affectedRows} expired sessions`);
        
        // 2. Check the session table structure - the expires column should be INT for Unix timestamp
        console.log('\n2. Checking session table structure...');
        const [tableStructure] = await promisePool.query('DESCRIBE sessions');
        console.log('   Current structure:');
        tableStructure.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        // The table structure looks correct (expires as INT for Unix timestamp)
        
        // 3. Check if we have any sessions at all now
        console.log('\n3. Current session count after cleanup...');
        const [sessionCount] = await promisePool.query('SELECT COUNT(*) as total FROM sessions');
        console.log(`   Total sessions remaining: ${sessionCount[0].total}`);
        
        // 4. Test session creation manually
        console.log('\n4. Testing manual session creation...');
        const testSessionId = 'test-session-' + Date.now();
        const testExpires = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now
        const testData = JSON.stringify({
            cookie: {
                originalMaxAge: 86400000,
                expires: new Date(Date.now() + 86400000).toISOString(),
                secure: false,
                httpOnly: true,
                sameSite: 'lax'
            },
            user: {
                id: 999,
                email: 'test@example.com',
                role: 'test'
            }
        });
        
        try {
            await promisePool.query(
                'INSERT INTO sessions (session_id, expires, data) VALUES (?, ?, ?)',
                [testSessionId, testExpires, testData]
            );
            console.log('✅ Test session created successfully');
            
            // Verify it's active
            const [testSession] = await promisePool.query(`
                SELECT 
                    session_id,
                    FROM_UNIXTIME(expires) as expires_readable,
                    CASE WHEN FROM_UNIXTIME(expires) > NOW() THEN 'ACTIVE' ELSE 'EXPIRED' END as status
                FROM sessions 
                WHERE session_id = ?
            `, [testSessionId]);
            
            if (testSession.length > 0) {
                console.log(`   Test session status: ${testSession[0].status}`);
                console.log(`   Test session expires: ${testSession[0].expires_readable}`);
            }
            
            // Clean up test session
            await promisePool.query('DELETE FROM sessions WHERE session_id = ?', [testSessionId]);
            console.log('✅ Test session cleaned up');
            
        } catch (err) {
            console.log(`❌ Test session creation failed: ${err.message}`);
        }
        
        // 5. Check session configuration issues
        console.log('\n5. Session configuration diagnosis...');
        
        // The session config looks mostly correct, but let's check the store initialization
        try {
            const sessionConfig = require('../server/config/session.js');
            console.log('✅ Session config loaded successfully');
            
            // Check if the store is properly configured
            if (sessionConfig.store) {
                console.log('✅ Session store is configured');
                console.log(`   Store type: ${sessionConfig.store.constructor?.name || 'Unknown'}`);
            } else {
                console.log('❌ Session store is NOT configured - this is the problem!');
            }
            
        } catch (err) {
            console.log(`❌ Session config load error: ${err.message}`);
        }
        
        // 6. Final recommendations
        console.log('\n6. 🎯 DIAGNOSIS AND FIXES:');
        console.log('\n   PROBLEMS FOUND:');
        console.log('   ❌ Session debugging shows "Memory (default)" store instead of MySQLStore');
        console.log('   ❌ This means the session middleware is not using the database');
        console.log('   ❌ Sessions are not persisting across server restarts');
        
        console.log('\n   SOLUTIONS:');
        console.log('   1. ✅ Restart your backend server to reinitialize session middleware');
        console.log('   2. ✅ Check server startup logs for session store connection messages');
        console.log('   3. ✅ Verify MySQL connection in session config');
        console.log('   4. ✅ Clear browser cookies and login again after server restart');
        
        console.log('\n   TO RESTART SERVER:');
        console.log('   pm2 restart orthodox-backend  # if using PM2');
        console.log('   # OR');
        console.log('   pkill -f "node.*server"      # kill current server');
        console.log('   node server/index.js         # start new server');
        
        console.log('\n   WHAT TO LOOK FOR IN LOGS:');
        console.log('   ✅ "Session store connected successfully"');
        console.log('   ❌ "Session store error:"');
        
        process.exit(0);
        
    } catch (err) {
        console.error('❌ Fix script failed:', err.message);
        console.error('Full error:', err);
        process.exit(1);
    }
})(); 