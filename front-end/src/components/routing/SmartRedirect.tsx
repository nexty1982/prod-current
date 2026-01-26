import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CircularProgress, Box, Typography } from '@mui/material';
import { checkAuth, clearAuthData, getCurrentUser } from '../../auth/authClient';

const SmartRedirect: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Debug logging
  const debugLog = (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`🔀 SmartRedirect: ${message}`, data || '');
    }
  };

  // Safe navigation that checks if component is still mounted
  const safeNavigate = (path: string, options?: { replace?: boolean }) => {
    if (mountedRef.current) {
      debugLog(`Navigating to: ${path}`, { mounted: true });
      navigate(path, options);
    } else {
      debugLog(`Navigation cancelled - component unmounted`, { path });
    }
  };

  useEffect(() => {
    // Set mounted flag
    mountedRef.current = true;

    // Cleanup function
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Async IIFE to handle auth verification
    (async () => {
      try {
        debugLog('Starting authentication verification');

        // 1. Safe useAuth handling - check if auth context exists
        if (!auth) {
          debugLog('Auth context not available, redirecting to homepage');
          clearAuthData();
          safeNavigate('/frontend-pages/homepage', { replace: true });
          return;
        }

        // 2. Check if checkAuth function exists before calling
        if (typeof checkAuth !== 'function') {
          debugLog('checkAuth function not available, falling back to context auth state');

          // Fallback to context-based auth check
          const contextUser = auth.user;
          const isAuthenticated = Boolean(contextUser && auth.authenticated);

          if (isAuthenticated && contextUser) {
            debugLog('Using context auth - user is authenticated', {
              role: contextUser.role,
              id: contextUser.id
            });

            // Special case: frjames@ssppoc.org always goes to user dashboard
            if (contextUser.email === 'frjames@ssppoc.org') {
              safeNavigate('/dashboards/user', { replace: true });
            }
            // Redirect based on role: super_admin/admin to Super Dashboard, priest and others to User Dashboard
            else if (contextUser.role === 'super_admin' || contextUser.role === 'admin') {
              safeNavigate('/dashboards/super', { replace: true });
            } else if (contextUser.role === 'priest') {
              safeNavigate('/dashboards/user', { replace: true });
            } else {
              safeNavigate('/dashboards/user', { replace: true });
            }
          } else {
            debugLog('Context auth - user not authenticated');
            clearAuthData();
            safeNavigate('/frontend-pages/homepage', { replace: true });
          }

          if (mountedRef.current) {
            setLoading(false);
          }
          return;
        }

        // 3. Run checkAuth with proper error handling
        debugLog('Calling checkAuth function');
        const isAuthenticated = await checkAuth();

        // Check if component is still mounted before proceeding
        if (!mountedRef.current) {
          debugLog('Component unmounted during auth check, aborting');
          return;
        }

        debugLog('Auth check completed', { isAuthenticated });

        if (isAuthenticated) {
          // User is authenticated, determine redirect location
          const currentUser = getCurrentUser() || auth.user;

          if (currentUser) {
            debugLog('User authenticated, determining redirect', {
              role: currentUser.role,
              church_id: currentUser.church_id
            });

            // Special case: frjames@ssppoc.org always goes to user dashboard
            if (currentUser.email === 'frjames@ssppoc.org') {
              safeNavigate('/dashboards/user', { replace: true });
            }
            // Redirect based on role: super_admin/admin to Super Dashboard, priest and others to User Dashboard
            else if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
              safeNavigate('/dashboards/super', { replace: true });
            } else if (currentUser.role === 'priest') {
              safeNavigate('/dashboards/user', { replace: true });
            } else {
              safeNavigate('/dashboards/user', { replace: true });
            }
          } else {
            // Authenticated but no user data - try to refresh auth
            debugLog('Authenticated but no user data, refreshing auth');
            if (auth.refreshAuth && typeof auth.refreshAuth === 'function') {
              try {
                await auth.refreshAuth();
                // After refresh, try again
                const refreshedUser = auth.user || getCurrentUser();
                if (refreshedUser) {
                  // Special case: frjames@ssppoc.org always goes to user dashboard
                  if (refreshedUser.email === 'frjames@ssppoc.org') {
                    safeNavigate('/dashboards/user', { replace: true });
                  }
                  // Redirect based on role: super_admin/admin to Super Dashboard, priest and others to User Dashboard
                  else if (refreshedUser.role === 'super_admin' || refreshedUser.role === 'admin') {
                    safeNavigate('/dashboards/super', { replace: true });
                  } else if (refreshedUser.role === 'priest') {
                    safeNavigate('/dashboards/user', { replace: true });
                  } else {
                    safeNavigate('/dashboards/user', { replace: true });
                  }
                } else {
                  // Still no user data after refresh
                  safeNavigate('/frontend-pages/homepage', { replace: true });
                }
              } catch (refreshError) {
                debugLog('Auth refresh failed', { error: refreshError });
                clearAuthData();
                safeNavigate('/frontend-pages/homepage', { replace: true });
              }
            } else {
              // Can't refresh, redirect to homepage
              safeNavigate('/frontend-pages/homepage', { replace: true });
            }
          }
        } else {
          // User is not authenticated
          debugLog('User not authenticated, redirecting to homepage');
          clearAuthData();
          safeNavigate('/frontend-pages/homepage', { replace: true });
        }

      } catch (error) {
        debugLog('SmartRedirect error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          name: error instanceof Error ? error.name : 'UnknownError'
        });

        // On any error, clear auth data and redirect to homepage
        if (mountedRef.current) {
          clearAuthData();
          safeNavigate('/frontend-pages/homepage', { replace: true });
        }
      } finally {
        // Always set loading to false if component is still mounted
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    })();

  }, [navigate, auth]);

  // Show loading spinner while verifying authentication
  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="200px">
        <CircularProgress size={40} />
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          Verifying authentication...
        </Typography>
      </Box>
    );
  }

  // Return null once navigation is complete
  return null;
};

export default SmartRedirect;
