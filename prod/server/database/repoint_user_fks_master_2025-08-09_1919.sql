-- repoint_user_fks_master_2025-08-09_1919.sql
-- Purpose: Repoint all remaining FKs from orthodoxmetrics_db._users_legacy -> orthodoxmetrics_db.users(id)
--          preserving existing DELETE semantics seen in your audit.
-- Safe to run multiple times on a fresh DB? It will error if constraints already dropped; wrap in IF EXISTS where supported.
-- Pre-req: Back up both DBs. Ensure collations match (utf8mb4_unicode_ci).

ALTER DATABASE orthodoxmetrics_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER DATABASE orthodoxmetrics_db      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- activity_feed.actor_id: activity_feed_ibfk_2 -> fk_activity_feed_actor_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.activity_feed
  DROP FOREIGN KEY activity_feed_ibfk_2;

ALTER TABLE orthodoxmetrics_db.activity_feed
  ADD CONSTRAINT fk_activity_feed_actor_id_auth_user
  FOREIGN KEY (actor_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- activity_feed.user_id: activity_feed_ibfk_1 -> fk_activity_feed_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.activity_feed
  DROP FOREIGN KEY activity_feed_ibfk_1;

ALTER TABLE orthodoxmetrics_db.activity_feed
  ADD CONSTRAINT fk_activity_feed_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- activity_log.user_id: activity_log_ibfk_1 -> fk_activity_log_user_id_auth_user (ON DELETE SET NULL)
ALTER TABLE orthodoxmetrics_db.activity_log
  DROP FOREIGN KEY activity_log_ibfk_1;

ALTER TABLE orthodoxmetrics_db.activity_log
  ADD CONSTRAINT fk_activity_log_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE SET NULL ON UPDATE RESTRICT;

-- activity_logs.user_id: activity_logs_ibfk_2 -> fk_activity_logs_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.activity_logs
  DROP FOREIGN KEY activity_logs_ibfk_2;

ALTER TABLE orthodoxmetrics_db.activity_logs
  ADD CONSTRAINT fk_activity_logs_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- admin_settings.created_by: admin_settings_ibfk_1 -> fk_admin_settings_created_by_auth_user (ON DELETE SET NULL)
ALTER TABLE orthodoxmetrics_db.admin_settings
  DROP FOREIGN KEY admin_settings_ibfk_1;

ALTER TABLE orthodoxmetrics_db.admin_settings
  ADD CONSTRAINT fk_admin_settings_created_by_auth_user
  FOREIGN KEY (created_by)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE SET NULL ON UPDATE RESTRICT;

-- admin_settings.updated_by: admin_settings_ibfk_2 -> fk_admin_settings_updated_by_auth_user (ON DELETE SET NULL)
ALTER TABLE orthodoxmetrics_db.admin_settings
  DROP FOREIGN KEY admin_settings_ibfk_2;

ALTER TABLE orthodoxmetrics_db.admin_settings
  ADD CONSTRAINT fk_admin_settings_updated_by_auth_user
  FOREIGN KEY (updated_by)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE SET NULL ON UPDATE RESTRICT;

-- audit_logs.user_id: audit_logs_ibfk_1 -> fk_audit_logs_user_id_auth_user (ON DELETE RESTRICT)
ALTER TABLE orthodoxmetrics_db.audit_logs
  DROP FOREIGN KEY audit_logs_ibfk_1;

ALTER TABLE orthodoxmetrics_db.audit_logs
  ADD CONSTRAINT fk_audit_logs_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE RESTRICT ON UPDATE RESTRICT;

-- backup_restores.requested_by: backup_restores_ibfk_2 -> fk_backup_restores_requested_by_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.backup_restores
  DROP FOREIGN KEY backup_restores_ibfk_2;

ALTER TABLE orthodoxmetrics_db.backup_restores
  ADD CONSTRAINT fk_backup_restores_requested_by_auth_user
  FOREIGN KEY (requested_by)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- backup_schedule_history.triggered_by: backup_schedule_history_ibfk_2 -> fk_backup_schedule_history_triggered_by_auth_user (ON DELETE SET NULL)
ALTER TABLE orthodoxmetrics_db.backup_schedule_history
  DROP FOREIGN KEY backup_schedule_history_ibfk_2;

ALTER TABLE orthodoxmetrics_db.backup_schedule_history
  ADD CONSTRAINT fk_backup_schedule_history_triggered_by_auth_user
  FOREIGN KEY (triggered_by)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE SET NULL ON UPDATE RESTRICT;

-- blog_access_requests.blog_owner_id: blog_access_requests_ibfk_1 -> fk_blog_access_requests_blog_owner_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.blog_access_requests
  DROP FOREIGN KEY blog_access_requests_ibfk_1;

ALTER TABLE orthodoxmetrics_db.blog_access_requests
  ADD CONSTRAINT fk_blog_access_requests_blog_owner_id_auth_user
  FOREIGN KEY (blog_owner_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- blog_access_requests.requester_id: blog_access_requests_ibfk_2 -> fk_blog_access_requests_requester_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.blog_access_requests
  DROP FOREIGN KEY blog_access_requests_ibfk_2;

ALTER TABLE orthodoxmetrics_db.blog_access_requests
  ADD CONSTRAINT fk_blog_access_requests_requester_id_auth_user
  FOREIGN KEY (requester_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- blog_categories.user_id: blog_categories_ibfk_1 -> fk_blog_categories_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.blog_categories
  DROP FOREIGN KEY blog_categories_ibfk_1;

ALTER TABLE orthodoxmetrics_db.blog_categories
  ADD CONSTRAINT fk_blog_categories_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- blog_comments.user_id: blog_comments_ibfk_2 -> fk_blog_comments_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.blog_comments
  DROP FOREIGN KEY blog_comments_ibfk_2;

ALTER TABLE orthodoxmetrics_db.blog_comments
  ADD CONSTRAINT fk_blog_comments_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- blog_posts.user_id: blog_posts_ibfk_1 -> fk_blog_posts_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.blog_posts
  DROP FOREIGN KEY blog_posts_ibfk_1;

ALTER TABLE orthodoxmetrics_db.blog_posts
  ADD CONSTRAINT fk_blog_posts_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- chat_conversations.created_by: chat_conversations_ibfk_1 -> fk_chat_conversations_created_by_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.chat_conversations
  DROP FOREIGN KEY chat_conversations_ibfk_1;

ALTER TABLE orthodoxmetrics_db.chat_conversations
  ADD CONSTRAINT fk_chat_conversations_created_by_auth_user
  FOREIGN KEY (created_by)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- chat_messages.sender_id: chat_messages_ibfk_2 -> fk_chat_messages_sender_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.chat_messages
  DROP FOREIGN KEY chat_messages_ibfk_2;

ALTER TABLE orthodoxmetrics_db.chat_messages
  ADD CONSTRAINT fk_chat_messages_sender_id_auth_user
  FOREIGN KEY (sender_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- chat_participants.user_id: chat_participants_ibfk_2 -> fk_chat_participants_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.chat_participants
  DROP FOREIGN KEY chat_participants_ibfk_2;

ALTER TABLE orthodoxmetrics_db.chat_participants
  ADD CONSTRAINT fk_chat_participants_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- church_admin_panel.user_id: church_admin_panel_ibfk_1 -> fk_church_admin_panel_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.church_admin_panel
  DROP FOREIGN KEY church_admin_panel_ibfk_1;

ALTER TABLE orthodoxmetrics_db.church_admin_panel
  ADD CONSTRAINT fk_church_admin_panel_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- friendships.addressee_id: friendships_ibfk_2 -> fk_friendships_addressee_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.friendships
  DROP FOREIGN KEY friendships_ibfk_2;

ALTER TABLE orthodoxmetrics_db.friendships
  ADD CONSTRAINT fk_friendships_addressee_id_auth_user
  FOREIGN KEY (addressee_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- friendships.requester_id: friendships_ibfk_1 -> fk_friendships_requester_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.friendships
  DROP FOREIGN KEY friendships_ibfk_1;

ALTER TABLE orthodoxmetrics_db.friendships
  ADD CONSTRAINT fk_friendships_requester_id_auth_user
  FOREIGN KEY (requester_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- kanban_boards.created_by: kanban_boards_ibfk_1 -> fk_kanban_boards_created_by_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.kanban_boards
  DROP FOREIGN KEY kanban_boards_ibfk_1;

ALTER TABLE orthodoxmetrics_db.kanban_boards
  ADD CONSTRAINT fk_kanban_boards_created_by_auth_user
  FOREIGN KEY (created_by)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- kanban_board_members.invited_by: kanban_board_members_ibfk_3 -> fk_kanban_board_members_invited_by_auth_user (ON DELETE SET NULL)
ALTER TABLE orthodoxmetrics_db.kanban_board_members
  DROP FOREIGN KEY kanban_board_members_ibfk_3;

ALTER TABLE orthodoxmetrics_db.kanban_board_members
  ADD CONSTRAINT fk_kanban_board_members_invited_by_auth_user
  FOREIGN KEY (invited_by)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE SET NULL ON UPDATE RESTRICT;

-- kanban_board_members.user_id: kanban_board_members_ibfk_2 -> fk_kanban_board_members_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.kanban_board_members
  DROP FOREIGN KEY kanban_board_members_ibfk_2;

ALTER TABLE orthodoxmetrics_db.kanban_board_members
  ADD CONSTRAINT fk_kanban_board_members_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- kanban_tasks.assigned_to: kanban_tasks_ibfk_3 -> fk_kanban_tasks_assigned_to_auth_user (ON DELETE SET NULL)
ALTER TABLE orthodoxmetrics_db.kanban_tasks
  DROP FOREIGN KEY kanban_tasks_ibfk_3;

ALTER TABLE orthodoxmetrics_db.kanban_tasks
  ADD CONSTRAINT fk_kanban_tasks_assigned_to_auth_user
  FOREIGN KEY (assigned_to)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE SET NULL ON UPDATE RESTRICT;

-- kanban_tasks.created_by: kanban_tasks_ibfk_4 -> fk_kanban_tasks_created_by_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.kanban_tasks
  DROP FOREIGN KEY kanban_tasks_ibfk_4;

ALTER TABLE orthodoxmetrics_db.kanban_tasks
  ADD CONSTRAINT fk_kanban_tasks_created_by_auth_user
  FOREIGN KEY (created_by)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- kanban_task_activity.user_id: kanban_task_activity_ibfk_2 -> fk_kanban_task_activity_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.kanban_task_activity
  DROP FOREIGN KEY kanban_task_activity_ibfk_2;

ALTER TABLE orthodoxmetrics_db.kanban_task_activity
  ADD CONSTRAINT fk_kanban_task_activity_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- kanban_task_attachments.uploaded_by: kanban_task_attachments_ibfk_2 -> fk_kanban_task_attachments_uploaded_by_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.kanban_task_attachments
  DROP FOREIGN KEY kanban_task_attachments_ibfk_2;

ALTER TABLE orthodoxmetrics_db.kanban_task_attachments
  ADD CONSTRAINT fk_kanban_task_attachments_uploaded_by_auth_user
  FOREIGN KEY (uploaded_by)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- kanban_task_comments.user_id: kanban_task_comments_ibfk_2 -> fk_kanban_task_comments_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.kanban_task_comments
  DROP FOREIGN KEY kanban_task_comments_ibfk_2;

ALTER TABLE orthodoxmetrics_db.kanban_task_comments
  ADD CONSTRAINT fk_kanban_task_comments_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- notes.created_by: notes_ibfk_1 -> fk_notes_created_by_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.notes
  DROP FOREIGN KEY notes_ibfk_1;

ALTER TABLE orthodoxmetrics_db.notes
  ADD CONSTRAINT fk_notes_created_by_auth_user
  FOREIGN KEY (created_by)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- note_shares.shared_by: note_shares_ibfk_3 -> fk_note_shares_shared_by_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.note_shares
  DROP FOREIGN KEY note_shares_ibfk_3;

ALTER TABLE orthodoxmetrics_db.note_shares
  ADD CONSTRAINT fk_note_shares_shared_by_auth_user
  FOREIGN KEY (shared_by)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- note_shares.shared_with_user_id: note_shares_ibfk_2 -> fk_note_shares_shared_with_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.note_shares
  DROP FOREIGN KEY note_shares_ibfk_2;

ALTER TABLE orthodoxmetrics_db.note_shares
  ADD CONSTRAINT fk_note_shares_shared_with_user_id_auth_user
  FOREIGN KEY (shared_with_user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- notifications.user_id: notifications_ibfk_1 -> fk_notifications_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.notifications
  DROP FOREIGN KEY notifications_ibfk_1;

ALTER TABLE orthodoxmetrics_db.notifications
  ADD CONSTRAINT fk_notifications_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- notification_history.user_id: notification_history_ibfk_1 -> fk_notification_history_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.notification_history
  DROP FOREIGN KEY notification_history_ibfk_1;

ALTER TABLE orthodoxmetrics_db.notification_history
  ADD CONSTRAINT fk_notification_history_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- notification_queue.user_id: notification_queue_ibfk_1 -> fk_notification_queue_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.notification_queue
  DROP FOREIGN KEY notification_queue_ibfk_1;

ALTER TABLE orthodoxmetrics_db.notification_queue
  ADD CONSTRAINT fk_notification_queue_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- push_subscriptions.user_id: push_subscriptions_ibfk_1 -> fk_push_subscriptions_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.push_subscriptions
  DROP FOREIGN KEY push_subscriptions_ibfk_1;

ALTER TABLE orthodoxmetrics_db.push_subscriptions
  ADD CONSTRAINT fk_push_subscriptions_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- social_media.user_id: social_media_ibfk_1 -> fk_social_media_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.social_media
  DROP FOREIGN KEY social_media_ibfk_1;

ALTER TABLE orthodoxmetrics_db.social_media
  ADD CONSTRAINT fk_social_media_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- social_reactions.user_id: social_reactions_ibfk_1 -> fk_social_reactions_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.social_reactions
  DROP FOREIGN KEY social_reactions_ibfk_1;

ALTER TABLE orthodoxmetrics_db.social_reactions
  ADD CONSTRAINT fk_social_reactions_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- upload_logs.user_id: upload_logs_ibfk_2 -> fk_upload_logs_user_id_auth_user (ON DELETE SET NULL)
ALTER TABLE orthodoxmetrics_db.upload_logs
  DROP FOREIGN KEY upload_logs_ibfk_2;

ALTER TABLE orthodoxmetrics_db.upload_logs
  ADD CONSTRAINT fk_upload_logs_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE SET NULL ON UPDATE RESTRICT;

-- user_notification_preferences.user_id: user_notification_preferences_ibfk_1 -> fk_user_notification_preferences_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.user_notification_preferences
  DROP FOREIGN KEY user_notification_preferences_ibfk_1;

ALTER TABLE orthodoxmetrics_db.user_notification_preferences
  ADD CONSTRAINT fk_user_notification_preferences_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- user_profiles.user_id: user_profiles_ibfk_1 -> fk_user_profiles_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.user_profiles
  DROP FOREIGN KEY user_profiles_ibfk_1;

ALTER TABLE orthodoxmetrics_db.user_profiles
  ADD CONSTRAINT fk_user_profiles_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- user_sessions.user_id: user_sessions_ibfk_1 -> fk_user_sessions_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.user_sessions
  DROP FOREIGN KEY user_sessions_ibfk_1;

ALTER TABLE orthodoxmetrics_db.user_sessions
  ADD CONSTRAINT fk_user_sessions_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- user_sessions_social.user_id: user_sessions_social_ibfk_1 -> fk_user_sessions_social_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.user_sessions_social
  DROP FOREIGN KEY user_sessions_social_ibfk_1;

ALTER TABLE orthodoxmetrics_db.user_sessions_social
  ADD CONSTRAINT fk_user_sessions_social_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- user_social_settings.user_id: user_social_settings_ibfk_1 -> fk_user_social_settings_user_id_auth_user (ON DELETE CASCADE)
ALTER TABLE orthodoxmetrics_db.user_social_settings
  DROP FOREIGN KEY user_social_settings_ibfk_1;

ALTER TABLE orthodoxmetrics_db.user_social_settings
  ADD CONSTRAINT fk_user_social_settings_user_id_auth_user
  FOREIGN KEY (user_id)
  REFERENCES orthodoxmetrics_db.users(id)
  ON DELETE CASCADE ON UPDATE RESTRICT;

