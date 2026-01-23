-- Check build notifications
-- Run: mysql -u root -p orthodoxmetrics_db < scripts/check-build-notifications.sql

-- Check notification types exist
SELECT id, name, description, category, default_enabled 
FROM notification_types 
WHERE name IN ('build_started', 'build_completed', 'build_failed');

-- Check notifications (join with notification_types)
SELECT 
    n.id,
    n.user_id,
    nt.name as notification_type,
    n.title,
    n.message,
    n.priority,
    n.read_at,
    n.created_at,
    u.email as user_email,
    u.role as user_role
FROM notifications n
JOIN notification_types nt ON n.notification_type_id = nt.id
LEFT JOIN users u ON n.user_id = u.id
WHERE nt.name IN ('build_started', 'build_completed', 'build_failed')
ORDER BY n.created_at DESC
LIMIT 10;

-- Check if any admin users exist
SELECT id, email, role 
FROM users 
WHERE role IN ('admin', 'super_admin') 
AND deleted_at IS NULL;

-- Check latest build run status
SELECT 
    run_id,
    env,
    origin,
    status,
    started_at,
    ended_at,
    last_heartbeat_at,
    TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW())) as duration_seconds
FROM build_runs
ORDER BY started_at DESC
LIMIT 5;
