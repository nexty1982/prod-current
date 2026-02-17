/**
 * OCRStudioPage Component
 * 
 * Main OCR studio page for processing and managing OCR jobs.
 * Provides a comprehensive interface for OCR operations.
 * 
 * Routes: 
 * - /devel/ocr-studio
 */

import {
    Assessment as AssessmentIcon,
    History as HistoryIcon,
    Settings as SettingsIcon,
    CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { Box, Button, Card, CardContent, Grid, Paper, Typography } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const OCRStudioPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          OCR Studio
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Process documents with Optical Character Recognition (OCR) to extract text and data from images.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Upload Documents
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Upload images or PDFs to process with OCR
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<UploadIcon />}
                  onClick={() => navigate('/devel/ocr-studio/upload')}
                >
                  Upload & Process
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <HistoryIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Job History
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  View and manage past OCR processing jobs
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => navigate('/devel/ocr-studio/jobs')}
                >
                  View Jobs
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <SettingsIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  OCR Settings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Configure OCR processing options and preferences
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={() => navigate('/devel/ocr-studio/settings')}
                >
                  Configure
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <AssessmentIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Analytics & Reports
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  View OCR processing statistics and performance metrics
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AssessmentIcon />}
                  disabled
                >
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default OCRStudioPage;
