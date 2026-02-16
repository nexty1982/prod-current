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

export { promisePool };
