-- OCR Mappings Table Migration
-- Run this in each om_church_## database
-- This table stores field mappings from OCR results to sacramental record fields

CREATE TABLE IF NOT EXISTS ocr_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ocr_job_id INT NOT NULL,
  church_id INT NOT NULL,
  record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,
  mapping_json JSON NOT NULL COMMENT 'Field mappings: { fieldName: { value, confidence, bboxLink } }',
  bbox_links JSON NULL COMMENT 'Bounding box links per field for highlighting',
  status ENUM('draft', 'reviewed', 'approved', 'rejected') DEFAULT 'draft',
  created_by INT NULL COMMENT 'User ID who created the mapping',
  reviewed_by INT NULL COMMENT 'User ID who reviewed/approved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_ocr_job (ocr_job_id),
  INDEX idx_church (church_id),
  INDEX idx_status (status),
  INDEX idx_record_type (record_type),
  UNIQUE KEY unique_job_mapping (ocr_job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add ocr_result_json column if not exists (stores raw Google Vision response with bboxes)
-- Run separately with ALTER TABLE due to IF NOT EXISTS limitation
-- ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS ocr_result_json JSON NULL AFTER ocr_text;

