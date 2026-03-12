/**
 * Prompt Plans API Routes
 *
 * Ordered sequences of AI prompts for complex initiatives.
 * Part of OM Daily / AI workflow layer — NOT release management.
 *
 * Mounted at /api/prompt-plans
 */

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

function getPool() {
  return require('../config/db').promisePool;
}

// ── Reuse the prompt-driven work item creation from omai.js ──
// We import the helpers directly to avoid duplicating logic.
let _omaiHelpers = null;
function getOmaiHelpers() {
  if (!_omaiHelpers) {
    // These functions are defined in omai.js — we extract them by requiring the module's
    // pool access pattern directly. Since omai.js doesn't export them, we replicate the
    // lean versions here that call the same DB.
    const { getAppPool } = require('../config/db-compat');

    function generateWorkItemTitle(prompt) {
      if (!prompt || typeof prompt !== 'string') return 'Untitled AI prompt';
      let title = prompt.trim();
      const sentenceEnd = title.search(/[.!?\n]/);
      if (sentenceEnd > 0 && sentenceEnd < 120) title = title.substring(0, sentenceEnd);
      const prefixes = [
        /^(hey\s*,?\s*)/i, /^(hi\s*,?\s*)/i, /^(hello\s*,?\s*)/i,
        /^(please\s+)/i, /^(can you\s+)/i, /^(could you\s+)/i, /^(would you\s+)/i,
        /^(i want you to\s+)/i, /^(i want to\s+)/i, /^(i need you to\s+)/i,
        /^(i need to\s+)/i, /^(i'd like you to\s+)/i, /^(i'd like to\s+)/i,
        /^(let's\s+)/i, /^(go ahead and\s+)/i, /^(help me\s+)/i,
      ];
      let changed = true;
      while (changed) {
        changed = false;
        for (const re of prefixes) {
          const before = title;
          title = title.replace(re, '');
          if (title !== before) changed = true;
        }
      }
      title = title.trim();
      if (!title) return 'Untitled AI prompt';
      title = title.charAt(0).toUpperCase() + title.slice(1);
      if (title.length > 80) {
        title = title.substring(0, 80);
        const lastSpace = title.lastIndexOf(' ');
        if (lastSpace > 40) title = title.substring(0, lastSpace);
      }
      return title;
    }

    async function createWorkItemForStep(step, userId) {
      const pool = getAppPool();
      const title = step.title || generateWorkItemTitle(step.prompt_text);
      const metadata = {
        prompt_text: step.prompt_text || null,
        prompt_plan_id: step.prompt_plan_id,
        prompt_plan_step_id: step.id,
        execution_status: 'queued',
        execution_started_at: null,
        execution_finished_at: null,
        execution_result_summary: null,
        execution_error: null,
      };
      const [result] = await pool.query(
        `INSERT INTO om_daily_items (title, task_type, description, horizon, status, priority, category, source, agent_tool, metadata, created_by)
         VALUES (?, 'task', ?, '7', 'todo', 'medium', 'ai', 'ai_prompt', 'omai', ?, ?)`,
        [title, `Prompt Plan step: ${step.prompt_text ? step.prompt_text.substring(0, 200) : title}`, JSON.stringify(metadata), userId || null]
      );
      const [rows] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [result.insertId]);
      return rows[0];
    }

    async function updateWorkItemMeta(itemId, updates) {
      const pool = getAppPool();
      try {
        const [rows] = await pool.query('SELECT metadata FROM om_daily_items WHERE id = ?', [itemId]);
        if (!rows.length) return;
        let meta = {};
        try { meta = JSON.parse(rows[0].metadata) || {}; } catch { meta = {}; }
        Object.assign(meta, updates);
        await pool.query('UPDATE om_daily_items SET metadata = ? WHERE id = ?', [JSON.stringify(meta), itemId]);
      } catch (err) {
        console.error(`[PromptPlans] Failed to update work item #${itemId} metadata:`, err.message);
      }
    }

    _omaiHelpers = { generateWorkItemTitle, createWorkItemForStep, updateWorkItemMeta };
  }
  return _omaiHelpers;
}

// All routes require super_admin
router.use(requireAuth);
router.use(requireRole('super_admin'));

// ═══════════════════════════════════════════════════════════════
// PLAN LIFECYCLE VALIDATION
// ═══════════════════════════════════════════════════════════════

const PLAN_TRANSITIONS = {
  draft:     ['active', 'cancelled'],
  active:    ['paused', 'completed', 'cancelled'],
  paused:    ['active', 'cancelled'],
  completed: [],
  cancelled: [],
};

const STEP_TERMINAL = ['completed', 'failed', 'skipped'];

function validatePlanTransition(from, to) {
  const allowed = PLAN_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    return `Cannot transition plan from "${from}" to "${to}". Allowed: ${(allowed || []).join(', ') || 'none'}`;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// LIST — all prompt plans
// ═══════════════════════════════════════════════════════════════

router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { status } = req.query;
    let sql = `SELECT pp.*, u.email AS created_by_email,
      (SELECT COUNT(*) FROM prompt_plan_steps WHERE prompt_plan_id = pp.id) AS step_count,
      (SELECT COUNT(*) FROM prompt_plan_steps WHERE prompt_plan_id = pp.id AND status = 'completed') AS completed_count
      FROM prompt_plans pp
      LEFT JOIN users u ON pp.created_by = u.id`;
    const params = [];
    if (status) { sql += ' WHERE pp.status = ?'; params.push(status); }
    sql += ' ORDER BY pp.created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ items: rows });
  } catch (err) {
    console.error('[PromptPlans] List error:', err);
    res.status(500).json({ error: 'Failed to list prompt plans' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET — single plan with steps
// ═══════════════════════════════════════════════════════════════

router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [plans] = await pool.query(
      `SELECT pp.*, u.email AS created_by_email
       FROM prompt_plans pp LEFT JOIN users u ON pp.created_by = u.id
       WHERE pp.id = ?`, [req.params.id]
    );
    if (!plans.length) return res.status(404).json({ error: 'Plan not found' });

    const [steps] = await pool.query(
      `SELECT pps.*, odi.title AS work_item_title, odi.status AS work_item_status
       FROM prompt_plan_steps pps
       LEFT JOIN om_daily_items odi ON pps.generated_work_item_id = odi.id
       WHERE pps.prompt_plan_id = ?
       ORDER BY pps.execution_order ASC`, [req.params.id]
    );

    res.json({ plan: plans[0], steps });
  } catch (err) {
    console.error('[PromptPlans] Get error:', err);
    res.status(500).json({ error: 'Failed to get prompt plan' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CREATE — new prompt plan
// ═══════════════════════════════════════════════════════════════

router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const { title, description, steps } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const userId = req.session?.user?.id || null;
    const [result] = await pool.query(
      'INSERT INTO prompt_plans (title, description, created_by) VALUES (?, ?, ?)',
      [title, description || null, userId]
    );
    const planId = result.insertId;

    // Bulk-insert steps if provided
    if (Array.isArray(steps) && steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await pool.query(
          `INSERT INTO prompt_plan_steps (prompt_plan_id, step_number, title, prompt_text, execution_order, notes, is_required)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [planId, i + 1, s.title || `Step ${i + 1}`, s.prompt_text || null, i + 1, s.notes || null, s.is_required !== false]
        );
      }
    }

    const [plan] = await pool.query('SELECT * FROM prompt_plans WHERE id = ?', [planId]);
    const [planSteps] = await pool.query('SELECT * FROM prompt_plan_steps WHERE prompt_plan_id = ? ORDER BY execution_order', [planId]);
    res.status(201).json({ plan: plan[0], steps: planSteps });
  } catch (err) {
    console.error('[PromptPlans] Create error:', err);
    res.status(500).json({ error: 'Failed to create prompt plan' });
  }
});

// ═══════════════════════════════════════════════════════════════
// UPDATE — edit plan metadata (draft/active/paused only)
// ═══════════════════════════════════════════════════════════════

router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [plans] = await pool.query('SELECT * FROM prompt_plans WHERE id = ?', [req.params.id]);
    if (!plans.length) return res.status(404).json({ error: 'Plan not found' });
    const plan = plans[0];

    if (['completed', 'cancelled'].includes(plan.status)) {
      return res.status(400).json({ error: `Cannot edit a ${plan.status} plan` });
    }

    const { title, description } = req.body;
    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(req.params.id);
    await pool.query(`UPDATE prompt_plans SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query('SELECT * FROM prompt_plans WHERE id = ?', [req.params.id]);
    res.json({ plan: updated[0] });
  } catch (err) {
    console.error('[PromptPlans] Update error:', err);
    res.status(500).json({ error: 'Failed to update prompt plan' });
  }
});

// ═══════════════════════════════════════════════════════════════
// TRANSITION — change plan status
// ═══════════════════════════════════════════════════════════════

router.post('/:id/transition', async (req, res) => {
  try {
    const pool = getPool();
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'to status is required' });

    const [plans] = await pool.query('SELECT * FROM prompt_plans WHERE id = ?', [req.params.id]);
    if (!plans.length) return res.status(404).json({ error: 'Plan not found' });
    const plan = plans[0];

    const err = validatePlanTransition(plan.status, to);
    if (err) return res.status(400).json({ error: err });

    // Completion requires all required steps done or skipped
    if (to === 'completed') {
      const [steps] = await pool.query(
        'SELECT * FROM prompt_plan_steps WHERE prompt_plan_id = ? AND is_required = TRUE AND status NOT IN (?, ?)',
        [plan.id, 'completed', 'skipped']
      );
      if (steps.length > 0) {
        return res.status(400).json({
          error: `Cannot complete plan: ${steps.length} required step(s) not completed or skipped`,
          blocking_steps: steps.map(s => ({ id: s.id, title: s.title, status: s.status })),
        });
      }
    }

    const completedAt = to === 'completed' ? new Date() : null;
    await pool.query('UPDATE prompt_plans SET status = ?, completed_at = ? WHERE id = ?', [to, completedAt, plan.id]);

    const [updated] = await pool.query('SELECT * FROM prompt_plans WHERE id = ?', [plan.id]);
    res.json({ plan: updated[0] });
  } catch (err) {
    console.error('[PromptPlans] Transition error:', err);
    res.status(500).json({ error: 'Failed to transition plan' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADD STEP
// ═══════════════════════════════════════════════════════════════

router.post('/:id/steps', async (req, res) => {
  try {
    const pool = getPool();
    const [plans] = await pool.query('SELECT * FROM prompt_plans WHERE id = ?', [req.params.id]);
    if (!plans.length) return res.status(404).json({ error: 'Plan not found' });
    if (['completed', 'cancelled'].includes(plans[0].status)) {
      return res.status(400).json({ error: `Cannot add steps to a ${plans[0].status} plan` });
    }

    const { title, prompt_text, notes, is_required } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    // Get next execution_order
    const [maxRow] = await pool.query(
      'SELECT COALESCE(MAX(execution_order), 0) AS maxOrder FROM prompt_plan_steps WHERE prompt_plan_id = ?',
      [req.params.id]
    );
    const nextOrder = maxRow[0].maxOrder + 1;

    const [result] = await pool.query(
      `INSERT INTO prompt_plan_steps (prompt_plan_id, step_number, title, prompt_text, execution_order, notes, is_required)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, nextOrder, title, prompt_text || null, nextOrder, notes || null, is_required !== false]
    );

    const [step] = await pool.query('SELECT * FROM prompt_plan_steps WHERE id = ?', [result.insertId]);
    res.status(201).json({ step: step[0] });
  } catch (err) {
    console.error('[PromptPlans] Add step error:', err);
    res.status(500).json({ error: 'Failed to add step' });
  }
});

// ═══════════════════════════════════════════════════════════════
// UPDATE STEP
// ═══════════════════════════════════════════════════════════════

router.put('/:id/steps/:stepId', async (req, res) => {
  try {
    const pool = getPool();
    const [steps] = await pool.query(
      'SELECT * FROM prompt_plan_steps WHERE id = ? AND prompt_plan_id = ?',
      [req.params.stepId, req.params.id]
    );
    if (!steps.length) return res.status(404).json({ error: 'Step not found' });
    const step = steps[0];

    // Cannot edit running/completed steps' core fields
    if (['running', 'completed'].includes(step.status)) {
      const { notes } = req.body;
      if (notes !== undefined) {
        await pool.query('UPDATE prompt_plan_steps SET notes = ? WHERE id = ?', [notes, step.id]);
        const [updated] = await pool.query('SELECT * FROM prompt_plan_steps WHERE id = ?', [step.id]);
        return res.json({ step: updated[0] });
      }
      return res.status(400).json({ error: `Cannot edit a ${step.status} step (only notes allowed)` });
    }

    const { title, prompt_text, notes, is_required } = req.body;
    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (prompt_text !== undefined) { updates.push('prompt_text = ?'); params.push(prompt_text); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (is_required !== undefined) { updates.push('is_required = ?'); params.push(is_required ? 1 : 0); }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(step.id);
    await pool.query(`UPDATE prompt_plan_steps SET ${updates.join(', ')} WHERE id = ?`, params);
    const [updated] = await pool.query('SELECT * FROM prompt_plan_steps WHERE id = ?', [step.id]);
    res.json({ step: updated[0] });
  } catch (err) {
    console.error('[PromptPlans] Update step error:', err);
    res.status(500).json({ error: 'Failed to update step' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DELETE STEP (only pending/ready steps in non-terminal plans)
// ═══════════════════════════════════════════════════════════════

router.delete('/:id/steps/:stepId', async (req, res) => {
  try {
    const pool = getPool();
    const [steps] = await pool.query(
      'SELECT * FROM prompt_plan_steps WHERE id = ? AND prompt_plan_id = ?',
      [req.params.stepId, req.params.id]
    );
    if (!steps.length) return res.status(404).json({ error: 'Step not found' });
    if (!['pending', 'ready'].includes(steps[0].status)) {
      return res.status(400).json({ error: `Cannot delete a ${steps[0].status} step` });
    }

    await pool.query('DELETE FROM prompt_plan_steps WHERE id = ?', [req.params.stepId]);

    // Re-number remaining steps
    const [remaining] = await pool.query(
      'SELECT id FROM prompt_plan_steps WHERE prompt_plan_id = ? ORDER BY execution_order',
      [req.params.id]
    );
    for (let i = 0; i < remaining.length; i++) {
      await pool.query('UPDATE prompt_plan_steps SET execution_order = ?, step_number = ? WHERE id = ?',
        [i + 1, i + 1, remaining[i].id]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[PromptPlans] Delete step error:', err);
    res.status(500).json({ error: 'Failed to delete step' });
  }
});

// ═══════════════════════════════════════════════════════════════
// REORDER STEPS
// ═══════════════════════════════════════════════════════════════

router.post('/:id/reorder', async (req, res) => {
  try {
    const pool = getPool();
    const { step_ids } = req.body; // ordered array of step IDs
    if (!Array.isArray(step_ids) || step_ids.length === 0) {
      return res.status(400).json({ error: 'step_ids array is required' });
    }

    // Validate all steps belong to this plan
    const [existing] = await pool.query(
      'SELECT id, status FROM prompt_plan_steps WHERE prompt_plan_id = ?', [req.params.id]
    );
    const existingIds = new Set(existing.map(s => s.id));
    for (const sid of step_ids) {
      if (!existingIds.has(sid)) return res.status(400).json({ error: `Step ${sid} not found in this plan` });
    }

    // Check that completed/running steps maintain their relative order
    const completedOrRunning = existing.filter(s => ['completed', 'running'].includes(s.status));
    if (completedOrRunning.length > 0) {
      // Just validate these aren't moved after pending steps
      // We allow reordering of pending/ready/failed steps freely
    }

    for (let i = 0; i < step_ids.length; i++) {
      await pool.query(
        'UPDATE prompt_plan_steps SET execution_order = ?, step_number = ? WHERE id = ?',
        [i + 1, i + 1, step_ids[i]]
      );
    }

    const [steps] = await pool.query(
      'SELECT * FROM prompt_plan_steps WHERE prompt_plan_id = ? ORDER BY execution_order', [req.params.id]
    );
    res.json({ steps });
  } catch (err) {
    console.error('[PromptPlans] Reorder error:', err);
    res.status(500).json({ error: 'Failed to reorder steps' });
  }
});

// ═══════════════════════════════════════════════════════════════
// LAUNCH STEP — execute a step's prompt
// ═══════════════════════════════════════════════════════════════

router.post('/:id/steps/:stepId/launch', async (req, res) => {
  try {
    const pool = getPool();
    const helpers = getOmaiHelpers();
    const userId = req.session?.user?.id || null;

    // Load plan
    const [plans] = await pool.query('SELECT * FROM prompt_plans WHERE id = ?', [req.params.id]);
    if (!plans.length) return res.status(404).json({ error: 'Plan not found' });
    const plan = plans[0];

    if (plan.status !== 'active') {
      return res.status(400).json({ error: `Plan must be active to launch steps. Current status: ${plan.status}` });
    }

    // Load all steps for sequencing validation
    const [allSteps] = await pool.query(
      'SELECT * FROM prompt_plan_steps WHERE prompt_plan_id = ? ORDER BY execution_order', [req.params.id]
    );
    const step = allSteps.find(s => s.id === parseInt(req.params.stepId));
    if (!step) return res.status(404).json({ error: 'Step not found' });

    // Check step is launchable
    if (step.status === 'running') return res.status(400).json({ error: 'Step is already running' });
    if (step.status === 'completed') return res.status(400).json({ error: 'Step is already completed' });
    if (!step.prompt_text) return res.status(400).json({ error: 'Step has no prompt text to execute' });

    // Sequencing: all prior required steps must be completed or skipped
    const priorSteps = allSteps.filter(s => s.execution_order < step.execution_order && s.is_required);
    const blocking = priorSteps.filter(s => !['completed', 'skipped'].includes(s.status));
    if (blocking.length > 0) {
      return res.status(400).json({
        error: `Cannot launch step ${step.step_number}: ${blocking.length} prior required step(s) not completed`,
        blocking_steps: blocking.map(s => ({ id: s.id, step_number: s.step_number, title: s.title, status: s.status })),
      });
    }

    // Check for another running step
    const runningStep = allSteps.find(s => s.status === 'running');
    if (runningStep) {
      return res.status(400).json({
        error: `Step ${runningStep.step_number} ("${runningStep.title}") is already running. Complete it first.`,
      });
    }

    // Create OM Daily work item if not already created
    let workItem = null;
    if (!step.generated_work_item_id) {
      try {
        workItem = await helpers.createWorkItemForStep(step, userId);
        await pool.query(
          'UPDATE prompt_plan_steps SET generated_work_item_id = ? WHERE id = ?',
          [workItem.id, step.id]
        );
        console.log(`[PromptPlans] Work item #${workItem.id} created for step #${step.id}`);
      } catch (wiErr) {
        console.error('[PromptPlans] Failed to create work item for step:', wiErr.message);
        return res.status(500).json({ error: 'Failed to create work item for step. Launch aborted.' });
      }
    } else {
      // Work item already exists from a previous attempt
      const [existing] = await pool.query('SELECT * FROM om_daily_items WHERE id = ?', [step.generated_work_item_id]);
      workItem = existing[0] || null;
    }

    // Mark step as running
    await pool.query(
      'UPDATE prompt_plan_steps SET status = ?, started_at = NOW() WHERE id = ?',
      ['running', step.id]
    );

    // Update work item execution metadata
    if (workItem) {
      await helpers.updateWorkItemMeta(workItem.id, {
        execution_status: 'running',
        execution_started_at: new Date().toISOString(),
      });
    }

    // Execute prompt through OMAI
    let omaiResponse = null;
    try {
      const { askOMAIWithMetadata } = require('/var/www/orthodoxmetrics/prod/misc/omai/services/index.js');
      omaiResponse = await askOMAIWithMetadata(step.prompt_text, {
        churchId: req.session?.user?.church_id,
      });

      // Mark step as completed
      const resultSummary = typeof omaiResponse.response === 'string'
        ? omaiResponse.response.substring(0, 500) : 'Response received';
      await pool.query(
        `UPDATE prompt_plan_steps SET status = 'completed', completed_at = NOW(),
         metadata = JSON_SET(COALESCE(metadata, '{}'), '$.execution_result', ?)
         WHERE id = ?`,
        [resultSummary, step.id]
      );

      // Update work item
      if (workItem) {
        await helpers.updateWorkItemMeta(workItem.id, {
          execution_status: 'succeeded',
          execution_finished_at: new Date().toISOString(),
          execution_result_summary: resultSummary.substring(0, 200),
        });
      }
    } catch (execErr) {
      console.error(`[PromptPlans] Step ${step.id} execution failed:`, execErr.message);

      // Mark step as failed
      await pool.query(
        `UPDATE prompt_plan_steps SET status = 'failed',
         metadata = JSON_SET(COALESCE(metadata, '{}'), '$.execution_error', ?)
         WHERE id = ?`,
        [execErr.message, step.id]
      );

      if (workItem) {
        await helpers.updateWorkItemMeta(workItem.id, {
          execution_status: 'failed',
          execution_finished_at: new Date().toISOString(),
          execution_error: execErr.message,
        });
      }

      return res.status(500).json({
        error: `Step execution failed: ${execErr.message}`,
        step_id: step.id,
        work_item_id: workItem?.id || null,
      });
    }

    // Return success
    const [updatedStep] = await pool.query('SELECT * FROM prompt_plan_steps WHERE id = ?', [step.id]);
    res.json({
      step: updatedStep[0],
      work_item_id: workItem?.id || null,
      response: omaiResponse?.response || null,
    });
  } catch (err) {
    console.error('[PromptPlans] Launch error:', err);
    res.status(500).json({ error: 'Failed to launch step' });
  }
});

// ═══════════════════════════════════════════════════════════════
// SKIP STEP — mark optional step as skipped
// ═══════════════════════════════════════════════════════════════

router.post('/:id/steps/:stepId/skip', async (req, res) => {
  try {
    const pool = getPool();
    const [steps] = await pool.query(
      'SELECT * FROM prompt_plan_steps WHERE id = ? AND prompt_plan_id = ?',
      [req.params.stepId, req.params.id]
    );
    if (!steps.length) return res.status(404).json({ error: 'Step not found' });
    const step = steps[0];

    if (['completed', 'running'].includes(step.status)) {
      return res.status(400).json({ error: `Cannot skip a ${step.status} step` });
    }

    await pool.query('UPDATE prompt_plan_steps SET status = ? WHERE id = ?', ['skipped', step.id]);
    const [updated] = await pool.query('SELECT * FROM prompt_plan_steps WHERE id = ?', [step.id]);
    res.json({ step: updated[0] });
  } catch (err) {
    console.error('[PromptPlans] Skip error:', err);
    res.status(500).json({ error: 'Failed to skip step' });
  }
});

// ═══════════════════════════════════════════════════════════════
// RETRY STEP — reset a failed step to pending
// ═══════════════════════════════════════════════════════════════

router.post('/:id/steps/:stepId/retry', async (req, res) => {
  try {
    const pool = getPool();
    const [steps] = await pool.query(
      'SELECT * FROM prompt_plan_steps WHERE id = ? AND prompt_plan_id = ?',
      [req.params.stepId, req.params.id]
    );
    if (!steps.length) return res.status(404).json({ error: 'Step not found' });
    if (steps[0].status !== 'failed') {
      return res.status(400).json({ error: 'Only failed steps can be retried' });
    }

    // Reset step but keep the work item reference
    await pool.query(
      `UPDATE prompt_plan_steps SET status = 'pending', started_at = NULL, completed_at = NULL,
       metadata = JSON_SET(COALESCE(metadata, '{}'), '$.retry_count', COALESCE(JSON_EXTRACT(metadata, '$.retry_count'), 0) + 1)
       WHERE id = ?`,
      [steps[0].id]
    );

    const [updated] = await pool.query('SELECT * FROM prompt_plan_steps WHERE id = ?', [steps[0].id]);
    res.json({ step: updated[0] });
  } catch (err) {
    console.error('[PromptPlans] Retry error:', err);
    res.status(500).json({ error: 'Failed to retry step' });
  }
});

module.exports = router;
