-- Migration: Create prompt_workflows and prompt_workflow_steps tables
-- Purpose: Prompt 012 — Workflow-level planning, batch prompt generation, preloaded pipelines
-- Parent: 2026-03-30_add_scoring_confidence_chain.sql
-- Created: 2026-03-30

-- ─── Workflow Table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `prompt_workflows` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID primary key',
  `name` VARCHAR(300) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `component` VARCHAR(200) NOT NULL COMMENT 'Target system component',
  `status` ENUM('draft','approved','active','completed','cancelled') NOT NULL DEFAULT 'draft',
  `created_by` VARCHAR(100) NOT NULL,
  `approved_by` VARCHAR(100) DEFAULT NULL,
  `approved_at` TIMESTAMP NULL DEFAULT NULL,
  `activated_at` TIMESTAMP NULL DEFAULT NULL,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `step_count` INT NOT NULL DEFAULT 0 COMMENT 'Denormalized step count',
  `prompts_generated` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether batch generation has run',
  `generation_error` TEXT DEFAULT NULL COMMENT 'Error from last generation attempt',
  PRIMARY KEY (`id`),
  KEY `idx_workflow_status` (`status`),
  KEY `idx_workflow_component` (`component`),
  KEY `idx_workflow_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Workflow Steps Table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `prompt_workflow_steps` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID primary key',
  `workflow_id` CHAR(36) NOT NULL,
  `step_number` INT NOT NULL COMMENT '1-based step order',
  `title` VARCHAR(500) NOT NULL,
  `purpose` TEXT NOT NULL,
  `component` VARCHAR(200) NOT NULL COMMENT 'Component for the prompt (may differ from workflow)',
  `prompt_type` ENUM('plan','implementation','verification','correction','migration','docs') NOT NULL DEFAULT 'implementation',
  `expected_outcome` TEXT NOT NULL COMMENT 'What success looks like',
  `requirements_summary` TEXT DEFAULT NULL COMMENT 'Key requirements for prompt generation',
  `depends_on_step` INT DEFAULT NULL COMMENT 'Step number this depends on (NULL = previous step)',
  `prompt_id` CHAR(36) DEFAULT NULL COMMENT 'FK to generated prompt (NULL until generation)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_workflow_step` (`workflow_id`, `step_number`),
  KEY `idx_step_workflow` (`workflow_id`),
  KEY `idx_step_prompt` (`prompt_id`),
  CONSTRAINT `fk_step_workflow` FOREIGN KEY (`workflow_id`)
    REFERENCES `prompt_workflows` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_step_prompt` FOREIGN KEY (`prompt_id`)
    REFERENCES `om_prompt_registry` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Extend om_prompt_registry with workflow fields ───────────────────────

ALTER TABLE `om_prompt_registry`
  ADD COLUMN `workflow_id` CHAR(36) DEFAULT NULL
    COMMENT 'FK to prompt_workflows (NULL for standalone prompts)' AFTER `chain_step_number`,
  ADD COLUMN `workflow_step_number` INT DEFAULT NULL
    COMMENT 'Step number within the workflow' AFTER `workflow_id`;

ALTER TABLE `om_prompt_registry`
  ADD KEY `idx_registry_workflow` (`workflow_id`),
  ADD CONSTRAINT `fk_registry_workflow`
    FOREIGN KEY (`workflow_id`) REFERENCES `prompt_workflows` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

SELECT 'prompt_workflows, prompt_workflow_steps tables created; om_prompt_registry extended' AS message;
