#!/bin/bash
# Diagnose why build notifications aren't showing up

echo "═══════════════════════════════════════════════════════════"
echo "  Build Notifications Diagnostic"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check PM2 logs for notification creation messages
echo "1. Checking PM2 logs for notification creation..."
echo "   Looking for: 'Created X build notifications'"
echo ""
pm2 logs orthodox-backend --lines 200 --nostream | grep -i "build notification\|Created.*build\|notifyAdmins" | tail -20
echo ""

# Check if notification types exist
echo "2. Checking if build notification types exist in database..."
mysql -u root -p'your_password' orthodoxmetrics_db -e "
SELECT id, name, description, category, default_enabled, is_active
FROM notification_types 
WHERE name IN ('build_started', 'build_completed', 'build_failed');
" 2>/dev/null || echo "   ⚠️  Could not query database (update password in script)"
echo ""

# Check if any build notifications exist
echo "3. Checking for build notifications in database..."
mysql -u root -p'your_password' orthodoxmetrics_db -e "
SELECT 
    n.id,
    n.user_id,
    nt.name as notification_type,
    n.title,
    n.is_read,
    n.created_at,
    u.email as user_email,
    u.role as user_role
FROM notifications n
JOIN notification_types nt ON n.notification_type_id = nt.id
LEFT JOIN users u ON n.user_id = u.id
WHERE nt.name IN ('build_started', 'build_completed', 'build_failed')
ORDER BY n.created_at DESC
LIMIT 10;
" 2>/dev/null || echo "   ⚠️  Could not query database"
echo ""

# Check latest build runs
echo "4. Latest build runs:"
mysql -u root -p'your_password' orthodoxmetrics_db -e "
SELECT 
    run_id,
    env,
    origin,
    status,
    started_at,
    ended_at
FROM build_runs
ORDER BY started_at DESC
LIMIT 5;
" 2>/dev/null || echo "   ⚠️  Could not query database"
echo ""

# Check admin users
echo "5. Admin users (should receive notifications):"
mysql -u root -p'your_password' orthodoxmetrics_db -e "
SELECT id, email, role, deleted_at
FROM users 
WHERE role IN ('admin', 'super_admin')
ORDER BY role, email;
" 2>/dev/null || echo "   ⚠️  Could not query database"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "Next steps:"
echo "1. If notification types don't exist, run the migration:"
echo "   mysql -u root -p orthodoxmetrics_db < server/database/migrations/2026-01-23_build-events-tables.sql"
echo ""
echo "2. If notifications aren't being created, check PM2 logs:"
echo "   pm2 logs orthodox-backend --lines 100 | grep -i notification"
echo ""
echo "3. If build_completed events aren't reaching backend, check:"
echo "   - Backend is running: curl http://127.0.0.1:3001/api/health"
echo "   - Build script can connect: Check for ECONNREFUSED errors"
echo "═══════════════════════════════════════════════════════════"
