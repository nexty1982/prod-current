/**
 * Prompt Workflow API Routes
 *
 * POST   /api/prompts              — Create prompt
 * GET    /api/prompts              — List prompts (filter by status, component, parent, audit_status)
 * GET    /api/prompts/:id          — Get single prompt
 * PUT    /api/prompts/:id          — Update prompt (draft/audited/rejected only; resets audit on text change)
 * POST   /api/prompts/:id/audit    — Run mandatory audit (validates sections + prohibited language)
 * GET    /api/prompts/:id/audit    — Get current audit result
 * POST   /api/prompts/:id/ready    — Mark ready (audited → ready; requires audit_status=pass)
 * POST   /api/prompts/:id/approve  — Approve prompt (ready → approved; requires audit_status=pass)
 * POST   /api/prompts/:id/reject   — Reject prompt (→ rejected)
 * POST   /api/prompts/:id/execute  — Start execution (approved → executing; requires audit_status=pass + sequence)
 * POST   /api/prompts/:id/complete — Mark execution done (executing → complete)
 * POST   /api/prompts/:id/verify   — Verify execution (complete → verified)
 * POST   /api/prompts/:id/reset   — Reset rejected prompt to draft (rejected → draft)
 * POST   /api/prompts/:id/evaluate     — Run evaluation on completed prompt
 * GET    /api/prompts/:id/evaluation   — Get evaluation result
 * POST   /api/prompts/:id/generate-next — Generate next prompt from evaluation
 * POST   /api/prompts/:id/release-next  — Release generated next prompt for execution
 * GET    /api/prompts/:id/next          — Get linked next prompt
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/promptsController');

// All prompt routes require super_admin
const { requireRole } = require('../middleware/auth');
const guardAdmin = requireRole(['super_admin']);

router.post('/',              guardAdmin, controller.create);
router.get('/',               guardAdmin, controller.list);
router.get('/:id',            guardAdmin, controller.getById);
router.put('/:id',            guardAdmin, controller.update);
router.post('/:id/audit',     guardAdmin, controller.runAudit);
router.get('/:id/audit',      guardAdmin, controller.getAudit);
router.post('/:id/ready',     guardAdmin, controller.markReady);
router.post('/:id/approve',   guardAdmin, controller.approve);
router.post('/:id/reject',    guardAdmin, controller.reject);
router.post('/:id/execute',   guardAdmin, controller.execute);
router.post('/:id/complete',  guardAdmin, controller.complete);
router.post('/:id/verify',    guardAdmin, controller.verify);
router.post('/:id/reset',    guardAdmin, controller.resetToDraft);

// Evaluation & generation (Prompt 004)
router.post('/:id/evaluate',      guardAdmin, controller.evaluate);
router.get('/:id/evaluation',     guardAdmin, controller.getEvaluation);
router.post('/:id/generate-next', guardAdmin, controller.generateNext);
router.post('/:id/release-next',  guardAdmin, controller.releaseNext);
router.get('/:id/next',           guardAdmin, controller.getNextPrompt);

module.exports = router;
