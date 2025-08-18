#!/bin/bash

echo "🚨 FIXING INITIAL BLANK PAGE"
echo "============================"
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/fix-initial-blank-page.sh"
    exit 1
fi

echo "🎯 ISSUE IDENTIFIED:"
echo "===================="
echo "✅ Page loads blank initially"
echo "✅ Refresh works (shows login page)"
echo "✅ JavaScript error or timing issue preventing initial render"
echo ""

echo "🔧 STEP 1: SIMPLIFY AUTH CONTEXT"
echo "================================"

# Create a very simple AuthContext that always renders
cat > ../front-end/src/context/AuthContext.tsx << 'EOF'
/**
 * OrthodoxMetrics Authentication Context & Provider
 * Simplified version to prevent blank page
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AuthService from '../services/authService';
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

echo "✅ Simplified AuthContext to prevent blank page"

echo ""
echo "🔧 STEP 2: SIMPLIFY SMART REDIRECT"
echo "=================================="

# Create a simpler SmartRedirect that doesn't cause timing issues
cat > ../front-end/src/components/routing/SmartRedirect.tsx << 'EOF'
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CircularProgress, Box, Typography } from '@mui/material';

const SmartRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Simple redirect logic without complex async operations
    if (user) {
      console.log('🔄 SmartRedirect: User found, redirecting to dashboard');
      navigate('/dashboards/modern', { replace: true });
    } else {
      console.log('🔒 SmartRedirect: No user found, redirecting to login');
      navigate('/auth/login', { replace: true });
    }
  }, [user, navigate]);

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="200px">
      <CircularProgress />
      <Typography variant="body2" sx={{ mt: 2 }}>
        Redirecting...
      </Typography>
    </Box>
  );
};

export default SmartRedirect;
EOF

echo "✅ Simplified SmartRedirect to prevent timing issues"

echo ""
echo "🔧 STEP 3: REBUILD FRONTEND"
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
echo "🔧 STEP 4: TEST SERVER RESPONSE"
echo "==============================="

# Go back to server directory
cd ../server

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
echo "1. Clear your browser cache completely"
echo "2. Visit https://orthodoxmetrics.com"
echo "3. Page should load immediately (no blank page)"
echo "4. Should see 'Redirecting...' message briefly"
echo "5. Should be redirected to login page"
echo ""
echo "🔍 EXPECTED BEHAVIOR:"
echo "===================="
echo "✅ Page loads immediately (no blank page)"
echo "✅ Shows loading indicator briefly"
echo "✅ Redirects to login page"
echo "✅ No timing issues or JavaScript errors"
echo ""
echo "🏁 INITIAL BLANK PAGE FIX COMPLETE!" 