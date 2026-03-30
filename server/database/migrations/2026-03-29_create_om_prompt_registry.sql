-- Migration: Create om_prompt_registry table
-- Purpose: Structured, sequential prompt execution system with audit and verification layers
-- Created: 2026-03-29

CREATE TABLE IF NOT EXISTS `om_prompt_registry` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID primary key',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` VARCHAR(100) NOT NULL COMMENT 'User or agent that created the prompt',
  `title` VARCHAR(500) NOT NULL,
  `purpose` TEXT NOT NULL,
  `component` VARCHAR(200) NOT NULL COMMENT 'System component this prompt targets',
  `parent_prompt_id` CHAR(36) DEFAULT NULL COMMENT 'FK to parent prompt for grouping sequences',
  `sequence_order` INT NOT NULL DEFAULT 0 COMMENT 'Execution order within parent scope',
  `status` ENUM('draft','ready','approved','executing','complete','verified','rejected') NOT NULL DEFAULT 'draft',
  `prompt_text` LONGTEXT NOT NULL,
  `guardrails_applied` TINYINT(1) NOT NULL DEFAULT 0,
  `execution_result` LONGTEXT DEFAULT NULL,
  `verification_result` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_registry_status_sequence` (`status`, `sequence_order`),
  KEY `idx_registry_parent` (`parent_prompt_id`),
  KEY `idx_registry_component` (`component`),
  KEY `idx_registry_created_by` (`created_by`),
  CONSTRAINT `uq_sequence_per_parent` UNIQUE (`parent_prompt_id`, `sequence_order`),
  CONSTRAINT `fk_registry_parent` FOREIGN KEY (`parent_prompt_id`)
    REFERENCES `om_prompt_registry` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'om_prompt_registry table created successfully' AS message;
