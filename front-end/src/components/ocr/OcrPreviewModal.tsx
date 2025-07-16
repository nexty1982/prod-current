/**
 * OCR Preview Modal Component
 * Full-screen modal for reviewing OCR results with image overlay and field editing
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  Chip,
  IconButton,
  Card,
  CardContent,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  Close, 
  Download, 
  Save, 
  Edit,
  Image as ImageIcon,
  Description as FileText,
  CheckCircle as CheckCircle2,
  Warning as AlertCircle,
  ZoomIn,
  ZoomOut,
  Visibility as Eye,
  VisibilityOff as EyeOff
} from '@mui/icons-material';

interface ExtractedField {
  field: string;
  value: string;
  confidence: number;
}

interface OcrJobMetadata {
  id: string;
  filename: string;
  original_filename?: string;
  status: string;
  confidence_score?: number;
  record_type?: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
  hasResult?: boolean;
  extracted_fields?: ExtractedField[];
  extracted_text?: string;
}

interface OcrPreviewModalProps {
  job: OcrJobMetadata | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (jobId: string, fields: ExtractedField[]) => Promise<void>;
  churchId: string;
}

export const OcrPreviewModal: React.FC<OcrPreviewModalProps> = ({
  job,
  isOpen,
  onClose,
  onSave,
  churchId
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');
  const [editableFields, setEditableFields] = useState<ExtractedField[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [showOverlay, setShowOverlay] = useState(true);
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);

  // Load OCR data when job changes
  useEffect(() => {
    if (job && isOpen) {
      loadOcrData();
    }
  }, [job, isOpen, churchId]);

  const loadOcrData = async () => {
    if (!job) return;
    
    setLoading(true);
    try {
      // Load the original image
      setImageUrl(`/api/church/${churchId}/ocr/jobs/${job.id}/image`);
      
      // Fetch OCR details including extracted text and fields
      const response = await fetch(`/api/church/${churchId}/ocr/jobs/${job.id}/details`);
      if (response.ok) {
        const data = await response.json();
        console.log('OCR job details:', data);
        
        setExtractedText(data.extracted_text || data.ocr_result || 'No text extracted');
        
        // Initialize editable fields from the response
        if (data.extracted_entities) {
          try {
            const entities = typeof data.extracted_entities === 'string' 
              ? JSON.parse(data.extracted_entities) 
              : data.extracted_entities;
            
            setEditableFields(entities || []);
          } catch (e) {
            console.error('Failed to parse extracted entities:', e);
            setEditableFields([]);
          }
        } else {
          setEditableFields([]);
        }
      } else {
        console.error('Failed to fetch OCR details');
        setExtractedText('Failed to load OCR text');
        setEditableFields([]);
      }
    } catch (error) {
      console.error('Error loading OCR data:', error);
      setExtractedText('Error loading OCR text');
      setEditableFields([]);
    } finally {
      setLoading(false);
      setIsEditing(false);
      setImageScale(1);
      setActiveFieldIndex(null);
    }
  };

  const handleFieldChange = (index: number, field: string, value: string | number) => {
    setEditableFields(prev => prev.map((f, i) => 
      i === index ? { ...f, [field]: value } : f
    ));
  };

  const handleSave = async () => {
    if (!job || !onSave) return;

    setSaving(true);
    try {
      await onSave(job.id, editableFields);
      setIsEditing(false);
      // Show success message
      console.log('OCR results saved successfully');
    } catch (error) {
      console.error('Failed to save OCR results:', error);
    } finally {
      setSaving(false);
    }
  };

  const downloadResults = async () => {
    if (!job) return;

    try {
      const response = await fetch(`/api/church/${churchId}/ocr/jobs/${job.id}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ocr-results-${job.id}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to download results');
      }
    } catch (error) {
      console.error('Error downloading results:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'error';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <CheckCircle2 sx={{ fontSize: 16 }} />;
    return <AlertCircle sx={{ fontSize: 16 }} />;
  };

  if (!job) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { 
          height: '90vh', 
          maxHeight: '90vh',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" component="div">
              OCR Preview: {job.filename}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Chip 
                label={job.status} 
                size="small"
                color={
                  job.status === 'completed' ? 'success' :
                  job.status === 'processing' ? 'info' :
                  job.status === 'failed' ? 'error' : 'warning'
                }
              />
              {job.confidence_score && (
                <Chip 
                  label={`${Math.round(job.confidence_score)}% confidence`}
                  size="small"
                  color={getConfidenceColor(job.confidence_score)}
                />
              )}
              {job.record_type && (
                <Chip 
                  label={job.record_type}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={() => setImageScale(prev => Math.max(0.5, prev - 0.2))}>
              <ZoomOut />
            </IconButton>
            <IconButton onClick={() => setImageScale(prev => Math.min(3, prev + 0.2))}>
              <ZoomIn />
            </IconButton>
            <IconButton onClick={() => setShowOverlay(!showOverlay)}>
              {showOverlay ? <EyeOff /> : <Eye />}
            </IconButton>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ 
        p: 0, 
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#555',
        },
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading OCR data...</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', height: '100%' }}>
            {/* Image Preview */}
            <Box sx={{ flex: 1, borderRight: 1, borderColor: 'divider' }}>
              <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ImageIcon />
                  Original Image
                </Typography>
                
                {imageUrl ? (
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <img
                      src={imageUrl}
                      alt={job.filename}
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        transform: `scale(${imageScale})`,
                        transformOrigin: 'top center',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                      onError={(e) => {
                        console.error('Image failed to load');
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </Box>
                ) : (
                  <Alert severity="warning">
                    Image not available
                  </Alert>
                )}
              </Box>
            </Box>

            {/* OCR Results */}
            <Box sx={{ flex: 1 }}>
              <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FileText />
                  Extracted Text & Fields
                </Typography>

                {/* Raw Extracted Text */}
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Raw OCR Text:
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.85rem',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '200px',
                        overflow: 'auto',
                        bgcolor: 'grey.50',
                        p: 1,
                        borderRadius: 1
                      }}
                    >
                      {extractedText}
                    </Typography>
                  </CardContent>
                </Card>

                {/* Extracted Fields */}
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle2">
                        Extracted Fields ({editableFields.length})
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => setIsEditing(!isEditing)}
                        variant={isEditing ? "contained" : "outlined"}
                      >
                        {isEditing ? 'View Mode' : 'Edit Mode'}
                      </Button>
                    </Box>

                    {editableFields.length === 0 ? (
                      <Alert severity="info">
                        No structured fields extracted. Try adjusting OCR settings or manual review.
                      </Alert>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {editableFields.map((field, index) => (
                          <Paper key={index} sx={{ p: 2, bgcolor: activeFieldIndex === index ? 'primary.50' : 'inherit' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Typography variant="subtitle2" fontWeight="medium">
                                {field.field || `Field ${index + 1}`}
                              </Typography>
                              <Chip
                                size="small"
                                label={`${Math.round(field.confidence || 0)}%`}
                                color={getConfidenceColor(field.confidence || 0)}
                                icon={getConfidenceIcon(field.confidence || 0)}
                              />
                            </Box>
                            
                            {isEditing ? (
                              <TextField
                                fullWidth
                                size="small"
                                value={field.value || ''}
                                onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                                onFocus={() => setActiveFieldIndex(index)}
                                onBlur={() => setActiveFieldIndex(null)}
                              />
                            ) : (
                              <Typography 
                                variant="body2"
                                sx={{ 
                                  p: 1, 
                                  bgcolor: 'grey.50', 
                                  borderRadius: 1,
                                  fontFamily: 'monospace'
                                }}
                              >
                                {field.value || '(empty)'}
                              </Typography>
                            )}
                          </Paper>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={downloadResults} startIcon={<Download />}>
          Download
        </Button>
        
        {isEditing && (
          <Button
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <Save />}
            variant="contained"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
        
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
