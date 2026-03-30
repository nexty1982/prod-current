/**
 * Workflow Service
 *
 * Manages prompt workflow lifecycle: creation, step definition, validation,
 * approval flow, and status tracking.
 *
 * State machine:
 *   draft → approved → active → completed
 *   draft → cancelled
 *   approved → cancelled
 *
 * Rules:
 *   - Steps must be defined before approval
 *   - Steps must have valid order and dependency chain
 *   - Prompts cannot be generated until workflow is approved
 *   - Workflow approval does NOT bypass prompt-level audit/evaluation
 *   - Active means prompts have been generated and pipeline is running
 *   - Completed means all generated prompts have reached verified status
 */

const { v4: uuidv4 } = require('uuid');
const { getAppPool } = require('../config/db');

// ─── State Machine ──────────────────────────────────────────────────────────

const VALID_TRANSITIONS = {
  draft:     ['approved', 'cancelled'],
  approved:  ['active', 'cancelled'],
  active:    ['completed', 'cancelled'],
  completed: [],
  cancelled: ['draft'],  // Allow reopen
};

function validateTransition(current, target) {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed || !allowed.includes(target)) {
    throw new Error(
      `Invalid workflow transition: "${current}" → "${target}". ` +
      `Allowed: [${(allowed || []).join(', ')}]`
    );
  }
}

// ─── Logging ────────────────────────────────────────────────────────────────

async function logAction(pool, workflowId, action, actor, details = null) {
  try {
    await pool.query(
      `INSERT INTO system_logs
         (timestamp, level, source, message, meta, user_email, service, source_component)
       VALUES (NOW(), 'INFO', 'prompt_workflow_plan', ?, ?, ?, 'omai', 'prompt_workflows')`,
      [
        `[${action}] workflow=${workflowId}`,
        details ? JSON.stringify(details) : null,
        actor,
      ]
    );
  } catch (err) {
    console.error(`[workflow] Failed to log ${action} on ${workflowId}:`, err.message);
  }
}

// ─── Core CRUD ──────────────────────────────────────────────────────────────

/**
 * Create a new workflow in draft status.
 */
async function createWorkflow({ name, description, component, steps }, actor) {
  if (!name || !component) {
    throw new Error('Workflow name and component are required.');
  }

  const pool = getAppPool();
  const id = uuidv4();

  await pool.query(
    `INSERT INTO prompt_workflows (id, name, description, component, status, created_by, step_count)
     VALUES (?, ?, ?, ?, 'draft', ?, ?)`,
    [id, name, description || null, component, actor, steps ? steps.length : 0]
  );

  // Insert steps if provided
  if (steps && steps.length > 0) {
    await insertSteps(pool, id, steps);
    await pool.query('UPDATE prompt_workflows SET step_count = ? WHERE id = ?', [steps.length, id]);
  }

  await logAction(pool, id, 'CREATED', actor, { name, component, step_count: steps?.length || 0 });

  return getWorkflowById(id);
}

/**
 * Get a workflow by ID with all steps.
 */
async function getWorkflowById(id) {
  const pool = getAppPool();

  const [rows] = await pool.query('SELECT * FROM prompt_workflows WHERE id = ?', [id]);
  if (rows.length === 0) throw new Error(`Workflow not found: ${id}`);

  const workflow = rows[0];

  const [steps] = await pool.query(
    'SELECT * FROM prompt_workflow_steps WHERE workflow_id = ? ORDER BY step_number',
    [id]
  );
  workflow.steps = steps;

  // Compute progress if active
  if (workflow.status === 'active' && steps.length > 0) {
    const promptIds = steps.map(s => s.prompt_id).filter(Boolean);
    if (promptIds.length > 0) {
      const placeholders = promptIds.map(() => '?').join(',');
      const [prompts] = await pool.query(
        `SELECT id, status FROM om_prompt_registry WHERE id IN (${placeholders})`,
        promptIds
      );
      const statusMap = {};
      for (const p of prompts) statusMap[p.id] = p.status;
      workflow.step_progress = steps.map(s => ({
        step_number: s.step_number,
        title: s.title,
        prompt_id: s.prompt_id,
        prompt_status: s.prompt_id ? (statusMap[s.prompt_id] || 'unknown') : 'not_generated',
      }));
    }
  }

  return workflow;
}

/**
 * List workflows with optional filters.
 */
async function listWorkflows({ status, component, created_by } = {}) {
  const pool = getAppPool();
  let query = 'SELECT * FROM prompt_workflows WHERE 1=1';
  const params = [];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (component) { query += ' AND component = ?'; params.push(component); }
  if (created_by) { query += ' AND created_by = ?'; params.push(created_by); }

  query += ' ORDER BY created_at DESC';

  const [rows] = await pool.query(query, params);
  return rows;
}

/**
 * Update workflow metadata (only in draft status).
 */
async function updateWorkflow(id, { name, description, component }, actor) {
  const pool = getAppPool();
  const workflow = await getWorkflowById(id);

  if (workflow.status !== 'draft') {
    throw new Error(`Cannot edit workflow in "${workflow.status}" status. Only draft workflows can be edited.`);
  }

  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (component !== undefined) { updates.push('component = ?'); params.push(component); }

  if (updates.length === 0) throw new Error('No valid fields to update.');

  params.push(id);
  await pool.query(`UPDATE prompt_workflows SET ${updates.join(', ')} WHERE id = ?`, params);
  await logAction(pool, id, 'UPDATED', actor, { fields: updates.map(u => u.split(' = ')[0]) });

  return getWorkflowById(id);
}

// ─── Step Management ────────────────────────────────────────────────────────

/**
 * Insert steps for a workflow. Steps array must be ordered.
 */
async function insertSteps(pool, workflowId, steps) {
  // Get workflow component as default for steps
  const [wfRows] = await pool.query('SELECT component FROM prompt_workflows WHERE id = ?', [workflowId]);
  const wfComponent = wfRows.length > 0 ? wfRows[0].component : '';

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const stepNumber = i + 1;

    if (!s.title || !s.purpose || !s.expected_outcome) {
      throw new Error(`Step ${stepNumber}: title, purpose, and expected_outcome are required.`);
    }

    // Validate depends_on_step
    if (s.depends_on_step !== undefined && s.depends_on_step !== null) {
      if (s.depends_on_step < 1 || s.depends_on_step >= stepNumber) {
        throw new Error(
          `Step ${stepNumber}: depends_on_step must reference an earlier step (1 to ${stepNumber - 1}).`
        );
      }
    }

    await pool.query(
      `INSERT INTO prompt_workflow_steps
         (id, workflow_id, step_number, title, purpose, component, prompt_type, expected_outcome, requirements_summary, depends_on_step)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        workflowId,
        stepNumber,
        s.title,
        s.purpose,
        s.component || wfComponent,
        s.prompt_type || 'implementation',
        s.expected_outcome,
        s.requirements_summary || null,
        s.depends_on_step || null,
      ]
    );
  }
}

/**
 * Replace all steps for a draft workflow.
 */
async function setSteps(workflowId, steps, actor) {
  const pool = getAppPool();
  const workflow = await getWorkflowById(workflowId);

  if (workflow.status !== 'draft') {
    throw new Error(`Cannot modify steps: workflow is "${workflow.status}", must be "draft".`);
  }

  if (!steps || steps.length === 0) {
    throw new Error('At least one step is required.');
  }

  // Delete existing steps
  await pool.query('DELETE FROM prompt_workflow_steps WHERE workflow_id = ?', [workflowId]);

  // Insert new steps
  await insertSteps(pool, workflowId, steps);

  // Update step count
  await pool.query('UPDATE prompt_workflows SET step_count = ? WHERE id = ?', [steps.length, workflowId]);

  await logAction(pool, workflowId, 'STEPS_SET', actor, { step_count: steps.length });

  return getWorkflowById(workflowId);
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate a workflow is ready for approval.
 * Returns { valid: boolean, errors: string[] }
 */
function validateWorkflow(workflow) {
  const errors = [];

  if (!workflow.name) errors.push('Workflow name is required.');
  if (!workflow.component) errors.push('Workflow component is required.');
  if (!workflow.steps || workflow.steps.length === 0) {
    errors.push('Workflow must have at least one step.');
    return { valid: false, errors };
  }

  // Validate step ordering is contiguous
  const stepNumbers = workflow.steps.map(s => s.step_number).sort((a, b) => a - b);
  for (let i = 0; i < stepNumbers.length; i++) {
    if (stepNumbers[i] !== i + 1) {
      errors.push(`Step numbering gap: expected step ${i + 1}, found ${stepNumbers[i]}.`);
    }
  }

  // Validate each step
  for (const step of workflow.steps) {
    if (!step.title) errors.push(`Step ${step.step_number}: missing title.`);
    if (!step.purpose) errors.push(`Step ${step.step_number}: missing purpose.`);
    if (!step.expected_outcome) errors.push(`Step ${step.step_number}: missing expected_outcome.`);

    // Validate depends_on_step references
    if (step.depends_on_step) {
      if (step.depends_on_step >= step.step_number) {
        errors.push(`Step ${step.step_number}: depends_on_step (${step.depends_on_step}) must be less than step_number.`);
      }
      const depExists = workflow.steps.some(s => s.step_number === step.depends_on_step);
      if (!depExists) {
        errors.push(`Step ${step.step_number}: depends_on_step (${step.depends_on_step}) references nonexistent step.`);
      }
    }
  }

  // Check for circular dependencies (simple: all deps must point backward)
  // Already enforced by the < step_number check above

  return { valid: errors.length === 0, errors };
}

// ─── Status Transitions ─────────────────────────────────────────────────────

/**
 * Approve a draft workflow. Validates before approving.
 */
async function approveWorkflow(id, actor) {
  const pool = getAppPool();
  const workflow = await getWorkflowById(id);

  validateTransition(workflow.status, 'approved');

  const validation = validateWorkflow(workflow);
  if (!validation.valid) {
    throw new Error(`Workflow validation failed:\n- ${validation.errors.join('\n- ')}`);
  }

  const [result] = await pool.query(
    `UPDATE prompt_workflows SET status = 'approved', approved_by = ?, approved_at = NOW()
     WHERE id = ? AND status = 'draft'`,
    [actor, id]
  );

  if (result.affectedRows === 0) {
    throw new Error('Atomic approval failed — workflow may have been modified concurrently.');
  }

  await logAction(pool, id, 'APPROVED', actor);
  return getWorkflowById(id);
}

/**
 * Activate a workflow (after prompts have been generated).
 */
async function activateWorkflow(id, actor) {
  const pool = getAppPool();
  const workflow = await getWorkflowById(id);

  validateTransition(workflow.status, 'active');

  if (!workflow.prompts_generated) {
    throw new Error('Cannot activate: prompts have not been generated. Run generate-prompts first.');
  }

  const [result] = await pool.query(
    `UPDATE prompt_workflows SET status = 'active', activated_at = NOW()
     WHERE id = ? AND status = 'approved'`,
    [id]
  );

  if (result.affectedRows === 0) {
    throw new Error('Atomic activation failed — workflow may have been modified concurrently.');
  }

  await logAction(pool, id, 'ACTIVATED', actor);
  return getWorkflowById(id);
}

/**
 * Mark workflow completed (when all prompts are verified).
 */
async function completeWorkflow(id, actor) {
  const pool = getAppPool();
  const workflow = await getWorkflowById(id);

  validateTransition(workflow.status, 'completed');

  // Verify all prompts are verified
  const [steps] = await pool.query(
    'SELECT step_number, prompt_id FROM prompt_workflow_steps WHERE workflow_id = ?',
    [id]
  );

  const promptIds = steps.map(s => s.prompt_id).filter(Boolean);
  if (promptIds.length === 0) {
    throw new Error('Cannot complete: no prompts have been generated.');
  }

  if (promptIds.length < steps.length) {
    throw new Error(`Cannot complete: only ${promptIds.length} of ${steps.length} steps have generated prompts.`);
  }

  const placeholders = promptIds.map(() => '?').join(',');
  const [prompts] = await pool.query(
    `SELECT id, status FROM om_prompt_registry WHERE id IN (${placeholders})`,
    promptIds
  );

  const nonVerified = prompts.filter(p => p.status !== 'verified');
  if (nonVerified.length > 0) {
    throw new Error(
      `Cannot complete: ${nonVerified.length} prompt(s) not yet verified. ` +
      `All prompts must be verified before workflow completion.`
    );
  }

  const [result] = await pool.query(
    `UPDATE prompt_workflows SET status = 'completed', completed_at = NOW()
     WHERE id = ? AND status = 'active'`,
    [id]
  );

  if (result.affectedRows === 0) {
    throw new Error('Atomic completion failed.');
  }

  await logAction(pool, id, 'COMPLETED', actor);
  return getWorkflowById(id);
}

/**
 * Cancel a workflow.
 */
async function cancelWorkflow(id, reason, actor) {
  const pool = getAppPool();
  const workflow = await getWorkflowById(id);

  validateTransition(workflow.status, 'cancelled');

  await pool.query(
    `UPDATE prompt_workflows SET status = 'cancelled' WHERE id = ?`,
    [id]
  );

  await logAction(pool, id, 'CANCELLED', actor, { reason, previous_status: workflow.status });
  return getWorkflowById(id);
}

/**
 * Reopen a cancelled workflow back to draft.
 */
async function reopenWorkflow(id, actor) {
  const pool = getAppPool();
  const workflow = await getWorkflowById(id);

  validateTransition(workflow.status, 'draft');

  await pool.query(
    `UPDATE prompt_workflows SET status = 'draft', approved_by = NULL, approved_at = NULL,
     activated_at = NULL, completed_at = NULL, prompts_generated = 0, generation_error = NULL
     WHERE id = ? AND status = 'cancelled'`,
    [id]
  );

  await logAction(pool, id, 'REOPENED', actor);
  return getWorkflowById(id);
}

/**
 * Get workflow status summary (for quick polling).
 */
async function getWorkflowStatus(id) {
  const pool = getAppPool();

  const [rows] = await pool.query('SELECT * FROM prompt_workflows WHERE id = ?', [id]);
  if (rows.length === 0) throw new Error(`Workflow not found: ${id}`);
  const wf = rows[0];

  const [steps] = await pool.query(
    'SELECT step_number, title, prompt_id FROM prompt_workflow_steps WHERE workflow_id = ? ORDER BY step_number',
    [id]
  );

  const promptIds = steps.map(s => s.prompt_id).filter(Boolean);
  let promptStatuses = {};
  if (promptIds.length > 0) {
    const ph = promptIds.map(() => '?').join(',');
    const [prompts] = await pool.query(
      `SELECT id, status, quality_score FROM om_prompt_registry WHERE id IN (${ph})`,
      promptIds
    );
    for (const p of prompts) promptStatuses[p.id] = { status: p.status, score: p.quality_score };
  }

  const stepSummary = steps.map(s => ({
    step_number: s.step_number,
    title: s.title,
    prompt_id: s.prompt_id,
    prompt_status: s.prompt_id ? (promptStatuses[s.prompt_id]?.status || 'unknown') : 'not_generated',
    quality_score: s.prompt_id ? (promptStatuses[s.prompt_id]?.score ?? null) : null,
  }));

  const total = steps.length;
  const generated = promptIds.length;
  const verified = stepSummary.filter(s => s.prompt_status === 'verified').length;
  const executing = stepSummary.filter(s => s.prompt_status === 'executing').length;
  const blocked = stepSummary.filter(s => s.prompt_status === 'rejected').length;

  return {
    id: wf.id,
    name: wf.name,
    status: wf.status,
    total_steps: total,
    generated,
    verified,
    executing,
    blocked,
    progress_pct: total > 0 ? Math.round((verified / total) * 100) : 0,
    current_step: stepSummary.find(s =>
      ['draft', 'audited', 'ready', 'approved', 'executing'].includes(s.prompt_status)
    ) || null,
    steps: stepSummary,
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  createWorkflow,
  getWorkflowById,
  listWorkflows,
  updateWorkflow,
  setSteps,
  validateWorkflow,
  approveWorkflow,
  activateWorkflow,
  completeWorkflow,
  cancelWorkflow,
  reopenWorkflow,
  getWorkflowStatus,
};
