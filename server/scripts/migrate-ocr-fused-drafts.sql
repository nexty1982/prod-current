-- Migration: Create ocr_fused_drafts table for storing Fusion workflow drafts
-- This table stores draft records extracted from OCR before committing to final record tables

CREATE TABLE IF NOT EXISTS ocr_fused_drafts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ocr_job_id BIGINT NOT NULL,
  entry_index INT NOT NULL DEFAULT 0,
  record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL DEFAULT 'baptism',
  record_number VARCHAR(16) NULL,
  payload_json LONGTEXT NOT NULL,
  bbox_json LONGTEXT NULL COMMENT 'Stores entry bbox and per-field bbox links',
  status ENUM('draft', 'committed') NOT NULL DEFAULT 'draft',
  committed_record_id BIGINT NULL COMMENT 'ID of the committed record in the final table',
  created_by VARCHAR(255) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_job_entry (ocr_job_id, entry_index),
  INDEX idx_status (status),
  INDEX idx_record_type (record_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

