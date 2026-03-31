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
const { requireRole } = require('../middleware/auth');

const guardAdmin = requireRole(['super_admin']);

// ─── Collection routes ──────────────────────────────────────────────────────

router.post('/',  guardAdmin, controller.create);
router.get('/',   guardAdmin, controller.list);

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

module.exports = router;
