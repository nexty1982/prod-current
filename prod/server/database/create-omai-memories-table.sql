-- Create OMAI Memories Table for Consume Mode
-- This table stores long-term memories that OMAI can learn from

CREATE TABLE IF NOT EXISTS omai_memories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text TEXT NOT NULL,
  context_type VARCHAR(50) DEFAULT 'general',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  tags JSON DEFAULT NULL,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  source VARCHAR(100) DEFAULT 'omai_consume',
  INDEX idx_timestamp (timestamp),
  INDEX idx_context_type (context_type),
  INDEX idx_priority (priority)
); 