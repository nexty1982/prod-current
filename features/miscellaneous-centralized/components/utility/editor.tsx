import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import OMBEditor from './OMBEditor';

const OMBEditorPage: React.FC = () => {
  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      <Typography variant="h3" component="h1" gutterBottom>
        🏗️ OrthodoxMetrics Builder (OMB)
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Visual Site Editor for creating and configuring UI components
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        This editor allows super_admin users to create and configure UI components with automatic metadata generation.
      </Alert>
      
      <OMBEditor />
    </Box>
  );
};

export default OMBEditorPage; 