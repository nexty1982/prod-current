import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import ModernRecordsPage from './ModernRecordsPage';
import { useRecordsData } from '../hooks/useRecordsData';

export default function SSPPOCRecordsPageNew() {
  const { apiReady, error } = useRecordsData();

  if (error) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Orthodox Records
        </Typography>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Records API Auto-Discovery Failed
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              The system tried to discover your Records API but couldn't find a compatible endpoint.
              Please ensure your backend has one of the following endpoint patterns:
            </Typography>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li><code>/api/records/:churchId/tables</code> (v2 style)</li>
              <li><code>/api/church/:churchId/records/tables</code> (legacy style)</li>  
              <li><code>/api/records?churchId=:id&op=listTables</code> (flat style)</li>
            </ul>
          </Box>
        </Alert>
      </Box>
    );
  }

  if (!apiReady) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          Orthodox Records
        </Typography>
        <Card>
          <CardContent>
            <Typography>
              🔍 Discovering Records API endpoints...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <ModernRecordsPage />
    </Box>
  );
}