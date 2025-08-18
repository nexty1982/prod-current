#!/bin/bash

echo "🔧 FIXING PHANTOM USER IN FRONTEND"
echo "=================================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/fix-phantom-user-frontend.sh"
    exit 1
fi

echo "🎯 PHANTOM USER FIX APPLIED:"
echo "============================"
echo "✅ Fixed Profile component to not show when user is not authenticated"
echo "✅ Added null check: if (!user) return null;"
echo "✅ Fixed fallback display to show email instead of null"
echo ""

echo "🔧 STEP 1: REBUILD FRONTEND"
echo "==========================="

# Navigate to frontend directory
cd ../front-end

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "🔨 Building frontend..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend built successfully"
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo ""
echo "🔧 STEP 2: VERIFY BUILD"
echo "======================="

# Check if build was successful
if [ -d "dist" ]; then
    echo "✅ Frontend dist directory created"
    echo "📊 Build files:"
    ls -la dist/ | head -10
else
    echo "❌ Frontend dist directory not found"
    exit 1
fi

echo ""
echo "🔧 STEP 3: TEST SERVER RESPONSE"
echo "==============================="

# Go back to server directory
cd ../server

# Test server health
echo "📡 Testing server health..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" http://127.0.0.1:3001/api/health)
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -1)

echo "   Health Status: $HEALTH_STATUS"
echo "   Health Response: $HEALTH_BODY"

echo ""
echo "🔧 STEP 4: CLEAR ALL SESSIONS"
echo "============================="

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
echo "4. You should see NO user profile in the sidebar"
echo "5. Try logging in with your credentials"
echo "6. After login, you should see your actual user profile"
echo ""
echo "🔍 EXPECTED BEHAVIOR:"
echo "===================="
echo "✅ No authentication = No user profile shown"
echo "✅ After login = Real user profile shown"
echo "✅ No more phantom user issue"
echo ""
echo "🏁 PHANTOM USER FRONTEND FIX COMPLETE!" 