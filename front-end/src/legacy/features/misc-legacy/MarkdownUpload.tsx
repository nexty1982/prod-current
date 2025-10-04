import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';

interface MarkdownUploadProps {
  taskId: number;
  markdownContent?: string;
  markdownFilename?: string;
  onUploadSuccess: () => void;
}

const MarkdownUpload: React.FC<MarkdownUploadProps> = ({
  taskId,
  markdownContent,
  markdownFilename,
  onUploadSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.md') || selectedFile.type === 'text/markdown') {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please select a markdown (.md) file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('markdown', file);
      
      const response = await fetch(`/api/kanban/tasks/${taskId}/markdown`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (response.ok) {
        setFile(null);
        onUploadSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to upload markdown file');
      }
    } catch (error) {
      console.error('Error uploading markdown:', error);
      setError('Failed to upload markdown file');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      const response = await fetch(`/api/kanban/tasks/${taskId}/markdown`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        onUploadSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to remove markdown file');
      }
    } catch (error) {
      console.error('Error removing markdown:', error);
      setError('Failed to remove markdown file');
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <DescriptionIcon />
        Documentation
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {markdownContent ? (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              {markdownFilename || 'Documentation'}
            </Typography>
            <IconButton onClick={handleRemove} color="error" size="small">
              <DeleteIcon />
            </IconButton>
          </Box>
          <Box 
            sx={{ 
              maxHeight: 200, 
              overflow: 'auto', 
              bgcolor: '#f5f5f5', 
              p: 1, 
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap'
            }}
          >
            {markdownContent}
          </Box>
        </Paper>
      ) : (
        <Box>
          <input
            accept=".md,text/markdown"
            style={{ display: 'none' }}
            id="markdown-upload"
            type="file"
            onChange={handleFileSelect}
          />
          <label htmlFor="markdown-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadIcon />}
              sx={{ mb: 2 }}
            >
              Select Markdown File
            </Button>
          </label>
          
          {file && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
              <Typography variant="body2">
                Selected: {file.name}
              </Typography>
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={uploading}
                size="small"
              >
                {uploading ? <CircularProgress size={20} /> : 'Upload'}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default MarkdownUpload;
