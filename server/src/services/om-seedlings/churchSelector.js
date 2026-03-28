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

  // 3. Batch-check existing record counts via cross-DB queries
  const result = [];
  const summary = {
    total: churches.length,
    eligible: 0,
    has_records: 0,
    missing_db: 0,
    missing_established: 0,
    by_state: {},
    by_jurisdiction: {},
  };

  for (const ch of churches) {
    const dbName = ch.db_name || ch.database_name;
    const hasDb = dbSet.has(dbName);

    // Resolve established year
    const establishedYear = ch.manual_established_year || ch.established_year || null;
    const sizeCategory = ch.manual_size_category || ch.size_category || null;

    // Check existing records if DB exists
    let existingCounts = { baptism: 0, marriage: 0, funeral: 0 };
    let totalExisting = 0;
    if (hasDb) {
      try {
        const countSql = `
          SELECT
            (SELECT COUNT(*) FROM \`${dbName}\`.baptism_records) AS baptism,
            (SELECT COUNT(*) FROM \`${dbName}\`.marriage_records) AS marriage,
            (SELECT COUNT(*) FROM \`${dbName}\`.funeral_records) AS funeral`;
        const [[counts]] = await pool.query(countSql);
        existingCounts = { baptism: counts.baptism, marriage: counts.marriage, funeral: counts.funeral };
        totalExisting = counts.baptism + counts.marriage + counts.funeral;
      } catch {
        // Tables may not exist — treat as 0
      }
    }

    // Determine eligibility
    const issues = [];
    if (!hasDb) issues.push('no_tenant_db');
    if (!establishedYear) issues.push('no_established_year');
    if (!sizeCategory || sizeCategory === 'unknown') issues.push('no_size_category');
    if (totalExisting > 0) issues.push('has_existing_records');

    const eligible = issues.length === 0 || (issues.length === 1 && issues[0] === 'has_existing_records');

    // State/jurisdiction summary
    const state = ch.state_province || 'Unknown';
    const juris = ch.jurisdiction || 'Unknown';
    summary.by_state[state] = (summary.by_state[state] || 0) + 1;
    summary.by_jurisdiction[juris] = (summary.by_jurisdiction[juris] || 0) + 1;
    if (eligible) summary.eligible++;
    if (totalExisting > 0) summary.has_records++;
    if (!hasDb) summary.missing_db++;
    if (!establishedYear) summary.missing_established++;

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
      eligible,
      eligibility_issues: issues,
    });
  }

  return { churches: result, summary };
}

module.exports = {
  fetchPhase2Churches,
  verifyTenantDb,
  getExistingRecordCounts,
  buildCandidateList,
  getChurchesForMap,
};
