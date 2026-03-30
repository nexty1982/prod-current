/**
 * Workflow Templates API Routes
 *
 * POST   /api/workflow-templates                    — Create template
 * GET    /api/workflow-templates                    — List templates (filter by category, search)
 * GET    /api/workflow-templates/:id                — Get template with steps
 * PUT    /api/workflow-templates/:id                — Update template
 * DELETE /api/workflow-templates/:id                — Soft-delete (deactivate)
 * POST   /api/workflow-templates/:id/version        — Publish new version
 * GET    /api/workflow-templates/:id/versions        — List version history
 * POST   /api/workflow-templates/:id/preview         — Preview instantiation with params
 * POST   /api/workflows/from-template                — Create workflow from template
 */

const express = require('express');
const router = express.Router();
const templateService = require('../services/workflowTemplateService');
const instantiationService = require('../services/templateInstantiationService');
const { requireRole } = require('../middleware/auth');

const guardAdmin = requireRole(['super_admin']);

function getActor(req) {
  return req.user?.email || req.user?.username || 'unknown';
}

// ─── CRUD ─────────────────────────────────────────────────────────────────

router.post('/', guardAdmin, async (req, res) => {
  try {
    const template = await templateService.createTemplate(req.body, getActor(req));
    res.status(201).json({ success: true, template });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/', guardAdmin, async (req, res) => {
  try {
    const { category, search, is_active } = req.query;
    const templates = await templateService.listTemplates({
      category,
      search,
      is_active: is_active !== undefined ? is_active === 'true' || is_active === '1' : undefined,
    });
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', guardAdmin, async (req, res) => {
  try {
    const template = await templateService.getTemplateById(req.params.id);
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', guardAdmin, async (req, res) => {
  try {
    const template = await templateService.updateTemplate(req.params.id, req.body, getActor(req));
    res.json({ success: true, template });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.delete('/:id', guardAdmin, async (req, res) => {
  try {
    await templateService.deleteTemplate(req.params.id);
    res.json({ success: true, message: 'Template deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Versioning ───────────────────────────────────────────────────────────

router.post('/:id/version', guardAdmin, async (req, res) => {
  try {
    const result = await templateService.publishNewVersion(req.params.id, getActor(req));
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.get('/:id/versions', guardAdmin, async (req, res) => {
  try {
    const versions = await templateService.listVersions(req.params.id);
    res.json({ success: true, versions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Preview & Instantiate ────────────────────────────────────────────────

router.post('/:id/preview', guardAdmin, async (req, res) => {
  try {
    const { parameters, version } = req.body;
    const preview = await instantiationService.previewInstantiation(
      req.params.id, parameters || {}, version || null
    );
    res.json({ success: true, preview });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

module.exports = router;
