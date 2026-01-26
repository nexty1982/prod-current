-- Migration: Extend ocr_fused_drafts for Review & Finalize workflow
-- Add workflow lifecycle columns and history table

-- 1. Extend ocr_fused_drafts table
ALTER TABLE ocr_fused_drafts
  ADD COLUMN IF NOT EXISTS workflow_status ENUM('draft','in_review','finalized','committed') NOT NULL DEFAULT 'draft' AFTER status,
  ADD COLUMN IF NOT EXISTS last_saved_at DATETIME NULL AFTER updated_at,
  ADD COLUMN IF NOT EXISTS finalized_at DATETIME NULL AFTER last_saved_at,
  ADD COLUMN IF NOT EXISTS finalized_by VARCHAR(255) NULL AFTER finalized_at,
  ADD COLUMN IF NOT EXISTS commit_error LONGTEXT NULL AFTER finalized_by;

-- Add index on workflow_status
ALTER TABLE ocr_fused_drafts ADD INDEX IF NOT EXISTS idx_workflow_status (workflow_status);

-- 2. Create ocr_finalize_history table
CREATE TABLE IF NOT EXISTS ocr_finalize_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ocr_job_id BIGINT NOT NULL,
  entry_index INT NOT NULL DEFAULT 0,
  record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL DEFAULT 'baptism',
  record_number VARCHAR(16) NULL,
  payload_json LONGTEXT NOT NULL,
  created_record_id BIGINT NULL COMMENT 'ID in the final record table after commit',
  finalized_by VARCHAR(255) NOT NULL DEFAULT 'system',
  finalized_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  committed_at DATETIME NULL,
  source_filename VARCHAR(255) NULL,
  
  INDEX idx_record_type (record_type),
  INDEX idx_finalized_at (finalized_at),
  INDEX idx_ocr_job (ocr_job_id),
  INDEX idx_created_record (created_record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

