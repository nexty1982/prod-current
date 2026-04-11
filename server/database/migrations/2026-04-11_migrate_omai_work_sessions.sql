-- OMD-1271: Unify Start Work timer
--
-- Migrate legacy rows from omai_db.omai_work_sessions into
-- orthodoxmetrics_db.work_sessions so the single-source-of-truth table has
-- the full history. After this runs, omai_db.omai_work_sessions becomes a
-- read-only legacy table; new sessions are written to work_sessions only.
--
-- Field mapping:
--   omai_work_sessions.stopped_at   -> work_sessions.ended_at
--   omai_work_sessions.start_source -> work_sessions.source_system (default 'omai')
--   omai_work_sessions.context_json -> work_sessions.start_context
--   omai_work_sessions.manual_notes -> work_sessions.summary_note
--   omai_work_sessions.stop_reason  -> work_sessions.end_context (wrapped as JSON)
--   status 'stopped'                -> 'completed'
--   status 'active'                 -> 'active' (preserved — see note below)
--
-- NOTE: Any rows with status='active' here would belong to currently running
-- sessions in OMAI's legacy table. Since the new Berry frontend switches to
-- /api/work-sessions/* after this migration runs, any such in-flight OMAI
-- session is converted to an active row in work_sessions and the unified
-- timer will pick it up on next page load.
--
-- This migration is idempotent via a "migration_source" marker in
-- start_context.migrated_from so re-running it skips already-migrated rows.

INSERT INTO orthodoxmetrics_db.work_sessions (
  user_id,
  source_system,
  started_at,
  ended_at,
  duration_seconds,
  status,
  start_context,
  end_context,
  summary_note,
  created_at,
  updated_at
)
SELECT
  o.user_id,
  COALESCE(NULLIF(o.start_source, ''), 'omai')                         AS source_system,
  o.started_at,
  o.stopped_at                                                         AS ended_at,
  o.duration_seconds,
  CASE o.status
    WHEN 'stopped' THEN 'completed'
    WHEN 'active'  THEN 'active'
    ELSE o.status
  END                                                                  AS status,
  JSON_OBJECT(
    'migrated_from', 'omai_work_sessions',
    'legacy_id',     o.id,
    'original',      IFNULL(o.context_json, JSON_OBJECT())
  )                                                                    AS start_context,
  CASE WHEN o.stop_reason IS NOT NULL
       THEN JSON_OBJECT('stop_reason', o.stop_reason)
       ELSE NULL
  END                                                                  AS end_context,
  o.manual_notes                                                       AS summary_note,
  o.created_at,
  o.updated_at
FROM omai_db.omai_work_sessions o
WHERE NOT EXISTS (
  SELECT 1 FROM orthodoxmetrics_db.work_sessions ws
  WHERE JSON_EXTRACT(ws.start_context, '$.migrated_from') = 'omai_work_sessions'
    AND JSON_EXTRACT(ws.start_context, '$.legacy_id')     = o.id
);

-- Optional sanity output (run manually if desired):
-- SELECT status, COUNT(*) FROM orthodoxmetrics_db.work_sessions GROUP BY status;
-- SELECT JSON_EXTRACT(start_context, '$.legacy_id') legacy_id, source_system, status, started_at, ended_at
--   FROM orthodoxmetrics_db.work_sessions
--   WHERE JSON_EXTRACT(start_context, '$.migrated_from') = 'omai_work_sessions';
