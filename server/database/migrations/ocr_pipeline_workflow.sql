-- Migration: OCR Pipeline Workflow Extensions
-- Extends ocr_jobs with pipeline stage tracking and creates ocr_job_history table
-- Run on: orthodoxmetrics_db (platform DB)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 1. Extend ocr_jobs with pipeline workflow columns
-- ============================================================================

-- Add progress_percent column
SET @has_progress_percent = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' AND TABLE_NAME = 'ocr_jobs' AND COLUMN_NAME = 'progress_percent');
SET @sql = IF(@has_progress_percent = 0, 'ALTER TABLE ocr_jobs ADD COLUMN progress_percent TINYINT UNSIGNED DEFAULT 0 COMMENT "0-100 pipeline progress"', 'SELECT "progress_percent already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add current_stage column
SET @has_current_stage = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' AND TABLE_NAME = 'ocr_jobs' AND COLUMN_NAME = 'current_stage');
SET @sql = IF(@has_current_stage = 0, 'ALTER TABLE ocr_jobs ADD COLUMN current_stage VARCHAR(50) DEFAULT NULL COMMENT "Current pipeline stage: intake, preprocessing, ocr_processing, extracting, validating, committing"', 'SELECT "current_stage already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add started_at column
SET @has_started_at = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' AND TABLE_NAME = 'ocr_jobs' AND COLUMN_NAME = 'started_at');
SET @sql = IF(@has_started_at = 0, 'ALTER TABLE ocr_jobs ADD COLUMN started_at TIMESTAMP NULL DEFAULT NULL COMMENT "When job processing started"', 'SELECT "started_at already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add completed_at column
SET @has_completed_at = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' AND TABLE_NAME = 'ocr_jobs' AND COLUMN_NAME = 'completed_at');
SET @sql = IF(@has_completed_at = 0, 'ALTER TABLE ocr_jobs ADD COLUMN completed_at TIMESTAMP NULL DEFAULT NULL COMMENT "When job completed or failed"', 'SELECT "completed_at already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add created_by column
SET @has_created_by = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' AND TABLE_NAME = 'ocr_jobs' AND COLUMN_NAME = 'created_by');
SET @sql = IF(@has_created_by = 0, 'ALTER TABLE ocr_jobs ADD COLUMN created_by INT NULL DEFAULT NULL COMMENT "User ID who created the job"', 'SELECT "created_by already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add resume_token column
SET @has_resume_token = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' AND TABLE_NAME = 'ocr_jobs' AND COLUMN_NAME = 'resume_token');
SET @sql = IF(@has_resume_token = 0, 'ALTER TABLE ocr_jobs ADD COLUMN resume_token VARCHAR(64) NULL DEFAULT NULL COMMENT "Token for resuming from last stage"', 'SELECT "resume_token already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add last_activity_at column
SET @has_last_activity_at = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' AND TABLE_NAME = 'ocr_jobs' AND COLUMN_NAME = 'last_activity_at');
SET @sql = IF(@has_last_activity_at = 0, 'ALTER TABLE ocr_jobs ADD COLUMN last_activity_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT "Last activity timestamp"', 'SELECT "last_activity_at already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add archived_at column for soft delete
SET @has_archived_at = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' AND TABLE_NAME = 'ocr_jobs' AND COLUMN_NAME = 'archived_at');
SET @sql = IF(@has_archived_at = 0, 'ALTER TABLE ocr_jobs ADD COLUMN archived_at TIMESTAMP NULL DEFAULT NULL COMMENT "Soft delete timestamp"', 'SELECT "archived_at already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add index on current_stage
SET @has_idx_current_stage = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' AND TABLE_NAME = 'ocr_jobs' AND INDEX_NAME = 'idx_current_stage');
SET @sql = IF(@has_idx_current_stage = 0, 'CREATE INDEX idx_current_stage ON ocr_jobs(current_stage)', 'SELECT "idx_current_stage already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add index on last_activity_at
SET @has_idx_last_activity = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' AND TABLE_NAME = 'ocr_jobs' AND INDEX_NAME = 'idx_last_activity');
SET @sql = IF(@has_idx_last_activity = 0, 'CREATE INDEX idx_last_activity ON ocr_jobs(last_activity_at)', 'SELECT "idx_last_activity already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================================
-- 2. Create ocr_job_history table for stage transition tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS ocr_job_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  job_id BIGINT NOT NULL COMMENT 'FK to ocr_jobs.id',
  stage VARCHAR(50) NOT NULL COMMENT 'Pipeline stage name',
  status VARCHAR(20) NOT NULL COMMENT 'started, completed, failed, skipped',
  message TEXT NULL COMMENT 'Additional info or error message',
  duration_ms INT NULL COMMENT 'Duration of this stage in milliseconds',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_job_id (job_id),
  INDEX idx_stage (stage),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- Migration Complete
-- ============================================================================
