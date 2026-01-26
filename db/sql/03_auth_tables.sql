-- Phase 3: Auth Tables for orthodoxmetrics_db
-- This script is idempotent - safe to run multiple times

USE orthodoxmetrics_db;

-- Create users table if not exists
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `username` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `role` enum('super_admin','admin','moderator','user','viewer') DEFAULT 'user',
  `church_id` int(11) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `preferred_language` varchar(10) DEFAULT 'en',
  `is_active` tinyint(1) DEFAULT 1,
  `is_locked` tinyint(1) DEFAULT 0,
  `email_verified` tinyint(1) DEFAULT 0,
  `locked_at` datetime DEFAULT NULL,
  `locked_by` int(11) DEFAULT NULL,
  `lockout_reason` text DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_church_id` (`church_id`),
  KEY `idx_role` (`role`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create refresh_tokens table for JWT refresh token storage
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` datetime DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_revoked_at` (`revoked_at`),
  CONSTRAINT `fk_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create password_resets table
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_password_resets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Update sessions table if it exists (add user_id foreign key if missing)
-- First check if the column exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
  AND TABLE_NAME = 'sessions' 
  AND COLUMN_NAME = 'user_id';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE sessions ADD COLUMN user_id INT(11) DEFAULT NULL, ADD KEY idx_user_id (user_id)',
  'SELECT "user_id column already exists in sessions table" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migrate data from _users_legacy if it exists and users table is empty
INSERT INTO users (
  email, password_hash, first_name, last_name, 
  role, church_id, phone, preferred_language, is_active, 
  email_verified, last_login, created_at, updated_at
)
SELECT 
  email, password_hash, first_name, last_name,
  CASE 
    WHEN role = 'superadmin' THEN 'super_admin'
    WHEN role = 'church_admin' THEN 'admin'
    WHEN role = 'editor' THEN 'moderator'
    WHEN role = 'viewer' THEN 'viewer'
    ELSE 'user'
  END as role,
  church_id, phone, 
  COALESCE(preferred_language, 'en'), 
  COALESCE(is_active, 1),
  COALESCE(email_verified, 0),
  last_login, created_at, updated_at
FROM _users_legacy
WHERE NOT EXISTS (SELECT 1 FROM users WHERE users.email = _users_legacy.email)
  AND (SELECT COUNT(*) FROM users) = 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email_password ON users(email, password_hash);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Grant permissions to app user (if exists)
GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.users TO 'orthodoxapps'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.refresh_tokens TO 'orthodoxapps'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.password_resets TO 'orthodoxapps'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.sessions TO 'orthodoxapps'@'localhost';

-- Output confirmation
SELECT 'Auth tables created/verified successfully' AS status;
SELECT COUNT(*) as user_count FROM users;
