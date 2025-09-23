-- OMAI Error Tracking DB Schema
-- Created: 2025-07-30

CREATE DATABASE IF NOT EXISTS omai_error_tracking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE omai_error_tracking_db;

-- Main error index
CREATE TABLE IF NOT EXISTS errors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  hash CHAR(64) NOT NULL UNIQUE,
  type ENUM('frontend', 'backend', 'nginx', 'db', 'api') NOT NULL,
  source VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  first_seen DATETIME NOT NULL,
  last_seen DATETIME NOT NULL,
  occurrences INT DEFAULT 1,
  status ENUM('pending', 'in-progress', 'resolved', 'ignored', 'low-priority') DEFAULT 'pending',
  severity ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
  auto_tracked BOOLEAN DEFAULT TRUE
);

-- Raw error events
CREATE TABLE IF NOT EXISTS error_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  error_id INT NOT NULL,
  occurred_at DATETIME NOT NULL,
  user_agent TEXT,
  session_id VARCHAR(128),
  additional_context JSON,
  FOREIGN KEY (error_id) REFERENCES errors(id) ON DELETE CASCADE
);

-- Error tags
CREATE TABLE IF NOT EXISTS error_tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  error_id INT NOT NULL,
  tag VARCHAR(50),
  FOREIGN KEY (error_id) REFERENCES errors(id) ON DELETE CASCADE
);

-- Grant suggestion
-- CREATE USER 'omlogger'@'localhost' IDENTIFIED BY 'secure_password';
-- GRANT ALL ON omai_error_tracking_db.* TO 'omlogger'@'localhost';
