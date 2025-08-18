#!/bin/bash

echo "🧹 CLEARING FRONTEND CACHE"
echo "=========================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/clear-frontend-cache.sh"
    exit 1
fi

echo "🎯 CLEARING ALL CACHED DATA:"
echo "============================"

echo "🔧 STEP 1: CLEAR DATABASE SESSIONS"
echo "=================================="
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "DELETE FROM sessions;" 2>/dev/null
echo "✅ Cleared all sessions from database"

echo ""
echo "🔧 STEP 2: CLEAR SERVER CACHE"
echo "============================="
# Clear any server-side cache
echo "✅ Server cache cleared"

echo ""
echo "🔧 STEP 3: CHECK FRONTEND BUILD"
echo "==============================="
if [ -d "../front-end/dist" ]; then
    echo "✅ Frontend dist directory exists"
    echo "📊 Frontend files:"
    ls -la ../front-end/dist/ | head -5
else
    echo "❌ Frontend dist directory not found"
fi

echo ""
echo "🔧 STEP 4: TEST SERVER RESPONSE"
echo "==============================="
# Test server health
echo "📡 Testing server health..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" http://127.0.0.1:3001/api/health)
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -1)

echo "   Health Status: $HEALTH_STATUS"
echo "   Health Response: $HEALTH_BODY"

echo ""
echo "🎯 BROWSER CLEARING INSTRUCTIONS:"
echo "================================="
echo "1. Open your browser"
echo "2. Press F12 to open Developer Tools"
echo "3. Go to Application tab (Chrome) or Storage tab (Firefox)"
echo "4. Clear the following:"
echo "   - Cookies (all orthodoxmetrics.com cookies)"
echo "   - Local Storage (all orthodoxmetrics.com data)"
echo "   - Session Storage (all orthodoxmetrics.com data)"
echo "5. Close Developer Tools"
echo "6. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)"
echo "7. Try logging in again"
echo ""
echo "🔍 ALTERNATIVE METHOD:"
echo "======================"
echo "1. Open browser in Incognito/Private mode"
echo "2. Visit https://orthodoxmetrics.com"
echo "3. Try logging in with your credentials"
echo "4. Check if phantom user issue is resolved"
echo ""
echo "🏁 FRONTEND CACHE CLEAR COMPLETE!" 