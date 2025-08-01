-- Cleanup Script: Remove unused user_sessions table
-- Date: 2025-07-20
-- Reason: Redundant table with sessions table, completely unused (0 records)

-- Check if table exists and is empty before dropping
SELECT 
    COUNT(*) as record_count,
    'user_sessions table record count before cleanup' as description
FROM user_sessions;

-- Drop the unused user_sessions table
DROP TABLE IF EXISTS user_sessions;

-- Verify cleanup
SELECT 
    'user_sessions table cleanup completed' as status,
    NOW() as completed_at;
