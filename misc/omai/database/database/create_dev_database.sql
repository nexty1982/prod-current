-- ============================================
-- OrthodMetrics Development Database Setup
-- ============================================
-- Created: July 31, 2025
-- Purpose: Clean development database without OCR components
-- Target DB: orthodmetrics_dev

USE orthodmetrics_dev;

-- Drop tables if they exist (for clean setup)
SET FOREIGN_KEY_CHECKS = 0;

-- Core user management tables
DROP TABLE IF EXISTS `user_sessions`;
DROP TABLE IF EXISTS `user_permissions`;
DROP TABLE IF EXISTS `user_roles`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `permissions`;

-- Church and client tables
DROP TABLE IF EXISTS `baptism_records`;
DROP TABLE IF EXISTS `marriage_records`;
DROP TABLE IF EXISTS `funeral_records`;
DROP TABLE IF EXISTS `clients`;
DROP TABLE IF EXISTS `churches`;
DROP TABLE IF EXISTS `locations`;

-- System tables
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `menu_items`;
DROP TABLE IF EXISTS `global_templates`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- CORE TABLES CREATION
-- ============================================

-- Roles table
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Permissions table
CREATE TABLE `permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `module` varchar(50),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Users table
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(50),
  `last_name` varchar(50),
  `role_id` int(11),
  `church_id` int(11),
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  KEY `church_id` (`church_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Locations table
CREATE TABLE `locations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `address` text,
  `city` varchar(50),
  `state` varchar(50),
  `country` varchar(50) DEFAULT 'USA',
  `zip_code` varchar(20),
  `phone` varchar(20),
  `email` varchar(100),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Churches table
CREATE TABLE `churches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `location_id` int(11),
  `denomination` varchar(50) DEFAULT 'Orthodox',
  `established_date` date,
  `website` varchar(255),
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `churches_ibfk_1` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Clients table (for multi-tenant support)
CREATE TABLE `clients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `church_id` int(11),
  `database_name` varchar(100),
  `subdomain` varchar(50),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `church_id` (`church_id`),
  CONSTRAINT `clients_ibfk_1` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Baptism records table
CREATE TABLE `baptism_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `baptism_date` date NOT NULL,
  `priest_name` varchar(100),
  `sponsor_name` varchar(100),
  `birth_date` date,
  `birth_place` varchar(100),
  `parents_names` varchar(200),
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `church_id` (`church_id`),
  KEY `baptism_date` (`baptism_date`),
  CONSTRAINT `baptism_records_ibfk_1` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Marriage records table
CREATE TABLE `marriage_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `groom_first_name` varchar(50) NOT NULL,
  `groom_last_name` varchar(50) NOT NULL,
  `bride_first_name` varchar(50) NOT NULL,
  `bride_last_name` varchar(50) NOT NULL,
  `marriage_date` date NOT NULL,
  `priest_name` varchar(100),
  `witness1_name` varchar(100),
  `witness2_name` varchar(100),
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `church_id` (`church_id`),
  KEY `marriage_date` (`marriage_date`),
  CONSTRAINT `marriage_records_ibfk_1` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Funeral records table
CREATE TABLE `funeral_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `church_id` int(11) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `death_date` date NOT NULL,
  `funeral_date` date,
  `priest_name` varchar(100),
  `birth_date` date,
  `cause_of_death` varchar(200),
  `burial_location` varchar(100),
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `church_id` (`church_id`),
  KEY `death_date` (`death_date`),
  CONSTRAINT `funeral_records_ibfk_1` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Settings table
CREATE TABLE `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key_name` varchar(100) NOT NULL,
  `value` text,
  `description` text,
  `type` enum('string','number','boolean','json') DEFAULT 'string',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_name` (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit logs table
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11),
  `action` varchar(100) NOT NULL,
  `table_name` varchar(50),
  `record_id` int(11),
  `old_values` json,
  `new_values` json,
  `ip_address` varchar(45),
  `user_agent` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `table_name` (`table_name`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User sessions table
CREATE TABLE `user_sessions` (
  `id` varchar(128) NOT NULL,
  `user_id` int(11),
  `expires` int(11) NOT NULL,
  `data` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `expires` (`expires`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Menu items table
CREATE TABLE `menu_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL,
  `url` varchar(255),
  `icon` varchar(50),
  `parent_id` int(11),
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `required_role` varchar(50),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `parent_id` (`parent_id`),
  KEY `sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Global templates table
CREATE TABLE `global_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `content` longtext,
  `metadata` json,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SAMPLE DATA INSERTION
-- ============================================

-- Insert roles
INSERT INTO `roles` (`name`, `description`) VALUES
('super_admin', 'System super administrator with full access'),
('admin', 'Church administrator'),
('priest', 'Church priest with record management access'),
('viewer', 'Read-only access to records');

-- Insert permissions
INSERT INTO `permissions` (`name`, `description`, `module`) VALUES
('users.create', 'Create new users', 'users'),
('users.read', 'View user information', 'users'),
('users.update', 'Update user information', 'users'),
('users.delete', 'Delete users', 'users'),
('records.create', 'Create new records', 'records'),
('records.read', 'View records', 'records'),
('records.update', 'Update records', 'records'),
('records.delete', 'Delete records', 'records'),
('churches.manage', 'Manage church settings', 'churches'),
('system.admin', 'System administration', 'system');

-- Insert sample location
INSERT INTO `locations` (`name`, `address`, `city`, `state`, `country`, `zip_code`, `phone`, `email`) VALUES
('St. Nicholas Orthodox Church', '123 Orthodox Lane', 'Dev City', 'Dev State', 'USA', '12345', '555-0123', 'info@stnicholasdev.org');

-- Insert sample church
INSERT INTO `churches` (`name`, `location_id`, `denomination`, `established_date`, `website`, `status`) VALUES
('St. Nicholas Orthodox Church - Dev', 1, 'Orthodox', '2020-01-01', 'https://stnicholasdev.org', 'active');

-- Insert sample user (password is 'devpassword123' hashed with bcrypt)
INSERT INTO `users` (`username`, `email`, `password_hash`, `first_name`, `last_name`, `role_id`, `church_id`, `is_active`) VALUES
('devadmin', 'admin@devchurch.org', '$2b$10$K7L/VnrYXyJQKsTqxNTLpO.xR7YK8BxOpE1j8XVJ5xIgJv6jKx6hG', 'Dev', 'Admin', 1, 1, 1),
('devpriest', 'priest@devchurch.org', '$2b$10$K7L/VnrYXyJQKsTqxNTLpO.xR7YK8BxOpE1j8XVJ5xIgJv6jKx6hG', 'Father', 'Dev', 3, 1, 1);

-- Insert sample client
INSERT INTO `clients` (`name`, `church_id`, `database_name`, `subdomain`, `is_active`) VALUES
('St. Nicholas Development', 1, 'orthodmetrics_dev', 'devchurch', 1);

-- Insert sample baptism records
INSERT INTO `baptism_records` (`church_id`, `first_name`, `last_name`, `baptism_date`, `priest_name`, `sponsor_name`, `birth_date`, `birth_place`, `parents_names`) VALUES
(1, 'John', 'DevSample', '2024-01-15', 'Father Dev', 'Sponsor One', '2023-06-01', 'Dev City', 'DevParent1 and DevParent2'),
(1, 'Mary', 'DevTest', '2024-02-20', 'Father Dev', 'Sponsor Two', '2023-08-15', 'Dev City', 'TestParent1 and TestParent2');

-- Insert sample marriage record
INSERT INTO `marriage_records` (`church_id`, `groom_first_name`, `groom_last_name`, `bride_first_name`, `bride_last_name`, `marriage_date`, `priest_name`, `witness1_name`, `witness2_name`) VALUES
(1, 'Michael', 'DevGroom', 'Sarah', 'DevBride', '2024-05-12', 'Father Dev', 'Witness One', 'Witness Two');

-- Insert sample funeral record
INSERT INTO `funeral_records` (`church_id`, `first_name`, `last_name`, `death_date`, `funeral_date`, `priest_name`, `birth_date`, `burial_location`) VALUES
(1, 'Elder', 'DevMemory', '2024-03-10', '2024-03-13', 'Father Dev', '1940-01-01', 'Dev Cemetery');

-- Insert sample settings
INSERT INTO `settings` (`key_name`, `value`, `description`, `type`) VALUES
('app.name', 'OrthodMetrics Dev', 'Application name for development', 'string'),
('app.environment', 'development', 'Current environment', 'string'),
('church.default_timezone', 'America/New_York', 'Default timezone for the church', 'string'),
('features.ocr_enabled', 'false', 'OCR functionality disabled in dev', 'boolean'),
('maintenance.mode', 'false', 'Maintenance mode flag', 'boolean');

-- Insert sample menu items
INSERT INTO `menu_items` (`title`, `url`, `icon`, `parent_id`, `sort_order`, `required_role`) VALUES
('Dashboard', '/dashboard', 'dashboard', NULL, 1, 'viewer'),
('Records', '/records', 'book', NULL, 2, 'priest'),
('Baptisms', '/records/baptisms', 'water', 2, 1, 'priest'),
('Marriages', '/records/marriages', 'rings', 2, 2, 'priest'),
('Funerals', '/records/funerals', 'cross', 2, 3, 'priest'),
('Administration', '/admin', 'settings', NULL, 3, 'admin'),
('Users', '/admin/users', 'users', 6, 1, 'admin'),
('Churches', '/admin/churches', 'church', 6, 2, 'admin');

-- Add foreign key constraints for users table
ALTER TABLE `users` ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
ALTER TABLE `users` ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Performance indexes
CREATE INDEX `idx_users_email` ON `users` (`email`);
CREATE INDEX `idx_users_active` ON `users` (`is_active`);
CREATE INDEX `idx_baptism_names` ON `baptism_records` (`first_name`, `last_name`);
CREATE INDEX `idx_marriage_names` ON `marriage_records` (`groom_last_name`, `bride_last_name`);
CREATE INDEX `idx_funeral_names` ON `funeral_records` (`first_name`, `last_name`);
CREATE INDEX `idx_settings_key` ON `settings` (`key_name`);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

SELECT 'OrthodMetrics Development Database Setup Complete!' as Status,
       COUNT(*) as TotalTables
FROM information_schema.tables 
WHERE table_schema = 'orthodmetrics_dev' 
  AND table_type = 'BASE TABLE';

-- Show sample data counts
SELECT 'Sample Data Summary' as Info;
SELECT 'Roles' as TableName, COUNT(*) as RecordCount FROM roles
UNION ALL
SELECT 'Users' as TableName, COUNT(*) as RecordCount FROM users
UNION ALL
SELECT 'Churches' as TableName, COUNT(*) as RecordCount FROM churches
UNION ALL
SELECT 'Baptism Records' as TableName, COUNT(*) as RecordCount FROM baptism_records
UNION ALL
SELECT 'Marriage Records' as TableName, COUNT(*) as RecordCount FROM marriage_records
UNION ALL
SELECT 'Funeral Records' as TableName, COUNT(*) as RecordCount FROM funeral_records;
