/**
 * Jurisdictions API Routes
 * Reference table for Orthodox church jurisdictions/denominations
 *
 * Mounted at /api/jurisdictions
 */

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

const requireAdmin = requireRole(['admin', 'super_admin']);

function getPool() {
  return require('../config/db').promisePool;
}

// ═══════════════════════════════════════════════════════════════
// LIST — all active jurisdictions (public for dropdown population)
// ═══════════════════════════════════════════════════════════════

router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const showInactive = req.query.include_inactive === 'true';
    const where = showInactive ? '' : 'WHERE is_active = TRUE';

    const [rows] = await pool.query(
      `SELECT id, name, abbreviation, calendar_type, parent_church, country,
              canonical_territory, is_active, sort_order, created_at, updated_at
       FROM jurisdictions
       ${where}
       ORDER BY sort_order ASC, name ASC`
    );

    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('Failed to list jurisdictions:', err);
    res.status(500).json({ error: 'Failed to list jurisdictions' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET ONE — single jurisdiction by ID
// ═══════════════════════════════════════════════════════════════

router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, name, abbreviation, calendar_type, parent_church, country,
              canonical_territory, is_active, sort_order, created_at, updated_at
       FROM jurisdictions WHERE id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Jurisdiction not found' });
    }

    res.json({ jurisdiction: rows[0] });
  } catch (err) {
    console.error('Failed to get jurisdiction:', err);
    res.status(500).json({ error: 'Failed to get jurisdiction' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CREATE — new jurisdiction (admin only)
// ═══════════════════════════════════════════════════════════════

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const { name, abbreviation, calendar_type, parent_church, country, canonical_territory, sort_order } = req.body;

    if (!name || !abbreviation) {
      return res.status(400).json({ error: 'Name and abbreviation are required' });
    }

    const validCalendarTypes = ['Julian', 'Revised Julian'];
    const calType = validCalendarTypes.includes(calendar_type) ? calendar_type : 'Revised Julian';

    const [result] = await pool.query(
      `INSERT INTO jurisdictions (name, abbreviation, calendar_type, parent_church, country, canonical_territory, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), abbreviation.trim(), calType, parent_church || null, country || null, canonical_territory || null, sort_order || 0]
    );

    const [rows] = await pool.query('SELECT * FROM jurisdictions WHERE id = ?', [result.insertId]);
    res.status(201).json({ jurisdiction: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A jurisdiction with that abbreviation already exists' });
    }
    console.error('Failed to create jurisdiction:', err);
    res.status(500).json({ error: 'Failed to create jurisdiction' });
  }
});

// ═══════════════════════════════════════════════════════════════
// UPDATE — modify jurisdiction (admin only)
// ═══════════════════════════════════════════════════════════════

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getPool();
    const { name, abbreviation, calendar_type, parent_church, country, canonical_territory, is_active, sort_order } = req.body;

    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
    if (abbreviation !== undefined) { fields.push('abbreviation = ?'); values.push(abbreviation.trim()); }
    if (calendar_type !== undefined && ['Julian', 'Revised Julian'].includes(calendar_type)) {
      fields.push('calendar_type = ?'); values.push(calendar_type);
    }
    if (parent_church !== undefined) { fields.push('parent_church = ?'); values.push(parent_church || null); }
    if (country !== undefined) { fields.push('country = ?'); values.push(country || null); }
    if (canonical_territory !== undefined) { fields.push('canonical_territory = ?'); values.push(canonical_territory || null); }
    if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);
    await pool.query(`UPDATE jurisdictions SET ${fields.join(', ')} WHERE id = ?`, values);

    const [rows] = await pool.query('SELECT * FROM jurisdictions WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Jurisdiction not found' });
    }

    res.json({ jurisdiction: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A jurisdiction with that abbreviation already exists' });
    }
    console.error('Failed to update jurisdiction:', err);
    res.status(500).json({ error: 'Failed to update jurisdiction' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DELETE — soft-delete jurisdiction (admin only)
// ═══════════════════════════════════════════════════════════════

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getPool();

    // Check if any churches reference this jurisdiction
    const [refs] = await pool.query(
      'SELECT COUNT(*) as count FROM churches WHERE jurisdiction_id = ?',
      [req.params.id]
    );
    const [crmRefs] = await pool.query(
      'SELECT COUNT(*) as count FROM us_churches WHERE jurisdiction_id = ?',
      [req.params.id]
    );

    const totalRefs = refs[0].count + crmRefs[0].count;

    // Soft-delete (set inactive) rather than hard delete
    await pool.query('UPDATE jurisdictions SET is_active = FALSE WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: totalRefs > 0
        ? `Jurisdiction deactivated (still referenced by ${totalRefs} church${totalRefs > 1 ? 'es' : ''})`
        : 'Jurisdiction deactivated',
    });
  } catch (err) {
    console.error('Failed to delete jurisdiction:', err);
    res.status(500).json({ error: 'Failed to delete jurisdiction' });
  }
});

module.exports = router;
