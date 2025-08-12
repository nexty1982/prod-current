#!/bin/bash

echo "🔄 Quick Restart with Debug Toggle"
echo "=================================="

cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server

# Stop any running node processes for this project
pkill -f "node.*index.js" 2>/dev/null || echo "No existing processes found"

# Wait a moment
sleep 2

# Start the server
echo "🚀 Starting server with enhanced toggle debugging..."
nohup node index.js > /var/log/orthodox-debug.log 2>&1 &

sleep 3

echo "✅ Server started with PID: $!"
echo "📋 Debug logs will be in: /var/log/orthodox-debug.log"
echo ""
echo "🧪 NOW TEST THE TOGGLE:"
echo "======================"
echo "1. 🌐 Go to User Management"
echo "2. 🔄 Click the toggle status button"
echo "3. 👀 Watch the server logs for detailed debug info"
echo "4. 🔍 Check what the database values actually are"
echo ""
echo "📝 The debug output will show:"
echo "   - Raw database value"
echo "   - Converted boolean value" 
echo "   - New status being set"
echo "   - Verification after update" 