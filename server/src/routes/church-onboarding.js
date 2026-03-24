/**
 * Church Onboarding Routes
 * Manages post-creation guided setup checklist for churches.
 * OM Daily #502
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
const { getAppPool } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/churches/:churchId/onboarding - Get onboarding status
router.get('/', async (req, res) => {
  try {
    const pool = getAppPool();
    const churchId = parseInt(req.params.churchId);

    // Get existing tasks for this church
    let [tasks] = await pool.query(
      'SELECT * FROM church_onboarding_tasks WHERE church_id = ? ORDER BY sort_order',
      [churchId]
    );

    // If no tasks exist, initialize from templates
    if (!tasks.length) {
      const [templates] = await pool.query('SELECT * FROM onboarding_task_templates ORDER BY sort_order');
      if (templates.length) {
        const values = templates.map(t =>
          [churchId, t.task_key, t.task_label, t.task_group, t.sort_order, t.is_required]
        );
        await pool.query(
          'INSERT INTO church_onboarding_tasks (church_id, task_key, task_label, task_group, sort_order, is_required) VALUES ?',
          [values]
        );
        [tasks] = await pool.query(
          'SELECT * FROM church_onboarding_tasks WHERE church_id = ? ORDER BY sort_order',
          [churchId]
        );
      }
    }

    const completed = tasks.filter(t => t.completed_at).length;
    const total = tasks.length;
    const required = tasks.filter(t => t.is_required);
    const requiredCompleted = required.filter(t => t.completed_at).length;

    res.json({
      success: true,
      tasks,
      progress: {
        completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        requiredCompleted,
        requiredTotal: required.length,
        allRequiredDone: requiredCompleted >= required.length,
      },
    });
  } catch (error) {
    console.error('[Onboarding] get error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/churches/:churchId/onboarding/:taskKey/complete - Mark task complete
router.post('/:taskKey/complete', async (req, res) => {
  try {
    const pool = getAppPool();
    const churchId = parseInt(req.params.churchId);
    const { taskKey } = req.params;
    const userId = req.user?.id || req.session?.user?.id;

    const [result] = await pool.query(
      'UPDATE church_onboarding_tasks SET completed_at = NOW(), completed_by = ? WHERE church_id = ? AND task_key = ? AND completed_at IS NULL',
      [userId, churchId, taskKey]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Task not found or already completed' });
    }

    res.json({ success: true, message: `Task '${taskKey}' marked as completed` });
  } catch (error) {
    console.error('[Onboarding] complete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/churches/:churchId/onboarding/:taskKey/uncomplete - Revert task
router.post('/:taskKey/uncomplete', requireRole(['admin', 'super_admin', 'church_admin']), async (req, res) => {
  try {
    const pool = getAppPool();
    const churchId = parseInt(req.params.churchId);
    const { taskKey } = req.params;

    await pool.query(
      'UPDATE church_onboarding_tasks SET completed_at = NULL, completed_by = NULL WHERE church_id = ? AND task_key = ?',
      [churchId, taskKey]
    );

    res.json({ success: true, message: `Task '${taskKey}' reverted` });
  } catch (error) {
    console.error('[Onboarding] uncomplete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/churches/:churchId/onboarding/reset - Reset all tasks (admin only)
router.post('/reset', requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const pool = getAppPool();
    const churchId = parseInt(req.params.churchId);

    await pool.query('DELETE FROM church_onboarding_tasks WHERE church_id = ?', [churchId]);

    res.json({ success: true, message: 'Onboarding tasks reset' });
  } catch (error) {
    console.error('[Onboarding] reset error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
