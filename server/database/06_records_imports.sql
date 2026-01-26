-- 06_records_imports.sql
-- Import tracking and job management for sacrament records
-- Idempotent, MySQL 8+

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Import Jobs Table
CREATE TABLE IF NOT EXISTS `orthodoxmetrics_db`.`import_jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `church_id` INT(11) NOT NULL,
  `type` ENUM('baptisms', 'marriages', 'funerals') NOT NULL,
  `format` ENUM('csv', 'json', 'sql', 'xml') NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `size` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `status` ENUM('pending', 'running', 'done', 'error') NOT NULL DEFAULT 'pending',
  `total_rows` INT UNSIGNED DEFAULT 0,
  `processed_rows` INT UNSIGNED DEFAULT 0,
  `inserted_rows` INT UNSIGNED DEFAULT 0,
  `updated_rows` INT UNSIGNED DEFAULT 0,
  `skipped_rows` INT UNSIGNED DEFAULT 0,
  `error_rows` INT UNSIGNED DEFAULT 0,
  `started_at` DATETIME NULL,
  `finished_at` DATETIME NULL,
  `error_text` TEXT NULL,
  `created_by` INT(11) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_import_jobs_church` (`church_id`),
  KEY `idx_import_jobs_status` (`status`),
  KEY `idx_import_jobs_created` (`created_at`),
  CONSTRAINT `fk_import_jobs_church` FOREIGN KEY (`church_id`) REFERENCES `orthodoxmetrics_db`.`churches`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_import_jobs_user` FOREIGN KEY (`created_by`) REFERENCES `orthodoxmetrics_db`.`users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Import Files Table
CREATE TABLE IF NOT EXISTS `orthodoxmetrics_db`.`import_files` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `job_id` BIGINT UNSIGNED NOT NULL,
  `storage_path` VARCHAR(500) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) NULL,
  `sha1_hash` CHAR(40) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_import_files_sha1` (`sha1_hash`),
  KEY `idx_import_files_job` (`job_id`),
  CONSTRAINT `fk_import_files_job` FOREIGN KEY (`job_id`) REFERENCES `orthodoxmetrics_db`.`import_jobs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add missing columns to existing baptism_records table if they don't exist
ALTER TABLE `orthodoxmetrics_db`.`baptism_records`
  ADD COLUMN IF NOT EXISTS `certificate_no` VARCHAR(64) NULL AFTER `notes`,
  ADD COLUMN IF NOT EXISTS `book_no` VARCHAR(32) NULL AFTER `certificate_no`,
  ADD COLUMN IF NOT EXISTS `page_no` VARCHAR(32) NULL AFTER `book_no`,
  ADD COLUMN IF NOT EXISTS `entry_no` VARCHAR(32) NULL AFTER `page_no`,
  ADD COLUMN IF NOT EXISTS `source_hash` CHAR(40) NULL AFTER `entry_no`;

-- Add missing columns to existing marriage_records table if they don't exist
ALTER TABLE `orthodoxmetrics_db`.`marriage_records`
  ADD COLUMN IF NOT EXISTS `certificate_no` VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS `book_no` VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS `page_no` VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS `entry_no` VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS `source_hash` CHAR(40) NULL;

-- Add missing columns to existing funeral_records table if they don't exist
ALTER TABLE `orthodoxmetrics_db`.`funeral_records`
  ADD COLUMN IF NOT EXISTS `certificate_no` VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS `book_no` VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS `page_no` VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS `entry_no` VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS `source_hash` CHAR(40) NULL;

-- Add unique constraints for certificate numbers
ALTER TABLE `orthodoxmetrics_db`.`baptism_records`
  DROP INDEX IF EXISTS `uq_baptism_cert`,
  ADD UNIQUE KEY `uq_baptism_cert` (`church_id`, `certificate_no`);

ALTER TABLE `orthodoxmetrics_db`.`marriage_records`
  DROP INDEX IF EXISTS `uq_marriage_cert`,
  ADD UNIQUE KEY `uq_marriage_cert` (`church_id`, `certificate_no`);

ALTER TABLE `orthodoxmetrics_db`.`funeral_records`
  DROP INDEX IF EXISTS `uq_funeral_cert`,
  ADD UNIQUE KEY `uq_funeral_cert` (`church_id`, `certificate_no`);

-- Add unique constraints for book/page/entry combinations (only if all three columns are not null)
-- Note: MySQL doesn't support conditional unique constraints, so we'll create regular ones
-- NULL values in any of the columns will allow duplicates
ALTER TABLE `orthodoxmetrics_db`.`baptism_records`
  DROP INDEX IF EXISTS `uq_baptism_book_entry`,
  ADD UNIQUE KEY `uq_baptism_book_entry` (`church_id`, `book_no`, `page_no`, `entry_no`);

ALTER TABLE `orthodoxmetrics_db`.`marriage_records`
  DROP INDEX IF EXISTS `uq_marriage_book_entry`,
  ADD UNIQUE KEY `uq_marriage_book_entry` (`church_id`, `book_no`, `page_no`, `entry_no`);

ALTER TABLE `orthodoxmetrics_db`.`funeral_records`
  DROP INDEX IF EXISTS `uq_funeral_book_entry`,
  ADD UNIQUE KEY `uq_funeral_book_entry` (`church_id`, `book_no`, `page_no`, `entry_no`);

-- Add unique constraints for source_hash (for idempotent imports)
ALTER TABLE `orthodoxmetrics_db`.`baptism_records`
  DROP INDEX IF EXISTS `uq_baptism_source`,
  ADD UNIQUE KEY `uq_baptism_source` (`church_id`, `source_hash`);

ALTER TABLE `orthodoxmetrics_db`.`marriage_records`
  DROP INDEX IF EXISTS `uq_marriage_source`,
  ADD UNIQUE KEY `uq_marriage_source` (`church_id`, `source_hash`);

ALTER TABLE `orthodoxmetrics_db`.`funeral_records`
  DROP INDEX IF EXISTS `uq_funeral_source`,
  ADD UNIQUE KEY `uq_funeral_source` (`church_id`, `source_hash`);

-- Add indexes for fast browsing on dates and last names (if not already present)
-- Baptism indexes
ALTER TABLE `orthodoxmetrics_db`.`baptism_records`
  DROP INDEX IF EXISTS `idx_baptism_last_name`,
  ADD INDEX `idx_baptism_last_name` (`church_id`, `last_name`);

ALTER TABLE `orthodoxmetrics_db`.`baptism_records`
  DROP INDEX IF EXISTS `idx_baptism_date`,
  ADD INDEX `idx_baptism_date` (`church_id`, `baptism_date`);

-- Check if marriage_records has the expected columns and add indexes
-- Note: We'll need to check the actual structure of marriage_records
-- For now, we'll skip the specific column indexes for marriage and funeral

-- Import field mappings table (for storing user's field mappings)
CREATE TABLE IF NOT EXISTS `orthodoxmetrics_db`.`import_field_mappings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `church_id` INT(11) NOT NULL,
  `type` ENUM('baptisms', 'marriages', 'funerals') NOT NULL,
  `format` ENUM('csv', 'json', 'sql', 'xml') NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `mapping` JSON NOT NULL,
  `is_default` BOOLEAN DEFAULT FALSE,
  `created_by` INT(11) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_import_mapping_name` (`church_id`, `type`, `format`, `name`),
  KEY `idx_import_mapping_church` (`church_id`),
  CONSTRAINT `fk_import_mapping_church` FOREIGN KEY (`church_id`) REFERENCES `orthodoxmetrics_db`.`churches`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_import_mapping_user` FOREIGN KEY (`created_by`) REFERENCES `orthodoxmetrics_db`.`users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Grant permissions if needed
-- GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.import_jobs TO 'orthodoxapps'@'localhost';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.import_files TO 'orthodoxapps'@'localhost';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.import_field_mappings TO 'orthodoxapps'@'localhost';