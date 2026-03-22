-- Add password_changed_at to users table for security status display
-- Tracks when the user last changed their password (NULL = never changed since account creation)
ALTER TABLE orthodoxmetrics_db.users
  ADD COLUMN password_changed_at DATETIME NULL DEFAULT NULL AFTER updated_at;
