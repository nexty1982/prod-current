-- OrthodoxMetrics Big Book Database Schema
-- Comprehensive knowledge management system for scripts, docs, and AI learning

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Main documents/scripts table
CREATE TABLE IF NOT EXISTS bigbook_documents (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content LONGTEXT NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_type ENUM('markdown', 'sql', 'javascript', 'typescript', 'bash', 'powershell', 'json', 'yaml', 'config', 'other') NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    tags JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    status ENUM('active', 'deprecated', 'draft', 'archived') DEFAULT 'active',
    priority INT DEFAULT 5,
    execution_count INT DEFAULT 0,
    last_executed TIMESTAMP NULL,
    created_by VARCHAR(100) DEFAULT 'system',
    modified_by VARCHAR(100) DEFAULT 'system',
    
    INDEX idx_category (category),
    INDEX idx_file_type (file_type),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at),
    INDEX idx_file_path (file_path(255)),
    FULLTEXT idx_content (title, content)
);

-- Document relationships (dependencies, references)
CREATE TABLE IF NOT EXISTS bigbook_relationships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_doc_id VARCHAR(255) NOT NULL,
    target_doc_id VARCHAR(255) NOT NULL,
    relationship_type ENUM('depends_on', 'references', 'imports', 'extends', 'similar_to', 'replaces', 'version_of') NOT NULL,
    strength DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (source_doc_id) REFERENCES bigbook_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (target_doc_id) REFERENCES bigbook_documents(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_relationship (source_doc_id, target_doc_id, relationship_type),
    INDEX idx_relationship_type (relationship_type),
    INDEX idx_strength (strength)
);

-- Document execution history
CREATE TABLE IF NOT EXISTS bigbook_executions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doc_id VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_type ENUM('manual', 'scheduled', 'automated', 'test') NOT NULL,
    status ENUM('success', 'failed', 'partial', 'timeout') NOT NULL,
    duration_ms INT,
    output LONGTEXT,
    error_message TEXT,
    executed_by VARCHAR(100),
    environment VARCHAR(50) DEFAULT 'production',
    
    FOREIGN KEY (doc_id) REFERENCES bigbook_documents(id) ON DELETE CASCADE,
    
    INDEX idx_doc_id (doc_id),
    INDEX idx_executed_at (executed_at),
    INDEX idx_status (status),
    INDEX idx_execution_type (execution_type)
);

-- =====================================================
-- AI LEARNING TABLES
-- =====================================================

-- OMAI learning patterns and recommendations
CREATE TABLE IF NOT EXISTS bigbook_ai_patterns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pattern_type ENUM('script_pattern', 'error_pattern', 'solution_pattern', 'workflow_pattern', 'best_practice') NOT NULL,
    pattern_name VARCHAR(200) NOT NULL,
    pattern_description TEXT,
    pattern_data JSON NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    usage_count INT DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_pattern_type (pattern_type),
    INDEX idx_confidence_score (confidence_score),
    INDEX idx_usage_count (usage_count),
    INDEX idx_is_active (is_active)
);

-- AI recommendations for documents
CREATE TABLE IF NOT EXISTS bigbook_ai_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doc_id VARCHAR(255) NOT NULL,
    recommendation_type ENUM('improvement', 'security', 'performance', 'maintenance', 'integration', 'deprecation') NOT NULL,
    recommendation_text TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    status ENUM('pending', 'implemented', 'rejected', 'in_progress') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    implemented_at TIMESTAMP NULL,
    implemented_by VARCHAR(100),
    
    FOREIGN KEY (doc_id) REFERENCES bigbook_documents(id) ON DELETE CASCADE,
    
    INDEX idx_doc_id (doc_id),
    INDEX idx_recommendation_type (recommendation_type),
    INDEX idx_priority (priority),
    INDEX idx_status (status),
    INDEX idx_confidence_score (confidence_score)
);

-- AI learning from user interactions
CREATE TABLE IF NOT EXISTS bigbook_ai_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    interaction_type ENUM('search', 'view', 'execute', 'edit', 'feedback', 'question') NOT NULL,
    doc_id VARCHAR(255),
    user_query TEXT,
    ai_response TEXT,
    user_feedback ENUM('helpful', 'not_helpful', 'neutral') DEFAULT 'neutral',
    context_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255),
    
    FOREIGN KEY (doc_id) REFERENCES bigbook_documents(id) ON DELETE SET NULL,
    
    INDEX idx_interaction_type (interaction_type),
    INDEX idx_doc_id (doc_id),
    INDEX idx_user_feedback (user_feedback),
    INDEX idx_created_at (created_at),
    INDEX idx_session_id (session_id)
);

-- =====================================================
-- ORGANIZATION TABLES
-- =====================================================

-- Categories and tags management
CREATE TABLE IF NOT EXISTS bigbook_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id INT NULL,
    color VARCHAR(7) DEFAULT '#007bff',
    icon VARCHAR(50),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES bigbook_categories(id) ON DELETE SET NULL,
    
    INDEX idx_parent_id (parent_id),
    INDEX idx_sort_order (sort_order),
    INDEX idx_is_active (is_active)
);

-- Tags for flexible categorization
CREATE TABLE IF NOT EXISTS bigbook_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6c757d',
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_usage_count (usage_count)
);

-- Document-tag relationships
CREATE TABLE IF NOT EXISTS bigbook_document_tags (
    doc_id VARCHAR(255) NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (doc_id, tag_id),
    FOREIGN KEY (doc_id) REFERENCES bigbook_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES bigbook_tags(id) ON DELETE CASCADE
);

-- =====================================================
-- TIMELINE AND VERSIONING
-- =====================================================

-- Document version history
CREATE TABLE IF NOT EXISTS bigbook_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doc_id VARCHAR(255) NOT NULL,
    version_number INT NOT NULL,
    content LONGTEXT NOT NULL,
    change_summary TEXT,
    changed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (doc_id) REFERENCES bigbook_documents(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_version (doc_id, version_number),
    INDEX idx_doc_id (doc_id),
    INDEX idx_version_number (version_number),
    INDEX idx_created_at (created_at)
);

-- Timeline events for document changes
CREATE TABLE IF NOT EXISTS bigbook_timeline (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type ENUM('created', 'updated', 'executed', 'recommended', 'deprecated', 'archived', 'restored') NOT NULL,
    doc_id VARCHAR(255),
    event_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    
    FOREIGN KEY (doc_id) REFERENCES bigbook_documents(id) ON DELETE SET NULL,
    
    INDEX idx_event_type (event_type),
    INDEX idx_doc_id (doc_id),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- SEARCH AND INDEXING
-- =====================================================

-- Search index for fast document retrieval
CREATE TABLE IF NOT EXISTS bigbook_search_index (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doc_id VARCHAR(255) NOT NULL,
    search_text LONGTEXT NOT NULL,
    keywords JSON,
    last_indexed TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (doc_id) REFERENCES bigbook_documents(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_doc_index (doc_id),
    FULLTEXT idx_search_text (search_text),
    INDEX idx_last_indexed (last_indexed)
);

-- Search query history for AI learning
CREATE TABLE IF NOT EXISTS bigbook_search_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query_text VARCHAR(500) NOT NULL,
    results_count INT DEFAULT 0,
    clicked_doc_id VARCHAR(255),
    search_duration_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255),
    
    FOREIGN KEY (clicked_doc_id) REFERENCES bigbook_documents(id) ON DELETE SET NULL,
    
    INDEX idx_query_text (query_text),
    INDEX idx_clicked_doc_id (clicked_doc_id),
    INDEX idx_created_at (created_at),
    INDEX idx_session_id (session_id)
);

-- =====================================================
-- SYSTEM CONFIGURATION
-- =====================================================

-- Big Book system configuration
CREATE TABLE IF NOT EXISTS bigbook_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    config_type ENUM('string', 'number', 'boolean', 'json', 'array') DEFAULT 'string',
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_config_key (config_key),
    INDEX idx_is_system (is_system)
);

-- File watcher configuration
CREATE TABLE IF NOT EXISTS bigbook_watchers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    watch_path VARCHAR(1000) NOT NULL,
    file_patterns JSON,
    exclude_patterns JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_scan TIMESTAMP NULL,
    scan_interval_seconds INT DEFAULT 300,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_watch_path (watch_path(255)),
    INDEX idx_is_active (is_active),
    INDEX idx_last_scan (last_scan)
);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default categories
INSERT IGNORE INTO bigbook_categories (name, description, color, icon, sort_order) VALUES
('Scripts', 'Automation and utility scripts', '#28a745', 'code', 1),
('Documentation', 'System documentation and guides', '#17a2b8', 'book', 2),
('Database', 'SQL scripts and database management', '#ffc107', 'database', 3),
('Configuration', 'System configuration files', '#6f42c1', 'cog', 4),
('Testing', 'Test scripts and validation tools', '#fd7e14', 'check-circle', 5),
('Deployment', 'Deployment and setup scripts', '#e83e8c', 'rocket', 6),
('Maintenance', 'System maintenance and cleanup', '#6c757d', 'tools', 7),
('AI/ML', 'AI and machine learning components', '#20c997', 'brain', 8);

-- Insert default configuration
INSERT IGNORE INTO bigbook_config (config_key, config_value, config_type, description, is_system) VALUES
('storage_path', '/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook', 'string', 'Base storage path for Big Book files', TRUE),
('max_file_size', '10485760', 'number', 'Maximum file size in bytes (10MB)', TRUE),
('supported_extensions', '["md", "sql", "js", "ts", "sh", "ps1", "json", "yaml", "yml", "conf", "config"]', 'json', 'Supported file extensions', TRUE),
('ai_enabled', 'true', 'boolean', 'Enable AI learning and recommendations', TRUE),
('auto_index', 'true', 'boolean', 'Automatically index new files', TRUE),
('search_history_retention_days', '90', 'number', 'Days to retain search history', TRUE),
('backup_enabled', 'true', 'boolean', 'Enable Big Book backup', TRUE),
('backup_retention_days', '30', 'number', 'Days to retain Big Book backups', TRUE);

-- Insert default watchers
INSERT IGNORE INTO bigbook_watchers (watch_path, file_patterns, exclude_patterns) VALUES
('/var/www/orthodox-church-mgmt/orthodoxmetrics/prod', '["**/*.md", "**/*.sql", "**/*.js", "**/*.ts", "**/*.sh", "**/*.ps1"]', '["**/node_modules/**", "**/.git/**", "**/logs/**", "**/temp/**"]'),
('/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts', '["**/*.js", "**/*.sh", "**/*.sql"]', '["**/backups/**", "**/temp/**"]'),
('/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/docs', '["**/*.md", "**/*.sql"]', '["**/archive/**"]');

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_docs_category_status ON bigbook_documents(category, status);
CREATE INDEX idx_docs_type_priority ON bigbook_documents(file_type, priority);
CREATE INDEX idx_executions_doc_status ON bigbook_executions(doc_id, status);
CREATE INDEX idx_recommendations_doc_status ON bigbook_ai_recommendations(doc_id, status);
CREATE INDEX idx_timeline_doc_type ON bigbook_timeline(doc_id, event_type);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Document summary view
CREATE OR REPLACE VIEW bigbook_document_summary AS
SELECT 
    d.id,
    d.title,
    d.file_path,
    d.file_type,
    d.category,
    d.status,
    d.priority,
    d.execution_count,
    d.last_executed,
    d.created_at,
    d.updated_at,
    COUNT(DISTINCT r.target_doc_id) as reference_count,
    COUNT(DISTINCT e.id) as execution_count_recent,
    COUNT(DISTINCT ar.id) as active_recommendations
FROM bigbook_documents d
LEFT JOIN bigbook_relationships r ON d.id = r.source_doc_id
LEFT JOIN bigbook_executions e ON d.id = e.doc_id AND e.executed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
LEFT JOIN bigbook_ai_recommendations ar ON d.id = ar.doc_id AND ar.status = 'pending'
GROUP BY d.id;

-- AI learning summary view
CREATE OR REPLACE VIEW bigbook_ai_summary AS
SELECT 
    'patterns' as type,
    COUNT(*) as count,
    AVG(confidence_score) as avg_confidence,
    SUM(usage_count) as total_usage
FROM bigbook_ai_patterns
WHERE is_active = TRUE
UNION ALL
SELECT 
    'recommendations' as type,
    COUNT(*) as count,
    AVG(confidence_score) as avg_confidence,
    COUNT(CASE WHEN status = 'implemented' THEN 1 END) as total_usage
FROM bigbook_ai_recommendations
UNION ALL
SELECT 
    'interactions' as type,
    COUNT(*) as count,
    AVG(CASE WHEN user_feedback = 'helpful' THEN 1.0 WHEN user_feedback = 'not_helpful' THEN 0.0 ELSE 0.5 END) as avg_confidence,
    COUNT(CASE WHEN user_feedback = 'helpful' THEN 1 END) as total_usage
FROM bigbook_ai_interactions
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY); 