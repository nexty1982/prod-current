/**
 * Seeding Engine — Orchestrates dry run and execute modes for OM Seedlings
 *
 * Hardened for bulk execution with:
 * - Persistent seed run tracking (om_seedling_runs table)
 * - Task Runner integration for centralized visibility
 * - seed_run_id tagging on inserted records for rollback
 * - Preflight safety checks per church at execute time
 * - Error threshold and max-churches controls
 * - Cancellation support via Task Runner
 * - Per-church transactions with isolation
 */

const { getAppPool, getTenantPool } = require('../../config/db');
const { buildCandidateList, verifyTenantDb } = require('./churchSelector');
const { computeTargetCounts } = require('./scopeMatrix');
const { generateRecordsForChurch } = require('./recordGenerators');

// ─── Column definitions for each record type ────────────────────────────────

const COLUMNS = {
  baptism: ['first_name', 'last_name', 'birth_date', 'reception_date', 'birthplace', 'entry_type', 'sponsors', 'parents', 'clergy', 'church_id', 'seed_run_id'],
  marriage: ['mdate', 'fname_groom', 'lname_groom', 'parentsg', 'fname_bride', 'lname_bride', 'parentsb', 'witness', 'mlicense', 'clergy', 'church_id', 'seed_run_id'],
  funeral: ['deceased_date', 'burial_date', 'name', 'lastname', 'age', 'clergy', 'burial_location', 'church_id', 'seed_run_id'],
};

const TABLE_NAMES = {
  baptism: 'baptism_records',
  marriage: 'marriage_records',
  funeral: 'funeral_records',
};

// ─── Seed Run Tracking ──────────────────────────────────────────────────────

async function createSeedRun(pool, { mode, filters, options, startedBy, taskId }) {
  const [result] = await pool.query(
    `INSERT INTO om_seedling_runs (mode, status, task_id, started_by, started_at, filters_json, options_json)
     VALUES (?, 'running', ?, ?, UTC_TIMESTAMP(), ?, ?)`,
    [mode, taskId || null, startedBy || 'cli', JSON.stringify(filters), JSON.stringify(options)]
  );
  return result.insertId;
}

async function updateSeedRun(pool, runId, updates) {
  const sets = [];
  const params = [];
  for (const [key, val] of Object.entries(updates)) {
    if (key === 'report_json') {
      sets.push(`${key} = ?`);
      params.push(typeof val === 'string' ? val : JSON.stringify(val));
    } else {
      sets.push(`${key} = ?`);
      params.push(val);
    }
  }
  if (sets.length === 0) return;
  params.push(runId);
  await pool.query(`UPDATE om_seedling_runs SET ${sets.join(', ')} WHERE id = ?`, params);
}

async function finalizeSeedRun(pool, runId, report) {
  const s = report.summary;
  const inserts = s.inserted || s.projected_inserts || {};
  const isExecute = report.mode === 'execute';

  await updateSeedRun(pool, runId, {
    status: report.status || (isExecute && s.failed > 0 ? (s.inserted?.churches > 0 ? 'partial' : 'failed') : 'succeeded'),
    finished_at: new Date().toISOString().replace('T', ' ').replace('Z', ''),
    duration_ms: report.duration_ms || 0,
    projected_baptism: isExecute ? 0 : (inserts.baptism || 0),
    projected_marriage: isExecute ? 0 : (inserts.marriage || 0),
    projected_funeral: isExecute ? 0 : (inserts.funeral || 0),
    projected_total: isExecute ? 0 : (inserts.total || 0),
    actual_baptism: isExecute ? (inserts.baptism || 0) : 0,
    actual_marriage: isExecute ? (inserts.marriage || 0) : 0,
    actual_funeral: isExecute ? (inserts.funeral || 0) : 0,
    actual_total: isExecute ? (inserts.total || 0) : 0,
    churches_attempted: s.total_candidates || 0,
    churches_succeeded: isExecute ? (inserts.churches || 0) : (s.total_candidates || 0),
    churches_skipped: s.total_skipped || 0,
    churches_failed: s.failed || 0,
    report_json: report,
    error_message: report.error || null,
  });
}

// ─── Task Runner helpers ────────────────────────────────────────────────────

function loadTaskRunner() {
  try { return require('../taskRunner'); }
  catch { return null; }
}

async function createTaskIfAvailable(pool, { mode, filters, totalCount, startedBy }) {
  const tr = loadTaskRunner();
  if (!tr) return null;
  return await tr.createTask(pool, {
    task_type: 'om_seedlings',
    source_feature: 'om-seedlings',
    title: `OM Seedlings ${mode} — ${totalCount} churches`,
    total_count: totalCount,
    created_by_name: startedBy || 'cli',
    metadata_json: JSON.stringify({ mode, filters }),
  });
}

// ─── Dry Run ────────────────────────────────────────────────────────────────

async function dryRun(filters = {}, options = {}) {
  const pool = getAppPool();
  const recordTypes = options.recordTypes || ['baptism', 'marriage', 'funeral'];
  const startTime = Date.now();

  const { candidates, skipped } = await buildCandidateList(filters, {
    allowFallback: options.allowFallback || false,
    allowSeeded: options.allowSeeded || false,
  });

  // Create seed run record
  const runId = await createSeedRun(pool, { mode: 'dry_run', filters, options, startedBy: options.startedBy });

  const churchPlans = [];
  const totals = { baptism: 0, marriage: 0, funeral: 0, total: 0, churches: 0 };

  for (const candidate of candidates) {
    const typesToGen = recordTypes.filter(t => candidate.available_types.includes(t));
    const plan = computeTargetCounts(candidate.established_year, candidate.size_category, {
      fromYear: options.fromYear || candidate.established_year,
      toYear: options.toYear || new Date().getFullYear(),
      recordTypes: typesToGen,
    });

    const churchPlan = {
      church_id: candidate.church_id,
      church_name: candidate.church_name,
      db_name: candidate.db_name,
      city: candidate.city,
      state: candidate.state,
      jurisdiction: candidate.jurisdiction,
      onboarding_phase: candidate.onboarding_phase,
      established_year: candidate.established_year,
      established_source: candidate.established_source,
      established_confidence: candidate.established_confidence,
      size_category: candidate.size_category,
      size_label: plan.sizeLabel,
      size_source: candidate.size_source,
      year_span: plan.yearSpan,
      projected: plan.totals,
      projected_total: Object.values(plan.totals).reduce((a, b) => a + b, 0),
      existing_counts: candidate.existing_counts,
      warnings: candidate.warnings,
      record_types: typesToGen,
    };

    churchPlans.push(churchPlan);
    totals.baptism += plan.totals.baptism || 0;
    totals.marriage += plan.totals.marriage || 0;
    totals.funeral += plan.totals.funeral || 0;
    totals.total += churchPlan.projected_total;
    totals.churches++;
  }

  const report = {
    mode: 'dry_run',
    run_id: runId,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    filters,
    options: { allowFallback: !!options.allowFallback, allowSeeded: !!options.allowSeeded, recordTypes },
    summary: { total_candidates: candidates.length, total_skipped: skipped.length, projected_inserts: totals },
    churches: churchPlans,
    skipped,
  };

  await finalizeSeedRun(pool, runId, report);
  return report;
}

// ─── Execute ────────────────────────────────────────────────────────────────

async function execute(filters = {}, options = {}) {
  const pool = getAppPool();
  const recordTypes = options.recordTypes || ['baptism', 'marriage', 'funeral'];
  const batchSize = options.batchSize || 500;
  const maxChurches = options.maxChurches || Infinity;
  const errorThreshold = options.errorThreshold || Infinity;
  const delayMs = options.delayMs || 0;
  const startTime = Date.now();

  const { candidates, skipped } = await buildCandidateList(filters, {
    allowFallback: options.allowFallback || false,
    allowSeeded: options.allowSeeded || false,
  });

  // Enforce max churches
  const effectiveCandidates = candidates.slice(0, maxChurches);
  if (candidates.length > maxChurches) {
    for (let i = maxChurches; i < candidates.length; i++) {
      skipped.push({
        church_id: candidates[i].church_id,
        name: candidates[i].church_name,
        reason: `Exceeded --max-churches=${maxChurches}`,
        db_name: candidates[i].db_name,
      });
    }
  }

  // Create Task Runner job
  const taskId = await createTaskIfAvailable(pool, {
    mode: 'execute',
    filters,
    totalCount: effectiveCandidates.length,
    startedBy: options.startedBy,
  });

  // Create seed run record
  const runId = await createSeedRun(pool, {
    mode: 'execute', filters, options,
    startedBy: options.startedBy,
    taskId,
  });

  const tr = loadTaskRunner();
  const taskUpdate = (taskId && tr) ? (u) => tr.updateTask(pool, taskId, u).catch(() => {}) : () => {};
  const taskEvent = (taskId && tr) ? (o) => tr.addTaskEvent(pool, taskId, o).catch(() => {}) : () => {};

  await taskUpdate({ status: 'running', stage: 'Seeding churches', total_count: effectiveCandidates.length, message: `Seeding ${effectiveCandidates.length} churches (run #${runId})` });

  const results = [];
  const totals = { baptism: 0, marriage: 0, funeral: 0, total: 0, churches: 0, failed: 0 };
  let cancelled = false;

  for (let idx = 0; idx < effectiveCandidates.length; idx++) {
    const candidate = effectiveCandidates[idx];

    // ── Cancellation check ──
    if (taskId && tr) {
      if (await tr.isCancelled(pool, taskId)) {
        cancelled = true;
        await taskEvent({ level: 'warning', stage: 'cancelled', message: `Cancelled after ${idx} of ${effectiveCandidates.length} churches` });
        break;
      }
    }

    // ── Error threshold check ──
    if (totals.failed >= errorThreshold) {
      await taskEvent({ level: 'error', stage: 'threshold', message: `Error threshold ${errorThreshold} reached — stopping` });
      break;
    }

    const typesToGen = recordTypes.filter(t => candidate.available_types.includes(t));
    const churchResult = {
      church_id: candidate.church_id,
      church_name: candidate.church_name,
      db_name: candidate.db_name,
      established_year: candidate.established_year,
      size_category: candidate.size_category,
      inserted: { baptism: 0, marriage: 0, funeral: 0 },
      total_inserted: 0,
      status: 'pending',
      error: null,
      warnings: [...candidate.warnings],
      duration_ms: 0,
    };

    const churchStart = Date.now();

    try {
      // ── Preflight safety check (re-verify at execute time) ──
      const dbCheck = await verifyTenantDb(candidate.db_name);
      if (!dbCheck.exists) throw new Error(`Preflight: tenant DB ${candidate.db_name} no longer exists`);
      for (const type of typesToGen) {
        if (!dbCheck.tables[TABLE_NAMES[type]]) throw new Error(`Preflight: ${TABLE_NAMES[type]} missing in ${candidate.db_name}`);
      }

      // Compute plan
      const plan = computeTargetCounts(candidate.established_year, candidate.size_category, {
        fromYear: options.fromYear || candidate.established_year,
        toYear: options.toYear || new Date().getFullYear(),
        recordTypes: typesToGen,
      });

      // Generate records (with seed_run_id tag)
      const records = generateRecordsForChurch(plan.byYear, candidate.church_id, typesToGen);

      // Tag every record with seed_run_id for rollback traceability
      for (const type of typesToGen) {
        for (const rec of (records[type] || [])) {
          rec.seed_run_id = runId;
        }
      }

      // Get tenant pool and insert with transaction
      const tenantPool = getTenantPool(candidate.church_id);
      const conn = await tenantPool.getConnection();

      try {
        await conn.beginTransaction();

        for (const type of typesToGen) {
          const recs = records[type];
          if (!recs || recs.length === 0) continue;
          const cols = COLUMNS[type];
          const table = TABLE_NAMES[type];

          for (let i = 0; i < recs.length; i += batchSize) {
            const batch = recs.slice(i, i + batchSize);
            const placeholders = batch.map(() => `(${cols.map(() => '?').join(',')})`).join(',');
            const values = batch.flatMap(r => cols.map(c => r[c] ?? null));
            await conn.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${placeholders}`, values);
          }

          churchResult.inserted[type] = recs.length;
        }

        await conn.commit();
        churchResult.status = 'success';
        churchResult.total_inserted = Object.values(churchResult.inserted).reduce((a, b) => a + b, 0);
        totals.baptism += churchResult.inserted.baptism;
        totals.marriage += churchResult.inserted.marriage;
        totals.funeral += churchResult.inserted.funeral;
        totals.total += churchResult.total_inserted;
        totals.churches++;

      } catch (insertErr) {
        await conn.rollback();
        throw insertErr;
      } finally {
        conn.release();
      }

    } catch (err) {
      churchResult.status = 'failed';
      churchResult.error = err.message;
      totals.failed++;
      console.error(`[OM Seedlings] Failed church ${candidate.church_id} (${candidate.church_name}):`, err.message);
      await taskEvent({ level: 'error', stage: 'insert', message: `${candidate.church_name} — ${err.message}` });

      if (options.failFast) {
        churchResult.duration_ms = Date.now() - churchStart;
        results.push(churchResult);
        break;
      }
    }

    churchResult.duration_ms = Date.now() - churchStart;
    results.push(churchResult);

    // Task Runner progress
    const sym = churchResult.status === 'success' ? 'ok' : 'fail';
    await taskUpdate({
      completed_count: idx + 1,
      success_count: totals.churches,
      failure_count: totals.failed,
      message: `[${idx + 1}/${effectiveCandidates.length}] ${candidate.church_name} — ${churchResult.total_inserted} records (${sym})`,
    });

    if (options.onProgress) {
      try { options.onProgress(churchResult); } catch { /* ignore */ }
    }

    // Inter-church delay
    if (delayMs > 0 && idx < effectiveCandidates.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  const finalStatus = cancelled ? 'cancelled' : totals.failed > 0 ? (totals.churches > 0 ? 'partial' : 'failed') : 'succeeded';

  const report = {
    mode: 'execute',
    run_id: runId,
    task_id: taskId,
    status: finalStatus,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    filters,
    options: { allowFallback: !!options.allowFallback, allowSeeded: !!options.allowSeeded, recordTypes, batchSize, maxChurches: maxChurches === Infinity ? null : maxChurches, errorThreshold: errorThreshold === Infinity ? null : errorThreshold },
    summary: {
      total_candidates: effectiveCandidates.length,
      total_skipped: skipped.length,
      inserted: totals,
      failed: totals.failed,
    },
    results,
    skipped,
  };

  // Finalize seed run + task
  await finalizeSeedRun(pool, runId, report);
  await taskUpdate({
    status: finalStatus === 'succeeded' ? 'succeeded' : finalStatus === 'cancelled' ? 'cancelled' : 'failed',
    stage: 'Complete',
    completed_count: effectiveCandidates.length,
    success_count: totals.churches,
    failure_count: totals.failed,
    message: `Done: ${totals.total} records across ${totals.churches} churches (${totals.failed} failed)`,
    result_json: { run_id: runId, ...totals },
  });

  return report;
}

// ─── Purge by Run ───────────────────────────────────────────────────────────

/**
 * Delete all records tagged with a specific seed_run_id from all tenant DBs.
 * This is the rollback mechanism — only works for records that have seed_run_id set.
 *
 * @param {number} runId - The seed run ID to purge
 * @returns {Promise<object>} Purge summary
 */
async function purgeByRun(runId) {
  const pool = getAppPool();

  // Verify the run exists
  const [[run]] = await pool.query('SELECT * FROM om_seedling_runs WHERE id = ?', [runId]);
  if (!run) throw new Error(`Seed run #${runId} not found`);
  if (run.mode !== 'execute') throw new Error(`Run #${runId} is a ${run.mode} — only execute runs can be purged`);

  // Find all Phase 2 churches with their tenant DBs
  const [churches] = await pool.query('SELECT id, db_name FROM churches WHERE onboarding_phase = 2 AND db_name IS NOT NULL');

  const purgeResults = [];
  let totalDeleted = 0;

  for (const church of churches) {
    const churchDeleted = { church_id: church.id, db_name: church.db_name, baptism: 0, marriage: 0, funeral: 0 };
    let hadRecords = false;

    for (const type of ['baptism', 'marriage', 'funeral']) {
      try {
        const [result] = await pool.query(
          `DELETE FROM \`${church.db_name}\`.${TABLE_NAMES[type]} WHERE seed_run_id = ?`,
          [runId]
        );
        churchDeleted[type] = result.affectedRows;
        if (result.affectedRows > 0) hadRecords = true;
        totalDeleted += result.affectedRows;
      } catch {
        // Table may not exist or column missing — skip silently
      }
    }

    if (hadRecords) purgeResults.push(churchDeleted);
  }

  // Update run status
  await updateSeedRun(pool, runId, {
    status: 'cancelled',
    error_message: `Purged at ${new Date().toISOString()} — ${totalDeleted} records deleted`,
  });

  return {
    run_id: runId,
    total_deleted: totalDeleted,
    churches_affected: purgeResults.length,
    details: purgeResults,
  };
}

// ─── Run History ────────────────────────────────────────────────────────────

async function getRunHistory(limit = 20, offset = 0) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT id, mode, status, task_id, started_by, started_at, finished_at, duration_ms,
            filters_json, options_json,
            projected_baptism, projected_marriage, projected_funeral, projected_total,
            actual_baptism, actual_marriage, actual_funeral, actual_total,
            churches_attempted, churches_succeeded, churches_skipped, churches_failed,
            error_message
     FROM om_seedling_runs
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM om_seedling_runs');
  return { runs: rows, total };
}

async function getRunById(runId) {
  const pool = getAppPool();
  const [[run]] = await pool.query('SELECT * FROM om_seedling_runs WHERE id = ?', [runId]);
  return run || null;
}

module.exports = { dryRun, execute, purgeByRun, getRunHistory, getRunById };
