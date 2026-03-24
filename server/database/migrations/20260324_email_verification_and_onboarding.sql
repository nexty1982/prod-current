-- Migration: Email verification, church onboarding, OCR notifications, export jobs
-- Date: 2026-03-24
-- Addresses OM Daily items: #500, #502, #504, #137, #138, #130, #129

-- #500: Email verification tokens
CREATE TABLE IF NOT EXISTS email_verifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(128) NOT NULL,
  verified_at TIMESTAMP NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE INDEX idx_token (token),
  INDEX idx_user (user_id),
  INDEX idx_email (email),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- #502: Church onboarding checklist
CREATE TABLE IF NOT EXISTS church_onboarding_tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  church_id INT NOT NULL,
  task_key VARCHAR(64) NOT NULL COMMENT 'e.g., setup_profile, add_members, configure_ocr, first_record',
  task_label VARCHAR(255) NOT NULL,
  task_group VARCHAR(64) NOT NULL DEFAULT 'getting_started' COMMENT 'getting_started, records, ocr, team',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  completed_at TIMESTAMP NULL,
  completed_by INT NULL COMMENT 'user_id who completed it',
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE INDEX idx_church_task (church_id, task_key),
  INDEX idx_church_group (church_id, task_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default onboarding tasks template
CREATE TABLE IF NOT EXISTS onboarding_task_templates (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_key VARCHAR(64) NOT NULL,
  task_label VARCHAR(255) NOT NULL,
  task_group VARCHAR(64) NOT NULL DEFAULT 'getting_started',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  description TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE INDEX idx_task_key (task_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default onboarding tasks
INSERT IGNORE INTO onboarding_task_templates (task_key, task_label, task_group, sort_order, is_required, description) VALUES
('update_profile', 'Update church profile', 'getting_started', 1, 1, 'Add church name, address, contact info, and logo'),
('invite_members', 'Invite team members', 'getting_started', 2, 0, 'Add priests, deacons, and editors to your team'),
('configure_roles', 'Configure user roles', 'getting_started', 3, 0, 'Set permissions for your team members'),
('add_first_record', 'Add your first record', 'records', 4, 1, 'Create a baptism, marriage, or funeral record'),
('configure_ocr', 'Set up OCR digitization', 'ocr', 5, 0, 'Configure language and layout settings for scanning ledgers'),
('upload_first_scan', 'Upload first ledger scan', 'ocr', 6, 0, 'Digitize a page from your historical records'),
('review_first_draft', 'Review OCR results', 'ocr', 7, 0, 'Review and correct OCR-extracted records'),
('setup_calendar', 'Configure church calendar', 'parish_life', 8, 0, 'Set up liturgical calendar and events'),
('configure_notifications', 'Set notification preferences', 'admin', 9, 0, 'Choose what notifications to receive');

-- #504: Token registration role configuration per church
ALTER TABLE churches ADD COLUMN IF NOT EXISTS default_registration_role VARCHAR(32) NOT NULL DEFAULT 'editor' COMMENT 'Role assigned to users who register via church token';

-- #137 + #138: OCR notification preferences
CREATE TABLE IF NOT EXISTS ocr_notification_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  church_id INT NOT NULL,
  user_id INT NOT NULL,
  notify_on_complete TINYINT(1) NOT NULL DEFAULT 1,
  notify_on_failure TINYINT(1) NOT NULL DEFAULT 1,
  notify_on_review_ready TINYINT(1) NOT NULL DEFAULT 1,
  daily_digest TINYINT(1) NOT NULL DEFAULT 0,
  digest_hour TINYINT UNSIGNED NOT NULL DEFAULT 8 COMMENT 'Hour to send daily digest (0-23)',
  email_enabled TINYINT(1) NOT NULL DEFAULT 1,
  in_app_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE INDEX idx_church_user (church_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- #129 + #130: Export jobs tracking
CREATE TABLE IF NOT EXISTS export_jobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  church_id INT NOT NULL,
  user_id INT NOT NULL,
  export_type VARCHAR(32) NOT NULL COMMENT 'pdf_report, xlsx, csv, gedcom, zip_archive',
  status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  record_type VARCHAR(32) NULL COMMENT 'baptism, marriage, funeral, all',
  filter_json JSON NULL COMMENT 'Date range, search criteria, etc.',
  file_path VARCHAR(512) NULL COMMENT 'Path to generated export file',
  file_size_bytes BIGINT UNSIGNED NULL,
  record_count INT UNSIGNED NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL COMMENT 'When the file should be cleaned up',
  PRIMARY KEY (id),
  INDEX idx_church_user (church_id, user_id),
  INDEX idx_status (status),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- #52: Duplicate detection support — add fingerprint column to ocr_jobs
ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS content_fingerprint VARCHAR(64) NULL COMMENT 'SHA-256 of extracted text for dedup';
CREATE INDEX IF NOT EXISTS idx_fingerprint ON ocr_jobs (content_fingerprint);

-- #159: Retry scheduling
ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP NULL COMMENT 'When to next retry this job (backoff)';
CREATE INDEX IF NOT EXISTS idx_retry ON ocr_jobs (next_retry_at, status);
