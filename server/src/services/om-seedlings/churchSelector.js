/**
 * Church Selector — Identifies and validates Phase 2 candidate churches
 *
 * Queries churches in onboarding Phase 2, verifies tenant DBs exist,
 * resolves enrichment data (established year, size), and produces a
 * validated candidate list for seeding.
 */

const { getAppPool, getTenantPool } = require('../../config/db');
const { inferSizeFromName } = require('./scopeMatrix');

// ─── Fetch Phase 2 churches with enrichment ─────────────────────────────────

/**
 * Get all Phase 2 churches joined with enrichment data.
 *
 * @param {object} [filters]
 * @param {number} [filters.churchId] - Single church ID
 * @param {string} [filters.jurisdiction] - Jurisdiction filter (LIKE match)
 * @param {string} [filters.state] - State/province exact match
 * @param {number} [filters.limit] - Max churches to return
 * @returns {Promise<object[]>} Raw church rows with enrichment fields
 */
async function fetchPhase2Churches(filters = {}) {
  const pool = getAppPool();
  const conditions = ['c.onboarding_phase = 2'];
  const params = [];

  if (filters.churchId) {
    conditions.push('c.id = ?');
    params.push(filters.churchId);
  }
  if (filters.jurisdiction) {
    conditions.push('c.jurisdiction LIKE ?');
    params.push(`%${filters.jurisdiction}%`);
  }
  if (filters.state) {
    conditions.push('c.state_province = ?');
    params.push(filters.state);
  }

  let sql = `
    SELECT
      c.id AS church_id,
      c.church_name,
      c.name,
      c.city,
      c.state_province,
      c.jurisdiction,
      c.db_name,
      c.database_name,
      c.population_bracket,
      c.onboarding_phase,
      c.crm_lead_id,
      c.has_baptism_records,
      c.has_marriage_records,
      c.has_funeral_records,
      ep.established_year,
      ep.established_date_precision,
      ep.established_confidence,
      ep.established_source_type,
      ep.size_category,
      ep.size_confidence,
      ep.manual_established_year,
      ep.manual_size_category,
      ep.enrichment_status
    FROM churches c
    LEFT JOIN church_enrichment_profiles ep ON ep.church_id = c.crm_lead_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.id`;

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }

  const [rows] = await pool.query(sql, params);
  return rows;
}

// ─── Verify tenant DB and record tables ─────────────────────────────────────

async function verifyTenantDb(dbName) {
  const pool = getAppPool();
  try {
    const [dbs] = await pool.query('SHOW DATABASES LIKE ?', [dbName]);
    if (dbs.length === 0) return { exists: false, tables: {} };

    // Check for record tables
    const [tables] = await pool.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('baptism_records','marriage_records','funeral_records')`,
      [dbName]
    );
    const tableSet = new Set(tables.map(t => t.TABLE_NAME));

    return {
      exists: true,
      tables: {
        baptism_records: tableSet.has('baptism_records'),
        marriage_records: tableSet.has('marriage_records'),
        funeral_records: tableSet.has('funeral_records'),
      },
    };
  } catch (err) {
    return { exists: false, error: err.message, tables: {} };
  }
}

// ─── Check existing record counts (duplicate protection) ────────────────────

async function getExistingRecordCounts(churchId, dbName) {
  try {
    const pool = getTenantPool(churchId);
    const counts = {};
    for (const type of ['baptism', 'marriage', 'funeral']) {
      const table = `${type}_records`;
      try {
        const [[row]] = await pool.query(`SELECT COUNT(*) AS c FROM ${table}`);
        counts[type] = row.c;
      } catch {
        counts[type] = -1; // table missing or error
      }
    }
    return counts;
  } catch (err) {
    return { baptism: -1, marriage: -1, funeral: -1, error: err.message };
  }
}

// ─── Build validated candidate list ─────��───────────────────────────────────

/**
 * Produces a list of validated candidate churches ready for seeding.
 * Each candidate includes resolved established year, size category,
 * DB verification, existing counts, and any warnings.
 *
 * @param {object} [filters] - Same as fetchPhase2Churches
 * @param {object} [options]
 * @param {boolean} [options.allowFallback] - Allow heuristic fallback for missing data
 * @param {boolean} [options.allowSeeded] - Allow churches that already have records
 * @returns {Promise<{ candidates: object[], skipped: object[] }>}
 */
async function buildCandidateList(filters = {}, options = {}) {
  const churches = await fetchPhase2Churches(filters);
  const candidates = [];
  const skipped = [];

  for (const church of churches) {
    const warnings = [];
    const dbName = church.db_name || church.database_name;

    // 1. Verify tenant DB
    const dbCheck = await verifyTenantDb(dbName);
    if (!dbCheck.exists) {
      skipped.push({ church_id: church.church_id, name: church.church_name, reason: 'Tenant DB does not exist', db_name: dbName });
      continue;
    }

    // 2. Check record tables
    const missingTables = [];
    if (!dbCheck.tables.baptism_records) missingTables.push('baptism_records');
    if (!dbCheck.tables.marriage_records) missingTables.push('marriage_records');
    if (!dbCheck.tables.funeral_records) missingTables.push('funeral_records');
    if (missingTables.length === 3) {
      skipped.push({ church_id: church.church_id, name: church.church_name, reason: 'All record tables missing', db_name: dbName });
      continue;
    }
    if (missingTables.length > 0) {
      warnings.push(`Missing tables: ${missingTables.join(', ')}`);
    }

    // 3. Resolve established year
    let establishedYear = church.manual_established_year || church.established_year;
    let establishedSource = church.established_source_type || 'enrichment';
    let establishedConfidence = church.established_confidence || 'unknown';

    if (!establishedYear) {
      if (options.allowFallback) {
        // Use heuristic from fastEstablishedDateService
        const { inferEstablishedYear } = require('./scopeMatrix');
        // Simple heuristic based on church type from name
        const name = (church.church_name || '').toLowerCase();
        if (/cathedral/.test(name)) {
          establishedYear = 1910 + Math.floor(Math.random() * 30);
        } else if (/mission/.test(name)) {
          establishedYear = 1975 + Math.floor(Math.random() * 30);
        } else if (/chapel|skete|hermitage/.test(name)) {
          establishedYear = 1970 + Math.floor(Math.random() * 30);
        } else {
          establishedYear = 1940 + Math.floor(Math.random() * 40);
        }
        establishedSource = 'inferred';
        establishedConfidence = 'low';
        warnings.push(`Established year inferred as ${establishedYear} (no enrichment data)`);
      } else {
        skipped.push({ church_id: church.church_id, name: church.church_name, reason: 'Missing established year (use --allow-fallback to infer)', db_name: dbName });
        continue;
      }
    }

    // Sanity check: year in future or unreasonable
    const currentYear = new Date().getFullYear();
    if (establishedYear > currentYear) {
      warnings.push(`Established year ${establishedYear} is in the future — clamping to ${currentYear}`);
      establishedYear = currentYear;
    }
    if (establishedYear < 1700) {
      warnings.push(`Established year ${establishedYear} seems too old — clamping to 1700`);
      establishedYear = 1700;
    }

    // 4. Resolve size category
    let sizeCategory = church.manual_size_category || church.size_category;
    let sizeSource = 'enrichment';

    if (!sizeCategory || sizeCategory === 'unknown') {
      if (options.allowFallback) {
        sizeCategory = inferSizeFromName(church.church_name);
        sizeSource = 'inferred_from_name';
        warnings.push(`Size inferred as '${sizeCategory}' from church name`);
      } else {
        // Use name inference even without fallback — size is less critical
        sizeCategory = inferSizeFromName(church.church_name);
        sizeSource = 'inferred_from_name';
        warnings.push(`Size inferred as '${sizeCategory}' from church name (no enrichment data)`);
      }
    }

    // 5. Check existing records (duplicate protection)
    const existingCounts = await getExistingRecordCounts(church.church_id, dbName);
    const totalExisting = Object.values(existingCounts).reduce((a, b) => a + Math.max(0, b), 0);
    if (totalExisting > 0 && !options.allowSeeded) {
      skipped.push({
        church_id: church.church_id,
        name: church.church_name,
        reason: `Already has ${totalExisting} records (use --allow-seeded to override)`,
        db_name: dbName,
        existing: existingCounts,
      });
      continue;
    }
    if (totalExisting > 0) {
      warnings.push(`Already has ${totalExisting} existing records (${existingCounts.baptism}B/${existingCounts.marriage}M/${existingCounts.funeral}F)`);
    }

    // 6. Determine available record types
    const availableTypes = [];
    if (dbCheck.tables.baptism_records) availableTypes.push('baptism');
    if (dbCheck.tables.marriage_records) availableTypes.push('marriage');
    if (dbCheck.tables.funeral_records) availableTypes.push('funeral');

    candidates.push({
      church_id: church.church_id,
      church_name: church.church_name,
      city: church.city,
      state: church.state_province,
      jurisdiction: church.jurisdiction,
      db_name: dbName,
      onboarding_phase: church.onboarding_phase,
      established_year: establishedYear,
      established_source: establishedSource,
      established_confidence: establishedConfidence,
      size_category: sizeCategory,
      size_source: sizeSource,
      available_types: availableTypes,
      existing_counts: existingCounts,
      warnings,
    });
  }

  return { candidates, skipped };
}

// ─── Lightweight church list for map + eligibility table ────────────────────

/**
 * Returns Phase 2 churches with coordinates, enrichment data, existing
 * record counts, and eligibility status. Designed for the map/table UI —
 * does batch DB verification instead of per-church for performance.
 *
 * @param {object} [filters] - Same as fetchPhase2Churches
 * @returns {Promise<object>} { churches, summary }
 */
async function getChurchesForMap(filters = {}) {
  const pool = getAppPool();

  // 1. Fetch Phase 2 churches with coordinates + enrichment
  const conditions = ['c.onboarding_phase = 2'];
  const params = [];

  if (filters.churchId) {
    conditions.push('c.id = ?');
    params.push(filters.churchId);
  }
  if (filters.jurisdiction) {
    conditions.push('c.jurisdiction LIKE ?');
    params.push(`%${filters.jurisdiction}%`);
  }
  if (filters.state) {
    conditions.push('c.state_province = ?');
    params.push(filters.state);
  }

  const sql = `
    SELECT
      c.id AS church_id,
      c.church_name,
      c.city,
      c.state_province,
      c.jurisdiction,
      c.db_name,
      c.database_name,
      c.population_bracket,
      c.onboarding_phase,
      c.crm_lead_id,
      c.latitude,
      c.longitude,
      c.has_baptism_records,
      c.has_marriage_records,
      c.has_funeral_records,
      ep.established_year,
      ep.established_date_precision,
      ep.established_confidence,
      ep.established_source_type,
      ep.size_category,
      ep.size_confidence,
      ep.manual_established_year,
      ep.manual_size_category,
      ep.enrichment_status
    FROM churches c
    LEFT JOIN church_enrichment_profiles ep ON ep.church_id = c.crm_lead_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.state_province, c.church_name`;

  const [churches] = await pool.query(sql, params);

  // 2. Batch-check which tenant DBs exist
  const [allDbs] = await pool.query('SHOW DATABASES');
  const dbSet = new Set(allDbs.map(r => Object.values(r)[0]));

  // 3. Extract per-church seed history from om_seedling_runs report_json
  //    Only look at execute runs that succeeded or partially succeeded
  const seedHistory = await buildSeedHistory(pool);

  // 4. Build result with readiness computation
  const result = [];
  const summary = {
    total: churches.length,
    eligible: 0,
    has_records: 0,
    missing_db: 0,
    missing_established: 0,
    missing_size: 0,
    by_state: {},
    by_jurisdiction: {},
    // Readiness summary
    readiness: {
      not_ready: 0,
      ready_dry_run: 0,
      ready_execute: 0,
      seeded: 0,
      review_required: 0,
    },
  };

  for (const ch of churches) {
    const dbName = ch.db_name || ch.database_name;
    const hasDb = dbSet.has(dbName);

    // Resolve established year
    const establishedYear = ch.manual_established_year || ch.established_year || null;
    const sizeCategory = ch.manual_size_category || ch.size_category || null;
    const hasSize = sizeCategory && sizeCategory !== 'unknown';

    // Check existing records if DB exists
    let existingCounts = { baptism: 0, marriage: 0, funeral: 0 };
    let totalExisting = 0;
    let hasSeededRecords = false;
    if (hasDb) {
      try {
        const countSql = `
          SELECT
            (SELECT COUNT(*) FROM \`${dbName}\`.baptism_records) AS baptism,
            (SELECT COUNT(*) FROM \`${dbName}\`.marriage_records) AS marriage,
            (SELECT COUNT(*) FROM \`${dbName}\`.funeral_records) AS funeral,
            (SELECT COUNT(*) FROM \`${dbName}\`.baptism_records WHERE seed_run_id IS NOT NULL) +
            (SELECT COUNT(*) FROM \`${dbName}\`.marriage_records WHERE seed_run_id IS NOT NULL) +
            (SELECT COUNT(*) FROM \`${dbName}\`.funeral_records WHERE seed_run_id IS NOT NULL) AS seeded_total`;
        const [[counts]] = await pool.query(countSql);
        existingCounts = { baptism: counts.baptism, marriage: counts.marriage, funeral: counts.funeral };
        totalExisting = counts.baptism + counts.marriage + counts.funeral;
        hasSeededRecords = counts.seeded_total > 0;
      } catch {
        // Tables may not exist — treat as 0
      }
    }

    // Determine eligibility (unchanged from Phase 4)
    const issues = [];
    if (!hasDb) issues.push('no_tenant_db');
    if (!establishedYear) issues.push('no_established_year');
    if (!hasSize) issues.push('no_size_category');
    if (totalExisting > 0) issues.push('has_existing_records');

    const eligible = issues.length === 0 || (issues.length === 1 && issues[0] === 'has_existing_records');

    // Get seed run history for this church
    const history = seedHistory[ch.church_id] || null;

    // ── Compute readiness status ──
    // Readiness is distinct from eligibility:
    //   eligibility = "can this church theoretically be seeded?"
    //   readiness   = "is this church currently in a safe state to proceed?"
    const readinessReasons = [];
    let readinessStatus;

    if (hasSeededRecords) {
      // Church has seeded records — check if it needs review
      if (history && (history.status === 'partial' || history.status === 'failed')) {
        readinessStatus = 'review_required';
        readinessReasons.push('Last seed run was ' + history.status);
      } else {
        readinessStatus = 'seeded';
        if (history) readinessReasons.push(`Seeded in run #${history.run_id}`);
      }
    } else if (!hasDb) {
      readinessStatus = 'not_ready';
      readinessReasons.push('No tenant database — needs provisioning');
    } else if (!establishedYear) {
      readinessStatus = 'not_ready';
      readinessReasons.push('Missing established year — needs enrichment');
    } else if (!hasSize) {
      // Has DB + established year, but missing size.
      // Size can be inferred via fallback, so ready for dry run but not full execute.
      readinessStatus = 'ready_dry_run';
      readinessReasons.push('Missing size category — dry run will use fallback inference');
    } else {
      // Fully enriched, has DB, has established year + size
      readinessStatus = 'ready_execute';
    }

    // Determine next recommended action
    let nextAction;
    switch (readinessStatus) {
      case 'not_ready':
        if (!hasDb) nextAction = 'provision_db';
        else if (!establishedYear) nextAction = 'enrich_established_year';
        break;
      case 'ready_dry_run':
        nextAction = hasSize ? 'dry_run' : 'enrich_size';
        break;
      case 'ready_execute':
        nextAction = 'dry_run';
        break;
      case 'seeded':
        nextAction = 'review_seeded';
        break;
      case 'review_required':
        nextAction = 'review_failed_run';
        break;
    }

    // State/jurisdiction summary
    const state = ch.state_province || 'Unknown';
    const juris = ch.jurisdiction || 'Unknown';
    summary.by_state[state] = (summary.by_state[state] || 0) + 1;
    summary.by_jurisdiction[juris] = (summary.by_jurisdiction[juris] || 0) + 1;
    if (eligible) summary.eligible++;
    if (totalExisting > 0) summary.has_records++;
    if (!hasDb) summary.missing_db++;
    if (!establishedYear) summary.missing_established++;
    if (!hasSize) summary.missing_size++;
    summary.readiness[readinessStatus] = (summary.readiness[readinessStatus] || 0) + 1;

    result.push({
      church_id: ch.church_id,
      church_name: ch.church_name,
      city: ch.city,
      state: ch.state_province,
      jurisdiction: ch.jurisdiction,
      db_name: dbName,
      lat: ch.latitude ? parseFloat(ch.latitude) : null,
      lng: ch.longitude ? parseFloat(ch.longitude) : null,
      onboarding_phase: ch.onboarding_phase,
      crm_lead_id: ch.crm_lead_id,
      established_year: establishedYear,
      established_source: ch.established_source_type || null,
      established_confidence: ch.established_confidence || null,
      size_category: sizeCategory,
      enrichment_status: ch.enrichment_status || null,
      existing_counts: existingCounts,
      total_existing: totalExisting,
      has_tenant_db: hasDb,
      has_seeded_records: hasSeededRecords,
      // Eligibility (Phase 4 — can theoretically be seeded)
      eligible,
      eligibility_issues: issues,
      // Readiness (Phase 5 — safe to proceed right now)
      readiness_status: readinessStatus,
      readiness_reasons: readinessReasons,
      next_recommended_action: nextAction,
      // Seed history
      latest_run: history,
    });
  }

  return { churches: result, summary };
}

// ─── Build seed history from om_seedling_runs ──────────────────────────────

/**
 * Extract per-church seed run history from om_seedling_runs.report_json.
 * Returns a map of church_id → latest execute run info.
 */
async function buildSeedHistory(pool) {
  const history = {};
  try {
    const [runs] = await pool.query(
      `SELECT id, mode, status, started_at, finished_at, duration_ms, report_json
       FROM om_seedling_runs
       WHERE mode = 'execute' AND status IN ('succeeded', 'partial', 'failed')
       ORDER BY started_at DESC
       LIMIT 50`
    );

    for (const run of runs) {
      let report;
      try {
        report = typeof run.report_json === 'string' ? JSON.parse(run.report_json) : run.report_json;
      } catch { continue; }
      if (!report || !report.results) continue;

      for (const r of report.results) {
        // Only record the latest run per church (runs are sorted DESC)
        if (history[r.church_id]) continue;
        history[r.church_id] = {
          run_id: run.id,
          mode: run.mode,
          status: r.status === 'success' ? 'succeeded' : r.status,
          run_status: run.status,
          started_at: run.started_at,
          finished_at: run.finished_at,
          total_inserted: r.total_inserted || 0,
          inserted: r.inserted || { baptism: 0, marriage: 0, funeral: 0 },
          duration_ms: r.duration_ms || 0,
          error: r.error || null,
        };
      }
    }
  } catch {
    // If om_seedling_runs doesn't exist yet, return empty
  }
  return history;
}

module.exports = {
  fetchPhase2Churches,
  verifyTenantDb,
  getExistingRecordCounts,
  buildCandidateList,
  getChurchesForMap,
};
