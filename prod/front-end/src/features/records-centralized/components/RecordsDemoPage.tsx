import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Stack,
  Chip,
  Switch,
  FormControlLabel
} from '@mui/material';
import { mockAPIHandler } from '../utils/mockApiHandler';
import ModernRecordsPage from './ModernRecordsPage';

export default function RecordsDemoPage() {
  const [mockEnabled, setMockEnabled] = useState(false);

  useEffect(() => {
    // Enable mock API for demo
    mockAPIHandler.enable();
    setMockEnabled(true);
    
    return () => {
      mockAPIHandler.disable();
      setMockEnabled(false);
    };
  }, []);

  const toggleMockAPI = () => {
    if (mockEnabled) {
      mockAPIHandler.disable();
      setMockEnabled(false);
    } else {
      mockAPIHandler.enable();
      setMockEnabled(true);
    }
  };

  return (
    <Box>
      <Box p={3} pb={0}>
        <Typography variant="h4" gutterBottom>
          Records API Auto-Discovery Demo
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Live Demonstration
          </Typography>
          <Typography variant="body2" paragraph>
            This page demonstrates the Records API auto-discovery system in action. 
            The mock API handler simulates backend endpoints for testing purposes.
          </Typography>
          
          <Stack direction="row" spacing={2} alignItems="center" mt={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={mockEnabled}
                  onChange={toggleMockAPI}
                  color="primary"
                />
              }
              label="Mock API Enabled"
            />
            <Chip 
              label={mockEnabled ? "Using Mock Data" : "Using Real API"}
              color={mockEnabled ? "warning" : "primary"}
              variant={mockEnabled ? "filled" : "outlined"}
            />
          </Stack>
        </Alert>

        {mockEnabled && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Mock API Details
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                The mock API handler simulates all three endpoint patterns:
              </Typography>
              <ul style={{ marginLeft: 20, fontSize: '0.875rem', color: '#666' }}>
                <li><strong>records.v2:</strong> /api/records/1/tables</li>
                <li><strong>records.legacy:</strong> /api/church/1/records/tables</li>
                <li><strong>records.flat:</strong> /api/records?churchId=1&op=listTables</li>
              </ul>
              <Typography variant="body2" color="textSecondary">
                Sample data includes baptism, marriage, and funeral records with realistic Orthodox church data.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      <ModernRecordsPage />
    </Box>
  );
}