-- Migration: Create workflow learning registry
-- Date: 2026-03-30
-- Purpose: Cross-workflow learning engine — captures recurring violations,
--          success patterns, and structural patterns for deterministic
--          constraint injection into future prompt generation.

CREATE TABLE IF NOT EXISTS workflow_learning_registry (
  id              CHAR(36)    PRIMARY KEY,
  learning_type   ENUM('violation_pattern', 'success_pattern', 'structural_pattern') NOT NULL,
  pattern_signature VARCHAR(200) NOT NULL UNIQUE,
  title           VARCHAR(300) NOT NULL,
  description     TEXT         NOT NULL,
  constraint_text TEXT         NULL     COMMENT 'Deterministic constraint to inject into prompts',
  occurrences     INT          NOT NULL DEFAULT 1,
  severity        ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  affected_components TEXT     NULL     COMMENT 'JSON array of component names',
  source_workflow_ids TEXT     NULL     COMMENT 'JSON array of workflow IDs that contributed',
  source_prompt_ids   TEXT     NULL     COMMENT 'JSON array of prompt IDs that contributed',
  active          TINYINT(1)   NOT NULL DEFAULT 1,
  global_candidate TINYINT(1)  NOT NULL DEFAULT 0 COMMENT 'Crossed threshold for global injection',
  resolved_at     TIMESTAMP    NULL,
  resolved_by     VARCHAR(100) NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CHECK (JSON_VALID(affected_components) OR affected_components IS NULL),
  CHECK (JSON_VALID(source_workflow_ids) OR source_workflow_ids IS NULL),
  CHECK (JSON_VALID(source_prompt_ids) OR source_prompt_ids IS NULL),

  INDEX idx_learning_type (learning_type),
  INDEX idx_severity (severity),
  INDEX idx_active (active),
  INDEX idx_global_candidate (global_candidate),
  INDEX idx_pattern_sig (pattern_signature),
  INDEX idx_last_seen (last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tracks which learnings were injected into which prompts (traceability)
CREATE TABLE IF NOT EXISTS workflow_learning_injections (
  id              CHAR(36)    PRIMARY KEY,
  learning_id     CHAR(36)    NOT NULL,
  prompt_id       CHAR(36)    NOT NULL,
  workflow_id     CHAR(36)    NULL,
  constraint_text TEXT        NOT NULL COMMENT 'The exact constraint text injected',
  injection_reason VARCHAR(500) NOT NULL,
  created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (learning_id) REFERENCES workflow_learning_registry(id) ON DELETE CASCADE,
  INDEX idx_injection_prompt (prompt_id),
  INDEX idx_injection_learning (learning_id),
  INDEX idx_injection_workflow (workflow_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
