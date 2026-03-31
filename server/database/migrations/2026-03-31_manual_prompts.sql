-- Manual Prompts — stores pasted prompt documents with parsed metadata
-- Migration: 2026-03-31

CREATE TABLE IF NOT EXISTS manual_prompts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prompt_id VARCHAR(200) NULL,              -- parsed: e.g. PROMPT-MANUAL-PROMPT-CREATOR-001
  work_item_id VARCHAR(200) NULL,           -- parsed: e.g. OMAI-MANUAL-PROMPT-CREATION-TOOL
  change_set_id VARCHAR(200) NULL,          -- parsed: e.g. CS-MANUAL-PROMPT-CREATION-TOOL
  branch_name VARCHAR(300) NULL,            -- parsed: branch name
  prompt_scope TEXT NULL,                   -- parsed: scope/purpose line
  parent_prompt VARCHAR(200) NULL,          -- parsed: parent prompt ID
  depends_on VARCHAR(200) NULL,             -- parsed: dependency prompt ID
  raw_body MEDIUMTEXT NOT NULL,             -- full pasted prompt text, preserved exactly
  source ENUM('manual','pasted','imported') NOT NULL DEFAULT 'pasted',
  revision INT UNSIGNED NOT NULL DEFAULT 1, -- increments when same prompt_id saved with different body
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT UNSIGNED NULL,             -- user ID if available

  INDEX idx_prompt_id (prompt_id),
  INDEX idx_parent_prompt (parent_prompt),
  INDEX idx_work_item_id (work_item_id),
  INDEX idx_created_at (created_at),
  FULLTEXT INDEX ft_raw_body (raw_body)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
