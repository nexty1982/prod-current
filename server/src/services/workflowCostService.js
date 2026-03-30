/**
 * Workflow Cost Service
 *
 * Provides cost and performance visibility for the Prompt Workflow System.
 * All cost estimates are derived from actual token counts recorded in
 * prompt_execution_results and agent cost rates from agent_registry.
 *
 * DESIGN:
 *   - No new tables — works from existing execution data
 *   - Deterministic — same data → same cost report
 *   - Read-only — no mutations, safe to call at any frequency
 *   - Granular — per-workflow, per-prompt, per-agent breakdown
 */

const { getAppPool } = require('../config/db');

// ─── Per-Workflow Cost ──────────────────────────────────────────────────────

/**
 * Calculate cost breakdown for a specific workflow.
 * Returns per-step and total cost estimates.
 */
async function getWorkflowCost(workflowId) {
  const pool = getAppPool();

  // Get workflow info
  const [wfRows] = await pool.query(
    'SELECT id, name, component, status, step_count FROM prompt_workflows WHERE id = ?',
    [workflowId]
  );
  if (wfRows.length === 0) throw new Error(`Workflow not found: ${workflowId}`);
  const workflow = wfRows[0];

  // Get all execution results for this workflow's steps
  const [results] = await pool.query(
    `SELECT r.prompt_plan_step_id, r.agent_id, r.execution_duration_ms,
            r.token_count_input, r.token_count_output, r.was_selected,
            r.completion_status, r.evaluator_status,
            a.name as agent_name, a.cost_per_1k_input, a.cost_per_1k_output
     FROM prompt_execution_results r
     JOIN agent_registry a ON a.id = r.agent_id
     WHERE r.work_item_id IN (
       SELECT prompt_id FROM prompt_workflow_steps WHERE workflow_id = ?
     )
     ORDER BY r.created_at ASC`,
    [workflowId]
  );

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;
  let totalDurationMs = 0;
  let executionCount = 0;
  let wastedExecutions = 0; // Results from comparison agents that were not selected

  for (const r of results) {
    const inputTokens = r.token_count_input || 0;
    const outputTokens = r.token_count_output || 0;
    const inputCost = (inputTokens / 1000) * parseFloat(r.cost_per_1k_input || 0);
    const outputCost = (outputTokens / 1000) * parseFloat(r.cost_per_1k_output || 0);
    const cost = inputCost + outputCost;

    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
    totalCostUsd += cost;
    totalDurationMs += r.execution_duration_ms || 0;
    executionCount++;

    if (!r.was_selected && executionCount > 1) {
      wastedExecutions++;
    }
  }

  return {
    workflow_id: workflowId,
    workflow_name: workflow.name,
    status: workflow.status,
    step_count: workflow.step_count,
    cost: {
      total_usd: Math.round(totalCostUsd * 10000) / 10000,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      total_duration_ms: totalDurationMs,
      execution_count: executionCount,
      wasted_executions: wastedExecutions,
      wasted_pct: executionCount > 0
        ? Math.round((wastedExecutions / executionCount) * 100)
        : 0,
    },
  };
}

// ─── System-Wide Cost Report ────────────────────────────────────────────────

/**
 * Generate a comprehensive cost report across all workflows and agents.
 * Designed for the dashboard command center.
 */
async function getCostReport() {
  const pool = getAppPool();

  // Agent usage distribution
  const [agentUsage] = await pool.query(
    `SELECT a.id as agent_id, a.name as agent_name, a.provider,
            a.cost_per_1k_input, a.cost_per_1k_output,
            COUNT(r.id) as execution_count,
            SUM(r.token_count_input) as total_input_tokens,
            SUM(r.token_count_output) as total_output_tokens,
            AVG(r.execution_duration_ms) as avg_duration_ms,
            SUM(r.was_selected) as selected_count,
            SUM(CASE WHEN r.completion_status = 'success' THEN 1 ELSE 0 END) as success_count,
            SUM(CASE WHEN r.completion_status = 'failure' THEN 1 ELSE 0 END) as failure_count
     FROM agent_registry a
     LEFT JOIN prompt_execution_results r ON r.agent_id = a.id
     WHERE a.status = 'active'
     GROUP BY a.id
     ORDER BY execution_count DESC`
  );

  // Compute cost per agent
  const agentCosts = agentUsage.map(a => {
    const inputTokens = Number(a.total_input_tokens) || 0;
    const outputTokens = Number(a.total_output_tokens) || 0;
    const inputCost = (inputTokens / 1000) * parseFloat(a.cost_per_1k_input || 0);
    const outputCost = (outputTokens / 1000) * parseFloat(a.cost_per_1k_output || 0);
    return {
      agent_id: a.agent_id,
      agent_name: a.agent_name,
      provider: a.provider,
      execution_count: a.execution_count || 0,
      total_input_tokens: inputTokens,
      total_output_tokens: outputTokens,
      total_cost_usd: Math.round((inputCost + outputCost) * 10000) / 10000,
      avg_duration_ms: Math.round(a.avg_duration_ms || 0),
      selected_count: Number(a.selected_count) || 0,
      success_rate: a.execution_count > 0
        ? Math.round((Number(a.success_count) / a.execution_count) * 100)
        : 0,
      win_rate: a.execution_count > 0
        ? Math.round((Number(a.selected_count) / a.execution_count) * 100)
        : 0,
    };
  });

  // Multi-agent comparison stats
  const [compStats] = await pool.query(
    `SELECT COUNT(*) as total_comparisons,
            SUM(tie_breaker_used) as tie_breaker_count,
            COUNT(DISTINCT execution_group_id) as unique_groups
     FROM prompt_agent_comparisons`
  );

  // Workflow cost ranking
  const [wfCosts] = await pool.query(
    `SELECT w.id, w.name, w.component, w.status, w.step_count,
            COUNT(r.id) as execution_count,
            SUM(r.token_count_input) as total_input_tokens,
            SUM(r.token_count_output) as total_output_tokens
     FROM prompt_workflows w
     LEFT JOIN prompt_workflow_steps s ON s.workflow_id = w.id
     LEFT JOIN prompt_execution_results r ON r.prompt_plan_step_id = s.prompt_id
     GROUP BY w.id
     ORDER BY total_input_tokens DESC
     LIMIT 10`
  );

  // Compute total system cost
  const totalCost = agentCosts.reduce((sum, a) => sum + a.total_cost_usd, 0);
  const totalExecutions = agentCosts.reduce((sum, a) => sum + a.execution_count, 0);
  const totalTokens = agentCosts.reduce((sum, a) => sum + a.total_input_tokens + a.total_output_tokens, 0);

  // Prompt type cost distribution
  const [promptTypeCosts] = await pool.query(
    `SELECT s.prompt_type,
            COUNT(r.id) as execution_count,
            SUM(r.token_count_input) as input_tokens,
            SUM(r.token_count_output) as output_tokens
     FROM prompt_execution_results r
     JOIN prompt_workflow_steps s ON s.prompt_id = r.prompt_plan_step_id
     GROUP BY s.prompt_type
     ORDER BY input_tokens DESC`
  );

  return {
    generated_at: new Date().toISOString(),
    summary: {
      total_cost_usd: Math.round(totalCost * 10000) / 10000,
      total_executions: totalExecutions,
      total_tokens: totalTokens,
      avg_cost_per_execution: totalExecutions > 0
        ? Math.round((totalCost / totalExecutions) * 10000) / 10000
        : 0,
    },
    agent_distribution: agentCosts,
    multi_agent: {
      total_comparisons: Number(compStats[0]?.total_comparisons) || 0,
      tie_breaker_count: Number(compStats[0]?.tie_breaker_count) || 0,
    },
    most_expensive_workflows: wfCosts.map(w => ({
      workflow_id: w.id,
      name: w.name,
      component: w.component,
      status: w.status,
      step_count: w.step_count,
      execution_count: w.execution_count || 0,
      total_tokens: (Number(w.total_input_tokens) || 0) + (Number(w.total_output_tokens) || 0),
    })),
    cost_by_prompt_type: promptTypeCosts.map(p => ({
      prompt_type: p.prompt_type,
      execution_count: p.execution_count || 0,
      total_tokens: (Number(p.input_tokens) || 0) + (Number(p.output_tokens) || 0),
    })),
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  getWorkflowCost,
  getCostReport,
};
