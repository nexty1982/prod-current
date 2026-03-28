-- Migration: Add onboarding_phase to churches table
-- Phase 1: Infancy (row only, no tenant DB, no users)
-- Phase 2: Child (info filled, tenant DB created, no users)
-- Phase 3: Adult (tenant DB with records seeded)
-- Phase 4-5: TBD (future phases)
-- NULL = legacy/live church (not in onboarding pipeline)

ALTER TABLE churches ADD COLUMN onboarding_phase TINYINT UNSIGNED DEFAULT NULL
  COMMENT 'Onboarding phase 1-5, NULL=live/legacy' AFTER is_active;

ALTER TABLE churches ADD COLUMN crm_lead_id INT DEFAULT NULL
  COMMENT 'Links back to omai_crm_leads.id' AFTER onboarding_phase;

-- Index for pipeline board queries
ALTER TABLE churches ADD INDEX idx_onboarding_phase (onboarding_phase);
ALTER TABLE churches ADD INDEX idx_crm_lead_id (crm_lead_id);
