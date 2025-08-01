/**
 * 🔄 Unified Role System for OrthodMetrics
 * 
 * This file establishes the canonical role hierarchy and utility functions
 * for consistent role-based access control across the entire application.
 * 
 * Role inheritance is based on privilege level:
 * super_admin > admin > manager > priest > deacon > editor > viewer > guest
 */

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'priest'
  | 'deacon'
  | 'editor'
  | 'viewer'
  | 'guest';

// Canonical role hierarchy with numeric privilege levels
const roleHierarchy: Record<UserRole, number> = {
  super_admin: 7,
  admin: 6,
  manager: 5,
  priest: 4,
  deacon: 3,
  editor: 2,
  viewer: 1,
  guest: 0,
};

// User interface for role checking
export interface User {
  id?: string | number;
  email?: string;
  role: UserRole;
  [key: string]: any; // Allow additional properties
}

/**
 * Check if user has the required role or higher privilege level
 * @param user - User object with role property
 * @param requiredRole - The minimum required role
 * @returns boolean - Whether user has sufficient privileges
 * 
 * @example
 * hasRole(user, 'editor') // Returns true if user is editor or higher
 * hasRole(user, 'admin')  // Returns true only if user is admin or super_admin
 */
export const hasRole = (user: User | null | undefined, requiredRole: UserRole): boolean => {
  if (!user || !user.role) {
    return false;
  }

  // Handle legacy role mapping
  const normalizedUserRole = normalizeLegacyRole(user.role as string) as UserRole;
  
  const userLevel = roleHierarchy[normalizedUserRole];
  const requiredLevel = roleHierarchy[requiredRole];

  // If either role is not recognized, deny access
  if (userLevel === undefined || requiredLevel === undefined) {
    console.warn(`🔄 Role check failed: Unrecognized role. User: ${user.role}, Required: ${requiredRole}`);
    return false;
  }

  return userLevel >= requiredLevel;
};

/**
 * Check if user has any of the specified roles
 * @param user - User object with role property
 * @param roles - Array of acceptable roles
 * @returns boolean - Whether user has any of the specified roles
 * 
 * @example
 * hasAnyRole(user, ['admin', 'manager']) // Returns true if user is admin or manager
 * hasAnyRole(user, ['priest', 'deacon']) // Returns true if user is priest or deacon (or higher)
 */
export const hasAnyRole = (user: User | null | undefined, roles: UserRole[]): boolean => {
  if (!user || !roles.length) {
    return false;
  }

  return roles.some(role => hasRole(user, role));
};

/**
 * Check if user has exact role (no hierarchy checking)
 * @param user - User object with role property
 * @param exactRole - The exact role to match
 * @returns boolean - Whether user has the exact role
 */
export const hasExactRole = (user: User | null | undefined, exactRole: UserRole): boolean => {
  if (!user || !user.role) {
    return false;
  }

  const normalizedUserRole = normalizeLegacyRole(user.role as string);
  return normalizedUserRole === exactRole;
};

/**
 * Normalize legacy role names to canonical roles
 * @param role - Legacy role name
 * @returns UserRole - Canonical role name
 */
function normalizeLegacyRole(role: string): UserRole {
  const legacyRoleMap: Record<string, UserRole> = {
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
 * Get all roles that are at or below the specified role level
 * @param role - The role to get subordinates for
 * @returns UserRole[] - Array of roles at or below the specified level
 */
export const getSubordinateRoles = (role: UserRole): UserRole[] => {
  const userLevel = roleHierarchy[role];
  return Object.entries(roleHierarchy)
    .filter(([_, level]) => level <= userLevel)
    .map(([roleName, _]) => roleName as UserRole);
};

/**
 * Get user's role level (numeric)
 * @param user - User object with role property
 * @returns number - Numeric privilege level
 */
export const getUserLevel = (user: User | null | undefined): number => {
  if (!user || !user.role) {
    return 0; // Guest level
  }

  const normalizedRole = normalizeLegacyRole(user.role as string);
  return roleHierarchy[normalizedRole] || 0;
};

/**
 * Check if user can manage another user (based on role hierarchy)
 * @param currentUser - User performing the action
 * @param targetUser - User being managed
 * @returns boolean - Whether management is allowed
 */
export const canManageUser = (currentUser: User | null | undefined, targetUser: User | null | undefined): boolean => {
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
  // Super admins can manage anyone except other super admins (unless they're the root super admin)
  if (currentLevel > targetLevel) {
    return true;
  }

  return false;
};

// Convenience role checking functions for common use cases
export const isSuperAdmin = (user: User | null | undefined): boolean => hasExactRole(user, 'super_admin');
export const isAdmin = (user: User | null | undefined): boolean => hasRole(user, 'admin');
export const isManager = (user: User | null | undefined): boolean => hasRole(user, 'manager');
export const isPriest = (user: User | null | undefined): boolean => hasRole(user, 'priest');
export const isDeacon = (user: User | null | undefined): boolean => hasRole(user, 'deacon');
export const isEditor = (user: User | null | undefined): boolean => hasRole(user, 'editor');
export const isViewer = (user: User | null | undefined): boolean => hasRole(user, 'viewer');

// Permission checking functions for common actions
export const canManageChurches = (user: User | null | undefined): boolean => hasRole(user, 'admin');
export const canManageUsers = (user: User | null | undefined): boolean => hasRole(user, 'admin');
export const canManageRecords = (user: User | null | undefined): boolean => hasRole(user, 'deacon');
export const canViewDashboard = (user: User | null | undefined): boolean => hasRole(user, 'viewer');
export const canAccessOCR = (user: User | null | undefined): boolean => hasRole(user, 'editor');
export const canGenerateCertificates = (user: User | null | undefined): boolean => hasRole(user, 'deacon');
export const canManageCalendar = (user: User | null | undefined): boolean => hasRole(user, 'priest');
export const canExportData = (user: User | null | undefined): boolean => hasRole(user, 'deacon');
export const canDeleteRecords = (user: User | null | undefined): boolean => hasRole(user, 'priest');
export const canManageProvisioning = (user: User | null | undefined): boolean => hasRole(user, 'admin');

/**
 * Debug helper to log role hierarchy information
 * @param user - User to debug
 */
export const debugUserRole = (user: User | null | undefined): void => {
  if (!user) {
    console.log('🔄 Role Debug: No user provided');
    return;
  }

  const normalizedRole = normalizeLegacyRole(user.role as string);
  const level = getUserLevel(user);
  
  console.log('🔄 Role Debug:', {
    originalRole: user.role,
    normalizedRole,
    level,
    isAdmin: isAdmin(user),
    canManageUsers: canManageUsers(user),
    canManageRecords: canManageRecords(user),
  });
};

export default {
  hasRole,
  hasAnyRole,
  hasExactRole,
  canManageUser,
  getUserLevel,
  getSubordinateRoles,
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
  debugUserRole,
}; 