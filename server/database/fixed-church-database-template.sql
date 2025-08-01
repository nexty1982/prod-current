-- ================================================================================
-- CORRECTED CHURCH DATABASE TEMPLATE
-- ================================================================================
-- Purpose: Standard template for creating new church-specific databases
-- Architecture: Multi-tenant with proper church_id references to orthodoxmetrics_db.churches
-- 
-- IMPORTANT: This template fixes the linkage issues by:
-- 1. Ensuring all record tables have church_id columns
-- 2. NOT creating local church_info tables (violates multi-tenant principle)
-- 3. Using proper indexes and constraints
-- 4. Following standardized naming conventions
-- ================================================================================

-- Note: This template should be used with placeholders:
-- {DATABASE_NAME} - The church-specific database name (e.g., 'ssppoc_records_db')
-- {CHURCH_ID} - The ID from orthodoxmetrics_db.churches table

USE `{DATABASE_NAME}`;

-- ================================================================================
-- SACRAMENTAL RECORDS TABLES
-- ================================================================================

-- Baptism Records Table
DROP TABLE IF EXISTS baptism_records;
CREATE TABLE baptism_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- REQUIRED: Church reference to global registry
    church_id INT NOT NULL DEFAULT {CHURCH_ID},
    
    -- Core baptism information
    record_number VARCHAR(50),
    baptism_date DATE NOT NULL,
    
    -- Person being baptized
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255),
    last_name VARCHAR(255) NOT NULL,
    birth_date DATE,
    birth_place VARCHAR(255),
    
    -- Family information
    father_name VARCHAR(255),
    mother_name VARCHAR(255),
    father_name_native VARCHAR(255), -- For non-Latin scripts
    mother_name_native VARCHAR(255),
    
    -- Sponsors/Godparents
    godfather_name VARCHAR(255),
    godmother_name VARCHAR(255),
    godparent_names TEXT, -- Combined field for compatibility
    
    -- Ceremony details
    priest_name VARCHAR(255) NOT NULL,
    ceremony_location VARCHAR(255),
    witness_1 VARCHAR(255),
    witness_2 VARCHAR(255),
    
    -- Multilingual support
    original_language ENUM('english', 'greek', 'russian', 'romanian', 'arabic', 'other') DEFAULT 'english',
    person_name_native VARCHAR(255), -- Name in native script
    
    -- Administrative
    notes TEXT,
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_number VARCHAR(50),
    entry_status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
    
    -- Metadata
    created_by INT, -- User ID from orthodoxmetrics_db.users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_church_id (church_id),
    INDEX idx_baptism_date (baptism_date),
    INDEX idx_person_name (first_name, last_name),
    INDEX idx_record_number (record_number),
    INDEX idx_priest (priest_name),
    INDEX idx_created_date (created_at),
    
    -- NOTE: Cross-database foreign key constraints are not supported in MySQL/MariaDB
    -- The relationship to orthodoxmetrics_db.churches(id) must be maintained at application level
    -- or through triggers/procedures
    
    -- Ensure church_id is always set
    CONSTRAINT chk_baptism_church_id CHECK (church_id > 0)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Baptism records for church_id {CHURCH_ID}. church_id references orthodoxmetrics_db.churches(id)';

-- Marriage Records Table
DROP TABLE IF EXISTS marriage_records;
CREATE TABLE marriage_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- REQUIRED: Church reference to global registry
    church_id INT NOT NULL DEFAULT {CHURCH_ID},
    
    -- Core marriage information
    record_number VARCHAR(50),
    marriage_date DATE NOT NULL,
    
    -- Groom information
    groom_first_name VARCHAR(255) NOT NULL,
    groom_middle_name VARCHAR(255),
    groom_last_name VARCHAR(255) NOT NULL,
    groom_birth_date DATE,
    groom_birth_place VARCHAR(255),
    groom_father_name VARCHAR(255),
    groom_mother_name VARCHAR(255),
    
    -- Bride information
    bride_first_name VARCHAR(255) NOT NULL,
    bride_middle_name VARCHAR(255),
    bride_last_name VARCHAR(255) NOT NULL,
    bride_birth_date DATE,
    bride_birth_place VARCHAR(255),
    bride_father_name VARCHAR(255),
    bride_mother_name VARCHAR(255),
    
    -- Ceremony details
    priest_name VARCHAR(255) NOT NULL,
    ceremony_location VARCHAR(255),
    witness_1 VARCHAR(255),
    witness_2 VARCHAR(255),
    witnesses TEXT, -- Combined field for compatibility
    
    -- Multilingual support
    original_language ENUM('english', 'greek', 'russian', 'romanian', 'arabic', 'other') DEFAULT 'english',
    groom_name_native VARCHAR(255),
    bride_name_native VARCHAR(255),
    
    -- Administrative
    notes TEXT,
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_number VARCHAR(50),
    entry_status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
    
    -- Metadata
    created_by INT, -- User ID from orthodoxmetrics_db.users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_church_id (church_id),
    INDEX idx_marriage_date (marriage_date),
    INDEX idx_groom_name (groom_first_name, groom_last_name),
    INDEX idx_bride_name (bride_first_name, bride_last_name),
    INDEX idx_record_number (record_number),
    INDEX idx_priest (priest_name),
    INDEX idx_created_date (created_at),
    
    -- Ensure church_id is always set
    CONSTRAINT chk_marriage_church_id CHECK (church_id > 0)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Marriage records for church_id {CHURCH_ID}. church_id references orthodoxmetrics_db.churches(id)';

-- Funeral Records Table
DROP TABLE IF EXISTS funeral_records;
CREATE TABLE funeral_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- REQUIRED: Church reference to global registry
    church_id INT NOT NULL DEFAULT {CHURCH_ID},
    
    -- Core funeral information
    record_number VARCHAR(50),
    funeral_date DATE NOT NULL,
    
    -- Deceased person information
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255),
    last_name VARCHAR(255) NOT NULL,
    birth_date DATE,
    death_date DATE NOT NULL,
    birth_place VARCHAR(255),
    death_place VARCHAR(255),
    
    -- Family information
    next_of_kin VARCHAR(255),
    relationship_to_deceased VARCHAR(100),
    surviving_family TEXT,
    
    -- Ceremony details
    priest_name VARCHAR(255) NOT NULL,
    funeral_location VARCHAR(255),
    burial_location VARCHAR(255),
    cemetery_name VARCHAR(255),
    
    -- Multilingual support
    original_language ENUM('english', 'greek', 'russian', 'romanian', 'arabic', 'other') DEFAULT 'english',
    person_name_native VARCHAR(255),
    
    -- Administrative
    notes TEXT,
    cause_of_death VARCHAR(255),
    age_at_death INT,
    entry_status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
    
    -- Metadata
    created_by INT, -- User ID from orthodoxmetrics_db.users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_church_id (church_id),
    INDEX idx_funeral_date (funeral_date),
    INDEX idx_death_date (death_date),
    INDEX idx_person_name (first_name, last_name),
    INDEX idx_record_number (record_number),
    INDEX idx_priest (priest_name),
    INDEX idx_created_date (created_at),
    
    -- Ensure church_id is always set
    CONSTRAINT chk_funeral_church_id CHECK (church_id > 0)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Funeral records for church_id {CHURCH_ID}. church_id references orthodoxmetrics_db.churches(id)';

-- ================================================================================
-- SUPPORTING TABLES
-- ================================================================================

-- Activity Log for tracking changes
DROP TABLE IF EXISTS activity_log;
CREATE TABLE activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL DEFAULT {CHURCH_ID},
    user_id INT, -- References orthodoxmetrics_db.users(id)
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_church_id (church_id),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_created_date (created_at)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Activity log for church_id {CHURCH_ID}';

-- OCR Upload Sessions (if using OCR functionality)
DROP TABLE IF EXISTS ocr_upload_sessions;
CREATE TABLE ocr_upload_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL DEFAULT {CHURCH_ID},
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INT, -- References orthodoxmetrics_db.users(id)
    upload_filename VARCHAR(255),
    file_path VARCHAR(500),
    file_size INT,
    page_count INT,
    processing_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    records_extracted INT DEFAULT 0,
    records_imported INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    INDEX idx_church_id (church_id),
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (processing_status),
    INDEX idx_started_date (started_at)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='OCR upload sessions for church_id {CHURCH_ID}';

-- OCR Extracted Data (before import to records)
DROP TABLE IF EXISTS ocr_extracted_data;
CREATE TABLE ocr_extracted_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL DEFAULT {CHURCH_ID},
    session_id VARCHAR(100) NOT NULL,
    record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,
    page_number INT,
    extracted_text TEXT,
    structured_data JSON,
    confidence_score DECIMAL(3,2),
    import_status ENUM('pending', 'imported', 'rejected', 'needs_review') DEFAULT 'pending',
    imported_record_id INT,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_church_id (church_id),
    INDEX idx_session_id (session_id),
    INDEX idx_record_type (record_type),
    INDEX idx_import_status (import_status),
    
    FOREIGN KEY (session_id) REFERENCES ocr_upload_sessions(session_id) ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='OCR extracted data for church_id {CHURCH_ID}';

-- ================================================================================
-- CHURCH-SPECIFIC CONFIGURATION (minimal - main config in orthodoxmetrics_db)
-- ================================================================================

-- Local configuration that doesn't belong in global registry
DROP TABLE IF EXISTS church_local_config;
CREATE TABLE church_local_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT NOT NULL DEFAULT {CHURCH_ID},
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_church_config (church_id, config_key),
    INDEX idx_church_id (church_id),
    INDEX idx_config_key (config_key)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Local configuration for church_id {CHURCH_ID}. Use sparingly - main config in orthodoxmetrics_db.churches';

-- ================================================================================
-- INITIAL DATA AND VALIDATION
-- ================================================================================

-- Insert initial configuration
INSERT INTO church_local_config (church_id, config_key, config_value, description, is_public) VALUES
({CHURCH_ID}, 'database_version', '2.0', 'Church database schema version', FALSE),
({CHURCH_ID}, 'record_number_format', 'AUTO', 'Format for generating record numbers (AUTO, MANUAL, CUSTOM)', FALSE),
({CHURCH_ID}, 'default_language', 'en', 'Default language for new records', FALSE),
({CHURCH_ID}, 'enable_ocr', 'true', 'Enable OCR functionality for this church', FALSE);

-- ================================================================================
-- VALIDATION VIEWS
-- ================================================================================

-- View to validate all records have proper church_id
CREATE OR REPLACE VIEW v_record_validation AS
SELECT 
    'baptism_records' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN church_id = {CHURCH_ID} THEN 1 END) as valid_church_id,
    COUNT(CASE WHEN church_id != {CHURCH_ID} OR church_id IS NULL THEN 1 END) as invalid_church_id
FROM baptism_records
UNION ALL
SELECT 
    'marriage_records' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN church_id = {CHURCH_ID} THEN 1 END) as valid_church_id,
    COUNT(CASE WHEN church_id != {CHURCH_ID} OR church_id IS NULL THEN 1 END) as invalid_church_id
FROM marriage_records
UNION ALL
SELECT 
    'funeral_records' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN church_id = {CHURCH_ID} THEN 1 END) as valid_church_id,
    COUNT(CASE WHEN church_id != {CHURCH_ID} OR church_id IS NULL THEN 1 END) as invalid_church_id
FROM funeral_records;

-- ================================================================================
-- TRIGGERS TO ENSURE DATA INTEGRITY
-- ================================================================================

-- Trigger to ensure church_id is always set correctly for baptism records
DELIMITER $$

DROP TRIGGER IF EXISTS tr_baptism_church_id$$
CREATE TRIGGER tr_baptism_church_id
    BEFORE INSERT ON baptism_records
    FOR EACH ROW
BEGIN
    IF NEW.church_id IS NULL OR NEW.church_id = 0 THEN
        SET NEW.church_id = {CHURCH_ID};
    END IF;
    
    IF NEW.church_id != {CHURCH_ID} THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Invalid church_id: records in this database must have church_id = {CHURCH_ID}';
    END IF;
END$$

-- Similar triggers for marriage and funeral records
DROP TRIGGER IF EXISTS tr_marriage_church_id$$
CREATE TRIGGER tr_marriage_church_id
    BEFORE INSERT ON marriage_records
    FOR EACH ROW
BEGIN
    IF NEW.church_id IS NULL OR NEW.church_id = 0 THEN
        SET NEW.church_id = {CHURCH_ID};
    END IF;
    
    IF NEW.church_id != {CHURCH_ID} THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Invalid church_id: records in this database must have church_id = {CHURCH_ID}';
    END IF;
END$$

DROP TRIGGER IF EXISTS tr_funeral_church_id$$
CREATE TRIGGER tr_funeral_church_id
    BEFORE INSERT ON funeral_records
    FOR EACH ROW
BEGIN
    IF NEW.church_id IS NULL OR NEW.church_id = 0 THEN
        SET NEW.church_id = {CHURCH_ID};
    END IF;
    
    IF NEW.church_id != {CHURCH_ID} THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Invalid church_id: records in this database must have church_id = {CHURCH_ID}';
    END IF;
END$$

DELIMITER ;

-- ================================================================================
-- FINAL VALIDATION AND DOCUMENTATION
-- ================================================================================

-- Document the database structure
INSERT INTO church_local_config (church_id, config_key, config_value, description, is_public) VALUES
({CHURCH_ID}, 'architecture_notes', 
'Multi-tenant database: church_id={CHURCH_ID} references orthodoxmetrics_db.churches(id). No local church_info table.', 
'Database architecture documentation', FALSE),
({CHURCH_ID}, 'created_date', NOW(), 'Database creation timestamp', FALSE);

-- Validate the setup
SELECT 
    'Database setup completed for church_id {CHURCH_ID}' as status,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()) as tables_created,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE()) as triggers_created,
    (SELECT COUNT(*) FROM church_local_config WHERE church_id = {CHURCH_ID}) as config_entries;

-- Display validation view
SELECT * FROM v_record_validation;

-- Final success message
SELECT '🎉 Church database template applied successfully!' as message;
SELECT 'Architecture: Multi-tenant with church_id references to orthodoxmetrics_db.churches' as architecture;
SELECT 'No local church_info table - all church metadata in global registry' as important_note; 