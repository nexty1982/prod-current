// front-end/src/shared/ui/legacy/ImportRecordsButton.tsx
// Full-stack JSON import solution for baptism, marriage, and funeral records

import React, { useState, useRef } from 'react';
import axios from 'axios';
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
  Divider,
  Card,
  CardContent,
  Stack
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { adminAPI } from '../admin.api.ts';

// ─── TYPES ─────────────────────────────────────────────────────
interface Church {
  id: number;
  name: string;
  church_id: string;
  is_active: boolean | number; // Handle both boolean and integer from database
}

interface ImportRecord {
  person_name: string;
  date_performed?: string;
  priest_name?: string;
  notes?: string;
  [key: string]: any; // Allow additional fields based on record type
}

interface ImportData {
  churchId: number;
  recordType: 'baptism' | 'marriage' | 'funeral';
  records: ImportRecord[];
}

interface ApiResponse {
  success: boolean;
  inserted?: number;
  message?: string;
  error?: string;
  validationErrors?: Array<{
    recordIndex: number;
    errors: string[];
  }>;
}

const RECORD_TYPES = [
  { value: 'baptism', label: 'Baptism Records', icon: '💧' },
  { value: 'marriage', label: 'Marriage Records', icon: '💒' },
  { value: 'funeral', label: 'Funeral Records', icon: '🕊️' }
] as const;

// ─── IMPORT RECORDS BUTTON COMPONENT ─────────────────────────────────────────────────────
const ImportRecordsButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRecordType, setSelectedRecordType] = useState<'baptism' | 'marriage' | 'funeral'>('baptism');
  const [selectedChurch, setSelectedChurch] = useState<number | null>(null);
  const [churches, setChurches] = useState<Church[]>([]);
  const [uploadedData, setUploadedData] = useState<ImportRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingChurches, setLoadingChurches] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar } = useSnackbar();

  // Load churches when modal opens
  const fetchChurches = async () => {
    setLoadingChurches(true);
    try {
      const response = await adminAPI.churches.getAll();
      console.log('Churches API response:', response);
      
      // Handle different response formats
      let churchesData = [];
      if (response.churches) {
        churchesData = response.churches;
      } else if (Array.isArray(response)) {
        churchesData = response;
      } else {
        console.error('Unexpected churches API response format:', response);
        setErrors(['Unexpected response format from churches API']);
        return;
      }
      
      // Filter active churches - handle both boolean true and integer 1
      const activeChurches = churchesData.filter((church: Church) => 
        Boolean(church.is_active)
      );
      setChurches(activeChurches);
      
      console.log(`Found ${activeChurches.length} active churches out of ${churchesData.length} total`);
      
      if (activeChurches.length === 0) {
        setErrors(['No active churches found. Please contact an administrator.']);
      }
    } catch (error) {
      console.error('❌ Error fetching churches:', error);
      setErrors(['Failed to load churches. Please try again.']);
    } finally {
      setLoadingChurches(false);
    }
  };

  const handleOpenModal = () => {
    setIsOpen(true);
    setErrors([]);
    setSuccessMessage('');
    setValidationErrors([]);
    fetchChurches();
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setUploadedData(null);
    setSelectedChurch(null);
    setErrors([]);
    setSuccessMessage('');
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file upload and validation
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      setErrors(['Please select a valid JSON file (.json)']);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(['File size must be less than 5MB']);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        
        // Validate JSON structure
        if (!Array.isArray(jsonData)) {
          setErrors(['JSON file must contain an array of records']);
          return;
        }

        if (jsonData.length === 0) {
          setErrors(['JSON file cannot be empty']);
          return;
        }

        if (jsonData.length > 1000) {
          setErrors(['Maximum 1000 records allowed per import']);
          return;
        }

        // Validate each record has minimum required fields
        const validationErrors: string[] = [];
        jsonData.forEach((record, index) => {
          if (!record.person_name || typeof record.person_name !== 'string' || record.person_name.trim() === '') {
            validationErrors.push(`Record ${index + 1}: Missing required field 'person_name'`);
          }
        });

        if (validationErrors.length > 0) {
          setValidationErrors(validationErrors.slice(0, 10)); // Show first 10 errors
          setUploadedData(null);
          return;
        }

        setUploadedData(jsonData);
        setErrors([]);
        setValidationErrors([]);
        
      } catch (error) {
        setErrors(['Invalid JSON file format']);
        setUploadedData(null);
      }
    };

    reader.readAsText(file);
  };

  // Submit import request
  const handleImport = async () => {
    if (!uploadedData || !selectedChurch) {
      setErrors(['Please select a church and upload a valid JSON file']);
      return;
    }

    setIsLoading(true);
    setErrors([]);
    setSuccessMessage('');

    try {
      const importData: ImportData = {
        churchId: selectedChurch,
        recordType: selectedRecordType,
        records: uploadedData
      };

      console.log('📤 Importing records:', {
        churchId: selectedChurch,
        recordType: selectedRecordType,
        recordCount: uploadedData.length
      });

      const response = await axios.post<ApiResponse>('/api/../features/records/records/import', importData);

      if (response.data.success) {
        setSuccessMessage(
          `✅ Successfully imported ${response.data.inserted} ${selectedRecordType} records!`
        );
        enqueueSnackbar(
          `Successfully imported ${response.data.inserted} ${selectedRecordType} records!`, 
          { 
            variant: 'success',
            anchorOrigin: { vertical: 'top', horizontal: 'center' }
          }
        );
        setUploadedData(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setErrors([response.data.error || 'Import failed']);
        if (response.data.validationErrors) {
          const errorDetails = response.data.validationErrors.map(
            (ve) => `Record ${ve.recordIndex + 1}: ${ve.errors.join(', ')}`
          );
          setValidationErrors(errorDetails);
        }
      }
    } catch (error: any) {
      console.error('❌ Import error:', error);
      if (error.response?.data?.error) {
        setErrors([error.response.data.error]);
      } else {
        setErrors(['Network error. Please check your connection and try again.']);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Get sample JSON for current record type
  const downloadSampleJSON = async () => {
    try {
      const response = await axios.get(`/api/../features/records/records/sample/${selectedRecordType}`);
      if (response.data.success) {
        const dataStr = JSON.stringify(response.data.sampleFormat, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedRecordType}_sample.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('❌ Error downloading sample:', error);
      setErrors(['Failed to download sample file']);
    }
  };

  return (
    <>
      {/* Import Button */}
      <Button
        variant="outlined"
        startIcon={<UploadIcon />}
        onClick={handleOpenModal}
        sx={{ 
          borderColor: 'primary.main',
          '&:hover': {
            backgroundColor: 'primary.50'
          }
        }}
      >
        Import Records
      </Button>

      {/* Modal */}
      <Dialog
        open={isOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <UploadIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Import Records from JSON</Typography>
            </Box>
            <IconButton onClick={handleCloseModal} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Success Message */}
          {successMessage && (
            <Alert 
              severity="success" 
              icon={<CheckIcon />}
              sx={{ mb: 2 }}
            >
              {successMessage}
            </Alert>
          )}

          {/* Error Messages */}
          {errors.length > 0 && (
            <Alert 
              severity="error" 
              icon={<ErrorIcon />}
              sx={{ mb: 2 }}
            >
              <Typography variant="body2" component="div">
                {errors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </Typography>
            </Alert>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert 
              severity="warning"
              sx={{ mb: 2 }}
            >
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Validation Errors:
              </Typography>
              {validationErrors.map((error, index) => (
                <Typography key={index} variant="body2" component="div">
                  • {error}
                </Typography>
              ))}
              {validationErrors.length === 10 && (
                <Typography variant="body2" style={{ fontStyle: 'italic' }}>
                  ... and possibly more errors
                </Typography>
              )}
            </Alert>
          )}

          <Stack spacing={3}>
            {/* Record Type Selection */}
            <Box>
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                Record Type
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {RECORD_TYPES.map((type) => (
                  <Chip
                    key={type.value}
                    icon={<span>{type.icon}</span>}
                    label={type.label}
                    variant={selectedRecordType === type.value ? "filled" : "outlined"}
                    color={selectedRecordType === type.value ? "primary" : "default"}
                    onClick={() => setSelectedRecordType(type.value)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Church Selection */}
            <Box>
              <FormControl fullWidth>
                <InputLabel>Target Church</InputLabel>
                <Select
                  value={selectedChurch || ''}
                  onChange={(e) => setSelectedChurch(Number(e.target.value) || null)}
                  label="Target Church"
                  disabled={loadingChurches}
                >
                  {loadingChurches ? (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      Loading churches...
                    </MenuItem>
                  ) : churches.length === 0 ? (
                    <MenuItem disabled>No active churches found</MenuItem>
                  ) : (
                    churches.map((church) => (
                      <MenuItem key={church.id} value={church.id}>
                        {church.name} ({church.church_id})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Box>

            {/* File Upload */}
            <Box>
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                JSON File
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  border: '2px dashed',
                  borderColor: uploadedData ? 'success.main' : 'grey.300',
                  backgroundColor: uploadedData ? 'success.50' : 'grey.50',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="json-file-input"
                />
                <label htmlFor="json-file-input">
                  <Button
                    component="span"
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    fullWidth
                  >
                    Choose JSON File
                  </Button>
                </label>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  Select a JSON file containing {selectedRecordType} records (max 1000 records, 5MB)
                </Typography>
              </Paper>

              {/* Download Sample Button */}
              <Box sx={{ mt: 1, textAlign: 'center' }}>
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={downloadSampleJSON}
                  sx={{ textTransform: 'none' }}
                >
                  Download Sample JSON for {selectedRecordType}
                </Button>
              </Box>
            </Box>

            {/* Upload Preview */}
            {uploadedData && (
              <Box>
                <Card sx={{ backgroundColor: 'success.50' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <CheckIcon color="success" sx={{ mr: 1 }} />
                      <Typography variant="h6" color="success.main">
                        File Validated Successfully
                      </Typography>
                    </Box>
                    <Typography variant="body1" gutterBottom>
                      {uploadedData.length} {selectedRecordType} records ready for import
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Sample record preview:
                    </Typography>
                    <Paper sx={{ p: 2, backgroundColor: 'background.paper' }}>
                      <Typography 
                        variant="body2" 
                        component="pre"
                        sx={{ 
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                      >
                        {JSON.stringify(uploadedData[0], null, 2)}
                      </Typography>
                    </Paper>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Stack>

          {/* Progress Bar */}
          {isLoading && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                Importing {uploadedData?.length || 0} {selectedRecordType} records...
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseModal} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!uploadedData || !selectedChurch || isLoading}
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={16} /> : <UploadIcon />}
          >
            {isLoading ? 'Importing...' : `Import ${uploadedData?.length || 0} Records`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ImportRecordsButton;
