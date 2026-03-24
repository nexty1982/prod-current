-- =============================================================================
-- SDLC Pipeline Foundation Migration
-- Date: 2026-03-24
-- Purpose: Extend om_daily_items for canonical 12-status SDLC, add event
--          tracking, artifacts, bug discovery, repo snapshots, schedule blocks
-- =============================================================================

-- ─── 1. Extend om_daily_items ────────────────────────────────────────────────

-- Expand status ENUM to canonical 12 statuses
ALTER TABLE om_daily_items
  MODIFY COLUMN `status` ENUM(
    'backlog','triaged','planned','scheduled',
    'in_progress','self_review','testing',
    'review_ready','approved','done',
    'blocked','cancelled'
  ) NOT NULL DEFAULT 'backlog';

-- Map existing 'todo' → 'backlog', 'review' → 'self_review'
-- (run BEFORE the ENUM change removes old values)
-- Note: MariaDB allows updating after ENUM change if old values still readable

-- Add new columns for SDLC pipeline
ALTER TABLE om_daily_items
  ADD COLUMN `repo_target` ENUM('omai','orthodoxmetrics') DEFAULT 'orthodoxmetrics' AFTER `branch_type`,
  ADD COLUMN `assigned_agent` VARCHAR(50) DEFAULT NULL AFTER `assigned_to`,
  ADD COLUMN `schedule_start` DATETIME DEFAULT NULL AFTER `completed_at`,
  ADD COLUMN `schedule_end` DATETIME DEFAULT NULL AFTER `schedule_start`,
  ADD COLUMN `acceptance_criteria` TEXT DEFAULT NULL AFTER `description`,
  ADD COLUMN `blocked_reason` TEXT DEFAULT NULL AFTER `acceptance_criteria`,
  ADD COLUMN `parent_item_id` INT DEFAULT NULL AFTER `id`,
  ADD COLUMN `spawned_from_id` INT DEFAULT NULL AFTER `parent_item_id`,
  ADD INDEX `idx_repo_target` (`repo_target`),
  ADD INDEX `idx_assigned_agent` (`assigned_agent`),
  ADD INDEX `idx_schedule_start` (`schedule_start`);

-- Expand agent_tool ENUM to include github_copilot
ALTER TABLE om_daily_items
  MODIFY COLUMN `agent_tool` ENUM('windsurf','claude_cli','cursor','github_copilot') DEFAULT NULL;

-- ─── 2. Item Events (append-only timeline) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS `om_daily_item_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_id` INT NOT NULL,
  `event_type` ENUM(
    'created','status_changed','assigned','scheduled','branch_created',
    'committed','pushed','merged','comment','blocked','unblocked',
    'bug_spawned','artifact_added','completed','cancelled','reopened'
  ) NOT NULL,
  `from_status` VARCHAR(30) DEFAULT NULL,
  `to_status` VARCHAR(30) DEFAULT NULL,
  `actor` VARCHAR(100) DEFAULT NULL,
  `message` TEXT DEFAULT NULL,
  `metadata` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_item_id` (`item_id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_item_events_item` FOREIGN KEY (`item_id`) REFERENCES `om_daily_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── 3. Artifacts ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `om_daily_artifacts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_id` INT NOT NULL,
  `artifact_type` ENUM(
    'commit','branch_snapshot','repo_snapshot','test_result',
    'review_note','completion_report','bug_report',
    'schedule_change','status_change'
  ) NOT NULL,
  `title` VARCHAR(255) DEFAULT NULL,
  `payload` JSON NOT NULL,
  `created_by` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_art_item` (`item_id`),
  KEY `idx_art_type` (`artifact_type`),
  KEY `idx_art_created` (`created_at`),
  CONSTRAINT `fk_artifacts_item` FOREIGN KEY (`item_id`) REFERENCES `om_daily_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── 4. Repo Snapshots ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `repo_snapshots` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `repo_target` ENUM('omai','orthodoxmetrics') NOT NULL,
  `current_branch` VARCHAR(255) DEFAULT NULL,
  `is_clean` TINYINT(1) DEFAULT 0,
  `uncommitted_count` INT DEFAULT 0,
  `ahead` INT DEFAULT 0,
  `behind` INT DEFAULT 0,
  `last_commit_sha` VARCHAR(40) DEFAULT NULL,
  `last_commit_message` VARCHAR(500) DEFAULT NULL,
  `last_commit_at` DATETIME DEFAULT NULL,
  `changed_files` JSON DEFAULT NULL,
  `snapshot_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_snap_repo` (`repo_target`),
  KEY `idx_snap_at` (`snapshot_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── 5. Schedule Blocks ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `om_daily_schedule_blocks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_id` INT NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `block_type` ENUM('work_block','deadline','milestone') DEFAULT 'work_block',
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_sched_item` (`item_id`),
  KEY `idx_sched_range` (`start_time`, `end_time`),
  CONSTRAINT `fk_schedule_item` FOREIGN KEY (`item_id`) REFERENCES `om_daily_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── 6. Bug Discovery (items spawned from other items) ──────────────────────
-- Uses parent_item_id + spawned_from_id on om_daily_items (added above)
-- plus task_type 'bugfix' to identify bug discoveries.
-- No separate table needed — bugs are just items with spawned_from_id set.

-- ─── Done ────────────────────────────────────────────────────────────────────
