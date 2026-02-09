-- ===============================================================================
-- OM-Library Enhancements Migration
-- Created: 2026-02-05
-- Purpose: Add database support for configurable scan sources and relationships
-- ===============================================================================

-- ============================================================================
-- TABLE: library_sources
-- Purpose: Store configurable scan locations for om-librarian agent
-- ============================================================================
CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.library_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT 'Human-readable name for this source',
  path VARCHAR(500) NOT NULL COMMENT 'Absolute path to scan (must be under allowlist root)',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether to include in scans',
  scan_mode ENUM('recursive', 'shallow', 'single') DEFAULT 'recursive' COMMENT 'How deep to scan',
  description TEXT DEFAULT NULL COMMENT 'Optional notes about this source',
  last_scan TIMESTAMP NULL DEFAULT NULL COMMENT 'Last time this source was scanned',
  file_count INT DEFAULT 0 COMMENT 'Number of files found in last scan',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_library_sources_path (path),
  INDEX idx_library_sources_active (is_active),
  INDEX idx_library_sources_last_scan (last_scan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Configurable scan locations for OM-Library documentation indexing';

-- ============================================================================
-- TABLE: library_relationships
-- Purpose: Store manual and computed relationships between library documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.library_relationships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id VARCHAR(50) NOT NULL COMMENT 'Unique identifier for this relationship group',
  file_id VARCHAR(255) NOT NULL COMMENT 'Document ID from library index',
  relationship_type ENUM('filename_similarity', 'content_similarity', 'manual') DEFAULT 'manual',
  score DECIMAL(5,4) DEFAULT NULL COMMENT 'Similarity score (0-1) for computed relationships',
  created_by INT DEFAULT NULL COMMENT 'User ID who created manual relationship',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_library_relationships_group_file (group_id, file_id),
  INDEX idx_library_relationships_file (file_id),
  INDEX idx_library_relationships_group (group_id),
  INDEX idx_library_relationships_type (relationship_type),
  
  FOREIGN KEY fk_library_relationships_user (created_by) 
    REFERENCES orthodoxmetrics_db.users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Document relationship groups for OM-Library';

-- ============================================================================
-- Insert Default Scan Sources (from current om-librarian hardcoded paths)
-- ============================================================================
INSERT INTO orthodoxmetrics_db.library_sources (name, path, is_active, scan_mode, description) VALUES
  ('Daily Logs - Jan 27 2026', '/var/www/orthodoxmetrics/prod/docs/01-27-2026', TRUE, 'recursive', 'Daily development logs from January 27, 2026'),
  ('Daily Logs - Jan 20-21 2026', '/var/www/orthodoxmetrics/prod/docs/1-20-26', TRUE, 'recursive', 'Daily development logs from January 20-21, 2026'),
  ('Daily Logs - Jan 22 2026', '/var/www/orthodoxmetrics/prod/docs/1-22-26', TRUE, 'recursive', 'Daily development logs from January 22, 2026'),
  ('Archive', '/var/www/orthodoxmetrics/prod/docs/ARCHIVE', TRUE, 'recursive', 'Archived and historical documentation'),
  ('Development Docs', '/var/www/orthodoxmetrics/prod/docs/dev', TRUE, 'recursive', 'Development guidelines and technical documentation'),
  ('OCR System Docs', '/var/www/orthodoxmetrics/prod/docs/ocr', TRUE, 'recursive', 'OCR and document processing documentation'),
  ('Records System Docs', '/var/www/orthodoxmetrics/prod/docs/records', TRUE, 'recursive', 'Church records system documentation'),
  ('Operations Docs', '/var/www/orthodoxmetrics/prod/docs/ops', TRUE, 'recursive', 'Operational procedures and runbooks')
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  description = VALUES(description),
  is_active = VALUES(is_active);

-- ============================================================================
-- Verification Queries
-- ============================================================================
SELECT 'Migration completed successfully!' AS status;
SELECT COUNT(*) AS total_sources, SUM(is_active) AS active_sources FROM orthodoxmetrics_db.library_sources;
SELECT id, name, path, is_active FROM orthodoxmetrics_db.library_sources ORDER BY name;
