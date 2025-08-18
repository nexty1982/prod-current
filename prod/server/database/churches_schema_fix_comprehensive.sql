-- Comprehensive fix for churches table schema issue
-- This resolves the "Field 'name' doesn't have a default value" error

-- First, let's see what the current table looks like
-- DESCRIBE churches;

-- Solution 1: If there's a 'name' column that's causing issues, make it nullable
-- This is the safest approach
SET SQL_MODE = '';
ALTER TABLE churches MODIFY COLUMN name VARCHAR(255) DEFAULT NULL;

-- Solution 2: If you want to populate the 'name' column with 'church_name' values
-- UPDATE churches SET name = church_name WHERE name IS NULL OR name = '';

-- Solution 3: If the 'name' column is not needed, drop it
-- ALTER TABLE churches DROP COLUMN name;

-- Make sure all required columns exist and have proper defaults
ALTER TABLE churches 
  MODIFY COLUMN church_name VARCHAR(255) NOT NULL,
  MODIFY COLUMN city VARCHAR(255) DEFAULT NULL,
  MODIFY COLUMN country VARCHAR(255) DEFAULT 'USA',
  MODIFY COLUMN language_preference ENUM('en', 'gr', 'ru', 'ro') DEFAULT 'en',
  MODIFY COLUMN admin_email VARCHAR(255) NOT NULL,
  MODIFY COLUMN timezone VARCHAR(100) DEFAULT 'UTC',
  MODIFY COLUMN is_active BOOLEAN DEFAULT TRUE,
  MODIFY COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add any missing columns
ALTER TABLE churches 
  ADD COLUMN IF NOT EXISTS provision_status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS site_slug VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS site_url VARCHAR(255) DEFAULT NULL;

-- Ensure unique constraints
ALTER TABLE churches ADD CONSTRAINT UNIQUE uk_churches_church_name (church_name);
ALTER TABLE churches ADD CONSTRAINT UNIQUE uk_churches_admin_email (admin_email);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_churches_country ON churches(country);
CREATE INDEX IF NOT EXISTS idx_churches_is_active ON churches(is_active);
CREATE INDEX IF NOT EXISTS idx_churches_provision_status ON churches(provision_status);
