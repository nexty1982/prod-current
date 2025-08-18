#!/bin/bash

echo "🔍 CHECKING SERVER CONNECTIVITY"
echo "==============================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/check-server-connectivity.sh"
    exit 1
fi

echo "🎯 SERVER STATUS CHECK:"
echo "======================="

# Check PM2 status
echo "📋 PM2 Process Status:"
pm2 list
echo ""

# Check if server is listening on port 3001
echo "🔍 Checking if server is listening on port 3001..."
if netstat -tlnp | grep ":3001" || ss -tlnp | grep ":3001"; then
    echo "✅ Server is listening on port 3001"
else
    echo "❌ Server is NOT listening on port 3001"
fi

echo ""
echo "🔍 Checking all listening ports:"
netstat -tlnp | grep LISTEN || ss -tlnp | grep LISTEN
echo ""

# Check server logs for startup issues
echo "📋 Recent server logs:"
pm2 logs orthodox-backend --lines 20 --nostream
echo ""

# Check if there are any error logs
echo "📋 Recent error logs:"
pm2 logs orthodox-backend --err --lines 10 --nostream
echo ""

# Test different connection methods
echo "🧪 TESTING CONNECTIONS:"
echo "======================="

# Test localhost:3001
echo "📡 Testing localhost:3001..."
curl -s -w "Status: %{http_code}, Time: %{time_total}s\n" http://localhost:3001/api/health || echo "❌ Connection failed"

# Test 127.0.0.1:3001
echo "📡 Testing 127.0.0.1:3001..."
curl -s -w "Status: %{http_code}, Time: %{time_total}s\n" http://127.0.0.1:3001/api/health || echo "❌ Connection failed"

# Test 0.0.0.0:3001
echo "📡 Testing 0.0.0.0:3001..."
curl -s -w "Status: %{http_code}, Time: %{time_total}s\n" http://0.0.0.0:3001/api/health || echo "❌ Connection failed"

# Test the actual IP that nginx is proxying to
echo "📡 Testing 192.168.1.239:3001..."
curl -s -w "Status: %{http_code}, Time: %{time_total}s\n" http://192.168.1.239:3001/api/health || echo "❌ Connection failed"

echo ""
echo "🔍 CHECKING SERVER CONFIGURATION:"
echo "================================="

# Check the server's index.js to see what port it's configured to use
echo "📋 Server port configuration:"
if grep -n "listen\|port" index.js; then
    echo "✅ Port configuration found in index.js"
else
    echo "❌ No port configuration found in index.js"
fi

# Check if there's a .env file with port configuration
echo "📋 Environment configuration:"
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    if grep -q "PORT\|port" .env; then
        echo "Port configuration in .env:"
        grep "PORT\|port" .env
    else
        echo "❌ No port configuration in .env"
    fi
else
    echo "❌ No .env file found"
fi

echo ""
echo "🔍 CHECKING NETWORK CONFIGURATION:"
echo "=================================="

# Check if the server is running on the correct network interface
echo "📋 Network interfaces:"
ip addr show | grep "inet " | grep -v "127.0.0.1"
echo ""

# Check if there are any firewall rules blocking port 3001
echo "📋 Firewall status for port 3001:"
if command -v ufw >/dev/null 2>&1; then
    ufw status | grep 3001 || echo "No UFW rules for port 3001"
else
    echo "UFW not installed"
fi

echo ""
echo "🎯 RECOMMENDED ACTIONS:"
echo "======================"
echo "1. If server is not listening on port 3001: Check server configuration"
echo "2. If server is listening but not responding: Check server logs"
echo "3. If network issues: Check firewall and network configuration"
echo "4. If nginx proxy issues: Check nginx configuration"
echo ""
echo "🏁 CONNECTIVITY CHECK COMPLETE!" 