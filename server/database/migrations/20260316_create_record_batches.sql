-- Record Batches: lifecycle tracking for parish record ingestion
-- Status flow: uploaded → processing → admin_review → approved → published

CREATE TABLE IF NOT EXISTS record_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  uploaded_by INT NOT NULL,
  status ENUM('uploaded','processing','admin_review','approved','published') NOT NULL DEFAULT 'uploaded',
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processing_started_at DATETIME NULL,
  processing_completed_at DATETIME NULL,
  admin_review_completed_at DATETIME NULL,
  published_at DATETIME NULL,
  records_count INT DEFAULT 0,
  batch_label VARCHAR(255) NULL,
  notes TEXT NULL,
  INDEX idx_church_id (church_id),
  INDEX idx_status (status),
  INDEX idx_church_status (church_id, status),
  CONSTRAINT fk_record_batches_church FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
