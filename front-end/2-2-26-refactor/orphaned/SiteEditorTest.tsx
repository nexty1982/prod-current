import React, { useEffect } from 'react';
import { Box, Typography, Alert, Button } from '@mui/material';
import { useAuth } from '../context/AuthContext.tsx';

const SiteEditorTest: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    console.log('🔧 SiteEditorTest component mounted');
    console.log('User:', user);
    console.log('User role:', user?.role);
    console.log('Is super admin:', user?.role === 'super_admin');
  }, [user]);

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h3" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
        🛠️ Site Editor Test
      </Typography>
      
      <Alert severity="success" sx={{ mb: 4 }}>
        <Typography variant="body1">
          <strong>Success!</strong> The SiteEditor component is now rendering correctly.
        </Typography>
      </Alert>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          User Information
        </Typography>
        <Typography variant="body1">
          <strong>User ID:</strong> {user?.id || 'Not available'}
        </Typography>
        <Typography variant="body1">
          <strong>User Name:</strong> {user?.name || 'Not available'}
        </Typography>
        <Typography variant="body1">
          <strong>User Role:</strong> {user?.role || 'Not available'}
        </Typography>
        <Typography variant="body1">
          <strong>Is Super Admin:</strong> {user?.role === 'super_admin' ? 'Yes' : 'No'}
        </Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Test Components
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={() => alert('Primary button clicked!')}>
            Primary Button
          </Button>
          <Button variant="outlined" onClick={() => alert('Secondary button clicked!')}>
            Secondary Button
          </Button>
          <Button variant="text" onClick={() => alert('Text button clicked!')}>
            Text Button
          </Button>
        </Box>
      </Box>

      <Alert severity="info">
        <Typography variant="body1">
          <strong>Next Steps:</strong> If you can see this page, the routing is working correctly. 
          You can now replace this test component with the full SiteEditor component.
        </Typography>
      </Alert>
    </Box>
  );
};

export default SiteEditorTest; 