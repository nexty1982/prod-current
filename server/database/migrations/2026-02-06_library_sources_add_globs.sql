-- ===============================================================================
-- OM-Library Sources - Add Glob Pattern Support
-- Created: 2026-02-06
-- Purpose: Add include/exclude glob patterns to library_sources for flexible scanning
-- ===============================================================================

USE orthodoxmetrics_db;

-- Add glob pattern columns to library_sources
ALTER TABLE library_sources
  ADD COLUMN include_globs JSON DEFAULT NULL 
    COMMENT 'Array of glob patterns to include (e.g., ["*.md", "task_*.md"])',
  ADD COLUMN exclude_globs JSON DEFAULT NULL 
    COMMENT 'Array of glob patterns to exclude (e.g., ["node_modules/**", ".git/**"])';

-- Update existing sources with default exclude patterns (common excludes)
UPDATE library_sources
SET exclude_globs = JSON_ARRAY(
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  '*.backup',
  '*~'
)
WHERE exclude_globs IS NULL;

-- Insert prod-root-daily source for daily task ingestion
INSERT INTO library_sources (name, path, is_active, scan_mode, description, include_globs, exclude_globs)
VALUES (
  'Prod Root - Daily Tasks',
  '/var/www/orthodoxmetrics/prod',
  TRUE,
  'shallow',
  'Daily task files from prod root (top-level only)',
  JSON_ARRAY(
    '*.md',
    'task_*.md',
    '*_SUMMARY.md',
    '*_FIX*.md',
    '*_STATUS.md',
    'CHANGE_LOG*.md'
  ),
  JSON_ARRAY(
    'node_modules/**',
    '.git/**',
    'server/**',
    'front-end/**',
    'docs/**',
    'uploads/**',
    'backups/**',
    'temp-backups/**',
    '*.zip',
    '*.pdf'
  )
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  include_globs = VALUES(include_globs),
  exclude_globs = VALUES(exclude_globs),
  is_active = VALUES(is_active);

-- Verification queries
SELECT 'Migration completed successfully!' AS status;
SELECT 
  id,
  name,
  path,
  scan_mode,
  is_active,
  JSON_LENGTH(include_globs) AS include_count,
  JSON_LENGTH(exclude_globs) AS exclude_count
FROM library_sources
ORDER BY id;

-- Show the new prod-root-daily source
SELECT 
  id,
  name,
  path,
  include_globs,
  exclude_globs
FROM library_sources
WHERE name LIKE '%Prod Root%';
