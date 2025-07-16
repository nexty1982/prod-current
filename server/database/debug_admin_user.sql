-- Debug admin user script
-- Check the actual user data to troubleshoot the 403 error

-- First, show the users table structure
DESCRIBE users;

-- Check if admin user exists and what role it has
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
WHERE email = 'admin@orthodoxmetrics.com';

-- Check all users with admin-like roles
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at
FROM users 
WHERE role IN ('admin', 'super_admin') 
   OR email LIKE '%admin%';

-- Check if there are any users at all
SELECT COUNT(*) as total_users FROM users;

-- Show all possible role values
SELECT DISTINCT role FROM users WHERE role IS NOT NULL;
