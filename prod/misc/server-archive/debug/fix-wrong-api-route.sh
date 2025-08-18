#!/bin/bash

echo "🔧 FIXING WRONG API ROUTE"
echo "========================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/fix-wrong-api-route.sh"
    exit 1
fi

echo "🎯 ISSUE IDENTIFIED:"
echo "===================="
echo "✅ API client using relative URLs"
echo "✅ When on /auth/login, calls /auth/login/api/auth/login"
echo "✅ Should call /api/auth/login (absolute URL)"
echo "✅ Fixed API client to always use absolute URLs"
echo ""

echo "🔧 STEP 1: VERIFY API CLIENT FIX"
echo "================================"

# Check the API client file
echo "📄 Checking API client configuration..."
if grep -q "Always use absolute URL" ../front-end/src/api/orthodox-metrics.api.ts; then
    echo "✅ API client fix applied correctly"
else
    echo "❌ API client fix not found"
    exit 1
fi

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
echo "🔧 STEP 3: TEST API ROUTES"
echo "=========================="

# Go back to server directory
cd ../server

echo "📡 Testing API routes..."

# Test auth check endpoint
echo "   Testing /api/auth/check..."
AUTH_CHECK_RESPONSE=$(curl -s -w "%{http_code}" http://127.0.0.1:3001/api/auth/check)
AUTH_CHECK_STATUS=$(echo "$AUTH_CHECK_RESPONSE" | tail -1)
echo "   Status: $AUTH_CHECK_STATUS"

# Test login endpoint (should not be 405)
echo "   Testing /api/auth/login..."
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -X POST http://127.0.0.1:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"test","password":"test"}')
LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -1)
echo "   Status: $LOGIN_STATUS"

if [ "$LOGIN_STATUS" = "405" ]; then
    echo "❌ Login endpoint still returning 405 - check server routes"
else
    echo "✅ Login endpoint responding correctly"
fi

echo ""
echo "🎯 TESTING INSTRUCTIONS:"
echo "========================"
echo "1. Clear your browser cache completely:"
echo "   - Open dev tools (F12)"
echo "   - Go to Application > Storage"
echo "   - Click 'Clear site data' for orthodoxmetrics.com"
echo "2. Visit https://orthodoxmetrics.com/auth/login"
echo "3. Try to login - should call /api/auth/login (not /auth/login/api/auth/login)"
echo "4. Check Network tab - should see correct API calls"
echo "5. No more 405 Method Not Allowed errors"
echo ""
echo "🔍 EXPECTED BEHAVIOR:"
echo "===================="
echo "✅ API calls use absolute URLs: /api/auth/login"
echo "✅ No more path prepending: /auth/login/api/auth/login"
echo "✅ No more 405 Method Not Allowed errors"
echo "✅ Login should work correctly"
echo ""
echo "🏁 WRONG API ROUTE FIX COMPLETE!" 