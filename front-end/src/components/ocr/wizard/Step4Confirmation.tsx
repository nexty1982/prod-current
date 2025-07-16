/**
 * Step 4: Confirmation and Submission
 * 
 * Features:
 * - Final configuration summary
 * - File list with processing estimates
 * - Submit button to start OCR processing
 * - Processing cost/time estimates
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Button,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Description as Document,
  Language,
  Speed as Gauge,
  AutoMode,
  Schedule,
  Assessment,
  CheckCircle,
  CloudUpload
} from '@mui/icons-material';

import { WizardFormData } from '../WizardUpload';

interface Step4ConfirmationProps {
  formData: WizardFormData;
  onSubmit: () => void;
  loading: boolean;
}

const recordTypeLabels = {
  baptism: 'Baptism Records',
  marriage: 'Marriage Records',
  funeral: 'Funeral Records'
};

const languageLabels = {
  en: 'English',
  gr: 'Greek',
  ru: 'Russian',
  ro: 'Romanian'
};

const qualityLabels = {
  fast: 'Fast Processing',
  balanced: 'Balanced Quality',
  high_accuracy: 'High Accuracy'
};

export const Step4Confirmation: React.FC<Step4ConfirmationProps> = ({
  formData,
  onSubmit,
  loading
}) => {
  const validFiles = formData.files.filter(file => file.valid);
  
  // Calculate estimates
  const timePerFile = formData.quality === 'fast' ? 30 : 
                     formData.quality === 'balanced' ? 60 : 120;
  const totalSeconds = validFiles.length * timePerFile;
  const totalMinutes = Math.ceil(totalSeconds / 60);
  
  const expectedAccuracy = formData.quality === 'fast' ? '85-90%' :
                          formData.quality === 'balanced' ? '90-95%' : '95-99%';

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalFileSize = validFiles.reduce((sum, file) => sum + file.fileSize, 0);

  if (validFiles.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            No valid files are ready for processing. Please go back and upload valid files.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Confirm OCR Processing
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review your configuration and start OCR processing
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Configuration Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Processing Configuration
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Document color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Record Type"
                    secondary={recordTypeLabels[formData.recordType]}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Language color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Document Language"
                    secondary={languageLabels[formData.language]}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Gauge color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Quality Mode"
                    secondary={`${qualityLabels[formData.quality]} (${expectedAccuracy} accuracy)`}
                  />
                </ListItem>
                
                {formData.autoInsert && (
                  <ListItem>
                    <ListItemIcon>
                      <AutoMode color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Auto-Insert"
                      secondary={`Enabled at ${formData.confidenceThreshold}% confidence`}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Processing Estimates */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Processing Estimates
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Files Ready"
                    secondary={`${validFiles.length} files (${formatFileSize(totalFileSize)})`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Schedule color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Estimated Time"
                    secondary={`~${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Assessment color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Expected Accuracy"
                    secondary={expectedAccuracy}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* File List */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Files to Process ({validFiles.length})
              </Typography>
              
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                <List dense>
                  {validFiles.map((file, index) => (
                    <ListItem key={file.id} divider={index < validFiles.length - 1}>
                      <ListItemText
                        primary={file.name}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Chip 
                              label={file.fileType.toUpperCase()} 
                              size="small" 
                              variant="outlined" 
                            />
                            <Chip 
                              label={formatFileSize(file.fileSize)} 
                              size="small" 
                              variant="outlined" 
                            />
                            {file.width > 0 && (
                              <Chip 
                                label={`${file.width}×${file.height}`} 
                                size="small" 
                                variant="outlined" 
                              />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Processing Information */}
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>What happens next:</strong>
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 1 }}>
              1. Files will be uploaded to our secure OCR processing system<br />
              2. Google Vision API will extract text and identify Orthodox record fields<br />
              3. Results will be validated and checked for accuracy<br />
              4. {formData.autoInsert 
                   ? `High-confidence results (≥${formData.confidenceThreshold}%) will be automatically saved to your database`
                   : 'You will review all results before saving to your database'}
            </Typography>
          </Alert>
        </Grid>

        {/* Submit Button */}
        <Grid item xs={12}>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            {loading ? (
              <Box>
                <Typography variant="body1" gutterBottom>
                  Uploading and starting OCR processing...
                </Typography>
                <LinearProgress sx={{ width: 300, mx: 'auto', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  This may take a few moments
                </Typography>
              </Box>
            ) : (
              <Button
                variant="contained"
                size="large"
                startIcon={<CloudUpload />}
                onClick={onSubmit}
                sx={{ minWidth: 200 }}
              >
                Start OCR Processing
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
