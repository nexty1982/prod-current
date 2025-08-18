/**
 * 🔄 Simplified Unified Role System for OrthodoxMetrics (Server-side)
 * 
 * This file establishes the canonical role hierarchy and utility functions
 * for consistent role-based access control in Express middleware and routes.
 * 
 * Canonical role hierarchy with inheritance:
 * super_admin > admin > church_admin > priest > deacon > editor > viewer > guest
 */

// Simplified canonical role hierarchy with numeric privilege levels
const roleHierarchy = {
  super_admin: 7,    // Global system owner
  admin: 6,          // Platform admin (global config, backups)
  church_admin: 5,   // Church-specific admin
  priest: 4,         // Full clergy privileges
  deacon: 3,         // Partial clergy privileges
  editor: 2,         // Can edit records/content
  viewer: 1,         // Read-only access
  guest: 0,          // Unauthenticated access
};

// Canonical roles array
const CANONICAL_ROLES = Object.keys(roleHierarchy);

/**
 * Legacy role mapping for migration compatibility
 * Maps legacy roles to canonical roles
 */
const legacyRoleMap = {
  // Administrative roles
  'super_admin': 'super_admin',
  'admin': 'admin',
  'dev_admin': 'admin',
  'manager': 'church_admin',
  'church_admin': 'church_admin',
  'owner': 'church_admin',
  'administrator': 'church_admin',
  'supervisor': 'church_admin',
  
  // Clergy roles
  'priest': 'priest',
  'deacon': 'deacon',
  'clergy': 'priest', // Generic clergy -> priest
  
  // Editor roles (consolidated)
  'user': 'editor',
  'secretary': 'editor',
  'treasurer': 'editor',
  'volunteer': 'editor',
  'member': 'editor',
  'moderator': 'editor',
  'assistant': 'editor',
  'editor': 'editor',
  
  // System/AI roles -> admin
  'system': 'admin',
  'ai_agent': 'admin',
  'omai': 'admin',
  
  // View-only roles
  'viewer': 'viewer',
  'guest': 'guest',
  
  // Legacy variations
  'super': 'super_admin',
};

/**
 * Normalize legacy role names to canonical roles
 * @param {string} role - Legacy role name
 * @returns {string} - Canonical role name
 */
function normalizeLegacyRole(role) {
  if (!role) return 'guest';
  
  const normalized = legacyRoleMap[role];
  if (!normalized) {
    console.warn(`🔄 Unknown role '${role}' mapped to 'viewer'`);
    return 'viewer';
  }
  
  return normalized;
}

/**
 * Check if a role is canonical (not legacy)
 * @param {string} role - Role to check
 * @returns {boolean} - Whether the role is canonical
 */
function isCanonicalRole(role) {
  return CANONICAL_ROLES.includes(role);
}

/**
 * Check if user has the required role or higher privilege level
 * @param {Object} user - User object with role property
 * @param {string} requiredRole - The minimum required role
 * @returns {boolean} - Whether user has sufficient privileges
 */
function hasRole(user, requiredRole) {
  if (!user || !user.role) {
    return requiredRole === 'guest';
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
    return exactRole === 'guest';
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

  // Users can manage themselves (for profile updates)
  if (currentUser.id === targetUser.id) {
    return true;
  }

  // Higher privilege level can manage lower levels
  return currentLevel > targetLevel;
}

/**
 * Check if user can assign a specific role
 * @param {Object} currentUser - User performing the action
 * @param {string} targetRole - Role to be assigned
 * @returns {boolean} - Whether role assignment is allowed
 */
function canAssignRole(currentUser, targetRole) {
  if (!currentUser || !currentUser.role) {
    return false;
  }

  const currentLevel = getUserLevel(currentUser);
  const targetLevel = roleHierarchy[normalizeLegacyRole(targetRole)] || 0;

  // Can only assign roles with lower privilege level
  return currentLevel > targetLevel;
}

/**
 * Get all roles that can be assigned by current user
 * @param {Object} user - Current user
 * @returns {string[]} - Array of assignable roles
 */
function getAssignableRoles(user) {
  if (!user || !user.role) {
    return [];
  }

  const currentLevel = getUserLevel(user);
  
  return CANONICAL_ROLES.filter(role => {
    const roleLevel = roleHierarchy[role];
    return roleLevel < currentLevel;
  }).sort((a, b) => roleHierarchy[b] - roleHierarchy[a]);
}

// Convenience role checking functions for common use cases
const isSuperAdmin = (user) => hasExactRole(user, 'super_admin');
const isAdmin = (user) => hasRole(user, 'admin');
const isChurchAdmin = (user) => hasRole(user, 'church_admin');
const isPriest = (user) => hasRole(user, 'priest');
const isDeacon = (user) => hasRole(user, 'deacon');
const isEditor = (user) => hasRole(user, 'editor');
const isViewer = (user) => hasRole(user, 'viewer');
const isClergy = (user) => hasRole(user, 'deacon'); // Deacon or higher

// Permission checking functions for common actions (updated for simplified roles)
const canManageGlobalSystem = (user) => hasRole(user, 'super_admin');
const canManageGlobalConfig = (user) => hasRole(user, 'admin');
const canManageChurches = (user) => hasRole(user, 'admin');
const canManageUsers = (user) => hasRole(user, 'church_admin');
const canManageRecords = (user) => hasRole(user, 'deacon');
const canViewDashboard = (user) => hasRole(user, 'viewer');
const canAccessOCR = (user) => hasRole(user, 'editor');
const canGenerateCertificates = (user) => hasRole(user, 'deacon');
const canManageCalendar = (user) => hasRole(user, 'priest');
const canExportData = (user) => hasRole(user, 'deacon');
const canDeleteRecords = (user) => hasRole(user, 'priest');
const canManageProvisioning = (user) => hasRole(user, 'admin');
const canManageChurchSettings = (user) => hasRole(user, 'church_admin');
const canEditContent = (user) => hasRole(user, 'editor');
const canPerformSacraments = (user) => hasRole(user, 'priest');
const canAssistSacraments = (user) => hasRole(user, 'deacon');

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
 * Get role information for display
 * @param {string} role - Role to get info for
 * @returns {Object} - Role information object
 */
function getRoleInfo(role) {
  const canonicalRole = normalizeLegacyRole(role);
  
  const roleInfo = {
    super_admin: { 
      label: 'Super Administrator', 
      description: 'Global system owner with unrestricted access',
      scope: 'Global',
      color: '#dc2626'
    },
    admin: { 
      label: 'Administrator', 
      description: 'Platform admin for global configuration and backups',
      scope: 'Global',
      color: '#ea580c'
    },
    church_admin: { 
      label: 'Church Administrator', 
      description: 'Controls all records and users for a church',
      scope: 'Per-church',
      color: '#d97706'
    },
    priest: { 
      label: 'Priest', 
      description: 'Full record lifecycle authority',
      scope: 'Per-church',
      color: '#059669'
    },
    deacon: { 
      label: 'Deacon', 
      description: 'Limited sacrament authority',
      scope: 'Per-church',
      color: '#0891b2'
    },
    editor: { 
      label: 'Editor', 
      description: 'Can edit content and records, no admin authority',
      scope: 'Per-church',
      color: '#7c3aed'
    },
    viewer: { 
      label: 'Viewer', 
      description: 'Read-only access to records and views',
      scope: 'Per-church',
      color: '#64748b'
    },
    guest: { 
      label: 'Guest', 
      description: 'Unauthenticated access to public content only',
      scope: 'Public',
      color: '#9ca3af'
    }
  };
  
  return roleInfo[canonicalRole] || roleInfo.guest;
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

  const originalRole = user.role;
  const normalizedRole = normalizeLegacyRole(user.role);
  const level = getUserLevel(user);
  const roleInfo = getRoleInfo(originalRole);
  
  console.log('🔄 Role Debug:', {
    originalRole,
    normalizedRole,
    level,
    isLegacy: originalRole !== normalizedRole,
    roleInfo,
    permissions: {
      isSuperAdmin: isSuperAdmin(user),
      isAdmin: isAdmin(user),
      isChurchAdmin: isChurchAdmin(user),
      isClergy: isClergy(user),
      canManageUsers: canManageUsers(user),
      canManageRecords: canManageRecords(user),
    },
    assignableRoles: getAssignableRoles(user)
  });
}

/**
 * Validate role migration
 * @param {string} originalRole - Original role before migration
 * @param {string} newRole - New role after migration
 * @returns {boolean} - Whether migration is valid
 */
function validateRoleMigration(originalRole, newRole) {
  const expectedNewRole = normalizeLegacyRole(originalRole);
  return expectedNewRole === newRole;
}

module.exports = {
  // Core role checking
  hasRole,
  hasAnyRole,
  hasExactRole,
  canManageUser,
  canAssignRole,
  getUserLevel,
  normalizeLegacyRole,
  isCanonicalRole,
  
  // Role utilities
  getAssignableRoles,
  getRoleInfo,
  validateRoleMigration,
  
  // Convenience checkers
  isSuperAdmin,
  isAdmin,
  isChurchAdmin,
  isPriest,
  isDeacon,
  isEditor,
  isViewer,
  isClergy,
  
  // Permission checkers
  canManageGlobalSystem,
  canManageGlobalConfig,
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
  canManageChurchSettings,
  canEditContent,
  canPerformSacraments,
  canAssistSacraments,
  
  // Middleware
  requireRole,
  
  // Debug
  debugUserRole,
  
  // Constants
  CANONICAL_ROLES,
  roleHierarchy,
  legacyRoleMap
};