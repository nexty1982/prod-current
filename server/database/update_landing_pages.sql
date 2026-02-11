-- Check for users without landing_page values
SELECT id, email, first_name, last_name, role, landing_page 
FROM users 
WHERE landing_page IS NULL OR landing_page = '';

-- Update any users without landing_page values
UPDATE users 
SET landing_page = CASE 
    WHEN role = 'admin' OR role = 'super_admin' THEN '/pages/admin/dashboard'
    WHEN role = 'manager' THEN '/pages/manager/dashboard'
    ELSE '/pages/welcome'
END
WHERE landing_page IS NULL OR landing_page = '';

-- Verify the update
SELECT 'After update:' as status;
SELECT id, email, first_name, last_name, role, landing_page 
FROM users 
WHERE landing_page IS NULL OR landing_page = '';

-- Show all users with their landing pages
SELECT 'All users with landing pages:' as status;
SELECT id, email, first_name, last_name, role, landing_page FROM users;
