-- Daily Changelog table for OM Daily work pipelines
-- Captures git commits daily, matches to pipeline items, emails digest

CREATE TABLE IF NOT EXISTS om_daily_changelog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  commits JSON NOT NULL,
  files_changed JSON,
  summary TEXT,
  status_breakdown JSON,
  matched_items JSON,
  email_sent_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
