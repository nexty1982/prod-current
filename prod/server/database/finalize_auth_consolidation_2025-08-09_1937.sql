-- patch_finalize_auth_consolidation_2025-08-09_1939.sql
-- Purpose: make the earlier finalization robust against schema drift.
-- Fixes the error: Unknown column 'updated_at' in 'INSERT INTO' for orthodoxmetrics_auth_db.roles

/* 0) Ensure auth.roles exists and has expected columns */
CREATE TABLE IF NOT EXISTS orthodoxmetrics_auth_db.roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add timestamps if missing (MariaDB supports IF NOT EXISTS on ADD COLUMN)
ALTER TABLE orthodoxmetrics_auth_db.roles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

/* 1) Copy roles from app -> auth using a minimal column set that always exists */
INSERT IGNORE INTO orthodoxmetrics_auth_db.roles (id, name, description)
SELECT id, name, description FROM orthodoxmetrics_db.roles;

/* 2) Sessions/user_sessions/user_sessions_social: only create/copy if auth is missing them */
-- sessions
CREATE TABLE IF NOT EXISTS orthodoxmetrics_auth_db.sessions LIKE orthodoxmetrics_db.sessions;
INSERT IGNORE INTO orthodoxmetrics_auth_db.sessions SELECT * FROM orthodoxmetrics_db.sessions;
ALTER TABLE orthodoxmetrics_auth_db.sessions
  DROP FOREIGN KEY IF EXISTS fk_auth_sessions_user;
ALTER TABLE orthodoxmetrics_auth_db.sessions
  ADD CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_auth_db.users(id) ON DELETE SET NULL ON UPDATE RESTRICT;

-- user_sessions
CREATE TABLE IF NOT EXISTS orthodoxmetrics_auth_db.user_sessions LIKE orthodoxmetrics_db.user_sessions;
INSERT IGNORE INTO orthodoxmetrics_auth_db.user_sessions SELECT * FROM orthodoxmetrics_db.user_sessions;
ALTER TABLE orthodoxmetrics_auth_db.user_sessions
  DROP FOREIGN KEY IF EXISTS fk_auth_user_sessions_user;
ALTER TABLE orthodoxmetrics_auth_db.user_sessions
  ADD CONSTRAINT fk_auth_user_sessions_user FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_auth_db.users(id) ON DELETE CASCADE ON UPDATE RESTRICT;

-- user_sessions_social
CREATE TABLE IF NOT EXISTS orthodoxmetrics_auth_db.user_sessions_social LIKE orthodoxmetrics_db.user_sessions_social;
INSERT IGNORE INTO orthodoxmetrics_auth_db.user_sessions_social SELECT * FROM orthodoxmetrics_db.user_sessions_social;
ALTER TABLE orthodoxmetrics_auth_db.user_sessions_social
  DROP FOREIGN KEY IF EXISTS fk_auth_user_sessions_social_user;
ALTER TABLE orthodoxmetrics_auth_db.user_sessions_social
  ADD CONSTRAINT fk_auth_user_sessions_social_user FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_auth_db.users(id) ON DELETE CASCADE ON UPDATE RESTRICT;

/* 3) Rename app duplicates to _..._legacy (guarded) */
SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA='orthodoxmetrics_db' AND TABLE_NAME='roles'),
  'RENAME TABLE orthodoxmetrics_db.roles TO orthodoxmetrics_db._roles_legacy', 'SELECT "skip rename roles"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA='orthodoxmetrics_db' AND TABLE_NAME='sessions'),
  'RENAME TABLE orthodoxmetrics_db.sessions TO orthodoxmetrics_db._sessions_legacy', 'SELECT "skip rename sessions"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA='orthodoxmetrics_db' AND TABLE_NAME='user_sessions'),
  'RENAME TABLE orthodoxmetrics_db.user_sessions TO orthodoxmetrics_db._user_sessions_legacy', 'SELECT "skip rename user_sessions"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA='orthodoxmetrics_db' AND TABLE_NAME='user_sessions_social'),
  'RENAME TABLE orthodoxmetrics_db.user_sessions_social TO orthodoxmetrics_db._user_sessions_social_legacy', 'SELECT "skip rename user_sessions_social"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* 4) Report */
SELECT 'AUTH_BASE_TABLES' AS section, TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA='orthodoxmetrics_auth_db' AND TABLE_TYPE='BASE TABLE'
ORDER BY TABLE_NAME;

SELECT 'APP_IAM_DUPES' AS section, TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA='orthodoxmetrics_db'
  AND TABLE_NAME IN ('users','roles','permissions','user_roles','role_permissions','sessions','user_sessions','user_sessions_social',
                     '_roles_legacy','_permissions_legacy','_role_permissions_legacy','_user_roles_legacy','_sessions_legacy',
                     '_user_sessions_legacy','_user_sessions_social_legacy')
ORDER BY TABLE_NAME;
