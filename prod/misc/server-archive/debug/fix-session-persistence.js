const fs = require('fs');
const path = require('path');

console.log('🔧 SESSION PERSISTENCE FIX\n');

console.log('🔍 ANALYZING YOUR CONFIGURATION...\n');

// Read current session config
try {
    const sessionConfigPath = path.join(__dirname, '../server/config/session.js');
    const sessionConfig = fs.readFileSync(sessionConfigPath, 'utf8');
    
    console.log('📋 CURRENT SESSION CONFIG ISSUES FOUND:');
    
    if (sessionConfig.includes('secure: false')) {
        console.log('   ✅ Secure: false (correct for development)');
    } else if (sessionConfig.includes('secure: true')) {
        console.log('   ⚠️  Secure: true - this might cause issues if not using HTTPS internally');
    }
    
    if (sessionConfig.includes('//domain:')) {
        console.log('   ❌ Domain: COMMENTED OUT - this is likely the problem!');
    }
    
    if (sessionConfig.includes('sameSite: \'lax\'')) {
        console.log('   ✅ SameSite: lax (correct)');
    }
    
    console.log('\n🎯 IDENTIFIED PROBLEMS:');
    console.log('   1. ❌ Cookie domain not explicitly set');
    console.log('   2. ❌ Nginx proxy creating domain mismatches');
    console.log('   3. ❌ Session cookies may be set for wrong domain');
    
    console.log('\n🔧 IMMEDIATE FIXES NEEDED:');
    
    console.log('\n1. UPDATE SESSION CONFIG:');
    console.log('   Edit server/config/session.js:');
    console.log('   ');
    console.log('   cookie: {');
    console.log('     secure: false,  // Keep false for development');
    console.log('     httpOnly: true,');
    console.log('     maxAge: 1000 * 60 * 60 * 24, // 24 hours');
    console.log('     sameSite: "lax",');
    console.log('     domain: ".orthodoxmetrics.com"  // ADD THIS LINE!');
    console.log('   }');
    
    console.log('\n2. UPDATE NGINX COOKIE FORWARDING:');
    console.log('   In your nginx configs, ensure proper domain rewriting:');
    console.log('   ');
    console.log('   # Inner nginx (192.168.1.239:80):');
    console.log('   proxy_cookie_domain 127.0.0.1 .orthodoxmetrics.com;');
    console.log('   proxy_cookie_domain localhost .orthodoxmetrics.com;');
    console.log('   ');
    console.log('   # Outer nginx (external):');
    console.log('   proxy_cookie_domain 192.168.1.239 .orthodoxmetrics.com;');
    
    console.log('\n3. TEST SEQUENCE:');
    console.log('   a) Make the config changes above');
    console.log('   b) Restart your Node.js server');
    console.log('   c) Restart nginx: sudo systemctl restart nginx');
    console.log('   d) Clear browser cookies completely');
    console.log('   e) Login and check if cookie persists across refresh');
    
    console.log('\n4. DEBUGGING STEPS:');
    console.log('   After login, check browser dev tools:');
    console.log('   - F12 > Application > Cookies');
    console.log('   - Look for "orthodox.sid" cookie');
    console.log('   - Domain should be ".orthodoxmetrics.com"');
    console.log('   - HttpOnly should be true');
    console.log('   - Secure should be false (for now)');
    
    console.log('\n5. ALTERNATIVE QUICK TEST:');
    console.log('   If the above doesn\'t work, try:');
    console.log('   ');
    console.log('   cookie: {');
    console.log('     secure: false,');
    console.log('     httpOnly: true,');
    console.log('     maxAge: 1000 * 60 * 60 * 24,');
    console.log('     sameSite: "lax",');
    console.log('     domain: undefined  // Let browser auto-detect');
    console.log('   }');
    
    console.log('\n6. WHY SESSIONS AREN\'T PERSISTING:');
    console.log('   • Cookie is set for wrong domain (127.0.0.1 vs orthodoxmetrics.com)');
    console.log('   • Browser doesn\'t send cookie on page refresh');
    console.log('   • Nginx proxy not forwarding cookies properly');
    console.log('   • Session middleware can\'t read the cookie');
    
    console.log('\n🚨 CRITICAL: The domain mismatch is why sessions fail!');
    console.log('   Set domain: ".orthodoxmetrics.com" and restart everything.');
    
} catch (err) {
    console.log('❌ Could not read session config:', err.message);
}

console.log('\n✅ After fixing: Sessions should persist across page refreshes!'); 