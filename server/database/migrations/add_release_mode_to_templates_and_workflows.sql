-- Migration: Add release_mode to workflow_templates and prompt_workflows
-- Purpose: Enable release_mode propagation chain: template → workflow → prompt
-- Safe: Uses ADD COLUMN IF NOT EXISTS pattern, NULL default preserves existing data

-- 1. Add release_mode to workflow_templates (template-level default)
ALTER TABLE workflow_templates
  ADD COLUMN IF NOT EXISTS release_mode ENUM('manual','auto_safe','auto_full') DEFAULT NULL;

-- 2. Add release_mode to prompt_workflows (workflow-level override)
ALTER TABLE prompt_workflows
  ADD COLUMN IF NOT EXISTS release_mode ENUM('manual','auto_safe','auto_full') DEFAULT NULL;

-- NOTE: om_prompt_registry already has release_mode with DEFAULT 'manual'.
-- Existing prompts with release_mode='manual' are NOT retroactively changed.
-- Only newly generated prompts will inherit from workflow/template chain.
