/**
 * Badge States API — metadata-driven menu/component state badges
 *
 * Manages NEW and Recently Updated badge lifecycle with auto-expiration
 * and manual acknowledgment support.
 *
 * Routes:
 *   GET    /api/badges              — list all badge states (public, used by sidebar)
 *   PUT    /api/badges/:itemKey     — create or update a badge state
 *   POST   /api/badges/:itemKey/acknowledge — acknowledge (suppress) a badge
 *   POST   /api/badges/:itemKey/reset       — reset badge to active state
 *   DELETE /api/badges/:itemKey     — remove a badge entry
 */

const express = require('express');
const router = express.Router();
const { getAppPool } = require('../config/db');

// Default durations (days)
const DEFAULT_DURATIONS = { new: 14, recently_updated: 7 };

/**
 * GET /api/badges — list all active badge states
 * Returns resolved states with computed expiration where needed.
 */
router.get('/', async (req, res) => {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query(
      'SELECT * FROM badge_states ORDER BY item_key'
    );

    const resolved = rows.map(row => resolveRow(row));
    res.json({ badges: resolved });
  } catch (err) {
    console.error('[badges] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch badge states' });
  }
});

/**
 * PUT /api/badges/:itemKey — create or update badge state
 */
router.put('/:itemKey', async (req, res) => {
  try {
    const { itemKey } = req.params;
    const {
      badge_state = 'new',
      badge_started_at,
      badge_expires_at,
      badge_duration_days,
      badge_mode = 'auto',
    } = req.body;

    if (!['new', 'recently_updated', 'none'].includes(badge_state)) {
      return res.status(400).json({ error: 'Invalid badge_state. Must be: new, recently_updated, none' });
    }

    const startedAt = badge_started_at ? new Date(badge_started_at) : new Date();
    const expiresAt = badge_expires_at ? new Date(badge_expires_at) : null;
    const pool = getAppPool();

    await pool.query(
      `INSERT INTO badge_states (item_key, badge_state, badge_started_at, badge_expires_at, badge_duration_days, badge_mode)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         badge_state = VALUES(badge_state),
         badge_started_at = VALUES(badge_started_at),
         badge_expires_at = VALUES(badge_expires_at),
         badge_duration_days = VALUES(badge_duration_days),
         badge_mode = VALUES(badge_mode),
         badge_acknowledged_at = NULL,
         badge_acknowledged_by = NULL`,
      [itemKey, badge_state, startedAt, expiresAt, badge_duration_days || null, badge_mode]
    );

    const [rows] = await pool.query('SELECT * FROM badge_states WHERE item_key = ?', [itemKey]);
    res.json({ badge: resolveRow(rows[0]) });
  } catch (err) {
    console.error('[badges] PUT /:itemKey error:', err.message);
    res.status(500).json({ error: 'Failed to update badge state' });
  }
});

/**
 * POST /api/badges/:itemKey/acknowledge — suppress a badge
 */
router.post('/:itemKey/acknowledge', async (req, res) => {
  try {
    const { itemKey } = req.params;
    const acknowledgedBy = req.body.acknowledged_by || req.session?.user?.email || 'system';
    const pool = getAppPool();

    const [result] = await pool.query(
      `UPDATE badge_states
       SET badge_mode = 'acknowledged',
           badge_acknowledged_at = NOW(),
           badge_acknowledged_by = ?
       WHERE item_key = ?`,
      [acknowledgedBy, itemKey]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Badge not found' });
    }

    const [rows] = await pool.query('SELECT * FROM badge_states WHERE item_key = ?', [itemKey]);
    res.json({ badge: resolveRow(rows[0]) });
  } catch (err) {
    console.error('[badges] POST /:itemKey/acknowledge error:', err.message);
    res.status(500).json({ error: 'Failed to acknowledge badge' });
  }
});

/**
 * POST /api/badges/:itemKey/reset — restart badge lifecycle
 */
router.post('/:itemKey/reset', async (req, res) => {
  try {
    const { itemKey } = req.params;
    const { badge_state = 'new', badge_duration_days } = req.body;
    const pool = getAppPool();

    const [result] = await pool.query(
      `UPDATE badge_states
       SET badge_state = ?,
           badge_started_at = NOW(),
           badge_expires_at = NULL,
           badge_duration_days = ?,
           badge_mode = 'auto',
           badge_acknowledged_at = NULL,
           badge_acknowledged_by = NULL
       WHERE item_key = ?`,
      [badge_state, badge_duration_days || null, itemKey]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Badge not found' });
    }

    const [rows] = await pool.query('SELECT * FROM badge_states WHERE item_key = ?', [itemKey]);
    res.json({ badge: resolveRow(rows[0]) });
  } catch (err) {
    console.error('[badges] POST /:itemKey/reset error:', err.message);
    res.status(500).json({ error: 'Failed to reset badge' });
  }
});

/**
 * DELETE /api/badges/:itemKey — remove badge entry
 */
router.delete('/:itemKey', async (req, res) => {
  try {
    const { itemKey } = req.params;
    const pool = getAppPool();
    await pool.query('DELETE FROM badge_states WHERE item_key = ?', [itemKey]);
    res.json({ deleted: true, item_key: itemKey });
  } catch (err) {
    console.error('[badges] DELETE /:itemKey error:', err.message);
    res.status(500).json({ error: 'Failed to delete badge' });
  }
});

// ── Helpers ──────────────────────────────────────────────────

/**
 * Resolve a database row into its effective badge display state.
 * Applies expiration and acknowledgment logic server-side.
 */
function resolveRow(row) {
  if (!row) return null;

  const now = new Date();
  const startedAt = row.badge_started_at ? new Date(row.badge_started_at) : null;

  // Compute effective expiry
  let effectiveExpiry = row.badge_expires_at ? new Date(row.badge_expires_at) : null;
  if (!effectiveExpiry && startedAt && row.badge_state !== 'none') {
    const durationDays = row.badge_duration_days || DEFAULT_DURATIONS[row.badge_state] || 14;
    effectiveExpiry = new Date(startedAt.getTime() + durationDays * 86400000);
  }

  // Determine visible state
  let visibleState = 'none';
  if (row.badge_acknowledged_at) {
    visibleState = 'none'; // acknowledged — suppressed
  } else if (effectiveExpiry && now > effectiveExpiry) {
    visibleState = 'none'; // expired
  } else if (row.badge_state === 'new' || row.badge_state === 'recently_updated') {
    visibleState = row.badge_state;
  }

  return {
    item_key: row.item_key,
    badge_state: row.badge_state,
    visible_state: visibleState,
    badge_started_at: row.badge_started_at,
    badge_expires_at: effectiveExpiry ? effectiveExpiry.toISOString() : null,
    badge_duration_days: row.badge_duration_days,
    badge_mode: row.badge_mode,
    badge_acknowledged_at: row.badge_acknowledged_at,
    badge_acknowledged_by: row.badge_acknowledged_by,
  };
}

module.exports = router;
