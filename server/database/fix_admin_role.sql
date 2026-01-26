-- Create a simple admin user with 'admin' role
-- This should fix the 403 permission issue

-- Create admin user with 'admin' role
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
    'admin@admin.com',
    'Admin',
    'User',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG.QVuQhWm',
    'admin',
    TRUE,
    '/admin/users',
    NOW(),
    NOW()
);

-- Update the existing admin user to have 'admin' role instead of 'super_admin'
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@orthodoxmetrics.com';

-- Show all admin users
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
ORDER BY created_at;
