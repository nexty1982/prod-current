-- Database schema for OCR jobs table (to be created in each church database)
-- File: database/migrations/create_ocr_jobs_table.sql

CREATE TABLE IF NOT EXISTS ocr_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  status ENUM('pending','processing','complete','error') DEFAULT 'pending',
  record_type ENUM('baptism','marriage','funeral','custom') DEFAULT 'custom',
  language CHAR(2) DEFAULT 'en',
  description TEXT,
  confidence_score DECIMAL(5,2) NULL,
  error_regions TEXT NULL COMMENT 'JSON array of error regions with coordinates',
  ocr_result LONGTEXT NULL COMMENT 'Full OCR text result',
  processing_log TEXT NULL COMMENT 'Processing steps and debug info',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_church_status (church_id, status),
  INDEX idx_church_created (church_id, created_at),
  INDEX idx_record_type (record_type),
  INDEX idx_language (language),
  INDEX idx_confidence (confidence_score),
  
  -- Foreign key constraint (if churches table exists in same DB)
  -- FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
  
  CONSTRAINT chk_confidence_range CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create OCR settings table for per-church configuration
CREATE TABLE IF NOT EXISTS ocr_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL UNIQUE,
  confidence_threshold DECIMAL(3,2) DEFAULT 0.80,
  default_language CHAR(2) DEFAULT 'en',
  preprocessing_enabled BOOLEAN DEFAULT TRUE,
  auto_process BOOLEAN DEFAULT TRUE,
  notification_email VARCHAR(255) NULL,
  record_path_baptism VARCHAR(255) DEFAULT '/records/baptism',
  record_path_marriage VARCHAR(255) DEFAULT '/records/marriage',
  record_path_funeral VARCHAR(255) DEFAULT '/records/funeral',
  ocr_engine ENUM('google_vision','tesseract','hybrid') DEFAULT 'google_vision',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_church_id (church_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default OCR settings for the church
INSERT IGNORE INTO ocr_settings (church_id, confidence_threshold, default_language, preprocessing_enabled, auto_process)
VALUES (1, 0.80, 'en', TRUE, TRUE);

-- Create OCR processing queue table for background jobs
CREATE TABLE IF NOT EXISTS ocr_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ocr_job_id INT NOT NULL,
  church_id INT NOT NULL,
  priority INT DEFAULT 5 COMMENT '1=highest, 10=lowest priority',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  next_attempt_at TIMESTAMP NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_priority_created (priority, created_at),
  INDEX idx_church_id (church_id),
  INDEX idx_next_attempt (next_attempt_at),
  
  FOREIGN KEY (ocr_job_id) REFERENCES ocr_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
