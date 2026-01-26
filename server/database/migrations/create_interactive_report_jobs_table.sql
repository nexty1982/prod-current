-- Interactive Report Jobs Table
-- Created: 2026-01-26
-- Purpose: Track background job status for Interactive Reports operations

-- G) interactive_report_jobs
CREATE TABLE IF NOT EXISTS interactive_report_jobs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by_user_id VARCHAR(36),
  church_id INT,
  report_id VARCHAR(36),
  job_type VARCHAR(64) NOT NULL COMMENT 'CREATE_REPORT, ASSIGN_RECIPIENTS, SEND_NOTIFICATIONS',
  status ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  progress INT NOT NULL DEFAULT 0 COMMENT '0-100 percentage',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  next_run_at DATETIME,
  started_at DATETIME,
  finished_at DATETIME,
  error_message TEXT,
  payload_json JSON COMMENT 'Input parameters for the job',
  result_json JSON COMMENT 'Output/result data from the job',
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL,
  INDEX idx_status_next_run (status, next_run_at),
  INDEX idx_report (report_id),
  INDEX idx_church (church_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments for documentation
ALTER TABLE interactive_report_jobs COMMENT 'Tracks background job status for interactive report operations';
