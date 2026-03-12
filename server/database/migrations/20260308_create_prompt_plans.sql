-- Prompt Plans: ordered sequences of AI prompts for complex initiatives
-- Part of OM Daily / AI workflow layer (NOT release management)

CREATE TABLE IF NOT EXISTS prompt_plans (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  status          ENUM('draft','active','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
  created_by      INT,
  completed_at    DATETIME,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prompt_plan_steps (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  prompt_plan_id         INT NOT NULL,
  step_number            INT NOT NULL,
  title                  VARCHAR(255) NOT NULL,
  prompt_text            TEXT,
  status                 ENUM('pending','ready','running','completed','blocked','failed','skipped') NOT NULL DEFAULT 'pending',
  generated_work_item_id INT,
  execution_order        INT NOT NULL,
  notes                  TEXT,
  is_required            BOOLEAN NOT NULL DEFAULT TRUE,
  metadata               JSON,
  started_at             DATETIME,
  completed_at           DATETIME,
  created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_plan_id (prompt_plan_id),
  INDEX idx_plan_order (prompt_plan_id, execution_order),
  INDEX idx_work_item (generated_work_item_id),
  CONSTRAINT fk_step_plan FOREIGN KEY (prompt_plan_id) REFERENCES prompt_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
