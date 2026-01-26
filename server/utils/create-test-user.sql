-- Create a test user for login testing
-- Password: admin123 (hashed with bcrypt)

-- First, let's check if the user exists
SELECT 'Checking for existing test user...' as status;
SELECT id, email, role FROM users WHERE email = 'admin@orthodoxmetrics.com';

-- Create the test user if it doesn't exist
-- Note: This password hash is for 'admin123' with bcrypt salt rounds 10
INSERT IGNORE INTO users (
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    preferred_language, 
    is_active, 
    email_verified, 
    created_at, 
    updated_at
) VALUES (
    'admin@orthodoxmetrics.com',
    '$2b$10$K8gJVJUJ5BLYhPvwGJ6rr.9MKQHNvGI8tLGKJRULnXlzDfKvAjJu6',
    'Test',
    'Admin',
    'admin',
    'en',
    TRUE,
    TRUE,
    NOW(),
    NOW()
);

-- Verify the user was created
SELECT 'Test user created/verified:' as status;
SELECT id, email, first_name, last_name, role, is_active, email_verified, created_at 
FROM users WHERE email = 'admin@orthodoxmetrics.com';

-- Test user credentials:
-- Email: admin@orthodoxmetrics.com
-- Password: admin123
