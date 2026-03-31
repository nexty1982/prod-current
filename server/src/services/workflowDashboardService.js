/**
 * Workflow Dashboard Service
 *
 * Aggregation queries for the Workflow Execution Dashboard / Command Center.
 * Provides a single-screen view of all prompt pipeline operations:
 *   - Executive summary (counts, health indicators)
 *   - Active workflows with step-level progress
 *   - Exception feed (blocked, overdue, degraded, escalated)
 *   - Ready-to-release panel
 *   - Recent activity stream from system_logs
 */

const { getAppPool } = require('../config/db');
const autonomyPolicy = require('./autonomyPolicyService');

// ─── Classification Logic ────────────────────────────────────────────────
//
// Deterministic classification for every workflow/prompt item:
//   ACTION_REQUIRED — operator must act now
//   MONITOR         — progressing, watch for issues
//   SAFE_TO_IGNORE  — autonomy is handling it or already complete
//
// Rules are evaluated in priority order; first match wins.

/**
 * Classify a workflow item based on its current state.
 * @param {object} wf - Workflow object from getActiveWorkflows()
 * @returns {string} 'action_required' | 'monitor' | 'safe_to_ignore'
 */
function classifyWorkflow(wf) {
  // ACTION_REQUIRED: has blocked steps, escalations, or is paused needing attention
  if (wf.blocked > 0) return 'action_required';
  if (wf.has_exceptions) return 'action_required';
  if (wf.autonomy_paused) return 'action_required';
  if (wf.manual_only) return 'action_required';

  // MONITOR: actively executing, has steps in progress
  if (wf.executing > 0) return 'monitor';
  if (wf.progress_pct > 0 && wf.progress_pct < 100) return 'monitor';

  // SAFE_TO_IGNORE: fully verified or not yet started with autonomy active
  if (wf.progress_pct === 100) return 'safe_to_ignore';
  if (wf.status === 'approved' && !wf.manual_only) return 'safe_to_ignore';

  return 'monitor';
}

/**
 * Classify an exception/prompt item.
 * @param {object} item - Exception item from getExceptionFeed()
 * @returns {string} 'action_required' | 'monitor' | 'safe_to_ignore'
 */
function classifyException(item) {
  if (item.escalation_required) return 'action_required';
  if (item.queue_status === 'blocked') return 'action_required';
  if (item.overdue) return 'action_required';
  if (item.degradation_flag) return 'monitor';
  if (item.confidence_level === 'low') return 'monitor';
  return 'monitor';
}

/**
 * Classify a ready-to-release item.
 * @param {object} item - Ready item from getReadyToRelease()
 * @returns {string} 'action_required' | 'monitor' | 'safe_to_ignore'
 */
function classifyReadyItem(item) {
  // Needs manual release
  if (item.needs_review) return 'action_required';
  if (item.release_mode === 'manual') return 'action_required';
  if (item.is_overdue) return 'action_required';
  // Auto-release will handle it
  if (item.can_auto_release) return 'safe_to_ignore';
  return 'monitor';
}

// ─── Executive Summary ────────────────────────────────────────────────────

/**
 * Returns high-level counts and health indicators for the command center.
 */
async function getExecutiveSummary() {
  const pool = getAppPool();

  // Workflow counts by status
  const [wfCounts] = await pool.query(
    `SELECT status, COUNT(*) as cnt FROM prompt_workflows GROUP BY status`
  );
  const workflows = { total: 0, draft: 0, approved: 0, active: 0, completed: 0, cancelled: 0 };
  for (const r of wfCounts) {
    workflows[r.status] = r.cnt;
    workflows.total += r.cnt;
  }

  // Prompt counts by status
  const [promptCounts] = await pool.query(
    `SELECT status, COUNT(*) as cnt FROM om_prompt_registry GROUP BY status`
  );
  const prompts = { total: 0 };
  for (const r of promptCounts) {
    prompts[r.status] = r.cnt;
    prompts.total += r.cnt;
  }

  // Queue state counts
  const [queueCounts] = await pool.query(
    `SELECT queue_status, COUNT(*) as cnt FROM om_prompt_registry
     WHERE queue_status IS NOT NULL AND queue_status != 'pending'
     GROUP BY queue_status`
  );
  const queue = {};
  for (const r of queueCounts) queue[r.queue_status] = r.cnt;

  // Exception counts
  const [exceptions] = await pool.query(
    `SELECT
       SUM(CASE WHEN queue_status = 'blocked' THEN 1 ELSE 0 END) as blocked,
       SUM(CASE WHEN overdue = 1 THEN 1 ELSE 0 END) as overdue,
       SUM(CASE WHEN degradation_flag = 1 THEN 1 ELSE 0 END) as degraded,
       SUM(CASE WHEN escalation_required = 1 THEN 1 ELSE 0 END) as escalated,
       SUM(CASE WHEN confidence_level = 'low' THEN 1 ELSE 0 END) as low_confidence
     FROM om_prompt_registry`
  );
  const exc = exceptions[0] || {};
  const n = (v) => Number(v) || 0;

  return {
    workflows,
    prompts,
    queue,
    exceptions: {
      blocked: n(exc.blocked),
      overdue: n(exc.overdue),
      degraded: n(exc.degraded),
      escalated: n(exc.escalated),
      low_confidence: n(exc.low_confidence),
      total: n(exc.blocked) + n(exc.overdue) + n(exc.escalated),
    },
  };
}

// ─── Active Workflows with Progress ───────────────────────────────────────

/**
 * Returns active workflows with per-step prompt status for progress tracking.
 *
 * OPTIMIZATION: Uses a single batch query for all workflow steps instead of
 * N+1 per-workflow queries. With 6 active workflows × 4 steps each, this
 * reduces 7 queries to 2.
 */
async function getActiveWorkflows() {
  const pool = getAppPool();

  const [workflows] = await pool.query(
    `SELECT * FROM prompt_workflows WHERE status IN ('active', 'approved') ORDER BY activated_at DESC, approved_at DESC`
  );

  if (workflows.length === 0) return [];

  // Batch: load all steps for all active workflows in one query
  const wfIds = workflows.map(w => w.id);
  const placeholders = wfIds.map(() => '?').join(',');
  const [allSteps] = await pool.query(
    `SELECT s.workflow_id, s.step_number, s.title, s.prompt_id,
            p.status as prompt_status, p.quality_score, p.confidence_level,
            p.escalation_required, p.degradation_flag, p.queue_status
     FROM prompt_workflow_steps s
     LEFT JOIN om_prompt_registry p ON s.prompt_id = p.id
     WHERE s.workflow_id IN (${placeholders})
     ORDER BY s.workflow_id, s.step_number`,
    wfIds
  );

  // Group steps by workflow_id
  const stepsByWorkflow = new Map();
  for (const step of allSteps) {
    if (!stepsByWorkflow.has(step.workflow_id)) {
      stepsByWorkflow.set(step.workflow_id, []);
    }
    stepsByWorkflow.get(step.workflow_id).push(step);
  }

  const result = [];
  for (const wf of workflows) {
    const steps = stepsByWorkflow.get(wf.id) || [];
    const total = steps.length;
    const verified = steps.filter(s => s.prompt_status === 'verified').length;
    const executing = steps.filter(s => s.prompt_status === 'executing').length;
    const blocked = steps.filter(s => s.queue_status === 'blocked').length;
    const hasExceptions = steps.some(s => s.escalation_required || s.degradation_flag);

    const progressPct = total > 0 ? Math.round((verified / total) * 100) : 0;

    const wfItem = {
      id: wf.id,
      name: wf.name,
      component: wf.component,
      status: wf.status,
      step_count: total,
      verified,
      executing,
      blocked,
      progress_pct: progressPct,
      has_exceptions: hasExceptions,
      activated_at: wf.activated_at,
      autonomy_paused: !!wf.autonomy_paused,
      autonomy_pause_reason: wf.autonomy_pause_reason || null,
      manual_only: !!wf.manual_only,
      current_step: steps.find(s =>
        s.prompt_status && !['verified', 'rejected'].includes(s.prompt_status) && s.prompt_status !== 'not_generated'
      ) || null,
      steps,
    };

    wfItem.classification = classifyWorkflow(wfItem);
    result.push(wfItem);
  }

  return result;
}

// ─── Exception Feed ───────────────────────────────────────────────────────

/**
 * Returns all prompts that need attention: blocked, overdue, degraded, escalated.
 * Sorted by severity (escalated first, then blocked, then overdue, then degraded).
 */
async function getExceptionFeed(filters = {}) {
  const pool = getAppPool();

  let where = `(queue_status = 'blocked' OR overdue = 1 OR degradation_flag = 1 OR escalation_required = 1 OR confidence_level = 'low')`;
  const params = [];

  if (filters.type === 'blocked') where = `queue_status = 'blocked'`;
  else if (filters.type === 'overdue') where = `overdue = 1`;
  else if (filters.type === 'degraded') where = `degradation_flag = 1`;
  else if (filters.type === 'escalated') where = `escalation_required = 1`;
  else if (filters.type === 'low_confidence') where = `confidence_level = 'low'`;

  if (filters.component) {
    where += ' AND component = ?';
    params.push(filters.component);
  }

  if (filters.workflow_id) {
    where += ' AND workflow_id = ?';
    params.push(filters.workflow_id);
  }

  const [rows] = await pool.query(
    `SELECT id, title, component, status, queue_status, priority,
            quality_score, confidence_level, degradation_flag, escalation_required,
            escalation_reason, overdue, overdue_since, blocked_reasons,
            workflow_id, workflow_step_number, release_mode,
            scheduled_at, release_window_start, release_window_end
     FROM om_prompt_registry
     WHERE ${where}
     ORDER BY escalation_required DESC,
              CASE queue_status WHEN 'blocked' THEN 0 ELSE 1 END,
              overdue DESC,
              degradation_flag DESC,
              FIELD(priority, 'critical','high','normal','low'),
              sequence_order ASC
     LIMIT 50`,
    params
  );

  return rows.map(r => ({
    ...r,
    blocked_reasons: r.blocked_reasons ? (typeof r.blocked_reasons === 'string' ? JSON.parse(r.blocked_reasons) : r.blocked_reasons) : [],
    exception_types: [
      ...(r.escalation_required ? ['escalated'] : []),
      ...(r.queue_status === 'blocked' ? ['blocked'] : []),
      ...(r.overdue ? ['overdue'] : []),
      ...(r.degradation_flag ? ['degraded'] : []),
      ...(r.confidence_level === 'low' ? ['low_confidence'] : []),
    ],
  }));
}

// ─── Ready-to-Release Panel ───────────────────────────────────────────────

/**
 * Returns prompts that are ready for release, ordered by priority.
 * Includes release mode and auto-release eligibility hints.
 */
async function getReadyToRelease() {
  const pool = getAppPool();

  const [rows] = await pool.query(
    `SELECT id, title, component, status, queue_status, priority,
            quality_score, confidence_level, release_mode,
            escalation_required, degradation_flag,
            workflow_id, workflow_step_number,
            scheduled_at, release_window_end
     FROM om_prompt_registry
     WHERE queue_status IN ('ready_for_release', 'overdue')
     ORDER BY escalation_required DESC,
              overdue DESC,
              FIELD(priority, 'critical','high','normal','low'),
              sequence_order ASC
     LIMIT 25`
  );

  return rows.map(r => ({
    ...r,
    can_auto_release: r.release_mode === 'auto_full' && !r.escalation_required,
    needs_review: r.escalation_required || r.degradation_flag || r.confidence_level === 'low',
    is_overdue: r.queue_status === 'overdue',
  }));
}

// ─── Recent Activity Stream ───────────────────────────────────────────────

/**
 * Returns recent prompt/workflow activity from system_logs.
 */
async function getRecentActivity(limit = 30) {
  const pool = getAppPool();

  const [rows] = await pool.query(
    `SELECT timestamp, level, source, message, meta, user_email
     FROM system_logs
     WHERE source IN ('prompt_workflow_plan', 'prompt_release', 'prompt_queue', 'prompt_scoring', 'prompt_audit', 'prompt_evaluation')
     ORDER BY timestamp DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map(r => ({
    timestamp: r.timestamp,
    level: r.level,
    source: r.source,
    message: r.message,
    actor: r.user_email,
    meta: r.meta ? (typeof r.meta === 'string' ? (() => { try { return JSON.parse(r.meta); } catch { return null; } })() : r.meta) : null,
  }));
}

// ─── Blocked Frontiers ───────────────────────────────────────────────────

/**
 * Returns blocked workflow frontiers — steps that cannot advance and why.
 * Each entry includes the gate ID, human explanation, severity, and
 * recommended action. This is the key "what needs attention" panel.
 */
async function getBlockedFrontiers() {
  const pool = getAppPool();

  // Get all active workflows with their frontier steps (first non-verified step)
  const [rows] = await pool.query(
    `SELECT w.id as workflow_id, w.name as workflow_name, w.component,
            w.autonomy_paused, w.autonomy_pause_reason, w.manual_only,
            s.step_number, s.title as step_title, s.prompt_id,
            p.status as prompt_status, p.queue_status, p.confidence_level,
            p.evaluator_status, p.completion_status, p.degradation_flag,
            p.escalation_required, p.escalation_reason, p.manual_only as prompt_manual_only,
            p.release_mode, p.blocked_reasons, p.quality_score
     FROM prompt_workflows w
     JOIN prompt_workflow_steps s ON s.workflow_id = w.id
     LEFT JOIN om_prompt_registry p ON s.prompt_id = p.id
     WHERE w.status = 'active'
       AND (
         p.queue_status = 'blocked'
         OR p.escalation_required = 1
         OR p.degradation_flag = 1
         OR w.autonomy_paused = 1
         OR w.manual_only = 1
         OR s.manual_only = 1
         OR p.manual_only = 1
         OR p.confidence_level = 'low'
       )
     ORDER BY
       p.escalation_required DESC,
       CASE p.queue_status WHEN 'blocked' THEN 0 ELSE 1 END,
       w.autonomy_paused DESC,
       w.id, s.step_number`
  );

  return rows.map(r => {
    const blockedReasons = r.blocked_reasons
      ? (typeof r.blocked_reasons === 'string' ? (() => { try { return JSON.parse(r.blocked_reasons); } catch { return []; } })() : r.blocked_reasons)
      : [];

    // Determine the primary block reason with gate ID and explanation
    let gate_id = null;
    let explanation = '';
    let severity = 'info';
    let recommended_action = null;

    if (r.escalation_required) {
      gate_id = 'G5';
      explanation = r.escalation_reason || 'Escalation required — must be resolved manually';
      severity = 'critical';
      recommended_action = 'Review escalation reason and resolve manually';
    } else if (r.queue_status === 'blocked') {
      gate_id = 'G6';
      explanation = blockedReasons.length > 0
        ? `Dependencies not satisfied: ${blockedReasons.join(', ')}`
        : 'Queue status blocked — dependencies not satisfied';
      severity = 'critical';
      recommended_action = 'Unblock dependencies or override queue status';
    } else if (r.degradation_flag) {
      gate_id = 'G4';
      explanation = 'Degradation flag set — chain quality declining';
      severity = 'warning';
      recommended_action = 'Investigate quality decline and consider regenerating';
    } else if (r.confidence_level === 'low') {
      gate_id = 'G1';
      explanation = 'Confidence is low — must be high for autonomous advance';
      severity = 'warning';
      recommended_action = 'Review prompt quality or trigger re-evaluation';
    } else if (r.autonomy_paused) {
      gate_id = 'G10';
      explanation = r.autonomy_pause_reason || 'Workflow autonomy paused by operator';
      severity = 'info';
      recommended_action = 'Resume workflow autonomy when ready';
    } else if (r.manual_only) {
      gate_id = 'G9';
      explanation = 'Workflow is marked manual_only by operator';
      severity = 'info';
      recommended_action = 'Clear manual_only flag to allow autonomy';
    } else if (r.prompt_manual_only) {
      gate_id = 'G7';
      explanation = 'Prompt is marked manual_only by operator';
      severity = 'info';
      recommended_action = 'Release manually or clear manual_only flag';
    }

    return {
      workflow_id: r.workflow_id,
      workflow_name: r.workflow_name,
      component: r.component,
      step_number: r.step_number,
      step_title: r.step_title,
      prompt_id: r.prompt_id,
      prompt_status: r.prompt_status,
      queue_status: r.queue_status,
      gate_id,
      explanation,
      severity,
      recommended_action,
      blocked_reasons: blockedReasons,
      quality_score: r.quality_score,
    };
  });
}

// ─── Activity Stream Enhancement ────────────────────────────────────────

/**
 * Classify activity events for the refined activity stream.
 * Returns events with importance ranking and grouping hints.
 */
function classifyActivity(events) {
  return events.map(e => {
    let importance = 'normal';
    const msg = (e.message || '').toLowerCase();

    if (msg.includes('paused') || msg.includes('pause')) importance = 'high';
    else if (msg.includes('error') || msg.includes('fail')) importance = 'high';
    else if (msg.includes('release')) importance = 'high';
    else if (msg.includes('blocked')) importance = 'high';
    else if (msg.includes('complete') || msg.includes('success')) importance = 'medium';

    return { ...e, importance };
  });
}

// ─── Autonomy Explanation Fields ─────────────────────────────────────────

/**
 * Get explanation data for the autonomy status panel.
 * @returns {object} Autonomy status with per-workflow explanations
 */
async function getAutonomyExplanations() {
  const pool = getAppPool();
  const status = await autonomyPolicy.getStatus();
  const paused = await autonomyPolicy.getPausedWorkflows();

  // Get recent autonomous actions with explanations
  const [recentActions] = await pool.query(
    `SELECT timestamp, level, message, meta
     FROM system_logs
     WHERE source = 'autonomous_advance'
       AND level IN ('INFO', 'WARN')
     ORDER BY timestamp DESC
     LIMIT 20`
  );

  const advanceExplanations = [];
  const pauseExplanations = [];

  for (const row of recentActions) {
    const meta = row.meta ? (() => { try { return JSON.parse(row.meta); } catch { return null; } })() : null;

    if (row.level === 'INFO' && meta) {
      advanceExplanations.push({
        timestamp: row.timestamp,
        why_advanced: row.message,
        action: meta.action,
        target: meta.target_title || meta.target_id,
        workflow: meta.workflow_name,
        gates_passed: meta.gates_passed || `${meta.passed_count || 'all'}/${meta.total_gates || 13}`,
        mode: meta.mode,
      });
    } else if (row.level === 'WARN' && meta) {
      pauseExplanations.push({
        timestamp: row.timestamp,
        why_paused: row.message,
        workflow: meta.workflow_name || meta.target_title,
        failed_gate: meta.gate_id || (meta.failed_gates ? meta.failed_gates[0]?.id : null),
        failed_reason: meta.reason || meta.block_reason || (meta.reasons ? meta.reasons[0]?.reason : null),
        what_must_change: meta.recommended_action || _inferResumeAction(meta),
      });
    }
  }

  // Count workflows by autonomy state
  const [wfCounts] = await pool.query(
    `SELECT
       COUNT(*) as total_active,
       SUM(CASE WHEN autonomy_paused = 0 AND manual_only = 0 THEN 1 ELSE 0 END) as advancing,
       SUM(CASE WHEN autonomy_paused = 1 THEN 1 ELSE 0 END) as paused,
       SUM(CASE WHEN manual_only = 1 THEN 1 ELSE 0 END) as manual_only
     FROM prompt_workflows
     WHERE status = 'active'`
  );
  const counts = wfCounts[0] || {};

  return {
    current_mode: status.mode,
    enabled: status.enabled,
    allowed_actions: status.allowed_actions,
    workflow_counts: {
      total_active: Number(counts.total_active) || 0,
      advancing_autonomously: Number(counts.advancing) || 0,
      paused: Number(counts.paused) || 0,
      manual_only: Number(counts.manual_only) || 0,
    },
    paused_workflows: paused.map(p => ({
      ...p,
      why_paused: p.autonomy_pause_reason || 'Paused by operator',
      what_must_change: 'Resume workflow autonomy via dashboard action',
    })),
    recent_advances: advanceExplanations.slice(0, 10),
    recent_pauses: pauseExplanations.slice(0, 10),
  };
}

/**
 * Infer what must change for autonomy to resume, based on block metadata.
 */
function _inferResumeAction(meta) {
  if (!meta) return 'Resolve the blocking condition';
  const gateId = meta.gate_id || (meta.failed_gates ? meta.failed_gates[0]?.id : null);
  const actions = {
    G1: 'Prompt confidence must reach "high" — review quality or re-evaluate',
    G2: 'Evaluator must pass — run evaluation or fix issues',
    G3: 'Completion status must be "complete" — wait for execution to finish',
    G4: 'Fix degradation — regenerate prompt or adjust chain',
    G5: 'Resolve escalation manually',
    G6: 'Unblock dependencies or override queue status',
    G7: 'Clear manual_only flag on prompt',
    G8: 'Clear manual_only flag on workflow step',
    G9: 'Clear manual_only flag on workflow',
    G10: 'Resume workflow autonomy via dashboard',
    G11: 'Resolve critical learning violation for this component',
    G12: 'Complete multi-agent selection',
    G13: 'Change release_mode from "manual" to auto',
  };
  return actions[gateId] || 'Resolve the blocking condition';
}

// ─── Full Dashboard Payload ───────────────────────────────────────────────

/**
 * Single endpoint aggregation: returns everything the command center needs.
 * Enhanced with blocked frontiers, classifications, explanations, and
 * priority sorting for the Prompt 026 UX improvements.
 */
async function getDashboard(filters = {}) {
  const [summary, activeWorkflows, exceptions, readyToRelease, rawActivity, blockedFrontiers, autonomyExplanations] = await Promise.all([
    getExecutiveSummary(),
    getActiveWorkflows(),
    getExceptionFeed(filters),
    getReadyToRelease(),
    getRecentActivity(filters.activity_limit || 30),
    getBlockedFrontiers(),
    getAutonomyExplanations(),
  ]);

  // Add classifications to exceptions and ready items
  const classifiedExceptions = exceptions.map(e => ({
    ...e,
    classification: classifyException(e),
  }));

  const classifiedReady = readyToRelease.map(r => ({
    ...r,
    classification: classifyReadyItem(r),
  }));

  // Enhance activity stream
  const activity = classifyActivity(rawActivity);

  // Sort active workflows by classification priority
  const classOrder = { action_required: 0, monitor: 1, safe_to_ignore: 2 };
  const sortedWorkflows = [...activeWorkflows].sort((a, b) =>
    (classOrder[a.classification] ?? 1) - (classOrder[b.classification] ?? 1)
  );

  return {
    generated_at: new Date().toISOString(),
    summary,
    active_workflows: sortedWorkflows,
    exceptions: classifiedExceptions,
    ready_to_release: classifiedReady,
    blocked_frontiers: blockedFrontiers,
    autonomy: autonomyExplanations,
    activity,
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────

module.exports = {
  getExecutiveSummary,
  getActiveWorkflows,
  getExceptionFeed,
  getReadyToRelease,
  getRecentActivity,
  getBlockedFrontiers,
  getAutonomyExplanations,
  getDashboard,
  // Classification helpers (exported for testing)
  classifyWorkflow,
  classifyException,
  classifyReadyItem,
  classifyActivity,
  _inferResumeAction,
};
