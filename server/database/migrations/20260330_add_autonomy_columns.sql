-- Migration: Add autonomy support columns
-- Date: 2026-03-30
-- Purpose: Add manual_only flags and autonomy pause tracking for controlled autonomous workflow advancement

-- 1. prompt_workflows: autonomy pause state + manual_only flag
ALTER TABLE prompt_workflows
  ADD COLUMN manual_only TINYINT(1) NOT NULL DEFAULT 0 AFTER template_version,
  ADD COLUMN autonomy_paused TINYINT(1) NOT NULL DEFAULT 0 AFTER manual_only,
  ADD COLUMN autonomy_pause_reason TEXT DEFAULT NULL AFTER autonomy_paused,
  ADD COLUMN autonomy_paused_at TIMESTAMP NULL DEFAULT NULL AFTER autonomy_pause_reason,
  ADD COLUMN autonomy_resumed_at TIMESTAMP NULL DEFAULT NULL AFTER autonomy_paused_at;

-- 2. prompt_workflow_steps: per-step manual_only flag
ALTER TABLE prompt_workflow_steps
  ADD COLUMN manual_only TINYINT(1) NOT NULL DEFAULT 0 AFTER prompt_id;

-- 3. om_prompt_registry: per-prompt manual_only flag
ALTER TABLE om_prompt_registry
  ADD COLUMN manual_only TINYINT(1) NOT NULL DEFAULT 0 AFTER previous_quality_score;
