/**
 * Prompt Queue Service
 *
 * Manages queue status calculation, dependency resolution, and scheduling
 * for the Prompt Workflow System.
 *
 * Queue statuses:
 *   none             — prompt not in queue (draft, audited, rejected)
 *   queued           — prompt is approved and waiting
 *   scheduled        — prompt has a future scheduled_at
 *   ready_for_release — all constraints met, can be released
 *   blocked          — unmet dependencies or constraints
 *   released         — prompt has been released for execution
 *
 * Dependencies:
 *   sequence  — based on sequence_order (default, existing behavior)
 *   explicit  — depends_on_prompt_id must be verified
 *   none      — no dependency checking
 */

const { getAppPool } = require('../config/db');

// ─── Priority Order (for sorting) ──────────────────────────────────────────

const PRIORITY_WEIGHT = { critical: 0, high: 1, normal: 2, low: 3 };

// ─── Queue-Eligible Statuses ───────────────────────────────────────────────
// Only prompts in these statuses can have meaningful queue_status
const QUEUEABLE_STATUSES = ['approved', 'executing', 'complete', 'verified'];

// ─── Block Reason Builders ─────────────────────────────────────────────────

/**
 * Calculate the full blocking analysis for a single prompt.
 * Returns { blocked: bool, reasons: string[], satisfied: string[] }
 */
async function analyzeBlocking(pool, prompt) {
  const reasons = [];
  const satisfied = [];

  // 1. Audit gate
  if (prompt.audit_status !== 'pass') {
    reasons.push(`Audit not passed (current: ${prompt.audit_status || 'pending'})`);
  } else {
    satisfied.push('Audit passed');
  }

  // 2. Sequence dependency
  if (prompt.dependency_type === 'sequence' || prompt.dependency_type === 'explicit') {
    const parentScope = prompt.parent_prompt_id || null;
    const [predecessors] = await pool.query(
      `SELECT id, sequence_order, status, title
       FROM om_prompt_registry
       WHERE parent_prompt_id <=> ? AND sequence_order < ? AND id != ?
       ORDER BY sequence_order DESC LIMIT 1`,
      [parentScope, prompt.sequence_order, prompt.id]
    );

    if (predecessors.length > 0) {
      const pred = predecessors[0];
      if (pred.status !== 'verified') {
        reasons.push(
          `Predecessor seq ${pred.sequence_order} ("${pred.title}") is "${pred.status}", must be "verified"`
        );
      } else {
        satisfied.push(`Predecessor seq ${pred.sequence_order} verified`);
      }
    } else {
      satisfied.push('No sequence predecessors');
    }
  }

  // 3. Explicit dependency
  if (prompt.dependency_type === 'explicit' && prompt.depends_on_prompt_id) {
    const [deps] = await pool.query(
      'SELECT id, status, title FROM om_prompt_registry WHERE id = ?',
      [prompt.depends_on_prompt_id]
    );

    if (deps.length === 0) {
      reasons.push(`Explicit dependency ${prompt.depends_on_prompt_id} not found`);
    } else if (deps[0].status !== 'verified') {
      reasons.push(
        `Explicit dependency "${deps[0].title}" is "${deps[0].status}", must be "verified"`
      );
    } else {
      satisfied.push(`Explicit dependency "${deps[0].title}" verified`);
    }
  } else if (prompt.dependency_type !== 'explicit') {
    satisfied.push('No explicit dependency required');
  }

  // 4. Evaluation gate (only if prompt has been through execution)
  if (['complete', 'verified'].includes(prompt.status)) {
    // Evaluation is informational post-completion, not a blocker for queue
    satisfied.push('Post-execution (evaluation optional for queue)');
  }

  return {
    blocked: reasons.length > 0,
    reasons,
    satisfied,
  };
}

// ─── Queue Status Calculation ──────────────────────────────────────────────

/**
 * Calculate what the queue_status SHOULD be for a prompt.
 * Pure calculation — does not write to DB.
 */
async function calculateQueueStatus(pool, prompt) {
  // Already executing or beyond — mark as released
  if (['executing', 'complete', 'verified'].includes(prompt.status)) {
    return 'released';
  }

  // Not yet approved — not in queue
  if (!QUEUEABLE_STATUSES.includes(prompt.status)) {
    return 'none';
  }

  // At this point, status must be 'approved'

  // Check if scheduled in the future
  if (prompt.scheduled_at) {
    const scheduledTime = new Date(prompt.scheduled_at).getTime();
    const now = Date.now();
    if (scheduledTime > now) {
      return 'scheduled';
    }
  }

  // Check release window
  if (prompt.release_window_start) {
    const windowStart = new Date(prompt.release_window_start).getTime();
    const now = Date.now();
    if (windowStart > now) {
      return 'scheduled'; // Not yet in release window
    }
  }

  if (prompt.release_window_end) {
    const windowEnd = new Date(prompt.release_window_end).getTime();
    const now = Date.now();
    if (windowEnd < now) {
      // Past end of window — still check if blocked or ready
      // (overdue detection is separate)
    }
  }

  // Check blocking conditions
  const analysis = await analyzeBlocking(pool, prompt);

  if (analysis.blocked) {
    return 'blocked';
  }

  return 'ready_for_release';
}

// ─── Refresh Queue Status ──────────────────────────────────────────────────

/**
 * Recalculate and persist queue_status for a single prompt.
 */
async function refreshQueueStatus(promptId) {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [promptId]);
  if (rows.length === 0) throw new Error(`Prompt not found: ${promptId}`);

  const prompt = rows[0];
  const newStatus = await calculateQueueStatus(pool, prompt);

  if (newStatus !== prompt.queue_status) {
    await pool.query(
      'UPDATE om_prompt_registry SET queue_status = ? WHERE id = ?',
      [newStatus, promptId]
    );
  }

  return newStatus;
}

/**
 * Recalculate queue_status for ALL prompts that could be affected.
 * Called after state transitions to cascade queue updates.
 */
async function refreshAllQueueStatuses() {
  const pool = getAppPool();
  const [prompts] = await pool.query(
    'SELECT * FROM om_prompt_registry WHERE status IN (?, ?, ?, ?) ORDER BY sequence_order ASC',
    ['approved', 'executing', 'complete', 'verified']
  );

  let updated = 0;
  for (const prompt of prompts) {
    const newStatus = await calculateQueueStatus(pool, prompt);
    if (newStatus !== prompt.queue_status) {
      await pool.query(
        'UPDATE om_prompt_registry SET queue_status = ? WHERE id = ?',
        [newStatus, prompt.id]
      );
      updated++;
    }
  }

  return { total: prompts.length, updated };
}

// ─── Queue Queries ─────────────────────────────────────────────────────────

/**
 * Get all prompts in the queue (any queue_status except 'none').
 */
async function getQueue(filters = {}) {
  const pool = getAppPool();
  let sql = `SELECT * FROM om_prompt_registry WHERE queue_status != 'none'`;
  const params = [];

  if (filters.queue_status) {
    sql += ' AND queue_status = ?';
    params.push(filters.queue_status);
  }
  if (filters.component) {
    sql += ' AND component = ?';
    params.push(filters.component);
  }
  if (filters.priority) {
    sql += ' AND priority = ?';
    params.push(filters.priority);
  }

  sql += ' ORDER BY FIELD(priority, "critical","high","normal","low"), sequence_order ASC';

  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Get the next prompt(s) ready for release, ordered by priority then sequence.
 */
async function getNextReady(limit = 5) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT * FROM om_prompt_registry
     WHERE queue_status = 'ready_for_release'
     ORDER BY FIELD(priority, 'critical','high','normal','low'), sequence_order ASC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

/**
 * Get all blocked prompts with blocking analysis.
 */
async function getBlocked() {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT * FROM om_prompt_registry
     WHERE queue_status = 'blocked'
     ORDER BY FIELD(priority, 'critical','high','normal','low'), sequence_order ASC`
  );

  const results = [];
  for (const prompt of rows) {
    const analysis = await analyzeBlocking(pool, prompt);
    results.push({
      ...prompt,
      block_reasons: analysis.reasons,
      satisfied_conditions: analysis.satisfied,
    });
  }
  return results;
}

/**
 * Get prompts that are due (scheduled_at <= now, not yet released).
 */
async function getDue() {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT * FROM om_prompt_registry
     WHERE scheduled_at IS NOT NULL
       AND scheduled_at <= NOW()
       AND queue_status IN ('scheduled', 'ready_for_release', 'queued')
     ORDER BY scheduled_at ASC, FIELD(priority, 'critical','high','normal','low')`
  );
  return rows;
}

/**
 * Get prompts that are overdue (past release_window_end and not released).
 */
async function getOverdue() {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT * FROM om_prompt_registry
     WHERE release_window_end IS NOT NULL
       AND release_window_end < NOW()
       AND queue_status NOT IN ('none', 'released')
     ORDER BY release_window_end ASC, FIELD(priority, 'critical','high','normal','low')`
  );
  return rows;
}

// ─── Scheduling ────────────────────────────────────────────────────────────

/**
 * Schedule a prompt for future execution.
 * Cannot schedule verified/rejected/executing prompts.
 */
async function schedulePrompt(promptId, { scheduled_at, release_window_start, release_window_end, priority, release_mode, dependency_type, depends_on_prompt_id }, actor) {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [promptId]);
  if (rows.length === 0) throw new Error(`Prompt not found: ${promptId}`);

  const prompt = rows[0];

  // Cannot schedule prompts that are already executing or done
  if (['executing', 'complete', 'verified'].includes(prompt.status)) {
    throw new Error(`Cannot schedule: prompt is "${prompt.status}". Only draft/audited/ready/approved prompts can be scheduled.`);
  }
  if (prompt.status === 'rejected') {
    throw new Error('Cannot schedule rejected prompt. Reset to draft first.');
  }

  // Validate release window
  if (release_window_start && release_window_end) {
    if (new Date(release_window_start) >= new Date(release_window_end)) {
      throw new Error('release_window_start must be before release_window_end');
    }
  }

  // Validate explicit dependency exists
  if (depends_on_prompt_id) {
    const [deps] = await pool.query('SELECT id FROM om_prompt_registry WHERE id = ?', [depends_on_prompt_id]);
    if (deps.length === 0) {
      throw new Error(`Dependency prompt not found: ${depends_on_prompt_id}`);
    }
  }

  // Validate no circular dependency
  if (depends_on_prompt_id) {
    await validateNoCycle(pool, promptId, depends_on_prompt_id);
  }

  // Build update
  const sets = [];
  const params = [];

  if (scheduled_at !== undefined) {
    sets.push('scheduled_at = ?');
    params.push(scheduled_at || null);
  }
  if (release_window_start !== undefined) {
    sets.push('release_window_start = ?');
    params.push(release_window_start || null);
  }
  if (release_window_end !== undefined) {
    sets.push('release_window_end = ?');
    params.push(release_window_end || null);
  }
  if (priority !== undefined) {
    if (!['low', 'normal', 'high', 'critical'].includes(priority)) {
      throw new Error(`Invalid priority: ${priority}`);
    }
    sets.push('priority = ?');
    params.push(priority);
  }
  if (release_mode !== undefined) {
    if (!['manual', 'auto_safe', 'auto_full'].includes(release_mode)) {
      throw new Error(`Invalid release_mode: ${release_mode}`);
    }
    sets.push('release_mode = ?');
    params.push(release_mode);
  }
  if (dependency_type !== undefined) {
    if (!['sequence', 'explicit', 'none'].includes(dependency_type)) {
      throw new Error(`Invalid dependency_type: ${dependency_type}`);
    }
    sets.push('dependency_type = ?');
    params.push(dependency_type);
  }
  if (depends_on_prompt_id !== undefined) {
    sets.push('depends_on_prompt_id = ?');
    params.push(depends_on_prompt_id || null);
  }

  if (sets.length === 0) {
    throw new Error('No scheduling fields provided');
  }

  params.push(promptId);
  await pool.query(
    `UPDATE om_prompt_registry SET ${sets.join(', ')} WHERE id = ?`,
    params
  );

  // Log
  await pool.query(
    `INSERT INTO system_logs
       (timestamp, level, source, message, meta, user_email, service, source_component)
     VALUES (NOW(), 'INFO', 'prompt_queue', ?, ?, ?, 'omai', 'prompt_registry')`,
    [
      `Prompt scheduled: ${prompt.title}`,
      JSON.stringify({ prompt_id: promptId, scheduled_at, priority, release_mode, dependency_type }),
      actor,
    ]
  );

  // Recalculate queue status
  const newQueueStatus = await refreshQueueStatus(promptId);

  const [updated] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [promptId]);
  return updated[0];
}

/**
 * Validate no circular dependency chain.
 */
async function validateNoCycle(pool, promptId, dependsOnId) {
  const visited = new Set([promptId]);
  let currentId = dependsOnId;

  for (let depth = 0; depth < 20; depth++) {
    if (!currentId) return; // No cycle
    if (visited.has(currentId)) {
      throw new Error(`Circular dependency detected: ${promptId} → ... → ${currentId}`);
    }
    visited.add(currentId);

    const [rows] = await pool.query(
      'SELECT depends_on_prompt_id FROM om_prompt_registry WHERE id = ?',
      [currentId]
    );
    if (rows.length === 0) return;
    currentId = rows[0].depends_on_prompt_id;
  }

  throw new Error('Dependency chain too deep (max 20 levels)');
}

// ─── Dependency Chain ──────────────────────────────────────────────────────

/**
 * Get the full dependency chain for a prompt (both sequence and explicit).
 */
async function getDependencyChain(promptId) {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [promptId]);
  if (rows.length === 0) throw new Error(`Prompt not found: ${promptId}`);

  const prompt = rows[0];
  const chain = [];

  // Sequence dependencies (all predecessors in same scope)
  const parentScope = prompt.parent_prompt_id || null;
  const [seqDeps] = await pool.query(
    `SELECT id, title, sequence_order, status, queue_status
     FROM om_prompt_registry
     WHERE parent_prompt_id <=> ? AND sequence_order < ? AND id != ?
     ORDER BY sequence_order ASC`,
    [parentScope, prompt.sequence_order, prompt.id]
  );

  for (const dep of seqDeps) {
    chain.push({
      type: 'sequence',
      prompt_id: dep.id,
      title: dep.title,
      sequence_order: dep.sequence_order,
      status: dep.status,
      queue_status: dep.queue_status,
      satisfied: dep.status === 'verified',
    });
  }

  // Explicit dependency chain
  if (prompt.depends_on_prompt_id) {
    let currentId = prompt.depends_on_prompt_id;
    const visited = new Set([promptId]);

    for (let depth = 0; depth < 20 && currentId; depth++) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const [deps] = await pool.query(
        `SELECT id, title, sequence_order, status, queue_status, depends_on_prompt_id
         FROM om_prompt_registry WHERE id = ?`,
        [currentId]
      );

      if (deps.length === 0) break;
      const dep = deps[0];

      chain.push({
        type: 'explicit',
        prompt_id: dep.id,
        title: dep.title,
        sequence_order: dep.sequence_order,
        status: dep.status,
        queue_status: dep.queue_status,
        satisfied: dep.status === 'verified',
      });

      currentId = dep.depends_on_prompt_id;
    }
  }

  return {
    prompt_id: promptId,
    title: prompt.title,
    dependencies: chain,
    all_satisfied: chain.every(d => d.satisfied),
  };
}

// ─── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  analyzeBlocking,
  calculateQueueStatus,
  refreshQueueStatus,
  refreshAllQueueStatuses,
  getQueue,
  getNextReady,
  getBlocked,
  getDue,
  getOverdue,
  schedulePrompt,
  getDependencyChain,
  PRIORITY_WEIGHT,
};
