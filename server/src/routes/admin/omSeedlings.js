/**
 * OM Seedlings API Route
 *
 * POST /api/admin/om-seedlings/dry-run       — Analyze and preview seeding plan
 * POST /api/admin/om-seedlings/execute       — Execute seeding (inserts records)
 * GET  /api/admin/om-seedlings/scope-matrix  — Get scope matrix configuration
 * GET  /api/admin/om-seedlings/runs          — List seed run history
 * GET  /api/admin/om-seedlings/runs/:id      — Get single run detail with full report
 * POST /api/admin/om-seedlings/purge-run/:id — Purge all records from a specific run
 *
 * Pipeline routes:
 * POST /api/admin/om-seedlings/pipelines           — Create a pipeline
 * GET  /api/admin/om-seedlings/pipelines           — List pipeline history
 * GET  /api/admin/om-seedlings/pipelines/:id       — Get pipeline detail
 * POST /api/admin/om-seedlings/pipelines/:id/start — Start pipeline (runs dry run)
 * POST /api/admin/om-seedlings/pipelines/:id/approve — Approve pipeline for execution
 * POST /api/admin/om-seedlings/pipelines/:id/pause   — Pause executing pipeline
 * POST /api/admin/om-seedlings/pipelines/:id/resume  — Resume paused pipeline
 * POST /api/admin/om-seedlings/pipelines/:id/cancel  — Cancel pipeline
 *
 * Mounted at /api/admin/om-seedlings in index.ts
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const { dryRun, execute, purgeByRun, getRunHistory, getRunById } = require('../../services/om-seedlings/seedingEngine');
const { SIZE_PROFILES, LIFECYCLE_PHASES } = require('../../services/om-seedlings/scopeMatrix');
const { getChurchesForMap } = require('../../services/om-seedlings/churchSelector');
const {
  createPipeline, getPipelineById, getPipelineHistory,
  startPipeline, approvePipeline, executePipeline,
  pausePipeline, resumePipeline, cancelPipeline,
} = require('../../services/om-seedlings/pipelineOrchestrator');

const ADMIN_ROLES = ['super_admin'];

// ─── Parse common filters/options from request body ─────────────────────────

function parseRequest(body, req) {
  const filters = {};
  const options = {};

  if (body.church_id) filters.churchId = parseInt(body.church_id);
  if (body.jurisdiction) filters.jurisdiction = body.jurisdiction;
  if (body.state) filters.state = body.state;
  if (body.limit) filters.limit = parseInt(body.limit);

  if (body.record_types) {
    const valid = ['baptism', 'marriage', 'funeral'];
    const types = Array.isArray(body.record_types) ? body.record_types : body.record_types.split(',');
    options.recordTypes = types.filter(t => valid.includes(t.trim()));
  }
  if (body.from_year) options.fromYear = parseInt(body.from_year);
  if (body.to_year) options.toYear = parseInt(body.to_year);
  if (body.allow_fallback) options.allowFallback = true;
  if (body.allow_seeded) options.allowSeeded = true;
  if (body.batch_size) options.batchSize = parseInt(body.batch_size);
  if (body.fail_fast) options.failFast = true;
  if (body.max_churches) options.maxChurches = parseInt(body.max_churches);
  if (body.error_threshold) options.errorThreshold = parseInt(body.error_threshold);
  if (body.delay_ms) options.delayMs = parseInt(body.delay_ms);

  // Identify who started the run
  options.startedBy = req.user?.username || req.session?.user?.username || 'api';

  return { filters, options };
}

// ─── GET /scope-matrix ──────────────────────────────────────────────────────

router.get('/scope-matrix', requireAuth, requireRole(ADMIN_ROLES), (req, res) => {
  res.json({ success: true, size_profiles: SIZE_PROFILES, lifecycle_phases: LIFECYCLE_PHASES });
});

// ─── GET /churches — Phase 2 churches with coordinates + eligibility ────────

router.get('/churches', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const filters = {};
    if (req.query.church_id) filters.churchId = parseInt(req.query.church_id);
    if (req.query.jurisdiction) filters.jurisdiction = req.query.jurisdiction;
    if (req.query.state) filters.state = req.query.state;
    const { churches, summary } = await getChurchesForMap(filters);
    res.json({ success: true, churches, summary });
  } catch (err) {
    console.error('[OM Seedlings] Churches endpoint error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /dry-run ──────────────────────────────────────────────────────────

router.post('/dry-run', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const { filters, options } = parseRequest(req.body, req);
    const report = await dryRun(filters, options);
    res.json({ success: true, ...report });
  } catch (err) {
    console.error('[OM Seedlings] Dry run error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /execute ──────────────────────────────────────────────────────────

router.post('/execute', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const { filters, options } = parseRequest(req.body, req);
    const report = await execute(filters, options);
    res.json({ success: true, ...report });
  } catch (err) {
    console.error('[OM Seedlings] Execute error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /runs — Run history ────────────────────────────────────────────────

router.get('/runs', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const { runs, total } = await getRunHistory(limit, offset);
    res.json({ success: true, runs, total, limit, offset });
  } catch (err) {
    console.error('[OM Seedlings] Run history error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /runs/:id — Single run detail ──────────────────────────────────────

router.get('/runs/:id', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const run = await getRunById(parseInt(req.params.id));
    if (!run) return res.status(404).json({ success: false, error: 'Run not found' });
    // Parse report_json if stored as string
    if (run.report_json && typeof run.report_json === 'string') {
      try { run.report_json = JSON.parse(run.report_json); } catch { /* leave as string */ }
    }
    res.json({ success: true, run });
  } catch (err) {
    console.error('[OM Seedlings] Run detail error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /purge-run/:id — Purge seeded records by run ID ──────────────────

router.post('/purge-run/:id', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const result = await purgeByRun(parseInt(req.params.id));
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[OM Seedlings] Purge error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Pipeline Routes
// ═══════════════════════════════════════════════════════════════════════════

// ─── POST /pipelines — Create a pipeline ──────────────────────────────────

router.post('/pipelines', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const { mode, scope_label, filters, options, readiness_filter, batch_size, batch_delay_ms } = req.body;
    const createdBy = req.user?.username || req.session?.user?.username || 'api';

    const pipeline = await createPipeline({
      mode: mode || 'manual',
      scopeLabel: scope_label || null,
      filters: filters || {},
      options: options || {},
      readinessFilter: readiness_filter || null,
      batchSize: batch_size ? parseInt(batch_size) : 10,
      batchDelayMs: batch_delay_ms ? parseInt(batch_delay_ms) : 1000,
      createdBy,
    });

    res.json({ success: true, pipeline });
  } catch (err) {
    console.error('[OM Seedlings] Create pipeline error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /pipelines — List pipelines ──────────────────────────────────────

router.get('/pipelines', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const { pipelines, total } = await getPipelineHistory(limit, offset);
    res.json({ success: true, pipelines, total, limit, offset });
  } catch (err) {
    console.error('[OM Seedlings] Pipeline history error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /pipelines/:id — Pipeline detail ─────────────────────────────────

router.get('/pipelines/:id', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pipeline = await getPipelineById(parseInt(req.params.id));
    if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });
    res.json({ success: true, pipeline });
  } catch (err) {
    console.error('[OM Seedlings] Pipeline detail error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /pipelines/:id/start — Start pipeline (dry run) ────────────────

router.post('/pipelines/:id/start', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pipeline = await startPipeline(parseInt(req.params.id));
    res.json({ success: true, pipeline });
  } catch (err) {
    console.error('[OM Seedlings] Start pipeline error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /pipelines/:id/approve — Approve for execution ─────────────────

router.post('/pipelines/:id/approve', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const approvedBy = req.user?.username || req.session?.user?.username || 'api';
    const pipeline = await approvePipeline(parseInt(req.params.id), {
      approvedBy,
      notes: req.body.notes || null,
    });
    res.json({ success: true, pipeline });
  } catch (err) {
    console.error('[OM Seedlings] Approve pipeline error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /pipelines/:id/pause — Pause executing pipeline ────────────────

router.post('/pipelines/:id/pause', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pipeline = await pausePipeline(parseInt(req.params.id));
    res.json({ success: true, pipeline });
  } catch (err) {
    console.error('[OM Seedlings] Pause pipeline error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /pipelines/:id/resume — Resume paused pipeline ─────────────────

router.post('/pipelines/:id/resume', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pipeline = await resumePipeline(parseInt(req.params.id));
    res.json({ success: true, pipeline });
  } catch (err) {
    console.error('[OM Seedlings] Resume pipeline error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /pipelines/:id/cancel — Cancel pipeline ────────────────────────

router.post('/pipelines/:id/cancel', requireAuth, requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const pipeline = await cancelPipeline(parseInt(req.params.id));
    res.json({ success: true, pipeline });
  } catch (err) {
    console.error('[OM Seedlings] Cancel pipeline error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
