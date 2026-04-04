-- =============================================================================
-- Migration: Consolidate om_daily_items.status to canonical 8-status SDLC model
-- Date: 2026-04-04
--
-- Canonical statuses: backlog, in_progress, self_review, review, staging, done, blocked, cancelled
-- Removes: draft, triaged, planned, scheduled, testing, review_ready, approved
-- =============================================================================

-- ─── 1. Migrate non-canonical status values to canonical equivalents ─────────

UPDATE om_daily_items SET status = 'backlog'     WHERE status IN ('draft', 'triaged', 'planned', 'scheduled');
UPDATE om_daily_items SET status = 'self_review'  WHERE status = 'testing';
UPDATE om_daily_items SET status = 'review'       WHERE status = 'review_ready';
UPDATE om_daily_items SET status = 'staging'      WHERE status = 'approved';

-- ─── 2. Shrink ENUM to canonical 8 values ────────────────────────────────────

ALTER TABLE om_daily_items
  MODIFY COLUMN `status` ENUM(
    'backlog', 'in_progress', 'self_review',
    'review', 'staging', 'done',
    'blocked', 'cancelled'
  ) NOT NULL DEFAULT 'backlog';
