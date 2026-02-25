-- Email Submissions Log Table
-- Tracks inbound email record submissions processed by OMAI
-- Platform DB (orthodoxmetrics_db) since it's cross-church logging

CREATE TABLE IF NOT EXISTS `orthodoxmetrics_db`.`email_submissions` (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  user_id BIGINT NULL,
  subject VARCHAR(500),
  record_type ENUM('baptism','marriage','funeral','unknown') DEFAULT 'unknown',
  status ENUM('received','validated','parsed','submitted','completed','rejected','failed') DEFAULT 'received',
  rejection_reason TEXT NULL,
  parsed_data JSON NULL,
  backend_response JSON NULL,
  created_record_id BIGINT NULL,
  raw_email_id VARCHAR(255) NULL,
  processing_time_ms INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_church (church_id),
  INDEX idx_sender (sender_email),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);
