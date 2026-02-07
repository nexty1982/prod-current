-- ============================================================================
-- Backup Filters Seed
-- Populates backup_filters table with default exclude patterns
-- ============================================================================

USE orthodoxmetrics_db;

-- Insert default file exclusion filters (idempotent)
INSERT INTO backup_filters (scope, label, include_regex, exclude_regex, is_active, created_at, updated_at)
VALUES 
    (
        'files',
        'Node Modules',
        NULL,
        '*/node_modules/*',
        1,
        NOW(),
        NOW()
    ),
    (
        'files',
        'Build Artifacts',
        NULL,
        '*/dist/*|*/dist-backup/*|*/build/*',
        1,
        NOW(),
        NOW()
    ),
    (
        'files',
        'Git Objects',
        NULL,
        '*/.git/objects/pack/*',
        1,
        NOW(),
        NOW()
    ),
    (
        'files',
        'Log Files',
        NULL,
        '*.log|*/logs/*.log',
        1,
        NOW(),
        NOW()
    ),
    (
        'files',
        'Python Cache',
        NULL,
        '*/__pycache__/*|*.pyc|*.pyo',
        1,
        NOW(),
        NOW()
    ),
    (
        'files',
        'Vite Cache',
        NULL,
        '*/front-end/.vite/*|*/.vite/*',
        1,
        NOW(),
        NOW()
    ),
    (
        'files',
        'Temporary Files',
        NULL,
        '*.tmp|*.temp|*/tmp/*',
        1,
        NOW(),
        NOW()
    ),
    (
        'files',
        'IDE Files',
        NULL,
        '*/.vscode/*|*/.idea/*|*.swp|*.swo',
        1,
        NOW(),
        NOW()
    ),
    (
        'db',
        'Test Databases',
        NULL,
        'test_*|*_test',
        0,
        NOW(),
        NOW()
    ),
    (
        'db',
        'Performance Schema',
        NULL,
        'performance_schema|information_schema|mysql|sys',
        1,
        NOW(),
        NOW()
    )
ON DUPLICATE KEY UPDATE
    exclude_regex = VALUES(exclude_regex),
    is_active = VALUES(is_active),
    updated_at = NOW();

-- Insert default backup settings if not exists
INSERT INTO backup_settings (id, settings, created_at, updated_at)
VALUES (
    1,
    JSON_OBJECT(
        'enabled', true,
        'schedule', '0 2 * * *',
        'keep_hourly', 48,
        'keep_daily', 30,
        'keep_weekly', 12,
        'keep_monthly', 12,
        'compression_level', 3,
        'email_notifications', false,
        'notification_email', '',
        'borg_repo_path', '/var/backups/OM/repo',
        'max_parallel_dumps', 4,
        'verify_after_backup', true
    ),
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    updated_at = NOW();

-- Verify insertion
SELECT 
    id,
    scope,
    label,
    exclude_regex,
    is_active
FROM backup_filters
ORDER BY scope, id;

SELECT 
    id,
    JSON_PRETTY(settings) as settings
FROM backup_settings
WHERE id = 1;

-- Summary
SELECT 
    'Backup filters seeded successfully' as status,
    COUNT(*) as total_filters,
    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_filters
FROM backup_filters;
