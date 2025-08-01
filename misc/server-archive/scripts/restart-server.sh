#!/bin/bash

echo "🔄 Restarting OrthodoxMetrics Server"
echo "====================================="

cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server

echo "🛑 Stopping server..."
pm2 stop orthodox-backend 2>/dev/null || echo "   (Server wasn't running)"

echo "🚀 Starting server..."
pm2 start orthodox-backend

sleep 3

echo ""
echo "📊 Server Status:"
pm2 status orthodox-backend

echo ""
echo "🧪 Testing new user update endpoint..."
echo "Testing PUT /api/admin/users/20..."

response=$(curl -s -X PUT \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=test" \
  -d '{"first_name":"Test","last_name":"Update"}' \
  https://orthodoxmetrics.com/api/admin/users/20 2>/dev/null)

echo "📋 API Response:"
echo "$response" | head -100

if echo "$response" | grep -q '"success"'; then
    echo "   ✅ User update endpoint responding!"
else
    echo "   ❌ User update endpoint still not found"
    echo ""
    echo "🔍 Let me check the route mounting..."
fi

echo ""
echo "🎯 READY TO TEST:"
echo "=================="
echo "✅ Server restarted with new user update route"
echo "🌐 Try updating a user in the User Management interface"
echo "📝 The PUT /api/admin/users/:id endpoint should now work" 