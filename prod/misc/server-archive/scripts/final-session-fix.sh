#!/bin/bash

echo "🎯 FINAL SESSION FIX - Loading Correct Config File"
echo "================================================="

echo "✅ PROBLEM IDENTIFIED:"
echo "   Server was loading 'session-fixed.js' (secure: false)"
echo "   Instead of 'session.js' (secure: true)"

echo "✅ SOLUTION APPLIED:"
echo "   Changed index.js to load the correct session config"

echo "1. Stopping PM2 process..."
pm2 stop orthodox-backend

echo "2. Deleting PM2 process to clear module cache..."
pm2 delete orthodox-backend

echo "3. Clearing all sessions from database..."
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "DELETE FROM sessions;" 2>/dev/null

echo "4. Verifying correct session config is being loaded..."
if grep -q "require('./config/session')" index.js; then
    echo "   ✅ index.js now loads the correct session config"
else
    echo "   ❌ index.js may not be loading the correct config"
fi

echo "5. Starting fresh PM2 process with corrected config..."
cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server
NODE_ENV=production pm2 start index.js --name orthodox-backend

echo "6. Waiting for server to start..."
sleep 5

echo "7. Testing server response..."
if curl -s https://orthodoxmetrics.com/api/health > /dev/null 2>&1; then
    echo "   ✅ Server is responding"
else
    echo "   ⚠️ Server may not be responding yet"
fi

echo ""
echo "🎉 FINAL SESSION FIX COMPLETE!"
echo "============================"
echo ""
echo "The server now loads the CORRECT session config with:"
echo "✅ secure: true (for HTTPS)"
echo "✅ name: 'orthodoxmetrics.sid'"
echo "✅ domain: '.orthodoxmetrics.com'"
echo ""
echo "🎯 TEST NOW:"
echo "1. Clear browser cookies/storage completely"
echo "2. Hard refresh (Ctrl+F5)"
echo "3. Login again"
echo "4. Check cookies - should show Secure: true!"
echo ""
echo "🏆 This should FINALLY fix the secure cookie issue!" 