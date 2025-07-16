// Public OCR Upload Component - No Authentication Required
import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Grid,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Alert,
  Chip,
  Divider,
  CircularProgress,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Container,
  Stack,
  Link
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import { saveAs } from 'file-saver';

// Icons
import {
  IconUpload,
  IconFileTypePdf,
  IconFileTypeJpg,
  IconFileTypePng,
  IconTrash,
  IconDownload,
  IconScan,
  IconEye,
  IconCheck,
  IconX,
  IconRefresh,
  IconChevronDown,
  IconLanguage,
  IconFileText,
  IconCamera,
  IconSparkles,
  IconClock,
  IconShieldCheck,
  IconSquare,
  IconTarget
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

// Components
import OcrScanPreview from '../../../components/OcrScanPreview';

// Types
interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: OCRResult;
  error?: string;
}

interface OCRResult {
  id: string;
  filename: string;
  language: string;
  detectedLanguage?: string;
  confidence: number;
  originalText: string;
  translatedText?: string;
  translationConfidence?: number;
  processedAt: string;
}

// Animations
const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const sparkleAnimation = keyframes`
  0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
  50% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
`;

const revealAnimation = keyframes`
  0% { opacity: 0; transform: translateY(20px) scale(0.9); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;

// Styled Components
const DropzoneBox = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.primary.main}`,
  borderRadius: theme.spacing(2),
  padding: theme.spacing(6),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  background: `linear-gradient(45deg, ${theme.palette.primary.light}08, ${theme.palette.secondary.light}08)`,
  '&:hover': {
    borderColor: theme.palette.secondary.main,
    backgroundColor: `${theme.palette.primary.light}15`,
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[8],
  },
  '&.dragActive': {
    borderColor: theme.palette.success.main,
    backgroundColor: `${theme.palette.success.light}15`,
  }
}));

const FeatureCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[12],
  }
}));

// Magic reveal button
const MagicRevealButton = styled(Button)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  '&.celebrating': {
    animation: `${sparkleAnimation} 1s ease-in-out infinite`,
  },
  '&.gradient-animation': {
    backgroundSize: '400% 400%',
    animation: `${gradientAnimation} 2s ease infinite`,
  }
}));

// Results preview container
const ResultsPreview = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(2),
  border: `2px solid ${theme.palette.success.main}`,
  borderRadius: theme.spacing(1),
  backgroundColor: `${theme.palette.success.light}10`,
  animation: `${revealAnimation} 0.6s ease-out`,
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    borderRadius: theme.spacing(1),
    zIndex: -1,
    animation: `${gradientAnimation} 3s ease infinite`,
    backgroundSize: '400% 400%',
  }
}));

const PublicOCRUpload: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [enableTranslation, setEnableTranslation] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [processing, setProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resultsRevealed, setResultsRevealed] = useState<{[key: string]: boolean}>({});
  const [celebrationMode, setCelebrationMode] = useState<{[key: string]: boolean}>({});

  // Inject keyframes into the document
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes gradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Supported languages
  const languages = [
    { code: 'auto', name: 'Auto-detect' },
    { code: 'en', name: 'English' },
    { code: 'el', name: 'Greek (Ελληνικά)' },
    { code: 'ro', name: 'Romanian (Română)' },
    { code: 'ka', name: 'Georgian (ქართული)' },
    { code: 'ru', name: 'Russian (Русский)' },
    { code: 'sr', name: 'Serbian (Српски)' },
    { code: 'bg', name: 'Bulgarian (Български)' },
    { code: 'mk', name: 'Macedonian (Македонски)' }
  ];

  // Translation target languages
  const translationLanguages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish (Español)' },
    { code: 'fr', name: 'French (Français)' },
    { code: 'de', name: 'German (Deutsch)' },
    { code: 'it', name: 'Italian (Italiano)' },
    { code: 'pt', name: 'Portuguese (Português)' },
    { code: 'el', name: 'Greek (Ελληνικά)' },
    { code: 'ro', name: 'Romanian (Română)' },
    { code: 'ru', name: 'Russian (Русский)' }
  ];

  // File drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
      progress: 0
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.tiff'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDropRejected: (rejectedFiles) => {
      setError(`Some files were rejected. Please ensure files are images or PDFs under 10MB.`);
    }
  });

  // Remove file
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    // Clean up reveal states
    setResultsRevealed(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    setCelebrationMode(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  // Reveal results with celebration
  const revealResults = (fileId: string) => {
    // Start celebration mode
    setCelebrationMode(prev => ({ ...prev, [fileId]: true }));
    
    // Reveal results after a short delay for dramatic effect
    setTimeout(() => {
      setResultsRevealed(prev => ({ ...prev, [fileId]: true }));
    }, 500);
    
    // End celebration mode
    setTimeout(() => {
      setCelebrationMode(prev => ({ ...prev, [fileId]: false }));
    }, 2000);
  };

  // Process OCR
  const processOCR = async () => {
    if (files.length === 0) return;

    setProcessing(true);
    setError(null);

    try {
      for (const fileData of files) {
        if (fileData.status !== 'pending') continue;

        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'uploading', progress: 25 }
            : f
        ));

        // Create FormData
        const formData = new FormData();
        formData.append('image', fileData.file);
        formData.append('language', selectedLanguage);
        formData.append('enableTranslation', enableTranslation.toString());
        formData.append('targetLanguage', targetLanguage);

        // Call public OCR API
        const response = await fetch('/api/public/ocr/process', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`OCR processing failed: ${response.statusText}`);
        }

        // Update to processing
        setFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'processing', progress: 50 }
            : f
        ));

        const result = await response.json();

        // Update to completed
        setFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { 
                ...f, 
                status: 'completed', 
                progress: 100,
                result: {
                  id: result.id || fileData.id,
                  filename: fileData.file.name,
                  language: result.detectedLanguage || selectedLanguage,
                  detectedLanguage: result.detectedLanguage,
                  confidence: result.confidence * 100,
                  originalText: result.text,
                  translatedText: result.translatedText,
                  translationConfidence: result.translationConfidence * 100,
                  processedAt: new Date().toISOString()
                }
              }
            : f
        ));
      }

      setSuccess('OCR processing completed successfully!');
    } catch (err: any) {
      setError(err.message || 'OCR processing failed');
      // Mark failed files
      setFiles(prev => prev.map(f => 
        f.status === 'uploading' || f.status === 'processing'
          ? { ...f, status: 'failed', error: err.message }
          : f
      ));
    } finally {
      setProcessing(false);
    }
  };

  // View result with preview
  const viewResult = (fileData: UploadedFile) => {
    if (!fileData.result) return;

    const ocrFields = [
      {
        id: 'original',
        label: `Original Text${fileData.result.detectedLanguage ? ` (${fileData.result.detectedLanguage.toUpperCase()})` : ''}`,
        value: fileData.result.originalText,
        confidence: fileData.result.confidence,
        editable: false
      }
    ];

    if (fileData.result.translatedText) {
      ocrFields.push({
        id: 'translation',
        label: 'English Translation',
        value: fileData.result.translatedText,
        confidence: fileData.result.translationConfidence || 85,
        editable: false
      });
    }

    setPreviewData({
      imageSrc: fileData.preview,
      ocrFields,
      confidenceScore: fileData.result.confidence,
      title: `OCR Results - ${fileData.result.filename}`
    });
    setShowPreview(true);
  };

  // Download result
  const downloadResult = (fileData: UploadedFile) => {
    if (!fileData.result) return;

    const content = `OCR Results - ${fileData.result.filename}
Processed: ${new Date(fileData.result.processedAt).toLocaleString()}
Language: ${fileData.result.language}
Confidence: ${fileData.result.confidence.toFixed(1)}%

Original Text:
${fileData.result.originalText}

${fileData.result.translatedText ? `English Translation:
${fileData.result.translatedText}` : ''}

---
Processed by OrthodoxMetrics OCR Service
https://orthodoxmetrics.com/apps/ocr-upload
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `ocr-result-${fileData.result.filename}.txt`);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Hero Section */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h2" component="h1" gutterBottom sx={{ 
          background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          fontWeight: 'bold'
        }}>
          <IconScan size={48} style={{ verticalAlign: 'middle', marginRight: '16px', color: '#1976d2' }} />
          Orthodox OCR Service
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Extract text from church documents, manuscripts, and images
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          Professional OCR service supporting Greek, Romanian, Georgian, and other Orthodox languages. 
          Get results in minutes with automatic translation to English.
        </Typography>
      </Box>

      {/* Features */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 6 }}>
        <FeatureCard>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <IconLanguage size={48} color="#4caf50" />
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Multi-Language Support
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supports Greek, Romanian, Georgian, Serbian, Bulgarian, and more Orthodox languages
            </Typography>
          </CardContent>
        </FeatureCard>
        
        <FeatureCard>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <IconClock size={48} color="#ff9800" />
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Fast Processing
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Get OCR results in minutes with Google Vision AI and automatic English translation
            </Typography>
          </CardContent>
        </FeatureCard>
        
        <FeatureCard>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <IconShieldCheck size={48} color="#2196f3" />
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Secure & Private
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your documents are processed securely and not stored permanently on our servers
            </Typography>
          </CardContent>
        </FeatureCard>
        
        <FeatureCard 
          sx={{ cursor: 'pointer' }}
          onClick={() => window.location.href = '/apps/ocr-field-mapping'}
        >
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <IconSquare size={48} color="#9c27b0" />
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Advanced Field Mapping
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Draw precise boxes to define fields for structured OCR extraction
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<IconTarget />}
              sx={{ mt: 2 }}
            >
              Try Field Mapping
            </Button>
          </CardContent>
        </FeatureCard>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 4 }}>
        {/* Upload Section */}
        <Box sx={{ flex: { xs: 1, lg: 2 } }}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Upload Documents
              </Typography>
              
              {/* Language Selection */}
              <Box sx={{ mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    label="Language"
                  >
                    {languages.map(lang => (
                      <MenuItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Translation Controls */}
              <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableTranslation}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnableTranslation(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconLanguage size={20} />
                      <Typography variant="body2">
                        Enable Translation
                      </Typography>
                    </Box>
                  }
                />
                
                {enableTranslation && (
                  <Box sx={{ mt: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Translate to</InputLabel>
                      <Select
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        label="Translate to"
                      >
                        {translationLanguages.map(lang => (
                          <MenuItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      💰 Translation cost: ~$0.10 per 1,000 words
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Dropzone */}
              <DropzoneBox 
                {...getRootProps()} 
                className={isDragActive ? 'dragActive' : ''}
              >
                <input {...getInputProps()} />
                <IconUpload size={64} style={{ marginBottom: '16px', opacity: 0.7 }} />
                <Typography variant="h6" gutterBottom>
                  {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to select'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supports JPEG, PNG, PDF (max 10MB, up to 5 files)
                </Typography>
              </DropzoneBox>

              {/* File List */}
              {files.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Files ({files.length})
                  </Typography>
                  {files.map((fileData) => (
                    <Paper key={fileData.id} sx={{ p: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box>
                          {fileData.file.type.startsWith('image/') ? (
                            <IconFileTypeJpg size={32} />
                          ) : (
                            <IconFileTypePdf size={32} />
                          )}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body1" noWrap>
                            {fileData.file.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                        </Box>
                        <Box>
                          <Chip 
                            label={fileData.status} 
                            color={
                              fileData.status === 'completed' ? 'success' :
                              fileData.status === 'failed' ? 'error' :
                              fileData.status === 'processing' ? 'info' : 'default'
                            }
                            size="small"
                          />
                        </Box>
                        <Box>
                          <Stack direction="row" spacing={1}>
                            {fileData.status === 'completed' && !resultsRevealed[fileData.id] && (
                              <Button
                                variant="contained"
                                color="primary"
                                startIcon={celebrationMode[fileData.id] ? <IconSparkles /> : <IconEye />}
                                onClick={() => revealResults(fileData.id)}
                                sx={{
                                  background: celebrationMode[fileData.id] 
                                    ? 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FECA57)'
                                    : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                                  backgroundSize: celebrationMode[fileData.id] ? '400% 400%' : '100% 100%',
                                  animation: celebrationMode[fileData.id] ? 'gradient 2s ease infinite' : 'none',
                                  '&:hover': {
                                    transform: 'scale(1.05)',
                                    boxShadow: '0 4px 20px rgba(33, 150, 243, 0.4)'
                                  }
                                }}
                              >
                                {celebrationMode[fileData.id] ? '✨ Revealing Magic ✨' : '🔍 Reveal Results'}
                              </Button>
                            )}
                            {fileData.status === 'completed' && resultsRevealed[fileData.id] && (
                              <>
                                <Tooltip title="View Results">
                                  <IconButton onClick={() => viewResult(fileData)}>
                                    <IconEye />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Download Results">
                                  <IconButton onClick={() => downloadResult(fileData)}>
                                    <IconDownload />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            <Tooltip title="Remove">
                              <IconButton onClick={() => removeFile(fileData.id)} color="error">
                                <IconTrash />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>
                      </Box>
                      
                      {fileData.status !== 'pending' && fileData.status !== 'completed' && (
                        <Box sx={{ mt: 2 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={fileData.progress}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      )}
                      
                      {fileData.error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          {fileData.error}
                        </Alert>
                      )}

                      {/* Results Preview - Only show when revealed */}
                      {fileData.status === 'completed' && resultsRevealed[fileData.id] && fileData.result && (
                        <ResultsPreview>
                          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconSparkles color="success" />
                            🎉 OCR Results Revealed!
                          </Typography>
                          
                          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                            <Box sx={{ flex: 1 }}>
                              <Paper sx={{ p: 2, height: '100%' }}>
                                <Typography variant="subtitle2" color="primary" gutterBottom>
                                  📄 Extracted Text
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontFamily: 'monospace', 
                                    whiteSpace: 'pre-wrap',
                                    maxHeight: '150px',
                                    overflow: 'auto',
                                    backgroundColor: '#f5f5f5',
                                    p: 1,
                                    borderRadius: 1
                                  }}
                                >
                                  {fileData.result.originalText || 'No text detected'}
                                </Typography>
                                
                                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                  <Chip 
                                    label={`${fileData.result.confidence.toFixed(1)}% confidence`}
                                    color="success"
                                    size="small"
                                  />
                                  {fileData.result.detectedLanguage && (
                                    <Chip 
                                      label={`Language: ${fileData.result.detectedLanguage.toUpperCase()}`}
                                      color="info"
                                      size="small"
                                    />
                                  )}
                                  <Chip 
                                    label={`${fileData.result.originalText?.length || 0} characters`}
                                    variant="outlined"
                                    size="small"
                                  />
                                </Box>
                              </Paper>
                            </Box>
                            
                            {fileData.result.translatedText && (
                              <Box sx={{ flex: 1 }}>
                                <Paper sx={{ p: 2, height: '100%' }}>
                                  <Typography variant="subtitle2" color="secondary" gutterBottom>
                                    🌍 Translation
                                  </Typography>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontFamily: 'monospace', 
                                      whiteSpace: 'pre-wrap',
                                      maxHeight: '150px',
                                      overflow: 'auto',
                                      backgroundColor: '#f5f5f5',
                                      p: 1,
                                      borderRadius: 1
                                    }}
                                  >
                                    {fileData.result.translatedText}
                                  </Typography>
                                  
                                  {fileData.result.translationConfidence && (
                                    <Box sx={{ mt: 1 }}>
                                      <Chip 
                                        label={`${fileData.result.translationConfidence.toFixed(1)}% translation confidence`}
                                        color="secondary"
                                        size="small"
                                      />
                                    </Box>
                                  )}
                                </Paper>
                              </Box>
                            )}
                          </Box>
                          
                          <Box sx={{ mt: 2, textAlign: 'center' }}>
                            <Stack direction="row" spacing={2} justifyContent="center">
                              <Button
                                variant="outlined"
                                startIcon={<IconEye />}
                                onClick={() => viewResult(fileData)}
                                size="small"
                              >
                                Full View
                              </Button>
                              <Button
                                variant="outlined"
                                startIcon={<IconDownload />}
                                onClick={() => downloadResult(fileData)}
                                size="small"
                              >
                                Download
                              </Button>
                            </Stack>
                          </Box>
                        </ResultsPreview>
                      )}
                    </Paper>
                  ))}
                </Box>
              )}

              {/* Process Button */}
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={processOCR}
                  disabled={files.length === 0 || processing || files.every(f => f.status !== 'pending')}
                  startIcon={processing ? <CircularProgress size={20} /> : <IconScan />}
                  sx={{ px: 4, py: 1.5 }}
                >
                  {processing ? 'Processing...' : `Process OCR (${files.filter(f => f.status === 'pending').length} files)`}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Info Section */}
        <Box sx={{ flex: 1 }}>
          <Stack spacing={3}>
            {/* Usage Info */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <IconFileText style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                  How It Works
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" color="primary">1. Upload Documents</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Drag and drop your church documents, manuscripts, or images
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="primary">2. Select Language</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Choose the document language or use auto-detection
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="primary">3. Process & Review</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Get OCR results with confidence scores and English translation
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="primary">4. Download Results</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Download extracted text as plain text files
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Supported Formats */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <IconCamera style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                  Supported Formats
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Chip label="JPEG" size="small" variant="outlined" />
                  <Chip label="PNG" size="small" variant="outlined" />
                  <Chip label="PDF" size="small" variant="outlined" />
                  <Chip label="TIFF" size="small" variant="outlined" />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Maximum file size: 10MB per file<br />
                  Maximum files: 5 files per batch
                </Typography>
              </CardContent>
            </Card>

            {/* About */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <IconSparkles style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                  About This Service
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  This OCR service is powered by Google Vision AI and designed specifically for Orthodox church documents and manuscripts.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  For more advanced features and church management tools, visit{' '}
                  <Link href="https://orthodoxmetrics.com" target="_blank" rel="noopener">
                    OrthodoxMetrics.com
                  </Link>
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mt: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mt: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { minHeight: '80vh' } }}
      >
        <DialogTitle>
          OCR Results Preview
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {previewData && (
            <OcrScanPreview
              imageSrc={previewData.imageSrc}
              ocrData={previewData.ocrFields}
              confidenceScore={previewData.confidenceScore}
              title={previewData.title}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PublicOCRUpload;
