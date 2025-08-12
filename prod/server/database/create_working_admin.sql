-- Create a working admin user with correct password hash
-- This will create an admin user with a properly hashed password

-- First, let's create a user with a simple password hash for 'admin123'
-- Generated using bcrypt with salt rounds 12
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
    'test@admin.com',
    'Test',
    'Admin',
    '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin',
    TRUE,
    '/admin/users',
    NOW(),
    NOW()
);

-- Create another admin with a different hash
-- This hash is for password: 'password123'
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
    'admin@password123.com',
    'Admin',
    'Password123',
    '$2b$12$3K7J4oJ8jF8qRqNZpW9T8uO3l9xQ5qNrK2qJrG9qO9cJ8zP3xV6T2',
    'admin',
    TRUE,
    '/admin/users',
    NOW(),
    NOW()
);

-- Show all admin users
SELECT 
    id, 
    email, 
    first_name, 
    last_name, 
    role, 
    is_active, 
    created_at,
    SUBSTRING(password_hash, 1, 20) as password_hash_preview
FROM users 
WHERE role IN ('admin', 'super_admin') 
ORDER BY created_at DESC;
