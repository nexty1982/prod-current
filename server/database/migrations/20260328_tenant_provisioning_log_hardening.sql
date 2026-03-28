-- Tenant Provisioning Log — Safety & Operational Hardening
-- Adds: request_id (idempotency), error_type (structured classification)
--
-- Run: mysql -u orthodoxapps -p orthodoxmetrics_db < this_file.sql

ALTER TABLE `tenant_provisioning_log`
  ADD COLUMN `request_id` VARCHAR(64) DEFAULT NULL COMMENT 'Idempotency key — duplicate request_id returns cached result' AFTER `source`,
  ADD COLUMN `error_type` VARCHAR(40) DEFAULT NULL COMMENT 'Structured error classification' AFTER `error_message`,
  ADD UNIQUE KEY `idx_tpl_request_id` (`request_id`);
