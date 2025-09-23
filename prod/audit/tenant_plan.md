# Multi-Tenant Migration Plan

Generated: 2025-08-13T01:20:35.568Z

## Summary
- Total tables: 137
- Already have church_id: 16
- Can backfill via user: 39
- Need manual mapping: 72
- System tables (skip): 10

## Action Plan

### Tables Already Scoped (Verify Only)
- `activity_log` (0 rows)
- `activity_logs` (0 rows)
- `baptism_records` (2 rows)
- `church_admin_panel` (0 rows)
- `church_contacts` (0 rows)
- `church_user_roles` (0 rows)
- `funeral_records` (1 rows)
- `invoices` (0 rows)
- `marriage_records` (1 rows)
- `ocr_jobs` (0 rows)
- `record_reviews` (0 rows)
- `subscriptions` (0 rows)
- `templates` (0 rows)
- `upload_logs` (0 rows)
- `users` (2 rows)
- `_users_legacy` (2 rows)

### Tables to Add church_id via User Join
- `activity_feed` via `user_id` (0 rows)
- `admin_settings` via `created_by` (0 rows)
- `audit_logs` via `user_id` (0 rows)
- `bigbook_notes` via `user_id` (0 rows)
- `blog_categories` via `user_id` (0 rows)
- `blog_comments` via `user_id` (0 rows)
- `blog_posts` via `user_id` (0 rows)
- `calendar_settings` via `user_id` (0 rows)
- `chat_conversations` via `created_by` (0 rows)
- `chat_participants` via `user_id` (0 rows)
- `component_usage` via `user_id` (908 rows)
- `error_logs` via `user_id` (0 rows)
- `kanban_boards` via `created_by` (1 rows)
- `kanban_board_members` via `user_id` (1 rows)
- `kanban_tasks` via `created_by` (0 rows)
- `kanban_task_activity` via `user_id` (0 rows)
- `kanban_task_comments` via `user_id` (0 rows)
- `notes` via `created_by` (0 rows)
- `notifications` via `user_id` (0 rows)
- `notification_history` via `user_id` (0 rows)
- `notification_queue` via `user_id` (0 rows)
- `notification_subscriptions` via `user_id` (0 rows)
- `omai_logs` via `user_id` (0 rows)
- `omb_templates` via `created_by` (0 rows)
- `password_resets` via `user_id` (0 rows)
- `push_subscriptions` via `user_id` (0 rows)
- `questionnaire_responses` via `user_id` (0 rows)
- `refresh_tokens` via `user_id` (3 rows)
- `sessions` via `user_id` (0 rows)
- `social_media` via `user_id` (0 rows)
- `social_reactions` via `user_id` (0 rows)
- `task_activity_log` via `user_id` (0 rows)
- `user_activity_logs` via `user_id` (0 rows)
- `user_component_summary` via `user_id` (61 rows)
- `user_notification_preferences` via `user_id` (0 rows)
- `user_profiles` via `user_id` (1 rows)
- `user_sessions` via `user_id` (0 rows)
- `user_sessions_social` via `user_id` (0 rows)
- `user_social_settings` via `user_id` (1 rows)

### Tables Needing Manual Review
- `ai_agents` (0 rows) - Uniques: [name]
- `ai_tasks` (0 rows) - Uniques: []
- `autocephalous_churches` (0 rows) - Uniques: []
- `backup_files` (0 rows) - Uniques: []
- `backup_restores` (0 rows) - Uniques: []
- `backup_schedule_history` (0 rows) - Uniques: []
- `backup_settings` (0 rows) - Uniques: []
- `bigbook_files` (0 rows) - Uniques: []
- `bigbook_file_tags` (0 rows) - Uniques: [file_id, tag_id]
- `bigbook_index` (0 rows) - Uniques: []
- `bigbook_tags` (0 rows) - Uniques: [tag_name]
- `billing_plans` (0 rows) - Uniques: [plan_code]
- `build_configs` (0 rows) - Uniques: [config_name, environment]
- `build_paths` (0 rows) - Uniques: []
- `chatgpt_messages` (0 rows) - Uniques: []
- `chatgpt_sessions` (0 rows) - Uniques: [session_id]
- `chat_messages` (0 rows) - Uniques: []
- `church_provision` (0 rows) - Uniques: []
- `clients` (0 rows) - Uniques: [slug, database_name]
- `component_action_summary` (64 rows) - Uniques: [component_id, action]
- `component_registry` (0 rows) - Uniques: []
- `component_usage_summary` (61 rows) - Uniques: [component_id]
- `email_settings` (0 rows) - Uniques: []
- `endpoint_map` (0 rows) - Uniques: [endpoint_url]
- `error_events` (7 rows) - Uniques: [hash]
- `friendships` (0 rows) - Uniques: [requester_id, addressee_id]
- `global_templates` (0 rows) - Uniques: []
- `images` (0 rows) - Uniques: []
- `invoice_items` (0 rows) - Uniques: []
- `kanban_columns` (4 rows) - Uniques: [board_id, position]
- `kanban_labels` (0 rows) - Uniques: [board_id, name]
- `kanban_task_attachments` (0 rows) - Uniques: []
- `kanban_task_labels` (0 rows) - Uniques: [task_id, label_id]
- `languages` (1 rows) - Uniques: [code]
- `locations` (1 rows) - Uniques: []
- `menu_items` (49 rows) - Uniques: [menu_key]
- `menu_role_permissions` (0 rows) - Uniques: [menu_item_id, role]
- `news_headlines` (0 rows) - Uniques: []
- `note_categories` (0 rows) - Uniques: [name]
- `note_shares` (0 rows) - Uniques: [note_id, shared_with_user_id]
- `notification_templates` (0 rows) - Uniques: [notification_type_id, language]
- `notification_types` (25 rows) - Uniques: [name]
- `omai_commands` (0 rows) - Uniques: [command_key]
- `omai_command_contexts` (0 rows) - Uniques: [page_path]
- `omai_md_agent_refs` (0 rows) - Uniques: []
- `omai_md_search_history` (0 rows) - Uniques: []
- `omai_md_search_index` (0 rows) - Uniques: [catalog_id]
- `omai_md_structure` (0 rows) - Uniques: []
- `omai_policies` (0 rows) - Uniques: [policy_name]
- `omb_documents` (0 rows) - Uniques: [slug]
- `omb_edits` (0 rows) - Uniques: []
- `orthodox_headlines` (0 rows) - Uniques: [source_name, article_url]
- `pages` (0 rows) - Uniques: [slug]
- `parish_map_data` (0 rows) - Uniques: []
- `permissions` (10 rows) - Uniques: [name]
- `questionnaires` (0 rows) - Uniques: []
- `questions` (0 rows) - Uniques: [questionnaire_id, question_id]
- `question_answers` (0 rows) - Uniques: [response_id, question_id]
- `roles` (4 rows) - Uniques: [name]
- `role_menu_permissions` (154 rows) - Uniques: [role, menu_item_id]
- `scan_results` (0 rows) - Uniques: []
- `service_actions` (0 rows) - Uniques: []
- `settings` (5 rows) - Uniques: [key_name]
- `site_errors` (0 rows) - Uniques: []
- `system_settings` (0 rows) - Uniques: [key_name]
- `task_files` (0 rows) - Uniques: []
- `task_links` (0 rows) - Uniques: [token]
- `task_notifications` (0 rows) - Uniques: []
- `task_reports` (0 rows) - Uniques: []
- `task_submissions` (0 rows) - Uniques: []
- `translations` (0 rows) - Uniques: [key_id, language_code]
- `translation_keys` (0 rows) - Uniques: [key_name]

### System Tables (Skip)
- `blog_access_requests`
- `blog_post_categories`
- `log_buffer`
- `log_retention_policies`
- `migration_status`
- `omai_md_catalog`
- `service_catalog`
- `site_survey_logs`
- `system_logs`
- `temp_church_audit`

## Next Steps

1. Run church_id addition for tables with user columns:
```sql
CALL omx_add_church_fk('activity_feed', 1);
CALL omx_backfill_church_via_user('activity_feed', 'user_id');
CALL omx_add_church_fk('admin_settings', 1);
CALL omx_backfill_church_via_user('admin_settings', 'created_by');
CALL omx_add_church_fk('audit_logs', 1);
CALL omx_backfill_church_via_user('audit_logs', 'user_id');
CALL omx_add_church_fk('bigbook_notes', 1);
CALL omx_backfill_church_via_user('bigbook_notes', 'user_id');
CALL omx_add_church_fk('blog_categories', 1);
CALL omx_backfill_church_via_user('blog_categories', 'user_id');
CALL omx_add_church_fk('blog_comments', 1);
CALL omx_backfill_church_via_user('blog_comments', 'user_id');
CALL omx_add_church_fk('blog_posts', 1);
CALL omx_backfill_church_via_user('blog_posts', 'user_id');
CALL omx_add_church_fk('calendar_settings', 1);
CALL omx_backfill_church_via_user('calendar_settings', 'user_id');
CALL omx_add_church_fk('chat_conversations', 1);
CALL omx_backfill_church_via_user('chat_conversations', 'created_by');
CALL omx_add_church_fk('chat_participants', 1);
CALL omx_backfill_church_via_user('chat_participants', 'user_id');
CALL omx_add_church_fk('component_usage', 1);
CALL omx_backfill_church_via_user('component_usage', 'user_id');
CALL omx_add_church_fk('error_logs', 1);
CALL omx_backfill_church_via_user('error_logs', 'user_id');
CALL omx_add_church_fk('kanban_boards', 1);
CALL omx_backfill_church_via_user('kanban_boards', 'created_by');
CALL omx_add_church_fk('kanban_board_members', 1);
CALL omx_backfill_church_via_user('kanban_board_members', 'user_id');
CALL omx_add_church_fk('kanban_tasks', 1);
CALL omx_backfill_church_via_user('kanban_tasks', 'created_by');
CALL omx_add_church_fk('kanban_task_activity', 1);
CALL omx_backfill_church_via_user('kanban_task_activity', 'user_id');
CALL omx_add_church_fk('kanban_task_comments', 1);
CALL omx_backfill_church_via_user('kanban_task_comments', 'user_id');
CALL omx_add_church_fk('notes', 1);
CALL omx_backfill_church_via_user('notes', 'created_by');
CALL omx_add_church_fk('notifications', 1);
CALL omx_backfill_church_via_user('notifications', 'user_id');
CALL omx_add_church_fk('notification_history', 1);
CALL omx_backfill_church_via_user('notification_history', 'user_id');
CALL omx_add_church_fk('notification_queue', 1);
CALL omx_backfill_church_via_user('notification_queue', 'user_id');
CALL omx_add_church_fk('notification_subscriptions', 1);
CALL omx_backfill_church_via_user('notification_subscriptions', 'user_id');
CALL omx_add_church_fk('omai_logs', 1);
CALL omx_backfill_church_via_user('omai_logs', 'user_id');
CALL omx_add_church_fk('omb_templates', 1);
CALL omx_backfill_church_via_user('omb_templates', 'created_by');
CALL omx_add_church_fk('password_resets', 1);
CALL omx_backfill_church_via_user('password_resets', 'user_id');
CALL omx_add_church_fk('push_subscriptions', 1);
CALL omx_backfill_church_via_user('push_subscriptions', 'user_id');
CALL omx_add_church_fk('questionnaire_responses', 1);
CALL omx_backfill_church_via_user('questionnaire_responses', 'user_id');
CALL omx_add_church_fk('refresh_tokens', 1);
CALL omx_backfill_church_via_user('refresh_tokens', 'user_id');
CALL omx_add_church_fk('sessions', 1);
CALL omx_backfill_church_via_user('sessions', 'user_id');
CALL omx_add_church_fk('social_media', 1);
CALL omx_backfill_church_via_user('social_media', 'user_id');
CALL omx_add_church_fk('social_reactions', 1);
CALL omx_backfill_church_via_user('social_reactions', 'user_id');
CALL omx_add_church_fk('task_activity_log', 1);
CALL omx_backfill_church_via_user('task_activity_log', 'user_id');
CALL omx_add_church_fk('user_activity_logs', 1);
CALL omx_backfill_church_via_user('user_activity_logs', 'user_id');
CALL omx_add_church_fk('user_component_summary', 1);
CALL omx_backfill_church_via_user('user_component_summary', 'user_id');
CALL omx_add_church_fk('user_notification_preferences', 1);
CALL omx_backfill_church_via_user('user_notification_preferences', 'user_id');
CALL omx_add_church_fk('user_profiles', 1);
CALL omx_backfill_church_via_user('user_profiles', 'user_id');
CALL omx_add_church_fk('user_sessions', 1);
CALL omx_backfill_church_via_user('user_sessions', 'user_id');
CALL omx_add_church_fk('user_sessions_social', 1);
CALL omx_backfill_church_via_user('user_sessions_social', 'user_id');
CALL omx_add_church_fk('user_social_settings', 1);
CALL omx_backfill_church_via_user('user_social_settings', 'user_id');
```

2. Add scoped unique constraints where needed:
```sql
CALL omx_add_scoped_unique('admin_settings', 'setting_name', 'setting_name');
CALL omx_add_scoped_unique('blog_categories', 'user_id', 'user_id');
CALL omx_add_scoped_unique('blog_categories', 'name', 'name');
CALL omx_add_scoped_unique('blog_posts', 'user_id', 'user_id');
CALL omx_add_scoped_unique('blog_posts', 'slug', 'slug');
CALL omx_add_scoped_unique('calendar_settings', 'user_id', 'user_id');
CALL omx_add_scoped_unique('chat_participants', 'conversation_id', 'conversation_id');
CALL omx_add_scoped_unique('chat_participants', 'user_id', 'user_id');
CALL omx_add_scoped_unique('error_logs', 'error_id', 'error_id');
CALL omx_add_scoped_unique('kanban_board_members', 'board_id', 'board_id');
CALL omx_add_scoped_unique('kanban_board_members', 'user_id', 'user_id');
CALL omx_add_scoped_unique('kanban_tasks', 'column_id', 'column_id');
CALL omx_add_scoped_unique('kanban_tasks', 'position', 'position');
CALL omx_add_scoped_unique('omb_templates', 'template_name', 'template_name');
CALL omx_add_scoped_unique('password_resets', 'token_hash', 'token_hash');
CALL omx_add_scoped_unique('push_subscriptions', 'user_id', 'user_id');
CALL omx_add_scoped_unique('push_subscriptions', 'endpoint', 'endpoint');
CALL omx_add_scoped_unique('refresh_tokens', 'token_hash', 'token_hash');
CALL omx_add_scoped_unique('sessions', 'session_id', 'session_id');
CALL omx_add_scoped_unique('social_reactions', 'user_id', 'user_id');
CALL omx_add_scoped_unique('social_reactions', 'target_type', 'target_type');
CALL omx_add_scoped_unique('social_reactions', 'target_id', 'target_id');
CALL omx_add_scoped_unique('user_component_summary', 'user_id', 'user_id');
CALL omx_add_scoped_unique('user_component_summary', 'component_id', 'component_id');
CALL omx_add_scoped_unique('user_notification_preferences', 'user_id', 'user_id');
CALL omx_add_scoped_unique('user_notification_preferences', 'notification_type_id', 'notification_type_id');
CALL omx_add_scoped_unique('user_profiles', 'user_id', 'user_id');
CALL omx_add_scoped_unique('user_sessions', 'session_token', 'session_token');
CALL omx_add_scoped_unique('user_sessions_social', 'session_token', 'session_token');
CALL omx_add_scoped_unique('user_social_settings', 'user_id', 'user_id');
```

3. Review and handle manual mapping tables individually.
