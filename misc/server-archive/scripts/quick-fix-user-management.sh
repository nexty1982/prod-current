#!/bin/bash

echo "🚀 Quick Fix for User Management Issue"
echo "======================================"

# Restart the server to clear any session issues
echo "1. Restarting server to clear any session issues..."
pm2 restart orthodox-backend

sleep 3

# Test the endpoint
echo "2. Testing user management endpoint..."
response=$(curl -s https://orthodoxmetrics.com/api/admin/users)
echo "Response: $response"

# Check if it's an auth issue
if echo "$response" | grep -q "Authentication required"; then
    echo "✅ Authentication working (401 expected without session)"
elif echo "$response" | grep -q "error"; then
    echo "❌ Server error detected"
else
    echo "⚠️ Unexpected response"
fi

echo ""
echo "3. Quick database test..."
cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server

# Test if we can query users directly
node -e "
const { promisePool } = require('./config/db');
async function test() {
    try {
        const [result] = await promisePool.execute('SELECT COUNT(*) as count FROM users');
        console.log('✅ Database connected. Users:', result[0].count);
        process.exit(0);
    } catch (error) {
        console.error('❌ Database error:', error.message);
        process.exit(1);
    }
}
test();
"

echo ""
echo "4. Check if route is properly mounted..."
grep -n "usersRouter" index.js

echo ""
echo "🎯 QUICK SOLUTION:"
echo "=================="
echo "If you're still seeing 'Failed to fetch users':"
echo ""
echo "1. LOG OUT and LOG BACK IN to refresh your session"
echo "2. Make sure you have admin/super_admin role"
echo "3. Try refreshing the page (F5)"
echo ""
echo "Your session might have expired or lost admin privileges." 