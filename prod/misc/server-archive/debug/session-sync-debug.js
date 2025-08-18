const { promisePool } = require('../../config/db');

(async () => {
    try {
        console.log('🔍 Comprehensive session sync debugging...\n');
        
        // 1. Check session table structure
        console.log('1. Session table structure:');
        try {
            const [tableInfo] = await promisePool.query('DESCRIBE sessions');
            tableInfo.forEach(column => {
                console.log(`   ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key ? `(${column.Key})` : ''}`);
            });
        } catch (err) {
            console.log(`❌ Session table error: ${err.message}`);
        }

        // 2. Check ALL sessions (not just active)
        console.log('\n2. All sessions in database:');
        try {
            const [allSessions] = await promisePool.query(`
                SELECT 
                    session_id,
                    expires,
                    TIMESTAMPDIFF(MINUTE, NOW(), expires) as minutes_remaining,
                    CASE 
                        WHEN expires > NOW() THEN 'ACTIVE'
                        ELSE 'EXPIRED'
                    END as status,
                    CHAR_LENGTH(data) as data_size,
                    LEFT(data, 100) as data_preview
                FROM sessions 
                ORDER BY expires DESC 
                LIMIT 10
            `);
            
            if (allSessions.length > 0) {
                console.log(`✅ Found ${allSessions.length} sessions:`);
                allSessions.forEach((session, index) => {
                    console.log(`   ${index + 1}. ${session.status} - ID: ${session.session_id.substring(0, 20)}...`);
                    console.log(`      Expires: ${session.expires} (${session.minutes_remaining} min remaining)`);
                    console.log(`      Data: ${session.data_size} bytes - ${session.data_preview}...`);
                    console.log('      ---');
                });
            } else {
                console.log('❌ No sessions found at all in database');
            }
        } catch (err) {
            console.log(`❌ All sessions query error: ${err.message}`);
        }

        // 3. Check session storage configuration
        console.log('\n3. Session configuration check:');
        try {
            // Check if we can find session config
            const fs = require('fs');
            const path = require('path');
            
            const sessionConfigPath = path.join(__dirname, '../server/config/session.js');
            if (fs.existsSync(sessionConfigPath)) {
                console.log('✅ Session config file found');
                const sessionConfig = require('../server/config/session.js');
                
                console.log('   Session settings:');
                console.log(`   - Store type: ${sessionConfig.store ? 'MySQLStore' : 'Memory (default)'}`);
                console.log(`   - Cookie maxAge: ${sessionConfig.cookie?.maxAge || 'Not set'}`);
                console.log(`   - Cookie secure: ${sessionConfig.cookie?.secure || false}`);
                console.log(`   - Cookie httpOnly: ${sessionConfig.cookie?.httpOnly || false}`);
                console.log(`   - Cookie sameSite: ${sessionConfig.cookie?.sameSite || 'default'}`);
                console.log(`   - Session secret: ${sessionConfig.secret ? 'SET' : 'NOT SET'}`);
                console.log(`   - Session name: ${sessionConfig.name || 'connect.sid'}`);
                
                // Actually check the store property type
                if (sessionConfig.store && sessionConfig.store.constructor && sessionConfig.store.constructor.name) {
                    console.log(`   - Actual store type: ${sessionConfig.store.constructor.name}`);
                }
            } else {
                console.log('⚠️  Session config file not found at expected location');
            }
        } catch (err) {
            console.log(`⚠️  Session config check error: ${err.message}`);
        }

        // 4. Check session expiry format issue
        console.log('\n4. Session expiry format check:');
        try {
            const [expiryCheck] = await promisePool.query(`
                SELECT 
                    session_id,
                    expires,
                    FROM_UNIXTIME(expires) as expires_readable,
                    NOW() as now_time,
                    CASE 
                        WHEN FROM_UNIXTIME(expires) > NOW() THEN 'ACTIVE'
                        ELSE 'EXPIRED'
                    END as real_status
                FROM sessions 
                ORDER BY expires DESC 
                LIMIT 3
            `);
            
            if (expiryCheck.length > 0) {
                console.log('   Session expiry analysis:');
                expiryCheck.forEach((session, index) => {
                    console.log(`   ${index + 1}. ID: ${session.session_id.substring(0, 16)}...`);
                    console.log(`      Raw expires: ${session.expires}`);
                    console.log(`      Readable expires: ${session.expires_readable}`);
                    console.log(`      Current time: ${session.now_time}`);
                    console.log(`      Real status: ${session.real_status}`);
                    console.log('      ---');
                });
            } else {
                console.log('   No sessions to check expiry format');
            }
        } catch (err) {
            console.log(`   ❌ Expiry check error: ${err.message}`);
        }

        // 5. Session creation test instructions
        console.log('\n5. Session creation test:');
        console.log('   To test session creation, try:');
        console.log('   1. Open browser dev tools (F12)');
        console.log('   2. Go to Application/Storage tab');
        console.log('   3. Check Cookies for your domain');
        console.log('   4. Look for "orthodox.sid" cookie (not "connect.sid")');
        console.log('   5. Try logging in again');
        console.log('   6. Refresh this script to see if sessions appear');

        // 6. Check for common session issues
        console.log('\n6. Common session issues to check:');
        console.log('   ✓ Browser cookies enabled?');
        console.log('   ✓ Correct domain/port in browser?');
        console.log('   ✓ No CORS issues blocking cookies?');
        console.log('   ✓ Session store connected to correct database?');
        console.log('   ✓ Server restarted after config changes?');

        // 7. Check database connection (fixed SQL)
        console.log('\n7. Database connection test:');
        try {
            const [connectionTest] = await promisePool.query('SELECT NOW() as current_time, DATABASE() as current_db');
            console.log(`✅ Database connected: ${connectionTest[0].current_db} at ${connectionTest[0].current_time}`);
        } catch (err) {
            console.log(`❌ Database connection error: ${err.message}`);
            // Try alternative syntax
            try {
                const [altTest] = await promisePool.query('SELECT NOW() as now_time, DATABASE() as db_name');
                console.log(`✅ Alternative test: Connected to ${altTest[0].db_name} at ${altTest[0].now_time}`);
            } catch (err2) {
                console.log(`❌ Alternative test also failed: ${err2.message}`);
            }
        }

        // 7. Real-time session monitoring suggestion
        console.log('\n7. Real-time monitoring:');
        console.log('   Run this to monitor sessions in real-time:');
        console.log('   watch -n 2 "mysql -u root -p -e \\"SELECT COUNT(*) as total, SUM(expires > NOW()) as active FROM orthodoxmetrics_db.sessions;\\""');

        process.exit(0);
    } catch (err) {
        console.error('❌ Session sync debug failed:', err.message);
        console.error('Full error:', err);
        process.exit(1);
    }
})(); 