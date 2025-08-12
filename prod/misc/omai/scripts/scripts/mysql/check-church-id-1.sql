-- Check Church ID = 1 Configuration
-- This will help debug why the frontend is using church_id=1

-- 1. Check if church_id=1 exists
SELECT '=== CHURCH ID 1 CHECK ===' as section;
SELECT id, name, database_name, is_active 
FROM orthodoxmetrics_db.churches 
WHERE id = 1;

-- 2. Check all active churches
SELECT '=== ALL ACTIVE CHURCHES ===' as section;
SELECT id, name, database_name, is_active 
FROM orthodoxmetrics_db.churches 
WHERE is_active = 1
ORDER BY id;

-- 3. Check if records exist for church_id=1 in ssppoc_records_db
SELECT '=== RECORDS FOR CHURCH_ID=1 ===' as section;

SELECT 'BAPTISM RECORDS:' as table_name, COUNT(*) as count
FROM ssppoc_records_db.baptism_records 
WHERE church_id = 1;

SELECT 'MARRIAGE RECORDS:' as table_name, COUNT(*) as count
FROM ssppoc_records_db.marriage_records 
WHERE church_id = 1;

SELECT 'FUNERAL RECORDS:' as table_name, COUNT(*) as count
FROM ssppoc_records_db.funeral_records 
WHERE church_id = 1;

-- 4. Check what church_id values actually exist in records
SELECT '=== ACTUAL CHURCH_ID VALUES IN RECORDS ===' as section;

SELECT 'BAPTISM:' as table_name, church_id, COUNT(*) as count
FROM ssppoc_records_db.baptism_records 
GROUP BY church_id;

SELECT 'MARRIAGE:' as table_name, church_id, COUNT(*) as count
FROM ssppoc_records_db.marriage_records 
GROUP BY church_id;

SELECT 'FUNERAL:' as table_name, church_id, COUNT(*) as count
FROM ssppoc_records_db.funeral_records 
GROUP BY church_id; 