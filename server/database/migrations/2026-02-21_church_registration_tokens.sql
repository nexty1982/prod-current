-- Church Registration Tokens
-- Allows church-level registration tokens for self-service user registration
-- Users who register via token are locked by default until admin review

CREATE TABLE IF NOT EXISTS church_registration_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  is_active TINYINT(1) DEFAULT 1,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
  INDEX idx_crt_token (token),
  INDEX idx_crt_church_id (church_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
