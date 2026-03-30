-- Migration: Add severity traceability to workflow_learning_registry
-- Date: 2026-03-30
-- Purpose: Track WHY a pattern has its current severity — category default,
--          threshold escalation, or manual override. Ensures injection priority
--          is based on truthful, traceable severity assignments.

ALTER TABLE workflow_learning_registry
  ADD COLUMN base_severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium'
    COMMENT 'Original severity from category definition — never changes'
    AFTER severity,
  ADD COLUMN severity_source ENUM('category_default', 'threshold_escalated', 'manual_override') NOT NULL DEFAULT 'category_default'
    COMMENT 'How current severity was determined'
    AFTER base_severity,
  ADD COLUMN override_by VARCHAR(100) NULL
    COMMENT 'Who performed manual severity override (null if not overridden)'
    AFTER severity_source,
  ADD COLUMN override_at TIMESTAMP NULL
    COMMENT 'When manual severity override happened'
    AFTER override_by,
  ADD COLUMN override_previous_severity ENUM('low', 'medium', 'high', 'critical') NULL
    COMMENT 'Severity before manual override (for audit trail)'
    AFTER override_at;

-- Backfill: set base_severity = severity for existing records (they were all category defaults)
UPDATE workflow_learning_registry SET base_severity = severity WHERE base_severity = 'medium';

-- For records that were manually overridden via setSeverity in prompt 017 testing,
-- we cannot recover the original — set their base_severity from the known category defaults
-- (this is a one-time correction for test data only)
