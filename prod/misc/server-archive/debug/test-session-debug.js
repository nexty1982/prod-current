const { promisePool } = require('../../config/db');

(async () => {
    try {
        console.log('🔍 Debugging session and authentication issues...\n');
        
        // 1. Check if sessions table exists
        console.log('1. Checking sessions table...');
        try {
            const [sessions] = await promisePool.query('SELECT COUNT(*) as count FROM sessions');
            console.log(`✅ Sessions table exists with ${sessions[0].count} sessions`);
        } catch (err) {
            console.log(`❌ Sessions table error: ${err.message}`);
        }
        
        // 2. Check recent sessions
        console.log('\n2. Checking recent sessions...');
        try {
            const [recentSessions] = await promisePool.query(`
                SELECT session_id, expires, 
                       LEFT(data, 100) as data_preview,
                       CHAR_LENGTH(data) as data_length
                FROM sessions 
                WHERE expires > NOW() 
                ORDER BY expires DESC 
                LIMIT 5
            `);
            
            if (recentSessions.length > 0) {
                console.log('✅ Recent active sessions:');
                recentSessions.forEach(session => {
                    console.log(`   ID: ${session.session_id}`);
                    console.log(`   Expires: ${session.expires}`);
                    console.log(`   Data length: ${session.data_length} bytes`);
                    console.log(`   Data preview: ${session.data_preview}...`);
                    console.log('   ---');
                });
            } else {
                console.log('⚠️  No active sessions found');
            }
        } catch (err) {
            console.log(`❌ Recent sessions error: ${err.message}`);
        }
        
        // 3. Check users table
        console.log('\n3. Checking users and authentication...');
        try {
            const [users] = await promisePool.query(`
                SELECT id, email, role, is_active, last_login 
                FROM users 
                WHERE role IN ('admin', 'super_admin') 
                ORDER BY last_login DESC 
                LIMIT 5
            `);
            
            console.log('✅ Admin users:');
            users.forEach(user => {
                console.log(`   ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Active: ${user.is_active}, Last Login: ${user.last_login}`);
            });
        } catch (err) {
            console.log(`❌ Users check error: ${err.message}`);
        }
        
        // 4. Check if superadmin user exists and has proper role
        console.log('\n4. Checking superadmin user specifically...');
        try {
            const [superadmin] = await promisePool.query(`
                SELECT id, email, role, is_active, last_login, created_at
                FROM users 
                WHERE email = 'superadmin@orthodoxmetrics.com'
            `);
            
            if (superadmin.length > 0) {
                const user = superadmin[0];
                console.log('✅ Superadmin user found:');
                console.log(`   ID: ${user.id}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Role: ${user.role}`);
                console.log(`   Active: ${user.is_active}`);
                console.log(`   Last Login: ${user.last_login}`);
                console.log(`   Created: ${user.created_at}`);
            } else {
                console.log('❌ Superadmin user not found');
            }
        } catch (err) {
            console.log(`❌ Superadmin check error: ${err.message}`);
        }
        
        console.log('\n🔍 Session debug completed!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Debug script failed:', err.message);
        process.exit(1);
    }
})(); 