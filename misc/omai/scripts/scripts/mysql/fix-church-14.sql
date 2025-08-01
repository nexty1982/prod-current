-- Fix Church 14 Database Configuration
-- Run this SQL script to set the missing database_name for Church 14

USE orthodoxmetrics_db;

-- Check current state
SELECT 
    id, 
    name, 
    database_name as current_database_name,
    email
FROM churches 
WHERE id = 14;

-- Update Church 14 with proper database_name
UPDATE churches 
SET database_name = 'saints_peter_and_paul_orthodox_church_records_db'
WHERE id = 14;

-- Verify the update
SELECT 
    id, 
    name, 
    database_name as updated_database_name,
    email
FROM churches 
WHERE id = 14;

-- Show all churches with missing database_name (if any)
SELECT 
    id, 
    name, 
    database_name
FROM churches 
WHERE database_name IS NULL OR database_name = ''; 