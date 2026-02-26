-- Create collaboration_requests table in platform DB (orthodoxmetrics_db)
-- Tracks shareable links for adding new records or updating existing ones

CREATE TABLE IF NOT EXISTS collaboration_requests (
  id CHAR(36) PRIMARY KEY,
  church_id INT NOT NULL,
  created_by_user_id INT NOT NULL,

  link_type ENUM('add_new', 'request_updates') NOT NULL,
  record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,

  -- Scenario A: add_new
  max_records INT DEFAULT NULL,
  records_submitted INT DEFAULT 0,

  -- Scenario B: request_updates
  target_record_ids_json TEXT DEFAULT NULL,

  -- Token (store hash only)
  token_hash CHAR(64) NOT NULL,

  -- Status
  status ENUM('active', 'completed', 'expired', 'revoked') NOT NULL DEFAULT 'active',

  -- Optional metadata
  label VARCHAR(255) DEFAULT NULL,
  recipient_name VARCHAR(255) DEFAULT NULL,
  recipient_email VARCHAR(255) DEFAULT NULL,

  -- Timestamps
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  first_accessed_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,

  INDEX idx_collab_token_hash (token_hash),
  INDEX idx_collab_church_id (church_id),
  INDEX idx_collab_status (status),
  INDEX idx_collab_created_by (created_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
