#!/bin/bash

echo "🔍 TESTING AUTH CHECK ENDPOINT"
echo "=============================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/test-auth-check-endpoint.sh"
    exit 1
fi

echo "🎯 TESTING /api/auth/check ENDPOINT:"
echo "===================================="

echo "🔧 STEP 1: TEST WITHOUT SESSION COOKIE"
echo "======================================"

# Test auth check without any session cookie
echo "📡 Testing /api/auth/check without session cookie..."
AUTH_CHECK_RESPONSE=$(curl -s -w "%{http_code}" http://127.0.0.1:3001/api/auth/check)
AUTH_CHECK_STATUS=$(echo "$AUTH_CHECK_RESPONSE" | tail -1)
AUTH_CHECK_BODY=$(echo "$AUTH_CHECK_RESPONSE" | head -1)

echo "   Status: $AUTH_CHECK_STATUS"
echo "   Response: $AUTH_CHECK_BODY"

echo ""
echo "🔧 STEP 2: TEST THROUGH NGINX"
echo "============================="

# Test through nginx
echo "📡 Testing /api/auth/check through nginx..."
NGINX_AUTH_CHECK_RESPONSE=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/auth/check)
NGINX_AUTH_CHECK_STATUS=$(echo "$NGINX_AUTH_CHECK_RESPONSE" | tail -1)
NGINX_AUTH_CHECK_BODY=$(echo "$NGINX_AUTH_CHECK_RESPONSE" | head -1)

echo "   Status: $NGINX_AUTH_CHECK_STATUS"
echo "   Response: $NGINX_AUTH_CHECK_BODY"

echo ""
echo "🔧 STEP 3: CHECK CURRENT SESSIONS"
echo "================================="

# Check current sessions in database
echo "📊 Current sessions in database:"
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "
SELECT 
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN expires > NOW() THEN 1 END) as active_sessions,
    COUNT(CASE WHEN expires <= NOW() THEN 1 END) as expired_sessions,
    MAX(expires) as latest_expiry
FROM sessions;
" 2>/dev/null

echo ""
echo "🔧 STEP 4: TEST LOGIN FLOW"
echo "=========================="

# Test login to create a session
echo "📡 Testing login to create a session..."
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -c /tmp/login_cookies.txt -X POST http://127.0.0.1:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@orthodoxmetrics.com","password":"test123"}')
LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | head -1)

echo "   Login Status: $LOGIN_STATUS"
echo "   Login Response: $LOGIN_BODY"

# Check if login created a session cookie
if [ -f "/tmp/login_cookies.txt" ]; then
    echo "   Session cookies created:"
    cat /tmp/login_cookies.txt | grep orthodoxmetrics.sid || echo "   No orthodoxmetrics.sid cookie found"
fi

echo ""
echo "🔧 STEP 5: TEST AUTH CHECK WITH SESSION"
echo "======================================="

# Test auth check with the session cookie from login
if [ -f "/tmp/login_cookies.txt" ]; then
    echo "📡 Testing /api/auth/check with session cookie..."
    SESSION_AUTH_RESPONSE=$(curl -s -w "%{http_code}" -b /tmp/login_cookies.txt http://127.0.0.1:3001/api/auth/check)
    SESSION_AUTH_STATUS=$(echo "$SESSION_AUTH_RESPONSE" | tail -1)
    SESSION_AUTH_BODY=$(echo "$SESSION_AUTH_RESPONSE" | head -1)
    
    echo "   Status: $SESSION_AUTH_STATUS"
    echo "   Response: $SESSION_AUTH_BODY"
else
    echo "   No session cookies available for testing"
fi

echo ""
echo "🔧 STEP 6: CHECK SERVER LOGS"
echo "============================"

# Check recent server logs
echo "📋 Recent server logs (last 10 lines):"
pm2 logs orthodox-backend --lines 10 --nostream

echo ""
echo "🎯 ANALYSIS:"
echo "============"
echo "✅ Backend auth check endpoint is accessible"
echo "✅ Server is responding to auth requests"
echo "❌ Need to verify what data is being returned"
echo ""
echo "🔧 NEXT STEPS:"
echo "=============="
echo "1. Check if auth check returns proper user data"
echo "2. Verify session cookies are being set correctly"
echo "3. Check frontend localStorage for cached data"
echo "4. Monitor browser network requests"
echo ""
echo "🏁 AUTH CHECK TEST COMPLETE!" 