/**
 * readSacramentHistory.js — Read the audit trail for a single sacrament record
 * from the church's {type}_history table (written by writeSacramentHistory.js).
 *
 * Resolves actor_user_id → a display name from the platform users table and
 * surfaces the changed-field list from diff_data, returning a UI-ready array
 * ordered newest-first.
 */

const { getAppPool } = require('../config/db-compat');

const ALLOWED_HISTORY_TABLES = new Set(['baptism_history', 'marriage_history', 'funeral_history']);

function safeParse(json) {
  if (json == null) return null;
  if (typeof json === 'object') return json;
  try { return JSON.parse(json); } catch { return null; }
}

/**
 * @param {string} churchDbName  e.g. "om_church_46" (from churches.database_name)
 * @param {string} historyTable  one of baptism_history|marriage_history|funeral_history
 * @param {number|string} recordId
 * @returns {Promise<Array>} newest-first audit events
 */
async function readSacramentHistory(churchDbName, historyTable, recordId) {
  if (!ALLOWED_HISTORY_TABLES.has(historyTable)) {
    throw new Error(`Invalid history table: ${historyTable}`);
  }
  if (!/^[A-Za-z0-9_]+$/.test(String(churchDbName || ''))) {
    throw new Error(`Invalid church database name: ${churchDbName}`);
  }
  const id = parseInt(recordId, 10);
  if (!Number.isFinite(id)) return [];

  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT id, type, description, timestamp, record_id, diff_data, source, actor_user_id, ip_address
       FROM \`${churchDbName}\`.\`${historyTable}\`
      WHERE record_id = ?
      ORDER BY timestamp DESC, id DESC`,
    [id]
  );

  // Resolve actor user ids → display names in one round-trip.
  const actorIds = [...new Set(rows.map((r) => r.actor_user_id).filter((v) => v != null))];
  const userMap = {};
  if (actorIds.length) {
    const [users] = await pool.query(
      `SELECT id, first_name, last_name, email
         FROM orthodoxmetrics_db.users
        WHERE id IN (${actorIds.map(() => '?').join(',')})`,
      actorIds
    );
    for (const u of users) {
      const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
      userMap[u.id] = name || u.email || `User #${u.id}`;
    }
  }

  return rows.map((r) => {
    const diff = safeParse(r.diff_data);
    const changedFields = diff && Array.isArray(diff.changed_fields) ? diff.changed_fields : [];
    return {
      id: r.id,
      type: r.type, // create | update | merge | delete
      description: r.description,
      timestamp: r.timestamp,
      actor: r.actor_user_id != null ? (userMap[r.actor_user_id] || `User #${r.actor_user_id}`) : null,
      source: r.source, // ui | ocr | ...
      changedFields,
    };
  });
}

module.exports = { readSacramentHistory };
