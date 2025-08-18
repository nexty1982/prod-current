const { promisePool } = require('../../config/db');

(async () => {
    try {
        console.log('🌐 NGINX PROXY SESSION DEBUG\n');
        
        console.log('📋 CURRENT NGINX PROXY SETUP:');
        console.log('   External: https://orthodoxmetrics.com (nginx proxy)');
        console.log('   ↓ forwards to');
        console.log('   Internal: http://192.168.1.239:80 (nginx internal)');
        console.log('   ↓ forwards /api to');
        console.log('   Backend: http://192.168.1.239:3001 (your Node.js server)');
        
        console.log('\n🔍 POTENTIAL NGINX ISSUES:');
        console.log('   1. ❌ Nginx caching old responses with "Unknown User"');
        console.log('   2. ❌ Cookie forwarding problems between proxies');
        console.log('   3. ❌ Session middleware not seeing real client IP');
        console.log('   4. ❌ Nginx serving cached frontend with old auth state');
        
        // 1. Check current sessions
        console.log('\n1. Current database sessions:');
        const [sessions] = await promisePool.query(`
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
        
        if (sessions.length > 0) {
            sessions.forEach((session, index) => {
                console.log(`   ${index + 1}. [${session.status}] ID: ${session.session_id.substring(0, 16)}...`);
                console.log(`      Expires: ${session.expires_readable}`);
                console.log(`      Data: ${session.data_size} bytes`);
                if (session.data_preview.includes('user')) {
                    console.log(`      ✅ Contains user data`);
                } else {
                    console.log(`      ❌ No user data`);
                }
                console.log('      ---');
            });
        } else {
            console.log('   No sessions in database');
        }
        
        console.log('\n2. 🚨 NGINX CACHE CLEARING COMMANDS:');
        console.log('   Run these on your server to clear nginx cache:');
        console.log('   ');
        console.log('   # Clear nginx cache');
        console.log('   sudo systemctl reload nginx');
        console.log('   # OR force restart nginx');
        console.log('   sudo systemctl restart nginx');
        console.log('   ');
        console.log('   # Clear any nginx cache directories');
        console.log('   sudo rm -rf /var/cache/nginx/*');
        console.log('   sudo rm -rf /tmp/nginx/*');
        
        console.log('\n3. 🔧 NGINX SESSION COOKIE DEBUGGING:');
        console.log('   Add this to your nginx config for debugging:');
        console.log('   ');
        console.log('   location /api/ {');
        console.log('       # Add debug headers');
        console.log('       add_header X-Debug-Session-ID $http_cookie;');
        console.log('       add_header X-Debug-Real-IP $remote_addr;');
        console.log('       add_header X-Debug-Forwarded-For $proxy_add_x_forwarded_for;');
        console.log('       ');
        console.log('       # Ensure cookies are properly forwarded');
        console.log('       proxy_set_header Cookie $http_cookie;');
        console.log('       proxy_pass_header Set-Cookie;');
        console.log('       proxy_cookie_path / /;');
        console.log('       ');
        console.log('       # Your existing proxy_pass...');
        console.log('   }');
        
        console.log('\n4. ❌ PROBABLE ROOT CAUSES:');
        console.log('   A. Nginx is caching the frontend with "Unknown User" state');
        console.log('   B. Session cookies are not properly forwarded through both proxies');
        console.log('   C. The internal nginx (192.168.1.239:80) has its own auth issues');
        
        console.log('\n5. 🎯 IMMEDIATE FIXES:');
        console.log('   STEP 1: Clear nginx cache and restart nginx');
        console.log('   STEP 2: Check cookie forwarding in both nginx configs');
        console.log('   STEP 3: Verify the internal nginx (192.168.1.239:80) config');
        console.log('   STEP 4: Test directly against 192.168.1.239:80 (bypass external proxy)');
        
        console.log('\n6. 🧪 TESTING COMMANDS:');
        console.log('   # Test direct backend (should require auth):');
        console.log('   curl -v http://192.168.1.239:3001/api/auth/check');
        console.log('   ');
        console.log('   # Test internal nginx (should require auth):');
        console.log('   curl -v http://192.168.1.239:80/api/auth/check');
        console.log('   ');
        console.log('   # Test external nginx (should require auth):');
        console.log('   curl -v https://orthodoxmetrics.com/api/auth/check');
        
        console.log('\n7. 🚨 CRITICAL ACTIONS NEEDED:');
        console.log('   1. Restart nginx: sudo systemctl restart nginx');
        console.log('   2. Clear browser cache completely');
        console.log('   3. Check internal nginx config for auth bypasses');
        console.log('   4. Test each layer individually');
        
        process.exit(0);
        
    } catch (err) {
        console.error('❌ Nginx debug failed:', err.message);
        process.exit(1);
    }
})(); 