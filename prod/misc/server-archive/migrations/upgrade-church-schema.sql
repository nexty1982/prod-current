-- Migration: Upgrade existing church_info table to comprehensive schema
-- Date: July 13, 2025
-- Purpose: Add missing fields to existing church_info table without breaking existing data

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- BACKUP EXISTING DATA FIRST
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Create backup of existing church_info
CREATE TABLE IF NOT EXISTS church_info_backup AS SELECT * FROM church_info;

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ADD NEW COLUMNS TO EXISTING CHURCH_INFO TABLE
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Add new columns that don't exist yet
ALTER TABLE church_info 
ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT '' AFTER church_id,
ADD COLUMN IF NOT EXISTS email VARCHAR(255) NOT NULL DEFAULT '' AFTER name,
ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT NULL AFTER email,
ADD COLUMN IF NOT EXISTS website VARCHAR(255) DEFAULT NULL AFTER phone,
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL AFTER website,
ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT NULL AFTER address,
ADD COLUMN IF NOT EXISTS state_province VARCHAR(100) DEFAULT NULL AFTER city,
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) DEFAULT NULL AFTER state_province,
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT NULL AFTER postal_code,
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL AFTER country,
ADD COLUMN IF NOT EXISTS language_preference VARCHAR(10) DEFAULT 'en' AFTER founded_year,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC' AFTER language_preference,
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD' AFTER timezone,
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50) DEFAULT NULL AFTER currency,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE AFTER tax_id;

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- UPDATE CHURCH_ID COLUMN TYPE IF NEEDED
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Convert church_id from INT to VARCHAR if it's currently INT
SET @column_type = (
    SELECT DATA_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'church_info' 
    AND COLUMN_NAME = 'church_id'
);

-- Only modify if it's currently INT
SET @sql = IF(@column_type = 'int', 
    'ALTER TABLE church_info MODIFY COLUMN church_id VARCHAR(50) UNIQUE NOT NULL', 
    'SELECT "church_id is already VARCHAR" AS status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- POPULATE NEW FIELDS WITH MEANINGFUL DATA
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Update church_id to proper format if it's numeric
UPDATE church_info 
SET church_id = CONCAT('CHURCH_', LPAD(id, 3, '0'))
WHERE church_id REGEXP '^[0-9]+$';

-- Set name from location if name is empty
UPDATE church_info 
SET name = COALESCE(NULLIF(name, ''), location, 'Orthodox Church')
WHERE name = '' OR name IS NULL;

-- Generate email if empty
UPDATE church_info 
SET email = LOWER(CONCAT(
    REPLACE(REPLACE(name, ' ', ''), 'Orthodox', ''), 
    '@church.org'
))
WHERE email = '' OR email IS NULL;

-- Set default address from location
UPDATE church_info 
SET address = location
WHERE (address IS NULL OR address = '') AND location IS NOT NULL;

-- Set default country
UPDATE church_info 
SET country = 'United States'
WHERE country IS NULL OR country = '';

-- Ensure is_active is set
UPDATE church_info 
SET is_active = TRUE
WHERE is_active IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- CREATE INDEXES FOR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_church_info_name ON church_info(name);
CREATE INDEX IF NOT EXISTS idx_church_info_email ON church_info(email);
CREATE INDEX IF NOT EXISTS idx_church_info_active ON church_info(is_active);
CREATE INDEX IF NOT EXISTS idx_church_info_country ON church_info(country);

-- Add unique constraint on email (ignore if already exists)
-- Use a procedure to handle the constraint safely
DELIMITER //
CREATE PROCEDURE AddEmailConstraint()
BEGIN
    DECLARE CONTINUE HANDLER FOR 1061 BEGIN END; -- Duplicate key name error
    ALTER TABLE church_info ADD CONSTRAINT uk_church_info_email UNIQUE (email);
END//
DELIMITER ;

CALL AddEmailConstraint();
DROP PROCEDURE AddEmailConstraint;

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ENHANCE RECORD TABLES WITH ADDITIONAL FIELDS
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Enhance baptism_records table
ALTER TABLE baptism_records 
ADD COLUMN IF NOT EXISTS parents VARCHAR(500) DEFAULT NULL AFTER notes,
ADD COLUMN IF NOT EXISTS godparents VARCHAR(500) DEFAULT NULL AFTER parents,
ADD COLUMN IF NOT EXISTS birth_date DATE DEFAULT NULL AFTER godparents,
ADD COLUMN IF NOT EXISTS birth_place VARCHAR(255) DEFAULT NULL AFTER birth_date,
ADD COLUMN IF NOT EXISTS baptism_place VARCHAR(255) DEFAULT NULL AFTER birth_place,
ADD COLUMN IF NOT EXISTS certificate_number VARCHAR(100) DEFAULT NULL AFTER baptism_place,
ADD COLUMN IF NOT EXISTS record_source ENUM('manual', 'import', 'ocr') DEFAULT 'manual' AFTER certificate_number,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(5,2) DEFAULT NULL AFTER record_source,
ADD COLUMN IF NOT EXISTS language CHAR(2) DEFAULT 'en' AFTER confidence_score;

-- Enhance marriage_records table
ALTER TABLE marriage_records 
ADD COLUMN IF NOT EXISTS groom_name VARCHAR(255) DEFAULT NULL AFTER notes,
ADD COLUMN IF NOT EXISTS bride_name VARCHAR(255) DEFAULT NULL AFTER groom_name,
ADD COLUMN IF NOT EXISTS groom_age INT DEFAULT NULL AFTER bride_name,
ADD COLUMN IF NOT EXISTS bride_age INT DEFAULT NULL AFTER groom_age,
ADD COLUMN IF NOT EXISTS groom_residence VARCHAR(255) DEFAULT NULL AFTER bride_age,
ADD COLUMN IF NOT EXISTS bride_residence VARCHAR(255) DEFAULT NULL AFTER groom_residence,
ADD COLUMN IF NOT EXISTS witnesses TEXT DEFAULT NULL AFTER bride_residence,
ADD COLUMN IF NOT EXISTS marriage_place VARCHAR(255) DEFAULT NULL AFTER witnesses,
ADD COLUMN IF NOT EXISTS certificate_number VARCHAR(100) DEFAULT NULL AFTER marriage_place,
ADD COLUMN IF NOT EXISTS license_number VARCHAR(100) DEFAULT NULL AFTER certificate_number,
ADD COLUMN IF NOT EXISTS record_source ENUM('manual', 'import', 'ocr') DEFAULT 'manual' AFTER license_number,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(5,2) DEFAULT NULL AFTER record_source,
ADD COLUMN IF NOT EXISTS language CHAR(2) DEFAULT 'en' AFTER confidence_score;

-- Enhance funeral_records table
ALTER TABLE funeral_records 
ADD COLUMN IF NOT EXISTS death_date DATE DEFAULT NULL AFTER notes,
ADD COLUMN IF NOT EXISTS birth_date DATE DEFAULT NULL AFTER death_date,
ADD COLUMN IF NOT EXISTS age_at_death INT DEFAULT NULL AFTER birth_date,
ADD COLUMN IF NOT EXISTS death_place VARCHAR(255) DEFAULT NULL AFTER age_at_death,
ADD COLUMN IF NOT EXISTS burial_place VARCHAR(255) DEFAULT NULL AFTER death_place,
ADD COLUMN IF NOT EXISTS funeral_home VARCHAR(255) DEFAULT NULL AFTER burial_place,
ADD COLUMN IF NOT EXISTS survivors TEXT DEFAULT NULL AFTER funeral_home,
ADD COLUMN IF NOT EXISTS cause_of_death VARCHAR(255) DEFAULT NULL AFTER survivors,
ADD COLUMN IF NOT EXISTS record_source ENUM('manual', 'import', 'ocr') DEFAULT 'manual' AFTER cause_of_death,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(5,2) DEFAULT NULL AFTER record_source,
ADD COLUMN IF NOT EXISTS language CHAR(2) DEFAULT 'en' AFTER confidence_score;

-- Enhance users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT NULL AFTER role,
ADD COLUMN IF NOT EXISTS position VARCHAR(100) DEFAULT NULL AFTER phone,
ADD COLUMN IF NOT EXISTS permissions JSON DEFAULT NULL AFTER position,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL AFTER permissions,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE AFTER last_login,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE AFTER is_active,
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255) DEFAULT NULL AFTER email_verified,
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP NULL AFTER password_reset_token;

-- Update user role enum to include church_admin
ALTER TABLE users MODIFY COLUMN role ENUM('admin','super_admin','user','church_admin') DEFAULT 'user';

-- Add indexes to record tables
CREATE INDEX IF NOT EXISTS idx_baptism_church_id ON baptism_records(church_id);
CREATE INDEX IF NOT EXISTS idx_baptism_date ON baptism_records(date_performed);
CREATE INDEX IF NOT EXISTS idx_baptism_person ON baptism_records(person_name);

CREATE INDEX IF NOT EXISTS idx_marriage_church_id ON marriage_records(church_id);
CREATE INDEX IF NOT EXISTS idx_marriage_date ON marriage_records(date_performed);
CREATE INDEX IF NOT EXISTS idx_marriage_groom ON marriage_records(groom_name);
CREATE INDEX IF NOT EXISTS idx_marriage_bride ON marriage_records(bride_name);

CREATE INDEX IF NOT EXISTS idx_funeral_church_id ON funeral_records(church_id);
CREATE INDEX IF NOT EXISTS idx_funeral_date ON funeral_records(date_performed);
CREATE INDEX IF NOT EXISTS idx_funeral_person ON funeral_records(person_name);
CREATE INDEX IF NOT EXISTS idx_funeral_death_date ON funeral_records(death_date);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- VERIFICATION AND CLEANUP
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Show final structure
SELECT 'Migration completed successfully' AS status;
SELECT 'Updated church_info table structure:' AS info;
DESCRIBE church_info;

SELECT 'Sample church_info data:' AS info;
SELECT 
    id, church_id, name, email, phone, city, state_province, country,
    founded_year, language_preference, timezone, is_active, created_at
FROM church_info LIMIT 3;

-- Count records in each table
SELECT 
    'Summary' as info,
    (SELECT COUNT(*) FROM church_info) as church_info_count,
    (SELECT COUNT(*) FROM baptism_records) as baptism_records_count,
    (SELECT COUNT(*) FROM marriage_records) as marriage_records_count,
    (SELECT COUNT(*) FROM funeral_records) as funeral_records_count,
    (SELECT COUNT(*) FROM users) as users_count;

SELECT 'Migration completed - all tables enhanced with comprehensive schema' AS final_status;
