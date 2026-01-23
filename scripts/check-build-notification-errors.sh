#!/bin/bash
# Get full error messages from PM2 logs

echo "═══════════════════════════════════════════════════════════"
echo "  Full Error Messages from PM2 Logs"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Get recent errors related to notifications
echo "Recent notification-related errors:"
pm2 logs orthodox-backend --lines 500 --nostream | grep -A 5 -B 5 -i "notifyAdmins\|build notification\|Failed to create notification\|Error notifying admins" | tail -50

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Checking if backend was rebuilt:"
echo ""

# Check if dist/api/buildEvents.js exists and when it was last modified
if [ -f "/var/www/orthodoxmetrics/prod/server/dist/api/buildEvents.js" ]; then
    echo "✅ dist/api/buildEvents.js exists"
    echo "   Last modified: $(stat -c %y /var/www/orthodoxmetrics/prod/server/dist/api/buildEvents.js)"
    echo ""
    echo "Checking if WebSocket emission code is in compiled file:"
    grep -n "websocketService\|sendNotificationToUser\|new_notification" /var/www/orthodoxmetrics/prod/server/dist/api/buildEvents.js | head -5 || echo "   ⚠️  WebSocket code not found (backend needs rebuild)"
else
    echo "❌ dist/api/buildEvents.js does not exist"
    echo "   Backend needs to be built: npm run build:ts"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
