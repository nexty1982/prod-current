-- Migration: Create ui_translations table
-- Database: orthodoxmetrics_db (platform DB, NOT tenant)
-- Purpose: Centralized UI string translations for the platform
-- Date: 2026-03-15

CREATE TABLE IF NOT EXISTS `ui_translations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `translation_key` VARCHAR(100) NOT NULL COMMENT 'Stable lookup key (e.g. record_baptism, analytics_top_clergy)',
  `lang_code` VARCHAR(10) NOT NULL COMMENT 'ISO 639-1 language code (el, ru, ro, ka)',
  `translation_text` VARCHAR(500) NOT NULL COMMENT 'Translated string',
  `category` VARCHAR(50) DEFAULT NULL COMMENT 'Grouping category (column_header, record_type, analytics, ui)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_key_lang` (`translation_key`, `lang_code`),
  KEY `idx_lang_code` (`lang_code`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Platform-level UI translations. English is the source/default and is NOT stored here — only non-English translations.';
