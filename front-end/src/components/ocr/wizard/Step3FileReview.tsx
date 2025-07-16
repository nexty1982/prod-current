/**
 * Step 3: File Review with Thumbnails
 * 
 * Features:
 * - Thumbnail preview of uploaded files
 * - File validation status
 * - Option to remove files
 * - Warnings for issues
 * - File details display
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  Delete,
  Visibility,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  PictureAsPdf,
  ZoomIn
} from '@mui/icons-material';

import { WizardFormData, UploadFileMetadata } from '../WizardUpload';

interface Step3FileReviewProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

export const Step3FileReview: React.FC<Step3FileReviewProps> = ({
  formData,
  updateFormData
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadFileMetadata | null>(null);

  const removeFile = (fileId: string) => {
    const updatedFiles = formData.files.filter(file => file.id !== fileId);
    updateFormData({ files: updatedFiles });
  };

  const openPreview = (file: UploadFileMetadata) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewOpen(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (file: UploadFileMetadata) => {
    if (file.valid) return 'success';
    return 'error';
  };

  const getStatusIcon = (file: UploadFileMetadata) => {
    if (file.valid) return <CheckCircle color="success" />;
    return <ErrorIcon color="error" />;
  };

  const validFiles = formData.files.filter(file => file.valid);
  const invalidFiles = formData.files.filter(file => !file.valid);

  if (formData.files.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No files uploaded
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Go back to Step 2 to upload files
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Review Uploaded Files
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review your uploaded files and resolve any issues before processing
        </Typography>
      </Box>

      {/* Summary Alerts */}
      {invalidFiles.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>{invalidFiles.length}</strong> file(s) have issues that need to be resolved before processing.
            Remove these files or upload new versions.
          </Typography>
        </Alert>
      )}

      {validFiles.length > 0 && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>{validFiles.length}</strong> file(s) are ready for OCR processing.
          </Typography>
        </Alert>
      )}

      {/* File Grid */}
      <Grid container spacing={3}>
        {formData.files.map((file) => (
          <Grid item xs={12} sm={6} md={4} key={file.id}>
            <Card 
              sx={{ 
                height: '100%',
                border: file.valid ? '1px solid' : '2px solid',
                borderColor: file.valid ? 'success.light' : 'error.main',
                bgcolor: file.valid ? 'success.50' : 'error.50'
              }}
            >
              {/* Thumbnail */}
              <Box sx={{ position: 'relative', height: 200 }}>
                {file.fileType === 'pdf' ? (
                  <Box
                    sx={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.100'
                    }}
                  >
                    <PictureAsPdf sx={{ fontSize: 64, color: 'error.main' }} />
                  </Box>
                ) : (
                  <CardMedia
                    component="img"
                    height="200"
                    image={file.url}
                    alt={file.name}
                    sx={{ objectFit: 'cover' }}
                  />
                )}
                
                {/* Status Badge */}
                <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                  <Chip
                    icon={getStatusIcon(file)}
                    label={file.valid ? 'Valid' : 'Issues'}
                    size="small"
                    color={getStatusColor(file)}
                    variant="filled"
                  />
                </Box>

                {/* Preview Button */}
                {file.fileType !== 'pdf' && (
                  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <IconButton
                      size="small"
                      onClick={() => openPreview(file)}
                      sx={{ bgcolor: 'rgba(0, 0, 0, 0.5)', color: 'white' }}
                    >
                      <ZoomIn />
                    </IconButton>
                  </Box>
                )}
              </Box>

              {/* File Info */}
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" noWrap gutterBottom>
                  {file.name}
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                  <Chip label={file.fileType.toUpperCase()} size="small" variant="outlined" />
                  <Chip label={formatFileSize(file.fileSize)} size="small" variant="outlined" />
                  {file.width > 0 && (
                    <Chip label={`${file.width}×${file.height}`} size="small" variant="outlined" />
                  )}
                </Box>

                {/* Error Message */}
                {!file.valid && file.error && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    <Typography variant="caption">
                      {file.error}
                    </Typography>
                  </Alert>
                )}

                {/* File Details */}
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Uploaded: {file.uploadedAt.toLocaleTimeString()}
                  </Typography>
                </Box>
              </CardContent>

              {/* Actions */}
              <CardActions sx={{ justifyContent: 'space-between' }}>
                {file.fileType !== 'pdf' && (
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => openPreview(file)}
                  >
                    Preview
                  </Button>
                )}
                <Button
                  size="small"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => removeFile(file.id)}
                >
                  Remove
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Processing Summary */}
      <Box sx={{ mt: 4 }}>
        <Card sx={{ bgcolor: 'primary.50' }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              Processing Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Ready for Processing:</strong> {validFiles.length} files
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Estimated Time:</strong> {
                    (() => {
                      const timePerFile = formData.quality === 'fast' ? 30 : 
                                        formData.quality === 'balanced' ? 60 : 120;
                      const totalMinutes = Math.ceil((validFiles.length * timePerFile) / 60);
                      return `~${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
                    })()
                  }
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Record Type:</strong> {formData.recordType}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Language:</strong> {formData.language}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* Preview Modal */}
      <Dialog 
        open={previewOpen} 
        onClose={closePreview} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {previewFile?.name}
        </DialogTitle>
        <DialogContent>
          {previewFile && previewFile.fileType !== 'pdf' && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={previewFile.url}
                alt={previewFile.name}
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '70vh', 
                  objectFit: 'contain' 
                }}
              />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Chip label={`${previewFile.width} × ${previewFile.height}`} size="small" />
                <Chip label={formatFileSize(previewFile.fileSize)} size="small" />
                <Chip label={previewFile.fileType.toUpperCase()} size="small" />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePreview}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
