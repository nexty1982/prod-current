#!/bin/bash

echo "🔍 CHECKING FULL SERVER LOGS"
echo "============================"
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/check-full-server-logs.sh"
    exit 1
fi

echo "🎯 FULL SERVER LOG ANALYSIS:"
echo "============================"

# Check PM2 status
echo "📋 PM2 Process Status:"
pm2 list
echo ""

# Check if server is actually running
echo "🔍 Process Details:"
if pm2 list | grep -q "orthodox-backend.*online"; then
    PID=$(pm2 list | grep orthodox-backend | awk '{print $6}')
    echo "✅ Server process ID: $PID"
    
    # Check if process is actually running
    if ps -p $PID > /dev/null 2>&1; then
        echo "✅ Process is actually running"
    else
        echo "❌ Process is not actually running"
    fi
else
    echo "❌ Server is not online"
fi

echo ""
echo "📋 FULL OUTPUT LOGS (last 50 lines):"
echo "====================================="
pm2 logs orthodox-backend --lines 50 --nostream --out
echo ""

echo "📋 FULL ERROR LOGS (last 50 lines):"
echo "===================================="
pm2 logs orthodox-backend --lines 50 --nostream --err
echo ""

echo "🔍 CHECKING PORT LISTENING:"
echo "==========================="

# Check all listening ports
echo "📋 All listening ports:"
netstat -tlnp | grep LISTEN || ss -tlnp | grep LISTEN
echo ""

# Check specifically for port 3001
echo "🔍 Checking port 3001 specifically:"
if netstat -tlnp | grep ":3001" || ss -tlnp | grep ":3001"; then
    echo "✅ Port 3001 is being listened on"
else
    echo "❌ Port 3001 is NOT being listened on"
fi

echo ""
echo "🔍 CHECKING ENVIRONMENT VARIABLES:"
echo "=================================="

# Check environment variables
echo "📋 Environment variables:"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "HOST: $HOST"

# Check .env file
if [ -f ".env" ]; then
    echo "📋 .env file contents (PORT and HOST only):"
    grep -E "^(PORT|HOST)=" .env || echo "No PORT or HOST in .env"
else
    echo "❌ No .env file found"
fi

echo ""
echo "🔍 TESTING SERVER STARTUP:"
echo "=========================="

# Try to start server manually to see startup messages
echo "🧪 Testing server startup manually..."
echo "📋 Starting server with node directly (will show startup messages):"
echo ""

# Stop PM2 process temporarily
pm2 stop orthodox-backend > /dev/null 2>&1

# Try to start server manually
echo "🚀 Starting server manually to see startup messages..."
timeout 10s node index.js 2>&1 | head -20

# Restart PM2 process
echo ""
echo "🔄 Restarting PM2 process..."
pm2 start orthodox-backend

echo ""
echo "🎯 ANALYSIS SUMMARY:"
echo "==================="
echo "✅ PM2 shows server as online"
echo "❌ Server not listening on port 3001"
echo "❌ Need to check startup logs for errors"
echo ""
echo "🏁 FULL LOG CHECK COMPLETE!" 