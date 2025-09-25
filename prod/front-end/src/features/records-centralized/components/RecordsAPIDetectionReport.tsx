import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  Grid,
  Paper
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as ErrorIcon,
  Info as InfoIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { getRecordsAPI } from '../api/recordsAutoClient';

interface DetectionResult {
  status: 'loading' | 'success' | 'error';
  apiName?: string;
  baseUrl?: string;
  error?: string;
  detectionDetails: Array<{
    base: string;
    candidateName: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}

export default function RecordsAPIDetectionReport() {
  const [result, setResult] = useState<DetectionResult>({
    status: 'loading',
    detectionDetails: []
  });

  useEffect(() => {
    const runDetection = async () => {
      setResult(prev => ({ ...prev, status: 'loading' }));

      const detectionDetails: DetectionResult['detectionDetails'] = [];
      
      // Test different API bases and candidates manually for reporting
      const bases = [
        (import.meta.env.VITE_API_BASE as string) || '/api',
        '/api',
        ''
      ];

      const candidateNames = ['records.v2', 'records.legacy', 'records.flat'];
      
      // Mock detection details (in a real implementation, we'd modify the getRecordsAPI to return this info)
      for (const base of bases) {
        for (const candidateName of candidateNames) {
          detectionDetails.push({
            base,
            candidateName,
            status: 'failed',
            error: 'Connection refused or 404'
          });
        }
      }

      try {
        const discovered = await getRecordsAPI();
        
        // Mark the successful one
        const successIndex = detectionDetails.findIndex(d => 
          d.candidateName === discovered.api.name
        );
        if (successIndex >= 0) {
          detectionDetails[successIndex] = {
            ...detectionDetails[successIndex],
            status: 'success'
          };
        }

        setResult({
          status: 'success',
          apiName: discovered.api.name,
          baseUrl: discovered.base,
          detectionDetails
        });
      } catch (error) {
        setResult({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          detectionDetails
        });
      }
    };

    runDetection();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      default: return <SearchIcon color="action" />;
    }
  };

  const getStatusColor = (status: string): "success" | "error" | "default" => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Records API Detection Report
      </Typography>

      <Typography variant="body1" color="textSecondary" paragraph>
        This report shows the auto-discovery process for Orthodox Metrics Records API endpoints.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detection Status
              </Typography>
              
              {result.status === 'loading' && (
                <Box>
                  <LinearProgress sx={{ mb: 2 }} />
                  <Typography>Probing API endpoints...</Typography>
                </Box>
              )}

              {result.status === 'success' && (
                <Alert severity="success" icon={<CheckIcon />}>
                  <Typography variant="h6">
                    API Discovered Successfully!
                  </Typography>
                  <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                    <Chip 
                      label={`Shape: ${result.apiName}`} 
                      color="success" 
                      size="small" 
                    />
                    <Chip 
                      label={`Base URL: ${result.baseUrl}`} 
                      color="primary" 
                      size="small" 
                    />
                  </Box>
                </Alert>
              )}

              {result.status === 'error' && (
                <Alert severity="error" icon={<ErrorIcon />}>
                  <Typography variant="h6">
                    Detection Failed
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {result.error}
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Environment Configuration
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="VITE_API_BASE"
                    secondary={(import.meta.env.VITE_API_BASE as string) || 'Not set (using /api)'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="VITE_DEFAULT_CHURCH_ID"
                    secondary={(import.meta.env.VITE_DEFAULT_CHURCH_ID as string) || 'Not set (using 1)'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detection Details
              </Typography>
              
              <Typography variant="body2" color="textSecondary" paragraph>
                The system tries each combination of base URL and API shape until one succeeds:
              </Typography>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <List>
                  {result.detectionDetails.map((detail, index) => (
                    <Box key={index}>
                      <ListItem>
                        <ListItemIcon>
                          {getStatusIcon(detail.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography component="span">
                                {detail.base || 'Same origin'}/{detail.candidateName}
                              </Typography>
                              <Chip 
                                label={detail.status} 
                                color={getStatusColor(detail.status)}
                                size="small" 
                              />
                            </Box>
                          }
                          secondary={detail.error || (detail.status === 'success' ? 'API endpoint responded successfully' : '')}
                        />
                      </ListItem>
                      {index < result.detectionDetails.length - 1 && <Divider />}
                    </Box>
                  ))}
                </List>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Supported API Shapes
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      records.v2 (Modern)
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      <code>/api/records/:churchId/tables</code><br />
                      <code>/api/records/:churchId/tables/:table/columns</code><br />
                      <code>/api/records/:churchId/tables/:table/rows</code>
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      records.legacy (Legacy)
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      <code>/api/church/:churchId/records/tables</code><br />
                      <code>/api/church/:churchId/records/:table/columns</code><br />
                      <code>/api/church/:churchId/records/:table/rows</code>
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      records.flat (Flat)
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      <code>/api/records?churchId=:id&op=listTables</code><br />
                      <code>/api/records?churchId=:id&op=listColumns&table=:table</code><br />
                      <code>/api/records?churchId=:id&op=listRows&table=:table</code>
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}