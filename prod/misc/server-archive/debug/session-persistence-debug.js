const { promisePool } = require('../../config/db');

(async () => {
    try {
        console.log('🔄 SESSION PERSISTENCE DEBUG\n');
        
        console.log('🎯 PROBLEM: Sessions not persisting across page refresh');
        console.log('   This suggests session cookie or storage issues\n');
        
        // 1. Check current sessions
        console.log('1. Current database sessions:');
        const [sessions] = await promisePool.query(`
            SELECT 
                session_id,
                FROM_UNIXTIME(expires) as expires_readable,
                CASE WHEN FROM_UNIXTIME(expires) > NOW() THEN 'ACTIVE' ELSE 'EXPIRED' END as status,
                CHAR_LENGTH(data) as data_size,
                LEFT(data, 300) as data_preview
            FROM sessions 
            ORDER BY expires DESC 
            LIMIT 3
        `);
        
        if (sessions.length > 0) {
            sessions.forEach((session, index) => {
                console.log(`   ${index + 1}. [${session.status}] ID: ${session.session_id.substring(0, 16)}...`);
                console.log(`      Expires: ${session.expires_readable}`);
                console.log(`      Data: ${session.data_size} bytes`);
                console.log(`      Preview: ${session.data_preview}`);
                console.log('      ---');
            });
        } else {
            console.log('   ❌ No sessions in database');
        }
        
        console.log('\n2. 🔍 POTENTIAL SESSION PERSISTENCE ISSUES:');
        console.log('   A. ❌ Session cookie not being set properly');
        console.log('   B. ❌ Session cookie domain/path mismatch');
        console.log('   C. ❌ Session middleware not loading session on refresh');
        console.log('   D. ❌ Cookie forwarding issues in nginx proxy');
        console.log('   E. ❌ Session secret key mismatch');
        console.log('   F. ❌ Session store not persisting to database');
        
        console.log('\n3. 🧪 DEBUGGING STEPS:');
        console.log('   STEP 1: Check browser cookies after login:');
        console.log('   - Open browser dev tools (F12)');
        console.log('   - Go to Application > Cookies');
        console.log('   - Look for "orthodox.sid" cookie');
        console.log('   - Check domain, path, expires, httpOnly, secure settings');
        console.log('');
        
        console.log('   STEP 2: Test session API directly:');
        console.log('   # After login, test if session persists:');
        console.log('   curl -v https://orthodoxmetrics.com/api/auth/check \\');
        console.log('        -H "Cookie: orthodox.sid=YOUR_SESSION_ID"');
        console.log('');
        
        console.log('   STEP 3: Check session configuration:');
        
        // Check session config
        try {
            const sessionConfig = require('../server/config/session.js');
            console.log('   ✅ Session config loaded');
            console.log(`   - Cookie name: ${sessionConfig.name || 'connect.sid'}`);
            console.log(`   - Cookie maxAge: ${sessionConfig.cookie?.maxAge || 'Not set'}`);
            console.log(`   - Cookie secure: ${sessionConfig.cookie?.secure || false}`);
            console.log(`   - Cookie httpOnly: ${sessionConfig.cookie?.httpOnly || false}`);
            console.log(`   - Cookie sameSite: ${sessionConfig.cookie?.sameSite || 'default'}`);
            console.log(`   - Save uninitialized: ${sessionConfig.saveUninitialized || false}`);
            console.log(`   - Resave: ${sessionConfig.resave || false}`);
        } catch (err) {
            console.log('   ❌ Could not load session config:', err.message);
        }
        
        console.log('\n4. 🚨 COMMON SESSION PERSISTENCE FIXES:');
        
        console.log('\n   A. CHECK COOKIE DOMAIN IN NGINX:');
        console.log('   # In nginx config, ensure cookie domain rewriting:');
        console.log('   proxy_cookie_domain 127.0.0.1 orthodoxmetrics.com;');
        console.log('   proxy_cookie_domain localhost orthodoxmetrics.com;');
        console.log('   proxy_cookie_domain 192.168.1.239 orthodoxmetrics.com;');
        
        console.log('\n   B. SESSION CONFIG FIXES:');
        console.log('   # In server/config/session.js:');
        console.log('   cookie: {');
        console.log('     secure: false,  // Set to true only for HTTPS');
        console.log('     httpOnly: true,');
        console.log('     maxAge: 24 * 60 * 60 * 1000,  // 24 hours');
        console.log('     sameSite: "lax",');
        console.log('     domain: undefined  // Let it auto-detect');
        console.log('   }');
        
        console.log('\n   C. MIDDLEWARE ORDER CHECK:');
        console.log('   # In server/index.js, ensure this order:');
        console.log('   app.use(express.json());');
        console.log('   app.use(sessionMW);  // Session middleware BEFORE routes');
        console.log('   app.use("/api/auth", authRoutes);');
        
        console.log('\n5. 🧬 SESSION DEBUGGING HEADERS:');
        console.log('   Add these to nginx for debugging:');
        console.log('   add_header X-Debug-Session-Cookie $http_cookie;');
        console.log('   add_header X-Debug-Set-Cookie $sent_http_set_cookie;');
        
        console.log('\n6. 📊 BROWSER TESTING CHECKLIST:');
        console.log('   ✓ Login successfully');
        console.log('   ✓ Check if "orthodox.sid" cookie exists');
        console.log('   ✓ Note the cookie value');
        console.log('   ✓ Refresh page');
        console.log('   ✓ Check if cookie still exists with same value');
        console.log('   ✓ Check if /api/auth/check returns authenticated:true');
        
        console.log('\n7. 🎯 MOST LIKELY CAUSES:');
        console.log('   1. Cookie domain mismatch (127.0.0.1 vs orthodoxmetrics.com)');
        console.log('   2. Session secret key not matching');
        console.log('   3. Session store not actually saving to database');
        console.log('   4. Cookie path or security settings blocking persistence');
        
        console.log('\n8. ⚡ QUICK TEST:');
        console.log('   # Test session store directly:');
        console.log('   curl -v -X POST https://orthodoxmetrics.com/api/auth/login \\');
        console.log('        -H "Content-Type: application/json" \\');
        console.log('        -d \'{"email":"your@email.com","password":"yourpass"}\' \\');
        console.log('        -c cookies.txt');
        console.log('   ');
        console.log('   curl -v https://orthodoxmetrics.com/api/auth/check \\');
        console.log('        -b cookies.txt');
        
        process.exit(0);
        
    } catch (err) {
        console.error('❌ Session persistence debug failed:', err.message);
        process.exit(1);
    }
})(); 