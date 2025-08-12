-- Church Setup Wizard - Additional Database Tables
-- This script creates the additional tables needed for the church setup wizard

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- MAIN SYSTEM DATABASE TABLES (orthodoxmetrics_main)
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Create main system database if it doesn't exist
CREATE DATABASE IF NOT EXISTS orthodoxmetrics_main;
USE orthodoxmetrics_main;

-- Churches registry table (stores all church instances)
CREATE TABLE IF NOT EXISTS churches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    database_name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    setup_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    UNIQUE KEY uk_churches_email (email),
    UNIQUE KEY uk_churches_db (database_name),
    UNIQUE KEY uk_churches_slug (slug),
    INDEX idx_churches_active (is_active),
    INDEX idx_churches_created (created_at)
);

-- Church setup progress tracking
CREATE TABLE IF NOT EXISTS church_setup_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id VARCHAR(50) NOT NULL,
    step_number INT NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    data JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (church_id) REFERENCES churches(church_id) ON DELETE CASCADE,
    INDEX idx_setup_church (church_id),
    INDEX idx_setup_step (step_number),
    UNIQUE KEY uk_setup_church_step (church_id, step_number)
);

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- INDIVIDUAL CHURCH DATABASE TABLES (template for each church)
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Note: These tables are created in each individual church database
-- This is the template that gets applied to new church databases

-- Clergy members table
CREATE TABLE IF NOT EXISTS clergy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL DEFAULT 1,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(100) DEFAULT '',
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) DEFAULT '',
    role VARCHAR(100) NOT NULL,
    position_description TEXT DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_clergy_church_id (church_id),
    INDEX idx_clergy_active (is_active),
    INDEX idx_clergy_role (role),
    INDEX idx_clergy_name (name)
);

-- Branding and customization settings
CREATE TABLE IF NOT EXISTS branding (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL DEFAULT 1,
    logo_path VARCHAR(500) DEFAULT NULL,
    logo_original_name VARCHAR(255) DEFAULT NULL,
    primary_color VARCHAR(7) DEFAULT '#1976d2',
    secondary_color VARCHAR(7) DEFAULT '#dc004e',
    accent_color VARCHAR(7) DEFAULT NULL,
    ag_grid_theme VARCHAR(50) DEFAULT 'ag-theme-alpine',
    custom_css TEXT DEFAULT NULL,
    theme_preferences JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE KEY uk_branding_church (church_id)
);

-- Church settings and configuration
CREATE TABLE IF NOT EXISTS church_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL DEFAULT 1,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT DEFAULT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT DEFAULT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE KEY uk_settings_church_key (church_id, setting_key),
    INDEX idx_settings_church (church_id),
    INDEX idx_settings_public (is_public)
);

-- Church setup wizard progress (per church)
CREATE TABLE IF NOT EXISTS setup_wizard_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL DEFAULT 1,
    current_step INT DEFAULT 0,
    steps_completed JSON DEFAULT NULL,
    wizard_data JSON DEFAULT NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE KEY uk_wizard_church (church_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA AND INITIALIZATION
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Insert default setup steps
INSERT IGNORE INTO church_setup_progress (church_id, step_number, step_name, completed)
SELECT 'TEMPLATE_CHURCH', step_num, step_name, FALSE
FROM (
    SELECT 1 as step_num, 'Church Selection' as step_name
    UNION SELECT 2, 'Test Connection'
    UNION SELECT 3, 'Church Information'
    UNION SELECT 4, 'Parish Clergy'
    UNION SELECT 5, 'Branding & Customization'
) AS default_steps;

-- Insert default church settings
INSERT IGNORE INTO church_settings (church_id, setting_key, setting_value, setting_type, description, is_public)
VALUES 
(1, 'records_per_page', '25', 'number', 'Default number of records to display per page', TRUE),
(1, 'enable_notifications', 'true', 'boolean', 'Enable system notifications', FALSE),
(1, 'default_record_language', 'en', 'string', 'Default language for new records', TRUE),
(1, 'auto_backup_enabled', 'true', 'boolean', 'Enable automatic database backups', FALSE),
(1, 'backup_frequency_days', '7', 'number', 'Backup frequency in days', FALSE),
(1, 'allow_record_imports', 'true', 'boolean', 'Allow importing records from JSON files', FALSE),
(1, 'max_import_records', '1000', 'number', 'Maximum records per import batch', FALSE),
(1, 'enable_ocr_processing', 'true', 'boolean', 'Enable OCR document processing', FALSE),
(1, 'ocr_confidence_threshold', '0.75', 'number', 'Minimum OCR confidence score', FALSE),
(1, 'church_calendar_type', 'julian', 'string', 'Church calendar type (julian/gregorian)', TRUE);

-- Insert default clergy roles (for reference)
INSERT IGNORE INTO clergy (church_id, name, title, email, phone, role, is_active)
VALUES 
(1, 'Sample Priest', 'Fr.', 'priest@example.org', '(000) 000-0000', 'Priest', FALSE),
(1, 'Sample Deacon', 'Deacon', 'deacon@example.org', '(000) 000-0000', 'Deacon', FALSE);

-- Insert default branding
INSERT IGNORE INTO branding (church_id, primary_color, secondary_color, ag_grid_theme)
VALUES (1, '#1976d2', '#dc004e', 'ag-theme-alpine');

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- VALIDATION AND VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Show table structure
SELECT 'Church Setup Wizard Database Schema Created Successfully' AS status;

-- Show main system tables
USE orthodoxmetrics_main;
SELECT 'Main System Tables:' AS info;
SHOW TABLES;

-- Show template tables (these will be in each church database)
SELECT 'Template Tables for Individual Churches:' AS info;
SELECT 'clergy, branding, church_settings, setup_wizard_progress' AS tables;

-- Verify sample data
SELECT 'Sample Churches:' AS info;
SELECT COUNT(*) as church_count FROM churches;

SELECT 'Sample Setup Steps:' AS info;
SELECT COUNT(*) as setup_steps FROM church_setup_progress;

SELECT 'Schema creation completed successfully!' AS final_status;
