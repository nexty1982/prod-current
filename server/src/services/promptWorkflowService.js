/**
 * Prompt Workflow Service
 *
 * Manages structured, sequential prompt execution with strict state machine
 * enforcement, mandatory audit gate, sequence validation, and audit logging.
 *
 * State machine:
 *   draft → audited → ready → approved → executing → complete → verified
 *   (any state except verified/draft) → rejected → draft
 *
 * Audit gate enforcement:
 *   - audit_status must be 'pass' to transition to ready, approved, or executing
 *   - Editing prompt_text resets audit_status to 'pending'
 *   - Verified prompts are immutable
 *
 * Concurrency safety:
 *   - All transitions use atomic UPDATE ... WHERE status = ? with affectedRows check
 *   - Prevents TOCTOU race conditions and duplicate transitions
 *
 * Rules enforced:
 *   - No skipping states
 *   - No execution without approval
 *   - No approval without audit pass
 *   - No verification without execution completion
 *   - No execution out of sequence order (previous must be verified first)
 */

const { v4: uuidv4 } = require('uuid');
const { getAppPool } = require('../config/db');
const { enforceAuditPass, resetAudit } = require('./promptAuditService');

// ─── State Machine ──────────────────────────────────────────────────────────

const VALID_TRANSITIONS = {
  draft:     ['audited'],
  audited:   ['ready', 'rejected'],
  ready:     ['approved', 'rejected'],
  approved:  ['executing', 'rejected'],
  executing: ['complete', 'rejected'],
  complete:  ['verified', 'rejected'],
  verified:  [],
  rejected:  ['draft'],
};

const STATUS_ORDER = ['draft', 'audited', 'ready', 'approved', 'executing', 'complete', 'verified'];

// States that require audit_status = pass to enter
const AUDIT_GATED_STATES = ['ready', 'approved', 'executing'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function validateTransition(currentStatus, targetStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new Error(
      `Invalid transition: "${currentStatus}" → "${targetStatus}". ` +
      `Allowed transitions from "${currentStatus}": [${(allowed || []).join(', ')}]`
    );
  }
}

async function logAction(pool, promptId, action, actor, details = null) {
  try {
    await pool.query(
      `INSERT INTO system_logs
         (timestamp, level, source, message, meta, user_email, service, source_component)
       VALUES (NOW(), 'INFO', 'prompt_workflow', ?, ?, ?, 'omai', 'prompt_registry')`,
      [
        `[${action}] prompt=${promptId}`,
        details ? JSON.stringify(details) : null,
        actor,
      ]
    );
  } catch (err) {
    // Log failure must not prevent the operation from completing.
    // The transition has already been committed at this point.
    console.error(`[prompt_workflow] Failed to write log for ${action} on ${promptId}:`, err.message);
  }
}

/**
 * Atomic status transition: UPDATE with WHERE status = expectedStatus.
 * Returns the number of affected rows. If 0, another request already changed the status.
 * This prevents TOCTOU race conditions.
 */
async function atomicStatusUpdate(pool, id, expectedStatus, newStatus, extraSets = '', extraParams = []) {
  const sets = extraSets ? `status = ?, ${extraSets}` : 'status = ?';
  const params = [newStatus, ...extraParams, expectedStatus, id];

  const [result] = await pool.query(
    `UPDATE om_prompt_registry SET ${sets} WHERE status = ? AND id = ?`,
    params
  );

  return result.affectedRows;
}

// ─── Core CRUD ──────────────────────────────────────────────────────────────

async function createPrompt({
  created_by, title, purpose, component, parent_prompt_id,
  sequence_order, prompt_text, guardrails_applied,
}) {
  const pool = getAppPool();

  // Validate required fields (trim to reject whitespace-only)
  if (!created_by || !title?.trim() || !purpose?.trim() || !component?.trim() || !prompt_text?.trim()) {
    throw new Error('Missing required fields: created_by, title, purpose, component, prompt_text');
  }

  // Validate sequence_order is a valid non-negative integer
  if (sequence_order == null || !Number.isInteger(sequence_order) || sequence_order < 0) {
    throw new Error('sequence_order must be a non-negative integer');
  }

  // Enforce unique sequence_order within parent scope
  const parentScope = parent_prompt_id || null;
  const [existing] = await pool.query(
    `SELECT id FROM om_prompt_registry
     WHERE parent_prompt_id <=> ? AND sequence_order = ?`,
    [parentScope, sequence_order]
  );
  if (existing.length > 0) {
    throw new Error(
      `sequence_order ${sequence_order} already exists within parent scope ` +
      `${parentScope || '(root)'}. Each sequence position must be unique.`
    );
  }

  const id = uuidv4();

  // New prompts always start as draft with audit_status = pending
  await pool.query(
    `INSERT INTO om_prompt_registry
       (id, created_by, title, purpose, component, parent_prompt_id,
        sequence_order, status, prompt_text, guardrails_applied, audit_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, 'pending')`,
    [
      id, created_by, title.trim(), purpose.trim(), component.trim(), parentScope,
      sequence_order, prompt_text, guardrails_applied ? 1 : 0,
    ]
  );

  await logAction(pool, id, 'CREATED', created_by, { title: title.trim(), component: component.trim(), sequence_order });

  return getPromptById(id);
}

async function getAllPrompts({ status, component, parent_prompt_id, audit_status } = {}) {
  const pool = getAppPool();
  let sql = 'SELECT * FROM om_prompt_registry WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (component) {
    sql += ' AND component = ?';
    params.push(component);
  }
  if (audit_status) {
    sql += ' AND audit_status = ?';
    params.push(audit_status);
  }
  if (parent_prompt_id !== undefined) {
    if (parent_prompt_id === null || parent_prompt_id === 'null') {
      sql += ' AND parent_prompt_id IS NULL';
    } else {
      sql += ' AND parent_prompt_id = ?';
      params.push(parent_prompt_id);
    }
  }

  sql += ' ORDER BY parent_prompt_id, sequence_order ASC';

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getPromptById(id) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    'SELECT * FROM om_prompt_registry WHERE id = ?',
    [id]
  );
  if (rows.length === 0) {
    throw new Error(`Prompt not found: ${id}`);
  }
  return rows[0];
}

async function updatePrompt(id, updates, actor) {
  const pool = getAppPool();

  const prompt = await getPromptById(id);

  // Only allow field updates when in draft, audited, or rejected status
  if (!['draft', 'audited', 'rejected'].includes(prompt.status)) {
    throw new Error(
      `Cannot update prompt fields when status is "${prompt.status}". ` +
      'Prompts can only be edited in "draft", "audited", or "rejected" status.'
    );
  }

  const allowedFields = [
    'title', 'purpose', 'component', 'prompt_text',
    'guardrails_applied', 'sequence_order', 'parent_prompt_id',
  ];

  const setClauses = [];
  const params = [];
  let promptTextChanged = false;

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      if (field === 'guardrails_applied') {
        setClauses.push(`${field} = ?`);
        params.push(updates[field] ? 1 : 0);
      } else if (field === 'sequence_order') {
        // Validate sequence_order is a valid integer
        const seqVal = parseInt(updates[field], 10);
        if (!Number.isInteger(seqVal) || seqVal < 0) {
          throw new Error('sequence_order must be a non-negative integer');
        }
        setClauses.push(`${field} = ?`);
        params.push(seqVal);
      } else {
        setClauses.push(`${field} = ?`);
        params.push(updates[field]);
      }
      if (field === 'prompt_text' || field === 'guardrails_applied') {
        promptTextChanged = true;
      }
    }
  }

  if (setClauses.length === 0) {
    throw new Error('No valid fields to update');
  }

  // If sequence_order is changing, validate uniqueness
  if (updates.sequence_order !== undefined) {
    const seqVal = parseInt(updates.sequence_order, 10);
    const parentScope = updates.parent_prompt_id !== undefined
      ? updates.parent_prompt_id
      : prompt.parent_prompt_id;

    const [conflict] = await pool.query(
      `SELECT id FROM om_prompt_registry
       WHERE parent_prompt_id <=> ? AND sequence_order = ? AND id != ?`,
      [parentScope || null, seqVal, id]
    );
    if (conflict.length > 0) {
      throw new Error(
        `sequence_order ${seqVal} already exists within parent scope`
      );
    }
  }

  // MANDATORY: If prompt_text or guardrails_applied changed, reset audit
  if (promptTextChanged) {
    setClauses.push("audit_status = 'pending'");
    setClauses.push('audit_result = NULL');
    setClauses.push('audit_notes = NULL');
    setClauses.push('audited_at = NULL');
    setClauses.push('audited_by = NULL');

    // If prompt was in 'audited' status, revert to 'draft'
    if (prompt.status === 'audited') {
      setClauses.push("status = 'draft'");
    }
  }

  params.push(id);
  await pool.query(
    `UPDATE om_prompt_registry SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );

  await logAction(pool, id, 'UPDATED', actor, {
    fields: Object.keys(updates).filter(k => allowedFields.includes(k)),
    audit_reset: promptTextChanged,
  });

  return getPromptById(id);
}

// ─── State Transitions ──────────────────────────────────────────────────────

/**
 * Generic state transition with atomic safety.
 * Uses UPDATE ... WHERE status = expectedStatus AND id = ? to prevent race conditions.
 */
async function transitionStatus(id, expectedStatus, targetStatus, actor) {
  const pool = getAppPool();

  validateTransition(expectedStatus, targetStatus);

  // AUDIT GATE: enforce audit_status = pass for gated states
  if (AUDIT_GATED_STATES.includes(targetStatus)) {
    await enforceAuditPass(id);
  }

  // Atomic: only update if status is still what we expect
  const affected = await atomicStatusUpdate(pool, id, expectedStatus, targetStatus);
  if (affected === 0) {
    // Re-read to get current status for a clear error message
    const current = await getPromptById(id);
    throw new Error(
      `Transition conflict: prompt status changed to "${current.status}" before this ` +
      `"${expectedStatus}" → "${targetStatus}" transition could complete. Retry the action.`
    );
  }

  await logAction(pool, id, `STATUS_${targetStatus.toUpperCase()}`, actor, {
    from: expectedStatus,
    to: targetStatus,
  });

  return getPromptById(id);
}

async function markReady(id, actor) {
  const prompt = await getPromptById(id);

  // Must be in 'audited' status
  if (prompt.status !== 'audited') {
    throw new Error(
      `Cannot mark ready: prompt is "${prompt.status}", must be "audited". ` +
      'Workflow: draft → (audit pass) → audited → ready → approved. ' +
      'Run POST /api/prompts/:id/audit first.'
    );
  }

  // Double-check audit gate
  await enforceAuditPass(id);

  // Validate the prompt has required content
  if (!prompt.prompt_text || prompt.prompt_text.trim().length === 0) {
    throw new Error('Cannot mark ready: prompt_text is empty');
  }

  return transitionStatus(id, 'audited', 'ready', actor);
}

async function approvePrompt(id, actor) {
  const prompt = await getPromptById(id);

  // Must be in 'ready' status
  if (prompt.status !== 'ready') {
    throw new Error(
      `Cannot approve: prompt is "${prompt.status}", must be "ready". ` +
      'Workflow: draft → audited → ready → approved'
    );
  }

  // AUDIT GATE: mandatory check
  await enforceAuditPass(id);

  return transitionStatus(id, 'ready', 'approved', actor);
}

async function rejectPrompt(id, actor, reason) {
  const pool = getAppPool();
  const prompt = await getPromptById(id);

  if (prompt.status === 'verified') {
    throw new Error('Cannot reject a verified prompt');
  }
  if (prompt.status === 'draft') {
    throw new Error('Cannot reject a draft prompt — it has not been submitted yet');
  }

  validateTransition(prompt.status, 'rejected');

  // Atomic: UPDATE only if status hasn't changed
  const rejectionData = reason
    ? JSON.stringify({ rejected: true, reason, actor, at: new Date().toISOString() })
    : null;

  const affected = await atomicStatusUpdate(
    pool, id, prompt.status, 'rejected',
    'verification_result = ?', [rejectionData]
  );

  if (affected === 0) {
    const current = await getPromptById(id);
    throw new Error(
      `Rejection conflict: prompt status changed to "${current.status}" before rejection could complete.`
    );
  }

  await logAction(pool, id, 'REJECTED', actor, { from: prompt.status, to: 'rejected', reason });

  return getPromptById(id);
}

async function executePrompt(id, actor) {
  const pool = getAppPool();
  const prompt = await getPromptById(id);

  // Must be approved
  if (prompt.status !== 'approved') {
    throw new Error(
      `Cannot execute: prompt is "${prompt.status}", must be "approved". ` +
      'No execution without approval.'
    );
  }

  // AUDIT GATE: mandatory triple-check at execution time
  await enforceAuditPass(id);

  // Enforce sequence order: all previous prompts in same parent scope must be verified
  await enforceSequenceOrder(pool, prompt);

  // Atomic transition to executing
  const affected = await atomicStatusUpdate(pool, id, 'approved', 'executing');
  if (affected === 0) {
    const current = await getPromptById(id);
    throw new Error(
      `Execution conflict: prompt status changed to "${current.status}" before execution could start.`
    );
  }

  await logAction(pool, id, 'EXECUTION_STARTED', actor, {
    from: 'approved',
    to: 'executing',
    sequence_order: prompt.sequence_order,
    parent_prompt_id: prompt.parent_prompt_id,
    audit_status: prompt.audit_status,
  });

  return getPromptById(id);
}

async function completeExecution(id, actor, executionResult) {
  const pool = getAppPool();
  const prompt = await getPromptById(id);

  if (prompt.status !== 'executing') {
    throw new Error(
      `Cannot complete: prompt is "${prompt.status}", must be "executing"`
    );
  }

  // Atomic transition with execution_result
  const affected = await atomicStatusUpdate(
    pool, id, 'executing', 'complete',
    'execution_result = ?',
    [executionResult ? JSON.stringify(executionResult) : null]
  );

  if (affected === 0) {
    const current = await getPromptById(id);
    throw new Error(
      `Completion conflict: prompt status changed to "${current.status}" before completion.`
    );
  }

  await logAction(pool, id, 'EXECUTION_COMPLETE', actor, {
    from: 'executing',
    to: 'complete',
    result_length: executionResult ? JSON.stringify(executionResult).length : 0,
  });

  return getPromptById(id);
}

async function verifyPrompt(id, actor, verificationData) {
  const pool = getAppPool();
  const prompt = await getPromptById(id);

  // Must be complete
  if (prompt.status !== 'complete') {
    throw new Error(
      `Cannot verify: prompt is "${prompt.status}", must be "complete". ` +
      'No verification without execution completion.'
    );
  }

  // Verification checks
  const result = {
    verified_by: actor,
    verified_at: new Date().toISOString(),
    checks: {
      execution_completed: prompt.execution_result !== null,
      system_state_modified: verificationData?.system_state_modified ?? false,
      guardrails_followed: prompt.guardrails_applied
        ? (verificationData?.guardrails_followed ?? false)
        : true,
      audit_passed: prompt.audit_status === 'pass',
    },
    notes: verificationData?.notes || null,
  };

  const allPassed = Object.values(result.checks).every(Boolean);

  if (!allPassed) {
    throw new Error(
      `Verification failed. Checks: ${JSON.stringify(result.checks)}. ` +
      'All checks must pass for verification.'
    );
  }

  // Atomic transition with verification_result
  const affected = await atomicStatusUpdate(
    pool, id, 'complete', 'verified',
    'verification_result = ?',
    [JSON.stringify(result)]
  );

  if (affected === 0) {
    const current = await getPromptById(id);
    throw new Error(
      `Verification conflict: prompt status changed to "${current.status}" before verification.`
    );
  }

  await logAction(pool, id, 'VERIFIED', actor, {
    from: 'complete',
    to: 'verified',
    ...result,
  });

  return getPromptById(id);
}

/**
 * Reset a rejected prompt back to draft status.
 * Resets audit to pending so the prompt must be re-audited.
 */
async function resetToDraft(id, actor) {
  const pool = getAppPool();
  const prompt = await getPromptById(id);

  if (prompt.status !== 'rejected') {
    throw new Error(
      `Cannot reset to draft: prompt is "${prompt.status}", must be "rejected". ` +
      'Only rejected prompts can be reset to draft.'
    );
  }

  // Atomic transition: rejected → draft, reset audit fields
  const affected = await atomicStatusUpdate(
    pool, id, 'rejected', 'draft',
    "audit_status = 'pending', audit_result = NULL, audit_notes = NULL, audited_at = NULL, audited_by = NULL",
    []
  );

  if (affected === 0) {
    const current = await getPromptById(id);
    throw new Error(
      `Reset conflict: prompt status changed to "${current.status}" before reset could complete.`
    );
  }

  await logAction(pool, id, 'RESET_TO_DRAFT', actor, {
    from: 'rejected',
    to: 'draft',
  });

  return getPromptById(id);
}

// ─── Sequence Enforcement ───────────────────────────────────────────────────

async function enforceSequenceOrder(pool, prompt) {
  const parentScope = prompt.parent_prompt_id || null;

  const [predecessors] = await pool.query(
    `SELECT id, sequence_order, status FROM om_prompt_registry
     WHERE parent_prompt_id <=> ? AND sequence_order < ? AND id != ?
     ORDER BY sequence_order ASC`,
    [parentScope, prompt.sequence_order, prompt.id]
  );

  for (const pred of predecessors) {
    if (pred.status !== 'verified') {
      throw new Error(
        `Cannot execute prompt at sequence_order=${prompt.sequence_order}: ` +
        `predecessor at sequence_order=${pred.sequence_order} (id=${pred.id}) ` +
        `is "${pred.status}", must be "verified". ` +
        'Prompts must be executed and verified in order.'
      );
    }
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  // CRUD
  createPrompt,
  getAllPrompts,
  getPromptById,
  updatePrompt,
  // State transitions
  markReady,
  approvePrompt,
  rejectPrompt,
  executePrompt,
  completeExecution,
  verifyPrompt,
  resetToDraft,
  // Constants
  VALID_TRANSITIONS,
  STATUS_ORDER,
  AUDIT_GATED_STATES,
};
