-- Tenant Provisioning Audit Log
-- Platform-level table in orthodoxmetrics_db
-- Records every provisioning attempt (success or failure) for traceability
--
-- Run: mysql -u orthodoxapps -p orthodoxmetrics_db < this_file.sql

CREATE TABLE IF NOT EXISTS `tenant_provisioning_log` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `church_id` INT NOT NULL,
  `db_name` VARCHAR(128) NOT NULL,
  `template_version` VARCHAR(20) DEFAULT NULL,
  `status` ENUM('started', 'success', 'failure') NOT NULL DEFAULT 'started',
  `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME DEFAULT NULL,
  `duration_ms` INT UNSIGNED DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `initiated_by` VARCHAR(64) DEFAULT NULL COMMENT 'user_id, "system", or "cli"',
  `source` VARCHAR(32) DEFAULT NULL COMMENT 'onboarding, crm, lifecycle, demo, admin, cli',
  `version_override` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 if APPROVED_VERSION check was bypassed',
  `warnings` TEXT DEFAULT NULL COMMENT 'JSON array of warning strings',
  PRIMARY KEY (`id`),
  KEY `idx_tpl_church` (`church_id`),
  KEY `idx_tpl_status` (`status`),
  KEY `idx_tpl_started` (`started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
