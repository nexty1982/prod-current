-- Page Content CMS
-- Stores editable text content for frontend pages
-- Allows super_admin to modify page text from the web UI

CREATE TABLE IF NOT EXISTS `page_content` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `page_key` VARCHAR(100) NOT NULL COMMENT 'Identifies the page (e.g. "dashboard", "church-portal")',
  `content_key` VARCHAR(100) NOT NULL COMMENT 'Identifies the content slot within the page (e.g. "title", "subtitle", "hero_description")',
  `content_value` TEXT NOT NULL COMMENT 'The actual text content',
  `content_type` ENUM('text', 'html', 'markdown') NOT NULL DEFAULT 'text',
  `description` VARCHAR(255) DEFAULT NULL COMMENT 'Admin-facing description of what this content controls',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_page_content` (`page_key`, `content_key`),
  KEY `idx_page_key` (`page_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
