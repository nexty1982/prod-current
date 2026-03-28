-- =============================================================================
-- record_template1 v1.1.0 → v2.0.0 Upgrade Migration
-- Date: 2026-03-28
-- Gap Analysis: docs/record-template1-v2-gap-analysis.md
-- Backup: server/database/migrations/record_template1_backup_20260328.sql
-- =============================================================================
-- Closes all documented schema gaps from the v1.1.0 audit.
-- Adds REQUIRED_BASELINE tables only. OPTIONAL_FEATURE_PACK tables are excluded.
-- =============================================================================

USE record_template1;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 1. activity_log — Drop duplicate index
-- ============================================================================
DROP INDEX idx_act_church ON activity_log;

-- ============================================================================
-- 2. baptism_records — Add OCR columns, fix entry_type, replace indexes
-- ============================================================================

-- Add missing columns
ALTER TABLE baptism_records
  ADD COLUMN source_scan_id VARCHAR(255) DEFAULT NULL AFTER id,
  ADD COLUMN ocr_confidence DECIMAL(5,2) DEFAULT 0.00 AFTER church_id,
  ADD COLUMN verified_by INT(11) DEFAULT NULL AFTER ocr_confidence,
  ADD COLUMN verified_at DATETIME DEFAULT NULL AFTER verified_by;

-- Fix entry_type constraint
ALTER TABLE baptism_records
  MODIFY COLUMN entry_type VARCHAR(50) NOT NULL DEFAULT 'Baptism';

-- Replace indexes: drop non-church-scoped, add church-scoped composites
DROP INDEX idx_bap_name ON baptism_records;
DROP INDEX idx_bap_dates ON baptism_records;
DROP INDEX idx_bap_church ON baptism_records;

ALTER TABLE baptism_records
  ADD INDEX idx_church_lastname (church_id, last_name),
  ADD INDEX idx_church_firstname (church_id, first_name),
  ADD INDEX idx_church_birthdate (church_id, birth_date),
  ADD INDEX idx_church_receptiondate (church_id, reception_date);

-- ============================================================================
-- 3. baptism_history — Add audit columns and indexes
-- ============================================================================
ALTER TABLE baptism_history
  ADD COLUMN diff_data LONGTEXT DEFAULT NULL AFTER record_data,
  ADD COLUMN actor_user_id INT(11) DEFAULT NULL AFTER church_id,
  ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'system' AFTER actor_user_id,
  ADD COLUMN request_id VARCHAR(64) DEFAULT NULL AFTER source,
  ADD COLUMN ip_address VARCHAR(45) DEFAULT NULL AFTER request_id;

ALTER TABLE baptism_history
  ADD INDEX idx_bh_record (church_id, record_id, `timestamp`),
  ADD INDEX idx_bh_request (church_id, request_id),
  ADD INDEX idx_bh_actor (church_id, actor_user_id, `timestamp`);

-- ============================================================================
-- 4. marriage_history — Add audit columns and indexes
-- ============================================================================
ALTER TABLE marriage_history
  ADD COLUMN diff_data LONGTEXT DEFAULT NULL AFTER record_data,
  ADD COLUMN actor_user_id INT(11) DEFAULT NULL AFTER church_id,
  ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'system' AFTER actor_user_id,
  ADD COLUMN request_id VARCHAR(64) DEFAULT NULL AFTER source,
  ADD COLUMN ip_address VARCHAR(45) DEFAULT NULL AFTER request_id;

ALTER TABLE marriage_history
  ADD INDEX idx_mh_record (church_id, record_id, `timestamp`),
  ADD INDEX idx_mh_request (church_id, request_id),
  ADD INDEX idx_mh_actor (church_id, actor_user_id, `timestamp`);

-- ============================================================================
-- 5. funeral_history — Add audit columns and indexes
-- ============================================================================
ALTER TABLE funeral_history
  ADD COLUMN diff_data LONGTEXT DEFAULT NULL AFTER record_data,
  ADD COLUMN actor_user_id INT(11) DEFAULT NULL AFTER church_id,
  ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'system' AFTER actor_user_id,
  ADD COLUMN request_id VARCHAR(64) DEFAULT NULL AFTER source,
  ADD COLUMN ip_address VARCHAR(45) DEFAULT NULL AFTER request_id;

ALTER TABLE funeral_history
  ADD INDEX idx_fh_record (church_id, record_id, `timestamp`),
  ADD INDEX idx_fh_request (church_id, request_id),
  ADD INDEX idx_fh_actor (church_id, actor_user_id, `timestamp`);

-- ============================================================================
-- 6. ocr_jobs — Drop and recreate with full schema
-- ============================================================================
DROP TABLE ocr_jobs;

CREATE TABLE `ocr_jobs` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `church_id` INT(11) NOT NULL,
  `user_id` INT(11) DEFAULT NULL,
  `status` ENUM('pending','queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
  `record_type` VARCHAR(64) DEFAULT NULL,
  `language` VARCHAR(32) DEFAULT NULL,
  `source_filename` VARCHAR(255) DEFAULT NULL,
  `filename` VARCHAR(255) DEFAULT NULL,
  `original_filename` VARCHAR(255) DEFAULT NULL,
  `storage_path` VARCHAR(1024) DEFAULT NULL,
  `file_path` VARCHAR(1024) DEFAULT NULL,
  `mime_type` VARCHAR(128) DEFAULT NULL,
  `file_size` BIGINT(20) DEFAULT NULL,
  `result_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`result_json`)),
  `confidence_score` DECIMAL(6,4) DEFAULT NULL,
  `pages` INT(11) DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `error` TEXT DEFAULT NULL,
  `processing_time_ms` INT(11) DEFAULT NULL,
  `errors` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ocr_result` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ocr_result`)),
  `ocr_text` LONGTEXT DEFAULT NULL,
  `ocr_result_json` LONGTEXT DEFAULT NULL,
  `processing_started_at` DATETIME DEFAULT NULL,
  `processing_ended_at` DATETIME DEFAULT NULL,
  `killed_at` DATETIME DEFAULT NULL,
  `killed_by` INT(11) DEFAULT NULL,
  `kill_reason` VARCHAR(255) DEFAULT NULL,
  `worker_id` VARCHAR(64) DEFAULT NULL,
  `error_json` LONGTEXT DEFAULT NULL,
  `retry_count` INT(11) NOT NULL DEFAULT 0,
  `archived_at` DATETIME DEFAULT NULL,
  `archived_by` INT(11) DEFAULT NULL,
  `archived_reason` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ocr_jobs_church_created` (`church_id`, `created_at`),
  KEY `idx_ocr_jobs_status` (`status`),
  KEY `idx_ocr_jobs_user_created` (`user_id`, `created_at`),
  KEY `idx_ocr_jobs_record_type` (`record_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_church` (`church_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. NEW TABLE: ocr_draft_records
-- ============================================================================
CREATE TABLE `ocr_draft_records` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `ocr_job_id` INT(11) NOT NULL,
  `church_id` INT(11) NOT NULL,
  `record_type` ENUM('baptism','marriage','funeral') NOT NULL,
  `record_data` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`record_data`)),
  `status` ENUM('draft','approved','rejected','imported') DEFAULT 'draft',
  `created_by` INT(11) DEFAULT NULL,
  `approved_by` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `imported_at` TIMESTAMP NULL DEFAULT NULL,
  `imported_record_id` INT(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_job_draft` (`ocr_job_id`),
  KEY `idx_ocr_job` (`ocr_job_id`),
  KEY `idx_church` (`church_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. NEW TABLE: ocr_feeder_artifacts
-- ============================================================================
CREATE TABLE `ocr_feeder_artifacts` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `page_id` INT(11) NOT NULL,
  `type` VARCHAR(50) DEFAULT NULL,
  `storage_path` VARCHAR(512) DEFAULT NULL,
  `json_blob` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`json_blob`)),
  `meta_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta_json`)),
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  `sha256` VARCHAR(64) DEFAULT NULL,
  `bytes` BIGINT(20) DEFAULT NULL,
  `mime_type` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_page_type_created` (`page_id`, `type`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. NEW TABLE: ocr_feeder_pages
-- ============================================================================
CREATE TABLE `ocr_feeder_pages` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `job_id` INT(11) NOT NULL,
  `page_index` INT(11) DEFAULT 0,
  `status` ENUM('queued','preprocessing','ocr','parsing','scoring','accepted','review','retry','failed') DEFAULT 'queued',
  `input_path` VARCHAR(512) DEFAULT NULL,
  `preproc_path` VARCHAR(512) DEFAULT NULL,
  `ocr_confidence` FLOAT DEFAULT NULL,
  `quality_score` FLOAT DEFAULT NULL,
  `retry_count` INT(11) DEFAULT 0,
  `last_error` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. NEW TABLE: ocr_finalize_history
-- ============================================================================
CREATE TABLE `ocr_finalize_history` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `ocr_job_id` BIGINT(20) NOT NULL,
  `entry_index` INT(11) NOT NULL DEFAULT 0,
  `record_type` ENUM('baptism','marriage','funeral') NOT NULL DEFAULT 'baptism',
  `record_number` VARCHAR(16) DEFAULT NULL,
  `payload_json` LONGTEXT NOT NULL,
  `created_record_id` BIGINT(20) DEFAULT NULL COMMENT 'ID in the final record table after commit',
  `finalized_by` VARCHAR(255) NOT NULL DEFAULT 'system',
  `finalized_at` DATETIME NOT NULL DEFAULT current_timestamp(),
  `committed_at` DATETIME DEFAULT NULL,
  `source_filename` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_record_type` (`record_type`),
  KEY `idx_finalized_at` (`finalized_at`),
  KEY `idx_ocr_job` (`ocr_job_id`),
  KEY `idx_created_record` (`created_record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 11. NEW TABLE: ocr_fused_drafts
-- ============================================================================
CREATE TABLE `ocr_fused_drafts` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `ocr_job_id` BIGINT(20) NOT NULL,
  `entry_index` INT(11) NOT NULL DEFAULT 0,
  `record_type` ENUM('baptism','marriage','funeral') NOT NULL DEFAULT 'baptism',
  `record_number` VARCHAR(16) DEFAULT NULL,
  `payload_json` LONGTEXT NOT NULL,
  `bbox_json` LONGTEXT DEFAULT NULL COMMENT 'Stores entry bbox and per-field bbox links',
  `status` ENUM('draft','committed') NOT NULL DEFAULT 'draft',
  `workflow_status` ENUM('draft','in_review','finalized','committed') NOT NULL DEFAULT 'draft',
  `committed_record_id` BIGINT(20) DEFAULT NULL COMMENT 'ID of the committed record in the final table',
  `created_by` VARCHAR(255) NOT NULL DEFAULT 'system',
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_saved_at` DATETIME DEFAULT NULL,
  `finalized_at` DATETIME DEFAULT NULL,
  `finalized_by` VARCHAR(255) DEFAULT NULL,
  `commit_error` LONGTEXT DEFAULT NULL,
  `church_id` INT(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_job_entry` (`ocr_job_id`, `entry_index`),
  KEY `idx_status` (`status`),
  KEY `idx_record_type` (`record_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_workflow_status` (`workflow_status`),
  KEY `idx_church` (`church_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 12. NEW TABLE: ocr_mappings
-- ============================================================================
CREATE TABLE `ocr_mappings` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `ocr_job_id` INT(11) NOT NULL,
  `church_id` INT(11) NOT NULL,
  `record_type` ENUM('baptism','marriage','funeral') NOT NULL,
  `mapping_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`mapping_json`)),
  `bbox_links` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`bbox_links`)),
  `status` ENUM('draft','reviewed','approved','rejected') DEFAULT 'draft',
  `created_by` VARCHAR(255) DEFAULT NULL,
  `reviewed_by` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_job_mapping` (`ocr_job_id`),
  KEY `idx_ocr_job` (`ocr_job_id`),
  KEY `idx_church` (`church_id`),
  KEY `idx_status` (`status`),
  KEY `idx_record_type` (`record_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 13. NEW TABLE: ocr_settings
-- ============================================================================
CREATE TABLE `ocr_settings` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `church_id` INT(11) NOT NULL,
  `engine` VARCHAR(50) DEFAULT 'tesseract',
  `language` VARCHAR(10) DEFAULT 'eng',
  `dpi` INT(11) DEFAULT 300,
  `deskew` TINYINT(1) DEFAULT 1,
  `remove_noise` TINYINT(1) DEFAULT 1,
  `preprocess_images` TINYINT(1) DEFAULT 1,
  `output_format` VARCHAR(20) DEFAULT 'json',
  `confidence_threshold` DECIMAL(5,2) DEFAULT 0.75,
  `default_language` VARCHAR(10) DEFAULT 'en',
  `preprocessing_enabled` TINYINT(1) DEFAULT 1,
  `auto_contrast` TINYINT(1) DEFAULT 1,
  `auto_rotate` TINYINT(1) DEFAULT 1,
  `noise_reduction` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  `updated_at` TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_church_settings` (`church_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 14. NEW TABLE: ocr_setup_state
-- ============================================================================
CREATE TABLE `ocr_setup_state` (
  `church_id` INT(11) NOT NULL,
  `state_json` LONGTEXT DEFAULT NULL,
  `percent_complete` INT(11) NOT NULL DEFAULT 0,
  `is_complete` TINYINT(1) NOT NULL DEFAULT 0,
  `flow_type` ENUM('blank_slate','existing_records') DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`church_id`),
  KEY `idx_is_complete` (`is_complete`),
  KEY `idx_updated_at` (`updated_at`),
  KEY `idx_flow_type` (`flow_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 15. NEW TABLE: record_supplements
-- ============================================================================
CREATE TABLE `record_supplements` (
  `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `record_type` VARCHAR(64) NOT NULL,
  `record_id` BIGINT(20) UNSIGNED NOT NULL,
  `field_key` VARCHAR(128) NOT NULL,
  `field_type` ENUM('string','number','date','bool','json') NOT NULL DEFAULT 'string',
  `value_string` TEXT DEFAULT NULL,
  `value_number` DECIMAL(18,6) DEFAULT NULL,
  `value_date` DATE DEFAULT NULL,
  `value_bool` TINYINT(1) DEFAULT NULL,
  `value_json` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`value_json`)),
  `source` ENUM('manual','ocr','import','system') NOT NULL DEFAULT 'manual',
  `confidence` DECIMAL(4,3) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_by` BIGINT(20) UNSIGNED DEFAULT NULL,
  `updated_by` BIGINT(20) UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT current_timestamp(),
  `updated_at` DATETIME NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_record_lookup` (`record_type`, `record_id`),
  KEY `idx_field_key` (`field_key`),
  KEY `idx_record_field` (`record_type`, `record_id`, `field_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 16. Update template_meta — version bump and re-freeze
-- ============================================================================
UPDATE template_meta SET
  description = 'Canonical tenant database template v2.0.0. Schema gaps closed: 4 OCR columns added to baptism_records, 5 audit columns added to all history tables, ocr_jobs rebuilt with full schema, 9 REQUIRED_BASELINE tables added (OCR pipeline + record_supplements), duplicate index removed. 20 tables total.',
  version = '2.0.0',
  updated_at = NOW(),
  frozen_at = NOW(),
  frozen_by = 'omsvc (claude_cli v2 upgrade)'
WHERE id = 1;

SET FOREIGN_KEY_CHECKS = 1;
