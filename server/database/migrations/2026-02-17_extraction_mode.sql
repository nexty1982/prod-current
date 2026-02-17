-- Migration: Add extraction_mode to ocr_extractors, anchor config columns to
-- ocr_extractor_fields, and create ocr_correction_log table.
-- Platform DB (orthodoxmetrics_db)

SET NAMES utf8mb4;

-- ============================================================================
-- 1. Add extraction_mode to ocr_extractors
-- ============================================================================

ALTER TABLE ocr_extractors
  ADD COLUMN extraction_mode ENUM('tabular','form','multi_form','auto')
  NOT NULL DEFAULT 'tabular' AFTER page_mode;

-- Set existing records
UPDATE ocr_extractors SET extraction_mode = 'tabular'    WHERE id = 1;  -- Marriage Ledger v1
UPDATE ocr_extractors SET extraction_mode = 'multi_form' WHERE id = 2;  -- baptism-6-sep

-- ============================================================================
-- 2. Add anchor config columns to ocr_extractor_fields
-- ============================================================================

ALTER TABLE ocr_extractor_fields
  ADD COLUMN anchor_phrases JSON NULL AFTER instructions,
  ADD COLUMN anchor_direction ENUM('below','right','auto') NULL AFTER anchor_phrases,
  ADD COLUMN search_zone JSON NULL AFTER anchor_direction;

-- anchor_phrases:   ["NAME OF CHILD", "CHILD", "FIRST NAME"]
-- anchor_direction: 'below' | 'right' | 'auto'
-- search_zone:      {"padding":{"left":0,"right":0,"top":0.01,"bottom":0.05},"extent":{"width":0.3,"height":0.1}}

-- ============================================================================
-- 3. Create ocr_correction_log table (platform DB)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ocr_correction_log (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  church_id       INT NOT NULL,
  job_id          INT NOT NULL,
  extractor_id    INT NULL,
  record_type     VARCHAR(50) NOT NULL,
  field_key       VARCHAR(255) NOT NULL,
  extracted_value TEXT NULL,
  corrected_value TEXT NULL,
  anchor_matched  VARCHAR(255) NULL,
  bbox_json       JSON NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_extractor_field (extractor_id, field_key),
  INDEX idx_record_type (record_type),
  INDEX idx_church_job (church_id, job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
