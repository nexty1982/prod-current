-- Migration: Add performance indexes for OCR query optimization
-- Date: 2026-03-24
-- Related: OM Daily #121

-- ocr_jobs: church + status lookup (used by worker, admin dashboards)
CREATE INDEX IF NOT EXISTS idx_church_status ON ocr_jobs (church_id, status);

-- ocr_jobs: status + created_at scan (used by worker polling, stale detection)
CREATE INDEX IF NOT EXISTS idx_status_created ON ocr_jobs (status, created_at);

-- ocr_jobs: created_by lookup (user audit trail)
CREATE INDEX IF NOT EXISTS idx_created_by ON ocr_jobs (created_by);

-- ocr_jobs: church + record_type filter
CREATE INDEX IF NOT EXISTS idx_church_record_type ON ocr_jobs (church_id, record_type);

-- ocr_job_history: job_id lookup
CREATE INDEX IF NOT EXISTS idx_ojh_job_id ON ocr_job_history (job_id);
