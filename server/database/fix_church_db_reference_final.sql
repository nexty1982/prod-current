-- Fix church database reference - CORRECTED VERSION
-- The church's database_name field should point to where RECORDS are stored
-- NOT where OCR processing happens

-- Show current state
SELECT 'BEFORE UPDATE:' as status;
SELECT id, name, database_name FROM churches WHERE is_active = 1;

-- Update to point to records database
UPDATE churches 
SET database_name = 'ssppoc_records_db' 
WHERE id = 14;

-- Show updated state
SELECT 'AFTER UPDATE:' as status;
SELECT id, name, database_name FROM churches WHERE is_active = 1;

-- Verify the records database has the expected tables
SELECT 'RECORDS DATABASE TABLES:' as info;
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'ssppoc_records_db' ORDER BY TABLE_NAME;
