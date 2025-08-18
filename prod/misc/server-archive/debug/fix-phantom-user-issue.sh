#!/bin/bash

echo "🔍 PHANTOM USER AUTHENTICATION FIX"
echo "=================================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/fix-phantom-user-issue.sh"
    exit 1
fi

echo "🎯 DIAGNOSING PHANTOM USER ISSUE:"
echo "=================================="
echo "✅ Session cookie exists (orthodoxmetrics.sid)"
echo "❌ User data not persisting in session"
echo "❌ UI shows 'No email' and generic 'User'"
echo ""

echo "🔧 STEP 1: CLEAR ALL EXISTING SESSIONS"
echo "======================================"
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "DELETE FROM sessions;" 2>/dev/null
echo "✅ Cleared all sessions from database"

echo ""
echo "🔧 STEP 2: VERIFY SESSION CONFIGURATION"
echo "======================================"
echo "Checking session.js configuration..."

if grep -q "name: 'orthodoxmetrics.sid'" config/session.js; then
    echo "✅ Cookie name: orthodoxmetrics.sid"
else
    echo "❌ Cookie name not set correctly"
fi

if grep -q "secure: true" config/session.js; then
    echo "✅ Secure cookies enabled"
else
    echo "❌ Secure cookies not enabled"
fi

if grep -q "domain: '.orthodoxmetrics.com'" config/session.js; then
    echo "✅ Domain set correctly"
else
    echo "❌ Domain not set correctly"
fi

echo ""
echo "🔧 STEP 3: TEST SESSION STORE CONNECTION"
echo "========================================"
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "
SELECT 
    COUNT(*) as session_count,
    MAX(expires) as latest_expiry,
    MIN(expires) as earliest_expiry
FROM sessions;
" 2>/dev/null

echo ""
echo "🔧 STEP 4: RESTART SERVER WITH CLEAN STATE"
echo "=========================================="
echo "Stopping PM2 process..."
pm2 stop orthodox-backend 2>/dev/null

echo "Deleting PM2 process to clear module cache..."
pm2 delete orthodox-backend 2>/dev/null

echo "Starting fresh PM2 process..."
cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server
NODE_ENV=production pm2 start index.js --name orthodox-backend

echo "Waiting for server to start..."
sleep 5

echo ""
echo "🔧 STEP 5: TEST AUTHENTICATION FLOW"
echo "==================================="
echo "Testing server response..."
if curl -s https://orthodoxmetrics.com/api/health > /dev/null 2>&1; then
    echo "✅ Server is responding"
else
    echo "❌ Server may not be responding yet"
fi

echo ""
echo "🎯 MANUAL TESTING STEPS:"
echo "========================"
echo "1. 🧹 Clear ALL browser data:"
echo "   - Open browser dev tools (F12)"
echo "   - Go to Application > Storage"
echo "   - Click 'Clear site data'"
echo "   - Or manually delete orthodoxmetrics.com cookies"
echo ""
echo "2. 🔄 Hard refresh the page (Ctrl+F5)"
echo ""
echo "3. 🔐 Login with valid credentials"
echo ""
echo "4. 🔍 Check session data:"
echo "   - Open dev tools > Application > Cookies"
echo "   - Verify orthodoxmetrics.sid cookie exists"
echo "   - Check Domain: .orthodoxmetrics.com"
echo "   - Check Secure: true"
echo ""
echo "5. 🔍 Check user data:"
echo "   - UI should show actual email, not 'No email'"
echo "   - User profile should show real user info"
echo ""
echo "6. 🔍 Test session persistence:"
echo "   - Refresh the page"
echo "   - User should remain logged in"
echo "   - Session cookie should persist"
echo ""

echo "🔧 STEP 6: DEBUG SESSION ISSUES (if problem persists)"
echo "====================================================="
echo "If the issue continues, run these debug commands:"
echo ""
echo "# Check server logs for session errors:"
echo "pm2 logs orthodox-backend --lines 50"
echo ""
echo "# Test session endpoint directly:"
echo "curl -v https://orthodoxmetrics.com/api/auth/check"
echo ""
echo "# Check database sessions:"
echo "mysql -u orthodoxapps -p orthodoxmetrics_db -e 'SELECT COUNT(*) FROM sessions;'"
echo ""
echo "# Test with browser dev tools:"
echo "1. Open Network tab in dev tools"
echo "2. Login and watch for /api/auth/login request"
echo "3. Check if Set-Cookie header is present"
echo "4. Check if subsequent requests include Cookie header"
echo ""

echo "🎯 EXPECTED RESULTS AFTER FIX:"
echo "=============================="
echo "✅ Session cookie: orthodoxmetrics.sid"
echo "✅ Cookie domain: .orthodoxmetrics.com"
echo "✅ Cookie secure: true"
echo "✅ User email displayed correctly"
echo "✅ Session persists across page refreshes"
echo "✅ No more 'phantom user' with 'No email'"
echo ""

echo "🚨 IF ISSUE PERSISTS:"
echo "====================="
echo "The problem may be:"
echo "1. Nginx proxy not forwarding cookies correctly"
echo "2. Session store (MySQL) connection issues"
echo "3. Frontend not sending cookies with requests"
echo "4. CORS configuration blocking cookies"
echo ""
echo "Run the debug commands above to identify the specific issue."
echo ""

echo "🏁 PHANTOM USER FIX COMPLETE!"
echo "============================" 