-- Create system_logs table for centralized logging
-- Replaces filesystem-based Winston and custom file logging

CREATE TABLE IF NOT EXISTS system_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  level ENUM('INFO', 'WARN', 'ERROR', 'DEBUG', 'SUCCESS') NOT NULL,
  source VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  meta JSON,
  user_email VARCHAR(255) NULL,
  service VARCHAR(100) NULL,
  session_id VARCHAR(255) NULL,
  request_id VARCHAR(100) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  INDEX idx_timestamp (timestamp),
  INDEX idx_level (level),
  INDEX idx_source (source),
  INDEX idx_service (service),
  INDEX idx_user_email (user_email),
  INDEX idx_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create log_buffer table for temporary storage when DB is unavailable
CREATE TABLE IF NOT EXISTS log_buffer (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  log_data JSON NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  INDEX idx_processed (processed),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;