-- Fix churches table schema - resolve column name conflicts
-- This fixes the "Field 'name' doesn't have a default value" error

-- First, check if we have both 'name' and 'church_name' columns
-- If so, we need to consolidate them

-- Option 1: If 'name' column exists and we want to use 'church_name'
-- Drop the 'name' column constraint and rename church_name to name
-- or give name a default value

-- Check current table structure first
DESCRIBE churches;

-- If there's a 'name' column that's required, either:
-- 1. Make it nullable with a default
-- 2. Drop it if church_name is the intended column
-- 3. Rename church_name to name

-- Let's make the 'name' column nullable if it exists
ALTER TABLE churches MODIFY COLUMN name VARCHAR(255) DEFAULT NULL;

-- Or if you want to drop the 'name' column entirely (if church_name is preferred):
-- ALTER TABLE churches DROP COLUMN name;

-- Or if you want to standardize on 'name' instead of 'church_name':
-- ALTER TABLE churches CHANGE COLUMN church_name name VARCHAR(255) NOT NULL;
