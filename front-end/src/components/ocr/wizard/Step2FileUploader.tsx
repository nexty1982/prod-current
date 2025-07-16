/**
 * Step 2: File Upload with Drag & Drop
 * 
 * Features:
 * - Drag and drop file uploader
 * - File validation (type, size, resolution)
 * - Progress tracking
 * - Duplicate detection
 * - Batch upload support
 */

import React, { useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Alert,
  Chip,
  Grid
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Description as FileText,
  PictureAsPdf,
  Image,
  Warning,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';

import { WizardFormData, UploadFileMetadata } from '../WizardUpload';

interface Step2FileUploaderProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_BATCH_SIZE = 50;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'image/gif'];

export const Step2FileUploader: React.FC<Step2FileUploaderProps> = ({
  formData,
  updateFormData
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Generate unique file ID
  const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Validate file type
  const getFileType = (file: File): UploadFileMetadata['fileType'] | null => {
    const type = file.type.toLowerCase();
    if (type === 'application/pdf') return 'pdf';
    if (type === 'image/jpeg') return 'jpg';
    if (type === 'image/png') return 'png';
    if (type === 'image/tiff') return 'tiff';
    if (type === 'image/gif') return 'gif';
    return null;
  };

  // Get file icon
  const getFileIcon = (fileType: UploadFileMetadata['fileType']) => {
    switch (fileType) {
      case 'pdf': return <PictureAsPdf color="error" />;
      case 'jpg':
      case 'png':
      case 'tiff':
      case 'gif': return <Image color="primary" />;
      default: return <FileText />;
    }
  };

  // Validate image dimensions
  const validateImageDimensions = (file: File): Promise<{ width: number; height: number; valid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          const isValid = img.width >= 200 && img.height >= 200;
          resolve({
            width: img.width,
            height: img.height,
            valid: isValid,
            error: isValid ? undefined : 'Image resolution too low (minimum 200x200 pixels)'
          });
          URL.revokeObjectURL(img.src);
        };
        img.onerror = () => {
          resolve({
            width: 0,
            height: 0,
            valid: false,
            error: 'Failed to load image'
          });
        };
        img.src = URL.createObjectURL(file);
      } else {
        // For PDFs, we can't easily get dimensions, so we assume they're valid
        resolve({
          width: 0,
          height: 0,
          valid: true
        });
      }
    });
  };

  // Check for duplicates
  const isDuplicate = (file: File): boolean => {
    return formData.files.some(existingFile => 
      existingFile.name === file.name && 
      existingFile.fileSize === file.size
    );
  };

  // Process uploaded files
  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (formData.files.length + fileArray.length > MAX_BATCH_SIZE) {
      alert(`Maximum batch size is ${MAX_BATCH_SIZE} files. Current: ${formData.files.length}, Adding: ${fileArray.length}`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const processedFiles: UploadFileMetadata[] = [];
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgress((i / fileArray.length) * 100);

      // Validate file type
      const fileType = getFileType(file);
      if (!fileType) {
        processedFiles.push({
          id: generateFileId(),
          name: file.name,
          url: '',
          fileType: 'jpg', // fallback
          fileSize: file.size,
          width: 0,
          height: 0,
          uploadedAt: new Date(),
          valid: false,
          error: 'Unsupported file type. Please use PDF, JPG, PNG, TIFF, or GIF.',
          file
        });
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        processedFiles.push({
          id: generateFileId(),
          name: file.name,
          url: '',
          fileType,
          fileSize: file.size,
          width: 0,
          height: 0,
          uploadedAt: new Date(),
          valid: false,
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
          file
        });
        continue;
      }

      // Check for duplicates
      if (isDuplicate(file)) {
        processedFiles.push({
          id: generateFileId(),
          name: file.name,
          url: '',
          fileType,
          fileSize: file.size,
          width: 0,
          height: 0,
          uploadedAt: new Date(),
          valid: false,
          error: 'Duplicate file detected.',
          file
        });
        continue;
      }

      // Validate dimensions for images
      const dimensionCheck = await validateImageDimensions(file);
      
      processedFiles.push({
        id: generateFileId(),
        name: file.name,
        url: URL.createObjectURL(file),
        fileType,
        fileSize: file.size,
        width: dimensionCheck.width,
        height: dimensionCheck.height,
        uploadedAt: new Date(),
        valid: dimensionCheck.valid,
        error: dimensionCheck.error,
        file
      });
    }

    setUploadProgress(100);
    updateFormData({ files: [...formData.files, ...processedFiles] });
    
    setTimeout(() => {
      setUploading(false);
      setUploadProgress(0);
    }, 500);
  };

  // Drag and drop handlers
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  }, [formData.files]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = formData.files.filter(file => file.id !== fileId);
    updateFormData({ files: updatedFiles });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validFiles = formData.files.filter(file => file.valid);
  const invalidFiles = formData.files.filter(file => !file.valid);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Upload Documents
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload Orthodox church record images or PDFs for OCR processing
        </Typography>
      </Box>

      {/* Upload Area */}
      <Paper
        sx={{
          p: 6,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'grey.300',
          bgcolor: dragActive ? 'primary.50' : 'grey.50',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'primary.50'
          }
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {dragActive ? 'Drop files here' : 'Drag & drop files here'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          or click to browse your computer
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Supports: PDF, JPG, PNG, TIFF, GIF • Max {MAX_FILE_SIZE / 1024 / 1024}MB per file • Max {MAX_BATCH_SIZE} files
        </Typography>
        
        <input
          id="file-input"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.gif"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </Paper>

      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" gutterBottom>
            Processing files... {uploadProgress.toFixed(0)}%
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {/* File List */}
      {formData.files.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Grid container spacing={3}>
            {/* Valid Files */}
            {validFiles.length > 0 && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle color="success" fontSize="small" />
                  Valid Files ({validFiles.length})
                </Typography>
                <List dense>
                  {validFiles.map((file) => (
                    <ListItem key={file.id} sx={{ bgcolor: 'success.50', mb: 1, borderRadius: 1 }}>
                      <ListItemIcon>
                        {getFileIcon(file.fileType)}
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Chip label={file.fileType.toUpperCase()} size="small" color="success" variant="outlined" />
                            <Chip label={formatFileSize(file.fileSize)} size="small" variant="outlined" />
                            {file.width > 0 && (
                              <Chip label={`${file.width}×${file.height}`} size="small" variant="outlined" />
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton onClick={() => removeFile(file.id)} size="small">
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Grid>
            )}

            {/* Invalid Files */}
            {invalidFiles.length > 0 && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ErrorIcon color="error" fontSize="small" />
                  Issues Found ({invalidFiles.length})
                </Typography>
                <List dense>
                  {invalidFiles.map((file) => (
                    <ListItem key={file.id} sx={{ bgcolor: 'error.50', mb: 1, borderRadius: 1 }}>
                      <ListItemIcon>
                        <Warning color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        secondary={
                          <Box>
                            <Typography variant="caption" color="error">
                              {file.error}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Chip label={formatFileSize(file.fileSize)} size="small" variant="outlined" />
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton onClick={() => removeFile(file.id)} size="small">
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Grid>
            )}
          </Grid>

          {/* Summary */}
          <Alert severity={validFiles.length > 0 ? 'success' : 'warning'} sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Upload Summary:</strong> {validFiles.length} valid files ready for processing
              {invalidFiles.length > 0 && `, ${invalidFiles.length} files need attention`}
            </Typography>
          </Alert>
        </Box>
      )}
    </Box>
  );
};
