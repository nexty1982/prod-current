#!/bin/bash

echo "🔧 Restarting OrthodoxMetrics with HTTPS Session Fix"
echo "================================================="

# Set environment variables for HTTPS
export NODE_ENV=production
export HTTPS=true
export SESSION_SECRET="orthodox-metrics-production-secret-2025"

echo "✅ Environment variables set:"
echo "   NODE_ENV: $NODE_ENV"
echo "   HTTPS: $HTTPS"
echo "   SESSION_SECRET: SET"

# Clear old sessions to force new secure cookies
echo ""
echo "🧹 Clearing old insecure sessions..."
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "DELETE FROM sessions WHERE expires < UNIX_TIMESTAMP();" 2>/dev/null || echo "⚠️ Could not clear sessions (this is ok)"

# Restart PM2 with new environment
echo ""
echo "🔄 Restarting PM2 process with HTTPS configuration..."
pm2 restart orthodox-backend --update-env

echo ""
echo "✅ Server restarted with HTTPS session configuration!"
echo ""
echo "🎯 Next Steps:"
echo "1. Clear your browser cookies completely"
echo "2. Login again at https://orthodoxmetrics.com"
echo "3. Check dev tools - cookies should now show Secure=true"
echo ""
echo "Monitor logs: pm2 logs orthodox-backend" 