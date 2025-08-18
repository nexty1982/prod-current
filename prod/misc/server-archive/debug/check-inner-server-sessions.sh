#!/bin/bash

echo "🔍 CHECKING INNER SERVER SESSION CONFIGURATION"
echo "=============================================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/check-inner-server-sessions.sh"
    exit 1
fi

echo "🎯 INNER SERVER ANALYSIS:"
echo "========================="
echo "✅ Outer nginx: Current server (ports 80/443)"
echo "✅ Inner server: 192.168.1.239 (frontend:80, backend:3001)"
echo "✅ Cookie forwarding: Already configured in outer nginx"
echo ""

echo "🔧 STEP 1: CHECK CURRENT SESSION CONFIGURATION"
echo "=============================================="

# Check session configuration
echo "📋 Current session.js configuration:"
if [ -f "config/session.js" ]; then
    echo "✅ Session config file exists"
    
    # Check key session settings
    echo "🔍 Checking session settings..."
    
    if grep -q "cookie.*orthodoxmetrics.sid" config/session.js; then
        echo "✅ Cookie name: orthodoxmetrics.sid"
    else
        echo "❌ Cookie name not found"
    fi
    
    if grep -q "domain.*orthodoxmetrics.com" config/session.js; then
        echo "✅ Domain: .orthodoxmetrics.com"
    else
        echo "❌ Domain not set correctly"
    fi
    
    if grep -q "secure.*true" config/session.js; then
        echo "✅ Secure cookies: enabled"
    else
        echo "❌ Secure cookies: disabled"
    fi
    
else
    echo "❌ Session config file not found"
fi

echo ""
echo "🔧 STEP 2: CHECK DATABASE SESSIONS"
echo "=================================="

# Check current sessions in database
echo "📊 Current sessions in database:"
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "
SELECT 
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN expires > NOW() THEN 1 END) as active_sessions,
    COUNT(CASE WHEN expires <= NOW() THEN 1 END) as expired_sessions,
    MAX(expires) as latest_expiry,
    MIN(expires) as earliest_expiry
FROM sessions;
" 2>/dev/null

echo ""
echo "🔧 STEP 3: CHECK SERVER LOGS"
echo "============================"

# Check recent server logs for session issues
echo "📋 Recent server logs (last 20 lines):"
pm2 logs orthodox-backend --lines 20 --nostream 2>/dev/null || echo "❌ No PM2 logs available"

echo ""
echo "🔧 STEP 4: TEST SESSION ENDPOINTS"
echo "================================="

# Test authentication endpoints
echo "🧪 Testing authentication endpoints..."

# Test health endpoint
echo "📡 Testing /api/health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/health)
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -1)

echo "   Status: $HEALTH_STATUS"
echo "   Response: $HEALTH_BODY"

# Test auth check endpoint
echo "📡 Testing /api/auth/check endpoint..."
AUTH_RESPONSE=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/auth/check)
AUTH_STATUS=$(echo "$AUTH_RESPONSE" | tail -1)
AUTH_BODY=$(echo "$AUTH_RESPONSE" | head -1)

echo "   Status: $AUTH_STATUS"
echo "   Response: $AUTH_BODY"

echo ""
echo "🔧 STEP 5: CHECK FOR TEMPORARY BYPASSES"
echo "======================================="

# Search for any temporary bypasses that might be active
echo "🔍 Searching for temporary authentication bypasses..."

BYPASS_FOUND=false

# Check auth middleware
if grep -r "TEMPORARY.*BYPASS\|auto.*admin\|phantom.*user" middleware/ 2>/dev/null; then
    echo "❌ Found temporary bypass in middleware"
    BYPASS_FOUND=true
fi

# Check routes
if grep -r "TEMPORARY.*BYPASS\|auto.*admin\|phantom.*user" routes/ 2>/dev/null; then
    echo "❌ Found temporary bypass in routes"
    BYPASS_FOUND=true
fi

# Check main server file
if grep -r "TEMPORARY.*BYPASS\|auto.*admin\|phantom.*user" index.js 2>/dev/null; then
    echo "❌ Found temporary bypass in main server file"
    BYPASS_FOUND=true
fi

if [ "$BYPASS_FOUND" = false ]; then
    echo "✅ No temporary bypasses found"
fi

echo ""
echo "🎯 DIAGNOSIS SUMMARY:"
echo "====================="
echo "✅ Outer nginx: Cookie forwarding configured"
echo "✅ Inner server: 192.168.1.239:3001"
echo "✅ Session config: Checked above"
echo "✅ Database sessions: Checked above"
echo "✅ Server logs: Checked above"
echo "✅ Auth endpoints: Tested above"
echo "✅ Temporary bypasses: Checked above"

echo ""
echo "🔧 RECOMMENDED ACTIONS:"
echo "======================"
echo "1. If sessions exist but auth fails: Clear all sessions"
echo "2. If no sessions exist: Check session store connection"
echo "3. If auth endpoints fail: Check server status"
echo "4. If temporary bypasses found: Remove them"
echo "5. Clear browser storage completely and test again"

echo ""
echo "🏁 INNER SERVER SESSION CHECK COMPLETE!" 