// server/src/routes/tutorials.js - Tutorial / Welcome system API
const express = require('express');
const router = express.Router();
const { getAppPool } = require('../config/db');

// Role-to-audience mapping
function getAudiencesForRole(role) {
  const map = {
    super_admin: ['all', 'administrators'],
    admin: ['all', 'administrators'],
    church_admin: ['all', 'administrators', 'existing_clients'],
    priest: ['all', 'priests', 'existing_clients'],
    deacon: ['all', 'existing_clients'],
    editor: ['all', 'editors', 'existing_clients'],
    viewer: ['all', 'new_clients'],
    guest: ['all', 'new_clients'],
  };
  return map[role] || ['all'];
}

// Middleware: require super_admin
function requireSuperAdmin(req, res, next) {
  if (req.session?.user?.role !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Super admin access required' });
  }
  next();
}

// ─── Public (authenticated) endpoints ────────────────────────────────

// GET /api/tutorials/pending - undismissed tutorials for current user
router.get('/pending', async (req, res) => {
  try {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const audiences = getAudiencesForRole(user.role);
    const placeholders = audiences.map(() => '?').join(',');

    const pool = getAppPool();
    const [rows] = await pool.query(
      `SELECT t.id, t.title, t.description, t.audience, t.is_welcome, t.sort_order,
              ts.id AS step_id, ts.step_order, ts.title AS step_title, ts.content, ts.image_url
       FROM tutorials t
       JOIN tutorial_steps ts ON ts.tutorial_id = t.id
       WHERE t.is_active = 1
         AND t.audience IN (${placeholders})
         AND t.id NOT IN (SELECT tutorial_id FROM tutorial_dismissals WHERE user_id = ?)
       ORDER BY t.is_welcome DESC, t.sort_order ASC, ts.step_order ASC`,
      [...audiences, user.id]
    );

    // Group steps by tutorial
    const tutorialsMap = new Map();
    for (const row of rows) {
      if (!tutorialsMap.has(row.id)) {
        tutorialsMap.set(row.id, {
          id: row.id,
          title: row.title,
          description: row.description,
          audience: row.audience,
          is_welcome: !!row.is_welcome,
          sort_order: row.sort_order,
          steps: [],
        });
      }
      tutorialsMap.get(row.id).steps.push({
        id: row.step_id,
        step_order: row.step_order,
        title: row.step_title,
        content: row.content,
        image_url: row.image_url,
      });
    }

    res.json({ success: true, tutorials: Array.from(tutorialsMap.values()) });
  } catch (err) {
    console.error('Error fetching pending tutorials:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch tutorials' });
  }
});

// POST /api/tutorials/:id/dismiss - mark tutorial as seen
router.post('/:id/dismiss', async (req, res) => {
  try {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const pool = getAppPool();
    await pool.query(
      'INSERT IGNORE INTO tutorial_dismissals (user_id, tutorial_id) VALUES (?, ?)',
      [user.id, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error dismissing tutorial:', err);
    res.status(500).json({ success: false, error: 'Failed to dismiss tutorial' });
  }
});

// ─── Super admin endpoints ───────────────────────────────────────────

// GET /api/tutorials - list all tutorials (admin)
router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    const [tutorials] = await pool.query(
      `SELECT t.*, COUNT(ts.id) AS step_count
       FROM tutorials t
       LEFT JOIN tutorial_steps ts ON ts.tutorial_id = t.id
       GROUP BY t.id
       ORDER BY t.sort_order ASC, t.created_at DESC`
    );

    res.json({ success: true, tutorials });
  } catch (err) {
    console.error('Error listing tutorials:', err);
    res.status(500).json({ success: false, error: 'Failed to list tutorials' });
  }
});

// GET /api/tutorials/:id - get single tutorial with steps (admin)
router.get('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    const [tutorials] = await pool.query('SELECT * FROM tutorials WHERE id = ?', [req.params.id]);
    if (tutorials.length === 0) {
      return res.status(404).json({ success: false, error: 'Tutorial not found' });
    }

    const [steps] = await pool.query(
      'SELECT * FROM tutorial_steps WHERE tutorial_id = ? ORDER BY step_order ASC',
      [req.params.id]
    );

    res.json({ success: true, tutorial: { ...tutorials[0], steps } });
  } catch (err) {
    console.error('Error fetching tutorial:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch tutorial' });
  }
});

// POST /api/tutorials - create tutorial with steps (admin)
router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const { title, description, audience, is_welcome, is_active, sort_order, steps } = req.body;
    const user = req.session.user;
    const pool = getAppPool();

    // If marking as welcome, unset other welcome tutorials
    if (is_welcome) {
      await pool.query('UPDATE tutorials SET is_welcome = 0 WHERE is_welcome = 1');
    }

    const [result] = await pool.query(
      'INSERT INTO tutorials (title, description, audience, is_welcome, is_active, sort_order, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description || null, audience || 'all', is_welcome ? 1 : 0, is_active !== false ? 1 : 0, sort_order || 0, user.id]
    );

    const tutorialId = result.insertId;

    // Insert steps
    if (steps && steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await pool.query(
          'INSERT INTO tutorial_steps (tutorial_id, step_order, title, content, image_url) VALUES (?, ?, ?, ?, ?)',
          [tutorialId, i, step.title || null, step.content, step.image_url || null]
        );
      }
    }

    res.json({ success: true, id: tutorialId });
  } catch (err) {
    console.error('Error creating tutorial:', err);
    res.status(500).json({ success: false, error: 'Failed to create tutorial' });
  }
});

// PUT /api/tutorials/:id - update tutorial and steps (admin)
router.put('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { title, description, audience, is_welcome, is_active, sort_order, steps } = req.body;
    const pool = getAppPool();

    // If marking as welcome, unset other welcome tutorials
    if (is_welcome) {
      await pool.query('UPDATE tutorials SET is_welcome = 0 WHERE is_welcome = 1 AND id != ?', [req.params.id]);
    }

    await pool.query(
      'UPDATE tutorials SET title = ?, description = ?, audience = ?, is_welcome = ?, is_active = ?, sort_order = ? WHERE id = ?',
      [title, description || null, audience || 'all', is_welcome ? 1 : 0, is_active ? 1 : 0, sort_order || 0, req.params.id]
    );

    // Replace all steps
    if (steps) {
      await pool.query('DELETE FROM tutorial_steps WHERE tutorial_id = ?', [req.params.id]);
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await pool.query(
          'INSERT INTO tutorial_steps (tutorial_id, step_order, title, content, image_url) VALUES (?, ?, ?, ?, ?)',
          [req.params.id, i, step.title || null, step.content, step.image_url || null]
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating tutorial:', err);
    res.status(500).json({ success: false, error: 'Failed to update tutorial' });
  }
});

// DELETE /api/tutorials/:id - delete tutorial (admin)
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    // Cascade deletes steps; also clean up dismissals
    await pool.query('DELETE FROM tutorial_dismissals WHERE tutorial_id = ?', [req.params.id]);
    await pool.query('DELETE FROM tutorials WHERE id = ?', [req.params.id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting tutorial:', err);
    res.status(500).json({ success: false, error: 'Failed to delete tutorial' });
  }
});

module.exports = router;
