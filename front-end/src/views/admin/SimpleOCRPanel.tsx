/**
 * Simple OCR Data Panel Test
 * 
 * Minimal version to test if the routing issue is resolved
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

const SimpleOCRPanel: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        OCR Data Management (Test)
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        This is the new OCR interface. If you can see this message, the routing fix worked!
      </Alert>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upload Orthodox Records
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Test version - wizard functionality will be added back once routing is confirmed.
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<CloudUpload />}
            onClick={() => alert('OCR Upload interface is working!')}
          >
            Test Upload
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SimpleOCRPanel;
