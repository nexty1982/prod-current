import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Container, Button } from '@mui/material';
import { IconArrowLeft } from '@tabler/icons-react';

const Tour: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate(-1); // Go back to previous page
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          gap: 3,
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          Page is coming soon!
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          The guided tour feature is currently under development.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          You will be redirected back in a few seconds...
        </Typography>
        <Button
          variant="contained"
          startIcon={<IconArrowLeft />}
          onClick={handleGoBack}
          sx={{ mt: 2 }}
        >
          Go Back Now
        </Button>
      </Box>
    </Container>
  );
};

export default Tour;

