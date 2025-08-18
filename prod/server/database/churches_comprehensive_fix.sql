-- Comprehensive database fix for churches table column conflicts
-- This handles all the duplicate column issues we've encountered

-- First check what we're working with
DESCRIBE churches;

-- Fix all the duplicate column issues by making legacy columns nullable
-- This is the safest approach that won't break existing data

ALTER TABLE churches 
  MODIFY COLUMN name VARCHAR(255) DEFAULT NULL,
  MODIFY COLUMN email VARCHAR(255) DEFAULT NULL;

-- Ensure all required columns have proper defaults
ALTER TABLE churches 
  MODIFY COLUMN church_name VARCHAR(255) NOT NULL,
  MODIFY COLUMN admin_email VARCHAR(255) NOT NULL,
  MODIFY COLUMN city VARCHAR(255) DEFAULT NULL,
  MODIFY COLUMN country VARCHAR(255) DEFAULT 'USA',
  MODIFY COLUMN language_preference ENUM('en', 'gr', 'ru', 'ro') DEFAULT 'en',
  MODIFY COLUMN timezone VARCHAR(100) DEFAULT 'UTC',
  MODIFY COLUMN is_active BOOLEAN DEFAULT TRUE,
  MODIFY COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add any missing columns that might be referenced
ALTER TABLE churches 
  ADD COLUMN IF NOT EXISTS provision_status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS site_slug VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS site_url VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT NULL;

-- Sync data from new columns to old columns if data exists
UPDATE churches SET name = church_name WHERE name IS NULL AND church_name IS NOT NULL;
UPDATE churches SET email = admin_email WHERE email IS NULL AND admin_email IS NOT NULL;
UPDATE churches SET location = CONCAT_WS(', ', city, country) WHERE location IS NULL;

-- Add proper indexes
CREATE INDEX IF NOT EXISTS idx_churches_church_name ON churches(church_name);
CREATE INDEX IF NOT EXISTS idx_churches_admin_email ON churches(admin_email);
CREATE INDEX IF NOT EXISTS idx_churches_country ON churches(country);
CREATE INDEX IF NOT EXISTS idx_churches_is_active ON churches(is_active);
CREATE INDEX IF NOT EXISTS idx_churches_provision_status ON churches(provision_status);

-- Ensure unique constraints (handle duplicates first)
-- Only add if they don't already exist
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE table_name = 'churches' AND index_name = 'uk_churches_church_name') = 0,
  'ALTER TABLE churches ADD CONSTRAINT uk_churches_church_name UNIQUE (church_name)',
  'SELECT "uk_churches_church_name already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE table_name = 'churches' AND index_name = 'uk_churches_admin_email') = 0,
  'ALTER TABLE churches ADD CONSTRAINT uk_churches_admin_email UNIQUE (admin_email)',
  'SELECT "uk_churches_admin_email already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
