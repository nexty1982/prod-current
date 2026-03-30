/**
 * Multi-Agent Execution Service
 *
 * Orchestrates prompt execution across one or more agents.
 *
 * Modes:
 *   single  — Route to one agent, execute, record result
 *   multi   — Route to primary + comparison agents, execute in parallel,
 *             evaluate each, select best deterministically
 *
 * This service ties together:
 *   agentRoutingService   → which agent(s) to use
 *   agentRegistryService  → agent config
 *   resultSelectionService → evaluation + selection
 *
 * Core flows:
 *   executePrompt(stepId, promptText, context)   — Full execution lifecycle
 *   getExecutionGroup(groupId)                   — Retrieve execution group
 *   getConfig(key)                               — Read agent_config
 *   setConfig(key, value)                        — Write agent_config
 */

const { v4: uuidv4 } = require('uuid');
const { getAppPool } = require('../config/db');
const agentRouter = require('./agentRoutingService');
const resultSelection = require('./resultSelectionService');

// ─── Configuration ──────────────────────────────────────────────────────────

/**
 * Read a config value from agent_config table.
 */
async function getConfig(key) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    'SELECT config_value FROM agent_config WHERE config_key = ?',
    [key]
  );
  return rows.length > 0 ? rows[0].config_value : null;
}

/**
 * Set a config value.
 */
async function setConfig(key, value) {
  const pool = getAppPool();
  await pool.query(
    `INSERT INTO agent_config (config_key, config_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = ?`,
    [key, value, value]
  );
  return { success: true };
}

/**
 * Get all config as a map.
 */
async function getAllConfig() {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM agent_config ORDER BY config_key');
  const config = {};
  for (const row of rows) {
    config[row.config_key] = row.config_value;
  }
  return config;
}

// ─── Execution ──────────────────────────────────────────────────────────────

/**
 * Execute a prompt through the multi-agent system.
 *
 * @param {object} params
 * @param {number} params.stepId - prompt_plan_steps.id
 * @param {string} params.promptText - The prompt to execute
 * @param {string} [params.component] - Component for routing (e.g. 'backend')
 * @param {string} [params.promptType] - Prompt type for routing (e.g. 'implementation')
 * @param {number} [params.workItemId] - Linked om_daily_items.id
 * @param {boolean} [params.forceMultiAgent] - Override config to force multi-agent
 * @param {boolean} [params.forceSingleAgent] - Override config to force single-agent
 * @returns {{ execution_group_id, mode, results, selected, comparison }}
 */
async function executePrompt({
  stepId, promptText, component, promptType, workItemId,
  forceMultiAgent, forceSingleAgent,
}) {
  if (!stepId || !promptText) {
    throw new Error('stepId and promptText are required');
  }

  // Determine execution mode
  const multiEnabled = await getConfig('multi_agent_enabled');
  let mode = 'single';

  // Resolve routing
  const routing = await agentRouter.resolveAgent(component || null, promptType || null);

  if (forceSingleAgent) {
    mode = 'single';
  } else if (forceMultiAgent) {
    mode = 'multi';
  } else if (multiEnabled === 'true' && routing.is_multi_agent) {
    mode = 'multi';
  }

  const executionGroupId = uuidv4();

  // Build agent list
  const agents = [routing.primary_agent];
  if (mode === 'multi' && routing.comparison_agents.length > 0) {
    agents.push(...routing.comparison_agents);
  }

  // Execute all agents
  const results = [];
  if (mode === 'multi') {
    // Parallel execution — map agents alongside promises for traceability
    const timeout = parseInt(await getConfig('comparison_timeout_ms') || '120000', 10);
    const execPromises = agents.map(agent =>
      _executeWithAgent(agent, promptText, stepId, workItemId, executionGroupId, timeout)
    );
    const settled = await Promise.allSettled(execPromises);
    for (let i = 0; i < settled.length; i++) {
      const s = settled[i];
      if (s.status === 'fulfilled') {
        results.push(s.value);
      } else {
        // Preserve agent identity from the original agents array
        results.push({
          error: s.reason.message,
          agent_id: agents[i].id,
          agent_name: agents[i].name,
        });
      }
    }
  } else {
    // Single agent execution
    const result = await _executeWithAgent(
      routing.primary_agent, promptText, stepId, workItemId, executionGroupId
    );
    results.push(result);
  }

  // Auto-evaluate if configured — evaluate ALL recorded results, including
  // those with errors. Failed results that were recorded to DB need evaluation
  // so selection can compare all candidates deterministically.
  const autoEval = await getConfig('auto_evaluate');
  if (autoEval === 'true') {
    for (const result of results) {
      if (result.result_id) {
        await _autoEvaluate(result.result_id, result);
      }
    }
  }

  // Select best result (for multi-agent)
  let selected = null;
  let comparison = null;

  if (mode === 'multi' && results.filter(r => r.result_id).length > 1) {
    try {
      const selection = await resultSelection.selectBestResult(executionGroupId);
      selected = {
        result_id: selection.selected_result_id,
        agent_id: selection.selected_agent_id,
        reason: selection.selection_reason,
      };
      comparison = selection.comparison;
    } catch (err) {
      // Selection may fail if not all results evaluated — that's OK
      selected = { error: err.message };
    }
  } else if (results.length === 1 && results[0].result_id) {
    selected = {
      result_id: results[0].result_id,
      agent_id: results[0].agent_id,
      reason: 'Single agent execution',
    };
  }

  return {
    execution_group_id: executionGroupId,
    mode,
    routing: {
      matched_rule: routing.rule ? routing.rule.rule_name : 'system default',
      primary_agent: routing.primary_agent.name,
      comparison_agents: routing.comparison_agents.map(a => a.name),
    },
    results: results.map(r => ({
      result_id: r.result_id || null,
      agent_id: r.agent_id,
      agent_name: r.agent_name,
      duration_ms: r.duration_ms,
      token_count_input: r.token_count_input,
      token_count_output: r.token_count_output,
      error: r.error || null,
    })),
    selected,
    comparison,
  };
}

/**
 * Get all results for an execution group.
 */
async function getExecutionGroup(groupId) {
  const pool = getAppPool();
  const [results] = await pool.query(
    `SELECT r.*, a.name as agent_name, a.provider as agent_provider
     FROM prompt_execution_results r
     JOIN agent_registry a ON a.id = r.agent_id
     WHERE r.execution_group_id = ?
     ORDER BY r.was_selected DESC, r.created_at ASC`,
    [groupId]
  );

  const comparison = await resultSelection.getComparison(groupId);

  return {
    execution_group_id: groupId,
    results: results.map(r => ({
      ...r,
      violations_found: _parseJSON(r.violations_found, []),
    })),
    comparison,
  };
}

// ─── Internal Execution ─────────────────────────────────────────────────────

/**
 * Execute a prompt with a specific agent and record the result.
 */
async function _executeWithAgent(agent, promptText, stepId, workItemId, executionGroupId, timeoutMs) {
  const pool = getAppPool();
  const resultId = uuidv4();
  const startedAt = new Date();

  let resultText = null;
  let error = null;
  let tokenInput = null;
  let tokenOutput = null;

  try {
    const response = await _callAgent(agent, promptText, timeoutMs);
    resultText = response.text;
    tokenInput = response.token_count_input || null;
    tokenOutput = response.token_count_output || null;
  } catch (err) {
    error = err.message;
  }

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();

  // Record result
  await pool.query(
    `INSERT INTO prompt_execution_results
     (id, prompt_plan_step_id, work_item_id, agent_id, execution_group_id,
      prompt_text, result_text, execution_started_at, execution_finished_at,
      execution_duration_ms, token_count_input, token_count_output,
      evaluator_status, completion_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      resultId, stepId, workItemId || null, agent.id, executionGroupId,
      promptText, resultText || null, startedAt, finishedAt,
      durationMs, tokenInput, tokenOutput,
      'pending',
      error ? 'failure' : null,
    ]
  );

  return {
    result_id: resultId,
    agent_id: agent.id,
    agent_name: agent.name,
    duration_ms: durationMs,
    token_count_input: tokenInput,
    token_count_output: tokenOutput,
    has_result: !!resultText,
    error,
  };
}

/**
 * Call an agent's API. This is the integration point where different providers
 * are invoked. Currently supports Anthropic via OMAI.
 *
 * Each provider integration follows the same contract:
 *   Input: { text: string }
 *   Output: { text: string, token_count_input?: number, token_count_output?: number }
 */
async function _callAgent(agent, promptText, timeoutMs) {
  const provider = agent.provider;

  if (provider === 'anthropic') {
    return _callAnthropic(agent, promptText, timeoutMs);
  } else if (provider === 'openai') {
    return _callOpenAI(agent, promptText, timeoutMs);
  } else {
    throw new Error(`Unsupported provider: ${provider}. Implement _call${provider} to add support.`);
  }
}

/**
 * Call Anthropic via existing OMAI integration.
 */
async function _callAnthropic(agent, promptText, timeoutMs) {
  try {
    const { askOMAIWithMetadata } = require('/var/www/orthodoxmetrics/prod/misc/omai/services/index.js');
    const response = await askOMAIWithMetadata(promptText, {});

    const text = typeof response.response === 'string'
      ? response.response
      : JSON.stringify(response.response);

    return {
      text,
      token_count_input: response.usage?.input_tokens || null,
      token_count_output: response.usage?.output_tokens || null,
    };
  } catch (err) {
    throw new Error(`Anthropic execution failed: ${err.message}`);
  }
}

/**
 * Call OpenAI API.
 * Placeholder — requires OPENAI_API_KEY in env and openai package.
 */
async function _callOpenAI(agent, promptText, timeoutMs) {
  // This is a structured placeholder. When OpenAI is enabled:
  // 1. Read API key from config or env
  // 2. Call chat completions endpoint with agent.model_id
  // 3. Return { text, token_count_input, token_count_output }
  throw new Error(
    'OpenAI provider not yet configured. Set OPENAI_API_KEY and install openai package to enable.'
  );
}

// ─── Auto-Evaluation ────────────────────────────────────────────────────────

/**
 * Basic auto-evaluation heuristic. Checks for obvious failures.
 * Real evaluation would integrate with the learning system.
 */
async function _autoEvaluate(resultId, resultData) {
  const pool = getAppPool();

  // Fetch the full result
  const [rows] = await pool.query(
    'SELECT * FROM prompt_execution_results WHERE id = ?',
    [resultId]
  );
  if (rows.length === 0) return;
  const result = rows[0];

  // If execution failed (either no output or pre-marked as failure), evaluate as failure
  if (!result.result_text || result.completion_status === 'failure') {
    await resultSelection.evaluateResult(resultId, {
      completion_status: 'failure',
      violations: [{ type: 'execution_error', description: result.result_text ? 'Execution error' : 'No output produced', severity: 'critical' }],
      confidence: 0,
      notes: `Auto-evaluated: ${result.result_text ? 'execution failed with error' : 'execution produced no output'}`,
    });
    return;
  }

  // Basic heuristic: check output length and obvious patterns
  const text = result.result_text;
  const violations = [];

  if (text.length < 50) {
    violations.push({ type: 'insufficient_output', description: 'Output too short (< 50 chars)', severity: 'high' });
  }

  if (/TODO|FIXME|placeholder/i.test(text)) {
    violations.push({ type: 'incomplete_output', description: 'Output contains TODO/FIXME/placeholder', severity: 'medium' });
  }

  if (/error|exception|failed/i.test(text) && text.length < 200) {
    violations.push({ type: 'error_output', description: 'Output appears to be an error message', severity: 'high' });
  }

  const confidence = violations.length === 0 ? 0.8 : Math.max(0.1, 0.8 - violations.length * 0.2);
  const completionStatus = violations.length === 0 ? 'success'
    : violations.some(v => v.severity === 'critical') ? 'failure'
    : 'partial';

  await resultSelection.evaluateResult(resultId, {
    completion_status: completionStatus,
    violations,
    confidence,
    notes: `Auto-evaluated: ${violations.length} violation(s) found`,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function _parseJSON(str, fallback) {
  try { return JSON.parse(str || 'null') || fallback; } catch { return fallback; }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  getConfig,
  setConfig,
  getAllConfig,
  executePrompt,
  getExecutionGroup,
};
