-- Create ocr_extractors table for Custom Extractor definitions
-- Idempotent migration: uses IF NOT EXISTS
-- Target database: orthodoxmetrics_db (main DB, not church DBs)

CREATE TABLE IF NOT EXISTS ocr_extractors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  record_type VARCHAR(50) NOT NULL DEFAULT 'custom',
  page_mode ENUM('single', 'variable') NOT NULL DEFAULT 'single',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_record_type (record_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create ocr_extractor_fields table for field definitions (supports nested groups)
-- Idempotent migration: uses IF NOT EXISTS

CREATE TABLE IF NOT EXISTS ocr_extractor_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  extractor_id INT NOT NULL,
  parent_field_id INT NULL,
  name VARCHAR(255) NOT NULL,
  `key` VARCHAR(255) NOT NULL,
  field_type ENUM('text', 'number', 'date', 'group') NOT NULL DEFAULT 'text',
  multiple TINYINT(1) NOT NULL DEFAULT 0,
  instructions TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (extractor_id) REFERENCES ocr_extractors(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_field_id) REFERENCES ocr_extractor_fields(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_extractor_id (extractor_id),
  INDEX idx_parent_field_id (parent_field_id),
  INDEX idx_sort_order (extractor_id, parent_field_id, sort_order),
  UNIQUE KEY uk_extractor_key (extractor_id, `key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

