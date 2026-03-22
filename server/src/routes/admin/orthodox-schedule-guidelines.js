/**
 * Orthodox Schedule Guidelines — Admin API Route
 *
 * GET /api/admin/orthodox-schedule-guidelines/:churchId
 *   ?year=2026&calendarType=new
 *
 * Returns DB-backed schedule guidelines if rows exist, otherwise
 * signals the frontend to use the computed engine fallback.
 */

const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { getGuidelines } = require('../../services/orthodoxScheduleGuidelinesService');

const router = express.Router();

router.get('/:churchId', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    if (isNaN(churchId) || churchId < 0) {
      return res.status(400).json({ success: false, error: 'Invalid churchId' });
    }

    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const calendarType = req.query.calendarType === 'old' ? 'old' : 'new';

    const { rows, hasData } = await getGuidelines({ churchId, year, calendarType });

    if (hasData) {
      return res.json({
        success: true,
        source: 'database',
        churchId,
        year,
        calendarType,
        guidelines: rows,
      });
    }

    // No DB rows — signal frontend to use computed engine
    return res.json({
      success: true,
      source: 'engine',
      churchId,
      year,
      calendarType,
      guidelines: null,
    });
  } catch (err) {
    console.error('[orthodox-schedule-guidelines] Error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load schedule guidelines' });
  }
});

module.exports = router;
