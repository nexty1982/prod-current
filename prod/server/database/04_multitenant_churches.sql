-- 04_multitenant_churches.sql
-- Canonical multi-tenant schema + helpers for OrthodoxMetrics (MySQL 8+)
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1) Churches table (idempotent)
CREATE TABLE IF NOT EXISTS `orthodoxmetrics_db`.`churches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(80) NOT NULL,
  `name` VARCHAR(190) NOT NULL,
  `status` ENUM('active','disabled') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_church_slug` (`slug`),
  UNIQUE KEY `uq_church_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Ensure users has FK to churches if column exists
ALTER TABLE `orthodoxmetrics_db`.`users`
  ADD COLUMN IF NOT EXISTS `church_id` BIGINT UNSIGNED NULL,
  ADD CONSTRAINT `fk_users_church` FOREIGN KEY (`church_id`) REFERENCES `orthodoxmetrics_db`.`churches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) Utility procedure: add church_id column + fk if missing
DELIMITER $$
DROP PROCEDURE IF EXISTS `orthodoxmetrics_db`.`omx_add_church_fk` $$
CREATE PROCEDURE `orthodoxmetrics_db`.`omx_add_church_fk` (IN p_table VARCHAR(128), IN p_nullable TINYINT)
BEGIN
  DECLARE has_col INT DEFAULT 0;
  SELECT COUNT(*) INTO has_col
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='orthodoxmetrics_db' AND TABLE_NAME=p_table AND COLUMN_NAME='church_id';

  IF has_col = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `orthodoxmetrics_db`.`', p_table, '` ADD COLUMN `church_id` BIGINT UNSIGNED ', IF(p_nullable=1,'NULL','NOT NULL'), ';');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;

  -- Add index if missing
  SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='orthodoxmetrics_db' AND TABLE_NAME=p_table AND INDEX_NAME=CONCAT('idx_', p_table, '_church'));
  IF @exists = 0 THEN
    SET @sql = CONCAT('CREATE INDEX `idx_', p_table, '_church` ON `orthodoxmetrics_db`.`', p_table, '` (`church_id`)');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;

  -- Add FK if missing
  SET @fk = CONCAT('fk_', p_table, '_church');
  SET @fk_exists = (SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA='orthodoxmetrics_db' AND CONSTRAINT_NAME=@fk);
  IF @fk_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `orthodoxmetrics_db`.`', p_table, '` ADD CONSTRAINT `', @fk, '` FOREIGN KEY (`church_id`) REFERENCES `orthodoxmetrics_db`.`churches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END $$
DELIMITER ;

-- 4) Best-effort backfill by joining users.user_id -> users.church_id
DELIMITER $$
DROP PROCEDURE IF EXISTS `orthodoxmetrics_db`.`omx_backfill_church_via_user` $$
CREATE PROCEDURE `orthodoxmetrics_db`.`omx_backfill_church_via_user` (IN p_table VARCHAR(128), IN p_user_col VARCHAR(128))
BEGIN
  SET @sql = CONCAT(
    'UPDATE `orthodoxmetrics_db`.`', p_table, '` t ',
    'JOIN `orthodoxmetrics_db`.`users` u ON u.id = t.`', p_user_col, '` ',
    'SET t.`church_id` = u.`church_id` ',
    'WHERE t.`church_id` IS NULL AND u.`church_id` IS NOT NULL;'
  );
  PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
END $$
DELIMITER ;

-- 5) Template: scoped unique helper (adds unique on (church_id, col))
DELIMITER $$
DROP PROCEDURE IF EXISTS `orthodoxmetrics_db`.`omx_add_scoped_unique` $$
CREATE PROCEDURE `orthodoxmetrics_db`.`omx_add_scoped_unique` (IN p_table VARCHAR(128), IN p_col VARCHAR(128), IN p_key VARCHAR(128))
BEGIN
  SET @key = CONCAT('uq_', p_table, '_', p_key);
  SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='orthodoxmetrics_db' AND TABLE_NAME=p_table AND INDEX_NAME=@key);
  IF @exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `orthodoxmetrics_db`.`', p_table, '` ADD UNIQUE KEY `', @key, '` (`church_id`, `', p_col, '`);');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END $$
DELIMITER ;

-- 6) Report unassigned (NULL church_id) rows per table
DELIMITER $$
DROP PROCEDURE IF EXISTS `orthodoxmetrics_db`.`omx_report_unassigned` $$
CREATE PROCEDURE `orthodoxmetrics_db`.`omx_report_unassigned` ()
BEGIN
  DROP TEMPORARY TABLE IF EXISTS tmp_unassigned;
  CREATE TEMPORARY TABLE tmp_unassigned (table_name VARCHAR(128), null_rows BIGINT);
  INSERT INTO tmp_unassigned
  SELECT t.TABLE_NAME, 0 FROM information_schema.TABLES t
   WHERE t.TABLE_SCHEMA='orthodoxmetrics_db' AND t.TABLE_TYPE='BASE TABLE';

  -- Build dynamic list of tables having church_id
  SET @sql = (
    SELECT GROUP_CONCAT(CONCAT('INSERT INTO tmp_unassigned SELECT ''', TABLE_NAME, ''', COUNT(*) FROM `orthodoxmetrics_db`.`', TABLE_NAME, '` WHERE `church_id` IS NULL')
           SEPARATOR '; ')
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='orthodoxmetrics_db' AND COLUMN_NAME='church_id'
  );
  IF @sql IS NOT NULL AND LENGTH(@sql) > 0 THEN
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;

  SELECT * FROM tmp_unassigned WHERE null_rows > 0 ORDER BY null_rows DESC;
END $$
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;

-- Usage examples (run manually as needed):
-- CALL orthodoxmetrics_db.omx_add_church_fk('members', 1);
-- CALL orthodoxmetrics_db.omx_backfill_church_via_user('members', 'created_by');
-- CALL orthodoxmetrics_db.omx_add_scoped_unique('members','member_number','number');
-- CALL orthodoxmetrics_db.omx_report_unassigned();