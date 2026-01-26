-- Migration: Add SUCCESS and DEBUG Log Support
-- Date: $(date)
-- Description: Enhance error_events table to support SUCCESS and DEBUG log levels with additional context

-- Add new columns to error_events table
ALTER TABLE error_events
  ADD COLUMN log_level ENUM('INFO', 'WARN', 'ERROR', 'DEBUG', 'SUCCESS') DEFAULT 'ERROR',
  ADD COLUMN origin VARCHAR(64) COMMENT 'Source origin: server, browser, devtools, etc.',
  ADD COLUMN source_component VARCHAR(128) COMMENT 'Component that generated the log';

-- Update existing records to set log_level based on severity
UPDATE error_events 
SET log_level = CASE 
    WHEN severity = 'high' THEN 'ERROR'
    WHEN severity = 'medium' THEN 'WARN' 
    WHEN severity = 'low' THEN 'INFO'
    ELSE 'ERROR'
END
WHERE log_level = 'ERROR';

-- Add index for performance on new log_level column
CREATE INDEX idx_error_events_log_level ON error_events(log_level);
CREATE INDEX idx_error_events_origin ON error_events(origin);
CREATE INDEX idx_error_events_source_component ON error_events(source_component);

-- Add sample SUCCESS and DEBUG entries for testing
INSERT INTO error_events (
    hash, 
    message, 
    details, 
    log_level, 
    origin, 
    source_component, 
    first_seen, 
    last_seen, 
    occurrences
) VALUES 
(
    MD5('backup_completed_success'),
    'Database backup completed successfully',
    'Backup size: 2.4GB, Duration: 3m 42s',
    'SUCCESS',
    'server',
    'BackupManager',
    NOW(),
    NOW(),
    1
),
(
    MD5('component_mounted_debug'),
    'React component mounted and initialized',
    'Component: UserDashboard, Props: {userId: 123}',
    'DEBUG',
    'browser',
    'ReactComponent',
    NOW(),
    NOW(),
    15
),
(
    MD5('session_cleanup_success'),
    'Session cleanup completed',
    'Cleaned up 127 expired sessions',
    'SUCCESS',
    'server',
    'SessionManager',
    NOW(),
    NOW(),
    1
);

-- Update errors table to include new log levels in summary
-- Note: This may need adjustment based on your current errors table structure