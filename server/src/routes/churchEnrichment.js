/**
 * Church Enrichment API Routes v2
 * Endpoints for viewing, triggering, reviewing enrichment data, and analytics.
 *
 * Mounted at /api/church-enrichment
 */

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getAppPool } = require('../config/db');
const { runBatchEnrichment, enrichChurch, upsertEnrichmentProfile, createEnrichmentRun, updateRunStatus } = require('../services/churchEnrichmentService');
const { runFastFill } = require('../services/fastEstablishedDateService');

const router = express.Router();
const requireAdmin = requireRole(['admin', 'super_admin']);
const requireSuper = requireRole(['super_admin']);

// ─── Analytics Helpers ───────────────────────────────────────────────────────

function computeAnalyticsFields(row) {
  const estYear = row.manual_established_year || row.established_year;
  const sizeCategory = row.manual_size_category || row.size_category || 'unknown';

  // Established year bucket
  let established_year_bucket = 'unknown';
  if (estYear) {
    if (estYear < 1900) established_year_bucket = 'pre_1900';
    else if (estYear < 1950) established_year_bucket = '1900_1949';
    else if (estYear < 2000) established_year_bucket = '1950_1999';
    else established_year_bucket = '2000_present';
  }

  // Size bucket sort order (for ORDER BY in dashboards)
  const sizeSortMap = {
    mission_small: 1, parish_small: 2, parish_medium: 3,
    parish_large: 4, cathedral_or_major: 5, unknown: 0
  };
  const size_bucket_sort_order = sizeSortMap[sizeCategory] || 0;

  // Flags
  const is_mission = /\bmission\b/i.test(row.church_name || '');
  const is_cathedral = /\bcathedral\b/i.test(row.church_name || '');
  const has_manual_override = !!(row.manual_established_year || row.manual_size_category);

  // Review state
  let review_state = 'unreviewed';
  if (row.reviewed_at) review_state = 'reviewed';
  else if (row.enrichment_status === 'enriched' && row.established_confidence === 'high') review_state = 'auto_accepted';

  // Usable for dashboard: has at least one high/medium confidence field or a manual override
  const estConf = has_manual_override ? 'high' : (row.established_confidence || 'none');
  const sizeConf = has_manual_override ? 'high' : (row.size_confidence || 'none');
  const usable_for_dashboard = ['high', 'medium'].includes(estConf) || ['high', 'medium'].includes(sizeConf) || has_manual_override;

  // Effective values (manual overrides take precedence)
  const effective_established_year = row.manual_established_year || row.established_year;
  const effective_size_category = row.manual_size_category || row.size_category || 'unknown';

  return {
    established_year_bucket,
    size_bucket_sort_order,
    is_mission,
    is_cathedral,
    has_manual_override,
    review_state,
    usable_for_dashboard,
    effective_established_year,
    effective_size_category
  };
}

// ═══════════════════════════════════════════════════════════════
// LIST — enrichment profiles with filtering + analytics fields
// ═══════════════════════════════════════════════════════════════

router.get('/profiles', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    const { state, jurisdiction, status, confidence, year_bucket, size_bucket,
            review_state: reviewFilter, dashboard_only, page = 1, limit = 50,
            sort = 'last_enriched_at', order = 'desc' } = req.query;

    let where = ['1=1'];
    const params = [];

    if (state) { where.push('c.state_code = ?'); params.push(state); }
    if (jurisdiction) { where.push('c.jurisdiction LIKE ?'); params.push(`%${jurisdiction}%`); }
    if (status) { where.push('ep.enrichment_status = ?'); params.push(status); }
    if (confidence) { where.push('(ep.established_confidence = ? OR ep.size_confidence = ?)'); params.push(confidence, confidence); }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Allowed sort columns
    const allowedSorts = ['last_enriched_at', 'established_year', 'church_name', 'enrichment_status', 'size_category'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'last_enriched_at';
    const sortDir = order === 'asc' ? 'ASC' : 'DESC';
    const sortExpr = sortCol === 'church_name' ? 'c.name' : `ep.${sortCol}`;

    const [rows] = await pool.query(`
      SELECT ep.*, c.name AS church_name, c.city, c.state_code, c.jurisdiction, c.website
      FROM church_enrichment_profiles ep
      JOIN us_churches c ON c.id = ep.church_id
      WHERE ${where.join(' AND ')}
      ORDER BY ${sortExpr} ${sortDir}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(*) as total
      FROM church_enrichment_profiles ep
      JOIN us_churches c ON c.id = ep.church_id
      WHERE ${where.join(' AND ')}
    `, params);

    // Add computed analytics fields and apply post-query filters
    let enriched = rows.map(row => ({
      ...row,
      ...computeAnalyticsFields(row)
    }));

    // Post-query filters (computed fields)
    if (year_bucket) enriched = enriched.filter(r => r.established_year_bucket === year_bucket);
    if (size_bucket) enriched = enriched.filter(r => r.effective_size_category === size_bucket);
    if (reviewFilter) enriched = enriched.filter(r => r.review_state === reviewFilter);
    if (dashboard_only === 'true') enriched = enriched.filter(r => r.usable_for_dashboard);

    res.json({ profiles: enriched, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[Enrichment API] GET /profiles error:', err);
    res.status(500).json({ error: 'Failed to fetch enrichment profiles' });
  }
});

// ═══════════════════════════════════════════════════════════════
// SINGLE PROFILE — by church ID (with analytics fields)
// ═══════════════════════════════════════════════════════════════

router.get('/profiles/:churchId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query(`
      SELECT ep.*, c.name AS church_name, c.city, c.state_code, c.jurisdiction, c.website
      FROM church_enrichment_profiles ep
      JOIN us_churches c ON c.id = ep.church_id
      WHERE ep.church_id = ?
    `, [req.params.churchId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No enrichment profile for this church' });
    }

    res.json({ ...rows[0], ...computeAnalyticsFields(rows[0]) });
  } catch (err) {
    console.error('[Enrichment API] GET /profiles/:churchId error:', err);
    res.status(500).json({ error: 'Failed to fetch enrichment profile' });
  }
});

// ═══════════════════════════════════════════════════════════════
// SUMMARY STATS (with analytics breakdowns)
// ═══════════════════════════════════════════════════════════════

router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getAppPool();

    const [[statusCounts]] = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(enrichment_status = 'enriched') as enriched,
        SUM(enrichment_status = 'low_confidence') as low_confidence,
        SUM(enrichment_status = 'no_data') as no_data,
        SUM(enrichment_status = 'pending') as pending,
        SUM(enrichment_status = 'failed') as failed,
        SUM(enrichment_status = 'review_required') as review_required
      FROM church_enrichment_profiles
    `);

    const [[confidenceCounts]] = await pool.query(`
      SELECT
        SUM(established_confidence = 'high') as est_high,
        SUM(established_confidence = 'medium') as est_medium,
        SUM(established_confidence = 'low') as est_low,
        SUM(size_confidence = 'high') as size_high,
        SUM(size_confidence = 'medium') as size_medium,
        SUM(size_confidence = 'low') as size_low
      FROM church_enrichment_profiles
    `);

    const [yearBuckets] = await pool.query(`
      SELECT
        CASE
          WHEN COALESCE(manual_established_year, established_year) < 1900 THEN 'pre_1900'
          WHEN COALESCE(manual_established_year, established_year) < 1950 THEN '1900_1949'
          WHEN COALESCE(manual_established_year, established_year) < 2000 THEN '1950_1999'
          WHEN COALESCE(manual_established_year, established_year) IS NOT NULL THEN '2000_present'
          ELSE 'unknown'
        END as bucket,
        COUNT(*) as count
      FROM church_enrichment_profiles
      GROUP BY bucket
    `);

    const [sizeBuckets] = await pool.query(`
      SELECT
        COALESCE(manual_size_category, size_category, 'unknown') as bucket,
        COUNT(*) as count
      FROM church_enrichment_profiles
      GROUP BY bucket ORDER BY FIELD(bucket, 'mission_small','parish_small','parish_medium','parish_large','cathedral_or_major','unknown')
    `);

    const [[reviewCounts]] = await pool.query(`
      SELECT
        SUM(reviewed_at IS NOT NULL) as reviewed,
        SUM(reviewed_at IS NULL AND enrichment_status = 'enriched' AND established_confidence = 'high') as auto_accepted,
        SUM(reviewed_at IS NULL AND NOT (enrichment_status = 'enriched' AND established_confidence = 'high')) as unreviewed,
        SUM(manual_established_year IS NOT NULL OR manual_size_category IS NOT NULL) as manual_overrides
      FROM church_enrichment_profiles
    `);

    const [[totalChurches]] = await pool.query('SELECT COUNT(*) as count FROM us_churches');
    const [[dashboardReady]] = await pool.query(`
      SELECT COUNT(*) as count FROM church_enrichment_profiles
      WHERE (established_confidence IN ('high','medium') OR size_confidence IN ('high','medium')
             OR manual_established_year IS NOT NULL OR manual_size_category IS NOT NULL)
    `);

    res.json({
      totalChurches: totalChurches.count,
      enriched: statusCounts,
      confidence: confidenceCounts,
      yearBuckets: Object.fromEntries(yearBuckets.map(r => [r.bucket, r.count])),
      sizeBuckets: Object.fromEntries(sizeBuckets.map(r => [r.bucket, r.count])),
      review: reviewCounts,
      dashboardReady: dashboardReady.count,
      unenriched: totalChurches.count - (statusCounts.total || 0)
    });
  } catch (err) {
    console.error('[Enrichment API] GET /stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ═══════════════════════════════════════════════════════════════
// RUNS — list enrichment runs
// ═══════════════════════════════════════════════════════════════

router.get('/runs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query(`
      SELECT * FROM church_enrichment_runs ORDER BY started_at DESC LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    console.error('[Enrichment API] GET /runs error:', err);
    res.status(500).json({ error: 'Failed to fetch runs' });
  }
});

// ═══════════════════════════════════════════════════════════════
// TRIGGER — start a batch enrichment run
// ═══════════════════════════════════════════════════════════════

router.post('/run', requireAuth, requireSuper, async (req, res) => {
  try {
    const { state, jurisdiction, limit, forceReenrich, statusFilter } = req.body;
    const { createTask, findActiveTaskByScope } = require('../services/taskRunner');

    // Duplicate-run protection: check for active task with same scope
    const existing = await findActiveTaskByScope(null, 'enrichment_batch', 'church-enrichment', {
      state: state || null,
      jurisdiction: jurisdiction || null,
      statusFilter: statusFilter || null
    });
    if (existing) {
      return res.status(409).json({
        error: `An enrichment batch with this scope is already ${existing.status} (Task #${existing.id}: ${existing.title})`,
        existing_task_id: existing.id,
        existing_task_title: existing.title
      });
    }

    const userId = req.session?.user?.id || req.user?.id || null;
    const userName = req.session?.user?.username || req.user?.username || null;
    const filterDesc = [state, jurisdiction].filter(Boolean).join(', ') || 'all';

    const taskId = await createTask(null, {
      task_type: 'enrichment_batch',
      source_feature: 'church-enrichment',
      title: `Enrichment batch — ${filterDesc}${limit ? ` (limit ${limit})` : ''}`,
      created_by: userId,
      created_by_name: userName,
      metadata_json: { state, jurisdiction, limit, forceReenrich, statusFilter }
    });

    res.json({ message: 'Enrichment run started', status: 'accepted', task_id: taskId });

    runBatchEnrichment({ state, jurisdiction, limit, forceReenrich, statusFilter, taskId })
      .then(summary => console.log('[Enrichment API] Batch complete:', summary))
      .catch(err => console.error('[Enrichment API] Batch error:', err));
  } catch (err) {
    console.error('[Enrichment API] POST /run error:', err);
    res.status(500).json({ error: 'Failed to start enrichment run' });
  }
});

// ═══════════════════════════════════════════════════════════════
// RE-RUN — re-run only no_data / low_confidence / failed
// ═══════════════════════════════════════════════════════════════

router.post('/rerun', requireAuth, requireSuper, async (req, res) => {
  try {
    const { state, jurisdiction, limit, statuses = 'no_data,low_confidence' } = req.body;
    const { createTask, findActiveTaskByScope } = require('../services/taskRunner');

    // Duplicate-run protection: check for active task with same scope
    const existing = await findActiveTaskByScope(null, 'enrichment_batch', 'church-enrichment', {
      state: state || null,
      jurisdiction: jurisdiction || null,
      statusFilter: statuses || null
    });
    if (existing) {
      return res.status(409).json({
        error: `An enrichment batch with this scope is already ${existing.status} (Task #${existing.id}: ${existing.title})`,
        existing_task_id: existing.id,
        existing_task_title: existing.title
      });
    }

    const userId = req.session?.user?.id || req.user?.id || null;
    const userName = req.session?.user?.username || req.user?.username || null;

    const taskId = await createTask(null, {
      task_type: 'enrichment_batch',
      source_feature: 'church-enrichment',
      title: `Enrichment re-run — ${statuses}`,
      created_by: userId,
      created_by_name: userName,
      metadata_json: { state, jurisdiction, limit, statusFilter: statuses, rerun: true }
    });

    res.json({ message: `Re-run started for statuses: ${statuses}`, status: 'accepted', task_id: taskId });

    runBatchEnrichment({ state, jurisdiction, limit, forceReenrich: true, statusFilter: statuses, taskId })
      .then(summary => console.log('[Enrichment API] Re-run complete:', summary))
      .catch(err => console.error('[Enrichment API] Re-run error:', err));
  } catch (err) {
    console.error('[Enrichment API] POST /rerun error:', err);
    res.status(500).json({ error: 'Failed to start re-run' });
  }
});

// ═══════════════════════════════════════════════════════════════
// TRIGGER SINGLE — enrich one church
// ═══════════════════════════════════════════════════════════════

router.post('/run/:churchId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    const churchId = parseInt(req.params.churchId, 10);

    const [rows] = await pool.query(
      'SELECT id, name, website, city, state_code, jurisdiction FROM us_churches WHERE id = ?',
      [churchId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Church not found' });

    const church = rows[0];
    const runId = await createEnrichmentRun(pool, { runType: 'single', totalChurches: 1, options: { churchId } });

    const result = await enrichChurch(church, { logger: console.log });
    await upsertEnrichmentProfile(pool, runId, result);

    await updateRunStatus(pool, runId, {
      status: 'completed',
      enrichedCount: (result.status === 'enriched' || result.status === 'low_confidence') ? 1 : 0,
      failedCount: result.status === 'failed' ? 1 : 0,
      skippedCount: result.status === 'no_data' ? 1 : 0
    });

    res.json({ runId, ...result, ...computeAnalyticsFields({ ...result, church_name: church.name, established_confidence: result.established?.confidence, size_confidence: result.size?.confidence }) });
  } catch (err) {
    console.error('[Enrichment API] POST /run/:churchId error:', err);
    res.status(500).json({ error: 'Failed to enrich church' });
  }
});

// ═══════════════════════════════════════════════════════════════
// MANUAL REVIEW — update manual overrides and review status
// ═══════════════════════════════════════════════════════════════

router.put('/profiles/:churchId/review', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    const churchId = parseInt(req.params.churchId, 10);
    const { manual_established_year, manual_size_category, manual_notes, enrichment_status } = req.body;

    const updates = [];
    const params = [];

    if (manual_established_year !== undefined) { updates.push('manual_established_year = ?'); params.push(manual_established_year); }
    if (manual_size_category !== undefined) { updates.push('manual_size_category = ?'); params.push(manual_size_category); }
    if (manual_notes !== undefined) { updates.push('manual_notes = ?'); params.push(manual_notes); }
    if (enrichment_status) { updates.push('enrichment_status = ?'); params.push(enrichment_status); }

    updates.push('reviewed_by = ?');
    params.push(req.session?.user?.id || req.user?.id || null);
    updates.push('reviewed_at = NOW()');

    params.push(churchId);
    const [result] = await pool.query(
      `UPDATE church_enrichment_profiles SET ${updates.join(', ')} WHERE church_id = ?`,
      params
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'No enrichment profile for this church' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Enrichment API] PUT /profiles/:churchId/review error:', err);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// ═══════════════════════════════════════════════════════════════
// FILTER OPTIONS — distinct values for UI dropdowns
// ═══════════════════════════════════════════════════════════════

router.get('/filter-options', requireAuth, requireAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    // Enriched-only filters (for profile list filtering)
    const [states] = await pool.query('SELECT DISTINCT c.state_code FROM us_churches c JOIN church_enrichment_profiles ep ON ep.church_id = c.id ORDER BY c.state_code');
    const [jurisdictions] = await pool.query('SELECT DISTINCT c.jurisdiction FROM us_churches c JOIN church_enrichment_profiles ep ON ep.church_id = c.id WHERE c.jurisdiction IS NOT NULL ORDER BY c.jurisdiction');
    // All available states/jurisdictions (for batch run targeting)
    const [allStates] = await pool.query('SELECT DISTINCT state_code FROM us_churches WHERE state_code IS NOT NULL ORDER BY state_code');
    const [allJurisdictions] = await pool.query('SELECT DISTINCT jurisdiction FROM us_churches WHERE jurisdiction IS NOT NULL ORDER BY jurisdiction');

    res.json({
      states: states.map(r => r.state_code),
      jurisdictions: jurisdictions.map(r => r.jurisdiction),
      allStates: allStates.map(r => r.state_code),
      allJurisdictions: allJurisdictions.map(r => r.jurisdiction),
      statuses: ['enriched', 'low_confidence', 'no_data', 'pending', 'failed', 'review_required'],
      confidences: ['high', 'medium', 'low', 'none'],
      yearBuckets: ['pre_1900', '1900_1949', '1950_1999', '2000_present', 'unknown'],
      sizeCategories: ['mission_small', 'parish_small', 'parish_medium', 'parish_large', 'cathedral_or_major', 'unknown']
    });
  } catch (err) {
    console.error('[Enrichment API] GET /filter-options error:', err);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// ═══════════════════════════════════════════════════════════════
// FAST FILL — demo-mode rapid established date population
// Uses web search snippets + heuristic fallback (no crawling)
// ═══════════════════════════════════════════════════════════════

router.post('/fast-fill', requireAuth, requireSuper, async (req, res) => {
  try {
    const { state, jurisdiction, limit, overwriteExisting } = req.body;
    const { createTask, findActiveTaskByScope } = require('../services/taskRunner');

    // Duplicate-run protection
    const existing = await findActiveTaskByScope(null, 'enrichment_fast_fill', 'church-enrichment', {
      state: state || null,
      jurisdiction: jurisdiction || null,
    });
    if (existing) {
      return res.status(409).json({
        error: `A fast-fill batch is already ${existing.status} (Task #${existing.id}: ${existing.title})`,
        existing_task_id: existing.id,
      });
    }

    const userId = req.session?.user?.id || req.user?.id || null;
    const userName = req.session?.user?.username || req.user?.username || null;
    const filterDesc = [state, jurisdiction].filter(Boolean).join(', ') || 'all';

    const taskId = await createTask(null, {
      task_type: 'enrichment_fast_fill',
      source_feature: 'church-enrichment',
      title: `Fast fill established dates — ${filterDesc}${limit ? ` (limit ${limit})` : ''}`,
      created_by: userId,
      created_by_name: userName,
      metadata_json: { state, jurisdiction, limit, overwriteExisting, mode: 'fast_demo' }
    });

    res.json({ message: 'Fast fill started', status: 'accepted', task_id: taskId });

    runFastFill({ state, jurisdiction, limit, overwriteExisting, taskId })
      .then(summary => console.log('[Enrichment API] Fast fill complete:', summary))
      .catch(err => console.error('[Enrichment API] Fast fill error:', err));
  } catch (err) {
    console.error('[Enrichment API] POST /fast-fill error:', err);
    res.status(500).json({ error: 'Failed to start fast fill' });
  }
});

module.exports = router;
