-- Simple fix for landing page column issue
-- Since the column already exists, just ensure it has a proper default value

-- Update any NULL landing_page values to the default
UPDATE users SET landing_page = '/pages/welcome' WHERE landing_page IS NULL OR landing_page = '';

-- Verify the fix
SELECT COUNT(*) as users_with_landing_page FROM users WHERE landing_page IS NOT NULL AND landing_page != '';
SELECT COUNT(*) as users_with_null_landing_page FROM users WHERE landing_page IS NULL OR landing_page = '';

-- Show a sample of users with their landing pages
SELECT id, email, first_name, last_name, role, landing_page FROM users LIMIT 5;
