-- Work Session Tracking + Weekly Reporting System
-- Migration: 2026-03-31
-- Platform DB: orthodoxmetrics_db

USE orthodoxmetrics_db;

-- 1. Work sessions
CREATE TABLE IF NOT EXISTS work_sessions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  source_system ENUM('orthodoxmetrics', 'omai') NOT NULL DEFAULT 'orthodoxmetrics',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL,
  duration_seconds INT UNSIGNED NULL,
  status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
  start_context JSON NULL,
  end_context JSON NULL,
  summary_note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_status (user_id, status),
  INDEX idx_user_started (user_id, started_at),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Work session events (audit trail)
CREATE TABLE IF NOT EXISTS work_session_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_session_id INT UNSIGNED NOT NULL,
  event_type ENUM('started', 'paused', 'resumed', 'ended', 'cancelled', 'note_added', 'auto_ended', 'heartbeat') NOT NULL,
  event_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata_json JSON NULL,
  FOREIGN KEY (work_session_id) REFERENCES work_sessions(id) ON DELETE CASCADE,
  INDEX idx_session_type (work_session_id, event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Weekly report configurations
CREATE TABLE IF NOT EXISTS weekly_report_configs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  schedule_day TINYINT NOT NULL DEFAULT 1,
  schedule_hour TINYINT NOT NULL DEFAULT 8,
  timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
  recipients JSON NOT NULL,
  enabled_sections JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Report action registry (extensible section types)
CREATE TABLE IF NOT EXISTS report_action_registry (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  action_key VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  handler_module VARCHAR(200) NOT NULL,
  default_enabled TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Weekly report runs
CREATE TABLE IF NOT EXISTS weekly_report_runs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  config_id INT UNSIGNED NULL,
  user_id INT UNSIGNED NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status ENUM('generating', 'generated', 'sending', 'sent', 'failed') NOT NULL DEFAULT 'generating',
  report_html MEDIUMTEXT NULL,
  report_json JSON NULL,
  error_message TEXT NULL,
  generated_at DATETIME NULL,
  sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_period (user_id, period_start),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Weekly report run items (per-section detail)
CREATE TABLE IF NOT EXISTS weekly_report_run_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_id INT UNSIGNED NOT NULL,
  action_key VARCHAR(100) NOT NULL,
  section_html TEXT NULL,
  section_data JSON NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (run_id) REFERENCES weekly_report_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default report actions
INSERT IGNORE INTO report_action_registry (action_key, display_name, description, handler_module, sort_order) VALUES
('work_sessions', 'Work Sessions Summary', 'Total time worked, session count, daily breakdown', 'workSessionsSection', 1),
('tasks_completed', 'Tasks Completed', 'OM Daily items completed during the period', 'tasksCompletedSection', 2),
('highlights', 'Highlights & Notes', 'Session notes and notable actions', 'highlightsSection', 3),
('anomalies', 'Anomalies', 'Open sessions too long, missing end times, overlaps', 'anomaliesSection', 4);
