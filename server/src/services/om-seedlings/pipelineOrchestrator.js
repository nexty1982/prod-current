/**
 * Pipeline Orchestrator — Controlled automation for batch seeding operations
 *
 * A pipeline groups targeting → dry-run → approval → execute into a single
 * trackable unit. Supports manual, semi-auto, and strict modes.
 *
 * Modes:
 *   manual    — dry run → operator reviews → clicks execute
 *   semi_auto — dry run → auto-execute if 0 blockers
 *   strict    — dry run → auto-execute if 0 blockers AND 0 warnings
 *
 * Reuses seedingEngine for actual dry-run and execute calls.
 * Each pipeline creates linked om_seedling_runs records.
 */

const { getAppPool } = require('../../config/db');
const { dryRun, execute } = require('./seedingEngine');

// ─── Pipeline CRUD ─────────────────────────────────────────────────────────

/**
 * Create a new pipeline.
 *
 * @param {object} params
 * @param {string} params.mode - 'manual' | 'semi_auto' | 'strict'
 * @param {string} [params.scopeLabel] - Human label ("OCA NY/NJ", "All Ready Phase 2")
 * @param {object} [params.filters] - Church filters
 * @param {object} [params.options] - Seeding options
 * @param {string} [params.readinessFilter] - Readiness status filter
 * @param {number} [params.batchSize] - Churches per batch (default 10)
 * @param {number} [params.batchDelayMs] - Delay between batches (default 1000)
 * @param {string} [params.createdBy] - Operator identifier
 * @returns {Promise<object>} Created pipeline record
 */
async function createPipeline(params) {
  const pool = getAppPool();

  const {
    mode = 'manual',
    scopeLabel = null,
    filters = {},
    options = {},
    readinessFilter = null,
    batchSize = 10,
    batchDelayMs = 1000,
    createdBy = 'api',
  } = params;

  const [result] = await pool.query(
    `INSERT INTO om_seedling_pipelines
       (mode, status, stage, scope_label, filters_json, options_json, readiness_filter,
        batch_size, batch_delay_ms, approval_required, created_by, created_at)
     VALUES (?, 'created', 'targeting', ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [
      mode,
      scopeLabel,
      JSON.stringify(filters),
      JSON.stringify(options),
      readinessFilter,
      batchSize,
      batchDelayMs,
      mode === 'manual' ? 1 : 0,
      createdBy,
    ]
  );

  return getPipelineById(result.insertId);
}

/**
 * Get pipeline by ID with parsed JSON fields.
 */
async function getPipelineById(id) {
  const pool = getAppPool();
  const [[row]] = await pool.query('SELECT * FROM om_seedling_pipelines WHERE id = ?', [id]);
  if (!row) return null;
  return parsePipelineRow(row);
}

/**
 * List pipelines with pagination.
 */
async function getPipelineHistory(limit = 20, offset = 0) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT * FROM om_seedling_pipelines ORDER BY id DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM om_seedling_pipelines');
  return { pipelines: rows.map(parsePipelineRow), total };
}

function parsePipelineRow(row) {
  for (const field of ['filters_json', 'options_json', 'dry_run_summary_json']) {
    if (row[field] && typeof row[field] === 'string') {
      try { row[field] = JSON.parse(row[field]); } catch { /* leave as string */ }
    }
  }
  return row;
}

// ─── Pipeline State Machine ────────────────────────────────────────────────

async function updatePipeline(id, updates) {
  const pool = getAppPool();
  const sets = [];
  const params = [];
  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined) {
      if (key.endsWith('_json') && typeof val === 'object') {
        sets.push(`${key} = ?`);
        params.push(JSON.stringify(val));
      } else {
        sets.push(`${key} = ?`);
        params.push(val);
      }
    }
  }
  if (sets.length === 0) return;
  params.push(id);
  await pool.query(`UPDATE om_seedling_pipelines SET ${sets.join(', ')} WHERE id = ?`, params);
}

// ─── Filter/Option normalization (snake_case → camelCase) ──────────────────

function normalizeFilters(raw) {
  const f = {};
  if (raw.church_id) f.churchId = parseInt(raw.church_id);
  else if (raw.churchId) f.churchId = parseInt(raw.churchId);
  if (raw.church_ids) f.churchIds = raw.church_ids;
  else if (raw.churchIds) f.churchIds = raw.churchIds;
  if (raw.jurisdiction) f.jurisdiction = raw.jurisdiction;
  if (raw.state) f.state = raw.state;
  if (raw.limit) f.limit = parseInt(raw.limit);
  return f;
}

function normalizeOptions(raw) {
  const o = {};
  if (raw.record_types) {
    const types = Array.isArray(raw.record_types) ? raw.record_types : raw.record_types.split(',');
    o.recordTypes = types.filter(t => ['baptism', 'marriage', 'funeral'].includes(t.trim()));
  } else if (raw.recordTypes) {
    o.recordTypes = raw.recordTypes;
  }
  if (raw.from_year) o.fromYear = parseInt(raw.from_year);
  else if (raw.fromYear) o.fromYear = parseInt(raw.fromYear);
  if (raw.to_year) o.toYear = parseInt(raw.to_year);
  else if (raw.toYear) o.toYear = parseInt(raw.toYear);
  if (raw.allow_fallback || raw.allowFallback) o.allowFallback = true;
  if (raw.allow_seeded || raw.allowSeeded) o.allowSeeded = true;
  if (raw.fail_fast || raw.failFast) o.failFast = true;
  if (raw.batch_size) o.batchSize = parseInt(raw.batch_size);
  else if (raw.batchSize) o.batchSize = parseInt(raw.batchSize);
  if (raw.max_churches) o.maxChurches = parseInt(raw.max_churches);
  else if (raw.maxChurches) o.maxChurches = parseInt(raw.maxChurches);
  if (raw.error_threshold) o.errorThreshold = parseInt(raw.error_threshold);
  else if (raw.errorThreshold) o.errorThreshold = parseInt(raw.errorThreshold);
  if (raw.delay_ms) o.delayMs = parseInt(raw.delay_ms);
  else if (raw.delayMs) o.delayMs = parseInt(raw.delayMs);
  return o;
}

// ─── Start Pipeline (Dry Run Phase) ────────────────────────────────────────

/**
 * Start a pipeline — runs dry run, evaluates results, decides next stage.
 *
 * @param {number} pipelineId
 * @returns {Promise<object>} Pipeline with dry run results
 */
async function startPipeline(pipelineId) {
  const pipeline = await getPipelineById(pipelineId);
  if (!pipeline) throw new Error(`Pipeline #${pipelineId} not found`);
  if (pipeline.status !== 'created') {
    throw new Error(`Pipeline #${pipelineId} is ${pipeline.status}, cannot start (must be 'created')`);
  }

  const pool = getAppPool();

  // Mark pipeline as running dry run
  await updatePipeline(pipelineId, {
    status: 'dry_run',
    stage: 'dry_run',
    started_at: utcNow(),
  });

  // Run dry run using existing engine (normalize filter/option keys)
  const filters = normalizeFilters(pipeline.filters_json || {});
  const options = normalizeOptions(pipeline.options_json || {});

  let dryRunReport;
  try {
    dryRunReport = await dryRun(filters, {
      ...options,
      startedBy: pipeline.created_by || 'pipeline',
    });
  } catch (err) {
    await updatePipeline(pipelineId, {
      status: 'failed',
      stage: 'dry_run',
      error_message: `Dry run failed: ${err.message}`,
      finished_at: utcNow(),
      duration_ms: timeSince(pipeline.started_at),
    });
    throw err;
  }

  // Link dry run to pipeline
  await linkRunToPipeline(pool, dryRunReport.run_id, pipelineId);

  // Count warnings and blockers from dry run
  let warnings = 0;
  let blockers = 0;
  for (const c of dryRunReport.churches) {
    warnings += (c.warnings || []).length;
  }
  blockers = dryRunReport.skipped.length;

  const totalChurches = dryRunReport.churches.length;
  const batchSize = pipeline.batch_size || 10;
  const totalBatches = Math.ceil(totalChurches / batchSize);

  await updatePipeline(pipelineId, {
    dry_run_id: dryRunReport.run_id,
    total_churches: totalChurches,
    skipped_churches: dryRunReport.skipped.length,
    projected_total: dryRunReport.summary.projected_inserts.total || 0,
    total_batches: totalBatches,
    dry_run_summary_json: dryRunReport.summary,
    dry_run_warnings: warnings,
    dry_run_blockers: blockers,
  });

  // Decide next stage based on mode
  if (totalChurches === 0) {
    await updatePipeline(pipelineId, {
      status: 'completed',
      stage: 'completed',
      finished_at: utcNow(),
      duration_ms: timeSince(pipeline.started_at),
      error_message: 'No eligible churches found',
    });
    return getPipelineById(pipelineId);
  }

  if (pipeline.mode === 'manual') {
    // Always require approval
    await updatePipeline(pipelineId, {
      status: 'awaiting_approval',
      stage: 'awaiting_approval',
    });
  } else if (pipeline.mode === 'semi_auto') {
    // Auto-execute if 0 blockers
    if (blockers === 0) {
      return executePipeline(pipelineId);
    } else {
      await updatePipeline(pipelineId, {
        status: 'awaiting_approval',
        stage: 'awaiting_approval',
        approval_required: 1,
        error_message: `Semi-auto blocked: ${blockers} blockers found — manual approval required`,
      });
    }
  } else if (pipeline.mode === 'strict') {
    // Auto-execute if 0 blockers AND 0 warnings
    if (blockers === 0 && warnings === 0) {
      return executePipeline(pipelineId);
    } else {
      await updatePipeline(pipelineId, {
        status: 'awaiting_approval',
        stage: 'awaiting_approval',
        approval_required: 1,
        error_message: `Strict mode blocked: ${blockers} blockers, ${warnings} warnings — manual approval required`,
      });
    }
  }

  return getPipelineById(pipelineId);
}

// ─── Approve Pipeline ──────────────────────────────────────────────────────

/**
 * Approve a pipeline for execution.
 *
 * @param {number} pipelineId
 * @param {object} params
 * @param {string} params.approvedBy - Operator username
 * @param {string} [params.notes] - Approval notes
 * @returns {Promise<object>} Pipeline (may start executing immediately)
 */
async function approvePipeline(pipelineId, { approvedBy, notes } = {}) {
  const pipeline = await getPipelineById(pipelineId);
  if (!pipeline) throw new Error(`Pipeline #${pipelineId} not found`);
  if (pipeline.status !== 'awaiting_approval') {
    throw new Error(`Pipeline #${pipelineId} is ${pipeline.status}, cannot approve (must be 'awaiting_approval')`);
  }

  if (!approvedBy) throw new Error('approvedBy is required for approval');

  await updatePipeline(pipelineId, {
    approved_by: approvedBy,
    approved_at: utcNow(),
    approval_notes: notes || null,
  });

  // Now execute
  return executePipeline(pipelineId);
}

// ─── Execute Pipeline (Batched) ────────────────────────────────────────────

/**
 * Execute the pipeline — runs seeding in batches.
 *
 * Uses the dry run's church list to batch execute calls.
 * Each batch is a separate execute() call with specific church IDs.
 */
async function executePipeline(pipelineId) {
  const pool = getAppPool();
  const pipeline = await getPipelineById(pipelineId);
  if (!pipeline) throw new Error(`Pipeline #${pipelineId} not found`);

  const allowedStatuses = ['awaiting_approval', 'dry_run', 'paused'];
  if (!allowedStatuses.includes(pipeline.status) && pipeline.status !== 'created') {
    throw new Error(`Pipeline #${pipelineId} is ${pipeline.status}, cannot execute`);
  }

  // Get dry run report to know which churches to seed
  if (!pipeline.dry_run_id) {
    throw new Error(`Pipeline #${pipelineId} has no dry run — start the pipeline first`);
  }

  const [[dryRun]] = await pool.query(
    'SELECT report_json FROM om_seedling_runs WHERE id = ?',
    [pipeline.dry_run_id]
  );
  if (!dryRun) throw new Error(`Dry run #${pipeline.dry_run_id} not found`);

  let dryRunReport = dryRun.report_json;
  if (typeof dryRunReport === 'string') {
    dryRunReport = JSON.parse(dryRunReport);
  }

  const churchIds = dryRunReport.churches.map(c => c.church_id);
  if (churchIds.length === 0) {
    await updatePipeline(pipelineId, {
      status: 'completed',
      stage: 'completed',
      finished_at: utcNow(),
      error_message: 'No churches to execute',
    });
    return getPipelineById(pipelineId);
  }

  // Create Task Runner job for the pipeline
  const tr = loadTaskRunner();
  let taskId = null;
  if (tr) {
    try {
      taskId = await tr.createTask(pool, {
        task_type: 'om_seedlings_pipeline',
        source_feature: 'om-seedlings',
        title: `OM Seedlings pipeline #${pipelineId} — ${churchIds.length} churches`,
        total_count: churchIds.length,
        created_by_name: pipeline.created_by || 'pipeline',
        metadata_json: JSON.stringify({
          pipeline_id: pipelineId,
          mode: pipeline.mode,
          scope: pipeline.scope_label,
        }),
      });
    } catch { /* Task Runner unavailable */ }
  }

  const taskUpdate = (taskId && tr) ? (u) => tr.updateTask(pool, taskId, u).catch(() => {}) : () => {};
  const taskEvent = (taskId && tr) ? (o) => tr.addTaskEvent(pool, taskId, o).catch(() => {}) : () => {};

  // Mark pipeline as executing
  await updatePipeline(pipelineId, {
    status: 'executing',
    stage: 'executing',
    task_id: taskId,
    started_at: pipeline.started_at || utcNow(),
  });

  const batchSize = pipeline.batch_size || 10;
  const batchDelayMs = pipeline.batch_delay_ms || 1000;
  const filters = normalizeFilters(pipeline.filters_json || {});
  const options = normalizeOptions(pipeline.options_json || {});

  // Split church IDs into batches
  const batches = [];
  for (let i = 0; i < churchIds.length; i += batchSize) {
    batches.push(churchIds.slice(i, i + batchSize));
  }

  const totalBatches = batches.length;
  await updatePipeline(pipelineId, { total_batches: totalBatches });

  let totalInserted = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;
  let totalProcessed = 0;
  let executeRunId = null;
  let cancelled = false;
  let paused = false;
  const startedAt = Date.now();

  await taskUpdate({
    status: 'running',
    stage: `Executing ${totalBatches} batches`,
    total_count: churchIds.length,
    message: `Pipeline #${pipelineId}: starting ${totalBatches} batches (${churchIds.length} churches)`,
  });

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    // Check for cancellation or pause
    const freshPipeline = await getPipelineById(pipelineId);
    if (freshPipeline.status === 'cancelled') { cancelled = true; break; }
    if (freshPipeline.status === 'paused') { paused = true; break; }

    // Also check Task Runner cancellation
    if (taskId && tr) {
      try {
        if (await tr.isCancelled(pool, taskId)) { cancelled = true; break; }
      } catch { /* ignore */ }
    }

    const batchChurchIds = batches[batchIdx];

    await taskUpdate({
      message: `Batch ${batchIdx + 1}/${totalBatches}: ${batchChurchIds.length} churches`,
      completed_count: totalProcessed,
      success_count: totalSucceeded,
      failure_count: totalFailed,
    });

    await updatePipeline(pipelineId, {
      stage: `batch_${batchIdx + 1}`,
      completed_batches: batchIdx,
      processed_churches: totalProcessed,
    });

    try {
      // Execute this batch using the engine
      // Pass specific church IDs by iterating; the engine uses buildCandidateList
      // which respects filters. We need to run one execute per batch with a church filter.
      const batchReport = await execute(
        { ...filters, churchIds: batchChurchIds },
        {
          ...options,
          startedBy: pipeline.created_by || 'pipeline',
          // Don't create a separate Task Runner job per batch
        }
      );

      // Link this run to the pipeline
      await linkRunToPipeline(pool, batchReport.run_id, pipelineId);

      // Track the first execute run as the primary
      if (!executeRunId) executeRunId = batchReport.run_id;

      // Accumulate totals
      totalInserted += batchReport.summary.inserted.total || 0;
      totalSucceeded += batchReport.summary.inserted.churches || 0;
      totalFailed += batchReport.summary.failed || 0;
      totalProcessed += batchReport.summary.total_candidates + batchReport.summary.total_skipped;

      await taskEvent({
        level: batchReport.summary.failed > 0 ? 'warning' : 'info',
        stage: `batch_${batchIdx + 1}`,
        message: `Batch ${batchIdx + 1}: ${batchReport.summary.inserted.total} records, ${batchReport.summary.inserted.churches} ok, ${batchReport.summary.failed} failed`,
      });

    } catch (err) {
      console.error(`[Pipeline] Batch ${batchIdx + 1} error:`, err.message);
      await taskEvent({
        level: 'error',
        stage: `batch_${batchIdx + 1}`,
        message: `Batch ${batchIdx + 1} failed: ${err.message}`,
      });
      totalFailed += batchChurchIds.length;

      // Don't kill entire pipeline on batch failure (unless fail-fast)
      if (options.failFast) {
        await updatePipeline(pipelineId, {
          error_message: `Fail-fast: batch ${batchIdx + 1} failed — ${err.message}`,
        });
        break;
      }
    }

    // Update pipeline progress
    await updatePipeline(pipelineId, {
      completed_batches: batchIdx + 1,
      processed_churches: totalProcessed,
      succeeded_churches: totalSucceeded,
      failed_churches: totalFailed,
      actual_total: totalInserted,
    });

    // Inter-batch delay
    if (batchDelayMs > 0 && batchIdx < batches.length - 1) {
      await new Promise(r => setTimeout(r, batchDelayMs));
    }
  }

  // Determine final status
  const finalStatus = cancelled ? 'cancelled'
    : paused ? 'paused'
    : totalFailed > 0 ? (totalSucceeded > 0 ? 'completed' : 'failed')
    : 'completed';

  const durationMs = Date.now() - startedAt;

  await updatePipeline(pipelineId, {
    status: finalStatus,
    stage: finalStatus === 'paused' ? `paused_at_batch_${batches.indexOf(batches.find((_, i) => i >= (pipeline.completed_batches || 0))) + 1}` : 'completed',
    execute_run_id: executeRunId,
    finished_at: finalStatus !== 'paused' ? utcNow() : null,
    duration_ms: durationMs,
    processed_churches: totalProcessed,
    succeeded_churches: totalSucceeded,
    failed_churches: totalFailed,
    actual_total: totalInserted,
  });

  await taskUpdate({
    status: finalStatus === 'completed' ? 'succeeded' : finalStatus,
    stage: 'Complete',
    completed_count: totalProcessed,
    success_count: totalSucceeded,
    failure_count: totalFailed,
    message: `Pipeline #${pipelineId}: ${totalInserted} records, ${totalSucceeded} churches ok, ${totalFailed} failed`,
    result_json: { pipeline_id: pipelineId, total_inserted: totalInserted, churches: totalSucceeded },
  });

  return getPipelineById(pipelineId);
}

// ─── Pause / Resume / Cancel ───────────────────────────────────────────────

async function pausePipeline(pipelineId) {
  const pipeline = await getPipelineById(pipelineId);
  if (!pipeline) throw new Error(`Pipeline #${pipelineId} not found`);
  if (pipeline.status !== 'executing') {
    throw new Error(`Pipeline #${pipelineId} is ${pipeline.status}, cannot pause (must be 'executing')`);
  }
  await updatePipeline(pipelineId, { status: 'paused' });
  return getPipelineById(pipelineId);
}

async function resumePipeline(pipelineId) {
  const pipeline = await getPipelineById(pipelineId);
  if (!pipeline) throw new Error(`Pipeline #${pipelineId} not found`);
  if (pipeline.status !== 'paused') {
    throw new Error(`Pipeline #${pipelineId} is ${pipeline.status}, cannot resume (must be 'paused')`);
  }
  // Resume re-runs executePipeline which will pick up from where it left off
  // by re-running with remaining churches
  return executePipeline(pipelineId);
}

async function cancelPipeline(pipelineId) {
  const pipeline = await getPipelineById(pipelineId);
  if (!pipeline) throw new Error(`Pipeline #${pipelineId} not found`);

  const terminalStatuses = ['completed', 'failed', 'cancelled'];
  if (terminalStatuses.includes(pipeline.status)) {
    throw new Error(`Pipeline #${pipelineId} is ${pipeline.status}, cannot cancel`);
  }

  await updatePipeline(pipelineId, {
    status: 'cancelled',
    stage: 'cancelled',
    finished_at: utcNow(),
    error_message: 'Cancelled by operator',
  });

  return getPipelineById(pipelineId);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function loadTaskRunner() {
  try { return require('../taskRunner'); } catch { return null; }
}

async function linkRunToPipeline(pool, runId, pipelineId) {
  await pool.query('UPDATE om_seedling_runs SET pipeline_id = ? WHERE id = ?', [pipelineId, runId]);
}

function utcNow() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

function timeSince(dt) {
  if (!dt) return 0;
  return Date.now() - new Date(dt).getTime();
}

module.exports = {
  createPipeline,
  getPipelineById,
  getPipelineHistory,
  startPipeline,
  approvePipeline,
  executePipeline,
  pausePipeline,
  resumePipeline,
  cancelPipeline,
};
