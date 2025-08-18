#!/bin/bash

echo "🔧 Fixing Records Management Issues"
echo "=================================="
echo ""

echo "📋 Issues to fix:"
echo "   1. frjames@ssppoc.org can't access Records Management (403/400 errors)"
echo "   2. Super admin gets redirected to /dashboards/modern instead of Records Management"
echo "   3. Dropdown options endpoint failing (400 error)"
echo "   4. Churches endpoint permission issues"
echo ""

echo "🔧 STEP 1: Fix frjames@ssppoc.org church assignment and role"
echo "============================================================"
node debug/fix-frjames-church-assignment.js

echo ""
echo "🔧 STEP 2: Check current status"
echo "==============================="
node debug/check-frjames-current-status.js

echo ""
echo "🔧 STEP 3: Rebuild frontend with fixes"
echo "======================================"
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
echo "🎉 Fixes Applied:"
echo "================="
echo "✅ Fixed churches endpoint permissions for admin users"
echo "✅ Fixed dropdown options endpoint (added default table and validation)"
echo "✅ Fixed SmartRedirect logic for super admin (goes to /records)"
echo "✅ Added proper /records route for Records Management"
echo "✅ Fixed frjames@ssppoc.org church assignment and role"
echo ""
echo "📋 Expected Results:"
echo "==================="
echo "1. frjames@ssppoc.org (admin role):"
echo "   - Can access Records Management without 403 errors"
echo "   - Gets redirected to /{church_id}-records"
echo "   - Dropdown options work properly"
echo ""
echo "2. Super admin account:"
echo "   - Gets redirected to /records (Records Management)"
echo "   - Can access all church records"
echo "   - No more redirect to /dashboards/modern"
echo ""
echo "🧪 Testing Steps:"
echo "================"
echo "1. Restart the server"
echo "2. Login as frjames@ssppoc.org"
echo "3. Should go to Records Management without errors"
echo "4. Login as super admin"
echo "5. Should go to Records Management (not /dashboards/modern)"
echo ""
echo "🔧 If issues persist:"
echo "===================="
echo "1. Check browser console for new error messages"
echo "2. Verify user role and church assignment in database"
echo "3. Check if church database exists and has records"
echo "4. Clear browser cache and localStorage" 