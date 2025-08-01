-- Simple Fix for Church 14 Database Configuration
-- This script sets the missing database_name for Church 14

USE orthodoxmetrics_db;

-- =============================================================================
-- 1. CHECK CURRENT STATE
-- =============================================================================

SELECT 'CURRENT CHURCH 14 STATE:' as section;
SELECT 
    id, 
    name, 
    database_name as current_database_name,
    email,
    is_active
FROM churches 
WHERE id = 14;

-- =============================================================================
-- 2. FIX THE DATABASE_NAME
-- =============================================================================

SELECT 'FIXING DATABASE_NAME...' as step;

-- Update Church 14 with proper database_name
UPDATE churches 
SET database_name = 'ssppoc_records_db'
WHERE id = 14;

-- =============================================================================
-- 3. VERIFY THE FIX
-- =============================================================================

SELECT 'VERIFICATION - UPDATED CHURCH 14:' as section;
SELECT 
    id, 
    name, 
    database_name as updated_database_name,
    email,
    is_active
FROM churches 
WHERE id = 14;

-- =============================================================================
-- 4. CHECK FOR OTHER CHURCHES WITHOUT DATABASE_NAME
-- =============================================================================

SELECT 'OTHER CHURCHES WITHOUT DATABASE_NAME:' as section;
SELECT 
    id, 
    name, 
    database_name,
    is_active
FROM churches 
WHERE (database_name IS NULL OR database_name = '') AND is_active = 1;

-- =============================================================================
-- 5. VERIFY DATABASE EXISTS
-- =============================================================================

SELECT 'VERIFYING DATABASE EXISTS:' as section;
SELECT 
    SCHEMA_NAME as database_name,
    'EXISTS' as status
FROM information_schema.SCHEMATA 
WHERE SCHEMA_NAME = 'ssppoc_records_db';

-- =============================================================================
-- COMPLETION
-- =============================================================================

SELECT '✅ CHURCH 14 DATABASE CONFIGURATION FIXED!' as status;
SELECT 'The "has no database_name configured" errors should now be resolved.' as message; 