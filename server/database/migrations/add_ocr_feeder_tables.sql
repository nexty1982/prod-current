-- OCR Feeder Subsystem Tables
-- Idempotent migration for OCR Content Feeder (queue + worker + artifacts)
-- Compatible with MySQL 8+ and MariaDB 10.3+

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Main feeder jobs table
CREATE TABLE IF NOT EXISTS ocr_feeder_jobs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  church_id       BIGINT UNSIGNED NOT NULL,
  source_type     VARCHAR(64) NOT NULL COMMENT 'upload, import, api, etc.',
  status          ENUM('queued', 'processing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'queued',
  created_by      BIGINT UNSIGNED NULL COMMENT 'user_id from session',
  options_json    JSON NULL COMMENT 'job-level options and configuration',
  stats_json      JSON NULL COMMENT 'aggregated statistics (page counts, success rates, etc.)',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_church_status (church_id, status),
  KEY idx_status_created (status, created_at),
  KEY idx_created_by (created_by),
  CONSTRAINT fk_feeder_job_church FOREIGN KEY (church_id) REFERENCES orthodoxmetrics_db.churches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Individual pages within a job
CREATE TABLE IF NOT EXISTS ocr_feeder_pages (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_id          BIGINT UNSIGNED NOT NULL,
  page_index      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0-based page number',
  status          ENUM('queued', 'preprocessing', 'ocr', 'parsing', 'scoring', 'accepted', 'review', 'failed', 'retry') NOT NULL DEFAULT 'queued',
  input_path      VARCHAR(500) NULL COMMENT 'original file path',
  preproc_path    VARCHAR(500) NULL COMMENT 'preprocessed image path',
  thumb_path      VARCHAR(500) NULL COMMENT 'thumbnail path for UI preview',
  rotation        INT NULL DEFAULT 0 COMMENT 'rotation angle in degrees',
  dpi             INT NULL COMMENT 'detected or set DPI',
  bbox_crop_json  JSON NULL COMMENT 'bounding box for crop region {x, y, width, height}',
  quality_score   DECIMAL(5,3) NULL COMMENT '0.000-1.000 image quality score',
  ocr_confidence  DECIMAL(5,3) NULL COMMENT '0.000-1.000 OCR confidence score',
  retry_count     INT UNSIGNED NOT NULL DEFAULT 0,
  last_error      TEXT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_job_page (job_id, page_index),
  KEY idx_status_updated (status, updated_at),
  KEY idx_retry (status, retry_count),
  CONSTRAINT fk_feeder_page_job FOREIGN KEY (job_id) REFERENCES ocr_feeder_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Artifacts produced during processing
CREATE TABLE IF NOT EXISTS ocr_feeder_artifacts (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  page_id         BIGINT UNSIGNED NOT NULL,
  type            VARCHAR(64) NOT NULL COMMENT 'raw_text, tokens, layout, record_candidates, etc.',
  storage_path    VARCHAR(500) NOT NULL COMMENT 'file system path to artifact',
  json_blob       LONGTEXT NULL COMMENT 'JSON content if type is JSON-based',
  meta_json       JSON NULL COMMENT 'metadata about the artifact',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_page_type (page_id, type),
  KEY idx_type (type),
  CONSTRAINT fk_feeder_artifact_page FOREIGN KEY (page_id) REFERENCES ocr_feeder_pages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional correction memory for learning from user corrections
CREATE TABLE IF NOT EXISTS ocr_correction_memory (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  church_id       BIGINT UNSIGNED NOT NULL,
  record_type     VARCHAR(64) NOT NULL COMMENT 'baptism, marriage, funeral, etc.',
  template_key    VARCHAR(128) NOT NULL COMMENT 'identifies the field/template pattern',
  value_json      JSON NOT NULL COMMENT 'corrected value structure',
  examples_json   JSON NULL COMMENT 'array of example corrections',
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_correction_memory (church_id, record_type, template_key),
  KEY idx_church_record (church_id, record_type),
  CONSTRAINT fk_correction_church FOREIGN KEY (church_id) REFERENCES orthodoxmetrics_db.churches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

