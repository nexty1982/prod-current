-- Create om_tasks table for OM Tasks management system
-- Run this migration to create the table

CREATE TABLE IF NOT EXISTS om_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  importance VARCHAR(20) NOT NULL,
  details LONGTEXT NOT NULL,
  tags JSON NOT NULL,
  attachments JSON NULL,
  status INT NOT NULL,
  type ENUM('documentation', 'configuration', 'reference', 'guide') NOT NULL,
  visibility ENUM('admin', 'public') NOT NULL DEFAULT 'admin',
  date_created DATETIME NOT NULL,
  date_completed DATETIME NULL,
  assigned_to VARCHAR(255) NULL,
  assigned_by VARCHAR(255) NULL,
  notes TEXT NULL,
  remind_me TINYINT(1) DEFAULT 0,
  revisions JSON NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  
  -- Indexes for common queries
  INDEX idx_visibility (visibility),
  INDEX idx_type (type),
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_date_created (date_created),
  INDEX idx_created_by (created_by),
  INDEX idx_visibility_type (visibility, type),
  INDEX idx_status_visibility (status, visibility)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

