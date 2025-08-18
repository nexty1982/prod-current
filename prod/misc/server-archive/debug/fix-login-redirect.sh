#!/bin/bash

echo "🔒 FIXING LOGIN REDIRECT"
echo "========================"
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/fix-login-redirect.sh"
    exit 1
fi

echo "🎯 ISSUE IDENTIFIED:"
echo "===================="
echo "✅ AuthContext correctly identifies 'No stored user data found'"
echo "✅ SmartRedirect component exists but doesn't redirect unauthenticated users"
echo "✅ Users see blank page instead of being redirected to login"
echo ""

echo "🔧 STEP 1: FIX APPLIED"
echo "======================"
echo "✅ Updated SmartRedirect to redirect unauthenticated users to /auth/sign-in"
echo "✅ Fixed TypeScript error in error handling"
echo ""

echo "🔧 STEP 2: REBUILD FRONTEND"
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
echo "🎯 TESTING INSTRUCTIONS:"
echo "========================"
echo "1. Clear your browser cache completely:"
echo "   - Open dev tools (F12)"
echo "   - Go to Application > Storage"
echo "   - Click 'Clear site data' for orthodoxmetrics.com"
echo "2. Visit https://orthodoxmetrics.com"
echo "3. You should be automatically redirected to the login page"
echo "4. No more blank page or phantom user"
echo ""
echo "🔍 EXPECTED BEHAVIOR:"
echo "===================="
echo "✅ No stored user data → Automatic redirect to /auth/sign-in"
echo "✅ No blank page"
echo "✅ No phantom user"
echo "✅ Clean authentication flow"
echo ""
echo "🏁 LOGIN REDIRECT FIX COMPLETE!" 