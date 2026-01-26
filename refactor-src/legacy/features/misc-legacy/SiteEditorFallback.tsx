import React, { useEffect } from 'react';
import { Box, Typography, Alert, Button, Card, CardContent } from '@mui/material';
import { useAuth } from '@/context/AuthContext';

const SiteEditorFallback: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    console.log('🔧 SiteEditorFallback component mounted');
    console.log('User:', user);
    console.log('User role:', user?.role);
  }, [user]);

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h3" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
        🛠️ Site Editor (Fallback Mode)
      </Typography>
      
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body1">
          <strong>Fallback Mode:</strong> The main Site Editor components are not available. 
          This is a simplified version for testing purposes.
        </Typography>
      </Alert>

      <Card sx={{ mb: 4 }}>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Test Components
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              onClick={() => alert('Primary button clicked!')}
              data-testid="fallback-primary-button"
            >
              Primary Button
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => alert('Secondary button clicked!')}
              data-testid="fallback-secondary-button"
            >
              Secondary Button
            </Button>
            <Button 
              variant="text" 
              onClick={() => alert('Text button clicked!')}
              data-testid="fallback-text-button"
            >
              Text Button
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Alert severity="warning">
        <Typography variant="body1">
          <strong>Note:</strong> This is a fallback component. The full Site Editor with overlay functionality 
          is not available in this mode. Check the browser console for any error messages.
        </Typography>
      </Alert>
    </Box>
  );
};

export default SiteEditorFallback; 