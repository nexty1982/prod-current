-- Migration: Multi-Agent Routing and Selection System
-- Date: 2026-03-30
-- Purpose: Agent registry, routing rules, execution results, and comparison tracking
--          for deterministic multi-agent prompt execution.

-- ─── Agent Registry ────────────────────────────────────────────────────────
-- Central registry of all execution agents (Claude, GPT, etc.)

CREATE TABLE IF NOT EXISTS agent_registry (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Display name (e.g. Claude Sonnet 4, GPT-4o)',
  provider VARCHAR(50) NOT NULL COMMENT 'Provider key: anthropic, openai, etc.',
  model_id VARCHAR(100) NOT NULL COMMENT 'Exact model identifier for API calls',
  capabilities JSON NOT NULL DEFAULT '[]' COMMENT 'Array of capability tags: backend, frontend, analysis, ocr, etc.',
  status ENUM('active', 'inactive', 'deprecated') NOT NULL DEFAULT 'active',
  default_priority INT NOT NULL DEFAULT 50 COMMENT 'Lower = higher priority when multiple agents qualify',
  config JSON NULL COMMENT 'Provider-specific config: temperature, max_tokens, etc.',
  cost_per_1k_input DECIMAL(8,4) NULL COMMENT 'Cost tracking per 1k input tokens',
  cost_per_1k_output DECIMAL(8,4) NULL COMMENT 'Cost tracking per 1k output tokens',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_agent_status (status),
  INDEX idx_agent_provider (provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Agent Routing Rules ───────────────────────────────────────────────────
-- Deterministic rules mapping (component, prompt_type) → agent
-- Rules are evaluated in priority order; first match wins.

CREATE TABLE IF NOT EXISTS agent_routing_rules (
  id VARCHAR(36) PRIMARY KEY,
  rule_name VARCHAR(150) NOT NULL COMMENT 'Human-readable rule description',
  component VARCHAR(100) NULL COMMENT 'Target component filter (null = any component)',
  prompt_type VARCHAR(50) NULL COMMENT 'Prompt type filter: plan, implementation, verification, correction, migration, docs (null = any)',
  agent_id VARCHAR(36) NOT NULL COMMENT 'Agent to route to',
  priority INT NOT NULL DEFAULT 50 COMMENT 'Lower = evaluated first',
  is_multi_agent TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = also run comparison agents',
  comparison_agent_ids JSON NULL COMMENT 'Additional agent IDs for multi-agent mode',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agent_registry(id),
  INDEX idx_routing_active (active, priority),
  INDEX idx_routing_component (component),
  INDEX idx_routing_prompt_type (prompt_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Prompt Execution Results ──────────────────────────────────────────────
-- Stores every agent execution result for a prompt step.
-- In single-agent mode: one row per step execution.
-- In multi-agent mode: one row per agent per step execution.

CREATE TABLE IF NOT EXISTS prompt_execution_results (
  id VARCHAR(36) PRIMARY KEY,
  prompt_plan_step_id INT NOT NULL COMMENT 'FK to prompt_plan_steps',
  work_item_id INT NULL COMMENT 'FK to om_daily_items',
  agent_id VARCHAR(36) NOT NULL COMMENT 'Which agent produced this result',
  execution_group_id VARCHAR(36) NOT NULL COMMENT 'Groups results from same multi-agent run',

  -- Execution data
  prompt_text TEXT NOT NULL COMMENT 'Exact prompt sent (may include injected constraints)',
  result_text MEDIUMTEXT NULL COMMENT 'Agent raw output',
  execution_started_at TIMESTAMP NULL,
  execution_finished_at TIMESTAMP NULL,
  execution_duration_ms INT NULL COMMENT 'Wall-clock execution time',
  token_count_input INT NULL,
  token_count_output INT NULL,

  -- Evaluation (populated post-execution)
  evaluator_status ENUM('pending', 'evaluated', 'error') NOT NULL DEFAULT 'pending',
  completion_status ENUM('success', 'partial', 'failure', 'blocked', 'timeout') NULL,
  violations_found JSON NULL COMMENT 'Array of {type, description, severity}',
  violation_count INT NOT NULL DEFAULT 0,
  confidence DECIMAL(5,3) NULL COMMENT '0.000-1.000 confidence score',
  evaluation_notes TEXT NULL,
  evaluated_at TIMESTAMP NULL,

  -- Selection (populated after comparison)
  was_selected TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 if this result was chosen as the best',
  selection_reason TEXT NULL COMMENT 'Why this result was selected or rejected',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agent_registry(id),
  INDEX idx_exec_step (prompt_plan_step_id),
  INDEX idx_exec_group (execution_group_id),
  INDEX idx_exec_agent (agent_id),
  INDEX idx_exec_selected (was_selected),
  INDEX idx_exec_evaluator (evaluator_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Agent Comparisons ─────────────────────────────────────────────────────
-- Records the deterministic comparison outcome when multiple agents execute
-- the same prompt. One row per multi-agent execution group.

CREATE TABLE IF NOT EXISTS prompt_agent_comparisons (
  id VARCHAR(36) PRIMARY KEY,
  execution_group_id VARCHAR(36) NOT NULL UNIQUE COMMENT 'Links to prompt_execution_results',
  prompt_plan_step_id INT NOT NULL,
  agents_compared JSON NOT NULL COMMENT 'Array of agent_ids that participated',
  selected_agent_id VARCHAR(36) NOT NULL COMMENT 'Winning agent',
  selected_result_id VARCHAR(36) NOT NULL COMMENT 'Winning result row',

  -- Comparison details
  comparison_method VARCHAR(50) NOT NULL DEFAULT 'rule_based' COMMENT 'rule_based | weighted_score',
  comparison_scores JSON NOT NULL COMMENT 'Per-agent scores: {agent_id: {completion_rank, violation_rank, confidence_rank, total_score}}',
  selection_reason TEXT NOT NULL COMMENT 'Human-readable explanation',
  tie_breaker_used TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether tie-breaking was needed',
  tie_breaker_method VARCHAR(50) NULL COMMENT 'priority | cost | speed',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (selected_agent_id) REFERENCES agent_registry(id),
  FOREIGN KEY (selected_result_id) REFERENCES prompt_execution_results(id),
  INDEX idx_comparison_step (prompt_plan_step_id),
  INDEX idx_comparison_selected (selected_agent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Multi-Agent Configuration ─────────────────────────────────────────────
-- Global configuration for multi-agent behavior.

CREATE TABLE IF NOT EXISTS agent_config (
  config_key VARCHAR(100) PRIMARY KEY,
  config_value TEXT NOT NULL,
  description VARCHAR(255) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO agent_config (config_key, config_value, description) VALUES
  ('multi_agent_enabled', 'false', 'Global toggle for multi-agent execution mode'),
  ('default_execution_mode', 'single', 'Default mode: single or multi'),
  ('comparison_timeout_ms', '120000', 'Max wait time for slowest agent in multi-agent mode'),
  ('auto_evaluate', 'true', 'Automatically evaluate results after execution'),
  ('confidence_threshold', '0.7', 'Minimum confidence to accept a result without review');
