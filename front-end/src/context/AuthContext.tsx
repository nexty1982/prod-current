/**
 * OrthodoxMetrics Authentication Context & Provider
 * Session-based authentication with role-based access control
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AuthService from '../services/authService';
import { devLogDataShape, devLogApiResponse } from '../utils/devLogger';
import type { User, UserRole } from '../types/orthodox-metrics.types';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = AuthService.getStoredUser();

        if (storedUser) {
          setUser(storedUser);

          // Verify authentication with server
          try {
            const authCheck = await AuthService.checkAuth();
            if (!authCheck.authenticated || !authCheck.user) {
              // User is no longer authenticated, clear stored data
              setUser(null);
            } else {
              // Update user data from server
              setUser(authCheck.user);
            }
          } catch (err) {
            // Auth check failed, clear stored data
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string, rememberMe: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await AuthService.login({
        username: username, // Can be email or actual username
        password,
        remember_me: rememberMe,
      });

      // Development logging for login response
      devLogApiResponse(response, 'AuthService.login', 'Object with user property');
      
      if (response.user) {
        devLogDataShape(
          response.user,
          'Login User Data',
          {
            expectedType: 'object',
            componentName: 'AuthContext',
            operation: 'user login',
            required: true
          }
        );
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

      // Call logout API to invalidate session on server
      try {
        await AuthService.logout();
      } catch (err) {
        // Continue with logout even if API call fails
        console.warn('Logout API call failed:', err);
      }

      // Clear local state
      setUser(null);
      setError(null);

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
        // User is no longer authenticated
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

  // Role and permission checking functions
  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false;

    if (Array.isArray(role)) {
      return role.includes(user.role);
    }

    return user.role === role;
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // Define role-based permissions
    const rolePermissions: Record<UserRole, string[]> = {
      super_admin: ['*'], // Super admin has all permissions
      admin: ['*'], // Admin has all permissions
      priest: [
        'manage_records',
        'view_dashboard',
        'manage_calendar',
        'generate_certificates',
        'access_ocr',
        'view_invoices',
        'manage_invoices',
        'manage_church_data',
      ],
      deacon: [
        'manage_records',
        'view_dashboard',
        'manage_calendar',
        'access_ocr',
        'view_invoices',
        'manage_church_data',
      ],
      user: [
        'view_dashboard',
        'view_calendar',
        'view_records',
        'access_ocr',
      ],
      supervisor: [
        'manage_records',
        'view_dashboard',
        'access_ocr',
        'view_invoices',
        'view_calendar',
        'export_data',
      ],
      volunteer: [
        'access_ocr',
        'view_calendar',
        'view_records',
      ],
      viewer: [
        'view_calendar',
        'view_records',
      ],
      church: [
        'view_calendar',
        'view_records',
        'manage_church_data',
        'view_invoices',
      ],
    };

    const userPermissions = rolePermissions[user.role] || [];

    // Admin has all permissions
    if (userPermissions.includes('*')) {
      return true;
    }

    return userPermissions.includes(permission);
  };

  // Convenience permission functions
  const canManageChurches = (): boolean => {
    return hasRole(['admin', 'super_admin', 'supervisor']) || hasPermission('manage_churches');
  };

  const canViewDashboard = (): boolean => {
    return hasPermission('view_dashboard');
  };

  const canManageProvisioning = (): boolean => {
    return hasRole(['admin', 'super_admin']);
  };

  const canAccessOCR = (): boolean => {
    return hasPermission('access_ocr');
  };

  const canManageInvoices = (): boolean => {
    return hasRole(['admin', 'super_admin', 'priest']);
  };

  const canViewCalendar = (): boolean => {
    return hasPermission('view_calendar');
  };

  // Super admin specific permissions
  const isSuperAdmin = (): boolean => {
    return hasRole('super_admin');
  };

  const canCreateAdmins = (): boolean => {
    return hasRole('super_admin');
  };

  const canManageAllUsers = (): boolean => {
    return hasRole('super_admin');
  };

  const canManageChurchesFullAccess = (): boolean => {
    return hasRole('super_admin');
  };

  // Root super admin specific permissions
  const ROOT_SUPERADMIN_EMAIL = 'superadmin@orthodoxmetrics.com';

  const isRootSuperAdmin = (): boolean => {
    return user?.email === ROOT_SUPERADMIN_EMAIL;
  };

  const canManageUser = (targetUser: User): boolean => {
    if (!user || !targetUser) return false;

    const isRoot = isRootSuperAdmin();
    const isManagingSelf = user.id === targetUser.id;
    const isTargetRoot = targetUser.email === ROOT_SUPERADMIN_EMAIL;

    // Root super admin can manage anyone
    if (isRoot) return true;

    // Nobody (except root) can manage the root super admin
    if (isTargetRoot) return false;

    // Users can manage themselves (limited operations)
    if (isManagingSelf) return true;

    // super_admins cannot manage other super_admins (except root manages all)
    if (user.role === 'super_admin' && targetUser.role === 'super_admin') {
      return false;
    }

    // super_admins can manage admins and below
    if (user.role === 'super_admin' && targetUser.role !== 'super_admin') {
      return true;
    }

    // Admins can manage users below their level
    if (user.role === 'admin' && !['admin', 'super_admin'].includes(targetUser.role)) {
      return true;
    }

    return false;
  };

  const canPerformDestructiveOperation = (targetUser: User): boolean => {
    if (!user || !targetUser) return false;

    const isRoot = isRootSuperAdmin();
    const isManagingSelf = user.id === targetUser.id;
    const isTargetRoot = targetUser.email === ROOT_SUPERADMIN_EMAIL;

    // Root super admin can do anything
    if (isRoot) return true;

    // Cannot perform destructive operations on root super admin
    if (isTargetRoot) return false;

    // Cannot disable/delete yourself
    if (isManagingSelf) return false;

    // super_admins cannot perform destructive operations on other super_admins
    if (user.role === 'super_admin' && targetUser.role === 'super_admin') {
      return false;
    }

    // super_admins can perform destructive operations on non-super_admins
    if (user.role === 'super_admin' && targetUser.role !== 'super_admin') {
      return true;
    }

    // Admins can perform destructive operations on users below their level
    if (user.role === 'admin' && !['admin', 'super_admin'].includes(targetUser.role)) {
      return true;
    }

    return false;
  };

  const canChangeRole = (targetUser: User, newRole: UserRole): boolean => {
    if (!user || !targetUser) return false;

    const isRoot = isRootSuperAdmin();
    const isTargetRoot = targetUser.email === ROOT_SUPERADMIN_EMAIL;

    // Root super admin can change any role
    if (isRoot) return true;

    // Cannot change root super admin's role
    if (isTargetRoot) return false;

    // Cannot assign super_admin role unless you are root
    if (newRole === 'super_admin' && !isRoot) return false;

    // super_admins cannot change other super_admin roles
    if (user.role === 'super_admin' && targetUser.role === 'super_admin') {
      return false;
    }

    // Use general management rules for other role changes
    return canManageUser(targetUser);
  };

  const contextValue: AuthContextType = {
    user,
    authenticated: !!user, // Session-based: authenticated if user exists
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

// Higher-order component for protected routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: UserRole | UserRole[],
  requiredPermission?: string
): React.ComponentType<P> => {
  return (props: P) => {
    const { authenticated, loading, user, hasRole, hasPermission } = useAuth();

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!authenticated) {
      // Redirect to login page
      window.location.href = '/auth/sign-in';
      return null;
    }

    // Check role requirements
    if (requiredRole && !hasRole(requiredRole)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

    // Check permission requirements
    if (requiredPermission && !hasPermission(requiredPermission)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this feature.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

// Hook for checking if user can access a route
export const useRouteAccess = (requiredRole?: UserRole | UserRole[], requiredPermission?: string) => {
  const { authenticated, user, hasRole, hasPermission } = useAuth();

  const canAccess = () => {
    if (!authenticated) return false;

    if (requiredRole && !hasRole(requiredRole)) return false;

    if (requiredPermission && !hasPermission(requiredPermission)) return false;

    return true;
  };

  return {
    canAccess: canAccess(),
    authenticated,
    user,
  };
};

export default AuthProvider;
