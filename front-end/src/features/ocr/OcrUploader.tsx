import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  LinearProgress,
  Paper,
  Stack
} from '@mui/material';
import {
  IconUpload,
  IconX,
  IconEye,
  IconTrash,
  IconRefresh,
  IconCheck,
  IconAlertCircle
} from '@tabler/icons-react';
import { useOcrJobs, OcrJob } from '@/shared/lib/useOcrJobs';
import { useAuth } from '@/context/AuthContext';
import OcrScanPreview from './OcrScanPreview';

interface OcrField {
  id: string;
  label: string;
  value: string;
  confidence: number;
  editable?: boolean;
}

const OcrUploader: React.FC = () => {
  const { user } = useAuth();
  const churchId = user?.church_id?.toString() || '1';
  
  const {
    jobs,
    stats,
    loading,
    error,
    refreshJobs,
    uploadFile,
    deleteJob,
    getJobDetails
  } = useOcrJobs(churchId);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recordType, setRecordType] = useState<'baptism' | 'marriage' | 'funeral'>('baptism');
  const [language, setLanguage] = useState('en');
  const [previewJob, setPreviewJob] = useState<OcrJob | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFields, setPreviewFields] = useState<OcrField[]>([]);

  // Refresh jobs on mount
  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, TIFF) or PDF');
        return;
      }
      // Validate file size (20MB max)
      if (file.size > 20 * 1024 * 1024) {
        alert('File size must be less than 20MB');
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  // Handle file upload
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      await uploadFile(selectedFile, recordType, language);
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('ocr-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }, [selectedFile, recordType, language, uploadFile]);

  // Handle view result
  const handleViewResult = useCallback(async (job: OcrJob) => {
    try {
      const jobDetails = await getJobDetails(job.id);
      if (jobDetails) {
        setPreviewJob(jobDetails);
        
        // Transform OCR result into preview fields
        const fields: OcrField[] = [];
        
        if (jobDetails.ocr_result) {
          fields.push({
            id: 'original_text',
            label: `Original Text (${jobDetails.detected_language || jobDetails.language || 'en'})`,
            value: jobDetails.ocr_result,
            confidence: (jobDetails.confidence_score || 0) * 100,
            editable: true
          });
        }
        
        if (jobDetails.ocr_result_translation) {
          fields.push({
            id: 'translation',
            label: 'English Translation',
            value: jobDetails.ocr_result_translation,
            confidence: (jobDetails.translation_confidence || 0) * 100,
            editable: true
          });
        }
        
        setPreviewFields(fields);
        setShowPreview(true);
      }
    } catch (err) {
      console.error('Failed to load job details:', err);
    }
  }, [getJobDetails]);

  // Handle field edit in preview
  const handleFieldEdit = useCallback((fieldId: string, newValue: string) => {
    setPreviewFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, value: newValue } : field
    ));
  }, []);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'info';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <IconCheck size={16} />;
      case 'processing': return <CircularProgress size={16} />;
      case 'failed': return <IconAlertCircle size={16} />;
      default: return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        OCR Uploader
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload images or PDFs to extract text using OCR. Supports multiple languages including English, Greek, Russian, and Romanian.
      </Typography>

      {/* Upload Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upload Document
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Record Type</InputLabel>
                <Select
                  value={recordType}
                  label="Record Type"
                  onChange={(e) => setRecordType(e.target.value as any)}
                >
                  <MenuItem value="baptism">Baptism</MenuItem>
                  <MenuItem value="marriage">Marriage</MenuItem>
                  <MenuItem value="funeral">Funeral</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={language}
                  label="Language"
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="el">Greek</MenuItem>
                  <MenuItem value="ru">Russian</MenuItem>
                  <MenuItem value="ro">Romanian</MenuItem>
                  <MenuItem value="sr">Serbian</MenuItem>
                  <MenuItem value="bg">Bulgarian</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <input
                id="ocr-file-input"
                type="file"
                accept=".jpg,.jpeg,.png,.tiff,.pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                component="label"
                startIcon={<IconUpload />}
                fullWidth
                sx={{ height: '56px' }}
              >
                {selectedFile ? selectedFile.name : 'Select File'}
              </Button>
            </Grid>
          </Grid>

          {selectedFile && (
            <Box sx={{ mb: 2 }}>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="body2">
                    <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setSelectedFile(null)}
                  >
                    <IconX size={16} />
                  </IconButton>
                </Stack>
              </Paper>
            </Box>
          )}

          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={16} /> : <IconUpload />}
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            fullWidth
          >
            {uploading ? 'Uploading...' : 'Upload and Process'}
          </Button>
        </CardContent>
      </Card>

      {/* Stats Section */}
      {stats.total > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={2}>
                <Box textAlign="center">
                  <Typography variant="h4">{stats.total}</Typography>
                  <Typography variant="caption">Total</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={2}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">{stats.pending}</Typography>
                  <Typography variant="caption">Pending</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={2}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">{stats.processing}</Typography>
                  <Typography variant="caption">Processing</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={2}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">{stats.completed}</Typography>
                  <Typography variant="caption">Completed</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={2}>
                <Box textAlign="center">
                  <Typography variant="h4" color="error.main">{stats.failed}</Typography>
                  <Typography variant="caption">Failed</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={2}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">{stats.needs_review}</Typography>
                  <Typography variant="caption">Needs Review</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Jobs List */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              OCR Jobs
            </Typography>
            <Button
              size="small"
              startIcon={<IconRefresh />}
              onClick={refreshJobs}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>

          {loading && jobs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : jobs.length === 0 ? (
            <Alert severity="info">
              No OCR jobs found. Upload a document to get started.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {jobs.map((job) => (
                <Grid item xs={12} key={job.id}>
                  <Paper sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          {job.original_filename}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                          <Chip
                            label={job.status}
                            color={getStatusColor(job.status) as any}
                            size="small"
                            icon={getStatusIcon(job.status)}
                          />
                          <Chip
                            label={job.record_type}
                            size="small"
                            variant="outlined"
                          />
                          {job.confidence_score && (
                            <Chip
                              label={`${(job.confidence_score * 100).toFixed(0)}% confidence`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          Created: {new Date(job.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        {job.status === 'completed' && (
                          <Button
                            size="small"
                            startIcon={<IconEye />}
                            onClick={() => handleViewResult(job)}
                          >
                            View
                          </Button>
                        )}
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteJob(job.id)}
                        >
                          <IconTrash size={16} />
                        </IconButton>
                      </Stack>
                    </Stack>
                    {job.status === 'processing' && (
                      <LinearProgress sx={{ mt: 1 }} />
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">OCR Results</Typography>
            <IconButton onClick={() => setShowPreview(false)}>
              <IconX />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {previewJob && previewFields.length > 0 && (
            <OcrScanPreview
              imageSrc={`/api/church/${churchId}/ocr/jobs/${previewJob.id}/image`}
              ocrData={previewFields}
              confidenceScore={(previewJob.confidence_score || 0) * 100}
              onFieldEdit={handleFieldEdit}
              title="Document Analysis Results"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OcrUploader;

