/**
 * Prompt Workflow API Routes
 *
 * POST   /api/prompts              — Create prompt
 * GET    /api/prompts              — List prompts (filter by status, component, parent, audit_status)
 *
 * Queue & scheduling (must be before :id routes)
 * GET    /api/prompts/queue             — All queued prompts
 * GET    /api/prompts/next-ready        — Next prompts ready for release
 * GET    /api/prompts/blocked           — All blocked prompts with reasons
 * GET    /api/prompts/due               — Prompts due now
 * GET    /api/prompts/overdue           — Prompts past release window
 * GET    /api/prompts/workplan/today    — Today's workplan
 *
 * Per-prompt routes
 * GET    /api/prompts/:id               — Get single prompt
 * PUT    /api/prompts/:id               — Update prompt
 * POST   /api/prompts/:id/audit         — Run mandatory audit
 * GET    /api/prompts/:id/audit         — Get current audit result
 * POST   /api/prompts/:id/ready         — Mark ready
 * POST   /api/prompts/:id/approve       — Approve prompt
 * POST   /api/prompts/:id/reject        — Reject prompt
 * POST   /api/prompts/:id/execute       — Start execution
 * POST   /api/prompts/:id/complete      — Mark execution done
 * POST   /api/prompts/:id/verify        — Verify execution
 * POST   /api/prompts/:id/reset         — Reset rejected to draft
 * POST   /api/prompts/:id/evaluate      — Run evaluation
 * GET    /api/prompts/:id/evaluation    — Get evaluation result
 * POST   /api/prompts/:id/generate-next — Generate next prompt
 * POST   /api/prompts/:id/release-next  — Release generated next prompt
 * GET    /api/prompts/:id/next          — Get linked next prompt
 * POST   /api/prompts/:id/schedule      — Schedule prompt
 * POST   /api/prompts/:id/release       — Release prompt for execution
 * POST   /api/prompts/:id/release-auto-check — Check release eligibility (read-only)
 * GET    /api/prompts/:id/dependencies  — Get dependency chain
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/promptsController');

// All prompt routes require super_admin
const { requireRole } = require('../middleware/auth');
const guardAdmin = requireRole(['super_admin']);

// ─── Collection routes (MUST be before :id to avoid capture) ──────────────

router.post('/',              guardAdmin, controller.create);
router.get('/',               guardAdmin, controller.list);

// Queue & scheduling
router.get('/queue',          guardAdmin, controller.getQueue);
router.get('/next-ready',     guardAdmin, controller.getNextReady);
router.get('/blocked',        guardAdmin, controller.getBlockedPrompts);
router.get('/due',            guardAdmin, controller.getDuePrompts);
router.get('/overdue',        guardAdmin, controller.getOverduePrompts);
router.get('/workplan/today', guardAdmin, controller.getWorkplan);

// ─── Per-prompt routes ────────────────────────────────────────────────────

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
router.post('/:id/reset',     guardAdmin, controller.resetToDraft);

// Evaluation & generation (Prompt 004)
router.post('/:id/evaluate',      guardAdmin, controller.evaluate);
router.get('/:id/evaluation',     guardAdmin, controller.getEvaluation);
router.post('/:id/generate-next', guardAdmin, controller.generateNext);
router.post('/:id/release-next',  guardAdmin, controller.releaseNext);
router.get('/:id/next',           guardAdmin, controller.getNextPrompt);

// Queue & scheduling per-prompt (Prompt 005)
router.post('/:id/schedule',           guardAdmin, controller.schedulePrompt);
router.post('/:id/release',            guardAdmin, controller.releaseForExecution);
router.post('/:id/release-auto-check', guardAdmin, controller.releaseAutoCheck);
router.get('/:id/dependencies',        guardAdmin, controller.getDependencies);

module.exports = router;
