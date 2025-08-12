-- Component Usage Tracking Tables
-- Replaces the problematic JSON file-based tracking

-- Main component usage tracking table
CREATE TABLE IF NOT EXISTS component_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    component_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL DEFAULT 'access',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_component_id (component_id),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_component_user (component_id, user_id),
    INDEX idx_component_action (component_id, action)
);

-- Component usage summary table (for fast queries)
CREATE TABLE IF NOT EXISTS component_usage_summary (
    component_id VARCHAR(100) PRIMARY KEY,
    first_used TIMESTAMP,
    last_used TIMESTAMP,
    total_accesses INT DEFAULT 0,
    unique_users INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_last_used (last_used),
    INDEX idx_total_accesses (total_accesses)
);

-- Component action summary (for action-specific stats)
CREATE TABLE IF NOT EXISTS component_action_summary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    component_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    count INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_component_action (component_id, action),
    INDEX idx_component_id (component_id),
    INDEX idx_action (action)
);

-- User component usage summary (for user-specific stats)
CREATE TABLE IF NOT EXISTS user_component_summary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    component_id VARCHAR(100) NOT NULL,
    first_access TIMESTAMP,
    last_access TIMESTAMP,
    access_count INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_component (user_id, component_id),
    INDEX idx_user_id (user_id),
    INDEX idx_component_id (component_id),
    INDEX idx_last_access (last_access)
);