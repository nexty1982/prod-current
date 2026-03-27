-- Record Creation Wizard: Presets table
-- Stores reusable preset configurations for batch record generation

CREATE TABLE IF NOT EXISTS `record_creation_presets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `record_type` ENUM('baptism', 'marriage', 'funeral') NOT NULL,
  `church_id` INT DEFAULT NULL COMMENT 'NULL = global preset',
  `preset_json` JSON NOT NULL COMMENT 'Full wizard config: field overrides, date range, distribution, count, etc.',
  `created_by` INT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_record_type` (`record_type`),
  INDEX `idx_church_id` (`church_id`),
  INDEX `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
