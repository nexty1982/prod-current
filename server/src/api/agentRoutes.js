/**
 * Multi-Agent System API Routes
 *
 * Agent Registry:
 *   GET    /api/agents                       — List agents
 *   GET    /api/agents/config                — Get all config
 *   GET    /api/agents/:id                   — Get agent detail
 *   POST   /api/agents                       — Register new agent
 *   PUT    /api/agents/:id                   — Update agent
 *   POST   /api/agents/:id/status            — Set agent status
 *
 * Routing:
 *   POST   /api/agents/route                 — Preview route resolution
 *   GET    /api/agents/routing/rules         — List routing rules
 *   POST   /api/agents/routing/rules         — Create routing rule
 *   PUT    /api/agents/routing/rules/:id     — Update routing rule
 *   DELETE /api/agents/routing/rules/:id     — Delete routing rule
 *
 * Execution & Results:
 *   POST   /api/agents/execute               — Execute prompt through agent system
 *   GET    /api/agents/execution/:groupId    — Get execution group results
 *   GET    /api/agents/results/step/:stepId  — Results for a prompt step
 *   POST   /api/agents/results/:id/evaluate  — Evaluate a result
 *   POST   /api/agents/results/:groupId/select — Trigger selection
 *
 * Configuration:
 *   PUT    /api/agents/config/:key           — Set config value
 */

const express = require('express');
const router = express.Router();
const registryService = require('../services/agentRegistryService');
const routingService = require('../services/agentRoutingService');
const executionService = require('../services/multiAgentExecutionService');
const selectionService = require('../services/resultSelectionService');
const { requireRole } = require('../middleware/auth');

const guardAdmin = requireRole(['super_admin']);

// ═══════════════════════════════════════════════════════════════════════════
// Agent Registry
// ═══════════════════════════════════════════════════════════════════════════

router.get('/', guardAdmin, async (req, res) => {
  try {
    const { status, provider, capability } = req.query;
    const agents = await registryService.listAgents({ status, provider, capability });
    res.json({ success: true, agents });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/config', guardAdmin, async (req, res) => {
  try {
    const config = await executionService.getAllConfig();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/routing/rules', guardAdmin, async (req, res) => {
  try {
    const { active, component } = req.query;
    const rules = await routingService.listRules({
      active: active !== undefined ? active === 'true' || active === '1' : undefined,
      component,
    });
    res.json({ success: true, rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/results/step/:stepId', guardAdmin, async (req, res) => {
  try {
    const results = await selectionService.getResultsForStep(parseInt(req.params.stepId, 10));
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/execution/:groupId', guardAdmin, async (req, res) => {
  try {
    const group = await executionService.getExecutionGroup(req.params.groupId);
    res.json({ success: true, ...group });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', guardAdmin, async (req, res) => {
  try {
    const agent = await registryService.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
    res.json({ success: true, agent });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Write operations ───────────────────────────────────────────────────────

router.post('/', guardAdmin, async (req, res) => {
  try {
    const result = await registryService.createAgent(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    const status = err.message.includes('required') || err.message.includes('Invalid') ? 400 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.put('/:id', guardAdmin, async (req, res) => {
  try {
    await registryService.updateAgent(req.params.id, req.body);
    res.json({ success: true, message: 'Agent updated' });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.post('/:id/status', guardAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'status is required' });
    await registryService.setStatus(req.params.id, status);
    res.json({ success: true, message: `Agent status set to ${status}` });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ─── Routing ────────────────────────────────────────────────────────────────

router.post('/route', guardAdmin, async (req, res) => {
  try {
    const { component, prompt_type } = req.body;
    const preview = await routingService.previewRoute(component || null, prompt_type || null);
    res.json({ success: true, routing: preview });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/routing/rules', guardAdmin, async (req, res) => {
  try {
    const result = await routingService.createRule(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    const status = err.message.includes('required') || err.message.includes('Invalid') || err.message.includes('not found') ? 400 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.put('/routing/rules/:id', guardAdmin, async (req, res) => {
  try {
    await routingService.updateRule(req.params.id, req.body);
    res.json({ success: true, message: 'Rule updated' });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.delete('/routing/rules/:id', guardAdmin, async (req, res) => {
  try {
    await routingService.deleteRule(req.params.id);
    res.json({ success: true, message: 'Rule deleted' });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ─── Execution & Evaluation ─────────────────────────────────────────────────

router.post('/execute', guardAdmin, async (req, res) => {
  try {
    const { stepId, promptText, component, promptType, workItemId, forceMultiAgent, forceSingleAgent } = req.body;
    if (!stepId || !promptText) {
      return res.status(400).json({ success: false, error: 'stepId and promptText are required' });
    }
    const result = await executionService.executePrompt({
      stepId, promptText, component, promptType, workItemId,
      forceMultiAgent, forceSingleAgent,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/results/:id/evaluate', guardAdmin, async (req, res) => {
  try {
    const { completion_status, violations, confidence, notes } = req.body;
    if (!completion_status) {
      return res.status(400).json({ success: false, error: 'completion_status is required' });
    }
    const result = await selectionService.evaluateResult(req.params.id, {
      completion_status, violations, confidence, notes,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.post('/results/:groupId/select', guardAdmin, async (req, res) => {
  try {
    const result = await selectionService.selectBestResult(req.params.groupId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── Configuration ──────────────────────────────────────────────────────────

router.put('/config/:key', guardAdmin, async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ success: false, error: 'value is required' });
    await executionService.setConfig(req.params.key, String(value));
    res.json({ success: true, message: `Config ${req.params.key} updated` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
