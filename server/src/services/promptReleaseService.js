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
 * Returns { eligible, can_auto_release, blocked, reasons, conditions }
 */
async function checkReleaseEligibility(promptId) {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [promptId]);
  if (rows.length === 0) throw new Error(`Prompt not found: ${promptId}`);

  const prompt = rows[0];
  const result = {
    prompt_id: promptId,
    title: prompt.title,
    status: prompt.status,
    queue_status: prompt.queue_status,
    release_mode: prompt.release_mode,
    priority: prompt.priority,
    eligible: false,
    can_auto_release: false,
    blocked: false,
    reasons: [],
    conditions: [],
  };

  // Must be approved to be released for execution
  if (prompt.status !== 'approved') {
    result.blocked = true;
    result.reasons.push(`Prompt status is "${prompt.status}", must be "approved"`);
    return result;
  }

  // Audit must pass
  if (prompt.audit_status !== 'pass') {
    result.blocked = true;
    result.reasons.push(`Audit status is "${prompt.audit_status}", must be "pass"`);
  } else {
    result.conditions.push('Audit passed');
  }

  // Release window check
  const now = Date.now();
  if (prompt.release_window_start) {
    const start = new Date(prompt.release_window_start).getTime();
    if (now < start) {
      result.blocked = true;
      result.reasons.push(`Before release window (starts ${prompt.release_window_start})`);
    } else {
      result.conditions.push('Within release window start');
    }
  }
  if (prompt.release_window_end) {
    const end = new Date(prompt.release_window_end).getTime();
    if (now > end) {
      result.reasons.push(`Past release window end (ended ${prompt.release_window_end})`);
      // Past window is a warning, not a hard block — admin may still release
    } else {
      result.conditions.push('Within release window end');
    }
  }

  // Dependency analysis
  const analysis = await queueService.analyzeBlocking(pool, prompt);
  if (analysis.blocked) {
    result.blocked = true;
    result.reasons.push(...analysis.reasons);
  }
  result.conditions.push(...analysis.satisfied);

  // If blocked, stop here
  if (result.blocked) {
    return result;
  }

  // Eligible for release
  result.eligible = true;

  // Determine if auto-release is allowed based on release_mode
  if (prompt.release_mode === 'auto_full') {
    result.can_auto_release = true;
    result.conditions.push('auto_full mode: dependencies met → auto-release allowed');
  } else if (prompt.release_mode === 'auto_safe') {
    // auto_safe requires prior step to be clean
    const priorClean = await isPriorStepClean(pool, prompt);
    if (priorClean.clean) {
      result.can_auto_release = true;
      result.conditions.push('auto_safe mode: prior step clean → auto-release allowed');
    } else {
      result.can_auto_release = false;
      result.conditions.push(`auto_safe mode: prior step not clean (${priorClean.reason}) → manual release required`);
    }
  } else {
    // manual mode
    result.can_auto_release = false;
    result.conditions.push('manual mode: explicit release action required');
  }

  // Record attempt time
  await pool.query(
    'UPDATE om_prompt_registry SET last_release_attempt_at = NOW() WHERE id = ?',
    [promptId]
  );

  return result;
}

/**
 * Check if the prior step in sequence had a clean execution.
 * "Clean" means: evaluator_status = pass, completion_status = complete, no violations.
 */
async function isPriorStepClean(pool, prompt) {
  const parentScope = prompt.parent_prompt_id || null;

  const [predecessors] = await pool.query(
    `SELECT id, title, evaluator_status, completion_status, violations_found
     FROM om_prompt_registry
     WHERE parent_prompt_id <=> ? AND sequence_order < ? AND id != ?
     ORDER BY sequence_order DESC LIMIT 1`,
    [parentScope, prompt.sequence_order, prompt.id]
  );

  if (predecessors.length === 0) {
    return { clean: true, reason: 'No predecessor' };
  }

  const pred = predecessors[0];

  if (pred.evaluator_status !== 'pass') {
    return { clean: false, reason: `Predecessor evaluator_status is "${pred.evaluator_status}"` };
  }
  if (pred.completion_status !== 'complete') {
    return { clean: false, reason: `Predecessor completion_status is "${pred.completion_status}"` };
  }

  // Check violations
  let violations = [];
  if (pred.violations_found) {
    try {
      violations = typeof pred.violations_found === 'string'
        ? JSON.parse(pred.violations_found)
        : pred.violations_found;
    } catch { /* ignore parse errors */ }
  }
  if (Array.isArray(violations) && violations.length > 0) {
    return { clean: false, reason: `Predecessor has ${violations.length} violation(s)` };
  }

  return { clean: true, reason: 'Predecessor clean' };
}

// ─── Release Execution ─────────────────────────────────────────────────────

/**
 * Release a prompt for execution. Transitions approved → executing.
 * Enforces all queue constraints before allowing release.
 */
async function releasePrompt(promptId, actor) {
  const pool = getAppPool();

  // Check eligibility first
  const eligibility = await checkReleaseEligibility(promptId);

  if (eligibility.blocked) {
    throw new Error(
      `Cannot release prompt: ${eligibility.reasons.join('; ')}`
    );
  }

  if (!eligibility.eligible) {
    throw new Error('Prompt is not eligible for release');
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
  isPriorStepClean,
};
