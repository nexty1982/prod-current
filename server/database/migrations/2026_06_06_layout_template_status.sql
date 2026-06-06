-- Add status workflow columns to ocr_extractors for candidate→approved lifecycle
ALTER TABLE ocr_extractors
  ADD COLUMN IF NOT EXISTS status ENUM('candidate','approved','rejected','archived') DEFAULT 'candidate' AFTER is_default,
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS approved_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS sample_job_id INT NULL,
  ADD COLUMN IF NOT EXISTS last_used_at DATETIME NULL;

-- Set existing templates to 'approved' since they were manually created
UPDATE ocr_extractors SET status = 'approved' WHERE status = 'candidate';
