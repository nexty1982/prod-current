import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Chip,
  LinearProgress
} from '@mui/material';
import { 
  Close as CloseIcon, 
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
// import { useSnackbar } from 'notistack';

export interface ImportRecordsModalProps {
  open: boolean;
  onClose: () => void;
  table: 'baptism' | 'marriage' | 'funeral';
  churchId: number;
  onImported: (count: number) => void;
}

export default function ImportRecordsModal({
  open,
  onClose,
  table,
  churchId,
  onImported
}: ImportRecordsModalProps) {
  // const { enqueueSnackbar } = useSnackbar();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTableTitle = () => {
    switch (table) {
      case 'baptism': return 'Baptism';
      case 'marriage': return 'Marriage';
      case 'funeral': return 'Funeral';
      default: return 'Record';
    }
  };

  const getTableEndpoint = () => {
    switch (table) {
      case 'baptism': return '/api/baptism-records/import';
      case 'marriage': return '/api/marriage-records/import';
      case 'funeral': return '/api/funeral-records/import';
      default: return '';
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowedExts = ['.csv', '.json', '.xlsx'];
    
    if (!allowedExts.includes(fileExt)) {
      setError(`Invalid file type. Please upload a CSV, JSON, or XLSX file.`);
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10485760) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setSuccess(null);
  };

  // Handle import
  const handleImport = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setImportProgress({ status: 'uploading', message: 'Uploading file...' });

    try {
      const endpoint = getTableEndpoint();
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('church_id', churchId.toString());

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import records');
      }

      const result = await response.json();
      const importedCount = result.imported || result.count || 0;
      
      setSuccess(`Successfully imported ${importedCount} ${getTableTitle().toLowerCase()} records`);
      // enqueueSnackbar(`Imported ${importedCount} records successfully`, { variant: 'success' });
      
      // Close modal after a short delay
      setTimeout(() => {
        onImported(importedCount);
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to import records');
      // enqueueSnackbar(err.message || 'Failed to import records', { variant: 'error' });
    } finally {
      setIsLoading(false);
      setImportProgress(null);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
    setImportProgress(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Import {getTableTitle()} Records</Typography>
          <Button onClick={handleClose} size="small">
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload a CSV, JSON, or XLSX file to import {getTableTitle().toLowerCase()} records.
            The file should contain the appropriate columns for {getTableTitle().toLowerCase()} records.
          </Typography>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.xlsx"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              fullWidth
            >
              Select File
            </Button>

            {selectedFile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon color="success" />
                <Typography variant="body2">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </Typography>
                <Chip 
                  label={selectedFile.name.split('.').pop()?.toUpperCase()} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              </Box>
            )}

            {importProgress && (
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {importProgress.message}
                </Typography>
                <LinearProgress />
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={!selectedFile || isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : <UploadIcon />}
        >
          {isLoading ? 'Importing...' : 'Import Records'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
