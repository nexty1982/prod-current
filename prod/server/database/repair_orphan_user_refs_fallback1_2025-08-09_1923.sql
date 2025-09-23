-- repair_orphan_user_refs_fallback1_2025-08-09_1923.sql
-- Purpose: Clean orphaned user references before adding FKs to orthodoxmetrics_db.users(id).
-- FALLBACK user is set to id=1 (System Administrator) in auth DB.
-- WARNING: Review RESTRICT-marked tables manually (no automatic update issued).
SET @FALLBACK_USER_ID = 1;

/* PREVIEW orphan counts */
SELECT 'activity_feed.actor_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.activity_feed t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.actor_id
WHERE t.actor_id IS NOT NULL AND u.id IS NULL;
SELECT 'activity_feed.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.activity_feed t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'activity_log.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.activity_log t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'activity_logs.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.activity_logs t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'admin_settings.created_by' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.admin_settings t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.created_by
WHERE t.created_by IS NOT NULL AND u.id IS NULL;
SELECT 'admin_settings.updated_by' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.admin_settings t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.updated_by
WHERE t.updated_by IS NOT NULL AND u.id IS NULL;
SELECT 'audit_logs.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.audit_logs t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'backup_restores.requested_by' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.backup_restores t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.requested_by
WHERE t.requested_by IS NOT NULL AND u.id IS NULL;
SELECT 'backup_schedule_history.triggered_by' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.backup_schedule_history t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.triggered_by
WHERE t.triggered_by IS NOT NULL AND u.id IS NULL;
SELECT 'blog_access_requests.blog_owner_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.blog_access_requests t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.blog_owner_id
WHERE t.blog_owner_id IS NOT NULL AND u.id IS NULL;
SELECT 'blog_access_requests.requester_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.blog_access_requests t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.requester_id
WHERE t.requester_id IS NOT NULL AND u.id IS NULL;
SELECT 'blog_categories.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.blog_categories t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'blog_comments.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.blog_comments t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'blog_posts.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.blog_posts t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'chat_conversations.created_by' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.chat_conversations t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.created_by
WHERE t.created_by IS NOT NULL AND u.id IS NULL;
SELECT 'chat_messages.sender_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.chat_messages t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.sender_id
WHERE t.sender_id IS NOT NULL AND u.id IS NULL;
SELECT 'chat_participants.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.chat_participants t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'church_admin_panel.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.church_admin_panel t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'friendships.addressee_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.friendships t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.addressee_id
WHERE t.addressee_id IS NOT NULL AND u.id IS NULL;
SELECT 'friendships.requester_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.friendships t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.requester_id
WHERE t.requester_id IS NOT NULL AND u.id IS NULL;
SELECT 'kanban_boards.created_by' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.kanban_boards t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.created_by
WHERE t.created_by IS NOT NULL AND u.id IS NULL;
SELECT 'kanban_board_members.invited_by' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.kanban_board_members t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.invited_by
WHERE t.invited_by IS NOT NULL AND u.id IS NULL;
SELECT 'kanban_board_members.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.kanban_board_members t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'kanban_tasks.assigned_to' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.kanban_tasks t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.assigned_to
WHERE t.assigned_to IS NOT NULL AND u.id IS NULL;
SELECT 'kanban_tasks.created_by' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.kanban_tasks t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.created_by
WHERE t.created_by IS NOT NULL AND u.id IS NULL;
SELECT 'kanban_task_activity.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.kanban_task_activity t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'kanban_task_attachments.uploaded_by' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.kanban_task_attachments t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.uploaded_by
WHERE t.uploaded_by IS NOT NULL AND u.id IS NULL;
SELECT 'kanban_task_comments.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.kanban_task_comments t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'notes.created_by' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.notes t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.created_by
WHERE t.created_by IS NOT NULL AND u.id IS NULL;
SELECT 'note_shares.shared_by' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.note_shares t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.shared_by
WHERE t.shared_by IS NOT NULL AND u.id IS NULL;
SELECT 'note_shares.shared_with_user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.note_shares t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.shared_with_user_id
WHERE t.shared_with_user_id IS NOT NULL AND u.id IS NULL;
SELECT 'notifications.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.notifications t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'notification_history.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.notification_history t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'notification_queue.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.notification_queue t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'push_subscriptions.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.push_subscriptions t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'social_media.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.social_media t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'social_reactions.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.social_reactions t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'upload_logs.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.upload_logs t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'user_notification_preferences.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.user_notification_preferences t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'user_profiles.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.user_profiles t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'user_sessions.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.user_sessions t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'user_sessions_social.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.user_sessions_social t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'user_social_settings.user_id' AS ref, COUNT(*) AS orphan_count
FROM orthodoxmetrics_db.user_social_settings t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
WHERE t.user_id IS NOT NULL AND u.id IS NULL;

/* FIX orphan references */
-- activity_feed.actor_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.activity_feed t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.actor_id
SET t.actor_id = @FALLBACK_USER_ID
WHERE t.actor_id IS NOT NULL AND u.id IS NULL;
-- activity_feed.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.activity_feed t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- activity_log.user_id: SET NULL for orphans
UPDATE orthodoxmetrics_db.activity_log t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = NULL
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- activity_logs.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.activity_logs t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- admin_settings.created_by: SET NULL for orphans
UPDATE orthodoxmetrics_db.admin_settings t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.created_by
SET t.created_by = NULL
WHERE t.created_by IS NOT NULL AND u.id IS NULL;
-- admin_settings.updated_by: SET NULL for orphans
UPDATE orthodoxmetrics_db.admin_settings t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.updated_by
SET t.updated_by = NULL
WHERE t.updated_by IS NOT NULL AND u.id IS NULL;
-- audit_logs.user_id is RESTRICT (audit-style). Inspect manually if preview > 0.
-- backup_restores.requested_by: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.backup_restores t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.requested_by
SET t.requested_by = @FALLBACK_USER_ID
WHERE t.requested_by IS NOT NULL AND u.id IS NULL;
-- backup_schedule_history.triggered_by: SET NULL for orphans
UPDATE orthodoxmetrics_db.backup_schedule_history t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.triggered_by
SET t.triggered_by = NULL
WHERE t.triggered_by IS NOT NULL AND u.id IS NULL;
-- blog_access_requests.blog_owner_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.blog_access_requests t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.blog_owner_id
SET t.blog_owner_id = @FALLBACK_USER_ID
WHERE t.blog_owner_id IS NOT NULL AND u.id IS NULL;
-- blog_access_requests.requester_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.blog_access_requests t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.requester_id
SET t.requester_id = @FALLBACK_USER_ID
WHERE t.requester_id IS NOT NULL AND u.id IS NULL;
-- blog_categories.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.blog_categories t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- blog_comments.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.blog_comments t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- blog_posts.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.blog_posts t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- chat_conversations.created_by: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.chat_conversations t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.created_by
SET t.created_by = @FALLBACK_USER_ID
WHERE t.created_by IS NOT NULL AND u.id IS NULL;
-- chat_messages.sender_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.chat_messages t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.sender_id
SET t.sender_id = @FALLBACK_USER_ID
WHERE t.sender_id IS NOT NULL AND u.id IS NULL;
-- chat_participants.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.chat_participants t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- church_admin_panel.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.church_admin_panel t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- friendships.addressee_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.friendships t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.addressee_id
SET t.addressee_id = @FALLBACK_USER_ID
WHERE t.addressee_id IS NOT NULL AND u.id IS NULL;
-- friendships.requester_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.friendships t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.requester_id
SET t.requester_id = @FALLBACK_USER_ID
WHERE t.requester_id IS NOT NULL AND u.id IS NULL;
-- kanban_boards.created_by: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.kanban_boards t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.created_by
SET t.created_by = @FALLBACK_USER_ID
WHERE t.created_by IS NOT NULL AND u.id IS NULL;
-- kanban_board_members.invited_by: SET NULL for orphans
UPDATE orthodoxmetrics_db.kanban_board_members t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.invited_by
SET t.invited_by = NULL
WHERE t.invited_by IS NOT NULL AND u.id IS NULL;
-- kanban_board_members.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.kanban_board_members t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- kanban_tasks.assigned_to: SET NULL for orphans
UPDATE orthodoxmetrics_db.kanban_tasks t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.assigned_to
SET t.assigned_to = NULL
WHERE t.assigned_to IS NOT NULL AND u.id IS NULL;
-- kanban_tasks.created_by: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.kanban_tasks t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.created_by
SET t.created_by = @FALLBACK_USER_ID
WHERE t.created_by IS NOT NULL AND u.id IS NULL;
-- kanban_task_activity.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.kanban_task_activity t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- kanban_task_attachments.uploaded_by: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.kanban_task_attachments t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.uploaded_by
SET t.uploaded_by = @FALLBACK_USER_ID
WHERE t.uploaded_by IS NOT NULL AND u.id IS NULL;
-- kanban_task_comments.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.kanban_task_comments t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- notes.created_by: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.notes t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.created_by
SET t.created_by = @FALLBACK_USER_ID
WHERE t.created_by IS NOT NULL AND u.id IS NULL;
-- note_shares.shared_by: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.note_shares t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.shared_by
SET t.shared_by = @FALLBACK_USER_ID
WHERE t.shared_by IS NOT NULL AND u.id IS NULL;
-- note_shares.shared_with_user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.note_shares t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.shared_with_user_id
SET t.shared_with_user_id = @FALLBACK_USER_ID
WHERE t.shared_with_user_id IS NOT NULL AND u.id IS NULL;
-- notifications.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.notifications t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- notification_history.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.notification_history t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- notification_queue.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.notification_queue t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- push_subscriptions.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.push_subscriptions t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- social_media.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.social_media t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- social_reactions.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.social_reactions t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- upload_logs.user_id: SET NULL for orphans
UPDATE orthodoxmetrics_db.upload_logs t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = NULL
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- user_notification_preferences.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.user_notification_preferences t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- user_profiles.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.user_profiles t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- user_sessions.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.user_sessions t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- user_sessions_social.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.user_sessions_social t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
-- user_social_settings.user_id: set orphans to fallback user @FALLBACK_USER_ID
UPDATE orthodoxmetrics_db.user_social_settings t
LEFT JOIN orthodoxmetrics_db.users u ON u.id = t.user_id
SET t.user_id = @FALLBACK_USER_ID
WHERE t.user_id IS NOT NULL AND u.id IS NULL;
