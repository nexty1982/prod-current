-- ============================================================================
-- Global Feature Flags Seed
-- Seeds orthodoxmetrics_db.settings with global feature defaults (all disabled)
-- ============================================================================

USE orthodoxmetrics_db;

-- Ensure settings table exists
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    key_name VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key_name (key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert global feature flags (idempotent - ON DUPLICATE KEY UPDATE)
INSERT INTO settings (key_name, value, type, description)
VALUES 
    (
        'features.ag_grid_enabled',
        'false',
        'boolean',
        'Global default for AG Grid feature. Enables advanced data grid UI with sorting, filtering, and Excel-like features. Per-church overrides stored in churches.settings.features.ag_grid_enabled'
    ),
    (
        'features.power_search_enabled',
        'false',
        'boolean',
        'Global default for Power Search feature. Enables operator-aware search with advanced query capabilities. Per-church overrides stored in churches.settings.features.power_search_enabled'
    ),
    (
        'features.custom_field_mapping_enabled',
        'false',
        'boolean',
        'Global default for Custom Field Mapping feature. Enables OCR and record field mapping tools for data import. Per-church overrides stored in churches.settings.features.custom_field_mapping_enabled'
    )
ON DUPLICATE KEY UPDATE
    value = VALUES(value),
    type = VALUES(type),
    description = VALUES(description),
    updated_at = CURRENT_TIMESTAMP;

-- Verify insertion
SELECT 
    key_name,
    value,
    type,
    description,
    created_at,
    updated_at
FROM settings
WHERE key_name LIKE 'features.%'
ORDER BY key_name;

-- ============================================================================
-- Optional: Seed church 46 with explicit overrides for testing
-- ============================================================================

-- Get current settings for church 46
SELECT 
    id,
    name,
    settings
FROM churches
WHERE id = 46;

-- Update church 46 with explicit feature overrides (all disabled for clarity)
UPDATE churches
SET settings = JSON_SET(
    COALESCE(settings, '{}'),
    '$.features.ag_grid_enabled', false,
    '$.features.power_search_enabled', false,
    '$.features.custom_field_mapping_enabled', false
),
updated_at = CURRENT_TIMESTAMP
WHERE id = 46;

-- Verify church 46 settings
SELECT 
    id,
    name,
    settings,
    JSON_EXTRACT(settings, '$.features') as features
FROM churches
WHERE id = 46;

-- ============================================================================
-- Summary
-- ============================================================================
SELECT 
    'Global feature flags seeded successfully. All features default to DISABLED.' as status,
    COUNT(*) as global_flags_count
FROM settings
WHERE key_name LIKE 'features.%';
