/**
 * Prompt Workflow API Routes
 *
 * POST   /api/workflows                        — Create workflow (with optional inline steps)
 * GET    /api/workflows                         — List workflows (filter by status, component)
 * GET    /api/workflows/:id                     — Get workflow with steps
 * PUT    /api/workflows/:id                     — Update workflow metadata (draft only)
 * PUT    /api/workflows/:id/steps               — Set/replace workflow steps (draft only)
 * POST   /api/workflows/:id/validate            — Validate workflow (read-only)
 * POST   /api/workflows/:id/approve             — Approve workflow
 * POST   /api/workflows/:id/activate            — Activate workflow (after generation)
 * POST   /api/workflows/:id/complete            — Mark workflow completed
 * POST   /api/workflows/:id/cancel              — Cancel workflow
 * POST   /api/workflows/:id/reopen              — Reopen cancelled workflow
 * GET    /api/workflows/:id/preview             — Preview generated prompts (no side effects)
 * POST   /api/workflows/:id/generate-prompts    — Generate prompts for all steps
 * GET    /api/workflows/:id/status              — Workflow status with step progress
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/workflowsController');
const instantiationService = require('../services/templateInstantiationService');
const { requireRole } = require('../middleware/auth');

const guardAdmin = requireRole(['super_admin']);

// ─── Collection routes ──────────────────────────────────────────────────────

router.post('/',  guardAdmin, controller.create);

// ─── Template instantiation (on /api/workflows, not /api/workflow-templates) ─
router.post('/from-template', guardAdmin, async (req, res) => {
  try {
    const { template_id, parameters, version } = req.body;
    if (!template_id) return res.status(400).json({ success: false, error: 'template_id is required' });
    const actor = req.user?.email || req.user?.username || 'unknown';
    const result = await instantiationService.instantiate(template_id, parameters || {}, actor, version || null);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 :
                   err.message.includes('validation') || err.message.includes('Unresolved') ? 400 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});
router.get('/',   guardAdmin, controller.list);

// ─── Dashboard routes (BEFORE :id to avoid param capture) ──────────────────

router.get('/dashboard',            guardAdmin, controller.dashboard);
router.get('/dashboard/exceptions', guardAdmin, controller.dashboardExceptions);
router.get('/dashboard/ready',      guardAdmin, controller.dashboardReady);
router.get('/dashboard/recommendations', guardAdmin, controller.dashboardRecommendations);
router.get('/dashboard/cost-report',     guardAdmin, controller.costReport);

// ─── Auto-Execution routes (BEFORE :id to avoid param capture) ────────────

router.post('/auto-execution/enable',  guardAdmin, controller.autoExecEnable);
router.post('/auto-execution/disable', guardAdmin, controller.autoExecDisable);
router.post('/auto-execution/mode',    guardAdmin, controller.autoExecSetMode);
router.get('/auto-execution/status',   guardAdmin, controller.autoExecStatus);
router.get('/auto-execution/logs',     guardAdmin, controller.autoExecLogs);
router.post('/auto-execution/run',     guardAdmin, controller.autoExecRunOnce);

// ─── Progression routes (BEFORE :id to avoid param capture) ─────────────

router.post('/progression/run',     guardAdmin, controller.progressionRun);
router.get('/progression/pipeline', guardAdmin, controller.progressionPipeline);

// ─── Autonomy routes (BEFORE :id to avoid param capture) ─────────────────

router.post('/autonomy/mode',       guardAdmin, controller.autonomySetMode);
router.get('/autonomy/status',      guardAdmin, controller.autonomyStatus);
router.get('/autonomy/logs',        guardAdmin, controller.autonomyLogs);
router.get('/autonomy/dashboard',   guardAdmin, controller.autonomyDashboard);

// ─── Per-workflow routes ────────────────────────────────────────────────────

router.get('/:id',                  guardAdmin, controller.getById);
router.put('/:id',                  guardAdmin, controller.update);
router.put('/:id/steps',           guardAdmin, controller.setSteps);
router.post('/:id/validate',       guardAdmin, controller.validate);
router.post('/:id/approve',        guardAdmin, controller.approve);
router.post('/:id/activate',       guardAdmin, controller.activate);
router.post('/:id/complete',       guardAdmin, controller.complete);
router.post('/:id/cancel',         guardAdmin, controller.cancel);
router.post('/:id/reopen',         guardAdmin, controller.reopen);
router.get('/:id/preview',         guardAdmin, controller.preview);
router.post('/:id/generate-prompts', guardAdmin, controller.generatePrompts);
router.get('/:id/status',          guardAdmin, controller.getStatus);
router.get('/:id/cost',            guardAdmin, controller.workflowCost);
router.post('/:id/autonomy/pause',  guardAdmin, controller.autonomyPause);
router.post('/:id/autonomy/resume', guardAdmin, controller.autonomyResume);
router.post('/:id/manual-only',     guardAdmin, controller.setManualOnly);

module.exports = router;
