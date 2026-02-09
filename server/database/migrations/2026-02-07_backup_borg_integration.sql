-- Database Migration: Add Borg Support to Backup System
-- Date: 2026-02-07
-- Purpose: Extend backup_jobs and backup_artifacts to support 'borg' type

-- Safety: This migration is idempotent and safe to run multiple times

USE orthodoxmetrics_db;

-- 1. Add 'borg' to backup_jobs.kind enum
-- Check current enum values first
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
  AND TABLE_NAME = 'backup_jobs' 
  AND COLUMN_NAME = 'kind';

-- Modify kind enum to include 'borg'
ALTER TABLE backup_jobs 
MODIFY COLUMN kind ENUM('files', 'db', 'both', 'borg') NOT NULL;

-- Verify change
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
  AND TABLE_NAME = 'backup_jobs' 
  AND COLUMN_NAME = 'kind';

-- Expected: enum('files','db','both','borg')

-- 2. Add 'borg' to backup_artifacts.artifact_type enum
-- Check current enum values first
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
  AND TABLE_NAME = 'backup_artifacts' 
  AND COLUMN_NAME = 'artifact_type';

-- Modify artifact_type enum to include 'borg'
ALTER TABLE backup_artifacts 
MODIFY COLUMN artifact_type ENUM('files', 'database', 'borg') NOT NULL;

-- Verify change
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
  AND TABLE_NAME = 'backup_artifacts' 
  AND COLUMN_NAME = 'artifact_type';

-- Expected: enum('files','database','borg')

-- 3. Ensure backup_settings table exists with borg_repo_path
CREATE TABLE IF NOT EXISTS backup_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  enabled BOOLEAN DEFAULT TRUE,
  schedule VARCHAR(50) DEFAULT '0 2 * * *',
  keep_hourly INT DEFAULT 48,
  keep_daily INT DEFAULT 30,
  keep_weekly INT DEFAULT 12,
  keep_monthly INT DEFAULT 6,
  compression_level INT DEFAULT 3,
  borg_repo_path VARCHAR(255) DEFAULT '/var/backups/OM/repo',
  include_database BOOLEAN DEFAULT TRUE,
  include_files BOOLEAN DEFAULT TRUE,
  include_uploads BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT FALSE,
  notification_email VARCHAR(255),
  verify_after_backup BOOLEAN DEFAULT TRUE,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Insert default settings if none exist
INSERT INTO backup_settings (
  enabled, schedule, keep_daily, keep_weekly, keep_monthly,
  borg_repo_path, include_database, include_files, include_uploads,
  compression_level, verify_after_backup
) 
SELECT 
  TRUE, '0 2 * * *', 7, 4, 6,
  '/var/backups/OM/repo', TRUE, TRUE, TRUE,
  3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM backup_settings LIMIT 1);

-- Verification queries
SELECT '=== backup_jobs schema ===' as '';
SHOW CREATE TABLE backup_jobs;

SELECT '=== backup_artifacts schema ===' as '';
SHOW CREATE TABLE backup_artifacts;

SELECT '=== backup_settings ===' as '';
SELECT * FROM backup_settings;

SELECT '=== Recent backup jobs ===' as '';
SELECT id, kind, status, created_at, requested_by 
FROM backup_jobs 
ORDER BY created_at DESC 
LIMIT 10;

-- Success message
SELECT '✅ Migration complete - Borg support added to backup system' as 'Status';
