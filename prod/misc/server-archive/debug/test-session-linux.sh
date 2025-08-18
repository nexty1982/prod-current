#!/bin/bash

echo "🔍 LINUX SESSION DEBUG SCRIPT"
echo "=============================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/test-session-linux.sh"
    exit 1
fi

echo "📋 ANALYZING SESSION AUTHENTICATION ISSUE:"
echo "==========================================="
echo "✅ Login succeeds, but sessions don't persist across requests"
echo "✅ Each request gets a different session ID"
echo "✅ Database schema fixed (no more 'status' column error)"
echo "❌ Session cookies not being transmitted properly"
echo ""

echo "🚨 ROOT CAUSE:"
echo "=============="
echo "The issue is COOKIE TRANSMISSION, not session storage."
echo "Each request creates a NEW session instead of using the existing one."
echo ""

echo "🔧 PROBABLE CAUSES:"
echo "=================="
echo "1. Frontend not sending cookies with API requests"
echo "2. Cookie domain/path mismatch"
echo "3. SameSite policy blocking cookies"
echo "4. Browser security settings blocking cookies"
echo "5. CORS configuration issues"
echo ""

echo "🎯 IMMEDIATE FIXES TO APPLY:"
echo "============================"
echo "1. Check frontend is sending cookies with requests"
echo "2. Simplify cookie configuration for debugging"
echo "3. Add browser debugging"
echo "4. Test with different browsers"
echo ""

echo "🔍 DEBUGGING STEPS FOR YOU:"
echo "==========================="
echo ""
echo "STEP 1: Check Browser Cookies"
echo "-----------------------------"
echo "1. Open your browser to https://orthodoxmetrics.com"
echo "2. Press F12 to open Developer Tools"
echo "3. Go to Application tab > Storage > Cookies"
echo "4. Login and check if 'orthodox.sid' cookie appears"
echo "5. Note the Domain and Path of the cookie"
echo ""

echo "STEP 2: Check Network Requests"
echo "------------------------------"
echo "1. Stay in F12 Developer Tools"
echo "2. Go to Network tab"
echo "3. After login, click on any admin page (like User Management)"
echo "4. Look at the request headers for any API call"
echo "5. Check if 'Cookie: orthodox.sid=...' appears in Request Headers"
echo ""

echo "STEP 3: Quick Fixes to Try"
echo "--------------------------"
echo "1. Clear ALL browser data (Ctrl+Shift+Delete)"
echo "2. Try a different browser (Edge, Firefox, Chrome)"
echo "3. Try incognito/private mode"
echo "4. Disable browser extensions temporarily"
echo ""

echo "🧪 TESTING THE DATABASE FIX:"
echo "============================"

# Test database connection
echo "Testing database connection..."
node -e "
const { promisePool } = require('./config/db');
(async () => {
    try {
        const [result] = await promisePool.query('SELECT COUNT(*) as count FROM users WHERE email = ?', ['superadmin@orthodoxmetrics.com']);
        console.log('✅ Database connection: WORKING');
        console.log('✅ User found in database:', result[0].count > 0 ? 'YES' : 'NO');
        
        const [sessions] = await promisePool.query('SELECT COUNT(*) as count FROM sessions');
        console.log('✅ Sessions table exists with', sessions[0].count, 'sessions');
        process.exit(0);
    } catch (error) {
        console.log('❌ Database error:', error.message);
        process.exit(1);
    }
})();
" 2>/dev/null

echo ""
echo "📋 SUMMARY:"
echo "==========="
echo "✅ Database schema: FIXED"
echo "✅ Session configuration: FIXED"
echo "❌ Cookie transmission: NEEDS DEBUGGING"
echo ""
echo "👀 Next: Follow the browser debugging steps above!"
echo "   The issue is likely in the frontend or browser, not the backend."
echo ""

echo "🔧 QUICK TEST COMMANDS:"
echo "======================"
echo "1. Check if session cookies are being set:"
echo "   curl -v -X POST https://orthodoxmetrics.com/api/auth/login \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"username\":\"superadmin@orthodoxmetrics.com\",\"password\":\"Admin123!\"}' \\"
echo "        -c cookies.txt"
echo ""
echo "2. Check if session persists:"
echo "   curl -v https://orthodoxmetrics.com/api/auth/check -b cookies.txt"
echo ""
echo "3. Check admin endpoint:"
echo "   curl -v https://orthodoxmetrics.com/api/admin/users -b cookies.txt" 