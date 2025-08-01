#!/bin/bash

echo "🧹 Forcing Secure Sessions - Complete Session Reset"
echo "================================================="

echo "1. Clearing ALL sessions from database..."
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "DELETE FROM sessions;" 2>/dev/null

echo "2. Verifying session table is empty..."
session_count=$(mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -sN -e "SELECT COUNT(*) FROM sessions;" 2>/dev/null)
echo "   Sessions in database: $session_count"

echo "3. Setting environment variables for next server start..."
export NODE_ENV=production
export HTTPS=true
export SESSION_SECRET="orthodox-metrics-production-secret-2025"

echo "4. Restarting server with clean session state..."
pm2 restart orthodox-backend --update-env

echo ""
echo "🎯 Complete session reset done!"
echo "================================"
echo ""
echo "CRITICAL: Now you MUST:"
echo "1. 🧹 Clear browser cookies/storage completely"
echo "2. 🔄 Refresh the page completely (Ctrl+F5)"
echo "3. 🔐 Login again - this will create a BRAND NEW secure session"
echo ""
echo "The next session created will be secure: true" 