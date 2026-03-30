/**
 * Prompt Queue Service — Single Source of Truth
 *
 * All queue state is DERIVED, never stored as truth. The stored queue_status
 * is a cache that is recalculated on every read and every state transition.
 *
 * Queue statuses (deterministic, no ambiguity):
 *   pending            — prompt is not yet approved (draft/audited/ready/rejected)
 *   scheduled          — prompt is approved AND scheduled_at is strictly in the future
 *   blocked            — prompt is approved but constraints prevent release
 *   ready_for_release  — ALL constraints met, can be released now
 *   released           — prompt has entered execution (executing/complete/verified)
 *   overdue            — prompt was scheduled/windowed in the past and still not released
 *
 * CRITICAL INVARIANT: A prompt with scheduled_at in the past NEVER returns "scheduled".
 * It is either ready_for_release, blocked, or overdue.
 *
 * Block reasons are structured codes, not freetext:
 *   sequence_not_verified    — predecessor in sequence not yet verified
 *   explicit_dep_not_verified — explicit dependency prompt not yet verified
 *   audit_not_passed         — audit_status is not 'pass'
 *   outside_release_window   — current time is before release_window_start
 *   dependency_not_found     — referenced dependency prompt does not exist
 */

const { getAppPool } = require('../config/db');

// ─── Constants ─────────────────────────────────────────────────────────────

const PRIORITY_WEIGHT = { critical: 0, high: 1, normal: 2, low: 3 };

const BLOCK_REASONS = {
  SEQUENCE_NOT_VERIFIED: 'sequence_not_verified',
  EXPLICIT_DEP_NOT_VERIFIED: 'explicit_dep_not_verified',
  AUDIT_NOT_PASSED: 'audit_not_passed',
  OUTSIDE_RELEASE_WINDOW: 'outside_release_window',
  DEPENDENCY_NOT_FOUND: 'dependency_not_found',
};

// ─── Core: calculateQueueStatus ────────────────────────────────────────────
//
// THE single source of truth for queue state. Every other function calls this.
// Returns { queue_status, blocked_reasons, overdue, overdue_since, explanation }

async function calculateQueueStatus(pool, prompt) {
  const now = Date.now();
  const result = {
    queue_status: 'pending',
    blocked_reasons: [],
    overdue: false,
    overdue_since: null,
    explanation: '',
  };

  // ── Already in execution or beyond → released
  if (['executing', 'complete', 'verified'].includes(prompt.status)) {
    result.queue_status = 'released';
    result.explanation = `Status is "${prompt.status}" — already released for execution`;
    return result;
  }

  // ── Not yet approved → pending (not in queue)
  if (!['approved'].includes(prompt.status)) {
    result.queue_status = 'pending';
    result.explanation = `Status is "${prompt.status}" — not yet approved for queue`;
    return result;
  }

  // ── From here: prompt.status === 'approved'

  // Step 1: Check if scheduled strictly in the future
  const hasSchedule = !!prompt.scheduled_at;
  const scheduledTime = hasSchedule ? new Date(prompt.scheduled_at).getTime() : null;
  const isScheduledFuture = scheduledTime !== null && scheduledTime > now;

  // Step 2: Check release window
  const hasWindowStart = !!prompt.release_window_start;
  const hasWindowEnd = !!prompt.release_window_end;
  const windowStart = hasWindowStart ? new Date(prompt.release_window_start).getTime() : null;
  const windowEnd = hasWindowEnd ? new Date(prompt.release_window_end).getTime() : null;

  // If before release window → scheduled (not yet time)
  if (windowStart !== null && now < windowStart) {
    result.queue_status = 'scheduled';
    result.explanation = `Before release window (starts ${prompt.release_window_start})`;
    return result;
  }

  // If scheduled strictly in the future → scheduled
  if (isScheduledFuture) {
    result.queue_status = 'scheduled';
    result.explanation = `Scheduled for future execution at ${prompt.scheduled_at}`;
    return result;
  }

  // ── Past this point: schedule time has passed (or no schedule). Evaluate readiness.

  // Step 3: Collect blocking reasons
  const blockReasons = [];

  // 3a: Audit gate
  if (prompt.audit_status !== 'pass') {
    blockReasons.push({
      code: BLOCK_REASONS.AUDIT_NOT_PASSED,
      detail: `Audit status is "${prompt.audit_status || 'pending'}", must be "pass"`,
    });
  }

  // 3b: Release window — after end
  if (windowEnd !== null && now > windowEnd) {
    // Past window end — mark overdue but don't block (admin can still release)
    result.overdue = true;
    result.overdue_since = prompt.release_window_end;
  }

  // 3c: Sequence dependency
  if (prompt.dependency_type === 'sequence' || prompt.dependency_type === 'explicit') {
    const parentScope = prompt.parent_prompt_id || null;
    const [predecessors] = await pool.query(
      `SELECT id, sequence_order, status, title
       FROM om_prompt_registry
       WHERE parent_prompt_id <=> ? AND sequence_order < ? AND id != ?
       ORDER BY sequence_order DESC LIMIT 1`,
      [parentScope, prompt.sequence_order, prompt.id]
    );

    if (predecessors.length > 0 && predecessors[0].status !== 'verified') {
      blockReasons.push({
        code: BLOCK_REASONS.SEQUENCE_NOT_VERIFIED,
        detail: `Predecessor seq ${predecessors[0].sequence_order} ("${predecessors[0].title}") is "${predecessors[0].status}", must be "verified"`,
      });
    }
  }

  // 3d: Explicit dependency
  if (prompt.dependency_type === 'explicit' && prompt.depends_on_prompt_id) {
    const [deps] = await pool.query(
      'SELECT id, status, title FROM om_prompt_registry WHERE id = ?',
      [prompt.depends_on_prompt_id]
    );

    if (deps.length === 0) {
      blockReasons.push({
        code: BLOCK_REASONS.DEPENDENCY_NOT_FOUND,
        detail: `Explicit dependency ${prompt.depends_on_prompt_id} not found`,
      });
    } else if (deps[0].status !== 'verified') {
      blockReasons.push({
        code: BLOCK_REASONS.EXPLICIT_DEP_NOT_VERIFIED,
        detail: `Explicit dependency "${deps[0].title}" is "${deps[0].status}", must be "verified"`,
      });
    }
  }

  // Step 4: Determine final state
  result.blocked_reasons = blockReasons;

  if (blockReasons.length > 0) {
    result.queue_status = 'blocked';
    result.explanation = `Blocked: ${blockReasons.map(r => r.code).join(', ')}`;
  } else {
    result.queue_status = 'ready_for_release';
    result.explanation = 'All constraints satisfied — ready for release';
  }

  // Overdue from scheduled_at (separate from window — can be ready but overdue)
  if (hasSchedule && scheduledTime <= now && result.queue_status !== 'released') {
    result.overdue = true;
    if (!result.overdue_since) {
      result.overdue_since = prompt.scheduled_at;
    }
  }

  // If overdue AND blocked → stays blocked (overdue doesn't bypass deps)
  // If overdue AND ready → stays ready_for_release (overdue is a flag, not a state override)
  // Only use 'overdue' as queue_status when it's the ONLY notable condition
  // (i.e., ready but nobody picked it up)
  if (result.overdue && result.queue_status === 'ready_for_release') {
    result.queue_status = 'overdue';
    result.explanation = `Overdue since ${result.overdue_since} — ready but not yet released`;
  }

  return result;
}

// ─── Persist: write calculated state to DB ─────────────────────────────────

async function persistQueueState(pool, promptId, state) {
  await pool.query(
    `UPDATE om_prompt_registry
     SET queue_status = ?, blocked_reasons = ?, overdue = ?, overdue_since = ?
     WHERE id = ?`,
    [
      state.queue_status,
      state.blocked_reasons.length > 0 ? JSON.stringify(state.blocked_reasons) : null,
      state.overdue ? 1 : 0,
      state.overdue_since || null,
      promptId,
    ]
  );
}

// ─── Refresh: recalculate and persist for one prompt ───────────────────────

async function refreshQueueStatus(promptId) {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [promptId]);
  if (rows.length === 0) throw new Error(`Prompt not found: ${promptId}`);

  const state = await calculateQueueStatus(pool, rows[0]);
  await persistQueueState(pool, promptId, state);
  return state;
}

// ─── Refresh all queueable prompts ─────────────────────────────────────────

async function refreshAllQueueStatuses() {
  const pool = getAppPool();
  const [prompts] = await pool.query(
    'SELECT * FROM om_prompt_registry ORDER BY sequence_order ASC'
  );

  let updated = 0;
  for (const prompt of prompts) {
    const state = await calculateQueueStatus(pool, prompt);
    if (state.queue_status !== prompt.queue_status
      || state.overdue !== (!!prompt.overdue)
      || JSON.stringify(state.blocked_reasons) !== (prompt.blocked_reasons || '[]')) {
      await persistQueueState(pool, prompt.id, state);
      updated++;
    }
  }
  return { total: prompts.length, updated };
}

// ─── isEligibleForRelease: unified release gate ────────────────────────────
//
// Single function that determines release eligibility. No other code path
// may independently determine whether a prompt can be released.

async function isEligibleForRelease(promptId) {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [promptId]);
  if (rows.length === 0) throw new Error(`Prompt not found: ${promptId}`);

  const prompt = rows[0];
  const state = await calculateQueueStatus(pool, prompt);

  // Persist recalculated state
  await persistQueueState(pool, promptId, state);

  const eligible = state.queue_status === 'ready_for_release' || state.queue_status === 'overdue';

  // Determine auto-release capability
  let canAutoRelease = false;
  const conditions = [];

  if (!eligible) {
    conditions.push(`Not eligible: queue_status is "${state.queue_status}"`);
  } else {
    conditions.push(`Eligible: ${state.explanation}`);

    if (prompt.release_mode === 'auto_full') {
      canAutoRelease = true;
      conditions.push('auto_full mode → auto-release allowed');
    } else if (prompt.release_mode === 'auto_safe') {
      const priorClean = await isPriorStepClean(pool, prompt);
      if (priorClean.clean) {
        canAutoRelease = true;
        conditions.push('auto_safe mode: prior step clean → auto-release allowed');
      } else {
        conditions.push(`auto_safe mode: ${priorClean.reason} → manual release required`);
      }
    } else {
      conditions.push('manual mode → explicit release action required');
    }
  }

  // Record attempt
  await pool.query(
    'UPDATE om_prompt_registry SET last_release_attempt_at = NOW() WHERE id = ?',
    [promptId]
  );

  return {
    prompt_id: promptId,
    title: prompt.title,
    status: prompt.status,
    queue_status: state.queue_status,
    release_mode: prompt.release_mode,
    priority: prompt.priority,
    eligible,
    can_auto_release: canAutoRelease,
    blocked: state.blocked_reasons.length > 0,
    blocked_reasons: state.blocked_reasons,
    overdue: state.overdue,
    overdue_since: state.overdue_since,
    explanation: state.explanation,
    conditions,
  };
}

/**
 * Check if the prior step in sequence had a clean execution.
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

  if (predecessors.length === 0) return { clean: true, reason: 'No predecessor' };
  const pred = predecessors[0];

  if (pred.evaluator_status !== 'pass') {
    return { clean: false, reason: `Predecessor evaluator_status is "${pred.evaluator_status}"` };
  }
  if (pred.completion_status !== 'complete') {
    return { clean: false, reason: `Predecessor completion_status is "${pred.completion_status}"` };
  }

  let violations = [];
  if (pred.violations_found) {
    try { violations = typeof pred.violations_found === 'string' ? JSON.parse(pred.violations_found) : pred.violations_found; } catch { /* ignore */ }
  }
  if (Array.isArray(violations) && violations.length > 0) {
    return { clean: false, reason: `Predecessor has ${violations.length} violation(s)` };
  }

  return { clean: true, reason: 'Predecessor clean' };
}

// ─── Queue Queries (all recalculate before returning) ──────────────────────

async function getQueue(filters = {}) {
  const pool = getAppPool();
  // Recalculate all first
  await refreshAllQueueStatuses();

  let sql = `SELECT * FROM om_prompt_registry WHERE queue_status NOT IN ('pending')`;
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

  sql += ` ORDER BY FIELD(priority, 'critical','high','normal','low'), sequence_order ASC`;
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getNextReady(limit = 5) {
  const pool = getAppPool();
  await refreshAllQueueStatuses();

  const [rows] = await pool.query(
    `SELECT * FROM om_prompt_registry
     WHERE queue_status IN ('ready_for_release', 'overdue')
     ORDER BY FIELD(priority, 'critical','high','normal','low'), sequence_order ASC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

async function getBlocked() {
  const pool = getAppPool();
  await refreshAllQueueStatuses();

  const [rows] = await pool.query(
    `SELECT * FROM om_prompt_registry
     WHERE queue_status = 'blocked'
     ORDER BY FIELD(priority, 'critical','high','normal','low'), sequence_order ASC`
  );

  return rows.map(row => ({
    ...row,
    blocked_reasons: row.blocked_reasons
      ? (typeof row.blocked_reasons === 'string' ? JSON.parse(row.blocked_reasons) : row.blocked_reasons)
      : [],
  }));
}

async function getDue() {
  const pool = getAppPool();
  await refreshAllQueueStatuses();

  const [rows] = await pool.query(
    `SELECT * FROM om_prompt_registry
     WHERE scheduled_at IS NOT NULL
       AND scheduled_at <= NOW()
       AND queue_status NOT IN ('pending', 'released')
     ORDER BY scheduled_at ASC, FIELD(priority, 'critical','high','normal','low')`
  );
  return rows;
}

async function getOverdue() {
  const pool = getAppPool();
  await refreshAllQueueStatuses();

  const [rows] = await pool.query(
    `SELECT * FROM om_prompt_registry
     WHERE overdue = 1
       AND queue_status NOT IN ('released')
     ORDER BY overdue_since ASC, FIELD(priority, 'critical','high','normal','low')`
  );
  return rows;
}

// ─── Scheduling ────────────────────────────────────────────────────────────

async function schedulePrompt(promptId, fields, actor) {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [promptId]);
  if (rows.length === 0) throw new Error(`Prompt not found: ${promptId}`);

  const prompt = rows[0];

  if (['executing', 'complete', 'verified'].includes(prompt.status)) {
    throw new Error(`Cannot schedule: prompt is "${prompt.status}". Only draft/audited/ready/approved prompts can be scheduled.`);
  }
  if (prompt.status === 'rejected') {
    throw new Error('Cannot schedule rejected prompt. Reset to draft first.');
  }

  const { scheduled_at, release_window_start, release_window_end, priority, release_mode, dependency_type, depends_on_prompt_id } = fields;

  if (release_window_start && release_window_end) {
    if (new Date(release_window_start) >= new Date(release_window_end)) {
      throw new Error('release_window_start must be before release_window_end');
    }
  }

  if (depends_on_prompt_id) {
    const [deps] = await pool.query('SELECT id FROM om_prompt_registry WHERE id = ?', [depends_on_prompt_id]);
    if (deps.length === 0) throw new Error(`Dependency prompt not found: ${depends_on_prompt_id}`);
    await validateNoCycle(pool, promptId, depends_on_prompt_id);
  }

  const sets = [];
  const params = [];

  if (scheduled_at !== undefined) { sets.push('scheduled_at = ?'); params.push(scheduled_at || null); }
  if (release_window_start !== undefined) { sets.push('release_window_start = ?'); params.push(release_window_start || null); }
  if (release_window_end !== undefined) { sets.push('release_window_end = ?'); params.push(release_window_end || null); }
  if (priority !== undefined) {
    if (!['low', 'normal', 'high', 'critical'].includes(priority)) throw new Error(`Invalid priority: ${priority}`);
    sets.push('priority = ?'); params.push(priority);
  }
  if (release_mode !== undefined) {
    if (!['manual', 'auto_safe', 'auto_full'].includes(release_mode)) throw new Error(`Invalid release_mode: ${release_mode}`);
    sets.push('release_mode = ?'); params.push(release_mode);
  }
  if (dependency_type !== undefined) {
    if (!['sequence', 'explicit', 'none'].includes(dependency_type)) throw new Error(`Invalid dependency_type: ${dependency_type}`);
    sets.push('dependency_type = ?'); params.push(dependency_type);
  }
  if (depends_on_prompt_id !== undefined) { sets.push('depends_on_prompt_id = ?'); params.push(depends_on_prompt_id || null); }

  if (sets.length === 0) throw new Error('No scheduling fields provided');

  params.push(promptId);
  await pool.query(`UPDATE om_prompt_registry SET ${sets.join(', ')} WHERE id = ?`, params);

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

  // Recalculate and persist — this is the authoritative state
  const state = await refreshQueueStatus(promptId);

  const [updated] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [promptId]);
  return updated[0];
}

async function validateNoCycle(pool, promptId, dependsOnId) {
  const visited = new Set([promptId]);
  let currentId = dependsOnId;
  for (let depth = 0; depth < 20; depth++) {
    if (!currentId) return;
    if (visited.has(currentId)) throw new Error(`Circular dependency detected: ${promptId} → ... → ${currentId}`);
    visited.add(currentId);
    const [rows] = await pool.query('SELECT depends_on_prompt_id FROM om_prompt_registry WHERE id = ?', [currentId]);
    if (rows.length === 0) return;
    currentId = rows[0].depends_on_prompt_id;
  }
  throw new Error('Dependency chain too deep (max 20 levels)');
}

// ─── Full queue-status endpoint data ───────────────────────────────────────

async function getFullQueueStatus(promptId) {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [promptId]);
  if (rows.length === 0) throw new Error(`Prompt not found: ${promptId}`);

  const prompt = rows[0];
  const state = await calculateQueueStatus(pool, prompt);
  await persistQueueState(pool, promptId, state);

  return {
    prompt_id: promptId,
    title: prompt.title,
    status: prompt.status,
    queue_status: state.queue_status,
    blocked_reasons: state.blocked_reasons,
    overdue: state.overdue,
    overdue_since: state.overdue_since,
    explanation: state.explanation,
    scheduling: {
      scheduled_at: prompt.scheduled_at,
      release_window_start: prompt.release_window_start,
      release_window_end: prompt.release_window_end,
      priority: prompt.priority,
      release_mode: prompt.release_mode,
      dependency_type: prompt.dependency_type,
      depends_on_prompt_id: prompt.depends_on_prompt_id,
    },
  };
}

// ─── Dependency Chain ──────────────────────────────────────────────────────

async function getDependencyChain(promptId) {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [promptId]);
  if (rows.length === 0) throw new Error(`Prompt not found: ${promptId}`);

  const prompt = rows[0];
  const chain = [];

  // Sequence deps
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

  // Explicit dep chain
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
      chain.push({
        type: 'explicit',
        prompt_id: deps[0].id,
        title: deps[0].title,
        sequence_order: deps[0].sequence_order,
        status: deps[0].status,
        queue_status: deps[0].queue_status,
        satisfied: deps[0].status === 'verified',
      });
      currentId = deps[0].depends_on_prompt_id;
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
  calculateQueueStatus,
  refreshQueueStatus,
  refreshAllQueueStatuses,
  isEligibleForRelease,
  getQueue,
  getNextReady,
  getBlocked,
  getDue,
  getOverdue,
  schedulePrompt,
  getDependencyChain,
  getFullQueueStatus,
  isPriorStepClean,
  PRIORITY_WEIGHT,
  BLOCK_REASONS,
};
