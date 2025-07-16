/**
 * Enhanced OCR Wizard Component
 * Multi-step wizard for comprehensive OCR processing with real-time feedback
 * 
 * Steps:
 * 1. Upload Source - File selection with drag/drop and metadata
 * 2. Preprocessing Options - Image enhancement settings  
 * 3. OCR Execution - Real-time processing with confidence overlay
 * 4. Review & Save - Corrections and approval workflow
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Card,
  CardContent,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  TextField,
  Chip,
  Alert,
  LinearProgress,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  CloudUpload,
  Image as ImageIcon,
  AutoFixHigh,
  PlayArrow,
  CheckCircle,
  Warning,
  Edit,
  Save,
  Refresh,
  ZoomIn,
  ZoomOut,
  RotateLeft,
  Crop,
  Tune,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

// Types
interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  dimensions?: { width: number; height: number };
  preview?: string;
}

interface PreprocessingOptions {
  autoRotate: boolean;
  grayscale: boolean;
  contrastEnhancement: boolean;
  denoising: boolean;
  cropMargins: boolean;
  language: string;
  mode: 'wizard' | 'manual';
}

interface OcrSegment {
  text: string;
  confidence: number;
  boundingBox: [number, number, number, number];
  level: 'word' | 'line' | 'paragraph';
}

interface OcrResult {
  text: string;
  confidence: number;
  segments: OcrSegment[];
  processingTime: number;
  language: string;
  errors?: string[];
}

interface ExtractedField {
  label: string;
  value: string;
  confidence: number;
  editable: boolean;
  required: boolean;
}

interface OcrWizardEnhancedProps {
  churchId: string;
  onComplete: (result: any) => void;
  onCancel: () => void;
  initialFiles?: File[];
}

// Language options
const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' }
];

const PROCESSING_MODES = [
  { value: 'wizard', label: 'Guided Wizard', description: 'Step-by-step with validation' },
  { value: 'manual', label: 'Manual Upload', description: 'Direct processing with defaults' }
];

export const OcrWizardEnhanced: React.FC<OcrWizardEnhancedProps> = ({
  churchId,
  onComplete,
  onCancel,
  initialFiles = []
}) => {
  // Wizard state
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<FileMetadata[]>([]);
  const [preprocessingOptions, setPreprocessingOptions] = useState<PreprocessingOptions>({
    autoRotate: true,
    grayscale: false,
    contrastEnhancement: true,
    denoising: true,
    cropMargins: true,
    language: 'en',
    mode: 'wizard'
  });
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  
  // UI state
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement>(null);

  // Step 1: File Upload Handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const fileMetadata: FileMetadata[] = [];
    
    for (const file of acceptedFiles) {
      try {
        // Create preview URL
        const preview = URL.createObjectURL(file);
        
        // Get image dimensions if it's an image
        let dimensions;
        if (file.type.startsWith('image/')) {
          dimensions = await getImageDimensions(file);
        }
        
        fileMetadata.push({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          dimensions,
          preview
        });
      } catch (error) {
        console.error('Error processing file:', file.name, error);
      }
    }
    
    setUploadedFiles(prev => [...prev, ...fileMetadata]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.bmp'],
      'application/pdf': ['.pdf']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  });

  // Utility function to get image dimensions
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // Step 2: Preprocessing
  const handlePreprocessingChange = (option: keyof PreprocessingOptions, value: boolean | string) => {
    setPreprocessingOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const previewPreprocessing = async () => {
    if (!uploadedFiles[selectedFileIndex]?.preview) return;
    
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Start with original image
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Step 1: Auto-detect and crop document boundaries
    if (preprocessingOptions.cropMargins) {
      await cropDocumentBoundaries(ctx, canvas);
    }

    // Step 2: Auto-rotate if needed
    if (preprocessingOptions.autoRotate) {
      await autoRotateImage(ctx, canvas);
    }

    // Step 3: Convert to grayscale for better OCR
    if (preprocessingOptions.grayscale) {
      applyGrayscale(ctx, canvas);
    }

    // Step 4: Enhance contrast for text clarity
    if (preprocessingOptions.contrastEnhancement) {
      ctx.filter = 'contrast(140%) brightness(110%)';
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
    }

    // Step 5: Apply denoising
    if (preprocessingOptions.denoising) {
      await applyDenoising(ctx, canvas);
    }
  };

  // Advanced preprocessing functions
  const cropDocumentBoundaries = async (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Find document boundaries by detecting content edges
    let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
    const threshold = 200; // Brightness threshold for background detection
    
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        // If pixel is not background (white/light)
        if (brightness < threshold) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    // Add padding around detected content
    const padding = 20;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(canvas.width, maxX + padding);
    maxY = Math.min(canvas.height, maxY + padding);
    
    // Create cropped canvas
    const croppedWidth = maxX - minX;
    const croppedHeight = maxY - minY;
    
    if (croppedWidth > 100 && croppedHeight > 100) {
      const croppedData = ctx.getImageData(minX, minY, croppedWidth, croppedHeight);
      canvas.width = croppedWidth;
      canvas.height = croppedHeight;
      ctx.putImageData(croppedData, 0, 0);
    }
  };

  const autoRotateImage = async (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Detect text lines and determine if rotation is needed
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const rotationAngle = detectTextOrientation(imageData);
    
    if (Math.abs(rotationAngle) > 0.5) { // If rotation needed
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationAngle * Math.PI / 180);
      ctx.translate(-centerX, -centerY);
      ctx.drawImage(canvas, 0, 0);
    }
  };

  const detectTextOrientation = (imageData: ImageData): number => {
    // Simplified text line detection - in production, use more sophisticated algorithms
    // For now, return 0 (no rotation needed)
    return 0;
  };

  const applyGrayscale = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = gray;     // Red
      data[i + 1] = gray; // Green
      data[i + 2] = gray; // Blue
      // Alpha channel (data[i + 3]) remains unchanged
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const applyDenoising = async (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Simple noise reduction using blur and sharpen
    ctx.filter = 'blur(0.5px)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'contrast(120%) brightness(105%)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
  };

  // Preprocess image for optimal OCR results
  const preprocessImageForOcr = async (fileMetadata: FileMetadata): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
        try {
          // Create a temporary canvas for preprocessing
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Set canvas size to image size
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          
          // Draw original image
          tempCtx.drawImage(img, 0, 0);

          // Apply all preprocessing steps in sequence
          if (preprocessingOptions.cropMargins) {
            await cropDocumentBoundaries(tempCtx, tempCanvas);
          }

          if (preprocessingOptions.autoRotate) {
            await autoRotateImage(tempCtx, tempCanvas);
          }

          if (preprocessingOptions.grayscale) {
            applyGrayscale(tempCtx, tempCanvas);
          }

          if (preprocessingOptions.contrastEnhancement) {
            tempCtx.filter = 'contrast(140%) brightness(110%)';
            tempCtx.drawImage(tempCanvas, 0, 0);
            tempCtx.filter = 'none';
          }

          if (preprocessingOptions.denoising) {
            await applyDenoising(tempCtx, tempCanvas);
          }

          // Convert canvas to blob
          tempCanvas.toBlob(
            (blob) => {
              if (blob) {
                console.log(`Preprocessed ${fileMetadata.name}: ${fileMetadata.size} -> ${blob.size} bytes`);
                resolve(blob);
              } else {
                reject(new Error('Failed to create blob from canvas'));
              }
            },
            'image/png',
            0.95 // High quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${fileMetadata.name}`));
      };

      img.src = fileMetadata.preview!;
    });
  };

  // Step 3: OCR Execution with Preprocessing
  const executeOcr = async () => {
    if (uploadedFiles.length === 0) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);
    
    const results: OcrResult[] = [];
    
    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        setProcessingProgress((i / uploadedFiles.length) * 50);
        
        console.log(`Processing file ${i + 1}/${uploadedFiles.length}: ${file.name}`);
        
        // Apply preprocessing to get optimized image
        const preprocessedBlob = await preprocessImageForOcr(file);
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('image', preprocessedBlob, file.name);
        formData.append('language', preprocessingOptions.language);
        formData.append('recordType', 'baptism'); // Default
        formData.append('quality', 'balanced'); // Default
        
        // Use the existing working upload endpoint
        const ocrResponse = await fetch(`/api/church/${churchId}/ocr/upload`, {
          method: 'POST',
          body: formData
        });
        
        if (!ocrResponse.ok) {
          const errorText = await ocrResponse.text();
          console.error(`OCR API Error for ${file.name}:`, errorText);
          throw new Error(`OCR failed for ${file.name}: ${ocrResponse.status} ${ocrResponse.statusText}`);
        }
        
        const ocrResult = await ocrResponse.json();
        console.log(`OCR result for ${file.name}:`, ocrResult);
        
        // Extract data from the upload response format
        results.push({
          text: ocrResult.extractedText || ocrResult.text || '',
          confidence: ocrResult.confidence || 0.5, // Default confidence
          segments: ocrResult.segments || [],
          processingTime: ocrResult.processingTime || 0,
          language: preprocessingOptions.language,
          errors: ocrResult.errors || []
        });
        
        setProcessingProgress(50 + (i / uploadedFiles.length) * 50);
      }
      
      setOcrResults(results);
      
      // Create simple extracted fields from OCR text
      const simpleFields: ExtractedField[] = results.map((result, index) => ({
        label: `Text from File ${index + 1}`,
        value: result.text,
        confidence: result.confidence,
        editable: true,
        required: false
      }));
      
      setExtractedFields(simpleFields);
      setProcessingProgress(100);
      
      // Auto-advance to next step after successful processing
      setTimeout(() => {
        setActiveStep(3);
        setIsProcessing(false);
      }, 1000);
      
    } catch (error) {
      console.error('OCR processing failed:', error);
      setError(error instanceof Error ? error.message : 'OCR processing failed');
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  // Extract structured fields from OCR text
  const extractStructuredFields = async (results: OcrResult[]) => {
    try {
      const extractResponse = await fetch(`/api/church/${churchId}/ocr/extract-fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ocrResults: results,
          recordType: 'baptism',
          language: preprocessingOptions.language
        })
      });
      
      if (extractResponse.ok) {
        const extractedData = await extractResponse.json();
        setExtractedFields(extractedData.fields || []);
      }
    } catch (error) {
      console.warn('Failed to extract structured fields:', error);
      // Fallback to basic field extraction
      setExtractedFields([
        { label: 'Name', value: '', confidence: 0, editable: true, required: true },
        { label: 'Date', value: '', confidence: 0, editable: true, required: true },
        { label: 'Parents', value: '', confidence: 0, editable: true, required: false },
        { label: 'Clergy', value: '', confidence: 0, editable: true, required: false }
      ]);
    }
  };

  // Step 4: Review and Save
  const handleFieldChange = (index: number, value: string) => {
    setExtractedFields(prev => prev.map((field, i) => 
      i === index ? { ...field, value } : field
    ));
  };

  const saveResults = async () => {
    try {
      const saveResponse = await fetch(`/api/church/${churchId}/ocr/save-wizard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: uploadedFiles,
          preprocessingOptions,
          ocrResults,
          extractedFields,
          approved: true
        })
      });
      
      if (saveResponse.ok) {
        const result = await saveResponse.json();
        onComplete(result);
      } else {
        throw new Error('Failed to save OCR results');
      }
    } catch (error) {
      console.error('Save failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to save results');
    }
  };

  // Navigation handlers
  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setUploadedFiles([]);
    setOcrResults([]);
    setExtractedFields([]);
    setError(null);
  };

  // Confidence color helper
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#4caf50'; // Green
    if (confidence >= 0.7) return '#ff9800'; // Orange  
    return '#f44336'; // Red
  };

  // Render confidence badge
  const renderConfidenceBadge = (confidence: number) => (
    <Chip
      label={`${Math.round(confidence * 100)}%`}
      size="small"
      style={{
        backgroundColor: getConfidenceColor(confidence),
        color: 'white',
        fontWeight: 'bold'
      }}
    />
  );

  const steps = [
    {
      label: 'Upload Source',
      description: 'Select files and configure basic settings'
    },
    {
      label: 'Preprocessing',
      description: 'Enhance images for better OCR accuracy'
    },
    {
      label: 'OCR Execution',
      description: 'Process images and extract text'
    },
    {
      label: 'Review & Save',
      description: 'Verify results and save to database'
    }
  ];

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Enhanced OCR Processing Wizard
      </Typography>
      
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel>
              <Typography variant="h6">{step.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {step.description}
              </Typography>
            </StepLabel>
            <StepContent>
              {/* Step Content will be rendered here */}
              {index === 0 && (
                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    {/* Upload Interface */}
                    <Box
                      {...getRootProps()}
                      sx={{
                        border: '2px dashed',
                        borderColor: isDragActive ? 'primary.main' : 'grey.300',
                        borderRadius: 2,
                        p: 4,
                        textAlign: 'center',
                        cursor: 'pointer',
                        bgcolor: isDragActive ? 'action.hover' : 'transparent',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <input {...getInputProps()} />
                      <CloudUpload sx={{ fontSize: 48, color: 'grey.500', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        or click to select files
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Supported: PNG, JPG, JPEG, TIFF, BMP, PDF (max 50MB each)
                      </Typography>
                    </Box>

                    {/* File List */}
                    {uploadedFiles.length > 0 && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="h6" gutterBottom>
                          Uploaded Files ({uploadedFiles.length})
                        </Typography>
                        <Grid container spacing={2}>
                          {uploadedFiles.map((file, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                              <Card 
                                sx={{ 
                                  cursor: 'pointer',
                                  border: selectedFileIndex === index ? 2 : 1,
                                  borderColor: selectedFileIndex === index ? 'primary.main' : 'grey.300'
                                }}
                                onClick={() => setSelectedFileIndex(index)}
                              >
                                <CardContent sx={{ p: 2 }}>
                                  {file.preview && file.type.startsWith('image/') && (
                                    <Box sx={{ mb: 1 }}>
                                      <img
                                        src={file.preview}
                                        alt={file.name}
                                        style={{
                                          width: '100%',
                                          height: '120px',
                                          objectFit: 'cover',
                                          borderRadius: '4px'
                                        }}
                                      />
                                    </Box>
                                  )}
                                  <Typography variant="body2" fontWeight="medium" noWrap>
                                    {file.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {(file.size / 1024 / 1024).toFixed(1)} MB
                                    {file.dimensions && ` • ${file.dimensions.width}×${file.dimensions.height}`}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}

                    {/* Language and Mode Selection */}
                    <Grid container spacing={3} sx={{ mt: 2 }}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <FormLabel>Language</FormLabel>
                          <Select
                            value={preprocessingOptions.language}
                            onChange={(e) => handlePreprocessingChange('language', e.target.value)}
                          >
                            {LANGUAGE_OPTIONS.map((lang) => (
                              <MenuItem key={lang.code} value={lang.code}>
                                {lang.flag} {lang.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <FormLabel>Processing Mode</FormLabel>
                          <Select
                            value={preprocessingOptions.mode}
                            onChange={(e) => handlePreprocessingChange('mode', e.target.value)}
                          >
                            {PROCESSING_MODES.map((mode) => (
                              <MenuItem key={mode.value} value={mode.value}>
                                <Box>
                                  <Typography variant="body2">{mode.label}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {mode.description}
                                  </Typography>
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {/* Additional step content for preprocessing, execution, and review will go here */}
              
              <Box sx={{ mb: 2, mt: 2 }}>
                <div>
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? saveResults : handleNext}
                    sx={{ mt: 1, mr: 1 }}
                    disabled={
                      (index === 0 && uploadedFiles.length === 0) ||
                      (index === 2 && isProcessing)
                    }
                  >
                    {index === steps.length - 1 ? 'Save Results' : 'Continue'}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={onCancel}
                    sx={{ mt: 1 }}
                  >
                    Cancel
                  </Button>
                </div>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <Dialog open={isProcessing}>
          <DialogContent>
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Processing OCR...
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={processingProgress} 
                sx={{ mt: 2, mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {Math.round(processingProgress)}% complete
              </Typography>
            </Box>
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};
