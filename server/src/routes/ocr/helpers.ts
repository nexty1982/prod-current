/**
 * Shared helpers for OCR route handlers.
 * Eliminates the repeated church-lookup + db-switcher boilerplate.
 */

const { promisePool } = require('../../config/db');

let _dbSwitcherModule: any;
function getDbSwitcher() {
  if (!_dbSwitcherModule) {
    _dbSwitcherModule = require('../../utils/dbSwitcher');
  }
  return _dbSwitcherModule;
}

/**
 * Resolve church database name from churchId.
 * Returns null if church not found.
 */
export async function resolveChurchDb(churchId: number): Promise<{ dbName: string; db: any } | null> {
  const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
  if (!churchRows.length) return null;
  const dbName = churchRows[0].database_name;
  const { getChurchDbConnection } = getDbSwitcher();
  const db = await getChurchDbConnection(dbName);
  return { dbName, db };
}

/**
 * Validate that the current user has access to the specified churchId.
 * SuperAdmins can access all churches. Regular users must match church_id.
 * Returns true if authorized, false otherwise.
 */
export function validateChurchAccess(req: any, churchId: number): boolean {
  const user = req.session?.user || req.user;
  if (!user) return false;
  // SuperAdmin/admin roles can access all churches
  if (user.role === 'superadmin' || user.role === 'admin') return true;
  // Regular users must match their assigned church
  return user.church_id === churchId;
}

/**
 * Split a compound name into first + last.
 * "John Smith" → { first: "John", last: "Smith" }
 * "John" → { first: "John", last: null }
 */
function splitName(name: string | null | undefined): { first: string | null; last: string | null } {
  if (!name || !name.trim()) return { first: null, last: null };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: null };
  const last = parts.pop()!;
  return { first: parts.join(' '), last };
}

function resolvePersonName(
  combined?: string | null,
  first?: string | null,
  last?: string | null,
): { first: string | null; last: string | null } {
  if (first?.trim() || last?.trim()) {
    return { first: first?.trim() || null, last: last?.trim() || null };
  }
  return splitName(combined);
}

function composeNotes(entryType?: string, notes?: string): string | null {
  const parts = [
    entryType?.trim() ? `Entry: ${entryType.trim()}` : '',
    notes?.trim() || '',
  ].filter(Boolean);
  return parts.length ? parts.join('. ') : null;
}

/**
 * Helper to convert various date string formats to database-friendly YYYY-MM-DD
 */
export function formatDbDate(value: any): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // If already YYYY-MM-DD, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Native Date parsing
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    if (y >= 1800 && y <= 2100) {
      return `${y}-${m}-${day}`;
    }
  }

  // Regex-based fallbacks for common layouts
  const m1 = trimmed.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (m1) {
    const year = parseInt(m1[1], 10);
    const month = String(parseInt(m1[2], 10)).padStart(2, '0');
    const day = String(parseInt(m1[3], 10)).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const m2 = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (m2) {
    const first = parseInt(m2[1], 10);
    const second = parseInt(m2[2], 10);
    let year = parseInt(m2[3], 10);
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    let month = first;
    let day = second;
    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      month = first;
      day = second;
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

/**
 * Map OCR field names (from recordFields.ts) to actual DB column names.
 * Handles name splitting for compound name fields.
 */
export function mapFieldsToDbColumns(recordType: string, f: Record<string, any>): Record<string, any> {
  if (recordType === 'baptism') {
    const child = resolvePersonName(f.child_name, f.child_first_name, f.child_last_name);
    return {
      first_name: child.first,
      last_name: child.last,
      birth_date: formatDbDate(f.date_of_birth),
      reception_date: formatDbDate(f.date_of_baptism),
      birthplace: f.place_of_birth || null,
      parents: f.parents || [f.father_name, f.mother_name].filter(Boolean).join(', ') || null,
      sponsors: f.godparents || null,
      clergy: f.performed_by || f.officiant || null,
      notes: composeNotes(f.entry_type, f.notes),
    };
  }

  if (recordType === 'marriage') {
    const groom = resolvePersonName(f.groom_name, f.groom_first_name, f.groom_last_name);
    const bride = resolvePersonName(f.bride_name, f.bride_first_name, f.bride_last_name);
    return {
      mdate: formatDbDate(f.date_of_marriage),
      fname_groom: groom.first,
      lname_groom: groom.last,
      parentsg: f.groom_parents || null,
      fname_bride: bride.first,
      lname_bride: bride.last,
      parentsb: f.bride_parents || null,
      witness: f.witnesses || null,
      mlicense: f.marriage_license || f.mlicense || f.license || null,
      clergy: f.officiant || f.priest || f.performed_by || null,
      notes: f.notes || null,
    };
  }

  if (recordType === 'funeral') {
    const deceased = resolvePersonName(f.deceased_name, f.deceased_first_name, f.deceased_last_name);
    return {
      name: deceased.first,
      lastname: deceased.last,
      deceased_date: formatDbDate(f.date_of_death),
      burial_date: formatDbDate(f.date_of_burial || f.date_of_funeral),
      age: f.age_at_death ? parseInt(f.age_at_death, 10) || null : null,
      clergy: f.officiant || f.performed_by || null,
      burial_location: f.place_of_burial || null,
      notes: f.notes || null,
    };
  }

  return f;
}

/**
 * Build an INSERT query from mapped field values.
 */
export function buildInsertQuery(table: string, churchId: number, mapped: Record<string, any>): { sql: string; params: any[] } {
  const cols = ['church_id', ...Object.keys(mapped)];
  const placeholders = cols.map(() => '?').join(', ');
  const values = [churchId, ...Object.values(mapped)];
  return {
    sql: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
    params: values,
  };
}

export { promisePool };

// ── Test-only exports (private helpers exposed for unit tests) ────────────
export const __test__ = {
  splitName,
};
