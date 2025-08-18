-- Migration: Update OMAI Error Tracking Database Schema
-- Date: 2025-01-27
-- Description: Add log_level, origin, and source_component columns to existing errors table

-- Update the errors table to support new log levels
ALTER TABLE errors
  ADD COLUMN log_level ENUM('INFO', 'WARN', 'ERROR', 'DEBUG', 'SUCCESS') DEFAULT 'ERROR' AFTER severity,
  ADD COLUMN origin VARCHAR(64) DEFAULT NULL COMMENT 'Source origin: server, browser, devtools, etc.' AFTER log_level,
  ADD COLUMN source_component VARCHAR(128) DEFAULT NULL COMMENT 'Component that generated the log' AFTER origin;

-- Update existing records to set log_level based on severity
UPDATE errors 
SET log_level = CASE 
    WHEN severity = 'critical' THEN 'ERROR'
    WHEN severity = 'high' THEN 'ERROR' 
    WHEN severity = 'medium' THEN 'WARN'
    WHEN severity = 'low' THEN 'INFO'
    ELSE 'ERROR'
END
WHERE log_level = 'ERROR';

-- Update existing records to set origin based on type
UPDATE errors 
SET origin = CASE 
    WHEN type = 'frontend' THEN 'browser'
    WHEN type = 'backend' THEN 'server'
    WHEN type = 'nginx' THEN 'server'
    WHEN type = 'db' THEN 'server'
    WHEN type = 'api' THEN 'server'
    ELSE 'unknown'
END
WHERE origin IS NULL;

-- Add indexes for performance on new columns
CREATE INDEX idx_errors_log_level ON errors(log_level);
CREATE INDEX idx_errors_origin ON errors(origin);
CREATE INDEX idx_errors_source_component ON errors(source_component);

-- Add sample SUCCESS and DEBUG entries for testing
INSERT INTO errors (
    hash, 
    type, 
    source, 
    message, 
    first_seen, 
    last_seen, 
    occurrences, 
    status, 
    severity, 
    log_level, 
    origin, 
    source_component,
    auto_tracked
) VALUES 
(
    MD5('backup_completed_success'),
    'backend',
    'BackupManager',
    'Database backup completed successfully',
    NOW(),
    NOW(),
    1,
    'resolved',
    'low',
    'SUCCESS',
    'server',
    'BackupManager',
    1
),
(
    MD5('component_mounted_debug'),
    'frontend',
    'LoggerDashboard',
    'React component mounted successfully',
    NOW() - INTERVAL 5 MINUTE,
    NOW() - INTERVAL 1 MINUTE,
    3,
    'pending',
    'low',
    'DEBUG',
    'browser',
    'LoggerDashboard',
    1
),
(
    MD5('user_authentication_info'),
    'backend',
    'AuthController',
    'User authentication completed',
    NOW() - INTERVAL 10 MINUTE,
    NOW() - INTERVAL 2 MINUTE,
    2,
    'resolved',
    'low',
    'INFO',
    'server',
    'AuthController',
    1
),
(
    MD5('session_cleanup_success'),
    'backend',
    'SessionManager',
    'User session cleanup completed',
    NOW() - INTERVAL 30 MINUTE,
    NOW() - INTERVAL 10 MINUTE,
    1,
    'resolved',
    'low',
    'SUCCESS',
    'server',
    'SessionManager',
    1
),
(
    MD5('frontend_console_debug'),
    'frontend',
    'HeaderBar',
    'Frontend debug log from console.debug',
    NOW() - INTERVAL 1 MINUTE,
    NOW() - INTERVAL 1 MINUTE,
    1,
    'pending',
    'low',
    'DEBUG',
    'browser',
    'HeaderBar',
    1
);

-- Verify the schema changes
DESCRIBE errors;

-- Show log level distribution
SELECT log_level, COUNT(*) as count 
FROM errors 
GROUP BY log_level 
ORDER BY count DESC;