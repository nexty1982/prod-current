-- ============================================================================
-- OM Seedling Runs — Persistent audit trail for seeding operations
-- ============================================================================
-- Tracks every dry-run and execute run with filters, options, totals, and
-- per-church results. Enables run history, report retrieval, and purge-by-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `om_seedling_runs` (
  `id`                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `mode`                ENUM('dry_run','execute') NOT NULL,
  `status`              ENUM('running','succeeded','failed','cancelled','partial') NOT NULL DEFAULT 'running',
  `task_id`             INT UNSIGNED DEFAULT NULL COMMENT 'FK to omai_tasks.id for Task Runner visibility',

  -- Who / when
  `started_by`          VARCHAR(64) DEFAULT NULL COMMENT 'User or agent identifier',
  `started_at`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at`         DATETIME DEFAULT NULL,
  `duration_ms`         INT UNSIGNED DEFAULT NULL,

  -- Filters & options
  `filters_json`        JSON DEFAULT NULL COMMENT '{"churchId":199,"state":"NJ",...}',
  `options_json`        JSON DEFAULT NULL COMMENT '{"allowFallback":true,"recordTypes":[...],...}',

  -- Projected totals (from dry-run / pre-execution plan)
  `projected_baptism`   INT UNSIGNED DEFAULT 0,
  `projected_marriage`  INT UNSIGNED DEFAULT 0,
  `projected_funeral`   INT UNSIGNED DEFAULT 0,
  `projected_total`     INT UNSIGNED DEFAULT 0,

  -- Actual totals (execute mode only)
  `actual_baptism`      INT UNSIGNED DEFAULT 0,
  `actual_marriage`     INT UNSIGNED DEFAULT 0,
  `actual_funeral`      INT UNSIGNED DEFAULT 0,
  `actual_total`        INT UNSIGNED DEFAULT 0,

  -- Church counts
  `churches_attempted`  INT UNSIGNED DEFAULT 0,
  `churches_succeeded`  INT UNSIGNED DEFAULT 0,
  `churches_skipped`    INT UNSIGNED DEFAULT 0,
  `churches_failed`     INT UNSIGNED DEFAULT 0,

  -- Full report (JSON)
  `report_json`         LONGTEXT DEFAULT NULL COMMENT 'Full structured report for UI/API retrieval',
  `error_message`       TEXT DEFAULT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_seedling_runs_status` (`status`),
  KEY `idx_seedling_runs_mode` (`mode`),
  KEY `idx_seedling_runs_started` (`started_at`),
  KEY `idx_seedling_runs_task` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Add seed_run_id to tenant record tables (template + existing Phase 2 DBs)
-- ============================================================================
-- This column enables targeted purge/rollback of seeded records by run ID.
-- Applied to the template DB so new provisions inherit it, and to all existing
-- Phase 2 tenant databases.
-- ============================================================================

-- Template DB
ALTER TABLE `record_template1`.`baptism_records`
  ADD COLUMN IF NOT EXISTS `seed_run_id` INT UNSIGNED DEFAULT NULL COMMENT 'om_seedling_runs.id — NULL for real records',
  ADD INDEX IF NOT EXISTS `idx_seed_run` (`seed_run_id`);

ALTER TABLE `record_template1`.`marriage_records`
  ADD COLUMN IF NOT EXISTS `seed_run_id` INT UNSIGNED DEFAULT NULL COMMENT 'om_seedling_runs.id — NULL for real records',
  ADD INDEX IF NOT EXISTS `idx_seed_run` (`seed_run_id`);

ALTER TABLE `record_template1`.`funeral_records`
  ADD COLUMN IF NOT EXISTS `seed_run_id` INT UNSIGNED DEFAULT NULL COMMENT 'om_seedling_runs.id — NULL for real records',
  ADD INDEX IF NOT EXISTS `idx_seed_run` (`seed_run_id`);
