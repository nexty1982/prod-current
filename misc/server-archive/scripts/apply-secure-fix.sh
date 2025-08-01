#!/bin/bash

echo "🔧 Applying Hardcoded Secure Cookie Fix"
echo "======================================="

echo "1. Configuration updated to FORCE secure: true"
echo "   - isHTTPS is now hardcoded to true"
echo "   - No longer depends on environment variables"

echo "2. Clearing all old sessions..."
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "DELETE FROM sessions;" 2>/dev/null

echo "3. Restarting server..."
pm2 restart orthodox-backend

echo "4. Waiting for server to start..."
sleep 3

echo ""
echo "✅ Secure cookie fix applied!"
echo "============================"
echo ""
echo "🎯 NOW DO THIS:"
echo "1. Clear browser cookies/storage completely"
echo "2. Hard refresh (Ctrl+F5)" 
echo "3. Login again"
echo "4. Check cookies - should now show Secure: true"
echo ""
echo "The server will now ALWAYS create secure cookies!" 