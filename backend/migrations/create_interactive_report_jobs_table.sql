-- Interactive Report Jobs Table
-- Created: 2025-01-XX
-- Purpose: Track background job status for interactive report operations

CREATE TABLE IF NOT EXISTS interactive_report_jobs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by_user_id VARCHAR(36) NULL,
  church_id INT NULL,
  report_id VARCHAR(36) NULL,
  job_type VARCHAR(64) NOT NULL COMMENT 'e.g., CREATE_REPORT, ASSIGN_RECIPIENTS, SEND_NOTIFICATIONS',
  status ENUM('PENDING','RUNNING','COMPLETED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  progress INT NOT NULL DEFAULT 0 COMMENT '0-100',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  next_run_at DATETIME NULL,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  error_message TEXT NULL,
  payload_json JSON NULL COMMENT 'inputs summary',
  result_json JSON NULL COMMENT 'outputs summary',
  
  INDEX idx_status_next_run (status, next_run_at),
  INDEX idx_report (report_id),
  INDEX idx_church (church_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
