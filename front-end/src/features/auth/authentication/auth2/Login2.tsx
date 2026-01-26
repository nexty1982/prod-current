import Grid2 from '@/components/compat/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Grid, Box, Card, Stack, Typography } from '@mui/material';



// components
import PageContainer from '@/shared/ui/PageContainer';
import AuthLogin from '@/features/auth/authentication/authForms/AuthLogin';
import { useAuth } from '@/context/AuthContext';
import { CustomizerContext } from '@/context/CustomizerContext';

const Login2 = () => {
  const { user } = useAuth();
  const { activeMode, setActiveMode } = useContext(CustomizerContext);
  
  // Get display name for welcome message
  const displayName = user?.full_name || (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : null);

  // Ensure dark mode is set on login page (if no manual preference)
  useEffect(() => {
    const hasManualPreference = localStorage.getItem('orthodoxmetrics-activeMode') !== null;
    if (!hasManualPreference) {
      // Check if it's dark mode time (6 PM to 6 AM)
      const now = new Date();
      const hours = now.getHours();
      const shouldBeDark = hours >= 18 || hours < 6;
      
      if (shouldBeDark && activeMode !== 'dark') {
        setActiveMode('dark');
      }
    }
  }, [activeMode, setActiveMode]);

  return (
    (<PageContainer title="Login" description="this is Login page">
      <Box
        sx={{
          position: 'relative',
          '&:before': {
            content: '""',
            background: 'radial-gradient(#d2f1df, #d3d7fa, #bad8f4)',
            backgroundSize: '400% 400%',
            animation: 'gradient 15s ease infinite',
            position: 'absolute',
            height: '100%',
            width: '100%',
            opacity: '0.3',
          },
        }}
      >
        <Grid2 container spacing={0} justifyContent="center" sx={{ height: '100vh' }}>
          <Grid2
            display="flex"
            justifyContent="center"
            alignItems="center"
            size={{
              xs: 12,
              sm: 12,
              lg: 5,
              xl: 4
            }}>
            <Card elevation={9} sx={{ p: 4, zIndex: 1, width: '100%', maxWidth: '450px' }}>
              <Box display="flex" alignItems="center" justifyContent="center">
                <Box
                  component="img"
                  src="/images/incode/biz-logo.png"
                  alt="Orthodox Metrics"
                  sx={{
                    maxWidth: '200px',
                    height: 'auto',
                    mb: 2,
                  }}
                />
              </Box>
              <AuthLogin
                subtitle={
                  <Stack direction="row" spacing={1} justifyContent="center" mt={3}>
                    <Typography color="textSecondary" variant="h6" fontWeight="500">
                      New to Orthodox Metrics?
                    </Typography>
                    <Typography
                      component={Link}
                      to="/auth/register"
                      fontWeight="500"
                      sx={{
                        textDecoration: 'none',
                        color: 'primary.main',
                      }}
                    >
                      Create an account
                    </Typography>
                  </Stack>
                }
              />
            </Card>
          </Grid2>
        </Grid2>
      </Box>
    </PageContainer>)
  );
};

export default Login2;
