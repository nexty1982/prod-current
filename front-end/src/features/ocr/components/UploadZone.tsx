import React, { useState, useCallback } from 'react';
import { FileUp, Loader2, AlertCircle } from 'lucide-react';
import { Box, Typography, Paper, Alert, useTheme } from '@mui/material';
import { uploadFiles } from '../lib/ocrApi';

interface UploadZoneProps {
  onUploaded?: (jobIds: string[]) => void;
  churchId?: number;
  className?: string;
  onUploadRequest?: (files: File[]) => void;
  isSuperAdmin?: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({ 
  onUploaded, 
  churchId, 
  className = '',
  onUploadRequest,
  isSuperAdmin = false
}) => {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;

    // If superadmin and no churchId, call onUploadRequest to show dialog
    if (isSuperAdmin && !churchId && onUploadRequest) {
      onUploadRequest(files);
      return;
    }

    // If no churchId (and not superadmin), show error
    if (!churchId) {
      setError('churchId is required');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const jobs = await uploadFiles(files, churchId);
      onUploaded?.(jobs.map(job => job.id));
    } catch (err: any) {
      setError(err.message || 'Failed to upload files');
    } finally {
      setBusy(false);
    }
  }, [churchId, onUploaded, isSuperAdmin, onUploadRequest]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, [handleFiles]);

  return (
    <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }} className={className}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight="medium" color="text.primary">
          Upload Documents
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Supported formats: PDF, PNG, JPG, JPEG, TIFF
        </Typography>
      </Box>
      
      <Box sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} icon={<AlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        {isSuperAdmin && !churchId && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please select a church from the dropdown above before uploading documents.
          </Alert>
        )}

        <Box
          component="label"
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 2,
            borderStyle: 'dashed',
            borderRadius: 2,
            height: 160,
            cursor: busy ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            opacity: busy ? 0.6 : 1,
            borderColor: dragActive ? 'primary.main' : 'divider',
            bgcolor: dragActive ? 'primary.light' : 'transparent',
            '&:hover': {
              borderColor: busy ? 'divider' : 'primary.main',
              bgcolor: busy ? 'transparent' : 'action.hover'
            }
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.tiff"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files) {
                handleFiles(Array.from(e.target.files));
              }
            }}
            disabled={busy}
          />
          
          <Box sx={{ textAlign: 'center' }}>
            {busy ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, color: 'primary.main' }}>
                  <Loader2 size={24} className="animate-spin" />
                </Box>
                <Typography variant="body2" fontWeight="medium" color="primary.main">
                  Uploading...
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Processing your documents
                </Typography>
              </>
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, color: 'text.secondary' }}>
                  <FileUp size={24} />
                </Box>
                <Typography variant="body2" fontWeight="medium" color="text.primary">
                  Drop files here or click to upload
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  PDF, PNG, JPG, TIFF • Max 10MB per file
                </Typography>
              </>
            )}
          </Box>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ '& p': { mb: 0.5 } }}>
            <Typography component="p" variant="caption">• Documents will be processed automatically using OCR</Typography>
            <Typography component="p" variant="caption">• Supported languages: English, Greek, Russian, Romanian</Typography>
            <Typography component="p" variant="caption">• Processing time varies based on document size and complexity</Typography>
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default UploadZone;

