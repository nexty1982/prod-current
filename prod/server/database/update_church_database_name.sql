-- Update churches table to point to the correct RECORDS database
-- Date: July 19, 2025
-- Purpose: Fix database_name reference to point to records DB, not OCR DB

-- The church's database_name should point to where their RECORDS are stored
UPDATE churches 
SET database_name = 'ssppoc_records_db' 
WHERE database_name = 'saints_peter_and_paul_orthodox_church_db';

-- Verify the update
SELECT id, name, database_name FROM churches WHERE is_active = 1;
