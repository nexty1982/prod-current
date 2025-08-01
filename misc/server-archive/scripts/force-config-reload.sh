#!/bin/bash

echo "🔄 FORCING Server Configuration Reload"
echo "======================================"

echo "1. Stopping PM2 process completely..."
pm2 stop orthodox-backend

echo "2. Deleting PM2 process to clear cached config..."
pm2 delete orthodox-backend

echo "3. Clearing all sessions from database..."
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "DELETE FROM sessions;" 2>/dev/null

echo "4. Verifying session config has new cookie name..."
if grep -q "orthodoxmetrics.sid" config/session.js; then
    echo "   ✅ Cookie name updated to orthodoxmetrics.sid"
else
    echo "   ❌ Cookie name not updated in config"
fi

if grep -q "secure: true" config/session.js; then
    echo "   ✅ Secure cookies enabled"
else
    echo "   ❌ Secure cookies not enabled"
fi

echo "5. Starting fresh PM2 process..."
cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server
NODE_ENV=production pm2 start index.js --name orthodox-backend

echo "6. Waiting for server to fully start..."
sleep 5

echo "7. Testing if server responds..."
if curl -s https://orthodoxmetrics.com/api/health > /dev/null 2>&1; then
    echo "   ✅ Server is responding"
else
    echo "   ⚠️ Server may not be responding yet"
fi

echo ""
echo "🎯 Configuration Force Reload Complete!"
echo "======================================"
echo ""
echo "CRITICAL NEXT STEPS:"
echo "1. 🧹 Clear ALL browser data (cookies, storage, cache)"
echo "2. 🔄 Hard refresh (Ctrl+F5) or restart browser"
echo "3. 🔐 Login again"
echo "4. 🔍 Check cookies - should now show:"
echo "   - Name: orthodoxmetrics.sid (NEW NAME)"
echo "   - Secure: true (NEW VALUE)"
echo ""
echo "If it still shows orthodox.sid, the server config is cached somewhere!" 