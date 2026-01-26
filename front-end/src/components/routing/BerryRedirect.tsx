import React, { useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

const BerryRedirect: React.FC = () => {
  useEffect(() => {
    // Redirect to berry application
    window.location.href = '/berry/';
  }, []);

  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center" 
      minHeight="400px"
      gap={2}
    >
      <CircularProgress />
      <Typography variant="h6">
        Redirecting to Berry UI...
      </Typography>
      <Typography variant="body2" color="text.secondary">
        If you are not redirected automatically, 
        <a href="/berry/" style={{ marginLeft: '4px' }}>click here</a>
      </Typography>
    </Box>
  );
};

export default BerryRedirect;
