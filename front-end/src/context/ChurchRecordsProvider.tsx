// Church Records Management System Context Provider
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '../api/church-records.hooks';
import type { User } from '../types/church-records.types';

interface ChurchRecordsContextType {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  error: any;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => void;
}

const ChurchRecordsContext = createContext<ChurchRecordsContextType | undefined>(undefined);

interface ChurchRecordsProviderProps {
  children: ReactNode;
}

export const ChurchRecordsProvider: React.FC<ChurchRecordsProviderProps> = ({ children }) => {
  const auth = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize authentication state on mount
    if (!auth.loading && !isInitialized) {
      setIsInitialized(true);
    }
  }, [auth.loading, isInitialized]);

  const signIn = async (username: string, password: string) => {
    try {
      const result = await auth.signIn.trigger({ username, password });
      if (result.success) {
        auth.mutate(); // Refresh auth state
      } else {
        throw new Error(result.message || 'Sign in failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut.trigger();
      auth.mutate(); // Refresh auth state
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const refreshAuth = () => {
    auth.mutate();
  };

  const value: ChurchRecordsContextType = {
    user: auth.user,
    authenticated: auth.authenticated,
    loading: auth.loading || !isInitialized,
    error: auth.error,
    signIn,
    signOut,
    refreshAuth,
  };

  return (
    <ChurchRecordsContext.Provider value={value}>
      {children}
    </ChurchRecordsContext.Provider>
  );
};

export const useChurchRecords = (): ChurchRecordsContextType => {
  const context = useContext(ChurchRecordsContext);
  if (context === undefined) {
    throw new Error('useChurchRecords must be used within a ChurchRecordsProvider');
  }
  return context;
};

// Higher-order component for protected routes
export const withChurchRecordsAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> => {
  return (props: P) => {
    const { authenticated, loading } = useChurchRecords();

    if (loading) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      );
    }

    if (!authenticated) {
      // Redirect to login or show login form
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
          <div className="text-center">
            <h4>Authentication Required</h4>
            <p>Please sign in to access this feature.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

// Role-based access control hook
export const usePermissions = () => {
  const { user } = useChurchRecords();

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false;
    
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    
    return user.role === role;
  };

  const canManageRecords = (): boolean => {
    return hasRole(['admin', 'priest', 'supervisor']);
  };

  const canViewDashboard = (): boolean => {
    return hasRole(['admin', 'priest', 'supervisor']);
  };

  const canManageUsers = (): boolean => {
    return hasRole(['admin']);
  };

  const canAccessOCR = (): boolean => {
    return hasRole(['admin', 'priest', 'supervisor', 'volunteer']);
  };

  const canGenerateCertificates = (): boolean => {
    return hasRole(['admin', 'priest', 'supervisor']);
  };

  const canManageCalendar = (): boolean => {
    return hasRole(['admin', 'priest']);
  };

  const canExportData = (): boolean => {
    return hasRole(['admin', 'priest', 'supervisor']);
  };

  const canDeleteRecords = (): boolean => {
    return hasRole(['admin', 'priest']);
  };

  return {
    user,
    hasRole,
    canManageRecords,
    canViewDashboard,
    canManageUsers,
    canAccessOCR,
    canGenerateCertificates,
    canManageCalendar,
    canExportData,
    canDeleteRecords,
  };
};

export default ChurchRecordsProvider;
