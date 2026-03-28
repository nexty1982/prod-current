-- ============================================================
-- Migration: Simplify CRM Pipeline from 19 stages to 5 + terminals
-- Date: 2026-03-28
--
-- New "Sane Solo" Pipeline:
--   1. Prospects      (was: new_lead)
--   2. Engagement     (was: contacted, demo_scheduled, awaiting_info, demo_completed, awaiting_response)
--   3. Review & Proposal (was: record_review, proposal_sent, negotiation)
--   4. Deployment     (was: ready_provision, provisioning, onboarding)
--   5. Active Parish  (was: won, active, setup_complete)
--   + blocked, lost, not_interested, closed_lost (unchanged)
-- ============================================================

-- Step 1: Remap existing leads to new stage keys BEFORE deleting old stages
UPDATE omai_crm_leads SET pipeline_stage = 'prospects' WHERE pipeline_stage = 'new_lead';
UPDATE omai_crm_leads SET pipeline_stage = 'engagement' WHERE pipeline_stage IN ('contacted', 'demo_scheduled', 'awaiting_info', 'demo_completed', 'awaiting_response');
UPDATE omai_crm_leads SET pipeline_stage = 'review_proposal' WHERE pipeline_stage IN ('record_review', 'proposal_sent', 'negotiation');
UPDATE omai_crm_leads SET pipeline_stage = 'deployment' WHERE pipeline_stage IN ('ready_provision', 'provisioning', 'onboarding');
UPDATE omai_crm_leads SET pipeline_stage = 'active_parish' WHERE pipeline_stage IN ('won', 'active', 'setup_complete');

-- Step 2: Delete all old stages
DELETE FROM omai_crm_pipeline_stages;

-- Step 3: Insert new simplified stages
INSERT INTO omai_crm_pipeline_stages (stage_key, label, color, sort_order, is_terminal) VALUES
  ('prospects',       'Prospects',          '#64748b', 10, 0),
  ('engagement',      'Engagement',         '#3b82f6', 20, 0),
  ('review_proposal', 'Review & Proposal',  '#8b5cf6', 30, 0),
  ('deployment',      'Deployment',         '#f59e0b', 40, 0),
  ('active_parish',   'Active Parish',      '#22c55e', 50, 0),
  ('blocked',         'Blocked',            '#ef4444', 90, 0),
  ('lost',            'Lost',               '#6b7280', 95, 1),
  ('not_interested',  'Not Interested',     '#9ca3af', 96, 1),
  ('closed_lost',     'Closed / Lost',      '#4b5563', 99, 1);

-- Step 4: Update default value for new leads
ALTER TABLE omai_crm_leads MODIFY COLUMN pipeline_stage VARCHAR(50) NOT NULL DEFAULT 'prospects';
