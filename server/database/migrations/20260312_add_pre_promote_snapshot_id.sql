-- Add pre_promote_snapshot_id to change_sets
-- Stores the snapshot ID created automatically before a change set is promoted to production.
-- Enables one-click rollback via the code-safety snapshot system.
ALTER TABLE change_sets ADD COLUMN pre_promote_snapshot_id VARCHAR(20) DEFAULT NULL AFTER rejection_reason;
