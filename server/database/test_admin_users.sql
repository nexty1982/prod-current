-- Test admin user login
-- This script will show current admin users and verify their roles

-- Show all admin users with their details
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    password_hash IS NOT NULL as has_password
FROM users 
WHERE role IN ('admin', 'super_admin') 
ORDER BY created_at DESC;

-- Show user count by role
SELECT role, COUNT(*) as user_count 
FROM users 
GROUP BY role 
ORDER BY user_count DESC;
