-- Workflow Templates: reusable workflow definitions with parameterized steps
-- Part of Prompt Workflow System (Prompt 016)

CREATE TABLE IF NOT EXISTS workflow_templates (
  id CHAR(36) NOT NULL,
  name VARCHAR(300) NOT NULL,
  description TEXT,
  category ENUM('backend','frontend','fullstack','analytics','ops','database','devops','docs') NOT NULL DEFAULT 'backend',
  parameters JSON DEFAULT NULL COMMENT 'Array of {name, label, type, required, default_value, description}',
  version INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  usage_count INT NOT NULL DEFAULT 0,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_wt_category (category),
  INDEX idx_wt_active (is_active),
  INDEX idx_wt_name (name(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workflow_template_steps (
  id CHAR(36) NOT NULL,
  template_id CHAR(36) NOT NULL,
  step_number INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  purpose TEXT NOT NULL,
  component VARCHAR(200) DEFAULT NULL COMMENT 'Overrides template component; supports {{component_name}} parameter',
  prompt_type ENUM('plan','implementation','verification','correction','migration','docs') NOT NULL DEFAULT 'implementation',
  expected_outcome TEXT,
  requirements_summary TEXT,
  dependency_type ENUM('sequential','explicit','none') NOT NULL DEFAULT 'sequential',
  depends_on_step INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE,
  UNIQUE KEY uk_wts_template_step (template_id, step_number),
  INDEX idx_wts_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Version history: tracks each published version of a template
CREATE TABLE IF NOT EXISTS workflow_template_versions (
  id CHAR(36) NOT NULL,
  template_id CHAR(36) NOT NULL,
  version INT NOT NULL,
  snapshot JSON NOT NULL COMMENT 'Full template + steps frozen at this version',
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE,
  UNIQUE KEY uk_wtv_template_version (template_id, version),
  INDEX idx_wtv_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add template reference to existing workflows
ALTER TABLE prompt_workflows
  ADD COLUMN template_id CHAR(36) DEFAULT NULL AFTER generation_error,
  ADD COLUMN template_version INT DEFAULT NULL AFTER template_id;
