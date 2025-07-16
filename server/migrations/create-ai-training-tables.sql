-- Migration: Create AI Training Data Tables
-- Date: July 14, 2025
-- Purpose: Support AI training data collection and analysis for OCR entity extraction

-- Training data uploads table
CREATE TABLE IF NOT EXISTS ai_training_uploads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    validation_errors JSON DEFAULT NULL,
    record_count INT DEFAULT 0,
    processed_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    processing_time_ms INT DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_church_uploads (church_id),
    INDEX idx_upload_status (status),
    INDEX idx_upload_date (upload_date)
);

-- Training records table - stores individual OCR training samples
CREATE TABLE IF NOT EXISTS ai_training_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    upload_id INT NOT NULL,
    church_id VARCHAR(50) NOT NULL,
    record_index INT NOT NULL,
    
    -- OCR Data
    ocr_text TEXT NOT NULL,
    record_type ENUM('baptism', 'marriage', 'funeral', 'general') NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    confidence_score DECIMAL(3,2) DEFAULT NULL,
    
    -- Expected/Ground Truth Data
    expected_fields JSON NOT NULL,
    
    -- Extraction Results
    extracted_fields JSON DEFAULT NULL,
    extraction_confidence DECIMAL(3,2) DEFAULT NULL,
    extraction_success BOOLEAN DEFAULT NULL,
    extraction_time_ms INT DEFAULT NULL,
    
    -- Pattern Analysis
    detected_patterns JSON DEFAULT NULL,
    registry_format BOOLEAN DEFAULT FALSE,
    column_structure JSON DEFAULT NULL,
    
    -- Quality Metrics
    field_accuracy DECIMAL(3,2) DEFAULT NULL,
    field_matches JSON DEFAULT NULL,
    improvement_suggestions TEXT DEFAULT NULL,
    
    -- Timestamps
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (upload_id) REFERENCES ai_training_uploads(id) ON DELETE CASCADE,
    INDEX idx_training_church (church_id),
    INDEX idx_training_type (record_type),
    INDEX idx_training_language (language),
    INDEX idx_training_success (extraction_success),
    INDEX idx_training_accuracy (field_accuracy),
    INDEX idx_training_confidence (extraction_confidence)
);

-- Pattern learning table - stores discovered patterns for improvement
CREATE TABLE IF NOT EXISTS ai_pattern_learning (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Pattern Information
    pattern_type ENUM('regex', 'entity', 'structure', 'validation') NOT NULL,
    pattern_category VARCHAR(100) NOT NULL, -- 'names', 'dates', 'locations', etc.
    pattern_regex TEXT DEFAULT NULL,
    pattern_description TEXT NOT NULL,
    
    -- Performance Metrics
    success_rate DECIMAL(3,2) DEFAULT NULL,
    total_tests INT DEFAULT 0,
    successful_tests INT DEFAULT 0,
    failed_tests INT DEFAULT 0,
    
    -- Context
    record_types JSON DEFAULT NULL, -- which record types this applies to
    languages JSON DEFAULT NULL,    -- which languages this applies to
    
    -- Improvement Tracking
    confidence_level DECIMAL(3,2) DEFAULT NULL,
    is_validated BOOLEAN DEFAULT FALSE,
    validation_date TIMESTAMP NULL,
    replaced_pattern_id INT DEFAULT NULL, -- if this replaces an older pattern
    
    -- Examples
    positive_examples JSON DEFAULT NULL,
    negative_examples JSON DEFAULT NULL,
    
    -- Timestamps
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_tested TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_pattern_type (pattern_type),
    INDEX idx_pattern_category (pattern_category),
    INDEX idx_pattern_success_rate (success_rate),
    INDEX idx_pattern_confidence (confidence_level),
    INDEX idx_pattern_validated (is_validated)
);

-- Analysis sessions table - tracks batch analysis runs
CREATE TABLE IF NOT EXISTS ai_analysis_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Session Information
    session_name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    analysis_type ENUM('training', 'validation', 'pattern_discovery', 'performance_test') NOT NULL,
    
    -- Input Data
    upload_ids JSON DEFAULT NULL,
    record_count INT DEFAULT 0,
    filter_criteria JSON DEFAULT NULL,
    
    -- Results
    overall_accuracy DECIMAL(3,2) DEFAULT NULL,
    processing_time_ms INT DEFAULT NULL,
    patterns_discovered INT DEFAULT 0,
    patterns_improved INT DEFAULT 0,
    
    -- Performance Metrics
    avg_extraction_time_ms DECIMAL(8,2) DEFAULT NULL,
    total_extractions INT DEFAULT 0,
    successful_extractions INT DEFAULT 0,
    failed_extractions INT DEFAULT 0,
    
    -- Status
    status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
    progress_percentage DECIMAL(3,0) DEFAULT 0,
    current_stage VARCHAR(100) DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    
    -- Results Summary
    results_summary JSON DEFAULT NULL,
    recommendations TEXT DEFAULT NULL,
    
    -- Timestamps
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_analysis_type (analysis_type),
    INDEX idx_analysis_status (status),
    INDEX idx_analysis_accuracy (overall_accuracy),
    INDEX idx_analysis_date (created_at)
);

-- Accuracy tracking table - detailed accuracy metrics
CREATE TABLE IF NOT EXISTS ai_accuracy_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Context
    training_record_id INT NOT NULL,
    analysis_session_id INT DEFAULT NULL,
    field_name VARCHAR(100) NOT NULL,
    
    -- Ground Truth vs Extracted
    expected_value TEXT DEFAULT NULL,
    extracted_value TEXT DEFAULT NULL,
    
    -- Accuracy Metrics
    is_exact_match BOOLEAN DEFAULT FALSE,
    similarity_score DECIMAL(3,2) DEFAULT NULL,
    confidence_score DECIMAL(3,2) DEFAULT NULL,
    
    -- Error Analysis
    error_type ENUM('missing', 'incorrect', 'partial', 'format', 'language') DEFAULT NULL,
    error_details JSON DEFAULT NULL,
    
    -- Pattern Performance
    matching_pattern_id INT DEFAULT NULL,
    pattern_confidence DECIMAL(3,2) DEFAULT NULL,
    
    -- Improvement Suggestions
    suggested_pattern TEXT DEFAULT NULL,
    improvement_priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (training_record_id) REFERENCES ai_training_records(id) ON DELETE CASCADE,
    FOREIGN KEY (analysis_session_id) REFERENCES ai_analysis_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (matching_pattern_id) REFERENCES ai_pattern_learning(id) ON DELETE SET NULL,
    
    INDEX idx_accuracy_field (field_name),
    INDEX idx_accuracy_match (is_exact_match),
    INDEX idx_accuracy_similarity (similarity_score),
    INDEX idx_accuracy_error_type (error_type),
    INDEX idx_accuracy_priority (improvement_priority)
);

-- Create summary view for dashboard
CREATE VIEW IF NOT EXISTS ai_training_dashboard_summary AS
SELECT 
    -- Upload Statistics
    COUNT(DISTINCT tu.id) as total_uploads,
    COUNT(DISTINCT CASE WHEN tu.status = 'completed' THEN tu.id END) as completed_uploads,
    COUNT(DISTINCT tr.id) as total_training_records,
    COUNT(DISTINCT CASE WHEN tr.extraction_success = 1 THEN tr.id END) as successful_extractions,
    
    -- Accuracy Metrics
    AVG(tr.field_accuracy) as avg_field_accuracy,
    AVG(tr.extraction_confidence) as avg_extraction_confidence,
    
    -- Pattern Statistics
    COUNT(DISTINCT pl.id) as total_patterns,
    COUNT(DISTINCT CASE WHEN pl.is_validated = 1 THEN pl.id END) as validated_patterns,
    AVG(pl.success_rate) as avg_pattern_success_rate,
    
    -- Performance Metrics
    AVG(tr.extraction_time_ms) as avg_extraction_time_ms,
    AVG(tu.processing_time_ms) as avg_upload_processing_time_ms,
    
    -- Language and Type Distribution
    GROUP_CONCAT(DISTINCT tr.language) as languages_processed,
    GROUP_CONCAT(DISTINCT tr.record_type) as record_types_processed,
    
    -- Recent Activity
    MAX(tu.upload_date) as last_upload_date,
    MAX(tr.processed_at) as last_processing_date
FROM ai_training_uploads tu
LEFT JOIN ai_training_records tr ON tu.id = tr.upload_id
LEFT JOIN ai_pattern_learning pl ON 1=1;

-- Verify migration completed successfully
SELECT 'AI Training Data Migration completed successfully' AS status;
SELECT 
    TABLE_NAME, 
    TABLE_ROWS 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME IN ('ai_training_uploads', 'ai_training_records', 'ai_pattern_learning', 'ai_analysis_sessions', 'ai_accuracy_tracking');
