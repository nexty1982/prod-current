-- Run this SQL manually in your MySQL database to fix the users table
-- Connect to your database: mysql -u ssppoc_user -p ssppoc_records_db

-- Check current table structure
DESCRIBE users;

-- Add role column if it doesn't exist
ALTER TABLE users 
ADD COLUMN role ENUM('admin', 'supervisor', 'priest', 'volunteer', 'viewer') DEFAULT 'admin' AFTER email;

-- Add landing_page column if it doesn't exist  
ALTER TABLE users 
ADD COLUMN landing_page VARCHAR(255) DEFAULT '/pages/welcome' AFTER role;

-- Update existing users to have admin role
UPDATE users SET role = 'admin' WHERE role IS NULL OR role = '';

-- Check the updated structure
DESCRIBE users;

-- Verify users have roles
SELECT id, email, username, role, landing_page FROM users;
