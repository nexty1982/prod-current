/**
 * Mount-time guard for admin/ops route trees.
 *
 * Applied once at the mount point in index.ts to enforce authentication +
 * minimum role for ALL routes under that prefix. Individual route handlers
 * can still add stricter checks (e.g. super_admin only).
 *
 * Uses hierarchy from utils/roles.js so church_admin >= editor etc.
 * Supports both session and JWT auth (via authMiddleware setting req.user).
 */
const { authMiddleware } = require('./auth');
const { hasRole, normalizeLegacyRole } = require('../utils/roles');

/**
 * Returns Express middleware array: [authenticate, checkRole].
 * Use with app.use('/api/admin', ...adminGuard('admin'));
 *
 * @param {string} minRole - Minimum canonical role required (hierarchy-aware)
 * @returns {Function[]} Array of two middleware functions
 */
function adminGuard(minRole = 'admin') {
  const roleCheck = (req, res, next) => {
    const user = req.user; // Set by authMiddleware (session or JWT)
    if (!user || !user.role) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_USER',
      });
    }

    if (!hasRole(user, minRole)) {
      const normalized = normalizeLegacyRole(user.role);
      console.log(`🚫 [AdminGuard] Denied ${user.email || user.id} (role=${normalized}) — needs ${minRole} — ${req.method} ${req.originalUrl}`);
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_ROLE',
        required: minRole,
        current: normalized,
      });
    }

    next();
  };

  return [authMiddleware, roleCheck];
}

module.exports = { adminGuard };
