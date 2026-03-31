-- ============================================================================
-- Continuous Architecture Audit System — Schema
-- Created: 2026-03-30
-- DB: orthodoxmetrics_db
-- ============================================================================

-- audit_runs: Each execution of the audit system produces one run
CREATE TABLE IF NOT EXISTS audit_runs (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_uuid              CHAR(36) NOT NULL UNIQUE,
  run_type              ENUM('baseline_import','full_scan','delta_only','scoped','build_linked','change_set_linked') NOT NULL DEFAULT 'full_scan',
  status                ENUM('queued','running','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
  triggered_by          VARCHAR(100) DEFAULT NULL COMMENT 'user, cron, build-hook, cli',
  
  -- Linkage to existing systems
  related_build_run_id  INT UNSIGNED DEFAULT NULL,
  related_change_set_id INT UNSIGNED DEFAULT NULL,
  
  -- Scope
  scan_paths            JSON DEFAULT NULL COMMENT '["front-end/src","berry/src/views"]',
  scan_filters          JSON DEFAULT NULL COMMENT '{"extensions":[".tsx",".ts"],"exclude":["node_modules"]}',
  
  -- Scoring summary (top-level rollup)
  overall_score         DECIMAL(5,2) DEFAULT NULL COMMENT '0-100 composite score',
  score_breakdown       JSON DEFAULT NULL COMMENT '{"architecture":72,"reuse":55,"data_integration":80,...}',
  
  -- Stats
  total_components      INT UNSIGNED DEFAULT 0,
  total_violations      INT UNSIGNED DEFAULT 0,
  total_files_scanned   INT UNSIGNED DEFAULT 0,
  total_loc             INT UNSIGNED DEFAULT 0,
  
  -- Delta from previous run
  previous_run_id       INT UNSIGNED DEFAULT NULL,
  delta_summary         JSON DEFAULT NULL COMMENT '{"score_change":+3.2,"new_violations":2,"resolved_violations":5}',
  
  -- Metadata
  duration_ms           INT UNSIGNED DEFAULT NULL,
  metadata_json         JSON DEFAULT NULL COMMENT 'Extra context: git sha, branch, build version',
  error_message         TEXT DEFAULT NULL,
  
  started_at            DATETIME DEFAULT NULL,
  completed_at          DATETIME DEFAULT NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_run_type (run_type),
  INDEX idx_status (status),
  INDEX idx_created (created_at),
  INDEX idx_build_run (related_build_run_id),
  INDEX idx_change_set (related_change_set_id),
  INDEX idx_previous (previous_run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- audit_components: Per-component snapshot within an audit run
CREATE TABLE IF NOT EXISTS audit_components (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_id                INT UNSIGNED NOT NULL,
  
  -- Identity
  component_name        VARCHAR(255) NOT NULL,
  component_path        VARCHAR(512) DEFAULT NULL COMMENT 'Relative path from scan root',
  source_origin         VARCHAR(50) DEFAULT NULL COMMENT 'CP, Berry, OM',
  component_group       VARCHAR(255) DEFAULT NULL COMMENT 'OMAI: Executive Overview, etc.',
  
  -- Metrics
  loc                   INT UNSIGNED DEFAULT 0,
  use_state_count       INT UNSIGNED DEFAULT 0,
  use_effect_count      INT UNSIGNED DEFAULT 0,
  api_endpoints_count   INT UNSIGNED DEFAULT 0,
  api_client_type       VARCHAR(50) DEFAULT NULL COMMENT 'omApi, fetch, axios, apiClient, adminAPI, none',
  polling_interval_ms   INT UNSIGNED DEFAULT NULL,
  empty_catch_count     INT UNSIGNED DEFAULT 0,
  
  -- Scoring dimensions (each 0-100)
  arch_quality_score    DECIMAL(5,2) DEFAULT NULL,
  arch_quality_label    ENUM('excellent','good','fair','poor','placeholder') DEFAULT NULL,
  reuse_score           DECIMAL(5,2) DEFAULT NULL,
  data_integration      ENUM('clean','fragmented','mock','hardcoded') DEFAULT NULL,
  state_management      ENUM('correct','over-localized','over-globalized','inconsistent') DEFAULT NULL,
  ui_consistency        ENUM('system-aligned','partially-aligned','inconsistent') DEFAULT NULL,
  
  -- Migration readiness
  migration_readiness   ENUM('plug-and-play','light-adaptation','heavy-refactor','not-worth-migrating') DEFAULT NULL,
  recommended_action    ENUM('keep','refactor','extract','rebuild') DEFAULT NULL,
  action_notes          TEXT DEFAULT NULL,
  
  -- Risk
  risk_notes            TEXT DEFAULT NULL,
  is_mock               TINYINT(1) NOT NULL DEFAULT 0,
  is_placeholder        TINYINT(1) NOT NULL DEFAULT 0,
  is_god_component      TINYINT(1) NOT NULL DEFAULT 0,
  
  -- Extra evidence
  evidence_json         JSON DEFAULT NULL COMMENT 'Detailed metrics, import deps, etc.',
  
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_run (run_id),
  INDEX idx_name (component_name),
  INDEX idx_quality (arch_quality_label),
  INDEX idx_action (recommended_action),
  INDEX idx_mock (is_mock),
  UNIQUE KEY uq_run_component (run_id, component_name),
  CONSTRAINT fk_component_run FOREIGN KEY (run_id) REFERENCES audit_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- audit_violations: Specific architectural violations found in a run
CREATE TABLE IF NOT EXISTS audit_violations (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_id                INT UNSIGNED NOT NULL,
  component_id          INT UNSIGNED DEFAULT NULL,
  
  violation_code        VARCHAR(50) NOT NULL COMMENT 'GOD_COMPONENT, MOCK_DATA, EMPTY_CATCH, etc.',
  severity              ENUM('critical','high','medium','low','info') NOT NULL DEFAULT 'medium',
  title                 VARCHAR(500) NOT NULL,
  description           TEXT DEFAULT NULL,
  file_path             VARCHAR(512) DEFAULT NULL,
  line_range            VARCHAR(50) DEFAULT NULL COMMENT '71-75',
  evidence              TEXT DEFAULT NULL COMMENT 'Code snippet or proof',
  
  -- Tracking
  first_seen_run_id     INT UNSIGNED DEFAULT NULL COMMENT 'Run where first detected',
  is_resolved           TINYINT(1) NOT NULL DEFAULT 0,
  resolved_in_run_id    INT UNSIGNED DEFAULT NULL,
  
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_run (run_id),
  INDEX idx_component (component_id),
  INDEX idx_code (violation_code),
  INDEX idx_severity (severity),
  INDEX idx_resolved (is_resolved),
  CONSTRAINT fk_violation_run FOREIGN KEY (run_id) REFERENCES audit_runs(id) ON DELETE CASCADE,
  CONSTRAINT fk_violation_component FOREIGN KEY (component_id) REFERENCES audit_components(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- audit_deltas: Change tracking between consecutive audit runs
CREATE TABLE IF NOT EXISTS audit_deltas (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_id                INT UNSIGNED NOT NULL COMMENT 'Current run',
  previous_run_id       INT UNSIGNED NOT NULL COMMENT 'Comparison run',
  
  delta_type            ENUM('component_added','component_removed','component_changed','violation_new','violation_resolved','score_change','metric_change') NOT NULL,
  entity_type           ENUM('run','component','violation') NOT NULL DEFAULT 'component',
  entity_id             INT UNSIGNED DEFAULT NULL COMMENT 'ID in the relevant table',
  entity_name           VARCHAR(255) DEFAULT NULL,
  
  field_name            VARCHAR(100) DEFAULT NULL COMMENT 'Which field changed',
  old_value             TEXT DEFAULT NULL,
  new_value             TEXT DEFAULT NULL,
  
  -- Significance
  is_regression         TINYINT(1) NOT NULL DEFAULT 0,
  is_improvement        TINYINT(1) NOT NULL DEFAULT 0,
  significance          ENUM('critical','notable','minor') NOT NULL DEFAULT 'minor',
  
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_run (run_id),
  INDEX idx_prev (previous_run_id),
  INDEX idx_type (delta_type),
  INDEX idx_regression (is_regression),
  INDEX idx_improvement (is_improvement),
  CONSTRAINT fk_delta_run FOREIGN KEY (run_id) REFERENCES audit_runs(id) ON DELETE CASCADE,
  CONSTRAINT fk_delta_prev FOREIGN KEY (previous_run_id) REFERENCES audit_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- audit_artifacts: Persisted report outputs (JSON, MD, HTML)
CREATE TABLE IF NOT EXISTS audit_artifacts (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_id                INT UNSIGNED NOT NULL,
  
  artifact_type         ENUM('json_full','json_summary','markdown','html','baseline_import') NOT NULL,
  file_name             VARCHAR(255) NOT NULL,
  file_path             VARCHAR(512) NOT NULL COMMENT 'Absolute path on disk',
  file_size_bytes       INT UNSIGNED DEFAULT NULL,
  checksum_sha256       CHAR(64) DEFAULT NULL,
  
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_run (run_id),
  INDEX idx_type (artifact_type),
  CONSTRAINT fk_artifact_run FOREIGN KEY (run_id) REFERENCES audit_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
