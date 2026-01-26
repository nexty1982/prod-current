-- Rename old users table to _users_legacy
USE orthodoxmetrics_db;

-- Check if users table exists and rename it
RENAME TABLE users TO _users_legacy;

-- Add comment to indicate this is legacy
ALTER TABLE _users_legacy COMMENT = 'Legacy users table - replaced by orthodoxmetrics_db.users';

SHOW TABLES LIKE '%users%';
