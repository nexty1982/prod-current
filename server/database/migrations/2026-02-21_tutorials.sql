-- Migration: Tutorial / Welcome system tables
-- Date: 2026-02-21

CREATE TABLE IF NOT EXISTS `orthodoxmetrics_db`.`tutorials` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `audience` ENUM('all','administrators','new_clients','existing_clients','priests','editors') NOT NULL DEFAULT 'all',
  `is_welcome` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'If 1, shown on first login',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_by` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_audience` (`audience`),
  INDEX `idx_is_active` (`is_active`),
  INDEX `idx_is_welcome` (`is_welcome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orthodoxmetrics_db`.`tutorial_steps` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tutorial_id` INT NOT NULL,
  `step_order` INT NOT NULL DEFAULT 0,
  `title` VARCHAR(255) NULL,
  `content` TEXT NOT NULL,
  `image_url` VARCHAR(500) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tutorial_id`) REFERENCES `orthodoxmetrics_db`.`tutorials`(`id`) ON DELETE CASCADE,
  INDEX `idx_tutorial_order` (`tutorial_id`, `step_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orthodoxmetrics_db`.`tutorial_dismissals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `tutorial_id` INT NOT NULL,
  `dismissed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_user_tutorial` (`user_id`, `tutorial_id`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default welcome tutorial
INSERT INTO `orthodoxmetrics_db`.`tutorials` (`title`, `audience`, `is_welcome`, `is_active`, `sort_order`, `created_by`)
VALUES ('Welcome to Orthodox Metrics', 'all', 1, 1, 0, 1);

SET @welcome_id = LAST_INSERT_ID();

INSERT INTO `orthodoxmetrics_db`.`tutorial_steps` (`tutorial_id`, `step_order`, `title`, `content`)
VALUES (@welcome_id, 0, 'Welcome', 'Welcome to Orthodox Metrics, the site where tradition meets digital without any variation or change to meaning and truth.');
