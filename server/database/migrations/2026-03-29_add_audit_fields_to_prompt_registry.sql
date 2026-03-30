-- Migration: Add audit gate fields to om_prompt_registry
-- Purpose: Mandatory audit validation before any prompt can be approved or executed
-- Parent: 2026-03-29_create_om_prompt_registry.sql
-- Created: 2026-03-29

-- Add audit-related columns
ALTER TABLE `om_prompt_registry`
  ADD COLUMN `audit_status` ENUM('pending','pass','fail') NOT NULL DEFAULT 'pending'
    COMMENT 'Audit gate status — must be pass before ready/approve/execute' AFTER `guardrails_applied`,
  ADD COLUMN `audit_result` LONGTEXT DEFAULT NULL
    COMMENT 'Structured JSON audit result (sections found, prohibited language detected)' AFTER `audit_status`,
  ADD COLUMN `audit_notes` LONGTEXT DEFAULT NULL
    COMMENT 'Human-readable failure reasons and warnings' AFTER `audit_result`,
  ADD COLUMN `audited_at` TIMESTAMP NULL DEFAULT NULL
    COMMENT 'When the last audit was performed' AFTER `audit_notes`,
  ADD COLUMN `audited_by` VARCHAR(100) DEFAULT NULL
    COMMENT 'Who or what triggered the audit' AFTER `audited_at`;

-- Add new status value 'audited' to the status enum
ALTER TABLE `om_prompt_registry`
  MODIFY COLUMN `status` ENUM('draft','audited','ready','approved','executing','complete','verified','rejected')
    NOT NULL DEFAULT 'draft';

-- Index for filtering by audit_status
ALTER TABLE `om_prompt_registry`
  ADD KEY `idx_registry_audit_status` (`audit_status`);

-- Composite index for common query: status + audit_status
ALTER TABLE `om_prompt_registry`
  ADD KEY `idx_registry_status_audit` (`status`, `audit_status`);

SELECT 'Audit fields added to om_prompt_registry successfully' AS message;
