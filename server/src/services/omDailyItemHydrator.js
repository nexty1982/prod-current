/**
 * OM Daily Item Hydrator
 *
 * Fetches om_daily_items from omai_db (the canonical source) and attaches
 * them to rows that reference om_daily_item_id but live in orthodoxmetrics_db.
 *
 * Used by changeSetService and prompt-plans to resolve cross-database
 * relationships without same-DB JOINs. Referential integrity is enforced
 * at the application layer (FK was removed in migration
 * drop_change_set_items_fk_to_stale_om_daily.sql).
 */

const { getOmaiPool } = require('../config/db');

/**
 * Fetch om_daily_items by a list of IDs from omai_db.
 * Returns a Map<id, row> for O(1) lookup.
 *
 * @param {number[]} ids — list of om_daily_item IDs
 * @param {string[]} [columns] — columns to SELECT (default: common set)
 * @returns {Promise<Map<number, object>>}
 */
async function fetchByIds(ids, columns) {
  if (!ids || ids.length === 0) return new Map();

  const unique = [...new Set(ids.filter(Boolean).map(Number))];
  if (unique.length === 0) return new Map();

  const cols = columns && columns.length
    ? columns.map(c => `\`${c}\``).join(', ')
    : 'id, title, status, priority, category, task_type, github_issue_number, github_branch, branch_type';

  const pool = getOmaiPool();
  const placeholders = unique.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT ${cols} FROM om_daily_items WHERE id IN (${placeholders})`,
    unique
  );

  const map = new Map();
  for (const row of rows) {
    map.set(row.id, row);
  }
  return map;
}

/**
 * Hydrate an array of rows that have an `om_daily_item_id` field.
 * Attaches om_daily_items columns as prefixed fields (e.g. item_title, item_status).
 *
 * @param {object[]} rows — rows from change_set_items or similar
 * @param {object} [options]
 * @param {string} [options.idField='om_daily_item_id'] — field holding the item ID
 * @param {object} [options.fieldMap] — { omai_column: output_alias }
 * @returns {Promise<object[]>} rows with hydrated fields attached
 */
async function hydrateRows(rows, options = {}) {
  if (!rows || rows.length === 0) return rows;

  const idField = options.idField || 'om_daily_item_id';
  const fieldMap = options.fieldMap || {
    title:                'item_title',
    status:               'item_status',
    priority:             'item_priority',
    category:             'item_category',
    github_issue_number:  'github_issue_number',
    github_branch:        'item_branch',
    branch_type:          'branch_type',
  };

  const ids = rows.map(r => r[idField]).filter(Boolean);
  const itemMap = await fetchByIds(ids);

  return rows.map(row => {
    const item = itemMap.get(row[idField]);
    const hydrated = { ...row };
    if (item) {
      for (const [srcCol, destAlias] of Object.entries(fieldMap)) {
        hydrated[destAlias] = item[srcCol] !== undefined ? item[srcCol] : null;
      }
    } else {
      // Item not found in omai_db — fill nulls
      for (const destAlias of Object.values(fieldMap)) {
        hydrated[destAlias] = null;
      }
    }
    return hydrated;
  });
}

module.exports = { fetchByIds, hydrateRows };
