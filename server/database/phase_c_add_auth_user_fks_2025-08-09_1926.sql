-- phase_c_add_auth_user_fks_v2_2025-08-09_1929.sql
-- Purpose: add FKs to orthodoxmetrics_db.users(id) WITHOUT stored procedures.
-- Each block checks if an auth FK already exists for (table, column); if not, it adds it.
-- Run after Phase A (drop legacy FKs) and Phase B (orphan repair).
DROP PROCEDURE IF EXISTS add_auth_user_fks;  -- cleanup from previous attempt, harmless if not present
SET @db_app := 'orthodoxmetrics_db';
SET @db_auth := 'orthodoxmetrics_db';

-- activity_feed.actor_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='activity_feed' AND COLUMN_NAME='actor_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`activity_feed` ADD CONSTRAINT `fk_activity_feed_actor_id_auth_user` FOREIGN KEY (`actor_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip activity_feed.actor_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- activity_feed.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='activity_feed' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`activity_feed` ADD CONSTRAINT `fk_activity_feed_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip activity_feed.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- activity_log.user_id -> SET NULL
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='activity_log' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`activity_log` ADD CONSTRAINT `fk_activity_log_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT'),
  'SELECT "skip activity_log.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- activity_logs.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='activity_logs' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`activity_logs` ADD CONSTRAINT `fk_activity_logs_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip activity_logs.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- admin_settings.created_by -> SET NULL
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='admin_settings' AND COLUMN_NAME='created_by'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`admin_settings` ADD CONSTRAINT `fk_admin_settings_created_by_auth_user` FOREIGN KEY (`created_by`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT'),
  'SELECT "skip admin_settings.created_by (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- admin_settings.updated_by -> SET NULL
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='admin_settings' AND COLUMN_NAME='updated_by'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`admin_settings` ADD CONSTRAINT `fk_admin_settings_updated_by_auth_user` FOREIGN KEY (`updated_by`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT'),
  'SELECT "skip admin_settings.updated_by (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- audit_logs.user_id -> RESTRICT
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='audit_logs' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`audit_logs` ADD CONSTRAINT `fk_audit_logs_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT'),
  'SELECT "skip audit_logs.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- backup_restores.requested_by -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='backup_restores' AND COLUMN_NAME='requested_by'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`backup_restores` ADD CONSTRAINT `fk_backup_restores_requested_by_auth_user` FOREIGN KEY (`requested_by`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip backup_restores.requested_by (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- backup_schedule_history.triggered_by -> SET NULL
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='backup_schedule_history' AND COLUMN_NAME='triggered_by'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`backup_schedule_history` ADD CONSTRAINT `fk_backup_schedule_history_triggered_by_auth_user` FOREIGN KEY (`triggered_by`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT'),
  'SELECT "skip backup_schedule_history.triggered_by (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- blog_access_requests.blog_owner_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='blog_access_requests' AND COLUMN_NAME='blog_owner_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`blog_access_requests` ADD CONSTRAINT `fk_blog_access_requests_blog_owner_id_auth_user` FOREIGN KEY (`blog_owner_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip blog_access_requests.blog_owner_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- blog_access_requests.requester_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='blog_access_requests' AND COLUMN_NAME='requester_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`blog_access_requests` ADD CONSTRAINT `fk_blog_access_requests_requester_id_auth_user` FOREIGN KEY (`requester_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip blog_access_requests.requester_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- blog_categories.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='blog_categories' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`blog_categories` ADD CONSTRAINT `fk_blog_categories_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip blog_categories.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- blog_comments.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='blog_comments' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`blog_comments` ADD CONSTRAINT `fk_blog_comments_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip blog_comments.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- blog_posts.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='blog_posts' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`blog_posts` ADD CONSTRAINT `fk_blog_posts_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip blog_posts.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- chat_conversations.created_by -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='chat_conversations' AND COLUMN_NAME='created_by'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`chat_conversations` ADD CONSTRAINT `fk_chat_conversations_created_by_auth_user` FOREIGN KEY (`created_by`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip chat_conversations.created_by (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- chat_messages.sender_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='chat_messages' AND COLUMN_NAME='sender_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`chat_messages` ADD CONSTRAINT `fk_chat_messages_sender_id_auth_user` FOREIGN KEY (`sender_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip chat_messages.sender_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- chat_participants.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='chat_participants' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`chat_participants` ADD CONSTRAINT `fk_chat_participants_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip chat_participants.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- church_admin_panel.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='church_admin_panel' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`church_admin_panel` ADD CONSTRAINT `fk_church_admin_panel_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip church_admin_panel.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- friendships.addressee_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='friendships' AND COLUMN_NAME='addressee_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`friendships` ADD CONSTRAINT `fk_friendships_addressee_id_auth_user` FOREIGN KEY (`addressee_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip friendships.addressee_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- friendships.requester_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='friendships' AND COLUMN_NAME='requester_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`friendships` ADD CONSTRAINT `fk_friendships_requester_id_auth_user` FOREIGN KEY (`requester_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip friendships.requester_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- kanban_boards.created_by -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='kanban_boards' AND COLUMN_NAME='created_by'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`kanban_boards` ADD CONSTRAINT `fk_kanban_boards_created_by_auth_user` FOREIGN KEY (`created_by`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip kanban_boards.created_by (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- kanban_board_members.invited_by -> SET NULL
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='kanban_board_members' AND COLUMN_NAME='invited_by'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`kanban_board_members` ADD CONSTRAINT `fk_kanban_board_members_invited_by_auth_user` FOREIGN KEY (`invited_by`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT'),
  'SELECT "skip kanban_board_members.invited_by (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- kanban_board_members.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='kanban_board_members' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`kanban_board_members` ADD CONSTRAINT `fk_kanban_board_members_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip kanban_board_members.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- kanban_tasks.assigned_to -> SET NULL
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='kanban_tasks' AND COLUMN_NAME='assigned_to'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`kanban_tasks` ADD CONSTRAINT `fk_kanban_tasks_assigned_to_auth_user` FOREIGN KEY (`assigned_to`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT'),
  'SELECT "skip kanban_tasks.assigned_to (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- kanban_tasks.created_by -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='kanban_tasks' AND COLUMN_NAME='created_by'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`kanban_tasks` ADD CONSTRAINT `fk_kanban_tasks_created_by_auth_user` FOREIGN KEY (`created_by`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip kanban_tasks.created_by (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- kanban_task_activity.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='kanban_task_activity' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`kanban_task_activity` ADD CONSTRAINT `fk_kanban_task_activity_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip kanban_task_activity.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- kanban_task_attachments.uploaded_by -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='kanban_task_attachments' AND COLUMN_NAME='uploaded_by'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`kanban_task_attachments` ADD CONSTRAINT `fk_kanban_task_attachments_uploaded_by_auth_user` FOREIGN KEY (`uploaded_by`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip kanban_task_attachments.uploaded_by (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- kanban_task_comments.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='kanban_task_comments' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`kanban_task_comments` ADD CONSTRAINT `fk_kanban_task_comments_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip kanban_task_comments.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- notes.created_by -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='notes' AND COLUMN_NAME='created_by'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`notes` ADD CONSTRAINT `fk_notes_created_by_auth_user` FOREIGN KEY (`created_by`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip notes.created_by (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- note_shares.shared_by -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='note_shares' AND COLUMN_NAME='shared_by'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`note_shares` ADD CONSTRAINT `fk_note_shares_shared_by_auth_user` FOREIGN KEY (`shared_by`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip note_shares.shared_by (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- note_shares.shared_with_user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='note_shares' AND COLUMN_NAME='shared_with_user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`note_shares` ADD CONSTRAINT `fk_note_shares_shared_with_user_id_auth_user` FOREIGN KEY (`shared_with_user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip note_shares.shared_with_user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- notifications.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='notifications' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`notifications` ADD CONSTRAINT `fk_notifications_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip notifications.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- notification_history.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='notification_history' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`notification_history` ADD CONSTRAINT `fk_notification_history_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip notification_history.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- notification_queue.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='notification_queue' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`notification_queue` ADD CONSTRAINT `fk_notification_queue_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip notification_queue.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- push_subscriptions.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='push_subscriptions' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`push_subscriptions` ADD CONSTRAINT `fk_push_subscriptions_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip push_subscriptions.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- social_media.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='social_media' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`social_media` ADD CONSTRAINT `fk_social_media_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip social_media.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- social_reactions.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='social_reactions' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`social_reactions` ADD CONSTRAINT `fk_social_reactions_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip social_reactions.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- upload_logs.user_id -> SET NULL
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='upload_logs' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`upload_logs` ADD CONSTRAINT `fk_upload_logs_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT'),
  'SELECT "skip upload_logs.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- user_notification_preferences.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='user_notification_preferences' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`user_notification_preferences` ADD CONSTRAINT `fk_user_notification_preferences_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip user_notification_preferences.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- user_profiles.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='user_profiles' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`user_profiles` ADD CONSTRAINT `fk_user_profiles_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip user_profiles.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- user_sessions.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='user_sessions' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`user_sessions` ADD CONSTRAINT `fk_user_sessions_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip user_sessions.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- user_sessions_social.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='user_sessions_social' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`user_sessions_social` ADD CONSTRAINT `fk_user_sessions_social_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip user_sessions_social.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- user_social_settings.user_id -> CASCADE
SET @exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA=@db_app AND TABLE_NAME='user_social_settings' AND COLUMN_NAME='user_id'
    AND REFERENCED_TABLE_SCHEMA=@db_auth AND REFERENCED_TABLE_NAME='users'
);

SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE ', @db_app, '.`user_social_settings` ADD CONSTRAINT `fk_user_social_settings_user_id_auth_user` FOREIGN KEY (`user_id`) REFERENCES ', @db_auth, '.`users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT'),
  'SELECT "skip user_social_settings.user_id (auth FK exists)"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
