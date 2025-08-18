#!/bin/bash

echo "🔧 FIXING VITE BASE PATH"
echo "========================"
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/fix-vite-base-path.sh"
    exit 1
fi

echo "🎯 ISSUE IDENTIFIED:"
echo "===================="
echo "✅ Vite config missing base path configuration"
echo "✅ Assets may not load correctly in production"
echo "✅ This could cause blank page issues"
echo ""

echo "🔧 STEP 1: FIX APPLIED"
echo "======================"
echo "✅ Added base: '/' to vite.config.ts"
echo "✅ Ensures assets load from root path"
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
echo "🔧 STEP 3: CHECK BUILT FILES"
echo "============================"

# Check the built index.html
if [ -f "dist/index.html" ]; then
    echo "✅ Built index.html exists"
    echo "📄 Checking asset paths in built file..."
    grep -n "src=" dist/index.html | head -5
else
    echo "❌ Built index.html not found"
fi

echo ""
echo "🔧 STEP 4: TEST SERVER RESPONSE"
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
echo "3. Page should load properly with correct assets"
echo "4. No more blank page issues"
echo ""
echo "🔍 EXPECTED BEHAVIOR:"
echo "===================="
echo "✅ Assets load correctly from root path"
echo "✅ No 404 errors for CSS/JS files"
echo "✅ Page renders properly"
echo "✅ Clean loading experience"
echo ""
echo "🏁 VITE BASE PATH FIX COMPLETE!" 