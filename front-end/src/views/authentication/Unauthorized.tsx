import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router';
import { IconShieldX } from '@tabler/icons-react';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        textAlign="center"
      >
        <IconShieldX size={120} color="red" />
        <Typography variant="h1" component="h1" gutterBottom>
          403
        </Typography>
        <Typography variant="h4" component="h2" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          You don't have permission to access this page or resource.
        </Typography>
        <Box mt={3}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGoHome}
            sx={{ mr: 2 }}
          >
            Go to Home
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleGoBack}
          >
            Go Back
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Unauthorized;
