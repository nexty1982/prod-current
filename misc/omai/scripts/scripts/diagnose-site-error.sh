#!/bin/bash

# Site Error Diagnostic Script
# Diagnoses white page / JavaScript errors on orthodoxmetrics.com

echo "🚨 SITE ERROR DIAGNOSTIC SCRIPT"
echo "================================="
echo "Diagnosing white page issue on orthodoxmetrics.com"
echo ""

# Check if server is running
echo "📡 Checking server status..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend server is running on port 3001"
else
    echo "❌ Backend server is not responding on port 3001"
    echo "Please start the server first!"
fi

# Check if frontend files exist
echo ""
echo "📁 Checking frontend build files..."
if [ -d "front-end/dist" ]; then
    echo "✅ Frontend dist directory exists"
    if [ -f "front-end/dist/index.html" ]; then
        echo "✅ index.html exists"
    else
        echo "❌ index.html missing from dist"
    fi
    
    # Check for recent build artifacts
    JS_FILES=$(find front-end/dist -name "*.js" | wc -l)
    CSS_FILES=$(find front-end/dist -name "*.css" | wc -l)
    echo "📊 Build artifacts: $JS_FILES JS files, $CSS_FILES CSS files"
else
    echo "❌ Frontend dist directory missing"
    echo "Frontend may not be built!"
fi

# Check recently modified files
echo ""
echo "🔍 Recently modified files that might cause issues..."
echo "RegistryManagementPanel.tsx:"
if [ -f "front-end/src/components/admin/RegistryManagementPanel.tsx" ]; then
    echo "✅ RegistryManagementPanel.tsx exists"
    # Check for basic syntax issues
    if grep -q "export default" "front-end/src/components/admin/RegistryManagementPanel.tsx"; then
        echo "✅ Has default export"
    else
        echo "❌ Missing default export!"
    fi
else
    echo "❌ RegistryManagementPanel.tsx missing!"
fi

echo ""
echo "OMBigBook.tsx imports:"
if grep -q "import RegistryManagementPanel" "front-end/src/components/admin/OMBigBook.tsx"; then
    echo "✅ OMBigBook imports RegistryManagementPanel"
else
    echo "❌ OMBigBook missing RegistryManagementPanel import!"
fi

# Check for common JavaScript errors
echo ""
echo "🔍 Checking for potential syntax issues..."

# Check for missing semicolons, brackets, etc in recent changes
echo "Checking RegistryManagementPanel.tsx..."
if [ -f "front-end/src/components/admin/RegistryManagementPanel.tsx" ]; then
    # Basic syntax checks
    OPEN_BRACES=$(grep -o '{' front-end/src/components/admin/RegistryManagementPanel.tsx | wc -l)
    CLOSE_BRACES=$(grep -o '}' front-end/src/components/admin/RegistryManagementPanel.tsx | wc -l)
    
    if [ "$OPEN_BRACES" -eq "$CLOSE_BRACES" ]; then
        echo "✅ Braces balanced ($OPEN_BRACES open, $CLOSE_BRACES close)"
    else
        echo "❌ Braces unbalanced! ($OPEN_BRACES open, $CLOSE_BRACES close)"
    fi
    
    # Check for React import
    if grep -q "import React" front-end/src/components/admin/RegistryManagementPanel.tsx; then
        echo "✅ React imported"
    else
        echo "❌ React import missing!"
    fi
fi

# Check build logs if available
echo ""
echo "📋 Build diagnostics:"
echo "To get detailed error info:"
echo "1. Check browser console (F12) for JavaScript errors"
echo "2. Try rebuilding: cd front-end && npm run build --legacy-peer-deps"
echo "3. Check build output for errors"
echo "4. Look for 'Failed to compile' or similar messages"

echo ""
echo "🔧 IMMEDIATE FIXES TO TRY:"
echo "=========================="
echo "1. Hard refresh: Ctrl+F5 or Ctrl+Shift+R"
echo "2. Clear browser cache completely"
echo "3. Check browser console (F12) for red error messages"
echo "4. Rebuild frontend: cd front-end && npm run build --legacy-peer-deps"
echo "5. Restart the server after rebuild"
echo ""
echo "If issue persists, may need to revert RegistryManagementPanel extraction!"

echo ""
echo "🏁 Diagnostic completed. Check output above for issues." 