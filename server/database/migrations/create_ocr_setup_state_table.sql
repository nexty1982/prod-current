-- Migration: Create OCR Setup State Table
-- Stores wizard progress for each church's OCR setup
-- Run this for each church database (om_church_##)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- OCR Setup State Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ocr_setup_state (
  church_id INT NOT NULL PRIMARY KEY COMMENT 'Church ID (matches churches.id)',
  state_json LONGTEXT NULL COMMENT 'JSON object storing wizard step data',
  percent_complete INT NOT NULL DEFAULT 0 COMMENT 'Completion percentage (0-100)',
  is_complete TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 if setup is complete, 0 otherwise',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_is_complete (is_complete),
  INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
