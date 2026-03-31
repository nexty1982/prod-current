/**
 * Prompt Release Service
 *
 * Manages release policy enforcement, auto-release eligibility checks,
 * and workplan generation for the Prompt Workflow System.
 *
 * Release Modes:
 *   manual     — requires explicit user action via POST /release
 *   auto_safe  — auto-release only if prior step had no violations, evaluator pass, complete
 *   auto_full  — auto-release when dependencies satisfied + audit passed + sequence valid
 *
 * Release Policy Decision Table:
 *   ┌──────────────┬─────────────┬──────────────┬──────────────────────────┐
 *   │ release_mode │ deps_met    │ prior_clean  │ result                   │
 *   ├──────────────┼─────────────┼──────────────┼──────────────────────────┤
 *   │ manual       │ any         │ any          │ eligible, requires user  │
 *   │ auto_safe    │ true        │ true         │ auto-release             │
 *   │ auto_safe    │ true        │ false        │ eligible, requires user  │
 *   │ auto_safe    │ false       │ any          │ blocked                  │
 *   │ auto_full    │ true        │ any          │ auto-release             │
 *   │ auto_full    │ false       │ any          │ blocked                  │
 *   │ any          │ any         │ any+window   │ blocked if outside window│
 *   └──────────────┴─────────────┴──────────────┴──────────────────────────┘
 */

const { getAppPool } = require('../config/db');
const queueService = require('./promptQueueService');

// ─── Release Eligibility Check ─────────────────────────────────────────────

/**
 * Check whether a prompt is eligible for release. Read-only — does NOT release.
 * Delegates entirely to queueService.isEligibleForRelease (single source of truth).
 */
async function checkReleaseEligibility(promptId) {
  return queueService.isEligibleForRelease(promptId);
}

// ─── Release Execution ─────────────────────────────────────────────────────

/**
 * Release a prompt for execution. Transitions approved → executing.
 * Enforces all queue constraints before allowing release.
 */
async function releasePrompt(promptId, actor) {
  const pool = getAppPool();

  // Single source of truth — delegate to queue service
  const eligibility = await queueService.isEligibleForRelease(promptId);

  if (!eligibility.eligible) {
    const reasons = eligibility.blocked_reasons.map(r => r.detail || r.code);
    throw new Error(
      `Cannot release prompt: ${reasons.length > 0 ? reasons.join('; ') : eligibility.explanation}`
    );
  }

  // Atomic transition: approved → executing with queue_status = released
  const [result] = await pool.query(
    `UPDATE om_prompt_registry
     SET status = 'executing', queue_status = 'released'
     WHERE id = ? AND status = 'approved'`,
    [promptId]
  );

  if (result.affectedRows === 0) {
    const [current] = await pool.query('SELECT status FROM om_prompt_registry WHERE id = ?', [promptId]);
    throw new Error(
      `Release failed: prompt is "${current[0]?.status || 'unknown'}", expected "approved" (concurrent modification?)`
    );
  }

  // Log
  await pool.query(
    `INSERT INTO system_logs
       (timestamp, level, source, message, meta, user_email, service, source_component)
     VALUES (NOW(), 'INFO', 'prompt_release', ?, ?, ?, 'omai', 'prompt_registry')`,
    [
      `Prompt released for execution: ${eligibility.title}`,
      JSON.stringify({
        prompt_id: promptId,
        release_mode: eligibility.release_mode,
        conditions: eligibility.conditions,
      }),
      actor,
    ]
  );

  // Cascade: refresh queue statuses for other prompts that might be affected
  await queueService.refreshAllQueueStatuses();

  const [updated] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [promptId]);
  return updated[0];
}

// ─── Workplan Generation ───────────────────────────────────────────────────

/**
 * Generate today's workplan: prompts ready for execution, ordered by priority.
 * Groups by component for readability.
 */
async function generateWorkplan() {
  const pool = getAppPool();

  // Refresh all queue statuses first
  await queueService.refreshAllQueueStatuses();

  // Get all ready_for_release prompts, plus due scheduled ones
  const [ready] = await pool.query(
    `SELECT * FROM om_prompt_registry
     WHERE (queue_status = 'ready_for_release')
        OR (queue_status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW())
     ORDER BY FIELD(priority, 'critical','high','normal','low'), sequence_order ASC`
  );

  // Group by component
  const grouped = {};
  for (const prompt of ready) {
    const comp = prompt.component || 'uncategorized';
    if (!grouped[comp]) grouped[comp] = [];
    grouped[comp].push({
      id: prompt.id,
      title: prompt.title,
      sequence_order: prompt.sequence_order,
      priority: prompt.priority,
      status: prompt.status,
      queue_status: prompt.queue_status,
      release_mode: prompt.release_mode,
      scheduled_at: prompt.scheduled_at,
      release_window_end: prompt.release_window_end,
      overdue: prompt.release_window_end ? new Date(prompt.release_window_end) < new Date() : false,
    });
  }

  // Get overdue count
  const overdue = await queueService.getOverdue();

  // Get blocked count
  const [blockedCount] = await pool.query(
    `SELECT COUNT(*) as cnt FROM om_prompt_registry WHERE queue_status = 'blocked'`
  );

  return {
    generated_at: new Date().toISOString(),
    total_ready: ready.length,
    total_overdue: overdue.length,
    total_blocked: blockedCount[0].cnt,
    components: grouped,
    items: ready, // flat list for consumers that don't want grouping
  };
}

// ─── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  checkReleaseEligibility,
  releasePrompt,
  generateWorkplan,
};
