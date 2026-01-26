-- audit_auth_references_2025-08-09_1916.sql
-- Purpose: enumerate every remaining reference to legacy users, missing FKs on user_id-like columns,
--          and views hitting users/_users_legacy so we can finish the migration confidently.

/* 1) Foreign keys that still point to orthodoxmetrics_db._users_legacy */
SELECT
  rc.CONSTRAINT_SCHEMA,
  kcu.TABLE_NAME,
  kcu.COLUMN_NAME,
  rc.CONSTRAINT_NAME,
  kcu.REFERENCED_TABLE_SCHEMA,
  kcu.REFERENCED_TABLE_NAME,
  rc.UPDATE_RULE,
  rc.DELETE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS rc
JOIN information_schema.KEY_COLUMN_USAGE kcu
  ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
 AND rc.CONSTRAINT_NAME  = kcu.CONSTRAINT_NAME
WHERE kcu.REFERENCED_TABLE_SCHEMA = 'orthodoxmetrics_db'
  AND kcu.REFERENCED_TABLE_NAME = '_users_legacy'
ORDER BY kcu.TABLE_NAME, kcu.COLUMN_NAME;

/* 2) FKs that already point to auth users (sanity) */
SELECT
  rc.CONSTRAINT_SCHEMA,
  kcu.TABLE_NAME,
  kcu.COLUMN_NAME,
  rc.CONSTRAINT_NAME,
  kcu.REFERENCED_TABLE_SCHEMA,
  kcu.REFERENCED_TABLE_NAME,
  rc.UPDATE_RULE,
  rc.DELETE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS rc
JOIN information_schema.KEY_COLUMN_USAGE kcu
  ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
 AND rc.CONSTRAINT_NAME  = kcu.CONSTRAINT_NAME
WHERE kcu.REFERENCED_TABLE_SCHEMA = 'orthodoxmetrics_db'
  AND kcu.REFERENCED_TABLE_NAME = 'users'
  AND kcu.TABLE_SCHEMA = 'orthodoxmetrics_db'
ORDER BY kcu.TABLE_NAME, kcu.COLUMN_NAME;

/* 3) Tables with a user-ish column but NO FK */
SELECT c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE
FROM information_schema.COLUMNS c
LEFT JOIN (
  SELECT DISTINCT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA='orthodoxmetrics_db' AND REFERENCED_TABLE_NAME IS NOT NULL
) fk ON fk.TABLE_SCHEMA=c.TABLE_SCHEMA AND fk.TABLE_NAME=c.TABLE_NAME AND fk.COLUMN_NAME=c.COLUMN_NAME
WHERE c.TABLE_SCHEMA='orthodoxmetrics_db'
  AND c.COLUMN_NAME IN ('user_id','created_by','updated_by','owner_id','author_id','sender_id','requester_id','addressee_id','actor_id')
  AND fk.COLUMN_NAME IS NULL
ORDER BY c.TABLE_NAME, c.COLUMN_NAME;

/* 4) Views that reference users/_users_legacy (definitions may be truncated in metadata on some versions) */
SELECT TABLE_NAME, VIEW_DEFINITION
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA='orthodoxmetrics_db'
  AND (VIEW_DEFINITION LIKE '% users %' OR VIEW_DEFINITION LIKE '%`users`%' OR VIEW_DEFINITION LIKE '%_users_legacy%');

/* 5) Role/permission tables still in app DB */
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA='orthodoxmetrics_db'
  AND TABLE_NAME IN ('roles','permissions','user_roles','role_permissions');

/* 6) Notification tables likely tied to users (check FKs) */
SELECT kcu.TABLE_NAME, kcu.COLUMN_NAME, kcu.REFERENCED_TABLE_SCHEMA, kcu.REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE kcu
WHERE kcu.TABLE_SCHEMA='orthodoxmetrics_db'
  AND kcu.TABLE_NAME IN ('notifications','notification_queue','notification_history','notification_subscriptions','push_subscriptions','task_notifications')
  AND (kcu.COLUMN_NAME LIKE '%user%' OR kcu.COLUMN_NAME LIKE '%recipient%' OR kcu.COLUMN_NAME LIKE '%actor%');
