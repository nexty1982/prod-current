-- Add agent assignment and change set linkage to prompt_plans
-- Supports agent-assigned plans where AI agents work through ordered prompt stages
-- and generated work items auto-link to a Change Set

ALTER TABLE prompt_plans
  ADD COLUMN assigned_agent VARCHAR(20) NULL DEFAULT NULL AFTER description,
  ADD COLUMN change_set_id INT NULL DEFAULT NULL AFTER assigned_agent,
  ADD INDEX idx_assigned_agent (assigned_agent),
  ADD INDEX idx_change_set_id (change_set_id);
