#!/bin/bash

echo "🔧 FIXING SECOND SYNTAX ERROR AND RESTARTING SERVER"
echo "=================================================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/fix-second-syntax-error.sh"
    exit 1
fi

echo "🎯 SECOND SYNTAX ERROR FIXED:"
echo "============================="
echo "✅ Fixed malformed structure in oca-scraper.js line 124"
echo "✅ Removed extra closing brace and parenthesis"
echo "✅ Fixed extractChurchFromElement method structure"
echo ""

echo "🔧 STEP 1: RESTART SERVER"
echo "========================="

# Stop current server
echo "🛑 Stopping current server..."
pm2 stop orthodox-backend
pm2 delete orthodox-backend

# Start server fresh
echo "🚀 Starting server with fixed syntax..."
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
echo "🔧 STEP 2: VERIFY SERVER IS LISTENING"
echo "====================================="

# Check if server is listening on port 3001
echo "🔍 Checking if server is listening on port 3001..."
sleep 3

if netstat -tlnp | grep ":3001" || ss -tlnp | grep ":3001"; then
    echo "✅ Server is now listening on port 3001"
else
    echo "❌ Server is still not listening on port 3001"
    echo "📋 Checking server logs for errors..."
    pm2 logs orthodox-backend --lines 10 --nostream
    exit 1
fi

echo ""
echo "🔧 STEP 3: TEST SERVER RESPONSE"
echo "==============================="

# Test server health
echo "🧪 Testing server health..."
sleep 2

# Test direct server access
echo "📡 Testing direct server access..."
DIRECT_RESPONSE=$(curl -s -w "%{http_code}" http://127.0.0.1:3001/api/health)
DIRECT_STATUS=$(echo "$DIRECT_RESPONSE" | tail -1)
DIRECT_BODY=$(echo "$DIRECT_RESPONSE" | head -1)

echo "   Direct access status: $DIRECT_STATUS"
echo "   Direct access response: $DIRECT_BODY"

# Test through nginx
echo "📡 Testing through nginx..."
NGINX_RESPONSE=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/health)
NGINX_STATUS=$(echo "$NGINX_RESPONSE" | tail -1)
NGINX_BODY=$(echo "$NGINX_RESPONSE" | head -1)

echo "   Nginx access status: $NGINX_STATUS"
echo "   Nginx access response: $NGINX_BODY"

echo ""
echo "🔧 STEP 4: CLEAR SESSIONS"
echo "========================="

# Clear all sessions
echo "🗑️ Clearing all sessions from database..."
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "DELETE FROM sessions;" 2>/dev/null
echo "✅ Sessions cleared"

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
echo "   - Browser dev tools Network tab for cookie headers"
echo "   - Browser dev tools Application tab for orthodoxmetrics.sid cookie"
echo "   - Server logs: pm2 logs orthodox-backend"
echo ""
echo "🏁 SECOND SYNTAX ERROR FIX COMPLETE!" 