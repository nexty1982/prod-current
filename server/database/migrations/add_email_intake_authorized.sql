-- Create church_users junction table (from 2024_add_church_advanced_config.sql, never run)
-- and add email_intake_authorized flag for per-church email intake authorization
-- Run date: 2026-02-26

CREATE TABLE IF NOT EXISTS `orthodoxmetrics_db`.`church_users` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT,
  user_id INT,
  role ENUM('priest', 'deacon', 'viewer', 'admin', 'church_admin', 'editor', 'manager', 'user'),
  FOREIGN KEY (church_id) REFERENCES churches(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uq_church_user (church_id, user_id)
);

-- Add email intake authorization flag
ALTER TABLE `orthodoxmetrics_db`.`church_users`
  ADD COLUMN `email_intake_authorized` TINYINT(1) NOT NULL DEFAULT 0 AFTER `role`;

CREATE INDEX idx_email_intake ON `orthodoxmetrics_db`.`church_users` (email_intake_authorized);

-- Seed from existing user->church assignments
INSERT IGNORE INTO `orthodoxmetrics_db`.`church_users` (church_id, user_id, role)
SELECT u.church_id, u.id, u.role
FROM `orthodoxmetrics_db`.`users` u
WHERE u.church_id IS NOT NULL AND u.is_active = 1;

-- Add 'query' to email_submissions record_type enum if not already present
ALTER TABLE `orthodoxmetrics_db`.`email_submissions`
  MODIFY COLUMN `record_type` ENUM('baptism','marriage','funeral','query','unknown') DEFAULT 'unknown';
