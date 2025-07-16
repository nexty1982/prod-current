import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/orthodox-metrics.types';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
}) => {
  const { authenticated, loading, hasRole, hasPermission } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!authenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // Check role requirements
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/auth/unauthorized" replace />;
  }

  // Check permission requirements
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/auth/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
