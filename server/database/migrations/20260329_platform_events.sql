-- Platform Events — unified event store for operational activity
-- Created: 2026-03-29
-- Purpose: Central event model for task lifecycle, system health, alerts,
--          OCR jobs, and all operational subsystems. Append-only.

CREATE TABLE IF NOT EXISTS platform_events (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type    VARCHAR(80)   NOT NULL COMMENT 'e.g. task.created, system.degraded, alert.created',
  category      VARCHAR(40)   NOT NULL COMMENT 'task, ocr, alert, system, backup, onboarding, auth, records, integration',
  severity      ENUM('info','warning','critical','success') NOT NULL DEFAULT 'info',
  source_system VARCHAR(60)   NOT NULL COMMENT 'task_runner, ocr_worker, platform_health, backups, admin_action, etc.',
  source_ref_id BIGINT UNSIGNED NULL    COMMENT 'FK to source entity (task id, job id, etc.)',
  title         VARCHAR(255)  NOT NULL,
  message       TEXT          NULL,
  event_payload JSON          NULL      COMMENT 'Rich metadata without over-normalizing',
  actor_type    ENUM('user','system','agent','worker') NOT NULL DEFAULT 'system',
  actor_id      INT UNSIGNED  NULL,
  actor_name    VARCHAR(100)  NULL,
  church_id     INT UNSIGNED  NULL,
  platform      ENUM('omai','om','shared') NOT NULL DEFAULT 'shared',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_created_at (created_at),
  INDEX idx_category (category),
  INDEX idx_severity (severity),
  INDEX idx_event_type (event_type),
  INDEX idx_platform (platform),
  INDEX idx_church_id (church_id),
  INDEX idx_source_system (source_system),
  INDEX idx_source_ref (source_ref_id),
  INDEX idx_cat_sev_created (category, severity, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Unified operational event store — append-only';

-- Event rules for automated reactions
CREATE TABLE IF NOT EXISTS platform_event_rules (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(120) NOT NULL,
  is_enabled        TINYINT(1)   NOT NULL DEFAULT 1,
  event_type_pattern VARCHAR(80) NULL     COMMENT 'Exact match or SQL LIKE pattern',
  category          VARCHAR(40)  NULL     COMMENT 'Match events in this category',
  severity_threshold ENUM('info','warning','critical') NULL COMMENT 'Minimum severity to trigger',
  condition_json    JSON         NULL     COMMENT 'Extended conditions: count threshold, time window, source match',
  action_type       ENUM('create_alert','create_task','log_only') NOT NULL,
  action_config_json JSON        NULL     COMMENT 'Config for the action (task_type, title template, etc.)',
  cooldown_seconds  INT UNSIGNED NOT NULL DEFAULT 300 COMMENT 'Min seconds between firings',
  last_fired_at     TIMESTAMP    NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_enabled (is_enabled),
  INDEX idx_event_type_pattern (event_type_pattern),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Rules that trigger automated reactions from platform events';

-- Rule execution audit trail
CREATE TABLE IF NOT EXISTS platform_event_rule_runs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rule_id         INT UNSIGNED    NOT NULL,
  event_id        BIGINT UNSIGNED NOT NULL,
  action_taken    VARCHAR(40)     NOT NULL,
  target_ref_id   BIGINT UNSIGNED NULL COMMENT 'ID of created task/alert if applicable',
  result_status   ENUM('success','failed','skipped') NOT NULL,
  result_message  TEXT            NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_rule_id (rule_id),
  INDEX idx_event_id (event_id),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_rule_runs_rule FOREIGN KEY (rule_id) REFERENCES platform_event_rules(id) ON DELETE CASCADE,
  CONSTRAINT fk_rule_runs_event FOREIGN KEY (event_id) REFERENCES platform_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Audit trail of rule executions — every automated reaction is traceable';

-- Default rules
INSERT INTO platform_event_rules (name, is_enabled, event_type_pattern, category, severity_threshold, condition_json, action_type, action_config_json, cooldown_seconds) VALUES
('Repeated task failures → alert', 1, 'task.failed', 'task', NULL,
 '{"count_threshold": 3, "time_window_seconds": 900}',
 'create_alert', '{"title": "Multiple task failures detected", "severity": "critical"}', 900),

('System degraded → alert', 1, 'system.degraded', 'system', 'critical', NULL,
 'create_alert', '{"title": "System health degraded", "severity": "critical"}', 600),

('Backup failed → alert + task', 1, 'backup.failed', 'backup', NULL, NULL,
 'create_alert', '{"title": "Backup failure detected", "severity": "critical"}', 3600),

('Service down → alert', 1, 'service.unhealthy', 'system', 'critical', NULL,
 'create_alert', '{"title": "Service down", "severity": "critical"}', 300),

('OCR job failed → log', 1, 'ocr.job.failed', 'ocr', NULL, NULL,
 'log_only', '{"note": "OCR failures tracked for pattern analysis"}', 60);
