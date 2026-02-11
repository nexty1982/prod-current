-- OMAI Task Assignment System Database Migration
-- Creates task_links table for secure task assignment links
-- Created: January 2025

-- Create task_links table
DROP TABLE IF EXISTS task_links;
CREATE TABLE task_links (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME DEFAULT DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 DAY),
    is_used BOOLEAN DEFAULT FALSE,
    used_at DATETIME NULL,
    created_by_omai BOOLEAN DEFAULT TRUE,
    INDEX idx_token (token),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
);

-- Create task_submissions table for logging submissions
DROP TABLE IF EXISTS task_submissions;
CREATE TABLE task_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_link_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    tasks_json TEXT NOT NULL,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_to_nick BOOLEAN DEFAULT FALSE,
    sent_at DATETIME NULL,
    FOREIGN KEY (task_link_id) REFERENCES task_links(id) ON DELETE CASCADE,
    INDEX idx_task_link_id (task_link_id),
    INDEX idx_submitted_at (submitted_at)
);

-- Insert sample data for testing (optional)
-- INSERT INTO task_links (email, token, created_at) VALUES 
-- ('test@example.com', 'test-uuid-token-12345', NOW());

-- Success message
SELECT 'OMAI Task Assignment tables created successfully' as status; 