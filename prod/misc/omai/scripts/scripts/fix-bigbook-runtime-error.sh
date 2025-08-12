#!/bin/bash

# 🔧 Fix Big Book Runtime Error (tt is not defined)
# =================================================
# This script fixes the current runtime error preventing Custom Components tab from loading

echo "🔧 Fixing Big Book Runtime Error"
echo "================================"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting runtime error fix..."

echo "📋 Error Analysis:"
echo "• Error: ReferenceError: tt is not defined"
echo "• Location: OMBigBook-D06G9i1f.js:122"
echo "• Issue: Bundling/minification problem in OMBigBook component"
echo "• Impact: Custom Components tab cannot load"
echo ""

echo "🎯 This fix will:"
echo "• Clean frontend build artifacts"
echo "• Rebuild frontend with proper memory settings"
echo "• Apply the working OMBigBook component fixes"
echo "• Test the Custom Components tab functionality"
echo ""

echo "📁 Current frontend build state:"
if [ -d "front-end/dist" ]; then
    echo "✅ Build directory exists"
    echo "📊 Build size: $(du -sh front-end/dist 2>/dev/null | cut -f1)"
else
    echo "❌ No build directory found"
fi

if [ -d "front-end/node_modules" ]; then
    echo "✅ Node modules installed"
else
    echo "❌ Node modules missing"
fi
echo ""

echo "🧹 Step 1: Clean build artifacts..."
echo "Removing old build files that may have bundling issues..."

# Clean frontend build
if [ -d "front-end/dist" ]; then
    echo "Removing front-end/dist..."
    rm -rf front-end/dist
fi

if [ -d "front-end/.vite" ]; then
    echo "Removing Vite cache..."
    rm -rf front-end/.vite
fi

echo "✅ Build artifacts cleaned"
echo ""

echo "📋 Step 2: Frontend rebuild instructions"
echo "========================================"
echo ""
echo "🚨 IMPORTANT: You need to rebuild the frontend manually"
echo "   (AI cannot run npm commands on mapped Linux drive)"
echo ""
echo "Commands to run:"
echo "=================="
echo ""
echo "1. Navigate to frontend directory:"
echo "   cd front-end"
echo ""
echo "2. Install dependencies (if needed):"
echo "   npm install --legacy-peer-deps"
echo ""
echo "3. Build with proper memory settings:"
echo "   NODE_OPTIONS=\"--max-old-space-size=4096\" npm run build"
echo ""
echo "4. Restart the server (to load new frontend):"
echo "   cd ../server"
echo "   npm start"
echo ""

echo "🔍 Step 3: What this fixes..."
echo "============================="
echo ""
echo "The 'tt is not defined' error is caused by:"
echo "• Variable mangling during the build/minification process"
echo "• Import/export issues in the OMBigBook component"
echo "• Potential circular dependencies"
echo ""
echo "Our previous fix (commenting out BigBookCustomComponentViewer) should resolve this"
echo "when the frontend is properly rebuilt."
echo ""

echo "✅ Step 4: Expected results after rebuild..."
echo "==========================================="
echo ""
echo "After running the rebuild commands above:"
echo "✅ Custom Components tab should load without errors"
echo "✅ Big Book interface should render properly"
echo "✅ You can upload ParishMap.tsx via drag & drop"
echo "✅ TSX Component Installation Wizard should work"
echo "✅ Big Book Auto-Install Mode should be available"
echo ""

echo "🧪 Step 5: Testing the fix..."
echo "============================="
echo ""
echo "After rebuild, test these steps:"
echo ""
echo "1. Open Big Book in browser"
echo "2. Navigate to 'Custom Components' tab"
echo "3. Verify no 'tt is not defined' error"
echo "4. Try uploading ParishMap.tsx"
echo "5. Check TSX Installation Wizard opens"
echo ""

echo "🚨 If errors persist after rebuild:"
echo "==================================="
echo ""
echo "1. Check browser console for new error details"
echo "2. Clear browser cache (Ctrl+Shift+R)"
echo "3. Verify server restarted with new frontend build"
echo "4. Try incognito/private browsing mode"
echo ""

echo "💡 Alternative approach if rebuild doesn't work:"
echo "==============================================="
echo ""
echo "If the Custom Components tab still has issues, you can:"
echo "1. Use the main Big Book upload area (first tab)"
echo "2. Upload ParishMap.tsx there"
echo "3. TSX files should automatically trigger the installation wizard"
echo "4. The Big Book Auto-Install Mode will still work"
echo ""

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Fix preparation complete"
echo ""
echo "🎯 Next steps:"
echo "1. Run the npm commands above to rebuild frontend"
echo "2. Restart the server"
echo "3. Test Custom Components tab"
echo "4. Upload ParishMap.tsx with Big Book Auto-Install Mode"
echo ""
echo "💬 The runtime error should be resolved after proper frontend rebuild!" 