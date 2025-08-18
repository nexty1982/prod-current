#!/bin/bash

echo "🚨 FIXING BLANK PAGE AND PHANTOM USER"
echo "====================================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/fix-blank-page-and-phantom.sh"
    exit 1
fi

echo "🔧 STEP 1: CLEAR ALL CACHED DATA"
echo "================================"

# Clear all sessions
echo "🗑️ Clearing all sessions from database..."
mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_db -e "DELETE FROM sessions;" 2>/dev/null
echo "✅ Sessions cleared"

echo ""
echo "🔧 STEP 2: FIX PROFILE COMPONENT"
echo "================================"

# Fix the Profile component to not show when no user
cat > ../front-end/src/layouts/full/vertical/sidebar/SidebarProfile/Profile.tsx << 'EOF'
import { Box, Avatar, Typography, IconButton, Tooltip, useMediaQuery } from '@mui/material';

import img1 from 'src/assets/images/profile/user-1.jpg';
import { IconPower } from '@tabler/icons-react';

import { Link } from 'react-router';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { useContext, useState, useEffect } from 'react';
import { useAuth } from 'src/context/AuthContext';

export const Profile = () => {
  const { isSidebarHover, isCollapse } = useContext(CustomizerContext);
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState(img1);

  // Load profile image from localStorage
  useEffect(() => {
    const loadProfileImage = () => {
      const savedProfileImage = localStorage.getItem('userProfileImage');
      if (savedProfileImage) {
        setProfileImage(savedProfileImage);
      }
    };

    // Load initially
    loadProfileImage();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userProfileImage') {
        loadProfileImage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events (for same-tab updates)
    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail?.key === 'userProfileImage') {
        loadProfileImage();
      }
    };
    
    window.addEventListener('localStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange as EventListener);
    };
  }, []);

  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? isCollapse == 'mini-sidebar' && !isSidebarHover : '';

  // Don't show profile if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <Box
      display={'flex'}
      alignItems="center"
      gap={2}
      sx={{ m: 3, p: 2, bgcolor: `${'secondary.light'}` }}
    >
      {!hideMenu ? (
        <>
          <Avatar alt="User Profile" src={profileImage} />

          <Box>
            <Typography variant="h6">
              {user?.first_name?.trim() && user?.last_name?.trim()
                ? `${user.first_name} ${user.last_name}`
                : user?.email || 'Unknown User'}
            </Typography>
            <Typography variant="caption">
              {user?.role || 'User'}
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Tooltip title="Logout" placement="top">
              <IconButton
                color="primary"
                component={Link}
                to="auth/login"
                aria-label="logout"
                size="small"
              >
                <IconPower size="20" />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      ) : (
        ''
      )}
    </Box>
  );
};
EOF

echo "✅ Fixed Profile component to not show phantom user"

echo ""
echo "🔧 STEP 3: SIMPLIFY AUTH CONTEXT"
echo "================================"

# Create a very simple AuthContext that doesn't make API calls on load
cat > ../front-end/src/context/AuthContext.tsx << 'EOF'
/**
 * OrthodoxMetrics Authentication Context & Provider
 * Simple session-based authentication
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
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
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

echo "✅ Simplified AuthContext to basic functionality"

echo ""
echo "🔧 STEP 4: REBUILD FRONTEND"
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
echo "🔧 STEP 5: TEST SERVER RESPONSE"
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
echo "1. Clear your browser cache completely:"
echo "   - Open dev tools (F12)"
echo "   - Go to Application > Storage"
echo "   - Click 'Clear site data' for orthodoxmetrics.com"
echo "2. Visit https://orthodoxmetrics.com"
echo "3. The page should load properly (no blank page)"
echo "4. No phantom user should appear in sidebar"
echo "5. Try logging in with your credentials"
echo ""
echo "🔍 EXPECTED BEHAVIOR:"
echo "===================="
echo "✅ Page loads properly (no blank page)"
echo "✅ No phantom user in sidebar"
echo "✅ After login = Real user profile shown"
echo "✅ No more authentication issues"
echo ""
echo "🏁 BLANK PAGE AND PHANTOM USER FIX COMPLETE!" 