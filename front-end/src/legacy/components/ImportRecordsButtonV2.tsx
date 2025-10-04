// Enhanced Import Records Button with CSV, JSON, XML, SQL support
// Uses the new import API endpoints created in Phase 5

import React, { useState, useRef } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Grid
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  NavigateNext,
  NavigateBefore
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

interface ImportRecordsButtonV2Props {
  churchId?: number;
  recordType?: 'baptisms' | 'marriages' | 'funerals';
  onImportComplete?: () => void;
}

const ALLOWED_FORMATS = [
  { ext: '.csv', mime: 'text/csv', label: 'CSV' },
  { ext: '.json', mime: 'application/json', label: 'JSON' },
  { ext: '.xml', mime: 'application/xml,text/xml', label: 'XML' },
  { ext: '.sql', mime: 'application/sql,text/sql', label: 'SQL' }
];

const ImportRecordsButtonV2: React.FC<ImportRecordsButtonV2Props> = ({
  churchId,
  recordType: defaultRecordType = 'baptisms',
  onImportComplete
}) => {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordType, setRecordType] = useState(defaultRecordType);
  const [jobId, setJobId] = useState<number | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [suggestedMappings, setSuggestedMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar } = useSnackbar();

  const steps = ['Upload File', 'Map Fields', 'Preview', 'Import'];

  // Get auth token from localStorage or session
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isAllowed = ALLOWED_FORMATS.some(f => f.ext === fileExt);
    
    if (!isAllowed) {
      setError(`Invalid file type. Allowed: ${ALLOWED_FORMATS.map(f => f.ext).join(', ')}`);
      return;
    }

    // Check file size (50MB limit)
    if (file.size > 52428800) {
      setError('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  // Step 1: Upload file
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', recordType);

      const response = await fetch('/api/../features/records/records/import/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      
      if (data.success) {
        setJobId(data.jobId);
        enqueueSnackbar('File uploaded successfully', { variant: 'success' });
        
        // Move to next step and get preview
        setActiveStep(1);
        await handlePreview(data.jobId);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      enqueueSnackbar('Upload failed', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Get preview and field mappings
  const handlePreview = async (currentJobId?: number) => {
    const jobIdToUse = currentJobId || jobId;
    if (!jobIdToUse) {
      setError('No job ID available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/../features/records/records/import/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ 
          jobId: jobIdToUse,
          limit: 10 
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      
      if (data.success) {
        setPreview(data.preview || []);
        setDetectedFields(data.detectedFields || []);
        setSuggestedMappings(data.suggestedMappings || {});
        setFieldMapping(data.suggestedMappings || {});
      } else {
        throw new Error(data.error || 'Preview failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get preview');
      enqueueSnackbar('Preview failed', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Commit import
  const handleCommit = async () => {
    if (!jobId) {
      setError('No job ID available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/../features/records/records/import/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ 
          jobId,
          mapping: fieldMapping 
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      
      if (data.success) {
        enqueueSnackbar('Import started successfully', { variant: 'success' });
        setActiveStep(3);
        
        // Start polling for status
        pollImportStatus();
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start import');
      enqueueSnackbar('Import failed', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for import status
  const pollImportStatus = async () => {
    if (!jobId) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/../features/records/records/import/status/${jobId}`, {
          headers: getAuthHeaders()
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        
        if (data.success && data.job) {
          setImportStatus(data.job);
          
          if (data.job.status === 'done') {
            enqueueSnackbar(
              `Import completed! ${data.job.inserted_rows} records imported, ${data.job.updated_rows} updated, ${data.job.skipped_rows} skipped`,
              { variant: 'success' }
            );
            if (onImportComplete) {
              onImportComplete();
            }
          } else if (data.job.status === 'error') {
            setError(data.job.error_text || 'Import failed');
            enqueueSnackbar('Import failed', { variant: 'error' });
          } else if (data.job.status === 'running') {
            // Continue polling
            setTimeout(checkStatus, 2000);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to check status');
      }
    };

    checkStatus();
  };

  // Get canonical field names for record type
  const getCanonicalFields = () => {
    switch (recordType) {
      case 'baptisms':
        return ['first_name', 'last_name', 'baptism_date', 'birth_date', 'priest_name', 'sponsor_name', 'parents_names', 'notes'];
      case 'marriages':
        return ['groom_first_name', 'groom_last_name', 'bride_first_name', 'bride_last_name', 'marriage_date', 'priest_name', 'witnesses', 'notes'];
      case 'funerals':
        return ['first_name', 'last_name', 'funeral_date', 'death_date', 'birth_date', 'age_at_death', 'priest_name', 'burial_place', 'notes'];
      default:
        return [];
    }
  };

  // Handle field mapping change
  const handleMappingChange = (sourceField: string, targetField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [sourceField]: targetField
    }));
  };

  // Reset dialog
  const handleClose = () => {
    setOpen(false);
    setActiveStep(0);
    setSelectedFile(null);
    setJobId(null);
    setPreview([]);
    setDetectedFields([]);
    setFieldMapping({});
    setSuggestedMappings({});
    setError(null);
    setImportStatus(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="success"
        startIcon={<UploadIcon />}
        onClick={() => setOpen(true)}
        sx={{ 
          backgroundColor: '#4caf50',
          '&:hover': { backgroundColor: '#45a049' }
        }}
      >
        Import Records
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Import {recordType.charAt(0).toUpperCase() + recordType.slice(1)}</Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step 1: Upload File */}
          {activeStep === 0 && (
            <Box>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Record Type</InputLabel>
                <Select
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value as any)}
                  label="Record Type"
                >
                  <MenuItem value="baptisms">Baptism Records</MenuItem>
                  <MenuItem value="marriages">Marriage Records</MenuItem>
                  <MenuItem value="funerals">Funeral Records</MenuItem>
                </Select>
              </FormControl>

              <Paper
                sx={{
                  p: 3,
                  textAlign: 'center',
                  border: '2px dashed #ccc',
                  cursor: 'pointer',
                  '&:hover': { borderColor: '#999' }
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept={ALLOWED_FORMATS.map(f => f.ext).join(',')}
                  onChange={handleFileSelect}
                />
                <UploadIcon sx={{ fontSize: 48, color: '#999', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Click to upload or drag and drop
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Supported formats: CSV, JSON, XML, SQL (max 50MB)
                </Typography>
                {selectedFile && (
                  <Chip
                    label={selectedFile.name}
                    onDelete={() => setSelectedFile(null)}
                    sx={{ mt: 2 }}
                  />
                )}
              </Paper>
            </Box>
          )}

          {/* Step 2: Map Fields */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Map your file columns to the database fields:
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Your File Column</TableCell>
                      <TableCell>Maps To</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detectedFields.map((field) => (
                      <TableRow key={field}>
                        <TableCell>{field}</TableCell>
                        <TableCell>
                          <Select
                            value={fieldMapping[field] || ''}
                            onChange={(e) => handleMappingChange(field, e.target.value)}
                            size="small"
                            fullWidth
                          >
                            <MenuItem value="">-- Skip --</MenuItem>
                            {getCanonicalFields().map((canonicalField) => (
                              <MenuItem key={canonicalField} value={canonicalField}>
                                {canonicalField.replace(/_/g, ' ')}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Step 3: Preview */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Preview of records to import (showing first {preview.length}):
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {Object.keys(fieldMapping).filter(k => fieldMapping[k]).map((field) => (
                        <TableCell key={field}>
                          {fieldMapping[field].replace(/_/g, ' ')}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.map((record, idx) => (
                      <TableRow key={idx}>
                        {Object.keys(fieldMapping).filter(k => fieldMapping[k]).map((field) => (
                          <TableCell key={field}>
                            {record[field] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Step 4: Import Progress */}
          {activeStep === 3 && (
            <Box>
              {importStatus ? (
                <Box>
                  <Alert 
                    severity={
                      importStatus.status === 'done' ? 'success' : 
                      importStatus.status === 'error' ? 'error' : 
                      'info'
                    }
                    sx={{ mb: 2 }}
                  >
                    Status: {importStatus.status}
                  </Alert>
                  
                  {importStatus.status === 'running' && (
                    <LinearProgress 
                      variant="determinate" 
                      value={(importStatus.processed_rows / importStatus.total_rows) * 100}
                      sx={{ mb: 2 }}
                    />
                  )}
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2">Total Records: {importStatus.total_rows || 0}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">Processed: {importStatus.processed_rows || 0}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="success.main">
                        Inserted: {importStatus.inserted_rows || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="info.main">
                        Updated: {importStatus.updated_rows || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="warning.main">
                        Skipped: {importStatus.skipped_rows || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="error.main">
                        Errors: {importStatus.error_rows || 0}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {importStatus.error_text && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {importStatus.error_text}
                    </Alert>
                  )}
                </Box>
              ) : (
                <Box textAlign="center">
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Processing import...
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          {activeStep > 0 && activeStep < 3 && (
            <Button 
              onClick={() => setActiveStep(prev => prev - 1)}
              startIcon={<NavigateBefore />}
            >
              Back
            </Button>
          )}
          
          {activeStep === 0 && (
            <Button
              onClick={handleUpload}
              variant="contained"
              disabled={!selectedFile || isLoading}
              endIcon={<NavigateNext />}
            >
              {isLoading ? 'Uploading...' : 'Next'}
            </Button>
          )}
          
          {activeStep === 1 && (
            <Button
              onClick={() => setActiveStep(2)}
              variant="contained"
              disabled={Object.keys(fieldMapping).filter(k => fieldMapping[k]).length === 0}
              endIcon={<NavigateNext />}
            >
              Preview
            </Button>
          )}
          
          {activeStep === 2 && (
            <Button
              onClick={handleCommit}
              variant="contained"
              color="success"
              disabled={isLoading}
              startIcon={<CheckIcon />}
            >
              {isLoading ? 'Importing...' : 'Start Import'}
            </Button>
          )}
          
          {activeStep === 3 && importStatus?.status === 'done' && (
            <Button onClick={handleClose} variant="contained">
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ImportRecordsButtonV2;
