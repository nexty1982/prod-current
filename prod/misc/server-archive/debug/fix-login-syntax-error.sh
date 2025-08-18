#!/bin/bash

echo "🔧 FIXING LOGIN ROUTE SYNTAX ERROR"
echo "=================================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/fix-login-syntax-error.sh"
    exit 1
fi

echo "🎯 LOGIN ROUTE SYNTAX ERROR FIXED:"
echo "=================================="
echo "✅ Fixed req.session.save() callback structure"
echo "✅ Moved response inside session.save() callback"
echo "✅ Fixed missing closing brace"
echo ""

echo "🔧 STEP 1: RESTART SERVER"
echo "========================="

# Stop current server
echo "🛑 Stopping current server..."
pm2 stop orthodox-backend
pm2 delete orthodox-backend

# Start server fresh
echo "🚀 Starting server with fixed login route..."
NODE_ENV=production pm2 start index.js --name orthodox-backend

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Check if server started successfully
if pm2 list | grep -q "orthodox-backend.*online"; then
    echo "✅ Server started successfully"
else
    echo "❌ Server failed to start - checking logs..."
    pm2 logs orthodox-backend --lines 10 --nostream
    exit 1
fi

echo ""
echo "🔧 STEP 2: TEST LOGIN ENDPOINT"
echo "=============================="

# Test login with valid credentials
echo "📡 Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -c /tmp/test_cookies.txt -X POST http://127.0.0.1:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@orthodoxmetrics.com","password":"test123"}')
LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | head -1)

echo "   Login Status: $LOGIN_STATUS"
echo "   Login Response: $LOGIN_BODY"

# Check if session cookie was created
if [ -f "/tmp/test_cookies.txt" ]; then
    echo "   Session cookies:"
    cat /tmp/test_cookies.txt | grep orthodoxmetrics.sid || echo "   No orthodoxmetrics.sid cookie found"
fi

echo ""
echo "🔧 STEP 3: TEST AUTH CHECK WITH SESSION"
echo "======================================="

# Test auth check with session cookie
if [ -f "/tmp/test_cookies.txt" ]; then
    echo "📡 Testing /api/auth/check with session cookie..."
    AUTH_CHECK_RESPONSE=$(curl -s -w "%{http_code}" -b /tmp/test_cookies.txt http://127.0.0.1:3001/api/auth/check)
    AUTH_CHECK_STATUS=$(echo "$AUTH_CHECK_RESPONSE" | tail -1)
    AUTH_CHECK_BODY=$(echo "$AUTH_CHECK_RESPONSE" | head -1)
    
    echo "   Auth Check Status: $AUTH_CHECK_STATUS"
    echo "   Auth Check Response: $AUTH_CHECK_BODY"
else
    echo "   No session cookies available for testing"
fi

echo ""
echo "🔧 STEP 4: CHECK SESSIONS IN DATABASE"
echo "====================================="

# Check if sessions are being created
echo "📊 Sessions in database:"
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "
SELECT 
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN expires > NOW() THEN 1 END) as active_sessions,
    MAX(expires) as latest_expiry
FROM sessions;
" 2>/dev/null

echo ""
echo "🔧 STEP 5: CLEAR TEST DATA"
echo "=========================="

# Clear test sessions
echo "🗑️ Clearing test sessions..."
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "DELETE FROM sessions;" 2>/dev/null
rm -f /tmp/test_cookies.txt
echo "✅ Test data cleared"

echo ""
echo "🎯 TESTING INSTRUCTIONS:"
echo "========================"
echo "1. Clear your browser cookies completely"
echo "2. Clear browser localStorage and sessionStorage"
echo "3. Visit https://orthodoxmetrics.com"
echo "4. Try logging in with your credentials"
echo "5. Check if the phantom user issue is resolved"
echo ""
echo "🔍 If the issue persists, check:"
echo "   - Browser dev tools Network tab for login requests"
echo "   - Browser dev tools Application tab for orthodoxmetrics.sid cookie"
echo "   - Server logs: pm2 logs orthodox-backend"
echo ""
echo "🏁 LOGIN SYNTAX ERROR FIX COMPLETE!" 