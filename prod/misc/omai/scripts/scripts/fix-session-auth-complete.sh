#!/bin/bash

# Comprehensive Session Authentication Fix Script
# This script addresses both PowerShell syntax issues and session auth problems

echo "🔧 COMPREHENSIVE SESSION AUTHENTICATION FIX"
echo "=========================================="
echo ""

# 1. Fix PowerShell command syntax issue
echo "1. 🔧 FIXING POWERSHELL COMMAND SYNTAX"
echo "   The '&&' operator doesn't work in PowerShell. Use these commands instead:"
echo ""
echo "   # Instead of: cd front-end && npm run dev"
echo "   # Use:"
echo "   cd front-end"
echo "   npm run dev"
echo ""
echo "   # Or use PowerShell syntax:"
echo "   cd front-end; npm run dev"
echo ""

# 2. Check current session status
echo "2. 🔍 CHECKING CURRENT SESSION STATUS"
echo "   Running session diagnostics..."

# Check if we're in the right directory
if [ ! -f "server/config/session.js" ]; then
    echo "   ❌ Error: Please run this script from the project root directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "   ✅ Found session configuration"

# 3. Check database connection
echo ""
echo "3. 🗄️  CHECKING DATABASE CONNECTION"
echo "   Testing session store connectivity..."

# Create a temporary test script
cat > /tmp/test_session_db.js << 'EOF'
const { promisePool } = require('./server/config/db');

(async () => {
    try {
        console.log('Testing database connection...');
        const [result] = await promisePool.query('SELECT 1 as test');
        console.log('✅ Database connection successful');
        
        // Check sessions table
        const [sessions] = await promisePool.query('SELECT COUNT(*) as count FROM sessions');
        console.log(`📊 Current sessions in database: ${sessions[0].count}`);
        
        // Check if sessions table exists and has correct structure
        const [tableInfo] = await promisePool.query('DESCRIBE sessions');
        console.log('📋 Sessions table structure:');
        tableInfo.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
})();
EOF

node /tmp/test_session_db.js
rm /tmp/test_session_db.js

# 4. Clean up expired sessions
echo ""
echo "4. 🧹 CLEANING UP EXPIRED SESSIONS"
echo "   Removing old session data..."

cat > /tmp/cleanup_sessions.js << 'EOF'
const { promisePool } = require('./server/config/db');

(async () => {
    try {
        const [result] = await promisePool.query('DELETE FROM sessions WHERE FROM_UNIXTIME(expires) <= NOW()');
        console.log(`✅ Cleaned up ${result.affectedRows} expired sessions`);
        
        const [remaining] = await promisePool.query('SELECT COUNT(*) as count FROM sessions');
        console.log(`📊 Remaining active sessions: ${remaining[0].count}`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Cleanup failed:', err.message);
        process.exit(1);
    }
})();
EOF

node /tmp/cleanup_sessions.js
rm /tmp/cleanup_sessions.js

# 5. Check session configuration
echo ""
echo "5. ⚙️  CHECKING SESSION CONFIGURATION"
echo "   Analyzing session middleware setup..."

cat > /tmp/check_session_config.js << 'EOF'
const sessionConfig = require('./server/config/session.js');

console.log('🔧 Session Configuration Analysis:');
console.log(`   Cookie name: ${sessionConfig.name || 'connect.sid'}`);
console.log(`   Cookie secure: ${sessionConfig.cookie?.secure || false}`);
console.log(`   Cookie httpOnly: ${sessionConfig.cookie?.httpOnly || false}`);
console.log(`   Cookie sameSite: ${sessionConfig.cookie?.sameSite || 'default'}`);
console.log(`   Cookie maxAge: ${sessionConfig.cookie?.maxAge || 'Not set'}`);
console.log(`   Save uninitialized: ${sessionConfig.saveUninitialized || false}`);
console.log(`   Resave: ${sessionConfig.resave || false}`);
console.log(`   Rolling: ${sessionConfig.rolling || false}`);

if (sessionConfig.store) {
    console.log(`   Store type: ${sessionConfig.store.constructor?.name || 'Unknown'}`);
    console.log('   ✅ Session store is configured');
} else {
    console.log('   ❌ Session store is NOT configured');
}

process.exit(0);
EOF

node /tmp/check_session_config.js
rm /tmp/check_session_config.js

# 6. Test session creation
echo ""
echo "6. 🧪 TESTING SESSION CREATION"
echo "   Creating test session to verify functionality..."

cat > /tmp/test_session_creation.js << 'EOF'
const { promisePool } = require('./server/config/db');

(async () => {
    try {
        const testSessionId = 'test-session-' + Date.now();
        const testExpires = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
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
            console.log(`   Status: ${testSession[0].status}`);
            console.log(`   Expires: ${testSession[0].expires_readable}`);
        }
        
        // Clean up
        await promisePool.query('DELETE FROM sessions WHERE session_id = ?', [testSessionId]);
        console.log('✅ Test session cleaned up');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Test session creation failed:', err.message);
        process.exit(1);
    }
})();
EOF

node /tmp/test_session_creation.js
rm /tmp/test_session_creation.js

# 7. Provide restart instructions
echo ""
echo "7. 🔄 RESTART INSTRUCTIONS"
echo "   To fix session issues, restart your backend server:"
echo ""
echo "   # If using PM2:"
echo "   pm2 restart orthodox-backend"
echo ""
echo "   # If running directly:"
echo "   pkill -f 'node.*server'"
echo "   node server/index.js"
echo ""
echo "   # For frontend (use separate terminal):"
echo "   cd front-end"
echo "   npm run dev"
echo ""

# 8. Test authentication endpoints
echo "8. 🧪 TESTING AUTHENTICATION ENDPOINTS"
echo "   After restarting, test these endpoints:"
echo ""
echo "   # Test login:"
echo "   curl -X POST https://orthodoxmetrics.com/api/auth/login \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"email\":\"your@email.com\",\"password\":\"yourpassword\"}' \\"
echo "        -c cookies.txt"
echo ""
echo "   # Test session check:"
echo "   curl https://orthodoxmetrics.com/api/auth/check \\"
echo "        -b cookies.txt"
echo ""

# 9. Browser testing instructions
echo "9. 🌐 BROWSER TESTING CHECKLIST"
echo "   After restarting the server:"
echo "   1. Clear browser cookies for orthodoxmetrics.com"
echo "   2. Open browser dev tools (F12)"
echo "   3. Go to Application > Cookies"
echo "   4. Login to the application"
echo "   5. Check if 'orthodox.sid' cookie is set"
echo "   6. Refresh the page"
echo "   7. Verify cookie persists and user stays logged in"
echo ""

# 10. Common issues and solutions
echo "10. 🚨 COMMON ISSUES AND SOLUTIONS"
echo ""
echo "   ❌ Issue: 'No valid session found'"
echo "   ✅ Solution: Clear browser cookies and restart server"
echo ""
echo "   ❌ Issue: Session not persisting across page refresh"
echo "   ✅ Solution: Check cookie domain settings in nginx"
echo ""
echo "   ❌ Issue: PowerShell '&&' syntax error"
echo "   ✅ Solution: Use ';' instead of '&&' or run commands separately"
echo ""
echo "   ❌ Issue: Database connection errors"
echo "   ✅ Solution: Check .env file and database credentials"
echo ""

echo "🎯 SESSION AUTHENTICATION FIX COMPLETE"
echo "====================================="
echo ""
echo "Next steps:"
echo "1. Restart your backend server"
echo "2. Clear browser cookies"
echo "3. Test login functionality"
echo "4. Use proper PowerShell syntax for commands"
echo ""
echo "If issues persist, check the server logs for:"
echo "- 'Session store connected successfully'"
echo "- 'Session store error:'"
echo "- Database connection messages"
echo "" 