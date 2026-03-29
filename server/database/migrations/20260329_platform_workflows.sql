-- ============================================================================
-- Platform Workflows — orchestration engine tables
-- Migrated: 2026-03-29
-- DB: orthodoxmetrics_db
-- ============================================================================

-- ─── Workflow definitions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_workflows (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_key      VARCHAR(80)   NOT NULL UNIQUE COMMENT 'Machine-readable identifier',
  name              VARCHAR(160)  NOT NULL,
  description       TEXT          NULL,
  category          VARCHAR(40)   NOT NULL DEFAULT 'ops' COMMENT 'ops, ocr, onboarding, backup, provisioning, maintenance, integration',
  is_enabled        TINYINT(1)    NOT NULL DEFAULT 1,
  trigger_type      ENUM('event','schedule','manual') NOT NULL DEFAULT 'manual',
  trigger_config    JSON          NULL COMMENT 'Event match criteria or cron expression',
  definition        JSON          NOT NULL COMMENT 'Array of step definitions',
  cooldown_seconds  INT UNSIGNED  NULL COMMENT 'Min seconds between runs',
  max_concurrent    TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Max concurrent runs of this workflow',
  created_by        INT UNSIGNED  NULL,
  updated_by        INT UNSIGNED  NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_trigger_type (trigger_type),
  INDEX idx_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Workflow run instances ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_workflow_runs (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_id       INT UNSIGNED    NOT NULL,
  trigger_event_id  BIGINT UNSIGNED NULL COMMENT 'FK to platform_events if event-triggered',
  trigger_source    VARCHAR(60)     NOT NULL DEFAULT 'manual' COMMENT 'event, schedule, manual, retry',
  status            ENUM('queued','running','completed','failed','cancelled','partially_completed') NOT NULL DEFAULT 'queued',
  started_at        TIMESTAMP       NULL,
  completed_at      TIMESTAMP       NULL,
  result_summary    TEXT            NULL,
  context           JSON            NULL COMMENT 'Runtime context shared across steps',
  created_task_id   INT UNSIGNED    NULL COMMENT 'FK to omai_tasks if workflow created a primary task',
  error_message     TEXT            NULL,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_workflow_id (workflow_id),
  INDEX idx_status (status),
  INDEX idx_started_at (started_at),
  INDEX idx_completed_at (completed_at),
  INDEX idx_trigger_event (trigger_event_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (workflow_id) REFERENCES platform_workflows(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Workflow step execution records ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_workflow_steps (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_run_id   BIGINT UNSIGNED NOT NULL,
  step_key          VARCHAR(80)     NOT NULL COMMENT 'From definition',
  step_type         VARCHAR(40)     NOT NULL COMMENT 'create_task, create_alert, emit_event, condition_check, assign_task, update_status, wait',
  step_order        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  status            ENUM('pending','running','completed','failed','skipped','cancelled') NOT NULL DEFAULT 'pending',
  input_json        JSON            NULL,
  output_json       JSON            NULL,
  error_message     TEXT            NULL,
  started_at        TIMESTAMP       NULL,
  completed_at      TIMESTAMP       NULL,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_run_id (workflow_run_id),
  INDEX idx_status (status),
  FOREIGN KEY (workflow_run_id) REFERENCES platform_workflow_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Workflow templates (reusable definitions) ───────────────────────────────
CREATE TABLE IF NOT EXISTS platform_workflow_templates (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  template_key      VARCHAR(80)   NOT NULL UNIQUE,
  name              VARCHAR(160)  NOT NULL,
  description       TEXT          NULL,
  category          VARCHAR(40)   NOT NULL DEFAULT 'ops',
  definition        JSON          NOT NULL,
  is_system         TINYINT(1)    NOT NULL DEFAULT 0,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Add workflow_id to omai_tasks for linking ───────────────────────────────
ALTER TABLE omai_tasks
  ADD COLUMN workflow_run_id BIGINT UNSIGNED NULL AFTER error_json,
  ADD INDEX idx_workflow_run (workflow_run_id);

-- ============================================================================
-- Default workflow templates + active workflows
-- ============================================================================

-- Template 1: Failed Task Escalation
INSERT INTO platform_workflow_templates (template_key, name, description, category, definition, is_system) VALUES
('failed_task_escalation', 'Failed Task Escalation', 'Escalate when tasks fail repeatedly: create alert, assign follow-up, emit escalation event', 'ops',
 JSON_ARRAY(
   JSON_OBJECT('step_key', 'create_alert', 'step_type', 'create_alert', 'config', JSON_OBJECT('title', 'Repeated task failures detected', 'severity', 'critical', 'category', 'alert', 'message', 'Multiple task failures require attention')),
   JSON_OBJECT('step_key', 'create_followup_task', 'step_type', 'create_task', 'config', JSON_OBJECT('title', 'Investigate repeated task failures', 'task_type', 'ops_followup', 'source_feature', 'workflow-engine')),
   JSON_OBJECT('step_key', 'emit_escalation', 'step_type', 'emit_event', 'config', JSON_OBJECT('event_type', 'workflow.escalation', 'category', 'alert', 'severity', 'critical', 'title', 'Task failure escalation triggered'))
 ), 1),

-- Template 2: OCR Queue Pressure
('ocr_queue_pressure', 'OCR Queue Pressure Response', 'Respond to OCR queue buildup: warn, create ops task, emit event', 'ocr',
 JSON_ARRAY(
   JSON_OBJECT('step_key', 'create_warning', 'step_type', 'create_alert', 'config', JSON_OBJECT('title', 'OCR queue pressure detected', 'severity', 'warning', 'category', 'alert', 'message', 'OCR queue has exceeded threshold')),
   JSON_OBJECT('step_key', 'create_ops_task', 'step_type', 'create_task', 'config', JSON_OBJECT('title', 'Address OCR queue backlog', 'task_type', 'ocr_ops', 'source_feature', 'workflow-engine')),
   JSON_OBJECT('step_key', 'emit_warning', 'step_type', 'emit_event', 'config', JSON_OBJECT('event_type', 'ocr.queue_pressure', 'category', 'ocr', 'severity', 'warning', 'title', 'OCR queue pressure workflow executed'))
 ), 1),

-- Template 3: Backup Failure Response
('backup_failure_response', 'Backup Failure Response', 'Respond to backup failures: critical alert, remediation task, notification event', 'backup',
 JSON_ARRAY(
   JSON_OBJECT('step_key', 'create_critical_alert', 'step_type', 'create_alert', 'config', JSON_OBJECT('title', 'Backup failure requires immediate attention', 'severity', 'critical', 'category', 'alert', 'message', 'Backup job failed — data protection at risk')),
   JSON_OBJECT('step_key', 'create_remediation_task', 'step_type', 'create_task', 'config', JSON_OBJECT('title', 'Remediate backup failure', 'task_type', 'backup_remediation', 'source_feature', 'workflow-engine')),
   JSON_OBJECT('step_key', 'emit_backup_alert', 'step_type', 'emit_event', 'config', JSON_OBJECT('event_type', 'backup.escalation', 'category', 'backup', 'severity', 'critical', 'title', 'Backup failure escalation triggered'))
 ), 1),

-- Template 4: Stale Task Follow-up
('stale_task_followup', 'Stale Task Follow-up', 'Scheduled scan: detect overdue tasks, create reminder events and follow-up tasks', 'ops',
 JSON_ARRAY(
   JSON_OBJECT('step_key', 'check_stale', 'step_type', 'condition_check', 'config', JSON_OBJECT('check', 'stale_task_count', 'threshold', 1, 'operator', '>=')),
   JSON_OBJECT('step_key', 'emit_stale_warning', 'step_type', 'emit_event', 'config', JSON_OBJECT('event_type', 'task.stale_detected', 'category', 'task', 'severity', 'warning', 'title', 'Stale tasks detected during scheduled scan')),
   JSON_OBJECT('step_key', 'create_followup', 'step_type', 'create_task', 'config', JSON_OBJECT('title', 'Review stale tasks', 'task_type', 'ops_review', 'source_feature', 'workflow-engine'))
 ), 1),

-- Template 5: Onboarding Stall Detection
('onboarding_stall_detection', 'Onboarding Stall Detection', 'Detect stalled onboarding processes and create follow-up actions', 'onboarding',
 JSON_ARRAY(
   JSON_OBJECT('step_key', 'check_stalled', 'step_type', 'condition_check', 'config', JSON_OBJECT('check', 'stalled_onboarding_count', 'threshold', 1, 'operator', '>=')),
   JSON_OBJECT('step_key', 'create_alert', 'step_type', 'create_alert', 'config', JSON_OBJECT('title', 'Onboarding process stalled', 'severity', 'warning', 'category', 'alert', 'message', 'One or more onboarding processes appear stalled')),
   JSON_OBJECT('step_key', 'create_task', 'step_type', 'create_task', 'config', JSON_OBJECT('title', 'Follow up on stalled onboarding', 'task_type', 'onboarding_followup', 'source_feature', 'workflow-engine')),
   JSON_OBJECT('step_key', 'emit_event', 'step_type', 'emit_event', 'config', JSON_OBJECT('event_type', 'onboarding.stall_detected', 'category', 'onboarding', 'severity', 'warning', 'title', 'Onboarding stall detection workflow completed'))
 ), 1),

-- Template 6: Platform Health Degradation Escalation
('health_degradation_escalation', 'Platform Health Degradation Escalation', 'Escalate repeated health degradation: alert, ops task, priority event', 'ops',
 JSON_ARRAY(
   JSON_OBJECT('step_key', 'create_critical_alert', 'step_type', 'create_alert', 'config', JSON_OBJECT('title', 'Platform health degradation escalation', 'severity', 'critical', 'category', 'alert', 'message', 'Repeated health degradation events detected')),
   JSON_OBJECT('step_key', 'create_ops_task', 'step_type', 'create_task', 'config', JSON_OBJECT('title', 'Investigate platform health degradation', 'task_type', 'ops_investigation', 'source_feature', 'workflow-engine')),
   JSON_OBJECT('step_key', 'emit_escalation', 'step_type', 'emit_event', 'config', JSON_OBJECT('event_type', 'health.escalation', 'category', 'system', 'severity', 'critical', 'title', 'Health degradation escalation triggered'))
 ), 1);

-- ─── Active workflow instances from templates ────────────────────────────────

-- Workflow 1: Failed Task Escalation (event-triggered)
INSERT INTO platform_workflows (workflow_key, name, description, category, is_enabled, trigger_type, trigger_config, definition, cooldown_seconds, max_concurrent) VALUES
('failed_task_escalation', 'Failed Task Escalation',
 'Triggers when task failures exceed threshold. Creates alert, follow-up task, and escalation event.',
 'ops', 1, 'event',
 JSON_OBJECT('event_type', 'task.failed', 'min_count', 3, 'time_window_seconds', 900, 'severity_min', 'warning'),
 (SELECT definition FROM platform_workflow_templates WHERE template_key = 'failed_task_escalation'),
 600, 1),

-- Workflow 2: OCR Queue Pressure (event-triggered)
('ocr_queue_pressure', 'OCR Queue Pressure Response',
 'Triggers on OCR queue threshold events. Creates warning, ops task, and status event.',
 'ocr', 1, 'event',
 JSON_OBJECT('event_type', 'ocr.queue_pressure', 'severity_min', 'warning'),
 (SELECT definition FROM platform_workflow_templates WHERE template_key = 'ocr_queue_pressure'),
 900, 1),

-- Workflow 3: Backup Failure Response (event-triggered)
('backup_failure_response', 'Backup Failure Response',
 'Triggers on backup.failed events. Creates critical alert and remediation task.',
 'backup', 1, 'event',
 JSON_OBJECT('event_type', 'backup.failed', 'severity_min', 'critical'),
 (SELECT definition FROM platform_workflow_templates WHERE template_key = 'backup_failure_response'),
 1800, 1),

-- Workflow 4: Stale Task Follow-up (scheduled — hourly)
('stale_task_followup', 'Stale Task Follow-up',
 'Hourly scan for stale running tasks. Creates follow-up tasks and warning events.',
 'ops', 1, 'schedule',
 JSON_OBJECT('cron', '0 * * * *', 'description', 'Every hour'),
 (SELECT definition FROM platform_workflow_templates WHERE template_key = 'stale_task_followup'),
 3600, 1),

-- Workflow 5: Onboarding Stall Detection (scheduled — daily 9 AM)
('onboarding_stall_detection', 'Onboarding Stall Detection',
 'Daily scan for stalled onboarding processes.',
 'onboarding', 1, 'schedule',
 JSON_OBJECT('cron', '0 9 * * *', 'description', 'Daily at 9 AM'),
 (SELECT definition FROM platform_workflow_templates WHERE template_key = 'onboarding_stall_detection'),
 86400, 1),

-- Workflow 6: Health Degradation Escalation (event-triggered)
('health_degradation_escalation', 'Platform Health Degradation Escalation',
 'Triggers on repeated system.degraded events. Creates critical alert and investigation task.',
 'ops', 1, 'event',
 JSON_OBJECT('event_type', 'system.degraded', 'min_count', 2, 'time_window_seconds', 600, 'severity_min', 'critical'),
 (SELECT definition FROM platform_workflow_templates WHERE template_key = 'health_degradation_escalation'),
 1800, 1);
