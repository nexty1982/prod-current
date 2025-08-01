-- Comprehensive Churches Table Schema Fix
-- This script ensures the churches table has all required fields for proper church editing
-- Date: January 2025

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- STEP 1: BACKUP EXISTING DATA
-- ═══════════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS churches_backup AS SELECT * FROM churches;

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- STEP 2: ADD ALL MISSING COLUMNS (INCLUDING LEGACY COMPATIBILITY COLUMNS)
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Core church information columns
ALTER TABLE churches ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS state_province VARCHAR(100) DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS website VARCHAR(255) DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE churches ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE churches ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';
ALTER TABLE churches ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50) DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS description_multilang JSON DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS settings JSON DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS database_name VARCHAR(100) DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS setup_complete BOOLEAN DEFAULT FALSE;

-- Legacy compatibility columns (ADD THESE FIRST before syncing)
ALTER TABLE churches ADD COLUMN IF NOT EXISTS church_name VARCHAR(255) DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255) DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS language_preference VARCHAR(10) DEFAULT NULL;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT NULL;

-- Timestamps
ALTER TABLE churches ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- STEP 3: SYNC DATA BETWEEN OLD AND NEW COLUMN NAMES
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Sync name fields (both directions to ensure data consistency)
UPDATE churches SET name = church_name WHERE name IS NULL AND church_name IS NOT NULL;
UPDATE churches SET church_name = name WHERE church_name IS NULL AND name IS NOT NULL;

-- Sync email fields (both directions to ensure data consistency)
UPDATE churches SET email = admin_email WHERE email IS NULL AND admin_email IS NOT NULL;
UPDATE churches SET admin_email = email WHERE admin_email IS NULL AND email IS NOT NULL;

-- Sync language fields (both directions to ensure data consistency)
UPDATE churches SET preferred_language = language_preference WHERE preferred_language IS NULL AND language_preference IS NOT NULL;
UPDATE churches SET language_preference = preferred_language WHERE language_preference IS NULL AND preferred_language IS NOT NULL;

-- Set default values for required fields where both old and new columns are empty
UPDATE churches SET name = COALESCE(name, church_name, 'Orthodox Church') WHERE (name IS NULL OR name = '') AND (church_name IS NULL OR church_name = '');
UPDATE churches SET email = COALESCE(email, admin_email, CONCAT(LOWER(REPLACE(COALESCE(name, church_name, 'church'), ' ', '')), '@church.org')) WHERE (email IS NULL OR email = '') AND (admin_email IS NULL OR admin_email = '');
UPDATE churches SET preferred_language = COALESCE(preferred_language, language_preference, 'en') WHERE preferred_language IS NULL;
UPDATE churches SET timezone = COALESCE(timezone, 'UTC') WHERE timezone IS NULL;
UPDATE churches SET currency = COALESCE(currency, 'USD') WHERE currency IS NULL;
UPDATE churches SET is_active = COALESCE(is_active, TRUE) WHERE is_active IS NULL;
UPDATE churches SET setup_complete = COALESCE(setup_complete, FALSE) WHERE setup_complete IS NULL;

-- Create location field from address components if not already set
UPDATE churches 
SET location = CONCAT_WS(', ', 
  NULLIF(city, ''), 
  NULLIF(state_province, ''), 
  NULLIF(country, '')
) 
WHERE (location IS NULL OR location = '') AND (city IS NOT NULL OR state_province IS NOT NULL OR country IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- STEP 4: ENSURE PROPER COLUMN CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Make core fields NOT NULL with proper defaults (only after data is populated)
ALTER TABLE churches MODIFY COLUMN name VARCHAR(255) NOT NULL DEFAULT 'Orthodox Church';
ALTER TABLE churches MODIFY COLUMN email VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE churches MODIFY COLUMN preferred_language VARCHAR(10) NOT NULL DEFAULT 'en';
ALTER TABLE churches MODIFY COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'UTC';
ALTER TABLE churches MODIFY COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD';
ALTER TABLE churches MODIFY COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE churches MODIFY COLUMN setup_complete BOOLEAN NOT NULL DEFAULT FALSE;

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- STEP 5: CREATE PROPER INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_churches_name ON churches(name);
CREATE INDEX IF NOT EXISTS idx_churches_email ON churches(email);
CREATE INDEX IF NOT EXISTS idx_churches_active ON churches(is_active);
CREATE INDEX IF NOT EXISTS idx_churches_country ON churches(country);
CREATE INDEX IF NOT EXISTS idx_churches_setup ON churches(setup_complete);
CREATE INDEX IF NOT EXISTS idx_churches_created ON churches(created_at);

-- Legacy indexes for backward compatibility
CREATE INDEX IF NOT EXISTS idx_churches_church_name ON churches(church_name);
CREATE INDEX IF NOT EXISTS idx_churches_admin_email ON churches(admin_email);

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- STEP 6: ADD UNIQUE CONSTRAINTS (SAFELY)
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Create a procedure to safely add unique constraints
DELIMITER $$
CREATE PROCEDURE AddUniqueConstraintSafely(
    IN constraint_name VARCHAR(255),
    IN table_name VARCHAR(255),
    IN column_name VARCHAR(255)
)
BEGIN
    DECLARE constraint_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO constraint_exists 
    FROM information_schema.table_constraints 
    WHERE table_schema = DATABASE() 
    AND table_name = table_name 
    AND constraint_name = constraint_name;
    
    IF constraint_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', table_name, ' ADD CONSTRAINT ', constraint_name, ' UNIQUE (', column_name, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- Add unique constraints safely
CALL AddUniqueConstraintSafely('uk_churches_email', 'churches', 'email');

-- Clean up procedure
DROP PROCEDURE IF EXISTS AddUniqueConstraintSafely;

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- STEP 7: VERIFY SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════════════════

SELECT 'Churches table schema fix completed successfully!' AS Status;
SELECT COUNT(*) AS total_churches FROM churches;
SELECT 
    COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as churches_with_name,
    COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as churches_with_email,
    COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END) as churches_with_address
FROM churches; 