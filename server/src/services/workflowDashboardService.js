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

    result.push({
      id: wf.id,
      name: wf.name,
      component: wf.component,
      status: wf.status,
      step_count: total,
      verified,
      executing,
      blocked,
      progress_pct: total > 0 ? Math.round((verified / total) * 100) : 0,
      has_exceptions: hasExceptions,
      activated_at: wf.activated_at,
      current_step: steps.find(s =>
        s.prompt_status && !['verified', 'rejected'].includes(s.prompt_status) && s.prompt_status !== 'not_generated'
      ) || null,
      steps,
    });
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

// ─── Full Dashboard Payload ───────────────────────────────────────────────

/**
 * Single endpoint aggregation: returns everything the command center needs.
 */
async function getDashboard(filters = {}) {
  const [summary, activeWorkflows, exceptions, readyToRelease, activity] = await Promise.all([
    getExecutiveSummary(),
    getActiveWorkflows(),
    getExceptionFeed(filters),
    getReadyToRelease(),
    getRecentActivity(filters.activity_limit || 30),
  ]);

  return {
    generated_at: new Date().toISOString(),
    summary,
    active_workflows: activeWorkflows,
    exceptions,
    ready_to_release: readyToRelease,
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
  getDashboard,
};
