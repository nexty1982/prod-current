import React, { useEffect, useState, useCallback } from 'react';
import { getJobResult } from '../lib/ocrApi';
import { Eye, FileText, Loader2, AlertCircle, Download, Copy } from 'lucide-react';
import { Box, Typography, Paper, Button, Tabs, Tab, useTheme, IconButton, Alert, CircularProgress } from '@mui/material';
import OcrScanPreview from '../../../../features/ocr/OcrScanPreview';
import type { OCRResult } from '../lib/ocrApi';

interface OutputViewerProps {
  jobId?: string;
  className?: string;
}

const OutputViewer: React.FC<OutputViewerProps> = ({ jobId, className = '' }) => {
  const theme = useTheme();
  const [result, setResult] = useState<OCRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'text' | 'json'>('preview');

  const loadResult = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getJobResult(id);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load OCR result');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (jobId) {
      loadResult(jobId);
    } else {
      setResult(null);
      setError(null);
    }
  }, [jobId, loadResult]);

  const handleFieldEdit = useCallback((fieldId: string, newValue: string) => {
    console.log(`Editing field ${fieldId} to: ${newValue}`);
    // TODO: Implement field update API call
  }, []);

  const handleCopyText = useCallback(() => {
    if (result?.extractedText) {
      navigator.clipboard.writeText(result.extractedText);
    }
  }, [result]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-result-${result.jobId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result]);

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={32} sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Loading OCR result...
            </Typography>
          </Box>
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, color: 'error.main' }}>
              <AlertCircle size={32} />
            </Box>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </Box>
        </Box>
      );
    }

    if (!jobId) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, color: 'text.disabled' }}>
              <FileText size={32} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Select a completed OCR job to view results
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
              Extracted text and field data will appear here
            </Typography>
          </Box>
        </Box>
      );
    }

    if (!result) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, color: 'text.disabled' }}>
              <AlertCircle size={32} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              No result available
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
              This job may still be processing or failed
            </Typography>
          </Box>
        </Box>
      );
    }

    switch (viewMode) {
      case 'preview':
        if (result.fields && result.fields.length > 0) {
          // Create a mock image URL for the preview (you might want to get this from the job data)
          const mockImageSrc = `data:image/svg+xml;base64,${btoa(`
            <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#f5f5f5"/>
              <text x="50%" y="50%" font-family="Arial" font-size="18" fill="#333" text-anchor="middle" dy=".3em">
                Document Preview
              </text>
            </svg>
          `)}`;

          const confidence = result.fields.reduce((sum, field) => sum + field.confidence, 0) / result.fields.length;

          return (
            <OcrScanPreview
              imageSrc={mockImageSrc}
              ocrData={result.fields}
              confidenceScore={confidence}
              onFieldEdit={handleFieldEdit}
              title={`OCR Result - Job ${result.jobId}`}
            />
          );
        }
        // Fall through to text view if no fields
        
      case 'text':
        return (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {result.metadata && (
              <Paper sx={{ p: 1.5, bgcolor: 'background.default' }}>
                <Typography variant="caption" fontWeight="medium" color="text.primary" sx={{ mb: 1, display: 'block' }}>
                  Processing Info
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Engine: <Typography component="span" variant="caption" fontWeight="medium">{result.metadata.engine}</Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Language: <Typography component="span" variant="caption" fontWeight="medium">{result.metadata.language}</Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pages: <Typography component="span" variant="caption" fontWeight="medium">{result.metadata.totalPages}</Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Time: <Typography component="span" variant="caption" fontWeight="medium">{result.metadata.processingTime}ms</Typography>
                  </Typography>
                </Box>
              </Paper>
            )}
            
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" fontWeight="medium" color="text.primary">
                  Extracted Text
                </Typography>
                <Button
                  size="small"
                  startIcon={<Copy size={12} />}
                  onClick={handleCopyText}
                  variant="outlined"
                  sx={{ minWidth: 'auto', px: 1 }}
                >
                  Copy
                </Button>
              </Box>
              <Box
                component="textarea"
                value={result.extractedText || 'No text extracted'}
                readOnly
                sx={{
                  width: '100%',
                  height: 256,
                  p: 1.5,
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.default',
                  resize: 'none',
                  color: 'text.primary',
                  '&:focus': { outline: 'none' }
                }}
              />
            </Box>
          </Box>
        );

      case 'json':
        return (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight="medium" color="text.primary">
                Raw JSON Data
              </Typography>
              <Button
                size="small"
                startIcon={<Download size={12} />}
                onClick={handleDownload}
                variant="outlined"
                sx={{ minWidth: 'auto', px: 1 }}
              >
                Download
              </Button>
            </Box>
            <Box
              component="pre"
              sx={{
                fontSize: '0.75rem',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                bgcolor: 'background.default',
                p: 1.5,
                borderRadius: 1,
                height: 256,
                border: 1,
                borderColor: 'divider',
                color: 'text.primary',
                m: 0
              }}
            >
              {JSON.stringify(result, null, 2)}
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Paper elevation={1} sx={{ borderRadius: 2, height: '100%', minHeight: 384, display: 'flex', flexDirection: 'column' }} className={className}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" fontWeight="medium" color="text.primary">
          OCR Result
        </Typography>
        {result && (
          <Tabs
            value={viewMode}
            onChange={(_, newValue) => setViewMode(newValue)}
            sx={{ minHeight: 'auto' }}
          >
            <Tab 
              icon={<Eye size={12} />} 
              iconPosition="start"
              label="Preview" 
              value="preview"
              sx={{ minHeight: 'auto', py: 0.5, fontSize: '0.75rem' }}
            />
            <Tab 
              icon={<FileText size={12} />} 
              iconPosition="start"
              label="Text" 
              value="text"
              sx={{ minHeight: 'auto', py: 0.5, fontSize: '0.75rem' }}
            />
            <Tab 
              label="JSON" 
              value="json"
              sx={{ minHeight: 'auto', py: 0.5, fontSize: '0.75rem' }}
            />
          </Tabs>
        )}
      </Box>
      
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {renderContent()}
      </Box>
    </Paper>
  );
};

export default OutputViewer;
