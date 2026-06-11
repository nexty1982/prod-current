-- Church client classification + billing + contact outreach phases
-- 2026-06-11 | CCC enrollment & church management workflow

-- Idempotent column adds (ignore duplicate column errors)
ALTER TABLE churches
  ADD COLUMN client_status ENUM(
    'directory','pre_onboarded','enrolling','active_paid','suspended','decommissioned'
  ) NOT NULL DEFAULT 'pre_onboarded' AFTER setup_complete;

ALTER TABLE churches
  ADD COLUMN billing_status ENUM(
    'not_configured','trial','invoice_sent','payment_pending','paid','past_due','waived','cancelled'
  ) NOT NULL DEFAULT 'not_configured' AFTER client_status;

ALTER TABLE churches
  ADD COLUMN contact_phase VARCHAR(40) NOT NULL DEFAULT 'none' AFTER billing_status;

ALTER TABLE churches
  ADD COLUMN contact_phase_due DATE NULL AFTER contact_phase;

ALTER TABLE churches
  ADD COLUMN contact_phase_notes TEXT NULL AFTER contact_phase_due;

ALTER TABLE churches
  ADD COLUMN paid_at TIMESTAMP NULL AFTER contact_phase_notes;

CREATE INDEX idx_churches_client_status ON churches (client_status);
CREATE INDEX idx_churches_billing_status ON churches (billing_status);
CREATE INDEX idx_churches_contact_phase ON churches (contact_phase);

ALTER TABLE omai_crm_leads
  ADD COLUMN contact_phase VARCHAR(40) NOT NULL DEFAULT 'none' AFTER pipeline_stage;

ALTER TABLE omai_crm_leads
  ADD COLUMN contact_phase_due DATE NULL AFTER contact_phase;

ALTER TABLE omai_crm_leads
  ADD COLUMN contact_phase_notes TEXT NULL AFTER contact_phase_due;

ALTER TABLE omai_crm_leads
  ADD COLUMN billing_status ENUM(
    'not_configured','trial','invoice_sent','payment_pending','paid','past_due','waived','cancelled'
  ) NOT NULL DEFAULT 'not_configured' AFTER contact_phase_notes;

CREATE INDEX idx_crm_contact_phase ON omai_crm_leads (contact_phase);
CREATE INDEX idx_crm_billing_status ON omai_crm_leads (billing_status);

-- ── Data truth: SS. Peter & Paul Manville is the only paid active client ──
UPDATE churches SET
  client_status = 'active_paid',
  billing_status = 'paid',
  onboarding_phase = 4,
  setup_complete = 1,
  is_active = 1,
  paid_at = COALESCE(paid_at, '2025-01-01 00:00:00'),
  contact_phase = 'none'
WHERE id = 46;

UPDATE omai_crm_leads SET
  provisioned_church_id = 46,
  is_client = 1,
  pipeline_stage = 'active_parish',
  billing_status = 'paid',
  contact_phase = 'none'
WHERE id = 80;

UPDATE churches SET crm_lead_id = 80 WHERE id = 46;

UPDATE churches SET client_status = 'decommissioned', is_active = 0
WHERE id IN (207, 278) OR LOWER(name) LIKE '%test church%' OR LOWER(name) LIKE '%cursor validation%';

UPDATE churches SET
  client_status = 'pre_onboarded',
  billing_status = 'not_configured',
  is_active = 0,
  setup_complete = 0
WHERE id NOT IN (46) AND client_status NOT IN ('decommissioned', 'active_paid', 'enrolling');

UPDATE omai_crm_leads SET
  is_client = 0,
  billing_status = 'not_configured'
WHERE id != 80 AND pipeline_stage = 'prospects';
