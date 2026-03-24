-- Migration: OCR batch processing, API usage tracking, dead letter queue, timing metrics
-- Date: 2026-03-24
-- Addresses OM Daily items: #5, #21, #23, #117, #125, #157

-- #117: Add batch_id to ocr_jobs for grouping batch uploads
ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS batch_id VARCHAR(64) NULL COMMENT 'Groups jobs from a single batch upload' AFTER church_id;
CREATE INDEX IF NOT EXISTS idx_batch_id ON ocr_jobs (batch_id);

-- #21: Add pipeline timing metrics columns
ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS preprocess_ms INT UNSIGNED NULL COMMENT 'Preprocessing duration in ms' AFTER completed_at;
ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS ocr_ms INT UNSIGNED NULL COMMENT 'OCR/Vision API duration in ms' AFTER preprocess_ms;
ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS parse_ms INT UNSIGNED NULL COMMENT 'Parsing/extraction duration in ms' AFTER ocr_ms;
ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS total_ms INT UNSIGNED NULL COMMENT 'Total processing duration in ms' AFTER parse_ms;

-- #23: Add dead letter queue support
ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS retry_count TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Number of processing attempts' AFTER total_ms;
ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS max_retries TINYINT UNSIGNED NOT NULL DEFAULT 3 COMMENT 'Max retry attempts before dead letter' AFTER retry_count;
ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS dead_letter TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=permanently failed, moved to dead letter queue' AFTER max_retries;
ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS last_error TEXT NULL COMMENT 'Last error message for failed/dead-letter jobs' AFTER dead_letter;
ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS error_category VARCHAR(50) NULL COMMENT 'Error type: api_timeout, rate_limit, parse_error, invalid_image, unknown' AFTER last_error;
CREATE INDEX IF NOT EXISTS idx_dead_letter ON ocr_jobs (dead_letter, status);

-- #5 + #157: Vision API usage tracking table
CREATE TABLE IF NOT EXISTS ocr_api_usage (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  church_id INT NOT NULL,
  job_id INT NULL COMMENT 'Reference to ocr_jobs.id',
  api_provider VARCHAR(32) NOT NULL DEFAULT 'google_vision' COMMENT 'google_vision, azure_cv, etc.',
  operation_type VARCHAR(32) NOT NULL DEFAULT 'text_detection' COMMENT 'text_detection, document_text, label_detection',
  page_count SMALLINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Number of pages/images in this API call',
  estimated_cost_usd DECIMAL(8,4) NOT NULL DEFAULT 0.0000 COMMENT 'Estimated cost in USD',
  response_ms INT UNSIGNED NULL COMMENT 'API response time in ms',
  success TINYINT(1) NOT NULL DEFAULT 1,
  error_message VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_church_date (church_id, created_at),
  INDEX idx_job (job_id),
  INDEX idx_provider_date (api_provider, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- #125: Storage usage tracking table
CREATE TABLE IF NOT EXISTS storage_usage (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  church_id INT NOT NULL,
  category VARCHAR(32) NOT NULL COMMENT 'ocr_artifacts, ocr_originals, certificates, uploads',
  file_count INT UNSIGNED NOT NULL DEFAULT 0,
  total_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  measured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_church_category (church_id, category),
  INDEX idx_measured (measured_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- #106: Error categorization view for OCR failures
CREATE OR REPLACE VIEW ocr_dead_letter_queue AS
SELECT
  id, church_id, filename, status, error_category, last_error,
  retry_count, max_retries, created_at, completed_at
FROM ocr_jobs
WHERE dead_letter = 1
ORDER BY completed_at DESC;

-- #157: Vision API daily quota view
CREATE OR REPLACE VIEW ocr_api_daily_usage AS
SELECT
  DATE(created_at) AS usage_date,
  church_id,
  api_provider,
  COUNT(*) AS api_calls,
  SUM(page_count) AS total_pages,
  SUM(estimated_cost_usd) AS total_cost_usd,
  AVG(response_ms) AS avg_response_ms,
  SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failed_calls
FROM ocr_api_usage
GROUP BY DATE(created_at), church_id, api_provider;
