#!/bin/bash
# Check build events system status

echo "═══════════════════════════════════════════════════════════"
echo "  Build Events System Diagnostic"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check backend is running
echo "1. Checking backend status..."
if curl -s http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
    echo "   ✅ Backend is running and accessible"
else
    echo "   ❌ Backend is NOT accessible on port 3001"
    echo "   Run: pm2 status"
    exit 1
fi

# Check PM2 status
echo ""
echo "2. Checking PM2 status..."
pm2 list | grep orthodox-backend || echo "   ⚠️  orthodox-backend not found in PM2"

# Check .env token
echo ""
echo "3. Checking OM_BUILD_EVENT_TOKEN..."
if grep -q "OM_BUILD_EVENT_TOKEN=" /var/www/orthodoxmetrics/prod/server/.env 2>/dev/null; then
    TOKEN_LINE=$(grep "OM_BUILD_EVENT_TOKEN=" /var/www/orthodoxmetrics/prod/server/.env | head -1)
    TOKEN_LEN=$(echo "$TOKEN_LINE" | cut -d'=' -f2 | wc -c)
    if [ "$TOKEN_LEN" -gt 20 ]; then
        echo "   ✅ Token is set (length: $((TOKEN_LEN - 1)) chars)"
    else
        echo "   ⚠️  Token appears to be too short"
    fi
else
    echo "   ❌ OM_BUILD_EVENT_TOKEN not found in .env"
fi

# Check database tables
echo ""
echo "4. Checking database tables..."
mysql -u root -p'your_password' orthodoxmetrics_db -e "
    SELECT COUNT(*) as build_runs_count FROM build_runs;
    SELECT COUNT(*) as events_count FROM build_run_events;
    SELECT COUNT(*) as notifications_count FROM notifications 
        WHERE notification_type IN ('build_started', 'build_completed', 'build_failed');
" 2>/dev/null || echo "   ⚠️  Could not query database (check credentials)"

# Check latest build run
echo ""
echo "5. Latest build run:"
mysql -u root -p'your_password' orthodoxmetrics_db -e "
    SELECT run_id, env, origin, status, started_at, ended_at 
    FROM build_runs 
    ORDER BY started_at DESC 
    LIMIT 1;
" 2>/dev/null || echo "   ⚠️  Could not query database"

# Check latest notifications
echo ""
echo "6. Latest build notifications:"
mysql -u root -p'your_password' orthodoxmetrics_db -e "
    SELECT id, notification_type, title, created_at, read_at
    FROM notifications 
    WHERE notification_type IN ('build_started', 'build_completed', 'build_failed')
    ORDER BY created_at DESC 
    LIMIT 5;
" 2>/dev/null || echo "   ⚠️  Could not query database"

echo ""
echo "═══════════════════════════════════════════════════════════"
