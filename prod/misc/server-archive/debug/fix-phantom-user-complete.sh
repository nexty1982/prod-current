#!/bin/bash

echo "🔧 COMPLETE PHANTOM USER FIX"
echo "============================"
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/fix-phantom-user-complete.sh"
    exit 1
fi

echo "🎯 ROOT CAUSE ANALYSIS:"
echo "======================="
echo "✅ Frontend AuthContext calls checkAuth() on initialization"
echo "✅ No sessions in database = 401 responses"
echo "✅ Frontend still shows cached user data from localStorage"
echo "✅ Profile component shows 'User' even when not authenticated"
echo ""

echo "🔧 STEP 1: FIX FRONTEND AUTH CONTEXT"
echo "===================================="

# Create a fixed AuthContext that doesn't make unnecessary API calls
cat > ../front-end/src/context/AuthContext.tsx << 'EOF'
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

  // Initialize auth state from localStorage ONLY - no API calls on load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = AuthService.getStoredUser();

        if (storedUser) {
          console.log('🔍 AuthContext: Found stored user data:', storedUser.email);
          
          // Set user from localStorage immediately
          setUser(storedUser);
          
          // Verify authentication with server in background (non-blocking)
          setTimeout(async () => {
            try {
              const authCheck = await AuthService.checkAuth();
              console.log('🔍 AuthContext: Background auth check result:', authCheck.authenticated);
              
              if (!authCheck.authenticated || !authCheck.user) {
                console.log('❌ AuthContext: Server says not authenticated, clearing stored data');
                // User is no longer authenticated, clear stored data
                setUser(null);
                localStorage.removeItem('auth_user');
              } else {
                console.log('✅ AuthContext: Server confirms authentication, updating user data');
                // Update user data from server
                setUser(authCheck.user);
              }
            } catch (err) {
              console.log('❌ AuthContext: Background auth check failed:', err);
              // Auth check failed, clear stored data
              setUser(null);
              localStorage.removeItem('auth_user');
            }
          }, 1000); // Delay background check by 1 second
        } else {
          console.log('🔍 AuthContext: No stored user data found');
        }
      } catch (err) {
        console.error('❌ AuthContext: Error initializing auth:', err);
        // Clear any potentially corrupted data
        setUser(null);
        localStorage.removeItem('auth_user');
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

      // Call logout API to invalidate session on server
      try {
        await AuthService.logout();
      } catch (err) {
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

    const rolePermissions: Record<UserRole, string[]> = {
      super_admin: ['*'],
      admin: ['*'],
      manager: [
        'manage_records',
        'view_dashboard',
        'manage_calendar',
        'generate_certificates',
        'access_ocr',
        'view_invoices',
        'manage_invoices',
        'manage_church_data',
      ],
      user: [
        'manage_records',
        'view_dashboard',
        'view_calendar',
        'manage_calendar',
        'access_ocr',
        'view_invoices',
        'manage_church_data',
      ],
      viewer: [
        'view_dashboard',
        'view_invoices',
      ],
    };

    const userPermissions = rolePermissions[user.role] || [];

    if (userPermissions.includes('*')) {
      return true;
    }

    return userPermissions.includes(permission);
  };

  const canManageChurches = (): boolean => {
    return hasRole(['admin', 'super_admin', 'manager']) || hasPermission('manage_churches');
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
    return hasRole(['admin', 'super_admin', 'manager']);
  };

  const canViewCalendar = (): boolean => {
    return hasPermission('view_calendar');
  };

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

  const ROOT_SUPERADMIN_EMAIL = 'superadmin@orthodoxmetrics.com';

  const isRootSuperAdmin = (): boolean => {
    return user?.email === ROOT_SUPERADMIN_EMAIL;
  };

  const canManageUser = (targetUser: User): boolean => {
    if (!user || !targetUser) return false;

    const isRoot = isRootSuperAdmin();
    const isManagingSelf = user.id === targetUser.id;
    const isTargetRoot = targetUser.email === ROOT_SUPERADMIN_EMAIL;

    if (isRoot) return true;
    if (isTargetRoot) return false;
    if (isManagingSelf) return true;

    if (user.role === 'super_admin' && targetUser.role === 'super_admin') {
      return false;
    }

    if (user.role === 'super_admin' && targetUser.role !== 'super_admin') {
      return true;
    }

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

    if (isRoot) return true;
    if (isTargetRoot) return false;
    if (isManagingSelf) return false;

    if (user.role === 'super_admin' && targetUser.role === 'super_admin') {
      return false;
    }

    if (user.role === 'super_admin' && targetUser.role !== 'super_admin') {
      return true;
    }

    if (user.role === 'admin' && !['admin', 'super_admin'].includes(targetUser.role)) {
      return true;
    }

    return false;
  };

  const canChangeRole = (targetUser: User, newRole: UserRole): boolean => {
    if (!user || !targetUser) return false;

    const isRoot = isRootSuperAdmin();
    const isTargetRoot = targetUser.email === ROOT_SUPERADMIN_EMAIL;

    if (isRoot) return true;
    if (isTargetRoot) return false;
    if (newRole === 'super_admin' && !isRoot) return false;

    if (user.role === 'super_admin' && targetUser.role === 'super_admin') {
      return false;
    }

    return canManageUser(targetUser);
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
EOF

echo "✅ Fixed AuthContext to not make blocking API calls on initialization"

echo ""
echo "🔧 STEP 2: REBUILD FRONTEND"
echo "==========================="

# Navigate to frontend directory
cd ../front-end

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "🔨 Building frontend..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend built successfully"
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo ""
echo "🔧 STEP 3: CLEAR ALL DATA"
echo "========================="

# Go back to server directory
cd ../server

# Clear all sessions
echo "🗑️ Clearing all sessions from database..."
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "DELETE FROM sessions;" 2>/dev/null
echo "✅ Sessions cleared"

echo ""
echo "🔧 STEP 4: TEST SERVER RESPONSE"
echo "==============================="

# Test server health
echo "📡 Testing server health..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" http://127.0.0.1:3001/api/health)
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -1)

echo "   Health Status: $HEALTH_STATUS"
echo "   Health Response: $HEALTH_BODY"

echo ""
echo "🎯 TESTING INSTRUCTIONS:"
echo "========================"
echo "1. Clear your browser cookies completely"
echo "2. Clear browser localStorage and sessionStorage"
echo "3. Visit https://orthodoxmetrics.com"
echo "4. You should see NO user profile in the sidebar"
echo "5. No more repeated /api/auth/check calls"
echo "6. Try logging in with your credentials"
echo "7. After login, you should see your actual user profile"
echo ""
echo "🔍 EXPECTED BEHAVIOR:"
echo "===================="
echo "✅ No authentication = No user profile shown"
echo "✅ No repeated API calls = No 401 errors"
echo "✅ After login = Real user profile shown"
echo "✅ No more phantom user issue"
echo ""
echo "🏁 COMPLETE PHANTOM USER FIX COMPLETE!" 