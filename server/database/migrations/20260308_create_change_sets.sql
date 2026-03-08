-- ============================================================================
-- Change Sets — SDLC Delivery Container
-- Created: 2026-03-08
-- Purpose: Groups OM Daily work items into reviewable, promotable delivery units
-- ============================================================================

USE orthodoxmetrics_db;

-- 1. change_sets — primary delivery container
CREATE TABLE IF NOT EXISTS change_sets (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    code                  VARCHAR(20) NOT NULL UNIQUE COMMENT 'Stable short identifier (e.g. CS-0042)',
    title                 VARCHAR(255) NOT NULL,
    description           TEXT NULL,
    status                ENUM(
                            'draft',
                            'active',
                            'ready_for_staging',
                            'staged',
                            'in_review',
                            'approved',
                            'promoted',
                            'rejected',
                            'rolled_back'
                          ) NOT NULL DEFAULT 'draft',
    priority              ENUM('critical', 'high', 'medium', 'low') NOT NULL DEFAULT 'medium',
    change_type           ENUM('feature', 'bugfix', 'hotfix', 'refactor', 'infra') NOT NULL DEFAULT 'feature',
    git_branch            VARCHAR(255) NULL COMMENT 'Primary branch for this change_set',
    deployment_strategy   ENUM('stage_then_promote', 'hotfix_direct') NOT NULL DEFAULT 'stage_then_promote',

    -- DB change tracking
    has_db_changes        BOOLEAN NOT NULL DEFAULT FALSE,
    migration_files       JSON NULL COMMENT 'Array of migration filenames included',

    -- Build linkage (FKs to build_runs.run_id)
    staging_build_run_id  VARCHAR(36) NULL,
    prod_build_run_id     VARCHAR(36) NULL,

    -- Commit SHA tracking
    staging_commit_sha    VARCHAR(40) NULL COMMENT 'Commit SHA that was staged',
    approved_commit_sha   VARCHAR(40) NULL COMMENT 'Commit SHA that was approved (must match staged)',
    prod_commit_sha       VARCHAR(40) NULL COMMENT 'Commit SHA deployed to production',

    -- Ownership
    created_by            INT NOT NULL,

    -- Review data
    reviewed_by           INT NULL,
    review_notes          TEXT NULL,

    -- Lifecycle timestamps
    staged_at             TIMESTAMP NULL DEFAULT NULL,
    approved_at           TIMESTAMP NULL DEFAULT NULL,
    promoted_at           TIMESTAMP NULL DEFAULT NULL,
    rejected_at           TIMESTAMP NULL DEFAULT NULL,
    rejection_reason      TEXT NULL,

    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status (status),
    INDEX idx_git_branch (git_branch),
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at DESC),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (staging_build_run_id) REFERENCES build_runs(run_id) ON DELETE SET NULL,
    FOREIGN KEY (prod_build_run_id) REFERENCES build_runs(run_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 2. change_set_items — junction between change_sets and om_daily_items
CREATE TABLE IF NOT EXISTS change_set_items (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    change_set_id     INT NOT NULL,
    om_daily_item_id  INT NOT NULL,
    sort_order        INT NOT NULL DEFAULT 0,
    is_required       BOOLEAN NOT NULL DEFAULT TRUE,
    notes             TEXT NULL,
    added_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_set_item (change_set_id, om_daily_item_id),
    FOREIGN KEY (change_set_id) REFERENCES change_sets(id) ON DELETE CASCADE,
    FOREIGN KEY (om_daily_item_id) REFERENCES om_daily_items(id) ON DELETE CASCADE,
    INDEX idx_item (om_daily_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 3. change_set_events — append-only audit log
CREATE TABLE IF NOT EXISTS change_set_events (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    change_set_id   INT NOT NULL,
    event_type      ENUM(
                      'created',
                      'item_added',
                      'item_removed',
                      'status_changed',
                      'staged',
                      'review_started',
                      'approved',
                      'rejected',
                      'promoted',
                      'rolled_back',
                      'note_added'
                    ) NOT NULL,
    from_status     VARCHAR(30) NULL,
    to_status       VARCHAR(30) NULL,
    user_id         INT NULL,
    message         TEXT NULL,
    metadata        JSON NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (change_set_id) REFERENCES change_sets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_set_id (change_set_id),
    INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 4. Auto-increment code sequence helper
-- We use a simple approach: CS-{zero-padded id}
-- The application generates the code from the auto-increment id.
