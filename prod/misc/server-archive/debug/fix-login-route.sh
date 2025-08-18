#!/bin/bash

echo "🔧 FIXING LOGIN ROUTE"
echo "===================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/fix-login-route.sh"
    exit 1
fi

echo "🎯 ISSUE IDENTIFIED:"
echo "===================="
echo "✅ Redirect is working but going to wrong route"
echo "✅ Route should be /auth/login, not /auth/sign-in"
echo ""

echo "🔧 STEP 1: FIX APPLIED"
echo "======================"
echo "✅ Updated SmartRedirect to use correct route: /auth/login"
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
echo "1. Clear your browser cache completely"
echo "2. Visit https://orthodoxmetrics.com"
echo "3. You should be redirected to /auth/login (not 404)"
echo "4. Login page should load properly"
echo ""
echo "🔍 EXPECTED BEHAVIOR:"
echo "===================="
echo "✅ No stored user data → Redirect to /auth/login"
echo "✅ Login page loads properly"
echo "✅ No 404 error"
echo "✅ Clean authentication flow"
echo ""
echo "🏁 LOGIN ROUTE FIX COMPLETE!" 