-- ============================================================================
-- Onboarding provisioning checklist — Task 8 six-step persistence
-- 2026-06-09 | orthodoxmetrics_db
-- Rollback: DROP TABLE onboarding_provisioning_steps
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_provisioning_steps (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  onboarding_request_id   VARCHAR(32) NOT NULL,
  step_key                VARCHAR(64) NOT NULL,
  step_name               VARCHAR(128) NOT NULL,
  step_order              TINYINT UNSIGNED NOT NULL,
  status                  ENUM('not_started','in_progress','blocked','failed','passed','skipped')
                          NOT NULL DEFAULT 'not_started',
  details_json            JSON NULL,
  error_message           TEXT NULL,
  started_at              TIMESTAMP NULL,
  completed_at            TIMESTAMP NULL,
  actor_type              ENUM('system','admin','user') NULL,
  actor_id                INT NULL,
  retry_count             INT UNSIGNED NOT NULL DEFAULT 0,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_onb_step (onboarding_request_id, step_key),
  KEY idx_onb_steps_status (onboarding_request_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
