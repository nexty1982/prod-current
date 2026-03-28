-- =============================================================================
-- record_template1 Cleanup & Freeze
-- Date: 2026-03-28
-- Auditor: omsvc (claude_cli)
-- Backup: record_template1_backup_20260328.sql
-- =============================================================================
-- This script documents the changes applied during the Phase 1-5 audit.
-- It has already been executed. Kept for audit trail purposes.
-- =============================================================================

-- Phase 3: Remove stale data
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE marriage_history;  -- 8 test rows (church_id=14, May 2025)
TRUNCATE TABLE marriage_records;  -- 168 orphaned rows, AI was at 211
SET FOREIGN_KEY_CHECKS = 1;

-- Phase 4: AUTO_INCREMENT reset (handled by TRUNCATE above)
-- marriage_records: 211 → 1
-- marriage_history: 9 → 1
-- template_meta: kept at 2 (row id=1 still exists)

-- Phase 5: Add governance columns to template_meta
ALTER TABLE template_meta ADD COLUMN version VARCHAR(20) DEFAULT NULL AFTER source;
ALTER TABLE template_meta ADD COLUMN description TEXT DEFAULT NULL AFTER name;
ALTER TABLE template_meta ADD COLUMN updated_at DATETIME DEFAULT NULL;
ALTER TABLE template_meta ADD COLUMN frozen_at DATETIME DEFAULT NULL;
ALTER TABLE template_meta ADD COLUMN frozen_by VARCHAR(64) DEFAULT NULL;

-- Phase 5: Freeze metadata
UPDATE template_meta SET
  description = 'Canonical tenant database template. Audited and frozen 2026-03-28. All stale data removed, AUTO_INCREMENT values reset.',
  version = '1.1.0',
  updated_at = NOW(),
  frozen_at = NOW(),
  frozen_by = 'omsvc (claude_cli audit)'
WHERE id = 1;
