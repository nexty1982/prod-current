import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import SharedFooter from '@/components/frontend-pages/shared/footer';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import { useAuth } from '@/context/AuthContext';

const ChurchPortalLayout: React.FC = () => {
  const { authenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!authenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <HpHeader />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: '32px',
          pb: '64px',
          px: { xs: 2, sm: 3, md: 4 },
          maxWidth: '1400px',
          mx: 'auto',
          width: '100%',
        }}
      >
        <Outlet />
      </Box>
      <SharedFooter />
      <ScrollToTop />
    </Box>
  );
};

export default ChurchPortalLayout;
