-- Complete Church Database Schema Template
-- This template is used when creating new church instances
-- Ensures all churches have the complete, standardized schema

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- CHURCH DATABASE TEMPLATE - COMPLETE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- 1. ENHANCED CHURCH_INFO TABLE
DROP TABLE IF EXISTS church_info;
CREATE TABLE church_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id VARCHAR(50) UNIQUE NOT NULL,
    
    -- Core church information
    name VARCHAR(255) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(50) DEFAULT NULL,
    website VARCHAR(255) DEFAULT NULL,
    
    -- Address information
    address TEXT DEFAULT NULL,
    city VARCHAR(100) DEFAULT NULL,
    state_province VARCHAR(100) DEFAULT NULL,
    postal_code VARCHAR(20) DEFAULT NULL,
    country VARCHAR(100) DEFAULT NULL,
    
    -- Church details
    description TEXT DEFAULT NULL,
    founded_year INT DEFAULT NULL,
    
    -- Legacy fields (for backward compatibility)
    location VARCHAR(255) DEFAULT NULL,
    priest_name VARCHAR(255) DEFAULT NULL,
    parish_size INT DEFAULT NULL,
    
    -- Preferences and settings
    language_preference VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Administrative
    tax_id VARCHAR(50) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_church_info_name (name),
    INDEX idx_church_info_email (email),
    INDEX idx_church_info_active (is_active),
    INDEX idx_church_info_country (country),
    
    -- Constraints
    UNIQUE KEY uk_church_info_email (email)
);

-- 2. ENHANCED BAPTISM RECORDS TABLE
DROP TABLE IF EXISTS baptism_records;
CREATE TABLE baptism_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL,
    
    -- Core record information
    person_name VARCHAR(255) NOT NULL,
    date_performed DATE DEFAULT NULL,
    priest_name VARCHAR(255) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    
    -- Extended baptism fields
    parents VARCHAR(500) DEFAULT NULL,
    godparents VARCHAR(500) DEFAULT NULL,
    birth_date DATE DEFAULT NULL,
    birth_place VARCHAR(255) DEFAULT NULL,
    baptism_place VARCHAR(255) DEFAULT NULL,
    certificate_number VARCHAR(100) DEFAULT NULL,
    
    -- Metadata
    record_source ENUM('manual', 'import', 'ocr') DEFAULT 'manual',
    confidence_score DECIMAL(5,2) DEFAULT NULL,
    language CHAR(2) DEFAULT 'en',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_baptism_church_id (church_id),
    INDEX idx_baptism_date (date_performed),
    INDEX idx_baptism_person (person_name),
    INDEX idx_baptism_priest (priest_name)
);

-- 3. ENHANCED MARRIAGE RECORDS TABLE
DROP TABLE IF EXISTS marriage_records;
CREATE TABLE marriage_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL,
    
    -- Core record information
    person_name VARCHAR(255) NOT NULL, -- Legacy compatibility
    date_performed DATE DEFAULT NULL,
    priest_name VARCHAR(255) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    
    -- Extended marriage fields
    groom_name VARCHAR(255) DEFAULT NULL,
    bride_name VARCHAR(255) DEFAULT NULL,
    groom_age INT DEFAULT NULL,
    bride_age INT DEFAULT NULL,
    groom_residence VARCHAR(255) DEFAULT NULL,
    bride_residence VARCHAR(255) DEFAULT NULL,
    witnesses TEXT DEFAULT NULL,
    marriage_place VARCHAR(255) DEFAULT NULL,
    certificate_number VARCHAR(100) DEFAULT NULL,
    license_number VARCHAR(100) DEFAULT NULL,
    
    -- Metadata
    record_source ENUM('manual', 'import', 'ocr') DEFAULT 'manual',
    confidence_score DECIMAL(5,2) DEFAULT NULL,
    language CHAR(2) DEFAULT 'en',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_marriage_church_id (church_id),
    INDEX idx_marriage_date (date_performed),
    INDEX idx_marriage_groom (groom_name),
    INDEX idx_marriage_bride (bride_name),
    INDEX idx_marriage_priest (priest_name)
);

-- 4. ENHANCED FUNERAL RECORDS TABLE
DROP TABLE IF EXISTS funeral_records;
CREATE TABLE funeral_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL,
    
    -- Core record information
    person_name VARCHAR(255) NOT NULL,
    date_performed DATE DEFAULT NULL,
    priest_name VARCHAR(255) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    
    -- Extended funeral fields
    death_date DATE DEFAULT NULL,
    birth_date DATE DEFAULT NULL,
    age_at_death INT DEFAULT NULL,
    death_place VARCHAR(255) DEFAULT NULL,
    burial_place VARCHAR(255) DEFAULT NULL,
    funeral_home VARCHAR(255) DEFAULT NULL,
    survivors TEXT DEFAULT NULL,
    cause_of_death VARCHAR(255) DEFAULT NULL,
    
    -- Metadata
    record_source ENUM('manual', 'import', 'ocr') DEFAULT 'manual',
    confidence_score DECIMAL(5,2) DEFAULT NULL,
    language CHAR(2) DEFAULT 'en',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_funeral_church_id (church_id),
    INDEX idx_funeral_date (date_performed),
    INDEX idx_funeral_person (person_name),
    INDEX idx_funeral_priest (priest_name),
    INDEX idx_funeral_death_date (death_date)
);

-- 5. ENHANCED USERS TABLE
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','super_admin','user','church_admin') DEFAULT 'user',
    
    -- Additional user fields
    phone VARCHAR(50) DEFAULT NULL,
    position VARCHAR(100) DEFAULT NULL,
    permissions JSON DEFAULT NULL,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    password_reset_token VARCHAR(255) DEFAULT NULL,
    password_reset_expires TIMESTAMP NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes and constraints
    UNIQUE KEY uk_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_active (is_active)
);

-- 6. ENHANCED OCR_JOBS TABLE (already good, keeping existing structure)
CREATE TABLE IF NOT EXISTS ocr_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) DEFAULT NULL,
    file_path VARCHAR(500) DEFAULT NULL,
    file_size INT DEFAULT NULL,
    mime_type VARCHAR(100) DEFAULT NULL,
    status ENUM('pending','processing','complete','error','cancelled') DEFAULT 'pending',
    record_type ENUM('baptism','marriage','funeral','custom') NOT NULL,
    language CHAR(2) DEFAULT 'en',
    confidence_score DECIMAL(5,2) DEFAULT NULL,
    error_regions TEXT DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    ocr_result LONGTEXT DEFAULT NULL,
    metadata LONGTEXT DEFAULT NULL,
    processing_started_at TIMESTAMP NULL,
    processing_completed_at TIMESTAMP NULL,
    description TEXT DEFAULT NULL,
    processing_log TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_ocr_church_id (church_id),
    INDEX idx_ocr_status (status),
    INDEX idx_ocr_record_type (record_type),
    INDEX idx_ocr_created (created_at)
);

-- 7. ENHANCED OCR_QUEUE TABLE (keeping existing structure)
CREATE TABLE IF NOT EXISTS ocr_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    church_id INT NOT NULL,
    priority INT DEFAULT 5,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    error_message TEXT DEFAULT NULL,
    status ENUM('queued','processing','completed','failed','cancelled') DEFAULT 'queued',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_queue_church_id (church_id),
    INDEX idx_queue_status (status),
    INDEX idx_queue_priority (priority)
);

-- 8. ENHANCED OCR_SETTINGS TABLE (keeping existing structure)
CREATE TABLE IF NOT EXISTS ocr_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL,
    confidence_threshold DECIMAL(5,2) DEFAULT 0.75,
    default_language CHAR(2) DEFAULT 'en',
    record_path_baptism VARCHAR(255) DEFAULT '/records/baptism',
    record_path_marriage VARCHAR(255) DEFAULT '/records/marriage',
    record_path_funeral VARCHAR(255) DEFAULT '/records/funeral',
    preprocessing_enabled BOOLEAN DEFAULT TRUE,
    auto_contrast BOOLEAN DEFAULT TRUE,
    auto_rotate BOOLEAN DEFAULT TRUE,
    noise_reduction BOOLEAN DEFAULT TRUE,
    max_file_size INT DEFAULT 10485760,
    allowed_file_types TEXT DEFAULT 'image/jpeg,image/png,image/gif,image/bmp,image/tiff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_ocr_settings_church (church_id)
);

-- 9. ENHANCED INVOICE_HISTORY TABLE (keeping existing structure)
CREATE TABLE IF NOT EXISTS invoice_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL,
    amount DECIMAL(10,2) DEFAULT NULL,
    date DATE NOT NULL,
    description TEXT DEFAULT NULL,
    status ENUM('paid','pending','overdue') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_invoice_church_id (church_id),
    INDEX idx_invoice_date (date),
    INDEX idx_invoice_status (status)
);

-- 10. ACTIVITY_LOG TABLE (keeping existing structure)
CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL,
    user_id INT DEFAULT NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) DEFAULT NULL,
    entity_id INT DEFAULT NULL,
    details TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_activity_church_id (church_id),
    INDEX idx_activity_user_id (user_id),
    INDEX idx_activity_action (action),
    INDEX idx_activity_created (created_at)
);

-- 11. CLERGY TABLE
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
    
    INDEX idx_clergy_church_id (church_id),
    INDEX idx_clergy_active (is_active),
    INDEX idx_clergy_role (role),
    INDEX idx_clergy_name (name)
);

-- 12. BRANDING AND CUSTOMIZATION TABLE
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
    
    UNIQUE KEY uk_branding_church (church_id)
);

-- 13. CHURCH SETTINGS TABLE
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
    
    UNIQUE KEY uk_settings_church_key (church_id, setting_key),
    INDEX idx_settings_church (church_id),
    INDEX idx_settings_public (is_public)
);

-- 14. SETUP WIZARD PROGRESS TABLE
CREATE TABLE IF NOT EXISTS setup_wizard_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL DEFAULT 1,
    current_step INT DEFAULT 0,
    steps_completed JSON DEFAULT NULL,
    wizard_data JSON DEFAULT NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_wizard_church (church_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- INITIAL DATA SETUP
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Insert default church info (will be updated during provisioning)
INSERT INTO church_info (
    church_id, name, email, phone, website,
    address, city, state_province, postal_code, country,
    description, founded_year, language_preference, timezone, currency, is_active
) VALUES (
    'TEMPLATE_001',
    'Template Orthodox Church',
    'admin@template.org',
    '(000) 000-0000',
    'https://template.org',
    '123 Template Street',
    'Template City',
    'Template State',
    '00000',
    'United States',
    'Template church database - to be updated during provisioning.',
    2025,
    'en',
    'UTC',
    'USD',
    TRUE
);

-- Create default admin user (password will be set during provisioning)
INSERT INTO users (name, email, password, role) VALUES 
('Church Administrator', 'admin@template.org', '$2b$10$defaulthash', 'church_admin');

-- Insert default OCR settings
INSERT INTO ocr_settings (church_id) VALUES (1);

-- Insert default branding
INSERT INTO branding (church_id, primary_color, secondary_color, ag_grid_theme) 
VALUES (1, '#1976d2', '#dc004e', 'ag-theme-alpine');

-- Insert default church settings
INSERT INTO church_settings (church_id, setting_key, setting_value, setting_type, description, is_public)
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

-- Initialize setup wizard progress
INSERT INTO setup_wizard_progress (church_id, current_step, steps_completed, wizard_data)
VALUES (1, 0, '[]', '{}');

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════════════

SELECT 'Database template created successfully' AS status;
SELECT 'Tables created:' AS info;
SHOW TABLES;
