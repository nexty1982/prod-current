-- ============================================================
-- Church Enrichment Profiles + Enrichment Runs
-- Stores approximate established dates, parish size estimates,
-- and source/confidence tracking for each enrichment attempt.
-- ============================================================

-- Enrichment runs: one row per batch execution
CREATE TABLE IF NOT EXISTS church_enrichment_runs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  run_type        ENUM('single','batch','full') NOT NULL DEFAULT 'batch',
  status          ENUM('running','completed','failed','cancelled') NOT NULL DEFAULT 'running',
  filter_state    VARCHAR(5)    DEFAULT NULL,
  filter_jurisdiction VARCHAR(100) DEFAULT NULL,
  total_churches  INT           NOT NULL DEFAULT 0,
  enriched_count  INT           NOT NULL DEFAULT 0,
  failed_count    INT           NOT NULL DEFAULT 0,
  skipped_count   INT           NOT NULL DEFAULT 0,
  options_json    JSON          DEFAULT NULL,
  error_message   TEXT          DEFAULT NULL,
  started_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    TIMESTAMP     NULL DEFAULT NULL,
  created_by      INT           DEFAULT NULL,
  INDEX idx_status (status),
  INDEX idx_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enrichment profiles: one row per church (latest enrichment result)
CREATE TABLE IF NOT EXISTS church_enrichment_profiles (
  id                          INT AUTO_INCREMENT PRIMARY KEY,
  church_id                   INT           NOT NULL,
  run_id                      INT           DEFAULT NULL,

  -- Established date fields
  established_year            INT           DEFAULT NULL,
  established_date            DATE          DEFAULT NULL,
  established_date_precision  ENUM('year','month','full_date','unknown') DEFAULT 'unknown',
  established_source_type     ENUM('website','oca_directory','diocesan_site','manual','inferred') DEFAULT NULL,
  established_source_url      TEXT          DEFAULT NULL,
  established_source_excerpt  TEXT          DEFAULT NULL,
  established_confidence      ENUM('high','medium','low','none') DEFAULT 'none',

  -- Parish size fields
  size_category               ENUM('unknown','mission_small','parish_small','parish_medium','parish_large','cathedral_or_major') DEFAULT 'unknown',
  estimated_family_count_min  INT           DEFAULT NULL,
  estimated_family_count_max  INT           DEFAULT NULL,
  size_source_type            ENUM('website','oca_directory','diocesan_site','manual','inferred') DEFAULT NULL,
  size_source_url             TEXT          DEFAULT NULL,
  size_source_excerpt         TEXT          DEFAULT NULL,
  size_confidence             ENUM('high','medium','low','none') DEFAULT 'none',

  -- Processing metadata
  extraction_method           VARCHAR(100)  DEFAULT NULL,
  enrichment_status           ENUM('pending','enriched','low_confidence','review_required','failed','no_data') NOT NULL DEFAULT 'pending',
  enrichment_notes            TEXT          DEFAULT NULL,
  raw_signals_json            JSON          DEFAULT NULL,

  -- Manual override
  manual_established_year     INT           DEFAULT NULL,
  manual_size_category        ENUM('unknown','mission_small','parish_small','parish_medium','parish_large','cathedral_or_major') DEFAULT NULL,
  manual_notes                TEXT          DEFAULT NULL,
  reviewed_by                 INT           DEFAULT NULL,
  reviewed_at                 TIMESTAMP     NULL DEFAULT NULL,

  -- Timestamps
  last_enriched_at            TIMESTAMP     NULL DEFAULT NULL,
  created_at                  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_church (church_id),
  INDEX idx_enrichment_status (enrichment_status),
  INDEX idx_established_year (established_year),
  INDEX idx_size_category (size_category),
  INDEX idx_confidence (established_confidence, size_confidence),
  INDEX idx_run (run_id),

  CONSTRAINT fk_enrichment_church FOREIGN KEY (church_id) REFERENCES us_churches(id) ON DELETE CASCADE,
  CONSTRAINT fk_enrichment_run FOREIGN KEY (run_id) REFERENCES church_enrichment_runs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
