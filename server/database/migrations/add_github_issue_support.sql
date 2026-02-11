-- Migration: Add GitHub Issue Support and CRITICAL Log Level
-- Date: $(date)
-- Description: Add GitHub issue tracking for errors and CRITICAL log level support

-- Add GitHub issue URL column to errors table
ALTER TABLE errors
ADD COLUMN github_issue_url VARCHAR(512) DEFAULT NULL COMMENT 'GitHub issue URL for this error';

-- Update error_events table to include CRITICAL log level
ALTER TABLE error_events
MODIFY COLUMN log_level ENUM('INFO','SUCCESS','WARN','DEBUG','ERROR','CRITICAL') DEFAULT 'INFO';

-- Add index for GitHub issue URL for performance
CREATE INDEX idx_errors_github_issue_url ON errors(github_issue_url);

-- Create table for GitHub issue metadata (optional - for tracking)
CREATE TABLE IF NOT EXISTS github_issues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    error_hash VARCHAR(32) NOT NULL,
    issue_number INT NOT NULL,
    issue_url VARCHAR(512) NOT NULL,
    issue_title VARCHAR(255) NOT NULL,
    issue_state ENUM('open', 'closed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (error_hash) REFERENCES errors(hash) ON DELETE CASCADE,
    UNIQUE KEY unique_error_issue (error_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add sample CRITICAL log entry for testing
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
    MD5('system_critical_failure'),
    'Critical system failure detected',
    'Memory usage exceeded 95%, system stability compromised',
    'CRITICAL',
    'server',
    'SystemMonitor',
    NOW(),
    NOW(),
    1
),
(
    MD5('database_critical_error'),
    'Database connection pool exhausted',
    'All database connections in use, new requests failing',
    'CRITICAL',
    'server',
    'DatabaseManager',
    NOW(),
    NOW(),
    3
);

-- Update any existing high-severity errors to CRITICAL if appropriate
UPDATE error_events 
SET log_level = 'CRITICAL' 
WHERE log_level = 'ERROR' 
  AND (message LIKE '%critical%' OR message LIKE '%fatal%' OR message LIKE '%system failure%');

-- Add comments for documentation
ALTER TABLE errors MODIFY COLUMN github_issue_url VARCHAR(512) DEFAULT NULL 
  COMMENT 'GitHub issue URL created for this error for tracking and resolution';

ALTER TABLE error_events MODIFY COLUMN log_level ENUM('INFO','SUCCESS','WARN','DEBUG','ERROR','CRITICAL') DEFAULT 'INFO'
  COMMENT 'Log severity level - CRITICAL for system-threatening issues';

-- Verify the changes
SELECT COUNT(*) as critical_logs FROM error_events WHERE log_level = 'CRITICAL';
SELECT COUNT(*) as errors_with_github FROM errors WHERE github_issue_url IS NOT NULL;