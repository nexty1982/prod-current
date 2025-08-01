-- Fix Church ID: Change from 14 to 11
-- This script safely changes the church ID to match the records database

-- First, check if ID 11 is available
SELECT 'Checking if church ID 11 exists...' as status;
SELECT COUNT(*) as existing_count FROM orthodoxmetrics_db.churches WHERE id = 11;

-- If the above returns 0, proceed with the change
-- If it returns 1, STOP - ID 11 is already taken

-- Step 1: Create new record with ID 11
INSERT INTO orthodoxmetrics_db.churches 
(id, name, email, phone, address, city, state_province, postal_code, country, 
 preferred_language, timezone, currency, tax_id, website, description_multilang, 
 settings, is_active, database_name, has_baptism_records, has_marriage_records, 
 has_funeral_records, setup_complete, created_at, updated_at)
SELECT 
  11 as id,  -- New church ID
  name, email, phone, address, city, state_province, postal_code, country,
  preferred_language, timezone, currency, tax_id, website, description_multilang,
  settings, is_active, database_name, has_baptism_records, has_marriage_records,
  has_funeral_records, setup_complete, created_at, NOW() as updated_at
FROM orthodoxmetrics_db.churches 
WHERE id = 14;

-- Step 2: Verify the new record was created
SELECT 'New church record created:' as status;
SELECT id, name, email FROM orthodoxmetrics_db.churches WHERE id = 11;

-- Step 3: Delete the old record
DELETE FROM orthodoxmetrics_db.churches WHERE id = 14;

-- Step 4: Verify the change
SELECT 'Church ID change completed!' as status;
SELECT id, name, email FROM orthodoxmetrics_db.churches WHERE id IN (11, 14);

-- Expected result: Only ID 11 should exist, ID 14 should be gone 