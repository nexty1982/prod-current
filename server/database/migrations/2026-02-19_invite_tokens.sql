-- Migration: Create invite_tokens table and add account_expires_at to users
-- Date: 2026-02-19

CREATE TABLE IF NOT EXISTS `orthodoxmetrics_db`.`invite_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `token` VARCHAR(128) NOT NULL UNIQUE,
  `email` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `church_id` INT NULL,
  `expires_at` DATETIME NOT NULL,
  `account_expires_at` DATETIME NOT NULL,
  `created_by` INT NOT NULL,
  `used_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_token` (`token`),
  INDEX `idx_email` (`email`),
  INDEX `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `orthodoxmetrics_db`.`users`
  ADD COLUMN IF NOT EXISTS `account_expires_at` DATETIME NULL DEFAULT NULL;
