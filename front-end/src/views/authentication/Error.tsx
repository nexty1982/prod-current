import { Box, Container, Typography, Button } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import OrthodoxErrorImg from 'src/assets/images/backgrounds/orthodox-404.svg';

const Error = () => {
  const navigate = useNavigate();
  const [redirectPath, setRedirectPath] = useState('/');

  useEffect(() => {
    // [copilot-fix] Smart redirect logic based on user authentication and role
    const determineRedirectPath = () => {
      try {
        // Check if user is authenticated by looking for token or user data
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
        
        if (!token && !userData) {
          // Unauthenticated user -> go to homepage
          setRedirectPath('/');
          return;
        }

        // Try to parse user data to determine role and church assignment
        let user = null;
        if (userData) {
          try {
            user = JSON.parse(userData);
          } catch (e) {
            console.warn('Could not parse user data:', e);
          }
        }

        if (user) {
          const role = user.role?.toLowerCase() || '';
          const churchId = user.church_id || user.churchId;

          // Super admin or admin -> go to admin panel
          if (role === 'superadmin' || role === 'admin' || role === 'super_admin') {
            setRedirectPath('/admin');
            return;
          }

          // Authenticated user with church assignment -> go to their church records
          if (churchId) {
            // Construct church records path - using the UnifiedRecordsPage pattern
            const churchName = user.church_name || 'saints-peter-and-paul';
            const sanitizedChurchName = churchName.toLowerCase().replace(/\s+/g, '-');
            setRedirectPath(`/${sanitizedChurchName}-Records`);
            return;
          }
        }

        // Fallback: authenticated user without specific role/church -> go to admin
        setRedirectPath('/admin');
      } catch (error) {
        console.warn('Error determining redirect path:', error);
        // Fallback to homepage on error
        setRedirectPath('/');
      }
    };

    determineRedirectPath();
  }, []);

  const handleGoHome = () => {
    navigate(redirectPath);
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100vh"
      textAlign="center"
      justifyContent="center"
    >
      <Container maxWidth="md">
        <img src={OrthodoxErrorImg} alt="404 - Orthodox Church" style={{ maxWidth: '400px', width: '100%' }} />
        <Typography align="center" variant="h1" mb={4}>
          Opps!!!
        </Typography>
        <Typography align="center" variant="h4" mb={4}>
          The page you are looking for could not be found.
        </Typography>
        <Button
          color="primary"
          variant="contained"
          onClick={handleGoHome}
          disableElevation
        >
          Go Back to Home
        </Button>
      </Container>
    </Box>
  );
};

export default Error;
