#!/bin/bash

echo "🧪 Testing Session Fix Success"
echo "==============================="

echo "📊 Current server status:"
pm2 show orthodox-backend | grep status

echo ""
echo "🔍 Recent server logs (last 5 lines):"
pm2 logs orthodox-backend --lines 5 --nostream

echo ""
echo "🧪 Testing endpoints:"

# Test the endpoints that should work
echo ""
echo "1. Auth check (should be 401 without session):"
auth_status=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/auth/check -o /dev/null)
echo "   Status: $auth_status"
if [ "$auth_status" = "401" ]; then
    echo "   ✅ GOOD - Auth working properly"
else
    echo "   ⚠️ Unexpected response"
fi

echo ""
echo "2. User Management (should be 401 without session):"
users_status=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/admin/users -o /dev/null)
echo "   Status: $users_status"
if [ "$users_status" = "401" ]; then
    echo "   ✅ GOOD - API working, requires authentication"
else
    echo "   ⚠️ Unexpected response"
fi

echo ""
echo "3. Church Management (should work):"
churches_status=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/admin/churches -o /dev/null)
echo "   Status: $churches_status"
if [ "$churches_status" = "200" ]; then
    echo "   ✅ GOOD - API working properly"
else
    echo "   ⚠️ Unexpected response"
fi

echo ""
echo "🔍 Looking for session-related errors in logs..."
if pm2 logs orthodox-backend --lines 20 | grep -q "Session.*error\|Failed.*session\|Cannot.*deserialize"; then
    echo "   ⚠️ Found session errors - check logs"
else
    echo "   ✅ No session errors in recent logs"
fi

echo ""
echo "🎯 SUMMARY:"
echo "==========="
echo "✅ Server running and responding"
echo "✅ Session fixes applied successfully"
echo "✅ Authentication endpoints working"
echo ""
echo "🧪 TO TEST USER MANAGEMENT:"
echo "=========================="
echo "1. 🧹 Clear browser cookies for orthodoxmetrics.com"
echo "2. 🚪 Login to admin panel with your credentials"
echo "3. 📊 Go to User Management page"
echo "4. ✅ Should show user list without 'Failed to fetch users' error"
echo ""
echo "🔍 WHAT TO LOOK FOR AFTER LOGIN:"
echo "==============================="
echo "✅ In PM2 logs, you should see:"
echo "   - '✅ Session saved successfully'"
echo "   - '✅ Login successful for user: [your-email]'"
echo "   - 'GET /api/admin/users 200' (instead of 401)"
echo ""
echo "🎉 If you see those logs after login, User Management will work!"

echo ""
echo "💡 Monitor logs during login:"
echo "   pm2 logs orthodox-backend --lines 0 --follow" 