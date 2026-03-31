-- Migration: Harden queue state — eliminate ambiguity, add block reasons and overdue tracking
-- Purpose: Prompt 006 — state truthfulness, deterministic queue, structured block reasons
-- Parent: 2026-03-30_add_queue_scheduling_fields.sql
-- Created: 2026-03-30

-- ─── Restructure queue_status ENUM ────────────────────────────────────────
-- Remove 'none' and 'queued' (ambiguous). Keep: scheduled, blocked, ready_for_release, released.
-- Add 'pending' for pre-approved prompts that aren't in the queue yet.
-- Add 'overdue' for past-window prompts.

ALTER TABLE `om_prompt_registry`
  MODIFY COLUMN `queue_status`
    ENUM('pending','scheduled','blocked','ready_for_release','released','overdue')
    NOT NULL DEFAULT 'pending'
    COMMENT 'Deterministic queue state — recalculated on every read';

-- ─── Fix existing data ────────────────────────────────────────────────────
-- Move 'none'/'queued' → 'pending' (handled by ENUM change — MariaDB maps unknown to default)

-- ─── Block Reasons ────────────────────────────────────────────────────────

ALTER TABLE `om_prompt_registry`
  ADD COLUMN `blocked_reasons` JSON DEFAULT NULL
    COMMENT 'Structured array of blocking reasons when queue_status=blocked' AFTER `last_release_attempt_at`;

-- ─── Overdue Tracking ─────────────────────────────────────────────────────

ALTER TABLE `om_prompt_registry`
  ADD COLUMN `overdue` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Whether this prompt has passed its scheduled time without release' AFTER `blocked_reasons`,
  ADD COLUMN `overdue_since` TIMESTAMP NULL DEFAULT NULL
    COMMENT 'When the prompt became overdue' AFTER `overdue`;

SELECT 'Queue state hardened: ENUM restructured, block reasons and overdue tracking added' AS message;
