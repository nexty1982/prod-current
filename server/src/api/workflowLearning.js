/**
 * Workflow Learning API Routes
 *
 * GET    /api/learning                    — List learnings (filter by type, severity, search)
 * GET    /api/learning/stats              — Dashboard stats
 * GET    /api/learning/constraints        — Preview constraints for a component
 * GET    /api/learning/:id                — Get learning detail
 * POST   /api/learning                    — Record a learning (violation/success/structural)
 * POST   /api/learning/aggregate          — Run aggregation pass
 * POST   /api/learning/:id/disable        — Disable a pattern
 * POST   /api/learning/:id/enable         — Enable a pattern
 * POST   /api/learning/:id/severity       — Adjust severity
 * POST   /api/learning/:id/resolve        — Mark as resolved
 * GET    /api/learning/injections/:promptId — Get injections for a prompt
 */

const express = require('express');
const router = express.Router();
const learningService = require('../services/workflowLearningService');
const injectionEngine = require('../services/constraintInjectionEngine');
const { requireRole } = require('../middleware/auth');

const guardAdmin = requireRole(['super_admin']);

function getActor(req) {
  return req.user?.email || req.user?.username || 'unknown';
}

// ─── Collection routes (BEFORE :id) ──────────────────────────────────────

router.get('/stats', guardAdmin, async (req, res) => {
  try {
    const stats = await learningService.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/constraints', guardAdmin, async (req, res) => {
  try {
    const { component } = req.query;
    const result = await injectionEngine.previewConstraints(component || null);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/aggregate', guardAdmin, async (req, res) => {
  try {
    const result = await learningService.aggregatePatterns();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/injections/:promptId', guardAdmin, async (req, res) => {
  try {
    const injections = await learningService.getInjectionsForPrompt(req.params.promptId);
    res.json({ success: true, injections });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CRUD ────────────────────────────────────────────────────────────────

router.get('/', guardAdmin, async (req, res) => {
  try {
    const { learning_type, severity, active, global_candidate, search } = req.query;
    const learnings = await learningService.listLearnings({
      learning_type,
      severity,
      active: active !== undefined ? active === 'true' || active === '1' : undefined,
      global_candidate: global_candidate !== undefined ? global_candidate === 'true' || global_candidate === '1' : undefined,
      search,
    });
    res.json({ success: true, learnings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', guardAdmin, async (req, res) => {
  try {
    const { learning_type, category, component, description, workflow_id, prompt_id, constraint_text } = req.body;

    if (!learning_type || !category) {
      return res.status(400).json({ success: false, error: 'learning_type and category are required' });
    }

    let result;
    if (learning_type === 'violation_pattern') {
      result = await learningService.recordViolation({ category, component, description, workflow_id, prompt_id, constraint_override: constraint_text });
    } else if (learning_type === 'success_pattern') {
      result = await learningService.recordSuccess({ category, component, description, workflow_id, prompt_id });
    } else if (learning_type === 'structural_pattern') {
      result = await learningService.recordStructural({ category, component, description, workflow_id, prompt_id, constraint_text });
    } else {
      return res.status(400).json({ success: false, error: `Invalid learning_type: ${learning_type}` });
    }

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── Per-learning routes ────────────────────────────────────────────────────

router.get('/:id', guardAdmin, async (req, res) => {
  try {
    const learning = await learningService.getLearningById(req.params.id);
    if (!learning) return res.status(404).json({ success: false, error: 'Learning not found' });
    res.json({ success: true, learning });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/disable', guardAdmin, async (req, res) => {
  try {
    await learningService.disableLearning(req.params.id);
    res.json({ success: true, message: 'Pattern disabled' });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.post('/:id/enable', guardAdmin, async (req, res) => {
  try {
    await learningService.enableLearning(req.params.id);
    res.json({ success: true, message: 'Pattern enabled' });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.post('/:id/severity', guardAdmin, async (req, res) => {
  try {
    const { severity } = req.body;
    if (!severity) return res.status(400).json({ success: false, error: 'severity is required' });
    const result = await learningService.setSeverity(req.params.id, severity, getActor(req));
    res.json({ success: true, message: `Severity set to ${severity}`, ...result });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.post('/:id/resolve', guardAdmin, async (req, res) => {
  try {
    await learningService.resolveLearning(req.params.id, getActor(req));
    res.json({ success: true, message: 'Pattern resolved' });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

module.exports = router;
