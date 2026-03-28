-- ============================================================================
-- OM Seedling Pipelines — Controlled automation for batch seeding operations
-- ============================================================================
-- A pipeline groups a targeting → dry-run → approval → execute workflow into
-- a single trackable unit. Supports manual, semi-auto, and strict modes.
-- Each pipeline produces one or more om_seedling_runs (dry-run + execute).
-- ============================================================================

CREATE TABLE IF NOT EXISTS `om_seedling_pipelines` (
  `id`                    INT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- Pipeline mode & status
  `mode`                  ENUM('manual','semi_auto','strict') NOT NULL DEFAULT 'manual'
                          COMMENT 'manual=review required, semi_auto=auto if no blockers, strict=auto if 0 warnings',
  `status`                ENUM('created','dry_run','awaiting_approval','executing','paused','completed','failed','cancelled')
                          NOT NULL DEFAULT 'created',
  `stage`                 VARCHAR(32) DEFAULT 'targeting'
                          COMMENT 'Current stage: targeting, dry_run, awaiting_approval, executing, batch_N, completed',

  -- Scope & configuration
  `scope_label`           VARCHAR(128) DEFAULT NULL COMMENT 'Human label: "OCA NY/NJ", "All Ready Phase 2", etc.',
  `filters_json`          JSON DEFAULT NULL COMMENT 'Church filters used for targeting',
  `options_json`          JSON DEFAULT NULL COMMENT 'Seeding options (record_types, year range, etc.)',
  `readiness_filter`      VARCHAR(32) DEFAULT NULL COMMENT 'Readiness status filter applied',

  -- Batching configuration
  `batch_size`            INT UNSIGNED DEFAULT 10 COMMENT 'Churches per batch',
  `batch_delay_ms`        INT UNSIGNED DEFAULT 1000 COMMENT 'Delay between batches in ms',
  `total_batches`         INT UNSIGNED DEFAULT 0,
  `completed_batches`     INT UNSIGNED DEFAULT 0,

  -- Church counts
  `total_churches`        INT UNSIGNED DEFAULT 0,
  `processed_churches`    INT UNSIGNED DEFAULT 0,
  `succeeded_churches`    INT UNSIGNED DEFAULT 0,
  `failed_churches`       INT UNSIGNED DEFAULT 0,
  `skipped_churches`      INT UNSIGNED DEFAULT 0,

  -- Record totals
  `projected_total`       INT UNSIGNED DEFAULT 0,
  `actual_total`          INT UNSIGNED DEFAULT 0,

  -- Linked runs
  `dry_run_id`            INT UNSIGNED DEFAULT NULL COMMENT 'FK to om_seedling_runs.id for the dry run',
  `execute_run_id`        INT UNSIGNED DEFAULT NULL COMMENT 'FK to om_seedling_runs.id for the execute run',
  `task_id`               INT UNSIGNED DEFAULT NULL COMMENT 'FK to omai_tasks.id for Task Runner visibility',

  -- Approval tracking
  `approval_required`     TINYINT(1) NOT NULL DEFAULT 1,
  `approved_by`           VARCHAR(64) DEFAULT NULL,
  `approved_at`           DATETIME DEFAULT NULL,
  `approval_notes`        TEXT DEFAULT NULL,

  -- Dry run summary (cached for approval gate)
  `dry_run_summary_json`  JSON DEFAULT NULL COMMENT 'Cached dry-run summary for approval review',
  `dry_run_warnings`      INT UNSIGNED DEFAULT 0 COMMENT 'Warning count from dry run',
  `dry_run_blockers`      INT UNSIGNED DEFAULT 0 COMMENT 'Blocker count from dry run',

  -- Who / when
  `created_by`            VARCHAR(64) DEFAULT NULL,
  `created_at`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `started_at`            DATETIME DEFAULT NULL,
  `finished_at`           DATETIME DEFAULT NULL,
  `duration_ms`           INT UNSIGNED DEFAULT NULL,

  `error_message`         TEXT DEFAULT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_pipeline_status` (`status`),
  KEY `idx_pipeline_mode` (`mode`),
  KEY `idx_pipeline_created` (`created_at`),
  KEY `idx_pipeline_dry_run` (`dry_run_id`),
  KEY `idx_pipeline_execute_run` (`execute_run_id`),
  KEY `idx_pipeline_task` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Add pipeline_id to om_seedling_runs for grouping
-- ============================================================================

ALTER TABLE `om_seedling_runs`
  ADD COLUMN IF NOT EXISTS `pipeline_id` INT UNSIGNED DEFAULT NULL
    COMMENT 'FK to om_seedling_pipelines.id — groups runs into a pipeline',
  ADD INDEX IF NOT EXISTS `idx_seedling_runs_pipeline` (`pipeline_id`);
