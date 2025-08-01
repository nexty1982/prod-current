-- Final verification of church records fix
-- Run this after restarting the server

-- 1. Check church configuration
SELECT 'CHURCH CONFIG:' as status, id, name, database_name 
FROM orthodoxmetrics_db.churches 
WHERE name LIKE '%Saints Peter%' OR name LIKE '%SSPPOC%'
LIMIT 1;

-- 2. Check record counts by church_id
SELECT 'MARRIAGE RECORDS:' as status, church_id, COUNT(*) as count
FROM ssppoc_records_db.marriage_records 
GROUP BY church_id;

-- 3. If church ID mismatch, run this update:
-- UPDATE orthodoxmetrics_db.churches SET id = 11 WHERE id = 14;
-- OR
-- UPDATE ssppoc_records_db.marriage_records SET church_id = 14 WHERE church_id = 11;

-- 4. Test query that the API will now run:
SELECT 'API TEST QUERY:' as status, COUNT(*) as records_found
FROM ssppoc_records_db.marriage_records 
WHERE church_id = (
    SELECT id FROM orthodoxmetrics_db.churches 
    WHERE name LIKE '%Saints Peter%' 
    LIMIT 1
); 