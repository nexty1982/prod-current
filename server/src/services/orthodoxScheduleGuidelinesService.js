/**
 * Orthodox Schedule Guidelines Service
 *
 * Read-only DB access layer for the orthodox_schedule_guidelines table.
 * Returns church-specific + global guideline rows with deterministic
 * merge logic. The frontend adapter normalises this into calendar data.
 */

const { getAppPool } = require('../config/db-compat');

/**
 * Build a composite merge key for deduplication.
 * Church-specific rows override global rows that share the same key.
 */
function mergeKey(row) {
  return `${row.guideline_year}|${row.calendar_type}|${row.event_key}|${row.start_date}|${row.end_date}`;
}

/**
 * Fetch orthodox schedule guidelines from the database.
 *
 * @param {Object} opts
 * @param {number|null} opts.churchId  - Church ID (null = global only)
 * @param {number}      opts.year      - Guideline year
 * @param {string}      opts.calendarType - 'old' | 'new'
 * @returns {Promise<{ rows: Object[], hasData: boolean }>}
 */
async function getGuidelines({ churchId, year, calendarType }) {
  const pool = getAppPool();

  // churchId=0 means global-only (no church-specific filtering)
  const sql = churchId
    ? `SELECT *
         FROM orthodox_schedule_guidelines
        WHERE guideline_year = ?
          AND calendar_type  = ?
          AND is_active       = 1
          AND (church_id = ? OR church_id IS NULL)
        ORDER BY sort_order ASC, start_date ASC, id ASC`
    : `SELECT *
         FROM orthodox_schedule_guidelines
        WHERE guideline_year = ?
          AND calendar_type  = ?
          AND is_active       = 1
          AND church_id IS NULL
        ORDER BY sort_order ASC, start_date ASC, id ASC`;

  const params = churchId ? [year, calendarType, churchId] : [year, calendarType];
  const [rawRows] = await pool.query(sql, params);

  if (!rawRows || rawRows.length === 0) {
    return { rows: [], hasData: false };
  }

  // Merge: church-specific rows override global rows with the same composite key
  const merged = new Map();

  for (const row of rawRows) {
    const key = mergeKey(row);
    const existing = merged.get(key);

    if (!existing) {
      // First occurrence — keep it
      merged.set(key, row);
    } else if (row.church_id !== null && existing.church_id === null) {
      // Church-specific overrides global
      merged.set(key, row);
    }
    // else: keep existing (first church-specific, or first global)
  }

  const rows = Array.from(merged.values());

  // Re-sort after merge (merge may change ordering)
  rows.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    if (a.start_date < b.start_date) return -1;
    if (a.start_date > b.start_date) return 1;
    return a.id - b.id;
  });

  return { rows, hasData: true };
}

module.exports = { getGuidelines };
