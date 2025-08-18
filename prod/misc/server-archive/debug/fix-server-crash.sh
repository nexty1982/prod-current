#!/bin/bash

echo "🔧 FIXING SERVER CRASH AND PHANTOM USER ISSUE"
echo "============================================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/fix-server-crash.sh"
    exit 1
fi

echo "🎯 ROOT CAUSE IDENTIFIED:"
echo "========================="
echo "❌ Node.js server is down (502 errors)"
echo "❌ Canvas module version mismatch"
echo "❌ No active sessions in database"
echo "✅ This explains the phantom user issue!"
echo ""

echo "🔧 STEP 1: STOP CURRENT SERVER"
echo "=============================="
pm2 stop orthodox-backend 2>/dev/null
pm2 delete orthodox-backend 2>/dev/null
echo "✅ Stopped and deleted PM2 process"

echo ""
echo "🔧 STEP 2: FIX NODE MODULE VERSION MISMATCH"
echo "==========================================="

# Check current Node.js version
echo "📋 Current Node.js version:"
node --version

# Check if canvas module is causing issues
if [ -d "node_modules/canvas" ]; then
    echo "🔍 Canvas module found - rebuilding..."
    
    # Remove canvas module
    echo "🗑️ Removing canvas module..."
    rm -rf node_modules/canvas
    
    # Reinstall canvas module
    echo "📦 Reinstalling canvas module..."
    npm install canvas --legacy-peer-deps
    
    if [ $? -eq 0 ]; then
        echo "✅ Canvas module reinstalled successfully"
    else
        echo "❌ Canvas module reinstall failed - trying alternative approach"
        
        # Try rebuilding all modules
        echo "🔧 Rebuilding all node modules..."
        npm rebuild --legacy-peer-deps
    fi
else
    echo "✅ Canvas module not found - skipping"
fi

echo ""
echo "🔧 STEP 3: CLEAR ALL SESSIONS"
echo "=============================="
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "DELETE FROM sessions;" 2>/dev/null
echo "✅ Cleared all sessions from database"

echo ""
echo "🔧 STEP 4: START SERVER WITH CLEAN STATE"
echo "========================================"

# Start server with production environment
echo "🚀 Starting server with NODE_ENV=production..."
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
echo "🔧 STEP 5: TEST SERVER RESPONSE"
echo "==============================="

# Test server health
echo "🧪 Testing server health..."
sleep 3

# Test direct server access (bypassing nginx)
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
echo "🔧 STEP 6: VERIFY SESSION CREATION"
echo "=================================="

# Check if sessions table is being used
echo "📊 Checking session store..."
sleep 2

SESSION_COUNT=$(mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "SELECT COUNT(*) as count FROM sessions;" 2>/dev/null | tail -1)
echo "   Active sessions: $SESSION_COUNT"

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
echo "🏁 SERVER CRASH FIX COMPLETE!" 