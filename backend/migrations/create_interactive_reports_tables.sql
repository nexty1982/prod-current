-- Interactive Reports Delegation Workflow Tables
-- Created: 2025-01-XX

-- A) interactive_reports
CREATE TABLE IF NOT EXISTS interactive_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  record_type VARCHAR(20) NOT NULL CHECK (record_type IN ('baptism', 'marriage', 'funeral')),
  created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  filters_json JSONB DEFAULT '{}',
  allowed_fields_json JSONB DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'in_progress', 'completed', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interactive_reports_church_id ON interactive_reports(church_id);
CREATE INDEX idx_interactive_reports_created_by ON interactive_reports(created_by_user_id);
CREATE INDEX idx_interactive_reports_status ON interactive_reports(status);
CREATE INDEX idx_interactive_reports_expires_at ON interactive_reports(expires_at) WHERE expires_at IS NOT NULL;

-- B) interactive_report_recipients
CREATE TABLE IF NOT EXISTS interactive_report_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES interactive_reports(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'submitted', 'revoked')),
  last_opened_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interactive_report_recipients_report_id ON interactive_report_recipients(report_id);
CREATE INDEX idx_interactive_report_recipients_token_hash ON interactive_report_recipients(token_hash);
CREATE INDEX idx_interactive_report_recipients_email ON interactive_report_recipients(email);

-- C) interactive_report_assignments
CREATE TABLE IF NOT EXISTS interactive_report_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES interactive_reports(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES interactive_report_recipients(id) ON DELETE CASCADE,
  record_id INTEGER NOT NULL,
  record_table VARCHAR(50) NOT NULL CHECK (record_table IN ('baptism_records', 'marriage_records', 'funeral_records')),
  record_context_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(report_id, recipient_id, record_id, record_table)
);

CREATE INDEX idx_interactive_report_assignments_report_id ON interactive_report_assignments(report_id);
CREATE INDEX idx_interactive_report_assignments_recipient_id ON interactive_report_assignments(recipient_id);
CREATE INDEX idx_interactive_report_assignments_record ON interactive_report_assignments(record_table, record_id);

-- D) interactive_report_submissions
CREATE TABLE IF NOT EXISTS interactive_report_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES interactive_reports(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES interactive_report_recipients(id) ON DELETE CASCADE,
  submitted_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interactive_report_submissions_report_id ON interactive_report_submissions(report_id);
CREATE INDEX idx_interactive_report_submissions_recipient_id ON interactive_report_submissions(recipient_id);

-- E) interactive_report_patches
CREATE TABLE IF NOT EXISTS interactive_report_patches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES interactive_reports(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES interactive_report_recipients(id) ON DELETE CASCADE,
  record_id INTEGER NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  old_value_snapshot TEXT,
  new_value TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  decided_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(report_id, recipient_id, record_id, field_key)
);

CREATE INDEX idx_interactive_report_patches_report_id ON interactive_report_patches(report_id);
CREATE INDEX idx_interactive_report_patches_recipient_id ON interactive_report_patches(recipient_id);
CREATE INDEX idx_interactive_report_patches_record_id ON interactive_report_patches(record_id);
CREATE INDEX idx_interactive_report_patches_status ON interactive_report_patches(status);

-- F) interactive_report_audit
CREATE TABLE IF NOT EXISTS interactive_report_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES interactive_reports(id) ON DELETE CASCADE,
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('priest', 'recipient', 'system')),
  actor_identifier VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  details_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interactive_report_audit_report_id ON interactive_report_audit(report_id);
CREATE INDEX idx_interactive_report_audit_actor ON interactive_report_audit(actor_type, actor_identifier);
CREATE INDEX idx_interactive_report_audit_created_at ON interactive_report_audit(created_at);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_interactive_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_interactive_reports_updated_at
  BEFORE UPDATE ON interactive_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_interactive_reports_updated_at();
