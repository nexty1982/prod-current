-- db_schema_diff_2025-08-09_1936.sql
-- Purpose: compare table inventories between orthodoxmetrics_db and orthodoxmetrics_auth_db.

/* Counts (base tables vs views) */
SELECT 'orthodoxmetrics_db' AS db, TABLE_TYPE, COUNT(*) AS cnt
FROM information_schema.TABLES
WHERE TABLE_SCHEMA='orthodoxmetrics_db'
GROUP BY TABLE_TYPE
UNION ALL
SELECT 'orthodoxmetrics_auth_db', TABLE_TYPE, COUNT(*)
FROM information_schema.TABLES
WHERE TABLE_SCHEMA='orthodoxmetrics_auth_db'
GROUP BY TABLE_TYPE;

/* Tables present in BOTH schemas (name collisions) */
SELECT t1.TABLE_NAME
FROM information_schema.TABLES t1
JOIN information_schema.TABLES t2
  ON t2.TABLE_SCHEMA='orthodoxmetrics_auth_db' AND t2.TABLE_NAME=t1.TABLE_NAME
WHERE t1.TABLE_SCHEMA='orthodoxmetrics_db'
ORDER BY t1.TABLE_NAME;

/* Only in orthodoxmetrics_db */
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA='orthodoxmetrics_db'
  AND TABLE_NAME NOT IN (
    SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='orthodoxmetrics_auth_db'
  )
ORDER BY TABLE_NAME;

/* Only in orthodoxmetrics_auth_db */
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA='orthodoxmetrics_auth_db'
  AND TABLE_NAME NOT IN (
    SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='orthodoxmetrics_db'
  )
ORDER BY TABLE_NAME;

/* Sanity: expected auth tables (should exist only in auth) */
SELECT TABLE_NAME FROM information_schema.TABLES
WHERE TABLE_SCHEMA='orthodoxmetrics_auth_db'
  AND TABLE_NAME IN ('users','roles','permissions','user_roles','role_permissions','user_sessions','user_sessions_social','sessions')
ORDER BY TABLE_NAME;

/* Sanity: lingering auth-like tables in app DB (should NOT exist in app after cutover) */
SELECT TABLE_NAME FROM information_schema.TABLES
WHERE TABLE_SCHEMA='orthodoxmetrics_db'
  AND TABLE_NAME IN ('users','roles','permissions','user_roles','role_permissions','user_sessions','user_sessions_social','sessions')
ORDER BY TABLE_NAME;
