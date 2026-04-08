/**
 * Frontend Page Edit Audit Routes — Phase 2 + Orphaned Cleanup
 *
 * Exposes deterministic audit results for frontend page editability wiring.
 * Includes static file analysis, runtime DB verification, and safe orphaned
 * override cleanup.
 *
 * All endpoints require super_admin role.
 * Mounted at /api/admin/frontend-page-audit
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const {
  auditAllPages,
  auditSinglePage,
  getOrphanedOverrides,
  deleteOrphanedOverrides,
  detectCandidates,
} = require('../../services/frontendPageEditAuditService');
const {
  previewTransform,
  applyTransform,
} = require('../../services/wireEditModeService');

// ── Auth ────────────────────────────────────────────────────────────────

router.use(requireAuth);
router.use(requireRole(['super_admin']));

// ── GET / — Audit all registered pages ──────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const result = await auditAllPages();
    res.json({ success: true, timestamp: new Date().toISOString(), ...result });
  } catch (err) {
    console.error('[frontend-page-audit] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /orphaned — List all orphaned overrides globally ────────────────

router.get('/orphaned', async (req, res) => {
  try {
    const orphaned = await getOrphanedOverrides();
    // Group by page_key for easier consumption
    const byPage = {};
    for (const row of orphaned) {
      if (!byPage[row.page_key]) byPage[row.page_key] = [];
      byPage[row.page_key].push({ content_key: row.content_key, content_value: row.content_value });
    }
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      total_orphaned: orphaned.length,
      pages: byPage,
    });
  } catch (err) {
    console.error('[frontend-page-audit] orphaned list error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /orphaned/:pageKey — List orphaned overrides for one page ───────

router.get('/orphaned/:pageKey', async (req, res) => {
  try {
    const orphaned = await getOrphanedOverrides(req.params.pageKey);
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      page_key: req.params.pageKey,
      total_orphaned: orphaned.length,
      overrides: orphaned.map(r => ({ content_key: r.content_key, content_value: r.content_value })),
    });
  } catch (err) {
    console.error('[frontend-page-audit] orphaned list error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /orphaned/:pageKey/delete — Delete selected orphaned overrides ─

router.post('/orphaned/:pageKey/delete', async (req, res) => {
  try {
    const { keys } = req.body;
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ success: false, error: 'Request body must include a non-empty "keys" array' });
    }

    // Sanitize: keys must be strings
    const sanitizedKeys = keys.filter(k => typeof k === 'string' && k.length > 0);
    if (sanitizedKeys.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid string keys provided' });
    }

    const actor = {
      userId: req.user?.id || null,
      username: req.user?.username || req.user?.email || 'unknown',
    };

    const result = await deleteOrphanedOverrides(req.params.pageKey, sanitizedKeys, actor);
    res.json({ success: true, timestamp: new Date().toISOString(), page_key: req.params.pageKey, ...result });
  } catch (err) {
    console.error('[frontend-page-audit] orphaned delete error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /candidates — Detect Edit Mode conversion candidates ────────────

router.get('/candidates', async (req, res) => {
  try {
    const result = detectCandidates();
    res.json({ success: true, timestamp: new Date().toISOString(), ...result });
  } catch (err) {
    console.error('[frontend-page-audit] candidates error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /wire-edit-mode/preview — Preview Edit Mode transform ──────────

router.post('/wire-edit-mode/preview', async (req, res) => {
  try {
    const { file } = req.body;
    if (!file || typeof file !== 'string') {
      return res.status(400).json({ success: false, error: 'Request body must include a "file" string (relative path from front-end/src)' });
    }
    const result = previewTransform(file);
    res.json({ timestamp: new Date().toISOString(), ...result });
  } catch (err) {
    console.error('[frontend-page-audit] wire-edit-mode preview error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /wire-edit-mode/apply — Apply Edit Mode transform ──────────────

router.post('/wire-edit-mode/apply', async (req, res) => {
  try {
    const { file } = req.body;
    if (!file || typeof file !== 'string') {
      return res.status(400).json({ success: false, error: 'Request body must include a "file" string (relative path from front-end/src)' });
    }
    const actor = {
      userId: req.user?.id || null,
      username: req.user?.username || req.user?.email || 'unknown',
    };
    console.log(`[wire-edit-mode] Apply requested by ${actor.username} for file: ${file}`);
    const result = applyTransform(file);
    res.json({ timestamp: new Date().toISOString(), actor: actor.username, ...result });
  } catch (err) {
    console.error('[frontend-page-audit] wire-edit-mode apply error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /:pageId — Audit a single page ──────────────────────────────────

router.get('/:pageId', async (req, res) => {
  try {
    const result = await auditSinglePage(req.params.pageId);
    if (!result) {
      return res.status(404).json({ success: false, error: `Page "${req.params.pageId}" not found in registry` });
    }
    res.json({ success: true, timestamp: new Date().toISOString(), page: result });
  } catch (err) {
    console.error('[frontend-page-audit] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
