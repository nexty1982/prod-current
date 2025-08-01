-- Quick diagnostic to check actual church database structures
-- Run this to see what tables actually exist in your church databases

-- Check ssppoc_records_db structure
SELECT 'ssppoc_records_db Tables:' as info;
SELECT TABLE_NAME, TABLE_ROWS 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'ssppoc_records_db' 
ORDER BY TABLE_NAME;

-- Check if church_id columns exist in any tables
SELECT 'Church ID columns in ssppoc_records_db:' as info;
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'ssppoc_records_db' 
AND COLUMN_NAME = 'church_id';

-- Check orthodox_ssppoc2 structure  
SELECT 'orthodox_ssppoc2 Tables:' as info;
SELECT TABLE_NAME, TABLE_ROWS 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'orthodox_ssppoc2' 
ORDER BY TABLE_NAME;

-- Check if church_id columns exist in orthodox_ssppoc2
SELECT 'Church ID columns in orthodox_ssppoc2:' as info;
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'orthodox_ssppoc2' 
AND COLUMN_NAME = 'church_id';

-- Check orthodoxmetrics_db.churches table
SELECT 'Churches in global registry:' as info;
SELECT id, name, database_name, email, is_active 
FROM orthodoxmetrics_db.churches
ORDER BY id;

-- Look for any tables that might contain records
SELECT 'All record-like tables:' as info;
SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_ROWS
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA IN ('ssppoc_records_db', 'orthodox_ssppoc2')
AND (TABLE_NAME LIKE '%record%' 
     OR TABLE_NAME LIKE '%baptism%' 
     OR TABLE_NAME LIKE '%marriage%' 
     OR TABLE_NAME LIKE '%funeral%'
     OR TABLE_NAME LIKE '%ceremony%')
ORDER BY TABLE_SCHEMA, TABLE_NAME; 