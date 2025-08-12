#!/bin/bash
echo "🔍 Checking what's running on port 3001..."
echo "============================================="

# Check what process is using port 3001
echo "📋 Processes using port 3001:"
lsof -i :3001 || netstat -tulpn | grep :3001

echo ""
echo "🔍 All Node.js processes:"
ps aux | grep node | grep -v grep

echo ""
echo "🛠️  To kill the existing server:"
echo "   Option 1: pkill -f 'node.*index.js'"
echo "   Option 2: kill -9 \$(lsof -t -i:3001)"
echo ""
echo "🚀 Then restart with: NODE_ENV=production npm start"
