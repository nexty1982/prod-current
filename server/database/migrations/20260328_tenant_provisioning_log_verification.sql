-- Add verification snapshot fields to tenant_provisioning_log
-- Records the exact structural verification state of each provisioned tenant DB
--
-- Run: mysql -u orthodoxapps -p orthodoxmetrics_db < this_file.sql

ALTER TABLE `tenant_provisioning_log`
  ADD COLUMN `verification_passed` TINYINT(1) DEFAULT NULL COMMENT 'NULL if verification not attempted' AFTER `warnings`,
  ADD COLUMN `expected_table_count` INT UNSIGNED DEFAULT NULL AFTER `verification_passed`,
  ADD COLUMN `actual_table_count` INT UNSIGNED DEFAULT NULL AFTER `expected_table_count`,
  ADD COLUMN `missing_tables` JSON DEFAULT NULL COMMENT 'Tables expected but not found' AFTER `actual_table_count`,
  ADD COLUMN `extra_tables` JSON DEFAULT NULL COMMENT 'Tables found but not in template' AFTER `missing_tables`;
