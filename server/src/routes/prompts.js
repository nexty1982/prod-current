/**
 * Prompt Registry API Routes
 *
 * CRUD + state transitions for om_prompt_registry.
 * Consumed by OMAI admin/prompts page.
 *
 * Mounted at /api/prompts
 */

const express = require('express');
const crypto = require('crypto');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

function getPool() {
  return require('../config/db').promisePool;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateId() {
  return `PR-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
}

function ok(res, data, message) {
  res.json({ success: true, data, message: message || 'OK' });
}

function fail(res, status, message) {
  res.status(status).json({ success: false, error: message });
}

// Valid status transitions
const VALID_TRANSITIONS = {
  draft:     ['audited', 'rejected'],
  audited:   ['ready', 'rejected'],
  ready:     ['approved', 'rejected'],
  approved:  ['executing', 'rejected'],
  executing: ['complete', 'rejected'],
  complete:  ['verified', 'rejected'],
  verified:  [],
  rejected:  ['draft'],
};

// ── GET /prompts — List prompts ─────────────────────────────────────────────

router.get('/', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const { status, component, queue_status } = req.query;
    let sql = 'SELECT * FROM om_prompt_registry';
    const params = [];
    const conditions = [];

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }
    if (component) {
      conditions.push('component = ?');
      params.push(component);
    }
    if (queue_status) {
      conditions.push('queue_status = ?');
      params.push(queue_status);
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY sequence_order ASC, created_at DESC';

    const [rows] = await pool.query(sql, params);
    ok(res, rows);
  } catch (err) {
    console.error('[Prompts] List error:', err.message);
    fail(res, 500, err.message);
  }
});

// ── GET /prompts/queue — Queue view ─────────────────────────────────────────

router.get('/queue', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const { queue_status } = req.query;
    let sql = 'SELECT * FROM om_prompt_registry WHERE queue_status != ?';
    const params = ['released'];

    if (queue_status) {
      sql = 'SELECT * FROM om_prompt_registry WHERE queue_status = ?';
      params[0] = queue_status;
    }

    sql += ' ORDER BY priority DESC, sequence_order ASC';
    const [rows] = await pool.query(sql, params);
    ok(res, rows);
  } catch (err) {
    fail(res, 500, err.message);
  }
});

// ── GET /prompts/next-ready — Next ready prompts ────────────────────────────

router.get('/next-ready', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const limit = parseInt(req.query.limit) || 10;
    const [rows] = await pool.query(
      `SELECT * FROM om_prompt_registry
       WHERE status IN ('ready', 'approved') AND released_for_execution = 0
       ORDER BY priority DESC, sequence_order ASC
       LIMIT ?`,
      [limit]
    );
    ok(res, rows);
  } catch (err) {
    fail(res, 500, err.message);
  }
});

// ── GET /prompts/blocked — Blocked prompts ──────────────────────────────────

router.get('/blocked', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM om_prompt_registry
       WHERE queue_status = 'blocked'
       ORDER BY priority DESC, created_at ASC`
    );
    ok(res, rows);
  } catch (err) {
    fail(res, 500, err.message);
  }
});

// ── GET /prompts/due — Due prompts ──────────────────────────────────────────

router.get('/due', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM om_prompt_registry
       WHERE scheduled_at IS NOT NULL AND scheduled_at <= NOW()
         AND status NOT IN ('complete', 'verified', 'rejected')
       ORDER BY scheduled_at ASC`
    );
    ok(res, rows);
  } catch (err) {
    fail(res, 500, err.message);
  }
});

// ── GET /prompts/overdue — Overdue prompts ──────────────────────────────────

router.get('/overdue', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM om_prompt_registry
       WHERE overdue = 1
       ORDER BY overdue_since ASC`
    );
    ok(res, rows);
  } catch (err) {
    fail(res, 500, err.message);
  }
});

// ── GET /prompts/escalated — Escalated prompts ──────────────────────────────

router.get('/escalated', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM om_prompt_registry
       WHERE escalation_required = 1
       ORDER BY priority DESC, created_at ASC`
    );
    ok(res, rows);
  } catch (err) {
    fail(res, 500, err.message);
  }
});

// ── GET /prompts/degraded — Degraded prompts ────────────────────────────────

router.get('/degraded', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM om_prompt_registry
       WHERE degradation_flag = 1
       ORDER BY quality_score ASC`
    );
    ok(res, rows);
  } catch (err) {
    fail(res, 500, err.message);
  }
});

// ── GET /prompts/low-confidence — Low confidence prompts ────────────────────

router.get('/low-confidence', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM om_prompt_registry
       WHERE confidence_level IN ('low', 'unknown')
       ORDER BY quality_score ASC`
    );
    ok(res, rows);
  } catch (err) {
    fail(res, 500, err.message);
  }
});

// ── GET /prompts/:id — Get single prompt ────────────────────────────────────

router.get('/:id', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [req.params.id]);
    if (!rows.length) return fail(res, 404, 'Prompt not found');
    ok(res, rows[0]);
  } catch (err) {
    fail(res, 500, err.message);
  }
});

// ── POST /prompts — Create prompt ───────────────────────────────────────────

router.post('/', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const id = generateId();
    const {
      title, purpose, component, sequence_order = 0,
      prompt_text, guardrails_applied = true, parent_prompt_id = null,
    } = req.body;

    if (!title) return fail(res, 400, 'Title is required');

    await pool.query(
      `INSERT INTO om_prompt_registry
         (id, created_by, title, purpose, component, parent_prompt_id,
          sequence_order, prompt_text, guardrails_applied)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.session?.user?.email || 'unknown', title, purpose || '',
       component || null, parent_prompt_id,
       sequence_order, prompt_text || '', guardrails_applied ? 1 : 0]
    );

    const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [id]);
    ok(res, rows[0], 'Prompt created');
  } catch (err) {
    console.error('[Prompts] Create error:', err.message);
    fail(res, 500, err.message);
  }
});

// ── POST /prompts/:id/audit — Run audit ─────────────────────────────────────

router.post('/:id/audit', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [req.params.id]);
    if (!rows.length) return fail(res, 404, 'Prompt not found');

    const prompt = rows[0];
    if (prompt.status !== 'draft') {
      return fail(res, 400, `Cannot audit prompt in "${prompt.status}" status`);
    }

    // Run basic audit checks
    const checks = [];
    const hasTitle = !!prompt.title && prompt.title.trim().length > 0;
    const hasText = !!prompt.prompt_text && prompt.prompt_text.trim().length > 10;
    const hasGuardrails = !!prompt.guardrails_applied;

    checks.push({ check: 'has_title', pass: hasTitle, detail: hasTitle ? 'Title present' : 'Missing title' });
    checks.push({ check: 'has_prompt_text', pass: hasText, detail: hasText ? 'Prompt text adequate' : 'Prompt text too short or missing' });
    checks.push({ check: 'guardrails_applied', pass: hasGuardrails, detail: hasGuardrails ? 'Guardrails enabled' : 'Guardrails not applied' });

    const allPass = checks.every(c => c.pass);
    const auditStatus = allPass ? 'pass' : 'fail';
    const now = new Date();
    const auditor = req.session?.user?.email || 'system';

    await pool.query(
      `UPDATE om_prompt_registry
       SET audit_status = ?, audit_result = ?, audited_at = ?, audited_by = ?,
           status = CASE WHEN ? = 'pass' THEN 'audited' ELSE status END
       WHERE id = ?`,
      [auditStatus, JSON.stringify(checks), now, auditor, auditStatus, req.params.id]
    );

    const [updated] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [req.params.id]);
    ok(res, {
      prompt: updated[0],
      audit: { status: auditStatus, checks, audited_at: now, audited_by: auditor },
    });
  } catch (err) {
    console.error('[Prompts] Audit error:', err.message);
    fail(res, 500, err.message);
  }
});

// ── POST /prompts/:id/evaluate — Evaluate completed prompt ──────────────────

router.post('/:id/evaluate', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [req.params.id]);
    if (!rows.length) return fail(res, 404, 'Prompt not found');

    const prompt = rows[0];
    if (prompt.status !== 'complete') {
      return fail(res, 400, `Cannot evaluate prompt in "${prompt.status}" status — must be "complete"`);
    }

    const now = new Date();
    const evaluator = req.session?.user?.email || 'system';

    // Basic evaluation: check execution_result
    const hasResult = !!prompt.execution_result;
    const evalStatus = hasResult ? 'pass' : 'fail';

    await pool.query(
      `UPDATE om_prompt_registry
       SET evaluator_status = ?, evaluator_notes = ?,
           evaluated_at = ?, evaluated_by = ?,
           completion_status = ?, quality_score = ?
       WHERE id = ?`,
      [evalStatus, hasResult ? 'Execution result recorded' : 'No execution result found',
       now, evaluator,
       hasResult ? 'success' : 'incomplete',
       hasResult ? 80 : 30,
       req.params.id]
    );

    const [updated] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [req.params.id]);
    ok(res, updated[0]);
  } catch (err) {
    fail(res, 500, err.message);
  }
});

// ── GET /prompts/:id/evaluation — Get evaluation data ───────────────────────

router.get('/:id/evaluation', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT evaluator_status, evaluator_notes, evaluated_at, evaluated_by,
              completion_status, quality_score, issues_found, blockers_found,
              violations_found, completed_outcomes, remaining_outcomes, changed_files,
              violation_count, issue_count, blocker_count
       FROM om_prompt_registry WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) return fail(res, 404, 'Prompt not found');
    ok(res, rows[0]);
  } catch (err) {
    fail(res, 500, err.message);
  }
});

// ── POST /prompts/:id/generate-next — Generate next prompt ──────────────────

router.post('/:id/generate-next', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [req.params.id]);
    if (!rows.length) return fail(res, 404, 'Prompt not found');

    const prompt = rows[0];
    if (!['complete', 'verified'].includes(prompt.status)) {
      return fail(res, 400, `Cannot generate next from "${prompt.status}" — must be complete or verified`);
    }

    // Generate a successor prompt
    const nextId = generateId();
    const nextOrder = (prompt.sequence_order || 0) + 1;
    const actor = req.session?.user?.email || 'system';

    await pool.query(
      `INSERT INTO om_prompt_registry
         (id, created_by, title, purpose, component, parent_prompt_id,
          sequence_order, prompt_text, guardrails_applied,
          auto_generated, generated_from_evaluation, dependency_type, depends_on_prompt_id,
          chain_id, chain_step_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, '', 1, 1, 1, 'sequence', ?, ?, ?)`,
      [nextId, actor,
       `Follow-up to: ${prompt.title}`,
       `Continue from prompt ${prompt.id}`,
       prompt.component,
       prompt.id,
       nextOrder,
       prompt.id,
       prompt.chain_id || prompt.id,
       (prompt.chain_step_number || 0) + 1]
    );

    // Link parent → next
    await pool.query(
      'UPDATE om_prompt_registry SET next_prompt_id = ? WHERE id = ?',
      [nextId, prompt.id]
    );

    const [updated] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [req.params.id]);
    ok(res, updated[0], 'Next prompt generated');
  } catch (err) {
    fail(res, 500, err.message);
  }
});

// ── POST /prompts/:id/release-next — Release next prompt ────────────────────

router.post('/:id/release-next', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [req.params.id]);
    if (!rows.length) return fail(res, 404, 'Prompt not found');

    const prompt = rows[0];
    if (!prompt.next_prompt_id) {
      return fail(res, 400, 'No next prompt to release — generate one first');
    }

    await pool.query(
      `UPDATE om_prompt_registry SET released_for_execution = 1, queue_status = 'ready_for_release'
       WHERE id = ?`,
      [prompt.next_prompt_id]
    );

    const [updated] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [req.params.id]);
    ok(res, updated[0], 'Next prompt released');
  } catch (err) {
    fail(res, 500, err.message);
  }
});

// ── POST /prompts/:id/schedule — Schedule prompt ────────────────────────────

router.post('/:id/schedule', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const {
      scheduled_at, release_window_start, release_window_end,
      priority, release_mode, dependency_type, depends_on_prompt_id,
    } = req.body;

    const updates = [];
    const params = [];

    if (scheduled_at !== undefined)       { updates.push('scheduled_at = ?'); params.push(scheduled_at || null); }
    if (release_window_start !== undefined){ updates.push('release_window_start = ?'); params.push(release_window_start || null); }
    if (release_window_end !== undefined)  { updates.push('release_window_end = ?'); params.push(release_window_end || null); }
    if (priority)                          { updates.push('priority = ?'); params.push(priority); }
    if (release_mode)                      { updates.push('release_mode = ?'); params.push(release_mode); }
    if (dependency_type)                   { updates.push('dependency_type = ?'); params.push(dependency_type); }
    if (depends_on_prompt_id !== undefined) { updates.push('depends_on_prompt_id = ?'); params.push(depends_on_prompt_id || null); }

    updates.push("queue_status = 'scheduled'");

    if (!updates.length) return fail(res, 400, 'No fields to update');

    params.push(req.params.id);
    await pool.query(`UPDATE om_prompt_registry SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [req.params.id]);
    if (!updated.length) return fail(res, 404, 'Prompt not found');
    ok(res, updated[0], 'Prompt scheduled');
  } catch (err) {
    fail(res, 500, err.message);
  }
});

// ── POST /prompts/:id/release — Release for execution ───────────────────────

router.post('/:id/release', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [req.params.id]);
    if (!rows.length) return fail(res, 404, 'Prompt not found');

    const prompt = rows[0];
    if (!['ready', 'approved'].includes(prompt.status)) {
      return fail(res, 400, `Cannot release prompt in "${prompt.status}" status`);
    }

    await pool.query(
      `UPDATE om_prompt_registry
       SET released_for_execution = 1, queue_status = 'released',
           last_release_attempt_at = NOW()
       WHERE id = ?`,
      [req.params.id]
    );

    const [updated] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [req.params.id]);
    ok(res, updated[0], 'Prompt released for execution');
  } catch (err) {
    fail(res, 500, err.message);
  }
});

// ── POST /prompts/:id/:action — Generic state transitions ──────────────────

router.post('/:id/:action', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const pool = getPool();
    const { id, action } = req.params;

    const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [id]);
    if (!rows.length) return fail(res, 404, 'Prompt not found');

    const prompt = rows[0];
    let newStatus;
    const extraUpdates = [];
    const extraParams = [];

    switch (action) {
      case 'ready':
        newStatus = 'ready';
        break;
      case 'approve':
        newStatus = 'approved';
        break;
      case 'execute':
        newStatus = 'executing';
        break;
      case 'complete':
        newStatus = 'complete';
        if (req.body.execution_result) {
          extraUpdates.push('execution_result = ?');
          extraParams.push(typeof req.body.execution_result === 'string'
            ? req.body.execution_result
            : JSON.stringify(req.body.execution_result));
        }
        break;
      case 'verify':
        newStatus = 'verified';
        if (req.body.notes) {
          extraUpdates.push('verification_result = ?');
          extraParams.push(JSON.stringify(req.body));
        }
        break;
      case 'reject':
        newStatus = 'rejected';
        if (req.body.reason) {
          extraUpdates.push('audit_notes = ?');
          extraParams.push(req.body.reason);
        }
        break;
      default:
        return fail(res, 400, `Unknown action: ${action}`);
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[prompt.status];
    if (allowed && !allowed.includes(newStatus)) {
      return fail(res, 400, `Cannot transition from "${prompt.status}" to "${newStatus}"`);
    }

    let sql = 'UPDATE om_prompt_registry SET status = ?';
    const params = [newStatus];

    if (extraUpdates.length) {
      sql += ', ' + extraUpdates.join(', ');
      params.push(...extraParams);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    await pool.query(sql, params);

    const [updated] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [id]);
    ok(res, updated[0], `Prompt ${action} successful`);
  } catch (err) {
    console.error(`[Prompts] Action ${req.params.action} error:`, err.message);
    fail(res, 500, err.message);
  }
});

module.exports = router;
