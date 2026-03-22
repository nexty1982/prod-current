/**
 * Parish Stats API — real-time record counts from church tenant databases.
 *
 * GET /api/parish-stats/:churchId → { baptisms, marriages, funerals, total }
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { getTenantPool } = require('../config/db');

router.get('/:churchId', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    if (!Number.isFinite(churchId) || churchId <= 0) {
      return res.status(400).json({ error: 'Invalid church_id' });
    }

    const pool = getTenantPool(churchId);

    // Run all three counts in parallel
    const [
      [baptismRows],
      [marriageRows],
      [funeralRows],
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS cnt FROM baptism_records'),
      pool.query('SELECT COUNT(*) AS cnt FROM marriage_records'),
      pool.query('SELECT COUNT(*) AS cnt FROM funeral_records'),
    ]);

    const baptisms = baptismRows[0]?.cnt ?? 0;
    const marriages = marriageRows[0]?.cnt ?? 0;
    const funerals = funeralRows[0]?.cnt ?? 0;

    res.json({
      church_id: churchId,
      baptisms,
      marriages,
      funerals,
      total: baptisms + marriages + funerals,
    });
  } catch (err) {
    console.error('[parish-stats] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch parish stats' });
  }
});

module.exports = router;
