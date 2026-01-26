-- Migration: Normalize OCR Schema - DB as Source of Truth
-- Idempotent migration to standardize ocr_jobs columns across all church databases
-- Run this for each church database (om_church_##)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 1. Normalize ocr_jobs table
-- ============================================================================

-- Ensure table exists with canonical schema
CREATE TABLE IF NOT EXISTS ocr_jobs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL COMMENT 'Canonical: use this column name',
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NULL,
  mime_type VARCHAR(100) NULL,
  status ENUM('pending', 'processing', 'completed', 'failed', 'queued') NOT NULL DEFAULT 'pending' COMMENT 'Canonical: use this column name',
  record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL DEFAULT 'baptism',
  language VARCHAR(10) DEFAULT 'en',
  confidence_score DECIMAL(5,2) NULL,
  pages INT NULL DEFAULT 1,
  ocr_text LONGTEXT NULL COMMENT 'Canonical: OCR extracted text',
  ocr_result_json LONGTEXT NULL COMMENT 'Canonical: Full Vision API JSON response',
  error TEXT NULL,
  processing_time_ms INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_church (church_id),
  INDEX idx_status (status),
  INDEX idx_record_type (record_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate legacy columns to canonical names (idempotent)
-- Use dynamic SQL to safely migrate data only if legacy columns exist

-- Handle file_name -> filename
SET @has_file_name = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'ocr_jobs' 
  AND COLUMN_NAME = 'file_name'
);
SET @has_filename = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'ocr_jobs' 
  AND COLUMN_NAME = 'filename'
);
SET @sql = IF(@has_file_name > 0 AND @has_filename > 0,
  'UPDATE ocr_jobs SET filename = COALESCE(NULLIF(filename, ''''), file_name) WHERE filename IS NULL OR filename = ''''',
  'SELECT "file_name column does not exist or filename already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Handle ocr_result -> ocr_result_json (if ocr_result contains JSON)
SET @has_ocr_result = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'ocr_jobs' 
  AND COLUMN_NAME = 'ocr_result'
);
SET @has_ocr_result_json = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'ocr_jobs' 
  AND COLUMN_NAME = 'ocr_result_json'
);
SET @sql = IF(@has_ocr_result > 0 AND @has_ocr_result_json > 0,
  'UPDATE ocr_jobs SET ocr_result_json = ocr_result WHERE ocr_result_json IS NULL AND ocr_result LIKE ''{%''',
  'SELECT "ocr_result column does not exist or ocr_result_json already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Handle result_json -> ocr_result_json
SET @has_result_json = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'ocr_jobs' 
  AND COLUMN_NAME = 'result_json'
);
SET @has_ocr_result_json2 = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'ocr_jobs' 
  AND COLUMN_NAME = 'ocr_result_json'
);
SET @sql = IF(@has_result_json > 0 AND @has_ocr_result_json2 > 0,
  'UPDATE ocr_jobs SET ocr_result_json = result_json WHERE ocr_result_json IS NULL',
  'SELECT "result_json column does not exist or ocr_result_json already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Normalize status values: 'complete' -> 'completed', 'error' -> 'failed'
UPDATE ocr_jobs SET status = 'completed' WHERE status = 'complete';
UPDATE ocr_jobs SET status = 'failed' WHERE status = 'error';

-- Add missing canonical columns if they don't exist (using dynamic SQL for compatibility)
SET @has_filename = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_jobs' AND COLUMN_NAME = 'filename');
SET @sql = IF(@has_filename = 0, 'ALTER TABLE ocr_jobs ADD COLUMN filename VARCHAR(255) NOT NULL AFTER church_id', 'SELECT "filename column already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_original_filename = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_jobs' AND COLUMN_NAME = 'original_filename');
SET @sql = IF(@has_original_filename = 0, 'ALTER TABLE ocr_jobs ADD COLUMN original_filename VARCHAR(255) NOT NULL AFTER filename', 'SELECT "original_filename column already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_ocr_text = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_jobs' AND COLUMN_NAME = 'ocr_text');
SET @sql = IF(@has_ocr_text = 0, 'ALTER TABLE ocr_jobs ADD COLUMN ocr_text LONGTEXT NULL AFTER pages', 'SELECT "ocr_text column already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_ocr_result_json = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_jobs' AND COLUMN_NAME = 'ocr_result_json');
SET @sql = IF(@has_ocr_result_json = 0, 'ALTER TABLE ocr_jobs ADD COLUMN ocr_result_json LONGTEXT NULL AFTER ocr_text', 'SELECT "ocr_result_json column already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_error = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_jobs' AND COLUMN_NAME = 'error');
SET @sql = IF(@has_error = 0, 'ALTER TABLE ocr_jobs ADD COLUMN error TEXT NULL AFTER ocr_result_json', 'SELECT "error column already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_processing_time_ms = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_jobs' AND COLUMN_NAME = 'processing_time_ms');
SET @sql = IF(@has_processing_time_ms = 0, 'ALTER TABLE ocr_jobs ADD COLUMN processing_time_ms INT NULL AFTER error', 'SELECT "processing_time_ms column already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure indexes exist (using dynamic SQL for compatibility)
SET @has_idx_church = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_jobs' AND INDEX_NAME = 'idx_church');
SET @sql = IF(@has_idx_church = 0, 'CREATE INDEX idx_church ON ocr_jobs(church_id)', 'SELECT "idx_church index already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_idx_status = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_jobs' AND INDEX_NAME = 'idx_status');
SET @sql = IF(@has_idx_status = 0, 'CREATE INDEX idx_status ON ocr_jobs(status)', 'SELECT "idx_status index already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_idx_record_type = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_jobs' AND INDEX_NAME = 'idx_record_type');
SET @sql = IF(@has_idx_record_type = 0, 'CREATE INDEX idx_record_type ON ocr_jobs(record_type)', 'SELECT "idx_record_type index already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_idx_created_at = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_jobs' AND INDEX_NAME = 'idx_created_at');
SET @sql = IF(@has_idx_created_at = 0, 'CREATE INDEX idx_created_at ON ocr_jobs(created_at)', 'SELECT "idx_created_at index already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================================
-- 2. Normalize ocr_fused_drafts table
-- ============================================================================

-- Ensure table exists with canonical schema
CREATE TABLE IF NOT EXISTS ocr_fused_drafts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ocr_job_id BIGINT NOT NULL,
  entry_index INT NOT NULL DEFAULT 0,
  record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL DEFAULT 'baptism',
  record_number VARCHAR(16) NULL,
  payload_json LONGTEXT NOT NULL COMMENT 'Canonical: field values',
  bbox_json LONGTEXT NULL,
  workflow_status ENUM('draft', 'in_review', 'finalized', 'committed') NOT NULL DEFAULT 'draft' COMMENT 'Canonical: use this for workflow state',
  status ENUM('draft', 'committed') NOT NULL DEFAULT 'draft' COMMENT 'Legacy: kept for compatibility',
  church_id INT NOT NULL COMMENT 'Canonical: must not be NULL',
  committed_record_id BIGINT NULL,
  created_by VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_job_entry (ocr_job_id, entry_index),
  INDEX idx_status (workflow_status),
  INDEX idx_record_type (record_type),
  INDEX idx_church (church_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure church_id is NOT NULL (migrate NULL values)
UPDATE ocr_fused_drafts SET church_id = (
  SELECT church_id FROM ocr_jobs WHERE ocr_jobs.id = ocr_fused_drafts.ocr_job_id LIMIT 1
) WHERE church_id IS NULL;

-- Add missing columns (using dynamic SQL for compatibility)
SET @has_workflow_status = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_fused_drafts' AND COLUMN_NAME = 'workflow_status');
SET @sql = IF(@has_workflow_status = 0, 'ALTER TABLE ocr_fused_drafts ADD COLUMN workflow_status ENUM(''draft'', ''in_review'', ''finalized'', ''committed'') NOT NULL DEFAULT ''draft'' AFTER status', 'SELECT "workflow_status column already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_church_id_drafts = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_fused_drafts' AND COLUMN_NAME = 'church_id');
SET @sql = IF(@has_church_id_drafts = 0, 'ALTER TABLE ocr_fused_drafts ADD COLUMN church_id INT NOT NULL AFTER ocr_job_id', 'SELECT "church_id column already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Sync workflow_status from status if needed
UPDATE ocr_fused_drafts SET workflow_status = 'draft' WHERE workflow_status IS NULL AND status = 'draft';
UPDATE ocr_fused_drafts SET workflow_status = 'committed' WHERE workflow_status IS NULL AND status = 'committed';

-- Ensure indexes exist
-- Ensure indexes exist for ocr_fused_drafts (using dynamic SQL for compatibility)
SET @has_idx_status_drafts = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_fused_drafts' AND INDEX_NAME = 'idx_status');
SET @sql = IF(@has_idx_status_drafts = 0, 'CREATE INDEX idx_status ON ocr_fused_drafts(workflow_status)', 'SELECT "idx_status index already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_idx_record_type_drafts = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_fused_drafts' AND INDEX_NAME = 'idx_record_type');
SET @sql = IF(@has_idx_record_type_drafts = 0, 'CREATE INDEX idx_record_type ON ocr_fused_drafts(record_type)', 'SELECT "idx_record_type index already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_idx_church_drafts = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_fused_drafts' AND INDEX_NAME = 'idx_church');
SET @sql = IF(@has_idx_church_drafts = 0, 'CREATE INDEX idx_church ON ocr_fused_drafts(church_id)', 'SELECT "idx_church index already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================================
-- 3. Normalize ocr_mappings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ocr_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ocr_job_id INT NOT NULL,
  church_id INT NOT NULL COMMENT 'Canonical: must not be NULL',
  record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,
  mapping_json LONGTEXT NOT NULL,
  bbox_links LONGTEXT NULL,
  status ENUM('draft', 'reviewed', 'approved', 'rejected') DEFAULT 'draft',
  created_by VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ocr_job (ocr_job_id),
  INDEX idx_church (church_id),
  UNIQUE KEY unique_job_mapping (ocr_job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add church_id to ocr_mappings if missing (using dynamic SQL for compatibility)
SET @has_church_id_mappings = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ocr_mappings' AND COLUMN_NAME = 'church_id');
SET @sql = IF(@has_church_id_mappings = 0, 'ALTER TABLE ocr_mappings ADD COLUMN church_id INT NOT NULL AFTER ocr_job_id', 'SELECT "church_id column already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure church_id is NOT NULL (backfill from ocr_jobs)
UPDATE ocr_mappings SET church_id = (
  SELECT church_id FROM ocr_jobs WHERE ocr_jobs.id = ocr_mappings.ocr_job_id LIMIT 1
) WHERE church_id IS NULL;

-- ============================================================================
-- 4. Normalize ocr_settings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ocr_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  engine VARCHAR(50) DEFAULT 'google-vision',
  language VARCHAR(10) DEFAULT 'eng',
  default_language CHAR(2) DEFAULT 'en',
  dpi INT DEFAULT 300,
  deskew TINYINT(1) DEFAULT 1,
  remove_noise TINYINT(1) DEFAULT 1,
  preprocess_images TINYINT(1) DEFAULT 1,
  output_format VARCHAR(20) DEFAULT 'json',
  confidence_threshold DECIMAL(5,2) DEFAULT 0.75,
  preprocessing_enabled TINYINT(1) DEFAULT 1,
  auto_contrast TINYINT(1) DEFAULT 1,
  auto_rotate TINYINT(1) DEFAULT 1,
  noise_reduction TINYINT(1) DEFAULT 1,
  settings_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_church_settings (church_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- After running this migration:
-- 1. All canonical columns should exist with standard names
-- 2. Legacy columns can be dropped (optional, after verification)
-- 3. Code can use canonical column names without dynamic detection
-- 4. DB is now the single source of truth
