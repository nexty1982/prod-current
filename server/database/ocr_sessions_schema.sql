-- server/database/ocr_sessions_schema.sql
-- Create OCR sessions table for barcode-based session validation

CREATE TABLE IF NOT EXISTS ocr_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL UNIQUE,
    pin VARCHAR(6) NOT NULL,
    church_id INT DEFAULT 1,
    record_type ENUM('baptism', 'marriage', 'funeral') DEFAULT 'baptism',
    created_by INT,
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_email VARCHAR(255),
    user_phone VARCHAR(20),
    
    INDEX idx_session_id (session_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_created_by (created_by),
    INDEX idx_church_id (church_id)
);

-- Add foreign key constraints if users table exists
-- ALTER TABLE ocr_sessions ADD CONSTRAINT fk_ocr_sessions_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
