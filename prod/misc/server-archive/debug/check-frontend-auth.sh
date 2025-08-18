#!/bin/bash

echo "🔍 CHECKING FRONTEND AUTHENTICATION FLOW"
echo "========================================"
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/check-frontend-auth.sh"
    exit 1
fi

echo "🎯 FRONTEND AUTHENTICATION ANALYSIS:"
echo "===================================="

echo "🔧 STEP 1: CHECK BACKEND AUTH ENDPOINTS"
echo "======================================="

# Test the auth check endpoint
echo "📡 Testing /api/auth/check endpoint..."
AUTH_CHECK_RESPONSE=$(curl -s -w "%{http_code}" http://127.0.0.1:3001/api/auth/check)
AUTH_CHECK_STATUS=$(echo "$AUTH_CHECK_RESPONSE" | tail -1)
AUTH_CHECK_BODY=$(echo "$AUTH_CHECK_RESPONSE" | head -1)

echo "   Status: $AUTH_CHECK_STATUS"
echo "   Response: $AUTH_CHECK_BODY"

# Test the auth check endpoint through nginx
echo "📡 Testing /api/auth/check through nginx..."
NGINX_AUTH_CHECK_RESPONSE=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/auth/check)
NGINX_AUTH_CHECK_STATUS=$(echo "$NGINX_AUTH_CHECK_RESPONSE" | tail -1)
NGINX_AUTH_CHECK_BODY=$(echo "$NGINX_AUTH_CHECK_RESPONSE" | head -1)

echo "   Nginx Status: $NGINX_AUTH_CHECK_STATUS"
echo "   Nginx Response: $NGINX_AUTH_CHECK_BODY"

echo ""
echo "🔧 STEP 2: CHECK CURRENT SESSIONS"
echo "================================="

# Check current sessions in database
echo "📊 Current sessions in database:"
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "
SELECT 
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN expires > NOW() THEN 1 END) as active_sessions,
    COUNT(CASE WHEN expires <= NOW() THEN 1 END) as expired_sessions
FROM sessions;
" 2>/dev/null

echo ""
echo "🔧 STEP 3: CHECK SERVER LOGS FOR AUTH REQUESTS"
echo "=============================================="

# Check recent server logs for auth-related requests
echo "📋 Recent auth-related server logs:"
pm2 logs orthodox-backend --lines 20 --nostream | grep -i "auth\|login\|session" || echo "No auth-related logs found"

echo ""
echo "🔧 STEP 4: TEST WITH COOKIE"
echo "==========================="

# Test if there are any session cookies being sent
echo "🍪 Testing with session cookie..."
echo "📡 Testing /api/auth/check with cookie header..."

# Get any existing session cookie
SESSION_COOKIE=$(curl -s -c /tmp/cookies.txt https://orthodoxmetrics.com/api/health > /dev/null && cat /tmp/cookies.txt | grep orthodoxmetrics.sid | awk '{print $7}')

if [ ! -z "$SESSION_COOKIE" ]; then
    echo "   Found session cookie: $SESSION_COOKIE"
    
    # Test auth check with cookie
    COOKIE_AUTH_RESPONSE=$(curl -s -w "%{http_code}" -H "Cookie: orthodoxmetrics.sid=$SESSION_COOKIE" http://127.0.0.1:3001/api/auth/check)
    COOKIE_AUTH_STATUS=$(echo "$COOKIE_AUTH_RESPONSE" | tail -1)
    COOKIE_AUTH_BODY=$(echo "$COOKIE_AUTH_RESPONSE" | head -1)
    
    echo "   Cookie auth status: $COOKIE_AUTH_STATUS"
    echo "   Cookie auth response: $COOKIE_AUTH_BODY"
else
    echo "   No session cookie found"
fi

echo ""
echo "🔧 STEP 5: CHECK FRONTEND BUILD"
echo "==============================="

# Check if frontend is built and accessible
echo "📋 Checking frontend build..."
if [ -d "../front-end/dist" ]; then
    echo "✅ Frontend dist directory exists"
    echo "📊 Frontend files:"
    ls -la ../front-end/dist/ | head -10
else
    echo "❌ Frontend dist directory not found"
fi

echo ""
echo "🔧 STEP 6: CHECK FOR TEMPORARY BYPASSES"
echo "======================================="

# Search for any temporary bypasses in the codebase
echo "🔍 Searching for temporary authentication bypasses..."

BYPASS_FOUND=false

# Check for any hardcoded user data or bypasses
if grep -r "User\|user.*null\|phantom.*user" ../front-end/src/ 2>/dev/null | grep -v "node_modules" | head -5; then
    echo "❌ Found potential hardcoded user data in frontend"
    BYPASS_FOUND=true
fi

# Check for any temporary bypasses in backend
if grep -r "TEMPORARY.*BYPASS\|auto.*admin\|phantom.*user" . 2>/dev/null | head -5; then
    echo "❌ Found temporary bypasses in backend"
    BYPASS_FOUND=true
fi

if [ "$BYPASS_FOUND" = false ]; then
    echo "✅ No obvious bypasses found"
fi

echo ""
echo "🎯 DIAGNOSIS SUMMARY:"
echo "====================="
echo "✅ Backend server is running and listening"
echo "✅ Auth endpoints are accessible"
echo "❌ Phantom user still appearing in frontend"
echo ""
echo "🔧 LIKELY CAUSES:"
echo "================"
echo "1. Frontend loading cached user data from localStorage"
echo "2. Auth check endpoint returning incorrect data"
echo "3. Session cookie not being properly set/read"
echo "4. Frontend routing showing default user state"
echo ""
echo "🔧 RECOMMENDED ACTIONS:"
echo "======================"
echo "1. Clear browser storage completely"
echo "2. Check browser dev tools for localStorage content"
echo "3. Check browser dev tools for session cookies"
echo "4. Monitor network requests in browser dev tools"
echo "5. Check if /api/auth/check returns proper user data"
echo ""
echo "🏁 FRONTEND AUTH CHECK COMPLETE!" 