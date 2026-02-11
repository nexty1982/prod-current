/**
 * Migration 001: Settings Registry, Overrides, and Audit tables
 *
 * Creates the canonical settings control plane tables in orthodoxmetrics_db.
 * Idempotent — safe to run multiple times.
 *
 * Usage:  node server/src/scripts/migrations/001-settings-tables.js
 */

const path = require('path');

// Resolve db config relative to this script
let promisePool;
try {
    ({ promisePool } = require('../../config/db'));
} catch {
    ({ promisePool } = require(path.resolve(__dirname, '../../config/db')));
}

async function migrate() {
    console.log('🔧 Running migration 001-settings-tables …');

    // 1. settings_registry — defines available setting keys
    await promisePool.query(`
        CREATE TABLE IF NOT EXISTS settings_registry (
            \`key\`            VARCHAR(190)   NOT NULL PRIMARY KEY,
            \`type\`           ENUM('string','number','bool','json','enum') NOT NULL DEFAULT 'string',
            default_value      LONGTEXT       NULL,
            enum_values_json   JSON           NULL,
            description        TEXT           NULL,
            category           VARCHAR(64)    NULL,
            is_sensitive       TINYINT(1)     NOT NULL DEFAULT 0,
            created_at         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_category (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ settings_registry');

    // 2. settings_overrides — actual value overrides (global or per-church)
    await promisePool.query(`
        CREATE TABLE IF NOT EXISTS settings_overrides (
            id          BIGINT         AUTO_INCREMENT PRIMARY KEY,
            \`key\`     VARCHAR(190)   NOT NULL,
            scope       ENUM('global','church') NOT NULL DEFAULT 'global',
            scope_id    BIGINT         NULL COMMENT 'church_id when scope=church',
            value       LONGTEXT       NULL,
            updated_by  BIGINT         NULL,
            updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_key_scope (  \`key\`, scope, scope_id ),
            INDEX idx_key (            \`key\` ),
            INDEX idx_scope_id (       scope, scope_id )
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ settings_overrides');

    // 3. settings_audit — change history
    await promisePool.query(`
        CREATE TABLE IF NOT EXISTS settings_audit (
            id          BIGINT         AUTO_INCREMENT PRIMARY KEY,
            \`key\`     VARCHAR(190)   NOT NULL,
            scope       ENUM('global','church') NOT NULL DEFAULT 'global',
            scope_id    BIGINT         NULL,
            old_value   LONGTEXT       NULL,
            new_value   LONGTEXT       NULL,
            changed_by  BIGINT         NULL,
            changed_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reason      TEXT           NULL,
            INDEX idx_key_time ( \`key\`, changed_at DESC ),
            INDEX idx_changed_by ( changed_by )
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ settings_audit');

    // 4. Seed a handful of initial registry entries (idempotent via INSERT IGNORE)
    const seeds = [
        ['app.name',                   'string', 'Orthodox Metrics',  null, 'Display name of the application',                    'general',  0],
        ['app.maintenanceMode',        'bool',   'false',             null, 'Enable site-wide maintenance mode',                  'general',  0],
        ['features.powerSearch.enabled','bool',   'false',            null, 'Enable power-search across all record types',        'features', 0],
        ['features.certificates.enabled','bool',  'true',             null, 'Enable certificate generation',                      'features', 0],
        ['features.gallery.enabled',   'bool',   'true',             null, 'Enable image gallery feature',                        'features', 0],
        ['records.defaultPageSize',    'number', '50',               null, 'Default page size for record listing',                'records',  0],
        ['records.maxExportRows',      'number', '5000',             null, 'Maximum rows allowed in a single export',             'records',  0],
        ['security.sessionTimeout',    'number', '3600',             null, 'Session timeout in seconds',                          'security', 1],
        ['security.maxLoginAttempts',  'number', '5',                null, 'Max failed login attempts before lockout',            'security', 0],
        ['email.smtpHost',            'string',  '',                 null, 'SMTP server hostname',                                'email',    1],
        ['email.smtpPort',            'number',  '587',              null, 'SMTP server port',                                    'email',    0],
        ['email.fromAddress',         'string',  '',                 null, 'Default sender email address',                        'email',    0],
        ['ui.theme.default',          'enum',    'orthodox',         '["orthodox","lent","pascha","alpine","balham"]', 'Default AG Grid / UI theme', 'ui', 0],
        ['ui.darkMode.default',       'bool',    'false',            null, 'Default dark-mode state for new users',               'ui',       0],
        ['backup.autoEnabled',        'bool',    'true',             null, 'Enable automatic daily backups',                      'backup',   0],
        ['backup.retentionDays',      'number',  '30',              null, 'Number of days to retain backup files',                'backup',   0],
    ];

    for (const [key, type, defaultValue, enumJson, description, category, isSensitive] of seeds) {
        await promisePool.query(`
            INSERT IGNORE INTO settings_registry (\`key\`, \`type\`, default_value, enum_values_json, description, category, is_sensitive)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [key, type, defaultValue, enumJson, description, category, isSensitive]);
    }
    console.log('  ✅ Seeded initial registry entries');

    console.log('✅ Migration 001-settings-tables complete.');
}

// Run directly or export
if (require.main === module) {
    migrate()
        .then(() => process.exit(0))
        .catch(err => { console.error('❌ Migration failed:', err); process.exit(1); });
} else {
    module.exports = migrate;
}
