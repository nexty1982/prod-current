-- Migration: Add quality scoring, confidence tracking, chain tracking, and escalation
-- Purpose: Prompt 007 — scoring engine, degradation detection, exception routing
-- Parent: 2026-03-30_harden_queue_state.sql
-- Created: 2026-03-30

-- ─── Quality Scoring ──────────────────────────────────────────────────────

ALTER TABLE `om_prompt_registry`
  ADD COLUMN `quality_score` INT DEFAULT NULL
    COMMENT 'Deterministic quality score 0-100, calculated from execution results' AFTER `overdue_since`,
  ADD COLUMN `confidence_level` ENUM('high','medium','low','unknown') NOT NULL DEFAULT 'unknown'
    COMMENT 'Derived from quality_score + trend + evaluator_status' AFTER `quality_score`,
  ADD COLUMN `violation_count` INT NOT NULL DEFAULT 0
    COMMENT 'Count of violations found during evaluation' AFTER `confidence_level`,
  ADD COLUMN `issue_count` INT NOT NULL DEFAULT 0
    COMMENT 'Count of issues found during evaluation' AFTER `violation_count`,
  ADD COLUMN `blocker_count` INT NOT NULL DEFAULT 0
    COMMENT 'Count of blockers found during evaluation' AFTER `issue_count`;

-- ─── Degradation & Escalation ─────────────────────────────────────────────

ALTER TABLE `om_prompt_registry`
  ADD COLUMN `degradation_flag` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Whether this prompt is part of a degrading chain' AFTER `blocker_count`,
  ADD COLUMN `escalation_required` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Whether manual intervention is required' AFTER `degradation_flag`,
  ADD COLUMN `escalation_reason` TEXT DEFAULT NULL
    COMMENT 'Explicit reason why escalation was triggered' AFTER `escalation_required`;

-- ─── Chain Tracking ───────────────────────────────────────────────────────

ALTER TABLE `om_prompt_registry`
  ADD COLUMN `chain_id` CHAR(36) DEFAULT NULL
    COMMENT 'UUID of the root prompt defining this chain' AFTER `escalation_reason`,
  ADD COLUMN `chain_step_number` INT DEFAULT NULL
    COMMENT 'Step number within the chain (1-based)' AFTER `chain_id`,
  ADD COLUMN `rolling_quality_score` FLOAT DEFAULT NULL
    COMMENT 'Moving average quality score across chain steps' AFTER `chain_step_number`,
  ADD COLUMN `previous_quality_score` INT DEFAULT NULL
    COMMENT 'Quality score of the previous step in chain' AFTER `rolling_quality_score`;

-- ─── Indexes ──────────────────────────────────────────────────────────────

ALTER TABLE `om_prompt_registry`
  ADD INDEX `idx_quality_score` (`quality_score`),
  ADD INDEX `idx_confidence_level` (`confidence_level`),
  ADD INDEX `idx_degradation_flag` (`degradation_flag`),
  ADD INDEX `idx_escalation_required` (`escalation_required`),
  ADD INDEX `idx_chain_id` (`chain_id`);

SELECT 'Scoring, confidence, chain tracking, and escalation columns added' AS message;
