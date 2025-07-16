-- Fix admin user passwords with correct hash
-- This will update existing admin users with the correct password hash for 'admin123'

-- Update all existing admin users with the correct password hash
UPDATE users 
SET password_hash = '$2b$12$gOk8ZWdkZiRStVuginpTN.uISR9ZQCJhiy5MEdvDbXVkUHBNp3lRm'
WHERE role IN ('admin', 'super_admin');

-- Create a working admin user with the correct hash
INSERT IGNORE INTO users (
    email, 
    first_name, 
    last_name, 
    password_hash, 
    role, 
    is_active,
    landing_page,
    created_at,
    updated_at
) VALUES (
    'testadmin@orthodoxmetrics.com',
    'Test',
    'Admin',
    '$2b$12$gOk8ZWdkZiRStVuginpTN.uISR9ZQCJhiy5MEdvDbXVkUHBNp3lRm',
    'admin',
    TRUE,
    '/admin/users',
    NOW(),
    NOW()
);

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
