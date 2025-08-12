-- repair_auth_session_orphans_2025-08-09_1940.sql
-- Purpose: clean up orphans in orthodoxmetrics_auth_db.{
--   sessions (FK -> users.id ON DELETE SET NULL),
--   user_sessions (FK -> users.id ON DELETE CASCADE),
--   user_sessions_social (FK -> users.id ON DELETE CASCADE)
-- } so FK creation succeeds.

/* Preview: counts of rows whose user_id doesn't exist in auth.users */
SELECT 'sessions' AS tbl, COUNT(*) AS orphans
FROM orthodoxmetrics_auth_db.sessions s
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id = s.user_id
WHERE s.user_id IS NOT NULL AND u.id IS NULL
UNION ALL
SELECT 'user_sessions', COUNT(*)
FROM orthodoxmetrics_auth_db.user_sessions s
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id = s.user_id
WHERE s.user_id IS NOT NULL AND u.id IS NULL
UNION ALL
SELECT 'user_sessions_social', COUNT(*)
FROM orthodoxmetrics_auth_db.user_sessions_social s
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id = s.user_id
WHERE s.user_id IS NOT NULL AND u.id IS NULL;

/* Fix strategy:
   - sessions: NULL out user_id (matches FK ON DELETE SET NULL)
   - user_sessions / user_sessions_social: DELETE orphans (recommended for stale sessions)
     If you prefer to remap to a fallback user, uncomment the REMAP block and set @FALLBACK_USER_ID.
*/

/* NULL out in sessions */
UPDATE orthodoxmetrics_auth_db.sessions s
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id = s.user_id
SET s.user_id = NULL
WHERE s.user_id IS NOT NULL AND u.id IS NULL;

/* DELETE in user_sessions* (recommended) */
DELETE s FROM orthodoxmetrics_auth_db.user_sessions s
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id = s.user_id
WHERE s.user_id IS NOT NULL AND u.id IS NULL;

DELETE s FROM orthodoxmetrics_auth_db.user_sessions_social s
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id = s.user_id
WHERE s.user_id IS NOT NULL AND u.id IS NULL;

/* -- REMAP OPTION (alternative to DELETE):
SET @FALLBACK_USER_ID = 1;  -- change if desired
UPDATE orthodoxmetrics_auth_db.user_sessions s
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id = s.user_id
SET s.user_id = @FALLBACK_USER_ID
WHERE s.user_id IS NOT NULL AND u.id IS NULL;

UPDATE orthodoxmetrics_auth_db.user_sessions_social s
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id = s.user_id
SET s.user_id = @FALLBACK_USER_ID
WHERE s.user_id IS NOT NULL AND u.id IS NULL;
*/

/* Post-check */
SELECT 'sessions' AS tbl, COUNT(*) AS remaining_orphans
FROM orthodoxmetrics_auth_db.sessions s
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id = s.user_id
WHERE s.user_id IS NOT NULL AND u.id IS NULL
UNION ALL
SELECT 'user_sessions', COUNT(*)
FROM orthodoxmetrics_auth_db.user_sessions s
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id = s.user_id
WHERE s.user_id IS NOT NULL AND u.id IS NULL
UNION ALL
SELECT 'user_sessions_social', COUNT(*)
FROM orthodoxmetrics_auth_db.user_sessions_social s
LEFT JOIN orthodoxmetrics_auth_db.users u ON u.id = s.user_id
WHERE s.user_id IS NOT NULL AND u.id IS NULL;
