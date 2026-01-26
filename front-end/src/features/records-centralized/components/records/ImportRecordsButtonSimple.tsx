// Simple Import Records Button that works with session-based auth
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import axios from 'axios';

interface ImportRecordsButtonSimpleProps {
  churchId?: number;
  recordType?: 'baptisms' | 'marriages' | 'funerals';
  onImportComplete?: () => void;
}

const ImportRecordsButtonSimple: React.FC<ImportRecordsButtonSimpleProps> = ({
  churchId,
  recordType: defaultRecordType = 'baptisms',
  onImportComplete
}) => {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordType, setRecordType] = useState(defaultRecordType);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowedExts = ['.csv', '.json'];
    
    if (!allowedExts.includes(fileExt)) {
      setError(`Invalid file type. Please upload a CSV or JSON file.`);
      return;
    }

    // Check file size (10MB limit for simplicity)
    if (file.size > 10485760) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setSuccess(null);
  };

  // Simple import handler for JSON/CSV
  const handleImport = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setImportProgress({ status: 'reading', message: 'Reading file...' });

    try {
      const fileContent = await readFileContent(selectedFile);
      let records = [];

      if (selectedFile.name.endsWith('.json')) {
        // Parse JSON
        try {
          const data = JSON.parse(fileContent);
          records = Array.isArray(data) ? data : [data];
        } catch (e) {
          throw new Error('Invalid JSON format');
        }
      } else if (selectedFile.name.endsWith('.csv')) {
        // Parse CSV
        records = parseCSV(fileContent);
      }

      if (records.length === 0) {
        throw new Error('No records found in file');
      }

      setImportProgress({ 
        status: 'importing', 
        message: `Importing ${records.length} records...`,
        total: records.length,
        current: 0
      });

      // Map record type to table
      const recordTypeMap = {
        'baptisms': 'baptism',
        'marriages': 'marriage', 
        'funerals': 'funeral'
      };

      // Send to the existing import endpoint
      const response = await axios.post('/api/records/import', {
        churchId: churchId || 1,
        recordType: recordTypeMap[recordType],
        records: records
      }, {
        withCredentials: true, // Important for session cookies
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setImportProgress(prev => ({
            ...prev,
            percent: percentCompleted
          }));
        }
      });

      if (response.data.success) {
        setSuccess(`Successfully imported ${response.data.inserted || records.length} records!`);
        setImportProgress({ 
          status: 'done', 
          message: 'Import completed!',
          inserted: response.data.inserted
        });
        
        // Clear file selection
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Notify parent component
        if (onImportComplete) {
          setTimeout(onImportComplete, 1500);
        }
      } else {
        throw new Error(response.data.error || 'Import failed');
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to import records');
      setImportProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Read file content as text
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Simple CSV parser
  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const record: any = {};
      
      headers.forEach((header, index) => {
        // Map common CSV headers to expected field names
        const fieldMap: Record<string, string> = {
          'first name': 'first_name',
          'last name': 'last_name',
          'baptism date': 'baptism_date',
          'birth date': 'birth_date',
          'marriage date': 'marriage_date',
          'funeral date': 'funeral_date',
          'priest': 'priest_name',
          'sponsor': 'sponsor_name',
          'parents': 'parents_names',
          'groom first name': 'groom_first_name',
          'groom last name': 'groom_last_name',
          'bride first name': 'bride_first_name',
          'bride last name': 'bride_last_name',
          'witnesses': 'witnesses',
          'death date': 'death_date',
          'age at death': 'age_at_death',
          'burial place': 'burial_place'
        };

        const normalizedHeader = header.toLowerCase().replace(/_/g, ' ');
        const mappedField = fieldMap[normalizedHeader] || header;
        
        // For baptisms, construct person_name if needed
        if (recordType === 'baptisms' && !record.person_name) {
          if (mappedField === 'first_name' || mappedField === 'last_name') {
            const firstName = mappedField === 'first_name' ? values[index] : record.first_name || '';
            const lastName = mappedField === 'last_name' ? values[index] : record.last_name || '';
            if (firstName || lastName) {
              record.person_name = `${firstName} ${lastName}`.trim();
            }
          }
        }

        record[mappedField] = values[index] || '';
      });

      // Ensure required fields for the legacy format
      if (recordType === 'baptisms') {
        record.person_name = record.person_name || `${record.first_name || ''} ${record.last_name || ''}`.trim();
        record.date_performed = record.baptism_date || record.date_performed;
      } else if (recordType === 'marriages') {
        record.person_name = `${record.groom_first_name || ''} ${record.groom_last_name || ''} & ${record.bride_first_name || ''} ${record.bride_last_name || ''}`.trim();
        record.date_performed = record.marriage_date || record.date_performed;
      } else if (recordType === 'funerals') {
        record.person_name = `${record.first_name || ''} ${record.last_name || ''}`.trim();
        record.date_performed = record.funeral_date || record.date_performed;
      }

      records.push(record);
    }

    return records;
  };

  // Reset dialog
  const handleClose = () => {
    if (!isLoading) {
      setOpen(false);
      setSelectedFile(null);
      setError(null);
      setSuccess(null);
      setImportProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Import {recordType.charAt(0).toUpperCase() + recordType.slice(1)}
            </Typography>
            <IconButton onClick={handleClose} size="small" disabled={isLoading}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Record Type</InputLabel>
            <Select
              value={recordType}
              onChange={(e) => setRecordType(e.target.value as any)}
              label="Record Type"
              disabled={isLoading}
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
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              '&:hover': { borderColor: isLoading ? '#ccc' : '#999' }
            }}
            onClick={() => !isLoading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".csv,.json"
              onChange={handleFileSelect}
              disabled={isLoading}
            />
            <UploadIcon sx={{ fontSize: 48, color: '#999', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Click to upload or drag and drop
            </Typography>
            <Typography variant="body2" color="textSecondary">
              CSV or JSON files (max 10MB)
            </Typography>
            {selectedFile && (
              <Chip
                label={selectedFile.name}
                onDelete={() => !isLoading && setSelectedFile(null)}
                sx={{ mt: 2 }}
                color="primary"
              />
            )}
          </Paper>

          {importProgress && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" gutterBottom>
                {importProgress.message}
              </Typography>
              {importProgress.percent !== undefined && (
                <LinearProgress 
                  variant="determinate" 
                  value={importProgress.percent}
                  sx={{ mb: 1 }}
                />
              )}
              {importProgress.status === 'importing' && (
                <Typography variant="caption" color="textSecondary">
                  Processing {importProgress.current || 0} of {importProgress.total} records...
                </Typography>
              )}
              {importProgress.status === 'done' && (
                <Alert severity="success" icon={<CheckIcon />}>
                  Import completed! {importProgress.inserted} records added.
                </Alert>
              )}
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="textSecondary">
              <strong>CSV Format:</strong> First row should be column headers. 
              Use columns like: first_name, last_name, baptism_date, priest_name, etc.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            variant="contained"
            color="success"
            disabled={!selectedFile || isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : <CheckIcon />}
          >
            {isLoading ? 'Importing...' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ImportRecordsButtonSimple;
