-- Interactive Reports Delegation Workflow Tables (MySQL)
-- Created: 2025-01-XX

-- A) interactive_reports
CREATE TABLE IF NOT EXISTS interactive_reports (
  id CHAR(36) PRIMARY KEY,
  church_id INT NOT NULL,
  record_type VARCHAR(20) NOT NULL CHECK (record_type IN ('baptism', 'marriage', 'funeral')),
  created_by_user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  filters_json JSON DEFAULT '{}',
  allowed_fields_json JSON DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'in_progress', 'completed', 'revoked')),
  expires_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_interactive_reports_church_id ON interactive_reports(church_id);
CREATE INDEX idx_interactive_reports_created_by ON interactive_reports(created_by_user_id);
CREATE INDEX idx_interactive_reports_status ON interactive_reports(status);
CREATE INDEX idx_interactive_reports_expires_at ON interactive_reports(expires_at);

-- B) interactive_report_recipients
CREATE TABLE IF NOT EXISTS interactive_report_recipients (
  id CHAR(36) PRIMARY KEY,
  report_id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'submitted', 'revoked')),
  last_opened_at DATETIME,
  submitted_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES interactive_reports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_interactive_report_recipients_report_id ON interactive_report_recipients(report_id);
CREATE INDEX idx_interactive_report_recipients_token_hash ON interactive_report_recipients(token_hash);
CREATE INDEX idx_interactive_report_recipients_email ON interactive_report_recipients(email);

-- C) interactive_report_assignments
CREATE TABLE IF NOT EXISTS interactive_report_assignments (
  id CHAR(36) PRIMARY KEY,
  report_id CHAR(36) NOT NULL,
  recipient_id CHAR(36) NOT NULL,
  record_id INT NOT NULL,
  record_table VARCHAR(50) NOT NULL CHECK (record_table IN ('baptism_records', 'marriage_records', 'funeral_records')),
  record_context_json JSON DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_assignment (report_id, recipient_id, record_id, record_table),
  FOREIGN KEY (report_id) REFERENCES interactive_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES interactive_report_recipients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_interactive_report_assignments_report_id ON interactive_report_assignments(report_id);
CREATE INDEX idx_interactive_report_assignments_recipient_id ON interactive_report_assignments(recipient_id);
CREATE INDEX idx_interactive_report_assignments_record ON interactive_report_assignments(record_table, record_id);

-- D) interactive_report_submissions
CREATE TABLE IF NOT EXISTS interactive_report_submissions (
  id CHAR(36) PRIMARY KEY,
  report_id CHAR(36) NOT NULL,
  recipient_id CHAR(36) NOT NULL,
  submitted_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES interactive_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES interactive_report_recipients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_interactive_report_submissions_report_id ON interactive_report_submissions(report_id);
CREATE INDEX idx_interactive_report_submissions_recipient_id ON interactive_report_submissions(recipient_id);

-- E) interactive_report_patches
CREATE TABLE IF NOT EXISTS interactive_report_patches (
  id CHAR(36) PRIMARY KEY,
  report_id CHAR(36) NOT NULL,
  recipient_id CHAR(36) NOT NULL,
  record_id INT NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  old_value_snapshot TEXT,
  new_value TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  decided_by_user_id INT,
  decided_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_patch (report_id, recipient_id, record_id, field_key),
  FOREIGN KEY (report_id) REFERENCES interactive_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES interactive_report_recipients(id) ON DELETE CASCADE,
  FOREIGN KEY (decided_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_interactive_report_patches_report_id ON interactive_report_patches(report_id);
CREATE INDEX idx_interactive_report_patches_recipient_id ON interactive_report_patches(recipient_id);
CREATE INDEX idx_interactive_report_patches_record_id ON interactive_report_patches(record_id);
CREATE INDEX idx_interactive_report_patches_status ON interactive_report_patches(status);

-- F) interactive_report_audit
CREATE TABLE IF NOT EXISTS interactive_report_audit (
  id CHAR(36) PRIMARY KEY,
  report_id CHAR(36) NOT NULL,
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('priest', 'recipient', 'system')),
  actor_identifier VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  details_json JSON DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES interactive_reports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_interactive_report_audit_report_id ON interactive_report_audit(report_id);
CREATE INDEX idx_interactive_report_audit_actor ON interactive_report_audit(actor_type, actor_identifier);
CREATE INDEX idx_interactive_report_audit_created_at ON interactive_report_audit(created_at);
