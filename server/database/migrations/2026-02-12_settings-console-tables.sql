-- ============================================================================
-- Settings Console - Database Migration
-- Date: 2026-02-12
-- Purpose: VMware-style settings management system
-- Database: orthodoxmetrics_db (app DB, NOT auth DB)
-- ============================================================================

USE orthodoxmetrics_db;

-- ============================================================================
-- Settings Registry Table
-- Defines all available settings keys with metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings_registry (
    `key` VARCHAR(190) PRIMARY KEY COMMENT 'Unique setting key (e.g., features.powerSearch.enabled)',
    `type` ENUM('string','number','bool','json','enum') NOT NULL COMMENT 'Data type for validation',
    `default_value` LONGTEXT NULL COMMENT 'Default value if no override exists',
    `enum_values_json` JSON NULL COMMENT 'Valid enum values (for type=enum)',
    `description` TEXT NULL COMMENT 'Human-readable description',
    `category` VARCHAR(64) NULL COMMENT 'Category for grouping (e.g., features, security)',
    `is_sensitive` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'If true, value is masked in UI',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (`category`),
    INDEX idx_type (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registry of all available settings with metadata';

-- ============================================================================
-- Settings Overrides Table
-- Stores actual override values (global or church-specific)
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings_overrides (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(190) NOT NULL COMMENT 'FK to settings_registry.key',
    `scope` ENUM('global','church') NOT NULL COMMENT 'Override scope',
    `scope_id` BIGINT NULL COMMENT 'Church ID when scope=church, NULL for global',
    `value` LONGTEXT NULL COMMENT 'Override value (stored as string, parsed by type)',
    `updated_by` BIGINT NULL COMMENT 'User ID who last updated this override',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_override` (`key`, `scope`, `scope_id`),
    INDEX idx_key (`key`),
    INDEX idx_scope (`scope`, `scope_id`),
    INDEX idx_updated_at (`updated_at` DESC),
    FOREIGN KEY (`key`) REFERENCES settings_registry(`key`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Override values for settings (global or church-specific)';

-- ============================================================================
-- Settings Audit Table
-- Tracks all changes to settings for compliance and debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings_audit (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(190) NOT NULL COMMENT 'Setting key that was changed',
    `scope` ENUM('global','church') NOT NULL COMMENT 'Scope of the change',
    `scope_id` BIGINT NULL COMMENT 'Church ID when scope=church',
    `old_value` LONGTEXT NULL COMMENT 'Previous value (NULL if newly created)',
    `new_value` LONGTEXT NULL COMMENT 'New value (NULL if deleted/reverted)',
    `changed_by` BIGINT NULL COMMENT 'User ID who made the change',
    `changed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the change occurred',
    `reason` TEXT NULL COMMENT 'Optional reason for the change',
    INDEX idx_key (`key`),
    INDEX idx_changed_at (`changed_at` DESC),
    INDEX idx_scope (`scope`, `scope_id`),
    INDEX idx_changed_by (`changed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Audit log of all settings changes';

-- ============================================================================
-- Seed Data - Initial Settings Registry
-- ============================================================================

-- Features category
INSERT IGNORE INTO settings_registry (`key`, `type`, `default_value`, `description`, `category`, `is_sensitive`) VALUES
('features.powerSearch.enabled', 'bool', 'false', 'Enable Power Search functionality', 'features', 0),
('features.advancedRecords.enabled', 'bool', 'true', 'Enable advanced records features', 'features', 0),
('features.aiAssistant.enabled', 'bool', 'false', 'Enable AI assistant features', 'features', 0),
('features.multiChurch.enabled', 'bool', 'true', 'Enable multi-church support', 'features', 0);

-- Security category
INSERT IGNORE INTO settings_registry (`key`, `type`, `default_value`, `description`, `category`, `is_sensitive`) VALUES
('security.sessionTimeout', 'number', '3600', 'Session timeout in seconds', 'security', 0),
('security.maxLoginAttempts', 'number', '5', 'Maximum failed login attempts before lockout', 'security', 0),
('security.passwordMinLength', 'number', '8', 'Minimum password length', 'security', 0),
('security.requireMFA', 'bool', 'false', 'Require multi-factor authentication', 'security', 0),
('security.apiKey', 'string', NULL, 'API key for external integrations', 'security', 1);

-- Email category
INSERT IGNORE INTO settings_registry (`key`, `type`, `default_value`, `description`, `category`, `is_sensitive`) VALUES
('email.smtp.host', 'string', 'localhost', 'SMTP server hostname', 'email', 0),
('email.smtp.port', 'number', '587', 'SMTP server port', 'email', 0),
('email.smtp.username', 'string', NULL, 'SMTP authentication username', 'email', 1),
('email.smtp.password', 'string', NULL, 'SMTP authentication password', 'email', 1),
('email.from.address', 'string', 'noreply@orthodoxmetrics.com', 'Default sender email address', 'email', 0),
('email.from.name', 'string', 'Orthodox Metrics', 'Default sender name', 'email', 0);

-- UI category
INSERT IGNORE INTO settings_registry (`key`, `type`, `default_value`, `description`, `category`, `is_sensitive`) VALUES
('ui.theme', 'enum', 'light', 'Default UI theme', 'ui', 0),
('ui.language', 'enum', 'en', 'Default language', 'ui', 0),
('ui.itemsPerPage', 'number', '25', 'Default items per page in tables', 'ui', 0),
('ui.dateFormat', 'enum', 'MM/DD/YYYY', 'Date format preference', 'ui', 0);

-- Update enum values for enum types
UPDATE settings_registry SET enum_values_json = '["light","dark","auto"]' WHERE `key` = 'ui.theme';
UPDATE settings_registry SET enum_values_json = '["en","ro","gr","ru"]' WHERE `key` = 'ui.language';
UPDATE settings_registry SET enum_values_json = '["MM/DD/YYYY","DD/MM/YYYY","YYYY-MM-DD"]' WHERE `key` = 'ui.dateFormat';

-- Backup category
INSERT IGNORE INTO settings_registry (`key`, `type`, `default_value`, `description`, `category`, `is_sensitive`) VALUES
('backup.autoBackup.enabled', 'bool', 'true', 'Enable automatic backups', 'backup', 0),
('backup.autoBackup.schedule', 'string', '0 2 * * *', 'Backup schedule (cron format)', 'backup', 0),
('backup.retention.days', 'number', '30', 'Number of days to retain backups', 'backup', 0);

-- Records category
INSERT IGNORE INTO settings_registry (`key`, `type`, `default_value`, `description`, `category`, `is_sensitive`) VALUES
('records.validation.strict', 'bool', 'false', 'Enable strict validation for records', 'records', 0),
('records.export.maxRows', 'number', '10000', 'Maximum rows for export operations', 'records', 0),
('records.import.batchSize', 'number', '100', 'Batch size for import operations', 'records', 0);

-- General category
INSERT IGNORE INTO settings_registry (`key`, `type`, `default_value`, `description`, `category`, `is_sensitive`) VALUES
('general.siteName', 'string', 'Orthodox Metrics', 'Site name displayed in UI', 'general', 0),
('general.maintenanceMode', 'bool', 'false', 'Enable maintenance mode', 'general', 0),
('general.timezone', 'string', 'America/New_York', 'Default timezone', 'general', 0),
('general.debug.enabled', 'bool', 'false', 'Enable debug mode', 'general', 0);

-- ============================================================================
-- Verification Queries (for testing)
-- ============================================================================
-- SELECT * FROM settings_registry ORDER BY category, `key`;
-- SELECT * FROM settings_overrides;
-- SELECT * FROM settings_audit ORDER BY changed_at DESC LIMIT 20;
