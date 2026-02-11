-- Migration: Add setup_status to churches table
-- File: server/database/migrations/add_church_setup_status.sql

-- Add setup_status column to track church setup progress
ALTER TABLE churches ADD COLUMN setup_status JSON DEFAULT NULL;

-- Add index for efficient querying
CREATE INDEX idx_churches_setup_status ON churches((JSON_EXTRACT(setup_status, '$.setup_step')));

-- Update existing churches to have basic setup status
UPDATE churches 
SET setup_status = JSON_OBJECT(
  'church_created', TRUE,
  'admin_user_created', TRUE,
  'templates_setup', FALSE,
  'setup_step', 'templates_pending',
  'created_at', created_at
) 
WHERE setup_status IS NULL;

-- Create view for church setup status overview
CREATE VIEW v_church_setup_status AS
SELECT 
  c.id,
  c.name,
  c.database_name,
  c.created_at,
  JSON_EXTRACT(c.setup_status, '$.church_created') as church_created,
  JSON_EXTRACT(c.setup_status, '$.admin_user_created') as admin_user_created,
  JSON_EXTRACT(c.setup_status, '$.templates_setup') as templates_setup,
  JSON_EXTRACT(c.setup_status, '$.setup_step') as setup_step,
  JSON_EXTRACT(c.setup_status, '$.templates_completed_at') as templates_completed_at,
  CASE 
    WHEN JSON_EXTRACT(c.setup_status, '$.setup_step') = 'complete' THEN 'Complete'
    WHEN JSON_EXTRACT(c.setup_status, '$.templates_setup') = FALSE THEN 'Templates Pending'
    ELSE 'In Progress'
  END as setup_status_display
FROM churches c
WHERE c.is_active = 1;
