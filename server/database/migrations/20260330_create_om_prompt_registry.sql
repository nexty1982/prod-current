-- Migration: Create om_prompt_registry table
-- Required by: Prompt Registry admin page, workflow services, auto-execution engine

CREATE TABLE IF NOT EXISTS `om_prompt_registry` (
  `id` VARCHAR(64) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` VARCHAR(128) DEFAULT NULL,

  -- Core fields
  `title` VARCHAR(255) NOT NULL DEFAULT '',
  `purpose` TEXT,
  `component` VARCHAR(128) DEFAULT NULL,
  `parent_prompt_id` VARCHAR(64) DEFAULT NULL,
  `sequence_order` INT NOT NULL DEFAULT 0,
  `status` ENUM('draft','audited','ready','approved','executing','complete','verified','rejected') NOT NULL DEFAULT 'draft',
  `prompt_text` LONGTEXT,
  `guardrails_applied` TINYINT(1) NOT NULL DEFAULT 1,

  -- Execution results
  `execution_result` LONGTEXT,
  `verification_result` LONGTEXT,

  -- Audit fields
  `audit_status` ENUM('pending','pass','fail') NOT NULL DEFAULT 'pending',
  `audit_result` TEXT,
  `audit_notes` TEXT,
  `audited_at` DATETIME DEFAULT NULL,
  `audited_by` VARCHAR(128) DEFAULT NULL,

  -- Evaluation fields
  `result_type` VARCHAR(64) DEFAULT NULL,
  `completion_status` VARCHAR(64) DEFAULT NULL,
  `evaluator_status` ENUM('pending','pass','fail') DEFAULT NULL,
  `evaluator_notes` TEXT,
  `issues_found` TEXT,
  `blockers_found` TEXT,
  `violations_found` TEXT,
  `completed_outcomes` TEXT,
  `remaining_outcomes` TEXT,
  `changed_files` TEXT,
  `evaluated_at` DATETIME DEFAULT NULL,
  `evaluated_by` VARCHAR(128) DEFAULT NULL,

  -- Generation / linking
  `next_prompt_id` VARCHAR(64) DEFAULT NULL,
  `auto_generated` TINYINT(1) NOT NULL DEFAULT 0,
  `generated_from_evaluation` TINYINT(1) NOT NULL DEFAULT 0,
  `released_for_execution` TINYINT(1) NOT NULL DEFAULT 0,

  -- Queue & scheduling
  `scheduled_at` DATETIME DEFAULT NULL,
  `release_window_start` DATETIME DEFAULT NULL,
  `release_window_end` DATETIME DEFAULT NULL,
  `priority` ENUM('low','normal','high','critical') NOT NULL DEFAULT 'normal',
  `queue_status` ENUM('pending','scheduled','blocked','ready_for_release','released','overdue') NOT NULL DEFAULT 'pending',
  `dependency_type` VARCHAR(32) NOT NULL DEFAULT 'none',
  `depends_on_prompt_id` VARCHAR(64) DEFAULT NULL,
  `release_mode` ENUM('manual','auto_safe','auto_full') NOT NULL DEFAULT 'manual',
  `last_release_attempt_at` DATETIME DEFAULT NULL,
  `blocked_reasons` TEXT,
  `overdue` TINYINT(1) NOT NULL DEFAULT 0,
  `overdue_since` DATETIME DEFAULT NULL,
  `manual_only` TINYINT(1) NOT NULL DEFAULT 0,

  -- Scoring fields
  `quality_score` DECIMAL(5,2) DEFAULT NULL,
  `confidence_level` ENUM('high','medium','low','unknown') NOT NULL DEFAULT 'unknown',
  `violation_count` INT NOT NULL DEFAULT 0,
  `issue_count` INT NOT NULL DEFAULT 0,
  `blocker_count` INT NOT NULL DEFAULT 0,
  `degradation_flag` TINYINT(1) NOT NULL DEFAULT 0,
  `escalation_required` TINYINT(1) NOT NULL DEFAULT 0,
  `escalation_reason` TEXT,
  `chain_id` VARCHAR(64) DEFAULT NULL,
  `chain_step_number` INT DEFAULT NULL,
  `rolling_quality_score` DECIMAL(5,2) DEFAULT NULL,
  `previous_quality_score` DECIMAL(5,2) DEFAULT NULL,

  -- Workflow linkage
  `workflow_id` VARCHAR(64) DEFAULT NULL,
  `workflow_step_number` INT DEFAULT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_queue_status` (`queue_status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_workflow` (`workflow_id`, `workflow_step_number`),
  KEY `idx_parent` (`parent_prompt_id`),
  KEY `idx_depends` (`depends_on_prompt_id`),
  KEY `idx_chain` (`chain_id`, `chain_step_number`),
  KEY `idx_created` (`created_at`),
  KEY `idx_component` (`component`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
