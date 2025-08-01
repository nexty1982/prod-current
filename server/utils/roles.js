/**
 * 🔄 Unified Role System for OrthodoxMetrics (Server-side)
 * 
 * This file establishes the canonical role hierarchy and utility functions
 * for consistent role-based access control in Express middleware and routes.
 * 
 * Role inheritance is based on privilege level:
 * super_admin > admin > manager > priest > deacon > editor > viewer > guest
 */

// Canonical role hierarchy with numeric privilege levels
const roleHierarchy = {
  super_admin: 7,
  admin: 6,
  manager: 5,
  priest: 4,
  deacon: 3,
  editor: 2,
  viewer: 1,
  guest: 0,
};

/**
 * Normalize legacy role names to canonical roles
 * @param {string} role - Legacy role name
 * @returns {string} - Canonical role name
 */
function normalizeLegacyRole(role) {
  const legacyRoleMap = {
    // Current legacy mappings found in codebase
    'super': 'super_admin',
    'user': 'viewer', // Map generic 'user' to 'viewer' 
    'volunteer': 'editor', // Map volunteer to editor level
    'supervisor': 'manager', // Map supervisor to manager
    'clergy': 'priest', // Map generic clergy to priest
    
    // Canonical roles (no change needed)
    'super_admin': 'super_admin',
    'admin': 'admin',
    'manager': 'manager',
    'priest': 'priest',
    'deacon': 'deacon',
    'editor': 'editor',
    'viewer': 'viewer',
    'guest': 'guest',
  };

  return legacyRoleMap[role] || 'guest'; // Default to guest for unrecognized roles
}

/**
 * Check if user has the required role or higher privilege level
 * @param {Object} user - User object with role property
 * @param {string} requiredRole - The minimum required role
 * @returns {boolean} - Whether user has sufficient privileges
 */
function hasRole(user, requiredRole) {
  if (!user || !user.role) {
    return false;
  }

  // Handle legacy role mapping
  const normalizedUserRole = normalizeLegacyRole(user.role);
  const normalizedRequiredRole = normalizeLegacyRole(requiredRole);
  
  const userLevel = roleHierarchy[normalizedUserRole];
  const requiredLevel = roleHierarchy[normalizedRequiredRole];

  // If either role is not recognized, deny access
  if (userLevel === undefined || requiredLevel === undefined) {
    console.warn(`🔄 Role check failed: Unrecognized role. User: ${user.role}, Required: ${requiredRole}`);
    return false;
  }

  return userLevel >= requiredLevel;
}

/**
 * Check if user has any of the specified roles
 * @param {Object} user - User object with role property
 * @param {string[]} roles - Array of acceptable roles
 * @returns {boolean} - Whether user has any of the specified roles
 */
function hasAnyRole(user, roles) {
  if (!user || !roles.length) {
    return false;
  }

  return roles.some(role => hasRole(user, role));
}

/**
 * Check if user has exact role (no hierarchy checking)
 * @param {Object} user - User object with role property
 * @param {string} exactRole - The exact role to match
 * @returns {boolean} - Whether user has the exact role
 */
function hasExactRole(user, exactRole) {
  if (!user || !user.role) {
    return false;
  }

  const normalizedUserRole = normalizeLegacyRole(user.role);
  const normalizedExactRole = normalizeLegacyRole(exactRole);
  return normalizedUserRole === normalizedExactRole;
}

/**
 * Get user's role level (numeric)
 * @param {Object} user - User object with role property
 * @returns {number} - Numeric privilege level
 */
function getUserLevel(user) {
  if (!user || !user.role) {
    return 0; // Guest level
  }

  const normalizedRole = normalizeLegacyRole(user.role);
  return roleHierarchy[normalizedRole] || 0;
}

/**
 * Check if user can manage another user (based on role hierarchy)
 * @param {Object} currentUser - User performing the action
 * @param {Object} targetUser - User being managed
 * @returns {boolean} - Whether management is allowed
 */
function canManageUser(currentUser, targetUser) {
  if (!currentUser || !targetUser) {
    return false;
  }

  const currentLevel = getUserLevel(currentUser);
  const targetLevel = getUserLevel(targetUser);

  // Users can manage themselves
  if (currentUser.id === targetUser.id) {
    return true;
  }

  // Higher privilege level can manage lower levels
  if (currentLevel > targetLevel) {
    return true;
  }

  return false;
}

// Convenience role checking functions for common use cases
const isSuperAdmin = (user) => hasExactRole(user, 'super_admin');
const isAdmin = (user) => hasRole(user, 'admin');
const isManager = (user) => hasRole(user, 'manager');
const isPriest = (user) => hasRole(user, 'priest');
const isDeacon = (user) => hasRole(user, 'deacon');
const isEditor = (user) => hasRole(user, 'editor');
const isViewer = (user) => hasRole(user, 'viewer');

// Permission checking functions for common actions
const canManageChurches = (user) => hasRole(user, 'admin');
const canManageUsers = (user) => hasRole(user, 'admin');
const canManageRecords = (user) => hasRole(user, 'deacon');
const canViewDashboard = (user) => hasRole(user, 'viewer');
const canAccessOCR = (user) => hasRole(user, 'editor');
const canGenerateCertificates = (user) => hasRole(user, 'deacon');
const canManageCalendar = (user) => hasRole(user, 'priest');
const canExportData = (user) => hasRole(user, 'deacon');
const canDeleteRecords = (user) => hasRole(user, 'priest');
const canManageProvisioning = (user) => hasRole(user, 'admin');

/**
 * Express middleware factory for role-based access control
 * @param {string|string[]} requiredRoles - Required role(s) for access
 * @returns {Function} - Express middleware function
 */
function requireRole(requiredRoles) {
  return (req, res, next) => {
    console.log('🔄 Role check - User role:', req.session?.user?.role);
    console.log('🔄 Role check - Required roles:', requiredRoles);
    
    // First check if user is authenticated
    if (!req.session || !req.session.user) {
      console.log('❌ No valid session found for role check');
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_SESSION'
      });
    }

    const user = req.session.user;
    
    // Check if user's role meets requirements
    const hasRequiredRole = Array.isArray(requiredRoles) 
      ? hasAnyRole(user, requiredRoles)
      : hasRole(user, requiredRoles);

    if (!hasRequiredRole) {
      const normalizedUserRole = normalizeLegacyRole(user.role);
      const normalizedRequiredRoles = Array.isArray(requiredRoles) 
        ? requiredRoles.map(normalizeLegacyRole)
        : [normalizeLegacyRole(requiredRoles)];
        
      console.log(`❌ Access denied - User role '${normalizedUserRole}' not sufficient for required roles:`, normalizedRequiredRoles);
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_ROLE',
        required: normalizedRequiredRoles,
        current: normalizedUserRole
      });
    }

    console.log(`✅ Role check passed - User has sufficient privileges`);
    next();
  };
}

/**
 * Debug helper to log role hierarchy information
 * @param {Object} user - User to debug
 */
function debugUserRole(user) {
  if (!user) {
    console.log('🔄 Role Debug: No user provided');
    return;
  }

  const normalizedRole = normalizeLegacyRole(user.role);
  const level = getUserLevel(user);
  
  console.log('🔄 Role Debug:', {
    originalRole: user.role,
    normalizedRole,
    level,
    isAdmin: isAdmin(user),
    canManageUsers: canManageUsers(user),
    canManageRecords: canManageRecords(user),
  });
}

module.exports = {
  hasRole,
  hasAnyRole,
  hasExactRole,
  canManageUser,
  getUserLevel,
  normalizeLegacyRole,
  isSuperAdmin,
  isAdmin,
  isManager,
  isPriest,
  isDeacon,
  isEditor,
  isViewer,
  canManageChurches,
  canManageUsers,
  canManageRecords,
  canViewDashboard,
  canAccessOCR,
  canGenerateCertificates,
  canManageCalendar,
  canExportData,
  canDeleteRecords,
  canManageProvisioning,
  requireRole,
  debugUserRole,
}; 