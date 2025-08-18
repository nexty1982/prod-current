-- Migration: Add missing tables for dashboard functionality
-- Date: 2025-01-09
-- Purpose: Support real-time dashboard data instead of mock data

-- Create record_reviews table for tracking records that need review
CREATE TABLE IF NOT EXISTS record_reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  church_id INT NOT NULL,
  record_type VARCHAR(50) NOT NULL,
  record_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  reviewer_id INT,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  INDEX idx_church_status (church_id, status),
  INDEX idx_created (created_at),
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
);

-- Create upload_logs table for tracking file uploads and errors
CREATE TABLE IF NOT EXISTS upload_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  church_id INT NOT NULL,
  user_id INT,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size BIGINT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  processing_time_ms INT,
  records_extracted INT DEFAULT 0,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_church_status (church_id, status),
  INDEX idx_created (created_at),
  INDEX idx_user (user_id),
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create activity_logs table for tracking all user activities
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  church_id INT NOT NULL,
  user_id INT NOT NULL,
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  record_type VARCHAR(50),
  record_id VARCHAR(255),
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  changes JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_church (church_id),
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_created (created_at),
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add some sample data for testing (optional - remove in production)
-- INSERT INTO record_reviews (church_id, record_type, record_id, status)
-- SELECT id, 'baptism', 'TEST-001', 'pending' FROM churches LIMIT 1;

-- INSERT INTO upload_logs (church_id, user_id, filename, status)
-- SELECT c.id, u.id, 'test-upload.pdf', 'success' 
-- FROM churches c, users u 
-- WHERE u.role = 'admin' LIMIT 1;
