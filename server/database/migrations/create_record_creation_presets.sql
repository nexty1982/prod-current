-- Migration: Create record_creation_presets table
-- Used by Record Creation Wizard to store reusable generation configurations

CREATE TABLE IF NOT EXISTS `record_creation_presets` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `record_type` ENUM('baptism', 'marriage', 'funeral') NOT NULL,
  `church_id` INT(11) DEFAULT NULL COMMENT 'NULL = global preset, non-null = church-specific',
  `preset_json` JSON NOT NULL COMMENT 'Serialized wizard configuration (count, dates, distribution, overrides, mode)',
  `created_by` INT(11) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_presets_record_type` (`record_type`),
  KEY `idx_presets_church_id` (`church_id`),
  KEY `idx_presets_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
