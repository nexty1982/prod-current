/**
 * Prompt Progression Service
 *
 * Deterministic, automatic state progression for prompts in the pipeline.
 * Each transition has explicit eligibility rules — no ambiguity.
 *
 * Progression chain (for auto-generated workflow prompts):
 *   draft → audited → ready → approved → ready_for_release
 *
 * Each transition fires only when ALL eligibility conditions are met.
 * Every transition is logged to system_logs for full traceability.
 *
 * SAFETY:
 *   - Only auto-generated prompts are eligible for auto-progression
 *   - Manual prompts (release_mode='manual') stop at 'ready' — require human approval
 *   - Each prompt advances at most one step per cycle (no multi-hop)
 *   - All transitions are idempotent and safe to re-run
 */

const { getAppPool } = require('../config/db');

// ─── Transition Rules ──────────────────────────────────────────────────────

/**
 * Eligibility rules for each state transition.
 * Each rule returns { eligible: boolean, reason: string }.
 */
const TRANSITION_RULES = {
  // draft → audited: auto-generated prompts with guardrails are pre-audited
  draft_to_audited: (prompt) => {
    if (!prompt.auto_generated) {
      return { eligible: false, reason: 'Not auto-generated — requires manual audit' };
    }
    if (!prompt.guardrails_applied) {
      return { eligible: false, reason: 'Guardrails not applied' };
    }
    return { eligible: true, reason: 'Auto-generated with guardrails applied' };
  },

  // audited → ready: audit must have passed
  audited_to_ready: (prompt) => {
    if (prompt.audit_status !== 'pass') {
      return { eligible: false, reason: `Audit status is "${prompt.audit_status}", must be "pass"` };
    }
    return { eligible: true, reason: 'Audit passed' };
  },

  // ready → approved: release_mode must allow auto-approval
  ready_to_approved: (prompt) => {
    if (prompt.release_mode === 'manual') {
      return { eligible: false, reason: 'release_mode is manual — requires human approval' };
    }
    if (!['auto_safe', 'auto_full'].includes(prompt.release_mode)) {
      return { eligible: false, reason: `Unknown release_mode "${prompt.release_mode}"` };
    }
    return { eligible: true, reason: `release_mode=${prompt.release_mode} allows auto-approval` };
  },

  // approved → released: set released_for_execution flag
  approved_to_released: (prompt) => {
    if (prompt.released_for_execution) {
      return { eligible: false, reason: 'Already released for execution' };
    }
    if (prompt.release_mode === 'manual') {
      return { eligible: false, reason: 'release_mode is manual — requires human release' };
    }
    return { eligible: true, reason: `Auto-releasing (release_mode=${prompt.release_mode})` };
  },
};

// ─── Core Progression ──────────────────────────────────────────────────────

/**
 * Advance a single prompt through its next eligible transition.
 * Returns { advanced: boolean, from: string, to: string, reason: string }
 * or { advanced: false, reason: string }.
 *
 * Each call advances AT MOST one step. Call repeatedly to chain.
 */
async function advancePrompt(promptId, pool = null) {
  pool = pool || getAppPool();

  const [rows] = await pool.query(
    `SELECT id, status, auto_generated, guardrails_applied, audit_status,
            release_mode, released_for_execution, workflow_id, workflow_step_number, title
     FROM om_prompt_registry WHERE id = ?`,
    [promptId]
  );

  if (rows.length === 0) {
    return { advanced: false, reason: 'Prompt not found' };
  }

  const prompt = rows[0];
  return _tryAdvance(prompt, pool);
}

/**
 * Advance ALL eligible prompts in the pipeline.
 * Processes each prompt through at most one transition per call.
 * Returns summary of all transitions made.
 */
async function advanceAll() {
  const pool = getAppPool();

  // Find all prompts that could potentially advance
  // (draft, audited, ready, or approved that aren't released yet)
  const [candidates] = await pool.query(
    `SELECT id, status, auto_generated, guardrails_applied, audit_status,
            release_mode, released_for_execution, workflow_id, workflow_step_number, title
     FROM om_prompt_registry
     WHERE status IN ('draft', 'audited', 'ready', 'approved')
       AND auto_generated = 1
     ORDER BY workflow_id, workflow_step_number`
  );

  const results = {
    candidates: candidates.length,
    advanced: 0,
    skipped: 0,
    transitions: [],
    errors: [],
  };

  for (const prompt of candidates) {
    try {
      const result = await _tryAdvance(prompt, pool);
      if (result.advanced) {
        results.advanced++;
        results.transitions.push({
          prompt_id: prompt.id,
          title: prompt.title,
          from: result.from,
          to: result.to,
          reason: result.reason,
        });
      } else {
        results.skipped++;
      }
    } catch (err) {
      results.errors.push({
        prompt_id: prompt.id,
        title: prompt.title,
        error: err.message,
      });
    }
  }

  // 2. Downstream queue advancement — check for verified prompts with pending successors
  try {
    const [verifiedPrompts] = await pool.query(
      `SELECT p.id FROM om_prompt_registry p
       WHERE p.status = 'verified'
         AND p.workflow_id IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM om_prompt_registry succ
           WHERE succ.depends_on_prompt_id = p.id
             AND succ.queue_status = 'pending'
         )`
    );

    for (const vp of verifiedPrompts) {
      const dsResult = await advanceDownstream(vp.id);
      if (dsResult.advanced > 0) {
        results.downstream = results.downstream || [];
        results.downstream.push(...dsResult.transitions);
      }
    }
  } catch (dsErr) {
    results.downstream_error = dsErr.message;
  }

  // Log summary if anything happened
  if (results.advanced > 0 || results.errors.length > 0 || (results.downstream && results.downstream.length > 0)) {
    await logProgression(pool, 'PROGRESSION_CYCLE', {
      candidates: results.candidates,
      advanced: results.advanced,
      skipped: results.skipped,
      errors: results.errors.length,
      downstream: results.downstream?.length || 0,
      transitions: results.transitions.map(t => `${t.title}: ${t.from}→${t.to}`),
    });
  }

  return results;
}

/**
 * Internal: try to advance a single prompt through its next transition.
 */
async function _tryAdvance(prompt, pool) {
  const { id, status } = prompt;

  // Determine which transition to attempt based on current status
  let ruleName, targetStatus, extraUpdates;

  switch (status) {
    case 'draft':
      ruleName = 'draft_to_audited';
      targetStatus = 'audited';
      extraUpdates = "audit_status = 'pass'"; // Auto-generated + guardrails = auto-pass audit
      break;

    case 'audited':
      ruleName = 'audited_to_ready';
      targetStatus = 'ready';
      break;

    case 'ready':
      ruleName = 'ready_to_approved';
      targetStatus = 'approved';
      break;

    case 'approved':
      ruleName = 'approved_to_released';
      targetStatus = null; // Status stays 'approved', just sets released_for_execution
      extraUpdates = 'released_for_execution = 1';
      break;

    default:
      return { advanced: false, reason: `Status "${status}" has no auto-progression` };
  }

  // Check eligibility
  const rule = TRANSITION_RULES[ruleName];
  const eligibility = rule(prompt);

  if (!eligibility.eligible) {
    return { advanced: false, reason: eligibility.reason };
  }

  // Execute transition
  const fromStatus = status;
  const toStatus = targetStatus || status;

  let sql;
  if (targetStatus && extraUpdates) {
    sql = `UPDATE om_prompt_registry SET status = ?, ${extraUpdates} WHERE id = ? AND status = ?`;
  } else if (targetStatus) {
    sql = `UPDATE om_prompt_registry SET status = ? WHERE id = ? AND status = ?`;
  } else if (extraUpdates) {
    sql = `UPDATE om_prompt_registry SET ${extraUpdates} WHERE id = ? AND status = ?`;
  }

  let result;
  if (targetStatus) {
    result = await pool.query(sql, [targetStatus, id, fromStatus]);
  } else {
    result = await pool.query(sql, [id, fromStatus]);
  }

  const affectedRows = result[0]?.affectedRows ?? 0;

  if (affectedRows === 0) {
    return { advanced: false, reason: 'Concurrent modification — prompt status changed' };
  }

  // Log the transition
  await logProgression(pool, 'PROMPT_ADVANCED', {
    prompt_id: id,
    title: prompt.title,
    from: fromStatus,
    to: targetStatus ? toStatus : `${fromStatus}+released`,
    reason: eligibility.reason,
    workflow_id: prompt.workflow_id,
    step_number: prompt.workflow_step_number,
  });

  return {
    advanced: true,
    from: fromStatus,
    to: targetStatus ? toStatus : `${fromStatus}+released`,
    reason: eligibility.reason,
  };
}

// ─── Downstream Queue Advancement ─────────────────────────────────────────

/**
 * When a prompt is verified (predecessor complete), check if successor
 * prompts in the same workflow can advance from 'pending' queue_status.
 *
 * Called after a prompt reaches 'verified' status.
 */
async function advanceDownstream(verifiedPromptId) {
  const pool = getAppPool();

  // Get the verified prompt
  const [verified] = await pool.query(
    `SELECT id, workflow_id, workflow_step_number, title
     FROM om_prompt_registry WHERE id = ? AND status = 'verified'`,
    [verifiedPromptId]
  );

  if (verified.length === 0) return { advanced: 0 };

  const { workflow_id, workflow_step_number } = verified[0];
  if (!workflow_id) return { advanced: 0 };

  // Find successor prompts that depend on this one
  const [successors] = await pool.query(
    `SELECT p.id, p.title, p.status, p.queue_status, p.depends_on_prompt_id
     FROM om_prompt_registry p
     WHERE p.depends_on_prompt_id = ?
       AND p.queue_status = 'pending'`,
    [verifiedPromptId]
  );

  let advanced = 0;
  const transitions = [];

  for (const succ of successors) {
    // Move from pending to ready in the queue
    const [result] = await pool.query(
      `UPDATE om_prompt_registry SET queue_status = 'ready'
       WHERE id = ? AND queue_status = 'pending'`,
      [succ.id]
    );

    if (result.affectedRows > 0) {
      advanced++;
      transitions.push({
        prompt_id: succ.id,
        title: succ.title,
        queue_from: 'pending',
        queue_to: 'ready',
      });
    }
  }

  if (advanced > 0) {
    await logProgression(pool, 'DOWNSTREAM_ADVANCED', {
      trigger_prompt_id: verifiedPromptId,
      trigger_title: verified[0].title,
      workflow_id,
      step_number: workflow_step_number,
      successors_advanced: advanced,
      transitions,
    });
  }

  return { advanced, transitions };
}

// ─── Status Summary ────────────────────────────────────────────────────────

/**
 * Get a summary of the progression pipeline state.
 */
async function getPipelineSummary() {
  const pool = getAppPool();

  const [statusCounts] = await pool.query(
    `SELECT status, release_mode, COUNT(*) as count
     FROM om_prompt_registry
     WHERE auto_generated = 1
     GROUP BY status, release_mode
     ORDER BY FIELD(status, 'draft', 'audited', 'ready', 'approved', 'executing', 'complete', 'verified', 'rejected'), release_mode`
  );

  const [blockedByAudit] = await pool.query(
    `SELECT COUNT(*) as count FROM om_prompt_registry
     WHERE status = 'audited' AND audit_status != 'pass' AND auto_generated = 1`
  );

  const [blockedByManual] = await pool.query(
    `SELECT COUNT(*) as count FROM om_prompt_registry
     WHERE status = 'ready' AND release_mode = 'manual' AND auto_generated = 1`
  );

  const [pendingRelease] = await pool.query(
    `SELECT COUNT(*) as count FROM om_prompt_registry
     WHERE status = 'approved' AND released_for_execution = 0 AND auto_generated = 1`
  );

  return {
    pipeline: statusCounts,
    blocked: {
      by_audit: blockedByAudit[0].count,
      by_manual_approval: blockedByManual[0].count,
      pending_release: pendingRelease[0].count,
    },
  };
}

// ─── Logging ──────────────────────────────────────────────────────────────

async function logProgression(pool, action, details) {
  try {
    await pool.query(
      `INSERT INTO system_logs
         (timestamp, level, source, message, meta, service, source_component)
       VALUES (NOW(), 'INFO', 'prompt_progression', ?, ?, 'omai', 'prompt_pipeline')`,
      [
        `[${action}] ${details.prompt_id ? `prompt=${details.prompt_id}` : `cycle`}`,
        JSON.stringify(details),
      ]
    );
  } catch (err) {
    console.error(`[progression] Failed to log ${action}:`, err.message);
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────

module.exports = {
  advancePrompt,
  advanceAll,
  advanceDownstream,
  getPipelineSummary,
  // Exposed for testing
  TRANSITION_RULES,
};
