#!/bin/bash

echo "🔧 APPLYING DOMAIN FIX FOR PHANTOM USER ISSUE"
echo "============================================="

echo "✅ Domain fix applied to session.js"
echo "   - Always set domain to .orthodoxmetrics.com"
echo "   - Fixed environment detection"

echo ""
echo "🔄 Restarting server to apply changes..."

# Stop PM2 process
pm2 stop orthodox-backend

# Delete PM2 process to clear module cache
pm2 delete orthodox-backend

# Start fresh PM2 process
cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server
NODE_ENV=production pm2 start index.js --name orthodox-backend

echo "⏳ Waiting for server to start..."
sleep 5

echo "🧪 Testing server response..."
if curl -s https://orthodoxmetrics.com/api/health > /dev/null 2>&1; then
    echo "✅ Server is responding"
else
    echo "❌ Server may not be responding yet"
fi

echo ""
echo "🎯 NOW TEST THE FIX:"
echo "===================="
echo "1. Clear browser cookies completely"
echo "2. Hard refresh the page (Ctrl+F5)"
echo "3. Login with valid credentials"
echo "4. Check if user email displays correctly"
echo "5. Verify session persists on page refresh"
echo ""
echo "🔍 Check server logs for session debugging:"
echo "pm2 logs orthodox-backend --lines 20"
echo ""
echo "🏁 DOMAIN FIX APPLIED!" 