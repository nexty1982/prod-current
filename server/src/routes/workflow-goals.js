/**
 * Workflow goals API — parish-facing next actions from app_workflow catalog + runtime.
 * GET /api/workflow-goals?church_id=
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const workflowGoals = require('../services/workflowGoalsService');

const PARISH_ROLES = ['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor', 'manager'];

router.use(requireAuth);

router.get('/', requireRole(PARISH_ROLES), async (req, res) => {
  try {
    const user = req.session?.user || req.user;
    const churchId = parseInt(req.query.church_id || user?.church_id, 10);
    if (!churchId || Number.isNaN(churchId)) {
      return res.status(400).json({ success: false, message: 'church_id required' });
    }
    if (user?.role !== 'super_admin' && user?.role !== 'admin' && user?.church_id !== churchId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this church' });
    }
    const data = await workflowGoals.getGoalsForChurch(churchId, { audience: 'parish' });
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[workflow-goals] error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
