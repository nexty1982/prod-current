-- ============================================================================
-- App Workflow Catalog Phase B — component versions + policy scaffolding
-- 2026-06-09 | Runbook v2 §17.2–17.6 minimum
-- DB: orthodoxmetrics_db
-- Rollback: DROP TABLE app_workflow_policy_assignments, app_workflow_policies,
--           app_component_versions (only if no production rows depend on them)
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_component_versions (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  component_key           VARCHAR(128) NOT NULL,
  semantic_version        VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  workshop_build_number   INT UNSIGNED NOT NULL DEFAULT 1,
  full_version            VARCHAR(48) NOT NULL,
  source_path             VARCHAR(512) NULL,
  target_app              ENUM('om','omai','omstudio','workshop') NOT NULL DEFAULT 'om',
  target_server_key       VARCHAR(64) NULL,
  deployment_status       ENUM('staged','active','rolled_back','failed') NOT NULL DEFAULT 'staged',
  deployed_at             TIMESTAMP NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_component_target_version (component_key, target_app, target_server_key, full_version),
  KEY idx_acv_active (component_key, target_app, deployment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_workflow_policies (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  policy_key              VARCHAR(96) NOT NULL,
  policy_name             VARCHAR(128) NOT NULL,
  policy_rules            JSON NOT NULL,
  lifecycle_status        ENUM('draft','active','deprecated') NOT NULL DEFAULT 'draft',
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_policy_key (policy_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_workflow_policy_assignments (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  policy_id               BIGINT UNSIGNED NOT NULL,
  workflow_key            VARCHAR(96) NOT NULL,
  assignment_scope        ENUM('workflow','step','component') NOT NULL DEFAULT 'workflow',
  scope_key               VARCHAR(128) NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_policy_assign (policy_id, workflow_key, assignment_scope, scope_key),
  CONSTRAINT fk_awpa_policy FOREIGN KEY (policy_id) REFERENCES app_workflow_policies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Baseline catalog components as active 1.0.0_1 (record-only deployment ledger)
INSERT INTO app_component_versions
  (component_key, semantic_version, workshop_build_number, full_version, source_path, target_app, target_server_key, deployment_status, deployed_at)
SELECT DISTINCT
  c.component_key,
  '1.0.0',
  1,
  '1.0.0_1',
  c.source_path,
  CASE c.source_app
    WHEN 'omai' THEN 'omai'
    WHEN 'omstudio' THEN 'omstudio'
    WHEN 'workshop' THEN 'workshop'
    ELSE 'om'
  END,
  'om-prod-01',
  'active',
  CURRENT_TIMESTAMP
FROM app_workflow_step_components c
WHERE c.implementation_state = 'exists'
ON DUPLICATE KEY UPDATE
  source_path = VALUES(source_path),
  deployment_status = 'active',
  deployed_at = COALESCE(deployed_at, VALUES(deployed_at));
