/**
 * Result Selection Service
 *
 * Deterministic, rule-based selection of the best result when multiple agents
 * execute the same prompt. No subjective ranking — selection is always based
 * on measurable criteria applied in a fixed order.
 *
 * Selection algorithm (applied in order):
 *   1. completion_status ranking: success > partial > failure > blocked > timeout
 *   2. violation_count: fewer is better
 *   3. confidence: higher is better
 *   4. tie-breaker: agent default_priority (lower = preferred)
 *   5. final tie-breaker: execution_duration_ms (faster wins)
 *
 * Core flows:
 *   evaluateResult(resultId, evaluation)  — Score a single execution result
 *   selectBestResult(executionGroupId)    — Compare and select winner
 *   getComparison(executionGroupId)       — Retrieve comparison record
 *   getResultsForStep(stepId)             — All results for a prompt step
 */

const { v4: uuidv4 } = require('uuid');
const { getAppPool } = require('../config/db');

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Completion status ranking. Higher score = better outcome.
 * This ranking is deterministic and never changes.
 */
const COMPLETION_RANK = {
  success: 5,
  partial: 3,
  failure: 1,
  blocked: 0,
  timeout: 0,
};

const VALID_COMPLETION_STATUSES = Object.keys(COMPLETION_RANK);

// ─── Evaluation ─────────────────────────────────────────────────────────────

/**
 * Record evaluation results for a single execution result.
 * Called after an agent produces output and it has been evaluated
 * (either automatically or by the learning system).
 *
 * @param {string} resultId - prompt_execution_results.id
 * @param {object} evaluation
 * @param {string} evaluation.completion_status - success|partial|failure|blocked|timeout
 * @param {Array} evaluation.violations - [{type, description, severity}]
 * @param {number} evaluation.confidence - 0.0 to 1.0
 * @param {string} [evaluation.notes]
 */
async function evaluateResult(resultId, evaluation) {
  const { completion_status, violations, confidence, notes } = evaluation;

  if (!VALID_COMPLETION_STATUSES.includes(completion_status)) {
    throw new Error(`Invalid completion_status: ${completion_status}. Valid: ${VALID_COMPLETION_STATUSES.join(', ')}`);
  }
  if (confidence !== undefined && (confidence < 0 || confidence > 1)) {
    throw new Error('confidence must be between 0 and 1');
  }

  const pool = getAppPool();
  const violationArray = violations || [];

  const [result] = await pool.query(
    `UPDATE prompt_execution_results
     SET evaluator_status = 'evaluated',
         completion_status = ?,
         violations_found = ?,
         violation_count = ?,
         confidence = ?,
         evaluation_notes = ?,
         evaluated_at = NOW()
     WHERE id = ?`,
    [
      completion_status,
      JSON.stringify(violationArray),
      violationArray.length,
      confidence || null,
      notes || null,
      resultId,
    ]
  );

  if (result.affectedRows === 0) throw new Error('Execution result not found');

  return {
    result_id: resultId,
    evaluator_status: 'evaluated',
    completion_status,
    violation_count: violationArray.length,
    confidence,
  };
}

// ─── Selection ──────────────────────────────────────────────────────────────

/**
 * Deterministically select the best result from a multi-agent execution group.
 *
 * All results in the group must be evaluated first.
 *
 * @param {string} executionGroupId
 * @returns {{ selected_result_id, selected_agent_id, comparison, selection_reason }}
 */
async function selectBestResult(executionGroupId) {
  const pool = getAppPool();

  // Load all results for this execution group
  const [results] = await pool.query(
    `SELECT r.*, a.name as agent_name, a.default_priority as agent_priority
     FROM prompt_execution_results r
     JOIN agent_registry a ON a.id = r.agent_id
     WHERE r.execution_group_id = ?
     ORDER BY a.default_priority ASC`,
    [executionGroupId]
  );

  if (results.length === 0) {
    throw new Error(`No results found for execution group: ${executionGroupId}`);
  }

  // Single result → auto-select
  if (results.length === 1) {
    const only = results[0];
    await _markSelected(pool, only.id, 'Single agent execution — auto-selected');
    return {
      selected_result_id: only.id,
      selected_agent_id: only.agent_id,
      comparison: null,
      selection_reason: 'Single agent execution — auto-selected',
    };
  }

  // Verify all results are evaluated
  const unevaluated = results.filter(r => r.evaluator_status !== 'evaluated');
  if (unevaluated.length > 0) {
    throw new Error(
      `Cannot select: ${unevaluated.length} result(s) not yet evaluated. ` +
      `IDs: ${unevaluated.map(r => r.id).join(', ')}`
    );
  }

  // Score each result with a single stable sort that applies all tie-breakers.
  // Order: total_score DESC → agent_priority ASC → execution_duration_ms ASC.
  // This handles 3+ agents correctly — every pair is compared the same way.
  const scored = results.map(r => _scoreResult(r));
  scored.sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    if (a.agent_priority !== b.agent_priority) return a.agent_priority - b.agent_priority;
    return (a.execution_duration_ms || Infinity) - (b.execution_duration_ms || Infinity);
  });

  let tieBreakerUsed = false;
  let tieBreakerMethod = null;

  // Detect which tie-breaker resolved the winner (for traceability)
  if (scored.length > 1 && scored[0].total_score === scored[1].total_score) {
    tieBreakerUsed = true;
    if (scored[0].agent_priority !== scored[1].agent_priority) {
      tieBreakerMethod = 'agent_priority';
    } else {
      tieBreakerMethod = 'execution_speed';
    }
  }

  const selected = scored[0];

  // Build comparison scores map
  const comparisonScores = {};
  for (const s of scored) {
    comparisonScores[s.agent_id] = {
      agent_name: s.agent_name,
      completion_rank: s.completion_rank,
      violation_rank: s.violation_rank,
      confidence_rank: s.confidence_rank,
      total_score: s.total_score,
    };
  }

  // Build selection reason
  const selectionReason = _buildSelectionReason(selected, scored, tieBreakerUsed, tieBreakerMethod);

  // Mark winner
  await _markSelected(pool, selected.result_id, selectionReason);

  // Mark losers
  for (const s of scored.slice(1)) {
    await pool.query(
      `UPDATE prompt_execution_results SET was_selected = 0, selection_reason = ? WHERE id = ?`,
      [`Not selected: outscored by ${selected.agent_name} (${selected.total_score} vs ${s.total_score})`, s.result_id]
    );
  }

  // Record comparison
  const comparisonId = uuidv4();
  await pool.query(
    `INSERT INTO prompt_agent_comparisons
     (id, execution_group_id, prompt_plan_step_id, agents_compared,
      selected_agent_id, selected_result_id, comparison_method,
      comparison_scores, selection_reason, tie_breaker_used, tie_breaker_method)
     VALUES (?, ?, ?, ?, ?, ?, 'rule_based', ?, ?, ?, ?)`,
    [
      comparisonId,
      executionGroupId,
      selected.prompt_plan_step_id,
      JSON.stringify(scored.map(s => s.agent_id)),
      selected.agent_id,
      selected.result_id,
      JSON.stringify(comparisonScores),
      selectionReason,
      tieBreakerUsed ? 1 : 0,
      tieBreakerMethod,
    ]
  );

  return {
    selected_result_id: selected.result_id,
    selected_agent_id: selected.agent_id,
    comparison: {
      id: comparisonId,
      scores: comparisonScores,
      tie_breaker_used: tieBreakerUsed,
      tie_breaker_method: tieBreakerMethod,
    },
    selection_reason: selectionReason,
  };
}

// ─── Read Operations ────────────────────────────────────────────────────────

/**
 * Get comparison record for an execution group.
 */
async function getComparison(executionGroupId) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT c.*, a.name as selected_agent_name
     FROM prompt_agent_comparisons c
     JOIN agent_registry a ON a.id = c.selected_agent_id
     WHERE c.execution_group_id = ?`,
    [executionGroupId]
  );
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    ...row,
    agents_compared: _parseJSON(row.agents_compared, []),
    comparison_scores: _parseJSON(row.comparison_scores, {}),
  };
}

/**
 * Get all execution results for a prompt plan step.
 */
async function getResultsForStep(stepId) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT r.*, a.name as agent_name, a.provider as agent_provider
     FROM prompt_execution_results r
     JOIN agent_registry a ON a.id = r.agent_id
     WHERE r.prompt_plan_step_id = ?
     ORDER BY r.created_at DESC`,
    [stepId]
  );

  return rows.map(r => ({
    ...r,
    violations_found: _parseJSON(r.violations_found, []),
  }));
}

/**
 * Get all execution results for a specific agent.
 */
async function getAgentResults(agentId, limit = 20) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT r.*, a.name as agent_name
     FROM prompt_execution_results r
     JOIN agent_registry a ON a.id = r.agent_id
     WHERE r.agent_id = ?
     ORDER BY r.created_at DESC
     LIMIT ?`,
    [agentId, limit]
  );

  return rows.map(r => ({
    ...r,
    violations_found: _parseJSON(r.violations_found, []),
  }));
}

// ─── Scoring ────────────────────────────────────────────────────────────────

/**
 * Score a single result. This is the core deterministic scoring function.
 *
 * Scoring breakdown:
 *   - completion_rank: 0-5 based on COMPLETION_RANK mapping
 *   - violation_rank: 10 - violation_count (clamped to 0 minimum)
 *   - confidence_rank: confidence * 10 (0-10 scale)
 *   - total_score = completion_rank * 100 + violation_rank * 10 + confidence_rank
 *
 * This weighting ensures:
 *   - completion_status is the primary differentiator
 *   - violation_count breaks ties within same completion
 *   - confidence breaks ties within same violations
 */
function _scoreResult(result) {
  const completionRank = COMPLETION_RANK[result.completion_status] || 0;
  const violationRank = Math.max(0, 10 - (result.violation_count || 0));
  const confidenceRank = Math.round((result.confidence || 0) * 10);

  return {
    result_id: result.id,
    agent_id: result.agent_id,
    agent_name: result.agent_name,
    agent_priority: result.agent_priority || 50,
    prompt_plan_step_id: result.prompt_plan_step_id,
    execution_duration_ms: result.execution_duration_ms,
    completion_status: result.completion_status,
    violation_count: result.violation_count || 0,
    confidence: result.confidence || 0,
    completion_rank: completionRank,
    violation_rank: violationRank,
    confidence_rank: confidenceRank,
    total_score: completionRank * 100 + violationRank * 10 + confidenceRank,
  };
}

/**
 * Build a human-readable selection reason.
 */
function _buildSelectionReason(winner, allScored, tieBreakerUsed, tieBreakerMethod) {
  const parts = [`${winner.agent_name} selected`];

  if (allScored.length === 1) {
    return 'Single agent execution — auto-selected';
  }

  const others = allScored.filter(s => s.result_id !== winner.result_id);
  const otherNames = others.map(s => s.agent_name).join(', ');

  parts.push(`over ${otherNames}`);

  // Explain why
  const reasons = [];
  for (const other of others) {
    const diffs = [];
    if (winner.completion_rank !== other.completion_rank) {
      diffs.push(`completion: ${winner.completion_status} vs ${other.completion_status}`);
    }
    if (winner.violation_count !== other.violation_count) {
      diffs.push(`violations: ${winner.violation_count} vs ${other.violation_count}`);
    }
    if (winner.confidence !== other.confidence) {
      diffs.push(`confidence: ${winner.confidence.toFixed(2)} vs ${other.confidence.toFixed(2)}`);
    }
    if (diffs.length > 0) {
      reasons.push(`vs ${other.agent_name}: ${diffs.join(', ')}`);
    }
  }

  if (tieBreakerUsed) {
    reasons.push(`tie-breaker: ${tieBreakerMethod}`);
  }

  if (reasons.length > 0) {
    parts.push(`— ${reasons.join('; ')}`);
  }

  return parts.join(' ');
}

async function _markSelected(pool, resultId, reason) {
  await pool.query(
    `UPDATE prompt_execution_results SET was_selected = 1, selection_reason = ? WHERE id = ?`,
    [reason, resultId]
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function _parseJSON(str, fallback) {
  try { return JSON.parse(str || 'null') || fallback; } catch { return fallback; }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  COMPLETION_RANK,
  VALID_COMPLETION_STATUSES,
  evaluateResult,
  selectBestResult,
  getComparison,
  getResultsForStep,
  getAgentResults,
  // Exported for testing
  _scoreResult,
};
