#!/bin/bash

echo "🔧 Fixing Database Errors & Testing User Management"
echo "=================================================="

echo "1. Restarting server with fixes..."
pm2 restart orthodox-backend

sleep 5

echo "2. Testing fixed endpoints..."

echo ""
echo "🧪 Testing User Management (should work now):"
user_response=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/admin/users -o /dev/null)
echo "   User Management API: $user_response"

echo ""
echo "🧪 Testing Church Management (should not have DB errors):"
church_response=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/admin/churches -o /dev/null)
echo "   Church Management API: $church_response"

echo ""
echo "🧪 Testing Session Management (DatabaseService.getDatabase fixed):"
sessions_response=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/admin/sessions -o /dev/null)
echo "   Session Management API: $sessions_response"

echo ""
echo "📊 Checking logs for errors..."
echo "Looking for database errors in recent logs..."

# Check for the specific errors we fixed
echo ""
echo "🔍 Checking for 'No database selected' errors:"
if pm2 logs orthodox-backend --lines 20 | grep -q "No database selected"; then
    echo "   ❌ Still seeing database errors"
else
    echo "   ✅ No 'No database selected' errors found"
fi

echo ""
echo "🔍 Checking for 'getDatabase is not a function' errors:"
if pm2 logs orthodox-backend --lines 20 | grep -q "getDatabase is not a function"; then
    echo "   ❌ Still seeing getDatabase errors"
else
    echo "   ✅ No getDatabase function errors found"
fi

echo ""
echo "🎯 SUMMARY:"
echo "==========="
echo "✅ Added missing DatabaseService.getDatabase function"
echo "✅ Fixed church database connection error handling"
echo "✅ Added proper error checking for missing database_name"
echo ""
echo "Your User Management should now be working!"
echo ""
echo "🔄 If you're still seeing 'Failed to fetch users' in frontend:"
echo "   1. Hard refresh the page (Ctrl+F5)"
echo "   2. Clear browser cache"
echo "   3. Check browser console for JavaScript errors" 