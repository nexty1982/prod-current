-- Migration: Create error_events table for OMAI Logger System
-- Date: 2025-01-27
-- Description: Create the error_events table with full logging support including SUCCESS and DEBUG levels

-- Create error_events table
CREATE TABLE IF NOT EXISTS error_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hash VARCHAR(32) NOT NULL UNIQUE COMMENT 'MD5 hash for deduplication',
  message TEXT NOT NULL COMMENT 'Log message content',
  details TEXT DEFAULT NULL COMMENT 'Additional details, stack trace, or context',
  log_level ENUM('INFO', 'WARN', 'ERROR', 'DEBUG', 'SUCCESS') DEFAULT 'ERROR' COMMENT 'Log severity level',
  origin VARCHAR(64) DEFAULT NULL COMMENT 'Source origin: server, browser, devtools, etc.',
  source_component VARCHAR(128) DEFAULT NULL COMMENT 'Component that generated the log',
  source VARCHAR(64) DEFAULT 'unknown' COMMENT 'General source category: frontend, backend, etc.',
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When this error was first encountered',
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'When this error was last encountered',
  occurrences INT DEFAULT 1 COMMENT 'Number of times this error has occurred',
  severity ENUM('low', 'medium', 'high') DEFAULT 'medium' COMMENT 'Legacy severity field',
  resolved BOOLEAN DEFAULT FALSE COMMENT 'Whether this error has been resolved',
  meta JSON DEFAULT NULL COMMENT 'Additional metadata in JSON format',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_error_events_hash (hash),
  INDEX idx_error_events_log_level (log_level),
  INDEX idx_error_events_origin (origin),
  INDEX idx_error_events_source_component (source_component),
  INDEX idx_error_events_source (source),
  INDEX idx_error_events_last_seen (last_seen),
  INDEX idx_error_events_first_seen (first_seen),
  INDEX idx_error_events_occurrences (occurrences),
  INDEX idx_error_events_severity (severity),
  INDEX idx_error_events_resolved (resolved)
);

-- Add sample data for testing
INSERT INTO error_events (
    hash, 
    message, 
    details, 
    log_level, 
    origin, 
    source_component, 
    source,
    first_seen, 
    last_seen, 
    occurrences,
    severity
) VALUES 
(
    MD5('backup_completed_success'),
    'Database backup completed successfully',
    'Backup size: 2.4GB, Duration: 3m 42s, Location: /var/backups/orthodmetrics_2025-01-27.sql.gz',
    'SUCCESS',
    'server',
    'BackupManager',
    'backend',
    NOW(),
    NOW(),
    1,
    'low'
),
(
    MD5('component_mounted_debug'),
    'React component mounted successfully',
    'Component: LoggerDashboard, Props: {isLive: true, autoScroll: true}, Render time: 45ms',
    'DEBUG',
    'browser',
    'LoggerDashboard',
    'frontend',
    NOW() - INTERVAL 5 MINUTE,
    NOW() - INTERVAL 1 MINUTE,
    3,
    'low'
),
(
    MD5('user_authentication_success'),
    'User authentication completed',
    'User ID: 1234, Session ID: sess_abc123, Login method: password, IP: 192.168.1.100',
    'INFO',
    'server',
    'AuthController',
    'backend',
    NOW() - INTERVAL 10 MINUTE,
    NOW() - INTERVAL 2 MINUTE,
    2,
    'medium'
),
(
    MD5('api_response_warning'),
    'API response time exceeded threshold',
    'Endpoint: /api/admin/logs/database, Response time: 2.8s, Threshold: 2.0s, User: admin@orthodoxmetrics.com',
    'WARN',
    'server',
    'ApiMiddleware',
    'backend',
    NOW() - INTERVAL 15 MINUTE,
    NOW() - INTERVAL 3 MINUTE,
    5,
    'medium'
),
(
    MD5('database_connection_error'),
    'Database connection temporarily failed',
    'Connection pool exhausted, Max connections: 50, Active: 50, Queue: 12, Retry successful after 2.3s',
    'ERROR',
    'server',
    'DatabasePool',
    'backend',
    NOW() - INTERVAL 20 MINUTE,
    NOW() - INTERVAL 5 MINUTE,
    1,
    'high'
),
(
    MD5('frontend_console_debug'),
    'Frontend debug log from console.debug',
    'User action: Button click, Component: HeaderBar, Action: toggleDebugMode, State: enabled',
    'DEBUG',
    'browser',
    'HeaderBar',
    'frontend',
    NOW() - INTERVAL 1 MINUTE,
    NOW() - INTERVAL 1 MINUTE,
    1,
    'low'
),
(
    MD5('session_cleanup_success'),
    'User session cleanup completed',
    'Cleaned up 23 expired sessions, Active sessions: 145, Average session duration: 2h 34m',
    'SUCCESS',
    'server',
    'SessionManager',
    'backend',
    NOW() - INTERVAL 30 MINUTE,
    NOW() - INTERVAL 10 MINUTE,
    1,
    'low'
);

-- Verify the table was created
SELECT COUNT(*) as total_logs, 
       COUNT(CASE WHEN log_level = 'SUCCESS' THEN 1 END) as success_logs,
       COUNT(CASE WHEN log_level = 'DEBUG' THEN 1 END) as debug_logs,
       COUNT(CASE WHEN log_level = 'INFO' THEN 1 END) as info_logs,
       COUNT(CASE WHEN log_level = 'WARN' THEN 1 END) as warn_logs,
       COUNT(CASE WHEN log_level = 'ERROR' THEN 1 END) as error_logs
FROM error_events;