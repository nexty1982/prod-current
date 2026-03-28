-- omai_tasks: Generic task/job tracking for OMAI Ops background operations
-- Used by Task Runner UI to monitor enrichment batches, provisioning, imports, etc.

CREATE TABLE IF NOT EXISTS omai_tasks (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  task_type       VARCHAR(60)   NOT NULL COMMENT 'e.g. enrichment_batch, tenant_provision, import, backfill, audit',
  source_feature  VARCHAR(100)  DEFAULT NULL COMMENT 'Originating page/component, e.g. church-enrichment, church-lifecycle',
  title           VARCHAR(255)  NOT NULL,
  status          ENUM('queued','running','succeeded','failed','cancelled') NOT NULL DEFAULT 'queued',
  stage           VARCHAR(120)  DEFAULT NULL COMMENT 'Current step label, e.g. Fetching pages, Extracting data',
  message         TEXT          DEFAULT NULL COMMENT 'Human-readable status message',

  created_by      INT           DEFAULT NULL COMMENT 'User ID who initiated',
  created_by_name VARCHAR(100)  DEFAULT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at      TIMESTAMP     NULL DEFAULT NULL,
  finished_at     TIMESTAMP     NULL DEFAULT NULL,
  last_heartbeat  TIMESTAMP     NULL DEFAULT NULL,

  total_count     INT           NOT NULL DEFAULT 0,
  completed_count INT           NOT NULL DEFAULT 0,
  success_count   INT           NOT NULL DEFAULT 0,
  failure_count   INT           NOT NULL DEFAULT 0,

  metadata_json   JSON          DEFAULT NULL COMMENT 'Task-specific config/filters',
  result_json     JSON          DEFAULT NULL COMMENT 'Final result summary',
  error_json      JSON          DEFAULT NULL COMMENT 'Error details if failed',

  INDEX idx_status      (status),
  INDEX idx_task_type   (task_type),
  INDEX idx_created_at  (created_at),
  INDEX idx_source      (source_feature)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- omai_task_events: Per-item or per-stage log entries for a task
CREATE TABLE IF NOT EXISTS omai_task_events (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  task_id   INT         NOT NULL,
  level     ENUM('info','warn','error') NOT NULL DEFAULT 'info',
  stage     VARCHAR(120) DEFAULT NULL,
  message   TEXT        NOT NULL,
  detail_json JSON      DEFAULT NULL,
  created_at TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_task_id (task_id),
  INDEX idx_level   (level),
  FOREIGN KEY (task_id) REFERENCES omai_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
