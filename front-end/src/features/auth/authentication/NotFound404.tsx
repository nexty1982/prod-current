/**
 * NotFound404.tsx
 * Custom 404 "Page Not Found" error page
 * Features a clean, modern design with illustration and clear call-to-action
 */

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper
} from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
const OM_COLORS = { purple: '#7c3aed' };

const NotFound404: React.FC = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4
      }}
    >
      <Container maxWidth="md">
        <Box
          sx={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4
          }}
        >
          {/* 404 Illustration Container */}
          <Paper
            elevation={0}
            sx={{
              p: 4,
              bgcolor: '#f8f9fa',
              borderRadius: 3,
              border: '1px solid #e9ecef',
              maxWidth: 400,
              width: '100%'
            }}
          >
            <Box
              component="img"
              src="/404.png"
              alt="404 Error Illustration"
              sx={{
                width: '100%',
                height: 'auto',
                maxWidth: 300,
                display: 'block',
                margin: '0 auto'
              }}
            />
          </Paper>

          {/* Main Heading */}
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              lineHeight: 1.2
            }}
          >
            Opps!!!
          </Typography>

          {/* Descriptive Text */}
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              fontWeight: 400,
              maxWidth: 500,
              lineHeight: 1.5,
              fontSize: { xs: '1.1rem', md: '1.25rem' }
            }}
          >
            The page you are looking for could not be found.
          </Typography>

          {/* Action Button */}
          <Button
            variant="contained"
            size="large"
            startIcon={<HomeIcon />}
            onClick={handleGoHome}
                         sx={{
               bgcolor: OM_COLORS.purple,
               color: 'white',
               px: 4,
               py: 1.5,
               borderRadius: 3,
               fontSize: '1.1rem',
               fontWeight: 600,
               textTransform: 'none',
               boxShadow: '0 4px 12px rgba(91, 46, 191, 0.3)',
               '&:hover': {
                 bgcolor: '#4a1f9a',
                 boxShadow: '0 6px 16px rgba(91, 46, 191, 0.4)',
                 transform: 'translateY(-1px)'
               },
               transition: 'all 0.2s ease-in-out'
             }}
          >
            Go Back to Home
          </Button>

          {/* Additional Help Text */}
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mt: 2,
              opacity: 0.8,
              fontSize: '0.9rem'
            }}
          >
            If you believe this is an error, please contact support.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default NotFound404;
