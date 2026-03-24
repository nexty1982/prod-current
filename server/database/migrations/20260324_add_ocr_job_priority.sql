-- Migration: Add priority column to ocr_jobs for queue ordering
-- Date: 2026-03-24
-- Values: 1=urgent, 5=normal (default), 9=low

ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS priority TINYINT UNSIGNED NOT NULL DEFAULT 5 COMMENT '1=urgent 5=normal 9=low' AFTER status;
CREATE INDEX IF NOT EXISTS idx_priority_created ON ocr_jobs (priority ASC, created_at ASC);
