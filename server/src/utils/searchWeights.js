/**
 * searchWeights.js — Drive search-result ranking from the per-field search
 * weights a church configures in the Database Mapping wizard ("Search
 * Configuration" step), stored in parish_settings under the 'mapping' category.
 *
 * Replaces the previously-hardcoded relevance tiers: each searchable text field
 * contributes  W*100 (exact) / W*40 (prefix) / W*8 (contains)  to the score,
 * where W is the configured weight (0–10). Fields with weight ≤ 0 are skipped.
 */

const { getAppPool } = require('../config/db-compat');
const { SEARCH_CONFIGS } = require('./recordSearch');

// Sensible defaults (match the wizard's FIELD_META) for churches with no saved
// search config. Only text columns matter for relevance.
const DEFAULT_WEIGHTS = {
  baptism: { first_name: 8, last_name: 10, clergy: 6, sponsors: 5, parents: 5, birthplace: 4 },
  marriage: { fname_groom: 8, lname_groom: 10, fname_bride: 8, lname_bride: 10, clergy: 6, witness: 5, parentsg: 4, parentsb: 4 },
  funeral: { name: 8, lastname: 10, clergy: 6, burial_location: 4 },
};

function safeParse(v) {
  if (v == null) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
}

/**
 * Load configured per-column search weights for a church + record type from the
 * 'mapping' parish settings (per-type key, else legacy 'config' blob), falling
 * back to DEFAULT_WEIGHTS for anything unset.
 * @returns {Promise<Record<string, number>>}
 */
async function loadSearchWeights(churchId, recordType) {
  const weights = { ...(DEFAULT_WEIGHTS[recordType] || {}) };
  if (!churchId) return weights;
  try {
    const [rows] = await getAppPool().query(
      'SELECT setting_key, value FROM parish_settings WHERE church_id = ? AND category = ?',
      [churchId, 'mapping']
    );
    let fields = null;
    const direct = rows.find((r) => r.setting_key === recordType);
    if (direct) {
      const v = safeParse(direct.value);
      if (v && Array.isArray(v.fields)) fields = v.fields;
    }
    if (!fields) {
      const legacy = rows.find((r) => r.setting_key === 'config');
      if (legacy) {
        const v = safeParse(legacy.value);
        if (v && v.selectedRecord === recordType && Array.isArray(v.fields)) fields = v.fields;
      }
    }
    if (fields) {
      for (const f of fields) {
        if (f && f.column && typeof f.searchWeight === 'number') weights[f.column] = f.searchWeight;
      }
    }
  } catch (e) {
    console.warn(`loadSearchWeights failed for church ${churchId} (${recordType}):`, e.message);
  }
  return weights;
}

/**
 * Build a weighted relevance SQL expression over a record type's searchable
 * text fields. Every placeholder binds the same search term, so the caller only
 * needs the field count (× 3 placeholders) to fill params.
 * @returns {{ expr: string, fieldCount: number }} expr already aliased
 */
function buildRelevanceExpr(recordType, weights, alias) {
  const cfg = SEARCH_CONFIGS[recordType];
  const parts = [];
  let fieldCount = 0;
  if (cfg) {
    for (const col of cfg.textFields) {
      const w = Number(weights[col] ?? 0);
      if (!(w > 0)) continue;
      const exact = Math.round(w * 100);
      const prefix = Math.round(w * 40);
      const contains = Math.round(w * 8);
      parts.push(
        `(CASE WHEN LOWER(\`${col}\`) = LOWER(?) THEN ${exact} ` +
        `WHEN LOWER(\`${col}\`) LIKE CONCAT(LOWER(?), '%') THEN ${prefix} ` +
        `WHEN LOWER(\`${col}\`) LIKE CONCAT('%', LOWER(?), '%') THEN ${contains} ELSE 0 END)`
      );
      fieldCount++;
    }
  }
  const expr = parts.length ? `(${parts.join(' + ')})` : '0';
  return { expr: `${expr} AS ${alias}`, fieldCount };
}

module.exports = { loadSearchWeights, buildRelevanceExpr, DEFAULT_WEIGHTS };
