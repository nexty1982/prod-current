-- Migration: Create OCR Training Data Management Tables
-- Date: July 14, 2025
-- Purpose: Create comprehensive tables for OCR training data, analysis results, and pattern improvement

-- Training data uploads table
CREATE TABLE IF NOT EXISTS training_uploads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id VARCHAR(50) NOT NULL,
    upload_type ENUM('json', 'image') NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    upload_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    
    json_structure JSON DEFAULT NULL,
    validation_errors JSON DEFAULT NULL,
    
    image_metadata JSON DEFAULT NULL,
    ocr_text LONGTEXT DEFAULT NULL,
    ocr_confidence DECIMAL(5,4) DEFAULT NULL,
    
    processed_at TIMESTAMP NULL,
    processing_time_ms INT DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_church_upload (church_id, upload_type),
    INDEX idx_status (upload_status),
    INDEX idx_created (created_at)
);

-- Entity extraction results table
CREATE TABLE IF NOT EXISTS extraction_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    upload_id INT NOT NULL,
    extraction_method ENUM('json_provided', 'ocr_generated', 'manual_review') NOT NULL,
    
    source_text LONGTEXT NOT NULL,
    record_type VARCHAR(50) NOT NULL,
    language_detected VARCHAR(20) DEFAULT NULL,
    
    extracted_fields JSON NOT NULL,
    confidence_score DECIMAL(5,4) NOT NULL,
    field_confidence_scores JSON DEFAULT NULL,
    
    expected_fields JSON DEFAULT NULL,
    accuracy_metrics JSON DEFAULT NULL,
    
    patterns_used JSON DEFAULT NULL,
    pattern_matches JSON DEFAULT NULL,
    extraction_errors JSON DEFAULT NULL,
    
    requires_review BOOLEAN DEFAULT FALSE,
    review_status ENUM('pending', 'approved', 'rejected', 'modified') DEFAULT 'pending',
    reviewer_notes TEXT DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (upload_id) REFERENCES training_uploads(id) ON DELETE CASCADE,
    INDEX idx_upload_extraction (upload_id),
    INDEX idx_record_type (record_type),
    INDEX idx_confidence (confidence_score),
    INDEX idx_review_status (requires_review, review_status)
);

-- Pattern analysis and improvement tracking
CREATE TABLE IF NOT EXISTS pattern_improvements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    extraction_result_id INT NOT NULL,
    
    field_name VARCHAR(100) NOT NULL,
    current_pattern TEXT NOT NULL,
    suggested_pattern TEXT DEFAULT NULL,
    pattern_type ENUM('regex', 'nlp', 'positional', 'contextual') NOT NULL,
    
    current_accuracy DECIMAL(5,4) DEFAULT NULL,
    suggested_accuracy DECIMAL(5,4) DEFAULT NULL,
    confidence_improvement DECIMAL(5,4) DEFAULT NULL,
    
    failure_reason TEXT DEFAULT NULL,
    improvement_reasoning TEXT DEFAULT NULL,
    test_cases JSON DEFAULT NULL,
    
    status ENUM('proposed', 'testing', 'approved', 'implemented', 'rejected') DEFAULT 'proposed',
    implementation_notes TEXT DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (extraction_result_id) REFERENCES extraction_results(id) ON DELETE CASCADE,
    INDEX idx_field_pattern (field_name, pattern_type),
    INDEX idx_status (status),
    INDEX idx_accuracy_improvement (suggested_accuracy, confidence_improvement)
);

-- Training analytics and metrics
CREATE TABLE IF NOT EXISTS training_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id VARCHAR(50) NOT NULL,
    
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    
    total_uploads INT DEFAULT 0,
    json_uploads INT DEFAULT 0,
    image_uploads INT DEFAULT 0,
    successful_uploads INT DEFAULT 0,
    failed_uploads INT DEFAULT 0,
    
    total_ocr_processes INT DEFAULT 0,
    avg_ocr_confidence DECIMAL(5,4) DEFAULT NULL,
    total_ocr_processing_time_ms BIGINT DEFAULT 0,
    
    total_extractions INT DEFAULT 0,
    avg_extraction_confidence DECIMAL(5,4) DEFAULT NULL,
    successful_extractions INT DEFAULT 0,
    extractions_requiring_review INT DEFAULT 0,
    
    field_accuracy_metrics JSON DEFAULT NULL,
    language_performance_metrics JSON DEFAULT NULL,
    record_type_performance JSON DEFAULT NULL,
    
    patterns_suggested INT DEFAULT 0,
    patterns_implemented INT DEFAULT 0,
    avg_accuracy_improvement DECIMAL(5,4) DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_church_period (church_id, period_start, period_end),
    INDEX idx_period (period_start, period_end)
);

-- OCR processing queue for batch operations
CREATE TABLE IF NOT EXISTS ocr_processing_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    upload_id INT NOT NULL,
    
    tesseract_config JSON DEFAULT NULL,
    language_codes VARCHAR(100) DEFAULT 'eng+rus+ell',
    processing_priority INT DEFAULT 5,
    
    status ENUM('queued', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'queued',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    processing_duration_ms INT DEFAULT NULL,
    
    ocr_output LONGTEXT DEFAULT NULL,
    confidence_scores JSON DEFAULT NULL,
    error_details TEXT DEFAULT NULL,
    
    memory_usage_mb INT DEFAULT NULL,
    cpu_time_ms INT DEFAULT NULL,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (upload_id) REFERENCES training_uploads(id) ON DELETE CASCADE,
    INDEX idx_status_priority (status, processing_priority),
    INDEX idx_upload_queue (upload_id),
    INDEX idx_queued_time (queued_at)
);

-- Training batch operations for bulk processing
CREATE TABLE IF NOT EXISTS training_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id VARCHAR(50) NOT NULL,
    batch_name VARCHAR(255) NOT NULL,
    batch_description TEXT DEFAULT NULL,
    
    batch_type ENUM('ocr_processing', 'pattern_testing', 'accuracy_validation') NOT NULL,
    configuration JSON DEFAULT NULL,
    
    total_items INT DEFAULT 0,
    processed_items INT DEFAULT 0,
    successful_items INT DEFAULT 0,
    failed_items INT DEFAULT 0,
    
    status ENUM('created', 'queued', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'created',
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    estimated_completion TIMESTAMP NULL,
    
    results_summary JSON DEFAULT NULL,
    performance_metrics JSON DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_church_batch (church_id, batch_type),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
);

-- Create sample analytics data for testing
INSERT INTO training_analytics (
    church_id, period_start, period_end,
    total_uploads, json_uploads, image_uploads, successful_uploads,
    avg_extraction_confidence, field_accuracy_metrics
) VALUES (
    'SSPPOC_001', 
    DATE_SUB(NOW(), INTERVAL 30 DAY), 
    NOW(),
    25, 10, 15, 23,
    0.8750,
    JSON_OBJECT(
        'firstName', 0.95,
        'lastName', 0.92,
        'birthDate', 0.88,
        'baptismDate', 0.85,
        'fatherName', 0.78,
        'motherName', 0.82,
        'parish', 0.90
    )
);

-- Verify migration completed successfully
SELECT 'OCR Training Data Migration completed successfully' AS status;
SELECT COUNT(*) AS total_training_tables FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name IN (
    'training_uploads', 'extraction_results', 'pattern_improvements', 
    'training_analytics', 'ocr_processing_queue', 'training_batches'
);
