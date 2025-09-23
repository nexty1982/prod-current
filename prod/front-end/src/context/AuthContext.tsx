/**
 * OrthodMetrics Authentication Context & Provider
 * Simplified version to prevent blank page
 * 🔄 Refactored to use unified role system (see utils/roles.ts)
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AuthService from '../services/authService';
import type { User, UserRole } from '../types/orthodox-metrics.types';
import { 
  hasRole as checkRole, 
  hasAnyRole, 
  canManageUser as checkCanManageUser,
  isSuperAdmin as checkIsSuperAdmin,
  isAdmin,
  canManageChurches as checkCanManageChurches,
  canViewDashboard as checkCanViewDashboard,
  canAccessOCR as checkCanAccessOCR,
  canManageProvisioning as checkCanManageProvisioning,
  getUserLevel
} from '../utils/roles';

interface AuthContextType {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  canManageChurches: () => boolean;
  canViewDashboard: () => boolean;
  canManageProvisioning: () => boolean;
  canAccessOCR: () => boolean;
  canManageInvoices: () => boolean;
  canViewCalendar: () => boolean;
  isSuperAdmin: () => boolean;
  canCreateAdmins: () => boolean;
  canManageAllUsers: () => boolean;
  canManageChurchesFullAccess: () => boolean;
  isRootSuperAdmin: () => boolean;
  canManageUser: (targetUser: User) => boolean;
  canPerformDestructiveOperation: (targetUser: User) => boolean;
  canChangeRole: (targetUser: User, newRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false); // Start with false to render immediately
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage ONLY - no API calls
  useEffect(() => {
    try {
      const storedUser = AuthService.getStoredUser();
      
      if (storedUser) {
        console.log('🔍 AuthContext: Found stored user data:', storedUser.email);
        setUser(storedUser);
      } else {
        console.log('🔍 AuthContext: No stored user data found');
      }
    } catch (err) {
      console.error('❌ AuthContext: Error initializing auth:', err);
      setUser(null);
      localStorage.removeItem('auth_user');
    }
  }, []);

  const login = async (username: string, password: string, rememberMe: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await AuthService.login({
        username: username,
        password,
        remember_me: rememberMe,
      });

      if (response.user) {
        console.log('🔑 AuthContext: Setting user data after successful login');
        setUser(response.user);
      } else {
        throw new Error('Login failed - no user data received');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);

      try {
        await AuthService.logout();
      } catch (err) {
        console.warn('Logout API call failed:', err);
      }

      setUser(null);
      setError(null);
      localStorage.removeItem('auth_user');

    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAuth = async () => {
    try {
      const authCheck = await AuthService.checkAuth();

      if (authCheck.authenticated && authCheck.user) {
        setUser(authCheck.user);
        localStorage.setItem('auth_user', JSON.stringify(authCheck.user));
      } else {
        await logout();
      }
    } catch (err) {
      console.error('Error refreshing auth:', err);
      await logout();
    }
  };

  const clearError = () => {
    setError(null);
  };

  // 🔄 Role and permission checking functions refactored to use unified role system
  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false;

    if (Array.isArray(role)) {
      return hasAnyRole(user, role);
    }

    return checkRole(user, role);
  };

  // 🔄 Permission system updated to use canonical role hierarchy
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    const rolePermissions: Record<UserRole, string[]> = {
      super_admin: ['*'],
      admin: ['*'],
      church_admin: [
        'manage_records',
        'view_dashboard',
        'manage_calendar',
        'generate_certificates',
        'access_ocr',
        'view_invoices',
        'manage_invoices',
        'manage_church_data',
        'manage_users',
      ],
      priest: [
        'manage_records',
        'view_dashboard',
        'view_calendar',
        'manage_calendar',
        'access_ocr',
        'view_invoices',
        'manage_church_data',
        'generate_certificates',
      ],
      deacon: [
        'manage_records',
        'view_dashboard',
        'view_calendar',
        'access_ocr',
        'view_invoices',
        'generate_certificates',
      ],
      editor: [
        'manage_records',
        'view_dashboard',
        'access_ocr',
        'view_invoices',
      ],
      viewer: [
        'view_dashboard',
        'view_invoices',
      ],
      guest: [
        'view_dashboard',
      ],
    };

    const userPermissions = rolePermissions[user.role] || [];

    if (userPermissions.includes('*')) {
      return true;
    }

    return userPermissions.includes(permission);
  };

  // 🔄 Convenience functions refactored to use unified role system
  const canManageChurches = (): boolean => {
    return checkCanManageChurches(user);
  };

  const canViewDashboard = (): boolean => {
    return checkCanViewDashboard(user);
  };

  const canManageProvisioning = (): boolean => {
    return checkCanManageProvisioning(user);
  };

  const canAccessOCR = (): boolean => {
    return checkCanAccessOCR(user);
  };

  const canManageInvoices = (): boolean => {
    return checkRole(user, 'manager');
  };

  const canViewCalendar = (): boolean => {
    return hasPermission('view_calendar');
  };

  // 🔄 Role check refactored to use unified role system
  const isSuperAdmin = (): boolean => {
    return checkIsSuperAdmin(user);
  };

  const canCreateAdmins = (): boolean => {
    return checkIsSuperAdmin(user);
  };

  const canManageAllUsers = (): boolean => {
    return checkIsSuperAdmin(user);
  };

  const canManageChurchesFullAccess = (): boolean => {
    return checkIsSuperAdmin(user);
  };

  const ROOT_SUPERADMIN_EMAIL = 'admin@devchurch.org';

  const isRootSuperAdmin = (): boolean => {
    return user?.email === ROOT_SUPERADMIN_EMAIL;
  };

  // 🔄 User management refactored to use unified role system
  const canManageUser = (targetUser: User): boolean => {
    if (!user || !targetUser) return false;

    // Special handling for root super admin
    const isRoot = isRootSuperAdmin();
    const isTargetRoot = targetUser.email === ROOT_SUPERADMIN_EMAIL;

    if (isRoot) return true;
    if (isTargetRoot) return false;

    // Use unified role system for general user management
    return checkCanManageUser(user, targetUser);
  };

  const canPerformDestructiveOperation = (targetUser: User): boolean => {
    if (!user || !targetUser) return false;

    const isRoot = isRootSuperAdmin();
    const isManagingSelf = user.id === targetUser.id;
    const isTargetRoot = targetUser.email === ROOT_SUPERADMIN_EMAIL;

    if (isRoot) return true;
    if (isTargetRoot) return false;
    if (isManagingSelf) return false; // Users cannot perform destructive ops on themselves

    // 🔄 Use unified role system for destructive operations
    return checkCanManageUser(user, targetUser);
  };

  const canChangeRole = (targetUser: User, newRole: UserRole): boolean => {
    if (!user || !targetUser) return false;

    const isRoot = isRootSuperAdmin();
    const isTargetRoot = targetUser.email === ROOT_SUPERADMIN_EMAIL;

    if (isRoot) return true;
    if (isTargetRoot) return false;
    if (newRole === 'super_admin' && !isRoot) return false;

    // 🔄 Use unified role system for role change validation
    const currentUserLevel = getUserLevel(user);
    const targetUserLevel = getUserLevel(targetUser);
    const newRoleLevel = getUserLevel({ role: newRole } as User);

    // User must be able to manage the target user and have sufficient privileges for the new role
    return checkCanManageUser(user, targetUser) && currentUserLevel >= newRoleLevel;
  };

  const contextValue: AuthContextType = {
    user,
    authenticated: !!user,
    loading,
    error,
    login,
    logout,
    refreshAuth,
    clearError,
    hasRole,
    hasPermission,
    canManageChurches,
    canViewDashboard,
    canManageProvisioning,
    canAccessOCR,
    canManageInvoices,
    canViewCalendar,
    isSuperAdmin,
    canCreateAdmins,
    canManageAllUsers,
    canManageChurchesFullAccess,
    isRootSuperAdmin,
    canManageUser,
    canPerformDestructiveOperation,
    canChangeRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
