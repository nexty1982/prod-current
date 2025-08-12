#!/bin/bash

echo "🧪 Testing if Frontend Issues Are Resolved"
echo "=========================================="

echo "📊 Current API Status:"
echo "----------------------"

# Test User Management (should be 401 without auth)
user_status=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/admin/users -o /dev/null)
echo "User Management API: $user_status"
if [ "$user_status" = "401" ]; then
    echo "   ✅ GOOD - API working, requires authentication"
else
    echo "   ⚠️ Unexpected status"
fi

# Test Church Management (working)  
church_status=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/admin/churches -o /dev/null)
echo "Church Management API: $church_status"
if [ "$church_status" = "200" ]; then
    echo "   ✅ GOOD - API working properly"
else
    echo "   ⚠️ Unexpected status"
fi

# Test our new modular routes
echo ""
echo "🔧 Testing New Modular Routes:"
echo "------------------------------"
church_users_status=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/admin/church-users/1 -o /dev/null)
echo "Church Users API: $church_users_status"

church_db_status=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/admin/church-database/1/tables -o /dev/null)
echo "Church Database API: $church_db_status"

echo ""
echo "🔍 Checking Recent Errors:"
echo "-------------------------"

# Check for critical errors (not warnings)
if pm2 logs orthodox-backend --lines 10 | grep -q "Error:.*Connection.*failed\|Error:.*Cannot.*connect\|Error:.*ECONNREFUSED"; then
    echo "   ❌ Found connection errors"
else
    echo "   ✅ No critical connection errors"
fi

# Check for crashes
if pm2 logs orthodox-backend --lines 10 | grep -q "Process.*crashed\|Process.*exited"; then
    echo "   ❌ Found process crashes"
else
    echo "   ✅ No process crashes"
fi

echo ""
echo "🎯 CONCLUSION:"
echo "=============="

if [ "$user_status" = "401" ] && [ "$church_status" = "200" ]; then
    echo "✅ YOUR BACKEND IS WORKING CORRECTLY!"
    echo ""
    echo "🎉 The 'Failed to fetch users' error is likely a FRONTEND issue now."
    echo ""
    echo "🔧 Try these frontend fixes:"
    echo "   1. 🔄 Hard refresh (Ctrl+F5 or Cmd+Shift+R)"
    echo "   2. 🧹 Clear browser cache completely"  
    echo "   3. 🚪 Log out and log back in as admin"
    echo "   4. 🌐 Try incognito/private browsing mode"
    echo "   5. 🔍 Check browser console (F12) for JavaScript errors"
    echo ""
    echo "📱 The User Management API is working (401 = 'auth required' = GOOD)"
    echo "📊 The Church Management API is working (200 = success)"
    echo ""
    echo "💡 If frontend still doesn't work, check browser console for specific errors!"
    
else
    echo "⚠️ Backend still has issues:"
    echo "   User API: $user_status (should be 401)"
    echo "   Church API: $church_status (should be 200)"
    echo ""
    echo "🔧 Run the SQL fix first:"
    echo "   mysql -u [user] -p orthodoxmetrics_db < fix-church-14.sql"
fi

echo ""
echo "📄 TO FIX CHURCH 14 WARNING:"
echo "Run: mysql -u [your_db_user] -p orthodoxmetrics_db < fix-church-14.sql" 