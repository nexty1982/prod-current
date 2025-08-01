-- Create OMAI Learning Sessions Table
-- This table tracks OMAI's training sessions and learning progress

CREATE TABLE IF NOT EXISTS omai_learning_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  phase ENUM('foundation', 'functional', 'operational', 'resolution', 'predictive') NOT NULL,
  status ENUM('pending', 'running', 'completed', 'failed', 'stopped') NOT NULL DEFAULT 'pending',
  progress INT NOT NULL DEFAULT 0, -- Progress percentage (0-100)
  
  -- Training results
  files_processed INT DEFAULT 0,
  memories_created INT DEFAULT 0,
  knowledge_extracted INT DEFAULT 0,
  errors_count INT DEFAULT 0,
  
  -- Training configuration
  config JSON, -- Training parameters and settings
  
  -- Timing
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_phase (phase),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create OMAI Learning Progress Tracking Table
CREATE TABLE IF NOT EXISTS omai_learning_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(36) NOT NULL,
  phase_step VARCHAR(100) NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  status ENUM('pending', 'running', 'completed', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
  progress INT NOT NULL DEFAULT 0,
  
  -- Step results
  data_processed JSON, -- What was processed in this step
  insights_gained JSON, -- What OMAI learned
  errors JSON, -- Any errors encountered
  
  -- Timing
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES omai_learning_sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_status (status),
  INDEX idx_phase_step (phase_step)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create OMAI Knowledge Base Table (for structured learning)
CREATE TABLE IF NOT EXISTS omai_knowledge_base (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(36),
  category ENUM('code_pattern', 'api_endpoint', 'database_schema', 'business_rule', 'error_pattern', 'performance_insight', 'security_note', 'deployment_config') NOT NULL,
  subcategory VARCHAR(100),
  
  -- Knowledge content
  title VARCHAR(255) NOT NULL,
  description TEXT,
  code_example TEXT,
  metadata JSON,
  
  -- Learning context
  source_file VARCHAR(500),
  confidence_score DECIMAL(3,2) DEFAULT 0.50, -- How confident OMAI is about this knowledge
  usage_frequency INT DEFAULT 0,
  last_validated_at DATETIME,
  
  -- Relationships
  related_knowledge JSON, -- IDs of related knowledge entries
  
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES omai_learning_sessions(id) ON DELETE SET NULL,
  INDEX idx_category (category),
  INDEX idx_subcategory (subcategory),
  INDEX idx_confidence (confidence_score),
  INDEX idx_session_id (session_id),
  FULLTEXT idx_search (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create OMAI Agent Execution Log Table
CREATE TABLE IF NOT EXISTS omai_agent_executions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(36),
  agent_type ENUM('analyzer', 'pattern_detector', 'knowledge_extractor', 'relationship_mapper', 'validator') NOT NULL,
  
  -- Execution details
  input_data JSON NOT NULL,
  output_data JSON,
  execution_time_ms INT,
  memory_usage_mb DECIMAL(8,2),
  
  -- Results
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  warnings JSON,
  metrics JSON,
  
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES omai_learning_sessions(id) ON DELETE SET NULL,
  INDEX idx_session_id (session_id),
  INDEX idx_agent_type (agent_type),
  INDEX idx_success (success),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample training phases configuration
INSERT IGNORE INTO omai_knowledge_base (category, title, description, metadata) VALUES
('business_rule', 'Training Phase: Foundation Knowledge', 'OMAI learns basic system structure, file organization, and core technologies', '{"phase": "foundation", "priority": "critical", "duration_estimate": "30-60 minutes"}'),
('business_rule', 'Training Phase: Functional Understanding', 'OMAI analyzes API patterns, component relationships, and data flow', '{"phase": "functional", "priority": "high", "duration_estimate": "45-90 minutes"}'),
('business_rule', 'Training Phase: Operational Intelligence', 'OMAI studies deployment patterns, monitoring, and performance optimization', '{"phase": "operational", "priority": "medium", "duration_estimate": "30-60 minutes"}'),
('business_rule', 'Training Phase: Issue Resolution', 'OMAI learns error patterns, debugging techniques, and solution strategies', '{"phase": "resolution", "priority": "high", "duration_estimate": "60-120 minutes"}'),
('business_rule', 'Training Phase: Predictive Capabilities', 'OMAI develops proactive maintenance and optimization recommendations', '{"phase": "predictive", "priority": "medium", "duration_estimate": "45-90 minutes"}');

-- Create indexes for better performance
CREATE INDEX idx_omai_memories_source ON omai_user_memories(source);
CREATE INDEX idx_omai_memories_category_priority ON omai_user_memories(category, priority);
CREATE INDEX idx_omai_memories_usage_tracking ON omai_user_memories(usage_count, last_accessed_at);

-- Add some sample learning session for demo purposes (optional)
-- This would typically be populated by actual training sessions
/* 
INSERT INTO omai_learning_sessions (id, user_id, name, phase, status, progress, files_processed, memories_created, knowledge_extracted) 
SELECT 
  UUID() as id,
  1 as user_id, -- Assuming user ID 1 exists
  'Demo Foundation Training' as name,
  'foundation' as phase,
  'completed' as status,
  100 as progress,
  25 as files_processed,
  12 as memories_created,
  150 as knowledge_extracted
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
LIMIT 1;
*/

-- Verify table creation
SELECT 
  TABLE_NAME, 
  TABLE_ROWS, 
  CREATE_TIME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME IN (
    'omai_learning_sessions', 
    'omai_learning_progress', 
    'omai_knowledge_base', 
    'omai_agent_executions'
  )
ORDER BY TABLE_NAME; 