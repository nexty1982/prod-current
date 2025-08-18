-- Users table schema fix
-- This file adds missing columns to the existing users table

-- Add missing columns if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role ENUM('super_admin', 'admin', 'manager', 'user', 'viewer') DEFAULT 'user' AFTER email;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS landing_page VARCHAR(255) DEFAULT '/pages/welcome' AFTER role;

-- Update existing users to have admin role if they don't have one
UPDATE users SET role = 'admin' WHERE role IS NULL OR role = '';

-- Optional: Create the users table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  preferred_language CHAR(2) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  role ENUM('super_admin', 'admin', 'manager', 'user', 'viewer') DEFAULT 'user',
  landing_page VARCHAR(255) DEFAULT '/pages/welcome',
  church_id INT,
  is_active TINYINT(1) DEFAULT 1,
  email_verified TINYINT(1) DEFAULT 0,
  last_login TIMESTAMP NULL,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_church_id (church_id),
  INDEX idx_preferred_language (preferred_language)
);

-- Insert default admin user if no users exist
INSERT IGNORE INTO users (email, first_name, last_name, password_hash, role, landing_page) 
VALUES ('admin@orthodoxmetrics.com', 'Admin', 'User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG.QVuQhWm', 'admin', '/pages/admin/dashboard');
-- Default password is 'admin123'
