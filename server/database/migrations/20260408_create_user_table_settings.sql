-- Create user_table_settings table for per-user UI and table preferences
-- Used by: /api/settings/table-view (column visibility/sort)
--          /api/my/ui-preferences (FAB positions, UI state)

CREATE TABLE IF NOT EXISTS user_table_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  church_id INT UNSIGNED NOT NULL DEFAULT 0,
  table_name VARCHAR(100) NOT NULL,
  settings_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_church_table (user_id, church_id, table_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
