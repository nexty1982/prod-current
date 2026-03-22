-- Parish Settings: key-value store for per-church configuration
-- Categories: mapping, theme, ui, search, system, branding

CREATE TABLE IF NOT EXISTS `parish_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `church_id` INT UNSIGNED NOT NULL,
  `category` VARCHAR(20) NOT NULL,
  `setting_key` VARCHAR(100) NOT NULL,
  `value` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_church_category_key` (`church_id`, `category`, `setting_key`),
  INDEX `idx_church_category` (`church_id`, `category`),
  CONSTRAINT `chk_category` CHECK (`category` IN ('mapping', 'theme', 'ui', 'search', 'system', 'branding'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
