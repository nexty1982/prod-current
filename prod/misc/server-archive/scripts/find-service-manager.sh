#!/bin/bash
echo "🔍 Checking for process managers and auto-restart services..."
echo "=========================================================="

# Check for PM2
echo "📋 Checking PM2 processes:"
if command -v pm2 &> /dev/null; then
    pm2 list
    echo ""
    echo "🛠️  To stop PM2 processes:"
    echo "   pm2 stop all"
    echo "   pm2 delete all"
else
    echo "   PM2 not found"
fi

echo ""
echo "📋 Checking systemd services:"
systemctl list-units --type=service --state=running | grep -E 'node|orthodoxmetrics|ssppoc' || echo "   No orthodoxmetrics systemd services found"

echo ""
echo "📋 Checking for ecosystem.config files:"
find ~/site -name "ecosystem.config.*" 2>/dev/null || echo "   No ecosystem.config files found"

echo ""
echo "📋 Checking current processes:"
ps aux | grep node | grep -v grep

echo ""
echo "🔍 Checking what's listening on port 3001:"
lsof -i :3001

echo ""
echo "🛠️  Solution options:"
echo "   1. If PM2: pm2 stop all && pm2 delete all"
echo "   2. If systemd: sudo systemctl stop orthodoxmetrics-server"
echo "   3. Force kill and change port: PORT=3002 NODE_ENV=production npm start"
