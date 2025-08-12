-- Create admin user script
-- This will create an admin user if one doesn't exist

-- First, let's check if the admin user exists
SELECT * FROM users WHERE email = 'admin@orthodoxmetrics.com' OR role = 'admin' OR role = 'super_admin';

-- If no admin user exists, create one
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
    'admin@orthodoxmetrics.com',
    'Admin',
    'User',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG.QVuQhWm',
    'super_admin',
    TRUE,
    '/admin/users',
    NOW(),
    NOW()
);

-- Also create a backup admin user
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
    'superadmin@orthodoxmetrics.com',
    'Super',
    'Admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG.QVuQhWm',
    'super_admin',
    TRUE,
    '/admin/users',
    NOW(),
    NOW()
);

-- Show all admin users
SELECT id, email, first_name, last_name, role, is_active, created_at FROM users WHERE role IN ('admin', 'super_admin');
