import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Breadcrumbs,
  Link,
  Divider
} from '@mui/material';
import {
  Home as HomeIcon,
  Business as ChurchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ModernRecordsPage from './ModernRecordsPage';
import { useRecordsData } from '../hooks/useRecordsData';

export default function LegacyRecordsPageNew() {
  const navigate = useNavigate();
  const { apiReady, error, apiName } = useRecordsData();

  if (error) {
    return (
      <Box p={3}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            color="inherit"
            onClick={() => navigate('/')}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            color="inherit"
            onClick={() => navigate('/records')}
          >
            <ChurchIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Records
          </Link>
          <Typography color="text.primary">Error</Typography>
        </Breadcrumbs>

        <Typography variant="h4" gutterBottom>
          Church Records (Legacy)
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
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            color="inherit"
            onClick={() => navigate('/')}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          <Typography color="text.primary">Church Records</Typography>
        </Breadcrumbs>

        <Typography variant="h4" gutterBottom>
          Church Records (Legacy)
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
    <Box p={3}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          color="inherit"
          onClick={() => navigate('/')}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Home
        </Link>
        <Typography color="text.primary">Church Records</Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom>
        Church Records (Legacy)
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          This page now uses the new Records API Auto-Discovery system.
          Detected API: <strong>{apiName}</strong>
        </Typography>
      </Alert>

      <Divider sx={{ mb: 3 }} />

      <ModernRecordsPage />
    </Box>
  );
}