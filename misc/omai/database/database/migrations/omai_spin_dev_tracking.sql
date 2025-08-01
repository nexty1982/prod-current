-- =====================================================
-- OMAI-Spin Development Environment Tracking Database
-- Tracks all mirroring operations from production to dev
-- =====================================================

-- Create the tracking database
CREATE DATABASE IF NOT EXISTS omai_spin_dev_db
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE omai_spin_dev_db;

-- =====================================================
-- Core Tracking Tables
-- =====================================================

-- Track spin sessions (each full mirror operation)
CREATE TABLE IF NOT EXISTS spin_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_uuid VARCHAR(36) UNIQUE NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    src_path VARCHAR(255) NOT NULL,
    dest_path VARCHAR(255) NOT NULL,
    triggered_by VARCHAR(64) DEFAULT 'manual',
    status ENUM('started', 'in_progress', 'completed', 'failed') DEFAULT 'started',
    total_files_copied INT DEFAULT 0,
    total_files_excluded INT DEFAULT 0,
    total_files_modified INT DEFAULT 0,
    databases_migrated JSON DEFAULT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME NULL,
    duration_seconds INT DEFAULT NULL,
    error_message TEXT NULL,
    config_replacements INT DEFAULT 0,
    env_modifications INT DEFAULT 0,
    
    INDEX idx_timestamp (timestamp),
    INDEX idx_status (status),
    INDEX idx_triggered_by (triggered_by),
    INDEX idx_session_uuid (session_uuid)
) ENGINE=InnoDB;

-- Track individual file operations
CREATE TABLE IF NOT EXISTS file_changes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    relative_path VARCHAR(500) NOT NULL,
    action ENUM('copied', 'excluded', 'modified', 'replaced', 'created') NOT NULL,
    file_size BIGINT DEFAULT NULL,
    modification_type VARCHAR(100) DEFAULT NULL, -- 'config_replace', 'env_sanitize', etc.
    old_content_hash VARCHAR(64) DEFAULT NULL,
    new_content_hash VARCHAR(64) DEFAULT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES spin_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_action (action),
    INDEX idx_timestamp (timestamp),
    INDEX idx_file_path (file_path(255))
) ENGINE=InnoDB;

-- Track environment variable modifications
CREATE TABLE IF NOT EXISTS env_modifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    file_name VARCHAR(100) NOT NULL, -- '.env.development', 'config.js', etc.
    key_name VARCHAR(100) NOT NULL,
    old_value TEXT DEFAULT NULL,
    new_value TEXT DEFAULT NULL,
    modification_reason VARCHAR(200) DEFAULT NULL,
    is_sensitive BOOLEAN DEFAULT FALSE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES spin_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_key_name (key_name),
    INDEX idx_file_name (file_name),
    INDEX idx_sensitive (is_sensitive)
) ENGINE=InnoDB;

-- Track database operations
CREATE TABLE IF NOT EXISTS database_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    operation_type ENUM('dump', 'restore', 'sanitize', 'create') NOT NULL,
    source_database VARCHAR(100) NOT NULL,
    target_database VARCHAR(100) NOT NULL,
    dump_file_path VARCHAR(500) DEFAULT NULL,
    dump_size_bytes BIGINT DEFAULT NULL,
    records_affected INT DEFAULT NULL,
    sanitization_rules_applied JSON DEFAULT NULL,
    operation_status ENUM('started', 'completed', 'failed') DEFAULT 'started',
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME NULL,
    duration_seconds INT DEFAULT NULL,
    error_message TEXT NULL,
    
    FOREIGN KEY (session_id) REFERENCES spin_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_operation_type (operation_type),
    INDEX idx_source_database (source_database),
    INDEX idx_target_database (target_database),
    INDEX idx_operation_status (operation_status)
) ENGINE=InnoDB;

-- Comprehensive logging for all agent operations
CREATE TABLE IF NOT EXISTS agent_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT DEFAULT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    log_level ENUM('debug', 'info', 'warn', 'error', 'fatal') DEFAULT 'info',
    component VARCHAR(50) NOT NULL, -- 'file_sync', 'db_dump', 'sanitizer', etc.
    operation VARCHAR(100) DEFAULT NULL,
    message TEXT NOT NULL,
    details JSON DEFAULT NULL,
    execution_time_ms INT DEFAULT NULL,
    memory_usage_mb DECIMAL(10,2) DEFAULT NULL,
    
    FOREIGN KEY (session_id) REFERENCES spin_sessions(id) ON DELETE SET NULL,
    INDEX idx_session_id (session_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_log_level (log_level),
    INDEX idx_component (component),
    FULLTEXT idx_message_search (message)
) ENGINE=InnoDB;

-- Track configuration replacements (URLs, domains, etc.)
CREATE TABLE IF NOT EXISTS config_replacements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    replacement_type VARCHAR(50) NOT NULL, -- 'url', 'domain', 'api_endpoint', etc.
    pattern_matched VARCHAR(200) NOT NULL,
    old_value TEXT NOT NULL,
    new_value TEXT NOT NULL,
    line_number INT DEFAULT NULL,
    context_before TEXT DEFAULT NULL,
    context_after TEXT DEFAULT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES spin_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_replacement_type (replacement_type),
    INDEX idx_file_path (file_path(255))
) ENGINE=InnoDB;

-- Track sanitization actions on database data
CREATE TABLE IF NOT EXISTS sanitization_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    database_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    sanitization_type VARCHAR(50) NOT NULL, -- 'email_mask', 'key_redact', 'domain_replace', etc.
    original_pattern VARCHAR(200) DEFAULT NULL,
    replacement_pattern VARCHAR(200) DEFAULT NULL,
    records_affected INT DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES spin_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_database_name (database_name),
    INDEX idx_table_name (table_name),
    INDEX idx_sanitization_type (sanitization_type)
) ENGINE=InnoDB;

-- =====================================================
-- Helper Views for Quick Analysis
-- =====================================================

-- Session summary view
CREATE VIEW session_summary AS
SELECT 
    s.id,
    s.session_uuid,
    s.timestamp,
    s.triggered_by,
    s.status,
    s.total_files_copied,
    s.total_files_excluded,
    s.total_files_modified,
    s.duration_seconds,
    COUNT(DISTINCT do1.id) as database_operations,
    COUNT(DISTINCT em.id) as env_modifications,
    COUNT(DISTINCT cr.id) as config_replacements,
    s.error_message
FROM spin_sessions s
LEFT JOIN database_operations do1 ON s.id = do1.session_id
LEFT JOIN env_modifications em ON s.id = em.session_id
LEFT JOIN config_replacements cr ON s.id = cr.session_id
GROUP BY s.id
ORDER BY s.timestamp DESC;

-- Recent activity view
CREATE VIEW recent_activity AS
SELECT 
    'session' as activity_type,
    s.id as activity_id,
    s.timestamp,
    CONCAT('Spin session ', s.status, ' - ', s.total_files_copied, ' files copied') as description,
    s.status as status
FROM spin_sessions s
UNION ALL
SELECT 
    'database' as activity_type,
    do1.id as activity_id,
    do1.start_time as timestamp,
    CONCAT('DB ', do1.operation_type, ': ', do1.source_database, ' → ', do1.target_database) as description,
    do1.operation_status as status
FROM database_operations do1
ORDER BY timestamp DESC
LIMIT 50;

-- =====================================================
-- Stored Procedures for Common Operations
-- =====================================================

DELIMITER //

-- Start a new spin session
CREATE PROCEDURE StartSpinSession(
    IN p_src_path VARCHAR(255),
    IN p_dest_path VARCHAR(255),
    IN p_triggered_by VARCHAR(64),
    OUT p_session_id INT,
    OUT p_session_uuid VARCHAR(36)
)
BEGIN
    SET p_session_uuid = UUID();
    
    INSERT INTO spin_sessions (session_uuid, src_path, dest_path, triggered_by, status)
    VALUES (p_session_uuid, p_src_path, p_dest_path, p_triggered_by, 'started');
    
    SET p_session_id = LAST_INSERT_ID();
    
    INSERT INTO agent_logs (session_id, log_level, component, message)
    VALUES (p_session_id, 'info', 'session_manager', 
            CONCAT('Started new spin session: ', p_src_path, ' → ', p_dest_path));
END //

-- Complete a spin session
CREATE PROCEDURE CompleteSpinSession(
    IN p_session_id INT,
    IN p_status ENUM('completed', 'failed'),
    IN p_error_message TEXT,
    IN p_total_files_copied INT,
    IN p_total_files_excluded INT,
    IN p_total_files_modified INT
)
BEGIN
    DECLARE start_time_val DATETIME;
    DECLARE duration_val INT;
    
    SELECT start_time INTO start_time_val 
    FROM spin_sessions 
    WHERE id = p_session_id;
    
    SET duration_val = TIMESTAMPDIFF(SECOND, start_time_val, NOW());
    
    UPDATE spin_sessions 
    SET 
        status = p_status,
        end_time = NOW(),
        duration_seconds = duration_val,
        error_message = p_error_message,
        total_files_copied = p_total_files_copied,
        total_files_excluded = p_total_files_excluded,
        total_files_modified = p_total_files_modified
    WHERE id = p_session_id;
    
    INSERT INTO agent_logs (session_id, log_level, component, message)
    VALUES (p_session_id, 'info', 'session_manager', 
            CONCAT('Session completed with status: ', p_status, 
                   ' (', duration_val, ' seconds, ', 
                   p_total_files_copied, ' files copied)'));
END //

-- Log agent operation
CREATE PROCEDURE LogAgentOperation(
    IN p_session_id INT,
    IN p_log_level ENUM('debug', 'info', 'warn', 'error', 'fatal'),
    IN p_component VARCHAR(50),
    IN p_operation VARCHAR(100),
    IN p_message TEXT,
    IN p_details JSON,
    IN p_execution_time_ms INT
)
BEGIN
    INSERT INTO agent_logs (
        session_id, log_level, component, operation, message, 
        details, execution_time_ms
    ) VALUES (
        p_session_id, p_log_level, p_component, p_operation, 
        p_message, p_details, p_execution_time_ms
    );
END //

DELIMITER ;

-- =====================================================
-- Initial Data and Settings
-- =====================================================

-- Insert initial tracking data
INSERT INTO agent_logs (log_level, component, message) VALUES 
('info', 'system', 'OMAI-Spin tracking database initialized successfully');

-- Create user for the spin system (if needed)
-- CREATE USER IF NOT EXISTS 'omai_spin'@'localhost' IDENTIFIED BY 'secure_spin_password';
-- GRANT ALL PRIVILEGES ON omai_spin_dev_db.* TO 'omai_spin'@'localhost';
-- FLUSH PRIVILEGES;

-- =====================================================
-- Cleanup and Maintenance Procedures
-- =====================================================

DELIMITER //

-- Clean up old sessions (older than specified days)
CREATE PROCEDURE CleanupOldSessions(IN days_to_keep INT)
BEGIN
    DECLARE sessions_deleted INT DEFAULT 0;
    
    SELECT COUNT(*) INTO sessions_deleted 
    FROM spin_sessions 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    DELETE FROM spin_sessions 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    INSERT INTO agent_logs (log_level, component, message)
    VALUES ('info', 'maintenance', 
            CONCAT('Cleaned up ', sessions_deleted, ' old sessions (older than ', days_to_keep, ' days)'));
END //

DELIMITER ;

-- =====================================================
-- Performance Indexes and Optimizations
-- =====================================================

-- Additional composite indexes for complex queries
CREATE INDEX idx_session_status_time ON spin_sessions(status, timestamp);
CREATE INDEX idx_file_session_action ON file_changes(session_id, action);
CREATE INDEX idx_db_ops_session_type ON database_operations(session_id, operation_type);
CREATE INDEX idx_logs_session_level_time ON agent_logs(session_id, log_level, timestamp);

-- =====================================================
-- Success Message
-- =====================================================

SELECT 'OMAI-Spin tracking database created successfully!' as status,
       'Tables: spin_sessions, file_changes, env_modifications, database_operations, agent_logs, config_replacements, sanitization_log' as tables_created,
       'Views: session_summary, recent_activity' as views_created,
       'Procedures: StartSpinSession, CompleteSpinSession, LogAgentOperation, CleanupOldSessions' as procedures_created;