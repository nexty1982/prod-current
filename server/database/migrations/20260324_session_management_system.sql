-- Session Management System — DB migration
-- Run date: 2026-03-24
-- Extends user_sessions, creates session_messages and session_route_log

-- 1. Extend user_sessions table with new columns
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS user_email VARCHAR(255) NULL AFTER user_id;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS role VARCHAR(50) NULL AFTER user_email;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS client VARCHAR(100) NULL AFTER user_agent;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_type VARCHAR(20) NULL AFTER client;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS location VARCHAR(255) NULL AFTER device_type;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_locked TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS lock_reason TEXT NULL AFTER is_locked;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMP NULL AFTER lock_reason;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS terminated_by INT NULL AFTER terminated_at;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS metadata_json JSON NULL AFTER terminated_by;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS session_source VARCHAR(20) NOT NULL DEFAULT 'jwt' AFTER session_token;

ALTER TABLE user_sessions ADD INDEX idx_is_locked (is_locked);
ALTER TABLE user_sessions ADD INDEX idx_terminated_at (terminated_at);
ALTER TABLE user_sessions ADD INDEX idx_session_source (session_source);

-- 2. Session messages (admin → user communication)
CREATE TABLE IF NOT EXISTS session_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  message_type ENUM('info','warning','system','error') NOT NULL DEFAULT 'info',
  title VARCHAR(255) NULL,
  body TEXT NOT NULL,
  sent_by INT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  INDEX idx_session_id (session_id),
  INDEX idx_sent_at (sent_at),
  FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Session route activity log
CREATE TABLE IF NOT EXISTS session_route_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(500) NOT NULL,
  status_code SMALLINT NULL,
  response_time_ms INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_id (session_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
