-- OCR Sessions table for barcode-based validation
CREATE TABLE IF NOT EXISTS ocr_sessions (
    id VARCHAR(36) PRIMARY KEY,
    pin_code VARCHAR(6) NOT NULL,
    barcode_data TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_used BOOLEAN DEFAULT FALSE,
    user_email VARCHAR(255),
    target_language VARCHAR(10) DEFAULT 'en',
    tier_level ENUM('standard', 'express') DEFAULT 'standard',
    disclaimer_accepted BOOLEAN DEFAULT FALSE,
    disclaimer_language VARCHAR(10) DEFAULT 'en',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME NULL,
    upload_completed_at DATETIME NULL,
    session_metadata JSON
);

-- OCR Upload records
CREATE TABLE IF NOT EXISTS ocr_uploads (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    processing_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    ocr_result LONGTEXT,
    translated_text LONGTEXT,
    confidence_score DECIMAL(5,2),
    processing_time_ms INT,
    error_message TEXT,
    enhanced_image_path VARCHAR(500),
    export_pdf_path VARCHAR(500),
    export_xlsx_path VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    FOREIGN KEY (session_id) REFERENCES ocr_sessions(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_ocr_sessions_pin ON ocr_sessions(pin_code);
CREATE INDEX idx_ocr_sessions_expires ON ocr_sessions(expires_at);
CREATE INDEX idx_ocr_sessions_verified ON ocr_sessions(is_verified);
CREATE INDEX idx_ocr_uploads_session ON ocr_uploads(session_id);
CREATE INDEX idx_ocr_uploads_status ON ocr_uploads(processing_status);
