-- phase_b_repair_orphans_fallback1_2025-08-09_1926.sql
-- Purpose: Normalize orphaned user references using fallback user id = 1 or NULL per policy.
SET @FALLBACK_USER_ID = 1;

-- SET NULL targets
UPDATE orthodoxmetrics_db.admin_settings a
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id=a.created_by
SET a.created_by=NULL WHERE a.created_by IS NOT NULL AND u.id IS NULL;

UPDATE orthodoxmetrics_db.admin_settings a
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id=a.updated_by
SET a.updated_by=NULL WHERE a.updated_by IS NOT NULL AND u.id IS NULL;

UPDATE orthodoxmetrics_db.activity_log al
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id=al.user_id
SET al.user_id=NULL WHERE al.user_id IS NOT NULL AND u.id IS NULL;

UPDATE orthodoxmetrics_db.upload_logs ul
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id=ul.user_id
SET ul.user_id=NULL WHERE ul.user_id IS NOT NULL AND u.id IS NULL;

UPDATE orthodoxmetrics_db.kanban_board_members km
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id=km.invited_by
SET km.invited_by=NULL WHERE km.invited_by IS NOT NULL AND u.id IS NULL;

UPDATE orthodoxmetrics_db.backup_schedule_history bsh
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id=bsh.triggered_by
SET bsh.triggered_by=NULL WHERE bsh.triggered_by IS NOT NULL AND u.id IS NULL;

-- Fallback=1 targets (ownership/relations)
UPDATE orthodoxmetrics_db.kanban_boards kb
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id=kb.created_by
SET kb.created_by=@FALLBACK_USER_ID WHERE kb.created_by IS NOT NULL AND u.id IS NULL;

UPDATE orthodoxmetrics_db.kanban_board_members km
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id=km.user_id
SET km.user_id=@FALLBACK_USER_ID WHERE km.user_id IS NOT NULL AND u.id IS NULL;

UPDATE orthodoxmetrics_db.user_profiles up
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id=up.user_id
SET up.user_id=@FALLBACK_USER_ID WHERE up.user_id IS NOT NULL AND u.id IS NULL;

UPDATE orthodoxmetrics_db.user_social_settings uss
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id=uss.user_id
SET uss.user_id=@FALLBACK_USER_ID WHERE uss.user_id IS NOT NULL AND u.id IS NULL;

-- No-ops for others because your last preview showed zero orphans elsewhere.
