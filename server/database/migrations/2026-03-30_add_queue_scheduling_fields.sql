-- Migration: Add queueing, scheduling, and release planning fields to om_prompt_registry
-- Purpose: Prompt 005 — queue management, scheduled release, dependency-aware execution
-- Parent: 2026-03-30_add_evaluation_generation_fields.sql
-- Created: 2026-03-30

-- ─── Scheduling Fields ────────────────────────────────────────────────────

ALTER TABLE `om_prompt_registry`
  ADD COLUMN `scheduled_at` TIMESTAMP NULL DEFAULT NULL
    COMMENT 'When this prompt is scheduled for execution' AFTER `evaluated_by`,
  ADD COLUMN `release_window_start` TIMESTAMP NULL DEFAULT NULL
    COMMENT 'Earliest time this prompt can be released' AFTER `scheduled_at`,
  ADD COLUMN `release_window_end` TIMESTAMP NULL DEFAULT NULL
    COMMENT 'Latest time this prompt should be released (overdue after this)' AFTER `release_window_start`;

-- ─── Queue and Priority Fields ────────────────────────────────────────────

ALTER TABLE `om_prompt_registry`
  ADD COLUMN `priority` ENUM('low','normal','high','critical')
    NOT NULL DEFAULT 'normal'
    COMMENT 'Execution priority for queue ordering' AFTER `release_window_end`,
  ADD COLUMN `queue_status` ENUM('none','queued','scheduled','ready_for_release','blocked','released')
    NOT NULL DEFAULT 'none'
    COMMENT 'Current position in the release queue' AFTER `priority`;

-- ─── Dependency Fields ────────────────────────────────────────────────────

ALTER TABLE `om_prompt_registry`
  ADD COLUMN `dependency_type` ENUM('sequence','explicit','none')
    NOT NULL DEFAULT 'sequence'
    COMMENT 'How dependencies are resolved: sequence order, explicit prompt, or none' AFTER `queue_status`,
  ADD COLUMN `depends_on_prompt_id` CHAR(36) DEFAULT NULL
    COMMENT 'Explicit dependency — this prompt cannot execute until the referenced prompt is verified' AFTER `dependency_type`;

-- ─── Release Mode Field ───────────────────────────────────────────────────

ALTER TABLE `om_prompt_registry`
  ADD COLUMN `release_mode` ENUM('manual','auto_safe','auto_full')
    NOT NULL DEFAULT 'manual'
    COMMENT 'How this prompt gets released: manual action, auto with safety checks, or auto with minimal checks' AFTER `depends_on_prompt_id`,
  ADD COLUMN `last_release_attempt_at` TIMESTAMP NULL DEFAULT NULL
    COMMENT 'When the last release eligibility check was performed' AFTER `release_mode`;

-- ─── Indexes ──────────────────────────────────────────────────────────────

ALTER TABLE `om_prompt_registry`
  ADD KEY `idx_registry_scheduled_at` (`scheduled_at`),
  ADD KEY `idx_registry_queue_status` (`queue_status`),
  ADD KEY `idx_registry_priority` (`priority`),
  ADD KEY `idx_registry_depends_on` (`depends_on_prompt_id`);

-- ─── Foreign Key ──────────────────────────────────────────────────────────
-- Explicit dependency FK: depends_on_prompt_id points to another row in the same table

ALTER TABLE `om_prompt_registry`
  ADD CONSTRAINT `fk_registry_depends_on`
    FOREIGN KEY (`depends_on_prompt_id`) REFERENCES `om_prompt_registry` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

SELECT 'Queue, scheduling, and release planning fields added to om_prompt_registry' AS message;
