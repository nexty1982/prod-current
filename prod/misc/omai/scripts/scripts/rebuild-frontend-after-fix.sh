#!/bin/bash

# 🔧 Rebuild Frontend After OMBigBook Fix
# =====================================
# This script rebuilds the frontend after temporarily disabling the BigBookCustomComponentViewer
# to fix the "ReferenceError: rt is not defined" error.

echo "🔧 Rebuilding Frontend After OMBigBook Fix"
echo "=========================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting frontend rebuild process..."

cd front-end

echo ""
echo "📋 Current directory: $(pwd)"
echo ""

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ ERROR: package.json not found. Are you in the correct directory?"
    exit 1
fi

echo "🔍 Installing dependencies with legacy peer deps..."
echo "Command: npm install --legacy-peer-deps"
echo ""
npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo "❌ ERROR: npm install failed"
    exit 1
fi

echo ""
echo "🔨 Building frontend with increased memory limit..."
echo "Command: NODE_OPTIONS=\"--max-old-space-size=4096\" npm run build"
echo ""
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Frontend rebuild completed successfully!"
    echo ""
    echo "🧪 Next Steps:"
    echo "1. Restart your server (or use restart-server-for-bigbook.sh)"
    echo "2. Navigate to the Big Book in your browser"
    echo "3. Check if the 'ReferenceError: rt is not defined' is fixed"
    echo "4. Test the Custom Components tab (should now show temp message)"
    echo ""
    echo "📋 What was fixed:"
    echo "• Temporarily disabled BigBookCustomComponentViewer import"
    echo "• Replaced component viewer with debug message"
    echo "• This should eliminate the runtime error"
    echo ""
else
    echo "❌ ERROR: Frontend build failed"
    echo ""
    echo "💡 Troubleshooting:"
    echo "1. Check the build logs above for specific errors"
    echo "2. Ensure you have enough free disk space"
    echo "3. Try clearing node_modules and rebuilding:"
    echo "   rm -rf node_modules package-lock.json"
    echo "   npm install --legacy-peer-deps"
    echo "   NODE_OPTIONS=\"--max-old-space-size=4096\" npm run build"
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Script completed" 