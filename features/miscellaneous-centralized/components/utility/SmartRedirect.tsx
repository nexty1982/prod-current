import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CircularProgress, Box, Typography } from '@mui/material';
import { userAPI } from '../../api/user.api';

const SmartRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const verifyAuthentication = async () => {
      try {
        console.log('🔍 SmartRedirect: Verifying authentication with backend...');

        // Use the new userAPI instead of direct fetch
        const authResult = await userAPI.auth.checkAuth();
        console.log('🔍 SmartRedirect: Backend auth check result:', authResult);

        if (authResult.authenticated && authResult.user) {
          console.log('✅ SmartRedirect: Backend confirms authentication');
          setVerified(true);

          // Determine redirect based on user role and church assignment
          const user = authResult.user;
          console.log('🔍 SmartRedirect: User role:', user.role, 'Church ID:', user.church_id);

          if (user.role === 'super_admin') {
            // Super admin should go to Orthodox Metrics Admin Dashboard
            console.log('🔍 SmartRedirect: Super admin detected, redirecting to Orthodox Metrics Dashboard');
            navigate('/dashboards/orthodmetrics', { replace: true });
          } else {
            // All other non-superadmin roles go to modern dashboard
            console.log(`🔍 SmartRedirect: ${user.role}, redirecting to modern dashboard`);
            navigate('/dashboards/modern', { replace: true });
          }
        } else {
          console.log('❌ SmartRedirect: Backend says not authenticated');
          setVerified(true);
          // Clear any cached data and redirect to homepage
          localStorage.removeItem('auth_user');
          navigate('/frontend-pages/homepage', { replace: true });
        }
      } catch (error) {
        console.error('💥 SmartRedirect: Error verifying authentication:', error);
        setVerified(true);
        // Error occurred, clear cached data and redirect to homepage
        localStorage.removeItem('auth_user');
        navigate('/frontend-pages/homepage', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    // Always verify with backend, even if we have cached user data
    verifyAuthentication();
  }, [navigate]);

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Verifying authentication...
        </Typography>
      </Box>
    );
  }

  return null;
};

export default SmartRedirect;
