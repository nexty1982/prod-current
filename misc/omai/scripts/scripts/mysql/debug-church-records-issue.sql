-- Debug script to check church records issue
-- Step 1: Check church database linkage
SELECT 'Church Database Linkage:' as step;
SELECT id, name, database_name FROM orthodoxmetrics_db.churches WHERE id = 14;

-- Step 2: Check if database exists
SELECT 'Database exists check:' as step;
SELECT SCHEMA_NAME as database_name 
FROM information_schema.SCHEMATA 
WHERE SCHEMA_NAME = 'ssppoc_records_db';

-- Step 3: Check marriage_records table structure and data
SELECT 'Marriage records table check:' as step;
SELECT COUNT(*) as total_records FROM ssppoc_records_db.marriage_records;

-- Step 4: Check church_id values in marriage_records
SELECT 'Church ID distribution in marriage_records:' as step;
SELECT 
    church_id, 
    COUNT(*) as record_count,
    MIN(id) as first_record_id,
    MAX(id) as last_record_id
FROM ssppoc_records_db.marriage_records 
GROUP BY church_id 
ORDER BY church_id;

-- Step 5: Check specific records for church_id = 14
SELECT 'Records for church_id = 14:' as step;
SELECT 
    id, church_id, fname_groom, lname_groom, fname_bride, lname_bride, mdate
FROM ssppoc_records_db.marriage_records 
WHERE church_id = 14 
LIMIT 5;

-- Step 6: Check if any records exist without church_id
SELECT 'Records without church_id:' as step;
SELECT COUNT(*) as records_without_church_id 
FROM ssppoc_records_db.marriage_records 
WHERE church_id IS NULL;

-- Step 7: Check the exact query the API would use
SELECT 'API query simulation (church_id = 14):' as step;
SELECT * FROM ssppoc_records_db.marriage_records 
WHERE church_id = 14 
ORDER BY id DESC 
LIMIT 10; 