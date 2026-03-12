-- Page Content Changes — tracks source-code edits via the Page Content Editor
CREATE TABLE IF NOT EXISTS page_content_changes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  page_id       VARCHAR(100) NOT NULL,
  page_name     VARCHAR(200) NOT NULL,
  files_changed JSON,
  items_changed INT NOT NULL DEFAULT 0,
  build_triggered TINYINT(1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pcc_created (created_at),
  INDEX idx_pcc_pending (build_triggered)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Page Content Builds — tracks frontend builds triggered from web UI
CREATE TABLE IF NOT EXISTS page_content_builds (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  run_id                VARCHAR(100) NOT NULL UNIQUE,
  triggered_by_user_id  INT,
  status                ENUM('running', 'success', 'failed') NOT NULL DEFAULT 'running',
  duration_ms           INT,
  output_tail           TEXT,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pcb_status (status),
  INDEX idx_pcb_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
