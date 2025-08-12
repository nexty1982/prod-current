-- Quick Church ID Alignment Check
-- Run this to verify the church_id values are properly aligned

-- 1. Check Saints Peter and Paul church in orthodoxmetrics_db
SELECT 'CHURCH INFO:' as section, id as church_id, name, database_name 
FROM orthodoxmetrics_db.churches 
WHERE name LIKE '%Saints Peter%' OR name LIKE '%SSPPOC%';

-- 2. Check church_id values in the records database
SELECT 'MARRIAGE RECORDS:' as section, church_id, COUNT(*) as record_count
FROM ssppoc_records_db.marriage_records 
GROUP BY church_id;

SELECT 'BAPTISM RECORDS:' as section, church_id, COUNT(*) as record_count
FROM ssppoc_records_db.baptism_records 
GROUP BY church_id;

SELECT 'FUNERAL RECORDS:' as section, church_id, COUNT(*) as record_count
FROM ssppoc_records_db.funeral_records 
GROUP BY church_id;

-- 3. Sample records to verify data exists
SELECT 'SAMPLE MARRIAGE RECORD:' as section, id, church_id, fname_groom, lname_groom, fname_bride, lname_bride
FROM ssppoc_records_db.marriage_records 
LIMIT 1; 