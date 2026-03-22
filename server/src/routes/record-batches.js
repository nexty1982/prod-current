/**
 * Record Batches API — Lifecycle tracking for parish record ingestion
 * Mounted at /api/record-batches
 */

const express = require('express');
const router = express.Router();
const { getAppPool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const ADMIN_ROLES = ['super_admin', 'admin'];

// GET /api/record-batches/summary — Aggregated counts by status
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const churchId = user.active_church_id || user.church_id;

    let query, params;
    if (ADMIN_ROLES.includes(user.role) && !churchId) {
      query = `SELECT status, COUNT(*) as count FROM record_batches GROUP BY status`;
      params = [];
    } else {
      query = `SELECT status, COUNT(*) as count FROM record_batches WHERE church_id = ? GROUP BY status`;
      params = [churchId];
    }

    const [rows] = await getAppPool().query(query, params);
    const summary = { uploaded: 0, processing: 0, admin_review: 0, approved: 0, published: 0, total: 0 };
    for (const row of rows) {
      if (summary.hasOwnProperty(row.status)) {
        summary[row.status] = row.count;
      }
      summary.total += row.count;
    }

    res.json(summary);
  } catch (err) {
    console.error('[record-batches] GET /summary error:', err.message);
    res.json({ uploaded: 0, processing: 0, admin_review: 0, approved: 0, published: 0, total: 0 });
  }
});

// GET /api/record-batches — List batches
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const churchId = user.active_church_id || user.church_id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    let query, params;
    if (ADMIN_ROLES.includes(user.role) && !churchId) {
      query = `SELECT * FROM record_batches ORDER BY uploaded_at DESC LIMIT ?`;
      params = [limit];
    } else {
      query = `SELECT * FROM record_batches WHERE church_id = ? ORDER BY uploaded_at DESC LIMIT ?`;
      params = [churchId, limit];
    }

    const [rows] = await getAppPool().query(query, params);
    res.json({ batches: rows });
  } catch (err) {
    console.error('[record-batches] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to list batches' });
  }
});

// GET /api/record-batches/:id — Single batch
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await getAppPool().query(
      'SELECT * FROM record_batches WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Batch not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[record-batches] GET /:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch batch' });
  }
});

// POST /api/record-batches — Create new batch
router.post('/', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { church_id, batch_label, notes } = req.body;
    const cid = church_id || user.active_church_id || user.church_id;

    if (!cid) return res.status(400).json({ error: 'church_id required' });

    const [result] = await getAppPool().query(
      `INSERT INTO record_batches (church_id, uploaded_by, batch_label, notes) VALUES (?, ?, ?, ?)`,
      [cid, user.id, batch_label || null, notes || null]
    );

    res.status(201).json({ id: result.insertId, status: 'uploaded' });
  } catch (err) {
    console.error('[record-batches] POST / error:', err.message);
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

// PUT /api/record-batches/:id/status — Update batch status
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { status } = req.body;
    const validStatuses = ['uploaded', 'processing', 'admin_review', 'approved', 'published'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Only admins can transition to admin_review, approved, or published
    const adminOnlyStatuses = ['admin_review', 'approved', 'published'];
    if (adminOnlyStatuses.includes(status) && !ADMIN_ROLES.includes(user.role)) {
      return res.status(403).json({ error: 'Only admins can set this status' });
    }

    // Set corresponding timestamp
    const timestampMap = {
      processing: 'processing_started_at',
      admin_review: 'processing_completed_at',
      approved: 'admin_review_completed_at',
      published: 'published_at',
    };
    const tsCol = timestampMap[status];
    const tsClause = tsCol ? `, ${tsCol} = NOW()` : '';

    await getAppPool().query(
      `UPDATE record_batches SET status = ?${tsClause} WHERE id = ?`,
      [status, req.params.id]
    );

    res.json({ success: true, status });
  } catch (err) {
    console.error('[record-batches] PUT /:id/status error:', err.message);
    res.status(500).json({ error: 'Failed to update batch status' });
  }
});

module.exports = router;
