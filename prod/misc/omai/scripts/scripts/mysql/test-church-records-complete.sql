-- Comprehensive Church Records Test Script
-- Run this to verify the complete fix

-- =================================================================
-- STEP 1: Check Church Configuration
-- =================================================================
SELECT '=== CHURCH CONFIGURATION ===' as test_section;
SELECT 
    id as church_id, 
    name, 
    database_name,
    is_active
FROM orthodoxmetrics_db.churches 
WHERE name LIKE '%Saints Peter%' OR name LIKE '%SSPPOC%' OR id = 14;

-- =================================================================
-- STEP 2: Verify Database Exists  
-- =================================================================
SELECT '=== DATABASE EXISTS CHECK ===' as test_section;
SELECT SCHEMA_NAME as database_found 
FROM information_schema.SCHEMATA 
WHERE SCHEMA_NAME = 'ssppoc_records_db';

-- =================================================================
-- STEP 3: Check All Table Structures
-- =================================================================
SELECT '=== TABLE STRUCTURES ===' as test_section;

SELECT 'BAPTISM TABLE STRUCTURE:' as info;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'ssppoc_records_db' 
AND TABLE_NAME = 'baptism_records' 
ORDER BY ORDINAL_POSITION;

SELECT 'MARRIAGE TABLE STRUCTURE:' as info;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'ssppoc_records_db' 
AND TABLE_NAME = 'marriage_records' 
ORDER BY ORDINAL_POSITION;

SELECT 'FUNERAL TABLE STRUCTURE:' as info;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'ssppoc_records_db' 
AND TABLE_NAME = 'funeral_records' 
ORDER BY ORDINAL_POSITION;

-- =================================================================
-- STEP 4: Check Data Counts by Church ID
-- =================================================================
SELECT '=== RECORD COUNTS BY CHURCH_ID ===' as test_section;

SELECT 'BAPTISM RECORDS:' as record_type, church_id, COUNT(*) as record_count
FROM ssppoc_records_db.baptism_records 
GROUP BY church_id
ORDER BY church_id;

SELECT 'MARRIAGE RECORDS:' as record_type, church_id, COUNT(*) as record_count
FROM ssppoc_records_db.marriage_records 
GROUP BY church_id
ORDER BY church_id;

SELECT 'FUNERAL RECORDS:' as record_type, church_id, COUNT(*) as record_count
FROM ssppoc_records_db.funeral_records 
GROUP BY church_id
ORDER BY church_id;

-- =================================================================
-- STEP 5: Test API Queries (What the backend will run)
-- =================================================================
SELECT '=== API QUERY SIMULATION ===' as test_section;

-- Test marriage records query for church_id = 14
SELECT 'MARRIAGE API TEST (church_id=14):' as query_type, COUNT(*) as records_found
FROM ssppoc_records_db.marriage_records 
WHERE church_id = 14;

-- Test baptism records query for church_id = 14  
SELECT 'BAPTISM API TEST (church_id=14):' as query_type, COUNT(*) as records_found
FROM ssppoc_records_db.baptism_records 
WHERE church_id = 14;

-- Test funeral records query for church_id = 14
SELECT 'FUNERAL API TEST (church_id=14):' as query_type, COUNT(*) as records_found
FROM ssppoc_records_db.funeral_records 
WHERE church_id = 14;

-- =================================================================
-- STEP 6: Show Sample Records
-- =================================================================
SELECT '=== SAMPLE RECORDS ===' as test_section;

SELECT 'SAMPLE MARRIAGE RECORD:' as sample_type;
SELECT id, church_id, mdate, fname_groom, lname_groom, fname_bride, lname_bride, clergy
FROM ssppoc_records_db.marriage_records 
WHERE church_id IS NOT NULL
LIMIT 1;

SELECT 'SAMPLE BAPTISM RECORD:' as sample_type;
SELECT id, church_id, reception_date, first_name, last_name, clergy
FROM ssppoc_records_db.baptism_records 
WHERE church_id IS NOT NULL
LIMIT 1;

SELECT 'SAMPLE FUNERAL RECORD:' as sample_type;
SELECT id, church_id, deceased_date, name, lastname, clergy
FROM ssppoc_records_db.funeral_records 
WHERE church_id IS NOT NULL
LIMIT 1;

-- =================================================================
-- STEP 7: Check for Orphaned Records (no church_id)
-- =================================================================
SELECT '=== ORPHANED RECORDS CHECK ===' as test_section;

SELECT 'BAPTISM ORPHANS:' as orphan_type, COUNT(*) as orphaned_records
FROM ssppoc_records_db.baptism_records 
WHERE church_id IS NULL;

SELECT 'MARRIAGE ORPHANS:' as orphan_type, COUNT(*) as orphaned_records
FROM ssppoc_records_db.marriage_records 
WHERE church_id IS NULL;

SELECT 'FUNERAL ORPHANS:' as orphan_type, COUNT(*) as orphaned_records
FROM ssppoc_records_db.funeral_records 
WHERE church_id IS NULL;

-- =================================================================
-- FINAL STATUS
-- =================================================================
SELECT '=== FINAL STATUS ===' as test_section;
SELECT 
    'READY TO TEST' as status,
    'Church records fix complete - restart server and test frontend' as message; 