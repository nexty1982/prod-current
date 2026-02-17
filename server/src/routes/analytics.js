/**
 * Analytics API Routes
 * 
 * GET /api/analytics/us-church-counts
 *   Returns aggregated church counts per US state from us_church_counts table.
 *   Response: { states: { "CA": 134, ... }, min, max, total, generatedAt }
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/us-church-counts', requireAuth, async (req, res) => {
  try {
    const { promisePool } = require('../config/db');

    const [rows] = await promisePool.query(
      'SELECT state_code, church_count FROM us_church_counts ORDER BY state_code'
    );

    const states = {};
    let min = Infinity;
    let max = 0;
    let total = 0;

    for (const row of rows) {
      const count = row.church_count;
      states[row.state_code] = count;
      if (count < min) min = count;
      if (count > max) max = count;
      total += count;
    }

    if (rows.length === 0) {
      min = 0;
    }

    res.json({
      states,
      min,
      max,
      total,
      stateCount: rows.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching US church counts:', error);
    res.status(500).json({
      error: 'Failed to fetch church counts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// GET /api/analytics/us-churches?state=XX&jurisdiction=YY
// Returns list of churches for a given state, optionally filtered by jurisdiction
router.get('/us-churches', requireAuth, async (req, res) => {
  try {
    const { promisePool } = require('../config/db');
    const { state, jurisdiction } = req.query;

    if (!state || typeof state !== 'string' || state.length !== 2) {
      return res.status(400).json({ error: 'state query param required (2-letter code)' });
    }

    let sql = `SELECT name, street, city, state_code, zip, phone, website, latitude, longitude, jurisdiction
               FROM us_churches WHERE state_code = ?`;
    const params = [state.toUpperCase()];

    if (jurisdiction) {
      sql += ' AND jurisdiction = ?';
      params.push(jurisdiction);
    }

    sql += ' ORDER BY jurisdiction, city, name';

    const [rows] = await promisePool.query(sql, params);

    // Also get jurisdiction breakdown for this state
    const [jCounts] = await promisePool.query(
      'SELECT jurisdiction, COUNT(*) as count FROM us_churches WHERE state_code = ? GROUP BY jurisdiction ORDER BY count DESC',
      [state.toUpperCase()]
    );

    res.json({
      state: state.toUpperCase(),
      total: rows.length,
      jurisdictions: jCounts,
      churches: rows,
    });
  } catch (error) {
    console.error('❌ Error fetching US churches:', error);
    res.status(500).json({ error: 'Failed to fetch churches' });
  }
});

// GET /api/analytics/om-churches
// Returns list of active OrthodoxMetrics churches with coordinates (for map pins)
router.get('/om-churches', requireAuth, async (req, res) => {
  try {
    const { promisePool } = require('../config/db');

    const [rows] = await promisePool.query(`
      SELECT id, name, church_name, address, city, state_province AS state, latitude, longitude
      FROM churches 
      WHERE is_active = 1 AND latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY state_province, city, name
    `);

    res.json({
      total: rows.length,
      churches: rows,
    });
  } catch (error) {
    console.error('❌ Error fetching OM churches:', error);
    res.status(500).json({ error: 'Failed to fetch OM churches' });
  }
});

module.exports = router;
